HEROES.push({
  id: 'intaglio',
  name: 'Intaglio',
  title: 'Intaglio · Money, with a signature',
  kind: 'Private bank',
  tech: 'A banknote guilloche drawn as engraved line work: interleaved families of modulated rosettes, a wave border and micro-lettering, every stroke stamped glyph by glyph. Type a name and its hash becomes the pattern; the old one dissolves into the new.',
  accent: '#1fbf7a',
  fonts: 'family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital@0;1&family=JetBrains+Mono:wght@400;500',
  css: `
.h-intaglio{--bg:#060706;--fg:#ebeae4;--mut:rgba(235,234,228,.56);--line:rgba(235,234,228,.18);--ink:#ebeae4;--acc:#2bcf88;font-family:"Libre Caslon Text",Georgia,serif}
:root[data-theme=light] .h-intaglio{--bg:#f0eee4;--fg:#121410;--mut:rgba(18,20,16,.6);--line:rgba(18,20,16,.18);--ink:#121410;--acc:#0c7a49}
.h-intaglio .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:22px clamp(18px,3.4vw,52px) 18px;pointer-events:none}
.h-intaglio .ui a,.h-intaglio .ui button,.h-intaglio .ui input{pointer-events:auto}
.h-intaglio .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font:400 11px/1 "JetBrains Mono",monospace;letter-spacing:.2em;text-transform:uppercase}
.h-intaglio .logo{font:400 22px/1 "Libre Caslon Display",Georgia,serif;letter-spacing:.42em;text-transform:uppercase}
.h-intaglio .links{display:flex;gap:30px}
.h-intaglio .links a{opacity:.62;transition:opacity .2s}.h-intaglio .links a:hover{opacity:1}
.h-intaglio .tt{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:2px;background:none;height:30px;padding:0 12px;font:inherit;letter-spacing:.2em}
.h-intaglio .tt i{width:8px;height:8px;background:var(--acc);transform:rotate(45deg)}
.h-intaglio .copy{align-self:center;max-width:min(540px,44vw)}
.h-intaglio .kick{margin:0 0 24px;font:400 11px/1 "JetBrains Mono",monospace;letter-spacing:.26em;text-transform:uppercase;color:var(--acc)}
.h-intaglio h1{margin:0 0 24px;font:400 clamp(46px,6.2vw,100px)/.98 "Libre Caslon Display",Georgia,serif;letter-spacing:-.015em}
.h-intaglio h1 em{font-family:"Libre Caslon Text",Georgia,serif;font-style:italic;font-size:.82em}
.h-intaglio .sub{margin:0 0 30px;max-width:40ch;font-size:clamp(15px,1.2vw,17px);line-height:1.62;color:var(--mut)}
.h-intaglio .name{display:flex;align-items:stretch;width:min(100%,470px);border-bottom:1px solid var(--fg)}
.h-intaglio .name label{display:flex;flex-direction:column;justify-content:center;gap:6px;flex:1;padding:10px 0}
.h-intaglio .name span{font:400 10px/1 "JetBrains Mono",monospace;letter-spacing:.24em;text-transform:uppercase;color:var(--mut)}
.h-intaglio .name input{border:0;background:none;outline:none;padding:0;font:italic 400 26px/1.1 "Libre Caslon Text",Georgia,serif;color:var(--fg);width:100%}
.h-intaglio .btn{display:inline-flex;align-items:center;gap:12px;margin-top:22px;height:50px;padding:0 24px;background:var(--acc);color:#04130b;font:500 11.5px/1 "JetBrains Mono",monospace;letter-spacing:.2em;text-transform:uppercase}
:root[data-theme=light] .h-intaglio .btn{color:#f4f2ea}
.h-intaglio .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font:400 10.5px/1.5 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)}
.h-intaglio .foot b{color:var(--acc);font-weight:500}
@media (max-width:980px){.h-intaglio .links{display:none}}
@media (max-width:760px){
  .h-intaglio .ui{padding:14px 16px 12px}
  .h-intaglio .logo{font-size:18px;letter-spacing:.3em}
  .h-intaglio .tt span{display:none}
  .h-intaglio .copy{align-self:end;max-width:none;margin-bottom:10px}
  .h-intaglio .kick{margin-bottom:12px;font-size:10px}
  .h-intaglio h1{font-size:clamp(40px,12vw,52px);margin-bottom:12px}
  .h-intaglio .sub{font-size:14.5px;margin-bottom:14px}
  .h-intaglio .name input{font-size:22px}
  .h-intaglio .btn{margin-top:14px;height:46px}
  .h-intaglio .foot .hide{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#">Intaglio</a>
    <nav class="links" aria-label="Primary"><a href="#">Accounts</a><a href="#">The card</a><a href="#">Advisors</a><a href="#">Members</a></nav>
    <button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"><i></i><span>Plate</span></button>
  </header>
  <div class="copy">
    <p class="kick" data-mask="text">Private banking &middot; by invitation</p>
    <h1 data-mask="text">Money,<br><em>with a signature.</em></h1>
    <p class="sub" data-mask="text">A private account and a solid-steel card, engraved with a guilloche generated from your name. No two cards are alike, because no two people are.</p>
    <div class="name"><label><span>Engrave a name</span><input maxlength="28" spellcheck="false" value="Alexandra Moreau" aria-label="Your name"></label></div>
    <a class="btn" href="#">Request an invitation &rarr;</a>
  </div>
  <footer class="foot"><span data-mask="text">Plate <b class="serial">A 000000 B</b></span><span class="hide" data-mask="text">Steel &middot; 18 g &middot; laser-engraved in Geneva</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU, clamp, lerp } = L;
    const A = S.ascii(root, { size: 12, mobile: 10, inks: ['--ink', '--acc'] });
    const P = S.pointer(root);
    const input = root.querySelector('input'), serial = root.querySelector('.serial');
    const maskEls = [...root.querySelectorAll('[data-mask], .name, .btn, .logo, .links a, .tt')];
    const GH = A.glyph('-'), GV = A.glyph('|'), GF = A.glyph('/'), GB = A.glyph('\\');
    let cx = 0, cy = 0, R = 100, mask = null, cur = null, prev = null, mix = 1, rot = 0, fw = 0, fh = 0;
    const params = (name) => {
      const h = L.hashStr(name.trim().toLowerCase() || 'intaglio');
      return { n: 5 + (h % 7), m: 11 + ((h >>> 3) % 13), a: 0.12 + ((h >>> 7) % 9) / 100, b: 0.04 + ((h >>> 11) % 7) / 100, N: 16 + ((h >>> 15) % 10), tw: ((h >>> 19) % 5) - 2, h };
    };
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 6, feather: 26, floor: 0.05 }); };
    const setup = () => {
      const wide = A.w > 760;
      R = wide ? Math.min(A.h * 0.4, A.w * 0.24) : Math.min(A.w * 0.46, A.h * 0.26);
      cx = wide ? A.w * 0.71 : A.w * 0.5; cy = wide ? A.h * 0.5 : A.h * 0.29;
      fw = Math.min(R * 1.3, A.w - cx - 12); fh = Math.min(R * 1.16, cy - (wide ? 76 : 52), A.h - cy - (wide ? 48 : 20));
      remask();
    };
    A.onResize = setup; setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);
    const setName = () => {
      const p = params(input.value);
      if (cur && p.h === cur.h) return;
      prev = cur; cur = p; mix = prev ? 0 : 1;
      serial.textContent = `${String.fromCharCode(65 + (p.h % 26))} ${String(p.h % 1000000).padStart(6, '0')} ${String.fromCharCode(65 + ((p.h >>> 5) % 26))}`;
    };
    setName();
    S.on(input, 'input', setName);

    const stamp = (px, py, gi, a, ink) => {
      const x = Math.floor(px / A.cellW), y = Math.floor(py / A.cellH);
      if (x < 0 || y < 0 || x >= A.cols || y >= A.rows) return;
      const i = y * A.cols + x;
      if (A.a[i] < a) { A.g[i] = gi; A.a[i] = a; A.k[i] = ink; }
    };
    const seg = (x0, y0, x1, y1, a, ink) => {
      const dx = x1 - x0, dy = y1 - y0, ang = Math.atan2(Math.abs(dy), Math.abs(dx));
      const gi = ang < 0.47 ? GH : ang > 1.1 ? GV : dx * dy > 0 ? GB : GF;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx) / A.cellW, Math.abs(dy) / A.cellH) * 1.3));
      for (let k = 0; k <= n; k++) stamp(x0 + (dx * k) / n, y0 + (dy * k) / n, gi, a, ink);
    };
    // one family of interleaved modulated rosettes between radii r0 and r1
    const rosette = (p, r0, r1, a, phase) => {
      const steps = 220;
      for (let k = 0; k < p.N; k++) {
        const ph = (k / p.N) * (TAU / p.n) + phase;
        let lx = 0, ly = 0;
        for (let s = 0; s <= steps; s++) {
          const th = (s / steps) * TAU;
          const u = 0.5 + 0.5 * Math.sin(p.n * th + ph * p.n) * (1 - p.b * 2) + p.b * Math.sin(p.m * th - ph * 3 + p.tw * th);
          const rr = (r0 + (r1 - r0) * clamp(u, 0, 1)) * R, x = cx + Math.cos(th + rot) * rr, y = cy + Math.sin(th + rot) * rr;
          if (s) seg(lx, ly, x, y, a, 1);
          lx = x; ly = y;
        }
      }
    };
    const pattern = (p, a, t) => {
      rosette(p, 0.08, 0.42, a * 0.9, t * 0.05);
      rosette({ ...p, n: p.n * 2 + 1, N: Math.round(p.N * 0.8) }, 0.5, 0.82, a, -t * 0.04);
      // outer border wave, like the edge of a banknote
      const steps = 360;
      for (let w = 0; w < 3; w++) {
        let lx = 0, ly = 0;
        for (let s = 0; s <= steps; s++) {
          const th = (s / steps) * TAU, rr = R * (0.9 + 0.035 * Math.sin(th * (p.m * 3) + w * 2.1 + t * 0.3));
          const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
          if (s) seg(lx, ly, x, y, a * 0.8, 1);
          lx = x; ly = y;
        }
      }
    };

    S.loop((t, dt) => {
      P.decay(dt);
      A.clear();
      mix = Math.min(1, mix + dt * 0.9);
      if (P.active && !P.ui && !P.idle(3000)) { const want = Math.atan2(P.y - cy, P.x - cx) * 0.15; rot = lerp(rot, want, Math.min(1, dt * 2)); }
      else rot = lerp(rot, 0, Math.min(1, dt * 0.5));
      if (prev && mix < 1) pattern(prev, 0.95 * (1 - mix), t);
      pattern(cur, 0.95 * Math.min(1, mix * 1.2), t);
      // micro-lettering ring
      const name = (input.value.trim() || 'Intaglio').toUpperCase(), ring = ` INTAGLIO PRIVATE . ENGRAVED FOR ${name} . NO TWO ALIKE .`;
      const rr = R * 1.0, n = Math.round((TAU * rr) / (A.cellW * 1.15));
      for (let k = 0; k < n; k++) {
        const th = (k / n) * TAU - t * 0.03, x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 1.0;
        const c = ring[k % ring.length];
        if (c !== ' ') stamp(x, y, A.glyph(c), 0.75, 0);
      }
      // engraved frame with corner guards
      const x0 = cx - fw, x1 = cx + fw, y0 = cy - fh, y1 = cy + fh;
      for (const [a, b, c, d] of [[x0, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, y1], [x1, y0, x1, y1]]) seg(a, b, c, d, 0.5, 0);
      for (const [a, b, c, d] of [[x0 + 8, y0 + 8, x1 - 8, y0 + 8], [x0 + 8, y1 - 8, x1 - 8, y1 - 8]]) seg(a, b, c, d, 0.25, 0);
      const lab = cur ? serial.textContent : '';
      A.text(Math.round(x0 / A.cellW) + 2, Math.round(y0 / A.cellH) + 1, lab, 0.9, 1);
      A.text(Math.round(x1 / A.cellW) - 2 - lab.length, Math.round(y1 / A.cellH) - 2, lab, 0.9, 1);
      if (mask) for (let i = 0; i < A.n; i++) A.a[i] *= mask[i];
      A.render();
    });
  },
});
