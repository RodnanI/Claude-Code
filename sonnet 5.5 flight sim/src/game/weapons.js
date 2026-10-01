import { resolveWeapon, munitionRecipe, MUNITIONS, storesMass } from '../aircraft/munitions.js';
export { storesMass };
import { mat3 } from '../core/math.js';
import { clamp } from '../core/util.js';
import { Rng } from '../core/rng.js';

const G = 9.81;
const _f = new Float64Array(3), _p = new Float64Array(3);

/* What the pilot has left to throw. One entry per weapon of the aircraft definition, with its stations and rounds. The stations
   decide which store parts are drawn on the airframe (channel store_<station>), the count decides what the HUD says, and the mass
   of what has gone is taken off the aircraft by the weapon system as it leaves. */
export class Loadout {
  constructor(spec) {
    this.spec = spec;
    this.list = spec.weapons.map((w) => {
      const def = resolveWeapon(w);
      const stations = (def.stations || []).map((id) => ({ id, rounds: def.type === 'rocket' ? (def.rounds ?? 1) : 1 }));
      return { def, ammo: def.type === 'gun' ? (def.ammo ?? 0) : 0, stations, cool: 0, acc: 0, next: 0 };
    });
    this.sel = 0;
  }

  remaining(i = this.sel) {
    const w = this.list[i];
    if (!w) return 0;
    if (w.def.type === 'gun') return w.ammo;
    let n = 0;
    for (const s of w.stations) n += s.rounds;
    return n;
  }

  get current() { return this.list[this.sel] || null; }

  /** Select the next weapon that still has something to throw (or the next one at all when everything is spent). */
  cycle(dir = 1) {
    const n = this.list.length;
    if (!n) return null;
    for (let k = 1; k <= n; k++) {
      const i = (this.sel + dir * k + n * k) % n;
      if (this.remaining(i) > 0) { this.sel = i; return this.current; }
    }
    this.sel = (this.sel + dir + n) % n;
    return this.current;
  }
}

/** Rotation matrix (column major, body +x along f, y up) for a model flying along a direction. */
function alongDir(out, fx, fy, fz) {
  const l = Math.hypot(fx, fy, fz) || 1;
  fx /= l; fy /= l; fz /= l;
  let ux = 0, uy = 1, uz = 0;
  if (Math.abs(fy) > 0.98) { ux = 1; uy = 0; }
  // z = f x up, y = z x f
  let zx = fy * uz - fz * uy, zy = fz * ux - fx * uz, zz = fx * uy - fy * ux;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  const yx = zy * fz - zz * fy, yy = zz * fx - zx * fz, yz = zx * fy - zy * fx;
  out[0] = fx; out[1] = fy; out[2] = fz;
  out[3] = yx; out[4] = yy; out[5] = yz;
  out[6] = zx; out[7] = zy; out[8] = zz;
  return out;
}

/**
 * Projectiles in flight and the pilot's trigger. Guns throw bullets that carry the aircraft's own velocity; rockets burn and fly
 * on; guided missiles fly to the spot the nose was pointing at over the ground when they left; bombs fall. Each is stepped in
 * small slices and tested along its path against the ground and the standing structures. The first thing it meets is where it
 * goes off: the game's explode() decides what that does to the island.
 */
export class WeaponSystem {
  constructor({ ground, collider, effects, models, explode, seed = 0x5eed }) {
    this.ground = ground;
    this.collider = collider;
    this.effects = effects;
    this.models = models;
    this.explode = explode;
    this.rng = new Rng(seed);
    this.shots = [];
    this.loadout = null;
    this.ent = null;
    this.pool = [];
    this.designation = null;
    this.designAt = 0;
    this.impact = null;
    this.impactAt = 0;
    this.time = 0;
    this.bay = 0; this.bayHold = 0; this.gunSpin = 0; this.flash = 0;
    this.stats = { fired: 0, blasts: 0 };
    this.toast = null;
  }

  attach(ent) {
    this.ent = ent;
    this.loadout = new Loadout(ent.spec);
    this.shots.length = 0;
    this.designation = null; this.impact = null;
    this.bay = 0; this.bayHold = 0; this.gunSpin = 0; this.flash = 0;
    ent.model.payload = (ent.spec.mass.payload || 0) + storesMass(ent.spec);
    this._channels();
  }

  get armed() { return !!(this.loadout && this.loadout.list.length); }

  select(dir = 1) {
    if (!this.loadout) return null;
    this.loadout.cycle(dir);
    this.designation = null; this.impact = null;
    return this.loadout.current;
  }

  /** Publish what is left on the airframe to the aircraft's animation channels. */
  _channels() {
    const ent = this.ent, lo = this.loadout;
    if (!ent || !lo) return;
    const ch = ent.extra;
    for (const st of ent.spec.stations) ch['store_' + st.id] = 0;
    for (const w of lo.list) for (const s of w.stations) if (s.rounds > 0) ch['store_' + s.id] = 1;
    ch.bay = this.bay; ch.gunSpin = this.gunSpin; ch.muzzle = this.flash > 0 ? 1 : 0;
  }

  // ------------------------------------------------------------------ geometry
  _nose(out) { const e = this.ent; return Object.assign(out, [e.rot[0], e.rot[1], e.rot[2]]); }

  /** Where the nose line meets the ground or a building, within `range`. Marches in steps that grow with distance. */
  designate(ent, range = 6000) {
    const o = ent.pos, e = ent.rot;
    const fx = e[0], fy = e[1], fz = e[2];
    const ground = this.ground, col = this.collider;
    let s = 30, prev = 0;
    while (s < range) {
      const x = o[0] + fx * s, y = o[1] + fy * s, z = o[2] + fz * s;
      const gh = ground.h(x, z);
      if (y <= gh || (y < gh + 320 && col.pointSolid(x, y, z))) {
        // refine between the last miss and this hit
        let a = prev, b = s;
        for (let i = 0; i < 7; i++) {
          const m = (a + b) / 2, mx = o[0] + fx * m, my = o[1] + fy * m, mz = o[2] + fz * m;
          if (my <= ground.h(mx, mz) || (my < ground.h(mx, mz) + 320 && col.pointSolid(mx, my, mz))) b = m; else a = m;
        }
        return { x: o[0] + fx * b, y: o[1] + fy * b, z: o[2] + fz * b, dist: b };
      }
      prev = s;
      s += 14 + s * 0.012;
    }
    return null;
  }

  /** Where a bomb let go this instant would land, from a simple ballistic walk. */
  _predictBomb(ent, def) {
    const v = ent.model.vel;
    let x = ent.pos[0], y = ent.pos[1] - 0.8, z = ent.pos[2], vx = v[0], vy = v[1], vz = v[2];
    const dt = 0.12, k = def.dragK || 0;
    for (let i = 0; i < 360; i++) {
      const sp = Math.hypot(vx, vy, vz), q = 1 / (1 + k * sp * dt);
      vx *= q; vy = vy * q - G * dt; vz *= q;
      x += vx * dt; y += vy * dt; z += vz * dt;
      const gh = this.ground.h(x, z);
      if (y <= gh) return { x, y: gh, z, t: (i + 1) * dt };
    }
    return null;
  }

  // ------------------------------------------------------------------ firing
  /** The trigger. held is the fire control this frame. Returns true when anything left the aircraft. */
  trigger(ent, held, dt, edge = false) {
    const lo = this.loadout;
    if (!lo || !(held || edge) || ent.model.crashed) return false;
    const w = lo.current;
    if (!w) return false;
    const def = w.def;
    if (w.cool > 0) return false;
    if (lo.remaining() <= 0) { this.toast = this.toast || { text: `${def.name}: empty`, tone: 'bad' }; w.cool = 0.5; return false; }
    switch (def.type) {
      case 'gun': return this._fireGun(ent, w, dt);
      case 'rocket': return this._fireRocket(ent, w);
      case 'missile': return edge ? this._fireMissile(ent, w) : false;
      case 'bomb': return edge ? this._dropBomb(ent, w) : false;
      default: return false;
    }
  }

  _launchVel(out, ent, dir, speed) {
    const v = ent.model.vel;
    out[0] = v[0] + dir[0] * speed; out[1] = v[1] + dir[1] * speed; out[2] = v[2] + dir[2] * speed;
    return out;
  }

  _spread(out, f, spread) {
    const r = this.rng;
    // a random direction inside a cone about f
    const a = r.next() * 6.283, s = Math.sqrt(r.next()) * spread;
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(f[1]) > 0.95) { ux = 1; uy = 0; }
    let zx = f[1] * uz - f[2] * uy, zy = f[2] * ux - f[0] * uz, zz = f[0] * uy - f[1] * ux;
    const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    const yx = zy * f[2] - zz * f[1], yy = zz * f[0] - zx * f[2], yz = zx * f[1] - zy * f[0];
    const c = Math.cos(a) * s, d = Math.sin(a) * s;
    out[0] = f[0] + yx * c + zx * d; out[1] = f[1] + yy * c + zy * d; out[2] = f[2] + yz * c + zz * d;
    const l = Math.hypot(out[0], out[1], out[2]);
    out[0] /= l; out[1] /= l; out[2] /= l;
    return out;
  }

  _fireGun(ent, w, dt) {
    const def = w.def;
    w.acc += def.rate * Math.min(dt, 0.05) * (def.barrels ?? 1);
    let n = Math.floor(w.acc);
    if (n < 1) return false;
    w.acc -= n;
    n = Math.min(n, w.ammo, 12);
    if (n < 1) return false;
    const muzzles = def.muzzles || [def.muzzle || [3, 0, 0]];
    const f = [ent.rot[0], ent.rot[1], ent.rot[2]];
    const dir = [0, 0, 0], v = [0, 0, 0], o = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const mz = muzzles[(w.next++) % muzzles.length];
      ent.worldPoint(o, mz[0], mz[1], mz[2]);
      this._spread(dir, f, def.spread);
      // a gun is harmonized to meet its line of sight a few hundred meters out: nothing to do, the muzzles sit on the nose axis
      this._launchVel(v, ent, dir, def.speed);
      // spread the shots across this frame so the stream is continuous
      const back = (i / n) * dt * 0.9;
      const b = this._add(w, 'bullet', o[0] - v[0] * back, o[1] - v[1] * back, o[2] - v[2] * back, v);
      b.isTracer = def.tracer ? ((w.count = (w.count || 0) + 1) % def.tracer === 0) : false;
      if (this.effects && i === 0) this.effects.muzzle(o[0], o[1], o[2], f[0], f[1], f[2], def.flash ?? 0.45);
      w.ammo--;
    }
    this.flash = 0.06;
    this.stats.fired += n;
    return true;
  }

  _fireRocket(ent, w) {
    const def = w.def;
    // fire from the station with the most left, so a pod empties evenly
    let st = null;
    for (const s of w.stations) if (s.rounds > 0 && (!st || s.rounds > st.rounds)) st = s;
    if (!st) return false;
    const spec = ent.spec.stations.find((q) => q.id === st.id);
    const i = (def.rounds ?? 1) - st.rounds;
    // tubes in a hex pattern around the pod axis
    const ring = i % 7, ang = ring === 0 ? 0 : ((ring - 1) / 6) * 6.283, rad = ring === 0 ? 0 : (def.tube ?? 0.07);
    const o = [0, 0, 0];
    ent.worldPoint(o, spec.pos[0] + (def.muzzleX ?? 0.6), spec.pos[1] + Math.sin(ang) * rad, spec.pos[2] + Math.cos(ang) * rad);
    const f = [ent.rot[0], ent.rot[1], ent.rot[2]], dir = [0, 0, 0], v = [0, 0, 0];
    this._spread(dir, f, def.spread);
    this._launchVel(v, ent, dir, def.speed0);
    const p = this._add(w, 'rocket', o[0], o[1], o[2], v);
    p.wobblePh = this.rng.next() * 6.283;
    st.rounds--;
    ent.model.payload = Math.max(0, ent.model.payload - (def.mass || 0));
    w.cool = 1 / def.rate;
    this.stats.fired++;
    this._channels();
    return true;
  }

  _fireMissile(ent, w) {
    const def = w.def;
    // alternate sides: take the loaded station farthest from the center line that matches the next side
    const loaded = w.stations.filter((s) => s.rounds > 0);
    if (!loaded.length) return false;
    const st = loaded[w.next++ % loaded.length];
    const spec = ent.spec.stations.find((q) => q.id === st.id);
    const o = [0, 0, 0];
    ent.worldPoint(o, spec.pos[0], spec.pos[1] - 0.12, spec.pos[2]);
    const f = [ent.rot[0], ent.rot[1], ent.rot[2]], v = [0, 0, 0];
    // a missile drops away from the rail with a little push downward before the motor takes it
    const dir = [f[0], f[1], f[2]];
    this._launchVel(v, ent, dir, def.speed0);
    const tgt = def.lock === 'none' ? null : this.designate(ent, def.range);
    const p = this._add(w, 'missile', o[0], o[1], o[2], v);
    p.target = tgt ? [tgt.x, tgt.y, tgt.z] : null;
    st.rounds--;
    ent.model.payload = Math.max(0, ent.model.payload - (def.mass || 0));
    w.cool = def.cooldown ?? 0.8;
    this.stats.fired++;
    this._channels();
    if (!tgt) this.toast = { text: `${def.name}: no target, fired unguided`, tone: 'info' };
    return true;
  }

  _dropBomb(ent, w) {
    const def = w.def;
    const n = Math.min(def.salvo ?? 1, w.stations.filter((s) => s.rounds > 0).length);
    for (let k = 0; k < n; k++) {
      const loaded = w.stations.filter((s) => s.rounds > 0);
      if (!loaded.length) break;
      // take the station nearest the middle first so the aircraft stays balanced
      loaded.sort((a, b) => Math.abs(ent.spec.stations.find((q) => q.id === a.id).pos[2]) - Math.abs(ent.spec.stations.find((q) => q.id === b.id).pos[2]));
      const st = loaded[0];
      const spec = ent.spec.stations.find((q) => q.id === st.id);
      const o = [0, 0, 0];
      ent.worldPoint(o, spec.pos[0], spec.pos[1] - 0.25, spec.pos[2]);
      const v = ent.model.vel;
      const p = this._add(w, 'bomb', o[0], o[1], o[2], [v[0], v[1] - 1.5, v[2]]);
      p.spin = this.rng.range(-0.3, 0.3);
      st.rounds--;
      ent.model.payload = Math.max(0, ent.model.payload - (def.mass || 0));
      this.stats.fired++;
    }
    w.cool = def.salvo ? 0.55 : 0.3;
    this.bayHold = 2.2;
    this._channels();
    return true;
  }

  _add(w, kind, x, y, z, v) {
    const def = w.def;
    let p = this.pool.pop();
    if (!p) p = { entry: { mesh: null, x: 0, y: 0, z: 0, rot: new Float64Array(9), tint: [1, 1, 1], noPost: false, noShadow: true } };
    p.def = def; p.kind = kind; p.x = x; p.y = y; p.z = z; p.vx = v[0]; p.vy = v[1]; p.vz = v[2];
    p.t = 0; p.target = null; p.model = def.model; p.wobblePh = 0; p.spin = 0; p.px = x; p.py = y; p.pz = z; p.isTracer = false;
    this.shots.push(p);
    if (this.shots.length > 220) this._free(this.shots.shift());
    return p;
  }

  _free(p) { this.pool.push(p); }

  // ------------------------------------------------------------------ flight
  update(dt, ent) {
    this.time += dt;
    const lo = this.loadout;
    if (lo) {
      for (const w of lo.list) if (w.cool > 0) w.cool = Math.max(0, w.cool - dt);
      // bay doors open for a bomb drop and close a while after
      const sel = lo.current;
      const wantBay = sel && sel.def.bay && sel.def.type === 'bomb' && lo.remaining() > 0;
      if (this.bayHold > 0) this.bayHold -= dt;
      const target = wantBay || this.bayHold > 0 ? 1 : 0;
      this.bay += Math.max(-dt * 1.3, Math.min(dt * 1.3, target - this.bay));
      if (this.flash > 0) this.flash -= dt;
      this.gunSpin = (this.gunSpin + dt * 46 * (this.flash > 0 ? 1 : 0)) % (Math.PI * 2);
      this._channels();
    }
    if (dt <= 0) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    const h = dt / steps;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const p = this.shots[i];
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) dead = this._step(p, h);
      if (dead) { const last = this.shots.pop(); if (i < this.shots.length) this.shots[i] = last; this._free(p); }
      else this._trail(p, dt);
    }
    // sights for the HUD, a few times a second
    if (ent && lo && lo.current && !ent.model.crashed) {
      const def = lo.current.def;
      if (this.time - this.designAt > 0.12 && def.type === 'missile') { this.designation = this.designate(ent, def.range); this.designAt = this.time; }
      if (this.time - this.impactAt > 0.1 && def.type === 'bomb') { this.impact = this._predictBomb(ent, def); this.impactAt = this.time; }
    }
  }

  /** One slice of one projectile. Returns true when it is finished. */
  _step(p, h) {
    const d = p.def;
    p.t += h;
    p.px = p.x; p.py = p.y; p.pz = p.z;
    let sp = Math.hypot(p.vx, p.vy, p.vz) || 1e-3;
    if (p.kind === 'rocket' || p.kind === 'missile') {
      if (p.t < d.burn) sp = Math.min(d.speed, sp + d.accel * h);
      else if (d.dragK) sp = sp / (1 + d.dragK * sp * h);
      let dx = p.vx / sp, dy = p.vy / sp, dz = p.vz / sp;
      if (p.kind === 'missile' && p.target) {
        let tx = p.target[0] - p.x, ty = p.target[1] - p.y, tz = p.target[2] - p.z;
        const dist = Math.hypot(tx, ty, tz) || 1;
        // aim a little high by the drop that the flight time will cost
        ty += 0.5 * G * (d.grav ?? 1) * (dist / Math.max(sp, 50)) ** 2;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        const dot = clamp(dx * tx + dy * ty + dz * tz, -1, 1), ang = Math.acos(dot);
        const f = ang < 1e-4 ? 0 : Math.min(1, (d.turn * h) / ang);
        dx += (tx - dx) * f; dy += (ty - dy) * f; dz += (tz - dz) * f;
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        if (dist < (d.prox ?? 4) && p.t > 0.4) { this._boom(p, p.x, p.y, p.z, false); return true; }
      } else if (d.wobble && p.t < d.burn + 1) {
        const w = d.wobble * (1.2 + Math.sin(p.t * 9 + p.wobblePh));
        dx += (Math.sin(p.t * 13 + p.wobblePh) * w) * h * 2.2; dy += (Math.cos(p.t * 11 + p.wobblePh * 2) * w) * h * 1.6; dz += (Math.sin(p.t * 7.3 + p.wobblePh * 3) * w) * h * 2.2;
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
      }
      p.vx = dx * sp; p.vy = dy * sp - G * (d.grav ?? 1) * h; p.vz = dz * sp;
    } else {
      // bullets and bombs coast: quadratic drag, gravity
      const k = d.dragK || 0;
      if (k) { const q = 1 / (1 + k * sp * h); p.vx *= q; p.vy *= q; p.vz *= q; }
      p.vy -= G * (d.grav ?? 1) * h;
    }
    p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
    // out of time
    const life = d.life ?? (p.kind === 'bomb' ? 90 : 10);
    if (p.t > life) {
      if (p.kind === 'missile' || p.kind === 'rocket') this._boom(p, p.x, p.y, p.z, true);
      return true;
    }
    // a cluster bomb opens above the ground
    if (d.cluster && p.kind === 'bomb' && p.vy < 0) {
      const agl = p.y - this.ground.h(p.x, p.z);
      if (agl < d.cluster.height && p.t > 0.8) { this._open(p); return true; }
    }
    // along the path
    const hit = this._trace(p);
    if (hit) { this._boom(p, hit.x, hit.y, hit.z, false, hit); return true; }
    return false;
  }

  /** The first thing between where the projectile was and where it is: ground (and sea) or a standing structure. */
  _trace(p) {
    const x0 = p.px, y0 = p.py, z0 = p.pz, dx = p.x - x0, dy = p.y - y0, dz = p.z - z0;
    const len = Math.hypot(dx, dy, dz);
    const stepLen = p.kind === 'bullet' ? 5 : 3;
    const n = Math.max(1, Math.ceil(len / stepLen));
    const ground = this.ground, col = this.collider;
    let lastT = 0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + dx * t, y = y0 + dy * t, z = z0 + dz * t;
      const gh = ground.h(x, z);
      let kind = null;
      if (y <= gh) kind = 'ground';
      else if (y < gh + 330 && col.pointSolid(x, y, z)) kind = 'structure';
      if (kind) {
        // bisect to the entry point
        let a = lastT, b = t;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2, mx = x0 + dx * m, my = y0 + dy * m, mz = z0 + dz * m;
          const g = ground.h(mx, mz);
          if (my <= g || (my < g + 330 && col.pointSolid(mx, my, mz))) b = m; else a = m;
        }
        return { x: x0 + dx * b, y: y0 + dy * b, z: z0 + dz * b, kind };
      }
      lastT = t;
    }
    return null;
  }

  _trail(p, dt) {
    const e = this.effects;
    if (!e) return;
    const d = p.def;
    if (p.kind === 'bullet') {
      if (p.isTracer) e.tracer(p.px, p.py, p.pz, p.x, p.y, p.z, 0.2);
      return;
    }
    if ((p.kind === 'rocket' || p.kind === 'missile') && d.trail && p.t < d.burn + 0.5) e.motor(p.x, p.y, p.z, p.vx, p.vy, p.vz, dt, p.t < d.burn ? 1 : 0.1, d.trail);
  }

  _open(p) {
    const d = p.def, c = d.cluster, rng = this.rng, bomb = MUNITIONS.bomblet;
    const w = { def: { ...bomb, blast: d.blast, name: 'Bomblet', type: 'bomb' } };
    const dir = [0, 0, 0];
    this.effects && this.effects.flame(p.x, p.y, p.z, 0, 0, 0, 1.2, 0.2);
    for (let i = 0; i < c.n; i++) {
      const a = rng.next() * 6.283, s = Math.sqrt(rng.next()) * c.spread;
      const q = this._add(w, 'bomb', p.x, p.y, p.z, [p.vx * 0.5 + Math.cos(a) * s * 0.6, p.vy * 0.4 - 4, p.vz * 0.5 + Math.sin(a) * s * 0.6]);
      q.t = 1;
    }
  }

  _boom(p, x, y, z, air, hit) {
    const d = p.def;
    const water = !!hit && hit.kind === 'ground' && this.ground.surface && this.ground.surface(x, z) === 'WATER';
    this.stats.blasts++;
    this.explode({ x, y, z, r: d.blast, def: d, kind: p.kind, air, water, structure: !!hit && hit.kind === 'structure', fuel: d.fuel || 0, vx: p.vx, vy: p.vy, vz: p.vz });
  }

  // ------------------------------------------------------------------ drawing
  /** Append model entries for every projectile with a model. */
  emit(list, cam) {
    for (const p of this.shots) {
      if (!p.model) continue;
      const dx = p.x - cam.pos[0], dy = p.y - cam.pos[1], dz = p.z - cam.pos[2];
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 2200) continue;
      const cell = dist < 40 ? 0.03125 : dist < 160 ? 0.0625 : 0.125;
      const key = `mun:${p.model}:${cell}`;
      const mesh = this.models.fromRecipe(key, munitionRecipe(p.model), cell, { conservative: true });
      if (!mesh || !mesh.gpu) continue;
      const e = p.entry;
      e.mesh = mesh; e.x = p.x; e.y = p.y; e.z = p.z;
      alongDir(e.rot, p.vx, p.vy, p.vz);
      list.push(e);
    }
  }

  // ------------------------------------------------------------------ the HUD's view of it
  /** What the sights should draw. Directions and points are in the world. */
  info(ent) {
    const lo = this.loadout;
    if (!lo || !lo.current) return null;
    const w = lo.current, def = w.def;
    const f = [ent.rot[0], ent.rot[1], ent.rot[2]];
    const out = { name: def.name, type: def.type, count: lo.remaining(), index: lo.sel, total: lo.list.length, ready: w.cool <= 0, dir: f, pos: ent.pos, designation: null, impact: null, pipper: null, bay: this.bay };
    if (def.type === 'missile') out.designation = this.designation;
    else if (def.type === 'bomb') out.impact = this.impact;
    else if (def.type === 'gun' || def.type === 'rocket') {
      // where the line of fire is 650 m out: the shot leaves with the aircraft's own velocity and falls under gravity
      const sp = def.type === 'gun' ? def.speed : Math.min(def.speed, 320), v = ent.model.vel;
      const bx = v[0] + f[0] * sp, by = v[1] + f[1] * sp, bz = v[2] + f[2] * sp;
      const t = 650 / Math.max(Math.hypot(bx, by, bz), 50);
      out.pipper = [ent.pos[0] + bx * t, ent.pos[1] + by * t - 0.5 * G * (def.grav ?? 1) * t * t, ent.pos[2] + bz * t];
    }
    return out;
  }

  /** Take a pending toast message, once. */
  takeToast() { const t = this.toast; this.toast = null; return t; }

  reset() { this.shots.length = 0; this.designation = null; this.impact = null; }
}
