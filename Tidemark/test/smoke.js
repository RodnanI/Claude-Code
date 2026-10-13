// Smoke test: build a tiny bread economy by actions and run it.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.newSim(1234, 32, 32);
// flat land, sea on the bottom rows
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) S.ter[y * 32 + x] = y >= 28 ? T.T_SEA : T.T_LAND;
for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) S.dep[y * 32 + x] = T.D_FERTILE;
S.gate = 31 * 32 + 0;
S.flags.inf = 1;
const A = (a) => { const r = T.applyAction(S, a); if (!r.res.ok) console.log('FAIL', JSON.stringify(a).slice(0, 80), r.res.why); return r; };
const row = (y, x0, x1) => { const a = []; for (let x = x0; x <= x1; x++) a.push(y * 32 + x); return a; };
const col = (x, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) a.push(y * 32 + x); return a; };
A({ type: 'road', tiles: row(10, 1, 30) });
A({ type: 'road', tiles: col(15, 10, 26) });
A({ type: 'place', bt: 'farm', x: 4, y: 8, rot: 0 });
A({ type: 'place', bt: 'mill', x: 10, y: 9, rot: 0 });
A({ type: 'place', bt: 'bakery', x: 20, y: 9, rot: 0 });
A({ type: 'place', bt: 'depot', x: 24, y: 9, rot: 0 });
A({ type: 'place', bt: 'market', x: 16, y: 11, rot: 0 });
A({ type: 'place', bt: 'tidemill', x: 14, y: 27, rot: 0 });
A({ type: 'place', bt: 'powerplant', x: 26, y: 11, rot: 0 });
A({ type: 'place', bt: 'quay', x: 16, y: 26, rot: 0 });
A({ type: 'road', tiles: row(25, 10, 20) });
for (let y = 12; y <= 24; y++) A({ type: 'place', bt: 'house', x: 14, y, rot: 0 });
for (let y = 13; y <= 24; y++) A({ type: 'place', bt: 'house', x: 16, y, rot: 0 });
A({ type: 'power', tiles: col(13, 11, 27) });
A({ type: 'power', tiles: row(11, 13, 15) });
A({ type: 'power', tiles: row(11, 18, 25) });
A({ type: 'power', tiles: col(12, 9, 11) });
A({ type: 'power', tiles: col(22, 9, 11) });
for (let i = 0; i < 4; i++) A({ type: 'buy', vk: 'truck', b: S.blds.find(b => b.type === 'depot').id });
const q = S.blds.find(b => b.type === 'quay');
T.seedStock(S, q, T.R.coal, 60);
T.seedStock(S, q, T.R.bread, 40);
A({ type: 'trade', imp: 1, r: T.R.coal, n: 30 });
let t0 = Date.now();
for (let i = 0; i < T.TPD * 6; i++) {
  T.step(S);
  if (i % 400 === 0) { const au = T.audit(S); if (!au.ok) { console.log('AUDIT FAIL at', i, au.issues.slice(0, 5), au.rows.filter(r => r.disc)); process.exit(1); } }
}
console.log('ms', Date.now() - t0, 'tick', S.tick, T.clockStr(S.tick));
const au = T.audit(S);
console.log('audit ok', au.ok, au.issues.slice(0, 5));
for (const r of au.rows) if (r.start + r.ext + r.imp + r.prod) console.log(T.RES[r.r].name.padEnd(10), JSON.stringify(r));
console.log('pop', S.labour, 'money', S.money);
for (const b of S.blds) if (b.type !== 'house') console.log(b.id, b.type, 'wk', b.wk, 'pw', b.pwOn, 'st', b.st, 'inv', b.inv.join(','), 'out', b.out.join(','));
console.log('houses', S.blds.filter(b => b.type === 'house').map(b => b.res + '/' + b.lvl + (b.pwOn ? 'p' : '-') + b.inv[T.R.bread]).join(' '));
for (const v of S.vehs) console.log(v.id, v.k, v.st, v.ob, v.job && JSON.stringify(v.job));
console.log('cons', S.cons.length, S.cons.slice(0, 5).map(c => c.id + ':' + c.st + ':' + T.RES[c.r].id + 'x' + c.q + ' ' + c.ob));
console.log('dec', S.dec.n, T.hex(S.dec.h), 'alerts', S.alerts.map(a => a.text));
