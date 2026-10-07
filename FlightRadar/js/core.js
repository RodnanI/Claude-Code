/* SQUAWK core: namespace, events, settings, geo math, color scales, formatting, DOM helpers */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  SQ.version = '1.0.0';
  SQ.D = window.SQ_DATA = window.SQ_DATA || {};

  /* ---------------- events ---------------- */
  const listeners = {};
  SQ.on = (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn), fn);
  SQ.off = (ev, fn) => {
    const l = listeners[ev];
    if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  };
  SQ.emit = (ev, a, b, c) => {
    const l = listeners[ev];
    if (!l) return;
    for (const fn of l.slice()) {
      try { fn(a, b, c); } catch (e) { console.error('[SQ] handler for', ev, e); }
    }
  };

  /* ---------------- storage ---------------- */
  const ls = (SQ.ls = {
    get(k, d) {
      try { const v = localStorage.getItem('sq.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem('sq.' + k, JSON.stringify(v)); } catch (e) { /* quota or private mode */ } },
    del(k) { try { localStorage.removeItem('sq.' + k); } catch (e) { /* ignore */ } }
  });

  /* ---------------- settings ---------------- */
  const DEFAULTS = {
    units: 'aviation',
    style: 'scope',
    colorMode: 'altitude',
    labels: 'auto',
    trails: 'selected',
    layers: { airports: true, weather: false, night: true, rings: false, density: false, wind: false, coverage: false, relief: false },
    view3d: false,
    globe: false,
    scope: false,
    exaggerate: 4,
    provider: 'auto',
    rate: 'normal',
    corsProxy: '',
    intro: 'auto',
    sound: false,
    notify: false,
    fps: 60,
    iconScale: 1,
    home: null,
    watch: [],
    filters: {
      altMin: 0, altMax: 50000, spdMin: 0, spdMax: 800,
      cls: { airliner: true, regional: true, bizjet: true, ga: true, heli: true, mil: true, special: true, gnd: true, unknown: true },
      hideGround: false, text: '', squawk: ''
    }
  };
  SQ.DEFAULTS = DEFAULTS;

  function merge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const k of Object.keys(over)) {
      out[k] = base && typeof base[k] === 'object' && base[k] && !Array.isArray(base[k]) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }
  const S = (SQ.S = merge(JSON.parse(JSON.stringify(DEFAULTS)), ls.get('settings', {})));
  let saveT = 0;
  SQ.saveSettings = () => { clearTimeout(saveT); saveT = setTimeout(() => ls.set('settings', S), 250); };
  /* set('layers.weather', true) */
  SQ.set = (path, value) => {
    const keys = path.split('.');
    let o = S;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]] = o[keys[i]] || {};
    const k = keys[keys.length - 1];
    if (o[k] === value && typeof value !== 'object') return;
    o[k] = value;
    SQ.saveSettings();
    SQ.emit('setting', path, value);
    SQ.emit('setting:' + keys[0], path, value);
  };
  SQ.get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S);

  /* ---------------- math ---------------- */
  const PI = Math.PI, RAD = PI / 180, DEG = 180 / PI;
  const U = (SQ.u = {});
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  U.easeOut = (t) => 1 - Math.pow(1 - U.clamp(t, 0, 1), 3);
  U.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.angDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
  U.norm360 = (a) => ((a % 360) + 360) % 360;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  U.throttle = (fn, ms) => {
    let last = 0, t = 0;
    return function () {
      const now = Date.now(), args = arguments;
      clearTimeout(t);
      if (now - last >= ms) { last = now; fn.apply(this, args); }
      else t = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, ms - (now - last));
    };
  };
  U.debounce = (fn, ms) => {
    let t = 0;
    return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };

  /* ---------------- geo ---------------- */
  const R_KM = 6371.0088, KM_NM = 1.852;
  const G = (SQ.geo = { R_KM, KM_NM, RAD, DEG });
  G.distKm = (lat1, lon1, lat2, lon2) => {
    const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  };
  G.distNm = (a, b, c, d) => G.distKm(a, b, c, d) / KM_NM;
  G.bearing = (lat1, lon1, lat2, lon2) => {
    const p1 = lat1 * RAD, p2 = lat2 * RAD, dl = (lon2 - lon1) * RAD;
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return U.norm360(Math.atan2(y, x) * DEG);
  };
  /* destination from point, bearing deg, distance km -> [lat, lon] */
  G.dest = (lat, lon, brg, km) => {
    const d = km / R_KM, b = brg * RAD, p1 = lat * RAD, l1 = lon * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [p2 * DEG, ((l2 * DEG + 540) % 360) - 180];
  };
  /* great-circle points between two coords, returns [[lon,lat],...] unwrapped for continuous drawing */
  G.arc = (lat1, lon1, lat2, lon2, n) => {
    const p1 = lat1 * RAD, l1 = lon1 * RAD, p2 = lat2 * RAD, l2 = lon2 * RAD;
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    const out = [];
    if (d < 1e-9) return [[lon1, lat1], [lon2, lat2]];
    n = n || Math.max(8, Math.ceil(d * DEG * 2));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      const z = A * Math.sin(p1) + B * Math.sin(p2);
      let lon = Math.atan2(y, x) * DEG;
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG;
      if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; }
      prev = lon;
      out.push([lon, lat]);
    }
    return out;
  };
  /* signed cross track distance (km) of point 3 from great circle 1->2 */
  G.crossTrackKm = (lat1, lon1, lat2, lon2, lat3, lon3) => {
    const d13 = G.distKm(lat1, lon1, lat3, lon3) / R_KM;
    const t13 = G.bearing(lat1, lon1, lat3, lon3) * RAD, t12 = G.bearing(lat1, lon1, lat2, lon2) * RAD;
    return Math.asin(Math.sin(d13) * Math.sin(t13 - t12)) * R_KM;
  };
  /* move a point by speed (kt) along track (deg) for dt seconds, optional turn rate deg/s */
  G.advance = (lat, lon, gs, trk, dt, rate) => {
    const distM = gs * 0.514444 * dt;
    if (!distM) return [lat, lon, trk];
    let dn, de, h = trk;
    if (rate && Math.abs(rate) > 0.04) {
      const w = rate * RAD, v = gs * 0.514444, r = v / w, h0 = trk * RAD, h1 = h0 + w * dt;
      de = r * (Math.cos(h0) - Math.cos(h1));
      dn = r * (Math.sin(h1) - Math.sin(h0));
      h = trk + rate * dt;
    } else {
      de = distM * Math.sin(trk * RAD);
      dn = distM * Math.cos(trk * RAD);
    }
    const nlat = lat + (dn / 111320);
    const nlon = lon + de / (111320 * Math.max(0.01, Math.cos(lat * RAD)));
    return [nlat, nlon, h];
  };
  G.mx = (lon) => (lon + 180) / 360;
  G.my = (lat) => {
    const s = Math.sin(U.clamp(lat, -85.05, 85.05) * RAD);
    return 0.5 - (0.25 * Math.log((1 + s) / (1 - s))) / PI;
  };
  G.mz = (altM, lat) => altM / (40075016.686 * Math.cos(lat * RAD));
  G.inBounds = (b, lat, lon, pad) => {
    pad = pad || 0;
    return lat >= b.s - pad && lat <= b.n + pad && (b.w <= b.e ? lon >= b.w - pad && lon <= b.e + pad : lon >= b.w - pad || lon <= b.e + pad);
  };

  /* ---------------- sun and terminator ---------------- */
  G.sun = (ms) => {
    const n = ms / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.46 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * RAD;
    const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.0000004 * n) * RAD;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) * DEG;
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    return { lat: dec * DEG, lon: ((ra - gmst + 540) % 360 + 360) % 360 - 180 };
  };
  /* polygon (ring of [lon,lat]) of region where sun elevation < elevDeg */
  G.nightRing = (ms, elevDeg) => {
    const s = G.sun(ms), d = s.lat * RAD, sh = Math.sin((elevDeg || 0) * RAD);
    const ring = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const H = (lon - s.lon) * RAD, A = Math.sin(d), B = Math.cos(d) * Math.cos(H);
      const Rr = Math.sqrt(A * A + B * B), phi = Math.atan2(B, A);
      const lat = (Math.asin(U.clamp(sh / Rr, -1, 1)) - phi) * DEG;
      ring.push([lon, U.clamp(lat, -89.5, 89.5)]);
    }
    const pole = s.lat > 0 ? -89.5 : 89.5;
    ring.push([180, pole], [-180, pole], ring[0]);
    return ring;
  };
  G.sunElev = (ms, lat, lon) => {
    const s = G.sun(ms), H = (lon - s.lon) * RAD;
    return Math.asin(Math.sin(lat * RAD) * Math.sin(s.lat * RAD) + Math.cos(lat * RAD) * Math.cos(s.lat * RAD) * Math.cos(H)) * DEG;
  };

  /* ---------------- colors ---------------- */
  const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const C = (SQ.color = { hex2rgb });
  C.ALT_STOPS = [
    [0, '#ff4a1c'], [2000, '#ff6a14'], [5000, '#ff9500'], [10000, '#ffc400'],
    [18000, '#d8ec1e'], [26000, '#7fe35a'], [33000, '#2fdc9e'], [38000, '#5fe8d2'], [43000, '#c9fbef'], [50000, '#ffffff']
  ].map(([a, c]) => [a, hex2rgb(c)]);
  C.GROUND = hex2rgb('#8d8a80');
  /* five display groups, validated for CVD separation (dark and light variants) */
  C.GROUPS = [['airliner', 'Airliners'], ['regbiz', 'Regional and business'], ['light', 'Light and rotor'], ['other', 'Other'], ['mil', 'Military']];
  C.GROUP_OF = { airliner: 0, regional: 1, bizjet: 1, ga: 2, heli: 2, special: 3, gnd: 3, unknown: 3, mil: 4 };
  C.GROUP_DARK = ['#c58501', '#008a6d', '#c74b2c', '#bf78b0', '#696901'];
  C.GROUP_LIGHT = ['#bb7400', '#00765a', '#b53e20', '#ab639c', '#656900'];
  C.group = (cls) => { const i = C.GROUP_OF[cls] == null ? 3 : C.GROUP_OF[cls]; return { i, hex: (document.documentElement.dataset.theme === 'light' ? C.GROUP_LIGHT : C.GROUP_DARK)[i] }; };
  const ramp = (stops, v) => {
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (v <= stops[i][0]) {
        const [a0, c0] = stops[i - 1], [a1, c1] = stops[i], t = (v - a0) / (a1 - a0);
        return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
      }
    }
    return stops[stops.length - 1][1];
  };
  C.ramp = ramp;
  C.alt = (ft) => ramp(C.ALT_STOPS, ft);
  C.SPD_STOPS = [[0, '#8d8a80'], [120, '#ff6a14'], [250, '#ffc400'], [400, '#9be564'], [480, '#2fdc9e'], [560, '#c9fbef'], [700, '#ffffff']].map(([a, c]) => [a, hex2rgb(c)]);
  C.VR_STOPS = [[-3000, '#ff3b1f'], [-1200, '#ff8a3d'], [-250, '#f1d9a6'], [0, '#e8e4d8'], [250, '#cfe9d8'], [1200, '#55e0a6'], [3000, '#1fd1c1']].map(([a, c]) => [a, hex2rgb(c)]);
  C.css = (rgb, a) => (a == null ? `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})` : `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`);
  C.hex = (rgb) => '#' + rgb.map((v) => ('0' + (v | 0).toString(16)).slice(-2)).join('');
  /* returns {key, rgb} for an aircraft under the current color mode, quantized so sprites can be cached */
  C.forAc = (ac, mode) => {
    if (ac.emergency) return { key: 'E', rgb: [255, 59, 31] };
    if (ac.gnd) return { key: 'G', rgb: C.GROUND };
    switch (mode) {
      case 'speed': { const q = Math.round((ac.gs || 0) / 20) * 20; return { key: 's' + q, rgb: ramp(C.SPD_STOPS, q) }; }
      case 'vrate': { const q = Math.round(U.clamp(ac.vr || 0, -3000, 3000) / 250) * 250; return { key: 'v' + q, rgb: ramp(C.VR_STOPS, q) }; }
      case 'class': { const g = C.group(ac.cls); return { key: 'c' + g.hex, rgb: hex2rgb(g.hex) }; }
      case 'mono': return { key: 'm', rgb: [255, 176, 0] };
      default: {
        const q = ac.alt == null ? -1 : Math.round(U.clamp(ac.alt, 0, 50000) / 1000) * 1000;
        return q < 0 ? { key: 'a?', rgb: hex2rgb('#d9d4c7') } : { key: 'a' + q, rgb: ramp(C.ALT_STOPS, q) };
      }
    }
  };

  /* ---------------- formatting ---------------- */
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const F = (SQ.fmt = {});
  F.n = (v) => (v == null || isNaN(v) ? '--' : nf0.format(v));
  F.n1 = (v) => (v == null || isNaN(v) ? '--' : nf1.format(v));
  F.pad = (v, n) => String(v).padStart(n, '0');
  const units = () => S.units;
  /* each returns [value, unit] */
  F.altP = (ft, gnd) => {
    if (gnd) return ['GND', ''];
    if (ft == null) return ['--', ''];
    return units() === 'metric' ? [F.n(ft * 0.3048), 'm'] : [F.n(ft), 'ft'];
  };
  F.spdP = (kt) => {
    if (kt == null) return ['--', ''];
    const u = units();
    return u === 'metric' ? [F.n(kt * 1.852), 'km/h'] : u === 'imperial' ? [F.n(kt * 1.15078), 'mph'] : [F.n(kt), 'kt'];
  };
  F.distP = (nm) => {
    if (nm == null || isNaN(nm)) return ['--', ''];
    const u = units(), v = u === 'metric' ? nm * 1.852 : u === 'imperial' ? nm * 1.15078 : nm;
    return [v < 10 ? F.n1(v) : F.n(v), u === 'metric' ? 'km' : u === 'imperial' ? 'mi' : 'nm'];
  };
  F.vrP = (fpm) => {
    if (fpm == null) return ['--', ''];
    return units() === 'metric' ? [(fpm > 0 ? '+' : '') + F.n1(fpm * 0.00508), 'm/s'] : [(fpm > 0 ? '+' : '') + F.n(fpm), 'fpm'];
  };
  const join = (p) => (p[1] ? p[0] + ' ' + p[1] : p[0]);
  F.alt = (ft, gnd) => join(F.altP(ft, gnd));
  F.spd = (kt) => join(F.spdP(kt));
  F.dist = (nm) => join(F.distP(nm));
  F.vr = (fpm) => join(F.vrP(fpm));
  F.fl = (ft) => (ft == null ? '--' : 'FL' + F.pad(Math.round(ft / 100), 3));
  F.altShort = (ft, gnd) => {
    if (gnd) return 'GND';
    if (ft == null) return '';
    if (units() === 'metric') return F.n(Math.round(ft * 0.03048) * 10) + 'm';
    return ft >= 18000 ? 'FL' + F.pad(Math.round(ft / 100), 3) : F.n(Math.round(ft / 100) * 100);
  };
  F.deg = (d) => (d == null ? '--' : F.pad(Math.round(U.norm360(d)) % 360, 3) + '°');
  F.compass = (d) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(U.norm360(d) / 22.5) % 16];
  F.lat = (v) => (v == null ? '--' : Math.abs(v).toFixed(4) + '°' + (v >= 0 ? 'N' : 'S'));
  F.lon = (v) => (v == null ? '--' : Math.abs(v).toFixed(4) + '°' + (v >= 0 ? 'E' : 'W'));
  F.utc = (d) => F.pad(d.getUTCHours(), 2) + ':' + F.pad(d.getUTCMinutes(), 2) + ':' + F.pad(d.getUTCSeconds(), 2) + 'Z';
  F.local = (d) => F.pad(d.getHours(), 2) + ':' + F.pad(d.getMinutes(), 2);
  F.ago = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  };
  F.dur = (min) => {
    if (min == null || !isFinite(min)) return '--';
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h ? h + 'h ' + F.pad(m, 2) + 'm' : m + ' min';
  };
  F.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  F.title = (s) => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase());

  /* ---------------- DOM ---------------- */
  SQ.$ = (sel, root) => (root || document).querySelector(sel);
  SQ.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  SQ.h = (tag, attrs, html) => {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    if (html != null) el.innerHTML = html;
    return el;
  };
  SQ.isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  SQ.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- data helpers (need SQ_DATA scripts) ---------------- */
  const D = SQ.D;
  let rangeIdx = null;
  SQ.hexCountry = (hex) => {
    const r = D.ranges && D.ranges.ranges;
    if (!r || !hex || hex[0] === '~') return null;
    const v = parseInt(hex, 16);
    if (!rangeIdx) rangeIdx = r.slice().sort((a, b) => a[0] - b[0]);
    let lo = 0, hi = rangeIdx.length - 1, best = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, e = rangeIdx[mid];
      if (v < e[0]) hi = mid - 1;
      else { if (v <= e[1]) best = e; lo = mid + 1; }
    }
    return best ? { name: best[2], iso: best[3] } : null;
  };
  SQ.countryName = (iso) => (D.ranges && D.ranges.countries && D.ranges.countries[(iso || '').toUpperCase()]) || iso || '';
  SQ.operator = (cs) => {
    if (!cs || !D.operators) return null;
    const m = /^([A-Z]{3})\d/.exec(cs);
    if (!m) return null;
    const o = D.operators[m[1]];
    return o ? { icao: m[1], name: o[0], country: o[1], radio: o[2] } : null;
  };
  SQ.typeInfo = (t) => {
    const v = t && D.types && D.types[t];
    return v ? { desc: v[0], cls: v[1], wtc: v[2] } : null;
  };
  let apIdx = null;
  SQ.airports = () => {
    if (apIdx || !D.airports) return apIdx;
    apIdx = { list: D.airports, icao: {}, iata: {} };
    for (const a of D.airports) { apIdx.icao[a[0]] = a; if (a[1]) apIdx.iata[a[1]] = a; }
    return apIdx;
  };
  SQ.airport = (code) => {
    const i = SQ.airports();
    if (!i || !code) return null;
    code = code.toUpperCase();
    return i.icao[code] || i.iata[code] || null;
  };
  SQ.flagUrl = (iso) => (iso && /^[a-z]{2}$/i.test(iso) ? 'https://flagcdn.com/w40/' + iso.toLowerCase() + '.png' : '');

  /* approximate location from the timezone, used before geolocation is granted */
  const TZ = {
    'Europe/London': [51.47, -0.45], 'Europe/Dublin': [53.42, -6.27], 'Europe/Paris': [49.0, 2.55], 'Europe/Amsterdam': [52.31, 4.76],
    'Europe/Brussels': [50.9, 4.48], 'Europe/Berlin': [52.36, 13.5], 'Europe/Madrid': [40.47, -3.56], 'Europe/Lisbon': [38.77, -9.13],
    'Europe/Rome': [41.8, 12.25], 'Europe/Zurich': [47.46, 8.55], 'Europe/Vienna': [48.11, 16.57], 'Europe/Stockholm': [59.65, 17.92],
    'Europe/Oslo': [60.19, 11.1], 'Europe/Copenhagen': [55.62, 12.65], 'Europe/Helsinki': [60.32, 24.95], 'Europe/Warsaw': [52.17, 20.97],
    'Europe/Prague': [50.1, 14.26], 'Europe/Budapest': [47.44, 19.26], 'Europe/Athens': [37.94, 23.94], 'Europe/Istanbul': [41.26, 28.74],
    'Europe/Moscow': [55.97, 37.41], 'Europe/Kiev': [50.4, 30.45], 'Europe/Kyiv': [50.4, 30.45], 'Europe/Bucharest': [44.57, 26.08],
    'America/New_York': [40.64, -73.78], 'America/Chicago': [41.98, -87.9], 'America/Denver': [39.86, -104.67], 'America/Phoenix': [33.43, -112.01],
    'America/Los_Angeles': [33.94, -118.41], 'America/Toronto': [43.68, -79.63], 'America/Vancouver': [49.19, -123.18], 'America/Mexico_City': [19.44, -99.07],
    'America/Sao_Paulo': [-23.43, -46.47], 'America/Argentina/Buenos_Aires': [-34.82, -58.54], 'America/Bogota': [4.7, -74.15], 'America/Anchorage': [61.17, -149.99],
    'Asia/Tokyo': [35.55, 139.78], 'Asia/Seoul': [37.46, 126.44], 'Asia/Shanghai': [31.14, 121.81], 'Asia/Hong_Kong': [22.31, 113.92],
    'Asia/Singapore': [1.36, 103.99], 'Asia/Dubai': [25.25, 55.36], 'Asia/Kolkata': [28.56, 77.1], 'Asia/Calcutta': [28.56, 77.1],
    'Asia/Bangkok': [13.69, 100.75], 'Asia/Jakarta': [-6.13, 106.66], 'Asia/Manila': [14.51, 121.02], 'Asia/Taipei': [25.08, 121.23],
    'Asia/Qatar': [25.27, 51.61], 'Asia/Riyadh': [24.96, 46.7], 'Asia/Tel_Aviv': [32.01, 34.89], 'Asia/Jerusalem': [32.01, 34.89],
    'Australia/Sydney': [-33.95, 151.18], 'Australia/Melbourne': [-37.67, 144.84], 'Australia/Perth': [-31.94, 115.97], 'Australia/Brisbane': [-27.38, 153.12],
    'Pacific/Auckland': [-37.01, 174.79], 'Africa/Johannesburg': [-26.14, 28.25], 'Africa/Cairo': [30.12, 31.41], 'Africa/Lagos': [6.58, 3.32],
    'Africa/Nairobi': [-1.32, 36.93], 'Africa/Casablanca': [33.37, -7.59], 'Atlantic/Reykjavik': [63.99, -22.62]
  };
  const TZ_REGION = { Europe: [50, 10], America: [39, -95], Asia: [30, 105], Australia: [-30, 140], Africa: [5, 20], Pacific: [-20, 175], Atlantic: [40, -30], Indian: [-10, 75] };
  SQ.guessHome = () => {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    const p = TZ[tz] || TZ_REGION[tz.split('/')[0]] || [50.03, 8.57];
    return { lat: p[0], lon: p[1], src: 'tz' };
  };
})();
