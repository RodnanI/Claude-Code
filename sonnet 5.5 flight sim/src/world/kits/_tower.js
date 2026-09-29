import { M, FACADE_INFO } from '../../voxel/palette.js';
import { pick, parapet, foundation } from './_util.js';

/* Building toolkit. Facade materials draw their windows in the shader on a world-space grid (bay by floor height), so a
   kit only has to keep its walls and floor lines on that grid. `grid` snaps local coordinates to world grid lines whatever
   the quarter turn of the structure, and `Facade` hands out floor line heights above the local ground. Files starting with
   an underscore are not registered as kits. */

export const facId = (x) => (typeof x === 'string' ? M[x] : x);

/** Snap functions for local x and z: the returned value lands on a world multiple of `b`. */
export function grid(d) {
  const r = (d.rot || 0) & 3;
  const sx = r === 0 ? (v, b) => Math.round((d.x + v) / b) * b - d.x
    : r === 1 ? (v, b) => Math.round((d.z + v) / b) * b - d.z
    : r === 2 ? (v, b) => d.x - Math.round((d.x - v) / b) * b
    : (v, b) => d.z - Math.round((d.z - v) / b) * b;
  const sz = r === 0 ? (v, b) => Math.round((d.z + v) / b) * b - d.z
    : r === 1 ? (v, b) => d.x - Math.round((d.x - v) / b) * b
    : r === 2 ? (v, b) => d.z - Math.round((d.z - v) / b) * b
    : (v, b) => Math.round((d.x + v) / b) * b - d.x;
  return { sx, sz };
}

/**
 * A facade of one material on one grid. box() places a wall whose edges sit on grid lines; Y(k) is the local height of the
 * k-th floor line, counted from the first line at or above the ground, so window rows always start and end whole.
 */
export class Facade {
  constructor(d, b, mat) {
    this.d = d; this.b = b;
    this.mat = facId(mat);
    const info = FACADE_INFO[this.mat] || { bay: 3.6, floor: 3.9 };
    this.bay = info.bay; this.fh = info.floor;
    const g = grid(d);
    this.g = g;
    const base = d.y ?? 0;
    this.y0 = Math.ceil(base / this.fh - 1e-6) * this.fh - base;
  }
  X(v) { return this.g.sx(v, this.bay); }
  Z(v) { return this.g.sz(v, this.bay); }
  /** Local height of floor line k (k = 0 is the first line above the ground). */
  Y(k) { return this.y0 + k * this.fh; }
  /** Floors that fit between local heights a and b. */
  floors(h) { return Math.max(1, Math.floor((h - this.y0) / this.fh)); }
  /** Facade wall between two local corners, snapped to the grid. Returns the snapped [x0, z0, x1, z1]. */
  wall(x0, z0, x1, z1, ya, yb, mat = this.mat, o) {
    let a = this.X(Math.min(x0, x1)), c = this.X(Math.max(x0, x1)), e = this.Z(Math.min(z0, z1)), f = this.Z(Math.max(z0, z1));
    if (c - a < this.bay * 0.9) c = a + this.bay;
    if (f - e < this.bay * 0.9) f = e + this.bay;
    this.b.box(a, ya, e, c, yb, f, mat, o);
    return [a, e, c, f];
  }
}

export const TOWER_GLASS = ['FAC_CURTAIN_TEAL', 'FAC_CURTAIN_DARK', 'FAC_CURTAIN_BLUE', 'FAC_CURTAIN_BRONZE', 'FAC_CURTAIN_SILVER', 'FAC_CURTAIN_GREEN', 'FAC_RIBBON_WHITE', 'FAC_RIBBON_DARK'];
export const TOWER_STONE = ['FAC_PIER_LIME', 'FAC_PIER_DARK', 'FAC_PUNCH_SAND', 'FAC_RIBBON_STONE', 'FAC_GRID_CONCRETE'];
export const ACCENTS = [M.STEEL_DARK, M.BLACK_METAL, M.STEEL, M.GRANITE, M.STONE_DARK, M.STEEL_BRIGHT];

/** Plain box with a slim roof slab and (at fine detail) a parapet, at the top of a wall. */
export function roofCap(b, x0, z0, x1, z1, y, accent, o = {}) {
  b.box(x0 - 0.1, y, z0 - 0.1, x1 + 0.1, y + 0.5, z1 + 0.1, o.roof ?? M.CONCRETE_DARK);
  parapet(b, x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, y + 0.5, o.ph ?? 1.1, 0.45, accent, { md: 1.5 });
}

/** Rooftop machinery: a few boxes and, sometimes, a cooling unit or a water tank. Fine detail only. */
export function rooftop(b, rng, x0, z0, x1, z1, y, n = 4) {
  const w = x1 - x0, d = z1 - z0;
  for (let i = 0; i < n; i++) {
    const sx = rng.range(2, 6), sz = rng.range(2, 5), sy = rng.range(1.2, 3.6);
    const cx = x0 + 1 + rng.next() * Math.max(0.1, w - 2 - sx), cz = z0 + 1 + rng.next() * Math.max(0.1, d - 2 - sz);
    b.box(cx, y, cz, cx + sx, y + sy, cz + sz, pick(rng, [M.STEEL, M.CONCRETE_PANEL, M.STEEL_DARK, M.CLADDING_GRAY]), { md: 3 });
    if (rng.chance(0.4)) b.cyl('y', cx + sx / 2, cz + sz / 2, Math.min(sx, sz) * 0.3, Math.min(sx, sz) * 0.3, y + sy, y + sy + 0.8, M.STEEL_BRIGHT, { md: 1 });
  }
}

/** Slim mast with a flashing aviation light on top. Vanishes at coarse detail, where it would only be a fat column. */
export function mast(b, cx, cz, y, len, r = 0.35) {
  b.cyl('y', cx, cz, r, r * 0.4, y, y + len, M.STEEL, { md: 1 });
  b.box(cx - 0.5, y + len, cz - 0.5, cx + 0.5, y + len + 1.0, cz + 0.5, M.BEACON_RED, { md: 1 });
}

/**
 * Crown of a tower. x0..x1, z0..z1 is the roof footprint at height y; h is the tower height, which scales the ornament.
 * kinds: flat, mast, spire, pyramid, slant, halo, stepped, helipad, crownlit.
 */
export function crown(b, rng, kind, T, x0, z0, x1, z1, y, h, accent, wall) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const fh = T.fh;
  roofCap(b, x0, z0, x1, z1, y, accent);
  switch (kind) {
    case 'mast':
      rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y + 0.5, 3);
      b.box(cx - w * 0.2, y + 0.5, cz - d * 0.2, cx + w * 0.2, y + 0.5 + fh * 1.6, cz + d * 0.2, wall);
      mast(b, cx, cz, y + 0.5 + fh * 1.6, Math.min(70, 14 + h * 0.12), 0.5);
      break;
    case 'spire': {
      let sy = y + 0.5, sw = w * 0.74, sd = d * 0.74;
      for (let k = 0; k < 3; k++) {
        const sh = fh * (1.6 - k * 0.3);
        T.wall(cx - sw / 2, cz - sd / 2, cx + sw / 2, cz + sd / 2, sy, sy + sh, T.mat);
        b.box(cx - sw / 2 - 0.2, sy + sh, cz - sd / 2 - 0.2, cx + sw / 2 + 0.2, sy + sh + 0.4, cz + sd / 2 + 0.2, accent, { md: 2 });
        sy += sh + 0.4; sw *= 0.66; sd *= 0.66;
      }
      const L = Math.min(110, 20 + h * 0.18);
      b.cyl('y', cx, cz, Math.min(sw, sd) * 0.42, 0.15, sy, sy + L, M.STEEL_BRIGHT, { md: 8 });
      b.box(cx - 0.5, sy + L, cz - 0.5, cx + 0.5, sy + L + 1.2, cz + 0.5, M.BEACON_RED, { md: 8 });
      break;
    }
    case 'pyramid': {
      const ph = Math.min(w, d) * 0.62;
      b.hip(x0, z0, x1, z1, y + 0.5, ph, pick(rng, [M.GLASS_TEAL, M.ROOF_COPPER, M.GLASS_DARK, M.GLASS_BLUE]), { md: 12 });
      b.cyl('y', cx, cz, 0.4, 0.12, y + 0.5 + ph, y + 0.5 + ph + Math.min(40, h * 0.1), M.STEEL, { md: 1 });
      break;
    }
    case 'slant': {
      const rh = Math.min(w, d) * 0.5;
      const dir = pick(rng, ['+z', '-z', '+x', '-x']);
      b.wedge(x0, y + 0.5, z0, x1, y + 0.5 + rh, z1, dir, pick(rng, [M.GLASS_TEAL, M.GLASS_DARK, M.GLASS_SLATE, M.GLASS_BLUE]));
      mast(b, cx, cz, y + 0.5 + rh, 14 + h * 0.06, 0.3);
      break;
    }
    case 'halo': {
      const hy = y + 0.5 + fh * 1.2;
      for (const [px, pz] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) b.box(px - 0.5, y + 0.5, pz - 0.5, px + 0.5, hy, pz + 0.5, accent, { md: 3 });
      b.box(x0 + 0.5, hy, z0 + 0.5, x1 - 0.5, hy + 0.7, z0 + 1.5, accent, { md: 6 });
      b.box(x0 + 0.5, hy, z1 - 1.5, x1 - 0.5, hy + 0.7, z1 - 0.5, accent, { md: 6 });
      b.box(x0 + 0.5, hy, z0 + 1.5, x0 + 1.5, hy + 0.7, z1 - 1.5, accent, { md: 6 });
      b.box(x1 - 1.5, hy, z0 + 1.5, x1 - 0.5, hy + 0.7, z1 - 1.5, accent, { md: 6 });
      b.box(x0 + 0.5, hy + 0.7, z0 + 0.5, x1 - 0.5, hy + 1.0, z0 + 0.8, M.NEON_WHITE, { md: 8 });
      b.box(x0 + 0.5, hy + 0.7, z1 - 0.8, x1 - 0.5, hy + 1.0, z1 - 0.5, M.NEON_WHITE, { md: 8 });
      mast(b, cx, cz, y + 0.5, 22 + h * 0.05, 0.4);
      break;
    }
    case 'stepped': {
      let sy = y + 0.5, sw = w, sd = d;
      for (let k = 0; k < 3; k++) {
        sw -= T.bay * 2; sd -= T.bay * 2;
        if (sw < T.bay * 1.5 || sd < T.bay * 1.5) break;
        const sh = fh * (2 - k * 0.4);
        T.wall(cx - sw / 2, cz - sd / 2, cx + sw / 2, cz + sd / 2, sy, sy + sh, T.mat);
        b.box(cx - sw / 2 - 0.2, sy + sh, cz - sd / 2 - 0.2, cx + sw / 2 + 0.2, sy + sh + 0.5, cz + sd / 2 + 0.2, k === 2 ? M.NEON_WHITE : accent, { md: 2 });
        sy += sh + 0.5;
      }
      mast(b, cx, cz, sy, 18 + h * 0.07, 0.4);
      break;
    }
    case 'helipad': {
      b.cyl('y', cx, cz, Math.min(w, d) * 0.36, Math.min(w, d) * 0.36, y + 0.5, y + 0.8, M.CONCRETE, { md: 8 });
      b.cyl('y', cx, cz, Math.min(w, d) * 0.3, Math.min(w, d) * 0.3, y + 0.8, y + 0.9, M.SIGN_YELLOW, { md: 4 });
      b.cyl('y', cx, cz, Math.min(w, d) * 0.26, Math.min(w, d) * 0.26, y + 0.9, y + 1.0, M.CONCRETE_DARK, { md: 4 });
      b.box(cx - 2.2, y + 1.0, cz - 0.3, cx + 2.2, y + 1.06, cz + 0.3, M.NEON_WHITE, { md: 2 });
      rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y + 0.5, 2);
      mast(b, x1 - 3, z1 - 3, y + 0.5, 16, 0.3);
      break;
    }
    case 'crownlit': {
      b.box(x0 - 0.2, y + 0.5, z0 - 0.2, x1 + 0.2, y + 1.5, z1 + 0.2, M.NEON_WHITE, { md: 12 });
      rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y + 1.5, 3);
      mast(b, cx, cz, y + 1.5, 24 + h * 0.08, 0.5);
      break;
    }
    default: // flat
      rooftop(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y + 0.5, Math.max(3, Math.round((w * d) / 260)));
      b.box(cx - w * 0.16, y + 0.5, cz - d * 0.16, cx + w * 0.16, y + 0.5 + fh * 1.3, cz + d * 0.16, wall);
      mast(b, cx + w * 0.08, cz, y + 0.5 + fh * 1.3, 12 + h * 0.05, 0.4);
  }
}

export { foundation, pick };
