// Operational rules: trains pass on the loop in opposite directions, locks
// cycle with the tide in both directions, nobody waits forever.
const { loadSim } = require('./load');
const T = loadSim();
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// ---- rail: two trains sent past each other on the single line with a loop
{
  const S = T.startScenario('showcase');
  for (let i = 0; i < 50; i++) T.step(S);
  const wst = T.bById(S, S.keep.wst), est = T.bById(S, S.keep.est);
  const trains = S.vehs.filter(v => v.k === 'train');
  const tw = trains.find(v => v.at === wst.id), te = trains.find(v => v.at === est.id);
  // manual jobs: each train runs to the other station, five times
  let trips = 0, maxWait = 0, sawBothOnLine = false;
  const send = (v, to) => { v.job = { a: 0, b: to.id, ph: 'reloc' }; v.st = 'idle'; };
  send(tw, est); send(te, wst);
  for (let i = 0; i < 6000 && trips < 10; i++) {
    T.step(S);
    for (const v of [tw, te]) {
      if (v.st === 'idle' && !v.job) { trips++; send(v, v.at === wst.id ? est : wst); }
      if (v.st === 'run') maxWait = Math.max(maxWait, v.wt);
    }
    const onLine = [tw, te].filter(v => v.st === 'run' && v.tiles.some(t => t % S.W > 22 && t % S.W < 40)).length;
    if (onLine === 2) sawBothOnLine = true;
  }
  ok(trips >= 10, 'two trains completed ' + trips + ' opposite-direction trips on one line with a passing loop');
  ok(sawBothOnLine, 'both trains were on the line at the same time (they passed in the loop)');
  ok(maxWait < 900, 'longest wait at a signal ' + maxWait + ' ticks');
  ok(T.railDeadlocks(S).length === 0, 'no deadlock cycle');
}
// ---- locks: barges cross both ways at all states of the tide
{
  const S = T.startScenario('showcase');
  const lk = S.locks[0];
  const seen = new Set(), dirs = [0, 0]; let maxQ = 0, lastOcc = 0;
  for (let i = 0; i < 4 * T.TPD; i++) {
    T.step(S);
    seen.add(lk.ph);
    if (lk.occ && lk.occ !== lastOcc) { const v = T.vById(S, lk.occ); if (v) { const s = T.tideAt(S.tick); dirs[v.path.length && v.path[0] % S.W > lk.t % S.W ? 0 : 1]++; } }
    lastOcc = lk.occ;
    maxQ = Math.max(maxQ, lk.q[0].length + lk.q[1].length);
    for (const v of S.vehs) if (v.k === 'barge' && v.wt > 1200) { ok(false, 'barge #' + v.id + ' stuck: ' + v.ob); i = 1e9; break; }
  }
  ok(lk.cycles > 10, 'lock cycled ' + lk.cycles + ' times (' + lk.empty + ' empty turnarounds)');
  ok(seen.has('level') && seen.has('closing') && seen.has('opening'), 'lock went through closing, levelling and opening: ' + [...seen].join(','));
  ok(dirs[0] > 0 && dirs[1] > 0, 'boats admitted toward the canal (' + dirs[0] + ') and toward the sea (' + dirs[1] + ')');
  ok((S.stats.lockUnits || 0) > 0, 'cargo carried through the lock: ' + (S.stats.lockUnits || 0) + ' units');
  console.log('  phases seen:', [...seen].join(', '), '| deepest queue', maxQ);
}
process.exit(fails ? 1 : 0);
