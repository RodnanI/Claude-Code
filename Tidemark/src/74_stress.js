/* =====================================================================
   Stress test: demolish bridges while loaded vehicles are on them,
   account for every unit, then replay the same demolition from the
   snapshot in a fresh simulation and compare outcomes.
   Written as a generator so the UI can run it in slices.
   ===================================================================== */

function bridgeGroups(S) {
  const seen = new Uint8Array(S.W * S.H), out = [];
  for (const kind of ['road', 'rail']) {
    seen.fill(0);
    const layer = S[kind];
    for (let t = 0; t < S.W * S.H; t++) {
      if (!layer[t] || !isWater(S.ter[t]) || seen[t]) continue;
      const g = [], q = [t]; seen[t] = 1;
      while (q.length) { const u = q.pop(); g.push(u); for (let d = 0; d < 4; d++) { const n = nb(S, u, d); if (n >= 0 && !seen[n] && layer[n] && isWater(S.ter[n])) { seen[n] = 1; q.push(n); } } }
      g.sort((a, b) => a - b);
      out.push({ kind, tiles: g });
    }
  }
  return out;
}
function loadedOn(S, tiles) {
  const out = [];
  for (const v of S.vehs) {
    const on = v.k === 'train' ? v.tiles.some(t => tiles.indexOf(t) >= 0) : (v.st === 'go' || v.st === 'hold' || v.st === 'stranded') && tiles.indexOf(v.t) >= 0;
    if (!on) continue;
    const cargo = [];
    for (const id of v.cargo) { const c = cById(S, id); if (c) cargo.push({ con: c.id, r: c.r, q: c.q, from: bName(bById(S, c.o)), to: bName(bById(S, c.d)) }); }
    for (let r = 0; r < NR; r++) if (v.own[r]) cargo.push({ con: 0, r, q: v.own[r], from: 'own cargo', to: '' });
    out.push({ id: v.id, k: v.k, cargo, units: cargo.reduce((a, c) => a + c.q, 0) });
  }
  return out;
}
function invSnapshot(S) {
  const au = audit(S);
  return { rows: au.rows.map(r => Object.assign({}, r)), ok: au.ok, issues: au.issues.slice(), tick: S.tick };
}
function conSummary(S) {
  const m = {};
  for (const c of S.cons) { m[c.id] = c.st + ':' + c.at + ':' + c.veh + ':' + c.li; }
  return m;
}
/* opts: { pick: 'auto' | [groupIndex...], wait: ticks, after: ticks } */
function* stressTest(S0, opts) {
  opts = opts || {};
  const W = deserialize(serialize(S0));
  const groups = bridgeGroups(W);
  const report = { groups: groups.map(g => ({ kind: g.kind, tiles: g.tiles.slice() })), events: [], notes: [] };
  if (!groups.length) { report.notes.push('This city has no bridges to demolish.'); return report; }
  let targets = groups;
  if (Array.isArray(opts.pick)) targets = opts.pick.map(i => groups[i]).filter(Boolean);
  const waitMax = opts.wait || 2 * TPD, after = opts.after || 6 * TPH;
  let snap = null, snapTick = 0;
  const lostBefore = W.led.lost.slice();
  for (const g of targets) {
    // advance until a loaded vehicle is on this bridge
    let waited = 0, on = loadedOn(W, g.tiles).filter(x => x.units > 0);
    while (!on.length && waited < waitMax) {
      step(W); waited++;
      if (waited % 200 === 0) yield { phase: 'waiting for loaded traffic on the ' + g.kind + ' bridge', tick: W.tick };
      on = loadedOn(W, g.tiles).filter(x => x.units > 0);
    }
    if (!snap) { snap = serialize(W); snapTick = W.tick; report.before = invSnapshot(W); report.snapTick = snapTick; }
    const all = loadedOn(W, g.tiles);
    const ev = { kind: g.kind, tiles: g.tiles.slice(), tick: W.tick, onBridge: all, waited, lines: [] };
    if (!on.length) report.notes.push('No loaded vehicle used the ' + g.kind + ' bridge within ' + Math.round(waitMax / TPH) + ' hours; it was demolished anyway.');
    const lost0 = W.led.lost.slice();
    const r = applyAction(W, { type: 'bulldoze', tiles: g.tiles });
    ev.lines = r.rep.slice();
    ev.lost = W.led.lost.map((n, i) => n - lost0[i]);
    ev.lostUnits = ev.lost.reduce((a, b) => a + b, 0);
    // every unit that was aboard a destroyed vehicle must appear as a loss
    let aboardDestroyed = 0;
    for (const x of all) if (!vById(W, x.id)) aboardDestroyed += x.units;
    ev.aboardDestroyed = aboardDestroyed;
    ev.survivors = all.filter(x => vById(W, x.id)).map(x => { const v = vById(W, x.id); return { id: x.id, k: x.k, units: x.units, st: v.st, ob: v.ob }; });
    report.events.push(ev);
    yield { phase: 'demolished the ' + g.kind + ' bridge', tick: W.tick };
  }
  // let the consequences play out
  const tEnd = W.tick + after;
  while (W.tick < tEnd) { step(W); if (W.tick % 200 === 0) yield { phase: 'running the aftermath', tick: W.tick }; }
  report.after = invSnapshot(W);
  report.lostTotal = W.led.lost.map((n, i) => n - lostBefore[i]);
  report.lossLog = W.lossLog.filter(e => e.t >= snapTick);
  report.diverted = W.hist.filter(c => c.t1 >= snapTick && c.st === 'diverted').map(c => ({ con: c.id, r: c.r, q: c.q, note: c.log[c.log.length - 1][1] }));
  report.rerouted = [];
  for (const c of W.cons.concat(W.hist)) for (const L of c.log) if (L[0] >= snapTick && /re-routed|diverting|re-planned/.test(L[1])) { report.rerouted.push({ con: c.id, r: c.r, q: c.q, note: L[1] }); break; }
  report.endTick = W.tick;
  report.liveHash = hashState(W); report.liveDec = W.dec.h; report.liveDecN = W.dec.n;
  yield { phase: 'replaying from the snapshot', tick: W.tick };
  // replay: fresh simulation from the snapshot text, same recorded actions
  const R2 = replay(snap, W.acts, W.tick);
  report.replayHash = hashState(R2); report.replayDec = R2.dec.h; report.replayDecN = R2.dec.n;
  report.replayAfter = invSnapshot(R2);
  report.same = report.replayHash === report.liveHash && report.replayDec === report.liveDec;
  const diffs = [];
  for (let r = 0; r < NR; r++) {
    const a = report.after.rows[r], b = report.replayAfter.rows[r];
    for (const k of ['inB', 'inS', 'inT', 'lost', 'use', 'prod', 'ext', 'imp', 'exp']) if (a[k] !== b[k]) diffs.push(RES[r].name + ' ' + k + ': ' + a[k] + ' vs ' + b[k]);
  }
  const ca = conSummary(W), cb = conSummary(R2);
  for (const id in ca) if (ca[id] !== cb[id]) diffs.push('consignment #' + id + ': ' + ca[id] + ' vs ' + (cb[id] || 'missing'));
  for (const v of W.vehs) { const u = vById(R2, v.id); if (!u || u.t !== v.t || u.p !== v.p || u.st !== v.st) diffs.push(VT[v.k].name + ' #' + v.id + ' differs'); }
  report.diffs = diffs.slice(0, 40);
  report.sim = W;
  return report;
}
function runToEnd(gen) { let r = gen.next(); while (!r.done) r = gen.next(); return r.value; }
