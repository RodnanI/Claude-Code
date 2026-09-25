// ---------------------------------------------------------------------------
// Entity and physics body base classes.
// Positions are feet-centered: (x, y) is the middle of the bottom edge.
// ---------------------------------------------------------------------------
let _eid = 1;
class Ent {
  constructor(x, y) {
    this.id = _eid++; this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.w = 12; this.h = 40; this.team = 0; this.z = 0; this.remove = false; this.dead = false;
  }
  update() {}
  draw() {}
  box() { return [this.x - this.w / 2, this.y - this.h, this.w, this.h]; }
}
class Body extends Ent {
  constructor(x, y) {
    super(x, y);
    this.grounded = false; this.drop = 0; this.grav = 0.34; this.gravMul = 1; this.maxFall = 7.5; this.noGrav = false; this.bounds = null;
  }
  physics() {
    if (!this.noGrav) this.vy = Math.min(this.maxFall, this.vy + this.grav * this.gravMul);
    if (this.drop > 0) this.drop--;
    const py = this.y;
    if (this.onPlat) { this.x += this.onPlat.dx; this.y += this.onPlat.dy; }
    moveBody(this, G.map);
    ridePlatforms(this, py);
  }
}
const overlap = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

// soft contact shadow on the ground under a body
function drawShadow(ctx, cam, x, y, w) {
  const sy = G.map.surfaceBelow(x, y - 4);
  const gap = sy - y;
  if (gap > 90) return;
  const k = 1 - gap / 90, hw = Math.round(w * (0.5 + 0.5 * k));
  const sx = Math.round(x - cam.x), yy = Math.round(sy - cam.y) - 1;
  ctx.fillStyle = 'rgba(12,8,6,0.32)';
  ctx.fillRect(sx - hw, yy, hw * 2 + 1, 1);
  ctx.fillRect(sx - hw + 2, yy - 1, hw * 2 - 3, 1);
}
