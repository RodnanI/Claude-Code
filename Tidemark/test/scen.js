// Every scenario builds cleanly, runs, and keeps its ledger balanced.
const { loadSim } = require('./load');
const T = loadSim();
const days = +(process.argv[2] || 2);
let bad = 0;
for (const id of Object.keys(T.scen)) {
  const t0 = Date.now();
  const S = T.startScenario(id, { seed: id === 'sandbox' ? 99 : undefined });
  const fails = S.acts.length;
  for (let i = 0; i < days * T.TPD; i++) T.step(S);
  const au = T.audit(S);
  if (!au.ok) bad++;
  console.log(id.padEnd(9), 'acts', String(fails).padEnd(4), 'blds', String(S.blds.length).padEnd(4), 'veh', String(S.vehs.length).padEnd(3), 'pop', S.labour && S.labour.pop, 'money', S.money, 'audit', au.ok, 'goals', JSON.stringify(S.scen.goals.map(g => (g.done ? 'DONE ' : '') + g.prog)), (Date.now() - t0) + 'ms');
}
process.exit(bad ? 1 : 0);
