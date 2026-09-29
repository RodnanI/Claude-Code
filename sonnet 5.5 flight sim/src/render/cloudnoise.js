
/** Tileable 3D noise volume for volumetric clouds: R low-frequency Perlin-Worley, G/B/A Worley at rising frequencies. */
export function buildCloudNoise(size = 48, seed = 7) {
  const wrap = (v, n) => ((v % n) + n) % n;
  const rand3 = (x, y, z, s, n) => {
    let h = (Math.imul(wrap(x, n), 374761393) ^ Math.imul(wrap(y, n), 668265263) ^ Math.imul(wrap(z, n), 2147483647) ^ Math.imul(s, 1274126177)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return [(h & 255) / 255, ((h >>> 8) & 255) / 255, ((h >>> 16) & 255) / 255];
  };
  const worley = (u, v, w, cells, s) => {
    const x = u * cells, y = v * cells, z = w * cells;
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let d2 = 9;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const r = rand3(ix + i, iy + j, iz + k, s, cells);
      const dx = ix + i + r[0] - x, dy = iy + j + r[1] - y, dz = iz + k + r[2] - z;
      d2 = Math.min(d2, dx * dx + dy * dy + dz * dz);
    }
    return 1 - Math.min(1, Math.sqrt(d2));
  };
  const grad = (ix, iy, iz, n, s) => {
    const r = rand3(ix, iy, iz, s + 99, n);
    return [r[0] * 2 - 1, r[1] * 2 - 1, r[2] * 2 - 1];
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const perlin = (u, v, w, cells, s) => {
    const x = u * cells, y = v * cells, z = w * cells;
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    let acc = 0;
    const sx = fade(fx), sy = fade(fy), sz = fade(fz);
    for (let k = 0; k <= 1; k++) for (let j = 0; j <= 1; j++) for (let i = 0; i <= 1; i++) {
      const g = grad(ix + i, iy + j, iz + k, cells, s);
      const dot = g[0] * (fx - i) + g[1] * (fy - j) + g[2] * (fz - k);
      const wgt = (i ? sx : 1 - sx) * (j ? sy : 1 - sy) * (k ? sz : 1 - sz);
      acc += dot * wgt;
    }
    return acc * 0.5 + 0.5;
  };
  const data = new Uint8Array(size * size * size * 4);
  let o = 0;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, w = z / size;
    const pf = perlin(u, v, w, 4, 1) * 0.55 + perlin(u, v, w, 8, 2) * 0.3 + perlin(u, v, w, 16, 3) * 0.15;
    const w1 = worley(u, v, w, 4, 11), w2 = worley(u, v, w, 8, 12), w3 = worley(u, v, w, 16, 13);
    // Perlin-Worley: remap Perlin by the low-frequency Worley for billowy cauliflower shapes
    const pw = Math.min(1, Math.max(0, (pf - (1 - (w1 * 0.6 + w2 * 0.4))) / Math.max(1e-3, 1 - (1 - (w1 * 0.6 + w2 * 0.4)))));
    data[o++] = Math.round(Math.min(1, pw * 0.75 + pf * 0.25) * 255);
    data[o++] = Math.round(w2 * 255);
    data[o++] = Math.round(w3 * 255);
    data[o++] = Math.round(worley(u, v, w, 24, 14) * 255);
  }
  return { size, data };
}
