{
  const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; };
  const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const pdf = x => Math.exp(-x * x / 2) / Math.sqrt(TAU);

  ML.demo('threshold', body => {
    const s = { d: 2, prev: 0.3, t: 1.2, scale: false, curve: 'roc' };
    const cols = h('div', { class: 'fig-cols' }); body.append(cols);
    const left = h('div'), right = h('div'); cols.append(left, right);
    left.append(h('div', { class: 'sub-lbl', text: 'Model scores by true class' }));
    const rl = h('div', { class: 'sub-lbl' }); right.append(rl);
    const D = new Plot(left, { x: [-4, 6], y: [0, 0.45], aspect: 0.62, maxH: 300, minH: 190, pad: { l: 8, r: 8, t: 6, b: 20 } });
    const R = new Plot(right, { x: [0, 1], y: [0, 1], equal: true, aspect: 0.9, maxH: 300, minH: 190, pad: { l: 30, r: 8, t: 6, b: 22 } });
    const rates = t => ({ tpr: 1 - Phi(t - s.d), fpr: 1 - Phi(t) });
    const draw = () => {
      const { tpr, fpr } = rates(s.t), N = 1000, P1 = Math.round(N * s.prev), P0 = N - P1;
      const TP = Math.round(P1 * tpr), FN = P1 - TP, FP = Math.round(P0 * fpr), TN = P0 - FP;
      // Distributions
      const k0 = s.scale ? 2 * (1 - s.prev) : 1, k1 = s.scale ? 2 * s.prev : 1;
      D.setDomain([-4, 6], [0, 0.42 * Math.max(k0, k1) + 0.03]);
      const c = D.begin(); D.grid(1, 0); D.axes({ dx: 1, xl: 'score' });
      const area = (mu, k, from, to, fill) => {
        c.beginPath(); c.moveTo(D.sx(from), D.sy(0));
        for (let x = from; x <= to + 1e-9; x += 0.04) c.lineTo(D.sx(x), D.sy(k * pdf(x - mu)));
        c.lineTo(D.sx(to), D.sy(0)); c.closePath(); c.fillStyle = fill; c.fill();
      };
      area(0, k0, -4, s.t, rgba('c1', 0.12)); area(0, k0, s.t, 6, rgba('c1', 0.55));
      area(s.d, k1, -4, s.t, rgba('c2', 0.22)); area(s.d, k1, s.t, 6, rgba('c2', 0.6));
      D.fn(x => k0 * pdf(x), col('c1'), 1.8); D.fn(x => k1 * pdf(x - s.d), col('c2'), 1.8);
      D.seg(s.t, 0, s.t, D.y[1], col('ink'), 2);
      D.text('threshold', D.sx(s.t) + 5, D.T + 12, { color: col('ink') });
      // ROC or PR
      R.begin(); R.grid(0.2, 0.2); R.axes({ dx: 0.2, dy: 0.2, fx: v => v.toFixed(1) });
      const pts = [];
      for (let t = -6; t <= 8; t += 0.05) { const q = rates(t); pts.push(s.curve === 'roc' ? [q.fpr, q.tpr] : [q.tpr, q.tpr * s.prev / Math.max(1e-12, q.tpr * s.prev + q.fpr * (1 - s.prev))]); }
      if (s.curve === 'roc') { R.seg(0, 0, 1, 1, col('muted'), 1, [4, 4]); rl.textContent = 'ROC curve: true positive rate vs false positive rate'; }
      else { R.seg(0, s.prev, 1, s.prev, col('muted'), 1, [4, 4]); rl.textContent = 'Precision (y) vs recall (x)'; }
      R.path(pts.filter(p => isFinite(p[1])), col('ink'), 2);
      const cur = s.curve === 'roc' ? [fpr, tpr] : [tpr, TP + FP ? TP / (TP + FP) : 1];
      R.dot(cur[0], cur[1], 6, col('accent'), col('surface'), 2);
      // Matrix and metrics
      const cell = (v, l, cls) => `<div class="${cls}"><span class="v">${v}<small>${l}</small></span></div>`;
      cm.innerHTML = `<div class="h"></div><div class="h">predicted +</div><div class="h">predicted −</div>
        <div class="h">actual +</div>${cell(TP, 'true pos', 'tp')}${cell(FN, 'false neg', 'fn')}
        <div class="h">actual −</div>${cell(FP, 'false pos', 'fp')}${cell(TN, 'true neg', 'tn')}`;
      const prec = TP + FP ? TP / (TP + FP) : 0, rec = P1 ? TP / P1 : 0, f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
      st.set('acc', fmt(100 * (TP + TN) / N, 1) + '%'); st.set('p', fmt(prec, 2)); st.set('r', fmt(rec, 2)); st.set('f', fmt(f1, 2));
      st.set('fpr', fmt(fpr, 3)); st.set('auc', fmt(Phi(s.d / Math.SQRT2), 3));
    };
    D.draw = R.draw = draw;
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'threshold', min: -3, max: 5, step: 0.01, value: s.t, fmt: v => fmt(v, 2), on: v => { s.t = v; draw(); } });
    UI.slider(r1, { label: 'model quality (separation)', min: 0, max: 4, step: 0.01, value: s.d, fmt: v => fmt(v, 2), on: v => { s.d = v; draw(); } });
    UI.slider(r1, { label: 'share of positives', min: 0.01, max: 0.5, step: 0.01, value: s.prev, fmt: v => Math.round(v * 100) + '%', on: v => { s.prev = v; draw(); } });
    const r2 = UI.row(body);
    UI.seg(r2, { label: 'Curve', options: [['roc', 'ROC'], ['pr', 'Precision-recall']], value: 'roc', on: v => { s.curve = v; draw(); } });
    UI.tgl(r2, 'Scale curves by class size', false, v => { s.scale = v; draw(); });
    const cm = h('div', { class: 'cm', style: 'max-width:420px;margin:6px 0 12px' }); body.append(cm);
    UI.legend(body, [['c1', 'actual negatives'], ['c2', 'actual positives'], ['accent', 'current threshold on the curve']]);
    const st = UI.stats(body, [['acc', 'accuracy'], ['p', 'precision'], ['r', 'recall'], ['f', 'F1'], ['fpr', 'FP rate'], ['auc', 'AUC']]);
    draw();
  });
}
