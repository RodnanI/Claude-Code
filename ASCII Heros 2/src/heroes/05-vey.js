HEROES.push({
  id: 'vey',
  name: 'Vey',
  title: 'Vey · Every second, made by hand',
  kind: 'Independent watchmaker',
  tech: 'A beating lever escapement: the balance swings, the hairspring breathes, the pallet fork releases the escape wheel half a tooth per beat and the train ticks along with it. The cursor is a watchmaker\'s loupe that re-renders the movement at 2.4x.',
  accent: null,
  fonts: 'family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500',
  css: `
.h-vey{--bg:#070707;--fg:#ece9e2;--mut:rgba(236,233,226,.56);--line:rgba(236,233,226,.16);--ink:#ece9e2;font-family:"IBM Plex Mono",ui-monospace,monospace}
:root[data-theme=light] .h-vey{--bg:#f1eee7;--fg:#121110;--mut:rgba(18,17,16,.6);--line:rgba(18,17,16,.16);--ink:#121110}
.h-vey .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:22px clamp(18px,3.4vw,52px) 20px;pointer-events:none}
.h-vey .ui a,.h-vey .ui button{pointer-events:auto}
.h-vey .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.h-vey .logo{font:500 30px/1 "Cormorant Garamond",Georgia,serif;letter-spacing:.32em;text-transform:uppercase}
.h-vey .links{display:flex;gap:34px}
.h-vey .links a{opacity:.62;transition:opacity .2s}.h-vey .links a:hover{opacity:1}
.h-vey .tt{display:flex;align-items:center;gap:10px;border:0;background:none;padding:6px 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.h-vey .tt svg{width:18px;height:18px}
.h-vey .copy{align-self:center;max-width:min(560px,44vw)}
.h-vey .kick{margin:0 0 26px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--mut)}
.h-vey h1{margin:0 0 26px;font:400 clamp(46px,6.4vw,104px)/.94 "Cormorant Garamond",Georgia,serif;letter-spacing:-.02em}
.h-vey h1 em{font-style:italic}
.h-vey .sub{margin:0 0 34px;max-width:40ch;font:400 clamp(17px,1.4vw,21px)/1.45 "Cormorant Garamond",Georgia,serif;color:var(--mut)}
.h-vey .cta{display:flex;flex-wrap:wrap;gap:22px;align-items:center}
.h-vey .btn{display:inline-flex;align-items:center;height:50px;padding:0 26px;border:1px solid var(--fg);font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;transition:background-color .3s,color .3s}
.h-vey .btn:hover{background:var(--fg);color:var(--bg)}
.h-vey .lnk{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;border-bottom:1px solid var(--line);padding-bottom:4px}
.h-vey .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.h-vey .beat{display:flex;flex-direction:column;gap:6px}
.h-vey .beat b{font:500 22px/1 "IBM Plex Mono",monospace;letter-spacing:.02em;color:var(--fg);font-variant-numeric:tabular-nums}
.h-vey .specs{display:flex;gap:26px;text-align:right}
.h-vey .specs span b{display:block;margin-top:6px;font:500 13px/1 "IBM Plex Mono",monospace;letter-spacing:.06em;color:var(--fg)}
@media (max-width:980px){.h-vey .links{display:none}.h-vey .specs span:nth-child(n+3){display:none}}
@media (max-width:760px){
  .h-vey .ui{padding:14px 16px 14px}
  .h-vey .logo{font-size:24px}
  .h-vey .tt .lbl{display:none}
  .h-vey .copy{align-self:end;max-width:none;margin-bottom:18px}
  .h-vey .kick{margin-bottom:14px;font-size:10px}
  .h-vey h1{font-size:clamp(42px,12.5vw,56px);margin-bottom:14px}
  .h-vey .sub{font-size:17px;margin-bottom:20px}
  .h-vey .btn{height:46px;padding:0 18px}
  .h-vey .specs{display:none}
  .h-vey .beat b{font-size:17px}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">Vey</a>
    <nav class="links" aria-label="Primary"><a href="#">Calibres</a><a href="#">Atelier</a><a href="#">Journal</a><a href="#">Appointments</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor"/><path d="M10 1.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg><span class="lbl">Light</span></button>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">Calibre V-01 &middot; hand-wound &middot; Le Sentier</p>
    <h1 data-mask="text">Every second,<br><em>made by hand.</em></h1>
    <p class="sub" data-mask="text">Two hundred and four parts, finished one at a time in the Vall&eacute;e de Joux. Forty-two watches a year, and one of them could be yours.</p>
    <div class="cta"><a class="btn" href="#">Request an appointment</a><a class="lnk" href="#">Inside the calibre</a></div>
  </div>
  <footer class="foot">
    <div class="beat" data-mask="text"><span>Beating now</span><b class="clock">00:00:00.0</b></div>
    <div class="specs"><span>Frequency<b>28,800 vph</b></span><span>Reserve<b>72 h</b></span><span>Jewels<b>31</b></span><span>Diameter<b>32.4 mm</b></span></div>
  </footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10 });
    const P = S.pointer(root);
    const clock = root.querySelector('.clock');
    const maskEls = [...root.querySelectorAll('[data-mask], .btn, .lnk, .logo, .links a, .tt, .specs')];
    const GH = A.glyph('-'), GU = A.glyph('_'), GV = A.glyph('|'), GF = A.glyph('/'), GB = A.glyph('\\'), DOT = A.glyph('.'), JEW = A.glyph('@'), RING = A.glyph('o'), SCR = A.glyph('0');
    let W = 1, H = 1, cx = 0, cy = 0, Rm = 100, mask = null, clockT = 0;
    const lens = { x: 0, y: 0, r: 0, on: 0 };
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 24, floor: 0.06 }); };
    const setup = () => {
      W = A.w; H = A.h;
      const wide = W > 760;
      Rm = wide ? Math.min(H * 0.47, W * 0.3) : Math.min(W * 0.6, H * 0.3);
      cx = wide ? W * 0.7 : W * 0.55; cy = wide ? H * 0.5 : H * 0.31;
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    /* ---- vector to glyph: every stroke is stamped cell by cell with a slope glyph ---- */
    let view = { z: 1, ox: 0, oy: 0 }, clip = null;
    const X = (x) => cx + x * Rm, Y = (y) => cy + y * Rm;
    const tx = (x) => (X(x) - view.ox) * view.z + view.ox, ty = (y) => (Y(y) - view.oy) * view.z + view.oy;
    const stamp = (px, py, gi, a) => {
      if (clip && Math.hypot(px - clip.x, py - clip.y) > clip.r) return;
      if (!clip && lens.r > 4 && Math.hypot(px - lens.x, py - lens.y) < lens.r) return;
      const x = Math.floor(px / A.cellW), y = Math.floor(py / A.cellH);
      if (x < 0 || y < 0 || x >= A.cols || y >= A.rows) return;
      const i = y * A.cols + x;
      if (A.a[i] < a) { A.g[i] = gi; A.a[i] = a; }
    };
    const seg = (x0, y0, x1, y1, a) => {
      const X0 = tx(x0), Y0 = ty(y0), X1 = tx(x1), Y1 = ty(y1), dx = X1 - X0, dy = Y1 - Y0;
      const ang = Math.atan2(Math.abs(dy), Math.abs(dx));
      const gi = ang < 0.47 ? (dy >= 0 === dx >= 0 ? GH : GH) : ang > 1.1 ? GV : (dx * dy > 0 ? GB : GF);
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / A.cellW, Math.abs(dy) / A.cellH) * 1.4));
      for (let k = 0; k <= n; k++) stamp(X0 + (dx * k) / n, Y0 + (dy * k) / n, gi, a);
    };
    const poly = (pts, closed, a) => { for (let k = 0; k < pts.length - (closed ? 0 : 1); k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; seg(p[0], p[1], q[0], q[1], a); } };
    const circ = (x, y, r, a, from = 0, to = TAU) => { const n = Math.max(18, Math.ceil(r * Rm * view.z * Math.abs(to - from) / 9)), pts = []; for (let k = 0; k <= n; k++) { const t = from + ((to - from) * k) / n; pts.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); } poly(pts, false, a); };
    const dot = (x, y, gi, a) => stamp(tx(x), ty(y), gi, a);

    /* gear train in movement radii; meshing radii chosen to touch */
    const g = (x, y, r, teeth) => ({ x, y, r, teeth });
    const B = g(-0.38, -0.42, 0.32, 26);
    const C = g(B.x + 0.54 * Math.cos(0.44), B.y + 0.54 * Math.sin(0.44), 0.22, 18);
    const F = g(C.x + 0.39 * Math.cos(-0.17), C.y + 0.39 * Math.sin(-0.17), 0.17, 14);
    const E = g(F.x + 0.29 * Math.cos(1.75), F.y + 0.29 * Math.sin(1.75), 0.12, 15);
    const BAL = g(0.02, 0.5, 0.32, 0), PAL = { x: (E.x + BAL.x) / 2 + 0.04, y: (E.y + BAL.y) / 2 - 0.02 };

    const wheel = (w, ang, a, spokes, tip) => {
      const n = w.teeth, r0 = w.r - tip, st = TAU / n, pts = [];
      for (let k = 0; k < n; k++) { const b = ang + k * st; pts.push([w.x + Math.cos(b) * r0, w.y + Math.sin(b) * r0], [w.x + Math.cos(b + st * 0.2) * w.r, w.y + Math.sin(b + st * 0.2) * w.r], [w.x + Math.cos(b + st * 0.52) * w.r, w.y + Math.sin(b + st * 0.52) * w.r], [w.x + Math.cos(b + st * 0.72) * r0, w.y + Math.sin(b + st * 0.72) * r0]); }
      poly(pts, true, a);
      circ(w.x, w.y, r0 * 0.78, a * 0.75);
      for (let k = 0; k < spokes; k++) { const b = ang + (k * TAU) / spokes; seg(w.x + Math.cos(b) * w.r * 0.2, w.y + Math.sin(b) * w.r * 0.2, w.x + Math.cos(b) * r0 * 0.78, w.y + Math.sin(b) * r0 * 0.78, a * 0.85); }
      circ(w.x, w.y, w.r * 0.2, a);
    };
    const escape = (ang, a) => {
      const n = 15, r = E.r, r0 = r * 0.7, st = TAU / n, pts = [];
      for (let k = 0; k < n; k++) { const b = ang + k * st; pts.push([E.x + Math.cos(b) * r0, E.y + Math.sin(b) * r0], [E.x + Math.cos(b + st * 0.6) * r, E.y + Math.sin(b + st * 0.6) * r], [E.x + Math.cos(b + st * 0.78) * r * 0.95, E.y + Math.sin(b + st * 0.78) * r * 0.95], [E.x + Math.cos(b + st * 0.68) * r0, E.y + Math.sin(b + st * 0.68) * r0]); }
      poly(pts, true, a);
      for (let k = 0; k < 4; k++) { const b = ang + (k * TAU) / 4; seg(E.x, E.y, E.x + Math.cos(b) * r0 * 0.9, E.y + Math.sin(b) * r0 * 0.9, a * 0.8); }
    };
    const balance = (th, a) => {
      const r = BAL.r, pts = [], turns = 5, N = 200;
      for (let k = 0; k <= N; k++) { const u = k / N, b = u * turns * TAU + th * (1 - u), rr = r * (0.2 + 0.52 * u); pts.push([BAL.x + Math.cos(b) * rr, BAL.y + Math.sin(b) * rr]); }
      poly(pts, false, a * 0.55);
      circ(BAL.x, BAL.y, r, a); circ(BAL.x, BAL.y, r * 0.88, a * 0.8);
      for (let k = 0; k < 3; k++) { const b = th + (k * TAU) / 3; seg(BAL.x + Math.cos(b) * r * 0.14, BAL.y + Math.sin(b) * r * 0.14, BAL.x + Math.cos(b) * r * 0.88, BAL.y + Math.sin(b) * r * 0.88, a); }
      for (let k = 0; k < 12; k++) { const b = th + (k * TAU) / 12 + 0.26; dot(BAL.x + Math.cos(b) * r * 1.06, BAL.y + Math.sin(b) * r * 1.06, SCR, a); }
      circ(BAL.x, BAL.y, r * 0.14, a);
      dot(BAL.x + Math.cos(th + 0.5) * r * 0.1, BAL.y + Math.sin(th + 0.5) * r * 0.1, JEW, a);
    };
    const fork = (rock, a) => {
      const toE = Math.atan2(E.y - PAL.y, E.x - PAL.x) + rock, toB = Math.atan2(BAL.y - PAL.y, BAL.x - PAL.x) + rock;
      const fx = PAL.x + Math.cos(toB) * 0.2, fy = PAL.y + Math.sin(toB) * 0.2;
      seg(PAL.x, PAL.y, fx, fy, a);
      for (const sd of [-1, 1]) { const b = toB + sd * 0.4; seg(fx, fy, fx + Math.cos(b) * 0.05, fy + Math.sin(b) * 0.05, a); }
      for (const sd of [-1, 1]) { const b = toE + sd * 0.62, x1 = PAL.x + Math.cos(b) * 0.14, y1 = PAL.y + Math.sin(b) * 0.14; seg(PAL.x, PAL.y, x1, y1, a); seg(x1, y1, x1 + Math.cos(b - sd * 0.9) * 0.05, y1 + Math.sin(b - sd * 0.9) * 0.05, a); }
      dot(PAL.x, PAL.y, JEW, 1);
    };
    const jewel = (x, y) => { dot(x, y, JEW, 1); };
    const movement = (t) => {
      const beat = t * 5, b = Math.floor(beat), fr = beat - b, ease = 1 - Math.pow(1 - Math.min(1, fr * 7), 3);
      const esc = ((b + ease) * TAU) / 30, th = 1.45 * Math.sin(Math.PI * beat), rock = (b % 2 ? 1 : -1) * (0.16 * ease - 0.08) * 1.5;
      const aF = (-esc * E.teeth) / F.teeth, aC = (-aF * F.teeth) / C.teeth, aB = (-aC * C.teeth) / B.teeth;
      // perlage on the mainplate, then the case rings
      for (let k = 0; k < 150; k++) { const a = k * 2.39996, rr = Math.sqrt((k + 0.5) / 150) * 0.93; dot(Math.cos(a) * rr, Math.sin(a) * rr, DOT, 0.22); }
      circ(0, 0, 1, 0.9); circ(0, 0, 0.955, 0.4);
      for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU; seg(Math.cos(a) * 0.955, Math.sin(a) * 0.955, Math.cos(a) * (k % 5 ? 0.975 : 1), Math.sin(a) * (k % 5 ? 0.975 : 1), k % 5 ? 0.35 : 0.8); }
      wheel(B, aB, 0.6, 6, 0.05); wheel(C, aC, 0.82, 4, 0.05); wheel(F, aF, 0.82, 4, 0.045);
      escape(esc, 1); fork(rock, 0.95); balance(th, 1);
      // skeletonised bridges
      circ(B.x, B.y, 0.12, 0.5); poly([[-0.93, -0.3], [B.x - 0.1, B.y + 0.07]], false, 0.5); poly([[-0.45, -0.88], [B.x + 0.02, B.y - 0.12]], false, 0.5);
      poly([[-0.3, 0.05], [C.x - 0.02, C.y + 0.06], [F.x, F.y + 0.06], [0.9, -0.08]], false, 0.5); poly([[-0.24, -0.05], [C.x, C.y - 0.06], [F.x + 0.03, F.y - 0.07], [0.82, -0.42]], false, 0.5);
      poly([[0.86, 0.42], [0.45, 0.48], [BAL.x + 0.06, BAL.y + 0.02]], false, 0.6); poly([[0.8, 0.58], [0.4, 0.6], [BAL.x + 0.06, BAL.y + 0.09]], false, 0.6);
      for (const w of [C, F, E, B]) jewel(w.x, w.y);
      jewel(BAL.x, BAL.y);
      for (const [x, y] of [[-0.86, -0.25], [-0.36, 0.02], [0.84, -0.18], [0.62, -0.62], [0.7, 0.5], [-0.6, 0.62]]) { dot(x, y, SCR, 0.9); dot(x - 0.012, y, GH, 0.9); }
    };

    S.loop((t, dt) => {
      P.decay(dt);
      const want = P.active && !P.ui && Math.hypot(P.x - cx, P.y - cy) < Rm * 1.15 ? 1 : 0;
      lens.on += (want - lens.on) * Math.min(1, dt * 8);
      if (want) { lens.x += (P.x - lens.x) * Math.min(1, dt * 14); lens.y += (P.y - lens.y) * Math.min(1, dt * 14); }
      lens.r = (W < 760 ? 76 : 124) * lens.on;
      A.clear();
      view = { z: 1, ox: 0, oy: 0 }; clip = null;
      movement(t);
      if (lens.r > 4) {
        view = { z: 2.4, ox: lens.x, oy: lens.y }; clip = lens;
        movement(t);
        view = { z: 1, ox: 0, oy: 0 }; clip = null;
        const n = Math.round(lens.r * 0.36);
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU; stamp(lens.x + Math.cos(a) * lens.r * 1.04, lens.y + Math.sin(a) * lens.r * 1.04, RING, 0.85 * lens.on); }
        A.text(Math.round((lens.x + lens.r * 0.75) / A.cellW), Math.round((lens.y + lens.r * 0.95) / A.cellH), 'x2.4', lens.on);
      }
      if (mask) for (let i = 0; i < A.n; i++) A.a[i] *= mask[i];
      A.render();
      if ((clockT -= dt) <= 0) {
        clockT = 0.1;
        const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
        clock.textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${Math.floor(d.getMilliseconds() / 200) * 2}`;
      }
    });
  },
});
