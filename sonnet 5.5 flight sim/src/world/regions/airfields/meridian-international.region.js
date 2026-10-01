import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield, runwayLights, fenceRect } from '../_shared/airfield.js';
import { approachLights, papi, taxiLights, onRunway, floodline, propAt, parkAt, pierGate, CREWS, TINTS, rgb } from '../_shared/aids.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Meridian International: two parallel runways (09/27) with exits, fillets, hold lines and full lighting, an inner and an outer
   parallel taxiway with connectors, a terminal with two piers and twelve jet-bridge gates, remote stands, a cargo apron with
   freighters, a general aviation ramp with hangars, the tower, fire station, fuel farm, parking and a hotel, inside a perimeter
   fence. Frame: u east along the runways, v south. */

const S = SITES.airport;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });
const TW = 23;

const R1 = af.runway({ u0: -1700, u1: 1700, v: 300, w: 60, marks: { west: '09R', east: '27L' }, blast: { west: 60, east: 60 }, seed: 1 });
const R2 = af.runway({ u0: -1200, u1: 1400, v: -40, w: 45, marks: { west: '09L', east: '27R' }, blast: { west: 45, east: 60 }, displaced: { east: 120 }, seed: 2 });

// parallel taxiways and the connectors between them
af.taxiway(-1500, 130, 1600, 130, TW);
af.taxiway(-1300, -190, 1450, -190, TW);
const CONN = [-1150, -600, 0, 600, 1250];
const NAMES = ['A', 'B', 'C', 'D', 'E'];
for (const u of CONN) {
  af.taxiway(u, -190, u, 270, TW);
  af.junction(u, 130, TW, TW, { r: 30 });
  af.junction(u, -190, TW, TW, { r: 30, north: false });
  for (const sx of [-1, 1]) {
    af.fillet(u + sx * TW / 2, 270, sx, -1, 30);
    af.fillet(u + sx * TW / 2, -62.5, sx, -1, 30);
    af.fillet(u + sx * TW / 2, -17.5, sx, 1, 30);
  }
}
// angled exits: off 09R and 27L onto the inner taxiway, off 09L and 27R onto the outer one
af.route([[-500, 296], [-212, 130], [38, 130]], TW, { r: 140 });
af.route([[520, 296], [232, 130], [-18, 130]], TW, { r: 140 });
af.route([[-350, -44], [-97, -190], [153, -190]], TW, { r: 140 });
af.route([[900, -44], [647, -190], [397, -190]], TW, { r: 140 });

// aprons: the terminal apron with two taxilanes, cargo, general aviation, fuel
af.apron(-720, -640, 720, -196);
af.apron(850, -470, 1300, -196);
af.apron(-1400, -450, -800, -196);
af.taxiway(-700, -236, 700, -236, TW, 'apron');
af.taxiway(0, -520, 0, -236, 30, 'apron');
af.taxiway(-1380, -236, -820, -236, TW, 'apron');
af.taxiway(870, -236, 1280, -236, TW, 'apron');
af.pad(-1520, -700, -1360, -540, M.CONCRETE);
af.pad(-380, -716, 380, -670, M.CONCRETE);
// landside pavement: two car parks either side of the entrance road, a long-stay lot behind
const LOTS = [[-620, -990, -300, -770], [300, -990, 620, -770], [-270, -1050, -40, -800], [40, -1050, 270, -800]];
for (const [u0, v0, u1, v1] of LOTS) { af.pad(u0, v0, u1, v1, M.ASPHALT_WORN); af.parkingLot(u0 + 3, v0 + 3, u1 - 3, v1 - 3); }
af.pad(-40, -1080, 40, -640, M.ASPHALT_WORN);

// painted letters and holds: taxiway names in yellow on black, holding positions before both runways
CONN.forEach((u, i) => {
  for (const v of [200, 60, -120]) af.markText(NAMES[i], u, v, 0.95, M.TAXI_LINE, { up: 90, bg: M.RUNWAY, pad: 1.2, maxCell: 1.05 });
  af.holdShort(u, 210, 90, TW, '09R-27L');
  af.holdShort(u, 50, -90, TW, '09L-27R');
  af.holdShort(u, -130, 90, TW, '09L-27R');
});
// stand markings: piers, remote row and the ambient airliner's parking spot
const TERM = { u: 0, v: -580, w: 250, d: 36 };
const PIERS = [-110.4, 110.4];
const GATE_Z = [42, 88, 134];
const gateV = GATE_Z.map((z) => TERM.v + z);
const FACES = [
  { pier: 0, faceU: PIERS[0] - 15.4, side: -1, tag: 'A' }, { pier: 0, faceU: PIERS[0] + 15.4, side: 1, tag: 'A' },
  { pier: 1, faceU: PIERS[1] - 15.4, side: -1, tag: 'B' }, { pier: 1, faceU: PIERS[1] + 15.4, side: 1, tag: 'B' },
];
const REMOTE = [-422, -368, -314, -260, 260, 314, 368, 422];
const AMBIENT_STAND = { u: -492.6, v: -341.1, dir: -56.3 };

export default defineRegion({
  id: 'airfield/meridian-international',
  name: S.name,
  kind: 'airfield',
  info: {
    order: 1, label: 'Civil airport', elevation: S.elev,
    blurb: 'Two parallel asphalt runways, twelve jet bridges under a glass terminal, freighters, hangars and the busiest traffic on the island.',
    features: ['Parallel runways 09R/27L and 09L/27R', 'Blue taxiway lights and approach lighting', 'Gates, remote stands, cargo apron and hangars'],
  },
  bounds: af.worldBounds(-2050, -1120, 2050, 500, 60),
  maxHeight: 80,
  tint: M.CONCRETE,
  access: { airport: af.toWorld(0, -1000) },
  runways: af.runwayList(),
  chart: () => af.chart(),
  terrain: () => ({ flatten: [af.flattenRect(-2100, 2100, -1150, 520, 520, S.elev)] }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    af.spawn({ id: 'airport-09R', name: 'Runway 09R threshold', u: -1600, v: 300, dir: 0, kind: 'runway', runway: '09R', group: 'Runway 09R / 27L' }),
    af.spawn({ id: 'airport-27L', name: 'Runway 27L threshold', u: 1600, v: 300, dir: 180, kind: 'runway', runway: '27L', group: 'Runway 09R / 27L' }),
    af.spawn({ id: 'airport-09L', name: 'Runway 09L threshold', u: -1100, v: -40, dir: 0, kind: 'runway', runway: '09L', group: 'Runway 09L / 27R' }),
    af.spawn({ id: 'airport-27R', name: 'Runway 27R threshold', u: 1370, v: -40, dir: 180, kind: 'runway', runway: '27R', group: 'Runway 09L / 27R' }),
    af.spawn({ id: 'airport-hold-09R', name: 'Holding short of 09R, taxiway B', u: -600, v: 190, dir: 90, kind: 'hold', runway: '09R', group: 'Runway 09R / 27L' }),
    af.spawn({ id: 'airport-hold-27R', name: 'Holding short of 27R, taxiway D', u: 600, v: 68, dir: -90, kind: 'hold', runway: '27R', group: 'Runway 09L / 27R' }),
    af.spawn({ id: 'airport-apron', name: 'Terminal apron, remote stand R4', u: -260, v: -300, dir: -90, kind: 'apron', group: 'Terminal and apron' }),
    af.spawn({ id: 'airport-gate', name: 'Gate A5 at the west pier', u: FACES[1].faceU + 25.6, v: gateV[1] - 4, dir: 180, kind: 'gate', group: 'Terminal and apron' }),
    af.spawn({ id: 'airport-cargo', name: 'Cargo apron', u: 1150, v: -300, dir: 90, kind: 'apron', group: 'Cargo and general aviation' }),
    af.spawn({ id: 'airport-ga', name: 'General aviation ramp', u: -1050, v: -262, dir: 90, kind: 'apron', group: 'Cargo and general aviation' }),
    af.spawn({ id: 'airport-hangar', name: 'In front of hangar H1', u: -1340, v: -280, dir: 0, kind: 'hangar', group: 'Cargo and general aviation' }),
  ],
  layout(ctx) {
    const rng = new Rng(11);
    const out = newOut();
    out.lots.push(af.fieldLot(-2050, -1120, 2050, 500));
    const runway = onRunway(af, 6);

    // ---- lighting: runway edges and thresholds, taxiway blue edge and green centerline, approach systems, PAPI
    runwayLights(af, R1, out); runwayLights(af, R2, out);
    for (const rw of [R1, R2]) for (const end of ['west', 'east']) { approachLights(af, rw, end, out); papi(af, rw, end, out, end === 'west' ? -1 : 1); }
    taxiLights(af, out, [[-1500, 130], [1600, 130]], TW, { skip: runway });
    taxiLights(af, out, [[-1300, -190], [1450, -190]], TW, { skip: runway });
    for (const u of CONN) taxiLights(af, out, [[u, -190], [u, 270]], TW, { skip: runway });
    for (const rt of af.routes) taxiLights(af, out, rt.poly, TW, { skip: runway });
    taxiLights(af, out, [[-700, -236], [700, -236]], TW, { edge: false });
    // signs at the connectors: yellow taxiway names, red holding position boards
    CONN.forEach((u, i) => {
      propAt(af, out, 'taxi-sign', u - TW / 2 - 4, -212, 0, { variant: i });
      propAt(af, out, 'taxi-sign', u + TW / 2 + 4, 110, 180, { variant: i });
      for (const [v, dir, variant] of [[210, 180, 0], [50, 0, 1], [-130, 180, 1]]) propAt(af, out, 'hold-sign', u + TW / 2 + 5, v, dir, { variant });
    });
    // the ILS: localizers beyond the far ends, glide slopes beside the touchdown zones
    af.place(ctx, out, 'localizer', 2010, 300, 34, 8, 4, 'left', 71);
    af.place(ctx, out, 'localizer', -2010, 300, 34, 8, 4, 'right', 72);
    af.place(ctx, out, 'localizer', 1720, -40, 34, 8, 4, 'left', 73);
    af.place(ctx, out, 'localizer', -1520, -40, 34, 8, 4, 'right', 74);
    for (const [u, v, f] of [[-1380, 352, 'right'], [1380, 352, 'left'], [-880, 10, 'right'], [1080, 10, 'left']]) af.place(ctx, out, 'glideslope', u, v, 10, 8, 14, f, 75);

    // ---- terminal complex
    af.place(ctx, out, 'terminal', TERM.u, TERM.v, TERM.w, TERM.d, 13, 'right', 21, { name: 'MERIDIAN', sub: 'DEPARTURES', piers: PIERS, gates: GATE_Z, pier: 140 });
    af.place(ctx, out, 'tower', 300, -520, 16, 16, 46, 'right', 22);
    af.place(ctx, out, 'beacon', 350, -470, 4, 4, 17, 'right', 60);
    // gates: airliners in airline colors, a few crews, one gate left free for the start position
    const airline = [TINTS.red, TINTS.blue, TINTS.green, TINTS.teal, TINTS.orange, TINTS.navy, TINTS.maroon, TINTS.yellow, TINTS.gray, TINTS.white];
    let n = 0;
    for (const f of FACES) {
      GATE_Z.forEach((z, k) => {
        const id = `${f.tag}${(f.side < 0 ? 0 : 3) + k + 1}`;
        const free = f.pier === 0 && f.side > 0 && k === 1;
        pierGate(af, ctx, out, { faceU: f.faceU, side: f.side, gz: gateV[k], id, tint: airline[n % airline.length], model: free || (n % 4 === 3) ? null : 'parked-airliner', crew: n % 3, seed: 300 + n });
        n++;
      });
    }
    // remote stands along the second taxilane, each with an airliner or bus and cones
    REMOTE.forEach((u, i) => {
      af.stand({ u, v: -300, dir: -90, id: `R${i + 1}`, lead: 40, span: 36, len: 40 });
      if (i % 2 === 0) parkAt(af, out, { u, v: -300, dir: -90, model: 'parked-airliner', tint: airline[(i + 3) % airline.length], crew: CREWS[i % 3] });
    });
    af.stand({ u: AMBIENT_STAND.u, v: AMBIENT_STAND.v, dir: AMBIENT_STAND.dir, id: 'R0', lead: 44, span: 36, len: 40 });
    floodline(af, out, -680, -224, 680, -224, 12, 0);
    floodline(af, out, -190, -420, 190, -420, 4, 0);
    // crash tenders parked at the fire station, the follow-me car at the apron edge
    af.place(ctx, out, 'firestation', 1000, -110, 44, 22, 8, 'left', 90);
    propAt(af, out, 'gse-crash', 986, -142, -90, {}); propAt(af, out, 'gse-crash', 1014, -142, -90, {});
    propAt(af, out, 'gse-followme', 60, -216, 0, {});

    // ---- cargo: the terminal, freighters on their stands, containers and loaders
    af.place(ctx, out, 'cargo', 1080, -520, 120, 40, 13, 'right', 40, { name: 'MERIDIAN CARGO' });
    for (const [i, u] of [960, 1050].entries()) {
      af.stand({ u, v: -320, dir: -90, id: `C${i + 1}`, lead: 60, span: 60, len: 62 });
      parkAt(af, out, { u, v: -320, dir: -90, model: 'parked-heavy', tint: i ? TINTS.orange : TINTS.navy, len: 22.8, crew: [['gse-belt', -14, 8, -90, TINTS.white], ['gse-tug', -25, 12, 0, TINTS.orange], ['gse-gpu', 26, -5, 0, TINTS.orange], ['gse-fuel', -4, 22, 90, TINTS.white]] });
    }
    for (let i = 0; i < 3; i++) propAt(af, out, 'gse-tug', 900 + i * 60, -456 + (i & 1) * 6, 90, { variant: i & 1, tint: TINTS.orange });
    af.place(ctx, out, 'canopy', 1240, -400, 34, 14, 5, 'right', 41, { post: M.STEEL_BRIGHT });

    // ---- general aviation: hangars in a row, T-hangars, a shop, light aircraft on the ramp
    af.place(ctx, out, 'hangar', -1340, -340, 40, 56, 0, 'right', 30, { label: 'H1', skin: M.CLADDING_GRAY });
    af.place(ctx, out, 'hangar-gable', -1270, -340, 44, 52, 11, 'right', 31, { label: 'H2' });
    af.place(ctx, out, 'hangar-cantilever', -1130, -344, 96, 64, 22, 'right', 32, { label: 'MERIDIAN AERO' });
    af.place(ctx, out, 'hangar-t', -940, -420, 76, 14, 5, 'right', 33, undefined, { n: 6 });
    af.place(ctx, out, 'hangar-t', -940, -388, 76, 14, 5, 'right', 34, undefined, { n: 6 });
    af.place(ctx, out, 'lowrise', -1030, -300, 40, 16, 8, 'right', 35);
    [[-1350, -250, 0.3], [-1310, -250, 0], [-1030, -240, 0]].forEach(([u, v, d], i) => propAt(af, out, i === 2 ? 'parked-bizjet' : 'parked-skylark', u, v, 90 + d * 57.3, { tint: TINTS.white }));
    for (let i = 0; i < 8; i++) propAt(af, out, 'parked-skylark', -1120 + i * 20, -226, 90 + (i % 2) * 8, {});
    propAt(af, out, 'parked-heli', -900, -266, 30, { variant: 1 });
    propAt(af, out, 'parked-heli', -850, -262, 120, {});
    // fuel farm and its loading gantry
    af.place(ctx, out, 'fuelfarm', -1450, -640, 74, 54, 13, 'right', 50);
    af.place(ctx, out, 'warehouse', -1300, -600, 44, 32, 10, 'right', 51);
    // ---- landside: garages, hotel, lots with cars, roads and lamps
    af.place(ctx, out, 'garage', -170, -730, 90, 60, 26, 'right', 61);
    af.place(ctx, out, 'garage', 170, -730, 90, 60, 26, 'left', 62);
    af.place(ctx, out, 'hotel', 430, -760, 50, 40, 64, 'right', 63, { fac: 'FAC_RIBBON_WHITE' });
    af.place(ctx, out, 'midrise', -420, -700, 34, 20, 28, 'right', 64, { wall: M.CONCRETE_PANEL });
    af.place(ctx, out, 'gatehouse', 0, -1096, 18, 12, 6, 'right', 65);
    af.place(ctx, out, 'signboard', -60, -1110, 16, 1, 3.6, 'left', 66, { text: 'AIRPORT', plate: M.SIGN_GREEN, base: 2.6 });
    af.place(ctx, out, 'signboard', 60, -1110, 22, 1, 3.6, 'left', 67, { text: 'MERIDIAN', plate: M.SIGN_GREEN, base: 2.6 });
    const cars = [0xff2a2a2a, 0xffe6e6e6, 0xffa8763a, 0xff2b2bb4, 0xffb0b0b0, 0xff2aa0d8, 0xff3a3a90, 0xff40a060];
    for (const lot of af.lots) {
      const pitch = 2 * lot.depth + lot.aisle;
      for (let p = 0; p * pitch + 2 * lot.depth < lot.u1 - lot.u0; p++) {
        for (const blk of [0, 1]) for (let j = 0; (j + 1) * lot.stall < lot.v1 - lot.v0 - 1; j++) {
          if (!rng.chance(0.52)) continue;
          const u = lot.u0 + p * pitch + lot.depth * (blk + 0.5), v = lot.v0 + (j + 0.5) * lot.stall;
          af.prop(out, 'lot-car', u, v, { variant: rng.int(0, 3), tint: cars[rng.int(0, cars.length - 1)], yaw: af.propYawAt(rng.chance(0.5) ? 0 : 180) });
        }
      }
    }
    for (let v = -1040; v <= -660; v += 46) for (const u of [-46, 46]) propAt(af, out, 'street-lamp', u, v, u < 0 ? 0 : 180, {});
    af.road(out, -900, -1010, 900, -1010, 'road');
    af.road(out, 0, -1010, 0, -660, 'road');
    af.road(out, -300, -660, 300, -660, 'road');
    af.road(out, -620, -1010, -620, -720, 'service'); af.road(out, 620, -1010, 620, -720, 'service');
    // shuttle stops, benches and trees along the frontage
    for (const u of [-90, 90]) { propAt(af, out, 'busstop', u, -655, 90, {}); propAt(af, out, 'bench', u + 6, -650, 90, {}); }
    for (let u = -560; u <= 560; u += 40) if (Math.abs(u) > 60) propAt(af, out, 'street-tree', u, -742, 0, { scale: rng.range(0.8, 1.2) });
    // windsocks, and the perimeter fence with its gate on the entrance road
    for (const [u, v] of [[-1620, 385], [1620, 385], [-1150, -110], [1250, -110], [0, 460]]) af.place(ctx, out, 'windsock', u, v, 2, 2, 7, 'right', 70);
    fenceRect(ctx, af, -1820, -1090, 1820, 440, out, 5, { u: 0, v: -1090, w: 30 });
    return out;
  },
});
