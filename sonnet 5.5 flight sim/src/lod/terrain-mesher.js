import { M, PALETTE_FLAGS, FL } from '../voxel/palette.js';

const SKIRT = 3;
const isWater = (m) => (PALETTE_FLAGS[m] & FL.WATER) !== 0;

/** Reusable column buffers so node building does not allocate per node. */
export class ColumnBuf {
  constructor(N) {
    this.N = N;
    const W = N + 2;
    this.W = W;
    this.surf = new Float64Array(W * W);
    this.hq = new Int32Array(W * W);
    this.mat = new Uint8Array(W * W);
    this.sub = new Uint8Array(W * W);
    this.water = new Float64Array(W * W);
    this.hydro = new Uint8Array(W * W);
    this.mm = new Float32Array(W * W);
    this.bed = new Float64Array(W * W);
    /** Smooth surface normal (r = x, g = z, both biased) and open-sky share (b) per cell, N by N, for the shader. */
    this.tn = new Uint8Array(N * N * 4);
  }
}

/**
 * Samples the terrain into a (N+2)^2 grid (one border column on each side). Materials are resolved for interior
 * columns only. Water columns are flattened to their surface; road paint over rivers raises a causeway.
 */
export function sampleColumns(world, x0, z0, cell, N, buf) {
  const { terrain, surface } = world;
  const W = N + 2;
  const s = { h: 0, m: 0, water: NaN };
  for (let j = -1; j <= N; j++) {
    for (let i = -1; i <= N; i++) {
      const a = (j + 1) * W + i + 1;
      buf.surf[a] = terrain.sample(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell, cell, s);
      buf.bed[a] = s.bed;
      buf.water[a] = s.water;
      buf.hydro[a] = s.hydro || 0;
      buf.mm[a] = s.m;
    }
  }
  const sv = { m: 0, bed: 0, water: NaN, hydro: 0 };
  const inv = 1 / (2 * cell);
  let minH = 1e9, maxH = -1e9;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = (j + 1) * W + i + 1;
      const h = buf.surf[a];
      const gx = (buf.bed[a + 1] - buf.bed[a - 1]) * inv, gz = (buf.bed[a + W] - buf.bed[a - W]) * inv;
      const slope = Math.sqrt(gx * gx + gz * gz);
      sv.m = buf.mm[a]; sv.bed = buf.bed[a]; sv.water = buf.water[a]; sv.hydro = buf.hydro[a];
      const mat = surface.at(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell, h, slope, cell, sv);
      buf.mat[a] = mat;
      buf.sub[a] = surface.sub(mat, h, slope);
      let top = h;
      if (buf.hydro[a] && !isWater(mat)) top = buf.water[a] + 1.0;
      buf.surf[a] = top;
      if (top < minH) minH = top;
      if (top > maxH) maxH = top;
    }
  }
  const eps = 1e-6;
  for (let a = 0; a < W * W; a++) buf.hq[a] = Math.floor(buf.surf[a] / cell + eps);
  buf.minH = minH; buf.maxH = maxH;
  terrainNormals(buf, N, cell);
}

/**
 * Smooth shading data for the ground. The voxel columns are stepped, but the height function under them is not, so the
 * shader takes the light from a Sobel normal of the true heights (bilinear across the node) instead of from flat treads
 * and dark risers: hills read as hills at every level of detail and gentle slopes lose their contour lines.
 * The blue channel is a cheap cavity term from the same heights: valley floors are a little darker, ridges stay open.
 */
export function terrainNormals(buf, N, cell) {
  const W = buf.W, h = buf.surf, out = buf.tn;
  const k = 1 / (8 * cell), maxSlope = 2.2;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = (j + 1) * W + i + 1;
      const gx = ((h[a - W + 1] + 2 * h[a + 1] + h[a + W + 1]) - (h[a - W - 1] + 2 * h[a - 1] + h[a + W - 1])) * k;
      const gz = ((h[a + W - 1] + 2 * h[a + W] + h[a + W + 1]) - (h[a - W - 1] + 2 * h[a - W] + h[a - W + 1])) * k;
      const gl = Math.sqrt(gx * gx + gz * gz);
      const sc = gl > maxSlope ? maxSlope / gl : 1;
      const ex = gx * sc, ez = gz * sc;
      const inv = 1 / Math.sqrt(1 + ex * ex + ez * ez);
      const nx = -ex * inv, nz = -ez * inv;
      // concavity: how far the four neighbors sit above this cell, in cells (positive in a hollow)
      const lap = (h[a - 1] + h[a + 1] + h[a - W] + h[a + W]) * 0.25 - h[a];
      const cav = Math.max(0, Math.min(1, lap / cell));
      const o = (j * N + i) * 4;
      out[o] = Math.round((nx * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((nz * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((1 - 0.5 * cav) * 255);
      out[o + 3] = 255;
    }
  }
}

/** Emits a wall quad. dir: 0 +x, 1 -x, 2 +z, 3 -z. (a0..a1) is the run along the wall, plane is the wall coordinate. A soft wall
    is lit from the smooth ground normal; its ao value is not occlusion but how far to trust that normal (3 for a small step that
    belongs to the slope, 0 for a real cliff face). */
function wall(b, dir, plane, a0, a1, yb, yt, mat, soft = 0, aoc = 3) {
  if (yt <= yb) return;
  switch (dir) {
    case 0: b.quad(plane, yb, a0, plane, yt, a0, plane, yt, a1, plane, yb, a1, 0, mat, aoc, aoc, aoc, aoc, soft); break;
    case 1: b.quad(plane, yb, a0, plane, yb, a1, plane, yt, a1, plane, yt, a0, 1, mat, aoc, aoc, aoc, aoc, soft); break;
    case 2: b.quad(a0, yb, plane, a1, yb, plane, a1, yt, plane, a0, yt, plane, 4, mat, aoc, aoc, aoc, aoc, soft); break;
    default: b.quad(a0, yb, plane, a0, yt, plane, a1, yt, plane, a1, yb, plane, 5, mat, aoc, aoc, aoc, aoc, soft);
  }
}

/** Greedy terrain mesher over sampled columns. Positions are cell units local to the node, y absolute. */
export function meshTerrain(buf, N, builder) {
  const W = buf.W;
  const { hq, mat, sub } = buf;
  const mask = new Int32Array(N * N);
  // top faces
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = (j + 1) * W + i + 1;
    mask[j * N + i] = hq[a] * 256 + mat[a] + 1; // +1 keeps 0 as "empty"; hq >= 0 always
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N;) {
      const key = mask[j * N + i];
      if (key === 0) { i++; continue; }
      let w = 1;
      while (i + w < N && mask[j * N + i + w] === key) w++;
      let h = 1;
      outer: for (; j + h < N; h++) for (let q = 0; q < w; q++) if (mask[(j + h) * N + i + q] !== key) break outer;
      for (let l = 0; l < h; l++) mask.fill(0, (j + l) * N + i, (j + l) * N + i + w);
      const y = Math.floor((key - 1) / 256), m = (key - 1) & 255;
      builder.quad(i, y, j, i, y, j + h, i + w, y, j + h, i + w, y, j, 2, m, 3, 3, 3, 3, 1);
      i += w;
    }
  }
  // walls: per direction, per wall line, merge runs
  const wallKey = (a, n, edge) => {
    const top = hq[a], nb = hq[n];
    let yb;
    if (edge) yb = Math.min(nb, top - SKIRT);
    else if (top > nb) yb = nb; else return 0;
    if (yb >= top) return 0;
    return { yb, top, mt: mat[a], ms: sub[a] };
  };
  const emit = (dir, plane, a0, a1, k) => {
    // a step of up to three cells is part of the slope: it wears the surface material and is lit like the ground beside it, so a
    // gentle hillside has no contour lines. Taller drops are cliffs: rock below, a softened cap above.
    const hgt = k.top - k.yb;
    if (hgt <= 3) wall(builder, dir, plane, a0, a1, k.yb, k.top, k.mt, 1, 3);
    else {
      wall(builder, dir, plane, a0, a1, k.yb, k.top - 1, k.ms);
      wall(builder, dir, plane, a0, a1, k.top - 1, k.top, k.mt, 1, 1);
    }
  };
  const same = (p, q) => p && q && p.yb === q.yb && p.top === q.top && p.mt === q.mt && p.ms === q.ms;
  // +x and -x walls: lines indexed by i, runs along j
  for (let dir = 0; dir < 2; dir++) {
    for (let i = 0; i < N; i++) {
      let run = null, start = 0;
      for (let j = 0; j <= N; j++) {
        let k = null;
        if (j < N) {
          const a = (j + 1) * W + i + 1;
          const edge = dir === 0 ? i === N - 1 : i === 0;
          k = wallKey(a, dir === 0 ? a + 1 : a - 1, edge);
        }
        if (!same(run, k)) {
          if (run) emit(dir, dir === 0 ? i + 1 : i, start, j, run);
          run = k; start = j;
        }
      }
    }
  }
  // +z and -z walls: lines indexed by j, runs along i
  for (let dir = 2; dir < 4; dir++) {
    for (let j = 0; j < N; j++) {
      let run = null, start = 0;
      for (let i = 0; i <= N; i++) {
        let k = null;
        if (i < N) {
          const a = (j + 1) * W + i + 1;
          const edge = dir === 2 ? j === N - 1 : j === 0;
          k = wallKey(a, dir === 2 ? a + W : a - W, edge);
        }
        if (!same(run, k)) {
          if (run) emit(dir, dir === 2 ? j + 1 : j, start, i, run);
          run = k; start = i;
        }
      }
    }
  }
}

/** Flat ocean tile: a single quad plus nothing else. */
export function meshOceanTile(builder, N, mat = M.WATER_5) {
  builder.quad(0, 0, 0, 0, 0, N, N, 0, N, N, 0, 0, 2, mat);
}
