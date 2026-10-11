// ANDOR :: core utilities, palette, random, pixel buffers.

const TAU = Math.PI * 2;
const TILE = 16;
const STEP = 1 / 60;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const now = () => performance.now() / 1000;

// Deterministic generator for anything that must look the same every run.
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  const f = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
}

// Integer hash -> [0,1). Used for stable per-tile variation.
function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Smooth value noise (stable, seeded) for textures and terrain.
function vnoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, seed = 0, oct = 3) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

// 4x4 ordered dither thresholds in [0,1).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// ---------------------------------------------------------------------------
// Palette. Warm, dusty, cinematic: ochre and umber against Persian turquoise,
// gold leaf and lamp-black. Night skies are ink-teal, never purple.
const PAL = {
  ink: '#0e0907', ink2: '#1c120d', umber: '#2d1c13', bark: '#45291a', leather: '#64391f', tan: '#8b5a34',
  clay: '#b07743', ochre: '#d09a55', sand: '#e6bd7c', sand2: '#f2d7a2', cream: '#f9edd2', white: '#fff8ea',
  blood: '#4f1015', wine: '#7e1b23', crimson: '#b02a2c', vermil: '#d9482f', coral: '#ef7d52', peach: '#f6ad7b',
  bronze: '#6e3f10', brass: '#a86d16', gold: '#dea12a', gold2: '#f4cf62', gold3: '#fff1b3',
  teal0: '#0a1a1d', teal1: '#11313a', teal2: '#1b5157', teal3: '#2a807c', turq: '#3fb5a3', turq2: '#8de0c8',
  lapis0: '#101a33', lapis: '#22396e', lapis2: '#3b62a8',
  moss0: '#18220f', moss: '#2f4a22', leaf: '#4f7a33', leaf2: '#89ad48', emer0: '#0d3a26', emerald: '#25b56a', emer2: '#79f0a5',
  stone0: '#231e1a', stone1: '#3f3730', stone2: '#62574b', stone3: '#8f8170', stone4: '#bcab92', stone5: '#e1d2b5',
  skin0: '#4d2817', skin1: '#80462a', skin2: '#bd7a4c', skin3: '#dfa271',
  night0: '#060c0e', night1: '#0b181c', night2: '#122a2f', night3: '#1d3f43',
  fire0: '#7a1d0c', fire1: '#c8401a', fire2: '#f07a22', fire3: '#ffc444', fire4: '#fff3b8',
};

// ---------------------------------------------------------------------------
// Colour helpers. Colours travel as '#rrggbb' strings or packed ABGR ints.
const _hexCache = new Map();
function hexToRgb(hex) {
  let v = _hexCache.get(hex);
  if (v) return v;
  const h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
  v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache.set(hex, v);
  return v;
}
const packRgb = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const C = (hex, a = 255) => {
  const [r, g, b] = hexToRgb(hex);
  return packRgb(r, g, b, a);
};
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
const rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------------------------------------------------------------------------
// PixBuf: a CPU pixel buffer for procedural art (tiles, skies, props).
class PixBuf {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.img = new ImageData(w, h);
    this.d = new Uint32Array(this.img.data.buffer);
  }
  inb(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  // Alpha-blend packed colour c onto the pixel with weight a (0..1).
  blend(x, y, c, a) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x, o = this.d[i];
    if (a >= 1 || (o >>> 24) === 0) {
      this.d[i] = a >= 1 ? c : ((Math.round(a * 255) << 24) | (c & 0xffffff)) >>> 0;
      return;
    }
    const r = (o & 255) + ((c & 255) - (o & 255)) * a;
    const g = ((o >> 8) & 255) + (((c >> 8) & 255) - ((o >> 8) & 255)) * a;
    const b = ((o >> 16) & 255) + (((c >> 16) & 255) - ((o >> 16) & 255)) * a;
    this.d[i] = packRgb(r | 0, g | 0, b | 0, 255);
  }
  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
    for (let yy = y0; yy < y1; yy++) this.d.fill(c, yy * this.w + x0, yy * this.w + x1);
  }
  hline(x0, x1, y, c) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    this.rect(x0, y, x1 - x0 + 1, 1, c);
  }
  vline(x, y0, y1, c) {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
  }
  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  disc(cx, cy, r, c) {
    const r2 = r * r;
    for (let y = -Math.ceil(r); y <= Math.ceil(r); y++)
      for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r2 + r * 0.6) this.set(cx + x, cy + y, c);
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++)
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++)
        if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.set(cx + x, cy + y, c);
  }
  // Fill rows with a dithered blend through a list of hex colour stops.
  vgrad(x, y, w, h, stops) {
    const cols = stops.map((s) => C(s));
    const n = cols.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const t = (yy / Math.max(1, h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      for (let xx = 0; xx < w; xx++) {
        const px = x + xx, py = y + yy;
        this.set(px, py, f > bayer(px, py) ? cols[i + 1] : cols[i]);
      }
    }
  }
  // Copy a canvas/sprite into this buffer (alpha-tested).
  stamp(src, dx, dy, flip = false) {
    const s = src._pix || (src._pix = canvasPixels(src));
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const c = s.d[y * s.w + (flip ? s.w - 1 - x : x)];
        if (c >>> 24 > 127) this.set(dx + x, dy + y, c);
      }
  }
  toCanvas(cv) {
    cv = cv || makeCanvas(this.w, this.h);
    cv.getContext('2d').putImageData(this.img, 0, 0);
    return cv;
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}
function canvasPixels(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  return { w: cv.width, h: cv.height, d: new Uint32Array(d.data.buffer) };
}

// ---------------------------------------------------------------------------
// Tiny event bus for decoupled systems (audio cues, achievements, UI).
const Bus = {
  m: new Map(),
  on(ev, fn) {
    if (!this.m.has(ev)) this.m.set(ev, []);
    this.m.get(ev).push(fn);
  },
  emit(ev, a, b, c) {
    const l = this.m.get(ev);
    if (l) for (const fn of l) fn(a, b, c);
  },
};

// Persistent storage wrapper that never throws.
const Store = {
  get(k, def) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};

// Debug flags from the URL hash, e.g. #level=2&god
const DEBUG = (() => {
  const o = {};
  (location.hash || '').replace(/^#/, '').split('&').forEach((kv) => {
    if (!kv) return;
    const [k, v] = kv.split('=');
    o[k] = v === undefined ? true : isNaN(+v) ? v : +v;
  });
  return o;
})();
