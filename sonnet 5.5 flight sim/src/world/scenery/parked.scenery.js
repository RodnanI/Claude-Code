import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { airliner, bizjet, helicopter, stampAircraft } from './_aircraft.js';
import skylark from '../../aircraft/planes/skylark.plane.js';
import scrapper from '../../aircraft/planes/scrapper.plane.js';
import shrike from '../../aircraft/planes/shrike.plane.js';

/* Parked aircraft for aprons, ramps and hangar lines. Local +x is the nose, the wheels rest on y = 0, and the instance tint
   colors the airline stripe and tail. Aircraft have their own voxel size per level (unitCells, in meters), so a near one is never gigantic and a far one is cheap. */

const BIG = [0.25, 0.25, 0.5, 1, 2, 4, 8, 8];
const MID = [0.125, 0.125, 0.25, 0.5, 1, 2, 4, 8];

const jet = defineScenery({
  id: 'parked-airliner', variants: 1, unitCells: BIG, rules: { size: 40 },
  build(b) { airliner(b, { k: 1 }); },
});
const heavy = defineScenery({
  id: 'parked-heavy', variants: 1, unitCells: BIG, rules: { size: 66 },
  build(b) { airliner(b, { k: 1.7, heavy: true }); },
});
const biz = defineScenery({
  id: 'parked-bizjet', variants: 1, unitCells: MID, rules: { size: 21 },
  build(b) { bizjet(b); },
});
const heli = defineScenery({
  id: 'parked-heli', variants: 3, unitCells: MID, rules: { size: 14 },
  build(b, v) { helicopter(b, v === 1 ? { body: M.AC_WHITE, stripe: M.AC_RED } : v === 2 ? { body: M.AC_OLIVE, stripe: M.AC_DRAB } : {}); },
});
const sky = defineScenery({
  id: 'parked-skylark', variants: 1, unitCells: MID, rules: { size: 12 },
  build(b) { stampAircraft(b, skylark); },
});
const scrap = defineScenery({
  id: 'parked-scrapper', variants: 1, unitCells: MID, rules: { size: 10 },
  build(b) { stampAircraft(b, scrapper); },
});
const fighter = defineScenery({
  id: 'parked-shrike', variants: 2, unitCells: MID, rules: { size: 17 },
  build(b, v) { stampAircraft(b, shrike, { armed: v === 1 }); },
});

export default [jet, heavy, biz, heli, sky, scrap, fighter];
