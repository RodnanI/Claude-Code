import { h, clear } from './dom.js';
import { KT } from '../aircraft/flight/model.js';
import { totalMass } from '../aircraft/base.js';
import { catalogBars } from '../aircraft/flight/performance.js';
import { windComponents } from '../aircraft/flight/takeoff.js';
import { makeBriefing } from '../game/briefing.js';
import { ASSIST_MODES, ASSIST_LABEL } from '../game/takeoff-assist.js';
import { silhouette } from '../aircraft/silhouette.js';
import { drawBlueprint } from './blueprint.js';
import { drawChart, pickStart, kindLabel, chartAspect } from './chart.js';

const MEMORY_KEY = 'flyhigh.hangar.v1';
const FT = 3.28084;
const RATING = ['', 'Docile', 'Easy', 'Demanding', 'Difficult', 'Unforgiving'];
const TIMES = [['Dawn', 6.5], ['Morning', 9.5], ['Noon', 12.5], ['Golden hour', 17.5], ['Dusk', 19.5], ['Night', 22.5]];
const VIEWS = [['orbit', 'Orbit'], ['front', 'Front'], ['side', 'Side'], ['back', 'Rear'], ['top', 'Top']];
const TABS = [['field', 'Airfield'], ['brief', 'Briefing'], ['conditions', 'Conditions']];

/** Specification plate for an aircraft, computed from its definition. */
export function planeFacts(spec, metric) {
  const W = totalMass(spec) * 9.81;
  const vs = Math.sqrt((2 * W) / (1.225 * spec.wing.area * spec.aero.CLmax));
  const spd = (ms) => (metric ? `${Math.round(ms * 3.6)} km/h` : `${Math.round(ms * KT)} kt`);
  const p = spec.propulsion;
  return [
    ['Power', p.type === 'prop' ? `${Math.round(p.power / 745.7)} hp` : `${Math.round(p.thrust / 1000)} kN, ${Math.round((p.thrust + (p.afterburner || 0)) / 1000)} kN afterburner`],
    ['Mass', `${Math.round(totalMass(spec))} kg`],
    ['Wingspan', `${spec.wing.span.toFixed(1)} m`],
    ['Stall speed', spd(vs)],
    ['Never exceed', spd(spec.limits.vne)],
    ['Load limit', `${spec.limits.maxG} G`],
    ['Landing gear', spec.gear.retractable ? 'Retractable tricycle' : spec.gear.wheels.length && spec.gear.wheels.some((w) => w.pos[0] < -2) ? 'Fixed tailwheel' : 'Fixed tricycle'],
    ['Weapons', spec.weapons.length ? `${spec.weapons.length} systems` : 'None'],
  ];
}

const fmtHour = (v) => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60) % 60).padStart(2, '0')}`;
const pad3 = (d) => String(((Math.round(d) % 360) + 360) % 360).padStart(3, '0');
const compass = (d) => ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west'][Math.round((((d % 360) + 360) % 360) / 45) % 8];

/** A row of mutually exclusive buttons. */
function segmented(options, value, onPick, cls = '') {
  const root = h('div', { class: 'seg ' + cls, role: 'radiogroup' });
  const set = (v) => { for (const b of root.children) b.classList.toggle('on', b.dataset.v === String(v)); };
  for (const [v, label, title] of options) root.append(h('button', { class: 'segbtn' + (String(v) === String(value) ? ' on' : ''), 'data-v': String(v), role: 'radio', title: title || null, onclick: () => { set(v); onPick(v); } }, label));
  root.set = set;
  return root;
}

/** The hangar: aircraft cards on the left, the airfield, briefing and conditions on the right, the aircraft in the middle. */
export class Hangar {
  constructor(app, root) {
    this.app = app; this.game = app.game; this.store = app.game.store; this.root = root;
    this.sel = app.sel;
    this.region = null; this.tab = 'field'; this.hover = null; this.hits = [];
    this.open_ = false;
    this._load();
    this._build();
    this.store.on('change', (k) => { if (this.open_ && ['windSpeed', 'windDir', 'turbulence', 'units', 'timeOfDay', 'cloudCover', 'takeoffAssist', 'challenge'].includes(k)) this._sync(k); });
    addEventListener('keydown', (e) => this._key(e));
    new ResizeObserver(() => { if (this.open_ && this.tab === 'field') this._drawChart(); }).observe(this.chartWrap);
  }

  // ------------------------------------------------------------------ selection memory
  _load() {
    const g = this.game;
    try {
      const m = JSON.parse((globalThis.localStorage && localStorage.getItem(MEMORY_KEY)) || 'null');
      if (m) {
        if (g.planes.some((p) => p.id === m.plane)) this.sel.plane = m.plane;
        if (g.starts.some((s) => s.id === m.start)) this.sel.start = m.start;
        const spec = g.planes.find((p) => p.id === this.sel.plane);
        this.sel.livery = spec.liveries.some((l) => l.id === m.livery) ? m.livery : 'default';
        this.sel.airborne = !!m.airborne;
        if (TABS.some((t) => t[0] === m.tab)) this.tab = m.tab;
      }
    } catch { /* no storage or bad data: keep the defaults */ }
  }
  _save() { try { localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...this.sel, tab: this.tab })); } catch { /* private mode */ } }

  get spec() { return this.game.planes.find((p) => p.id === this.sel.plane); }
  get start() { return this.game.starts.find((s) => s.id === this.sel.start) || this.game.starts[0]; }
  get metric() { return this.store.get('units') === 'metric'; }
  _dist(m) { return this.metric ? `${Math.round(m).toLocaleString('en-US')} m` : `${(Math.round((m * FT) / 10) * 10).toLocaleString('en-US')} ft`; }
  _spd(ms) { return this.metric ? `${Math.round(ms * 3.6)} km/h` : `${Math.round(ms * KT)} kt`; }

  // ------------------------------------------------------------------ build
  _build() {
    const g = this.game, root = this.root;
    this.list = h('div', { class: 'aircraft-list' });
    this.liveryField = h('div', { class: 'field' });
    this.stageBar = h('div', { class: 'stage-bar' });
    this.viewSeg = segmented(VIEWS.map(([v, l], i) => [v, `${l}`, `${i + 1}`]), 'orbit', (v) => g.viewPreset(v));
    this.stageBar.append(this.viewSeg);
    this.hint = h('div', { class: 'stage-hint' }, 'Drag orbit   Wheel zoom   Arrows choose   Enter fly');
    this.stage = h('div', { class: 'hangar-stage' }, this.stageBar, this.hint);
    this._stageEvents();

    this.tabs = h('div', { class: 'hr-tabs', role: 'tablist' }, TABS.map(([id, label]) => h('button', { class: 'hr-tab', 'data-t': id, role: 'tab', onclick: () => this._setTab(id) }, label)));
    this.fieldPane = h('div', { class: 'hr-pane', 'data-p': 'field' });
    this.briefPane = h('div', { class: 'hr-pane', 'data-p': 'brief' });
    this.condPane = h('div', { class: 'hr-pane', 'data-p': 'conditions' });
    this._buildField(); this._buildConditions();
    this.summary = h('div', { class: 'summary' });
    this.flyBtn = h('button', { class: 'btn primary', onclick: () => this.app.fly() }, 'Take off');

    root.append(
      h('div', { class: 'hangar-left' },
        h('h2', null, 'Aircraft'), this.list, this.liveryField,
        h('button', { class: 'btn small', style: { marginTop: '10px' }, onclick: () => this.app.showMenu() }, 'Back')),
      this.stage,
      h('div', { class: 'hangar-right' }, this.tabs, h('div', { class: 'hr-body' }, this.fieldPane, this.briefPane, this.condPane), h('div', { class: 'hr-foot' }, this.summary, this.flyBtn)));
  }

  _stageEvents() {
    const st = this.stage, g = this.game;
    let drag = null;
    st.addEventListener('pointerdown', (e) => { if (e.target.closest('.stage-bar')) return; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; st.setPointerCapture(e.pointerId); st.classList.add('drag'); });
    st.addEventListener('pointermove', (e) => { if (!drag) return; g.orbitBy(-(e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.004); drag.x = e.clientX; drag.y = e.clientY; this.viewSeg.set(''); });
    const end = () => { drag = null; st.classList.remove('drag'); };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    st.addEventListener('wheel', (e) => { e.preventDefault(); g.zoomBy(e.deltaY > 0 ? 1.08 : 1 / 1.08); }, { passive: false });
    st.addEventListener('dblclick', () => { g.viewPreset('orbit'); this.viewSeg.set('orbit'); });
  }

  _buildField() {
    this.regionSeg = h('div');
    this.blurb = h('div', { class: 'blurb' });
    this.feat = h('ul', { class: 'feat' });
    this.chartCanvas = h('canvas', { class: 'chart' });
    this.chartWrap = h('div', { class: 'chart-wrap' }, this.chartCanvas, h('div', { class: 'chart-tip' }));
    this.tip = this.chartWrap.lastChild;
    this.startList = h('div', { class: 'starts' });
    this.chartCanvas.addEventListener('pointermove', (e) => {
      const r = this.chartCanvas.getBoundingClientRect(), id = pickStart(this.hits, e.clientX - r.left, e.clientY - r.top);
      if (id !== this.hover) {
        this.hover = id; this._drawChart(); this.chartCanvas.style.cursor = id ? 'pointer' : 'default';
        const s = id && this.game.starts.find((q) => q.id === id);
        this.tip.textContent = s ? s.name : ''; this.tip.classList.toggle('on', !!s);
      }
    });
    this.chartCanvas.addEventListener('pointerleave', () => { this.hover = null; this.tip.classList.remove('on'); this._drawChart(); });
    this.chartCanvas.addEventListener('click', (e) => { const r = this.chartCanvas.getBoundingClientRect(), id = pickStart(this.hits, e.clientX - r.left, e.clientY - r.top); if (id) this.pickStart(id); });
    this.fieldPane.append(this.regionSeg, this.blurb, this.feat, this.chartWrap, this.startList);
  }

  _buildConditions() {
    const st = this.store;
    this.timeChips = segmented(TIMES.map(([l, v]) => [v, l]), '', (v) => st.set('timeOfDay', +v), 'chips');
    this.hourSlider = h('input', { type: 'range', min: 0, max: 24, step: 0.25 });
    this.hourSlider.addEventListener('input', () => st.set('timeOfDay', +this.hourSlider.value));
    this.hourVal = h('span', { class: 'mono val' });
    this.windChips = segmented([['calm', 'Calm'], ['head', 'Headwind'], ['cross', 'Crosswind'], ['tail', 'Tailwind'], ['gusty', 'Gusty']], '', (v) => this._windPreset(v), 'chips');
    this.windSpeed = h('input', { type: 'range', min: 0, max: 25, step: 1 });
    this.windSpeed.addEventListener('input', () => { st.set('windSpeed', +this.windSpeed.value); this.windChips.set(''); });
    this.windDir = h('input', { type: 'range', min: 0, max: 355, step: 5 });
    this.windDir.addEventListener('input', () => { st.set('windDir', +this.windDir.value); this.windChips.set(''); });
    this.windVal = h('span', { class: 'mono val' });
    this.cloud = h('input', { type: 'range', min: 0, max: 1, step: 0.05 });
    this.cloud.addEventListener('input', () => st.set('cloudCover', +this.cloud.value));
    this.cloudVal = h('span', { class: 'mono val' });
    this.airborneBtn = h('button', { class: 'toggle', role: 'switch', onclick: () => { this.sel.airborne = !this.sel.airborne; this._save(); this._sync(); } });
    this.challenge = h('select', { onchange: (e) => st.set('challenge', e.target.value) }, h('option', { value: 'off' }, 'Free flight'), h('option', { value: 'skyline' }, 'Skyline run over Meridian'));
    const row = (label, ...c) => h('div', { class: 'field' }, h('div', { class: 'row' }, h('span', { class: 'label' }, label), c[c.length - 1] && c[c.length - 1].classList && c[c.length - 1].classList.contains('val') ? c.pop() : null), ...c);
    this.condPane.append(
      row('Time of day', this.timeChips, this.hourSlider, this.hourVal),
      row('Wind', this.windChips, h('div', { class: 'two' }, h('div', null, h('span', { class: 'sub' }, 'Speed'), this.windSpeed), h('div', null, h('span', { class: 'sub' }, 'From'), this.windDir)), this.windVal),
      row('Cloud cover', this.cloud, this.cloudVal),
      h('div', { class: 'row' }, h('span', { class: 'label' }, 'Start in the air'), this.airborneBtn),
      row('Challenge', this.challenge));
  }

  // ------------------------------------------------------------------ flow
  open() {
    this.open_ = true;
    if (!this.bars) {
      this.bars = catalogBars(this.game.planes);
      this.maxLength = Math.max(...this.game.planes.map((p) => silhouette(p).length));
    }
    const s = this.start;
    this.region = s.region;
    this._renderCards(); this._renderField(); this._renderBrief(); this._sync(); this._setTab(this.tab, true);
    this._preview();
  }
  close() { this.open_ = false; }

  _preview() { this.game.showcase(this.sel.plane, this.sel.start, this.sel.livery); this.viewSeg.set('orbit'); }

  pickPlane(id) {
    if (id === this.sel.plane) return;
    this.sel.plane = id; this.sel.livery = 'default';
    this._save(); this._renderCards(); this._renderBrief(); this._sync(); this._preview();
  }

  pickStart(id) {
    const s = this.game.starts.find((q) => q.id === id);
    if (!s) return;
    this.sel.start = id; this.region = s.region;
    this._save(); this._renderField(); this._renderBrief(); this._sync(); this._preview();
  }

  pickRegion(rid) {
    if (rid === this.region) return;
    const list = this.game.starts.filter((s) => s.region === rid);
    const prefer = list.find((s) => s.kind === 'runway') || list[0];
    this.pickStart(prefer.id);
  }

  _setTab(id, quiet = false) {
    this.tab = id;
    for (const b of this.tabs.children) b.classList.toggle('on', b.dataset.t === id);
    for (const p of this.root.querySelectorAll('.hr-pane')) p.classList.toggle('on', p.dataset.p === id);
    if (!quiet) this._save();
    if (id === 'field') requestAnimationFrame(() => { this._drawChart(); const sel = this.startList.querySelector('.start.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' }); });
  }

  // ------------------------------------------------------------------ aircraft cards
  _renderCards() {
    clear(this.list);
    const metric = this.metric;
    for (const spec of this.game.planes) {
      const on = spec.id === this.sel.plane, b = this.bars.get(spec.id), perf = b.perf;
      const canvas = h('canvas', { class: 'bp', width: 10, height: 10 });
      const bar = (label, v, text) => h('div', { class: 'bar' }, h('span', null, label), h('div', { class: 'track' }, h('i', { style: { width: `${Math.round(Math.max(0.04, Math.min(1, v)) * 100)}%` } })), h('b', null, text));
      const pips = h('div', { class: 'bar' }, h('span', null, 'Handling'), h('div', { class: 'pips d' + spec.difficulty }, [1, 2, 3, 4, 5].map((i) => h('i', { class: i <= spec.difficulty ? 'on' : '' }))), h('b', null, RATING[spec.difficulty]));
      const card = h('div', { class: 'card' + (on ? ' sel' : ''), tabindex: 0, role: 'button', 'data-id': spec.id, onclick: () => this.pickPlane(spec.id), onkeydown: (e) => { if (e.key === ' ') { e.preventDefault(); this.pickPlane(spec.id); } } },
        h('div', { class: 'role' }, `${spec.role}  /  ${spec.manufacturer}`), h('h3', null, spec.name), canvas,
        h('div', { class: 'bars' },
          bar('Top speed', b.speed, this._spd(perf.vne)),
          bar('Climb', b.climb, metric ? `${perf.climb.toFixed(1)} m/s` : `${Math.round((perf.climb * 196.85) / 10) * 10} fpm`),
          bar('Roll', b.roll, `${Math.round(perf.roll)} deg/s`),
          bar('Short field', b.field, this._dist(perf.run)), pips),
        on ? h('p', null, spec.description) : null,
        on ? h('div', { class: 'spec' }, planeFacts(spec, metric).flat().map((x) => h('div', null, x))) : null,
        h('div', { class: 'tags' }, spec.tags.map((t, i) => h('span', { class: 'tag' + (i < 2 ? ' hot' : '') }, t))));
      this.list.append(card);
      // the canvas needs its layout size before it can be drawn at the right resolution
      requestAnimationFrame(() => {
        const w = canvas.clientWidth || 340, hgt = 140, dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
        drawBlueprint(canvas, spec, { pxPerM: Math.min(8.5, (w - 48) / (2 * this.maxLength)), metric });
      });
    }
    clear(this.liveryField);
    this.liveryField.append(h('span', { class: 'label' }, 'Livery'), h('select', { onchange: (e) => { this.sel.livery = e.target.value; this._save(); this._preview(); } }, this.spec.liveries.map((l) => h('option', { value: l.id, selected: l.id === this.sel.livery }, l.name))));
    const sel = this.list.querySelector('.card.sel');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  // ------------------------------------------------------------------ airfield tab
  _airfields() {
    const regions = new Map(this.game.world.regionsList.map((r) => [r.id, r]));
    const ids = [...new Set(this.game.starts.map((s) => s.region))];
    return ids.map((id) => regions.get(id)).filter(Boolean).sort((a, b) => (a.info?.order ?? 99) - (b.info?.order ?? 99));
  }

  _renderField() {
    const fields = this._airfields();
    const region = fields.find((r) => r.id === this.region) || fields[0];
    this.region = region.id;
    clear(this.regionSeg);
    this.regionSeg.append(segmented(fields.map((r) => [r.id, r.name.replace(/ International| Airfield/i, ''), r.name]), region.id, (id) => this.pickRegion(id), 'regions'));
    const info = region.info || {};
    this.blurb.textContent = info.blurb || '';
    clear(this.feat).append(...(info.features || []).map((f) => h('li', null, f)));
    this.airfield = this.game.world.airfieldInfo(region.id);
    const starts = this.game.starts.filter((s) => s.region === region.id);
    this.regionStarts = starts;
    clear(this.startList);
    const groups = new Map();
    for (const s of starts) { const k = s.group || 'Starts'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
    for (const [name, list] of groups) {
      this.startList.append(h('div', { class: 'label grp' }, name));
      for (const s of list) {
        const detail = s.rwy && s.kind === 'runway' ? `${this._dist(s.roll)} ahead  /  ${s.rwy.surface}  /  heading ${pad3(s.heading)}` : s.rwy ? `holding short  /  heading ${pad3(s.heading)}` : `heading ${pad3(s.heading)}`;
        this.startList.append(h('button', { class: 'start' + (s.id === this.sel.start ? ' sel' : ''), 'data-id': s.id, onclick: () => this.pickStart(s.id), onmouseenter: () => { this.hover = s.id; this._drawChart(); }, onmouseleave: () => { this.hover = null; this._drawChart(); } },
          h('span', { class: 'kind k-' + s.kind }, kindLabel(s.kind)), h('span', { class: 'sname' }, h('b', null, s.name), h('small', null, detail))));
      }
    }
    this._drawChart();
    const sel = this.startList.querySelector('.start.sel');
    if (sel && this.tab === 'field' && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  _drawChart() {
    if (!this.airfield || !this.chartCanvas.isConnected) return;
    const w = this.chartWrap.clientWidth;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), hgt = Math.round(w * chartAspect(this.airfield, this.regionStarts || []));
    if (this.chartCanvas.width !== Math.round(w * dpr) || this.chartCanvas.height !== Math.round(hgt * dpr)) {
      this.chartCanvas.width = Math.round(w * dpr); this.chartCanvas.height = Math.round(hgt * dpr);
      this.chartCanvas.style.width = w + 'px'; this.chartCanvas.style.height = hgt + 'px';
    }
    this.hits = drawChart(this.chartCanvas, this.airfield, this.regionStarts || [], this.sel.start, this.hover).hits;
  }

  // ------------------------------------------------------------------ briefing tab
  _renderBrief() {
    const st = this.store, spec = this.spec, start = this.start, region = this.game.world.regionsList.find((r) => r.id === start.region);
    const wind = { from: st.get('windDir'), speed: st.get('windSpeed') };
    const b = makeBriefing({ spec, start, ground: this.game.ground, wind, runways: region.runways || [] });
    this.brief = b;
    const row = (k, v, cls = '') => h('div', { class: 'kv ' + cls }, h('span', null, k), h('b', null, v));
    const sp = b.speeds, pane = clear(this.briefPane);
    pane.append(h('div', { class: 'brief-head' }, h('div', { class: 'label' }, 'Takeoff briefing'), h('h3', null, `${spec.name}, ${start.name}`)));
    if (b.kind === 'runway') {
      const v = b.verdict;
      pane.append(
        h('div', { class: 'kvs' }, row('Runway', `${b.rwy.name}  (${b.rwy.id})`), row('Heading', `${pad3(b.rwy.heading)} deg`), row(start.kind === 'runway' ? 'Runway ahead' : 'Runway length', this._dist(b.avail)),
          row('Surface', b.rwy.surface), row('Elevation', this._dist(b.elevation)), row('Slope', Math.abs(b.slope) < 0.002 ? 'Level' : `${b.slope > 0 ? 'Uphill' : 'Downhill'} ${(Math.abs(b.slope) * 100).toFixed(1)}%`)),
        this._windBlock(b),
        h('div', { class: 'gauge-wrap' }, h('div', { class: 'label' }, 'Runway needed'), this._gauge(b), h('div', { class: 'verdict ' + v.level }, b.sim.ok ? `${v.label}. Clear of 50 ft after ${this._dist(b.need)}, ${this._dist(b.avail)} available.` : `Not possible: ${b.sim.reason}.`)),
        h('div', { class: 'kvs' }, row('Rotate at', this._spd(sp.vr)), row('Lift off at', b.sim.ok ? this._spd(b.sim.vLof) : 'n/a'), row('Climb out at', this._spd(sp.vClimb)), row('Stall, flaps 1', this._spd(sp.vsTo)),
          row('Weight', `${Math.round(totalMass(spec))} kg`), row('Flaps', spec.aero.CLmaxFlap > 0.15 ? 'One notch' : 'Not used')));
    } else {
      const list = (b.runways || []).map((r) => h('li', null, `${r.id}, ${this._dist(r.length)}, ${r.surface}`));
      pane.append(h('div', { class: 'note' }, `${start.name} is not on a runway. Taxi to one before takeoff, or pick a runway start for a full briefing.`), list.length ? h('ul', { class: 'feat' }, list) : null, this._windBlock(b));
    }
    pane.append(h('div', { class: 'field' }, h('span', { class: 'label' }, 'Takeoff assist'), segmented(ASSIST_MODES.map((m) => [m, ASSIST_LABEL[m]]), st.get('takeoffAssist'), (m) => st.set('takeoffAssist', m), 'assist'),
      h('div', { class: 'help' }, 'Guidance draws the centerline and the rotation speed on the HUD. Automatic flies the takeoff for you and hands the controls back when you touch them. T in flight cycles the mode.')));
    this._summary();
  }

  _windBlock(b) {
    const w = b.wind, calm = w.speed < 0.5;
    const rel = b.rwy ? ((w.from - b.rwy.heading) * Math.PI) / 180 : ((w.from) * Math.PI) / 180;
    // wind rose: runway points up, the arrow shows where the air is coming from
    const ax = 50 + Math.sin(rel) * 34, ay = 50 - Math.cos(rel) * 34;
    const svg = `<svg viewBox="0 0 100 100" width="84" height="84" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#4a4234" stroke-width="2"/><rect x="45" y="18" width="10" height="64" fill="#b9ae96"/><path d="M50 22V78" stroke="#15120e" stroke-width="1.5" stroke-dasharray="5 4"/>${calm ? '' : `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} L50 50" stroke="#ff5a1f" stroke-width="4"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5" fill="#ff5a1f"/>`}<text x="50" y="12" text-anchor="middle" font-size="10" fill="#b9ae96" font-family="sans-serif">${b.rwy ? b.rwy.name : 'N'}</text></svg>`;
    const kv = (k, v, cls = '') => h('div', { class: 'kv ' + cls }, h('span', null, k), h('b', null, v));
    const spd = (v) => (this.metric ? `${(v * 3.6).toFixed(0)} km/h` : `${(v * KT).toFixed(0)} kt`);
    let lines;
    if (calm) lines = [kv('Wind', 'Calm')];
    else if (b.rwy) {
      const c = windComponents(w.from, w.speed, b.rwy.heading);
      lines = [kv('Wind', `${pad3(w.from)} at ${spd(w.speed)}`), kv(c.head >= 0 ? 'Headwind' : 'Tailwind', spd(Math.abs(c.head)), c.head < -1 ? 'bad' : ''), kv('Crosswind', `${spd(Math.abs(c.cross))} from the ${c.cross >= 0 ? 'right' : 'left'}`, Math.abs(c.cross) > 9 ? 'warn' : '')];
    } else lines = [kv('Wind', `${pad3(w.from)} at ${spd(w.speed)}`), kv('From', compass(w.from))];
    return h('div', { class: 'windblock' }, h('div', { html: svg }), h('div', { class: 'kvs one' }, lines));
  }

  /** The runway as a bar: how far the aircraft is on the ground, how far to clear 50 ft, and what is left. */
  _gauge(b) {
    const g = h('div', { class: 'gauge' });
    const total = Math.max(b.avail, b.sim.ok ? b.need * 1.03 : b.avail);
    const seg = (a, z, cls, label) => h('div', { class: 'gseg ' + cls, style: { left: `${(a / total) * 100}%`, width: `${Math.max(0.5, ((z - a) / total) * 100)}%` }, title: label });
    if (b.sim.ok) {
      g.append(seg(0, b.roll, 'roll', 'ground roll'), seg(b.roll, b.need, 'climb', 'climb to 50 ft'));
      if (b.need < b.avail) g.append(seg(b.need, b.avail, 'spare', 'runway left'));
      const end = h('div', { class: 'gend', style: { left: `${(b.avail / total) * 100}%` } });
      if (b.avail < total) g.append(end);
    } else g.append(seg(0, b.avail, 'spare', 'runway'));
    return h('div', null, g, h('div', { class: 'gscale' }, h('span', null, '0'), h('span', null, this._dist(b.avail))),
      b.sim.ok ? h('div', { class: 'glegend' }, h('span', null, h('i', { class: 'roll' }), 'Ground roll'), h('span', null, h('i', { class: 'climb' }), 'Climb to 50 ft'), b.need < b.avail ? h('span', null, h('i', { class: 'spare' }), 'Spare') : null) : null);
  }

  _summary() {
    const b = this.brief, st = this.store;
    clear(this.summary);
    const v = b && b.kind === 'runway' ? b.verdict : null;
    this.summary.append(
      h('div', { class: 'sum-line' }, h('b', null, this.spec.name), h('span', null, `  ${this.start.name}`)),
      h('div', { class: 'sum-line dim' }, `${fmtHour(st.get('timeOfDay'))}   wind ${pad3(st.get('windDir'))}/${this.metric ? Math.round(st.get('windSpeed') * 3.6) + ' km/h' : Math.round(st.get('windSpeed') * KT) + ' kt'}   assist ${ASSIST_LABEL[st.get('takeoffAssist')].toLowerCase()}${this.sel.airborne ? '   airborne start' : ''}`),
      v && !this.sel.airborne ? h('div', { class: 'sum-line verdict ' + v.level }, v.level === 'bad' && b.sim.ok ? `Runway too short for this aircraft, needs ${this._dist(b.need)}` : v.label) : null);
  }

  // ------------------------------------------------------------------ conditions tab
  _windPreset(v) {
    const st = this.store, hd = this.brief && this.brief.rwy ? this.brief.rwy.heading : this.start.heading;
    const P = { calm: [0, 0, 0.1], head: [hd, 6, 0.2], cross: [hd + 90, 8, 0.25], tail: [hd + 180, 5, 0.2], gusty: [hd + 35, 11, 0.55] }[v];
    st.set('windSpeed', P[1]); st.set('windDir', ((Math.round(P[0] / 5) * 5) % 360 + 360) % 360); st.set('turbulence', P[2]);
  }

  /** Bring every control in line with the store and the selection. */
  _sync(key) {
    const st = this.store, t = st.get('timeOfDay');
    this.hourSlider.value = t; this.hourVal.textContent = fmtHour(t);
    let near = null;
    for (const [, v] of TIMES) if (Math.abs(v - t) < 0.26) near = v;
    this.timeChips.set(near ?? '');
    this.windSpeed.value = st.get('windSpeed'); this.windDir.value = st.get('windDir');
    this.windVal.textContent = st.get('windSpeed') < 0.5 ? 'Calm' : `From ${pad3(st.get('windDir'))} (${compass(st.get('windDir'))}) at ${this.metric ? Math.round(st.get('windSpeed') * 3.6) + ' km/h' : Math.round(st.get('windSpeed') * KT) + ' kt'}`;
    this.cloud.value = st.get('cloudCover'); this.cloudVal.textContent = `${Math.round(st.get('cloudCover') * 100)}%`;
    this.airborneBtn.classList.toggle('on', !!this.sel.airborne); this.airborneBtn.setAttribute('aria-checked', String(!!this.sel.airborne));
    this.challenge.value = st.get('challenge');
    if (key && ['windSpeed', 'windDir', 'units', 'takeoffAssist'].includes(key)) this._renderBrief();
    else if (key) this._summary();
    if (key === 'units') { this._renderCards(); this._renderField(); }
  }

  // ------------------------------------------------------------------ keyboard
  _key(e) {
    if (!this.open_ || this.app.current !== 'hangar' || this.app.modal) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const g = this.game, planes = g.planes;
    const step = (list, cur, d) => list[(list.indexOf(cur) + d + list.length) % list.length];
    let used = true;
    switch (e.code) {
      case 'ArrowLeft': this.pickPlane(step(planes.map((p) => p.id), this.sel.plane, -1)); break;
      case 'ArrowRight': this.pickPlane(step(planes.map((p) => p.id), this.sel.plane, 1)); break;
      case 'ArrowUp': this.pickStart(step((this.regionStarts || []).map((s) => s.id), this.sel.start, -1)); break;
      case 'ArrowDown': this.pickStart(step((this.regionStarts || []).map((s) => s.id), this.sel.start, 1)); break;
      case 'PageUp': case 'PageDown': { const f = this._airfields().map((r) => r.id); this.pickRegion(step(f, this.region, e.code === 'PageUp' ? -1 : 1)); break; }
      case 'Enter': case 'NumpadEnter': this.app.fly(); break;
      case 'Escape': this.app.showMenu(); break;
      case 'KeyL': { const ls = this.spec.liveries.map((l) => l.id); this.sel.livery = step(ls, this.sel.livery, 1); this._save(); this._renderCards(); this._preview(); break; }
      case 'KeyT': { const m = ASSIST_MODES[(ASSIST_MODES.indexOf(this.store.get('takeoffAssist')) + 1) % ASSIST_MODES.length]; this.store.set('takeoffAssist', m); break; }
      default:
        if (/^Digit[1-5]$/.test(e.code)) { const v = VIEWS[+e.code.slice(5) - 1][0]; g.viewPreset(v); this.viewSeg.set(v); } else used = false;
    }
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }
}
