import test from 'node:test';
import assert from 'node:assert/strict';
import { skyRadiance, sunTransmittance } from '../../src/render/atmosphere.js';
import { Environment } from '../../src/render/sky.js';
import { gradePixel, GRADES, bakeLUT } from '../../src/render/grade.js';

const lum = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
const dirAt = (sun, elev, away) => {
  const hs = Math.hypot(sun[0], sun[2]) || 1, s = away ? -1 : 1;
  return [s * (sun[0] / hs) * Math.cos(elev), Math.sin(elev), s * (sun[2] / hs) * Math.cos(elev)];
};
const env = (hour) => { const e = new Environment(); e.setHour(hour); return e; };

test('a clear noon sky is blue overhead and pale toward the horizon', () => {
  const e = env(12);
  const zen = skyRadiance([0, 1, 0], e.sunTrue, 900, 30);
  const hor = skyRadiance(dirAt(e.sunTrue, 0.015, true), e.sunTrue, 900, 30);
  assert.ok(zen[2] > zen[0] * 2.5, 'zenith is strongly blue');
  assert.ok(hor[2] > hor[0] * 1.2 && hor[2] < hor[0] * 2.4, 'horizon is pale blue, not saturated and not yellow');
  assert.ok(Math.abs(hor[2] - hor[1]) < hor[1] * 0.25, 'horizon blue and green are close');
  assert.ok(lum(hor) > lum(zen) * 3, 'the horizon is much brighter than the zenith');
});

test('the horizon toward a low sun is warm and bright', () => {
  const e = env(17.5);
  const toward = skyRadiance(dirAt(e.sunTrue, 0.015, false), e.sunTrue, 900, 30);
  const away = skyRadiance(dirAt(e.sunTrue, 0.015, true), e.sunTrue, 900, 30);
  assert.ok(toward[0] > toward[2] * 2.5, 'sunset glow is orange');
  assert.ok(lum(toward) > lum(away) * 2, 'the sun side is brighter');
});

test('sky radiance is finite and non-negative for any direction, and black at night', () => {
  const e = env(12);
  for (let el = -1.4; el <= 1.5; el += 0.35) for (let az = 0; az < 6.3; az += 1.1) {
    const r = skyRadiance([Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)], e.sunTrue, 500, 30);
    for (const v of r) assert.ok(Number.isFinite(v) && v >= 0, `bad radiance at el ${el} az ${az}`);
  }
  const n = env(23);
  assert.ok(lum(skyRadiance([0, 1, 0], n.sunTrue, 500, 30)) < 0.01);
});

test('sunlight reddens and dims as the sun sinks, and never gains energy', () => {
  let prev = null;
  for (const el of [1.2, 0.8, 0.5, 0.25, 0.1, 0.03]) {
    const sun = [Math.cos(el), Math.sin(el), 0];
    const t = sunTransmittance([0, 6360002, 0], sun);
    for (const v of t) assert.ok(v > 0 && v <= 1);
    assert.ok(t[0] >= t[1] && t[1] >= t[2], 'red passes best, blue worst');
    if (prev) for (let k = 0; k < 3; k++) assert.ok(t[k] <= prev[k] + 1e-9, 'transmittance falls as the sun sinks');
    prev = t;
  }
});

test('moonlight is a sliver of daylight and the night flags are set', () => {
  const day = env(12), night = env(23);
  assert.ok(lum(night.sunColor) < lum(day.sunColor) * 0.05);
  assert.ok(lum(night.ambSky) < lum(day.ambSky) * 0.1);
  assert.ok(night.night > 0.99 && day.night === 0);
});

test('the cinematic grade keeps true blacks dark and does not clip a bright sky', () => {
  const dark = gradePixel(1e-5, 1e-5, 1e-5, GRADES.cinematic);
  for (const v of dark) assert.ok(v < 0.09, 'blacks must not be milky');
  const sky = gradePixel(0.7, 0.9, 0.95, GRADES.cinematic);
  for (const v of sky) assert.ok(v < 0.99);
  assert.ok(sky[2] >= sky[0], 'a pale blue sky stays blue after grading');
});

test('the baked LUT is monotone along the gray diagonal', () => {
  const size = 16, lut = bakeLUT('cinematic', size);
  let prev = -1;
  for (let i = 0; i < size; i++) {
    const o = (i * size * size + i * size + i) * 4;
    const l = lut[o] + lut[o + 1] + lut[o + 2];
    assert.ok(l >= prev, `LUT gray ramp must not decrease at ${i}`);
    prev = l;
  }
});
