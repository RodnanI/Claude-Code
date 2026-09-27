/* Shared helpers for the 2D demos */
function drawPts(P, pts, r = 5) { for (const p of pts) P.pt(p.x, p.y, ML.classKeys[p.c], r); }
function frame(P) {
  const c = P.ctx; c.save(); c.strokeStyle = col('line'); c.lineWidth = 1;
  c.strokeRect(P.L + .5, P.T + .5, P.PW - 1, P.PH - 1); c.restore();
}
function classPlot(body, o = {}) {
  return new Plot(body, Object.assign({ x: [-1.1, 1.1], y: [-1.1, 1.1], equal: true, aspect: 0.66, maxH: 460, minH: 260, pad: { l: 4, r: 4, t: 4, b: 4 } }, o));
}
/* Tap empty space: add a point of the current class. Drag a point: move it. Tap a point: delete it. */
function editPoints(P, getPts, getClass, changed) {
  let drag = -1, moved = false, start = null;
  P.pointer({
    down(p) {
      const pts = getPts(); drag = P.pick(pts, p, 14); moved = false; start = p;
      if (drag < 0) { pts.push({ x: p.x, y: p.y, c: getClass() }); drag = pts.length - 1; moved = true; changed(); }
    },
    move(p, down) {
      if (!down || drag < 0) return;
      if (Math.hypot(p.px - start.px, p.py - start.py) > 4) moved = true;
      if (moved) { const q = getPts()[drag]; q.x = clamp(p.x, P.x[0], P.x[1]); q.y = clamp(p.y, P.y[0], P.y[1]); changed(); }
    },
    up() { if (drag >= 0 && !moved) { getPts().splice(drag, 1); changed(); } drag = -1; }
  });
}
function classPicker(parent, on) {
  return UI.seg(parent, { label: 'Add', options: [[0, 'Class A'], [1, 'Class B']], value: 0, on });
}
/* Live counts on the start page */
$$('[data-count]').forEach(e => {
  const k = e.dataset.count;
  e.textContent = k === 'figs' ? $$('figure.fig[data-demo]').length : k === 'chapters' ? $$('section.chapter[data-num]').length - 1 : $$('.quiz .q').length;
});
/* Arrow from (x1,y1) to (x2,y2) in data coordinates */
function arrow(P, x1, y1, x2, y2, color, w = 2.5) {
  const c = P.ctx, X1 = P.sx(x1), Y1 = P.sy(y1), X2 = P.sx(x2), Y2 = P.sy(y2);
  const a = Math.atan2(Y2 - Y1, X2 - X1), L = Math.hypot(X2 - X1, Y2 - Y1), hl = Math.min(11, L * 0.45);
  if (L < 1) return;
  c.save(); c.strokeStyle = c.fillStyle = color; c.lineWidth = w; c.lineCap = 'round';
  c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X2 - Math.cos(a) * hl * 0.7, Y2 - Math.sin(a) * hl * 0.7); c.stroke();
  c.beginPath(); c.moveTo(X2, Y2);
  c.lineTo(X2 - hl * Math.cos(a - 0.42), Y2 - hl * Math.sin(a - 0.42));
  c.lineTo(X2 - hl * Math.cos(a + 0.42), Y2 - hl * Math.sin(a + 0.42));
  c.closePath(); c.fill(); c.restore();
}
/* Animate an object's numeric fields toward target values */
function tween(obj, to, ms, onFrame) {
  const from = Object.assign({}, obj), t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    for (const key in to) obj[key] = lerp(from[key], to[key], e);
    onFrame(k);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
