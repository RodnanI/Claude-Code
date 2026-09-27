{
  /* Linear SVM by dual coordinate descent (Hsieh et al. 2008), bias as an augmented feature */
  const AUG = 3;
  const trainSVM = (pts, C) => {
    const n = pts.length, X = pts.map(p => [p.x, p.y, AUG]), Y = pts.map(p => p.c ? 1 : -1), a = new Array(n).fill(0), w = [0, 0, 0];
    const Q = X.map(x => x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
    for (let ep = 0; ep < 3000; ep++) {
      let maxPG = 0;
      for (let i = 0; i < n; i++) {
        const G = Y[i] * (w[0] * X[i][0] + w[1] * X[i][1] + w[2] * X[i][2]) - 1;
        const PG = a[i] === 0 ? Math.min(G, 0) : a[i] === C ? Math.max(G, 0) : G;
        maxPG = Math.max(maxPG, Math.abs(PG));
        if (Math.abs(PG) > 1e-12) {
          const old = a[i]; a[i] = Math.min(Math.max(a[i] - G / Q[i], 0), C);
          const d = (a[i] - old) * Y[i];
          w[0] += d * X[i][0]; w[1] += d * X[i][1]; w[2] += d * X[i][2];
        }
      }
      if (maxPG < 1e-5) break;
    }
    return { w: [w[0], w[1]], b: w[2] * AUG, a };
  };

  ML.demo('svm', body => {
    const r = rng(9); let pts = [], C = 1, cls = 0, M;
    for (let i = 0; i < 26; i++) { const c = i % 2; pts.push({ x: (c ? 0.4 : -0.4) + gauss(r) * 0.22, y: (c ? 0.25 : -0.25) + gauss(r) * 0.22, c }); }
    const P = classPlot(body);
    const f = (x, y) => M.w[0] * x + M.w[1] * y + M.b;
    const line = (off, color, w, dash) => {
      const [a, b] = M.w;
      if (Math.abs(b) > Math.abs(a)) P.fn(x => (off - M.b - a * x) / b, color, w, dash);
      else if (Math.abs(a) > 1e-9) P.seg((off - M.b - b * P.y[0]) / a, P.y[0], (off - M.b - b * P.y[1]) / a, P.y[1], color, w, dash);
    };
    const draw = () => {
      P.begin();
      P.field((x, y) => { const v = f(x, y), c = v >= 0 ? rgb('c2') : rgb('c1'); return [c[0], c[1], c[2], Math.abs(v) < 1 ? 20 : 55]; }, 4);
      frame(P);
      line(0, col('ink'), 2.2); line(1, col('ink-2'), 1.2, [5, 4]); line(-1, col('ink-2'), 1.2, [5, 4]);
      drawPts(P, pts, 5.5);
      let sv = 0, err = 0;
      pts.forEach((p, i) => { if (M.a[i] > 1e-6) { sv++; P.dot(p.x, p.y, 10, null, col('ink'), 1.8); } if ((f(p.x, p.y) >= 0 ? 1 : 0) !== p.c) err++; });
      const nw = Math.hypot(...M.w);
      st.set('m', nw > 1e-9 ? fmt(2 / nw, 3) : 'inf'); st.set('sv', sv); st.set('e', err);
    };
    P.draw = draw;
    const refit = () => { M = trainSVM(pts, C); draw(); };
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'C (penalty for margin violations)', min: -2, max: 2, step: 0.05, value: 0, fmt: v => fmt(10 ** v, 2), on: v => { C = 10 ** v; refit(); } });
    const r2 = UI.row(body);
    classPicker(r2, v => cls = v);
    UI.legend(body, [['ink', 'decision boundary', 'ln'], ['ink-2', 'margin edges', 'ln'], ['ink', 'ringed: support vectors', 'sq faint']]);
    const st = UI.stats(body, [['m', 'margin width'], ['sv', 'support vectors'], ['e', 'training errors']]);
    editPoints(P, () => pts, () => cls, refit);
    refit();
  });

  /* ---------- Kernel trick: lift 1D data into 2D ---------- */
  ML.demo('lift', body => {
    const xs = [-2.8, -2.4, -2.1, -1.8, -1.6, -1.1, -0.8, -0.5, -0.2, 0.1, 0.4, 0.7, 1.0, 1.25, 1.7, 1.95, 2.3, 2.7];
    const pts = xs.map(x => ({ x, c: Math.abs(x) > 1.45 ? 1 : 0 }));
    const s = { t: 0 };
    const P = new Plot(body, { x: [-3.2, 3.2], y: [-0.8, 9], aspect: 0.5, maxH: 320, minH: 200, pad: { l: 26, r: 8, t: 8, b: 20 } });
    P.draw = () => {
      P.begin(); P.grid(1, 1); P.axes({ dx: 1, dy: 2, xl: 'x', yl: s.t > 0.02 ? 'new feature: x²' : '' });
      if (s.t > 0.02) P.fn(x => s.t * x * x, rgba('ink-2', 0.35 * s.t), 1.2, [3, 4]);
      if (s.t > 0.85) { const a = (s.t - 0.85) / 0.15; P.seg(-3.2, 1.45 ** 2 * s.t, 3.2, 1.45 ** 2 * s.t, rgba('accent', a), 2.2); P.text('a straight line now separates them', P.sx(-3.1), P.sy(1.45 ** 2 * s.t) - 7, { color: col('accent') }); }
      for (const p of pts) P.pt(p.x, s.t * p.x * p.x, ML.classKeys[p.c], 6);
    };
    const r1 = UI.row(body);
    const b = UI.btn(r1, 'Lift with x²', () => { const to = s.t > 0.5 ? 0 : 1; b.textContent = to ? 'Drop back to 1D' : 'Lift with x²'; tween(s, { t: to }, 900, () => P.draw()); }, 'primary');
    P.draw();
  });
}
