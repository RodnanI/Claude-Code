import { WORLD_SEED } from './config.js';
import { SITES, MASSIFS } from './layout.js';
import { createTerrain } from './terrain/terrain.js';
import { createSurface } from './terrain/surface.js';
import { createBiomes } from './scatter/biomes.js';
import { RoadIndex, ROAD_KINDS } from './roads/network.js';
import { buildHighways } from './roads/highways.js';
import { SpatialGrid } from './spatial.js';
import { Rng } from '../core/rng.js';
import { hashString } from '../core/util.js';
import { M } from '../voxel/palette.js';
import { Recipe } from '../voxel/recipe.js';
import { REGIONS, KITS, SCENERY } from '../generated/registry.js';

/**
 * The world: a pure, deterministic description of the island. The same code runs on the main thread (physics, UI)
 * and in every worker (node building). Nothing here touches the DOM or GPU.
 */
export function createWorld({ seed = WORLD_SEED, regions = REGIONS, kits = KITS, scenery = SCENERY, highways = true } = {}) {
  const seen = new Set();
  for (const r of regions) {
    if (seen.has(r.id)) throw new Error('duplicate region id ' + r.id);
    seen.add(r.id);
  }
  const mods = [];
  for (const r of regions) if (r.terrain) mods.push(...(r.terrain().flatten || []));
  const terrain = createTerrain(seed, mods);
  const biomes = createBiomes(seed);
  const roads = new RoadIndex();
  const kitMap = new Map(kits.map((k) => [k.id, k]));
  const sceneryMap = new Map(scenery.map((s) => [s.id, s]));

  const regionGrid = new SpatialGrid(512);
  for (const r of regions) regionGrid.insert(r, r.bounds[0], r.bounds[1], r.bounds[2], r.bounds[3]);

  const layouts = new Map();
  let highwayGrid = null;
  const structGrid = new SpatialGrid(128);
  const propGrid = new SpatialGrid(128);
  let highwayInfo = null;

  const world = { seed, terrain, biomes, roads, kits: kitMap, scenery: sceneryMap, regionsList: regions, sites: SITES, layouts, highway: null };

  function ctxFor(region) {
    const base = seed ^ hashString(region.id);
    return {
      world, seed, M, region, sites: SITES,
      rng: (label = '') => new Rng(base ^ hashString(String(label))),
      heightAt: (x, z) => terrain.heightAt(x, z, 0),
      kit: (kind, p) => {
        if (!kitMap.has(kind)) throw new Error(`region ${region.id} uses unknown kit ${kind}`);
        return { kind, rot: 0, seed: 1, ...p };
      },
    };
  }

  /**
   * True when a structure footprint (oriented box) or a prop overlaps an inter-city road. Region layouts do not know
   * about the highways that cross them, so the filter runs here, identically on the main thread and in workers.
   */
  function onHighway(x, z, hw, hd, ang, margin) {
    if (!highwayGrid) return false;
    const c = Math.cos(ang), sn = Math.sin(ang);
    const rad = Math.hypot(hw, hd) + margin + 12;
    for (const s of highwayGrid.query(x - rad, z - rad, x + rad, z + rad)) {
      const half = s.hw + margin;
      // segment in the box frame, clipped against the expanded rectangle (Liang-Barsky)
      const ax = s.ax - x, az = s.az - z, bx = s.bx - x, bz = s.bz - z;
      const p0x = c * ax + sn * az, p0z = -sn * ax + c * az, p1x = c * bx + sn * bz, p1z = -sn * bx + c * bz;
      const dx = p1x - p0x, dz = p1z - p0z;
      const bxm = hw + half, bzm = hd + half;
      let t0 = 0, t1 = 1;
      const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
      if (clip(-dx, p0x + bxm) && clip(dx, bxm - p0x) && clip(-dz, p0z + bzm) && clip(dz, bzm - p0z)) return true;
    }
    return false;
  }

  function layoutOf(region) {
    let L = layouts.get(region.id);
    if (L) return L;
    world.ensureHighways();
    L = { structures: [], roads: [], props: [], lots: [], lotGrid: new SpatialGrid(64) };
    layouts.set(region.id, L);
    if (region.layout) {
      const ctx = ctxFor(region);
      const res = region.layout(ctx) || {};
      for (const s of res.structures || []) {
        if (!kitMap.has(s.kind)) throw new Error(`region ${region.id}: unknown kit ${s.kind}`);
        const d = { w: 8, d: 8, h: 8, ...s, region: region.id };
        if (region.kind !== 'airfield' && onHighway(d.x, d.z, d.w / 2, d.d / 2, ((d.rot || 0) & 3) * Math.PI / 2 + (d.yaw || 0), 1.5)) continue;
        if (d.y === undefined) d.y = terrain.heightAt(d.x, d.z, 0);
        d.id = `${region.id}#${L.structures.length}`;
        L.structures.push(d);
        structGrid.insert(d, d.x, d.z, d.x, d.z);
      }
      for (const p of res.props || []) {
        if (!sceneryMap.has(p.type)) throw new Error(`region ${region.id}: unknown scenery ${p.type}`);
        const q = { yaw: 0, scale: 1, ...p, region: region.id };
        if (region.kind !== 'airfield' && onHighway(q.x, q.z, 0.6, 0.6, 0, 0.5)) continue;
        L.props.push(q);
        propGrid.insert(q, q.x, q.z, q.x, q.z);
      }
      for (const s of res.roads || []) { L.roads.push(s); roads.add(s); }
      for (const lot of res.lots || []) {
        L.lots.push(lot);
        L.lotGrid.insert(lot, lot.x0, lot.z0, lot.x1, lot.z1);
      }
    }
    return L;
  }

  function regionsAt(x, z) {
    const list = regionGrid.at(x, z);
    let out = null;
    for (let i = 0; i < list.length; i++) {
      const r = list[i], b = r.bounds;
      if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) (out || (out = [])).push(r);
    }
    return out;
  }

  function ensureHighways() {
    if (highwayInfo || !highways) return;
    const access = {};
    for (const r of regions) if (r.access) for (const [k, v] of Object.entries(r.access)) access[k] = v;
    highwayInfo = buildHighways(terrain, access);
    roads.addAll(highwayInfo.segments);
    highwayGrid = new SpatialGrid(128);
    for (const seg of highwayInfo.segments) {
      const k = ROAD_KINDS[seg.kind];
      const hw = (seg.w ?? k.w) / 2 + (seg.sw ?? k.sw);
      highwayGrid.insert({ ax: seg.ax, az: seg.az, bx: seg.bx, bz: seg.bz, hw }, Math.min(seg.ax, seg.bx) - hw - 4, Math.min(seg.az, seg.bz) - hw - 4, Math.max(seg.ax, seg.bx) + hw + 4, Math.max(seg.az, seg.bz) + hw + 4);
    }
    world.highway = highwayInfo;
  }
  world.ensureHighways = ensureHighways;

  /**
   * Surface paint. Priority: region custom paint (runway markings), lots flagged `over`, roads, ordinary lots
   * (block paving, lawns, parking), then the coarse district tint. Returns a material or 0. Hot path.
   */
  function paint(x, z, cell, h) {
    const rs = regionsAt(x, z);
    if (rs) {
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        const L = layoutOf(r);
        if (r.paint) {
          const m = r.paint(x, z, cell, h, world);
          if (m) return m;
        }
        const lots = L.lotGrid.at(x, z);
        for (let j = lots.length - 1; j >= 0; j--) {
          const l = lots[j];
          if (l.over && x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1) {
            const m = l.fn ? l.fn(x, z, cell) : l.mat;
            if (m) return m;
          }
        }
      }
    }
    ensureHighways();
    const rm = roads.paint(x, z, cell);
    if (rm) return rm;
    if (rs) {
      for (let i = 0; i < rs.length; i++) {
        const lots = layoutOf(rs[i]).lotGrid.at(x, z);
        for (let j = lots.length - 1; j >= 0; j--) {
          const l = lots[j];
          if (!l.over && x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1) {
            const m = l.fn ? l.fn(x, z, cell) : l.mat;
            if (m) return m;
          }
        }
      }
      if (cell >= 8) for (let i = 0; i < rs.length; i++) if (rs[i].tint) return rs[i].tint;
    }
    return 0;
  }
  world.paint = paint;
  world.surface = createSurface(seed, biomes, paint);

  world.regionsAt = regionsAt;
  world.layoutOf = layoutOf;

  /** Structures anchored inside a rectangle. */
  world.structuresIn = (x0, z0, x1, z1, out = []) => {
    const rs = regionGrid.query(x0 - 64, z0 - 64, x1 + 64, z1 + 64);
    for (const r of rs) {
      const b = r.bounds;
      if (b[2] < x0 - 200 || b[0] > x1 + 200 || b[3] < z0 - 200 || b[1] > z1 + 200) continue;
      layoutOf(r);
    }
    const c = structGrid.query(x0, z0, x1, z1);
    for (const d of c) if (d.x >= x0 && d.x < x1 && d.z >= z0 && d.z < z1) out.push(d);
    return out;
  };
  world.propsIn = (x0, z0, x1, z1, out = []) => {
    const c = propGrid.query(x0, z0, x1, z1);
    for (const d of c) if (d.x >= x0 && d.x < x1 && d.z >= z0 && d.z < z1) out.push(d);
    return out;
  };

  const recipeCache = new Map();
  /** Recipe for a structure descriptor (cached). */
  world.recipeFor = (d) => {
    let r = recipeCache.get(d.id);
    if (r) return r;
    const kit = kitMap.get(d.kind);
    r = new Recipe();
    kit.build(d, r, new Rng(seed ^ hashString(d.id) ^ (d.seed | 0)), { M, world });
    if (recipeCache.size > 4000) recipeCache.delete(recipeCache.keys().next().value);
    recipeCache.set(d.id, r);
    return r;
  };

  /** Fully resolved surface sample at a point (for tools, spawn placement and physics friction). */
  world.sampleSurface = (x, z, cell = 1, out = {}) => {
    const s = {};
    const surf = terrain.sample(x, z, cell, s);
    const hx = terrain.heightAt(x + cell, z, cell) - terrain.heightAt(x - cell, z, cell);
    const hz = terrain.heightAt(x, z + cell, cell) - terrain.heightAt(x, z - cell, cell);
    const slope = Math.hypot(hx, hz) / (2 * cell);
    out.h = surf; out.slope = slope; out.bed = s.bed; out.water = s.water;
    out.mat = world.surface.at(x, z, surf, slope, cell, s);
    return out;
  };

  world.heightAt = (x, z, cell = 0) => terrain.heightAt(x, z, cell);

  /** Conservative [minY, maxY] over a square, including structures and the mountain. Used for LOD bounds. */
  world.heightRange = (x0, z0, size) => {
    let lo = 1e9, hi = -1e9;
    const n = 4, step = size / n, cell = Math.max(0, size / 16);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const h = terrain.heightAt(x0 + i * step, z0 + j * step, cell);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    const margin = size * 0.06 + 12;
    lo -= margin; hi += margin;
    for (const r of regionGrid.query(x0, z0, x0 + size, z0 + size)) hi = Math.max(hi, hi + r.maxHeight);
    const m = SITES.corvus;
    if (x0 < m.x + 6500 && x0 + size > m.x - 6500 && z0 < m.z + 6500 && z0 + size > m.z - 6500) hi = Math.max(hi, m.peak + 30);
    for (const q of MASSIFS) if (x0 < q.x + q.ru * 1.2 && x0 + size > q.x - q.ru * 1.2 && z0 < q.z + q.ru * 1.2 && z0 + size > q.z - q.ru * 1.2) hi = Math.max(hi, q.peak + 30);
    return [Math.min(lo, 0), hi];
  };

  /** All start areas with their spawn points. */
  world.spawns = () => {
    const list = [];
    for (const r of regions) for (const s of r.spawns || []) list.push({ ...s, region: r.id, site: r.id });
    return list;
  };

  return world;
}
