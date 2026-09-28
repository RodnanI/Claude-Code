/* Settings: arrows to move and change, Enter for actions. Reset asks for a second Enter. */

const onOff = v => t(v ? 'v_on' : 'v_off');
const SETTING_ROWS = [
  { k: 'theme', opts: ['auto', 'light', 'dark'], label: v => t('v_' + v) },
  { k: 'hints', opts: ['adaptive', 'always', 'off'], label: v => t('v_' + v), help: 'h_hints' },
  { k: 'errors', opts: ['stop', 'go'], label: v => t('v_' + v), help: 'h_errors' },
  { k: 'keyboard', opts: [true, false], label: onOff },
  { k: 'hands', opts: [true, false], label: onOff },
  { k: 'colors', opts: [true, false], label: onOff },
  { k: 'sound', opts: ['off', 'errors', 'all'], label: v => t('v_' + v) },
  { k: 'size', opts: [1, 2, 3, 4], label: v => ['S', 'M', 'L', 'XL'][v - 1] },
  { k: 'length', opts: ['short', 'normal', 'long'], label: v => t('v_' + v) },
  { k: 'goal', opts: [15, 30, 45, 60, 90, 120, 180], label: v => t('v_min', { n: v }) },
  { k: 'breaks', opts: [0, 20, 30, 45, 60], label: v => (v ? t('v_every', { n: v }) : t('v_off')) },
  { k: 'unit', opts: ['wpm', 'cpm'], label: v => t('v_' + v), help: 'h_unit' },
  { k: 'unlock', opts: [false, true], label: onOff },
  { act: 'export' }, { act: 'import' }, { act: 'reset', danger: true }
];

Screens.settings = {
  render() {
    this.focus = 0;
    this.armed = false;
    this.list = h('div', { class: 'settings' });
    this.help = h('p', { class: 'shelp' });
    return h('div', null,
      h('header', { class: 'bar' }, h('div', { class: 'bar-l' }, h('div', { class: 'bar-title' }, t('settingsTitle')))),
      this.list, this.help,
      hintBar([['↑ ↓', t('kSelect')], ['← →', t('kAdjust')], ['Enter', t('kRun')], ['Esc', t('kBack')]]));
  },

  mounted() { this.draw(); },

  value(row) {
    const v = Settings.get(row.k);
    if (row.k === 'unit' && v === 'auto') return LANG === 'de' ? 'cpm' : 'wpm';
    return v;
  },

  draw() {
    this.rows = SETTING_ROWS.map((r, i) => h('div', {
      class: ['srow', r.act ? 'act' : '', r.danger ? 'danger' : '', i === this.focus ? 'focus' : ''].join(' '),
      onclick: () => { this.focus = i; r.act ? this.run(r) : this.change(1); }
    },
    h('span', { class: 'sl' }, t('set_' + (r.k || r.act))),
    h('span', { class: 'sv' }, r.act ? '↵' : r.label(this.value(r)))));
    this.list.replaceChildren(...this.rows);
    const r = SETTING_ROWS[this.focus];
    if (!this.msg) this.help.textContent = r.help ? t(r.help) : '';
    this.rows[this.focus].scrollIntoView({ block: 'nearest' });
  },

  say(msg) { this.msg = msg; this.help.textContent = msg; },

  change(dir) {
    const r = SETTING_ROWS[this.focus];
    if (r.act) return;
    const i = r.opts.indexOf(this.value(r));
    Settings.set(r.k, r.opts[(i + dir + r.opts.length) % r.opts.length]);
    this.msg = null;
    this.draw();
  },

  run(r) {
    const lang = App.course.lang;
    if (r.act === 'export') {
      const blob = new Blob([JSON.stringify(Store.data)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `learn-to-type-${dayKey()}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      this.say(t('exportDone'));
    } else if (r.act === 'import') {
      const inp = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return;
        f.text().then(txt => {
          const d = JSON.parse(txt);
          if (!d || typeof d !== 'object' || !d.courses) throw new Error('bad file');
          Store.data = Store.normalize(d);
          Store.save();
          applySettings();
          this.say(t('importDone'));
          this.draw();
        }).catch(() => this.say(t('importFail')));
      });
      document.body.append(inp);
      inp.click();
    } else if (r.act === 'reset') {
      if (!this.armed) { this.armed = true; this.say(t('confirmReset')); return; }
      this.armed = false;
      Store.reset(lang);
      Coach.sess = { warm: {}, sinceBreak: 0, last: null, tries: {}, rot: 0 };
      this.say(t('resetDone'));
    }
  },

  onKey(e) {
    const k = e.key;
    const m = listMove(e, this.focus, SETTING_ROWS.length);
    if (m >= 0) { this.focus = m; this.armed = false; this.msg = null; this.draw(); }
    else if (k === 'ArrowRight') this.change(1);
    else if (k === 'ArrowLeft') this.change(-1);
    else if (k === 'Enter' || k === ' ') { const r = SETTING_ROWS[this.focus]; r.act ? this.run(r) : this.change(1); }
    else if (k === 'Escape') App.go('home');
    return true;
  }
};
