import { Recipe } from '../voxel/recipe.js';
import { Rng } from '../core/rng.js';
import { hashString, clamp } from '../core/util.js';
import { mat3 } from '../core/math.js';
import { SITES } from '../world/layout.js';

/**
 * Ambient life that is not on the roads: ships and boats on sea lanes around the island, boats at anchor off the big
 * harbors, and airliners that fly a full circuit at Meridian International (final approach, landing roll, taxi to the
 * terminal, wait, taxi out, take off, climb away). Everything is a pure function of the clock, so nothing is stored per
 * frame and the cost is a handful of matrix builds. Draw entries have the same shape as road vehicles.
 */

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return d; };
const ease = { lin: (u) => u, in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), io: (u) => u * u * (3 - 2 * u) };

/** Closed smooth curve through control points (uniform Catmull-Rom), resampled at roughly `step` meters. */
function smoothClosed(pts, step = 60) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return out;
}

/** A closed route with a constant speed and optional holds (a ship waiting at a berth). Position is a function of time. */
class Loop {
  constructor(pts, speed, holds = []) {
    this.pts = pts;
    const n = pts.length;
    this.cum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) this.cum[i + 1] = this.cum[i] + Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
    this.len = this.cum[n];
    this.speed = speed;
    // timeline of [t, s] knots: moving at `speed`, stationary during holds
    this.knots = [[0, 0]];
    let t = 0, s = 0;
    for (const h of holds.slice().sort((a, b) => a.s - b.s)) {
      t += (h.s - s) / speed; s = h.s;
      this.knots.push([t, s]);
      t += h.hold; this.knots.push([t, s]);
    }
    t += (this.len - s) / speed;
    this.knots.push([t, this.len]);
    this.period = t;
  }
  sAt(time) {
    const u = ((time % this.period) + this.period) % this.period;
    const k = this.knots;
    let lo = 0, hi = k.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (k[m][0] <= u) lo = m; else hi = m; }
    const [t0, s0] = k[lo], [t1, s1] = k[hi];
    return t1 > t0 ? s0 + ((s1 - s0) * (u - t0)) / (t1 - t0) : s0;
  }
  pointAt(s, out) {
    const cum = this.cum, n = this.pts.length;
    s = ((s % this.len) + this.len) % this.len;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[(lo + 1) % n];
    const u = (s - cum[lo]) / Math.max(1e-6, cum[lo + 1] - cum[lo]);
    out[0] = a[0] + (b[0] - a[0]) * u; out[1] = a[1] + (b[1] - a[1]) * u;
    return out;
  }
}

/** Scripted flight of one airliner around the airport: a list of timed segments in world coordinates. */
class AirTrack {
  constructor(segs) {
    this.segs = segs;
    this.period = segs[segs.length - 1].t1;
    for (const s of segs) { s.dx = s.b[0] - s.a[0]; s.dz = s.b[2] - s.a[2]; s.hd = Math.atan2(-s.dz, s.dx); s.moving = Math.hypot(s.dx, s.dz) > 0.5; }
    let prev = segs[0].hd;
    for (const s of segs) { if (!s.moving) s.hd = prev; prev = s.hd; s.prevHd = s.hd; }
    for (let i = 0; i < segs.length; i++) segs[i].prevHd = segs[(i + segs.length - 1) % segs.length].hd;
  }
  /** State at clock time: { x, y, z, yaw, pitch, gear, air } or null when the aircraft is away from the airport. */
  at(time, o) {
    const u = ((time % this.period) + this.period) % this.period;
    let seg = null;
    for (const s of this.segs) if (u >= s.t0 && u < s.t1) { seg = s; break; }
    if (!seg || seg.hidden) return null;
    const f = (u - seg.t0) / (seg.t1 - seg.t0), e = (ease[seg.ease || 'lin'])(f);
    o.x = seg.a[0] + seg.dx * e; o.z = seg.a[2] + seg.dz * e; o.y = seg.a[1] + (seg.b[1] - seg.a[1]) * e;
    const blend = clamp((u - seg.t0) / Math.min(5, (seg.t1 - seg.t0) * 0.45), 0, 1);
    o.yaw = seg.prevHd + angDiff(seg.prevHd, seg.hd) * blend * blend * (3 - 2 * blend);
    o.dyaw = angDiff(seg.prevHd, seg.hd) * (blend < 1 ? 1 / Math.max(1, Math.min(5, (seg.t1 - seg.t0) * 0.45)) : 0);
    const dur = seg.t1 - seg.t0;
    o.pitch = seg.pitch !== undefined ? seg.pitch : Math.atan2((seg.b[1] - seg.a[1]) / dur, Math.max(20, Math.hypot(seg.dx, seg.dz) / dur));
    o.gear = seg.gear ? 1 : 0;
    o.air = !!seg.air;
    o.speed = Math.hypot(seg.dx, seg.dz) / dur;
    return o;
  }
}

/** The airport circuit for Meridian International (frame: u east along the runways, v south, heading 90). */
function airportTrack() {
  const S = SITES.airport;
  const P = (u, v, y = 0) => [S.x + u, y, S.z + v];
  const elev = S.elev;
  const G = elev + 3.55 + 0.1;            // origin height when the wheels are on the ground
  const pts = [];
  const add = (t0, t1, a, b, o = {}) => pts.push({ t0, t1, a, b, ...o });
  const rollX = -1300, park = P(-500, -330, G);
  // final approach on 09R: three degrees from 16 km out, wheels down 200 m past the numbers, brakes on the roll
  add(0, 200, P(-16000, 300, elev + 3.55 + 830), P(-1500, 300, G + 4), { gear: 1, air: true, ease: 'lin', pitch: -0.06 });
  add(200, 203, P(-1500, 300, G + 4), P(-1300, 300, G), { gear: 1, air: true, pitch: 0.05 });
  add(203, 232, P(-1300, 300, G), P(-600, 300, G), { gear: 1, ease: 'out', pitch: 0 });
  // off the runway, north across the parallel taxiway and the other runway, into the apron
  add(232, 262, P(-600, 300, G), P(-600, -170, G), { gear: 1, ease: 'io', pitch: 0 });
  add(262, 276, P(-600, -170, G), P(-540, -270, G), { gear: 1, ease: 'io', pitch: 0 });
  add(276, 288, P(-540, -270, G), P(-500, -330, G), { gear: 1, ease: 'out', pitch: 0 });
  add(288, 400, park, park, { gear: 1, pitch: 0 });
  // taxi to the start of 09L
  add(400, 414, park, P(-560, -250, G), { gear: 1, ease: 'in', pitch: 0 });
  add(414, 430, P(-560, -250, G), P(-660, -190, G), { gear: 1, ease: 'lin', pitch: 0 });
  add(430, 458, P(-660, -190, G), P(-1150, -190, G), { gear: 1, ease: 'lin', pitch: 0 });
  add(458, 470, P(-1150, -190, G), P(-1150, -60, G), { gear: 1, ease: 'lin', pitch: 0 });
  add(470, 478, P(-1150, -60, G), P(-1120, -40, G), { gear: 1, ease: 'io', pitch: 0 });
  add(478, 484, P(-1120, -40, G), P(-1120, -40, G), { gear: 1, pitch: 0 });
  // take off toward the east and climb away
  add(484, 501, P(-1120, -40, G), P(-500, -40, G), { gear: 1, ease: 'in', pitch: 0 });
  add(501, 512, P(-500, -40, G), P(300, -40, G), { gear: 1, ease: 'lin', pitch: 0 });
  add(512, 519, P(300, -40, G), P(830, -40, G + 6), { gear: 1, air: true, ease: 'lin', pitch: 0.13 });
  add(519, 560, P(830, -40, G + 6), P(4300, -40, elev + 520), { gear: 0, air: true, ease: 'lin', pitch: 0.14 });
  add(560, 620, P(4300, -40, elev + 520), P(10100, -200, elev + 1400), { gear: 0, air: true, pitch: 0.1 });
  add(620, 700, P(10100, -200, elev + 1400), P(19100, -1100, elev + 2400), { gear: 0, air: true, pitch: 0.06 });
  add(700, 800, P(19100, -1100, elev + 2400), P(33100, -3000, elev + 3200), { gear: 0, air: true, pitch: 0.04 });
  add(800, 900, P(33100, -3000, elev + 3200), P(33100, -3000, elev + 3200), { hidden: true });
  return new AirTrack(pts);
}

export class AmbientSystem {
  constructor({ world, models, defs, seed = 1 }) {
    this.world = world;
    this.models = models;
    this.defs = new Map(defs.map((d) => [d.id, d]));
    this.rng = new Rng(seed ^ 0xa11b1e);
    this.time = 0;
    this.actors = [];
    this.recipes = new Map();
    this.pool = [];
    this.max = 1;
    this.stats = { count: 0, drawn: 0 };
    this._p = [0, 0]; this._q = [0, 0]; this._r = [0, 0];
    this._o = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, variant: 0 };
    this._state = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, gear: 0, air: false, speed: 0, dyaw: 0 };
    this._m1 = mat3.create(); this._m2 = mat3.create(); this._m3 = mat3.create();
  }

  isSea(x, z) { return this.world.heightAt(x, z, 32) < 0.4; }

  /** Ring around the island a given distance beyond the coast, found by marching in along rays from the middle. */
  coastLane(offset, rays = 72) {
    const cx = 1000, cz = 0, radii = [];
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU, dx = Math.cos(a), dz = Math.sin(a);
      let r = 26000;
      while (r > 500 && this.isSea(cx + dx * r, cz + dz * r)) r -= 250;
      radii.push(r + offset);
    }
    const sm = radii.map((_, i) => { let s = 0; for (let k = -3; k <= 3; k++) s += radii[(i + k + rays) % rays]; return s / 7; });
    return sm.map((r, i) => {
      const a = (i / rays) * TAU, dx = Math.cos(a), dz = Math.sin(a);
      r = Math.max(r, radii[i]);
      while (r < 30000 && !this.isSea(cx + dx * r, cz + dz * r)) r += 300;
      return [cx + dx * r, cz + dz * r];
    });
  }

  _add(a) { this.actors.push(a); }

  init() {
    const rng = this.rng, defs = this.defs;
    const have = (id) => defs.has(id);
    // ships on the coastal lane and the far lane, turning at a constant few knots
    const lanes = [
      { pts: this.coastLane(1100), speed: 8.5, ships: [['cargo-ship', 0, 0.02], ['tanker', 0, 0.15], ['cargo-ship', 1, 0.28], ['ferry', 0, 0.37, 13], ['cargo-ship', 2, 0.5], ['tanker', 0, 0.63], ['ferry', 0, 0.7, 13], ['cargo-ship', 1, 0.83], ['tug', 0, 0.9, 6]] },
      { pts: this.coastLane(3200), speed: 10.5, ships: [['cargo-ship', 2, 0.1], ['tanker', 0, 0.38], ['cargo-ship', 0, 0.66], ['tanker', 0, 0.9]], reverse: true },
    ];
    for (const lane of lanes) {
      if (!lane.pts || !have('cargo-ship')) continue;
      let pts = smoothClosed(lane.pts, 90);
      if (lane.reverse) pts = pts.reverse();
      for (const [id, v, phase, sp] of lane.ships) {
        if (!have(id)) continue;
        const loop = new Loop(pts, sp || lane.speed);
        this._add({ def: defs.get(id), variant: v, loop, phase: phase * loop.period, kind: 'loop', tint: null });
      }
    }
    // sailing boats circling off the coast towns, and boats at anchor waiting for a berth
    for (const key of ['dunmore', 'saltmarsh', 'portHalden', 'meridian']) {
      const S = SITES[key];
      const a = Math.atan2(S.z - 0, S.x - 1000);
      let r = 26000;
      while (r > 500 && this.isSea(1000 + Math.cos(a) * r, Math.sin(a) * r)) r -= 250;
      const coast = [1000 + Math.cos(a) * r, Math.sin(a) * r];
      const nboat = key === 'meridian' ? 3 : 4;
      for (let k = 0; k < nboat && have('sailboat'); k++) {
        const rad = rng.range(350, 800), off = rng.range(1300, 2400);
        const c = [coast[0] + Math.cos(a) * off, coast[1] + Math.sin(a) * off];
        const pts = [];
        for (let i = 0; i < 10; i++) { const t = (i / 10) * TAU + k; pts.push([c[0] + Math.cos(t) * rad * (1 + 0.15 * Math.sin(i * 2.1)), c[1] + Math.sin(t) * rad]); }
        if (!pts.every((p) => this.isSea(p[0], p[1]))) continue;
        const sm = smoothClosed(pts, 30), loop = new Loop(sm, rng.range(2.6, 4.2));
        this._add({ def: defs.get('sailboat'), variant: k % 3, loop, phase: rng.range(0, loop.period), kind: 'loop', tint: null });
      }
      if (key === 'meridian' || key === 'portHalden') {
        for (let k = 0; k < 3 && have('cargo-ship'); k++) {
          const off = 1700 + k * 520, lat = (k - 1) * 620;
          const p = [coast[0] + Math.cos(a) * off - Math.sin(a) * lat, coast[1] + Math.sin(a) * off + Math.cos(a) * lat];
          if (this.isSea(p[0], p[1])) this._add({ def: defs.get(k === 1 ? 'tanker' : 'cargo-ship'), variant: k, kind: 'anchor', x: p[0], z: p[1], yaw: a + Math.PI / 2 + rng.range(-0.4, 0.4), tint: null, phase: rng.range(0, 100) });
        }
      }
    }
    // airliners: two share the circuit, half a period apart
    if (have('airliner')) {
      for (let k = 0; k < 2; k++) this._add({ def: defs.get('airliner'), variant: k * 2, kind: 'air', track: airportTrack(), tint: null, phase: k * 450 });
    }
    // helicopters and an airship circling the big cities, on ellipses that keep clear of every tower under the path
    if (have('helicopter')) {
      const ellipse = (S, rx, rz, tilt, n = 14) => Array.from({ length: n }, (_, i) => {
        const t = (i / n) * TAU, x = Math.cos(t) * rx, z = Math.sin(t) * rz;
        return [S.x + x * Math.cos(tilt) - z * Math.sin(tilt), S.z + x * Math.sin(tilt) + z * Math.cos(tilt)];
      });
      const orbits = [
        { S: SITES.meridian, rx: 1900, rz: 1550, tilt: 0.4, alt: 310, speed: 44, phase: 0, variant: 0 },
        { S: SITES.meridian, rx: 2600, rz: 2150, tilt: 2.3, alt: 420, speed: 56, phase: 0.45, variant: 4, reverse: true },
        { S: SITES.portHalden, rx: 950, rz: 720, tilt: 1.1, alt: 340, speed: 40, phase: 0.2, variant: 8 },
        { S: SITES.ironford, rx: 1100, rz: 850, tilt: 0.3, alt: 250, speed: 38, phase: 0.7, variant: 12, reverse: true },
      ];
      for (const o of orbits) {
        let pts = smoothClosed(ellipse(o.S, o.rx, o.rz, o.tilt), 90);
        if (o.reverse) pts = pts.reverse();
        const loop = new Loop(pts, o.speed);
        this._add({ def: defs.get('helicopter'), variant: o.variant, loop, phase: o.phase * loop.period, kind: 'sky', alt: o.alt, bob: 5, tint: null });
      }
      if (have('airship')) {
        const loop = new Loop(smoothClosed(ellipse(SITES.meridian, 3400, 2750, 0.6), 200), 13);
        this._add({ def: defs.get('airship'), variant: rng.int(0, 2), loop, phase: 0.3 * loop.period, kind: 'sky', alt: 560, bob: 9, tint: null });
      }
    }
  }

  setMax(n) { this.max = Math.max(0, n); }
  update(dt) { this.time += Math.min(dt, 0.1); }

  _recipe(def, variant) {
    const key = def.id + ':' + variant;
    let r = this.recipes.get(key);
    if (!r) { r = new Recipe(); def.build(r, variant, new Rng(hashString(key))); this.recipes.set(key, r); }
    return r;
  }

  _entry(n) {
    let e = this.pool[n];
    if (!e) e = this.pool[n] = { mesh: null, x: 0, y: 0, z: 0, rot: new Float64Array(9), tint: [1, 1, 1], noPost: false };
    return e;
  }

  /** Rotation of an entry: yaw about y, then pitch about z, then roll about x, as the models use +x forward. */
  _rot(out, yaw, pitch, roll) {
    mat3.fromAxisAngle(this._m1, 0, 1, 0, yaw);
    if (!pitch && !roll) { for (let i = 0; i < 9; i++) out[i] = this._m1[i]; return; }
    mat3.fromAxisAngle(this._m2, 0, 0, 1, pitch);
    mat3.mul(this._m3, this._m1, this._m2);
    mat3.fromAxisAngle(this._m2, 1, 0, 0, roll);
    mat3.mul(out, this._m3, this._m2);
  }

  /** Pose of an actor at the current clock: writes x, y, z, yaw, pitch, roll and variant into o; false when it is away. */
  pose(a, o) {
    const def = a.def, t = this.time;
    o.variant = a.variant; o.pitch = 0; o.roll = 0;
    if (a.kind === 'loop' || a.kind === 'anchor') {
      if (a.kind === 'loop') {
        const s = a.loop.sAt(t + a.phase), p = a.loop.pointAt(s, this._p);
        o.x = p[0]; o.z = p[1];
        const q = a.loop.pointAt(s + 14, this._q);
        o.yaw = Math.atan2(-(q[1] - o.z), q[0] - o.x);
      } else { o.x = a.x; o.z = a.z; o.yaw = a.yaw; }
      const big = def.length > 60;
      const w = t * (big ? 0.55 : 1.1) + a.phase;
      o.y = (big ? 0.15 : 0.22) * Math.sin(w * 1.3);
      o.roll = (big ? 0.012 : 0.05) * Math.sin(w);
      o.pitch = (big ? 0.008 : 0.03) * Math.sin(w * 0.7 + 1);
      return true;
    }
    if (a.kind === 'sky') {
      const s = a.loop.sAt(t + a.phase), p = a.loop.pointAt(s, this._p);
      o.x = p[0]; o.z = p[1];
      const q = a.loop.pointAt(s + 20, this._q), r = a.loop.pointAt(s + 80, this._r);
      o.yaw = Math.atan2(-(q[1] - o.z), q[0] - o.x);
      const rate = angDiff(o.yaw, Math.atan2(-(r[1] - q[1]), r[0] - q[0])) / (60 / a.loop.speed);
      o.roll = clamp((-rate * a.loop.speed) / 9.81, -0.45, 0.45) * (def.rotor ? 1 : 0.4);
      o.pitch = def.rotor ? -0.07 : 0;
      o.y = a.alt + a.bob * Math.sin((t + a.phase) * 0.35);
      if (def.rotor) o.variant = (a.variant & ~3) | (Math.floor((t + a.phase) * 16) & 3);
      return true;
    }
    const st = a.track.at(t + a.phase, this._state);
    if (!st) return false;
    o.x = st.x; o.z = st.z; o.yaw = st.yaw; o.pitch = st.pitch; o.y = st.y;
    // never descend into terrain when flying over the hills
    if (st.air) o.y = Math.max(o.y, this.world.heightAt(o.x, o.z, 8) + 90 + def.ground);
    o.roll = st.air ? clamp(-st.dyaw * 2.2, -0.45, 0.45) : 0;
    o.variant = (a.variant & ~1) | st.gear;
    return true;
  }

  /** Append draw entries for actors in view range. pxPerRad is the camera projection scale. */
  emit(list, cam, pxPerRad) {
    if (this.max <= 0) return;
    const px = cam.pos[0], py = cam.pos[1], pz = cam.pos[2];
    const o = this._o;
    let n = 0;
    for (const a of this.actors) {
      const def = a.def;
      if (!this.pose(a, o)) continue;
      const dx = o.x - px, dy = o.y - py, dz = o.z - pz;
      const d = Math.hypot(dx, dy, dz);
      if (d > def.maxDist) continue;
      const want = (1.6 * d) / pxPerRad;
      let cell = def.cells[0];
      for (const c of def.cells) if (c <= want) cell = c;
      const key = `amb:${def.id}:${o.variant}:${cell}`;
      const mesh = this.models.fromRecipe(key, this._recipe(def, o.variant), cell, { conservative: cell >= 1.2 });
      if (!mesh || !mesh.gpu) continue;
      const e = this._entry(n++);
      e.mesh = mesh; e.x = o.x; e.y = o.y; e.z = o.z;
      this._rot(e.rot, o.yaw, o.pitch, o.roll);
      list.push(e);
    }
    this.stats.count = this.actors.length; this.stats.drawn = n;
  }
}
