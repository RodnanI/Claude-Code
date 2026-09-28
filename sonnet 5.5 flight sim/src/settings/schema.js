import { PRESETS, PRESET_ORDER, PRESET_LABELS } from './presets.js';

/* One entry per user-visible setting. apply: 'live' takes effect immediately, 'rebuild' flushes LOD nodes,
   'reload' needs a page reload (context-level options such as MSAA). */

const opt = (values, labels) => values.map((v, i) => ({ value: v, label: labels ? labels[i] : String(v) }));
const off = (v) => (v ? String(v) : 'Off');

export const SCHEMA = [
  { key: 'preset', group: 'Graphics', label: 'Quality preset', type: 'select', default: 'auto', apply: 'live',
    options: [{ value: 'auto', label: 'Auto' }, ...PRESET_ORDER.map((p) => ({ value: p, label: PRESET_LABELS[p] })), { value: 'custom', label: 'Custom' }],
    help: 'Auto probes your hardware and adapts while you fly.' },
  { key: 'resolutionScale', group: 'Graphics', label: 'Render scale', type: 'range', min: 0.4, max: 1.5, step: 0.05, apply: 'live', format: (v) => Math.round(v * 100) + '%', help: 'Internal resolution. Above 100% is supersampling.' },
  { key: 'viewDistance', group: 'Graphics', label: 'View distance', type: 'range', min: 3000, max: 60000, step: 1000, apply: 'live', format: (v) => (v / 1000).toFixed(0) + ' km' },
  { key: 'baseVoxel', group: 'Graphics', label: 'Voxel detail', type: 'select', apply: 'rebuild', options: opt([4, 2, 1, 0.5, 0.25], ['Chunky 4 m', 'Coarse 2 m', 'Medium 1 m', 'Fine 0.5 m', 'Extreme 0.25 m']), help: 'Voxel size closest to the camera. Everything farther doubles from here.' },
  { key: 'lodErrorPx', group: 'Graphics', label: 'Detail falloff', type: 'range', min: 1, max: 12, step: 0.25, apply: 'live', format: (v) => v.toFixed(2) + ' px', help: 'Lower keeps fine voxels farther out. Costs performance.' },
  { key: 'shadows', group: 'Graphics', label: 'Shadow cascades', type: 'select', apply: 'live', options: opt([0, 1, 2, 3, 4], ['Off', '1', '2', '3', '4']) },
  { key: 'shadowSize', group: 'Graphics', label: 'Shadow resolution', type: 'select', apply: 'live', options: opt([1024, 2048, 4096], ['1024', '2048', '4096']) },
  { key: 'shadowDistance', group: 'Graphics', label: 'Shadow distance', type: 'range', min: 200, max: 4000, step: 100, apply: 'live', format: (v) => v + ' m' },
  { key: 'msaa', group: 'Graphics', label: 'Anti-aliasing', type: 'select', apply: 'reload', options: opt([0, 2, 4, 8], ['Off', 'MSAA 2x', 'MSAA 4x', 'MSAA 8x']), help: 'Needs a reload to apply.' },
  { key: 'water', group: 'Graphics', label: 'Water', type: 'select', apply: 'live', options: opt([0, 1, 2], ['Flat', 'Simple waves', 'Full waves']) },
  { key: 'clouds', group: 'Graphics', label: 'Clouds', type: 'select', apply: 'live', options: opt([0, 1, 2], ['Off', 'One layer', 'Two layers']) },
  { key: 'sceneryRange', group: 'Graphics', label: 'Scenery range', type: 'select', apply: 'rebuild', options: opt([0, 250, 600, 1200, 2400, 5000], ['Off', '250 m', '600 m', '1.2 km', '2.4 km', '5 km']) },
  { key: 'traffic', group: 'Graphics', label: 'Traffic', type: 'range', min: 0, max: 300, step: 5, apply: 'live', format: (v) => (v ? v + ' vehicles' : 'Off') },
  { key: 'voxelEdges', group: 'Graphics', label: 'Voxel edges', type: 'range', min: 0, max: 1, step: 0.05, apply: 'live', format: (v) => (v ? Math.round(v * 100) + '%' : 'Off') },
  { key: 'ao', group: 'Graphics', label: 'Ambient occlusion', type: 'toggle', apply: 'rebuild' },
  { key: 'macro', group: 'Graphics', label: 'Ground variation', type: 'toggle', apply: 'live' },
  { key: 'workers', group: 'Graphics', label: 'Worker threads', type: 'range', min: 1, max: 8, step: 1, apply: 'rebuild', format: String },
  { key: 'gpuBudgetMB', group: 'Graphics', label: 'GPU memory budget', type: 'range', min: 64, max: 4096, step: 64, apply: 'live', format: (v) => v + ' MB' },
  { key: 'frameCap', group: 'Graphics', label: 'Frame cap', type: 'select', default: 0, apply: 'live', options: opt([0, 30, 60, 120], ['Uncapped', '30', '60', '120']) },

  { key: 'timeOfDay', group: 'World', label: 'Time of day', type: 'range', min: 0, max: 24, step: 0.25, default: 10.5, apply: 'live', format: (v) => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}` },
  { key: 'timeSpeed', group: 'World', label: 'Time speed', type: 'select', default: 0, apply: 'live', options: opt([0, 60, 300, 1200], ['Frozen', 'x60', 'x300', 'x1200']) },
  { key: 'cloudCover', group: 'World', label: 'Cloud cover', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, apply: 'live', format: (v) => Math.round(v * 100) + '%' },

  { key: 'fov', group: 'Controls', label: 'Field of view', type: 'range', min: 50, max: 110, step: 1, default: 70, apply: 'live', format: (v) => v + ' deg' },
  { key: 'mouseFlight', group: 'Controls', label: 'Mouse flight', type: 'toggle', default: false, apply: 'live', help: 'Steer with the mouse position instead of keys.' },
  { key: 'invertPitch', group: 'Controls', label: 'Invert pitch', type: 'toggle', default: false, apply: 'live' },
  { key: 'sensitivity', group: 'Controls', label: 'Control response', type: 'range', min: 0.3, max: 2, step: 0.05, default: 1, apply: 'live', format: (v) => v.toFixed(2) + 'x' },
  { key: 'deadzone', group: 'Controls', label: 'Gamepad deadzone', type: 'range', min: 0, max: 0.4, step: 0.01, default: 0.08, apply: 'live', format: (v) => v.toFixed(2) },

  { key: 'units', group: 'Interface', label: 'Units', type: 'select', default: 'aviation', apply: 'live', options: [{ value: 'aviation', label: 'Knots and feet' }, { value: 'metric', label: 'km/h and meters' }] },
  { key: 'hudScale', group: 'Interface', label: 'HUD scale', type: 'range', min: 0.7, max: 1.6, step: 0.05, default: 1, apply: 'live', format: (v) => Math.round(v * 100) + '%' },
  { key: 'showStats', group: 'Interface', label: 'Performance overlay', type: 'toggle', default: false, apply: 'live', help: 'Also toggled with F3.' },
];

export const SCHEMA_BY_KEY = Object.fromEntries(SCHEMA.map((s) => [s.key, s]));

export function defaults() {
  const d = {};
  for (const s of SCHEMA) if (s.default !== undefined) d[s.key] = s.default;
  Object.assign(d, PRESETS.medium);
  d.preset = 'auto';
  return d;
}

/** Clamp and coerce a value to what the schema allows. Returns undefined for unknown keys. */
export function sanitize(key, v) {
  const s = SCHEMA_BY_KEY[key];
  if (!s) return undefined;
  if (s.type === 'toggle') return !!v;
  if (s.type === 'range') {
    v = Number(v);
    if (!Number.isFinite(v)) return undefined;
    return Math.min(s.max, Math.max(s.min, v));
  }
  if (s.type === 'select') {
    const hit = s.options.find((o) => o.value === v || String(o.value) === String(v));
    return hit ? hit.value : undefined;
  }
  return undefined;
}
