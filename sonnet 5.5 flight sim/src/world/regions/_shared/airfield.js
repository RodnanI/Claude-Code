import { M } from '../../../voxel/palette.js';

/* Airfield geometry and surface painting. An airfield has a local frame: u runs along the primary runway heading,
   v runs to the right of it (clockwise). Heading is in degrees from north. The frame maps to the world as
     x = cx + u sin h + v cos h,   z = cz - u cos h + v sin h        (world +z is south)
   Everything painted here is analytic: pavement, markings, and runway numerals as a 5x7 bitmap font. */

const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
};

export class Airfield {
  constructor({ cx, cz, heading }) {
    this.cx = cx; this.cz = cz;
    this.h = (heading * Math.PI) / 180;
    this.s = Math.sin(this.h); this.c = Math.cos(this.h);
    this.runways = [];
    this.taxiways = [];
    this.aprons = [];
    this.pads = [];
    this.strips = [];
  }
  toWorld(u, v) { return [this.cx + u * this.s + v * this.c, this.cz - u * this.c + v * this.s]; }
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
  place(ctx, out, kind, u, v, w, d, h, facing, seed = 1, style = undefined, extra = {}) {
    const [x, z] = this.toWorld(u, v);
    out.structures.push(ctx.kit(kind, { x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, w, d, h, rot: 0, yaw: this.yaw(facing), seed, style, ...extra }));
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

  runway({ u0, u1, v, w, marks = null, lights = true, surface = 'paved' }) {
    const rw = { u0, u1, v, w, marks, lights, surface, length: u1 - u0 };
    this.runways.push(rw);
    return rw;
  }
  taxiway(u0, v0, u1, v1, w, kind = 'taxi') { this.taxiways.push({ u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), w, kind, horiz: Math.abs(u1 - u0) >= Math.abs(v1 - v0), cu: (u0 + u1) / 2, cv: (v0 + v1) / 2 }); }
  apron(u0, v0, u1, v1, mat = M.APRON) { this.aprons.push({ u0, v0, u1, v1, mat }); }
  pad(u0, v0, u1, v1, mat, over = false) { this.pads.push({ u0: Math.min(u0, u1), v0: Math.min(v0, v1), u1: Math.max(u0, u1), v1: Math.max(v0, v1), mat, over }); }

  _numeral(text, du, dv, rwWidth) {
    // du: distance from the bottom of the text toward its top; dv: lateral offset from center. Returns true when painted.
    const n = text.length;
    const px = Math.min(2.4, (rwWidth * 0.84) / (n * 5 + (n - 1) * 2));
    const cw = 5 * px, gap = 2 * px;
    const total = n * cw + (n - 1) * gap;
    if (du < 0 || du >= 7 * px) return false;
    const x = dv + total / 2;
    if (x < 0 || x >= total) return false;
    const k = Math.floor(x / (cw + gap));
    const lx = x - k * (cw + gap);
    if (lx >= cw) return false;
    const row = 6 - Math.floor(du / px), col = Math.floor(lx / px);
    const g = FONT[text[k]];
    return g && g[row][col] === '1';
  }

  /** Material for a world point, or 0 when the point is not airfield pavement. */
  paint(x, z, cell) {
    const [u, v] = this.toLocal(x, z);
    const fine = cell <= 1.0;
    for (const rw of this.runways) {
      if (u < rw.u0 - 12 || u > rw.u1 + 12) continue;
      const dv = v - rw.v, adv = Math.abs(dv), hw = rw.w / 2;
      if (adv > hw + 8) continue;
      if (rw.surface === 'grass') {
        if (adv > hw) continue;
        if (u < rw.u0 || u > rw.u1) continue;
        if (fine && (Math.floor((dv + 500) / 3) & 1) === 0) return M.LAWN;
        return M.MOWN_STRIP;
      }
      if (u < rw.u0 || u > rw.u1 || adv > hw) {
        // shoulders and blast pads
        if (adv <= hw + 7 && u >= rw.u0 - 8 && u <= rw.u1 + 8) return M.ASPHALT_WORN;
        continue;
      }
      if (fine) {
        const line = Math.max(0.5, cell * 0.7);
        // edge lines
        if (adv > hw - 1.9 && adv < hw - 1.9 + line + 0.45 && u > rw.u0 + 4 && u < rw.u1 - 4) return M.RUNWAY_MARK;
        const lu = u - rw.u0, ru = rw.u1 - u;
        // centerline dashes
        if (adv < 0.5 + line * 0.4 && lu > 24 && ru > 24 && (lu % 50) < 30) return M.RUNWAY_MARK;
        // threshold bars and aiming points at both ends
        for (const d of [lu, ru]) {
          if (d > 6 && d < 36 && adv > 3.2 && adv < hw - 3) {
            const k = Math.floor((adv - 3.2) / 3.6);
            if ((adv - 3.2 - k * 3.6) < 1.9) return M.RUNWAY_MARK;
          }
          if (d > 300 && d < 345 && adv > 5 && adv < 5 + 3.5 + line) return M.RUNWAY_MARK;
        }
        if (rw.marks) {
          if (rw.marks.west && this._numeral(rw.marks.west, lu - 55, dv, rw.w)) return M.RUNWAY_MARK;
          if (rw.marks.east && this._numeral(rw.marks.east, ru - 55, -dv, rw.w)) return M.RUNWAY_MARK;
        }
      } else if (cell <= 4) {
        if (adv < 1.0 + cell * 0.3 && (u - rw.u0) % 50 < 30) return M.RUNWAY_MARK;
      }
      return M.RUNWAY;
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
      }
      return t.kind === 'apron' ? M.APRON : M.ASPHALT_WORN;
    }
    for (const a of this.aprons) {
      if (u >= a.u0 && u <= a.u1 && v >= a.v0 && v <= a.v1) {
        if (fine && ((Math.abs(u - (a.u0 + a.u1) / 2) % 60) < 0.3) && v > a.v0 + 4 && v < a.v1 - 4 && Math.abs(v - (a.v0 + a.v1) / 2) < 30) return M.TAXI_LINE;
        return a.mat;
      }
    }
    for (const p of this.pads) {
      if (!p.over && u >= p.u0 && u <= p.u1 && v >= p.v0 && v <= p.v1) return p.mat;
    }
    return 0;
  }
}

/** Runway edge, threshold and end lights as scenery props (variants: 0 white, 1 green, 2 red, 3 amber). */
export function runwayLights(af, rw, out) {
  const step = 60;
  for (const s of [-1, 1]) {
    for (let u = rw.u0 + 2; u <= rw.u1 - 2; u += step) {
      const [x, z] = af.toWorld(u, rw.v + s * (rw.w / 2 + 1.2));
      out.props.push({ type: 'runway-light', x, z, yaw: 0, scale: 1, variant: 0 });
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
