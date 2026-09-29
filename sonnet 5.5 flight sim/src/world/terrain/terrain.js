import { Noise } from '../../core/noise.js';
import { smoothstep, lerp } from '../../core/util.js';
import { SITES, MASSIFS } from '../layout.js';
import { createIsland } from './island.js';
import { createMacro } from './macro.js';
import { createHydrology } from './hydrology.js';
import { SEA_LEVEL } from '../config.js';

const MT = SITES.corvus;
const MC = Math.cos(-0.44), MS = Math.sin(-0.44);

/**
 * Terrain height function. Pipeline: island mask and hills, mountain, region flatten zones, rivers and lakes.
 * Everything is a pure function of (x, z, cell). `cell` is the sampling cell size: octaves finer than it are skipped.
 */
export function createTerrain(seed, mods = [], macro = createMacro(seed)) {
  macro.enabled = false;   // setup samples sparsely; turned back on before the terrain is used
  const island = createIsland(seed, macro);
  const nHill = new Noise(seed ^ 0x303), nMtn = new Noise(seed ^ 0x404), nDet = new Noise(seed ^ 0x505), nWarp = new Noise(seed ^ 0x606);
  const nRidge = new Noise(seed ^ 0x717), nMesa = new Noise(seed ^ 0x828), nCliff = new Noise(seed ^ 0x939), nStack = new Noise(seed ^ 0xa4a), nGully = new Noise(seed ^ 0xb5b);
  const siteList = Object.values(SITES).filter((q) => q.kind !== 'mountain');
  let mtnScale = 1;
  const massifs = MASSIFS.map((q) => ({ ...q, c: Math.cos(q.rot), s: Math.sin(q.rot), scale: 0 }));

  function mountainRaw(x, z, cell) {
    const dx = x - MT.x, dz = z - MT.z;
    const u = (dx * MC + dz * MS) / 5800, v = (-dx * MS + dz * MC) / 4000;
    const r = Math.sqrt(u * u + v * v);
    if (r >= 1.12) return 0;
    const prof = Math.pow(Math.max(0, 1 - r / 1.12), 1.55);
    const rid = nMtn.ridged2(x / 2500 + 9.3, z / 2500 - 4.1, 5, 2.1, 0.42, cell / 2500);
    const shoulder = smoothstep(1.12, 0.35, r);
    return prof * (0.55 + 0.75 * rid) + 0.12 * shoulder * nMtn.fbm2(x / 1400, z / 1400, 3, 2, 0.5, cell / 1400);
  }

  /** A smaller massif: an elliptical profile carved into ridges, the same recipe as Corvus at another size. */
  function massifRaw(q, x, z, cell) {
    const dx = x - q.x, dz = z - q.z;
    if (dx > q.ru * 1.2 || dx < -q.ru * 1.2 || dz > q.ru * 1.2 || dz < -q.ru * 1.2) return 0;
    const u = (dx * q.c + dz * q.s) / q.ru, v = (-dx * q.s + dz * q.c) / q.rv;
    const r = Math.sqrt(u * u + v * v);
    if (r >= 1.1) return 0;
    const prof = Math.pow(1 - r / 1.1, 1.6);
    const rid = nMtn.ridged2(x / q.ridge + 3.7, z / q.ridge - 8.2, 5, 2.1, 0.42, cell / q.ridge);
    return prof * (0.5 + 0.8 * rid);
  }

  /** 0 next to a settlement or airfield, 1 well away from all of them: dramatic relief stays out of the towns and off the runways. */
  function siteFar(x, z) {
    let d2 = 1e18;
    for (let i = 0; i < siteList.length; i++) {
      const q = siteList[i], dx = x - q.x, dz = z - q.z, dd = dx * dx + dz * dz;
      if (dd < d2) d2 = dd;
    }
    return smoothstep(1700, 4300, Math.sqrt(d2));
  }

  const out0 = { h: 0, m: 0 };
  function natural(x, z, cell = 0, o = out0) {
    const m = island.mask(x, z, cell);
    o.m = m;
    let h;
    if (m <= 0) {
      h = -3 - 130 * smoothstep(0, 0.45, -m);
      // sea stacks and rocky islets, most of them under the cliff coasts
      if (m > -0.07 && cell < 90) {
        const cl = smoothstep(0.2, 0.55, nCliff.n2(x / 2500 + 1.7, z / 2500 - 9.1));
        const thr = 0.66 - 0.24 * cl;
        const sn = nStack.n2(x / 170 + 5.5, z / 170 - 3.3);
        if (sn > thr) {
          const st = smoothstep(thr, thr + 0.2, sn) * smoothstep(-0.07, -0.012, m);
          const top = st * (12 + 32 * (0.5 + 0.5 * nStack.n2(x / 80 + 1.1, z / 80 + 7.9))) - 3;
          if (top > h) h = top;
        }
      }
      o.land = 0;
    } else {
      const land = smoothstep(0, 0.09, m);
      const up = smoothstep(0.05, 0.7, m);
      let hill, plains;
      if (macro.enabled && cell < macro.maxCell) { const f = macro.out; hill = f.hill; plains = f.plains; }   // island.mask just filled it for this point
      else {
        hill = 0.5 + 0.5 * nHill.fbm2(x / 3800 + 3.1, z / 3800 - 1.7, 5, 2, 0.5, cell / 3800);
        plains = smoothstep(-0.25, 0.35, nHill.n2(x / 7000 + 8, z / 7000));
      }
      const amp = 95 * (0.4 + 0.6 * (1 - plains * 0.85));
      h = 2.5 * land + up * (10 + hill * hill * amp);
      const hc = up * (1 - plains);                      // hill country: where the ground may be dramatic
      let far = -1;
      if (hc > 0.03) {
        far = siteFar(x, z);
        const w = hc * far;
        if (w > 0.02) {
          // ridges and hollows, and in patches a stepped mesa country with cliff bands
          const rd = nRidge.ridged2(x / 1250 + 2.2, z / 1250 - 7.7, 4, 2.05, 0.5, cell / 1250);
          h += w * (rd - 0.42) * 85;
          let mesa = smoothstep(0.5, 0.74, nMesa.n2(x / 4600 + 6.1, z / 4600 - 2.4)) * w;
          if (mesa > 0.02) {
            // the mountains carve their own cliffs; a mesa country belongs to the open hills between them
            mesa *= (1 - smoothstep(0.0, 0.06, mountainRaw(x, z, cell))) * smoothstep(48, 95, h);   // on the hills, not the plains
            const step = 26, t = h / step, fl = Math.floor(t);
            h += (step * (fl + smoothstep(0.84, 0.9, t - fl)) - h) * mesa * 0.88;
          }
        }
      }
      if (cell < 40) h += 2.4 * nDet.fbm2(x / 70, z / 70, 3, 2, 0.5, cell / 70) * land;
      // inland the ground never sinks to sea level by accident: a hollow bottoms out as a flat valley floor, and the ponds that
      // belong there are lakes placed on purpose
      const inland = smoothstep(0.1, 0.34, m);
      if (inland > 0) { const d = h - 7; h += ((d + Math.sqrt(d * d + 36)) * 0.5 + 7 - h) * inland; }
      // headlands: stretches of coast where the land stands up out of the sea in a cliff
      if (m < 0.32) {
        const cl = smoothstep(0.28, 0.6, nCliff.n2(x / 2500 + 1.7, z / 2500 - 9.1));
        if (cl > 0.01) {
          if (far < 0) far = siteFar(x, z);
          const wc = cl * far;
          if (wc > 0.01) h += wc * 36 * (0.75 + 0.25 * nCliff.n2(x / 310, z / 310)) * smoothstep(0.0, 0.006, m) * (1 - 0.6 * smoothstep(0.03, 0.26, m));
        }
      }
      const mt = mountainRaw(x, z, cell) * mtnScale * smoothstep(0.08, 0.32, m);
      let mm = 0;
      for (let i = 0; i < massifs.length; i++) { const q = massifs[i]; if (q.scale > 0) mm += massifRaw(q, x, z, cell) * q.scale; }
      h += mt + mm * smoothstep(0.08, 0.32, m);
      o.mtn = mt + mm;
      o.land = land;
    }
    o.h = h;
    return h;
  }

  // Calibrate so the highest point of each mountain matches its declared peak.
  const calibrate = (rawAt, peak, cx, cz, span) => {
    const raws = [], bases = [];
    const stepN = 32;
    for (let i = -stepN; i <= stepN; i++) {
      for (let j = -stepN; j <= stepN; j++) {
        const x = cx + (i * span) / stepN, z = cz + (j * span) / stepN;
        const raw = rawAt(x, z);
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
      if (mx > peak) hi = mid; else lo = mid;
    }
    return lo;
  };
  mtnScale = 0;
  mtnScale = calibrate((x, z) => mountainRaw(x, z, 0), MT.peak, MT.x, MT.z, 2240);
  for (const q of massifs) q.scale = calibrate((x, z) => massifRaw(q, x, z, 0), q.peak, q.x, q.z, q.ru * 1.05);

  const hydro = createHydrology((x, z) => natural(x, z, 0, { h: 0, m: 0 }));

  // Resolve auto flatten heights and precompute bounds.
  const flat = mods.map((mod) => {
    const c = { ...mod };
    if (c.y === undefined || c.y === 'auto') {
      c.y = natural(c.x ?? c.cx, c.z ?? c.cz, 0, { h: 0, m: 0 });
      c.y = c.snap ? Math.round(c.y / c.snap) * c.snap : Math.round(c.y);
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
  // lowest order first, bigger footprints first within an order, so small specific pads are applied last and win
flat.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.r ?? b.hw) - (a.r ?? a.hw));

  macro.enabled = true;

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

  /**
   * Physics/ground height at a point (water surface counts as ground). Points asked for one at a time (physics, layouts, props)
   * use the exact function; only the dense sampling of node columns goes through the cached macro tiles.
   */
  function heightAt(x, z, cell = 0) {
    const was = macro.enabled;
    macro.enabled = false;
    const h = sample(x, z, cell, scratch);
    macro.enabled = was;
    return h;
  }

  return { island, natural, sample, heightAt, hydro, mods: flat, mountainPeak: MT.peak, mtnScale, massifs, macro };
}
