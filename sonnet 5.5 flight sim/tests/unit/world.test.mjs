import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../../src/world/index.js';
import { REGIONS, KITS, SCENERY } from '../../src/generated/registry.js';
import { SITES, ROUTES, START_AREAS } from '../../src/world/layout.js';
import { RoadGraph } from '../../src/traffic/road-graph.js';
import { M, materialName } from '../../src/voxel/palette.js';
import { createNodeBuilder } from '../../src/workers/build-node.js';
import { makeLodConfig, nodeKey } from '../../src/lod/lod-config.js';
import { NODE_CELLS, WORLD_HALF, WORLD_SEED } from '../../src/world/config.js';

const world = createWorld({});
const Q = Math.PI / 2;

test('every registered region, kit and scenery type is valid and unique', () => {
  assert.ok(REGIONS.length >= 20, `only ${REGIONS.length} regions`);
  assert.equal(new Set(REGIONS.map((r) => r.id)).size, REGIONS.length);
  assert.equal(new Set(KITS.map((k) => k.id)).size, KITS.length);
  assert.equal(new Set(SCENERY.map((s) => s.id)).size, SCENERY.length);
  for (const r of REGIONS) {
    assert.ok(r.bounds[2] > r.bounds[0] && r.bounds[3] > r.bounds[1], r.id);
    assert.ok(r.name && r.kind, r.id);
  }
});

test('the island has one metropolis, two cities, four towns, three airfields and a mountain', () => {
  const kinds = {};
  for (const s of Object.values(SITES)) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  assert.deepEqual(kinds, { metropolis: 1, city: 2, town: 4, airfield: 3, mountain: 1 });
  assert.equal(START_AREAS.length, 3);
  const ids = new Set(REGIONS.map((r) => r.id));
  for (const key of ['metropolis/meridian/downtown', 'city/portHalden', 'city/ironford', 'town/dunmore', 'town/pinecrest', 'town/saltmarsh', 'town/cutbank', 'airfield/meridian-international', 'airfield/fort-talon', 'airfield/hollerin-hollow']) assert.ok(ids.has(key), `missing region ${key}`);
  assert.ok([...ids].filter((i) => i.startsWith('metropolis/meridian/')).length >= 8, 'the metropolis is split over several files');
});

test('every region lays out, references known kits and keeps structures near its bounds', () => {
  let total = 0;
  for (const r of world.regionsList) {
    const L = world.layoutOf(r);
    for (const d of L.structures) {
      assert.ok(world.kits.has(d.kind), `${r.id}: kit ${d.kind}`);
      assert.ok(Number.isFinite(d.x) && Number.isFinite(d.z) && Number.isFinite(d.y), `${r.id}: non-finite placement`);
      const b = r.bounds, pad = 40;
      assert.ok(d.x > b[0] - pad && d.x < b[2] + pad && d.z > b[1] - pad && d.z < b[3] + pad, `${r.id}: structure ${d.kind} outside region`);
      assert.ok(d.w > 0 && d.d > 0 && d.h >= 0);
    }
    for (const p of L.props) assert.ok(world.scenery.has(p.type), `${r.id}: prop ${p.type}`);
    total += L.structures.length;
  }
  assert.ok(total > 8000, `only ${total} structures on the whole island`);
  const lighthouse = world.layoutOf(world.regionsList.find((r) => r.id === 'feature/lighthouse-point'));
  assert.equal(lighthouse.structures.length, 1, 'the lighthouse must stand on land');
});

test('terrain is deterministic and has an ocean, a coast and a mountain', () => {
  const other = createWorld({});
  for (const [x, z] of [[0, 0], [4300, -8000], [-5200, 2200], [9000, 9000], [-12000, -300]]) assert.equal(world.heightAt(x, z, 0), other.heightAt(x, z, 0));
  assert.equal(world.heightAt(-30000, 20000, 0), 0, 'open sea sits at sea level');
  assert.ok(world.heightAt(4300, -8000, 0) > 5, 'the metropolis is on land');
  let peak = 0;
  const m = SITES.corvus;
  for (let dx = -900; dx <= 900; dx += 60) for (let dz = -900; dz <= 900; dz += 60) peak = Math.max(peak, world.heightAt(m.x + dx, m.z + dz, 0));
  assert.ok(peak > 1300 && peak < 1800, `mountain peak ${peak.toFixed(0)} m`);
});

test('all three start areas are on dry land with flat, long runways', () => {
  const spawns = world.spawns();
  assert.ok(spawns.length >= 6);
  const regionsWithSpawns = new Set(spawns.map((s) => s.region));
  assert.equal(regionsWithSpawns.size, 3, 'airport, military base and the strip');
  for (const s of spawns) {
    assert.ok(world.heightAt(s.x, s.z, 0) > 1, `${s.id} is not above sea level`);
    assert.ok(s.heading >= 0 && s.heading < 360);
    if (s.kind !== 'runway') continue;
    const hx = Math.sin((s.heading * Math.PI) / 180), hz = -Math.cos((s.heading * Math.PI) / 180);
    let lo = 1e9, hi = -1e9, prev = null, step = 0;
    for (let d = 0; d <= 450; d += 15) { const h = world.heightAt(s.x + hx * d, s.z + hz * d, 0); lo = Math.min(lo, h); hi = Math.max(hi, h); if (prev !== null) step = Math.max(step, Math.abs(h - prev)); prev = h; }
    if (s.region.includes('hollerin')) assert.ok(hi - lo < 9 && step < 1.2, `${s.id}: the strip may slope but must be smooth (${(hi - lo).toFixed(1)} m, step ${step.toFixed(2)})`);
    else assert.ok(hi - lo < 0.6, `${s.id}: runway relief ${(hi - lo).toFixed(2)} m over 450 m`);
    const sf = world.sampleSurface(s.x + hx * 40, s.z + hz * 40, 1);
    assert.ok(sf.mat && materialName(sf.mat) !== 'UNKNOWN', `${s.id}: no surface material`);
  }
});

test('the road network is one connected island-wide graph', () => {
  const g = new RoadGraph(world);
  assert.ok(g.stats.nodes > 2000 && g.stats.edges > 8000, JSON.stringify(g.stats));
  const seen = new Set();
  let best = 0;
  for (const n of g.nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n]; seen.add(n.id); let c = 0;
    while (stack.length) { const q = stack.pop(); c++; for (const e of q.out) if (!seen.has(e.b.id)) { seen.add(e.b.id); stack.push(e.b); } }
    best = Math.max(best, c);
  }
  assert.ok(best / g.nodes.length > 0.9, `largest component covers ${(100 * best / g.nodes.length).toFixed(0)}%`);
  for (const e of g.edges.slice(0, 3000)) { assert.ok(e.len > 0 && e.rev && e.rev.rev === e); }
  for (const [a, b] of ROUTES.map((r) => [r[0], r[1]])) assert.ok(SITES[a] && SITES[b]);
});

test('no building or prop stands on an inter-city road', () => {
  world.ensureHighways();
  const Qr = Math.PI / 2;
  const segs = world.highway.segments;
  const near = [];
  for (const s of segs) if (Math.hypot(s.ax - 4300, s.az + 8000) < 1500) near.push(s);
  assert.ok(near.length > 5);
  for (const s of near.slice(0, 40)) {
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    for (let t = 0; t <= len; t += 8) {
      const x = s.ax + ((s.bx - s.ax) * t) / len, z = s.az + ((s.bz - s.az) * t) / len;
      for (const d of world.structuresIn(x - 40, z - 40, x + 40, z + 40, [])) {
        if (d.region.startsWith('airfield')) continue;
        const ang = ((d.rot || 0) & 3) * Qr + (d.yaw || 0);
        const c = Math.cos(ang), sn = Math.sin(ang);
        const lx = c * (x - d.x) + sn * (z - d.z), lz = -sn * (x - d.x) + c * (z - d.z);
        assert.ok(!(Math.abs(lx) < d.w / 2 - 0.5 && Math.abs(lz) < d.d / 2 - 0.5), `${d.kind} ${d.id} sits on the ${s.kind}`);
      }
    }
  }
});

test('LOD configuration covers the world and node keys are unique', () => {
  for (const base of [4, 2, 1, 0.5, 0.25]) {
    const c = makeLodConfig({ baseVoxel: base, lodErrorPx: 4, viewDistance: 20000 });
    assert.ok(c.N * c.cell(c.maxLevel) >= WORLD_HALF, `base ${base}`);
    assert.equal(c.size(0), NODE_CELLS * base);
    assert.equal(c.cell(3), base * 8);
  }
  const keys = new Set();
  for (let l = 0; l < 4; l++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) keys.add(nodeKey(l, x, z));
  assert.equal(keys.size, 4 * 49);
});

test('a terrain node builds deterministically, ocean nodes are cheap and structures appear in cities', () => {
  const builder = createNodeBuilder(world);
  const cfg = { baseCell: 1, ao: true, sceneryMaxLevel: 3, sceneryDensity: 1 };
  const cell = 1, size = NODE_CELLS * cell;
  const ix = Math.floor(4300 / size), iz = Math.floor(-8000 / size);
  const a = builder.build(0, ix, iz, cfg), b = builder.build(0, ix, iz, cfg);
  assert.equal(a.vertexCount, b.vertexCount);
  assert.deepEqual(new Uint8Array(a.vertexData, 0, 256), new Uint8Array(b.vertexData, 0, 256));
  assert.ok(a.stats.structures > 0 && a.stats.structQuads > 100, 'the metropolis node must contain buildings');
  const sea = builder.build(0, Math.floor(-30000 / size), Math.floor(20000 / size), cfg);
  assert.ok(sea.vertexCount > 0 && sea.vertexCount < 400, 'open sea is a single tile');
  const coarse = builder.build(4, Math.floor(4300 / (size * 16)), Math.floor(-8000 / (size * 16)), cfg);
  assert.ok(coarse.vertexCount > 0);
  for (let i = 0; i < a.indexCount; i++) if (a.indexData[i] >= a.vertexCount) assert.fail('index out of range');
  assert.equal(WORLD_SEED, 0x2f1a7);
});

test('water is a terrain material and rivers carry water names', () => {
  const s = world.sampleSurface(-30000, 20000, 4);
  assert.match(materialName(s.mat), /WATER/);
  assert.ok(M.WATER_RIVER && M.WATER_LAKE);
});

test('lit streets: coarse asphalt on avenues and streets carries night glow pools, dirt and fine cells never do', async () => {
  const { RoadIndex } = await import('../../src/world/roads/network.js');
  const { M, buildPaletteTexels, PALETTE_FLAGS, FL } = await import('../../src/voxel/palette.js');
  const idx = new RoadIndex();
  idx.add({ ax: 0, az: 0, bx: 600, bz: 0, kind: 'avenue' });
  idx.add({ ax: 0, az: 200, bx: 600, bz: 200, kind: 'lane' });
  idx.add({ ax: 0, az: 400, bx: 600, bz: 400, kind: 'dirt' });
  const count = (z, cell) => { const seen = {}; for (let x = 1; x < 600; x += cell) { const m = idx.paint(x, z, cell); seen[m] = (seen[m] || 0) + 1; } return seen; };
  const av = count(0, 4);
  assert.ok(av[M.ASPHALT_LIT] > 10 && av[M.ASPHALT] > av[M.ASPHALT_LIT], 'pools of light, mostly dark road between them');
  assert.equal(count(0, 0.5)[M.ASPHALT_LIT] || 0, 0, 'fine cells use real lamps, not painted glow');
  assert.equal(count(0, 64)[M.ASPHALT_LIT] || 0, 0, 'very coarse cells stay plain');
  assert.equal(count(200, 4)[M.ASPHALT_LIT] || 0, 0, 'lanes are not lit');
  assert.equal(count(400, 4)[M.ASPHALT_LIT] || 0, 0, 'dirt roads are not lit');
  assert.ok(PALETTE_FLAGS[M.ASPHALT_LIT] & FL.EMISSIVE);
  const tex = buildPaletteTexels(), o = (256 + M.ASPHALT_LIT) * 4;
  assert.ok(tex[o] > tex[o + 2] * 1.4, 'the glow is warm sodium, not the grey of the asphalt');
});

test('no woodland grows on the ground around the paved runways', async () => {
  const { createWorld } = await import('../../src/world/index.js');
  const { M } = await import('../../src/voxel/palette.js');
  const w = createWorld({});
  const bad = new Set([M.FOREST_FLOOR, M.PINE_FLOOR, M.GRASS_LUSH]);
  const cases = [
    { id: 'airport-09R', length: 3000, side: [-200, 150] },
    { id: 'talon-07', length: 3000, side: [-250, 250] },
  ];
  for (const c of cases) {
    const sp = w.spawns().find((q) => q.id === c.id);
    const h = (sp.heading * Math.PI) / 180, fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
    let n = 0, woods = 0;
    for (let t = 50; t < c.length; t += 50) for (let d = c.side[0]; d <= c.side[1]; d += 25) {
      const x = sp.x + fx * t + rx * d, z = sp.z + fz * t + rz * d;
      const s = {};
      const g = w.terrain.sample(x, z, 1, s);
      n++;
      if (bad.has(w.surface.at(x, z, g, 0.02, 1, s))) woods++;
    }
    assert.ok(n > 300);
    assert.equal(woods, 0, `${c.id}: ${woods} of ${n} sample points beside the runway are woodland`);
  }
});
