/* =====================================================================
   Scenario construction. The Tidemark map is built in stages by issuing
   ordinary actions (as "system" actions at tick 0), so every scenario
   start is itself reproducible and the campaign chapters can start from
   any stage of the same city.
   ===================================================================== */

function shapeTidemark(S) {
  const W = S.W, H = S.H, gen = makeGen(S.seed ^ 0x71D3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y * W + x;
    let sea = y >= 44;
    if (x <= 4 && y <= 47) sea = false;                  // lighthouse headland
    if (x >= 36 && y >= 44 && y <= 45 && (x % 7 === 3 || x % 7 === 4)) sea = false;  // ragged east shore
    if ((x === 33 || x === 34) && y >= 6) sea = true;      // the tidal estuary
    if (x === 32 && y >= 40 && y < 44) sea = true;         // estuary mouth widens
    if (x === 35 && y >= 42 && y < 44) sea = true;
    S.ter[t] = sea ? T_SEA : T_LAND;
  }
  S.gate = (H - 1) * W + 12;
  const n = noiseField(gen, W, H, 5);
  for (let t = 0; t < W * H; t++) if (S.ter[t] === T_LAND && n[t] > 0.66) S.tree[t] = 1 + gen.int(3);
  stamp(S, 'forest', 7, 7, 4, gen); stamp(S, 'forest', 12, 3, 2, gen); stamp(S, 'forest', 52, 28, 3, gen); stamp(S, 'forest', 27, 3, 2, gen);
  stamp(S, 'clear', 18, 30, 13, gen); stamp(S, 'clear', 25, 22, 5, gen);
  stamp(S, 'fertile', 6, 21, 3, gen); stamp(S, 'fertile', 43, 16, 5, gen); stamp(S, 'fertile', 49, 21, 3, gen);
  stamp(S, D_COAL, 37, 3, 2, gen); stamp(S, D_ORE, 47, 3, 2, gen); stamp(S, D_CLAY, 38, 40, 1, gen); stamp(S, D_CLAY, 39, 41, 1, gen);
}

/* Builder: wraps actions, throws in development when something fails. */
function builder(S, sys) {
  const fails = [];
  if (sys === undefined) sys = 1;
  const A = (a) => { const r = applyAction(S, a, sys); if (!r.res.ok) fails.push(a.type + ' ' + JSON.stringify(a).slice(0, 90) + ' -> ' + r.res.why); return r.res; };
  const T = (x, y) => y * S.W + x;
  const line = (x0, y0, x1, y1) => { const a = []; if (y0 === y1) { const s = x1 >= x0 ? 1 : -1; for (let x = x0; x !== x1 + s; x += s) a.push(T(x, y0)); } else { const s = y1 >= y0 ? 1 : -1; for (let y = y0; y !== y1 + s; y += s) a.push(T(x0, y)); } return a; };
  return {
    fails, T, line,
    road: (x0, y0, x1, y1) => A({ type: 'road', tiles: line(x0, y0, x1, y1) }),
    rail: (pts) => { let path = []; for (let i = 0; i + 1 < pts.length; i++) { const seg = line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); path = path.concat(i ? seg.slice(1) : seg); } return A({ type: 'rail', tiles: path }); },
    canal: (x0, y0, x1, y1) => A({ type: 'canal', tiles: line(x0, y0, x1, y1) }),
    power: (tiles) => A({ type: 'power', tiles }),
    lock: (x, y) => A({ type: 'lock', t: T(x, y) }),
    sig: (x, y, d) => A({ type: 'signal', t: T(x, y), d }),
    place: (bt, x, y, rot) => { const r = A({ type: 'place', bt, x, y, rot: rot | 0 }); return r.b || null; },
    buy: (vk, b, n) => { if (!b) { fails.push('buy ' + vk + ': building missing'); return; } for (let i = 0; i < (n || 1); i++) A({ type: 'buy', vk, b: b.id }); },
    trade: (r, n, imp) => A({ type: 'trade', imp: imp ? 1 : 0, r, n }),
    want: (b, r, n) => b ? A({ type: 'want', b: b.id, r, n }) : fails.push('want: building missing'),
    A,
  };
}
/* Fill land next to roads with houses inside a rectangle. */
function fillHouses(S, K, x0, y0, x1, y1, max, skip) {
  let n = 0;
  for (let y = y0; y <= y1 && n < max; y++) for (let x = x0; x <= x1 && n < max; x++) {
    const t = y * S.W + x;
    if (S.ter[t] !== T_LAND || S.bld[t] || S.road[t] || S.rail[t]) continue;
    if (skip && skip(x, y)) continue;
    let adj = false; for (let d = 0; d < 4; d++) { const m = nb(S, t, d); if (m >= 0 && S.road[m] && !isWater(S.ter[m])) adj = true; }
    if (!adj) continue;
    if (K.place('house', x, y, 0)) n++;
  }
  return n;
}

const TM_STAGE_FN = {
  harbour(S, K, keep, P, sd) {
    K.road(18, 41, 30, 41);
    keep.quay = P('quay', 'quay', 12, 42, 0);
    keep.wh = P('wh', 'warehouse', 15, 42, 0);
    keep.hdepot = P('hdepot', 'depot', 19, 42, 0);
    keep.plant = P('plant', 'powerplant', 23, 42, 0);
    const p2 = []; for (let x = 11; x <= 26; x++) p2.push(K.T(x, 41)); K.power(p2);
    K.buy('truck', keep.hdepot, 8);
    sd(keep.quay, R.coal, 80); sd(keep.plant, R.coal, 20);
    K.trade(R.coal, 90, 1);
  
  },
  farbank(S, K, keep, P, sd) {
    K.road(31, 24, 32, 24); K.road(33, 24, 34, 24); K.road(35, 24, 36, 24);
    K.road(36, 12, 52, 12); K.road(36, 13, 36, 35);
    K.road(19, 12, 30, 12);
    keep.efarm1 = P('efarm1', 'farm', 38, 13, 0);
    keep.efarm2 = P('efarm2', 'farm', 42, 13, 0);
    keep.edepot = P('edepot', 'depot', 50, 13, 0);
    K.buy('truck', keep.edepot, 5);
    keep.claypit = null;
  
  },
  railway(S, K, keep, P, sd) {
    K.road(18, 7, 18, 12);
    keep.wst = P('wst', 'station2', 19, 8, 0);
    keep.steel = P('steel', 'steelworks', 20, 13, 0);
    keep.tools = P('tools', 'toolworks', 24, 13, 0);
    keep.est = P('est', 'station2', 41, 8, 0);
    K.rail([[21, 9], [22, 9], [22, 8]]);
    K.rail([[21, 8], [41, 8]]);
    K.rail([[23, 8], [23, 7], [30, 7], [30, 8]]);
    K.rail([[40, 8], [40, 9], [41, 9]]);
    K.sig(29, 8, 1); K.sig(24, 7, 3);
    K.road(36, 5, 36, 11); K.road(37, 5, 50, 5); K.road(44, 6, 44, 11);
    keep.coal = P('coal', 'coalmine', 37, 3, 0);
    keep.ore = P('ore', 'oremine', 46, 3, 0);
    keep.mdepot = P('mdepot', 'depot', 38, 6, 0);
    keep.plant2 = P('plant2', 'powerplant', 27, 13, 0);
    sd(keep.plant2, R.coal, 20);
    K.buy('truck', keep.mdepot, 4);
    K.buy('train', keep.wst, 1); K.buy('train', keep.est, 1);
    const p3 = []; for (let y = 7; y <= 12; y++) p3.push(K.T(18, y)); for (let x = 19; x <= 28; x++) p3.push(K.T(x, 12)); K.power(p3);
    K.trade(R.tools, 40, 0);
  
  },
  canal(S, K, keep, P, sd) {
    // Clayport: a brickmaking hamlet south of the canal, reached only by water
    K.canal(36, 36, 46, 36);
    K.lock(35, 36);
    K.road(36, 38, 50, 38); K.road(36, 39, 36, 41);
    keep.ewharf = P('ewharf', 'wharf', 44, 37, 0);
    keep.claypit = P('claypit', 'claypit', 38, 39, 0);
    keep.bricks = P('bricks', 'brickworks', 47, 39, 0);
    keep.sdepot = P('sdepot', 'depot', 40, 37, 0);
    keep.hmarket = P('hmarket', 'market', 42, 39, 0);
    for (const [x, y] of [[44, 39], [45, 39], [46, 39], [49, 39], [50, 39], [37, 41], [37, 40]]) K.place('house', x, y, 0);
    keep.etide = P('etide', 'tidemill', 35, 39, 0);
    keep.etide2 = P('etide2', 'tidemill', 35, 40, 0);
    const p4 = [K.T(36, 39), K.T(36, 38), K.T(36, 40), K.T(36, 41)]; for (let x = 37; x <= 50; x++) p4.push(K.T(x, 38)); K.power(p4);
    K.buy('truck', keep.sdepot, 2);
    K.buy('barge', keep.quay, 1); K.buy('barge', keep.ewharf, 1);
    sd(keep.hmarket, R.bread, 30);
    K.trade(R.furniture, 10, 0);
  
  },
};

/* Stages of the Tidemark city. */
const TM_STAGES = ['town', 'harbour', 'farbank', 'railway', 'canal'];
function buildTidemark(S, upto, opts) {
  opts = opts || {};
  const K = builder(S), R_ = R;
  const sd = (b, r, n) => { if (b) seedStock(S, b, r, n); };
  const skip = opts.skip || [];
  const P = (name, bt, x, y, rot) => skip.indexOf(name) >= 0 ? null : K.place(bt, x, y, rot);
  const has = s => TM_STAGES.indexOf(s) <= TM_STAGES.indexOf(upto);
  S.flags.inf = 1;
  const keep = {};
  // ---- stage 1: the old town on the west bank
  K.road(18, 13, 18, 41); K.road(4, 24, 30, 24); K.road(4, 41, 17, 41);
  K.road(4, 30, 17, 30); K.road(4, 36, 17, 36); K.road(6, 25, 6, 40); K.road(12, 25, 12, 40);
  K.road(19, 30, 30, 30); K.road(19, 36, 30, 36); K.road(24, 25, 24, 40); K.road(30, 25, 30, 35);
  K.road(4, 12, 18, 12);
  keep.lh = P('lh', 'lighthouse', 2, 45, 0);
  keep.farm = P('farm', 'farm', 5, 22, 0);
  keep.mill = P('mill', 'mill', 19, 23, 0);
  keep.bakery = P('bakery', 'bakery', 21, 23, 0);
  keep.market = P('market', 'market', 13, 25, 0);
  keep.market2 = P('market2', 'market', 25, 31, 0);
  keep.depot = P('depot', 'depot', 15, 23, 0);
  keep.tide = P('tide', 'tidemill', 9, 43, 0);
  keep.forester = P('forester', 'forester', 6, 13, 0);
  keep.forester2 = P('forester2', 'forester', 10, 11, 0);
  keep.sawmill = P('sawmill', 'sawmill', 12, 10, 0);
  keep.joinery = P('joinery', 'joinery', 15, 11, 0);
  if (!opts.noHouses) {
    const lim = opts.houses || 999;
    const a = fillHouses(S, K, 4, 25, 17, 40, Math.min(62, lim), (x, y) => (x === 9 && y > 31 && y < 35));
    const b = fillHouses(S, K, 19, 25, 31, 40, Math.min(44, Math.max(0, lim - a)));
    fillHouses(S, K, 7, 22, 14, 23, Math.min(6, Math.max(0, lim - a - b)));
  }
  // back gardens: a few trees inside the town blocks
  for (let y = 25; y <= 40; y++) for (let x = 4; x <= 31; x++) {
    const t = y * S.W + x; if (S.ter[t] !== T_LAND || S.bld[t] || S.road[t]) continue;
    let adj = false; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.road[n]) adj = true; }
    if (!adj && ((x * 5 + y * 3) % 4 === 0)) S.tree[t] = 1 + ((x + y) % 2);
  }
  const pw = [];
  for (let t = 0; t < S.W * S.H; t++) { const x = t % S.W, y = (t / S.W) | 0; if (S.road[t] && x <= 31 && y >= 10 && !isWater(S.ter[t])) pw.push(t); }
  pw.push(K.T(9, 42), K.T(9, 41), K.T(10, 41), K.T(8, 41));
  K.power(pw);
  K.buy('truck', keep.depot, 8);
  sd(keep.market, R_.bread, 30); sd(keep.market2, R_.bread, 30);
  sd(keep.mill, R_.grain, 8);
  for (const st of TM_STAGES.slice(1)) if (has(st)) TM_STAGE_FN[st](S, K, keep, P, sd);
  S.flags.inf = 0;
  S.keep = {}; for (const k in keep) if (keep[k]) S.keep[k] = keep[k].id;
  return K.fails;
}

/* Sandbox: procedural coast, empty land, a lighthouse. */
function buildSandbox(S, opts) {
  genTerrain(S, { coastAt: 0.74, estuary: opts.estuary !== false, estuaryX: Math.floor(S.W * 0.58), deposits: [] });
  const gen = makeGen(S.seed ^ 0xBEEF);
  const pick = (kind, tries) => { for (let i = 0; i < tries; i++) { const x = 4 + gen.int(S.W - 8), y = 3 + gen.int(Math.floor(S.H * 0.55)); if (S.ter[y * S.W + x] === T_LAND) { stamp(S, kind, x, y, 2, gen); return; } } };
  pick(D_COAL, 50); pick(D_COAL, 50); pick(D_ORE, 50); pick(D_ORE, 50); pick('forest', 50); pick('fertile', 50); pick('fertile', 50);
  for (let t = S.W * S.H - 1; t >= 0; t--) {
    if (S.ter[t] !== T_LAND) continue;
    let coast = false; for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.ter[n] === T_SEA) coast = true; }
    if (coast) { const r = placeBuilding(S, 'lighthouse', t % S.W, (t / S.W) | 0, 0, true); if (r.ok) break; }
  }
  S.money = opts.money || 25000; if (opts.inf) S.flags.inf = 1;
}

/* Apply one later stage to a running game as ordinary paid player actions
   (used by the campaign playthrough tests). Returns failures. */
function playStage(S, stage) {
  const K = builder(S, 0), keep = {};
  for (const k in (S.keep || {})) keep[k] = bById(S, S.keep[k]);
  for (const b of S.blds) { if (b.type === 'quay' && !keep.quay) keep.quay = b; }
  TM_STAGE_FN[stage](S, K, keep, (name, bt, x, y, rot) => K.place(bt, x, y, rot), () => {});
  for (const k in keep) if (keep[k]) S.keep[k] = keep[k].id;
  return K.fails;
}
