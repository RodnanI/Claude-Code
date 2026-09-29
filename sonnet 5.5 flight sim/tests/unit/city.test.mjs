import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { KITS, SCENERY, AMBIENT } from '../../src/generated/registry.js';
import { M, FACADE_INFO, PALETTE_BANK_RGB, PALETTE_RGB, buildPaletteTexels, PALETTE_ROWS, PAT } from '../../src/voxel/palette.js';
import { MeshBuilder } from '../../src/voxel/mesher.js';
import { Recipe, meshRecipe } from '../../src/voxel/recipe.js';
import { Rng } from '../../src/core/rng.js';
import { grid } from '../../src/world/kits/_tower.js';
import { subdivide, faceOf, footprint, snapY, FLOOR } from '../../src/world/regions/_shared/urban.js';
import { AmbientSystem } from '../../src/traffic/ambient.js';
import { StructureCollider } from '../../src/game/collision.js';

const world = createWorld({});

test('facade materials carry a window grid on the 3.6 m floor module and differ between color banks', () => {
  const ids = Object.keys(FACADE_INFO).map(Number);
  assert.ok(ids.length >= 20, 'a real set of facade types');
  for (const id of ids) {
    const f = FACADE_INFO[id];
    assert.ok(f.pat & (PAT.WIN | PAT.RIBS), `facade ${id} draws windows or ribs`);
    assert.ok(Math.abs(f.bay / 1.2 - Math.round(f.bay / 1.2)) < 1e-6, `bay ${f.bay} is a multiple of 1.2 m`);
    assert.ok(Math.abs(f.floor / FLOOR - Math.round(f.floor / FLOOR)) < 1e-6, `floor ${f.floor} is a multiple of ${FLOOR} m`);
    let differ = 0;
    for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) if (PALETTE_BANK_RGB[(b * 256 + id) * 3 + c] !== PALETTE_RGB[id * 3 + c]) { differ++; break; }
    assert.ok(differ >= 2, `facade ${id} has color banks`);
  }
  const tex = buildPaletteTexels();
  assert.equal(tex.length, 256 * PALETTE_ROWS * 4);
  const o = (768 + ids[0]) * 4;
  assert.ok(tex[o] > 0 && tex[o + 1] > 0 && tex[o + 2] > 0, 'pattern row is filled for facade materials');
  assert.ok(tex[(768 + M.BEACON_RED) * 4] & PAT.BLINK, 'aviation lights blink');
});

test('the mesher writes the color bank into the top bits of every vertex', () => {
  const b = new MeshBuilder(16);
  b.setBank(2);
  b.quad(0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 2, M.FAC_BRICK_RED);
  b.setBank(0);
  b.quad(0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 2, M.FAC_BRICK_RED);
  const m = b.finish();
  const i16 = new Int16Array(m.vertexData);
  for (let v = 0; v < 4; v++) assert.equal((i16[v * 4 + 3] >> 14) & 3, 2, 'bank 2 on the first quad');
  for (let v = 4; v < 8; v++) assert.equal((i16[v * 4 + 3] >> 14) & 3, 0, 'bank 0 on the second');
  assert.equal((i16[3] >> 5) & 255, M.FAC_BRICK_RED, 'material survives');
});

test('grid snapping lands walls on world multiples of the bay for every quarter turn', () => {
  for (let rot = 0; rot < 4; rot++) {
    const d = { x: 1234.5, z: -8765.5, rot };
    const g = grid(d);
    const to = (lx, lz) => { const c = [1, 0, -1, 0][rot], s = [0, 1, 0, -1][rot]; return [d.x + lx * c - lz * s, d.z + lx * s + lz * c]; };
    for (const bay of [2.4, 3.6, 4.8]) {
      for (const [lx, lz] of [[-20.3, 11.9], [7.7, -33.1]]) {
        const sx = g.sx(lx, bay), sz = g.sz(lz, bay);
        const [wx] = to(sx, 0), [, wz] = to(0, sz);
        // the axis that local x maps to is world x for rot 0 and 2, world z for 1 and 3
        const ax = rot % 2 === 0 ? to(sx, 0)[0] : to(sx, 0)[1];
        const az = rot % 2 === 0 ? to(0, sz)[1] : to(0, sz)[0];
        assert.ok(Math.abs(ax / bay - Math.round(ax / bay)) < 1e-6, `rot ${rot} bay ${bay}: local x edge ${ax}`);
        assert.ok(Math.abs(az / bay - Math.round(az / bay)) < 1e-6, `rot ${rot} bay ${bay}: local z edge ${az}`);
        assert.ok(Number.isFinite(wx) && Number.isFinite(wz));
      }
    }
  }
});

test('blocks are cut into lots that tile the block, face a street and hold their footprint', () => {
  const rng = new Rng(7);
  const r = { x0: 0, z0: 0, x1: 110, z1: 110, w: 110, d: 110, cx: 55, cz: 55 };
  for (let k = 0; k < 40; k++) {
    const lots = subdivide(rng, r, { min: 30, max: 60, gap: 4 });
    assert.ok(lots.length >= 1);
    let area = 0;
    for (const L of lots) {
      assert.ok(L.x0 >= -1e-6 && L.z0 >= -1e-6 && L.x1 <= 110 + 1e-6 && L.z1 <= 110 + 1e-6);
      assert.ok(L.w >= 25 && L.d >= 25, `lot ${L.w.toFixed(0)} x ${L.d.toFixed(0)} too small`);
      area += L.w * L.d;
      const side = faceOf(rng, r, L);
      assert.ok('NSWE'.includes(side));
      const fp = footprint(L, side, { front: 4, sides: 2, maxW: 60, maxD: 40 });
      const wx = side === 'N' || side === 'S' ? fp.w : fp.d, wz = side === 'N' || side === 'S' ? fp.d : fp.w;
      assert.ok(fp.x - wx / 2 >= L.x0 - 1 && fp.x + wx / 2 <= L.x1 + 1 && fp.z - wz / 2 >= L.z0 - 1 && fp.z + wz / 2 <= L.z1 + 1, 'building inside its lot');
    }
    assert.ok(area <= 110 * 110 + 1 && area > 110 * 110 * 0.6, 'lots cover most of the block');
  }
  assert.equal(snapY(14.4), 14.4);
  assert.ok(Math.abs(snapY(15.9) / FLOOR - Math.round(snapY(15.9) / FLOOR)) < 1e-9);
});

test('every skyline, mid-rise, low-rise and institution kit builds at several voxel sizes', () => {
  const cases = [
    ['skyscraper', { w: 43, d: 43, h: 260 }], ['skyscraper', { w: 36, d: 50, h: 120, style: { fac: 'FAC_RIBBON_STONE', crown: 'helipad', podium: true } }],
    ['tower-deco', { w: 40, d: 40, h: 230 }], ['tower-round', { w: 44, d: 44, h: 200 }], ['tower-twin', { w: 84, d: 40, h: 240 }],
    ['tower-stagger', { w: 48, d: 48, h: 150 }], ['tower-taper', { w: 36, d: 36, h: 280 }], ['supertall', { w: 64, d: 64, h: 520 }],
    ['midrise', { w: 60, d: 40, h: 50, style: { shape: 'U' } }], ['midrise', { w: 60, d: 60, h: 40, style: { shape: 'ring' } }], ['midrise', { w: 50, d: 50, h: 70, style: { shape: 'terrace' } }],
    ['hotel', { w: 50, d: 40, h: 80 }], ['loft', { w: 40, d: 30, h: 29 }], ['garage', { w: 50, d: 40, h: 26 }],
    ['house', { w: 12, d: 9, h: 0, style: { type: 'ranch' } }], ['house', { w: 12, d: 9, h: 0, style: { type: 'colonial' } }], ['house', { w: 10, d: 9, h: 0, style: { type: 'modern' } }],
    ['lowrise', { w: 64, d: 18, h: 12 }], ['school', { w: 60, d: 26, h: 8 }], ['hospital', { w: 50, d: 30, h: 30 }], ['museum', { w: 48, d: 30, h: 24 }],
    ['station', { w: 60, d: 32, h: 20 }], ['mall', { w: 70, d: 40, h: 12 }], ['powerplant', { w: 110, d: 80, h: 60 }],
  ];
  const byId = new Map(KITS.map((k) => [k.id, k]));
  for (const [id, p] of cases) {
    const kit = byId.get(id);
    assert.ok(kit, `kit ${id} is registered`);
    for (let rot = 0; rot < 4; rot += 3) {
      const d = { x: 3600 + rot, z: -7200, y: 14.4, rot, seed: 5, id: `test#${id}`, ...p };
      const r = new Recipe();
      kit.build(d, r, new Rng(11), { M, world });
      assert.ok(r.ops.length > 3, `${id} produced ops`);
      const bb = r.bounds(0);
      assert.ok(bb && bb.every(Number.isFinite), `${id} has finite bounds`);
      if (p.h > 100) assert.ok(bb[4] > p.h * 0.85, `${id} reaches its height (${bb[4].toFixed(0)} of ${p.h})`);
      assert.ok(bb[1] < 0.5 && bb[1] > -12, `${id} is grounded (${bb[1]})`);
      for (const cell of [1, 4]) {
        const mesh = meshRecipe(r, { cell, anchor: [d.x, d.y, d.z], rot, conservative: cell >= 3 });
        assert.ok(mesh && mesh.indexCount > 0, `${id} meshes at ${cell} m`);
      }
    }
  }
  for (const id of ['bench', 'busstop', 'poplar', 'fountain', 'parasol', 'statue', 'billboard', 'steam']) assert.ok(SCENERY.some((s) => s.id === id), `scenery ${id}`);
});

test('the metropolis has a real skyline: supertalls, many towers and every structure on the floor grid', () => {
  let tallest = 0, towers = 0, over200 = 0, structures = 0, bad = 0;
  for (const r of world.regionsList) {
    if (!r.id.startsWith('metropolis/meridian/')) continue;
    for (const d of world.layoutOf(r).structures) {
      structures++;
      tallest = Math.max(tallest, d.h);
      if (d.h > 150 && /^(skyscraper|tower-|supertall)/.test(d.kind)) towers++;
      if (d.h > 200) over200++;
      if (Math.abs(d.y / FLOOR - Math.round(d.y / FLOOR)) > 1e-6 && d.kind !== 'pier' && d.kind !== 'crane') bad++;
    }
  }
  assert.ok(tallest >= 600, `tallest structure ${tallest} m`);
  assert.ok(towers >= 60, `${towers} towers over 150 m`);
  assert.ok(over200 >= 40, `${over200} structures over 200 m`);
  assert.equal(bad, 0, 'structure heights are snapped to the floor grid');
  assert.ok(structures > 2500);
  const kinds = new Set();
  for (const r of world.regionsList) for (const d of world.layoutOf(r).structures) kinds.add(d.kind);
  for (const k of ['skyscraper', 'tower-deco', 'tower-round', 'tower-twin', 'tower-stagger', 'tower-taper', 'supertall', 'midrise', 'hotel', 'loft', 'garage', 'house', 'lowrise', 'school', 'museum', 'powerplant']) assert.ok(kinds.has(k), `no ${k} anywhere on the island`);
});

test('ambient life: sea lanes are open water and the airliner flies a continuous circuit', () => {
  const amb = new AmbientSystem({ world, models: null, defs: AMBIENT, seed: 3 });
  amb.init();
  const kinds = {};
  for (const a of amb.actors) kinds[a.def.id] = (kinds[a.def.id] || 0) + 1;
  assert.ok(kinds['cargo-ship'] >= 4 && kinds.tanker >= 2 && kinds.ferry >= 1 && kinds.sailboat >= 6 && kinds.airliner === 2, JSON.stringify(kinds));
  for (const a of amb.actors.filter((x) => x.kind === 'loop')) {
    const o = {};
    for (let t = 0; t < 3000; t += 137) {
      amb.time = t;
      assert.ok(amb.pose(a, o) && [o.x, o.y, o.z, o.yaw, o.pitch, o.roll].every(Number.isFinite));
      assert.ok(world.heightAt(o.x, o.z, 16) < 2, `${a.def.id} at ${o.x | 0}, ${o.z | 0} is on land`);
    }
  }
  const air = amb.actors.find((x) => x.kind === 'air').track;
  const s = {};
  let prev = null, prevV = null, maxJump = 0, maxDv = 0, ground = 0, airborne = 0;
  for (let t = 0; t < air.period; t += 0.5) {
    const st = air.at(t, s);
    if (!st) { prev = prevV = null; continue; }
    assert.ok([st.x, st.y, st.z, st.yaw].every(Number.isFinite));
    if (prev) {
      const v = Math.hypot(st.x - prev[0], st.y - prev[1], st.z - prev[2]) * 2;
      maxJump = Math.max(maxJump, v);
      if (prevV !== null) maxDv = Math.max(maxDv, Math.abs(v - prevV));
      prevV = v;
    }
    if (st.air) airborne++; else ground++;
    prev = [st.x, st.y, st.z];
  }
  assert.ok(maxJump < 160, `aircraft reaches ${maxJump.toFixed(0)} m/s`);
  assert.ok(maxDv < 32, `speed changes by ${maxDv.toFixed(0)} m/s between samples`);
  assert.ok(ground > 100 && airborne > 100, 'it lands, taxis and takes off');
});

test('collision follows the shape of a tower: the gap between twins and the air above a setback are free', () => {
  const all = world.structuresIn(-20000, -20000, 20000, 20000);
  const col = new StructureCollider(world);
  const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const hit = (x, y, z) => !!col.test({ pos: [x, y, z], rot: I, spec: { skids: [{ p: [0, 0, 0] }] } }, 10);
  const at = (d, lx, ly, lz) => {
    const a = ((d.rot || 0) & 3) * (Math.PI / 2) + (d.yaw || 0), c = Math.cos(a), sn = Math.sin(a);
    return hit(d.x + c * lx - sn * lz, d.y + ly, d.z + sn * lx + c * lz);
  };
  const twin = all.find((d) => d.kind === 'tower-twin');
  assert.ok(twin, 'the world has a twin tower');
  let solid = 0, free = 0;
  for (let lx = -twin.w / 2 + 1; lx < twin.w / 2 - 1; lx += 1) for (let lz = -twin.d / 2 + 1; lz < twin.d / 2 - 1; lz += 1) {
    if (at(twin, lx, twin.h * 0.5, lz)) solid++; else free++;
  }
  assert.ok(solid > 100 && free > 10, `twin footprint mixes solid (${solid}) and free (${free}) air`);
  const taper = all.find((d) => d.kind === 'tower-taper');
  assert.ok(taper, 'the world has a tapering tower');
  assert.ok(at(taper, 0, 8, 0), 'the base of a tapering tower is solid');
  assert.ok(!at(taper, taper.w * 0.4, taper.h - 6, taper.d * 0.4), 'the air beside its crown is free');
});

test('helicopters and the airship fly clear of every structure and the ground under their path', () => {
  const amb = new AmbientSystem({ world, models: null, defs: AMBIENT });
  amb.init();
  const sky = amb.actors.filter((a) => a.kind === 'sky');
  assert.ok(sky.filter((a) => a.def.id === 'helicopter').length >= 3, 'helicopters over the cities');
  assert.equal(sky.filter((a) => a.def.id === 'airship').length, 1);
  const o = {};
  let checked = 0;
  for (const a of sky) {
    for (let t = 0; t < a.loop.period; t += 15) {
      amb.time = t - a.phase;
      assert.ok(amb.pose(a, o) && [o.x, o.y, o.z, o.yaw, o.pitch, o.roll].every(Number.isFinite));
      assert.ok(o.y > world.heightAt(o.x, o.z, 16) + 60, `${a.def.id} at ${o.x | 0}, ${o.z | 0} is above the ground`);
      for (const d of world.structuresIn(o.x - 120, o.z - 120, o.x + 120, o.z + 120)) {
        assert.ok(o.y > d.y + (d.h || 0) + 25, `${a.def.id} at ${o.x | 0}, ${o.y | 0}, ${o.z | 0} clears a ${d.kind} ${(d.y + d.h) | 0} m high`);
      }
      checked++;
    }
  }
  assert.ok(checked > 100, `checked ${checked} poses`);
});
