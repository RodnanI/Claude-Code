/* =====================================================================
   Boats, berths and tidal locks.
   Lock rules: one boat in the chamber. Gates open only when the chamber
   level matches that side (canal fixed at 100, sea follows the tide).
   The lock serves the side whose gate is open first (no wasted cycle),
   unless the other side's head boat has waited over MAXW ticks after two
   consecutive same-side passages. An empty side with boats waiting on
   the far side triggers an empty turnaround. Near high water, when the
   sea is within LEVEL_TOL of the canal, both gates stand open and boats
   pass freely one at a time.
   ===================================================================== */
const GATE_T = 12, FILL = 2, MAXW = 300, BOAT_GAP = 128, TIDE_BERTH = 45;

function boatBusyBerths(S, dock, except) {
  const s = new Set();
  for (const v of S.vehs) {
    if ((v.k !== 'barge' && v.k !== 'freighter') || v.id === except) continue;
    if (v.at === dock.id && (v.st === 'moor' || v.st === 'load' || v.st === 'unload')) s.add(v.t);
    if (v.bt >= 0 && v.st === 'go') s.add(v.bt);
  }
  return s;
}
function newBarge(S, dock) {
  const busy = boatBusyBerths(S, dock, 0);
  for (const t of berths(S, dock, 'barge')) {
    if (busy.has(t)) continue;
    const v = { id: S.nv++, k: 'barge', st: 'moor', t, hd: 0, p: 128, path: [], job: null, at: dock.id, bt: -1, tm: 0, cargo: [], own: zr(), load: [], ob: '', wt: 0, qT: 0, hold: 0 };
    S.vehs.push(v); return v;
  }
  return null;
}
function spawnFreighter(S, q, own) {
  const v = { id: S.nv++, k: 'freighter', st: 'go', t: S.gate, hd: 0, p: 128, path: [], job: { q: q.id, ph: 'in' }, at: 0, bt: -1, tm: 0, cargo: [], own, ret: zr(), ob: '', wt: 0, qT: 0, hold: 0, wait: 0 };
  S.vehs.push(v);
  dec(S, 12, v.id, q.id, sumArr(own));
  boatPlanDock(S, v, q);
  return v;
}
/* Choose a free berth at dock and plan a path to it. */
function boatPlanDock(S, v, dock) {
  const kind = v.k === 'freighter' ? 'freighter' : 'barge';
  const bs = berths(S, dock, kind); if (!bs.length) return false;
  const busy = boatBusyBerths(S, dock, v.id);
  let goal = bs.filter(t => !busy.has(t));
  const queued = !goal.length; if (queued) goal = bs.slice();
  if (goal.indexOf(v.t) >= 0 && !queued) { v.path = []; v.bt = v.t; return true; }
  const r = waterSearch(S, v.t, new Set(goal), kind, 60000);
  if (!r) return false;
  v.path = r.path; v.bt = queued ? -1 : (r.path.length ? r.path[r.path.length - 1] : v.t);
  return true;
}
function boatLanes(S) {
  const lanes = new Map();
  for (const v of S.vehs) {
    if ((v.k !== 'barge' && v.k !== 'freighter') || v.st !== 'go' || S.ter[v.t] !== T_CANAL) continue;
    const key = v.t * 4 + v.hd; let L = lanes.get(key); if (!L) { L = []; lanes.set(key, L); } L.push({ v, p0: v.p });
  }
  for (const L of lanes.values()) L.sort((a, b) => b.p0 - a.p0 || a.v.id - b.v.id);
  return { lanes, claims: new Map() };
}
function lockSideOf(S, lk, t) { return dirTo(S, lk.t, t) === lk.up ? 0 : 1; }
function lockRequest(S, lk, v) {
  const side = lockSideOf(S, lk, v.t);
  if (lk.pass !== v.id && lk.q[side].indexOf(v.id) < 0) { lk.q[side].push(v.id); v.qT = S.tick; }
}
function lockExitOk(S, lk, v) {
  if (lk.ph === 'free') return true;
  const nx = v.path[0]; if (nx === undefined) return false;
  return lk.ph === 'open' && lk.g === lockSideOf(S, lk, nx);
}
function lockWhy(S, lk, v) {
  const side = lockSideOf(S, lk, v.t), pos = lk.q[side].indexOf(v.id) + 1;
  const lvl = lk.ph === 'level' ? (lk.tgt === 0 ? 'filling' : 'draining') + ' (chamber ' + lk.lvl + ', target ' + (lk.tgt === 0 ? CANAL_LVL : tideAt(S.tick)) + ')' : lk.ph;
  return 'Queued at lock #' + lk.id + ' (' + (side === 0 ? 'canal' : 'sea') + ' side, position ' + pos + ' of ' + lk.q[side].length + '); lock ' + lvl;
}
function stepLocks(S) {
  const sea = tideAt(S.tick), lv = s => s === 0 ? CANAL_LVL : sea;
  const levelNow = Math.abs(CANAL_LVL - sea) <= LEVEL_TOL;
  for (const lk of S.locks) {
    for (let s = 0; s < 2; s++) lk.q[s] = lk.q[s].filter(id => {
      const v = vById(S, id); return v && v.st === 'go' && v.path[0] === lk.t && dirTo(S, lk.t, v.t) >= 0 && lockSideOf(S, lk, v.t) === s;
    });
    if (lk.occ) { const v = vById(S, lk.occ); if (!v || (v.t !== lk.t && v.path[0] !== lk.t)) { lk.occ = 0; lk.pass = 0; } }
    const admit = (v) => {
      const s = lockSideOf(S, lk, v.t), k = lk.q[s].indexOf(v.id); if (k >= 0) lk.q[s].splice(k, 1);
      lk.pass = v.id; lk.occ = v.id; lk.served++; dec(S, 6, lk.id, v.id, s);
    };
    switch (lk.ph) {
      case 'free': {
        lk.lvl = sea;
        if (!levelNow && !lk.occ) { lk.ph = 'open'; lk.g = lk.q[0].length > lk.q[1].length ? 0 : 1; lk.lvl = lv(lk.g); lk.served = 0; break; }
        if (!lk.occ) {
          const va = lk.q[0].length ? vById(S, lk.q[0][0]) : null, vb = lk.q[1].length ? vById(S, lk.q[1][0]) : null;
          const pick = va && vb ? (va.qT <= vb.qT ? va : vb) : (va || vb);
          if (pick) admit(pick);
        }
        break;
      }
      case 'open': {
        lk.lvl = lv(lk.g);
        if (lk.occ) {
          const v = vById(S, lk.occ);
          if (v && v.t === lk.t && v.p >= 128) {
            const ex = v.path.length ? lockSideOf(S, lk, v.path[0]) : -1;
            if (ex >= 0 && ex !== lk.g) { lk.ph = 'closing'; lk.tm = GATE_T; lk.tgt = ex; dec(S, 7, lk.id, lk.tgt, 1); }
          }
          break;
        }
        if (levelNow) { lk.ph = 'free'; break; }
        const hg = lk.q[lk.g][0], ho = lk.q[1 - lk.g][0];
        const vo = ho ? vById(S, ho) : null;
        const starve = vo && S.tick - vo.qT > MAXW && lk.served >= 2;
        if (hg && !starve) admit(vById(S, hg));
        else if (ho) { lk.ph = 'closing'; lk.tm = GATE_T; lk.tgt = 1 - lk.g; lk.served = 0; lk.empty++; dec(S, 7, lk.id, lk.tgt, 0); }
        break;
      }
      case 'closing': if (--lk.tm <= 0) lk.ph = 'level'; break;
      case 'level': {
        const tg = lv(lk.tgt);
        if (Math.abs(lk.lvl - tg) <= FILL) { lk.lvl = tg; lk.ph = 'opening'; lk.tm = GATE_T; }
        else lk.lvl += lk.lvl < tg ? FILL : -FILL;
        break;
      }
      case 'opening': if (--lk.tm <= 0) { lk.ph = 'open'; lk.g = lk.tgt; lk.cycles++; lk.served = 0; } break;
    }
  }
}

function stepBoats(S) {
  const LX = boatLanes(S);
  for (const v of S.vehs) {
    if (v.k !== 'barge' && v.k !== 'freighter') continue;
    v._adv = 0;
    if (v.st === 'go') moveBoat(S, v, LX);
    else if (v.st === 'load' || v.st === 'unload') { if (--v.tm <= 0) boatTimerDone(S, v); }
    else if (v.st === 'moor') { if (v.job && v.k === 'barge') boatDepart(S, v, LX); }
    else if (v.st === 'hold') { if (S.tick >= v.hold) boatResume(S, v); }
  }
}
function moveBoat(S, v, LX) {
  const base = v.k === 'freighter' ? VT.freighter.spd : (S.ter[v.t] === T_SEA ? 20 : VT.barge.spd);
  let spd = Math.max(3, Math.floor(base * WX_SPD[S.wx.k][1] / 100));
  const p0 = v.p, t0 = v.t;
  if (v.k === 'freighter' && S.wx.k === W_STORM && S.ter[v.t] === T_SEA && !(v.job && v.job.ph === 'out' && v.t === S.gate)) { spd = 0; v.ob = 'Riding out the storm'; }
  let lim = 100000;
  if (S.ter[v.t] === T_CANAL) { const L = LX.lanes.get(v.t * 4 + v.hd); if (L) { let i = 0; while (i < L.length && L[i].v !== v) i++; if (i > 0 && i < L.length) lim = L[i - 1].p0 - BOAT_GAP; } }
  if (!v.path.length) lim = Math.min(lim, 128);
  if (S.ter[v.t] === T_LOCK) { const lk = lockAt(S, v.t); if (!lk || !lockExitOk(S, lk, v)) { lim = Math.min(lim, 128); if (lk && v.p >= 128) v.ob = 'In lock #' + lk.id + ': ' + (lk.ph === 'level' ? (lk.tgt === 0 ? 'filling' : 'draining') + ' ' + lk.lvl + ' to ' + (lk.tgt === 0 ? CANAL_LVL : tideAt(S.tick)) : 'gates ' + lk.ph); } }
  let np = Math.min(v.p + spd, lim); if (np < v.p) np = v.p;
  if (np >= 256) {
    const nx = v.path[0], nh = dirTo(S, v.t, nx), over = np - 256;
    let why = '';
    if (nh < 0 || !waterPass(S, v.t, nx, v.k)) why = 'Channel ahead closed';
    else if (S.ter[nx] === T_LOCK) { const lk = lockAt(S, nx); if (!lk) why = 'Lock missing'; else if (lk.pass !== v.id) { lockRequest(S, lk, v); why = lockWhy(S, lk, v); } }
    else if (S.ter[nx] === T_CANAL) {
      const key = nx * 4 + nh, L2 = LX.lanes.get(key), cl = LX.claims.get(key);
      if ((L2 && L2.length) || cl !== undefined) {
        if (cl !== undefined || L2.length >= 1 && L2[L2.length - 1].p0 - over < BOAT_GAP) why = 'Canal traffic ahead at ' + xy(S, nx);
      }
    }
    if (!why && v.k === 'freighter' && v.path.length === 1 && v.job && v.job.ph === 'in' && tideAt(S.tick) < TIDE_BERTH) why = 'Waiting for the tide: water ' + tideAt(S.tick) + ', berth needs ' + TIDE_BERTH;
    if (!why) {
      if (S.ter[v.t] === T_LOCK) {
        const lk = lockAt(S, v.t); if (lk && lk.occ === v.id) { lk.occ = 0; lk.pass = 0; }
        S.stats.lockUnits = (S.stats.lockUnits || 0) + cargoUnits(S, v); S.stats.lockPass = (S.stats.lockPass || 0) + 1;
      }
      if (S.ter[nx] === T_CANAL) LX.claims.set(nx * 4 + nh, over);
      v.t = nx; v.hd = nh; v.p = over; v.path.shift(); v.ob = '';
    } else { v.p = 255; v.ob = why; }
  } else v.p = np;
  v._adv = (v.t !== t0 ? 256 : 0) + v.p - p0;
  if (v.p === p0 && v.t === t0) v.wt++; else v.wt = 0;
  if (!v.path.length && v.p >= 128) boatArrive(S, v);
}
function boatArrive(S, v) {
  if (v.k === 'freighter') {
    if (v.job.ph === 'out') { if (v.t === S.gate) freighterLeave(S, v); else freighterOut(S, v); return; }
    const q = bById(S, v.job.q);
    if (!q) { freighterOut(S, v); return; }
    if (berths(S, q, 'freighter').indexOf(v.t) < 0 || boatBusyBerths(S, q, v.id).has(v.t)) { if (!boatPlanDock(S, v, q)) { v.st = 'hold'; v.hold = S.tick + 60; } else if (!v.path.length) { v.st = 'hold'; v.hold = S.tick + 30; v.ob = 'Waiting for a free berth'; } return; }
    v.st = 'unload'; v.at = q.id; v.bt = -1; v.tm = Math.floor((20 + Math.floor(sumArr(v.own) / 2)) * 100 / handleMul(q)); v.ob = 'Unloading imports at the quay';
    dec(S, 20, v.id, q.id, v.t);
    return;
  }
  const j = v.job;
  const dock = j ? bById(S, j.ph === 'toA' ? j.a : j.b) : null;
  if (!dock) { if (j) boatJobFail(S, v, 'target dock gone'); else { v.st = 'hold'; v.hold = S.tick + 100; } return; }
  if (berths(S, dock, 'barge').indexOf(v.t) < 0 || boatBusyBerths(S, dock, v.id).has(v.t)) {
    if (!boatPlanDock(S, v, dock)) boatJobFail(S, v, 'no berth reachable at ' + BT[dock.type].name);
    else if (!v.path.length) { v.st = 'hold'; v.hold = S.tick + 20; v.ob = 'Waiting for a free berth'; }
    return;
  }
  v.at = dock.id; v.bt = -1;
  if (j.ph === 'toA') bargeBeginLoad(S, v, dock);
  else if (j.ph === 'toB' || j.ph === 'div') { v.st = 'unload'; v.tm = Math.floor((12 + 2 * cargoUnits(S, v)) * 100 / handleMul(dock)); v.ob = 'Unloading at ' + BT[dock.type].name + ' #' + dock.id; }
  else { v.job = null; v.st = 'moor'; v.ob = ''; }
  dec(S, 20, v.id, dock.id, v.t);
}
function bargeBeginLoad(S, v, dock) {
  const list = []; let room = VT.barge.cap - cargoUnits(S, v), units = 0;
  for (const cid of dock.tr) {
    const c = cById(S, cid); if (!c || c.st !== 'xfer') continue;
    const L = c.legs[c.li]; if (!L || L[0] !== 'water' || L[1] !== dock.id || L[2] !== v.job.b) continue;
    if (c.veh && c.veh !== v.id) continue;
    if (c.q > room) continue;
    list.push(c.id); c.veh = v.id; room -= c.q; units += c.q;
  }
  for (const c of S.cons) if (c.veh === v.id && c.st !== 'ride' && list.indexOf(c.id) < 0) c.veh = 0;
  v.load = list; v.st = 'load'; v.tm = Math.floor((12 + 2 * units) * 100 / handleMul(dock)); v.ob = 'Loading ' + units + ' units at ' + BT[dock.type].name + ' #' + dock.id;
}
function boatTimerDone(S, v) {
  if (v.k === 'freighter') { freighterTimer(S, v); return; }
  const dock = bById(S, v.at);
  if (v.st === 'load') {
    if (dock) for (const cid of v.load) { const c = cById(S, cid); if (c && c.st === 'xfer' && c.at === dock.id && c.veh === v.id) loadCon(S, c, dock, v, 'Barge'); }
    v.load = [];
    if (!v.cargo.length) { v.job = null; v.st = 'moor'; v.ob = 'Nothing to carry'; return; }
    v.job.ph = 'toB'; v.st = 'moor';           // departs on the next tick
    return;
  }
  if (!dock) { boatJobFail(S, v, 'dock vanished during unloading'); return; }
  for (const cid of v.cargo.slice()) {
    const c = cById(S, cid); if (!c) { v.cargo.splice(v.cargo.indexOf(cid), 1); continue; }
    const L = c.legs[c.li];
    if (c.d === dock.id || (L && L[0] === 'water' && L[2] === dock.id)) unloadAt(S, c, dock, v, false);
    else { v.cargo.splice(v.cargo.indexOf(cid), 1); c.veh = 0; c.st = 'xfer'; c.at = dock.id; dock.tr.push(c.id); c.log.push([S.tick, 'unloaded off-route at ' + BT[dock.type].name + ' #' + dock.id]); replanAt(S, c, dock, 'barge diverted'); }
  }
  v.job = null; v.st = 'moor'; v.ob = '';
}
function boatDepart(S, v, LX) {
  const j = v.job;
  const dock = bById(S, j.ph === 'toA' ? j.a : j.b);
  if (!dock) { boatJobFail(S, v, 'target dock gone'); return; }
  if (dock.id === v.at && j.ph === 'toA') { bargeBeginLoad(S, v, dock); return; }
  const t0 = v.t;
  if (!boatPlanDock(S, v, dock)) { boatJobFail(S, v, 'no water route to ' + BT[dock.type].name + ' #' + dock.id); return; }
  if (!v.path.length) { boatArrive(S, v); return; }
  if (S.ter[t0] === T_CANAL) {
    const hd = dirTo(S, t0, v.path[0]), key = t0 * 4 + hd, L = LX.lanes.get(key);
    if ((L && L.some(e => Math.abs(e.p0 - 128) < BOAT_GAP)) || LX.claims.has(key)) { v.ob = 'Waiting to cast off'; v.path = []; v.bt = -1; return; }
    LX.claims.set(key, 128); v.hd = hd;
  } else v.hd = dirTo(S, t0, v.path[0]);
  v.st = 'go'; v.at = 0; v.p = 128; v.ob = '';
}
function boatResume(S, v) {
  if (v.k === 'freighter') {
    const q = bById(S, v.job.q);
    if (v.job.ph === 'out' || !q) { freighterOut(S, v); return; }
    if (boatPlanDock(S, v, q)) { v.st = 'go'; if (!v.path.length) boatArrive(S, v); }
    else { v.hold = S.tick + 60; v.ob = 'No channel from open sea to the quay'; }
    return;
  }
  if (!v.job) { v.st = 'moor'; return; }
  const dock = bById(S, v.job.ph === 'toA' ? v.job.a : v.job.b);
  if (dock && boatPlanDock(S, v, dock)) { v.st = 'go'; if (!v.path.length) boatArrive(S, v); return; }
  boatJobFail(S, v, 'no water route');
}
function nearestDockRoute(S, v) {
  let best = null;
  for (const d of S.blds) {
    if (BT[d.type].node !== 'water') continue;
    const busy = boatBusyBerths(S, d, v.id), goal = berths(S, d, 'barge').filter(t => !busy.has(t));
    if (!goal.length) continue;
    const r = goal.indexOf(v.t) >= 0 ? { path: [], cost: 0 } : waterSearch(S, v.t, new Set(goal), 'barge', 40000);
    if (r && (!best || r.cost < best.r.cost)) best = { d, r };
  }
  return best;
}
function boatJobFail(S, v, why) {
  v.ob = why;
  if (!v.cargo.length) {
    for (const c of S.cons) if (c.veh === v.id && c.st !== 'ride') { c.veh = 0; c.ob = 'Barge #' + v.id + ': ' + why; }
    v.job = null; v.load = [];
    if (v.st === 'go') { v.path = []; v.st = 'hold'; v.hold = S.tick + 100; }
    return;
  }
  const best = nearestDockRoute(S, v);
  if (best) {
    v.job = { a: 0, b: best.d.id, ph: 'div' }; v.path = best.r.path; v.bt = v.path.length ? v.path[v.path.length - 1] : v.t;
    v.st = 'go'; v.at = 0; dec(S, 9, v.id, best.d.id, 2);
    for (const id of v.cargo) { const c = cById(S, id); if (c) c.log.push([S.tick, 'Barge #' + v.id + ' diverting: ' + why]); }
    if (!v.path.length) boatArrive(S, v);
    return;
  }
  v.path = []; v.st = 'hold'; v.hold = S.tick + 120; v.ob = 'Holding cargo: ' + why + '; no reachable dock';
}

/* ---------------- freighters ---------------- */
function freighterTimer(S, v) {
  const q = bById(S, v.job.q);
  if (!q) { freighterOut(S, v); return; }
  if (v.st === 'unload') {
    refreshBookings(S);
    let free = BT.quay.cap - storeUsed(S, q) - (q._book || 0);
    for (let r = 0; r < NR && free > 0; r++) { const n = Math.min(v.own[r], free); if (n > 0) { q.inv[r] += n; v.own[r] -= n; free -= n; } }
    if (sumArr(v.own) > 0) {
      v.wait += 40;
      if (v.wait < TPD) { v.tm = 40; v.ob = 'Quay full: waiting to unload ' + sumArr(v.own) + ' units'; return; }
      for (let r = 0; r < NR; r++) { v.ret[r] += v.own[r]; v.own[r] = 0; }   // gives up; goods return to the supplier
    }
    let room = VT.freighter.cap - sumArr(v.ret), n = 0;
    for (let r = 0; r < NR && room > 0; r++) { const k = Math.min(q.exp[r], room); if (k > 0) { q.exp[r] -= k; v.own[r] += k; room -= k; n += k; } }
    v.st = 'load'; v.tm = 10 + Math.floor(n / 2); v.ob = 'Loading ' + n + ' units for export';
    return;
  }
  freighterOut(S, v);
}
function freighterOut(S, v) {
  v.job.ph = 'out'; v.st = 'go'; v.at = 0; v.bt = -1;
  if (v.t === S.gate) { freighterLeave(S, v); return; }
  const r = waterSearch(S, v.t, new Set([S.gate]), 'freighter', 60000);
  if (!r) { v.st = 'hold'; v.hold = S.tick + 120; v.ob = 'No channel back to open sea'; v.path = []; return; }
  v.path = r.path; v.ob = 'Sailing for open sea';
}
function freighterLeave(S, v) {
  let val = 0, n = 0;
  for (let r = 0; r < NR; r++) {
    if (v.own[r]) { S.led.exp[r] += v.own[r]; val += v.own[r] * RES[r].price; n += v.own[r]; }
    if (v.ret[r]) { S.led.exp[r] += v.ret[r]; earn(S, v.ret[r] * impPrice(r), 'refund'); n += v.ret[r]; }
  }
  if (val) earn(S, val, 'exp');
  dec(S, 21, v.id, n, val);
  const i = S.vehs.indexOf(v); if (i >= 0) S.vehs.splice(i, 1);
  v.dead = 1;
}
