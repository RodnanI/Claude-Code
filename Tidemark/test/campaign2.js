// Play chapters II-V headlessly with paid player actions and check each can be won.
const { loadSim } = require('./load');
const T = loadSim();
const W = 56;
function play(id, setup, days) {
  const S = T.startScenario(id);
  const fails = setup(S) || [];
  let won = 0;
  for (let d = 0; d < days && !won; d++) for (let i = 0; i < T.TPD; i++) { T.step(S); if (S.scen.won) { won = S.tick; break; } }
  const au = T.audit(S);
  console.log(id.padEnd(4), won ? 'WON ' + T.clockStr(won) : 'not won', '| goals', JSON.stringify(S.scen.goals.map(g => (g.done ? 'done ' : '') + g.prog)), '| money', S.money, '| ledger', au.ok, fails.length ? '| failed actions: ' + fails.join('; ') : '');
  return won && au.ok;
}
const A = (S, a) => { const r = T.applyAction(S, a); return r.res.ok ? null : a.type + ' ' + (a.bt || '') + ': ' + r.res.why; };
const row = (y, x0, x1) => { const a = []; for (let x = x0; x <= x1; x++) a.push(y * W + x); return a; };
const col = (x, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) a.push(y * W + x); return a; };
let ok = true;
ok = play('c2', S => { const f = T.playStage(S, 'harbour'); const e = A(S, { type: 'place', bt: 'powerplant', x: 25, y: 42, rot: 0 }); if (e) f.push(e); let n = 0; for (let y = 31; y <= 40 && n < 14; y++) for (const x of [19, 23, 25, 29]) { if (n >= 14) break; if (!A(S, { type: 'place', bt: 'house', x, y, rot: 0 })) n++; } return f; }, 6) && ok;
ok = play('c3', S => {
  const f = T.playStage(S, 'farbank');
  [A(S, { type: 'road', tiles: col(36, 36, 38) }), A(S, { type: 'road', tiles: row(38, 37, 50) }),
    A(S, { type: 'place', bt: 'claypit', x: 38, y: 39, rot: 0 }), A(S, { type: 'place', bt: 'brickworks', x: 47, y: 39, rot: 0 }),
    A(S, { type: 'place', bt: 'tidemill', x: 35, y: 39, rot: 0 }), A(S, { type: 'place', bt: 'tidemill', x: 35, y: 40, rot: 0 }),
    A(S, { type: 'power', tiles: [39 * W + 36, 40 * W + 36].concat(row(38, 36, 47)) })].forEach(x => x && f.push(x));
  return f;
}, 8) && ok;
ok = play('c4', S => T.playStage(S, 'railway'), 8) && ok;
ok = play('c5', S => T.playStage(S, 'canal'), 8) && ok;
process.exit(ok ? 0 : 1);
