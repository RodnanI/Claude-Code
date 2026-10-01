import { M } from '../../voxel/palette.js';
import { loftTest } from '../../voxel/recipe.js';

/* Movable surfaces that fit. An aileron, a flap, a rudder or a slat is cut out of the fixed airframe along its hinge and rebuilt
   as its own part with the same section, so when it moves there is a real gap behind it and a real edge, and when it rests the
   two are one smooth skin. The cut and the part share one membership test, so nothing is left over and nothing is missing. */

/** A wing description in the same arguments as Recipe.wing, with the mirrored side as a number: +1 right, -1 left. */
export function wingDef(root, span, cr, ct, sweep, dih, tr, tt, side = 1) {
  return { root, span, cr, ct, sweep, dih, tr, tt, side };
}

/** Membership of a wing solid, with the same airfoil as Recipe.wing. */
export function wingSolid(W) {
  const { root, span, cr, ct, sweep, dih, tr, tt, side } = W;
  return (x, y, z, cell = 0) => {
    const t = ((z - root[2]) * side) / span;
    if (t < 0 || t > 1) return false;
    const chord = cr + (ct - cr) * t, le = root[0] - sweep * t, u = (le - x) / chord;
    if (u < 0 || u > 1) return false;
    const tc = tr + (tt - tr) * t;
    const half = 5 * tc * chord * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u);
    return Math.abs(y - (root[1] + dih * t)) <= Math.max(half, cell * 0.5);
  };
}

/** Where the hinge line crosses a spanwise station z: the aft `frac` of the chord is the surface (or the forward share when le). */
export function hingeX(W, z, frac, le = false) {
  const t = ((z - W.root[2]) * W.side) / W.span;
  const chord = W.cr + (W.ct - W.cr) * t, lead = W.root[0] - W.sweep * t;
  return le ? lead - chord * frac : lead - chord * (1 - frac);
}

/** Planform point of the wing: leading edge x, chord and height at a station. */
export function wingAt(W, z) {
  const t = ((z - W.root[2]) * W.side) / W.span;
  return { x: W.root[0] - W.sweep * t, chord: W.cr + (W.ct - W.cr) * t, y: W.root[1] + W.dih * t, t };
}

function boxOfWing(W, za, zb, pad = 0.05) {
  const e0 = wingAt(W, za), e1 = wingAt(W, zb);
  const th = Math.max(W.tr * W.cr, W.tt * W.ct) * 0.9 + pad;
  return [Math.min(e0.x - e0.chord, e1.x - e1.chord) - pad, Math.min(e0.y, e1.y) - th, Math.min(za, zb), Math.max(e0.x, e1.x) + pad, Math.max(e0.y, e1.y) + th, Math.max(za, zb)];
}

/**
 * Cut a hinged surface out of a wing. W is the wing, z0 and z1 the span range in meters from the center line (positive numbers,
 * the side is taken from W), frac the share of the chord, le true for a leading edge device. The part's pivot is on the hinge at
 * mid span; rotate it about the z axis (or a tilted axis for a swept hinge). Returns the part recipe for more detail.
 */
export function wingSurface(k, body, name, W, { z0, z1, frac = 0.28, le = false, mat, opts = {}, thin = true, mask = null }) {
  const solid = wingSolid(W), s = W.side;
  const za = Math.min(z0 * s, z1 * s), zb = Math.max(z0 * s, z1 * s);
  const m = (c) => (c > 0.12 ? c * 0.5 : 0);                       // coarse cells widen the region so thin surfaces never vanish
  const test = (x, y, z, c) => z >= za - m(c) && z <= zb + m(c) && solid(x, y, z, c) && (le ? x > hingeX(W, z, frac, true) - m(c) : x < hingeX(W, z, frac, false) + m(c)) && !(mask && mask(x, y, z));
  const box = boxOfWing(W, za, zb);
  body.fn(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z, c) => (test(x, y, z, c > 0.12 ? c : c * 1.4) ? -1 : 0));
  const zm = (za + zb) / 2, a = wingAt(W, zm);
  const pivot = [hingeX(W, zm, frac, le), a.y, zm];
  const part = k.part(name, { pivot, ...opts });
  part.fn(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z, c) => (test(x, y, z, c) ? mat : 0), thin ? { thin: true } : undefined);
  return part;
}

/** Cut any lofted surface (a fin, a stabilizer built as a loft) at an arbitrary hinge test: aft(x, y, z) is true behind the hinge. */
export function loftSurface(k, body, name, { stations, axis = 'y', box, aft, mat, pivot, grow = 0.03, opts = {} }) {
  const tests = new Map();
  const solidAt = (e) => { let t = tests.get(e); if (!t) { t = loftTest(stations, axis, e); tests.set(e, t); } return t; };
  const coarse = (c) => (c > 0.12 ? c * 0.5 : 0);                 // a thin fin never vanishes at coarse cells
  body.fn(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z, c) => (solidAt(grow + coarse(c))(x, y, z) && aft(x, y, z) ? -1 : 0));
  const part = k.part(name, { pivot, ...opts });
  part.fn(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z, c) => (solidAt(coarse(c))(x, y, z) && aft(x, y, z) ? mat : 0), { thin: true });
  return part;
}

/** A fin as a loft along y at a spanwise offset z, with the same arguments as builders/parts fin() plus z. Returns the stations. */
export function finStations({ x, y, z = 0, chord, tip, height, sweep, thick }) {
  return [
    { a: y, c1: x - chord / 2, c2: z, r1: chord / 2, r2: thick, n: 4 },
    { a: y + height, c1: x - sweep - tip / 2, c2: z, r1: tip / 2, r2: thick * 0.7, n: 4 },
  ];
}

/** Leading edge, trailing edge and chord of a fin built with finStations, at height y. */
export function finAt(f, y) {
  const t = (y - f.y) / f.height;
  const chord = f.chord + (f.tip - f.chord) * t, le = f.x - f.sweep * t;
  return { le, te: le - chord, chord, t };
}

export const SKIN = M.AC_GRAY;
