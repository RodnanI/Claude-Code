/* SQUAWK UI shell: chrome, drawer, search, controls, legend, toasts, modal, keys, sheets, sound */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo, F = SQ.fmt, T = SQ.tracker, $ = SQ.$, $$ = SQ.$$;
  const UI = (SQ.ui = { panel: null });
  SQ.panels = SQ.panels || {};

  /* ---------------- sound ---------------- */
  let actx = null;
  const snd = (SQ.sound = {
    play(kind) {
      if (!S.sound) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const t = actx.currentTime;
        const tone = (f0, f1, at, dur, vol, type) => {
          const o = actx.createOscillator(), g = actx.createGain();
          o.type = type || 'sine';
          o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
          g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(vol, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
          o.connect(g).connect(actx.destination); o.start(t + at); o.stop(t + at + dur + 0.02);
        };
        if (kind === 'blip') tone(1500, 900, 0, 0.09, 0.08);
        else if (kind === 'alert') for (let i = 0; i < 3; i++) { tone(880, 860, i * 0.36, 0.16, 0.12, 'square'); tone(660, 650, i * 0.36 + 0.18, 0.16, 0.12, 'square'); }
        else if (kind === 'watch') { tone(700, 700, 0, 0.12, 0.09); tone(1050, 1050, 0.13, 0.18, 0.09); }
        else if (kind === 'flap') {
          const n = actx.createBufferSource(), b = actx.createBuffer(1, 800, actx.sampleRate), d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
          const g = actx.createGain(); g.gain.value = 0.18; n.buffer = b; n.connect(g).connect(actx.destination); n.start();
        }
      } catch (e) { /* audio unavailable */ }
    }
  });

  /* ---------------- toasts, banner, modal ---------------- */
  function toast(msg, kind, action, ms) {
    const box = $('#toasts');
    const el = SQ.h('div', { class: 'toast ' + (kind || '') }, '<span>' + msg + '</span>');
    if (action) { const b = SQ.h('button', { onclick: () => { action.fn(); kill(); } }, F.esc(action.label)); el.appendChild(b); }
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    setTimeout(kill, ms || 5200);
  }
  UI.toast = toast;
  SQ.on('toast', (m, k, a) => toast(F.esc(m), k, a));
  UI.modal = (html, onMount) => {
    const m = $('#modal');
    $('#mBody').innerHTML = html;
    m.hidden = false;
    if (onMount) onMount($('#mBody'));
  };
  UI.closeModal = () => { $('#modal').hidden = true; $('#mBody').innerHTML = ''; SQ.emit('modal:close'); };
  function notify(title, body) {
    if (!S.notify || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    try { new Notification(title, { body, icon: 'icons/icon-192.png', tag: title }); } catch (e) { /* ignore */ }
  }
  UI.notify = notify;

  /* ---------------- drawer ---------------- */
  UI.open = (name) => {
    const p = SQ.panels[name];
    if (!p) return;
    if (UI.panel === name && $('#drawer').classList.contains('open')) { UI.close(); return; }
    if (UI.panel && SQ.panels[UI.panel] && SQ.panels[UI.panel].close) SQ.panels[UI.panel].close();
    UI.panel = name;
    $('#dTitle').textContent = p.title;
    const body = $('#dBody');
    body.innerHTML = '';
    body.scrollTop = 0;
    p.render(body);
    const d = $('#drawer');
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
    $$('#rail button[data-panel]').forEach((b) => b.classList.toggle('on', b.dataset.panel === name));
    if (SQ.isMobile() && T.selected) SQ.detail && SQ.detail.setSheet('peek');
  };
  UI.close = () => {
    if (UI.panel && SQ.panels[UI.panel] && SQ.panels[UI.panel].close) SQ.panels[UI.panel].close();
    UI.panel = null;
    const d = $('#drawer');
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    d.style.transform = '';
    document.body.classList.remove('drawer-open');
    $$('#rail button').forEach((b) => b.classList.remove('on'));
  };
  UI.rerender = () => { if (UI.panel) { const b = $('#dBody'), st = b.scrollTop; b.innerHTML = ''; SQ.panels[UI.panel].render(b); b.scrollTop = st; } };
  setInterval(() => { if (UI.panel && SQ.panels[UI.panel].update && !document.hidden) SQ.panels[UI.panel].update($('#dBody')); }, 1000);

  /* ---------------- legend ---------------- */
  function legend() {
    const el = $('#legend'), mode = S.colorMode, C = SQ.color;
    const grad = (stops, max, min) => 'linear-gradient(90deg,' + stops.map(([v, c]) => C.hex(c) + ' ' + (((v - (min || 0)) / (max - (min || 0))) * 100).toFixed(1) + '%').join(',') + ')';
    el.hidden = mode === 'mono';
    if (mode === 'class') {
      el.innerHTML = '<div class="cats">' + C.GROUPS.map((g, i) => `<span><i style="background:${(document.documentElement.dataset.theme === 'light' ? C.GROUP_LIGHT : C.GROUP_DARK)[i]}"></i>${g[1]}</span>`).join('') + '</div>';
      return;
    }
    let stops, max, min = 0, ticks;
    const m = S.units === 'metric';
    if (mode === 'speed') { stops = C.SPD_STOPS; max = 700; ticks = m ? ['0', '370', '740', '1100', '1300 km/h'] : ['0', '200', '400', '600', '700 kt']; }
    else if (mode === 'vrate') { stops = C.VR_STOPS; min = -3000; max = 3000; ticks = m ? ['-15', 'desc', '0', 'clb', '+15 m/s'] : ['-3000', 'desc', 'level', 'clb', '+3000 fpm']; }
    else { stops = C.ALT_STOPS; max = 50000; ticks = m ? ['0', '3k', '6k', '9k', '12k', '15k m'] : ['0', '10k', '20k', '30k', '40k', '50k ft']; }
    el.innerHTML = `<div class="ramp" style="background:${grad(stops, max, min)}"></div><div class="ticks">${ticks.map((t) => '<span>' + t + '</span>').join('')}</div>`;
  }
  UI.legend = legend;
  SQ.on('setting:colorMode', legend);
  SQ.on('setting:units', legend);
  SQ.on('map:style', legend);

  /* ---------------- search ---------------- */
  let results = [], act = -1;
  function searchItems(q) {
    const out = { ac: [], ap: [], op: [] };
    if (!q) return out;
    const Q = q.toUpperCase(), Qn = Q.replace(/[-\s]/g, '');
    for (const ac of T.list.values()) {
      let score = 0;
      const reg = (ac.reg || '').replace('-', '').toUpperCase();
      if (ac.flight === Q || reg === Qn || ac.hex.toUpperCase() === Q) score = 100;
      else if (ac.flight && ac.flight.startsWith(Q)) score = 80;
      else if (reg.startsWith(Qn) && Qn.length >= 2) score = 70;
      else if (ac.hex.toUpperCase().startsWith(Q) && Q.length >= 3) score = 60;
      else if (ac.type === Q) score = 50;
      else if (Q.length >= 3 && ac.key.indexOf(Q) >= 0) score = 30;
      if (score) out.ac.push([score, ac]);
    }
    out.ac.sort((a, b) => b[0] - a[0] || (a[1].flight || '').localeCompare(b[1].flight || ''));
    out.ac = out.ac.slice(0, 8).map((x) => x[1]);
    const ap = SQ.airports();
    if (ap) {
      const hits = [];
      for (const a of ap.list) {
        let s = 0;
        if (a[1] === Q || a[0] === Q) s = 100;
        else if (Q.length >= 2 && (a[1].startsWith(Q) || a[0].startsWith(Q))) s = 60 - a[8] * 5;
        else if (Q.length >= 3 && (a[3].toUpperCase().indexOf(Q) >= 0 || a[2].toUpperCase().indexOf(Q) >= 0)) s = 40 - a[8] * 10;
        if (s) hits.push([s, a]);
      }
      hits.sort((a, b) => b[0] - a[0]);
      out.ap = hits.slice(0, 6).map((x) => x[1]);
    }
    const ops = SQ.D.operators;
    if (ops) {
      if (/^[A-Z]{3}$/.test(Q) && ops[Q]) out.op.push([Q, ops[Q]]);
      if (Q.length >= 4) for (const k in ops) { if (out.op.length >= 4) break; if (k !== Q && ops[k][0].toUpperCase().indexOf(Q) >= 0) out.op.push([k, ops[k]]); }
    }
    return out;
  }
  function renderResults() {
    const box = $('#results'), q = $('#q').value.trim();
    if (!q) { box.classList.remove('open'); results = []; return; }
    const r = searchItems(q);
    results = [];
    let html = '';
    if (r.ac.length) {
      html += '<div class="grp">Aircraft</div>';
      for (const ac of r.ac) {
        results.push({ kind: 'ac', v: ac });
        const col = SQ.color.forAc(ac, S.colorMode).rgb;
        html += `<button class="it" data-i="${results.length - 1}"><img src="${SQ.icons.dataUrl(ac.shape, col, 22)}" alt=""><b>${F.esc(ac.flight || ac.reg || ac.hex.toUpperCase())}</b><span>${F.esc([ac.type, ac.op ? ac.op.name : ac.ownOp].filter(Boolean).join(' · '))}</span><em>${F.altShort(ac.alt, ac.gnd)}</em></button>`;
      }
    }
    if (r.ap.length) {
      html += '<div class="grp">Airports</div>';
      for (const a of r.ap) {
        results.push({ kind: 'ap', v: a });
        html += `<button class="it" data-i="${results.length - 1}"><b>${F.esc(a[1] || a[0])}</b><span>${F.esc(a[2])}</span><em>${F.esc(a[3] ? a[3] + ', ' : '')}${F.esc(a[4])}</em></button>`;
      }
    }
    if (r.op.length) {
      html += '<div class="grp">Operators</div>';
      for (const [code, o] of r.op) {
        results.push({ kind: 'op', v: code });
        html += `<button class="it" data-i="${results.length - 1}"><b>${F.esc(code)}</b><span>${F.esc(o[0])}</span><em>filter</em></button>`;
      }
    }
    const Q = q.toUpperCase().replace(/\s/g, '');
    if (/^[A-Z0-9-]{3,8}$/.test(Q) && SQ.feed.active && SQ.feed.active !== 'sim') {
      const kind = /^[0-9A-F]{6}$/.test(Q) && /\d/.test(Q) ? 'hex' : /^[A-Z]{3}\d/.test(Q) || /^[A-Z]{2}\d/.test(Q) ? 'cs' : 'reg';
      results.push({ kind: 'net', v: Q, k: kind });
      html += `<div class="grp">Worldwide</div><button class="it" data-i="${results.length - 1}"><b>${F.esc(Q)}</b><span>Search the ${F.esc(SQ.feed.PROVIDERS[SQ.feed.active].name)} network by ${kind === 'hex' ? 'ICAO address' : kind === 'cs' ? 'callsign' : 'registration'}</span><em>enter</em></button>`;
    }
    if (!results.length) html = '<div class="empty">Nothing matches. Try a callsign (BAW123), registration (G-XLEA), ICAO hex, type (A388) or airport (LHR).</div>';
    box.innerHTML = html;
    box.classList.add('open');
    act = results.length ? 0 : -1;
    hilite();
  }
  function hilite() { $$('#results .it').forEach((b, i) => b.classList.toggle('act', i === act)); }
  async function choose(i) {
    const r = results[i];
    if (!r) return;
    $('#results').classList.remove('open');
    $('#q').blur();
    if (r.kind === 'ac') { T.select(r.v.hex, { from: 'search' }); SQ.map.flyToAc(r.v); }
    else if (r.kind === 'ap') { SQ.map.flyTo(r.v[5], r.v[6], 10); setTimeout(() => SQ.emit('airport:click', r.v[0]), 400); }
    else if (r.kind === 'op') { SQ.set('filters', Object.assign({}, S.filters, { text: r.v })); toast('Showing only <b>' + F.esc(r.v) + '</b> flights. Clear it in Filters.', '', { label: 'Clear', fn: () => SQ.set('filters', Object.assign({}, S.filters, { text: '' })) }); }
    else if (r.kind === 'net') {
      toast('Searching network for <b>' + F.esc(r.v) + '</b>...');
      const list = await SQ.feed.lookup(r.k, r.v);
      if (list.length) { const ac = T.get(list[0].hex); if (ac) { T.select(ac.hex, { from: 'search' }); SQ.map.flyToAc(ac, { zoom: 8 }); } }
      else toast('No live aircraft found for <b>' + F.esc(r.v) + '</b>', 'warn');
    }
    $('#q').value = '';
  }
  function initSearch() {
    const q = $('#q'), box = $('#results');
    q.addEventListener('input', U.debounce(renderResults, 110));
    q.addEventListener('focus', () => { if (q.value) renderResults(); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { act = Math.min(results.length - 1, act + 1); hilite(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { act = Math.max(0, act - 1); hilite(); e.preventDefault(); }
      else if (e.key === 'Enter') { choose(act < 0 ? 0 : act); e.preventDefault(); }
      else if (e.key === 'Escape') { q.value = ''; box.classList.remove('open'); q.blur(); }
    });
    box.addEventListener('click', (e) => { const b = e.target.closest('.it'); if (b) choose(+b.dataset.i); });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#search')) box.classList.remove('open'); });
  }

  /* ---------------- controls ---------------- */
  function initControls() {
    const map = SQ.map.map;
    $('#cIn').onclick = () => map.zoomIn();
    $('#cOut').onclick = () => map.zoomOut();
    $('#cNorth').onclick = () => map.easeTo({ bearing: 0, pitch: 0, duration: 700 });
    $('#cLocate').onclick = locate;
    $('#c3d').onclick = () => SQ.set('view3d', !S.view3d);
    $('#cGlobe').onclick = () => SQ.set('globe', !S.globe);
    $('#cScope').onclick = () => SQ.set('scope', !S.scope);
    $('#btnFull').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen());
    $('#btnHelp').onclick = help;
    $('#legend').onclick = () => { const modes = ['altitude', 'speed', 'vrate', 'class']; SQ.set('colorMode', modes[(modes.indexOf(S.colorMode) + 1) % modes.length]); };
    $('#live').onclick = () => UI.open('settings');
    $('#brand').onclick = (e) => { e.preventDefault(); const h = S.home || SQ.guessHome(); SQ.map.flyTo(h.lat, h.lon, 7); };
    $$('#rail button[data-panel]').forEach((b) => (b.onclick = () => UI.open(b.dataset.panel)));
    $('#dClose').onclick = UI.close;
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('.mclose')) UI.closeModal(); });
    const sync = () => {
      $('#c3d').classList.toggle('on', !!S.view3d);
      $('#cGlobe').classList.toggle('on', !!S.globe);
      $('#cScope').classList.toggle('on', !!S.scope);
      document.body.classList.toggle('scope', !!S.scope);
    };
    sync();
    ['view3d', 'globe', 'scope'].forEach((k) => SQ.on('setting:' + k, sync));
    map.on('rotate', () => { $('#needle').style.transform = 'rotate(' + -map.getBearing() + 'deg)'; });
    map.on('pitch', () => { $('#needle').style.transform = 'rotate(' + -map.getBearing() + 'deg)'; });
    map.on('mousemove', U.throttle((e) => { $('#sPos').textContent = F.lat(e.lngLat.lat) + ' ' + F.lon(e.lngLat.lng); }, 80));
    map.on('zoom', U.throttle(() => { $('#sZoom').textContent = 'z' + map.getZoom().toFixed(1); }, 100));
  }
  function locate() {
    if (!navigator.geolocation) { toast('Geolocation is not available in this browser', 'warn'); return; }
    toast('Locating...');
    navigator.geolocation.getCurrentPosition((p) => {
      SQ.set('home', { lat: p.coords.latitude, lon: p.coords.longitude, src: 'gps', acc: p.coords.accuracy });
      SQ.map.flyTo(p.coords.latitude, p.coords.longitude, 9);
      toast('Location set. Range rings, Sky view and Overhead now use it.');
      $('#cLocate').classList.add('on');
    }, (err) => toast('Location unavailable: ' + F.esc(err.message || 'permission denied'), 'warn'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  UI.locate = locate;

  /* ---------------- help ---------------- */
  const KEYS = [['/', 'Search'], ['Esc', 'Close / deselect'], ['F', 'Follow selected'], ['C', 'Chase camera'], ['3', '3D airspace'], ['G', 'Globe'], ['R', 'Radar scope mode'],
    ['L', 'Labels: auto / on / off'], ['T', 'Trails: selected / all / off'], ['K', 'Color by altitude / speed / climb / class'], ['P', 'Next map style'], ['N', 'Nearest aircraft'],
    ['[ ]', 'Previous / next aircraft'], ['X', 'Surprise me'], ['M', 'Layers'], ['S', 'Stats'], ['A', 'Alerts'], ['W', 'Watchlist'], ['V', 'Sky view'], ['Shift F', 'Filters'], ['Shift L', 'List'], ['?', 'This help']];
  function help() {
    UI.modal(`<h2>SQUAWK flight radar</h2><p>Live ADS-B traffic from free community networks (adsb.lol, airplanes.live, adsb.fi, OpenSky) with automatic failover.
      Click any aircraft for its route, photo and profile. Drag with the right mouse button (or two fingers) to tilt and rotate.</p>
      <div class="keys">${KEYS.map(([k, d]) => `<div><span>${d}</span><kbd>${k}</kbd></div>`).join('')}</div>
      <p class="small muted" style="margin-top:16px">Data: community ADS-B feeders via the providers above, adsbdb.com routes, Planespotters.net photos, RainViewer radar, OpenFreeMap tiles, OurAirports. Positions between updates are dead-reckoned from speed, track and turn rate.</p>`);
  }
  UI.help = help;

  /* ---------------- keyboard ---------------- */
  function cycle(key, vals) { SQ.set(key, vals[(vals.indexOf(S[key]) + 1) % vals.length]); }
  function nearest(from) {
    const c = from || SQ.map.map.getCenter();
    const lat = c.lat, lon = c.lng == null ? c.lon : c.lng;
    let best = null, bd = Infinity;
    for (const ac of T.visible) { if (ac.gnd) continue; const d = G.distKm(lat, lon, ac.rlat, ac.rlon); if (d < bd) { bd = d; best = ac; } }
    return best;
  }
  UI.nearest = nearest;
  UI.surprise = () => {
    const all = Array.from(T.list.values()).filter((a) => !a.gnd);
    if (!all.length) return;
    const odd = all.filter((a) => a.odd || a.emergency);
    const pick = odd.length && Math.random() < 0.7 ? U.pick(odd) : U.pick(all);
    T.select(pick.hex, { from: 'surprise' });
    SQ.map.flyToAc(pick, { zoom: 8 });
  };
  function step(dir) {
    const c = SQ.map.map.getCenter();
    const list = T.visible.slice().sort((a, b) => G.distKm(c.lat, c.lng, a.rlat, a.rlon) - G.distKm(c.lat, c.lng, b.rlat, b.rlon));
    if (!list.length) return;
    const i = list.findIndex((a) => a.hex === T.selected);
    const next = list[(i + dir + list.length) % list.length];
    T.select(next.hex, { from: 'key' });
  }
  function initKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.altKey) return;
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || e.key === '/') { e.preventDefault(); $('#q').focus(); return; }
      if (e.ctrlKey) return;
      const k = e.key;
      if (k === 'Escape') {
        if (!$('#modal').hidden) UI.closeModal();
        else if (SQ.map.chase) SQ.map.toggleChase();
        else if (T.selected) T.select(null);
        else if (UI.panel) UI.close();
        return;
      }
      if (e.shiftKey && k === 'F') return UI.open('filters');
      if (e.shiftKey && k === 'L') return UI.open('list');
      switch (k.toLowerCase()) {
        case 'f': if (T.selected) SQ.map.toggleFollow(); break;
        case 'c': SQ.map.toggleChase(); break;
        case '3': SQ.set('view3d', !S.view3d); break;
        case 'g': SQ.set('globe', !S.globe); break;
        case 'r': SQ.set('scope', !S.scope); break;
        case 'l': cycle('labels', ['auto', 'on', 'off']); toast('Labels: <b>' + S.labels + '</b>'); break;
        case 't': cycle('trails', ['selected', 'all', 'off']); toast('Trails: <b>' + S.trails + '</b>'); break;
        case 'k': cycle('colorMode', ['altitude', 'speed', 'vrate', 'class']); toast('Color by <b>' + S.colorMode + '</b>'); break;
        case 'p': cycle('style', ['scope', 'chart', 'satellite']); break;
        case 'n': { const h = S.home && S.home.src === 'gps' ? S.home : null; const a = nearest(h); if (a) { T.select(a.hex, { from: 'key' }); SQ.map.flyToAc(a); } break; }
        case '[': step(-1); break;
        case ']': step(1); break;
        case 'x': UI.surprise(); break;
        case 'm': UI.open('layers'); break;
        case 's': UI.open('stats'); break;
        case 'a': UI.open('alerts'); break;
        case 'w': UI.open('watch'); break;
        case 'v': UI.open('sky'); break;
        case '?': case 'h': help(); break;
        default: return;
      }
    });
  }

  /* ---------------- mobile bottom sheets ---------------- */
  function translateY(el) { const m = new DOMMatrixReadOnly(getComputedStyle(el).transform); return m.m42; }
  UI.dragSheet = (el, handles, onEnd) => {
    let y0 = 0, base = 0, t0 = 0, drag = false, moved = false, id = 0;
    el.addEventListener('pointerdown', (e) => {
      if (!SQ.isMobile() || !e.target.closest(handles) || e.target.closest('button, a, input, select')) return;
      drag = true; moved = false; y0 = e.clientY; t0 = performance.now(); base = translateY(el); id = e.pointerId;
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== id) return;
      const dy = e.clientY - y0;
      if (!moved && Math.abs(dy) < 6) return;
      if (!moved) { moved = true; el.classList.add('dragging'); try { el.setPointerCapture(id); } catch (er) { /* ignore */ } }
      el.style.transform = 'translateY(' + Math.max(0, base + dy) + 'px)';
    });
    const end = (e) => {
      if (!drag || e.pointerId !== id) return;
      drag = false;
      const dy = e.clientY - y0, v = dy / Math.max(1, performance.now() - t0);
      el.classList.remove('dragging');
      const y = Math.max(0, base + dy);
      el.style.transform = '';
      onEnd(moved ? { y, v, h: el.offsetHeight } : { tap: true });
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  /* ---------------- status, clock, live badge, banner ---------------- */
  function tickClock() {
    const d = new Date();
    $('#utc').textContent = F.utc(d);
    $('#lcl').textContent = 'LCL ' + F.local(d);
  }
  function liveBadge() {
    const f = SQ.feed, el = $('#live'), txt = $('#liveTxt');
    el.classList.remove('ok', 'warn', 'sim', 'bad');
    if (f.active === 'sim') { el.classList.add('sim'); txt.textContent = f.simFallback ? 'SIMULATED' : 'SIM MODE'; }
    else if (!f.active || !f.lastOk) { el.classList.add(f.status === 'degraded' ? 'bad' : 'warn'); txt.textContent = f.status === 'degraded' ? 'RETRYING' : 'CONNECTING'; }
    else if (Date.now() - f.lastOk > 20000) { el.classList.add('warn'); txt.textContent = 'STALE ' + F.ago(Date.now() - f.lastOk); }
    else { el.classList.add('ok'); txt.textContent = 'LIVE ' + f.PROVIDERS[f.active].name.toUpperCase(); }
    const b = $('#banner');
    const show = f.simFallback;
    if (show && b.hidden) {
      b.innerHTML = '<span>Live ADS-B feeds are unreachable from this browser (offline, blocked or rate limited). Showing <b>simulated</b> traffic on real routes.</span>';
      const r = SQ.h('button', { class: 'btn pri', onclick: () => { SQ.feed.kick(); toast('Retrying live feeds...'); } }, 'Retry');
      const s = SQ.h('button', { class: 'btn', onclick: () => UI.open('settings') }, 'Sources');
      const x = SQ.h('button', { class: 'ib', 'aria-label': 'Dismiss', onclick: () => { b.hidden = true; b.dataset.dismissed = '1'; } }, '<svg><use href="#i-x"/></svg>');
      b.append(r, s, x);
      if (!b.dataset.dismissed) b.hidden = false;
    } else if (!show && !b.hidden) b.hidden = true;
  }
  function status() {
    $('#sTracked').textContent = F.n(T.list.size);
    $('#sView').textContent = F.n(T.visible.length);
    let air = 0;
    for (const ac of T.visible) if (!ac.gnd) air++;
    $('#sAir').textContent = air + ' airborne';
    $('#sFps').textContent = SQ.render.fps ? SQ.render.fps + ' fps' : '';
    const n = T.filterCount(), fb = $('#fBadge');
    fb.textContent = n; fb.classList.toggle('show', n > 0);
  }
  /* ---------------- overhead ---------------- */
  function overhead() {
    const el = $('#overhead'), h = S.home;
    if (!h || h.src !== 'gps' || S.scope) { el.hidden = true; return; }
    let best = null, bd = 40;
    for (const ac of T.list.values()) {
      if (ac.gnd || ac.rlat == null) continue;
      const d = G.distKm(h.lat, h.lon, ac.rlat, ac.rlon);
      if (d < bd) { bd = d; best = ac; }
    }
    if (!best || T.selected === best.hex) { el.hidden = true; return; }
    const brg = G.bearing(h.lat, h.lon, best.rlat, best.rlon);
    const elev = Math.atan2((best.ralt || 0) * 0.3048, bd * 1000) * G.DEG;
    const col = SQ.color.forAc(best, S.colorMode).rgb;
    el.innerHTML = `<img src="${SQ.icons.dataUrl(best.shape, col, 22)}" alt=""><small>NEAREST</small><b>${F.esc(best.flight || best.reg || best.hex.toUpperCase())}</b><span>${F.esc(best.type || '')} &middot; ${F.alt(best.ralt)} &middot; ${F.dist(bd / 1.852)} ${F.compass(brg)} &middot; ${Math.round(elev)}&deg; up</span>`;
    el.hidden = false;
    el.onclick = () => { T.select(best.hex, { from: 'overhead' }); SQ.map.flyToAc(best); };
  }

  /* ---------------- alerts wiring ---------------- */
  const EM = { general: 'General emergency', lifeguard: 'Medical (lifeguard)', minfuel: 'Minimum fuel', nordo: 'Radio failure', unlawful: 'Unlawful interference', downed: 'Aircraft downed', reserved: 'Emergency' };
  UI.EM = EM;
  SQ.alerts = [];
  function pushAlert(kind, ac, text) {
    SQ.alerts.unshift({ kind, hex: ac.hex, cs: ac.flight || ac.reg || ac.hex.toUpperCase(), text, t: Date.now(), type: ac.type });
    if (SQ.alerts.length > 80) SQ.alerts.pop();
    const n = SQ.alerts.filter((a) => a.kind === 'em' && Date.now() - a.t < 3600e3).length;
    const b = $('#aBadge'); b.textContent = n; b.classList.toggle('show', n > 0);
    if (UI.panel === 'alerts') UI.rerender();
  }
  SQ.on('alert:emergency', (ac) => {
    const what = EM[ac.emergency] || 'Emergency';
    pushAlert('em', ac, what + ' · squawk ' + (ac.squawk || '----'));
    if (ac.sim && !SQ.introDone) return;
    toast(`<b>${F.esc(ac.flight || ac.hex.toUpperCase())}</b> ${F.esc(what)} (${F.esc(ac.squawk || '')})`, 'em', { label: 'Show', fn: () => { T.select(ac.hex); SQ.map.flyToAc(ac); } }, 9000);
    snd.play('alert');
    notify('Emergency: ' + (ac.flight || ac.hex.toUpperCase()), what + ', squawk ' + ac.squawk);
  });
  SQ.on('alert:watch', (ac) => {
    pushAlert('watch', ac, 'Watchlist match');
    toast(`Watchlist: <b>${F.esc(ac.flight || ac.reg || ac.hex.toUpperCase())}</b> ${F.esc(ac.type || '')} is live`, '', { label: 'Show', fn: () => { T.select(ac.hex); SQ.map.flyToAc(ac); } }, 8000);
    snd.play('watch');
    notify('Watchlist: ' + (ac.flight || ac.reg || ac.hex), (ac.type || '') + ' is now being tracked');
  });
  SQ.on('alert:odd', (ac, why) => pushAlert('odd', ac, why));
  SQ.on('feed:provider', (id, prev, why) => {
    if (why === 'recovered') toast('Live data restored via <b>' + F.esc(SQ.feed.PROVIDERS[id].name) + '</b>');
    if (why === 'failover' && prev && id !== 'sim' && SQ.feed.lastOk && SQ.introDone) toast(F.esc(SQ.feed.PROVIDERS[prev].name) + ' is not responding. Switched to <b>' + F.esc(SQ.feed.PROVIDERS[id].name) + '</b>.', 'warn');
    liveBadge();
  });
  SQ.on('map:offline', () => toast('Map tiles unreachable. Using the built-in offline basemap.', 'warn', null, 7000));

  /* ---------------- airport board ---------------- */
  let boardAp = null, boardTimer = 0;
  function classifyAround(ap) {
    const [, , , , , lat, lon, elev] = ap, rows = { arr: [], dep: [], gnd: [], over: [] };
    for (const ac of T.list.values()) {
      const la = ac.rlat == null ? ac.lat : ac.rlat, lo = ac.rlon == null ? ac.lon : ac.rlon;
      if (Math.abs(la - lat) > 1) continue;
      const d = G.distKm(lat, lon, la, lo);
      if (d > 90) continue;
      const agl = (ac.gnd ? 0 : ac.ralt == null ? ac.alt || 0 : ac.ralt) - (elev || 0);
      if (ac.gnd || (agl < 250 && (ac.gs || 0) < 70)) { if (d < 7) rows.gnd.push({ ac, d }); continue; }
      const closing = Math.abs(U.angDiff(ac.track || 0, G.bearing(la, lo, lat, lon))) < 50;
      if (agl < 15000 && closing && (ac.vr || 0) < 300) rows.arr.push({ ac, d, eta: (d / Math.max(150, (ac.gs || 200) * 1.852)) * 60 });
      else if (agl < 15000 && !closing && (ac.vr || 0) > 150 && d < 70) rows.dep.push({ ac, d });
      else if (agl >= 15000 && d < 45) rows.over.push({ ac, d });
    }
    rows.arr.sort((a, b) => a.eta - b.eta); rows.dep.sort((a, b) => a.d - b.d); rows.over.sort((a, b) => a.d - b.d);
    return rows;
  }
  function boardTable(title, list, cols) {
    if (!list.length) return `<h3 class="small muted" style="margin:16px 0 4px;letter-spacing:.14em">${title.toUpperCase()} <span>0</span></h3>`;
    return `<h3 class="small" style="margin:16px 0 0;letter-spacing:.14em;color:var(--ink3)">${title.toUpperCase()} <span class="mono">${list.length}</span></h3><table class="board"><tr>${cols.map((c) => '<th>' + c[0] + '</th>').join('')}</tr>` +
      list.slice(0, 12).map((r) => `<tr class="clk" data-sel="${r.ac.hex}">${cols.map((c) => '<td>' + c[1](r) + '</td>').join('')}</tr>`).join('') + '</table>';
  }
  function renderBoard(first) {
    const ap = boardAp;
    if (!ap || (!first && $('#modal').hidden)) { clearInterval(boardTimer); return; }
    const [icao, iata, name, city, iso, lat, lon, elev] = ap;
    const R = classifyAround(ap);
    const cs = (r) => `<b>${F.esc(r.ac.flight || r.ac.reg || r.ac.hex.toUpperCase())}</b>`, ty = (r) => F.esc(r.ac.type || '--');
    const tables = boardTable('Inbound', R.arr, [['Flight', cs], ['Type', ty], ['Alt', (r) => F.altShort(r.ac.ralt, r.ac.gnd)], ['Dist', (r) => F.dist(r.d / 1.852)], ['ETA', (r) => F.local(new Date(Date.now() + r.eta * 60000))]]) +
      boardTable('Outbound', R.dep, [['Flight', cs], ['Type', ty], ['Alt', (r) => F.altShort(r.ac.ralt)], ['Climb', (r) => F.vr(r.ac.vr)], ['Heading', (r) => F.deg(r.ac.rtrk) + ' ' + F.compass(r.ac.rtrk)]]) +
      boardTable('On ground', R.gnd, [['Flight', cs], ['Type', ty], ['Speed', (r) => F.spd(r.ac.gs)], ['Operator', (r) => F.esc(r.ac.op ? r.ac.op.name : r.ac.ownOp || '')]]) +
      boardTable('Overhead', R.over, [['Flight', cs], ['Type', ty], ['Level', (r) => F.altShort(r.ac.ralt)], ['Speed', (r) => F.spd(r.ac.gs)]]);
    if (first) {
      UI.modal(`<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><h2 style="font:700 30px var(--mono);letter-spacing:.04em">${F.esc(iata || icao)}</h2><span class="mono muted">${F.esc(icao)}</span></div>
        <p style="margin:2px 0 0">${F.esc(name)}</p><p class="small muted" style="margin:2px 0 10px">${F.esc(city ? city + ', ' : '')}${F.esc(SQ.countryName(iso))} &middot; ${F.lat(lat)} ${F.lon(lon)} &middot; elev ${F.alt(elev)}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri" id="apFly"><svg><use href="#i-target"/></svg>Fly here</button><button class="btn" id="apHome"><svg><use href="#i-locate"/></svg>Use as my location</button></div>
        <div id="apWx" class="metar">Fetching METAR...</div><div id="apTraffic"></div><p class="small muted">Traffic classified live from position, track and vertical rate within 90 km. Not an official schedule.</p>`, (b) => {
        $('#apFly', b).onclick = () => { UI.closeModal(); SQ.map.flyTo(lat, lon, 11); };
        $('#apHome', b).onclick = () => { SQ.set('home', { lat, lon, src: 'gps' }); UI.closeModal(); toast('Home set to ' + F.esc(iata || icao)); };
        b.onclick = (e) => { const r = e.target.closest('[data-sel]'); if (r) { const ac = T.get(r.dataset.sel); UI.closeModal(); if (ac) { T.select(ac.hex, { from: 'airport' }); SQ.map.flyToAc(ac); } } };
        SQ.enrich.metar(icao).then((m) => {
          const el = $('#apWx', b);
          if (!el) return;
          if (!m) { el.textContent = 'No METAR available for ' + icao + '.'; return; }
          const wind = m.wdir != null ? (m.wdir === 'VRB' ? 'Variable' : F.deg(m.wdir)) + ' at ' + m.wspd + ' kt' + (m.wgst ? ' gusting ' + m.wgst : '') : '';
          el.innerHTML = `${m.cat ? '<span class="cat ' + F.esc(m.cat) + '">' + F.esc(m.cat) + '</span> ' : ''}${F.esc(m.raw || '')}<div class="small" style="margin-top:6px;color:var(--ink2)">${[wind, m.temp != null ? m.temp + '°C / dew ' + m.dew + '°C' : '', m.vis != null ? 'vis ' + m.vis + ' sm' : '', m.altim != null ? 'QNH ' + Math.round(m.altim) : ''].filter(Boolean).map(F.esc).join(' &middot; ')}</div>`;
        });
      });
      clearInterval(boardTimer);
      boardTimer = setInterval(() => renderBoard(false), 3000);
    }
    const tr = $('#apTraffic');
    if (tr) tr.innerHTML = tables;
  }
  SQ.on('airport:click', (code) => { const ap = SQ.airport(code); if (!ap) return; boardAp = ap; renderBoard(true); });
  SQ.on('modal:close', () => { boardAp = null; clearInterval(boardTimer); });

  UI.init = () => {
    initSearch();
    initControls();
    initKeys();
    legend();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(() => { liveBadge(); status(); }, 1000);
    setInterval(overhead, 4000);
    UI.dragSheet($('#drawer'), '.grab, .dhead', (r) => { if (r.tap) return; if (r.v > 0.5 || r.y > r.h * 0.35) UI.close(); });
    window.addEventListener('beforeunload', () => SQ.saveSettings && SQ.ls.set('settings', S));
  };
})();
