import { Emitter } from '../core/events.js';
import { Rolling, now } from '../core/perf.js';
import { DEG } from '../core/util.js';
import { Renderer } from '../render/renderer.js';
import { NodeManager } from '../lod/node-manager.js';
import { ModelRegistry } from '../render/models.js';
import { Environment } from '../render/sky.js';
import { createWorld } from '../world/index.js';
import { WORLD_SEED } from '../world/config.js';
import { PRESETS } from '../settings/presets.js';
import { Governor } from '../settings/governor.js';
import { probeHardware } from '../settings/probe.js';
import { AIRCRAFT, VEHICLES, AMBIENT } from '../generated/registry.js';
import { Input } from '../input/input.js';
import { AircraftEntity } from './aircraft-entity.js';
import { makeGround } from './ground.js';
import { CameraRig, Flyover, VIEW_LABELS } from './camera-rig.js';
import { Hud, unitsFor } from './hud.js';
import { StructureCollider } from './collision.js';
import { TrafficSystem } from '../traffic/traffic.js';
import { AmbientSystem } from '../traffic/ambient.js';
import { Course, formatTime } from './course.js';
import { TakeoffAssist, ASSIST_LABEL } from './takeoff-assist.js';
import { Effects } from './effects.js';
import { WeaponSystem, showStores } from './weapons.js';
import { DAMAGE } from '../world/damage.js';

const STEP = 1 / 240;
const MAX_STEPS = 16;
const FLAP_NOTCHES = 3;
const INTRO_TIME = 4.6;               // seconds of the takeoff intro camera
const INTRO_HOLD = 3.0;               // an automatic takeoff releases the brakes after this long

/**
 * The running game: owns the renderer, world, streaming, traffic, the player aircraft and the frame loop.
 * States: 'menu' (flyover or hangar showcase), 'flying', 'paused'. The UI layer drives it and listens to its events:
 * 'state', 'crash', 'toast', 'progress'.
 */
export class Game extends Emitter {
  constructor({ canvas, hudCanvas, store }) {
    super();
    this.canvas = canvas;
    this.store = store;
    this.state = 'loading';
    this.menuView = 'flyover';
    this.time = 0;
    this.acc = 0;
    this.ent = null;
    this.preview = null;
    this.frameMs = new Rolling(90);
    this.cpuMs = new Rolling(90);
    this.last = 0;
    this.lastFrameT = 0;
    this.governor = new Governor();
    this.hud = new Hud(hudCanvas);
    this.flapNotch = 0;
    this.crashed = false;
    this.showStats = false;
    this.shot = false;
    this.settingsDirty = true;
    this.pending = new Set();
    this.lookBack = false;
    this.course = null;
  }

  // ------------------------------------------------------------------ setup
  async init(progress = () => {}) {
    const step = async (frac, text) => { progress(frac, text); await new Promise((r) => setTimeout(r, 0)); };
    await step(0.04, 'Starting renderer');
    this.renderer = new Renderer(this.canvas, {});
    // first run: pick a preset from the hardware, keep Auto so the governor can adapt
    if (!this.store.loaded && this.store.get('preset') === 'auto') {
      const probe = probeHardware({ renderer: this.renderer.info.renderer || '' });
      this.store.applyGraphics(PRESETS[probe.tier]);
      this.probe = probe;
    }
    const d = this.store.derived();
    this.renderer.configure(d.render);
    await step(0.14, 'Generating the island');
    this.world = createWorld({ seed: WORLD_SEED });
    this.ground = makeGround(this.world);
    this.assist = new TakeoffAssist(this.world, this.ground);
    this.models = new ModelRegistry(this.renderer, this.world);
    this.nodes = new NodeManager({ renderer: this.renderer, models: this.models, world: this.world, seed: WORLD_SEED, settings: d.lod });
    this.env = new Environment();
    await step(0.3, 'Laying out cities and roads');
    this.traffic = new TrafficSystem({ world: this.world, models: this.models, vehicles: VEHICLES, seed: WORLD_SEED });
    this.traffic.init();
    this.ambient = new AmbientSystem({ world: this.world, models: this.models, defs: AMBIENT, seed: WORLD_SEED });
    this.ambient.init();
    this.collider = new StructureCollider(this.world);
    this.effects = new Effects({ renderer: this.renderer, models: this.models, ground: this.ground, max: d.effects.maxParticles });
    this.weapons = new WeaponSystem({ ground: this.ground, collider: this.collider, effects: this.effects, models: this.models, explode: (e) => this._explode(e) });
    await step(0.5, 'Warming up aircraft');
    this.input = new Input(window, this.canvas).attach();
    this.rig = new CameraRig(this.renderer.camera, this.ground);
    this.flyover = new Flyover(this.world, this.ground);
    this.starts = this.world.spawns();
    this.store.on('change', (k) => { if (k !== 'takeoffAssist') this.settingsDirty = true; if (k === 'timeOfDay') this.env.setHour(this.store.get('timeOfDay')); });
    this.applySettings();
    this.env.setHour(this.store.get('timeOfDay'));
    addEventListener('resize', () => this.resize());
    this.resize();
    await step(0.62, 'Streaming terrain');
    // let the first ring of terrain arrive before the curtain lifts
    const t0 = now();
    this.state = 'menu';
    this.flyover.update(0.016, this.renderer.camera, 60);
    while (now() - t0 < 25000) {
      this._renderOnce(0.016);
      const st = this.nodes.stats;
      const frac = st.loaded + st.pending ? st.loaded / (st.loaded + st.pending) : 0;
      progress(0.62 + 0.36 * frac, `Streaming terrain ${Math.round(frac * 100)}%`);
      if (this.nodes.settled && st.loaded > 20) break;
      await new Promise((r) => setTimeout(r, 40));
    }
    progress(1, 'Ready');
    this.setState('menu');
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.emit('state', s);
  }

  applySettings() {
    this.settingsDirty = false;
    const v = this.store.all();
    const d = this.store.derived();
    this.renderer.configure(d.render);
    this.nodes.applySettings(d.lod);
    this.traffic.setMax(d.traffic.maxVehicles);
    if (this.effects) this.effects.setMax(d.effects.maxParticles);
    this.ambient.setMax(d.traffic.maxVehicles > 0 ? 1 : 0);
    this.env.cover = v.cloudCover;
    this.env.timeSpeed = v.timeSpeed;
    this.frameCap = v.frameCap ? 1000 / v.frameCap : 0;
    this.governor.enabled = v.preset === 'auto';
    this.showStats = !!v.showStats || this.showStats;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = this.store.get('resolutionScale');
    this.renderer.resize(innerWidth, innerHeight, dpr, s);
    this.hud.resize(innerWidth, innerHeight, dpr);
  }

  // ------------------------------------------------------------------ catalog
  get planes() { return this._planes || (this._planes = [...AIRCRAFT].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))); }

  /** Cruise speed used for airborne starts: comfortably above the stall. */
  cruiseFor(spec) {
    const W = (spec.mass.empty + spec.mass.fuel * spec.fuelDefault + (spec.mass.payload || 0)) * 9.81;
    return 1.9 * Math.sqrt((2 * W) / (1.225 * spec.wing.area * spec.aero.CLmax));
  }

  // ------------------------------------------------------------------ flow
  /** Show an aircraft standing on a start area, with an orbiting camera. */
  showcase(planeId, startId, livery = 'default') {
    const spec = AIRCRAFT.find((a) => a.id === planeId);
    const start = this.starts.find((s) => s.id === startId) || this.starts[0];
    if (!spec || !start) return;
    this.preview = new AircraftEntity(spec, { ground: this.ground, registry: this.models, livery });
    this.preview.placeOnGround(start.x, start.z, start.heading);
    showStores(this.preview);
    this.preview.instance.prewarm([0], false);
    this.previewStart = start;
    this.orbitAz = 0.7;
    this.orbitEl = 0.2;
    this.orbitZoom = 1;
    this.orbitSpin = true;
    this.menuView = 'showcase';
  }

  /** Hangar camera control: drag to orbit, wheel to zoom, or jump to a preset (orbit, front, side, top, back). */
  orbitBy(dAz, dEl) { this.orbitAz += dAz; this.orbitEl = Math.max(-0.05, Math.min(1.45, (this.orbitEl ?? 0.2) + dEl)); this.orbitSpin = false; }
  zoomBy(f) { this.orbitZoom = Math.max(0.45, Math.min(2.2, (this.orbitZoom ?? 1) * f)); }
  viewPreset(name) {
    const P = { orbit: [0.7, 0.2, true], front: [Math.PI, 0.08, false], side: [Math.PI / 2, 0.06, false], back: [0, 0.14, false], top: [0, 1.4, false], three: [0.7, 0.2, false] };
    const p = P[name] || P.orbit;
    this.orbitAz = p[0]; this.orbitEl = p[1]; this.orbitSpin = p[2]; this.orbitZoom = 1;
  }

  showFlyover() { this.menuView = 'flyover'; this.preview = null; }

  startFlight({ planeId, startId, livery = 'default', airborne = false }) {
    const spec = AIRCRAFT.find((a) => a.id === planeId) || AIRCRAFT[0];
    const start = this.starts.find((s) => s.id === startId) || this.starts[0];
    this.lastStart = { planeId: spec.id, startId: start.id, livery, airborne };
    this.ent = new AircraftEntity(spec, { ground: this.ground, registry: this.models, livery });
    if (airborne) {
      const agl = spec.propulsion.type === 'jet' ? 900 : 350;
      this.ent.placeAirborne({ x: start.x, y: this.ground.h(start.x, start.z) + agl, z: start.z, headingDeg: start.heading, ias: this.cruiseFor(spec), gear: spec.gear.retractable ? 0 : 1 });
      this.input.throttle = this.ent.model.input.throttle;
    } else {
      this.ent.placeOnGround(start.x, start.z, start.heading);
      this.input.throttle = 0;
    }
    this.ent.instance.prewarm([0, 1], true);
    this.weapons.attach(this.ent);
    this.effects.clear();
    // takeoff help only makes sense from the ground; an automatic takeoff waits on the brakes while the intro camera plays
    const assistMode = airborne ? 'off' : this.store.get('takeoffAssist');
    this.assist.reset(assistMode, INTRO_HOLD);
    this.flapNotch = 0;
    this.input.trim = airborne ? this.ent.model.input.trim : 0;
    this.crashed = false;
    this.preview = null;
    this.collider.reset();
    if (this.course) this.course.reset();
    this.rig.setMode(spec.cameras.defaultView || 'chase');
    this.rig.reset(this.ent);
    // the intro swings the camera around the nose, which needs open ground: runways and holding points, not a gate against a pier
    if (!airborne && this.rig.mode !== 'cockpit' && (start.kind === 'runway' || start.kind === 'hold')) this.rig.startIntro(INTRO_TIME);
    this.acc = 0;
    this.setState('flying');
    this.hud.toast(`${spec.name} at ${start.name}`, 3400);
    if (assistMode === 'auto') this.hud.toast('Automatic takeoff: hands off, or take over any time', 4200);
  }

  restart() { if (this.lastStart) this.startFlight(this.lastStart); }
  pause() { if (this.state === 'flying') this.setState('paused'); }
  resume() { if (this.state === 'paused') this.setState('flying'); }
  toMenu() {
    this.ent = null; this.crashed = false; this.menuView = 'flyover'; this.preview = null; this.assist.reset('off');
    // leaving the flight leaves the island whole again; restarting with R keeps the craters
    this.weapons.reset(); this.effects.clear(); this.nodes.healAll(); this.collider.reset(); this.traffic.clear();
    this.setState('menu');
  }

  // ------------------------------------------------------------------ loop
  _controls(dt, inp) {
    const m = this.ent.model, v = this.store.all();
    m.input.pitch = inp.pitch; m.input.roll = inp.roll; m.input.yaw = inp.yaw;
    m.input.throttle = inp.throttle; m.input.brake = inp.brake; m.input.airbrake = inp.airbrake; m.input.trim = inp.trim;
    m.input.flaps = this.flapNotch / FLAP_NOTCHES;
    // wind and turbulence
    const a = (v.windDir + 180) * DEG;                   // direction the wind blows toward
    m.wind[0] = Math.sin(a) * v.windSpeed; m.wind[2] = -Math.cos(a) * v.windSpeed;
    m.turbulence = v.turbulence;
  }

  _discrete() {
    const inp = this.input, m = this.ent && this.ent.model;
    if (inp.pressed('pause')) { if (this.state === 'flying') this.pause(); else if (this.state === 'paused') this.resume(); }
    if (inp.pressed('debug')) { this.showStats = !this.showStats; this.emit('stats', this.showStats); }
    if (inp.pressed('screenshot')) this.shot = true;
    if (this.state === 'paused' || !m) return;
    if (inp.pressed('view')) { const v = this.rig.cycle(true); this.hud.toast(`${VIEW_LABELS[v] || v} view`, 1200); }
    if (inp.pressed('weapon') && this.weapons.armed) {
      const w = this.weapons.select(1);
      if (w) this.hud.toast(`${w.def.name}  x${this.weapons.loadout.remaining()}`, 1600);
    }
    if (inp.pressed('hud')) this.hud.visible = !this.hud.visible;
    if (inp.pressed('assist') && !this.ent.model.crashed) {
      const mode = this.assist.cycle();
      this.store.set('takeoffAssist', mode);
      this.hud.toast(`Takeoff assist: ${ASSIST_LABEL[mode]}`, 1800);
    }
    if (inp.pressed('map')) this.emit('map');
    if (inp.pressed('reset')) this.restart();
    if (inp.pressed('flapsDown') && this.flapNotch < FLAP_NOTCHES) { this.flapNotch++; this.hud.toast(`Flaps ${this.flapNotch}`, 1100); }
    if (inp.pressed('flapsUp') && this.flapNotch > 0) { this.flapNotch--; this.hud.toast(`Flaps ${this.flapNotch}`, 1100); }
    if (inp.pressed('gear') && this.ent.spec.gear.retractable) {
      if (m.onGround && m.input.gear >= 0.5) this.hud.toast('Gear locked on the ground', 1500, 'bad');
      else { m.input.gear = m.input.gear >= 0.5 ? 0 : 1; this.hud.toast(m.input.gear ? 'Gear down' : 'Gear up', 1200); }
    }
    this.lookBack = inp.held('lookBack');
    inp.clearEdges();
  }

  _events() {
    const m = this.ent.model;
    for (const e of m.events) {
      if (e.type === 'touchdown') {
        const q = e.vs < 0.8 ? 'Greased it' : e.vs < 2 ? 'Smooth landing' : e.vs < 3.5 ? 'Firm landing' : 'Hard landing';
        this.hud.toast(`${q}, ${e.vs.toFixed(1)} m/s down`, 3600, e.vs < 2 ? 'good' : e.vs < 3.5 ? 'info' : 'bad');
      } else if (e.type === 'hardLanding') this.hud.toast('Hard landing, check the airframe', 3000, 'bad');
      else if (e.type === 'crash' && !this.crashed) { this.crashed = true; this.emit('crash', e.reason); }
    }
    m.events.length = 0;
  }

  /** The Skyline run challenge: created the first time it is switched on, advanced while flying, drawn while flying or paused. */
  _course(dt, v, models, cam, pxPerRad) {
    if (v.challenge !== 'skyline' || !this.ent || (this.state !== 'flying' && this.state !== 'paused')) return;
    if (!this.course) {
      this.course = new Course({ world: this.world, models: this.models, collider: this.collider });
      this.course.build();
      this.hud.toast('Skyline run: ring the towers of Meridian, first gate marked', 4200);
    }
    const c = this.course;
    if (this.state === 'flying' && !this.ent.model.crashed) {
      const ev = c.update(dt, this.ent.model.pos);
      if (ev && ev.type === 'gate') this.hud.toast(`Gate ${ev.index} of ${ev.total}   ${formatTime(ev.time)}`, 1700, 'good');
      else if (ev && ev.type === 'miss') this.hud.toast(`Missed gate ${ev.index}, fly back through the ring`, 2200, 'bad');
      else if (ev && ev.type === 'finish') this.hud.toast(ev.isBest ? `Run complete ${formatTime(ev.time)}, a new best` : `Run complete ${formatTime(ev.time)}, best ${formatTime(ev.best)}`, 6500, 'good');
    }
    c.emit(models, cam, pxPerRad);
  }

  _flight(dt, inp) {
    const ent = this.ent, m = ent.model;
    const a = this.assist;
    a.update(dt, ent, inp);
    this._controls(dt, inp);
    if (a.controlling) a.apply(ent, this);
    if (a.handedOver) { this.input.trim = Math.max(-1, Math.min(1, m.c.elev / 0.35)); a.handedOver = false; }
    for (const c of a.drain()) {
      if (c.key !== 'rotate') this.hud.toast(c.text, c.tone === 'bad' ? 3600 : 2200, c.tone);   // the ROTATE banner speaks for itself
      if (c.key === 'done' && a.pilot && a.pilot.liftoffAt) {
        // the takeoff report: what the briefing promised, as it turned out
        const u = unitsFor(this.store.get('units')), lo = a.pilot.liftoffAt, run = Math.max(0, lo.u - (a.pilot.u0 || 0));
        this.hud.toast(`Lift-off after ${Math.round(u.dist(run) / 10) * 10} ${u.distUnit} at ${Math.round(u.speed(lo.ias))} ${u.speedUnit}`, 4200, 'good');
      }
    }
    if (this.rig.intro && (inp.throttle > 0.02 || inp.brake > 0.05 || Math.abs(inp.pitch) + Math.abs(inp.roll) + Math.abs(inp.yaw) > 0.15)) this.rig.skipIntro();
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < MAX_STEPS) { ent.step(STEP); this.acc -= STEP; n++; }
    if (n === MAX_STEPS) this.acc = 0;
    ent.interpolate(this.acc / STEP);
    if (this.weapons.armed && !m.crashed) this.weapons.trigger(ent, inp.fire, dt, inp.fireEdge);
    this.weapons.update(dt, ent);
    const note = this.weapons.takeToast();
    if (note) this.hud.toast(note.text, 2200, note.tone);
    if (!m.crashed) {
      const hit = this.collider.test(ent, dt);
      if (hit) m._crash(`collision with a ${String(hit.kind).replace(/[-_]/g, ' ')}`);
    }
    this._events();
  }

  _renderOnce(dt) {
    const cam = this.renderer.camera;
    const list = this.nodes.update(cam, dt * 1000);
    this.renderer.render({ env: this.env, time: this.time, dt, viewDistance: this.store.get('viewDistance'), nodes: list, models: [], cockpit: [] });
  }

  frame(t) {
    if (this.frameCap && t - this.lastFrameT < this.frameCap - 1.5) return;
    const started = now();
    let dt = Math.min(0.1, (t - (this.last || t)) / 1000);
    if (this.last) this.frameMs.push(t - this.last);
    this.last = t; this.lastFrameT = t;
    this.time += dt;
    if (this.settingsDirty) this.applySettings();
    const v = this.store.all();
    const cam = this.renderer.camera;
    const models = [], cockpit = [];
    const px = () => cam.projScale;

    const inp = this.input.update(dt, { sensitivity: v.sensitivity, invertPitch: v.invertPitch, mouseFlight: v.mouseFlight && this.state === 'flying', deadzone: v.deadzone });
    if (this.state === 'flying' || this.state === 'paused') this._discrete();
    else this.input.clearEdges();
    let wheel = this.input.wheelDelta || 0; this.input.wheelDelta = 0;
    const mouseFly = v.mouseFlight && this.state === 'flying' && this.input.mouse.inside;
    if (this.state === 'flying' && this.input.pressed('mouseFlight')) {
      this.store.set('mouseFlight', !v.mouseFlight);
      this.hud.toast(`Mouse flight ${v.mouseFlight ? 'off' : 'on'}`, 1400);
    }
    // with mouse flight the wheel is the throttle lever (scroll up for more power) and the camera zoom steps aside
    if (mouseFly && wheel) { this.input.nudgeThrottle(-wheel * 0.05); wheel = 0; }

    let view = 'external';
    if ((this.state === 'flying' || this.state === 'paused') && this.ent) {
      const ent = this.ent;
      if (this.state === 'flying') this._flight(dt, inp);
      else ent.interpolate(this.acc / STEP);
      const look = this.lookBack ? { x: Math.PI, y: 0 } : this.input.look;
      this.rig.update(this.state === 'paused' ? 0 : dt, ent, look, { fov: v.fov, wheel, shake: this.effects.shakeAmp });
      view = this.rig.mode === 'cockpit' ? 'cockpit' : 'external';
      this.traffic.update(this.state === 'paused' ? 0 : dt, cam.pos);
      ent.emit(models, cockpit, { mode: view, camPos: cam.pos, pxPerRad: px() });
      this.weapons.emit(models, cam);
    } else if (this.menuView === 'showcase' && this.preview) {
      const e = this.preview;
      if (this.orbitSpin !== false) this.orbitAz += dt * 0.22;
      const c = e.worldPoint(new Float64Array(3), 0, 0.5, 0);
      // frame the whole aircraft inside the free slot between the hangar panels, whatever the window shape
      const ext = e.instance.extent(), W = this.canvas.clientWidth || 1280, H = this.canvas.clientHeight || 720;
      const slot = Math.max(0.3, (W - Math.max(300, Math.min(400, W * 0.34)) - Math.max(300, Math.min(440, W * 0.32))) / W);
      const R = Math.max(ext.length, ext.span) * 0.5 * 1.12, th = Math.tan((46 * Math.PI) / 360);
      const size = Math.max(R / (slot * th * (W / H)), R / th * 0.9, 6);
      const hd = (this.previewStart.heading || 0) * DEG;
      const az = hd + this.orbitAz, el = this.orbitEl ?? 0.2, dist = size * (this.orbitZoom ?? 1);
      const x = c[0] + Math.sin(az) * Math.cos(el) * dist, z = c[2] - Math.cos(az) * Math.cos(el) * dist;
      const y = Math.max(c[1] + Math.sin(el) * dist, this.ground.h(x, z) + 1.2);
      cam.fov = (46 * Math.PI) / 180;
      cam.setPose(x, y, z, c[0] - x, c[1] - y, c[2] - z);
      e.emit(models, cockpit, { mode: 'external', camPos: cam.pos, pxPerRad: px() * 2.2 }); // the hero object: always the finest voxels
      this.traffic.update(dt, cam.pos);
    } else {
      this.flyover.update(dt, cam, 62);
      this.traffic.update(dt, cam.pos);
    }
    if (this.camOverride) { const o = this.camOverride; cam.fov = ((o.fov || 60) * Math.PI) / 180; cam.setPose(o.x, o.y, o.z, o.fx, o.fy, o.fz); }
    this.ambient.update(this.state === 'paused' ? 0 : dt);
    this._course(dt, v, models, cam, px());
    this.traffic.emit(models, cam, px());
    this.ambient.emit(models, cam, px());

    this.env.update(dt);
    const nodes = this.nodes.update(cam, dt * 1000);
    this.effects.update(this.state === 'paused' ? 0 : dt, cam.pos);
    const fx = this.effects.emit(cam.pos);
    this.renderer.render({ env: this.env, time: this.time, dt, viewDistance: v.viewDistance, nodes, models, cockpit, fx });
    if (this.shot) { this.shot = false; this._screenshot(); }

    if ((this.state === 'flying' || this.state === 'paused') && this.ent) {
      this.hud.draw({ ent: this.ent, cam, view: this.rig.mode === 'cockpit' ? 'cockpit' : 'chase', units: v.units, scale: v.hudScale, dt: this.state === 'paused' ? 0 : dt, mouse: mouseFly ? this.input.mouse : null, course: v.challenge === 'skyline' && this.course ? this.course.status() : null, assist: this.assist.info, weapons: this.weapons.info(this.ent) });
    } else this.hud.draw({ ent: null, cam, view: 'menu', units: v.units, scale: v.hudScale, dt, hideAll: true });

    this.cpuMs.push(now() - started);
    // Auto mode: trade quality for frame time
    if (v.preset === 'auto' && this.frameMs.count > 45 && this.state !== 'loading') {
      const change = this.governor.step(this.frameMs.avg, v, dt * 1000);
      if (change) this.store.applyGraphics(change);
    }
  }

  /**
   * A weapon went off. Big ones (a rocket, a missile, a bomb) change the island: the blast joins the list that every worker
   * builds nodes from, the nodes around it are rebuilt with the crater, the bitten buildings and the missing trees, traffic
   * in the radius burns, and the aircraft itself is not safe from its own bombs. Small ones (cannon shells) only raise dust.
   */
  _explode(e) {
    const { x, y, z, r } = e;
    const fx = this.effects, cam = this.renderer.camera;
    const far = Math.hypot(x - cam.pos[0], y - cam.pos[1], z - cam.pos[2]);
    const scale = far > 1200 ? 0.55 : 1;
    if (e.water) { fx.explosion(x, y, z, r, { water: true, scale }); return; }
    if (r < 3.4) { fx.impact(x, y, z, r, false); return; }
    const b = DAMAGE.add({ x, y, z, r });
    this.nodes.blast(b);
    for (const s of this.collider.blastReport(b)) {
      if (s.share > 0.22 || s.gone > 500) fx.collapse(s.x, s.y, s.z, s.w, s.dd, s.h, Math.min(1, s.share * 1.15 + 0.15));
      else fx.burn(s.x, s.y + 1, s.z, Math.min(s.w, s.dd) * 0.3, 14);
    }
    for (const v of this.traffic.killNear(x, z, r * 0.95)) { fx.explosion(v.x, v.y + 0.6, v.z, 2.8, { scale: 0.5 }); fx.burn(v.x, v.y, v.z, 1.6, 26); }
    fx.explosion(x, y, z, r, { ground: !e.air, fuel: e.fuel, scale });
    const ent = this.ent;
    if (ent && !ent.model.crashed) {
      const d = Math.hypot(ent.pos[0] - x, ent.pos[1] - y, ent.pos[2] - z);
      if (d < r * 0.6 + 4) ent.model._crash('caught in the blast of its own weapon');
    }
  }

  _screenshot() {
    this.canvas.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `fly-high-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      this.hud.toast('Screenshot saved', 1600, 'good');
    }, 'image/png');
  }

  /** Numbers for the performance overlay. */
  getStats() {
    const ns = this.nodes.stats, r = this.renderer.stats, ms = this.frameMs.avg || 16;
    const m = this.ent && this.ent.model;
    return {
      fps: 1000 / ms, frameMs: ms, p95: this.frameMs.percentile(0.95), cpuMs: this.cpuMs.avg,
      draws: r.draws, tris: r.tris, nodesDrawn: ns.drawn, loaded: ns.loaded, pending: ns.pending, gpuMB: ns.gpuMB, workers: ns.mode, buildMs: ns.avgBuildMs,
      traffic: this.traffic.stats.count, preset: this.store.get('preset'), scale: this.store.get('resolutionScale'), viewKm: this.store.get('viewDistance') / 1000,
      alt: m ? m.pos[1] : 0, ias: m ? m.ias : 0, agl: m ? m.agl : 0,
    };
  }
}

