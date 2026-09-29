/* Vertex layout, 8 bytes: i16 x, y, z, w where w packs face (3 bits) | ambient occlusion (2 bits) | material id (8 bits) | flags (bits 13 to 15).
   Flag bit 0 (w bit 13) marks terrain step walls, which the shader lights with a normal leaning toward the sky so gentle slopes do not show contour lines.
   Flag bits 1 and 2 (w bits 14 and 15) are the color bank of the structure, 0 to 3, so buildings that share a material still differ in color.
   Colors and every other material property come from the palette texture in the shader. */
export const VERTEX_STRIDE = 8;

/** Growable interleaved mesh builder shared by every mesher in the project. */
export class MeshBuilder {
  constructor(quadHint = 512) {
    this.cap = Math.max(256, quadHint * 4);
    this.buf = new ArrayBuffer(this.cap * VERTEX_STRIDE);
    this.i16 = new Int16Array(this.buf);
    this.vc = 0;
    this.icap = this.cap * 2;
    this.idx = new Uint32Array(this.icap);
    this.ic = 0;
    this.minx = 1e9; this.miny = 1e9; this.minz = 1e9;
    this.maxx = -1e9; this.maxy = -1e9; this.maxz = -1e9;
    this.bankBits = 0;
  }

  /** Color bank (0 to 3) written into every vertex added from now on. */
  setBank(b) { this.bankBits = (b & 3) << 1; }

  _growV() {
    this.cap *= 2;
    const nb = new ArrayBuffer(this.cap * VERTEX_STRIDE);
    new Uint8Array(nb).set(new Uint8Array(this.buf));
    this.buf = nb;
    this.i16 = new Int16Array(nb);
  }
  _growI() {
    this.icap *= 2;
    const n = new Uint32Array(this.icap);
    n.set(this.idx);
    this.idx = n;
  }

  vert(x, y, z, face, mat, ao, flags = 0) {
    if (this.vc >= this.cap) this._growV();
    const o = this.vc * 4;
    const i16 = this.i16;
    i16[o] = x; i16[o + 1] = y; i16[o + 2] = z; i16[o + 3] = face | (ao << 3) | (mat << 5) | ((flags | this.bankBits) << 13);
    if (x < this.minx) this.minx = x; if (x > this.maxx) this.maxx = x;
    if (y < this.miny) this.miny = y; if (y > this.maxy) this.maxy = y;
    if (z < this.minz) this.minz = z; if (z > this.maxz) this.maxz = z;
    return this.vc++;
  }

  /** Corners must be counter-clockwise as seen from the outside (normal side). */
  quad(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, face, mat, a0 = 3, a1 = 3, a2 = 3, a3 = 3, flags = 0) {
    const v0 = this.vert(x0, y0, z0, face, mat, a0, flags);
    const v1 = this.vert(x1, y1, z1, face, mat, a1, flags);
    const v2 = this.vert(x2, y2, z2, face, mat, a2, flags);
    const v3 = this.vert(x3, y3, z3, face, mat, a3, flags);
    if (this.ic + 6 > this.icap) this._growI();
    const idx = this.idx;
    let n = this.ic;
    if (a0 + a2 > a1 + a3) {
      idx[n++] = v0; idx[n++] = v1; idx[n++] = v2; idx[n++] = v0; idx[n++] = v2; idx[n++] = v3;
    } else {
      idx[n++] = v0; idx[n++] = v1; idx[n++] = v3; idx[n++] = v1; idx[n++] = v2; idx[n++] = v3;
    }
    this.ic = n;
  }

  /** Copy another finished mesh in, offset by integer cell coordinates. */
  append(mesh, dx = 0, dy = 0, dz = 0) {
    if (!mesh || !mesh.vertexCount) return;
    const src = new Int16Array(mesh.vertexData);
    while (this.vc + mesh.vertexCount > this.cap) this._growV();
    while (this.ic + mesh.indexCount > this.icap) this._growI();
    const base = this.vc;
    for (let i = 0; i < mesh.vertexCount; i++) {
      const o = (base + i) * 4, s = i * 4;
      const x = src[s] + dx, y = src[s + 1] + dy, z = src[s + 2] + dz;
      this.i16[o] = x; this.i16[o + 1] = y; this.i16[o + 2] = z; this.i16[o + 3] = src[s + 3];
      if (x < this.minx) this.minx = x; if (x > this.maxx) this.maxx = x;
      if (y < this.miny) this.miny = y; if (y > this.maxy) this.maxy = y;
      if (z < this.minz) this.minz = z; if (z > this.maxz) this.maxz = z;
    }
    for (let i = 0; i < mesh.indexCount; i++) this.idx[this.ic + i] = mesh.indexData[i] + base;
    this.vc += mesh.vertexCount;
    this.ic += mesh.indexCount;
  }

  get quadCount() { return this.ic / 6; }

  finish() {
    const vertexData = this.buf.slice(0, this.vc * VERTEX_STRIDE);
    const indexData = this.vc <= 65535 ? Uint16Array.from(this.idx.subarray(0, this.ic)) : this.idx.slice(0, this.ic);
    return {
      vertexData,
      vertexCount: this.vc,
      indexData,
      indexCount: this.ic,
      bounds: this.vc ? [this.minx, this.miny, this.minz, this.maxx, this.maxy, this.maxz] : [0, 0, 0, 0, 0, 0],
    };
  }
}

/**
 * Greedy mesh a Volume. Faces merge only when material and all four AO corner values match, and only along
 * directions where the AO pattern is uniform, so merged quads interpolate correctly.
 * Output positions are in cell units relative to the volume's minimum corner.
 */
export function meshVolume(vol, opts = {}) {
  const useAO = opts.ao !== false;
  const builder = opts.builder || new MeshBuilder(1024);
  const dm = [vol.nx, vol.ny, vol.nz];
  const st = [vol.sx, vol.sy, vol.sz];
  const data = vol.data;
  const sc = new Int32Array(12);
  const off = opts.offset || [0, 0, 0];
  const scale = opts.scale || 1;

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    const du = dm[u], dv = dm[v];
    const mask = new Int32Array(du * dv);
    const sd = st[d], su = st[u], sv = st[v];
    for (let k = 0; k <= dm[d]; k++) {
      // Build mask of faces between layer k-1 and layer k.
      let n = 0;
      let any = false;
      for (let j = 0; j < dv; j++) {
        for (let i = 0; i < du; i++, n++) {
          // padded index of voxel (i, j) in layer k-1
          const idxB = (i + 1) * su + (j + 1) * sv + (k + 1) * sd; // layer k
          const idxA = idxB - sd; // layer k-1
          const a = data[idxA], b = data[idxB];
          if ((a !== 0) === (b !== 0)) { mask[n] = 0; continue; }
          any = true;
          let m, layerIdx, back;
          if (a !== 0) { m = a; layerIdx = idxB; back = 0; } else { m = b; layerIdx = idxA; back = 1; }
          let code = m | (back << 16);
          if (useAO) {
            const nx1 = data[layerIdx - su] !== 0 ? 1 : 0, px1 = data[layerIdx + su] !== 0 ? 1 : 0;
            const ny1 = data[layerIdx - sv] !== 0 ? 1 : 0, py1 = data[layerIdx + sv] !== 0 ? 1 : 0;
            const c00 = data[layerIdx - su - sv] !== 0 ? 1 : 0, c10 = data[layerIdx + su - sv] !== 0 ? 1 : 0;
            const c11 = data[layerIdx + su + sv] !== 0 ? 1 : 0, c01 = data[layerIdx - su + sv] !== 0 ? 1 : 0;
            const a0 = nx1 && ny1 ? 0 : 3 - (nx1 + ny1 + c00);
            const a1 = px1 && ny1 ? 0 : 3 - (px1 + ny1 + c10);
            const a2 = px1 && py1 ? 0 : 3 - (px1 + py1 + c11);
            const a3 = nx1 && py1 ? 0 : 3 - (nx1 + py1 + c01);
            code |= (a0 << 8) | (a1 << 10) | (a2 << 12) | (a3 << 14);
          } else {
            code |= (3 << 8) | (3 << 10) | (3 << 12) | (3 << 14);
          }
          mask[n] = code;
        }
      }
      if (!any) continue;

      // Greedy merge.
      n = 0;
      for (let j = 0; j < dv; j++) {
        for (let i = 0; i < du;) {
          const c = mask[n];
          if (c === 0) { i++; n++; continue; }
          const a0 = (c >> 8) & 3, a1 = (c >> 10) & 3, a2 = (c >> 12) & 3, a3 = (c >> 14) & 3;
          const uniU = a0 === a1 && a3 === a2;
          const uniV = a0 === a3 && a1 === a2;
          let w = 1;
          if (uniU) while (i + w < du && mask[n + w] === c) w++;
          let h = 1;
          if (uniV) {
            outer: for (; j + h < dv; h++) {
              for (let q = 0; q < w; q++) if (mask[n + q + h * du] !== c) break outer;
            }
          }
          // Emit quad.
          const mat = c & 255;
          const back = (c >> 16) & 1;
          const face = d * 2 + back;
          // corners in (u,v) space, written straight into scratch without allocating
          const cu0 = i, cu1 = i + w, cv0 = j, cv1 = j + h;
          const kd = k * scale + off[d], u0 = cu0 * scale + off[u], u1 = cu1 * scale + off[u], v0 = cv0 * scale + off[v], v1 = cv1 * scale + off[v];
          sc[d] = kd; sc[u] = u0; sc[v] = v0;
          sc[3 + d] = kd; sc[3 + u] = u1; sc[3 + v] = v0;
          sc[6 + d] = kd; sc[6 + u] = u1; sc[6 + v] = v1;
          sc[9 + d] = kd; sc[9 + u] = u0; sc[9 + v] = v1;
          if (!back) {
            builder.quad(sc[0], sc[1], sc[2], sc[3], sc[4], sc[5], sc[6], sc[7], sc[8], sc[9], sc[10], sc[11], face, mat, a0, a1, a2, a3);
          } else {
            builder.quad(sc[0], sc[1], sc[2], sc[9], sc[10], sc[11], sc[6], sc[7], sc[8], sc[3], sc[4], sc[5], face, mat, a0, a3, a2, a1);
          }
          for (let l = 0; l < h; l++) mask.fill(0, n + l * du, n + l * du + w);
          i += w; n += w;
        }
      }
    }
  }
  return opts.builder ? null : builder.finish();
}
