import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle, ringYZ } from '../builders/parts.js';
import { decal, pilot, prop, spinner, store, navLights } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Doublewide DW-2: a manufactured home with a wing on the roof, four car engines and two telephone poles for a tail. The pilot
   drives from a recliner in the front room through the picture window, wheel on a TV tray, shifter for a throttle. Behind him the
   rest of the house is all there: couch, TV, kitchen, a bed made up in the back. It weighs four tons and cruises at 80 knots.
   Body origin at the center of gravity, +x forward. */

const SIDE = M.SIDING_GREEN, TRIM = M.PAINT_WHITE, SKIRT = M.SIDING_GRAY, ROOF = M.STEEL, RUST = M.RUST, DARK = M.STEEL_DARK, GLASS = M.GLASS_DARK, WOODM = M.WOOD_MID, WOODD = M.WOOD_DARK, WOODL = M.WOOD_LIGHT;
const FL = -0.84;                                     // top of the carpet
const WX_L = [3.6, 2.1, 0.6, -0.9, -2.4], WX_R = [3.6, 2.1, -0.9, -2.4];      // windows; the door is on the right at x = 0.6
const WY0 = 0.3, WY1 = 1.1, WH = 0.45;

const WING = (s) => wingDef([1.8, 2.3, s * 0.25], 9.1, 3.0, 2.6, 0.2, 0.25, 0.08, 0.07, s);
const ST = (s) => wingDef([-7.9, 1.2, s * 0.1], 2.9, 1.7, 1.3, 0.1, 0.0, 0.08, 0.08, s);
const FIN = { x: -7.3, y: 1.2, chord: 1.6, tip: 1.3, height: 3.2, sweep: 0.2, thick: 0.06 };
const ENGINES = [[-6.3, 0], [-2.6, 0], [2.6, 0], [6.3, 0]].map(([z]) => z);

export default defineAircraft({
  id: 'doublewide',
  name: 'Doublewide DW-2',
  manufacturer: "Big Lou's Manufactured Homes",
  role: 'Flying mobile home',
  category: 'homebuilt',
  order: 12,
  difficulty: 4,
  tags: ['Four engines', 'Full interior', 'Moonshine bombs', 'Heavy'],
  description: 'A three-bedroom trailer, a wing from a billboard, four car engines and a driver in a recliner. Slow, heavy and impossible to stop looking at. Everything inside works: the couch is there, the TV is on and there is a pot of coffee on the stove. Drop moonshine on your enemies from the porch.',
  voxel: 0.0625,
  interiorVoxel: 0.025,
  lodLevels: 4,
  mass: { empty: 3200, fuel: 280, payload: 500 },
  inertia: [9500, 42000, 36000],
  wing: { area: 58, span: 18.8, chord: 3.0, y: 2.3 },
  aero: {
    CL0: 0.35, CLa: 4.8, CLmax: 1.75, alphaStall: 0.3, CD0: 0.048, k: 0.05, CDflap: 0.07, CLflap: 0.6, Cmflap: -0.12, CLmaxFlap: 0.55, CDgear: 0.04, CDair: 0.2,
    Cm0: 0.05, Cma: -0.95, Cmq: -17, Clb: 0.1, Clp: -0.6, Cnb: 0.12, Cnr: -0.2, Cyb: 0.5, Cnda: 0.02, spin: 0.05, stallPitchDown: 0.08,
    control: { elevator: 0.55, aileron: 0.075, rudder: 0.045 },
  },
  propulsion: { type: 'prop', power: 640000, efficiency: 0.72, propDiameter: 3.6, maxRpm: 2400, idleRpm: 700, fuelBurn: 0.05, staticFactor: 0.6, spin: 0.05 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [5.8, -1.15, 0], radius: 0.14, k: 40000, c: 4000, steer: 0.6, cornering: 0.8, travel: 0.25 },
      { pos: [-1.4, -1.0, -1.2], radius: 0.38, k: 120000, c: 9000, brake: true, travel: 0.2 },
      { pos: [-1.4, -1.0, 1.2], radius: 0.38, k: 120000, c: 9000, brake: true, travel: 0.2 },
    ],
  },
  skids: [
    { p: [6.7, -0.85, 0], kind: 'nose' }, { p: [-8.6, 1.2, 0], kind: 'tail' }, { p: [0.4, 2.3, 9.4], kind: 'tip' }, { p: [0.4, 2.3, -9.4], kind: 'tip' },
    { p: [0.0, -1.05, 0], kind: 'belly' }, { p: [-8.0, 4.4, 0], kind: 'tail' }, { p: [-3.0, -0.9, 0], kind: 'belly' }, { p: [4.9, -0.9, 0], kind: 'belly' },
  ],
  limits: { vne: 75, maxG: 2.8, minG: 0.5, flapSpeed: 38, gearSpeed: 999, crashVs: 5 },
  cameras: { cockpit: [3.7, 0.43, 0], chase: { distance: 32, height: 7 }, near: { distance: 15, height: 3.5 } },
  liveries: [
    { id: 'default', name: 'Avocado' },
    { id: 'harvest', name: 'Harvest gold', remap: { SIDING_GREEN: 'PAINT_YELLOW' } },
    { id: 'tan', name: 'Desert tan', remap: { SIDING_GREEN: 'AC_CREAM', PAINT_WHITE: 'PAINT_BLUEGRAY' } },
    { id: 'sky', name: 'Sky blue', remap: { SIDING_GREEN: 'SIDING_BLUE' } },
  ],
  stations: [
    { id: 'jugL1', pos: [1.0, 1.85, -3.4], kind: 'rack' }, { id: 'jugL2', pos: [1.0, 1.85, -4.4], kind: 'rack' },
    { id: 'jugR1', pos: [1.0, 1.85, 3.4], kind: 'rack' }, { id: 'jugR2', pos: [1.0, 1.85, 4.4], kind: 'rack' },
    { id: 'propL', pos: [0.4, 1.9, -6.0], kind: 'rack' }, { id: 'propR', pos: [0.4, 1.9, 6.0], kind: 'rack' },
  ],
  weapons: [
    { id: 'spud', name: 'Twin PVC potato cannons', type: 'gun', munition: 'spud', ammo: 60, rate: 3.4, muzzle: [5.4, 2.0, 0.35], spread: 0.018, flash: 0.5 },
    { id: 'jugs', name: 'Moonshine jugs', type: 'bomb', munition: 'jug', stations: ['jugL1', 'jugL2', 'jugR1', 'jugR2'] },
    { id: 'propane', name: 'Propane tank', type: 'bomb', munition: 'propane', stations: ['propL', 'propR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.4 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.4 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    ...[1, 2, 3, 4].map((i) => ({ part: 'propeller' + i, type: 'rotate', axis: [1, 0, 0], channel: 'propAngle', gain: i % 2 ? 1 : -1 })),
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'steeringWheel', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 2.2 },
    { part: 'steeringWheel', type: 'translate', axis: [1, 0, 0], channel: 'elevator', gain: -0.12 },
    { part: 'shifter', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.8, offset: 0.4 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0306, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.00115, offset: -2.3 },
  ],
  model(k) {
    const body = k.part('body');
    const FINE = { md: 0.1 };
    // ------------------------------------------------------------------ the home: floor, four walls, a ceiling, a low gable roof, a skirt
    body.box(-4.0, -1.0, -1.4, 5.0, -0.88, 1.4, M.WOOD_WEATHERED);                                        // floor
    body.box(-4.0, -0.88, -1.4, 5.0, 1.46, -1.3, SIDE);                                                     // left wall
    body.box(-4.0, -0.88, 1.3, 5.0, 1.46, 1.4, SIDE);                                                       // right wall
    body.box(4.9, -0.88, -1.4, 5.0, 1.46, 1.4, SIDE);                                                       // front wall
    body.box(-4.0, -0.88, -1.4, -3.9, 1.46, 1.4, SIDE);                                                     // rear wall
    body.box(-4.0, 1.4, -1.4, 5.0, 1.5, 1.4, TRIM);                                                         // ceiling
    body.gable(-4.15, -1.55, 5.15, 1.55, 1.5, 0.3, 'x', ROOF);                                              // the roof, overhanging
    body.paint(-4.2, 1.4, -1.6, 5.2, 1.9, 1.6, (x, y, z) => ((Math.floor(z * 7) % 5 === 0 && y > 1.52) ? M.AC_GRAY_LIGHT : Math.abs(Math.sin(x * 2.3 + z * 5)) > 0.97 ? RUST : 0), { thin: true, md: 0.2 });
    // the skirt, siding lines, corner trim, rust under the windows
    body.paint(-4.1, -1.05, -1.5, 5.1, 1.5, 1.5, (x, y, z) => {
      const outer = Math.abs(z) > 1.34 || x > 4.95 || x < -3.95;
      if (!outer) return 0;
      if (y < -0.45) return Math.abs(y + 0.45 + 0.01) < 0.012 ? TRIM : SKIRT;
      if (Math.abs(x - 5.0) < 0.1 && Math.abs(z) > 1.2) return TRIM;
      if (Math.abs(((y + 1) % 0.12) - 0.06) < 0.012) return M.SIDING_WHITE;
      if (Math.abs(z) > 1.34 && (Math.floor(x * 3.1) % 6 === 0) && y < 0.3 && y > -0.3) return RUST;
      return 0;
    }, { thin: true, md: 0.1 });
    // the picture window in front and a window in the back, side windows, the door on the right
    body.carve(4.85, 0.35, -1.0, 5.05, 1.3, 1.0, FINE);
    body.carve(-4.05, 0.4, -0.45, -3.85, 1.1, 0.45, FINE);
    for (const x of WX_L) body.carve(x - WH, WY0, -1.45, x + WH, WY1, -1.25, FINE);
    for (const x of WX_R) body.carve(x - WH, WY0, 1.25, x + WH, WY1, 1.45, FINE);
    for (const x of WX_L) body.paint(x - WH - 0.08, WY0 - 0.08, -1.45, x + WH + 0.08, WY1 + 0.08, -1.25, (px, py) => (px < x - WH + 0.01 || px > x + WH - 0.01 || py < WY0 + 0.01 || py > WY1 - 0.01 ? TRIM : 0), { thin: true, md: 0.1 });
    for (const x of WX_R) body.paint(x - WH - 0.08, WY0 - 0.08, 1.25, x + WH + 0.08, WY1 + 0.08, 1.45, (px, py) => (px < x - WH + 0.01 || px > x + WH - 0.01 || py < WY0 + 0.01 || py > WY1 - 0.01 ? TRIM : 0), { thin: true, md: 0.1 });
    body.paint(0.1, -0.9, 1.3, 1.1, 1.3, 1.45, (x, y) => (Math.abs(x - 0.6) < 0.5 && y < 1.25 ? (Math.abs(Math.abs(x - 0.6) - 0.5) < 0.04 || y > 1.2 ? TRIM : Math.abs(x - 0.9) < 0.04 && Math.abs(y) < 0.04 ? M.STEEL_BRIGHT : y < 0.4 ? WOODL : M.AC_GRAY_LIGHT) : 0), { thin: true, md: 0.1 });
    decal(body, 'DOUBLEWIDE', { x: -1.5, y: -0.05, side: -1, px: 0.07, mat: M.AC_RED, z0: 1.34, z1: 1.5 });
    decal(body, 'BIG LOU', { x: -1.5, y: -0.05, side: 1, px: 0.07, mat: M.AC_RED, z0: 1.34, z1: 1.5 });
    // ------------------------------------------------------------------ the trailer hitch with a jack stand, steps, a rear porch with a rail, a lawn chair, a stovepipe, a dish
    for (const s of [-1, 1]) strut(body, [5.0, -0.9, s * 0.9], [6.5, -0.85, 0.0], 0.14, DARK);              // the A frame tongue
    strut(body, [6.5, -0.85, 0], [6.7, -0.85, 0], 0.2, DARK);
    body.cyl('y', 6.7, 0, 0.1, 0.1, -0.8, -0.5, M.STEEL_BRIGHT, { md: 0.1 });                               // coupler ball
    body.box(5.2, -1.0, -0.5, 5.6, -0.6, 0.5, WOODD, { md: 0.1 });                                          // a stack of pallets
    body.box(-5.6, -1.0, -1.3, -3.9, -0.9, 1.3, WOODL);                                                      // porch deck
    for (const s of [-1, 1]) {
      body.box(-5.6, -0.9, s * 1.3 - 0.05, -5.5, 0.2, s * 1.3 + 0.05, WOODL);
      body.box(-5.6, 0.1, s * 1.3 - 0.05, -3.9, 0.2, s * 1.3 + 0.05, WOODL, { md: 0.1 });
      body.box(-5.6, -0.9, s * 0.4 - 0.05, -5.5, 0.2, s * 0.4 + 0.05, WOODL, { md: 0.1 });
    }
    body.box(-5.6, 0.1, -1.3, -5.5, 0.2, 1.3, WOODL, { md: 0.1 });
    for (const [x, z] of [[0.6, 1.9], [0.2, 1.9]]) body.box(x - 0.2, -1.0, z - 0.2, x + 0.2, -0.6, z + 0.2, M.CONCRETE, { md: 0.1 });   // cinder block steps
    body.box(0.0, -1.0, 1.4, 1.2, -0.7, 1.6, M.CONCRETE, { md: 0.1 });
    // a lawn chair with webbing, a pink flamingo, a satellite dish and an antenna on the roof, a stovepipe
    body.box(-5.2, -0.9, -0.3, -4.8, -0.8, 0.3, M.AC_METAL, { md: 0.08 }); body.box(-5.2, -0.8, -0.3, -5.1, -0.2, 0.3, M.AC_METAL, { md: 0.08 });
    for (let i = 0; i < 5; i++) body.box(-5.19, -0.78 + i * 0.1, -0.28, -5.12, -0.72 + i * 0.1, 0.28, i % 2 ? M.PAINT_GREEN : M.PAINT_WHITE, { md: 0.06 });
    strut(body, [-4.5, -0.9, -0.9], [-4.5, -0.3, -0.9], 0.05, M.PATCH_D, { md: 0.08 });
    body.ell(-4.5, -0.22, -0.9, 0.12, 0.12, 0.09, M.PATCH_D, { md: 0.08 });
    strut(body, [-4.6, -0.2, -0.9], [-4.5, -0.15, -0.9], 0.03, M.AC_ORANGE, { md: 0.08 });
    body.ell(2.2, 2.0, 0.6, 0.06, 0.45, 0.45, M.AC_GRAY_LIGHT, { md: 0.1 });                               // dish
    body.ell(2.28, 2.0, 0.6, 0.06, 0.4, 0.4, 0, { md: 0.1 });
    strut(body, [2.1, 1.7, 0.6], [2.25, 2.0, 0.6], 0.04, DARK, { md: 0.1 });
    strut(body, [-1.5, 1.8, -0.4], [-1.5, 2.8, -0.4], 0.04, M.AC_METAL, { md: 0.1 });                       // antenna
    for (let i = 0; i < 4; i++) body.box(-1.52, 2.2 + i * 0.17, -0.4 - 0.45 + i * 0.05, -1.48, 2.22 + i * 0.17, -0.4 + 0.45 - i * 0.05, M.AC_METAL, { md: 0.06 });
    body.cyl('y', -3.0, 0.6, 0.12, 0.1, 1.7, 2.7, M.RUST_DARK, { md: 0.1 });                               // the stovepipe
    body.cyl('y', -3.0, 0.6, 0.18, 0.18, 2.7, 2.78, M.STEEL, { md: 0.1 });
    // ------------------------------------------------------------------ the wing: billboard sheets with seams, braced by pipes to the walls; four engines
    for (const s of [-1, 1]) {
      const w = WING(s); body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, M.AC_WHITE);
      const st = ST(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, M.WOOD_WEATHERED);
      strut(body, [0.6, 1.55, s * 1.4], [0.9, 2.2, s * 3.4], 0.1, M.AC_GRAY_DARK, { md: 0.25 });             // V struts
      strut(body, [-0.5, 1.55, s * 1.4], [-0.6, 2.2, s * 3.4], 0.1, M.AC_GRAY_DARK, { md: 0.25 });
      strut(body, [0.8, 1.55, s * 1.5], [1.0, 2.2, s * 6.2], 0.07, DARK, { md: 0.2 });
      body.paint(-1.4, 1.9, s > 0 ? 0.2 : -9.4, 2.0, 2.7, s > 0 ? 9.4 : -0.2, (x, y, z) => {                  // panel seams, rust, patches
        const b = Math.floor(Math.abs(z) / 0.9), f = Math.abs(z) / 0.9 - b, c = Math.floor((x + 1.4) / 1.05), g = (x + 1.4) / 1.05 - c;
        if (f < 0.03 || g < 0.03) return M.AC_GRAY;
        const h = (b * 13 + c * 7) % 11;
        return h === 0 ? RUST : h === 1 ? M.PATCH_B : h === 2 ? M.PATCH_A : 0;
      }, { thin: true, md: 0.12 });
    }
    // engines: four oil drums with engine blocks on top, a stovepipe stack each
    for (const [i, z] of ENGINES.entries()) {
      const col = [M.CONTAINER_RED, M.CONTAINER_BLUE, M.CONTAINER_GREEN, M.CONTAINER_ORANGE][i];
      body.cyl('x', 2.3, z, 0.34, 0.34, 1.3, 3.5, col);
      for (const x of [1.7, 2.6, 3.4]) body.cyl('x', 2.3, z, 0.36, 0.36, x, x + 0.06, M.AC_GRAY_DARK, { thin: true, md: 0.1 });
      body.box(1.9, 2.55, z - 0.3, 3.0, 2.85, z + 0.3, M.STEEL_DARK, { md: 0.1 });                            // the engine block
      for (let c = 0; c < 4; c++) body.box(2.05 + c * 0.25, 2.85, z - 0.14, 2.2 + c * 0.25, 3.05, z + 0.14, M.STEEL_BRIGHT, { md: 0.1 });
      strut(body, [2.9, 2.55, z - 0.2], [3.3, 3.1, z - 0.4], 0.1, M.RUST_DARK, { md: 0.1 });
      body.cyl('x', 2.3, z, 0.2, 0.2, 3.5, 3.6, M.AC_BLACK, { md: 0.1 });
      strut(body, [1.8, 2.0, z], [1.6, 2.3, z], 0.08, DARK, { md: 0.12 });
    }
    // ------------------------------------------------------------------ the tail: two telephone poles from the roof, a billboard fin, a plank stabilizer
    for (const s of [-1, 1]) {
      body.cyl('x', 1.2, s * 0.9, 0.11, 0.1, -8.4, -3.9, M.WOOD_DARK);
      strut(body, [-3.9, 1.5, s * 1.35], [-6.0, 1.3, s * 0.9], 0.06, DARK, { md: 0.15 });
      strut(body, [-1.5, 1.7, s * 1.1], [-7.5, 1.3, s * 0.9], 0.03, DARK, { md: 0.1 });
      body.box(-8.3, 1.1, s * 0.9 - 0.08, -7.9, 1.3, s * 0.9 + 0.08, WOODD, { md: 0.12 });
    }
    body.box(-6.6, 1.1, -1.0, -6.4, 1.3, 1.0, WOODD, { md: 0.12 });
    body.loft('y', finStations(FIN), M.AC_WHITE, { thin: true });
    decal(body, 'BAIT', { x: -8.05, y: 3.5, side: 1, px: 0.05, mat: M.AC_RED, z0: 0.02, z1: 0.2 });
    decal(body, 'BAIT', { x: -8.05, y: 3.5, side: -1, px: 0.05, mat: M.AC_RED, z0: 0.02, z1: 0.2 });
    decal(body, 'PIES', { x: -8.05, y: 2.7, side: 1, px: 0.05, mat: M.AC_BLACK, z0: 0.02, z1: 0.2 });
    decal(body, 'PIES', { x: -8.05, y: 2.7, side: -1, px: 0.05, mat: M.AC_BLACK, z0: 0.02, z1: 0.2 });
    navLights(body, { left: [0.4, 2.3, -9.35], right: [0.4, 2.3, 9.35], tail: [-8.6, 1.2, 0], beacon: [-3.0, 2.0, -0.6], size: 0.12 });
    // ------------------------------------------------------------------ glass in the windows, hidden from the cockpit
    const gl = k.part('glass', { hideInCockpit: true });
    gl.box(4.93, 0.35, -1.0, 4.97, 1.3, 1.0, GLASS, { thin: true });
    gl.box(-3.97, 0.4, -0.45, -3.93, 1.1, 0.45, GLASS, { thin: true });
    for (const x of WX_L) gl.box(x - WH, WY0, -1.37, x + WH, WY1, -1.33, GLASS, { thin: true });
    for (const x of WX_R) gl.box(x - WH, WY0, 1.33, x + WH, WY1, 1.37, GLASS, { thin: true });
    // ------------------------------------------------------------------ control surfaces: ailerons, big flaps, elevators, rudder
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      wingSurface(k, body, 'flap' + n, WING(s), { z0: 0.5, z1: 3.9, frac: 0.3, mat: M.AC_WHITE });
      wingSurface(k, body, 'aileron' + n, WING(s), { z0: 6.4, z1: 9.3, frac: 0.28, mat: M.AC_WHITE });
      wingSurface(k, body, 'elevator' + n, ST(s), { z0: 0.2, z1: 2.9, frac: 0.38, mat: M.WOOD_LIGHT });
    }
    const hinge = finAt(FIN, 1.8);
    loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: M.AC_WHITE, box: [-8.9, 1.2, -0.2, -7.0, 4.5, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.36; },
      pivot: [hinge.te + hinge.chord * 0.36, 1.8, 0],
    });
    // ------------------------------------------------------------------ four propellers, spinning opposite ways
    ENGINES.forEach((z, i) => {
      const pr = k.part('propeller' + (i + 1), { pivot: [3.65, 2.3, z], local: true, voxel: 0.04 });
      prop(pr, 0.95, 2, { chord: 0.26, mat: M.AC_PROP, tip: M.AC_YELLOW, hubR: 0.14, tipLen: 0.16 });
      spinner(pr, 0.0, 0.34, 0.2, M.AC_RED);
    });
    // ------------------------------------------------------------------ wheels: two axles, the second one for show, a jack wheel under the tongue
    const gn = k.part('gearNose');
    strut(gn, [6.2, -0.85, 0], [5.8, -1.15, 0], 0.08, M.STEEL_BRIGHT);
    wheel(k.part('wheelNose', { pivot: [5.8, -1.15, 0], local: true }), 0, 0, 0, 0.14, 0.08);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n);
      strut(g, [-1.4, -0.9, s * 1.0], [-1.4, -1.0, s * 1.2], 0.14, DARK);
      body.box(-3.0, -1.0, s * 1.2 - 0.1, -2.4, -0.95, s * 1.2 + 0.1, DARK, { md: 0.12 });
      body.cyl('z', -2.7, -1.0, 0.38, 0.38, s * 1.2 - 0.12, s * 1.2 + 0.12, M.AC_TIRE, { md: 0.1 });         // the second axle, fixed
      body.cyl('z', -2.7, -1.0, 0.2, 0.2, s * 1.2 - 0.14, s * 1.2 + 0.14, M.AC_HUB, { md: 0.1 });
      wheel(k.part('wheel' + n, { pivot: [-1.4, -1.0, s * 1.2], local: true }), 0, 0, 0, 0.38, 0.24);
    }
    // ------------------------------------------------------------------ the pilot in his recliner, seen through the glass
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 3.55, -0.35, { hands: [[4.22, -0.02, -0.2], [4.22, -0.02, 0.2]], feet: 4.2, suit: M.PAINT_BLUEGRAY, helmet: M.HAY, visor: M.PLASTER_TERRA, vest: M.AC_RED });
    // ------------------------------------------------------------------ stores: jugs hung on ropes, propane tanks
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      store(k, 'jug' + n + '1', 'jug' + n + '1', 'jug', [1.0, 1.85, s * 3.4], { voxel: 0.03125 });
      store(k, 'jug' + n + '2', 'jug' + n + '2', 'jug', [1.0, 1.85, s * 4.4], { voxel: 0.03125 });
      store(k, 'propane' + n, 'prop' + n, 'propane', [0.4, 1.9, s * 6.0], { voxel: 0.03125 });
      for (const z of [3.4, 4.4]) strut(body, [1.0, 2.15, s * z], [1.0, 2.1, s * z], 0.02, M.AC_BLACK, { md: 0.08 });
      strut(body, [0.4, 2.15, s * 6.0], [0.4, 2.1, s * 6.0], 0.02, M.AC_BLACK, { md: 0.08 });
    }
    // two PVC potato cannons on the roof edge over the front window
    for (const z of [-0.4, 0.4]) {
      const sp = k.part('spud' + (z < 0 ? 'L' : 'R'));
      sp.cyl('x', 2.0, z, 0.07, 0.07, 3.5, 5.6, M.AC_WHITE, { thin: true });
      for (const x of [3.9, 4.5, 5.1]) sp.cyl('x', 2.0, z, 0.078, 0.078, x, x + 0.05, M.AC_GRAY_LIGHT, { thin: true, md: 0.08 });
      sp.cyl('x', 2.0, z, 0.04, 0.04, 5.5, 5.62, 0, { md: 0.05 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the house inside (2.5 cm): paneled walls, shag carpet, ceiling, lamps, curtains
    const c = k.interior('house');
    c.box(-3.9, FL - 0.04, -1.3, 4.9, FL, 1.3, M.PATCH_C);                                                  // shag carpet, avocado
    c.box(-3.9, FL, -1.3, 4.9, FL + 0.1, -1.28, M.WOOD_DARK); c.box(-3.9, FL, 1.28, 4.9, FL + 0.1, 1.3, M.WOOD_DARK);   // baseboards
    for (const z0 of [-1.3, 1.28]) c.box(-3.9, FL + 0.1, z0, 4.9, 1.4, z0 + 0.02, WOODM);                    // paneling
    c.box(-3.9, FL + 0.1, -1.3, -3.88, 1.4, 1.3, WOODM); c.box(4.88, FL + 0.1, -1.3, 4.9, 1.4, 1.3, WOODM);
    c.box(-3.9, 1.38, -1.3, 4.9, 1.4, 1.3, M.PLASTER_CREAM);                                                // the ceiling
    c.paint(-3.9, FL, -1.31, 4.9, 1.4, 1.31, (x, y, z) => ((Math.abs(z) > 1.27 && Math.abs(((x + 4) % 0.15) - 0.075) < 0.008) || (Math.abs(x) > 4.85 && Math.abs(((z + 2) % 0.15) - 0.075) < 0.008) ? M.WOOD_DARK : 0));
    c.box(-3.9, 1.34, -0.15, 4.9, 1.38, 0.15, M.LAMP_WHITE, { md: 0.05 });                                  // a long fluorescent strip
    // open the window spaces in the paneling; the picture window; curtains
    for (const x of WX_L) c.carve(x - WH, WY0, -1.4, x + WH, WY1, -1.2);
    for (const x of WX_R) c.carve(x - WH, WY0, 1.2, x + WH, WY1, 1.4);
    c.carve(4.8, 0.35, -1.0, 4.95, 1.3, 1.0);
    c.carve(-3.95, 0.4, -0.45, -3.8, 1.1, 0.45);
    c.carve(0.1, FL, 1.2, 1.1, 1.25, 1.4);                                                                  // the doorway
    for (const x of WX_L) { c.box(x - WH - 0.04, WY0 - 0.02, -1.28, x - WH + 0.17, WY1 + 0.3, -1.22, M.PAINT_YELLOW, { md: 0.05 }); c.box(x + WH - 0.17, WY0 - 0.02, -1.28, x + WH + 0.04, WY1 + 0.3, -1.22, M.PAINT_YELLOW, { md: 0.05 }); }
    for (const x of WX_R) { c.box(x - WH - 0.04, WY0 - 0.02, 1.22, x - WH + 0.17, WY1 + 0.3, 1.28, M.PAINT_YELLOW, { md: 0.05 }); c.box(x + WH - 0.17, WY0 - 0.02, 1.22, x + WH + 0.04, WY1 + 0.3, 1.28, M.PAINT_YELLOW, { md: 0.05 }); }
    c.box(4.8, 1.3, -1.04, 4.9, 1.38, 1.04, M.WOOD_DARK); c.box(4.8, 0.3, -1.04, 4.9, 0.35, 1.04, M.WOOD_DARK);
    for (const z of [-1.0, 1.0]) { c.box(4.78, 0.35, z - 0.2, 4.88, 1.35, z + (z < 0 ? 0.2 : -0.2), M.PAINT_YELLOW, { md: 0.04 }); }
    // ------------------------------------------------------------------ the front room: a recliner, a plaid pillow, the TV tray with a cup holder
    const R = M.SEAT_LEATHER;
    c.box(3.3, FL, -0.5, 4.2, -0.55, 0.5, WOODD);                                                           // the base
    c.box(3.3, -0.55, -0.5, 4.0, -0.4, 0.5, R);                                                             // seat cushion
    c.box(3.15, -0.45, -0.5, 3.35, 0.55, 0.5, R);                                                           // the back, tall
    c.box(3.1, 0.35, -0.4, 3.3, 0.7, 0.4, R);                                                               // the headrest
    for (const s of [-1, 1]) c.box(3.3, -0.55, s * 0.5 - 0.06, 4.1, -0.15, s * 0.5 + 0.06, R);              // arms
    c.box(4.0, -0.7, -0.4, 4.5, -0.55, 0.4, R);                                                              // the footrest, up
    c.box(3.25, -0.4, -0.3, 3.4, -0.1, 0.3, M.PATCH_D, { md: 0.03 });                                       // an afghan
    c.cyl('y', 3.7, 0.56, 0.04, 0.04, -0.15, -0.05, M.AC_RED, { md: 0.03 });                                 // a beer can on the arm
    c.box(4.4, FL, -0.5, 4.8, -0.2, 0.5, WOODM);                                                            // the TV tray stand and the dash it carries
    c.box(4.75, FL, -0.9, 4.88, 0.3, 0.9, WOODD);                                                           // dash: a truck's, mounted under the picture window
    c.box(4.68, 0.34, -0.92, 4.88, 0.4, 0.92, M.AC_BLACK);
    // ------------------------------------------------------------------ living room: couch against the left wall, TV on the right, coffee table, lamp, a deer head
    const couch = (x0, x1) => {
      c.box(x0, FL, -1.25, x1, -0.55, -0.55, M.PATCH_D);
      c.box(x0, -0.55, -1.25, x1, -0.35, -0.55, M.PATCH_B);
      c.box(x0, -0.35, -1.27, x1, 0.2, -1.1, M.PATCH_D);
      for (const [a, b] of [[x0, x0 + 0.15], [x1 - 0.15, x1]]) c.box(a, FL, -1.25, b, -0.2, -0.55, M.PATCH_D);
    };
    couch(0.5, 2.3);
    c.box(1.1, FL, 0.2, 1.8, FL + 0.4, 1.0, WOODD);                                                          // coffee table
    c.box(1.1, FL + 0.4, 0.2, 1.8, FL + 0.45, 1.0, WOODM);
    c.box(1.3, FL + 0.45, 0.45, 1.5, FL + 0.5, 0.75, M.AC_WHITE, { md: 0.03 });                              // a plate
    c.box(1.2, FL, 1.0, 1.9, -0.1, 1.28, WOODD);                                                             // the TV on a cabinet
    c.box(1.1, -0.1, 1.0, 1.95, 0.5, 1.28, M.AC_BLACK);
    c.box(1.1, 0.0, 1.0, 1.15, 0.42, 1.28, M.AC_GRAY_DARK, { md: 0.03 });
    c.box(1.12, 0.02, 1.07, 1.15, 0.4, 1.22, M.GAUGE_FACE);
    c.box(1.13, 0.05, 1.1, 1.14, 0.37, 1.19, M.LAMP_WHITE, { md: 0.02 });                                    // static
    for (let i = 0; i < 6; i++) c.box(1.125, 0.07 + (i % 3) * 0.1, 1.11 + (i / 6) * 0.1, 1.135, 0.09 + (i % 3) * 0.1, 1.13 + (i / 6) * 0.1, M.GAUGE_FACE, { md: 0.015 });
    strut(c, [1.45, 0.5, 1.1], [1.7, 0.85, 1.0], 0.02, M.AC_METAL, { md: 0.02 });                           // rabbit ears
    strut(c, [1.45, 0.5, 1.1], [1.7, 0.85, 1.2], 0.02, M.AC_METAL, { md: 0.02 });
    c.cyl('y', 0.4, -1.1, 0.03, 0.03, FL, -0.05, WOODD, { md: 0.03 });                                       // a floor lamp
    c.cyl('y', 0.4, -1.1, 0.12, 0.2, -0.05, 0.2, M.PAINT_YELLOW, { md: 0.03 });
    c.box(1.4, 0.45, -1.28, 1.7, 0.7, -1.22, WOODD, { md: 0.03 }); c.ell(1.5, 0.6, -1.15, 0.12, 0.09, 0.1, M.WOOD_MID, { md: 0.03 });   // the deer head
    strut(c, [1.52, 0.65, -1.12], [1.55, 0.95, -1.12], 0.015, M.WOOD_LIGHT, { md: 0.02 }); strut(c, [1.52, 0.65, -1.18], [1.5, 0.95, -1.18], 0.015, M.WOOD_LIGHT, { md: 0.02 });
    // ------------------------------------------------------------------ kitchen: a counter with a sink and a stove down the right wall, the fridge, a table with two chairs
    c.box(-1.9, FL, 0.7, -0.2, -0.0, 1.28, M.WOOD_LIGHT);                                                    // lower cabinets
    c.box(-1.95, -0.0, 0.68, -0.15, 0.05, 1.3, M.CONCRETE_PANEL);                                           // counter top
    for (let i = 0; i < 4; i++) c.box(-1.85 + i * 0.4, FL + 0.05, 0.69, -1.5 + i * 0.4, -0.05, 0.7, M.WOOD_DARK, { md: 0.03 });
    c.box(-1.3, 0.05, 0.85, -0.9, 0.08, 1.2, M.STEEL_BRIGHT, { md: 0.03 });                                  // sink basin
    c.box(-0.8, 0.05, 0.85, -0.2, 0.12, 1.25, M.AC_BLACK, { md: 0.03 });                                     // the stove top
    for (const [x, z] of [[-0.65, 0.95], [-0.35, 0.95], [-0.65, 1.15], [-0.35, 1.15]]) c.cyl('y', x, z, 0.06, 0.06, 0.12, 0.13, M.RUST, { md: 0.02 });
    c.box(-0.7, 0.13, 1.1, -0.5, 0.35, 1.2, M.AC_METAL, { md: 0.03 }); c.cyl('y', -0.6, 1.1, 0.05, 0.05, 0.13, 0.35, M.AC_METAL, { md: 0.03 });   // a pot of coffee
    c.box(-2.6, FL, 0.6, -2.0, 0.8, 1.28, M.AC_CREAM);                                                       // the fridge
    c.box(-2.0, 0.0, 0.62, -1.98, 0.7, 0.66, M.STEEL_BRIGHT, { md: 0.02 });
    c.box(-2.0, FL + 0.1, 0.62, -1.98, FL + 0.5, 0.66, M.STEEL_BRIGHT, { md: 0.02 });
    c.box(-2.6, 0.82, 0.62, -2.0, 0.84, 1.28, M.AC_CREAM);
    c.box(-1.0, FL, -0.7, -0.2, -0.1, -0.3, WOODD, { md: 0.03 });                                           // the table
    c.box(-1.05, -0.1, -0.75, -0.15, -0.05, -0.25, WOODL);
    for (const [x, z] of [[-0.6, -1.0], [-0.6, 0.0]]) { c.box(x - 0.2, FL, z - 0.2, x + 0.2, -0.4, z + 0.2, WOODD, { md: 0.03 }); c.box(x - 0.2, -0.4, z - 0.2, x + 0.2, -0.34, z + 0.2, M.SEAT_FABRIC); c.box(x - 0.2, -0.34, z + (z < -0.5 ? -0.2 : 0.14), x + 0.2, 0.1, z + (z < -0.5 ? -0.14 : 0.2), WOODD); }
    c.box(-0.7, -0.05, -0.55, -0.5, 0.02, -0.45, M.PAINT_YELLOW, { md: 0.03 });                              // a pie
    for (let i = 0; i < 3; i++) c.box(-2.1 + i * 0.5, 0.45, 0.9, -1.7 + i * 0.5, 0.95, 1.28, M.WOOD_DARK, { md: 0.03 });     // upper cabinets
    // ------------------------------------------------------------------ bedroom: a double bed made up with a patchwork quilt, nightstand, a dresser
    c.box(-3.88, FL, -0.8, -2.3, -0.5, 0.8, WOODD);                                                          // frame
    c.box(-3.86, -0.5, -0.76, -2.3, -0.3, 0.76, M.AC_CREAM);                                                 // mattress
    c.box(-3.85, -0.3, -0.74, -2.5, -0.26, 0.74, M.PATCH_B);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) c.box(-3.8 + i * 0.22, -0.265, -0.7 + j * 0.37, -3.58 + i * 0.22, -0.255, -0.4 + j * 0.37, [M.PATCH_A, M.PATCH_C, M.PATCH_D, M.PATCH_B][(i + j * 2) % 4], { md: 0.02 });
    c.box(-3.84, -0.3, -0.6, -3.5, -0.12, -0.15, M.AC_WHITE, { md: 0.03 }); c.box(-3.84, -0.3, 0.15, -3.5, -0.12, 0.6, M.AC_WHITE, { md: 0.03 });   // pillows
    c.box(-3.88, -0.5, -0.82, -3.8, 0.35, 0.82, WOODD);                                                      // headboard
    c.box(-3.8, FL, 0.9, -3.4, -0.35, 1.25, WOODM); c.cyl('y', -3.6, 1.07, 0.06, 0.06, -0.35, -0.3, M.PAINT_YELLOW, { md: 0.03 });   // nightstand and a lamp
    c.cyl('y', -3.6, 1.07, 0.15, 0.1, -0.3, -0.1, M.AC_CREAM, { md: 0.03 });
    c.box(-2.7, FL, -1.25, -2.2, -0.1, -0.7, WOODM);                                                         // dresser
    for (let i = 0; i < 3; i++) c.box(-2.7, FL + 0.1 + i * 0.25, -1.25, -2.68, FL + 0.28 + i * 0.25, -0.72, WOODD, { md: 0.03 });
    c.box(-3.86, 0.5, -1.0, -3.84, 1.2, -0.3, M.AC_GRAY_LIGHT, { md: 0.03 });                               // a mirror
    // ------------------------------------------------------------------ the dash under the picture window: gauges, a CB radio, a rosary on the mirror
    const pn = k.interior('panel', { voxel: 0.008 });
    const gx = 4.72;
    pn.box(4.7, -0.1, -0.9, 4.88, 0.34, 0.9, M.COCKPIT_PANEL);
    pn.box(4.66, 0.32, -0.92, 4.9, 0.4, 0.92, M.COCKPIT_TRIM);
    gauge(pn, gx, 0.17, -0.55, 0.1); gauge(pn, gx, 0.17, -0.28, 0.07); gauge(pn, gx, 0.17, 0.0, 0.07); gauge(pn, gx, 0.17, 0.28, 0.07); gauge(pn, gx, 0.17, 0.55, 0.1);
    needle(k.interior('nASI', { pivot: [gx - 0.028, 0.17, -0.55], local: true, voxel: 0.004 }), 0.082, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [gx - 0.028, 0.17, 0.55], local: true, voxel: 0.004 }), 0.082, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [gx - 0.028, 0.17, 0.0], local: true, voxel: 0.004 }), 0.056, M.NEEDLE_ORANGE);
    pn.box(gx - 0.05, -0.02, -0.2, gx - 0.01, 0.06, 0.2, M.AC_BLACK);                                       // a CB radio with a mic
    for (let i = 0; i < 6; i++) pn.box(gx - 0.06, 0.0, -0.16 + i * 0.06, gx - 0.05, 0.03, -0.13 + i * 0.06, i % 3 === 0 ? M.NAV_GREEN : M.SWITCH_GRAY, { md: 0.015 });
    pn.cyl('x', 0.02, 0.38, 0.03, 0.03, gx - 0.06, gx - 0.01, M.AC_BLACK, { md: 0.02 });
    pn.box(gx - 0.05, 0.28, -0.5, gx - 0.02, 0.32, -0.3, M.PAINT_YELLOW, { md: 0.02 });                     // a bumper sticker
    for (let i = 0; i < 6; i++) pn.box(gx - 0.04, 0.28 + (i % 2) * 0.01, 0.35 + i * 0.06, gx - 0.02, 0.3, 0.37 + i * 0.06, i % 2 ? M.NAV_GREEN : M.NAV_RED, { md: 0.015 });
    // ------------------------------------------------------------------ the steering wheel on a column, a column shifter and pedals
    const sw = k.interior('steeringWheel', { pivot: [4.2, -0.02, 0], local: true, voxel: 0.012 });
    ringYZ(sw, -0.02, 0.03, 0, 0, 0.2, 0.05, M.AC_BLACK);
    sw.box(-0.03, -0.03, -0.2, 0.05, 0.03, 0.2, M.AC_BLACK);
    sw.box(-0.03, -0.2, -0.03, 0.05, 0.2, 0.03, M.AC_BLACK);
    sw.cyl('x', 0, 0, 0.05, 0.05, -0.03, 0.06, M.AC_RED, { md: 0.02 });
    sw.cyl('x', 0, 0, 0.03, 0.03, 0.05, 0.6, M.AC_GRAY_DARK);                                                // column
    const sh = k.interior('shifter', { pivot: [4.35, -0.35, 0.45], local: true, voxel: 0.01 });
    sh.cyl('y', 0, 0, 0.018, 0.018, 0, 0.3, M.AC_METAL);
    sh.ell(0, 0.32, 0, 0.04, 0.05, 0.04, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.15], ['pedalR', 0.15]]) {
      const p = k.interior(n, { pivot: [4.6, -0.55, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.08, -0.06, 0.02, 0.1, 0.06, M.STEEL_DARK);
    }
  },
});
