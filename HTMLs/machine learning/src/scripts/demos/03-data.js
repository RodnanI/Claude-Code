{
  /* ---------- Feature scaling changes who your neighbors are ---------- */
  ML.demo('scaling', body => {
    const r = rng(34), people = [];
    for (let i = 0; i < 44; i++) {
      const age = 18 + r() * 62, inc = 20000 + r() * 140000;
      let c = age < 40 ? 1 : 0; if (r() < 0.07) c = 1 - c;
      people.push({ age, inc, c });
    }
    const q = { age: 27, inc: 100000 };
    const stat = k => { const v = people.map(p => p[k]); const m = mean(v), sd = Math.sqrt(mean(v.map(x => (x - m) ** 2))); return { m, sd, lo: Math.min(...v), hi: Math.max(...v) }; };
    const S = { age: stat('age'), inc: stat('inc') };
    let mode = 'raw';
    const tf = p => mode === 'raw' ? [p.inc, p.age]
      : mode === 'minmax' ? [(p.inc - S.inc.lo) / (S.inc.hi - S.inc.lo), (p.age - S.age.lo) / (S.age.hi - S.age.lo)]
        : [(p.inc - S.inc.m) / S.inc.sd, (p.age - S.age.m) / S.age.sd];
    const P = new Plot(body, { x: [0, 1], y: [0, 1], equal: true, aspect: 0.6, maxH: 400, minH: 240, pad: { l: 34, r: 10, t: 10, b: 22 } });
    const setDom = () => {
      const all = [...people, q].map(tf), xs = all.map(a => a[0]), ys = all.map(a => a[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), px = (x1 - x0) * 0.06, py = Math.max(y1 - y0, 1e-9) * 0.06;
      P.setDomain([x0 - px, x1 + px], [y0 - py, y1 + py]);
    };
    P.draw = () => {
      P.begin();
      const raw = mode === 'raw', dx = raw ? 20000 : mode === 'minmax' ? 0.2 : 1, dy = raw ? 50000 : dx;
      P.grid(dx, dy);
      P.axes({ dx, dy: raw ? 0 : dy, fx: v => raw ? Math.round(v / 1000) + 'k' : String(+v.toFixed(1)), xl: raw ? 'income ($)' : mode === 'minmax' ? 'income (0 to 1)' : 'income (z-score)', yl: raw ? 'age (years, squashed flat)' : mode === 'minmax' ? 'age (0 to 1)' : 'age (z-score)' });
      const Q = tf(q);
      const d = people.map((p, i) => { const t = tf(p); return [Math.hypot(t[0] - Q[0], t[1] - Q[1]), i]; }).sort((a, b) => a[0] - b[0]).slice(0, 5);
      for (const [, i] of d) { const t = tf(people[i]); P.seg(Q[0], Q[1], t[0], t[1], col('ink-2'), 1.2); }
      for (const p of people) { const t = tf(p); P.pt(t[0], t[1], ML.classKeys[p.c], 5); }
      for (const [, i] of d) { const t = tf(people[i]); P.dot(t[0], t[1], 9, null, col('ink'), 1.5); }
      P.dot(Q[0], Q[1], 7, col('ink'), col('surface'), 2);
      P.text('new customer', P.sx(Q[0]) + 10, P.sy(Q[1]) - 10, { color: col('ink'), halo: true });
      const votes = d.reduce((s, [, i]) => s + people[i].c, 0);
      st.set('nb', d.map(([, i]) => Math.round(people[i].age)).join(', '));
      st.set('v', `${5 - votes} A / ${votes} B`);
      st.set('p', votes >= 3 ? 'B (buys)' : 'A (does not)');
    };
    const row = UI.row(body);
    UI.seg(row, { label: 'Features', options: [['raw', 'Raw units'], ['minmax', 'Min-max'], ['std', 'Standardized']], value: mode, on: v => { mode = v; setDom(); P.draw(); } });
    UI.legend(body, [['c1', 'A: did not buy'], ['c2', 'B: bought'], ['ink', 'new customer, age 27']]);
    const st = UI.stats(body, [['nb', 'ages of 5 nearest'], ['v', 'votes'], ['p', 'prediction']]);
    setDom(); P.draw();
  });
}
