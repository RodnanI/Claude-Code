/* SQUAWK intro: CRT power-on, split-flap title, live boot log, radar scope with real data, sweep reveal */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo;
  const $ = (s) => document.querySelector(s);
  let root, cv, ctx, W = 0, H = 0, dpr = 1, raf = 0, t0 = 0, mode = 'full', phase = 'boot', revealT0 = 0, revealDur = 1100;
  let boardDoneT = 0, coast = null, coastKey = '', blips = [], countShown = 0, flap = null, logLines = [], logDirty = true, subT = 0, doneRes;
  const SUB = 'LIVE AIR TRAFFIC  /  1090 MHz';
  const intro = (SQ.intro = { done: new Promise((r) => (doneRes = r)), active: false });
  SQ.introDone = false;

  /* ---------------- split-flap board ---------------- */
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function board(el, word, start, quick) {
    el.innerHTML = word.split('').map(() => '<div class="cell"><span class="t"></span><span class="b"></span><span class="ft"></span><span class="fb"></span></div>').join('');
    return Array.from(el.children).map((c, i) => ({ el: c, cur: ' ', target: word[i], flips: quick ? 3 + i : 7 + i * 2 + ((Math.random() * 3) | 0), next: start + i * (quick ? 30 : 60) }));
  }
  function setChar(cell, ch) {
    const [t, b, ft, fb] = cell.el.children, old = cell.cur;
    t.textContent = ch; b.textContent = old; ft.textContent = old; fb.textContent = ch;
    cell.el.classList.remove('go'); void cell.el.offsetWidth; cell.el.classList.add('go');
    cell.cur = ch;
    clearTimeout(cell.tm);
    cell.tm = setTimeout(() => { b.textContent = ch; }, 175);
  }
  function tickBoard(now) {
    if (!flap) return true;
    let done = true, clicked = false;
    for (const c of flap) {
      if (c.flips <= 0) continue;
      done = false;
      if (now < c.next) continue;
      c.flips--;
      setChar(c, c.flips === 0 ? c.target : CH[(Math.random() * CH.length) | 0]);
      c.next = now + 62 + Math.random() * 26;
      if (!clicked) { clicked = true; SQ.sound && SQ.sound.play('flap'); }
    }
    return done;
  }

  /* ---------------- boot log ---------------- */
  function log(label, status, cls) {
    const l = { label, status: status || null, cls: cls || '', t: performance.now() };
    logLines.push(l);
    if (logLines.length > 9) logLines.shift();
    logDirty = true;
    return l;
  }
  function settle(l, status, cls) { l.status = status; l.cls = cls || 'ok'; logDirty = true; }
  function renderLog(now) {
    if (!logDirty && now - (renderLog.t || 0) < 120) return;
    renderLog.t = now; logDirty = false;
    const el = $('#ilog');
    el.innerHTML = logLines.map((l) => {
      const age = now - l.t, txt = l.label.slice(0, Math.max(0, Math.floor(age / 14)));
      const dots = txt.length === l.label.length ? ' ' + '.'.repeat(Math.max(2, 30 - l.label.length)) + ' ' : '';
      const st = !dots ? '' : l.status ? `<span class="${l.cls}">${l.status}</span>` : `<span class="dim">${'|/-\\'[Math.floor(now / 90) % 4]}</span>`;
      return '&gt; ' + txt + (dots ? '<span class="dim">' + dots + '</span>' : '') + st;
    }).join('\n');
  }
  function hookLoading() {
    log('SQUAWK ATC DISPLAY ' + SQ.version, 'READY');
    setTimeout(() => log('POWER ON SELF TEST', 'OK'), 180);
    setTimeout(() => {
      const l = log('LOADING CARTOGRAPHY');
      const wait = () => (SQ.map && SQ.map.ready ? SQ.map.ready.then(() => settle(l, SQ.map.offline ? 'OFFLINE SET' : 'OK', SQ.map.offline ? 'bad' : 'ok')) : setTimeout(wait, 100));
      wait();
      SQ.on('map:offline', () => settle(l, 'OFFLINE SET', 'bad'));
    }, 420);
    setTimeout(() => {
      const l = log('REFERENCE DATA');
      const wait = () => (SQ.dataReady ? SQ.dataReady.then(() => { const a = SQ.D.airports ? SQ.D.airports.length : 0, t = SQ.D.types ? Object.keys(SQ.D.types).length : 0; settle(l, U.clamp(a, 0, 1e6).toLocaleString('en-US') + ' APT / ' + t.toLocaleString('en-US') + ' TYPES'); }) : setTimeout(wait, 100));
      wait();
    }, 700);
    setTimeout(() => log('TUNING RECEIVER', '1090.000 MHz'), 980);
    setTimeout(() => {
      const l = log('LINKING FEEDER NETWORK');
      const onErr = (id, err) => { if (!SQ.introDone && phase !== 'reveal') log(SQ.feed.PROVIDERS[id].name.toUpperCase() + ' ' + err.toUpperCase(), 'NO LINK', 'bad'); };
      SQ.on('feed:error', onErr);
      SQ.feed.firstData.then((d) => {
        settle(l, d.provider === 'sim' ? 'SIMULATION' : SQ.feed.PROVIDERS[d.provider].name.toUpperCase(), d.provider === 'sim' ? 'bad' : 'ok');
        const l2 = log('DECODING MODE-S / ADS-B');
        setTimeout(() => settle(l2, SQ.tracker.list.size.toLocaleString('en-US') + ' TARGETS'), 380);
        const c = SQ.map && SQ.map.map ? SQ.map.map.getCenter() : null;
        if (c) setTimeout(() => log('POSITION', SQ.fmt.lat(c.lat).replace('°', '') + ' ' + SQ.fmt.lon(c.lng).replace('°', '')), 620);
      });
    }, 1250);
  }

  /* ---------------- projection helpers ---------------- */
  function project(lon, lat) {
    if (SQ.map && SQ.map.map) { const p = SQ.map.map.project([lon, lat]); return [p.x, p.y]; }
    const v = (SQ.map && SQ.map.startView) || { center: [0, 0], zoom: 3 };
    const ws = 512 * Math.pow(2, v.zoom);
    return [W / 2 + (G.mx(lon) - G.mx(v.center[0])) * ws, H / 2 + (G.my(lat) - G.my(v.center[1])) * ws];
  }
  function buildCoast() {
    const key = W + 'x' + H + (SQ.map && SQ.map.map ? 'm' : 'v') + (SQ.D.airports ? 'a' : '');
    if (coast && coastKey === key) return coast;
    coastKey = key;
    const margin = Math.max(W, H);
    const line = (path, r) => {
      let pen = false, px = 0;
      for (let i = 0; i < r.length; i += 2) {
        const [x, y] = project(r[i], r[i + 1]);
        if (!(x > -margin && x < W + margin && y > -margin && y < H + margin) || (pen && Math.abs(x - px) > W)) { pen = false; continue; }
        if (!pen) { path.moveTo(x, y); pen = true; } else path.lineTo(x, y);
        px = x;
      }
    };
    const cp = new Path2D(), bp = new Path2D();
    for (const poly of SQ.D.land || []) for (const r of poly) line(cp, r);
    for (const r of SQ.D.borders || []) line(bp, r);
    const aps = [];
    for (const a of SQ.D.airports || []) {
      if (a[8] !== 1) continue;
      const [x, y] = project(a[6], a[5]);
      if (x > 0 && x < W && y > 0 && y < H) aps.push([x, y, a[1] || a[0]]);
    }
    return (coast = { cp, bp, aps });
  }

  /* ---------------- scope ---------------- */
  function drawScope(now, k, sweepA) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.44, appear = U.easeOut(k);
    ctx.save();
    /* bezel */
    ctx.strokeStyle = 'rgba(255,176,0,' + 0.5 * appear + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * appear, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    for (let d = 0; d < 360; d += 5) {
      const a = d * G.RAD + (1 - appear) * 1.2, l = d % 30 === 0 ? 12 : d % 10 === 0 ? 7 : 3;
      ctx.strokeStyle = 'rgba(255,176,0,' + (d % 30 === 0 ? 0.7 : 0.35) * appear + ')';
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); ctx.lineTo(cx + Math.sin(a) * (R + l), cy - Math.cos(a) * (R + l)); ctx.stroke();
      if (d % 30 === 0) {
        ctx.fillStyle = 'rgba(255,176,0,' + 0.6 * appear + ')'; ctx.font = '10px "B612 Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(d).padStart(3, '0'), cx + Math.sin(a) * (R + 24), cy - Math.cos(a) * (R + 24));
      }
    }
    /* range rings with real distances */
    const v = SQ.map && SQ.map.map ? { zoom: SQ.map.map.getZoom(), lat: SQ.map.map.getCenter().lat } : { zoom: 6, lat: 45 };
    const mpp = (40075016.686 * Math.cos(v.lat * G.RAD)) / (512 * Math.pow(2, v.zoom));
    const nmPx = 1852 / mpp, step = [10, 25, 50, 100, 200, 400].find((s) => s * nmPx > R / 4.5) || 400;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    for (let r = step, i = 0; r * nmPx < R; r += step, i++) {
      const rr = r * nmPx * U.clamp(appear * 1.4 - i * 0.12, 0, 1);
      ctx.strokeStyle = 'rgba(255,176,0,0.14)';
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,176,0,0.4)'; ctx.font = '9px "B612 Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(r + ' NM', cx + 4, cy - rr + 8);
    }
    ctx.strokeStyle = 'rgba(255,176,0,0.08)';
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    /* coastline: dim everywhere, bright inside the trailing wedge */
    const vm = buildCoast();
    const videoMap = (alpha, lw) => {
      ctx.lineWidth = lw;
      ctx.strokeStyle = 'rgba(255,176,0,' + alpha + ')';
      ctx.setLineDash([]); ctx.stroke(vm.cp);
      ctx.strokeStyle = 'rgba(255,176,0,' + alpha * 0.8 + ')';
      ctx.setLineDash([5, 4]); ctx.stroke(vm.bp); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,176,0,' + alpha * 1.6 + ')';
      ctx.font = '9px "B612 Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const [x, y, n] of vm.aps) { ctx.strokeStyle = 'rgba(255,176,0,' + alpha * 1.6 + ')'; ctx.strokeRect(x - 2.5, y - 2.5, 5, 5); ctx.fillText(n, x + 6, y); }
    };
    videoMap(0.16 * appear, 1);
    if (sweepA != null) {
      for (let i = 0; i < 4; i++) {
        ctx.save();
        const a1 = sweepA - Math.PI / 2, a0 = a1 - (i + 1) * 0.28;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.clip();
        videoMap(0.24 - i * 0.05, 1.4);
        ctx.restore();
      }
      /* beam wedge */
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(sweepA - Math.PI / 2 - 1.1, cx, cy);
        g.addColorStop(0, 'rgba(255,176,0,0)'); g.addColorStop(0.175, 'rgba(255,176,0,0.2)'); g.addColorStop(0.1752, 'rgba(255,176,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, sweepA - Math.PI / 2 - 1.1, sweepA - Math.PI / 2); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,225,150,0.95)'; ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255,176,0,0.9)'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(sweepA) * R, cy - Math.cos(sweepA) * R); ctx.stroke();
      ctx.shadowBlur = 0;
      drawBlips(now, sweepA, cx, cy, R);
    }
    ctx.restore();
  }
  let lastSweep = 0;
  function drawBlips(now, a, cx, cy, R) {
    const T = SQ.tracker;
    if (T.list.size && blips.length < Math.min(400, T.list.size) && now - (drawBlips.t || 0) > 200) {
      drawBlips.t = now;
      const have = new Set(blips.map((b) => b.hex));
      for (const ac of T.list.values()) {
        if (have.has(ac.hex)) continue;
        T.pos(ac, Date.now());
        const [x, y] = project(ac.rlon, ac.rlat);
        if (Math.hypot(x - cx, y - cy) > R - 4) continue;
        let ang = Math.atan2(x - cx, -(y - cy)); if (ang < 0) ang += Math.PI * 2;
        blips.push({ hex: ac.hex, x, y, ang, t: -1, cs: ac.flight || '', alt: ac.alt, gnd: ac.gnd, tag: Math.random() < 0.12 });
        if (blips.length >= 400) break;
      }
    }
    const prev = lastSweep;
    lastSweep = a;
    const crossed = (x) => (prev <= a ? x > prev && x <= a : x > prev || x <= a);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (const b of blips) {
      if (crossed(b.ang)) b.t = now;
      if (b.t < 0) continue;
      const I = U.clamp(1 - (now - b.t) / 2600, 0.08, 1);
      ctx.fillStyle = 'rgba(255,214,120,' + I + ')';
      ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
      if (I > 0.5) { ctx.fillStyle = 'rgba(255,176,0,' + (I - 0.5) * 0.6 + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, 6 * I, 0, Math.PI * 2); ctx.fill(); }
      if (b.tag && b.cs) {
        ctx.fillStyle = 'rgba(255,200,90,' + I * 0.85 + ')'; ctx.font = '9px "B612 Mono", monospace';
        ctx.fillText(b.cs, b.x + 6, b.y - 4);
        ctx.fillText(SQ.fmt.altShort(b.alt, b.gnd), b.x + 6, b.y + 6);
      }
    }
  }
  function grain() {
    ctx.fillStyle = 'rgba(255,190,90,0.05)';
    for (let i = 0; i < 160; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  /* ---------------- main loop ---------------- */
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    coast = null;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const q = mode === 'short';
    const boardDone = tickBoard(t);
    /* hold the settled title briefly before the scope takes over */
    if (boardDone && !boardDoneT) boardDoneT = t;
    const scopeStart = boardDoneT ? boardDoneT + (q ? 250 : 750) : Infinity;
    if (t > (q ? 250 : 900) && subT < SUB.length) { subT = Math.min(SUB.length, Math.floor((t - (q ? 250 : 900)) / 28)); $('#isub').textContent = SUB.slice(0, subT); }
    if (t > scopeStart && phase === 'boot') { phase = 'scope'; $('#flap').classList.add('away'); $('#isub').style.opacity = '0'; }
    renderLog(now);
    if (phase === 'scope' || phase === 'reveal') {
      const k = U.clamp((t - scopeStart) / 900, 0, 1);
      const period = 2300;
      let a = ((t - scopeStart) % period) / period * Math.PI * 2;
      if (phase === 'reveal') {
        const rk = U.clamp((now - revealT0) / revealDur, 0, 1), e = U.easeInOut(rk);
        a = e * Math.PI * 2;
        root.style.setProperty('--sw', (e * 360).toFixed(2) + 'deg');
        if (rk >= 1) return finish();
      }
      drawScope(now, k, k > 0.35 ? a : null);
      const n = SQ.tracker.list.size;
      countShown += (n - countShown) * 0.08;
      $('#icount').innerHTML = 'TARGETS<b>' + Math.round(countShown).toLocaleString('en-US') + '</b>';
      if (phase === 'scope' && boardDone && ready(t, scopeStart)) startReveal(false);
    }
    grain();
  }
  function ready(t, scopeStart) {
    const minScope = mode === 'short' ? 1100 : 2300;
    if (t - scopeStart < minScope) return false;
    const haveData = SQ.feed && SQ.feed.lastOk;
    const mapOk = SQ.map && SQ.map.map && SQ.map.map.loaded();
    return (haveData && mapOk) || t > 11000;
  }
  function startReveal(fast) {
    if (phase === 'reveal') return;
    if (phase === 'boot') { phase = 'scope'; $('#flap').classList.add('away'); }
    if (!boardDoneT) boardDoneT = performance.now() - t0 - 1500;
    phase = 'reveal';
    revealT0 = performance.now();
    revealDur = fast ? 420 : 1150;
    root.classList.add('reveal');
    SQ.emit('intro:reveal');
  }
  function finish() {
    cancelAnimationFrame(raf);
    root.classList.add('gone');
    root.classList.remove('reveal');
    intro.active = false;
    SQ.introDone = true;
    SQ.ls.set('introSeen', true);
    doneRes();
    SQ.emit('intro:done');
  }
  function skip() { if (intro.active) startReveal(true); }

  intro.play = (force) => {
    root = $('#intro');
    cv = $('#introCv');
    ctx = cv.getContext('2d');
    const setting = S.intro || 'auto';
    mode = force ? 'full' : setting === 'auto' ? (SQ.ls.get('introSeen') ? 'short' : 'full') : setting;
    if (!force && (mode === 'off' || SQ.reducedMotion())) { root.classList.add('gone'); intro.active = false; SQ.introDone = true; doneRes(); setTimeout(() => SQ.emit('intro:done'), 0); return; }
    intro.active = true;
    phase = 'boot'; blips = []; countShown = 0; logLines = []; subT = 0; coast = null; boardDoneT = 0;
    root.classList.remove('gone', 'reveal');
    root.style.setProperty('--sw', '0deg');
    $('#flap').classList.remove('away');
    $('#isub').style.opacity = '';
    $('#isub').textContent = '';
    resize();
    t0 = performance.now();
    flap = board($('#flap'), 'SQUAWK', 300, mode === 'short');
    if (force) log('SQUAWK ATC DISPLAY ' + SQ.version, 'REPLAY');
    else hookLoading();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };
  window.addEventListener('resize', () => { if (intro.active) resize(); });
  document.addEventListener('keydown', (e) => { if (intro.active && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); skip(); } }, true);
  document.addEventListener('DOMContentLoaded', () => {
    $('#iskip').addEventListener('click', skip);
    $('#intro').addEventListener('dblclick', skip);
  });
})();
