// ---------------------------------------------------------------------------
// Lighting: a darkness layer with dithered light holes cut out, plus
// additive colored glows. Light sprites are quantized radial falloffs with
// ordered dithering so they stay pixel crisp.
// ---------------------------------------------------------------------------
const Light = {
  cv: null, x: null, cache: new Map(),
  init() { this.cv = mkCanvas(VW, VH); this.x = ctxOf(this.cv); },
  sprite(r, color = '#ffffff', levels = 5) {
    r = Math.max(2, Math.round(r));
    const key = r + color + levels;
    let c = this.cache.get(key);
    if (c) return c;
    const P = new Paint(r * 2, r * 2);
    const v = col(color) & 0x00ffffff;
    for (let y = 0; y < r * 2; y++) for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d >= 1) continue;
      let a = Math.pow(1 - d, 1.4) * levels;
      const lo = Math.floor(a);
      a = (a - lo > bayer(x, y) ? lo + 1 : lo) / levels;
      if (a > 0) P.u[y * P.w + x] = (v | ((Math.min(255, a * 255) & 255) << 24)) >>> 0;
    }
    c = P.done();
    this.cache.set(key, c);
    return c;
  },
  begin(color, alpha) {
    const x = this.x;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, VW, VH);
    x.globalAlpha = alpha;
    x.fillStyle = color;
    x.fillRect(0, 0, VW, VH);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'destination-out';
  },
  hole(sx, sy, r, k = 1) {
    this.x.globalAlpha = k;
    this.x.drawImage(this.sprite(r), Math.round(sx - r), Math.round(sy - r));
    this.x.globalAlpha = 1;
  },
  end(ctx) { this.x.globalCompositeOperation = 'source-over'; ctx.drawImage(this.cv, 0, 0); },
  glow(ctx, sx, sy, r, color, a = 0.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.drawImage(this.sprite(r, color), Math.round(sx - r), Math.round(sy - r));
    ctx.restore();
  },
};
