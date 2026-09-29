import { mat3 } from '../core/math.js';
import { Recipe } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';
import { SITES } from '../world/layout.js';

/**
 * Skyline Run: a ring at the crown of each of Meridian's tallest towers, flown in a chain from the airport side and
 * finished at the supertall. Gates are found from the real structures (the ring must sit in free air, checked against the
 * same shapes the collision uses), so the course follows whatever the city generates. Passing a gate means crossing its
 * plane inside the ring, from either side. The clock starts at the first gate and the best time is kept in localStorage.
 */

export const GATE_R = 55;
const TUBE = 3.4;
const TAU = Math.PI * 2;
const CELLS = [1, 2, 4, 8];
const BEST_KEY = 'flyhigh.skyline.best';

/** A vertical ring in the y-z plane (local +x is the way through), lit in alternating segments. */
function ringRecipe(variant) {
  const r = new Recipe();
  const [a, b] = variant === 0 ? [M.NEON_ORANGE, M.NEON_WHITE] : variant === 2 ? [M.SIGNAL_GREEN, M.NEON_WHITE] : [M.NEON_WHITE, M.PAINT_WHITE];
  const E = GATE_R + TUBE + 1;
  r.fn(-TUBE - 1, -E, -E, TUBE + 1, E, E, (lx, ly, lz) => {
    if (Math.hypot(Math.hypot(ly, lz) - GATE_R, lx) > TUBE) return 0;
    return Math.floor(Math.atan2(lz, ly) / (TAU / 12)) & 1 ? b : a;
  });
  return r;
}

export class Course {
  constructor({ world, models, collider }) {
    this.world = world;
    this.models = models;
    this.collider = collider;
    this.name = 'Skyline run';
    this.gates = [];
    this.recipes = [];
    this.pool = [];
    this.best = 0;
    try { this.best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { /* no storage */ }
    this.reset();
  }

  reset() {
    this.next = 0;
    this.time = 0;
    this.running = false;
    this.finished = false;
    this.prev = null;
  }

  /** Top of a structure in world meters, including antennas and crowns. */
  _top(d) {
    const b = this.world.recipeFor(d).bounds(0);
    return d.y + Math.max(d.h || 0, b ? b[4] : 0);
  }

  /** Is the ring at c, facing n (horizontal unit vector), free of buildings and the ground? */
  _clear(c, n) {
    const col = this.collider, side = [-n[1], n[0]];
    if (col.solidAt(c[0], c[1], c[2])) return false;
    for (const [rad, count] of [[GATE_R + 8, 16], [GATE_R * 0.5, 8]]) {
      for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU, u = Math.cos(t) * rad, v = Math.sin(t) * rad;
        const x = c[0] + side[0] * u, z = c[2] + side[1] * u, y = c[1] + v;
        if (y < this.world.heightAt(x, z, 16) + 12 || col.solidAt(x, y, z)) return false;
      }
    }
    return true;
  }

  /** Chooses the gates. Returns the list (also kept in this.gates). */
  build() {
    const world = this.world, C = SITES.meridian;
    const towers = world.structuresIn(C.x - 1900, C.z - 1900, C.x + 1900, C.z + 1900, []).filter((d) => d.h >= 150)
      .sort((p, q) => q.h - p.h || (p.id < q.id ? -1 : 1));
    const picks = [];
    for (const d of towers) {
      if (picks.every((p) => Math.hypot(p.x - d.x, p.z - d.z) > 260)) picks.push(d);
      if (picks.length >= 8) break;
    }
    this.gates = [];
    if (picks.length < 3) return this.gates;
    // start with the tower on the airport side of downtown, hop to the nearest neighbor each time, finish at the tallest
    const finish = picks[0], pool = picks.slice(1), order = [];
    pool.sort((p, q) => q.x - C.x + (q.z - C.z) - (p.x - C.x + (p.z - C.z)));
    let cur = pool.shift();
    order.push(cur);
    while (pool.length) {
      pool.sort((p, q) => (p.x - cur.x) ** 2 + (p.z - cur.z) ** 2 - ((q.x - cur.x) ** 2 + (q.z - cur.z) ** 2));
      cur = pool.shift();
      order.push(cur);
    }
    order.push(finish);
    let prev = [C.x + 2600, 0, C.z + 2600];
    for (const d of order) {
      const top = this._top(d), ground = world.heightAt(d.x, d.z, 16);
      const y = Math.max(top - 40, ground + GATE_R + 40);
      const toPrev = Math.atan2(prev[2] - d.z, prev[0] - d.x);
      let chosen = null;
      for (const off of [120, 160, 210]) {
        for (let k = 0; k < 12 && !chosen; k++) {
          const a = toPrev + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 12);
          const c = [d.x + Math.cos(a) * off, y, d.z + Math.sin(a) * off];
          const h = Math.hypot(c[0] - prev[0], c[2] - prev[2]) || 1;
          const n = [(c[0] - prev[0]) / h, (c[2] - prev[2]) / h];
          if (this._clear(c, n)) chosen = { c, n };
        }
        if (chosen) break;
      }
      if (!chosen) {
        // fall back to a halo above the crown, which is always free
        const c = [d.x, top + GATE_R + 30, d.z];
        const h = Math.hypot(c[0] - prev[0], c[2] - prev[2]) || 1;
        chosen = { c, n: [(c[0] - prev[0]) / h, (c[2] - prev[2]) / h] };
      }
      this.gates.push({ x: chosen.c[0], y: chosen.c[1], z: chosen.c[2], nx: chosen.n[0], nz: chosen.n[1], id: d.id, kind: d.kind });
      prev = chosen.c;
    }
    return this.gates;
  }

  get active() { return this.gates.length > 0; }

  /** Advance the run with the aircraft position. Returns an event or null: { type: 'gate' | 'miss' | 'finish', ... }. */
  update(dt, pos) {
    const gates = this.gates;
    if (!gates.length || this.finished) return null;
    if (this.running) this.time += dt;
    const p = this.prev;
    let ev = null;
    if (p) {
      const g = gates[this.next];
      const s0 = (p[0] - g.x) * g.nx + (p[2] - g.z) * g.nz, s1 = (pos[0] - g.x) * g.nx + (pos[2] - g.z) * g.nz;
      if (s0 !== s1 && (s0 <= 0) !== (s1 <= 0)) {
        const u = s0 / (s0 - s1);
        const qx = p[0] + (pos[0] - p[0]) * u - g.x, qy = p[1] + (pos[1] - p[1]) * u - g.y, qz = p[2] + (pos[2] - p[2]) * u - g.z;
        if (Math.hypot(qx, qy, qz) <= GATE_R) {
          this.next++;
          this.running = true;
          if (this.next >= gates.length) {
            this.finished = true;
            const isBest = !this.best || this.time < this.best;
            if (isBest) { this.best = this.time; try { localStorage.setItem(BEST_KEY, String(this.time)); } catch (e) { /* no storage */ } }
            ev = { type: 'finish', time: this.time, best: this.best, isBest };
          } else ev = { type: 'gate', index: this.next, total: gates.length, time: this.time };
        } else if (Math.hypot(qx, qy, qz) < GATE_R * 3) ev = { type: 'miss', index: this.next + 1 };
      }
    }
    if (!p) this.prev = [0, 0, 0];
    this.prev[0] = pos[0]; this.prev[1] = pos[1]; this.prev[2] = pos[2];
    return ev;
  }

  /** What the HUD shows. */
  status() {
    if (!this.gates.length) return null;
    const g = this.gates[Math.min(this.next, this.gates.length - 1)];
    return { name: this.name, index: Math.min(this.next + 1, this.gates.length), total: this.gates.length, timeText: this.running || this.finished ? formatTime(this.time) : 'READY', bestText: this.best ? formatTime(this.best) : '', finished: this.finished, x: g.x, y: g.y, z: g.z };
  }

  _recipe(variant) { return this.recipes[variant] || (this.recipes[variant] = ringRecipe(variant)); }

  _entry(n) {
    let e = this.pool[n];
    if (!e) e = this.pool[n] = { mesh: null, x: 0, y: 0, z: 0, rot: new Float64Array(9), tint: [1, 1, 1], noPost: false };
    return e;
  }

  /** Append draw entries for the next few gates. pxPerRad is the camera projection scale. */
  emit(list, cam, pxPerRad) {
    if (!this.gates.length || this.finished) return;
    const n = this.gates.length;
    let used = 0;
    for (let k = this.next; k < Math.min(n, this.next + 3); k++) {
      const g = this.gates[k];
      const d = Math.hypot(g.x - cam.pos[0], g.y - cam.pos[1], g.z - cam.pos[2]);
      if (d > 16000) continue;
      const want = (1.6 * d) / pxPerRad;
      let cell = CELLS[0];
      for (const c of CELLS) if (c <= want) cell = c;
      const variant = k === n - 1 ? 2 : k === this.next ? 0 : 1;
      const mesh = this.models.fromRecipe(`gate:${variant}:${cell}`, this._recipe(variant), cell, { conservative: true });
      if (!mesh || !mesh.gpu) continue;
      const e = this._entry(used++);
      e.mesh = mesh; e.x = g.x; e.y = g.y; e.z = g.z;
      mat3.fromAxisAngle(e.rot, 0, 1, 0, Math.atan2(-g.nz, g.nx));
      list.push(e);
    }
  }
}

export const formatTime = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
