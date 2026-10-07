/* SQUAWK enrichment: aircraft info, routes, photos, flight traces, METAR. Cached in memory and localStorage. */
(function () {
  'use strict';
  const SQ = window.SQ, G = SQ.geo;
  const mem = new Map(), inflight = new Map();
  let store = SQ.ls.get('cache', {});
  const save = SQ.u.debounce(() => {
    const now = Date.now(), keys = Object.keys(store).filter((k) => store[k][0] > now);
    if (keys.length > 400) keys.sort((a, b) => store[a][0] - store[b][0]).splice(0, keys.length - 400);
    const next = {};
    for (const k of keys) next[k] = store[k];
    store = next;
    SQ.ls.set('cache', store);
  }, 2000);
  function cget(k) {
    if (mem.has(k)) return mem.get(k);
    const e = store[k];
    if (e && e[0] > Date.now()) { mem.set(k, e[1]); return e[1]; }
    return undefined;
  }
  function cset(k, v, ttl, persist) {
    mem.set(k, v);
    if (persist !== false) { store[k] = [Date.now() + ttl, v]; save(); }
    return v;
  }
  function once(k, fn) {
    if (inflight.has(k)) return inflight.get(k);
    const p = fn().finally(() => inflight.delete(k));
    inflight.set(k, p);
    return p;
  }
  const H = 3600e3;

  /* ---------------- airports ---------------- */
  function apLocal(a) {
    return a ? { icao: a[0], iata: a[1], name: a[2], city: a[3], iso: a[4], country: SQ.countryName(a[4]), lat: a[5], lon: a[6], elev: a[7] } : null;
  }
  function apAdsbdb(a) {
    return a ? { icao: a.icao_code, iata: a.iata_code, name: a.name, city: a.municipality, iso: a.country_iso_name, country: a.country_name, lat: a.latitude, lon: a.longitude, elev: a.elevation } : null;
  }

  /* ---------------- adsbdb (aircraft + route in one call) ---------------- */
  function parseAdsbdb(resp) {
    if (!resp || typeof resp !== 'object') return null;
    const a = resp.aircraft, fr = resp.flightroute;
    return {
      aircraft: a ? { type: a.type, icaoType: a.icao_type, maker: a.manufacturer, reg: a.registration, owner: a.registered_owner, ownerCountry: a.registered_owner_country_name, ownerIso: a.registered_owner_country_iso_name, photo: a.url_photo, thumb: a.url_photo_thumbnail } : null,
      route: fr && fr.origin && fr.destination ? {
        cs: fr.callsign, csIata: fr.callsign_iata,
        airline: fr.airline ? { name: fr.airline.name, icao: fr.airline.icao, iata: fr.airline.iata, country: fr.airline.country, radio: fr.airline.callsign } : null,
        origin: apAdsbdb(fr.origin), dest: apAdsbdb(fr.destination), via: fr.midpoint ? [apAdsbdb(fr.midpoint)] : null, src: 'adsbdb'
      } : null
    };
  }
  function adsbdb(hex, cs) {
    const k = 'adb:' + hex + ':' + (cs || '');
    const c = cget(k);
    if (c !== undefined) return Promise.resolve(c);
    return once(k, async () => {
      let res = null;
      try {
        const d = await SQ.getJSON('https://api.adsbdb.com/v0/aircraft/' + hex + (cs ? '?callsign=' + encodeURIComponent(cs) : ''), { timeout: 9000 });
        res = parseAdsbdb(d.response);
      } catch (e) {
        if (cs) {
          try { const d2 = await SQ.getJSON('https://api.adsbdb.com/v0/callsign/' + encodeURIComponent(cs), { timeout: 9000 }); res = parseAdsbdb(d2.response); } catch (e2) { /* unknown */ }
        }
      }
      return cset(k, res, res && res.route ? 6 * H : 0.5 * H);
    });
  }
  async function routeset(ac) {
    try {
      const d = await SQ.getJSON('https://api.adsb.lol/api/0/routeset', { body: { planes: [{ callsign: ac.flight, lat: ac.lat, lng: ac.lon }] }, timeout: 9000 });
      const r = Array.isArray(d) ? d[0] : null;
      if (!r || !r._airports || r._airports.length < 2) return null;
      const A = r._airports.map((a) => ({ icao: a.icao, iata: a.iata, name: a.name, city: a.location, iso: a.countryiso2, country: SQ.countryName(a.countryiso2), lat: a.lat, lon: a.lon, elev: a.alt_feet }));
      return { cs: r.callsign, airline: null, origin: A[0], dest: A[A.length - 1], via: A.length > 2 ? A.slice(1, -1) : null, plausibleFlag: r.plausible, src: 'adsb.lol' };
    } catch (e) { return null; }
  }

  /* is the aircraft actually somewhere along this route? stale route data is common */
  function check(route, ac) {
    if (!route || !route.origin || !route.dest || route.origin.lat == null) return route;
    const o = route.origin, d = route.dest;
    const total = G.distKm(o.lat, o.lon, d.lat, d.lon);
    const fromO = G.distKm(o.lat, o.lon, ac.lat, ac.lon), toD = G.distKm(ac.lat, ac.lon, d.lat, d.lon);
    const detour = (fromO + toD) / Math.max(1, total);
    route.verified = route.plausibleFlag !== false && (detour < 1.3 || Math.abs(G.crossTrackKm(o.lat, o.lon, d.lat, d.lon, ac.lat, ac.lon)) < Math.max(160, total * 0.12));
    return route;
  }
  SQ.routeProgress = (route, lat, lon) => {
    const o = route.origin, d = route.dest;
    const total = G.distKm(o.lat, o.lon, d.lat, d.lon);
    const fromO = G.distKm(o.lat, o.lon, lat, lon), toD = G.distKm(lat, lon, d.lat, d.lon);
    return { total, fromO, toD, frac: SQ.u.clamp(fromO / Math.max(1, fromO + toD), 0, 1) };
  };

  async function route(ac) {
    if (ac.sim) {
      const r = SQ.sim && SQ.sim.route(ac.hex);
      if (!r) return null;
      const op = SQ.D.operators && SQ.D.operators[r.op];
      return check({ cs: ac.flight, airline: op ? { name: op[0], icao: r.op, iata: '', country: op[1], radio: op[2] } : null, origin: apLocal(r.origin), dest: apLocal(r.dest), src: 'simulation' }, ac);
    }
    if (!ac.flight || /^(\d|[A-Z]-|N\d)/.test(ac.flight) || ac.flight === (ac.reg || '').replace('-', '')) return null;
    const k = 'rt:' + ac.flight;
    const c = cget(k);
    if (c !== undefined) return c ? check(Object.assign({}, c), ac) : null;
    const res = await once(k, async () => {
      const d = await adsbdb(ac.hex.replace('~', ''), ac.flight);
      let r = d && d.route;
      if (!r) r = await routeset(ac);
      return cset(k, r || null, r ? 6 * H : 0.5 * H);
    });
    return res ? check(Object.assign({}, res), ac) : null;
  }
  async function info(ac) {
    if (ac.sim || ac.hex[0] === '~') return null;
    const d = await adsbdb(ac.hex, ac.flight);
    return d && d.aircraft;
  }

  /* ---------------- photos ---------------- */
  async function photo(ac) {
    if (ac.sim || ac.hex[0] === '~') return null;
    const k = 'ph:' + ac.hex;
    const c = cget(k);
    if (c !== undefined) return c;
    return once(k, async () => {
      const pick = (d) => {
        const p = d && d.photos && d.photos[0];
        return p ? { src: (p.thumbnail_large || p.thumbnail || {}).src, link: p.link, by: p.photographer, site: 'Planespotters.net' } : null;
      };
      let res = null;
      try { res = pick(await SQ.getJSON('https://api.planespotters.net/pub/photos/hex/' + ac.hex, { timeout: 8000 })); } catch (e) { /* continue */ }
      if (!res && ac.reg) { try { res = pick(await SQ.getJSON('https://api.planespotters.net/pub/photos/reg/' + encodeURIComponent(ac.reg), { timeout: 8000 })); } catch (e) { /* continue */ } }
      if (!res) {
        const i = await info(ac).catch(() => null);
        if (i && (i.photo || i.thumb)) res = { src: i.photo || i.thumb, link: i.photo, by: '', site: 'airport-data.com' };
      }
      return cset(k, res, res ? 72 * H : 6 * H);
    });
  }

  /* ---------------- full flight trace (best effort, CORS dependent) ---------------- */
  function parseReadsbTrace(d) {
    if (!d || !Array.isArray(d.trace)) return [];
    const t0 = d.timestamp * 1000, tr = d.trace;
    let start = 0;
    for (let i = tr.length - 1; i > 0; i--) {
      if ((tr[i][6] & 2) || tr[i][0] - tr[i - 1][0] > 1500) { start = i; break; }
    }
    const out = [];
    for (let i = start; i < tr.length; i++) {
      const p = tr[i];
      out.push([p[2], p[1], p[3] === 'ground' ? 0 : p[3] == null ? NaN : p[3], t0 + p[0] * 1000, p[4] == null ? NaN : p[4]]);
    }
    return out;
  }
  async function trace(ac) {
    if (ac.sim || ac.traced || ac.hex[0] === '~') return;
    const k = 'tr:' + ac.hex;
    if (mem.has(k)) return;
    mem.set(k, true);
    const hex = ac.hex, sub = hex.slice(-2);
    for (const host of ['globe.adsb.lol', 'globe.airplanes.live']) {
      try {
        const pts = parseReadsbTrace(await SQ.getJSON('https://' + host + '/data/traces/' + sub + '/trace_full_' + hex + '.json', { timeout: 9000 }));
        if (pts.length > 2) { SQ.tracker.mergeTrace(hex, pts); return; }
      } catch (e) { /* try next */ }
    }
    try {
      const d = await SQ.getJSON('https://opensky-network.org/api/tracks/all?icao24=' + hex + '&time=0', { timeout: 9000 });
      if (d && d.path) SQ.tracker.mergeTrace(hex, d.path.map((p) => [p[2], p[1], p[5] ? 0 : p[3] == null ? NaN : p[3] * 3.28084, p[0] * 1000, NaN]));
    } catch (e) { /* no trace available */ }
  }

  /* ---------------- weather ---------------- */
  async function metar(icao) {
    if (!icao) return null;
    const k = 'mt:' + icao;
    const c = cget(k);
    if (c !== undefined) return c;
    return once(k, async () => {
      let res = null;
      try {
        const d = await SQ.getJSON('https://aviationweather.gov/api/data/metar?ids=' + icao + '&format=json', { timeout: 9000 });
        const m = Array.isArray(d) ? d[0] : null;
        if (m) res = { raw: m.rawOb, temp: m.temp, dew: m.dewp, wdir: m.wdir, wspd: m.wspd, wgst: m.wgst, vis: m.visib, altim: m.altim, cat: m.fltCat, clouds: m.clouds || [], time: m.obsTime ? m.obsTime * 1000 : null };
      } catch (e) { /* unavailable */ }
      return cset(k, res, res ? 0.25 * H : 0.1 * H, false);
    });
  }

  SQ.enrich = { route, info, photo, trace, metar, apLocal, logo: (iata) => (iata ? 'https://pics.avs.io/200/80/' + iata + '.png' : '') };
})();
