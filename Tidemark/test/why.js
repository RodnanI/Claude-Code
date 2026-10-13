const { loadSim } = require('./load');
const T = loadSim();
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); T.buildTidemark(S, process.argv[2] || 'canal');
const days = +(process.argv[3] || 2);
for (let i = 0; i < T.TPD * days; i++) T.step(S);
const show = (id, r) => { const b = T.bById(S, id); console.log('--- why', b.type, id, T.RES[r].id); for (const [d, t] of T.explainShortage(S, b, r)) console.log('  '.repeat(d) + t); };
for (const b of S.blds) if (b.type === 'market' || b.type === 'steelworks') { const r = T.shortageOf(S, b); if (r >= 0) show(b.id, r); }
const jobs = {}; for (const v of S.vehs) if (v.k === 'truck' && v.job) { const c = T.cById(S, v.job.c); if (c) { const k = T.RES[c.r].id + ' ' + T.bById(S, c.o)?.type + '>' + T.bById(S, c.d)?.type + ' ' + c.legs.map(l => l[0]).join('/'); jobs[k] = (jobs[k] || 0) + 1; } }
console.log('truck jobs', jobs);
const cs = {}; for (const c of S.cons) { const k = c.st + ' ' + T.RES[c.r].id + ' ' + T.bById(S, c.o)?.type + '>' + T.bById(S, c.d)?.type + ' ' + c.legs.map(l => l[0]).join('/') + (c.veh ? '' : ' [' + c.ob + ']'); cs[k] = (cs[k] || 0) + 1; }
console.log('cons', cs);
for (const b of S.blds) if (['quay','warehouse','brickworks','toolworks','wharf','station2','steelworks','powerplant'].includes(b.type)) console.log(b.type, b.id, 'inv', b.inv.map((n,r)=>n?T.RES[r].id+':'+n:'').filter(Boolean).join(' '), 'out', b.out.map((n,r)=>n?T.RES[r].id+':'+n:'').filter(Boolean).join(' '), b.exp ? 'exp ' + b.exp.join(',') : '', b.tr ? 'tr ' + b.tr.length : '', 'st', b.st, 'wk', b.wk);
for (const id of [S.keep.bricks, S.keep.tools]) { const b = T.bById(S, id); const r = T.shortageOf(S, b); if (r >= 0) show(id, r); }
console.log('trade', JSON.stringify(S.trade));
