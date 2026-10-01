import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle, wingPair } from '../builders/parts.js';
import { decal, camo, seams, seamsZ, rivets, navLights, pilot, fanFace, nozzle, gearLeg, store, pylon, rocketPod, roundelSide } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt, wingAt } from '../builders/surfaces.js';

/* Hammerhead A-12: a twin-engine close support jet built around a big gatling cannon. Straight wing, engines on pylons above and
   behind the wing, twin tails, a titanium bathtub around the pilot and a shark mouth on the nose. Slow, tough and happy to
   fly low; it carries the widest range of ordnance on the island. Body origin at the center of gravity, +x forward. */

const BASE = M.AC_GRAY, DARK = M.AC_GRAY_DARK, LIGHT = M.AC_GRAY_LIGHT, OLIVE = M.MIL_OLIVE, CAMO = M.MIL_CAMO_DARK;

const WR = wingDef([1.5, -0.28, 0.6], 7.3, 3.3, 2.1, 0.5, 0.45, 0.14, 0.1, 1);
const WL = wingDef([1.5, -0.28, -0.6], 7.3, 3.3, 2.1, 0.5, 0.45, 0.14, 0.1, -1);
const wy = (z) => wingAt(WR, Math.abs(z)).y;                         // wing mid plane at a spanwise station
const wingBottom = (z) => wy(z) - 0.18;
const FIN = { x: -4.4, y: 0.5, z: 2.95, chord: 2.3, tip: 1.45, height: 2.5, sweep: 0.8, thick: 0.1 };

/** Camouflage that keeps the airframe's underside pale: the same function paints the body and every movable part, so the patches run on across the hinges. */
const under = (x, y, z) => {
  const az = Math.abs(z);
  if (az > 0.75 && x < 1.7 && x > -2.3 && y < 0.5) return y < wy(az);
  if (az > 0.7 && az < 2.3 && x < 1.5 && y > 0.3) return y < 0.98;
  return y < 0.05;
};
const paintCamo = (r, box) => camo(r, box, [M.MIL_GRAY, CAMO, OLIVE], { scale: 1.7, seed: 31, under, underMat: LIGHT, soft: 0.04 });

export default defineAircraft({
  id: 'hammerhead',
  name: 'Hammerhead A-12',
  manufacturer: 'Fort Talon Aerospace',
  role: 'Attack jet',
  category: 'military',
  order: 7,
  difficulty: 3,
  tags: ['Gatling cannon', 'Rockets', 'Missiles', 'Bombs', 'Armored'],
  description: 'Built around a seven barrel cannon and a pilot who would rather be low. Twin engines, a straight wing that turns on a coin and a titanium tub around the cockpit. Rockets, missiles, cluster bombs and two tonnes of ordnance; slow enough to see what it is hitting.',
  voxel: 0.05,
  interiorVoxel: 0.016,
  lodLevels: 4,
  mass: { empty: 11300, fuel: 4400, payload: 110 },
  inertia: [54000, 188000, 172000],
  wing: { area: 46, span: 16.4, chord: 2.8, y: -0.2 },
  aero: {
    CL0: 0.12, CLa: 4.4, CLmax: 1.9, alphaStall: 0.404, CD0: 0.043, k: 0.074, CDflap: 0.06, CLflap: 0.55, Cmflap: -0.09, CLmaxFlap: 0.5, CDgear: 0.02, CDair: 0.07,
    Cm0: 0.04, Cma: -0.62, Cmq: -13, Clb: 0.085, Clp: -0.52, Cnb: 0.1, Cnr: -0.2, Cyb: 0.6, Cnda: 0.012,
    machDrag: 0.025, machCrit: 0.6, spin: 0.35, stallPitchDown: 0.12,
    control: { elevator: 0.62, aileron: 0.056, rudder: 0.045 },
  },
  propulsion: { type: 'jet', thrust: 82000, fuelBurn: 1.25, idleRpm: 40, spool: 0.55 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [5.15, -1.55, 0], radius: 0.32, k: 150000, c: 11000, steer: 0.5, cornering: 0.8, travel: 0.35 },
      { pos: [-0.7, -1.42, -2.3], radius: 0.45, k: 340000, c: 26000, brake: true, travel: 0.32 },
      { pos: [-0.7, -1.42, 2.3], radius: 0.45, k: 340000, c: 26000, brake: true, travel: 0.32 },
    ],
  },
  skids: [
    { p: [-6.8, 0.5, 0], kind: 'tail' }, { p: [7.7, -0.15, 0], kind: 'nose' }, { p: [0.8, -0.7, 8.35], kind: 'tip' }, { p: [0.8, -0.7, -8.35], kind: 'tip' },
    { p: [0.4, -0.95, 0], kind: 'belly' }, { p: [-3.6, -0.2, 0.9], kind: 'belly' }, { p: [-3.6, -0.2, -0.9], kind: 'belly' },
  ],
  limits: { vne: 215, maxG: 6.5, minG: 2.5, flapSpeed: 100, gearSpeed: 125, crashVs: 5.5 },
  cameras: { cockpit: [3.2, 1.38, 0], chase: { distance: 30, height: 6.5 }, near: { distance: 14.5, height: 3.4 } },
  hud: 'fighter',
  liveries: [
    { id: 'default', name: 'Euro one camouflage' },
    { id: 'desert', name: 'Desert strike', remap: { AC_GRAY: 'MIL_TAN', AC_GRAY_DARK: 'AC_DRAB', MIL_CAMO_DARK: 'MIL_OLIVE', AC_GRAY_LIGHT: 'AC_CREAM' } },
    { id: 'tiger', name: 'Tiger meet', remap: { AC_GRAY: 'AC_BLACK', AC_GRAY_DARK: 'AC_GRAY_DARK', MIL_CAMO_DARK: 'AC_BLACK', AC_GRAY_LIGHT: 'AC_GRAY' } },
  ],
  stations: [
    { id: 'agmL', pos: [0.2, -0.62, -1.5], kind: 'pylon' }, { id: 'agmR', pos: [0.2, -0.62, 1.5], kind: 'pylon' },
    { id: 'cbL', pos: [0.2, -0.55, -2.5], kind: 'pylon' }, { id: 'cbR', pos: [0.2, -0.55, 2.5], kind: 'pylon' },
    { id: 'podL', pos: [0.1, -0.5, -3.5], kind: 'pylon' }, { id: 'podR', pos: [0.1, -0.5, 3.5], kind: 'pylon' },
    { id: 'aamL', pos: [0.1, -0.4, -4.6], kind: 'rail' }, { id: 'aamR', pos: [0.1, -0.4, 4.6], kind: 'rail' },
    { id: 'bombL', pos: [1.9, -0.85, -0.72], kind: 'rack' }, { id: 'bombR', pos: [1.9, -0.85, 0.72], kind: 'rack' },
  ],
  weapons: [
    { id: 'cannon', name: 'GAU-30 seven barrel cannon', type: 'gun', munition: 'cannon30', ammo: 1150, rate: 65, muzzle: [8.0, -0.16, 0], spread: 0.0045, flash: 0.7 },
    { id: 'pods', name: '70 mm rocket pods', type: 'rocket', munition: 'hvar', stations: ['podL', 'podR'], rounds: 19, muzzleX: 1.0, tube: 0.1 },
    { id: 'agm', name: 'AGM-9 air to ground missile', type: 'missile', munition: 'agm', stations: ['agmL', 'agmR'] },
    { id: 'aam', name: 'SW-9 heat seeker', type: 'missile', munition: 'aam', stations: ['aamL', 'aamR'], range: 9000 },
    { id: 'bombs', name: 'GP-500 bomb', type: 'bomb', munition: 'mk82', stations: ['bombL', 'bombR'] },
    { id: 'cluster', name: 'Cluster bomb', type: 'bomb', munition: 'cluster', stations: ['cbL', 'cbR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.75 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.75 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudderL', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'rudderR', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'brakeL', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: -0.95 },
    { part: 'brakeR', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: -0.95 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: 1.65, offset: -1.65 },
    { part: 'gearL', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: -1.55, offset: 1.55 },
    { part: 'gearR', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: -1.55, offset: 1.55 },
    { part: 'gearNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gearL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'gearR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gatling', type: 'rotate', axis: [1, 0, 0], channel: 'gunSpin', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.3 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.3 },
    { part: 'throttleL', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.45 },
    { part: 'throttleR', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.45 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0105, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPML', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.046, offset: -2.3 },
    { part: 'nRPMR', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.046, offset: -2.3 },
    { part: 'attitude', type: 'rotate', axis: [0, 0, 1], channel: 'pitchGauge', gain: 1 },
    { part: 'attitude', type: 'rotate', axis: [1, 0, 0], channel: 'rollGauge', gain: -1 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage: a long slab-sided body with the cockpit high and forward
    body.loft('x', [
      { a: -6.7, c1: 0.62, c2: 0, r1: 0.13, r2: 0.13, n: 2.2 },
      { a: -6.0, c1: 0.58, c2: 0, r1: 0.3, r2: 0.26, n: 2.3 },
      { a: -4.6, c1: 0.42, c2: 0, r1: 0.56, r2: 0.46, n: 2.4 },
      { a: -2.4, c1: 0.24, c2: 0, r1: 0.78, r2: 0.66, n: 2.5 },
      { a: 0.0, c1: 0.18, c2: 0, r1: 0.84, r2: 0.72, n: 2.6 },
      { a: 2.0, c1: 0.16, c2: 0, r1: 0.82, r2: 0.7, n: 2.6 },
      { a: 3.8, c1: 0.06, c2: 0, r1: 0.7, r2: 0.6, n: 2.5 },
      { a: 5.4, c1: -0.04, c2: 0, r1: 0.58, r2: 0.5, n: 2.4 },
      { a: 6.8, c1: -0.12, c2: 0, r1: 0.42, r2: 0.36, n: 2.2 },
      { a: 7.55, c1: -0.15, c2: 0, r1: 0.25, r2: 0.23, n: 2.1 },
      { a: 7.7, c1: -0.15, c2: 0, r1: 0.18, r2: 0.18, n: 2 },
    ], BASE);
    // dorsal spine behind the canopy and a ventral gun fairing
    body.loft('x', [
      { a: -4.4, c1: 0.92, c2: 0, r1: 0.1, r2: 0.2, n: 2.4 },
      { a: -1.8, c1: 1.0, c2: 0, r1: 0.14, r2: 0.34, n: 2.4 },
      { a: 1.8, c1: 0.98, c2: 0, r1: 0.14, r2: 0.34, n: 2.4 },
      { a: 2.8, c1: 0.86, c2: 0, r1: 0.1, r2: 0.3, n: 2.4 },
    ], BASE);
    body.loft('x', [
      { a: 5.5, c1: -0.45, c2: 0, r1: 0.14, r2: 0.26, n: 2.4 },
      { a: 7.0, c1: -0.4, c2: 0, r1: 0.2, r2: 0.27, n: 2.4 },
      { a: 7.9, c1: -0.18, c2: 0, r1: 0.12, r2: 0.12, n: 2.2 },
    ], BASE);
    // the cockpit well: the canopy closes it
    body.carve(2.55, 0.4, -0.46, 5.25, 1.1, 0.46);
    // ------------------------------------------------------------------ the wing
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, BASE);
    for (const s of [-1, 1]) {
      // drooped tips
      body.wing([1.0, wy(7.9), s * 7.9], 0.55, 2.1, 1.7, 0.2, -0.75, 0.1, 0.08, s, BASE);
      // wing root fillets
      body.wing([1.7, -0.34, s * 0.45], 1.1, 3.6, 3.0, 0.1, 0.1, 0.12, 0.12, s, BASE);
    }
    // ------------------------------------------------------------------ engines: pods on pylons above and behind the wing
    for (const s of [-1, 1]) {
      const ez = s * 1.45, ey = 0.98;
      body.loft('x', [
        { a: -5.35, c1: ey, c2: ez, r1: 0.5, r2: 0.5, n: 2 },
        { a: -4.7, c1: ey, c2: ez, r1: 0.57, r2: 0.57, n: 2 },
        { a: -3.0, c1: ey, c2: ez, r1: 0.64, r2: 0.64, n: 2 },
        { a: -0.4, c1: ey, c2: ez, r1: 0.67, r2: 0.67, n: 2 },
        { a: 0.9, c1: ey, c2: ez, r1: 0.65, r2: 0.65, n: 2 },
        { a: 1.3, c1: ey, c2: ez, r1: 0.63, r2: 0.63, n: 2 },
      ], BASE);
      body.box(-4.7, 0.5, s * 0.62 - 0.2, 0.7, 1.28, s * 0.62 + 0.2, BASE);                     // the pylon web to the fuselage
      body.box(-4.6, 0.4, s * 0.96 - 0.2, 0.6, 0.6, s * 0.96 + 0.2, BASE);
      // cooling scoops and access doors
      for (const x of [-3.4, -2.2, -1.0]) body.box(x, ey + 0.58, ez - 0.1, x + 0.55, ey + 0.66, ez + 0.1, DARK, { md: 0.12 });
    }
    // ------------------------------------------------------------------ the tail: a stabilizer with a fin at each end
    for (const s of [-1, 1]) {
      body.wing([-4.35, 0.78, s * 0.3], 2.65, 1.95, 1.25, 0.4, 0.0, 0.09, 0.07, s, BASE);
      body.loft('y', finStations({ ...FIN, z: s * FIN.z }), BASE, { thin: true });
      // tip fairings on the tail ends and the fin caps
      body.box(-5.5, 0.62, s * 2.95 - 0.14, -3.9, 0.92, s * 2.95 + 0.14, BASE);
      body.box(FIN.x - FIN.sweep - FIN.tip - 0.1, FIN.y + FIN.height - 0.04, s * 2.95 - 0.12, FIN.x - FIN.sweep + 0.1, FIN.y + FIN.height + 0.1, s * 2.95 + 0.12, DARK, { md: 0.12 });
    }
    // ------------------------------------------------------------------ the gear pods under the wing, and their doors
    for (const s of [-1, 1]) {
      body.loft('x', [
        { a: -2.9, c1: -0.5, c2: s * 2.3, r1: 0.08, r2: 0.1, n: 2.3 },
        { a: -2.0, c1: -0.56, c2: s * 2.3, r1: 0.26, r2: 0.28, n: 2.3 },
        { a: -0.9, c1: -0.6, c2: s * 2.3, r1: 0.37, r2: 0.39, n: 2.3 },
        { a: 0.3, c1: -0.6, c2: s * 2.3, r1: 0.36, r2: 0.38, n: 2.3 },
        { a: 1.1, c1: -0.55, c2: s * 2.3, r1: 0.26, r2: 0.28, n: 2.3 },
        { a: 1.7, c1: -0.5, c2: s * 2.3, r1: 0.1, r2: 0.12, n: 2.3 },
      ], BASE);
      body.box(-1.7, -0.98, s * 2.3 - 0.16, 0.2, -0.9, s * 2.3 + 0.16, DARK, { md: 0.15 });
    }
    // ------------------------------------------------------------------ nose: radome, gun port, shark mouth
    body.paint(6.5, -0.45, -0.45, 7.8, 0.3, 0.45, (x) => (x > 6.75 ? DARK : 0), { md: 0.5 });
    body.cyl('x', -0.16, 0, 0.17, 0.17, 7.65, 8.05, M.STEEL_DARK);
    body.cyl('x', -0.16, 0, 0.13, 0.13, 7.62, 8.06, 0);
    body.cyl('x', -0.16, 0, 0.2, 0.2, 7.6, 7.66, M.AC_BLACK, { md: 0.12 });
    // ------------------------------------------------------------------ paint and detail
    paintCamo(body, [-6.8, -1.2, -8.5, 8.2, 3.2, 8.5]);
    const mouth = (x, y, z) => {
      if (x < 5.55 || x > 7.5 || Math.abs(z) < 0.12) return 0;
      const u = (x - 5.55) / 1.95, ym = -0.17 - 0.03 * u, h = 0.12 * (1 - 0.5 * u), yu = ym + h, yl = ym - h;
      if (y > yu || y < yl) return y > yu + 0.016 || y < yl - 0.016 ? 0 : M.AC_BLACK;           // the lip line
      const ph = ((x * 4.6) % 1 + 1) % 1, tooth = 0.075 * (1 - Math.abs(2 * ph - 1)) * (1 - 0.3 * u);
      if (y > yu - tooth) return M.AC_WHITE;
      const ph2 = (((x + 0.11) * 4.6) % 1 + 1) % 1, tooth2 = 0.06 * (1 - Math.abs(2 * ph2 - 1)) * (1 - 0.3 * u);
      if (y < yl + tooth2) return M.AC_WHITE;
      return M.AC_RED;
    };
    body.paint(5.5, -0.5, -0.6, 7.55, 0.05, 0.6, mouth, { thin: true, md: 0.1 });
    for (const s of [-1, 1]) {
      roundelSide(body, 5.2, 0.12, s > 0 ? 0.3 : -0.7, s > 0 ? 0.7 : -0.3, [[0.11, M.AC_WHITE], [0.075, M.AC_YELLOW], [0.04, M.AC_BLACK]]);
      // national markings, a stripe on each fin and a tail code
      body.paint(FIN.x - FIN.sweep - FIN.tip - 0.2, FIN.y + 1.5, s * FIN.z - 0.2, FIN.x + 0.2, FIN.y + 1.75, s * FIN.z + 0.2, (x, y, z) => (x > -6.2 ? M.AC_YELLOW : 0), { thin: true, md: 0.12 });
    }
    decal(body, 'AF 78-0612', { x: -2.4, y: 0.82, side: 1, px: 0.05, mat: LIGHT, z0: 1.95, z1: 2.4 });
    decal(body, 'TALON', { x: -2.4, y: 0.82, side: -1, px: 0.05, mat: M.AC_YELLOW, z0: 1.95, z1: 2.4 });
    decal(body, 'TF', { x: -5.7, y: 1.5, side: 1, px: 0.11, mat: LIGHT, z0: 2.98, z1: 3.3 });
    decal(body, 'TF', { x: -5.7, y: 1.5, side: -1, px: 0.11, mat: LIGHT, z0: 2.98, z1: 3.3 });
    decal(body, 'AF 12', { x: 4.4, y: 0.0, side: 1, px: 0.04, mat: M.AC_WHITE, z0: 0.3, z1: 0.8 });
    seams(body, [-6.0, -0.4, -0.8, 6.8, 0.9, 0.8], [-5.2, -4.0, -2.9, -1.2, 0.2, 1.6, 2.5, 5.5, 6.3], { w: 0.014, mat: DARK, ymin: -0.4 });
    seamsZ(body, [-2.3, -0.6, -8.4, 1.7, 0.7, 8.4], [1.3, 2.3, 3.4, 4.8, 6.2], { w: 0.012, mat: DARK, y0: -0.6, y1: 0.7 });
    seams(body, [-2.3, -0.6, -8.4, 1.7, 0.4, 8.4], [-1.7, -0.7, 0.4], { w: 0.012, mat: DARK, ymin: -0.6, ymax: 0.4 });
    rivets(body, [-5.8, 0.55, -0.55, 2.4, 1.15, 0.55], 0.28, 0.28, { mat: DARK, ymin: 0.6 });
    rivets(body, [-2.0, -0.6, -7.7, 1.45, 0.4, 7.7], 0.3, 0.3, { mat: DARK, ymin: -0.2, ymax: 0.4 });
    // vents, antennas, pitot tubes, receptacle door, chaff dispensers and lights
    body.box(-5.3, 0.9, -0.12, -4.9, 1.2, 0.12, DARK, { md: 0.1 });
    for (const x of [-2.9, -2.6, 0.0, 0.3]) body.box(x, 1.12, -0.02, x + 0.14, 1.5, 0.02, DARK, { md: 0.1 });
    body.box(6.2, 0.38, -0.04, 6.34, 0.7, 0.04, DARK, { md: 0.1 });
    strut(body, [6.3, -0.08, 0.4], [7.2, -0.12, 0.66], 0.03, M.AC_METAL, { md: 0.12 });
    strut(body, [6.3, -0.08, -0.4], [7.2, -0.12, -0.66], 0.03, M.AC_METAL, { md: 0.12 });
    body.box(5.7, 0.42, -0.2, 6.4, 0.46, 0.2, DARK, { md: 0.1 });
    for (const s of [-1, 1]) body.box(-3.9, -0.3, s * 0.3, -3.4, -0.2, s * 0.5, DARK, { md: 0.1 });
    navLights(body, { left: [0.9, -0.62, -8.3], right: [0.9, -0.62, 8.3], tail: [-6.78, 0.62, 0], beacon: [-3.0, 1.34, 0] });
    for (const s of [-1, 1]) body.box(FIN.x - FIN.sweep * 0.9 - 0.6, FIN.y + FIN.height + 0.04, s * FIN.z - 0.04, FIN.x - FIN.sweep * 0.9 - 0.3, FIN.y + FIN.height + 0.12, s * FIN.z + 0.04, M.STROBE, { md: 0.12 });
    // exhaust stains behind the nozzles and the gun port
    body.paint(-6.2, 0.2, -2.2, -3.4, 1.6, 2.2, (x, y, z) => ((Math.sin(x * 9 + z * 3) > 0.2 && x < -4.6 && Math.abs(Math.abs(z) - 1.45) < 0.7) ? DARK : 0), { thin: true, md: 0.12 });
    // pylon fittings under the wing, one per station
    for (const s of [-1, 1]) for (const [z, x, len] of [[1.5, 0.2, 1.3], [2.5, 0.2, 1.3], [3.5, 0.1, 1.5], [4.6, 0.1, 1.1]]) {
      pylon(body, x, wingBottom(z) + 0.06, wingBottom(z) - 0.16, s * z, { len, mat: BASE, dark: DARK });
    }
    for (const s of [-1, 1]) body.box(1.3, -0.82, s * 0.72 - 0.16, 2.5, -0.58, s * 0.72 + 0.16, DARK, { md: 0.12 });   // bomb racks on the belly
    // engines: intake, fan, nozzle
    for (const s of [-1, 1]) {
      fanFace(body, 1.3, 0.98, s * 1.45, 0.55, { depth: 0.95, rec: 0.22 });
      nozzle(body, -5.42, 0.98, s * 1.45, 0.46, { len: 0.8 });
    }
    // ------------------------------------------------------------------ movable surfaces, cut out of the airframe so the gaps are real
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      const fl = wingSurface(k, body, 'flap' + n, W, { z0: 0.9, z1: 3.7, frac: 0.3, mat: BASE });
      paintCamo(fl, [-2.4, -0.6, Math.min(0.7 * s, 3.8 * s), 1.7, 0.7, Math.max(0.7 * s, 3.8 * s)]);
      seams(fl, [-2.4, -0.6, Math.min(0.7 * s, 3.8 * s), 1.7, 0.7, Math.max(0.7 * s, 3.8 * s)], [-1.9, -1.4], { w: 0.01, mat: DARK });
      const ail = wingSurface(k, body, 'aileron' + n, W, { z0: 3.9, z1: 7.2, frac: 0.3, mat: BASE });
      paintCamo(ail, [-2.4, -0.6, Math.min(3.8 * s, 7.3 * s), 1.7, 0.7, Math.max(3.8 * s, 7.3 * s)]);
      // speed brake plates: the outer wing top, up when the airbrake is out
      const br = k.part('brake' + n, { pivot: [-0.15, wy(5.2) + 0.12, s * 5.2], visibleWhen: 'airbrake' });
      br.box(-0.75, wy(5.2) + 0.08, s * 5.2 - 0.9, -0.15, wy(5.2) + 0.14, s * 5.2 + 0.9, DARK, { thin: true });
      const stab = s < 0 ? wingDef([-4.35, 0.78, -0.3], 2.65, 1.95, 1.25, 0.4, 0.0, 0.09, 0.07, -1) : wingDef([-4.35, 0.78, 0.3], 2.65, 1.95, 1.25, 0.4, 0.0, 0.09, 0.07, 1);
      const el = wingSurface(k, body, 'elevator' + n, stab, { z0: 0.5, z1: 2.9, frac: 0.34, mat: BASE });
      paintCamo(el, [-6.6, 0.6, Math.min(0.3 * s, 3.0 * s), -4.3, 1.0, Math.max(0.3 * s, 3.0 * s)]);
      // rudders: the aft third of each fin
      const f = { ...FIN, z: s * FIN.z };
      const hinge = finAt(f, FIN.y + 1.2), hx = hinge.te + hinge.chord * 0.32;
      const rd = loftSurface(k, body, 'rudder' + n, {
        stations: finStations(f), axis: 'y', mat: BASE, box: [-7.4, 0.45, s * FIN.z - 0.25, -3.4, 3.1, s * FIN.z + 0.25],
        aft: (x, y) => { const a = finAt(f, y); return x < a.te + a.chord * 0.32 && y > FIN.y + 0.04; },
        pivot: [hx, FIN.y + 1.2, s * FIN.z],
      });
      paintCamo(rd, [-7.4, 0.45, s * FIN.z - 0.25, -3.4, 3.1, s * FIN.z + 0.25]);
    }
    // ------------------------------------------------------------------ landing gear
    const gn = k.part('gearNose', { pivot: [5.15, -0.55, 0], visibleWhen: 'gearOut' });
    gearLeg(gn, [5.1, -0.5, 0], [5.15, -1.55, 0], { thick: 0.13, lower: 0.09, fork: 0.2 });
    gn.box(5.0, -1.0, 0.1, 5.4, -0.7, 0.14, M.HEADLIGHT, { md: 0.1 });
    gn.box(4.95, -0.9, -0.12, 5.05, -0.6, 0.12, DARK, { md: 0.12 });
    wheel(k.part('wheelNose', { pivot: [5.15, -1.55, 0], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.32, 0.2);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [-0.7, -0.5, s * 2.3], visibleWhen: 'gearOut' });
      gearLeg(g, [-0.7, -0.5, s * 2.3], [-0.7, -1.42, s * 2.3], { thick: 0.17, lower: 0.12, fork: 0.28, drag: [-1.5, -0.5, s * 2.3] });
      g.box(-1.05, -1.1, s * 2.3 + 0.2, -0.35, -0.8, s * 2.3 + 0.24, DARK, { md: 0.15 });
      wheel(k.part('wheel' + n, { pivot: [-0.7, -1.42, s * 2.3], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.45, 0.26);
    }
    // ------------------------------------------------------------------ the gun: seven barrels that turn when it fires
    const gat = k.part('gatling', { pivot: [7.1, -0.16, 0], local: true });
    gat.cyl('x', 0, 0, 0.13, 0.13, 0.0, 0.18, M.STEEL_DARK);
    gat.cyl('x', 0, 0, 0.12, 0.12, 0.6, 0.76, M.STEEL_DARK);
    gat.cyl('x', 0, 0, 0.05, 0.05, 0.0, 0.9, M.STEEL);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      gat.cyl('x', Math.sin(a) * 0.085, Math.cos(a) * 0.085, 0.032, 0.032, 0.0, 0.92, M.AC_BLACK);
      gat.cyl('x', Math.sin(a) * 0.085, Math.cos(a) * 0.085, 0.036, 0.036, 0.88, 0.94, M.STEEL_BRIGHT, { md: 0.1 });
    }
    const mf = k.part('muzzleFlash', { pivot: [8.05, -0.16, 0], local: true, visibleWhen: 'muzzle' });
    mf.box(0.0, -0.1, -0.1, 0.5, 0.1, 0.1, M.STROBE);
    mf.box(0.0, -0.3, -0.04, 0.3, 0.3, 0.04, M.RWY_LIGHT_AMBER, { md: 0.2 });
    mf.box(0.0, -0.04, -0.3, 0.3, 0.04, 0.3, M.RWY_LIGHT_AMBER, { md: 0.2 });
    // ------------------------------------------------------------------ the canopy and the pilot
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(3.95, 0.98, 0, 1.75, 0.72, 0.5, M.AC_CANOPY);
    cn.ell(3.95, 0.98, 0, 1.68, 0.66, 0.45, 0, { md: 0.4 });
    cn.carve(1.8, -0.2, -1, 5.9, 0.78, 1);
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 3.1, 0.6, { hands: [[3.6, 0.88, -0.33], [3.74, 0.93, 0]], feet: 3.75, suit: M.AC_OLIVE, helmet: M.AC_WHITE, lean: 0.06 });
    // ------------------------------------------------------------------ stores: only drawn while their station is loaded
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      store(k, 'aam' + n, 'aam' + n, 'aam', [0.1, wingBottom(4.6) - 0.28, s * 4.6]);
      store(k, 'agm' + n, 'agm' + n, 'agm', [0.2, wingBottom(1.5) - 0.34, s * 1.5]);
      store(k, 'cluster' + n, 'cb' + n, 'cluster', [0.2, wingBottom(2.5) - 0.36, s * 2.5]);
      store(k, 'bomb' + n, 'bomb' + n, 'mk82', [1.9, -0.86 - 0.17, s * 0.72]);
      const p = k.part('pod' + n, { visibleWhen: 'store_pod' + n });
      rocketPod(p, 0.1, wingBottom(3.5) - 0.38, s * 3.5, { len: 1.6, radius: 0.21 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ cockpit tub (1.6 cm voxels): armor plate, consoles, seat, canopy bows
    const c = k.interior('cabin');
    c.box(2.62, 0.34, -0.45, 5.15, 0.4, 0.45, M.COCKPIT_PANEL);                          // floor
    for (const s of [-1, 1]) {
      c.box(2.62, 0.38, s * 0.45 - 0.05, 5.15, 0.84, s * 0.45 + 0.05, M.AC_OLIVE);       // armor tub walls
      c.box(2.62, 0.84, s * 0.44 - 0.07, 5.15, 0.9, s * 0.44 + 0.07, M.COCKPIT_TRIM);    // sill
      // side consoles with switch banks, the left one carries the throttles
      c.box(3.05, 0.4, s * 0.34 - 0.12, 4.2, 0.62, s * 0.34 + 0.12, M.COCKPIT_PANEL);
      c.box(3.05, 0.62, s * 0.34 - 0.12, 4.2, 0.66, s * 0.34 + 0.12, M.COCKPIT_TRIM);
      for (let i = 0; i < 24; i++) {
        const x = 3.08 + (i >> 1) * 0.095, z = s * 0.34 + (i & 1 ? 0.045 : -0.045);
        c.box(x, 0.66, z - 0.013, x + 0.03, 0.69 + (i % 3) * 0.008, z + 0.013, i % 5 === 1 ? M.SWITCH_RED : i % 7 === 3 ? M.AC_YELLOW : M.SWITCH_GRAY, { md: 0.03 });
      }
      for (let i = 0; i < 5; i++) c.cyl('y', 3.12 + i * 0.22, s * 0.34, 0.018, 0.018, 0.66, 0.71, i % 2 ? M.AC_METAL : M.AC_BLACK, { md: 0.04 });
      c.box(3.1, 0.63, s * 0.34 - 0.1, 4.15, 0.665, s * 0.34 - 0.095, M.AC_YELLOW, { md: 0.03 });
    }
    // bucket seat with an armored back, a headbox, harness and the ejection handle between the knees
    c.box(2.78, 0.5, -0.24, 3.28, 0.6, 0.24, M.SEAT_FABRIC);
    c.box(2.7, 0.55, -0.26, 2.82, 1.3, 0.26, M.SEAT_FABRIC);
    c.box(2.64, 1.2, -0.17, 2.82, 1.52, 0.17, M.COCKPIT_TRIM);
    c.box(2.8, 1.45, -0.2, 2.9, 1.55, 0.2, M.AC_GRAY_DARK, { md: 0.04 });
    for (const s of [-1, 1]) { c.box(2.82, 0.6, s * 0.26 - 0.015, 3.3, 0.9, s * 0.26 + 0.015, M.SEAT_FABRIC, { md: 0.04 }); c.box(2.84, 0.62, s * 0.2 - 0.03, 3.0, 1.1, s * 0.2 + 0.03, M.AC_BLACK, { md: 0.04 }); }
    c.box(3.1, 0.6, -0.08, 3.28, 0.65, 0.08, M.AC_YELLOW, { md: 0.04 });
    // canopy: windshield bow, a center arch and the rear bow, drawn as elliptical rings
    const bow = (x, ry, rz, th = 0.035, cy = 0.9) => c.fn(x - th, cy - 0.05, -rz - 0.06, x + th, cy + ry + 0.06, rz + 0.06, (px, py, pz) => {
      const d = Math.sqrt(((py - cy) / ry) ** 2 + (pz / rz) ** 2);
      return py >= cy && Math.abs(d - 1) < 0.07 ? M.COCKPIT_TRIM : 0;
    });
    bow(2.62, 0.72, 0.5); bow(4.85, 0.58, 0.5, 0.05);
    c.box(2.62, 0.88, -0.5, 4.9, 0.92, -0.46, M.COCKPIT_TRIM); c.box(2.62, 0.88, 0.46, 4.9, 0.92, 0.5, M.COCKPIT_TRIM);
    // rudder pedals and the stick well
    c.box(4.3, 0.36, -0.3, 4.9, 0.5, 0.3, M.COCKPIT_PANEL);
    // ------------------------------------------------------------------ instrument panel and HUD (8 mm voxels)
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(4.85, 0.7, -0.48, 4.98, 1.14, 0.48, M.COCKPIT_TRIM);
    pn.box(4.62, 1.14, -0.5, 5.1, 1.2, 0.5, M.COCKPIT_PANEL);                           // glare shield
    pn.box(4.7, 1.2, -0.22, 5.0, 1.24, 0.22, M.COCKPIT_PANEL);
    pn.box(4.72, 1.24, -0.2, 4.78, 1.52, -0.19, M.COCKPIT_PANEL, { thin: true });        // combiner frame
    pn.box(4.72, 1.24, 0.19, 4.78, 1.52, 0.2, M.COCKPIT_PANEL, { thin: true });
    pn.box(4.7, 1.5, -0.2, 4.8, 1.54, 0.2, M.COCKPIT_PANEL);
    pn.box(4.72, 1.28, -0.2, 4.78, 1.3, 0.2, M.COCKPIT_PANEL, { thin: true });
    const mfd = (z, y, w, h) => { pn.box(4.82, y - h / 2 - 0.012, z - w / 2 - 0.012, 4.85, y + h / 2 + 0.012, z + w / 2 + 0.012, DARK); pn.box(4.812, y - h / 2, z - w / 2, 4.84, y + h / 2, z + w / 2, M.GAUGE_FACE); };
    const line = (x0, y0, z0, x1, y1, z1, m) => pn.box(x0, y0, z0, x1, y1, z1, m, { thin: true, md: 0.02 });
    mfd(-0.3, 0.9, 0.24, 0.2); mfd(0, 0.9, 0.24, 0.2); mfd(0.3, 0.9, 0.24, 0.2);
    for (let i = 1; i <= 3; i++) line(4.81, 0.9 - 0.004, -0.3 - 0.11 + i * 0.05, 4.812, 0.9 + 0.004, -0.3 - 0.11 + i * 0.05, M.NAV_GREEN);                     // a radar scope's range lines
    line(4.81, 0.82, -0.38, 4.812, 0.98, -0.38, M.NAV_GREEN); line(4.81, 0.8, -0.3, 4.812, 0.804, -0.18, M.NAV_GREEN);
    for (let i = 0; i < 8; i++) line(4.81, 0.82 + 0.02 * (i % 3), 0.2 + i * 0.03, 4.812, 0.9 + 0.02 * ((i * 5) % 4), 0.206 + i * 0.03, i === 5 ? M.AC_YELLOW : M.NAV_GREEN);       // engine and fuel bars
    for (let i = 0; i < 6; i++) line(4.81, 0.84 + i * 0.026, -0.05, 4.812, 0.846 + i * 0.026, 0.05, i < 4 ? M.NAV_GREEN : M.AC_YELLOW);
    gauge(pn, 4.85, 0.78, -0.4, 0.045); gauge(pn, 4.85, 0.78, -0.27, 0.045); gauge(pn, 4.85, 0.78, 0.27, 0.045); gauge(pn, 4.85, 0.78, 0.4, 0.045);
    pn.box(4.82, 0.74, -0.09, 4.85, 1.06 - 0.26, 0.09, DARK);                          // the standby attitude well
    for (let i = 0; i < 10; i++) pn.box(4.82, 1.07, -0.2 + i * 0.04, 4.85, 1.1, -0.18 + i * 0.04, i % 4 === 2 ? M.SWITCH_RED : i % 4 === 0 ? M.AC_YELLOW : M.SWITCH_GRAY, { md: 0.02 });      // warning lights
    for (let i = 0; i < 12; i++) pn.box(4.82, 0.71, -0.4 + i * 0.07, 4.85, 0.74, -0.38 + i * 0.07, i % 5 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    // ------------------------------------------------------------------ controls and needles
    const stick = k.interior('stick', { pivot: [3.74, 0.4, 0], local: true, voxel: 0.012 });
    stick.cyl('y', 0, 0, 0.024, 0.024, 0, 0.42, M.COCKPIT_TRIM);
    stick.box(-0.04, 0.4, -0.04, 0.05, 0.54, 0.04, M.AC_BLACK);
    stick.box(-0.03, 0.5, -0.05, 0.0, 0.53, 0.05, M.SWITCH_RED, { md: 0.012 });
    for (const [n, z] of [['throttleL', -0.37], ['throttleR', -0.29]]) {
      const t = k.interior(n, { pivot: [3.6, 0.66, z], local: true, voxel: 0.012 });
      t.cyl('y', 0, 0, 0.018, 0.018, 0, 0.2, M.COCKPIT_TRIM);
      t.box(-0.05, 0.18, -0.025, 0.05, 0.26, 0.025, M.AC_BLACK);
    }
    for (const [n, z] of [['pedalL', -0.16], ['pedalR', 0.16]]) {
      const p = k.interior(n, { pivot: [4.7, 0.42, z], local: true, voxel: 0.012 });
      p.box(-0.02, -0.06, -0.08, 0.02, 0.14, 0.08, M.STEEL_DARK);
    }
    needle(k.interior('nASI', { pivot: [4.846, 0.78, -0.4], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [4.846, 0.78, -0.27], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    needle(k.interior('nRPML', { pivot: [4.846, 0.78, 0.27], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    needle(k.interior('nRPMR', { pivot: [4.846, 0.78, 0.4], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    const ai = k.interior('attitude', { pivot: [4.85, 0.9, 0.0], local: true, voxel: 0.004 });
    const R = 0.05;
    ai.fn(-R, -R, -R, R, R, R, (x, y, z) => {
      if (x * x + y * y + z * z > R * R) return 0;
      if (Math.abs(y) < 0.0028) return M.GAUGE_WHITE;
      return y > 0 ? M.SIDING_BLUE : M.BRICK_BROWN;
    });
  },
});
