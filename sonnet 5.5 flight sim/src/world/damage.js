import { M } from '../voxel/palette.js';
import { hash2, hash3, rand2, rand3 } from '../core/util.js';

/* The scars of the flight: every explosion is one entry in a list, and everything the world draws or collides with is still a
   pure function of position, now of position and that list. The list is mirrored into every worker, so a node built after a
   blast, or rebuilt because of one, carves the same crater, bites the same chunk out of the same building and leaves the same
   trees standing or not, on the main thread and off it.

   A blast is { x, y, z, r, seed }: its center in meters and its lethal radius. The crater in the ground is a bowl of 0.72 r with
   a raised rim; buildings lose everything inside 1.1 r; trees and props inside r. */

const CELL = 64;
const MAX_BLASTS = 480;
const gkey = (cx, cz) => (cx + 2048) * 4096 + (cz + 2048);

/** Smooth value noise in three dimensions, -1 to 1. Cheap enough for a per-voxel carve. */
function vn3(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const h = (a, b, c) => hash3(ix + a, iy + b, iz + c, seed) / 2147483648 - 1;
  const x00 = h(0, 0, 0) + (h(1, 0, 0) - h(0, 0, 0)) * sx, x10 = h(0, 1, 0) + (h(1, 1, 0) - h(0, 1, 0)) * sx;
  const x01 = h(0, 0, 1) + (h(1, 0, 1) - h(0, 0, 1)) * sx, x11 = h(0, 1, 1) + (h(1, 1, 1) - h(0, 1, 1)) * sx;
  const y0 = x00 + (x10 - x00) * sy, y1 = x01 + (x11 - x01) * sy;
  return y0 + (y1 - y0) * sz;
}

function vn2(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const h = (a, b) => hash2(ix + a, iz + b, seed) / 2147483648 - 1;
  const a = h(0, 0) + (h(1, 0) - h(0, 0)) * sx, b = h(0, 1) + (h(1, 1) - h(0, 1)) * sx;
  return a + (b - a) * sz;
}

export class DamageField {
  constructor() {
    this.list = [];
    this.rev = 0;
    this.grid = new Map();
  }

  get count() { return this.list.length; }

  clear() {
    this.list = [];
    this.grid.clear();
    this.rev++;
  }

  /** Replace the whole list (a worker receiving the main thread's list). */
  setAll(list, rev) {
    this.list = [];
    this.grid.clear();
    let n = 0;
    for (const b of list) { this.rev = ++n; this._insert(b); }
    this.rev = rev;
  }

  /** Record a blast and return it with its derived crater numbers. */
  add({ x, y, z, r, seed = 0, kind = 'blast' }) {
    r = Math.max(1, r);
    const b = this._insert({ x, y, z, r, seed: seed | 0 || ((Math.floor(x * 7.3) ^ Math.floor(z * 3.1) ^ this.rev * 977) | 0), kind });
    this.rev++;
    return b;
  }

  _insert(b) {
    const rc = b.r * 0.8;
    const e = { ...b, rc, D: Math.min(rc * 0.38, 11), reach: rc * 2.6, rev: this.rev + 1 };
    e.reach2 = e.reach * e.reach;
    this.list.push(e);
    if (this.list.length > MAX_BLASTS) { this.list.shift(); this._reindex(); } else this._index(e);
    return e;
  }

  _index(e) {
    const x0 = Math.floor((e.x - e.reach) / CELL), x1 = Math.floor((e.x + e.reach) / CELL);
    const z0 = Math.floor((e.z - e.reach) / CELL), z1 = Math.floor((e.z + e.reach) / CELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const k = gkey(cx, cz);
      let c = this.grid.get(k);
      if (!c) this.grid.set(k, (c = []));
      c.push(e);
    }
  }

  _reindex() { this.grid.clear(); for (const e of this.list) this._index(e); }

  /** Blasts whose reach touches a rectangle. */
  near(x0, z0, x1, z1, pad = 0, out = []) {
    out.length = 0;
    if (!this.list.length) return out;
    const cx0 = Math.floor((x0 - pad) / CELL), cx1 = Math.floor((x1 + pad) / CELL), cz0 = Math.floor((z0 - pad) / CELL), cz1 = Math.floor((z1 + pad) / CELL);
    if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 400) {
      for (const e of this.list) if (e.x + e.reach + pad >= x0 && e.x - e.reach - pad <= x1 && e.z + e.reach + pad >= z0 && e.z - e.reach - pad <= z1) out.push(e);
      return out;
    }
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.grid.get(gkey(cx, cz));
      if (!c) continue;
      for (const e of c) if (!out.includes(e) && e.x + e.reach + pad >= x0 && e.x - e.reach - pad <= x1 && e.z + e.reach + pad >= z0 && e.z - e.reach - pad <= z1) out.push(e);
    }
    return out;
  }

  /** The newest blast that reaches a rectangle (its revision), or 0: a cache of something that stands there stays good until this changes. */
  revNear(x0, z0, x1, z1) {
    if (!this.list.length) return 0;
    let best = 0;
    const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cz0 = Math.floor(z0 / CELL), cz1 = Math.floor(z1 / CELL);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.grid.get(gkey(cx, cz));
      if (!c) continue;
      for (let i = 0; i < c.length; i++) { const e = c[i]; if (e.rev > best && e.x + e.reach >= x0 && e.x - e.reach <= x1 && e.z + e.reach >= z0 && e.z - e.reach <= z1) best = e.rev; }
    }
    return best;
  }

  /** Does any blast reach this rectangle? */
  touches(x0, z0, x1, z1, pad = 0) { return this.near(x0, z0, x1, z1, pad, this._tmp || (this._tmp = [])).length > 0; }

  // ------------------------------------------------------------------ the ground
  /** Change of the ground height at a point, in meters: a bowl inside the crater, a low rim around it. */
  dh(x, z) {
    if (!this.list.length) return 0;
    const c = this.grid.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!c) return 0;
    let bowl = 0, rim = 0;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      const dx = x - b.x, dz = z - b.z, d2 = dx * dx + dz * dz;
      if (d2 > b.reach2) continue;
      const d = Math.sqrt(d2);
      const rcn = b.rc * (1 + 0.13 * vn2(x * 0.23, z * 0.23, b.seed));
      if (d < rcn) {
        const t = d / rcn;
        const v = -b.D * (1 - t * t) * (1 + 0.09 * vn2(x * 0.9, z * 0.9, b.seed ^ 77));
        if (v < bowl) bowl = v;
      } else if (d < rcn * 1.4) {
        const t = (d - rcn) / (rcn * 0.4);
        const v = b.D * 0.2 * Math.sin(Math.PI * t) * (0.8 + 0.2 * vn2(x * 0.6, z * 0.6, b.seed ^ 31));
        if (v > rim) rim = v;
      }
    }
    return bowl < 0 ? bowl : rim;
  }

  /** Surface material over a scar, or 0 when the ground is untouched there. */
  mat(x, z) {
    if (!this.list.length) return 0;
    const c = this.grid.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!c) return 0;
    let best = 0, rank = 0;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      const dx = x - b.x, dz = z - b.z, d2 = dx * dx + dz * dz;
      if (d2 > b.reach2) continue;
      const d = Math.sqrt(d2);
      const rcn = b.rc * (1 + 0.13 * vn2(x * 0.23, z * 0.23, b.seed));
      let m = 0, k = 0;
      if (d < rcn * 0.64) { m = M.SCORCH; k = 4; }
      else if (d < rcn) { m = M.DIRT_DARK; k = 3; }
      else if (d < rcn * 1.45) { m = vn2(x * 0.7, z * 0.7, b.seed ^ 5) > 0.1 ? M.ASH : M.DIRT_DARK; k = 2; }
      else {
        // a burned halo that frays outward
        const f = 1 - (d - rcn * 1.45) / (b.reach - rcn * 1.45);
        if (f > 0 && rand2(Math.floor(x * 0.9), Math.floor(z * 0.9), b.seed) < 0.7 * f * f) { m = M.SCORCH; k = 1; }
      }
      if (k > rank) { rank = k; best = m; }
    }
    return best;
  }

  /** True when scenery at this point does not survive: trees, lamps, fences and signs inside the blast. */
  removes(x, y, z) {
    if (!this.list.length) return false;
    const c = this.grid.get(gkey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!c) return false;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      const dx = x - b.x, dz = z - b.z;
      const r = b.r * 1.02 + 0.8;
      if (dx * dx + dz * dz < r * r && y < b.y + b.r * 1.3 + 4) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ structures
  /**
   * Take the blasts out of a rasterized structure: voxels inside a ragged sphere are gone, a thin shell around the hole is
   * charred, and any piece the blast leaves with no way down to the ground falls too. Cells are `cell` meters and the
   * volume's corner is at lattice cell (i0, j0, k0). `groundY` is the foot of the structure: anything touching it stands.
   * Returns how many voxels were taken out.
   */
  carveVolume(vol, i0, j0, k0, cell, groundY) {
    if (!this.list.length) return 0;
    const wx0 = i0 * cell, wy0 = j0 * cell, wz0 = k0 * cell;
    const wx1 = wx0 + vol.nx * cell, wy1 = wy0 + vol.ny * cell, wz1 = wz0 + vol.nz * cell;
    const hits = this.near(wx0, wz0, wx1, wz1, 0, []);
    if (!hits.length) return 0;
    const data = vol.data, sx = vol.sx, sy = vol.sy, sz = vol.sz;
    let removed = 0;
    const touched = [];
    for (const b of hits) {
      const R = b.r * 1.1;
      if (b.x + R < wx0 || b.x - R > wx1 || b.y + R < wy0 || b.y - R > wy1 || b.z + R < wz0 || b.z - R > wz1) continue;
      const char = Math.max(0.7, cell * 1.1);
      const ia = Math.max(0, Math.floor((b.x - R - char) / cell) - i0), ib = Math.min(vol.nx - 1, Math.ceil((b.x + R + char) / cell) - i0);
      const ja = Math.max(0, Math.floor((b.y - R - char) / cell) - j0), jb = Math.min(vol.ny - 1, Math.ceil((b.y + R + char) / cell) - j0);
      const ka = Math.max(0, Math.floor((b.z - R - char) / cell) - k0), kb = Math.min(vol.nz - 1, Math.ceil((b.z + R + char) / cell) - k0);
      let any = 0;
      for (let k = ka; k <= kb; k++) {
        const wz = (k0 + k + 0.5) * cell, dz = wz - b.z;
        for (let j = ja; j <= jb; j++) {
          const wy = (j0 + j + 0.5) * cell, dy = wy - b.y;
          let di = (ia + 1) + (k + 1) * sz + (j + 1) * sy;
          for (let i = ia; i <= ib; i++, di++) {
            const m = data[di];
            if (!m) continue;
            const wx = (i0 + i + 0.5) * cell, dx = wx - b.x;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > (R + char) * (R + char)) continue;
            const d = Math.sqrt(d2);
            // a ragged edge: broad lumps plus a fine chew
            const rr = R * (0.86 + 0.2 * vn3(wx * 0.17, wy * 0.17, wz * 0.17, b.seed) + 0.12 * (rand3(i0 + i, j0 + j, k0 + k, b.seed ^ 9) - 0.5));
            if (d < rr) { data[di] = 0; removed++; any = 1; }
            else if (d < rr + char * (0.6 + 0.6 * rand3(i0 + i, j0 + j, k0 + k, b.seed ^ 3))) data[di] = M.SCORCH;
          }
        }
      }
      if (any) touched.push([ia, ib, ja, jb, ka, kb]);
    }
    if (!removed) return 0;
    // what is left standing on nothing comes down with the rest
    const groundJ = Math.floor(groundY / cell) - j0 + 1;
    const gone = this._dropUnsupported(vol, touched, groundJ);
    return removed + gone;
  }

  /** Remove the pieces of a volume that no longer touch the ground, looking only next to the holes that were just cut. */
  _dropUnsupported(vol, boxes, groundJ) {
    const { nx, ny, nz, sx, sy, sz, data } = vol;
    const state = new Uint8Array(data.length);          // 1 = being explored, 2 = supported, 3 = falling
    const stack = new Int32Array(Math.min(data.length, 1 << 21) + 16);
    const comp = [];
    let gone = 0;
    const dirs = [1, -1, sz, -sz, sy, -sy];
    for (const [ia, ib, ja, jb, ka, kb] of boxes) {
      const pad = 2;
      for (let k = Math.max(0, ka - pad); k <= Math.min(nz - 1, kb + pad); k++) for (let j = Math.max(0, ja - pad); j <= Math.min(ny - 1, jb + pad); j++) for (let i = Math.max(0, ia - pad); i <= Math.min(nx - 1, ib + pad); i++) {
        const seed = (i + 1) + (k + 1) * sz + (j + 1) * sy;
        if (!data[seed] || state[seed]) continue;
        // breadth-first over the piece; stop the moment it reaches the ground
        let sp = 0, supported = false;
        comp.length = 0;
        stack[sp++] = seed; state[seed] = 1;
        while (sp > 0) {
          const c = stack[--sp];
          comp.push(c);
          const jy = ((c / sy) | 0) - 1;
          if (jy <= groundJ) { supported = true; break; }
          for (let d = 0; d < 6; d++) {
            const n = c + dirs[d];
            if (!data[n]) continue;
            if (state[n] === 2) { supported = true; break; }
            if (state[n]) continue;
            state[n] = 1;
            if (sp < stack.length) stack[sp++] = n; else { supported = true; break; }   // an enormous piece: leave it standing
          }
          if (supported) break;
        }
        const mark = supported ? 2 : 3;
        for (let q = 0; q < comp.length; q++) state[comp[q]] = mark;
        if (supported) {
          // the rest of the stack belongs to the same piece
          while (sp > 0) state[stack[--sp]] = 2;
        } else for (let q = 0; q < comp.length; q++) { data[comp[q]] = 0; gone++; }
      }
    }
    return gone;
  }
}

/** The one blast list of this JavaScript realm: the page has its own, every worker has its own, and they are kept equal. */
export const DAMAGE = new DamageField();
