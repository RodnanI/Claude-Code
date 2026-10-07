/* SQUAWK feed: free ADS-B providers, normalization, failover and a coverage scheduler */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo;

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const PROVIDERS = {
    adsblol: {
      name: 'adsb.lol', site: 'https://adsb.lol', maxR: 250, gap: 1100,
      area: (la, lo, r) => `https://api.adsb.lol/v2/lat/${r3(la)}/lon/${r3(lo)}/dist/${r}`,
      sqk: (c) => `https://api.adsb.lol/v2/sqk/${c}`, mil: () => 'https://api.adsb.lol/v2/mil',
      hex: (h) => `https://api.adsb.lol/v2/hex/${h}`, cs: (c) => `https://api.adsb.lol/v2/callsign/${c}`,
      reg: (r) => `https://api.adsb.lol/v2/reg/${r}`
    },
    airplaneslive: {
      name: 'airplanes.live', site: 'https://airplanes.live', maxR: 250, gap: 1100,
      area: (la, lo, r) => `https://api.airplanes.live/v2/point/${r3(la)}/${r3(lo)}/${r}`,
      sqk: (c) => `https://api.airplanes.live/v2/squawk/${c}`, mil: () => 'https://api.airplanes.live/v2/mil',
      hex: (h) => `https://api.airplanes.live/v2/hex/${h}`, cs: (c) => `https://api.airplanes.live/v2/callsign/${c}`,
      reg: (r) => `https://api.airplanes.live/v2/reg/${r}`
    },
    adsbfi: {
      name: 'adsb.fi', site: 'https://adsb.fi', maxR: 250, gap: 1100,
      area: (la, lo, r) => `https://opendata.adsb.fi/api/v2/lat/${r3(la)}/lon/${r3(lo)}/dist/${r}`,
      sqk: (c) => `https://opendata.adsb.fi/api/v2/sqk/${c}`, mil: () => 'https://opendata.adsb.fi/api/v2/mil',
      hex: (h) => `https://opendata.adsb.fi/api/v2/hex/${h}`, cs: (c) => `https://opendata.adsb.fi/api/v2/callsign/${c}`,
      reg: (r) => `https://opendata.adsb.fi/api/v2/registration/${r}`
    },
    opensky: {
      name: 'OpenSky', site: 'https://opensky-network.org', maxR: 330, gap: 11000, box: true,
      boxUrl: (b) => `https://opensky-network.org/api/states/all?lamin=${b.s.toFixed(2)}&lomin=${b.w.toFixed(2)}&lamax=${b.n.toFixed(2)}&lomax=${b.e.toFixed(2)}&extended=1`
    },
    sim: { name: 'Simulation', site: '', maxR: 400, gap: 1500 }
  };
  const AUTO_ORDER = ['adsblol', 'airplaneslive', 'adsbfi', 'opensky'];

  /* ---------------- networking ---------------- */
  function proxied(url) {
    const p = (S.corsProxy || '').trim();
    if (!p) return url;
    return p.indexOf('{url}') >= 0 ? p.replace('{url}', encodeURIComponent(url)) : p + url;
  }
  async function getJSON(url, opt) {
    opt = opt || {};
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opt.timeout || 12000);
    try {
      const init = { signal: ctrl.signal, cache: 'no-store', credentials: 'omit' };
      if (opt.body) { init.method = 'POST'; init.body = JSON.stringify(opt.body); init.headers = { 'Content-Type': 'application/json' }; }
      const res = await fetch(opt.noProxy ? url : proxied(url), init);
      if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
      return await res.json();
    } finally { clearTimeout(timer); }
  }
  SQ.getJSON = getJSON;

  /* ---------------- normalization ---------------- */
  const SRC = { adsb_icao: 'ADS-B', adsb_icao_nt: 'ADS-B', adsr_icao: 'ADS-R', tisb_icao: 'TIS-B', tisb_trackfile: 'TIS-B', tisb_other: 'TIS-B', adsb_other: 'ADS-B', adsr_other: 'ADS-R', mlat: 'MLAT', mode_s: 'Mode S', adsc: 'ADS-C', other: 'Other' };
  const SQK_EMERG = { '7500': 'unlawful', '7600': 'nordo', '7700': 'general' };
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  function fromReadsb(a, now) {
    let lat = a.lat, lon = a.lon, seenPos = a.seen_pos;
    if (lat == null && a.lastPosition) { lat = a.lastPosition.lat; lon = a.lastPosition.lon; seenPos = a.lastPosition.seen_pos; }
    if (lat == null || lon == null || !a.hex) return null;
    const gnd = a.alt_baro === 'ground';
    const squawk = a.squawk || '';
    let emergency = a.emergency && a.emergency !== 'none' ? a.emergency : '';
    if (!emergency && SQK_EMERG[squawk]) emergency = SQK_EMERG[squawk];
    return {
      hex: String(a.hex).toLowerCase(), flight: (a.flight || '').trim().toUpperCase(),
      reg: a.r || '', type: a.t || '', desc: a.desc || '', ownOp: a.ownOp || '', year: a.year || '',
      cat: a.category || '', dbFlags: a.dbFlags || 0,
      lat, lon, gnd,
      alt: gnd ? 0 : num(a.alt_baro) != null ? a.alt_baro : num(a.alt_geom),
      altGeom: num(a.alt_geom), gs: num(a.gs), ias: num(a.ias), tas: num(a.tas), mach: num(a.mach),
      track: num(a.track) != null ? a.track : num(a.true_heading) != null ? a.true_heading : num(a.mag_heading),
      trackRate: num(a.track_rate), roll: num(a.roll),
      heading: num(a.true_heading) != null ? a.true_heading : num(a.mag_heading),
      vr: num(a.baro_rate) != null ? a.baro_rate : num(a.geom_rate),
      squawk, emergency,
      navAlt: num(a.nav_altitude_mcp) != null ? a.nav_altitude_mcp : num(a.nav_altitude_fms), navHdg: num(a.nav_heading), navQnh: num(a.nav_qnh),
      navModes: a.nav_modes || null,
      wd: num(a.wd), ws: num(a.ws), oat: num(a.oat), rssi: num(a.rssi), msgs: num(a.messages),
      src: SRC[a.type] || (a.mlat && a.mlat.length ? 'MLAT' : 'ADS-B'),
      t: now - (seenPos || 0) * 1000, seen: now - (a.seen || 0) * 1000
    };
  }
  const OS_CAT = ['', '', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B1', 'B2', 'B3', 'B4', '', 'B6', 'B7', 'C1', 'C2', 'C3', 'C3', 'C3'];
  const OS_SRC = ['ADS-B', 'ASTERIX', 'MLAT', 'FLARM'];
  function fromOpenSky(s) {
    if (s[5] == null || s[6] == null) return null;
    const squawk = s[14] || '';
    return {
      hex: s[0], flight: (s[1] || '').trim(), reg: '', type: '', desc: '', ownOp: '', year: '',
      cat: OS_CAT[s[17]] || '', dbFlags: 0, lat: s[6], lon: s[5], gnd: !!s[8],
      alt: s[8] ? 0 : s[7] != null ? s[7] * 3.28084 : s[13] != null ? s[13] * 3.28084 : null,
      altGeom: s[13] != null ? s[13] * 3.28084 : null,
      gs: s[9] != null ? s[9] * 1.943844 : null, ias: null, tas: null, mach: null,
      track: s[10], trackRate: null, roll: null, heading: null,
      vr: s[11] != null ? s[11] * 196.85 : null, squawk, emergency: SQK_EMERG[squawk] || '',
      navAlt: null, navHdg: null, navQnh: null, navModes: null, wd: null, ws: null, oat: null, rssi: null, msgs: null,
      src: OS_SRC[s[16]] || 'ADS-B', t: (s[3] || s[4]) * 1000, seen: s[4] * 1000, osCountry: s[2]
    };
  }
  function parseReadsb(data) {
    const now = data.now ? (data.now > 1e12 ? data.now : data.now * 1000) : Date.now();
    const list = data.ac || data.aircraft || [];
    const out = [];
    for (const a of list) { const r = fromReadsb(a, now); if (r) out.push(r); }
    return out;
  }
  SQ.normalize = { fromReadsb, parseReadsb, fromOpenSky };

  /* ---------------- coverage zones ---------------- */
  let view = null;
  let zones = [];
  const MAX_ZONES = 9;
  function buildZones() {
    if (!view) return;
    const p = PROVIDERS[feed.active] || PROVIDERS.adsblol;
    const R = p.maxR;
    const [clat, clon] = view.center;
    const b = view.bounds;
    const corner = Math.max(G.distNm(clat, clon, b.n, b.e), G.distNm(clat, clon, b.s, b.w));
    let next = [];
    if (corner * 1.1 <= R) {
      next.push({ lat: clat, lon: clon, r: Math.round(U.clamp(corner * 1.15, 30, R)) });
    } else {
      const dyDeg = (R * 1.5) / 60;
      const latA = U.clamp(b.s - dyDeg / 3, -84, 84), latB = U.clamp(b.n + dyDeg / 3, -84, 84);
      let row = 0;
      const rows = [];
      for (let la = clat; la >= latA - 1e-9; la -= dyDeg) rows.push(la);
      for (let la = clat + dyDeg; la <= latB + 1e-9; la += dyDeg) rows.push(la);
      for (const la of rows) {
        row = Math.round((la - clat) / dyDeg);
        const dxDeg = (R * Math.sqrt(3)) / (60 * Math.max(0.15, Math.cos(la * G.RAD)));
        const off = (row & 1) * dxDeg / 2;
        let w = b.w, e = b.e;
        if (e < w) e += 360;
        for (let k = -Math.ceil((clon - w) / dxDeg) - 1; k <= Math.ceil((e - clon) / dxDeg) + 1; k++) {
          const lo = clon + off + k * dxDeg;
          if (lo < w - dxDeg / 2 || lo > e + dxDeg / 2) continue;
          next.push({ lat: la, lon: ((lo + 540) % 360) - 180, r: R });
        }
      }
      next.forEach((z) => (z.d = G.distKm(clat, clon, z.lat, z.lon)));
      next.sort((a, c) => a.d - c.d);
      next = next.slice(0, MAX_ZONES);
    }
    /* keep fetch history for zones that barely moved */
    for (const z of next) {
      const old = zones.find((o) => G.distNm(o.lat, o.lon, z.lat, z.lon) < R * 0.25);
      z.last = old ? old.last : 0;
      z.flash = old ? old.flash : 0;
    }
    next.forEach((z, i) => (z.w = 1 / (1 + i * 0.45)));
    zones = next;
    feed.partial = corner * 1.1 > R && next.length >= MAX_ZONES && corner > R * 3.2;
    SQ.emit('zones', zones);
  }

  /* ---------------- feed controller ---------------- */
  const feed = (SQ.feed = {
    PROVIDERS, active: null, status: 'idle', lastOk: 0, lastErr: '', partial: false, simFallback: false,
    stats: { req: 0, ok: 0, fail: 0, bytes: 0 }
  });
  const health = {};
  for (const id of Object.keys(PROVIDERS)) health[id] = { fails: 0, cooldown: 0, ok: 0 };
  let timer = 0, running = false, inflight = false, globalJobs = { emerg: 0, mil: 0 };
  let firstData = null;
  feed.firstData = new Promise((res) => (firstData = res));

  function rateFactor() { return S.rate === 'fast' ? 1 : S.rate === 'eco' ? 3 : 1.6; }
  function chooseProvider() {
    if (S.provider === 'sim') return 'sim';
    if (S.provider !== 'auto' && PROVIDERS[S.provider]) return S.provider;
    if (feed.simFallback) return 'sim';
    const now = Date.now();
    for (const id of AUTO_ORDER) if (health[id].cooldown < now) return id;
    return null;
  }
  function setActive(id, why) {
    if (feed.active === id) return;
    const prev = feed.active;
    feed.active = id;
    feed.simFallback = id === 'sim' && S.provider !== 'sim';
    buildZones();
    SQ.emit('feed:provider', id, prev, why);
  }
  function schedule(ms) { clearTimeout(timer); if (running) timer = setTimeout(step, ms); }

  function pickZone() {
    const now = Date.now();
    let best = null, bestScore = -1;
    for (const z of zones) {
      const score = (now - z.last + 1) * z.w;
      if (score > bestScore) { bestScore = score; best = z; }
    }
    return best;
  }

  async function step() {
    if (!running || inflight) return;
    if (!view) { schedule(150); return; }
    if (document.hidden && feed.lastOk && Date.now() - feed.lastOk < 10000) { schedule(2000); return; }
    let id = chooseProvider();
    if (!id) { id = 'sim'; }
    if (id !== feed.active) setActive(id, 'auto');
    const p = PROVIDERS[id];
    if (id === 'sim') {
      if (!SQ.airports()) { schedule(250); return; }
      if (SQ.sim) {
        SQ.sim.ensure(view);
        const reps = SQ.sim.reports();
        SQ.tracker.ingest(reps, { provider: 'sim', zone: null });
        ok(reps.length);
      }
      /* quietly probe one real provider every 45 s while on automatic fallback */
      if (feed.simFallback && Date.now() - feed.lastProbe > 45000) { feed.lastProbe = Date.now(); probe(); }
      schedule(p.gap);
      return;
    }
    const now = Date.now();
    /* periodic global jobs: worldwide emergencies, military */
    let job = null;
    if (p.sqk && feed.lastOk && now - globalJobs.emerg > 60000) job = 'emerg';
    else if (p.mil && SQ.wantMil && now - globalJobs.mil > 90000) job = 'mil';
    inflight = true;
    if (job) {
      /* global jobs never count against provider health: a missing endpoint must not trigger failover */
      globalJobs[job] = now;
      try {
        if (job === 'emerg') {
          for (const c of ['7700', '7600', '7500']) {
            const d = await getJSON(p.sqk(c));
            SQ.tracker.ingest(parseReadsb(d), { provider: id, global: true });
            await new Promise((r) => setTimeout(r, p.gap));
          }
        } else {
          const d = await getJSON(p.mil());
          SQ.tracker.ingest(parseReadsb(d), { provider: id, global: true });
        }
      } catch (e) { console.warn('[SQ] global job', job, e && e.message); }
      inflight = false;
      schedule(p.gap * rateFactor());
      return;
    }
    try {
      if (p.box) {
        const b = view ? view.bounds : null;
        if (!b) throw new Error('no view');
        const [cl, co] = view.center;
        const half = 10;
        const box = { s: Math.max(b.s, cl - half), n: Math.min(b.n, cl + half), w: Math.max(b.w, co - half * 1.6), e: Math.min(b.e, co + half * 1.6) };
        const d = await getJSON(p.boxUrl(box));
        const list = (d.states || []).map(fromOpenSky).filter(Boolean);
        SQ.tracker.ingest(list, { provider: id, box });
        ok(list.length);
      } else {
        const z = pickZone();
        if (!z) throw new Error('no zone');
        z.last = Date.now();
        const d = await getJSON(p.area(z.lat, z.lon, z.r));
        const list = parseReadsb(d);
        z.flash = Date.now();
        SQ.tracker.ingest(list, { provider: id, zone: z });
        SQ.emit('zone:fetched', z, list.length);
        ok(list.length);
      }
      health[id].fails = 0;
      health[id].ok = Date.now();
      inflight = false;
      schedule(p.gap * rateFactor());
    } catch (e) {
      inflight = false;
      fail(id, e);
    }
  }
  let probeIdx = 0;
  async function probe() {
    const pid = AUTO_ORDER.filter((k) => !PROVIDERS[k].box)[probeIdx++ % 3];
    const z = zones[0];
    if (!z) return;
    try {
      const list = parseReadsb(await getJSON(PROVIDERS[pid].area(z.lat, z.lon, z.r), { timeout: 8000 }));
      health[pid].cooldown = 0; health[pid].fails = 0; health[pid].ok = Date.now();
      feed.simFallback = false;
      setActive(pid, 'recovered');
      SQ.tracker.ingest(list, { provider: pid, zone: z });
      ok(list.length);
    } catch (e) { /* still unreachable, stay on simulation */ }
  }
  function ok(n) {
    feed.stats.ok++;
    feed.lastOk = Date.now();
    feed.status = 'live';
    if (firstData) { firstData({ provider: feed.active, count: n }); firstData = null; }
    SQ.emit('feed:ok', feed.active, n);
  }
  function fail(id, e) {
    const h = health[id], now = Date.now();
    h.fails++;
    feed.stats.fail++;
    const status = e && e.status, timeout = e && e.name === 'AbortError';
    const netErr = !status && !timeout;
    feed.lastErr = status ? 'HTTP ' + status : timeout ? 'timeout' : 'network/CORS';
    console.warn('[SQ] feed', id, feed.lastErr, e && e.message);
    let wait = Math.min(PROVIDERS[id].gap, 2000) * 1.5;
    if (status === 429) { wait = Math.min(60000, 4000 * Math.pow(2, h.fails - 1)); if (h.fails >= 3) h.cooldown = now + 120000; }
    /* a CORS block or DNS failure is deterministic: never retry a provider that has not worked yet */
    else if (netErr && !h.ok) h.cooldown = now + 300000;
    else if (h.fails >= 2) h.cooldown = now + 180000;
    feed.status = 'degraded';
    SQ.emit('feed:error', id, feed.lastErr, h.fails);
    if (h.cooldown > now && S.provider === 'auto') {
      const next = chooseProvider();
      if (!next) { feed.lastProbe = now; setActive('sim', 'all-failed'); }
      else setActive(next, 'failover');
      wait = 120;
    } else if (h.cooldown > now && S.provider === id) {
      /* user pinned a provider that keeps failing: keep trying, slower */
      h.cooldown = 0;
      wait = 15000;
    }
    schedule(wait);
  }

  feed.start = () => { if (running) return; running = true; schedule(0); };
  feed.stop = () => { running = false; clearTimeout(timer); };
  feed.setView = (v) => {
    const first = !view;
    view = v;
    buildZones();
    if (first && running) schedule(0);
  };
  feed.zones = () => zones;
  feed.health = health;
  feed.kick = () => { for (const k of Object.keys(health)) { health[k].cooldown = 0; health[k].fails = 0; } feed.simFallback = false; globalJobs.emerg = 0; schedule(50); };
  feed.lastProbe = 0;
  /* direct lookups used by search, independent of the area loop */
  feed.lookup = async (kind, q) => {
    const order = [feed.active].concat(AUTO_ORDER).filter((v, i, a) => v && a.indexOf(v) === i && PROVIDERS[v][kind]);
    for (const id of order) {
      try {
        const d = await getJSON(PROVIDERS[id][kind](encodeURIComponent(q)), { timeout: 8000 });
        const list = parseReadsb(d);
        SQ.tracker.ingest(list, { provider: id, global: true });
        return list;
      } catch (e) { /* try next */ }
    }
    return [];
  };
  SQ.on('setting:provider', () => { feed.kick(); setActive(chooseProvider() || 'sim', 'user'); });
  SQ.on('setting:corsProxy', () => feed.kick());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) schedule(100); });
})();
