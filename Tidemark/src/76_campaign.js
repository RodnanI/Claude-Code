/* =====================================================================
   Scenarios: campaign chapters, diagnostic, stress city, sandbox.
   Goals are read from simulation state; scripted events are ordinary
   actions scheduled inside the state, so they replay like everything else.
   ===================================================================== */

const T_AT = (d, h, m) => d * TPD + h * TPH + Math.floor((m || 0) * TPH / 60);
function cnt(S, type, f) { let n = 0; for (const b of S.blds) if (b.type === type && (!f || f(b))) n++; return n; }
function sinceStart(S, key, r) {
  const b = S.scen.base;
  if (key === 'ledExp') return S.led.exp[r] - b.ledExp[r];
  if (key === 'ledProd') return S.led.prod[r] - b.ledProd[r];
  return S[key][r] - b[key][r];
}
function housesAt(S, lvl) { let n = 0; for (const b of S.blds) if (b.type === 'house' && b.lvl >= lvl) n++; return n; }
function estuaryRoad(S) { for (let t = 0; t < S.W * S.H; t++) { const x = t % S.W; if ((x === 33 || x === 34) && S.ter[t] === T_SEA && S.road[t]) { const a = rcOf(S, (t / S.W | 0) * S.W + 31), b = rcOf(S, (t / S.W | 0) * S.W + 36); if (a >= 0 && a === b) return true; } } return false; }
function railLinked(S) {
  const st = S.blds.filter(b => BT[b.type].node === 'rail');
  for (let i = 0; i < st.length; i++) for (let j = 0; j < st.length; j++) if (i !== j && st[i].x < 33 && st[j].x > 34 && railStationDist(S, st[j], st[i]) >= 0) return true;
  return false;
}

const SCEN = {
  showcase: {
    name: 'Tidemark, free play', kind: 'free', map: [56, 56], seed: 7,
    brief: 'The finished harbour town. Every chain is running: bread from the east farms, timber from the north woods, ore and coal by rail, bricks by barge from Clayport through the tidal lock. Change anything you like.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'canal'); S.money = 20000; },
  },
  c1: {
    name: 'I. Bread and Tide', kind: 'campaign', map: [56, 56], seed: 7, settlers: 3,
    brief: 'Tidemark is a fishing village with a farm and a tide mill. The bakery burned down last winter and the mill was never built. Feed the town: grain must become flour, flour must become bread, and bread must reach the market halls.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'town', { houses: 24, skip: ['mill', 'bakery', 'market2', 'sawmill', 'joinery', 'forester', 'forester2'] }); S.money = 4000; },
    goals: [
      ['Build a roller mill and a bakery on the road network', S => [cnt(S, 'mill') > 0 && cnt(S, 'bakery') > 0, cnt(S, 'mill') + cnt(S, 'bakery') + '/2']],
      ['Deliver 80 loaves to market halls', S => { const n = sinceStart(S, 'delivered', R.bread); return [n >= 80, n + '/80']; }],
      ['Grow Tidemark to 110 residents', S => { const p = S.labour ? S.labour.pop : 0; return [p >= 110, p + '/110']; }],
    ],
    hints: ['Families only move in when there is work for them. Every workplace you add, a forester or a sawmill, lets the town grow further.',
      'Mills and bakeries need electricity. The tide mill only turns while the tide runs, so at slack water the mill stops. More tide mills along the shore smooth it out.',
      'Buildings work only when residents can reach them by road. Check a building\'s staff count.',
      'Select a hungry house and press Why? to follow the shortage back through the chain.'],
  },
  c2: {
    name: 'II. Coal by Sea', kind: 'campaign', map: [56, 56], seed: 7,
    brief: 'The town has outgrown its tide mills. Evenings go dark when everyone lights a lamp. Build a harbour, order coal from the shipping line and fire a power station. Freighters need deep water to berth, and storms keep them at sea.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'town', { houses: 52 }); S.money = 7000; },
    events: [[T_AT(1, 6), { type: 'weather', k: W_STORM, dur: 8 * TPH }]],
    goals: [
      ['Build a harbour quay on the south shore', S => [cnt(S, 'quay') > 0, cnt(S, 'quay') ? 'built' : 'none']],
      ['Run a coal power station on imported coal', S => { const ok = cnt(S, 'powerplant', b => b.inv[R.coal] > 0 && b.load > 0) > 0 && S.trade.imp[R.coal] > 0; return [ok, ok ? 'running' : 'not yet']; }],
      ['Go one full day without a brownout', S => { if (!cnt(S, 'powerplant')) return [false, 'needs a power station']; const since = S.tick - Math.max(S.stats.lastBrown || 0, S.scen.t0); return [since >= TPD, Math.min(100, Math.floor(since * 100 / TPD)) + '%']; }],
      ['Reach 320 residents', S => { const p = S.labour ? S.labour.pop : 0; return [p >= 320, p + '/320']; }],
    ],
    hints: ['Set a standing order for coal in the Trade panel. Freighters top the quay up to that stock level.',
      'A warehouse near the power station buffers coal through storms.',
      'Houses use 50% more power in the evening. Watch the power line of the top bar around 18:00.'],
  },
  c3: {
    name: 'III. The Far Bank', kind: 'campaign', map: [56, 56], seed: 7,
    brief: 'The best farmland lies across the estuary, and so does the clay. Bridge the water, plough the east bank, and start making bricks so the houses can grow a storey. One bridge carries all of it, so watch it fill up.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'harbour'); S.money = 9000; },
    goals: [
      ['Bridge the estuary with a road', S => [estuaryRoad(S), estuaryRoad(S) ? 'connected' : 'not connected']],
      ['Work two farms on the east bank', S => { const n = cnt(S, 'farm', b => b.x >= 35 && b.wk > 0); return [n >= 2, n + '/2']; }],
      ['Make bricks: a clay pit and a brickworks', S => [cnt(S, 'claypit') > 0 && cnt(S, 'brickworks') > 0, (cnt(S, 'claypit') + cnt(S, 'brickworks')) + '/2']],
      ['Raise 8 houses to two storeys', S => { const n = housesAt(S, 2); return [n >= 8, n + '/8']; }],
    ],
    hints: ['Clay lies in the orange ground near the shore of the east bank. Pits need two clay tiles under them.',
      'Houses upgrade once they are full, fed and powered, and have received 4 bricks and 2 planks.',
      'If trucks queue on the bridge, a second crossing or a level-free route halves the queue.'],
  },
  c4: {
    name: 'IV. The Iron Line', kind: 'campaign', map: [56, 56], seed: 7,
    brief: 'Coal and iron ore sit in the northern hills of the east bank. Lay a railway across the estuary, build a steelworks and a toolworks, and ship tools abroad. The old road bridge has been condemned and will close on the second day.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'farbank'); S.money = 16000; },
    events: [[T_AT(1, 12), { type: 'bulldoze', tiles: [24 * 56 + 33, 24 * 56 + 34] }]],
    goals: [
      ['Open a coal mine and an iron mine', S => [cnt(S, 'coalmine') > 0 && cnt(S, 'oremine') > 0, (cnt(S, 'coalmine') + cnt(S, 'oremine')) + '/2']],
      ['Link stations on both banks by rail', S => [railLinked(S), railLinked(S) ? 'linked' : 'not linked']],
      ['Run two trains', S => { let n = 0; for (const v of S.vehs) if (v.k === 'train') n++; return [n >= 2, n + '/2']; }],
      ['Export 40 tools', S => { const n = sinceStart(S, 'ledExp', R.tools); return [n >= 40, n + '/40']; }],
    ],
    hints: ['Trains reserve track up to the next one-way signal facing their direction, or to their platform. A single line with no passing loop carries one train at a time.',
      'A passing loop: two parallel tracks with a one-way signal at each exit, one per direction.',
      'Twin-platform stations let a train load while another waits.',
      'Turn on tool exports in the Trade panel; freighters collect from the quay.'],
  },
  c5: {
    name: 'V. The Lock Keepers', kind: 'campaign', map: [56, 56], seed: 7,
    brief: 'Clayport, south of the east bank, can only be reached by water. Cut a canal from the estuary, build a tidal lock and a wharf, and keep the brickworks there in coal while its bricks come back to town. The lock works with the tide: at high water both gates open, at low water every boat waits for a full cycle.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'railway'); S.money = 12000; },
    events: [[T_AT(1, 20), { type: 'weather', k: W_STORM, dur: 6 * TPH }]],
    goals: [
      ['Build a tidal lock between the estuary and a canal', S => [S.locks.length > 0, S.locks.length + ' locks']],
      ['Build a canal wharf', S => [cnt(S, 'wharf') > 0, cnt(S, 'wharf') + ' wharves']],
      ['Carry 150 units through a lock', S => { const n = (S.stats.lockUnits || 0) - (S.scen.base.lockUnits || 0); return [n >= 150, n + '/150']; }],
      ['Make 200 bricks', S => { const n = sinceStart(S, 'ledProd', R.bricks); return [n >= 200, n + '/200']; }],
    ],
    hints: ['Canals cannot touch the sea directly; a lock needs canal on one side and tidal water exactly opposite.',
      'Barges are bought at a quay or wharf. They carry anything that has a water leg in its route.',
      'The lock serves the side whose gate is open first, but turns around for a boat that has waited too long.'],
  },
  c6: {
    name: 'VI. Tidemark', kind: 'campaign', map: [56, 56], seed: 7,
    brief: 'Everything at once. The council wants a city of nine hundred and a trade surplus. The railway bridge is due for repair on day three and will be pulled down without warning; plan for it.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'canal'); S.money = 15000; },
    events: [[T_AT(2, 8), { type: 'bulldoze', tiles: [8 * 56 + 33, 8 * 56 + 34] }], [T_AT(3, 18), { type: 'weather', k: W_STORM, dur: 10 * TPH }]],
    goals: [
      ['Reach 900 residents', S => { const p = S.labour ? S.labour.pop : 0; return [p >= 900, p + '/900']; }],
      ['Earn 8000 from exports', S => { const n = S.mled.exp - S.scen.base.mexp; return [n >= 8000, n + '/8000']; }],
      ['Raise 30 houses to three storeys', S => { const n = housesAt(S, 3); return [n >= 30, n + '/30']; }],
    ],
    hints: ['Upgrades to three storeys need furniture from a market hall as well as bricks and planks.',
      'Check the ledger: every unit is accounted for. Losses mean something broke under a load.'],
  },
  diag: {
    name: 'Diagnostic: the missing flour', kind: 'diag', map: [56, 56], seed: 7,
    brief: 'All grain for the roller mill comes from the east bank across one road bridge. At 09:00 on day one the bridge is pulled down. Nothing else is touched. Watch what happens, then open the diagnosis: every line is read from live simulation state.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'farbank', { skip: ['farm'] }); S.money = 8000; },
    events: [[T_AT(0, 9), { type: 'bulldoze', tiles: [24 * 56 + 33, 24 * 56 + 34] }]],
    focus: 'bakery',
    goals: [
      ['Watch the bread chain fail', S => { const b = S.blds.find(x => x.type === 'bakery'); const dry = b && b.st === 3; return [dry && S.tick > T_AT(0, 9), dry ? 'bakery idle' : 'running']; }],
      ['Restore the grain supply to the mill', S => { const m = S.blds.find(x => x.type === 'mill'); const ok = m && S.tick > T_AT(0, 12) && S.hist.some(c => c.d === m.id && c.r === R.grain && c.st === 'delivered' && c.t1 > T_AT(0, 9) + 300); return [!!ok, ok ? 'grain arriving' : 'no grain']; }],
    ],
    hints: ['Select the bakery, a market hall or a hungry house and press Why?.',
      'You can rebuild the bridge, lay a railway, or build a farm on the west bank.'],
  },
  stress: {
    name: 'Stress test: bridges under load', kind: 'stress', map: [56, 56], seed: 7,
    brief: 'The full city. The test waits until loaded vehicles are on the road bridge and the railway bridge, takes a snapshot, demolishes them, accounts for every unit, then replays the same demolition from the snapshot in a separate simulation and compares the outcome.',
    build: (S) => { shapeTidemark(S); buildTidemark(S, 'canal'); S.money = 20000; },
  },
  sandbox: {
    name: 'Sandbox', kind: 'sandbox', map: [64, 64], seed: 0, settlers: 0,
    brief: 'An empty stretch of coast from a seed. Coal, iron and farmland are scattered inland; clay lies near the shore.',
    build: (S, o) => buildSandbox(S, o || {}),
  },
};
const CAMPAIGN = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function startScenario(id, opts) {
  opts = opts || {};
  const def = SCEN[id];
  const seed = (opts.seed !== undefined ? opts.seed : def.seed) >>> 0;
  const S = newSim(seed, opts.w || def.map[0], opts.h || def.map[1]);
  S.tick = 6 * TPH;                                                   // every story starts at dawn
  def.build(S, opts);
  const settle = def.settlers === undefined ? 4 : def.settlers;      // households already living here
  if (settle) for (const b of S.blds) if (b.type === 'house') b.res = Math.min(HCAP[b.lvl], settle);
  for (let i = 0; i < 2; i++) { stepLabour(S); stepPower(S); }        // settle staffing and grids before tick 0
  S.scen = { id, t0: S.tick, goals: (def.goals || []).map(() => ({ done: 0, prog: '' })), won: 0, base: {} };
  S.scen.base = { delivered: S.delivered.slice(), ledExp: S.led.exp.slice(), ledProd: S.led.prod.slice(), mexp: S.mled.exp, lockUnits: S.stats.lockUnits || 0 };
  S.sched = (def.events || []).map(([at, a]) => ({ at, a }));
  scenarioTick(S);
  return S;
}
function scenarioTick(S) {
  const def = SCEN[S.scen.id]; if (!def || !def.goals) return;
  let all = true;
  def.goals.forEach((g, i) => {
    const st = S.scen.goals[i];
    const [ok, prog] = g[1](S);
    st.prog = prog;
    if (ok && !st.done) { st.done = S.tick || 1; dec(S, 16, 9000 + i, S.tick, 0); }
    if (!st.done) all = false;
  });
  if (all && !S.scen.won && def.kind === 'campaign') S.scen.won = S.tick || 1;
}
