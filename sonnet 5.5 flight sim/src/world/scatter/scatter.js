import { hash2, hashUnit } from '../../core/util.js';
import { M } from '../../voxel/palette.js';

/* Procedural scenery placement. Scenery types are discovered from *.scenery.js files and carry their own rules:
   rules: { habitat: 'forest' | 'open' | 'beach' | 'rock', weight, altMin, altMax, slopeMax, size }.
   Output is instance buckets per (type, variant): 24 bytes each: f32 x, y, z, yaw, scale, u8 tint rgb and a color bank.
   A type with expand() is a composition (a tree is a trunk and some crowns): its parts are what lands in the buckets. */

const NATURAL = new Uint8Array(256);
for (const n of ['GRASS', 'GRASS_LUSH', 'GRASS_DRY', 'MEADOW', 'FOREST_FLOOR', 'PINE_FLOOR', 'DIRT', 'DIRT_DARK', 'SAND', 'SAND_WET', 'ROCK', 'ROCK_WARM', 'ROCK_DARK', 'ROCK_PALE', 'ROCK_RED', 'SCREE', 'ALPINE', 'MOSS', 'GRAVEL']) NATURAL[M[n]] = 1;
const ROCKY = new Uint8Array(256);
for (const n of ['ROCK', 'ROCK_WARM', 'ROCK_DARK', 'ROCK_PALE', 'ROCK_RED', 'SCREE']) ROCKY[M[n]] = 1;
const SANDY = new Uint8Array(256);
SANDY[M.SAND] = 1; SANDY[M.SAND_WET] = 1;

export class InstanceBuckets {
  constructor() { this.map = new Map(); }
  add(type, variant, x, y, z, yaw, scale, tint) {
    const key = type + ':' + variant;
    let b = this.map.get(key);
    if (!b) this.map.set(key, (b = { type, variant, n: 0, f: new Float32Array(6 * 64), u: null }));
    if ((b.n + 1) * 6 > b.f.length) { const nf = new Float32Array(b.f.length * 2); nf.set(b.f); b.f = nf; }
    const o = b.n * 6;
    b.f[o] = x; b.f[o + 1] = y; b.f[o + 2] = z; b.f[o + 3] = yaw; b.f[o + 4] = scale;
    new Uint32Array(b.f.buffer)[o + 5] = tint >>> 0;
    b.n++;
  }
  /** [{type, variant, count, data}] with tight ArrayBuffers ready to transfer. */
  finish() {
    const out = [];
    for (const b of this.map.values()) out.push({ type: b.type, variant: b.variant, count: b.n, data: b.f.slice(0, b.n * 6).buffer });
    return out;
  }
}

/** Instance tint. The alpha byte is the color bank of the instance, stored minus one so that 255 (the old constant) means bank 0. */
const packTint = (r, g, b, bank = 0) => ((((bank + 255) & 255) << 24) | (b << 16) | (g << 8) | r) >>> 0;
const TAU = 6.2831853;
const normYaw = (y) => ((y % TAU) + TAU) % TAU;

/* Tree spacing by level of detail: one tree every few meters near the camera, fewer and bigger farther out, where the shader's
   canopy fills the gaps between them. */
const TREE_SPACING = [5.8, 7.2, 10, 14, 21, 30, 42, 58];
/** Beyond this level of detail trees are not models at all: the ground shader draws the canopy. */
export const TREE_MAX_LEVEL = 1;

const SPAWN_CLEAR = 26;
const spawnCache = new WeakMap();
const spawnPoints = (world) => {
  let list = spawnCache.get(world);
  if (!list) { list = world.spawns().map((s) => [s.x, s.z]); spawnCache.set(world, list); }
  return list;
};
const defCache = new WeakMap();
const habitatsOf = (world) => {
  let h = defCache.get(world);
  if (!h) {
    h = { forest: [], open: [], beach: [], rock: [] };
    for (const d of world.scenery.values()) if (d.rules && h[d.rules.habitat]) h[d.rules.habitat].push(d);
    defCache.set(world, h);
  }
  return h;
};

/** Random numbers that belong to one composed object (a tree), plus the level of detail and color bank it is built at. */
function partsCtx(seed, gx, gz, salt, scale, level, bank) {
  const u = new Array(8);
  for (let k = 0; k < 8; k++) u[k] = hashUnit(hash2(gx, gz, seed ^ (salt + k * 0x3b9)));
  return { s: scale, level, u, pv: Math.floor(u[7] * 3) % 3, bank, yaw: 0 };
}

/** Adds one placed object: a plain model as it is, or a composition as its parts, all relative to the foot (x, y, z). */
function place(buckets, def, variant, x, y, z, yaw, scale, tint, t) {
  if (def.expand) {
    const c = Math.cos(t.yaw), s = Math.sin(t.yaw);
    def.expand((type, v, dx, dy, dz, yw, sc, bank) => {
      buckets.add(type, v, x + dx * c - dz * s, y + dy, z + dx * s + dz * c, yw, sc, packTint(tint[0], tint[1], tint[2], bank | 0));
    }, t);
  } else buckets.add(def.id, variant, x, y, z, normYaw(yaw), scale, packTint(tint[0], tint[1], tint[2], 0));
}

export function scatterNode(world, x0, z0, cell, level, N, buf, cfg, buckets) {
  if (level > cfg.sceneryMaxLevel || cfg.sceneryDensity <= 0) return;
  const byHabitat = habitatsOf(world);
  if (!byHabitat.forest.length && !byHabitat.open.length && !byHabitat.beach.length && !byHabitat.rock.length) return;
  const size = N * cell;
  const W = buf.W;
  const seed = world.seed;
  const dens = cfg.sceneryDensity;
  const { biomes } = world;
  // nothing grows on top of a start position, so the first frame is never a tree filling the screen
  const clear = spawnPoints(world).filter((p) => p[0] > x0 - SPAWN_CLEAR && p[0] < x0 + size + SPAWN_CLEAR && p[1] > z0 - SPAWN_CLEAR && p[1] < z0 + size + SPAWN_CLEAR);
  const nearSpawn = (px, pz) => {
    for (const p of clear) if ((px - p[0]) * (px - p[0]) + (pz - p[1]) * (pz - p[1]) < SPAWN_CLEAR * SPAWN_CLEAR) return true;
    return false;
  };
  const pick = (list, h, slope, r) => {
    let total = 0;
    for (const d of list) {
      const ru = d.rules;
      if (h < (ru.altMin ?? -1e9) || h > (ru.altMax ?? 1e9) || slope > (ru.slopeMax ?? 9) || (ru.size ?? 8) < cell * 1.2) continue;
      total += ru.weight ?? 1;
    }
    if (total <= 0) return null;
    let t = r * total;
    for (const d of list) {
      const ru = d.rules;
      if (h < (ru.altMin ?? -1e9) || h > (ru.altMax ?? 1e9) || slope > (ru.slopeMax ?? 9) || (ru.size ?? 8) < cell * 1.2) continue;
      t -= ru.weight ?? 1;
      if (t <= 0) return d;
    }
    return null;
  };
  const tintOf = (gx, gz) => {
    const tv = hashUnit(hash2(gx, gz, seed ^ 0xff));
    return [Math.round(232 + tv * 23), Math.round(236 + hashUnit(hash2(gz, gx, seed ^ 0x13)) * 19), Math.round(226 + tv * 20)];
  };
  const sample = (px, pz) => {
    const i = Math.floor((px - x0) / cell), j = Math.floor((pz - z0) / cell);
    const a = (j + 1) * W + i + 1;
    const gxs = (buf.bed[a + 1] - buf.bed[a - 1]) / (2 * cell), gzs = (buf.bed[a + W] - buf.bed[a - W]) / (2 * cell);
    return { a, mat: buf.mat[a], h: buf.surf[a], slope: Math.sqrt(gxs * gxs + gzs * gzs), m: buf.mm[a] };
  };

  // ---- trees: their own grid, whose spacing follows the level of detail
  if (byHabitat.forest.length && level <= TREE_MAX_LEVEL) {
    const spacing = Math.max(TREE_SPACING[Math.min(level, TREE_SPACING.length - 1)], cell * 2.4);
    const gx0 = Math.floor(x0 / spacing), gx1 = Math.ceil((x0 + size) / spacing);
    const gz0 = Math.floor(z0 / spacing), gz1 = Math.ceil((z0 + size) / spacing);
    for (let gz = gz0; gz < gz1; gz++) {
      for (let gx = gx0; gx < gx1; gx++) {
        const h1 = hash2(gx, gz, seed ^ 0x51);
        const px = (gx + 0.5 + (((h1 & 255) / 255) - 0.5) * 0.9) * spacing;
        const pz = (gz + 0.5 + ((((h1 >> 8) & 255) / 255) - 0.5) * 0.9) * spacing;
        if (px < x0 || px >= x0 + size || pz < z0 || pz >= z0 + size) continue;
        if (clear.length && nearSpawn(px, pz)) continue;
        const q = sample(px, pz);
        if (!NATURAL[q.mat] || ROCKY[q.mat] || SANDY[q.mat]) continue;
        const farm = biomes.farmland(px, pz, q.h, q.m);
        const f = biomes.forest(px, pz, q.h, q.m, farm);
        if (f <= 0.05) continue;
        const r1 = hashUnit(hash2(gx, gz, seed ^ 0x77)), r2 = hashUnit(hash2(gx, gz, seed ^ 0x99));
        if (r1 >= f * 0.92 * Math.min(1, dens)) continue;
        const def = pick(byHabitat.forest, q.h, q.slope, r2);
        if (!def) continue;
        const scale = (def.rules.scale ?? 1) * (0.78 + 0.5 * hashUnit(hash2(gx, gz, seed ^ 0xdd)));
        const yaw = hashUnit(hash2(gx, gz, seed ^ 0xee)) * TAU;
        const t = partsCtx(seed, gx, gz, 0x3a1, scale, level, treeBank(biomes, def, px, pz, q.h, hashUnit(hash2(gx, gz, seed ^ 0xb1))));
        t.yaw = yaw;
        if (cell >= 1) t.pv = 0;
        place(buckets, def, 0, px - x0, buf.hq[q.a] * cell, pz - z0, yaw, scale, tintOf(gx, gz), t);
      }
    }
  }

  // ---- everything else keeps the original grid
  const spacing = Math.min(28, Math.max(3.5, cell * 3.2));
  const gx0 = Math.floor(x0 / spacing), gx1 = Math.ceil((x0 + size) / spacing);
  const gz0 = Math.floor(z0 / spacing), gz1 = Math.ceil((z0 + size) / spacing);
  for (let gz = gz0; gz < gz1; gz++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h1 = hash2(gx, gz, seed ^ 0x51);
      const px = (gx + 0.5 + (((h1 & 255) / 255) - 0.5) * 0.9) * spacing;
      const pz = (gz + 0.5 + ((((h1 >> 8) & 255) / 255) - 0.5) * 0.9) * spacing;
      if (px < x0 || px >= x0 + size || pz < z0 || pz >= z0 + size) continue;
      if (clear.length && nearSpawn(px, pz)) continue;
      const q = sample(px, pz);
      if (!NATURAL[q.mat]) continue;
      const r1 = hashUnit(hash2(gx, gz, seed ^ 0x77)), r2 = hashUnit(hash2(gx, gz, seed ^ 0x99)), r3 = hashUnit(hash2(gx, gz, seed ^ 0xbb));
      let def = null;
      if (ROCKY[q.mat]) {
        if (r1 < 0.22 * dens) def = pick(byHabitat.rock, q.h, q.slope, r2);
      } else if (SANDY[q.mat]) {
        if (q.h > 0.6 && r1 < 0.10 * dens) def = pick(byHabitat.beach, q.h, q.slope, r2);
      } else {
        const farm = biomes.farmland(px, pz, q.h, q.m);
        const f = biomes.forest(px, pz, q.h, q.m, farm);
        if (f > 0.05) continue;
        if (r1 < 0.025 * dens) def = pick(byHabitat.open, q.h, q.slope, r2);
        else if (byHabitat.rock.length && r1 > 0.995 - 0.004 * dens) def = pick(byHabitat.rock, q.h, q.slope, r2);
      }
      if (!def) continue;
      const nv = def.variants || 1;
      // from one meter a cell the variants cannot be told apart, and one batch per type is far fewer draw calls
      const variant = cell >= 1 ? 0 : Math.floor(r3 * nv) % nv;
      const scale = (def.rules.scale ?? 1) * (0.78 + 0.5 * hashUnit(hash2(gx, gz, seed ^ 0xdd)));
      const yaw = hashUnit(hash2(gx, gz, seed ^ 0xee)) * TAU;
      let t = null;
      if (def.expand) { t = partsCtx(seed, gx, gz, 0x5b7, scale, level, 0); t.yaw = yaw; t.pv = cell >= 1 ? 0 : variant % 3; }
      place(buckets, def, variant, px - x0, buf.hq[q.a] * cell, pz - z0, yaw, scale, tintOf(gx, gz), t);
    }
  }
}

/** Color bank for a tree: broadleaf turns in patches (orange, gold), some stands are dark, conifers go blue-green, olive or snowy. */
function treeBank(biomes, def, x, z, h, r) {
  const patch = biomes.patch(x + 3100, z - 1700, 640);
  if (def.id === 'pine') {
    if (h > 760 && r < 0.7) return 3;
    return patch > 0.55 ? (r < 0.5 ? 1 : 2) : 0;
  }
  if (patch > 0.6) return r < 0.6 ? 1 : 2;
  if (patch < -0.66) return 3;
  return 0;
}

/** Place region-authored props (street lamps, hay bales, parked props, ...). */
export function placeProps(world, x0, z0, cell, N, cfg, buckets) {
  const size = N * cell;
  const props = world.propsIn(x0, z0, x0 + size, z0 + size);
  const seed = world.seed;
  const level = Math.round(Math.log2(Math.max(1, cell / (cfg.baseCell || cell))));
  for (const p of props) {
    const def = world.scenery.get(p.type);
    if (!def || (def.rules?.size ?? 2) < cell * 0.9) continue;
    const y = p.y !== undefined ? p.y : world.terrain.heightAt(p.x, p.z, cell);
    const nv = def.variants || 1;
    const variant = cell >= 1 ? 0 : p.variant !== undefined ? p.variant % nv : hash2(Math.floor(p.x), Math.floor(p.z), 7) % nv;
    const ty = Math.floor(y / cell + 1e-6) * cell;
    if (def.expand) {
      const t = partsCtx(seed, Math.floor(p.x * 7), Math.floor(p.z * 7), 0x77e, p.scale ?? 1, level, 0);
      t.yaw = p.yaw || 0; t.pv = cell >= 1 ? 0 : variant % 3;
      place(buckets, def, variant, p.x - x0, ty, p.z - z0, p.yaw || 0, p.scale ?? 1, [255, 255, 255], t);
    } else {
      buckets.add(p.type, variant, p.x - x0, ty, p.z - z0, normYaw(p.yaw || 0), p.scale, p.tint ?? 0xffffffff);
    }
  }
}
