import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { makeGround } from '../../src/game/ground.js';
import { AircraftEntity } from '../../src/game/aircraft-entity.js';
import { TakeoffAssist, ASSIST_MODES } from '../../src/game/takeoff-assist.js';
import { makeBriefing } from '../../src/game/briefing.js';
import { AIRCRAFT } from '../../src/generated/registry.js';

const world = createWorld({});
const ground = makeGround(world);
const STEP = 1 / 240;
const spec = (id) => AIRCRAFT.find((a) => a.id === id);
const start = (id) => world.spawns().find((s) => s.id === id);

/** Drive the assist the way Game does: 60 Hz updates around 240 Hz physics, a passive player, until done, aborted or out of time. */
function run(planeId, startId, { mode = 'auto', wind = null, seconds = 90, player = null } = {}) {
  const s = start(startId), a = spec(planeId);
  const ent = new AircraftEntity(a, { ground });
  ent.placeOnGround(s.x, s.z, s.heading);
  const m = ent.model;
  if (wind) { const w = ((wind.from + 180) * Math.PI) / 180; m.wind[0] = Math.sin(w) * wind.speed; m.wind[2] = -Math.cos(w) * wind.speed; }
  const game = { flapNotch: 0, input: { throttle: 0, trim: 0 } };
  const assist = new TakeoffAssist(world, ground);
  assist.reset(mode, 0.4);
  const inp = { pitch: 0, roll: 0, yaw: 0, throttle: 0, brake: 0 };
  const out = { calls: [], maxOff: 0, phases: new Set(), crashed: false, done: false, liftoff: null, controlled: 0, ent, assist, game };
  let acc = 0, t = 0;
  for (let f = 0; f < 60 * seconds; f++) {
    const dt = 1 / 60;
    inp.throttle = game.input.throttle; inp.pitch = inp.roll = inp.yaw = 0; inp.brake = 0;
    if (player) player(t, inp, ent);
    assist.update(dt, ent, inp);
    m.input.pitch = inp.pitch; m.input.roll = inp.roll; m.input.yaw = inp.yaw; m.input.throttle = inp.throttle; m.input.brake = inp.brake;
    m.input.flaps = game.flapNotch / 3; m.input.trim = game.input.trim;
    if (assist.controlling) { assist.apply(ent, game); out.controlled++; }
    for (const c of assist.drain()) out.calls.push(c);
    if (assist.handedOver) { game.input.trim = Math.max(-1, Math.min(1, m.c.elev / 0.35)); assist.handedOver = false; out.handover = { trim: game.input.trim, t }; }
    for (acc += dt; acc >= STEP; acc -= STEP) { ent.step(STEP); t += STEP; }
    if (assist.info) { out.phases.add(assist.info.phase); if (m.onGround) out.maxOff = Math.max(out.maxOff, Math.abs(assist.info.v)); }
    if (out.liftoff === null && !m.onGround && m.agl > 0.4) out.liftoff = { t, u: assist.info ? assist.info.u : null };
    if (m.crashed) { out.crashed = true; out.reason = m.crashReason; break; }
    if (assist.info && assist.info.phase === 'done') { out.done = true; break; }
  }
  out.t = t;
  return out;
}

test('runway starts carry the runway they belong to and how much of it lies ahead', () => {
  const s = start('airport-09R');
  assert.equal(s.rwy.name, '09R');
  assert.equal(s.rwy.opposite, '27L');
  assert.equal(s.rwy.length, 3400);
  assert.ok(Math.abs(s.roll - 3300) < 2, `the threshold start is 100 m in: ${s.roll}`);
  assert.equal(start('airport-27L').rwy.opposite, '09R');
  const hold = start('airport-hold-09R');
  assert.equal(hold.rwy.name, '09R');
  assert.equal(hold.roll, 3400, 'a holding point sees the whole runway');
  assert.equal(start('airport-apron').rwy, undefined, 'a ramp start is not on a runway');
  for (const sp of world.spawns()) if (sp.kind === 'runway') assert.ok(sp.roll > 400, `${sp.id} has ${sp.roll} m ahead`);
});

test('the assist finds the runway an aircraft stands on, in the direction it points', () => {
  const assist = new TakeoffAssist(world, ground);
  for (const id of ['airport-09R', 'airport-27L', 'talon-07', 'talon-25', 'hollow-south', 'hollow-north']) {
    const s = start(id);
    const ent = new AircraftEntity(spec('skylark'), { ground });
    ent.placeOnGround(s.x, s.z, s.heading);
    const lu = assist.lineup(ent.model);
    assert.ok(lu, `${id}: no runway found`);
    assert.equal(lu.end, s.runway, `${id}: lined up on ${lu.end}`);
    // turned around, the same spot belongs to the other end
    ent.placeOnGround(s.x, s.z, (s.heading + 180) % 360);
    assert.equal(assist.lineup(ent.model).end, s.rwy.opposite);
  }
  const ramp = start('airport-apron'), ent = new AircraftEntity(spec('skylark'), { ground });
  ent.placeOnGround(ramp.x, ramp.z, ramp.heading);
  assert.equal(assist.lineup(ent.model), null, 'a ramp is not a runway');
});

test('an automatic takeoff completes from every long runway with every aircraft and stays on the runway', () => {
  for (const [plane, id] of [['skylark', 'airport-09R'], ['scrapper', 'airport-09R'], ['shrike', 'airport-09R'], ['skylark', 'talon-25'], ['shrike', 'talon-07']]) {
    const r = run(plane, id);
    assert.ok(r.done, `${plane} at ${id}: ${r.crashed ? r.reason : 'did not finish'}`);
    assert.ok(!r.crashed);
    assert.ok(r.maxOff < 3, `${plane} at ${id}: ${r.maxOff.toFixed(1)} m off the centerline on the ground`);
    for (const ph of ['hold', 'roll', 'rotate', 'climb', 'done']) assert.ok(r.phases.has(ph), `${plane} at ${id} skipped ${ph}`);
    const said = r.calls.map((c) => c.text).join(' | ');
    assert.match(said, /Rotate/); assert.match(said, /Positive rate/); assert.match(said, /Takeoff complete/);
    assert.ok(r.handover && Math.abs(r.handover.trim) <= 1, 'the game is told to trim the aircraft for the handover');
    const lo = r.assist.pilot.liftoffAt;
    assert.ok(lo && lo.u - r.assist.pilot.u0 > 50 && lo.u - r.assist.pilot.u0 < 900, `${plane} at ${id}: the takeoff report has a run of ${lo && lo.u - r.assist.pilot.u0}`);
  }
});

test('landing gear and flaps are put away in the climb', () => {
  const r = run('shrike', 'airport-09R');
  assert.ok(r.done);
  assert.equal(r.ent.model.c.gear < 0.2, true, 'gear is retracting or up');
  assert.equal(r.game.flapNotch, 0, 'flaps are up');
  const sk = run('skylark', 'airport-09R');
  assert.equal(sk.ent.model.c.gear, 1, 'a fixed gear stays');
});

test('an automatic takeoff holds the runway in a crosswind and takes off into the wind', () => {
  const r = run('skylark', 'airport-09R', { wind: { from: 150, speed: 8 } });
  assert.ok(r.done && r.maxOff < 3.5, `crosswind: ${r.maxOff}`);
  const head = run('skylark', 'airport-09R', { wind: { from: 90, speed: 8 } });
  const tail = run('skylark', 'airport-09R', { wind: { from: 270, speed: 5 } });
  assert.ok(head.liftoff.u < tail.liftoff.u - 60, `headwind ${head.liftoff.u} vs tailwind ${tail.liftoff.u}`);
});

test('the short farm strip: the bush plane flies out of it, the jet and the trainer are refused', () => {
  const ok = run('scrapper', 'hollow-north');
  assert.ok(ok.done && !ok.crashed, ok.reason);
  for (const plane of ['shrike', 'skylark']) {
    const r = run(plane, 'hollow-south', { seconds: 6 });
    assert.equal(r.controlled, 0, `${plane}: the assist must not take an aircraft down a strip it cannot use`);
    assert.ok(r.calls.some((c) => /too short/i.test(c.text)), `${plane}: told why`);
    assert.equal(r.assist.mode, 'guide');
  }
});

test('the player taking the controls ends an automatic takeoff at once, and a crash never comes from the assist', () => {
  const r = run('skylark', 'airport-09R', { seconds: 40, player: (t, inp) => { if (t > 9) inp.pitch = 0.8; } });
  assert.ok(r.calls.some((c) => c.key === 'takeover'), 'takeover is announced');
  assert.equal(r.assist.mode, 'guide');
  assert.ok(!r.crashed);
  const before = r.controlled;
  assert.ok(before > 100);
});

test('guidance mode never commands the aircraft', () => {
  const r = run('skylark', 'airport-09R', { mode: 'guide', seconds: 6 });
  assert.equal(r.controlled, 0);
  assert.equal(r.assist.info.phase, 'hold');
  assert.ok(r.assist.info.cue.length > 0);
  assert.ok(Math.abs(r.assist.info.v) < 1);
  const off = run('skylark', 'airport-09R', { mode: 'off', seconds: 3 });
  assert.equal(off.assist.info, null);
});

test('the assist cycles through its modes', () => {
  const a = new TakeoffAssist(world, ground);
  a.reset('off');
  assert.deepEqual([a.cycle(), a.cycle(), a.cycle()], ['guide', 'auto', 'off']);
  assert.deepEqual(ASSIST_MODES, ['off', 'guide', 'auto']);
});

test('the briefing agrees with what the automatic takeoff needs', () => {
  const wind = { from: 90, speed: 0 };
  for (const [plane, id] of [['skylark', 'airport-09R'], ['scrapper', 'hollow-north']]) {
    const b = makeBriefing({ spec: spec(plane), start: start(id), ground, wind });
    assert.equal(b.kind, 'runway');
    assert.ok(b.need > b.roll && b.need < 1000, `${plane} needs ${b.need}`);
    assert.ok(b.avail > b.need, 'these two fit');
    assert.equal(b.verdict.level === 'bad', false);
    const r = run(plane, id, { seconds: 60 });
    assert.ok(r.liftoff.u - (b.rwy.length - b.avail) < b.need + 60, 'the real takeoff lifts off within the briefed distance');
  }
  const jet = makeBriefing({ spec: spec('shrike'), start: start('hollow-south'), ground, wind });
  assert.equal(jet.verdict.level, 'bad');
  assert.ok(jet.need > jet.avail);
  const ramp = makeBriefing({ spec: spec('skylark'), start: start('airport-apron'), ground, wind, runways: world.regionsList.find((r) => r.id === start('airport-apron').region).runways });
  assert.equal(ramp.kind, 'taxi');
  assert.ok(ramp.runways.length >= 2);
  const hold = makeBriefing({ spec: spec('skylark'), start: start('airport-hold-09R'), ground, wind });
  assert.equal(hold.kind, 'runway');
  assert.equal(hold.avail, 3400);
});
