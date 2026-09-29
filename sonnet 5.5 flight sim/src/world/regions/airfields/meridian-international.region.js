import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield, runwayLights, fenceRect } from '../_shared/airfield.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Meridian International: two parallel runways (09/27), parallel taxiways with connectors, a terminal with two
   concourses, control tower, hangars, cargo sheds, a fuel farm and long-stay parking, inside a perimeter fence.
   Frame: u east along the runways, v south. */

const S = SITES.airport;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });

const R1 = af.runway({ u0: -1700, u1: 1700, v: 300, w: 60, marks: { west: '09R', east: '27L' } });
const R2 = af.runway({ u0: -1200, u1: 1400, v: -40, w: 45, marks: { west: '09L', east: '27R' } });
af.taxiway(-1500, 130, 1600, 130, 23);
af.taxiway(-1300, -190, 1450, -190, 23);
for (const u of [-1150, -600, 0, 600, 1250]) af.taxiway(u, -190, u, 270, 23);
af.apron(-760, -570, 760, -212);
af.apron(850, -470, 1260, -212);
af.apron(-1360, -440, -800, -212);
af.pad(-560, -1010, 560, -730, M.ASPHALT_WORN);
af.pad(-1500, -680, -1300, -540, M.CONCRETE);
af.pad(-380, -730, 380, -700, M.CONCRETE);

export default defineRegion({
  id: 'airfield/meridian-international',
  name: S.name,
  kind: 'airfield',
  info: { label: 'Civil airport', blurb: 'Two parallel asphalt runways, a glass terminal, the control tower and the busiest traffic on the island.' },
  bounds: af.worldBounds(-2050, -1120, 2050, 500, 60),
  maxHeight: 60,
  tint: M.CONCRETE,
  access: { airport: af.toWorld(0, -1000) },
  terrain: () => ({ flatten: [af.flattenRect(-2100, 2100, -1150, 520, 520, S.elev)] }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    { id: 'airport-09R', name: 'Runway 09R threshold', ...at(-1600, 300, 0), heading: 90, kind: 'runway' },
    { id: 'airport-09L', name: 'Runway 09L threshold', ...at(-1100, -40, 0), heading: 90, kind: 'runway' },
    { id: 'airport-apron', name: 'Terminal apron', ...at(-300, -330, 0), heading: 180, kind: 'apron' },
  ],
  layout(ctx) {
    const rng = new Rng(11);
    const out = newOut();
    runwayLights(af, R1, out);
    runwayLights(af, R2, out);
    // taxiway edge lights along the parallels
    for (let u = -1500; u <= 1600; u += 45) for (const s of [-1, 1]) af.prop(out, 'runway-light', u, 130 + s * 13.4, { variant: 3 });
    // terminal complex
    af.place(ctx, out, 'terminal', 0, -640, 170, 36, 13, 'right', 21);
    af.place(ctx, out, 'tower', 430, -600, 16, 16, 30, 'right', 22);
    for (let i = 0; i < 3; i++) af.place(ctx, out, 'hangar', -1240 + i * 110, -330, 36, 52, 0, 'right', 30 + i);
    af.place(ctx, out, 'warehouse', 1030, -560, 96, 42, 12, 'right', 40);
    af.place(ctx, out, 'warehouse', 1030, -620, 96, 42, 12, 'right', 41);
    af.place(ctx, out, 'warehouse', 910, -320, 44, 32, 10, 'right', 42);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) af.place(ctx, out, 'tank', -1450 + i * 34, -640 + j * 34, 24, 24, 13, 'right', 50 + i * 2 + j);
    af.place(ctx, out, 'beacon', 220, -705, 4, 4, 17, 'right', 60);
    af.place(ctx, out, 'midrise', 620, -840, 34, 20, 28, 'right', 61, { wall: M.CONCRETE_PANEL, glass: [M.GLASS_TEAL, M.GLASS_SLATE], lit: 0.4 });
    af.place(ctx, out, 'midrise', -620, -840, 34, 20, 22, 'right', 62, { wall: M.CONCRETE_PANEL });
    // windsocks and approach markers
    for (const [u, v] of [[-1620, 385], [1620, 385], [-1150, -110], [1250, -110]]) af.place(ctx, out, 'windsock', u, v, 2, 2, 7, 'right', 70);
    // long-stay parking with cars
    for (let r = 0; r < 4; r++) for (let i = 0; i < 46; i++) {
      if (!rng.chance(0.55)) continue;
      const c = rng.next();
      const tint = c < 0.2 ? 0xff2a2a2a : c < 0.4 ? 0xffe6e6e6 : c < 0.55 ? 0xffa8763a : c < 0.7 ? 0xff2b2bb4 : c < 0.85 ? 0xffb0b0b0 : 0xff2aa0d8;
      af.prop(out, 'car', -520 + i * 22.6, -960 + r * 62, { variant: rng.int(0, 4), tint, yaw: af.propYaw + 1.5708 });
    }
    // access road and perimeter fence
    af.road(out, -700, -1010, 700, -1010);
    af.road(out, 0, -1010, 0, -735);
    fenceRect(ctx, af, -1820, -1090, 1820, 440, out, 5, { u: 0, v: -1090, w: 30 });
    // grass around the movement area is left to the biome
    void rng;
    return out;
  },
});

function at(u, v, alt) { const [x, z] = af.toWorld(u, v); return { x, z, alt }; }
