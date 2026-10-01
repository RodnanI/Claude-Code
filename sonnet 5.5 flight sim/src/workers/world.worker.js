import { createWorld } from '../world/index.js';
import { createNodeBuilder, transferListOf } from './build-node.js';
import { DAMAGE } from '../world/damage.js';

let builder = null;

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      const world = createWorld({ seed: m.seed });
      builder = createNodeBuilder(world);
      self.postMessage({ type: 'ready' });
    } else if (m.type === 'damage') {
      DAMAGE.setAll(m.list, m.rev);
    } else if (m.type === 'node') {
      const result = builder.build(m.level, m.ix, m.iz, m.cfg);
      self.postMessage({ type: 'node', id: m.id, epoch: m.epoch, result }, transferListOf(result));
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, epoch: m.epoch, message: String(err && err.stack || err) });
  }
};
