import { mat4 } from '../core/math.js';
import { Frustum } from '../render/camera.js';
import { makeLodConfig, nodeKey } from './lod-config.js';
import { NodePool } from '../workers/pool.js';
import { now } from '../core/perf.js';
import { Rolling } from '../core/perf.js';
import { NODE_CELLS } from '../world/config.js';
import { TREE_MAX_LEVEL } from '../world/scatter/scatter.js';

const NONE = 0, PENDING = 1, READY = 2;

/**
 * Streams the LOD quadtree. Each frame: select nodes by projected voxel size, request what is missing (coarse
 * ancestors first, so the world never has holes), upload finished builds under a time budget, evict by LRU.
 */
export class NodeManager {
  constructor({ renderer, models, world, seed, settings, inline = false, inlineBurst = 1 }) {
    this.renderer = renderer;
    this.models = models;
    this.world = world;
    this.seed = seed;
    this.inlineWorld = inline ? world : null;
    this.inlineBurst = inlineBurst;
    this.nodes = new Map();
    this.epoch = 0;
    this.frame = 0;
    this.inbox = [];
    this.pool = null;
    this.buildMs = new Rolling(60);
    this.drawList = [];
    this.wanted = [];
    this.stats = { loaded: 0, pending: 0, drawn: 0, requests: 0, mode: '', gpuMB: 0, avgBuildMs: 0 };
    this.frustum = new Frustum();
    this._vp = mat4.create();
    this._proj = mat4.create();
    this.cfg = null;
    this.workerCount = 0;
    this.applySettings(settings);
  }

  /** (Re)configure. Changing baseVoxel flushes everything; changing workers rebuilds the pool. */
  applySettings(s) {
    const cfg = makeLodConfig(s);
    const flush = !this.cfg || cfg.baseCell !== this.cfg.baseCell || cfg.sceneryMaxLevel !== this.cfg.sceneryMaxLevel || cfg.sceneryDensity !== this.cfg.sceneryDensity || cfg.ao !== this.cfg.ao;
    this.cfg = cfg;
    this.gpuBudget = (s.gpuBudgetMB || 512) * 1048576;
    this.maxUploadMs = s.uploadBudgetMs || 4;
    if (flush) this.flush();
    if (!this.pool || s.workers !== this.workerCount) {
      if (this.pool) this.pool.dispose();
      this.workerCount = s.workers;
      this.flush();
      this.pool = new NodePool({
        workers: s.workers, seed: this.seed, inlineWorld: this.inlineWorld, inlineBurst: this.inlineBurst,
        onResult: (id, epoch, result) => this.inbox.push({ id, epoch, result }),
        onError: (id, epoch, msg) => { console.error('node build failed', msg); this._fail(id, epoch); },
      });
    }
  }

  _fail(id, epoch) {
    if (epoch !== this.epoch) return;
    const n = this.nodes.get(id);
    if (n) { n.state = NONE; n.failedFrame = this.frame; }
  }

  flush() {
    for (const n of this.nodes.values()) this._free(n);
    this.nodes.clear();
    this.inbox.length = 0;
    this.epoch++;
  }

  _free(n) {
    if (n.gpu) { this.renderer.freeMesh(n.gpu); n.gpu = null; }
    if (n.tex) { this.renderer.freeTex(n.tex); n.tex = null; }
    if (n.batches) { for (const b of n.batches) this.renderer.freeInstances(b); n.batches = null; }
  }

  node(level, ix, iz) {
    const key = nodeKey(level, ix, iz);
    let n = this.nodes.get(key);
    if (n) return n;
    const cfg = this.cfg;
    const size = cfg.size(level);
    const x0 = ix * size, z0 = iz * size;
    const [lo, hi] = this.world.heightRange(x0, z0, size);
    n = {
      key, level, ix, iz, size, cell: cfg.cell(level), x0, z0,
      state: NONE, gpu: null, tex: null, batches: null, exact: false, scenery: level <= Math.min(cfg.sceneryMaxLevel, TREE_MAX_LEVEL) && cfg.sceneryDensity > 0,
      bounds: [0, lo, 0, size, hi, size],
      lastUsed: 0, wantedFrame: 0, bytes: 0, failedFrame: -999, dMin: 0, dMax: 0, _rel: null,
    };
    this.nodes.set(key, n);
    return n;
  }

  parentOf(n) { return n.level >= this.cfg.maxLevel ? null : this.node(n.level + 1, n.ix >> 1, n.iz >> 1); }

  _distance(n, cam) {
    const b = n.bounds;
    const ox = n.x0 - cam.pos[0], oy = -cam.pos[1], oz = n.z0 - cam.pos[2];
    const x0 = ox + b[0], y0 = oy + b[1], z0 = oz + b[2], x1 = ox + b[3], y1 = oy + b[4], z1 = oz + b[5];
    const dx = x0 > 0 ? x0 : x1 < 0 ? -x1 : 0, dy = y0 > 0 ? y0 : y1 < 0 ? -y1 : 0, dz = z0 > 0 ? z0 : z1 < 0 ? -z1 : 0;
    n._rx0 = x0; n._ry0 = y0; n._rz0 = z0; n._rx1 = x1; n._ry1 = y1; n._rz1 = z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _visit(n, cam, proj, lod) {
    const dist = this._distance(n, cam);
    if (dist > this.cfg.viewDistance * 1.03) return;
    if (!this.frustum.aabb(n._rx0, n._ry0, n._rz0, n._rx1, n._ry1, n._rz1)) return;
    n.wantedFrame = this.frame;
    n.dist = dist;
    const cellPx = (n.cell * proj) / Math.max(dist, 1);
    if (n.level > 0 && cellPx > this.cfg.errorPx) {
      const l = n.level - 1, ix = n.ix * 2, iz = n.iz * 2;
      this._visit(this.node(l, ix, iz), cam, proj, lod);
      this._visit(this.node(l, ix + 1, iz), cam, proj, lod);
      this._visit(this.node(l, ix, iz + 1), cam, proj, lod);
      this._visit(this.node(l, ix + 1, iz + 1), cam, proj, lod);
    } else {
      lod.push(n);
    }
  }

  update(camera, dtMs = 16) {
    this.frame++;
    const frame = this.frame;
    // uploads
    const t0 = now();
    while (this.inbox.length && now() - t0 < this.maxUploadMs) this._accept(this.inbox.shift());
    if (this.pool.inline) this.pool.pump(this.maxUploadMs * 1.5);

    // selection with a widened frustum so near-miss nodes are prefetched
    const far = this.cfg.viewDistance * 1.05 + 50;
    mat4.perspective(this._proj, camera.fov * 1.35, camera.aspect, 0.3, far);
    mat4.multiply(this._vp, this._proj, camera.view);
    this.frustum.setFromVP(this._vp);
    const proj = camera.projScale;
    const leaves = this.wanted;
    leaves.length = 0;
    for (let iz = -1; iz <= 0; iz++) for (let ix = -1; ix <= 0; ix++) this._visit(this.node(this.cfg.maxLevel, ix, iz), camera, proj, leaves);

    // coverage: ready leaf, else nearest ready ancestor; queue missing chain coarse first
    const draw = new Map();
    const requests = [];
    for (const leaf of leaves) {
      let n = leaf;
      const chain = [];
      while (n && n.state !== READY) { chain.push(n); n = this.parentOf(n); }
      if (n) draw.set(n.key, n);
      for (const c of chain) {
        if (c.state === NONE && frame - c.failedFrame > 120) requests.push({ n: c, prio: (c.level + 1) * 1e6 - (c.dist ?? 0) });
      }
    }
    // drop descendants covered by a drawn ancestor
    const out = this.drawList;
    out.length = 0;
    for (const n of draw.values()) {
      let covered = false;
      let a = this.parentOf(n);
      while (a) { if (draw.has(a.key)) { covered = true; break; } a = this.parentOf(a); }
      if (!covered) out.push(n);
    }
    for (const n of out) {
      n.lastUsed = frame;
      let a = this.parentOf(n);
      let guard = 0;
      while (a && guard++ < 14) { if (a.state === READY) a.lastUsed = frame; a = this.parentOf(a); }
    }
    // dispatch
    if (requests.length) {
      requests.sort((a, b) => b.prio - a.prio);
      const cfg = this.cfg;
      for (let i = 0; i < requests.length && this.pool.capacity > 0; i++) {
        const n = requests[i].n;
        if (n.state !== NONE) continue;
        n.state = PENDING;
        n.requestedAt = now();
        this.stats.requests++;
        this.pool.request({
          id: n.key, epoch: this.epoch, level: n.level, ix: n.ix, iz: n.iz,
          cfg: { baseCell: cfg.baseCell, ao: cfg.ao, sceneryMaxLevel: cfg.sceneryMaxLevel, sceneryDensity: cfg.sceneryDensity },
        });
      }
    }
    this._evict(frame);
    let pending = 0;
    for (const n of this.nodes.values()) if (n.state === PENDING) pending++;
    this.stats.pending = pending;
    this.stats.loaded = this.nodes.size - pending;
    this.stats.drawn = out.length;
    this.stats.mode = this.pool.mode;
    this.stats.gpuMB = this.renderer.gpuBytes / 1048576;
    this.stats.avgBuildMs = this.buildMs.avg;
    return out;
  }

  _accept({ id, epoch, result }) {
    if (epoch !== this.epoch) return;
    const n = this.nodes.get(id);
    if (!n) return;
    if (n.state !== PENDING) return;
    this.buildMs.push(result.stats.ms);
    const r = this.renderer;
    if (result.indexCount > 0) n.gpu = r.uploadMesh(result);
    if (result.tnorm) n.tex = r.uploadTex(result.tnorm, NODE_CELLS, NODE_CELLS);
    n.batches = null;
    if (result.instances.length) {
      const list = [];
      for (const inst of result.instances) {
        // small props get finer voxels than the terrain around them so a car is a car, not a block
        const sdef = this.world.scenery.get(inst.type) || {};
        const rules = sdef.rules || {};
        // props are voxelized a little coarser than the ground once the node is past the finest level: a tree is a few hundred
        // triangles at half a meter and there are thousands of them in a suburb, so the triangle count is what limits the frame
        // unit models (a tree crown of radius 1, a trunk of height 1) have their own voxel size per level, in model units
        const mcell = sdef.unitCells ? sdef.unitCells[Math.min(result.level, sdef.unitCells.length - 1)] : rules.fine ? Math.max(result.cell * 0.25, 0.125) : result.level >= 1 ? result.cell * 1.5 : result.cell;
        const model = this.models.scenery(inst.type, inst.variant, mcell);
        if (model.empty) continue;
        const batch = r.uploadInstances(inst.data, inst.count, model);
        // small things are not worth a shadow and are not drawn beyond their range: fewer draw calls where they cannot be seen
        batch.noShadow = !!rules.noShadow;
        batch.maxDist = rules.maxDist || 0;
        list.push(batch);
      }
      n.batches = list;
    }
    n.bounds = result.bounds;
    n.exact = true;
    n.state = READY;
    n.lastUsed = this.frame;
    n.bytes = (n.gpu ? n.gpu.bytes : 0) + (n.tex ? n.tex.bytes : 0) + (n.batches ? n.batches.reduce((s, b) => s + b.bytes, 0) : 0);
    n.stats = result.stats;
  }

  _evict(frame) {
    const r = this.renderer;
    if (r.gpuBytes <= this.gpuBudget) return;
    const cand = [];
    for (const n of this.nodes.values()) if (n.state === READY && n.lastUsed < frame - 3) cand.push(n);
    cand.sort((a, b) => a.lastUsed - b.lastUsed);
    for (const n of cand) {
      if (r.gpuBytes <= this.gpuBudget * 0.9) break;
      this._free(n);
      n.state = NONE;
    }
  }

  /** True when every wanted leaf is ready (used to gate the loading screen and tests). */
  get settled() {
    if (this.inbox.length) return false;
    for (const n of this.wanted) if (n.state !== READY) return false;
    return this.wanted.length > 0;
  }

  dispose() {
    this.flush();
    if (this.pool) this.pool.dispose();
  }
}
