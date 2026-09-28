import { distToSegment, smoothstep, lerp, clamp } from '../../core/util.js';
import { RIVERS, LAKES } from '../layout.js';

/** Rivers as polylines with monotonically falling water levels, lakes as ellipses with a raised rim. */
export function createHydrology(naturalAt) {
  const rivers = RIVERS.map((r) => {
    const pts = r.pts;
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    let level = Infinity;
    const levels = pts.map((p) => {
      level = Math.min(level, naturalAt(p[0], p[1]) - 1.4);
      return Math.max(level, 0.6);
    });
    let minx = 1e9, minz = 1e9, maxx = -1e9, maxz = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
    const pad = Math.max(r.w0, r.w1) + 40;
    return { ...r, lens, levels, total: lens[lens.length - 1], aabb: [minx - pad, minz - pad, maxx + pad, maxz + pad] };
  });
  const lakes = LAKES.map((l) => ({ ...l, level: Math.max(0.8, naturalAt(l.x, l.z) - 0.6) }));
  const seg = { t: 0 };
  const res = { level: NaN, bed: 0, bank: 0 };

  /**
   * Applies rivers and lakes to natural height h. Writes out.water (surface level or NaN) and returns new height.
   * cell lets very coarse levels drop thin rivers instead of turning them into fat blue slabs.
   */
  function apply(x, z, h, cell, out) {
    out.water = NaN;
    out.hydro = 0;
    for (let i = 0; i < rivers.length; i++) {
      const r = rivers[i];
      const a = r.aabb;
      if (x < a[0] || x > a[2] || z < a[1] || z > a[3]) continue;
      if (cell > 24) continue;
      let best = 1e9, bt = 0, bs = 0;
      for (let s = 0; s < r.pts.length - 1; s++) {
        const p = r.pts[s], q = r.pts[s + 1];
        const d = distToSegment(x, z, p[0], p[1], q[0], q[1], seg);
        if (d < best) { best = d; bt = seg.t; bs = s; }
      }
      const along = (r.lens[bs] + (r.lens[bs + 1] - r.lens[bs]) * bt) / r.total;
      const w = Math.max(lerp(r.w0, r.w1, along), cell * 0.55) * 0.5;
      if (best > w + 16) continue;
      const level = lerp(r.levels[bs], r.levels[bs + 1], bt);
      if (best <= w) {
        h = Math.min(h, level - 0.8);
        out.water = level;
        out.hydro = 1;
      } else {
        const bank = level + (best - w) * 0.42;
        if (bank < h) h = bank;
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
