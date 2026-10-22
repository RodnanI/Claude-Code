/* ASCII Heroes, Vol. 2 : shared glyph runtime.
   Every hero is called as init(root, L, S). L is this library, S is a scope that
   tears down everything the hero registered when it unmounts. This function is
   inlined verbatim into each exported single-hero file, so it must stay self-contained. */
function createLib() {
  if (window.__asciiHeroes) return window.__asciiHeroes;
  const L = (window.__asciiHeroes = {});
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  Object.assign(L, { TAU, clamp, lerp, smooth });
  L.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  L.coarse = matchMedia('(pointer: coarse)').matches;
  L.angle = (a, b, t) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
  L.fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* ---------- randomness ---------- */
  L.rng = (seed = 1) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  L.hash = (x, y = 0, z = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1013904223)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  L.hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  /* ---------- simplex noise (Gustavson) ---------- */
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  { const r = L.rng(1337), p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; } }
  const G = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  L.noise2 = (x, y) => {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2;
    const x0 = x - i + t, y0 = y - j + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, q, g;
    q = 0.5 - x0 * x0 - y0 * y0; if (q > 0) { g = pm12[ii + perm[jj]] * 3; q *= q; n += q * q * (G[g] * x0 + G[g + 1] * y0); }
    q = 0.5 - x1 * x1 - y1 * y1; if (q > 0) { g = pm12[ii + i1 + perm[jj + j1]] * 3; q *= q; n += q * q * (G[g] * x1 + G[g + 1] * y1); }
    q = 0.5 - x2 * x2 - y2 * y2; if (q > 0) { g = pm12[ii + 1 + perm[jj + 1]] * 3; q *= q; n += q * q * (G[g] * x2 + G[g + 1] * y2); }
    return 70 * n;
  };
  L.noise3 = (x, y, z) => {
    const s = (x + y + z) / 3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s), t = (i + j + k) / 6;
    const x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const x1 = x0 - i1 + 1 / 6, y1 = y0 - j1 + 1 / 6, z1 = z0 - k1 + 1 / 6;
    const x2 = x0 - i2 + 1 / 3, y2 = y0 - j2 + 1 / 3, z2 = z0 - k2 + 1 / 3;
    const x3 = x0 - 0.5, y3 = y0 - 0.5, z3 = z0 - 0.5;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, q, g;
    q = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (q > 0) { g = pm12[ii + perm[jj + perm[kk]]] * 3; q *= q; n += q * q * (G[g] * x0 + G[g + 1] * y0 + G[g + 2] * z0); }
    q = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (q > 0) { g = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; q *= q; n += q * q * (G[g] * x1 + G[g + 1] * y1 + G[g + 2] * z1); }
    q = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (q > 0) { g = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; q *= q; n += q * q * (G[g] * x2 + G[g + 1] * y2 + G[g + 2] * z2); }
    q = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (q > 0) { g = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; q *= q; n += q * q * (G[g] * x3 + G[g + 1] * y3 + G[g + 2] * z3); }
    return 32 * n;
  };
  L.fbm2 = (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * L.noise2(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
  L.fbm3 = (x, y, z, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * L.noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; };

  /* ---------- base styles shared by every hero ---------- */
  if (!document.getElementById('ascii-base')) {
    const st = document.createElement('style');
    st.id = 'ascii-base';
    st.textContent = `.hero{position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--fg);isolation:isolate;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;transition:background-color .5s ease,color .5s ease}
.hero *,.hero *::before,.hero *::after{box-sizing:border-box}
.hero canvas.ascii{position:absolute;left:0;top:0;z-index:0;pointer-events:none}
.hero :where(button,input,select,textarea){font:inherit;color:inherit;letter-spacing:inherit}
.hero :where(input,textarea){user-select:text;-webkit-user-select:text}
.hero :where(a){color:inherit;text-decoration:none}
.hero :where(button){cursor:pointer;-webkit-appearance:none;appearance:none}
.hero :focus-visible{outline:1.5px solid currentColor;outline-offset:3px}
.hero .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
html.vt-theme::view-transition-old(root),html.vt-theme::view-transition-new(root){animation:none;mix-blend-mode:normal}
html.vt-theme *{transition:none!important}`;
    document.head.prepend(st);
  }

  /* ---------- theme ---------- */
  const KEY = 'ascii-heroes-theme', doc = document.documentElement;
  if (doc.dataset.theme !== 'light' && doc.dataset.theme !== 'dark') {
    let t = null; try { t = localStorage.getItem(KEY); } catch (e) {}
    doc.dataset.theme = t === 'light' || t === 'dark' ? t : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  L.theme = () => (doc.dataset.theme === 'light' ? 'light' : 'dark');
  L.setTheme = (t, from) => {
    if (t === L.theme()) return;
    const apply = () => { doc.dataset.theme = t; try { localStorage.setItem(KEY, t); } catch (e) {} window.dispatchEvent(new CustomEvent('ascii:theme', { detail: t })); };
    if (!document.startViewTransition || L.reduced) return apply();
    let x = innerWidth / 2, y = innerHeight / 2;
    if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.classList.add('vt-theme');
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => doc.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] }, { duration: 680, easing: 'cubic-bezier(.66,0,.24,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
    vt.finished.finally(() => doc.classList.remove('vt-theme'));
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (b) { e.preventDefault(); L.setTheme(L.theme() === 'dark' ? 'light' : 'dark', b); }
  });
  L.loadFonts = (spec) => {
    if (!spec) return;
    const href = 'https://fonts.googleapis.com/css2?' + spec + '&display=swap';
    for (const l of document.querySelectorAll('link[rel=stylesheet]')) if (l.href === href) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  };

  /* ---------- frame loop ---------- */
  L.loop = (fn) => {
    let raf = 0, last = 0, t = 0, alive = true;
    const k = L.reduced ? 0.35 : 1;
    const step = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(step);
      if (L.paused) { last = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now; t += dt * k;
      fn(t, dt * k);
    };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  };

  /* ---------- pointer (mouse, pen and touch) ---------- */
  const UI = 'a,button,input,textarea,select,label,summary,[data-ui]';
  L.pointer = (el) => {
    const p = { x: -9999, y: -9999, vx: 0, vy: 0, down: false, active: false, seen: false, last: -1e9, kind: 'mouse', taps: [], ui: false };
    let lt = 0;
    const at = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const move = (e) => {
      const [x, y] = at(e), now = performance.now();
      if (p.active && now - lt < 150) { const dt = Math.max(8, now - lt) / 1000; p.vx = lerp(p.vx, (x - p.x) / dt, 0.45); p.vy = lerp(p.vy, (y - p.y) / dt, 0.45); }
      else { p.vx = 0; p.vy = 0; }
      p.x = x; p.y = y; lt = p.last = now; p.active = p.seen = true; p.kind = e.pointerType || 'mouse';
      p.ui = !!(e.target && e.target.closest && e.target.closest(UI));
    };
    const down = (e) => { move(e); if (p.ui) return; p.down = true; p.taps.push({ x: p.x, y: p.y, t: p.last }); };
    const up = () => { p.down = false; };
    const leave = (e) => { if (e.pointerType === 'mouse') p.active = false; p.down = false; };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerleave', leave);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    p.idle = (ms = 2600) => !p.active || performance.now() - p.last > ms;
    p.decay = (dt) => { const k = Math.exp(-dt * 7); p.vx *= k; p.vy *= k; };
    p.detach = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); el.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    };
    return p;
  };

  /* ---------- glyph grid renderer ---------- */
  const CHARSET = (() => { let s = ' '; for (let c = 33; c < 127; c++) s += String.fromCharCode(c); return s + '·•°˚∙◦○●×≈≡¦¯´¨«»─│┌┐└┘├┤┬┴┼╱╲╳░▒▓█▀▄■□▪▲△▼▽◆◇'; })();
  const GLYPH = new Map();
  for (let i = 0; i < CHARSET.length; i++) GLYPH.set(CHARSET[i], i);
  const glyph = (c) => { const g = GLYPH.get(c); return g === undefined ? 31 : g; };
  L.CHARSET = CHARSET;
  L.glyph = glyph;
  L.ramp = (s) => Uint8Array.from(s, glyph);

  class Ascii {
    constructor(host, o = {}) {
      this.host = host;
      this.o = Object.assign({ size: 13, mobile: 11, lh: 1.25, font: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace', weight: 400, inks: ['--ink'] }, o);
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'ascii';
      this.canvas.setAttribute('aria-hidden', 'true');
      host.prepend(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.cols = this.rows = this.n = 0;
      this.atlas = [];
      this.onResize = null;
      this.under = null;
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      this._th = () => { this.paint(); this.render(); };
      window.addEventListener('ascii:theme', this._th);
      this.resize(true);
      this._poll(0);
    }
    _poll(n) {
      if (this.dead || !document.fonts || !document.fonts.load) return;
      document.fonts.load(`${this.o.weight} 16px ${this.o.font}`).then((f) => {
        if (this.dead) return;
        if (f && f.length) this.resize(true);
        else if (n < 30) this._ft = setTimeout(() => this._poll(n + 1), 250);
      }).catch(() => {});
    }
    px() { const w = this.host.clientWidth, s = this.o.size; return typeof s === 'function' ? s(w, this.host.clientHeight) : w < 640 ? this.o.mobile : s; }
    resize(force) {
      const w = this.host.clientWidth, h = this.host.clientHeight;
      if (!w || !h || this.dead) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2), fs = this.px();
      if (!force && w === this.w && h === this.h && dpr === this.dpr && fs === this.fs) return;
      Object.assign(this, { w, h, dpr, fs });
      const ctx = this.ctx;
      ctx.font = `${this.o.weight} ${fs * dpr}px ${this.o.font}`;
      const cw = Math.max(2, Math.round(ctx.measureText('M').width)), ch = Math.max(2, Math.round(fs * this.o.lh * dpr));
      this.cw = cw; this.ch = ch; this.cellW = cw / dpr; this.cellH = ch / dpr;
      const cols = Math.ceil((w * dpr) / cw), rows = Math.ceil((h * dpr) / ch);
      this.canvas.width = cols * cw; this.canvas.height = rows * ch;
      this.canvas.style.width = (cols * cw) / dpr + 'px'; this.canvas.style.height = (rows * ch) / dpr + 'px';
      if (cols !== this.cols || rows !== this.rows) {
        this.cols = cols; this.rows = rows; this.n = cols * rows;
        this.g = new Uint8Array(this.n); this.a = new Float32Array(this.n); this.k = new Uint8Array(this.n);
      }
      this.paint();
      if (this.onResize) this.onResize(this);
    }
    color(i) { const v = this.o.inks[i]; return v.startsWith('--') ? getComputedStyle(this.host).getPropertyValue(v).trim() || '#888' : v; }
    paint() {
      const { cw, ch, dpr, fs } = this;
      if (!cw) return;
      this._ac = this._ac || [];
      this.atlas = this.o.inks.map((_, j) => {
        const c = this._ac[j] || (this._ac[j] = document.createElement('canvas'));
        c.width = CHARSET.length * cw; c.height = ch;
        const x = c.getContext('2d');
        x.clearRect(0, 0, c.width, c.height);
        x.font = `${this.o.weight} ${fs * dpr}px ${this.o.font}`;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = this.color(j);
        for (let i = 1; i < CHARSET.length; i++) x.fillText(CHARSET[i], i * cw + cw / 2, ch / 2 + dpr * 0.5);
        return c;
      });
    }
    glyph(c) { return glyph(c); }
    ramp(s) { return L.ramp(s); }
    clear() { this.a.fill(0); }
    put(x, y, g, al = 1, ink = 0) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const i = y * this.cols + x; this.g[i] = g; this.a[i] = al; this.k[i] = ink;
    }
    text(x, y, s, al = 1, ink = 0) { for (let j = 0; j < s.length; j++) if (s[j] !== ' ') this.put(x + j, y, glyph(s[j]), al, ink); }
    render() {
      const { ctx, cols, rows, cw, ch, g, a, k, atlas } = this;
      if (!cols || this.dead) return;
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.under) this.under(ctx, this);
      let la = -1;
      for (let y = 0, i = 0; y < rows; y++) {
        const py = y * ch;
        for (let x = 0; x < cols; x++, i++) {
          let al = a[i];
          if (al < 0.035 || g[i] === 0) continue;
          al = al >= 1 ? 1 : Math.round(al * 40) / 40;
          if (al !== la) { ctx.globalAlpha = al; la = al; }
          ctx.drawImage(atlas[k[i]], g[i] * cw, 0, cw, ch, x * cw, py, cw, ch);
        }
      }
      ctx.globalAlpha = 1;
    }
    destroy() { this.dead = true; clearTimeout(this._ft); this._ro.disconnect(); window.removeEventListener('ascii:theme', this._th); this.canvas.remove(); }
  }
  L.Ascii = Ascii;

  /* ---------- raster: draw with the canvas API in CSS px, read back per cell ---------- */
  class Raster {
    constructor(A, ss = 2) { this.A = A; this.ss = ss; this.c = document.createElement('canvas'); this.ctx = this.c.getContext('2d', { willReadFrequently: true }); this.n = 0; }
    begin(fill = '#000') {
      const { A, ss, c, ctx } = this, W = A.cols * ss, H = A.rows * ss;
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      if (this.n !== A.n) { this.n = A.n; this.r = new Float32Array(A.n); this.g = new Float32Array(A.n); this.b = new Float32Array(A.n); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(ss / A.cellW, 0, 0, ss / A.cellH, 0, 0);
      return ctx;
    }
    sample() {
      const { A, ss } = this, W = A.cols * ss, cols = A.cols, rows = A.rows;
      const d = this.ctx.getImageData(0, 0, W, rows * ss).data, inv = 1 / (255 * ss * ss), R = this.r, Gc = this.g, B = this.b;
      for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < ss; sy++) { let o = ((y * ss + sy) * W + x * ss) * 4; for (let sx = 0; sx < ss; sx++, o += 4) { r += d[o]; g += d[o + 1]; b += d[o + 2]; } }
        R[i] = r * inv; Gc[i] = g * inv; B[i] = b * inv;
      }
    }
  }
  L.Raster = Raster;

  /* Sobel edge glyph for cell i of field v, or -1 when the edge is too weak.
     Gradients are measured in screen pixels so tall cells do not skew the angle. */
  const EG = { v: glyph('|'), f: glyph('/'), h: glyph('-'), b: glyph('\\'), u: glyph('_') };
  L.edge = (A, v, x, y, et) => {
    const c = A.cols;
    if (x < 1 || y < 1 || x >= c - 1 || y >= A.rows - 1) return -1;
    const i = y * c + x;
    const a = v[i - c - 1], b = v[i - c], d = v[i - c + 1], l = v[i - 1], r = v[i + 1], e = v[i + c - 1], f = v[i + c], h = v[i + c + 1];
    const gx = d + 2 * r + h - a - 2 * l - e, gy = (e + 2 * f + h - a - 2 * b - d) * (A.cellW / A.cellH);
    const ax = gx < 0 ? -gx : gx, ay = gy < 0 ? -gy : gy;
    if (ax + ay < et) return -1;
    if (ay < ax * 0.41) return EG.v;
    if (ax < ay * 0.41) return gy < 0 ? EG.u : EG.h;
    return gx * gy > 0 ? EG.f : EG.b;
  };

  /* Soft knock-out behind UI so copy stays readable over busy glyphs.
     Elements marked data-mask="text" are measured per line box. */
  L.mask = (A, els, o = {}) => {
    const pad = o.pad ?? 8, fe = o.feather ?? 26, floor = o.floor ?? 0.08;
    const m = new Float32Array(A.n).fill(1), hr = A.host.getBoundingClientRect(), rects = [];
    for (const el of els) {
      if (!el || !el.isConnected) continue;
      if (el.dataset && el.dataset.mask === 'text') { const r = document.createRange(); r.selectNodeContents(el); rects.push(...r.getClientRects()); }
      else rects.push(el.getBoundingClientRect());
    }
    const cw = A.cellW, ch = A.cellH;
    for (const r of rects) {
      if (!r.width || !r.height) continue;
      const x0 = r.left - hr.left - pad, x1 = r.right - hr.left + pad, y0 = r.top - hr.top - pad, y1 = r.bottom - hr.top + pad;
      const cx0 = Math.max(0, Math.floor((x0 - fe) / cw)), cx1 = Math.min(A.cols - 1, Math.ceil((x1 + fe) / cw));
      const cy0 = Math.max(0, Math.floor((y0 - fe) / ch)), cy1 = Math.min(A.rows - 1, Math.ceil((y1 + fe) / ch));
      for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) {
        const px = (x + 0.5) * cw, py = (y + 0.5) * ch;
        const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1);
        const f = floor + (1 - floor) * smooth(0, fe, Math.hypot(dx, dy)), i = y * A.cols + x;
        if (f < m[i]) m[i] = f;
      }
    }
    return m;
  };

  /* Types example prompts into an input placeholder while it is empty and unfocused. */
  L.typePlaceholder = (input, phrases, S, still) => {
    let p = 0, c = 0, dir = 1, hold = 0;
    S.interval(() => {
      if (document.activeElement === input || input.value) { input.placeholder = still || phrases[p]; return; }
      if (hold > 0) { hold--; return; }
      c += dir;
      if (c >= phrases[p].length) { dir = -1; hold = 42; }
      else if (c <= 0) { dir = 1; p = (p + 1) % phrases.length; hold = 6; }
      input.placeholder = phrases[p].slice(0, c) + (dir > 0 ? '_' : '');
    }, 46);
  };

  /* ---------- scope: everything a hero registers, torn down together ---------- */
  L.scope = () => {
    const fns = [];
    return {
      add: (f) => (fns.push(f), f),
      on(t, ev, f, opt) { t.addEventListener(ev, f, opt); fns.push(() => t.removeEventListener(ev, f, opt)); return f; },
      loop(f) { const stop = L.loop(f); fns.push(stop); return stop; },
      ascii(host, o) { const a = new Ascii(host, o); fns.push(() => a.destroy()); return a; },
      pointer(el) { const p = L.pointer(el); fns.push(p.detach); return p; },
      timeout(f, ms) { const id = setTimeout(f, ms); fns.push(() => clearTimeout(id)); return id; },
      interval(f, ms) { const id = setInterval(f, ms); fns.push(() => clearInterval(id)); return id; },
      observe(el, f) { const ro = new ResizeObserver(f); ro.observe(el); fns.push(() => ro.disconnect()); return ro; },
      destroy() { while (fns.length) { try { fns.pop()(); } catch (e) {} } },
    };
  };
  return L;
}
