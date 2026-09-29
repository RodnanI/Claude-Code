// Offline geometry budget for a camera pose: selects the LOD nodes exactly as the game does, builds every one of them in
// this process and adds up what the GPU would be asked to draw. No GL, so it is fast and deterministic, and it is the
// fair A/B for "did this change cost performance": node build time, terrain triangles, scenery triangles, draw calls.
// Usage: node tools/budget.mjs [preset] [x z agl heading] [fovDeg]   (defaults: high over Pinecrest)
//        node tools/budget.mjs all            (runs the standard set of views, prints one line each and a total)
import { createWorld } from '../src/world/index.js';
import { createNodeBuilder } from '../src/workers/build-node.js';
import { PRESETS, derive } from '../src/settings/presets.js';
import { makeLodConfig } from '../src/lod/lod-config.js';
import { Frustum, Camera } from '../src/render/camera.js';
import { ModelRegistry } from '../src/render/models.js';
import { Recipe, meshRecipe } from '../src/voxel/recipe.js';
import { Rng } from '../src/core/rng.js';
import { hashString } from '../src/core/util.js';
import { mat4 } from '../src/core/math.js';
import { NODE_CELLS } from '../src/world/config.js';
import { SITES } from '../src/world/layout.js';

const world = createWorld({});
const builder = createNodeBuilder(world);

/** The standard views: [name, x, z, agl, heading]. Chosen to cover forest, farmland, mountain, coast, city and open sea. */
export const VIEWS = [
  ['forest', -9800, -1900, 90, 100],
  ['lake', -9000, -1700, 150, 200],
  ['farmland', 1800, 1400, 110, 20],
  ['mountain', -3600, 4400, 420, 250],
  ['coast', 13000, 4200, 120, 60],
  ['metropolis', 4300, -6600, 260, 0],
  ['highland', -6500, 300, 600, 90],
  ['vista', 800, 2500, 1600, 320],
];

const modelTris = new Map();
function triCount(type, variant, cell, rules) {
  const key = `${type}:${variant}:${cell}`;
  let t = modelTris.get(key);
  if (t !== undefined) return t;
  const def = world.scenery.get(type);
  const r = new Recipe();
  def.build(r, variant, new Rng(hashString(type) ^ (variant * 7919)));
  const mesh = meshRecipe(r, { cell, conservative: cell >= 3 || !!rules?.conservative, ao: true });
  t = mesh && mesh.indexCount ? mesh.indexCount / 3 : 0;
  modelTris.set(key, t);
  return t;
}

export function measure(presetName, x, z, agl, heading, fovDeg = 60, w = 1920, h = 1080) {
  const p = { ...PRESETS[presetName], ...JSON.parse(process.env.OVR || '{}') };
  const d = derive(p);
  const cfg = makeLodConfig(d.lod);
  const cam = new Camera();
  cam.fov = (fovDeg * Math.PI) / 180; cam.width = w; cam.height = h; cam.aspect = w / h;
  const y = world.heightAt(x, z, 0) + agl;
  const hd = (heading * Math.PI) / 180;
  cam.setPose(x, y, z, Math.sin(hd), -0.12, -Math.cos(hd));
  const fr = new Frustum();
  const proj = mat4.create(), vp = mat4.create();
  mat4.perspective(proj, cam.fov * 1.35, cam.aspect, 0.3, cfg.viewDistance * 1.05 + 50);
  mat4.multiply(vp, proj, cam.view);
  fr.setFromVP(vp);
  const leaves = [];
  // the game selects with conservative bounds until a node is built and with its tight bounds afterwards; steady state is what
  // matters for a budget, so every candidate is built once and its exact bounds are used from then on
  const bcfg = { baseCell: cfg.baseCell, ao: cfg.ao, sceneryMaxLevel: cfg.sceneryMaxLevel, sceneryDensity: cfg.sceneryDensity };
  const built = new Map();
  const getBuilt = (level, ix, iz) => {
    const key = level + ':' + ix + ':' + iz;
    let r = built.get(key);
    if (!r) { r = builder.build(level, ix, iz, bcfg); built.set(key, r); }
    return r;
  };
  const visit = (level, ix, iz) => {
    const size = cfg.size(level), x0 = ix * size, z0 = iz * size;
    const [clo, chi] = world.heightRange(x0, z0, size);
    let lo = clo, hi = chi;
    // cheap conservative reject first, then the exact box
    {
      const ox = x0 - cam.pos[0], oy = -cam.pos[1], oz = z0 - cam.pos[2];
      const ax = ox, ay = oy + lo, az = oz, bx = ox + size, by = oy + hi, bz = oz + size;
      const dx = ax > 0 ? ax : bx < 0 ? -bx : 0, dy = ay > 0 ? ay : by < 0 ? -by : 0, dz = az > 0 ? az : bz < 0 ? -bz : 0;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) > cfg.viewDistance * 1.03) return;
      if (!fr.aabb(ax, ay, az, bx, by, bz)) return;
    }
    const r = getBuilt(level, ix, iz);
    const b = r.bounds;
    lo = b[1]; hi = b[4];
    const ox = x0 - cam.pos[0], oy = -cam.pos[1], oz = z0 - cam.pos[2];
    const ax = ox + b[0], ay = oy + lo, az = oz + b[2], bx = ox + b[3], by = oy + hi, bz = oz + b[5];
    const dx = ax > 0 ? ax : bx < 0 ? -bx : 0, dy = ay > 0 ? ay : by < 0 ? -by : 0, dz = az > 0 ? az : bz < 0 ? -bz : 0;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > cfg.viewDistance * 1.03) return;
    if (!fr.aabb(ax, ay, az, bx, by, bz)) return;
    const cell = cfg.cell(level);
    const cellPx = (cell * cam.projScale) / Math.max(dist, 1);
    if (level > 0 && cellPx > cfg.errorPx) {
      for (const [a, b2] of [[0, 0], [1, 0], [0, 1], [1, 1]]) visit(level - 1, ix * 2 + a, iz * 2 + b2);
    } else leaves.push({ level, ix, iz, dist, r });
  };
  for (let iz = -1; iz <= 0; iz++) for (let ix = -1; ix <= 0; ix++) visit(cfg.maxLevel, ix, iz);

  const out = { nodes: leaves.length, terrainTris: 0, structTris: 0, sceneryTris: 0, instances: 0, batches: 0, buildMs: 0, byType: {}, byLevel: {} };
  for (const l of leaves) {
    const r = l.r;
    out.buildMs += r.stats.ms;
    const structTris = r.stats.structQuads * 2;
    out.structTris += structTris;
    out.terrainTris += r.indexCount / 3 - structTris;
    const lv = out.byLevel[l.level] || (out.byLevel[l.level] = { n: 0, ms: 0, tris: 0, inst: 0 });
    lv.n++; lv.ms += r.stats.ms; lv.tris += r.indexCount / 3;
    for (const inst of r.instances) {
      const rules = (world.scenery.get(inst.type) || {}).rules || {};
      const cell = r.cell;
      const mc = rules.fine ? Math.max(cell * 0.25, 0.125) : l.level >= 1 ? cell * 1.5 : cell;
      const t = triCount(inst.type, inst.variant, mc, rules);
      if (!t) continue;
      out.sceneryTris += t * inst.count;
      out.instances += inst.count;
      out.batches++;
      lv.inst += inst.count;
      const bt = out.byType[inst.type] || (out.byType[inst.type] = { n: 0, tris: 0 });
      bt.n += inst.count; bt.tris += t * inst.count;
    }
  }
  out.draws = out.nodes + out.batches;
  out.totalTris = out.terrainTris + out.structTris + out.sceneryTris;
  return out;
}

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n)));

const [a0 = 'high', ...rest] = process.argv.slice(2);
if (process.argv[1] && process.argv[1].endsWith('budget.mjs')) {
  if (a0 === 'all' || rest[0] === 'all') {
    const preset = a0 === 'all' ? (rest[0] || 'high') : a0;
    let tot = { totalTris: 0, terrainTris: 0, sceneryTris: 0, structTris: 0, draws: 0, buildMs: 0, instances: 0, nodes: 0 };
    for (const [name, x, z, agl, hd] of VIEWS) {
      const t0 = Date.now();
      const r = measure(preset, x, z, agl, hd);
      for (const k of Object.keys(tot)) tot[k] += r[k];
      console.log(name.padEnd(11), `nodes ${String(r.nodes).padStart(4)}  draws ${String(r.draws).padStart(5)}  terrain ${fmt(r.terrainTris).padStart(6)}  scenery ${fmt(r.sceneryTris).padStart(6)}  struct ${fmt(r.structTris).padStart(6)}  total ${fmt(r.totalTris).padStart(6)}  inst ${fmt(r.instances).padStart(6)}  build ${(r.buildMs / 1000).toFixed(1)}s`);
      if (process.env.TYPES) console.log('   ', Object.entries(r.byType).sort((a, b) => b[1].tris - a[1].tris).map(([k, v]) => `${k} ${fmt(v.n)}/${fmt(v.tris)}`).join('  '));
      void t0;
    }
    console.log('TOTAL'.padEnd(11), `nodes ${String(tot.nodes).padStart(4)}  draws ${String(tot.draws).padStart(5)}  terrain ${fmt(tot.terrainTris).padStart(6)}  scenery ${fmt(tot.sceneryTris).padStart(6)}  struct ${fmt(tot.structTris).padStart(6)}  total ${fmt(tot.totalTris).padStart(6)}  inst ${fmt(tot.instances).padStart(6)}  build ${(tot.buildMs / 1000).toFixed(1)}s`);
  } else {
    const [x = -9800, z = -1900, agl = 90, heading = 100, fov = 60] = rest.map(Number);
    const r = measure(a0, x, z, agl, heading, fov);
    console.log(JSON.stringify({ ...r, byType: undefined, terrainTris: fmt(r.terrainTris), sceneryTris: fmt(r.sceneryTris), structTris: fmt(r.structTris), totalTris: fmt(r.totalTris) }));
    console.log('levels', JSON.stringify(r.byLevel));
    console.log('types', Object.entries(r.byType).sort((a, b) => b[1].tris - a[1].tris).map(([k, v]) => `${k} ${fmt(v.n)}/${fmt(v.tris)}`).join('  '));
  }
}
void SITES; void NODE_CELLS; void ModelRegistry;
