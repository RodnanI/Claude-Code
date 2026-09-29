import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { StructureCollider } from '../../src/game/collision.js';
import { Course, GATE_R, formatTime } from '../../src/game/course.js';

const world = createWorld({});
const collider = new StructureCollider(world);
const course = new Course({ world, models: null, collider });
const t0 = performance.now();
const gates = course.build();
const buildMs = performance.now() - t0;

test('the skyline run is a chain of gates in free air that ends at the tallest tower', () => {
  assert.ok(gates.length >= 6 && gates.length <= 8, `${gates.length} gates`);
  for (const g of gates) {
    assert.ok(!collider.solidAt(g.x, g.y, g.z), 'a gate center is not inside a building');
    assert.ok(g.y > world.heightAt(g.x, g.z, 16) + GATE_R + 10, 'a gate clears the ground');
    assert.ok(Math.abs(Math.hypot(g.nx, g.nz) - 1) < 1e-9, 'a gate has a unit heading');
  }
  for (let i = 1; i < gates.length; i++) {
    const d = Math.hypot(gates[i].x - gates[i - 1].x, gates[i].y - gates[i - 1].y, gates[i].z - gates[i - 1].z);
    assert.ok(d > 120 && d < 2600, `gates ${i} and ${i + 1} are ${d.toFixed(0)} m apart`);
  }
  const tallest = world.structuresIn(-20000, -20000, 20000, 20000, []).sort((a, b) => b.h - a.h)[0];
  assert.equal(gates[gates.length - 1].id, tallest.id, 'the run finishes at the supertall');
  assert.ok(buildMs < 6000, `built in ${buildMs.toFixed(0)} ms`);
});

test('flying through the gates in order finishes the run; a pass outside the ring only counts as a miss', () => {
  const flight = (from, to, out, dt = 0.05, speed = 60) => {
    const n = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / (speed * dt)));
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const ev = course.update(dt, [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u]);
      if (ev) out.push(ev);
    }
  };
  const g0 = gates[0];
  // a pass 2 radii to the side crosses the plane outside the ring
  course.reset();
  const side = [-g0.nz, g0.nx];
  const events = [];
  const off = (k) => [g0.x - g0.nx * 300 + side[0] * GATE_R * 2 * k, g0.y, g0.z - g0.nz * 300 + side[1] * GATE_R * 2 * k];
  course.update(0.05, off(1));
  flight(off(1), [off(1)[0] + g0.nx * 600, g0.y, off(1)[2] + g0.nz * 600], events);
  assert.deepEqual(events.map((e) => e.type), ['miss']);
  assert.equal(course.next, 0);
  // the whole course, through the centers
  course.reset();
  const all = [];
  let prev = [g0.x - g0.nx * 400, g0.y, g0.z - g0.nz * 400];
  course.update(0.05, prev);
  for (const g of gates) {
    const before = [g.x - g.nx * 40, g.y, g.z - g.nz * 40], after = [g.x + g.nx * 40, g.y, g.z + g.nz * 40];
    flight(prev, before, all);
    flight(before, after, all);
    prev = after;
  }
  assert.equal(all.filter((e) => e.type === 'gate').length, gates.length - 1);
  const fin = all[all.length - 1];
  assert.equal(fin.type, 'finish');
  assert.ok(course.finished && fin.time > 30 && fin.time < 600, `finished in ${fin.time}`);
  assert.ok(/^\d\d:\d\d\.\d$/.test(formatTime(fin.time)), formatTime(fin.time));
  assert.equal(course.update(0.05, prev), null, 'nothing happens after the finish');
});

test('only the next three gates are drawn, nearest detail first', () => {
  course.reset();
  const made = [];
  const models = { fromRecipe: (key, recipe, cell) => { made.push([key, cell]); return { gpu: true }; } };
  const c2 = new Course({ world, models, collider });
  c2.gates = gates;
  const list = [];
  c2.emit(list, { pos: [gates[0].x - 800, gates[0].y, gates[0].z] }, 1000);
  assert.equal(list.length, 3);
  assert.ok(made.some(([k]) => k.startsWith('gate:0:')) && made.some(([k]) => k.startsWith('gate:1:')));
  c2.next = gates.length - 1;
  list.length = 0;
  c2.emit(list, { pos: [gates[gates.length - 1].x - 500, gates[gates.length - 1].y, gates[gates.length - 1].z] }, 1000);
  assert.ok(made.some(([k]) => k.startsWith('gate:2:')), 'the last gate has its own look');
});
