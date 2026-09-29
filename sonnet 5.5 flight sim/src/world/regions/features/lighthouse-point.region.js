import { defineRegion } from '../../region.js';
import { newOut, snap } from '../_shared/zoning.js';

/** A lone lighthouse on the north-west headland. */
const X = -7600, Z = -8300;
export default defineRegion({
  id: 'feature/lighthouse-point',
  name: 'Point Lantern',
  kind: 'feature',
  bounds: [X - 100, Z - 100, X + 100, Z + 100],
  maxHeight: 50,
  layout(ctx) {
    const out = newOut();
    if (ctx.heightAt(X, Z) > 1) out.structures.push(ctx.kit('lighthouse', { x: snap(X), z: snap(Z), w: 12, d: 12, h: 36, rot: 0, seed: 2 }));
    return out;
  },
});
