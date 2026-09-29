import { hash2, hashUnit, smoothstep } from '../../core/util.js';
import { M } from '../../voxel/palette.js';
import { packYaw } from './trees.js';
import { FIELD_W, FIELD_D, FIELD_OX, FIELD_OZ } from './biomes.js';

/* Procedural scenery placement. Scenery types are discovered from *.scenery.js files and carry their own rules:
   rules: { habitat: 'forest' | 'open' | 'beach' | 'rock', weight, altMin, altMax, slopeMax, size }.
   Output is instance buckets per (type, variant): 24 bytes each: f32 x, y, z, yaw, scale, u8 tint rgb and a color bank.
   A type with expand() is a composition (a tree is a trunk and some crowns): its parts are what lands in the buckets.
   The scatter is a stack of layers, each with its own grid, range of levels of detail and rules: trees, understory, meadow
   flowers and grass, hedgerows, herds of animals, reeds and lilies at the water, driftwood on the beach, and the older rock,
   shrub and palm layer. Everything is a pure function of position and the world seed. */

const mats = (names) => { const t = new Uint8Array(256); for (const n of names) t[M[n]] = 1; return t; };
const NATURAL = mats(['GRASS', 'GRASS_LUSH', 'GRASS_DRY', 'MEADOW', 'FOREST_FLOOR', 'PINE_FLOOR', 'DIRT', 'DIRT_DARK', 'SAND', 'SAND_WET', 'ROCK', 'ROCK_WARM', 'ROCK_DARK', 'ROCK_PALE', 'ROCK_RED', 'SCREE', 'ALPINE', 'MOSS', 'GRAVEL']);
const ROCKY = mats(['ROCK', 'ROCK_WARM', 'ROCK_DARK', 'ROCK_PALE', 'ROCK_RED', 'SCREE']);
const SANDY = mats(['SAND', 'SAND_WET']);
const GRASSY = mats(['GRASS', 'GRASS_LUSH', 'GRASS_DRY', 'MEADOW', 'ALPINE', 'MOSS']);
const FORESTY = mats(['FOREST_FLOOR', 'PINE_FLOOR']);
const GRAZING = mats(['GRASS', 'GRASS_LUSH', 'GRASS_DRY', 'MEADOW']);

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
const WHITE = [255, 255, 255];

/* Tree spacing by level of detail: one tree every few meters near the camera, fewer and bigger farther out, where the shader's
   canopy fills the gaps between them. */
const TREE_SPACING = [5.8, 7.2, 10, 14, 21, 30, 42, 58];
/** Beyond this level of detail trees are not models at all: the ground shader draws the canopy. */
export const TREE_MAX_LEVEL = 1;

/* Blossom colors of the meadow patches. */
const BLOSSOM = [[255, 226, 84], [255, 255, 248], [238, 86, 60], [250, 150, 190], [250, 166, 52], [128, 154, 246], [255, 240, 196]];
const CATTLE_COAT = [[255, 255, 255, 0], [150, 98, 62, 1], [52, 48, 46, 1], [214, 172, 128, 2], [126, 76, 48, 1]];
const HORSE_COAT = [[96, 60, 40], [150, 86, 46], [172, 170, 164], [46, 42, 40], [120, 80, 52]];

const SPAWN_CLEAR = 26;
const spawnCache = new WeakMap();
const spawnPoints = (world) => {
  let list = spawnCache.get(world);
  if (!list) { list = world.spawns().map((s) => [s.x, s.z]); spawnCache.set(world, list); }
  return list;
};
// regions can declare clearings ({ x, z, r } circles) where nothing natural grows, such as a farmyard inside a forest
const clearCache = new WeakMap();
const clearingsOf = (world) => {
  let list = clearCache.get(world);
  if (!list) { list = []; for (const r of world.regionsList || []) for (const c of r.clearings || []) list.push(c); clearCache.set(world, list); }
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
  const size = N * cell;
  const W = buf.W;
  const seed = world.seed;
  const dens = cfg.sceneryDensity;
  const { biomes, scenery } = world;
  // nothing grows on top of a start position, so the first frame is never a tree filling the screen
  const clear = spawnPoints(world).filter((p) => p[0] > x0 - SPAWN_CLEAR && p[0] < x0 + size + SPAWN_CLEAR && p[1] > z0 - SPAWN_CLEAR && p[1] < z0 + size + SPAWN_CLEAR);
  const clearings = clearingsOf(world).filter((c) => c.x + c.r > x0 && c.x - c.r < x0 + size && c.z + c.r > z0 && c.z - c.r < z0 + size);
  const nearSpawn = (px, pz) => {
    for (const p of clear) if ((px - p[0]) * (px - p[0]) + (pz - p[1]) * (pz - p[1]) < SPAWN_CLEAR * SPAWN_CLEAR) return true;
    for (const c of clearings) if ((px - c.x) * (px - c.x) + (pz - c.z) * (pz - c.z) < c.r * c.r) return true;
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
  const q = { a: 0, mat: 0, h: 0, slope: 0, m: 0, y: 0 };
  const probe = (px, pz) => {
    const i = Math.floor((px - x0) / cell), j = Math.floor((pz - z0) / cell);
    const a = (j + 1) * W + i + 1;
    const gxs = (buf.bed[a + 1] - buf.bed[a - 1]) / (2 * cell), gzs = (buf.bed[a + W] - buf.bed[a - W]) / (2 * cell);
    q.a = a; q.mat = buf.mat[a]; q.h = buf.surf[a]; q.slope = Math.sqrt(gxs * gxs + gzs * gzs); q.m = buf.mm[a]; q.y = buf.hq[a] * cell;
    return q;
  };
  const rnd = (gx, gz, salt, k) => hashUnit(hash2(gx, gz, seed ^ (salt + k * 0x9e3)));
  const inside = (px, pz) => px >= x0 && px < x0 + size && pz >= z0 && pz < z0 + size;
  /** Visits a jittered grid of points inside this node. */
  const eachPoint = (spacing, salt, cb) => {
    const gx0 = Math.floor(x0 / spacing), gx1 = Math.ceil((x0 + size) / spacing);
    const gz0 = Math.floor(z0 / spacing), gz1 = Math.ceil((z0 + size) / spacing);
    for (let gz = gz0; gz < gz1; gz++) {
      for (let gx = gx0; gx < gx1; gx++) {
        const h1 = hash2(gx, gz, seed ^ salt);
        const px = (gx + 0.5 + (((h1 & 255) / 255) - 0.5) * 0.9) * spacing;
        const pz = (gz + 0.5 + ((((h1 >> 8) & 255) / 255) - 0.5) * 0.9) * spacing;
        if (px < x0 || px >= x0 + size || pz < z0 || pz >= z0 + size) continue;
        if ((clear.length || clearings.length) && nearSpawn(px, pz)) continue;
        cb(px, pz, gx, gz);
      }
    }
  };
  const put = (type, variant, px, pz, y, yaw, scale, tint) => buckets.add(type, variant, px - x0, y, pz - z0, normYaw(yaw), scale, tint);
  const have = (id) => scenery.has(id);

  // ---- trees: their own grid, whose spacing follows the level of detail
  if (byHabitat.forest.length && level <= TREE_MAX_LEVEL) {
    const spacing = Math.max(TREE_SPACING[Math.min(level, TREE_SPACING.length - 1)], cell * 2.4);
    eachPoint(spacing, 0x51, (px, pz, gx, gz) => {
      const p = probe(px, pz);
      if (!NATURAL[p.mat] || ROCKY[p.mat] || SANDY[p.mat]) return;
      const farm = biomes.farmland(px, pz, p.h, p.m);
      const f = biomes.forest(px, pz, p.h, p.m, farm);
      if (f <= 0.05) return;
      const r1 = hashUnit(hash2(gx, gz, seed ^ 0x77)), r2 = hashUnit(hash2(gx, gz, seed ^ 0x99));
      if (r1 >= f * 0.92 * Math.min(1, dens)) return;
      const def = pick(byHabitat.forest, p.h, p.slope, r2);
      if (!def) return;
      const scale = (def.rules.scale ?? 1) * (0.78 + 0.5 * hashUnit(hash2(gx, gz, seed ^ 0xdd)));
      const yaw = hashUnit(hash2(gx, gz, seed ^ 0xee)) * TAU;
      const t = partsCtx(seed, gx, gz, 0x3a1, scale, level, treeBank(biomes, def, px, pz, p.h, hashUnit(hash2(gx, gz, seed ^ 0xb1))));
      t.yaw = yaw;
      if (cell >= 1) t.pv = 0;
      place(buckets, def, 0, px - x0, p.y, pz - z0, yaw, scale, tintOf(gx, gz), t);
    });
  }

  // ---- the ground layers only exist where voxels are small enough to carry them, so near the camera
  const fine = level === 0 && cell <= 1.1;

  // understory: shrubs and ferns under the trees, and the odd fallen log
  if (fine && have('puff')) {
    eachPoint(3.2, 0x4d1, (px, pz, gx, gz) => {
      const p = probe(px, pz);
      if (!FORESTY[p.mat] || p.slope > 0.8) return;
      const r = rnd(gx, gz, 0x4d1, 0);
      if (r < 0.3 * dens) {
        const s = 0.55 + 0.75 * rnd(gx, gz, 0x4d1, 1), yaw = rnd(gx, gz, 0x4d1, 2) * TAU;
        const dk = rnd(gx, gz, 0x4d1, 3);
        buckets.add('puff', (gx + gz) & 1 ? 1 : 2, px - x0, p.y, pz - z0, packYaw(yaw, 0.6 * s), s, packTint(196, 214, 184, dk < 0.4 ? 3 : 0));
      } else if (r > 0.986 && have('log')) {
        buckets.add('log', (gx ^ gz) & 1, px - x0, p.y + 0.02, pz - z0, normYaw(rnd(gx, gz, 0x4d1, 7) * TAU), 2.2 + 2.4 * rnd(gx, gz, 0x4d1, 8), packTint(255, 255, 255, (gx + gz) & 1 ? 2 : 0));
      }
    });
  }

  // meadows: patches of wildflowers where the noise says so (the grass itself is drawn by the ground shader)
  if (fine && have('flowers')) {
    eachPoint(2.4, 0x2c1, (px, pz, gx, gz) => {
      const p = probe(px, pz);
      if (!GRASSY[p.mat] || p.slope > 1) return;
      const bloom = smoothstep(0.34, 0.62, biomes.patch(px + 123, pz - 77, 64));
      if (bloom > 0.03 && rnd(gx, gz, 0x2c1, 0) < bloom * 0.9 * dens && p.mat !== M.ALPINE) {
        const hue = biomes.patch(px - 811, pz + 305, 41) * 0.5 + 0.5;
        const c = BLOSSOM[Math.min(BLOSSOM.length - 1, Math.floor(hue * BLOSSOM.length))];
        buckets.add('flowers', Math.floor(rnd(gx, gz, 0x2c1, 1) * 3) % 3, px - x0, p.y, pz - z0, normYaw(rnd(gx, gz, 0x2c1, 2) * TAU), 0.85 + 0.6 * rnd(gx, gz, 0x2c1, 3), packTint(c[0], c[1], c[2], 0));
        return;
      }
    });
  }

  // water's edge: reeds along the banks of rivers and lakes, lily pads on the still water
  if (level <= 1 && cell <= 2.2 && have('reeds')) {
    eachPoint(level === 0 ? 1.8 : 3, 0x6a3, (px, pz, gx, gz) => {
      const a = probe(px, pz).a;
      const hyd = buf.hydro[a];
      if (hyd === 0) {
        if (!(buf.hydro[a - 1] > 0 || buf.hydro[a + 1] > 0 || buf.hydro[a - W] > 0 || buf.hydro[a + W] > 0)) return;
        if (!(GRASSY[q.mat] || SANDY[q.mat] || FORESTY[q.mat] || q.mat === M.DIRT)) return;
        if (rnd(gx, gz, 0x6a3, 0) < 0.62 * dens) buckets.add('reeds', (gx + gz) & 1, px - x0, q.y, pz - z0, normYaw(rnd(gx, gz, 0x6a3, 1) * TAU), 1 + 0.9 * rnd(gx, gz, 0x6a3, 2), packTint(255, 255, 255, 0));
      } else if (hyd === 2 && level === 0 && have('lily') && buf.bed[a] > buf.water[a] - 3.2 && rnd(gx, gz, 0x6a3, 3) < 0.16 * dens) {
        buckets.add('lily', (gx * 3 + gz) & 1, px - x0, buf.water[a] + 0.03, pz - z0, normYaw(rnd(gx, gz, 0x6a3, 4) * TAU), 0.9 + 0.7 * rnd(gx, gz, 0x6a3, 5), packTint(255, 255, 255, 0));
      }
    });
  }

  // beaches: driftwood
  if (level <= 1 && cell <= 2.2 && have('log')) {
    eachPoint(level === 0 ? 5.5 : 8, 0x7b1, (px, pz, gx, gz) => {
      const p = probe(px, pz);
      if (!SANDY[p.mat] || p.h < 0.7) return;
      const r = rnd(gx, gz, 0x7b1, 0);
      if (r < 0.05 * dens) buckets.add('log', (gx + gz) & 1, px - x0, p.y + 0.03, pz - z0, normYaw(rnd(gx, gz, 0x7b1, 1) * TAU), 1.4 + 2.4 * rnd(gx, gz, 0x7b1, 2), packTint(255, 255, 255, 3));
    });
  }

  // hedgerows along the field edges the ground paints, with a tree now and then
  if (level <= 1 && cell <= 1.5 && have('puff')) {
    const oak = scenery.get('oak');
    const step = level === 0 ? 2.5 : 3.6;
    const i0 = Math.floor((x0 + FIELD_OX) / FIELD_W), i1 = Math.floor((x0 + size + FIELD_OX) / FIELD_W);
    const j0 = Math.floor((z0 + FIELD_OZ) / FIELD_D), j1 = Math.floor((z0 + size + FIELD_OZ) / FIELD_D);
    const hedge = (px, pz, key) => {
      const p = probe(px, pz);
      if (p.mat !== M.HEDGE) return;
      const gx = Math.floor(px * 4), gz = Math.floor(pz * 4);
      const s = 0.85 + 0.4 * rnd(gx, gz, 0x8e1, 0);
      buckets.add('puff', Math.floor(rnd(gx, gz, 0x8e1, 1) * 3) % 3, px - x0, p.y, pz - z0, packYaw(rnd(gx, gz, 0x8e1, 2) * TAU, s * 0.7), s * 0.95, packTint(200, 222, 190, rnd(gx, gz, 0x8e1, 3) < 0.3 ? 3 : 0));
      if (oak && key % 9 === 4 && level === 0 && rnd(gx, gz, 0x8e1, 4) < 0.6 * dens) {
        const t = partsCtx(seed, gx, gz, 0x8e5, 0.55 + 0.25 * rnd(gx, gz, 0x8e1, 5), level, 0);
        t.yaw = rnd(gx, gz, 0x8e1, 6) * TAU;
        place(buckets, oak, 0, px - x0, p.y, pz - z0, t.yaw, t.s, tintOf(gx, gz), t);
      }
    };
    for (let i = i0; i <= i1; i++) {
      const xl = i * FIELD_W - FIELD_OX + 0.8;
      if (xl < x0 || xl >= x0 + size) continue;
      for (let z = z0 + 0.5, k = 0; z < z0 + size; z += step, k++) hedge(xl, z, k + Math.floor(z / step));
    }
    for (let j = j0; j <= j1; j++) {
      const zl = j * FIELD_D - FIELD_OZ + 0.8;
      if (zl < z0 || zl >= z0 + size) continue;
      for (let x = x0 + 0.5, k = 0; x < x0 + size; x += step, k++) hedge(x, zl, k + Math.floor(x / step));
    }
  }

  // herds: cattle and sheep on the pastures, horses on the grass, deer at the edge of the woods
  if (level <= 1 && cell <= 1.5 && have('cow') && have('sheep')) herds();

  // ---- everything else keeps the original grid: rocks, palms and the odd shrub
  if (byHabitat.rock.length || byHabitat.beach.length || byHabitat.open.length) {
    const spacing = Math.min(28, Math.max(3.5, cell * 3.2));
    eachPoint(spacing, 0x51, (px, pz, gx, gz) => {
      const p = probe(px, pz);
      if (!NATURAL[p.mat]) return;
      const r1 = hashUnit(hash2(gx, gz, seed ^ 0x77)), r2 = hashUnit(hash2(gx, gz, seed ^ 0x99)), r3 = hashUnit(hash2(gx, gz, seed ^ 0xbb));
      let def = null;
      if (ROCKY[p.mat]) {
        if (r1 < 0.22 * dens) def = pick(byHabitat.rock, p.h, p.slope, r2);
      } else if (SANDY[p.mat]) {
        if (p.h > 0.6 && r1 < 0.10 * dens) def = pick(byHabitat.beach, p.h, p.slope, r2);
      } else {
        const farm = biomes.farmland(px, pz, p.h, p.m);
        const f = biomes.forest(px, pz, p.h, p.m, farm);
        if (f > 0.05) return;
        if (r1 < 0.045 * dens) def = pick(byHabitat.open, p.h, p.slope, r2);
        else if (byHabitat.rock.length && r1 > 0.995 - 0.004 * dens) def = pick(byHabitat.rock, p.h, p.slope, r2);
      }
      if (!def) return;
      const nv = def.variants || 1;
      // from one meter a cell the variants cannot be told apart, and one batch per type is far fewer draw calls
      const variant = cell >= 1 ? 0 : Math.floor(r3 * nv) % nv;
      const scale = (def.rules.scale ?? 1) * (0.78 + 0.5 * hashUnit(hash2(gx, gz, seed ^ 0xdd)));
      const yaw = hashUnit(hash2(gx, gz, seed ^ 0xee)) * TAU;
      let t = null;
      if (def.expand) { t = partsCtx(seed, gx, gz, 0x5b7, scale, level, 0); t.yaw = yaw; t.pv = cell >= 1 ? 0 : variant % 3; }
      place(buckets, def, variant, px - x0, p.y, pz - z0, yaw, scale, tintOf(gx, gz), t);
    });
  }

  /** Herds are decided on a coarse grid from the land use at the center, and each animal is placed only by the node it stands in. */
  function herds() {
    const HC = 72, pad = 26;
    const s = { h: 0, m: 0, water: NaN };
    const gx0 = Math.floor((x0 - pad) / HC), gx1 = Math.floor((x0 + size + pad) / HC);
    const gz0 = Math.floor((z0 - pad) / HC), gz1 = Math.floor((z0 + size + pad) / HC);
    const fld = {};
    for (let gz = gz0; gz <= gz1; gz++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const h1 = hash2(gx, gz, seed ^ 0x9f3);
        const cx = (gx + 0.15 + 0.7 * ((h1 & 255) / 255)) * HC, cz = (gz + 0.15 + 0.7 * (((h1 >> 8) & 255) / 255)) * HC;
        const rr = rnd(gx, gz, 0x9f3, 0);
        if (rr > 0.5) continue;                                  // most cells hold nothing, so the sample below is rare
        const h = world.terrain.sample(cx, cz, cell, s);
        if (h < 2 || s.water === s.water) continue;
        const farm = biomes.farmland(cx, cz, h, s.m);
        const f = biomes.forest(cx, cz, h, s.m, farm);
        let kind = null, n = 0;
        const rk = rnd(gx, gz, 0x9f3, 1), rn = rnd(gx, gz, 0x9f3, 2);
        if (farm > 0.4) {
          const fa = biomes.fieldAt(cx, cz, fld);
          if (fa.r >= 0.72 && rr < 0.42) { kind = rk < 0.45 ? 'cattle' : rk < 0.88 ? 'sheep' : 'horse'; }
        } else if (f < 0.05 && farm > 0.02 && rr < 0.1) kind = rk < 0.5 ? 'sheep' : rk < 0.8 ? 'cattle' : 'horse';
        else if (f < 0.05 && h < 240 && rr < 0.045) kind = rk < 0.4 ? 'sheep' : rk < 0.7 ? 'horse' : 'cattle';
        else if (f > 0.05 && f < 0.6 && h < 420 && rr < 0.1 && have('deer')) kind = 'deer';
        if (!kind) continue;
        n = kind === 'cattle' ? 4 + Math.floor(rn * 6) : kind === 'sheep' ? 8 + Math.floor(rn * 9) : kind === 'horse' ? 2 + Math.floor(rn * 3) : 2 + Math.floor(rn * 4);
        const R = 6 + 2.3 * Math.sqrt(n), heading = rnd(gx, gz, 0x9f3, 3) * TAU;
        const coat = Math.floor(rnd(gx, gz, 0x9f3, 4) * 5);
        for (let k = 0; k < n; k++) {
          const a = rnd(gx, gz, 0x9f3 + 11, k * 3) * TAU, d = R * Math.sqrt(rnd(gx, gz, 0x9f3 + 11, k * 3 + 1));
          const px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d;
          if (!inside(px, pz)) continue;
          const p = probe(px, pz);
          if ((!GRAZING[p.mat] && !(kind === 'deer' && FORESTY[p.mat])) || p.slope > 0.5 || buf.hydro[p.a] !== 0 || p.h < 1.5) continue;
          const yaw = heading + (rnd(gx, gz, 0x9f3 + 11, k * 3 + 2) - 0.5) * 2.2;
          const sc = 0.92 + 0.16 * rnd(gx, gz, 0x9f3 + 23, k);
          if (kind === 'cattle') { const c = CATTLE_COAT[coat]; put('cow', c[3], px, pz, p.y, yaw, sc, packTint(c[0], c[1], c[2])); }
          else if (kind === 'sheep') put('sheep', coat & 1, px, pz, p.y, yaw, sc * 0.95, packTint(255, 255, 255));
          else if (kind === 'horse') { const c = HORSE_COAT[coat]; put('horse', coat & 1, px, pz, p.y, yaw, sc, packTint(c[0], c[1], c[2])); }
          else put('deer', k === 0 ? 1 : 0, px, pz, p.y, yaw, sc, packTint(152, 114, 74));
        }
      }
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
      place(buckets, def, variant, p.x - x0, ty, p.z - z0, p.yaw || 0, p.scale ?? 1, WHITE, t);
    } else {
      buckets.add(p.type, variant, p.x - x0, ty, p.z - z0, normYaw(p.yaw || 0), p.scale, p.tint ?? 0xffffffff);
    }
  }
}
