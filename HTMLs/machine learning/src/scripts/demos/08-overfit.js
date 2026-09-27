{
  const truth = x => 0.8 * Math.sin(2.6 * x) + 0.25 * x;
  const sample = (seed, n) => { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const x = r() * 1.9 - 0.95; out.push({ x, y: truth(x) + gauss(r) * 0.25 }); } return out; };

  ML.demo('poly', body => {
    let seed = 8, train = sample(seed, 12), test = sample(seed + 999, 60), deg = 3, lam = -8, showTrue = true, showTest = true;
    const cols = h('div', { class: 'fig-cols' }); body.append(cols);
    const a = h('div'), b = h('div'); cols.append(a, b);
    a.append(h('div', { class: 'sub-lbl', text: 'Data and fitted polynomial' }));
    b.append(h('div', { class: 'sub-lbl', text: 'Error vs degree (log scale)' }));
    const P = new Plot(a, { x: [-1.05, 1.05], y: [-2, 2], aspect: 0.72, maxH: 330, minH: 220, pad: { l: 8, r: 8, t: 6, b: 6 } });
    const E = new Plot(b, { x: [0, 14], y: [-2.2, 1.2], aspect: 0.9, maxH: 330, minH: 200, pad: { l: 30, r: 10, t: 6, b: 22 } });
    const mse = (w, d) => mean(d.map(p => (polyval(w, p.x) - p.y) ** 2));
    let curve = [];
    const recompute = () => { curve = []; for (let d = 0; d <= 14; d++) { const w = polyfit(train.map(p => p.x), train.map(p => p.y), d, 10 ** lam); curve.push([mse(w, train), mse(w, test)]); } };
    const draw = () => {
      const w = polyfit(train.map(p => p.x), train.map(p => p.y), deg, 10 ** lam);
      P.begin(); P.grid(0.5, 0.5); frame(P);
      if (showTrue) P.fn(truth, col('muted'), 1.5, [5, 4]);
      if (showTest) for (const p of test) P.dot(p.x, p.y, 3.5, null, col('c2'), 1.5);
      P.fn(x => polyval(w, x), col('ink'), 2.5);
      for (const p of train) P.pt(p.x, p.y, 'c1', 5.5);
      E.begin(); E.grid(2, 1); E.axes({ dx: 2, dy: 1, fy: v => '1e' + v, xl: 'degree' });
      E.seg(deg, E.y[0], deg, E.y[1], col('line'), 6);
      E.path(curve.map((c, d) => [d, Math.log10(c[0] + 1e-4)]), col('c1'), 2);
      E.path(curve.map((c, d) => [d, clamp(Math.log10(c[1] + 1e-4), -3, 1.5)]), col('c2'), 2);
      curve.forEach((c, d) => { E.dot(d, Math.log10(c[0] + 1e-4), d === deg ? 5 : 2.5, col('c1')); E.dot(d, clamp(Math.log10(c[1] + 1e-4), -3, 1.5), d === deg ? 5 : 2.5, col('c2')); });
      const [tr, te] = curve[deg], best = curve.reduce((m, c, d) => c[1] < curve[m][1] ? d : m, 0);
      st.set('tr', fmt(tr, 3)); st.set('te', fmt(te, 3)); st.set('best', best);
      st.set('v', te > curve[best][1] * 1.35 ? (deg < best ? 'underfitting' : 'overfitting') : 'about right');
    };
    P.draw = E.draw = draw;
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'polynomial degree', min: 0, max: 14, step: 1, value: deg, on: v => { deg = v; draw(); } });
    UI.slider(r1, { label: 'regularization λ', min: -8, max: 1, step: 0.1, value: lam, fmt: v => v <= -7.95 ? 'off' : '1e' + fmt(v, 1), on: v => { lam = v; recompute(); draw(); } });
    const r2 = UI.row(body);
    UI.btn(r2, 'New sample', () => { seed++; train = sample(seed, 12); test = sample(seed + 999, 60); recompute(); draw(); });
    UI.tgl(r2, 'True function', true, v => { showTrue = v; draw(); });
    UI.tgl(r2, 'Test points', true, v => { showTest = v; draw(); });
    UI.legend(body, [['c1', 'training points / training error'], ['c2', 'test points / test error'], ['muted', 'true function', 'ln']]);
    const st = UI.stats(body, [['tr', 'train MSE'], ['te', 'test MSE'], ['best', 'best degree'], ['v', 'verdict']]);
    recompute(); draw();
  });
}
