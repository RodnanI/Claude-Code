HEROES.push({
  id: 'lastset',
  name: 'Last Set',
  title: 'Last Set · Come in out of the rain',
  kind: 'Jazz bar and listening room',
  tech: 'Rain on a window at night: drops bead, grow, slide when heavy enough, swallow the beads in their path and leave clear trails in the condensation. Each drop refracts the street behind it upside down. Drag to wipe the glass; it fogs back over.',
  accent: '#ff3d8b',
  fonts: 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Jost:wght@400;500',
  css: `
.h-lastset{--bg:#050506;--fg:#f0ece6;--mut:rgba(240,236,230,.58);--line:rgba(240,236,230,.18);--ink:#f0ece6;--acc:#ff3d8b;font-family:"Jost",system-ui,sans-serif}
:root[data-theme=light] .h-lastset{--bg:#e9e8e5;--fg:#121214;--mut:rgba(18,18,20,.62);--line:rgba(18,18,20,.18);--ink:#121214;--acc:#e8126b}
.h-lastset .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 20px;pointer-events:none}
.h-lastset .ui a,.h-lastset .ui button{pointer-events:auto}
.h-lastset .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;letter-spacing:.2em;text-transform:uppercase}
.h-lastset .logo{font:italic 400 30px/1 "Bodoni Moda",Didot,Georgia,serif;letter-spacing:-.01em;text-transform:none}
.h-lastset .logo b{font-weight:400;color:var(--acc)}
.h-lastset .links{display:flex;gap:32px}
.h-lastset .links a{opacity:.66;transition:opacity .2s}.h-lastset .links a:hover{opacity:1}
.h-lastset .tt{display:flex;align-items:center;gap:10px;border:0;background:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;padding:6px 0}
.h-lastset .tt i{width:9px;height:9px;border-radius:50%;background:var(--acc);box-shadow:0 0 12px var(--acc)}
:root[data-theme=light] .h-lastset .tt i{box-shadow:none}
.h-lastset .tt .lt,:root[data-theme=light] .h-lastset .tt .dk{display:none}
:root[data-theme=light] .h-lastset .tt .lt{display:inline}
.h-lastset .copy{grid-row:3;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:28px 56px;align-items:end}
.h-lastset h1{margin:0 0 18px;font:400 clamp(50px,7.6vw,124px)/.9 "Bodoni Moda",Didot,Georgia,serif;letter-spacing:-.035em}
.h-lastset h1 em{font-style:italic}
.h-lastset .sub{margin:0;max-width:42ch;font-size:clamp(14px,1.15vw,16.5px);line-height:1.65;color:var(--mut)}
.h-lastset .card{border-top:1px solid var(--fg);padding-top:16px;font-size:13px;letter-spacing:.04em}
.h-lastset .card .row{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--line)}
.h-lastset .card .row span:first-child{color:var(--mut);text-transform:uppercase;letter-spacing:.18em;font-size:11px}
.h-lastset .card .who{font:italic 400 24px/1.15 "Bodoni Moda",Georgia,serif;letter-spacing:-.01em;margin:4px 0 12px}
.h-lastset .btn{display:flex;align-items:center;justify-content:space-between;height:52px;margin-top:16px;padding:0 20px;background:var(--acc);color:#fff;font-size:12px;letter-spacing:.22em;text-transform:uppercase;transition:filter .2s}
.h-lastset .btn:hover{filter:brightness(1.1)}
.h-lastset .spin{margin-top:12px;font-size:11px;letter-spacing:.12em;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.h-lastset .wipe{position:absolute;right:clamp(18px,3.4vw,52px);top:50%;transform:translateY(-50%) rotate(90deg);transform-origin:right center;font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:var(--mut);white-space:nowrap}
@media (max-width:980px){.h-lastset .links{display:none}.h-lastset .wipe{display:none}}
@media (max-width:760px){
  .h-lastset .ui{padding:14px 16px 14px}
  .h-lastset .logo{font-size:26px}
  .h-lastset .tt .lbl{display:none}
  .h-lastset .copy{grid-template-columns:1fr;gap:14px}
  .h-lastset h1{font-size:clamp(44px,14vw,60px);margin-bottom:10px}
  .h-lastset .sub{font-size:14px}
  .h-lastset .card .who{font-size:20px;margin-bottom:6px}
  .h-lastset .card .row:nth-of-type(2){display:none}
  .h-lastset .btn{height:48px;margin-top:10px}
  .h-lastset .spin{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">Last <b>Set</b></a>
    <nav class="links" aria-label="Primary"><a href="#">Tonight</a><a href="#">Drinks</a><a href="#">Records</a><a href="#">Private hire</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i><span class="lbl"><span class="dk">After dark</span><span class="lt">Matinee</span></span></button>
  </header>
  <span class="wipe">Drag to wipe the window</span>
  <div class="copy">
    <div>
      <h1 data-mask="text">Come in<br><em>out of the rain.</em></h1>
      <p class="sub" data-mask="text">A forty-seat listening bar on Rue de Lappe. Two sets a night, a wall of records, and cocktails that take their time.</p>
    </div>
    <div class="card" data-ui>
      <div class="who">Margaux Bellini Trio</div>
      <div class="row"><span>Sets</span><span>21:00 &middot; 23:30</span></div>
      <div class="row"><span>Cover</span><span>EUR 18</span></div>
      <a class="btn" href="#">Reserve a table <span>&rarr;</span></a>
      <div class="spin">Now spinning: Ahmad Jamal, Poinciana, 1958</div>
    </div>
  </div>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 13, mobile: 11, inks: ['--ink', '--acc'] });
    const P = S.pointer(root);
    const NR = new L.Raster(A, 2);
    const maskEls = [...root.querySelectorAll('[data-mask], .card, .logo, .links a, .tt, .wipe')];
    const BOK = A.ramp(' .:-oO0@'), HAZE = A.glyph('.'), LP = A.glyph('('), RP = A.glyph(')'), TOPG = A.glyph('-'), BOTG = A.glyph('_'), SPEC = A.glyph("'"), SM = A.ramp(".,'"), GLOW = A.ramp('.:');
    let W = 1, H = 1, cols = 0, rows = 0, field = null, ink = null, fog = null, neonV = null, neonE = null, neonG = null, mask = null, lights = [], cars = [], drops = [], beads = [], spawnT = 0, beadT = 0, flick = 1, flickT = 0;
    const rnd = L.rng(77);
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 8, feather: 30, floor: 0.06 }); };

    /* neon: the word is stroked as glass tubing, then read back as tube cells and a soft halo */
    const buildNeon = () => {
      const wide = W > 760, size = wide ? Math.min(H * 0.32, W * 0.16) : Math.min(H * 0.17, W * 0.36);
      const nx = wide ? W * 0.72 : W * 0.62, ny = wide ? H * 0.27 : H * 0.17;
      const ctx = NR.begin();
      ctx.font = `italic 400 ${size}px "Bodoni Moda", Didot, Georgia, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgb(0,90,0)'; ctx.lineWidth = size * 0.16; ctx.strokeText('Jazz', nx, ny);
      ctx.strokeStyle = 'rgb(255,255,0)'; ctx.lineWidth = Math.max(2.5, size * 0.035); ctx.strokeText('Jazz', nx, ny);
      ctx.fillStyle = 'rgb(0,0,255)'; ctx.fillRect(nx - size * 1.1, ny + size * 0.55, size * 2.2, 2);
      NR.sample();
      neonV = Float32Array.from(NR.r); neonG = Float32Array.from(NR.g); neonE = new Int16Array(A.n).fill(-1);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const i = y * cols + x; if (neonV[i] > 0.12) neonE[i] = L.edge(A, neonV, x, y, 0.5); }
    };
    const setup = () => {
      W = A.w; H = A.h; cols = A.cols; rows = A.rows;
      field = new Float32Array(cols * rows); ink = new Uint8Array(cols * rows); fog = new Float32Array(cols * rows).fill(0.6);
      const wide = W > 760, n = wide ? 15 : 8;
      lights = Array.from({ length: n }, () => ({ x: rnd() * W, y: H * (0.05 + rnd() * 0.62), r: (wide ? 30 : 20) + rnd() * (wide ? 60 : 34), v: 0.5 + rnd() * 0.5, ph: rnd() * TAU, pink: rnd() < 0.28 }));
      cars = []; drops = []; beads = [];
      for (let k = 0; k < (wide ? 260 : 110); k++) beads.push({ x: rnd() * W, y: rnd() * H, r: 0.8 + rnd() * 2.2 });
      for (let k = 0; k < (wide ? 18 : 9); k++) drops.push({ x: rnd() * W, y: rnd() * H, r: 13 + rnd() * 12, vy: 0, wob: rnd() * TAU });
      buildNeon();
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(() => { remask(); if (cols) buildNeon(); });

    const clearFog = (px, py, r, k) => {
      const cx = px / A.cellW, cy = py / A.cellH, rx = r / A.cellW, ry = r / A.cellH;
      for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(rows - 1, Math.ceil(cy + ry)); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(cols - 1, Math.ceil(cx + rx)); x++) {
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        if (d < 1) { const i = y * cols + x; fog[i] = Math.min(fog[i], fog[i] * (1 - k * (1 - d * d))); }
      }
    };
    const disc = (lx, ly, r, v, pink) => {
      const cw = A.cellW, ch = A.cellH;
      const x0 = Math.max(0, Math.floor((lx - r) / cw)), x1 = Math.min(cols - 1, Math.ceil((lx + r) / cw)), y0 = Math.max(0, Math.floor((ly - r) / ch)), y1 = Math.min(rows - 1, Math.ceil((ly + r) / ch));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d = Math.hypot((x + 0.5) * cw - lx, (y + 0.5) * ch - ly) / r;
        if (d >= 1) continue;
        const i = y * cols + x, add = v * (d > 0.8 ? 1 : 0.8) * (1 - Math.pow(d, 8) * 0.4);
        if (add > field[i]) { field[i] = Math.min(1, field[i] * 0.4 + add); ink[i] = pink ? 1 : 0; } else field[i] = Math.min(1, field[i] + add * 0.3);
      }
    };

    S.loop((t, dt) => {
      if (!field) return;
      P.decay(dt);
      const dark = L.theme() === 'dark', g = A.g, al = A.a, kk = A.k, cw = A.cellW, ch = A.cellH;
      // the street: soft discs of out-of-focus light, cars sliding through them
      field.fill(0); ink.fill(0);
      for (const l of lights) disc(l.x + Math.sin(t * 0.1 + l.ph) * 8, l.y, l.r, l.v * (0.85 + 0.15 * Math.sin(t * 1.3 + l.ph)), l.pink);
      if (Math.random() < dt * 0.45) { const left = Math.random() < 0.5; cars.push({ x: left ? -90 : W + 90, dir: left ? 1 : -1, y: H * (left ? 0.74 : 0.69), r: (W > 760 ? 30 : 20) + Math.random() * 12 }); }
      for (let k = cars.length - 1; k >= 0; k--) {
        const c = cars[k]; c.x += c.dir * 160 * dt;
        if (c.x < -160 || c.x > W + 160) { cars.splice(k, 1); continue; }
        disc(c.x, c.y, c.r, 0.9, c.dir < 0); disc(c.x + c.r * 1.9, c.y, c.r, 0.9, c.dir < 0);
      }
      // the glass: condensation creeps back, beads gather, heavy drops run
      for (let i = 0; i < fog.length; i++) fog[i] = Math.min(0.6, fog[i] + dt * 0.03);
      if ((beadT -= dt) <= 0) { beadT = 0.04; if (beads.length < (W > 760 ? 380 : 160)) beads.push({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.2 }); }
      if ((spawnT -= dt) <= 0) { spawnT = 0.5 + Math.random() * 0.7; if (drops.length < (W > 760 ? 34 : 16)) drops.push({ x: Math.random() * W, y: Math.random() * H * 0.6, r: 11 + Math.random() * 9, vy: 0, wob: Math.random() * TAU }); }
      if (P.down && !P.ui) clearFog(P.x, P.y, 40, 1);
      else if (P.active && !P.ui && !L.coarse && Math.hypot(P.vx, P.vy) > 30) clearFog(P.x, P.y, 26, 0.5);
      for (let j = drops.length - 1; j >= 0; j--) {
        const d = drops[j];
        if (d.r > 21) {
          d.vy = Math.min(240, d.vy + (d.r - 20) * 14 * dt);
          d.y += d.vy * dt; d.wob += dt * 2.6;
          d.x += Math.sin(d.wob + d.y * 0.015) * 10 * dt;
          if (Math.random() < dt * 5) { beads.push({ x: d.x + (Math.random() - 0.5) * d.r * 0.6, y: d.y - d.r * 1.4, r: 0.8 + Math.random() * 1.5 }); d.r -= 0.1; }
          clearFog(d.x, d.y - d.r * 0.4, d.r * 1.2, 1);
        } else d.r += dt * 0.5;
        for (let k = beads.length - 1; k >= 0; k--) { const b = beads[k]; if (Math.abs(b.x - d.x) < d.r && Math.abs(b.y - d.y) < d.r * 1.1 && Math.hypot(b.x - d.x, b.y - d.y) < d.r + b.r) { d.r = Math.sqrt(d.r * d.r + b.r * b.r * 2); beads.splice(k, 1); } }
        for (let k = j - 1; k >= 0; k--) { const o = drops[k]; if (Math.hypot(o.x - d.x, o.y - d.y) < (o.r + d.r) * 0.75) { d.r = Math.sqrt(d.r * d.r + o.r * o.r); d.x = (d.x + o.x) / 2; drops.splice(k, 1); j--; } }
        if (d.y - d.r > H) drops.splice(j, 1);
      }
      if ((flickT -= dt) <= 0) { flickT = 0.06; flick = Math.random() < 0.05 ? 0.15 : Math.random() < 0.1 ? 0.7 : 1; }
      // compose
      A.clear();
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        const f = fog[i], v = field[i] * (1 - f * 0.4);
        if (neonV[i] > 0.12) {
          const tube = neonE[i] >= 0 ? neonE[i] : BOK[7];
          g[i] = tube; al[i] = (0.55 + 0.45 * (1 - f * 0.4)) * flick; kk[i] = 1; continue;
        }
        if (neonG[i] > 0.06 && v < 0.2) { g[i] = GLOW[neonG[i] > 0.3 ? 1 : 0]; al[i] = (0.15 + neonG[i] * 0.5) * flick * (1 - f * 0.4); kk[i] = 1; continue; }
        if (v > 0.06) { g[i] = BOK[Math.max(1, Math.min(7, (v * 8) | 0))]; al[i] = 0.1 + 0.9 * v; kk[i] = ink[i]; }
        else if (f > 0.4 && L.hash(x, y) < 0.1) { g[i] = HAZE; al[i] = dark ? 0.07 * f : 0.12 * f; kk[i] = 0; }
      }
      for (const b of beads) { const x = Math.floor(b.x / cw), y = Math.floor(b.y / ch); if (x < 0 || y < 0 || x >= cols || y >= rows) continue; const i = y * cols + x; if (al[i] < 0.5) { g[i] = SM[Math.min(2, (b.r * 0.9) | 0)]; al[i] = 0.35 + b.r * 0.12; kk[i] = 0; } }
      for (const d of drops) {
        const rx = (d.r * 1.05) / cw, ry = (d.r * 1.2) / ch, cx = d.x / cw, cy = d.y / ch;
        for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(rows - 1, Math.floor(cy + ry)); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(cols - 1, Math.floor(cx + rx)); x++) {
          const ux = (x + 0.5 - cx) / rx, uy = (y + 0.5 - cy) / ry, q = Math.hypot(ux, uy);
          if (q > 1.08) continue;
          const i = y * cols + x;
          if (q > 0.7) { g[i] = Math.abs(ux) > Math.abs(uy) * 0.8 ? (ux < 0 ? LP : RP) : uy < 0 ? TOPG : BOTG; al[i] = 0.9; kk[i] = 0; continue; }
          // a lens: the street behind appears upside down and pulled in from far around the drop
          const sx = clamp(Math.round(cx - ux * rx * 4), 0, cols - 1), sy = clamp(Math.round(cy - uy * ry * 4), 0, rows - 1), si = sy * cols + sx;
          if (neonV[si] > 0.12) { g[i] = BOK[6]; al[i] = flick; kk[i] = 1; continue; }
          const v = field[si];
          if (ux < -0.25 && uy < -0.1) { g[i] = SPEC; al[i] = 0.9; kk[i] = 0; }
          else { g[i] = BOK[Math.max(1, Math.min(7, (v * 9) | 0))]; al[i] = 0.35 + 0.65 * v; kk[i] = ink[si]; }
        }
      }
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
    });
  },
});
