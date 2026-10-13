/* =====================================================================
   Diagnosis: explain shortages and consignment status from live state.
   Nothing here is scripted; every sentence is derived from the current
   simulation objects.
   ===================================================================== */

function bName(b) { return b ? BT[b.type].name + ' #' + b.id : 'a demolished building'; }
function vName(v) { return v ? VT[v.k].name + ' #' + v.id : 'a vehicle'; }
function legText(S, L) {
  const a = L[1] ? bById(S, L[1]) : null, b = bById(S, L[2]);
  return LEG_LABEL[L[0]] + ' ' + (L[1] ? bName(a) : 'from current position') + ' > ' + bName(b);
}
function conStatus(S, c) {
  if (c.st === 'wait') {
    const o = bById(S, c.o);
    if (c.veh) { const v = vById(S, c.veh); return 'waiting at ' + bName(o) + ' for pickup by ' + vName(v) + (v && v.ob ? ' (' + v.ob + ')' : ''); }
    return 'waiting at ' + bName(o) + ': ' + (c.ob || 'no vehicle assigned yet');
  }
  if (c.st === 'ride') { const v = vById(S, c.veh); return 'aboard ' + vName(v) + (v ? ' at ' + xy(S, v.k === 'train' ? v.tiles[0] : v.t) : '') + (v && v.ob ? '; ' + v.ob : '; moving'); }
  if (c.st === 'xfer') { const n = bById(S, c.at); return 'in the yard at ' + bName(n) + (c.veh ? ', booked on ' + vName(vById(S, c.veh)) : '') + (c.ob ? '; ' + c.ob : ''); }
  return c.st;
}
/* Describe a consignment fully: origin, cargo, route, destination, obstacle. */
function conReport(S, c) {
  const lines = [];
  lines.push(['Cargo', c.q + ' ' + RES[c.r].name + (c.x ? ' (for export)' : '')]);
  lines.push(['Origin', bName(bById(S, c.o)) + (S.hist.indexOf(c) >= 0 ? '' : '')]);
  lines.push(['Destination', bName(bById(S, c.d))]);
  lines.push(['Route', c.legs.map((L, i) => (i === c.li && c.st !== 'delivered' ? '> ' : '') + legText(S, L)).join(' | ')]);
  lines.push(['Status', conStatus(S, c)]);
  const v = c.veh ? vById(S, c.veh) : null;
  lines.push(['Obstacle', (v && v.ob) || c.ob || 'none']);
  lines.push(['Booked', clockStr(c.t0)]);
  return lines;
}

function whyNoRoute(S, s, b) {
  const sa = bAcc(S, s), ba = bAcc(S, b);
  if (sa < 0) return bName(s) + ' has no road access';
  if (ba < 0) return bName(b) + ' has no road access';
  const rs = rcOf(S, sa), rb = rcOf(S, ba), tp = trucksPerRc(S);
  const bits = [];
  if (rs === rb) {
    if (!(tp.get(rs) > 0)) return 'no trucks serve their road network (build a depot and buy trucks there)';
    return 'a route exists; it will be dispatched on the next round';
  }
  bits.push('they sit on separate road networks (#' + rs + ' and #' + rb + ')');
  if (!(tp.get(rs) > 0)) bits.push('road network #' + rs + ' has no trucks');
  if (!(tp.get(rb) > 0)) bits.push('road network #' + rb + ' has no trucks');
  const ns = nodesOf(S);
  const nsA = ns.filter(n => rcOf(S, bAcc(S, n)) === rs), nsB = ns.filter(n => rcOf(S, bAcc(S, n)) === rb);
  if (!nsA.length) bits.push('no station or dock on the supplier side');
  if (!nsB.length) bits.push('no station or dock on the receiving side');
  const trains = trainsPerComp(S), barges = bargesPerComp(S);
  for (const x of nsA) for (const y of nsB) {
    const dx = BT[x.type].node, dy = BT[y.type].node;
    if (dx !== dy) continue;
    if (dx === 'rail') {
      const d = railStationDist(S, x, y);
      if (d < 0) bits.push(bName(x) + ' and ' + bName(y) + ' are not joined by usable track (check signal directions)');
      else if (!(trains.get(railCompOf(S, x.y * S.W + x.x)) > 0)) bits.push('no train runs between ' + bName(x) + ' and ' + bName(y));
      else if (nodeFree(S, x) < 1 || nodeFree(S, y) < 1) bits.push('station yards are full');
    } else {
      const w = dockWaterDist(S, x, y);
      if (!w) bits.push(bName(x) + ' and ' + bName(y) + ' are not joined by water');
      else { const bx = berths(S, x, 'barge'); if (bx.length && !(barges.get(waterCompOf(S, bx[0])) > 0)) bits.push('no barge works between ' + bName(x) + ' and ' + bName(y)); }
    }
  }
  const ev = lastEdit(S, /bridge|Removed road|Removed track|Demolished/);
  if (ev) bits.push('most recent relevant edit: "' + ev.text + '" at ' + clockStr(ev.t));
  return bits.join('; ');
}
function lastEdit(S, re) {
  for (let i = S.events.length - 1; i >= 0; i--) { const e = S.events[i]; for (const l of e.lines) if (re.test(l)) return { t: e.t, text: l }; }
  return null;
}
function targetOf(S, b, r) {
  if (b.type === 'market') return r === R.bread ? 36 : 8;
  if (b.type === 'house') { if (r === R.bread) return 4; const w = houseWants(b); if (w) for (const [rr, n] of w) if (rr === r) return n; return 0; }
  return inTarget(b, r);
}
function producersOf(S, r) { return S.blds.filter(p => BT[p.type].out && BT[p.type].out.some(o => o[0] === r)); }
function prodStatus(S, p) {
  const def = BT[p.type];
  switch (p.st) {
    case 0: return 'working (' + Math.floor(p.prog / def.dur) + '% through a cycle)';
    case 1: {
      const a = bAcc(S, p); if (a < 0) return 'no workers: no road access, so nobody can commute';
      const k = rcOf(S, a); let homes = 0;
      const root = labourRoots(S);
      for (const h of S.blds) if (h.type === 'house' && h.res > 0) { const ha = bAcc(S, h); if (ha >= 0 && root(rcOf(S, ha)) === root(k)) homes++; }
      if (!homes) return 'no workers: nobody lives on its road network (#' + k + ') or on any network joined to it by rail or water, so it is cut off from the labour force';
      return 'no workers: every resident on its road network already has a job (' + (S.labour ? S.labour.unemp : 0) + ' unemployed city-wide)';
    }
    case 2: { const k = powerNet(S).pwComp[p.y * S.W + p.x]; const g = (S.pstat || []).find(x => x[0] === k); return 'no power' + (g ? ': its grid makes ' + g[1] + ' MW against ' + g[2] + ' MW demand' : ': not connected to any generator'); }
    case 3: return 'waiting for ' + RES[p.stR].name;
    case 4: return 'output full of ' + RES[p.stR].name + ' (' + p.out[p.stR] + ' units waiting for collection)';
    case 5: return def.ext === 'trees' ? 'no mature trees within reach' : 'nothing to extract';
  }
  return '?';
}
/* Returns [[depth, text]] */
function explainShortage(S, b, r, depth, seen) {
  depth = depth || 0; seen = seen || new Set();
  const out = [], key = b.id * NR + r;
  if (seen.has(key)) { out.push([depth, '(' + bName(b) + ' already covered above)']); return out; }
  seen.add(key);
  const tgt = targetOf(S, b, r);
  out.push([depth, bName(b) + ' holds ' + b.inv[r] + ' ' + RES[r].name + (tgt ? ' and wants ' + tgt : '')]);
  out.push([depth + 1, b.ld && b.ld[r] ? 'Last delivery of ' + RES[r].name + ' arrived ' + clockStr(b.ld[r]) + ' from ' + bName(bById(S, b.lo[r])) : 'No delivery of ' + RES[r].name + ' on record']);
  const inc = S.cons.filter(c => c.d === b.id && c.r === r);
  for (const c of inc) out.push([depth + 1, 'Consignment #' + c.id + ': ' + c.q + ' from ' + bName(bById(S, c.o)) + ', ' + conStatus(S, c)]);
  if (inc.length) return out;
  if (b.type === 'house') {
    const ms = S.blds.filter(m => m.type === 'market' && housesNear(S, m).indexOf(b.id) >= 0);
    if (r === R.bread || r === R.furniture) {
      if (!ms.length) { out.push([depth + 1, 'No market hall within walking range (' + BT.market.range + ' road tiles) of this house']); return out; }
      for (const m of ms.slice(0, 2)) { if (m.inv[r] > 0) out.push([depth + 1, bName(m) + ' has ' + m.inv[r] + ' ' + RES[r].name + (m.st ? ' but is closed: ' + ['', 'no staff', 'no power'][m.st] : ' and serves this house every 20 ticks')]); else out.push(...explainShortage(S, m, r, depth + 1, seen)); }
      return out;
    }
  }
  const sups = S.blds.filter(s => s.id !== b.id && isSupplier(s) && avail(s, r) > 0).sort((x, y) => avail(y, r) - avail(x, r));
  if (sups.length) {
    const rt = routeTable(S, b, 1);
    for (const s of sups.slice(0, 3)) {
      const rr = rt ? routeFrom(S, rt, s, -1) : null;
      if (rr) out.push([depth + 1, bName(s) + ' has ' + avail(s, r) + ' spare; route available (' + rr.legs.map(L => LEG_LABEL[L[0]]).join(' > ') + '), next dispatch round will book it']);
      else out.push([depth + 1, bName(s) + ' has ' + avail(s, r) + ' ' + RES[r].name + ' but cannot ship: ' + whyNoRoute(S, s, b)]);
    }
    return out;
  }
  out.push([depth + 1, 'No building has spare ' + RES[r].name + '.']);
  const held = S.cons.filter(c => c.r === r && c.d !== b.id);
  if (held.length) { let n = 0; for (const c of held) n += c.q; out.push([depth + 1, n + ' units are already committed elsewhere (' + held.length + ' consignments)']); }
  const prods = producersOf(S, r);
  if (!prods.length) out.push([depth + 1, 'Nothing in the city produces ' + RES[r].name + '.' + (S.trade.imp[r] ? ' Imports are ordered: ' + S.trade.imp[r] + ' per freighter.' : ' Consider importing it at the quay.')]);
  const rtB = prods.length ? routeTable(S, b, 1) : null;
  for (const p of prods.slice(0, 4)) {
    out.push([depth + 1, bName(p) + ': ' + prodStatus(S, p) + (p.lp ? '; last finished a batch ' + clockStr(p.lp) : '')]);
    if (rtB !== undefined && !(rtB && routeFrom(S, rtB, p, -1))) out.push([depth + 2, 'Even if it produced, nothing could reach ' + bName(b) + ': ' + whyNoRoute(S, p, b)]);
    if (p.st === 3 && depth < 6) out.push(...explainShortage(S, p, p.stR, depth + 2, seen));
    if (p.st === 4) {
      const stuck = S.cons.filter(c => c.o === p.id && c.st === 'wait');
      if (stuck.length) for (const c of stuck.slice(0, 2)) out.push([depth + 2, 'Consignment #' + c.id + ' for ' + bName(bById(S, c.d)) + ': ' + conStatus(S, c)]);
      else out.push([depth + 2, 'Nobody can take it: ' + whyNoRoute(S, p, b)]);
    }
  }
  return out;
}

/* Which input is a building short of right now? */
function shortageOf(S, b) {
  const def = BT[b.type];
  if (def.out && b.st === 3) return b.stR;
  if (b.type === 'house') { if (b.inv[R.bread] <= 0) return R.bread; const w = houseWants(b); if (w) for (const [r, n] of w) if (b.inv[r] < n) return r; return -1; }
  if (b.type === 'market') { if (b.inv[R.bread] < 6) return R.bread; return -1; }
  if (def.fuel !== undefined && b.inv[def.fuel] <= 0) return def.fuel;
  return -1;
}
