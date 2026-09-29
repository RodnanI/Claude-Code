import { defineScenery } from '../region.js';
import { conifer } from '../scatter/trees.js';

export default defineScenery({
  id: 'pine',
  variants: 4,
  rules: { habitat: 'forest', weight: 1.0, altMin: 120, altMax: 800, slopeMax: 1.1, size: 13, scale: 1 },
  expand(e, t) { conifer(e, t, { height: [9, 14], radius: [2.7, 3.5], trunk: 1.5, tiers: [5, 3, 2] }); },
});
