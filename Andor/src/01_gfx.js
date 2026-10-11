// ANDOR :: display, sprites, bitmap font, drawing primitives.

const cv = document.getElementById('game');
const ctx = cv.getContext('2d', { alpha: false });

// Screen: the main canvas (W x H game pixels) holds the game view rect and,
// in portrait touch mode, a control deck underneath it like a handheld.
const Screen = { W: 320, H: 200, S: 1, dpr: 1, vx: 0, vy: 0, vw: 320, vh: 200, portrait: false, cssW: 0, cssH: 0, left: 0, top: 0 };
const VC = makeCanvas(320, 200);
const vctx = VC.getContext('2d');

function resizeScreen(touchMode) {
  const dpr = window.devicePixelRatio || 1;
  const cw = window.innerWidth, ch = window.innerHeight;
  const devW = Math.round(cw * dpr), devH = Math.round(ch * dpr);
  const portrait = !!touchMode && ch > cw * 1.08;
  let S, W, H;
  if (portrait) {
    S = Math.max(1, Math.round(devW / 204));
    W = Math.ceil(devW / S);
    H = Math.ceil(devH / S);
  } else {
    S = Math.max(1, Math.round(devH / 204));
    if (devW / S < 250) S = Math.max(1, Math.floor(devW / 250));
    W = Math.min(480, Math.ceil(devW / S));
    H = Math.min(280, Math.ceil(devH / S));
  }
  Object.assign(Screen, { W, H, S, dpr, portrait });
  if (portrait) {
    Screen.vx = 0;
    Screen.vy = 0;
    Screen.vw = W;
    Screen.vh = clamp(Math.round(W * 0.92), 150, H - 150);
  } else {
    Screen.vx = 0;
    Screen.vy = 0;
    Screen.vw = W;
    Screen.vh = H;
  }
  cv.width = W;
  cv.height = H;
  if (VC.width !== Screen.vw || VC.height !== Screen.vh) {
    VC.width = Screen.vw;
    VC.height = Screen.vh;
  }
  Screen.cssW = (W * S) / dpr;
  Screen.cssH = (H * S) / dpr;
  Screen.left = Math.round((cw - Screen.cssW) / 2);
  Screen.top = portrait ? 0 : Math.round((ch - Screen.cssH) / 2);
  cv.style.width = Screen.cssW + 'px';
  cv.style.height = Screen.cssH + 'px';
  cv.style.left = Screen.left + 'px';
  cv.style.top = Screen.top + 'px';
  ctx.imageSmoothingEnabled = false;
  vctx.imageSmoothingEnabled = false;
}

// Convert a client (CSS) point to main-canvas pixels.
function clientToScreen(x, y) {
  return { x: ((x - Screen.left) / Screen.cssW) * Screen.W, y: ((y - Screen.top) / Screen.cssH) * Screen.H };
}

// ---------------------------------------------------------------------------
// Sprites from text rows. '.' or ' ' is transparent; other chars map through pal.
function spriteFromRows(rows, pal) {
  const h = rows.length;
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  const pb = new PixBuf(w, h);
  for (let y = 0; y < h; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      pb.set(x, y, C(col));
    }
  }
  return pb.toCanvas();
}

function flipCanvas(src) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width, 0);
  x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}
function tintCanvas(src, col) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// A sprite bundles the canvas with lazily-built flipped and flash variants.
class Sprite {
  constructor(canvas, ax = 0, ay = 0) {
    this.c = canvas;
    this.w = canvas.width;
    this.h = canvas.height;
    this.ax = ax; // anchor (pixels from left)
    this.ay = ay; // anchor (pixels from top)
    this._f = null;
    this._wh = null;
    this._whf = null;
  }
  get f() {
    return this._f || (this._f = flipCanvas(this.c));
  }
  get wh() {
    return this._wh || (this._wh = tintCanvas(this.c, '#fff8ea'));
  }
  get whf() {
    return this._whf || (this._whf = flipCanvas(this.wh));
  }
}
function mkSprite(rows, pal, ax, ay) {
  const c = spriteFromRows(rows, pal);
  return new Sprite(c, ax === undefined ? c.width >> 1 : ax, ay === undefined ? c.height : ay);
}

// Draw sprite with its anchor at (x, y). flip mirrors around the anchor.
function drawSprite(g, s, x, y, flip = false, flash = false) {
  if (!s) return;
  const img = flash ? (flip ? s.whf : s.wh) : flip ? s.f : s.c;
  const ax = flip ? s.w - s.ax : s.ax;
  g.drawImage(img, Math.round(x - ax), Math.round(y - s.ay));
}

// ---------------------------------------------------------------------------
// Bitmap font: 5x7 cell, proportional, with descenders. Rows top to bottom.
const FONT_SRC = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###',
  J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  a: '.... .... .### ...# .### #..# .###',
  b: '#... #... ###. #..# #..# #..# ###.',
  c: '.... .... .### #... #... #... .###',
  d: '...# ...# .### #..# #..# #..# .###',
  e: '.... .... .##. #..# #### #... .###',
  f: '..## .#.. ###. .#.. .#.. .#.. .#..',
  g: '.... .... .### #..# #..# #..# .### ...# ###.',
  h: '#... #... ###. #..# #..# #..# #..#',
  i: '# . # # # # #',
  j: '..# ... ..# ..# ..# ..# ..# ..# ##.',
  k: '#... #... #..# #.#. ##.. #.#. #..#',
  l: '#. #. #. #. #. #. .#',
  m: '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#',
  n: '.... .... ###. #..# #..# #..# #..#',
  o: '.... .... .##. #..# #..# #..# .##.',
  p: '.... .... ###. #..# #..# #..# ###. #... #...',
  q: '.... .... .### #..# #..# #..# .### ...# ...#',
  r: '... ... #.# ##. #.. #.. #..',
  s: '.... .... .### #... .##. ...# ###.',
  t: '.#. .#. ### .#. .#. .#. ..#',
  u: '.... .... #..# #..# #..# #..# .###',
  v: '..... ..... #...# #...# .#.#. .#.#. ..#..',
  w: '..... ..... #...# #.#.# #.#.# #.#.# .#.#.',
  x: '.... .... #..# #..# .##. #..# #..#',
  y: '.... .... #..# #..# #..# #..# .### ...# ###.',
  z: '.... .... #### ..#. .#.. #... ####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '.#. ##. .#. .#. .#. .#. ###',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ....# .###.',
  '.': '. . . . . . #',
  ',': '.. .. .. .. .. .# .# #.',
  '!': '# # # # # . #',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  ':': '. . # . . # .',
  ';': '.. .. .# .. .. .# #.',
  "'": '# # . . . . .',
  '"': '#.# #.# ... ... ... ... ...',
  '-': '.... .... .... #### .... .... ....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '(': '.# #. #. #. #. #. .#',
  ')': '#. .# .# .# .# .# #.',
  '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '*': '..... #.#.# .###. ##### .###. #.#.# .....',
  '<': '...# ..#. .#.. #... .#.. ..#. ...#',
  '>': '#... .#.. ..#. ...# ..#. .#.. #...',
  '=': '.... .... #### .... #### .... ....',
  _: '.... .... .... .... .... .... ####',
  '[': '## #. #. #. #. #. ##',
  ']': '## .# .# .# .# .# ##',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  '~': '..... ..... .#... #.#.# ...#. ..... .....',
  // Glyph slots for symbols: ^ up arrow, | down arrow, { left, } right, ` dot
  '^': '..#.. .###. #.#.# ..#.. ..#.. ..#.. .....',
  '|': '..#.. ..#.. ..#.. #.#.# .###. ..#.. .....',
  '{': '..... ..#.. .#... ##### .#... ..#.. .....',
  '}': '..... ..#.. ...#. ##### ...#. ..#.. .....',
  '`': '... ... .#. ### .#. ... ...',
  '@': '..#.. .#.#. #...# .#.#. ..#.. ..... .....',
};
const FONT = { glyphs: {}, atlas: null, h: 9, lineH: 11, tints: new Map() };
(function buildFont() {
  const keys = Object.keys(FONT_SRC);
  let x = 0;
  const parsed = {};
  for (const k of keys) {
    const rows = FONT_SRC[k].split(' ');
    const w = Math.max(...rows.map((r) => r.length));
    parsed[k] = { rows, w, x };
    x += w + 1;
  }
  const pb = new PixBuf(x, 9);
  const white = C('#ffffff');
  for (const k of keys) {
    const g = parsed[k];
    g.rows.forEach((r, y) => {
      for (let i = 0; i < r.length; i++) if (r[i] === '#') pb.set(g.x + i, y, white);
    });
    FONT.glyphs[k] = { x: g.x, w: g.w };
  }
  FONT.atlas = pb.toCanvas();
})();
function fontTint(col) {
  let a = FONT.tints.get(col);
  if (!a) {
    a = tintCanvas(FONT.atlas, col);
    FONT.tints.set(col, a);
  }
  return a;
}
function textWidth(str, scale = 1) {
  let w = 0;
  for (const ch of str) {
    const g = FONT.glyphs[ch];
    w += (g ? g.w + 1 : 4) * scale;
  }
  return Math.max(0, w - scale);
}
function _rawText(g, str, x, y, col, scale, wave, t0) {
  const atlas = fontTint(col);
  let cx = x;
  let i = 0;
  for (const ch of str) {
    const gl = FONT.glyphs[ch];
    if (!gl) {
      cx += 4 * scale;
      i++;
      continue;
    }
    const oy = wave ? Math.round(Math.sin(t0 * 6 + i * 0.7) * wave) : 0;
    g.drawImage(atlas, gl.x, 0, gl.w, 9, cx, y + oy, gl.w * scale, 9 * scale);
    cx += (gl.w + 1) * scale;
    i++;
  }
}
// opts: align ('left'|'center'|'right'), scale, shadow (colour), outline (colour), wave (px), t
function drawText(g, str, x, y, col = '#fff8ea', o = {}) {
  str = String(str);
  const sc = o.scale || 1;
  const w = textWidth(str, sc);
  let px = x;
  if (o.align === 'center') px = x - (w >> 1);
  else if (o.align === 'right') px = x - w;
  px = Math.round(px);
  y = Math.round(y);
  const t0 = o.t || 0;
  if (o.outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]])
      _rawText(g, str, px + dx * sc, y + dy * sc, o.outline, sc, o.wave, t0);
  }
  if (o.shadow) _rawText(g, str, px, y + sc, o.shadow, sc, o.wave, t0);
  _rawText(g, str, px, y, col, sc, o.wave, t0);
  return w;
}
function wrapText(str, maxW, scale = 1) {
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (textWidth(test, scale) > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Immediate-mode primitives for the live canvas.
function fillR(g, x, y, w, h, col) {
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function pxLine(g, x0, y0, x1, y1, col, w = 1) {
  g.fillStyle = col;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, n = 0;
  for (;;) {
    g.fillRect(x0, y0, w, w);
    if ((x0 === x1 && y0 === y1) || n++ > 2000) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pxCircle(g, cx, cy, r, col) {
  g.fillStyle = col;
  cx = Math.round(cx);
  cy = Math.round(cy);
  const ri = Math.ceil(r);
  for (let y = -ri; y <= ri; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.35);
    if (half >= 0 && r * r - y * y >= 0) g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}
function pxRing(g, cx, cy, r, col) {
  g.fillStyle = col;
  const n = Math.max(8, Math.ceil(r * 7));
  let lx = null, ly = null;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    if (x !== lx || y !== ly) g.fillRect(x, y, 1, 1);
    lx = x;
    ly = y;
  }
}

// Cached dithered radial "light stamp" used for glows and lighting masks.
const _stampCache = new Map();
function lightStamp(r, col = '#ffffff', levels = 4) {
  r = Math.max(2, Math.round(r));
  const key = r + col + levels;
  let s = _stampCache.get(key);
  if (s) return s;
  const pb = new PixBuf(r * 2, r * 2);
  const [cr, cg, cb] = hexToRgb(col);
  for (let y = 0; y < r * 2; y++)
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d >= 1) continue;
      const v = (1 - d) * (1 - d * 0.35);
      const q = Math.min(levels, Math.floor(v * levels + bayer(x, y)));
      if (q <= 0) continue;
      pb.set(x, y, packRgb(cr, cg, cb, Math.round((q / levels) * 255)));
    }
  s = pb.toCanvas();
  _stampCache.set(key, s);
  return s;
}
