{
  const makeData = (kind, seed) => {
    const r = rng(seed), out = [];
    if (kind === 'moons') return Data.moons(180, seed, 0.35).map(p => ({ x: p.x, y: p.y }));
    const centers = kind === 'uneven' ? [[-0.5, 0.45, 0.28, 110], [0.55, 0.55, 0.07, 25], [0.45, -0.5, 0.08, 25]] : [[-0.5, 0.45, 0.14, 40], [0.5, 0.5, 0.14, 40], [0.45, -0.45, 0.14, 40], [-0.45, -0.5, 0.14, 40]];
    for (const [cx, cy, sd, n] of centers) for (let i = 0; i < n; i++) out.push({ x: cx + gauss(r) * sd, y: cy + gauss(r) * sd });
    return out;
  };
  const nearestC = (p, C) => { let b = 0, bd = Infinity; C.forEach((c, j) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; b = j; } }); return [b, bd]; };
  const initC = (pts, k, pp, r) => {
    if (!pp) return Array.from({ length: k }, () => ({ x: r() * 2 - 1, y: r() * 2 - 1 }));
    const C = [Object.assign({}, pts[Math.floor(r() * pts.length)])];
    while (C.length < k) {
      const d = pts.map(p => nearestC(p, C)[1]), s = d.reduce((a, b) => a + b, 0);
      let t = r() * s, i = 0; while (t > d[i] && i < pts.length - 1) { t -= d[i]; i++; }
      C.push({ x: pts[i].x, y: pts[i].y });
    }
    return C;
  };
  const kmeansFull = (pts, k, seed) => {
    const r = rng(seed); let C = initC(pts, k, true, r);
    for (let it = 0; it < 30; it++) {
      const sums = C.map(() => [0, 0, 0]);
      for (const p of pts) { const [j] = nearestC(p, C); sums[j][0] += p.x; sums[j][1] += p.y; sums[j][2]++; }
      C = C.map((c, j) => sums[j][2] ? { x: sums[j][0] / sums[j][2], y: sums[j][1] / sums[j][2] } : c);
    }
    return { C, inertia: pts.reduce((s, p) => s + nearestC(p, C)[1], 0) };
  };

  ML.demo('kmeans', (body, fig) => {
    let kind = 'blobs', seed = 3, pts = makeData(kind, seed), k = 4, pp = false, C = [], asg = [], phase = 'assign', iter = 0, trails = [], elbow = [], done = false;
    const r = rng(77);
    const P = classPlot(body);
    const E = new Plot(body, { x: [1, 8], y: [0, 1], height: 96, pad: { l: 40, r: 10, t: 10, b: 18 } });
    const restart = () => { C = initC(pts, k, pp, r); asg = pts.map(() => -1); phase = 'assign'; iter = 0; done = false; trails = C.map(c => [[c.x, c.y]]); draw(); };
    const computeElbow = () => { elbow = []; for (let kk = 1; kk <= 8; kk++) elbow.push(Math.min(...[1, 2].map(s => kmeansFull(pts, kk, s * 11 + kk).inertia))); E.setDomain([1, 8], [0, elbow[0] * 1.08]); };
    const step = () => {
      if (done) return false;
      if (phase === 'assign') {
        let changed = 0; pts.forEach((p, i) => { const [j] = nearestC(p, C); if (j !== asg[i]) changed++; asg[i] = j; });
        phase = 'update'; if (!changed && iter > 0) done = true;
      } else {
        const sums = C.map(() => [0, 0, 0]);
        pts.forEach((p, i) => { const s = sums[asg[i]]; s[0] += p.x; s[1] += p.y; s[2]++; });
        C = C.map((c, j) => sums[j][2] ? { x: sums[j][0] / sums[j][2], y: sums[j][1] / sums[j][2] } : c);
        C.forEach((c, j) => trails[j].push([c.x, c.y]));
        phase = 'assign'; iter++;
      }
      draw(); return !done;
    };
    const draw = () => {
      P.begin();
      if (C.length) P.field((x, y) => { const c = rgb(ML.classKeys[nearestC({ x, y }, C)[0]]); return [c[0], c[1], c[2], 34]; }, 5);
      frame(P);
      trails.forEach((t, j) => P.path(t, col(ML.classKeys[j]), 1.5, [3, 3]));
      pts.forEach((p, i) => asg[i] < 0 ? P.dot(p.x, p.y, 4, col('muted')) : P.pt(p.x, p.y, ML.classKeys[asg[i]], 4.5));
      C.forEach((c, j) => { const X = P.sx(c.x), Y = P.sy(c.y), cx = P.ctx; cx.fillStyle = col(ML.classKeys[j]); cx.strokeStyle = col('ink'); cx.lineWidth = 2; cx.fillRect(X - 7, Y - 7, 14, 14); cx.strokeRect(X - 7, Y - 7, 14, 14); });
      const inertia = asg[0] >= 0 ? pts.reduce((s, p, i) => s + (p.x - C[asg[i]].x) ** 2 + (p.y - C[asg[i]].y) ** 2, 0) : NaN;
      st.set('it', iter); st.set('ph', done ? 'converged' : phase === 'assign' ? 'next: assign' : 'next: move centers'); st.set('in', isNaN(inertia) ? '-' : fmt(inertia, 2));
      E.begin(); E.grid(1, 0); E.axes({ dx: 1, xl: 'k', yl: 'inertia (best run)' });
      E.path(elbow.map((v, i) => [i + 1, v]), col('ink'), 2);
      elbow.forEach((v, i) => E.dot(i + 1, v, i + 1 === k ? 6 : 3, i + 1 === k ? col('accent') : col('ink'), col('surface'), 1.5));
    };
    P.draw = E.draw = draw;
    const loop = ML.loop(fig, (() => { let acc = 0; return dt => { acc += dt; if (acc < 0.45) return; acc = 0; if (!step()) return false; }; })());
    loop.onchange = on => runB.textContent = on ? 'Pause' : 'Run';
    const r1 = UI.row(body);
    UI.btn(r1, 'Step', () => { loop.stop(); step(); });
    const runB = UI.btn(r1, 'Run', () => { if (done) restart(); loop.toggle(); }, 'primary');
    UI.btn(r1, 'New centers', () => { loop.stop(); restart(); });
    const r2 = UI.row(body);
    UI.slider(r2, { label: 'k clusters', min: 1, max: 6, step: 1, value: k, on: v => { k = v; loop.stop(); restart(); } });
    UI.seg(r2, { label: 'Init', options: [[false, 'Random'], [true, 'k-means++']], value: false, on: v => { pp = v; loop.stop(); restart(); } });
    const r3 = UI.row(body);
    UI.seg(r3, { label: 'Data', options: [['blobs', 'Four blobs'], ['uneven', 'Uneven'], ['moons', 'Moons']], value: kind, on: v => { kind = v; pts = makeData(v, ++seed); computeElbow(); loop.stop(); restart(); } });
    const st = UI.stats(body, [['it', 'iteration'], ['ph', 'status'], ['in', 'inertia']]);
    computeElbow(); restart();
  });

  /* ---------- DBSCAN ---------- */
  ML.demo('dbscan', body => {
    let kind = 'moons', pts = [], eps = 0.14, minPts = 5, algo = 'db', lab = [], core = [], hover = null;
    const gen = () => {
      const r = rng(31);
      pts = kind === 'moons' ? Data.moons(170, 4, 0.2) : kind === 'circles' ? Data.circles(200, 6, 0.15) : makeData('uneven', 9);
      pts = pts.map(p => ({ x: p.x, y: p.y }));
      for (let i = 0; i < 18; i++) pts.push({ x: r() * 2 - 1, y: r() * 2 - 1 });
    };
    const run = () => {
      const n = pts.length, nb = pts.map(p => pts.map((q, j) => Math.hypot(p.x - q.x, p.y - q.y) <= eps ? j : -1).filter(j => j >= 0));
      core = nb.map(a => a.length >= minPts); lab = new Array(n).fill(-1);
      if (algo === 'km') { const { C } = kmeansFull(pts, 2, 5); lab = pts.map(p => nearestC(p, C)[0]); core = core.map(() => true); return; }
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (lab[i] !== -1 || !core[i]) continue;
        const q = [i]; lab[i] = c;
        while (q.length) { const a = q.pop(); if (!core[a]) continue; for (const j of nb[a]) if (lab[j] === -1) { lab[j] = c; q.push(j); } }
        c++;
      }
    };
    const P = classPlot(body);
    const draw = () => {
      P.begin(); frame(P);
      if (hover && algo === 'db') { const c = P.ctx; c.save(); c.fillStyle = rgba('accent', 0.1); c.strokeStyle = col('accent'); c.beginPath(); c.arc(P.sx(hover.x), P.sy(hover.y), eps * (P.sx(1) - P.sx(0)), 0, TAU); c.fill(); c.stroke(); c.restore(); }
      pts.forEach((p, i) => {
        if (lab[i] < 0) P.dot(p.x, p.y, 3.5, null, col('muted'), 1.3);
        else { const k = lab[i] < 6 ? ML.classKeys[lab[i]] : 'muted'; core[i] ? P.pt(p.x, p.y, k, 5) : P.dot(p.x, p.y, 3.2, col(k)); }
      });
      const nc = new Set(lab.filter(v => v >= 0)).size;
      st.set('c', nc); st.set('n', lab.filter(v => v < 0).length); st.set('core', core.filter(Boolean).length);
    };
    P.draw = draw;
    P.pointer({ move(p) { hover = p; draw(); }, down(p) { hover = p; draw(); }, leave() { hover = null; draw(); } });
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'eps (neighborhood radius)', min: 0.04, max: 0.4, step: 0.005, value: eps, fmt: v => fmt(v, 3), on: v => { eps = v; run(); draw(); } });
    UI.slider(r1, { label: 'minPts', min: 2, max: 15, step: 1, value: minPts, on: v => { minPts = v; run(); draw(); } });
    const r2 = UI.row(body);
    UI.seg(r2, { label: 'Algorithm', options: [['db', 'DBSCAN'], ['km', 'k-means, k = 2']], value: algo, on: v => { algo = v; run(); draw(); } });
    UI.seg(r2, { label: 'Data', options: [['moons', 'Moons'], ['circles', 'Rings'], ['uneven', 'Uneven blobs']], value: kind, on: v => { kind = v; gen(); run(); draw(); } });
    UI.legend(body, [['c1', 'large dot: core point'], ['c1', 'small dot: border point'], ['muted', 'hollow: noise', 'sq faint']]);
    const st = UI.stats(body, [['c', 'clusters'], ['n', 'noise points'], ['core', 'core points']]);
    gen(); run(); draw();
  });
}
