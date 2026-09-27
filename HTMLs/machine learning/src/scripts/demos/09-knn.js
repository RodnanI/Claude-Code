{
  ML.demo('knn', body => {
    let pts = Data.moons(90, 7, 0.55), k = 5, metric = 'euc', mode = 0, q = null, dirty = true;
    const dist = (ax, ay, bx, by) => metric === 'euc' ? Math.hypot(ax - bx, ay - by) : Math.abs(ax - bx) + Math.abs(ay - by);
    const nearest = (x, y, kk, skip = -1) => {
      const best = [];
      for (let i = 0; i < pts.length; i++) {
        if (i === skip) continue;
        const d = dist(x, y, pts[i].x, pts[i].y);
        if (best.length < kk || d < best[best.length - 1][0]) {
          let j = best.length; best.push(null);
          while (j > 0 && best[j - 1][0] > d) { best[j] = best[j - 1]; j--; }
          best[j] = [d, i]; if (best.length > kk) best.pop();
        }
      }
      return best;
    };
    const vote = nb => nb.length ? nb.reduce((s, [, i]) => s + pts[i].c, 0) / nb.length : 0.5;
    const P = classPlot(body);
    const A = new Plot(body, { x: [1, 25], y: [0.5, 1], height: 96, pad: { l: 34, r: 10, t: 10, b: 18 } });
    let looCurve = [];
    const loo = () => {
      looCurve = [];
      const sorted = pts.map((p, i) => pts.map((o, j) => [j === i ? Infinity : dist(p.x, p.y, o.x, o.y), o.c]).sort((a, b) => a[0] - b[0]));
      for (let kk = 1; kk <= 25; kk++) {
        let ok = 0;
        sorted.forEach((row, i) => { let s = 0; const m = Math.min(kk, row.length - 1); for (let j = 0; j < m; j++) s += row[j][1]; const pred = s / m > 0.5 ? 1 : s / m < 0.5 ? 0 : row[0][1]; if (pred === pts[i].c) ok++; });
        looCurve.push(pts.length > 1 ? ok / pts.length : 0);
      }
    };
    let lastW = 0, lastH = 0;
    P.draw = () => {
      const c = P.begin();
      if (P.W !== lastW || P.H !== lastH) { dirty = true; lastW = P.W; lastH = P.H; }
      if (pts.length) {
        if (dirty || !P._off) { P.field((x, y) => probPx(vote(nearest(x, y, Math.min(k, pts.length)))), 6); dirty = false; }
        else { c.save(); c.imageSmoothingEnabled = true; c.drawImage(P._off, P.L, P.T, P.PW, P.PH); c.restore(); }
      }
      frame(P);
      if (q && pts.length) {
        const nb = nearest(q.x, q.y, Math.min(k, pts.length)), rad = nb[nb.length - 1][0];
        if (metric === 'euc') { c.save(); c.strokeStyle = col('ink-2'); c.setLineDash([4, 4]); c.beginPath(); c.arc(P.sx(q.x), P.sy(q.y), rad * (P.sx(1) - P.sx(0)), 0, TAU); c.stroke(); c.restore(); }
        for (const [, i] of nb) P.seg(q.x, q.y, pts[i].x, pts[i].y, col('ink'), 1.3);
      }
      drawPts(P, pts);
      if (q && pts.length) {
        const nb = nearest(q.x, q.y, Math.min(k, pts.length)), b = nb.reduce((s, [, i]) => s + pts[i].c, 0);
        P.dot(q.x, q.y, 6, col('ink'), col('surface'), 2);
        tip.show(P.sx(q.x), P.sy(q.y), `${nb.length - b} A, ${b} B → ${b * 2 > nb.length ? 'B' : b * 2 < nb.length ? 'A' : 'tie'}`);
      } else tip.hide();
      A.begin(); A.grid(4, 0.1); A.axes({ dx: 4, dy: 0.25, xl: 'k', yl: 'held-out accuracy' });
      A.path(looCurve.map((v, i) => [i + 1, v]), col('ink'), 2);
      if (looCurve[k - 1] != null) A.dot(k, looCurve[k - 1], 5, col('accent'), col('surface'), 2);
      st.set('k', k); st.set('loo', looCurve.length ? Math.round(100 * looCurve[k - 1]) + '%' : '-');
      const bk = looCurve.indexOf(Math.max(...looCurve)) + 1; st.set('b', bk || '-');
    };
    A.draw = P.draw;
    const tip = P.tip();
    let drag = -1, moved = false, st0 = null;
    const changed = () => { dirty = true; loo(); P.draw(); };
    P.pointer({
      down(p) {
        if (mode === 'inspect') { q = p; P.draw(); return; }
        drag = P.pick(pts, p, 14); moved = false; st0 = p;
        if (drag < 0) { pts.push({ x: p.x, y: p.y, c: mode }); drag = pts.length - 1; moved = true; changed(); }
      },
      move(p, down) {
        if (mode === 'inspect' || !down) { q = p; P.draw(); return; }
        if (drag < 0) return;
        if (Math.hypot(p.px - st0.px, p.py - st0.py) > 4) moved = true;
        if (moved) { pts[drag].x = clamp(p.x, P.x[0], P.x[1]); pts[drag].y = clamp(p.y, P.y[0], P.y[1]); changed(); }
      },
      up() { if (mode !== 'inspect' && drag >= 0 && !moved) { pts.splice(drag, 1); changed(); } drag = -1; },
      leave() { q = null; P.draw(); }
    });
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'k neighbors', min: 1, max: 25, step: 1, value: k, on: v => { k = v; dirty = true; P.draw(); } });
    UI.seg(r1, { label: 'Distance', options: [['euc', 'Euclidean'], ['man', 'Manhattan']], value: metric, on: v => { metric = v; changed(); } });
    const r2 = UI.row(body);
    UI.seg(r2, { label: 'Tap to', options: [[0, 'Add A'], [1, 'Add B'], ['inspect', 'Inspect']], value: 0, on: v => { mode = v; } });
    UI.seg(r2, { label: 'Data', options: [['moons', 'Moons'], ['blobs', 'Blobs'], ['xor', 'XOR']], value: 'moons', on: v => { pts = Data[v](90, 7, v === 'blobs' ? 0.9 : 0.55); q = null; changed(); } });
    const st = UI.stats(body, [['k', 'k'], ['loo', 'held-out acc.'], ['b', 'best k']]);
    loo(); P.draw();
  });
}
