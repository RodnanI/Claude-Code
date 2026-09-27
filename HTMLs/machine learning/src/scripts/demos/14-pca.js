{
  ML.demo('pca', body => {
    let pts = [], cov = null, pc = 0, both = false;
    const s = { a: 100 };
    const gen = seed => {
      const r = rng(seed), rot = (20 + r() * 50) * Math.PI / 180, c = Math.cos(rot), sn = Math.sin(rot);
      pts = []; for (let i = 0; i < 90; i++) { const u = gauss(r) * 1.1, v = gauss(r) * 0.38; pts.push({ x: u * c - v * sn, y: u * sn + v * c }); }
      const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y)); pts.forEach(p => { p.x -= mx; p.y -= my; });
      const a = mean(pts.map(p => p.x * p.x)), b = mean(pts.map(p => p.x * p.y)), cc = mean(pts.map(p => p.y * p.y));
      const m = (a + cc) / 2, d = Math.sqrt(((a - cc) / 2) ** 2 + b * b);
      cov = { a, b, c: cc, l1: m + d, l2: m - d }; pc = 0.5 * Math.atan2(2 * b, a - cc) * 180 / Math.PI; if (pc < 0) pc += 180;
    };
    const varAt = deg => { const t = deg * Math.PI / 180, u = Math.cos(t), v = Math.sin(t); return cov.a * u * u + 2 * cov.b * u * v + cov.c * v * v; };
    const cols = h('div', { class: 'fig-cols' }); body.append(cols);
    const L = h('div'), R = h('div'); cols.append(L, R);
    L.append(h('div', { class: 'sub-lbl', text: 'Drag to rotate the projection line' }));
    R.append(h('div', { class: 'sub-lbl', text: 'Variance captured vs angle' }));
    const P = new Plot(L, { x: [-3, 3], y: [-2.2, 2.2], equal: true, aspect: 0.72, maxH: 360, minH: 230, pad: { l: 4, r: 4, t: 4, b: 4 } });
    const V = new Plot(R, { x: [0, 180], y: [0, 1.6], aspect: 0.8, maxH: 360, minH: 180, pad: { l: 30, r: 10, t: 8, b: 22 } });
    const draw = () => {
      const t = s.a * Math.PI / 180, u = Math.cos(t), v = Math.sin(t);
      P.begin(); P.grid(1, 1); frame(P);
      P.seg(-6 * u, -6 * v, 6 * u, 6 * v, col('ink'), 2);
      for (const p of pts) { const d = p.x * u + p.y * v; P.seg(p.x, p.y, d * u, d * v, rgba('ink-2', 0.3), 1); }
      for (const p of pts) P.pt(p.x, p.y, 'c1', 4);
      for (const p of pts) { const d = p.x * u + p.y * v; P.dot(d * u, d * v, 2.6, col('c2')); }
      if (both) {
        const r1 = pc * Math.PI / 180, s1 = Math.sqrt(cov.l1) * 2, s2 = Math.sqrt(cov.l2) * 2;
        arrow(P, 0, 0, Math.cos(r1) * s1, Math.sin(r1) * s1, col('accent'), 3); arrow(P, 0, 0, -Math.sin(r1) * s2, Math.cos(r1) * s2, col('accent'), 3);
        P.text('PC1', P.sx(Math.cos(r1) * s1) + 6, P.sy(Math.sin(r1) * s1), { color: col('accent') });
        P.text('PC2', P.sx(-Math.sin(r1) * s2) + 6, P.sy(Math.cos(r1) * s2), { color: col('accent') });
      }
      const tot = cov.a + cov.c, pv = varAt(s.a);
      V.setDomain([0, 180], [0, cov.l1 * 1.15]);
      V.begin(); V.grid(30, 0.25); V.axes({ dx: 30, dy: 0.5, fx: v => v + '°', xl: 'angle' });
      V.fn(varAt, col('ink'), 2);
      V.seg(0, tot, 180, tot, col('muted'), 1, [4, 4]); V.text('total variance', V.sx(4), V.sy(tot) - 5, { color: col('muted') });
      V.dot(s.a, pv, 6, col('accent'), col('surface'), 2);
      st.set('v', fmt(pv, 3)); st.set('e', fmt(tot - pv, 3)); st.set('p', Math.round(100 * pv / tot) + '%');
    };
    P.draw = V.draw = draw;
    const setA = a => { s.a = ((a % 180) + 180) % 180; sl.set(s.a); draw(); };
    P.pointer({ down(p) { setA(Math.atan2(p.y, p.x) * 180 / Math.PI); }, move(p, d) { if (d) setA(Math.atan2(p.y, p.x) * 180 / Math.PI); } });
    const r1 = UI.row(body);
    const sl = UI.slider(r1, { label: 'line angle', min: 0, max: 180, step: 0.5, value: s.a, fmt: v => fmt(v, 1) + '°', on: v => { s.a = v; draw(); } });
    UI.btn(r1, 'Snap to PC1', () => { let to = pc; if (Math.abs(to - s.a) > 90) to += to < s.a ? 180 : -180; tween(s, { a: to }, 600, () => { sl.set(((s.a % 180) + 180) % 180); draw(); }); }, 'primary');
    UI.tgl(r1, 'Show both components', false, v => { both = v; draw(); });
    UI.btn(r1, 'New data', () => { gen((Math.random() * 1e6) | 0); draw(); });
    UI.legend(body, [['c1', 'data'], ['c2', 'projection onto the line'], ['ink-2', 'reconstruction error (gray lines)', 'ln']]);
    const st = UI.stats(body, [['v', 'variance kept'], ['e', 'squared error lost'], ['p', 'explained']]);
    gen(4); draw();
  });
}
