import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { drawChart, pickStart, kindLabel, chartAspect } from '../../src/ui/chart.js';
import { SCHEMA_BY_KEY, defaults, sanitize } from '../../src/settings/schema.js';
import { ACTIONS } from '../../src/input/bindings.js';
import { createNodeBuilder } from '../../src/workers/build-node.js';
import { NODE_CELLS } from '../../src/world/config.js';

const world = createWorld({});
const AIRFIELDS = ['airfield/meridian-international', 'airfield/fort-talon', 'airfield/hollerin-hollow'];

test('every airfield hands the hangar chart complete data in world coordinates', () => {
  for (const id of AIRFIELDS) {
    const info = world.airfieldInfo(id);
    assert.ok(info, id);
    const c = info.chart;
    assert.ok(c.runways.length >= 1 && c.frame && Number.isFinite(c.frame.cx), `${id}: runways and frame`);
    assert.ok(info.structures.length > 10, `${id}: ${info.structures.length} structures`);
    for (const d of info.structures) assert.ok(Number.isFinite(d.x) && Number.isFinite(d.z) && d.w > 0 && d.d > 0 && Number.isFinite(d.ang));
    assert.ok(c.aprons.length + c.pads.length + c.taxiways.length + c.routes.length > 2, `${id}: some pavement`);
    assert.ok(info.info.blurb && info.info.features.length >= 2, `${id}: blurb and features`);
    // the runways in the chart are the ones the game knows about
    assert.equal(info.runways.length, c.runways.length);
    for (const r of c.runways) assert.ok(r.u1 > r.u0 && r.w > 10);
  }
  assert.equal(world.airfieldInfo('city/portHalden'), null, 'only airfields have a chart');
});

test('starts are grouped and every group has a name and a valid kind', () => {
  const kinds = new Set(['runway', 'hold', 'apron', 'hangar', 'gate']);
  for (const id of AIRFIELDS) {
    const starts = world.spawns().filter((s) => s.region === id);
    assert.ok(starts.length >= 4, `${id}: only ${starts.length} starts`);
    assert.ok(starts.some((s) => s.kind === 'runway'), `${id}: has a runway start`);
    for (const s of starts) {
      assert.ok(kinds.has(s.kind), `${s.id}: kind ${s.kind}`);
      assert.ok(s.group && s.name, `${s.id}: group and name`);
      assert.ok(s.heading >= 0 && s.heading < 360, `${s.id}: heading ${s.heading}`);
    }
  }
  const ids = world.spawns().map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'start ids are unique');
});

test('chart markers can be picked and the chart keeps a readable shape', () => {
  const hits = [{ id: 'a', x: 50, y: 50, r: 11 }, { id: 'b', x: 60, y: 50, r: 11 }, { id: 'c', x: 300, y: 200, r: 11 }];
  assert.equal(pickStart(hits, 52, 50), 'a');
  assert.equal(pickStart(hits, 59, 50), 'b', 'the nearer of two overlapping markers wins');
  assert.equal(pickStart(hits, 150, 150), null);
  assert.equal(kindLabel('runway'), 'RWY');
  assert.equal(kindLabel('hold'), 'HOLD');
  assert.equal(kindLabel('mystery'), 'START');
  for (const id of AIRFIELDS) {
    const info = world.airfieldInfo(id), starts = world.spawns().filter((s) => s.region === id);
    const a = chartAspect(info, starts);
    assert.ok(a >= 0.4 && a <= 0.8, `${id}: aspect ${a}`);
  }
});

test('the chart draws into a canvas without touching anything but the canvas API', () => {
  const calls = { fills: 0, strokes: 0, text: 0 };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 30 });
      if (k === 'fill' || k === 'fillRect') return () => { calls.fills++; };
      if (k === 'stroke') return () => { calls.strokes++; };
      if (k === 'fillText') return () => { calls.text++; };
      return typeof t[k] === 'undefined' ? () => {} : t[k];
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const canvas = { width: 800, height: 400, clientWidth: 400, getContext: () => ctx };
  for (const id of AIRFIELDS) {
    const info = world.airfieldInfo(id), starts = world.spawns().filter((s) => s.region === id);
    const sel = starts[0].id;
    const { hits } = drawChart(canvas, info, starts, sel, null);
    assert.equal(hits.length, starts.length, `${id}: one marker per start`);
    for (const h of hits) assert.ok(h.x >= -20 && h.x <= 420 && h.y >= -20 && h.y <= 220, `${id}: marker ${h.id} at ${h.x},${h.y} is off the chart`);
  }
  assert.ok(calls.fills > 200 && calls.strokes > 20 && calls.text >= 3);
});

test('the takeoff assist setting exists, defaults to guidance and has a key', () => {
  const s = SCHEMA_BY_KEY.takeoffAssist;
  assert.ok(s && s.type === 'select');
  assert.equal(defaults().takeoffAssist, 'guide');
  assert.equal(sanitize('takeoffAssist', 'auto'), 'auto');
  assert.equal(sanitize('takeoffAssist', 'ludicrous'), undefined);
  assert.ok(ACTIONS.some((a) => a.id === 'assist' && a.keys.includes('KeyT')));
  const codes = ACTIONS.flatMap((a) => a.keys);
  assert.equal(new Set(codes).size, codes.length, 'no key is bound twice');
  assert.equal(defaults().windDir, 90, 'the default breeze blows down the main runway heading');
});

test('the farm at Hollerin Hollow is a clearing: the natural forest keeps out of the yard but not the woods around it', () => {
  const region = world.regionsList.find((r) => r.id === 'airfield/hollerin-hollow');
  assert.ok(region.clearings.length >= 1);
  const builder = createNodeBuilder(world);
  const cfg = { baseCell: 1, ao: true, sceneryMaxLevel: 3, sceneryDensity: 1 };
  const size = NODE_CELLS;
  const c = region.clearings[0];
  let inside = 0, outside = 0;
  for (let ix = Math.floor((c.x - c.r - 60) / size); ix <= Math.floor((c.x + c.r + 60) / size); ix++) {
    for (let iz = Math.floor((c.z - c.r - 60) / size); iz <= Math.floor((c.z + c.r + 60) / size); iz++) {
      for (const inst of builder.build(0, ix, iz, cfg).instances) {
        if (inst.type !== 'trunk') continue;
        const f = new Float32Array(inst.data);
        for (let k = 0; k < inst.count; k++) {
          const x = ix * size + f[k * 6], z = iz * size + f[k * 6 + 2];
          if (Math.hypot(x - c.x, z - c.z) < c.r) inside++; else outside++;
        }
      }
    }
  }
  assert.equal(inside, 0, `${inside} tree trunks stand inside the clearing`);
  assert.ok(outside > 20, `the woods around the clearing must still grow trees (${outside})`);
});
