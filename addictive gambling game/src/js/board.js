/* ============================================================
   board.js : pin grid geometry, ball physics (fixed step),
   cabinet / felt / pin / ball / launcher rendering, bulbs,
   targeting overlays and the fog-of-war boss effect.
   ============================================================ */
const ROWS = 13, Y0 = 100, SY = 40, X0 = 23, SX = (520 - 2 * 23) / 9;
const BALL_R = 8, LAND_Y = 678, LAUNCH_Y = 30, GRAV = 1350;

const Board = (() => {
  const B = {
    cv: null, x: null, dpr: 1, scale: 1, cssW: 0, cssH: 0,
    slots: [], rowSlots: [], fx: [], pins: null, pockets: null, balls: [], hot: [], hotGold: false,
    pocketLight: new Array(NPOCK).fill(0), pocketBonus: 0,
    launcher: { x: BW / 2, tx: BW / 2, open: 0, recoil: 0, load: 1, show: true },
    nextBall: 'steel', aim: true,
    bg: null, frame: null, bgDirty: true, frameDirty: true, pinLayer: null, pinsDirty: true,
    pick: null, hover: -1, hoverPocket: -1,
    fog: false, fever: 0, wind: 0, gravK: 1, magnetK: 1, magnets: [], drag: 3, restK: 0.65,
    bulbMode: 'idle', bulbT: 0, t: 0,
    cb: {}, ballId: 0, fogC: null,
  };

  function buildSlots() {
    B.slots = []; B.rowSlots = [];
    for (let r = 0; r < ROWS; r++) {
      const even = r % 2 === 0, n = even ? 10 : 9, row = [];
      for (let c = 0; c < n; c++) {
        row.push(B.slots.length);
        B.slots.push({ x: even ? X0 + c * SX : X0 + SX / 2 + c * SX, y: Y0 + r * SY, r, c });
      }
      B.rowSlots.push(row);
    }
    B.fx = B.slots.map(() => ({ fl: 0, sq: 0, off: 0, face: 1, flip: 0, grow: 0 }));
  }
  buildSlots();

  function init(cv) { B.cv = cv; B.x = cv.getContext('2d'); B.fogC = Art.mk(BW / 4, BH / 4); }
  function resize(cssW, cssH) {
    B.dpr = Math.min(window.devicePixelRatio || 1, 2);
    B.cssW = cssW; B.cssH = cssH; B.scale = cssW / CW;
    B.cv.style.width = cssW + 'px'; B.cv.style.height = cssH + 'px';
    B.cv.width = Math.round(cssW * B.dpr); B.cv.height = Math.round(cssH * B.dpr);
    B.bgDirty = true; B.frameDirty = true; B.pinsDirty = true;
  }
  function setPins(pins) { B.pins = pins; refresh(); }
  function setPockets(p) { B.pockets = p; B.bgDirty = true; }
  function refresh() {
    B.bgDirty = true; B.pinsDirty = true;
    B.magnets = [];
    if (!B.pins) return;
    B.pins.forEach((p, i) => { if (p && p.t === 'magnet') B.magnets.push({ x: B.slots[i].x, y: B.slots[i].y, R: 78, k: 1500 * (1 + (p.l - 1) * 0.5) }); });
  }
  function rebuild() {
    const s = B.scale * B.dpr;
    if (B.frameDirty) { B.frame = Art.frame(s); B.frameDirty = false; }
    B.bg = Art.boardBG(s, B.pockets, { bonus: B.pocketBonus }); B.bgDirty = false;
  }

  /* ---------------- balls ---------------- */
  function spawn(x, y, type, o = {}) {
    const def = BALLS[type] || BALLS.steel;
    const b = {
      id: ++B.ballId, x, y, vx: o.vx == null ? rand(-6, 6) : o.vx, vy: o.vy || 0, r: o.r || BALL_R, type,
      rest: def.rest || 0.52, grav: def.grav || 1,
      points: 0, mult: 1, hits: 0, special: 0, cool: new Map(), once: new Set(), lastSpecial: -1,
      trail: [], age: 0, still: 0, kicks: 0, warpT: 0, warped: false, wallT: 0,
      bonus: !!o.bonus, clone: !!o.clone, gen: o.gen || 0, first: false, last: false,
      alive: true, demo: !!o.demo, noPins: false, looped: false, kegs: 0, bombed: false, echoFirst: false, kindle: false,
    };
    B.balls.push(b);
    return b;
  }
  function ballsAlive() { let n = 0; for (const b of B.balls) if (b.alive) n++; return n; }

  function step(dt) {
    const G = GRAV * B.gravK;
    for (const b of B.balls) {
      if (!b.alive) continue;
      if (b.warpT > 0) {
        b.warpT -= dt;
        if (b.warpT <= 0) { b.x = rand(40, BW - 40); b.y = 36; b.vx = rand(-40, 40); b.vy = 20; b.trail.length = 0; b.cool.clear(); B.cb.warped && B.cb.warped(b); }
        continue;
      }
      b.age += dt; b.wallT -= dt;
      b.vy += G * b.grav * dt;
      b.vx += B.wind * dt;
      if (B.drag) b.vx *= Math.exp(-B.drag * dt);
      for (const m of B.magnets) {
        const dx = m.x - b.x, dy = m.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < m.R * m.R && d2 > 4) { const d = Math.sqrt(d2), f = m.k * B.magnetK * (1 - d / m.R); b.vx += (dx / d) * f * dt; b.vy += (dy / d) * f * dt; }
      }
      const sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 > 1300 * 1300) { const k = 1300 / Math.sqrt(sp2); b.vx *= k; b.vy *= k; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; if (b.vx < 0) { b.vx = -b.vx * 0.55; wall(b); } }
      else if (b.x > BW - b.r) { b.x = BW - b.r; if (b.vx > 0) { b.vx = -b.vx * 0.55; wall(b); } }
      if (b.y < b.r) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * 0.4; }
      if (!b.noPins && b.y > Y0 - 30 && b.y < Y0 + (ROWS - 1) * SY + 30) {
        const r0 = Math.max(0, Math.floor((b.y - Y0 - 24) / SY)), r1 = Math.min(ROWS - 1, Math.ceil((b.y - Y0 + 24) / SY));
        for (let r = r0; r <= r1; r++) { const row = B.rowSlots[r]; for (let i = 0; i < row.length; i++) collidePin(b, row[i]); }
      }
      if (b.y + b.r > DIV_TOP - 3) { const k = Math.round(b.x / PW); if (k >= 1 && k < NPOCK) collideDiv(b, k * PW); }
      if (sp2 < 900) {
        b.still += dt;
        if (b.still > 0.6) {
          b.still = 0; b.kicks++;
          const edge = b.x < 40 || b.x > BW - 40;
          b.vx += (edge ? Math.sign(BW / 2 - b.x) * rand(90, 170) : rand(-110, 110)); b.vy -= 70;
          if (b.kicks > 5) b.noPins = true;
        }
      } else b.still = 0;
      if (b.age > 30) b.noPins = true;
      if (b.y > LAND_Y) {
        const p = clamp(Math.floor(b.x / PW), 0, NPOCK - 1);
        b.alive = false;
        if (B.cb.land) B.cb.land(b, p);
      }
    }
    const bs = B.balls;
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i]; if (!a.alive || a.warpT > 0) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const c = bs[j]; if (!c.alive || c.warpT > 0) continue;
        const dx = c.x - a.x, dy = c.y - a.y, rr = a.r + c.r, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-4) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (rr - d) / 2;
          a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
          const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rv < 0) { const jj = (-(1 + 0.7) * rv) / 2; a.vx -= jj * nx; a.vy -= jj * ny; c.vx += jj * nx; c.vy += jj * ny; }
        }
      }
    }
    for (let i = bs.length - 1; i >= 0; i--) if (!bs[i].alive) bs.splice(i, 1);
  }
  function wall(b) { if (b.wallT <= 0) { b.wallT = 0.18; B.cb.wall && B.cb.wall(b); } }
  function collidePin(b, si) {
    const pin = B.pins[si];
    if (!pin) return;
    const s = B.slots[si], pr = PINS[pin.t].r;
    const dx = b.x - s.x, dy = b.y - s.y, rr = b.r + pr, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 < 1e-6) return;
    if (b.type === 'ghost' && pin.t === 'basic') {
      const last = b.cool.get(si);
      if (last === undefined || B.t - last > 0.35) { b.cool.set(si, B.t); B.cb.hit && B.cb.hit(b, si, 200); }
      return;
    }
    const d = Math.sqrt(d2);
    let nx = dx / d, ny = dy / d;
    b.x = s.x + nx * rr; b.y = s.y + ny * rr;
    const j = (Math.random() - 0.5) * 0.14, cs = Math.cos(j), sn = Math.sin(j), tx = nx * cs - ny * sn;
    ny = nx * sn + ny * cs; nx = tx;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    const bump = pin.t === 'bumper';
    const e = bump ? 0.9 : b.rest * B.restK;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    const tvx = -ny, tvy = nx, vt = b.vx * tvx + b.vy * tvy;
    b.vx -= vt * tvx * 0.05; b.vy -= vt * tvy * 0.05;
    if (bump) { b.vx += nx * 320; b.vy += ny * 320; B.fx[si].sq = 1; }
    const imp = -vn;
    if (imp > 30 || bump) {
      const last = b.cool.get(si);
      if (last === undefined || B.t - last > 0.12) { b.cool.set(si, B.t); B.cb.hit && B.cb.hit(b, si, imp); }
    }
  }
  function collideDiv(b, px) {
    const cy = clamp(b.y, DIV_TOP, BH), dx = b.x - px, dy = b.y - cy, rr = b.r + 2.4, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 < 1e-6) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    b.x = px + nx * rr; b.y = cy + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= 1.45 * vn * nx; b.vy -= 1.45 * vn * ny;
      if (ny < -0.85) b.vx += rand(-40, 40);
      if (-vn > 50 && B.cb.divider) B.cb.divider(b, px);
    }
  }

  /* ---------------- per frame ---------------- */
  function update(dt, dtReal) {
    B.t += dt; B.bulbT += dtReal;
    for (const f of B.fx) {
      if (f.fl > 0) f.fl = Math.max(0, f.fl - dt * 3.2);
      if (f.sq > 0) f.sq = Math.max(0, f.sq - dt * 6);
      if (f.off > 0) { f.off = Math.max(0, f.off - dt); if (!f.off) B.pinsDirty = true; }
      if (f.flip > 0) { f.flip = Math.max(0, f.flip - dt * 1.6); if (!f.flip) B.pinsDirty = true; }
    }
    for (let i = 0; i < NPOCK; i++) if (B.pocketLight[i] > 0) B.pocketLight[i] = Math.max(0, B.pocketLight[i] - dt * 1.6);
    for (const b of B.balls) {
      if (!b.alive || b.warpT > 0) continue;
      b.trail.push([b.x, b.y]); if (b.trail.length > 11) b.trail.shift();
      if (b.type === 'comet' && Math.random() < 0.7) FX.embers(b.x, b.y, 1, '#ff8a2a');
    }
    const L = B.launcher;
    L.x = damp(L.x, L.tx, 20, dtReal);
    L.open = Math.max(0, L.open - dtReal * 4);
    L.recoil = Math.max(0, L.recoil - dtReal * 5);
    L.load = Math.min(1, L.load + dtReal * 3.2);
    for (const si of B.hot) if (B.pins && B.pins[si] && Math.random() < dt * 14) FX.embers(B.slots[si].x, B.slots[si].y - 3, 1, B.hotGold ? '#ffd84a' : '#ff7a1c');
    if (B.fever > 0 && Math.random() < dt * 30) FX.stars(rand(BW), rand(80, DIV_TOP), 1, pickR(['#ffd84a', '#ff8a3a', '#fff3c0']), 40);
  }

  function render() {
    const x = B.x;
    if (!x || !B.cssW) return;
    if (B.bgDirty || B.frameDirty || !B.bg) rebuild();
    const s = B.scale * B.dpr;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, B.cv.width, B.cv.height);
    const sh = FX.shakeOffset();
    x.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);
    if (sh.r) { x.translate(CW / 2, CH / 2); x.rotate(sh.r); x.translate(-CW / 2, -CH / 2); }
    x.drawImage(B.frame, 0, 0, CW, CH);
    drawBulbs(x);
    x.save(); x.translate(FR, FR);
    x.beginPath(); x.rect(0, 0, BW, BH); x.clip();
    x.drawImage(B.bg, 0, 0, BW, BH);
    if (B.fever > 0) drawFever(x);
    drawPocketLights(x);
    drawPins(x);
    drawHot(x);
    drawBalls(x);
    FX.draw(x);
    drawLauncher(x);
    if (B.pick) drawPick(x);
    if (B.fog) drawFog(x);
    x.restore();
  }

  function drawBulbs(x) {
    const t = B.bulbT, n = Art.BULBS.length, m = B.bulbMode;
    for (let i = 0; i < n; i++) {
      let on = 0, col = '#ffe6a8';
      if (m === 'idle') on = (i + Math.floor(t * 7)) % 5 === 0 ? 1 : 0;
      else if (m === 'play') on = (i + Math.floor(t * 12)) % 4 < 1 ? 1 : 0;
      else if (m === 'win') { on = Math.floor(t * 8) % 2 === i % 2 ? 1 : 0; col = i % 2 ? '#ffd84a' : '#fff3d6'; }
      else if (m === 'reach') { on = Math.floor(t * 14) % 2 === i % 2 ? 1 : 0; col = i % 2 ? '#ff4a2a' : '#ffd84a'; }
      else if (m === 'fever') { on = 0.55 + 0.45 * Math.sin(t * 16 + i * 0.6); col = ['#ffd84a', '#ff6a3d', '#fff0c8'][(i + Math.floor(t * 10)) % 3]; }
      else if (m === 'fail') on = i / n > Math.min(1, t * 0.9) ? 0.7 : 0;
      if (on <= 0.3) continue;
      const b = Art.BULBS[i];
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = on * 0.75;
      x.drawImage(Art.glow(col), b.x - 17, b.y - 17, 34, 34);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = on;
      x.drawImage(Art.bulb(col), b.x - 3.6, b.y - 3.6, 7.2, 7.2);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  function drawFever(x) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.16 * B.fever;
    x.translate(BW / 2, 250); x.rotate(B.t * 0.35);
    for (let i = 0; i < 16; i++) { x.rotate(TAU / 16); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 900, -0.09, 0.09); x.closePath(); x.fillStyle = i % 2 ? '#ffb43a' : '#ff5a2a'; x.fill(); }
    x.restore();
  }
  function drawPocketLights(x) {
    if (!B.pockets) return;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NPOCK; i++) {
      const l = B.pocketLight[i] + (B.fever > 0 ? 0.25 + 0.2 * Math.sin(B.t * 10 + i) : 0);
      if (l <= 0) continue;
      const cx = i * PW + PW / 2, col = B.pockets[i].fever ? '#ff4a2a' : '#ffcf4a';
      x.globalAlpha = Math.min(1, l);
      x.drawImage(Art.glow(col), cx - PW * 0.9, DIV_TOP - 20, PW * 1.8, BH - DIV_TOP + 50);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  function sproutStage(g) { return Math.min(4, Math.floor(Math.log2(Math.max(1, g)) / 1.4)); }
  function pinSprite(p, f) {
    const r = PINS[p.t].r;
    return p.t === 'dice' ? Art.diceSprite(f.face || 1, r) : p.t === 'sprout' ? Art.pin('sprout', r, sproutStage(p.g || 1)) : Art.pin(p.t, r);
  }
  function rebuildPins() {
    const s = B.scale * B.dpr, w = Math.max(1, Math.round(BW * s)), h = Math.max(1, Math.round(BH * s));
    if (!B.pinLayer || B.pinLayer.width !== w || B.pinLayer.height !== h) B.pinLayer = Art.mk(w, h);
    const x = B.pinLayer.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); x.setTransform(s, 0, 0, s, 0, 0);
    B.pinsDirty = false;
    const pins = B.pins;
    if (!pins) return;
    const sh = Art.shadow();
    x.globalAlpha = 0.6;
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i]; if (!p || B.fx[i].flip > 0) continue;
      const sl = B.slots[i], r = PINS[p.t].r;
      x.drawImage(sh, sl.x - r * 1.45 + 1.8, sl.y - r * 1.45 + 2.8, r * 2.9, r * 2.9);
    }
    x.globalAlpha = 1;
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i], sl = B.slots[i];
      if (!p) { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.arc(sl.x, sl.y, 2, 0, TAU); x.fill(); x.fillStyle = 'rgba(240,210,140,.12)'; x.beginPath(); x.arc(sl.x + 0.5, sl.y + 0.6, 2, 0, TAU); x.fill(); continue; }
      const f = B.fx[i];
      if (f.flip > 0) continue;
      const spr = pinSprite(p, f), r = PINS[p.t].r;
      x.globalAlpha = f.off > 0 ? 0.3 : 1;
      x.drawImage(spr, sl.x - spr.size / 2, sl.y - spr.size / 2, spr.size, spr.size);
      x.globalAlpha = 1;
      if (p.l > 1) {
        x.fillStyle = '#ffd84a'; x.strokeStyle = '#3a2506'; x.lineWidth = 0.6;
        const n = p.l, wd = (n - 1) * 3.4;
        for (let k = 0; k < n; k++) { x.beginPath(); x.arc(sl.x - wd / 2 + k * 3.4, sl.y + r + 3.4, 1.35, 0, TAU); x.fill(); x.stroke(); }
      }
    }
  }
  function drawPins(x) {
    const pins = B.pins;
    if (!pins) return;
    if (B.pinsDirty || !B.pinLayer) rebuildPins();
    x.drawImage(B.pinLayer, 0, 0, BW, BH);
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i]; if (!p) continue;
      const f = B.fx[i], anim = f.sq > 0 || f.flip > 0;
      if (!anim && f.fl <= 0 && p.t !== 'warp' && p.t !== 'bomb') continue;
      const s = B.slots[i], r = PINS[p.t].r;
      if (anim) {
        const spr = pinSprite(p, f), sc = 1 + f.sq * (p.t === 'bumper' ? 0.22 : 0.42), size = spr.size * sc;
        x.save(); x.translate(s.x, s.y);
        if (f.flip > 0) x.scale(Math.cos(f.flip * Math.PI * 7) || 0.05, 1);
        if (f.off > 0) x.globalAlpha = 0.3;
        x.drawImage(spr, -size / 2, -size / 2, size, size);
        x.restore();
      }
      if (p.t === 'warp') {
        x.save(); x.translate(s.x, s.y); x.rotate(B.t * 4); x.strokeStyle = 'rgba(160,255,240,.85)'; x.lineWidth = 1.1;
        for (let k = 0; k < 3; k++) { x.rotate(TAU / 3); x.beginPath(); x.arc(r * 0.18, 0, r * 0.45, 0.2, 2.2); x.stroke(); }
        x.restore();
      }
      if (p.t === 'bomb' && f.off <= 0) {
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6 + Math.random() * 0.4;
        x.drawImage(Art.glow('#ffb43a'), s.x + r * 0.75 - 5, s.y - r * 1.3 - 5, 10, 10);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }
      if (f.fl > 0) {
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = f.fl;
        const g = r * 4.4; x.drawImage(Art.glow(Art.PIN_GLOW[p.t] || '#ffd98a'), s.x - g, s.y - g, g * 2, g * 2);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }
    }
  }
  function drawHot(x) {
    if (!B.pins) return;
    for (const si of B.hot) {
      const p = B.pins[si]; if (!p) continue;
      const s = B.slots[si], r = PINS[p.t].r, t = B.t, pulse = 0.8 + Math.sin(t * 7) * 0.2;
      const col = B.hotGold ? '#ffd84a' : '#ff6a1c', col2 = B.hotGold ? '#fff3b0' : '#ffc23a';
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = 0.8 * pulse; let g = r * 7.5; x.drawImage(Art.glow(col), s.x - g, s.y - g, g * 2, g * 2);
      x.globalAlpha = 0.9; g = r * 3.2; x.drawImage(Art.glow(col2), s.x - g, s.y - g, g * 2, g * 2);
      x.globalAlpha = 1; x.strokeStyle = col2; x.lineWidth = 1.6; x.setLineDash([4, 3.5]); x.lineDashOffset = -t * 22;
      x.beginPath(); x.arc(s.x, s.y, r + 7 + Math.sin(t * 5) * 1.4, 0, TAU); x.stroke(); x.setLineDash([]);
      for (let k = 0; k < 3; k++) { const a = t * 3 + (k * TAU) / 3, rr = r + 11; x.drawImage(Art.glow('#fff3d6'), s.x + Math.cos(a) * rr - 3.5, s.y + Math.sin(a) * rr - 3.5, 7, 7); }
      x.globalCompositeOperation = 'source-over';
    }
  }
  function drawBalls(x) {
    const sh = Art.shadow();
    x.globalAlpha = 0.45;
    for (const b of B.balls) if (b.alive && b.warpT <= 0) x.drawImage(sh, b.x - b.r * 1.35 + 3, b.y - b.r * 1.35 + 4.5, b.r * 2.7, b.r * 2.7);
    x.globalAlpha = 1;
    x.lineCap = 'round';
    for (const b of B.balls) {
      if (!b.alive || b.warpT > 0) continue;
      const tr = b.trail;
      if (tr.length > 2) {
        const col = (BALLS[b.type] && BALLS[b.type].trail) || '#fff1d0';
        x.globalCompositeOperation = 'lighter'; x.strokeStyle = col;
        for (let i = 1; i < tr.length; i++) { const a = i / tr.length; x.globalAlpha = a * (b.type === 'comet' ? 0.6 : 0.28); x.lineWidth = b.r * 1.5 * a; x.beginPath(); x.moveTo(tr[i - 1][0], tr[i - 1][1]); x.lineTo(tr[i][0], tr[i][1]); x.stroke(); }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }
      if (b.type === 'comet' || b.mult >= 25) {
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = b.type === 'comet' ? 0.8 : Math.min(0.7, b.mult / 120);
        const g = b.r * 3.2; x.drawImage(Art.glow(b.type === 'comet' ? '#ff8a2a' : '#ff563a'), b.x - g, b.y - g, g * 2, g * 2);
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }
      const spr = Art.ball(b.type, 8), size = spr.size * (b.r / 8);
      x.drawImage(spr, b.x - size / 2, b.y - size / 2, size, size);
    }
    x.font = '8.5px Bungee, Impact, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left';
    for (const b of B.balls) {
      if (!b.alive || b.warpT > 0 || b.demo || b.y < 40 || (b.points <= 0 && b.mult <= 1)) continue;
      const a = fmt(b.points), m = fmtM(b.mult), wa = x.measureText(a).width, wm = x.measureText(m).width, w = wa + wm + 16;
      const bx = clamp(b.x - w / 2, 2, BW - w - 2), by = b.y - b.r - 11;
      x.globalAlpha = 0.86; Art.rrect(x, bx, by - 6, w, 12, 4); x.fillStyle = 'rgba(16,8,5,.82)'; x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#4fe3cf'; x.fillText(a, bx + 4, by + 0.5);
      x.fillStyle = '#cdbb98'; x.fillText('x', bx + 5 + wa, by + 0.5);
      x.fillStyle = '#ff6a4a'; x.fillText(m, bx + 12 + wa, by + 0.5);
    }
  }
  function drawLauncher(x) {
    const L = B.launcher;
    if (!L.show) return;
    const rg = x.createLinearGradient(0, 9, 0, 15);
    rg.addColorStop(0, '#fff0b8'); rg.addColorStop(0.5, '#c9973e'); rg.addColorStop(1, '#6b4a16');
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(6, 13, BW - 12, 4);
    x.fillStyle = rg; x.fillRect(6, 9, BW - 12, 5);
    [8, BW - 8].forEach(px => { x.save(); x.translate(px, 11.5); Art.disc(x, 4, '#fff6cf', '#e0b04e', '#8a5d1c', '#3a2506'); x.restore(); });
    if (B.aim && L.load >= 1 && B.nextBall) {
      x.setLineDash([2, 7]); x.lineDashOffset = -B.bulbT * 30; x.strokeStyle = 'rgba(255,240,200,.28)'; x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(L.x, LAUNCH_Y + 12); x.lineTo(L.x, Y0 - 12); x.stroke(); x.setLineDash([]);
    }
    if (B.nextBall && L.load < 1) {
      const t = Ease.outCubic(L.load), bx = lerp(BW - 14, L.x, t);
      const spr = Art.ball(B.nextBall, 8); x.drawImage(spr, bx - spr.size / 2, 11.5 - spr.size / 2 + Math.abs(Math.sin(t * Math.PI * 3)) * -3, spr.size, spr.size);
    }
    x.save(); x.translate(L.x, 0 - L.recoil * 3);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(2, 30, 13, 4, 0, 0, TAU); x.fill();
    const bg = x.createLinearGradient(-14, 0, 14, 0);
    bg.addColorStop(0, '#6b4a16'); bg.addColorStop(0.35, '#ffe9a8'); bg.addColorStop(0.6, '#d7ad55'); bg.addColorStop(1, '#6b4a16');
    x.fillStyle = bg; x.beginPath(); x.moveTo(-13, 6); x.lineTo(13, 6); x.lineTo(9, 18); x.lineTo(-9, 18); x.closePath(); x.fill();
    x.strokeStyle = '#3a2506'; x.lineWidth = 0.8; x.stroke();
    x.fillStyle = '#c3261a'; x.beginPath(); x.arc(0, 11, 2.2, 0, TAU); x.fill();
    const o = L.open * 0.7;
    x.strokeStyle = '#d7ad55'; x.lineWidth = 2.2; x.lineCap = 'round';
    x.save(); x.translate(-7, 17); x.rotate(o); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(-3, 8, 1.5, 14); x.stroke(); x.restore();
    x.save(); x.translate(7, 17); x.rotate(-o); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(3, 8, -1.5, 14); x.stroke(); x.restore();
    if (B.nextBall && L.load >= 1) { const spr = Art.ball(B.nextBall, 8); x.drawImage(spr, -spr.size / 2, LAUNCH_Y - spr.size / 2, spr.size, spr.size); }
    x.restore();
  }
  function drawPick(x) {
    const P = B.pick, t = B.t;
    if (P.kind === 'slot') {
      for (let i = 0; i < B.slots.length; i++) {
        if (!P.filter(i)) continue;
        const s = B.slots[i], hov = i === B.hover;
        x.strokeStyle = hov ? '#ffd84a' : 'rgba(255,240,200,.55)'; x.lineWidth = hov ? 2.2 : 1.1;
        x.beginPath(); x.arc(s.x, s.y, (hov ? 13 : 10) + Math.sin(t * 5 + i) * 1.2, 0, TAU); x.stroke();
      }
      if (B.hover >= 0 && P.ghost && P.filter(B.hover)) {
        const s = B.slots[B.hover], spr = Art.pin(P.ghost, PINS[P.ghost].r);
        x.globalAlpha = 0.75 + Math.sin(t * 8) * 0.2; x.drawImage(spr, s.x - spr.size / 2, s.y - spr.size / 2 - 2, spr.size, spr.size); x.globalAlpha = 1;
      }
    } else if (P.kind === 'pocket') {
      for (let i = 0; i < NPOCK; i++) {
        if (P.filter && !P.filter(i)) continue;
        const hov = i === B.hoverPocket;
        x.fillStyle = hov ? 'rgba(255,216,74,.35)' : `rgba(255,240,200,${0.1 + Math.sin(t * 5 + i) * 0.05})`;
        x.fillRect(i * PW + 3, DIV_TOP + 4, PW - 6, BH - DIV_TOP - 4);
        if (hov) { x.strokeStyle = '#ffd84a'; x.lineWidth = 2; x.strokeRect(i * PW + 3, DIV_TOP + 4, PW - 6, BH - DIV_TOP - 6); }
      }
    }
  }
  function drawFog(x) {
    const c = B.fogC, f = c.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, c.width, c.height); f.fillStyle = 'rgba(6,16,11,.96)'; f.fillRect(0, 0, c.width, c.height);
    f.globalCompositeOperation = 'destination-out'; f.scale(0.25, 0.25);
    const hole = (hx, hy, r) => { const g = f.createRadialGradient(hx, hy, 0, hx, hy, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); f.fillStyle = g; f.fillRect(hx - r, hy - r, r * 2, r * 2); };
    for (const b of B.balls) if (b.alive) hole(b.x, b.y, 95);
    hole(B.launcher.x, 30, 70);
    for (const si of B.hot) hole(B.slots[si].x, B.slots[si].y, 34);
    f.fillStyle = 'rgba(0,0,0,.7)'; f.fillRect(0, DIV_TOP - 10, BW, BH);
    x.drawImage(c, 0, 0, BW, BH);
  }

  /* ---------------- coords & picking ---------------- */
  function toLocal(cx, cy) {
    const r = B.cv.getBoundingClientRect();
    return { x: (cx - r.left) / B.scale - FR, y: (cy - r.top) / B.scale - FR };
  }
  function toScreen(lx, ly) {
    const r = B.cv.getBoundingClientRect();
    return { x: r.left + (lx + FR) * B.scale, y: r.top + (ly + FR) * B.scale };
  }
  function nearestSlot(lx, ly, maxD = 20) {
    let best = -1, bd = maxD * maxD;
    for (let i = 0; i < B.slots.length; i++) { const s = B.slots[i], d = (s.x - lx) ** 2 + (s.y - ly) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function pocketAt(lx, ly) { return ly > DIV_TOP - 26 && ly < BH + 10 ? clamp(Math.floor(lx / PW), 0, NPOCK - 1) : -1; }

  return Object.assign(B, { sproutStage, init, resize, setPins, setPockets, refresh, spawn, ballsAlive, step, update, render, toLocal, toScreen, nearestSlot, pocketAt });
})();
