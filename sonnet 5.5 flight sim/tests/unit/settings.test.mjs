import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA, SCHEMA_BY_KEY, defaults, sanitize } from '../../src/settings/schema.js';
import { PRESETS, PRESET_ORDER, PRESET_KEYS, derive } from '../../src/settings/presets.js';
import { SettingsStore } from '../../src/settings/store.js';
import { Governor } from '../../src/settings/governor.js';
import { probeHardware } from '../../src/settings/probe.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

test('presets run from cheapest to most demanding and cover the same keys', () => {
  assert.deepEqual(PRESET_ORDER, ['potato', 'low', 'medium', 'high', 'ultra', 'overkill']);
  for (const name of PRESET_ORDER) assert.deepEqual(Object.keys(PRESETS[name]).sort(), [...PRESET_KEYS].sort(), name);
  for (let i = 1; i < PRESET_ORDER.length; i++) {
    const a = PRESETS[PRESET_ORDER[i - 1]], b = PRESETS[PRESET_ORDER[i]];
    assert.ok(b.viewDistance >= a.viewDistance, `view distance must not shrink at ${PRESET_ORDER[i]}`);
    assert.ok(b.baseVoxel <= a.baseVoxel, 'voxels get finer');
    assert.ok(b.resolutionScale >= a.resolutionScale);
    assert.ok(b.gpuBudgetMB >= a.gpuBudgetMB && b.workers >= a.workers && b.traffic >= a.traffic);
  }
  assert.equal(PRESETS.potato.post, false, 'potato must skip the HDR pipeline entirely');
});

test('every preset key has a schema entry that accepts the preset value', () => {
  for (const name of PRESET_ORDER) for (const k of PRESET_KEYS) {
    const s = SCHEMA_BY_KEY[k];
    assert.ok(s, `no schema entry for ${k}`);
    assert.equal(sanitize(k, PRESETS[name][k]), PRESETS[name][k], `${name}.${k} is not valid according to the schema`);
  }
  assert.equal(new Set(SCHEMA.map((s) => s.key)).size, SCHEMA.length, 'schema keys are unique');
  for (const s of SCHEMA) { assert.ok(['live', 'rebuild', 'reload'].includes(s.apply), s.key); assert.ok(s.label && s.group, s.key); }
});

test('sanitize clamps ranges, coerces toggles and rejects unknowns', () => {
  assert.equal(sanitize('fov', 500), SCHEMA_BY_KEY.fov.max);
  assert.equal(sanitize('fov', -5), SCHEMA_BY_KEY.fov.min);
  assert.equal(sanitize('fov', 'abc'), undefined);
  assert.equal(sanitize('bloom', 1), true);
  assert.equal(sanitize('shadows', '3'), 3);
  assert.equal(sanitize('shadows', 9), undefined);
  assert.equal(sanitize('nonsense', 1), undefined);
  assert.equal(defaults().preset, 'auto');
});

test('derive turns settings into per-system configuration for every preset', () => {
  for (const name of PRESET_ORDER) {
    const d = derive({ ...defaults(), ...PRESETS[name] });
    assert.ok(d.lod.workers >= 1 && d.lod.baseVoxel > 0);
    assert.ok(d.lod.sceneryMaxLevel >= -1 && d.lod.sceneryMaxLevel <= 6);
    assert.equal(d.render.post, PRESETS[name].post);
    assert.equal(d.render.postQ.aa, PRESETS[name].aa);
    assert.ok(d.traffic.maxVehicles === PRESETS[name].traffic);
    assert.ok(d.resolutionScale >= 0.5 && d.resolutionScale <= 1.5);
  }
  assert.equal(derive({ ...defaults(), ...PRESETS.potato }).lod.sceneryMaxLevel, -1, 'no scenery on potato');
});

test('store persists, restores, ignores corrupt data and emits changes', () => {
  const storage = memory();
  const a = new SettingsStore(storage);
  const seen = [];
  a.on('change', (k, v) => seen.push([k, v]));
  assert.equal(a.set('fov', 95), true);
  assert.equal(a.set('fov', 95), false, 'no-op writes are ignored');
  assert.deepEqual(seen, [['fov', 95]]);
  const b = new SettingsStore(storage);
  assert.equal(b.get('fov'), 95);
  assert.equal(b.loaded, true);
  storage.setItem('flyhigh.settings.v1', '{not json');
  assert.equal(new SettingsStore(storage).get('fov'), defaults().fov);
  storage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values: { fov: 9999, ghost: 1, bloom: 'yes' } }));
  const c = new SettingsStore(storage);
  assert.equal(c.get('fov'), SCHEMA_BY_KEY.fov.max);
  assert.equal(c.get('ghost'), undefined);
  assert.equal(new SettingsStore(null).get('fov'), defaults().fov, 'works without storage');
});

test('applying a preset sets its keys and editing one marks the settings custom', () => {
  const s = new SettingsStore(memory());
  s.applyPreset('high');
  for (const k of PRESET_KEYS) assert.equal(s.get(k), PRESETS.high[k]);
  assert.equal(s.get('preset'), 'high');
  s.set('shadows', 1);
  assert.equal(s.get('preset'), 'custom');
  s.applyPreset('auto');
  assert.equal(s.get('preset'), 'auto');
  assert.equal(s.applyPreset('nope'), false);
  assert.equal(s.importJSON('garbage'), false);
  assert.equal(s.importJSON(new SettingsStore(memory()).toJSON()), true);
});

test('governor trades render scale first, respects its floor and recovers when fast', () => {
  const g = new Governor({ targetFps: 60 });
  const s = { ...defaults(), ...PRESETS.ultra };
  let changes = 0, last = null;
  for (let t = 0; t < 60000; t += 16) {
    const c = g.step(45, s, 16);
    if (c) { Object.assign(s, c); changes++; last = c; assert.ok(!('baseVoxel' in c) && !('workers' in c), 'the governor must never flush the world'); }
  }
  assert.ok(changes > 3);
  assert.ok(s.resolutionScale >= PRESETS.potato.resolutionScale - 1e-9);
  const before = s.resolutionScale;
  g.cooldown = 0;
  for (let t = 0; t < 90000; t += 16) { const c = g.step(8, s, 16); if (c) Object.assign(s, c); }
  assert.ok(s.resolutionScale >= before && s.viewDistance >= PRESETS.potato.viewDistance);
  assert.ok(last);
  const off = new Governor(); off.enabled = false;
  assert.equal(off.step(200, s, 16), null);
});

test('hardware probe is conservative on software renderers and phones', () => {
  assert.equal(probeHardware({ renderer: 'Google SwiftShader' }).tier, 'low');
  assert.ok(PRESET_ORDER.indexOf(probeHardware({ renderer: 'NVIDIA GeForce RTX 4080' }).tier) >= PRESET_ORDER.indexOf('high'));
  assert.ok(PRESET_ORDER.indexOf(probeHardware({ renderer: 'Mali-G78' }).tier) <= PRESET_ORDER.indexOf('medium'));
  const t = probeHardware({ renderer: 'ANGLE (Apple, Apple M2 Max)' });
  assert.ok(PRESET_ORDER.includes(t.tier));
});
