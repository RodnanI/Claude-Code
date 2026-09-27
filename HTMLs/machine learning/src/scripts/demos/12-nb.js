{
  const SPAM = ['win a free prize now', 'claim your free money today', 'urgent you won cash click here', 'limited offer buy now cheap', 'free entry to win a car', 'click here to claim your reward', 'cheap pills best price buy now', 'you are a winner claim now', 'exclusive deal free gift click', 'earn money fast from home', 'congratulations you won a free trip', 'act now offer ends today'];
  const HAM = ['are we still meeting for lunch today', 'can you send me the report', 'see you at the meeting tomorrow', 'thanks for the help with the project', 'let me know when you are home', 'the report is attached for review', 'happy birthday hope you have a great day', 'call me when you get this', 'dinner at my place tonight', 'please review the draft before friday', 'i will be late to the meeting', 'how was your trip'];
  const tok = s => s.toLowerCase().match(/[a-z']+/g) || [];
  ML.demo('nb', body => {
    const count = docs => { const m = {}; let n = 0; for (const d of docs) for (const w of tok(d)) { m[w] = (m[w] || 0) + 1; n++; } return [m, n]; };
    const [cs, ns] = count(SPAM), [ch, nh] = count(HAM), V = new Set([...Object.keys(cs), ...Object.keys(ch)]).size;
    const pw = (m, n, w) => ((m[w] || 0) + 1) / (n + V);
    const known = w => w in cs || w in ch;
    const inp = h('input', { type: 'text', class: 'gl-search', value: 'claim your free trip now', 'aria-label': 'Message to classify', autocomplete: 'off' });
    body.append(inp);
    const pre = UI.row(body);
    for (const ex of ['claim your free trip now', 'see you at lunch today', 'free lunch at the meeting', 'click here for the report', 'you won a car']) UI.btn(pre, ex, () => { inp.value = ex; run(); });
    const bars = h('div', { style: 'display:grid;gap:4px;margin:8px 0 10px' }); body.append(bars);
    const meter = h('div', { style: 'position:relative;height:10px;background:linear-gradient(90deg,var(--c2) 0 50%,var(--c1) 50% 100%);opacity:.9;margin:6px 0 2px' });
    const mark = h('div', { style: 'position:absolute;top:-5px;width:3px;height:20px;background:var(--ink);transition:left .3s' }); meter.append(mark);
    body.append(meter, h('div', { class: 'hint', style: 'display:flex;justify-content:space-between', html: '<span>ham (not spam)</span><span>spam</span>' }));
    const st = UI.stats(body, [['p', 'P(spam | message)'], ['k', 'known words'], ['u', 'ignored (unseen)']]);
    const run = () => {
      const words = tok(inp.value); let ls = Math.log(0.5), lh = Math.log(0.5), unk = 0;
      bars.innerHTML = '';
      const rows = [];
      for (const w of words) {
        if (!known(w)) { unk++; continue; }
        const a = Math.log(pw(cs, ns, w)), b = Math.log(pw(ch, nh, w)); ls += a; lh += b; rows.push([w, a - b]);
      }
      const mx = Math.max(1, ...rows.map(r => Math.abs(r[1])));
      for (const [w, v] of rows) {
        const pct = 50 * Math.abs(v) / mx;
        bars.append(h('div', { style: 'display:grid;grid-template-columns:90px 1fr 54px;align-items:center;gap:8px;font-family:var(--f-mono);font-size:12px' },
          h('span', { text: w, style: 'overflow:hidden;text-overflow:ellipsis' }),
          h('div', { style: 'position:relative;height:12px;background:var(--surface-2)' },
            h('div', { style: `position:absolute;top:0;bottom:0;left:${v >= 0 ? 50 : 50 - pct}%;width:${pct}%;background:var(--${v >= 0 ? 'c1' : 'c2'})` }),
            h('div', { style: 'position:absolute;top:-2px;bottom:-2px;left:50%;width:1px;background:var(--ink-2)' })),
          h('span', { text: (v >= 0 ? '+' : '') + v.toFixed(2), style: 'text-align:right;color:var(--ink-2)' })));
      }
      if (!rows.length) bars.append(h('div', { class: 'hint', text: 'No known words yet. Try words like free, claim, meeting, report.' }));
      const p = 1 / (1 + Math.exp(lh - ls));
      mark.style.left = `calc(${(p * 100).toFixed(1)}% - 1px)`;
      st.set('p', fmt(p * 100, 1) + '%'); st.set('k', rows.length); st.set('u', unk);
    };
    inp.addEventListener('input', run);
    run();
  });
}
