import { defineVehicle } from '../vehicle-def.js';
import { M } from '../../voxel/palette.js';
import car from '../../world/scenery/car.scenery.js';

/* Taxi: a sedan in fixed yellow with a roof sign. City streets only. */
export default defineVehicle({
  id: 'taxi', name: 'Taxi', length: 4.5, width: 1.8, weight: 0.5, roads: ['avenue', 'street'], tints: [0xff2ab8f2],
  build(b) {
    car.build(b, 0);
    b.box(-0.2, 1.45, -0.28, 0.35, 1.68, 0.28, M.LAMP_WHITE, { md: 0.4 });
    b.box(-0.22, 1.42, -0.3, 0.37, 1.46, 0.3, M.CAR_TRIM, { md: 0.4 });
  },
});
