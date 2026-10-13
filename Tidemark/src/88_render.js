/* =====================================================================
   Frame orchestration: camera, culling, depth sorting, light, weather.
   ===================================================================== */
function setupCanvas(cv) {
  RV.cv = cv; RV.ctx = cv.getContext('2d');
  RV.light = document.createElement('canvas'); RV.lctx = RV.light.getContext('2d');
  resizeView();
}
function resizeView() {
  const cv = RV.cv; if (!cv) return;
  RV.dpr = Math.min(2, window.devicePixelRatio || 1) * (RV.q === 0 ? 0.75 : 1);
  RV.vw = cv.clientWidth || window.innerWidth; RV.vh = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(RV.vw * RV.dpr); cv.height = Math.round(RV.vh * RV.dpr);
  RV.light.width = Math.ceil(cv.width / 2); RV.light.height = Math.ceil(cv.height / 2);
}
function worldToScreen(wx, wy) { const z = RV.cam.z; return [(wx - RV.cam.x) * z + RV.vw / 2, (wy - RV.cam.y) * z + RV.vh / 2]; }
function screenToWorld(sx, sy) { const z = RV.cam.z; return [(sx - RV.vw / 2) / z + RV.cam.x, (sy - RV.vh / 2) / z + RV.cam.y]; }
function screenToTile(sx, sy) { const [wx, wy] = screenToWorld(sx, sy); return [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2]; }
function centerOnTile(x, y) { const p = P(x, y, 0); RV.cam.x = p[0]; RV.cam.y = p[1]; }
function clampCam(S) {
  const a = P(0, 0, 0), b = P(S.W, S.H, 0), l = P(0, S.H, 0), r = P(S.W, 0, 0);
  RV.cam.x = Math.max(l[0] - 100, Math.min(r[0] + 100, RV.cam.x));
  RV.cam.y = Math.max(a[1] - 150, Math.min(b[1] + 100, RV.cam.y));
  RV.cam.z = Math.max(0.35, Math.min(3.5, RV.cam.z));
}
function ambient(S) {
  const h = (S.tick % TPD + RV.alpha) / TPH;
  let a;
  const N = 0.68;
  if (h < 5) a = N; else if (h < 7) a = N * (7 - h) / 2; else if (h < 18) a = 0; else if (h < 21) a = N * (h - 18) / 3; else a = N;
  const wxa = [0, 0.05, 0.11, 0.05, 0.2][S.wx.k];
  const warm = (h > 5.5 && h < 7.5) || (h > 17.5 && h < 20) ? 0.13 * (1 - Math.abs(((h < 12 ? 6.5 : 18.8) - h)) / 1.3) : 0;
  return { a: Math.min(0.78, a + wxa), warm: Math.max(0, warm) };
}

function renderFrame(S, dt) {
  const c = RV.ctx, dpr = RV.dpr, z = RV.cam.z * dpr;
  RV.lights = []; RV.smoke = []; RV.beam = null; RV.t += dt;
  const night = dusk(S);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = GC.deep; c.fillRect(0, 0, RV.cv.width, RV.cv.height);
  c.setTransform(z, 0, 0, z, RV.vw * dpr / 2 - RV.cam.x * z, RV.vh * dpr / 2 - RV.cam.y * z);
  // visible tile window
  const [w0x, w0y] = screenToWorld(-80, -120), [w1x, w1y] = screenToWorld(RV.vw + 80, RV.vh + 160);
  const vis = (x, y) => { const px = (x - y) * HW, py = (x + y) * HH; return px > w0x - 40 && px < w1x + 40 && py > w0y - 30 && py < w1y + 60; };
  const W = S.W, H = S.H;
  // ground pass, back to front
  for (let s = 0; s <= W + H - 2; s++) {
    const xa = Math.max(0, s - H + 1), xb = Math.min(W - 1, s);
    for (let x = xa; x <= xb; x++) { const y = s - x; if (!vis(x, y)) continue; drawGroundTile(c, S, y * W + x); }
  }
  shadowsPass(c, S, vis);
  // objects
  const objs = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!vis(x, y)) continue;
    const t = y * W + x;
    if (S.tree[t] && !S.bld[t]) objs.push([x + y, 0, 0, t]);
    if ((S.road[t] || S.rail[t]) && isWater(S.ter[t])) objs.push([x + y + 0.45, 3, 0, t]);
    if (S.road[t] || S.pow[t] || S.sig[t]) objs.push([x + y + 0.12, 4, 0, t]);
  }
  for (const b of S.blds) { const cx = b.x + (b.w - 1) / 2, cy = b.y + (b.h - 1) / 2; if (!vis(cx, cy) && !vis(b.x, b.y) && !vis(b.x + b.w - 1, b.y + b.h - 1)) continue; objs.push([b.x + b.y + (b.w + b.h - 2) / 2 + 0.3, 1, b, 0]); }
  RV.vpos.clear();
  for (const v of S.vehs) {
    if (v.k === 'truck' && (v.st === 'depot' || v.st === 'bay')) continue;
    if (v.k === 'train') { const cars = trainCars(S, v); if (!cars.length) continue; const h = cars[0]; if (!vis(h.x, h.y)) continue; objs.push([h.x + h.y + 0.52, 2, v, cars]); continue; }
    let pos;
    if (v.k === 'truck' && v.st === 'yard') { const b = bById(S, v.at); const a = b ? bAcc(S, b) : -1; if (a < 0) continue; const k = b.yard.indexOf(v.id); const ax = a % W, ay = (a / W) | 0, bx = b.x + (b.w - 1) / 2, by = b.y + (b.h - 1) / 2; const f = 0.35 + 0.12 * k; pos = { x: ax + (bx - ax) * f * 0.6 + (k % 2) * 0.2, y: ay + (by - ay) * f * 0.6, ang: Math.atan2(by - ay, bx - ax), tile: a }; }
    else pos = vehPos(S, v);
    if (!vis(pos.x, pos.y)) continue;
    objs.push([pos.x + pos.y + (v.k === 'barge' || v.k === 'freighter' ? 0.3 : 0.52), 2, v, pos]);
  }
  if (RV.q >= 1) for (let i = 0; i < RV.walkers.length; i++) { const w = RV.walkers[i]; const p = walkerPos(S, w); if (vis(p.x, p.y)) objs.push([p.x + p.y + 0.4, 5, w, p]); }
  for (const w of S.wrecks) { const x = w.t % W, y = (w.t / W) | 0; if (vis(x, y) && S.tick - w.tick < 6 * TPH) objs.push([x + y + 0.2, 6, w, 0]); }
  objs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const o of objs) {
    switch (o[1]) {
      case 0: drawTrees(c, S, o[3], o[3] % W, (o[3] / W) | 0); break;
      case 1: { const b = o[2]; const f = DRAWB[b.type]; if (f) f(c, S, b, night); if (RV.sel && RV.sel.b === b.id) selOutline(c, S, b); break; }
      case 2: {
        const v = o[2];
        if (v.k === 'train') { const cars = o[3]; const zt = trainZ(S, v); drawTrain(c, S, v, cars, zt); const sp = worldToScreen(...P(cars[0].x, cars[0].y, zt + 6)); RV.vpos.set(v.id, sp); }
        else { const pos = o[3]; const zz = vehZ(S, v, pos); drawVehicle(c, S, v, pos, zz); RV.vpos.set(v.id, worldToScreen(...P(pos.x, pos.y, zz + 4))); }
        if (RV.sel && RV.sel.v === v.id) { const sp = RV.vpos.get(v.id); if (sp) { const wq = screenToWorld(sp[0], sp[1]); c.strokeStyle = '#f2c14e'; c.lineWidth = 2 / RV.cam.z; c.beginPath(); c.ellipse(wq[0], wq[1] + 4, 14, 8, 0, 0, Math.PI * 2); c.stroke(); } }
        break;
      }
      case 3: drawBridge(c, S, o[3], o[3] % W, (o[3] / W) | 0); break;
      case 4: drawStreetFurniture(c, S, o[3], o[3] % W, (o[3] / W) | 0, night); break;
      case 5: drawWalker(c, o[2], o[3]); break;
      case 6: drawWreck(c, S, o[2]); break;
    }
  }
  updateParticles(S, dt); drawParticles(c);
  if (RV.q >= 1) drawGulls(c, S, dt);
  drawOverlays(c, S);
  c.setTransform(1, 0, 0, 1, 0, 0);
  lightingPass(S);
  if (RV.wxOn) weatherPass(S, dt);
}
function trainZ(S, v) { const t = v.tiles[0]; return isWater(S.ter[t]) ? 4 : 0; }
function vehZ(S, v, pos) {
  const t = pos.tile !== undefined ? pos.tile : v.t;
  if (v.k === 'truck') return isWater(S.ter[t]) ? 4 : 0;
  const ter = S.ter[t];
  return ter === T_SEA ? seaZ(S) : ter === T_LOCK ? lockZ(S, t) : CANAL_Z;
}
function shadowsPass(c, S, vis) {
  if (RV.q < 2) return;
  const amb = ambient(S); if (amb.a > 0.4) return;
  c.fillStyle = 'rgba(40,46,34,0.16)';
  for (const b of S.blds) {
    if (!vis(b.x, b.y)) continue;
    const hgt = b.type === 'house' ? (b.lvl || 1) * 0.35 : b.type === 'lighthouse' ? 1.6 : 0.6;
    const x1 = b.x + b.w - 0.5, y0 = b.y - 0.5, y1 = b.y + b.h - 0.5;
    fillPoly(c, [P(x1, y0, 0), P(x1 + hgt, y0 + hgt * 0.3, 0), P(x1 + hgt, y1 + hgt * 0.3, 0), P(x1, y1, 0)], 'rgba(40,46,34,0.16)');
  }
}
function selOutline(c, S, b) {
  c.setLineDash([4, 3]); strokePoly(c, [P(b.x - 0.5, b.y - 0.5, 0), P(b.x + b.w - 0.5, b.y - 0.5, 0), P(b.x + b.w - 0.5, b.y + b.h - 0.5, 0), P(b.x - 0.5, b.y + b.h - 0.5, 0)], '#f2c14e', 2 / RV.cam.z); c.setLineDash([]);
}
function tileOutline(c, t, W, col, w) { const x = t % W, y = (t / W) | 0; strokePoly(c, tileQ(x, y, 0), col, w / RV.cam.z); }
function drawOverlays(c, S) {
  const W = S.W;
  // network overlays
  if (RV.showNet === 'roads') {
    const rn = roadNet(S), hues = ['#e0794a', '#4aa3e0', '#7ac35a', '#c95ad0', '#e0c84a', '#4ae0c6', '#e04a6e', '#8a7ae0'];
    for (let t = 0; t < W * S.H; t++) if (S.road[t]) { c.globalAlpha = 0.5; fillPoly(c, tileQ(t % W, (t / W) | 0, 1, 0.1), hues[rn.rc[t] % hues.length]); }
    c.globalAlpha = 1;
  } else if (RV.showNet === 'power') {
    const pn = powerNet(S), live = powerLive(S);
    for (let t = 0; t < W * S.H; t++) { if (!S.pow[t] && !S.bld[t]) continue; const on = live.get(pn.pwComp[t]); c.globalAlpha = 0.4; fillPoly(c, tileQ(t % W, (t / W) | 0, 1, 0.05), on ? '#f2d14e' : '#d0503c'); }
    for (const b of S.blds) if (powNeed(S, b, false) > 0 && !b.pwOn) { c.globalAlpha = 0.7; fillPoly(c, tileQ(b.x, b.y, 2, 0.2), '#d0503c'); }
    c.globalAlpha = 1;
  } else if (RV.showNet === 'traffic') {
    const cnt = new Map(); for (const v of S.vehs) if (v.k === 'truck' && v.st === 'go') cnt.set(v.t, (cnt.get(v.t) || 0) + 1 + (v.wt > 20 ? 2 : 0));
    for (const [t, n] of cnt) { c.globalAlpha = Math.min(0.75, 0.2 + n * 0.12); fillPoly(c, tileQ(t % W, (t / W) | 0, 1), n > 3 ? '#d0503c' : n > 1 ? '#e0a03c' : '#7ac35a'); }
    c.globalAlpha = 1;
  } else if (RV.showNet === 'rail') {
    for (let t = 0; t < W * S.H; t++) if (S._rsv && S._rsv[t]) { const v = vById(S, S._rsv[t]); c.globalAlpha = 0.45; fillPoly(c, tileQ(t % W, (t / W) | 0, 1, 0.1), v && v.tiles.indexOf(t) >= 0 ? '#d0503c' : '#58d27a'); }
    c.globalAlpha = 1;
  }
  // selected vehicle: remaining route, reserved block, destination
  if (RV.sel && RV.sel.v) {
    const v = vById(S, RV.sel.v);
    if (v) {
      const start = v.k === 'train' ? v.tiles[0] : v.t;
      const pts = [start].concat(v.path);
      c.setLineDash([5, 4]); c.beginPath();
      pts.forEach((t, i) => { const q = P(t % W, (t / W) | 0, 2); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
      c.strokeStyle = '#f2c14e'; c.lineWidth = 2.2 / RV.cam.z; c.stroke(); c.setLineDash([]);
      if (v.k === 'train') for (let i = 0; i < v.rn; i++) { c.globalAlpha = 0.35; fillPoly(c, tileQ(v.path[i] % W, (v.path[i] / W) | 0, 1, 0.1), '#58d27a'); c.globalAlpha = 1; }
      const job = v.job; const tb = job ? bById(S, job.tgt || (job.ph === 'toA' ? job.a : job.b) || job.q) : null;
      if (tb) selOutline(c, S, tb);
    }
  }
  if (RV.sel && RV.sel.t !== undefined && RV.sel.t >= 0) tileOutline(c, RV.sel.t, W, '#f2c14e', 2);
  if (RV.hoverT >= 0 && RV.tool && RV.tool !== 'inspect') tileOutline(c, RV.hoverT, W, 'rgba(255,255,255,0.6)', 1.2);
  // build preview
  const g = RV.ghost;
  if (g) {
    if (g.tiles) for (const t of g.tiles) { c.globalAlpha = 0.45; fillPoly(c, tileQ(t % W, (t / W) | 0, 1, 0.04), g.ok ? '#7ac35a' : '#d0503c'); }
    if (g.rect) { c.globalAlpha = 0.45; fillPoly(c, [P(g.rect[0] - 0.5, g.rect[1] - 0.5, 1), P(g.rect[0] + g.rect[2] - 0.5, g.rect[1] - 0.5, 1), P(g.rect[0] + g.rect[2] - 0.5, g.rect[1] + g.rect[3] - 0.5, 1), P(g.rect[0] - 0.5, g.rect[1] + g.rect[3] - 0.5, 1)], g.ok ? '#7ac35a' : '#d0503c'); }
    c.globalAlpha = 1;
    if (g.bt && g.ok) { c.globalAlpha = 0.75; const fake = { id: 0, type: g.bt, x: g.rect[0], y: g.rect[1], w: g.rect[2], h: g.rect[3], rot: g.rot, inv: zr(), out: zr(), lvl: 1, res: 0, st: 1, wk: 0, bays: [], yard: [], exp: zr() }; try { DRAWB[g.bt](c, S, fake, false); } catch (e) { /* preview only */ } c.globalAlpha = 1; }
    if (g.label) { const t = g.tiles ? g.tiles[g.tiles.length - 1] : g.rect[1] * W + g.rect[0]; const q = P(t % W, (t / W) | 0, 30); c.font = (12 / RV.cam.z) + 'px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(20,18,16,0.75)'; const tw = c.measureText(g.label).width; c.fillRect(q[0] - tw / 2 - 4 / RV.cam.z, q[1] - 12 / RV.cam.z, tw + 8 / RV.cam.z, 16 / RV.cam.z); c.fillStyle = g.ok ? '#f2efe6' : '#ffb4a6'; c.textAlign = 'center'; c.fillText(g.label, q[0], q[1]); c.textAlign = 'left'; }
  }
}
function lightingPass(S) {
  const amb = ambient(S), c = RV.ctx, cv = RV.cv;
  if (amb.warm > 0) { c.fillStyle = 'rgba(255,150,70,' + amb.warm.toFixed(3) + ')'; c.globalCompositeOperation = 'soft-light'; c.fillRect(0, 0, cv.width, cv.height); c.globalCompositeOperation = 'source-over'; }
  if (amb.a < 0.02) return;
  const L = RV.light, lc = RV.lctx, k = L.width / cv.width;
  lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, L.width, L.height);
  lc.fillStyle = 'rgba(12,20,36,' + amb.a.toFixed(3) + ')'; lc.fillRect(0, 0, L.width, L.height);
  lc.globalCompositeOperation = 'destination-out';
  const zz = RV.cam.z * RV.dpr * k;
  for (const [wp, r, i] of RV.lights) {
    const s = worldToScreen(wp[0], wp[1]), x = s[0] * RV.dpr * k, y = s[1] * RV.dpr * k, rr = r * zz;
    if (x < -rr || y < -rr || x > L.width + rr || y > L.height + rr) continue;
    const g = lc.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(0,0,0,' + Math.min(1, i).toFixed(2) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g; lc.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  if (RV.beam) {
    const s = worldToScreen(RV.beam[0], RV.beam[1]), x = s[0] * RV.dpr * k, y = s[1] * RV.dpr * k, a = RV.t * 0.8;
    lc.beginPath(); lc.moveTo(x, y); lc.arc(x, y, 420 * zz, a, a + 0.18); lc.closePath(); lc.fillStyle = 'rgba(0,0,0,0.35)'; lc.fill();
  }
  c.drawImage(L, 0, 0, cv.width, cv.height);
  // warm glow
  c.globalCompositeOperation = 'lighter';
  const zg = RV.cam.z * RV.dpr;
  for (const [wp, r, i, col] of RV.lights) {
    const s = worldToScreen(wp[0], wp[1]), x = s[0] * RV.dpr, y = s[1] * RV.dpr, rr = r * 0.6 * zg;
    if (x < -rr || y < -rr || x > cv.width + rr || y > cv.height + rr) continue;
    const g = c.createRadialGradient(x, y, 0, x, y, rr);
    const rgb = col === 'g' ? '90,220,120' : col === 'r' ? '240,80,60' : '255,190,110';
    g.addColorStop(0, 'rgba(' + rgb + ',' + (0.42 * i * amb.a / 0.68).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  c.globalCompositeOperation = 'source-over';
}
function weatherPass(S, dt) {
  const c = RV.ctx, cv = RV.cv, k = S.wx.k;
  if (k === W_FOG) {
    const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, 'rgba(226,229,224,0.55)'); g.addColorStop(1, 'rgba(226,229,224,0.25)');
    c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  }
  if (k === W_CLOUD || k === W_RAIN || k === W_STORM) {
    c.fillStyle = 'rgba(60,66,70,' + (k === W_CLOUD ? 0.06 : k === W_RAIN ? 0.12 : 0.2) + ')'; c.fillRect(0, 0, cv.width, cv.height);
  }
  if (k === W_RAIN || k === W_STORM) {
    if (!RV.rain) RV.rain = [];
    const n = (k === W_STORM ? 420 : 220) * (RV.q === 0 ? 0.3 : RV.q === 1 ? 0.6 : 1);
    while (RV.rain.length < n) RV.rain.push([Math.random() * cv.width, Math.random() * cv.height, 0.6 + Math.random() * 0.6]);
    RV.rain.length = Math.floor(n);
    const slant = k === W_STORM ? 0.45 : 0.18, sp = 900 * RV.dpr;
    c.strokeStyle = 'rgba(210,222,230,0.35)'; c.lineWidth = RV.dpr; c.beginPath();
    for (const d of RV.rain) {
      d[1] += sp * d[2] * dt; d[0] += sp * d[2] * dt * slant;
      if (d[1] > cv.height) { d[1] = -10; d[0] = Math.random() * cv.width; } if (d[0] > cv.width) d[0] -= cv.width;
      c.moveTo(d[0], d[1]); c.lineTo(d[0] - 10 * RV.dpr * slant, d[1] - 10 * RV.dpr * d[2]);
    }
    c.stroke();
    if (k === W_STORM) {
      if (!RV.flash && Math.random() < dt * 0.15) RV.flash = 0.6;
      if (RV.flash) { c.fillStyle = 'rgba(240,244,255,' + RV.flash.toFixed(3) + ')'; c.fillRect(0, 0, cv.width, cv.height); RV.flash = Math.max(0, RV.flash - dt * 2.4); }
    }
  } else RV.rain = null;
}
/* hit test: vehicle under a screen point, else building / tile */
function pickAt(S, sx, sy) {
  let best = null, bd = 18;
  for (const [id, p] of RV.vpos) { const d = Math.hypot(p[0] - sx, p[1] - sy); if (d < bd) { bd = d; best = id; } }
  if (best) return { v: best };
  const [fx, fy] = screenToTile(sx, sy);
  // walk forward along the view ray: tall buildings cover tiles in front of their base
  for (let k = 3; k >= 0; k--) {
    const x = Math.round(fx + k * 0.5), y = Math.round(fy + k * 0.5);
    if (!inb(S, x, y)) continue; const t = y * S.W + x;
    if (S.bld[t]) { const b = bById(S, S.bld[t]); if (b) { const hp = b.type === 'house' ? (b.lvl || 1) * 14 + 12 : 40; const base = worldToScreen(...P(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2, 0)); if (sy > base[1] - hp * RV.cam.z - 10 && sy < base[1] + 20 * RV.cam.z) return { b: b.id }; } }
  }
  const x = Math.round(fx), y = Math.round(fy);
  if (inb(S, x, y)) { const t = y * S.W + x; if (S.bld[t]) return { b: S.bld[t] }; const lk = lockAt(S, t); if (lk) return { l: lk.id, t }; return { t }; }
  return null;
}
