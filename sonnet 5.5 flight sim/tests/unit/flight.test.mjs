import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRCRAFT } from '../../src/generated/registry.js';
import { FlightModel, KT } from '../../src/aircraft/flight/model.js';
import { solveTrim, startAirborne } from '../../src/aircraft/flight/trim.js';
import { Autopilot } from '../../src/aircraft/flight/autopilot.js';
import { isa } from '../../src/aircraft/flight/atmosphere.js';

const DT = 1 / 240;
const byId = Object.fromEntries(AIRCRAFT.map((a) => [a.id, a]));
const SKY = { h: () => -1e6, surface: () => 'GRASS' };
const runway = (name = 'RUNWAY') => ({ h: () => 0, surface: () => name });
const run = (m, seconds, each) => { for (let i = 0; i < seconds / DT; i++) { each && each(i, m); m.step(DT); } };

test('atmosphere follows the standard model', () => {
  const s = isa(0);
  assert.ok(Math.abs(s.rho - 1.225) < 0.001 && Math.abs(s.T - 288.15) < 0.01);
  assert.ok(Math.abs(isa(11000).T - 216.65) < 0.01);
  assert.ok(isa(5000).rho < isa(1000).rho);
});

test('the roster is registered and valid', () => {
  for (const id of ['scrapper', 'shrike', 'skylark']) assert.ok(byId[id], `${id} is part of the roster`);
  assert.equal(Object.keys(byId).length, AIRCRAFT.length, 'aircraft ids are unique');
  for (const a of AIRCRAFT) {
    assert.ok(Object.isFrozen(a));
    assert.ok(a.aero.Cma < 0);
    assert.ok(a.liveries.length >= 1);
  }
});

for (const [id, cases] of Object.entries({ skylark: [[100, 1500], [70, 800]], shrike: [[300, 3000]], scrapper: [[60, 300]] })) {
  for (const [kt, alt] of cases) {
    test(`${id} holds trimmed level flight at ${kt} kt for a minute`, () => {
      const m = new FlightModel(byId[id], SKY);
      const t = startAirborne(m, { x: 0, y: alt, z: 0, heading: 1, ias: kt / KT });
      assert.equal(t.saturated, false);
      let dh = 0, dv = 0;
      run(m, 60, () => { dh = Math.max(dh, Math.abs(m.pos[1] - alt)); dv = Math.max(dv, Math.abs(m.ias * KT - kt)); });
      assert.ok(dh < 30, `altitude wandered ${dh.toFixed(1)} m`);
      assert.ok(dv < 6, `speed wandered ${dv.toFixed(1)} kt`);
      assert.equal(m.crashed, false);
    });
  }
}

test('control signs: pull raises the nose, right stick rolls right, right rudder yaws right', () => {
  const spec = byId.skylark;
  let m = new FlightModel(spec, SKY);
  startAirborne(m, { x: 0, y: 1500, z: 0, heading: 0, ias: 50 });
  m.input.pitch = 0.4; run(m, 1.5);
  assert.ok(m.att.pitch > 0.2, 'nose should rise');
  m = new FlightModel(spec, SKY);
  startAirborne(m, { x: 0, y: 1500, z: 0, heading: 0, ias: 50 });
  m.input.roll = 1; run(m, 1);
  assert.ok(m.att.roll > 0.3, 'right wing should drop');
  m = new FlightModel(spec, SKY);
  startAirborne(m, { x: 0, y: 1500, z: 0, heading: 0, ias: 50 });
  m.input.yaw = 0.6; run(m, 2);
  const h = m.att.heading > Math.PI ? m.att.heading - 2 * Math.PI : m.att.heading;
  assert.ok(h > 0.05, 'heading should increase to the right');
});

test('skylark stalls near its design speed and recovers', () => {
  const m = new FlightModel(byId.skylark, SKY);
  startAirborne(m, { x: 0, y: 1500, z: 0, heading: 0, ias: 45 });
  const ap = new Autopilot(m); ap.alt = 1500; ap.heading = 0; ap.maxClimb = 1;
  let minIas = 999;
  run(m, 60, (i) => { if (i % 4 === 0) ap.step(DT * 4); m.input.throttle = 0; minIas = Math.min(minIas, m.ias * KT); });
  assert.ok(minIas > 44 && minIas < 56, `clean stall speed ${minIas.toFixed(1)} kt`);
  // deliberate stall: full back stick at idle power, then release
  const s = new FlightModel(byId.skylark, SKY);
  startAirborne(s, { x: 0, y: 2000, z: 0, heading: 0, ias: 55 });
  s.input.throttle = 0; s.input.pitch = 1;
  let depth = 0;
  run(s, 12, () => { depth = Math.max(depth, s.stallDepth); });
  assert.ok(depth > 0.3, 'full back stick must reach a real stall');
  s.input.pitch = -0.3;
  run(s, 6);
  assert.ok(s.alpha < 0.3, 'forward stick recovers');
  assert.equal(s.crashed, false);
});

for (const [id, min, max] of [['skylark', 120, 480], ['scrapper', 40, 220], ['shrike', 180, 900]]) {
  test(`${id} takes off inside a sensible ground roll`, () => {
    const spec = byId[id];
    const m = new FlightModel(spec, runway(id === 'scrapper' ? 'GRASS' : 'RUNWAY'));
    m.pos[1] = 5;
    m.settleOnGround(Math.PI / 2);
    assert.ok(m.onGround);
    const rot = { skylark: 52, scrapper: 26, shrike: 80 }[id];
    m.input.throttle = 1; m.input.flaps = 0.3;
    let lift = null;
    run(m, 60, () => {
      let e = Math.PI / 2 - m.att.heading; e = Math.atan2(Math.sin(e), Math.cos(e));
      m.input.yaw = Math.max(-1, Math.min(1, e * 3 + m.omega[1] * 1.5));
      m.input.pitch = m.ias * KT > rot ? (m.att.pitch < 0.16 ? 0.6 : 0.1) : 0;
      if (!lift && m.gearContactCount === 0 && m.agl > 2) lift = m.pos[0];
    });
    assert.ok(lift !== null, 'never lifted off');
    assert.ok(lift > min && lift < max, `${id} ground roll ${lift.toFixed(0)} m`);
    assert.equal(m.crashed, false);
  });
}

test('taildragger rests tail down and tricycles rest level', () => {
  const s = new FlightModel(byId.scrapper, runway('GRASS'));
  s.pos[1] = 5; s.settleOnGround(0);
  assert.ok(s.att.pitch > 0.1 && s.att.pitch < 0.2, `scrapper rest pitch ${s.att.pitch}`);
  const k = new FlightModel(byId.skylark, runway());
  k.pos[1] = 5; k.settleOnGround(0);
  assert.ok(Math.abs(k.att.pitch) < 0.03);
  assert.ok(k.wheels.every((w) => w.contact));
});

test('gentle touchdowns survive and hard ones do not', () => {
  const sink = (id, vs) => {
    const m = new FlightModel(byId[id], runway(id === 'scrapper' ? 'GRASS' : 'RUNWAY'));
    const ias = { skylark: 30, scrapper: 20, shrike: 78 }[id];
    startAirborne(m, { x: 0, y: 0.35 - m.gearBottom, z: 0, heading: Math.PI / 2, ias, flaps: 1 });
    m.vel[1] = vs;
    m._preVy = vs;
    m.input.throttle = 0;
    run(m, 8, () => { if (m.onGround) m.input.brake = 0.5; });
    return m;
  };
  for (const id of ['skylark', 'scrapper', 'shrike']) {
    assert.equal(sink(id, -1.2).crashed, false, `${id} soft landing`);
    const hard = sink(id, -14);
    assert.equal(hard.crashed, true, `${id} hard landing`);
    assert.match(hard.crashReason, /hard landing|structure/);
  }
});

test('shrike fly-by-wire respects the G and alpha limits', () => {
  for (const kt of [300, 450, 600]) {
    const m = new FlightModel(byId.shrike, SKY);
    startAirborne(m, { x: 0, y: 3000, z: 0, heading: 0, ias: kt / KT, gear: 0 });
    m.input.pitch = 1; m.input.throttle = 0.9;
    let g = 0, a = 0;
    run(m, 6, () => { g = Math.max(g, m.gLoad); a = Math.max(a, m.alpha); });
    assert.equal(m.crashed, false, `${kt} kt: ${m.crashReason}`);
    assert.ok(g < 9.8, `${kt} kt peak ${g.toFixed(1)} G`);
    assert.ok(a < byId.shrike.aero.alphaStall + 0.12, `${kt} kt peak alpha ${(a * 57.3).toFixed(1)}`);
  }
});

test('overspeed and over-G break the airframe', () => {
  const m = new FlightModel(byId.skylark, SKY);
  startAirborne(m, { x: 0, y: 2000, z: 0, heading: 0, ias: 60 });
  m.setState({ x: 0, y: 2000, z: 0, heading: 0, pitch: -0.9, speed: 160 });
  m.input.throttle = 1;
  run(m, 10);
  assert.equal(m.crashed, true);
  assert.match(m.crashReason, /airframe failure/);
});

test('flight model is deterministic', () => {
  const runOnce = () => {
    const m = new FlightModel(byId.shrike, SKY);
    startAirborne(m, { x: 100, y: 2000, z: -50, heading: 2, ias: 220 });
    m.input.roll = 0.3; m.input.pitch = 0.2;
    run(m, 5, (i) => { if (i === 600) m.input.roll = -0.5; });
    return [...m.pos, ...m.vel, ...m.q, ...m.omega];
  };
  assert.deepEqual(runOnce(), runOnce());
});

test('trim solver reports saturation when the aircraft cannot sustain a speed', () => {
  const t = solveTrim(byId.skylark, { ias: 100, alt: 0 });
  assert.equal(t.saturated, true);
  const ok = solveTrim(byId.skylark, { ias: 45, alt: 0 });
  assert.equal(ok.saturated, false);
  assert.ok(ok.throttle > 0.1 && ok.throttle < 1);
});

// ------------------------------------------------------------------ every aircraft, the same sanity checks
import { simulateTakeoff, stallSpeed } from '../../src/aircraft/flight/takeoff.js';

for (const spec of AIRCRAFT) {
  test(`${spec.id}: trims at cruise, holds it hands off, takes off and lands softly`, () => {
    const vs = stallSpeed(spec);
    const cruise = Math.max(vs * 1.5, Math.min(vs * 2.2, spec.limits.vne * 0.6));
    const m = new FlightModel(spec, SKY);
    const t = startAirborne(m, { x: 0, y: 2000, z: 0, heading: 1, ias: cruise, gear: spec.gear.retractable ? 0 : 1 });
    assert.equal(t.saturated, false, `cannot hold ${Math.round(cruise * KT)} kt at 2000 m`);
    let dh = 0;
    run(m, 30, () => { dh = Math.max(dh, Math.abs(m.pos[1] - 2000)); });
    assert.ok(dh < 60 && !m.crashed, `${spec.id} wandered ${dh.toFixed(0)} m hands off`);
    const takeoff = simulateTakeoff(spec, { surface: 'RUNWAY' });
    assert.ok(takeoff.ok, `takeoff failed: ${takeoff.reason}`);
    assert.ok(takeoff.d50 < 2200, `needs ${Math.round(takeoff.d50)} m to clear 50 ft`);
    const L = new FlightModel(spec, runway());
    startAirborne(L, { x: 0, y: 0.4 - L.gearBottom, z: 0, heading: Math.PI / 2, ias: stallSpeed(spec, { flaps: 1 }) * 1.3, flaps: 1 });
    L.vel[1] = -0.8; L._preVy = -0.8; L.input.throttle = 0;
    run(L, 40, () => { if (L.onGround) { L.input.brake = 0.6; L.input.pitch = 0.05; L.input.yaw = Math.max(-1, Math.min(1, (Math.PI / 2 - L.att.heading) * 2.5 + L.omega[1])); } });
    assert.equal(L.crashed, false, `landing crashed: ${L.crashReason}`);
  });
}

test('the roster has the right mix: military, private and hillbilly, at least twelve, each with a role and a description', () => {
  assert.ok(AIRCRAFT.length >= 12, `${AIRCRAFT.length} aircraft`);
  for (const c of ['military', 'private', 'homebuilt']) assert.ok(AIRCRAFT.filter((a) => a.category === c).length >= 3, `too few ${c} aircraft`);
  assert.ok(AIRCRAFT.filter((a) => a.weapons.length).length >= 6, 'at least six armed aircraft');
  const orders = AIRCRAFT.map((a) => a.order);
  assert.equal(new Set(orders).size, orders.length, 'order values are unique');
  for (const a of AIRCRAFT) assert.ok(a.role && a.description.length > 60 && a.tags.length >= 3, a.id);
});
