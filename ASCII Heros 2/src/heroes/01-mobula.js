HEROES.push({
  id: 'mobula',
  name: 'Mobula',
  title: 'Mobula · Everything, filtered',
  kind: 'AI research assistant',
  tech: 'Manta rays seen from below: span-wise wing flex projected per frame, banked turns, curiosity and startle, filter feeding on drifting plankton under radiating light shafts.',
  accent: null,
  fonts: 'family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&family=JetBrains+Mono:wght@400;500',
  css: `
.h-mobula{--bg:#050606;--fg:#e8ebe9;--mut:rgba(232,235,233,.56);--line:rgba(232,235,233,.17);--pill:#0a0c0c;--ink:#e8ebe9;font-family:"Newsreader",Georgia,"Times New Roman",serif}
:root[data-theme=light] .h-mobula{--bg:#eceeec;--fg:#0b0d0c;--mut:rgba(11,13,12,.6);--line:rgba(11,13,12,.18);--pill:#f9faf9;--ink:#0b0d0c}
.h-mobula .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(16px,3.2vw,44px) 18px}
.h-mobula .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font:500 11.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase}
.h-mobula .logo{display:flex;align-items:center;gap:10px;font:italic 400 27px/1 "Newsreader",Georgia,serif;letter-spacing:-.01em;text-transform:none}
.h-mobula .mk{font:500 12px/1 "JetBrains Mono",monospace;letter-spacing:-.05em;opacity:.8}
.h-mobula .links{display:flex;gap:30px}
.h-mobula .links a,.h-mobula .sign{opacity:.66;transition:opacity .2s}
.h-mobula .links a:hover,.h-mobula .sign:hover{opacity:1}
.h-mobula .right{display:flex;align-items:center;gap:22px}
.h-mobula .tt{display:flex;align-items:center;gap:9px;background:none;border:0;padding:6px 0;text-transform:uppercase}
.h-mobula .tt-k{position:relative;width:34px;height:18px;border-radius:9px;border:1px solid currentColor}
.h-mobula .tt-k::after{content:"";position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:currentColor;transition:transform .4s cubic-bezier(.6,0,.2,1)}
:root[data-theme=light] .h-mobula .tt-k::after{transform:translateX(16px)}
.h-mobula .tt-n,.h-mobula .tt-d{opacity:.4;transition:opacity .3s}
:root[data-theme=dark] .h-mobula .tt-n,:root[data-theme=light] .h-mobula .tt-d{opacity:1}
.h-mobula .mid{align-self:center;justify-self:center;width:min(760px,100%);display:flex;flex-direction:column;align-items:center;text-align:center}
.h-mobula .eye{margin:0;font:500 11px/1.4 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
.h-mobula h1{margin:18px 0 20px;font-weight:300;font-size:clamp(54px,9.2vw,128px);line-height:.88;letter-spacing:-.04em}
.h-mobula h1 em{font-style:italic}
.h-mobula .sub{margin:0 0 34px;max-width:33ch;font-size:clamp(17px,1.45vw,20px);line-height:1.4;color:var(--mut)}
.h-mobula .pill{position:relative;display:flex;align-items:center;gap:6px;width:100%;height:66px;padding:0 9px 0 26px;border-radius:999px;background:var(--pill);border:1px solid var(--line);box-shadow:0 30px 80px -34px rgba(0,0,0,.75);transition:border-color .25s}
.h-mobula .pill:focus-within{border-color:var(--fg)}
.h-mobula .pill input{flex:1;min-width:0;height:100%;background:none;border:0;outline:none;font:400 19px/1 "Newsreader",Georgia,serif;letter-spacing:0;color:var(--fg)}
.h-mobula .pill input::placeholder{color:var(--mut);opacity:1}
.h-mobula .mode{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;height:46px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:none;font:500 11px/1 "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase}
.h-mobula .mode span{font-size:10px;opacity:.55;letter-spacing:.03em}
.h-mobula .go{flex:none;width:48px;height:48px;border-radius:50%;border:0;background:var(--fg);color:var(--bg);font:500 19px/1 "JetBrains Mono",monospace;display:grid;place-items:center;transition:transform .2s}
.h-mobula .go:hover{transform:translateY(-2px)}
.h-mobula .prog{position:absolute;inset:0 66px 0 0;display:flex;align-items:center;padding-left:26px;border-radius:999px 0 0 999px;background:var(--pill);font:500 12px/1 "JetBrains Mono",monospace;letter-spacing:.05em;white-space:pre;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .2s}
.h-mobula .pill.busy .prog{opacity:1}
.h-mobula .chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:16px}
.h-mobula .chips button{height:34px;padding:0 15px;border-radius:999px;border:1px solid var(--line);background:var(--bg);font:400 15.5px/1 "Newsreader",Georgia,serif;color:var(--mut);transition:color .2s,border-color .2s}
.h-mobula .chips button:hover{color:var(--fg);border-color:var(--fg)}
.h-mobula .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;font:500 10.5px/1.3 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.h-mobula .foot kbd{font:inherit;border:1px solid var(--line);padding:1px 6px;border-radius:3px}
@media (max-width:900px){.h-mobula .links{display:none}}
@media (max-width:640px){
  .h-mobula .ui{padding:14px 16px 12px}
  .h-mobula .sign,.h-mobula .tt-n,.h-mobula .tt-d,.h-mobula .hint,.h-mobula .mode{display:none}
  .h-mobula h1{font-size:clamp(46px,15.5vw,66px);margin:14px 0 16px}
  .h-mobula .sub{font-size:16px;margin-bottom:24px}
  .h-mobula .pill{height:58px;padding-left:20px}
  .h-mobula .prog{inset:0 56px 0 0;padding-left:20px;font-size:11px}
  .h-mobula .go{width:44px;height:44px}
  .h-mobula .chips{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;width:calc(100% + 32px);margin:14px -16px 0;padding:0 16px;scrollbar-width:none;touch-action:pan-x}
  .h-mobula .chips::-webkit-scrollbar{display:none}
  .h-mobula .chips button{flex:none}
  .h-mobula .foot{justify-content:center}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#" aria-label="Mobula home"><span class="mk" aria-hidden="true">&lt;&#9671;&gt;</span>mobula</a>
    <nav class="links" aria-label="Primary"><a href="#">Research</a><a href="#">Agents</a><a href="#">Pricing</a><a href="#">Changelog</a></nav>
    <div class="right"><a class="sign" href="#">Sign in</a><button class="tt" type="button" data-theme-toggle aria-label="Switch between night and day dive"><span class="tt-n">Night</span><span class="tt-k" aria-hidden="true"></span><span class="tt-d">Day</span></button></div>
  </header>
  <main class="mid">
    <p class="eye" data-mask="text">Mobula 3 &middot; now reading 2.1 billion pages</p>
    <h1 data-mask="text">Everything,<br><em>filtered.</em></h1>
    <p class="sub" data-mask="text">Mobula glides through ten thousand sources a minute and keeps only what you can cite.</p>
    <form class="pill" autocomplete="off">
      <label class="sr" for="mobula-q">Ask Mobula</label>
      <input id="mobula-q" name="q" type="text" spellcheck="false" enterkeyhint="search" placeholder="Ask anything">
      <button type="button" class="mode" aria-label="Research depth: deep, 40 sources">Deep<span>40 sources</span></button>
      <button type="submit" class="go" aria-label="Ask">&uarr;</button>
      <div class="prog" aria-live="polite"></div>
    </form>
    <div class="chips"><button type="button">What changed in EU AI law this year?</button><button type="button">Every study on four-day weeks</button><button type="button">Heat pumps for a 1970s house</button></div>
  </main>
  <footer class="foot"><span class="read" data-mask="text">depth 14 m &middot; vis 30 m</span><span class="hint" data-mask="text">Press <kbd>/</kbd> to ask</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, lerp, clamp } = L;
    const A = S.ascii(root, { size: 13, mobile: 11 });
    const R = new L.Raster(A, 2);
    const P = S.pointer(root);
    const form = root.querySelector('.pill'), input = root.querySelector('input'), prog = root.querySelector('.prog'), read = root.querySelector('.read');
    const maskEls = [...root.querySelectorAll('[data-mask], .logo, .links a, .right > *'), form, ...root.querySelectorAll('.chips button')];
    const rnd = L.rng(11);
    const BODY = A.ramp('.:-=+*#%@'), SNOW = A.ramp('.,`\'.:·'), DOT = A.glyph('.'), COLON = A.glyph(':');
    const BUB = [A.glyph('°'), A.glyph('o'), A.glyph('O')];
    const mantas = [], snow = [], bubbles = [];
    let W = 1, H = 1, base = 100, mask = null, filtered = 0, frenzy = 0, feed = null, readT = 0, lastN = -1;

    const newSnow = (anywhere) => {
      const z = Math.pow(rnd(), 1.6);
      return { x: rnd() * W, y: anywhere ? rnd() * H : -8 - rnd() * 40, z, vy: 4 + 13 * z, g: SNOW[(rnd() * SNOW.length) | 0], life: -1 };
    };
    const makeManta = (z) => ({
      x: rnd() * W, y: rnd() * H, a: (rnd() < 0.5 ? -1 : 1) * Math.PI / 2 + (rnd() - 0.5) * 1.3, z, ph: rnd() * TAU, per: 2.8 + rnd() * 1.4, roll: 0, turn: 0, seed: rnd() * 60,
      spots: Array.from({ length: 2 + ((rnd() * 5) | 0) }, () => [lerp(-0.3, 0.14, rnd()), lerp(-0.34, 0.34, rnd()), 0.016 + rnd() * 0.026]),
      tail: null, s: 1,
    });
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 30, floor: 0.07 }); };
    const setup = () => {
      W = A.w; H = A.h;
      base = Math.min(Math.max(W, H) * 0.165, Math.min(W, H) * 0.34);
      const n = W < 640 ? 3 : W < 1100 ? 4 : 5;
      if (mantas.length !== n) {
        mantas.length = 0;
        for (let i = 0; i < n; i++) mantas.push(makeManta(0.12 + 0.88 * Math.pow(i / (n - 1), 1.1)));
      }
      const ns = Math.round((W * H) / 5200);
      while (snow.length < ns) snow.push(newSnow(true));
      snow.length = ns;
      remask();
    };
    A.onResize = setup;
    setup();
    root.__state = { mantas, snow };
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    /* wing: span-wise elevation travels root to tip; projecting onto the screen
       shortens the span and the belly darkens where it tilts away from us */
    const NU = 10, Yp = new Float32Array(NU + 1), Xs = new Float32Array(NU + 1), Bs = new Float32Array(NU + 1);
    const theta = (m, u, side) => 0.55 * Math.pow(u, 1.25) * Math.sin(m.ph - 1.7 * u) + side * m.roll * u;
    const wing = (m, side) => {
      Yp[0] = 0.14;
      for (let k = 0; k <= NU; k++) {
        const u = k / NU;
        if (k) Yp[k] = Yp[k - 1] + (0.96 / NU) * Math.cos(theta(m, (k - 0.5) / NU, side));
        Xs[k] = 0.06 * u * u * Math.cos(m.ph - 1.7 * u);
        Bs[k] = (0.4 + 0.6 * Math.cos(theta(m, u, side))) * (1 - 0.55 * Math.pow(u, 1.5));
      }
    };
    // ventral outline: straight swept leading edge, concave trailing edge, falcate tip
    const hook = (u) => 0.07 * Math.pow(Math.max(0, (u - 0.78) / 0.22), 2);
    const LE = (u) => 0.42 - 0.55 * Math.pow(u, 1.12) - hook(u);
    const TE = (u) => -0.52 + 0.42 * Math.pow(u, 0.75) - hook(u);

    const drawManta = (ctx, m) => {
      const s = m.s, dep = 0.42 + 0.58 * m.z;
      const col = (b) => 'rgb(' + ((clamp(b, 0, 1) * dep * 255) | 0) + ',255,0)';
      ctx.save();
      ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.scale(s, s);
      // silhouette first so band seams never open holes in the coverage channel
      ctx.fillStyle = col(0.72);
      ctx.beginPath();
      ctx.moveTo(0.4, 0);
      wing(m, 1);
      for (let k = 0; k <= NU; k++) ctx.lineTo(LE(k / NU) + Xs[k], Yp[k]);
      for (let k = NU; k >= 0; k--) ctx.lineTo(TE(k / NU) + Xs[k], Yp[k]);
      ctx.lineTo(-0.56, 0);
      wing(m, -1);
      for (let k = 0; k <= NU; k++) ctx.lineTo(TE(k / NU) + Xs[k], -Yp[k]);
      for (let k = NU; k >= 0; k--) ctx.lineTo(LE(k / NU) + Xs[k], -Yp[k]);
      ctx.closePath(); ctx.fill();
      for (const side of [1, -1]) {
        wing(m, side);
        for (let k = 0; k < NU; k++) {
          ctx.fillStyle = col((Bs[k] + Bs[k + 1]) / 2);
          ctx.beginPath();
          ctx.moveTo(LE(k / NU) + Xs[k], side * Yp[k]); ctx.lineTo(LE((k + 1) / NU) + Xs[k + 1], side * Yp[k + 1]);
          ctx.lineTo(TE((k + 1) / NU) + Xs[k + 1], side * Yp[k + 1]); ctx.lineTo(TE(k / NU) + Xs[k], side * Yp[k]);
          ctx.closePath(); ctx.fill();
        }
        // dark margin along the trailing edge, typical of a manta's belly
        ctx.strokeStyle = col(0.18); ctx.lineWidth = 0.05; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let k = 0; k <= NU; k++) { const x = TE(k / NU) + Xs[k] + 0.025, y = side * (Yp[k] - 0.01); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        // cephalic lobes, unrolled while feeding
        ctx.fillStyle = col(0.82);
        ctx.beginPath(); ctx.moveTo(0.36, side * 0.09); ctx.quadraticCurveTo(0.6, side * 0.2, 0.66, side * 0.12); ctx.quadraticCurveTo(0.56, side * 0.1, 0.4, side * 0.15); ctx.closePath(); ctx.fill();
        // gill slits
        ctx.strokeStyle = col(0.2); ctx.lineWidth = 0.016;
        for (let g = 0; g < 5; g++) { const gx = 0.27 - g * 0.05; ctx.beginPath(); ctx.moveTo(gx, side * 0.15); ctx.lineTo(gx - 0.03, side * 0.25); ctx.stroke(); }
      }
      ctx.fillStyle = col(0.9);
      ctx.beginPath(); ctx.moveTo(0.4, -0.14); ctx.lineTo(0.4, 0.14); ctx.lineTo(-0.5, 0.12); ctx.lineTo(-0.5, -0.12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col(0.15);
      ctx.fillRect(0.36, -0.1, 0.05, 0.2);
      for (const [sx, sy, r] of m.spots) { ctx.fillStyle = col(0.3); ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.3, r, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = col(0.6);
      ctx.beginPath(); ctx.ellipse(-0.55, 0.07, 0.08, 0.035, 0.35, 0, TAU); ctx.ellipse(-0.55, -0.07, 0.08, 0.035, -0.35, 0, TAU); ctx.fill();
      ctx.restore();
    };
    const LG = { v: A.glyph('|'), h: A.glyph('-'), f: A.glyph('/'), b: A.glyph('\\') };
    const drawTail = (m) => {
      if (!m.tail) return;
      const cw = A.cellW, ch = A.cellH, al = 0.25 + 0.6 * m.z;
      for (let k = 1; k < m.tail.length; k++) {
        const [x0, y0] = m.tail[k - 1], [x1, y1] = m.tail[k], dx = x1 - x0, dy = y1 - y0;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / cw, Math.abs(dy) / ch) * 1.5));
        const ax = Math.abs(dx) / cw, ay = Math.abs(dy) / ch, gl = ay > ax * 2.2 ? LG.v : ax > ay * 2.2 ? LG.h : dx * dy > 0 ? LG.b : LG.f;
        for (let j = 0; j < steps; j++) A.put((x0 + (dx * j) / steps) / cw, (y0 + (dy * j) / steps) / ch, gl, al * (1 - k / (m.tail.length + 2)));
      }
    };

    const pillCenter = () => { const r = form.getBoundingClientRect(), h = root.getBoundingClientRect(); return [r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, r.width]; };
    const burst = (x, y, n, spread) => {
      for (let k = 0; k < n; k++) {
        const a = rnd() * TAU, d = rnd() * spread;
        snow.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.5, z: 0.4 + rnd() * 0.6, vy: 3 + rnd() * 8, g: SNOW[(rnd() * SNOW.length) | 0], life: 7 + rnd() * 5, vx: Math.cos(a) * 30 * rnd(), vyy: Math.sin(a) * 20 * rnd() });
      }
    };
    const ask = () => {
      if (frenzy > 0) return;
      const [cx, cy, w] = pillCenter();
      frenzy = 3.4;
      feed = { x: cx, y: cy, t: 6.5 };
      burst(cx, cy, W < 640 ? 70 : 150, w * 0.55);
      for (let k = 0; k < 16; k++) bubbles.push({ x: cx + (rnd() - 0.5) * w * 0.8, y: cy - 10, r: rnd(), vy: 40 + rnd() * 60, ph: rnd() * TAU });
      form.classList.add('busy');
      input.blur();
    };
    S.on(form, 'submit', (e) => { e.preventDefault(); ask(); });
    root.querySelectorAll('.chips button').forEach((b) => S.on(b, 'click', () => { input.value = b.textContent; ask(); }));
    S.on(input, 'input', () => { if (Math.random() < 0.5) { const [cx, cy, w] = pillCenter(); bubbles.push({ x: cx - w * 0.4 + Math.min(w * 0.75, input.value.length * 9), y: cy - 12, r: rnd() * 0.6, vy: 30 + rnd() * 40, ph: rnd() * TAU }); } });
    S.on(document, 'keydown', (e) => { if (e.key === '/' && document.activeElement !== input && !e.metaKey && !e.ctrlKey) { e.preventDefault(); input.focus(); } });
    L.typePlaceholder(input, ['What changed in EU AI law this year?', 'Summarise every trial of GLP-1 drugs since 2021', 'Which cities banned short-term rentals, and did rents fall?', 'Compare three CRMs for a twelve-person team'], S, 'Ask anything');

    S.loop((t, dt) => {
      P.decay(dt);
      const cols = A.cols, rows = A.rows, cw = A.cellW, ch = A.cellH, g = A.g, al = A.a;
      A.clear();

      /* light shafts radiate from a sun far above the frame */
      const sx = W * (0.64 + 0.07 * Math.sin(t * 0.045)), sy = -H * 0.75;
      for (let y = 0; y < rows; y++) {
        const py = (y + 0.5) * ch, fall = Math.pow(Math.max(0, 1 - py / (H * 0.92)), 1.6);
        if (fall < 0.03) break;
        for (let x = 0; x < cols; x++) {
          const ang = Math.atan2((x + 0.5) * cw - sx, py - sy);
          let I = L.noise2(ang * 6, t * 0.06) * 0.7 + L.noise2(ang * 17 + 7.1, t * 0.12) * 0.3 + 0.1;
          if (I <= 0) continue;
          I = Math.min(1, I * fall * 1.5);
          const i = y * cols + x;
          g[i] = I > 0.55 ? COLON : DOT;
          al[i] = 0.035 + 0.3 * I * I;
        }
      }

      /* plankton */
      for (let k = snow.length - 1; k >= 0; k--) {
        const p = snow[k];
        if (p.life > 0) { p.life -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vyy || 0) * dt; p.vx *= 0.97; p.vyy *= 0.97; if (p.life <= 0) { snow.splice(k, 1); continue; } }
        p.y += p.vy * dt;
        p.x += L.noise2(p.y * 0.004 + p.z * 5, t * 0.09) * (6 + 10 * p.z) * dt;
        if (p.y > H + 10) { if (p.life > 0) { snow.splice(k, 1); continue; } Object.assign(p, newSnow(false)); }
        if (p.x < -10) p.x += W + 20; else if (p.x > W + 10) p.x -= W + 20;
        let a = 0.14 + 0.42 * p.z;
        if (P.active) { const d = Math.hypot(P.x - p.x, P.y - p.y); if (d < 180) a += (1 - d / 180) * 0.55; }
        A.put(p.x / cw, p.y / ch, p.g, a);
      }
      for (let k = bubbles.length - 1; k >= 0; k--) {
        const b = bubbles[k];
        b.y -= b.vy * dt; b.ph += dt * 5; b.x += Math.sin(b.ph) * 14 * dt;
        if (b.y < -10) { bubbles.splice(k, 1); continue; }
        A.put(b.x / cw, b.y / ch, BUB[Math.min(2, (b.r * 3) | 0)], 0.7);
      }

      /* mantas */
      if (frenzy > 0) frenzy -= dt;
      if (feed && (feed.t -= dt) <= 0) feed = null;
      const fast = Math.hypot(P.vx, P.vy) > 1100, still = P.active && P.idle(900) && !P.idle(9000);
      for (const m of mantas) {
        m.s = base * (0.45 + 0.55 * m.z);
        const s = m.s;
        let turn = L.noise2(m.seed, t * 0.05) * 0.38;
        const steer = (tx, ty, gain, range) => {
          const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
          if (d > range || d < 1) return;
          const diff = ((Math.atan2(dy, dx) - m.a + Math.PI) % TAU + TAU) % TAU - Math.PI;
          turn += diff * gain * (1 - (d / range) * 0.6);
        };
        if (P.active && fast) steer(2 * m.x - P.x, 2 * m.y - P.y, 1.4, 300);
        else if (still) steer(P.x, P.y, 0.22, 420);
        if (feed) steer(feed.x, feed.y, frenzy > 0 ? 0.9 : 0.45, Math.max(W, H));
        for (const o of mantas) {
          if (o === m || Math.abs(o.z - m.z) > 0.3) continue;
          const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy), r = s * 1.7;
          if (d < r && d > 1) turn -= (Math.sign(Math.cos(m.a) * dy - Math.sin(m.a) * dx) || 1) * 0.7 * (1 - d / r);
        }
        m.turn = lerp(m.turn, clamp(turn, -0.8, 0.8), Math.min(1, dt * 1.4));
        m.a += m.turn * dt;
        m.roll = lerp(m.roll, -m.turn * 0.85, Math.min(1, dt * 2));
        m.ph += (dt * TAU) / (m.per * (frenzy > 0 ? 0.7 : 1));
        const v = s * (0.3 + 0.12 * Math.max(0, -Math.cos(m.ph))) * (frenzy > 0 ? 1.7 : 1);
        m.x += Math.cos(m.a) * v * dt; m.y += Math.sin(m.a) * v * dt;
        const mg = s * 1.3;
        let wrapped = false;
        if (m.x < -mg) { m.x = W + mg; wrapped = true; } else if (m.x > W + mg) { m.x = -mg; wrapped = true; }
        if (m.y < -mg) { m.y = H + mg; wrapped = true; } else if (m.y > H + mg) { m.y = -mg; wrapped = true; }
        const ca = Math.cos(m.a), sa = Math.sin(m.a), bx = m.x - ca * s * 0.55, by = m.y - sa * s * 0.55, seg = (s * 1.05) / 9;
        if (!m.tail || wrapped) m.tail = Array.from({ length: 10 }, (_, k) => [bx - ca * seg * k, by - sa * seg * k]);
        m.tail[0][0] = bx; m.tail[0][1] = by;
        for (let k = 1; k < m.tail.length; k++) {
          const p = m.tail[k], q = m.tail[k - 1], dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1;
          p[0] = q[0] + (dx / d) * seg; p[1] = q[1] + (dy / d) * seg;
        }
        // filter feeding: plankton ahead of the mouth is drawn in and swallowed
        for (let k = snow.length - 1; k >= 0; k--) {
          const p = snow[k];
          if (Math.abs(p.z - m.z) > 0.4) continue;
          const dx = p.x - m.x, dy = p.y - m.y, fx = (dx * ca + dy * sa) / s, fy = (-dx * sa + dy * ca) / s;
          if (fx > 0.3 && fx < 1.1 && Math.abs(fy) < 0.32) {
            if (fx < 0.56 && Math.abs(fy) < 0.13) { filtered++; if (p.life > 0) snow.splice(k, 1); else Object.assign(p, newSnow(false)); continue; }
            const mx = m.x + ca * s * 0.42, my = m.y + sa * s * 0.42;
            p.x += (mx - p.x) * Math.min(1, dt * 2.2); p.y += (my - p.y) * Math.min(1, dt * 2.2);
          }
        }
      }
      mantas.sort((a, b) => a.z - b.z);
      const ctx = R.begin();
      for (const m of mantas) drawManta(ctx, m);
      R.sample();
      const cov = R.g, br = R.r;
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        const c = cov[i];
        if (c < 0.1) continue;
        const b = br[i] / c;
        let gi = L.edge(A, cov, x, y, 1.15);
        if (gi < 0 || c > 0.94) gi = BODY[Math.min(BODY.length - 1, (b * 0.92 * BODY.length) | 0)];
        g[i] = gi;
        al[i] = (0.3 + 0.7 * Math.min(1, c * 1.25)) * (0.28 + 0.72 * b);
      }
      for (const m of mantas) drawTail(m);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();

      if (form.classList.contains('busy')) {
        const total = 10482, k = clamp(1 - frenzy / 3.4, 0, 1), done = Math.round(total * k), bar = '#'.repeat(Math.round(k * 12)).padEnd(12, '.');
        if (frenzy > 0) prog.textContent = `filtering [${bar}] ${L.fmt(done)} / ${L.fmt(total)}`;
        else if (frenzy > -2.6) prog.textContent = W < 640 ? 'kept 23 of 10,482. (demo)' : 'kept 23 of 10,482 sources. this is a demo.';
        else { form.classList.remove('busy'); input.value = ''; }
        if (frenzy <= 0) frenzy -= dt;
      }
      if ((readT -= dt) <= 0) {
        readT = 0.25;
        if (filtered !== lastN) {
          lastN = filtered;
          const depth = (14 + L.noise2(t * 0.05, 3) * 3).toFixed(0);
          read.textContent = W < 640 ? `${mantas.length} mantas · ${L.fmt(filtered)} filtered` : `depth ${depth} m · vis 30 m · ${mantas.length} mantas · ${L.fmt(filtered)} plankton filtered`;
        }
      }
    });
  },
});
