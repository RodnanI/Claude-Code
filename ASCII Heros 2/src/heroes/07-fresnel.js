HEROES.push({
  id: 'fresnel',
  name: 'Fresnel',
  title: 'Fresnel · Someone should keep watch',
  kind: 'Encrypted backup',
  tech: 'A storm built from noise: drifting cloud banks, wind-blown rain, a choppy sea that grows toward the viewer. The lamp sweeps a volumetric beam that lights the rain and glitters on the water, flashes when it faces you, and swings round to find the cursor.',
  accent: null,
  fonts: 'family=Gloock&family=DM+Mono:wght@400;500',
  css: `
.h-fresnel{--bg:#040506;--fg:#e7e9ea;--mut:rgba(231,233,234,.56);--line:rgba(231,233,234,.16);--ink:#e7e9ea;font-family:"DM Mono",ui-monospace,monospace}
:root[data-theme=light] .h-fresnel{--bg:#e8e9e6;--fg:#0f1112;--mut:rgba(15,17,18,.6);--line:rgba(15,17,18,.18);--ink:#0f1112}
.h-fresnel .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-fresnel .ui a,.h-fresnel .ui button{pointer-events:auto}
.h-fresnel .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
.h-fresnel .logo{display:flex;align-items:center;gap:12px;font:400 24px/1 "Gloock",Georgia,serif;letter-spacing:.06em}
.h-fresnel .logo i{width:22px;height:22px;border-radius:50%;border:1px solid currentColor;box-shadow:inset 0 0 0 4px var(--bg),inset 0 0 0 5px currentColor,inset 0 0 0 8px var(--bg),inset 0 0 0 9px currentColor}
.h-fresnel .links{display:flex;gap:30px}
.h-fresnel .links a{opacity:.62;transition:opacity .2s}.h-fresnel .links a:hover{opacity:1}
.h-fresnel .r{display:flex;align-items:center;gap:18px}
.h-fresnel .tt{height:30px;padding:0 12px;border:1px solid var(--line);border-radius:15px;background:none;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.h-fresnel .tt .lt,:root[data-theme=light] .h-fresnel .tt .dk{display:none}
:root[data-theme=light] .h-fresnel .tt .lt{display:inline}
.h-fresnel .copy{align-self:start;margin-top:clamp(40px,11vh,130px);max-width:min(600px,50vw)}
.h-fresnel .kick{margin:0 0 22px;font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut)}
.h-fresnel h1{margin:0 0 24px;font:400 clamp(46px,6.4vw,100px)/.98 "Gloock",Georgia,serif;letter-spacing:-.02em}
.h-fresnel .sub{margin:0 0 30px;max-width:44ch;font-size:clamp(13px,1.05vw,15px);line-height:1.7;color:var(--mut)}
.h-fresnel .cta{display:flex;flex-wrap:wrap;gap:12px}
.h-fresnel .btn{display:inline-flex;align-items:center;gap:12px;height:48px;padding:0 22px;border-radius:24px;background:var(--fg);color:var(--bg);font-size:12.5px;letter-spacing:.06em}
.h-fresnel .btn small{opacity:.6}
.h-fresnel .ghost{display:inline-flex;align-items:center;height:48px;padding:0 20px;border-radius:24px;border:1px solid var(--line);font-size:12.5px;letter-spacing:.06em;background:var(--bg)}
.h-fresnel .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.h-fresnel .foot b{color:var(--fg);font-weight:500}
@media (max-width:980px){.h-fresnel .links{display:none}}
@media (max-width:760px){
  .h-fresnel .ui{padding:14px 16px 12px}
  .h-fresnel .copy{align-self:end;margin:0 0 14px;max-width:none}
  .h-fresnel .kick{font-size:10px;margin-bottom:12px}
  .h-fresnel h1{font-size:clamp(40px,12vw,52px);margin-bottom:12px}
  .h-fresnel .sub{font-size:12.5px;line-height:1.6;margin-bottom:18px}
  .h-fresnel .btn,.h-fresnel .ghost{height:44px;padding:0 16px}
  .h-fresnel .foot .hide{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#"><i aria-hidden="true"></i>Fresnel</a>
    <nav class="links" aria-label="Primary"><a href="#">Product</a><a href="#">Security</a><a href="#">Pricing</a><a href="#">Docs</a></nav>
    <div class="r"><a href="#">Log in</a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><span class="dk">Night watch</span><span class="lt">Day watch</span></button></div>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">End-to-end encrypted backup</p>
    <h1 data-mask="text">Someone should<br>keep watch.</h1>
    <p class="sub" data-mask="text">Fresnel encrypts every file before it leaves your device, keeps three copies in three countries and checks on all of them every night. If the worst happens, there is always a light on.</p>
    <div class="cta"><a class="btn" href="#">Start free <small>50 GB</small></a><a class="ghost" href="#">How the encryption works</a></div>
  </div>
  <footer class="foot"><span data-mask="text">Last check <b class="chk">02:14</b> &middot; 3 of 3 copies verified</span><span class="hide" data-mask="text">Beam rotation 10 s &middot; visible 18 nautical miles</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const P = S.pointer(root);
    const chk = root.querySelector('.chk');
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .ghost, .logo, .links a, .r > *')];
    const CLOUD = A.ramp('.:-~=+*'), BEAM = A.ramp('.-:=+*#'), SEA = A.ramp('.-~=~'), FOAM = A.ramp(".'*o"), ROCK = A.ramp('.,:;'), RAIN = A.glyph('/'), RAIN2 = A.glyph('|');
    const G = (c) => A.glyph(c);
    let W = 1, H = 1, hz = 0, Lx = 0, Ly = 0, cliffX = 0, cliffTop = 0, mask = null, rain = [], flash = 0, bolt = null, boltT = 6, aim = 0, beamA = 0, chkT = 0;
    const cliff = [];
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 28, floor: 0.06 }); };
    const setup = () => {
      W = A.w; H = A.h;
      const wide = W > 760;
      hz = Math.round(A.rows * (wide ? 0.72 : 0.56));
      cliffX = Math.round(A.cols * (wide ? 0.72 : 0.5));
      cliffTop = Math.round(A.rows * (wide ? 0.58 : 0.42));
      const tx = Math.round(A.cols * (wide ? 0.84 : 0.78));
      Lx = (tx + 0.5) * A.cellW;
      Ly = (cliffTop - (wide ? 24 : 16) + 0.5) * A.cellH;
      cliff.length = 0;
      for (let x = 0; x < A.cols; x++) {
        if (x < cliffX) { cliff.push(1e9); continue; }
        const u = (x - cliffX) / Math.max(1, A.cols - cliffX), rise = Math.min(1, Math.pow(u * 2.6, 0.7));
        cliff.push(Math.round(hz + 1 - rise * (hz + 1 - cliffTop) + L.noise2(x * 0.4, 4) * 1.2 * rise));
      }
      rain = Array.from({ length: Math.round((A.cols * A.rows) / (wide ? 20 : 16)) }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 520 + Math.random() * 420 }));
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const tower = (t, dark) => {
      const tx = Math.round(Lx / A.cellW - 0.5), top = Math.round(Ly / A.cellH - 0.5), base = cliff[tx] - 1, hgt = base - top - 3;
      // tower: tapered, banded
      for (let r = 0; r <= hgt; r++) {
        const y = top + 3 + r, half = Math.round(1.5 + (r / hgt) * 2.6);
        for (let dx = -half; dx <= half; dx++) {
          const edge = dx === -half || dx === half, band = Math.floor(r / 3) % 2 === 0;
          A.put(tx + dx, y, edge ? G(dx < 0 ? '/' : '\\') : band ? G('#') : G(':'), edge ? 0.95 : band ? 0.85 : 0.45);
        }
        if (r === Math.round(hgt * 0.45)) A.put(tx, y, G('o'), 0.9);
      }
      A.put(tx, base, G('n'), 0.9);
      // gallery, lantern room, dome
      A.text(tx - 3, top + 2, '+=+=+=+', 0.9);
      A.text(tx - 2, top + 1, '|', 0.9); A.text(tx + 2, top + 1, '|', 0.9);
      A.put(tx - 1, top + 1, G('['), 0.9); A.put(tx + 1, top + 1, G(']'), 0.9);
      A.put(tx, top + 1, G('@'), 1);
      A.text(tx - 2, top, '/', 0.9); A.text(tx + 2, top, '\\', 0.9); A.text(tx - 1, top, '___', 0.8); A.put(tx, top - 1, G('^'), 0.9);
      // keeper's cottage with a lit window
      const hx = tx - 9, hb = cliff[Math.max(0, hx)] - 1;
      if (hx > cliffX) {
        A.text(hx, hb - 2, '  ____  ', 0.85); A.text(hx, hb - 1, ' /    \\ ', 0.85); A.text(hx, hb, ' |[]  | ', 0.85);
        A.put(hx + 3, hb, G('#'), dark ? 0.9 + 0.1 * Math.sin(t * 9) : 0.4);
      }
    };

    S.loop((t, dt) => {
      P.decay(dt);
      const dark = L.theme() === 'dark', cols = A.cols, rows = A.rows, g = A.g, al = A.a, cw = A.cellW, ch = A.cellH;
      // beam azimuth: free rotation, or swing to the pointer
      const spin = t * (TAU / 12);
      const hunting = P.active && !P.ui && !P.idle(2500);
      aim = lerp(aim, hunting ? 1 : 0, Math.min(1, dt * 2));
      const free = Math.cos(spin) >= 0 ? 0.04 : Math.PI - 0.04, toward = Math.atan2(P.y - Ly, P.x - Lx);
      const reach = lerp(Math.pow(Math.abs(Math.cos(spin)), 0.6), 1, aim);
      beamA = hunting || aim > 0.02 ? L.angle(beamA, lerp(free, toward, aim) , Math.min(1, dt * 4)) : free;
      const facing = (1 - aim) * Math.pow(Math.max(0, Math.sin(spin)), 18);
      // weather
      if ((boltT -= dt) <= 0) {
        boltT = 7 + Math.random() * 9; flash = 1;
        let x = Math.random() * cols * 0.6, y = 0; bolt = [];
        while (y < hz) { const dx = Math.round((Math.random() - 0.5) * 3); bolt.push([x, y, dx < 0 ? '/' : dx > 0 ? '\\' : '|']); x += dx; y++; if (Math.random() < 0.08) { let bx = x, by = y; for (let k = 0; k < 6; k++) { bx += Math.random() < 0.5 ? 1 : -1; by++; bolt.push([bx, by, '\\']); } } }
      }
      flash = Math.max(0, flash - dt * 3.2);
      A.clear();
      const wind = t * 1.8, fl = dark ? flash : flash * 0.4, halo = facing * W * 0.15;
      for (let y = 0, i = 0; y < rows; y++) {
        const py = (y + 0.5) * ch;
        for (let x = 0; x < cols; x++, i++) {
          if (y >= cliff[x]) continue;
          const px = (x + 0.5) * cw, dx = px - Lx, dy = py - Ly, d = Math.hypot(dx, dy) + 1;
          // beam: a cone that is wide at the lens and narrows with distance, lit by fog
          let da = Math.atan2(dy, dx) - beamA; da = Math.atan2(Math.sin(da), Math.cos(da));
          const wa = 0.065 + Math.atan(38 / d);
          let b = Math.min(1.2, 1.7 * Math.exp(-(da * da) / (wa * wa)) * reach * Math.exp(-d / (W * 1.3)));
          if (b > 0.015) b *= 0.5 + 0.7 * (0.5 + 0.5 * L.noise3(x * 0.06 - wind * 0.35, y * 0.13, t * 0.25));
          if (halo > 1) b += facing * 0.7 * Math.exp(-(2 * d * d) / (halo * halo));
          b += Math.exp(-(d * d) / 900) * 0.8;
          if (y < hz) {
            const c = L.noise3(x * 0.032 - wind * 0.05, y * 0.1, t * 0.04) * 0.7 + L.noise3(x * 0.09 - wind * 0.12, y * 0.24, t * 0.07) * 0.3 + 0.1 - (y / hz) * 0.45;
            const cv = clamp(c * 1.9, 0, 1);
            if (b < 0.04 && cv < 0.05) continue;
            if (b > cv * 0.4) { g[i] = BEAM[Math.min(6, (b * 5.6) | 0)]; al[i] = 0.12 + 0.88 * Math.min(1, b); }
            else { g[i] = CLOUD[Math.min(6, (cv * 7) | 0)]; al[i] = 0.07 + cv * (0.32 + fl * 0.6) + b * 0.4; }
          } else {
            // sea: waves grow toward the viewer, crests foam, the beam glitters on it
            const depth = (y - hz) / Math.max(1, rows - hz), k = lerp(0.45, 0.08, depth);
            const w = L.noise3(x * k - t * (0.6 + depth), y * k * 1.8, t * 0.4) + 0.3 * L.noise2(x * k * 2.4 + t * 1.3, y * 0.8);
            const glit = Math.min(1, b * 2.2) * (0.5 + 0.5 * L.noise2(x * 0.9 + t * 3, y * 1.3));
            if (w > 0.6 - depth * 0.12) { g[i] = FOAM[Math.min(3, ((w - 0.5) * 7) | 0)]; al[i] = 0.35 + 0.55 * Math.min(1, glit + 0.25) + fl * 0.3; }
            else if (glit > 0.12) { g[i] = BEAM[Math.min(6, (glit * 7) | 0)]; al[i] = Math.min(1, 0.2 + glit); }
            else { const s = clamp((w + 0.7) * 0.65, 0, 1); g[i] = SEA[Math.min(4, (s * 5) | 0)]; al[i] = 0.08 + 0.3 * s * (0.45 + depth) + fl * 0.15; }
          }
        }
      }
      // the headland: bright rim, sparse strata below
      for (let x = cliffX; x < cols; x++) for (let y = cliff[x]; y < rows; y++) {
        const i = y * cols + x, top = y === cliff[x], sl = x + 1 < cols ? cliff[x + 1] - cliff[x] : 0, n = L.noise2(x * 0.22, y * 0.9);
        if (top) { g[i] = G(sl > 0 ? '\\' : sl < 0 ? '/' : '_'); al[i] = 0.95; continue; }
        const strata = Math.abs(L.noise2(x * 0.05, y * 0.6)) < 0.08;
        g[i] = strata ? G('-') : ROCK[clamp(((n + 0.7) * 2.2) | 0, 0, 3)];
        al[i] = strata ? 0.4 : 0.1 + 0.16 * (n + 1) + fl * 0.2;
      }
      // rain, lit where it crosses the beam
      for (const r of rain) {
        r.y += r.v * dt; r.x -= r.v * 0.32 * dt;
        if (r.y > H || r.x < 0) { r.y = -Math.random() * 60; r.x = Math.random() * (W + H * 0.4); }
        const x = Math.floor(r.x / cw), y = Math.floor(r.y / ch);
        if (x < 0 || x >= cols || y < 0 || y >= rows || y >= cliff[x]) continue;
        const i = y * cols + x;
        let da = Math.atan2(r.y - Ly, r.x - Lx) - beamA; da = Math.atan2(Math.sin(da), Math.cos(da));
        const lit = Math.exp(-(da * da) / 0.012) * reach;
        const a = 0.2 + lit * 0.8 + fl * 0.3;
        if (al[i] < a) { g[i] = r.v > 800 ? RAIN2 : RAIN; al[i] = a; }
      }
      if (bolt && flash > 0.15) for (const [x, y, c] of bolt) A.put(x, y, G(c), Math.min(1, flash * 1.4));
      tower(t, dark);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
      if ((chkT -= dt) <= 0) { chkT = 20; const d = new Date(Date.now() - 41 * 60000); chk.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    });
  },
});
