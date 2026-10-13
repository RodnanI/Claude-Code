/* =====================================================================
   Freight trains and signalling.
   Rule: a train may only move onto track it has reserved. From a stop it
   reserves forward tile by tile until the first one-way signal facing its
   travel direction (a safe place to wait, since nothing comes the other
   way through it) or its destination platform. If any tile in that span
   is held by another train, or a road vehicle stands on a level crossing
   in it, the train stays at the signal (red). Reservations behind the
   tail are released as it moves. Waiting trains that hold each other's
   next block are reported as a deadlock with the actual cycle.
   ===================================================================== */

function prepRsv(S) {
  const N = S.W * S.H;
  if (!S._rsv || S._rsv.length !== N) S._rsv = new Int32Array(N); else S._rsv.fill(0);
  for (const v of S.vehs) {
    if (v.k !== 'train') continue;
    for (const t of v.tiles) S._rsv[t] = v.id;
    for (let i = 0; i < v.rn; i++) S._rsv[v.path[i]] = v.id;
  }
  if (!S._rocc || S._rocc.length !== N) S._rocc = new Uint8Array(N); else S._rocc.fill(0);
  for (const v of S.vehs) if (v.k === 'truck' && v.st === 'go') S._rocc[v.t]++;
}
function platforms(S, st) {
  const out = [];
  if (st.rot & 1) { for (let x = st.x; x < st.x + st.w; x++) { const a = []; for (let y = st.y; y < st.y + st.h; y++) a.push(y * S.W + x); out.push([a, 2]); } }
  else { for (let y = st.y; y < st.y + st.h; y++) { const a = []; for (let x = st.x; x < st.x + st.w; x++) a.push(y * S.W + x); out.push([a, 1]); } }
  return out;
}
function newTrain(S, st) {
  prepRsv(S);
  for (const [tiles, hd] of platforms(S, st)) {
    if (tiles.some(t => S._rsv[t])) continue;
    const head = tiles[tiles.length - 1], tail = tiles[tiles.length - 2];
    const v = { id: S.nv++, k: 'train', st: 'idle', tiles: [head, tail], hd, p: STOP, path: [], rn: 0, job: null, at: st.id, tm: 0, cargo: [], own: zr(), load: [], wb: 0, ob: '', wt: 0, len: 2, cap: VT.train.cap, hold: 0 };
    S.vehs.push(v); S._rsv[head] = v.id; S._rsv[tail] = v.id;
    return v;
  }
  return null;
}
const cargoUnits = (S, v) => { let n = 0; for (const id of v.cargo) { const c = cById(S, id); if (c) n += c.q; } return n + sumArr(v.own); };
function stationAt(S, t) { const id = S.bld[t]; if (!id) return null; const b = bById(S, id); return b && BT[b.type].node === 'rail' ? b : null; }

function stepTrains(S) {
  for (const v of S.vehs) {
    if (v.k !== 'train') continue;
    v._adv = 0;
    switch (v.st) {
      case 'run': moveTrain(S, v); break;
      case 'load': if (--v.tm <= 0) trainLoadDone(S, v); break;
      case 'unload': if (--v.tm <= 0) trainUnloadDone(S, v); break;
      case 'idle': if (v.job) trainStart(S, v); break;
      case 'hold': if (S.tick >= v.hold) { if (v.job) trainStart(S, v); else v.st = 'idle'; } break;
      case 'derail': if (S.tick % 50 === v.id % 50) trainRerail(S, v); break;
    }
  }
  // yield: an idle train that blocks a running one moves to a free platform elsewhere
  for (const v of S.vehs) {
    if (v.k !== 'train' || v.st !== 'run' || v.wt < 60 || !v.wb) continue;
    const blk = vById(S, v.wb);
    if (blk && blk.k === 'train' && blk.st === 'idle' && !blk.job && !blk.cargo.length) trainRelocate(S, blk, v.id);
  }
}
function trainReleaseAhead(S, v) {
  for (let i = 0; i < v.rn; i++) if (S._rsv[v.path[i]] === v.id) S._rsv[v.path[i]] = 0;
  v.rn = 0;
}
function canReverse(S, v) {
  if (v.rn > 0 || v.p < STOP) return false;
  if (v.tiles.some(t => stationAt(S, t))) return true;
  const h = v.tiles[0]; for (let d = 0; d < 4; d++) if (d !== opp(v.hd) && railLink(S, h, d) >= 0) return false;
  return true;                                   // dead end
}
function trainPlan(S, v, goal) {
  const starts = [[v.tiles[0], v.hd, 0, 1]];
  if (canReverse(S, v)) starts.push([v.tiles[v.tiles.length - 1], opp(v.hd), 30, 1]);
  const pen = t => (S._rsv[t] && S._rsv[t] !== v.id) ? 60 : 0;
  const r = railSearch(S, starts, goal, pen, 60000);
  if (!r) return null;
  trainReleaseAhead(S, v);
  if (r.start === 1) { v.tiles.reverse(); v.hd = opp(v.hd); v.p = STOP; }
  v.path = r.path; v.rn = 0;
  return r;
}
function trainStart(S, v) {
  const j = v.job; if (!j) { v.st = 'idle'; return; }
  const st = bById(S, j.ph === 'toA' ? j.a : j.b);
  if (!st) { trainJobFail(S, v, 'target station no longer exists'); return; }
  if (!trainPlan(S, v, stationGoal(S, st))) { trainJobFail(S, v, 'no rail route to ' + BT[st.type].name + ' #' + st.id + ' (check track and signal directions)'); return; }
  v.st = 'run'; v.wt = 0; v.ob = '';
  if (!v.path.length) trainArrive(S, v);
}
function trainReserve(S, v) {
  let j = v.rn; const seg = [];
  while (j < v.path.length) {
    const t = v.path[j]; seg.push(t);
    if (j === v.path.length - 1) break;
    const dout = dirTo(S, t, v.path[j + 1]);
    if (S.sig[t] && sigDir(S, t) === dout) break;
    j++;
  }
  for (const t of seg) {
    const o = S._rsv[t];
    if (o && o !== v.id) {
      v.wb = o;
      const st = stationAt(S, t);
      const here = v.tiles[0];
      const sigHere = S.sig[here] ? 'Held at signal ' + xy(S, here) + ': ' : 'Waiting: ';
      v.ob = sigHere + (st ? 'platform at ' + BT[st.type].name + ' #' + st.id + ' held by Train #' + o : 'block ahead ' + xy(S, t) + ' reserved by Train #' + o);
      return false;
    }
    if (S.road[t] && S._rocc[t]) { v.wb = 0; v.ob = 'Waiting for road traffic to clear level crossing ' + xy(S, t); return false; }
  }
  for (const t of seg) S._rsv[t] = v.id;
  v.rn += seg.length; v.wb = 0; v.ob = '';
  dec(S, 5, v.id, seg[seg.length - 1], seg.length);
  return true;
}
function moveTrain(S, v) {
  const spd = Math.max(8, Math.floor(VT.train.spd * WX_SPD[S.wx.k][2] / 100));
  if (v.rn === 0 && v.path.length) trainReserve(S, v);
  const p0 = v.p; let np = v.p + spd, entered = false;
  while (np >= 256 && v.rn > 0) {
    const n = v.path.shift(); v.rn--;
    v.hd = dirTo(S, v.tiles[0], n); v.tiles.unshift(n);
    while (v.tiles.length > v.len) {
      const tl = v.tiles.pop();
      let keep = false; for (let i = 0; i < v.rn; i++) if (v.path[i] === tl) keep = true;
      if (!keep && S._rsv[tl] === v.id) S._rsv[tl] = 0;
    }
    np -= 256; entered = true;
    if (v.rn === 0 && v.path.length) trainReserve(S, v);
  }
  if (v.rn === 0) np = Math.min(np, entered ? STOP : Math.max(STOP, p0));
  if (np > 255) np = 255;
  v.p = np;
  v._adv = (entered ? 256 : 0) + np - p0;
  if (np === p0 && !entered) v.wt++; else v.wt = 0;
  if (!v.path.length && v.p >= STOP) trainArrive(S, v);
}
function trainArrive(S, v) {
  const st = stationAt(S, v.tiles[0]);
  v.at = st ? st.id : 0; v.wt = 0;
  const j = v.job;
  if (!j) { v.st = 'idle'; return; }
  if (j.ph === 'toA') {
    if (st && st.id === j.a) trainBeginLoad(S, v, st); else trainStart(S, v);
  } else if (j.ph === 'toB' || j.ph === 'div') {
    if (st) { v.st = 'unload'; v.tm = Math.floor((10 + 2 * cargoUnits(S, v)) * 100 / handleMul(st)); v.ob = 'Unloading at ' + BT[st.type].name + ' #' + st.id; }
    else trainStart(S, v);
  } else { v.job = null; v.st = 'idle'; v.ob = ''; }
}
function trainBeginLoad(S, v, st) {
  const list = []; let room = v.cap - cargoUnits(S, v), units = 0;
  for (const cid of st.tr) {
    const c = cById(S, cid); if (!c || c.st !== 'xfer') continue;
    const L = c.legs[c.li]; if (!L || L[0] !== 'rail' || L[1] !== st.id || L[2] !== v.job.b) continue;
    if (c.veh && c.veh !== v.id) continue;
    if (c.q > room) continue;
    list.push(c.id); c.veh = v.id; room -= c.q; units += c.q;
  }
  // consignments promised to this train that are not loadable here are released
  for (const c of S.cons) if (c.veh === v.id && c.st !== 'ride' && list.indexOf(c.id) < 0) c.veh = 0;
  v.load = list; v.st = 'load'; v.tm = Math.floor((10 + 2 * units) * 100 / handleMul(st));
  v.ob = 'Loading ' + units + ' units at ' + BT[st.type].name + ' #' + st.id;
}
function trainLoadDone(S, v) {
  const st = bById(S, v.at);
  if (st) for (const cid of v.load) { const c = cById(S, cid); if (c && c.st === 'xfer' && c.at === st.id && c.veh === v.id) loadCon(S, c, st, v, 'Train'); }
  v.load = [];
  if (!v.cargo.length) { v.job = null; v.st = 'idle'; v.ob = 'Nothing to carry'; return; }
  v.job.ph = 'toB'; trainStart(S, v);
}
function trainUnloadDone(S, v) {
  const st = bById(S, v.at);
  if (!st) { trainJobFail(S, v, 'station vanished during unloading'); return; }
  for (const cid of v.cargo.slice()) {
    const c = cById(S, cid); if (!c) { v.cargo.splice(v.cargo.indexOf(cid), 1); continue; }
    const L = c.legs[c.li];
    if (c.d === st.id || (L && L[0] === 'rail' && L[2] === st.id)) unloadAt(S, c, st, v, false);
    else {                                  // diverted cargo: into the yard, then re-plan
      v.cargo.splice(v.cargo.indexOf(cid), 1); c.veh = 0; c.st = 'xfer'; c.at = st.id; st.tr.push(c.id);
      c.log.push([S.tick, 'unloaded off-route at ' + BT[st.type].name + ' #' + st.id]);
      replanAt(S, c, st, 'train diverted');
    }
  }
  v.job = null; v.st = 'idle'; v.ob = '';
}
function anyStationGoal(S, exceptId) {
  return (t, h) => {
    const st = stationAt(S, t); if (!st || st.id === exceptId) return false;
    const n = nb(S, t, h); return n < 0 || S.bld[n] !== st.id;
  };
}
function trainJobFail(S, v, why) {
  v.ob = why;
  if (!v.cargo.length) {
    for (const c of S.cons) if (c.veh === v.id && c.st !== 'ride') { c.veh = 0; c.ob = 'Train #' + v.id + ': ' + why; }
    v.job = null; v.load = [];
    if (v.st === 'run' && !(v.rn === 0 && v.p >= STOP && stationAt(S, v.tiles[0]))) { trainReleaseAhead(S, v); v.path = []; v.st = 'hold'; v.hold = S.tick + 100; }
    else { trainReleaseAhead(S, v); v.path = []; v.st = 'idle'; }
    return;
  }
  const r = trainPlan(S, v, anyStationGoal(S, 0));
  if (r) {
    const st = stationAt(S, r.path.length ? r.path[r.path.length - 1] : v.tiles[0]);
    v.job = { a: 0, b: st ? st.id : 0, ph: 'div' }; v.st = 'run';
    for (const id of v.cargo) { const c = cById(S, id); if (c) c.log.push([S.tick, 'Train #' + v.id + ' diverting: ' + why]); }
    dec(S, 9, v.id, v.job.b, 1);
    if (!v.path.length) trainArrive(S, v);
    return;
  }
  trainReleaseAhead(S, v); v.path = []; v.st = 'hold'; v.hold = S.tick + 100;
  v.ob = 'Holding cargo: ' + why + '; no reachable station';
}
function trainRelocate(S, v, forId) {
  const goal = anyStationGoal(S, v.at);
  const free = (t, h) => {
    if (!goal(t, h)) return false;
    let u = t; const sid = S.bld[t];
    while (u >= 0 && S.bld[u] === sid) { if (S._rsv[u] && S._rsv[u] !== v.id) return false; u = nb(S, u, opp(h)); }
    return true;
  };
  const r = trainPlan(S, v, free);
  if (!r) return;
  const st = stationAt(S, r.path.length ? r.path[r.path.length - 1] : v.tiles[0]);
  v.job = { a: 0, b: st ? st.id : 0, ph: 'reloc' }; v.st = 'run'; v.ob = 'Clearing the platform for Train #' + forId;
  dec(S, 18, v.id, v.job.b, forId);
  if (!v.path.length) trainArrive(S, v);
}
function trainRerail(S, v) {
  for (let i = 0; i < v.tiles.length; i++) {
    if (!S.rail[v.tiles[i]]) { v.ob = 'Derailed: track missing at ' + xy(S, v.tiles[i]) + ' (rebuild it, or scrap the train)'; return; }
    if (i > 0) { const d = dirTo(S, v.tiles[i], v.tiles[i - 1]); if (d < 0 || railLink(S, v.tiles[i], d) !== v.tiles[i - 1]) { v.ob = 'Derailed: track under the train is not connected'; return; } }
  }
  v.st = v.job ? 'hold' : 'idle'; v.hold = S.tick; v.ob = 'Re-railed';
  dec(S, 17, v.id, v.tiles[0], 1);
}
/* Track removed under trains: plunge on bridges, derail on land. */
function railRemoved(S, tiles, rep) {
  for (const v of S.vehs.slice()) {
    if (v.k !== 'train') continue;
    const hit = v.tiles.filter(t => tiles.indexOf(t) >= 0);
    if (!hit.length) continue;
    if (hit.some(t => isWater(S.ter[t]))) { wreckVehicle(S, v, 'Railway bridge ' + xy(S, hit[0]) + ' demolished under Train #' + v.id, rep); continue; }
    if (S._rsv) trainReleaseAhead(S, v); else v.rn = 0;
    v.path = []; v.st = 'derail'; v.ob = 'Derailed: track removed under the train';
    dec(S, 17, v.id, hit[0], 0);
    rep.push('Train #' + v.id + ' derailed at ' + xy(S, hit[0]));
  }
}
function revalidateTrains(S) {
  for (const v of S.vehs) {
    if (v.k !== 'train' || v.st !== 'run') continue;
    let prev = v.tiles[0], ok = true;
    for (const t of v.path) {
      const d = dirTo(S, prev, t);
      if (d < 0 || railLink(S, prev, d) !== t || (S.sig[prev] && sigDir(S, prev) !== d) || (S.sig[t] && sigDir(S, t) !== d)) { ok = false; break; }
      prev = t;
    }
    if (ok) continue;
    trainReleaseAhead(S, v);
    const j = v.job;
    const st = j ? bById(S, j.ph === 'toA' ? j.a : j.b) : null;
    if (st && trainPlan(S, v, stationGoal(S, st))) { dec(S, 8, v.id, st.id, v.path.length); for (const id of v.cargo) { const c = cById(S, id); if (c) c.log.push([S.tick, 'Train #' + v.id + ' re-routed after track change']); } continue; }
    trainJobFail(S, v, 'track ahead changed and no other route exists');
  }
}
/* Waiting trains that block each other in a cycle. */
function railDeadlocks(S) {
  const out = [];
  const waits = new Map();
  for (const v of S.vehs) if (v.k === 'train' && v.st === 'run' && v.wb && v.wt > 30) waits.set(v.id, v.wb);
  const seen = new Set();
  for (const [a] of waits) {
    if (seen.has(a)) continue;
    const chain = []; let x = a; const idx = new Map();
    while (waits.has(x) && !idx.has(x)) { idx.set(x, chain.length); chain.push(x); x = waits.get(x); }
    for (const y of chain) seen.add(y);
    if (idx.has(x)) out.push(chain.slice(idx.get(x)));
  }
  return out;
}
