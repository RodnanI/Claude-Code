/* =====================================================================
   RENDER LAYER. Reads the simulation, never writes to it. Everything in
   here may use floats, Math.random and wall-clock time freely, because
   none of it feeds back into the economy. Graphics settings live in RV.
   ===================================================================== */
const HW = 32, HH = 16;
const RV = {
  cam: { x: 0, y: 0, z: 1 }, dpr: 1, vw: 1, vh: 1, t: 0, alpha: 0,
  q: 2, wxOn: 1, walkDensity: 1, showNet: '', sel: null, hoverT: -1,
  walkers: [], parts: [], gulls: [], lights: [], vpos: new Map(), prevTick: -1, ghost: null, route: null,
};
const rnd01 = (n) => { let h = (n | 0) * 374761393; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 10000) / 10000; };
function P(x, y, z) { return [(x - y) * HW, (x + y) * HH - (z || 0)]; }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function fillPoly(c, pts, col) { poly(c, pts); c.fillStyle = col; c.fill(); }
function strokePoly(c, pts, col, w) { poly(c, pts); c.strokeStyle = col; c.lineWidth = w || 1; c.stroke(); }
function line(c, a, b, col, w) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = col; c.lineWidth = w || 1; c.stroke(); }
function tileQ(x, y, z, inset) { const i = 0.5 - (inset || 0); return [P(x - i, y - i, z), P(x + i, y - i, z), P(x + i, y + i, z), P(x - i, y + i, z)]; }

/* colour utilities with a small cache */
const _col = new Map();
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function shade(h, f) {
  const k = h + '|' + f; let v = _col.get(k); if (v) return v;
  const [r, g, b] = hexRgb(h);
  const cl = x => Math.max(0, Math.min(255, Math.round(x)));
  v = f <= 1 ? 'rgb(' + cl(r * f) + ',' + cl(g * f) + ',' + cl(b * f) + ')' : 'rgb(' + cl(r + (255 - r) * (f - 1)) + ',' + cl(g + (255 - g) * (f - 1)) + ',' + cl(b + (255 - b) * (f - 1)) + ')';
  _col.set(k, v); return v;
}
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); const m = i => Math.round(A[i] + (B[i] - A[i]) * t); return '#' + ((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1); }
const INK = 'rgba(38,30,24,0.55)';

/* An isometric box over tiles [x0, x0+w) x [y0, y0+d), from height z0 up h px. */
function isoBox(c, x0, y0, w, d, z0, h, col, o) {
  o = o || {};
  const x1 = x0 + w - 0.5, y1 = y0 + d - 0.5, xa = x0 - 0.5, ya = y0 - 0.5;
  const N = P(xa, ya, z0 + h), E = P(x1, ya, z0 + h), S_ = P(x1, y1, z0 + h), W_ = P(xa, y1, z0 + h);
  const Eb = P(x1, ya, z0), Sb = P(x1, y1, z0), Wb = P(xa, y1, z0);
  fillPoly(c, [W_, S_, Sb, Wb], o.left || shade(col, 0.9));
  fillPoly(c, [S_, E, Eb, Sb], o.right || shade(col, 0.72));
  if (!o.noTop) fillPoly(c, [N, E, S_, W_], o.top || shade(col, 1.06));
  if (o.ink !== false) { c.strokeStyle = INK; c.lineWidth = 0.6; poly(c, [Wb, W_, N, E, Eb, Sb]); c.stroke(); line(c, S_, Sb, INK, 0.6); line(c, W_, S_, INK, 0.5); line(c, S_, E, INK, 0.5); }
}
/* Points on the two visible walls of a box: left wall (+y side) and right wall (+x side). */
function wallL(x0, y0, w, d, u, z) { return P(x0 - 0.5 + u * w, y0 + d - 0.5, z); }
function wallR(x0, y0, w, d, u, z) { return P(x0 + w - 0.5, y0 + d - 0.5 - u * d, z); }
function winL(c, x0, y0, w, d, u0, u1, z0, z1, col) { fillPoly(c, [wallL(x0, y0, w, d, u0, z0), wallL(x0, y0, w, d, u1, z0), wallL(x0, y0, w, d, u1, z1), wallL(x0, y0, w, d, u0, z1)], col); }
function winR(c, x0, y0, w, d, u0, u1, z0, z1, col) { fillPoly(c, [wallR(x0, y0, w, d, u0, z0), wallR(x0, y0, w, d, u1, z0), wallR(x0, y0, w, d, u1, z1), wallR(x0, y0, w, d, u0, z1)], col); }
/* rows of windows on both walls; records light positions when lit */
function windowRows(c, x0, y0, w, d, floors, fh, base, perTile, lit, frame) {
  const glass = lit ? '#f5c76a' : '#3d4b52', fr = frame || '#e9e2d2';
  for (let f = 0; f < floors; f++) {
    const z0 = base + f * fh + fh * 0.32, z1 = z0 + fh * 0.42;
    const nL = Math.max(1, Math.round(w * perTile)), nR = Math.max(1, Math.round(d * perTile));
    for (let i = 0; i < nL; i++) { const u = (i + 0.5) / nL, hw = 0.16 / nL * 2.2; winL(c, x0, y0, w, d, u - hw - 0.02, u + hw + 0.02, z0 - 1, z1 + 1, fr); winL(c, x0, y0, w, d, u - hw, u + hw, z0, z1, glass); if (lit) RV.lights.push([wallL(x0, y0, w, d, u, (z0 + z1) / 2), 7, 0.55]); }
    for (let i = 0; i < nR; i++) { const u = (i + 0.5) / nR, hw = 0.16 / nR * 2.2; winR(c, x0, y0, w, d, u - hw - 0.02, u + hw + 0.02, z0 - 1, z1 + 1, fr); winR(c, x0, y0, w, d, u - hw, u + hw, z0, z1, shade(glass === '#3d4b52' ? glass : '#e8b85c', 1)); if (lit) RV.lights.push([wallR(x0, y0, w, d, u, (z0 + z1) / 2), 7, 0.45]); }
  }
}
/* Gable roof with visible tile courses. axis 'x': ridge runs along x. */
function gableRoof(c, x0, y0, w, d, z, rh, col, wallCol, axis, o) {
  o = o || {};
  const ov = 0.07, xa = x0 - 0.5 - ov, xb = x0 + w - 0.5 + ov, ya = y0 - 0.5 - ov, yb = y0 + d - 0.5 + ov;
  if (axis === 'x') {
    const yc = y0 + d / 2 - 0.5;
    const back = [P(xa, ya, z), P(xb, ya, z), P(xb, yc, z + rh), P(xa, yc, z + rh)];
    const front = [P(xa, yb, z), P(xb, yb, z), P(xb, yc, z + rh), P(xa, yc, z + rh)];
    fillPoly(c, back, shade(col, 0.78));
    fillPoly(c, [P(x0 + w - 0.5, y0 - 0.5, z), P(x0 + w - 0.5, y0 + d - 0.5, z), P(x0 + w - 0.5, yc, z + rh)], shade(wallCol, 0.72));
    fillPoly(c, front, col);
    courses(c, front, [P(xa, yb, z), P(xb, yb, z)], [P(xa, yc, z + rh), P(xb, yc, z + rh)], col, o.rows || 4, w);
    line(c, P(xa, yc, z + rh), P(xb, yc, z + rh), shade(col, 0.6), 1.2);
    strokePoly(c, front, INK, 0.6);
  } else {
    const xc = x0 + w / 2 - 0.5;
    const back = [P(xa, ya, z), P(xa, yb, z), P(xc, yb, z + rh), P(xc, ya, z + rh)];
    const front = [P(xb, ya, z), P(xb, yb, z), P(xc, yb, z + rh), P(xc, ya, z + rh)];
    fillPoly(c, back, shade(col, 0.9));
    fillPoly(c, front, shade(col, 0.8));
    courses(c, front, [P(xb, yb, z), P(xb, ya, z)], [P(xc, yb, z + rh), P(xc, ya, z + rh)], shade(col, 0.8), o.rows || 4, d);
    fillPoly(c, [P(x0 - 0.5, y0 + d - 0.5, z), P(x0 + w - 0.5, y0 + d - 0.5, z), P(xc, y0 + d - 0.5, z + rh)], shade(wallCol, 0.92));
    line(c, P(xc, ya, z + rh), P(xc, yb, z + rh), shade(col, 0.55), 1.2);
    strokePoly(c, front, INK, 0.6);
    strokePoly(c, back, INK, 0.5);
  }
}
/* draw tile courses between an eave segment and a ridge segment, clipped to the slope */
function courses(c, slope, eave, ridge, col, rows, len) {
  if (RV.q < 1) return;
  c.save(); poly(c, slope); c.clip();
  const dark = shade(col, 0.82), lite = shade(col, 1.12);
  for (let k = 1; k <= rows; k++) {
    const t = k / (rows + 0.6);
    const a = [eave[0][0] + (ridge[0][0] - eave[0][0]) * t, eave[0][1] + (ridge[0][1] - eave[0][1]) * t];
    const b = [eave[1][0] + (ridge[1][0] - eave[1][0]) * t, eave[1][1] + (ridge[1][1] - eave[1][1]) * t];
    line(c, a, b, dark, 0.9);
    if (RV.q >= 2) {
      const n = Math.max(3, Math.round(len * 5)), off = (k & 1) ? 0.5 : 0;
      const t2 = (k - 1) / (rows + 0.6);
      const a2 = [eave[0][0] + (ridge[0][0] - eave[0][0]) * t2, eave[0][1] + (ridge[0][1] - eave[0][1]) * t2];
      const b2 = [eave[1][0] + (ridge[1][0] - eave[1][0]) * t2, eave[1][1] + (ridge[1][1] - eave[1][1]) * t2];
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const u = (i + off) / n;
        c.moveTo(a2[0] + (b2[0] - a2[0]) * u, a2[1] + (b2[1] - a2[1]) * u);
        c.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u);
      }
      c.strokeStyle = dark; c.lineWidth = 0.45; c.stroke();
      line(c, [a2[0], a2[1] - 0.6], [b2[0], b2[1] - 0.6], lite, 0.4);
    }
  }
  c.restore();
}
function hipRoof(c, x0, y0, w, d, z, rh, col) {
  const ov = 0.06, xa = x0 - 0.5 - ov, xb = x0 + w - 0.5 + ov, ya = y0 - 0.5 - ov, yb = y0 + d - 0.5 + ov;
  const inset = Math.min(w, d) * 0.35;
  const r1 = P(xa + inset, ya + inset, z + rh), r2 = P(xb - inset, yb - inset, z + rh);
  const rA = w >= d ? P(xa + inset, (ya + yb) / 2, z + rh) : P((xa + xb) / 2, ya + inset, z + rh);
  const rB = w >= d ? P(xb - inset, (ya + yb) / 2, z + rh) : P((xa + xb) / 2, yb - inset, z + rh);
  const N = P(xa, ya, z), E = P(xb, ya, z), S_ = P(xb, yb, z), W_ = P(xa, yb, z);
  fillPoly(c, [N, E, rB, rA], shade(col, 0.75));
  fillPoly(c, [N, W_, rA], shade(col, 0.85));
  fillPoly(c, [W_, S_, rB, rA], col);
  fillPoly(c, [S_, E, rB], shade(col, 0.8));
  courses(c, [W_, S_, rB, rA], [W_, S_], [rA, rB], col, 3, w);
  strokePoly(c, [W_, S_, rB, rA], INK, 0.5); strokePoly(c, [S_, E, rB], INK, 0.5);
  void r1; void r2;
}
/* a stepped (Dutch) gable on the left wall of a box */
function steppedGable(c, x0, y0, w, d, z, rh, col) {
  const yF = y0 + d - 0.5, xa = x0 - 0.5, xb = x0 + w - 0.5, steps = 3;
  const pts = [P(xa, yF, z)];
  for (let s = 0; s < steps; s++) { const u = s / steps / 2, zz = z + rh * (s + 1) / steps; pts.push(P(xa + w * u, yF, zz)); pts.push(P(xa + w * (u + 0.5 / steps), yF, zz)); }
  for (let s = steps - 1; s >= 0; s--) { const u = 1 - s / steps / 2, zz = z + rh * (s + 1) / steps; pts.push(P(xa + w * (u - 0.5 / steps), yF, zz)); pts.push(P(xa + w * u, yF, zz)); }
  pts.push(P(xb, yF, z));
  fillPoly(c, pts, col); strokePoly(c, pts, INK, 0.6);
}
function chimney(c, x, y, z, h, col, smoke) {
  isoBox(c, x - 0.07, y - 0.07, 0.14, 0.14, z, h, col, { ink: true });
  if (smoke) RV.smoke.push([P(x, y, z + h), smoke]);
}
