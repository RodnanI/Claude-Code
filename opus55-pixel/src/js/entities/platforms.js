// ---------------------------------------------------------------------------
// Moving platforms: one-way surfaces that travel between two points with an
// eased back-and-forth and carry whatever stands on them. Riders are handled
// in Body.physics (see ridePlatforms).
// ---------------------------------------------------------------------------
class Platform {
  // x, y: top surface center (world px); to: [dx, dy] travel; period in ticks
  constructor(kind, x, y, w, to, period, phase = 0) {
    this.kind = kind; this.x0 = x; this.y0 = y; this.w = w; this.to = to; this.period = period; this.t = phase * period;
    this.x = x; this.y = y; this.px = x; this.py = y; this.dx = 0; this.dy = 0;
  }
  update() {
    this.t++;
    const k = (1 - Math.cos((this.t / this.period) * TAU)) / 2;
    this.px = this.x; this.py = this.y;
    this.x = this.x0 + this.to[0] * k; this.y = this.y0 + this.to[1] * k;
    this.dx = this.x - this.px; this.dy = this.y - this.py;
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), hw = this.w / 2;
    if (x + hw + 40 < 0 || x - hw - 40 > VW) return;
    if (this.kind === 'boat') {
      const img = cachedArt('pboat' + this.w, () => genSampan(this.w));
      ctx.drawImage(img, x - (img.width >> 1), y - 16 + Math.round(Math.sin(this.t * 0.05)));
    } else if (this.kind === 'raft') {
      for (let i = -hw; i < hw; i++) for (let j = 0; j < 5; j++) { ctx.fillStyle = S_BAMBOO[j === 0 ? 5 : j === 4 ? 1 : (i + 40) % 7 === 0 ? 1 : 3]; ctx.fillRect(x + i, y + j, 1, 1); }
    } else {
      for (let i = -hw; i < hw; i++) for (let j = 0; j < 6; j++) {
        const hole = j > 1 && j < 5 && (i + 40) % 4 !== 0;
        if (!hole) { ctx.fillStyle = S_IRON[j === 0 ? 5 : j === 5 ? 0 : j === 1 ? 4 : 2]; ctx.fillRect(x + i, y + j, 1, 1); }
      }
      // chains up to the dark
      ctx.fillStyle = S_IRON[3];
      for (const cx of [x - hw + 3, x + hw - 4]) for (let j = -60; j < 0; j += 3) ctx.fillRect(cx, y + j, 1, 2);
    }
  }
}

function genSampan(w) {
  const W = w + 16, P = new Paint(W, 34);
  const cx = W / 2;
  // arched mat canopy
  for (let y = 0; y < 13; y++) {
    const hw = (w * 0.3) * Math.sqrt(1 - Math.pow((13 - y) / 13.5, 2));
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) P.px(x, y, (x % 3 === 0) ? '#5a4428' : y < 3 ? '#c4a86a' : y % 4 === 0 ? '#8a7042' : '#a88c52');
  }
  for (const px of [Math.round(cx - w * 0.3), Math.round(cx + w * 0.3)]) for (let y = 6; y < 16; y++) P.px(px, y, '#3a2614');
  // hull, deck level at y = 16
  for (let y = 16; y < 30; y++) {
    const t = (y - 16) / 14, inset = Math.round(t * t * 10);
    for (let x = inset; x < W - inset; x++) P.px(x, y, S_WOOD[y === 16 ? 5 : y === 17 ? 4 : (x + y * 3) % 13 === 0 ? 1 : y > 26 ? 1 : y === 20 ? 2 : 3]);
  }
  P.px(1, 15, S_WOOD[3]); P.px(0, 14, S_WOOD[3]); P.px(W - 2, 15, S_WOOD[3]); P.px(W - 1, 14, S_WOOD[3]);
  P.outline('#140c06');
  return P.done();
}

// called from Body.physics: carry riders, then land bodies on platform tops
function ridePlatforms(b, prevY) {
  b.onPlat = null;
  if (b.vy < 0 || b.drop > 0 || !G.platforms || !G.platforms.length) return;
  const hw = b.w / 2;
  for (const pl of G.platforms) {
    if (b.x + hw <= pl.x - pl.w / 2 || b.x - hw >= pl.x + pl.w / 2) continue;
    if (prevY <= pl.py + 3 && b.y >= pl.y - 1) { b.y = pl.y; b.vy = 0; b.grounded = true; b.onPlat = pl; return; }
  }
}
