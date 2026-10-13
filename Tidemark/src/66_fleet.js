/* =====================================================================
   Fleet management: matching consignments with vehicles, reacting to
   network edits, buying, selling and scrapping.
   ===================================================================== */

function manh(S, a, b) { return Math.abs(a % S.W - b % S.W) + Math.abs(((a / S.W) | 0) - ((b / S.W) | 0)); }

function stepAssign(S) {
  // ---- trucks: one consignment per truck, nearest free truck by road distance
  const free = S.vehs.filter(v => v.k === 'truck' && !v.job && !v.cargo.length && (v.st === 'depot' || v.st === 'go' || v.st === 'hold'));
  const order = S.cons.filter(c => !c.veh && (c.st === 'wait' || c.st === 'xfer')).sort((a, b) => (a.pr | 0) - (b.pr | 0) || a.id - b.id);
  for (const c of order) {
    if (c.veh || (c.st !== 'wait' && c.st !== 'xfer')) continue;
    const L = c.legs[c.li]; if (!L || L[0] !== 'road') continue;
    const pick = bById(S, c.at); if (!pick) continue;
    const a = bAcc(S, pick); if (a < 0) { c.ob = 'Pickup point has no road access'; continue; }
    if (!free.length) { c.ob = 'Waiting for a truck: every truck is busy'; continue; }
    const dm = roadDist(S, a);
    let best = null, bd = 0;
    for (const v of free) {
      if (v.job) continue;
      const tt = truckTile(S, v); if (tt < 0) continue;
      const d = dm[tt]; if (d < 0) continue;
      if (!best || d < bd) { best = v; bd = d; }
    }
    if (!best) { c.ob = 'Waiting for a truck: none free on this road network'; continue; }
    best.job = { c: c.id, ph: 'pk', tgt: pick.id }; c.veh = best.id; c.ob = '';
    if (best.st === 'go') { const p = roadPath(S, best.t, a); best.path = p || []; }
    if (best.st === 'hold') best.hold = S.tick;
    dec(S, 2, best.id, c.id, bd);
  }
  // ---- trains and barges: group waiting consignments by (from, to)
  for (const mode of ['rail', 'water']) {
    const groups = new Map();
    for (const c of S.cons) {
      if (c.veh || c.st !== 'xfer') continue;
      const L = c.legs[c.li]; if (!L || L[0] !== mode) continue;
      const key = L[1] * 100000 + L[2];
      let g = groups.get(key); if (!g) { g = []; groups.set(key, g); } g.push(c);
    }
    for (const [key, list] of groups) {
      const a = bById(S, Math.floor(key / 100000)), b = bById(S, key % 100000); if (!a || !b) continue;
      let best = null, bd = 0;
      if (mode === 'rail') {
        const comp = railCompOf(S, a.y * S.W + a.x);
        for (const v of S.vehs) {
          if (v.k !== 'train' || v.job || v.cargo.length || (v.st !== 'idle' && v.st !== 'hold')) continue;
          if (railCompOf(S, v.tiles[0]) !== comp) continue;
          const d = v.at === a.id ? -1 : manh(S, v.tiles[0], a.y * S.W + a.x);
          if (!best || d < bd) { best = v; bd = d; }
        }
      } else {
        const ba = berths(S, a, 'barge'); if (!ba.length) continue;
        const comp = waterCompOf(S, ba[0]);
        for (const v of S.vehs) {
          if (v.k !== 'barge' || v.job || v.cargo.length || (v.st !== 'moor' && v.st !== 'hold')) continue;
          if (waterCompOf(S, v.t) !== comp) continue;
          const d = v.at === a.id ? -1 : manh(S, v.t, ba[0]);
          if (!best || d < bd) { best = v; bd = d; }
        }
      }
      const nm = BT[a.type].name + ' #' + a.id;
      if (!best) { for (const c of list) c.ob = 'Waiting at ' + nm + ' for a free ' + (mode === 'rail' ? 'train' : 'barge'); continue; }
      best.job = { a: a.id, b: b.id, ph: 'toA' };
      let room = mode === 'rail' ? best.cap : VT.barge.cap;
      for (const c of list) if (c.q <= room) { c.veh = best.id; room -= c.q; c.ob = ''; }
      if (best.st === 'hold') best.hold = S.tick;
      dec(S, mode === 'rail' ? 3 : 4, best.id, a.id, b.id);
    }
  }
}

/* ---------------- reacting to edits ---------------- */
function truckPathOk(S, v) {
  if (!S.road[v.t]) return false;
  let prev = v.t;
  for (const t of v.path) { if (!S.road[t] || dirTo(S, prev, t) < 0) return false; prev = t; }
  return jobTile(S, v) === prev;
}
function boatPathOk(S, v) {
  let prev = v.t;
  for (const t of v.path) { if (dirTo(S, prev, t) < 0 || !waterPass(S, prev, t, v.k)) return false; prev = t; }
  return true;
}
function processDirty(S) {
  const d = S.dirty;
  if (!d.road && !d.rail && !d.water) return;
  if (d.road) {
    for (const v of S.vehs.slice()) {
      if (v.k !== 'truck' || v.st !== 'go') continue;
      if (!truckPathOk(S, v)) truckReplan(S, v);
    }
  }
  if (d.rail) revalidateTrains(S);
  if (d.water) {
    for (const v of S.vehs.slice()) {
      if ((v.k !== 'barge' && v.k !== 'freighter') || v.st !== 'go') continue;
      if (boatPathOk(S, v)) continue;
      v.path = []; dec(S, 8, v.id, v.t, 0);
      if (v.k === 'freighter') { v.st = 'hold'; v.hold = S.tick; }
      else if (v.job) { const dock = bById(S, v.job.ph === 'toA' ? v.job.a : v.job.b); if (!dock || !boatPlanDock(S, v, dock)) boatJobFail(S, v, 'channel changed and no other route exists'); }
      else { v.st = 'hold'; v.hold = S.tick + 50; }
    }
  }
  d.road = 0; d.rail = 0; d.water = 0;
  revalidateCons(S);
}

function vehiclesBuildingGone(S, b, rep) {
  const acc = b._acc;
  for (const v of S.vehs.slice()) {
    if (v.k === 'truck') {
      if ((v.st === 'yard' || v.st === 'bay' || v.st === 'depot') && v.at === b.id) {
        if (v.st === 'depot' && !v.job && !v.cargo.length) {
          S.vehs.splice(S.vehs.indexOf(v), 1); v.dead = 1; earn(S, VT.truck.cost >> 1, 'refund');
          rep.push('Truck #' + v.id + ' sold with its depot'); continue;
        }
        v.t = (acc >= 0 && S.road[acc]) ? acc : b.y * S.W + b.x; v.path = [];
        v.st = S.road[v.t] ? 'hold' : 'stranded'; v.hold = S.tick;
        if (v.job && v.job.tgt === b.id && v.job.ph === 'pk') v.job = null;
        if (v.home === b.id) v.home = 0;
        if (v.job) truckReplanStatic(S, v);
        continue;
      }
      if (v.home === b.id) v.home = 0;
      if (v.st === 'go' && ((v.job && v.job.tgt === b.id) || !v.job)) truckReplan(S, v);
    } else if (v.k === 'train') {
      if (v.at === b.id) v.at = 0;
      if (v.job && (v.job.a === b.id || v.job.b === b.id)) { if (v.st === 'load' || v.st === 'unload') v.st = 'idle'; v.load = []; trainJobFail(S, v, 'station demolished'); }
    } else if (v.k === 'barge') {
      if (v.at === b.id && (v.st === 'moor' || v.st === 'load' || v.st === 'unload')) { v.at = 0; v.st = 'hold'; v.hold = S.tick; v.load = []; }
      if (v.job && (v.job.a === b.id || v.job.b === b.id)) boatJobFail(S, v, 'dock demolished');
    } else if (v.k === 'freighter') {
      if (v.job && v.job.q === b.id) {
        if (v.st !== 'load') for (let r = 0; r < NR; r++) { v.ret[r] += v.own[r]; v.own[r] = 0; }
        v.at = 0; freighterOut(S, v);
      }
    }
  }
}

/* ---------------- purchase, sale, scrapping ---------------- */
function buyVehicle(S, kind, bid) {
  const b = bById(S, bid); if (!b) return { ok: false, why: 'No such building' };
  const vt = VT[kind]; if (!vt || kind === 'freighter') return { ok: false, why: 'Cannot buy that' };
  if (!canPay(S, vt.cost)) return { ok: false, why: 'Not enough money (' + vt.cost + ')' };
  let v = null;
  if (kind === 'truck') { if (b.type !== 'depot') return { ok: false, why: 'Trucks are bought at a depot' }; if (bAcc(S, b) < 0) return { ok: false, why: 'The depot needs a road' }; v = newTruck(S, b); }
  else if (kind === 'train') { if (BT[b.type].node !== 'rail') return { ok: false, why: 'Trains are bought at a station' }; v = newTrain(S, b); if (!v) return { ok: false, why: 'No free platform' }; }
  else if (kind === 'barge') { if (BT[b.type].node !== 'water') return { ok: false, why: 'Barges are bought at a quay or wharf' }; v = newBarge(S, b); if (!v) return { ok: false, why: 'No free berth' }; }
  pay(S, vt.cost, 'build');
  return { ok: true, v };
}
function sellVehicle(S, vid) {
  const v = vById(S, vid); if (!v) return { ok: false, why: 'No such vehicle' };
  if (v.cargo.length || sumArr(v.own) || v.job) return { ok: false, why: 'Only idle, empty vehicles can be sold' };
  if (v.k === 'truck' && v.st !== 'depot') return { ok: false, why: 'Trucks are sold at their depot' };
  if (v.k === 'train' && v.st !== 'idle') return { ok: false, why: 'The train must be idle' };
  if (v.k === 'barge' && v.st !== 'moor') return { ok: false, why: 'The barge must be moored' };
  for (const c of S.cons) if (c.veh === v.id) c.veh = 0;
  S.vehs.splice(S.vehs.indexOf(v), 1); v.dead = 1;
  earn(S, VT[v.k].cost >> 1, 'refund');
  return { ok: true };
}
function scrapVehicle(S, vid, rep) {
  const v = vById(S, vid); if (!v) return { ok: false, why: 'No such vehicle' };
  if (v.k === 'freighter') return { ok: false, why: 'Freighters belong to the shipping line' };
  if ((v.st === 'yard' || v.st === 'bay') && v.at) { const b = bById(S, v.at); if (b) { let k = b.yard.indexOf(v.id); if (k >= 0) b.yard.splice(k, 1); k = b.bays.indexOf(v.id); if (k >= 0) b.bays.splice(k, 1); } }
  wreckVehicle(S, v, 'Scrapped by order', rep);
  return { ok: true };
}
/* A consignment promised to a vehicle (not yet loaded) no longer needs it. */
function releaseCon(S, v, cid) {
  if (v.k === 'truck') { if (v.job && v.job.c === cid && !v.cargo.length) { v.job = null; if (v.st === 'go') truckReplan(S, v); } }
  else if (v.load) { const k = v.load.indexOf(cid); if (k >= 0) v.load.splice(k, 1); }
}
