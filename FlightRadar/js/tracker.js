/* SQUAWK tracker: aircraft store, dead reckoning, blending, trails, filters, alerts */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo;
  const list = new Map();
  const T = (SQ.tracker = { list, selected: null, hover: null, visible: [], version: 0, history: [] });
  const BLEND = 1100, STRIDE = 5, CAP = 160, CAP_SEL = 6000;
  const ID_FIELDS = ['flight', 'reg', 'type', 'desc', 'ownOp', 'year', 'cat'];
  const tmp = { lat: 0, lon: 0, trk: 0, alt: 0 };
  T.STRIDE = STRIDE;

  function classify(ac) {
    ac.shape = SQ.icons.shapeFor(ac);
    ac.mil = SQ.icons.isMil(ac, ac.shape);
    ac.cls = SQ.icons.classFor(ac, ac.shape);
    ac.op = SQ.operator(ac.flight);
    ac.country = SQ.hexCountry(ac.hex);
    if (!ac.desc && ac.type) { const ti = SQ.typeInfo(ac.type); if (ti) ac.desc = ti.desc; }
    ac.key = [ac.flight, ac.reg, ac.hex, ac.type, ac.op ? ac.op.name : '', ac.ownOp, ac.desc].join(' ').toUpperCase();
  }
  T.reclassify = () => { for (const ac of list.values()) classify(ac); T.version++; };

  /* ---------------- motion model ---------------- */
  function model(ac, now, out) {
    let dt = (now - ac.t) / 1000;
    if (dt < 0) dt = 0;
    if (dt > (ac.gnd ? 15 : 80)) dt = ac.gnd ? 15 : 80;
    let lat = ac.lat, lon = ac.lon, trk = ac.track == null ? 0 : ac.track, alt = ac.alt;
    if (ac.gs > (ac.gnd ? 3 : 25) && ac.track != null) {
      const rate = ac.trackRate && dt < 35 ? ac.trackRate : 0;
      const tdt = rate ? Math.min(dt, 150 / Math.abs(rate)) : dt;
      let p = G.advance(lat, lon, ac.gs, trk, tdt, rate);
      if (tdt < dt) p = G.advance(p[0], p[1], ac.gs, p[2], dt - tdt, 0);
      lat = p[0]; lon = p[1]; trk = p[2];
    }
    if (alt != null && ac.vr && !ac.gnd) {
      let a = alt + (ac.vr * Math.min(dt, 45)) / 60;
      const n = ac.navAlt;
      if (n != null && ((ac.vr > 0 && alt < n && a > n) || (ac.vr < 0 && alt > n && a < n))) a = n;
      alt = Math.max(0, a);
    }
    out.lat = lat; out.lon = lon; out.trk = trk; out.alt = alt;
  }
  /* rendered (smoothed) position, written onto the aircraft as rlat/rlon/rtrk/ralt */
  T.pos = (ac, now) => {
    model(ac, now, tmp);
    let lat = tmp.lat, lon = tmp.lon, trk = tmp.trk, alt = tmp.alt;
    const k = (now - ac.offT) / BLEND;
    if (k < 1) {
      const f = 1 - U.easeOut(k);
      lat += ac.offLat * f; lon += ac.offLon * f; trk += ac.offTrk * f;
      if (alt != null) alt += ac.offAlt * f;
    }
    ac.rlat = lat; ac.rlon = lon; ac.rtrk = trk; ac.ralt = alt;
    return ac;
  };

  /* ---------------- trails ---------------- */
  function pushTrail(ac) {
    const tr = ac.trail, n = tr.length;
    if (n) {
      const dt = ac.t - tr[n - 2];
      if (dt < 2500) return;
      const moved = G.distKm(tr[n - 4], tr[n - 5], ac.lat, ac.lon) > 0.08;
      const climbed = ac.alt != null && Math.abs((tr[n - 3] || 0) - ac.alt) > 100;
      if (!moved && !climbed && dt < 20000) return;
    }
    tr.push(ac.lon, ac.lat, ac.gnd ? 0 : ac.alt == null ? NaN : ac.alt, ac.t, ac.gs == null ? NaN : ac.gs);
    const cap = (ac.hex === T.selected ? CAP_SEL : CAP) * STRIDE;
    if (tr.length > cap) {
      /* thin out the older half so long history survives at lower resolution */
      const half = Math.floor(tr.length / STRIDE / 2), out = [];
      for (let i = 0; i < half; i += 2) for (let j = 0; j < STRIDE; j++) out.push(tr[i * STRIDE + j]);
      ac.trail = out.concat(tr.slice(half * STRIDE));
    }
    ac.trailV = (ac.trailV || 0) + 1;
  }
  /* merge an externally fetched track (older points) in front of our own trail */
  T.mergeTrace = (hex, pts) => {
    const ac = list.get(hex);
    if (!ac || !pts || !pts.length) return;
    const first = ac.trail.length ? ac.trail[3] : Infinity;
    const older = [];
    for (const p of pts) if (p[3] < first - 1000) older.push(p[0], p[1], p[2], p[3], p[4]);
    if (older.length) { ac.trail = older.concat(ac.trail); ac.trailV = (ac.trailV || 0) + 1; ac.traced = true; SQ.emit('trail:merged', ac); }
  };

  /* ---------------- ingest ---------------- */
  let notifiedWatch = new Set(), notifiedOdd = new Set();
  function create(r, meta, now) {
    const ac = Object.assign({ trail: [], firstSeen: now, offLat: 0, offLon: 0, offTrk: 0, offAlt: 0, offT: 0, misses: 0, estRate: 0 }, r);
    ac.trackRate = r.trackRate || 0;
    ac.lastUpdate = now;
    ac.provider = meta.provider;
    ac.global = !!meta.global;
    classify(ac);
    pushTrail(ac);
    list.set(ac.hex, ac);
    checkFlags(ac, '');
    return ac;
  }
  function update(ac, r, now, meta) {
    ac.lastUpdate = now;
    ac.misses = 0;
    ac.lost = false;
    ac.provider = meta.provider;
    if (!meta.global) ac.global = false;
    let idChanged = false;
    for (const k of ID_FIELDS) if (r[k] && r[k] !== ac[k]) { ac[k] = r[k]; idChanged = true; }
    if (r.seen > (ac.seen || 0)) {
      ac.seen = r.seen; ac.rssi = r.rssi; ac.msgs = r.msgs; ac.src = r.src;
      if (r.squawk) ac.squawk = r.squawk;
    }
    if (!(r.t > ac.t + 50)) { if (idChanged) classify(ac); return; }
    T.pos(ac, now);
    const pLat = ac.rlat, pLon = ac.rlon, pTrk = ac.rtrk, pAlt = ac.ralt;
    if (r.trackRate == null && r.track != null && ac.track != null) {
      const dt = (r.t - ac.t) / 1000;
      if (dt > 0.8 && dt < 40) {
        const rate = U.angDiff(ac.track, r.track) / dt;
        ac.estRate = Math.abs(rate) < 0.12 ? ac.estRate * 0.3 : U.clamp(rate, -6, 6) * 0.65 + ac.estRate * 0.35;
      }
    }
    const prevEmerg = ac.emergency, prevSq = ac.squawk;
    ac.lat = r.lat; ac.lon = r.lon; ac.t = r.t; ac.gnd = r.gnd; ac.alt = r.alt; ac.altGeom = r.altGeom;
    ac.gs = r.gs; ac.ias = r.ias; ac.tas = r.tas; ac.mach = r.mach; ac.track = r.track; ac.roll = r.roll; ac.heading = r.heading;
    ac.vr = r.vr; ac.emergency = r.emergency; ac.navAlt = r.navAlt; ac.navHdg = r.navHdg; ac.navQnh = r.navQnh; ac.navModes = r.navModes;
    if (r.wd != null) { ac.wd = r.wd; ac.ws = r.ws; }
    if (r.oat != null) ac.oat = r.oat;
    if (r.squawk) ac.squawk = r.squawk;
    ac.trackRate = r.trackRate != null ? r.trackRate : ac.estRate;
    model(ac, now, tmp);
    const dLat = pLat - tmp.lat, dLon = pLon - tmp.lon;
    if (Math.abs(dLat) < 0.06 && Math.abs(dLon) < 0.09) {
      ac.offLat = dLat; ac.offLon = dLon; ac.offTrk = U.angDiff(tmp.trk, pTrk);
      ac.offAlt = pAlt != null && tmp.alt != null ? pAlt - tmp.alt : 0;
      ac.offT = now;
    } else { ac.offLat = ac.offLon = ac.offTrk = ac.offAlt = 0; }
    pushTrail(ac);
    if (idChanged) classify(ac);
    checkFlags(ac, prevEmerg, prevSq);
  }
  T.ingest = (reps, meta) => {
    meta = meta || {};
    const now = Date.now();
    const isSim = meta.provider === 'sim';
    const seen = meta.zone ? new Set() : null;
    for (const r of reps) {
      if (!!r.sim !== isSim) continue;
      const ac = list.get(r.hex);
      if (ac && !!ac.sim !== isSim) list.delete(r.hex);
      const cur = list.get(r.hex);
      if (cur) update(cur, r, now, meta); else create(r, meta, now);
      if (seen) seen.add(r.hex);
    }
    if (meta.zone) {
      const z = meta.zone;
      for (const ac of list.values()) {
        if (seen.has(ac.hex) || ac.lastUpdate > now - 1500) continue;
        if (G.distNm(z.lat, z.lon, ac.lat, ac.lon) < z.r * 0.9) ac.misses++;
      }
    }
    if (meta.box) {
      const b = meta.box;
      for (const ac of list.values()) if (ac.lastUpdate < now - 1500 && G.inBounds(b, ac.lat, ac.lon)) ac.misses++;
    }
    T.version++;
    SQ.emit('tracker:update', meta);
  };
  T.clear = (keepSel) => {
    for (const hex of Array.from(list.keys())) if (!keepSel || hex !== T.selected) list.delete(hex);
    if (!keepSel && T.selected) T.select(null);
    T.version++;
    SQ.emit('tracker:update', {});
  };
  /* drop the other source when switching between live data and simulation */
  SQ.on('feed:provider', (id, prev) => { if (prev && (id === 'sim') !== (prev === 'sim')) T.clear(false); });

  setInterval(() => {
    const now = Date.now();
    let removed = 0;
    for (const [hex, ac] of list) {
      const age = now - ac.lastUpdate;
      const dead = ac.misses >= 2 || age > (ac.global ? 160000 : 75000);
      if (!dead) continue;
      if (hex === T.selected) {
        if (!ac.lost) { ac.lost = true; SQ.emit('select:lost', ac); }
        if (age > 600000) { list.delete(hex); T.select(null); removed++; }
      } else { list.delete(hex); removed++; }
    }
    if (removed) { T.version++; SQ.emit('tracker:update', { expiry: true }); }
  }, 4000);

  /* traffic history for the stats sparkline */
  setInterval(() => {
    T.history.push({ t: Date.now(), view: T.visible.length, total: list.size });
    if (T.history.length > 360) T.history.shift();
  }, 10000);

  /* ---------------- selection ---------------- */
  T.get = (hex) => list.get(hex);
  T.select = (hex, opts) => {
    const prev = T.selected;
    T.selected = hex && list.has(hex) ? hex : null;
    if (prev !== T.selected) SQ.emit('select', T.selected ? list.get(T.selected) : null, prev, opts || {});
  };
  T.sel = () => (T.selected ? list.get(T.selected) : null);

  /* ---------------- text matching, filters ---------------- */
  function compileTokens(text) {
    return (text || '').toUpperCase().split(/[,;\s]+/).filter(Boolean).map((t) => {
      if (/[*?]/.test(t)) return new RegExp('^' + t.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return t;
    });
  }
  T.compileTokens = compileTokens;
  T.matches = (ac, toks) => {
    const reg = (ac.reg || '').toUpperCase().replace('-', ''), hex = ac.hex.toUpperCase(), fl = ac.flight || '', ty = ac.type || '';
    for (const tk of toks) {
      if (typeof tk === 'string') {
        const t2 = tk.replace('-', '');
        if (fl === tk || (tk.length >= 3 && fl.startsWith(tk)) || reg === t2 || ty === tk || hex === tk || (ac.op && ac.op.icao === tk) || ac.squawk === tk) return true;
        if (tk === 'MIL' && ac.mil) return true;
        if (tk.length >= 4 && ac.key.indexOf(tk) >= 0) return true;
      } else if (tk.test(fl) || tk.test(reg) || tk.test(ty) || tk.test(hex) || tk.test((ac.reg || '').toUpperCase())) return true;
    }
    return false;
  };
  let fc = null;
  function compileFilters() {
    const f = S.filters;
    fc = { f, toks: compileTokens(f.text), altMax: f.altMax >= 50000 ? Infinity : f.altMax, spdMax: f.spdMax >= 800 ? Infinity : f.spdMax };
  }
  compileFilters();
  SQ.on('setting:filters', () => { compileFilters(); T.version++; });
  T.passes = (ac) => {
    if (ac.hex === T.selected) return true;
    const f = fc.f;
    if (f.cls[ac.cls] === false) return false;
    if (f.hideGround && ac.gnd) return false;
    const alt = ac.gnd ? 0 : ac.alt;
    if (alt != null && (alt < f.altMin || alt > fc.altMax)) return false;
    if (ac.gs != null && (ac.gs < f.spdMin || ac.gs > fc.spdMax)) return false;
    if (f.squawk && !(ac.squawk || '').startsWith(f.squawk)) return false;
    if (fc.toks.length && !T.matches(ac, fc.toks)) return false;
    return true;
  };
  T.filterCount = () => {
    const f = S.filters, d = SQ.DEFAULTS.filters;
    let n = 0;
    if (f.altMin > d.altMin || f.altMax < d.altMax) n++;
    if (f.spdMin > d.spdMin || f.spdMax < d.spdMax) n++;
    if (Object.keys(d.cls).some((k) => f.cls[k] === false)) n++;
    if (f.hideGround) n++;
    if (f.text) n++;
    if (f.squawk) n++;
    return n;
  };

  /* ---------------- alerts, watchlist, interesting ---------------- */
  const ODD_TYPES = new Set('A388 A124 AN22 A3ST A337 B748 B744 B742 B74S B74R C5M C5 B52 E3TF E3CF E6 U2 B1 B2 IL96 IL76 IL78 AN12 B703 DC10 MD11 L101 CONC A400 K35R KC2 P8 E737 E2 V22 A332K KC10 C17 T144 A225 BLCF B37M SR71 TU95 TU22 F117 GLID BALL'.split(' '));
  let watchToks = compileTokens((S.watch || []).join(','));
  SQ.on('setting:watch', () => { watchToks = compileTokens((S.watch || []).join(',')); notifiedWatch = new Set(); });
  function checkFlags(ac, prevEmerg, prevSq) {
    if (ac.emergency && ac.emergency !== prevEmerg) SQ.emit('alert:emergency', ac);
    if (prevSq !== undefined && prevSq && ac.squawk && prevSq !== ac.squawk && /^7[567]00$/.test(ac.squawk)) SQ.emit('alert:squawk', ac, prevSq);
    if (watchToks.length && !notifiedWatch.has(ac.hex) && T.matches(ac, watchToks)) { notifiedWatch.add(ac.hex); SQ.emit('alert:watch', ac); }
    if (!notifiedOdd.has(ac.hex)) {
      let why = '';
      if (ODD_TYPES.has(ac.type)) why = 'Rare type: ' + (ac.desc ? SQ.fmt.title(ac.desc) : ac.type);
      else if (ac.alt > 47000 && !ac.gnd) why = 'Very high altitude';
      else if (ac.gs > 660 && !ac.gnd) why = 'Very high ground speed';
      else if (ac.mil) why = 'Military';
      else if (ac.dbFlags & 8) why = 'LADD-listed (limited display)';
      else if (ac.dbFlags & 4) why = 'PIA privacy address';
      if (why) { notifiedOdd.add(ac.hex); ac.odd = why; SQ.emit('alert:odd', ac, why); }
    }
  }
  T.isOdd = (ac) => !!ac.odd;
})();
