HEROES.push({
  id: 'orsola',
  name: 'Orsola',
  title: 'Orsola · Weightless, Spring Summer 2027',
  kind: 'Fashion house',
  tech: 'Verlet cloth hung from curtain rings: structural, shear and bend constraints, gusting wind, Lambert plus a tight silk specular, back faces darker. The sheet occludes a giant headline behind it. Drag the silk, or push it with the cursor.',
  accent: null,
  fonts: 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Jost:wght@400;500',
  css: `
.h-orsola{--bg:#0b0a09;--fg:#efe9df;--mut:rgba(239,233,223,.56);--line:rgba(239,233,223,.18);--ink:#efe9df;font-family:"Jost",system-ui,sans-serif}
:root[data-theme=light] .h-orsola{--bg:#f1ece3;--fg:#141210;--mut:rgba(20,18,16,.6);--line:rgba(20,18,16,.18);--ink:#141210}
.h-orsola .giant{position:absolute;left:0;right:0;top:50%;z-index:-1;transform:translateY(-46%);margin:0;text-align:center;font:italic 400 clamp(90px,19vw,330px)/.8 "Bodoni Moda",Didot,Georgia,serif;letter-spacing:-.05em;white-space:nowrap;color:var(--fg);opacity:.92;pointer-events:none}
.h-orsola .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:22px clamp(18px,3.4vw,52px) 20px;pointer-events:none}
.h-orsola .ui a,.h-orsola .ui button{pointer-events:auto}
.h-orsola .nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;font-size:11.5px;letter-spacing:.22em;text-transform:uppercase}
.h-orsola .links{display:flex;gap:28px}
.h-orsola .links a{opacity:.7;transition:opacity .2s}.h-orsola .links a:hover{opacity:1}
.h-orsola .logo{font:400 28px/1 "Bodoni Moda",Didot,serif;letter-spacing:.38em;padding-left:.38em}
.h-orsola .r{display:flex;justify-content:flex-end;align-items:center;gap:22px}
.h-orsola .tt{border:0;background:none;padding:6px 0;font:inherit;letter-spacing:inherit;display:flex;align-items:center;gap:8px}
.h-orsola .tt i{width:22px;height:1px;background:currentColor;position:relative}
.h-orsola .tt i::after{content:"";position:absolute;top:-3px;left:0;width:7px;height:7px;border-radius:50%;background:currentColor;transition:transform .4s cubic-bezier(.6,0,.2,1)}
:root[data-theme=light] .h-orsola .tt i::after{transform:translateX(15px)}
.h-orsola .bottom{grid-row:3;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.h-orsola .copy{max-width:380px}
.h-orsola .season{margin:0 0 14px;font-size:11px;letter-spacing:.3em;text-transform:uppercase}
.h-orsola .sub{margin:0 0 22px;font:italic 400 clamp(18px,1.5vw,22px)/1.38 "Bodoni Moda",Georgia,serif;color:var(--fg)}
.h-orsola .cta{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.h-orsola .btn{display:inline-flex;align-items:center;height:48px;padding:0 26px;background:var(--fg);color:var(--bg);font-size:11px;letter-spacing:.26em;text-transform:uppercase}
.h-orsola .lnk{font-size:11px;letter-spacing:.26em;text-transform:uppercase;border-bottom:1px solid var(--fg);padding-bottom:3px}
.h-orsola .look{text-align:right;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);line-height:1.8}
.h-orsola .look b{color:var(--fg);font-weight:500}
@media (max-width:980px){.h-orsola .links{display:none}.h-orsola .nav{grid-template-columns:auto 1fr;}.h-orsola .logo{justify-self:start}}
@media (max-width:760px){
  .h-orsola .ui{padding:14px 16px 14px}
  .h-orsola .logo{font-size:22px;letter-spacing:.3em}
  .h-orsola .r .bag{display:none}
  .h-orsola .giant{top:33%;font-size:28vw}
  .h-orsola .bottom{flex-direction:column;align-items:flex-start;gap:14px}
  .h-orsola .look{text-align:left;font-size:10px}
  .h-orsola .sub{font-size:17px;margin-bottom:16px}
  .h-orsola .btn{height:46px;padding:0 20px}
}`,
  html: `
<p class="giant" aria-hidden="true">Weightless</p>
<div class="ui">
  <header class="nav">
    <nav class="links" aria-label="Primary"><a href="#">Collections</a><a href="#">Atelier</a><a href="#">Journal</a></nav>
    <a class="logo" href="#">ORSOLA</a>
    <div class="r"><a class="bag" href="#">Bag (0)</a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i></button></div>
  </header>
  <div class="bottom">
    <div class="copy">
      <h1 class="sr">Orsola, Weightless, Spring Summer 2027</h1>
      <p class="season" data-mask="text">Spring / Summer 2027</p>
      <p class="sub" data-mask="text">Seventeen looks cut from a single bolt of washed silk, draped rather than sewn.</p>
      <div class="cta"><a class="btn" href="#">Shop the collection</a><a class="lnk" href="#">Watch the show</a></div>
    </div>
    <p class="look" data-mask="text">Look <b>04</b> / 17<br>Washed silk charmeuse, ivory<br>Drag the silk</p>
  </div>
</div>`,
  init: function (root, L, S) {
    const { clamp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const R = new L.Raster(A, 2);
    const P = S.pointer(root);
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .lnk, .logo, .links a, .r > *')];
    const RAMP = A.ramp(' .:-=+*#%@');
    let NX = 0, NY = 0, px, py, pz, ox, oy, oz, pin, links = [], mask = null, grab = -1, bg = '#000', cov = null, rodY = 0, rodX0 = 0, rodX1 = 0;
    const readBg = () => { bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#000'; };
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 22, floor: 0.08 }); };
    const setup = () => {
      const W = A.w, H = A.h, wide = W > 760;
      NX = wide ? 30 : 20; NY = wide ? 24 : 18;
      const x0 = wide ? W * 0.36 : W * 0.08, x1 = wide ? W * 0.9 : W * 0.92, top = H * (wide ? 0.1 : 0.08), height = H * (wide ? 0.66 : 0.5);
      rodY = top - 10; rodX0 = x0 - 30; rodX1 = x1 + 30;
      const n = NX * NY, sx = (x1 - x0) / (NX - 1), sy = height / (NY - 1);
      px = new Float32Array(n); py = new Float32Array(n); pz = new Float32Array(n); ox = new Float32Array(n); oy = new Float32Array(n); oz = new Float32Array(n); pin = new Uint8Array(n);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        px[k] = ox[k] = x0 + i * sx; py[k] = oy[k] = top + j * sy * 0.9; pz[k] = oz[k] = Math.sin(i * 1.7) * 14 + Math.sin(j * 0.7 + i) * 4;
        if (j === 0 && (i % 3 === 0 || i === NX - 1)) pin[k] = 1;
      }
      links = [];
      const add = (a, b, w) => links.push(a, b, Math.hypot(px[a] - px[b], py[a] - py[b], pz[a] - pz[b]), w);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        if (i < NX - 1) add(k, k + 1, 1);
        if (j < NY - 1) add(k, k + NX, 1);
        if (i < NX - 1 && j < NY - 1) { add(k, k + NX + 1, 0.6); add(k + 1, k + NX, 0.6); }
        if (i < NX - 2) add(k, k + 2, 0.25);
        if (j < NY - 2) add(k, k + NX * 2, 0.25);
      }
      // gather the rings together: the sheet now has slack, so it falls into folds and swags
      const mid = (x0 + x1) / 2;
      for (let k = 0; k < n; k++) { const f = 0.66; px[k] = ox[k] = mid + (px[k] - mid) * (pin[k] ? f : 0.8 + 0.2 * (k / NX / NY)); }
      rodX0 = mid - (mid - x0) * 0.66 - 30; rodX1 = mid + (x1 - mid) * 0.66 + 30;
      readBg();
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);
    S.on(window, 'ascii:theme', () => { readBg(); });
    // occlusion: cloth cells are painted with the page colour so the giant type sits behind the silk
    A.under = (ctx, a) => {
      if (!cov) return;
      ctx.fillStyle = bg;
      for (let y = 0; y < a.rows; y++) {
        let run = -1;
        for (let x = 0; x <= a.cols; x++) {
          const on = x < a.cols && cov[y * a.cols + x] > 0.4;
          if (on && run < 0) run = x;
          if (!on && run >= 0) { ctx.fillRect(run * a.cw, y * a.ch, (x - run) * a.cw, a.ch); run = -1; }
        }
      }
    };

    const simulate = (t, dt) => {
      const n = NX * NY, g = 1400, d2 = dt * dt;
      const gust = 0.5 + 0.5 * L.noise2(t * 0.25, 7), dir = L.noise2(t * 0.1, 3);
      for (let k = 0; k < n; k++) {
        if (pin[k] || k === grab) continue;
        const vx = (px[k] - ox[k]) * 0.985, vy = (py[k] - oy[k]) * 0.985, vz = (pz[k] - oz[k]) * 0.985;
        ox[k] = px[k]; oy[k] = py[k]; oz[k] = pz[k];
        const j = (k / NX) | 0, i = k % NX, w = L.noise3(i * 0.18 - t * 0.6, j * 0.14, t * 0.3);
        px[k] += vx + (dir * 180 * gust + w * 90) * d2;
        py[k] += vy + g * d2;
        pz[k] += vz + (w * 2200 + 250) * gust * d2;
      }
      if (P.active && !P.ui && grab < 0) {
        const r = A.w > 760 ? 90 : 60;
        for (let k = 0; k < n; k++) {
          if (pin[k]) continue;
          const dx = px[k] - P.x, dy = py[k] - P.y, d = Math.hypot(dx, dy);
          if (d < r && d > 0.01) { const f = (r - d) / r; px[k] += (dx / d) * f * 6; py[k] += (dy / d) * f * 6; pz[k] -= f * 14; }
        }
      }
      if (grab >= 0) { px[grab] = P.x; py[grab] = P.y; pz[grab] = 30; }
      for (let it = 0; it < 6; it++) {
        for (let q = 0; q < links.length; q += 4) {
          const a = links[q], b = links[q + 1], rest = links[q + 2], w = links[q + 3];
          const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a], d = Math.hypot(dx, dy, dz) || 1;
          const diff = ((d - rest) / d) * 0.5 * w;
          const fa = pin[a] || a === grab ? 0 : 1, fb = pin[b] || b === grab ? 0 : 1, s = fa + fb;
          if (!s) continue;
          const ka = (fa / s) * 2 * diff, kb = (fb / s) * 2 * diff;
          px[a] += dx * ka; py[a] += dy * ka; pz[a] += dz * ka;
          px[b] -= dx * kb; py[b] -= dy * kb; pz[b] -= dz * kb;
        }
      }
    };

    const Lx = -0.75, Ly = -0.35, Lz = 0.55, Ln = Math.hypot(Lx, Ly, Lz), lx = Lx / Ln, ly = Ly / Ln, lz = Lz / Ln;
    const hx0 = lx, hy0 = ly, hz0 = lz + 1, hn = Math.hypot(hx0, hy0, hz0), hx = hx0 / hn, hy = hy0 / hn, hz = hz0 / hn;
    const shadeTri = (ctx, a, b, c) => {
      const ux = px[b] - px[a], uy = py[b] - py[a], uz = pz[b] - pz[a], vx = px[c] - px[a], vy = py[c] - py[a], vz = pz[c] - pz[a];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      let back = false;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; back = true; }
      const dif = Math.max(0, nx * lx + ny * ly + nz * lz), spec = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 36);
      const v = clamp((back ? 0.04 + 0.36 * dif : 0.06 + 0.72 * Math.pow(dif, 1.4)) + spec * (back ? 0.2 : 0.95), 0, 1);
      const col = 'rgb(' + ((v * 255) | 0) + ',255,0)';
      ctx.fillStyle = col; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]); ctx.lineTo(px[c], py[c]); ctx.closePath(); ctx.fill(); ctx.stroke();
    };

    S.loop((t, dt) => {
      if (!px) return;
      P.decay(dt);
      for (const tp of P.taps.splice(0)) {
        let best = -1, bd = 70;
        for (let k = 0; k < NX * NY; k++) { const d = Math.hypot(px[k] - tp.x, py[k] - tp.y); if (d < bd && !pin[k]) { bd = d; best = k; } }
        grab = best;
      }
      if (!P.down) grab = -1;
      const h = Math.min(dt, 1 / 30);
      simulate(t, h / 2); simulate(t, h / 2);
      const ctx = R.begin();
      ctx.lineWidth = 0.8;
      for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) { const k = j * NX + i; shadeTri(ctx, k, k + 1, k + NX); shadeTri(ctx, k + 1, k + NX + 1, k + NX); }
      R.sample();
      cov = R.g;
      A.clear();
      const cols = A.cols, rows = A.rows, g = A.g, al = A.a, lum = R.r;
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        const c = cov[i];
        if (c < 0.12) continue;
        const v = lum[i] / c;
        let gi = L.edge(A, cov, x, y, 1.4);
        if (gi < 0 || c > 0.95) { gi = L.edge(A, lum, x, y, 1.15); if (gi < 0 || v > 0.75) gi = RAMP[Math.min(9, Math.max(1, (v * 10) | 0))]; }
        g[i] = gi; al[i] = (0.3 + 0.7 * Math.min(1, c * 1.2)) * (0.35 + 0.65 * v);
      }
      // the rod and its rings
      const ry = Math.floor(rodY / A.cellH);
      for (let x = Math.floor(rodX0 / A.cellW); x <= Math.floor(rodX1 / A.cellW); x++) A.put(x, ry, A.glyph('='), 0.85);
      for (let k = 0; k < NX; k++) if (pin[k]) A.put(px[k] / A.cellW, ry + 0.6, A.glyph('o'), 1);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
    });
  },
});
