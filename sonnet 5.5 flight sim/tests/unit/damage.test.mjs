import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { WORLD_SEED, NODE_CELLS } from '../../src/world/config.js';
import { DAMAGE, DamageField } from '../../src/world/damage.js';
import { createNodeBuilder } from '../../src/workers/build-node.js';
import { StructureCollider } from '../../src/game/collision.js';
import { Volume } from '../../src/voxel/volume.js';
import { M } from '../../src/voxel/palette.js';

const world = createWorld({ seed: WORLD_SEED });
const heal = () => DAMAGE.clear();

test('a blast digs a bowl with a rim and burns the surface, and clearing it restores the island', () => {
  heal();
  const x = 2400, z = -1900;
  const h0 = world.heightAt(x, z);
  const b = DAMAGE.add({ x, y: h0, z, r: 20, seed: 5 });
  assert.ok(b.rc > 10 && b.D > 3);
  const mid = world.heightAt(x, z), edge = world.heightAt(x + b.rc * 0.9, z);
  assert.ok(mid < h0 - b.D * 0.7, `crater floor ${mid} vs ${h0}`);
  assert.ok(edge > mid, 'the bowl rises toward its rim');
  assert.equal(DAMAGE.mat(x, z), M.SCORCH);
  assert.equal(DAMAGE.mat(x + 400, z), 0, 'far ground is untouched');
  assert.equal(world.heightAt(x + 400, z), world.terrain.heightAt(x + 400, z, 0));
  heal();
  assert.equal(world.heightAt(x, z), h0);
});

test('overlapping blasts do not stack their depth', () => {
  heal();
  const x = 3100, z = 800, h0 = world.heightAt(x, z);
  DAMAGE.add({ x, y: h0, z, r: 14, seed: 1 });
  const one = world.heightAt(x, z);
  DAMAGE.add({ x: x + 2, y: h0, z, r: 14, seed: 2 });
  const two = world.heightAt(x, z);
  assert.ok(two > one - 2.5, `${two} vs ${one}`);
  heal();
});

test('nodes built with a blast differ from the intact ones: lower ground, scorched material, no trees', () => {
  heal();
  const level = 0, cfg = { baseCell: 1, ao: false, sceneryMaxLevel: 3, sceneryDensity: 1 };
  const size = NODE_CELLS * cfg.baseCell * 2 ** level;
  // pick a node on forested ground: scan nodes near the hills until one carries trees
  const builder = createNodeBuilder(world);
  let found = null;
  for (let iz = -14; iz < 6 && !found; iz++) for (let ix = -14; ix < 6 && !found; ix++) {
    const a = builder.build(level, ix, iz, cfg);
    const trees = a.instances.reduce((s, i) => s + i.count, 0);
    if (trees > 200 && a.indexCount > 0) found = { ix, iz, a, trees };
  }
  assert.ok(found, 'no forested node found');
  const cx = (found.ix + 0.5) * size, cz = (found.iz + 0.5) * size;
  DAMAGE.add({ x: cx, y: world.heightAt(cx, cz), z: cz, r: 26, seed: 3 });
  const b = builder.build(level, found.ix, found.iz, cfg);
  const trees = b.instances.reduce((s, i) => s + i.count, 0);
  assert.ok(trees < found.trees, `trees ${trees} vs ${found.trees}`);
  assert.equal(b.scar, true);
  assert.ok(b.rev > 0);
  assert.notEqual(b.indexCount, found.a.indexCount, 'the mesh changed');
  heal();
});

test('carving a tall volume drops what is left standing on nothing, and spares what still touches the ground', () => {
  heal();
  const cell = 1;
  const v = new Volume(20, 40, 20);
  // a tower from the ground up, plus a separate floating slab that was never connected (it must survive)
  v.fillBox(5, 0, 5, 15, 40, 15, M.CONCRETE_BLDG);
  v.fillBox(0, 30, 0, 3, 33, 3, M.STEEL);
  const before = v.count();
  DAMAGE.add({ x: 10, y: 14, z: 10, r: 8, seed: 7 });      // eats the middle of the tower
  const gone = DAMAGE.carveVolume(v, 0, 0, 0, cell, 0);
  assert.ok(gone > 0);
  const after = v.count();
  assert.ok(after < before);
  // everything above the bite is gone (it hung from nothing), the stump and the floating slab remain
  let top = 0;
  for (let y = 0; y < 40; y++) for (let x = 4; x < 16; x++) for (let z = 4; z < 16; z++) if (v.get(x, y, z)) top = Math.max(top, y);
  assert.ok(top < 28, `the tower top should have fallen, highest voxel ${top}`);
  assert.ok(v.get(1, 31, 1) === M.STEEL, 'a piece that was never attached is left alone');
  assert.ok(v.get(10, 2, 6), 'the foundation stands');
  heal();
});

test('the collision shape of a structure follows the damage, and the blast report measures what went', () => {
  heal();
  const col = new StructureCollider(world);
  // a building on the airport: the biggest one near the main runway
  const near = world.structuresIn(-1500, -1500, 1500, 1500, []).filter((d) => d.w > 12 && d.d > 12 && d.kind !== 'tree').sort((a, b) => b.w * b.d - a.w * a.d);
  assert.ok(near.length, 'no structure near the airport');
  const d = near[0];
  const cx = d.x, cz = d.z;
  col._inside(d, cx, d.y + 2, cz);
  const solidBefore = col._shape(d).vol.count();
  const b = DAMAGE.add({ x: cx, y: d.y + 2, z: cz, r: Math.max(d.w, d.d) * 0.7 + 6, seed: 11 });
  const rep = col.blastReport(b);
  assert.ok(rep.some((r) => r.d === d && r.gone > 10), 'the report names the building');
  const solidAfter = col._shape(d).vol.count();
  assert.ok(solidAfter < solidBefore * 0.7, `${solidAfter} of ${solidBefore} voxels left`);
  assert.equal(col.pointSolid(cx, d.y + 2, cz) === d, false, 'the middle of a gutted building is open air');
  heal();
});

test('a worker given the list reproduces the same crater', () => {
  heal();
  DAMAGE.add({ x: 500, y: 20, z: 500, r: 18, seed: 9 });
  const mine = DAMAGE.dh(503, 497);
  const copy = new DamageField();
  copy.setAll(DAMAGE.list.map((e) => ({ x: e.x, y: e.y, z: e.z, r: e.r, seed: e.seed, kind: e.kind })), DAMAGE.rev);
  assert.equal(copy.dh(503, 497), mine);
  assert.equal(copy.rev, DAMAGE.rev);
  heal();
});
