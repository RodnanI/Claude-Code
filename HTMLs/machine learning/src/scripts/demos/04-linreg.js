{
  const ols = pts => {
    const n = pts.length; if (n < 2) return { w: 0, b: n ? pts[0].y : 0 };
    const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y));
    let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; }
    const w = sxx > 1e-12 ? sxy / sxx : 0; return { w, b: my - w * mx };
  };
  const mse = (pts, w, b) => pts.length ? mean(pts.map(p => (p.y - (w * p.x + b)) ** 2)) : 0;
  const sample = seed => { const r = rng(seed), out = []; for (let i = 0; i < 9; i++) { const x = 0.6 + i * 1.08 + r() * 0.5; out.push({ x, y: 1.4 + 0.75 * x + gauss(r) * 1.1, c: 0 }); } return out; };

  ML.demo('linreg', body => {
    let pts = sample(4), auto = false, squares = true;
    const m = { w: 0.2, b: 3 };
    const P = new Plot(body, { x: [0, 10.5], y: [-1, 12], aspect: 0.6, maxH: 430, minH: 260, pad: { l: 28, r: 10, t: 10, b: 22 } });
    P.draw = () => {
      if (auto) { const o = ols(pts); m.w = o.w; m.b = o.b; sw.set(m.w); sb.set(m.b); }
      const c = P.begin(); P.grid(1, 1); P.axes({ dx: 2, dy: 2, xl: 'size (feature x)', yl: 'price (target y)' });
      if (squares) for (const p of pts) {
        const yh = m.w * p.x + m.b, s = Math.abs(P.sy(p.y) - P.sy(yh)), X = P.sx(p.x), Y = Math.min(P.sy(p.y), P.sy(yh));
        const left = X + s > P.L + P.PW;
        c.fillStyle = rgba('accent', 0.1); c.strokeStyle = rgba('accent', 0.45); c.lineWidth = 1;
        c.fillRect(left ? X - s : X, Y, s, s); c.strokeRect(left ? X - s : X, Y, s, s);
      }
      for (const p of pts) P.seg(p.x, p.y, p.x, m.w * p.x + m.b, col('accent'), 1.5);
      P.fn(x => m.w * x + m.b, col('ink'), 2.5);
      for (const p of pts) P.dot(p.x, p.y, 5.5, col('ink'), col('surface'), 2);
      const cur = mse(pts, m.w, m.b), o = ols(pts), best = mse(pts, o.w, o.b);
      st.set('mse', fmt(cur, 2)); st.set('best', fmt(best, 2)); st.set('w', fmt(m.w, 2)); st.set('b', fmt(m.b, 2));
      bar.style.width = clamp(100 * best / Math.max(cur, 1e-9), 0, 100) + '%';
    };
    const r1 = UI.row(body);
    const sw = UI.slider(r1, { label: 'slope w', min: -1, max: 3, step: 0.01, value: m.w, fmt: v => fmt(v, 2), on: v => { m.w = v; setAuto(false); P.draw(); } });
    const sb = UI.slider(r1, { label: 'intercept b', min: -4, max: 8, step: 0.01, value: m.b, fmt: v => fmt(v, 2), on: v => { m.b = v; setAuto(false); P.draw(); } });
    const r2 = UI.row(body);
    UI.btn(r2, 'Best fit', () => { const o = ols(pts); tween(m, { w: o.w, b: o.b }, 600, () => { sw.set(m.w); sb.set(m.b); P.draw(); }); }, 'primary');
    const at = UI.tgl(r2, 'Auto-fit while dragging', false, v => { auto = v; P.draw(); });
    const setAuto = v => { auto = v; at.checked = v; };
    UI.tgl(r2, 'Show squared errors', true, v => { squares = v; P.draw(); });
    UI.btn(r2, 'New data', () => { pts = sample((Math.random() * 1e6) | 0); P.draw(); });
    const st = UI.stats(body, [['mse', 'your MSE'], ['best', 'best possible'], ['w', 'w'], ['b', 'b']]);
    const meter = h('div', { class: 'meter', style: 'margin:0 0 8px' }), bar = h('i'); meter.append(bar);
    body.append(h('div', { class: 'hint', text: 'Fit quality: best possible MSE divided by yours' }), meter);
    editPoints(P, () => pts, () => 0, () => P.draw());
    P.draw();
  });
}
