// Aircraft inspection scene: one aircraft on a start area with an orbit camera. Test scene, not part of the game flow.
import { Renderer } from '../render/renderer.js';
import { NodeManager } from '../lod/node-manager.js';
import { ModelRegistry } from '../render/models.js';
import { Environment } from '../render/sky.js';
import { createWorld } from '../world/index.js';
import { PRESETS, derive } from '../settings/presets.js';
import { WORLD_SEED } from '../world/config.js';
import { AIRCRAFT } from '../generated/registry.js';
import { AircraftEntity } from '../game/aircraft-entity.js';
import { makeGround } from '../game/ground.js';
import { showStores } from '../game/weapons.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl');
document.getElementById('boot').remove();
const s = { ...PRESETS[params.get('preset') || 'medium'] };
for (const [k, v] of params) if (k in s && k !== 'preset') s[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
const d = derive(s);
const renderer = new Renderer(canvas, {});
renderer.configure(d.render);
const world = createWorld({ seed: WORLD_SEED });
const models = new ModelRegistry(renderer, world);
const nodes = new NodeManager({ renderer, models, world, seed: WORLD_SEED, settings: d.lod });
const env = new Environment();
env.setHour(+(params.get('hour') || 10.5));
env.cover = +(params.get('cover') || 0.35);

const spec = AIRCRAFT.find((a) => a.id === (params.get('plane') || 'skylark'));
const spawn = world.spawns().find((p) => p.id === (params.get('spawn') || 'airport-09R'));
const ground = makeGround(world);
const ent = new AircraftEntity(spec, { ground, registry: models, livery: params.get('livery') || 'default' });
const fly = params.get('fly');
if (fly) ent.placeAirborne({ x: spawn.x, y: world.heightAt(spawn.x, spawn.z) + +fly, z: spawn.z, headingDeg: spawn.heading, ias: +(params.get('ias') || 60), flaps: +(params.get('flaps') || 0), gear: +(params.get('gear') ?? 1) });
else ent.placeOnGround(spawn.x, spawn.z, spawn.heading);
ent.model.input.flaps = +(params.get('flaps') || 0);
ent.model.c.flap = ent.model.input.flaps;
ent.model.input.throttle = +(params.get('throttle') || 0);
if (params.get('roll')) { ent.model.input.roll = +params.get('roll'); ent.model.c.ail = +params.get('roll'); }
if (params.get('pitch')) { ent.model.input.pitch = +params.get('pitch'); ent.model.c.elev = +params.get('pitch'); }
if (params.get('yaw')) { ent.model.input.yaw = +params.get('yaw'); ent.model.c.rud = +params.get('yaw'); }
if (params.get('stores') !== '0') showStores(ent);
ent.model.updateChannels();
if (params.get('prewarm') !== '0') ent.instance.prewarm([0], true);

const cam = renderer.camera;
// az is measured from the nose: 0 = looking at the nose from the front, 90 = from the pilot's right
const st = { az: +(params.get('az') || 35), el: +(params.get('el') || 14), dist: +(params.get('dist') || 16), view: params.get('view') || 'external', ly: +(params.get('lookyaw') || 0), lp: +(params.get('lookpitch') || 0), eye: params.get('eye') ? params.get('eye').split(',').map(Number) : null };
let last = performance.now(), frames = 0, acc = 0, paused = false;
function resize() { renderer.resize(innerWidth, innerHeight, +(params.get('dpr') || 1), s.resolutionScale); }
addEventListener('resize', resize);
resize();

function frame(t) {
  if (paused) return;
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  if (params.get('sim') === '1') { acc += dt; while (acc >= 1 / 240) { ent.step(1 / 240); acc -= 1 / 240; } ent.interpolate(acc * 240); }
  const list = [], cockpit = [];
  cam.fov = ((st.view === 'cockpit' ? +(params.get('cfov') || 85) : +(params.get('fov') || 50)) * Math.PI) / 180;
  if (st.view === 'cockpit') {
    const e = st.eye || spec.cameras.cockpit;
    const p = ent.worldPoint([0, 0, 0], e[0], e[1], e[2]);
    // look about the body up axis (positive = right) and then up or down
    const ly = (st.ly * Math.PI) / 180, lp = (st.lp * Math.PI) / 180;
    const dx = Math.cos(ly) * Math.cos(lp), dy = Math.sin(lp), dz = Math.sin(ly) * Math.cos(lp);
    const f = ent.worldPoint([0, 0, 0], e[0] + dx, e[1] + dy - +(params.get('down') || 0), e[2] + dz + +(params.get('side') || 0));
    const u = ent.worldPoint([0, 0, 0], e[0], e[1] + 1, e[2]);
    cam.setPose(p[0], p[1], p[2], f[0] - p[0], f[1] - p[1], f[2] - p[2], u[0] - p[0], u[1] - p[1], u[2] - p[2]);
  } else {
    const hd = ((spawn.heading ?? 0) * Math.PI) / 180;
    const az = hd + (st.az * Math.PI) / 180, el = (st.el * Math.PI) / 180;
    const c = ent.worldPoint([0, 0, 0], st.tx ?? 0, st.ty ?? 0.4, st.tz ?? 0);
    const x = c[0] + Math.sin(az) * Math.cos(el) * st.dist, y = c[1] + Math.sin(el) * st.dist, z = c[2] - Math.cos(az) * Math.cos(el) * st.dist;
    cam.setPose(x, y, z, c[0] - x, c[1] - y, c[2] - z);
  }
  ent.emit(list, cockpit, { mode: st.view, camPos: cam.pos, pxPerRad: cam.projScale });
  env.update(dt);
  const nl = nodes.update(cam, dt * 1000);
  renderer.render({ env, time: t / 1000, dt, viewDistance: s.viewDistance, nodes: nl, models: list, cockpit });
  frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__fh = {
  st, nodes, renderer, world, env, cam, ent, spec,
  pause() { paused = true; },
  resume() { if (paused) { paused = false; last = performance.now(); requestAnimationFrame(frame); } },
  get frames() { return frames; },
  stats() { return { ...nodes.stats, draws: renderer.stats.draws, tris: renderer.stats.tris, models: renderer.stats.models, settled: nodes.settled, frames, lod: ent.instance.level }; },
};
