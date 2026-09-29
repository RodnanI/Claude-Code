import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield } from '../_shared/airfield.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Hollerin' Hollow: a mowed grass strip on rolling ground with a deliberate bump, tire-lined edges, a patchwork tin
   hangar, a barn, a pallet control tower with a jeans windsock, trailers, junk, hay and a clothesline.
   Heading 350. The strip climbs gently to the north and has a hump 60 m past the west end. */

const S = SITES.hollow;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });
const STRIP = af.runway({ u0: -260, u1: 260, v: 0, w: 24, surface: 'grass', lights: false });
af.pad(-300, 30, -170, 110, M.DIRT_ROAD);
af.pad(-250, -120, -60, -60, M.DIRT_ROAD);
af.pad(-330, 55, -270, 75, M.DIRT_ROAD);

export default defineRegion({
  id: 'airfield/hollerin-hollow',
  name: S.name,
  kind: 'airfield',
  info: { order: 3, label: 'Hillbilly strip', blurb: 'A mown pasture, a barn, a rusty truck and a windsock. Short, bumpy and slightly uphill in both directions.' },
  bounds: af.worldBounds(-620, -260, 340, 460, 60),
  maxHeight: 25,
  tint: M.URBAN_GREEN,
  access: { hollow: af.toWorld(-520, 380) },
  terrain: () => ({
    flatten: [af.flattenRect(-300, 300, -80, 130, 70, 'auto', {
      tu: 0.014, tv: 0, order: 8,
      bumps: [{ u: -140, amp: 1.7, w: 20, wv: 16 }, { u: 40, amp: -0.7, w: 34, wv: 20 }, { u: 190, amp: 0.9, w: 26, wv: 14 }],
    })],
  }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    { id: 'hollow-south', name: 'South end of the strip', ...at(-235, 0), heading: 350, kind: 'runway' },
    { id: 'hollow-hangar', name: 'In front of the tin hangar', ...at(-200, 30), heading: 350, kind: 'apron' },
  ],
  layout(ctx) {
    const rng = new Rng(23);
    const out = newOut();
    // tire markers along both edges
    for (let u = -258; u <= 258; u += 9) for (const s of [-1, 1]) af.prop(out, 'tire-marker', u, s * 13.4, { variant: (Math.floor(u / 9) & 1), scale: 1 });
    // the compound: patchwork hangar, barn, tower, trailers, junk
    af.place(ctx, out, 'tinshack', -206, 46, 13, 10, 4.2, 'left', 201, undefined, { open: true });
    af.place(ctx, out, 'barn', -150, -92, 18, 13, 0, 'right', 202);
    af.place(ctx, out, 'pallettower', -96, -30, 5, 5, 7.6, 'right', 203);
    af.place(ctx, out, 'trailer', -238, 88, 14, 3.7, 3, 'right', 204);
    af.place(ctx, out, 'trailer', -212, 108, 14, 3.7, 3, 'left', 205);
    af.place(ctx, out, 'junkpile', -262, -50, 14, 10, 2, 'right', 206);
    af.place(ctx, out, 'junkpile', -62, 88, 14, 10, 2, 'left', 207);
    af.place(ctx, out, 'hayrolls', -118, -104, 8, 3, 2, 'right', 208, { n: 5 });
    af.place(ctx, out, 'outhouse', -258, 64, 2, 2, 2.8, 'left', 209);
    af.place(ctx, out, 'clothesline', -222, 70, 8, 1, 2.4, 'right', 210);
    af.place(ctx, out, 'windsock', 60, -21, 2, 2, 7, 'right', 211, { jeans: true });
    af.place(ctx, out, 'house', -190, -132, 12, 9, 3.1, 'right', 212, { floors: 1, wall: M.SIDING_WHITE, roof: M.ROOF_TIN_RUST, garage: false });
    af.place(ctx, out, 'silo', -100, -150, 8, 8, 24, 'right', 213, undefined, { n: 2, r: 3.2, h: 22 });
    // vehicles and clutter
    af.prop(out, 'car', -172, 30, { variant: 4, tint: 0xff2a3a8a, yaw: af.propYaw + 0.4 });
    af.prop(out, 'car', -250, 78, { variant: 1, tint: 0xff3a6a2a, yaw: af.propYaw - 0.7 });
    for (let i = 0; i < 40; i++) {
      const u = rng.range(-320, 300), v = rng.range(-180, 200);
      if (Math.abs(v) < 26 && u > -270 && u < 270) continue;
      af.prop(out, rng.chance(0.5) ? 'bush' : 'oak', u, v, { scale: rng.range(0.5, 1), variant: rng.int(0, 2), yaw: rng.range(0, 6.28) });
    }
    af.road(out, -520, 380, -330, 90, 'dirt');
    af.road(out, -330, 90, -290, 65, 'dirt');
    af.road(out, -290, 65, -180, 70, 'dirt');
    af.road(out, -250, -90, -180, 70, 'dirt');
    return out;
  },
});

function at(u, v) { const [x, z] = af.toWorld(u, v); return { x, z, alt: 0 }; }
