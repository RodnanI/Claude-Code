HEROES.push({
  id: 'tancho',
  name: 'Tancho',
  title: 'Tancho · A tea house by the water',
  kind: 'Tea house reservations',
  tech: 'A wave-equation pond: every glyph of water is a slope, koi swim on articulated spines beneath it and are refracted by the ripples. Tap to drop food; the koi come to eat. Red is reserved for the tancho marking.',
  accent: '#e1352b',
  fonts: 'family=Shippori+Mincho:wght@400;500;600&family=Zen+Kaku+Gothic+New:wght@400;500',
  css: `
.h-tancho{--bg:#06080a;--fg:#ebe7de;--mut:rgba(235,231,222,.58);--line:rgba(235,231,222,.18);--ink:#ebe7de;--acc:#e1352b;font-family:"Zen Kaku Gothic New",system-ui,sans-serif}
:root[data-theme=light] .h-tancho{--bg:#efebe2;--fg:#15130f;--mut:rgba(21,19,15,.6);--line:rgba(21,19,15,.18);--ink:#15130f;--acc:#cf2a20}
.h-tancho .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto 1fr auto;padding:22px clamp(18px,3.4vw,48px) 20px;pointer-events:none}
.h-tancho .ui a,.h-tancho .ui button{pointer-events:auto}
.h-tancho .nav{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;letter-spacing:.08em}
.h-tancho .logo{display:flex;align-items:center;gap:12px;font:600 19px/1 "Shippori Mincho",serif;letter-spacing:.24em}
.h-tancho .seal{width:26px;height:26px;border-radius:50%;background:var(--acc);display:grid;place-items:center;color:#fff;font:600 12px/1 "Shippori Mincho",serif;letter-spacing:0}
.h-tancho .logo small{font:500 12px/1 "Shippori Mincho",serif;letter-spacing:.3em;opacity:.6}
.h-tancho .links{display:flex;gap:30px}
.h-tancho .links a{opacity:.68;transition:opacity .2s}.h-tancho .links a:hover{opacity:1}
.h-tancho .tt{display:flex;align-items:center;gap:10px;border:0;background:none;padding:6px 0;font-size:12px;letter-spacing:.14em}
.h-tancho .tt i{width:16px;height:16px;border-radius:50%;border:1px solid currentColor;background:linear-gradient(90deg,currentColor 50%,transparent 50%)}
.h-tancho .tt .lt,:root[data-theme=light] .h-tancho .tt .dk{display:none}
:root[data-theme=light] .h-tancho .tt .lt{display:inline}
.h-tancho .copy{grid-column:1;grid-row:3;align-self:end;max-width:640px}
.h-tancho .kick{margin:0 0 18px;font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--mut)}
.h-tancho h1{margin:0 0 22px;font:500 clamp(40px,5.6vw,84px)/1.04 "Shippori Mincho",serif;letter-spacing:-.01em}
.h-tancho h1 em{font-style:normal;color:var(--mut)}
.h-tancho .sub{margin:0 0 28px;max-width:44ch;font-size:clamp(14px,1.15vw,16px);line-height:1.8;color:var(--mut)}
.h-tancho .cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.h-tancho .btn{display:inline-flex;align-items:center;gap:14px;height:48px;padding:0 24px;background:var(--fg);color:var(--bg);font-size:14px;letter-spacing:.14em;border-radius:1px}
.h-tancho .btn::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--acc)}
.h-tancho .lnk{height:48px;display:inline-flex;align-items:center;padding:0 6px;font-size:14px;letter-spacing:.12em;border-bottom:1px solid var(--line)}
.h-tancho .side{grid-column:2;grid-row:2/4;align-self:stretch;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;padding-top:20px}
.h-tancho .vert{writing-mode:vertical-rl;font:500 clamp(22px,2.3vw,34px)/1.5 "Shippori Mincho",serif;letter-spacing:.4em;margin:0}
.h-tancho .vert span{color:var(--acc)}
.h-tancho .hours{writing-mode:vertical-rl;font-size:11.5px;letter-spacing:.3em;color:var(--mut);margin:0}
.h-tancho .hint{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font-size:11px;letter-spacing:.3em;color:var(--mut);white-space:nowrap}
@media (max-width:980px){.h-tancho .links{display:none}.h-tancho .hint{display:none}}
@media (max-width:640px){
  .h-tancho .ui{padding:14px 16px 14px;grid-template-columns:1fr auto}
  .h-tancho .logo{letter-spacing:.16em;font-size:17px}.h-tancho .logo small{display:none}
  .h-tancho .tt .lbl{display:none}
  .h-tancho h1{font-size:clamp(34px,10.5vw,44px);margin-bottom:16px}
  .h-tancho .sub{font-size:14px;line-height:1.7;margin-bottom:20px}
  .h-tancho .kick{font-size:10.5px;letter-spacing:.24em;margin-bottom:12px}
  .h-tancho .side{grid-row:2;padding-top:10px}
  .h-tancho .vert{font-size:20px}
  .h-tancho .hours{display:none}
  .h-tancho .btn,.h-tancho .lnk{height:46px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#"><span class="seal" aria-hidden="true">&#20025;</span>TANCHO<small>&#20025;&#38914;</small></a>
    <nav class="links" aria-label="Primary"><a href="#">Teas</a><a href="#">Ceremony</a><a href="#">Visit</a><a href="#">Journal</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i><span class="lbl"><span class="dk">EVENING</span><span class="lt">AFTERNOON</span></span></button>
  </header>
  <div class="side" aria-hidden="true"><p class="vert">&#38745;&#12363;&#12394;<span>&#27700;</span>&#12398;&#20621;&#12391;</p><p class="hours">Thu to Mon &middot; 11 to 17</p></div>
  <div class="copy">
    <p class="kick" data-mask="text">Higashiyama, Kyoto &middot; twelve seats</p>
    <h1 data-mask="text">Sit by the water.<br><em>Stay for the</em><br>second steeping.</h1>
    <p class="sub" data-mask="text">A small tea house on the Shirakawa canal. Sencha, gyokuro and long afternoons, poured slowly and by reservation only.</p>
    <div class="cta"><a class="btn" href="#">Reserve a seat</a><a class="lnk" href="#">The tea list</a></div>
  </div>
  <p class="hint" data-mask="text">Tap the water to feed the koi</p>
</div>`,
  init: function (root, L, S) {
    const { TAU, lerp, clamp } = L;
    const A = S.ascii(root, { size: 13, mobile: 11, inks: ['--ink', '--acc'] });
    const R = new L.Raster(A, 2), RP = new L.Raster(A, 2);
    const P = S.pointer(root);
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .lnk, .logo, .links a, .tt, .vert, .hours')];
    const rnd = L.rng(31);
    const BODY = A.ramp('.:-=+*##'), SPOT = A.ramp('o0O@'), RIP = { h: A.glyph('-'), v: A.glyph('|'), f: A.glyph('/'), b: A.glyph('\\') }, TIL = A.glyph('~'), DOT = A.glyph('.'), LEAF = A.glyph('*'), FOOD = A.glyph('°'), PADG = A.ramp('.:=%');
    let W = 1, H = 1, Rw = 0, Rh = 0, h0 = null, h1 = null, mask = null, base = 150;
    const koi = [], food = [], leaves = [], pads = [];

    const drop = (x, y, r, amp) => {
      const cx = x / A.cellW, cy = (y / A.cellH) * 2, rr = Math.max(1, r);
      for (let j = Math.max(1, (cy - rr) | 0); j < Math.min(Rh - 1, cy + rr + 1); j++) for (let i = Math.max(1, (cx - rr) | 0); i < Math.min(Rw - 1, cx + rr + 1); i++) {
        const d = Math.hypot(i - cx, j - cy) / rr; if (d < 1) h1[j * Rw + i] += amp * (1 - d) * (1 - d);
      }
    };
    const makeKoi = (k) => {
      const len = base * (0.72 + rnd() * 0.45);
      const x = rnd() * W, y = rnd() * H, a = rnd() * TAU;
      return { x, y, a, v: 18, len, turn: 0, ph: rnd() * TAU, seed: rnd() * 40, type: k % 2 === 0 ? 'tancho' : rnd() < 0.5 ? 'bekko' : 'ogon', spine: Array.from({ length: 13 }, (_, i) => [x - Math.cos(a) * i * len / 12, y - Math.sin(a) * i * len / 12]), patches: Array.from({ length: 3 }, () => [0.25 + rnd() * 0.45, (rnd() - 0.5) * 0.12, 0.03 + rnd() * 0.035]) };
    };
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 30, floor: 0.08 }); };
    const setup = () => {
      W = A.w; H = A.h; Rw = A.cols; Rh = A.rows * 2;
      h0 = new Float32Array(Rw * Rh); h1 = new Float32Array(Rw * Rh);
      base = W < 640 ? 128 : Math.min(240, Math.max(150, W * 0.135));
      const n = W < 640 ? 4 : 6;
      koi.length = 0; for (let k = 0; k < n; k++) koi.push(makeKoi(k));
      leaves.length = 0; for (let k = 0; k < (W < 640 ? 2 : 4); k++) leaves.push({ x: rnd() * W, y: rnd() * H, vx: 0, vy: 0, a: rnd() * TAU });
      pads.length = 0;
      const spots = W < 640 ? [[0.84, 0.32, 52], [0.14, 0.44, 40]] : [[0.6, 0.18, 74], [0.71, 0.31, 46], [0.9, 0.7, 66], [0.46, 0.84, 42]];
      for (const [px, py, r] of spots) pads.push({ x: px * W, y: py * H, r, notch: rnd() * TAU, ph: rnd() * TAU });
      remask();
    };
    A.onResize = setup;
    setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const wprof = (s) => (s > 0.86 ? 0.012 : 0.112 * Math.sin(Math.PI * Math.pow(s / 0.86, 0.72)) + 0.014);
    const drawKoi = (ctx, k, t) => {
      const sp = k.spine, n = sp.length, len = k.len, left = [], right = [];
      const amp = len * 0.05, w = Math.min(1, 0.5 + k.v / 60);
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1), p = sp[i], q = sp[Math.min(n - 1, i + 1)], r0 = sp[Math.max(0, i - 1)];
        let tx = r0[0] - q[0], ty = r0[1] - q[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const nx = -ty, ny = tx, und = amp * w * Math.pow(s, 1.6) * Math.sin(k.ph - s * 4.2), half = len * wprof(s);
        const cx = p[0] + nx * und, cy = p[1] + ny * und;
        left.push([cx + nx * half, cy + ny * half, cx, cy, nx, ny, tx, ty]); right.push([cx - nx * half, cy - ny * half]);
      }
      const col = (b, spot) => `rgb(${(b * 255) | 0},255,${spot ? 255 : 0})`;
      // tail fin: two translucent lobes that lag behind the body wave
      const tb = left[n - 1], tsw = Math.sin(k.ph - 4.6) * 0.5;
      ctx.fillStyle = col(0.42);
      for (const side of [1, -1]) {
        const ang = Math.atan2(-tb[7], -tb[6]) + side * 0.42 + tsw;
        ctx.beginPath(); ctx.moveTo(tb[2], tb[3]);
        ctx.quadraticCurveTo(tb[2] + Math.cos(ang - side * 0.3) * len * 0.2, tb[3] + Math.sin(ang - side * 0.3) * len * 0.2, tb[2] + Math.cos(ang) * len * 0.3, tb[3] + Math.sin(ang) * len * 0.3);
        ctx.quadraticCurveTo(tb[2] + Math.cos(ang + side * 0.5) * len * 0.12, tb[3] + Math.sin(ang + side * 0.5) * len * 0.12, tb[2], tb[3]);
        ctx.fill();
      }
      // pectoral fins
      const pf = left[3], flap = Math.sin(k.ph * 0.5) * 0.35;
      for (const side of [1, -1]) {
        const bx = pf[2] + pf[4] * side * len * 0.07, by = pf[3] + pf[5] * side * len * 0.07;
        const dirx = pf[4] * side * Math.cos(0.9 + flap) - pf[6] * Math.sin(0.9 + flap), diry = pf[5] * side * Math.cos(0.9 + flap) - pf[7] * Math.sin(0.9 + flap);
        ctx.fillStyle = col(0.5);
        ctx.beginPath(); ctx.ellipse(bx + dirx * len * 0.06, by + diry * len * 0.06, len * 0.08, len * 0.035, Math.atan2(diry, dirx), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = col(0.82);
      ctx.beginPath(); ctx.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(left[0][2], left[0][3], len * 0.075, 0, TAU); ctx.fill();
      // back highlight
      ctx.strokeStyle = col(1); ctx.lineWidth = len * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(left[1][2], left[1][3]); for (let i = 2; i < 9; i++) ctx.lineTo(left[i][2], left[i][3]); ctx.stroke();
      if (k.type === 'bekko') for (const [s, o, r] of k.patches) { const p = left[Math.round(s * (n - 1))]; ctx.fillStyle = col(0.3); ctx.beginPath(); ctx.ellipse(p[2] + p[4] * o * len, p[3] + p[5] * o * len, r * len * 1.4, r * len, Math.atan2(p[7], p[6]), 0, TAU); ctx.fill(); }
      if (k.type === 'tancho') { const p = left[1]; ctx.fillStyle = col(0.95, true); ctx.beginPath(); ctx.arc(p[2] + p[6] * len * 0.01, p[3] + p[7] * len * 0.01, len * 0.062, 0, TAU); ctx.fill(); }
    };

    S.loop((t, dt) => {
      if (!h0) return;
      P.decay(dt);
      const cols = A.cols, rows = A.rows, g = A.g, al = A.a, kk = A.k, cw = A.cellW, ch = A.cellH;
      // input
      for (const tp of P.taps.splice(0)) {
        drop(tp.x, tp.y, 3.2, 26);
        for (let j = 0; j < 6; j++) food.push({ x: tp.x + (rnd() - 0.5) * 34, y: tp.y + (rnd() - 0.5) * 24, life: 14 });
      }
      if (P.active && !P.ui) { const sp = Math.hypot(P.vx, P.vy); if (sp > 60) drop(P.x, P.y, 1.6, Math.min(5, sp * 0.004)); }
      if (Math.random() < dt * 0.6) drop(rnd() * W, rnd() * H, 1.2, 3 + rnd() * 3);
      // ripples: two-buffer wave equation
      for (let y = 1; y < Rh - 1; y++) for (let x = 1, i = y * Rw + 1; x < Rw - 1; x++, i++) {
        h0[i] = ((h1[i - 1] + h1[i + 1] + h1[i - Rw] + h1[i + Rw]) * 0.5 - h0[i]) * 0.984;
      }
      { const tmp = h0; h0 = h1; h1 = tmp; }
      // koi
      for (const k of koi) {
        let want = L.noise2(k.seed, t * 0.07) * 0.9;
        let speed = 22 + 14 * (0.5 + 0.5 * L.noise2(k.seed + 9, t * 0.11));
        const head = k.spine[0];
        let best = null, bd = 1e9;
        for (const f of food) { const d = Math.hypot(f.x - head[0], f.y - head[1]); if (d < bd && d < 520) { bd = d; best = f; } }
        const steerTo = (tx, ty, gain) => { const diff = ((Math.atan2(ty - k.y, tx - k.x) - k.a + Math.PI) % TAU + TAU) % TAU - Math.PI; want += diff * gain; };
        if (best) { steerTo(best.x, best.y, 2.2); speed = 55; if (bd < k.len * 0.09) { best.life = 0; drop(head[0], head[1], 1.5, 9); } }
        const m = k.len * 0.6;
        if (k.x < m) steerTo(W / 2, k.y, 1.2); else if (k.x > W - m) steerTo(W / 2, k.y, 1.2);
        if (k.y < m) steerTo(k.x, H / 2, 1.2); else if (k.y > H - m) steerTo(k.x, H / 2, 1.2);
        for (const o of koi) { if (o === k) continue; const dx = o.x - k.x, dy = o.y - k.y, d = Math.hypot(dx, dy); if (d < k.len * 0.8 && d > 1) want -= (Math.sign(Math.cos(k.a) * dy - Math.sin(k.a) * dx) || 1) * (1 - d / (k.len * 0.8)) * 1.4; }
        k.turn = lerp(k.turn, clamp(want, -1.6, 1.6), Math.min(1, dt * 2));
        k.a += k.turn * dt;
        k.v = lerp(k.v, speed, Math.min(1, dt * 1.2));
        k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt;
        k.ph += dt * (2.2 + k.v * 0.09 + Math.abs(k.turn) * 2);
        const sp = k.spine, seg = k.len / 12;
        sp[0][0] = k.x; sp[0][1] = k.y;
        for (let i = 1; i < sp.length; i++) { const p = sp[i], q = sp[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1; p[0] = q[0] + (dx / d) * seg; p[1] = q[1] + (dy / d) * seg; }
        if (Math.random() < dt * 0.05) drop(k.x, k.y, 1.4, 5);
      }
      for (let j = food.length - 1; j >= 0; j--) { const f = food[j]; f.life -= dt; if (f.life <= 0) food.splice(j, 1); }
      const ctx = R.begin();
      for (const k of koi) drawKoi(ctx, k, t);
      R.sample();

      A.clear();
      const dark = L.theme() === 'dark', mx = W * 0.8, my = H * 0.24, mr = Math.min(W, H) * 0.09;
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        const j = y * 2 * Rw + x, j2 = j + Rw;
        const hx = x > 0 && x < cols - 1 ? (h1[j + 1] + h1[j2 + 1] - h1[j - 1] - h1[j2 - 1]) : 0;
        const hy = y > 0 && y < rows - 1 ? (h1[j2 + Rw] - h1[j - Rw]) : 0;
        // koi under water, displaced by the surface slope
        const sx = clamp(Math.round(x + hx * 0.25), 0, cols - 1), sy = clamp(Math.round(y + hy * 0.12), 0, rows - 1), si = sy * cols + sx;
        const c = R.g[si];
        if (c > 0.12) {
          const b = R.r[si] / c;
          if (R.b[si] / c > 0.5) { g[i] = SPOT[Math.min(3, ((R.b[si] / c) * 3.4) | 0)]; al[i] = 0.95; kk[i] = 1; continue; }
          let gi = L.edge(A, R.g, sx, sy, 1.1);
          if (gi < 0 || c > 0.94) gi = BODY[Math.min(BODY.length - 1, (b * BODY.length) | 0)];
          g[i] = gi; al[i] = (0.35 + 0.65 * Math.min(1, c * 1.3)) * (0.35 + 0.65 * b) * 0.92; kk[i] = 0;
          continue;
        }
        const m = Math.hypot(hx, hy * 0.5);
        if (m > 0.55) {
          const tx = -hy * 0.5, ty = hx, ax = Math.abs(tx), ay = Math.abs(ty) * 2;
          g[i] = ay < ax * 0.45 ? RIP.h : ax < ay * 0.45 ? RIP.v : tx * ty > 0 ? RIP.b : RIP.f;
          al[i] = Math.min(0.75, 0.1 + m * 0.07); kk[i] = 0;
          continue;
        }
        const px = (x + 0.5) * cw, py = (y + 0.5) * ch;
        if (dark) {
          const dm = Math.hypot((px - mx) / (mr * 1.6), (py - my) / mr);
          if (dm < 1) {
            const n = L.noise3(x * 0.25, y * 0.9, t * 0.6) + (hx + hy) * 0.08;
            if (n > -0.25 + dm * 0.5) { g[i] = n > 0.3 ? A.glyph('=') : TIL; al[i] = (1 - dm) * 0.6 + 0.1; kk[i] = 0; continue; }
          }
        }
        const amb = L.noise3(x * 0.07, y * 0.16, t * 0.12);
        if (amb > 0.38) { g[i] = amb > 0.52 ? TIL : DOT; al[i] = 0.05 + (amb - 0.38) * 0.35; kk[i] = 0; }
      }
      // lily pads float on the surface, bobbing on the local height
      const pc = RP.begin();
      for (const p of pads) {
        const cx = clamp(Math.floor((p.x / W) * Rw), 0, Rw - 1), cy = clamp(Math.floor((p.y / H) * Rh), 0, Rh - 1);
        p.ph += dt * 0.2;
        const ox = p.x + Math.sin(p.ph) * 3 + h1[cy * Rw + cx] * 0.5, oy = p.y + Math.cos(p.ph * 0.8) * 2, rot = p.notch + Math.sin(p.ph * 0.7) * 0.1;
        pc.fillStyle = 'rgb(150,255,0)';
        pc.beginPath(); pc.moveTo(ox, oy); pc.arc(ox, oy, p.r, rot + 0.22, rot + TAU - 0.06); pc.closePath(); pc.fill();
        pc.strokeStyle = 'rgb(40,255,0)'; pc.lineWidth = 2.2;
        for (let v = 0; v < 9; v++) { const a = rot + 0.5 + v * 0.66; pc.beginPath(); pc.moveTo(ox, oy); pc.lineTo(ox + Math.cos(a) * p.r * 0.86, oy + Math.sin(a) * p.r * 0.86); pc.stroke(); }
      }
      RP.sample();
      for (let i = 0; i < A.n; i++) {
        const c = RP.g[i];
        if (c < 0.2) continue;
        const x = i % cols, y = (i / cols) | 0, e = L.edge(A, RP.g, x, y, 1.2);
        if (e >= 0 && c < 0.95) { g[i] = e; al[i] = 0.85; }
        else { const b = RP.r[i] / c; g[i] = b < 0.45 ? RIP.h : PADG[b < 0.55 ? 1 : 0]; al[i] = b < 0.45 ? 0.32 : 0.5; }
        kk[i] = 0;
      }
      // maple leaves drift on the slope, food pellets float until eaten
      for (const lf of leaves) {
        const cx = clamp(Math.floor(lf.x / cw), 1, cols - 2), cy = clamp(Math.floor((lf.y / ch) * 2), 1, Rh - 2), j = cy * Rw + cx;
        lf.vx += -(h1[j + 1] - h1[j - 1]) * 2 * dt + 3 * dt; lf.vy += -(h1[j + Rw] - h1[j - Rw]) * 2 * dt + L.noise2(lf.a, t * 0.1) * 4 * dt;
        lf.vx *= 0.985; lf.vy *= 0.985; lf.x += lf.vx * dt; lf.y += lf.vy * dt;
        if (lf.x > W + 20) lf.x = -20; if (lf.x < -20) lf.x = W + 20; if (lf.y > H + 20) lf.y = -20; if (lf.y < -20) lf.y = H + 20;
        A.put(lf.x / cw, lf.y / ch, LEAF, 0.95, 1);
      }
      for (const f of food) A.put(f.x / cw, f.y / ch, FOOD, Math.min(1, f.life) * 0.9, 0);
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
    });
  },
});
