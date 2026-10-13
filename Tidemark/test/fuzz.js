// Aggressive random editing on the full city: no crashes, ledger always
// balances, structural invariants hold, and replay still reproduces.
const { loadSim } = require('./load');
const T = loadSim();
const seed = +(process.argv[2] || 1), days = +(process.argv[3] || 15), every = +(process.argv[4] || 25);
let rs = seed * 2654435761 >>> 0;
const rnd = n => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs % n; };
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); T.buildTidemark(S, 'canal');
S.money = 1e6;
const W = S.W;
const types = Object.keys(T.BT).filter(k => k !== 'lighthouse');
let snap = null, snapTick = 0, applied = 0, okc = 0;
const t0 = Date.now();
const end = days * T.TPD;
function randomAction() {
  const x = rnd(W), y = rnd(S.H), t = y * W + x, k = rnd(100);
  if (k < 30) {                                  // bulldoze near infrastructure (bridges, roads, rails)
    const pool = [];
    for (let i = 0; i < 40; i++) { const u = rnd(W * S.H); if (S.road[u] || S.rail[u] || (S.bld[u] && rnd(4) === 0)) pool.push(u); }
    if (!pool.length) return null;
    const u = pool[rnd(pool.length)];
    const tiles = [u]; if (rnd(3) === 0) tiles.push(u + 1, u + W);
    return { type: 'bulldoze', tiles: tiles.filter(v => v >= 0 && v < W * S.H) };
  }
  if (k < 45) { const len = 2 + rnd(8), d = rnd(2); const tiles = []; for (let i = 0; i < len; i++) tiles.push(d ? t + i : t + i * W); return { type: 'road', tiles: tiles.filter(v => v < W * S.H) }; }
  if (k < 55) { const len = 2 + rnd(8), d = rnd(2); const tiles = []; for (let i = 0; i < len; i++) tiles.push(d ? t + i : t + i * W); return { type: 'rail', tiles: tiles.filter(v => v < W * S.H) }; }
  if (k < 60) return { type: 'canal', tiles: [t, t + 1].filter(v => v < W * S.H) };
  if (k < 62) return { type: 'lock', t };
  if (k < 66) return { type: 'signal', t, d: rnd(5) - 1 };
  if (k < 80) return { type: 'place', bt: types[rnd(types.length)], x, y, rot: rnd(2) };
  if (k < 88) { const b = S.blds[rnd(S.blds.length)]; return { type: 'buy', vk: ['truck', 'train', 'barge'][rnd(3)], b: b.id }; }
  if (k < 91) { const v = S.vehs[rnd(S.vehs.length)]; return v ? { type: rnd(2) ? 'scrap' : 'sell', v: v.id } : null; }
  if (k < 95) return { type: 'trade', imp: rnd(2), r: rnd(T.NR), n: rnd(80) };
  const w = S.blds.filter(b => b.type === 'warehouse'); if (w.length) return { type: 'want', b: w[0].id, r: rnd(T.NR), n: rnd(60) };
  return null;
}
try {
  while (S.tick < end) {
    if (S.tick % every === 0) { const a = randomAction(); if (a) { applied++; const r = T.applyAction(S, a); if (r.res.ok) okc++; } }
    if (S.tick === Math.floor(end / 2)) { snap = T.serialize(S); snapTick = S.tick; }
    T.step(S);
    if (S.tick % 600 === 0) {
      const au = T.audit(S);
      if (!au.ok) { console.log('AUDIT FAIL tick', S.tick, au.issues.slice(0, 8), au.rows.filter(r => r.disc)); process.exit(1); }
    }
  }
} catch (e) { console.log('CRASH at tick', S.tick, e.stack); process.exit(1); }
const ms = Date.now() - t0;
const au = T.audit(S);
let lost = 0; for (const r of au.rows) lost += r.lost;
console.log('seed', seed, 'days', days, 'actions', applied, 'succeeded', okc, 'ms', ms, 'vehicles', S.vehs.length, 'buildings', S.blds.length, 'cons', S.cons.length, 'lost units', lost, 'wrecks', S.wrecks.length);
const R = T.replay(snap, S.acts, S.tick);
const same = T.hashState(R) === T.hashState(S);
console.log('ledger ok', au.ok, '| replay from mid snapshot identical:', same, T.hex(T.hashState(S)));
if (!same || !au.ok) process.exit(1);
