{
  /* ---------- 1D sigmoid fit ---------- */
  const HOURS = [[0.8, 0], [1.5, 0], [2.1, 0], [2.6, 0], [3.2, 0], [3.9, 1], [4.3, 0], [4.8, 0], [5.4, 1], [5.9, 0], [6.3, 1], [6.9, 1], [7.4, 1], [8.1, 1], [8.8, 1], [9.4, 1]];
  const logloss = (w, b) => mean(HOURS.map(([x, y]) => { const p = clamp(sigmoid(w * x + b), 1e-9, 1 - 1e-9); return -(y * Math.log(p) + (1 - y) * Math.log(1 - p)); }));
  const newton = () => {
    let w = 0, b = 0;
    for (let it = 0; it < 30; it++) {
      let gw = 0, gb = 0, hww = 1e-3, hwb = 0, hbb = 1e-3;
      for (const [x, y] of HOURS) { const p = sigmoid(w * x + b), s = p * (1 - p); gw += (p - y) * x; gb += p - y; hww += s * x * x; hwb += s * x; hbb += s; }
      const det = hww * hbb - hwb * hwb;
      w -= (hbb * gw - hwb * gb) / det; b -= (hww * gb - hwb * gw) / det;
    }
    return { w, b };
  };
  ML.demo('sigmoid', body => {
    const m = { w: 0.6, b: -2 };
    const P = new Plot(body, { x: [0, 10], y: [-0.08, 1.08], aspect: 0.46, maxH: 340, minH: 220, pad: { l: 30, r: 10, t: 10, b: 22 } });
    P.draw = () => {
      P.begin(); P.grid(1, 0.25); P.axes({ dx: 1, dy: 0.5, xl: 'hours studied', yl: 'P(pass)' });
      const f = x => sigmoid(m.w * x + m.b), bx = -m.b / m.w;
      if (Math.abs(m.w) > 1e-3 && bx > 0 && bx < 10) { P.seg(bx, -0.08, bx, 1.08, col('muted'), 1.2, [4, 4]); P.text('boundary, p = 0.5', P.sx(bx) + 6, P.sy(0.52), { color: col('muted') }); }
      for (const [x, y] of HOURS) P.seg(x, y, x, f(x), rgba('accent', 0.6), 1.2);
      P.fn(f, col('ink'), 2.5);
      for (const [x, y] of HOURS) P.pt(x, y, y ? 'c2' : 'c1', 6);
      const acc = mean(HOURS.map(([x, y]) => (f(x) >= 0.5 ? 1 : 0) === y ? 1 : 0));
      st.set('l', fmt(logloss(m.w, m.b), 3)); st.set('a', Math.round(acc * 100) + '%'); st.set('w', fmt(m.w, 2)); st.set('b', fmt(m.b, 2));
    };
    const r = UI.row(body);
    const sw = UI.slider(r, { label: 'w (steepness)', min: -1, max: 4, step: 0.01, value: m.w, fmt: v => fmt(v, 2), on: v => { m.w = v; P.draw(); } });
    const sb = UI.slider(r, { label: 'b (shift)', min: -20, max: 5, step: 0.05, value: m.b, fmt: v => fmt(v, 2), on: v => { m.b = v; P.draw(); } });
    UI.btn(r, 'Best fit', () => { const o = newton(); tween(m, o, 700, () => { sw.set(m.w); sb.set(m.b); P.draw(); }); }, 'primary');
    UI.legend(body, [['c1', 'failed (y = 0)'], ['c2', 'passed (y = 1)'], ['ink', 'predicted P(pass)', 'ln']]);
    const st = UI.stats(body, [['l', 'log loss'], ['a', 'accuracy'], ['w', 'w'], ['b', 'b']]);
    P.draw();
  });

  /* ---------- 2D logistic regression, trained live ---------- */
  ML.demo('logreg', (body, fig) => {
    let pts = Data.blobs(80, 3, 0.45), quad = false, cls = 0, W = [0, 0], B = 0, lossHist = [], calm = 0;
    const feats = (x, y) => quad ? [x, y, x * x, y * y, x * y] : [x, y];
    const prob = (x, y) => { const f = feats(x, y); let z = B; for (let i = 0; i < f.length; i++) z += W[i] * f[i]; return sigmoid(z); };
    const reset = () => { W = new Array(quad ? 5 : 2).fill(0); B = 0; calm = 0; loop.start(); };
    const train = () => {
      const n = pts.length; if (!n) return 0;
      const g = new Array(W.length).fill(0); let gb = 0, loss = 0;
      for (const p of pts) {
        const f = feats(p.x, p.y), q = prob(p.x, p.y), e = q - p.c;
        loss -= p.c * Math.log(q + 1e-9) + (1 - p.c) * Math.log(1 - q + 1e-9);
        for (let i = 0; i < f.length; i++) g[i] += e * f[i]; gb += e;
      }
      for (let i = 0; i < W.length; i++) W[i] -= 1.5 * (g[i] / n + 0.002 * W[i]);
      B -= 1.5 * gb / n;
      return loss / n;
    };
    const P = classPlot(body);
    P.draw = () => {
      P.begin(); P.field((x, y) => probPx(prob(x, y)), 5); frame(P);
      if (!quad && Math.abs(W[1]) > 1e-6) P.fn(x => -(W[0] * x + B) / W[1], col('ink'), 1.5, [5, 4]);
      drawPts(P, pts);
      const acc = pts.length ? mean(pts.map(p => (prob(p.x, p.y) >= 0.5 ? 1 : 0) === p.c ? 1 : 0)) : 0;
      st.set('a', Math.round(acc * 100) + '%');
      st.set('w', W.map(v => fmt(v, 1)).join(', '));
    };
    let last = 0;
    const loop = ML.loop(fig, () => {
      let l = 0; for (let k = 0; k < 8; k++) l = train();
      st.set('l', fmt(l, 3)); P.draw();
      calm = Math.abs(last - l) < 1e-5 ? calm + 1 : 0; last = l;
      if (calm > 30) return false;
    });
    const r = UI.row(body);
    UI.seg(r, { label: 'Data', options: [['blobs', 'Blobs'], ['circles', 'Circle'], ['xor', 'XOR']], value: 'blobs', on: v => { pts = Data[v](80, 3, 0.45); reset(); } });
    UI.tgl(r, 'Add x², y², xy features', false, v => { quad = v; reset(); });
    const r2 = UI.row(body);
    classPicker(r2, v => cls = v);
    UI.btn(r2, 'Restart training', reset);
    const st = UI.stats(body, [['l', 'log loss'], ['a', 'accuracy'], ['w', 'weights']]);
    editPoints(P, () => pts, () => cls, () => { calm = 0; loop.start(); P.draw(); });
    reset();
  });
}
