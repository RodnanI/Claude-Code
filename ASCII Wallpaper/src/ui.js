/* Page controller: font loading, render loop, control panel, keyboard,
 * full-screen, persistence and the capture API used by tools/render.mjs. */
(function () {
  'use strict';
  const A = window.ASCII;
  const qs = new URLSearchParams(location.search);
  const capture = qs.has('capture');
  const STORE = 'ascii-wallpaper-v2';

  const $ = (s) => document.querySelector(s);
  const canvas = $('#view');
  const panel = $('#panel');
  const hint = $('#hint');

  function fail(msg) {
    const e = $('#err');
    e.style.display = 'flex';
    e.textContent = msg;
  }

  async function loadFonts() {
    await Promise.all(
      A.fonts.map(async (f) => {
        const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
        const face = new FontFace(f.family, bin.buffer, { weight: String(f.weight) });
        await face.load();
        document.fonts.add(face);
      })
    );
  }

  // ------------------------------------------------------------ settings
  const sceneById = (id) => A.scenes.find((s) => s.id === id);
  const visibleScenes = () => A.scenes.filter((s) => !s.hidden);
  function sceneDefaults(sc) {
    return Object.assign({}, A.DEFAULTS, { scene: sc.id }, sc.defaults || {});
  }
  function loadStored() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || 'null');
    } catch (e) {
      return null;
    }
  }
  function store(s) {
    try {
      localStorage.setItem(STORE, JSON.stringify(s));
    } catch (e) {}
  }

  const NUM = ['adaptive', 'preset', 'bigGlyphs', 'dither', 'glyphPx', 'lineHeight', 'resScale', 'detail', 'speed', 'exposure', 'saturation', 'brightness', 'sharp', 'glyphGamma',
    'atmosphere', 'camera', 'stability', 'palette', 'font', 'cover', 'colGamma', 'seed'];

  function initialSettings() {
    let sc = sceneById(qs.get('scene')) || null;
    const stored = capture ? null : loadStored();
    if (!sc && stored && sceneById(stored.scene)) sc = sceneById(stored.scene);
    if (!sc) sc = visibleScenes()[0] || A.scenes[0];
    let s = sceneDefaults(sc);
    if (stored && stored.scene === sc.id) Object.assign(s, stored);
    for (const k of NUM) if (qs.has(k)) s[k] = parseFloat(qs.get(k));
    if (!s.glyphPx) s.glyphPx = autoGlyph();
    if (qs.has('quality')) s.quality = qs.get('quality');
    s.scene = sc.id;
    return s;
  }
  // default glyph size: about 11 device px on a 2160 px tall screen, never
  // below 8 px so glyph shapes stay legible on small screens
  function autoGlyph() {
    const h = (capture ? +qs.get('h') : Math.max(screen.height, screen.width * 9 / 16) * (window.devicePixelRatio || 1)) || 1080;
    return Math.max(8, Math.min(18, Math.round(h / 196)));
  }

  // ------------------------------------------------------------ engine
  let eng;
  let settings;
  let last = performance.now();
  let fpsAcc = 0,
    fpsN = 0,
    lastMeasure = 0;

  function applySettings(rebuild, auto) {
    eng.settings = Object.assign(eng.settings, settings);
    if (eng.scene !== sceneById(settings.scene)) eng.setScene(settings.scene);
    if (rebuild) eng.resize(true);
    // automatic quality steps are not remembered, so a slow moment never
    // permanently lowers quality
    if (!capture && !auto) store(settings);
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!eng.paused) eng.time += dt * settings.speed;
    eng.render(eng.time);
    fpsAcc += dt;
    fpsN++;
    if (now - lastMeasure > 1500) {
      eng.stats.fps = fpsN / Math.max(fpsAcc, 1e-3);
      governor(eng.stats.fps);
      fpsAcc = 0;
      fpsN = 0;
      lastMeasure = now;
      if (panel.classList.contains('open')) {
        eng.measure();
        updateStats();
      }
    }
    requestAnimationFrame(frame);
  }

  // Adaptive quality: if the GPU cannot keep ~24 fps for several seconds the
  // scene sampling is reduced one step (High -> Live), then the canvas
  // resolution. Glyph size and look are never changed automatically.
  let slow = 0;
  function governor(fps) {
    if (!settings.adaptive || eng.paused || document.hidden) return;
    slow = fps < 24 ? slow + 1 : 0;
    if (slow < 3) return;
    slow = 0;
    if (settings.quality === 'ultra') settings.quality = 'high';
    else if (settings.quality === 'high') settings.quality = 'live';
    else if (settings.resScale > 0.75) settings.resScale = 0.75;
    else return;
    applySettings(true, true);
    if (panel.classList.contains('open')) buildPanel();
  }

  // ------------------------------------------------------------ panel
  const CONTROLS = [
    { sec: 'Scene' },
    { k: 'scene', label: 'Scene', type: 'scene' },
    { k: 'preset', label: 'Preset', type: 'preset', when: (sc) => sc.presets && sc.presets.length },
    { k: 'palette', label: 'Palette', type: 'palette' },
    { sec: 'Characters' },
    { k: 'glyphPx', label: 'Glyph size', min: 5, max: 32, step: 1, rebuild: true, fmt: (v) => v + 'px' },
    { k: 'lineHeight', label: 'Line height', min: 0.9, max: 1.6, step: 0.02, rebuild: true },
    { k: 'font', label: 'Font', type: 'font', rebuild: true },
    { k: 'glyphGamma', label: 'Glyph weight', min: 0.5, max: 1.4, step: 0.05, rebuild: true, invert: true },
    { k: 'sharp', label: 'Edge contrast', min: 1, max: 3, step: 0.05 },
    { k: 'cover', label: 'Ink density', min: 0.3, max: 1, step: 0.01 },
    { k: 'dither', label: 'Texture mix', min: 0, max: 1.5, step: 0.05 },
    { k: 'bigGlyphs', label: 'Depth type scale', type: 'toggle', when: (sc) => sc.bigDepth > 0 },
    { sec: 'World' },
    { k: 'detail', label: 'Scene detail', min: 0, max: 1, step: 0.01 },
    { k: 'atmosphere', label: 'Atmosphere', min: 0, max: 1, step: 0.01 },
    { k: 'camera', label: 'Camera drift', min: 0, max: 1, step: 0.01 },
    { k: 'speed', label: 'Speed', min: 0, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) + 'x' },
    { sec: 'Light & colour' },
    { k: 'exposure', label: 'Exposure', min: 0.3, max: 3, step: 0.01 },
    { k: 'brightness', label: 'Brightness', min: 0.3, max: 2, step: 0.01 },
    { k: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01 },
    { sec: 'Rendering' },
    { k: 'quality', label: 'Quality', type: 'quality', rebuild: true },
    { k: 'resScale', label: 'Resolution', min: 0.5, max: 1, step: 0.05, rebuild: true, fmt: (v) => Math.round(v * 100) + '%' },
    { k: 'stability', label: 'Stability', min: 0, max: 1, step: 0.01 },
    { k: 'adaptive', label: 'Auto quality', type: 'toggle' },
  ];

  function opt(v, label, sel) {
    return `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
  }
  function buildPanel() {
    const sc = sceneById(settings.scene);
    let h = `<h1>ASCII Wallpaper</h1><div class="sub">${sc.name}${sc.tagline ? ' &middot; ' + sc.tagline : ''}</div>`;
    for (const c of CONTROLS) {
      if (c.sec) {
        h += `<div class="sec">${c.sec}</div>`;
        continue;
      }
      const v = settings[c.k];
      if (c.when && !c.when(sc)) continue;
      if (c.type === 'toggle') {
        h += `<div class="row sel"><label>${c.label}</label><button data-t="${c.k}" class="${v ? 'on' : ''}">${v ? 'On' : 'Off'}</button></div>`;
        continue;
      }
      if (c.type) {
        let o = '';
        if (c.type === 'scene') o = visibleScenes().map((s) => opt(s.id, s.name, s.id === v)).join('');
        if (c.type === 'preset') o = opt(-1, 'Custom', v < 0) + sc.presets.map((p, i) => opt(i, p.name, i === v)).join('');
        if (c.type === 'palette') o = (sc.palettes || [{ name: 'Default' }]).map((p, i) => opt(i, p.name, i === v)).join('');
        if (c.type === 'font') o = A.fonts.map((f, i) => opt(i, f.label, i === v)).join('');
        if (c.type === 'quality') o = Object.entries(A.QUALITY).map(([k, q]) => opt(k, q.label, k === v)).join('');
        h += `<div class="row sel"><label>${c.label}</label><select data-k="${c.k}">${o}</select></div>`;
      } else {
        h += `<div class="row"><label>${c.label}</label><input type="range" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}"><output>${fmt(c, v)}</output></div>`;
      }
    }
    h += `<div class="btns">
      <button data-a="pause">${eng.paused ? 'Resume' : 'Pause'}</button>
      <button data-a="full">Full screen</button>
      <button data-a="hide">Hide interface</button>
      <button data-a="png">Save PNG</button>
      <button data-a="reset">Reset scene</button>
      <button data-a="close">Close</button>
    </div>
    <div id="stats"></div>
    <div class="keys">Space pause &middot; F full screen &middot; H interface &middot; S save &middot; [ ] glyph size</div>`;
    panel.innerHTML = h;
    panel.querySelectorAll('input[type=range]').forEach((el) => el.addEventListener('input', onInput));
    panel.querySelectorAll('select').forEach((el) => el.addEventListener('change', onSelect));
    panel.querySelectorAll('button[data-a]').forEach((el) => el.addEventListener('click', () => action(el.dataset.a)));
    panel.querySelectorAll('button[data-t]').forEach((el) =>
      el.addEventListener('click', () => {
        const k = el.dataset.t;
        settings[k] = settings[k] ? 0 : 1;
        el.classList.toggle('on', !!settings[k]);
        el.textContent = settings[k] ? 'On' : 'Off';
        applySettings(false);
      })
    );
    updateStats();
  }
  function fmt(c, v) {
    v = +v;
    return c.fmt ? c.fmt(v) : v.toFixed(2);
  }
  function onInput(e) {
    const k = e.target.dataset.k;
    const c = CONTROLS.find((x) => x.k === k);
    settings[k] = parseFloat(e.target.value);
    e.target.nextElementSibling.textContent = fmt(c, settings[k]);
    if (settings.preset >= 0) {
      settings.preset = -1;
      const ps = panel.querySelector('select[data-k=preset]');
      if (ps) ps.value = '-1';
    }
    applySettings(c.rebuild);
  }
  function onSelect(e) {
    const k = e.target.dataset.k;
    const v = e.target.value;
    if (k === 'scene') {
      const keep = { resScale: settings.resScale, quality: settings.quality, font: settings.font };
      settings = Object.assign(sceneDefaults(sceneById(v)), keep);
      settings.glyphPx = settings.glyphPx || autoGlyph();
      eng.setScene(v);
      applySettings(true);
      buildPanel();
      return;
    }
    settings[k] = k === 'quality' ? v : parseFloat(v);
    if (k === 'preset') {
      const sc = sceneById(settings.scene);
      const pr = sc.presets[settings.preset];
      if (pr) {
        const keep = { resScale: settings.resScale, quality: settings.quality, font: settings.font };
        settings = Object.assign(sceneDefaults(sc), pr.settings || {}, keep, { preset: settings.preset });
        if (!settings.glyphPx) settings.glyphPx = autoGlyph();
      }
      applySettings(true);
      buildPanel();
      return;
    }
    if (k === 'palette') {
      const pal = (sceneById(settings.scene).palettes || [])[settings.palette];
      if (pal && pal.settings) Object.assign(settings, pal.settings);
      applySettings(true);
      buildPanel();
      return;
    }
    applySettings(CONTROLS.find((x) => x.k === k).rebuild);
  }
  function updateStats() {
    const el = $('#stats');
    if (!el) return;
    const s = eng.stats;
    const n = (x) => (x || 0).toLocaleString('en-US');
    el.textContent =
      `grid       ${s.cols} x ${s.rows} cells (${s.cw}x${s.ch}px)\n` +
      `capacity   ${n(s.cells)} cells\n` +
      `drawn      ${n(s.nonSpace)} glyphs (${n(s.distinct)} distinct)\n` +
      `visible    ${n(s.visible)} clearly lit\n` +
      `samples    ${n(s.samples)} scene samples/frame\n` +
      `canvas     ${s.W} x ${s.H}  ${s.fps ? s.fps.toFixed(0) + ' fps' : ''}`;
  }
  function action(a) {
    if (a === 'pause') togglePause();
    if (a === 'full') toggleFull();
    if (a === 'hide') setPanel(false);
    if (a === 'close') setPanel(false);
    if (a === 'png') savePNG();
    if (a === 'reset') {
      const keep = { resScale: settings.resScale, quality: settings.quality };
      settings = Object.assign(sceneDefaults(sceneById(settings.scene)), keep);
      settings.glyphPx = settings.glyphPx || autoGlyph();
      applySettings(true);
      buildPanel();
    }
  }
  function togglePause() {
    eng.paused = !eng.paused;
    const b = panel.querySelector('[data-a=pause]');
    if (b) b.textContent = eng.paused ? 'Resume' : 'Pause';
  }
  function toggleFull() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen && document.exitFullscreen();
  }
  function savePNG() {
    eng.render(eng.time);
    canvas.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `ascii-${settings.scene}-${eng.W}x${eng.H}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }
  function setPanel(open) {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      buildPanel();
      hint.classList.remove('show');
    }
  }

  // idle handling: the hint button and cursor appear on mouse movement only
  let idleTimer = 0;
  function poke() {
    document.body.classList.remove('idle');
    if (!panel.classList.contains('open')) hint.classList.add('show');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      hint.classList.remove('show');
      if (!panel.classList.contains('open')) document.body.classList.add('idle');
    }, 2200);
  }

  function bindInput() {
    window.addEventListener('mousemove', poke);
    window.addEventListener('touchstart', poke, { passive: true });
    hint.addEventListener('click', () => setPanel(true));
    canvas.addEventListener('dblclick', toggleFull);
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        togglePause();
        e.preventDefault();
      } else if (k === 'f') toggleFull();
      else if (k === 'h') setPanel(!panel.classList.contains('open'));
      else if (k === 'escape') setPanel(false);
      else if (k === 's') savePNG();
      else if (k === '[' || k === ']') {
        settings.glyphPx = Math.max(5, Math.min(32, settings.glyphPx + (k === ']' ? 1 : -1)));
        applySettings(true);
        if (panel.classList.contains('open')) buildPanel();
      }
    });
    window.addEventListener('resize', () => eng.resize(false));
  }

  // ------------------------------------------------------------ capture API
  function exposeCapture() {
    window.__ascii = {
      engine: eng,
      set(obj) {
        Object.assign(settings, obj);
        applySettings(true);
      },
      render(t) {
        eng.render(t);
        return eng.stats;
      },
      // render several frames leading up to t so temporal stability matches
      // what a viewer sees during playback
      renderAt(t, warm = 6, fps = 30) {
        eng.hasPrev = false;
        for (let i = warm; i >= 0; i--) eng.render(t - i / fps);
        return eng.measure();
      },
      measure: () => eng.measure(),
      pixels() {
        const gl = eng.gl;
        const px = new Uint8Array(eng.W * eng.H * 4);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.readPixels(0, 0, eng.W, eng.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      },
    };
  }

  async function main() {
    try {
      await loadFonts();
    } catch (e) {
      console.warn('font load failed', e);
    }
    settings = initialSettings();
    const fixed = capture && qs.has('w') ? [+qs.get('w'), +qs.get('h')] : null;
    try {
      eng = new A.Engine(canvas, { settings, fixedSize: fixed, preserve: capture });
      eng.setScene(settings.scene);
      eng.resize(true);
    } catch (e) {
      fail(String(e.message || e));
      window.__asciiError = String(e.message || e);
      throw e;
    }
    if (capture) {
      document.body.classList.add('idle');
      hint.style.display = 'none';
      exposeCapture();
      window.__asciiReady = true;
      return;
    }
    eng.time = (sceneById(settings.scene).startAt || 0) % (sceneById(settings.scene).loop || 60);
    bindInput();
    exposeCapture();
    requestAnimationFrame(frame);
  }
  main();
})();
