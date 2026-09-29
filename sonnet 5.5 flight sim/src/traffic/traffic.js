import { RoadGraph, signalGreen } from './road-graph.js';
import { Recipe } from '../voxel/recipe.js';
import { Rng } from '../core/rng.js';
import { hashString, clamp } from '../core/util.js';
import { mat3 } from '../core/math.js';
import { PAINTS } from './vehicle-def.js';

const SPAWN_MIN = 140, SPAWN_MAX = 700, CULL = 820;
const LEVELS = [0.1, 0.2, 0.4, 0.8];
const IDM = { T: 1.35, s0: 2.2, delta: 4 };

const unpack = (c) => [(c & 255) / 255, ((c >> 8) & 255) / 255, ((c >> 16) & 255) / 255];

/**
 * Ambient road traffic around the camera. Vehicles follow the road graph with IDM car following, stop for signals and
 * slow for turns. Spawns appear on the far side of the visible area and are removed beyond the cull radius, so the
 * cost is proportional to the setting, not to the size of the island.
 */
export class TrafficSystem {
  constructor({ world, models, vehicles, seed = 1 }) {
    this.world = world;
    this.models = models;
    this.defs = vehicles;
    this.rng = new Rng(seed ^ 0x7ff1c);
    this.graph = null;
    this.vehicles = [];
    this.max = 0;
    this.time = 0;
    this.recipes = new Map();
    this.pool = [];
    this.active = 0;
    this._near = [];
    this.stats = { count: 0, spawned: 0, culled: 0, stopped: 0 };
  }

  /** Build the graph (loads every region layout, so call during loading). */
  init() {
    this.graph = new RoadGraph(this.world);
    return this.graph.stats;
  }

  setMax(n) { this.max = Math.max(0, n | 0); }

  clear() {
    for (const v of this.vehicles) { const i = v.edge.veh.indexOf(v); if (i >= 0) v.edge.veh.splice(i, 1); }
    this.vehicles.length = 0;
  }

  _pickDef(kind) {
    let total = 0;
    for (const d of this.defs) if (d.roads.includes(kind)) total += d.weight;
    if (total <= 0) return null;
    let r = this.rng.next() * total;
    for (const d of this.defs) if (d.roads.includes(kind)) { r -= d.weight; if (r <= 0) return d; }
    return this.defs[0];
  }

  _spawn(cx, cz) {
    const g = this.graph, rng = this.rng;
    const a = rng.next() * Math.PI * 2, d = SPAWN_MIN + Math.sqrt(rng.next()) * (SPAWN_MAX - SPAWN_MIN);
    const px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d;
    this._near.length = 0;
    g.near(px, pz, 90, this._near);
    if (!this._near.length) return false;
    const e = this._near[rng.int(0, this._near.length - 1)];
    const def = this._pickDef(e.kind);
    if (!def) return false;
    const s = rng.next() * e.len;
    const lane = rng.int(0, e.lanes - 1);
    for (const o of e.veh) if (o.lane === lane && Math.abs(o.s - s) < 16 + def.length) return false;
    const tints = def.tints || PAINTS;
    const v = {
      def, edge: e, s, lane, speed: Math.min(e.speed, 12) * (0.5 + rng.next() * 0.4), personal: 0.85 + rng.next() * 0.25,
      variant: rng.int(0, def.variants - 1), tint: unpack(tints[rng.int(0, tints.length - 1)]), next: null, x: 0, z: 0, y: 0, yaw: 0, waiting: 0, idx: 0,
    };
    v.next = this._pickNext(e);
    e.veh.push(v);
    this.vehicles.push(v);
    this._place(v, 1);
    this.stats.spawned++;
    return true;
  }

  _pickNext(e) {
    const o = e.nextOpts;
    if (!o || !o.length) return null;
    return o[this.rng.int(0, o.length - 1)];
  }

  _place(v, snap) {
    const e = v.edge;
    const off = (v.lane + 0.5) * e.laneW;
    const rx = -e.dz, rz = e.dx;
    v.x = e.ax + e.dx * v.s + rx * off;
    v.z = e.az + e.dz * v.s + rz * off;
    v.y = this.world.heightAt(v.x, v.z, 0);
    const yaw = Math.atan2(-e.dz, e.dx);
    if (snap) v.yaw = yaw;
    else { let d = yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * 0.25; }
  }

  update(dt, camPos) {
    if (!this.graph) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const cx = camPos[0], cz = camPos[2];
    // spawn a few per frame toward the cap
    let tries = 0;
    while (this.vehicles.length < this.max && tries++ < 6) this._spawn(cx, cz);
    // remove what drifted out of range, or everything above a lowered cap
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const far = Math.hypot(v.x - cx, v.z - cz) > CULL;
      if (far || this.vehicles.length > this.max || (v.waiting > 60 && Math.hypot(v.x - cx, v.z - cz) > 300)) {
        const k = v.edge.veh.indexOf(v); if (k >= 0) v.edge.veh.splice(k, 1);
        this.vehicles[i] = this.vehicles[this.vehicles.length - 1]; this.vehicles.pop();
        this.stats.culled++;
      }
    }
    // order each occupied edge front to back
    const edges = new Set();
    for (const v of this.vehicles) edges.add(v.edge);
    for (const e of edges) {
      if (e.veh.length > 1) e.veh.sort((p, q) => q.s - p.s);
      for (let i = 0; i < e.veh.length; i++) e.veh[i].idx = i;
    }
    let stopped = 0;
    for (const v of this.vehicles) {
      const e = v.edge, def = v.def;
      let v0 = e.speed * def.speedFactor * v.personal;
      let gap = 1e9, dv = 0;
      // leader in the same lane on this edge
      for (let i = v.idx - 1; i >= 0; i--) {
        const o = e.veh[i];
        if (o.lane === v.lane) { gap = o.s - v.s - (o.def.length + def.length) * 0.5; dv = v.speed - o.speed; break; }
      }
      const toEnd = e.len - v.s;
      if (v.next && toEnd < 60) {
        if (gap > 1e8 || toEnd + 0 < gap) {
          // vehicles just ahead on the next edge
          const nl = v.next.veh;
          for (let i = nl.length - 1; i >= 0; i--) {
            const o = nl[i];
            if (o.lane === Math.min(v.lane, v.next.lanes - 1)) { const g2 = toEnd + o.s - (o.def.length + def.length) * 0.5; if (g2 < gap) { gap = g2; dv = v.speed - o.speed; } break; }
          }
        }
        // signal
        if (e.b.sig && !signalGreen(e.b, e, this.time) && toEnd > 1.5) {
          const g2 = toEnd - 7.5 - def.length * 0.5;
          if (g2 < gap) { gap = Math.max(g2, 0.05); dv = v.speed; }
        }
        // corners
        const dot = e.dx * v.next.dx + e.dz * v.next.dz;
        if (dot < 0.9) v0 = Math.min(v0, dot < 0.2 ? 4.5 : 7.5);
      } else if (!v.next && toEnd < 30) v0 = Math.min(v0, 3);
      const sStar = IDM.s0 + Math.max(0, v.speed * IDM.T + (v.speed * dv) / (2 * Math.sqrt(def.accel * def.decel)));
      let acc = def.accel * (1 - Math.pow(v.speed / Math.max(v0, 0.5), IDM.delta) - (gap < 1e8 ? (sStar / Math.max(gap, 0.1)) ** 2 : 0));
      acc = clamp(acc, -9, def.accel);
      v.speed = Math.max(0, v.speed + acc * dt);
      v.waiting = v.speed < 0.3 ? v.waiting + dt : 0;
      if (v.waiting > 1) stopped++;
      v.s += v.speed * dt;
      if (v.s >= e.len) {
        const nx = v.next;
        const k = e.veh.indexOf(v); if (k >= 0) e.veh.splice(k, 1);
        if (!nx) { v.s = e.len - 0.1; e.veh.push(v); v.speed = 0; }
        else { v.s -= e.len; v.edge = nx; v.lane = Math.min(v.lane, nx.lanes - 1); nx.veh.push(v); v.next = this._pickNext(nx); }
      }
      this._place(v, 0);
    }
    this.stats.count = this.vehicles.length; this.stats.stopped = stopped;
  }

  _recipe(def, variant) {
    const key = def.id + ':' + variant;
    let r = this.recipes.get(key);
    if (!r) {
      r = new Recipe();
      def.build(r, variant, new Rng(hashString(key)));
      this.recipes.set(key, r);
    }
    return r;
  }

  /** Append draw entries for vehicles in view range. pxPerRad is the camera projection scale. */
  emit(list, cam, pxPerRad, maxDist = 900) {
    let n = 0;
    const px = cam.pos[0], py = cam.pos[1], pz = cam.pos[2];
    for (const v of this.vehicles) {
      const dx = v.x - px, dz = v.z - pz, dy = v.y - py;
      const d = Math.hypot(dx, dy, dz);
      if (d > maxDist) continue;
      const want = (1.6 * d) / pxPerRad;
      let cell = LEVELS[0];
      for (const l of LEVELS) if (l <= want) cell = l;
      const key = `veh:${v.def.id}:${v.variant}:${cell}`;
      const mesh = this.models.fromRecipe(key, this._recipe(v.def, v.variant), cell, { conservative: cell >= 0.3 });
      if (!mesh || !mesh.gpu) continue;
      let e = this.pool[n];
      if (!e) e = this.pool[n] = { mesh: null, x: 0, y: 0, z: 0, rot: new Float64Array(9), tint: [1, 1, 1], noPost: false };
      n++;
      e.mesh = mesh; e.x = v.x; e.y = v.y; e.z = v.z; e.tint = v.tint;
      mat3.fromAxisAngle(e.rot, 0, 1, 0, v.yaw);
      list.push(e);
    }
    this.active = n;
  }
}
