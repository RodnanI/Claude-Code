import { SpatialGrid } from '../world/spatial.js';
import { ROAD_KINDS } from '../world/roads/network.js';

const NODE_Q = 3;              // meters: endpoints closer than this merge into one node
const MIN_PIECE = 4;           // meters: shorter road pieces are dropped

/** Proper intersection of two segments. Returns [t, u] parameters or null. */
function intersect(a, b) {
  const rx = a.bx - a.ax, rz = a.bz - a.az, sx = b.bx - b.ax, sz = b.bz - b.az;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-6) return null;
  const qx = b.ax - a.ax, qz = b.az - a.az;
  const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  return t > -0.001 && t < 1.001 && u > -0.001 && u < 1.001 ? [t, u] : null;
}

function distToSeg(px, pz, s) {
  const dx = s.bx - s.ax, dz = s.bz - s.az;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / l2));
  return { t, d: Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t)) };
}

/**
 * Drivable graph built from the world's road segments. Segments are split wherever they cross or meet, every piece
 * becomes two directed edges (right-hand traffic), and nodes with three or more roads get a traffic signal.
 */
export class RoadGraph {
  constructor(world) {
    this.nodes = [];
    this.edges = [];
    this.grid = new SpatialGrid(128);
    this.stats = { segments: 0, nodes: 0, edges: 0, signals: 0 };
    this._build(world);
  }

  _node(map, x, z) {
    const key = Math.round(x / NODE_Q) * 65536 + Math.round(z / NODE_Q);
    let n = map.get(key);
    if (!n) {
      n = { id: this.nodes.length, x, z, out: [], in: [], sig: false, offset: 0, cls: 0 };
      this.nodes.push(n);
      map.set(key, n);
    }
    return n;
  }

  _build(world) {
    world.ensureHighways();
    for (const r of world.regionsList) world.layoutOf(r);
    const segs = world.roads.segs;
    this.stats.segments = segs.length;
    const splits = new Array(segs.length);
    for (let i = 0; i < segs.length; i++) splits[i] = [];
    const tmp = [];
    for (const a of segs) {
      tmp.length = 0;
      const pad = 3;
      world.roads.grid.query(Math.min(a.ax, a.bx) - pad, Math.min(a.az, a.bz) - pad, Math.max(a.ax, a.bx) + pad, Math.max(a.az, a.bz) + pad, tmp);
      for (const b of tmp) {
        if (b.id <= a.id) continue;
        const hit = intersect(a, b);
        if (hit) { splits[a.id].push(hit[0]); splits[b.id].push(hit[1]); continue; }
        // T junctions whose endpoint lies just off the other segment
        for (const [ex, ez, other] of [[a.ax, a.az, b], [a.bx, a.bz, b], [b.ax, b.az, a], [b.bx, b.bz, a]]) {
          const q = distToSeg(ex, ez, other);
          if (q.d < 1.6 && q.t > 0.01 && q.t < 0.99) splits[other.id].push(q.t);
        }
      }
    }
    const map = new Map();
    for (const s of segs) {
      const k = ROAD_KINDS[s.kind];
      const ts = [0, ...splits[s.id].sort((p, q) => p - q), 1];
      const lanes = Math.max(1, Math.round(k.lanes / 2));
      const cls = s.kind === 'highway' ? 4 : s.kind === 'avenue' ? 3 : s.kind === 'street' ? 2 : s.kind === 'road' ? 2 : 1;
      for (let i = 0; i + 1 < ts.length; i++) {
        if (ts[i + 1] - ts[i] < 0.0005) continue;
        const ax = s.ax + (s.bx - s.ax) * ts[i], az = s.az + (s.bz - s.az) * ts[i];
        const bx = s.ax + (s.bx - s.ax) * ts[i + 1], bz = s.az + (s.bz - s.az) * ts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        if (len < MIN_PIECE) continue;
        const A = this._node(map, ax, az), B = this._node(map, bx, bz);
        if (A === B) continue;
        for (const [from, to, x0, z0, x1, z1] of [[A, B, ax, az, bx, bz], [B, A, bx, bz, ax, az]]) {
          const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
          const e = {
            id: this.edges.length, a: from, b: to, ax: x0, az: z0, bx: x1, bz: z1, len, dx, dz, kind: s.kind, speed: k.speed, lanes,
            laneW: Math.min(3.4, s.w / (lanes * 2)), w: s.w, axis: Math.abs(dx) > Math.abs(dz) ? 0 : 1, veh: [], nextOpts: null, rev: null,
          };
          this.edges.push(e);
          from.out.push(e); to.in.push(e);
          from.cls = Math.max(from.cls, cls); to.cls = Math.max(to.cls, cls);
          this.grid.insert(e, Math.min(x0, x1) - 8, Math.min(z0, z1) - 8, Math.max(x0, x1) + 8, Math.max(z0, z1) + 8);
        }
        const n = this.edges.length;
        this.edges[n - 2].rev = this.edges[n - 1]; this.edges[n - 1].rev = this.edges[n - 2];
      }
    }
    for (const n of this.nodes) {
      const neighbors = new Set(n.out.map((e) => e.b.id));
      n.sig = neighbors.size >= 3 && n.cls >= 2;
      n.offset = (n.id * 7919) % 24;
      if (n.sig) this.stats.signals++;
    }
    for (const e of this.edges) {
      const opts = e.b.out.filter((o) => o !== e.rev);
      e.nextOpts = opts.length ? opts : e.rev ? [e.rev] : [];
    }
    this.stats.nodes = this.nodes.length; this.stats.edges = this.edges.length;
  }

  /** Edges near a point. */
  near(x, z, r, out = []) { return this.grid.query(x - r, z - r, x + r, z + r, out); }
}

/** Signal state for an approach: 1 green, 0 red. Two phases with an all-red gap. */
export function signalGreen(node, edge, t) {
  const c = (t + node.offset) % 24;
  if (c < 10) return edge.axis === 0;
  if (c >= 12 && c < 22) return edge.axis === 1;
  return false;
}
