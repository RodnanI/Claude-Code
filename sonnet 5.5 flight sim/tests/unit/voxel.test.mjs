import test from 'node:test';
import assert from 'node:assert/strict';
import { Volume } from '../../src/voxel/volume.js';
import { meshVolume, MeshBuilder, VERTEX_STRIDE } from '../../src/voxel/mesher.js';
import { Recipe, rasterize, meshRecipe, loftTest } from '../../src/voxel/recipe.js';
import { M, MATERIAL_NAMES, MATERIAL_COUNT, PALETTE_RGB, PALETTE_FLAGS, FL, buildPaletteTexels, materialName } from '../../src/voxel/palette.js';

const count = (r) => (r ? r.vol.count() : 0);

test('palette invariants', () => {
  assert.ok(MATERIAL_COUNT <= 256, 'material ids must fit in 8 bits');
  assert.equal(new Set(MATERIAL_NAMES).size, MATERIAL_NAMES.length, 'material names are unique');
  for (const [name, id] of Object.entries(M)) {
    assert.ok(id > 0 && id < 256, name);
    assert.equal(materialName(id), name);
  }
  const tex = buildPaletteTexels();
  assert.ok(tex.length >= 256 * 4 * 3 || tex.length > 0);
  assert.equal(PALETTE_RGB.length, 256 * 3);
  assert.ok(PALETTE_FLAGS[M.WINDOW_LIT] & FL.EMISSIVE, 'lit windows emit light');
  assert.ok(PALETTE_FLAGS[M.WATER_5] & FL.WATER, 'water is flagged');
});

test('a single voxel meshes to six faces and merges along runs', () => {
  const v = new Volume(1, 1, 1); v.set(0, 0, 0, 5);
  const m = meshVolume(v, { ao: false });
  assert.equal(m.indexCount / 6, 6);
  assert.equal(m.vertexCount, 24);
  const row = new Volume(8, 1, 1); row.fillBox(0, 0, 0, 8, 1, 1, 5);
  assert.equal(meshVolume(row, { ao: false }).indexCount / 6, 6, 'a solid bar is still six merged quads');
  const two = new Volume(2, 1, 1); two.set(0, 0, 0, 5); two.set(1, 0, 0, 6);
  assert.equal(meshVolume(two, { ao: false }).indexCount / 6, 10, 'different materials do not merge across the seam');
});

test('hidden faces are culled', () => {
  const v = new Volume(3, 3, 3); v.fillBox(0, 0, 0, 3, 3, 3, 4);
  assert.equal(meshVolume(v, { ao: false }).indexCount / 6, 6);
  const hollow = v.clone(); hollow.set(1, 1, 1, 0);
  assert.equal(meshVolume(hollow, { ao: false }).indexCount / 6, 12, 'a hole adds its six inner faces');
});

test('vertex layout is eight bytes and indices stay in range', () => {
  const v = new Volume(4, 4, 4); v.fillBox(0, 0, 0, 4, 2, 4, 9); v.fillBox(1, 2, 1, 3, 4, 3, 12);
  const m = meshVolume(v, { ao: true });
  assert.equal(VERTEX_STRIDE, 8);
  assert.ok(m.vertexData.byteLength >= m.vertexCount * VERTEX_STRIDE);
  for (let i = 0; i < m.indexCount; i++) assert.ok(m.indexData[i] < m.vertexCount);
  const i16 = new Int16Array(m.vertexData, 0, m.vertexCount * 4);
  for (let i = 0; i < m.vertexCount; i++) { const w = i16[i * 4 + 3] & 0xffff; assert.ok((w >> 5) === 9 || (w >> 5) === 12); assert.ok((w & 7) < 6); }
  void MeshBuilder;
});

test('recipe boxes rasterize to the expected voxel count', () => {
  const r = new Recipe(); r.box(0, 0, 0, 4, 2, 3, M.CONCRETE);
  assert.equal(count(rasterize(r, { cell: 1 })), 24);
  assert.equal(count(rasterize(r, { cell: 0.5 })), 8 * 24);
  const c = new Recipe(); c.box(0, 0, 0, 4, 4, 4, M.CONCRETE); c.carve(1, 1, 1, 3, 3, 3);
  assert.equal(count(rasterize(c, { cell: 1 })), 64 - 8);
});

test('rasterization is lattice aligned: an anchor shift moves voxels by whole cells', () => {
  const r = new Recipe(); r.box(0, 0, 0, 3, 3, 3, M.CONCRETE);
  const a = rasterize(r, { cell: 1, anchor: [0, 0, 0] }), b = rasterize(r, { cell: 1, anchor: [5, 0, 0] });
  assert.equal(count(a), count(b));
  assert.equal(b.i0 - a.i0, 5);
});

test('quarter rotations and yaw keep the same volume', () => {
  const r = new Recipe(); r.box(-2, 0, -1, 2, 3, 1, M.CONCRETE);
  const base = count(rasterize(r, { cell: 0.5 }));
  assert.equal(count(rasterize(r, { cell: 0.5, rot: 1 })), base);
  const yawed = count(rasterize(r, { cell: 0.25, yaw: 0.6 }));
  assert.ok(Math.abs(yawed - base * 8) / (base * 8) < 0.06, `yaw changed volume: ${yawed} vs ${base * 8}`);
});

test('op detail gating hides fine features at coarse cells only', () => {
  const r = new Recipe(); r.box(0, 0, 0, 4, 4, 4, M.CONCRETE); r.box(1, 4, 1, 2, 4.5, 2, M.STEEL, { md: 0.3 });
  assert.equal(count(rasterize(r, { cell: 1 })), 64);
  assert.ok(count(rasterize(r, { cell: 0.25 })) > 64 * 64);
});

test('thin ops survive coarse cells and paint only recolors solid voxels', () => {
  const r = new Recipe(); r.box(0, 0, 0, 4, 0.02, 4, M.CONCRETE, { thin: true });
  assert.ok(count(rasterize(r, { cell: 0.5 })) > 0);
  const p = new Recipe(); p.box(0, 0, 0, 2, 2, 2, M.CONCRETE); p.paint(-2, 0, -2, 4, 2, 4, () => M.STEEL);
  const res = rasterize(p, { cell: 1 });
  assert.equal(count(res), 8, 'paint must not add voxels');
  let steel = 0; for (const v of res.vol.data) if (v === M.STEEL) steel++;
  assert.equal(steel, 8);
});

test('loft membership matches its stations and can be shrunk', () => {
  const st = [{ a: 0, c1: 0, c2: 0, r1: 1, r2: 1 }, { a: 10, c1: 0, c2: 0, r1: 1, r2: 1 }];
  const inside = loftTest(st, 'x', 0), shrunk = loftTest(st, 'x', -0.5);
  assert.ok(inside(5, 0.9, 0));
  assert.ok(!inside(5, 1.2, 0));
  assert.ok(!shrunk(5, 0.7, 0) && shrunk(5, 0.3, 0));
});

test('meshRecipe applies material remaps', () => {
  const r = new Recipe(); r.box(0, 0, 0, 2, 2, 2, M.AC_WHITE);
  const map = new Uint8Array(256); for (let i = 0; i < 256; i++) map[i] = i; map[M.AC_WHITE] = M.AC_RED;
  const m = meshRecipe(r, { cell: 1, ao: false, remap: map });
  const i16 = new Int16Array(m.vertexData, 0, m.vertexCount * 4);
  for (let i = 0; i < m.vertexCount; i++) assert.equal((i16[i * 4 + 3] & 0xffff) >> 5, M.AC_RED);
});
