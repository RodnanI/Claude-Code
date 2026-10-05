/* ============================================================
   util.js : math, seeded rng, number formatting, dom helpers
   ============================================================ */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pickR = a => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const Ease = {
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

function xmur(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}

/* sfc32, state is serialisable (4 ints) */
class RNG {
  constructor(seed) {
    if (Array.isArray(seed)) this.s = seed.slice(0, 4);
    else { const h = xmur(String(seed)); this.s = [h(), h(), h(), h()]; for (let i = 0; i < 16; i++) this.next(); }
  }
  next() {
    let a = this.s[0] | 0, b = this.s[1] | 0, c = this.s[2] | 0, d = this.s[3] | 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    this.s[0] = a; this.s[1] = b; this.s[2] = c; this.s[3] = d;
    return (t >>> 0) / 4294967296;
  }
  f(a = 1, b) { return b === undefined ? this.next() * a : a + this.next() * (b - a); }
  i(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  weighted(entries) {
    const list = Array.isArray(entries) ? entries : Object.entries(entries);
    let tot = 0; for (const e of list) tot += e[1];
    let r = this.next() * tot;
    for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
    return list[list.length - 1][0];
  }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
}

const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (n === Infinity) return 'INF';
  if (!isFinite(n)) return '0';
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n < 1e5) s = Math.floor(n).toLocaleString('en-US');
  else {
    const e = Math.floor(Math.log10(n) / 3);
    if (e < SUF.length) {
      const v = n / Math.pow(10, e * 3);
      s = (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString()) + SUF[e];
    } else { const ex = Math.floor(Math.log10(n)); s = (n / Math.pow(10, ex)).toFixed(2) + 'e' + ex; }
  }
  return (neg ? '-' : '') + s;
}
function fmtM(m) {
  if (m >= 1e5) return fmt(m);
  if (m >= 100) return Math.round(m).toLocaleString('en-US');
  const r = Math.round(m * 100) / 100;
  return String(+r.toFixed(r >= 10 ? 1 : 2));
}
/* {p|..} points, {m|..} mult, {x|..} xmult, {$|..} money, {c|..} chance, {k|..} keyword, {r|..} rare */
const rich = s => String(s).replace(/\{([a-z$])\|([^}]*)\}/g, (_, k, t) => `<b class="k k-${k === '$' ? 'd' : k}">${t}</b>`);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

const Bus = {
  h: {},
  on(e, f) { (this.h[e] || (this.h[e] = [])).push(f); },
  emit(e, ...a) { const l = this.h[e]; if (l) for (const f of l) f(...a); },
};

/* game-speed aware delay */
let GAME_SPEED = 1;
const wait = ms => new Promise(r => setTimeout(r, ms / GAME_SPEED));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function todayStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function noise1(t, s) { return Math.sin(t * 1.71 + s) * 0.5 + Math.sin(t * 3.37 + s * 2.1) * 0.3 + Math.sin(t * 7.13 + s * 0.7) * 0.2; }
function niceRound(q) {
  if (q < 100) return Math.round(q);
  const p = Math.pow(10, Math.floor(Math.log10(q)) - 1);
  return Math.round(q / p) * p;
}
