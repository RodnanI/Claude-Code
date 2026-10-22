/* Showcase shell: mounts one hero at a time, glyph-wipe transitions, index, export. */
(() => {
  const L = createLib();
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), ix = $('#index'), wipeC = $('#wipe');
  const N = HEROES.length, pad = (n) => String(n).padStart(2, '0');
  const styled = new Set();
  let cur = -1, live = null, busy = false;

  const mount = (i) => {
    const h = HEROES[i];
    if (!styled.has(h.id)) {
      styled.add(h.id);
      L.loadFonts(h.fonts);
      const st = document.createElement('style');
      st.dataset.hero = h.id;
      st.textContent = h.css;
      document.head.appendChild(st);
    }
    const root = document.createElement('section');
    root.className = 'hero h-' + h.id;
    root.innerHTML = h.html;
    stage.insertBefore(root, ix);
    const S = L.scope();
    try { h.init(root, L, S); } catch (err) { console.error('[' + h.id + ']', err); }
    return { root, S };
  };
  const unmount = (m) => { if (m) { m.S.destroy(); m.root.remove(); } };

  const paint = () => {
    const h = HEROES[cur];
    $('.bar-num').textContent = pad(cur + 1) + ' / ' + pad(N);
    $('.bar-name').textContent = h.name;
    $('.bar-kind').textContent = h.kind;
    const sw = $('.bar-sw');
    sw.style.setProperty('--c', h.accent || 'transparent');
    sw.title = h.accent ? 'Monochrome plus one accent' : 'Monochrome';
    document.title = h.title + ' · ASCII Heroes 2';
    ix.querySelectorAll('.ix-item').forEach((b, j) => b.toggleAttribute('aria-current', j === cur));
  };

  /* Glyph wipe: a ragged front of scrambling characters covers the stage, the hero is
     swapped underneath, then a second front uncovers it. */
  const GL = '#@%&*+=-:;/\\|<>^~?!';
  const wipe = (swap) => {
    busy = true;
    const r = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    wipeC.width = Math.ceil(r.width * dpr); wipeC.height = Math.ceil(r.height * dpr);
    const ctx = wipeC.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement), bg = cs.getPropertyValue('--sb').trim(), fg = cs.getPropertyValue('--sf').trim();
    const cw = r.width < 640 ? 9 : 10, ch = r.width < 640 ? 16 : 18, cols = Math.ceil(r.width / cw), rows = Math.ceil(r.height / ch);
    ctx.font = `500 ${r.width < 640 ? 12 : 13}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const jit = new Float32Array(cols * rows);
    for (let k = 0; k < jit.length; k++) jit[k] = L.hash(k, 7) * 0.16 + L.hash(k % cols, 3) * 0.05;
    const T = 820, t0 = performance.now();
    let swapped = false;
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / T), a = L.smooth(0, 0.5, p) * 1.24, b = L.smooth(0.52, 1, p) * 1.24, tick = (now / 45) | 0;
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.fillStyle = bg;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = y * cols + x, d = (x / cols) * 0.78 + (y / rows) * 0.22 + jit[k];
        if (d > a || d < b) continue;
        ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
      }
      ctx.fillStyle = fg;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = y * cols + x, d = (x / cols) * 0.78 + (y / rows) * 0.22 + jit[k];
        if (d > a || d < b) continue;
        const e = Math.min(a - d, d - b);
        if (e > 0.1) continue;
        ctx.globalAlpha = 1 - e / 0.1;
        ctx.fillText(GL[(L.hash(k, tick) * GL.length) | 0], x * cw + cw / 2, y * ch + ch / 2);
      }
      ctx.globalAlpha = 1;
      if (!swapped && p >= 0.5) { swapped = true; swap(); }
      if (p < 1) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, r.width, r.height); busy = false; }
    };
    requestAnimationFrame(frame);
  };

  const go = (i, instant) => {
    i = ((i % N) + N) % N;
    closeIndex();
    if (busy || i === cur) return;
    const swap = () => {
      unmount(live);
      cur = i;
      live = mount(i);
      paint();
      try { history.replaceState(null, '', '#' + HEROES[i].id); } catch (e) {}
    };
    if (instant || L.reduced) swap(); else wipe(swap);
  };

  /* ---------- index ---------- */
  ix.innerHTML = `<div class="ix-in">
    <header class="ix-head">
      <div><p class="ix-kick">ASCII Heroes &middot; Volume 2</p><h2>${N} landing-page heroes,<br>drawn with plain text.</h2></div>
      <p class="ix-note">Every mark on these pages is a character in a monospace grid, moved by a real simulation: kinematics, cloth, slime mold, split-flap mechanics, ray casting. Each hero has a dark and a light theme, a phone layout, and ships as one standalone HTML file. Press <kbd>D</kbd> or <b>Get HTML</b> on any of them.</p>
    </header>
    <div class="ix-grid">${HEROES.map((h, i) => `<button class="ix-item" data-i="${i}"><span class="ix-n">${pad(i + 1)}</span><span class="ix-t"><b>${h.name}</b><em>${h.kind}</em></span><span class="ix-c" style="--c:${h.accent || 'transparent'}">${h.accent ? 'accent' : 'mono'}</span><span class="ix-d">${h.tech}</span></button>`).join('')}</div>
    <div class="ix-foot"><span>&larr; &rarr; browse &middot; I index &middot; T theme &middot; D download</span><span>Vol. 2 &middot; ${new Date().getFullYear()}</span></div>
  </div>`;
  const openIndex = () => { ix.classList.add('open'); ix.setAttribute('aria-hidden', 'false'); L.paused = true; const c = ix.querySelector('[aria-current]') || ix.querySelector('.ix-item'); if (c) c.focus({ preventScroll: false }); };
  const closeIndex = () => { if (!ix.classList.contains('open')) return; ix.classList.remove('open'); ix.setAttribute('aria-hidden', 'true'); L.paused = false; };
  const toggleIndex = () => (ix.classList.contains('open') ? closeIndex() : openIndex());
  ix.addEventListener('click', (e) => { const b = e.target.closest('.ix-item'); if (b) go(+b.dataset.i); });

  /* ---------- export one hero as a standalone file ---------- */
  const exportHero = (h) => {
    const sc = '</' + 'script>';
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${h.title}</title>
<script>try{var t=localStorage.getItem('ascii-heroes-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){document.documentElement.dataset.theme='dark'}${sc}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${h.fonts}&display=swap">
<style>
html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:#000}
:root[data-theme=light] body{background:#fff}
.hero{height:100vh;height:100dvh}
${h.css}
</style>
</head>
<body>
<section class="hero h-${h.id}">${h.html}</section>
<script>
${createLib.toString()}
(function () {
  var L = createLib();
  (${h.init.toString()})(document.querySelector('.hero'), L, L.scope());
})();
${sc}
</body>
</html>
`;
  };
  const download = () => {
    if (cur < 0) return;
    const h = HEROES[cur];
    const url = URL.createObjectURL(new Blob([exportHero(h)], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = h.id + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  window.__exportHero = (id) => exportHero(HEROES.find((h) => h.id === id) || HEROES[cur]);

  /* ---------- controls ---------- */
  document.getElementById('bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'prev') go(cur - 1);
    else if (act === 'next') go(cur + 1);
    else if (act === 'index') toggleIndex();
    else if (act === 'get') download();
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (document.activeElement && document.activeElement.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowright') { e.preventDefault(); go(cur + 1); }
    else if (k === 'arrowleft') { e.preventDefault(); go(cur - 1); }
    else if (k === 'i') toggleIndex();
    else if (k === 'escape') closeIndex();
    else if (k === 't') L.setTheme(L.theme() === 'dark' ? 'light' : 'dark');
    else if (k === 'd') download();
  });
  window.addEventListener('hashchange', () => { const j = HEROES.findIndex((h) => h.id === location.hash.slice(1)); if (j >= 0) go(j); });
  const meta = document.querySelector('meta[name=theme-color]');
  const syncMeta = () => meta && meta.setAttribute('content', L.theme() === 'light' ? '#f2f1ec' : '#070707');
  window.addEventListener('ascii:theme', syncMeta);
  syncMeta();

  const start = HEROES.findIndex((h) => h.id === location.hash.slice(1));
  go(start >= 0 ? start : 0, true);
})();
