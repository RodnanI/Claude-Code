{
  const FEATS = [
    ['x', 'x₁', (x, y) => x], ['y', 'x₂', (x, y) => y],
    ['xx', 'x₁²', (x, y) => x * x], ['yy', 'x₂²', (x, y) => y * y], ['xy', 'x₁x₂', (x, y) => x * y],
    ['sx', 'sin x₁', (x, y) => Math.sin(3 * x)], ['sy', 'sin x₂', (x, y) => Math.sin(3 * y)]
  ];
  ML.demo('playground', (body, fig) => {
    const S = { data: 'circles', noise: 0.25, on: { x: true, y: true }, layers: 2, width: 4, act: 'tanh', lr: 0.03, opt: 'adam', l2: 0, epoch: 0 };
    let seed = 1, train = [], test = [], net, bufs, active, hist = [], Xtr, Ytr, Xte, Yte, fbuf;
    const featv = (x, y) => active.map(f => f[2](x, y));
    const gen = () => {
      const r = rng(seed * 7 + 1), pts = Data[S.data](240, seed, S.noise).slice();
      for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
      train = pts.slice(0, 168); test = pts.slice(168);
    };
    const build = () => {
      active = FEATS.filter(f => S.on[f[0]]);
      if (!active.length) { S.on.x = true; tg.x.checked = true; active = [FEATS[0]]; }
      const sizes = [active.length, ...new Array(S.layers).fill(S.width), 1];
      net = new MLP(sizes, S.act, (Math.random() * 1e9) | 0);
      bufs = sizes.map(n => new Float64Array(n)); fbuf = new Float64Array(active.length);
      Xtr = train.map(p => featv(p.x, p.y)); Ytr = train.map(p => p.c);
      Xte = test.map(p => featv(p.x, p.y)); Yte = test.map(p => p.c);
      S.epoch = 0; hist = [];
    };
    const fwd = inp => {
      bufs[0].set(inp);
      const L = net.W.length;
      for (let l = 0; l < L; l++) {
        const W = net.W[l], b = net.b[l], prev = bufs[l], out = bufs[l + 1];
        for (let j = 0; j < W.length; j++) {
          let z = b[j]; const row = W[j];
          for (let i = 0; i < row.length; i++) z += row[i] * prev[i];
          out[j] = l === L - 1 ? 1 / (1 + Math.exp(-z)) : net.f(z);
        }
      }
      return bufs[L][0];
    };
    const featInto = (x, y) => { for (let i = 0; i < active.length; i++) fbuf[i] = active[i][2](x, y); return fbuf; };
    const epoch = () => {
      const idx = Xtr.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      for (let i = 0; i < idx.length; i += 16) { const bi = idx.slice(i, i + 16); net.train(bi.map(k => Xtr[k]), bi.map(k => Ytr[k]), { lr: S.lr, l2: S.l2, opt: S.opt }); }
      S.epoch++;
      hist.push([net.loss(Xtr, Ytr), net.loss(Xte, Yte)]);
    };

    const cols = h('div', { class: 'fig-cols even' }); body.append(cols);
    const left = h('div'), right = h('div'); cols.append(left, right);
    left.append(h('div', { class: 'sub-lbl', text: 'The network: each square shows what that neuron responds to' }));
    right.append(h('div', { class: 'sub-lbl', text: 'Output: filled = training points, hollow = test points' }));
    const N = new Plot(left, { aspect: 0.72, maxH: 400, minH: 260, pad: { l: 0, r: 0, t: 0, b: 0 }, scroll: true });
    const O = classPlot(right, { aspect: 0.86, maxH: 400, scroll: true });
    const Lc = new Plot(right, { x: [0, 50], y: [0, 0.8], height: 90, pad: { l: 34, r: 8, t: 8, b: 18 }, scroll: true });

    const G = 14, pool = [];
    const heat = (vals, mode) => {
      let m = 1e-9; if (mode !== 'out') for (const v of vals) m = Math.max(m, Math.abs(v));
      const img = new ImageData(G, G), a1 = rgb('c1'), a2 = rgb('c2');
      for (let i = 0; i < vals.length; i++) {
        const t = mode === 'out' ? (vals[i] - 0.5) * 2 : vals[i] / m, c = t >= 0 ? a2 : a1, k = i * 4;
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 30 + Math.min(1, Math.abs(t)) * 205;
      }
      return img;
    };
    const drawNet = () => {
      const c = N.begin(), sizes = net.sizes, nc = sizes.length, maxN = Math.max(...sizes);
      const padL = 46, padR = 12, padT = 22, padB = 10, gap = 8;
      const s = Math.max(12, Math.min(30, (N.H - padT - padB - (maxN - 1) * gap) / maxN, (N.W - padL - padR) / nc * 0.55));
      const colX = i => padL + (N.W - padL - padR - s) * (nc === 1 ? 0.5 : i / (nc - 1));
      const rowY = (l, j) => { const n = sizes[l], tot = n * s + (n - 1) * gap; return padT + (N.H - padT - padB - tot) / 2 + j * (s + gap); };
      const acts = sizes.map(n => Array.from({ length: n }, () => new Float64Array(G * G)));
      for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
        const x = -1.1 + 2.2 * (gx + 0.5) / G, y = 1.1 - 2.2 * (gy + 0.5) / G;
        fwd(featInto(x, y));
        for (let l = 0; l < nc; l++) for (let j = 0; j < sizes[l]; j++) acts[l][j][gy * G + gx] = bufs[l][j];
      }
      for (let l = 0; l < nc - 1; l++) for (let j = 0; j < sizes[l + 1]; j++) for (let i = 0; i < sizes[l]; i++) {
        const w = net.W[l][j][i], a = Math.min(1, Math.abs(w) / 2);
        c.strokeStyle = rgba(w >= 0 ? 'c2' : 'c1', 0.15 + 0.7 * a); c.lineWidth = 0.5 + 3 * a;
        c.beginPath(); c.moveTo(colX(l) + s, rowY(l, i) + s / 2); c.lineTo(colX(l + 1), rowY(l + 1, j) + s / 2); c.stroke();
      }
      let p = 0;
      for (let l = 0; l < nc; l++) for (let j = 0; j < sizes[l]; j++) {
        const cv = pool[p] || (pool[p] = Object.assign(document.createElement('canvas'), { width: G, height: G })); p++;
        cv.getContext('2d').putImageData(heat(acts[l][j], l === nc - 1 ? 'out' : ''), 0, 0);
        const X = colX(l), Y = rowY(l, j);
        c.fillStyle = col('surface'); c.fillRect(X, Y, s, s);
        c.imageSmoothingEnabled = true; c.drawImage(cv, X, Y, s, s);
        c.strokeStyle = col('ink-2'); c.lineWidth = 1; c.strokeRect(X + .5, Y + .5, s - 1, s - 1);
        if (l === 0) N.text(active[j][1], X - 6, Y + s / 2 + 4, { align: 'right', color: col('ink-2'), size: 11 });
      }
      for (let l = 0; l < nc; l++) N.text(l === 0 ? 'input' : l === nc - 1 ? 'out' : 'h' + l, colX(l) + s / 2, 12, { align: 'center', color: col('muted'), size: 10 });
    };
    const draw = () => {
      O.begin(); O.field((x, y) => probPx(fwd(featInto(x, y)), 0.42), 6); frame(O);
      for (const q of test) O.dot(q.x, q.y, 3.6, col('surface'), col(ML.classKeys[q.c]), 1.8);
      drawPts(O, train, 4.2);
      drawNet();
      const n = hist.length, top = n ? Math.max(0.1, Math.min(1.5, Math.max(...hist.slice(0, 5).flat().filter(isFinite)) * 1.1)) : 0.8;
      Lc.setDomain([0, Math.max(50, n)], [0, top]);
      Lc.begin(); Lc.grid(0, top / 4); Lc.axes({ dy: top / 2, fy: v => v.toFixed(2), xl: 'epoch', yl: 'loss' });
      if (n > 1) { Lc.path(hist.map((v, i) => [i + 1, Math.min(v[0], top)]), col('ink'), 1.6); Lc.path(hist.map((v, i) => [i + 1, Math.min(v[1], top)]), col('accent'), 1.6); }
      const last = hist[n - 1], acc = mean(test.map(q => ((fwd(featInto(q.x, q.y)) >= 0.5 ? 1 : 0) === q.c ? 1 : 0)));
      st.set('e', S.epoch); st.set('tr', last ? (isFinite(last[0]) ? fmt(last[0], 3) : 'diverged') : '-'); st.set('te', last ? (isFinite(last[1]) ? fmt(last[1], 3) : 'diverged') : '-');
      st.set('a', Math.round(acc * 100) + '%');
    };
    N.draw = O.draw = Lc.draw = draw;
    const loop = ML.loop(fig, () => { epoch(); draw(); if (S.epoch >= 2000) return false; });
    loop.onchange = on => play.textContent = on ? 'Pause' : 'Play';
    const rebuild = () => { build(); draw(); };

    const r1 = UI.row(body);
    const play = UI.btn(r1, 'Play', () => loop.toggle(), 'primary');
    UI.btn(r1, 'Step', () => { loop.stop(); epoch(); draw(); });
    UI.btn(r1, 'Reset weights', rebuild);
    UI.btn(r1, 'New data', () => { seed++; gen(); rebuild(); });
    const r2 = UI.row(body);
    UI.seg(r2, { label: 'Data', options: [['circles', 'Circle'], ['xor', 'XOR'], ['spiral', 'Spiral'], ['moons', 'Moons'], ['blobs', 'Blobs']], value: S.data, on: v => { S.data = v; gen(); rebuild(); } });
    UI.slider(r2, { label: 'noise', min: 0, max: 1, step: 0.05, value: S.noise, fmt: v => fmt(v, 2), on: v => { S.noise = v; gen(); rebuild(); } });
    const r3 = UI.row(body);
    UI.slider(r3, { label: 'hidden layers', min: 0, max: 4, step: 1, value: S.layers, on: v => { S.layers = v; rebuild(); } });
    UI.slider(r3, { label: 'neurons per layer', min: 1, max: 8, step: 1, value: S.width, on: v => { S.width = v; rebuild(); } });
    const r4 = UI.row(body);
    UI.seg(r4, { label: 'Activation', options: [['tanh', 'Tanh'], ['relu', 'ReLU'], ['sigmoid', 'Sigmoid'], ['linear', 'Linear']], value: S.act, on: v => { S.act = v; rebuild(); } });
    UI.seg(r4, { label: 'Optimizer', options: [['adam', 'Adam'], ['sgd', 'SGD']], value: S.opt, on: v => { S.opt = v; } });
    const r5 = UI.row(body);
    UI.slider(r5, { label: 'learning rate', min: -3, max: 0, step: 0.1, value: Math.log10(S.lr), fmt: v => fmt(10 ** v, 3), on: v => { S.lr = 10 ** v; } });
    UI.slider(r5, { label: 'L2 regularization', min: -5, max: -1, step: 0.5, value: -5, fmt: v => v <= -5 ? 'off' : '1e' + v, on: v => { S.l2 = v <= -5 ? 0 : 10 ** v; } });
    const r6 = UI.row(body); r6.append(h('span', { class: 'hint', text: 'Input features:' }));
    const tg = {};
    for (const [k, l] of FEATS) tg[k] = UI.tgl(r6, l, !!S.on[k], v => { S.on[k] = v; rebuild(); });
    UI.legend(body, [['c1', 'class A / negative weight'], ['c2', 'class B / positive weight'], ['ink', 'training loss', 'ln'], ['accent', 'test loss', 'ln']]);
    const st = UI.stats(body, [['e', 'epoch'], ['tr', 'train loss'], ['te', 'test loss'], ['a', 'test accuracy']]);
    gen(); build(); draw(); loop.start();
  });
}
