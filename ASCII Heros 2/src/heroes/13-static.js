HEROES.push({
  id: 'static',
  name: 'Static',
  title: 'Static One · Store the storm',
  kind: 'Home battery',
  tech: 'A plasma globe: filaments are fractal random walks from the electrode to points wandering on a 3D sphere, with forks where they meet the glass and glow drawn under a crisp stroked core. Touch the glass and the discharge finds your finger.',
  accent: null,
  fonts: 'family=Unbounded:wght@300;500;700&family=Instrument+Sans:wght@400;500',
  css: `
.h-static{--bg:#030303;--fg:#ececec;--mut:rgba(236,236,236,.56);--line:rgba(236,236,236,.16);--ink:#ececec;font-family:"Instrument Sans",system-ui,sans-serif}
:root[data-theme=light] .h-static{--bg:#ededeb;--fg:#0c0c0c;--mut:rgba(12,12,12,.6);--line:rgba(12,12,12,.16);--ink:#0c0c0c}
.h-static .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-static .ui a,.h-static .ui button{pointer-events:auto}
.h-static .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13.5px}
.h-static .logo{font:700 19px/1 "Unbounded",system-ui,sans-serif;letter-spacing:.06em}
.h-static .links{display:flex;gap:28px}
.h-static .links a{opacity:.62;transition:opacity .2s}.h-static .links a:hover{opacity:1}
.h-static .r{display:flex;gap:10px;align-items:center}
.h-static .res{height:36px;display:inline-flex;align-items:center;padding:0 16px;border-radius:18px;background:var(--fg);color:var(--bg);font-weight:500}
.h-static .tt{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:none;display:grid;place-items:center}
.h-static .tt i{width:14px;height:14px;border-radius:50%;border:1.5px solid currentColor;position:relative;overflow:hidden}
.h-static .tt i::after{content:"";position:absolute;inset:0;background:currentColor;transform:translateX(50%)}
.h-static .copy{align-self:center;max-width:min(560px,46vw)}
.h-static .kick{display:inline-flex;align-items:center;gap:10px;margin:0 0 22px;font-size:13px;color:var(--mut)}
.h-static .kick b{font:500 10.5px/1 "Unbounded",sans-serif;letter-spacing:.08em;padding:6px 9px;border:1px solid var(--line);border-radius:12px;color:var(--fg)}
.h-static h1{margin:0 0 24px;font:500 clamp(44px,6vw,98px)/.95 "Unbounded",system-ui,sans-serif;letter-spacing:-.05em}
.h-static h1 span{font-weight:300}
.h-static .sub{margin:0 0 30px;max-width:42ch;font-size:clamp(15px,1.25vw,18px);line-height:1.55;color:var(--mut)}
.h-static .cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.h-static .btn{display:inline-flex;align-items:center;gap:12px;height:52px;padding:0 24px;border-radius:26px;background:var(--fg);color:var(--bg);font-weight:500;font-size:15px}
.h-static .btn small{opacity:.6;font-size:13px}
.h-static .ghost{display:inline-flex;align-items:center;height:52px;padding:0 22px;border-radius:26px;border:1px solid var(--line);font-size:15px;background:var(--bg)}
.h-static .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:12px;color:var(--mut)}
.h-static .specs{display:flex;gap:clamp(18px,2.6vw,40px)}
.h-static .specs span{display:flex;flex-direction:column;gap:6px}
.h-static .specs b{font:500 clamp(15px,1.4vw,20px)/1 "Unbounded",sans-serif;color:var(--fg);letter-spacing:-.03em}
@media (max-width:980px){.h-static .links{display:none}}
@media (max-width:760px){
  .h-static .ui{padding:14px 16px 12px}
  .h-static .res{display:none}
  .h-static .copy{align-self:end;max-width:none;margin-bottom:16px}
  .h-static .kick{margin-bottom:12px}
  .h-static h1{font-size:clamp(38px,11.5vw,50px);margin-bottom:12px}
  .h-static .sub{font-size:14.5px;margin-bottom:18px}
  .h-static .btn,.h-static .ghost{height:46px;padding:0 18px;font-size:14px}
  .h-static .specs span:nth-child(n+3),.h-static .hint{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">STATIC</a>
    <nav class="links" aria-label="Primary"><a href="#">Static One</a><a href="#">How it works</a><a href="#">Installers</a><a href="#">Support</a></nav>
    <div class="r"><a class="res" href="#">Reserve</a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i></button></div>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text"><b>NEW</b>Static One home battery</p>
    <h1 data-mask="text">Store<br><span>the storm.</span></h1>
    <p class="sub" data-mask="text">A 14 kWh battery that charges from your roof, keeps the lights on when the grid goes down, and sells the surplus back when it pays.</p>
    <div class="cta"><a class="btn" href="#">Reserve <small>EUR 190 deposit</small></a><a class="ghost" href="#">How it works</a></div>
  </div>
  <footer class="foot"><div class="specs" data-mask="text"><span>Capacity<b>14 kWh</b></span><span>Peak<b>10 kW</b></span><span>Switchover<b>0 ms</b></span><span>Warranty<b>15 yr</b></span></div><span class="hint" data-mask="text">Put your hand on the glass</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const R = new L.Raster(A, 2);
    const P = S.pointer(root);
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .ghost, .logo, .links a, .r > *')];
    const GLOW = A.ramp(' .:-=+*'), GH = A.glyph('-'), GV = A.glyph('|'), GF = A.glyph('/'), GB = A.glyph('\\'), CORE = A.ramp('o0@');
    let cx = 0, cy = 0, Rg = 100, mask = null, fils = [], touch = 0, tx = 0, ty = 0;
    const rnd = L.rng(4);
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 26, floor: 0.06 }); };
    const setup = () => {
      const W = A.w, H = A.h, wide = W > 760;
      Rg = wide ? Math.min(H * 0.34, W * 0.22) : Math.min(W * 0.4, H * 0.22);
      cx = wide ? W * 0.72 : W * 0.5; cy = wide ? H * 0.45 : H * 0.27;
      fils = Array.from({ length: wide ? 13 : 10 }, (_, k) => ({ th: rnd() * TAU, ph: (rnd() - 0.5) * 2.4, seed: rnd() * 100, w: 0.6 + rnd() * 0.4, vt: (rnd() - 0.5) * 0.4, vp: (rnd() - 0.5) * 0.3 }));
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const stamp = (px, py, gi, a) => {
      const x = Math.floor(px / A.cellW), y = Math.floor(py / A.cellH);
      if (x < 0 || y < 0 || x >= A.cols || y >= A.rows) return;
      const i = y * A.cols + x;
      if (A.a[i] < a) { A.g[i] = gi; A.a[i] = a; }
    };
    const strokeGlyphs = (pts, a) => {
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], dx = x1 - x0, dy = y1 - y0, an = Math.atan2(Math.abs(dy), Math.abs(dx));
        const gi = an < 0.47 ? GH : an > 1.1 ? GV : dx * dy > 0 ? GB : GF, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / A.cellW, Math.abs(dy) / A.cellH) * 1.3));
        for (let j = 0; j <= n; j++) stamp(x0 + (dx * j) / n, y0 + (dy * j) / n, gi, a);
      }
    };
    // a discharge from (x0,y0) to (x1,y1): midpoint-noise displacement that keeps its shape between frames
    const bolt = (x0, y0, x1, y1, seed, t, jag) => {
      const pts = [], n = 26, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      for (let k = 0; k <= n; k++) {
        const s = k / n, env = Math.sin(Math.PI * s) * (0.35 + 0.65 * s);
        const off = (L.noise2(seed + s * 3.2, t * 1.6) * 0.65 + L.noise2(seed * 2 + s * 9, t * 3.1) * 0.35) * len * jag * env;
        pts.push([x0 + dx * s + nx * off, y0 + dy * s + ny * off]);
      }
      return pts;
    };

    S.loop((t, dt) => {
      P.decay(dt);
      const dark = L.theme() === 'dark';
      // is the pointer on (or just outside) the glass?
      const dxp = P.x - cx, dyp = P.y - cy, dp = Math.hypot(dxp, dyp);
      const on = P.active && !P.ui && dp < Rg * 1.35;
      touch = lerp(touch, on ? 1 : 0, Math.min(1, dt * (on ? 6 : 2)));
      if (on) { const k = Math.min(dp, Rg * 0.97) / (dp || 1); tx = cx + dxp * k; ty = cy + dyp * k; }
      const ctx = R.begin();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const cores = [];
      for (let f = 0; f < fils.length; f++) {
        const fl = fils[f];
        fl.th += (fl.vt + L.noise2(fl.seed, t * 0.2) * 0.5) * dt; fl.ph = clamp(fl.ph + (fl.vp + L.noise2(fl.seed + 5, t * 0.17) * 0.4) * dt, -1.35, 1.35);
        if (Math.abs(fl.ph) >= 1.34) fl.vp = -fl.vp;
        // point on the sphere: x,y projected, z gives depth (back filaments are dimmer)
        let ex = cx + Math.cos(fl.th) * Math.cos(fl.ph) * Rg * 0.97, ey = cy + Math.sin(fl.ph) * Rg * 0.97, z = Math.sin(fl.th) * Math.cos(fl.ph);
        const grab = touch > 0.05 && f % 5 !== 4 ? touch : 0;
        if (grab) { ex = lerp(ex, tx, grab); ey = lerp(ey, ty, grab); z = lerp(z, 1, grab); }
        const flick = 0.7 + 0.3 * L.noise2(fl.seed * 3, t * 7), bright = (0.45 + 0.4 * (z * 0.5 + 0.5)) * flick * (1 + grab * 0.4);
        const pts = bolt(cx, cy, ex, ey, fl.seed, t, 0.16 - grab * 0.06);
        ctx.strokeStyle = `rgb(${Math.min(255, bright * 230) | 0},0,0)`; ctx.lineWidth = Rg * 0.1;
        ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        cores.push([pts, Math.min(1, bright)]);
        // forks where the filament spreads on the glass
        for (let b = 0; b < 3; b++) {
          const a0 = Math.atan2(ey - cy, ex - cx) + (b - 1) * 0.7 + L.noise2(fl.seed + b, t * 2) * 0.5, r = Rg * (0.1 + 0.08 * L.noise2(fl.seed + b * 7, t * 3));
          const p0 = pts[pts.length - 4], fork = bolt(p0[0], p0[1], ex + Math.cos(a0 + Math.PI / 2) * r, ey + Math.sin(a0 + Math.PI / 2) * r, fl.seed + b * 13, t * 1.3, 0.2);
          cores.push([fork, Math.min(1, bright * 0.7)]);
        }
      }
      // electrode glow
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rg * 0.42);
      gr.addColorStop(0, 'rgb(255,0,0)'); gr.addColorStop(1, 'rgb(0,0,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, Rg * 0.42, 0, TAU); ctx.fill();
      if (touch > 0.05) { const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, Rg * 0.3); tg.addColorStop(0, `rgb(${(touch * 200) | 0},0,0)`); tg.addColorStop(1, 'rgb(0,0,0)'); ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, Rg * 0.3, 0, TAU); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      R.sample();
      A.clear();
      const g = A.g, al = A.a;
      for (let i = 0; i < A.n; i++) { const v = R.r[i]; if (v < 0.05) continue; g[i] = GLOW[Math.min(6, (v * 7.5) | 0)]; al[i] = 0.12 + 0.7 * v; }
      for (const [pts, b] of cores) strokeGlyphs(pts, 0.55 + 0.45 * b);
      // electrode
      for (let k = -1; k <= 1; k++) stamp(cx + k * A.cellW, cy, CORE[k ? 1 : 2], 1);
      stamp(cx, cy - A.cellH, CORE[0], 0.8); stamp(cx, cy + A.cellH, CORE[0], 0.8);
      // the glass: outline, a reflection, and a base
      const n = Math.round((TAU * Rg) / (A.cellW * 0.9));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU, x = cx + Math.cos(a) * Rg, y = cy + Math.sin(a) * Rg, s = Math.sin(a), c = Math.cos(a);
        stamp(x, y, Math.abs(s) > 0.92 ? GH : Math.abs(c) > 0.92 ? GV : s * c > 0 ? GB : GF, dark ? 0.55 : 0.75);
      }
      for (let k = 0; k < 14; k++) { const a = 3.55 + k * 0.045; stamp(cx + Math.cos(a) * Rg * 0.86, cy + Math.sin(a) * Rg * 0.86, A.glyph('`'), 0.6); }
      const by = cy + Rg * 0.98, bw = Rg * 0.42;
      const baseRows = Math.round((Rg * 0.42) / A.cellH);
      for (let r = 0; r <= baseRows; r++) {
        const w = bw + r * A.cellH * 0.6, y = by + r * A.cellH;
        stamp(cx - w, y, GF, 0.85); stamp(cx + w, y, GB, 0.85);
        if (r === baseRows) for (let x = cx - w; x <= cx + w; x += A.cellW) stamp(x, y, A.glyph('_'), 0.85);
        else for (let x = cx - w + A.cellW; x < cx + w - A.cellW * 0.5; x += A.cellW) stamp(x, y, A.glyph(r === 1 ? '=' : ' '), r === 1 ? 0.5 : 0);
      }
      A.text(Math.round(cx / A.cellW) - 5, Math.round((by + baseRows * 0.5 * A.cellH) / A.cellH), 'STATIC ONE', 0.75);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
    });
  },
});
