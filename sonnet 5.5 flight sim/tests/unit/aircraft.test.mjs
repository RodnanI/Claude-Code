import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRCRAFT } from '../../src/generated/registry.js';
import { kitFor, liveryRemap } from '../../src/aircraft/instance.js';
import { meshRecipe } from '../../src/voxel/recipe.js';
import { defineAircraft } from '../../src/aircraft/base.js';
import { M } from '../../src/voxel/palette.js';

const cellOf = (spec, p, level = 0) => (p.voxel || (p.group === 'interior' ? spec.interiorVoxel : spec.voxel)) * (p.group === 'interior' ? 1 : 2 ** level);
const anchorOf = (p) => (p.local ? [0, 0, 0] : p.pivot.map((v) => -v));

/** Body-frame bounds of all exterior parts at rest. */
function bodyBounds(spec) {
  const kit = kitFor(spec);
  let b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const p of kit.parts) {
    if (p.group !== 'exterior') continue;
    const r = p.recipe.bounds(cellOf(spec, p));
    if (!r) continue;
    const off = p.local ? p.pivot : [0, 0, 0];
    for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], r[i] + off[i]); b[i + 3] = Math.max(b[i + 3], r[i + 3] + off[i]); }
  }
  return b;
}

for (const spec of AIRCRAFT) {
  test(`${spec.id}: parts are unique, animated parts exist and channels are known`, () => {
    const kit = kitFor(spec);
    const names = kit.parts.map((p) => p.name);
    assert.equal(new Set(names).size, names.length, 'duplicate part names');
    for (const a of spec.animations) {
      assert.ok(names.includes(a.part), `animation targets missing part ${a.part}`);
      assert.ok(['rotate', 'translate'].includes(a.type));
      assert.ok(a.axis.length === 3 && typeof a.channel === 'string' && Number.isFinite(a.gain));
    }
    for (const p of kit.parts) if (p.visibleWhen) assert.match(p.visibleWhen, /^[a-zA-Z_0-9]+$/);
  });

  test(`${spec.id}: every part produces geometry, at every LOD level`, () => {
    const kit = kitFor(spec);
    for (const p of kit.parts) {
      const levels = p.group === 'interior' ? [0] : [0, 1, 2, spec.lodLevels ?? 3];
      for (const level of levels) {
        const cell = cellOf(spec, p, level);
        const mesh = meshRecipe(p.recipe, { cell, anchor: anchorOf(p), conservative: cell >= 0.2 });
        const b = p.recipe.bounds(cell);
        const size = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
        if (size < 3 * cell && level > 0) continue;   // details smaller than a few voxels may drop out at distance
        assert.ok(mesh && mesh.indexCount > 0, `part ${p.name} is empty at cell ${cell}`);
        for (let i = 0; i < mesh.vertexData?.length ?? 0; i++) assert.ok(Number.isFinite(mesh.vertexData[i]));
      }
    }
  });

  test(`${spec.id}: dimensions agree with the spec`, () => {
    const b = bodyBounds(spec);
    const span = b[5] - b[2], length = b[3] - b[0];
    assert.ok(Math.abs(span - spec.wing.span) / spec.wing.span < 0.16, `model span ${span.toFixed(2)} vs spec ${spec.wing.span}`);
    assert.ok(length > 5 && length < 20, `length ${length}`);
    const [ex, ey, ez] = spec.cameras.cockpit;
    assert.ok(ex > b[0] && ex < b[3] && ey > b[1] && ey < b[4] && ez > b[2] && ez < b[5], 'pilot eye must be inside the airframe volume');
    for (const w of spec.gear.wheels) {
      assert.ok(w.pos[0] > b[0] && w.pos[0] < b[3] && w.pos[2] > b[2] && w.pos[2] < b[5]);
      assert.ok(w.pos[1] - w.radius >= b[1] - 0.5, 'wheel bottom below the model floor by more than half a meter');
    }
    for (const s of spec.skids) assert.ok(s.p[0] >= b[0] - 0.4 && s.p[0] <= b[3] + 0.9, `skid ${s.kind} outside model`);
  });

  test(`${spec.id}: liveries resolve to real materials`, () => {
    for (const l of spec.liveries) {
      const t = liveryRemap(spec, l.id);
      if (l.remap) assert.ok(t instanceof Uint8Array);
    }
  });

  test(`${spec.id}: weapon stations reference real stores`, () => {
    const kit = kitFor(spec);
    for (const w of spec.weapons) for (const st of w.stations || []) assert.ok(spec.stations.some((s) => s.id === st));
    for (const p of kit.parts) if (p.visibleWhen && p.visibleWhen.startsWith('store_')) {
      const id = p.visibleWhen.slice(6);
      assert.ok(spec.stations.some((s) => s.id === id), `part ${p.name} shows store ${id} which is not a station`);
    }
  });
}

test('every aircraft source only uses palette materials that exist', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../../src/aircraft/planes/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bM\.([A-Z_0-9]+)/g)) assert.notEqual(M[m[1]], undefined, `${f} uses missing material ${m[1]}`);
  }
});

test('defineAircraft rejects broken specs', () => {
  const base = AIRCRAFT[0];
  const clone = (patch) => ({ ...base, ...patch });
  assert.throws(() => defineAircraft(clone({ aero: { ...base.aero, Cma: 0.2 } })), /Cma/);
  assert.throws(() => defineAircraft(clone({ mass: { ...base.mass, empty: -1 } })), /mass/);
  assert.throws(() => defineAircraft(clone({ propulsion: { type: 'rocket' } })), /propulsion/);
  assert.throws(() => defineAircraft(clone({ weapons: [{ id: 'x', type: 'gun', stations: ['nope'] }] })), /unknown station/);
  assert.throws(() => defineAircraft(clone({ aero: { ...base.aero, alphaStall: 0.9 } })), /alphaStall/);
  const { model, ...rest } = base;
  assert.throws(() => defineAircraft(rest), /missing model/);
});
