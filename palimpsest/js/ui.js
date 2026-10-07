/* Palimpsest / ui
   The desk: a sheet that draws itself, a book that writes itself as the years
   pass, a ribbon of years to scrub, and cards that tell what a place was called
   and why, and what became of it. */
'use strict';
(function () {
  const P = window.P;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ORD = (n) => P.Chronicle.ORD(n);
  const YEARS_PER_SECOND = 12;
  const WORDS = ['amber', 'saltmarsh', 'kestrel', 'lantern', 'orchard', 'hollowmere', 'tidewrack', 'quill', 'bramble', 'cinder', 'vellum', 'meridian', 'heron', 'juniper', 'marrow', 'sorrel', 'thistle', 'larkspur', 'driftwood', 'umber', 'ochre', 'oakgall', 'nightjar', 'ashlar', 'lodestone', 'fathom', 'barrow', 'cairn', 'tarn', 'moraine', 'estuary', 'shingle', 'sedge', 'rowan', 'alder', 'yarrow', 'wormwood', 'sable', 'pewter', 'tallow', 'brine', 'hearth', 'kiln', 'anvil', 'spindle', 'psalter', 'rubric', 'folio', 'colophon', 'lichen', 'peat', 'wren', 'flint', 'bellwether', 'gloaming', 'ember', 'cormorant', 'mistral', 'sirocco', 'hinterland', 'causeway', 'glacier', 'saffron', 'cardamom', 'obsidian', 'basalt', 'gneiss', 'haar', 'selkie', 'wychwood'];

  const UI = {
    world: null, g: null, st: null, terr: null, decor: null,
    t: 0, year: -1, shownYear: -2, playing: false, speed: 1,
    drawing: false, ops: null, opIndex: 0, drawStart: 0, dynAlpha: 0, dynOn: false,
    view: { s: 1, tx: 0, ty: 0 }, fit: { w: 1, h: 1, k: 1, bw: 1, bh: 1 },
    items: [], revealed: -1, follow: true, dirty: true, lastRender: 0, renderCost: 30,
    hover: null, pendingYear: null, gen: 0,
  };
  window.PalimpsestUI = UI;
  // fingers on glass: bigger targets, taps instead of hovers
  const TOUCH = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;
  UI.goto = (y) => { pause(); UI.t = y; setYear(y, false); };

  /* ---------- textures for desk and leaves ---------- */
  function noiseTile(size, base, spread, alpha) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const img = x.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = (Math.random() - 0.5) * spread;
      img.data[i * 4] = base[0] + v; img.data[i * 4 + 1] = base[1] + v * 0.9; img.data[i * 4 + 2] = base[2] + v * 0.75;
      img.data[i * 4 + 3] = alpha;
    }
    x.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  function textures() {
    document.body.style.backgroundImage = `url(${noiseTile(160, [26, 19, 13], 14, 255)})`;
    const parch = `url(${noiseTile(180, [232, 219, 189], 16, 255)})`;
    for (const el of [$('leaf'), $('card')]) el.style.backgroundImage = parch;
    for (const el of document.querySelectorAll('.slip')) el.style.backgroundImage = parch;
  }

  async function fonts() {
    const list = ['20px "IM Fell English"', 'italic 20px "IM Fell English"', '20px "IM Fell English SC"', '20px "IM Fell DW Pica"', '20px "IM Fell Great Primer"', 'italic 20px "IM Fell DW Pica"'];
    try { await Promise.race([Promise.all(list.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 3000))]); } catch (e) { /* fall back to Georgia */ }
  }

  const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  /* ---------- making a world ---------- */
  async function generate(seedRaw, startYear) {
    const seed = String(seedRaw || '').trim().slice(0, 40) || WORDS[Math.floor(Math.random() * WORDS.length)];
    const gen = ++UI.gen;
    pause();
    P.Music.stop();
    $('soundBtn').setAttribute('aria-pressed', 'false');
    $('landing').hidden = true;
    $('card').hidden = true;
    UI.highlight = null; UI.hover = null; UI.cardFor = null; $('tip').hidden = true;
    $('loading').hidden = false;
    $('loadingTitle').textContent = seed.toUpperCase();
    const steps = $('steps');
    steps.innerHTML = '';
    $('seedInput').value = seed;
    history.replaceState(null, '', '#w=' + encodeURIComponent(seed) + (startYear !== undefined && startYear !== null ? '&y=' + startYear : ''));
    const step = async (label, fn) => {
      const li = document.createElement('li');
      li.textContent = label;
      steps.appendChild(li);
      await frame();
      if (gen !== UI.gen) throw new Error('superseded');
      fn();
      li.className = 'done';
    };
    const world = { seed, rng: new P.Rng(seed.toLowerCase()), W: 320, H: 224 };
    try {
      await step('Raising the land out of the sea', () => P.Terrain.generate(world));
      await step('Settling the peoples and teaching them to speak', () => P.History.simulate(world));
      await step(`Writing down ${world.years} years`, () => P.Chronicle.write(world));
      let g, paper, terr, decor;
      await step('Laying out the vellum and mixing the inks', () => {
        g = P.Render.geometry(world);
        paper = P.Render.paper(world, g);
        terr = P.Render.terrainOps(world, g);
        decor = P.Render.decorOps(world, g, terr);
      });
      UI.world = world; UI.g = g; UI.terr = terr; UI.decor = decor;
      UI.paper = paper;
      const mk = () => P.Render.canvas(g.CW, g.CH);
      UI.ink = mk(); UI.inkCtx = UI.ink.getContext('2d');
      UI.dyn = mk(); UI.dynCtx = UI.dyn.getContext('2d');
      UI.halo = mk(); UI.haloCtx = UI.halo.getContext('2d');
      UI.tmp = mk(); UI.tmpCtx = UI.tmp.getContext('2d');
      const map = $('map');
      map.width = g.CW; map.height = g.CH;
      UI.mapCtx = map.getContext('2d');
      UI.st = P.Political.create(world, g, terr);
      UI.st.keepOut = P.Render.spotBoxes(decor.spots);
      UI.ops = terr.ops.concat(decor.ops).sort((a, b) => a.t - b.t);
      UI.opIndex = 0;
      UI.drawing = true;
      UI.drawStart = performance.now();
      UI.dynOn = false; UI.dynAlpha = 0;
      UI.t = 0; UI.year = -1; UI.shownYear = -2;
      UI.startYear = startYear;
      buildChronicle();
      buildTimeline();
      layoutMap(true);
      $('chronSub').textContent = 'The cartographer is still drawing.';
      $('yearNum').textContent = ' ';
      $('yearEra').textContent = 'the sheet is being drawn';
      document.title = 'Palimpsest: ' + world.worldName.text(0);
    } catch (e) {
      if (e.message !== 'superseded') { console.error(e); steps.insertAdjacentHTML('beforeend', `<li>The ink ran: ${esc(e.message)}</li>`); }
      return;
    }
    $('loading').hidden = true;
  }

  function finishDrawing() {
    while (UI.opIndex < UI.ops.length) UI.ops[UI.opIndex++].f(UI.inkCtx);
  }

  /* roads, old borders and fallen names are worked out while nobody is looking */
  function prepareIdle() {
    const gen = UI.gen;
    const jobs = P.Political.prepareJobs(UI.st);
    const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 16));
    const run = (dl) => {
      if (gen !== UI.gen) return;
      const end = performance.now() + Math.min(10, Math.max(4, dl.timeRemaining()));
      while (jobs.length && performance.now() < end) jobs.shift()();
      if (jobs.length) idle(run);
    };
    idle(run);
  }

  function afterDrawing() {
    UI.drawing = false;
    prepareIdle();
    UI.dynOn = true;
    UI.dynFadeStart = performance.now();
    const y = UI.startYear !== undefined && UI.startYear !== null ? Math.max(0, Math.min(UI.world.years, UI.startYear)) : 0;
    UI.t = y;
    setYear(y, false);
    if (UI.startYear === undefined || UI.startYear === null) setTimeout(() => { if (!UI.drawing && UI.t === 0) play(); }, 900);
    $('hint').style.opacity = 1;
    clearTimeout(UI.hintTimer);
    UI.hintTimer = setTimeout(() => { $('hint').style.opacity = 0; }, 14000);
  }

  /* ---------- compositing the sheet ---------- */
  function composite() {
    const g = UI.g, c = UI.mapCtx;
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, g.CW, g.CH);
    c.drawImage(UI.paper, 0, 0);
    const t = UI.tmpCtx;
    t.globalCompositeOperation = 'copy';
    t.drawImage(UI.ink, 0, 0);
    if (UI.dynOn) {
      t.globalCompositeOperation = 'destination-out';
      t.globalAlpha = UI.dynAlpha;
      t.drawImage(UI.halo, 0, 0);
      t.globalAlpha = 1;
    }
    t.globalCompositeOperation = 'source-over';
    c.globalCompositeOperation = 'multiply';
    c.drawImage(UI.tmp, 0, 0);
    if (UI.dynOn) {
      c.globalAlpha = UI.dynAlpha;
      c.drawImage(UI.dyn, 0, 0);
      c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
    // a name hovered in the book is ringed on the sheet
    const hl = UI.highlight;
    if (hl && UI.dynOn && UI.year >= 0) {
      c.save();
      c.strokeStyle = 'rgba(176,40,20,0.9)';
      c.lineJoin = 'round';
      if (hl.kind === 's') {
        const s = UI.world.settlements[hl.id];
        const x = UI.g.X(s.x), y = UI.g.Y(s.y);
        c.lineWidth = 3.5;
        c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 1.5; c.strokeStyle = 'rgba(176,40,20,0.45)';
        c.beginPath(); c.arc(x, y, 27, 0, Math.PI * 2); c.stroke();
      } else if (hl.kind === 'p') {
        const t = P.Political.territory(UI.st, UI.year);
        const poly = t.polys.get(hl.id);
        if (poly) { c.lineWidth = 4; c.setLineDash([12, 6]); c.stroke(poly.path); }
      }
      c.restore();
    }
  }

  function renderYear() {
    const t0 = performance.now();
    // at speed the borders are redrawn every few years; towns and names still every year
    const k = UI.playing ? (UI.speed >= 8 ? 5 : UI.speed >= 3 ? 2 : 1) : 1;
    P.Political.render(UI.st, UI.year, UI.dynCtx, UI.haloCtx, { borderYear: Math.floor(UI.year / k) * k, labelScale: UI.labelScale || 1, allLayers: UI.scrape });
    UI.shownYear = UI.year;
    composite();
    UI.renderCost = UI.renderCost * 0.7 + (performance.now() - t0) * 0.3;
    UI.lastRender = performance.now();
  }

  /* ---------- the main loop ---------- */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (UI.world && UI.drawing) {
      const p = Math.min(1, (now - UI.drawStart) / 5600);
      const budget = performance.now() + 13;
      while (UI.opIndex < UI.ops.length && UI.ops[UI.opIndex].t <= p && performance.now() < budget) UI.ops[UI.opIndex++].f(UI.inkCtx);
      composite();
      if (UI.opIndex >= UI.ops.length) afterDrawing();
    } else if (UI.world && UI.dynOn) {
      if (UI.dynAlpha < 1) {
        UI.dynAlpha = Math.min(1, (now - UI.dynFadeStart) / 900);
        UI.dirty = true;
      }
      if (UI.playing) {
        UI.t += dt * YEARS_PER_SECOND * UI.speed;
        if (UI.t >= UI.world.years) { UI.t = UI.world.years; pause(); }
        const y = Math.floor(UI.t);
        if (y !== UI.year) setYear(y, true);
      }
      const gap = Math.max(40, UI.renderCost * 1.6);
      if (UI.year !== UI.shownYear && now - UI.lastRender > gap) renderYear();
      else if (UI.dirty) { composite(); }
      UI.dirty = false;
    }
    requestAnimationFrame(loop);
  }

  /* ---------- years ---------- */
  function setYear(y, fromPlay) {
    const W = UI.world;
    if (!W) return;
    y = Math.max(0, Math.min(W.years, Math.round(y)));
    if (y === UI.year) return;
    UI.year = y;
    $('yearNum').textContent = 'Year ' + y;
    $('yearEra').textContent = eraOf(y);
    revealTo(y, fromPlay && UI.speed <= 3);
    drawTimelineCursor();
    if (y % 5 === 0 || !fromPlay) {
      const c = P.Music.follow(W, y);
      if (c && P.Music.on) $('soundBtn').title = 'Now: the music of the ' + c.plural;
    }
    if (!UI.playing) scheduleHash();
    if (!$('card').hidden && UI.cardFor) {
      const now = performance.now();
      if (!UI.playing || now - (UI.cardAt || 0) > 1500) { UI.cardAt = now; UI.cardFor(true); }
    }
  }

  function eraOf(y) {
    const W = UI.world;
    const h = W.chronicle.hands.find((x) => y >= x.from && y <= x.to);
    if (!h) return y < (W.chronicle.hands[0] ? W.chronicle.hands[0].from : 0) ? 'before the first scribe' : 'the book is silent';
    const house = W.settlements[h.house];
    const pid = house.ownerY[y];
    if (pid < 0) return 'the scriptorium stands empty';
    const p = W.polities[pid];
    const R = p.rulers.filter((r) => r.from <= y && (r.to === null || r.to >= y)).slice(-1)[0];
    if (!R) return '';
    return `the ${ORD(y - R.from + 1)} year of ${R.name.text(y)}${R.ordinal > 1 ? ' ' + P.Chronicle.ROMAN(R.ordinal) : ''}`;
  }

  let hashTimer = null;
  function scheduleHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      if (!UI.world) return;
      history.replaceState(null, '', '#w=' + encodeURIComponent(UI.world.seed) + '&y=' + UI.year);
    }, 400);
  }

  function play() {
    if (!UI.world || UI.drawing) return;
    if (UI.t >= UI.world.years) { UI.t = 0; setYear(0, false); }
    UI.playing = true;
    $('playIcon').innerHTML = '<path d="M4 3 h4 v14 h-4 z M12 3 h4 v14 h-4 z"/>';
    $('playBtn').setAttribute('aria-label', 'Stop the years');
  }
  function pause() {
    UI.playing = false;
    $('playIcon').innerHTML = '<path d="M5 3 L17 10 L5 17 Z"/>';
    $('playBtn').setAttribute('aria-label', 'Let the years pass');
    if (UI.world) scheduleHash();
  }

  /* ---------- the chronicle ---------- */
  function buildChronicle() {
    const W = UI.world, ch = W.chronicle;
    const box = $('entries');
    box.innerHTML = '';
    UI.items = [];
    const margins = ch.margins.slice();
    let mi = 0;
    const handFont = (hid) => (hid >= 0 ? ch.hands[hid].font : 0);
    const frag = document.createDocumentFragment();
    const addNote = (m) => {
      const el = document.createElement('div');
      el.className = 'note future ' + m.kind;
      el.innerHTML = m.html;
      frag.appendChild(el);
      UI.items.push({ y: m.y, el, note: true });
    };
    for (let k = 0; k < ch.entries.length; k++) {
      const e = ch.entries[k];
      while (mi < margins.length && margins[mi].y < e.y) addNote(margins[mi++]);
      const el = document.createElement('article');
      el.className = `entry future h${handFont(e.hand)} ${e.type}${e.intro || (e.type === 'arrive' && k <= 1) ? ' intro' : ''}`;
      el.dataset.y = e.y;
      const yr = e.y < 0 ? '' : e.y;
      el.innerHTML = `<span class="yr" data-jump="${Math.max(0, e.y)}">${yr}</span>${e.native ? '<canvas class="nat"></canvas>' : ''}<p>${e.html}</p>`;
      if (e.hand >= 0) el.style.color = ch.hands[e.hand].ink;
      frag.appendChild(el);
      UI.items.push({ y: e.y, el, e });
    }
    while (mi < margins.length) addNote(margins[mi++]);
    box.appendChild(frag);
    UI.revealed = -1;
    box.scrollTop = 0;
  }

  function drawNative(item) {
    const e = item.e, W = UI.world;
    if (!e.native || item.drawn) return;
    item.drawn = true;
    const c = W.cultures[e.native.script];
    const sc = c && c.script;
    const cv = item.el.querySelector('canvas.nat');
    if (!sc || !cv) { if (cv) cv.remove(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 16;
    const w = Math.min(340, Math.ceil(sc.measure(e.native.ph, size) + 8));
    cv.width = w * dpr; cv.height = 24 * dpr;
    cv.style.width = w + 'px'; cv.style.height = '24px';
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    const ink = e.hand >= 0 ? W.chronicle.hands[e.hand].ink : '#2a1d13';
    sc.draw(x, e.native.ph, 3, 20, size, ink);
    cv.title = `${e.native.translit}: ${e.native.gloss}`;
  }

  const SOUND_OF = { war: 'war', battle: 'battle', plague: 'plague', fall: 'fall', invasion: 'invasion', crowned: 'crowned', empire: 'empire', death: 'death' };
  function revealTo(y, animate) {
    const items = UI.items;
    let changed = false, fresh = 0;
    while (UI.revealed + 1 < items.length && items[UI.revealed + 1].y <= y) {
      const it = items[++UI.revealed];
      it.el.classList.remove('future');
      if (it.e) drawNative(it);
      if (animate && fresh < 2) {
        it.el.classList.add('fresh');
        setTimeout(() => it.el.classList.remove('fresh'), 1500);
        if (it.e && SOUND_OF[it.e.type]) P.Music.event(SOUND_OF[it.e.type]);
        fresh++;
      }
      changed = true;
    }
    while (UI.revealed >= 0 && items[UI.revealed].y > y) {
      items[UI.revealed].el.classList.add('future');
      UI.revealed--;
      changed = true;
    }
    if (changed && UI.follow) {
      const box = $('entries');
      box.scrollTop = box.scrollHeight;
    }
    const W = UI.world;
    const h = W.chronicle.hands.find((x) => y >= x.from && y <= x.to);
    $('chronSub').textContent = h ? `kept by ${h.name.text(y)}, ${h.title.replace(/^the /, '')}, at ${W.nameAt(W.settlements[h.house], y).text(y)}` : y < (W.chronicle.hands[0] || { from: 0 }).from ? 'as the old people remember it' : '';
  }

  /* ---------- the ribbon of years ---------- */
  const TL = { canvas: null, base: null, dpr: 1, w: 0, h: 0 };
  function buildTimeline() {
    const c = $('timeline');
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    TL.dpr = dpr; TL.w = Math.max(100, r.width); TL.h = Math.max(30, r.height);
    c.width = TL.w * dpr; c.height = TL.h * dpr;
    const base = document.createElement('canvas');
    base.width = c.width; base.height = c.height;
    const x = base.getContext('2d');
    x.scale(dpr, dpr);
    const W = UI.world;
    if (!W) return;
    const Y = W.years, w = TL.w, h = TL.h;
    const X = (yy) => 8 + (yy / Y) * (w - 16);
    x.fillStyle = '#e2d3b0';
    x.fillRect(0, 6, w, h - 12);
    x.strokeStyle = '#6e5236'; x.lineWidth = 1;
    x.strokeRect(0.5, 6.5, w - 1, h - 13);
    // the lost years
    for (const gp of W.chronicle.gaps) {
      x.fillStyle = 'rgba(110,82,54,0.18)';
      x.fillRect(X(gp.a), 7, X(gp.b) - X(gp.a), h - 14);
    }
    // wars along the top
    for (const wr of W.wars) {
      const a = X(wr.start), b = X(wr.end === null ? Y : wr.end);
      x.fillStyle = 'rgba(158,44,28,0.55)';
      x.fillRect(a, 9 + (wr.id % 3) * 3, Math.max(1.2, b - a), 2);
    }
    // ticks
    x.fillStyle = '#4a3725'; x.font = `11px ${P.Render.FONT.roman}`; x.textAlign = 'center';
    for (let yy = 0; yy <= Y; yy += 10) {
      const big = yy % 100 === 0, mid = yy % 50 === 0;
      x.fillRect(X(yy) - 0.5, h - 7 - (big ? 12 : mid ? 7 : 4), 1, big ? 12 : mid ? 7 : 4);
      if (big && w > 360) x.fillText(String(yy), X(yy), h - 21);
    }
    // marks for what the book remembers most
    for (const e of W.events) {
      const px = X(e.y);
      if (e.type === 'plague') { x.fillStyle = '#1f1610'; x.beginPath(); x.arc(px, h / 2 + 2, 2.6, 0, Math.PI * 2); x.fill(); }
      else if (e.type === 'empire') { x.fillStyle = '#b88d3e'; x.beginPath(); x.moveTo(px, h / 2 - 5); x.lineTo(px + 4, h / 2); x.lineTo(px, h / 2 + 5); x.lineTo(px - 4, h / 2); x.closePath(); x.fill(); }
      else if (e.type === 'invasion') { x.fillStyle = '#9b2c1c'; x.beginPath(); x.moveTo(px - 5, h / 2 + 4); x.lineTo(px + 5, h / 2 + 4); x.lineTo(px, h / 2 - 5); x.closePath(); x.fill(); }
      else if (e.type === 'fall') { x.strokeStyle = '#4a3725'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px - 2.5, h / 2 - 1); x.lineTo(px + 2.5, h / 2 + 4); x.moveTo(px + 2.5, h / 2 - 1); x.lineTo(px - 2.5, h / 2 + 4); x.stroke(); }
    }
    for (const hd of W.chronicle.hands) { x.fillStyle = '#6e5236'; x.fillRect(X(hd.from) - 0.5, h - 9, 1, 3); }
    TL.base = base; TL.canvas = c; TL.X = X;
    drawTimelineCursor();
  }
  function drawTimelineCursor() {
    if (!TL.canvas || !TL.base || !UI.world) return;
    const x = TL.canvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, TL.canvas.width, TL.canvas.height);
    x.drawImage(TL.base, 0, 0);
    x.scale(TL.dpr, TL.dpr);
    const y = Math.max(0, UI.year);
    const px = TL.X(y);
    x.fillStyle = 'rgba(42,29,19,0.12)';
    x.fillRect(8, 7, px - 8, TL.h - 14);
    x.fillStyle = '#9b2c1c';
    x.fillRect(px - 1, 2, 2, TL.h - 4);
    x.beginPath(); x.moveTo(px - 6, 0); x.lineTo(px + 6, 0); x.lineTo(px + 6, 9); x.lineTo(px, 5); x.lineTo(px - 6, 9); x.closePath(); x.fill();
  }
  function timelineYear(clientX) {
    const r = TL.canvas.getBoundingClientRect();
    const t = (clientX - r.left - 8) / (r.width - 16);
    return Math.round(Math.max(0, Math.min(1, t)) * UI.world.years);
  }

  /* ---------- the sheet: fitting, zooming, dragging ---------- */
  function layoutMap(reset) {
    if (!UI.g) return;
    const box = $('sheet').getBoundingClientRect();
    const g = UI.g;
    const k = Math.min(box.width / g.CW, box.height / g.CH);
    UI.fit = { w: g.CW * k, h: g.CH * k, k, bw: box.width, bh: box.height };
    const m = $('map');
    m.style.width = UI.fit.w + 'px';
    m.style.height = UI.fit.h + 'px';
    if (reset) UI.view = { s: 1, tx: (box.width - UI.fit.w) / 2, ty: (box.height - UI.fit.h) / 2 };
    clampView();
    applyView();
  }
  function clampView() {
    const v = UI.view, f = UI.fit;
    v.s = Math.max(1, Math.min(3.5, v.s));
    const w = f.w * v.s, h = f.h * v.s;
    v.tx = w <= f.bw ? (f.bw - w) / 2 : Math.min(0, Math.max(f.bw - w, v.tx));
    v.ty = h <= f.bh ? (f.bh - h) / 2 : Math.min(0, Math.max(f.bh - h, v.ty));
  }
  let lsTimer = null;
  function applyView() {
    $('viewport').style.transform = `translate(${UI.view.tx}px, ${UI.view.ty}px) scale(${UI.view.s})`;
    // a village name should never be smaller than about ten screen pixels
    const css = UI.fit.k * UI.view.s;
    const want = Math.round(Math.max(1, Math.min(1.75, 10.5 / (21 * css))) * 20) / 20;
    if (want !== UI.labelScale) {
      clearTimeout(lsTimer);
      lsTimer = setTimeout(() => { UI.labelScale = want; UI.shownYear = -2; }, UI.labelScale ? 160 : 0);
    }
  }
  function zoomAt(cx, cy, f) {
    const v = UI.view;
    const ns = Math.max(1, Math.min(3.5, v.s * f));
    const k = ns / v.s;
    v.tx = cx - (cx - v.tx) * k;
    v.ty = cy - (cy - v.ty) * k;
    v.s = ns;
    clampView(); applyView();
  }
  function toCanvas(clientX, clientY) {
    const r = $('map').getBoundingClientRect();
    return [((clientX - r.left) / r.width) * UI.g.CW, ((clientY - r.top) / r.height) * UI.g.CH];
  }

  /* ---------- hovering and reading ---------- */
  // a fingertip is wider than a cursor, so it reaches about 24 screen pixels
  const pickRad = (touch) => (touch ? Math.max(18, 24 / (UI.fit.k * UI.view.s)) : undefined);
  function hoverAt(clientX, clientY, touch) {
    const tip = $('tip');
    if (!UI.world || UI.drawing || !UI.dynOn) { tip.hidden = true; return; }
    const [px, py] = toCanvas(clientX, clientY);
    const hit = P.Political.pick(UI.st, UI.year, px, py, pickRad(touch));
    if (!hit) { tip.hidden = true; UI.hover = null; return; }
    const key = hit.kind + ':' + (hit.id !== undefined ? hit.id : hit.battle.year);
    if (UI.hover !== key) { UI.hover = key; tip.innerHTML = tipHTML(hit); drawTipScript(hit); }
    tip.hidden = false;
    const sr = $('sheet').getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = clientX - sr.left + 16, y = clientY - sr.top + 14;
    if (touch) { x = clientX - sr.left - tw / 2; y = clientY - sr.top - th - 30; if (y < 4) y = clientY - sr.top + 30; }
    if (x + tw > sr.width - 6) x = touch ? sr.width - tw - 6 : clientX - sr.left - tw - 14;
    if (y + th > sr.height - 6) y = clientY - sr.top - th - 12;
    tip.style.left = Math.max(4, x) + 'px';
    tip.style.top = Math.max(4, y) + 'px';
  }

  function polityLabel(pid, y) {
    const W = UI.world, p = W.polities[pid];
    const f = P.Political.formAt(p, y);
    const nm = P.Political.polityName(p, y).text(y);
    const c = W.cultures[p.culture];
    if (f === 'tribe') return `the ${c.plural}${W.polities.filter((q) => q.culture === p.culture && q.founded <= y && (q.ended === null || q.ended > y)).length > 1 ? ' of ' + W.nameAt(W.settlements[p.capitals[0].s], y).text(y) : ''}`;
    if (f === 'empire') return `the ${c.adj} Empire`;
    if (f === 'city') return `the City of ${nm}`;
    return `the Kingdom of ${nm}`;
  }

  function tipHTML(hit) {
    const W = UI.world, y = UI.year;
    const more = (what) => (TOUCH ? '' : `<div class="t-meta"><i>click for ${what}</i></div>`);
    if (hit.kind === 'settlement') {
      const s = W.settlements[hit.id];
      const n = W.nameAt(s, y);
      const alive = s.popY[y] > 0;
      let html = `<canvas class="tsc" width="10" height="10"></canvas><div class="t-name">${esc(n.text(y))}</div>`;
      if (n.gloss) html += `<div class="t-gloss">‘${esc(n.gloss)}’</div>`;
      let cur = 0;
      for (let k = 0; k < s.names.length; k++) if (s.names[k].year <= y) cur = k;
      if (cur > 0) html += `<div class="t-old">${esc(s.names[cur - 1].name.text(s.names[cur].year - 1))}</div>`;
      if (alive) {
        const tier = P.Political.tierOf(W, s, y);
        const what = { capital: 'chief city of', seat: 'seat of', city: 'a city of', town: 'a town of', village: 'a village of' }[tier];
        html += `<div class="t-meta">${what} ${esc(polityLabel(s.ownerY[y], y))}<br>some ${Math.round(s.popY[y] / 50) * 50} souls, mostly ${esc(W.cultures[s.cultY[y]].plural)}</div>`;
      } else html += `<div class="t-meta">ruins, empty since the year ${s.spans.length ? s.spans[s.spans.length - 1].from : s.ruined}</div>`;
      return html + more('its whole history');
    }
    if (hit.kind === 'battle') {
      const b = hit.battle;
      return `<div class="t-name">Battle of ${esc(W.nameAt(W.settlements[b.at], b.year).text(b.year))}</div><div class="t-meta">in the year ${b.year}: ${esc(polityLabel(b.winner, b.year))} beat ${esc(polityLabel(b.loser, b.year))}</div>`;
    }
    const p = W.polities[hit.id];
    const R = p.rulers.filter((r) => r.from <= y && (r.to === null || r.to >= y)).slice(-1)[0];
    return `<div class="t-name">${esc(polityLabel(hit.id, y))}</div><div class="t-meta">${R ? 'ruled by ' + esc(R.name.text(y)) + (R.ordinal > 1 ? ' ' + P.Chronicle.ROMAN(R.ordinal) : '') : ''}${p.founded ? '<br>since the year ' + p.founded : ''}</div>${more('its rulers')}`;
  }

  function drawTipScript(hit) {
    if (hit.kind !== 'settlement') return;
    const W = UI.world, y = UI.year, s = W.settlements[hit.id];
    const cv = $('tip').querySelector('canvas.tsc');
    if (!cv) return;
    const n = W.nameAt(s, y);
    const c = W.cultures[n.lang.id];
    const sc = c && c.script;
    if (!sc) { cv.remove(); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ph = n.form(y);
    const w = Math.ceil(sc.measure(ph, 18) + 6);
    cv.width = w * dpr; cv.height = 26 * dpr; cv.style.width = w + 'px'; cv.style.height = '26px';
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    sc.draw(x, ph, 2, 22, 18, '#2a1d13');
  }

  /* ---------- cards ---------- */
  function etymology(n) {
    const W = UI.world;
    if (n.loan) {
      const from = n.loan.from;
      const fc = W.cultures[from.lang.id];
      return `borrowed from the ${esc(fc.adj)} <b>${esc(from.text(n.loan.year))}</b>${from.gloss ? `, ‘${esc(from.gloss)}’` : ''}, and made to fit ${esc(W.cultures[n.lang.id].adj)} mouths`;
    }
    if (n.parts && n.parts.length) {
      const parts = n.parts.map((p) => (p.concept ? `<b>${esc(n.lang.romanize(p.ph))}</b> ‘${esc(p.concept)}’` : `<b>${esc(p.name.text(n.born))}</b>`));
      return parts.join(' + ') + (n.gloss ? `: ‘${esc(n.gloss)}’` : '');
    }
    return n.gloss ? `‘${esc(n.gloss)}’` : 'of uncertain meaning; perhaps older than any people now living there';
  }
  const ipa = (n, y) => '/' + n.form(y).filter((p) => p !== '-').join('').replace(/ /g, ' ') + '/';

  function openCard(html, refresh, keep) {
    const card = $('card');
    const top = card.scrollTop;
    card.innerHTML = '<button class="btn close" data-close="1">close</button>' + html;
    card.hidden = false;
    card.scrollTop = keep ? top : 0;
    UI.cardFor = refresh || null;
  }

  function showSettlement(id, keep) {
    const W = UI.world, y = Math.max(UI.year, W.settlements[id].founded), s = W.settlements[id];
    const n = W.nameAt(s, y);
    const c = W.cultures[n.lang.id];
    let html = `<canvas class="cardsc" width="10" height="10"></canvas><h3>${esc(n.text(y))}</h3><div class="ipa">${esc(ipa(n, y))} &middot; in ${esc(c.adj)}</div><div class="ety">${etymology(n)}</div>`;
    html += '<h4>Its names</h4><ul>';
    s.names.forEach((e, k) => {
      const until = k + 1 < s.names.length ? s.names[k + 1].year - 1 : W.years;
      const why = { founded: 'founded as', conquest: 'renamed by its conquerors', renamed: 'renamed', borrowed: 'the name worn into another tongue', refounded: 'built again on the ruins, as' }[e.why] || e.why;
      const hist = e.name.history(until);
      html += `<li><span class="y">${e.year}</span>${why} <b>${esc(hist[0].text)}</b>${e.name.gloss && e.why !== 'borrowed' ? `, ‘${esc(e.name.gloss)}’` : ''}</li>`;
      for (let i = 1; i < hist.length; i++) html += `<li><span class="y">${hist[i].year}</span><span class="struck">${esc(hist[i - 1].text)}</span> worn down to <b>${esc(hist[i].text)}</b></li>`;
    });
    html += '</ul>';
    html += `<h4>In the year ${UI.year}</h4><ul>`;
    if (UI.year < s.founded) html += `<li>Not yet built. It will be founded in the year ${s.founded}.</li>`;
    else if (s.popY[UI.year] > 0) {
      html += `<li>Some ${Math.round(s.popY[UI.year] / 50) * 50} souls, mostly ${esc(W.cultures[s.cultY[UI.year]].plural)}</li>`;
      html += `<li>Held by <span class="pn" data-p="${s.ownerY[UI.year]}">${esc(polityLabel(s.ownerY[UI.year], UI.year))}</span></li>`;
    } else html += '<li>Ruins.</li>';
    const works = s.works.filter((w) => w.year <= UI.year);
    for (const w of works) html += `<li>${w.kind === 'temple' ? `a temple of ${esc(W.cultures[w.culture].gods[w.god].name.text(w.year))}` : 'its ' + w.kind}, built in ${w.year}${w.lost && w.lost <= UI.year ? `, burned in ${w.lost}` : ''}</li>`;
    let peakY = 0;
    for (let k = 0; k <= W.years; k++) if (s.popY[k] > s.popY[peakY]) peakY = k;
    html += `<li>At its greatest, about the year ${peakY}, some ${Math.round(s.popY[peakY] / 100) * 100} souls lived there.</li></ul>`;
    const mentions = W.chronicle.entries.filter((e) => e.html.includes(`data-s="${id}"`));
    if (mentions.length) {
      html += '<h4>Where the chronicle speaks of it</h4><ul>';
      for (const e of mentions) html += `<li class="jump" data-jump="${Math.max(0, e.y)}"><span class="y">${e.y < 0 ? '' : e.y}</span>${e.html.replace(/<[^>]+>/g, '').slice(0, 150)}${e.html.length > 150 ? '...' : ''}</li>`;
      html += '</ul>';
    }
    openCard(html, (k) => showSettlement(id, k), keep);
    const cv = $('card').querySelector('canvas.cardsc');
    const sc = c.script;
    if (cv && sc) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const ph = n.form(y);
      const w = Math.ceil(sc.measure(ph, 30) + 8);
      cv.width = w * dpr; cv.height = 42 * dpr; cv.style.width = w + 'px'; cv.style.height = '42px';
      const x = cv.getContext('2d'); x.scale(dpr, dpr);
      sc.draw(x, ph, 2, 36, 30, '#2a1d13');
    } else if (cv) cv.remove();
  }

  function showPolity(pid, keep) {
    const W = UI.world, p = W.polities[pid], y = Math.max(UI.year, p.founded);
    const c = W.cultures[p.culture];
    const nm = P.Political.polityName(p, y);
    let html = `<h3>${esc(polityLabel(pid, y))}</h3><div class="ipa">${esc(ipa(nm, y))} &middot; a realm of the ${esc(c.plural)}</div>`;
    html += `<div class="ety">${etymology(nm)}</div><ul>`;
    for (const f of p.forms) html += `<li><span class="y">${f.year}</span>${{ tribe: 'a people under a chief', kingdom: 'a kingdom', empire: 'an empire', city: 'a free city, ruled by council' }[f.form]}</li>`;
    if (p.ended !== null) html += `<li><span class="y">${p.ended}</span>${{ conquered: 'conquered', annexed: 'swallowed whole', union: 'joined to another crown by marriage', vanished: 'faded away' }[p.endCause] || p.endCause}${p.endBy !== null && p.endBy !== undefined ? ' by <span class="pn" data-p="' + p.endBy + '">' + esc(polityLabel(p.endBy, p.ended)) + '</span>' : ''}</li>`;
    html += '</ul><h4>Its rulers</h4><ul>';
    for (const R of p.rulers) {
      const nmR = R.name.text(R.from) + (R.ordinal > 1 ? ' ' + P.Chronicle.ROMAN(R.ordinal) : '') + (R.epithet ? ' ' + R.epithet : '');
      const rel = R.relation && !['elected', 'disputed', 'none'].includes(R.relation) ? `, ${R.relation} of the last` : R.relation === 'elected' ? ', chosen by the council' : '';
      html += `<li class="jump" data-jump="${R.from}"><span class="y">${R.from}</span>${esc(nmR)}${rel}${R.to !== null ? `; died ${R.death === 'old age' ? 'old' : R.death === 'deposed' ? 'deposed' : 'of ' + R.death.replace(/^(a |an )/, '')} in ${R.to}` : ''}</li>`;
    }
    html += '</ul>';
    const wars = W.wars.filter((w) => w.a === pid || w.b === pid);
    if (wars.length) {
      html += '<h4>Its wars</h4><ul>';
      for (const w of wars) {
        const other = w.a === pid ? w.b : w.a;
        const res = w.result === null ? 'still going' : w.result === 'stalemate' ? 'nobody won' : w.result === pid ? 'won' : 'lost';
        html += `<li class="jump" data-jump="${w.start}"><span class="y">${w.start}</span>against <span class="pn" data-p="${other}">${esc(polityLabel(other, w.start))}</span>, ${res}${w.end ? ' in ' + w.end : ''}</li>`;
      }
      html += '</ul>';
    }
    openCard(html, (k) => showPolity(pid, k), keep);
  }

  /* ---------- the appendix: tongues and letters ---------- */
  const PROVERBS = [
    { c: ['river', 'not', 'remember', 'rain'], en: 'The river does not remember the rain.' },
    { c: ['king', 'die', 'barley', 'rise'], en: 'Kings die; the barley comes up anyway.' },
    { c: ['sword', 'and', 'book', 'not', 'friend'], en: 'The sword and the book are not friends.' },
    { c: ['word', 'go', 'not', 'come'], en: 'A word that has gone out does not come back.' },
    { c: ['road', 'long', 'all', 'walk'], en: 'The road is long, and everyone walks it.' },
    { c: ['stranger', 'guest', 'stranger', 'enemy'], en: 'A stranger fed is a guest; a stranger turned away is an enemy.' },
    { c: ['stone', 'forget', 'none'], en: 'Stones forget nothing.' },
    { c: ['night', 'long', 'day', 'come'], en: 'However long the night, the day comes.' },
  ];

  function specimen(c) {
    const sc = c.script;
    const L = c.lang;
    const cells = [];
    const inh = sc.type === 'abugida' ? sc.inherent : 'a';
    for (const p of L.cons) cells.push({ ph: sc.type === 'abugida' || sc.type === 'syllabary' ? [p, inh] : [p], label: L.romanize(sc.type === 'abugida' || sc.type === 'syllabary' ? [p, inh] : [p]) });
    for (const v of L.vows) cells.push({ ph: [v], label: L.romanize([v]) });
    if (sc.type === 'syllabary' || sc.type === 'abugida') {
      const k = L.cons[0];
      for (const v of L.vows) if (v !== inh) cells.push({ ph: [k, v], label: L.romanize([k, v]) });
    }
    const size = 30, cw = 64, chh = 66;
    const cols = 12;
    const rows = Math.ceil(cells.length / cols);
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cols * cw * dpr; cv.height = rows * chh * dpr;
    cv.style.width = cols * cw + 'px';
    cv.className = 'specimen';
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    cells.forEach((cell, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * chh;
      const w = sc.measure(cell.ph, size);
      sc.draw(x, cell.ph, cx + (cw - w) / 2, cy + 40, size, '#2a1d13');
      x.font = `italic 14px ${P.Render.FONT.roman}`; x.fillStyle = '#6e5236'; x.textAlign = 'center';
      x.fillText(cell.label, cx + cw / 2, cy + 60);
    });
    return cv;
  }

  function showAppendix() {
    const W = UI.world;
    if (!W) return;
    const body = $('appendixBody');
    const Y = W.years;
    let html = `<button class="btn closer" data-close-appendix="1">close</button><h2>Appendix</h2><p class="gloss">Of the peoples of ${esc(W.worldName.text(0))}, their tongues, their letters and their gods; with the changes their speech went through, as far as the scribes noticed them.</p>`;
    const holders = [];
    W.cultures.forEach((c) => {
      const L = c.lang;
      const first = W.settlements.find((s) => s.cultY.find((v) => v >= 0) === c.id && s.founded === c.arrived) || W.settlements.find((s) => s.culture === c.id);
      html += `<h3>The ${esc(c.plural)}</h3>`;
      html += `<p>They call themselves <b>${esc(c.endonym.text(Y))}</b> <span class="gloss">(${esc(ipa(c.endonym, Y))})</span>, which is to say ‘${esc(c.endonym.gloss)}’. Strangers call them the ${esc(c.plural)}, and their speech ${esc(c.adj)}. ${c.origin === 'sea' ? `They came over the sea in the year ${c.arrived}` : c.arrived === 0 ? 'They were the first to come' : `They came in the year ${c.arrived}`}${first ? `, and their first town was ${esc(W.nameAt(first, first.founded).text(first.founded))}` : ''}.</p>`;
      html += '<h4>Their letters</h4>';
      if (c.script && c.scriptFrom === c.id) {
        html += `<p>${esc(c.script.describe())}</p><div data-spec="${c.id}"></div>`;
        holders.push(c);
      } else if (c.script) html += `<p>They had no letters of their own. From the year ${c.scriptYear} they wrote in the manner of the ${esc(W.cultures[c.scriptFrom].plural)}.</p>`;
      else html += '<p>They had no letters, and kept what they knew in songs and in the memory of old women.</p>';
      const cons = L.cons.map((p) => L.romanize([p])).join(' ');
      const vows = L.vows.map((p) => L.romanize([p])).join(' ');
      const shape = L.codaP < 0.05 ? 'every syllable ends in a vowel' : L.codaP < 0.25 ? 'syllables sometimes close on a consonant' : 'syllables often close on a consonant';
      const clusters = L.clusters.length ? `; words may begin with ${L.clusters.slice(0, 4).map((cl) => L.romanize(cl)).join(', ')}` : '; two consonants never begin a syllable together';
      html += `<h4>Their sounds</h4><p>Consonants: <b>${esc(cons)}</b>. Vowels: <b>${esc(vows)}</b>. In this tongue ${shape}${esc(clusters)}. Names are joined ${{ fuse: 'into one word', hyphen: 'with a hyphen', space: 'as two words' }[L.join]}, the describing word ${L.order === 'mod-head' ? 'first' : 'second'}; in a sentence the verb comes ${{ SOV: 'last', SVO: 'in the middle', VSO: 'first' }[L.wordOrder]}.</p>`;
      if (L.changes.length) {
        html += '<h4>How their speech changed</h4><ul>';
        for (const ch of L.changes) {
          const ex = W.settlements.map((s) => W.nameAt(s, ch.year)).filter((n) => n.lang === L && n.born < ch.year && n.text(ch.year - 1) !== n.text(ch.year));
          const n = ex[0];
          html += `<li>About the year ${ch.year}, ${esc(ch.desc)}${n ? `: <b>${esc(n.text(ch.year - 1))}</b> became <b>${esc(n.text(ch.year))}</b>` : ''}.</li>`;
        }
        html += '</ul>';
      }
      html += '<h4>Some of their words</h4><div class="lex">';
      const pick = ['sun', 'moon', 'star', 'water', 'fire', 'stone', 'river', 'sea', 'mount', 'wood', 'town', 'king', 'god', 'people', 'mother', 'father', 'child', 'war', 'peace', 'death', 'song', 'book', 'word', 'year', 'night', 'day', 'white', 'black', 'red', 'old', 'new', 'high', 'wolf', 'horse', 'salt', 'iron'];
      for (const k of pick) html += `<div><b>${esc(L.romanize(L.root(k, Y)))}</b> <i>${esc(k)}</i></div>`;
      html += '</div>';
      const pv = PROVERBS[c.id % PROVERBS.length];
      const words = pv.c.map((k) => L.romanize(L.root(k, Y)));
      html += `<h4>A saying</h4><table class="gloss"><tr>${words.map((w) => `<td><b>${esc(w)}</b></td>`).join('')}</tr><tr>${pv.c.map((k) => `<td><i>${esc(k)}</i></td>`).join('')}</tr></table><p><i>${esc(pv.en)}</i></p>`;
      html += '<h4>Their gods</h4><ul>';
      for (const gd of c.gods) html += `<li><b>${esc(gd.name.text(Y))}</b>, of ${esc(gd.domain)}</li>`;
      html += `</ul><h4>Their music</h4><p>${esc(P.Music.describe(c))}.</p>`;
    });
    body.innerHTML = html;
    body.style.backgroundImage = $('leaf').style.backgroundImage;
    for (const c of holders) {
      const slot = body.querySelector(`[data-spec="${c.id}"]`);
      if (slot) slot.appendChild(specimen(c));
    }
    $('appendix').hidden = false;
    body.scrollTop = 0;
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('seedForm').addEventListener('submit', (e) => { e.preventDefault(); generate($('seedInput').value); });
    $('landingForm').addEventListener('submit', (e) => { e.preventDefault(); generate($('landingInput').value); });
    const rnd = () => WORDS[Math.floor(Math.random() * WORDS.length)];
    $('randomBtn').addEventListener('click', () => generate(rnd()));
    $('landingRandom').addEventListener('click', () => generate(rnd()));
    $('playBtn').addEventListener('click', () => (UI.playing ? pause() : play()));
    for (const b of document.querySelectorAll('#speed .btn')) b.addEventListener('click', () => {
      UI.speed = +b.dataset.speed;
      for (const o of document.querySelectorAll('#speed .btn')) o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
    });
    $('soundBtn').addEventListener('click', () => {
      if (P.Music.on) { P.Music.stop(); $('soundBtn').setAttribute('aria-pressed', 'false'); return; }
      if (!UI.world) return;
      const c = P.Music.follow(UI.world, Math.max(0, UI.year));
      if (P.Music.start(UI.world)) {
        $('soundBtn').setAttribute('aria-pressed', 'true');
        if (c) $('soundBtn').title = 'Now: the music of the ' + c.plural;
      }
    });
    $('appendixBtn').addEventListener('click', showAppendix);
    $('scrapeBtn').addEventListener('click', () => {
      UI.scrape = !UI.scrape;
      $('scrapeBtn').setAttribute('aria-pressed', UI.scrape ? 'true' : 'false');
      UI.shownYear = -2;
    });
    $('appendix').addEventListener('click', (e) => { if (e.target === $('appendix') || e.target.dataset.closeAppendix) $('appendix').hidden = true; });
    $('saveBtn').addEventListener('click', () => {
      if (!UI.world || UI.drawing) return;
      composite();
      $('map').toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `palimpsest-${UI.world.seed.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-year-${UI.year}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      });
    });
    $('followBtn').addEventListener('click', () => {
      UI.follow = !UI.follow;
      $('followBtn').setAttribute('aria-pressed', UI.follow ? 'true' : 'false');
      if (UI.follow) $('entries').scrollTop = $('entries').scrollHeight;
    });
    const entries = $('entries');
    const unfollow = () => { if (UI.follow && entries.scrollTop + entries.clientHeight < entries.scrollHeight - 40) { UI.follow = false; $('followBtn').setAttribute('aria-pressed', 'false'); } };
    entries.addEventListener('wheel', () => setTimeout(unfollow, 30), { passive: true });
    entries.addEventListener('touchmove', () => setTimeout(unfollow, 30), { passive: true });
    // names in the book and on cards open their histories; years jump the ribbon
    const leafClick = (e) => {
      if (e.target.classList.contains('nat') && e.target.title) {
        const n = e.target.nextElementSibling;
        if (n && n.classList.contains('tr')) n.remove();
        else e.target.insertAdjacentHTML('afterend', `<div class="tr">${esc(e.target.title)}</div>`);
        return;
      }
      const t = e.target.closest('[data-s],[data-p],[data-r],[data-jump],[data-close]');
      if (!t) return;
      if (t.dataset.close) { $('card').hidden = true; UI.cardFor = null; return; }
      if (t.dataset.s !== undefined) showSettlement(+t.dataset.s);
      else if (t.dataset.p !== undefined) showPolity(+t.dataset.p);
      else if (t.dataset.r !== undefined) showPolity(UI.world.rulers[+t.dataset.r].polity);
      else if (t.dataset.jump !== undefined) { pause(); UI.t = +t.dataset.jump; setYear(UI.t, false); }
    };
    $('entries').addEventListener('click', leafClick);
    $('card').addEventListener('click', leafClick);
    const hlOver = (e) => {
      const t = e.target.closest('[data-s],[data-p]');
      const next = t ? (t.dataset.s !== undefined ? { kind: 's', id: +t.dataset.s } : { kind: 'p', id: +t.dataset.p }) : null;
      const cur = UI.highlight;
      if ((cur && next && cur.kind === next.kind && cur.id === next.id) || (!cur && !next)) return;
      UI.highlight = next;
      UI.dirty = true;
    };
    for (const el of [$('entries'), $('card')]) {
      el.addEventListener('mouseover', hlOver);
      el.addEventListener('mouseleave', () => { if (UI.highlight) { UI.highlight = null; UI.dirty = true; } });
    }

    // the sheet
    const sheet = $('sheet');
    sheet.addEventListener('wheel', (e) => {
      if (!UI.world) return;
      e.preventDefault();
      const r = sheet.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
      $('hint').style.opacity = 0;
    }, { passive: false });
    const ptrs = new Map();
    let drag = null, pinch = null, lastType = 'mouse', lastTap = null, tapTimer = null, tipTimer = null;
    const hideTip = () => { clearTimeout(tipTimer); $('tip').hidden = true; UI.hover = null; };
    sheet.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.zoom')) return;
      lastType = e.pointerType;
      if (e.pointerType !== 'mouse') hideTip();
      sheet.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: UI.view.tx, ty: UI.view.ty, moved: 0 };
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const r = sheet.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: UI.view.s, tx: UI.view.tx, ty: UI.view.ty, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top };
        drag = null;
        clearTimeout(tapTimer); lastTap = null;
      }
    });
    sheet.addEventListener('pointermove', (e) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) {
        // zoom about the point between the fingers, and follow it as they move
        const [a, b] = [...ptrs.values()];
        const r = sheet.getBoundingClientRect();
        const v = UI.view;
        const ns = Math.max(1, Math.min(3.5, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        const k = ns / pinch.s;
        v.s = ns;
        v.tx = (a.x + b.x) / 2 - r.left - (pinch.mx - pinch.tx) * k;
        v.ty = (a.y + b.y) / 2 - r.top - (pinch.my - pinch.ty) * k;
        clampView(); applyView();
        $('hint').style.opacity = 0;
        return;
      }
      if (drag && ptrs.size === 1) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
        if (drag.moved > 4) {
          $('map').classList.add('dragging');
          UI.view.tx = drag.tx + dx; UI.view.ty = drag.ty + dy;
          clampView(); applyView();
          $('tip').hidden = true;
        }
        return;
      }
      if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const wasDrag = drag && drag.moved > 4;
      ptrs.delete(e.pointerId);
      $('map').classList.remove('dragging');
      if (pinch && ptrs.size === 1) {
        // the finger left on the glass carries on dragging, but is not a tap
        const [a] = [...ptrs.values()];
        drag = { x: a.x, y: a.y, tx: UI.view.tx, ty: UI.view.ty, moved: 99 };
        pinch = null;
        return;
      }
      if (ptrs.size < 2) pinch = null;
      if (drag && !wasDrag && e.type === 'pointerup') {
        if (e.pointerType === 'mouse') clickAt(e.clientX, e.clientY, false);
        else tapAt(e.clientX, e.clientY);
      }
      drag = null;
    };
    // a tap waits a moment in case a second one makes it a double tap, which zooms
    const tapAt = (x, y) => {
      const now = performance.now();
      if (lastTap && now - lastTap.t < 300 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) {
        clearTimeout(tapTimer); lastTap = null;
        if (!UI.world || UI.drawing) return;
        const r = sheet.getBoundingClientRect();
        if (UI.view.s >= 3.4) layoutMap(true); else zoomAt(x - r.left, y - r.top, 2);
        $('hint').style.opacity = 0;
        return;
      }
      lastTap = { t: now, x, y };
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { lastTap = null; clickAt(x, y, true); }, UI.drawing ? 0 : 260);
    };
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
    sheet.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
    sheet.addEventListener('dblclick', (e) => { if (lastType !== 'mouse') return; const r = sheet.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 2); });
    sheet.addEventListener('contextmenu', (e) => { if (lastType !== 'mouse') e.preventDefault(); });
    UI.showTouchTip = (x, y) => {
      hoverAt(x, y, true);
      clearTimeout(tipTimer);
      tipTimer = setTimeout(hideTip, 3200);
    };
    $('zoomIn').addEventListener('click', () => zoomAt(UI.fit.bw / 2, UI.fit.bh / 2, 1.5));
    $('zoomOut').addEventListener('click', () => zoomAt(UI.fit.bw / 2, UI.fit.bh / 2, 1 / 1.5));
    $('zoomFit').addEventListener('click', () => layoutMap(true));

    // the ribbon
    const tl = $('timeline');
    let scrub = false;
    let tlHide = null;
    // what the book says about the years under the pointer
    const tlTipAt = (e) => {
      clearTimeout(tlHide);
      const yy = timelineYear(e.clientX);
      const near = UI.world.chronicle.entries.filter((en) => en.y >= 0 && Math.abs(en.y - yy) <= Math.max(2, UI.world.years / 220) && !['hand', 'hand-end'].includes(en.type)).sort((a, b) => b.w - a.w)[0];
      const tip = $('tlTip');
      const r = tl.getBoundingClientRect();
      tip.style.left = Math.max(120, Math.min(r.width - 120, e.clientX - r.left)) + 'px';
      const txt = near ? near.html.replace(/<[^>]+>/g, '') : '';
      tip.innerHTML = `<b>Year ${near ? near.y : yy}</b>${txt ? ' &middot; ' + esc(txt.length > 110 ? txt.slice(0, 108) + '...' : txt) : ''}`;
      tip.hidden = false;
    };
    tl.addEventListener('pointerdown', (e) => {
      if (!UI.world || UI.drawing) return;
      scrub = true; tl.setPointerCapture(e.pointerId); pause(); UI.t = timelineYear(e.clientX); setYear(UI.t, false);
      if (e.pointerType !== 'mouse') tlTipAt(e);
    });
    tl.addEventListener('pointermove', (e) => {
      if (!UI.world) return;
      if (scrub) { UI.t = timelineYear(e.clientX); setYear(UI.t, false); }
      tlTipAt(e);
    });
    tl.addEventListener('pointerleave', (e) => { clearTimeout(tlHide); tlHide = setTimeout(() => { $('tlTip').hidden = true; }, e.pointerType === 'mouse' ? 0 : 1600); });
    tl.addEventListener('pointerup', () => { scrub = false; });
    tl.addEventListener('pointercancel', () => { scrub = false; $('tlTip').hidden = true; });

    // a year back or forward, held down to keep going
    for (const [id, d] of [['stepBack', -1], ['stepFwd', 1]]) {
      const b = $(id);
      let rep = null;
      const stop = () => { clearTimeout(rep); rep = null; };
      const step = () => { if (!UI.world || UI.drawing) return; pause(); UI.t = UI.year + d; setYear(UI.t, false); };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        stop(); step();
        const again = (ms) => { rep = setTimeout(() => { step(); again(Math.max(40, ms * 0.8)); }, ms); };
        again(420);
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter') step(); });
    }

    if (window.ResizeObserver) {
      new ResizeObserver(() => layoutMap(false)).observe(sheet);
      new ResizeObserver(() => { if (UI.world) buildTimeline(); }).observe($('timeline'));
    } else window.addEventListener('resize', () => { layoutMap(false); if (UI.world) buildTimeline(); });
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') { $('appendix').hidden = true; $('card').hidden = true; UI.cardFor = null; return; }
      if (!UI.world) return;
      if (e.key === ' ') { e.preventDefault(); if (UI.drawing) { finishDrawing(); return; } UI.playing ? pause() : play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); pause(); UI.t = UI.year + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 25 : 1); setYear(UI.t, false); }
      else if (e.key === 'Home') { pause(); UI.t = 0; setYear(0, false); }
      else if (e.key === 'End') { pause(); UI.t = UI.world.years; setYear(UI.t, false); }
      else if (e.key === 'a' || e.key === 'A') showAppendix();
      else if (e.key === 'm' || e.key === 'M') $('soundBtn').click();
      else if (e.key === 's' || e.key === 'S') $('scrapeBtn').click();
    });
    window.addEventListener('hashchange', () => {
      const h = readHash();
      if (h && (!UI.world || h.w.toLowerCase() !== UI.world.seed.toLowerCase())) generate(h.w, h.y);
    });
  }

  function clickAt(clientX, clientY, touch) {
    if (!UI.world) return;
    if (UI.drawing) { finishDrawing(); return; }
    const [px, py] = toCanvas(clientX, clientY);
    const hit = P.Political.pick(UI.st, UI.year, px, py, pickRad(touch));
    if (!hit) return;
    if (touch && hit.kind !== 'realm') UI.showTouchTip(clientX, clientY);
    if (hit.kind === 'settlement') showSettlement(hit.id);
    else if (hit.kind === 'realm') showPolity(hit.id);
    else if (hit.kind === 'battle') { pause(); UI.t = hit.battle.year; setYear(UI.t, false); }
  }

  function readHash() {
    const m = location.hash.match(/w=([^&]+)/);
    if (!m) return null;
    const y = location.hash.match(/y=(\d+)/);
    return { w: decodeURIComponent(m[1]), y: y ? +y[1] : null };
  }

  async function boot() {
    textures();
    if (TOUCH) $('hint').textContent = 'Pinch to look closer. Drag to move. Tap a town to read its history.';
    wire();
    await fonts();
    const h = readHash();
    if (h) generate(h.w, h.y);
    // on a tablet, focusing the field would throw the keyboard over the page
    else { $('landing').hidden = false; if (!TOUCH) setTimeout(() => $('landingInput').focus(), 50); }
    requestAnimationFrame(loop);
  }

  boot();
})();
