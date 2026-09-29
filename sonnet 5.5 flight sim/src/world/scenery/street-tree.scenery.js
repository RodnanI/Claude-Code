import { defineScenery } from '../region.js';
import { broadleaf } from '../scatter/trees.js';

export default defineScenery({
  id: 'street-tree',
  variants: 3,
  rules: { size: 8, conservative: true },
  expand(e, t) {
    // the middle variant turns in autumn, unless the scatter already chose a color for this tree
    broadleaf(e, { ...t, bank: t.pv === 1 && t.bank === 0 ? 1 : t.bank }, { trunk: [2.6, 3.4], crown: [2.0, 2.5], spread: 0.55, lift: 0.7, sides: [3, 2, 0], puff: t.pv === 2 ? 'puffb' : 'puff' });
  },
});
