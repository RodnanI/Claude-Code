import { defineScenery } from '../region.js';
import { broadleaf } from '../scatter/trees.js';

export default defineScenery({
  id: 'oak',
  variants: 4,
  rules: { habitat: 'forest', weight: 1.3, altMax: 420, slopeMax: 0.9, size: 11, scale: 1 },
  expand(e, t) { broadleaf(e, t, { trunk: [2.4, 4.0], crown: [3.3, 4.5], sides: [4, 2, 1], top: true }); },
});
