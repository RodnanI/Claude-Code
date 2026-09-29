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

/** Tapered wing pair helper. root: [xLE, y, z]; returns nothing, adds both sides. */
export function wingPair(r, root, span, cr, ct, sweep, dih, tr, tt, m, o) {
  r.wing([root[0], root[1], root[2]], span, cr, ct, sweep, dih, tr, tt, 1, m, o);
  r.wing([root[0], root[1], -root[2]], span, cr, ct, sweep, dih, tr, tt, -1, m, o);
}

/** Vertical fin as a lofted plate along y. */
export function fin(r, xRoot, yRoot, chordRoot, chordTip, height, sweep, thick, m, o) {
  r.loft('y', [
    { a: yRoot, c1: xRoot - chordRoot / 2, c2: 0, r1: chordRoot / 2, r2: thick, n: 4 },
    { a: yRoot + height, c1: xRoot - sweep - chordTip / 2, c2: 0, r1: chordTip / 2, r2: thick * 0.7, n: 4 },
  ], m, { thin: true, ...o });
}

/** Propeller with two or three blades about the +x axis; recipe origin = hub center. */
export function propeller(r, radius, blades = 2, chord = 0.16, mat = M.AC_PROP, tip = M.AC_PROP_TIP) {
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    r.fn(-0.05, -radius, -radius, 0.05, radius, radius, (x, y, z, cell) => {
      const along = y * ca + z * sa, perp = -y * sa + z * ca;
      if (along < 0.08 || along > radius) return 0;
      const w = Math.max(chord * (1 - 0.35 * (along / radius)), cell * 1.05) * 0.5;
      if (Math.abs(perp) > w || Math.abs(x) > Math.max(0.025 + 0.02 * (1 - perp / w), cell * 0.5)) return 0;
      return along > radius - 0.16 ? tip : mat;
    }, { thin: true });
  }
  r.cyl('x', 0, 0, 0.09, 0.09, -0.06, 0.06, M.AC_METAL, { md: 0.2 });
}

/**
 * Keep interior geometry inside the airframe skin: removes everything in `bounds` that lies outside the lofted hull
 * shrunk by `inset`. Call after the interior ops of a part so seats, floors and trim cannot poke through the skin.
 */
export function clipToHull(r, hull, axis, inset, bounds) {
  const inside = loftTest(hull, axis, -inset);
  r.fn(bounds[0], bounds[1], bounds[2], bounds[3], bounds[4], bounds[5], (x, y, z) => (inside(x, y, z) ? 0 : -1));
  return r;
}
