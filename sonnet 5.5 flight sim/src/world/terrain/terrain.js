import { Noise } from '../../core/noise.js';
import { smoothstep, lerp } from '../../core/util.js';
import { SITES } from '../layout.js';
import { createIsland } from './island.js';
import { createHydrology } from './hydrology.js';
import { SEA_LEVEL } from '../config.js';

const MT = SITES.corvus;
const MC = Math.cos(-0.44), MS = Math.sin(-0.44);

/**
 * Terrain height function. Pipeline: island mask and hills, mountain, region flatten zones, rivers and lakes.
 * Everything is a pure function of (x, z, cell). `cell` is the sampling cell size: octaves finer than it are skipped.
 */
export function createTerrain(seed, mods = []) {
  const island = createIsland(seed);
  const nHill = new Noise(seed ^ 0x303), nMtn = new Noise(seed ^ 0x404), nDet = new Noise(seed ^ 0x505), nWarp = new Noise(seed ^ 0x606);
  let mtnScale = 1;

  function mountainRaw(x, z, cell) {
    const dx = x - MT.x, dz = z - MT.z;
    const u = (dx * MC + dz * MS) / 5800, v = (-dx * MS + dz * MC) / 4000;
    const r = Math.sqrt(u * u + v * v);
    if (r >= 1.12) return 0;
    const prof = Math.pow(Math.max(0, 1 - r / 1.12), 1.55);
    const rid = nMtn.ridged2(x / 2500 + 9.3, z / 2500 - 4.1, 5, 2.1, 0.55, cell);
    const shoulder = smoothstep(1.12, 0.35, r);
    return prof * (0.55 + 0.75 * rid) + 0.12 * shoulder * nMtn.fbm2(x / 1400, z / 1400, 3, 2, 0.5, cell);
  }
  const out0 = { h: 0, m: 0 };
  function natural(x, z, cell = 0, o = out0) {
    const m = island.mask(x, z, cell);
    o.m = m;
    let h;
    if (m <= 0) {
      h = -3 - 130 * smoothstep(0, 0.45, -m);
      o.land = 0;
    } else {
      const land = smoothstep(0, 0.09, m);
      const up = smoothstep(0.05, 0.7, m);
      const hill = 0.5 + 0.5 * nHill.fbm2(x / 3800 + 3.1, z / 3800 - 1.7, 5, 2, 0.5, cell);
      const plains = smoothstep(-0.25, 0.35, nHill.n2(x / 7000 + 8, z / 7000));
      const amp = 95 * (0.4 + 0.6 * (1 - plains * 0.85));
      h = 2.5 * land + up * (10 + hill * hill * amp);
      if (cell < 40) h += 2.4 * nDet.fbm2(x / 70, z / 70, 3, 2, 0.5, cell) * land;
      const mt = mountainRaw(x, z, cell) * mtnScale * smoothstep(0.08, 0.32, m);
      h += mt;
      o.mtn = mt;
      o.land = land;
    }
    o.h = h;
    return h;
  }

  // Calibrate so the highest point of the finished terrain matches the declared peak.
  {
    mtnScale = 0;
    const raws = [], bases = [];
    for (let i = -32; i <= 32; i++) {
      for (let j = -32; j <= 32; j++) {
        const x = MT.x + i * 70, z = MT.z + j * 70;
        const raw = mountainRaw(x, z, 0);
        if (raw < 0.05) continue;
        raws.push(raw);
        bases.push(natural(x, z, 0, { h: 0, m: 0 }));
      }
    }
    let lo = 0.2, hi = 4000;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      let mx = 0;
      for (let k = 0; k < raws.length; k++) mx = Math.max(mx, bases[k] + mid * raws[k]);
      if (mx > MT.peak) hi = mid; else lo = mid;
    }
    mtnScale = lo;
  }

  const hydro = createHydrology((x, z) => natural(x, z, 0, { h: 0, m: 0 }));

  // Resolve auto flatten heights and precompute bounds.
  const flat = mods.map((mod) => {
    const c = { ...mod };
    if (c.y === undefined || c.y === 'auto') {
      c.y = natural(c.x ?? c.cx, c.z ?? c.cz, 0, { h: 0, m: 0 });
      c.y = Math.round(c.y);
    }
    if (c.type === 'rect') {
      c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0);
      const R = Math.hypot(c.hw, c.hd) + c.blend;
      c.aabb = [c.cx - R, c.cz - R, c.cx + R, c.cz + R];
    } else {
      const R = c.r + c.blend;
      c.aabb = [c.x - R, c.z - R, c.x + R, c.z + R];
    }
    return c;
  });
  flat.sort((a, b) => (b.order ?? 0) - (a.order ?? 0) || (b.r ?? b.hw) - (a.r ?? a.hw));

  const scratch = { h: 0, m: 0, mtn: 0, land: 0, water: NaN, hydro: 0 };

  function applyMods(x, z, h, gate) {
    for (let i = 0; i < flat.length; i++) {
      const c = flat[i];
      const a = c.aabb;
      if (x < a[0] || x > a[2] || z < a[1] || z > a[3]) continue;
      if (c.type === 'rect') {
        const dx = x - c.cx, dz = z - c.cz;
        const u = dx * c.cos + dz * c.sin, v = -dx * c.sin + dz * c.cos;
        const du = Math.abs(u) - c.hw, dv = Math.abs(v) - c.hd;
        const d = Math.hypot(Math.max(du, 0), Math.max(dv, 0));
        if (d >= c.blend) continue;
        const w = 1 - smoothstep(0, Math.max(c.blend, 1e-3), d);
        let target = c.y + (c.tu || 0) * u + (c.tv || 0) * v;
        if (c.bumps) for (const b of c.bumps) target += b.amp * Math.exp(-((u - b.u) * (u - b.u)) / (2 * b.w * b.w)) * Math.exp(-(v * v) / (2 * (b.wv || 12) * (b.wv || 12)));
        h = lerp(h, target, w * (c.noGate ? 1 : gate));
      } else {
        const d = Math.hypot(x - c.x, z - c.z);
        if (d >= c.r + c.blend) continue;
        const w = 1 - smoothstep(c.r, c.r + c.blend, d);
        h = lerp(h, c.y, w * (c.noGate ? 1 : gate));
      }
    }
    return h;
  }

  /** Bed height (solid ground) and, if present, water surface. Result written to o. */
  function sample(x, z, cell = 0, o = scratch) {
    natural(x, z, cell, o);
    let h = o.h;
    const gate = smoothstep(-0.004, 0.03, o.m);
    if (flat.length) h = applyMods(x, z, h, gate);
    h = hydro.apply(x, z, h, cell, o);
    o.bed = h;
    let surf;
    if (!Number.isNaN(o.water)) surf = Math.max(o.water, h);
    else if (h < SEA_LEVEL) { surf = SEA_LEVEL; o.water = SEA_LEVEL; }
    else surf = h;
    o.surf = surf;
    return surf;
  }

  /** Physics/ground height at a point (water surface counts as ground). */
  function heightAt(x, z, cell = 0) {
    return sample(x, z, cell, scratch);
  }

  return { island, natural, sample, heightAt, hydro, mods: flat, mountainPeak: MT.peak, mtnScale };
}
