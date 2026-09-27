{
  const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2)), pdf = x => Math.exp(-x * x / 2) / Math.sqrt(TAU);
  const GROUPS = [{ name: 'Group 1', m0: 0, m1: 2.3, base: 0.4 }, { name: 'Group 2', m0: 0.5, m1: 1.9, base: 0.2 }];
  ML.demo('fairness', body => {
    const t = [1.2, 1.2]; let linked = true;
    const plots = GROUPS.map(g => {
      body.append(h('div', { class: 'sub-lbl', text: `${g.name}: ${Math.round(g.base * 100)}% truly qualified` }));
      return new Plot(body, { x: [-3.5, 5], y: [0, 0.44], aspect: 0.2, maxH: 130, minH: 90, pad: { l: 8, r: 8, t: 4, b: 16 }, scroll: true });
    });
    const table = h('div', { class: 'tbl-wrap' }); body.append(table);
    const stats = g => { const i = GROUPS.indexOf(g), tpr = 1 - Phi(t[i] - g.m1), fpr = 1 - Phi(t[i] - g.m0), sel = g.base * tpr + (1 - g.base) * fpr; return { tpr, fpr, sel, prec: sel ? g.base * tpr / sel : 0 }; };
    const draw = () => {
      GROUPS.forEach((g, i) => {
        const P = plots[i], c = P.begin(); P.axes({ dx: 1 });
        const area = (mu, k, from, to, fill) => { c.beginPath(); c.moveTo(P.sx(from), P.sy(0)); for (let x = from; x <= to + 1e-9; x += 0.05) c.lineTo(P.sx(x), P.sy(k * pdf(x - mu))); c.lineTo(P.sx(to), P.sy(0)); c.closePath(); c.fillStyle = fill; c.fill(); };
        area(g.m0, 1, t[i], 5, rgba('c1', 0.45)); area(g.m1, 1, t[i], 5, rgba('c2', 0.55));
        P.fn(x => pdf(x - g.m0), col('c1'), 1.6); P.fn(x => pdf(x - g.m1), col('c2'), 1.6);
        P.seg(t[i], 0, t[i], 0.44, col('ink'), 2);
      });
      const s = GROUPS.map(stats), pct = v => (v * 100).toFixed(0) + '%', gap = (a, b) => ((a - b) * 100).toFixed(0) + ' pts';
      table.innerHTML = `<table class="tbl"><tr><th></th><th class="num">${GROUPS[0].name}</th><th class="num">${GROUPS[1].name}</th><th class="num">gap</th></tr>
        <tr><td>Selection rate (approved)</td><td class="num">${pct(s[0].sel)}</td><td class="num">${pct(s[1].sel)}</td><td class="num">${gap(s[0].sel, s[1].sel)}</td></tr>
        <tr><td>True positive rate (qualified and approved)</td><td class="num">${pct(s[0].tpr)}</td><td class="num">${pct(s[1].tpr)}</td><td class="num">${gap(s[0].tpr, s[1].tpr)}</td></tr>
        <tr><td>False positive rate</td><td class="num">${pct(s[0].fpr)}</td><td class="num">${pct(s[1].fpr)}</td><td class="num">${gap(s[0].fpr, s[1].fpr)}</td></tr>
        <tr><td>Precision</td><td class="num">${pct(s[0].prec)}</td><td class="num">${pct(s[1].prec)}</td><td class="num">${gap(s[0].prec, s[1].prec)}</td></tr></table>`;
    };
    plots.forEach(P => P.draw = draw);
    const r = UI.row(body);
    const s1 = UI.slider(r, { label: 'threshold, group 1', min: -1.5, max: 4, step: 0.05, value: t[0], fmt: v => fmt(v, 2), on: v => { t[0] = v; if (linked) { t[1] = v; s2.set(v); } draw(); } });
    const s2 = UI.slider(r, { label: 'threshold, group 2', min: -1.5, max: 4, step: 0.05, value: t[1], fmt: v => fmt(v, 2), on: v => { t[1] = v; if (linked) { t[0] = v; s1.set(v); } draw(); } });
    const r2 = UI.row(body);
    UI.tgl(r2, 'Same threshold for both groups', true, v => { linked = v; if (v) { t[1] = t[0]; s2.set(t[0]); draw(); } });
    UI.legend(body, [['c2', 'truly qualified'], ['c1', 'not qualified'], ['ink', 'threshold: right of it is approved', 'ln']]);
    draw();
  });
}
