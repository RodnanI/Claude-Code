// Loads the simulation sources (no DOM) into one VM context for headless tests.
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadSim(extra) {
  const dir = path.join(__dirname, '..', 'src');
  const files = fs.readdirSync(dir).filter(f => /^\d\d_.*\.js$/.test(f) && parseInt(f) < 80).sort();
  let code = files.map(f => '// ---- ' + f + '\n' + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  code += '\n;(' + function () {
    globalThis.SIM = { newSim, genTerrain, applyAction, step, serialize, deserialize, hashState, audit, replay, seedStock, placeBuilding,
      bById, vById, cById, BT, VT, RES, R, NR, TPD, TPH, tIdx, explainShortage, shortageOf, conReport, clockStr, tideAt, stamp, makeGen,
      railDeadlocks, roadNet, bAcc, xy, sumArr, TPH, D_COAL: 1, D_ORE: 2, D_CLAY: 3, D_FERTILE: 4, T_SEA, T_LAND, T_CANAL, T_LOCK,
      scen: SCEN, startScenario,
      stressTest, runToEnd, bridgeGroups, hex, canPlace, buildTidemark, buildSandbox, shapeTidemark,
      playStage, dbg: (S, est, wst, steel, ore) => { const rt = routeTable(S, steel, 1); return { rd: railStationDist(S, est, wst), rd2: railStationDist(S, wst, est), trains: [...trainsPerComp(S)], comp: railCompOf(S, est.y*S.W+est.x), compW: railCompOf(S, wst.y*S.W+wst.x), cost: [...rt.cost], nx: [...rt.nx], route: routeFrom(S, rt, ore, -1), free: nodeFree(S, est) }; },
      dbg2: (S, q) => { refreshBookings(S); return { used: storeUsed(S, q), book: q._book, tr: q.tr.map(id => { const c = cById(S, id); return c && (c.st + ' ' + RES[c.r].id + ' ' + c.q + ' ' + c.legs.map(l=>l[0]).join('/') + ' li' + c.li + ' veh' + c.veh + ' ' + c.ob); }), exp: q.exp, inc: S.cons.filter(c => c.d === q.id).length }; } };
  }.toString() + ')();';
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'tidemark-sim.js' });
  return ctx.SIM;
}
module.exports = { loadSim };
