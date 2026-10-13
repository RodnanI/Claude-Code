/* =====================================================================
   Input: mouse, touch, pen and keyboard.
   ===================================================================== */
const PT = { down: new Map(), mode: null, start: null, moved: false, line: null, rect: null, pinch: null, touch: false, placeAt: null };
function tileOf(sx, sy) { const [fx, fy] = screenToTile(sx, sy); return [Math.round(fx), Math.round(fy)]; }
function linePath(a, b, first) {
  const out = []; let [x, y] = a; const [bx, by] = b;
  const ax = first || (Math.abs(bx - x) >= Math.abs(by - y) ? 'x' : 'y');
  const S = G.S, push = () => { if (inb(S, x, y)) out.push(y * S.W + x); };
  push();
  const stepX = () => { while (x !== bx) { x += Math.sign(bx - x); push(); } };
  const stepY = () => { while (y !== by) { y += Math.sign(by - y); push(); } };
  if (ax === 'x') { stepX(); stepY(); } else { stepY(); stepX(); }
  return out;
}
function lineGhost() {
  const S = G.S, L = PT.line; if (!L) return;
  const tiles = linePath(L.a, L.b, L.first);
  let cost = 0, ok = true, n = 0;
  for (const t of tiles) {
    const wat = isWater(S.ter[t]);
    if (G.tool === 'road') { if (S.road[t]) continue; if (!roadOk(S, t)) ok = false; else { cost += wat ? COST.roadBridge : COST.road; n++; } }
    else if (G.tool === 'rail') { if (!railOkTile(S, t)) ok = false; else if (!S.rail[t]) { cost += wat ? COST.railBridge : COST.rail; n++; } }
    else if (G.tool === 'canal') { if (canalOk(S, t)) { cost += COST.canal; n++; } }
    else if (G.tool === 'power') { if (!S.pow[t] && !S.bld[t] && S.ter[t] === T_LAND) { cost += COST.power; n++; } }
  }
  if (G.tool === 'canal' && !n) ok = false;
  const broke = !S.flags.inf && cost > S.money;
  RV.ghost = { tiles, ok: ok && !broke, label: (n ? n + ' tiles, ' + fmt(cost) + ' cr' : 'nothing new') + (broke ? ' (not enough money)' : '') };
}
function rectTiles() {
  const S = G.S, R2 = PT.rect, x0 = Math.min(R2.a[0], R2.b[0]), x1 = Math.max(R2.a[0], R2.b[0]), y0 = Math.min(R2.a[1], R2.b[1]), y1 = Math.max(R2.a[1], R2.b[1]);
  const out = []; for (let y = Math.max(0, y0); y <= Math.min(S.H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(S.W - 1, x1); x++) out.push(y * S.W + x);
  return out.slice(0, 600);
}
function rectGhost() { const tiles = rectTiles(); let n = 0; for (const t of tiles) if (G.S.road[t] || G.S.rail[t] || G.S.bld[t] || G.S.pow[t] || G.S.tree[t] || G.S.ter[t] === T_CANAL || G.S.ter[t] === T_LOCK) n++; RV.ghost = { tiles, ok: n > 0, label: 'clear ' + n + ' tiles' }; }
function placeGhost(x, y) {
  const S = G.S, def = BT[G.bt]; if (!def) return;
  const [w, h] = footprint(def, G.rot);
  const ox = x - Math.floor((w - 1) / 2), oy = y - Math.floor((h - 1) / 2);
  const c = canPlace(S, G.bt, ox, oy, G.rot);
  const broke = c.ok && !S.flags.inf && def.cost > S.money;
  PT.placeAt = [ox, oy];
  RV.ghost = { rect: [ox, oy, w, h], ok: c.ok && !broke, bt: G.bt, rot: G.rot, label: def.name + ': ' + (c.ok ? (broke ? 'not enough money' : fmt(def.cost) + ' cr') : c.why) };
}
function showConfirm(text, okLabel, onOk, rotate) {
  $('confirmText').textContent = text; $('cfOk').textContent = okLabel; $('cfRotate').hidden = !rotate;
  $('confirmBar').hidden = false; G.confirm = onOk;
}
function hideConfirm() { $('confirmBar').hidden = true; G.confirm = null; }

function tapTile(sx, sy) {
  const S = G.S, [x, y] = tileOf(sx, sy); if (!inb(S, x, y)) return;
  const t = y * S.W + x;
  if (G.tool === 'inspect' || G.tool === 'build') { select(pickAt(S, sx, sy)); return; }
  if (G.tool === 'signal') {
    if (!S.rail[t]) { toast('Signals go on straight track'); return; }
    const m = S.rail[t], seq = m === 10 ? [1, 3] : m === 5 ? [2, 0] : null;
    if (!seq) { toast('Signals need straight track (no junctions or curves)'); return; }
    const cur = S.sig[t] ? S.sig[t] - 1 : -1;
    const nx = cur < 0 ? seq[0] : cur === seq[0] ? seq[1] : -1;
    const r = act({ type: 'signal', t, d: nx });
    if (r.ok) toast(nx < 0 ? 'Signal removed' : 'One-way signal: trains may pass heading ' + DIRN[nx]);
    return;
  }
  if (G.tool === 'lock') { const r = act({ type: 'lock', t }); if (r.ok) toast('Lock built. It cycles boats between the canal and the tide.'); return; }
}
function select(p) {
  G.sel = p; RV.sel = p; G.conSel = 0; G.why = null; G.lastPanel = '';
  if (p) { G.tab = 'inspect'; openPanel(true); }
  syncChrome(); renderPanel(true);
}

function bindInput() {
  const cv = $('view');
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (G.menuOpen) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
    PT.down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PT.down.size === 2) {
      const [a, b] = [...PT.down.values()];
      PT.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: RV.cam.z, w: screenToWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
      PT.mode = 'pinch'; if (G.tool !== 'place') RV.ghost = null; PT.line = null; PT.rect = null; return;
    }
    if (PT.down.size > 2) return;
    PT.touch = e.pointerType !== 'mouse'; PT.start = { x: e.clientX, y: e.clientY }; PT.moved = false;
    if (!PT.touch && (e.button === 1 || e.button === 2)) { PT.mode = 'pan'; return; }
    const tl = tileOf(e.clientX, e.clientY);
    if (G.tool === 'road' || G.tool === 'rail' || G.tool === 'canal' || G.tool === 'power') { PT.mode = 'line'; PT.line = { a: tl, b: tl, first: null }; lineGhost(); }
    else if (G.tool === 'bulldoze') { PT.mode = 'rect'; PT.rect = { a: tl, b: tl }; rectGhost(); }
    else if (G.tool === 'place') { PT.mode = 'place'; placeGhost(tl[0], tl[1]); }
    else PT.mode = 'tap';
  });
  cv.addEventListener('pointermove', e => {
    if (G.menuOpen) return;
    const prev = PT.down.get(e.pointerId);
    const tl = tileOf(e.clientX, e.clientY);
    RV.hoverT = inb(G.S, tl[0], tl[1]) ? tl[1] * G.S.W + tl[0] : -1;
    if (!prev) {                          // hover with mouse
      if (G.tool === 'place' && !PT.touch) placeGhost(tl[0], tl[1]);
      return;
    }
    PT.down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PT.mode === 'pinch' && PT.down.size >= 2) {
      const [a, b] = [...PT.down.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      RV.cam.z = Math.max(0.35, Math.min(3.5, PT.pinch.z * d / Math.max(10, PT.pinch.d)));
      const w = screenToWorld(cx, cy); RV.cam.x += PT.pinch.w[0] - w[0]; RV.cam.y += PT.pinch.w[1] - w[1]; clampCam(G.S);
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.hypot(e.clientX - PT.start.x, e.clientY - PT.start.y) > 7) PT.moved = true;
    if (PT.mode === 'pan' || (PT.mode === 'tap' && PT.moved)) { PT.mode = 'pan'; RV.cam.x -= dx / RV.cam.z; RV.cam.y -= dy / RV.cam.z; G.follow = false; clampCam(G.S); return; }
    if (PT.mode === 'line') { if (!PT.line.first && (tl[0] !== PT.line.a[0] || tl[1] !== PT.line.a[1])) PT.line.first = Math.abs(tl[0] - PT.line.a[0]) >= Math.abs(tl[1] - PT.line.a[1]) ? 'x' : 'y'; PT.line.b = tl; lineGhost(); }
    else if (PT.mode === 'rect') { PT.rect.b = tl; rectGhost(); }
    else if (PT.mode === 'place') placeGhost(tl[0], tl[1]);
  });
  const up = e => {
    if (!PT.down.has(e.pointerId)) return;
    PT.down.delete(e.pointerId);
    if (PT.mode === 'pinch') { if (!PT.down.size) PT.mode = null; return; }
    const m = PT.mode; PT.mode = null;
    if (m === 'tap' && !PT.moved) tapTile(e.clientX, e.clientY);
    else if (m === 'line') {
      const tiles = linePath(PT.line.a, PT.line.b, PT.line.first); const tool = G.tool; PT.line = null;
      if (tool === 'rail' && tiles.length < 2) { RV.ghost = null; toast('Drag across two or more tiles to lay track'); return; }
      act({ type: tool, tiles }); RV.ghost = null;
    } else if (m === 'rect') {
      const tiles = rectTiles(); PT.rect = null;
      if (PT.touch || tiles.length > 1) { const n = RV.ghost ? RV.ghost.label : ''; showConfirm(n.charAt(0).toUpperCase() + n.slice(1) + '?', 'Clear', () => { act({ type: 'bulldoze', tiles }); RV.ghost = null; }, false); }
      else { act({ type: 'bulldoze', tiles }); RV.ghost = null; }
    } else if (m === 'place') {
      if (PT.touch) showConfirm(RV.ghost ? RV.ghost.label : '', 'Build', () => placeNow(), true);
      else placeNow();
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    e.preventDefault(); if (G.menuOpen) return;
    const before = screenToWorld(e.clientX, e.clientY);
    RV.cam.z = Math.max(0.35, Math.min(3.5, RV.cam.z * Math.exp(-e.deltaY * 0.0015)));
    const after = screenToWorld(e.clientX, e.clientY);
    RV.cam.x += before[0] - after[0]; RV.cam.y += before[1] - after[1]; clampCam(G.S);
  }, { passive: false });
  $('cfOk').onclick = () => { const f = G.confirm; hideConfirm(); if (f) f(); };
  $('cfCancel').onclick = () => { hideConfirm(); if (G.tool !== 'place') RV.ghost = null; };
  $('cfRotate').onclick = () => { G.rot ^= 1; if (PT.placeAt) { const def = BT[G.bt]; const [w, h] = footprint(def, G.rot); placeGhost(PT.placeAt[0] + Math.floor((w - 1) / 2), PT.placeAt[1] + Math.floor((h - 1) / 2)); $('confirmText').textContent = RV.ghost.label; } };
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', () => { resizeView(); });
}
function placeNow() {
  if (!PT.placeAt || !G.bt) return;
  const r = act({ type: 'place', bt: G.bt, x: PT.placeAt[0], y: PT.placeAt[1], rot: G.rot });
  if (r.ok) { toast(BT[G.bt].name + ' built'); if (PT.touch) RV.ghost = null; if (G.bt !== 'house' && !narrow()) { select({ b: r.b.id }); } }
}
function onKey(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key;
  if (k === 'Escape') { if (!$('modal').hidden) { $('modal').hidden = true; return; } if (G.confirm) { hideConfirm(); return; } if (G.tool !== 'inspect') { setTool('inspect'); return; } if (G.scene) { toggleScene(); return; } if (!G.menuOpen) showMenu(); else if (G.S && G.S.scen) hideMenu(); return; }
  if (G.menuOpen) return;
  const pan = 60 / RV.cam.z;
  if (k === ' ') { e.preventDefault(); setSpeed(G.speed ? 0 : (G.lastSpeed || 1)); if (G.speed) G.lastSpeed = G.speed; return; }
  if (k >= '1' && k <= '5') { setSpeed(+k); return; }
  if (k === '0') { setSpeed(0); return; }
  if (k === 'ArrowLeft' || k === 'a') { RV.cam.x -= pan; return; } if (k === 'ArrowRight' || k === 'd') { RV.cam.x += pan; return; }
  if (k === 'ArrowUp' || k === 'w') { RV.cam.y -= pan; return; } if (k === 'ArrowDown' || k === 's') { RV.cam.y += pan; return; }
  if (k === '+' || k === '=') { RV.cam.z = Math.min(3.5, RV.cam.z * 1.15); return; } if (k === '-') { RV.cam.z = Math.max(0.35, RV.cam.z / 1.15); return; }
  if (k === 'h' || k === 'H') { toggleScene(); return; }
  if (k === 'f' || k === 'F') { G.follow = !G.follow; return; }
  const low = k.toLowerCase();
  if (low === 'r' && G.tool === 'place') { G.rot ^= 1; const tl = RV.hoverT >= 0 ? [RV.hoverT % G.S.W, (RV.hoverT / G.S.W) | 0] : null; if (tl) placeGhost(tl[0], tl[1]); return; }
  const map = { i: 'inspect', r: 'road', t: 'rail', g: 'signal', c: 'canal', l: 'lock', p: 'power', b: 'build', x: 'bulldoze' };
  if (map[low]) setTool(map[low]);
}

/* panel buttons */
function panelClick(e) {
  const el = e.target.closest('[data-a]'); if (!el) return;
  e.preventDefault();
  const a = el.dataset.a, id = +el.dataset.id, S = G.S;
  switch (a) {
    case 'selb': select({ b: id }); focusBuilding(id); break;
    case 'selv': select({ v: id }); break;
    case 'selc': G.conSel = id; G.lastPanel = ''; renderPanel(true); break;
    case 'unc': G.conSel = 0; G.lastPanel = ''; renderPanel(true); break;
    case 'sellk': { const lk = S.locks.find(l => l.id === id); if (lk) { select({ l: id, t: lk.t }); centerOnTile(lk.t % S.W, (lk.t / S.W) | 0); } break; }
    case 'follow': G.follow = !G.follow; G.lastPanel = ''; break;
    case 'sell': act({ type: 'sell', v: id }); break;
    case 'scrap': showModal('<h2>Scrap ' + esc(vName(vById(S, id)) || 'vehicle') + '?</h2><p>The vehicle is destroyed. Any cargo aboard is booked in the ledger as an explicit loss.</p><div class="row"><button class="btn primary" id="doScrap">Scrap it</button></div>'); $('doScrap').onclick = () => { act({ type: 'scrap', v: id }); $('modal').hidden = true; }; break;
    case 'why': G.why = { b: id, r: +el.dataset.r }; G.lastPanel = ''; renderPanel(true); break;
    case 'buy': { const r = act({ type: 'buy', vk: el.dataset.k, b: id }); if (r.ok) toast(VT[el.dataset.k].name + ' bought'); break; }
    case 'demolish': { const b = bById(S, id); let held = 0; if (b) { held = sumArr(b.inv) + sumArr(b.out) + (b.exp ? sumArr(b.exp) : 0) + trQty(S, b); }
      showModal('<h2>Demolish ' + esc(bName(b)) + '?</h2><p>' + (held ? held + ' units of goods inside will be destroyed and booked as a loss. ' : '') + 'Consignments heading here will be diverted to storage.</p><div class="row"><button class="btn primary" id="doDemo">Demolish</button></div>');
      $('doDemo').onclick = () => { act({ type: 'bulldoze', tiles: [b.y * S.W + b.x] }); $('modal').hidden = true; select(null); }; break; }
    case 'want': { const b = bById(S, id); if (b) act({ type: 'want', b: id, r: +el.dataset.r, n: b.want[+el.dataset.r] + (+el.dataset.d) }, true); break; }
    case 'trade': { const r = +el.dataset.r, imp = +el.dataset.imp; act({ type: 'trade', imp, r, n: (imp ? S.trade.imp[r] : S.trade.exp[r]) + (+el.dataset.d) }, true); break; }
    case 'alert': { const k = el.dataset.k; if (!id) break; if (k === 'veh' || k === 'rail') select({ v: id }); else if (k === 'lock') { const lk = S.locks.find(l => l.id === id); if (lk) select({ l: id, t: lk.t }); } else { select({ b: id }); focusBuilding(id); } break; }
    case 'hash': G.hashShown = { t: S.tick, h: hashState(S) }; G.lastPanel = ''; break;
    case 'snap': takeSnap('Manual'); toast('Snapshot taken'); break;
    case 'rewind': rewindTo(+el.dataset.i); break;
    case 'verify': verifyReplay(+el.dataset.i); break;
    case 'next': { const i = CAMPAIGN.indexOf(S.scen.id); if (i >= 0 && i + 1 < CAMPAIGN.length) startGame(CAMPAIGN[i + 1]); break; }
    case 'stress': runStress(); break;
    case 'q': G.settings.q = +el.dataset.i; applySettings(); break;
    case 'wxv': G.settings.wx = +el.dataset.i; applySettings(); break;
    case 'walk': G.settings.walk = +el.dataset.i; applySettings(); break;
    case 'hashcheck': { const h1 = hashState(S); const q0 = G.settings.q; G.settings.q = (q0 + 1) % 3; applySettings(); renderFrame(S, 0); G.settings.q = q0; applySettings(); const h2 = hashState(S); G.hashCheck = { same: h1 === h2, text: h1 === h2 ? 'unchanged (' + hex(h1) + ')' : 'changed' }; G.lastPanel = ''; break; }
    case 'ov': RV.showNet = el.dataset.k; syncChrome(); break;
    case 'export': exportSave(); break;
    case 'import': $('fileIn').click(); break;
    case 'scene': toggleScene(); break;
    case 'recenter': recenter(); break;
  }
  G.lastPanel = ''; renderPanel(true);
}
function focusBuilding(id) { const b = bById(G.S, id); if (b) centerOnTile(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2); }
