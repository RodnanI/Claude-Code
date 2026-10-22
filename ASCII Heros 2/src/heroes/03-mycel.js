HEROES.push({
  id: 'mycel',
  name: 'Mycel',
  title: 'Mycel · The network that routes itself',
  kind: 'Edge network for developers',
  tech: 'Physarum polycephalum: thousands of sensing agents deposit and follow a diffusing trail until the shortest links between regions survive. Vein glyphs follow the agents\' travel direction; the cursor is light, which slime mold avoids.',
  accent: null,
  fonts: 'family=Martian+Mono:wdth,wght@75..112.5,300..700&family=IBM+Plex+Sans:wght@400;500',
  css: `
.h-mycel{--bg:#060706;--fg:#e4e8e2;--mut:rgba(228,232,226,.55);--line:rgba(228,232,226,.16);--card:#0c0e0c;--ink:#e4e8e2;font-family:"IBM Plex Sans",system-ui,sans-serif}
:root[data-theme=light] .h-mycel{--bg:#f0f1ec;--fg:#0e100e;--mut:rgba(14,16,14,.6);--line:rgba(14,16,14,.16);--card:#fbfbf8;--ink:#0e100e}
.h-mycel .ui{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:auto 1fr auto;padding:18px clamp(16px,3vw,44px) 18px;pointer-events:none}
.h-mycel .ui a,.h-mycel .ui button,.h-mycel .term{pointer-events:auto}
.h-mycel .nav{display:flex;align-items:center;justify-content:space-between;gap:16px;font:500 12px/1 "Martian Mono",ui-monospace,monospace;letter-spacing:-.01em}
.h-mycel .logo{display:flex;align-items:center;gap:10px;font:700 17px/1 "Martian Mono",monospace;font-stretch:112%;letter-spacing:-.04em}
.h-mycel .logo i{display:inline-grid;place-items:center;width:22px;height:22px;border:1.5px solid currentColor;border-radius:50%;font:700 11px/1 "Martian Mono",monospace;font-style:normal}
.h-mycel .links{display:flex;gap:26px}
.h-mycel .links a{opacity:.62;transition:opacity .2s}.h-mycel .links a:hover{opacity:1}
.h-mycel .r{display:flex;align-items:center;gap:10px}
.h-mycel .gh{display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:6px;background:var(--bg)}
.h-mycel .tt{width:32px;height:32px;border:1px solid var(--line);border-radius:6px;background:var(--bg);display:grid;place-items:center;font:700 13px/1 "Martian Mono",monospace}
.h-mycel .tt::before{content:"\\25D0"}
.h-mycel .copy{align-self:center;max-width:620px}
.h-mycel .tag{display:inline-flex;align-items:center;gap:10px;height:30px;padding:0 12px 0 4px;border:1px solid var(--line);border-radius:999px;font:500 11.5px/1 "Martian Mono",monospace;background:var(--bg)}
.h-mycel .tag b{height:22px;padding:0 9px;border-radius:999px;background:var(--fg);color:var(--bg);display:grid;place-items:center;font-weight:600}
.h-mycel h1{margin:22px 0 20px;font:600 clamp(36px,5.2vw,76px)/1.0 "Martian Mono",ui-monospace,monospace;font-stretch:84%;letter-spacing:-.065em}
.h-mycel h1 span{font-weight:300}
.h-mycel .sub{margin:0 0 28px;max-width:46ch;font-size:clamp(15px,1.25vw,18px);line-height:1.55;color:var(--mut)}
.h-mycel .cta{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:26px}
.h-mycel .btn{display:inline-flex;align-items:center;gap:10px;height:46px;padding:0 20px;border-radius:7px;background:var(--fg);color:var(--bg);font:600 13px/1 "Martian Mono",monospace;letter-spacing:-.02em}
.h-mycel .btn span{transition:transform .2s}.h-mycel .btn:hover span{transform:translateX(3px)}
.h-mycel .ghost{display:inline-flex;align-items:center;height:46px;padding:0 18px;border-radius:7px;border:1px solid var(--line);background:var(--bg);font:500 13px/1 "Martian Mono",monospace}
.h-mycel .term{display:flex;align-items:center;gap:14px;width:min(100%,460px);height:48px;padding:0 6px 0 16px;border-radius:8px;border:1px solid var(--line);background:var(--card);font:400 13px/1 "Martian Mono",monospace}
.h-mycel .term em{font-style:normal;opacity:.45}
.h-mycel .term code{flex:1;font:inherit;white-space:nowrap;overflow:hidden}
.h-mycel .term button{height:34px;padding:0 12px;border-radius:6px;border:1px solid var(--line);background:none;font:500 11px/1 "Martian Mono",monospace;text-transform:uppercase;letter-spacing:.06em}
.h-mycel .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;font:500 10.5px/1.5 "Martian Mono",monospace;letter-spacing:.02em;color:var(--mut);text-transform:uppercase}
.h-mycel .foot b{color:var(--fg);font-weight:600}
.h-mycel .live{display:inline-flex;align-items:center;gap:8px}
.h-mycel .live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--fg);animation:mycelPulse 1.6s ease-in-out infinite}
@keyframes mycelPulse{50%{opacity:.2}}
@media (max-width:980px){.h-mycel .links{display:none}}
@media (max-width:640px){
  .h-mycel .ui{padding:14px 16px 12px}
  .h-mycel .gh{display:none}
  .h-mycel .copy{align-self:start;margin-top:8vh}
  .h-mycel h1{font-size:clamp(34px,10.4vw,46px);margin:18px 0 16px}
  .h-mycel .sub{font-size:15px;margin-bottom:22px}
  .h-mycel .cta{margin-bottom:16px}
  .h-mycel .btn,.h-mycel .ghost{height:44px;padding:0 16px}
  .h-mycel .foot .hide{display:none}
}`,
  html: `
<div class="ui">
  <header class="nav">
    <a class="logo" href="#"><i>m</i>mycel</a>
    <nav class="links" aria-label="Primary"><a href="#">Docs</a><a href="#">Pricing</a><a href="#">Changelog</a><a href="#">Status</a></nav>
    <div class="r"><a class="gh" href="#">GitHub <b>12.4k</b></a><button class="tt" type="button" data-theme-toggle aria-label="Toggle light and dark"></button></div>
  </header>
  <div class="copy">
    <a class="tag" href="#"><b>v2.0</b>Self-healing routes are live &rarr;</a>
    <h1 data-mask="text">A network<br>that routes<br><span>itself.</span></h1>
    <p class="sub" data-mask="text">Mycel grows your edge network the way slime mold finds food: every region sends out scouts, the shortest paths get reinforced, the rest quietly decay. One command, thirty-one regions.</p>
    <div class="cta"><a class="btn" href="#">Start deploying <span>&rarr;</span></a><a class="ghost" href="#">Read the paper</a></div>
    <div class="term"><em>$</em><code>npx mycel deploy ./app</code><button type="button" class="cp">Copy</button></div>
  </div>
  <footer class="foot"><span class="live stat" data-mask="text">live</span><span class="hide" data-mask="text">Click anywhere to open a region &middot; hover is daylight</span></footer>
</div>`,
  init: function (root, L, S) {
    const { TAU } = L;
    const A = S.ascii(root, { size: 13, mobile: 11 });
    const P = S.pointer(root);
    const stat = root.querySelector('.stat'), cp = root.querySelector('.cp');
    const maskEls = [...root.querySelectorAll('[data-mask], .tag, .btn, .ghost, .term, .logo, .links a, .r > *')];
    const rnd = L.rng(23);
    const SX = 2, SY = 4, SA = 0.4, RA = 0.4, SO = 8, SS = 1, DEP = 1.7, DECAY = 0.9;
    const SITES = [['SFO', 0.06, 0.34], ['YYZ', 0.19, 0.24], ['IAD', 0.22, 0.4], ['MEX', 0.11, 0.56], ['GRU', 0.31, 0.82], ['LHR', 0.45, 0.22], ['FRA', 0.52, 0.29], ['LOS', 0.47, 0.6], ['JNB', 0.56, 0.86], ['DXB', 0.63, 0.47], ['BOM', 0.7, 0.57], ['SIN', 0.8, 0.7], ['HKG', 0.85, 0.47], ['NRT', 0.94, 0.33], ['SYD', 0.93, 0.9]];
    const ramp = A.ramp('.:;+=*%#@'), DOT = A.glyph('.'), GV = A.glyph('|'), GH = A.glyph('-'), GF = A.glyph('/'), GB = A.glyph('\\'), RING = A.glyph('o'), CORE = A.glyph('@');
    let Gw = 0, Gh = 0, T = null, T2 = null, N = 0, ax, ay, ah, Cs, Ss, cnt, nodes = [], mask = null, statT = 0, extra = 0;

    const place = () => {
      const W = A.w, H = A.h, wide = W > 900;
      nodes = SITES.map(([code, x, y]) => {
        const nx = wide ? 0.47 + 0.5 * x : 0.07 + 0.86 * x, ny = wide ? 0.13 + 0.72 * y : 0.42 + 0.5 * y;
        return { code, gx: nx * Gw, gy: ny * Gh, ms: 4 + ((L.hashStr(code) % 23) | 0) };
      });
    };
    const remask = () => { if (A.n) mask = L.mask(A, maskEls, { pad: 8, feather: 36, floor: 0.05 }); };
    const setup = () => {
      Gw = A.cols * SX; Gh = A.rows * SY;
      T = new Float32Array(Gw * Gh); T2 = new Float32Array(Gw * Gh);
      Cs = new Float32Array(A.n); Ss = new Float32Array(A.n); cnt = new Float32Array(A.n);
      N = Math.min(13000, Math.round(Gw * Gh * 0.1));
      ax = new Float32Array(N); ay = new Float32Array(N); ah = new Float32Array(N);
      place();
      for (let k = 0; k < N; k++) {
        const nd = nodes[k % nodes.length], a = rnd() * TAU, r = rnd() * 5;
        ax[k] = nd.gx + Math.cos(a) * r; ay[k] = nd.gy + Math.sin(a) * r; ah[k] = a;
      }
      for (let k = 0; k < 140; k++) step();
      remask();
    };
    S.on(cp, 'click', () => { try { navigator.clipboard.writeText('npx mycel deploy ./app'); } catch (e) {} cp.textContent = 'Copied'; S.timeout(() => (cp.textContent = 'Copy'), 1400); });

    const step = () => {
      const w = Gw, h = Gh, t = T;
      for (let k = 0; k < N; k++) {
        let x = ax[k], y = ay[k], a = ah[k];
        const sF = t[((y + Math.sin(a) * SO) | 0) * w + ((x + Math.cos(a) * SO) | 0)] || 0;
        const sL = t[((y + Math.sin(a - SA) * SO) | 0) * w + ((x + Math.cos(a - SA) * SO) | 0)] || 0;
        const sR = t[((y + Math.sin(a + SA) * SO) | 0) * w + ((x + Math.cos(a + SA) * SO) | 0)] || 0;
        if (sF >= sL && sF >= sR) {} else if (sF < sL && sF < sR) a += (Math.random() < 0.5 ? -RA : RA);
        else if (sL > sR) a -= RA; else a += RA;
        x += Math.cos(a) * SS; y += Math.sin(a) * SS;
        if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3 || Math.random() < 0.0012) {
          // scouts that wander off the map, or simply age out, are re-released at a region
          const nd = nodes[(Math.random() * nodes.length) | 0];
          x = nd.gx + (Math.random() - 0.5) * 4; y = nd.gy + (Math.random() - 0.5) * 4; a = Math.random() * TAU;
        }
        ax[k] = x; ay[k] = y; ah[k] = a;
        t[(y | 0) * w + (x | 0)] += DEP;
      }
      for (const nd of nodes) {
        const cx = nd.gx | 0, cy = nd.gy | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = (cy + dy) * w + cx + dx; if (i >= 0 && i < t.length) t[i] += 14; }
      }
      // 3x3 mean with decay
      const o = T2;
      for (let y = 1; y < h - 1; y++) {
        const r0 = (y - 1) * w, r1 = y * w, r2 = (y + 1) * w;
        for (let x = 1; x < w - 1; x++) o[r1 + x] = (t[r0 + x - 1] + t[r0 + x] + t[r0 + x + 1] + t[r1 + x - 1] + t[r1 + x] + t[r1 + x + 1] + t[r2 + x - 1] + t[r2 + x] + t[r2 + x + 1]) * (DECAY / 9);
      }
      T = o; T2 = t;
    };

    A.onResize = setup;
    setup();
    S.timeout(remask, 500); S.timeout(remask, 1600);
    if (document.fonts) document.fonts.ready.then(remask);

    S.loop((time, dt) => {
      if (!T) return;
      P.decay(dt);
      for (const tp of P.taps.splice(0)) {
        if (nodes.length >= 26) nodes.splice(SITES.length, 1);
        nodes.push({ code: 'N' + String(++extra).padStart(2, '0'), gx: (tp.x / A.cellW) * SX, gy: (tp.y / A.cellH) * SY, ms: 3 + ((Math.random() * 9) | 0), fresh: time });
      }
      // daylight: the trail is bleached where the cursor shines, agents steer around it
      if (P.active && !P.ui) {
        const cx = (P.x / A.cellW) * SX, cy = (P.y / A.cellH) * SY, R = 26;
        for (let y = Math.max(1, (cy - R) | 0); y < Math.min(Gh - 1, cy + R); y++) for (let x = Math.max(1, (cx - R) | 0); x < Math.min(Gw - 1, cx + R); x++) {
          const d = Math.hypot(x - cx, y - cy); if (d < R) T[y * Gw + x] *= 0.55 + 0.45 * (d / R);
        }
      }
      step();
      const cols = A.cols, rows = A.rows, g = A.g, al = A.a;
      cnt.fill(0);
      for (let k = 0; k < N; k += 2) {
        const i = ((ay[k] / SY) | 0) * cols + ((ax[k] / SX) | 0);
        Cs[i] = Cs[i] * 0.97 + Math.cos(2 * ah[k]) * 0.03 * 4; Ss[i] = Ss[i] * 0.97 + Math.sin(2 * ah[k]) * 0.03 * 4; cnt[i]++;
      }
      A.clear();
      const kx = A.cellW / SX, ky = A.cellH / SY;
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        let s = 0;
        for (let sy = 0; sy < SY; sy++) { const o = (y * SY + sy) * Gw + x * SX; s += T[o] + T[o + 1]; }
        const edge = Math.min(x, y, cols - 1 - x, rows - 1 - y);
        const v = (1 - Math.exp(-s / (SX * SY) / 16)) * (edge < 3 ? 0.4 + 0.2 * edge : 1);
        if (v < 0.08) continue;
        let gi;
        const mag = Math.hypot(Cs[i], Ss[i]);
        if (v > 0.18 && mag > 0.3) {
          const ang = Math.atan2(Ss[i], Cs[i]) / 2, dx = Math.cos(ang) * kx, dy = Math.sin(ang) * ky;
          const adx = Math.abs(dx / A.cellW), ady = Math.abs(dy / A.cellH);
          gi = ady < adx * 0.42 ? GH : adx < ady * 0.42 ? GV : dx * dy > 0 ? GB : GF;
          if (v > 0.93) gi = ramp[6];
        } else gi = v < 0.16 ? DOT : ramp[Math.min(8, (v * 7) | 0)];
        g[i] = gi;
        al[i] = 0.1 + 0.9 * v;
      }
      for (const nd of nodes) {
        const cx = Math.floor(nd.gx / SX), cy = Math.floor(nd.gy / SY), pulse = 0.6 + 0.4 * Math.sin(time * 3 + nd.gx);
        A.put(cx, cy, CORE, 1);
        A.put(cx - 1, cy, RING, 0.5 + 0.4 * pulse); A.put(cx + 1, cy, RING, 0.5 + 0.4 * pulse);
        const lab = nd.code + ' ' + nd.ms + 'ms', lx = cx + 3 + lab.length > cols ? cx - 2 - lab.length : cx + 3;
        A.text(lx, cy, lab, nd.fresh && time - nd.fresh < 2 ? 0.5 + 0.5 * Math.sin(time * 18) : 0.82);
      }
      if (mask) for (let i = 0; i < A.n; i++) al[i] *= mask[i];
      A.render();
      if ((statT -= dt) <= 0) { statT = 0.5; stat.textContent = `live · ${nodes.length} regions · ${L.fmt(N)} scouts`; }
    });
  },
});
