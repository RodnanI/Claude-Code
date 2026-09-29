import { defineScenery } from '../region.js';
import { packYaw } from '../scatter/trees.js';

/* Rock outcrops: one to three boulders leaning on each other, the biggest of them up to a few meters across. Far away only
   the biggest is drawn. Stone color is a bank of the instance, warmer on red ground and darker on the peaks. */
export default defineScenery({
  id: 'rock',
  variants: 4,
  rules: { habitat: 'rock', weight: 1, slopeMax: 9, size: 1.6, scale: 1 },
  expand(e, t) {
    const R = [0.9, 1.4, 2.1, 3.1][t.pv % 4] * t.s * (0.8 + 0.5 * t.u[0]);
    const bank = t.bank || (t.u[3] < 0.25 ? 1 : t.u[3] < 0.35 ? 2 : t.u[3] < 0.42 ? 3 : 0);
    e('boulder', t.pv % 3, 0, R * 0.42, 0, packYaw(t.u[1] * 6.28, R * 0.4), R, bank);
    if (t.level > 1) return;
    if (R > 1.2) e('boulder', (t.pv + 1) % 3, R * 0.85 * Math.cos(t.u[2] * 6.28), R * 0.24, R * 0.85 * Math.sin(t.u[2] * 6.28), packYaw(t.u[4] * 6.28, R * 0.2), R * 0.52, bank);
    if (R > 2 && t.level === 0) e('boulder', (t.pv + 2) % 3, R * 0.6 * Math.cos(t.u[5] * 6.28), R * 0.9, R * 0.6 * Math.sin(t.u[5] * 6.28), packYaw(t.u[6] * 6.28, R * 0.9), R * 0.4, bank);
  },
});
