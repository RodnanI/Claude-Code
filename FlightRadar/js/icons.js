/* SQUAWK icons: procedural top-down aircraft silhouettes, type classification, sprite cache */
(function () {
  'use strict';
  const SQ = window.SQ;

  /* Shape specs in CSS px at scale 1, nose pointing up (-y).
     f: fuselage [length, width, noseLen, tailTaper]; w: wing [rootLE_y, halfSpan, rootChord, tipChord, sweep]
     t: tailplane [rootLE_y, halfSpan, rootChord, tipChord, sweep]; e: engines [[x, y, len, w], ...] mirrored
     p: props [[x, y, halfSpan]] mirrored, drawn as blades */
  const SPECS = {
    heavy4: { f: [37, 5.4, 6, 9], w: [-4.5, 18.5, 11, 2.4, 10.5], t: [12.5, 7.6, 5, 1.8, 4.5], e: [[6.4, -0.8, 5, 2.6], [11.6, 2.6, 4.6, 2.4]] },
    wide2: { f: [35, 5, 6, 9], w: [-3.5, 17.5, 9.5, 2.2, 9], t: [12, 7.2, 4.6, 1.8, 4.2], e: [[7, -1.2, 6, 3.4]] },
    narrow: { f: [29, 3.8, 5, 7], w: [-2, 14, 7.2, 1.9, 6.6], t: [10, 5.6, 3.6, 1.4, 3.2], e: [[5.6, -1.6, 4.4, 2.4]] },
    rj: { f: [26, 3.2, 4.5, 6], w: [-1.5, 11.2, 6, 1.7, 4.6], t: [9.6, 4.8, 3, 1.4, 2.6], e: [[2.9, 5.2, 4.6, 2]] },
    bizjet: { f: [21, 2.7, 4.2, 5], w: [-0.2, 9.4, 4.8, 1.5, 3.8], t: [7.7, 4, 2.6, 1.2, 2.2], e: [[2.5, 4.2, 3.6, 1.7]] },
    turboprop: { f: [24, 3, 3.6, 7], w: [-3.4, 13.2, 3.8, 2.2, 0.6], t: [8.4, 4.8, 3, 1.8, 1.4], e: [[4.6, -5.2, 6, 1.9]], p: [[4.6, -5.6, 3.2]] },
    miltrans: { f: [28, 4, 4, 8], w: [-3.6, 16.5, 4.6, 2.4, 0.8], t: [10, 6.4, 3.6, 2, 1.8], e: [[5, -5.4, 5.4, 1.9], [9.8, -4.8, 5.2, 1.8]], p: [[5, -5.8, 3.1], [9.8, -5.2, 3.1]] },
    light: { f: [16, 2.4, 2.5, 5], w: [-2.6, 9.4, 2.7, 2.1, 0], t: [5.4, 3.4, 2.1, 1.5, 0.4], p: [[0, -8.2, 3]] },
    fighter: { f: [22, 2.8, 5.5, 3], w: [-2.4, 7.6, 10.4, 1.2, 8], t: [7.6, 4.6, 3.2, 1.1, 2.8] },
    glider: { f: [14, 1.6, 2.4, 6], w: [-2.4, 13.5, 1.9, 0.9, 0.3], t: [5.2, 2.6, 1.2, 0.8, 0.3] }
  };
  const SIZE = { heavy4: 1.1, wide2: 1.05, narrow: 1, rj: 0.95, bizjet: 0.95, turboprop: 0.95, miltrans: 1, light: 1, fighter: 1, glider: 1, heli: 1, balloon: 1, drone: 1, ground: 1, unknown: 1 };

  function trap(p, side, y0, span, rc, tc, sweep, x0) {
    const s = side, x = x0 || 0;
    p.moveTo(s * x, y0);
    p.lineTo(s * (x + span), y0 + sweep);
    p.lineTo(s * (x + span), y0 + sweep + tc);
    p.lineTo(s * x, y0 + rc);
    p.closePath();
  }
  function rrect(p, cx, cy, w, h, r) {
    const x = cx - w / 2, y = cy - h / 2;
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
    p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
    p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); p.closePath();
  }
  function fuselage(p, len, w, nose, taper) {
    const y0 = -len / 2, y1 = len / 2, hw = w / 2;
    p.moveTo(0, y0);
    p.quadraticCurveTo(hw, y0, hw, y0 + nose);
    p.lineTo(hw, y1 - taper);
    p.quadraticCurveTo(hw * 0.55, y1, hw * 0.3, y1);
    p.lineTo(-hw * 0.3, y1);
    p.quadraticCurveTo(-hw * 0.55, y1, -hw, y1 - taper);
    p.lineTo(-hw, y0 + nose);
    p.quadraticCurveTo(-hw, y0, 0, y0);
    p.closePath();
  }

  /* returns {body: Path2D, fus: Path2D|null, eng: Path2D|null, extra: fn|null, r: radius} */
  const cache = {};
  function build(shape) {
    if (cache[shape]) return cache[shape];
    const body = new Path2D();
    let fus = null, eng = null, extra = null, r = 14;
    const sp = SPECS[shape];
    if (sp) {
      const [L, W, N, T] = sp.f;
      fuselage(body, L, W, N, T);
      fus = new Path2D(); fuselage(fus, L * 0.9, W * 0.42, N * 0.8, T * 0.8);
      const [wy, ws, wr, wt, wsw] = sp.w;
      trap(body, 1, wy, ws, wr, wt, wsw); trap(body, -1, wy, ws, wr, wt, wsw);
      const [ty, ts, tr, tt, tsw] = sp.t;
      trap(body, 1, ty, ts, tr, tt, tsw); trap(body, -1, ty, ts, tr, tt, tsw);
      if (sp.e) {
        eng = new Path2D();
        for (const [ex, ey, el, ew] of sp.e) for (const s of [1, -1]) { rrect(body, s * ex, ey, ew, el, ew / 2); rrect(eng, s * ex, ey, ew * 0.6, el * 0.8, ew / 3); }
      }
      if (sp.p) {
        const props = sp.p;
        extra = (ctx) => {
          ctx.beginPath();
          for (const [px, py, hs] of props) for (const s of (px ? [1, -1] : [1])) { ctx.moveTo(s * px - hs, py); ctx.lineTo(s * px + hs, py); }
          ctx.stroke();
        };
      }
      r = Math.max(L / 2, ws) + 2;
    } else if (shape === 'heli') {
      rrect(body, 0, -2.2, 4.6, 9, 2.3);
      rrect(body, 0, 6.5, 1.3, 10, 0.6);
      rrect(body, 0, 11.2, 4.6, 1.2, 0.6);
      fus = new Path2D(); rrect(fus, 0, -3.4, 2.4, 4, 1.2);
      extra = (ctx) => {
        ctx.beginPath(); ctx.arc(0, -1.6, 9.5, 0, Math.PI * 2); ctx.globalAlpha *= 0.35; ctx.stroke(); ctx.globalAlpha /= 0.35;
        ctx.beginPath(); ctx.moveTo(-9.5, -1.6); ctx.lineTo(9.5, -1.6); ctx.moveTo(0, -11.1); ctx.lineTo(0, 7.9); ctx.stroke();
      };
      r = 12;
    } else if (shape === 'balloon') {
      body.arc(0, 0, 6.5, 0, Math.PI * 2);
      extra = (ctx) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); }
        ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.globalAlpha /= 0.5;
      };
      r = 8;
    } else if (shape === 'drone') {
      rrect(body, 0, 0, 3.6, 3.6, 1);
      for (const [x, y] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { body.moveTo(x + 2.1, y); body.arc(x, y, 2.1, 0, Math.PI * 2); }
      extra = (ctx) => { ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.stroke(); };
      r = 7;
    } else if (shape === 'ground') {
      rrect(body, 0, 0, 5, 8, 1.4);
      r = 5;
    } else {
      body.moveTo(0, -9); body.lineTo(6.5, 7.5); body.lineTo(0, 4); body.lineTo(-6.5, 7.5); body.closePath();
      r = 10;
    }
    return (cache[shape] = { body, fus, eng, extra, r });
  }

  /* ---------------- sprites ---------------- */
  const sprites = new Map();
  let dpr = Math.min(3, window.devicePixelRatio || 1);
  function mix(rgb, t, to) { return rgb.map((v, i) => v + ((to ? to[i] : 255) - v) * t); }
  /* variant: n normal, s selected, h hover, d dim */
  function sprite(shape, key, rgb, variant, scale) {
    scale = scale || 1;
    const id = shape + '|' + key + '|' + variant + '|' + scale;
    let s = sprites.get(id);
    if (s) return s;
    const g = build(shape);
    const k = scale * (SIZE[shape] || 1);
    const pad = variant === 's' ? 5 : 3;
    const half = Math.ceil(g.r * k + pad);
    const size = half * 2;
    const c = document.createElement('canvas');
    const q = dpr * 1.5;
    c.width = c.height = Math.ceil(size * q);
    const ctx = c.getContext('2d');
    ctx.setTransform(q * k, 0, 0, q * k, half * q, half * q);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const outline = variant === 's' ? '#ffffff' : variant === 'h' ? '#fff3d6' : 'rgba(8,10,9,0.92)';
    ctx.strokeStyle = outline;
    ctx.lineWidth = (variant === 's' ? 3.6 : variant === 'h' ? 3 : 2.4) / k;
    ctx.stroke(g.body);
    if (g.extra) { ctx.save(); ctx.lineWidth = 2.8 / k; g.extra(ctx); ctx.restore(); }
    const base = variant === 'd' ? mix(rgb, 0.55, [40, 44, 42]) : rgb;
    ctx.fillStyle = SQ.color.css(base);
    ctx.fill(g.body);
    if (g.eng) { ctx.fillStyle = SQ.color.css(mix(base, 0.35, [0, 0, 0])); ctx.fill(g.eng); }
    if (g.fus) { ctx.fillStyle = SQ.color.css(mix(base, 0.4), 0.85); ctx.fill(g.fus); }
    if (g.extra) { ctx.strokeStyle = SQ.color.css(mix(base, 0.2)); ctx.lineWidth = 1.1 / k; g.extra(ctx); }
    s = { c, size, half };
    sprites.set(id, s);
    return s;
  }
  function dataUrl(shape, rgb, px) {
    const g = build(shape), c = document.createElement('canvas'), d = 2, k = (px / 2) / (g.r + 2);
    c.width = c.height = px * d;
    const ctx = c.getContext('2d');
    ctx.setTransform(d * k, 0, 0, d * k, (px / 2) * d, (px / 2) * d);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,10,9,0.9)'; ctx.lineWidth = 2 / k; ctx.stroke(g.body);
    ctx.fillStyle = SQ.color.css(rgb); ctx.fill(g.body);
    if (g.extra) { ctx.strokeStyle = SQ.color.css(rgb); ctx.lineWidth = 1 / k; g.extra(ctx); }
    return c.toDataURL();
  }
  window.addEventListener('resize', () => {
    const d = Math.min(3, window.devicePixelRatio || 1);
    if (d !== dpr) { dpr = d; sprites.clear(); }
  });

  /* ---------------- classification ---------------- */
  const RX = {
    heavy4: /^(A38|B74|A34|A124|A225|IL96|IL76|IL78|C5M?$|C17$|B52|K35|KC35|E3TF|E3CF|E6$|B70|DC8|VC10|B703)/,
    miltrans: /^(C130|C30J|AN12|AN22|P3|L188|A400|C160|AN70|Y8|Y9|KC390|E2$)/,
    fighter: /^(F14|F15|F16|F18|FA18|F22|F35|F4$|F5$|EUFI|RFAL|TORN|MIR2|SU2[4-7]|SU3[0-5]|MG2|MG3|J10|J11|J20|JAS3|GRIF|HAWK|T38|T7|A10|AV8|F117|L39|L159|M346|PC21|PC9|T45|ALPH|SB39|A4$|KFIR|TPHR|AMX|JF17|K8|T50|FA50|HUNT|LCA|B1$|B2$|U2$|SR71|TU22|TU95|TU16)/,
    rj: /^(CRJ|E135|E145|E35L|E45X|F70|F100|F28|MD8|MD9|DC9|B712|B72|YK4|IL62|TU13|TU15|TU20|B461|B462|B463|RJ7|RJ8|RJ1H|J328|ME28|VFW|BA11)/,
    bizjet: /^(GLF|GLEX|GL5T|GL6T|GL7T|GL8T|GA5C|GA6C|GA7C|GA8C|CL30|CL35|CL60|C25|C50|C51|C52|C55|C56|C65|C68|C70|C75|E50P|E55P|E545|E550|FA[0-9]|F2TH|F900|LJ|H25|HA4T|PRM1|BE40|PC24|HDJT|EA50|SF50|G150|G280|ASTR|WW24|C680|C700|E135L)/
  };
  const MIL_CS = /^(RCH|RRR|CNV|ASCOT|NATO|GAF|IAM|BAF|FAF|CTM|RFR|HKY|DUKE|SAM|SPAR|EVAC|HERKY|REACH|TABOR|JAKE|LAGR|PAT\d|NAVY|ARMY|PLF|HUAF|SUI|SVF|HAF|CFC|RSD|MMF|AME|CASA|LION|KING|TOPCAT|SHELL|QID|POLO|BART|NCHO|FORTE|HOMER|ETHYL|BLKCAT|ROMAN)\d*/;
  function shapeFor(ac) {
    const cat = ac.cat || '', t = ac.type || '';
    if (cat[0] === 'C') return 'ground';
    if (cat === 'B1') return 'glider';
    if (cat === 'B2') return 'balloon';
    if (cat === 'B6') return 'drone';
    if (t) {
      if (t === 'BALL') return 'balloon';
      if (t === 'GLID') return 'glider';
      if (t === 'GND' || t === 'TWR' || t === 'SERV' || t === 'EMER') return 'ground';
      if (RX.miltrans.test(t)) return 'miltrans';
      if (RX.heavy4.test(t)) return 'heavy4';
      if (RX.fighter.test(t)) return 'fighter';
      const info = SQ.typeInfo(t);
      if (info) {
        const c = info.cls || '', kind = c[2], n = parseInt(c[1], 10) || 1, wtc = info.wtc;
        if (c[0] === 'H' || c[0] === 'G') return 'heli';
        if (c[0] === 'T') return 'turboprop';
        if (kind === 'J') {
          if (n >= 4) return 'heavy4';
          if (wtc === 'H' || wtc === 'J') return 'wide2';
          if (RX.bizjet.test(t)) return 'bizjet';
          if (RX.rj.test(t)) return 'rj';
          return wtc === 'L' ? 'bizjet' : 'narrow';
        }
        if (kind === 'T') return n >= 4 ? 'miltrans' : n >= 2 ? 'turboprop' : 'light';
        if (kind === 'P' || kind === 'E') return n >= 4 ? 'miltrans' : 'light';
        if (c[0] === 'L' || c[0] === 'A') return 'light';
      }
      if (RX.bizjet.test(t)) return 'bizjet';
      if (RX.rj.test(t)) return 'rj';
    }
    switch (cat) {
      case 'A1': case 'B4': return 'light';
      case 'A2': return 'bizjet';
      case 'A3': case 'A4': return 'narrow';
      case 'A5': return 'wide2';
      case 'A6': case 'B7': return 'fighter';
      case 'A7': return 'heli';
    }
    if (/^[A-Z]{3}\d/.test(ac.flight || '')) return 'narrow';
    return 'unknown';
  }
  function isMil(ac, shape) {
    return !!((ac.dbFlags & 1) || shape === 'fighter' || (shape === 'miltrans' && !/^(C130|L188)/.test(ac.type || '')) || MIL_CS.test(ac.flight || ''));
  }
  function classFor(ac, shape) {
    if (ac.mil) return 'mil';
    switch (shape) {
      case 'heavy4': case 'wide2': case 'narrow': return 'airliner';
      case 'rj': return 'regional';
      case 'turboprop': return /^[A-Z]{3}\d/.test(ac.flight || '') ? 'regional' : 'ga';
      case 'bizjet': return 'bizjet';
      case 'light': return 'ga';
      case 'heli': return 'heli';
      case 'fighter': case 'miltrans': return 'mil';
      case 'glider': case 'balloon': case 'drone': return 'special';
      case 'ground': return 'gnd';
    }
    return 'unknown';
  }
  const ENGINE_KIND = { J: 'jet', T: 'turboprop', P: 'piston', E: 'electric', R: 'rocket' };
  const KIND = { L: 'Landplane', S: 'Seaplane', A: 'Amphibian', H: 'Helicopter', G: 'Gyrocopter', T: 'Tiltrotor' };
  function describeClass(cls) {
    if (!cls || cls.length < 3) return '';
    const n = cls[1] === 'C' ? 'Coupled' : cls[1];
    return (KIND[cls[0]] || 'Aircraft') + ', ' + n + ' ' + (ENGINE_KIND[cls[2]] || '') + (n === '1' ? ' engine' : ' engines');
  }
  const WTC = { L: 'Light', M: 'Medium', H: 'Heavy', J: 'Super' };

  SQ.icons = { build, sprite, dataUrl, shapeFor, classFor, isMil, describeClass, WTC, SHAPES: Object.keys(SIZE) };
})();
