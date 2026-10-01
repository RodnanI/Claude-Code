import test from 'node:test';
import assert from 'node:assert/strict';
import { AIRCRAFT } from '../../src/generated/registry.js';
import { KT } from '../../src/aircraft/flight/model.js';
import { takeoffSpeeds, stallSpeed, windComponents, windVector, makeFrame, simulateTakeoff, runwayVerdict, TakeoffPilot, TAKEOFF_FLAPS } from '../../src/aircraft/flight/takeoff.js';
import { performanceOf, catalogBars, climbRate, rollRate } from '../../src/aircraft/flight/performance.js';
import { silhouette, filled } from '../../src/aircraft/silhouette.js';
import { FlightModel } from '../../src/aircraft/flight/model.js';

const spec = (id) => AIRCRAFT.find((a) => a.id === id);

test('reference speeds order themselves and stay near what the stall speed says', () => {
  for (const a of AIRCRAFT) {
    const s = takeoffSpeeds(a);
    assert.ok(s.vsTo <= s.vs1 + 1e-9, `${a.id}: flaps must not raise the stall speed`);
    assert.ok(s.vr > s.vsTo * 1.05 && s.vr < s.vsTo * 1.25, `${a.id}: rotation speed ${s.vr} vs ${s.vsTo}`);
    assert.ok(s.vClimb > s.vr * 0.95, `${a.id}: the climb speed is not below the rotation speed`);
    assert.ok(Math.abs(stallSpeed(a) - s.vs1) < 1e-9);
    assert.ok(s.vr < a.limits.vne * 0.6, `${a.id}: rotation is far below never-exceed`);
  }
});

test('wind components: head positive into the wind, cross positive from the right', () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  let c = windComponents(90, 10, 90);
  assert.ok(near(c.head, 10) && near(c.cross, 0));
  c = windComponents(270, 10, 90);
  assert.ok(near(c.head, -10) && near(c.cross, 0), 'from behind is a tailwind');
  c = windComponents(180, 8, 90);
  assert.ok(near(c.head, 0) && near(c.cross, 8), 'facing east, wind from the south is from the right');
  c = windComponents(0, 8, 90);
  assert.ok(near(c.cross, -8), 'from the north is from the left');
  // the world wind vector blows toward the opposite side: a wind from the east pushes toward the west (-x)
  const v = windVector(new Float64Array(3), 90, 5);
  assert.ok(v[0] < -4.99 && Math.abs(v[2]) < 1e-9);
});

test('a runway frame has orthogonal along and right axes', () => {
  for (const deg of [0, 35, 90, 200, 350]) {
    const f = makeFrame(10, 20, (deg * Math.PI) / 180);
    assert.ok(Math.abs(f.fx * f.rx + f.fz * f.rz) < 1e-12);
    assert.ok(Math.abs(Math.hypot(f.fx, f.fz) - 1) < 1e-12);
  }
  // heading east: forward is +x, right is +z (south)
  const e = makeFrame(0, 0, Math.PI / 2);
  assert.ok(Math.abs(e.fx - 1) < 1e-12 && Math.abs(e.rz - 1) < 1e-12);
});

test('the automatic takeoff gets every aircraft airborne on pavement and grass without leaving the runway', () => {
  for (const a of AIRCRAFT) {
    for (const surface of ['RUNWAY', 'MOWN_STRIP']) {
      const r = simulateTakeoff(a, { surface, elevation: 60 });
      assert.ok(r.ok, `${a.id} on ${surface}: ${r.reason}`);
      assert.ok(!r.crashed);
      assert.ok(r.roll > 20 && r.roll < r.d50, `${a.id}: lift-off ${r.roll} before the 50 ft point ${r.d50}`);
      assert.ok(r.vLof > takeoffSpeeds(a).vsTo, `${a.id}: lifts off above the stall speed`);
      assert.ok(r.maxOffset < 4, `${a.id}: wandered ${r.maxOffset} m off the centerline`);
    }
  }
});

test('takeoff distances: the light aircraft need a few hundred meters, the jet a little more, and grass costs more than pavement', () => {
  const run = (id, o) => simulateTakeoff(spec(id), o).d50;
  assert.ok(run('scrapper', {}) < 400, 'the bush plane is the shortest');
  assert.ok(run('skylark', {}) > 400 && run('skylark', {}) < 750);
  assert.ok(run('shrike', {}) > 500 && run('shrike', {}) < 1000);
  assert.ok(run('scrapper', {}) < run('skylark', {}));
  for (const id of ['scrapper', 'skylark', 'shrike']) assert.ok(run(id, { surface: 'MOWN_STRIP' }) > run(id, { surface: 'RUNWAY' }) - 1, `${id}: grass is never faster`);
});

test('wind, slope and altitude change the run the way they should', () => {
  const sk = spec('skylark');
  const calm = simulateTakeoff(sk, {}).d50;
  assert.ok(simulateTakeoff(sk, { head: 8 }).d50 < calm * 0.85, 'a headwind shortens the run');
  assert.ok(simulateTakeoff(sk, { head: -4 }).d50 > calm * 1.08, 'a tailwind lengthens it');
  assert.ok(simulateTakeoff(sk, { slope: 0.02 }).d50 > calm * 1.05, 'uphill is longer');
  assert.ok(simulateTakeoff(sk, { slope: -0.02 }).d50 < calm, 'downhill is shorter');
  assert.ok(simulateTakeoff(sk, { elevation: 1500 }).d50 > calm * 1.1, 'thin air is longer');
  const xw = simulateTakeoff(sk, { cross: 7 });
  assert.ok(xw.ok && xw.maxOffset < 5, `a 7 m/s crosswind is held to ${xw.maxOffset} m off the line`);
  const xl = simulateTakeoff(sk, { cross: -7 });
  assert.ok(xl.ok && xl.maxOffset < 5);
});

test('the pilot refuses to fly through an obstacle it cannot clear and stops on a runway that is too short', () => {
  const sh = spec('shrike');
  const r = simulateTakeoff(sh, { surface: 'MOWN_STRIP', length: 500 });
  assert.equal(r.ok, false);
  assert.match(r.reason, /runway/);
  // and it really did stop: no crash reported
  assert.equal(r.crashed, false);
});

test('a guiding pilot follows the player through the phases and never touches the controls', () => {
  const a = spec('skylark');
  const ground = { h: () => 0, surface: () => 'RUNWAY' };
  const m = new FlightModel(a, ground);
  m.pos[1] = 3; m.settleOnGround(Math.PI / 2);
  const pilot = new TakeoffPilot(m, makeFrame(m.pos[0], m.pos[2], Math.PI / 2, 3000), { mode: 'guide' });
  const before = { ...m.input };
  pilot.step(1 / 60);
  assert.equal(pilot.phase, 'hold');
  assert.match(pilot.cue, /throttle/i);
  // the player rolls: the phase follows
  m.input.throttle = 1;
  for (let i = 0; i < 240 * 30 && pilot.phase !== 'rotate' && pilot.phase !== 'climb'; i++) {
    m.input.yaw = Math.max(-1, Math.min(1, -(m.att.heading - Math.PI / 2) * 3 + m.omega[1] * 1.5));
    m.step(1 / 240);
    if (i % 4 === 0) pilot.step(1 / 60);
  }
  assert.equal(pilot.phase, 'rotate');
  assert.equal(pilot.cue, 'ROTATE');
  assert.ok(pilot.drain().some((c) => /rotate/i.test(c.text)), 'the rotate callout is queued');
  assert.equal(m.input.flaps, before.flaps, 'a guiding pilot leaves the flaps alone');
});

test('verdicts grade the margin', () => {
  assert.equal(runwayVerdict(300, 900).level, 'good');
  assert.equal(runwayVerdict(300, 360).level, 'warn');
  assert.equal(runwayVerdict(300, 290).level, 'bad');
  assert.equal(runwayVerdict(Infinity, 900).level, 'bad');
  assert.ok(runwayVerdict(300, 900).ratio > runwayVerdict(300, 500).ratio);
});

test('performance figures separate the aircraft the way their character says', () => {
  const p = Object.fromEntries(AIRCRAFT.map((a) => [a.id, performanceOf(a)]));
  assert.ok(p.shrike.vne > p.skylark.vne && p.skylark.vne > p.scrapper.vne);
  assert.ok(p.shrike.climb > p.skylark.climb * 5, 'the jet climbs far faster than a trainer');
  assert.ok(p.shrike.roll > p.skylark.roll);
  assert.ok(p.scrapper.run < p.skylark.run);
  assert.ok(climbRate(spec('skylark'), { ias: 40 }) > 1.5 && climbRate(spec('skylark'), { ias: 40 }) < 8);
  assert.ok(rollRate(spec('scrapper')) > 20 && rollRate(spec('scrapper')) < 150);
  for (const a of AIRCRAFT) assert.ok(a.difficulty >= 1 && a.difficulty <= 5);
  assert.ok(spec('shrike').difficulty > spec('skylark').difficulty);
});

test('card bars are fractions of the best aircraft in the catalog', () => {
  const bars = catalogBars(AIRCRAFT);
  for (const b of bars.values()) for (const k of ['speed', 'climb', 'roll', 'field']) assert.ok(b[k] >= 0 && b[k] <= 1.0000001, `${k}=${b[k]}`);
  assert.equal(Math.max(...[...bars.values()].map((b) => b.speed)), 1);
  assert.equal(Math.max(...[...bars.values()].map((b) => b.field)), 1, 'the shortest run fills the short field bar');
});

test('silhouettes come from the models and match their real size', () => {
  for (const a of AIRCRAFT) {
    const s = silhouette(a);
    assert.ok(s.length > 4 && s.length < 26 && s.span > 6 && s.span < 26 && s.height > 1.5, `${a.id}: ${s.length} x ${s.span} x ${s.height}`);
    assert.ok(Math.abs(s.span - a.wing.span) < 1 + 0.16 * a.wing.span, `${a.id}: silhouette span ${s.span} vs wing ${a.wing.span}`);
    assert.ok(filled(s.top) > 300 && filled(s.side) > 100);
    assert.equal(s.top.w * s.top.h, s.top.data.length);
    assert.equal(s.side.w * s.side.h, s.side.data.length);
  }
});

test('takeoff flaps are one notch of three', () => { assert.ok(Math.abs(TAKEOFF_FLAPS - 1 / 3) < 0.01); assert.ok(KT > 1.9); });
