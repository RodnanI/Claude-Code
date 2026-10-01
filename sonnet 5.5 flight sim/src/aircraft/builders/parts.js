import { M } from '../../voxel/palette.js';
import { loftTest } from '../../voxel/recipe.js';

/* Recipe helpers for aircraft modeling. All positions are body-frame meters (x forward, y up, z right).
   Thin features are widened to at least one voxel so they never vanish at coarse LODs. */

const seg = { t: 0 };
function distSeg(x, y, z, a, b, out) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
  const l2 = abx * abx + aby * aby + abz * abz;
  let t = l2 ? ((x - a[0]) * abx + (y - a[1]) * aby + (z - a[2]) * abz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = x - (a[0] + abx * t), dy = y - (a[1] + aby * t), dz = z - (a[2] + abz * t);
  if (out) out.t = t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Round strut between two points. */
export function strut(r, a, b, thick, m, o) {
  const pad = thick + 0.3;
  const bb = () => [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad];
  const bx = bb();
  r.fn(bx[0], bx[1], bx[2], bx[3], bx[4], bx[5], (x, y, z, cell) => (distSeg(x, y, z, a, b) <= Math.max(thick * 0.5, cell * 0.72) ? m : 0), o);
  return r;
}

/** Wheel with tire and hub; axle along z. */
export function wheel(r, cx, cy, cz, radius, width, tire = M.AC_TIRE, hub = M.AC_HUB) {
  r.cyl('z', cx, cy, radius, radius, cz - width / 2, cz + width / 2, tire, { thin: true });
  r.cyl('z', cx, cy, radius * 0.56, radius * 0.56, cz - width / 2 - 0.012, cz + width / 2 + 0.012, hub, { md: 0.15, thin: true });
  return r;
}

/** Ring (torus-like) in the y-z plane at a given x thickness, for yoke wheels and hoops. */
export function ringYZ(r, x0, x1, cy, cz, R, thick, m) {
  r.fn(x0, cy - R - thick, cz - R - thick, x1, cy + R + thick, cz + R + thick, (x, y, z, cell) => {
    const d = Math.hypot(y - cy, z - cz);
    return Math.abs(d - R) <= Math.max(thick, cell * 0.6) * 0.5 ? m : 0;
  });
  return r;
}

/** Round gauge on a panel facing -x (toward the pilot): face, rim and tick marks. */
export function gauge(r, x, cy, cz, radius, faceMat = M.GAUGE_FACE) {
  r.cyl('x', cy, cz, radius + 0.012, radius + 0.012, x - 0.02, x, M.GAUGE_WHITE);
  r.cyl('x', cy, cz, radius, radius, x - 0.026, x - 0.004, faceMat);
  for (let i = 0; i < 9; i++) {
    const a = -2.3 + (i * 4.6) / 8;
    const tx = cy + Math.cos(a) * radius * 0.82, tz = cz + Math.sin(a) * radius * 0.82;
    r.box(x - 0.032, tx - 0.006, tz - 0.006, x - 0.024, tx + 0.006, tz + 0.006, M.GAUGE_WHITE, { md: 0.03 });
  }
  return r;
}

/** Needle for a gauge: a bar along +y from the origin, meant to be rotated about x. Recipe origin = gauge center. */
export function needle(r, length, m = M.NEEDLE_ORANGE) {
  r.box(-0.012, -0.012, -0.007, 0.012, length, 0.007, m);
  r.box(-0.012, -length * 0.22, -0.007, 0.012, 0.0, 0.007, m);
  return r;
}

/**
 * Keep interior geometry inside the airframe skin: removes everything in `bounds` that lies outside the lofted hull
 * shrunk by `inset`. Call after the interior ops of a part so seats, floors and trim cannot poke through the skin.
 */
export function clipToHull(r, hull, axis, inset, bounds) {
  const inside = loftTest(hull, axis, -inset);
  if (axis !== 'x') {
    r.fn(bounds[0], bounds[1], bounds[2], bounds[3], bounds[4], bounds[5], (x, y, z) => (inside(x, y, z) ? 0 : -1));
    return r;
  }
  // the shrunk hull has a box of its own: everything outside it goes with plain box carves, and only the voxels inside it are tested
  let a0 = Infinity, a1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of hull) {
    a0 = Math.min(a0, s.a); a1 = Math.max(a1, s.a);
    y0 = Math.min(y0, s.c1 - s.r1 + inset); y1 = Math.max(y1, s.c1 + s.r1 - inset);
    z0 = Math.min(z0, s.c2 - s.r2 + inset); z1 = Math.max(z1, s.c2 + s.r2 - inset);
  }
  const [bx0, by0, bz0, bx1, by1, bz1] = bounds;
  const hx0 = Math.max(bx0, a0 + inset), hx1 = Math.min(bx1, a1 - inset), hy0 = Math.max(by0, y0), hy1 = Math.min(by1, y1), hz0 = Math.max(bz0, z0), hz1 = Math.min(bz1, z1);
  if (hx0 >= hx1 || hy0 >= hy1 || hz0 >= hz1) { r.box(bx0, by0, bz0, bx1, by1, bz1, 0); return r; }
  const q = 1e-7;                                                    // the box carves stop a hair short of the hull box and the test reaches a hair past it, so no voxel center falls between
  if (bx0 < hx0) r.box(bx0, by0, bz0, hx0 - q, by1, bz1, 0);
  if (hx1 < bx1) r.box(hx1 + q, by0, bz0, bx1, by1, bz1, 0);
  if (by0 < hy0) r.box(bx0, by0, bz0, bx1, hy0 - q, bz1, 0);
  if (hy1 < by1) r.box(bx0, hy1 + q, bz0, bx1, by1, bz1, 0);
  if (bz0 < hz0) r.box(bx0, by0, bz0, bx1, by1, hz0 - q, 0);
  if (hz1 < bz1) r.box(bx0, by0, hz1 + q, bx1, by1, bz1, 0);
  r.fn(Math.max(bx0, hx0 - 2 * q), Math.max(by0, hy0 - 2 * q), Math.max(bz0, hz0 - 2 * q), Math.min(bx1, hx1 + 2 * q), Math.min(by1, hy1 + 2 * q), Math.min(bz1, hz1 + 2 * q), (x, y, z) => (inside(x, y, z) ? 0 : -1));
  return r;
}
