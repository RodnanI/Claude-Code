import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, camo, seams, seamsZ, rivets, navLights, pilot, gearLeg, store, pylon, prop, spinner, roundel } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt, wingAt } from '../builders/surfaces.js';
import { munitionRecipe } from '../munitions.js';

/* Tempest P-48: a big-engined propeller fighter from the last days of the piston era. Eighteen cylinders, four blades, six
   machine guns in the wings, rockets and bombs under them. Fast, heavy and impatient: the torque of the engine will roll it onto its
   back at full power on the takeoff roll, and it will not forgive a slow, tight turn. Tail dragger. Body origin at the center of gravity. */

const METAL = M.AC_METAL, DARK = M.AC_GRAY_DARK, OLIVE = M.AC_OLIVE, RED = M.AC_RED;

const WR = wingDef([1.4, -0.4, 0.5], 5.2, 2.8, 1.25, 0.5, 0.35, 0.15, 0.1, 1);
const WL = wingDef([1.4, -0.4, -0.5], 5.2, 2.8, 1.25, 0.5, 0.35, 0.15, 0.1, -1);
const wy = (z) => wingAt(WR, Math.abs(z)).y;
const FIN = { x: -2.35, y: 0.15, z: 0, chord: 2.05, tip: 0.95, height: 1.75, sweep: 0.95, thick: 0.07 };
const STAB = (s) => wingDef([-3.55, 0.28, s * 0.12], 2.0, 1.45, 0.75, 0.55, 0.0, 0.08, 0.06, s);

const under = (x, y, z) => y < (Math.abs(z) > 0.45 && x < 1.5 && x > -1.5 ? wy(Math.abs(z)) : -0.05);

export default defineAircraft({
  id: 'tempest',
  name: 'Tempest P-48',
  manufacturer: 'Fort Talon Aerospace',
  role: 'Piston fighter',
  category: 'military',
  order: 6,
  difficulty: 4,
  tags: ['Tail dragger', 'Machine guns', 'Rockets', 'Bombs', 'Radial engine'],
  description: 'Two thousand horsepower in front of a bubble canopy. Six .50 calibers in the wings, ten rockets under them and a pair of bombs. It climbs like a rocket, rolls like a falling tree, and the torque swings the nose around the moment the throttle goes forward.',
  voxel: 0.05,
  interiorVoxel: 0.014,
  lodLevels: 4,
  mass: { empty: 3300, fuel: 420, payload: 105 },
  inertia: [8800, 24500, 19800],
  wing: { area: 22.5, span: 11.4, chord: 2.0, y: -0.4 },
  aero: {
    CL0: 0.2, CLa: 5.0, CLmax: 1.65, alphaStall: 0.29, CD0: 0.022, k: 0.055, CDflap: 0.07, CLflap: 0.6, Cmflap: -0.1, CLmaxFlap: 0.55, CDgear: 0.02, CDair: 0.05,
    Cm0: 0.03, Cma: -0.95, Cmq: -14, Clb: 0.1, Clp: -0.55, Cnb: 0.085, Cnr: -0.14, Cyb: 0.3, Cnda: 0.02, spin: 0.7, stallPitchDown: 0.1,
    control: { elevator: 0.6, aileron: 0.062, rudder: 0.04 },
  },
  propulsion: { type: 'prop', power: 1300000, efficiency: 0.82, propDiameter: 3.4, maxRpm: 2700, idleRpm: 650, fuelBurn: 0.07, staticFactor: 0.62, spin: 0.4 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [0.3, -1.4, -1.9], radius: 0.36, k: 120000, c: 9000, brake: true, travel: 0.3 },
      { pos: [0.3, -1.4, 1.9], radius: 0.36, k: 120000, c: 9000, brake: true, travel: 0.3 },
      { pos: [-4.35, -0.5, 0], radius: 0.13, k: 50000, c: 3500, steer: -0.6, castor: 0.4, cornering: 0.5, travel: 0.14, retract: false },
    ],
  },
  skids: [{ p: [0.0, -0.45, 5.6], kind: 'tip' }, { p: [0.0, -0.45, -5.6], kind: 'tip' }, { p: [3.6, 0.0, 0], kind: 'nose' }, { p: [-0.5, -0.7, 0], kind: 'belly' }, { p: [-4.7, 0.5, 0], kind: 'tail' }, { p: [-2.4, 1.8, 0], kind: 'tail' }],
  limits: { vne: 190, maxG: 7, minG: 3, flapSpeed: 75, gearSpeed: 90, crashVs: 5 },
  cameras: { cockpit: [0.55, 0.92, 0], chase: { distance: 20, height: 4.4 }, near: { distance: 9.5, height: 2.3 } },
  liveries: [
    { id: 'default', name: 'Natural metal' },
    { id: 'olive', name: 'Olive drab', remap: { AC_METAL: 'AC_OLIVE', AC_GRAY: 'AC_DRAB' } },
    { id: 'blue', name: 'Navy blue', remap: { AC_METAL: 'GLASS_BLUE', AC_GRAY: 'GLASS_SLATE' } },
  ],
  stations: [
    { id: 'rkL', pos: [0.3, -0.58, -2.2], kind: 'rail' }, { id: 'rkR', pos: [0.3, -0.58, 2.2], kind: 'rail' },
    { id: 'bombL', pos: [0.3, -0.62, -1.15], kind: 'rack' }, { id: 'bombR', pos: [0.3, -0.62, 1.15], kind: 'rack' },
  ],
  weapons: [
    { id: 'guns', name: 'Six .50 caliber machine guns', type: 'gun', munition: 'mg50', ammo: 1600, rate: 13, barrels: 6, muzzles: [[1.9, -0.28, -2.0], [1.85, -0.28, 2.0], [1.7, -0.3, -2.55], [1.65, -0.3, 2.55], [1.5, -0.32, -3.1], [1.45, -0.32, 3.1]], spread: 0.006, flash: 0.3 },
    { id: 'rockets', name: 'HVAR rockets', type: 'rocket', munition: 'hvar', stations: ['rkL', 'rkR'], rounds: 5, muzzleX: 0.7, tube: 0.25 },
    { id: 'bombs', name: 'GP-500 bomb', type: 'bomb', munition: 'mk82', stations: ['bombL', 'bombR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.8 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.8 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'propeller', type: 'rotate', axis: [1, 0, 0], channel: 'propAngle', gain: 1 },
    { part: 'gearL', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: 1.5, offset: -1.5 },
    { part: 'gearR', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: -1.5, offset: 1.5 },
    { part: 'gearL', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gearR', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'tailwheel', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'tailwheel', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.35 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.35 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.45 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0125, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.00115, offset: -2.3 },
    { part: 'attitude', type: 'rotate', axis: [0, 0, 1], channel: 'pitchGauge', gain: 1 },
    { part: 'attitude', type: 'rotate', axis: [1, 0, 0], channel: 'rollGauge', gain: -1 },
  ],
  model(k) {
    const body = k.part('body');
    const paint = (r, box) => camo(r, box, [METAL, M.AC_GRAY_LIGHT, METAL], { scale: 1.1, seed: 5, under, underMat: METAL, soft: 0.02 });
    // ------------------------------------------------------------------ fuselage: round at the engine, a deep oval at the cockpit, a slim tail
    body.loft('x', [
      { a: -4.75, c1: 0.4, c2: 0, r1: 0.09, r2: 0.09, n: 2.1 },
      { a: -4.0, c1: 0.3, c2: 0, r1: 0.21, r2: 0.15, n: 2.2 },
      { a: -2.6, c1: 0.16, c2: 0, r1: 0.38, r2: 0.29, n: 2.3 },
      { a: -1.0, c1: 0.06, c2: 0, r1: 0.56, r2: 0.43, n: 2.4 },
      { a: 0.5, c1: 0.0, c2: 0, r1: 0.6, r2: 0.46, n: 2.4 },
      { a: 1.8, c1: -0.03, c2: 0, r1: 0.66, r2: 0.56, n: 2.3 },
      { a: 2.3, c1: -0.03, c2: 0, r1: 0.74, r2: 0.74, n: 2.1 },
      { a: 3.3, c1: -0.03, c2: 0, r1: 0.77, r2: 0.77, n: 2.05 },
      { a: 3.55, c1: -0.03, c2: 0, r1: 0.74, r2: 0.74, n: 2.05 },
    ], METAL);
    // dorsal fillet from the canopy back to the fin, and the belly scoop under the wing root
    body.loft('x', [
      { a: -2.3, c1: 0.5, c2: 0, r1: 0.05, r2: 0.08, n: 2.2 },
      { a: -1.3, c1: 0.62, c2: 0, r1: 0.14, r2: 0.2, n: 2.2 },
      { a: -0.5, c1: 0.7, c2: 0, r1: 0.12, r2: 0.24, n: 2.2 },
    ], METAL);
    body.loft('x', [
      { a: -0.9, c1: -0.62, c2: 0, r1: 0.1, r2: 0.2, n: 2.2 },
      { a: 0.0, c1: -0.68, c2: 0, r1: 0.18, r2: 0.3, n: 2.2 },
      { a: 0.9, c1: -0.62, c2: 0, r1: 0.12, r2: 0.24, n: 2.2 },
    ], METAL);
    // cockpit well: the bubble closes it
    body.carve(-0.45, 0.42, -0.34, 1.7, 0.9, 0.34);
    // open front of the cowl: a ring lip and the face of the engine behind it
    body.cyl('x', -0.03, 0, 0.64, 0.64, 2.95, 3.6, 0);
    body.cyl('x', -0.03, 0, 0.55, 0.55, 2.9, 3.0, M.AC_BLACK);
    body.ell(3.05, -0.03, 0, 0.25, 0.46, 0.46, DARK);                                       // the crankcase dome
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      strut(body, [3.0, -0.03 + c * 0.2, sn * 0.2], [3.35, -0.03 + c * 0.55, sn * 0.55], 0.2, M.AC_GRAY, { md: 0.2 });        // cylinder heads with their fins
      for (let f = 0; f < 5; f++) strut(body, [3.12 + f * 0.06, -0.03 + c * (0.3 + f * 0.05), sn * (0.3 + f * 0.05)], [3.14 + f * 0.06, -0.03 + c * (0.5 + f * 0.01), sn * (0.5 + f * 0.01)], 0.27, M.AC_GRAY_DARK, { md: 0.12 });
      strut(body, [3.4, -0.03 + c * 0.5, sn * 0.5], [3.46, -0.03 + c * 0.6, sn * 0.6], 0.09, M.STEEL_DARK, { md: 0.1 });        // push rods
    }
    // ------------------------------------------------------------------ wings and tail
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, METAL);
    for (const s of [-1, 1]) {
      body.wing([1.9, -0.45, s * 0.35], 0.9, 3.4, 2.9, 0.1, 0.1, 0.13, 0.13, s, METAL);              // fillets
      const st = STAB(s);
      body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, METAL);
    }
    body.loft('y', finStations(FIN), METAL, { thin: true });
    body.loft('y', [
      { a: 0.15, c1: -2.0, c2: 0, r1: 0.9, r2: 0.12, n: 2.5 },
      { a: 0.5, c1: -2.15, c2: 0, r1: 0.6, r2: 0.1, n: 2.5 },
      { a: 0.9, c1: -2.4, c2: 0, r1: 0.25, r2: 0.08, n: 2.5 },
    ], METAL);                                                                                      // the dorsal root of the fin
    // wing gun bays: three muzzles per wing out of the leading edge and ejection chutes below
    for (const s of [-1, 1]) for (const [x, z] of [[1.6, 2.0], [1.45, 2.55], [1.3, 3.1]]) {
      body.cyl('x', wy(z) - 0.02, s * z, 0.045, 0.045, x - 0.1, x + 0.55, M.STEEL_DARK);
      body.cyl('x', wy(z) - 0.02, s * z, 0.06, 0.06, x + 0.4, x + 0.5, M.STEEL_BRIGHT, { md: 0.1 });
      body.cyl('x', wy(z) - 0.02, s * z, 0.03, 0.03, x + 0.3, x + 0.6, 0, { md: 0.1 });
      body.box(x - 0.9, wy(z) - 0.2, s * z - 0.05, x - 0.7, wy(z) - 0.16, s * z + 0.05, DARK, { md: 0.1 });
    }
    // ------------------------------------------------------------------ paint: bare metal panels, an anti-glare panel, stripes, a checkered cowl
    paint(body, [-4.8, -1.0, -5.7, 3.6, 1.9, 5.7]);
    body.paint(1.5, 0.2, -0.7, 2.9, 0.82, 0.7, (x, y, z) => (y > 0.42 && x > 1.3 && x < 2.9 ? M.AC_BLACK : 0), { md: 0.4 });
    body.paint(3.15, -0.9, -0.9, 3.65, 0.9, 0.9, (x, y, z) => {
      const a = Math.atan2(z, y + 0.03);
      return ((Math.floor((a / (2 * Math.PI) + 0.5) * 24) + Math.floor((x - 3.15) / 0.125)) & 1) ? M.AC_RED : M.AC_WHITE;
    }, { md: 0.2 });
    // invasion stripes on the rear fuselage and the wings
    for (const [x0, x1] of [[-3.4, -3.1], [-2.9, -2.6]]) body.paint(x0, -0.2, -0.6, x1, 0.8, 0.6, () => M.AC_WHITE, { thin: true });
    for (const [x0, x1] of [[-3.1, -2.9], [-2.6, -2.4]]) body.paint(x0, -0.2, -0.6, x1, 0.8, 0.6, () => M.AC_BLACK, { thin: true });
    for (const s of [-1, 1]) {
      roundel(body, 0.0, s * 3.6, wy(3.6) + 0.04, wy(3.6) + 0.3, [[0.5, M.AC_WHITE], [0.38, M.GLASS_BLUE], [0.18, M.AC_WHITE]]);
      body.paint(-1.5, -0.2, s > 0 ? 1.1 : -5.5, 1.5, 0.3, s > 0 ? 5.5 : -1.1, (x, y, z) => (x > 1.4 - 0.5 * ((Math.abs(z) - 0.5) / 5.2) - 0.35 && y > wy(z) ? M.AC_YELLOW : 0), { thin: true });
      // exhaust stacks on each side of the cowl and the soot that trails behind them
      for (let i = 0; i < 6; i++) {
        const y = 0.3 - i * 0.12;
        strut(body, [2.45 + i * 0.03, y, s * 0.66], [2.62 + i * 0.03, y - 0.03, s * 0.86], 0.07, M.RUST, { md: 0.12 });
        strut(body, [2.62 + i * 0.03, y - 0.03, s * 0.86], [2.72 + i * 0.03, y - 0.04, s * 0.95], 0.05, M.RUST_DARK, { md: 0.12 });
      }
    }
    body.paint(1.0, -0.3, -0.8, 2.6, 0.5, 0.8, (x, y, z) => ((Math.abs(z) > 0.45 && y < 0.35 && y > -0.1 && Math.sin(x * 14 + y * 4) > -0.4 && x < 2.45) ? DARK : 0), { thin: true, md: 0.2 });
    // cooling gills around the back of the cowl, panel lines, rivets
    body.paint(2.0, -0.9, -0.9, 2.45, 0.9, 0.9, (x, y, z) => (Math.hypot(y + 0.03, z) > 0.62 && Math.abs(((x - 2.0) * 22) % 1) < 0.18 ? DARK : 0), { thin: true });
    seams(body, [-4.2, -0.5, -0.5, 2.0, 0.8, 0.5], [-3.9, -3.2, -2.5, -1.7, -0.9, -0.1, 0.9, 1.7], { w: 0.012, mat: DARK, ymin: -0.5 });
    seamsZ(body, [-1.5, -0.6, -5.7, 1.6, 0.4, 5.7], [0.9, 1.6, 2.6, 3.7, 4.6], { w: 0.011, mat: DARK, y0: -0.6, y1: 0.5 });
    rivets(body, [-4.0, 0.1, -0.45, 2.0, 0.75, 0.45], 0.2, 0.2, { mat: DARK, ymin: 0.2 });
    rivets(body, [-1.5, -0.6, -5.5, 1.5, 0.3, 5.5], 0.22, 0.22, { mat: DARK, ymin: -0.3, ymax: 0.3 });
    decal(body, 'WZ-48', { x: -2.0, y: 0.1, side: 1, px: 0.07, mat: M.AC_WHITE, z0: 0.2, z1: 0.7 });
    decal(body, 'TEMPEST', { x: 0.9, y: -0.28, side: -1, px: 0.045, mat: M.AC_BLACK, z0: 0.3, z1: 0.7 });
    decal(body, 'P 48', { x: -2.1, y: 0.05, side: -1, px: 0.07, mat: M.AC_WHITE, z0: 0.15, z1: 0.6 });
    navLights(body, { left: [0.4, -0.35, -5.6], right: [0.4, -0.35, 5.6], tail: [-4.78, 0.42, 0] });
    body.cyl('x', 0.08, 0, 0.02, 0.02, 3.3, 3.55, 0, { md: 0.1 });
    strut(body, [0.5, 0.4, 0.62], [0.9, 0.2, 0.7], 0.03, M.AC_METAL, { md: 0.1 });                  // pitot
    strut(body, [-0.5, 0.78, 0], [-0.5, 1.15, 0.02], 0.02, M.AC_BLACK, { md: 0.1 });                 // radio mast
    strut(body, [-0.5, 1.15, 0.02], [-3.4, 0.6, 0.02], 0.008, M.AC_BLACK, { md: 0.04 });             // and its wire
    // ------------------------------------------------------------------ control surfaces
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      const bx = (a, b) => [-1.8, -0.6, Math.min(a * s, b * s), 1.6, 0.5, Math.max(a * s, b * s)];
      const fl = wingSurface(k, body, 'flap' + n, W, { z0: 0.8, z1: 2.9, frac: 0.3, mat: METAL });
      paint(fl, bx(0.7, 3.0)); seams(fl, bx(0.7, 3.0), [-0.6, -0.2], { w: 0.01, mat: DARK });
      const ail = wingSurface(k, body, 'aileron' + n, W, { z0: 3.1, z1: 5.15, frac: 0.28, mat: METAL });
      paint(ail, bx(3.0, 5.3));
      const el = wingSurface(k, body, 'elevator' + n, STAB(s), { z0: 0.2, z1: 2.05, frac: 0.34, mat: METAL });
      paint(el, [-4.9, 0.1, Math.min(0.1 * s, 2.2 * s), -3.0, 0.5, Math.max(0.1 * s, 2.2 * s)]);
    }
    const hinge = finAt(FIN, 0.6);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: METAL, box: [-4.5, 0.2, -0.2, -1.6, 2.0, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.34 && y > 0.2; },
      pivot: [hinge.te + hinge.chord * 0.34, 0.8, 0],
    });
    paint(rd, [-4.5, 0.2, -0.2, -1.6, 2.0, 0.2]);
    rd.paint(-4.5, 0.8, -0.2, -1.6, 1.9, 0.2, (x, y) => (y > 1.0 ? M.AC_RED : 0), { thin: true });
    // ------------------------------------------------------------------ landing gear: legs fold into the wings, wheels hide
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [0.3, -0.45, s * 1.9], visibleWhen: 'gearOut' });
      gearLeg(g, [0.3, -0.5, s * 1.9], [0.3, -1.4, s * 1.9], { thick: 0.15, lower: 0.1, fork: 0.19 });
      g.box(0.0, -1.1, s * 1.9 + (s > 0 ? 0.2 : -0.24), 0.62, -0.5, s * 1.9 + (s > 0 ? 0.24 : -0.2), METAL, { md: 0.15 });
      wheel(k.part('wheel' + n, { pivot: [0.3, -1.4, s * 1.9], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.36, 0.17);
    }
    const tw = k.part('tailwheel', { pivot: [-4.35, -0.5, 0], local: true });
    wheel(tw, 0, 0, 0, 0.13, 0.07);
    strut(tw, [0, 0, 0], [0.04, 0.34, 0], 0.04, M.STEEL, { md: 0.1 });
    // the propeller: four blades, a red spinner, a bright tip band
    const pr = k.part('propeller', { pivot: [3.55, -0.03, 0], local: true, voxel: 0.03125 });
    prop(pr, 1.7, 4, { chord: 0.34, mat: M.AC_PROP, tip: M.AC_YELLOW, hubR: 0.16, tipLen: 0.2 });
    spinner(pr, 0.0, 0.5, 0.26, RED);
    // ------------------------------------------------------------------ the bubble canopy and the pilot
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(0.65, 0.64, 0, 1.4, 0.55, 0.43, M.AC_CANOPY);
    cn.ell(0.65, 0.64, 0, 1.33, 0.5, 0.38, 0, { md: 0.3 });
    cn.carve(-1.0, -0.3, -1, 2.2, 0.5, 1);
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 0.25, 0.08, { hands: [[0.78, 0.22, -0.3], [0.85, 0.35, 0]], feet: 0.95, suit: M.AC_DRAB, helmet: M.AC_CREAM, visor: M.AC_BLACK });
    // ------------------------------------------------------------------ stores
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const rk = k.part('rockets' + n, { visibleWhen: 'store_rk' + n, voxel: 0.03125 });
      for (let i = 0; i < 5; i++) {
        rk.stamp(munitionRecipe('hvar'), 0.5 + 0.0, wy(2.2) - 0.3 - Math.abs(i - 2) * -0.01, s * (1.6 + i * 0.22));
        rk.box(-0.1, wy(2.2) - 0.18, s * (1.6 + i * 0.22) - 0.015, 0.2, wy(2.2) - 0.1, s * (1.6 + i * 0.22) + 0.015, DARK, { md: 0.06 });
      }
      for (const op of rk.ops) if (op.t === 'cyl' || op.t === 'fn') op.thin = true;
      store(k, 'bomb' + n, 'bomb' + n, 'mk82', [0.3, wy(1.15) - 0.45, s * 1.15]);
      pylon(body, 0.3, wy(1.15) - 0.1, wy(1.15) - 0.32, s * 1.15, { len: 0.9, mat: METAL, dark: DARK });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the cockpit: seat, side walls, canopy rails, rear-view mirror (1.4 cm voxels)
    const c = k.interior('cabin');
    c.box(-0.4, -0.38, -0.3, 1.15, -0.3, 0.3, M.COCKPIT_PANEL);                              // floor
    for (const s of [-1, 1]) {
      c.box(-0.45, -0.34, s * 0.34 - 0.03, 1.2, 0.5, s * 0.34 + 0.03, M.COCKPIT_TRIM);       // side walls
      c.box(-0.45, 0.46, s * 0.36 - 0.05, 1.7, 0.52, s * 0.36 + 0.05, M.COCKPIT_TRIM);      // sill with the canopy rail on it
      c.box(0.1, -0.1, s * 0.31 - 0.06, 0.85, 0.2, s * 0.31 + 0.06, M.COCKPIT_PANEL);       // side console
      for (let i = 0; i < 9; i++) c.box(0.14 + i * 0.075, 0.2, s * 0.31 - 0.03, 0.17 + i * 0.075, 0.23 + (i % 2) * 0.01, s * 0.31 + 0.03, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.03 });
    }
    // the throttle quadrant: three knobs, trim wheels in front of it
    c.box(0.15, 0.2, -0.36, 0.7, 0.23, -0.26, M.COCKPIT_PANEL);
    c.cyl('z', 0.3, 0.06, 0.07, 0.07, -0.37, -0.355, M.AC_BLACK, { md: 0.04 });
    c.cyl('z', 0.5, 0.06, 0.07, 0.07, -0.37, -0.355, M.AC_BLACK, { md: 0.04 });
    // seat: pan, back, armor plate behind, harness and head cushion
    c.box(-0.18, -0.12, -0.22, 0.42, -0.03, 0.22, M.SEAT_LEATHER);
    c.box(-0.22, -0.05, -0.24, -0.1, 0.75, 0.24, M.SEAT_LEATHER);
    c.box(-0.4, 0.0, -0.28, -0.3, 0.85, 0.28, M.STEEL_DARK);
    c.box(-0.2, 0.7, -0.16, -0.08, 0.84, 0.16, M.SEAT_FABRIC);
    for (const s of [-1, 1]) c.box(-0.12, 0.0, s * 0.18 - 0.02, 0.35, 0.65, s * 0.18 + 0.02, M.SEAT_FABRIC, { md: 0.04 });
    // the sliding canopy's frame, rear-view mirror on the front bow, and the gun sight
    const bow = (x, ry, rz, th = 0.03) => c.fn(x - th, 0.5, -rz - 0.05, x + th, 0.5 + ry + 0.05, rz + 0.05, (px, py, pz) => { const d = Math.sqrt(((py - 0.5) / ry) ** 2 + (pz / rz) ** 2); return py >= 0.5 && Math.abs(d - 1) < 0.08 ? M.COCKPIT_TRIM : 0; });
    bow(-0.4, 0.5, 0.4); bow(0.45, 0.55, 0.43, 0.025); bow(1.55, 0.3, 0.38, 0.045);
    c.box(1.45, 0.85, -0.1, 1.5, 0.98, 0.1, M.COCKPIT_TRIM);
    // ------------------------------------------------------------------ instrument panel (8 mm voxels): the six pack, engine dials, a reflector sight
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(1.5, 0.32, -0.42, 1.62, 0.76, 0.42, M.COCKPIT_PANEL);
    pn.box(1.5, 0.76, -0.4, 1.9, 0.82, 0.4, M.COCKPIT_TRIM);                                // coaming
    pn.box(1.38, 0.82, -0.12, 1.6, 0.86, 0.12, M.COCKPIT_TRIM);                             // sight base
    pn.box(1.41, 0.86, -0.1, 1.5, 0.89, 0.1, M.AC_BLACK);
    pn.box(1.49, 0.88, -0.1, 1.5, 1.04, -0.09, M.COCKPIT_TRIM, { thin: true });
    pn.box(1.49, 0.88, 0.09, 1.5, 1.04, 0.1, M.COCKPIT_TRIM, { thin: true });
    pn.box(1.405, 0.95, -0.002, 1.435, 0.97, 0.002, M.NEEDLE_ORANGE, { md: 0.02 });
    pn.box(1.405, 0.94, -0.025, 1.435, 0.96, -0.02, M.NEEDLE_ORANGE, { md: 0.02 });
    pn.box(1.405, 0.94, 0.02, 1.435, 0.96, 0.025, M.NEEDLE_ORANGE, { md: 0.02 });
    // gauges: ASI, attitude, altimeter on the top row; turn, compass, vertical speed, below; engine group to the right
    const g = (cy, cz, r) => gauge(pn, 1.5, cy, cz, r);
    g(0.66, -0.18, 0.06); g(0.66, 0, 0.06); g(0.66, 0.18, 0.06);
    g(0.5, -0.18, 0.055); g(0.5, 0, 0.055); g(0.5, 0.18, 0.055);
    g(0.62, -0.34, 0.045); g(0.48, -0.34, 0.045); g(0.62, 0.34, 0.045); g(0.48, 0.34, 0.045); g(0.36, 0.34, 0.04); g(0.36, -0.34, 0.04);
    for (let i = 0; i < 12; i++) pn.box(1.47, 0.34 + (i % 3) * 0.04, -0.38 + i * 0.065, 1.5, 0.36 + (i % 3) * 0.04, -0.36 + i * 0.065, i % 4 === 1 ? M.SWITCH_RED : i % 4 === 2 ? M.AC_YELLOW : M.SWITCH_GRAY, { md: 0.02 });
    pn.box(1.47, 0.78, -0.3, 1.5, 0.81, -0.26, M.NAV_GREEN, { md: 0.03 }); pn.box(1.47, 0.78, 0.26, 1.5, 0.81, 0.3, M.AC_RED, { md: 0.03 });
    // ------------------------------------------------------------------ the controls
    const st = k.interior('stick', { pivot: [0.7, -0.3, 0], local: true, voxel: 0.01 });
    st.cyl('y', 0, 0, 0.022, 0.022, 0, 0.52, M.STEEL_DARK);
    st.box(-0.05, 0.5, -0.035, 0.05, 0.6, 0.035, M.AC_BLACK);
    st.box(-0.02, 0.58, -0.04, 0.02, 0.62, 0.04, M.SWITCH_RED, { md: 0.01 });
    const th = k.interior('throttleLever', { pivot: [0.3, 0.23, -0.31], local: true, voxel: 0.01 });
    th.cyl('y', 0, 0, 0.014, 0.014, 0, 0.2, M.STEEL_DARK);
    th.ell(0, 0.22, 0, 0.035, 0.035, 0.035, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.14], ['pedalR', 0.14]]) {
      const p = k.interior(n, { pivot: [1.35, -0.25, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.07, -0.08, 0.02, 0.12, 0.08, M.STEEL_DARK);
    }
    needle(k.interior('nASI', { pivot: [1.496, 0.66, -0.18], local: true, voxel: 0.004 }), 0.05, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [1.496, 0.66, 0.18], local: true, voxel: 0.004 }), 0.05, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [1.496, 0.5, 0.18], local: true, voxel: 0.004 }), 0.045, M.NEEDLE_ORANGE);
    const ai = k.interior('attitude', { pivot: [1.5, 0.66, 0], local: true, voxel: 0.004 });
    const R = 0.055;
    ai.fn(-R, -R, -R, R, R, R, (x, y, z) => {
      if (x * x + y * y + z * z > R * R) return 0;
      if (Math.abs(y) < 0.003) return M.GAUGE_WHITE;
      return y > 0 ? M.SIDING_BLUE : M.BRICK_BROWN;
    });
  },
});
