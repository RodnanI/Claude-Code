// Liveness: repeatedly tear down and rebuild both estuary bridges while the
// city runs, then check it recovers: deliveries resume, nothing stays stuck.
const { loadSim } = require('./load');
const T = loadSim();
const S = T.newSim(7, 56, 56);
T.shapeTidemark(S); T.buildTidemark(S, 'canal');
S.money = 1e6;
const W = S.W;
const road = [24 * W + 33, 24 * W + 34], rail = [8 * W + 32, 8 * W + 33, 8 * W + 34, 8 * W + 35];
const delivered = () => S.delivered.reduce((a, b) => a + b, 0);
for (let i = 0; i < T.TPD; i++) T.step(S);
const d0 = delivered();
for (let i = 0; i < T.TPD; i++) T.step(S);
const baseline = delivered() - d0;
let lostBefore = S.led.lost.reduce((a, b) => a + b, 0);
// 4 days of chaos
for (let i = 0; i < 4 * T.TPD; i++) {
  const ph = i % 500;
  if (ph === 0) { T.applyAction(S, { type: 'bulldoze', tiles: road }); T.applyAction(S, { type: 'bulldoze', tiles: [8 * W + 33, 8 * W + 34] }); }
  if (ph === 250) { T.applyAction(S, { type: 'road', tiles: road }); T.applyAction(S, { type: 'rail', tiles: rail }); }
  T.step(S);
  if (i % 600 === 0) { const au = T.audit(S); if (!au.ok) { console.log('AUDIT FAIL', au.issues.slice(0, 5)); process.exit(1); } }
}
T.applyAction(S, { type: 'road', tiles: road }); T.applyAction(S, { type: 'rail', tiles: rail });
const lostChaos = S.led.lost.reduce((a, b) => a + b, 0) - lostBefore;
// recovery
for (let i = 0; i < T.TPD; i++) T.step(S);
const d1 = delivered();
for (let i = 0; i < T.TPD; i++) T.step(S);
const after = delivered() - d1;
const stuckCons = S.cons.filter(c => S.tick - c.t0 > 2 * T.TPD);
const stuckVeh = S.vehs.filter(v => v.wt > 600 || v.st === 'derail' || v.st === 'stranded');
console.log('deliveries/day baseline', baseline, 'after recovery', after, '| cargo lost during chaos', lostChaos, '| wrecks', S.wrecks.length);
console.log('consignments older than 2 days', stuckCons.length, stuckCons.slice(0, 5).map(c => c.id + ' ' + c.st + ' ' + T.RES[c.r].id + ' ' + c.ob));
console.log('stuck vehicles', stuckVeh.length, stuckVeh.slice(0, 6).map(v => v.k + '#' + v.id + ' ' + v.st + ' wt' + v.wt + ' ' + v.ob));
const au = T.audit(S);
console.log('ledger balanced', au.ok);
const pass = au.ok && after >= baseline * 0.6 && stuckVeh.length === 0;
console.log(pass ? 'PASS liveness' : 'FAIL liveness');
process.exit(pass ? 0 : 1);
