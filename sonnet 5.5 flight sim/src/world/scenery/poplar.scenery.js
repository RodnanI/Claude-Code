import { defineScenery } from '../region.js';
import { packYaw } from '../scatter/trees.js';

/* Tall columnar tree for avenues and squares: a short trunk under a stack of small crowns. */
export default defineScenery({
  id: 'poplar',
  variants: 2,
  rules: { size: 10, conservative: true },
  expand(e, t) {
    const s = t.s, cs = Math.min(1.5, 1 + 0.15 * t.level), R = (1.45 + 0.3 * t.u[0]) * s * cs;
    if (t.level <= 1) e('trunk', 0, 0, 0, 0, t.u[1] * 6.28, 3.6 * s, 0);
    const n = t.level === 0 ? 4 : t.level === 1 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const y = (2.6 + k * 1.55 * cs) * s + R * 0.6, r = R * (1 - 0.13 * k);
      e('puffb', (t.pv + k) % 3, (t.u[2] - 0.5) * 0.2 * k, y, 0, packYaw(t.u[3] * 6.28, y), r, t.bank);
    }
  },
});
