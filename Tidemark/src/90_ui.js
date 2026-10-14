/* =====================================================================
   INTERFACE. All changes to the city go through act(), which records the
   action in the simulation's log.
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = n => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const G = {
  S: null, speed: 1, speeds: [0, 1, 3, 8, 20, 50], tool: 'inspect', bt: null, rot: 0, sel: null, tab: 'inspect',
  snaps: [], follow: false, scene: false, menuOpen: true, lastPanel: '', panelAt: 0, why: null, conSel: 0, busy: false,
  settings: { q: 2, wx: 1, walk: 1, panel: 1 }, progress: {},
};
const ICON = {
  inspect: '<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20 20"/>',
  road: '<path d="M4 21 9 3M20 21 15 3"/><path d="M12 5v3M12 11v3M12 17v3"/>',
  rail: '<path d="M7 3 5 21M17 3l2 18M5.6 7h12.8M5.2 12h13.6M4.8 17h14.4"/>',
  signal: '<rect x="8" y="2.5" width="8" height="12" rx="2"/><circle cx="12" cy="6.3" r="1.6"/><circle cx="12" cy="10.7" r="1.6"/><path d="M12 14.5V21M8 21h8"/>',
  canal: '<path d="M3 8c3-2 6 2 9 0s6 2 9 0M3 13c3-2 6 2 9 0s6 2 9 0M3 18c3-2 6 2 9 0s6 2 9 0"/>',
  lock: '<path d="M4 4v16M20 4v16M4 9h16M4 15h16"/><path d="M9 9v6M15 9v6"/>',
  power: '<path d="M12 2v20M6 6h12M8 10h8"/><path d="M6 6 3 9M18 6l3 3"/>',
  build: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  bulldoze: '<path d="M4 15h11l3-5h3M4 15v4h14v-4"/><circle cx="7" cy="19" r="1.4"/><circle cx="15" cy="19" r="1.4"/><path d="M4 15 2 9h6l2 6"/>',
  panel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  vehicle: '<rect x="2" y="8" width="12" height="8" rx="1"/><path d="M14 11h4l3 3v2h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
};
function junctionText(S, t) {
  const jb = roadNet(S).jb; let n = 0; for (let i = 0; i < jb.length; i++) if (jb[i] === jb[t]) n++;
  return n > 1 ? 'part of a ' + n + '-tile junction block (trucks reserve every tile they cross in it; paved blocks are slow)' : 'junction (one truck at a time)';
}
function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[n] || '') + '</svg>'; }
const TOOLS = [
  ['inspect', 'Inspect', 'I'], ['road', 'Road', 'R'], ['rail', 'Rail', 'T'], ['signal', 'Signal', 'G'], ['canal', 'Canal', 'C'],
  ['lock', 'Lock', 'L'], ['power', 'Power', 'P'], ['build', 'Build', 'B'], ['bulldoze', 'Clear', 'X'],
];
const PAL = [
  ['Homes and food', ['house', 'market', 'farm', 'mill', 'bakery']],
  ['Raw materials', ['forester', 'claypit', 'coalmine', 'oremine']],
  ['Industry', ['sawmill', 'joinery', 'brickworks', 'steelworks', 'toolworks']],
  ['Power', ['powerplant', 'tidemill']],
  ['Logistics', ['depot', 'warehouse', 'station', 'station2', 'quay', 'wharf']],
];
function recipeText(bt) {
  const d = BT[bt]; const r = q => q.map(([res, n]) => n + ' ' + RES[res].name).join(' + ');
  if (d.out) return (d.inp ? r(d.inp) + ' > ' : '') + r(d.out) + ' / ' + d.dur + 't';
  if (d.gen) return d.tidal ? 'up to ' + d.gen + ' MW with the tidal current' : d.gen + ' MW, burns coal';
  if (bt === 'house') return 'Homes for 6, 14 or 24';
  if (bt === 'market') return 'Hands bread and furniture to houses within ' + d.range + ' road tiles';
  if (d.node) return 'Transfer yard, ' + d.cap + ' units';
  if (bt === 'warehouse') return 'Storage, ' + d.cap + ' units';
  if (bt === 'depot') return 'Trucks live here';
  return '';
}

function buildChrome() {
  $('tools').innerHTML = TOOLS.map(([k, n, key]) => '<button class="tool" data-tool="' + k + '" title="' + n + ' (' + key + ')">' + icon(k) + '<span>' + n + '</span></button>').join('') +
    '<button class="tool" id="panelTool" title="Show or hide the panel">' + icon('panel') + '<span>Panel</span></button>';
  $('tools').onclick = e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); else if (e.target.closest('#panelTool')) { const show = $('panel').classList.contains('collapsed'); if (show && narrow() && G.tool !== 'inspect') setTool('inspect'); openPanel(show); renderPanel(true); } };
  let pal = '<div class="pal">';
  for (const [title, list] of PAL) { pal += '<h4>' + esc(title) + '</h4><div class="grid">' + list.map(bt => '<button class="card" data-bt="' + bt + '"><b>' + esc(BT[bt].name) + '</b><small>' + fmt(BT[bt].cost) + ' cr. ' + esc(recipeText(bt)) + '</small></button>').join('') + '</div>'; }
  pal += '<p class="small-note">Rotate with R or the Rotate button. On touch, tap to position and confirm with Build.</p></div>';
  $('palette').innerHTML = pal;
  $('palette').onclick = e => { const b = e.target.closest('[data-bt]'); if (b) { G.bt = b.dataset.bt; G.rot = 0; setTool('place'); } };
  $('speed').innerHTML = [['||', 0], ['1x', 1], ['3x', 2], ['8x', 3], ['20x', 4], ['50x', 5]].map(([l, i]) => '<button data-sp="' + i + '" title="' + (i ? 'Speed ' + l : 'Pause (Space)') + '">' + l + '</button>').join('');
  $('speed').onclick = e => { const b = e.target.closest('[data-sp]'); if (b) setSpeed(+b.dataset.sp); };
  $('overlaySeg').innerHTML = [['', 'City'], ['roads', 'Road nets'], ['power', 'Power'], ['traffic', 'Traffic'], ['rail', 'Rail blocks']].map(([k, n]) => '<button data-ov="' + k + '">' + n + '</button>').join('');
  $('overlaySeg').onclick = e => { const b = e.target.closest('[data-ov]'); if (b) { RV.showNet = b.dataset.ov; syncChrome(); } };
  $('tabs').innerHTML = [['inspect', 'Inspect'], ['ledger', 'Ledger'], ['logi', 'Logistics'], ['time', 'Time'], ['goals', 'Goals'], ['trade', 'Trade'], ['settings', 'Settings']].map(([k, n]) => '<button data-tab="' + k + '" role="tab">' + n + '</button>').join('');
  $('tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { G.tab = b.dataset.tab; openPanel(true); renderPanel(true); } };
  $('panelBody').onclick = panelClick;
  // never swap the panel's DOM under a finger or a mouse button that is still down
  $('panel').addEventListener('pointerdown', () => { G.panelHold = true; });
  window.addEventListener('pointerup', () => { setTimeout(() => { G.panelHold = false; }, 60); });
  window.addEventListener('pointercancel', () => { G.panelHold = false; });
  $('alertBtn').onclick = () => { G.tab = 'logi'; openPanel(true); renderPanel(true); };
  $('menuBtn').onclick = () => showMenu();
  $('modalClose').onclick = () => { $('modal').hidden = true; };
}
function syncChrome() {
  for (const b of document.querySelectorAll('#tools .tool')) b.classList.toggle('on', b.dataset.tool === G.tool || (G.tool === 'place' && b.dataset.tool === 'build'));
  for (const b of document.querySelectorAll('#speed button')) b.classList.toggle('on', +b.dataset.sp === G.speed);
  for (const b of document.querySelectorAll('#overlaySeg button')) b.classList.toggle('on', b.dataset.ov === RV.showNet);
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === G.tab);
  for (const b of document.querySelectorAll('#palette .card')) b.classList.toggle('on', G.tool === 'place' && b.dataset.bt === G.bt);
  $('palette').hidden = !(G.tool === 'build' || (G.tool === 'place' && !narrow()));
}
function openPanel(on) { $('panel').classList.toggle('collapsed', !on); G.settings.panel = on ? 1 : 0; }
const narrow = () => (window.innerWidth || 1000) <= 760;
function setTool(t) {
  if (t === 'build' && G.tool === 'build') t = 'inspect';
  if (narrow() && t !== 'inspect') openPanel(false);
  G.tool = t; RV.tool = t; RV.ghost = null; hideConfirm();
  if (t !== 'place' && t !== 'build') G.bt = null;
  $('view').style.cursor = t === 'inspect' ? 'default' : 'crosshair';
  syncChrome();
}
function setSpeed(i) { G.speed = i; syncChrome(); }
let toastT = 0;
function toast(msg, ms) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms || 2600); }

/* every player edit passes through here */
function act(a, quiet) {
  const r = applyAction(G.S, a, 0);
  if (!r.res.ok) { if (!quiet) toast(r.res.why || 'Not possible'); }
  else if (r.rep && r.rep.length && !quiet) toast(r.rep.slice(0, 2).join('. '));
  G.lastPanel = ''; return r.res;
}

/* ---------------- top bar ---------------- */
function updateTop() {
  const S = G.S; if (!S) return;
  $('clock').textContent = narrow() ? clockStr(S.tick).replace('Day ', 'D') : clockStr(S.tick);
  const wx = WX[S.wx.k], fx = S.wx.k === W_FOG ? ' (boats 60%)' : S.wx.k === W_STORM ? ' (no freighters)' : S.wx.k === W_RAIN ? ' (trucks 90%)' : '';
  $('wx').textContent = wx + fx;
  const m = Math.abs(S.money), short = narrow() && m >= 1e4 ? (S.money < 0 ? '-' : '') + (m >= 1e6 ? (m / 1e6).toFixed(m >= 1e7 ? 0 : 1) + 'M' : Math.round(m / 1e3) + 'k') : fmt(S.money);
  $('money').textContent = S.flags.inf ? 'unlimited' : short + ' cr';
  $('money').className = S.money < 0 ? 'warn' : '';
  const L = S.labour || { pop: 0, emp: 0, jobs: 0 };
  $('pop').innerHTML = fmt(L.pop) + ' res.<span class="jobs"> ' + (L.emp | 0) + '/' + (L.jobs | 0) + ' jobs</span>';
  let sup = 0, dem = 0; for (const p of S.pstat || []) { sup += p[1]; dem += p[2]; }
  $('pwr').textContent = sup + '/' + dem + ' MW'; $('pwr').className = dem > sup ? 'warn' : '';
  const n = S.alerts.length; $('alertBtn').textContent = narrow() ? n + '!' : n + (n === 1 ? ' alert' : ' alerts'); $('alertBtn').classList.toggle('hot', n > 0);
  drawTideGauge(S);
}
function drawTideGauge(S) {
  const c = $('tide').getContext('2d'), w = 132, h = 30, dpr = window.devicePixelRatio || 1;
  if ($('tide').width !== w * dpr) { $('tide').width = w * dpr; $('tide').height = h * dpr; }
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const y = v => h - 3 - (v - 15) / 115 * (h - 6);
  c.fillStyle = '#e1d5b9'; c.fillRect(0, 0, w, h);
  c.beginPath(); for (let i = 0; i <= w; i++) { const t = S.tick + (i - w * 0.35) * 18; const v = tideAt(Math.max(0, t)); if (i) c.lineTo(i, y(v)); else c.moveTo(i, y(v)); }
  c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fillStyle = '#5f968c'; c.fill();
  c.setLineDash([3, 3]); c.strokeStyle = '#2b2622'; c.beginPath(); c.moveTo(0, y(CANAL_LVL)); c.lineTo(w, y(CANAL_LVL)); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#b5532f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w * 0.35, 0); c.lineTo(w * 0.35, h); c.stroke();
  c.fillStyle = '#2b2622'; c.font = '600 10px IBM Plex Mono, monospace'; c.fillText('tide ' + tideAt(S.tick), 3, 10);
}

/* ---------------- panel ---------------- */
function renderPanel(force) {
  const S = G.S; if (!S || $('panel').classList.contains('collapsed')) return;
  const now = performance.now(); if (!force && (now - G.panelAt < 280 || G.panelHold)) return; G.panelAt = now;
  let html = '';
  try {
    switch (G.tab) {
      case 'inspect': html = panelInspect(S); break;
      case 'ledger': html = panelLedger(S); break;
      case 'logi': html = panelLogi(S); break;
      case 'time': html = panelTime(S); break;
      case 'goals': html = panelGoals(S); break;
      case 'trade': html = panelTrade(S); break;
      case 'settings': html = panelSettings(S); break;
    }
  } catch (e) { html = '<p class="fail">Panel error: ' + esc(e.message) + '</p>'; console.error(e); }
  if (html !== G.lastPanel) { const body = $('panelBody'), st = body.scrollTop; morphInto(body, html); body.scrollTop = st; G.lastPanel = html; }
}
/* Patch the live DOM toward new markup so unchanged buttons keep their identity. */
function morphInto(el, html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  morphKids(el, tpl.content);
}
function morphKids(from, to) {
  const fc = Array.from(from.childNodes), tc = Array.from(to.childNodes);
  for (let i = 0; i < tc.length; i++) { if (i < fc.length) morphNode(fc[i], tc[i]); else from.appendChild(tc[i].cloneNode(true)); }
  for (let i = tc.length; i < fc.length; i++) fc[i].remove();
}
function morphNode(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b.cloneNode(true)); return; }
  if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.nodeType !== 1) return;
  for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  if (a.tagName === 'INPUT') return;
  morphKids(a, b);
}
const sw = r => '<span class="swatch" style="background:' + RES[r].col + '"></span>';
const bLink = b => b ? '<a href="#" data-a="selb" data-id="' + b.id + '">' + esc(bName(b)) + '</a>' : 'demolished building';
const vLink = v => v ? '<a href="#" data-a="selv" data-id="' + v.id + '">' + esc(vName(v)) + '</a>' : 'a lost vehicle';
function conItem(S, c) {
  const o = bById(S, c.o), d = bById(S, c.d), v = c.veh ? vById(S, c.veh) : null;
  return '<div class="item" data-a="selc" data-id="' + c.id + '"><b>' + sw(c.r) + c.q + ' ' + esc(RES[c.r].name) + '</b> #' + c.id + ' <span class="badge">' + esc(c.st) + '</span><div class="sub">' + esc(o ? bName(o) : '?') + ' > ' + esc(d ? bName(d) : '?') + (v ? ' on ' + esc(vName(v)) : '') + '</div>' + ((v && v.ob) || c.ob ? '<div class="sub">' + esc((v && v.ob) || c.ob) + '</div>' : '') + '</div>';
}
function panelInspect(S) {
  const sel = G.sel;
  if (G.conSel) { const c = cById(S, G.conSel) || S.hist.find(x => x.id === G.conSel); if (c) return inspectCon(S, c); }
  if (!sel) return '<h2>Inspect</h2><p>Tap a vehicle, building, lock or tile. Vehicles show their cargo, route, destination and whatever is holding them up; buildings show stock, staff, power and what they are waiting for.</p><p class="small-note">Tip: the Why? button on a building traces a shortage back through the chain using live state.</p>' + alertsHtml(S, 6);
  if (sel.v) { const v = vById(S, sel.v); if (!v) { const w = S.wrecks.find(x => x.id === sel.v); return '<h2>Vehicle #' + sel.v + '</h2><p>' + (w ? 'Destroyed at ' + esc(clockStr(w.tick)) + ' with ' + w.lost + ' units aboard. See the Ledger for the loss entries.' : 'No longer in service.') + '</p>'; } return inspectVehicle(S, v); }
  if (sel.b) { const b = bById(S, sel.b); if (!b) return '<h2>Demolished</h2><p>That building no longer exists.</p>'; return inspectBuilding(S, b); }
  if (sel.l) { const lk = S.locks.find(l => l.id === sel.l); if (lk) return inspectLock(S, lk); }
  if (sel.t !== undefined) return inspectTile(S, sel.t);
  return '';
}
function legsHtml(S, c) {
  return '<ol class="mono" style="margin:4px 0 0 18px;padding:0">' + c.legs.map((L, i) => '<li' + (i === c.li && c.st !== 'delivered' ? ' style="font-weight:600;color:#923f22"' : (i < c.li ? ' style="opacity:.55"' : '')) + '>' + esc(legText(S, L)) + '</li>').join('') + '</ol>';
}
function inspectVehicle(S, v) {
  let h = '<h2>' + esc(vName(v)) + ' <span class="badge">' + esc(v.st) + '</span></h2>';
  const ob = v.ob || (v.st === 'go' || v.st === 'run' ? 'Moving' : v.st === 'depot' || v.st === 'idle' || v.st === 'moor' ? 'Idle, waiting for work' : '');
  h += '<div class="obst' + (/Traffic|Waiting|Held|Queued|Stranded|Derailed|Holding|No |closed|full/i.test(ob) ? '' : ' ok') + '"><b>Now:</b> ' + esc(ob) + '</div>';
  const at = v.k === 'train' ? v.tiles[0] : v.t;
  h += '<div class="kv"><span>Position</span><span class="mono">' + esc(xy(S, at)) + '</span>';
  if (v.k === 'truck') h += '<span>Home depot</span><span>' + (v.home ? bLink(bById(S, v.home)) : 'none') + '</span>';
  if (v.k === 'train') h += '<span>Reserved ahead</span><span class="mono">' + v.rn + ' tiles' + (v.wb ? ', blocked by ' + vLink(vById(S, v.wb)) : '') + '</span>';
  if (v.job) { const tgt = bById(S, v.job.tgt || (v.job.ph === 'toA' ? v.job.a : v.job.b) || v.job.q); h += '<span>Job</span><span>' + esc({ pk: 'collect', dl: 'deliver', div: 'divert', toA: 'go to load', toB: 'carry to', reloc: 'clear platform for', in: 'sail in to', out: 'sail out' }[v.job.ph] || v.job.ph) + ' ' + (tgt ? bLink(tgt) : '') + '</span>'; }
  h += '<span>Route left</span><span class="mono">' + v.path.length + ' tiles</span>';
  h += '</div>';
  const cons = v.cargo.map(id => cById(S, id)).filter(Boolean);
  h += '<h3>Cargo</h3>';
  if (!cons.length && !sumArr(v.own)) h += '<p class="small-note">Empty.</p>';
  for (const c of cons) h += consCard(S, c);
  for (let r = 0; r < NR; r++) if (v.own[r]) h += '<div class="item">' + sw(r) + v.own[r] + ' ' + esc(RES[r].name) + ' <span class="sub">' + (v.k === 'freighter' ? (v.job && v.job.ph === 'in' ? 'import cargo bought abroad' : 'export cargo') : 'owned cargo') + '</span></div>';
  if (v.ret && sumArr(v.ret)) h += '<div class="item">' + v.ret.map((n, r) => n ? n + ' ' + RES[r].name : '').filter(Boolean).join(', ') + ' <span class="sub">imports the quay could not take, going back</span></div>';
  if (v.load && v.load.length) h += '<p class="small-note">Booked to load: ' + v.load.length + ' consignments.</p>';
  h += '<div class="row"><button class="btn small" data-a="follow">' + (G.follow ? 'Stop following' : 'Follow') + '</button>';
  if (v.k !== 'freighter') h += '<button class="btn small" data-a="sell" data-id="' + v.id + '">Sell (if idle)</button><button class="btn small" data-a="scrap" data-id="' + v.id + '" title="Destroys the vehicle; any cargo is booked as an explicit loss">Scrap</button>';
  h += '</div>';
  return h;
}
function consCard(S, c) {
  const o = bById(S, c.o), d = bById(S, c.d);
  return '<div class="item" data-a="selc" data-id="' + c.id + '"><b>' + sw(c.r) + c.q + ' ' + esc(RES[c.r].name) + '</b> consignment #' + c.id + (c.x ? ' <span class="badge ochre">export</span>' : '') +
    '<div class="sub">From ' + esc(o ? bName(o) : 'gone') + ' to ' + esc(d ? bName(d) : 'gone') + '</div>' + legsHtml(S, c) + '</div>';
}
function inspectCon(S, c) {
  let h = '<div class="row"><button class="btn small" data-a="unc">Back</button></div><h2>Consignment #' + c.id + '</h2><div class="kv">';
  for (const [k, v] of conReport(S, c)) h += '<span>' + esc(k) + '</span><span>' + esc(v) + '</span>';
  h += '</div><h3>Route</h3>' + legsHtml(S, c) + '<h3>History</h3><div class="mono">' + c.log.slice().reverse().map(L => esc(clockStr(L[0])) + ' ' + esc(L[1])).join('<br>') + '</div>';
  if (c.veh) h += '<div class="row"><button class="btn small" data-a="selv" data-id="' + c.veh + '">Show vehicle</button></div>';
  return h;
}
function stockRows(S, b) {
  const def = BT[b.type]; let rows = '';
  for (let r = 0; r < NR; r++) {
    const inv = b.inv[r], out = b.out[r], ex = b.exp ? b.exp[r] : 0, tgt = targetOf(S, b, r);
    if (!inv && !out && !ex && !tgt) continue;
    rows += '<tr><td>' + sw(r) + esc(RES[r].name) + '</td><td>' + inv + (tgt ? '/' + tgt : '') + '</td><td>' + (def.out ? out + '/' + outCap(def, r) : '') + '</td><td>' + (b.rsv[r] || '') + '</td><td>' + (ex || '') + '</td></tr>';
  }
  return rows ? '<table class="t"><tr><th>Goods</th><th>held</th><th>output</th><th>booked</th><th>export</th></tr>' + rows + '</table>' : '<p class="small-note">Holds nothing.</p>';
}
function inspectBuilding(S, b) {
  const def = BT[b.type];
  let h = '<h2>' + esc(bName(b)) + '</h2>';
  if (def.out) h += '<div class="obst' + (b.st === 0 ? ' ok' : '') + '"><b>' + esc(PST[b.st]) + '</b>' + (b.st === 3 || b.st === 4 ? ': ' + esc(RES[b.stR].name) : '') + (b.st === 0 ? ' (' + Math.floor(b.prog / def.dur) + '% through a batch)' : '') + '</div>';
  h += '<div class="kv">';
  if (def.jobs) h += '<span>Staff</span><span>' + b.wk + ' / ' + def.jobs + '</span>';
  const need = powNeed(S, b, false);
  if (need) h += '<span>Power</span><span>' + (b.pwOn ? 'on' : '<b class="fail">off</b>') + ' (' + need + ' MW)</span>';
  if (def.gen) h += '<span>Generating</span><span>' + (b.load || 0) + ' of ' + (b.cap || 0) + ' MW available</span>';
  if (b.type === 'house') h += '<span>Residents</span><span>' + b.res + ' / ' + HCAP[b.lvl] + ' (' + ['', 'one storey', 'two storeys', 'three storeys'][b.lvl] + ')</span><span>Jobs nearby</span><span>' + (b.jobsOk ? 'yes' : 'no: unemployment too high on this road network') + '</span><span>Meals missed</span><span>' + b.missed + '</span>';
  if (b.type === 'market') h += '<span>Households served</span><span>' + housesNear(S, b).length + ' in range, ' + (b.served || 0) + ' visits last round</span>';
  const acc = bAcc(S, b);
  h += '<span>Entrance</span><span class="mono">' + (acc >= 0 ? xy(S, acc) + ', road net #' + rcOf(S, acc) : 'no road access') + '</span>';
  if (b.yard && (b.yard.length || b.bays.length)) h += '<span>Loading bays</span><span>' + b.bays.length + ' / ' + (def.bays || 1) + ' busy, ' + b.yard.length + ' waiting</span>';
  if (def.ext !== undefined) h += '<span>Resource</span><span>' + (b.ext || 0) + '%</span>';
  h += '</div>';
  if (def.out || def.inp) h += '<p class="small-note mono">' + esc(recipeText(b.type)) + (def.tools ? '. Tools speed it up 50%.' : '') + '</p>';
  h += '<h3>Stock</h3>' + stockRows(S, b);
  if (b.type === 'house') { const w = houseWants(b); if (w) h += '<p class="small-note">Ready to build up: wants ' + w.map(([r, n]) => n + ' ' + RES[r].name).join(', ') + '.</p>'; }
  const short = shortageOf(S, b);
  if (short >= 0) h += '<div class="row"><button class="btn primary small" data-a="why" data-id="' + b.id + '" data-r="' + short + '">Why no ' + esc(RES[short].name) + '?</button></div>';
  if (G.why && G.why.b === b.id) h += '<div class="why">' + explainShortage(S, b, G.why.r).map(([d, t]) => '<div style="margin-left:' + d * 12 + 'px">' + esc(t) + '</div>').join('') + '</div>';
  const inc = S.cons.filter(c => c.d === b.id).slice(0, 6), out = S.cons.filter(c => c.o === b.id && c.st === 'wait').slice(0, 6);
  if (inc.length) h += '<h3>Incoming</h3><div class="list">' + inc.map(c => conItem(S, c)).join('') + '</div>';
  if (out.length) h += '<h3>Waiting to leave</h3><div class="list">' + out.map(c => conItem(S, c)).join('') + '</div>';
  if (b.tr && b.tr.length) h += '<h3>In the yard</h3><div class="list">' + b.tr.slice(0, 8).map(id => cById(S, id)).filter(Boolean).map(c => conItem(S, c)).join('') + '</div>';
  h += '<div class="row">';
  if (b.type === 'depot') h += '<button class="btn small" data-a="buy" data-k="truck" data-id="' + b.id + '">Buy truck (' + VT.truck.cost + ')</button>';
  if (def.node === 'rail') h += '<button class="btn small" data-a="buy" data-k="train" data-id="' + b.id + '">Buy train (' + VT.train.cost + ')</button>';
  if (def.node === 'water') h += '<button class="btn small" data-a="buy" data-k="barge" data-id="' + b.id + '">Buy barge (' + VT.barge.cost + ')</button>';
  if (b.type !== 'lighthouse') h += '<button class="btn small" data-a="demolish" data-id="' + b.id + '">Demolish</button>';
  h += '</div>';
  if (b.type === 'warehouse') {
    h += '<h3>Keep in stock</h3><table class="t">';
    for (let r = 0; r < NR; r++) h += '<tr><td>' + sw(r) + esc(RES[r].name) + '</td><td><span class="stepper"><button data-a="want" data-id="' + b.id + '" data-r="' + r + '" data-d="-10">-</button> ' + b.want[r] + ' <button data-a="want" data-id="' + b.id + '" data-r="' + r + '" data-d="10">+</button></span></td></tr>';
    h += '</table><p class="small-note">Producers also send surplus here when their output fills up.</p>';
  }
  if (b.type === 'depot') { const tr = S.vehs.filter(v => v.k === 'truck' && v.home === b.id); h += '<p class="small-note">' + tr.length + ' trucks based here, ' + tr.filter(v => v.st === 'depot').length + ' parked.</p>'; }
  return h;
}
function inspectTile(S, t) {
  const ter = ['Land', 'Tidal sea', 'Canal', 'Lock'][S.ter[t]];
  let h = '<h2>Tile ' + esc(xy(S, t)) + '</h2><div class="kv"><span>Ground</span><span>' + ter + (S.dep[t] ? ', ' + ['', 'coal seam', 'iron ore', 'clay', 'fertile soil'][S.dep[t]] : '') + '</span>';
  if (S.road[t]) h += '<span>Road</span><span>' + (isWater(S.ter[t]) ? 'bridge, ' : '') + 'network #' + rcOf(S, t) + (roadNet(S).jn[t] ? ', ' + junctionText(S, t) : '') + '</span>';
  if (S.rail[t]) h += '<span>Track</span><span>' + (isWater(S.ter[t]) ? 'bridge, ' : '') + ['N', 'E', 'S', 'W'].filter((_, k) => S.rail[t] & (1 << k)).join('-') + (S.sig[t] ? ', one-way signal facing ' + DIRN[sigDir(S, t)] : '') + (S._rsv && S._rsv[t] ? ', reserved by Train #' + S._rsv[t] : '') + '</span>';
  if (S.pow[t]) h += '<span>Power line</span><span>grid #' + powerNet(S).pwComp[t] + '</span>';
  if (S.tree[t]) h += '<span>Trees</span><span>' + ['', 'saplings', 'young', 'mature'][S.tree[t]] + '</span>';
  if (S.ter[t] === T_SEA) h += '<span>Water level</span><span>' + tideAt(S.tick) + ' (canals are held at ' + CANAL_LVL + ')</span>';
  h += '</div>';
  return h;
}
function inspectLock(S, lk) {
  const sea = tideAt(S.tick);
  let h = '<h2>Lock #' + lk.id + ' <span class="badge">' + esc(lk.ph) + '</span></h2>';
  h += '<div class="kv"><span>Chamber level</span><span>' + lk.lvl + '</span><span>Canal side</span><span>' + CANAL_LVL + '</span><span>Sea side</span><span>' + sea + '</span>';
  h += '<span>Gates</span><span>' + (lk.ph === 'free' ? 'both open (levels within ' + LEVEL_TOL + ')' : lk.ph === 'open' ? (lk.g === 0 ? 'canal gate open' : 'sea gate open') : lk.ph === 'level' ? (lk.tgt === 0 ? 'closed, filling' : 'closed, draining') : lk.ph) + '</span>';
  h += '<span>In chamber</span><span>' + (lk.occ ? vLink(vById(S, lk.occ)) : 'empty') + '</span>';
  h += '<span>Queue canal side</span><span>' + (lk.q[0].map(id => vLink(vById(S, id))).join(', ') || 'none') + '</span><span>Queue sea side</span><span>' + (lk.q[1].map(id => vLink(vById(S, id))).join(', ') || 'none') + '</span>';
  h += '<span>Cycles</span><span>' + lk.cycles + ' (' + lk.empty + ' empty turnarounds)</span></div>';
  h += '<h3>Rules</h3><p class="small-note">One boat per cycle. Gates open only when the chamber matches that side. The lock serves the side whose gate is open first, but turns around for a boat that has waited more than ' + MAXW + ' ticks after two same-side passages. Near high water the sea comes within ' + LEVEL_TOL + ' of the canal and both gates stand open.</p>';
  return h;
}
function alertsHtml(S, n) {
  if (!S.alerts.length) return '<h3>Alerts</h3><p class="small-note">None.</p>';
  return '<h3>Alerts</h3><div class="list">' + S.alerts.slice(0, n || 40).map(a => '<div class="item" data-a="alert" data-k="' + esc(a.kind) + '" data-id="' + (a.ref || 0) + '">' + esc(a.text) + '</div>').join('') + '</div>';
}
function panelLedger(S) {
  const au = audit(S);
  let h = '<h2>Resource ledger</h2><div class="obst' + (au.ok ? ' ok' : '') + '">' + (au.ok ? 'Balanced. For every good: start + extracted + imported + produced = used + exported + lost + held in buildings + in storage + in transit.' : 'Discrepancy found') + '</div>';
  h += '<table class="t"><tr><th>Good</th><th title="Starting stock">start</th><th title="Extracted">ext</th><th title="Imported">imp</th><th title="Produced">prod</th><th title="Used up">used</th><th title="Exported">exp</th><th title="Lost">lost</th><th title="In buildings">bldg</th><th title="In storage yards">store</th><th title="In transit (vehicles and transfer yards)">trans</th><th title="Discrepancy">diff</th></tr>';
  for (const r of au.rows) {
    if (!(r.start + r.ext + r.imp + r.prod)) continue;
    h += '<tr' + (r.disc ? ' class="hl"' : '') + '><td>' + sw(r.r) + esc(RES[r.r].name) + '</td><td>' + r.start + '</td><td>' + r.ext + '</td><td>' + r.imp + '</td><td>' + r.prod + '</td><td>' + r.use + '</td><td>' + r.exp + '</td><td>' + r.lost + '</td><td>' + r.inB + '</td><td>' + r.inS + '</td><td>' + r.inT + '</td><td>' + (r.disc ? '<b class="fail">' + r.disc + '</b>' : '0') + '</td></tr>';
  }
  h += '</table>';
  if (au.issues.length) h += '<h3>Structural issues</h3><div class="mono">' + au.issues.map(esc).join('<br>') + '</div>';
  h += '<h3>Explicit losses</h3>';
  const ll = S.lossLog.slice(-14).reverse();
  h += ll.length ? '<div class="list">' + ll.map(e => '<div class="item"><b>' + sw(e.r) + e.q + ' ' + esc(RES[e.r].name) + '</b> <span class="sub">' + esc(clockStr(e.t)) + ' at ' + esc(xy(S, e.at)) + '</span><div class="sub">' + esc(e.why) + (e.c ? ' (consignment #' + e.c + ')' : '') + '</div></div>').join('') + '</div>' : '<p class="small-note">Nothing has been lost.</p>';
  const m = S.mled;
  h += '<h3>Treasury</h3><div class="kv"><span>Taxes</span><span>' + fmt(m.tax) + '</span><span>Exports</span><span>' + fmt(m.exp) + '</span><span>Refunds</span><span>' + fmt(m.refund || 0) + '</span><span>Imports</span><span>-' + fmt(m.imp) + '</span><span>Building</span><span>-' + fmt(m.build) + '</span><span>Upkeep</span><span>-' + fmt(m.upkeep) + '</span></div>';
  return h;
}
function panelLogi(S) {
  const st = {}; for (const c of S.cons) st[c.st] = (st[c.st] || 0) + 1;
  const vk = {}; for (const v of S.vehs) { const k = VT[v.k].name; vk[k] = vk[k] || { n: 0, busy: 0, stuck: 0 }; vk[k].n++; if (v.job || v.cargo.length) vk[k].busy++; if (v.st === 'stranded' || v.st === 'derail' || v.st === 'hold' || v.wt > 200) vk[k].stuck++; }
  let h = '<h2>Logistics</h2><div class="kv"><span>Consignments</span><span>' + S.cons.length + ' active: ' + (st.wait || 0) + ' at origin, ' + (st.ride || 0) + ' moving, ' + (st.xfer || 0) + ' in yards</span><span>Delivered today</span><span>' + deliveredToday(S) + ' units</span></div>';
  h += '<h3>Fleet</h3><table class="t"><tr><th>Kind</th><th>owned</th><th>working</th><th>held up</th></tr>' + Object.keys(vk).map(k => '<tr><td>' + esc(k) + '</td><td>' + vk[k].n + '</td><td>' + vk[k].busy + '</td><td>' + vk[k].stuck + '</td></tr>').join('') + '</table>';
  const held = S.vehs.filter(v => v.ob && v.ob.length && v.k !== 'freighter' && (v.wt > 60 || /Stranded|Derailed|Holding|No /.test(v.ob))).slice(0, 8);
  if (held.length) h += '<h3>Held up</h3><div class="list">' + held.map(v => '<div class="item" data-a="selv" data-id="' + v.id + '"><b>' + esc(vName(v)) + '</b><div class="sub">' + esc(v.ob) + '</div></div>').join('') + '</div>';
  for (const lk of S.locks) h += '<div class="item" data-a="sellk" data-id="' + lk.id + '">Lock #' + lk.id + ': ' + esc(lk.ph) + ', ' + (lk.q[0].length + lk.q[1].length) + ' boats queueing, ' + lk.cycles + ' cycles</div>';
  h += alertsHtml(S);
  h += '<h3>Stress test</h3><p class="small-note">Runs on a copy of this city: waits until loaded vehicles are on each bridge, takes a snapshot, demolishes the bridges, accounts for every unit, then replays the demolition from the snapshot in a fresh simulation and compares.</p><div class="row"><button class="btn small" data-a="stress">Run bridge stress test</button></div>';
  return h;
}
function deliveredToday(S) { const d = S.stats.day; const prev = d.length ? d[d.length - 1].del : zr(); let n = 0; for (let r = 0; r < NR; r++) n += S.delivered[r] - (prev[r] || 0); return n; }
function decText(S, e) {
  const [t, code, a, b, c] = e, n = DEC[code] || code;
  const B = id => { const x = bById(S, id); return x ? bName(x) : '#' + id; };
  switch (code) {
    case 1: return 'Booked consignment #' + a + ': ' + (c % 100) + ' ' + RES[Math.floor(c / 100)].name + ' ' + B(Math.floor(b / 1000)) + ' > ' + B(b % 1000);
    case 2: return 'Truck #' + a + ' assigned consignment #' + b;
    case 3: case 4: return (code === 3 ? 'Train #' : 'Barge #') + a + ' sent to ' + B(b) + ' for ' + B(c);
    case 5: return 'Train #' + a + ' cleared ' + c + ' tiles to ' + xy(S, b);
    case 6: return 'Lock #' + a + ' admitted boat #' + b + ' from the ' + (c ? 'sea' : 'canal') + ' side';
    case 7: return 'Lock #' + a + (c ? ' cycling with a boat' : ' turning round empty') + ' toward the ' + (b ? 'sea' : 'canal');
    case 8: return 'Vehicle #' + a + ' re-routed';
    case 9: return 'Diversion: #' + a + ' to ' + B(b);
    case 11: return 'Vehicle #' + a + ' destroyed with ' + c + ' units';
    case 15: return 'Delivered consignment #' + a + ' to ' + B(b);
    case 19: return 'Loss booked: ' + b + ' ' + RES[a].name;
    default: return n + ' ' + a + ' ' + b + ' ' + c;
  }
}
function panelTime(S) {
  let h = '<h2>Time and replay</h2><div class="kv"><span>Clock</span><span class="mono">' + esc(clockStr(S.tick)) + ' (tick ' + S.tick + ')</span><span>Seed</span><span class="mono">' + S.seed + '</span><span>Actions</span><span class="mono">' + S.acts.filter(a => !a.sys).length + ' recorded</span><span>Decisions</span><span class="mono">' + S.dec.n + ', hash ' + hex(S.dec.h) + '</span><span>State hash</span><span class="mono">' + (G.hashShown && G.hashShown.t === S.tick ? hex(G.hashShown.h) : '<a href="#" data-a="hash">compute</a>') + '</span></div>';
  h += '<div class="row"><button class="btn small" data-a="snap">Take snapshot</button></div>';
  h += '<h3>Snapshots</h3>';
  if (!G.snaps.length) h += '<p class="small-note">A snapshot is taken automatically at every midnight.</p>';
  else h += '<div class="list">' + G.snaps.slice().reverse().map((s, i) => '<div class="item"><b>' + esc(s.label) + '</b> <span class="sub mono">tick ' + s.tick + '</span><div class="row"><button class="btn small" data-a="rewind" data-i="' + (G.snaps.length - 1 - i) + '">Rewind here</button><button class="btn small" data-a="verify" data-i="' + (G.snaps.length - 1 - i) + '">Verify replay to now</button></div></div>').join('') + '</div>';
  h += '<p class="small-note">Rewinding restores the snapshot exactly; anything you do afterwards is a new future. Verify replays the recorded actions from the snapshot in a separate simulation and compares every count and every decision with the present.</p>';
  h += '<h3>Recent decisions</h3><div class="mono" style="font-size:11.5px">' + S.dec.log.slice(-24).reverse().map(e => esc(clockStr(e[0]).slice(-5)) + ' ' + esc(decText(S, e))).join('<br>') + '</div>';
  return h;
}
function panelGoals(S) {
  const def = SCEN[S.scen.id];
  let h = '<h2>' + esc(def.name) + '</h2><p>' + esc(def.brief) + '</p>';
  if (def.goals) { h += '<h3>Goals</h3>'; def.goals.forEach((g, i) => { const st = S.scen.goals[i]; h += '<div class="goal' + (st.done ? ' done' : '') + '"><span class="tick"></span><span>' + esc(g[0]) + (st.done ? '<br><span class="small-note">done ' + esc(clockStr(st.done)) + '</span>' : '') + '</span><span class="pr">' + esc(st.prog) + '</span></div>'; }); }
  if (S.scen.won) { h += '<div class="obst ok"><b>Chapter complete</b> at ' + esc(clockStr(S.scen.won)) + '.</div>'; const i = CAMPAIGN.indexOf(S.scen.id); if (i >= 0 && i + 1 < CAMPAIGN.length) h += '<div class="row"><button class="btn primary" data-a="next">Next: ' + esc(SCEN[CAMPAIGN[i + 1]].name) + '</button></div>'; }
  if (def.hints) h += '<h3>Notes</h3>' + def.hints.map(t => '<p class="hint">' + esc(t) + '</p>').join('');
  if (def.kind === 'diag') {
    const b = S.blds.find(x => x.type === def.focus);
    h += '<h3>Diagnosis from live state</h3>';
    const target = S.blds.find(x => x.type === 'house' && x.inv[R.bread] <= 0 && x.res > 0) || b;
    if (target) { const r = shortageOf(S, target); if (r >= 0) h += '<div class="why">' + explainShortage(S, target, r).map(([d, t]) => '<div style="margin-left:' + d * 12 + 'px">' + esc(t) + '</div>').join('') + '</div>'; else h += '<p class="small-note">No shortage yet at ' + esc(bName(target)) + '. The bridge goes at 09:00 on day 1.</p>'; }
    h += '<h3>Chain status</h3>' + chainHtml(S);
  }
  if (def.kind === 'stress') h += '<div class="row"><button class="btn primary" data-a="stress">Run the stress test</button></div>';
  return h;
}
function chainHtml(S) {
  const rows = [];
  for (const [type, r] of [['farm', R.grain], ['mill', R.flour], ['bakery', R.bread], ['market', R.bread]]) {
    const bs = S.blds.filter(b => b.type === type);
    let held = 0, st = {}; for (const b of bs) { held += b.inv[r] + b.out[r]; const k = BT[b.type].out ? PST[b.st] : (b.st ? ['', 'no staff', 'no power'][b.st] : 'open'); st[k] = (st[k] || 0) + 1; }
    rows.push('<tr><td>' + esc(BT[type].name) + ' x' + bs.length + '</td><td>' + held + ' ' + esc(RES[r].name) + '</td><td style="text-align:left">' + esc(Object.keys(st).map(k => st[k] + ' ' + k).join(', ')) + '</td></tr>');
  }
  let fed = 0, hungry = 0; for (const b of S.blds) if (b.type === 'house' && b.res > 0) { if (b.inv[R.bread] > 0) fed++; else hungry++; }
  rows.push('<tr><td>Households</td><td>' + fed + ' fed</td><td style="text-align:left">' + hungry + ' with an empty pantry</td></tr>');
  return '<table class="t"><tr><th>Link</th><th>holding</th><th style="text-align:left">state</th></tr>' + rows.join('') + '</table>';
}
function panelTrade(S) {
  const q = mainQuay(S);
  let h = '<h2>Trade</h2>';
  if (!q) return h + '<p>Build a harbour quay on the south shore. Freighters come in from the open sea to the first quay, top it up with the goods you import, and carry away whatever waits in its export bay.</p>';
  h += '<p class="small-note">Import: the quay is topped up to this stock level on each call. Export: the quay pulls goods into its export bay up to this level. Freighters call every ' + (S.trade.every / TPH) + ' hours and need ' + TIDE_BERTH + ' water to berth.</p>';
  h += '<table class="t"><tr><th>Good</th><th>buy</th><th>import to</th><th>sell</th><th>export up to</th></tr>';
  for (let r = 0; r < NR; r++) h += '<tr><td>' + sw(r) + esc(RES[r].name) + '</td><td>' + impPrice(r) + '</td><td><span class="stepper"><button data-a="trade" data-imp="1" data-r="' + r + '" data-d="-20">-</button> ' + S.trade.imp[r] + ' <button data-a="trade" data-imp="1" data-r="' + r + '" data-d="20">+</button></span></td><td>' + RES[r].price + '</td><td><span class="stepper"><button data-a="trade" data-imp="0" data-r="' + r + '" data-d="-10">-</button> ' + S.trade.exp[r] + ' <button data-a="trade" data-imp="0" data-r="' + r + '" data-d="10">+</button></span></td></tr>';
  h += '</table>';
  const f = S.vehs.filter(v => v.k === 'freighter');
  h += '<h3>Shipping</h3>' + (f.length ? f.map(v => '<div class="item" data-a="selv" data-id="' + v.id + '"><b>' + esc(vName(v)) + '</b> ' + esc(v.job.ph === 'in' ? 'inbound' : 'outbound') + '<div class="sub">' + esc(v.ob || 'under way') + '</div></div>').join('') : '<p class="small-note">Next call ' + esc(clockStr(S.trade.next)) + '.</p>');
  return h;
}
function panelSettings(S) {
  const q = G.settings.q;
  let h = '<h2>Settings</h2><h3>Graphics</h3><div class="row"><span>Detail</span><span class="seg small">' + ['Low', 'Medium', 'High'].map((n, i) => '<button data-a="q" data-i="' + i + '" class="' + (q === i ? 'on' : '') + '">' + n + '</button>').join('') + '</span></div>';
  h += '<div class="row"><span>Weather effects</span><span class="seg small"><button data-a="wxv" data-i="1" class="' + (G.settings.wx ? 'on' : '') + '">On</button><button data-a="wxv" data-i="0" class="' + (!G.settings.wx ? 'on' : '') + '">Off</button></span></div>';
  h += '<div class="row"><span>Residents shown</span><span class="seg small">' + ['None', 'Some', 'Many'].map((n, i) => '<button data-a="walk" data-i="' + i + '" class="' + (G.settings.walk === i ? 'on' : '') + '">' + n + '</button>').join('') + '</span></div>';
  h += '<p class="small-note">These settings only change drawing. Weather still slows boats and trucks with effects off; residents on screen are a visual sample of the commuting the labour model already counts. <a href="#" data-a="hashcheck">Check: state hash before and after toggling detail</a>' + (G.hashCheck ? ' <b class="' + (G.hashCheck.same ? 'pass' : 'fail') + '">' + esc(G.hashCheck.text) + '</b>' : '') + '</p>';
  h += '<h3>Map overlay</h3><div class="row"><span class="seg small">' + [['', 'City'], ['roads', 'Road nets'], ['power', 'Power'], ['traffic', 'Traffic'], ['rail', 'Rail']].map(([k, n]) => '<button data-a="ov" data-k="' + k + '" class="' + (RV.showNet === k ? 'on' : '') + '">' + n + '</button>').join('') + '</span></div>';
  h += '<h3>Save</h3><div class="row"><button class="btn small" data-a="export">Export save file</button><button class="btn small" data-a="import">Import save file</button></div><p class="small-note">A save holds the full state, the action log and the latest snapshots, so verification and rewinding keep working after loading.</p>';
  h += '<h3>Scene</h3><div class="row"><button class="btn small" data-a="scene">Living scene (hide interface, H)</button><button class="btn small" data-a="recenter">Recentre camera</button></div>';
  h += '<h3>Keys</h3><p class="small-note mono">Space pause, 1-6 speed, I R T G C L P B X tools, R rotate while placing, Esc cancel, arrows or WASD pan, +/- zoom, H scene mode, F follow</p>';
  return h;
}
