import { defineRegion } from '../../../region.js';
import { LAT, ELEV, rectFor } from './_lattice.js';

/** Grades the whole metropolis onto one flat pad so streets and foundations meet cleanly. */
export default defineRegion({
  id: 'metropolis/meridian/ground',
  name: 'Meridian Grading',
  kind: 'feature',
  bounds: rectFor(-15, 15, -17, 13),
  maxHeight: 0,
  terrain: () => ({
    flatten: [{ type: 'rect', cx: LAT.cx, cz: LAT.cz - 200, hw: 2100, hd: 2600, rot: 0, blend: 900, y: ELEV, order: 5 }],
  }),
});
