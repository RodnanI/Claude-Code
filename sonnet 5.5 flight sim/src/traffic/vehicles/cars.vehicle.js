import { defineVehicle } from '../vehicle-def.js';
import car from '../../world/scenery/car.scenery.js';

/* Passenger cars share the geometry of the parked car scenery, so a parked car and a driven one are the same model. */
const ALL = ['highway', 'avenue', 'street', 'road', 'lane', 'service'];
const kinds = [
  { id: 'sedan', name: 'Sedan', v: 0, length: 4.5, width: 1.8, weight: 1.0, roads: ALL },
  { id: 'hatchback', name: 'Hatchback', v: 1, length: 4.1, width: 1.72, weight: 0.8, roads: ['avenue', 'street', 'road', 'lane', 'service'] },
  { id: 'suv', name: 'SUV', v: 2, length: 4.7, width: 1.9, weight: 0.7, roads: ALL },
  { id: 'van', name: 'Van', v: 3, length: 5.3, width: 2.05, weight: 0.35, roads: ['avenue', 'street', 'road', 'service', 'highway'], speedFactor: 0.95 },
  { id: 'pickup', name: 'Pickup', v: 4, length: 5.0, width: 2.0, weight: 0.55, roads: ['road', 'lane', 'dirt', 'street', 'highway'] },
];

export default kinds.map((k) => defineVehicle({
  id: k.id, name: k.name, length: k.length, width: k.width, weight: k.weight, roads: k.roads, speedFactor: k.speedFactor,
  build: (b) => car.build(b, k.v),
}));
