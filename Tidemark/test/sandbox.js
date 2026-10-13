// Build a working bread town from nothing on several sandbox seeds.
const { loadSim } = require('./load');
const T = loadSim();
let bad = 0;
for (const seed of [11, 4242, 90001]) {
  const S = T.startScenario('sandbox', { seed });
  const W = S.W;
  // find a 14x14 block of open land
  let ox = -1, oy = -1;
  for (let y = 4; y < S.H - 18 && ox < 0; y++) for (let x = 4; x < W - 18 && ox < 0; x++) {
    let okb = true;
    for (let yy = y; yy < y + 14 && okb; yy++) for (let xx = x; xx < x + 14; xx++) { const t = yy * W + xx; if (S.ter[t] !== T.T_LAND || S.bld[t]) { okb = false; break; } }
    if (okb) { ox = x; oy = y; }
  }
  if (ox < 0) { console.log('seed', seed, 'no room for a town'); bad++; continue; }
  const A = a => { const r = T.applyAction(S, a); return r.res.ok ? r.res : (console.log('  fail', a.type, a.bt || '', r.res.why), null); };
  const row = (y, x0, x1) => { const a = []; for (let x = x0; x <= x1; x++) a.push(y * W + x); return a; };
  const col = (x, y0, y1) => { const a = []; for (let y = y0; y <= y1; y++) a.push(y * W + x); return a; };
  A({ type: 'road', tiles: row(oy + 4, ox, ox + 13) }); A({ type: 'road', tiles: row(oy + 9, ox, ox + 13) });
  A({ type: 'road', tiles: col(ox + 6, oy, oy + 13) });
  A({ type: 'place', bt: 'farm', x: ox + 1, y: oy + 2, rot: 0 });
  A({ type: 'place', bt: 'mill', x: ox + 4, y: oy + 3, rot: 0 });
  A({ type: 'place', bt: 'bakery', x: ox + 8, y: oy + 3, rot: 0 });
  const dep = A({ type: 'place', bt: 'depot', x: ox + 10, y: oy + 3, rot: 0 });
  A({ type: 'place', bt: 'market', x: ox + 7, y: oy + 5, rot: 0 });
  for (let x = ox; x <= ox + 13; x++) for (const y of [oy + 8, oy + 10]) if (x !== ox + 6) A({ type: 'place', bt: 'house', x, y, rot: 0 });
  // power: a coal station fed by imported coal through a quay on the nearest shore
  const plant = A({ type: 'place', bt: 'powerplant', x: ox + 11, y: oy + 5, rot: 0 });
  const tiles = []; for (let y = oy; y <= oy + 13; y++) for (let x = ox; x <= ox + 13; x++) if (S.road[y * W + x]) tiles.push(y * W + x);
  A({ type: 'power', tiles });
  if (dep) for (let i = 0; i < 4; i++) A({ type: 'buy', vk: 'truck', b: dep.b.id });
  let qb = null, best = 1e9;
  for (let y = 2; y < S.H - 3; y++) for (let x = 2; x < W - 4; x++) { const c = T.canPlace(S, 'quay', x, y, 0); if (!c.ok) continue; const d = Math.abs(x - ox - 6) + Math.abs(y - oy - 9); if (d < best) { best = d; qb = [x, y]; } }
  if (qb) {
    const q = A({ type: 'place', bt: 'quay', x: qb[0], y: qb[1], rot: 0 });
    // road from the town's north-south street to the quay's top edge
    const path = []; let x = ox + 6, y = oy + 13; const tx = qb[0] + 1, ty = qb[1] - 1;
    while (y !== ty) { y += Math.sign(ty - y); path.push(y * W + x); }
    while (x !== tx) { x += Math.sign(tx - x); path.push(y * W + x); }
    A({ type: 'road', tiles: [(oy + 13) * W + ox + 6].concat(path) });
    if (q) A({ type: 'trade', imp: 1, r: T.R.coal, n: 60 });
    console.log('  quay at', qb, 'freighter gate', S.gate >= 0);
  }
  for (let i = 0; i < 3 * T.TPD; i++) T.step(S);
  const au = T.audit(S);
  const bread = S.delivered[T.R.bread];
  console.log('seed', seed, 'town at', ox, oy, '| pop', S.labour.pop, '| bread delivered', bread, '| money', S.money, '| ledger', au.ok);
  if (!au.ok || bread <= 0 || S.labour.pop <= 0) {
    bad++;
    for (const type of ['market', 'bakery', 'mill', 'powerplant']) { const b = S.blds.find(x => x.type === type); if (!b) continue; const r = T.shortageOf(S, b); console.log('  ', type, 'st', b.st, 'wk', b.wk, 'pw', b.pwOn, 'short', r); if (r >= 0) for (const [d, t] of T.explainShortage(S, b, r).slice(0, 8)) console.log('     ' + '  '.repeat(d) + t); }
    console.log('   alerts', S.alerts.slice(0, 5).map(a => a.text));
  }
}
process.exit(bad ? 1 : 0);
