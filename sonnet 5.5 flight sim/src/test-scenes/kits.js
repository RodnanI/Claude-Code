// Building showcase: structures on a flat pad, inspected with the full renderer. Test scene, not part of the game flow.
// /?items=[["skyscraper",{"w":40,"d":40,"h":250,"seed":3}],...]&cols=3&gap=110&az=35&el=18&dist=500&preset=high&hour=15
import { Renderer } from '../render/renderer.js';
import { NodeManager } from '../lod/node-manager.js';
import { ModelRegistry } from '../render/models.js';
import { Environment } from '../render/sky.js';
import { createWorld } from '../world/index.js';
import { defineRegion } from '../world/region.js';
import { KITS, SCENERY } from '../generated/registry.js';
import { PRESETS, derive } from '../settings/presets.js';
import { WORLD_SEED } from '../world/config.js';
import { M } from '../voxel/palette.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl');
document.getElementById('boot').remove();
const preset = params.get('preset') || 'high';
const s = { ...PRESETS[preset] };
for (const [k, v] of params) if (k in s && k !== 'preset') s[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
const d = derive(s);
const renderer = new Renderer(canvas, {});
renderer.configure(d.render);

const items = JSON.parse(params.get('items') || '[["skyscraper",{"w":44,"d":44,"h":260,"seed":1}]]');
const cols = +(params.get('cols') || Math.ceil(Math.sqrt(items.length)));
const gap = +(params.get('gap') || 110);
const PAD_Y = 21.6;
const rows = Math.ceil(items.length / cols);
const half = Math.max(400, (Math.max(cols, rows) * gap) / 2 + 200);

const stage = defineRegion({
  id: 'test/stage', name: 'Stage', kind: 'feature', bounds: [-half, -half, half, half], maxHeight: 900,
  terrain: () => ({ flatten: [{ type: 'rect', cx: 0, cz: 0, hw: half, hd: half, rot: 0, blend: 400, y: PAD_Y, order: 5 }] }),
  paint: (x, z, cell) => (x > -half && x < half && z > -half && z < half ? (((Math.floor(x / 10) + Math.floor(z / 10)) & 1) || cell > 6 ? M.PAVER : M.PAVER_DARK) : 0),
  layout(ctx) {
    const out = { structures: [], props: [], lots: [], roads: [] };
    items.forEach(([kind, p], i) => {
      const cx = ((i % cols) - (cols - 1) / 2) * gap, cz = (Math.floor(i / cols) - (rows - 1) / 2) * gap;
      out.structures.push(ctx.kit(kind, { x: cx, z: cz, w: 30, d: 30, h: 30, ...p }));
    });
    return out;
  },
});

const world = createWorld({ seed: WORLD_SEED, regions: [stage], kits: KITS, scenery: SCENERY, highways: false });
const models = new ModelRegistry(renderer, world);
// workers build their own default world, so the stage is built on the main thread
const nodes = new NodeManager({ renderer, models, world, seed: WORLD_SEED, settings: d.lod, inline: true, inlineBurst: 48 });
const env = new Environment();
env.setHour(+(params.get('hour') || 14));
env.cover = +(params.get('cover') || 0.35);

const cam = renderer.camera;
const az = (+(params.get('az') || 35) * Math.PI) / 180, el = (+(params.get('el') || 18) * Math.PI) / 180;
const dist = +(params.get('dist') || 500);
const tx = +(params.get('tx') || 0), tz = +(params.get('tz') || 0), ty = +(params.get('ty') || PAD_Y + 60);
cam.fov = (+(params.get('fov') || 50) * Math.PI) / 180;
const cx = tx + Math.sin(az) * Math.cos(el) * dist, cz = tz + Math.cos(az) * Math.cos(el) * dist, cy = ty + Math.sin(el) * dist;
cam.setPose(cx, cy, cz, tx - cx, ty - cy, tz - cz);

let last = performance.now(), frames = 0, paused = false;
function resize() { renderer.resize(innerWidth, innerHeight, 1, s.resolutionScale); }
addEventListener('resize', resize);
resize();
function frame(t) {
  if (paused) return;
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  env.update(dt);
  const list = nodes.update(cam, dt * 1000);
  nodes.pool.pump(500);
  renderer.render({ env, time: t / 1000, dt, viewDistance: s.viewDistance, nodes: list, models: [] });
  frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__fh = {
  nodes, renderer, world, env, cam,
  pause() { paused = true; },
  resume() { if (paused) { paused = false; last = performance.now(); requestAnimationFrame(frame); } },
  get frames() { return frames; },
  stats() { return { ...nodes.stats, draws: renderer.stats.draws, tris: renderer.stats.tris, nodesDrawn: renderer.stats.nodes, settled: nodes.settled, frames }; },
};
