// ---------------------------------------------------------------------------
// Verlet ribbons for secondary motion: ponytails, sashes, tassels, scarves,
// capes, beards and talismans. Drawn as tapered, outlined pixel strokes.
// ---------------------------------------------------------------------------
class Ribbon {
  // def: [anchor, material, length, segments, width, stiffness, behind]
  constructor(def, C) {
    const [anchor, mat, len, n, width, stiff, behind] = def;
    this.anchor = anchor; this.n = n; this.seg = len / n; this.width = width; this.stiff = stiff; this.behind = !!behind;
    const p = C.pal[C.M[mat]];
    const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
    this.cOut = css(p[0]); this.cDark = css(p[2]); this.cMid = css(p[3]); this.cLight = css(p[4]);
    this.pts = [];
    for (let i = 0; i <= n; i++) this.pts.push({ x: 0, y: 0, px: 0, py: 0 });
    this.ok = false; this.visible = true;
    this.paper = mat === 'paper';
  }
  reset(x, y) { for (const p of this.pts) { p.x = p.px = x; p.y = p.py = y; } this.ok = true; }
  update(ax, ay, facing, wind = 0, grav = 0.22) {
    if (!this.ok) this.reset(ax, ay);
    const P = this.pts;
    P[0].x = ax; P[0].y = ay; P[0].px = ax; P[0].py = ay;
    // resting direction: trail behind and fall
    const rx = -facing * (0.35 + this.stiff * 0.9), ry = 1 - this.stiff * 0.5;
    const rl = Math.hypot(rx, ry);
    for (let i = 1; i < P.length; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x; p.py = p.y;
      p.x += vx + wind * (0.4 + i / P.length); p.y += vy + grav;
      if (this.stiff > 0) {
        const tx = ax + (rx / rl) * this.seg * i, ty = ay + (ry / rl) * this.seg * i;
        p.x += (tx - p.x) * this.stiff * 0.12; p.y += (ty - p.y) * this.stiff * 0.12;
      }
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        const k = (d - this.seg) / d;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; }
        else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
      }
    }
    if (G.map) for (let i = 1; i < P.length; i++) {
      const p = P[i], fy = G.map.surfaceBelow(p.x, p.y - 3);
      if (p.y > fy - 1) { p.y = fy - 1; p.px = p.x - (p.x - p.px) * 0.5; }
    }
  }
  draw(ctx, cam) {
    if (!this.ok || !this.visible) return;
    const P = this.pts, ox = cam.x, oy = cam.y;
    const pass = (color, extra, hi) => {
      ctx.fillStyle = color;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1];
        const w0 = this.width * (1 - (i / P.length) * 0.55), w1 = this.width * (1 - ((i + 1) / P.length) * 0.55);
        const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L * 1.5));
        for (let s = 0; s <= n; s++) {
          const t = s / n, w = Math.max(1, Math.round(lerp(w0, w1, t) + extra));
          const x = a.x + (b.x - a.x) * t - ox, y = a.y + (b.y - a.y) * t - oy;
          if (hi) ctx.fillRect(Math.round(x - w / 2 + 0.5), Math.round(y - w / 2), 1, 1);
          else ctx.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
        }
      }
    };
    pass(this.cOut, 2, false);
    pass(this.cMid, 0, false);
    if (this.width >= 2) pass(this.cLight, 0, true);
    if (this.paper) {
      // red glyph strokes on a talisman
      ctx.fillStyle = '#b81c14';
      for (let i = 1; i < P.length; i++) { const p = P[i]; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), 1, 2); }
    }
  }
}
