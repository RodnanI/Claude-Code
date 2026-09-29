// Free-camera viewer for the terrain, LOD and structure pipeline. Test scene, not part of the game flow.
import { Renderer } from '../render/renderer.js';
import { NodeManager } from '../lod/node-manager.js';
import { ModelRegistry } from '../render/models.js';
import { Environment } from '../render/sky.js';
import { createWorld } from '../world/index.js';
import { PRESETS, derive } from '../settings/presets.js';
import { WORLD_SEED } from '../world/config.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl');
document.getElementById('boot').remove();
const preset = params.get('preset') || 'medium';
const s = { ...PRESETS[preset] };
if (params.get('w')) s.workers = +params.get('w');
for (const [k, v] of params) if (k in s && k !== 'preset') s[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
if (params.get('grade')) s.grade = params.get('grade');
const d = derive(s);
const renderer = new Renderer(canvas, {});
renderer.configure(d.render);
const world = createWorld({ seed: WORLD_SEED });
const models = new ModelRegistry(renderer, world);
const nodes = new NodeManager({ renderer, models, world, seed: WORLD_SEED, settings: d.lod });
const env = new Environment();
env.setHour(+(params.get('hour') || 10.5));
env.cover = +(params.get('cover') || 0.5);

const cam = renderer.camera;
const st = { x: +(params.get('x') || 0), y: +(params.get('y') || 300), z: +(params.get('z') || 0), yaw: +(params.get('yaw') || 0), pitch: +(params.get('pitch') || -0.2) };
if (params.get('agl')) st.y = world.heightAt(st.x, st.z) + +params.get('agl');
const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
let last = performance.now();
let frames = 0, paused = false;

function resize() { renderer.resize(innerWidth, innerHeight, +(params.get('dpr') || 1), s.resolutionScale); }
addEventListener('resize', resize);
resize();

function frame(t) {
  if (paused) return;
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  const sp = (keys.has('ShiftLeft') ? 800 : 120) * dt;
  const fx = Math.sin(st.yaw) * Math.cos(st.pitch), fy = Math.sin(st.pitch), fz = -Math.cos(st.yaw) * Math.cos(st.pitch);
  if (keys.has('KeyW')) { st.x += fx * sp; st.y += fy * sp; st.z += fz * sp; }
  if (keys.has('KeyS')) { st.x -= fx * sp; st.y -= fy * sp; st.z -= fz * sp; }
  if (keys.has('KeyA')) { st.x += fz * sp; st.z -= fx * sp; }
  if (keys.has('KeyD')) { st.x -= fz * sp; st.z += fx * sp; }
  if (keys.has('ArrowLeft')) st.yaw -= dt; if (keys.has('ArrowRight')) st.yaw += dt;
  if (keys.has('ArrowUp')) st.pitch += dt * 0.7; if (keys.has('ArrowDown')) st.pitch -= dt * 0.7;
  cam.fov = (((window.__fh && window.__fh.fovDeg) || +(params.get('fov') || 70)) * Math.PI) / 180;
  cam.setPose(st.x, st.y, st.z, fx, fy, fz);
  env.update(dt);
  const list = nodes.update(cam, dt * 1000);
  renderer.render({ env, time: t / 1000, dt, viewDistance: s.viewDistance, nodes: list, models: [] });
  frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__fh = {
  st, nodes, renderer, world, env, cam,
  pause() { paused = true; },
  resume() { if (paused) { paused = false; last = performance.now(); requestAnimationFrame(frame); } },
  get frames() { return frames; },
  stats() { return { ...nodes.stats, draws: renderer.stats.draws, tris: renderer.stats.tris, nodesDrawn: renderer.stats.nodes, settled: nodes.settled, frames }; },
  set(x, y, z, yaw, pitch) { st.x = x; st.y = y; st.z = z; st.yaw = yaw; st.pitch = pitch; },
};
