export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const saturate = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (a, b, x) => {
  const t = saturate((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, x) => {
  const t = saturate((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const mix = lerp;
export const mod = (a, n) => ((a % n) + n) % n;
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const wrapPi = (a) => {
  a = mod(a + Math.PI, TAU);
  return a - Math.PI;
};
export const approach = (cur, target, maxStep) =>
  cur < target ? Math.min(cur + maxStep, target) : Math.max(cur - maxStep, target);
export const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));

/** 32-bit integer hash of two ints plus seed. Pure integer math so results match across engines. */
export function hash2(ix, iz, seed = 0) {
  let h = (Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
export function hash3(ix, iy, iz, seed = 0) {
  return hash2(hash2(ix, iy, seed), iz, seed ^ 0x5bd1e995);
}
export const hashUnit = (h) => h / 4294967296;
export const rand2 = (ix, iz, seed = 0) => hash2(ix, iz, seed) / 4294967296;
export const rand3 = (ix, iy, iz, seed = 0) => hash3(ix, iy, iz, seed) / 4294967296;

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Distance from point to segment, also returns parameter t via out.t when given. */
export function distToSegment(px, pz, ax, az, bx, bz, out) {
  const abx = bx - ax, abz = bz - az;
  const l2 = abx * abx + abz * abz;
  let t = l2 > 0 ? ((px - ax) * abx + (pz - az) * abz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + abx * t, cz = az + abz * t;
  if (out) out.t = t;
  const dx = px - cx, dz = pz - cz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

export const nextPow2 = (v) => 2 ** Math.ceil(Math.log2(Math.max(1, v)));
