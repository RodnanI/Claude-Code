/* =====================================================================
   Application: menu, game start, main loop, snapshots, replay checks,
   the stress test runner, saves and settings.
   ===================================================================== */
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };

function startGame(id, opts) {
  const S = startScenario(id, opts);
  G.S = S; G.snaps = []; G.sel = null; RV.sel = null; G.conSel = 0; G.why = null; G.follow = false; G.hashShown = null; G.hashCheck = null;
  RV.walkers = []; RV.parts = []; RV.gulls = []; RV.vpos.clear(); RV._gn = null; RV._depth = null; RV._farm = null;
  takeSnap('Start');
  $('scenName').textContent = SCEN[id].name;
  setTool('inspect'); recenter();
  hideMenu(); G.tab = SCEN[id].goals || SCEN[id].kind === 'stress' ? 'goals' : 'inspect'; openPanel(G.settings.panel !== 0 || !!SCEN[id].goals);
  setSpeed(1); G.lastPanel = ''; renderPanel(true);
  if (SCEN[id].kind === 'diag') { const b = S.blds.find(x => x.type === 'bakery'); if (b) { focusBuilding(b.id); RV.cam.z = 1.4; } }
  saveAuto();
}
function recenter() {
  const S = G.S; if (!S) return;
  const m = S.blds.find(b => b.type === 'market') || S.blds[0];
  if (m) centerOnTile(m.x + 3, m.y + 4); else centerOnTile(S.W / 2, S.H / 2);
  RV.cam.z = Math.min(1.1, Math.max(0.6, (window.innerWidth || 1200) / 1500)); clampCam(S);
}
function showMenu() {
  G.menuOpen = true; $('menu').hidden = false;
  const prog = G.progress || {};
  const auto = LS.get('tidemark.auto');
  let h = '';
  if (auto && G.S && !G.S.scen.title) h += '<button class="mbtn" data-m="resume"><b>Back to the city</b><span>' + esc(SCEN[G.S.scen.id] ? SCEN[G.S.scen.id].name : '') + '</span></button>';
  else if (auto) h += '<button class="mbtn" data-m="continue"><b>Continue</b><span>last autosave</span></button>';
  h += '<h3 style="margin:14px 0 4px;font:600 12px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)">Campaign</h3>';
  for (const id of CAMPAIGN) h += '<button class="mbtn" data-m="' + id + '"><b>' + esc(SCEN[id].name) + '</b>' + (prog[id] ? '<span class="done">complete</span>' : '<span>' + esc(SCEN[id].brief.split('. ')[0]) + '.</span>') + '</button>';
  h += '<h3 style="margin:14px 0 4px;font:600 12px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)">Open play and tests</h3>';
  h += '<button class="mbtn" data-m="showcase"><b>Tidemark, free play</b><span>the finished town, all chains running</span></button>';
  h += '<div class="mbtn" style="cursor:default"><b>Sandbox</b><span>seed <input id="seedIn" type="number" value="' + (Math.floor(Math.random() * 90000) + 1000) + '"> <label><input id="infIn" type="checkbox"> unlimited money</label> <button class="btn small primary" data-m="sandbox">Start</button></span></div>';
  h += '<button class="mbtn" data-m="diag"><b>Diagnostic: the missing flour</b><span>a bridge goes, the analyser explains</span></button>';
  h += '<button class="mbtn" data-m="stress"><b>Stress test: bridges under load</b><span>delete, account, replay, compare</span></button>';
  h += '<button class="mbtn" data-m="load"><b>Load a save file</b><span>.json exported from Tidemark</span></button>';
  h += '<button class="mbtn" data-m="scene"><b>Just watch</b><span>hide everything and let the town run</span></button>';
  $('menuBody').innerHTML = h;
  $('menuBody').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const m = b.dataset.m;
    if (m === 'resume') { hideMenu(); return; }
    if (m === 'continue') { loadAuto(); return; }
    if (m === 'load') { $('fileIn').click(); return; }
    if (m === 'scene') { hideMenu(); if (G.S.scen.title) { G.S.scen.title = 0; } setSpeed(1); toggleScene(true); return; }
    if (m === 'sandbox') { startGame('sandbox', { seed: +$('seedIn').value || 1, inf: $('infIn').checked }); return; }
    startGame(m);
  };
}
function hideMenu() { G.menuOpen = false; $('menu').hidden = true; }
function toggleScene(on) { G.scene = on === undefined ? !G.scene : on; document.body.classList.toggle('scene', G.scene); if (G.scene) { toast('Living scene. Press H or Esc to return.', 2200); RV.sel = null; } }

/* ---------------- snapshots, rewind, verification ---------------- */
function takeSnap(label) {
  const S = G.S;
  G.snaps.push({ tick: S.tick, label: label + ' ' + clockStr(S.tick), text: serialize(S) });
  const auto = G.snaps.filter(s => !/^Manual/.test(s.label));
  if (G.snaps.length > 16) { const i = G.snaps.indexOf(auto[0]); G.snaps.splice(i >= 0 ? i : 0, 1); }
}
function rewindTo(i) {
  const s = G.snaps[i]; if (!s) return;
  const S = deserialize(s.text);
  G.S = S; G.snaps = G.snaps.filter(x => x.tick <= s.tick);
  RV.walkers = []; RV.parts = []; G.sel = null; RV.sel = null; G.conSel = 0; setSpeed(0);
  toast('Rewound to ' + clockStr(S.tick) + '. Anything you do now is a new future.', 3200);
  G.lastPanel = ''; renderPanel(true);
}
function* replayGen(text, acts, until) {
  const S = deserialize(text); const alen = S.acts.length;
  const todo = acts.slice(alen).filter(e => !e.sys); let i = 0;
  while (S.tick < until) {
    while (i < todo.length && todo[i].at === S.tick) { applyAction(S, todo[i].a, 0); i++; }
    step(S);
    if (S.tick % 250 === 0) yield S.tick;
  }
  while (i < todo.length && todo[i].at === S.tick) { applyAction(S, todo[i].a, 0); i++; }
  return S;
}
function runSliced(gen, onProg, onDone) {
  G.busy = true;
  const tick = () => {
    const t0 = performance.now(); let r;
    do { r = gen.next(); } while (!r.done && performance.now() - t0 < 30);
    if (r.done) { G.busy = false; onDone(r.value); } else { onProg(r.value); setTimeout(tick, 0); }
  };
  setTimeout(tick, 0);
}
function verifyReplay(i) {
  const s = G.snaps[i]; if (!s) return;
  const S = G.S; setSpeed(0);
  const target = { tick: S.tick, hash: hashState(S), dec: S.dec.h, decN: S.dec.n, au: audit(S) };
  const span = Math.max(1, S.tick - s.tick);
  showModal('<h2>Verifying replay</h2><p>Restoring "' + esc(s.label) + '" into a separate simulation and re-applying ' + S.acts.filter(a => !a.sys && a.at >= s.tick).length + ' recorded actions up to ' + esc(clockStr(S.tick)) + '.</p><div class="prog"><i id="vprog"></i></div>');
  runSliced(replayGen(s.text, S.acts, S.tick), t => { const el = $('vprog'); if (el) el.style.width = Math.min(100, (t - s.tick) * 100 / span) + '%'; }, R2 => {
    const h = hashState(R2), au = audit(R2), same = h === target.hash && R2.dec.h === target.dec;
    let diffs = 0, rows = '';
    for (let r = 0; r < NR; r++) {
      const a = target.au.rows[r], b = au.rows[r];
      const keys = ['ext', 'imp', 'prod', 'use', 'exp', 'lost', 'inB', 'inS', 'inT'];
      const d = keys.filter(k => a[k] !== b[k]); diffs += d.length;
      if (a.start + a.ext + a.imp + a.prod) rows += '<tr' + (d.length ? ' class="hl"' : '') + '><td>' + sw(r) + esc(RES[r].name) + '</td><td>' + (a.inB + a.inS + a.inT) + '</td><td>' + (b.inB + b.inS + b.inT) + '</td><td>' + a.lost + '/' + b.lost + '</td><td>' + (d.length ? '<b class="fail">' + d.join(' ') + '</b>' : 'same') + '</td></tr>';
    }
    showModal('<h2>Replay ' + (same ? '<span class="pass">identical</span>' : '<span class="fail">differs</span>') + '</h2>' +
      '<div class="kv"><span>From</span><span>' + esc(s.label) + '</span><span>To</span><span>' + esc(clockStr(target.tick)) + '</span><span>State hash</span><span class="mono">live ' + hex(target.hash) + ' / replay ' + hex(h) + '</span><span>Decisions</span><span class="mono">live ' + target.decN + ' (' + hex(target.dec) + ') / replay ' + R2.dec.n + ' (' + hex(R2.dec.h) + ')</span></div>' +
      '<h3>Goods held (live / replay)</h3><table class="t"><tr><th>Good</th><th>live</th><th>replay</th><th>lost</th><th>fields</th></tr>' + rows + '</table>' +
      '<p class="small-note">' + (same ? 'Every unit of every good, every vehicle position and every agent decision matches.' : diffs + ' ledger fields differ.') + '</p>');
  });
}

/* ---------------- stress test ---------------- */
function runStress() {
  const S = G.S; setSpeed(0);
  if (!bridgeGroups(S).length) { toast('No bridges in this city to test'); return; }
  showModal('<h2>Bridge stress test</h2><p id="sphase">Copying the city...</p><div class="prog"><i id="sprog"></i></div>');
  const t0 = S.tick;
  runSliced(stressTest(S, { after: 8 * TPH }), p => { const el = $('sphase'); if (el) el.textContent = p.phase + ' (' + clockStr(p.tick) + ')'; const b = $('sprog'); if (b) b.style.width = Math.min(95, (p.tick - t0) / (3 * TPD) * 100 + (p.phase.indexOf('replay') >= 0 ? 60 : 0)) + '%'; }, rep => showStressReport(rep));
}
function showStressReport(rep) {
  const S = rep.sim;
  let h = '<h2>Stress test: ' + (rep.same && rep.after && rep.after.ok ? '<span class="pass">every unit accounted, replay identical</span>' : '<span class="fail">see details</span>') + '</h2>';
  for (const n of rep.notes) h += '<p class="hint">' + esc(n) + '</p>';
  for (const ev of rep.events) {
    h += '<h3>' + (ev.kind === 'road' ? 'Road' : 'Railway') + ' bridge ' + esc(ev.tiles.map(t => xy(S, t)).join(' ')) + ' demolished at ' + esc(clockStr(ev.tick)) + '</h3>';
    if (ev.onBridge.length) h += '<table class="t"><tr><th>On the bridge</th><th>cargo</th><th style="text-align:left">from > to</th><th>fate</th></tr>' + ev.onBridge.map(x => '<tr><td>' + esc(VT[x.k].name) + ' #' + x.id + '</td><td>' + (x.units || 'empty') + '</td><td style="text-align:left">' + esc(x.cargo.map(c => c.q + ' ' + RES[c.r].name + ' (' + c.from + ' > ' + c.to + ')').join('; ') || '-') + '</td><td>' + (ev.survivors.find(s => s.id === x.id) ? 'survived' : '<b class="fail">lost</b>') + '</td></tr>').join('') + '</table>';
    else h += '<p class="small-note">No vehicle was on the span.</p>';
    h += '<p class="mono">' + ev.lines.map(esc).join('<br>') + '</p>';
    h += '<p>Units aboard destroyed vehicles: <b>' + ev.aboardDestroyed + '</b>. Units booked as lost by this demolition: <b>' + ev.lostUnits + '</b> ' + (ev.aboardDestroyed === ev.lostUnits ? '<span class="pass">match</span>' : '<span class="fail">mismatch</span>') + '</p>';
  }
  if (rep.rerouted.length || rep.diverted.length) h += '<h3>Cargo that found another way</h3><div class="mono" style="font-size:11.5px">' + rep.rerouted.slice(0, 12).map(x => '#' + x.con + ' ' + x.q + ' ' + esc(RES[x.r].name) + ': ' + esc(x.note)).concat(rep.diverted.slice(0, 8).map(x => '#' + x.con + ' ' + x.q + ' ' + esc(RES[x.r].name) + ': ' + esc(x.note))).join('<br>') + '</div>';
  if (rep.after) {
    h += '<h3>Ledger ' + Math.round((rep.endTick - rep.snapTick) / TPH) + ' hours after the first demolition</h3><table class="t"><tr><th>Good</th><th>sources</th><th>used</th><th>exp</th><th>lost</th><th>held</th><th>in transit</th><th>diff</th></tr>';
    for (const r of rep.after.rows) { const src = r.start + r.ext + r.imp + r.prod; if (!src) continue; h += '<tr' + (r.lost ? ' class="hl"' : '') + '><td>' + sw(r.r) + esc(RES[r.r].name) + '</td><td>' + src + '</td><td>' + r.use + '</td><td>' + r.exp + '</td><td>' + r.lost + '</td><td>' + (r.inB + r.inS) + '</td><td>' + r.inT + '</td><td>' + (r.disc ? '<b class="fail">' + r.disc + '</b>' : '0') + '</td></tr>'; }
    h += '</table>';
  }
  h += '<h3>Replay from the snapshot</h3><div class="kv"><span>Snapshot</span><span>' + esc(clockStr(rep.snapTick)) + '</span><span>State hash</span><span class="mono">' + hex(rep.liveHash) + ' vs ' + hex(rep.replayHash) + '</span><span>Decisions</span><span class="mono">' + rep.liveDecN + ' vs ' + rep.replayDecN + '</span><span>Differences</span><span>' + (rep.diffs.length ? rep.diffs.map(esc).join('<br>') : 'none: same losses, same reroutes, same positions') + '</span></div>';
  h += '<div class="row"><button class="btn primary" id="stressOpen">Open the city after the test</button></div><p class="small-note">Your own city was not changed. Opening the tested copy lets you inspect wrecks, diverted cargo and the loss entries in the ledger.</p>';
  showModal(h);
  $('stressOpen').onclick = () => { G.S = rep.sim; G.snaps = []; takeSnap('After stress test'); $('modal').hidden = true; G.lastPanel = ''; G.tab = 'ledger'; openPanel(true); renderPanel(true); setSpeed(0); };
}
function showModal(html) { $('modalBody').innerHTML = html; $('modal').hidden = false; }

/* ---------------- saves ---------------- */
function saveText() {
  const snaps = G.snaps.slice(-4).map(s => ({ tick: s.tick, label: s.label, text: s.text }));
  return JSON.stringify({ format: 'tidemark-save', version: 1, state: serialize(G.S), snaps });
}
function loadText(txt) {
  const o = JSON.parse(txt);
  if (o.format !== 'tidemark-save' || typeof o.state !== 'string') throw new Error('Not a Tidemark save');
  const S = deserialize(o.state);
  if (!S.W || !S.ter || !S.blds || !SCEN[S.scen && S.scen.id]) throw new Error('Save is damaged');
  G.S = S; G.snaps = (o.snaps || []).filter(s => typeof s.text === 'string');
  if (!G.snaps.length) takeSnap('Loaded');
  $('scenName').textContent = SCEN[S.scen.id].name;
  RV.walkers = []; RV.parts = []; RV._gn = null; G.sel = null; RV.sel = null;
  hideMenu(); recenter(); setSpeed(0); G.lastPanel = ''; renderPanel(true);
  toast('Loaded ' + clockStr(S.tick));
}
function exportSave() {
  const blob = new Blob([saveText()], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'tidemark-' + G.S.scen.id + '-day' + (Math.floor(G.S.tick / TPD) + 1) + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function saveAuto() { if (G.S && !G.S.scen.title) LS.set('tidemark.auto', saveText()); }
function loadAuto() { const t = LS.get('tidemark.auto'); if (!t) return; try { loadText(t); } catch (e) { toast('Autosave unreadable: ' + e.message); } }
function applySettings() {
  RV.q = G.settings.q; RV.wxOn = G.settings.wx; RV.walkDensity = [0, 0.5, 1.2][G.settings.walk];
  if (!RV.walkDensity) RV.walkers = [];
  resizeView(); LS.set('tidemark.settings', JSON.stringify(G.settings));
}

/* ---------------- main loop ---------------- */
let lastT = 0, acc = 0, frames = 0, fpsT = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - (lastT || now)) / 1000); lastT = now;
  const S = G.S;
  if (S && !G.busy) {
    const tps = 10 * G.speeds[G.speed];
    acc += dt * tps;
    let n = 0, t0 = performance.now();
    const maxN = Math.max(2, Math.ceil(tps / 20));
    while (acc >= 1 && n < maxN) {
      try { step(S); } catch (err) { console.error(err); setSpeed(0); acc = 0; toast('Simulation halted: ' + err.message + '. Rewind to a snapshot from the Time tab.', 8000); break; }
      acc -= 1; n++;
      if (S.tick % TPD === 0) { takeSnap('Midnight'); if (!S.scen.title) saveAuto(); }
      if (S.scen.won && !G.progress[S.scen.id]) { G.progress[S.scen.id] = 1; LS.set('tidemark.progress', JSON.stringify(G.progress)); toast(SCEN[S.scen.id].name + ': chapter complete', 4000); G.tab = 'goals'; openPanel(true); }
      if (performance.now() - t0 > 22) { acc = Math.min(acc, 2); break; }
    }
    if (!G.speed) acc = 0;
    RV.alpha = G.speed ? Math.min(1, acc) : 0;
    if (G.follow && G.sel && G.sel.v) { const v = vById(S, G.sel.v); if (v) { const p = v.k === 'train' ? trainCars(S, v)[0] : vehPos(S, v); if (p) { const w = P(p.x, p.y, 0); RV.cam.x += (w[0] - RV.cam.x) * 0.15; RV.cam.y += (w[1] - RV.cam.y) * 0.15; } } }
    if (G.S.scen.title && !G.menuOpen) G.S.scen.title = 0;
    if (G.scene || G.menuOpen) sceneTour(S, dt);
    updateWalkers(S, dt * (G.speed ? Math.min(3, G.speeds[G.speed]) : 0.0001));
    renderFrame(S, dt);
    updateTop();
    renderPanel(false);
  }
  frames++; if (now - fpsT > 1000) { window.__perf = { fps: frames, tick: S ? S.tick : 0, vehicles: S ? S.vehs.length : 0 }; frames = 0; fpsT = now; }
  requestAnimationFrame(loop);
}
function boot() {
  try { const s = JSON.parse(LS.get('tidemark.settings') || 'null'); if (s) Object.assign(G.settings, s); } catch (e) { /* defaults */ }
  try { G.progress = JSON.parse(LS.get('tidemark.progress') || '{}') || {}; } catch (e) { G.progress = {}; }
  buildChrome(); bindInput(); setupCanvas($('view')); applySettings();
  $('fileIn').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { loadText(rd.result); } catch (err) { toast('Could not load: ' + err.message, 4000); } }; rd.readAsText(f); e.target.value = ''; };
  // the title screen runs the finished town underneath
  const q = new URLSearchParams(location.search);
  const S = startScenario('showcase'); S.scen.title = 1; G.S = S;
  const warm = +(q.get('t') || 900); for (let i = 0; i < warm; i++) step(S);
  takeSnap('Start'); recenter(); RV.cam.z = +(q.get('z') || RV.cam.z);
  if (q.get('x')) centerOnTile(+q.get('x'), +q.get('y'));
  setSpeed(1); syncChrome();
  if (q.get('play')) { startGame(q.get('play')); }
  else showMenu();
  if (q.get('nomenu')) { hideMenu(); G.S.scen.title = 0; }
  requestAnimationFrame(loop);
}
window.addEventListener('DOMContentLoaded', boot);

/* living scene: drift between landmarks, lingering a while at each */
function sceneTour(S, dt) {
  const T0 = RV.tour || (RV.tour = { i: 0, t: 0 });
  const pts = [];
  for (const type of ['quay', 'market', 'station2', 'station', 'wharf', 'lighthouse', 'steelworks', 'mill']) { const b = S.blds.find(x => x.type === type); if (b) pts.push([b.x + b.w / 2 + 2, b.y + b.h / 2 + 1]); }
  for (const lk of S.locks) pts.push([lk.t % S.W, (lk.t / S.W) | 0]);
  if (!pts.length) return;
  T0.t += dt;
  if (T0.t > 24) { T0.t = 0; T0.i = (T0.i + 1) % pts.length; }
  const [x, y] = pts[T0.i % pts.length], w = P(x, y, 0);
  const k = Math.min(1, dt * 0.25);
  RV.cam.x += (w[0] - RV.cam.x) * k; RV.cam.y += (w[1] - RV.cam.y) * k;
  RV.cam.z += ((G.scene ? 1.25 : 0.95) - RV.cam.z) * k * 0.5;
}
