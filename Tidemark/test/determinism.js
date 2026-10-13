// Determinism: a live run with player edits must equal a replay of the same
// recorded actions from an earlier snapshot, bit for bit.
const { loadSim } = require('./load');
const T = loadSim();
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); T.buildTidemark(S, 'canal');
for (let i = 0; i < T.TPD; i++) T.step(S);
const snapA = T.serialize(S), tA = S.tick;
const roadBridge = [S.W * 24 + 33, S.W * 24 + 34];
const plan = new Map([
  [tA + 300, { type: 'bulldoze', tiles: roadBridge }],
  [tA + 900, { type: 'road', tiles: [S.W * 26 + 31, S.W * 26 + 32] }],
  [tA + 1200, { type: 'buy', vk: 'truck', b: S.keep.depot }],
  [tA + 1700, { type: 'road', tiles: roadBridge }],
]);
let snapB = null, tB = 0;
const tEnd = tA + 2 * T.TPD;
while (S.tick < tEnd) {
  const a = plan.get(S.tick); if (a) { const r = T.applyAction(S, a); if (!r.res.ok) console.log('action failed', a.type, r.res.why); }
  if (S.tick === tA + 1000) { snapB = T.serialize(S); tB = S.tick; }
  T.step(S);
}
const live = { h: T.hashState(S), d: S.dec.h, n: S.dec.n, au: T.audit(S) };
ok(live.au.ok, 'live run ledger balances (' + live.au.issues.length + ' issues)');

const R1 = T.replay(snapA, S.acts, tEnd);
ok(T.hashState(R1) === live.h, 'replay from snapshot A reproduces full state hash ' + T.hex(live.h));
ok(R1.dec.h === live.d && R1.dec.n === live.n, 'replay reproduces ' + live.n + ' agent decisions (hash ' + T.hex(live.d) + ')');

const R2 = T.replay(snapB, S.acts, tEnd);
ok(T.hashState(R2) === live.h, 'replay from mid-run snapshot B reproduces state');

// a different future from A: skip the bridge demolition
const alt = S.acts.filter(e => !(e.a.type === 'bulldoze'));
const R3 = T.replay(snapA, alt.slice(0, JSON.parse(snapA).acts.length).concat(alt.slice(JSON.parse(snapA).acts.length)), tEnd);
ok(T.hashState(R3) !== live.h, 'removing one action produces a different future');
const au3 = T.audit(R3); ok(au3.ok, 'alternative future ledger balances');
const delLive = S.delivered.reduce((a, b) => a + b, 0), delAlt = R3.delivered.reduce((a, b) => a + b, 0);
console.log('  delivered units: with demolition', delLive, 'without', delAlt);

// round trip through serialization is lossless
const S2 = T.deserialize(T.serialize(S));
ok(T.hashState(S2) === live.h, 'serialize/deserialize round trip is lossless');
for (let i = 0; i < 500; i++) { T.step(S); T.step(S2); }
ok(T.hashState(S2) === T.hashState(S), 'restored copy and original stay identical for 500 more ticks');
console.log(fails ? fails + ' FAILED' : 'all determinism checks passed');
process.exit(fails ? 1 : 0);
