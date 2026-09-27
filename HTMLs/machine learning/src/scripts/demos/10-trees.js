{
  /* ---------- Decision tree and random forest ---------- */
  ML.demo('tree', body => {
    let kind = 'moons', pts = Data.moons(100, 12, 0.6), test = Data.moons(300, 99, 0.6), depth = 3, minLeaf = 2, forest = false, nTrees = 30, cls = 0;
    let model = null, trees = null;
    const prob = (x, y) => forest ? mean(trees.map(t => treeProb(t, x, y))) : treeProb(model, x, y);
    const fit = () => {
      const o = { maxDepth: depth, minLeaf };
      if (forest) trees = buildForest(pts, nTrees, o, 5);
      else model = buildTree(pts, pts.map((_, i) => i), o);
    };
    const cols = h('div', { class: 'fig-cols' }); body.append(cols);
    const a = h('div'), b = h('div'); cols.append(a, b);
    a.append(h('div', { class: 'sub-lbl', text: 'Feature space' }));
    const lbl = h('div', { class: 'sub-lbl', text: 'The tree' }); b.append(lbl);
    const P = classPlot(a, { aspect: 0.8, maxH: 380 });
    const T = new Plot(b, { x: [0, 1], y: [0, 1], aspect: 0.8, maxH: 380, minH: 220, pad: { l: 4, r: 4, t: 8, b: 8 }, scroll: true });
    const splits = (n, x0, x1, y0, y1) => {
      if (!n.l) return;
      if (n.f === 0) { P.seg(n.t, y0, n.t, y1, col('ink'), 1.2); splits(n.l, x0, n.t, y0, y1); splits(n.r, n.t, x1, y0, y1); }
      else { P.seg(x0, n.t, x1, n.t, col('ink'), 1.2); splits(n.l, x0, x1, y0, n.t); splits(n.r, x0, x1, n.t, y1); }
    };
    const drawTree = () => {
      const c = T.begin();
      if (forest) { lbl.textContent = `${nTrees} trees, each on a bootstrap sample`; T.text('A forest averages many different trees.', T.W / 2, T.H / 2 - 8, { align: 'center', color: col('muted'), size: 12 }); T.text('Too many to draw: look at how the boundary smooths out.', T.W / 2, T.H / 2 + 12, { align: 'center', color: col('muted'), size: 12 }); return; }
      const s = treeStats(model);
      lbl.textContent = `The tree: depth ${s.depth}, ${s.leaves} leaves (leaf counts are A / B)`;
      if (s.depth > 4) { T.text(`${s.leaves} leaves is too many to draw legibly.`, T.W / 2, T.H / 2, { align: 'center', color: col('muted'), size: 12 }); return; }
      let leaf = 0; const pos = new Map();
      const place = n => { if (!n.l) { pos.set(n, leaf++); return pos.get(n); } const v = (place(n.l) + place(n.r)) / 2; pos.set(n, v); return v; };
      place(model);
      const levels = Math.max(1, s.depth), gx = T.W / Math.max(1, leaf), gy = (T.H - 62) / levels;
      const X = n => (pos.get(n) + 0.5) * gx, Y = n => 18 + n.depth * gy;
      const edges = n => { if (!n.l) return; for (const ch of [n.l, n.r]) { c.strokeStyle = col('line'); c.lineWidth = 1.2; c.beginPath(); c.moveTo(X(n), Y(n)); c.lineTo(X(ch), Y(ch)); c.stroke(); edges(ch); } };
      edges(model);
      const nodes = n => {
        const x = X(n), y = Y(n);
        if (n.l) {
          const txt = (n.f ? 'y' : 'x') + ' ≤ ' + n.t.toFixed(2);
          c.font = '10px ' + MONO; const tw = c.measureText(txt).width + 12;
          c.fillStyle = col('surface'); c.strokeStyle = col('ink-2'); c.lineWidth = 1;
          c.fillRect(x - tw / 2, y - 10, tw, 20); c.strokeRect(x - tw / 2 + .5, y - 9.5, tw - 1, 19);
          T.text(txt, x, y + 3.5, { align: 'center', color: col('ink'), size: 10 });
          nodes(n.l); nodes(n.r);
        } else {
          const sz = Math.min(26, gx * 0.7), p = n.p;
          c.fillStyle = col(p >= 0.5 ? 'c2' : 'c1'); c.globalAlpha = 0.25 + 0.75 * Math.abs(2 * p - 1);
          c.fillRect(x - sz / 2, y - sz / 2, sz, sz); c.globalAlpha = 1;
          T.text(`${n.n - n.c1}/${n.c1}`, x, y + sz / 2 + 12, { align: 'center', color: col('muted'), size: 9 });
        }
      };
      nodes(model);
    };
    const draw = () => {
      P.begin(); if (pts.length) P.field((x, y) => probPx(prob(x, y), 0.32), 5);
      frame(P);
      if (!forest && model) splits(model, P.x[0], P.x[1], P.y[0], P.y[1]);
      drawPts(P, pts, 4.5);
      drawTree();
      const acc = d => d.length ? Math.round(100 * mean(d.map(p => (prob(p.x, p.y) >= 0.5 ? 1 : 0) === p.c ? 1 : 0))) + '%' : '-';
      st.set('tr', acc(pts)); st.set('te', acc(test));
      st.set('lv', forest ? mean(trees.map(t => treeStats(t).leaves)).toFixed(0) + ' avg' : treeStats(model).leaves);
    };
    P.draw = T.draw = draw;
    const refit = () => { fit(); draw(); };
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'max depth', min: 1, max: 10, step: 1, value: depth, on: v => { depth = v; refit(); } });
    UI.slider(r1, { label: 'min samples per leaf', min: 1, max: 15, step: 1, value: minLeaf, on: v => { minLeaf = v; refit(); } });
    const r2 = UI.row(body);
    UI.seg(r2, { label: 'Model', options: [[false, 'Single tree'], [true, 'Random forest']], value: false, on: v => { forest = v; nt.el.style.display = v ? '' : 'none'; refit(); } });
    const nt = UI.slider(r2, { label: 'trees in forest', min: 1, max: 60, step: 1, value: nTrees, on: v => { nTrees = v; refit(); } });
    nt.el.style.display = 'none';
    const r3 = UI.row(body);
    UI.seg(r3, { label: 'Data', options: [['moons', 'Moons'], ['xor', 'XOR'], ['circles', 'Circle'], ['blobs', 'Blobs']], value: kind, on: v => { kind = v; pts = Data[v](100, 12, 0.6); test = Data[v](300, 99, 0.6); refit(); } });
    classPicker(r3, v => cls = v);
    const st = UI.stats(body, [['tr', 'train accuracy'], ['te', 'test accuracy'], ['lv', 'leaves']]);
    editPoints(P, () => pts, () => cls, refit);
    refit();
  });

  /* ---------- Gradient boosting in 1D ---------- */
  const f1 = x => Math.sin(x * 0.9) * 1.6 + 0.25 * x;
  const fitTree1D = (xs, rs, depth) => {
    const idx = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    const rec = (ids, d) => {
      const m = mean(ids.map(i => rs[i]));
      if (d === 0 || ids.length < 4) return () => m;
      let best = null, bs = Infinity, sl = 0, sq = 0;
      const tot = ids.reduce((s, i) => s + rs[i], 0), totq = ids.reduce((s, i) => s + rs[i] ** 2, 0);
      for (let k = 0; k < ids.length - 1; k++) {
        sl += rs[ids[k]]; sq += rs[ids[k]] ** 2;
        const nl = k + 1, nr = ids.length - nl;
        if (nl < 2 || nr < 2 || xs[ids[k + 1]] - xs[ids[k]] < 1e-9) continue;
        const sse = (sq - sl * sl / nl) + ((totq - sq) - (tot - sl) ** 2 / nr);
        if (sse < bs) { bs = sse; best = k; }
      }
      if (best === null) return () => m;
      const t = (xs[ids[best]] + xs[ids[best + 1]]) / 2, L = rec(ids.slice(0, best + 1), d - 1), R = rec(ids.slice(best + 1), d - 1);
      return x => x <= t ? L(x) : R(x);
    };
    return rec(idx, depth);
  };
  ML.demo('boost', body => {
    const r = rng(17), train = [], test = [];
    for (let i = 0; i < 40; i++) { const x = r() * 10; train.push({ x, y: f1(x) + gauss(r) * 0.35 }); }
    for (let i = 0; i < 200; i++) { const x = r() * 10; test.push({ x, y: f1(x) + gauss(r) * 0.35 }); }
    let M = 3, nu = 0.3, depth = 1, stages = [];
    const build = () => {
      const xs = train.map(p => p.x), base = mean(train.map(p => p.y));
      const pred = train.map(() => base); stages = [{ f: () => base, res: train.map((p, i) => p.y - pred[i]) }];
      for (let m = 1; m <= 100; m++) {
        const res = train.map((p, i) => p.y - pred[i]), t = fitTree1D(xs, res, depth);
        stages.push({ f: t, res });
        xs.forEach((x, i) => pred[i] += nu * t(x));
      }
    };
    const F = (x, m) => { let s = stages[0].f(x); for (let k = 1; k <= m; k++) s += nu * stages[k].f(x); return s; };
    const A = new Plot(body, { x: [0, 10], y: [-2.5, 4.5], aspect: 0.42, maxH: 300, minH: 190, pad: { l: 26, r: 8, t: 8, b: 20 } });
    const lb = h('div', { class: 'sub-lbl', style: 'margin-top:10px' }); body.append(lb);
    const B = new Plot(body, { x: [0, 10], y: [-2.5, 2.5], aspect: 0.26, maxH: 190, minH: 120, pad: { l: 26, r: 8, t: 8, b: 20 } });
    const draw = () => {
      A.begin(); A.grid(1, 1); A.axes({ dx: 2, dy: 1, xl: 'x', yl: 'y' });
      if (M > 0) A.fn(x => F(x, M - 1), col('muted'), 1.5, [4, 4]);
      A.fn(x => F(x, M), col('ink'), 2.5);
      for (const p of train) A.pt(p.x, p.y, 'c1', 4.5);
      B.begin(); B.grid(1, 1); B.axes({ dx: 2, dy: 1, zero: true });
      if (M > 0) {
        const s = stages[M];
        train.forEach((p, i) => B.dot(p.x, s.res[i], 3.5, col('c3')));
        B.fn(x => s.f(x), col('accent'), 2.5);
        lb.textContent = `Residuals before tree ${M}, and what tree ${M} learned from them`;
      } else lb.textContent = 'Stage 0 predicts the mean. Add a tree to start fitting residuals.';
      const mse = d => mean(d.map(p => (F(p.x, M) - p.y) ** 2));
      st.set('m', M); st.set('tr', fmt(mse(train), 3)); st.set('te', fmt(mse(test), 3));
    };
    A.draw = B.draw = draw;
    const r1 = UI.row(body);
    const ms = UI.slider(r1, { label: 'trees (stages)', min: 0, max: 100, step: 1, value: M, on: v => { M = v; draw(); } });
    UI.slider(r1, { label: 'learning rate ν', min: 0.05, max: 1, step: 0.05, value: nu, fmt: v => fmt(v, 2), on: v => { nu = v; build(); draw(); } });
    const r2 = UI.row(body);
    UI.btn(r2, 'Add one tree', () => { M = Math.min(100, M + 1); ms.set(M); draw(); }, 'primary');
    UI.seg(r2, { label: 'Tree depth', options: [[1, 'Stumps (1)'], [2, 'Depth 2'], [3, 'Depth 3']], value: 1, on: v => { depth = v; build(); draw(); } });
    UI.legend(body, [['c1', 'training data'], ['ink', 'ensemble prediction', 'ln'], ['muted', 'previous stage', 'ln'], ['c3', 'residuals'], ['accent', 'newest tree', 'ln']]);
    const st = UI.stats(body, [['m', 'trees'], ['tr', 'train MSE'], ['te', 'test MSE']]);
    build(); draw();
  });
}
