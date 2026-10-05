/* ============================================================
   reels.js : the three-reel FEVER machine. Outcomes are decided
   up front, then the reels are choreographed to sell them:
   omens, REACH tiers, one-short near misses and slip-ins.
   ============================================================ */
const Reels = (() => {
  const N = 3, BASE = ['cherry', 'cherry', 'cherry', 'cherry', 'cherry', 'bell', 'bell', 'bell', 'bell', 'clover', 'clover', 'clover', 'clover', 'bar', 'bar', 'bar', 'diamond', 'diamond', 'seven', 'seven'];
  const R = {
    cv: null, x: null, w: 0, h: 0, dpr: 1,
    strips: [], pos: [0.3, 5.6, 11.2], st: ['idle', 'idle', 'idle'], tw: [null, null, null], want: [null, null, null], spd: [0, 0, 0],
    queue: [], cur: null, phase: '', t: 0, omen: 0, win: 0, reachGlow: 0, dim: 0,
  };
  function buildStrip() {
    for (let tries = 0; tries < 200; tries++) {
      const s = BASE.slice(); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; }
      let ok = true;
      for (let i = 0; i < s.length; i++) if (s[i] === s[(i + 1) % s.length]) { ok = false; break; }
      if (ok) return s;
    }
    return ['cherry', 'bell', 'clover', 'bar', 'cherry', 'diamond', 'bell', 'seven', 'clover', 'cherry', 'bar', 'bell', 'cherry', 'clover', 'diamond', 'bar', 'bell', 'seven', 'cherry', 'clover'];
  }
  R.strips = [buildStrip(), buildStrip(), buildStrip()];
  const symAt = (r, k) => { const s = R.strips[r]; return s[((Math.round(k) % s.length) + s.length) % s.length]; };

  function init(cv) { R.cv = cv; R.x = cv.getContext('2d'); }
  function resize() {
    if (!R.cv) return;
    const r = R.cv.parentElement.getBoundingClientRect();
    R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.w = Math.max(120, Math.floor(r.width)); R.h = Math.max(50, Math.floor(R.w / 2.55));
    R.cv.width = R.w * R.dpr; R.cv.height = R.h * R.dpr; R.cv.style.width = R.w + 'px'; R.cv.style.height = R.h + 'px';
  }
  function add(n = 1, opts = {}) {
    for (let i = 0; i < n; i++) { if (R.queue.length < 6) R.queue.push(opts); }
    UI.holds(R.queue.length);
  }
  const idle = () => !R.cur && R.queue.length === 0;
  function reset() { R.queue.length = 0; R.cur = null; R.phase = ''; for (let i = 0; i < N; i++) { R.st[i] = 'idle'; R.tw[i] = null; } R.dim = 0; R.reachGlow = 0; UI.holds(0); }

  function wpick(obj) { let tot = 0; for (const k in obj) tot += obj[k]; let r = Math.random() * tot; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; }
  function plan(opts) {
    const p = Math.min(0.92, Game.jackpotOdds(opts));
    const w = Object.assign({}, SYM_W); if (Game.has('sevens')) w.seven *= 2;
    if (Meta.data.stats.fevers === 0 && Meta.data.stats.jackpots >= 1) w.seven *= 4;
    let jack = Math.random() < p;
    const sym = wpick(w);
    let tier = 0, reach = false, slip = null, nearMiss = false;
    if (jack) reach = true;
    else if (Math.random() < 0.33) { reach = true; nearMiss = true; }
    if (reach) {
      tier = +(jack ? wpick({ 1: 30, 2: 40, 3: 30 }) : wpick({ 1: 78, 2: 19, 3: 3 }));
      if (!jack && Game.has('wishbone') && Game.chance(1, 3)) { jack = true; slip = 'in'; Game.procId('wishbone', 'SLIP!', 'k'); }
      else if (jack && tier >= 2 && Math.random() < 0.3) slip = 'in';
      else if (!jack && tier >= 2 && Math.random() < 0.3) slip = 'out';
      R.want[0] = k => symAt(0, k) === sym;
      R.want[1] = k => symAt(1, k) === sym;
      if (jack && !slip) R.want[2] = k => symAt(2, k) === sym;
      else if (slip === 'out') R.want[2] = k => symAt(2, k) === sym;
      else R.want[2] = k => symAt(2, k + 1) === sym;
    } else {
      const a = wpick(w); let b = wpick(w); let g = 0; while (b === a && g++ < 20) b = wpick(w);
      R.want[0] = k => symAt(0, k) === a; R.want[1] = k => symAt(1, k) === b; R.want[2] = () => true;
    }
    const omen = jack ? Math.random() < 0.38 : Math.random() < 0.04;
    return { jack, sym, tier, reach, slip, nearMiss, omen, opts };
  }
  function start() {
    R.cur = plan(R.queue.shift());
    UI.holds(R.queue.length);
    R.t = 0;
    Game.onSpinStart();
    if (R.cur.omen) { R.phase = 'omen'; R.omen = 1; Sound.omen(); UI.reelOmen(); }
    else begin();
  }
  function begin() {
    R.phase = 'spin'; R.t = 0;
    for (let i = 0; i < N; i++) { R.st[i] = 'spin'; R.tw[i] = null; R.spd[i] = 0; }
    Sound.reelStart();
  }
  function hurry() { return 1 + R.queue.length * 0.3; }
  function stopReel(i, slow) {
    const v = Math.max(R.spd[i], 4), minD = slow ? 5 : 2.2, maxD = slow ? 13 : 9.5;
    const p = R.pos[i];
    let k = Math.ceil(p + minD);
    for (let g = 0; g < 40 && !R.want[i](k); g++) k++;
    const D = k - p;
    if (D > maxD) return false;
    const pw = slow ? 4 : 3;
    R.tw[i] = { p0: p, p1: k, t: 0, dur: clamp((pw * D) / v, 0.25, slow ? 4.2 : 1.1), pw, back: !slow };
    R.st[i] = 'stop';
    return true;
  }
  function update(dt) {
    R.omen = Math.max(0, R.omen - dt * 1.4);
    R.win = Math.max(0, R.win - dt * 0.6);
    for (let i = 0; i < N; i++) {
      if (R.st[i] === 'spin') {
        const target = R.phase === 'reach' && i === 2 ? 8.5 : 22;
        R.spd[i] = damp(R.spd[i], target, R.phase === 'reach' && i === 2 ? 1.6 : 8, dt);
        const before = Math.floor(R.pos[i]);
        R.pos[i] += R.spd[i] * dt;
        if (Math.floor(R.pos[i]) !== before && (i === 2 || Math.random() < 0.25)) Sound.reelTick();
      } else if (R.st[i] === 'stop') {
        const tw = R.tw[i]; tw.t += dt / tw.dur;
        const t = Math.min(1, tw.t);
        let e = 1 - Math.pow(1 - t, tw.pw);
        if (tw.back) e += Math.sin(t * Math.PI) * 0.06 * (1 - t);
        const before = Math.floor(R.pos[i]);
        R.pos[i] = tw.p0 + (tw.p1 - tw.p0) * e;
        if (Math.floor(R.pos[i]) !== before) Sound.reelTick();
        if (t >= 1) { R.pos[i] = tw.p1; R.st[i] = 'idle'; R.tw[i] = null; Sound.reelStop(i); if (R.phase === 'reach' && i === 2) FX.shake(0.2); }
      }
    }
    if (!R.cur) { if (R.queue.length && Game.canSpin()) start(); return; }
    const c = R.cur, H = hurry();
    R.t += dt * H;
    if (R.phase === 'omen') { if (R.t > 0.75) begin(); return; }
    if (R.phase === 'spin') {
      if (R.t > 0.7 && R.st[0] === 'spin') stopReel(0, false);
      if (R.t > 1.05 && R.st[1] === 'spin' && R.st[0] !== 'spin') stopReel(1, false);
      if (R.t > 1.4 && R.st[2] === 'spin' && R.st[1] === 'idle' && R.st[0] === 'idle') {
        if (c.reach) { R.phase = 'reach'; R.t = 0; R.dim = 1; Sound.reach(c.tier); UI.reach(c.tier); Game.onReach(c.tier); }
        else stopReel(2, false);
      }
      if (R.st.every(s => s === 'idle') && R.t > 1.4) finish();
    } else if (R.phase === 'reach') {
      const D = [0, 1.6, 2.4, 3.2][c.tier];
      R.reachGlow = 1;
      if (Math.floor(R.t / 0.9) !== Math.floor((R.t - dt * H) / 0.9)) Sound.heartbeat();
      if (R.t > D && R.st[2] === 'spin') stopReel(2, true);
      if (R.st[2] === 'idle') {
        if (c.slip && !c.slipped) { c.slipped = true; R.phase = 'slip'; R.t = 0; }
        else finish();
      }
    } else if (R.phase === 'slip') {
      if (R.t > 0.55 && R.st[2] === 'idle' && !c.slipDone) {
        c.slipDone = true;
        R.tw[2] = { p0: R.pos[2], p1: Math.round(R.pos[2]) + 1, t: 0, dur: 0.32, pw: 2, back: true }; R.st[2] = 'stop';
        Sound.whoosh();
      }
      if (c.slipDone && R.st[2] === 'idle') finish();
    } else if (R.phase === 'result') {
      if (R.t > (c.jack ? 1.6 : 0.55)) { R.cur = null; R.phase = ''; R.dim = 0; R.reachGlow = 0; UI.reachEnd(); }
    }
  }
  function finish() {
    const c = R.cur, s = [0, 1, 2].map(i => symAt(i, R.pos[i]));
    const jack = s[0] === s[1] && s[1] === s[2];
    R.phase = 'result'; R.t = 0; R.dim = 0; R.reachGlow = 0;
    UI.reachEnd();
    if (jack) { R.win = 1; Game.jackpot(s[0], c); }
    else { if (c.reach) Game.reachFail(c); else Sound.miss(); }
  }

  function draw() {
    const x = R.x;
    if (!x || !R.w) return;
    const W = R.w, H = R.h;
    x.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const pad = Math.round(W * 0.035), gap = Math.round(W * 0.025), colW = (W - pad * 2 - gap * 2) / 3, top = pad * 0.8, colH = H - top * 2, symH = colH / 2.2;
    Art.rrect(x, 0, 0, W, H, 12); x.fillStyle = '#140907'; x.fill();
    for (let i = 0; i < N; i++) {
      const x0 = pad + i * (colW + gap);
      x.save(); Art.rrect(x, x0, top, colW, colH, 6); x.clip();
      const g = x.createLinearGradient(0, top, 0, top + colH);
      g.addColorStop(0, '#a8987a'); g.addColorStop(0.5, '#fbf1dc'); g.addColorStop(1, '#a8987a');
      x.fillStyle = g; x.fillRect(x0, top, colW, colH);
      const p = R.pos[i], base = Math.floor(p), speed = R.st[i] === 'spin' ? R.spd[i] : R.tw[i] ? 6 : 0, blur = clamp(speed / 22, 0, 1);
      for (let k = base - 2; k <= base + 2; k++) {
        const y = top + colH / 2 - (k - p) * symH, sym = symAt(i, k), spr = Art.sym(sym), sz = symH * 0.86;
        if (y < top - symH || y > top + colH + symH) continue;
        if (blur > 0.2) {
          for (let m = -1; m <= 1; m++) { x.globalAlpha = (m === 0 ? 0.55 : 0.25) * (1 - blur * 0.3); x.drawImage(spr, x0 + colW / 2 - sz / 2, y - sz / 2 + m * blur * symH * 0.22, sz, sz); }
          x.globalAlpha = 1;
        } else x.drawImage(spr, x0 + colW / 2 - sz / 2, y - sz / 2, sz, sz);
      }
      const sh = x.createLinearGradient(0, top, 0, top + colH);
      sh.addColorStop(0, 'rgba(20,10,6,.75)'); sh.addColorStop(0.28, 'rgba(20,10,6,0)'); sh.addColorStop(0.72, 'rgba(20,10,6,0)'); sh.addColorStop(1, 'rgba(20,10,6,.75)');
      x.fillStyle = sh; x.fillRect(x0, top, colW, colH);
      if (R.win > 0) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = R.win * (0.5 + 0.5 * Math.sin(performance.now() / 60)); x.drawImage(Art.glow('#ffd84a'), x0 - colW * 0.3, top + colH / 2 - symH * 0.9, colW * 1.6, symH * 1.8); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      if (R.dim && i < 2 && R.phase === 'reach') { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() / 90); x.drawImage(Art.glow('#ff563a'), x0 - colW * 0.2, top + colH / 2 - symH * 0.8, colW * 1.4, symH * 1.6); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      x.restore();
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2; Art.rrect(x, x0, top, colW, colH, 6); x.stroke();
    }
    const py = top + colH / 2;
    x.strokeStyle = 'rgba(227,36,26,.85)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(pad * 0.4, py); x.lineTo(W - pad * 0.4, py); x.stroke();
    x.fillStyle = '#e3241a';
    x.beginPath(); x.moveTo(1, py - 6); x.lineTo(pad * 0.75, py); x.lineTo(1, py + 6); x.fill();
    x.beginPath(); x.moveTo(W - 1, py - 6); x.lineTo(W - pad * 0.75, py); x.lineTo(W - 1, py + 6); x.fill();
    const gl = x.createLinearGradient(0, 0, W, H);
    gl.addColorStop(0, 'rgba(255,255,255,.1)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); gl.addColorStop(0.36, 'rgba(255,255,255,.05)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    x.fillStyle = gl; Art.rrect(x, 0, 0, W, H, 12); x.fill();
    if (R.omen > 0) { x.globalAlpha = R.omen * 0.6; x.fillStyle = '#ffd84a'; Art.rrect(x, 0, 0, W, H, 12); x.fill(); x.globalAlpha = 1; }
    if (R.reachGlow) { x.strokeStyle = `rgba(255,${80 + Math.sin(performance.now() / 70) * 60},40,.9)`; x.lineWidth = 3; Art.rrect(x, 1.5, 1.5, W - 3, H - 3, 11); x.stroke(); }
  }
  return { init, resize, add, update, draw, reset, idle, get busy() { return !!R.cur; }, get held() { return R.queue.length; }, R };
})();
