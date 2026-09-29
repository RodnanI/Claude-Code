import { defineScenery } from '../region.js';
import { packYaw } from '../scatter/trees.js';

export default defineScenery({
  id: 'bush',
  variants: 3,
  rules: { habitat: 'open', weight: 1, altMax: 700, slopeMax: 0.8, size: 2.2, scale: 1 },
  expand(e, t) {
    const s = t.s, r = (0.85 + 0.3 * t.u[0] + t.pv * 0.12) * s;
    e('puff', t.pv, 0, r * 0.62, 0, packYaw(t.u[1] * 6.28, 0.5), r, t.bank);
    if (t.pv > 0 && t.level === 0) e('puff', (t.pv + 1) % 3, r * 0.8, r * 0.42, r * 0.4, packYaw(t.u[2] * 6.28, 0.4), r * 0.62, t.bank);
  },
});
