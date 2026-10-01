import { ModelKit } from './model-kit.js';
import { mat3 } from '../core/math.js';
import { M } from '../voxel/palette.js';

const ONE = [1, 1, 1];
/** Parts drawn only while something is happening: they do not count toward the size of the aircraft. */
export const TRANSIENT = new Set(['afterburner', 'muzzle']);
const kitCache = new WeakMap();

/** Parts of an aircraft, built once per aircraft definition. */
export function kitFor(spec) {
  let k = kitCache.get(spec);
  if (!k) {
    k = new ModelKit();
    spec.model(k);
    if (spec.interior) spec.interior(k);
    kitCache.set(spec, k);
  }
  return k;
}

/** Material remap table for a livery: { AC_WHITE: 'AC_CREAM', ... } -> Uint8Array(256). Null for the default livery. */
export function liveryRemap(spec, id) {
  const l = spec.liveries.find((x) => x.id === id);
  if (!l || !l.remap) return null;
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) t[i] = i;
  for (const [from, to] of Object.entries(l.remap)) {
    if (M[from] === undefined || M[to] === undefined) throw new Error(`aircraft ${spec.id} livery ${id}: unknown material ${from} or ${to}`);
    t[M[from]] = M[to];
  }
  return t;
}

const _v = new Float64Array(3);
const _a = new Float64Array(9);
const _b = new Float64Array(9);

/**
 * Renderable aircraft: turns flight channels into part transforms and emits model draw entries. Exterior parts LOD
 * by distance (coarser voxels farther away). Interior parts are drawn in the cockpit pass, or through the windows
 * when the camera is close.
 */
export class AircraftInstance {
  constructor(spec, registry, { livery = 'default' } = {}) {
    this.spec = spec;
    this.registry = registry;
    this.livery = livery;
    this.remap = liveryRemap(spec, livery);
    const kit = kitFor(spec);
    const byName = new Map();
    this.parts = kit.parts.map((p) => {
      const part = { ...p, anims: [], R: mat3.create(), off: new Float64Array(3), entry: { mesh: null, x: 0, y: 0, z: 0, rot: new Float64Array(9), tint: ONE, noPost: false } };
      byName.set(p.name, part);
      return part;
    });
    for (const a of spec.animations) {
      const p = byName.get(a.part);
      if (!p) throw new Error(`aircraft ${spec.id}: animation targets unknown part ${a.part}`);
      p.anims.push(a);
    }
    this.channels = {};
    this.level = 0;
  }

  get maxLevel() { return this.spec.lodLevels ?? 3; }

  /** Size of the exterior in meters, from the part recipes: { length, span, height }. Cached. */
  extent() {
    if (this._extent) return this._extent;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const p of this.parts) {
      if (p.group !== 'exterior' || TRANSIENT.has(p.visibleWhen)) continue;           // flames and muzzle flashes are not part of the airframe
      const b = p.recipe.bounds(0.25);
      if (!b) continue;
      for (let i = 0; i < 3; i++) {
        const o = p.local ? p.pivot[i] : 0;
        lo[i] = Math.min(lo[i], b[i] + o); hi[i] = Math.max(hi[i], b[i + 3] + o);
      }
    }
    this._extent = { length: hi[0] - lo[0], height: hi[1] - lo[1], span: hi[2] - lo[2] };
    return this._extent;
  }

  _cell(p, level) { return (p.voxel || (p.group === 'interior' ? this.spec.interiorVoxel : this.spec.voxel)) * (p.group === 'interior' ? 1 : 2 ** level); }

  meshFor(p, level) {
    const cell = this._cell(p, level);
    const key = `ac:${this.spec.id}:${this.livery}:${p.name}:${cell}`;
    return this.registry.fromRecipe(key, p.recipe, cell, {
      anchor: p.local ? [0, 0, 0] : [-p.pivot[0], -p.pivot[1], -p.pivot[2]],
      remap: this.remap,
      conservative: cell >= 0.2,
    });
  }

  /** Build meshes ahead of time so the first frame does not hitch. */
  prewarm(levels = [0], interior = true) {
    for (const p of this.parts) {
      if (p.group === 'interior') { if (interior) this.meshFor(p, 0); continue; }
      for (const l of levels) this.meshFor(p, l);
    }
  }

  /** LOD level for a distance: pick the coarsest voxel that stays under about 1.6 pixels on screen. */
  levelFor(dist, pxPerRad) {
    const want = (1.6 * Math.max(dist, 1)) / pxPerRad;
    let l = 0;
    while (l < this.maxLevel && this.spec.voxel * 2 ** (l + 1) <= want) l++;
    return l;
  }

  /** Compute per-part animation poses from flight channels. */
  update(ch) {
    this.channels = ch;
    for (const p of this.parts) {
      if (!p.anims.length) { p.off[0] = p.pivot[0]; p.off[1] = p.pivot[1]; p.off[2] = p.pivot[2]; p.R[0] = p.R[4] = p.R[8] = 1; p.R[1] = p.R[2] = p.R[3] = p.R[5] = p.R[6] = p.R[7] = 0; continue; }
      const R = p.R;
      R.fill(0); R[0] = R[4] = R[8] = 1;
      let ox = p.pivot[0], oy = p.pivot[1], oz = p.pivot[2];
      for (const a of p.anims) {
        const v = (ch[a.channel] ?? 0) * a.gain + (a.offset || 0);
        if (a.type === 'rotate') {
          mat3.fromAxisAngle(_a, a.axis[0], a.axis[1], a.axis[2], v);
          mat3.mul(_b, _a, R);
          R.set(_b);
        } else { ox += a.axis[0] * v; oy += a.axis[1] * v; oz += a.axis[2] * v; }
      }
      p.off[0] = ox; p.off[1] = oy; p.off[2] = oz;
    }
  }

  /**
   * Append draw entries. S = { pos, rot (mat3 body to world), mode: 'external' | 'cockpit', dist, pxPerRad, tint }.
   * External mode fills `out`; cockpit mode fills `cockpit` with everything that is visible from the seat.
   */
  emit(out, cockpit, S) {
    const inCockpit = S.mode === 'cockpit';
    const ch = this.channels;
    const level = inCockpit ? 0 : this.levelFor(S.dist, S.pxPerRad);
    this.level = level;
    const dst = inCockpit ? cockpit : out;
    for (const p of this.parts) {
      if (p.group === 'interior') { if (!inCockpit && S.dist > 60) continue; }
      if (inCockpit && p.hideInCockpit) continue;
      if (p.visibleWhen && !(ch[p.visibleWhen] > 0.5)) continue;
      const mesh = this.meshFor(p, level);
      if (!mesh || !mesh.gpu) continue;
      const e = p.entry;
      mat3.mulVec(_v, S.rot, p.off[0], p.off[1], p.off[2]);
      e.x = S.pos[0] + _v[0]; e.y = S.pos[1] + _v[1]; e.z = S.pos[2] + _v[2];
      mat3.mul(e.rot, S.rot, p.R);
      e.mesh = mesh;
      e.tint = S.tint || ONE;
      e.noPost = inCockpit;
      dst.push(e);
    }
  }
}

/** Rotate a body-frame point into world space (rot is a column-major mat3). */
export function bodyPoint(out, pos, rot, x, y, z) {
  mat3.mulVec(out, rot, x, y, z);
  out[0] += pos[0]; out[1] += pos[1]; out[2] += pos[2];
  return out;
}
