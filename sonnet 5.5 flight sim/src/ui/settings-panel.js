import { h, clear } from './dom.js';
import { SCHEMA } from '../settings/schema.js';
import { PRESET_ORDER, PRESET_LABELS } from '../settings/presets.js';

const GROUPS = ['Graphics', 'Cinematic', 'World', 'Controls', 'Interface'];

/** Settings dialog generated from the schema. New settings appear here without touching this file. */
export class SettingsPanel {
  constructor(store, { onClose } = {}) {
    this.store = store;
    this.onClose = onClose;
    this.tab = 'Graphics';
    this.root = h('div', { class: 'modal', onclick: (e) => { if (e.target === this.root) this.onClose && this.onClose(); } });
    this.body = h('div', { class: 'pane' });
    this.tabs = h('div', { class: 'tabs' });
    this.note = h('div', { class: 'note' }, '');
    this.root.append(h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Settings' },
      h('div', { class: 'sheet-head' }, h('h1', null, 'Settings'), h('button', { class: 'btn small', onclick: () => this.onClose && this.onClose() }, 'Done')),
      h('div', { class: 'sheet-body' }, this.tabs, this.body),
      h('div', { class: 'sheet-foot' }, this.note,
        h('button', { class: 'btn small', onclick: () => this._export() }, 'Export'),
        h('button', { class: 'btn small', onclick: () => this._import() }, 'Import'),
        h('button', { class: 'btn small', onclick: () => { if (confirm('Reset every setting to its default?')) { this.store.reset(); this.render(); } } }, 'Reset all'))));
    this.store.on('change', (k) => { if (k === '*' || k === 'preset') this._sync(); });
    this.render();
  }

  render() {
    clear(this.tabs);
    for (const g of GROUPS) this.tabs.append(h('button', { class: 'tab' + (g === this.tab ? ' on' : ''), onclick: () => { this.tab = g; this.render(); } }, g));
    clear(this.body);
    this.controls = new Map();
    for (const s of SCHEMA.filter((x) => x.group === this.tab)) this.body.append(this._row(s));
    this.body.scrollTop = 0;
  }

  _sync() {
    for (const [key, fn] of this.controls) fn(this.store.get(key));
  }

  _row(s) {
    const st = this.store;
    const val = h('span', { class: 'val' });
    let ctl;
    const fmt = (v) => (s.format ? s.format(v) : s.options ? (s.options.find((o) => o.value === v) || {}).label : String(v));
    if (s.type === 'range') {
      const input = h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: st.get(s.key) });
      const commit = () => { st.set(s.key, +input.value); val.textContent = fmt(st.get(s.key)); };
      input.addEventListener('input', () => { val.textContent = fmt(+input.value); if (s.apply !== 'rebuild') commit(); });
      input.addEventListener('change', commit);
      val.textContent = fmt(st.get(s.key));
      ctl = h('div', { class: 'ctl' }, input, val);
      this.controls.set(s.key, (v) => { input.value = v; val.textContent = fmt(v); });
    } else if (s.type === 'toggle') {
      const b = h('button', { class: 'toggle' + (st.get(s.key) ? ' on' : ''), role: 'switch', 'aria-checked': String(!!st.get(s.key)), onclick: () => { st.set(s.key, !st.get(s.key)); sync(st.get(s.key)); } });
      const sync = (v) => { b.classList.toggle('on', !!v); b.setAttribute('aria-checked', String(!!v)); };
      ctl = h('div', { class: 'ctl' }, b);
      this.controls.set(s.key, sync);
    } else {
      const sel = h('select', { onchange: () => { const o = s.options.find((x) => String(x.value) === sel.value); if (s.key === 'preset') { if (o.value === 'custom') return; st.applyPreset(o.value); } else st.set(s.key, o.value); } },
        s.options.map((o) => h('option', { value: String(o.value) }, o.label)));
      sel.value = String(st.get(s.key));
      ctl = h('div', { class: 'ctl' }, sel);
      this.controls.set(s.key, (v) => { sel.value = String(v); });
    }
    const tag = s.apply === 'rebuild' ? h('i', null, 'rebuilds terrain') : s.apply === 'reload' ? h('i', null, 'restart') : null;
    return h('div', { class: 'setting' }, h('div', { class: 'name' }, s.label, tag), ctl, s.help ? h('div', { class: 'help' }, s.help) : null);
  }

  setNote(text) { this.note.textContent = text || ''; }

  _export() {
    const blob = new Blob([this.store.toJSON()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'fly-high-settings.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  _import() {
    const input = h('input', { type: 'file', accept: 'application/json' });
    input.addEventListener('change', async () => {
      const f = input.files[0]; if (!f) return;
      this.setNote(this.store.importJSON(await f.text()) ? 'Settings imported.' : 'That file is not a settings export.');
      this.render();
    });
    input.click();
  }
}

export { PRESET_ORDER, PRESET_LABELS };
