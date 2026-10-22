HEROES.push({
  id: 'halde',
  name: 'Halde',
  title: 'Halde · We draw with light first',
  kind: 'Architecture studio',
  tech: 'A brutalist building ray-cast glyph by glyph in orthographic projection: analytic box hits, shadow rays toward a moving sun, hatching chosen by face orientation like an architect\'s poche. Night swaps the sun for lit windows. Drag to move the sun.',
  accent: null,
  fonts: 'family=Familjen+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=Space+Mono:wght@400',
  css: `
.h-halde{--bg:#080808;--fg:#eceae6;--mut:rgba(236,234,230,.56);--line:rgba(236,234,230,.16);--ink:#eceae6;font-family:"Familjen Grotesk",system-ui,sans-serif}
:root[data-theme=light] .h-halde{--bg:#efedea;--fg:#111;--mut:rgba(17,17,17,.6);--line:rgba(17,17,17,.16);--ink:#111}
.h-halde .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:20px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-halde .ui a,.h-halde .ui button{pointer-events:auto}
.h-halde .nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:16px;font-size:14px}
.h-halde .logo{font-weight:600;font-size:15px;letter-spacing:.02em;line-height:1.2}
.h-halde .logo span{display:block;font-weight:400;color:var(--mut)}
.h-halde .links{display:flex;gap:24px}
.h-halde .links a{opacity:.62;transition:opacity .2s}.h-halde .links a:hover{opacity:1}
.h-halde .tt{justify-self:end;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:2px;background:none;height:32px;padding:0 4px;font:400 11px/1 "Space Mono",monospace;text-transform:uppercase}
.h-halde .tt span{padding:5px 7px;border-radius:1px}
.h-halde .tt .lt{background:var(--fg);color:var(--bg)}
:root[data-theme=dark] .h-halde .tt .dk{background:var(--fg);color:var(--bg)}
:root[data-theme=dark] .h-halde .tt .lt{background:none;color:inherit}
.h-halde .copy{grid-row:3;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:24px 48px;align-items:end}
.h-halde h1{margin:0;font-weight:500;font-size:clamp(46px,6.6vw,108px);line-height:.92;letter-spacing:-.045em}
.h-halde h1 em{font-weight:400}
.h-halde .side{display:flex;flex-direction:column;gap:18px;padding-bottom:6px}
.h-halde .sub{margin:0;max-width:40ch;font-size:clamp(14px,1.1vw,16px);line-height:1.55;color:var(--mut)}
.h-halde .cta{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}
.h-halde .cta a{border-bottom:1px solid var(--fg);padding-bottom:3px}
.h-halde .sun{font:400 10.5px/1.6 "Space Mono",monospace;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
.h-halde .sun b{color:var(--fg);font-weight:400}
@media (max-width:980px){.h-halde .links{display:none}.h-halde .nav{grid-template-columns:1fr auto}}
@media (max-width:760px){
  .h-halde .ui{padding:14px 16px 12px}
  .h-halde .copy{grid-template-columns:1fr;gap:14px}
  .h-halde h1{font-size:clamp(40px,12.4vw,54px)}
  .h-halde .sub{font-size:14px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">Halde<span>Arkitekter, Oslo</span></a>
    <nav class="links" aria-label="Primary"><a href="#">Work</a><a href="#">Studio</a><a href="#">Texts</a><a href="#">Contact</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle day and night"><span class="lt">Day</span><span class="dk">Night</span></button>
  </header>
  <div class="copy">
    <h1 data-mask="text">We draw<br>with light <em>first.</em></h1>
    <div class="side">
      <p class="sub" data-mask="text">A twelve-person practice in Oslo. Before we draw a single wall we follow the sun across the site for a year, then build what the light asks for.</p>
      <div class="cta"><a href="#">Selected work</a><a href="#">Write to us</a></div>
      <p class="sun" data-mask="text">Sun <b class="az">-</b> &middot; drag to move it</p>
    </div>
  </div>
</div>`,
  init: function (root, L, S) {
    const { clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const P = S.pointer(root);
    const az = root.querySelector('.az');
    const maskEls = [...root.querySelectorAll('[data-mask], .cta a, .logo, .links a, .tt')];
    const G = (c) => A.glyph(c);
    const HATCH = { top: G('-'), xp: G('/'), zp: G('\\'), xn: G('/'), zn: G('\\') }, DOT = G('.');
    // massing: boxes in metres-ish units [x0,x1, y0,y1, z0,z1]
    const B = [
      [-3.2, 3.0, 0, 4.0, -1.6, 1.6],      // main slab
      [-5.4, 1.2, 4.0, 5.5, -2.1, 2.1],    // cantilevered top
      [2.2, 3.9, 0, 7.4, -1.0, 3.4],       // stair tower
      [-7.2, -3.2, 0, 1.5, -0.2, 3.4],     // low wing
      [-5.2, -4.8, 0, 4.0, -1.9, -1.5],    // pilotis
      [-5.2, -4.8, 0, 4.0, 1.5, 1.9],
      [-1.0, 1.0, 5.5, 6.3, -0.6, 0.6],    // roof lantern
    ];
    let cx = 0, cy = 0, scale = 20, mask = null, sunT = 0.35, drag = null, azT = 0, F = null;
    const C = [1, 0.82, 1.25], Cl = Math.hypot(...C); C[0] /= Cl; C[1] /= Cl; C[2] /= Cl;
    const Rv = [C[2], 0, -C[0]], Rl = Math.hypot(...Rv); Rv[0] /= Rl; Rv[2] /= Rl;
    const Uv = [C[1] * Rv[2] - C[2] * Rv[1], C[2] * Rv[0] - C[0] * Rv[2], C[0] * Rv[1] - C[1] * Rv[0]];
    const D = [-C[0], -C[1], -C[2]];
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 24, floor: 0.08 }); };
    const setup = () => {
      const W = A.w, H = A.h, wide = W > 760;
      scale = wide ? Math.min(W / 27, H / 16) : Math.min(W / 17, H / 26);
      cx = wide ? W * 0.63 : W * 0.52; cy = wide ? H * 0.47 : H * 0.35;
      F = new Float32Array(A.n);
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    const hit = (o, d) => {
      let best = 1e9, bi = -1, axis = 0, sgn = 0;
      for (let b = 0; b < B.length; b++) {
        const bx = B[b];
        let t0 = -1e9, t1 = 1e9, ax = 0, sg = 0;
        for (let k = 0; k < 3; k++) {
          const lo = bx[k * 2], hi = bx[k * 2 + 1], dk = d[k], ok = o[k];
          if (Math.abs(dk) < 1e-9) { if (ok < lo || ok > hi) { t0 = 1e9; break; } continue; }
          let ta = (lo - ok) / dk, tb = (hi - ok) / dk, s = -1;
          if (ta > tb) { const q = ta; ta = tb; tb = q; s = 1; }
          if (ta > t0) { t0 = ta; ax = k; sg = s; }
          if (tb < t1) t1 = tb;
          if (t0 > t1) break;
        }
        if (t0 <= t1 && t0 > 1e-4 && t0 < best) { best = t0; bi = b; axis = ax; sgn = sg; }
      }
      return bi < 0 ? null : { t: best, b: bi, axis, sgn };
    };

    S.loop((t, dt) => {
      P.decay(dt);
      const dark = L.theme() === 'dark', cols = A.cols, rows = A.rows, g = A.g, al = A.a, cw = A.cellW, ch = A.cellH;
      for (const tp of P.taps.splice(0)) drag = { x: tp.x, s: sunT };
      if (!P.down) drag = null;
      if (drag) sunT = clamp(drag.s + (P.x - drag.x) / (A.w * 0.8), 0.02, 0.98);
      else sunT += dt * 0.012;
      if (sunT > 0.98) sunT = 0.02;
      // sun path: rises in the east, highest at noon, sets in the west
      const azm = lerp(1.9, 4.6, sunT), el = 0.12 + Math.sin(Math.PI * sunT) * 0.85;
      const Ls = [Math.cos(azm) * Math.cos(el), Math.sin(el), Math.sin(azm) * Math.cos(el)];
      const Lm = [0.4, 0.75, -0.5], lmn = Math.hypot(...Lm); Lm[0] /= lmn; Lm[1] /= lmn; Lm[2] /= lmn;
      const Lu = dark ? Lm : Ls;
      A.clear();
      F.fill(0);
      for (let y = 0, i = 0; y < rows; y++) {
        const sy = -((y + 0.5) * ch - cy) / scale;
        for (let x = 0; x < cols; x++, i++) {
          const sx = ((x + 0.5) * cw - cx) / scale;
          const o = [C[0] * 40 + Rv[0] * sx + Uv[0] * sy, C[1] * 40 + Rv[1] * sx + Uv[1] * sy, C[2] * 40 + Rv[2] * sx + Uv[2] * sy];
          const h = hit(o, D);
          let p, nrm, face, b = -1;
          if (h) { p = [o[0] + D[0] * h.t, o[1] + D[1] * h.t, o[2] + D[2] * h.t]; nrm = [0, 0, 0]; nrm[h.axis] = h.sgn; face = h.axis * 2 + (h.sgn > 0 ? 1 : 0); b = h.b; }
          else {
            if (D[1] >= 0) continue;
            const tg = -o[1] / D[1];
            p = [o[0] + D[0] * tg, 0, o[2] + D[2] * tg]; nrm = [0, 1, 0]; face = 9;
            if (Math.hypot(p[0] + 1.5, p[2] - 0.5) > 12) continue;
          }
          F[i] = face === 9 ? 0 : face * 0.11 + (b + 1) * 0.07;
          const fade = face === 9 ? clamp(1.25 - Math.hypot(p[0] + 1.5, p[2] - 0.5) / 10, 0, 1) : 1;
          const nd = nrm[0] * Lu[0] + nrm[1] * Lu[1] + nrm[2] * Lu[2];
          let lit = Math.max(0, nd);
          if (lit > 0 && !dark) { const sh = hit([p[0] + nrm[0] * 1e-3, p[1] + nrm[1] * 1e-3, p[2] + nrm[2] * 1e-3], Ls); if (sh) lit = 0; }
          // ribbon windows on the walls (two strips per floor), a paving grid on the ground
          let win = false, lamp = false;
          if (face !== 9 && h && h.axis !== 1 && b !== 4 && b !== 5) {
            const u = h.axis === 0 ? p[2] : p[0], v = p[1], fv = ((v % 1.35) + 1.35) % 1.35;
            win = fv > 0.62 && fv < 0.9 && v > 0.4;
            if (win) lamp = L.hash(Math.floor(u / 1.6) + b * 31, Math.floor(v / 1.35) + h.axis * 7) < 0.45;
          }
          // hatching is drawn as spaced parallel lines, like a pen drawing, never as a solid fill
          const hx = h ? (h.axis === 1 ? (y % 2 === 0) : h.axis === 0 ? ((x + y * 2) % 4 === 0) : ((x - y * 2) % 4 === 0 || (x - y * 2) % 4 === -4)) : false;
          if (dark) {
            if (win && lamp) { g[i] = G('='); al[i] = 0.8 + 0.2 * Math.sin(t * 0.5 + i); }
            else if (win) { g[i] = G('-'); al[i] = 0.18; }
            else if (face === 9) { g[i] = L.hash(x, y) < 0.05 ? DOT : 0; al[i] = 0.12 * fade; }
            else if (lit > 0.3 && hx) { g[i] = DOT; al[i] = 0.14 + lit * 0.12; }
          } else {
            const shade = 1 - (0.2 + 0.8 * lit);
            if (win) { g[i] = G('='); al[i] = 0.45 + shade * 0.35; }
            else if (face === 9) {
              const grid = Math.abs(p[0] - Math.round(p[0])) < 0.06 || Math.abs(p[2] - Math.round(p[2])) < 0.06;
              if (shade > 0.5) { if ((x + y) % 2 === 0) { g[i] = G('/'); al[i] = 0.42 * fade; } }
              else if (grid) { g[i] = DOT; al[i] = 0.2 * fade; }
            } else {
              const hg = h.axis === 1 ? HATCH.top : h.axis === 0 ? (h.sgn > 0 ? HATCH.xp : HATCH.xn) : h.sgn > 0 ? HATCH.zp : HATCH.zn;
              if (shade > 0.55 && hx) { g[i] = hg; al[i] = 0.3 + shade * 0.4; }
              else if (shade > 0.3 && hx && (x + y) % 2 === 0) { g[i] = hg; al[i] = 0.3; }
            }
          }
        }
      }
      // outlines wherever face or mass changes
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        if (!F[i] && !F[i + 1] && !F[i + cols]) continue;
        const e = L.edge(A, F, x, y, 0.08);
        if (e >= 0) { g[i] = e; al[i] = dark ? 0.55 : 1; }
      }
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
      if ((azT -= dt) <= 0) {
        azT = 0.15;
        const hh = 5 + sunT * 16, mm = Math.floor((hh % 1) * 60);
        az.textContent = dark ? 'down · 31 windows lit' : `${String(Math.floor(hh)).padStart(2, '0')}:${String(mm).padStart(2, '0')} · azimuth ${Math.round((azm * 180) / Math.PI) % 360}° · elevation ${Math.round((el * 180) / Math.PI)}°`;
      }
    });
  },
});
