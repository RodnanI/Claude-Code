import { defineScenery } from '../region.js';
import { broadleaf } from '../scatter/trees.js';

export default defineScenery({
  id: 'birch',
  variants: 3,
  rules: { habitat: 'forest', weight: 0.7, altMin: 30, altMax: 520, slopeMax: 0.8, size: 10, scale: 1 },
  expand(e, t) { broadleaf(e, t, { trunk: [4.6, 7], crown: [1.9, 2.7], spread: 0.5, lift: 0.85, sides: [3, 2, 0], puff: 'puffb', trunkBank: 1 }); },
});
