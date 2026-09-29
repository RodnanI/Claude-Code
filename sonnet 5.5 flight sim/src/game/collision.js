import { mat3 } from '../core/math.js';
import { rasterize } from '../voxel/recipe.js';

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
  _shape(d) {
    if (d._col !== undefined) return d._col;
    d._col = null;
    const recipe = this.world.recipeFor(d);
    const solid = Object.create(recipe);
    solid.ops = recipe.ops.filter((op) => !op.thin);
    const cell = Math.min(6, Math.max(1.5, Math.max(d.w, d.d, d._h / 4) / 40));
    const r = rasterize(solid, { cell, anchor: [d.x, d.y, d.z], rot: d.rot || 0, yaw: d.yaw || 0, maxCells: 2e6 });
    if (r) d._col = { vol: r.vol, cell, i0: r.i0, j0: r.j0, k0: r.k0 };
    return d._col;
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
