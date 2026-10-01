import { Volume } from './volume.js';
import { meshVolume, MeshBuilder } from './mesher.js';
import { M } from './palette.js';
import { Noise } from '../core/noise.js';
import { hash2, hashUnit } from '../core/util.js';

/* A Recipe is an ordered list of shape ops in meters (y up) that can be rasterized at any voxel size.
   Later ops overwrite earlier ones; material 0 carves. Rotations are multiples of 90 degrees about +Y so every
   op stays axis aligned. Voxels are world-aligned: voxel i covers [i*cell, (i+1)*cell) and is sampled at its
   center, or conservatively (any overlap) when requested. */

const noiseCache = new Map();
const noiseFor = (seed) => {
  let n = noiseCache.get(seed);
  if (!n) { n = new Noise(seed); noiseCache.set(seed, n); }
  return n;
};

/* Transforms are a translation plus a rotation about +Y by `ang` radians (quarter turns stay exact). */
const snapc = (v) => (Math.abs(v) < 1e-9 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-9 ? Math.sign(v) : v);
function fwd(ang, x, z) {
  const c = snapc(Math.cos(ang)), s = snapc(Math.sin(ang));
  return [x * c - z * s, x * s + z * c];
}
function composeXf(p, c) {
  const [tx, tz] = fwd(p.ang, c.tx, c.tz);
  return { tx: tx + p.tx, ty: c.ty + p.ty, tz: tz + p.tz, ang: p.ang + c.ang };
}
const IDENT = { tx: 0, ty: 0, tz: 0, ang: 0 };
const QUARTER = Math.PI / 2;

export class Recipe {
  constructor() { this.ops = []; }

  _push(op, o) {
    if (o) {
      if (o.md !== undefined) op.md = o.md;
      if (o.mn !== undefined) op.mn = o.mn;
      if (o.bb !== undefined) op.bb = o.bb;
      if (o.thin) op.thin = true;
    }
    this.ops.push(op);
    return this;
  }

  box(x0, y0, z0, x1, y1, z1, m, o) {
    return this._push({ t: 'box', x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), m }, o);
  }
  /** Box from footprint center and size. */
  slab(cx, cz, w, d, y0, y1, m, o) { return this.box(cx - w / 2, y0, cz - d / 2, cx + w / 2, y1, cz + d / 2, m, o); }
  carve(x0, y0, z0, x1, y1, z1, o) { return this.box(x0, y0, z0, x1, y1, z1, 0, o); }
  ell(cx, cy, cz, rx, ry, rz, m, o) { return this._push({ t: 'ell', cx, cy, cz, rx, ry, rz, m }, o); }
  /** Axis-aligned cylinder or frustum. c1,c2 are the center in the two other axes (y: x,z | x: y,z | z: x,y). */
  cyl(axis, c1, c2, r0, r1, a0, a1, m, o) { return this._push({ t: 'cyl', axis, c1, c2, r0, r1, a0, a1, m }, o); }
  gable(x0, z0, x1, z1, y0, h, ridgeAxis, m, o) { return this._push({ t: 'gable', x0, z0, x1, z1, y0, h, axis: ridgeAxis, m }, o); }
  hip(x0, z0, x1, z1, y0, h, m, o) { return this._push({ t: 'hip', x0, z0, x1, z1, y0, h, m }, o); }
  /** Shed/lean-to: top rises along dir ('+x','-x','+z','-z') from y0 at the low side to y1 at the high side. */
  wedge(x0, y0, z0, x1, y1, z1, dir, m, o) { return this._push({ t: 'wedge', x0, y0, z0, x1, y1, z1, dir, m }, o); }
  /** Lofted body along an axis. stations: [{a, c1, c2, r1, r2, n?}] with superellipse exponent n (2 = ellipse). */
  loft(axis, stations, m, o) { return this._push({ t: 'loft', axis, st: stations.slice().sort((p, q) => p.a - q.a), m }, o); }
  /** Airfoil wing. root = leading edge point at the wing root; side +1 (right, +z) or -1 (left, -z). */
  wing(root, span, chordRoot, chordTip, sweep, dihedral, thickRoot, thickTip, side, m, o) {
    return this._push({ t: 'wing', rx: root[0], ry: root[1], rz: root[2], span, cr: chordRoot, ct: chordTip, sweep, dih: dihedral, tr: thickRoot, tt: thickTip, side, m }, o);
  }
  /** Noisy ellipsoid for foliage and rocks. */
  blob(cx, cy, cz, rx, ry, rz, m, seed = 1, rough = 0.3, m2 = 0, mixf = 0.35, o) {
    return this._push({ t: 'blob', cx, cy, cz, rx, ry, rz, m, seed, rough, m2, mixf }, o);
  }
  /** Arbitrary per-voxel function over an AABB (meters). fn(lx, ly, lz, cell) returns material or 0 to skip. */
  fn(x0, y0, z0, x1, y1, z1, fn, o) { return this._push({ t: 'fn', x0, y0, z0, x1, y1, z1, fn }, o); }
  /** Recolor voxels that are already solid: fn(lx, ly, lz, cell) returns a material or 0 to keep. Ops before it define the shape. */
  paint(x0, y0, z0, x1, y1, z1, fn, o) { return this._push({ t: 'paint', x0, y0, z0, x1, y1, z1, fn }, o); }

  /**
   * Window pattern on the faces of a building box. Modifies voxels that are already solid in the outer layer.
   * opts: sides ('xz' | '+x' etc as array), floorH, winW, winH, sill, bay, glass (array of mats), lit, seed,
   * style ('punched' | 'curtain' | 'ribbon'), ground (height of ground zone), groundGlass, corner, coarse, mullion.
   */
  facade(x0, y0, z0, x1, y1, z1, opts, o) {
    const f = Object.assign({
      sides: ['+x', '-x', '+z', '-z'], floorH: 3.6, winW: 1.4, winH: 1.8, sill: 0.9, bay: 3.2, glass: [M.GLASS_SLATE],
      lit: 0.25, seed: 1, style: 'punched', recess: true, ground: 0, groundGlass: 0, corner: 1.2, coarse: 0, mullion: 0, frame: 0, top: 1.5,
    }, opts);
    const t = f.thick || 0;
    const sides = f.sides;
    for (const side of sides) {
      const horiz = side[1] === 'x'; // wall normal along x => u runs along z
      const pos = side[0] === '+';
      let ax0 = x0, az0 = z0, ax1 = x1, az1 = z1;
      const slab = t || 0.5;
      if (horiz) { if (pos) ax0 = x1 - slab; else ax1 = x0 + slab; } else { if (pos) az0 = z1 - slab; else az1 = z0 + slab; }
      const uMin = horiz ? z0 : x0, uMax = horiz ? z1 : x1;
      const fnp = (lx, ly, lz, cell) => {
        const face = horiz ? (pos ? x1 : x0) : (pos ? z1 : z0);
        const c = horiz ? lx : lz;
        const inward = pos ? face - c : c - face;
        const recess = f.recess && cell <= 0.6;
        if (inward < -1e-6 || inward > (recess ? 2 * cell : cell) + 1e-6) return 0;
        const layer = inward < cell ? 0 : 1;
        const u = horiz ? lz : lx;
        if (u - uMin < f.corner || uMax - u < f.corner) return 0;
        const y = ly - y0;
        if (y > (y1 - y0) - f.top) return 0;
        const coarse = f.coarse && cell > f.winW * 0.75;
        const bayIdx = Math.floor((u - uMin) / f.bay);
        const bx = (u - uMin) - bayIdx * f.bay;
        let win = false;
        let mat = 0;
        if (f.ground && y < f.ground) {
          const gg = f.groundGlass || f.glass[0];
          if (y > 0.45 && y < f.ground - 0.5 && bx > 0.35 && bx < f.bay - 0.35) mat = coarse ? f.coarse : gg;
          else return 0;
        } else {
          const yy = y - f.ground;
          const fl = Math.floor(yy / f.floorH);
          const ly2 = yy - fl * f.floorH;
          if (f.style === 'curtain') {
            win = ly2 > 0.7 && ly2 < f.floorH - 0.05;
            if (win && f.mullion && (((u - uMin) % f.mullion) < Math.max(0.12, cell * 0.5))) return layer === 0 ? f.frame || 0 : 0;
          } else if (f.style === 'ribbon') {
            win = ly2 > f.sill && ly2 < f.sill + f.winH && bx > 0.5 && bx < f.bay - 0.5;
          } else {
            win = ly2 > f.sill && ly2 < f.sill + f.winH && bx > (f.bay - f.winW) / 2 && bx < (f.bay + f.winW) / 2;
          }
          if (!win) return 0;
          if (coarse) mat = f.coarse;
          else {
            const h = hashUnit(hash2(fl * 131 + bayIdx * 7 + (horiz ? 1 : 0) * 977, bayIdx + fl * 3, f.seed));
            if (h < f.lit) mat = h < f.lit * 0.5 ? M.WINDOW_LIT : h < f.lit * 0.8 ? M.WINDOW_LIT_DIM : M.WINDOW_LIT_COOL;
            else mat = f.glass[Math.floor(hashUnit(hash2(bayIdx, fl, f.seed + 5)) * f.glass.length) % f.glass.length];
          }
        }
        if (recess) return layer === 0 ? -1 : mat;
        return layer === 0 ? mat : 0;
      };
      const bb = (cell) => {
        const d = Math.max(slab, (f.recess && cell <= 0.6 ? cell * 2 : cell * 0.5) + 0.02);
        return horiz
          ? [pos ? x1 - d : x0, y0, z0, pos ? x1 : x0 + d, y1, z1]
          : [x0, y0, pos ? z1 - d : z0, x1, y1, pos ? z1 : z0 + d];
      };
      this.fn(ax0, y0, az0, ax1, y1, az1, fnp, Object.assign({}, o, { bb }));
    }
    return this;
  }

  /** Copy another recipe in at a translation and 90-degree rotation. */
  stamp(other, tx = 0, ty = 0, tz = 0, rot = 0, o) {
    const p = { tx, ty, tz, ang: (rot & 3) * QUARTER };
    for (const op of other.ops) {
      const c = Object.assign({}, op);
      c.xf = composeXf(p, op.xf || IDENT);
      if (o) { if (o.md !== undefined) c.md = Math.min(c.md ?? Infinity, o.md); if (o.mn !== undefined) c.mn = o.mn; }
      this.ops.push(c);
    }
    return this;
  }

  /** Local-space AABB of all ops passing the detail filter. */
  bounds(cell = 0) {
    let b = null;
    for (const op of this.ops) {
      if (!passes(op, cell)) continue;
      const a = opAabb(op, cell);
      const w = transformAabb(a, op.xf || IDENT);
      if (!b) b = w.slice();
      else for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], w[i]); b[i + 3] = Math.max(b[i + 3], w[i + 3]); }
    }
    return b;
  }
}

function passes(op, cell) {
  if (op.md !== undefined && cell > op.md + 1e-9) return false;
  if (op.mn !== undefined && cell < op.mn - 1e-9) return false;
  return true;
}

function opAabb(op, cell = 0) {
  if (op.bb) return op.bb(cell);
  switch (op.t) {
    case 'box': case 'fn': case 'wedge': case 'paint': return [op.x0, op.y0, op.z0, op.x1, op.y1, op.z1];
    case 'ell': case 'blob': {
      const k = op.t === 'blob' ? 1 + op.rough + 0.05 : 1;
      return [op.cx - op.rx * k, op.cy - op.ry * k, op.cz - op.rz * k, op.cx + op.rx * k, op.cy + op.ry * k, op.cz + op.rz * k];
    }
    case 'cyl': {
      const r = Math.max(op.r0, op.r1);
      if (op.axis === 'y') return [op.c1 - r, op.a0, op.c2 - r, op.c1 + r, op.a1, op.c2 + r];
      if (op.axis === 'x') return [op.a0, op.c1 - r, op.c2 - r, op.a1, op.c1 + r, op.c2 + r];
      return [op.c1 - r, op.c2 - r, op.a0, op.c1 + r, op.c2 + r, op.a1];
    }
    case 'gable': return [op.x0, op.y0, op.z0, op.x1, op.y0 + op.h, op.z1];
    case 'hip': return [op.x0, op.y0, op.z0, op.x1, op.y0 + op.h, op.z1];
    case 'loft': {
      let a0 = 1e9, a1 = -1e9, lo1 = 1e9, hi1 = -1e9, lo2 = 1e9, hi2 = -1e9;
      for (const s of op.st) {
        a0 = Math.min(a0, s.a); a1 = Math.max(a1, s.a);
        lo1 = Math.min(lo1, s.c1 - s.r1); hi1 = Math.max(hi1, s.c1 + s.r1);
        lo2 = Math.min(lo2, s.c2 - s.r2); hi2 = Math.max(hi2, s.c2 + s.r2);
      }
      if (op.axis === 'x') return [a0, lo1, lo2, a1, hi1, hi2];
      if (op.axis === 'y') return [lo1, a0, lo2, hi1, a1, hi2];
      return [lo1, lo2, a0, hi1, hi2, a1];
    }
    case 'wing': {
      const z0 = op.rz, z1 = op.rz + op.side * op.span;
      const xmax = op.rx, xmin = op.rx - Math.max(op.cr, op.sweep + op.ct);
      const th = Math.max(op.tr * op.cr, op.tt * op.ct, cell * 0.5);
      const ylo = Math.min(op.ry, op.ry + op.dih) - th, yhi = Math.max(op.ry, op.ry + op.dih) + th;
      const xmaxAll = Math.max(op.rx, op.rx - op.sweep);
      return [Math.min(xmin, op.rx - op.sweep - op.ct), ylo, Math.min(z0, z1), Math.max(xmax, xmaxAll), yhi, Math.max(z0, z1)];
    }
    default: throw new Error('unknown op ' + op.t);
  }
}

function transformAabb(a, xf) {
  const c = [fwd(xf.ang, a[0], a[2]), fwd(xf.ang, a[3], a[5]), fwd(xf.ang, a[0], a[5]), fwd(xf.ang, a[3], a[2])];
  let x0 = 1e18, x1 = -1e18, z0 = 1e18, z1 = -1e18;
  for (const [x, z] of c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0 + xf.tx, a[1] + xf.ty, z0 + xf.tz, x1 + xf.tx, a[4] + xf.ty, z1 + xf.tz];
}

/** Membership test for a lofted body: (x, y, z) => boolean. e grows the shape (positive) or shrinks it (negative). */
export function loftTest(st, axis, e = 0) {
  st = st.slice().sort((p, q) => p.a - q.a);
  return (x, y, z) => {
    let a, p, q;
    if (axis === 'x') { a = x; p = y; q = z; } else if (axis === 'y') { a = y; p = x; q = z; } else { a = z; p = x; q = y; }
    if (a < st[0].a - e || a > st[st.length - 1].a + e) return false;
    let i = 0;
    while (i < st.length - 2 && a > st[i + 1].a) i++;
    const s0 = st[i], s1 = st[i + 1];
    const t = s1.a === s0.a ? 0 : Math.min(1, Math.max(0, (a - s0.a) / (s1.a - s0.a)));
    const c1 = s0.c1 + (s1.c1 - s0.c1) * t, c2 = s0.c2 + (s1.c2 - s0.c2) * t;
    const r1 = s0.r1 + (s1.r1 - s0.r1) * t + e, r2 = s0.r2 + (s1.r2 - s0.r2) * t + e;
    const n = (s0.n ?? 2) + ((s1.n ?? 2) - (s0.n ?? 2)) * t;
    if (r1 <= 0 || r2 <= 0) return false;
    const u = Math.abs(p - c1) / r1, v = Math.abs(q - c2) / r2;
    if (u > 1 || v > 1) return false;
    const d2 = u * u + v * v;
    if (n === 2) return d2 <= 1;
    if (n > 2 && d2 <= 1) return true;                            // inside the circle means inside any rounder-cornered section: no pow for most voxels
    return Math.pow(u, n) + Math.pow(v, n) <= 1;
  };
}

function makeTest(op, e, cell) {
  switch (op.t) {
    case 'box': return (x, y, z) => x >= op.x0 - e && x <= op.x1 + e && y >= op.y0 - e && y <= op.y1 + e && z >= op.z0 - e && z <= op.z1 + e;
    case 'ell': {
      const rx = op.rx + e, ry = op.ry + e, rz = op.rz + e;
      return (x, y, z) => { const a = (x - op.cx) / rx, b = (y - op.cy) / ry, c = (z - op.cz) / rz; return a * a + b * b + c * c <= 1; };
    }
    case 'blob': {
      const n = noiseFor(op.seed);
      const f = 1 / Math.max(0.5, Math.min(op.rx, op.rz) * 0.7);
      return (x, y, z) => {
        const a = (x - op.cx) / op.rx, b = (y - op.cy) / op.ry, c = (z - op.cz) / op.rz;
        const nv = n.n3(x * f, y * f, z * f);
        return Math.sqrt(a * a + b * b + c * c) <= 1 + op.rough * nv + e / Math.max(op.rx, 0.01);
      };
    }
    case 'cyl': {
      const { axis } = op;
      const len = op.a1 - op.a0 || 1;
      return (x, y, z) => {
        let a, p, q;
        if (axis === 'y') { a = y; p = x - op.c1; q = z - op.c2; } else if (axis === 'x') { a = x; p = y - op.c1; q = z - op.c2; } else { a = z; p = x - op.c1; q = y - op.c2; }
        if (a < op.a0 - e || a > op.a1 + e) return false;
        const t = Math.min(1, Math.max(0, (a - op.a0) / len));
        const r = op.r0 + (op.r1 - op.r0) * t + e;
        return p * p + q * q <= r * r;
      };
    }
    case 'gable': {
      const hz = op.axis === 'x'; // ridge along x, cross-section across z
      const lo = hz ? op.z0 : op.x0, hi = hz ? op.z1 : op.x1;
      const mid = (lo + hi) / 2, half = (hi - lo) / 2;
      return (x, y, z) => {
        if (x < op.x0 - e || x > op.x1 + e || z < op.z0 - e || z > op.z1 + e || y < op.y0 - e) return false;
        const c = hz ? z : x;
        const top = op.y0 + op.h * (1 - Math.abs(c - mid) / half);
        return y <= top + e;
      };
    }
    case 'hip': {
      const hx = (op.x1 - op.x0) / 2, hzz = (op.z1 - op.z0) / 2, k = Math.min(hx, hzz);
      return (x, y, z) => {
        if (y < op.y0 - e || y > op.y0 + op.h + e) return false;
        const inset = Math.max(0, Math.min(1, (y - op.y0) / op.h)) * k;
        return x >= op.x0 + inset - e && x <= op.x1 - inset + e && z >= op.z0 + inset - e && z <= op.z1 - inset + e;
      };
    }
    case 'wedge': {
      return (x, y, z) => {
        if (x < op.x0 - e || x > op.x1 + e || z < op.z0 - e || z > op.z1 + e || y < op.y0 - e) return false;
        let f;
        switch (op.dir) {
          case '+x': f = (x - op.x0) / (op.x1 - op.x0); break;
          case '-x': f = (op.x1 - x) / (op.x1 - op.x0); break;
          case '+z': f = (z - op.z0) / (op.z1 - op.z0); break;
          default: f = (op.z1 - z) / (op.z1 - op.z0);
        }
        f = Math.min(1, Math.max(0, f));
        return y <= op.y0 + (op.y1 - op.y0) * f + e;
      };
    }
    case 'loft': return loftTest(op.st, op.axis, e);
    case 'wing': {
      const s = op.side;
      return (x, y, z) => {
        const t = ((z - op.rz) * s) / op.span;
        if (t < -e / op.span || t > 1 + e / op.span) return false;
        const tt = Math.min(1, Math.max(0, t));
        const chord = op.cr + (op.ct - op.cr) * tt;
        const le = op.rx - op.sweep * tt;
        const u = (le - x) / chord;
        if (u < -e / chord || u > 1 + e / chord) return false;
        const uu = Math.min(1, Math.max(0, u));
        const tc = op.tr + (op.tt - op.tr) * tt;
        const half = 5 * tc * chord * (0.2969 * Math.sqrt(uu) - 0.126 * uu - 0.3516 * uu * uu + 0.2843 * uu * uu * uu - 0.1015 * uu * uu * uu * uu);
        const yc = op.ry + op.dih * tt;
        return Math.abs(y - yc) <= Math.max(half, cell * 0.5) + e;
      };
    }
    case 'fn': return (x, y, z) => op.fn(x, y, z, cell) !== 0;
    case 'paint': return () => false;
    default: throw new Error('no test for ' + op.t);
  }
}

/**
 * Rasterize a recipe into a world-aligned Volume.
 * o: { cell, anchor:[x,y,z], rot, conservative, clip:[x0,y0,z0,x1,y1,z1] world meters }
 * Returns { vol, cell, i0, j0, k0 } (cell coordinates of the volume's min corner in the global lattice) or null.
 */
export function rasterize(recipe, o) {
  const cell = o.cell;
  const anchor = o.anchor || [0, 0, 0];
  const S = { tx: anchor[0], ty: anchor[1], tz: anchor[2], ang: ((o.rot || 0) & 3) * QUARTER + (o.yaw || 0) };
  const cons = !!o.conservative;
  const e = cons ? cell * 0.5 : 0;
  const prepared = [];
  let ux0 = 1e18, uy0 = 1e18, uz0 = 1e18, ux1 = -1e18, uy1 = -1e18, uz1 = -1e18;
  for (const op of recipe.ops) {
    if (!passes(op, cell)) continue;
    const F = composeXf(S, op.xf || IDENT);
    const wa = transformAabb(opAabb(op, cell), F);
    if (op.thin && !cons) { const h = cell * 0.5; wa[0] -= h; wa[1] -= h; wa[2] -= h; wa[3] += h; wa[4] += h; wa[5] += h; }
    prepared.push({ op, F, wa });
    ux0 = Math.min(ux0, wa[0]); uy0 = Math.min(uy0, wa[1]); uz0 = Math.min(uz0, wa[2]);
    ux1 = Math.max(ux1, wa[3]); uy1 = Math.max(uy1, wa[4]); uz1 = Math.max(uz1, wa[5]);
  }
  if (!prepared.length) return null;
  if (o.clip) {
    ux0 = Math.max(ux0, o.clip[0]); uy0 = Math.max(uy0, o.clip[1]); uz0 = Math.max(uz0, o.clip[2]);
    ux1 = Math.min(ux1, o.clip[3]); uy1 = Math.min(uy1, o.clip[4]); uz1 = Math.min(uz1, o.clip[5]);
  }
  const i0 = Math.floor(ux0 / cell + 1e-9), j0 = Math.floor(uy0 / cell + 1e-9), k0 = Math.floor(uz0 / cell + 1e-9);
  const i1 = Math.ceil(ux1 / cell - 1e-9), j1 = Math.ceil(uy1 / cell - 1e-9), k1 = Math.ceil(uz1 / cell - 1e-9);
  const nx = i1 - i0, ny = j1 - j0, nz = k1 - k0;
  if (nx <= 0 || ny <= 0 || nz <= 0) return null;
  if (nx * ny * nz > (o.maxCells || 48e6)) return null;
  const vol = new Volume(nx, ny, nz);
  const data = vol.data;

  for (const { op, F, wa } of prepared) {
    const m = op.m ?? 0;
    const oc = cons || !!op.thin;
    const eo = oc ? cell * 0.5 : 0;
    // world voxel index range of this op
    let a0, a1, b0, b1, c0, c1;
    if (oc) {
      a0 = Math.floor(wa[0] / cell - 1e-9); a1 = Math.ceil(wa[3] / cell + 1e-9) - 1;
      b0 = Math.floor(wa[1] / cell - 1e-9); b1 = Math.ceil(wa[4] / cell + 1e-9) - 1;
      c0 = Math.floor(wa[2] / cell - 1e-9); c1 = Math.ceil(wa[5] / cell + 1e-9) - 1;
    } else {
      a0 = Math.ceil(wa[0] / cell - 0.5 - 1e-9); a1 = Math.ceil(wa[3] / cell - 0.5 - 1e-9) - 1;
      b0 = Math.ceil(wa[1] / cell - 0.5 - 1e-9); b1 = Math.ceil(wa[4] / cell - 0.5 - 1e-9) - 1;
      c0 = Math.ceil(wa[2] / cell - 0.5 - 1e-9); c1 = Math.ceil(wa[5] / cell - 0.5 - 1e-9) - 1;
    }
    a0 = Math.max(a0, i0); a1 = Math.min(a1, i1 - 1);
    b0 = Math.max(b0, j0); b1 = Math.min(b1, j1 - 1);
    c0 = Math.max(c0, k0); c1 = Math.min(c1, k1 - 1);
    if (a1 < a0 || b1 < b0 || c1 < c0) continue;
    const cs = snapc(Math.cos(F.ang)), sn = snapc(Math.sin(F.ang));
    const axisAligned = sn === 0 || cs === 0;
    if (op.t === 'box' && axisAligned) {
      vol.fillBox(a0 - i0, b0 - j0, c0 - k0, a1 - i0 + 1, b1 - j0 + 1, c1 - k0 + 1, m);
      continue;
    }
    const opCopy = op;
    const test = makeTest(opCopy, eo, cell);
    const R = { ia: cs, ib: sn, ic: -sn, id: cs };
    const isFn = op.t === 'fn';
    const isPaint = op.t === 'paint';
    const isBlob = op.t === 'blob';
    for (let k = c0; k <= c1; k++) {
      const wz = (k + 0.5) * cell - F.tz;
      for (let j = b0; j <= b1; j++) {
        const ly = (j + 0.5) * cell - F.ty;
        let di = vol.index(a0 - i0, j - j0, k - k0);
        for (let i = a0; i <= a1; i++, di++) {
          const wx = (i + 0.5) * cell - F.tx;
          const lx = R.ia * wx + R.ib * wz, lz = R.ic * wx + R.id * wz;
          if (isPaint) {
            if (data[di]) { const r = op.fn(lx, ly, lz, cell); if (r > 0) data[di] = r; }
          } else if (isFn) {
            const r = op.fn(lx, ly, lz, cell);
            if (r === -1) data[di] = 0;
            else if (r) data[di] = r;
          } else if (test(lx, ly, lz)) {
            if (isBlob && op.m2 && noiseFor(op.seed + 7).n3(lx * 1.7, ly * 1.7, lz * 1.7) > 1 - op.mixf * 2) data[di] = op.m2;
            else data[di] = m;
          }
        }
      }
    }
  }
  return { vol, cell, i0, j0, k0 };
}

/** Rasterize and mesh in one step. Mesh vertices are in cells relative to (i0, j0, k0). */
export function meshRecipe(recipe, o) {
  const r = rasterize(recipe, o);
  if (!r) return null;
  if (o.remap) { const d = r.vol.data, t = o.remap; for (let i = 0; i < d.length; i++) d[i] = t[d[i]]; }
  const mesh = meshVolume(r.vol, { ao: o.ao !== false });
  mesh.i0 = r.i0; mesh.j0 = r.j0; mesh.k0 = r.k0; mesh.cell = r.cell;
  mesh.dims = [r.vol.nx, r.vol.ny, r.vol.nz];
  return mesh;
}

export { MeshBuilder };
