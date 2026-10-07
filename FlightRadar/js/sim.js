/* SQUAWK simulation: realistic synthetic traffic between real airports, used when live feeds are unreachable */
(function () {
  'use strict';
  const SQ = window.SQ, U = SQ.u, G = SQ.geo;

  const AIRLINES = ('BAW:GB EZY:GB VIR:GB RYR:IE EIN:IE DLH:DE EWG:DE CFG:DE AFR:FR TVF:FR KLM:NL TRA:NL IBE:ES VLG:ES TAP:PT ITY:IT ' +
    'SWR:CH AUA:AT SAS:SE NAX:NO FIN:FI LOT:PL WZZ:HU THY:TR PGT:TR UAE:AE ETD:AE QTR:QA SVA:SA ELY:IL AAL:US UAL:US DAL:US ' +
    'SWA:US JBU:US ASA:US NKS:US ACA:CA WJA:CA AMX:MX VOI:MX LAN:CL TAM:BR GLO:BR AZU:BR AVA:CO ANA:JP JAL:JP KAL:KR CES:CN ' +
    'CSN:CN CCA:CN CPA:HK SIA:SG MAS:MY THA:TH GIA:ID PAL:PH AIC:IN IGO:IN QFA:AU VOZ:AU JST:AU ANZ:NZ SAA:ZA ETH:ET MSR:EG RAM:MA KQA:KE')
    .split(' ').map((s) => s.split(':'));
  const REG = { GB: 'G-', IE: 'EI-', DE: 'D-A', FR: 'F-G', NL: 'PH-', ES: 'EC-', PT: 'CS-T', IT: 'I-', CH: 'HB-J', AT: 'OE-L', SE: 'SE-', NO: 'LN-',
    FI: 'OH-', PL: 'SP-L', HU: 'HA-L', TR: 'TC-', AE: 'A6-', QA: 'A7-', SA: 'HZ-', IL: '4X-', US: 'N', CA: 'C-', MX: 'XA-', CL: 'CC-', BR: 'PR-',
    CO: 'HK-', JP: 'JA', KR: 'HL', CN: 'B-', HK: 'B-H', SG: '9V-', MY: '9M-', TH: 'HS-', ID: 'PK-', PH: 'RP-C', IN: 'VT-', AU: 'VH-', NZ: 'ZK-',
    ZA: 'ZS-', ET: 'ET-', EG: 'SU-', MA: 'CN-', KE: '5Y-' };
  const SHORT = ['A320', 'A20N', 'B738', 'B38M', 'A321', 'A21N', 'E190', 'E195', 'CRJ9', 'AT76', 'DH8D', 'A319', 'BCS3', 'E75L', 'B737'];
  const MEDIUM = ['A321', 'A21N', 'B738', 'B38M', 'B752', 'A20N', 'A333', 'B763', 'B39M'];
  const LONG = ['B77W', 'B789', 'B78X', 'A359', 'A35K', 'A388', 'B748', 'A333', 'A339', 'B772', 'B788'];
  const GA = ['C172', 'P28A', 'SR22', 'DA40', 'C182', 'PA32', 'BE36', 'DA42'];
  const HELI = ['EC35', 'EC45', 'A139', 'AS50', 'R44', 'B429', 'EC30', 'S76'];
  const BIZ = ['C68A', 'GLF6', 'CL35', 'E55P', 'GL7T', 'FA7X', 'C56X', 'PC24', 'LJ45'];
  const MIL = [['F16', 'VIPER'], ['EUFI', 'TIGER'], ['F35', 'LIGHTNING'], ['C17', 'RCH'], ['K35R', 'QID'], ['A400', 'ASCOT'], ['C30J', 'HERKY'], ['RFAL', 'COTAM']];
  const L = (s) => String.fromCharCode(65 + ((Math.random() * 26) | 0));

  let flights = [];
  let center = null;
  let lastTick = 0;
  const byHex = new Map();

  function rangeHex(iso) {
    const r = SQ.D.ranges && SQ.D.ranges.ranges;
    const c = r && r.filter((x) => x[3] === (iso || '').toLowerCase());
    const e = c && c.length ? U.pick(c) : [0x400000, 0x43ffff];
    return (e[0] + ((Math.random() * (e[1] - e[0])) | 0)).toString(16).padStart(6, '0');
  }
  const LETTERS = { 'G-': 4, 'C-': 4, 'I-': 4, 'D-A': 3, 'F-G': 3 };
  const DIGITS = { 'B-': 4, JA: 4, HL: 4 };
  function reg(iso) {
    const p = REG[iso] || 'N';
    const rep = (n, f) => Array.from({ length: n }, f).join('');
    if (p === 'N') return 'N' + (100 + ((Math.random() * 899) | 0)) + L() + L();
    if (DIGITS[p]) return p + rep(DIGITS[p], () => (Math.random() * 10) | 0);
    return p + rep(LETTERS[p] || (p.endsWith('-') ? 3 : 2), L);
  }
  function airportsNear(lat, lon, km, onlyLarge) {
    const ap = SQ.airports();
    if (!ap) return [];
    return ap.list.filter((a) => (!onlyLarge || a[8] === 1) && Math.abs(a[5] - lat) < km / 100 && G.distKm(lat, lon, a[5], a[6]) < km);
  }
  function typeFor(km) { return U.pick(km < 1400 ? SHORT : km < 5000 ? MEDIUM : LONG); }

  function makeAirliner(near, far) {
    for (let tries = 0; tries < 30; tries++) {
      const o = U.pick(near), d = Math.random() < 0.18 && far.length ? U.pick(far) : U.pick(near);
      if (!o || !d || o === d) continue;
      const dist = G.distKm(o[5], o[6], d[5], d[6]);
      if (dist < 160) continue;
      const pos = Math.random() * dist;
      const pts = G.arc(o[5], o[6], d[5], d[6], 64);
      const p = interp(pts, pos / dist);
      if (G.distKm(center.lat, center.lon, p[0], p[1]) > 560) continue;
      const home = Math.random() < 0.65 ? AIRLINES.filter((a) => a[1] === o[4] || a[1] === d[4]) : [];
      const al = home.length ? U.pick(home) : U.pick(AIRLINES);
      const type = typeFor(dist);
      const cruiseAlt = Math.round(U.clamp(11000 + dist * 24, 15000, U.rand(35000, 41000)) / 1000) * 1000;
      const cruiseSpd = /AT7|DH8/.test(type) ? U.rand(270, 300) : /CRJ|E1|E7/.test(type) ? U.rand(420, 450) : dist > 5000 ? U.rand(470, 500) : U.rand(430, 465);
      const fl = {
        kind: 'air', hex: rangeHex(al[1]), cs: al[0] + ((10 + Math.random() * 2980) | 0), reg: reg(al[1]), type, cat: dist > 5000 ? 'A5' : 'A3',
        o, d, pts, dist, pos, cruiseAlt, cruiseSpd, wind: U.rand(-45, 45), alt: 0, vr: 0, gs: 0, sq: String(1000 + ((Math.random() * 6777) | 0)).replace(/[89]/g, '1'),
        op: al[0]
      };
      if (Math.random() < 1 / 600) fl.sq = '7700';
      fl.lat = p[0]; fl.lon = p[1]; fl.trk = G.bearing(p[0], p[1], d[5], d[6]);
      initProfile(fl);
      return fl;
    }
    return null;
  }
  function interp(pts, f) {
    const i = Math.min(63, Math.floor(f * 64)), k = f * 64 - i;
    const a = pts[i], b = pts[i + 1];
    return [a[1] + (b[1] - a[1]) * k, ((a[0] + (b[0] - a[0]) * k + 540) % 360) - 180];
  }
  /* altitude from position along route, used for initial placement */
  function initProfile(fl) {
    const fromO = fl.pos, toD = fl.dist - fl.pos;
    const climbAlt = fromO * 1000 / 1.852 / 3.2;
    const descAlt = (toD / 1.852 / 3) * 1000;
    fl.alt = Math.max(0, Math.min(fl.cruiseAlt, climbAlt, descAlt));
    fl.vr = fl.alt >= fl.cruiseAlt - 50 ? 0 : climbAlt < descAlt ? 2200 : -1800;
  }
  function makeLocal(kind, near) {
    const a = U.pick(near);
    if (!a) return null;
    const iso = a[4];
    const ang = Math.random() * 360, r = U.rand(3, 40);
    const p = G.dest(a[5], a[6], ang, r);
    const base = { hex: rangeHex(iso), reg: reg(iso), lat: p[0], lon: p[1], trk: Math.random() * 360, wobble: U.rand(-3, 3), home: a, sq: '7000' };
    if (kind === 'ga') return Object.assign(base, { kind, type: U.pick(GA), cat: 'A1', alt: U.rand(1500, 6500), gs: U.rand(85, 140), cs: '' });
    if (kind === 'heli') return Object.assign(base, { kind, type: U.pick(HELI), cat: 'A7', alt: U.rand(500, 2200), gs: U.rand(80, 135), cs: '' });
    if (kind === 'biz') return Object.assign(base, { kind, type: U.pick(BIZ), cat: 'A2', alt: U.rand(24000, 45000), gs: U.rand(400, 480), cs: '' });
    const m = U.pick(MIL);
    return Object.assign(base, { kind: 'mil', type: m[0], cat: m[0] === 'C17' || m[0] === 'K35R' || m[0] === 'A400' ? 'A5' : 'A6', alt: U.rand(14000, 33000), gs: U.rand(330, 520), cs: m[1] + ((10 + Math.random() * 80) | 0), mil: true, sq: '4' + ((100 + Math.random() * 600) | 0) });
  }

  function seed() {
    const near = airportsNear(center.lat, center.lon, 1300);
    const far = airportsNear(center.lat, center.lon, 9000, true);
    if (!near.length) return;
    const target = U.clamp(Math.round(near.length * 3.2), 60, 420);
    flights = flights.filter((f) => G.distKm(center.lat, center.lon, f.lat || f.o[5], f.lon || f.o[6]) < 700);
    const localNear = airportsNear(center.lat, center.lon, 420);
    while (flights.length < target) {
      const roll = Math.random();
      let f = null;
      if (roll < 0.8 || !localNear.length) f = makeAirliner(near, far);
      else if (roll < 0.88) f = makeLocal('ga', localNear);
      else if (roll < 0.93) f = makeLocal('heli', localNear);
      else if (roll < 0.97) f = makeLocal('biz', localNear);
      else f = makeLocal('mil', localNear);
      if (!f) break;
      flights.push(f);
    }
    byHex.clear();
    flights.forEach((f) => byHex.set(f.hex, f));
  }

  function tick(now) {
    const dt = lastTick ? Math.min(30, (now - lastTick) / 1000) : 0;
    lastTick = now;
    const near = center ? airportsNear(center.lat, center.lon, 1300) : [];
    const far = center ? airportsNear(center.lat, center.lon, 9000, true) : [];
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      if (f.kind === 'air') {
        const toGo = f.dist - f.pos;
        const desc = (toGo / 1.852 / 3) * 1000;
        let target;
        if (desc < f.alt - 300) target = -U.clamp(f.alt / 12, 900, 2600);
        else if (f.alt < f.cruiseAlt - 100) target = f.alt < 10000 ? 2600 : U.clamp((f.cruiseAlt - f.alt) / 4, 600, 2200);
        else target = 0;
        f.vr += (target - f.vr) * Math.min(1, dt / 8);
        f.alt = Math.max(0, Math.min(f.cruiseAlt, f.alt + (f.vr * dt) / 60));
        const tas = f.alt < 10000 ? U.lerp(150, 250, f.alt / 10000) : U.lerp(290, f.cruiseSpd, U.clamp((f.alt - 10000) / Math.max(1, f.cruiseAlt - 10000), 0, 1));
        f.gs = Math.max(120, tas + f.wind * U.clamp(f.alt / 30000, 0, 1));
        f.pos += (f.gs * 1.852 / 3600) * dt;
        if (f.pos >= f.dist - 1 || (toGo < 8 && f.alt < 200)) {
          const nf = makeAirliner(near, far);
          byHex.delete(f.hex);
          if (nf) { flights[i] = nf; byHex.set(nf.hex, nf); } else flights.splice(i, 1);
          continue;
        }
        const p = interp(f.pts, f.pos / f.dist);
        f.trk = G.bearing(p[0], p[1], f.d[5], f.d[6]);
        f.lat = p[0]; f.lon = p[1];
      } else {
        f.wobble += U.rand(-0.6, 0.6) * dt;
        f.wobble = U.clamp(f.wobble, f.kind === 'heli' || f.kind === 'ga' ? -4 : -2, f.kind === 'heli' || f.kind === 'ga' ? 4 : 2);
        /* stay near home: steer back when far */
        const dHome = G.distKm(f.lat, f.lon, f.home[5], f.home[6]);
        const lim = f.kind === 'ga' || f.kind === 'heli' ? 45 : 260;
        if (dHome > lim) {
          const back = G.bearing(f.lat, f.lon, f.home[5], f.home[6]);
          f.trk += U.clamp(U.angDiff(f.trk, back), -3 * dt, 3 * dt);
        } else f.trk += f.wobble * dt;
        f.trk = U.norm360(f.trk);
        f.vr = f.kind === 'mil' ? Math.sin(now / 9000 + f.wobble) * 1500 : Math.sin(now / 14000 + f.wobble) * 300;
        f.alt = Math.max(300, f.alt + (f.vr * dt) / 60);
        const p = G.advance(f.lat, f.lon, f.gs, f.trk, dt);
        f.lat = p[0]; f.lon = p[1];
      }
    }
  }

  function report(f, now) {
    const ti = SQ.typeInfo(f.type);
    const op = f.op ? SQ.D.operators && SQ.D.operators[f.op] : null;
    const sq = f.sq || '';
    return {
      hex: f.hex, flight: f.cs, reg: f.reg, type: f.type, desc: ti ? ti.desc : '', ownOp: op ? op[0] : '', year: '',
      cat: f.cat, dbFlags: f.mil ? 1 : 0, lat: f.lat, lon: f.lon, gnd: false, alt: Math.round(f.alt / 25) * 25,
      altGeom: Math.round((f.alt + 350) / 25) * 25, gs: Math.round(f.gs * 10) / 10, ias: null, tas: null, mach: f.alt > 25000 ? Math.round((f.gs / 600) * 1000) / 1000 : null,
      track: Math.round(f.trk * 10) / 10, trackRate: null, roll: null, heading: null, vr: Math.round(f.vr / 64) * 64,
      squawk: sq, emergency: sq === '7700' ? 'general' : '',
      navAlt: f.kind === 'air' ? (f.vr < -200 ? Math.max(3000, Math.floor((f.alt - 4000) / 1000) * 1000) : f.cruiseAlt) : null,
      navHdg: null, navQnh: null, navModes: null,
      wd: f.alt > 18000 ? Math.round(U.norm360(250 + Math.sin(f.lat / 3) * 40)) : null, ws: f.alt > 18000 ? Math.round(30 + f.alt / 600) : null, oat: f.alt > 18000 ? Math.round(15 - f.alt / 500) : null,
      rssi: -20, msgs: 0, src: 'SIM', t: now, seen: now, sim: true
    };
  }

  SQ.sim = {
    ensure(view) {
      if (!view || !SQ.airports()) return;
      const [lat, lon] = view.center;
      if (!center || G.distKm(center.lat, center.lon, lat, lon) > 350) {
        center = { lat, lon };
        seed();
      }
    },
    reports() {
      const now = Date.now();
      tick(now);
      return flights.map((f) => report(f, now));
    },
    route(hex) {
      const f = byHex.get(hex);
      return f && f.kind === 'air' ? { origin: f.o, dest: f.d, op: f.op } : null;
    },
    reset() { flights = []; center = null; byHex.clear(); lastTick = 0; }
  };
})();
