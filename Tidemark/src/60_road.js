/* =====================================================================
   Road vehicles. Lanes are (tile, heading); a lane holds at most two
   trucks, spaced by GAP. Junction tiles hold one truck and may only be
   entered when the exit lane has room ("keep the box clear"). Trucks
   leave the road into a yard queue at their destination, so queues for
   loading bays never deadlock the street.
   ===================================================================== */
const GAP = 96, LANE_CAP = 2, STOP = 192;

function truckTile(S, v) {
  if (v.st === 'depot' || v.st === 'yard' || v.st === 'bay') { const b = bById(S, v.at); return b ? bAcc(S, b) : -1; }
  return v.t;
}
function newTruck(S, depot) {
  const a = bAcc(S, depot);
  const v = { id: S.nv++, k: 'truck', home: depot.id, st: 'depot', t: a, hd: 1, p: 128, path: [], job: null, at: depot.id, tm: 0, cargo: [], own: zr(), ob: '', wt: 0, rr: 0, hold: 0 };
  S.vehs.push(v);
  return v;
}
function buildLanes(S) {
  const lanes = new Map(), tileN = new Map();
  for (const v of S.vehs) {
    if (v.k !== 'truck' || v.st !== 'go') continue;
    const key = v.t * 4 + v.hd;
    let L = lanes.get(key); if (!L) { L = []; lanes.set(key, L); }
    L.push({ v, p0: v.p });
    tileN.set(v.t, (tileN.get(v.t) || 0) + 1);
  }
  for (const L of lanes.values()) L.sort((a, b) => b.p0 - a.p0 || a.v.id - b.v.id);
  return { lanes, tileN, claims: new Map(), jclaim: new Set() };
}
function laneBlock(S, v, nx, nh, over, LX, force) {
  if (!S.road[nx]) return 'Road ahead removed';
  if (S._rsv && S._rsv[nx]) return 'Level crossing ' + xy(S, nx) + ' closed for Train #' + S._rsv[nx];
  if (force) return '';
  const jn = roadNet(S).jn, key = nx * 4 + nh, L2 = LX.lanes.get(key), cl = LX.claims.get(key);
  if (jn[nx]) {
    if ((LX.tileN.get(nx) || 0) > 0 || LX.jclaim.has(nx)) return 'Traffic: junction ' + xy(S, nx) + ' occupied';
    if (v.path.length >= 2) {
      const ex = v.path[1], eh = dirTo(S, nx, ex), L3 = LX.lanes.get(ex * 4 + eh);
      if (L3 && (L3.length >= LANE_CAP || L3[L3.length - 1].p0 < GAP)) return 'Traffic: keeping junction ' + xy(S, nx) + ' clear';
    }
    return '';
  }
  const n = (L2 ? L2.length : 0) + (cl !== undefined ? 1 : 0);
  if (n >= LANE_CAP) return 'Traffic: queue at ' + xy(S, nx);
  if (L2 && L2.length && L2[L2.length - 1].p0 - over < GAP) return 'Traffic: close behind the vehicle ahead';
  if (cl !== undefined && cl - over < GAP) return 'Traffic: merging';
  return '';
}
/* Can a truck join lane (t, hd) mid-tile at p=128 (leaving a bay or depot)? */
function laneJoinOk(S, t, hd, LX) {
  if (!S.road[t]) return false;
  if (S._rsv && S._rsv[t]) return false;
  const jn = roadNet(S).jn;
  if (jn[t] && ((LX.tileN.get(t) || 0) > 0 || LX.jclaim.has(t))) return false;
  const key = t * 4 + hd, L = LX.lanes.get(key), cl = LX.claims.get(key);
  const n = (L ? L.length : 0) + (cl !== undefined ? 1 : 0);
  if (n >= LANE_CAP) return false;
  if (L) for (const e of L) if (Math.abs(e.p0 - 128) < GAP) return false;
  if (cl !== undefined && Math.abs(cl - 128) < GAP) return false;
  return true;
}
function joinLane(S, v, t, path, LX) {
  const hd = path.length ? dirTo(S, t, path[0]) : v.hd;
  if (!laneJoinOk(S, t, hd, LX)) return false;
  const key = t * 4 + hd; LX.claims.set(key, Math.min(LX.claims.has(key) ? LX.claims.get(key) : 999, 128));
  if (roadNet(S).jn[t]) LX.jclaim.add(t);
  v.st = 'go'; v.t = t; v.hd = hd; v.p = 128; v.path = path; v.wt = 0;
  return true;
}

function stepTrucks(S) {
  const LX = buildLanes(S);
  for (const v of S.vehs) {
    if (v.k !== 'truck') continue;
    v._adv = 0;
    if (v.st === 'go') moveTruck(S, v, LX);
    else if (v.st === 'depot') { if (v.job) truckLeave(S, v, LX); }
    else if (v.st === 'bay') { if (v.tm > 0) v.tm--; else truckBayDone(S, v, LX); }
    else if (v.st === 'hold') { if (S.tick >= v.hold) truckResume(S, v, LX); }
    else if (v.st === 'stranded') { if (S.tick % 20 === v.id % 20) truckUnstrand(S, v, LX); }
  }
  // yards feed loading bays
  for (const b of S.blds) {
    if (!b.yard || !b.yard.length) continue;
    const cap = BT[b.type].bays || 1;
    while (b.bays.length < cap && b.yard.length) {
      const v = vById(S, b.yard.shift()); if (!v || v.st !== 'yard') continue;
      b.bays.push(v.id); v.st = 'bay'; v.bd = 0;
      const c = v.job ? cById(S, v.job.c) : null;
      v.tm = Math.floor((6 + 2 * (c ? c.q : 0)) * 100 / handleMul(b));
      v.ob = v.job && v.job.ph === 'pk' ? 'Loading at ' + BT[b.type].name : 'Unloading at ' + BT[b.type].name;
    }
  }
}
function moveTruck(S, v, LX) {
  const spd = Math.max(4, Math.floor(VT.truck.spd * WX_SPD[S.wx.k][0] / 100));
  const L = LX.lanes.get(v.t * 4 + v.hd);
  let i = 0; while (L && i < L.length && L[i].v !== v) i++;
  let lim = 100000;
  if (L && i > 0) lim = L[i - 1].p0 - GAP;
  if (v.path.length === 0) lim = Math.min(lim, 128);
  let np = Math.min(v.p + spd, lim); if (np < v.p) np = v.p;
  const p0 = v.p, t0 = v.t;
  if (np >= 256) {
    const nx = v.path[0], nh = dirTo(S, v.t, nx), over = np - 256;
    const force = v.wt > 1200;               // last resort against gridlock
    const why = nh < 0 ? 'Path broken' : laneBlock(S, v, nx, nh, over, LX, force);
    if (!why) {
      const key = nx * 4 + nh; LX.claims.set(key, Math.min(LX.claims.has(key) ? LX.claims.get(key) : 999, over));
      if (roadNet(S).jn[nx]) LX.jclaim.add(nx);
      v.t = nx; v.hd = nh; v.p = over; v.path.shift(); v.ob = '';
      if (force) { v.ob = ''; v.wt = 0; dec(S, 8, v.id, nx, 99); }
    } else { v.p = 255; v.ob = why; }
  } else { v.p = np; if (L && i > 0 && np === lim) v.ob = 'Traffic: queueing behind Truck #' + L[i - 1].v.id; }
  v._adv = (v.t !== t0 ? 256 : 0) + v.p - p0;
  if (v.path.length === 0 && v.p >= 128 && v.st === 'go') { truckArrive(S, v); return; }
  if (v.p === p0 && v.t === t0) v.wt++; else v.wt = 0;
  if (v.wt > 150 && v.path.length > 1 && S.tick - v.rr > 300 && v.ob.indexOf('Traffic') === 0) truckDetour(S, v);
}
function truckDetour(S, v) {
  v.rr = S.tick;
  const goal = v.path[v.path.length - 1];
  const alt = roadPath(S, v.t, goal, v.path[0]);
  if (alt && alt.length <= v.path.length + 10) { v.path = alt; v.wt = 0; v.ob = 'Detouring around congestion'; dec(S, 8, v.id, goal, alt.length); }
}
function jobTile(S, v) {
  if (v.job) { const b = bById(S, v.job.tgt); return b ? bAcc(S, b) : -1; }
  const d = bById(S, v.home); return d ? bAcc(S, d) : -1;
}
function truckArrive(S, v) {
  const j = v.job;
  if (!j) {
    const d = bById(S, v.home);
    if (d && bAcc(S, d) === v.t) { v.st = 'depot'; v.at = d.id; v.path = []; v.ob = ''; return; }
    truckGoHome(S, v); return;
  }
  const b = bById(S, j.tgt);
  if (!b || bAcc(S, b) !== v.t) { truckReplan(S, v); return; }
  v.st = 'yard'; v.at = b.id; v.path = []; b.yard.push(v.id);
  v.ob = 'Waiting for a loading bay at ' + BT[b.type].name + ' #' + b.id;
}
function truckLeave(S, v, LX) {           // depot exit with a job
  const d = bById(S, v.at), a = d ? bAcc(S, d) : -1;
  if (a < 0) { v.ob = 'Depot has no road access'; return; }
  const tt = jobTile(S, v);
  if (tt === a) { const b = bById(S, v.job.tgt); v.st = 'yard'; v.at = b.id; b.yard.push(v.id); return; }
  const path = tt >= 0 ? roadPath(S, a, tt) : null;
  if (!path) { truckDropJob(S, v, 'no road from depot to pickup'); return; }
  if (!joinLane(S, v, a, path, LX)) v.ob = 'Waiting to pull out of the depot';
  else v.ob = '';
}
function truckDropJob(S, v, why) {
  if (v.job) { const c = cById(S, v.job.c); if (c && c.veh === v.id && !v.cargo.length) { c.veh = 0; c.ob = 'Truck #' + v.id + ': ' + why; } }
  if (!v.cargo.length) v.job = null;
  v.ob = why;
}
function truckBayDone(S, v, LX) {
  const b = bById(S, v.at);
  if (!b) { v.st = 'hold'; v.hold = S.tick; return; }
  if (!v.bd) {
    v.bd = 1;
    const j = v.job;
    if (j) {
      const c = cById(S, j.c);
      if (j.ph === 'pk') {
        if (c && c.veh === v.id && c.at === b.id && (c.st === 'wait' || c.st === 'xfer')) { loadCon(S, c, b, v, 'Truck'); j.ph = 'dl'; j.tgt = c.legs[c.li][2]; }
        else v.job = null;
      } else { if (c) unloadAt(S, c, b, v, j.ph === 'div'); v.job = null; }
    }
  }
  const leave = () => { const k = b.bays.indexOf(v.id); if (k >= 0) b.bays.splice(k, 1); };
  const a = bAcc(S, b), tt = jobTile(S, v);
  if (tt === a && a >= 0) {     // next stop shares this entrance
    leave();
    if (v.job) { const nb2 = bById(S, v.job.tgt); v.st = 'yard'; v.at = nb2.id; nb2.yard.push(v.id); }
    else { v.st = 'depot'; v.at = v.home; v.ob = ''; }
    return;
  }
  const path = (a >= 0 && tt >= 0) ? roadPath(S, a, tt) : null;
  if (!path) {
    leave();
    v.st = 'hold'; v.t = a >= 0 ? a : b.y * S.W + b.x; v.hold = S.tick + 30; v.path = [];
    if (v.job) truckReplanStatic(S, v); else truckGoHomeStatic(S, v);
    return;
  }
  if (joinLane(S, v, a, path, LX)) { leave(); v.ob = ''; }
  else v.ob = 'Waiting to pull out into traffic';
}
function loadCon(S, c, b, v, label) {
  if (c.st === 'wait') { if (BT[b.type].out) b.out[c.r] -= c.q; else b.inv[c.r] -= c.q; b.rsv[c.r] -= c.q; }
  else if (b.tr) { const k = b.tr.indexOf(c.id); if (k >= 0) b.tr.splice(k, 1); }
  c.st = 'ride'; c.at = 0; c.veh = v.id; v.cargo.push(c.id);
  c.log.push([S.tick, 'loaded onto ' + label + ' #' + v.id + ' at ' + BT[b.type].name + ' #' + b.id]);
}
/* Unload consignment c from vehicle v into building b. */
function unloadAt(S, c, b, v, div) {
  const k = v.cargo.indexOf(c.id); if (k >= 0) v.cargo.splice(k, 1);
  c.veh = 0;
  if (div) { c.st = 'xfer'; c.at = b.id; if (b.tr) b.tr.push(c.id); dissolveInto(S, c, b, 'route lost'); return; }
  if (b.id === c.d) { c.st = 'xfer'; c.at = b.id; deliverCon(S, c, b); return; }
  if (b.tr) {
    c.st = 'xfer'; c.at = b.id; c.li++; b.tr.push(c.id);
    c.log.push([S.tick, 'transferred at ' + BT[b.type].name + ' #' + b.id]);
    const L = c.legs[c.li];
    if (!L || L[1] !== b.id || !legStillValid(S, L)) replanAt(S, c, b, 'onward leg unavailable');
    return;
  }
  // a non-yard building that is not the destination: keep as owned stock if it stores goods
  if (BT[b.type].store) { b.inv[c.r] += c.q; c.log.push([S.tick, 'stored at ' + BT[b.type].name]); closeCon(S, c, 'diverted'); return; }
  b.inv[c.r] += c.q; closeCon(S, c, 'diverted');
}
function nearestStorage(S, tile, q, exclude) {
  refreshBookings(S);
  const rc = rcOf(S, tile); let best = null, bd = 0;
  for (const b of S.blds) {
    if (!BT[b.type].store || (exclude && b.id === exclude)) continue;
    const a = bAcc(S, b); if (a < 0 || rcOf(S, a) !== rc) continue;
    if (BT[b.type].cap - storeUsed(S, b) - (b._book || 0) < q) continue;
    const d = roadDist(S, a)[tile]; if (d < 0) continue;
    if (!best || d < bd) { best = b; bd = d; }
  }
  return best;
}
/* Re-plan a loaded or assigned truck from tile v.t; path stays empty when
   the truck is off-lane (hold) and will be computed on resume. */
function truckReplanStatic(S, v) {
  const tile = v.t, j = v.job; if (!j) return truckGoHomeStatic(S, v);
  const c = cById(S, j.c);
  if (j.ph === 'pk') {
    const b = bById(S, j.tgt), a = b ? bAcc(S, b) : -1;
    if (c && c.veh === v.id && a >= 0 && roadDist(S, a)[tile] >= 0) return true;
    truckDropJob(S, v, 'cannot reach pickup'); v.job = null; return truckGoHomeStatic(S, v);
  }
  if (!c) { v.job = null; return truckGoHomeStatic(S, v); }
  const b = bById(S, j.tgt), a = b ? bAcc(S, b) : -1;
  if (j.ph === 'dl' && a >= 0 && roadDist(S, a)[tile] >= 0) return true;
  if (j.ph === 'div' && a >= 0 && roadDist(S, a)[tile] >= 0) return true;
  const dest = bById(S, c.d);
  if (dest) {
    const rt = routeTable(S, dest, 0), rr = rt ? routeFrom(S, rt, null, tile) : null;
    if (rr) {
      c.legs = rr.legs; c.li = 0; v.job = { c: c.id, ph: 'dl', tgt: rr.legs[0][2] };
      c.log.push([S.tick, 're-routed while on Truck #' + v.id + ' via ' + rr.legs.map(L => LEG_LABEL[L[0]]).join(' > ')]);
      dec(S, 8, v.id, c.id, rr.legs.length); return true;
    }
  }
  const st = nearestStorage(S, tile, c.q);
  if (st) { v.job = { c: c.id, ph: 'div', tgt: st.id }; c.log.push([S.tick, 'destination unreachable; diverting to ' + BT[st.type].name + ' #' + st.id]); dec(S, 9, c.id, st.id, v.id); return true; }
  v.ob = 'Holding cargo: no route to destination and no reachable storage with room';
  c.ob = v.ob;
  return false;
}
function truckGoHomeStatic(S, v) {
  v.job = null;
  const tile = v.t, rc = rcOf(S, tile);
  let d = bById(S, v.home);
  if (!d || bAcc(S, d) < 0 || rcOf(S, bAcc(S, d)) !== rc) {
    d = null; let bd = 0;
    for (const b of S.blds) if (b.type === 'depot') { const a = bAcc(S, b); if (a < 0 || rcOf(S, a) !== rc) continue; const dd = roadDist(S, a)[tile]; if (dd >= 0 && (!d || dd < bd)) { d = b; bd = dd; } }
    if (d) v.home = d.id;
  }
  if (!d) { v.ob = 'No depot reachable: parked'; return false; }
  return true;
}
function truckReplan(S, v) {            // on lane, path broken or target moved
  const ok = v.job ? truckReplanStatic(S, v) : truckGoHomeStatic(S, v);
  const tt = jobTile(S, v);
  const path = ok && tt >= 0 ? roadPath(S, v.t, tt) : null;
  if (path) { v.path = path; if (!path.length && v.p >= 128) truckArrive(S, v); return; }
  v.st = 'hold'; v.path = []; v.hold = S.tick + 60;
}
function truckGoHome(S, v) { v.job = null; truckReplan(S, v); }
function truckResume(S, v, LX) {
  if (!S.road[v.t]) { v.st = 'stranded'; return; }
  const ok = v.job ? truckReplanStatic(S, v) : truckGoHomeStatic(S, v);
  const tt = jobTile(S, v);
  if (!ok || tt < 0) { v.hold = S.tick + 60; return; }
  if (tt === v.t) {
    if (v.job) { const b = bById(S, v.job.tgt); v.st = 'yard'; v.at = b.id; b.yard.push(v.id); }
    else { v.st = 'depot'; v.at = v.home; }
    return;
  }
  const path = roadPath(S, v.t, tt);
  if (!path) { v.hold = S.tick + 60; return; }
  if (!joinLane(S, v, v.t, path, LX)) v.hold = S.tick + 5;
}
function truckUnstrand(S, v, LX) {
  let t = v.t;
  if (!S.road[t]) { for (let d = 0; d < 4; d++) { const n = nb(S, t, d); if (n >= 0 && S.road[n] && !isWater(S.ter[n])) { t = n; break; } } }
  if (!S.road[t]) { v.ob = 'Stranded: the road under this truck was removed'; return; }
  v.t = t; v.st = 'hold'; v.hold = S.tick; v.ob = 'Back on the road network';
  truckResume(S, v, LX);
}

/* Roads were removed under trucks: wreck on bridges, strand on land. */
function roadRemoved(S, tiles, rep) {
  for (const v of S.vehs.slice()) {
    if (v.k !== 'truck' || (v.st !== 'go' && v.st !== 'hold' && v.st !== 'stranded')) continue;
    if (tiles.indexOf(v.t) < 0) continue;
    if (isWater(S.ter[v.t])) wreckVehicle(S, v, 'Road bridge ' + xy(S, v.t) + ' demolished under Truck #' + v.id, rep);
    else { v.st = 'stranded'; v.path = []; v.ob = 'Stranded: the road under this truck was removed'; dec(S, 17, v.id, v.t, 0); rep.push('Truck #' + v.id + ' stranded at ' + xy(S, v.t)); }
  }
}

function wreckVehicle(S, v, why, rep) {
  const at = v.k === 'train' ? v.tiles[0] : v.t;
  let lost = 0;
  for (const cid of v.cargo.slice()) {
    const c = cById(S, cid); if (!c) continue;
    loseUnits(S, c.r, c.q, why, at, v.id, c.id); lost += c.q;
    c.veh = 0; c.log.push([S.tick, 'lost: ' + why]); closeCon(S, c, 'lost');
  }
  for (let r = 0; r < NR; r++) if (v.own[r] > 0) { loseUnits(S, r, v.own[r], why, at, v.id, 0); lost += v.own[r]; v.own[r] = 0; }
  // consignments that were only assigned to this vehicle go back to the pool
  for (const c of S.cons) if (c.veh === v.id) { c.veh = 0; c.ob = VT[v.k].name + ' #' + v.id + ' was destroyed'; }
  v.cargo = [];
  if (v.k === 'train' && S._rsv) { for (const t of v.tiles) if (S._rsv[t] === v.id) S._rsv[t] = 0; for (let i = 0; i < v.rn; i++) if (S._rsv[v.path[i]] === v.id) S._rsv[v.path[i]] = 0; }
  const i = S.vehs.indexOf(v); if (i >= 0) S.vehs.splice(i, 1);
  v.dead = 1;
  S.wrecks.push({ k: v.k, t: at, tick: S.tick, id: v.id, lost }); if (S.wrecks.length > 30) S.wrecks.shift();
  dec(S, 11, v.id, at, lost);
  rep.push(VT[v.k].name + ' #' + v.id + ' destroyed: ' + why + (lost ? ' (' + lost + ' units of cargo lost)' : ' (empty)'));
}
