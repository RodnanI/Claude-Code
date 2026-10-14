// Chapter VI played headlessly with paid player actions only: new works for
// jobs, houses near the market, the railway bridge rebuilt after it is pulled
// down, exports raised. The chapter must be won and the ledger must balance.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.startScenario('c6');
const W = S.W;
const fails = [];
const A = a => { const r = T.applyAction(S, a); if (!r.res.ok) fails.push(a.type + ' ' + (a.bt || '') + ': ' + r.res.why); return r.res.ok; };
const mk = S.blds.find(b => b.type === 'market');
const mainNet = () => T.roadNet(S).rc[T.bAcc(S, mk)];
// nearest valid site to the market hall whose entrance is on the town's road network
function site(type) {
  let best = null, bd = 1e9; const rc = mainNet(), bt = T.BT[type];
  for (let y = 1; y < S.H - 3; y++) for (let x = 1; x < W - 3; x++) for (const rot of [0, 1]) {
    const d = Math.abs(x - mk.x) + Math.abs(y - mk.y); if (d >= bd || !T.canPlace(S, type, x, y, rot).ok) continue;
    const b = { type, x, y, rot, w: rot & 1 ? bt.h : bt.w, h: rot & 1 ? bt.w : bt.h };
    const a = T.bAcc(S, b); if (a < 0 || T.roadNet(S).rc[a] !== rc) continue;
    bd = d; best = { x, y, rot };
  }
  return best;
}
for (const type of ['coalmine', 'oremine', 'farm', 'farm', 'mill', 'bakery', 'market', 'forester', 'forester', 'sawmill', 'joinery']) {
  const p = site(type); if (p) A({ type: 'place', bt: type, x: p.x, y: p.y, rot: p.rot }); else fails.push('no site for ' + type);
}
let houses = 0, won = 0;
for (let d = 0; d < 24 && !won; d++) for (let i = 0; i < T.TPD; i++) {
  T.step(S);
  if (S.tick === T.TPD * 2 + 900) {             // the morning after the bridge goes: relay it, sell more
    A({ type: 'rail', tiles: [8 * W + 32, 8 * W + 33, 8 * W + 34, 8 * W + 35] });
    for (const [r, n] of [['furniture', 40], ['steel', 30], ['tools', 40], ['bricks', 40], ['planks', 40]]) A({ type: 'trade', imp: 0, r: T.R[r], n });
  }
  if (S.tick % 600 === 0 && S.money > 2000 && houses < 60) for (let k = 0; k < 6; k++) { const p = site('house'); if (p && A({ type: 'place', bt: 'house', x: p.x, y: p.y, rot: 0 })) houses++; }
  if (S.scen.won) { won = S.tick; break; }
}
const au = T.audit(S);
console.log('c6  ', won ? 'WON ' + T.clockStr(won) : 'not won', '| goals', JSON.stringify(S.scen.goals.map(g => (g.done ? 'done ' : '') + g.prog)), '| money', S.money, '| ledger', au.ok, fails.length ? '| failed actions: ' + fails.slice(0, 3).join('; ') : '');
process.exit(won && au.ok ? 0 : 1);
