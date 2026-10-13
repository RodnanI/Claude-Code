// Build the full Tidemark city and run it, printing a daily summary.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S);
const fails = T.buildTidemark(S, process.argv[2] || 'canal');
if (fails.length) console.log('fails', fails);
const days = +(process.argv[3] || 4);
const t0 = Date.now();
for (let d = 0; d < days; d++) {
  for (let i = 0; i < T.TPD; i++) {
    T.step(S);
    if (i % 300 === 0) { const au = T.audit(S); if (!au.ok) { console.log('AUDIT FAIL tick', S.tick, au.issues.slice(0, 6), au.rows.filter(r => r.disc)); process.exit(1); } }
  }
  const au = T.audit(S);
  const kinds = {}; for (const v of S.vehs) { const k = v.k + ':' + v.st; kinds[k] = (kinds[k] || 0) + 1; }
  console.log(T.clockStr(S.tick), 'pop', S.labour && S.labour.pop, 'emp', S.labour && S.labour.emp + '/' + S.labour.jobs, 'money', S.money, 'cons', S.cons.length, 'audit', au.ok, JSON.stringify(kinds));
  console.log('  delivered', S.delivered.map((n, r) => n ? T.RES[r].id + ':' + n : '').filter(Boolean).join(' '));
  console.log('  alerts', S.alerts.slice(0, 6).map(a => a.text).join(' | '));
}
console.log('ms/tick', ((Date.now() - t0) / (days * T.TPD)).toFixed(3));
const st = {}; for (const b of S.blds) if (b.type !== 'house') { st[b.type] = st[b.type] || []; st[b.type].push(b.id + ':' + ['ok','nowk','nopw','in','full','ext'][b.st] + ' wk' + b.wk); }
for (const k in st) console.log(k.padEnd(11), st[k].join(' '));
for (const v of S.vehs) if (v.k !== 'truck' || v.ob) console.log(v.id, v.k, v.st, '|', v.ob, v.job ? JSON.stringify(v.job) : '');
for (const l of S.locks) console.log('lock', l.id, l.ph, 'g', l.g, 'lvl', l.lvl, 'q', JSON.stringify(l.q), 'cycles', l.cycles, 'empty', l.empty);
const hs = S.blds.filter(b => b.type === 'house'); const lv = [0,0,0,0]; for (const h of hs) lv[h.lvl]++; console.log('house levels', lv, 'hungry', hs.filter(h => h.missed).length);
console.log('dec', S.dec.n, T.hex(S.dec.h), 'hash', T.hex(T.hashState(S)));
