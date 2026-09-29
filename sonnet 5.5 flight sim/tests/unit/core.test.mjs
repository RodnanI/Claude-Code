import test from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../../src/core/rng.js';
import { Noise } from '../../src/core/noise.js';
import { quat, mat3, mat4, vec3, attitudeOf } from '../../src/core/math.js';
import { hash2, hash3, hashString, wrapPi, smoothstep, clamp, lerp, mod } from '../../src/core/util.js';
import { Emitter } from '../../src/core/events.js';
import { Rolling } from '../../src/core/perf.js';

test('rng is deterministic, uniform and forkable', () => {
  const a = new Rng(1234), b = new Rng(1234);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
  const r = new Rng(9);
  let sum = 0;
  for (let i = 0; i < 20000; i++) { const v = r.next(); assert.ok(v >= 0 && v < 1); sum += v; }
  assert.ok(Math.abs(sum / 20000 - 0.5) < 0.01);
  assert.notEqual(new Rng(1).fork('a').next(), new Rng(1).fork('b').next());
  assert.equal(new Rng('same').next(), new Rng('same').next());
  const shuffled = new Rng(3).shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...shuffled].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
  const w = new Rng(5);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 5000; i++) counts[w.weighted([['a', 3], ['b', 1]])]++;
  assert.ok(counts.a > counts.b * 2.4 && counts.a < counts.b * 3.6);
});

test('noise is deterministic, bounded and continuous', () => {
  const n = new Noise(77), m = new Noise(77), o = new Noise(78);
  let differs = false;
  for (let i = 0; i < 400; i++) {
    const x = i * 0.37, y = i * 0.91;
    assert.equal(n.n2(x, y), m.n2(x, y));
    assert.equal(n.n3(x, y, i * 0.13), m.n3(x, y, i * 0.13));
    assert.ok(Math.abs(n.n2(x, y)) <= 1.05 && Math.abs(n.n3(x, y, 2)) <= 1.05);
    if (n.n2(x, y) !== o.n2(x, y)) differs = true;
    assert.ok(Math.abs(n.n2(x, y) - n.n2(x + 1e-4, y)) < 0.01, 'discontinuity');
  }
  assert.ok(differs, 'different seeds must give different fields');
});

test('integer hashes are stable across runs', () => {
  assert.equal(hash2(1, 2, 3), hash2(1, 2, 3));
  assert.notEqual(hash2(1, 2, 3), hash2(2, 1, 3));
  assert.equal(hash3(4, 5, 6, 7), hash3(4, 5, 6, 7));
  assert.equal(hashString('fly high'), hashString('fly high'));
  assert.notEqual(hashString('a'), hashString('b'));
});

test('scalar helpers behave at the edges', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(lerp(2, 4, 0.5), 3);
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.ok(Math.abs(wrapPi(3 * Math.PI) - Math.PI) < 1e-9 || Math.abs(wrapPi(3 * Math.PI) + Math.PI) < 1e-9);
  assert.equal(mod(-1, 5), 4);
});

test('quaternions rotate consistently with matrices', () => {
  const q = quat.fromAxisAngle(new Float64Array(4), 0, 1, 0, Math.PI / 2);
  const v = quat.rotate(new Float64Array(3), q, [1, 0, 0]);
  assert.ok(Math.abs(v[0]) < 1e-9 && Math.abs(v[2] + 1) < 1e-9, 'x rotates to -z about +y');
  const m = mat3.fromQuat(new Float64Array(9), q);
  const w = mat3.mulVec(new Float64Array(3), m, 1, 0, 0);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(v[i] - w[i]) < 1e-9);
  const inv = quat.conjugate(new Float64Array(4), q);
  const back = quat.rotate(new Float64Array(3), inv, v);
  assert.ok(Math.abs(back[0] - 1) < 1e-9);
});

test('heading pitch roll round trip through attitudeOf', () => {
  for (const [h, p, r] of [[0, 0, 0], [1.2, 0.3, -0.4], [4.5, -0.6, 0.9], [2.7, 0.0, 1.4]]) {
    const q = quat.fromHeadingPitchRoll(new Float64Array(4), h, p, r);
    const a = attitudeOf(q);
    assert.ok(Math.abs(a.heading - h) < 1e-6, `heading ${a.heading} vs ${h}`);
    assert.ok(Math.abs(a.pitch - p) < 1e-6);
    assert.ok(Math.abs(a.roll - r) < 1e-6);
  }
});

test('mat4 multiply with identity and perspective projection depth ordering', () => {
  const I = mat4.create(), P = mat4.create();
  mat4.perspective(P, 1, 1.5, 0.5, 5000);
  const out = mat4.multiply(mat4.create(), P, I);
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(out[i] - P[i]) < 1e-12);
  const near = mat4.transformPoint ? null : null;
  void near;
  const project = (z) => { const w = P[11] * z + P[15], zz = P[10] * z + P[14]; return zz / w; };
  assert.ok(project(-1) < project(-10) && project(-10) < project(-1000), 'depth grows with distance');
  const v = vec3.cross(vec3.create(), [1, 0, 0], [0, 1, 0]);
  assert.deepEqual([...v], [0, 0, 1]);
});

test('emitter and rolling window', () => {
  const e = new Emitter();
  let n = 0;
  const off = e.on('x', (a) => { n += a; });
  e.emit('x', 2); e.emit('x', 3);
  off(); e.emit('x', 100);
  assert.equal(n, 5);
  const r = new Rolling(4);
  for (const v of [1, 2, 3, 4, 5, 6]) r.push(v);
  assert.equal(r.avg, (3 + 4 + 5 + 6) / 4);
  assert.equal(r.max, 6);
});
