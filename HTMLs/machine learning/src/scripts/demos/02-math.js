{
  /* ---------- Vectors, dot product, projection ---------- */
  ML.demo('vectors', body => {
    const v = { a: [3, 1], b: [1, 2.5] };
    const P = new Plot(body, { x: [-5, 5], y: [-3.4, 3.4], equal: true, aspect: 0.6, maxH: 420, minH: 250 });
    const st = UI.stats(body, [['dot', 'a · b'], ['na', '|a|'], ['nb', '|b|'], ['cos', 'cos θ'], ['ang', 'angle']]);
    const ex = UI.explain(body);
    P.draw = () => {
      const c = P.begin(); P.grid(1, 1); P.axes({ zero: true, dx: 1, dy: 1 });
      const [ax, ay] = v.a, [bx, by] = v.b, dot = ax * bx + ay * by, na = Math.hypot(ax, ay), nb = Math.hypot(bx, by);
      if (nb > 1e-6 && na > 1e-6) {
        const t = dot / (nb * nb), px = bx * t, py = by * t;
        P.seg(0, 0, px, py, rgba('accent', 0.35), 7);
        P.seg(ax, ay, px, py, col('muted'), 1.2, [4, 4]);
        const ta = Math.atan2(ay, ax), tb = Math.atan2(by, bx);
        let d = tb - ta; while (d > Math.PI) d -= TAU; while (d <= -Math.PI) d += TAU;
        c.save(); c.strokeStyle = col('ink-2'); c.lineWidth = 1.2; c.beginPath();
        c.arc(P.sx(0), P.sy(0), 26, -ta, -(ta + d), d > 0); c.stroke(); c.restore();
      }
      arrow(P, 0, 0, ax, ay, col('c1'), 3); arrow(P, 0, 0, bx, by, col('c2'), 3);
      P.text('a', P.sx(ax) + 8, P.sy(ay) - 6, { size: 14, font: SERIF, color: col('c1') });
      P.text('b', P.sx(bx) + 8, P.sy(by) - 6, { size: 14, font: SERIF, color: col('c2') });
      const cos = na && nb ? dot / (na * nb) : 0;
      st.set('dot', fmt(dot, 2)); st.set('na', fmt(na, 2)); st.set('nb', fmt(nb, 2));
      st.set('cos', fmt(cos, 2)); st.set('ang', fmt(Math.acos(clamp(cos, -1, 1)) * 180 / Math.PI, 0) + '°');
      ex.innerHTML = Math.abs(cos) < 0.08 ? '<b>Perpendicular.</b> The dot product is about zero: the vectors share nothing in common.'
        : cos > 0.9 ? '<b>Pointing the same way.</b> Cosine close to 1 means very similar direction. This is how embeddings measure similarity.'
          : cos < -0.9 ? '<b>Opposite directions.</b> Cosine close to -1.'
            : `The shaded segment is the <b>projection</b> of a onto b: how much of a points along b. Its signed length is a·b / |b| = ${fmt(nb ? dot / nb : 0, 2)}.`;
    };
    let drag = null;
    P.pointer({
      down(p) { const tips = [v.a, v.b]; const i = P.pick(tips, p, 28, t => t[0], t => t[1]); drag = i < 0 ? null : i ? 'b' : 'a'; },
      move(p, down) {
        if (!down || !drag) return;
        v[drag] = [clamp(Math.round(p.x * 2) / 2, -5, 5), clamp(Math.round(p.y * 2) / 2, -3, 3)];
        P.draw();
      },
      up() { drag = null; }
    });
    P.draw();
  });

  /* ---------- A matrix is a transformation ---------- */
  ML.demo('matrix', body => {
    const m = { a: 1, b: 0.5, c: 0, d: 1 };
    const P = new Plot(body, { x: [-4, 4], y: [-3, 3], equal: true, aspect: 0.6, maxH: 420, minH: 250 });
    const T = (x, y) => [m.a * x + m.b * y, m.c * x + m.d * y];
    const F = [[[-2.6, -1.6], [-2.6, 0.6], [-1.5, 0.6]], [[-2.6, -0.5], [-1.8, -0.5]]];
    P.draw = () => {
      const c = P.begin(); P.grid(1, 1);
      c.save(); c.beginPath(); c.rect(P.L, P.T, P.PW, P.PH); c.clip();
      for (let i = -9; i <= 9; i++) {
        P.seg(...T(i, -9), ...T(i, 9), rgba('ink-2', i ? 0.22 : 0.55), 1);
        P.seg(...T(-9, i), ...T(9, i), rgba('ink-2', i ? 0.22 : 0.55), 1);
      }
      const sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(p => T(...p));
      c.beginPath(); sq.forEach((p, i) => i ? c.lineTo(P.sx(p[0]), P.sy(p[1])) : c.moveTo(P.sx(p[0]), P.sy(p[1])));
      c.closePath(); c.fillStyle = rgba('accent', 0.16); c.fill(); c.strokeStyle = col('accent'); c.lineWidth = 1.2; c.stroke();
      for (const line of F) P.path(line.map(p => T(...p)), col('c3'), 3);
      c.restore();
      arrow(P, 0, 0, ...T(1, 0), col('c1'), 3); arrow(P, 0, 0, ...T(0, 1), col('c2'), 3);
      const det = m.a * m.d - m.b * m.c;
      st.set('m', `[${fmt(m.a, 1)} ${fmt(m.b, 1)} ; ${fmt(m.c, 1)} ${fmt(m.d, 1)}]`);
      st.set('det', fmt(det, 2));
      st.set('o', Math.abs(det) < 0.02 ? 'collapsed' : det < 0 ? 'flipped' : 'kept');
    };
    const r1 = UI.row(body), r2 = UI.row(body);
    const f1 = v => fmt(v, 1);
    const sl = {
      a: UI.slider(r1, { label: 'a (x to x)', min: -2, max: 2, step: 0.1, value: m.a, fmt: f1, on: v => { m.a = v; P.draw(); } }),
      b: UI.slider(r1, { label: 'b (y to x)', min: -2, max: 2, step: 0.1, value: m.b, fmt: f1, on: v => { m.b = v; P.draw(); } }),
      c: UI.slider(r2, { label: 'c (x to y)', min: -2, max: 2, step: 0.1, value: m.c, fmt: f1, on: v => { m.c = v; P.draw(); } }),
      d: UI.slider(r2, { label: 'd (y to y)', min: -2, max: 2, step: 0.1, value: m.d, fmt: f1, on: v => { m.d = v; P.draw(); } })
    };
    const r3 = UI.row(body), s = Math.SQRT1_2;
    const presets = { Identity: [1, 0, 0, 1], Stretch: [2, 0, 0, 0.5], 'Rotate 45': [s, -s, s, s], Shear: [1, 1, 0, 1], Mirror: [-1, 0, 0, 1], Collapse: [1, 2, 0.5, 1] };
    for (const k in presets) UI.btn(r3, k, () => {
      const [a, b, c, d] = presets[k];
      tween(m, { a, b, c, d }, 500, () => { for (const key in sl) sl[key].set(m[key]); P.draw(); });
    });
    UI.legend(body, [['c1', 'where x-axis unit lands (a, c)'], ['c2', 'where y-axis unit lands (b, d)'], ['accent', 'unit square', 'sq']]);
    const st = UI.stats(body, [['m', 'matrix'], ['det', 'determinant'], ['o', 'orientation']]);
    P.draw();
  });

  /* ---------- Derivative = slope ---------- */
  ML.demo('derivative', body => {
    const f = x => 0.1 * x ** 4 - 0.6 * x * x + 0.3 * x, df = x => 0.4 * x ** 3 - 1.2 * x + 0.3;
    const s = { x: 0.9 }; let hh = 1;
    const P = new Plot(body, { x: [-3, 3], y: [-2, 3.5], aspect: 0.52, maxH: 380, minH: 240, pad: { l: 26, r: 8, t: 8, b: 20 } });
    P.draw = () => {
      P.begin(); P.grid(1, 1); P.axes({ dx: 1, dy: 1 });
      P.fn(f, col('ink'), 2);
      const x0 = s.x, y0 = f(x0), x1 = x0 + hh, y1 = f(x1), sec = (y1 - y0) / hh, k = df(x0);
      P.fn(x => y0 + sec * (x - x0), col('muted'), 1.2, [5, 4]);
      P.seg(x0 - 1.3, y0 - 1.3 * k, x0 + 1.3, y0 + 1.3 * k, col('accent'), 2.5);
      P.dot(x1, y1, 4.5, col('surface'), col('muted'), 1.5);
      P.dot(x0, y0, 6, col('accent'), col('surface'), 2);
      const dir = k > 0 ? -1 : 1, ay = P.y[0] + 0.25;
      if (Math.abs(k) > 0.03) { arrow(P, x0, ay, x0 + dir * 0.7, ay, col('c2'), 2.5); P.text('downhill', P.sx(x0 + dir * 0.35), P.sy(ay) - 8, { align: 'center', color: col('c2') }); }
      st.set('x', fmt(x0, 2)); st.set('f', fmt(y0, 3)); st.set('d', fmt(k, 3)); st.set('s', fmt(sec, 3));
    };
    P.pointer({ down(p) { s.x = clamp(p.x, -2.9, 2.9); P.draw(); }, move(p, d) { if (d) { s.x = clamp(p.x, -2.9, 2.9); P.draw(); } } });
    const r = UI.row(body);
    const hs = UI.slider(r, { label: 'secant gap h', min: 0.01, max: 2, step: 0.01, value: hh, fmt: v => fmt(v, 2), on: v => { hh = v; P.draw(); } });
    UI.btn(r, 'Step downhill', () => { const to = clamp(s.x - 0.35 * df(s.x), -2.9, 2.9); tween(s, { x: to }, 350, () => P.draw()); }, 'primary');
    UI.legend(body, [['ink', 'f(x)', 'ln'], ['accent', 'tangent: slope = derivative', 'ln'], ['muted', 'secant through x and x + h', 'ln']]);
    const st = UI.stats(body, [['x', 'x'], ['f', 'f(x)'], ['d', "f'(x) slope"], ['s', 'secant slope']]);
    hs.input.setAttribute('aria-label', 'secant gap');
    P.draw();
  });

  /* ---------- Bayes: base rates ---------- */
  ML.demo('bayes', body => {
    const s = { prev: 0.01, sens: 0.9, fpr: 0.05 };
    const P = new Plot(body, { height: w => w * (w < 520 ? 0.5 : 0.4), pad: { l: 0, r: 0, t: 0, b: 0 }, scroll: true });
    P.draw = () => {
      const c = P.begin(), cols = 50, rows = 20, q = Math.min(P.W / cols, P.H / rows), g = q > 8 ? 2 : 1, ox = (P.W - q * cols) / 2;
      const sick = Math.round(s.prev * 1000), tp = Math.round(sick * s.sens), healthy = 1000 - sick, fp = Math.round(healthy * s.fpr);
      const fill = [col('c1'), rgba('c1', 0.3), col('c3'), col('line')];
      for (let i = 0; i < 1000; i++) {
        const kind = i < tp ? 0 : i < sick ? 1 : i < sick + fp ? 2 : 3;
        c.fillStyle = fill[kind];
        c.fillRect(ox + (i % cols) * q, Math.floor(i / cols) * q, q - g, q - g);
      }
      const pos = tp + fp;
      st.set('sick', sick); st.set('pos', pos); st.set('tp', tp);
      st.set('post', pos ? fmt(100 * tp / pos, 1) + '%' : 'n/a');
    };
    const r = UI.row(body);
    UI.slider(r, { label: 'prevalence', min: -3, max: Math.log10(0.5), step: 0.01, value: -2, fmt: v => fmt(100 * 10 ** v, 1) + '%', on: v => { s.prev = 10 ** v; P.draw(); } });
    UI.slider(r, { label: 'sensitivity', min: 0.5, max: 1, step: 0.01, value: s.sens, fmt: v => Math.round(v * 100) + '%', on: v => { s.sens = v; P.draw(); } });
    UI.slider(r, { label: 'false positive rate', min: 0, max: 0.2, step: 0.005, value: s.fpr, fmt: v => fmt(v * 100, 1) + '%', on: v => { s.fpr = v; P.draw(); } });
    UI.legend(body, [['c1', 'sick, test positive', 'sq'], ['c1', 'sick, test negative', 'sq faint'], ['c3', 'healthy, test positive', 'sq'], ['line', 'healthy, test negative', 'sq']]);
    const st = UI.stats(body, [['sick', 'actually sick'], ['pos', 'test positive'], ['tp', 'positive and sick'], ['post', 'P(sick | positive)']]);
    P.draw();
  });
}
