import { clamp, wrapPi, lerp } from '../core/util.js';
import { mat3 } from '../core/math.js';
import { SITES } from '../world/layout.js';

export const VIEWS = ['chase', 'near', 'cockpit', 'orbit'];
export const VIEW_LABELS = { chase: 'Far chase', near: 'Close chase', cockpit: 'Cockpit', orbit: 'Orbit' };

/** The two chase placements of an aircraft: its own, or a close one worked out from the far one. */
export function chaseFor(spec, mode) {
  const far = spec.cameras.chase;
  if (mode !== 'near') return far;
  return spec.cameras.near || { distance: far.distance * 0.46, height: far.height * 0.5 };
}

const _p = new Float64Array(3), _f = new Float64Array(3), _u = new Float64Array(3);
const _m = new Float64Array(9), _n = new Float64Array(9), _o = new Float64Array(9);

/**
 * Far chase, close chase, cockpit and orbit cameras for the player aircraft. Chase follows the flight path with a lagging heading and
 * keeps clear of the ground; cockpit sits at the pilot eye with G-force head motion, free look and buffet shake.
 */
export class CameraRig {
  constructor(camera, ground) {
    this.cam = camera;
    this.ground = ground;
    this.mode = 'chase';
    this.chase = { heading: 0, pitch: 0, zoom: 1, ready: false };
    this.orbit = { az: 0.6, el: 0.25, dist: 22 };
    this.head = { x: 0, y: 0, z: 0 };
    this.shake = 0;
    this.baseFov = 70;
    this.time = 0;
    this.intro = null;
  }

  setMode(m) { this.mode = m; this.chase.ready = false; this.intro = null; }

  /** The takeoff intro: a low camera ahead of the aircraft swings around its side and settles into the chase view. */
  startIntro(seconds = 4.6) { this.intro = { t: 0, dur: seconds, skip: false }; }
  skipIntro() { if (this.intro) this.intro.skip = true; }

  _intro(dt, ent, fov, cx, cy, cz, tx, ty, tz) {
    const it = this.intro;
    it.t += dt * (it.skip ? 4 : 1);
    const k = clamp(it.t / it.dur, 0, 1);
    if (k >= 1) { this.intro = null; return false; }
    const e = k * k * (3 - 2 * k), s = clamp((k - 0.6) / 0.4, 0, 1), blend = s * s * (3 - 2 * s);
    const m = ent.model, h = m.att.heading, P = ent.pos;
    const fx = Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = Math.sin(h);
    const D = ent.spec.cameras.chase.distance * this.chase.zoom;
    const x = ent.instance ? ent.instance.extent() : { length: 8, span: 10 };
    const R = lerp(Math.max(x.length, x.span) * 0.8 + 4, D, e);
    const a = lerp(-0.7, -Math.PI, e);                 // front left, along the left side, to behind
    const ox = fx * Math.cos(a) + rx * Math.sin(a), oz = fz * Math.cos(a) + rz * Math.sin(a);
    let ix = P[0] + ox * R, iz = P[2] + oz * R;
    let iy = Math.max(P[1] + lerp(0.5, cy - P[1], e), this.ground.h(ix, iz) + 1.1);
    const tgx = P[0] + fx * lerp(0, D * 0.18, e), tgy = P[1] + lerp(0.7, 0.6, e), tgz = P[2] + fz * lerp(0, D * 0.18, e);
    ix = lerp(ix, cx, blend); iy = lerp(iy, cy, blend); iz = lerp(iz, cz, blend);
    const px = lerp(tgx, tx, blend), py = lerp(tgy, ty, blend), pz = lerp(tgz, tz, blend);
    this.cam.fov = fov * lerp(0.75, 1, e);
    this.cam.setPose(ix, iy, iz, px - ix, py - iy, pz - iz);
    return true;
  }
  cycle(hasCockpit = true) {
    let i = VIEWS.indexOf(this.mode);
    do { i = (i + 1) % VIEWS.length; } while (!hasCockpit && VIEWS[i] === 'cockpit');
    this.setMode(VIEWS[i]);
    return this.mode;
  }

  /** Snap the smoothed state to the aircraft (after a restart). */
  reset(ent) {
    this.chase.ready = false;
    const m = ent.model;
    this.chase.heading = m.att.heading;
    this.head.x = this.head.y = this.head.z = 0;
  }

  update(dt, ent, look, opts = {}) {
    this.time += dt;
    const cam = this.cam, spec = ent.spec, m = ent.model;
    const fov = ((opts.fov ?? this.baseFov) * Math.PI) / 180;
    if (opts.wheel) {
      if (this.mode === 'orbit') this.orbit.dist = clamp(this.orbit.dist * (1 + 0.12 * opts.wheel), 6, 120);
      else this.chase.zoom = clamp(this.chase.zoom * (1 + 0.1 * opts.wheel), 0.5, 3);
    }
    if (m.crashed && this.mode === 'cockpit') this.mode = 'chase';
    const kick = opts.shake || 0;
    const lx = look ? look.x : 0, ly = look ? look.y : 0;

    if (this.mode === 'cockpit') {
      const e = spec.cameras.cockpit;
      // head reacts to load factor and lateral acceleration, smoothed
      const gy = clamp((m.gLoad - 1) * -0.012, -0.05, 0.03);
      this.head.y += (gy - this.head.y) * (1 - Math.exp(-dt * 6));
      this.head.z += (clamp(m.beta * 0.06, -0.03, 0.03) - this.head.z) * (1 - Math.exp(-dt * 5));
      ent.worldPoint(_p, e[0], e[1] + this.head.y, e[2] + this.head.z);
      // body forward/up with free look about the body axes
      mat3.fromAxisAngle(_m, 0, 1, 0, -lx);          // look yaw about body up (positive drag = look right)
      mat3.fromAxisAngle(_n, 0, 0, 1, -ly);          // look pitch about body right
      mat3.mul(_o, _m, _n);
      mat3.mul(_m, ent.rot, _o);
      _f[0] = _m[0]; _f[1] = _m[1]; _f[2] = _m[2];
      _u[0] = _m[3]; _u[1] = _m[4]; _u[2] = _m[5];
      // buffet and turbulence shake
      const sh = clamp(m.buffet * 0.9 + (m.turbulence || 0) * 0.15 + (m.onGround ? clamp(m.groundSpeed / 60, 0, 1) * 0.06 : 0) + (spec.propulsion.type === 'prop' ? m.c.thr * 0.02 : m.afterburner ? 0.25 : 0) + kick * 2.2, 0, 2.2);
      this.shake += (sh - this.shake) * (1 - Math.exp(-dt * 8));
      const t = this.time, a = this.shake * 0.0065;
      _f[0] += (Math.sin(t * 61) + Math.sin(t * 37.7)) * a; _f[1] += (Math.sin(t * 53.3) + Math.sin(t * 29)) * a; _f[2] += (Math.sin(t * 47.1) + Math.sin(t * 23)) * a;
      cam.fov = fov * (1 + clamp(m.tas / 900, 0, 0.12));
      cam.setPose(_p[0], _p[1], _p[2], _f[0], _f[1], _f[2], _u[0], _u[1], _u[2]);
      return;
    }

    if (this.mode === 'orbit' || m.crashed) {
      const o = this.orbit;
      o.az += (look ? lx * 0 : 0) + dt * (m.crashed ? 0.18 : 0);
      const az = o.az + lx, el = clamp(o.el + ly * 0.5, -0.2, 1.4);
      const c = ent.pos;
      const d = o.dist;
      const x = c[0] + Math.sin(az) * Math.cos(el) * d, z = c[2] + Math.cos(az) * Math.cos(el) * d;
      let y = c[1] + 1.2 + Math.sin(el) * d;
      y = Math.max(y, this.ground.h(x, z) + 1.5);
      cam.fov = fov;
      cam.setPose(x, y, z, c[0] - x, c[1] + 0.8 - y, c[2] - z);
      return;
    }

    // chase: follow the direction of travel so the camera does not swing with every twitch of the nose
    const ch = this.chase;
    const speed = Math.hypot(m.vel[0], m.vel[2]);
    const target = speed > 7 ? Math.atan2(m.vel[0], -m.vel[2]) : m.att.heading;
    if (!ch.ready) { ch.heading = target; ch.pitch = 0; ch.ready = true; }
    ch.heading += wrapPi(target - ch.heading) * (1 - Math.exp(-dt * (speed > 30 ? 3.2 : 1.8)));
    ch.pitch += (clamp(Math.atan2(m.vel[1], Math.max(speed, 1)) * -0.35, -0.3, 0.3) - ch.pitch) * (1 - Math.exp(-dt * 2));
    const near = this.mode === 'near';
    const cs = chaseFor(spec, this.mode);
    const D = cs.distance * ch.zoom, H = cs.height * (0.7 + 0.3 * ch.zoom);
    const h = ch.heading + lx;
    const fx = Math.sin(h), fz = -Math.cos(h);
    const lift = H + D * Math.sin(ch.pitch) * 0.6 + D * Math.sin(ly) * 0.9;
    const P = ent.pos;
    let x = P[0] - fx * D, z = P[2] - fz * D;
    let y = P[1] + lift;
    y = Math.max(y, this.ground.h(x, z) + (near ? 1.2 : 1.8));
    const ax = P[0] + fx * D * 0.18, az2 = P[2] + fz * D * 0.18, ay = P[1] + (near ? 0.35 : 0.6);
    if (kick > 0.002) {
      const t = this.time;
      x += (Math.sin(t * 61) + Math.sin(t * 37.7)) * kick * 0.45; y += (Math.sin(t * 53.3) + Math.sin(t * 29)) * kick * 0.45; z += (Math.sin(t * 47.1) + Math.sin(t * 23)) * kick * 0.45;
    }
    // a fraction of the aircraft bank tilts the horizon for a sense of motion
    mat3.mulVec(_u, ent.rot, 0, 1, 0);
    const bank = 0.14;
    if (this.intro && this._intro(dt, ent, fov, x, y, z, ax, ay, az2)) return;
    cam.fov = fov * (1 + clamp(m.tas / 700, 0, 0.1));
    cam.setPose(x, y, z, ax - x, ay - y, az2 - z, _u[0] * bank, 1 - bank + _u[1] * bank, _u[2] * bank);
  }
}

/** Scripted flight over the island for the menu background: a closed Catmull-Rom loop through the landmarks. */
export class Flyover {
  constructor(world, ground) {
    this.ground = ground;
    const order = ['airport', 'meridian', 'dunmore', 'ironford', 'corvus', 'pinecrest', 'fortTalon', 'hollow', 'cutbank', 'portHalden', 'saltmarsh'];
    this.pts = order.map((k, i) => {
      const s = SITES[k];
      const a = (i / order.length) * Math.PI * 2;
      const dist = k === 'corvus' ? 2600 : 900;
      const x = s.x + Math.cos(a + 1.2) * dist, z = s.z + Math.sin(a + 1.2) * dist;
      const alt = k === 'corvus' ? 1900 : k === 'meridian' ? 620 : 420;
      return { x, z, y: Math.max(ground.h(x, z) + 160, alt) };
    });
    this.len = this.pts.length;
    this.t = 0;
    this.speed = 0.0013;
  }

  _at(t, out) {
    const n = this.len;
    const i = Math.floor(t) % n, f = t - Math.floor(t);
    const p0 = this.pts[(i + n - 1) % n], p1 = this.pts[i], p2 = this.pts[(i + 1) % n], p3 = this.pts[(i + 2) % n];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    out[0] = cr(p0.x, p1.x, p2.x, p3.x); out[1] = cr(p0.y, p1.y, p2.y, p3.y); out[2] = cr(p0.z, p1.z, p2.z, p3.z);
    return out;
  }

  update(dt, cam, fov = 60) {
    this.t = (this.t + dt * this.speed * 12) % this.len;
    const a = this._at(this.t, new Float64Array(3)), b = this._at((this.t + 0.02) % this.len, new Float64Array(3));
    const gh = this.ground.h(a[0], a[2]);
    a[1] = Math.max(a[1], gh + 120);
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const heading = Math.atan2(dx, -dz);
    const bank = clamp(wrapPi(heading - (this._h ?? heading)) * 30, -0.5, 0.5);
    this._h = heading;
    this._bank = lerp(this._bank ?? 0, bank, 0.05);
    cam.fov = (fov * Math.PI) / 180;
    // look slightly down the path with a gentle bank
    const upx = -Math.cos(heading) * 0.0 + Math.sin(heading + Math.PI / 2) * -this._bank * 0.3;
    cam.setPose(a[0], a[1], a[2], dx, Math.min(-8, b[1] - a[1] - 40), dz, upx, 1, Math.cos(heading + Math.PI / 2) * -this._bank * 0.3);
  }
}
