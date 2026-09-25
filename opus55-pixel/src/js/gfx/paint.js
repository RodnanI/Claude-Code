// ---------------------------------------------------------------------------
// Procedural painting on raw pixel buffers: dithered gradients, filled
// shapes with per-pixel color functions, lines. Used for backgrounds, tiles
// and props. Colors are hex strings or packed ints from col().
// ---------------------------------------------------------------------------
const _colCache = new Map();
function col(h) {
  if (typeof h === 'number') return h;
  let v = _colCache.get(h);
  if (v === undefined) { const c = rgb(h); v = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; v >>>= 0; _colCache.set(h, v); }
  return v;
}
const colA = (h, a) => ((col(h) & 0x00ffffff) | ((a & 255) << 24)) >>> 0;

class Paint {
  constructor(w, h) {
    this.w = w | 0; this.h = h | 0;
    this.c = mkCanvas(this.w, this.h);
    this.x = ctxOf(this.c);
    this.img = this.x.createImageData(this.w, this.h);
    this.u = new Uint32Array(this.img.data.buffer);
  }
  px(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || c == null) return; this.u[y * this.w + x] = col(c); }
  get(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.u[y * this.w + x]; }
  alpha(x, y) { return this.get(x, y) >>> 24; }
  rect(x, y, w, h, c) {
    const v = col(c);
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
    for (let j = y0; j < y1; j++) this.u.fill(v, j * this.w + x0, j * this.w + x1);
  }
  // vertical gradient through color stops with ordered dithering
  gradV(y0, y1, stops, x0 = 0, x1 = this.w, dith = 1) {
    for (let y = Math.max(0, y0 | 0); y < Math.min(this.h, y1); y++) {
      const t = (y - y0) / Math.max(1, y1 - y0) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
      for (let x = x0; x < x1; x++) this.u[y * this.w + x] = col(f > bayer(x, y) * dith + (1 - dith) * 0.5 ? stops[i + 1] : stops[i]);
    }
  }
  // fill polygon (flat [x,y,...]) with a color function (x, y) => color|null
  poly(P, fn) {
    let y0 = 1e9, y1 = -1e9;
    for (let i = 1; i < P.length; i += 2) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(this.h - 1, Math.ceil(y1));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) {
        const ya = P[i + 1], yb = P[j + 1];
        if ((ya > cy) !== (yb > cy)) xs.push(P[i] + ((cy - ya) / (yb - ya)) * (P[j] - P[i]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(this.w, Math.round(xs[k + 1]));
        for (let x = xa; x < xb; x++) { const c = typeof fn === 'function' ? fn(x, y) : fn; if (c != null) this.u[y * this.w + x] = col(c); }
      }
    }
  }
  ellipse(cx, cy, rx, ry, fn) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d <= 1) { const c = typeof fn === 'function' ? fn(x, y, d, dx, dy) : fn; if (c != null) this.px(x, y, c); }
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 4000; n++) {
      this.px(x0, y0, typeof c === 'function' ? c(x0, y0) : c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  thick(x0, y0, x1, y1, w, c) {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = typeof w === 'function' ? w(t) : w;
      this.ellipse(x, y, ww / 2, ww / 2, c);
    }
  }
  // 1px dark outline around opaque pixels (for props)
  outline(c, onlyBelow = false) {
    const v = col(c), w = this.w, h = this.h, u = this.u, src = u.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i] >>> 24) continue;
      const n = (x > 0 && src[i - 1] >>> 24) || (x < w - 1 && src[i + 1] >>> 24) || (y < h - 1 && src[i + w] >>> 24) || (!onlyBelow && y > 0 && src[i - w] >>> 24);
      if (n) u[i] = v;
    }
  }
  done() { this.x.putImageData(this.img, 0, 0); return this.c; }
}

// Chunky pixel-art circle helpers on a 2D context
function fillPx(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function discPx(ctx, cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.35);
    if (hw >= 0 && Math.abs(y) <= r) ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + y, hw * 2 + 1, 1);
  }
}
function ringPx(ctx, cx, cy, r, c, th = 1) {
  ctx.fillStyle = c;
  const n = Math.max(8, Math.ceil(r * 7));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), th, th);
  }
}
