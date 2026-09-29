import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield, runwayLights, fenceRect } from '../_shared/airfield.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Fort Talon Air Base: one long runway on a graded plateau, parallel taxiways, a loop of hardened aircraft shelters,
   big arched hangars, tower, radar, fuel farm, barracks, motor pool, SAM sites and a perimeter fence. Heading 070. */

const S = SITES.fortTalon;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });

const RW = af.runway({ u0: -1650, u1: 1650, v: 0, w: 46, marks: { west: '07', east: '25' } });
af.taxiway(-1600, -110, 1600, -110, 20);
af.taxiway(-1600, 150, 1600, 150, 20);
for (const u of [-1300, -650, 0, 650, 1300]) { af.taxiway(u, -110, u, -18, 20); af.taxiway(u, 18, u, 150, 20); }
for (let i = 0; i < 8; i++) af.taxiway(-1200 + i * 78, 150, -1200 + i * 78, 238, 14);
af.apron(-480, -340, 480, -122);
af.pad(-620, -520, 620, -350, M.CONCRETE_DARK);
af.pad(-1120, -700, -400, -540, M.ASPHALT_WORN);
af.pad(520, -520, 620, -430, M.CONCRETE);

export default defineRegion({
  id: 'airfield/fort-talon',
  name: S.name,
  kind: 'airfield',
  info: { label: 'Military air base', blurb: 'A long concrete runway, hardened shelters, hangars and a fuel farm. Nobody asks what you are doing here.' },
  bounds: af.worldBounds(-1950, -760, 1950, 420, 60),
  maxHeight: 60,
  tint: M.CONCRETE_DARK,
  access: { fortTalon: af.toWorld(-300, -760) },
  terrain: () => ({ flatten: [af.flattenRect(-2000, 2000, -820, 480, 800, S.elev)] }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    { id: 'talon-07', name: 'Runway 07 threshold', ...at(-1550, 0), heading: 70, kind: 'runway' },
    { id: 'talon-apron', name: 'Ramp', ...at(-200, -230), heading: 160, kind: 'apron' },
    { id: 'talon-shelters', name: 'Shelter row', ...at(-700, 190), heading: 340, kind: 'apron' },
  ],
  layout(ctx) {
    const rng = new Rng(17);
    const out = newOut();
    runwayLights(af, RW, out);
    for (let u = -1600; u <= 1600; u += 50) for (const s of [-1, 1]) af.prop(out, 'runway-light', u, s * 0 + (s < 0 ? -110 - 11.4 : 150 + 11.4), { variant: 3 });
    // hardened aircraft shelters facing the runway side
    for (let i = 0; i < 8; i++) af.place(ctx, out, 'shelter', -1200 + i * 78, 262, 17, 26, 8, 'left', 100 + i);
    // hangars and operations
    for (let i = 0; i < 3; i++) af.place(ctx, out, 'hangar', -230 + i * 230, -420, 46, 66, 0, 'right', 110 + i, { skin: M.CLADDING_GRAY, inner: M.CONCRETE_PANEL });
    af.place(ctx, out, 'tower', -110, -500, 16, 16, 30, 'right', 120, { mil: true });
    af.place(ctx, out, 'lowrise', 190, -560, 34, 18, 9, 'right', 121, { wall: M.MIL_TAN });
    for (let i = 0; i < 6; i++) af.place(ctx, out, 'barracks', -1000 + (i % 3) * 210, -580 - Math.floor(i / 3) * 42, 46, 12, 7, 'right', 130 + i);
    for (let i = 0; i < 6; i++) af.place(ctx, out, 'tank', 700 + (i % 3) * 30, -580 - Math.floor(i / 3) * 30, 22, 22, 11, 'right', 140 + i, { mat: M.TANK_GRAY });
    af.place(ctx, out, 'radar', 900, -420, 12, 12, 0, 'right', 150);
    af.place(ctx, out, 'warehouse', 400, -640, 60, 30, 9, 'right', 151, { wall: M.CLADDING_SAND });
    af.place(ctx, out, 'watertower', 120, -680, 12, 12, 30, 'right', 152);
    for (const [u, v] of [[1750, 240], [1750, -260], [-1770, 200], [-1770, -240]]) af.place(ctx, out, 'sam', u, v, 20, 20, 5, 'left', 160);
    for (const [u, v] of [[-1620, 90], [1620, 90]]) af.place(ctx, out, 'windsock', u, v, 2, 2, 7, 'right', 170);
    // motor pool: olive trucks and cars
    for (let i = 0; i < 26; i++) {
      const u = -1080 + (i % 13) * 52, v = -660 + Math.floor(i / 13) * 60;
      af.prop(out, 'car', u, v, { variant: rng.chance(0.5) ? 3 : 4, tint: rng.chance(0.7) ? 0xff2a4a54 : 0xff6a8aa0, yaw: af.propYaw + 1.5708 });
    }
    af.road(out, -300, -760, -300, -560, 'road');
    af.road(out, -900, -760, 700, -760, 'road');
    fenceRect(ctx, af, -1900, -800, 1900, 460, out, 7, { u: -300, v: -800, w: 34 });
    return out;
  },
});

function at(u, v) { const [x, z] = af.toWorld(u, v); return { x, z, alt: 0 }; }
