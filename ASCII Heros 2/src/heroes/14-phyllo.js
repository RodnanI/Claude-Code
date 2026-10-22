HEROES.push({
  id: 'phyllo',
  name: 'Phyllo',
  title: 'Phyllo · A library of seeds',
  kind: 'Seed bank, non-profit',
  tech: 'Vogel\'s phyllotaxis: each floret is placed 137.508 degrees after the last and grows outward, so the Fibonacci spirals appear by themselves. Drag sideways to detune the divergence angle and watch the head collapse into spokes and come back.',
  accent: null,
  fonts: 'family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;1,9..144,300..600,0..100&family=Azeret+Mono:wght@400;500',
  css: `
.h-phyllo{--bg:#070806;--fg:#eef0e6;--mut:rgba(238,240,230,.58);--line:rgba(238,240,230,.18);--ink:#eef0e6;font-family:"Azeret Mono",ui-monospace,monospace}
:root[data-theme=light] .h-phyllo{--bg:#f2f1e8;--fg:#13150f;--mut:rgba(19,21,15,.6);--line:rgba(19,21,15,.18);--ink:#13150f}
.h-phyllo .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-phyllo .ui a,.h-phyllo .ui button{pointer-events:auto}
.h-phyllo .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:11.5px;letter-spacing:.06em}
.h-phyllo .logo{font:italic 400 26px/1 "Fraunces",Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 72;letter-spacing:-.02em}
.h-phyllo .links{display:flex;gap:26px}
.h-phyllo .links a{opacity:.62;transition:opacity .2s}.h-phyllo .links a:hover{opacity:1}
.h-phyllo .tt{display:flex;align-items:center;gap:10px;border:0;background:none;padding:6px 0;font-size:11.5px;letter-spacing:.06em}
.h-phyllo .tt i{width:18px;height:18px;border-radius:50%;border:1px solid currentColor;background:radial-gradient(circle,currentColor 0 2px,transparent 2.5px)}
.h-phyllo .tt .lt,:root[data-theme=light] .h-phyllo .tt .dk{display:none}
:root[data-theme=light] .h-phyllo .tt .lt{display:inline}
.h-phyllo .copy{align-self:center;max-width:min(560px,44vw)}
.h-phyllo .kick{margin:0 0 22px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.h-phyllo h1{margin:0 0 22px;font:340 clamp(48px,6.4vw,104px)/.94 "Fraunces",Georgia,serif;font-variation-settings:"SOFT" 100,"opsz" 144;letter-spacing:-.035em}
.h-phyllo h1 em{font-style:italic;font-weight:300}
.h-phyllo .sub{margin:0 0 28px;max-width:44ch;font-size:clamp(12.5px,1vw,14px);line-height:1.75;color:var(--mut)}
.h-phyllo .cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.h-phyllo .btn{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 22px;border-radius:24px;background:var(--fg);color:var(--bg);font-size:12.5px;letter-spacing:.04em}
.h-phyllo .ghost{display:inline-flex;align-items:center;height:48px;padding:0 20px;border-radius:24px;border:1px solid var(--line);font-size:12.5px;background:var(--bg)}
.h-phyllo .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:11px;letter-spacing:.06em;color:var(--mut)}
.h-phyllo .ang b{font:500 clamp(18px,1.7vw,24px)/1 "Azeret Mono",monospace;color:var(--fg);display:block;margin-top:6px;font-variant-numeric:tabular-nums}
.h-phyllo .count{text-align:right}
.h-phyllo .count b{color:var(--fg);font-weight:500}
@media (max-width:980px){.h-phyllo .links{display:none}}
@media (max-width:760px){
  .h-phyllo .ui{padding:14px 16px 12px}
  .h-phyllo .tt .lbl{display:none}
  .h-phyllo .copy{align-self:end;max-width:none;margin-bottom:14px}
  .h-phyllo .kick{margin-bottom:12px;font-size:10px}
  .h-phyllo h1{font-size:clamp(40px,12vw,52px);margin-bottom:12px}
  .h-phyllo .sub{font-size:12.5px;line-height:1.65;margin-bottom:16px}
  .h-phyllo .btn,.h-phyllo .ghost{height:44px;padding:0 18px}
  .h-phyllo .count{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">phyllo</a>
    <nav class="links" aria-label="Primary"><a href="#">The vault</a><a href="#">Adopt a variety</a><a href="#">Growers</a><a href="#">Research</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i><span class="lbl"><span class="dk">Night garden</span><span class="lt">Day garden</span></span></button>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">Seed bank &middot; 41,286 varieties &middot; since 1994</p>
    <h1 data-mask="text">Every seed<br>knows the<br><em>golden angle.</em></h1>
    <p class="sub" data-mask="text">Phyllo keeps living copies of the world's crops in a vault, in growers' gardens and in the ground. Adopt a variety and we will send you its seeds, its story, and a reminder when it is time to sow.</p>
    <div class="cta"><a class="btn" href="#">Adopt a variety &rarr;</a><a class="ghost" href="#">Visit the vault</a></div>
  </div>
  <footer class="foot"><span class="ang" data-mask="text">Divergence<b class="deg">137.508&deg;</b></span><span class="count" data-mask="text"><b class="n">0</b> florets &middot; drag sideways to detune</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const P = S.pointer(root);
    const deg = root.querySelector('.deg'), cnt = root.querySelector('.n');
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .ghost, .logo, .links a, .tt')];
    const GOLD = Math.PI * (3 - Math.sqrt(5));
    const SEED = A.ramp('.:o0@'), PET = A.ramp(".'-~=+"), RAY = { h: A.glyph('-'), v: A.glyph('|'), f: A.glyph('/'), b: A.glyph('\\') };
    let cx = 0, cy = 0, Rh = 100, mask = null, N = 0, grown = 0, ang = GOLD, target = GOLD, statT = 0, drag = null;
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 26, floor: 0.06 }); };
    const setup = () => {
      const W = A.w, H = A.h, wide = W > 760;
      Rh = wide ? Math.min(H * 0.33, W * 0.2) : Math.min(W * 0.36, H * 0.2);
      cx = wide ? W * 0.71 : W * 0.5; cy = wide ? H * 0.47 : H * 0.28;
      N = Math.round(((Rh * Rh) / (A.cellW * A.cellH)) * 0.62);
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const put = (px, py, gi, a) => { const x = Math.floor(px / A.cellW), y = Math.floor(py / A.cellH); if (x < 0 || y < 0 || x >= A.cols || y >= A.rows) return; const i = y * A.cols + x; if (A.a[i] < a) { A.g[i] = gi; A.a[i] = a; } };
    S.loop((t, dt) => {
      P.decay(dt);
      // detuning: drag (or move) sideways; otherwise the angle springs back to the golden one
      for (const tp of P.taps.splice(0)) drag = { x: tp.x, a: ang };
      if (!P.down) drag = null;
      if (drag) target = drag.a + (P.x - drag.x) * 0.00012;
      else if (P.active && !P.ui && !P.idle(1500) && !L.coarse) target = GOLD + ((P.x - cx) / A.w) * 0.0045;
      else target = GOLD;
      ang = lerp(ang, target, Math.min(1, dt * (drag ? 10 : 2.2)));
      grown = Math.min(N, grown + dt * N * 0.35);
      A.clear();
      const breathe = 1 + 0.015 * Math.sin(t * 0.8), spin = t * 0.02, n = Math.floor(grown);
      // petals: a ring of rays around the head, swaying
      const petals = 34, pr0 = Rh * 1.02, pr1 = Rh * 1.55;
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * TAU + spin * 0.5 + Math.sin(t * 0.7 + k) * 0.02, len = pr1 + Math.sin(k * 2.7) * Rh * 0.12;
        const steps = Math.ceil((len - pr0) / (A.cellW * 0.6));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps, r = lerp(pr0, len, u), w = Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.1;
          for (const side of [-1, 0, 1]) {
            const aa = a + side * w * (1 - u * 0.4), x = cx + Math.cos(aa) * r, y = cy + Math.sin(aa) * r * 0.98;
            const dx = Math.cos(aa), dy = Math.sin(aa), adx = Math.abs(dx) / A.cellW, ady = Math.abs(dy) / A.cellH;
            const gi = side ? (ady < adx * 0.45 ? RAY.h : adx < ady * 0.45 ? RAY.v : dx * dy > 0 ? RAY.b : RAY.f) : PET[Math.min(5, ((1 - u) * 6) | 0)];
            put(x, y, gi, side ? 0.75 : 0.35 * (1 - u * 0.5));
          }
        }
      }
      // the head: florets placed at the divergence angle, older ones further out and riper
      const c = Rh * breathe / Math.sqrt(Math.max(1, N));
      for (let k = 0; k < n; k++) {
        const r = c * Math.sqrt(k), th = k * ang + spin;
        const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
        const age = k / N, fresh = clamp((grown - k) / (N * 0.05), 0, 1);
        // alternate the 34 parastichies so the spiral arms read, then ripen outward
        const arm = (k % 34) < 17, gi = arm ? SEED[Math.min(4, 2 + ((age * 3) | 0))] : SEED[Math.min(1, (age * 2) | 0)];
        put(x, y, gi, (arm ? 0.55 + 0.45 * (1 - age * 0.4) : 0.3 + 0.25 * age) * fresh);
      }
      if (mask) for (let i = 0; i < A.n; i++) A.a[i] *= mask[i];
      A.render();
      if ((statT -= dt) <= 0) { statT = 0.08; deg.textContent = ((ang * 180) / Math.PI).toFixed(3) + '°'; cnt.textContent = L.fmt(n); }
    });
  },
});
