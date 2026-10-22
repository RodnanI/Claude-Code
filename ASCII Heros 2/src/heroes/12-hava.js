HEROES.push({
  id: 'hava',
  name: 'Hava',
  title: 'Hava · Lift off before the sun does',
  kind: 'Balloon flights, travel',
  tech: 'Sunrise over Cappadocia: three parallax layers of fairy chimneys, a fleet of balloons at different depths drifting on the morning wind. Near balloons have striped gores, rigging and baskets, and climb when their burners fire. Orange is only ever fire and sun.',
  accent: '#ff6b1a',
  fonts: 'family=Bricolage+Grotesque:opsz,wght@12..96,300..700',
  css: `
.h-hava{--bg:#070605;--fg:#f1ebe2;--mut:rgba(241,235,226,.6);--line:rgba(241,235,226,.2);--ink:#f1ebe2;--acc:#ff6b1a;font-family:"Bricolage Grotesque",system-ui,sans-serif}
:root[data-theme=light] .h-hava{--bg:#f3eee6;--fg:#1a1612;--mut:rgba(26,22,18,.62);--line:rgba(26,22,18,.2);--ink:#1a1612;--acc:#f0560a}
.h-hava .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-hava .ui a,.h-hava .ui button{pointer-events:auto}
.h-hava .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:14px}
.h-hava .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:24px;letter-spacing:-.04em}
.h-hava .logo i{width:16px;height:20px;border-radius:50% 50% 45% 45%/60% 60% 40% 40%;background:var(--acc)}
.h-hava .links{display:flex;gap:26px}
.h-hava .links a{opacity:.7;transition:opacity .2s}.h-hava .links a:hover{opacity:1}
.h-hava .tt{display:flex;align-items:center;gap:8px;height:34px;padding:0 14px;border:1px solid var(--line);border-radius:17px;background:none;font-size:13px}
.h-hava .tt .lt,:root[data-theme=light] .h-hava .tt .dk{display:none}
:root[data-theme=light] .h-hava .tt .lt{display:inline}
.h-hava .copy{align-self:start;margin-top:clamp(24px,8vh,96px);max-width:min(640px,54vw)}
.h-hava h1{margin:0 0 18px;font-size:clamp(50px,7.4vw,124px);line-height:.88;font-weight:600;letter-spacing:-.055em;font-variation-settings:"opsz" 96}
.h-hava h1 span{font-weight:300;font-style:normal}
.h-hava .sub{margin:0 0 26px;max-width:40ch;font-size:clamp(15px,1.3vw,18px);line-height:1.5;color:var(--mut)}
.h-hava .book{display:inline-flex;align-items:stretch;border:1px solid var(--line);border-radius:30px;background:var(--bg);overflow:hidden}
.h-hava .book .when{display:flex;flex-direction:column;justify-content:center;gap:3px;padding:0 20px;font-size:12.5px}
.h-hava .book .when b{font-weight:600;font-size:14px}
.h-hava .book .when span{color:var(--mut)}
.h-hava .book a{display:flex;align-items:center;gap:10px;height:58px;padding:0 24px;background:var(--acc);color:#1b0b02;font-weight:600;font-size:15px;border-radius:30px;margin:4px}
.h-hava .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:12px;color:var(--mut)}
.h-hava .foot b{color:var(--fg);font-weight:600}
@media (max-width:980px){.h-hava .links{display:none}}
@media (max-width:760px){
  .h-hava .ui{padding:14px 16px 12px}
  .h-hava .copy{margin-top:2vh;max-width:none}
  .h-hava h1{font-size:clamp(44px,13.5vw,58px);margin-bottom:12px}
  .h-hava .sub{font-size:14.5px;margin-bottom:16px}
  .h-hava .book .when{padding:0 14px;font-size:11.5px}
  .h-hava .book a{height:50px;padding:0 18px;font-size:14px}
  .h-hava .foot .hide{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#"><i aria-hidden="true"></i>hava</a>
    <nav class="links" aria-label="Primary"><a href="#">Flights</a><a href="#">Sunrise times</a><a href="#">Safety</a><a href="#">Questions</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><span class="dk">Dawn</span><span class="lt">Morning</span></button>
  </header>
  <div class="copy">
    <h1 data-mask="text">Lift off<br><span>before the sun does.</span></h1>
    <p class="sub" data-mask="text">Sunrise balloon flights over the valleys of Cappadocia. Pickup at 4:40, an hour in the air, breakfast on the ground when it lands.</p>
    <div class="book"><div class="when"><b>Tomorrow, 05:52</b><span>sunrise &middot; 6 seats left</span></div><a href="#">Book a basket &rarr;</a></div>
  </div>
  <footer class="foot"><span data-mask="text">Wind <b>4 km/h NE</b> &middot; visibility <b>30 km</b> &middot; <b class="up">0</b> balloons up</span><span class="hide" data-mask="text">G&ouml;reme, 38.64&deg; N 34.83&deg; E</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10, inks: ['--ink', '--acc'] });
    const R = new L.Raster(A, 2);
    const P = S.pointer(root);
    const up = root.querySelector('.up');
    const maskEls = [...root.querySelectorAll('[data-mask], .book, .logo, .links a, .tt')];
    const SKY = A.ramp(' .-:=+*'), BAL = A.ramp('.:-=+*#%@'), ROCK = A.ramp('.:;%#@'), FIRE = A.ramp("'^*\"");
    let W = 1, H = 1, hz = 0, sunX = 0, sunR = 0, mask = null, layers = [], fleet = [], upT = 0, par = 0;
    const rnd = L.rng(9);
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 24, floor: 0.07 }); };
    const chimneys = (n, base, hmin, hmax, wmin, wmax, seed) => {
      const r = L.rng(seed), list = [];
      for (let k = 0; k < n; k++) list.push({ x: r() * 1.2 - 0.1, h: hmin + r() * (hmax - hmin), w: wmin + r() * (wmax - wmin), cap: r() < 0.6 });
      return { list, base };
    };
    const setup = () => {
      W = A.w; H = A.h;
      const wide = W > 760;
      hz = H * (wide ? 0.66 : 0.6); sunX = W * (wide ? 0.68 : 0.62); sunR = Math.min(W, H) * (wide ? 0.13 : 0.2);
      layers = [chimneys(26, hz + H * 0.02, 0.03, 0.08, 0.012, 0.03, 3), chimneys(16, hz + H * 0.12, 0.06, 0.16, 0.02, 0.05, 5), chimneys(9, H * 1.0, 0.1, 0.24, 0.035, 0.08, 8)];
      fleet = [];
      const n = wide ? 24 : 13;
      for (let k = 0; k < n; k++) {
        const z = k < n * 0.62 ? 0.08 + rnd() * 0.25 : k < n - 2 ? 0.4 + rnd() * 0.3 : 0.82 + rnd() * 0.18;
        fleet.push({ x: rnd() * W, y: H * (0.12 + rnd() * 0.45) + (1 - z) * H * 0.1, z, vy: 0, fire: 0, next: rnd() * 4, gores: 6 + ((rnd() * 4) | 0) * 2, pat: (rnd() * 3) | 0, ph: rnd() * TAU });
      }
      fleet.sort((a, b) => a.z - b.z);
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const heightAt = (ly, x) => {
      // highest silhouette point of a chimney layer at screen x
      let h = 0;
      for (const c of ly.list) {
        const cx = (c.x + par * (ly === layers[2] ? 0.04 : ly === layers[1] ? 0.02 : 0.008)) * W, half = c.w * W, d = Math.abs(x - cx) / half;
        if (d < 1.6) { const cone = c.h * H * (d < 1 ? (c.cap ? 1 - d * d * 0.6 : 1 - d * 0.75) : Math.max(0, 0.25 - (d - 1) * 0.4)); if (cone > h) h = cone; }
      }
      return ly.base - h - (ly === layers[0] ? L.noise2(x * 0.004, 1) * H * 0.02 : ly === layers[1] ? H * 0.04 + L.noise2(x * 0.006, 2) * H * 0.03 : H * 0.07 + L.noise2(x * 0.005, 9) * H * 0.04);
    };
    const balloon = (ctx, b, s, lit) => {
      // envelope: sphere plus cone to the throat, gores shaded around the curve
      const Rr = s, top = b.y - Rr, cx = b.x;
      const shade = (u, v) => clamp(0.35 + 0.55 * Math.cos(u * 1.35) * (1 - v * 0.25) + lit * (1 - v) * 0.15, 0, 1);
      const rows = 18;
      for (let r = 0; r < rows; r++) {
        const v0 = r / rows, v1 = (r + 1) / rows;
        const w = (v) => { const y = v * 2.35 - 1; return y < 0.25 ? Math.sqrt(Math.max(0, 1 - y * y)) : lerp(Math.sqrt(1 - 0.0625), 0.26, (y - 0.25) / 1.1); };
        const y0 = top + v0 * Rr * 2.35, y1 = top + v1 * Rr * 2.35, w0 = w(v0) * Rr, w1 = w(v1) * Rr;
        for (let g = 0; g < b.gores; g++) {
          const u0 = (g / b.gores) * 2 - 1, u1 = ((g + 1) / b.gores) * 2 - 1, band = (g + b.pat) % 2;
          const v = shade((u0 + u1) / 2, v0) * (band ? 1 : 0.7);
          ctx.fillStyle = `rgb(${(v * 255) | 0},255,0)`;
          ctx.beginPath(); ctx.moveTo(cx + Math.sin(u0 * 1.4) / Math.sin(1.4) * w0, y0); ctx.lineTo(cx + Math.sin(u1 * 1.4) / Math.sin(1.4) * w0, y0); ctx.lineTo(cx + Math.sin(u1 * 1.4) / Math.sin(1.4) * w1, y1); ctx.lineTo(cx + Math.sin(u0 * 1.4) / Math.sin(1.4) * w1, y1); ctx.closePath(); ctx.fill();
        }
      }
      const throat = top + Rr * 2.35, bw = Rr * 0.26, basketY = throat + Rr * 0.42;
      ctx.strokeStyle = 'rgb(120,255,0)'; ctx.lineWidth = Math.max(1, Rr * 0.03);
      ctx.beginPath(); ctx.moveTo(cx - bw, throat); ctx.lineTo(cx - Rr * 0.17, basketY); ctx.moveTo(cx + bw, throat); ctx.lineTo(cx + Rr * 0.17, basketY); ctx.stroke();
      ctx.fillStyle = 'rgb(150,255,0)'; ctx.fillRect(cx - Rr * 0.19, basketY, Rr * 0.38, Rr * 0.26);
      return [cx, throat + Rr * 0.18];
    };

    S.loop((t, dt) => {
      P.decay(dt);
      const dark = L.theme() === 'dark', cols = A.cols, rows = A.rows, g = A.g, al = A.a, kk = A.k, cw = A.cellW, ch = A.cellH;
      par = lerp(par, P.active && !P.ui ? (P.x / W - 0.5) * -1 : 0, Math.min(1, dt * 1.5));
      // fleet drift, burners
      const flames = [];
      for (const b of fleet) {
        b.x += (6 + b.z * 14) * dt; b.ph += dt;
        if (b.x > W + 120) { b.x = -120; b.y = H * (0.12 + Math.random() * 0.45); }
        if ((b.next -= dt) <= 0) { b.fire = 0.5 + Math.random() * 0.9; b.next = 3 + Math.random() * 5; }
        if (b.fire > 0) { b.fire -= dt; b.vy -= 22 * dt; } else b.vy += 6 * dt;
        b.vy = clamp(b.vy * 0.99, -14, 9); b.y += b.vy * dt * (0.4 + b.z);
        b.y = clamp(b.y, H * 0.06, hz - 20);
      }
      const ctx = R.begin();
      for (const b of fleet) {
        const s = lerp(5, W > 760 ? 70 : 46, Math.pow(b.z, 1.6));
        const bx = b.x + par * b.z * 40;
        const save = b.x; b.x = bx;
        const [fx, fy] = balloon(ctx, b, s, b.fire > 0 ? 1 : 0);
        b.x = save;
        if (b.fire > 0 && s > 14) flames.push([fx, fy, s]);
      }
      R.sample();
      A.clear();
      // sky glow and sun
      const sunY = hz - sunR * 0.35 + Math.sin(t * 0.02) * 2;
      for (let y = 0, i = 0; y < rows; y++) {
        const py = (y + 0.5) * ch;
        for (let x = 0; x < cols; x++, i++) {
          const px = (x + 0.5) * cw;
          const ds = Math.hypot((px - sunX) * 0.9, py - sunY);
          if (ds < sunR && py < hz + 4) {
            const e = ds / sunR;
            if (dark) { g[i] = e > 0.9 ? A.glyph('o') : SKY[6]; al[i] = e > 0.9 ? 0.9 : 0.75; } else { if (e > 0.88) { g[i] = A.glyph('o'); al[i] = 0.9; } else if (L.hash(x, y) < 0.25) { g[i] = A.glyph('.'); al[i] = 0.5; } }
            kk[i] = 1; continue;
          }
          const glow = Math.exp(-Math.max(0, hz - py) / (H * 0.32)) * (0.55 + 0.45 * Math.exp(-ds / (W * 0.35)));
          const v = dark ? glow : glow * 0.35;
          if (v > 0.08 && L.hash(x, y, 1) < 0.35 + v) { g[i] = SKY[Math.min(6, (v * 7) | 0)]; al[i] = 0.06 + v * (dark ? 0.45 : 0.35); kk[i] = 0; }
        }
      }
      // balloons
      for (let i = 0; i < A.n; i++) {
        const c = R.g[i];
        if (c < 0.15) continue;
        const v = R.r[i] / c, x = i % cols, y = (i / cols) | 0;
        let gi = L.edge(A, R.g, x, y, 1.3);
        if (gi < 0 || c > 0.95) gi = BAL[Math.min(8, Math.max(1, (v * 9) | 0))];
        g[i] = gi; al[i] = (0.35 + 0.65 * Math.min(1, c * 1.3)) * (0.45 + 0.55 * v); kk[i] = 0;
      }
      // fairy chimneys: one pass, front-most layer wins, outlines follow the walls
      const tops = layers.map((ly) => { const a = new Int16Array(cols); for (let x = 0; x < cols; x++) a[x] = Math.floor(heightAt(ly, (x + 0.5) * cw) / ch); return a; });
      const GT = A.glyph('_'), GL = A.glyph('/'), GR = A.glyph('\\'), GI = A.glyph('|'), GD = A.glyph('.'), GC = A.glyph(':');
      for (let x = 0; x < cols; x++) {
        const y0 = Math.max(0, Math.min(tops[0][x], tops[1][x], tops[2][x]));
        for (let y = y0; y < rows; y++) {
          const li = y >= tops[2][x] ? 2 : y >= tops[1][x] ? 1 : y >= tops[0][x] ? 0 : -1;
          if (li < 0) continue;
          const T = tops[li], i = y * cols + x;
          const openL = x > 0 && y < T[x - 1] && (li === 2 || y < tops[2][x - 1]), openR = x < cols - 1 && y < T[x + 1] && (li === 2 || y < tops[2][x + 1]);
          const isTop = y === T[x];
          kk[i] = 0;
          if (isTop || openL || openR) {
            g[i] = openL && openR ? (isTop ? A.glyph('^') : GI) : openL ? GL : openR ? GR : GT;
            al[i] = dark ? 0.42 + li * 0.2 : 0.55 + li * 0.15;
          } else {
            const h = L.hash(x, y, li);
            if (dark) { g[i] = h < 0.1 ? GD : 0; al[i] = 0.08 + li * 0.05; }
            else { g[i] = h < 0.18 + li * 0.18 ? (li === 2 && h < 0.2 ? GC : GD) : 0; al[i] = 0.25 + li * 0.15; }
          }
        }
      }
      for (const [fx, fy, s] of flames) for (let k = 0; k < 3 + s * 0.05; k++) A.put((fx + (Math.random() - 0.5) * s * 0.18) / cw, (fy - Math.random() * s * 0.35) / ch, FIRE[(Math.random() * 4) | 0], 1, 1);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
      if ((upT -= dt) <= 0) { upT = 1.2; up.textContent = 80 + fleet.length + ((t * 0.1) | 0) % 7; }
    });
  },
});
