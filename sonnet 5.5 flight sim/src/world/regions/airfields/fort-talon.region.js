import { defineRegion } from '../../region.js';
import { SITES } from '../../layout.js';
import { M } from '../../../voxel/palette.js';
import { Airfield, runwayLights, fenceRect } from '../_shared/airfield.js';
import { approachLights, papi, taxiLights, onRunway, floodline, propAt, parkAt } from '../_shared/aids.js';
import { newOut } from '../_shared/zoning.js';
import { Rng } from '../../../core/rng.js';

/* Fort Talon Air Base: one long concrete runway on a graded plateau with chevron overruns and arresting cables, parallel taxiways with
   fillets and angled exits, a loop of hardened aircraft shelters with parked fighters, an alert pad, a flight line of stands, big
   arched hangars, tower, radar, comms mast, fuel farm, ammunition bunkers, barracks and headquarters, a helipad, a motor pool, SAM
   sites, watchtowers, a guarded main gate with a gate guardian and a perimeter fence. Heading 070. */

const S = SITES.fortTalon;
const af = new Airfield({ cx: S.x, cz: S.z, heading: S.heading });
const TW = 20;

const RW = af.runway({ u0: -1650, u1: 1650, v: 0, w: 46, marks: { west: '07', east: '25' }, pave: 'concrete', blast: { west: 120, east: 120 }, seed: 3 });
af.taxiway(-1600, -110, 1600, -110, TW);
af.taxiway(-1600, 150, 1600, 150, TW);
const CONN = [-1300, -650, 0, 650, 1300];
for (const u of CONN) {
  af.taxiway(u, -110, u, -18, TW); af.taxiway(u, 18, u, 150, TW);
  af.junction(u, -110, TW, TW, { r: 25, north: false });
  af.junction(u, 150, TW, TW, { r: 25, south: false });
  for (const sx of [-1, 1]) { af.fillet(u + sx * TW / 2, -23, sx, -1, 25); af.fillet(u + sx * TW / 2, 23, sx, 1, 25); }
}
const SHELTER_U = Array.from({ length: 8 }, (_, i) => -1200 + i * 78);
for (const u of SHELTER_U) {
  af.taxiway(u, 150, u, 238, 14);
  af.apron(u - 11, 232, u + 11, 252);
  af.hazard(u - 10, 250, u + 10, 253.4, 1.8);
  for (const sx of [-1, 1]) af.fillet(u + sx * 7, 160, sx, 1, 12);
}
// angled exits, and taxi spurs from the alert pad to the runway
af.route([[-800, -4], [-603, -110], [-353, -110]], TW, { r: 120 });
af.route([[800, -4], [603, -110], [353, -110]], TW, { r: 120 });
af.route([[-400, 4], [-147, 150], [103, 150]], TW, { r: 120 });
af.route([[500, 4], [247, 150], [-3, 150]], TW, { r: 120 });
af.apron(-1520, 38, -1350, 112);
for (const u of [-1490, -1400]) af.route([[u, 60], [u, 26]], 14, { r: 10 });
af.hazard(-1520, 34, -1350, 38, 2);
// arresting cables 300 m in from each end: a thin line across the runway with marker plates at the edges
for (const u of [-1350, 1350]) { af.markRect(u - 0.25, -23, u + 0.25, 23, M.STEEL_DARK, 0.62); for (const s of [-1, 1]) af.markRect(u - 1, s * 23 - (s > 0 ? 0 : 1.2), u + 1, s * 23 + (s > 0 ? 1.2 : 0), M.TAXI_LINE, 1.05); }
// flight line: a big ramp with a row of stands for fighters, hangar pad behind, dispersal for the barracks side
af.apron(-500, -345, 500, -112);
af.pad(-660, -520, 660, -345, M.CONCRETE_DARK);
af.pad(520, -520, 640, -430, M.CONCRETE);
af.taxiway(-490, -140, 490, -140, TW, 'apron');
const RAMP_U = Array.from({ length: 16 }, (_, i) => -480 + i * 64);
RAMP_U.forEach((u, i) => af.stand({ u, v: -185, dir: 90, id: String(i + 1), lead: 30, span: 12, len: 16, box: true }));
af.helipad(420, -470, 14, { mat: M.CONCRETE_DARK, paint: M.TAXI_LINE });
af.pad(-1090, -672, -520, -556, M.CONCRETE_DARK);
af.pad(-1100, -716, -900, -672, M.ASPHALT_WORN);
af.pad(-390, -724, -250, -664, M.ASPHALT_WORN);
af.parkingLot(-386, -720, -254, -668, { stall: 3.0, depth: 5.0, aisle: 7 });
// taxiway letters and holds
CONN.forEach((u, i) => {
  af.markText('ABCDE'[i], u, -70, 0.9, M.TAXI_LINE, { up: 90, bg: M.RUNWAY, pad: 1.2 });
  af.markText('ABCDE'[i], u, 70, 0.9, M.TAXI_LINE, { up: -90, bg: M.RUNWAY, pad: 1.2 });
  af.holdShort(u, -84, 90, TW, '07-25');
  af.holdShort(u, 84, -90, TW, '07-25');
});

export default defineRegion({
  id: 'airfield/fort-talon',
  name: S.name,
  kind: 'airfield',
  info: {
    order: 2, label: 'Military air base', elevation: S.elev,
    blurb: 'A long concrete runway with arresting cables, hardened shelters, hangars and a fuel farm. Nobody asks what you are doing here.',
    features: ['Concrete runway 07/25, overrun chevrons', 'Hardened shelters, alert pad and a flight line', 'Radar, SAM sites and a guarded main gate'],
  },
  bounds: af.worldBounds(-1950, -940, 1950, 420, 60),
  maxHeight: 70,
  tint: M.CONCRETE_DARK,
  access: { fortTalon: af.toWorld(-300, -900) },
  runways: af.runwayList(),
  chart: () => af.chart(),
  terrain: () => ({ flatten: [af.flattenRect(-2000, 2000, -960, 480, 800, S.elev)] }),
  paint: (x, z, cell) => af.paint(x, z, cell),
  spawns: [
    af.spawn({ id: 'talon-07', name: 'Runway 07 threshold', u: -1550, v: 0, dir: 0, kind: 'runway', runway: '07', group: 'Runway 07 / 25' }),
    af.spawn({ id: 'talon-25', name: 'Runway 25 threshold', u: 1550, v: 0, dir: 180, kind: 'runway', runway: '25', group: 'Runway 07 / 25' }),
    af.spawn({ id: 'talon-hold', name: 'Holding short of 07/25, taxiway C', u: 0, v: -66, dir: 90, kind: 'hold', runway: '07', group: 'Runway 07 / 25' }),
    af.spawn({ id: 'talon-apron', name: 'Ramp, stand 7', u: RAMP_U[6], v: -185, dir: 90, kind: 'apron', group: 'Flight line and hangars' }),
    af.spawn({ id: 'talon-hangar', name: 'In front of hangar 2', u: 0, v: -362, dir: 90, kind: 'hangar', group: 'Flight line and hangars' }),
    af.spawn({ id: 'talon-shelters', name: 'Shelter row', u: SHELTER_U[6], v: 205, dir: -90, kind: 'apron', group: 'Shelters and alert pad' }),
    af.spawn({ id: 'talon-alert', name: 'Alert pad', u: -1445, v: 70, dir: -90, kind: 'apron', group: 'Shelters and alert pad' }),
  ],
  layout(ctx) {
    const rng = new Rng(17);
    const out = newOut();
    out.lots.push(af.fieldLot(-1950, -940, 1950, 420));
    const runway = onRunway(af, 6);

    // ---- lighting and aids
    runwayLights(af, RW, out);
    for (const end of ['west', 'east']) { approachLights(af, RW, end, out, 720); papi(af, RW, end, out, end === 'west' ? -1 : 1); }
    taxiLights(af, out, [[-1600, -110], [1600, -110]], TW, { skip: runway });
    taxiLights(af, out, [[-1600, 150], [1600, 150]], TW, { skip: runway });
    for (const u of CONN) { taxiLights(af, out, [[u, -110], [u, -18]], TW, { skip: runway }); taxiLights(af, out, [[u, 18], [u, 150]], TW, { skip: runway }); }
    for (const rt of af.routes) taxiLights(af, out, rt.poly, rt.w, { skip: runway });
    CONN.forEach((u, i) => { propAt(af, out, 'taxi-sign', u + TW / 2 + 4, -96, 180, { variant: i }); propAt(af, out, 'hold-sign', u - TW / 2 - 5, -84, 180, { variant: 2 }); propAt(af, out, 'hold-sign', u - TW / 2 - 5, 84, 0, { variant: 2 }); });
    af.place(ctx, out, 'localizer', 1990, 0, 34, 8, 4, 'left', 171);
    af.place(ctx, out, 'localizer', -1990, 0, 34, 8, 4, 'right', 172);
    af.place(ctx, out, 'glideslope', -1350, 60, 10, 8, 14, 'right', 173);
    af.place(ctx, out, 'glideslope', 1350, 60, 10, 8, 14, 'left', 174);
    floodline(af, out, -480, -118, 480, -118, 9, 0);
    floodline(af, out, -1500, 118, -1360, 118, 3, 1);
    for (const u of SHELTER_U) propAt(af, out, 'floodlight', u + 30, 246, 0, { variant: 1 });

    // ---- hardened shelters, each with the door toward the runway; fighters at the doors, armed on the alert pad
    SHELTER_U.forEach((u, i) => {
      af.place(ctx, out, 'shelter', u, 262, 17, 26, 8, 'left', 100 + i);
      if (i % 2 === 0 && i !== 6) parkAt(af, out, { u, v: 224, dir: -90, model: 'parked-shrike', variant: i % 4 === 0 ? 1 : 0, len: 4.3, crew: [['mil-tug', -9, 5, 180]] });
    });
    for (const u of [-1490, -1400]) {
      af.place(ctx, out, 'shelter', u, 104, 17, 26, 8, 'left', 130 + (u > -1450 ? 1 : 0));
      parkAt(af, out, { u, v: 62, dir: -90, model: 'parked-shrike', variant: 1, len: 4.3, crew: [['mil-loader', -4, 7, 90], ['mil-jeep', -9, -8, 40]] });
    }
    af.place(ctx, out, 'canopy', -1300, 56, 30, 12, 5, 'left', 132, { roof: M.MIL_CAMO_DARK, post: M.MIL_GRAY, wallMat: M.MIL_OLIVE });
    propAt(af, out, 'mil-truck', -1310, 60, -90, {}); propAt(af, out, 'mil-fuel', -1290, 58, -90, {});

    // ---- flight line: fighters on the stands, ground crew machines, three big hangars, a maintenance depot
    RAMP_U.forEach((u, i) => {
      if (i % 3 === 1) return;
      parkAt(af, out, { u, v: -185, dir: 90, model: 'parked-shrike', variant: i % 3 === 0 ? 1 : 0, len: 4.3, crew: i % 4 === 0 ? [['gse-gpu', -1, 6, 0, 0xff4a5a3a], ['mil-tug', 12, -8, 90]] : i % 5 === 0 ? [['mil-loader', 2, -7, -90], ['traffic-cone', 9, -3, 0], ['traffic-cone', 9, 3, 0]] : [] });
    });
    propAt(af, out, 'mil-fuel', -180, -240, 0, {}); propAt(af, out, 'mil-fuel', -140, -240, 0, {}); propAt(af, out, 'mil-truck', 280, -250, 180, {});
    propAt(af, out, 'mil-jeep', 40, -230, 30, {}); propAt(af, out, 'mil-jeep', 60, -226, -30, {}); propAt(af, out, 'mil-tug', -300, -250, 0, {});
    for (let i = 0; i < 3; i++) af.place(ctx, out, 'hangar', -230 + i * 230, -420, 46, 66, 0, 'right', 110 + i, { skin: M.CLADDING_GRAY, inner: M.CONCRETE_PANEL, mil: true, label: `HANGAR ${i + 1}`, stripe: M.MIL_TAN });
    af.place(ctx, out, 'hangar-gable', -540, -430, 44, 52, 11, 'right', 113, { label: 'DEPOT', wall: M.FAC_CORR_TAN });
    af.place(ctx, out, 'hangar-cantilever', 600, -445, 96, 64, 22, 'right', 114, { label: 'FORT TALON' });
    parkAt(af, out, { u: -230, v: -388, dir: 90, model: 'parked-shrike', variant: 1, len: 4.3, crew: [['mil-tug', 12, 0, 180]] });
    af.place(ctx, out, 'tower', -110, -520, 16, 16, 40, 'right', 120, { mil: true });
    af.place(ctx, out, 'hq', -330, -640, 44, 18, 8, 'right', 121);
    af.place(ctx, out, 'lowrise', 190, -600, 34, 18, 9, 'right', 122, { wall: M.MIL_TAN });
    af.place(ctx, out, 'firestation', -820, -200, 40, 20, 8, 'right', 123);
    propAt(af, out, 'gse-crash', -840, -166, 90, {}); propAt(af, out, 'gse-crash', -808, -166, 90, {});
    // helipad with two helicopters and a windsock
    propAt(af, out, 'parked-heli', 410, -470, 200, { variant: 2 }); propAt(af, out, 'parked-heli', 445, -466, 160, { variant: 2 });
    af.place(ctx, out, 'windsock', 470, -440, 2, 2, 7, 'right', 124);

    // ---- base: barracks, mess, motor pool with trucks, fuel farm, radar and comms, ammunition bunkers, water
    for (let i = 0; i < 6; i++) af.place(ctx, out, 'barracks', -1000 + (i % 3) * 210, -590 - Math.floor(i / 3) * 42, 46, 12, 7, 'right', 130 + i);
    af.place(ctx, out, 'lowrise', -760, -620, 40, 18, 8, 'right', 138, { wall: M.MIL_TAN });
    for (let i = 0; i < 2; i++) af.place(ctx, out, 'canopy', -1040 + i * 40, -690, 36, 14, 4.6, 'right', 140 + i, { roof: M.MIL_CAMO_DARK, post: M.MIL_GRAY, wall: false });
    for (let i = 0; i < 9; i++) propAt(af, out, i % 3 === 0 ? 'mil-truck' : i % 3 === 1 ? 'mil-jeep' : 'mil-fuel', -1090 + (i % 5) * 40, -706 + (i >= 5 ? 14 : 0) * 0, 90, {});
    for (let i = 0; i < 4; i++) propAt(af, out, 'mil-jeep', -372 + i * 30, -694 + (i & 1) * 0, 90 + (i & 1) * 180, {});
    af.place(ctx, out, 'fuelfarm', 760, -640, 74, 54, 13, 'right', 141, { mat: M.TANK_GRAY });
    af.place(ctx, out, 'radar', 900, -420, 12, 12, 0, 'right', 150);
    af.place(ctx, out, 'radar', -1140, -760, 12, 12, 0, 'right', 151);
    af.place(ctx, out, 'commsmast', 1100, -700, 12, 12, 46, 'right', 153);
    af.place(ctx, out, 'warehouse', 400, -690, 60, 30, 9, 'right', 154, { wall: M.CLADDING_SAND });
    af.place(ctx, out, 'watertower', 120, -720, 12, 12, 30, 'right', 152);
    for (let i = 0; i < 8; i++) af.place(ctx, out, 'bunker', -960 + (i % 4) * 48, -790 - Math.floor(i / 4) * 30, 12, 22, 5, 'right', 160 + i);
    fenceRect(ctx, af, -1020, -840, -520, -730, out, 9);
    for (const [u, v] of [[1750, 240], [1750, -260], [-1770, 200], [-1770, -240]]) af.place(ctx, out, 'sam', u, v, 20, 20, 5, 'left', 160);
    for (const [u, v] of [[-1620, 90], [1620, 90]]) af.place(ctx, out, 'windsock', u, v, 2, 2, 7, 'right', 170);
    for (const [u, v] of [[-1880, -880], [1880, -880], [-1880, 440], [1880, 440], [0, -880], [0, 440], [-1880, -220], [1880, -220]]) af.place(ctx, out, 'watchtower', u, v, 6, 6, 10, 'right', 180 + (u > 0 ? 1 : 0));
    af.place(ctx, out, 'watchtower', -1300, 300, 6, 6, 10, 'right', 190);
    af.place(ctx, out, 'watchtower', 1300, 300, 6, 6, 10, 'right', 191);

    // ---- the main gate: portal, striped arms, the name of the base, a gate guardian on a plinth
    af.place(ctx, out, 'guardpost', -300, -896, 30, 14, 9, 'left', 200, { text: 'FORT TALON' });
    af.place(ctx, out, 'signboard', -250, -930, 20, 1, 3.4, 'left', 201, { text: 'AIR BASE', plate: M.MIL_OLIVE, ink: M.PAINT_WHITE, base: 2 });
    af.place(ctx, out, 'plinth', -380, -850, 12, 12, 6.5, 'right', 202);
    const [gx, gz] = af.toWorld(-380, -850);
    out.props.push({ type: 'parked-shrike', x: gx, z: gz, y: ctx.heightAt(gx, gz) + 6.85 + 0.0, yaw: af.propYawAt(-20), scale: 1, variant: 0 });
    af.place(ctx, out, 'flagpole', -330, -840, 2, 2, 15, 'right', 203);
    af.place(ctx, out, 'flagpole', -320, -840, 2, 2, 15, 'right', 204, { flag: [M.MIL_OLIVE, M.PAINT_YELLOW, M.MIL_OLIVE] });
    // roads inside the wire, motor pool and gate
    af.road(out, -300, -900, -300, -560, 'road');
    af.road(out, -500, -760, 700, -760, 'road');
    af.road(out, -300, -560, -300, -350, 'service');
    af.road(out, 700, -760, 700, -420, 'service');
    fenceRect(ctx, af, -1900, -900, 1900, 460, out, 7, { u: -300, v: -900, w: 34 });
    return out;
  },
});
