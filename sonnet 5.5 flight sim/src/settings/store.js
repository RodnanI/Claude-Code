import { Emitter } from '../core/events.js';
import { SCHEMA_BY_KEY, defaults, sanitize } from './schema.js';
import { PRESETS, PRESET_KEYS, derive } from './presets.js';

const STORAGE_KEY = 'flyhigh.settings.v1';

/** Settings with persistence, presets, and change events. Storage is optional and always guarded. */
export class SettingsStore extends Emitter {
  constructor(storage = null) {
    super();
    this.storage = storage;
    this.values = defaults();
    this.load();
  }

  get(key) { return this.values[key]; }
  all() { return { ...this.values }; }

  set(key, value, silent = false) {
    const v = sanitize(key, value);
    if (v === undefined || this.values[key] === v) return false;
    this.values[key] = v;
    if (key !== 'preset' && PRESET_KEYS.includes(key) && this.values.preset !== 'auto') this._markCustomIfDiverged();
    if (!silent) { this.emit('change', key, v); this.save(); }
    return true;
  }

  _markCustomIfDiverged() {
    const p = this.values.preset;
    if (p === 'custom' || !PRESETS[p]) return;
    for (const k of PRESET_KEYS) if (this.values[k] !== PRESETS[p][k]) { this.values.preset = 'custom'; this.emit('change', 'preset', 'custom'); return; }
  }

  /** Apply a named preset ('auto' is handled by the governor and probe). */
  applyPreset(name) {
    if (name === 'auto') { this.values.preset = 'auto'; this.emit('change', 'preset', 'auto'); this.save(); return; }
    const p = PRESETS[name];
    if (!p) return false;
    for (const k of PRESET_KEYS) this.values[k] = p[k];
    this.values.preset = name;
    for (const k of PRESET_KEYS) this.emit('change', k, this.values[k]);
    this.emit('change', 'preset', name);
    this.save();
    return true;
  }

  /** Overwrite graphics values without touching the preset label (used by the auto governor). */
  applyGraphics(partial) {
    let changed = false;
    for (const [k, v] of Object.entries(partial)) {
      const s = sanitize(k, v);
      if (s !== undefined && this.values[k] !== s) { this.values[k] = s; changed = true; this.emit('change', k, s); }
    }
    return changed;
  }

  derived() { return derive(this.values); }

  toJSON() { return JSON.stringify({ v: 1, values: this.values }); }

  importJSON(text) {
    try {
      const o = JSON.parse(text);
      for (const [k, v] of Object.entries(o.values || {})) this.set(k, v, true);
      this.emit('change', '*', null);
      this.save();
      return true;
    } catch { return false; }
  }

  load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const o = JSON.parse(raw);
      for (const [k, v] of Object.entries(o.values || {})) {
        if (!SCHEMA_BY_KEY[k]) continue;
        const s = sanitize(k, v);
        if (s !== undefined) this.values[k] = s;
      }
      this.loaded = true;
    } catch { /* corrupt storage: keep defaults */ }
  }

  save() {
    if (!this.storage) return;
    try { this.storage.setItem(STORAGE_KEY, this.toJSON()); } catch { /* quota or privacy mode */ }
  }

  reset() {
    this.values = defaults();
    this.emit('change', '*', null);
    this.save();
  }
}

export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__fh_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch { return null; }
}
