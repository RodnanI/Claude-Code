import { defineVehicle } from '../vehicle-def.js';
import { M } from '../../voxel/palette.js';

/* City bus, box truck and a tractor with a long trailer. Local +x is forward, origin at ground level center. */

function wheels(b, xs, hw, r = 0.5) {
  for (const x of xs) for (const s of [-1, 1]) b.cyl('z', x, r, r, r, s * (hw - 0.16) - 0.16, s * (hw - 0.16) + 0.16, M.TIRE);
}

const bus = defineVehicle({
  id: 'bus', name: 'City bus', length: 11.6, width: 2.55, weight: 0.22, roads: ['avenue', 'street'], speedFactor: 0.85, accel: 1.1, decel: 2.6, tints: [0xff2b2bb4, 0xff2aa0d8, 0xffa8763a],
  build(b) {
    const hl = 5.8, hw = 1.27;
    b.box(-hl, 0.55, -hw, hl, 3.05, hw, M.CAR_PAINT);
    b.box(-hl + 0.4, 1.2, -hw - 0.01, hl - 0.6, 2.75, hw + 0.01, M.CAR_GLASS, { md: 0.5 });
    b.box(hl - 0.5, 1.1, -hw + 0.1, hl + 0.02, 2.75, hw - 0.1, M.CAR_GLASS);               // windscreen
    b.box(-hl, 3.05, -hw + 0.1, hl, 3.15, hw - 0.1, M.STEEL, { md: 0.5 });
    b.box(-hl + 3.0, 3.15, -0.7, -hl + 4.6, 3.35, 0.7, M.STEEL_DARK, { md: 0.5 });          // roof unit
    b.box(hl - 0.1, 0.5, -hw + 0.2, hl + 0.1, 0.9, hw - 0.2, M.CAR_TRIM, { md: 0.5 });
    b.box(hl - 0.05, 0.9, -hw + 0.1, hl + 0.06, 1.1, -hw + 0.5, M.HEADLIGHT, { md: 0.5 });
    b.box(hl - 0.05, 0.9, hw - 0.5, hl + 0.06, 1.1, hw - 0.1, M.HEADLIGHT, { md: 0.5 });
    b.box(-hl - 0.06, 0.9, -hw + 0.1, -hl + 0.05, 1.2, hw - 0.1, M.TAILLIGHT, { md: 0.5 });
    b.box(hl - 1.6, 1.0, hw - 0.02, hl - 0.6, 2.7, hw + 0.05, M.CAR_TRIM, { md: 0.5 });     // door
    b.box(hl - 0.6, 3.05, -0.6, hl - 0.05, 3.2, 0.6, M.LAMP_SODIUM, { md: 0.5 });           // destination sign
    wheels(b, [-hl * 0.55, hl * 0.6], hw, 0.5);
  },
});

const boxTruck = defineVehicle({
  id: 'boxtruck', name: 'Box truck', length: 8.2, width: 2.45, weight: 0.3, roads: ['avenue', 'street', 'road', 'highway', 'service'], speedFactor: 0.9, accel: 1.4, decel: 3, tints: [0xffe6e6e6, 0xffb0b0b0, 0xff2b2bb4, 0xff3a6a2a],
  build(b) {
    const hl = 4.1, hw = 1.22;
    b.box(hl - 2.1, 0.6, -hw, hl, 2.2, hw, M.CAR_PAINT);                                    // cab
    b.box(hl - 0.9, 1.35, -hw + 0.06, hl + 0.02, 2.05, hw - 0.06, M.CAR_GLASS);
    b.box(-hl, 0.9, -hw - 0.02, hl - 2.2, 3.5, hw + 0.02, M.CONCRETE_PANEL);                // box body
    b.box(-hl, 0.5, -hw + 0.1, hl, 0.9, hw - 0.1, M.STEEL_DARK);                            // chassis
    b.box(hl - 0.05, 0.75, -hw + 0.1, hl + 0.06, 1.05, -hw + 0.5, M.HEADLIGHT, { md: 0.5 });
    b.box(hl - 0.05, 0.75, hw - 0.5, hl + 0.06, 1.05, hw - 0.1, M.HEADLIGHT, { md: 0.5 });
    b.box(-hl - 0.06, 0.75, -hw + 0.1, -hl + 0.05, 1.05, hw - 0.1, M.TAILLIGHT, { md: 0.5 });
    b.box(-hl + 0.4, 0.9, -0.02, -hl + 3.6, 3.4, 0.02, M.STEEL_DARK, { md: 0.3 });          // roll door seam
    wheels(b, [-hl * 0.62, hl * 0.62], hw, 0.5);
  },
});

const semi = defineVehicle({
  id: 'semi', name: 'Tractor trailer', length: 16.5, width: 2.55, weight: 0.16, roads: ['highway', 'road', 'avenue'], speedFactor: 0.85, accel: 0.9, decel: 2.4, tints: [0xffb0b0b0, 0xff2b2bb4, 0xff1e3a8a, 0xffe6e6e6],
  build(b) {
    const hl = 8.25, hw = 1.27;
    b.box(hl - 2.6, 0.7, -hw, hl, 3.0, hw, M.CAR_PAINT);                                    // tractor cab
    b.box(hl - 1.0, 1.7, -hw + 0.06, hl + 0.02, 2.75, hw - 0.06, M.CAR_GLASS);
    b.box(hl - 2.6, 3.0, -hw + 0.2, hl - 1.0, 3.5, hw - 0.2, M.CAR_PAINT, { md: 0.5 });     // sleeper roof
    b.box(hl - 0.05, 0.9, -hw + 0.1, hl + 0.06, 1.3, -hw + 0.5, M.HEADLIGHT, { md: 0.5 });
    b.box(hl - 0.05, 0.9, hw - 0.5, hl + 0.06, 1.3, hw - 0.1, M.HEADLIGHT, { md: 0.5 });
    b.box(-hl + 0.4, 0.55, -hw + 0.1, hl - 2.4, 1.05, hw - 0.1, M.STEEL_DARK);              // frame
    b.box(-hl, 1.15, -hw, hl - 3.3, 4.05, hw, M.CONCRETE_PANEL);                            // trailer
    b.box(-hl - 0.06, 1.0, -hw + 0.2, -hl + 0.05, 1.3, hw - 0.2, M.TAILLIGHT, { md: 0.5 });
    b.box(-hl + 0.1, 1.15, -hw + 0.06, hl - 3.4, 1.25, hw - 0.06, M.STEEL, { md: 0.4 });
    wheels(b, [hl - 1.9, hl - 3.5, -hl + 1.4, -hl + 2.8], hw, 0.52);
  },
});

export default [bus, boxTruck, semi];
