import { Noise } from '../../core/noise.js';
import { smoothstep } from '../../core/util.js';
import { createIsland } from './island.js';

/**
 * The slow fields of the island, sampled on a 32 m lattice and interpolated: the land mask, the big hills and plains, and the
 * forest, farmland and moisture noise. Every column of every node used to evaluate about thirty noise octaves for these, all of
 * them with wavelengths of hundreds of meters or more, so a tile of 2 km computed once serves sixty-four nodes of the finest
 * level. Tiles are made on first use and deterministic, so a worker and the main thread agree to the last bit.
 * The fields are smooth enough that bilinear interpolation at 32 m is exact to a few centimeters of height.
 */
const K = 6;
export function createMacro(seed) {
  const island = createIsland(seed);
  const nHill = new Noise(seed ^ 0x303), nF = new Noise(seed ^ 0x707), nFarm = new Noise(seed ^ 0x808), nG = new Noise(seed ^ 0x909);
  const S = 32, N = 64, T = S * N, n = N + 1;
  const tiles = new Map();
  /** Filled by at(): mask, hill (0..1), plains (0..1), forestP, farmP and moist (all 0..1). */
  const out = { mask: 0, hill: 0, plains: 0, forestP: 0, farmP: 0, moist: 0 };

  function tile(tx, tz) {
    const key = (tx + 512) * 1024 + (tz + 512);
    let t = tiles.get(key);
    if (t) return t;
    t = new Float32Array(n * n * K);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = tx * T + i * S, z = tz * T + j * S, o = (j * n + i) * K;
        t[o] = island.mask(x, z, 0);
        t[o + 1] = 0.5 + 0.5 * nHill.fbm2(x / 3800 + 3.1, z / 3800 - 1.7, 5, 2, 0.5, 0);
        t[o + 2] = smoothstep(-0.25, 0.35, nHill.n2(x / 7000 + 8, z / 7000));
        t[o + 3] = 0.5 + 0.5 * nF.fbm2(x / 1700 - 2, z / 1700 + 9, 4);
        t[o + 4] = 0.5 + 0.5 * nFarm.fbm2(x / 1300 + 5, z / 1300, 3);
        t[o + 5] = 0.5 + 0.5 * nG.fbm2(x / 2200 + 3, z / 2200 - 8, 3);
      }
    }
    tiles.set(key, t);
    return t;
  }

  function at(x, z) {
    const fx = x / S, fz = z / S;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const u = fx - ix, v = fz - iz;
    const tx = Math.floor(ix / N), tz = Math.floor(iz / N);
    const t = tile(tx, tz);
    const li = ix - tx * N, lj = iz - tz * N;
    const a = (lj * n + li) * K, b = a + K, c = a + n * K, d = c + K;
    const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
    out.mask = t[a] * w00 + t[b] * w10 + t[c] * w01 + t[d] * w11;
    out.hill = t[a + 1] * w00 + t[b + 1] * w10 + t[c + 1] * w01 + t[d + 1] * w11;
    out.plains = t[a + 2] * w00 + t[b + 2] * w10 + t[c + 2] * w01 + t[d + 2] * w11;
    out.forestP = t[a + 3] * w00 + t[b + 3] * w10 + t[c + 3] * w01 + t[d + 3] * w11;
    out.farmP = t[a + 4] * w00 + t[b + 4] * w10 + t[c + 4] * w01 + t[d + 4] * w11;
    out.moist = t[a + 5] * w00 + t[b + 5] * w10 + t[c + 5] * w01 + t[d + 5] * w11;
    return out;
  }

  /** enabled is switched off around work that samples sparsely (calibration, rivers, the highway cost grid): a tile costs as much
      as several thousand ordinary samples, which only pays off once many nearby columns share it. */
  return { at, out, tileCount: () => tiles.size, maxCell: 48, enabled: true };
}
