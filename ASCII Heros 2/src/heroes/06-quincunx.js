HEROES.push({
  id: 'quincunx',
  name: 'Quincunx',
  title: 'Quincunx · Every forecast is a distribution',
  kind: 'Forecasting software',
  tech: 'A Galton board that actually runs: balls hop peg to peg, stack in bins and the live P10, P50 and P90 are read off the stacks. Move across the board to tilt it and watch the binomial curve and the histogram drift apart, then reconverge.',
  accent: '#3d63ff',
  fonts: 'family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600',
  css: `
.h-quincunx{--bg:#060607;--fg:#ebebe8;--mut:rgba(235,235,232,.56);--line:rgba(235,235,232,.15);--ink:#ebebe8;--acc:#4f72ff;font-family:"IBM Plex Mono",ui-monospace,monospace}
:root[data-theme=light] .h-quincunx{--bg:#f3f2ee;--fg:#111113;--mut:rgba(17,17,19,.58);--line:rgba(17,17,19,.15);--ink:#111113;--acc:#1f45e6}
.h-quincunx .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-quincunx .ui a,.h-quincunx .ui button{pointer-events:auto}
.h-quincunx .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;letter-spacing:.02em}
.h-quincunx .logo{display:flex;align-items:center;gap:10px;font:400 26px/1 "Instrument Serif",Georgia,serif;letter-spacing:-.01em}
.h-quincunx .logo i{font:600 11px/1 "IBM Plex Mono",monospace;font-style:normal;letter-spacing:-.1em;color:var(--acc)}
.h-quincunx .links{display:flex;gap:28px}
.h-quincunx .links a{opacity:.62;transition:opacity .2s}.h-quincunx .links a:hover{opacity:1}
.h-quincunx .r{display:flex;align-items:center;gap:16px}
.h-quincunx .tt{width:44px;height:24px;border-radius:12px;border:1px solid var(--line);background:none;position:relative}
.h-quincunx .tt::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--fg);transition:transform .35s cubic-bezier(.6,0,.2,1)}
:root[data-theme=light] .h-quincunx .tt::after{transform:translateX(20px)}
.h-quincunx .copy{align-self:center;max-width:min(560px,46vw)}
.h-quincunx .kick{display:inline-flex;align-items:center;gap:10px;margin:0 0 24px;font-size:11.5px;letter-spacing:.06em;color:var(--mut)}
.h-quincunx .kick::before{content:"";width:22px;height:1px;background:var(--acc)}
.h-quincunx h1{margin:0 0 24px;font:400 clamp(48px,6.6vw,104px)/.92 "Instrument Serif",Georgia,serif;letter-spacing:-.025em}
.h-quincunx h1 em{color:var(--acc)}
.h-quincunx .sub{margin:0 0 32px;max-width:42ch;font-size:clamp(13px,1.05vw,15px);line-height:1.7;color:var(--mut)}
.h-quincunx .cta{display:flex;flex-wrap:wrap;gap:12px}
.h-quincunx .btn{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 22px;background:var(--acc);color:#fff;font-size:13px;font-weight:500;border-radius:2px;transition:filter .2s}
.h-quincunx .btn:hover{filter:brightness(1.1)}
.h-quincunx .ghost{display:inline-flex;align-items:center;height:48px;padding:0 20px;border:1px solid var(--line);font-size:13px;border-radius:2px;background:var(--bg)}
.h-quincunx .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:11px;color:var(--mut)}
.h-quincunx .stats{display:flex;gap:clamp(16px,2.4vw,36px)}
.h-quincunx .stats span{display:flex;flex-direction:column;gap:6px}
.h-quincunx .stats b{font:500 clamp(16px,1.5vw,22px)/1 "IBM Plex Mono",monospace;color:var(--fg);font-variant-numeric:tabular-nums}
.h-quincunx .stats .p50 b{color:var(--acc)}
.h-quincunx .hint{text-align:right;letter-spacing:.04em}
@media (max-width:980px){.h-quincunx .links{display:none}}
@media (max-width:760px){
  .h-quincunx .ui{padding:14px 16px 12px}
  .h-quincunx .copy{align-self:end;max-width:none;margin-bottom:16px}
  .h-quincunx .kick{margin-bottom:12px;font-size:10.5px}
  .h-quincunx h1{font-size:clamp(40px,12vw,54px);margin-bottom:12px}
  .h-quincunx .sub{font-size:12.5px;line-height:1.6;margin-bottom:18px}
  .h-quincunx .btn,.h-quincunx .ghost{height:44px;padding:0 16px}
  .h-quincunx .hint,.h-quincunx .stats .n{display:none}
  .h-quincunx .stats b{font-size:15px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#"><i aria-hidden="true">.:.</i>Quincunx</a>
    <nav class="links" aria-label="Primary"><a href="#">Product</a><a href="#">Methods</a><a href="#">Customers</a><a href="#">Pricing</a></nav>
    <div class="r"><a href="#" class="si">Sign in</a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"></button></div>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">Probabilistic forecasting for operators</p>
    <h1 data-mask="text">Every forecast<br>is a <em>distribution.</em></h1>
    <p class="sub" data-mask="text">Quincunx turns messy history into forecasts with honest error bars, so you plan for the ninetieth percentile instead of the average and stop being surprised by the tails.</p>
    <div class="cta"><a class="btn" href="#">Book a demo &rarr;</a><a class="ghost" href="#">See a live model</a></div>
  </div>
  <footer class="foot">
    <div class="stats" data-mask="text"><span class="p10">P10<b>-</b></span><span class="p50">P50<b>-</b></span><span class="p90">P90<b>-</b></span><span class="n">Runs<b>0</b></span></div>
    <span class="hint" data-mask="text">Move across the board to tilt it &middot; click to pour</span>
  </footer>
</div>`,
  init: function (root, L, S) {
    const { clamp } = L;
    const A = S.ascii(root, { size: 13, mobile: 11, inks: ['--ink', '--acc'] });
    const P = S.pointer(root);
    const el = (s) => root.querySelector(s);
    const outP10 = el('.p10 b'), outP50 = el('.p50 b'), outP90 = el('.p90 b'), outN = el('.n b');
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .ghost, .logo, .links a, .r > *')];
    const PEG = A.glyph('.'), BALL = A.glyph('o'), STK = A.glyph('o'), WALL = A.glyph('|'), FL = A.glyph('\\'), FR = A.glyph('/'), FLOOR = A.glyph('='), CU = A.glyph('_'), CM = A.glyph('-'), CO = A.glyph('¯'), TICK = A.glyph("'");
    let R = 12, bx = 0, by = 0, rowsBins = 12, cap = 36, bins = [], balls = [], n = 0, bias = 0.5, spawnT = 0, flushing = 0, mask = null, statT = 0, pour = 0;
    const DX = 4;
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 26, floor: 0.06 }); };
    const setup = () => {
      const wide = A.w > 760;
      R = wide ? 12 : 7;
      rowsBins = wide ? 13 : 7;
      const height = 4 + R * 2 + 2 + rowsBins;
      cap = rowsBins * 3;
      bx = wide ? Math.round(A.cols * 0.72 - ((R + 1) * DX) / 2) : Math.round(A.cols / 2 - ((R + 1) * DX) / 2);
      by = wide ? Math.max(3, Math.round(A.rows / 2 - height / 2)) : 4;
      bins = new Array(R + 1).fill(0); balls = []; n = 0;
      // start with a board that has already been running for a while
      const fill = Math.round(cap * 0.55 * Math.sqrt(2 * Math.PI * R * 0.25));
      for (let j = 0; j < fill; j++) { let k = 0; for (let r = 0; r < R; r++) if (Math.random() < 0.5) k++; if (bins[k] < cap - 1) { bins[k]++; n++; } }
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const binX = (k) => bx + k * DX + DX / 2;                 // center column of bin k
    const pegY = (r) => by + 4 + r * 2;                        // row of peg row r
    const floorY = () => pegY(R) + 1 + rowsBins;               // the bin floor row
    const value = (k) => 2.6 + (k / R) * 3.2;                  // forecast in EUR millions across bins
    const fmtM = (v) => 'EUR ' + v.toFixed(2) + 'M';
    const pct = (q) => {
      const tot = bins.reduce((a, b) => a + b, 0);
      if (!tot) return null;
      let acc = 0;
      for (let k = 0; k <= R; k++) { acc += bins[k]; if (acc >= q * tot) return value(k - 0.5 + (q * tot - (acc - bins[k])) / Math.max(1, bins[k])); }
      return value(R);
    };
    const spawn = () => balls.push({ r: -1, x: binX(R / 2), tau: 0, dir: 0, k: 0, land: false, y: by + 1, vy: 0 });

    S.loop((t, dt) => {
      P.decay(dt);
      // tilt follows the pointer across the board, eases back to fair when idle
      const center = (binX(0) + binX(R)) / 2 * A.cellW, half = ((R + 1) * DX * A.cellW) / 2;
      const target = P.active && !P.ui && !P.idle(4000) ? 0.5 + 0.2 * clamp((P.x - center) / half, -1, 1) : 0.5;
      bias += (target - bias) * Math.min(1, dt * 2);
      for (const tp of P.taps.splice(0)) pour += 40;
      if (flushing > 0) { flushing -= dt; if (flushing <= 0) { for (let k = 0; k <= R; k++) bins[k] = Math.floor(bins[k] * 0.45); } }
      else {
        spawnT -= dt;
        const rate = pour > 0 ? 0.02 : A.w > 760 ? 0.11 : 0.2;
        while (spawnT <= 0) { spawn(); spawnT += rate; if (pour > 0) pour--; }
      }
      const hop = 0.13;
      for (let j = balls.length - 1; j >= 0; j--) {
        const b = balls[j];
        if (b.land) {
          b.vy += 60 * dt; b.y += b.vy * dt;
          const top = floorY() - 1 - Math.floor(bins[b.k] / 3);
          if (b.y >= top) { bins[b.k]++; n++; balls.splice(j, 1); if (bins[b.k] >= cap && flushing <= 0) flushing = 1.4; }
          continue;
        }
        b.tau += dt / hop;
        while (b.tau >= 1) {
          b.tau -= 1; b.r++;
          b.x += b.dir * (DX / 2);
          if (b.r >= R) { b.land = true; b.k = clamp(Math.round((b.x - bx - DX / 2) / DX), 0, R); b.y = pegY(R); b.vy = 8; break; }
          b.dir = Math.random() < bias ? 1 : -1;
          if (b.r === 0) b.dir = Math.random() < bias ? 1 : -1;
        }
      }
      if (flushing > 0) balls = balls.filter((b) => !b.land);

      A.clear();
      const fy = floorY(), fade = flushing > 0 ? clamp(flushing / 1.4, 0, 1) : 1;
      // funnel
      for (let k = 0; k < 4; k++) { A.put(binX(R / 2) - 2 - (3 - k) * 2, by + k, FL, 0.6); A.put(binX(R / 2) + 2 + (3 - k) * 2, by + k, FR, 0.6); }
      // pegs
      for (let r = 0; r < R; r++) for (let k = 0; k <= r; k++) A.put(binX(R / 2) + (k - r / 2) * DX, pegY(r) + 1, PEG, 0.8);
      // bins, floor and labels
      for (let k = 0; k <= R + 1; k++) for (let y = pegY(R) + 2; y < fy; y++) A.put(bx + k * DX, y, WALL, 0.32);
      for (let x = bx; x <= bx + (R + 1) * DX; x++) A.put(x, fy, FLOOR, 0.55);
      for (let k = 0; k <= R; k += 2) { const s = value(k).toFixed(1); A.text(Math.round(binX(k) - s.length / 2), fy + 1, s, 0.5); }
      // stacks
      for (let k = 0; k <= R; k++) {
        const c = bins[k], keep = flushing > 0 ? Math.floor(c * 0.45) : c;
        for (let j = 0; j < c; j++) A.put(bx + k * DX + 1 + (j % 3), fy - 1 - Math.floor(j / 3), STK, 0.9 * (j < keep ? 1 : fade));
      }
      // balls in flight
      for (const b of balls) {
        if (b.land) { A.put(bx + b.k * DX + 2, b.y, BALL, 1); continue; }
        const e = b.tau * b.tau * (3 - 2 * b.tau);
        const x = b.x + b.dir * (DX / 2) * e, y = (b.r < 0 ? by + 2 : pegY(b.r)) + 2 * b.tau - Math.sin(Math.PI * b.tau) * 0.8;
        A.put(x, y, BALL, 1);
      }
      // binomial expectation drawn as a smooth curve in the accent ink
      const tot = Math.max(1, bins.reduce((a, b) => a + b, 0)), mu = R * bias, sd = Math.sqrt(R * bias * (1 - bias));
      const scale = Math.min(rowsBins - 1, (tot / 3) * (1 / (sd * Math.sqrt(2 * Math.PI))) * 1.0);
      for (let x = bx + 1; x < bx + (R + 1) * DX; x++) {
        const k = (x - bx - DX / 2) / DX, h = scale * Math.exp(-((k - mu) ** 2) / (2 * sd * sd));
        if (h < 0.15) continue;
        const yy = fy - h, row = Math.floor(yy), f = yy - row;
        A.put(x, row, f < 0.34 ? CO : f < 0.67 ? CM : CU, 0.95, 1);
      }
      // tilt marker over the funnel
      const tl = (bias - 0.5) / 0.2;
      if (Math.abs(tl) > 0.05) A.text(Math.round(binX(R / 2) + tl * 6 - 3), by - 1, (tl > 0 ? 'tilt +' : 'tilt -') + Math.abs(tl * 0.2).toFixed(2), 0.7, 1);
      else A.put(binX(R / 2), by - 1, TICK, 0.5);
      if (mask) for (let i = 0; i < A.n; i++) A.a[i] *= mask[i];
      A.render();
      if ((statT -= dt) <= 0) {
        statT = 0.2;
        const a = pct(0.1), b = pct(0.5), c = pct(0.9);
        outP10.textContent = a ? fmtM(a) : '-'; outP50.textContent = b ? fmtM(b) : '-'; outP90.textContent = c ? fmtM(c) : '-';
        outN.textContent = L.fmt(n);
      }
    });
  },
});
