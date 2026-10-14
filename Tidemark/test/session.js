// An hour of aggressive play. At 1x a game day lasts four real minutes, so 15
// days is one hour. Every 40 ticks (four real seconds) the "player" edits the
// city the way people actually do: cuts a road to re-lay it, rips up track,
// pulls down a bridge, renovates a works, drops signals, sprawls houses and
// spurs, churns trucks, fiddles with trade. Every cut is put back a little
// later. Afterwards the city must still work: compared with an untouched copy
// it delivers, houses its people, nothing is stuck, the ledger has balanced at
// every audit and a replay from mid-session reproduces the end state.
const { loadSim } = require('./load');
const T = loadSim();
const days = +(process.argv[2] || 15), every = +(process.argv[3] || 40), seed = +(process.argv[4] || 5);
let rs = (seed * 2654435761) >>> 0 || 1;
const rnd = n => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs % n; };
const mk = () => { const S = T.newSim(7, 56, 56); T.shapeTidemark(S); T.buildTidemark(S, 'canal'); S.money = 1e6; return S; };
const S = mk(), B = mk();
const W = S.W, N = W * S.H;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const nbT = (t, d) => { const x = t % W + DX[d], y = ((t / W) | 0) + DY[d]; return x < 0 || y < 0 || x >= W || y >= S.H ? -1 : y * W + x; };
const R0 = S.rail.slice(), G0 = S.sig.slice();      // the intended track layout
const pending = [];                                  // [tick, restore action]
const reserved = new Set();                          // tiles waiting to be restored
const counts = {};
const A = a => T.applyAction(S, a).res.ok;
const btiles = b => { const a = []; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) a.push(y * W + x); return a; };
const later = (dt, fn, tiles) => { pending.push([S.tick + dt, fn, tiles]); for (const t of tiles) reserved.add(t); };
// re-lay any track (and its signals) missing from the intended layout, except where a cut is still pending
const repairRail = () => {
  for (let u = 0; u < N; u++) if (R0[u] && !reserved.has(u)) for (let d = 0; d < 4; d++) {
    if (!(R0[u] & (1 << d)) || (S.rail[u] & (1 << d))) continue;
    const n = nbT(u, d); if (n < 0 || reserved.has(n)) continue;
    const o = nbT(u, (d + 2) % 4);                  // level crossings are laid straight through in one go
    A({ type: 'rail', tiles: S.road[u] && o >= 0 && !reserved.has(o) ? [o, u, n] : [u, n] });
  }
  for (let u = 0; u < N; u++) if (G0[u] && !S.sig[u] && S.rail[u] && !reserved.has(u)) A({ type: 'signal', t: u, d: G0[u] - 1 });
};
const pickTile = pred => { for (let i = 0; i < 200; i++) { const t = rnd(N); if (!reserved.has(t) && pred(t)) return t; } return -1; };
const edits = {
  cutRoad() {
    const t = pickTile(t => S.road[t] && !S.bld[t] && !S.rail[t] && S.ter[t] === T.T_LAND); if (t < 0) return false;
    const pw = S.pow[t];
    if (!A({ type: 'bulldoze', tiles: [t] })) return false;
    later(100 + rnd(500), () => { A({ type: 'road', tiles: [t] }); if (pw && !S.pow[t]) A({ type: 'power', tiles: [t] }); }, [t]);
    return true;
  },
  cutRail() {
    const t = pickTile(t => S.rail[t] && !S.bld[t] && !S.road[t] && S.ter[t] === T.T_LAND); if (t < 0) return false;
    if (S.sig[t]) A({ type: 'bulldoze', tiles: [t] });
    if (!A({ type: 'bulldoze', tiles: [t] })) return false;
    later(150 + rnd(500), repairRail, [t]);
    return true;
  },
  bridge() {
    const br = []; for (let t = 0; t < N; t++) if ((S.road[t] || S.rail[t]) && S.ter[t] !== T.T_LAND && !reserved.has(t)) br.push(t);
    if (!br.length) return false;
    const t = br[rnd(br.length)];
    if (S.rail[t]) { if (!A({ type: 'bulldoze', tiles: [t] })) return false; later(200 + rnd(600), repairRail, [t]); }
    else { if (!A({ type: 'bulldoze', tiles: [t] })) return false; later(200 + rnd(600), () => A({ type: 'road', tiles: [t] }), [t]); }
    return true;
  },
  renovate() {
    const pool = S.blds.filter(b => !['lighthouse', 'station', 'station2', 'quay', 'wharf'].includes(b.type) && !btiles(b).some(t => reserved.has(t)));
    if (!pool.length) return false;
    const b = pool[rnd(pool.length)], spec = { type: 'place', bt: b.type, x: b.x, y: b.y, rot: b.rot };
    if (!A({ type: 'bulldoze', tiles: [b.y * W + b.x] })) return false;
    later(200 + rnd(700), () => A(spec), btiles(b));
    return true;
  },
  signal() {
    const t = pickTile(t => S.sig[t] > 0); if (t < 0) return false;
    const d = S.sig[t] - 1;
    if (!A({ type: 'signal', t, d: -1 })) return false;
    later(100 + rnd(300), () => { if (!S.sig[t]) A({ type: 'signal', t, d }); }, [t]);
    return true;
  },
  house() {
    const t = pickTile(t => S.ter[t] === T.T_LAND && !S.bld[t] && !S.road[t] && !S.rail[t] && [0, 1, 2, 3].some(d => { const n = nbT(t, d); return n >= 0 && S.road[n]; }));
    return t >= 0 && A({ type: 'place', bt: 'house', x: t % W, y: (t / W) | 0, rot: 0 });
  },
  spur() {
    const t = pickTile(t => S.road[t] && S.ter[t] === T.T_LAND); if (t < 0) return false;
    const d = rnd(4), len = 2 + rnd(4), tiles = [t];
    for (let i = 0, u = t; i < len; i++) { u = nbT(u, d); if (u < 0 || reserved.has(u) || S.bld[u] || S.ter[u] !== T.T_LAND) break; tiles.push(u); }
    return tiles.length > 1 && A({ type: 'road', tiles });
  },
  trucks() {
    const tr = S.vehs.filter(v => v.k === 'truck');
    if (tr.length && rnd(2)) return A({ type: rnd(3) ? 'sell' : 'scrap', v: tr[rnd(tr.length)].id });
    const dep = S.blds.filter(b => b.type === 'depot'); return dep.length > 0 && A({ type: 'buy', vk: 'truck', b: dep[rnd(dep.length)].id });
  },
  trade() { const r = rnd(T.NR); return A({ type: 'trade', imp: rnd(2), r, n: 20 + rnd(60) }); },
  power() {
    const t = pickTile(t => S.pow[t] && !S.road[t] && !S.bld[t]); if (t < 0) return false;
    if (!A({ type: 'bulldoze', tiles: [t] })) return false;
    later(100 + rnd(400), () => A({ type: 'power', tiles: [t] }), [t]);
    return true;
  },
};
const menu = [['cutRoad', 22], ['cutRail', 10], ['bridge', 5], ['renovate', 9], ['signal', 5], ['house', 12], ['spur', 10], ['trucks', 12], ['trade', 7], ['power', 8]];
const skip = (process.env.SKIP || '').split(',');
for (const m of menu) if (skip.includes(m[0])) m[1] = 0;
const total = menu.reduce((a, m) => a + m[1], 0);
const pick = () => { let k = rnd(total); for (const [n, w] of menu) { if (k < w) return n; k -= w; } return menu[0][0]; };
const delivered = X => X.delivered.reduce((a, b) => a + b, 0);
const end = days * T.TPD;
let snap = null, audits = 0, worst = 0, tA = 0, nA = 0;
const t0 = Date.now();
try {
  while (S.tick < end) {
    if (S.tick % every === 0) { const k = pick(); counts[k] = counts[k] || [0, 0]; counts[k][0]++; if (edits[k]()) counts[k][1]++; }
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i][0] <= S.tick) { const [, fn, tiles] = pending[i]; pending.splice(i, 1); for (const t of tiles) reserved.delete(t); fn(); }
    if (S.tick === (end >> 1)) snap = T.serialize(S);
    const a = Date.now(); T.step(S); T.step(B); tA += Date.now() - a; nA++;
    if (S.tick % 600 === 0) { const au = T.audit(S); audits++; if (!au.ok) { console.log('AUDIT FAIL at', T.clockStr(S.tick), au.issues.slice(0, 5)); process.exit(1); } }
    if (S.tick % 200 === 0) for (const v of S.vehs) worst = Math.max(worst, v.wt || 0);
  }
} catch (e) { console.log('CRASH at', S.tick, e.stack); process.exit(1); }
// put everything back that is still cut, then a quiet day and a measured day
reserved.clear();
for (const [, fn] of pending.splice(0)) fn();
repairRail();
for (let i = 0; i < T.TPD; i++) { T.step(S); T.step(B); }
const dS = delivered(S), dB = delivered(B);
for (let i = 0; i < T.TPD; i++) { T.step(S); T.step(B); }
const perDay = delivered(S) - dS, base = delivered(B) - dB;
const au = T.audit(S);
const stuck = S.vehs.filter(v => v.wt > 600 || v.st === 'derail' || v.st === 'stranded' || v.st === 'hold');
const old = S.cons.filter(c => S.tick - c.t0 > 2 * T.TPD);
const tried = Object.values(counts).reduce((a, c) => a + c[0], 0), done = Object.values(counts).reduce((a, c) => a + c[1], 0);
console.log('edits', done + '/' + tried, Object.entries(counts).map(([k, c]) => k + ' ' + c[1]).join(', '));
console.log('wall', Date.now() - t0, 'ms for', days + 4, 'days of two cities; ms per tick pair', (tA / nA).toFixed(2), '| audits', audits, 'all balanced');
console.log('deliveries in the final day: edited', perDay, 'untouched', base, '| population edited', S.labour.pop, 'untouched', B.labour.pop);
console.log('vehicles', S.vehs.length, '| longest wait seen during the session', worst, 'ticks | stuck now', stuck.length, stuck.slice(0, 5).map(v => v.k + '#' + v.id + ' ' + v.st + ' ' + v.ob).join('; '));
console.log('consignments', S.cons.length, '| older than two days', old.length, old.slice(0, 3).map(c => '#' + c.id + ' ' + c.st + ' ' + c.ob).join('; '));
console.log('save size', (T.serialize(S).length / 1024).toFixed(0), 'KB vs untouched', (T.serialize(B).length / 1024).toFixed(0), 'KB | lost units', S.led.lost.reduce((a, b) => a + b, 0));
if (process.env.DEBUG) for (const v of stuck.slice(0, +process.env.DEBUG)) {
  const rn = T.roadNet(S);
  console.log(' ', v.k + '#' + v.id, v.st, 'tile', T.xy(S, v.t), 'road', S.road[v.t], 'rail', S.rail[v.t], 'net', rn.rc ? rn.rc[v.t] : '?', 'wt', v.wt, 'hd', v.hd, 'p', v.p, 'job', JSON.stringify(v.job), 'path', (v.path || []).slice(0, 6).map(t => T.xy(S, t)).join(' '), 'cargo', JSON.stringify(v.cargo), 'ob', v.ob, 'home', v.home, v.home ? T.xy(S, T.bAcc(S, T.bById(S, v.home) || { x: 0, y: 0, w: 1, h: 1, rot: 0, type: 'house' })) : '');
}
if (process.env.SAVE) require('fs').writeFileSync(process.env.SAVE, T.serialize(S));
const R = T.replay(snap, S.acts, S.tick);
const same = T.hashState(R) === T.hashState(S);
console.log('replay of the second half from its snapshot identical:', same);
const pass = au.ok && same && stuck.length === 0 && old.length === 0 && perDay >= base * 0.6 && S.labour.pop >= B.labour.pop * 0.7;
console.log(pass ? 'PASS session' : 'FAIL session');
process.exit(pass ? 0 : 1);
