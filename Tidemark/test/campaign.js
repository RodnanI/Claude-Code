// Play chapter I headlessly the way a player would, and check it can be won.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.startScenario('c1');
const A = a => { const r = T.applyAction(S, a); if (!r.res.ok) console.log('failed', a.type, a.bt || '', r.res.why); return r.res; };
A({ type: 'place', bt: 'mill', x: 19, y: 23, rot: 0 });
A({ type: 'place', bt: 'bakery', x: 21, y: 23, rot: 0 });
for (const x of [10, 11, 7]) A({ type: 'place', bt: 'tidemill', x, y: 43, rot: 0 });
A({ type: 'power', tiles: [42 * 56 + 7, 42 * 56 + 10, 42 * 56 + 11] });
A({ type: 'place', bt: 'forester', x: 6, y: 13, rot: 0 });
A({ type: 'place', bt: 'sawmill', x: 12, y: 10, rot: 0 });
A({ type: 'power', tiles: [11 * 56 + 14, 12 * 56 + 14, 13 * 56 + 14, 14 * 56 + 14, 15 * 56 + 14, 16 * 56 + 14, 17 * 56 + 14, 18 * 56 + 14, 19 * 56 + 14, 20 * 56 + 14, 21 * 56 + 14, 22 * 56 + 14, 23 * 56 + 14] });
let won = 0;
for (let d = 0; d < 8 && !won; d++) {
  for (let i = 0; i < T.TPD; i++) { T.step(S); if (S.scen.won) { won = S.tick; break; } }
  console.log(T.clockStr(S.tick), 'goals', JSON.stringify(S.scen.goals.map(g => (g.done ? 'done ' : '') + g.prog)), 'pop', S.labour.pop, 'money', S.money);
}
console.log(won ? 'chapter I won at ' + T.clockStr(won) : 'chapter I not won');
const au = T.audit(S); console.log('ledger', au.ok);
process.exit(won && au.ok ? 0 : 1);
