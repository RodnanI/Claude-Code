// ---------------------------------------------------------------------------
// Shared constants, math, random, noise and color helpers.
// ---------------------------------------------------------------------------
const VW = 480, VH = 270, TS = 16;
const TAU = Math.PI * 2, DEG = Math.PI / 180;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const sgn = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const chance = p => Math.random() < p;
// direction vector for the rig's angle convention: 0 = down, 90 = forward (+x), 180 = up
const dv = a => [Math.sin(a * DEG), Math.cos(a * DEG)];

const Ease = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  io: t => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  out3: t => 1 - Math.pow(1 - t, 3),
  in3: t => t * t * t,
  back: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};

// Deterministic generator for procedural art: same seed, same world.
class RNG {
  constructor(seed = 1) { this.s = (seed >>> 0) || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  r(a = 1, b) { return b === undefined ? this.next() * a : a + this.next() * (b - a); }
  i(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(a) { return a[Math.floor(this.next() * a.length)]; }
  ch(p) { return this.next() < p; }
}

function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), xf), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), xf), yf);
}
function fbm(x, y, oct = 4, s = 0) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}
// Periodic 1D noise, used so parallax strips tile without seams.
function pnoise(x, period, s = 0) {
  const xi = Math.floor(x), xf = smooth(x - xi);
  const m = k => ((k % period) + period) % period;
  return lerp(hash2(m(xi), 7, s), hash2(m(xi + 1), 7, s), xf);
}
function pfbm(x, period, oct = 4, s = 0) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += pnoise(x * f, period * f, s + i * 31) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}

const _rgb = new Map();
function rgb(h) {
  let v = _rgb.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; _rgb.set(h, v); }
  return v;
}
const hex = (r, g, b) => '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function rgba(h, a) { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
// sample a list of hex stops at t in [0,1]
function ramp(stops, t) {
  t = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return mix(stops[i], stops[i + 1], t - i);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
function ctxOf(c) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; }

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
