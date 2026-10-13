/* =====================================================================
   Logistics: consignments, multi-modal routing, dispatch.

   A consignment is a fixed parcel (one resource, q units) from an origin
   building to a destination building, routed over legs:
     ['road', a, b] truck from building a to building b
     ['rail', a, b] train from station a to station b
     ['water', a, b] barge from dock a to dock b
   States: 'wait' units still inside origin stock (reserved there)
           'ride' units inside a vehicle (con.veh)
           'xfer' units in a transfer yard (con.at = station/dock id)
   A unit is therefore always in exactly one container.
   ===================================================================== */

const HAND = 8, WATER_K = 3, LOCK_K = 25, RAIL_K = 35;   // cost model: road 1/tile, rail .35/tile, water .3/tile
const LEG_LABEL = { road: 'Truck', rail: 'Train', water: 'Barge' };

function nodesOf(S) { return S.blds.filter(isNode); }
function trucksPerRc(S) {
  const m = new Map();
  for (const v of S.vehs) if (v.k === 'truck' && v.st !== 'stranded') { const k = rcOf(S, truckTile(S, v)); if (k >= 0) m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function trainsPerComp(S) {
  const m = new Map();
  for (const v of S.vehs) if (v.k === 'train' && v.st !== 'derail') { const k = railCompOf(S, v.tiles[0]); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function bargesPerComp(S) {
  const m = new Map();
  for (const v of S.vehs) if (v.k === 'barge') { const k = waterCompOf(S, v.t); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function nodeFree(S, n) { return BT[n.type].cap - storeUsed(S, n) - (n._book || 0); }

/* Ledger of what is booked to pass through each transfer node, and the
   quantity in each yard; recomputed from consignments (pure). */
function refreshBookings(S) {
  for (const b of S.blds) { if (b.tr) b._book = 0; }
  for (const c of S.cons) {
    for (let i = c.li; i < c.legs.length; i++) {
      const L = c.legs[i], dst = bById(S, L[2]);
      if (dst && dst.tr && dst.id !== c.d && !(c.st === 'xfer' && c.at === dst.id)) dst._book += c.q;
    }
  }
}

/* Reverse Dijkstra over transfer nodes toward destination 'dest'.
   cost[nodeId] = cheapest cost from that node to dest, nx[nodeId] = [mode, nextId]. */
function routeTable(S, dest, q) {
  const dAcc = bAcc(S, dest); if (dAcc < 0) return null;
  refreshBookings(S);
  const drc = rcOf(S, dAcc), tp = trucksPerRc(S);
  const ns = nodesOf(S).filter(n => n.id === dest.id || nodeFree(S, n) >= q);
  const cost = new Map(), nx = new Map(), done = new Set();
  if (dest.tr) { cost.set(dest.id, 0); nx.set(dest.id, null); }
  if (tp.get(drc) > 0) for (const n of ns) {
    if (n.id === dest.id) continue;
    const a = bAcc(S, n); if (a < 0 || rcOf(S, a) !== drc) continue;
    const d = roadDist(S, dAcc)[a]; if (d < 0) continue;
    const c = d + HAND; if (!cost.has(n.id) || c < cost.get(n.id)) { cost.set(n.id, c); nx.set(n.id, ['road', dest.id]); }
  }
  const trains = trainsPerComp(S), barges = bargesPerComp(S);
  for (;;) {
    let best = null, bc = 0;
    for (const n of ns) { if (done.has(n.id) || !cost.has(n.id)) continue; const c = cost.get(n.id); if (!best || c < bc) { best = n; bc = c; } }
    if (!best) break;
    done.add(best.id);
    for (const m of ns) {
      if (done.has(m.id) || m.id === best.id) continue;
      let c = -1, mode = '';
      const mdef = BT[m.type], bdef = BT[best.type];
      if (mdef.node === 'rail' && bdef.node === 'rail') {
        const comp = railCompOf(S, m.y * S.W + m.x);
        if (comp >= 0 && comp === railCompOf(S, best.y * S.W + best.x) && trains.get(comp) > 0) {
          const d = railStationDist(S, m, best); if (d >= 0) { c = Math.floor(d * RAIL_K / 1000) + HAND; mode = 'rail'; }
        }
      }
      if (mdef.node === 'water' && bdef.node === 'water') {
        const bm = berths(S, m, 'barge'), bb = berths(S, best, 'barge');
        if (bm.length && bb.length) {
          const comp = waterCompOf(S, bm[0]);
          if (comp >= 0 && comp === waterCompOf(S, bb[0]) && barges.get(comp) > 0) {
            const w = dockWaterDist(S, m, best); if (w) { const v = Math.floor((w.cost - w.locks * 60) * WATER_K / 100) + w.locks * LOCK_K + HAND; if (c < 0 || v < c) { c = v; mode = 'water'; } }
          }
        }
      }
      const ma = bAcc(S, m), ba = bAcc(S, best);
      if (ma >= 0 && ba >= 0 && rcOf(S, ma) === rcOf(S, ba) && tp.get(rcOf(S, ma)) > 0) {
        const d = roadDist(S, ba)[ma]; if (d >= 0 && (c < 0 || d + HAND < c)) { c = d + HAND; mode = 'road'; }
      }
      if (c < 0) continue;
      const tot = bc + c;
      if (!cost.has(m.id) || tot < cost.get(m.id)) { cost.set(m.id, tot); nx.set(m.id, [mode, best.id]); }
    }
  }
  return { dest, dAcc, drc, cost, nx, tp };
}
/* Best route for goods currently at building 'src' (or at road tile fromTile
   when src is null, e.g. a truck that must re-plan) to rt.dest. */
function routeFrom(S, rt, src, fromTile) {
  let best = null;
  const consider = (c, legs) => { if (!best || c < best.c) best = { c, legs }; };
  const follow = (nid) => { const legs = []; let id = nid; let guard = 0; while (id !== rt.dest.id && guard++ < 40) { const h = rt.nx.get(id); if (!h) return null; legs.push([h[0], id, h[1]]); id = h[1]; } return legs; };
  if (src && rt.cost.has(src.id)) { const L = follow(src.id); if (L) consider(rt.cost.get(src.id), L); }
  const a = src ? bAcc(S, src) : fromTile;
  if (a >= 0) {
    const arc = rcOf(S, a);
    if (rt.tp.get(arc) > 0) {
      if (arc === rt.drc && (!src || src.id !== rt.dest.id)) { const d = roadDist(S, rt.dAcc)[a]; if (d >= 0) consider(d, [['road', src ? src.id : 0, rt.dest.id]]); }
      for (const [nid, c0] of rt.cost) {
        if (src && nid === src.id) continue;
        const n = bById(S, nid); const na = bAcc(S, n); if (na < 0 || rcOf(S, na) !== arc) continue;
        const d = roadDist(S, na)[a]; if (d < 0) continue;
        const L = follow(nid); if (!L) continue;
        if (nid === rt.dest.id) consider(d + HAND, [['road', src ? src.id : 0, nid]]);
        else consider(d + HAND + c0, [['road', src ? src.id : 0, nid]].concat(L));
      }
    }
  }
  return best;
}

/* ---------------- supply and demand ---------------- */
function avail(b, r) {
  const def = BT[b.type];
  if (def.out) return b.out[r] - b.rsv[r];
  if (def.store) return b.inv[r] - b.rsv[r];
  return 0;
}
function demandsOf(S, b, incoming) {
  const def = BT[b.type], out = [];
  const inc = r => incoming.get(b.id * NR + r) || 0;
  // full truckloads normally; part loads only when the stock is nearly gone
  const add = (r, tgt, minQ, exact) => {
    const d = tgt - b.inv[r] - inc(r); if (d <= 0) return;
    const urgent = b.inv[r] + inc(r) <= (tgt >> 2);
    let mq = exact ? Math.min(minQ, tgt) : (urgent ? Math.min(4, d) : Math.min(VT.truck.cap, tgt));
    if (d >= mq) out.push([r, d, mq, urgent ? 0 : 1]);
  };
  if (def.inp) for (const [r] of def.inp) add(r, inTarget(b, r), 5);
  if (def.tools && b.wk > 0) { const d = 4 - b.inv[R.tools] - inc(R.tools); if (d >= 3) out.push([R.tools, d, 3, 2]); }
  if (def.fuel !== undefined) add(def.fuel, inTarget(b, def.fuel), 5);
  if (b.type === 'market') { add(R.bread, 36, 6); add(R.furniture, 8, 2); }
  if (b.type === 'house') { const w = houseWants(b); if (w) for (const [r, n] of w) if (r !== R.furniture) add(r, n, n, 1); }
  if (b.type === 'warehouse') {
    let room = def.cap - storeUsed(S, b); for (let r = 0; r < NR; r++) room -= inc(r);
    for (let r = 0; r < NR; r++) if (b.want[r] > 0 && room > 0) { const d = Math.min(room, b.want[r] - b.inv[r] - inc(r)); if (d > 0) { out.push([r, d, Math.min(VT.truck.cap, d), 2]); room -= d; } }
  }
  return out;
}
function isSupplier(b) { const def = BT[b.type]; return !!(def.out || def.store); }

function makeCon(S, src, dest, r, q, legs, exp, pr) {
  const c = { id: S.nc++, r, q, o: src.id, d: dest.id, x: exp ? 1 : 0, pr: pr === undefined ? 1 : pr, legs, li: 0, st: 'wait', at: src.id, veh: 0, t0: S.tick, ob: '', log: [[S.tick, 'created']] };
  src.rsv[r] += q;
  S.cons.push(c);
  // goods that start their journey on a train or barge from this very yard
  // move straight into the transfer yard (same building, no transport)
  if (legs[0][0] !== 'road' && src.tr) {
    if (BT[src.type].out) src.out[r] -= q; else src.inv[r] -= q;
    src.rsv[r] -= q; c.st = 'xfer'; src.tr.push(c.id); c.log.push([S.tick, 'staged in the yard at ' + BT[src.type].name + ' #' + src.id]);
  }
  dec(S, 1, c.id, src.id * 1000 + dest.id, r * 100 + q);
  return c;
}

function stepDispatch(S) {
  refreshBookings(S);
  const incoming = new Map(), outgoing = new Map();
  for (const c of S.cons) {
    const k = c.d * NR + c.r; incoming.set(k, (incoming.get(k) || 0) + c.q);
    if (c.st === 'wait') { const k2 = c.o * NR + c.r; outgoing.set(k2, (outgoing.get(k2) || 0) + c.q); }
  }
  const suppliers = S.blds.filter(isSupplier);
  const rtCache = new Map();
  const getRt = (b) => { if (!rtCache.has(b.id)) rtCache.set(b.id, routeTable(S, b, 1)); return rtCache.get(b.id); };
  let made = 0;
  const tryFill = (b, r, deficit, minQ, exp, pr) => {
    const rt = getRt(b); if (!rt) { b._why = 'no road access'; return; }
    let best = null;
    for (const s of suppliers) {
      if (s.id === b.id) continue;
      if (b.type === 'warehouse' && s.type === 'warehouse') continue;
      if (exp && s.type === 'quay') continue;
      const av = avail(s, r); if (av < minQ) continue;
      const rr = routeFrom(S, rt, s, -1); if (!rr) continue;
      if (!best || rr.c < best.rr.c || (rr.c === best.rr.c && s.id < best.s.id)) best = { s, rr, av };
    }
    if (!best) return;
    const q = Math.min(deficit, VT.truck.cap, best.av);
    if (q < minQ) return;
    // every transfer yard on the way must have room
    for (const L of best.rr.legs) { const n = bById(S, L[2]); if (n && n.tr && n.id !== b.id && nodeFree(S, n) < q) return; }
    const c = makeCon(S, best.s, b, r, q, best.rr.legs, exp, pr);
    for (const L of c.legs) { const n = bById(S, L[2]); if (n && n.tr && n.id !== b.id) n._book += q; }
    incoming.set(b.id * NR + r, (incoming.get(b.id * NR + r) || 0) + q);
    made++;
  };
  for (const b of S.blds) {
    for (const [r, d, mq, pr] of demandsOf(S, b, incoming)) tryFill(b, r, d, mq, 0, pr);
  }
  // exports: the quay pulls goods into its export bay
  const q = mainQuay(S);
  if (q) for (let r = 0; r < NR; r++) {
    if (S.trade.exp[r] <= 0) continue;
    const have = q.exp[r] + (incoming.get(q.id * NR + r) || 0);
    const room = BT.quay.cap - storeUsed(S, q) - (q._book || 0);
    const d = Math.min(S.trade.exp[r] - have, room);
    if (d > 0) tryFill(q, r, d, Math.min(VT.truck.cap, d), 1, 2);
  }
  // surplus push: full producers send overflow to the cheapest warehouse with room
  const whs = S.blds.filter(b => b.type === 'warehouse');
  if (whs.length) for (const s of S.blds) {
    const def = BT[s.type]; if (!def.out) continue;
    for (const [r] of def.out) {
      const av = avail(s, r); if (av < Math.floor(outCap(def, r) * 8 / 10)) continue;
      let best = null;
      for (const w of whs) {
        let room = BT.warehouse.cap - storeUsed(S, w); for (let k = 0; k < NR; k++) room -= incoming.get(w.id * NR + k) || 0;
        if (room < 5) continue;
        const rt = getRt(w); if (!rt) continue;
        const rr = routeFrom(S, rt, s, -1); if (!rr || rr.legs.length !== 1) continue;
        if (!best || rr.c < best.rr.c) best = { w, rr, room };
      }
      if (!best) continue;
      const qq = Math.min(VT.truck.cap, av, best.room);
      makeCon(S, s, best.w, r, qq, best.rr.legs, 0, 2);
      incoming.set(best.w.id * NR + r, (incoming.get(best.w.id * NR + r) || 0) + qq);
    }
  }
  return made;
}

/* ---------------- closing and re-planning ---------------- */
function closeCon(S, c, how) {
  const i = S.cons.indexOf(c); if (i >= 0) S.cons.splice(i, 1);
  c.st = how; c.t1 = S.tick; c.log.push([S.tick, how]);
  if (c.log.length > 12) c.log.splice(1, c.log.length - 12);
  S.hist.push(c); if (S.hist.length > 120) S.hist.shift();
}
/* Units of consignment c become owned stock of storage building n. */
function dissolveInto(S, c, n, why) {
  n.inv[c.r] += c.q;
  if (n.tr) { const k = n.tr.indexOf(c.id); if (k >= 0) n.tr.splice(k, 1); }
  c.log.push([S.tick, 'diverted: ' + why + ' -> ' + BT[n.type].name + ' #' + n.id]);
  dec(S, 9, c.id, n.id, 0);
  closeCon(S, c, 'diverted');
}
function cancelCon(S, c, why) {
  const o = bById(S, c.o); if (o && c.st === 'wait') o.rsv[c.r] -= c.q;
  if (c.veh) { const v = vById(S, c.veh); if (v) releaseCon(S, v, c.id); }
  c.log.push([S.tick, 'cancelled: ' + why]);
  dec(S, 10, c.id, 0, 0);
  closeCon(S, c, 'cancelled');
}
/* Re-plan a consignment that sits in transfer yard n. */
function replanAt(S, c, n, why) {
  const dest = bById(S, c.d);
  if (dest) {
    const rt = routeTable(S, dest, 0);
    if (rt) {
      if (dest.id === n.id) { deliverCon(S, c, n); return true; }
      const rr = routeFrom(S, rt, n, -1);
      if (rr) { c.legs = rr.legs; c.li = 0; c.log.push([S.tick, 're-routed at ' + BT[n.type].name + ' #' + n.id + (why ? ' (' + why + ')' : '')]); dec(S, 8, c.id, n.id, rr.legs.length); return true; }
    }
  }
  dissolveInto(S, c, n, dest ? 'no route to destination' : 'destination gone');
  return false;
}
function deliverCon(S, c, b) {
  if (c.x && b.exp) b.exp[c.r] += c.q; else b.inv[c.r] += c.q;
  if (!b.ld) { b.ld = zr(); b.lo = zr(); }
  b.ld[c.r] = S.tick; b.lo[c.r] = c.o;
  if (b.tr) { const k = b.tr.indexOf(c.id); if (k >= 0) b.tr.splice(k, 1); }
  S.delivered[c.r] += c.q;
  dec(S, 15, c.id, b.id, c.q);
  closeCon(S, c, 'delivered');
}

/* Validate waiting consignments after any network change. */
function revalidateCons(S) {
  for (const c of S.cons.slice()) {
    if (c.st === 'ride') continue;
    const dest = bById(S, c.d);
    if (c.st === 'wait') {
      const o = bById(S, c.o);
      if (!o) { closeCon(S, c, 'cancelled'); continue; }
      if (!dest) { cancelCon(S, c, 'destination demolished'); continue; }
      if (c.veh) continue;           // vehicle on its way handles its own path
      const rt = routeTable(S, dest, 0); const rr = rt ? routeFrom(S, rt, o, -1) : null;
      if (!rr) { cancelCon(S, c, 'no route any more'); continue; }
      if (JSON.stringify(rr.legs) !== JSON.stringify(c.legs)) { c.legs = rr.legs; c.li = 0; c.log.push([S.tick, 'route changed before pickup']); }
    } else if (c.st === 'xfer') {
      if (c.veh) continue;
      const n = bById(S, c.at); if (!n) continue;
      const L = c.legs[c.li];
      if (!dest || !L || !legStillValid(S, L)) replanAt(S, c, n, 'network changed');
    }
  }
}
function legStillValid(S, L) {
  const a = bById(S, L[1]), b = bById(S, L[2]); if (!b) return false;
  if (L[0] === 'road') { if (!a) return true; const x = bAcc(S, a), y = bAcc(S, b); return x >= 0 && y >= 0 && roadDist(S, y)[x] >= 0; }
  if (!a) return false;
  if (L[0] === 'rail') return railStationDist(S, a, b) >= 0;
  if (L[0] === 'water') return !!dockWaterDist(S, a, b);
  return false;
}

/* A building disappeared: settle everything that referenced it. */
function buildingGone(S, b, rep) {
  for (const c of S.cons.slice()) {
    if (c.st === 'wait' && c.o === b.id) { c.log.push([S.tick, 'origin demolished']); dec(S, 10, c.id, b.id, 1); closeCon(S, c, 'cancelled'); if (c.veh) { const v = vById(S, c.veh); if (v) releaseCon(S, v, c.id); } continue; }
    if (c.d === b.id) {
      if (c.st === 'wait') { cancelCon(S, c, 'destination demolished'); continue; }
      if (c.st === 'xfer') { const n = bById(S, c.at); if (n) dissolveInto(S, c, n, 'destination demolished'); continue; }
      // riding: the vehicle re-plans at its next stop
    }
  }
  vehiclesBuildingGone(S, b, rep);
}
