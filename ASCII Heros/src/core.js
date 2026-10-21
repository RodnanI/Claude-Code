/* ASCII Heroes core. Inlined into every hero at build time.
   Theme state, a batched glyph-grid renderer, pointer tracking, a frame loop, noise. */
(() => {
  'use strict';
  const A = (window.ASCII = {});
  const root = document.documentElement;
  const mq = (q) => matchMedia(q);

  A.MONO = 'ui-monospace,"SFMono-Regular","SF Mono",Menlo,Consolas,"JetBrains Mono","DejaVu Sans Mono","Liberation Mono",monospace';
  A.reduced = mq('(prefers-reduced-motion: reduce)').matches;
  A.coarse = mq('(pointer: coarse)').matches;

  // reset, prepended so every hero stylesheet wins the cascade
  const reset = document.createElement('style');
  reset.textContent =
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}' +
    'html,body{height:100%}body{overflow:hidden;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}' +
    'button,input,textarea,select{font:inherit;color:inherit;background:none;border:0;border-radius:0;outline:0}button{cursor:pointer}' +
    'a{color:inherit;text-decoration:none}:focus-visible{outline:1px dashed currentColor;outline-offset:4px}' +
    'canvas.ascii{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;display:block;touch-action:none}' +
    '.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';
  document.head.prepend(reset);

  /* ---------- theme ---------- */
  const KEY = 'ascii-heroes:theme';
  let theme = null;
  try { theme = localStorage.getItem(KEY); } catch (e) {}
  if (theme !== 'dark' && theme !== 'light') theme = mq('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.theme = theme;
  const subs = [];
  const sync = () => document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(theme === 'dark')));
  A.theme = {
    get: () => theme,
    on: (fn) => subs.push(fn),
    set(t, quiet) {
      if ((t !== 'dark' && t !== 'light') || t === theme) return;
      theme = t;
      root.dataset.theme = t;
      try { localStorage.setItem(KEY, t); } catch (e) {}
      sync();
      subs.forEach((f) => f(t));
      if (!quiet && window.parent !== window) window.parent.postMessage({ asciiTheme: t }, '*');
    },
    toggle: () => A.theme.set(theme === 'dark' ? 'light' : 'dark'),
  };
  addEventListener('message', (e) => { if (e.data && e.data.asciiTheme) A.theme.set(e.data.asciiTheme, true); });
  // inside the showcase, hand navigation keys up to the shell
  if (window.parent !== window) addEventListener('keydown', (e) => {
    if (/^(ArrowLeft|ArrowRight|Escape)$/.test(e.key) && !(e.target.closest && e.target.closest('input,textarea'))) window.parent.postMessage({ asciiKey: e.key }, '*');
  });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-theme-toggle]')) A.theme.toggle(); });
  document.addEventListener('DOMContentLoaded', sync);

  /* ---------- small helpers ---------- */
  A.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.smooth = (e0, e1, x) => { const t = A.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  A.ramp = (s) => Array.from(s, (c) => c.charCodeAt(0));
  A.css = (name, el) => getComputedStyle(el || root).getPropertyValue(name).trim();
  A.rgb = (s) => {
    s = (s || '').trim();
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
  };
  A.rng = (a) => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // line glyph for a direction given in cell units (dx right, dy down)
  const LINES = A.ramp('-\\|/');
  A.lineChar = (dx, dy) => {
    let a = Math.atan2(dy, dx);
    if (a < 0) a += Math.PI;
    return LINES[Math.round(a / (Math.PI / 4)) & 3];
  };
  // white-on-transparent offscreen drawing, returned as an alpha mask
  A.mask = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = x.strokeStyle = '#fff';
    draw(x, w, h);
    const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
    return m;
  };

  /* ---------- simplex noise (Gustavson), seedable ---------- */
  const perm = new Uint8Array(512);
  const G = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  A.seed = (s) => {
    const r = A.rng(s), p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  };
  A.seed(1337);
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  A.noise2 = (x, y) => {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2;
    const x0 = x - i + t, y0 = y - j + t, i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, q, g;
    q = 0.5 - x0 * x0 - y0 * y0; if (q > 0) { g = (perm[ii + perm[jj]] % 12) * 3; q *= q; n += q * q * (G[g] * x0 + G[g + 1] * y0); }
    q = 0.5 - x1 * x1 - y1 * y1; if (q > 0) { g = (perm[ii + i1 + perm[jj + j1]] % 12) * 3; q *= q; n += q * q * (G[g] * x1 + G[g + 1] * y1); }
    q = 0.5 - x2 * x2 - y2 * y2; if (q > 0) { g = (perm[ii + 1 + perm[jj + 1]] % 12) * 3; q *= q; n += q * q * (G[g] * x2 + G[g + 1] * y2); }
    return 70 * n;
  };
  A.noise3 = (x, y, z) => {
    const s = (x + y + z) / 3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) / 6, x0 = x - i + t, y0 = y - j + t, z0 = z - k + t;
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
    q = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (q > 0) { g = (perm[ii + perm[jj + perm[kk]]] % 12) * 3; q *= q; n += q * q * (G[g] * x0 + G[g + 1] * y0 + G[g + 2] * z0); }
    q = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (q > 0) { g = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12) * 3; q *= q; n += q * q * (G[g] * x1 + G[g + 1] * y1 + G[g + 2] * z1); }
    q = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (q > 0) { g = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12) * 3; q *= q; n += q * q * (G[g] * x2 + G[g + 1] * y2 + G[g + 2] * z2); }
    q = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (q > 0) { g = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12) * 3; q *= q; n += q * q * (G[g] * x3 + G[g + 1] * y3 + G[g + 2] * z3); }
    return 32 * n;
  };
  A.fbm2 = (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += a * A.noise2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };

  /* ---------- pointer ---------- */
  const P = (A.pointer = { x: -1e5, y: -1e5, vx: 0, vy: 0, down: false, active: false, moved: 0, type: 'mouse' });
  let lastT = 0;
  const move = (e) => {
    const now = performance.now(), dt = Math.max(8, now - lastT);
    if (P.active && now - lastT < 120) {
      P.vx = P.vx * 0.5 + ((e.clientX - P.x) / dt) * 500;
      P.vy = P.vy * 0.5 + ((e.clientY - P.y) / dt) * 500;
    } else { P.vx = P.vy = 0; }
    lastT = now;
    P.x = e.clientX; P.y = e.clientY; P.active = true; P.moved = now; P.type = e.pointerType || 'mouse';
  };
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', (e) => { move(e); P.down = true; }, { passive: true });
  addEventListener('pointerup', (e) => { P.down = false; if (e.pointerType && e.pointerType !== 'mouse') P.active = false; }, { passive: true });
  addEventListener('pointercancel', () => { P.down = false; P.active = false; });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) P.active = false; });
  addEventListener('blur', () => { P.down = false; });

  /* ---------- frame loop ---------- */
  A.loop = (fn) => {
    let last = performance.now(), t = 0, id = 0;
    const step = (now) => {
      id = requestAnimationFrame(step);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      else if (dt < 0) dt = 0; // the first rAF stamp can predate the loop's creation
      if (A.reduced) dt *= 0.3;
      t += dt;
      if (now - P.moved > 60) { P.vx *= 0.86; P.vy *= 0.86; }
      fn(dt, t, now);
    };
    id = requestAnimationFrame(step);
    return { stop: () => cancelAnimationFrame(id) };
  };

  /* ---------- glyph grid ----------
     Each frame a hero writes char codes (chr), a level 1..L (lvl, 0 = empty) and an ink index (ink).
     draw() batches cells by ink+level into row strings: one fillStyle per bucket, one fillText per run. */
  A.grid = (canvas, o = {}) => {
    const ctx = canvas.getContext('2d');
    const L = o.levels || 10, inks = o.inks || ['--fg'], alpha = o.alpha || ((t) => t), lh = o.lh || 1.15;
    const g = { canvas, ctx, L, cols: 0, rows: 0, n: 0, cw: 8, ch: 14, w: 0, h: 0, dpr: 1, fs: 12, font: '' };
    const B = inks.length * (L + 1);
    let styles = [], rb, mn, mx, list = new Int32Array(B), ops = [], singles = [];
    for (let b = 0; b < B; b++) { ops.push([]); singles.push([]); }

    g.recolor = () => {
      styles = [];
      inks.forEach((v) => {
        const [r, gg, b] = A.rgb(A.css(v));
        for (let l = 0; l <= L; l++) styles.push(`rgba(${r},${gg},${b},${A.clamp(alpha(l / L), 0, 1).toFixed(3)})`);
      });
    };

    g.resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      const dpr = Math.min(o.maxDpr || 2, window.devicePixelRatio || 1);
      const fs = typeof o.size === 'function' ? o.size(w, h) : o.size || (w < 640 ? 10 : w < 1280 ? 12 : 13);
      if (w === g.w && h === g.h && dpr === g.dpr && fs === g.fs) return false;
      Object.assign(g, { w, h, dpr, fs });
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.font = `${o.weight || 400} ${fs}px ${o.family || A.MONO}`;
      ctx.font = g.font;
      g.cw = ctx.measureText('MMMMMMMMMMMMMMMMMMMM').width / 20;
      g.ch = Math.round(fs * lh * 100) / 100;
      g.cols = Math.ceil(w / g.cw);
      g.rows = Math.ceil(h / g.ch);
      g.n = g.cols * g.rows;
      g.chr = new Uint16Array(g.n).fill(32);
      g.lvl = new Uint8Array(g.n);
      g.ink = new Uint8Array(g.n);
      rb = new Uint16Array(B * g.cols).fill(32);
      mn = new Int32Array(B).fill(-1);
      mx = new Int32Array(B);
      g.recolor();
      return true;
    };

    g.clear = () => { g.chr.fill(32); g.lvl.fill(0); g.ink.fill(0); };
    g.idx = (x, y) => { const c = (x / g.cw) | 0, r = (y / g.ch) | 0; return c < 0 || r < 0 || c >= g.cols || r >= g.rows ? -1 : r * g.cols + c; };
    g.put = (c, r, code, l, k = 0) => {
      if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return;
      const i = r * g.cols + c;
      g.chr[i] = code; g.lvl[i] = l; g.ink[i] = k;
    };
    // write only when brighter than what is there
    g.max = (c, r, code, l, k = 0) => {
      if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return;
      const i = r * g.cols + c;
      if (l > g.lvl[i]) { g.chr[i] = code; g.lvl[i] = l; g.ink[i] = k; }
    };
    g.text = (c, r, s, l, k = 0) => { for (let j = 0; j < s.length; j++) g.put(c + j, r, s.charCodeAt(j), l, k); };
    g.rect = (el) => {
      const b = el.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      return { x0: b.left - cr.left, y0: b.top - cr.top, x1: b.right - cr.left, y1: b.bottom - cr.top };
    };

    g.draw = () => {
      const { cols, rows, cw, ch, chr, lvl, ink } = g;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, g.w, g.h);
      ctx.font = g.font;
      ctx.textBaseline = 'middle';
      for (let b = 0; b < B; b++) { ops[b].length = 0; singles[b].length = 0; }
      for (let r = 0, i = 0; r < rows; r++) {
        let used = 0;
        for (let c = 0; c < cols; c++, i++) {
          const l = lvl[i];
          if (!l) continue;
          const code = chr[i];
          if (code === 32) continue;
          const b = ink[i] * (L + 1) + l;
          if (code > 126) { singles[b].push(r, c, code); continue; } // outside ASCII: own cell, no run drift
          if (mn[b] < 0) { mn[b] = c; list[used++] = b; }
          mx[b] = c;
          rb[b * cols + c] = code;
        }
        for (let k = 0; k < used; k++) {
          const b = list[k], base = b * cols, s = mn[b], e = mx[b] + 1;
          ops[b].push(r, s, String.fromCharCode.apply(null, rb.subarray(base + s, base + e)));
          rb.fill(32, base + s, base + e);
          mn[b] = -1;
        }
      }
      const hc = ch * 0.5;
      for (let b = 0; b < B; b++) {
        const op = ops[b], sg = singles[b];
        if (!op.length && !sg.length) continue;
        ctx.fillStyle = styles[b];
        ctx.textAlign = 'left';
        for (let k = 0; k < op.length; k += 3) ctx.fillText(op[k + 2], op[k + 1] * cw, op[k] * ch + hc);
        if (sg.length) {
          ctx.textAlign = 'center';
          for (let k = 0; k < sg.length; k += 3) ctx.fillText(String.fromCharCode(sg[k + 2]), (sg[k + 1] + 0.5) * cw, sg[k] * ch + hc);
        }
      }
    };

    A.theme.on(() => g.recolor());
    g.resize();
    let pend = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(pend);
      pend = requestAnimationFrame(() => { if (g.resize() && o.onResize) o.onResize(g); });
    }).observe(canvas);
    return g;
  };
})();
