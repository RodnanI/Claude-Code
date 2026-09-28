/* Statistics: headline numbers, speed and accuracy trends, practice per day, and a per-key heatmap. */

Screens.stats = {
  render() {
    const c = this.course = App.course, prog = c.prog;
    this.mode = 'errors';
    const best = Math.max(0, ...Object.values(prog.tests));
    const recent = Stats.recentSpeed(prog);
    const hist = prog.hist.slice(-60);
    this.hist = hist;
    this.speedEl = h('div', { class: 'chart' });
    this.accEl = h('div', { class: 'chart short' });
    this.daysEl = h('div', { class: 'chart short' });
    this.kbWrap = h('div', { class: 'kbwrap small' });
    this.heatTitle = h('div', { class: 'eyebrow' });
    this.lists = h('div', { class: 'lists' });
    return h('div', null,
      h('header', { class: 'bar' }, h('div', { class: 'bar-l' }, h('div', { class: 'bar-title' }, t('statsTitle')),
        h('div', { class: 'bar-sub' }, `${t('course')} · ${t('layoutName')}`))),
      h('main', { class: 'stats' },
        h('div', { class: 'metrics wide' },
          metric(fmtDuration(Stats.totalMs(prog)), t('st_total')),
          metric(fmtDuration(Stats.today(prog)), t('st_today')),
          metric(String(Stats.streak(prog)), t('st_streak')),
          metric(`${c.passedCount()} / ${c.lessons.length}`, t('st_passed')),
          metric(recent ? fmtSpeed(recent, false) : '–', `${t('st_recent')} (${speedUnit()})`),
          metric(best ? fmtSpeed(best, false) : '–', `${t('st_bestTest')} (${speedUnit()})`)),
        hist.length < 2 ? h('p', { class: 'muted empty' }, t('noData')) : h('div', { class: 'charts' },
          h('figure', null, h('figcaption', null, t('chartSpeed', { n: hist.length })), this.speedEl),
          h('div', { class: 'charts-row' },
            h('figure', null, h('figcaption', null, t('chartAcc')), this.accEl),
            h('figure', null, h('figcaption', null, t('chartDays')), this.daysEl))),
        h('div', { class: 'heat-row' }, h('div', { class: 'heat-kb' }, this.heatTitle, this.kbWrap), this.lists)),
      hintBar([['← →', t('kToggle')], ['Esc', t('kBack')]]));
  },

  mounted() {
    KB.mount(this.kbWrap, true);
    KB.scope(this.course.learnedNow(), []);
    this.drawHeat();
    if (this.hist.length >= 2) this.drawCharts();
  },

  leave() { KB.heat(null); },

  onResize() { if (this.hist.length >= 2) this.drawCharts(); },

  drawCharts() {
    const H = this.hist, S = v => +fmtSpeed(v, false);
    const sp = H.map(x => S(x[2]));
    const top = Math.max(10, ...sp);
    lineChart(this.speedEl, sp, { min: 0, max: Math.ceil(top / 10) * 10 + (top % 10 > 7 ? 10 : 0), fmt: v => `${v} ${speedUnit()}`, tip: i => t('s_' + H[i][1]) });
    const ac = H.map(x => x[3]);
    lineChart(this.accEl, ac, { min: Math.min(80, Math.floor(Math.min(...ac) / 5) * 5), max: 100, fmt: v => fmtAcc(v), ref: 94, tip: i => t('s_' + H[i][1]) });
    const days = [];
    for (let i = 20; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const rec = this.course.prog.days[dayKey(d)];
      days.push({ label: d.toLocaleDateString(LANG === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' }), v: rec ? Math.round(rec.ms / 60000) : 0 });
    }
    barChart(this.daysEl, days, Settings.get('goal'));
  },

  drawHeat() {
    const c = this.course, per = Stats.perCode(c);
    const vals = {};
    const known = Object.values(per).filter(o => o.n >= 8 && o.ms).map(o => o.ms).sort((a, b) => a - b);
    const med = known.length ? known[known.length >> 1] : 0;
    for (const code in per) {
      const o = per[code];
      if (o.n < 8) continue;
      vals[code] = this.mode === 'errors' ? o.er / 0.15 : med && o.ms ? (o.ms / med - 0.8) / 1.2 : 0;
    }
    KB.heat(vals, code => {
      const o = per[code];
      if (!o) return '';
      return this.mode === 'errors' ? `${Math.round(o.er * 100)}%` : `${Math.round(o.ms)} ms`;
    });
    this.heatTitle.textContent = t(this.mode === 'errors' ? 'heatErrors' : 'heatSpeed');

    const w = Stats.weak(c, c.learnedNow());
    const letters = Object.keys(w.weights).sort((a, b) => w.weights[b] - w.weights[a]).slice(0, 6);
    const conf = Stats.topConfusions(c.prog);
    const prog = c.prog;
    put(this.lists,
      h('div', null, h('div', { class: 'eyebrow' }, t('weakest')),
        letters.length ? letters.map(ch => {
          const k = prog.keys[ch];
          return h('div', { class: 'li' }, h('span', { class: 'cap' }, keyLabel(ch)),
            h('span', null, k ? `${Math.round(k.er * 100)}% ${t('errorsLbl')} · ${Math.round(k.ms || 0)} ms` : '–'));
        }) : h('p', { class: 'muted' }, t('noData'))),
      h('div', null, h('div', { class: 'eyebrow' }, t('mixups')),
        conf.length ? conf.map(x => h('div', { class: 'li' }, h('span', { class: 'cap' }, keyLabel(x.exp)), h('span', { class: 'arrow' }, '→'),
          h('span', { class: 'cap wrong' }, keyLabel(x.got)), h('span', null, `${x.c}×`))) : h('p', { class: 'muted' }, t('noData'))));
  },

  onKey(e) {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') { this.mode = this.mode === 'errors' ? 'speed' : 'errors'; this.drawHeat(); }
    else if (k === 'Escape' || k === 'Enter' || k === 'Backspace') App.go('home');
    return true;
  }
};

/* ---- minimal SVG charts: one axis each, recessive grid, ink-colored marks, hover readout ---- */

function chartFrame(el) {
  const W = Math.max(200, el.clientWidth), H = Math.max(80, el.clientHeight);
  const s = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  const tip = h('div', { class: 'ctip hidden' });
  el.replaceChildren(s, tip);
  return { W, H, s, tip };
}

function lineChart(el, vals, o) {
  const { W, H, s, tip } = chartFrame(el);
  const P = { l: 40, r: 44, t: 10, b: 10 };
  const x = i => P.l + (vals.length < 2 ? 0 : (i * (W - P.l - P.r)) / (vals.length - 1));
  const y = v => P.t + (1 - (v - o.min) / (o.max - o.min || 1)) * (H - P.t - P.b);
  const ticks = [o.min, (o.min + o.max) / 2, o.max];
  for (const v of ticks) {
    s.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), class: 'grid' }));
    s.append(svg('text', { x: P.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, String(Math.round(v))));
  }
  if (o.ref != null) s.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(o.ref), y2: y(o.ref), class: 'ref' }));
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  s.append(svg('path', { d, class: 'series' }));
  const li = vals.length - 1;
  s.append(svg('circle', { cx: x(li), cy: y(vals[li]), r: 4, class: 'dot' }));
  s.append(svg('text', { x: x(li) + 8, y: y(vals[li]) + 4, class: 'val' }, String(Math.round(vals[li]))));
  const cross = svg('line', { y1: P.t, y2: H - P.b, class: 'cross hidden' });
  const hov = svg('circle', { r: 4, class: 'dot hidden' });
  s.append(cross, hov);
  s.addEventListener('mousemove', ev => {
    const r = s.getBoundingClientRect();
    const i = clamp(Math.round(((ev.clientX - r.left - P.l) / (W - P.l - P.r)) * li), 0, li);
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
    hov.setAttribute('cx', x(i)); hov.setAttribute('cy', y(vals[i]));
    cross.classList.remove('hidden'); hov.classList.remove('hidden');
    tip.textContent = `${o.fmt(vals[i])}  ·  ${o.tip(i)}`;
    tip.style.left = clamp(x(i) - 60, 0, W - 140) + 'px';
    tip.classList.remove('hidden');
  });
  s.addEventListener('mouseleave', () => { cross.classList.add('hidden'); hov.classList.add('hidden'); tip.classList.add('hidden'); });
}

function barChart(el, items, goal) {
  const { W, H, s, tip } = chartFrame(el);
  const P = { l: 40, r: 10, t: 10, b: 18 };
  const max = Math.max(goal, ...items.map(d => d.v), 10);
  const bw = (W - P.l - P.r) / items.length;
  const y = v => P.t + (1 - v / max) * (H - P.t - P.b);
  for (const v of [0, max]) {
    s.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), class: 'grid' }));
    s.append(svg('text', { x: P.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, String(Math.round(v))));
  }
  s.append(svg('line', { x1: P.l, x2: W - P.r, y1: y(goal), y2: y(goal), class: 'ref' }));
  items.forEach((d, i) => {
    const x0 = P.l + i * bw + 1, w = Math.max(2, bw - 2), top = y(d.v), base = y(0);
    const r = Math.min(4, w / 2, base - top);
    if (d.v > 0) s.append(svg('path', {
      class: 'bar' + (i === items.length - 1 ? ' today' : ''),
      d: `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${base}Z`
    }));
    const hit = svg('rect', { x: x0 - 1, y: P.t, width: bw, height: H - P.t - P.b, class: 'hit' });
    hit.addEventListener('mouseenter', () => {
      tip.textContent = `${d.label}  ·  ${d.v} min`;
      tip.style.left = clamp(x0 - 50, 0, W - 120) + 'px';
      tip.classList.remove('hidden');
    });
    hit.addEventListener('mouseleave', () => tip.classList.add('hidden'));
    s.append(hit);
  });
  s.append(svg('text', { x: P.l, y: H - 3, class: 'axis' }, items[0].label));
  s.append(svg('text', { x: W - P.r, y: H - 3, 'text-anchor': 'end', class: 'axis' }, items[items.length - 1].label));
}
