import { createWorld } from '../world/index.js';
import { createNodeBuilder } from './build-node.js';
import { now } from '../core/perf.js';

/**
 * Worker pool for node building. Uses Web Workers when available (module workers in dev, a Blob built from an
 * inlined script in the single-file build) and falls back to time-sliced main-thread building otherwise.
 */
export class NodePool {
  constructor({ workers = 3, seed, onResult, onError, inlineWorld = null, inlineBurst = 1 }) {
    this.onResult = onResult;
    this.onError = onError;
    this.seed = seed;
    this.workers = [];
    this.inflight = 0;
    this.maxInflight = 0;
    this.inline = null;
    this.queue = [];
    this.ready = 0;
    this.desired = workers;
    if (inlineWorld) { this.inline = createNodeBuilder(inlineWorld); this.maxInflight = inlineBurst; return; }
    this._spawn(workers);
  }

  _makeWorker() {
    const el = typeof document !== 'undefined' ? document.getElementById('fh-worker-src') : null;
    if (el) {
      const url = URL.createObjectURL(new Blob([el.textContent], { type: 'text/javascript' }));
      return new Worker(url);
    }
    return new Worker(new URL('./world.worker.js', import.meta.url), { type: 'module' });
  }

  _spawn(n) {
    let ok = true;
    if (typeof Worker === 'undefined') ok = false;
    else {
      try {
        for (let i = 0; i < n; i++) {
          const w = this._makeWorker();
          const rec = { w, busy: 0, ready: false };
          w.onmessage = (e) => this._onMessage(rec, e.data);
          w.onerror = (e) => { console.warn('worker error', e.message); };
          w.postMessage({ type: 'init', seed: this.seed });
          this.workers.push(rec);
        }
      } catch (err) {
        console.warn('workers unavailable, building on main thread', err);
        for (const r of this.workers) r.w.terminate();
        this.workers.length = 0;
        ok = false;
      }
    }
    if (!ok) {
      this.inline = createNodeBuilder(createWorld({ seed: this.seed }));
      this.maxInflight = 1;
    } else {
      this.maxInflight = this.workers.length * 2;
    }
  }

  get capacity() { return Math.max(0, this.maxInflight - this.inflight); }
  get mode() { return this.inline ? 'inline' : 'workers:' + this.workers.length; }

  request(req) {
    if (this.inline) { this.queue.push(req); this.inflight++; return; }
    let best = null;
    for (const r of this.workers) if (!best || r.busy < best.busy) best = r;
    best.busy++;
    this.inflight++;
    best.w.postMessage({ type: 'node', ...req });
  }

  /** Send one message to every worker (the blast list). Inline building shares the page's own list, so it has nothing to do. */
  broadcast(msg) { for (const r of this.workers) r.w.postMessage(msg); }

  /** Main-thread fallback: build queued requests within a time budget (ms). */
  pump(budgetMs) {
    if (!this.inline) return;
    const t = now();
    while (this.queue.length && now() - t < budgetMs) {
      const req = this.queue.shift();
      this.inflight--;
      try {
        const result = this.inline.build(req.level, req.ix, req.iz, req.cfg);
        this.onResult(req.id, req.epoch, result);
      } catch (err) { this.onError(req.id, req.epoch, String(err && err.stack || err)); }
    }
  }

  _onMessage(rec, m) {
    if (m.type === 'ready') { rec.ready = true; this.ready++; return; }
    if (m.type === 'node') { rec.busy--; this.inflight--; this.onResult(m.id, m.epoch, m.result); }
    else if (m.type === 'error') { rec.busy--; this.inflight--; this.onError(m.id, m.epoch, m.message); }
  }

  dispose() { for (const r of this.workers) r.w.terminate(); this.workers.length = 0; this.queue.length = 0; }
}
