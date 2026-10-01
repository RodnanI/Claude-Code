import { mat3 } from '../core/math.js';
import { rasterize } from '../voxel/recipe.js';
import { DAMAGE, DamageField } from '../world/damage.js';

const QUARTER = Math.PI / 2;
const _p = new Float64Array(3);

/**
 * Coarse collision against the voxel structures (buildings, towers, hangars). The terrain and wheels are handled by the
 * flight model; this checks the airframe's extreme points against the footprint box of each structure near the aircraft,
 * then against a coarse occupancy of its real shape, so the air above a setback, a tapering crown or between twin
 * towers is free.
 */
export class StructureCollider {
  constructor(world) {
    this.world = world;
    this.cache = [];
    this.cx = 1e9; this.cz = 1e9;
    this.timer = 0;
  }

  reset() { this.cache = []; this.cx = this.cz = 1e9; }

  /** Kits that pick their own height (barns, silos) report 0; measure the built recipe once. */
  _heightOf(d) {
    const b = this.world.recipeFor(d).bounds(0);
    return b ? Math.max(4, b[4]) : 8;
  }

  /** Occupancy of a structure at a size that keeps even a supertall to a few tens of thousands of cells. Thin details
      (antennas, fences) are left out. Built the first time an aircraft is inside the footprint box. */
  _shape(d, field = DAMAGE) {
    const hr = Math.hypot(d.w || 8, d.d || 8) * 0.5;
    const rev = field === DAMAGE ? DAMAGE.revNear(d.x - hr, d.z - hr, d.x + hr, d.z + hr) : 0;
    if (field === DAMAGE && d._col !== undefined && d._colRev === rev) return d._col;
    const recipe = this.world.recipeFor(d);
    const solid = Object.create(recipe);
    solid.ops = recipe.ops.filter((op) => !op.thin);
    if (!(d._h > 0)) d._h = d.h > 0 ? d.h : this._heightOf(d);
    const cell = Math.min(6, Math.max(1.5, Math.max(d.w, d.d, d._h / 4) / 40));
    const r = rasterize(solid, { cell, anchor: [d.x, d.y, d.z], rot: d.rot || 0, yaw: d.yaw || 0, maxCells: 2e6 });
    let col = null;
    if (r) {
      // blasts have taken their share out of it (and what stood on that share)
      if (field.count) field.carveVolume(r.vol, r.i0, r.j0, r.k0, cell, d.y);
      col = { vol: r.vol, cell, i0: r.i0, j0: r.j0, k0: r.k0 };
    }
    if (field === DAMAGE) { d._col = col; d._colRev = rev; }
    return col;
  }

  /** Solid air for projectiles: is this point inside a standing structure? */
  pointSolid(x, y, z) {
    const near = this.world.structuresIn(x - 48, z - 48, x + 48, z + 48, this._pt || (this._pt = []));
    for (let i = 0; i < near.length; i++) if (this._inside(near[i], x, y, z)) return near[i];
    return null;
  }

  /**
   * What one blast does to the structures near it, measured on the same coarse shapes the collisions use: for each structure
   * hit, how much of it is gone in cubic meters and where it stood. The effects use this to raise dust and drop debris.
   */
  blastReport(b) {
    const out = [];
    const one = new DamageField();
    one.add({ x: b.x, y: b.y, z: b.z, r: b.r, seed: b.seed });
    const R = b.r * 1.3 + 40;
    for (const d of this.world.structuresIn(b.x - R, b.z - R, b.x + R, b.z + R, [])) {
      if (!(d._h > 0)) d._h = d.h > 0 ? d.h : this._heightOf(d);
      if (Math.abs(d.x - b.x) > d.w + b.r * 1.2 + 6 || Math.abs(d.z - b.z) > d.d + b.r * 1.2 + 6) continue;
      const base = this._shape(d, new DamageField());           // the structure as built
      if (!base) continue;
      const before = base.vol.count();
      const col = this._shape(d, one);
      const left = col ? col.vol.count() : 0;
      const gone = col ? (before - left) * col.cell ** 3 : 0;
      if (gone > 1) out.push({ d, gone, x: d.x, y: d.y, z: d.z, h: d._h, w: d.w, dd: d.d, share: before ? 1 - left / before : 0, cell: col.cell, vol: col });
    }
    return out;
  }

  /** True when a point is inside the footprint box and the coarse shape of a structure. */
  _inside(d, x, y, z) {
    if (!(d._h > 0)) d._h = d.h > 0 ? d.h : this._heightOf(d);
    if (y < d.y - 0.5 || y > d.y + d._h + 3) return false;
    const ang = ((d.rot || 0) & 3) * QUARTER + (d.yaw || 0);
    const c = Math.cos(ang), sn = Math.sin(ang);
    const wx = x - d.x, wz = z - d.z;
    const lx = c * wx + sn * wz, lz = -sn * wx + c * wz;
    if (!(Math.abs(lx) < d.w / 2 - 0.4 && Math.abs(lz) < d.d / 2 - 0.4)) return false;
    const sh = this._shape(d);
    return !sh || !!sh.vol.get(Math.floor(x / sh.cell) - sh.i0, Math.floor(y / sh.cell) - sh.j0, Math.floor(z / sh.cell) - sh.k0);
  }

  /** Whether a world point is inside any structure. For tools and course design, not the per-frame path. */
  solidAt(x, y, z) {
    for (const d of this.world.structuresIn(x - 160, z - 160, x + 160, z + 160, [])) if (this._inside(d, x, y, z)) return true;
    return false;
  }

  /** Returns a description of the structure hit, or null. */
  test(ent, dt) {
    const p = ent.pos;
    this.timer -= dt;
    if (this.timer <= 0 || Math.abs(p[0] - this.cx) > 40 || Math.abs(p[2] - this.cz) > 40) {
      this.cache = this.world.structuresIn(p[0] - 160, p[2] - 160, p[0] + 160, p[2] + 160, []);
      this.cx = p[0]; this.cz = p[2]; this.timer = 1;
    }
    if (!this.cache.length) return null;
    const pts = ent.spec.skids;
    for (const s of pts) {
      mat3.mulVec(_p, ent.rot, s.p[0], s.p[1], s.p[2]);
      const x = p[0] + _p[0], y = p[1] + _p[1], z = p[2] + _p[2];
      for (const d of this.cache) if (this._inside(d, x, y, z)) return d;
    }
    return null;
  }
}
