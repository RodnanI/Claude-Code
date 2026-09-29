import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield } from '../_shared/airfield.js';
import { propAt } from '../_shared/aids.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Hollerin' Hollow: a mowed grass strip on rolling ground with a deliberate bump, worn wheel tracks, tire-lined edges and
   lime-painted numbers, and beside it a farm that has fallen into the aviation business: a patchwork tin hangar with an airplane
   in front, a barn and silos, a pallet control tower with a jeans windsock, a school bus somebody lives in, trailers, a windmill,
   a water tank on stilts, a still, a bonfire with lawn chairs, a pigpen, a chicken coop, a wreck under a chain hoist, junk,
   hay, split-rail fence and a hand-painted sign. Heading 350. The strip climbs gently to the north and has a hump 60 m past
   the south end. */

const S = SITES.hollow;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });
const STRIP = af.runway({ u0: -260, u1: 260, v: 0, w: 24, surface: 'grass', lights: false, marks: { west: '35', east: '17' } });
// dirt farmyards on both sides, the taxi track from the hangar to the strip, a lane between them
af.pad(-312, 24, -96, 152, M.DIRT_ROAD);
af.pad(-262, -130, -40, -52, M.DIRT_ROAD);
af.pad(-214, 10, -198, 36, M.DIRT_ROAD);
af.pad(-330, 55, -270, 75, M.DIRT_ROAD);
af.pad(-150, -52, -138, 24, M.DIRT_ROAD);

const inYard = (u, v) => (u > -340 && u < -30 && v > -160 && v < 170) || Math.hypot(u + 185, v - 5) < 215;

export default defineRegion({
  id: 'airfield/hollerin-hollow',
  name: S.name,
  kind: 'airfield',
  info: {
    order: 3, label: 'Hillbilly strip', elevation: S.elev,
    blurb: 'A mown pasture, a barn, a rusty truck, a still and a windsock made of jeans. Short, bumpy and slightly uphill in both directions.',
    features: ['Grass strip 17/35 with a hump and a slope', 'Tin hangar, barn and a school bus with a porch', 'No lights, no radio, no help'],
  },
  bounds: af.worldBounds(-620, -260, 340, 460, 60),
  maxHeight: 40,
  tint: M.URBAN_GREEN,
  // the farm is a clearing in the woods: the strip and both yards stay free of natural trees
  clearings: [af.clearing(-185, 5, 210), af.clearing(0, 0, 90)],
  access: { hollow: af.toWorld(-520, 380) },
  runways: af.runwayList(),
  chart: () => af.chart(),
  terrain: () => ({
    flatten: [af.flattenRect(-300, 300, -80, 130, 70, 'auto', {
      tu: 0.014, tv: 0, order: 8,
      bumps: [{ u: -140, amp: 1.7, w: 20, wv: 16 }, { u: 40, amp: -0.7, w: 34, wv: 20 }, { u: 190, amp: 0.9, w: 26, wv: 14 }],
    })],
  }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    af.spawn({ id: 'hollow-south', name: 'South end of the strip', u: -235, v: 0, dir: 0, kind: 'runway', runway: '35', group: 'The strip' }),
    af.spawn({ id: 'hollow-north', name: 'North end, downhill', u: 235, v: 0, dir: 180, kind: 'runway', runway: '17', group: 'The strip' }),
    af.spawn({ id: 'hollow-hangar', name: 'In front of the tin hangar', u: -200, v: 30, dir: 0, kind: 'hangar', group: 'The farm' }),
    af.spawn({ id: 'hollow-barn', name: 'Beside the barn', u: -122, v: -58, dir: 0, kind: 'apron', group: 'The farm' }),
  ],
  layout(ctx) {
    const rng = new Rng(23);
    const out = newOut();
    // tire markers along both edges and a few amber lamps where somebody has run an extension cord
    for (let u = -258; u <= 258; u += 9) for (const s of [-1, 1]) af.prop(out, 'tire-marker', u, s * 13.4, { variant: (Math.floor(u / 9) & 1), scale: 1 });
    for (let u = -250; u <= 250; u += 50) for (const s of [-1, 1]) propAt(af, out, 'runway-light', u, s * 14.6, 0, { variant: 3 });

    // ---- the aviation side: hangar, control tower, windsocks, an airplane and a bus
    af.place(ctx, out, 'tinshack', -206, 46, 13, 10, 4.2, 'left', 201, undefined, { open: true });
    propAt(af, out, 'parked-scrapper', -204, 27, -84, {});
    af.place(ctx, out, 'pallettower', -96, -30, 5, 5, 7.6, 'right', 203);
    af.place(ctx, out, 'windsock', 60, -21, 2, 2, 7, 'right', 211, { jeans: true });
    af.place(ctx, out, 'windsock', -270, 20, 2, 2, 7, 'right', 214);
    af.place(ctx, out, 'busshack', -290, 38, 11, 3, 3, 'left', 220);
    af.place(ctx, out, 'wreck', -100, 64, 8, 6, 3, 'right', 221);

    // ---- the homestead east of the strip
    af.place(ctx, out, 'trailer', -238, 88, 14, 3.7, 3, 'right', 204);
    af.place(ctx, out, 'trailer', -212, 108, 14, 3.7, 3, 'left', 205);
    af.place(ctx, out, 'junkpile', -62, 88, 14, 10, 2, 'left', 207);
    af.place(ctx, out, 'outhouse', -258, 64, 2, 2, 2.8, 'left', 209);
    af.place(ctx, out, 'clothesline', -222, 70, 8, 1, 2.4, 'right', 210);
    af.place(ctx, out, 'windmill', -130, 100, 6, 6, 12, 'right', 222, undefined, { h: 12 });
    af.place(ctx, out, 'watertank', -70, 122, 6, 6, 6.4, 'right', 223);
    af.place(ctx, out, 'chickencoop', -246, 134, 8, 6, 3.3, 'right', 224);
    af.place(ctx, out, 'woodpile', -174, 136, 7, 3, 1.4, 'right', 225);
    af.place(ctx, out, 'still', -334, 128, 5, 4, 2.4, 'right', 226);
    af.place(ctx, out, 'bonfire', -176, 78, 7, 7, 1.5, 'right', 227);
    af.place(ctx, out, 'pigpen', -44, 140, 7, 5.5, 1.2, 'right', 228);
    af.place(ctx, out, 'mailbox', -520, 372, 1, 1, 2, 'right', 229, { text: 'EARL' });
    af.place(ctx, out, 'signboard', -404, 246, 14, 1, 3.4, 'right', 230, { text: 'HOLLERIN HOLLOW', hand: true, base: 1.6 });
    // fences: along the yard, and a few lengths that are still standing beside the strip
    for (let u = -312; u < -70; u += 24) af.place(ctx, out, 'fencerow', u + 12, 152, 24, 1, 1.4, 'right', 240 + ((u + 312) / 24 | 0));
    for (let v = 28; v < 150; v += 24) af.place(ctx, out, 'fencerow', -312, v + 12, 24, 1, 1.4, 'ahead', 260 + ((v - 28) / 24 | 0));
    for (let u = -262; u < -40; u += 24) af.place(ctx, out, 'fencerow', u + 12, -52, 24, 1, 1.4, 'right', 280 + ((u + 262) / 24 | 0));

    // ---- the barn side, west of the strip
    af.place(ctx, out, 'barn', -150, -92, 18, 13, 0, 'right', 202);
    af.place(ctx, out, 'junkpile', -262, -50, 14, 10, 2, 'right', 206);
    af.place(ctx, out, 'hayrolls', -118, -104, 8, 3, 2, 'right', 208, undefined, { n: 5 });
    af.place(ctx, out, 'house', -190, -132, 12, 9, 3.1, 'right', 212, { floors: 1, wall: M.SIDING_WHITE, roof: M.ROOF_TIN_RUST, garage: false });
    af.place(ctx, out, 'silo', -100, -150, 8, 8, 24, 'right', 213, undefined, { n: 2, r: 3.2, h: 22 });
    // machines that have seen better days
    af.prop(out, 'car', -172, 30, { variant: 4, tint: 0xff2a3a8a, yaw: af.propYaw + 0.4 });
    af.prop(out, 'car', -250, 78, { variant: 1, tint: 0xff3a6a2a, yaw: af.propYaw - 0.7 });
    propAt(af, out, 'rusty-pickup', -160, 104, 30, { variant: 0 });
    propAt(af, out, 'rusty-pickup', -276, 96, -120, { variant: 1 });
    propAt(af, out, 'tractor', -128, -66, 190, {});
    propAt(af, out, 'tractor', -290, -70, 40, {});
    propAt(af, out, 'traffic-cone', -196, 20, 0, {}); propAt(af, out, 'traffic-cone', -212, 20, 0, {});
    // trees and scrub at the edges of the clearing
    for (let i = 0; i < 46; i++) {
      const u = rng.range(-340, 300), v = rng.range(-190, 220);
      if ((Math.abs(v) < 26 && u > -270 && u < 270) || inYard(u, v)) continue;
      af.prop(out, rng.chance(0.5) ? 'bush' : 'oak', u, v, { scale: rng.range(0.5, 1), variant: rng.int(0, 2), yaw: rng.range(0, 6.28) });
    }
    // the dirt lane from the county road
    af.road(out, -520, 380, -330, 90, 'dirt');
    af.road(out, -330, 90, -290, 65, 'dirt');
    af.road(out, -290, 65, -180, 70, 'dirt');
    af.road(out, -250, -90, -180, 70, 'dirt');
    return out;
  },
});
