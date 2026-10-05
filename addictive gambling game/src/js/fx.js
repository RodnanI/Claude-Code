/* ============================================================
   fx.js : board-space particles / floating text / rings / bolts,
   trauma screen-shake, hit-stop, slow-mo, and the full-screen
   overlay (confetti, coin + spark streams that fly to the HUD).
   ============================================================ */
const FX = (() => {
  const P = [], T = [], R = [], L = [];
  const MAXP = 1600;
  let trauma = 0, time = 0, hitstop = 0, slowS = 1, slowT = 0;
  const settings = { shake: 1, flash: 1 };

  function add(p) { if (P.length < MAXP) P.push(p); }
  function sparks(x, y, n, color, sp = 170, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + rand(-(o.spread || 1), o.spread || 1) : rand(TAU), s = sp * rand(0.35, 1);
      add({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.18, 0.42) * (o.life || 1), size: o.size || rand(0.8, 1.6), color, g: o.g == null ? 300 : o.g, drag: 2.2 });
    }
  }
  function dots(x, y, n, color, sp = 90, size = 6, life = 0.5) {
    for (let i = 0; i < n; i++) { const a = rand(TAU), s = sp * rand(0.2, 1); add({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: life * rand(0.6, 1.2), size: size * rand(0.6, 1.3), color, g: 0, drag: 3 }); }
  }
  function embers(x, y, n, color = '#ff8a2a') {
    for (let i = 0; i < n; i++) add({ k: 'dot', x: x + rand(-6, 6), y: y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-90, -30), life: 0, max: rand(0.4, 0.9), size: rand(3, 6), color, g: -40, drag: 1.2, flick: 1 });
  }
  function stars(x, y, n, color = '#fff3c0', sp = 120) {
    for (let i = 0; i < n; i++) { const a = rand(TAU), s = sp * rand(0.3, 1); add({ k: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.4, 0.8), size: rand(5, 10), color, g: 60, drag: 2, rot: rand(TAU), vr: rand(-6, 6) }); }
  }
  function coins(x, y, n, sp = 160) {
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rand(-1.1, 1.1), s = sp * rand(0.5, 1.1); add({ k: 'coin', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.7, 1.1), size: rand(4, 6), g: 520, drag: 0.6, rot: rand(TAU), vr: rand(8, 16) }); }
  }
  function shards(x, y, n, color = '#bff8ee', sp = 180) {
    for (let i = 0; i < n; i++) { const a = rand(TAU), s = sp * rand(0.3, 1); add({ k: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.5, 0.9), size: rand(2, 4.5), color, g: 500, drag: 1, rot: rand(TAU), vr: rand(-14, 14) }); }
  }
  function smoke(x, y, n, color = '90,80,70') {
    for (let i = 0; i < n; i++) add({ k: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-50, -10), life: 0, max: rand(0.6, 1.2), size: rand(8, 16), color, g: -20, drag: 1.5 });
  }
  function leaves(x, y, n) {
    for (let i = 0; i < n; i++) { const a = rand(TAU), s = rand(40, 120); add({ k: 'leaf', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rand(0.6, 1), size: rand(2.5, 4), color: pickR(['#7dd66a', '#4cb84a', '#a8f07a']), g: 160, drag: 2, rot: rand(TAU), vr: rand(-10, 10) }); }
  }
  function ring(x, y, color, r0, r1, dur = 0.35, w = 2) { if (R.length < 120) R.push({ x, y, color, r0, r1, t: 0, dur, w }); }
  function text(x, y, s, color = '#fff3d6', size = 12, o = {}) {
    if (T.length > 80) T.shift();
    T.push({ x, y, s, color, size, t: -(o.delay || 0), dur: o.dur || 0.75, rise: o.rise == null ? 34 : o.rise, pop: o.pop || 1, box: o.box || null, wob: o.wob || 0 });
  }
  function bolt(x1, y1, x2, y2, color = '#ffe84a') {
    const pts = [[x1, y1]], n = 7, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const t = i / n, off = rand(-1, 1) * len * 0.12 * Math.sin(t * Math.PI); pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]); }
    pts.push([x2, y2]);
    L.push({ pts, t: 0, dur: 0.32, color });
  }
  function shake(a) { trauma = Math.min(1, trauma + a); }
  function stop(s) { hitstop = Math.max(hitstop, s); }
  function slowmo(s, d) { slowS = s; slowT = Math.max(slowT, d); }
  function timeScale() { return hitstop > 0 ? 0 : slowT > 0 ? slowS : 1; }
  function shakeOffset() {
    const k = trauma * trauma * settings.shake;
    return { x: noise1(time * 28, 1) * 9 * k, y: noise1(time * 28, 7) * 9 * k, r: noise1(time * 22, 3) * 0.012 * k };
  }
  function update(dtReal, dt) {
    time += dtReal;
    trauma = Math.max(0, trauma - dtReal * 1.5);
    if (hitstop > 0) hitstop -= dtReal;
    if (slowT > 0) slowT -= dtReal;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      if (p.life >= p.max) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = T.length - 1; i >= 0; i--) { const t = T[i]; t.t += dt; if (t.t >= t.dur) T.splice(i, 1); }
    for (let i = R.length - 1; i >= 0; i--) { const r = R[i]; r.t += dt; if (r.t >= r.dur) R.splice(i, 1); }
    for (let i = L.length - 1; i >= 0; i--) { const l = L[i]; l.t += dt; if (l.t >= l.dur) L.splice(i, 1); }
  }
  function draw(x) {
    x.save();
    // additive pass
    x.globalCompositeOperation = 'lighter';
    for (const p of P) {
      const a = 1 - p.life / p.max;
      if (p.k === 'spark') {
        x.globalAlpha = a; x.strokeStyle = p.color; x.lineWidth = p.size; x.lineCap = 'round';
        x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); x.stroke();
      } else if (p.k === 'dot') {
        x.globalAlpha = a * (p.flick ? 0.6 + Math.random() * 0.4 : 1); const s = p.size * (0.6 + a * 0.6);
        x.drawImage(Art.glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.k === 'star') {
        x.globalAlpha = a; const s = p.size * (0.5 + a * 0.7);
        x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.drawImage(Art.twinkle(p.color), -s, -s, s * 2, s * 2); x.restore();
      }
    }
    for (const r of R) {
      const t = r.t / r.dur, rr = lerp(r.r0, r.r1, Ease.outCubic(t));
      x.globalAlpha = (1 - t) * 0.9; x.strokeStyle = r.color; x.lineWidth = r.w * (1 - t * 0.6);
      x.beginPath(); x.arc(r.x, r.y, rr, 0, TAU); x.stroke();
    }
    for (const l of L) {
      const a = (1 - l.t / l.dur) * (0.6 + Math.random() * 0.4);
      x.globalAlpha = a * 0.5; x.strokeStyle = l.color; x.lineWidth = 5; x.lineJoin = 'round';
      x.beginPath(); l.pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
      x.globalAlpha = a; x.strokeStyle = '#fffbe8'; x.lineWidth = 1.4; x.stroke();
    }
    // normal pass
    x.globalCompositeOperation = 'source-over';
    for (const p of P) {
      const a = 1 - p.life / p.max;
      if (p.k === 'coin') {
        x.globalAlpha = Math.min(1, a * 2); x.save(); x.translate(p.x, p.y); x.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1);
        x.drawImage(Art.coin(), -p.size, -p.size, p.size * 2, p.size * 2); x.restore();
      } else if (p.k === 'shard') {
        x.globalAlpha = a; x.fillStyle = p.color; x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
        x.beginPath(); x.moveTo(0, -p.size); x.lineTo(p.size * 0.7, p.size * 0.6); x.lineTo(-p.size * 0.6, p.size * 0.4); x.closePath(); x.fill(); x.restore();
      } else if (p.k === 'smoke') {
        x.globalAlpha = a * 0.35; x.fillStyle = `rgb(${p.color})`; x.beginPath(); x.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, TAU); x.fill();
      } else if (p.k === 'leaf') {
        x.globalAlpha = a; x.fillStyle = p.color; x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.beginPath(); x.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU); x.fill(); x.restore();
      }
    }
    // floating text
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    for (const t of T) {
      if (t.t < 0) continue;
      const k = t.t / t.dur, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const sc = t.pop * (k < 0.18 ? Ease.outBack(k / 0.18) : 1);
      const y = t.y - t.rise * Ease.outCubic(k);
      x.globalAlpha = a; x.save(); x.translate(t.x + (t.wob ? Math.sin(t.t * 30) * t.wob * (1 - k) : 0), y); x.scale(sc, sc);
      x.font = `${t.size}px Bungee, Impact, sans-serif`;
      if (t.box) {
        const w = x.measureText(t.s).width + t.size * 0.8, h = t.size * 1.35;
        Art.rrect(x, -w / 2, -h / 2, w, h, h * 0.3); x.fillStyle = t.box; x.fill();
        x.strokeStyle = 'rgba(20,8,4,.85)'; x.lineWidth = 1.5; x.stroke();
        x.fillStyle = t.color; x.fillText(t.s, 0, t.size * 0.06);
      } else {
        x.strokeStyle = 'rgba(18,8,4,.92)'; x.lineWidth = Math.max(2, t.size * 0.24); x.strokeText(t.s, 0, 0);
        x.fillStyle = t.color; x.fillText(t.s, 0, 0);
      }
      x.restore();
    }
    x.restore();
  }
  function clear() { P.length = 0; T.length = 0; R.length = 0; L.length = 0; }

  /* ---------------- overlay (screen space) ---------------- */
  const OV = { cv: null, x: null, dpr: 1, conf: [], streams: [], dots: [] };
  function ovInit(cv) { OV.cv = cv; OV.x = cv.getContext('2d'); ovResize(); }
  function ovResize() {
    if (!OV.cv) return;
    OV.dpr = Math.min(window.devicePixelRatio || 1, 2);
    OV.cv.width = Math.floor(innerWidth * OV.dpr); OV.cv.height = Math.floor(innerHeight * OV.dpr);
    OV.cv.style.width = innerWidth + 'px'; OV.cv.style.height = innerHeight + 'px';
  }
  const CONF_COL = ['#f4e6c4', '#ff563a', '#ffc23a', '#27c4b0', '#5ed16a', '#ff8a3a', '#ffffff'];
  function confetti(n = 120, x0, y0) {
    for (let i = 0; i < n; i++) {
      const fromTop = x0 == null;
      const x = fromTop ? rand(innerWidth) : x0, y = fromTop ? rand(-innerHeight * 0.3, -10) : y0;
      const a = fromTop ? Math.PI / 2 : -Math.PI / 2 + rand(-1.2, 1.2), s = fromTop ? rand(30, 120) : rand(250, 700);
      OV.conf.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: rand(6, 11), h: rand(3, 6), rot: rand(TAU), vr: rand(-8, 8), ph: rand(TAU), vp: rand(6, 14), color: pickR(CONF_COL), life: 0, max: rand(2.6, 4.2) });
    }
  }
  function stream(x0, y0, x1, y1, n, color, onArrive, o = {}) {
    let first = true;
    for (let i = 0; i < n; i++) {
      const mx = (x0 + x1) / 2 + rand(-120, 120), my = Math.min(y0, y1) - rand(40, 160);
      OV.streams.push({ x0: x0 + rand(-10, 10), y0: y0 + rand(-10, 10), x1, y1, cx: mx, cy: my, t: -i * (o.gap || 0.025), dur: o.dur || rand(0.5, 0.75), color, size: o.size || rand(5, 9), cb: null, coin: !!o.coin });
    }
    if (onArrive) { const last = OV.streams[OV.streams.length - n]; if (last && first) last.cb = onArrive; }
  }
  function screenBurst(x, y, n, color, sp = 260) {
    for (let i = 0; i < n; i++) { const a = rand(TAU), s = sp * rand(0.3, 1); OV.dots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.3, 0.6), size: rand(6, 14), color }); }
  }
  function ovUpdate(dt) {
    for (let i = OV.conf.length - 1; i >= 0; i--) {
      const c = OV.conf[i]; c.life += dt;
      if (c.life > c.max || c.y > innerHeight + 40) { OV.conf.splice(i, 1); continue; }
      c.vy += 420 * dt; c.vx *= Math.exp(-1.6 * dt); c.vy *= Math.exp(-1.9 * dt);
      c.x += (c.vx + Math.sin(c.ph) * 40) * dt; c.y += c.vy * dt; c.rot += c.vr * dt; c.ph += c.vp * dt;
    }
    for (let i = OV.streams.length - 1; i >= 0; i--) {
      const s = OV.streams[i]; s.t += dt / s.dur;
      if (s.t >= 1) { if (s.cb) s.cb(); OV.streams.splice(i, 1); }
    }
    for (let i = OV.dots.length - 1; i >= 0; i--) {
      const d = OV.dots[i]; d.life += dt; if (d.life > d.max) { OV.dots.splice(i, 1); continue; }
      d.vx *= Math.exp(-3 * dt); d.vy *= Math.exp(-3 * dt); d.x += d.vx * dt; d.y += d.vy * dt;
    }
  }
  function ovDraw() {
    const x = OV.x; if (!x) return;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, OV.cv.width, OV.cv.height);
    if (!OV.conf.length && !OV.streams.length && !OV.dots.length) return;
    x.setTransform(OV.dpr, 0, 0, OV.dpr, 0, 0);
    for (const c of OV.conf) {
      x.save(); x.translate(c.x, c.y); x.rotate(c.rot); x.scale(1, Math.cos(c.ph));
      x.globalAlpha = Math.min(1, (c.max - c.life) * 2); x.fillStyle = c.color; x.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); x.restore();
    }
    x.globalCompositeOperation = 'lighter';
    for (const s of OV.streams) {
      if (s.t < 0) continue;
      const t = Ease.inOutCubic(Math.min(1, s.t)), it = 1 - t;
      const px = it * it * s.x0 + 2 * it * t * s.cx + t * t * s.x1, py = it * it * s.y0 + 2 * it * t * s.cy + t * t * s.y1;
      x.globalAlpha = 1;
      const sz = s.size * (1 - t * 0.4);
      if (s.coin) { x.globalCompositeOperation = 'source-over'; x.drawImage(Art.coin(), px - sz, py - sz, sz * 2, sz * 2); x.globalCompositeOperation = 'lighter'; }
      else x.drawImage(Art.glow(s.color), px - sz * 2, py - sz * 2, sz * 4, sz * 4);
    }
    for (const d of OV.dots) { x.globalAlpha = 1 - d.life / d.max; x.drawImage(Art.glow(d.color), d.x - d.size, d.y - d.size, d.size * 2, d.size * 2); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
  return {
    settings, sparks, dots, embers, stars, coins, shards, smoke, leaves, ring, text, bolt, shake, stop, slowmo, timeScale, shakeOffset, update, draw, clear,
    ovInit, ovResize, confetti, stream, screenBurst, ovUpdate, ovDraw,
    get count() { return P.length; },
  };
})();
