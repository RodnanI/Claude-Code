{
  /* ---------- 1D: the learning rate ---------- */
  ML.demo('lr1d', body => {
    const L = w => w * w, dL = w => 2 * w;
    let lr = 0.1, hist = [-2.6], timer = null;
    const P = new Plot(body, { x: [-3.3, 3.3], y: [-0.4, 11], aspect: 0.5, maxH: 360, minH: 220, pad: { l: 26, r: 8, t: 8, b: 20 } });
    const ex = UI.explain(body);
    P.draw = () => {
      const c = P.begin(); P.grid(1, 2); P.axes({ dx: 1, dy: 2, xl: 'weight w', yl: 'loss' });
      P.fn(L, col('ink'), 2);
      const vis = hist.filter(w => Math.abs(w) < 3.3);
      c.save(); c.strokeStyle = rgba('accent', 0.7); c.lineWidth = 1.5; c.beginPath();
      vis.forEach((w, i) => { const X = P.sx(w), Y = P.sy(L(w)); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke(); c.restore();
      vis.forEach((w, i) => P.dot(w, L(w), i === vis.length - 1 ? 7 : 3.5, i === vis.length - 1 ? col('accent') : rgba('accent', 0.55), col('surface'), 1.5));
      const w = hist[hist.length - 1];
      if (Math.abs(w) >= 3.3) P.text('diverged: off the chart', P.W / 2, 28, { align: 'center', color: col('bad'), size: 12 });
      st.set('n', hist.length - 1); st.set('w', fmt(w, 3)); st.set('l', fmt(L(w), 4));
      ex.innerHTML = lr < 0.08 ? '<b>Too small.</b> Every step is safe, but you need many of them. Training takes forever.'
        : lr < 0.45 ? '<b>Good.</b> Steady progress that slows as the slope flattens near the bottom.'
          : lr <= 0.55 ? '<b>Perfect for this bowl.</b> One step lands almost exactly on the minimum. Real losses are never this tidy.'
            : lr < 0.97 ? '<b>Overshooting.</b> Each step jumps across the valley, but the jumps shrink, so it still converges.'
              : lr <= 1.03 ? '<b>Stuck.</b> It bounces between the two walls forever without getting lower.'
                : '<b>Diverging.</b> Every jump lands higher than the last. In a real network this is the loss suddenly becoming NaN.';
    };
    const step = () => { const w = hist[hist.length - 1]; if (Math.abs(w) < 1e6) hist.push(w - lr * dL(w)); if (hist.length > 60) hist.shift(); P.draw(); };
    const stop = () => { clearInterval(timer); timer = null; run.textContent = 'Run'; };
    const r = UI.row(body);
    UI.slider(r, { label: 'learning rate η', min: 0.01, max: 1.1, step: 0.01, value: lr, fmt: v => fmt(v, 2), on: v => { lr = v; hist = [-2.6]; P.draw(); } });
    UI.btn(r, 'Step', step);
    const run = UI.btn(r, 'Run', () => { if (timer) return stop(); run.textContent = 'Pause'; timer = setInterval(() => { if (!body.isConnected || hist.length > 45) return stop(); step(); }, 280); }, 'primary');
    UI.btn(r, 'Reset', () => { stop(); hist = [-2.6]; P.draw(); });
    const st = UI.stats(body, [['n', 'steps'], ['w', 'w'], ['l', 'loss']]);
    body.append(ex);
    P.draw();
  });

  /* ---------- 2D: optimizers on loss landscapes ---------- */
  const SURF = {
    bowl: { name: 'Round bowl', f: (x, y) => x * x + y * y, g: (x, y) => [2 * x, 2 * y], x: [-3, 3], y: [-2.2, 2.2], s: [-2.6, 1.8], lr: 0.1, min: [0, 0] },
    valley: { name: 'Stretched valley', f: (x, y) => 0.1 * x * x + 3 * y * y, g: (x, y) => [0.2 * x, 6 * y], x: [-3, 3], y: [-2.2, 2.2], s: [-2.8, 1.2], lr: 0.3, min: [0, 0] },
    banana: { name: 'Banana', f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)], x: [-2, 2], y: [-0.9, 3], s: [-1.6, 2.4], lr: 0.02, min: [1, 1] },
    two: { name: 'Two valleys', f: (x, y) => (x * x - 1) ** 2 + y * y + 0.35 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.35, 2 * y], x: [-2, 2], y: [-1.5, 1.5], s: [1.7, 1.2], lr: 0.05, min: [-1.04, 0] }
  };
  const OPTS = [['gd', 'Gradient descent', 'c1'], ['mom', 'Momentum', 'c3'], ['adam', 'Adam', 'c2']];

  ML.demo('gd', (body, fig) => {
    let S = SURF.valley, lr = S.lr, start = S.s.slice(), runs = {}, on = { gd: true, mom: true, adam: true }, lo = 0, hi = 1;
    const P = new Plot(body, { x: S.x, y: S.y, equal: true, aspect: 0.62, maxH: 440, minH: 260, pad: { l: 4, r: 4, t: 4, b: 4 } });
    const Lp = new Plot(body, { x: [0, 200], y: [-4, 1], height: 110, pad: { l: 34, r: 8, t: 8, b: 18 } });
    const norm = () => {
      let a = Infinity, b = -Infinity;
      for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) { const v = S.f(lerp(P.x[0], P.x[1], i / 40), lerp(P.y[0], P.y[1], j / 40)); a = Math.min(a, v); b = Math.max(b, v); }
      lo = a; hi = b;
    };
    const reset = () => {
      runs = {};
      for (const [k] of OPTS) runs[k] = { p: start.slice(), m: [0, 0], v: [0, 0], t: 0, path: [start.slice()], loss: [S.f(...start)], dead: false };
      Lp.setDomain([0, 200], [-4.2, Math.log10(hi - lo + 1e-4) + 0.2]);
    };
    const stepAll = () => {
      let alive = false;
      for (const [k] of OPTS) {
        const R = runs[k]; if (!on[k] || R.dead || R.t >= 200) continue;
        const g = S.g(...R.p); R.t++;
        if (k === 'gd') { R.p[0] -= lr * g[0]; R.p[1] -= lr * g[1]; }
        else if (k === 'mom') { for (let i = 0; i < 2; i++) { R.m[i] = 0.9 * R.m[i] + g[i]; R.p[i] -= lr * R.m[i]; } }
        else { for (let i = 0; i < 2; i++) { R.m[i] = 0.9 * R.m[i] + 0.1 * g[i]; R.v[i] = 0.999 * R.v[i] + 0.001 * g[i] * g[i]; R.p[i] -= lr * (R.m[i] / (1 - 0.9 ** R.t)) / (Math.sqrt(R.v[i] / (1 - 0.999 ** R.t)) + 1e-8); } }
        const f = S.f(...R.p);
        if (!isFinite(f) || Math.abs(R.p[0]) > 50 || Math.abs(R.p[1]) > 50) { R.dead = true; continue; }
        R.path.push(R.p.slice()); R.loss.push(f); alive = true;
      }
      return alive;
    };
    P.draw = () => {
      P.begin(); const ink = rgb('ink'), g = (x, y) => Math.log(S.f(x, y) - lo + 1e-3), g0 = Math.log(1e-3), span = Math.log(hi - lo + 1e-3) - g0;
      P.field((x, y) => [ink[0], ink[1], ink[2], (0.02 + clamp((g(x, y) - g0) / span, 0, 1) * 0.15) * 255], 4);
      const nx = 90, ny = Math.max(10, Math.round(nx * P.PH / P.PW)), V = new Float64Array((nx + 1) * (ny + 1));
      const X = i => P.x[0] + (P.x[1] - P.x[0]) * i / nx, Y = j => P.y[0] + (P.y[1] - P.y[0]) * j / ny;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) V[j * (nx + 1) + i] = g(X(i), Y(j));
      const c = P.ctx; c.save(); c.strokeStyle = rgba('ink', 0.28); c.lineWidth = 1; c.beginPath();
      for (let k = 1; k < 13; k++) {
        const L = g0 + span * k / 13;
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const q = [V[j * (nx + 1) + i], V[j * (nx + 1) + i + 1], V[(j + 1) * (nx + 1) + i + 1], V[(j + 1) * (nx + 1) + i]];
          const cx = [X(i), X(i + 1), X(i + 1), X(i)], cy = [Y(j), Y(j), Y(j + 1), Y(j + 1)], pts = [];
          for (let e = 0; e < 4; e++) { const a = q[e], b = q[(e + 1) % 4]; if ((a < L) !== (b < L)) { const t = (L - a) / (b - a), e2 = (e + 1) % 4; pts.push([P.sx(cx[e] + (cx[e2] - cx[e]) * t), P.sy(cy[e] + (cy[e2] - cy[e]) * t)]); } }
          for (let m = 0; m + 1 < pts.length; m += 2) { c.moveTo(pts[m][0], pts[m][1]); c.lineTo(pts[m + 1][0], pts[m + 1][1]); }
        }
      }
      c.stroke(); c.restore();
      frame(P);
      const [mx, my] = S.min; P.seg(mx - 0.08, my - 0.08, mx + 0.08, my + 0.08, col('ink'), 2); P.seg(mx - 0.08, my + 0.08, mx + 0.08, my - 0.08, col('ink'), 2);
      for (const [k, , ck] of OPTS) {
        if (!on[k]) continue; const R = runs[k];
        P.path(R.path, col(ck), 2);
        const q = R.path[R.path.length - 1];
        P.dot(q[0], q[1], 6, col(ck), col('surface'), 2);
      }
      P.dot(start[0], start[1], 4, col('ink'));
      for (const [k, , ck] of OPTS) { const R = runs[k]; st.set(k, !on[k] ? 'off' : R.dead ? 'diverged' : fmt(R.loss[R.loss.length - 1], 4)); }
      st.set('t', Math.max(...OPTS.map(([k]) => runs[k].t)));
      drawLoss();
    };
    const drawLoss = () => {
      Lp.begin(); Lp.grid(50, 2); Lp.axes({ dx: 50, dy: 2, fy: v => '1e' + v, xl: 'step', yl: 'loss (log)' });
      const base = S.f(...S.min) - lo;
      for (const [k, , ck] of OPTS) {
        if (!on[k]) continue;
        Lp.path(runs[k].loss.map((v, i) => [i, Math.log10(Math.max(v - lo - base, 0) + 1e-4)]), col(ck), 1.8);
      }
    };
    const loop = ML.loop(fig, () => { const a = stepAll(); P.draw(); if (!a) { loop.stop(); return false; } });
    loop.onchange = r => runBtn.textContent = r ? 'Pause' : 'Run';
    P.pointer({ down(p) { start = [p.x, p.y]; reset(); P.draw(); loop.start(); } });

    const r1 = UI.row(body);
    UI.seg(r1, { label: 'Surface', options: Object.entries(SURF).map(([k, v]) => [k, v.name]), value: 'valley', on: k => { S = SURF[k]; P.setDomain(S.x, S.y); start = S.s.slice(); lr = S.lr; lrs.set(Math.log10(lr)); norm(); reset(); P.draw(); } });
    const r2 = UI.row(body);
    const lrs = UI.slider(r2, { label: 'learning rate', min: -3, max: 0, step: 0.01, value: Math.log10(lr), fmt: v => fmt(10 ** v, 3), on: v => { lr = 10 ** v; reset(); P.draw(); } });
    const runBtn = UI.btn(r2, 'Run', () => { if (!loop.running && Math.max(...OPTS.map(([k]) => runs[k].t)) >= 200) reset(); loop.toggle(); }, 'primary');
    UI.btn(r2, 'Step', () => { stepAll(); P.draw(); });
    UI.btn(r2, 'Reset', () => { loop.stop(); reset(); P.draw(); });
    const r3 = UI.row(body);
    for (const [k, l] of OPTS) UI.tgl(r3, l, true, v => { on[k] = v; P.draw(); });
    UI.legend(body, OPTS.map(([, l, ck]) => [ck, l]).concat([['ink', 'minimum \u00d7', 'sq']]));
    const st = UI.stats(body, [['gd', 'GD loss'], ['mom', 'momentum'], ['adam', 'Adam'], ['t', 'step']]);
    body.append(h('div', { class: 'hint', text: 'Tap or click the landscape to start all optimizers from that point.' }));
    norm(); reset(); P.draw();
  });
}
