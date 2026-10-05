// SQUEAKBORNE :: core
// Constants, math helpers, seeded RNG, noise and the palette.

const W = 480, H = 270, TS = 16;
const PI = Math.PI, TAU = PI * 2;
const { abs, floor, ceil, round, min, max, sqrt, sin, cos, atan2, hypot, sign } = Math;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => (v < t ? min(v + d, t) : max(v - d, t));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => a + floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const dist = (ax, ay, bx, by) => hypot(bx - ax, by - ay);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const boxHit = (x, y, w, h, b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y;

function RNG(seed) {
  let s = seed >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (a, b) => a + floor(r() * (b - a + 1));
  r.range = (a, b) => a + r() * (b - a);
  r.pick = (arr) => arr[floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = floor(r() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  };
  r.weighted = (list) => {
    let tot = 0;
    for (const e of list) tot += e[1];
    let x = r() * tot;
    for (const e of list) { x -= e[1]; if (x <= 0) return e[0]; }
    return list[list.length - 1][0];
  };
  return r;
}
const MR = RNG((Math.random() * 4294967296) >>> 0); // unseeded convenience rng

function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = floor(x), yi = floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
const fmtTime = (fr) => {
  const s = floor(fr / 60);
  return floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const ease = {
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// Palette: warm darks, dusty fur, cheese and candlelight.
const C = {
  ink: '#130d12', night: '#1d1419', dk1: '#2a1d24', dk2: '#3d2b33', dk3: '#54404a',
  st0: '#232027', st1: '#34303a', st2: '#4d4853', st3: '#6f6974', st4: '#9b939c', st5: '#c8c0c4',
  fu0: '#4b4249', fu1: '#71666d', fu2: '#a0939a', fu3: '#cbbfc1', fu4: '#f1e7de',
  pk0: '#7d2f4a', pk1: '#c95f7c', pk2: '#f19aa6', pk3: '#ffd2cc',
  rd0: '#4f0f1c', rd1: '#93202c', rd2: '#d33a2e', rd3: '#ff6b43',
  or0: '#8a3c10', or1: '#d8691b', or2: '#f79a2e',
  yl0: '#d9a024', yl1: '#ffd34e', yl2: '#fff1a6', yl3: '#fffbe6',
  br0: '#2f1b14', br1: '#553424', br2: '#7f5233', br3: '#ad7a48', br4: '#d9a970', br5: '#f0d3a0',
  gr0: '#142a1c', gr1: '#25492a', gr2: '#3f7a35', gr3: '#79b443', gr4: '#c4e66a',
  tl0: '#0c2628', tl1: '#174f4c', tl2: '#26867b', tl3: '#4fc6a7', tl4: '#b4f1d9',
  bl0: '#151c2e', bl1: '#24365a', bl2: '#3f6597', bl3: '#83aed8',
  vi0: '#25142b', vi1: '#4c2a55', vi2: '#8a5296',
  wh: '#ffffff', bk: '#000000',
};
// Colors used by the text markup: {r}red {y}yellow ...
const TCOL = {
  w: '#fff6ea', r: C.rd3, o: C.or2, y: C.yl1, g: C.gr3, t: C.tl3, p: C.pk2, k: C.st4, b: C.br4, c: C.yl2, d: C.st3, v: C.vi2,
};

const _rgbCache = {};
function hexRgb(h) {
  let v = _rgbCache[h];
  if (v) return v;
  const n = parseInt(h.slice(1), 16);
  v = _rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return v;
}
function rgba(h, a) { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function mixc(a, b, t) {
  const x = hexRgb(a), y = hexRgb(b);
  const r = round(lerp(x[0], y[0], t)), g = round(lerp(x[1], y[1], t)), bl = round(lerp(x[2], y[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function removeDead(arr) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[j++] = arr[i];
  arr.length = j;
}
