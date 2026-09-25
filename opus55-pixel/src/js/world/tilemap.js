// ---------------------------------------------------------------------------
// Tile map: parsing, collision queries and body movement.
// Map legend:  # solid   % solid (alternate material)   = one-way   - one-way (alt)
//              / slope rising right   \ slope rising left   ^ spikes
//              ~ water surface   w water body   letters are entity markers
// ---------------------------------------------------------------------------
const T_EMPTY = 0, T_SOLID = 1, T_ONEWAY = 2, T_SLR = 3, T_SLL = 4, T_SPIKE = 5, T_WATER = 6, T_WTOP = 7;
const TILE_CHARS = { '#': [T_SOLID, 0], '%': [T_SOLID, 1], '=': [T_ONEWAY, 0], '-': [T_ONEWAY, 1], '/': [T_SLR, 0], '\\': [T_SLL, 0], '^': [T_SPIKE, 0], '~': [T_WTOP, 0], 'w': [T_WATER, 0] };
const STEP_UP = 6, SNAP = 7;

class TileMap {
  constructor(rows) {
    this.h = rows.length;
    this.w = Math.max(...rows.map(r => r.length));
    this.t = new Uint8Array(this.w * this.h);
    this.v = new Uint8Array(this.w * this.h);
    this.marks = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const ch = rows[y][x] || '.';
      const d = TILE_CHARS[ch];
      if (d) { this.t[y * this.w + x] = d[0]; this.v[y * this.w + x] = d[1]; }
      else if (ch !== '.' && ch !== ' ') this.marks.push({ ch, tx: x, ty: y, x: x * TS + TS / 2, y: (y + 1) * TS });
    }
    this.pw = this.w * TS; this.ph = this.h * TS;
  }
  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return T_SOLID;
    if (ty < 0 || ty >= this.h) return T_EMPTY;
    return this.t[ty * this.w + tx];
  }
  var(tx, ty) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? 0 : this.v[ty * this.w + tx]; }
  solid(tx, ty) { return this.get(tx, ty) === T_SOLID; }
  solidPx(x, y) { return this.solid(Math.floor(x / TS), Math.floor(y / TS)); }
  slopeY(t, tx, ty, x) { const lx = clamp(x - tx * TS, 0, TS); return ty * TS + (t === T_SLR ? TS - lx : lx); }
  // highest floor surface for a probe at x whose top lies within [yTop, yBot]
  floorAt(x, yTop, yBot, prevY, drop, allowSlope) {
    const tx = Math.floor(x / TS);
    let best = Infinity, slope = false;
    const r0 = Math.floor(yTop / TS), r1 = Math.floor(yBot / TS);
    for (let ty = r0; ty <= r1; ty++) {
      const t = this.get(tx, ty);
      let s = null, sl = false;
      if (t === T_SOLID) { if (this.get(tx, ty - 1) !== T_SOLID) s = ty * TS; }
      else if (t === T_ONEWAY) { if (!drop && prevY <= ty * TS + 0.5) s = ty * TS; }
      else if ((t === T_SLR || t === T_SLL) && allowSlope) { s = this.slopeY(t, tx, ty, x); sl = true; }
      if (s !== null && s >= yTop - 0.01 && s <= yBot + 0.01 && s < best) { best = s; slope = sl; }
    }
    return { y: best, slope };
  }
  isSlopeCol(x, y0, y1) {
    const tx = Math.floor(x / TS);
    for (let ty = Math.floor(y0 / TS); ty <= Math.floor(y1 / TS); ty++) { const t = this.get(tx, ty); if (t === T_SLR || t === T_SLL) return true; }
    return false;
  }
  surfaceBelow(x, y) {
    const tx = Math.floor(x / TS);
    if (tx < 0 || tx >= this.w) return this.ph + 200;
    for (let ty = Math.max(0, Math.floor(y / TS)); ty < this.h; ty++) {
      const t = this.get(tx, ty);
      let s = null;
      if (t === T_SOLID || t === T_ONEWAY) s = ty * TS;
      else if (t === T_SLR || t === T_SLL) s = this.slopeY(t, tx, ty, x);
      if (s !== null && s >= y) return s;
    }
    return this.ph + 200;
  }
  hazard(x0, y0, x1, y1) {
    let out = null;
    for (let ty = Math.floor(y0 / TS); ty <= Math.floor(y1 / TS); ty++) for (let tx = Math.floor(x0 / TS); tx <= Math.floor(x1 / TS); tx++) {
      const t = this.get(tx, ty);
      if (t === T_SPIKE && y1 > ty * TS + 8) return 'spike';
      if ((t === T_WATER || t === T_WTOP) && y1 > ty * TS + (t === T_WTOP ? 6 : 0)) out = 'water';
    }
    return out;
  }
}

// Move a body (x = feet center, y = feet) through the map with slopes,
// one-way platforms, step-ups and ground snapping.
function moveBody(b, map) {
  // safety net: a body embedded in solid ground is lifted to the surface
  if (map.solidPx(b.x, b.y - 2)) {
    let ty = Math.floor((b.y - 2) / TS);
    while (ty > 0 && map.solid(Math.floor(b.x / TS), ty)) ty--;
    b.y = (ty + 1) * TS; b.vy = Math.min(b.vy, 0);
  }
  const was = b.grounded;
  b.wallL = b.wallR = false;
  const hw = b.w / 2;
  if (b.vx !== 0) {
    b.x += b.vx;
    // on slopes the front edge is ahead of the feet: allow half width + speed of step
    const top = b.y - b.h + 2, bot = b.y - (was ? Math.max(STEP_UP, hw + Math.abs(b.vx) + 2) : 2);
    const r0 = Math.floor(top / TS), r1 = Math.floor((bot - 0.01) / TS);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + hw) / TS);
      for (let ty = r0; ty <= r1; ty++) if (map.solid(tx, ty)) { b.x = tx * TS - hw - 0.01; b.vx = 0; b.wallR = true; break; }
    } else {
      const tx = Math.floor((b.x - hw) / TS);
      for (let ty = r0; ty <= r1; ty++) if (map.solid(tx, ty)) { b.x = (tx + 1) * TS + hw + 0.01; b.vx = 0; b.wallL = true; break; }
    }
    if (b.bounds) { if (b.x - hw < b.bounds[0]) { b.x = b.bounds[0] + hw; b.vx = 0; b.wallL = true; } if (b.x + hw > b.bounds[1]) { b.x = b.bounds[1] - hw; b.vx = 0; b.wallR = true; } }
  }
  const prevY = b.y;
  b.y += b.vy;
  b.onSlope = false;
  if (b.vy < 0) {
    const ty = Math.floor((b.y - b.h) / TS);
    for (let tx = Math.floor((b.x - hw + 1) / TS); tx <= Math.floor((b.x + hw - 1) / TS); tx++) {
      if (map.solid(tx, ty)) { b.y = (ty + 1) * TS + b.h; b.vy = 0; break; }
    }
    b.grounded = false;
    return;
  }
  const yTop = Math.min(prevY, b.y) - (was ? STEP_UP : 0.5);
  const yBot = b.y + (was && !b.noSnap ? SNAP : 0);
  const drop = b.drop > 0;
  const c = map.floorAt(b.x, yTop, yBot, prevY, drop, true);
  let best = c.y;
  if (!map.isSlopeCol(b.x, yTop, yBot)) {
    for (const px of [b.x - hw + 1, b.x + hw - 1]) { const r = map.floorAt(px, yTop, yBot, prevY, drop, false); if (r.y < best) best = r.y; }
  }
  if (best < Infinity) { b.y = best; b.vy = 0; b.grounded = true; b.onSlope = c.slope && c.y === best; }
  else b.grounded = false;
}
