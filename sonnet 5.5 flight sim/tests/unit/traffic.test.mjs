import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { VEHICLES } from '../../src/generated/registry.js';
import { defineVehicle } from '../../src/traffic/vehicle-def.js';
import { TrafficSystem } from '../../src/traffic/traffic.js';
import { signalGreen, signalPhase } from '../../src/traffic/road-graph.js';
import { Recipe, rasterize } from '../../src/voxel/recipe.js';
import { Rng } from '../../src/core/rng.js';
import { ROAD_KINDS } from '../../src/world/roads/network.js';

const world = createWorld({});
const fakeModels = { fromRecipe: () => null };
const make = (max, seed = 3) => { const t = new TrafficSystem({ world, models: fakeModels, vehicles: VEHICLES, seed }); t.init(); t.setMax(max); return t; };
const METRO = [4300, 100, -8000];

test('vehicle modules are valid, unique and build geometry of the stated size', () => {
  assert.ok(VEHICLES.length >= 8);
  assert.equal(new Set(VEHICLES.map((v) => v.id)).size, VEHICLES.length);
  for (const v of VEHICLES) {
    const r = new Recipe();
    v.build(r, 0, new Rng(1));
    const res = rasterize(r, { cell: 0.2 });
    assert.ok(res && res.vol.count() > 200, `${v.id} is empty`);
    const b = r.bounds(0.2);
    assert.ok(Math.abs(b[3] - b[0] - v.length) / v.length < 0.2, `${v.id}: built length ${(b[3] - b[0]).toFixed(2)} vs ${v.length}`);
    assert.ok(Math.abs(b[5] - b[2] - v.width) / v.width < 0.25, `${v.id}: built width`);
    assert.ok(b[1] >= -0.05 && b[4] < 5, `${v.id}: must sit on the ground and stay under five meters`);
    for (const road of v.roads) assert.ok(ROAD_KINDS[road]);
  }
  assert.throws(() => defineVehicle({ id: 'x' }), /missing/);
  assert.throws(() => defineVehicle({ id: 'x', name: 'x', build() {}, length: 4, width: 2, weight: 1, roads: ['moon'] }), /unknown road/);
});

test('traffic runs without NaN, overlap or runaway counts', () => {
  const t = make(150);
  for (let i = 0; i < 20 * 60; i++) t.update(1 / 20, METRO);
  assert.ok(t.vehicles.length > 130 && t.vehicles.length <= 150, `count ${t.vehicles.length}`);
  let moving = 0;
  for (const v of t.vehicles) {
    assert.ok(Number.isFinite(v.speed) && Number.isFinite(v.x) && Number.isFinite(v.z) && Number.isFinite(v.y), 'non-finite vehicle state');
    assert.ok(v.speed >= 0 && v.speed < 45);
    assert.ok(v.s >= 0 && v.s <= v.edge.len + 0.5);
    if (v.speed > 1) moving++;
  }
  assert.ok(moving > t.vehicles.length * 0.3, `only ${moving} of ${t.vehicles.length} are moving`);
  for (const e of t.graph.edges) {
    for (let i = 1; i < e.veh.length; i++) {
      const a = e.veh[i - 1], b = e.veh[i];
      if (a.lane === b.lane && Math.abs(a.s - b.s) < 1.2) assert.fail(`vehicles overlap on edge ${e.id}`);
    }
  }
});

test('vehicles far from the camera are culled and replaced near the new position', () => {
  const t = make(80, 9);
  for (let i = 0; i < 400; i++) t.update(1 / 20, METRO);
  const far = [-6400, 100, -5600];   // Ironford
  for (let i = 0; i < 800; i++) t.update(1 / 20, far);
  assert.ok(t.vehicles.length >= 50, `only ${t.vehicles.length} vehicles near the new camera`);
  for (const v of t.vehicles) assert.ok(Math.hypot(v.x - far[0], v.z - far[2]) < 900, 'a vehicle survived far outside the cull radius');
  t.setMax(0);
  t.update(1 / 20, far);
  assert.equal(t.vehicles.length, 0, 'lowering the cap to zero removes everything');
});

test('signals never show green to both axes and give amber and an all-red gap', () => {
  const node = { offset: 5 };
  const a = { axis: 0 }, b = { axis: 1 };
  let both = 0, none = 0, ga = 0, gb = 0;
  for (let t = 0; t < 240; t += 0.1) {
    const x = signalGreen(node, a, t), y = signalGreen(node, b, t);
    if (x && y) both++;
    if (!x && !y) none++;
    if (x) ga++;
    if (y) gb++;
  }
  assert.equal(both, 0);
  assert.ok(none > 0 && ga > 0 && gb > 0);
  let amber = 0;
  for (let t = 0; t < 24; t += 0.1) if (signalPhase(node, a, t) === 2) amber++;
  assert.ok(amber > 15 && amber < 35, 'about 2.5 s of amber per cycle');
  assert.ok(Math.abs(ga - gb) < 20, 'both approaches get similar green time');
});

test('cars mostly stop for red lights instead of running them', () => {
  const t = make(120, 21);
  let crossings = 0, violations = 0;
  const seen = new Map();
  for (let i = 0; i < 20 * 120; i++) {
    t.update(1 / 20, METRO);
    for (const v of t.vehicles) {
      const prev = seen.get(v);
      if (prev && prev !== v.edge) {
        const node = prev.b;
        if (node.sig && v.speed > 0) { crossings++; if (signalPhase(node, prev, t.time) === 0 && v.speed > 3.5) violations++; }
      }
      seen.set(v, v.edge);
    }
  }
  assert.ok(crossings > 30, `only ${crossings} intersection crossings observed`);
  assert.ok(violations / crossings < 0.05, `${violations} of ${crossings} crossings were at speed on red`);
});

test('signal masts show the phase the cars obey, are built at every reach, and vanish with traffic off', async () => {
  const { buildSignalHead, signalReach } = await import('../../src/traffic/signal-head.js');
  for (const state of [0, 1, 2]) {
    for (const w of [8, 14, 22]) {
      const r = new Recipe();
      buildSignalHead(r, state, signalReach(w));
      const res = rasterize(r, { cell: 0.1 });
      assert.ok(res && res.vol.count() > 100, `mast state ${state} width ${w} is empty`);
      const b = r.bounds(0.1);
      assert.ok(b[4] > 5.5 && b[4] < 6.5, 'the mast is about six meters tall');
      assert.ok(b[2] < -signalReach(w) + 0.3, 'the arm reaches over the road toward -z');
    }
  }
  const keys = [];
  const models = { fromRecipe: (key) => { keys.push(key); return { gpu: true }; } };
  const t = new TrafficSystem({ world, models, vehicles: VEHICLES, seed: 3 });
  t.init();
  t.setMax(10);
  const node = t.sigNodes.find((n) => Math.hypot(n.x - 4300, n.z + 8000) < 900);
  assert.ok(node, 'the metropolis has signalized intersections');
  const cam = { pos: [node.x + 30, 60, node.z + 30] };
  const list = [];
  t.time = 3.7;
  t.emit(list, cam, 900);
  const masts = keys.filter((k) => k.startsWith('sig:'));
  assert.ok(masts.length >= node.masts.length, 'every approach direction of a nearby signal gets a mast');
  for (const ap of node.masts) assert.ok(masts.some((k) => k.startsWith(`sig:${signalPhase(node, ap, 3.7)}:`)), 'the lit lamp follows signalPhase');
  t.setMax(0);
  keys.length = 0; list.length = 0;
  t.emit(list, cam, 900);
  assert.equal(keys.filter((k) => k.startsWith('sig:')).length, 0, 'no masts when traffic is off');
});
