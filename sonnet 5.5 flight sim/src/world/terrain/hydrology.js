import { distToSegment, smoothstep, lerp } from '../../core/util.js';
import { SpatialGrid } from '../spatial.js';
import { RIVERS, LAKES } from '../layout.js';

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** Smooth polyline through control points, resampled to roughly `step` meters. */
function densify(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) out.push(catmull(p0, p1, p2, p3, k / n));
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

/**
 * Rivers follow the ground: the water level is a running minimum of the terrain along the smoothed centerline, so a
 * river only ever flows downhill and never floats above the land or digs a gorge. Lakes are ellipses with a raised rim.
 */
export function createHydrology(naturalAt) {
  const grid = new SpatialGrid(256);
  const rivers = RIVERS.map((r) => {
    const pts = densify(r.pts, 60);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    let level = Infinity;
    const levels = pts.map((p) => {
      level = Math.min(level, naturalAt(p[0], p[1]) - 1.3);
      return Math.max(level, 0.5);
    });
    const rec = { ...r, pts, lens, levels, total: lens[lens.length - 1], segs: [] };
    const pad = Math.max(r.w0, r.w1) + 24;
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = { r: rec, i };
      rec.segs.push(seg);
      grid.insert(seg, Math.min(pts[i][0], pts[i + 1][0]) - pad, Math.min(pts[i][1], pts[i + 1][1]) - pad, Math.max(pts[i][0], pts[i + 1][0]) + pad, Math.max(pts[i][1], pts[i + 1][1]) + pad);
    }
    return rec;
  });
  const lakes = LAKES.map((l) => ({ ...l, level: Math.max(0.8, naturalAt(l.x, l.z) - 0.6) }));
  const seg = { t: 0 };

  /**
   * Applies rivers and lakes to natural height h. Writes out.water (surface level or NaN) and returns the new height.
   * cell lets very coarse levels drop thin rivers instead of turning them into fat blue slabs.
   */
  function apply(x, z, h, cell, out) {
    out.water = NaN;
    out.hydro = 0;
    if (cell <= 24) {
      const cand = grid.at(x, z);
      let best = 1e9, bi = -1, bt = 0, br = null;
      for (let k = 0; k < cand.length; k++) {
        const s = cand[k], r = s.r;
        const p = r.pts[s.i], q = r.pts[s.i + 1];
        const d = distToSegment(x, z, p[0], p[1], q[0], q[1], seg);
        if (d < best) { best = d; bi = s.i; bt = seg.t; br = r; }
      }
      if (br) {
        const along = (br.lens[bi] + (br.lens[bi + 1] - br.lens[bi]) * bt) / br.total;
        const w = Math.max(lerp(br.w0, br.w1, along), cell * 0.55) * 0.5;
        if (best <= w + 16) {
          const level = lerp(br.levels[bi], br.levels[bi + 1], bt);
          if (best <= w) {
            const surf = Math.max(0.3, Math.min(level, h - 0.6));
            h = Math.min(h, surf - 0.8);
            out.water = surf;
            out.hydro = 1;
          } else {
            const bank = level + (best - w) * 0.42;
            if (bank < h) h = bank;
          }
        }
      }
    }
    for (let i = 0; i < lakes.length; i++) {
      const l = lakes[i];
      const dx = (x - l.x) / l.rx, dz = (z - l.z) / l.rz;
      const q = Math.sqrt(dx * dx + dz * dz);
      if (q > 1.9) continue;
      if (q < 1.0) {
        h = Math.min(h, l.level - l.depth * (1 - q * q) - 0.3);
        out.water = l.level;
        out.hydro = 2;
      } else {
        const rim = l.level + 1.6 * (1 - smoothstep(1.0, 1.9, q));
        if (h < rim) h = rim;
      }
    }
    return h;
  }
  return { rivers, lakes, apply };
}
