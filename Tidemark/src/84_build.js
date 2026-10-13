/* =====================================================================
   Buildings, drawn from primitives. Stock you see piled up is the stock
   the simulation holds.
   ===================================================================== */
const WALLS = ['#e7dcc2', '#c9a25d', '#a9583d', '#efe9dd', '#a3b190', '#bf906b', '#d9c7a7'];
const ROOFS = ['#b4532f', '#9c4527', '#535c61', '#6e3c2f', '#a8492c', '#5d4a3f'];
function pal(b) { const h = (b.id * 2654435761) >>> 0; return { wall: WALLS[h % WALLS.length], roof: ROOFS[(h >>> 8) % ROOFS.length], v: (h >>> 16) % 4 }; }
function isNight(S) { const h = (S.tick % TPD) / TPH; return h < 6.2 || h > 19.3; }
function dusk(S) { const h = (S.tick % TPD) / TPH; return h < 6.2 || h > 18.2; }

/* heaps and stacks sized by real stock */
function heap(c, x, y, n, col, max) {
  if (n <= 0) return;
  const f = Math.min(1, n / (max || 24)), r = 0.12 + 0.2 * f, h = 3 + 9 * f;
  const base = [P(x - r, y, 0), P(x, y - r, 0), P(x + r, y, 0), P(x, y + r, 0)], top = P(x, y, h);
  fillPoly(c, [base[3], base[2], top], shade(col, 0.95)); fillPoly(c, [base[2], base[1], top], shade(col, 0.72));
  fillPoly(c, [base[0], base[3], top], shade(col, 1.08));
  strokePoly(c, [base[0], base[3], base[2], top], INK, 0.4);
}
function crates(c, x, y, n, col, max) {
  if (n <= 0) return;
  const k = Math.min(6, Math.ceil(Math.min(1, n / (max || 30)) * 6));
  for (let i = 0; i < k; i++) { const ox = (i % 3) * 0.17 - 0.17, oy = 0, oz = Math.floor(i / 3) * 5; isoBox(c, x + ox, y + oy, 0.15, 0.15, oz, 5, col, { ink: true }); }
}
function stockDisplay(c, S, b, spots) {
  // spots: list of [x, y]; shows the largest stocks first
  const items = [];
  for (let r = 0; r < NR; r++) { const n = b.inv[r] + b.out[r] + (b.exp ? b.exp[r] : 0); if (n > 0) items.push([n, r]); }
  items.sort((a, q) => q[0] - a[0]);
  for (let i = 0; i < items.length && i < spots.length; i++) {
    const [n, r] = items[i], [x, y] = spots[i];
    if (r === R.coal || r === R.ore || r === R.clay || r === R.grain) heap(c, x, y, n, RES[r].col, 40);
    else crates(c, x, y, n, RES[r].col, 40);
  }
}
function door(c, x0, y0, w, d, u, hgt, col) { winL(c, x0, y0, w, d, u - 0.07, u + 0.07, 0, hgt, col || '#4b3527'); }

const DRAWB = {
  house(c, S, b, night) {
    const p = pal(b), x0 = b.x + 0.1, y0 = b.y + 0.1, w = 0.8, d = 0.8, lvl = b.lvl || 1, lit = night && b.pwOn && b.res > 0;
    const fh = 13, h = lvl === 1 ? 14 : lvl === 2 ? 26 : 38;
    isoBox(c, x0, y0, w, d, 0, h, p.wall);
    windowRows(c, x0, y0, w, d, lvl === 1 ? 1 : lvl === 2 ? 2 : 3, fh, lvl === 1 ? -1 : 0, lvl === 3 ? 2.5 : 2, lit);
    door(c, x0, y0, w, d, 0.3, 8);
    const axis = p.v & 1 ? 'x' : 'y';
    if (lvl >= 2 && p.v >= 2) { gableRoof(c, x0, y0, w, d, h, 15, p.roof, p.wall, 'y'); steppedGable(c, x0, y0, w, d, h, 15, shade(p.wall, 0.95)); }
    else gableRoof(c, x0, y0, w, d, h, lvl === 1 ? 11 : 14, p.roof, p.wall, axis);
    chimney(c, x0 + 0.2, y0 + 0.25, h + 4, 7, '#7d4636', night && b.res > 0 ? 0.35 : 0.15);
  },
  market(c, S, b, night) {
    const x0 = b.x, y0 = b.y, w = b.w, d = b.h;
    for (const [px, py] of [[0.1, 0.1], [w - 0.25, 0.1], [0.1, d - 0.25], [w - 0.25, d - 0.25]]) isoBox(c, x0 + px, y0 + py, 0.15, 0.15, 0, 16, '#a9583d');
    stockDisplay(c, S, b, [[x0 + 0.6, y0 + 0.7], [x0 + 1.3, y0 + 1.2]]);
    const aw = ['#c94f3a', '#e9e1cf', '#3f6f68', '#d9a64a'];
    for (let i = 0; i < 4; i++) isoBox(c, x0 + 0.25 + i * 0.4, y0 + d - 0.3, 0.3, 0.22, 6, 2, aw[i % 4], { ink: true });
    hipRoof(c, x0, y0, w, d, 16, 14, '#4f5a5f');
    if (night && b.pwOn) { RV.lights.push([P(x0 + 0.9, y0 + 0.9, 10), 26, 0.6]); }
  },
  farm(c, S, b) {
    const x0 = b.x, y0 = b.y;
    isoBox(c, x0 + 0.1, y0 + 0.1, 1.1, 0.8, 0, 16, '#9b3e2e');
    gableRoof(c, x0 + 0.1, y0 + 0.1, 1.1, 0.8, 16, 12, '#5a5048', '#9b3e2e', 'x');
    winL(c, x0 + 0.1, y0 + 0.1, 1.1, 0.8, 0.35, 0.65, 0, 11, '#4b3527');
    // silo
    isoBox(c, x0 + 1.4, y0 + 0.3, 0.4, 0.4, 0, 26, '#cfc7b6');
    fillPoly(c, [P(x0 + 1.4 - 0.5, y0 + 0.3 - 0.5, 26), P(x0 + 1.8 - 0.5, y0 + 0.3 - 0.5, 26), P(x0 + 1.8 - 0.5, y0 + 0.7 - 0.5, 26), P(x0 + 1.4 - 0.5, y0 + 0.7 - 0.5, 26), P(x0 + 1.1, y0 + 0, 33)], '#8b9093');
    stockDisplay(c, S, b, [[x0 + 0.8, y0 + 1.4], [x0 + 1.5, y0 + 1.4]]);
    // hay bales
    isoBox(c, x0 + 0.2, y0 + 1.2, 0.3, 0.2, 0, 5, '#d8bf6a');
  },
  forester(c, S, b, night) {
    const x0 = b.x + 0.15, y0 = b.y + 0.2;
    isoBox(c, x0, y0, 0.55, 0.5, 0, 12, '#8a6340');
    gableRoof(c, x0, y0, 0.55, 0.5, 12, 9, '#4f5a45', '#8a6340', 'x');
    for (let i = 0; i < Math.min(4, Math.ceil(b.out[R.logs] / 5)); i++) { const a = P(b.x + 0.75, b.y + 0.2 + i * 0.12, 2 + (i % 2) * 2.5), q = P(b.x + 0.75, b.y + 0.7, 2 + (i % 2) * 2.5); line(c, P(b.x + 0.55, b.y + 0.75 - i * 0.1, 2 + i * 1.6), P(b.x + 0.95, b.y + 0.75 - i * 0.1, 2 + i * 1.6), '#7a5232', 3); void a; void q; }
    if (night && b.pwOn) RV.lights.push([P(x0, y0 + 0.5, 6), 8, 0.4]);
  },
  claypit(c, S, b) {
    const x0 = b.x, y0 = b.y;
    fillPoly(c, [P(x0 - 0.3, y0 - 0.3, 0), P(x0 + 1.1, y0 - 0.3, 0), P(x0 + 1.1, y0 + 1.0, 0), P(x0 - 0.3, y0 + 1.0, 0)], '#9b5c35');
    fillPoly(c, [P(x0 - 0.15, y0 - 0.15, -4), P(x0 + 0.95, y0 - 0.15, -4), P(x0 + 0.95, y0 + 0.85, -4), P(x0 - 0.15, y0 + 0.85, -4)], '#b8703f');
    isoBox(c, x0 + 1.15, y0 + 1.1, 0.6, 0.5, 0, 10, '#9e8a6d'); gableRoof(c, x0 + 1.15, y0 + 1.1, 0.6, 0.5, 10, 7, '#5d4a3f', '#9e8a6d', 'y');
    stockDisplay(c, S, b, [[x0 + 0.3, y0 + 1.5]]);
    line(c, P(x0 + 0.5, y0 + 0.4, 0), P(x0 + 1.2, y0 + 1.0, 9), '#3a3330', 1.5);
  },
  coalmine(c, S, b) { mineArt(c, S, b, '#3b3634'); },
  oremine(c, S, b) { mineArt(c, S, b, '#8a4a33'); },
  mill(c, S, b, night) {
    const x0 = b.x, y0 = b.y + 0.1, w = b.w, d = b.h - 0.2, lit = night && b.pwOn && b.wk > 0;
    const W = b.rot & 1 ? 0.8 : 1.3, D = b.rot & 1 ? 1.3 : 0.8;
    isoBox(c, x0 + 0.05, y0, W, D, 0, 36, '#a9583d');
    windowRows(c, x0 + 0.05, y0, W, D, 3, 11, 1, 2, lit);
    gableRoof(c, x0 + 0.05, y0, W, D, 36, 13, '#535c61', '#a9583d', b.rot & 1 ? 'y' : 'x');
    const sx = b.rot & 1 ? x0 + 0.25 : x0 + 1.5, sy = b.rot & 1 ? y0 + 1.45 : y0 + 0.25;
    isoBox(c, sx, sy, 0.35, 0.35, 0, 24, '#c7c1b3');
    stockDisplay(c, S, b, [[x0 + (b.rot & 1 ? 0.5 : 1.7), y0 + (b.rot & 1 ? 1.7 : 0.75)]]);
    void w; void d;
  },
  bakery(c, S, b, night) {
    const p = pal(b), x0 = b.x + 0.05, y0 = b.y + 0.1, W = b.rot & 1 ? 0.85 : 1.8, D = b.rot & 1 ? 1.8 : 0.85, lit = night && b.pwOn;
    isoBox(c, x0, y0, W, D, 0, 18, '#e3d2ad');
    windowRows(c, x0, y0, W, D, 1, 14, 0, 2.2, lit || b.st === 0);
    isoBox(c, x0 + (b.rot & 1 ? 0.75 : 0.2), y0 + (b.rot & 1 ? 0.2 : 0.75), 0.6, 0.18, 9, 2, '#b94a35', { ink: true });
    gableRoof(c, x0, y0, W, D, 18, 12, p.roof, '#e3d2ad', b.rot & 1 ? 'y' : 'x');
    chimney(c, x0 + 0.3, y0 + 0.3, 24, 9, '#7d4636', b.st === 0 ? 1 : 0);
    if (b.st === 0) RV.lights.push([P(x0 + 0.5, y0 + D, 6), 10, 0.35]);
  },
  sawmill(c, S, b) { shedArt(c, S, b, '#8f7a5c', '#5e5149', true); },
  joinery(c, S, b) { shedArt(c, S, b, '#b4987a', '#6e3c2f', true); },
  toolworks(c, S, b) { shedArt(c, S, b, '#7c6d63', '#4a4f53', true, 1); },
  brickworks(c, S, b) {
    const x0 = b.x, y0 = b.y;
    isoBox(c, x0 + 0.1, y0 + 0.1, 1.2, 0.9, 0, 14, '#8c4a34');
    for (let i = 0; i < 3; i++) winL(c, x0 + 0.1, y0 + 0.1, 1.2, 0.9, 0.15 + i * 0.3, 0.27 + i * 0.3, 0, 7, b.st === 0 ? '#e88a3c' : '#3a2a22');
    gableRoof(c, x0 + 0.1, y0 + 0.1, 1.2, 0.9, 14, 8, '#5d4a3f', '#8c4a34', 'x');
    chimney(c, x0 + 1.55, y0 + 0.35, 0, 52, '#8c4a34', b.st === 0 ? 1.5 : 0);
    stockDisplay(c, S, b, [[x0 + 0.5, y0 + 1.5], [x0 + 1.4, y0 + 1.5]]);
    if (b.st === 0) RV.lights.push([P(x0 + 0.6, y0 + 1.0, 4), 12, 0.45]);
  },
  steelworks(c, S, b) {
    const x0 = b.x, y0 = b.y, W = b.rot & 1 ? 1.8 : 2.8, D = b.rot & 1 ? 2.8 : 1.8;
    isoBox(c, x0 + 0.1, y0 + 0.1, W, D, 0, 26, '#5b5552');
    gableRoof(c, x0 + 0.1, y0 + 0.1, W, D, 26, 10, '#3e4245', '#5b5552', b.rot & 1 ? 'y' : 'x');
    winL(c, x0 + 0.1, y0 + 0.1, W, D, 0.4, 0.6, 0, 16, b.st === 0 ? '#f0913a' : '#2f2b29');
    chimney(c, x0 + 0.5, y0 + 0.5, 0, 62, '#6e5a50', b.st === 0 ? 2 : 0.2);
    chimney(c, x0 + 1.0, y0 + 0.45, 0, 54, '#6e5a50', b.st === 0 ? 2 : 0);
    if (b.st === 0) RV.lights.push([P(x0 + 1.4, y0 + D, 8), 22, 0.7]);
  },
  powerplant(c, S, b) {
    const x0 = b.x, y0 = b.y;
    isoBox(c, x0 + 0.1, y0 + 0.1, 1.3, 1.1, 0, 30, '#9b5a42');
    windowRows(c, x0 + 0.1, y0 + 0.1, 1.3, 1.1, 2, 13, 2, 1.6, b.load > 0 && dusk(S));
    gableRoof(c, x0 + 0.1, y0 + 0.1, 1.3, 1.1, 30, 9, '#4e565b', '#9b5a42', 'x');
    chimney(c, x0 + 1.6, y0 + 0.4, 0, 70, '#8a5643', b.load > 0 ? 1 + b.load / 40 : 0);
    stockDisplay(c, S, b, [[x0 + 1.5, y0 + 1.5]]);
  },
  tidemill(c, S, b) {
    const x0 = b.x + 0.15, y0 = b.y + 0.15;
    isoBox(c, x0, y0, 0.7, 0.7, 0, 18, '#e7dcc2');
    gableRoof(c, x0, y0, 0.7, 0.7, 18, 11, '#6e3c2f', '#e7dcc2', 'x');
    // the wheel turns with the tidal current
    let sd = -1; for (let k = 0; k < 4; k++) { const n = nb(S, b.y * S.W + b.x, k); if (n >= 0 && S.ter[n] === T_SEA) { sd = k; break; } }
    if (sd >= 0) {
      const cx = b.x + DX[sd] * 0.5, cy = b.y + DY[sd] * 0.5, ctr = P(cx, cy, 6), rr = 9;
      const rot = RV.t * tideFlow(S.tick) / 400;
      c.strokeStyle = '#5a4636'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(ctr[0], ctr[1], rr * 0.75, rr, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; line(c, ctr, [ctr[0] + Math.cos(a) * rr * 0.75, ctr[1] + Math.sin(a) * rr], '#5a4636', 1.2); }
    }
  },
  warehouse(c, S, b, night) {
    const x0 = b.x + 0.1, y0 = b.y + 0.1, p = pal(b);
    isoBox(c, x0, y0, 1.4, 1.1, 0, 34, '#8e5a3e');
    windowRows(c, x0, y0, 1.4, 1.1, 3, 11, 0, 1.5, false, '#d9cfbb');
    winL(c, x0, y0, 1.4, 1.1, 0.4, 0.6, 0, 26, '#3f2d22');
    gableRoof(c, x0, y0, 1.4, 1.1, 34, 14, p.roof, '#8e5a3e', 'y');
    steppedGable(c, x0, y0, 1.4, 1.1, 34, 14, '#8e5a3e');
    line(c, wallL(x0, y0, 1.4, 1.1, 0.5, 44), P(x0 + 0.2, y0 + 1.5, 44), '#3a2a20', 1.5);
    stockDisplay(c, S, b, [[b.x + 1.65, b.y + 0.4], [b.x + 1.65, b.y + 1.1], [b.x + 0.5, b.y + 1.7], [b.x + 1.2, b.y + 1.7]]);
    void night;
  },
  depot(c, S, b) {
    const x0 = b.x + 0.05, y0 = b.y + 0.1, W = b.rot & 1 ? 0.8 : 1.85, D = b.rot & 1 ? 1.85 : 0.8;
    isoBox(c, x0, y0, W, D, 0, 14, '#b7ae9c');
    for (let i = 0; i < 2; i++) { if (b.rot & 1) winR(c, x0, y0, W, D, 0.15 + i * 0.45, 0.45 + i * 0.45, 0, 10, '#5a5047'); else winL(c, x0, y0, W, D, 0.12 + i * 0.45, 0.42 + i * 0.45, 0, 10, '#5a5047'); }
    isoBox(c, x0 - 0.02, y0 - 0.02, W + 0.04, D + 0.04, 14, 2, '#6c6459');
    let n = 0; for (const v of S.vehs) if (v.k === 'truck' && v.st === 'depot' && v.at === b.id) n++;
    for (let i = 0; i < Math.min(3, n); i++) truckShape(c, b.x + (b.rot & 1 ? 0.95 : 0.35 + i * 0.55), b.y + (b.rot & 1 ? 0.35 + i * 0.55 : 0.95), b.rot & 1 ? 2 : 1, 0, -1);
  },
  station(c, S, b, night) { stationArt(c, S, b, night); },
  station2(c, S, b, night) { stationArt(c, S, b, night); },
  quay(c, S, b, night) {
    const x0 = b.x, y0 = b.y;
    fillPoly(c, [P(x0 - 0.5, y0 - 0.5, 1), P(x0 + b.w - 0.5, y0 - 0.5, 1), P(x0 + b.w - 0.5, y0 + b.h - 0.5, 1), P(x0 - 0.5, y0 + b.h - 0.5, 1)], '#b9ae98');
    for (let i = 1; i < b.w + b.h; i++) { const a = P(x0 - 0.5 + i * 0.5, y0 - 0.5, 1), q = P(x0 - 0.5 + i * 0.5, y0 + b.h - 0.5, 1); line(c, a, q, 'rgba(90,80,64,0.25)', 0.6); }
    isoBox(c, x0 + 0.1, y0 + 0.1, 0.7, 0.6, 1, 16, '#e7dcc2'); gableRoof(c, x0 + 0.1, y0 + 0.1, 0.7, 0.6, 17, 9, '#b4532f', '#e7dcc2', 'x');
    windowRows(c, x0 + 0.1, y0 + 0.1, 0.7, 0.6, 1, 12, 1, 2, night);
    stockDisplay(c, S, b, [[x0 + 1.1, y0 + 0.3], [x0 + 1.7, y0 + 0.3], [x0 + 1.1, y0 + 1.0], [x0 + 1.7, y0 + 1.0], [x0 + 2.3, y0 + 0.4], [x0 + 2.3, y0 + 1.0]]);
    craneArt(c, x0 + 1.4, y0 + b.h - 0.65, b.id);
    if (b.w >= 3) craneArt(c, x0 + 2.4, y0 + b.h - 0.65, b.id + 7);
    if (night) RV.lights.push([P(x0 + 1.4, y0 + 1, 18), 24, 0.5]);
  },
  wharf(c, S, b, night) {
    const x0 = b.x, y0 = b.y;
    fillPoly(c, [P(x0 - 0.5, y0 - 0.5, 1), P(x0 + b.w - 0.5, y0 - 0.5, 1), P(x0 + b.w - 0.5, y0 + b.h - 0.5, 1), P(x0 - 0.5, y0 + b.h - 0.5, 1)], '#8a6a4c');
    for (let i = 0; i < 8; i++) { const u = i / 8; line(c, P(x0 - 0.5 + u * b.w, y0 - 0.5, 1), P(x0 - 0.5 + u * b.w, y0 + b.h - 0.5, 1), '#6e533a', 0.6); }
    stockDisplay(c, S, b, [[x0 + 0.1, y0 + 0.1], [x0 + 0.8, y0 + 0.1], [x0 + 1.4, y0 + 0.1]]);
    craneArt(c, x0 + 0.9, y0 + 0.3, b.id);
    if (night) RV.lights.push([P(x0 + 0.5, y0, 14), 16, 0.4]);
  },
  lighthouse(c, S, b, night) {
    const x0 = b.x + 0.3, y0 = b.y + 0.3;
    for (let i = 0; i < 6; i++) isoBox(c, x0 + i * 0.012, y0 + i * 0.012, 0.4 - i * 0.024, 0.4 - i * 0.024, i * 9, 9, i % 2 ? '#c2412f' : '#f1ece2', { ink: i === 5 });
    isoBox(c, x0 + 0.05, y0 + 0.05, 0.3, 0.3, 54, 7, '#e8d58a');
    isoBox(c, x0 + 0.03, y0 + 0.03, 0.34, 0.34, 61, 3, '#2f3437');
    if (night) { RV.lights.push([P(b.x + 0.5, b.y + 0.5, 58), 40, 0.9]); RV.beam = P(b.x + 0.5, b.y + 0.5, 58); }
  },
};
function mineArt(c, S, b, heapCol) {
  const x0 = b.x, y0 = b.y;
  isoBox(c, x0 + 0.9, y0 + 0.1, 0.9, 0.7, 0, 14, '#7a6a5c'); gableRoof(c, x0 + 0.9, y0 + 0.1, 0.9, 0.7, 14, 8, '#4e565b', '#7a6a5c', 'x');
  // headframe
  const bx = x0 + 0.3, by = y0 + 0.4, top = 46;
  const legs = [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]];
  for (const [ox, oy] of legs) line(c, P(bx + ox, by + oy, 0), P(bx + ox * 0.4, by + oy * 0.4, top), '#3d3530', 1.4);
  for (let k = 1; k < 4; k++) { const z = top * k / 4, s = 1 - 0.6 * k / 4; strokePoly(c, legs.map(([ox, oy]) => P(bx + ox * s, by + oy * s, z)), '#3d3530', 0.8); }
  const wc = P(bx, by, top + 4), ang = b.st === 0 ? RV.t * 3 : 0;
  c.strokeStyle = '#2b2522'; c.lineWidth = 1.4; c.beginPath(); c.arc(wc[0], wc[1], 5, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 4; i++) { const a = ang + i * Math.PI / 2; line(c, wc, [wc[0] + Math.cos(a) * 5, wc[1] + Math.sin(a) * 5], '#2b2522', 1); }
  line(c, wc, P(x0 + 1.1, y0 + 0.4, 12), '#2b2522', 0.7);
  stockDisplay(c, S, b, [[x0 + 0.6, y0 + 1.4], [x0 + 1.4, y0 + 1.3]]);
  if (!b.out.some(n => n > 0)) heap(c, x0 + 0.6, y0 + 1.4, 3, heapCol, 40);
}
function shedArt(c, S, b, wall, roof, saw, chim) {
  const x0 = b.x + 0.08, y0 = b.y + 0.08, W = b.w - 0.16, D = b.h - 0.16, H = 18;
  isoBox(c, x0, y0, W, D, 0, H, wall);
  windowRows(c, x0, y0, W, D, 1, 14, 0, 1.6, b.st === 0 && dusk(S), '#cfc5b2');
  // sawtooth roof: a row of north-light ridges
  const n = Math.max(2, Math.round((b.rot & 1 ? D : W) * 2));
  for (let i = 0; i < n; i++) {
    if (b.rot & 1) { const yy = y0 + i * D / n; gableRoof(c, x0, yy, W, D / n, H, 8, roof, wall, 'x', { rows: 2 }); }
    else { const xx = x0 + i * W / n; gableRoof(c, xx, y0, W / n, D, H, 8, roof, wall, 'y', { rows: 2 }); }
  }
  if (chim) chimney(c, x0 + 0.2, y0 + 0.2, H, 26, '#6e5a50', b.st === 0 ? 1.2 : 0);
  stockDisplay(c, S, b, b.rot & 1 ? [[b.x + b.w - 0.1, b.y + b.h], [b.x + 0.2, b.y + b.h + 0.05]] : [[b.x + b.w, b.y + 0.3], [b.x + b.w, b.y + b.h - 0.2]]);
}
function craneArt(c, x, y, seed) {
  const top = 34, base = P(x, y, 1), mast = P(x, y, top);
  isoBox(c, x - 0.12, y - 0.12, 0.24, 0.24, 1, 6, '#5a5f62');
  line(c, base, mast, '#2f3437', 2);
  const a = Math.sin(RV.t * 0.25 + seed) * 1.1, jx = Math.cos(a) * 0.9, jy = Math.sin(a) * 0.9;
  const tip = P(x + jx, y + jy, top + 4);
  line(c, mast, tip, '#c9a23f', 2); line(c, P(x - jx * 0.3, y - jy * 0.3, top + 2), mast, '#c9a23f', 2);
  const hook = P(x + jx * 0.85, y + jy * 0.85, top - 14 + 6 * Math.sin(RV.t * 0.7 + seed));
  line(c, P(x + jx * 0.85, y + jy * 0.85, top + 3), hook, '#2f3437', 0.6);
}
function stationArt(c, S, b, night) {
  const ax = b.rot & 1, rows = ax ? b.w : b.h, len = ax ? b.h : b.w;
  // platform strip: beside the single track, or an island between two tracks
  const a = 0.3, bb = rows === 1 ? 0.5 : 0.7;
  const strip = (z, h, col) => ax ? isoBox(c, b.x + a + 0.5, b.y, bb - a, len, z, h, col) : isoBox(c, b.x, b.y + a + 0.5, len, bb - a, z, h, col);
  strip(0, 3, '#b8ae9a');
  const at = (u, v, z) => ax ? P(b.x + v, b.y - 0.5 + u, z) : P(b.x - 0.5 + u, b.y + v, z);
  for (let i = 0; i < len; i++) { const u = i + 0.5; line(c, at(u, (a + bb) / 2, 3), at(u, (a + bb) / 2, 15), '#4e4a46', 1.4); }
  const ca = a - 0.12, cb = bb + (rows === 1 ? 0.02 : 0.12);
  fillPoly(c, [at(0.15, ca, 16), at(len - 0.15, ca, 16), at(len - 0.15, cb, 15), at(0.15, cb, 15)], '#8a3f2b');
  line(c, at(0.15, cb, 15), at(len - 0.15, cb, 15), '#5e2a1d', 1);
  // a small booking office at the near end of the platform
  if (ax) isoBox(c, b.x + a + 0.5, b.y + len - 0.55, bb - a, 0.45, 3, 12, '#e7dcc2'); else isoBox(c, b.x + len - 0.55, b.y + a + 0.5, 0.45, bb - a, 3, 12, '#e7dcc2');
  if (night) for (let i = 0; i < len; i++) RV.lights.push([at(i + 0.5, (a + bb) / 2, 13), 14, 0.5]);
  const piles = []; for (let i = 0; i < len; i++) piles.push(ax ? [b.x + (a + bb) / 2, b.y + i] : [b.x + i, b.y + (a + bb) / 2]);
  c.save(); stockDisplay(c, S, b, piles.slice(0, 2)); c.restore();
}
