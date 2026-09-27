{
  /* ---------- Toy word embeddings ---------- */
  const W = {
    man: [-2.2, -0.9], woman: [-0.7, -0.9], king: [-2.2, 1.5], queen: [-0.7, 1.5], boy: [-2.3, -2.2], girl: [-0.8, -2.2], prince: [-2.3, 0.3], princess: [-0.8, 0.3],
    dog: [1.6, -1.2], cat: [2.7, -0.7], puppy: [1.7, -2.3], kitten: [2.8, -1.8],
    apple: [1.7, 1.9], banana: [2.4, 2.5], bread: [1.3, 2.7], cheese: [2.3, 1.5]
  };
  const ANALOGY = { none: null, royal: ['king', 'man', 'woman'], young: ['puppy', 'dog', 'cat'], prince: ['prince', 'boy', 'girl'] };
  ML.demo('embeddings', body => {
    let q = 'queen', an = 'royal';
    const P = new Plot(body, { x: [-3.2, 3.6], y: [-3, 3.2], equal: true, aspect: 0.62, maxH: 420, minH: 260, pad: { l: 4, r: 4, t: 4, b: 4 } });
    const ex = UI.explain(body);
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    P.draw = () => {
      P.begin(); P.grid(1, 1); frame(P);
      const cq = W[q];
      const near = Object.keys(W).filter(w => w !== q).sort((a, b) => dist(W[a], cq) - dist(W[b], cq)).slice(0, 3);
      if (!ANALOGY[an]) for (const w of near) P.seg(cq[0], cq[1], W[w][0], W[w][1], col('accent'), 1.5, [4, 3]);
      let res = null;
      if (ANALOGY[an]) {
        const [a, b, c] = ANALOGY[an], d = [W[a][0] - W[b][0], W[a][1] - W[b][1]], t = [W[c][0] + d[0], W[c][1] + d[1]];
        arrow(P, W[b][0], W[b][1], W[a][0], W[a][1], col('c3'), 2.5);
        arrow(P, W[c][0], W[c][1], t[0], t[1], col('c3'), 2.5);
        res = Object.keys(W).filter(w => ![a, b, c].includes(w)).sort((x, y) => dist(W[x], t) - dist(W[y], t))[0];
        P.dot(t[0], t[1], 9, null, col('accent'), 2);
        ex.innerHTML = `<b>${a} − ${b} + ${c}</b> lands closest to <b>${res}</b>. The arrow from ${b} to ${a} encodes a relationship; adding it to ${c} applies the same relationship.`;
      } else ex.innerHTML = `Closest to <b>${q}</b>: ${near.join(', ')}. Similar meanings sit close together because they appear in similar contexts.`;
      for (const w in W) {
        const [x, y] = W[w], hot = w === q || w === res;
        P.dot(x, y, hot ? 6 : 4.5, hot ? col('accent') : col('ink'), col('surface'), 1.5);
        P.text(w, P.sx(x) + 8, P.sy(y) + 4, { color: hot ? col('ink') : col('ink-2'), size: 12, halo: true });
      }
    };
    P.pointer({ down(p) { const k = Object.keys(W), i = P.pick(k.map(w => W[w]), p, 30, a => a[0], a => a[1]); if (i >= 0) { q = k[i]; an = 'none'; seg.set('none'); P.draw(); } } });
    const r = UI.row(body);
    const seg = UI.seg(r, { label: 'Vector arithmetic', options: [['none', 'Off (tap a word)'], ['royal', 'king − man + woman'], ['prince', 'prince − boy + girl'], ['young', 'puppy − dog + cat']], value: an, on: v => { an = v; P.draw(); } });
    body.append(ex);
    P.draw();
  });

  /* ---------- Self-attention weights ---------- */
  ML.demo('attention', body => {
    const TOK = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'];
    let variant = 'tired', T = 1, qi = 7;
    const scores = () => {
      const tired = variant === 'tired', n = TOK.length;
      const spec = {
        0: { 1: 1.5 }, 1: { 0: 1.6, 3: 1.0 }, 2: { 3: 2.0 }, 3: { 1: 1.8, 5: 2.0 }, 4: { 5: 1.5 }, 5: { 3: 1.6, 4: 1.4 }, 6: { 7: 1.2, 3: 0.8 },
        7: tired ? { 1: 3.4, 5: 1.1 } : { 1: 1.1, 5: 3.4 }, 8: { 7: 2.0, 10: 1.5 }, 9: { 10: 2.2 }, 10: tired ? { 1: 2.3, 7: 1.8 } : { 5: 2.3, 7: 1.8 }
      };
      return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0) + (Math.abs(i - j) === 1 ? 0.5 : 0) + ((spec[i] || {})[j] || 0)));
    };
    const soft = row => { const m = Math.max(...row.map(v => v / T)), e = row.map(v => Math.exp(v / T - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
    const toks = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 14px' }); body.append(toks);
    const hm = new Plot(body, { aspect: 0.72, maxH: 380, minH: 260, pad: { l: 0, r: 0, t: 0, b: 0 }, scroll: true });
    const draw = () => {
      const A = scores().map(soft), row = A[qi];
      toks.innerHTML = '';
      TOK.forEach((t, j) => {
        const b = h('button', { type: 'button', style: `display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;border:1px solid ${j === qi ? 'var(--ink)' : 'var(--line)'};border-radius:3px;cursor:pointer;background:${j === qi ? 'var(--surface)' : `rgba(${rgb('accent').join(',')},${(row[j] * 0.9 + 0.02).toFixed(3)})`};font-family:var(--f-serif);font-size:16px;color:var(--ink)` },
          h('span', { text: t === 'tired' && variant === 'wide' ? 'wide' : t }), h('span', { text: j === qi ? 'query' : Math.round(row[j] * 100) + '%', style: 'font-family:var(--f-mono);font-size:10px;color:var(--ink-2)' }));
        b.addEventListener('click', () => { qi = j; draw(); });
        toks.append(b);
      });
      const c = hm.begin(), n = TOK.length, lw = Math.min(70, hm.W * 0.2), th = 58, cs = Math.min((hm.W - lw - 4) / n, (hm.H - th - 4) / n);
      const words = TOK.map(t => t === 'tired' && variant === 'wide' ? 'wide' : t);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        c.fillStyle = rgba('accent', (A[i][j] * 0.95 + 0.03).toFixed(3)); c.fillRect(lw + j * cs + 1, th + i * cs + 1, cs - 2, cs - 2);
      }
      c.strokeStyle = col('ink'); c.lineWidth = 2; c.strokeRect(lw + 1, th + qi * cs + 1, n * cs - 2, cs - 2);
      c.font = '11px ' + MONO; c.fillStyle = col('ink-2'); c.textAlign = 'right'; c.textBaseline = 'middle';
      words.forEach((w, i) => c.fillText(w, lw - 6, th + i * cs + cs / 2));
      c.save(); c.textAlign = 'left';
      words.forEach((w, j) => { c.save(); c.translate(lw + j * cs + cs / 2, th - 6); c.rotate(-Math.PI / 3); c.fillText(w, 0, 0); c.restore(); });
      c.restore();
    };
    hm.draw = draw;
    hm.pointer({ down(p) { const n = TOK.length, lw = Math.min(70, hm.W * 0.2), th = 58, cs = Math.min((hm.W - lw - 4) / n, (hm.H - th - 4) / n), i = Math.floor((p.py - th) / cs); if (i >= 0 && i < n && p.px > lw) { qi = i; draw(); } } });
    const r = UI.row(body);
    UI.seg(r, { label: 'Sentence ends with', options: [['tired', '"...too tired"'], ['wide', '"...too wide"']], value: variant, on: v => { variant = v; draw(); } });
    UI.slider(r, { label: 'softmax temperature', min: 0.2, max: 3, step: 0.05, value: T, fmt: v => fmt(v, 2), on: v => { T = v; draw(); } });
    draw();
  });
}
