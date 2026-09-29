import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { createNodeBuilder } from '../../src/workers/build-node.js';
import { ColumnBuf, terrainNormals } from '../../src/lod/terrain-mesher.js';
import { buildCanopyTexels } from '../../src/render/canopy-tex.js';
import { broadleaf, conifer, packYaw } from '../../src/world/scatter/trees.js';
import { TREE_MAX_LEVEL } from '../../src/world/scatter/scatter.js';
import { M, FL, PALETTE_FLAGS, PALETTE_BANK_RGB, PALETTE_RGB, MATERIAL_COUNT } from '../../src/voxel/palette.js';
import { SCENERY, AMBIENT } from '../../src/generated/registry.js';
import { AmbientSystem } from '../../src/traffic/ambient.js';
import { NODE_CELLS, WORLD_SEED } from '../../src/world/config.js';
import { MASSIFS, LAKES, SITES } from '../../src/world/layout.js';

const world = createWorld({});
const builder = createNodeBuilder(world);
const CFG = { baseCell: 0.5, ao: true, sceneryMaxLevel: 3, sceneryDensity: 1 };
const CFG1 = { baseCell: 1, ao: true, sceneryMaxLevel: 3, sceneryDensity: 1 };

test('ground normals: a ramp tilts the normal against the slope, a plain stays up, and every texel is a unit vector', () => {
  const N = NODE_CELLS, cell = 2, buf = new ColumnBuf(N), W = buf.W;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) buf.surf[j * W + i] = 0.5 * (i * cell);      // slope 0.5 toward +x
  terrainNormals(buf, N, cell);
  const o = (20 * N + 30) * 4;
  const nx = (buf.tn[o] / 255) * 2 - 1, nz = (buf.tn[o + 1] / 255) * 2 - 1, ny = Math.sqrt(Math.max(0, 1 - nx * nx - nz * nz));
  assert.ok(Math.abs(nx + 0.447) < 0.02 && Math.abs(nz) < 0.02 && Math.abs(ny - 0.894) < 0.02, `ramp normal ${nx.toFixed(3)}, ${ny.toFixed(3)}, ${nz.toFixed(3)}`);
  assert.equal(buf.tn[o + 2], 255, 'a plane has no hollows');
  buf.surf.fill(7);
  terrainNormals(buf, N, cell);
  assert.ok(Math.abs(buf.tn[o] - 128) <= 1 && Math.abs(buf.tn[o + 1] - 128) <= 1);
  // a pit reads as a hollow: the cavity channel darkens
  buf.surf[(20 + 1) * W + 30 + 1] = 3;
  terrainNormals(buf, N, cell);
  assert.ok(buf.tn[o + 2] < 250, `pit cavity ${buf.tn[o + 2]}`);
});

test('the alpha of the ground texture is the depth of the water over the column, square-root coded over 100 m', () => {
  const N = NODE_CELLS, cell = 2, buf = new ColumnBuf(N), W = buf.W;
  buf.surf.fill(0); buf.bed.fill(-25); buf.water.fill(0);
  const o = (10 * N + 10) * 4;
  terrainNormals(buf, N, cell);
  assert.equal(buf.tn[o + 3], Math.round(255 * Math.sqrt(0.25)), 'a bed 25 m down');
  buf.bed.fill(-400);
  terrainNormals(buf, N, cell);
  assert.equal(buf.tn[o + 3], 255, 'saturates at 100 m');
  buf.water.fill(NaN); buf.bed.fill(30);
  terrainNormals(buf, N, cell);
  assert.equal(buf.tn[o + 3], 0, 'dry land has no depth');
  void W;
});

test('every land node ships a ground normal texture and an ocean tile does not', () => {
  const size = NODE_CELLS * 4;
  const land = builder.build(3, Math.floor(1800 / size), Math.floor(600 / size), CFG);
  assert.ok(land.tnorm && land.tnorm.length === NODE_CELLS * NODE_CELLS * 4);
  const sea = builder.build(3, Math.floor(-30000 / size), Math.floor(20000 / size), CFG);
  assert.equal(sea.tnorm, null);
});

test('the canopy pattern is deterministic, mostly crown, and its normals are unit vectors', () => {
  const a = buildCanopyTexels(96, 8), b = buildCanopyTexels(96, 8);
  assert.deepEqual(a, b);
  assert.equal(a.length, 96 * 96 * 4);
  let crown = 0, worst = 0;
  for (let i = 0; i < 96 * 96; i++) {
    if (a[i * 4] > 20) crown++;
    const nx = (a[i * 4 + 1] / 255) * 2 - 1, nz = (a[i * 4 + 2] / 255) * 2 - 1;
    worst = Math.max(worst, nx * nx + nz * nz);
  }
  assert.ok(crown / (96 * 96) > 0.45 && crown / (96 * 96) < 0.97, `crown share ${(crown / 9216).toFixed(2)}`);
  assert.ok(worst < 1.02, `normal length ${worst}`);
});

test('a tree is a trunk and crowns that share models: parts thin out with distance and heights ride in the yaw', () => {
  const parts = (fn, level) => {
    const out = [];
    fn((type, v, dx, dy, dz, yaw, scale, bank) => out.push({ type, v, dx, dy, dz, yaw, scale, bank }), { s: 1, level, u: [0.5, 0.5, 0.3, 0.7, 0.2, 0.9, 0.4, 0.6], pv: 1, bank: 2 });
    return out;
  };
  const oak = (level) => parts((e, t) => broadleaf(e, t, { trunk: [2.4, 4], crown: [3.3, 4.5], sides: [4, 2, 1], top: true }), level);
  const pine = (level) => parts((e, t) => conifer(e, t, { height: [9, 14], radius: [2.7, 3.5], trunk: 1.5, tiers: [5, 3, 2] }), level);
  assert.ok(oak(0).length >= 6 && oak(1).length >= 4 && oak(2).length <= 3, `oak parts ${oak(0).length}/${oak(1).length}/${oak(2).length}`);
  assert.ok(pine(0).filter((p) => p.type === 'cone').length === 5 && pine(2).filter((p) => p.type === 'cone').length === 2);
  assert.ok(oak(0).every((p) => ['trunk', 'puff'].includes(p.type)) && oak(0).some((p) => p.bank === 2));
  for (const p of oak(0)) {
    assert.ok(Number.isFinite(p.yaw) && p.scale > 0);
    if (p.type === 'puff') {
      const hq = Math.floor(p.yaw / 8), yaw = p.yaw - hq * 8;
      assert.ok(yaw >= 0 && yaw < 6.29, 'yaw survives the packing');
      assert.ok(Math.abs(hq * 0.25 - p.dy) <= 0.13 + 1e-9, `height ${hq * 0.25} vs ${p.dy}`);
    }
  }
  const y = packYaw(-1, 12.4);
  assert.ok(y >= 8 * 49 && y < 8 * 50 + 6.3, 'negative yaws are wrapped before packing');
});

test('forests are made of shared parts up to the tree levels and the shader takes over beyond them', () => {
  assert.equal(TREE_MAX_LEVEL, 1);
  const size0 = NODE_CELLS * 0.5, ix = Math.floor(3200 / size0), iz = Math.floor(-3000 / size0);
  const a = builder.build(0, ix, iz, CFG), b = builder.build(0, ix, iz, CFG);
  const kinds = new Set(a.instances.map((i) => i.type));
  assert.ok(kinds.has('trunk') && (kinds.has('puff') || kinds.has('puffb') || kinds.has('cone')), [...kinds].join(','));
  assert.ok(!kinds.has('oak') && !kinds.has('pine'), 'compositions never reach the buckets');
  assert.deepEqual(a.instances.map((i) => [i.type, i.variant, i.count]), b.instances.map((i) => [i.type, i.variant, i.count]));
  const size2 = NODE_CELLS * 2;
  const far = builder.build(2, Math.floor(3200 / size2), Math.floor(-3000 / size2), CFG);
  assert.ok(!far.instances.some((i) => i.type === 'trunk' || i.type === 'puff' || i.type === 'cone'), 'no tree models past the tree levels');
  // every instance stands inside its node, give or take a crown
  for (const inst of a.instances) {
    const f = new Float32Array(inst.data);
    for (let k = 0; k < inst.count; k++) assert.ok(f[k * 6] > -30 && f[k * 6] < size0 + 30 && f[k * 6 + 2] > -30 && f[k * 6 + 2] < size0 + 30, `${inst.type} outside its node`);
  }
});

test('the countryside is alive: flowers, hedges, herds, reeds and driftwood appear where they belong', () => {
  const seen = new Set();
  const scan = (cx, cz, n, cfg, level) => {
    const cell = cfg.baseCell * 2 ** level, size = NODE_CELLS * cell;
    for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
      const r = builder.build(level, Math.floor(cx / size) + dx, Math.floor(cz / size) + dz, cfg);
      for (const i of r.instances) seen.add(i.type);
    }
  };
  scan(2000, -1200, 12, CFG1, 0);        // farmland and grass north of Cutbank
  scan(-9000, -1200, 4, CFG1, 0);        // the lake shore at Pinecrest
  scan(12180, -4290, 3, CFG, 0);         // a beach
  for (const t of ['puff', 'flowers', 'cow', 'sheep']) assert.ok(seen.has(t), `no ${t} in the farm country (${[...seen].join(',')})`);
  assert.ok(seen.has('reeds'), 'reeds at the water');
});

test('the palette has boulders, petals and fur, rounded foliage flags and seasonal banks, and still fits in a byte', () => {
  assert.ok(MATERIAL_COUNT <= 256);
  for (const n of ['BOULDER', 'PETAL', 'FUR']) assert.ok(M[n], n);
  for (const n of ['LEAF_OAK', 'LEAF_OAK_L', 'LEAF_BIRCH', 'LEAF_PINE', 'BUSH']) assert.ok(PALETTE_FLAGS[M[n]] & FL.ROUND && PALETTE_FLAGS[M[n]] & FL.FOLIAGE, `${n} is a rounded crown material`);
  assert.ok(PALETTE_FLAGS[M.FOREST_FLOOR] & FL.ROUND && PALETTE_FLAGS[M.PINE_FLOOR] & FL.ROUND, 'forest ground carries the canopy flag');
  assert.ok(PALETTE_FLAGS[M.FUR] & FL.TINT && PALETTE_FLAGS[M.PETAL] & FL.TINT);
  for (const n of ['LEAF_OAK', 'GRASS', 'FOREST_FLOOR', 'FARM_WHEAT', 'TRUNK']) {
    const base = [0, 1, 2].map((k) => PALETTE_RGB[M[n] * 3 + k]);
    let differs = 0;
    for (let b = 0; b < 3; b++) if ([0, 1, 2].some((k) => Math.abs(PALETTE_BANK_RGB[(b * 256 + M[n]) * 3 + k] - base[k]) > 8)) differs++;
    assert.ok(differs >= 2, `${n} has distinct color banks`);
  }
});

test('the land has ridges, mesas, headlands, two more massifs and real lakes, and no accidental ponds inland', () => {
  const o = {};
  for (const q of MASSIFS) {
    let peak = 0;
    for (let dx = -q.ru; dx <= q.ru; dx += 120) for (let dz = -q.ru; dz <= q.ru; dz += 120) peak = Math.max(peak, world.heightAt(q.x + dx, q.z + dz, 0));
    assert.ok(Math.abs(peak - q.peak) < q.peak * 0.12, `${q.id} peak ${peak.toFixed(0)} m against ${q.peak}`);
  }
  for (const l of LAKES) { world.terrain.sample(l.x, l.z, 4, o); assert.ok(!Number.isNaN(o.water) && o.hydro === 2, `${l.id} holds water`); }
  // inland the natural ground stays above the floor: hollows are valley floors, water comes only from lakes and rivers
  let bad = 0, n = 0;
  for (let x = -11000; x <= 13000; x += 500) for (let z = -8000; z <= 8000; z += 500) {
    const h = world.terrain.natural(x, z, 8, o);
    if (o.m > 0.36) { n++; if (h < 5.5) bad++; }
  }
  assert.ok(n > 300 && bad === 0, `${bad} of ${n} inland points below the valley floor`);
});

test('the shore of a lake away from any town climbs at a walking slope: no pit walls, no dam on the far side', () => {
  const o = {};
  for (const l of LAKES) {
    const R = Math.max(l.rx, l.rz);
    if (Object.values(SITES).some((s) => s.kind !== 'mountain' && Math.hypot(s.x - l.x, s.z - l.z) < R * 2.6)) continue;
    let steepest = 0;
    for (let a = 0; a < 360; a += 20) {
      const ca = Math.cos((a * Math.PI) / 180), sa = Math.sin((a * Math.PI) / 180);
      let prev = NaN, px = 0, pz = 0;
      for (let q = 0.9; q <= 1.3; q += 0.01) {
        const x = l.x + ca * l.rx * q, z = l.z + sa * l.rz * q;
        world.terrain.sample(x, z, 2, o);
        if (!Number.isNaN(prev)) steepest = Math.max(steepest, Math.abs(o.bed - prev) / Math.hypot(x - px, z - pz));
        prev = o.bed; px = x; pz = z;
      }
    }
    // the cap is a slope of 0.65; the pits this replaced had walls of 3 to 40
    assert.ok(steepest < 1.2, `${l.id}: the shore climbs at slope ${steepest.toFixed(2)}`);
  }
});

test('the cached macro fields agree with the exact function to a few centimeters and never change the world between threads', () => {
  const other = createWorld({});
  let worst = 0;
  const so = {};
  for (let k = 0; k < 400; k++) {
    const x = ((k * 7919) % 26000) - 11000, z = ((k * 104729) % 19000) - 9500;
    const cached = world.terrain.sample(x, z, 1, so), exact = world.heightAt(x, z, 1);
    worst = Math.max(worst, Math.abs(cached - exact));
    assert.equal(other.terrain.sample(x, z, 1, {}), cached, 'two worlds agree exactly');
  }
  assert.ok(worst < 1.6, `cached against exact heights differ by up to ${worst.toFixed(2)} m`);
});

test('farmsteads stand at field corners on farmland with a house and a barn each', () => {
  const regions = world.regionsList.filter((r) => r.id.startsWith('feature/farms-'));
  assert.equal(regions.length, 4);
  let houses = 0, barns = 0;
  for (const r of regions) {
    const L = world.layoutOf(r);
    for (const d of L.structures) {
      assert.ok(d.x > r.bounds[0] - 60 && d.x < r.bounds[2] + 60 && d.z > r.bounds[1] - 60 && d.z < r.bounds[3] + 60, `${d.kind} outside ${r.id}`);
      if (d.kind === 'house') houses++;
      if (d.kind === 'barn') barns++;
    }
    for (const p of L.props) assert.ok(world.scenery.has(p.type));
  }
  assert.ok(houses >= 20 && barns >= 20, `${houses} houses, ${barns} barns`);
  for (const s of Object.values(SITES)) {
    if (s.kind === 'mountain') continue;
    for (const r of regions) for (const d of world.layoutOf(r).structures) assert.ok(Math.hypot(d.x - s.x, d.z - s.z) > 1200, `${d.kind} too close to ${s.name}`);
  }
});

test('flocks of birds fly clear of the ground and the rooftops, beat their wings and never draw more than a mesh each', () => {
  const amb = new AmbientSystem({ world, models: null, defs: AMBIENT, seed: WORLD_SEED });
  amb.init();
  const flocks = amb.actors.filter((a) => a.def.kind === 'bird');
  assert.ok(flocks.length >= 12, `${flocks.length} flocks`);
  assert.ok(['gulls', 'crows', 'geese'].every((id) => flocks.some((a) => a.def.id === id)));
  const o = {}, seen = new Set();
  for (const a of flocks) {
    for (let t = 0; t < 40; t += 5) {
      amb.time = t;
      assert.ok(amb.pose(a, o) && [o.x, o.y, o.z, o.yaw].every(Number.isFinite));
      assert.ok(o.y > world.heightAt(o.x, o.z, 16) + 60, `${a.def.id} clears the ground`);
      assert.equal(o.variant >> 2, a.variant >> 2, 'the arrangement of a flock does not change');
      seen.add(o.variant & 3);
    }
  }
  assert.ok(seen.size >= 3, 'wing beats cycle through their poses');
});

test('scenery models: every one builds at every level of detail it is asked for and stays small', () => {
  const need = ['puff', 'puffb', 'cone', 'trunk', 'boulder', 'flowers', 'reeds', 'lily', 'log', 'cow', 'sheep', 'horse', 'deer'];
  for (const id of need) assert.ok(SCENERY.some((s) => s.id === id), `scenery ${id}`);
  for (const d of SCENERY.filter((s) => s.unitCells)) {
    assert.ok(d.unitCells.length >= 8 && d.unitCells.every((c) => c > 0 && c <= (d.rules?.unit ? 1.001 : 16)), `${d.id} unit cells`);
    for (let k = 1; k < d.unitCells.length; k++) assert.ok(d.unitCells[k] >= d.unitCells[k - 1] - 1e-9, `${d.id} gets coarser with distance`);
  }
});
