import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRCRAFT } from '../../src/generated/registry.js';
import { MUNITIONS, MUNITION_MODELS, munitionRecipe, resolveWeapon, storesMass } from '../../src/aircraft/munitions.js';
import { rasterize } from '../../src/voxel/recipe.js';
import { Loadout, WeaponSystem } from '../../src/game/weapons.js';
import { AircraftEntity } from '../../src/game/aircraft-entity.js';
import { totalMass } from '../../src/aircraft/base.js';
import { FlightModel } from '../../src/aircraft/flight/model.js';

const FLAT = { h: () => 0, surface: () => 'GRASS' };
const NO_STRUCT = { pointSolid: () => null };
const fx = new Proxy({}, { get: () => () => {} });
const armed = AIRCRAFT.filter((a) => a.weapons.length);

function airborne(spec, { y = 500, speed = 120 } = {}) {
  const ent = new AircraftEntity(spec, { ground: FLAT });
  ent.model.setState({ x: 0, y, z: 0, heading: Math.PI / 2, pitch: 0, speed });
  ent.model.updateChannels();
  ent._snap();
  return ent;
}

function system(blasts) {
  return new WeaponSystem({ ground: FLAT, collider: NO_STRUCT, effects: fx, models: null, explode: (e) => blasts.push(e) });
}

const step = (ws, seconds, ent = null, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) ws.update(dt, ent); };

test('every munition has sane numbers and a model that rasterizes', () => {
  for (const [id, m] of Object.entries(MUNITIONS)) {
    assert.ok(['gun', 'rocket', 'missile', 'bomb'].includes(m.type), id);
    assert.ok(m.blast > 0.5 && m.blast < 80, `${id} blast`);
    if (m.type !== 'gun') assert.ok(m.mass >= 0, `${id} mass`);
    if (m.type === 'rocket' || m.type === 'missile') assert.ok(m.speed > m.speed0 && m.accel > 0 && m.burn > 0, `${id} motor`);
    if (m.type === 'missile') assert.ok(m.turn > 0 && m.range > 1000, `${id} guidance`);
    if (m.type === 'bomb') assert.ok(m.dragK > 0, `${id} drag`);
    if (m.type === 'gun') assert.ok(m.speed > 50 && m.rate > 0 && m.life > 0, `${id} gun`);
    if (m.model) assert.ok(MUNITION_MODELS.includes(m.model), `${id} has no model ${m.model}`);
  }
  for (const model of MUNITION_MODELS) {
    for (const cell of [0.03125, 0.0625, 0.125]) {
      const r = rasterize(munitionRecipe(model), { cell, conservative: true });
      assert.ok(r && r.vol.count() > (cell < 0.05 ? 5 : 0), `${model} is empty at ${cell}`);
      assert.ok(r.vol.nx * cell < 6 && r.vol.ny * cell < 1.7, `${model} is too big`);
    }
  }
});

test('weapons resolve to their munitions and the aircraft carries their mass', () => {
  const shrike = AIRCRAFT.find((a) => a.id === 'shrike');
  const w = resolveWeapon(shrike.weapons.find((q) => q.id === 'pods'));
  assert.equal(w.type, 'rocket');
  assert.equal(w.rounds, 19);
  assert.equal(w.blast, MUNITIONS.hvar.blast);
  const stores = storesMass(shrike);
  assert.ok(stores > 400, `stores ${stores}`);
  assert.equal(new FlightModel(shrike, FLAT).payload, shrike.mass.payload + stores);
  assert.ok(totalMass(shrike) > shrike.mass.empty + shrike.mass.fuel * shrike.fuelDefault + stores - 1);
});

test('every armed aircraft has a loadout whose counts add up', () => {
  assert.ok(armed.length >= 1, `only ${armed.length} armed aircraft`);
  for (const spec of armed) {
    const lo = new Loadout(spec);
    assert.equal(lo.list.length, spec.weapons.length);
    for (let i = 0; i < lo.list.length; i++) assert.ok(lo.remaining(i) > 0, `${spec.id} ${lo.list[i].def.id} starts empty`);
    const seen = new Set();
    for (let i = 0; i < lo.list.length; i++) { seen.add(lo.sel); lo.cycle(); }
    assert.equal(seen.size, lo.list.length);
  }
});

test('a gun stream hits the ground where the nose pointed, and shells are small blasts', () => {
  const spec = AIRCRAFT.find((a) => a.id === 'shrike');
  const ent = airborne(spec, { y: 400, speed: 150 });
  ent.model.setState({ x: 0, y: 400, z: 0, heading: Math.PI / 2, pitch: -0.2, speed: 150 });
  ent._snap();
  const blasts = [], ws = system(blasts);
  ws.attach(ent);
  ws.loadout.sel = 0;
  const before = ws.loadout.remaining();
  for (let i = 0; i < 30; i++) { ws.trigger(ent, true, 1 / 60); ws.update(1 / 60, ent); }
  assert.ok(ws.loadout.remaining() < before - 20, 'the trigger fires rounds');
  step(ws, 4);
  assert.ok(blasts.length > 10, `${blasts.length} impacts`);
  for (const b of blasts) { assert.ok(b.r < 3, 'gun rounds are small'); assert.ok(Math.abs(b.y) < 1.5, 'they land on the ground'); assert.ok(b.x > 600, `ahead of the aircraft, x ${b.x}`); }
});

test('a bomb falls where the sight predicted and goes off with its blast radius; the mass leaves with it', () => {
  const spec = AIRCRAFT.find((a) => a.id === 'shrike');
  const ent = airborne(spec, { y: 600, speed: 160 });
  const blasts = [], ws = system(blasts);
  ws.attach(ent);
  ws.loadout.sel = ws.loadout.list.findIndex((w) => w.def.type === 'bomb');
  const pre = ent.model.payload;
  const pred = ws._predictBomb(ent, ws.loadout.current.def);
  assert.ok(pred && pred.x > 1000, 'a bomb from 600 m at 160 m/s lands well ahead');
  assert.ok(ws.trigger(ent, false, 1 / 60, true));
  assert.equal(ws.trigger(ent, false, 1 / 60, true), false, 'the release is on cooldown');
  assert.equal(ent.extra.store_pylonL2 + ent.extra.store_pylonR2, 1, 'one station is empty');
  assert.equal(ent.model.payload, pre - ws.loadout.current.def.mass);
  step(ws, 30);
  assert.equal(blasts.length, 1);
  const b = blasts[0];
  assert.equal(b.r, MUNITIONS.mk82.blast);
  assert.ok(Math.hypot(b.x - pred.x, b.z - pred.z) < 25, `fell ${Math.hypot(b.x - pred.x, b.z - pred.z).toFixed(1)} m from the prediction`);
  assert.ok(Math.abs(b.y) < 1);
  // a second press drops the other one; a third finds the racks empty
  step(ws, 1);
  assert.ok(ws.trigger(ent, false, 1 / 60, true));
  step(ws, 1);
  assert.equal(ws.trigger(ent, false, 1 / 60, true), false);
});

test('a guided missile flies to the spot the nose designated', () => {
  const spec = AIRCRAFT.find((a) => a.id === 'shrike');
  // rising ground ahead so the nose line meets it: a ramp
  const ramp = { h: (x) => Math.max(0, (x - 800) * 0.25), surface: () => 'GRASS' };
  const ent = new AircraftEntity(spec, { ground: ramp });
  ent.model.setState({ x: 0, y: 150, z: 0, heading: Math.PI / 2, pitch: -0.05, speed: 140 });
  ent.model.updateChannels(); ent._snap();
  const blasts = [], ws = new WeaponSystem({ ground: ramp, collider: NO_STRUCT, effects: fx, models: null, explode: (e) => blasts.push(e) });
  ws.attach(ent);
  ws.loadout.sel = ws.loadout.list.findIndex((w) => w.def.type === 'missile');
  const tgt = ws.designate(ent, 9000);
  assert.ok(tgt, 'the nose line meets the ramp');
  assert.ok(ws.trigger(ent, false, 1 / 60, true));
  step(ws, 25);
  assert.equal(blasts.length, 1);
  assert.ok(Math.hypot(blasts[0].x - tgt.x, blasts[0].z - tgt.z) < 15, `missed by ${Math.hypot(blasts[0].x - tgt.x, blasts[0].z - tgt.z).toFixed(1)} m`);
  assert.equal(blasts[0].r, MUNITIONS.aam.blast);
});

test('a rocket pod empties evenly, one rocket per shot, and each rocket goes off', () => {
  const spec = AIRCRAFT.find((a) => a.id === 'shrike');
  const ent = airborne(spec, { y: 300, speed: 140 });
  ent.model.setState({ x: 0, y: 300, z: 0, heading: Math.PI / 2, pitch: -0.15, speed: 140 });
  ent._snap();
  const blasts = [], ws = system(blasts);
  ws.attach(ent);
  ws.loadout.sel = ws.loadout.list.findIndex((w) => w.def.type === 'rocket');
  const n0 = ws.loadout.remaining();
  let fired = 0;
  for (let i = 0; i < 400 && fired < 6; i++) { if (ws.trigger(ent, true, 1 / 60)) fired++; ws.update(1 / 60, ent); }
  assert.equal(ws.loadout.remaining(), n0 - 6);
  const [a, b] = ws.loadout.current.stations;
  assert.ok(Math.abs(a.rounds - b.rounds) <= 1, 'the pods share the load');
  step(ws, 12);
  assert.equal(blasts.length, 6);
  for (const e of blasts) assert.equal(e.r, MUNITIONS.hvar.blast);
});

test('a cluster bomb opens above the ground into bomblets that each go off', () => {
  const ws = system([]);
  const blasts = [];
  const sys = new WeaponSystem({ ground: FLAT, collider: NO_STRUCT, effects: fx, models: null, explode: (e) => blasts.push(e) });
  const spec = { ...AIRCRAFT.find((a) => a.id === 'shrike') };
  const ent = airborne(spec, { y: 500, speed: 150 });
  sys.attach(ent);
  const w = { def: resolveWeapon({ id: 'c', type: 'bomb', munition: 'cluster', stations: [] }) };
  sys._add(w, 'bomb', 0, 500, 0, [150, 0, 0]);
  step(sys, 20);
  assert.ok(blasts.length >= 10, `${blasts.length} bomblets went off`);
  assert.ok(blasts.every((b) => b.r === MUNITIONS.cluster.blast));
});
