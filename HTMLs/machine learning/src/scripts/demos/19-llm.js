{
  const PROMPTS = {
    cat: ['The cat sat on the', [['mat', 4.1], ['floor', 3.4], ['couch', 3.1], ['bed', 2.8], ['windowsill', 2.3], ['roof', 2.0], ['keyboard', 1.7], ['table', 1.5], ['piano', 0.3], ['moon', -0.6]]],
    learn: ['The best way to learn machine learning is', [['to', 4.0], ['by', 3.7], ['through', 2.6], ['practice', 2.0], ['building', 1.8], ['with', 1.5], ['reading', 1.1], ['patience', 0.6], ['Kaggle', 0.4], ['dancing', -1.2]]],
    math: ['Two plus two equals', [['four', 6.2], ['4', 5.6], ['five', 1.2], ['22', 0.5], ['fish', -1.5], ['three', 0.9], ['2', 0.2], ['zero', -0.4], ['love', -1.8], ['blue', -2.4]]]
  };
  ML.demo('sampling', body => {
    let key = 'cat', T = 1, topK = 10, topP = 1, counts = {};
    const probs = () => {
      const L = PROMPTS[key][1], m = Math.max(...L.map(l => l[1] / T)), e = L.map(([t, l]) => [t, Math.exp(l / T - m), l]);
      const s = e.reduce((a, b) => a + b[1], 0); let rows = e.map(([t, v, l]) => ({ t, p: v / s, l })).sort((a, b) => b.p - a.p);
      let cum = 0; rows.forEach((r, i) => { r.keep = i < topK && cum < topP - 1e-9; cum += r.p; });
      const ks = rows.filter(r => r.keep).reduce((a, r) => a + r.p, 0); rows.forEach(r => r.q = r.keep ? r.p / ks : 0);
      return rows;
    };
    const prompt = h('div', { style: 'font-family:var(--f-serif);font-size:20px;line-height:1.4;margin:2px 0 12px' }); body.append(prompt);
    const bars = h('div', { style: 'display:grid;gap:5px' }); body.append(bars);
    const draw = () => {
      const rows = probs(), mx = Math.max(...rows.map(r => r.q));
      prompt.innerHTML = `${PROMPTS[key][0]} <span style="border-bottom:2px solid var(--accent);color:var(--muted)">___</span>`;
      bars.innerHTML = '';
      for (const r of rows) {
        const n = counts[r.t] || 0;
        bars.append(h('div', { style: `display:grid;grid-template-columns:96px 1fr 58px;gap:10px;align-items:center;font-family:var(--f-mono);font-size:12px;${r.keep ? '' : 'opacity:.4'}` },
          h('span', { text: r.t, style: 'text-align:right;overflow:hidden;text-overflow:ellipsis' }),
          h('div', { style: 'position:relative;height:16px;background:var(--surface-2)' },
            h('div', { style: `position:absolute;left:0;top:0;bottom:0;width:${(100 * r.q / Math.max(mx, 1e-9)).toFixed(1)}%;background:var(--ink)` }),
            n ? h('div', { style: `position:absolute;left:0;bottom:-3px;height:3px;width:${Math.min(100, n * 5)}%;background:var(--accent)` }) : null),
          h('span', { text: r.keep ? (r.q * 100).toFixed(1) + '%' : 'cut', style: 'color:var(--ink-2)' })));
      }
      const tot = Object.values(counts).reduce((a, b) => a + b, 0);
      st.set('n', tot); st.set('d', Object.keys(counts).length); st.set('top', rows[0].t + ' ' + (rows[0].q * 100).toFixed(0) + '%');
    };
    const sample = n => {
      const rows = probs().filter(r => r.keep);
      for (let i = 0; i < n; i++) { let u = Math.random(), pick = rows[rows.length - 1].t; for (const r of rows) { if (u < r.q) { pick = r.t; break; } u -= r.q; } counts[pick] = (counts[pick] || 0) + 1; }
      draw();
    };
    const r0 = UI.row(body);
    UI.seg(r0, { label: 'Prompt', options: [['cat', 'The cat sat on the'], ['learn', 'Best way to learn ML'], ['math', 'Two plus two']], value: key, on: v => { key = v; counts = {}; draw(); } });
    const r1 = UI.row(body);
    UI.slider(r1, { label: 'temperature', min: 0.05, max: 2, step: 0.05, value: T, fmt: v => fmt(v, 2), on: v => { T = v; counts = {}; draw(); } });
    UI.slider(r1, { label: 'top-k', min: 1, max: 10, step: 1, value: topK, fmt: v => v === 10 ? 'off' : v, on: v => { topK = v; counts = {}; draw(); } });
    UI.slider(r1, { label: 'top-p', min: 0.1, max: 1, step: 0.05, value: topP, fmt: v => v >= 1 ? 'off' : fmt(v, 2), on: v => { topP = v; counts = {}; draw(); } });
    const r2 = UI.row(body);
    UI.btn(r2, 'Sample 1', () => sample(1));
    UI.btn(r2, 'Sample 20', () => sample(20), 'primary');
    UI.btn(r2, 'Clear samples', () => { counts = {}; draw(); });
    UI.legend(body, [['ink', 'probability after temperature and filtering', 'sq'], ['accent', 'how often it was sampled', 'ln']]);
    const st = UI.stats(body, [['n', 'samples drawn'], ['d', 'distinct words'], ['top', 'most likely']]);
    draw();
  });
}
