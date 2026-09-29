import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Parked and static cars. Body voxels use the TINT flag, so each instance's tint colors the paint. Also the base
   look of moving traffic (traffic/vehicles adds trucks and buses). Local +x is the car's front. */

export default defineScenery({
  id: 'car',
  variants: 5,
  rules: { fine: true, size: 4.6, conservative: false },
  build(b, v) {
    const L = [4.5, 4.1, 4.7, 5.3, 5.0][v], W = [1.8, 1.72, 1.9, 2.05, 2.0][v], H = [1.45, 1.5, 1.75, 2.3, 1.85][v];
    const hl = L / 2, hw = W / 2;
    // lower body
    b.box(-hl, 0.28, -hw, hl, 0.95, hw, M.CAR_PAINT);
    // cabin
    const cabinLen = [2.3, 2.1, 3.0, 3.3, 1.9][v], cabinX = [-0.25, -0.35, -0.2, -0.3, 0.35][v];
    b.box(cabinX - cabinLen / 2, 0.95, -hw + 0.07, cabinX + cabinLen / 2, H, hw - 0.07, M.CAR_GLASS);
    b.box(cabinX - cabinLen / 2, H - 0.06, -hw + 0.07, cabinX + cabinLen / 2, H + 0.04, hw - 0.07, M.CAR_PAINT);
    if (v === 4) b.box(-hl, 0.95, -hw, -0.6, 1.25, hw, M.CAR_PAINT, { md: 0.5 }); // pickup bed
    // bumpers, lights, wheels
    b.box(hl - 0.1, 0.22, -hw + 0.1, hl + 0.06, 0.55, hw - 0.1, M.CAR_TRIM, { md: 0.5 });
    b.box(-hl - 0.06, 0.22, -hw + 0.1, -hl + 0.1, 0.55, hw - 0.1, M.CAR_TRIM, { md: 0.5 });
    b.box(hl - 0.02, 0.55, -hw + 0.08, hl + 0.05, 0.78, -hw + 0.4, M.HEADLIGHT, { md: 0.5 });
    b.box(hl - 0.02, 0.55, hw - 0.4, hl + 0.05, 0.78, hw - 0.08, M.HEADLIGHT, { md: 0.5 });
    b.box(-hl - 0.05, 0.55, -hw + 0.08, -hl + 0.02, 0.78, -hw + 0.4, M.TAILLIGHT, { md: 0.5 });
    b.box(-hl - 0.05, 0.55, hw - 0.4, -hl + 0.02, 0.78, hw - 0.08, M.TAILLIGHT, { md: 0.5 });
    for (const wx of [-hl * 0.62, hl * 0.62]) for (const s of [-1, 1]) b.cyl('z', wx, 0.34, 0.34, 0.34, s * (hw - 0.1) - 0.13, s * (hw - 0.1) + 0.13, M.TIRE);
  },
});
