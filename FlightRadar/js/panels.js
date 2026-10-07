/* SQUAWK panels: layers, filters, list, stats, alerts, watchlist, settings */
(function () {
  'use strict';
  const SQ = window.SQ, S = SQ.S, U = SQ.u, G = SQ.geo, F = SQ.fmt, T = SQ.tracker, $ = SQ.$, $$ = SQ.$$;
  const P = (SQ.panels = SQ.panels || {});
  const E = F.esc;

  /* ---------------- control builders (delegated handlers below) ---------------- */
  const on = (path) => !!SQ.get(path);
  const tog = (path, label, hint) => `<div class="row"><label>${label}${hint ? '<span class="hint">' + hint + '</span>' : ''}</label><button class="tog ${on(path) ? 'on' : ''}" data-tog="${path}" role="switch" aria-checked="${on(path)}" aria-label="${label}"></button></div>`;
  const seg = (path, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${SQ.get(path) === v ? 'on' : ''}" data-seg="${path}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const sec = (title, html, small) => `<div class="sec"><h3>${title}${small ? '<small>' + small + '</small>' : ''}</h3>${html}</div>`;
  function delegate(body) {
    body.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tog],[data-seg],[data-act],[data-sel],[data-filter]');
      if (!t) return;
      if (t.dataset.tog) { SQ.set(t.dataset.tog, !SQ.get(t.dataset.tog)); }
      else if (t.dataset.seg) { let v = t.dataset.v; if (/^\d+$/.test(v)) v = +v; SQ.set(t.dataset.seg, v); }
      else if (t.dataset.sel) { const ac = T.get(t.dataset.sel); if (ac) { T.select(ac.hex, { from: 'panel' }); SQ.map.flyToAc(ac); if (SQ.isMobile()) SQ.ui.close(); } }
      else if (t.dataset.filter) { setFilter({ text: t.dataset.filter }); SQ.ui.toast('Filter: <b>' + E(t.dataset.filter) + '</b>', '', { label: 'Clear', fn: () => setFilter({ text: '' }) }); }
      else if (t.dataset.act && ACTS[t.dataset.act]) ACTS[t.dataset.act](t, e);
    });
  }
  const setFilter = (patch) => SQ.set('filters', Object.assign({}, S.filters, patch));
  const ACTS = {};
  SQ.on('setting', (path) => {
    const p = SQ.ui.panel;
    if (!p || ['filters', 'home', 'watch', 'exaggerate', 'iconScale', 'corsProxy'].includes(path)) return;
    if (['layers', 'settings'].includes(p)) SQ.ui.rerender();
  });

  /* ---------------- layers ---------------- */
  P.layers = {
    title: 'Layers',
    render(b) {
      const st = SQ.map.styleId;
      b.innerHTML =
        sec('Map', `<div class="styles">${[['scope', 'Scope'], ['chart', 'Chart'], ['satellite', 'Satellite']].map(([id, l]) => `<button class="${st === id ? 'on' : ''}" data-act="style" data-v="${id}"><i class="sw-${id}"></i>${l}</button>`).join('')}</div>
          ${SQ.map.offline ? '<p class="small muted">Tile server unreachable, offline basemap active. <a href="#" data-act="style" data-v="scope">Retry tiles</a></p>' : ''}`) +
        sec('View', tog('view3d', '3D airspace', 'Aircraft at true altitude with ground stalks') +
          (S.view3d ? `<div class="row"><label>Vertical exaggeration</label><span class="mono">${S.exaggerate}x</span></div><input class="one" type="range" min="1" max="10" step="1" value="${S.exaggerate}" data-range="exaggerate">` : '') +
          tog('globe', 'Globe', 'Spherical projection when zoomed out') + tog('scope', 'Radar scope', 'Rotating sweep, blips paint on each pass')) +
        sec('Overlays', tog('layers.airports', 'Airports') + tog('layers.weather', 'Weather radar', 'RainViewer, refreshed every 10 min') + tog('layers.night', 'Day and night', 'Live solar terminator with twilight bands') +
          tog('layers.relief', 'Terrain relief') + tog('layers.rings', 'Range rings', 'Around your location') + tog('layers.density', 'Traffic density', 'Heatmap at low zoom') +
          tog('layers.wind', 'Winds aloft', 'Vector field from aircraft-reported winds') + tog('layers.coverage', 'Coverage zones', 'Where the feed is polling, with refresh pulses')) +
        sec('Aircraft', `<div class="row"><label>Color by</label></div>${seg('colorMode', [['altitude', 'Alt'], ['speed', 'Speed'], ['vrate', 'Climb'], ['class', 'Class'], ['mono', 'Mono']])}
          <div class="row" style="margin-top:8px"><label>Labels</label></div>${seg('labels', [['auto', 'Auto'], ['on', 'All'], ['off', 'Off']])}
          <div class="row" style="margin-top:8px"><label>Trails</label></div>${seg('trails', [['selected', 'Selected'], ['all', 'All'], ['off', 'Off']])}
          <div class="row" style="margin-top:8px"><label>Icon size</label><span class="mono">${Math.round(S.iconScale * 100)}%</span></div><input class="one" type="range" min="0.7" max="1.6" step="0.05" value="${S.iconScale}" data-range="iconScale">`);
    }
  };
  ACTS.style = (t, e) => { e.preventDefault(); SQ.set('style', t.dataset.v); SQ.map.setStyle(t.dataset.v); setTimeout(() => SQ.ui.rerender(), 50); };

  /* ---------------- filters ---------------- */
  const CLS = [['airliner', 'Airliners'], ['regional', 'Regional'], ['bizjet', 'Business jets'], ['ga', 'Light aircraft'], ['heli', 'Helicopters'], ['mil', 'Military'], ['special', 'Gliders, balloons, drones'], ['gnd', 'Ground vehicles'], ['unknown', 'Unknown']];
  const PRESETS = [['Military only', { cls: { mil: true } }], ['Helicopters', { cls: { heli: true } }], ['Low and slow', { altMax: 5000, spdMax: 180 }], ['Cruising', { altMin: 28000 }],
    ['Heavies', { text: 'A388,B748,B744,B77*,B78*,A35*,A33*,A34*,B76*,A124,C17,C5M' }], ['Emergencies', { squawk: '7' }]];
  function dual(id, min, max, step, a, b, fmt) {
    return `<div class="dual" data-dual="${id}"><div class="track"></div><div class="fill"></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${a}" data-k="lo" aria-label="${id} minimum"><input type="range" min="${min}" max="${max}" step="${step}" value="${b}" data-k="hi" aria-label="${id} maximum"></div>
      <div class="rangev"><span data-v="lo">${fmt(a)}</span><span data-v="hi">${fmt(b, true)}</span></div>`;
  }
  function paintDual(el) {
    const [lo, hi] = el.querySelectorAll('input'), min = +lo.min, max = +lo.max;
    const fill = el.querySelector('.fill');
    const a = ((+lo.value - min) / (max - min)) * 100, b = ((+hi.value - min) / (max - min)) * 100;
    fill.style.left = `calc(${a}% + ${7 - a * 0.14}px)`;
    fill.style.width = `calc(${b - a}% - ${(b - a) * 0.14}px)`;
  }
  const altF = (v, top) => (top && v >= 50000 ? 'No limit' : F.alt(v));
  const spdF = (v, top) => (top && v >= 800 ? 'No limit' : F.spd(v));
  P.filters = {
    title: 'Filters',
    render(b) {
      const f = S.filters;
      const counts = {};
      for (const ac of T.list.values()) counts[ac.cls] = (counts[ac.cls] || 0) + 1;
      b.innerHTML =
        `<div class="sec"><div class="row"><span class="muted" id="fCount"></span><button class="btn" data-act="freset">Reset</button></div></div>` +
        sec('Search filter', `<input class="field" id="fText" placeholder="BAW*, A388, N12*, DLH, mil" value="${E(f.text)}" spellcheck="false" autocapitalize="characters"><p class="small muted">Callsign, registration, type, operator code or ICAO hex. Comma separated, * wildcards.</p>`) +
        sec('Altitude', dual('alt', 0, 50000, 500, f.altMin, f.altMax, altF)) +
        sec('Ground speed', dual('spd', 0, 800, 10, f.spdMin, f.spdMax, spdF)) +
        sec('Aircraft class', `<div class="chips">${CLS.map(([k, l]) => `<button class="chip ${f.cls[k] !== false ? 'on' : ''}" data-act="fcls" data-k="${k}"><i style="background:${SQ.color.group(k).hex}"></i>${l} <span class="muted">${counts[k] || 0}</span></button>`).join('')}</div>`) +
        sec('More', tog('filters.hideGround', 'Hide aircraft on ground') + `<div class="row"><label>Squawk starts with</label><input class="field" id="fSq" style="width:90px" maxlength="4" inputmode="numeric" value="${E(f.squawk)}"></div>`) +
        sec('Presets', `<div class="chips">${PRESETS.map(([l], i) => `<button class="chip" data-act="fpreset" data-i="${i}">${l}</button>`).join('')}</div>`);
      $$('.dual', b).forEach((d) => {
        paintDual(d);
        d.addEventListener('input', (e) => {
          const [lo, hi] = d.querySelectorAll('input');
          if (+lo.value > +hi.value) { if (e.target === lo) lo.value = hi.value; else hi.value = lo.value; }
          paintDual(d);
          const id = d.dataset.dual, fmt = id === 'alt' ? altF : spdF;
          d.nextElementSibling.querySelector('[data-v=lo]').textContent = fmt(+lo.value);
          d.nextElementSibling.querySelector('[data-v=hi]').textContent = fmt(+hi.value, true);
          setFilter(id === 'alt' ? { altMin: +lo.value, altMax: +hi.value } : { spdMin: +lo.value, spdMax: +hi.value });
        });
      });
      $('#fText', b).addEventListener('input', U.debounce((e) => setFilter({ text: e.target.value.trim() }), 250));
      $('#fSq', b).addEventListener('input', (e) => setFilter({ squawk: e.target.value.replace(/\D/g, '') }));
      this.update(b);
    },
    update(b) {
      let n = 0;
      for (const ac of T.list.values()) if (T.passes(ac)) n++;
      const el = $('#fCount', b);
      if (el) el.innerHTML = `Showing <b class="mono">${F.n(n)}</b> of ${F.n(T.list.size)} tracked`;
    }
  };
  ACTS.freset = () => { SQ.set('filters', JSON.parse(JSON.stringify(SQ.DEFAULTS.filters))); SQ.ui.rerender(); };
  ACTS.fcls = (t) => { const cls = Object.assign({}, S.filters.cls); cls[t.dataset.k] = cls[t.dataset.k] === false; setFilter({ cls }); t.classList.toggle('on', cls[t.dataset.k] !== false); };
  ACTS.fpreset = (t) => {
    const p = PRESETS[+t.dataset.i][1], base = JSON.parse(JSON.stringify(SQ.DEFAULTS.filters));
    if (p.cls) { for (const k in base.cls) base.cls[k] = false; Object.assign(base.cls, p.cls); }
    SQ.set('filters', Object.assign(base, p, { cls: base.cls }));
    SQ.ui.rerender();
  };
  SQ.on('setting:filters', () => { if (SQ.ui.panel === 'filters') P.filters.update($('#dBody')); });

  /* ---------------- list (virtualized) ---------------- */
  let lsort = { k: 'dist', dir: 1 }, lrows = [], lbody = null;
  const ROW = 38;
  function listData() {
    const c = SQ.map.map.getCenter(), h = S.home && S.home.src === 'gps' ? S.home : { lat: c.lat, lon: c.lng };
    const rows = T.visible.map((ac) => ({ ac, d: G.distKm(h.lat, h.lon, ac.rlat, ac.rlon) }));
    const k = lsort.k, dir = lsort.dir;
    rows.sort((a, b) => {
      let va, vb;
      if (k === 'cs') { va = a.ac.flight || a.ac.hex; vb = b.ac.flight || b.ac.hex; return va.localeCompare(vb) * dir; }
      if (k === 'alt') { va = a.ac.gnd ? -1 : a.ac.ralt || 0; vb = b.ac.gnd ? -1 : b.ac.ralt || 0; }
      else if (k === 'spd') { va = a.ac.gs || 0; vb = b.ac.gs || 0; }
      else { va = a.d; vb = b.d; }
      return (va - vb) * dir;
    });
    return rows;
  }
  function paintList() {
    if (!lbody) return;
    const sc = $('#dBody'), wrap = $('.vlist', lbody);
    if (!wrap) return;
    wrap.style.height = lrows.length * ROW + 'px';
    const top = Math.max(0, sc.scrollTop - wrap.offsetTop), first = Math.max(0, Math.floor(top / ROW) - 6), last = Math.min(lrows.length, first + Math.ceil(sc.clientHeight / ROW) + 14);
    let html = '';
    for (let i = first; i < last; i++) {
      const { ac, d } = lrows[i];
      const col = SQ.color.forAc(ac, S.colorMode).rgb;
      html += `<button class="lrow" style="position:absolute;left:0;right:0;top:${i * ROW}px" data-sel="${ac.hex}">
        <img src="${iconUrl(ac, col)}" alt=""><span><b>${E(ac.flight || ac.reg || ac.hex.toUpperCase())}</b><small>${E([ac.type, ac.op ? ac.op.name : ac.ownOp].filter(Boolean).join(' · ') || '--')}</small></span>
        <span class="n">${F.altShort(ac.ralt, ac.gnd) || '--'}</span><span class="n">${ac.gs != null ? Math.round(ac.gs) : '--'}</span><span class="n">${F.distP(d / 1.852)[0]}</span></button>`;
    }
    wrap.innerHTML = html;
  }
  const iconCache = new Map();
  function iconUrl(ac, col) {
    const k = ac.shape + col.join(',');
    let u = iconCache.get(k);
    if (!u) { u = SQ.icons.dataUrl(ac.shape, col.map(Math.round), 20); iconCache.set(k, u); if (iconCache.size > 400) iconCache.clear(); }
    return u;
  }
  P.list = {
    title: 'In view',
    render(b) {
      lbody = b;
      const H = (k, l) => `<button data-act="lsort" data-k="${k}" class="${lsort.k === k ? 'on' : ''}">${l}${lsort.k === k ? (lsort.dir > 0 ? ' ↑' : ' ↓') : ''}</button>`;
      b.innerHTML = `<div class="lhead"><span></span>${H('cs', 'Flight')}${H('alt', 'Alt')}${H('spd', 'Spd')}${H('dist', S.home && S.home.src === 'gps' ? 'You' : 'Ctr')}</div><div class="vlist"></div><p class="small muted" id="lEmpty"></p>`;
      $('#dBody').onscroll = paintList;
      this.update(b);
    },
    update(b) {
      lrows = listData();
      $('#lEmpty', b).textContent = lrows.length ? lrows.length + ' aircraft in view' + (T.filterCount() ? ' (filtered)' : '') : 'No aircraft in view. Zoom out or relax filters.';
      paintList();
    },
    close() { $('#dBody').onscroll = null; lbody = null; }
  };
  ACTS.lsort = (t) => { const k = t.dataset.k; lsort = lsort.k === k ? { k, dir: -lsort.dir } : { k, dir: k === 'alt' || k === 'spd' ? -1 : 1 }; SQ.ui.rerender(); };

  /* ---------------- stats ---------------- */
  let histHover = null, sparkHover = null;
  function topN(map, n) { return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n); }
  function barList(entries, total, filterKey) {
    if (!entries.length) return '<p class="muted small">No data yet.</p>';
    const max = entries[0][1];
    return '<div class="bars">' + entries.map(([k, v, label]) => `<button class="bar" ${filterKey ? 'data-filter="' + E(k) + '"' : ''} title="${filterKey ? 'Filter to ' + E(k) : ''}"><span>${E(label || k)}</span><b>${v}</b><i style="width:${((v / max) * 100).toFixed(1)}%"></i></button>`).join('') + '</div>';
  }
  function computeStats() {
    const v = T.visible, s = { n: v.length, air: 0, gnd: 0, mil: 0, em: 0, clb: 0, des: 0, altSum: 0, altN: 0, spdSum: 0, spdN: 0, ops: {}, types: {}, ctry: {}, groups: [0, 0, 0, 0, 0], hist: new Array(19).fill(0), rec: {} };
    const h = S.home && S.home.src === 'gps' ? S.home : null;
    const better = (key, ac, val, cmp) => { if (s.rec[key] == null || cmp(val, s.rec[key].v)) s.rec[key] = { ac, v: val }; };
    for (const ac of v) {
      if (ac.gnd) { s.gnd++; s.hist[0]++; } else {
        s.air++;
        if (ac.ralt != null) { s.altSum += ac.ralt; s.altN++; s.hist[Math.min(18, 1 + Math.floor(ac.ralt / 2500))]++; better('high', ac, ac.ralt, (a, b) => a > b); }
        if (ac.gs != null) { s.spdSum += ac.gs; s.spdN++; better('fast', ac, ac.gs, (a, b) => a > b); if (ac.gs > 40) better('slow', ac, ac.gs, (a, b) => a < b); }
        if (ac.vr > 500) { s.clb++; better('climb', ac, ac.vr, (a, b) => a > b); }
        if (ac.vr < -500) { s.des++; better('desc', ac, ac.vr, (a, b) => a < b); }
        if (h) better('near', ac, G.distKm(h.lat, h.lon, ac.rlat, ac.rlon), (a, b) => a < b);
      }
      if (ac.mil) s.mil++;
      if (ac.emergency) s.em++;
      if (ac.op) { const k = ac.op.icao; s.ops[k] = (s.ops[k] || 0) + 1; }
      if (ac.type) s.types[ac.type] = (s.types[ac.type] || 0) + 1;
      if (ac.country) s.ctry[ac.country.name] = (s.ctry[ac.country.name] || 0) + 1;
      s.groups[SQ.color.group(ac.cls).i]++;
    }
    return s;
  }
  P.stats = {
    title: 'Airspace analytics',
    render(b) {
      b.innerHTML = `<div class="sec"><div class="kpis" id="stK"></div></div>
        <div class="sec"><h3>Altitude distribution <small>aircraft in view</small></h3><canvas class="chart" id="stH" style="height:120px"></canvas></div>
        <div class="sec"><h3>Traffic in view <small>last hour, 10 s samples</small></h3><canvas class="chart" id="stS" style="height:74px"></canvas></div>
        <div class="sec"><h3>Fleet mix</h3><div id="stG"></div></div>
        <div class="sec"><h3>Records</h3><div id="stR"></div></div>
        <div class="sec"><h3>Top operators <small>tap to filter</small></h3><div id="stO"></div></div>
        <div class="sec"><h3>Top types <small>tap to filter</small></h3><div id="stT"></div></div>
        <div class="sec"><h3>Registration country</h3><div id="stC"></div></div>`;
      SQ.charts.barsHover($('#stH', b), (i) => { histHover = i; this.update(b, true); });
      SQ.charts.hover($('#stS', b), (x) => { sparkHover = x; this.update(b, true); });
      this.update(b);
    },
    update(b, chartsOnly) {
      const s = this._s && chartsOnly ? this._s : (this._s = computeStats());
      const altC = (i) => SQ.color.hex(i === 0 ? SQ.color.GROUND : SQ.color.alt((i - 0.5) * 2500));
      const metric = S.units === 'metric';
      const bins = s.hist.map((v, i) => ({ v, c: altC(i), label: i === 0 ? 'Ground' : metric ? Math.round((i - 1) * 762) + '-' + Math.round(i * 762) + ' m' : F.n((i - 1) * 2500) + '-' + F.n(i * 2500) + ' ft' }));
      bins[18].label = metric ? '13,000 m +' : '42,500 ft +';
      SQ.charts.bars($('#stH', b), { bins, hover: histHover, ticks: metric ? [[0, 'GND'], [5, '3k'], [9, '6k'], [13, '9k'], [19, '12k m']] : [[0, 'GND'], [5, '10k'], [9, '20k'], [13, '30k'], [19, '45k ft']] });
      const hist = T.history;
      SQ.charts.series($('#stS', b), { xs: hist.map((h) => h.t), ys: hist.map((h) => h.view), color: getComputedStyle(document.documentElement).getPropertyValue('--amber').trim(), fill: true, zero: true, yFmt: F.n, padL: 34, hoverX: sparkHover, tipFmt: (v, t) => v + ' aircraft · ' + F.local(new Date(t)), empty: 'First sample in a few seconds...' });
      if (chartsOnly) return;
      const avgA = s.altN ? s.altSum / s.altN : null, avgS = s.spdN ? s.spdSum / s.spdN : null;
      $('#stK', b).innerHTML = [[F.n(s.n), 'In view'], [F.n(s.air), 'Airborne'], [F.n(T.list.size), 'Tracked'], [avgA != null ? F.altShort(avgA) : '--', 'Avg alt'], [avgS != null ? F.spdP(avgS)[0] : '--', 'Avg ' + F.spdP(1)[1]],
        [F.n(s.mil), 'Military'], [F.n(s.clb), 'Climbing'], [F.n(s.des), 'Descending'], [F.n(s.em), 'Emergency', s.em ? 'hot' : '']].map(([v, l, c]) => `<div class="kpi ${c || ''}"><b>${v}</b><span>${l}</span></div>`).join('');
      const tot = s.groups.reduce((a, c) => a + c, 0) || 1, pal = document.documentElement.dataset.theme === 'light' ? SQ.color.GROUP_LIGHT : SQ.color.GROUP_DARK;
      $('#stG', b).innerHTML = `<div style="display:flex;gap:2px;height:12px;margin-bottom:8px">${s.groups.map((g, i) => (g ? `<i title="${SQ.color.GROUPS[i][1]}: ${g}" style="flex:${g};background:${pal[i]};border-radius:2px"></i>` : '')).join('')}</div>` +
        SQ.color.GROUPS.map((g, i) => `<div class="row" style="min-height:24px"><span style="display:flex;gap:8px;align-items:center"><i style="width:9px;height:9px;border-radius:2px;background:${pal[i]}"></i>${g[1]}</span><span class="mono small">${s.groups[i]} <span class="muted">${Math.round((s.groups[i] / tot) * 100)}%</span></span></div>`).join('');
      const R = s.rec, rec = (k, l, fmt) => (R[k] ? `<button class="rec" data-sel="${R[k].ac.hex}"><span>${l}</span><b>${E(R[k].ac.flight || R[k].ac.reg || R[k].ac.hex.toUpperCase())}</b><em>${fmt(R[k].v)}</em></button>` : '');
      $('#stR', b).innerHTML = (rec('high', 'Highest', (v) => F.alt(v)) + rec('fast', 'Fastest', (v) => F.spd(v)) + rec('slow', 'Slowest', (v) => F.spd(v)) + rec('climb', 'Best climb', (v) => F.vr(v)) + rec('desc', 'Steepest', (v) => F.vr(v)) + rec('near', 'Closest', (v) => F.dist(v / 1.852))) || '<p class="muted small">No airborne traffic in view.</p>';
      const ops = SQ.D.operators || {};
      $('#stO', b).innerHTML = barList(topN(s.ops, 8).map(([k, v]) => [k, v, (ops[k] ? ops[k][0] : k) + ' (' + k + ')']), s.n, true);
      $('#stT', b).innerHTML = barList(topN(s.types, 8).map(([k, v]) => { const ti = SQ.typeInfo(k); return [k, v, k + (ti ? ' · ' + F.title(ti.desc) : '')]; }), s.n, true);
      $('#stC', b).innerHTML = barList(topN(s.ctry, 6), s.n, false);
    }
  };

  /* ---------------- alerts ---------------- */
  P.alerts = {
    title: 'Alerts',
    render(b) {
      const live = Array.from(T.list.values()).filter((a) => a.emergency);
      const odd = T.visible.filter((a) => a.odd && !a.emergency).slice(0, 30);
      const item = (a, kind, text, sub) => `<button class="alert ${kind}" data-sel="${a.hex}"><i></i><span><b>${E(a.flight || a.reg || a.hex.toUpperCase())}</b> <span style="display:inline" class="muted">${E(a.type || '')}</span><span>${E(text)}</span></span><em>${sub || ''}</em></button>`;
      b.innerHTML =
        sec('Active emergencies', live.length ? live.map((a) => item(a, 'em', (SQ.ui.EM[a.emergency] || 'Emergency') + ' · squawk ' + (a.squawk || '----'), F.altShort(a.ralt, a.gnd))).join('') :
          `<p class="empty-note">No emergency squawks right now.${SQ.feed.active && SQ.feed.active !== 'sim' ? ' Worldwide 7500 / 7600 / 7700 sweep runs every 60 s.' : ''}</p>`, live.length + ' active') +
        sec('Interesting in view', odd.length ? odd.map((a) => item(a, '', a.odd, F.altShort(a.ralt, a.gnd))).join('') : '<p class="empty-note">Rare types, military, very high or very fast aircraft show up here.</p>') +
        sec('Military worldwide', tog('_wantMil', 'Track military aircraft worldwide', 'Polls the provider military feed every 90 s')) +
        sec('Log', SQ.alerts.length ? SQ.alerts.slice(0, 40).map((a) => `<button class="alert ${a.kind === 'em' ? 'em' : ''}" data-sel="${a.hex}"><i></i><span><b>${E(a.cs)}</b><span>${E(a.text)}</span></span><em>${F.local(new Date(a.t))}</em></button>`).join('') : '<p class="empty-note">Nothing logged this session.</p>');
    },
    update(b) { if (!b.contains(document.activeElement)) { const st = $('#dBody').scrollTop; this.render(b); $('#dBody').scrollTop = st; } }
  };
  Object.defineProperty(S, '_wantMil', { get: () => !!SQ.wantMil, set: (v) => { SQ.wantMil = v; }, enumerable: false, configurable: true });
  SQ.on('setting:_wantMil', () => { if (SQ.wantMil) { SQ.ui.toast('Military feed on. First sweep within a few seconds.'); SQ.feed.kick(); } SQ.ui.rerender(); });

  /* ---------------- watchlist ---------------- */
  P.watch = {
    title: 'Watchlist',
    render(b) {
      const w = S.watch || [];
      const toks = w.map((x) => [x, T.compileTokens(x)]);
      const matches = (tk) => Array.from(T.list.values()).filter((ac) => T.matches(ac, tk));
      b.innerHTML =
        sec('Add', `<div style="display:flex;gap:6px"><input class="field" id="wIn" placeholder="BAW15, G-XLEA, A388, 4CA*" spellcheck="false" autocapitalize="characters"><button class="btn pri" data-act="wadd">Add</button></div>
          <p class="small muted">Get alerted when a matching flight, registration, type or hex appears. Wildcards allowed.</p>
          <div class="chips">${['A388', 'B748', 'A124', 'C17', 'B52', 'A3ST', 'CONC', 'SR71'].filter((x) => !w.includes(x)).slice(0, 6).map((x) => `<button class="chip" data-act="wquick" data-v="${x}">+ ${x}</button>`).join('')}</div>`) +
        sec('Watching', w.length ? toks.map(([x, tk]) => { const m = matches(tk); return `<div class="row"><span><b class="mono">${E(x)}</b> ${m.length ? `<button class="chip on" data-sel="${m[0].hex}">${m.length} live: ${E(m[0].flight || m[0].reg || m[0].hex.toUpperCase())}</button>` : '<span class="muted small">not seen</span>'}</span><button class="ib" data-act="wdel" data-v="${E(x)}" aria-label="Remove"><svg><use href="#i-trash"/></svg></button></div>`; }).join('') : '<p class="empty-note">Nothing watched yet. Star an aircraft in its detail panel or add a pattern above.</p>', w.length + ' patterns') +
        sec('Notify me', tog('sound', 'Sound alerts') + tog('notify', 'Browser notifications', 'Only while the tab is in the background'));
      const inp = $('#wIn', b);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ACTS.wadd(); });
    },
    update(b) { if (!b.contains(document.activeElement)) this.render(b); }
  };
  ACTS.wadd = () => { const v = ($('#wIn').value || '').trim().toUpperCase(); if (!v) return; const w = (S.watch || []).slice(); v.split(/[,\s]+/).forEach((x) => { if (x && !w.includes(x)) w.push(x); }); SQ.set('watch', w); SQ.ui.rerender(); };
  ACTS.wquick = (t) => { SQ.set('watch', (S.watch || []).concat(t.dataset.v)); SQ.ui.rerender(); };
  ACTS.wdel = (t) => { SQ.set('watch', (S.watch || []).filter((x) => x !== t.dataset.v)); SQ.ui.rerender(); };
  SQ.on('setting:notify', async () => {
    if (S.notify && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { SQ.set('notify', false); SQ.ui.toast('Notifications blocked by the browser', 'warn'); }
    }
  });

  /* ---------------- settings ---------------- */
  P.settings = {
    title: 'Setup',
    render(b) {
      const f = SQ.feed, now = Date.now();
      const rows = Object.keys(f.PROVIDERS).filter((k) => k !== 'sim').map((k) => {
        const h = f.health[k], st = f.active === k ? (f.lastOk && now - f.lastOk < 20000 ? '<span style="color:var(--mint)">active</span>' : 'active') : h.cooldown > now ? '<span style="color:var(--red)">cooling ' + F.ago(h.cooldown - now) + '</span>' : h.ok ? 'ok' : 'standby';
        return `<div class="row" style="min-height:26px"><span>${f.PROVIDERS[k].name}</span><span class="mono small">${st}</span></div>`;
      }).join('');
      const home = S.home;
      b.innerHTML =
        sec('Data source', `${seg('provider', [['auto', 'Auto'], ['adsblol', 'adsb.lol'], ['airplaneslive', 'apl.live'], ['adsbfi', 'adsb.fi']])}
          <div style="height:6px"></div>${seg('provider', [['opensky', 'OpenSky'], ['sim', 'Simulation']])}
          <div style="margin-top:10px" id="provRows">${rows}</div>
          <p class="small muted">Auto tries each free network in order and fails over on errors or rate limits. Last error: <span class="mono">${E(f.lastErr || 'none')}</span></p>
          <div class="row"><label>Refresh</label></div>${seg('rate', [['fast', 'Fast'], ['normal', 'Normal'], ['eco', 'Eco']])}
          <div class="row" style="margin-top:8px"><label>CORS proxy <span class="hint">Optional. Prefix or template with {url}</span></label></div>
          <input class="field" id="sProxy" placeholder="https://your-proxy.example/?url={url}" value="${E(S.corsProxy)}" spellcheck="false">`, f.stats.ok + ' ok / ' + f.stats.fail + ' failed') +
        sec('Units', seg('units', [['aviation', 'ft kt nm'], ['metric', 'm km/h km'], ['imperial', 'ft mph mi']])) +
        sec('Location', `<div class="row"><span class="small">${home ? (home.src === 'gps' ? 'GPS: ' : 'Approx: ') + F.lat(home.lat) + ' ' + F.lon(home.lon) : 'Not set (using time zone guess)'}</span></div>
          <div style="display:flex;gap:6px"><button class="btn pri" data-act="locate"><svg><use href="#i-locate"/></svg>Use my location</button>${home ? '<button class="btn" data-act="unhome">Clear</button>' : ''}</div>`) +
        sec('Performance', `<div class="row"><label>Frame rate cap</label></div>${seg('fps', [[60, '60'], [30, '30'], [15, '15 (battery)']])}`) +
        sec('Intro', `${seg('intro', [['auto', 'Auto'], ['full', 'Full'], ['short', 'Short'], ['off', 'Off']])}<div style="margin-top:8px"><button class="btn" data-act="replay">Replay intro</button></div>`) +
        sec('Feedback', tog('sound', 'Interface sounds') + tog('notify', 'Browser notifications')) +
        sec('Data', `<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-act="clearcache"><svg><use href="#i-trash"/></svg>Clear lookup cache</button><button class="btn" data-act="reset">Reset settings</button></div>`) +
        sec('About', `<p class="small muted">SQUAWK ${SQ.version}. Free, keyless data: adsb.lol, airplanes.live, adsb.fi and OpenSky (ADS-B), adsbdb (routes, aircraft), Planespotters.net (photos), RainViewer (radar), OpenFreeMap / OpenMapTiles / OpenStreetMap (map), Esri (imagery), OurAirports and tar1090-db (reference data), Natural Earth (coastlines). Fonts: B612 by Airbus. Map engine: MapLibre GL JS.</p>`);
      $('#sProxy', b).addEventListener('change', (e) => SQ.set('corsProxy', e.target.value.trim()));
    },
    update(b) { const r = $('#provRows', b); if (r && !b.contains(document.activeElement)) { const st = $('#dBody').scrollTop; this.render(b); $('#dBody').scrollTop = st; } }
  };
  ACTS.locate = () => SQ.ui.locate();
  ACTS.unhome = () => { SQ.set('home', null); SQ.ui.rerender(); };
  ACTS.replay = () => { SQ.ui.close(); SQ.intro && SQ.intro.play(true); };
  ACTS.clearcache = () => { SQ.ls.del('cache'); SQ.ui.toast('Lookup cache cleared'); };
  ACTS.reset = () => { if (confirm('Reset all settings, watchlist and saved view?')) { ['settings', 'view', 'cache'].forEach(SQ.ls.del); location.hash = ''; location.reload(); } };
  SQ.on('setting:home', () => { if (SQ.ui.panel === 'settings') SQ.ui.rerender(); });

  SQ.panelsInit = () => delegate($('#dBody'));
  /* range sliders inside panels */
  document.addEventListener('input', (e) => { const r = e.target.closest && e.target.closest('[data-range]'); if (r) { SQ.set(r.dataset.range, +r.value); const lab = r.previousElementSibling && r.previousElementSibling.querySelector('.mono'); if (lab) lab.textContent = r.dataset.range === 'iconScale' ? Math.round(r.value * 100) + '%' : r.value + 'x'; } });
})();
