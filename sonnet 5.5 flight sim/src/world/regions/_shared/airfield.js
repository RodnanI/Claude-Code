import { M } from '../../../voxel/palette.js';
import { GLYPHS } from '../../../voxel/glyphs.js';
import { hash2, hashUnit, smoothstep } from '../../../core/util.js';

/* Airfield geometry and surface painting. An airfield has a local frame: u runs along the primary runway heading,
   v runs to the right of it (clockwise). Heading is in degrees from north. The frame maps to the world as
     x = cx + u sin h + v cos h,   z = cz - u cos h + v sin h        (world +z is south)
   Everything painted here is analytic, a pure function of position, so it costs nothing to store and is identical at every
   level of detail: pavement, markings, rubber, patches, slab joints, oil, lettering (as a 5x7 bitmap font) and rounded taxi
   routes. Small marks are only painted where the voxels are small enough to carry them (`cell` is the voxel size in meters). */

const n2 = (i, j, seed) => hashUnit(hash2(i, j, seed));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const D2R = Math.PI / 180;

/** Rounded polyline: corners are replaced by arcs of radius r (shortened where the legs are short). Returns [[u, v], ...]. */
export function roundedPath(pts, r) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    let ax = p0[0] - p1[0], ay = p0[1] - p1[1], bx = p2[0] - p1[0], by = p2[1] - p1[1];
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    ax /= la; ay /= la; bx /= lb; by /= lb;
    const theta = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by)));
    if (theta > Math.PI - 1e-3 || theta < 1e-3) { out.push(p1.slice()); continue; }
    const tn = Math.tan(theta / 2);
    const t = Math.min(r / tn, la * (i === 1 ? 0.95 : 0.5), lb * (i === pts.length - 2 ? 0.95 : 0.5));
    const rr = t * tn;
    const t1 = [p1[0] + ax * t, p1[1] + ay * t], t2 = [p1[0] + bx * t, p1[1] + by * t];
    let mx = ax + bx, my = ay + by;
    const lm = Math.hypot(mx, my); mx /= lm; my /= lm;
    const k = rr / Math.sin(theta / 2);
    const c = [p1[0] + mx * k, p1[1] + my * k];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    let sweep = Math.atan2(t2[1] - c[1], t2[0] - c[0]) - a1;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    const n = Math.max(2, Math.ceil((Math.abs(sweep) * rr) / 5));
    for (let s = 0; s <= n; s++) { const a = a1 + (sweep * s) / n; out.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]); }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

export class Airfield {
  constructor({ cx, cz, heading }) {
    this.cx = cx; this.cz = cz;
    this.headingDeg = heading;
    this.h = (heading * Math.PI) / 180;
    this.s = Math.sin(this.h); this.c = Math.cos(this.h);
    this.runways = [];
    this.taxiways = [];
    this.routes = [];
    this.aprons = [];
    this.pads = [];
    this.strips = [];
    this.marks = [];
    this.helipads = [];
    this.stands = [];
    this.fillets = [];
    this.lots = [];
    this._grid = null;
  }
  toWorld(u, v) { return [this.cx + u * this.s + v * this.c, this.cz - u * this.c + v * this.s]; }
  /** A circle where the scatter grows nothing (see world/scatter): the region lists these in `clearings`. */
  clearing(u, v, r) { const [x, z] = this.toWorld(u, v); return { x, z, r }; }
  toLocal(x, z) {
    const dx = x - this.cx, dz = z - this.cz;
    return [dx * this.s - dz * this.c, dx * this.c + dz * this.s];
  }
  /** Yaw for a structure whose local +z front should face a direction in the airfield frame. */
  yaw(facing = 'right') {
    const base = this.h - Math.PI / 2;
    return base + ({ right: 0, left: Math.PI, ahead: -Math.PI / 2, behind: Math.PI / 2 }[facing] ?? 0);
  }
  get propYaw() { return Math.PI / 2 - this.h; }
  /** Yaw of a prop (local +x is its front) that faces a direction given in degrees clockwise from the runway heading. */
  propYawAt(deg) { return Math.PI / 2 - this.h - deg * D2R; }
  /** Compass heading in degrees of a direction given clockwise from the runway heading. */
  compass(deg) { return (((this.headingDeg + deg) % 360) + 360) % 360; }
  place(ctx, out, kind, u, v, w, d, h, facing, seed = 1, style = undefined, extra = {}) {
    const [x, z] = this.toWorld(u, v);
    out.structures.push(ctx.kit(kind, { x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, w, d, h, rot: 0, yaw: typeof facing === 'number' ? this.h - Math.PI / 2 + facing * D2R : this.yaw(facing), seed, style, ...extra }));
  }
  prop(out, type, u, v, opts = {}) {
    const [x, z] = this.toWorld(u, v);
    out.props.push({ type, x, z, yaw: this.propYaw, scale: 1, ...opts });
  }
  road(out, u0, v0, u1, v1, kind = 'service') {
    const [ax, az] = this.toWorld(u0, v0), [bx, bz] = this.toWorld(u1, v1);
    out.roads.push({ ax, az, bx, bz, kind });
  }
  /** World rectangle enclosing a local rectangle (for region bounds). */
  worldBounds(u0, v0, u1, v1, pad = 0) {
    const pts = [this.toWorld(u0, v0), this.toWorld(u1, v0), this.toWorld(u0, v1), this.toWorld(u1, v1)];
    return [Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad];
  }
  /**
   * A mown grass lot covering a local rectangle, for `out.lots`. Ordinary lots rank below roads and pavement, so it only
   * fills the ground between them, and keeps natural woodland out of the airfield.
   */
  fieldLot(u0, v0, u1, v1) {
    const [x0, z0, x1, z1] = this.worldBounds(u0, v0, u1, v1, 0);
    return {
      x0, z0, x1, z1, mat: M.MOWN_STRIP,
      fn: (x, z, cell) => {
        const [u, v] = this.toLocal(x, z);
        if (u < u0 || u > u1 || v < v0 || v > v1) return 0;
        return cell <= 1 && (Math.floor(v / 12) & 1) ? M.LAWN : M.MOWN_STRIP;
      },
    };
  }
  /** Terrain flatten rect in world terms. */
  flattenRect(u0, u1, v0, v1, blend, y, extra = {}) {
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const [wx, wz] = this.toWorld(cu, cv);
    return { type: 'rect', cx: wx, cz: wz, hw: Math.abs(u1 - u0) / 2, hd: Math.abs(v1 - v0) / 2, rot: this.h - Math.PI / 2, blend, y, order: 8, ...extra };
  }

  // ------------------------------------------------------------------ description
  /**
   * A runway. marks: { west, east } designators such as '09R' (west is the u0 end). displaced and blast are lengths in meters per
   * end: a displaced threshold is usable for takeoff and rollout and carries arrows, a blast pad or stopway carries yellow chevrons.
   * pave: 'asphalt' | 'concrete'. rubber and patches add wear.
   */
  runway({ u0, u1, v, w, marks = null, lights = true, surface = 'paved', pave = 'asphalt', displaced = null, blast = null, rubber = true, patches = true, tdz = null, seed = 1 }) {
    const rw = {
      u0, u1, v, w, marks, lights, surface, pave, length: u1 - u0, rubber, patches, seed,
      disp: { west: displaced?.west || 0, east: displaced?.east || 0 },
      blast: { west: blast?.west || 0, east: blast?.east || 0 },
      precision: tdz === null ? w >= 40 : tdz,
    };
    this.runways.push(rw);
    this._grid = null;
    return rw;
  }
  taxiway(u0, v0, u1, v1, w, kind = 'taxi') { this.taxiways.push({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), w, kind, horiz: Math.abs(u1 - u0) >= Math.abs(v1 - v0), cu: (u0 + u1) / 2, cv: (v0 + v1) / 2 }); }
  /**
   * A taxi route through points [[u, v], ...] whose corners are rounded with radius r. It carries a curving centerline, so it can
   * turn a connector into the parallel taxiway or leave a runway at an angle.
   */
  route(pts, w, { r = 40, kind = 'taxi', line = true } = {}) {
    const poly = roundedPath(pts, r);
    const segs = [];
    const pad = w / 2 + 2;
    for (let i = 0; i + 1 < poly.length; i++) {
      const a = poly[i], b = poly[i + 1];
      segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], u0: Math.min(a[0], b[0]) - pad, u1: Math.max(a[0], b[0]) + pad, v0: Math.min(a[1], b[1]) - pad, v1: Math.max(a[1], b[1]) + pad });
    }
    const rt = { pts, poly, segs, w, kind, line, u0: Math.min(...segs.map((s) => s.u0)), u1: Math.max(...segs.map((s) => s.u1)), v0: Math.min(...segs.map((s) => s.v0)), v1: Math.max(...segs.map((s) => s.v1)) };
    this.routes.push(rt);
    return rt;
  }
  /** Concrete apron rectangle. slabs paints the panel pattern (tone changes, joints and oil), which suits every apron. */
  apron(u0, v0, u1, v1, mat = M.APRON, slabs = true) { this.aprons.push({ u0: Math.min(u0, u1), v0: Math.min(v0, v1), u1: Math.max(u0, u1), v1: Math.max(v0, v1), mat, slabs, seed: this.aprons.length * 17 + 3 }); }
  /**
   * Rounded inside corner where two pavements meet: the corner point (cu, cv) and the direction (sx, sz) of the quarter that gets
   * filled, so a taxiway joining a parallel one flares out instead of meeting it at a knife edge.
   */
  fillet(cu, cv, sx, sz, r = 30, kind = 'taxi') { this.fillets.push({ cu, cv, sx, sz, r, kind, u0: Math.min(cu, cu + sx * r), u1: Math.max(cu, cu + sx * r), v0: Math.min(cv, cv + sz * r), v1: Math.max(cv, cv + sz * r) }); }
  /** Fillets at all four corners where a connector of width cw crosses a parallel taxiway of width tw (pass crossing=false for a T). */
  junction(cu, cv, cw, tw, { r = 30, north = true, south = true } = {}) {
    for (const sx of [-1, 1]) for (const [sz, on] of [[-1, north], [1, south]]) if (on) this.fillet(cu + sx * cw / 2, cv + sz * tw / 2, sx, sz, r);
  }
  /**
   * Painted parking stalls in a rectangle of pavement: rows of stalls `depth` deep separated by `aisle` wide lanes, lines every
   * `stall` meters. The rows run along v, so cars park with their noses toward the aisles.
   */
  parkingLot(u0, v0, u1, v1, { stall = 2.8, depth = 5.4, aisle = 7.4 } = {}) {
    const lot = { u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), stall, depth, aisle };
    this.lots.push(lot);
    const pitch = 2 * depth + aisle;
    this._addMark({
      u0: lot.u0, u1: lot.u1, v0: lot.v0, v1: lot.v1, maxCell: 0.9,
      fn: (u, v, cell) => {
        const lu = u - lot.u0, lv = v - lot.v0;
        const row = lu % pitch;
        if (row < 0.2 || (row > depth * 2 + aisle - 0.2) || lu < 0.2 || lu > lot.u1 - lot.u0 - 0.2) return 0;
        // a solid line down the middle of a double row, stall lines across each half
        if (Math.abs(row - depth) < Math.max(0.12, cell * 0.3)) return M.PARKING_LINE;
        if (row < depth || (row > depth + 0 && row < depth * 2)) {
          const k = lv % stall;
          if (k < Math.max(0.15, cell * 0.35) && lv > 0.4 && lv < lot.v1 - lot.v0 - 0.4) return M.PARKING_LINE;
        }
        return 0;
      },
    });
    return lot;
  }
  pad(u0, v0, u1, v1, mat, over = false) { this.pads.push({ u0: Math.min(u0, u1), v0: Math.min(v0, v1), u1: Math.max(u0, u1), v1: Math.max(v0, v1), mat, over }); }

  // ------------------------------------------------------------------ decals: marks painted on top of pavement
  /** A mark has a box in the local frame and fn(u, v, cell) -> material or 0. It is only painted for voxels no bigger than
      maxCell and bigger than minCell, so a thin line can hand over to a fatter one that survives coarse voxels. */
  _addMark(m) { m.minCell = m.minCell || 0; this.marks.push(m); this._grid = null; return m; }
  /** A rectangle of paint. */
  markRect(u0, v0, u1, v1, mat, maxCell = 1.05) {
    return this._addMark({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), fn: () => mat, maxCell });
  }
  /** A line of paint with a width, optionally dashed (dash and gap in meters). */
  markLine(ua, va, ub, vb, width, mat, { dash = 0, gap = 0, maxCell = 1.05, minCell = 0 } = {}) {
    const len = Math.hypot(ub - ua, vb - va) || 1;
    const dx = (ub - ua) / len, dy = (vb - va) / len, hw = width / 2;
    return this._addMark({
      u0: Math.min(ua, ub) - hw - 0.5, u1: Math.max(ua, ub) + hw + 0.5, v0: Math.min(va, vb) - hw - 0.5, v1: Math.max(va, vb) + hw + 0.5, maxCell, minCell,
      fn: (u, v, cell) => {
        const px = u - ua, py = v - va;
        const t = px * dx + py * dy, off = Math.abs(-px * dy + py * dx);
        if (t < 0 || t > len || off > Math.max(hw, cell * 0.4)) return 0;
        if (dash && t % (dash + gap) > dash) return 0;
        return mat;
      },
    });
  }
  /** A ring (outline) of a rectangle or an ellipse-free circle: kind 'rect' with local extents, or 'disk' with radius. */
  markRing(cu, cv, r, width, mat, maxCell = 1.05) {
    return this._addMark({ u0: cu - r - width, u1: cu + r + width, v0: cv - r - width, v1: cv + r + width, maxCell, fn: (u, v, cell) => (Math.abs(Math.hypot(u - cu, v - cv) - r) <= Math.max(width / 2, cell * 0.4) ? mat : 0) });
  }
  /**
   * Lettering painted on the ground. (u, v) is the middle of the baseline and `up` is the direction the tops of the letters point,
   * in degrees clockwise from +u (0: the text reads for a pilot facing along the runway heading). px is the size of one font
   * pixel in meters, so letters are 7 px tall. bg paints a backing plate around the text.
   */
  markText(text, u, v, px, mat, { up = 0, bg = 0, pad = 1.2, gap = 1, maxCell = null } = {}) {
    const cols = text.length * 5 + (text.length - 1) * gap, W = cols * px, Ht = 7 * px;
    const a = up * D2R, pu = Math.cos(a), pv = Math.sin(a), ru = -Math.sin(a), rv = Math.cos(a);
    const R = Math.hypot(W / 2 + pad * px, Ht + pad * px) + 1;
    const max = maxCell ?? px * 1.1;
    return this._addMark({
      u0: u - R, u1: u + R, v0: v - R, v1: v + R, maxCell: max,
      fn: (uu, vv, cell) => {
        const du = uu - u, dv = vv - v;
        const x = du * ru + dv * rv + W / 2, y = du * pu + dv * pv;
        if (bg && x >= -pad * px && x <= W + pad * px && y >= -pad * px && y <= Ht + pad * px) {
          if (x >= 0 && x < W && y >= 0 && y < Ht) {
            const col = Math.floor(x / px), k = Math.floor(col / (5 + gap)), lc = col - k * (5 + gap);
            if (lc < 5) { const g = GLYPHS[text[k].toUpperCase()]; if (g && g[6 - Math.floor(y / px)][lc] === '1') return mat; }
          }
          return bg;
        }
        if (x < 0 || x >= W || y < 0 || y >= Ht) return 0;
        const col = Math.floor(x / px), k = Math.floor(col / (5 + gap)), lc = col - k * (5 + gap);
        if (lc >= 5) return 0;
        const g = GLYPHS[text[k].toUpperCase()];
        return g && g[6 - Math.floor(y / px)][lc] === '1' ? mat : 0;
      },
    });
  }
  /** Diagonal yellow and black warning stripes filling a rectangle (alert pads, aprons in front of shelters). */
  hazard(u0, v0, u1, v1, stripe = 2.2) {
    return this._addMark({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), maxCell: stripe * 0.6, fn: (u, v) => (Math.floor((u + v) / stripe) & 1 ? M.TAXI_LINE : M.TIRE) });
  }
  /** A helipad: a disk of pavement, a ring and an H. The H is white, or yellow at military fields. */
  helipad(cu, cv, r, { mat = M.CONCRETE, paint = M.RUNWAY_MARK, letter = 'H' } = {}) {
    this.helipads.push({ u: cu, v: cv, r });
    const px = r / 9;
    this._addMark({ u0: cu - r - 1, u1: cu + r + 1, v0: cv - r - 1, v1: cv + r + 1, maxCell: 1e9, fn: (u, v, cell) => {
      const d = Math.hypot(u - cu, v - cv);
      if (d > r) return 0;
      if (cell > 1.05) return mat;
      if (d > r - 1.6 && d < r - 0.7) return paint;
      const du = u - cu, dv = v - cv;
      const x = dv + 2.5 * px, y = du + 3.5 * px;
      if (x >= 0 && x < 5 * px && y >= 0 && y < 7 * px) { const g = GLYPHS[letter]; if (g[6 - Math.floor(y / px)][Math.floor(x / px)] === '1') return paint; }
      return mat;
    } });
  }
  /**
   * An aircraft stand. (u, v) is where the nose wheel stops and `dir` the direction the aircraft faces, in degrees clockwise from
   * +u. Paints the lead-in line and stop bar, the stand number and, for `box`, the equipment restraint outline around the aircraft.
   */
  stand({ u, v, dir, id = '', lead = 46, span = 36, len = 40, box = true, oil = true, mat = M.TAXI_LINE }) {
    const a = dir * D2R, fu = Math.cos(a), fv = Math.sin(a), ru = -fv, rv = fu;
    const at = (f, r) => [u + fu * f + ru * r, v + fv * f + rv * r];
    this.stands.push({ u, v, dir, id, span, len });
    const [s0u, s0v] = at(-lead, 0);
    this.markLine(s0u, s0v, u, v, 0.5, mat);
    const [ba, bb] = [at(0.2, -2.4), at(0.2, 2.4)];
    this.markLine(ba[0], ba[1], bb[0], bb[1], 0.6, mat);
    if (id) { const [tu, tv] = at(-14, 5.5); this.markText(String(id), tu, tv, 0.75, mat, { up: dir - 90 }); }
    if (box) {
      const hs = span / 2 + 3, back = len + 6;
      const c = [at(-back, -hs), at(-back, hs), at(9, hs), at(9, -hs)];
      for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; if (i === 0) continue; this.markLine(p[0], p[1], q[0], q[1], 0.32, M.SIGN_RED, { dash: 3, gap: 2 }); }
    }
    if (oil) {
      const seed = hash2(Math.round(u), Math.round(v), 41);
      for (const [f, r, k] of [[-1.5, 0, 0], [-len * 0.45, -span * 0.16, 1], [-len * 0.45, span * 0.16, 2]]) {
        const [ou, ov] = at(f, r), rx = 1.1 + hashUnit(hash2(seed, k, 1)) * 0.9, rz = 0.7 + hashUnit(hash2(seed, k, 2)) * 0.6, ph = hashUnit(hash2(seed, k, 3)) * 6;
        this._addMark({ u0: ou - 3, u1: ou + 3, v0: ov - 3, v1: ov + 3, maxCell: 1.05, fn: (uu, vv) => {
          const du = uu - ou, dv = vv - ov, e = (du / rx) ** 2 + (dv / rz) ** 2 + 0.35 * Math.sin(du * 2.3 + ph) * Math.cos(dv * 1.9);
          return e < 1 ? M.ASPHALT : 0;
        } });
      }
    }
  }
  /**
   * Holding position for a taxi route or connector that meets a runway: four lines across the taxiway (two solid on the runway
   * side, two dashed) and, when `sign` is given, the runway pair in white on red. (u, v) is the middle of the lines and `dir` the
   * direction toward the runway, in degrees clockwise from +u.
   */
  holdShort(u, v, dir, w, sign = '') {
    const a = dir * D2R, fu = Math.cos(a), fv = Math.sin(a), ru = -fv, rv = fu;
    const at = (f, r) => [u + fu * f + ru * r, v + fv * f + rv * r];
    // solid lines on the side where the aircraft holds, dashed on the runway side; fine voxels get all four
    for (const [f, dashed] of [[0.9, true], [0.3, true], [-0.3, false], [-0.9, false]]) {
      const p = at(f, -w / 2), q = at(f, w / 2);
      this.markLine(p[0], p[1], q[0], q[1], 0.2, M.TAXI_LINE, dashed ? { dash: 1.2, gap: 0.9, maxCell: 0.62 } : { maxCell: 0.62 });
    }
    // voxels of a meter or so only carry one fat solid and one fat dashed line
    for (const [f, dashed] of [[1.1, true], [-1.1, false]]) {
      const p = at(f, -w / 2), q = at(f, w / 2);
      this.markLine(p[0], p[1], q[0], q[1], 0.9, M.TAXI_LINE, dashed ? { dash: 2.2, gap: 1.6, minCell: 0.62, maxCell: 1.3 } : { minCell: 0.62, maxCell: 1.3 });
    }
    if (sign) { const [su, sv] = at(-7.5, 0); this.markText(sign, su, sv, 0.62, M.RUNWAY_MARK, { up: dir, bg: M.SIGN_RED, pad: 1.4, gap: 1 }); }
  }

  /** Bucket the marks on a coarse grid the first time the surface is asked for. */
  _buildGrid() {
    const g = new Map();
    for (const m of this.marks) {
      for (let i = Math.floor(m.u0 / 64); i <= Math.floor(m.u1 / 64); i++) for (let j = Math.floor(m.v0 / 64); j <= Math.floor(m.v1 / 64); j++) {
        const k = (i + 2048) * 4096 + (j + 2048);
        let l = g.get(k);
        if (!l) g.set(k, (l = []));
        l.push(m);
      }
    }
    this._grid = g;
    return g;
  }

  // ------------------------------------------------------------------ paint
  /** Runway designator: digits above the L, R or C suffix, in a font whose pixels are px meters. du runs from the threshold end. */
  _numeral(text, du, dv, px, off = 0) {
    const digits = text.replace(/[LRC]$/, ''), suffix = text.slice(digits.length);
    const rowH = 7 * px;
    const glyphRow = (str, y, x) => {
      const n = str.length, total = n * 5 * px + (n - 1) * 2 * px, xx = x + total / 2;
      if (y < 0 || y >= rowH || xx < 0 || xx >= total) return false;
      const k = Math.floor(xx / (7 * px)), lx = xx - k * 7 * px;
      if (lx >= 5 * px) return false;
      const g = GLYPHS[str[k]];
      return !!g && g[6 - Math.floor(y / px)][Math.floor(lx / px)] === '1';
    };
    const y = du - off;
    if (suffix) {
      if (glyphRow(suffix, y, dv)) return true;
      return glyphRow(digits, y - (rowH + 1.6 * px), dv);
    }
    return glyphRow(digits, y, dv);
  }

  /** Material for a point on a runway, or 0 when the point is not on this runway's pavement. */
  _runway(rw, u, v, cell, fine) {
    const bw = Math.max(rw.blast.west, rw.blast.east);
    if (u < rw.u0 - bw - 12 || u > rw.u1 + bw + 12) return 0;
    const dv = v - rw.v, adv = Math.abs(dv), hw = rw.w / 2;
    if (adv > hw + 8) return 0;
    if (rw.surface === 'grass') return this._strip(rw, u, dv, adv, hw, cell, fine);
    // seen from a few kilometers the edge lamps are far smaller than a voxel: dashes of pavement that glows at night (an ordinary dark
    // gray by day) stand in for them, so a lit runway can be found from the air
    if (rw.lights && cell > 2.4 && cell <= 10 && u > rw.u0 + 10 && u < rw.u1 - 10 && adv > hw - cell * 0.45 && adv < hw + cell * 0.85 && (u - rw.u0) % 60 < 16 + cell) return M.ASPHALT_LIT;
    const inside = u >= rw.u0 && u <= rw.u1 && adv <= hw;
    if (!inside) {
      // blast pads and stopways past the ends carry yellow chevrons that point at the runway
      for (const [end, blast] of [['west', rw.blast.west], ['east', rw.blast.east]]) {
        if (!blast || adv > hw) continue;
        const t = end === 'west' ? rw.u0 - u : u - rw.u1;
        if (t > 0 && t <= blast) {
          if (fine && t > 4 && t < blast - 3 && adv < hw - 3) {
            const pitch = 22, k = (((t - 4 - adv * 0.8) % pitch) + pitch) % pitch;
            if (k < 1.7 + cell * 0.4) return M.TAXI_LINE;
          }
          return t > 1 ? M.ASPHALT_WORN : M.RUNWAY;
        }
      }
      // shoulders
      if (adv <= hw + 7 && u >= rw.u0 - 8 && u <= rw.u1 + 8) return M.ASPHALT_WORN;
      return 0;
    }
    const base = rw.pave === 'concrete' ? M.CONCRETE_DARK : M.RUNWAY;
    const lu = u - rw.u0, ru = rw.u1 - u;
    if (!fine) {
      if (cell <= 4) {
        if (adv < 1.0 + cell * 0.3 && lu % 50 < 30 && lu > 20 && ru > 20) return M.RUNWAY_MARK;
        // the edge lines still read at a distance
        if (adv > hw - 2.4 - cell * 0.2 && adv < hw - 1.0 + cell * 0.2 && lu > 4 && ru > 4) return M.RUNWAY_MARK;
      }
      return base;
    }
    const line = Math.max(0.5, cell * 0.7);
    // edge lines
    if (adv > hw - 1.9 && adv < hw - 1.9 + line + 0.45 && lu > 4 && ru > 4) return M.RUNWAY_MARK;
    // per end: displaced arrows, threshold bars, numerals, aiming point and touchdown zone pairs
    for (let e = 0; e < 2; e++) {
      const end = e === 0 ? 'west' : 'east';
      const d = rw.disp[end], t = e === 0 ? lu : ru, dvv = e === 0 ? dv : -dv;
      const tt = t - d;
      if (d > 0 && t < d) {
        // displaced threshold: arrows along the centerline, and the pavement beyond is only for takeoff and rollout
        if (t > 3) {
          const a = (t - 3) % 60;
          if (a < 30 && adv < 0.7 + line * 0.3) return M.RUNWAY_MARK;
          if (a >= 30 && a < 45 && adv < (45 - a) * 0.34) return M.RUNWAY_MARK;
        }
        continue;
      }
      // threshold bars: piano keys, 1.8 m stripes at a 3.6 m pitch, symmetric about the centerline
      if (tt > 6 && tt < 36 && adv > 1.8 && adv < hw - 3.2) {
        const s = (adv - 1.8) % 3.6;
        if (s < 1.8) return M.RUNWAY_MARK;
      }
      if (d > 0 && tt > -1.4 && tt <= 0.6 && adv < hw - 1.9) return M.RUNWAY_MARK;
      // aiming point: two broad bars
      const ai = hw * 0.38;
      if (tt > (rw.length > 2400 ? 400 : 300) && tt < (rw.length > 2400 ? 445 : 345) && adv > ai && adv < ai + 5.6) return M.RUNWAY_MARK;
      if (rw.precision) {
        // touchdown zone pairs at 150 m steps, three, two, two, one, one bars a side
        const zones = [[150, 3], [450, 2], [600, 2], [750, 1], [900, 1]];
        for (let z = 0; z < zones.length; z++) {
          const z0 = zones[z][0];
          if (tt >= z0 && tt < z0 + 22.5 && adv > 5.4 && (rw.length > 2 * z0 + 200)) {
            const s = (adv - 5.4) % 3.3;
            if (s < 1.8 && Math.floor((adv - 5.4) / 3.3) < zones[z][1]) return M.RUNWAY_MARK;
          }
        }
      }
      if (rw.marks) {
        const name = rw.marks[end];
        if (name) {
          const px = Math.min(2.4, (rw.w * 0.8) / (Math.max(2, name.replace(/[LRC]$/, '').length) * 7 - 2));
          if (this._numeral(name, tt - 55, dvv, px)) return M.RUNWAY_MARK;
        }
      }
    }
    // centerline dashes: 30 m of paint, 20 m of gap, and none where a threshold takes over
    if (adv < 0.5 + line * 0.4 && lu > 24 && ru > 24 && lu % 50 < 30) return M.RUNWAY_MARK;
    // wear: rubber in the touchdown areas, patches, joints
    const wear = this._wear(rw, u, v, lu, ru, dv, adv, cell);
    return wear || base;
  }

  _wear(rw, u, v, lu, ru, dv, adv, cell) {
    if (cell > 1.05) return 0;
    if (rw.pave === 'concrete') {
      // 7.5 m slabs: a few replaced panels and hairline joints
      const su = Math.floor(lu / 7.5), sv = Math.floor((dv + 60) / 7.5);
      if (cell <= 0.62 && (lu % 7.5 < 0.28 || (dv + 60) % 7.5 < 0.28)) return M.ASPHALT_WORN;
      const r = n2(su, sv, 71 + rw.seed);
      if (r < 0.05) return M.CONCRETE;
    } else if (rw.patches) {
      // repaired stretches: lighter asphalt rectangles here and there
      const pu = Math.floor(lu / 90), pv = Math.floor((dv + 64) / 16);
      if (n2(pu, pv, 61 + rw.seed) < 0.13) {
        const cu = (pu + 0.25 + 0.5 * n2(pu, pv, 62 + rw.seed)) * 90, cv = (pv + 0.3 + 0.4 * n2(pu, pv, 63 + rw.seed)) * 16 - 64;
        const hu = 3 + 6 * n2(pu, pv, 64 + rw.seed), hv = 1.4 + 2.4 * n2(pu, pv, 65 + rw.seed);
        if (Math.abs(lu - cu) < hu && Math.abs(dv - cv) < hv) return M.ASPHALT;
      }
    }
    if (rw.rubber) {
      // streaks of rubber where the mains touch: a band along the centerline, a few hundred meters in from each threshold
      for (const t of [lu, ru]) {
        const zone = smoothstep(120, 320, t) * (1 - smoothstep(560, 900, t));
        if (zone <= 0.02) continue;
        const lat = 1 - smoothstep(3, 15, adv);
        const s = Math.floor(dv / 0.75), seg = Math.floor((t + n2(s, 5, 81 + rw.seed) * 40) / (14 + 30 * n2(s, 6, 82 + rw.seed)));
        if (n2(s, seg, 83 + rw.seed) < 0.6 * zone * lat) return M.TIRE;
      }
    }
    return 0;
  }

  /** The mown strip: alternate mowing bands, worn tracks at the ends where wheels have been, painted numerals. */
  _strip(rw, u, dv, adv, hw, cell, fine) {
    if (adv > hw) return 0;
    if (u < rw.u0 || u > rw.u1) return 0;
    const lu = u - rw.u0, ru = rw.u1 - u;
    if (fine) {
      // worn dirt where the wheels run and where the aircraft turns and waits at each end
      for (const t of [lu, ru]) {
        if (t < 90) {
          const track = Math.min(Math.abs(adv - 1.7), 9);
          const wear = (1 - smoothstep(20, 90, t)) * (1 - smoothstep(0.5, 1.5, track));
          if (n2(Math.floor(u * 1.5), Math.floor(dv * 1.5), 91) < wear * 0.85) return M.DIRT;
        }
        if (t < 16 && adv < hw - 2 && n2(Math.floor(u), Math.floor(dv), 92) < 0.35 * (1 - t / 16)) return M.DIRT_ROAD;
      }
      // threshold bars painted in lime, and the numbers
      for (let e = 0; e < 2; e++) {
        const t = e === 0 ? lu : ru;
        if (t > 3 && t < 4.4 && adv < hw - 1.5) return M.RUNWAY_MARK;
        if (rw.marks) {
          const name = e === 0 ? rw.marks.west : rw.marks.east;
          if (name && this._numeral(name, t - 12, e === 0 ? dv : -dv, Math.min(1.5, (rw.w * 0.5) / 12))) return M.RUNWAY_MARK;
        }
      }
    }
    if (fine && (Math.floor((dv + 500) / 3) & 1) === 0) return M.LAWN;
    return M.MOWN_STRIP;
  }

  /** Distance from a local point to a route's centerline, or Infinity when it is outside the box. */
  _routeDist(rt, u, v) {
    if (u < rt.u0 || u > rt.u1 || v < rt.v0 || v > rt.v1) return Infinity;
    let best = Infinity;
    for (const s of rt.segs) {
      if (u < s.u0 || u > s.u1 || v < s.v0 || v > s.v1) continue;
      const abx = s.bx - s.ax, aby = s.by - s.ay, l2 = abx * abx + aby * aby;
      let t = l2 > 0 ? ((u - s.ax) * abx + (v - s.ay) * aby) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = u - (s.ax + abx * t), dy = v - (s.ay + aby * t);
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  /** Material for a world point, or 0 when the point is not airfield pavement. */
  paint(x, z, cell) {
    const [u, v] = this.toLocal(x, z);
    const fine = cell <= 1.0;
    // marks painted on top of the pavement
    if (this.marks.length) {
      const grid = this._grid || this._buildGrid();
      const l = grid.get((Math.floor(u / 64) + 2048) * 4096 + (Math.floor(v / 64) + 2048));
      if (l) {
        for (let i = l.length - 1; i >= 0; i--) {
          const m = l[i];
          if (u < m.u0 || u > m.u1 || v < m.v0 || v > m.v1 || cell > m.maxCell || cell <= m.minCell) continue;
          const r = m.fn(u, v, cell);
          if (r) return r;
        }
      }
    }
    for (const rw of this.runways) {
      const r = this._runway(rw, u, v, cell, fine);
      if (r) return r;
    }
    for (const p of this.pads) {
      if (p.over && u >= p.u0 && u <= p.u1 && v >= p.v0 && v <= p.v1) return p.mat;
    }
    for (const t of this.taxiways) {
      if (u < t.u0 - t.w / 2 || u > t.u1 + t.w / 2 || v < t.v0 - t.w / 2 || v > t.v1 + t.w / 2) continue;
      const along = t.horiz ? v - t.cv : u - t.cu, across = Math.abs(along);
      if (across > t.w / 2) continue;
      if (t.horiz ? (u < t.u0 - t.w / 2 || u > t.u1 + t.w / 2) : (v < t.v0 - t.w / 2 || v > t.v1 + t.w / 2)) continue;
      if (fine) {
        if (across < 0.25 + cell * 0.4) return M.TAXI_LINE;
        if (across > t.w / 2 - 1.3 && across < t.w / 2 - 0.7) return M.TAXI_LINE;
        if (t.kind !== 'apron') {
          const w = this._taxiWear(u, v, cell);
          if (w) return w;
        }
      }
      return t.kind === 'apron' ? M.APRON : M.ASPHALT_WORN;
    }
    for (const rt of this.routes) {
      const d = this._routeDist(rt, u, v);
      if (d > rt.w / 2) continue;
      if (fine) {
        if (rt.line && d < 0.25 + cell * 0.4) return M.TAXI_LINE;
        if (d > rt.w / 2 - 1.3 && d < rt.w / 2 - 0.7) return M.TAXI_LINE;
        const w = this._taxiWear(u, v, cell);
        if (w) return w;
      }
      return rt.kind === 'apron' ? M.APRON : M.ASPHALT_WORN;
    }
    for (const f of this.fillets) {
      if (u < f.u0 || u > f.u1 || v < f.v0 || v > f.v1) continue;
      // inside the quarter square, outside the circle around the far corner
      const du = u - (f.cu + f.sx * f.r), dv = v - (f.cv + f.sz * f.r);
      if (du * du + dv * dv > f.r * f.r) return M.ASPHALT_WORN;
    }
    for (const a of this.aprons) {
      if (u >= a.u0 && u <= a.u1 && v >= a.v0 && v <= a.v1) return this._apron(a, u, v, cell);
    }
    for (const p of this.pads) {
      if (!p.over && u >= p.u0 && u <= p.u1 && v >= p.v0 && v <= p.v1) return this._padPaint(p, u, v, cell);
    }
    return 0;
  }

  /** Wear on taxi pavement: a few lighter patches so it does not read as one flat color. */
  _taxiWear(u, v, cell) {
    if (cell > 1.05) return 0;
    const pu = Math.floor(u / 40), pv = Math.floor(v / 40);
    if (n2(pu, pv, 51) < 0.16) {
      const cu = (pu + 0.2 + 0.6 * n2(pu, pv, 52)) * 40, cv = (pv + 0.2 + 0.6 * n2(pu, pv, 53)) * 40;
      if (Math.abs(u - cu) < 2 + 5 * n2(pu, pv, 54) && Math.abs(v - cv) < 1.2 + 2.4 * n2(pu, pv, 55)) return M.ASPHALT;
    }
    return 0;
  }

  /** Apron concrete: panels of slightly different tone, joints between them, the odd repair and oil stain. */
  _apron(a, u, v, cell) {
    if (!a.slabs || cell > 2.2) return a.mat;
    const lu = u - a.u0, lv = v - a.v0;
    const su = Math.floor(lu / 7.5), sv = Math.floor(lv / 6);
    if (cell <= 0.62 && (lu % 7.5 < 0.3 || lv % 6 < 0.3)) return M.CONCRETE_DARK;
    // a few replaced panels only; the joints and stains carry the wear, a busy tone pattern reads as noise from the cockpit
    if (n2(su, sv, a.seed) < 0.07) return M.CONCRETE;
    if (cell <= 1.05) {
      // stains on a coarse grid
      const gi = Math.floor(u / 26), gj = Math.floor(v / 26);
      if (n2(gi, gj, a.seed + 5) < 0.28) {
        const cu = (gi + 0.15 + 0.7 * n2(gi, gj, a.seed + 6)) * 26, cv = (gj + 0.15 + 0.7 * n2(gi, gj, a.seed + 7)) * 26;
        const rx = 0.7 + 1.6 * n2(gi, gj, a.seed + 8), rz = 0.5 + 1.1 * n2(gi, gj, a.seed + 9);
        const e = ((u - cu) / rx) ** 2 + ((v - cv) / rz) ** 2 + 0.4 * Math.sin((u - cu) * 2.7) * Math.cos((v - cv) * 2.1);
        if (e < 1) return M.ASPHALT;
      }
    }
    return a.mat;
  }

  _padPaint(p, u, v, cell) {
    if (cell > 2.2) return p.mat;
    const lu = u - p.u0, lv = v - p.v0;
    if (p.mat === M.CONCRETE || p.mat === M.CONCRETE_DARK || p.mat === M.APRON) {
      if (cell <= 0.62 && (lu % 7.5 < 0.3 || lv % 6 < 0.3)) return p.mat === M.CONCRETE ? M.CONCRETE_DARK : M.ASPHALT_WORN;
      if (n2(Math.floor(lu / 7.5), Math.floor(lv / 6), 97) < 0.12) return p.mat === M.CONCRETE ? M.APRON : M.CONCRETE;
    } else if (p.mat === M.DIRT_ROAD) {
      // packed earth: trampled dark patches, bare clay, and grass taking back the margins
      const e = Math.min(lu, p.u1 - u, lv, p.v1 - v);
      const nn = n2(Math.floor(u / 2.5), Math.floor(v / 2.5), 71);
      // a yard is bare where people walk and grassy in the corners nobody bothers with: blocks of nine meters broken up at three
      const blob = 0.7 * n2(Math.floor(u / 9), Math.floor(v / 9), 72) + 0.3 * n2(Math.floor(u / 3), Math.floor(v / 3), 73);
      if (blob < 0.33) return M.GRASS_DRY;
      if (e < 6 && nn < 0.75 - e * 0.12) return M.GRASS_DRY;
      if (nn > 0.9) return M.DIRT;
      if (nn < 0.07) return M.DIRT_DARK;
    }
    return p.mat;
  }

  // ------------------------------------------------------------------ data for the game and the hangar chart
  /** Runways in world coordinates: both ends with their designator and compass heading, for guidance and the map. */
  runwayList() {
    const out = [];
    for (const rw of this.runways) {
      const a = this.toWorld(rw.u0, rw.v), b = this.toWorld(rw.u1, rw.v);
      out.push({
        id: rw.marks ? `${rw.marks.west}/${rw.marks.east}` : 'strip', ends: [
          { name: rw.marks?.west || 'W', x: a[0], z: a[1], heading: this.compass(0), disp: rw.disp.west },
          { name: rw.marks?.east || 'E', x: b[0], z: b[1], heading: this.compass(180), disp: rw.disp.east },
        ],
        ax: a[0], az: a[1], bx: b[0], bz: b[1], length: rw.length, width: rw.w, surface: rw.surface === 'grass' ? 'grass' : rw.pave, halfWidth: rw.w / 2,
      });
    }
    return out;
  }
  /** Everything the airport chart draws, in the local frame (u to the right, v down when the runway heading points east). */
  chart() {
    return {
      heading: this.headingDeg,
      frame: { cx: this.cx, cz: this.cz, s: this.s, c: this.c },
      runways: this.runways.map((r) => ({ u0: r.u0, u1: r.u1, v: r.v, w: r.w, marks: r.marks, surface: r.surface === 'grass' ? 'grass' : r.pave })),
      taxiways: this.taxiways.map((t) => ({ u0: t.u0, u1: t.u1, v0: t.v0, v1: t.v1, w: t.w, kind: t.kind })),
      routes: this.routes.map((r) => ({ poly: r.poly, w: r.w })),
      aprons: this.aprons.map((a) => ({ u0: a.u0, u1: a.u1, v0: a.v0, v1: a.v1 })),
      pads: this.pads.map((p) => ({ u0: p.u0, u1: p.u1, v0: p.v0, v1: p.v1, mat: p.mat === M.DIRT_ROAD ? 'dirt' : 'paved' })),
      fillets: this.fillets.map((f) => ({ cu: f.cu, cv: f.cv, sx: f.sx, sz: f.sz, r: f.r })),
      lots: this.lots.map((l) => ({ u0: l.u0, u1: l.u1, v0: l.v0, v1: l.v1 })),
      helipads: this.helipads,
      stands: this.stands.map((s) => ({ u: s.u, v: s.v, dir: s.dir, id: s.id })),
    };
  }
  /** A start position for the hangar: dir is degrees clockwise from the runway heading, so the compass heading is derived. */
  spawn({ id, name, u, v, dir = 0, kind = 'runway', alt = 0, ...extra }) {
    const [x, z] = this.toWorld(u, v);
    return { id, name, x, z, alt, heading: this.compass(dir), kind, ...extra };
  }
}

/** Runway edge, threshold and end lights as scenery props (variants: 0 white, 1 green, 2 red, 3 amber). */
export function runwayLights(af, rw, out) {
  const step = rw.length > 2000 ? 60 : 45, caution = Math.min(600, rw.length / 3);
  for (const s of [-1, 1]) {
    for (let u = rw.u0 + 2; u <= rw.u1 - 2; u += step) {
      const [x, z] = af.toWorld(u, rw.v + s * (rw.w / 2 + 1.2));
      out.props.push({ type: 'runway-light', x, z, yaw: 0, scale: 1, variant: u < rw.u0 + caution || u > rw.u1 - caution ? 3 : 0 });
    }
    for (const [uu, variant] of [[rw.u0 + 0.5, 1], [rw.u1 - 0.5, 2]]) {
      for (let k = 0; k < 5; k++) {
        const [x, z] = af.toWorld(uu, rw.v + s * (2 + k * ((rw.w / 2 - 1) / 5)));
        out.props.push({ type: 'runway-light', x, z, yaw: 0, scale: 1, variant });
      }
    }
  }
}

export function fenceRect(ctx, af, u0, v0, u1, v1, out, seed = 1, gap = null) {
  // fence segments around a local rectangle; local x of each fence follows the edge direction
  const seg = 36;
  const edge = (ua, va, ub, vb) => {
    const len = Math.hypot(ub - ua, vb - va);
    const n = Math.ceil(len / seg);
    const horizontal = Math.abs(ub - ua) > Math.abs(vb - va);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const uc = ua + (ub - ua) * ((t0 + t1) / 2), vc = va + (vb - va) * ((t0 + t1) / 2);
      if (gap && Math.abs(uc - gap.u) < gap.w / 2 && Math.abs(vc - gap.v) < gap.w / 2) continue;
      const [x, z] = af.toWorld(uc, vc);
      out.structures.push(ctx.kit('fence', { x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, w: len / n + 0.3, d: 1, h: 2.6, rot: 0, yaw: horizontal ? af.h - Math.PI / 2 : af.h, seed }));
    }
  };
  edge(u0, v0, u1, v0); edge(u1, v0, u1, v1); edge(u1, v1, u0, v1); edge(u0, v1, u0, v0);
}
