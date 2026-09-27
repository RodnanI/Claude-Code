'use strict';
/* =========================================================
   Core: DOM helpers, theme, canvas plotting, UI controls,
   lazy demo loading, navigation, progress, quizzes, code.
   ========================================================= */
const ML = window.ML = { demos: {} };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const TAU = Math.PI * 2;

function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function fmt(v, d = 2) {
  if (!isFinite(v)) return v > 0 ? 'inf' : v < 0 ? '-inf' : 'n/a';
  if (Math.abs(v) >= 1e5) return v.toExponential(1);
  return v.toFixed(d);
}
function store(k, v) {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k));
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) { return null; }
  return v;
}
ML.demo = (name, fn) => { ML.demos[name] = fn; };

/* ---------------- Theme ---------------- */
const Theme = {
  keys: ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'muted', 'line', 'line-2', 'grid', 'accent',
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'good', 'bad'],
  c: {}, subs: [],
  read() {
    const cs = getComputedStyle(document.documentElement);
    for (const k of this.keys) this.c[k] = cs.getPropertyValue('--' + k).trim();
  },
  on(f) { this.subs.push(f); },
  emit() { this.read(); for (const f of this.subs) { try { f(); } catch (e) { console.error(e); } } }
};
Theme.read();
const _rgbCache = {};
function rgbOf(hex) {
  if (_rgbCache[hex]) return _rgbCache[hex];
  let s = hex.replace('#', '');
  if (s.length === 3) s = s.split('').map(ch => ch + ch).join('');
  const n = parseInt(s, 16);
  return (_rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
const col = k => Theme.c[k] || k;
const rgb = k => rgbOf(col(k));
function rgba(k, a) { const c = rgb(k); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
ML.classKeys = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
/* Probability p of class 1 -> shaded pixel (class 0 = c1, class 1 = c2). */
function probPx(p, maxA = 0.34) {
  const c = p >= 0.5 ? rgb('c2') : rgb('c1');
  const a = Math.pow(Math.abs(2 * p - 1), 0.75) * maxA * 255;
  return [c[0], c[1], c[2], a];
}

/* ---------------- Plot (canvas with data coordinates) ---------------- */
class Plot {
  constructor(parent, o = {}) {
    this.o = o;
    this.wrap = h('div', { class: 'fig-stage' + (o.scroll ? ' scroll-ok' : '') });
    this.cv = h('canvas');
    this.wrap.append(this.cv);
    parent.append(this.wrap);
    this.ctx = this.cv.getContext('2d');
    this.pad = Object.assign({ l: 10, r: 10, t: 10, b: 10 }, o.pad);
    this.x0 = (o.x || [0, 1]).slice(); this.y0 = (o.y || [0, 1]).slice();
    this.draw = null;
    this.resize();
    new ResizeObserver(() => { if (this.resize() && this.draw) this.draw(); }).observe(this.wrap);
    Theme.on(() => this.draw && this.draw());
  }
  resize() {
    const w = Math.floor(this.wrap.clientWidth);
    if (!w) return false;
    const o = this.o;
    let H = typeof o.height === 'function' ? o.height(w) : (o.height || Math.round(w * (o.aspect || 0.62)));
    if (o.maxH) H = Math.min(H, o.maxH);
    if (o.minH) H = Math.max(H, o.minH);
    H = Math.round(H);
    const d = Math.min(window.devicePixelRatio || 1, 2.5);
    if (w === this.W && H === this.H && d === this.dpr) return false;
    this.W = w; this.H = H; this.dpr = d;
    this.cv.width = Math.round(w * d); this.cv.height = Math.round(H * d);
    this.cv.style.height = H + 'px';
    this.setDomain(this.x0, this.y0);
    return true;
  }
  setDomain(x, y) {
    this.x0 = x.slice(); this.y0 = y.slice();
    const p = this.pad;
    this.L = p.l; this.T = p.t; this.PW = Math.max(10, this.W - p.l - p.r); this.PH = Math.max(10, this.H - p.t - p.b);
    this.x = x.slice(); this.y = y.slice();
    if (this.o.equal) {
      const ux = (x[1] - x[0]) / this.PW, uy = (y[1] - y[0]) / this.PH;
      if (ux > uy) { const c = (y[0] + y[1]) / 2, hh = ux * this.PH / 2; this.y = [c - hh, c + hh]; }
      else { const c = (x[0] + x[1]) / 2, hw = uy * this.PW / 2; this.x = [c - hw, c + hw]; }
    }
  }
  sx(v) { return this.L + (v - this.x[0]) / (this.x[1] - this.x[0]) * this.PW; }
  sy(v) { return this.T + (this.y[1] - v) / (this.y[1] - this.y[0]) * this.PH; }
  ix(p) { return this.x[0] + (p - this.L) / this.PW * (this.x[1] - this.x[0]); }
  iy(p) { return this.y[1] - (p - this.T) / this.PH * (this.y[1] - this.y[0]); }
  begin() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    c.lineCap = 'round'; c.lineJoin = 'round';
    return c;
  }
  _steps(a, b, d, f) { for (let i = Math.ceil(a / d - 1e-9); i * d <= b + 1e-9; i++) f(+(i * d).toFixed(10)); }
  grid(dx, dy) {
    const c = this.ctx; c.save(); c.strokeStyle = col('grid'); c.lineWidth = 1; c.beginPath();
    if (dx) this._steps(this.x[0], this.x[1], dx, v => { const p = Math.round(this.sx(v)) + .5; c.moveTo(p, this.T); c.lineTo(p, this.T + this.PH); });
    if (dy) this._steps(this.y[0], this.y[1], dy, v => { const p = Math.round(this.sy(v)) + .5; c.moveTo(this.L, p); c.lineTo(this.L + this.PW, p); });
    c.stroke(); c.restore();
  }
  axes(o = {}) {
    const c = this.ctx; c.save();
    c.strokeStyle = col('muted'); c.fillStyle = col('muted'); c.lineWidth = 1; c.font = '10px ' + MONO;
    const inY = o.zero && this.y[0] < 0 && this.y[1] > 0, inX = o.zero && this.x[0] < 0 && this.x[1] > 0;
    const ax = Math.round(inY ? this.sy(0) : this.T + this.PH) + .5;
    const ay = Math.round(inX ? this.sx(0) : this.L) + .5;
    c.beginPath(); c.moveTo(this.L, ax); c.lineTo(this.L + this.PW, ax);
    c.moveTo(ay, this.T); c.lineTo(ay, this.T + this.PH); c.stroke();
    const fx = o.fx || (v => String(+v.toFixed(4))), fy = o.fy || fx;
    if (o.dx) { c.textAlign = 'center'; c.textBaseline = 'top'; this._steps(this.x[0], this.x[1], o.dx, v => { if (inX && Math.abs(v) < 1e-9) return; const px = this.sx(v); if (px < this.L + 8 && !inX && v !== this.x[0]) return; c.fillText(fx(v), px, ax + 4); }); }
    if (o.dy) { c.textAlign = 'right'; c.textBaseline = 'middle'; this._steps(this.y[0], this.y[1], o.dy, v => { if (inY && Math.abs(v) < 1e-9) return; c.fillText(fy(v), ay - 5, this.sy(v)); }); }
    if (o.xl) { c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(o.xl, this.L + this.PW - 2, ax - 5); }
    if (o.yl) { c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(o.yl, ay + 6, this.T + 2); }
    c.restore();
  }
  dot(x, y, r, fill, stroke, lw = 1.5) {
    const c = this.ctx; c.beginPath(); c.arc(this.sx(x), this.sy(y), r, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  }
  pt(x, y, k, r = 5) { this.dot(x, y, r, col(k), col('surface'), 1.5); }
  seg(x1, y1, x2, y2, color, w = 1.5, dash) {
    const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = w; if (dash) c.setLineDash(dash);
    c.beginPath(); c.moveTo(this.sx(x1), this.sy(y1)); c.lineTo(this.sx(x2), this.sy(y2)); c.stroke(); c.restore();
  }
  path(pts, color, w = 2, dash, close) {
    if (!pts.length) return;
    const c = this.ctx; c.save(); c.strokeStyle = color; c.lineWidth = w; if (dash) c.setLineDash(dash);
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(this.sx(p[0]), this.sy(p[1])) : c.moveTo(this.sx(p[0]), this.sy(p[1])));
    if (close) c.closePath();
    c.stroke(); c.restore();
  }
  fn(f, color, w = 2, dash, clip = true) {
    const c = this.ctx; c.save();
    if (clip) { c.beginPath(); c.rect(this.L, this.T, this.PW, this.PH); c.clip(); }
    c.strokeStyle = color; c.lineWidth = w; if (dash) c.setLineDash(dash);
    c.beginPath(); let pen = false;
    const lo = this.y[0] - (this.y[1] - this.y[0]) * 4, hi = this.y[1] + (this.y[1] - this.y[0]) * 4;
    for (let px = this.L; px <= this.L + this.PW + 1; px += 2) {
      const y = f(this.ix(px));
      if (!isFinite(y)) { pen = false; continue; }
      const py = this.sy(clamp(y, lo, hi));
      if (pen) c.lineTo(px, py); else { c.moveTo(px, py); pen = true; }
    }
    c.stroke(); c.restore();
  }
  text(s, px, py, o = {}) {
    const c = this.ctx; c.save();
    c.font = (o.size || 11) + 'px ' + (o.font || MONO);
    c.fillStyle = o.color || col('ink-2'); c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    if (o.halo) { c.lineWidth = 3; c.strokeStyle = col('surface'); c.strokeText(s, px, py); }
    c.fillText(s, px, py); c.restore();
  }
  field(f, cell = 6) {
    const cols = Math.max(2, Math.ceil(this.PW / cell)), rows = Math.max(2, Math.ceil(this.PH / cell));
    if (!this._off || this._off.width !== cols || this._off.height !== rows) {
      this._off = document.createElement('canvas'); this._off.width = cols; this._off.height = rows;
      this._octx = this._off.getContext('2d'); this._img = this._octx.createImageData(cols, rows);
    }
    const d = this._img.data; let k = 0;
    for (let j = 0; j < rows; j++) {
      const y = this.iy(this.T + (j + .5) * this.PH / rows);
      for (let i = 0; i < cols; i++) {
        const q = f(this.ix(this.L + (i + .5) * this.PW / cols), y);
        d[k++] = q[0]; d[k++] = q[1]; d[k++] = q[2]; d[k++] = q[3];
      }
    }
    this._octx.putImageData(this._img, 0, 0);
    const c = this.ctx; c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(this._off, this.L, this.T, this.PW, this.PH); c.restore();
  }
  pick(arr, p, r = 16, gx = a => a.x, gy = a => a.y) {
    let best = -1, bd = r * r;
    arr.forEach((a, i) => { const dx = this.sx(gx(a)) - p.px, dy = this.sy(gy(a)) - p.py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  pointer(o) {
    const cv = this.cv; let down = false;
    const pos = e => { const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; return { px, py, x: this.ix(px), y: this.iy(py) }; };
    cv.addEventListener('pointerdown', e => { down = true; try { cv.setPointerCapture(e.pointerId); } catch (_) { } o.down && o.down(pos(e), e); });
    cv.addEventListener('pointermove', e => { o.move && o.move(pos(e), down, e); });
    const end = e => { if (!down) return; down = false; o.up && o.up(pos(e), e); };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!down && o.leave) o.leave(); });
  }
  tip() {
    const t = h('div', { class: 'tip' }); this.wrap.append(t);
    return {
      show: (px, py, html) => {
        t.innerHTML = html; t.classList.add('show');
        const w = t.offsetWidth, hh = t.offsetHeight;
        t.style.left = clamp(px + 12, 0, this.W - w) + 'px';
        t.style.top = clamp(py - hh - 10, 0, this.H - hh) + 'px';
      },
      hide: () => t.classList.remove('show')
    };
  }
}
ML.Plot = Plot;

/* ---------------- Animation loop that sleeps off-screen ---------------- */
function makeLoop(fig, step) {
  const L = {
    running: false, parked: false, last: 0, raf: 0,
    start() { if (L.running) return; L.running = true; L.last = performance.now(); L.raf = requestAnimationFrame(L.tick); L.onchange && L.onchange(true); },
    stop() { L.running = false; cancelAnimationFrame(L.raf); L.onchange && L.onchange(false); },
    toggle() { L.running ? L.stop() : L.start(); },
    tick(t) {
      if (!L.running) return;
      if (!fig._vis || document.hidden) { L.parked = true; return; }
      const dt = Math.min(0.05, (t - L.last) / 1000); L.last = t;
      if (step(dt) === false) { L.stop(); return; }
      L.raf = requestAnimationFrame(L.tick);
    },
    wake() { if (L.running && L.parked) { L.parked = false; L.last = performance.now(); L.raf = requestAnimationFrame(L.tick); } }
  };
  (fig._loops = fig._loops || []).push(L);
  return L;
}
ML.loop = makeLoop;
document.addEventListener('visibilitychange', () => { if (!document.hidden) $$('.fig').forEach(f => (f._loops || []).forEach(l => l.wake())); });

/* ---------------- UI controls ---------------- */
const UI = ML.ui = {
  row(parent) { const r = h('div', { class: 'ctrls' }); parent.append(r); return r; },
  slider(parent, o) {
    const id = 's' + Math.random().toString(36).slice(2, 8);
    const f = o.fmt || (v => v);
    const inp = h('input', { type: 'range', id, min: o.min, max: o.max, step: o.step || 'any', value: o.value });
    const out = h('output', { for: id, text: f(+o.value) });
    const wrap = h('div', { class: 'ctl' }, h('label', { for: id, text: o.label }), out, inp);
    parent.append(wrap);
    const api = {
      el: wrap, input: inp,
      get value() { return +inp.value; },
      set(v, fire) { inp.value = v; out.textContent = f(+inp.value); if (fire && o.on) o.on(+inp.value); }
    };
    inp.addEventListener('input', () => { out.textContent = f(+inp.value); o.on && o.on(+inp.value); });
    return api;
  },
  seg(parent, o) {
    const box = h('div', { class: 'seg', role: 'group', 'aria-label': o.label || '' });
    const btns = o.options.map(([v, l]) => {
      const b = h('button', { type: 'button', text: l, 'aria-pressed': 'false' });
      b.addEventListener('click', () => { api.set(v); o.on && o.on(v); });
      box.append(b); return [v, b];
    });
    const wrap = h('div', { class: 'seg-wrap' }, o.label ? h('span', { text: o.label }) : null, box);
    parent.append(wrap);
    const api = {
      el: wrap, value: o.value,
      set(v) { api.value = v; btns.forEach(([bv, b]) => { b.classList.toggle('on', bv === v); b.setAttribute('aria-pressed', bv === v); }); }
    };
    api.set(o.value);
    return api;
  },
  btn(parent, label, on, cls) {
    const b = h('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), text: label });
    b.addEventListener('click', on); parent.append(b); return b;
  },
  tgl(parent, label, checked, on) {
    const inp = h('input', { type: 'checkbox' }); inp.checked = !!checked;
    inp.addEventListener('change', () => on && on(inp.checked));
    parent.append(h('label', { class: 'tgl' }, inp, label));
    return inp;
  },
  stats(parent, items) {
    const box = h('div', { class: 'stats' }), map = {};
    for (const [k, l] of items) { const b = h('b', { text: '-' }); box.append(h('div', { class: 'stat' }, h('span', { text: l }), b)); map[k] = b; }
    parent.append(box);
    return { el: box, set(k, v) { if (map[k]) map[k].textContent = v; } };
  },
  legend(parent, items) {
    const box = h('div', { class: 'legend' });
    for (const [c, l, shape] of items) box.append(h('span', {}, h('i', { class: shape || '', style: 'background:' + (c.startsWith('#') ? c : 'var(--' + c + ')') }), l));
    parent.append(box); return box;
  },
  explain(parent) { const e = h('div', { class: 'explain', 'aria-live': 'polite' }); parent.append(e); return e; }
};

/* ---------------- Figures: numbering + lazy init ---------------- */
function setupFigures() {
  $$('section.chapter').forEach(sec => {
    const n = sec.dataset.num;
    $$('figure.fig', sec).forEach((fig, i) => {
      const lbl = n ? `FIG ${+n}.${i + 1}` : `FIG ${i + 1}`;
      fig.prepend(h('div', { class: 'fig-head' }, h('span', { class: 'lbl', text: lbl }), h('span', { class: 'ttl', text: fig.dataset.title || '' })));
      if (fig.dataset.demo && !$('.fig-body', fig)) {
        const body = h('div', { class: 'fig-body' });
        const cap = $('figcaption', fig);
        cap ? fig.insertBefore(body, cap) : fig.append(body);
      }
    });
  });
  const io = new IntersectionObserver(ents => {
    for (const e of ents) {
      const fig = e.target;
      fig._vis = e.isIntersecting;
      if (e.isIntersecting && !fig._init) initFig(fig);
      if (e.isIntersecting) (fig._loops || []).forEach(l => l.wake());
    }
  }, { rootMargin: '300px 0px' });
  $$('figure.fig[data-demo]').forEach(f => io.observe(f));
}
function initFig(fig) {
  fig._init = true;
  const fn = ML.demos[fig.dataset.demo], body = $('.fig-body', fig);
  if (!fn) { body.append(h('p', { class: 'hint', text: 'Missing demo: ' + fig.dataset.demo })); return; }
  try { fn(body, fig); } catch (err) { console.error(fig.dataset.demo, err); body.append(h('p', { class: 'hint', text: 'This figure failed to load: ' + err.message })); }
}
ML.initAll = () => $$('figure.fig[data-demo]').forEach(f => { if (!f._init) initFig(f); });
/* Initialize the remaining figures in idle time so page height settles quickly. */
function warmFigures() {
  const idle = window.requestIdleCallback || (f => setTimeout(f, 40));
  const next = () => { const f = $$('figure.fig[data-demo]').find(x => !x._init); if (f) { initFig(f); idle(next); } };
  idle(next);
}
/* Jumping to an anchor: settle every figure's height first, then scroll. */
function jumpTo(id, smooth) {
  const el = id && document.getElementById(id);
  if (!el) return;
  ML.initAll();
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}

/* ---------------- Chapters, navigation, progress ---------------- */
function setupChapters() {
  const secs = $$('section.chapter[data-num]');
  const toc = $('#toc');
  let part = null;
  const done = new Set(store('mlg-done') || []);
  const links = {};
  secs.forEach((s, i) => {
    if (s.dataset.part !== part) { part = s.dataset.part; toc.append(h('div', { class: 'toc-part', text: part })); }
    const a = h('a', { href: '#' + s.id }, h('span', { class: 'n', text: s.dataset.num }), h('span', { text: s.dataset.title }), h('i', { class: 'dot' }));
    links[s.id] = a; toc.append(a);
    const head = $('.ch-head', s);
    if (head && s.dataset.num !== '00') {
      head.prepend(h('div', { class: 'ch-kicker' }, h('b', { text: s.dataset.num }), s.dataset.part));
      const words = s.textContent.split(/\s+/).length, figs = $$('figure.fig[data-demo]', s).length;
      const meta = h('div', { class: 'ch-meta' }, h('span', { text: `~${Math.max(3, Math.round(words / 160))} min read` }));
      if (figs) meta.append(h('span', { text: `${figs} interactive figure${figs > 1 ? 's' : ''}` }));
      head.append(meta);
    }
    const end = h('div', { class: 'ch-end' });
    const btn = h('button', { type: 'button', class: 'btn' });
    const paint = () => { const d = done.has(s.id); btn.textContent = d ? 'Completed. Undo' : 'Mark chapter complete'; btn.classList.toggle('on', d); a.classList.toggle('done', d); };
    btn.addEventListener('click', () => { done.has(s.id) ? done.delete(s.id) : done.add(s.id); store('mlg-done', [...done]); paint(); meter(); });
    paint();
    end.append(btn);
    const nx = secs[i + 1];
    if (nx) end.append(h('a', { class: 'ch-next', href: '#' + nx.id }, 'Next: ', h('b', { text: nx.dataset.title }), ' →'));
    s.append(end);
  });
  const meter = () => {
    const n = secs.filter(s => done.has(s.id)).length;
    $('#prog-txt').textContent = `${n} of ${secs.length} chapters complete`;
    $('#prog-bar').style.width = (100 * n / secs.length) + '%';
  };
  meter();

  // Active chapter + reading progress
  const now = $('#top-now'), bar = $('.progress i');
  let ticking = false, active = null;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY, H = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (H > 0 ? 100 * y / H : 0) + '%';
    let cur = secs[0];
    for (const s of secs) { if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = s; else break; }
    if (cur && cur !== active) {
      if (active) links[active.id].classList.remove('active');
      active = cur; const a = links[cur.id]; a.classList.add('active');
      now.textContent = cur.dataset.num + '  ' + cur.dataset.title;
      const tr = toc.getBoundingClientRect(), ar = a.getBoundingClientRect();
      if (ar.top < tr.top || ar.bottom > tr.bottom) toc.scrollTop += ar.top - tr.top - tr.height / 2;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Mobile drawer
  const close = () => { document.body.classList.remove('nav-open'); $('#menu-btn').setAttribute('aria-expanded', 'false'); };
  $('#menu-btn').addEventListener('click', () => { const o = document.body.classList.toggle('nav-open'); $('#menu-btn').setAttribute('aria-expanded', o); });
  $('#scrim').addEventListener('click', close);
  toc.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function setupTheme() {
  const btn = $('#theme-btn'), lbl = $('#theme-lbl'), root = document.documentElement;
  let mode = 'auto';
  try { mode = localStorage.getItem('mlg-theme') || 'auto'; } catch (e) { }
  const apply = () => {
    if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    lbl.textContent = mode[0].toUpperCase() + mode.slice(1);
    try { localStorage.setItem('mlg-theme', mode); } catch (e) { }
    Theme.emit();
  };
  btn.addEventListener('click', () => { mode = { auto: 'light', light: 'dark', dark: 'auto' }[mode]; apply(); });
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onMq = () => { if (mode === 'auto') Theme.emit(); };
  mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
  lbl.textContent = mode[0].toUpperCase() + mode.slice(1);
}

/* ---------------- Quizzes ---------------- */
function setupQuizzes() {
  $$('.quiz').forEach(qz => {
    const qs = $$('.q', qz); let right = 0, answered = 0;
    const score = h('span', { text: `0 / ${qs.length}` });
    qz.prepend(h('div', { class: 'quiz-head' }, h('span', { text: 'Check yourself' }), score));
    qs.forEach(q => {
      const ans = +q.dataset.a, btns = $$('.opts button', q), fb = $('.fb', q);
      btns.forEach((b, i) => b.addEventListener('click', () => {
        btns.forEach(x => x.disabled = true);
        btns[ans].classList.add('right');
        const ok = i === ans; if (!ok) b.classList.add('wrong');
        fb.prepend(h('b', { class: ok ? 'ok' : 'no', text: ok ? 'Correct' : 'Not quite' }));
        fb.classList.add('show');
        answered++; if (ok) right++;
        score.textContent = `${right} / ${qs.length}` + (answered === qs.length ? (right === qs.length ? '  perfect' : '') : '');
      }));
    });
  });
}

/* ---------------- Code blocks ---------------- */
const PY_RE = /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rf]?"(?:\\.|[^"\\\n])*"|[rf]?'(?:\\.|[^'\\\n])*')|\b(\d+\.?\d*(?:e[-+]?\d+)?)\b|\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|lambda|None|True|False|try|except|finally|raise|yield|pass|break|continue|is|assert|del)\b|\b(print|len|range|zip|enumerate|list|dict|set|int|float|str|sum|min|max|abs|sorted|super|self|isinstance|round)\b|\b([A-Za-z_]\w*)(?=\()/gm;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlight(src) {
  let out = '', last = 0, m;
  PY_RE.lastIndex = 0;
  while ((m = PY_RE.exec(src))) {
    out += esc(src.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : m[4] ? 'k' : m[5] ? 'b' : 'f';
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) PY_RE.lastIndex++;
  }
  return out + esc(src.slice(last));
}
function setupCode() {
  $$('.code').forEach(box => {
    const code = $('code', box); if (!code) return;
    const src = code.textContent.replace(/^\n+|\s+$/g, '');
    code.innerHTML = (box.dataset.lang || 'python') === 'python' ? highlight(src) : esc(src);
    const copy = h('button', { type: 'button', text: 'Copy' });
    copy.addEventListener('click', () => {
      const done = () => { copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy', 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(src).then(done, () => { });
    });
    box.prepend(h('div', { class: 'code-head' }, h('span', { text: box.dataset.title || box.dataset.lang || 'python' }), copy));
  });
}

/* ---------------- Checklists + glossary ---------------- */
function setupChecks() {
  const saved = store('mlg-checks') || {};
  $$('.checks input[data-key]').forEach(inp => {
    inp.checked = !!saved[inp.dataset.key];
    inp.addEventListener('change', () => { saved[inp.dataset.key] = inp.checked; store('mlg-checks', saved); });
  });
}
function setupGlossary() {
  const inp = $('#gl-search'); if (!inp) return;
  const items = $$('.gloss > div'), cnt = $('.gl-count');
  const run = () => {
    const q = inp.value.trim().toLowerCase(); let n = 0;
    items.forEach(d => { const ok = !q || d.textContent.toLowerCase().includes(q); d.style.display = ok ? '' : 'none'; if (ok) n++; });
    cnt.textContent = `${n} of ${items.length} terms`;
  };
  inp.addEventListener('input', run); run();
}

ML.start = () => {
  setupTheme();
  setupFigures();
  setupChapters();
  setupQuizzes();
  setupCode();
  setupChecks();
  setupGlossary();
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    history.pushState(null, '', '#' + id);
    jumpTo(id, true);
  });
  addEventListener('popstate', () => jumpTo(decodeURIComponent(location.hash.slice(1))));
  if (location.hash) jumpTo(decodeURIComponent(location.hash.slice(1)));
  warmFigures();
};
