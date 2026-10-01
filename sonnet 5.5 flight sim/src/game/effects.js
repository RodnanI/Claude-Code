import { Recipe } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';
import { Rng } from '../core/rng.js';
import { clamp, smoothstep, lerp } from '../core/util.js';

/* Fire, smoke, dust, debris and tracers, drawn as instanced voxels. Fire is a white to red ramp of emissive cubes (materials that
   glow in daylight too, so the bloom picks them up), smoke is a rounded puff tinted any gray, debris is small tinted cubes under
   gravity. One pool of particles, struct of arrays, swap-remove; every frame the live ones are sorted into eight batches and
   uploaded. Nothing here touches the flight model or the world: the weapons and the game call the emitters and read nothing back. */

const FIRE_RAMP = ['STROBE', 'HEADLIGHT', 'RWY_LIGHT_AMBER', 'RWY_LIGHT_RED', 'BEACON_RED', 'TAILLIGHT'];
const KIND = { FIRE: 0, SMOKE: 1, DEBRIS: 2, TRACER: 3 };
const SMOKE_BANK = 3;

const rgb = (r, g, b) => r | (g << 8) | (b << 16);                 // exact in a float32
const packTint = (r, g, b, bank = 0) => ((((bank + 255) & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;

export class Effects {
  constructor({ renderer, models, ground, max = 700, seed = 0xf1de }) {
    this.renderer = renderer;
    this.models = models;
    this.ground = ground;
    this.max = max;
    this.rng = new Rng(seed);
    this.n = 0;
    const f = () => new Float32Array(max);
    this.x = f(); this.y = f(); this.z = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.age = f(); this.life = f(); this.s0 = f(); this.s1 = f(); this.aux = f(); this.buoy = f(); this.drag = f();
    this.kind = new Uint8Array(max);
    this.fires = [];                       // burning places: { x, y, z, r, t, life }
    this.shakeAmp = 0;
    this.cam = [0, 0, 0];
    this.batches = null;
    this.stats = { live: 0 };
    this.data = null;
  }

  // ------------------------------------------------------------------ GPU side
  _init() {
    if (this.batches) return;
    const r = this.renderer, cap = this.max;
    const cube = (key, mat) => {
      const rc = new Recipe();
      rc.box(-0.3, -0.3, -0.3, 0.3, 0.3, 0.3, mat);                 // eight voxels of 0.5 m, one meter wide
      return this.models.fromRecipe(key, rc, 0.5, { conservative: false, ao: false });
    };
    const ball = () => {
      const rc = new Recipe();
      rc.ell(0, 0, 0, 1, 1, 1, M.LEAF_PINE_L);
      return this.models.fromRecipe('fx:puff', rc, 0.5, { conservative: false, ao: false });
    };
    this.batches = {
      fire: FIRE_RAMP.map((n) => r.createFx(cube('fx:fire:' + n, M[n]), cap)),
      smoke: r.createFx(ball(), cap),
      debris: r.createFx(cube('fx:debris', M.PETAL), cap),
    };
    this.data = {
      fire: FIRE_RAMP.map(() => new Float32Array(cap * 6)),
      smoke: new Float32Array(cap * 6),
      debris: new Float32Array(cap * 6),
    };
    this.u32 = {
      fire: this.data.fire.map((a) => new Uint32Array(a.buffer)),
      smoke: new Uint32Array(this.data.smoke.buffer),
      debris: new Uint32Array(this.data.debris.buffer),
    };
  }

  /** Change the particle budget (a quality setting). Existing particles beyond the new cap are dropped. */
  setMax(max) {
    max = Math.max(60, max | 0);
    if (max === this.max) return;
    const keep = Math.min(this.n, max);
    const grow = (a) => { const b = new Float32Array(max); b.set(a.subarray(0, keep)); return b; };
    for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'life', 's0', 's1', 'aux', 'buoy', 'drag']) this[k] = grow(this[k]);
    const kd = new Uint8Array(max); kd.set(this.kind.subarray(0, keep)); this.kind = kd;
    this.n = keep; this.max = max;
    if (this.batches) this.dispose();
  }

  dispose() {
    if (!this.batches) return;
    for (const b of [...this.batches.fire, this.batches.smoke, this.batches.debris]) this.renderer.freeInstances(b);
    this.batches = null;
  }

  // ------------------------------------------------------------------ emitters
  _spawn(kind, x, y, z, vx, vy, vz, life, s0, s1, aux = 0, buoy = 0, drag = 0) {
    let i = this.n;
    if (i >= this.max) {
      if (kind === KIND.SMOKE) return;                       // smoke is the first thing to give way
      i = Math.floor(this.rng.next() * this.max);
    } else this.n++;
    this.kind[i] = kind;
    this.x[i] = x; this.y[i] = y; this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.age[i] = 0; this.life[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.aux[i] = aux; this.buoy[i] = buoy; this.drag[i] = drag;
  }

  _dir(out, spread = 1) {
    const r = this.rng;
    let a, b, c, l;
    do { a = r.next() * 2 - 1; b = r.next() * 2 - 1; c = r.next() * 2 - 1; l = a * a + b * b + c * c; } while (l > 1 || l < 0.01);
    l = Math.sqrt(l);
    out[0] = (a / l) * spread; out[1] = (b / l) * spread; out[2] = (c / l) * spread;
    return out;
  }

  /**
   * A high explosion of lethal radius r meters. opts.ground (default true) throws dirt and a dust ring, opts.water makes a
   * column of spray instead of fire, opts.fuel adds a long burn, opts.scale thins the effect for far cheap ones.
   */
  explosion(x, y, z, r, opts = {}) {
    const rng = this.rng, d = [0, 0, 0];
    const scale = opts.scale ?? 1;
    const ground = opts.ground !== false, water = !!opts.water;
    const nf = Math.round(clamp(r * 2.4, 10, 80) * scale), ns = Math.round(clamp(r * 2.2, 10, 70) * scale), nd = Math.round(clamp(r * 1.6, 6, 50) * scale);
    this.addShake(x, y, z, r * 1.5);
    if (water) {
      for (let i = 0; i < ns; i++) {
        this._dir(d);
        const a = rng.next() * 6.283, sp = rng.range(0.2, 0.9) * r * 0.9;
        this._spawn(KIND.SMOKE, x + Math.cos(a) * r * 0.1, y, z + Math.sin(a) * r * 0.1, Math.cos(a) * sp * 0.5, rng.range(0.5, 1.4) * r * 0.9, Math.sin(a) * sp * 0.5, rng.range(1.4, 2.6), r * 0.16, r * rng.range(0.4, 0.7), rgb(250, 252, 255), -r * 0.35, 0.7);
      }
      return;
    }
    // the flash and the fireball
    for (let i = 0; i < 6; i++) this._spawn(KIND.FIRE, x, y + r * 0.2, z, 0, 0, 0, rng.range(0.1, 0.22), r * 0.45, r * 0.7, 0, 0, 0);
    for (let i = 0; i < nf; i++) {
      this._dir(d, rng.range(0.4, 1) * r * 1.5);
      const up = ground ? Math.abs(d[1]) * 0.8 + r * 0.25 : d[1];
      this._spawn(KIND.FIRE, x + d[0] * 0.1, y + r * 0.1, z + d[2] * 0.1, d[0], up, d[2], rng.range(0.6, 1.5) * (0.7 + Math.sqrt(r) * 0.12), r * rng.range(0.14, 0.3), r * rng.range(0.28, 0.5), 0, 4 + r * 0.1, 1.6);
    }
    // the column
    for (let i = 0; i < ns; i++) {
      this._dir(d, r * rng.range(0.1, 0.55));
      const g = Math.round(rng.range(34, 90));
      this._spawn(KIND.SMOKE, x + d[0] * 0.3, y + r * 0.3, z + d[2] * 0.3, d[0], Math.abs(d[1]) + r * rng.range(0.5, 1.35), d[2], rng.range(5, 11), r * rng.range(0.12, 0.2), r * rng.range(0.4, 0.75), g, 2.2 + r * 0.04, 0.55);
    }
    if (ground) {
      // dirt thrown up and a dust ring racing out along the ground
      for (let i = 0; i < nd; i++) {
        this._dir(d, rng.range(0.4, 1) * (14 + r * 1.2));
        this._spawn(KIND.DEBRIS, x, y + 0.5, z, d[0], Math.abs(d[1]) * 1.1 + 8 + r * 0.5, d[2], rng.range(2.4, 4.4), rng.range(0.25, 0.7) * (1 + r * 0.02), 0, rng.int(0, 4), 0, 0.05);
      }
      const nr = Math.round(clamp(r * 1.2, 10, 40) * scale);
      for (let i = 0; i < nr; i++) {
        const a = (i / nr) * 6.283 + rng.next() * 0.3, sp = r * rng.range(1.5, 2.6);
        this._spawn(KIND.SMOKE, x, y + 0.6, z, Math.cos(a) * sp, rng.range(0.3, 1.2), Math.sin(a) * sp, rng.range(1.4, 2.8), r * 0.12, r * rng.range(0.26, 0.42), 200 + rng.int(0, 28), 0.4, 1.8);
      }
    }
    if (opts.fuel) this.burn(x, y, z, r * 0.9, opts.fuel);
  }

  /** A small hit: a cannon shell or a bullet striking dirt, concrete or water. */
  impact(x, y, z, r = 1.2, water = false) {
    const rng = this.rng, d = [0, 0, 0];
    this.addShake(x, y, z, r * 0.6);
    if (water) {
      for (let i = 0; i < 3; i++) this._spawn(KIND.SMOKE, x, y, z, rng.range(-1, 1), rng.range(3, 6), rng.range(-1, 1), rng.range(0.6, 1.1), 0.25, 0.7, rgb(250, 252, 255), -3, 0.8);
      return;
    }
    this._spawn(KIND.FIRE, x, y + 0.2, z, 0, 1, 0, 0.12, r * 0.5, r * 0.8);
    this._spawn(KIND.FIRE, x, y + 0.3, z, 0, 2, 0, 0.3, r * 0.3, r * 0.5, 0, 2, 2);
    for (let i = 0; i < 3; i++) { this._dir(d, rng.range(1, 4) * r); this._spawn(KIND.SMOKE, x, y + 0.3, z, d[0], Math.abs(d[1]) + 1, d[2], rng.range(1.2, 2.4), r * 0.2, r * 0.6, 140 + rng.int(0, 60), 0.8, 1); }
    for (let i = 0; i < 4; i++) { this._dir(d, rng.range(4, 11)); this._spawn(KIND.DEBRIS, x, y + 0.2, z, d[0], Math.abs(d[1]) + 3, d[2], rng.range(0.8, 1.6), rng.range(0.08, 0.2), 0, rng.int(0, 4), 0, 0.1); }
  }

  /** A lasting fire: smoke and flame for `seconds` at a place of radius r (a burning building or wreck). */
  burn(x, y, z, r, seconds = 30) {
    if (this.fires.length > 40) this.fires.shift();
    this.fires.push({ x, y, z, r, t: 0, life: seconds, acc: 0 });
  }

  /** A building coming down: a wide cloud of dust and rubble from its footprint. */
  collapse(x, y, z, w, d, h, share = 1) {
    const rng = this.rng;
    const n = Math.round(clamp((w + d) * 0.9 * share, 8, 44));
    this.addShake(x, y, z, Math.sqrt(w * d) * 0.8 * share);
    for (let i = 0; i < n; i++) {
      const px = x + rng.range(-w / 2, w / 2), pz = z + rng.range(-d / 2, d / 2);
      const a = Math.atan2(pz - z, px - x), sp = rng.range(2, 9);
      const g = 150 + rng.int(0, 40);
      this._spawn(KIND.SMOKE, px, y + rng.range(0, h * 0.5), pz, Math.cos(a) * sp, rng.range(1, 5), Math.sin(a) * sp, rng.range(5, 10), 2.2, rng.range(7, 13) * Math.min(1.4, 0.5 + share), g, 0.9, 0.5);
    }
    const nd = Math.round(clamp(n * 0.9, 6, 36));
    for (let i = 0; i < nd; i++) this._spawn(KIND.DEBRIS, x + rng.range(-w / 3, w / 3), y + rng.range(1, h * 0.7), z + rng.range(-d / 3, d / 3), rng.range(-8, 8), rng.range(0, 6), rng.range(-8, 8), rng.range(2.5, 4.5), rng.range(0.3, 1.1), 0, rng.int(0, 3), 0, 0.02);
    this.burn(x, y + 1, z, Math.min(w, d) * 0.35, 18 + share * 20);
  }

  /** Motor exhaust and the smoke it leaves, once per frame per rocket or missile. dt is the frame time. */
  motor(x, y, z, vx, vy, vz, dt, power = 1, size = 0.5) {
    const rng = this.rng, n = Math.max(1, Math.round(dt * 90 * power));
    for (let i = 0; i < n; i++) {
      const t = (i + rng.next()) / n;
      const bx = x - vx * dt * t, by = y - vy * dt * t, bz = z - vz * dt * t;
      this._spawn(KIND.SMOKE, bx, by, bz, rng.range(-0.4, 0.4), rng.range(-0.2, 0.5), rng.range(-0.4, 0.4), rng.range(2.4, 4.2), size * 0.55, size * rng.range(1.6, 2.6), 236 + rng.int(0, 18), 0.25, 0.5);
      if (power > 0.2) this._spawn(KIND.FIRE, bx, by, bz, -vx * 0.04, -vy * 0.04, -vz * 0.04, rng.range(0.07, 0.14), size * 0.7, size * 0.3, 0, 0, 3);
    }
  }

  /** Exhaust flame without a trail (a weapon seen from far off, or a jet's burner when it is not part of the model). */
  flame(x, y, z, vx, vy, vz, size = 0.4, life = 0.12) {
    this._spawn(KIND.FIRE, x, y, z, vx, vy, vz, life, size, size * 0.4, 0, 0, 2);
  }

  /** A bright dash along a bullet's path this frame: p0 to p1. */
  tracer(x0, y0, z0, x1, y1, z1, size = 0.22) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
    const n = Math.max(1, Math.min(6, Math.round(len / 2.4)));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      this._spawn(KIND.TRACER, x0 + dx * t, y0 + dy * t, z0 + dz * t, 0, 0, 0, 0.1, size, size * 0.3, 0, 0, 0);
    }
  }

  /** Muzzle flash: a brief cone of fire ahead of a gun. */
  muzzle(x, y, z, dx, dy, dz, size = 0.5) {
    const rng = this.rng;
    for (let i = 0; i < 3; i++) this._spawn(KIND.FIRE, x + dx * i * size * 0.5, y + dy * i * size * 0.5, z + dz * i * size * 0.5, dx * 14, dy * 14, dz * 14, rng.range(0.04, 0.08), size * (1 - i * 0.2), size * 0.3, 0, 0, 2);
  }

  /** Smoke from a stricken vehicle or a small fire. */
  puffAt(x, y, z, size = 0.8, gray = 60) {
    const rng = this.rng;
    this._spawn(KIND.SMOKE, x, y, z, rng.range(-0.5, 0.5), rng.range(2, 4), rng.range(-0.5, 0.5), rng.range(4, 8), size * 0.5, size * rng.range(2, 3.2), gray, 1.2, 0.4);
  }

  addShake(x, y, z, power) {
    const d = Math.hypot(x - this.cam[0], y - this.cam[1], z - this.cam[2]);
    const k = power / Math.max(30, d * 0.25 + 20);
    this.shakeAmp = Math.min(1.2, this.shakeAmp + k * 0.35);
  }

  clear() { this.n = 0; this.fires.length = 0; this.shakeAmp = 0; }

  // ------------------------------------------------------------------ step and draw
  update(dt, camPos) {
    dt = Math.min(dt, 0.1);
    this.cam[0] = camPos[0]; this.cam[1] = camPos[1]; this.cam[2] = camPos[2];
    this.shakeAmp *= Math.exp(-dt * 3.2);
    const rng = this.rng;
    // lasting fires
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.t += dt;
      if (f.t >= f.life) { this.fires.splice(i, 1); continue; }
      const fade = 1 - smoothstep(0.55, 1, f.t / f.life);
      f.acc += dt * (4 + f.r * 1.4) * fade;
      while (f.acc >= 1) {
        f.acc -= 1;
        const a = rng.next() * 6.283, rr = Math.sqrt(rng.next()) * f.r;
        const px = f.x + Math.cos(a) * rr, pz = f.z + Math.sin(a) * rr, py = f.y + rng.range(0, 1.2);
        if (rng.next() < 0.55) this._spawn(KIND.FIRE, px, py, pz, rng.range(-0.4, 0.4), rng.range(1, 3), rng.range(-0.4, 0.4), rng.range(0.5, 1.1), 0.5 + f.r * 0.05, 0.9 + f.r * 0.07, 0, 3, 1);
        this._spawn(KIND.SMOKE, px, py + 0.8, pz, rng.range(-0.6, 0.6), rng.range(2.5, 5), rng.range(-0.6, 0.6), rng.range(5, 10), 0.8 + f.r * 0.08, 2.5 + f.r * 0.22, 36 + rng.int(0, 40), 1.4, 0.45);
      }
    }
    const { x, y, z, vx, vy, vz, age, life, kind, buoy, drag } = this;
    const ground = this.ground;
    for (let i = this.n - 1; i >= 0; i--) {
      const a = (age[i] += dt);
      if (a >= life[i]) { this._remove(i); continue; }
      const k = Math.exp(-drag[i] * dt);
      vx[i] *= k; vz[i] *= k;
      if (kind[i] === KIND.DEBRIS) {
        vy[i] -= 9.8 * dt; vy[i] *= 1 - drag[i] * dt;
      } else vy[i] = vy[i] * k + buoy[i] * dt;
      x[i] += vx[i] * dt; y[i] += vy[i] * dt; z[i] += vz[i] * dt;
      if (kind[i] === KIND.DEBRIS || (kind[i] === KIND.SMOKE && a < 1.5)) {
        const gh = ground.h(x[i], z[i]);
        if (y[i] < gh + 0.1) {
          y[i] = gh + 0.1;
          if (kind[i] === KIND.DEBRIS) { vy[i] = Math.abs(vy[i]) * 0.25; vx[i] *= 0.55; vz[i] *= 0.55; if (vy[i] < 1) { vy[i] = 0; } } else vy[i] = Math.max(vy[i], 0);
        }
      }
    }
    this.stats.live = this.n;
  }

  _remove(i) {
    const j = --this.n;
    if (i === j) return;
    for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'life', 's0', 's1', 'aux', 'buoy', 'drag']) this[k][i] = this[k][j];
    this.kind[i] = this.kind[j];
  }

  /** Sort the live particles into the batches and upload them. Returns the list for renderer.render({ fx }). */
  emit(camPos, maxDist = 2600) {
    this._init();
    const ox = Math.floor(camPos[0] / 512) * 512, oz = Math.floor(camPos[2] / 512) * 512;
    const D = this.data, U = this.u32, B = this.batches;
    const nf = FIRE_RAMP.length;
    const cnt = this._cnt || (this._cnt = new Int32Array(nf + 2));
    cnt.fill(0);
    const md2 = maxDist * maxDist;
    const { x, y, z, age, life, s0, s1, aux, kind } = this;
    for (let i = 0; i < this.n; i++) {
      const dx = x[i] - camPos[0], dy = y[i] - camPos[1], dz = z[i] - camPos[2];
      if (dx * dx + dy * dy + dz * dz > md2) continue;
      const t = age[i] / life[i];
      const k = kind[i];
      let arr, u, slot, size, tint = 0xffffffff;
      if (k === KIND.FIRE || k === KIND.TRACER) {
        const ramp = k === KIND.TRACER ? (t < 0.5 ? 1 : 2) : Math.min(nf - 1, Math.floor(t * (nf - 0.01) * 0.94));
        slot = ramp; arr = D.fire[ramp]; u = U.fire[ramp];
        size = lerp(s0[i], s1[i], t) * (k === KIND.TRACER ? 1 : 1 - 0.5 * smoothstep(0.75, 1, t));
      } else if (k === KIND.SMOKE) {
        slot = nf; arr = D.smoke; u = U.smoke;
        const a = aux[i];
        let r, g, b, bank = SMOKE_BANK;
        if (a > 0 && a < 256) {
          // gray level climbs a little as the smoke thins, so a column pales as it rises
          const gv = Math.round(clamp(a + (255 - a) * 0.18 * t, 0, 255));
          r = g = b = gv;
          if (a > 190) { r = gv; g = Math.round(gv * 0.96); b = Math.round(gv * 0.88); }       // dust is warm
        } else { r = a & 255; g = (a >> 8) & 255; b = (a >> 16) & 255; }
        tint = packTint(r, g, b, bank);
        size = (s0[i] + (s1[i] - s0[i]) * Math.sqrt(t)) * (1 - smoothstep(0.7, 1, t));
      } else {
        slot = nf + 1; arr = D.debris; u = U.debris;
        const c = aux[i] | 0;
        tint = c === 0 ? packTint(70, 58, 44) : c === 1 ? packTint(110, 98, 84) : c === 2 ? packTint(52, 50, 48) : c === 3 ? packTint(150, 140, 126) : packTint(92, 70, 48);
        size = s0[i] * (1 - smoothstep(0.8, 1, t));
      }
      if (size < 0.01) continue;
      const c = cnt[slot];
      if (c >= this.max) continue;
      const o = c * 6;
      arr[o] = x[i] - ox; arr[o + 1] = y[i]; arr[o + 2] = z[i] - oz; arr[o + 3] = (i * 0.618) % 6.283; arr[o + 4] = size;
      u[o + 5] = tint;
      cnt[slot]++;
    }
    const r = this.renderer;
    const out = [];
    for (let f = 0; f < nf; f++) { B.fire[f].ox = ox; B.fire[f].oz = oz; r.updateFx(B.fire[f], D.fire[f], cnt[f]); out.push(B.fire[f]); }
    B.smoke.ox = ox; B.smoke.oz = oz; r.updateFx(B.smoke, D.smoke, cnt[nf]); out.push(B.smoke);
    B.debris.ox = ox; B.debris.oz = oz; r.updateFx(B.debris, D.debris, cnt[nf + 1]); out.push(B.debris);
    return out;
  }
}
