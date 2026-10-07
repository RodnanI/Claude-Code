/* SQUAWK detail panel: selected aircraft with route, photo, live readouts, profile charts */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo, F = SQ.fmt, T = SQ.tracker, $ = SQ.$;
  const D = (SQ.detail = {});
  let el, box, cur = null, route = null, routeState = 'idle', photo = undefined, info = null, sheet = 'peek', hoverX = null, lastChart = 0, lastTrailV = -1;

  const CAT = { A1: 'Light', A2: 'Small', A3: 'Large', A4: 'High vortex large', A5: 'Heavy', A6: 'High performance', A7: 'Rotorcraft', B1: 'Glider', B2: 'Lighter than air', B3: 'Parachutist', B4: 'Ultralight', B6: 'Drone (UAV)', B7: 'Space vehicle', C1: 'Emergency vehicle', C2: 'Service vehicle', C3: 'Obstacle' };
  const MODES = { autopilot: 'AP', vnav: 'VNAV', lnav: 'LNAV', althold: 'ALT HLD', approach: 'APP', tcas: 'TCAS' };

  function name(ac) { return ac.flight || ac.reg || ac.hex.toUpperCase(); }
  function opName(ac) {
    if (route && route.airline && route.airline.name) return route.airline.name;
    if (ac.op) return ac.op.name;
    return ac.ownOp || (info && info.owner) || '';
  }

  function skeleton(ac) {
    const watched = (S.watch || []).some((w) => [ac.flight, ac.reg, ac.hex.toUpperCase()].includes(w.toUpperCase()));
    box.innerHTML = `
      <div class="dhero">
        <div class="id"><div class="cs"><span id="dCs"></span><span id="dFlags"></span></div><div class="op" id="dOp"></div></div>
        <div class="acts">
          <button class="ib ${SQ.map.follow ? 'on' : ''}" id="dFollow" title="Follow (F)" aria-label="Follow"><svg><use href="#i-target"/></svg></button>
          <button class="ib ${watched ? 'on' : ''}" id="dStar" title="Add to watchlist" aria-label="Watch"><svg><use href="#i-star"/></svg></button>
          <button class="ib" id="dX" title="Close (Esc)" aria-label="Close"><svg><use href="#i-x"/></svg></button>
        </div>
      </div>
      <div class="peek" id="dPeek"></div>
      <div class="photo" id="dPhoto"><div class="noimg">Loading photo...</div></div>
      <div class="route" id="dRoute"></div>
      <div class="read" id="dRead"></div>
      <div class="ap-strip" id="dAp" hidden></div>
      <div class="dsec"><h4>Altitude <small id="cAltU"></small></h4><canvas class="chart" id="cAlt" style="height:82px"></canvas>
        <h4 style="margin-top:10px">Ground speed <small id="cSpdU"></small></h4><canvas class="chart" id="cSpd" style="height:66px"></canvas></div>
      <div class="dsec"><h4>Aircraft</h4><dl class="kv" id="dAc"></dl></div>
      <div class="dsec" id="dAtmS"><h4>Atmosphere <small>derived from Mode S</small></h4><dl class="kv" id="dAtm"></dl></div>
      <div class="dsec"><h4>Signal</h4><dl class="kv" id="dSig"></dl></div>
      <div class="dacts">
        <button class="btn" id="dChase"><svg><use href="#i-camera"/></svg>Chase cam</button>
        <button class="btn" id="dFit"><svg><use href="#i-route"/></svg>Fit route</button>
        <button class="btn" id="d3d"><svg><use href="#i-cube"/></svg>3D curtain</button>
        <button class="btn" id="dShare"><svg><use href="#i-share"/></svg>Share</button>
      </div>
      <div class="links" id="dLinks"></div>`;
    $('#dX').onclick = () => T.select(null);
    $('#dFollow').onclick = () => SQ.map.toggleFollow();
    $('#dStar').onclick = () => toggleWatch(ac);
    $('#dChase').onclick = () => SQ.map.toggleChase();
    $('#dFit').onclick = () => (route ? SQ.map.fitRoute(route, T.get(cur) || ac) : SQ.map.flyToAc(T.get(cur) || ac, { zoom: 9 }));
    $('#d3d').onclick = () => { SQ.set('view3d', !S.view3d); };
    $('#dShare').onclick = () => share(ac);
    const hov = (x) => { hoverX = x; charts(T.get(cur), true); };
    SQ.charts.hover($('#cAlt'), hov);
    SQ.charts.hover($('#cSpd'), hov);
  }

  function toggleWatch(ac) {
    const key = ac.flight || ac.reg || ac.hex.toUpperCase();
    const list = (S.watch || []).slice();
    const i = list.findIndex((w) => [ac.flight, ac.reg, ac.hex.toUpperCase()].includes(w.toUpperCase()));
    if (i >= 0) { list.splice(i, 1); SQ.ui.toast('Removed <b>' + F.esc(key) + '</b> from watchlist'); }
    else { list.push(key); SQ.ui.toast('Watching <b>' + F.esc(key) + '</b>. You will be alerted when it appears.'); }
    SQ.set('watch', list);
    $('#dStar').classList.toggle('on', i < 0);
  }
  async function share(ac) {
    SQ.map.writeHash();
    const url = location.href;
    const title = name(ac) + (route ? ' ' + (route.origin.iata || route.origin.icao) + '-' + (route.dest.iata || route.dest.icao) : '') + ' on SQUAWK';
    try {
      if (navigator.share && SQ.isMobile()) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); SQ.ui.toast('Link copied to clipboard'); }
    } catch (e) { /* cancelled */ }
  }

  /* ---------------- sections ---------------- */
  function hero(ac) {
    $('#dCs').textContent = name(ac);
    let fl = '';
    if (ac.emergency) fl += `<span class="flag em">${F.esc(ac.squawk || 'EMERG')}</span>`;
    if (ac.mil) fl += '<span class="flag mil">MIL</span>';
    if (ac.sim) fl += '<span class="flag sim">SIM</span>';
    if (ac.lost) fl += '<span class="flag lost">SIGNAL LOST</span>';
    else if (ac.odd && !ac.mil) fl += '<span class="flag odd" title="' + F.esc(ac.odd) + '">RARE</span>';
    $('#dFlags').innerHTML = fl;
    const op = opName(ac);
    const radio = route && route.airline && route.airline.radio ? route.airline.radio : ac.op && ac.op.radio;
    const iata = route && route.airline && route.airline.iata;
    const logo = iata ? `<img class="logo" src="${SQ.enrich.logo(iata)}" alt="" onerror="this.remove()">` : '';
    const sub = [op, ac.type ? (ac.desc ? F.title(ac.desc) : ac.type) : ''].filter(Boolean);
    $('#dOp').innerHTML = logo + '<span>' + F.esc(sub.join(' · ') || 'Unknown operator') + (radio ? ' <span class="muted">"' + F.esc(radio) + '"</span>' : '') + '</span>';
  }
  function renderPhoto(ac) {
    const p = $('#dPhoto');
    if (!p) return;
    if (photo === undefined) { p.innerHTML = '<div class="noimg">Loading photo...</div>'; return; }
    if (!photo || !photo.src) {
      const col = SQ.color.forAc(ac, S.colorMode).rgb;
      p.innerHTML = `<div class="noimg"><div><img src="${SQ.icons.dataUrl(ac.shape, col, 90)}" alt=""><div>${ac.sim ? 'Simulated aircraft, no photo' : 'No photo on file for ' + F.esc(ac.reg || ac.hex.toUpperCase())}</div></div></div>`;
      return;
    }
    p.innerHTML = `<img alt="${F.esc(ac.reg || '')} photo"><div class="credit">&copy; ${F.esc(photo.by || 'Photographer')} &middot; <a href="${F.esc(photo.link || '#')}" target="_blank" rel="noopener">${F.esc(photo.site)}</a></div>`;
    const img = p.querySelector('img');
    img.onload = () => img.classList.add('ok');
    img.onerror = () => { photo = null; renderPhoto(ac); };
    img.src = photo.src;
  }
  function apHtml(a, right) {
    const code = a.iata || a.icao || '???';
    return `<div class="ap ${right ? 'r' : ''}"><b>${F.esc(code)}</b><span>${F.esc(a.city || a.name || '')}</span><small>${F.esc(a.icao && a.iata ? a.icao : '')}${a.country ? ' · ' + F.esc(a.iso || a.country) : ''}</small></div>`;
  }
  function renderRoute(ac) {
    const r = $('#dRoute');
    if (!r) return;
    if (routeState === 'loading') { r.className = 'route none'; r.innerHTML = 'Looking up route...'; return; }
    if (!route) {
      r.className = 'route none';
      const near = nearestAirport(ac);
      r.innerHTML = (ac.flight ? 'No route on file for ' + F.esc(ac.flight) + '.' : 'No callsign broadcast.') + (near ? ` Nearest airport: <b>${F.esc(near.a[1] || near.a[0])}</b> ${F.esc(near.a[3] || near.a[2])}, ${F.dist(near.d / 1.852)} ${F.compass(near.b)}.` : '');
      return;
    }
    r.className = 'route';
    r.innerHTML = `<div class="ends">${apHtml(route.origin)}<div class="mid"><svg><use href="#i-plane"/></svg></div>${apHtml(route.dest, true)}</div>
      <div class="prog"><i id="rFill"></i><b id="rDot"></b></div><div class="times"><span id="rLeft"></span><span id="rRight"></span></div>
      ${route.verified === false ? '<div class="warn">Route data may be stale: this aircraft is not near the published route.</div>' : ''}
      ${route.via && route.via.length ? '<div class="small muted" style="margin-top:6px">via ' + route.via.map((v) => F.esc(v.iata || v.icao)).join(', ') + '</div>' : ''}`;
    liveRoute(ac);
  }
  function liveRoute(ac) {
    if (!route || !$('#rFill')) return;
    const p = SQ.routeProgress(route, ac.rlat, ac.rlon);
    $('#rFill').style.width = (p.frac * 100).toFixed(1) + '%';
    $('#rDot').style.left = (p.frac * 100).toFixed(1) + '%';
    $('#rLeft').textContent = F.dist(p.fromO / 1.852) + ' flown';
    let right = F.dist(p.toD / 1.852) + ' to go';
    if (!ac.gnd && ac.gs > 80) {
      const min = (p.toD / (ac.gs * 1.852)) * 60;
      const eta = new Date(Date.now() + min * 60000);
      right = 'ETA ' + F.local(eta) + ' (' + F.dur(min) + ')';
    }
    $('#rRight').textContent = right;
  }
  function nearestAirport(ac) {
    const ap = SQ.airports();
    if (!ap) return null;
    let best = null, bd = Infinity;
    for (const a of ap.list) {
      if (Math.abs(a[5] - ac.lat) > 3) continue;
      const d = G.distKm(ac.lat, ac.lon, a[5], a[6]);
      if (d < bd) { bd = d; best = a; }
    }
    return best ? { a: best, d: bd, b: G.bearing(ac.lat, ac.lon, best[5], best[6]) } : null;
  }
  function cell(lbl, p, cls) { return `<div><span>${lbl}</span><b class="${cls || ''}">${p[0]}</b><em>${p[1]}</em></div>`; }
  function readouts(ac) {
    const r = $('#dRead');
    if (!r) return;
    const vr = ac.vr || 0, trend = ac.gnd ? '' : vr > 250 ? 'up' : vr < -250 ? 'dn' : '';
    const altP = F.altP(ac.ralt == null ? null : Math.round(ac.ralt / 25) * 25, ac.gnd);
    if (trend) altP[1] += trend === 'up' ? ' ▲' : ' ▼';
    const h = S.home;
    const distP = h ? F.distP(G.distKm(h.lat, h.lon, ac.rlat, ac.rlon) / 1.852) : ['--', ''];
    r.innerHTML = cell('Altitude', altP, trend) + cell('Ground speed', F.spdP(ac.gs)) + cell('Vertical', F.vrP(ac.gnd ? null : ac.vr), trend) +
      cell('Track', [F.deg(ac.rtrk), F.compass(ac.rtrk)]) + cell('Squawk', [F.esc(ac.squawk || '----'), ''], ac.emergency ? 'dn' : '') +
      (h ? cell(h.src === 'gps' ? 'From you' : 'From home', distP) : cell('Mach', [ac.mach ? ac.mach.toFixed(3) : '--', '']));
    const peek = $('#dPeek');
    if (peek) {
      const rt = route ? (route.origin.iata || route.origin.icao) + ' > ' + (route.dest.iata || route.dest.icao) : ac.type || '--';
      peek.innerHTML = `<div><span>Alt</span>${F.altShort(ac.ralt, ac.gnd) || '--'}</div><div><span>Speed</span>${F.spd(ac.gs)}</div><div><span>${route ? 'Route' : 'Type'}</span>${F.esc(rt)}</div>`;
    }
    const ap = $('#dAp');
    const bits = [];
    if (ac.navAlt != null) bits.push('SEL <b>' + (ac.navAlt >= 18000 && S.units !== 'metric' ? F.fl(ac.navAlt) : F.alt(ac.navAlt)) + '</b>');
    if (ac.navHdg != null) bits.push('HDG <b>' + F.deg(ac.navHdg) + '</b>');
    if (ac.navQnh != null) bits.push('QNH <b>' + Math.round(ac.navQnh) + '</b>');
    if (ac.navModes && ac.navModes.length) bits.push('<b>' + ac.navModes.map((m) => MODES[m] || m.toUpperCase()).join(' ') + '</b>');
    ap.hidden = !bits.length;
    if (bits.length) ap.innerHTML = '<span>AUTOPILOT</span>' + bits.map((b) => '<span>' + b + '</span>').join('');
  }
  function kv(rows) { return rows.filter((r) => r[1] != null && r[1] !== '').map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''); }
  function aircraftInfo(ac) {
    const ti = SQ.typeInfo(ac.type);
    const c = ac.country;
    const flag = c && c.iso ? `<img src="${SQ.flagUrl(c.iso)}" alt="" onerror="this.remove()">` : '';
    $('#dAc').innerHTML = kv([
      ['Type', ac.type ? F.esc((ac.desc ? F.title(ac.desc) + ' ' : '') + '(' + ac.type + ')') : info && info.type ? F.esc(info.maker + ' ' + info.type) : 'Unknown'],
      ['Registration', F.esc(ac.reg || (info && info.reg) || '--')],
      ['ICAO address', F.esc(ac.hex.toUpperCase())],
      ['Registered in', c ? flag + F.esc(c.name) : info && info.ownerCountry ? F.esc(info.ownerCountry) : ''],
      ['Operator', F.esc(ac.ownOp || (info && info.owner) || (ac.op ? ac.op.name : ''))],
      ['Built', F.esc(ac.year || '')],
      ['Category', ac.cat ? F.esc(ac.cat + ' ' + (CAT[ac.cat] || '')) : ''],
      ['Wake', ti && SQ.icons.WTC[ti.wtc] ? SQ.icons.WTC[ti.wtc] : ''],
      ['Engines', ti ? F.esc(SQ.icons.describeClass(ti.cls)) : ''],
      ['Note', ac.odd ? F.esc(ac.odd) : '']
    ]);
  }
  function atmosphere(ac) {
    const rows = [];
    if (ac.wd != null && ac.ws != null) {
      rows.push(['Wind', F.deg(ac.wd) + ' / ' + F.spd(ac.ws)]);
      if (ac.track != null) {
        const comp = ac.ws * Math.cos((ac.wd - ac.track) * G.RAD);
        rows.push([comp >= 0 ? 'Headwind' : 'Tailwind', F.spd(Math.abs(comp))]);
      }
    }
    if (ac.oat != null) {
      const isa = ac.ralt != null ? Math.round(ac.oat - (15 - (1.98 * Math.min(ac.ralt, 36089)) / 1000)) : null;
      rows.push(['Outside air', Math.round(ac.oat) + ' \u00b0C' + (isa != null ? ' (ISA ' + (isa >= 0 ? '+' : '') + isa + ')' : '')]);
    }
    if (ac.tas != null) rows.push(['True airspeed', F.spd(ac.tas)]);
    if (ac.ias != null) rows.push(['Indicated', F.spd(ac.ias)]);
    if (ac.mach != null) rows.push(['Mach', ac.mach.toFixed(3)]);
    if (ac.altGeom != null && ac.alt != null && !ac.gnd) rows.push(['GNSS altitude', F.alt(ac.altGeom) + ' (' + (ac.altGeom - ac.alt >= 0 ? '+' : '') + F.n(ac.altGeom - ac.alt) + ')']);
    $('#dAtmS').hidden = !rows.length;
    $('#dAtm').innerHTML = kv(rows);
  }
  function signal(ac) {
    const now = Date.now();
    $('#dSig').innerHTML = kv([
      ['Source', F.esc(ac.src || '--') + (ac.provider ? ' via ' + F.esc(SQ.feed.PROVIDERS[ac.provider] ? SQ.feed.PROVIDERS[ac.provider].name : ac.provider) : '')],
      ['Position age', F.ago(now - ac.t)],
      ['Tracked for', F.ago(now - ac.firstSeen) + (ac.traced ? ' (full flight loaded)' : '')],
      ['Position', F.lat(ac.rlat) + ' ' + F.lon(ac.rlon)],
      ['Messages', ac.msgs ? F.n(ac.msgs) : ''],
      ['Signal', ac.rssi != null && !ac.sim ? ac.rssi.toFixed(1) + ' dBFS' : '']
    ]);
  }
  function links(ac) {
    const hex = ac.hex.replace('~', '');
    const L = [['ADS-B Exchange', 'https://globe.adsbexchange.com/?icao=' + hex], ['adsb.lol', 'https://adsb.lol/?icao=' + hex], ['Planespotters', 'https://www.planespotters.net/hex/' + hex.toUpperCase()]];
    if (ac.flight && /^[A-Z]{3}\d/.test(ac.flight)) L.push(['FlightAware', 'https://www.flightaware.com/live/flight/' + ac.flight]);
    $('#dLinks').innerHTML = ac.sim ? '<span class="muted">Simulated traffic. External links disabled.</span>' : L.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}<svg><use href="#i-ext"/></svg></a>`).join('');
  }
  function charts(ac, force) {
    if (!ac || !$('#cAlt')) return;
    if (!force && ac.trailV === lastTrailV && Date.now() - lastChart < 5000) return;
    lastTrailV = ac.trailV; lastChart = Date.now();
    const tr = ac.trail, st = T.STRIDE, xs = [], alt = [], gs = [];
    const metric = S.units === 'metric';
    for (let i = 0; i < tr.length; i += st) { xs.push(tr[i + 3]); alt.push(metric ? tr[i + 2] * 0.3048 : tr[i + 2]); gs.push(S.units === 'metric' ? tr[i + 4] * 1.852 : S.units === 'imperial' ? tr[i + 4] * 1.15078 : tr[i + 4]); }
    const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim();
    const mint = getComputedStyle(document.documentElement).getPropertyValue('--mint').trim();
    const au = metric ? 'm' : 'ft', su = F.spdP(1)[1];
    $('#cAltU').textContent = au; $('#cSpdU').textContent = su;
    const kf = (v) => (Math.abs(v) >= 10000 ? Math.round(v / 1000) + 'k' : F.n(v));
    SQ.charts.series($('#cAlt'), { xs, ys: alt, color: amber, fill: true, zero: true, yFmt: kf, tipFmt: (v, t) => F.n(v) + ' ' + au + ' · ' + F.local(new Date(t)), hoverX, minSpan: 1000, empty: 'Collecting altitude history...' });
    SQ.charts.series($('#cSpd'), { xs, ys: gs, color: mint, zero: false, yFmt: (v) => F.n(v), tipFmt: (v, t) => F.n(v) + ' ' + su + ' · ' + F.local(new Date(t)), hoverX, minSpan: 40, empty: 'Collecting speed history...' });
  }

  /* ---------------- lifecycle ---------------- */
  function open(ac) {
    const same = cur === ac.hex;
    cur = ac.hex;
    if (!same) {
      route = null; routeState = 'loading'; photo = undefined; info = null; hoverX = null; lastTrailV = -1;
      skeleton(ac);
      hero(ac); renderPhoto(ac); renderRoute(ac); readouts(ac); aircraftInfo(ac); atmosphere(ac); signal(ac); links(ac);
      charts(ac, true);
      enrich(ac);
      box.scrollTop = 0;
    }
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');
    if (SQ.isMobile()) { if (SQ.ui.panel) SQ.ui.close(); setSheet('peek'); }
    SQ.map.updateTrail(ac);
    SQ.sound.play('blip');
    SQ.map.writeHash();
  }
  function enrich(ac) {
    const hex = ac.hex;
    SQ.enrich.route(ac).then((r) => {
      if (cur !== hex) return;
      route = r; routeState = 'done';
      const a = T.get(hex) || ac;
      renderRoute(a); hero(a); readouts(a);
      SQ.map.updateRoute(a, r);
    }).catch(() => { if (cur === hex) { routeState = 'done'; renderRoute(ac); } });
    SQ.enrich.photo(ac).then((p) => { if (cur === hex) { photo = p; renderPhoto(T.get(hex) || ac); } }).catch(() => { if (cur === hex) { photo = null; renderPhoto(ac); } });
    SQ.enrich.info(ac).then((i) => { if (cur === hex && i) { info = i; aircraftInfo(T.get(hex) || ac); hero(T.get(hex) || ac); } }).catch(() => {});
    SQ.enrich.trace(ac);
  }
  function close() {
    cur = null; route = null;
    el.classList.remove('open', 'half', 'full');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('detail-open');
    SQ.map.updateTrail(null);
    SQ.map.updateRoute(null);
    if (SQ.map.follow) SQ.map.setFollow(false);
    if (SQ.map.chase) SQ.map.toggleChase();
    SQ.map.writeHash();
  }
  function setSheet(s) {
    sheet = s;
    el.classList.toggle('half', s === 'half');
    el.classList.toggle('full', s === 'full');
    const hero = el.querySelector('.dhero'), pk = el.querySelector('.peek');
    if (hero) el.style.setProperty('--peek', (22 + hero.offsetHeight + (pk ? pk.offsetHeight : 0)) + 'px');
  }
  D.setSheet = setSheet;
  D.current = () => cur;

  SQ.on('select', (ac) => { if (ac) open(ac); else close(); });
  SQ.on('frame', () => {
    if (!cur) return;
    const ac = T.get(cur);
    if (!ac) return;
    readouts(ac); liveRoute(ac);
    if (!SQ._detailSlow || Date.now() - SQ._detailSlow > 1000) { SQ._detailSlow = Date.now(); signal(ac); atmosphere(ac); hero(ac); }
    charts(ac, false);
  });
  SQ.on('follow', (f) => { const b = $('#dFollow'); if (b) b.classList.toggle('on', f); const c = $('#dChase'); if (c) c.classList.toggle('on', SQ.map.chase); });
  SQ.on('setting:view3d', () => { const b = $('#d3d'); if (b) b.classList.toggle('on', S.view3d); const ac = T.get(cur); if (ac) SQ.map.updateTrail(ac); });
  SQ.on('trail:merged', (ac) => { if (ac.hex === cur) { SQ.map.updateTrail(ac); charts(ac, true); } });
  SQ.on('setting:units', () => { const ac = T.get(cur); if (ac) { readouts(ac); charts(ac, true); } });
  setInterval(() => { const ac = T.get(cur); if (ac && route) SQ.map.updateRoute(ac, route); }, 4000);

  D.init = () => {
    el = $('#detail'); box = $('#dt');
    SQ.ui.dragSheet(el, '.grab, .dhero, .peek', (r) => {
      if (r.tap) { if (sheet === 'peek') setSheet('half'); return; }
      const h = r.h, peekPx = parseFloat(getComputedStyle(el).getPropertyValue('--peek')) || 168;
      const stops = [['full', 0], ['half', h * 0.45], ['peek', h - peekPx]];
      if (r.y > h - peekPx * 0.55 || (r.v > 1.1 && sheet === 'peek')) { T.select(null); return; }
      let target;
      if (r.v > 0.55) target = sheet === 'full' ? 'half' : 'peek';
      else if (r.v < -0.55) target = sheet === 'peek' ? 'half' : 'full';
      else target = stops.reduce((a, b) => (Math.abs(b[1] - r.y) < Math.abs(a[1] - r.y) ? b : a))[0];
      setSheet(target);
    });
    SQ.on('map:tap-empty', () => { if (sheet !== 'peek') setSheet('peek'); else T.select(null); });
  };
})();
