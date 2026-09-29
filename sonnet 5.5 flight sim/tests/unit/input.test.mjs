import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../../src/input/input.js';
import { ACTIONS, defaultBindings } from '../../src/input/bindings.js';

const rig = () => {
  const target = new EventTarget();
  const input = new Input(target).attach();
  const key = (type, code) => { const e = new Event(type); e.code = code; e.preventDefault = () => {}; target.dispatchEvent(e); };
  return { input, down: (c) => key('keydown', c), up: (c) => key('keyup', c), target };
};
const run = (input, seconds, opts = {}) => { let out; for (let t = 0; t < seconds; t += 1 / 60) out = input.update(1 / 60, opts); return out; };

test('bindings: unique action ids and no key doing two jobs', () => {
  assert.equal(new Set(ACTIONS.map((a) => a.id)).size, ACTIONS.length);
  const map = defaultBindings();
  for (const [code, acts] of map) assert.equal(acts.length, 1, `${code} is bound to ${acts.join(', ')}`);
  for (const a of ACTIONS) assert.ok(a.keys.length && a.label);
});

test('held keys ramp the stick to full deflection and back to center', () => {
  const { input, down, up } = rig();
  down('KeyS');
  const pull = run(input, 0.8);
  assert.ok(pull.pitch > 0.9, `pitch ${pull.pitch}`);
  up('KeyS');
  assert.ok(run(input, 0.8).pitch < 0.05);
  down('KeyA'); down('KeyQ');
  const o = run(input, 0.8);
  assert.ok(o.roll < -0.9 && o.yaw < -0.85);
});

test('opposite keys cancel and invert pitch flips the sign', () => {
  const { input, down } = rig();
  down('KeyA'); down('KeyD');
  assert.ok(Math.abs(run(input, 0.5).roll) < 0.01);
  down('KeyS');
  assert.ok(run(input, 0.8, { invertPitch: true }).pitch < -0.8);
});

test('the throttle is a lever: it stays where it was left', () => {
  const { input, down, up } = rig();
  down('ShiftLeft');
  let t = run(input, 1).throttle;
  up('ShiftLeft');
  assert.ok(t > 0.4 && t < 0.5);
  t = run(input, 2).throttle;
  assert.ok(t > 0.4 && t < 0.5, 'released lever must not move');
  down('Digit9'); input.update(1 / 60, {}); up('Digit9');
  assert.equal(input.throttle, 1);
  down('Digit1'); input.update(1 / 60, {}); up('Digit1');
  assert.equal(input.throttle, 0);
  down('ControlLeft'); assert.equal(run(input, 1).throttle, 0, 'never below idle');
});

test('edge presses are delivered once and holds are tracked', () => {
  const { input, down, up } = rig();
  down('KeyG');
  assert.equal(input.pressed('gear'), true);
  assert.equal(input.pressed('gear'), false);
  assert.equal(input.held('gear'), true);
  up('KeyG');
  assert.equal(input.held('gear'), false);
  down('Space'); assert.equal(input.update(1 / 60, {}).brake, 1);
  up('Space'); assert.equal(input.update(1 / 60, {}).brake, 0);
});

test('two keys on one action release only when both are up', () => {
  const { input, down, up } = rig();
  down('KeyW'); down('ArrowUp');
  up('KeyW');
  assert.equal(input.held('pitchDown'), true);
  up('ArrowUp');
  assert.equal(input.held('pitchDown'), false);
});

test('trim and its reset, and free look decays', () => {
  const { input, down, up } = rig();
  down('Period'); run(input, 1); up('Period');
  assert.ok(input.trim > 0.3);
  down('Slash'); input.update(1 / 60, {}); up('Slash');
  assert.equal(input.trim, 0);
  input.look.x = 1.5; input.look.y = -0.5;
  run(input, 2);
  assert.ok(Math.abs(input.look.x) < 0.05);
});
