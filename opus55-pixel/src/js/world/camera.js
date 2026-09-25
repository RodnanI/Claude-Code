// ---------------------------------------------------------------------------
// Camera: look-ahead follow, arena locks, cinematic targets and shake.
// ---------------------------------------------------------------------------
class Camera {
  constructor() { this.x = 0; this.y = 0; this.look = 0; this.lock = null; this.focus = null; this.vx = 0; this.vy = 0; }
  bounds(map) {
    let x0 = 0, x1 = map.pw - VW;
    if (this.lock) { x0 = this.lock[0]; x1 = this.lock[1] - VW; }
    return [x0, Math.max(x0, x1), 0, Math.max(0, map.ph - VH)];
  }
  update(p, map, snap = false) {
    let tx, ty;
    if (this.focus) { tx = this.focus.x - VW / 2; ty = this.focus.y - VH * 0.62; }
    else {
      this.look = approach(this.look, p.facing * 34, 0.9);
      tx = p.x + this.look - VW / 2;
      ty = p.y - VH * 0.64;
    }
    if (Dialogue.active || G.script) this.talk = approach(this.talk || 0, 38, 1.5); else this.talk = approach(this.talk || 0, 0, 1.5);
    ty += this.talk;
    const [x0, x1, y0, y1] = this.bounds(map);
    tx = clamp(tx, x0, x1); ty = clamp(ty, y0, y1);
    if (snap) { this.x = tx; this.y = ty; return; }
    const kx = this.focus ? this.focus.k || 0.06 : 0.14, ky = this.focus ? this.focus.k || 0.06 : p.vy > 4 ? 0.2 : 0.09;
    this.x += (tx - this.x) * kx;
    this.y += (ty - this.y) * ky;
  }
  view() {
    const s = FX.shake;
    return { x: Math.round(this.x + (s ? rnd(-s, s) : 0)), y: Math.round(this.y + (s ? rnd(-s, s) * 0.7 : 0)), rx: this.x, ry: this.y };
  }
}
