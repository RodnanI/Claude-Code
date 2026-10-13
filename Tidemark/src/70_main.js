/* =====================================================================
   The tick, actions, serialization, audit.
   ===================================================================== */

function step(S) {
  // scripted scenario actions are part of the state, so replays include them
  if (S.sched && S.sched.length) {
    while (S.sched.length && S.sched[0].at <= S.tick) { const e = S.sched.shift(); applyAction(S, e.a, 1); }
  }
  prepRsv(S);
  processDirty(S);
  stepWeather(S);
  if (S.tick % 50 === 7) stepLabour(S);
  if (S.tick % 10 === 3) stepPower(S);
  stepProduction(S);
  if (S.tick % 10 === 5) stepHouses(S);
  if (S.tick % 20 === 9) stepMarkets(S);
  stepForests(S);
  stepTrade(S);
  if (S.tick % 20 === 11) stepDispatch(S);
  if (S.tick % 10 === 1) stepAssign(S);
  stepLocks(S);
  stepTrains(S);
  stepTrucks(S);
  stepBoats(S);
  if (S.tick % TPD === 600) stepDaily(S);
  if (S.tick % 100 === 50) checkAlerts(S);
  if (S.scen && S.tick % 50 === 25 && typeof scenarioTick === 'function') scenarioTick(S);
  S.tick++;
}

const clampI = (v, a, b) => Math.max(a, Math.min(b, v | 0));
function applyAction(S, a, sys) {
  prepRsv(S);
  const rep = [];
  let res;
  switch (a.type) {
    case 'road': res = buildRoad(S, a.tiles); break;
    case 'rail': res = buildRail(S, a.tiles); break;
    case 'canal': res = buildCanal(S, a.tiles); break;
    case 'power': res = buildPower(S, a.tiles); break;
    case 'signal': res = setSignal(S, a.t, a.d); break;
    case 'lock': res = buildLock(S, a.t); break;
    case 'place': res = placeBuilding(S, a.bt, a.x, a.y, a.rot | 0); break;
    case 'bulldoze': {
      let n = 0; for (const t of a.tiles) if (bulldozeTile(S, t, rep)) n++;
      res = n ? { ok: true } : { ok: false, why: rep.length ? rep[rep.length - 1] : 'Nothing to remove here' }; break;
    }
    case 'buy': res = buyVehicle(S, a.vk, a.b); break;
    case 'sell': res = sellVehicle(S, a.v); break;
    case 'scrap': res = scrapVehicle(S, a.v, rep); break;
    case 'trade': if (a.imp) S.trade.imp[a.r] = clampI(a.n, 0, 300); else S.trade.exp[a.r] = clampI(a.n, 0, 300); res = { ok: true }; break;
    case 'want': { const b = bById(S, a.b); if (b && b.want) { b.want[a.r] = clampI(a.n, 0, 240); res = { ok: true }; } else res = { ok: false, why: 'Not a warehouse' }; break; }
    case 'weather': S.wx.k = a.k; S.wx.until = S.tick + a.dur; res = { ok: true }; break;
    case 'grant': earn(S, a.n, 'tax'); res = { ok: true }; break;
    default: res = { ok: false, why: 'Unknown action ' + a.type };
  }
  if (res.ok) {
    S.acts.push({ at: S.tick, seq: S.aseq++, a, sys: sys ? 1 : 0 });
    S.mut = (S.mut || 0) + 1;
  }
  if (rep.length) { S.events.push({ t: S.tick, lines: rep }); if (S.events.length > 80) S.events.shift(); }
  return { res, rep };
}

/* ---------------- serialization ---------------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64enc(u8) {
  let s = ''; let i = 0;
  for (; i + 2 < u8.length; i += 3) { const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2]; s += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63]; }
  if (i < u8.length) { const n = (u8[i] << 16) | ((i + 1 < u8.length ? u8[i + 1] : 0) << 8); s += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < u8.length ? B64[(n >> 6) & 63] : '=') + '='; }
  return s;
}
function b64dec(s) {
  const L = s.length, pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0, out = new Uint8Array(L / 4 * 3 - pad);
  const m = new Int16Array(128).fill(0); for (let i = 0; i < 64; i++) m[B64.charCodeAt(i)] = i;
  let o = 0;
  for (let i = 0; i < L; i += 4) {
    const n = (m[s.charCodeAt(i)] << 18) | (m[s.charCodeAt(i + 1)] << 12) | (m[s.charCodeAt(i + 2)] << 6) | m[s.charCodeAt(i + 3)];
    if (o < out.length) out[o++] = n >> 16; if (o < out.length) out[o++] = (n >> 8) & 255; if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
function serialize(S) {
  const o = {};
  for (const k in S) {
    if (k[0] === '_') continue;
    const v = S[k];
    if (v && ArrayBuffer.isView(v) && v.BYTES_PER_ELEMENT === 1) o[k] = { $u8: b64enc(v) };
    else if (v && ArrayBuffer.isView(v) && v.BYTES_PER_ELEMENT === 4) o[k] = { $i32: b64enc(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
    else o[k] = v;
  }
  return JSON.stringify(o, (key, val) => (key && key.charCodeAt(0) === 95) ? undefined : val);
}
function deserialize(str) {
  const o = JSON.parse(str);
  for (const k in o) {
    const v = o[k];
    if (v && typeof v === 'object' && v.$u8 !== undefined) o[k] = b64dec(v.$u8);
    else if (v && typeof v === 'object' && v.$i32 !== undefined) { const u = b64dec(v.$i32); o[k] = new Int32Array(u.buffer, 0, u.length >> 2); }
  }
  return o;
}
function hashState(S) { return hashStr(serialize(S)); }

/* ---------------- replay ---------------- */
/* Restore snapshot text and re-apply the player's recorded actions
   (sys actions are re-issued by the scenario schedule held in state). */
function replay(snapText, actions, untilTick, onStep) {
  const S = deserialize(snapText);
  const alen = S.acts.length;
  const todo = actions.slice(alen).filter(e => !e.sys);
  let i = 0;
  while (S.tick < untilTick) {
    while (i < todo.length && todo[i].at === S.tick) { applyAction(S, todo[i].a, 0); i++; }
    step(S);
    if (onStep) onStep(S);
  }
  while (i < todo.length && todo[i].at === S.tick) { applyAction(S, todo[i].a, 0); i++; }
  return S;
}

/* ---------------- ledger audit ---------------- */
function audit(S) {
  const inB = zr(), inS = zr(), inT = zr(), inT2 = zr(), issues = [];
  for (const b of S.blds) {
    const st = BT[b.type].store;
    for (let r = 0; r < NR; r++) {
      const n = b.inv[r] + b.out[r] + (b.exp ? b.exp[r] : 0);
      if (st) inS[r] += n; else inB[r] += n;
      if (b.inv[r] < 0 || b.out[r] < 0) issues.push('Negative stock of ' + RES[r].name + ' at ' + BT[b.type].name + ' #' + b.id);
      if (b.rsv[r] > (BT[b.type].out ? b.out[r] : b.inv[r])) issues.push('Reservation exceeds stock of ' + RES[r].name + ' at ' + BT[b.type].name + ' #' + b.id);
    }
  }
  const where = new Map();
  for (const v of S.vehs) {
    for (const id of v.cargo) { const c = cById(S, id); if (!c) { issues.push(VT[v.k].name + ' #' + v.id + ' lists a missing consignment'); continue; } inT2[c.r] += c.q; if (where.has(id)) issues.push('Consignment #' + id + ' in two places'); where.set(id, 'v' + v.id); if (c.st !== 'ride' || c.veh !== v.id) issues.push('Consignment #' + id + ' state mismatch on vehicle'); }
    for (let r = 0; r < NR; r++) { const n = v.own[r] + (v.ret ? v.ret[r] : 0); inT[r] += n; inT2[r] += n; }
  }
  for (const b of S.blds) if (b.tr) for (const id of b.tr) { const c = cById(S, id); if (!c) { issues.push('Yard at #' + b.id + ' lists a missing consignment'); continue; } inT2[c.r] += c.q; if (where.has(id)) issues.push('Consignment #' + id + ' in two places'); where.set(id, 'b' + b.id); }
  for (const c of S.cons) {
    if (c.st === 'ride' || c.st === 'xfer') { inT[c.r] += c.q; if (!where.has(c.id)) issues.push('Consignment #' + c.id + ' (' + c.st + ') is not in any container'); }
  }
  const L = S.led, rows = [];
  let worst = 0;
  for (let r = 0; r < NR; r++) {
    const src = L.start[r] + L.ext[r] + L.imp[r] + L.prod[r];
    const sink = L.use[r] + L.exp[r] + L.lost[r];
    const inv = inB[r] + inS[r] + inT[r];
    const disc = src - sink - inv;
    if (inT[r] !== inT2[r]) issues.push(RES[r].name + ': transit count by state (' + inT[r] + ') differs from count by container (' + inT2[r] + ')');
    if (disc !== 0) worst = Math.max(worst, Math.abs(disc));
    rows.push({ r, start: L.start[r], ext: L.ext[r], imp: L.imp[r], prod: L.prod[r], use: L.use[r], exp: L.exp[r], lost: L.lost[r], inB: inB[r], inS: inS[r], inT: inT[r], disc });
  }
  return { rows, issues, ok: worst === 0 && !issues.length, worst };
}
/* Record stock that exists at scenario start. */
function seedStock(S, b, r, n, out) {
  if (out) b.out[r] += n; else b.inv[r] += n;
  S.led.start[r] += n;
}

/* ---------------- alerts ---------------- */
function checkAlerts(S) {
  const A = [];
  for (const p of S.pstat || []) if (p[2] > p[1]) A.push({ kind: 'power', text: 'Brownout: grid supplies ' + p[1] + ' MW for ' + p[2] + ' MW of demand' });
  let starving = 0; for (const b of S.blds) if (b.type === 'house' && b.missed > 0 && b.res > 0) starving++;
  if (starving) A.push({ kind: 'food', text: starving + ' household' + (starving > 1 ? 's' : '') + ' missed meals (no bread in the pantry)' });
  for (const cyc of railDeadlocks(S)) A.push({ kind: 'rail', text: 'Rail deadlock: ' + cyc.map(i => 'Train #' + i).join(' waits for ') + ' waits for Train #' + cyc[0], ref: cyc[0] });
  for (const v of S.vehs) {
    if ((v.st === 'stranded' || v.st === 'derail' || v.st === 'hold') && (v.cargo.length || sumArr(v.own)) && v.k !== 'freighter') A.push({ kind: 'veh', text: VT[v.k].name + ' #' + v.id + ': ' + (v.ob || v.st), ref: v.id });
  }
  for (const lk of S.locks) { const n = lk.q[0].length + lk.q[1].length; if (n >= 3) A.push({ kind: 'lock', text: 'Lock #' + lk.id + ' has ' + n + ' boats queueing', ref: lk.id }); }
  for (const b of S.blds) if (BT[b.type].out && b.st === 4 && b.wk > 0) A.push({ kind: 'full', text: BT[b.type].name + ' #' + b.id + ': output full, nothing is collecting ' + RES[b.stR].name, ref: b.id });
  for (const b of S.blds) if (b.type !== 'lighthouse' && b.type !== 'tidemill' && bAcc(S, b) < 0) A.push({ kind: 'road', text: BT[b.type].name + ' #' + b.id + ' has no road access', ref: b.id });
  S.alerts = A.slice(0, 40);
}
