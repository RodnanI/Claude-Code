import { loftTest } from '../../voxel/recipe.js';

/* A hollow fuselage. The body is a lofted solid along x; this helper keeps everything that follows from one station list: the
   cavity, the liner rings for the interior parts, a one-cell glass skin for window openings and the squarish room that is carved
   out of the cavity. Windows are real openings at fine voxel sizes and plain dark paint far away, so the hull never looks shredded. */

/** Station list sorted by `a`, with the hull tests derived from it. wall is the skin thickness in meters. */
export function makeHull(stations, wall = 0.1) {
  const FUS = stations.slice().sort((p, q) => p.a - q.a);
  const outer = loftTest(FUS, 'x'), inner = loftTest(FUS, 'x', -wall);
  const skin = (x, y, z) => outer(x, y, z) && !inner(x, y, z);
  const shells = new Map();
  /** Glass skin: the real skin at fine cells, a one cell shell at coarse cells so a part is never empty. */
  const glassSkin = (x, y, z, c) => {
    if (c <= 0.07) return skin(x, y, z);
    let t = shells.get(c);
    if (!t) { t = loftTest(FUS, 'x', -c); shells.set(c, t); }
    return outer(x, y, z) && !t(x, y, z);
  };
  /** Interpolated station at a. */
  const at = (a) => {
    let i = 0;
    while (i < FUS.length - 2 && a > FUS[i + 1].a) i++;
    const s0 = FUS[i], s1 = FUS[i + 1], t = Math.min(1, Math.max(0, (a - s0.a) / (s1.a - s0.a)));
    const L = (p, q) => p + (q - p) * t;
    return { a, c1: L(s0.c1, s1.c1), c2: 0, r1: L(s0.r1, s1.r1), r2: L(s0.r2, s1.r2), n: L(s0.n ?? 2, s1.n ?? 2) };
  };
  /** The hull between a0 and a1, shrunk by w (default: the skin). */
  const shell = (a0, a1, w = wall) => [at(a0), ...FUS.filter((s) => s.a > a0 && s.a < a1), at(a1)].map((s) => ({ a: s.a, c1: s.c1, c2: 0, r1: s.r1 - w, r2: s.r2 - w, n: s.n ?? 2 }));
  /** A disk across the hull (a bulkhead or an instrument panel base) from a0 to a1, shrunk by w. */
  const disk = (r, a0, a1, w, m) => r.loft('x', [at(a0), at(a1)].map((s) => ({ ...s, r1: s.r1 - w, r2: s.r2 - w })), m);
  return { FUS, outer, inner, skin, glassSkin, at, shell, disk, wall };
}

/**
 * Opens the usable room inside the cavity: flat sidewalls (half width w) up to height yw, a narrower strip (wf) down to the floor
 * and an elliptical arch of height dh for the roof. It is constant along x, so the walls come out as clean planes.
 */
export function carveRoom(r, x0, x1, { floor, w, wf, yw, dh, yf = -0.5 }) {
  r.box(x0, floor - 0.04, -wf, x1, yf, wf, 0);
  r.box(x0, yf, -w, x1, yw, w, 0);
  r.fn(x0, yw, -w - 0.05, x1, yw + dh + 0.02, w + 0.05, (x, y, z) => { const u = (y - yw) / dh, v = z / w; return u * u + v * v <= 1 ? -1 : 0; });
}

/** Superellipse oval distance used for windows: below 1 is inside. */
export const oval = (dx, dy, n = 2.6) => Math.pow(Math.abs(dx), n) + Math.pow(Math.abs(dy), n);
