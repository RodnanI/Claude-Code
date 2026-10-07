/* SQUAWK renderer: canvas overlay synced to the MapLibre camera. Aircraft, labels, 3D altitude, scope mode, wind field. */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo, T = SQ.tracker, F = SQ.fmt;
  const R = (SQ.render = { fps: 0, drawn: 0 });
  let canvas, ctx, map, W = 0, H = 0, dpr = 1;
  let lastDraw = 0, lastRenderEvt = 0, lastNow = Date.now(), fpsN = 0, fpsT = 0;
  const hits = [];
  let hitN = 0;
  const order = [];
  const P = { x: 0, y: 0, w: 1 }, P2 = { x: 0, y: 0, w: 1 }, P3 = { x: 0, y: 0, w: 1 }, PG = { x: 0, y: 0, w: 1 };
  const pulses = [];
  let hoverHex = null, mouse = null, tip = null;
  let sweepPrev = 0;
  let timers = { trail: 0, tails: 0, density: 0, route: 0, frame: 0 };

  R.init = () => {
    canvas = document.getElementById('fx');
    ctx = canvas.getContext('2d');
    map = SQ.map.map;
    tip = document.getElementById('tip');
    resize();
    window.addEventListener('resize', resize);
    new ResizeObserver(resize).observe(canvas);
    map.on('render', () => { lastRenderEvt = performance.now(); draw(lastRenderEvt); });
    const mc = map.getCanvasContainer();
    mc.addEventListener('mousemove', (e) => { const r = mc.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    mc.addEventListener('mouseleave', () => { mouse = null; });
    SQ.on('zone:fetched', (z) => { if (S.layers.coverage) pulses.push({ lat: z.lat, lon: z.lon, r: z.r, t: Date.now() }); });
    requestAnimationFrame(loop);
  };
  function resize() {
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function loop(t) {
    requestAnimationFrame(loop);
    const sel = T.sel();
    const now = Date.now();
    if (sel) { T.pos(sel, now); SQ.map.tickCamera(sel, now - lastNow); }
    /* the map draws us during its own render when it is animating; otherwise we draw here */
    if (t - lastRenderEvt > 12) draw(t);
  }

  /* ---------------- projection ---------------- */
  let PR = null;
  function projector() {
    const tr = map.transform;
    const globe = S.globe && map.getProjection && (map.getProjection() || {}).type === 'globe';
    const c = map.getCenter();
    const z = map.getZoom();
    PR = { globe, m: tr.modelViewProjectionMatrix, cmx: (c.lng + 180) / 360, zoom: z, pitch: map.getPitch(), bearing: map.getBearing(), mppK: 40075016.686 / (512 * Math.pow(2, z)), wc: 1, k: tr.worldSize || 512 * Math.pow(2, z) };
    if (!globe) {
      /* the matrix takes world pixels in MapLibre 5; fall back to unit mercator if the center does not land mid-screen */
      if (!proj(c.lng, c.lat, 0, PG) || Math.abs(PG.x - W / 2) > W / 4) { PR.k = 1; proj(c.lng, c.lat, 0, PG); }
      PR.wc = PG.w || 1;
    }
  }
  function proj(lon, lat, altM, out) {
    if (PR.globe) {
      const ll = new maplibregl.LngLat(lon, lat);
      if (map.transform.isLocationOccluded && map.transform.isLocationOccluded(ll)) return false;
      const p = map.project(ll);
      out.x = p.x; out.y = p.y; out.w = 1;
      return true;
    }
    let mx = (lon + 180) / 360;
    mx += Math.round(PR.cmx - mx);
    const s = Math.sin(U.clamp(lat, -85.05, 85.05) * G.RAD);
    const my = 0.5 - (0.25 * Math.log((1 + s) / (1 - s))) / Math.PI;
    const m = PR.m, k = PR.k;
    /* world-pixel matrices take altitude in meters; unit-mercator matrices take mercator z */
    const mzk = !altM ? 0 : k === 1 ? altM / (40075016.686 * Math.cos(lat * G.RAD)) : altM;
    mx *= k; const myk = my * k;
    const w = m[3] * mx + m[7] * myk + m[11] * mzk + m[15];
    if (w <= 1e-9) return false;
    out.x = ((m[0] * mx + m[4] * myk + m[8] * mzk + m[12]) / w + 1) * 0.5 * W;
    out.y = (1 - (m[1] * mx + m[5] * myk + m[9] * mzk + m[13]) / w) * 0.5 * H;
    out.w = w;
    return true;
  }
  R.project = (lon, lat, altM) => { if (!PR) projector(); return proj(lon, lat, altM || 0, P) ? { x: P.x, y: P.y } : null; };

  /* ---------------- main draw ---------------- */
  function draw(t) {
    const cap = S.fps >= 60 ? 0 : 1000 / S.fps - 2;
    if (cap && t - lastDraw < cap) return;
    lastDraw = t;
    const now = Date.now();
    const dt = now - lastNow;
    lastNow = now;
    fpsN++;
    if (t - fpsT > 1000) { R.fps = Math.round((fpsN * 1000) / (t - fpsT)); fpsN = 0; fpsT = t; }
    if (!W || !H) resize();
    projector();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const scope = S.scope;
    const sel = T.sel();
    const selHex = T.selected;
    const view3d = S.view3d && !PR.globe;
    const ex = (S.exaggerate || 3) * 0.3048;
    const zs = U.clamp(0.62 + (PR.zoom - 4) * 0.075, 0.55, 1.3) * (S.iconScale || 1);
    const affine = PR.globe || PR.pitch > 1 || view3d;
    const mode = S.colorMode;
    const vis = T.visible;
    vis.length = 0;
    order.length = 0;
    hitN = 0;

    if (pulses.length) drawPulses(now);

    /* pass 1: positions, culling */
    for (const ac of T.list.values()) {
      if (!T.passes(ac)) continue;
      T.pos(ac, now);
      const altM = view3d && !ac.gnd && ac.ralt != null ? ac.ralt * ex : 0;
      if (!proj(ac.rlon, ac.rlat, altM, P)) continue;
      if (P.x < -60 || P.x > W + 60 || P.y < -60 || P.y > H + 60) continue;
      ac.sx = P.x; ac.sy = P.y; ac.sw = P.w;
      vis.push(ac);
      order.push(ac);
    }
    if (view3d) order.sort((a, b) => b.sw - a.sw);
    else order.sort((a, b) => (a.gnd ? -1 : a.ralt || 0) - (b.gnd ? -1 : b.ralt || 0));

    if (S.layers.wind && !scope) drawWind(order);

    if (scope) { drawScope(order, now, sel); }
    else {
      const dim = !!sel;
      for (let i = 0; i < order.length; i++) {
        const ac = order[i];
        const isSel = ac.hex === selHex, isHov = ac.hex === hoverHex;
        const k = zs;
        const col = SQ.color.forAc(ac, mode);
        if (view3d && !ac.gnd && ac.ralt > 50) {
          if (proj(ac.rlon, ac.rlat, 0, PG)) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.strokeStyle = SQ.color.css(col.rgb, 0.32);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(PG.x, PG.y); ctx.lineTo(ac.sx, ac.sy); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(PG.x, PG.y, 3 * k, 1.6 * k, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (ac.emergency) emergencyRing(ac, now);
        if (isSel) glow(ac, col.rgb, k);
        const spr = SQ.icons.sprite(ac.shape, col.key, col.rgb, isSel ? 's' : isHov ? 'h' : 'n');
        ctx.globalAlpha = dim && !isSel && !isHov ? 0.72 : 1;
        if (affine) placeAffine(ac, k, view3d && !ac.gnd && ac.ralt != null ? ac.ralt * ex : 0);
        else {
          const a = (ac.rtrk - PR.bearing) * G.RAD, c = Math.cos(a) * k * dpr, s = Math.sin(a) * k * dpr;
          ctx.setTransform(c, s, -s, c, ac.sx * dpr, ac.sy * dpr);
        }
        ctx.drawImage(spr.c, -spr.half, -spr.half, spr.size, spr.size);
        ctx.globalAlpha = 1;
        addHit(ac, ac.sx, ac.sy, Math.max(12, spr.half * k));
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLabels(order, sel, now);
      if (sel && sel.sx != null && vis.indexOf(sel) >= 0) reticle(sel, now);
    }
    drawHome();
    R.drawn = order.length;

    /* hover */
    if (mouse && !SQ.isMobile()) {
      const h = hitTest(mouse.x, mouse.y, 14);
      const hh = h ? h.hex : null;
      if (hh !== hoverHex) { hoverHex = hh; map.getCanvas().style.cursor = hh ? 'pointer' : ''; }
    } else if (hoverHex) { hoverHex = null; }
    updateTip();

    /* periodic map-side updates */
    if (sel && now - timers.trail > 700) { timers.trail = now; SQ.map.updateTrail(sel); }
    if (S.trails === 'all' && now - timers.tails > 2500) { timers.tails = now; SQ.map.updateTails(vis); }
    if (S.layers.density && now - timers.density > 4000) { timers.density = now; SQ.map.updateDensity(Array.from(T.list.values())); }
    if (now - timers.frame > 250) { timers.frame = now; SQ.emit('frame', now); }
  }

  function placeAffine(ac, k, altM) {
    const lat = ac.rlat, lon = ac.rlon;
    const mpp = PR.mppK * Math.cos(lat * G.RAD);
    const d = mpp * 10;
    const tr = ac.rtrk * G.RAD;
    const cosl = Math.max(0.01, Math.cos(lat * G.RAD));
    const okF = proj(lon + (d * Math.sin(tr)) / (111320 * cosl), lat + (d * Math.cos(tr)) / 111320, altM, P2);
    const okR = proj(lon + (d * Math.cos(tr)) / (111320 * cosl), lat - (d * Math.sin(tr)) / 111320, altM, P3);
    if (!okF || !okR) { ctx.setTransform(k * dpr, 0, 0, k * dpr, ac.sx * dpr, ac.sy * dpr); return; }
    let fx = (P2.x - ac.sx) / 10, fy = (P2.y - ac.sy) / 10, rx = (P3.x - ac.sx) / 10, ry = (P3.y - ac.sy) / 10;
    /* cap foreshortening at 2:1 so steeply pitched icons stay legible */
    const lf = Math.hypot(fx, fy), lr = Math.hypot(rx, ry);
    if (lf < lr * 0.5 && lf > 1e-6) { const g = (lr * 0.5) / lf; fx *= g; fy *= g; }
    else if (lr < lf * 0.5 && lr > 1e-6) { const g = (lf * 0.5) / lr; rx *= g; ry *= g; }
    /* the probe points already carry perspective and foreshortening; only clamp extremes for readability */
    const sc = Math.sqrt(Math.abs(rx * fy - ry * fx));
    let m = k;
    if (sc < 0.45) m *= 0.45 / Math.max(sc, 1e-3); else if (sc > 1.8) m *= 1.8 / sc;
    const sx = dpr * m;
    ctx.setTransform(rx * sx, ry * sx, -fx * sx, -fy * sx, ac.sx * dpr, ac.sy * dpr);
  }
  function addHit(ac, x, y, r) {
    let h = hits[hitN];
    if (!h) h = hits[hitN] = {};
    h.hex = ac.hex; h.x = x; h.y = y; h.r = r;
    hitN++;
  }
  function hitTest(x, y, rad) {
    let best = null, bd = Infinity;
    for (let i = 0; i < hitN; i++) {
      const h = hits[i], d = Math.hypot(h.x - x, h.y - y);
      if (d < Math.max(rad, h.r) && d < bd) { bd = d; best = h; }
    }
    return best;
  }
  R.hitTest = hitTest;
  R.clickAt = (x, y) => {
    const h = hitTest(x, y, SQ.isMobile() ? 24 : 15);
    if (!h) return false;
    T.select(h.hex, { from: 'map' });
    return true;
  };

  /* ---------------- decorations ---------------- */
  function glow(ac, rgb, k) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = 26 * k;
    const g = ctx.createRadialGradient(ac.sx, ac.sy, 0, ac.sx, ac.sy, r);
    g.addColorStop(0, SQ.color.css(rgb, 0.45));
    g.addColorStop(1, SQ.color.css(rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ac.sx, ac.sy, r, 0, Math.PI * 2); ctx.fill();
  }
  function emergencyRing(ac, now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < 2; i++) {
      const ph = ((now / 1400) + i / 2) % 1;
      ctx.strokeStyle = `rgba(255,59,31,${(1 - ph) * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ac.sx, ac.sy, 10 + ph * 34, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function reticle(ac, now) {
    const s = 22 + Math.sin(now / 260) * 1.5, l = 7;
    const x = ac.sx, y = ac.sy;
    ctx.strokeStyle = document.documentElement.dataset.theme === 'light' ? '#1b1a17' : '#fff4dc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * s, y + sy * (s - l)); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * (s - l), y + sy * s);
    }
    ctx.stroke();
  }
  function drawPulses(now) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i], f = (now - p.t) / 1600;
      if (f > 1) { pulses.splice(i, 1); continue; }
      if (!proj(p.lon, p.lat, 0, P)) continue;
      const edge = G.dest(p.lat, p.lon, 90, p.r * 1.852 * f);
      if (!proj(edge[1], edge[0], 0, P2)) continue;
      const rr = Math.hypot(P2.x - P.x, P2.y - P.y);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = `rgba(255,176,0,${0.35 * (1 - f)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.stroke();
    }
  }
  function drawHome() {
    const h = S.home;
    if (!h || h.src !== 'gps') return;
    if (!proj(h.lon, h.lat, 0, P)) return;
    const ph = (Date.now() / 1800) % 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,176,0,' + 0.35 * (1 - ph) + ')';
    ctx.beginPath(); ctx.arc(P.x, P.y, 6 + ph * 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb000'; ctx.strokeStyle = '#0c0f0d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.x, P.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  /* ---------------- labels with greedy collision avoidance ---------------- */
  const occ = new Set();
  function labelMode(n) {
    if (S.labels === 'off') return 0;
    if (S.labels === 'on') return 2;
    return PR.zoom >= 9 || n < 45 ? 2 : PR.zoom >= 7.2 ? 1 : 0;
  }
  function occupied(x, y, w, h) {
    const c = 12;
    for (let gx = Math.floor(x / c); gx <= Math.floor((x + w) / c); gx++)
      for (let gy = Math.floor(y / c); gy <= Math.floor((y + h) / c); gy++) if (occ.has(gx * 4096 + gy)) return true;
    return false;
  }
  function occupy(x, y, w, h) {
    const c = 12;
    for (let gx = Math.floor(x / c); gx <= Math.floor((x + w) / c); gx++)
      for (let gy = Math.floor(y / c); gy <= Math.floor((y + h) / c); gy++) occ.add(gx * 4096 + gy);
  }
  function drawLabels(list, sel, now) {
    const mode = labelMode(list.length);
    occ.clear();
    const light = document.documentElement.dataset.theme === 'light';
    const fg = light ? '#1b1a17' : '#efe9da', sub = light ? '#5b564b' : '#9a9a8e', bg = light ? 'rgba(244,239,226,0.86)' : 'rgba(10,12,11,0.74)';
    ctx.textBaseline = 'top';
    const prio = [];
    if (sel && sel.sx != null) prio.push(sel);
    if (hoverHex) { const h = T.get(hoverHex); if (h && h !== sel && h.sx != null) prio.push(h); }
    for (const ac of list) if (ac.emergency && ac !== sel) prio.push(ac);
    let rest = [];
    if (mode) {
      const cx = W / 2, cy = H / 2;
      rest = list.filter((ac) => ac !== sel && !ac.emergency && ac.hex !== hoverHex);
      if (rest.length > 220) { rest.sort((a, b) => Math.hypot(a.sx - cx, a.sy - cy) - Math.hypot(b.sx - cx, b.sy - cy)); rest.length = 220; }
    }
    let n = 0;
    const draw1 = (ac, full, force) => {
      const name = ac.flight || ac.reg || ac.hex.toUpperCase();
      const l2 = full ? (F.altShort(ac.ralt, ac.gnd) + '  ' + (ac.gs != null ? Math.round(ac.gs) : '')) : '';
      ctx.font = '700 11px "B612 Mono", ui-monospace, monospace';
      const w1 = ctx.measureText(name).width;
      let w = w1;
      if (l2) { ctx.font = '400 10px "B612 Mono", ui-monospace, monospace'; w = Math.max(w, ctx.measureText(l2).width); }
      const hh = l2 ? 27 : 15, pad = 4;
      const x = ac.sx + 13, y = ac.sy - hh / 2 - 9;
      if (!force && occupied(x, y, w + pad * 2, hh)) return;
      occupy(x, y, w + pad * 2, hh);
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, w + pad * 2, hh);
      ctx.fillStyle = ac.emergency ? '#ff3b1f' : SQ.color.css(SQ.color.forAc(ac, S.colorMode).rgb);
      ctx.fillRect(x, y, 2, hh);
      ctx.font = '700 11px "B612 Mono", ui-monospace, monospace';
      ctx.fillStyle = ac.emergency ? '#ff6a4d' : fg;
      ctx.fillText(name, x + pad + 1, y + 2);
      if (l2) { ctx.font = '400 10px "B612 Mono", ui-monospace, monospace'; ctx.fillStyle = sub; ctx.fillText(l2, x + pad + 1, y + 15); }
      n++;
    };
    for (const ac of prio) draw1(ac, true, true);
    for (const ac of rest) draw1(ac, mode === 2, false);
    return n;
  }

  /* ---------------- winds aloft field ---------------- */
  function drawWind(list) {
    const cell = 70, bins = new Map();
    for (const ac of list) {
      if (ac.wd == null || ac.ws == null || ac.gnd) continue;
      const k = Math.floor(ac.sx / cell) * 1000 + Math.floor(ac.sy / cell);
      let b = bins.get(k);
      if (!b) bins.set(k, (b = { u: 0, v: 0, n: 0, x: 0, y: 0, alt: 0 }));
      const to = (ac.wd + 180) * G.RAD;
      b.u += Math.sin(to) * ac.ws; b.v += Math.cos(to) * ac.ws; b.n++; b.x += ac.sx; b.y += ac.sy; b.alt += ac.ralt || 0;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    for (const b of bins.values()) {
      const u = b.u / b.n, v = b.v / b.n, sp = Math.hypot(u, v);
      if (sp < 3) continue;
      const x = b.x / b.n, y = b.y / b.n;
      const ang = Math.atan2(u, v) - PR.bearing * G.RAD;
      const len = U.clamp(8 + sp * 0.28, 10, 46);
      const c = SQ.color.ramp(SQ.color.SPD_STOPS, U.clamp(sp * 3.2, 0, 700));
      ctx.strokeStyle = SQ.color.css(c, 0.75);
      ctx.fillStyle = SQ.color.css(c, 0.75);
      ctx.lineWidth = sp > 90 ? 2.4 : 1.6;
      const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.sin(ang - 0.45) * 6, ey + Math.cos(ang - 0.45) * 6);
      ctx.lineTo(ex - Math.sin(ang + 0.45) * 6, ey + Math.cos(ang + 0.45) * 6);
      ctx.closePath(); ctx.fill();
      if (sp > 60) {
        ctx.font = '400 9px "B612 Mono", monospace';
        ctx.fillText(Math.round(sp) + 'kt', ex + 4, ey - 4);
      }
    }
  }

  /* ---------------- radar scope mode ---------------- */
  const SWEEP = 4200;
  function drawScope(list, now, sel) {
    const cx = W / 2, cy = H / 2, rad = Math.hypot(W, H) / 2;
    const ang = ((now % SWEEP) / SWEEP) * Math.PI * 2;
    const prev = sweepPrev;
    sweepPrev = ang;
    const green = [125, 255, 140];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* rings */
    const mpp = PR.mppK * Math.cos(map.getCenter().lat * G.RAD);
    const nmPx = 1852 / mpp;
    const steps = [5, 10, 25, 50, 100, 200, 400];
    let step = steps.find((s) => s * nmPx > Math.min(W, H) / 9) || 400;
    ctx.strokeStyle = 'rgba(125,255,140,0.16)';
    ctx.fillStyle = 'rgba(125,255,140,0.45)';
    ctx.font = '400 10px "B612 Mono", monospace';
    ctx.lineWidth = 1;
    for (let r = step, i = 1; r * nmPx < rad; r += step, i++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * nmPx, 0, Math.PI * 2); ctx.stroke();
      ctx.fillText(r + 'NM', cx + 4, cy - r * nmPx + 3);
    }
    /* bearing ticks */
    const edge = Math.min(W, H) / 2 - 14;
    for (let d = 0; d < 360; d += 5) {
      const a = (d - PR.bearing) * G.RAD, len = d % 30 === 0 ? 12 : d % 10 === 0 ? 7 : 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * edge, cy - Math.cos(a) * edge);
      ctx.lineTo(cx + Math.sin(a) * (edge - len), cy - Math.cos(a) * (edge - len));
      ctx.stroke();
      if (d % 30 === 0) { ctx.textAlign = 'center'; ctx.fillText(F.pad(d, 3), cx + Math.sin(a) * (edge - 22), cy - Math.cos(a) * (edge - 22) - 5); ctx.textAlign = 'left'; }
    }
    /* sweep wedge */
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(ang - Math.PI / 2 - 0.9, cx, cy);
      g.addColorStop(0, 'rgba(125,255,140,0)');
      g.addColorStop(0.143, 'rgba(125,255,140,0.22)');
      g.addColorStop(0.1435, 'rgba(125,255,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rad, ang - Math.PI / 2 - 0.9, ang - Math.PI / 2); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(160,255,170,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * rad, cy - Math.cos(ang) * rad); ctx.stroke();
    /* blips: painted when the beam passes */
    const crossed = (a) => (prev <= ang ? a > prev && a <= ang : a > prev || a <= ang);
    ctx.textBaseline = 'top';
    for (const ac of list) {
      let a = Math.atan2(ac.sx - cx, -(ac.sy - cy));
      if (a < 0) a += Math.PI * 2;
      if (!ac.blip || crossed(a)) {
        if (ac.blip) { ac.blipH = ac.blipH || []; ac.blipH.unshift([ac.blip.lon, ac.blip.lat]); if (ac.blipH.length > 5) ac.blipH.pop(); }
        ac.blip = { lon: ac.rlon, lat: ac.rlat, alt: ac.ralt, t: now };
      }
      const age = (now - ac.blip.t) / SWEEP, I = U.clamp(1 - age * 0.8, 0.12, 1);
      if (ac.blipH) ac.blipH.forEach((h, i) => {
        if (!proj(h[0], h[1], 0, P2)) return;
        ctx.fillStyle = SQ.color.css(green, I * 0.5 * (1 - i / 5));
        ctx.fillRect(P2.x - 1, P2.y - 1, 2, 2);
      });
      if (!proj(ac.blip.lon, ac.blip.lat, 0, P)) continue;
      const isSel = ac === sel;
      const gr = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 9);
      gr.addColorStop(0, ac.emergency ? `rgba(255,80,40,${I})` : SQ.color.css(green, I));
      gr.addColorStop(1, 'rgba(125,255,140,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(P.x, P.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ac.emergency ? `rgba(255,120,90,${I})` : `rgba(210,255,215,${I})`;
      ctx.fillRect(P.x - 1.5, P.y - 1.5, 3, 3);
      if (PR.zoom > 6.5 || isSel || list.length < 80) {
        ctx.font = (isSel ? '700 ' : '400 ') + '10px "B612 Mono", monospace';
        ctx.fillStyle = SQ.color.css(green, I * 0.85);
        ctx.fillText(ac.flight || ac.hex.toUpperCase(), P.x + 7, P.y - 10);
        ctx.fillText(F.altShort(ac.blip.alt, ac.gnd), P.x + 7, P.y + 1);
      }
      if (isSel) { ctx.strokeStyle = 'rgba(210,255,215,0.9)'; ctx.strokeRect(P.x - 8, P.y - 8, 16, 16); }
      addHit(ac, P.x, P.y, 12);
    }
  }

  /* ---------------- hover tooltip ---------------- */
  function updateTip() {
    if (!tip) return;
    const ac = hoverHex && hoverHex !== T.selected ? T.get(hoverHex) : null;
    if (!ac || ac.sx == null) { if (tip.style.display !== 'none') tip.style.display = 'none'; tip._hex = null; return; }
    if (tip._hex !== ac.hex || (tip._t || 0) < Date.now() - 500) {
      tip._hex = ac.hex; tip._t = Date.now();
      const op = ac.op ? ac.op.name : ac.ownOp || '';
      tip.innerHTML = `<b>${F.esc(ac.flight || ac.reg || ac.hex.toUpperCase())}</b><span>${F.esc(ac.type || '')}</span><i>${F.esc(op)}</i>` +
        `<em>${F.alt(ac.ralt, ac.gnd)} &middot; ${F.spd(ac.gs)}</em>`;
    }
    tip.style.display = 'block';
    const x = Math.min(W - 190, ac.sx + 18), y = Math.max(8, ac.sy - 64);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  R.hover = () => hoverHex;
})();
