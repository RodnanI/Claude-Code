import { hash2, hashUnit } from '../../core/util.js';
import { M } from '../../voxel/palette.js';

/* Procedural scenery placement. Scenery types are discovered from *.scenery.js files and carry their own rules:
   rules: { habitat: 'forest' | 'open' | 'beach' | 'rock', weight, altMin, altMax, slopeMax, size }.
   Output is instance buckets per (type, variant): 24 bytes each: f32 x, y, z, yaw, scale, u8 tint rgba. */

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

const packTint = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;

const SPAWN_CLEAR = 26;
const spawnCache = new WeakMap();
const spawnPoints = (world) => {
  let list = spawnCache.get(world);
  if (!list) { list = world.spawns().map((s) => [s.x, s.z]); spawnCache.set(world, list); }
  return list;
};

export function scatterNode(world, x0, z0, cell, level, N, buf, cfg, buckets) {
  if (level > cfg.sceneryMaxLevel || cfg.sceneryDensity <= 0) return;
  const defs = [...world.scenery.values()].filter((d) => d.rules);
  if (!defs.length) return;
  const byHabitat = { forest: [], open: [], beach: [], rock: [] };
  for (const d of defs) if (byHabitat[d.rules.habitat]) byHabitat[d.rules.habitat].push(d);
  const size = N * cell;
  const spacing = Math.min(28, Math.max(3.5, cell * 3.2));
  const W = buf.W;
  const seed = world.seed;
  const gx0 = Math.floor(x0 / spacing), gx1 = Math.ceil((x0 + size) / spacing);
  const gz0 = Math.floor(z0 / spacing), gz1 = Math.ceil((z0 + size) / spacing);
  const dens = cfg.sceneryDensity;
  const { biomes } = world;
  // nothing grows on top of a start position, so the first frame is never a tree filling the screen
  const clear = spawnPoints(world).filter((p) => p[0] > x0 - SPAWN_CLEAR && p[0] < x0 + size + SPAWN_CLEAR && p[1] > z0 - SPAWN_CLEAR && p[1] < z0 + size + SPAWN_CLEAR);
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
  for (let gz = gz0; gz < gz1; gz++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h1 = hash2(gx, gz, seed ^ 0x51);
      const px = (gx + 0.5 + (((h1 & 255) / 255) - 0.5) * 0.9) * spacing;
      const pz = (gz + 0.5 + ((((h1 >> 8) & 255) / 255) - 0.5) * 0.9) * spacing;
      if (px < x0 || px >= x0 + size || pz < z0 || pz >= z0 + size) continue;
      if (clear.length) {
        let near = false;
        for (const p of clear) if ((px - p[0]) * (px - p[0]) + (pz - p[1]) * (pz - p[1]) < SPAWN_CLEAR * SPAWN_CLEAR) { near = true; break; }
        if (near) continue;
      }
      const i = Math.floor((px - x0) / cell), j = Math.floor((pz - z0) / cell);
      const a = (j + 1) * W + i + 1;
      const mat = buf.mat[a];
      if (!NATURAL[mat]) continue;
      const h = buf.surf[a];
      const gxs = (buf.bed[a + 1] - buf.bed[a - 1]) / (2 * cell), gzs = (buf.bed[a + W] - buf.bed[a - W]) / (2 * cell);
      const slope = Math.sqrt(gxs * gxs + gzs * gzs);
      const m = buf.mm[a];
      const r1 = hashUnit(hash2(gx, gz, seed ^ 0x77)), r2 = hashUnit(hash2(gx, gz, seed ^ 0x99)), r3 = hashUnit(hash2(gx, gz, seed ^ 0xbb));
      let def = null;
      if (ROCKY[mat]) {
        if (r1 < 0.22 * dens) def = pick(byHabitat.rock, h, slope, r2);
      } else if (SANDY[mat]) {
        if (h > 0.6 && r1 < 0.10 * dens) def = pick(byHabitat.beach, h, slope, r2);
      } else {
        const farm = biomes.farmland(px, pz, h, m);
        const f = biomes.forest(px, pz, h, m, farm);
        if (f > 0.05) {
          if (r1 < f * 0.92 * Math.min(1, dens)) def = pick(byHabitat.forest, h, slope, r2);
        } else if (r1 < 0.025 * dens) def = pick(byHabitat.open, h, slope, r2);
        else if (byHabitat.rock.length && r1 > 0.995 - 0.004 * dens) def = pick(byHabitat.rock, h, slope, r2);
      }
      if (!def) continue;
      const nv = def.variants || 1;
      // from one meter a cell the variants cannot be told apart, and one batch per type is far fewer draw calls
      const variant = cell >= 1 ? 0 : Math.floor(r3 * nv) % nv;
      const scale = (def.rules.scale ?? 1) * (0.78 + 0.5 * hashUnit(hash2(gx, gz, seed ^ 0xdd)));
      const yaw = hashUnit(hash2(gx, gz, seed ^ 0xee)) * 6.2831853;
      const tv = hashUnit(hash2(gx, gz, seed ^ 0xff));
      const tint = packTint(Math.round(232 + tv * 23), Math.round(236 + hashUnit(hash2(gz, gx, seed ^ 0x13)) * 19), Math.round(226 + tv * 20));
      buckets.add(def.id, variant, px - x0, buf.hq[a] * cell, pz - z0, yaw, scale, tint);
    }
  }
}

/** Place region-authored props (street lamps, hay bales, parked props, ...). */
export function placeProps(world, x0, z0, cell, N, cfg, buckets) {
  const size = N * cell;
  const props = world.propsIn(x0, z0, x0 + size, z0 + size);
  for (const p of props) {
    const def = world.scenery.get(p.type);
    if (!def || (def.rules?.size ?? 2) < cell * 0.9) continue;
    const y = p.y !== undefined ? p.y : world.terrain.heightAt(p.x, p.z, cell);
    const nv = def.variants || 1;
    const variant = cell >= 1 ? 0 : p.variant !== undefined ? p.variant % nv : hash2(Math.floor(p.x), Math.floor(p.z), 7) % nv;
    buckets.add(p.type, variant, p.x - x0, Math.floor(y / cell + 1e-6) * cell, p.z - z0, p.yaw, p.scale, p.tint ?? 0xffffffff);
  }
}
