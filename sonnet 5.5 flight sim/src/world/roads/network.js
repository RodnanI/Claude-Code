import { distToSegment } from '../../core/util.js';
import { SpatialGrid } from '../spatial.js';
import { M } from '../../voxel/palette.js';
import { ROAD_GRID } from '../config.js';

/** Road classes. w = pavement width, sw = sidewalk width each side, lanes = total lanes, speed in m/s. */
export const ROAD_KINDS = {
  highway: { w: 16, sw: 0, lanes: 4, speed: 30, marks: 'highway', surface: 'asphalt' },
  avenue: { w: 18, sw: 3, lanes: 4, speed: 17, marks: 'avenue', surface: 'asphalt' },
  street: { w: 11, sw: 2.6, lanes: 2, speed: 13, marks: 'street', surface: 'asphalt' },
  road: { w: 9, sw: 0, lanes: 2, speed: 22, marks: 'road', surface: 'asphalt' },
  lane: { w: 6, sw: 0, lanes: 2, speed: 14, marks: 'none', surface: 'gravel' },
  dirt: { w: 4.6, sw: 0, lanes: 1, speed: 8, marks: 'none', surface: 'dirt' },
  service: { w: 7, sw: 0, lanes: 2, speed: 9, marks: 'none', surface: 'asphalt' },
};

const seg = { t: 0 };

/** Zebra crossing and stop line just outside the junction at either end of a street or avenue. */
function crosswalk(s, list, lat, hw) {
  const a0 = s.t * s.len, a1 = s.len - a0;
  const atStart = a0 < a1, endD = atStart ? a0 : a1;
  if (endD > 24) return 0;
  const ex = atStart ? s.ax : s.bx, ez = atStart ? s.az : s.bz;
  let cross = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o === s) continue;
    if ((Math.abs(o.ax - ex) < 0.6 && Math.abs(o.az - ez) < 0.6) || (Math.abs(o.bx - ex) < 0.6 && Math.abs(o.bz - ez) < 0.6)) cross = Math.max(cross, o.w / 2);
  }
  if (!cross) return 0;
  const from = cross + 1.4, to = from + 3.0;
  if (endD >= from && endD <= to && Math.abs(lat) < hw - 0.6) return (Math.floor((lat + hw) / 0.8) & 1) ? M.ROAD_LINE_W : 0;
  if (endD > to + 0.5 && endD < to + 1.0 && Math.abs(lat) < hw - 0.3 && lat > -0.3) return M.ROAD_LINE_W;
  return 0;
}

/** Spatial index of road segments with a paint function for the surface pipeline. */
export class RoadIndex {
  constructor() {
    this.segs = [];
    this.grid = new SpatialGrid(ROAD_GRID);
  }
  add(s) {
    const k = ROAD_KINDS[s.kind];
    if (!k) throw new Error('unknown road kind ' + s.kind);
    const w = s.w ?? k.w;
    const sw = s.sw ?? k.sw;
    const rec = { ax: s.ax, az: s.az, bx: s.bx, bz: s.bz, kind: s.kind, w, sw, k, len: Math.hypot(s.bx - s.ax, s.bz - s.az), off: s.off || 0, id: this.segs.length };
    this.segs.push(rec);
    const pad = w / 2 + sw + 2;
    this.grid.insert(rec, Math.min(s.ax, s.bx) - pad, Math.min(s.az, s.bz) - pad, Math.max(s.ax, s.bx) + pad, Math.max(s.az, s.bz) + pad);
    return rec;
  }
  addAll(list) { for (const s of list) this.add(s); }

  /** Material for a ground point or 0. */
  paint(x, z, cell) {
    const list = this.grid.at(x, z);
    if (!list.length) return 0;
    let roadHits = 0, best = null, bestD = 1e9, sideHit = false, curbHit = false;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const d = distToSegment(x, z, s.ax, s.az, s.bx, s.bz, seg);
      const minW = cell > 3 && s.k.speed > 15 ? cell * 0.55 : 0;
      const hw = Math.max(s.w / 2, minW);
      if (d <= hw) {
        roadHits++;
        if (d < bestD) { bestD = d; best = s; best.t = seg.t; }
      } else if (s.sw > 0 && cell <= 4 && d <= hw + s.sw) { sideHit = true; if (cell <= 1.2 && d <= hw + 0.4) curbHit = true; }
    }
    if (!roadHits) return sideHit ? (curbHit ? M.CURB : M.SIDEWALK) : 0;
    const k = best.k;
    if (k.surface === 'dirt') return M.DIRT_ROAD;
    if (k.surface === 'gravel') return M.GRAVEL_ROAD;
    if (roadHits > 1 || cell > 1.2 || k.marks === 'none') {
      // lit streets: pools of sodium light every few dozen meters, spaced wider as the cell grows so the pattern survives coarse sampling
      if (cell >= 2 && cell <= 32 && (k.marks === 'avenue' || k.marks === 'street' || k.marks === 'highway')) {
        const pool = Math.max(36, cell * 3.5);
        if ((((best.t * best.len + best.off) % pool) + pool) % pool < Math.max(9, cell * 1.2)) return M.ASPHALT_LIT;
      }
      return M.ASPHALT;
    }
    // markings on a single road: lateral offset from the centerline
    const dx = best.bx - best.ax, dz = best.bz - best.az;
    const l = best.len || 1;
    const along = best.t * best.len + best.off;
    const lat = ((x - best.ax) * -dz + (z - best.az) * dx) / l;
    const hw = best.w / 2;
    const line = Math.max(0.16, cell * 0.5);
    const al = Math.abs(lat);
    if (cell <= 0.9 && (k.marks === 'avenue' || k.marks === 'street')) {
      const cw = crosswalk(best, list, lat, hw);
      if (cw) return cw;
    }
    switch (k.marks) {
      case 'highway':
        if (al < line * 1.4 || Math.abs(al - line * 3.4) < line * 0.75) return M.ROAD_LINE_Y;
        if (Math.abs(al - hw * 0.5) < line && (along % 9) < 3.2) return M.ROAD_LINE_W;
        if (Math.abs(al - (hw - 0.5)) < line) return M.ROAD_LINE_W;
        return M.ASPHALT;
      case 'avenue':
        if (al < line * 1.4 || Math.abs(al - line * 3.4) < line * 0.75) return M.ROAD_LINE_Y;
        if (Math.abs(al - hw * 0.5) < line && (along % 8) < 3) return M.ROAD_LINE_W;
        return M.ASPHALT;
      case 'street':
        if (al < line && (along % 8) < 4) return M.ROAD_LINE_Y;
        return M.ASPHALT;
      default: // road
        if (al < line && (along % 9) < 5) return M.ROAD_LINE_Y;
        if (Math.abs(al - (hw - 0.4)) < line) return M.ROAD_LINE_W;
        return M.ASPHALT_WORN;
    }
  }
}
