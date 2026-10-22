HEROES.push({
  id: 'pyra',
  name: 'Pyra',
  title: 'Pyra 27 · Art that happens once',
  kind: 'Art biennale',
  tech: 'A fireworks engine: rockets with spark trails burst into peonies, willows, rings and strobing crossettes under gravity and drag, mirrored in a rippling harbour. In daylight the same shells become black smoke that blooms and drifts, a nod to daytime fireworks. Click the sky to fire.',
  accent: null,
  fonts: 'family=Syne:wght@500;700;800&family=Syne+Mono',
  css: `
.h-pyra{--bg:#040405;--fg:#f0eeea;--mut:rgba(240,238,234,.58);--line:rgba(240,238,234,.18);--ink:#f0eeea;font-family:"Syne",system-ui,sans-serif}
:root[data-theme=light] .h-pyra{--bg:#efeee9;--fg:#0e0e10;--mut:rgba(14,14,16,.6);--line:rgba(14,14,16,.18);--ink:#0e0e10}
.h-pyra .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-pyra .ui a,.h-pyra .ui button{pointer-events:auto}
.h-pyra .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-weight:500;font-size:14px}
.h-pyra .logo{font-weight:800;font-size:22px;letter-spacing:-.02em}
.h-pyra .logo sup{font:400 11px/1 "Syne Mono",monospace;margin-left:4px}
.h-pyra .links{display:flex;gap:26px}
.h-pyra .links a{opacity:.66;transition:opacity .2s}.h-pyra .links a:hover{opacity:1}
.h-pyra .r{display:flex;align-items:center;gap:12px}
.h-pyra .pass{height:36px;display:inline-flex;align-items:center;padding:0 16px;border:1px solid var(--fg);border-radius:18px}
.h-pyra .tt{height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--line);background:none;font:400 12px/1 "Syne Mono",monospace;text-transform:uppercase}
.h-pyra .tt .lt,:root[data-theme=light] .h-pyra .tt .dk{display:none}
:root[data-theme=light] .h-pyra .tt .lt{display:inline}
.h-pyra .copy{grid-row:3;display:flex;justify-content:space-between;align-items:flex-end;gap:32px}
.h-pyra h1{margin:0;font-weight:800;font-size:clamp(54px,9vw,156px);line-height:.84;letter-spacing:-.06em}
.h-pyra .side{max-width:340px;display:flex;flex-direction:column;gap:16px;padding-bottom:8px}
.h-pyra .sub{margin:0;font-size:clamp(14px,1.15vw,16px);line-height:1.5;color:var(--mut);font-weight:500}
.h-pyra .cta{display:flex;flex-wrap:wrap;gap:10px}
.h-pyra .btn{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 22px;border-radius:24px;background:var(--fg);color:var(--bg);font-weight:700;font-size:14px}
.h-pyra .btn small{font:400 11px/1 "Syne Mono",monospace;opacity:.7}
.h-pyra .ghost{display:inline-flex;align-items:center;height:48px;padding:0 20px;border-radius:24px;border:1px solid var(--line);font-weight:700;font-size:14px;background:var(--bg)}
.h-pyra .tonight{font:400 11px/1.6 "Syne Mono",monospace;text-transform:uppercase;color:var(--mut)}
.h-pyra .tonight b{color:var(--fg);font-weight:400}
@media (max-width:980px){.h-pyra .links{display:none}}
@media (max-width:760px){
  .h-pyra .ui{padding:14px 16px 12px}
  .h-pyra .pass{display:none}
  .h-pyra .copy{flex-direction:column;align-items:flex-start;gap:14px}
  .h-pyra h1{font-size:clamp(50px,16vw,72px)}
  .h-pyra .side{max-width:none;padding-bottom:0;gap:12px}
  .h-pyra .btn,.h-pyra .ghost{height:44px;padding:0 18px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">PYRA<sup>27</sup></a>
    <nav class="links" aria-label="Primary"><a href="#">Programme</a><a href="#">Artists</a><a href="#">Venues</a><a href="#">Visit</a></nav>
    <div class="r"><a class="pass" href="#">Passes</a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><span class="dk">Night works</span><span class="lt">Day works</span></button></div>
  </header>
  <div class="copy">
    <h1 data-mask="text">Art that<br>happens<br>once.</h1>
    <div class="side">
      <p class="sub" data-mask="text">A biennale of ephemeral works: fire, smoke, sound and light. Twelve nights on the old harbour of Marseille, 4 to 15 July 2027.</p>
      <div class="cta"><a class="btn" href="#">Get a pass <small>from EUR 24</small></a><a class="ghost" href="#">Programme</a></div>
      <p class="tonight" data-mask="text">Tonight <b>22:40</b> &middot; harbour stage &middot; click the sky to fire</p>
    </div>
  </div>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const P = S.pointer(root);
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .ghost, .logo, .links a, .r > *')];
    const HEAD = A.ramp('.+*o@'), TRAIL = A.ramp(".`':"), SMOKE = A.ramp(' .:-=+*#%'), WAVE = A.ramp('~-');
    let W = 1, H = 1, wl = 0, smoke = null, mask = null, rockets = [], sparks = [], next = 0.4, sky = [];
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 24, floor: 0.06 }); };
    const setup = () => {
      W = A.w; H = A.h;
      wl = Math.round(A.rows * (W > 760 ? 0.74 : 0.62));
      smoke = new Float32Array(A.n);
      // harbour skyline: quays, warehouses, two cranes, a church on the hill
      sky = new Int16Array(A.cols);
      const r = L.rng(17);
      let x = 0;
      while (x < A.cols) { const w = 3 + ((r() * 9) | 0), h = 1 + ((r() * 4) | 0); for (let k = 0; k < w && x + k < A.cols; k++) sky[x + k] = h; x += w; }
      const hill = Math.round(A.cols * 0.18); for (let k = -12; k <= 12; k++) if (hill + k >= 0 && hill + k < A.cols) sky[hill + k] = Math.max(sky[hill + k], Math.round(6 - Math.abs(k) * 0.35));
      sky[hill] = 10; if (hill + 1 < A.cols) sky[hill + 1] = 10;
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const TYPES = ['peony', 'willow', 'ring', 'crossette', 'palm'];
    const launch = (tx, ty, type) => {
      const x0 = tx + (Math.random() - 0.5) * 60, y0 = wl * A.cellH;
      const t = Math.sqrt((2 * Math.max(40, y0 - ty)) / 300);
      rockets.push({ x: x0, y: y0, vx: (tx - x0) / t, vy: -300 * t, type: type || TYPES[(Math.random() * TYPES.length) | 0], trail: [] });
    };
    const burst = (r) => {
      const n = r.type === 'willow' ? 90 : r.type === 'ring' ? 56 : r.type === 'palm' ? 11 : 88, sp = r.type === 'willow' ? 130 : r.type === 'palm' ? 210 : 190;
      const tilt = Math.random() * TAU;
      for (let k = 0; k < n; k++) {
        let a = (k / n) * TAU + Math.random() * 0.08, s = sp * (0.75 + Math.random() * 0.35), vz = 1;
        if (r.type === 'peony' || r.type === 'crossette' || r.type === 'willow') { const u = Math.random() * 2 - 1; vz = Math.sqrt(1 - u * u); s *= vz * 0.9 + 0.1; }
        let vx = Math.cos(a) * s, vy = Math.sin(a) * s;
        if (r.type === 'ring') { vy *= 0.45; const c = Math.cos(tilt), sn = Math.sin(tilt); const q = vx * c - vy * sn; vy = vx * sn + vy * c; vx = q; }
        sparks.push({ x: r.x, y: r.y, vx: vx + r.vx * 0.2, vy: vy + r.vy * 0.1, life: r.type === 'willow' ? 3.2 + Math.random() : 1.6 + Math.random() * 0.8, max: 0, type: r.type, trail: [], strobe: Math.random() * TAU, drag: r.type === 'willow' ? 1.6 : r.type === 'palm' ? 0.6 : 1.1 });
        sparks[sparks.length - 1].max = sparks[sparks.length - 1].life;
      }
      const cx = Math.floor(r.x / A.cellW), cy = Math.floor(r.y / A.cellH);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && y >= 0 && x < A.cols && y < wl) smoke[y * A.cols + x] += 0.25; }
    };

    S.loop((t, dt) => {
      if (!smoke) return;
      P.decay(dt);
      const dark = L.theme() === 'dark', cols = A.cols, rows = A.rows, g = A.g, al = A.a, cw = A.cellW, ch = A.cellH;
      for (const tp of P.taps.splice(0)) if (tp.y < wl * ch - 30) launch(tp.x, tp.y);
      if ((next -= dt) <= 0) {
        next = 0.35 + Math.random() * 0.8;
        const k = Math.random() < 0.08 ? 4 : 1;
        for (let j = 0; j < k; j++) launch(W * (W > 760 ? 0.3 + Math.random() * 0.65 : 0.1 + Math.random() * 0.8), H * (0.12 + Math.random() * 0.3));
      }
      for (let j = rockets.length - 1; j >= 0; j--) {
        const r = rockets[j];
        r.vy += 300 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        r.trail.push([r.x, r.y]); if (r.trail.length > 10) r.trail.shift();
        if (r.vy > -20) { burst(r); rockets.splice(j, 1); }
      }
      for (let j = sparks.length - 1; j >= 0; j--) {
        const s = sparks[j];
        s.life -= dt;
        if (s.life <= 0) {
          if (s.type === 'crossette' && !s.split) { for (let q = 0; q < 4; q++) { const a = (q / 4) * TAU + 0.4; sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.7, max: 0.7, type: 'cross2', trail: [], strobe: 0, drag: 1.2, split: true }); } }
          sparks.splice(j, 1); continue;
        }
        const k = Math.exp(-s.drag * dt);
        s.vx *= k; s.vy = s.vy * k + (s.type === 'willow' ? 70 : 110) * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.trail.push([s.x, s.y]); if (s.trail.length > (s.type === 'willow' ? 22 : s.type === 'palm' ? 16 : 9)) s.trail.shift();
        const cx = Math.floor(s.x / cw), cy = Math.floor(s.y / ch);
        if (cx >= 0 && cy >= 0 && cx < cols && cy < wl) smoke[cy * cols + cx] += dt * (dark ? 0.25 : 1.6);
      }
      // smoke drifts with the wind, spreads and thins
      const sm = smoke, wind = Math.round(t * 3) % 2;
      for (let y = 0; y < wl; y++) for (let x = cols - 1; x > 0; x--) { const i = y * cols + x; sm[i] = sm[i] * 0.985 + (wind ? (sm[i - 1] - sm[i]) * 0.04 : 0); }
      for (let y = 1; y < wl; y++) for (let x = 0; x < cols; x++) { const i = y * cols + x; sm[i - cols] += sm[i] * 0.01; sm[i] *= 0.99; }
      A.clear();
      // smoke field
      for (let y = 0; y < wl; y++) for (let x = 0; x < cols; x++) {
        const i = y * cols + x, v = Math.min(1, sm[i]);
        if (v < 0.04) continue;
        g[i] = SMOKE[Math.min(8, Math.max(1, (v * (dark ? 5 : 9)) | 0))]; al[i] = dark ? 0.05 + v * 0.18 : 0.15 + v * 0.75;
      }
      const put = (px, py, gi, a) => { const x = Math.floor(px / cw), y = Math.floor(py / ch); if (x < 0 || y < 0 || x >= cols || y >= wl) return; const i = y * cols + x; if (al[i] < a) { g[i] = gi; al[i] = a; } };
      // rockets and sparks: heads bright, trails fading; in daylight they are dark embers
      for (const r of rockets) { r.trail.forEach(([x, y], k) => put(x, y, TRAIL[k % 4], (k / r.trail.length) * 0.8)); put(r.x, r.y, HEAD[2], 1); }
      for (const s of sparks) {
        const f = s.life / s.max, tw = s.type === 'crossette' || s.type === 'cross2' ? (Math.sin(t * 40 + s.strobe) > 0 ? 1 : 0.25) : 1;
        const n = s.trail.length;
        for (let k = 0; k < n; k++) put(s.trail[k][0], s.trail[k][1], TRAIL[Math.min(3, ((k / n) * 4) | 0)], Math.pow(k / n, 0.7) * f * (dark ? 0.9 : 0.6));
        put(s.x, s.y, HEAD[Math.min(4, 1 + ((f * 4) | 0))], (dark ? 0.55 + 0.45 * f : 0.5 + 0.5 * f) * tw * (f < 0.25 && Math.random() < 0.3 ? 0.2 : 1));
      }
      // skyline at the waterline
      for (let x = 0; x < cols; x++) {
        const h = sky[x];
        for (let k = 0; k < h; k++) {
          const y = wl - 1 - k, i = y * cols + x, top = k === h - 1, wall = sky[x - 1] < k + 1 || sky[x + 1] < k + 1;
          g[i] = top ? A.glyph(h >= 10 ? '+' : '_') : wall ? A.glyph('|') : L.hash(x, y) < 0.18 ? A.glyph(dark ? "'" : '.') : 0;
          al[i] = top || wall ? (dark ? 0.55 : 0.85) : dark ? 0.7 : 0.3;
        }
      }
      // the harbour mirrors the sky, broken up by ripples
      for (let y = wl; y < rows; y++) {
        const d = y - wl, my = wl - 1 - d;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, off = Math.round(L.noise2(x * 0.08, y * 0.6 + t * 0.8) * (1 + d * 0.25));
          const sx = clamp(x + off, 0, cols - 1);
          if (my >= 0) { const j = my * cols + sx; if (al[j] > 0.05 && L.hash(x, y, (t * 8) | 0) < 0.78) { g[i] = d > 1 && L.hash(x, y) < 0.3 ? WAVE[0] : g[j]; al[i] = al[j] * (0.5 - Math.min(0.35, d * 0.02)); continue; } }
          if (L.hash(x, y, 3) < 0.05 + 0.04 * Math.sin(t + x * 0.2)) { g[i] = WAVE[(x + y) % 2]; al[i] = 0.1; }
        }
      }
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
    });
  },
});
