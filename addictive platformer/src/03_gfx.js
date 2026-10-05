// SQUEAKBORNE :: graphics core
// Low-res buffer, pixel-perfect primitives, bitmap fonts, banded lighting, particles and screen juice.

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctx2d(cv) { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; return x; }

let g = null; // main low-res context, set in Gfx.init

const Gfx = {
  cv: null, cx: null, buf: null, lcv: null, lg: null, vig: null,
  scale: 1, ox: 0, oy: 0,
  init() {
    this.cv = document.getElementById('c');
    this.cx = this.cv.getContext('2d');
    this.buf = makeCanvas(W, H);
    g = ctx2d(this.buf);
    this.lcv = makeCanvas(W / 2, H / 2);
    this.lg = ctx2d(this.lcv);
    this.vig = this.makeVignette();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.cv.focus();
  },
  makeVignette() {
    const cv = makeCanvas(W, H), c = ctx2d(cv);
    const img = c.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      const d = dx * dx * 0.75 + dy * dy;
      let a = clamp((d - 0.55) * 0.55, 0, 0.6);
      // ordered dither so the falloff stays pixel-crisp
      const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16;
      a = floor(a * 5 + bay) / 5;
      const i = (y * W + x) * 4;
      img.data[i] = 10; img.data[i + 1] = 5; img.data[i + 2] = 10; img.data[i + 3] = a * 255;
    }
    c.putImageData(img, 0, 0);
    return cv;
  },
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const ww = window.innerWidth, wh = window.innerHeight;
    this.cv.width = floor(ww * dpr); this.cv.height = floor(wh * dpr);
    this.cv.style.width = ww + 'px'; this.cv.style.height = wh + 'px';
    let s = min(this.cv.width / W, this.cv.height / H);
    if (Save.data && Save.data.settings.pixelPerfect && s >= 1) s = floor(s);
    this.scale = s;
    this.ox = floor((this.cv.width - W * s) / 2);
    this.oy = floor((this.cv.height - H * s) / 2);
  },
  present() {
    const cx = this.cx;
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, this.cv.width, this.cv.height);
    cx.drawImage(this.buf, 0, 0, W, H, this.ox, this.oy, W * this.scale, H * this.scale);
    if (Save.data.settings.scanlines && this.scale >= 2) {
      cx.fillStyle = 'rgba(0,0,0,0.22)';
      const s = this.scale;
      for (let y = 0; y < H; y++) cx.fillRect(this.ox, floor(this.oy + y * s + s * 0.62), W * s, max(1, floor(s * 0.38)));
    }
  },
};

// ---------- pixel primitives (any context) ----------
function R(c, x, y, w, h, col) { if (col) c.fillStyle = col; c.fillRect(floor(x), floor(y), w, h); }
function PX(c, x, y, col) { c.fillStyle = col; c.fillRect(floor(x), floor(y), 1, 1); }
function DISC(c, cx, cy, r, col) {
  c.fillStyle = col; cx = floor(cx); cy = floor(cy);
  if (r < 0.75) { c.fillRect(cx, cy, 1, 1); return; }
  const rr = (r + 0.5) * (r + 0.5), ir = floor(r);
  for (let y = -ir; y <= ir; y++) {
    const hw = floor(sqrt(max(0, rr - y * y)));
    c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}
function ELL(c, cx, cy, rx, ry, col) {
  c.fillStyle = col; cx = floor(cx); cy = floor(cy); rx = max(0, rx); ry = max(0, round(ry));
  const ryy = ry + 0.5;
  for (let y = -ry; y <= ry; y++) {
    const hw = floor((rx + 0.5) * sqrt(max(0, 1 - (y * y) / (ryy * ryy))));
    c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}
function RING(c, cx, cy, r, col, th = 1) {
  c.fillStyle = col; cx = floor(cx); cy = floor(cy);
  const ro = r + 0.5, ri = max(0, r - th + 0.5), ir = ceil(r);
  for (let y = -ir; y <= ir; y++) {
    const ho = sqrt(max(0, ro * ro - y * y)), hi = y * y < ri * ri ? sqrt(ri * ri - y * y) : -1;
    const a = floor(ho);
    if (hi < 0) { c.fillRect(cx - a, cy + y, a * 2 + 1, 1); continue; }
    const b = ceil(hi);
    if (a >= b) { c.fillRect(cx - a, cy + y, a - b + 1, 1); c.fillRect(cx + b, cy + y, a - b + 1, 1); }
  }
}
function LINE(c, x0, y0, x1, y1, col, th = 1) {
  c.fillStyle = col;
  x0 = round(x0); y0 = round(y0); x1 = round(x1); y1 = round(y1);
  const dx = abs(x1 - x0), dy = -abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = floor((th - 1) / 2);
  for (let i = 0; i < 600; i++) {
    c.fillRect(x0 - o, y0 - o, th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
// outlined line: ink border then colored core
function OLINE(c, x0, y0, x1, y1, col, th = 1, ol = C.ink) { LINE(c, x0, y0, x1, y1, ol, th + 2); LINE(c, x0, y0, x1, y1, col, th); }
const _xs = [];
function POLY(c, pts, col) {
  c.fillStyle = col;
  const n = pts.length >> 1;
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < pts.length; i += 2) { if (pts[i] < y0) y0 = pts[i]; if (pts[i] > y1) y1 = pts[i]; }
  y0 = floor(y0); y1 = ceil(y1);
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5;
    _xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
      if ((yi > yc) !== (yj > yc)) _xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
    }
    _xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < _xs.length; k += 2) {
      const xa = round(_xs[k]), xb = round(_xs[k + 1]);
      if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
    }
  }
}
// filled annular sector (slash arcs). angles in radians, sweep a0..a1 (a1 > a0)
function ARC(c, cx, cy, r0, r1, a0, a1, col) {
  c.fillStyle = col;
  cx = floor(cx); cy = floor(cy);
  const R1 = ceil(r1), r0s = r0 * r0, r1s = r1 * r1, span = a1 - a0;
  for (let y = -R1; y <= R1; y++) {
    let run = -9999;
    for (let x = -R1; x <= R1 + 1; x++) {
      let inside = false;
      if (x <= R1) {
        const d2 = x * x + y * y;
        if (d2 >= r0s && d2 <= r1s) {
          let a = atan2(y, x) - a0;
          a = ((a % TAU) + TAU) % TAU;
          inside = a <= span;
        }
      }
      if (inside && run === -9999) run = x;
      else if (!inside && run !== -9999) { c.fillRect(cx + run, cy + y, x - run, 1); run = -9999; }
    }
  }
}

// ---------- fonts ----------
const FONT5_SRC = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], ';': [0, 12, 12, 0, 12, 4, 8], '-': [0, 0, 0, 14, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0], '/': [0, 1, 2, 4, 8, 16, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0], '%': [24, 25, 2, 4, 8, 19, 3], '*': [0, 4, 21, 14, 21, 4, 0],
  '#': [10, 10, 31, 10, 31, 10, 10], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
  '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '_': [0, 0, 0, 0, 0, 0, 31], '&': [12, 18, 20, 8, 21, 18, 13],
  '$': [4, 15, 20, 14, 5, 30, 4], '^': [4, 10, 17, 0, 0, 0, 0], '~': [0, 0, 8, 21, 2, 0, 0], '|': [4, 4, 4, 4, 4, 4, 4],
  '♥': [0, 10, 31, 31, 14, 4, 0], '●': [0, 14, 31, 31, 31, 14, 0], '◆': [0, 4, 14, 31, 14, 4, 0],
  '→': [0, 4, 2, 31, 2, 4, 0], '←': [0, 4, 8, 31, 8, 4, 0], '↑': [4, 14, 21, 4, 4, 4, 0], '↓': [0, 4, 4, 4, 21, 14, 4],
  '★': [4, 4, 31, 14, 10, 17, 0], '☠': [14, 31, 21, 31, 14, 10, 0], '•': [0, 0, 4, 14, 4, 0, 0], '×': [0, 17, 10, 4, 10, 17, 0],
};
const FONT3_SRC = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [7, 1, 7, 4, 7], 3: [7, 1, 3, 1, 7], 4: [5, 5, 7, 1, 1], 5: [7, 4, 7, 1, 7],
  6: [7, 4, 7, 5, 7], 7: [7, 1, 1, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 7],
  ' ': [0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2], '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0], '%': [5, 1, 2, 4, 5],
  ':': [0, 2, 0, 2, 0], '/': [1, 1, 2, 4, 4], '?': [6, 1, 2, 0, 2], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4], x: [0, 5, 2, 5, 0],
  "'": [2, 2, 0, 0, 0], ',': [0, 0, 0, 2, 4], '↑': [2, 7, 2, 2, 2], '↓': [2, 2, 2, 7, 2], '←': [0, 2, 7, 2, 0], '→': [0, 2, 7, 2, 0],
};
const Fonts = {};
function buildFont(name, src, gw, gh, spaceW) {
  const keys = Object.keys(src);
  const cv = makeCanvas(keys.length * (gw + 1), gh), c = ctx2d(cv);
  const meta = {};
  c.fillStyle = '#fff';
  keys.forEach((ch, i) => {
    const rows = src[ch];
    let x0 = gw, x1 = -1;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      if ((rows[y] >> (gw - 1 - x)) & 1) { x0 = min(x0, x); x1 = max(x1, x); c.fillRect(i * (gw + 1) + x, y, 1, 1); }
    }
    meta[ch] = x1 < 0 ? { sx: 0, w: 0, adv: spaceW } : { sx: i * (gw + 1) + x0, w: x1 - x0 + 1, adv: x1 - x0 + 2 };
  });
  // the 3x5 arrow glyphs are drawn by hand for left/right
  Fonts[name] = { cv, meta, gh, tints: {} };
}
function fontTint(f, col) {
  let t = f.tints[col];
  if (t) return t;
  t = makeCanvas(f.cv.width, f.cv.height);
  const c = ctx2d(t);
  c.drawImage(f.cv, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col;
  c.fillRect(0, 0, t.width, t.height);
  f.tints[col] = t;
  return t;
}
function glyphOf(f, ch) {
  let m = f.meta[ch];
  if (!m) m = f.meta[ch.toUpperCase()];
  return m || f.meta['?'] || f.meta[' '];
}
function textW(str, font = '5', sc = 1) {
  const f = Fonts[font];
  let w = 0, best = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') { const j = str.indexOf('}', i); if (j > i) { i = j; continue; } }
    if (ch === '\n') { best = max(best, w); w = 0; continue; }
    w += glyphOf(f, ch).adv;
  }
  return (max(best, w) - 1) * sc;
}
// txt(str, x, y, col, {f:font, a:'l'|'c'|'r', sh:shadowColor, ol:outlineColor, sc:scale, wave, shake, c:ctx, lh:lineHeight})
function txt(str, x, y, col = TCOL.w, o = {}) {
  str = String(str);
  const c = o.c || g, f = Fonts[o.f || '5'], sc = o.sc || 1;
  const lines = str.split('\n');
  const lh = (o.lh || f.gh + 3) * sc;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const w = textW(line, o.f || '5', sc);
    let cx = x - (o.a === 'c' ? floor(w / 2) : o.a === 'r' ? w : 0);
    const cy = y + li * lh;
    if (o.ol) drawLine(c, f, line, cx, cy, o.ol, sc, o, true);
    else if (o.sh) drawLine(c, f, line, cx + sc, cy + sc, o.sh, sc, o, false, true);
    drawLine(c, f, line, cx, cy, col, sc, o, false);
  }
}
function drawLine(c, f, line, x, y, col, sc, o, outline, isShadow) {
  let cur = col, idx = 0;
  for (let i = 0; i < line.length; i++) {
    let ch = line[i];
    if (ch === '{') {
      const j = line.indexOf('}', i);
      if (j > i) {
        const k = line.slice(i + 1, j);
        if (!outline && !isShadow) cur = k === '' || k === '/' ? col : TCOL[k] || k;
        i = j; continue;
      }
    }
    const m = glyphOf(f, ch);
    if (m.w) {
      let dy = 0, dx = 0;
      if (o.wave) dy = round(sin((o.t || 0) * 0.15 + idx * 0.6) * o.wave);
      if (o.shake) { dx = round(rnd(-o.shake, o.shake)); dy += round(rnd(-o.shake, o.shake)); }
      const img = fontTint(f, cur);
      if (outline) {
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]])
          c.drawImage(img, m.sx, 0, m.w, f.gh, x + dx + ox * sc, y + dy + oy * sc, m.w * sc, f.gh * sc);
      } else c.drawImage(img, m.sx, 0, m.w, f.gh, x + dx, y + dy, m.w * sc, f.gh * sc);
    }
    x += m.adv * sc;
    idx++;
  }
}
function wrapText(str, maxW, font = '5') {
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (textW(t, font) > maxW && line) { out.push(line); line = wd; } else line = t;
    }
    out.push(line);
  }
  return out;
}
// 9-slice-free pixel panel
function panel(x, y, w, h, fill = C.night, edge = C.dk3, c = g) {
  x = floor(x); y = floor(y);
  c.fillStyle = C.ink; c.fillRect(x - 1, y, w + 2, h); c.fillRect(x, y - 1, w, h + 2);
  c.fillStyle = edge; c.fillRect(x, y, w, h);
  c.fillStyle = fill; c.fillRect(x + 1, y + 1, w - 2, h - 2);
  c.fillStyle = rgba('#ffffff', 0.06); c.fillRect(x + 1, y + 1, w - 2, 1);
}

// ---------- lighting ----------
const Light = {
  list: [], ambient: '#ffffff',
  add(x, y, r, col, a = 1) { if (this.list.length < 160) this.list.push({ x, y, r, col, a }); },
  render(camx, camy) {
    const lg = Gfx.lg, LW = W / 2, LH = H / 2;
    lg.globalCompositeOperation = 'source-over';
    lg.globalAlpha = 1;
    lg.fillStyle = this.ambient;
    lg.fillRect(0, 0, LW, LH);
    lg.globalCompositeOperation = 'lighter';
    for (const L of this.list) {
      const x = round((L.x - camx) / 2), y = round((L.y - camy) / 2), r = L.r / 2;
      if (x < -r || y < -r || x > LW + r || y > LH + r) continue;
      lg.fillStyle = L.col;
      for (let i = 0; i < 3; i++) {
        lg.globalAlpha = L.a * 0.36;
        lg.beginPath();
        lg.arc(x, y, max(1, r * (1 - i * 0.3)), 0, TAU);
        lg.fill();
      }
    }
    lg.globalAlpha = 1;
    lg.globalCompositeOperation = 'source-over';
    this.list.length = 0;
  },
  apply() {
    g.globalCompositeOperation = 'multiply';
    g.drawImage(Gfx.lcv, 0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  },
};
// additive glow sprite cache
const _glows = {};
function glow(x, y, r, col, a = 0.5) {
  r = max(2, round(r));
  const key = col + r;
  let cv = _glows[key];
  if (!cv) {
    cv = makeCanvas(r * 2, r * 2);
    const c = ctx2d(cv);
    c.fillStyle = col;
    for (let i = 0; i < 3; i++) { c.globalAlpha = 0.33; c.beginPath(); c.arc(r, r, r * (1 - i * 0.3), 0, TAU); c.fill(); }
    _glows[key] = cv;
  }
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.drawImage(cv, floor(x - r), floor(y - r));
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

// ---------- particles ----------
// kinds: 0 dot, 1 spark streak, 2 smoke, 3 ring, 4 gib, 5 star, 6 confetti, 7 drip
const Parts = {
  list: [],
  add(p) {
    if (this.list.length > 1100) this.list.splice(0, 150);
    p.life = p.life || 30; p.max = p.life;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.gr = p.gr || 0; p.dr = p.dr === undefined ? 0.98 : p.dr;
    p.s = p.s || 1; p.k = p.k || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
    this.list.push(p);
    return p;
  },
  update() {
    const L = this.list;
    let j = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.vy += p.gr; p.vx *= p.dr; p.vy *= p.dr;
      const nx = p.x + p.vx, ny = p.y + p.vy;
      if (p.col2 && lv) {
        if (solidPx(nx, p.y)) { p.vx *= -0.5; } else p.x = nx;
        if (solidPx(p.x, ny)) { p.vy *= -0.45; p.vx *= 0.8; if (p.k === 7) p.life = min(p.life, 2); } else p.y = ny;
      } else { p.x = nx; p.y = ny; }
      p.rot += p.vr;
      if (--p.life > 0) L[j++] = p;
    }
    L.length = j;
  },
  draw(layer) {
    for (const p of this.list) {
      if ((p.top || false) !== layer) continue;
      const t = p.life / p.max;
      const x = floor(p.x), y = floor(p.y);
      switch (p.k) {
        case 0: { const s = p.shrink ? max(1, round(p.s * t)) : p.s; g.fillStyle = p.c; g.fillRect(x - (s >> 1), y - (s >> 1), s, s); break; }
        case 1: { const l = p.len || 2; LINE(g, x, y, x - p.vx * l, y - p.vy * l, p.c, 1); break; }
        case 2: {
          g.globalAlpha = p.a !== undefined ? p.a * t : t * 0.8;
          DISC(g, x, y, p.s * (1.6 - t * 0.6), p.c);
          g.globalAlpha = 1; break;
        }
        case 3: { RING(g, x, y, p.s + (1 - t) * (p.grow || 20), p.c, p.th || 1); break; }
        case 4: {
          g.save(); g.translate(x, y); g.rotate(p.rot);
          if (t < 0.25) g.globalAlpha = t * 4;
          g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.sw / 2, -p.sh / 2, p.sw, p.sh);
          g.restore(); g.globalAlpha = 1; break;
        }
        case 5: {
          const s = max(1, round(p.s * t));
          g.fillStyle = p.c; g.fillRect(x - s, y, s * 2 + 1, 1); g.fillRect(x, y - s, 1, s * 2 + 1);
          break;
        }
        case 6: {
          const w = max(1, round(abs(cos(p.rot)) * 3));
          g.fillStyle = p.c; g.fillRect(x, y, w, 2); break;
        }
        case 7: { g.fillStyle = p.c; g.fillRect(x, y, 1, 2); break; }
      }
    }
  },
};
function puff(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) {
    Parts.add({
      k: 2, x: x + rnd(-(o.spread || 3), o.spread || 3), y: y + rnd(-2, 2), vx: rnd(-1, 1) * (o.sp || 0.6) + (o.vx || 0),
      vy: rnd(-1, 0.2) * (o.sp || 0.6) + (o.vy || 0), s: o.s || rnd(1.5, 3), c: col, life: rndi(o.life || 18, (o.life || 18) + 14),
      dr: 0.92, gr: o.gr || -0.01, a: o.a, top: o.top,
    });
  }
}
function sparks(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.dir !== undefined ? o.dir + rnd(-(o.spread || 0.6), o.spread || 0.6) : rnd(TAU);
    const sp = rnd(o.min || 1.5, o.max || 4);
    Parts.add({ k: 1, x, y, vx: cos(a) * sp, vy: sin(a) * sp, c: col, life: rndi(8, 16), dr: 0.88, gr: o.gr || 0.05, len: o.len || 1.5, top: true });
  }
}
function debris(x, y, n, cols, o = {}) {
  for (let i = 0; i < n; i++) {
    Parts.add({
      k: 0, x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: rnd(-1, 1) * (o.sp || 2.5) + (o.vx || 0), vy: rnd(-1.5, 0.3) * (o.sp || 2.5) + (o.vy || 0),
      c: pick(cols), s: o.s || pick([1, 1, 2]), life: rndi(25, 50), gr: 0.16, dr: 0.99, col2: true,
    });
  }
}
function ringFx(x, y, col, grow = 22, life = 14, th = 1) { Parts.add({ k: 3, x, y, s: 2, grow, c: col, life, th, dr: 1, top: true }); }
function stars(x, y, n, col) { for (let i = 0; i < n; i++) Parts.add({ k: 5, x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-0.6, 0.6), vy: rnd(-0.8, 0.1), s: rndi(1, 3), c: col, life: rndi(12, 24), top: true }); }
function confetti(x, y, n) {
  const cols = [C.rd3, C.yl1, C.gr3, C.tl3, C.pk2, C.or2, C.wh];
  for (let i = 0; i < n; i++) Parts.add({ k: 6, x, y, vx: rnd(-3, 3), vy: rnd(-5, -1), c: pick(cols), life: rndi(40, 80), gr: 0.12, dr: 0.96, vr: rnd(-0.4, 0.4), col2: true, top: true });
}
function gibs(spr, x, y, n, kx = 0, flip = false) {
  if (!spr) return;
  const img = flip ? spr.fl : spr.img;
  const pw = max(3, floor(img.width / 2)), ph = max(3, floor(img.height / 2));
  for (let i = 0; i < n; i++) {
    const sx = rndi(0, max(0, img.width - pw)), sy = rndi(0, max(0, img.height - ph));
    Parts.add({ k: 4, img, sx, sy, sw: pw, sh: ph, x: x + rnd(-4, 4), y: y + rnd(-6, 0), vx: rnd(-2, 2) + kx, vy: rnd(-4, -1.5), gr: 0.2, dr: 0.99, vr: rnd(-0.3, 0.3), life: rndi(40, 70), col2: true });
  }
}

// ---------- floating text ----------
const FText = {
  list: [],
  add(x, y, s, col = TCOL.w, o = {}) {
    if (!Save.data.settings.dmgNums && o.dmg) return;
    this.list.push({ x, y, s: String(s), col, life: o.life || 45, max: o.life || 45, vy: o.vy !== undefined ? o.vy : -1.4, vx: o.vx || rnd(-0.3, 0.3), sc: o.sc || 1, f: o.f || '5', shake: o.shake || 0, pop: 6 });
    if (this.list.length > 60) this.list.shift();
  },
  update() {
    for (const t of this.list) { t.y += t.vy; t.x += t.vx; t.vy *= 0.9; t.life--; if (t.pop > 0) t.pop--; }
    this.list = this.list.filter((t) => t.life > 0);
  },
  draw() {
    for (const t of this.list) {
      if (t.life < 10 && t.life % 2 === 0) continue;
      const sc = t.sc + (t.pop > 3 ? 1 : 0);
      txt(t.s, floor(t.x), floor(t.y) - (sc - 1) * 3, t.col, { f: t.f, a: 'c', ol: C.ink, sc, shake: t.shake && t.life > t.max - 12 ? t.shake : 0 });
    }
  },
};

// ---------- screen juice ----------
const FX = {
  trauma: 0, flashA: 0, flashCol: '#fff', hitstop: 0, slow: 1, slowT: 0, slowAcc: 0, sx: 0, sy: 0, zoom: 0,
  shake(a) { this.trauma = min(1, this.trauma + a * Save.data.settings.shake); },
  flash(a, col = '#fff') { if (!Save.data.settings.flash) a *= 0.25; if (a >= this.flashA) { this.flashA = a; this.flashCol = col; } },
  stop(n) { this.hitstop = max(this.hitstop, n); },
  slowmo(f, t) { this.slow = f; this.slowT = t; },
  update() {
    this.trauma = max(0, this.trauma - 0.035);
    const s = this.trauma * this.trauma * 9;
    this.sx = s ? rnd(-s, s) : 0;
    this.sy = s ? rnd(-s, s) : 0;
    this.flashA = max(0, this.flashA - 0.06);
    if (this.slowT > 0 && --this.slowT <= 0) this.slow = 1;
  },
  reset() { this.trauma = 0; this.flashA = 0; this.hitstop = 0; this.slow = 1; this.slowT = 0; },
};

// ---------- camera ----------
const Cam = {
  x: 0, y: 0, look: 0, lookY: 0, target: null, lockX: null,
  snap(e) {
    this.target = e;
    this.look = 0; this.lookY = 0;
    const [tx, ty] = this.goal();
    this.x = tx; this.y = ty;
    this.clamp();
  },
  goal() {
    const e = this.target;
    if (!e) return [this.x, this.y];
    let tx = e.x + e.w / 2 - W / 2 + this.look;
    let ty = e.y + e.h / 2 - H / 2 - 18 + this.lookY;
    if (this.lockX !== null) tx = this.lockX;
    return [tx, ty];
  },
  update() {
    const e = this.target;
    if (e) {
      const want = e.face * 42 + clamp(e.vx * 10, -30, 30);
      this.look = lerp(this.look, want, 0.04);
      const wy = e.lookDown ? 70 : e.lookUp ? -60 : e.vy > 4 ? 40 : 0;
      this.lookY = lerp(this.lookY, wy, 0.05);
    }
    const [tx, ty] = this.goal();
    this.x = lerp(this.x, tx, 0.14);
    this.y = lerp(this.y, ty, e && e.vy > 3 ? 0.22 : 0.12);
    this.clamp();
  },
  clamp() {
    if (!lv) return;
    const mw = lv.tw * TS, mh = lv.th * TS;
    this.x = mw <= W ? (mw - W) / 2 : clamp(this.x, 0, mw - W);
    this.y = mh <= H ? (mh - H) / 2 : clamp(this.y, 0, mh - H);
  },
  get rx() { return round(this.x + FX.sx); },
  get ry() { return round(this.y + FX.sy); },
};
