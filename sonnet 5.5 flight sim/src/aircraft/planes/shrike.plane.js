import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { wheel, ringYZ, gauge, needle } from '../builders/parts.js';
import { decal, decalTop, camo, seams, seamsZ, rivets, navLights, nozzle, gearLeg, store, pylon, rocketPod, roundel, roundelSide } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Shrike F-9: a single-engine light fighter with a relaxed-stability airframe, a fly-by-wire G limiter and an afterburning
   turbofan. Sidestick, bubble canopy, HUD. Built for speed and turn rate; unforgiving on the approach.
   Body origin is the center of gravity, +x forward. Pilot eye is inside the bubble at [2.75, 0.85, 0]. */

const GRAY = M.AC_GRAY, LIGHT = M.AC_GRAY_LIGHT, DARK = M.AC_GRAY_DARK, BLACK = M.AC_BLACK;

const WNG = (s) => wingDef([1.7, -0.1, s * 0.55], 4.4, 5.0, 1.3, 3.6, 0.0, 0.045, 0.035, s);
const FIN = { x: -4.3, y: 0.55, chord: 3.6, tip: 1.4, height: 2.6, sweep: 1.9, thick: 0.11 };
const FUS = [
  { a: -8.1, c1: 0.05, c2: 0, r1: 0.4, r2: 0.4, n: 2.2 },
  { a: -7.5, c1: 0.05, c2: 0, r1: 0.5, r2: 0.5, n: 2.3 },
  { a: -6.0, c1: 0.0, c2: 0, r1: 0.62, r2: 0.68, n: 2.5 },
  { a: -3.0, c1: 0.05, c2: 0, r1: 0.72, r2: 0.84, n: 2.6 },
  { a: -0.5, c1: 0.1, c2: 0, r1: 0.78, r2: 0.88, n: 2.6 },
  { a: 1.5, c1: 0.12, c2: 0, r1: 0.7, r2: 0.8, n: 2.5 },
  { a: 3.2, c1: 0.12, c2: 0, r1: 0.6, r2: 0.62, n: 2.4 },
  { a: 5.0, c1: 0.1, c2: 0, r1: 0.44, r2: 0.44, n: 2.2 },
  { a: 6.4, c1: 0.05, c2: 0, r1: 0.24, r2: 0.24, n: 2 },
  { a: 7.05, c1: 0.0, c2: 0, r1: 0.04, r2: 0.04, n: 2 },
];

export default defineAircraft({
  id: 'shrike',
  name: 'Shrike F-9',
  manufacturer: 'Fort Talon Aerospace',
  category: 'military',
  role: 'Light fighter',
  order: 5,
  difficulty: 5,
  tags: ['Afterburner', 'Fly-by-wire', 'Cannon', 'Missiles', 'Rockets', 'Bombs'],
  description: 'Single engine, afterburning, fly-by-wire. A 9 G airframe that will happily fly faster than sound and land exactly as carefully as you make it. Cannon, heat seekers, rocket pods and bombs.',
  voxel: 0.0625,
  interiorVoxel: 0.012,
  lodLevels: 4,
  mass: { empty: 8570, fuel: 3200, payload: 240 },
  inertia: [12875, 85552, 75674],
  wing: { area: 27.9, span: 9.96, chord: 3.45, y: -0.1 },
  aero: {
    CL0: 0.05, CLa: 3.5, CLmax: 1.6, alphaStall: 0.44, CD0: 0.022, k: 0.125, CDflap: 0.02, CLflap: 0.15, Cmflap: -0.03, CLmaxFlap: 0.25, CDgear: 0.02, CDair: 0.06,
    Cm0: 0.0, Cma: -0.34, Cmq: -9, Clb: 0.06, Clp: -0.38, Cnb: 0.11, Cnr: -0.22, Cyb: 0.6, Cnda: 0.01,
    machDrag: 0.03, machCrit: 0.86, spin: 0.35, stallPitchDown: 0.15,
    control: { elevator: 0.62, aileron: 0.085, rudder: 0.05, schedule: 11000 },
  },
  propulsion: { type: 'jet', thrust: 76000, afterburner: 53000, fuelBurn: 1.2, idleRpm: 30, spool: 0.5 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [4.3, -1.62, 0], radius: 0.28, k: 120000, c: 9000, steer: 0.45, cornering: 0.8, travel: 0.35 },
      { pos: [-1.1, -1.55, -1.25], radius: 0.38, k: 260000, c: 20000, brake: true, travel: 0.3 },
      { pos: [-1.1, -1.55, 1.25], radius: 0.38, k: 260000, c: 20000, brake: true, travel: 0.3 },
    ],
  },
  skids: [
    { p: [-8.0, -0.15, 0], kind: 'tail' }, { p: [0.5, -0.85, 0], kind: 'belly' }, { p: [-2.4, 0.0, 4.95], kind: 'tip' }, { p: [-2.4, 0.0, -4.95], kind: 'tip' },
    { p: [7.0, 0.0, 0], kind: 'nose' }, { p: [-3.2, -0.55, 1.0], kind: 'belly' }, { p: [-3.2, -0.55, -1.0], kind: 'belly' },
  ],
  limits: { vne: 330, maxG: 9, minG: 3, flapSpeed: 120, gearSpeed: 150, gLimiter: true, crashVs: 6 },
  cameras: { cockpit: [2.75, 0.85, 0], chase: { distance: 26, height: 6 }, near: { distance: 12.5, height: 3.1 } },
  hud: 'fighter',
  liveries: [
    { id: 'default', name: 'Air superiority gray' },
    { id: 'talon', name: 'Fort Talon olive', remap: { AC_GRAY: 'AC_OLIVE', AC_GRAY_LIGHT: 'AC_DRAB', AC_GRAY_DARK: 'AC_BLACK' } },
  ],
  stations: [
    { id: 'tipL', pos: [-2.3, 0.0, -5.15], kind: 'rail' }, { id: 'tipR', pos: [-2.3, 0.0, 5.15], kind: 'rail' },
    { id: 'pylonL', pos: [-0.6, -0.42, -2.6], kind: 'pylon' }, { id: 'pylonR', pos: [-0.6, -0.42, 2.6], kind: 'pylon' },
    { id: 'pylonL2', pos: [-1.0, -0.36, -1.6], kind: 'pylon' }, { id: 'pylonR2', pos: [-1.0, -0.36, 1.6], kind: 'pylon' },
  ],
  weapons: [
    { id: 'cannon', name: 'M-20 20 mm cannon', type: 'gun', munition: 'cannon20', ammo: 510, rate: 100, muzzle: [4.4, -0.3, -0.62], spread: 0.004 },
    { id: 'seeker', name: 'SW-9 heat seeker', type: 'missile', munition: 'aam', stations: ['tipL', 'tipR'], range: 9000 },
    { id: 'pods', name: '70 mm rocket pod', type: 'rocket', munition: 'hvar', stations: ['pylonL', 'pylonR'], rounds: 19, muzzleX: 1.25, tube: 0.09 },
    { id: 'bombs', name: 'GP-500 bomb', type: 'bomb', munition: 'mk82', stations: ['pylonL2', 'pylonR2'] },
  ],
  animations: [
    { part: 'flaperonL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.4 },
    { part: 'flaperonR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.4 },
    { part: 'stabL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.4 },
    { part: 'stabR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.4 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.4 },
    { part: 'airbrake', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: 0.9 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: 1.6, offset: -1.6 },
    { part: 'gearL', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: -1.45, offset: 1.45 },
    { part: 'gearR', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: 1.45, offset: -1.45 },
    { part: 'gearNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gearL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'gearR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.28 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.28 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -1.0, offset: 0.5 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0092, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'attitude', type: 'rotate', axis: [0, 0, 1], channel: 'pitchGauge', gain: 1 },
    { part: 'attitude', type: 'rotate', axis: [1, 0, 0], channel: 'rollGauge', gain: -1 },
  ],
  model(k) {
    const body = k.part('body');
    const FINE = { md: 0.1 };
    // ------------------------------------------------------------------ fuselage: long and slightly flattened, cheek to cheek with the blended wing root
    body.loft('x', FUS, GRAY);
    // dorsal spine and nose radome
    body.loft('x', [
      { a: -6.5, c1: 0.62, c2: 0, r1: 0.1, r2: 0.28, n: 2.4 },
      { a: -3.0, c1: 0.78, c2: 0, r1: 0.16, r2: 0.36, n: 2.4 },
      { a: -0.5, c1: 0.86, c2: 0, r1: 0.18, r2: 0.4, n: 2.4 },
      { a: 0.9, c1: 0.78, c2: 0, r1: 0.1, r2: 0.3, n: 2.4 },
    ], GRAY);
    body.loft('x', [
      { a: 5.5, c1: 0.08, c2: 0, r1: 0.38, r2: 0.38, n: 2.2 },
      { a: 6.4, c1: 0.05, c2: 0, r1: 0.23, r2: 0.23, n: 2 },
      { a: 7.05, c1: 0.0, c2: 0, r1: 0.05, r2: 0.05, n: 2 },
    ], BLACK, { md: 0.2 });
    // cockpit tub, the canopy sits above it
    body.ell(2.35, 0.55, 0, 1.4, 0.42, 0.44, 0);
    body.box(0.9, 0.4, -0.4, 3.6, 0.7, 0.4, 0);
    // the chin intake: a lipped scoop with a splitter plate, the mouth carved and a black duct behind it
    body.loft('x', [
      { a: 1.4, c1: -0.6, c2: 0, r1: 0.1, r2: 0.46, n: 2.6 },
      { a: 2.4, c1: -0.7, c2: 0, r1: 0.3, r2: 0.58, n: 2.6 },
      { a: 3.5, c1: -0.68, c2: 0, r1: 0.31, r2: 0.58, n: 2.6 },
      { a: 3.9, c1: -0.66, c2: 0, r1: 0.31, r2: 0.58, n: 2.6 },
    ], GRAY);
    body.loft('x', [{ a: 3.3, c1: -0.68, c2: 0, r1: 0.24, r2: 0.5, n: 2.6 }, { a: 3.95, c1: -0.66, c2: 0, r1: 0.24, r2: 0.5, n: 2.6 }], 0);
    body.loft('x', [{ a: 3.2, c1: -0.68, c2: 0, r1: 0.23, r2: 0.49, n: 2.6 }, { a: 3.34, c1: -0.68, c2: 0, r1: 0.23, r2: 0.49, n: 2.6 }], BLACK);
    body.paint(3.85, -1.1, -0.7, 4.0, -0.2, 0.7, (x, y, z) => (Math.abs(y + 0.66) > 0.2 || Math.abs(z) > 0.52 ? LIGHT : 0), { thin: true });                 // the bright lip
    body.box(3.55, -0.42, -0.5, 4.5, -0.36, 0.5, GRAY, { md: 0.12 });                                      // the splitter plate
    body.box(1.5, -0.4, -0.5, 3.2, -0.3, 0.5, GRAY);
    // engine nozzle: petals and a dark inner ring
    nozzle(body, -8.4, 0.05, 0, 0.5, { len: 0.8, petals: 16 });
    // ------------------------------------------------------------------ wings: 40 degree leading edge sweep, thin section, strakes at the roots
    for (const s of [-1, 1]) {
      const w = WNG(s); body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, GRAY);
      body.wing([3.3, 0.02, s * 0.62], 1.0, 1.6, 0.4, 1.3, 0.0, 0.03, 0.03, s, GRAY);                      // strakes
      body.wing([-4.2, -0.5, s * 0.55], 0.55, 1.2, 0.9, 0.5, 0.0, 0.06, 0.06, s, DARK);                    // ventral fins
      body.box(-2.3 - 0.8, -0.14, s * 4.95, -2.3 + 0.2, -0.02, s * 5.1, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.09 });
      body.box(0.0, -0.13, s * 3.4, -1.2, 0.05, s * 3.44, LIGHT, { md: 0.09 });                            // wing fence
      body.box(-2.6, -0.1, s * 4.95, -0.4, 0.06, s * 5.3, DARK, { md: 0.12 });                              // the missile rail on the tip
      body.box(0.7, 0.0, s * 2.4, 1.1, 0.07, s * 2.44, DARK, { md: 0.1 });                                  // slat track fairings
    }
    // fixed tail: vertical fin, a beacon, a hook and a drag chute fairing
    body.loft('y', finStations(FIN), GRAY, { thin: true });
    body.box(-6.4, 3.05, -0.06, -5.7, 3.16, 0.06, DARK, { md: 0.15 });
    body.box(-7.7, 0.95, -0.05, -7.6, 1.05, 0.05, M.BEACON_RED, { md: 0.1 });
    body.loft('x', [{ a: -7.9, c1: 0.62, c2: 0, r1: 0.14, r2: 0.22, n: 2.4 }, { a: -6.6, c1: 0.7, c2: 0, r1: 0.2, r2: 0.3, n: 2.4 }], DARK, { md: 0.15 });
    body.box(-8.0, -0.28, -0.05, -6.6, -0.2, 0.05, DARK, { md: 0.12 });                                     // the arrester hook, folded up under the tail
    body.box(-8.1, -0.34, -0.04, -7.9, -0.2, 0.04, M.STEEL_BRIGHT, { md: 0.1 });
    // ------------------------------------------------------------------ paint: ghost gray patches over a pale belly, the same function on every movable part
    const under = (x, y, z) => y < (Math.abs(z) < 0.9 ? -0.1 : -0.14);
    const paint = (r, box) => camo(r, box, [GRAY, LIGHT, GRAY], { scale: 2.2, seed: 17, under, underMat: LIGHT, soft: 0.06 });
    paint(body, [-8.3, -1.2, -5.4, 7.2, 3.3, 5.4]);
    for (const s of [-1, 1]) {
      roundel(body, -1.0, s * 3.0, -0.06, 0.12, [[0.46, M.AC_OLIVE], [0.34, M.AC_CREAM], [0.18, M.AC_ORANGE]]);
      roundelSide(body, 3.0, 0.2, s > 0 ? 0.55 : -0.9, s > 0 ? 0.9 : -0.55, [[0.2, M.AC_OLIVE], [0.14, M.AC_CREAM], [0.07, M.AC_ORANGE]]);
      body.paint(-7.6, 1.2, s * 0.2 - 0.2, -4.6, 2.9, s * 0.2 + 0.2, (x, y) => (y > 1.9 + (x + 6) * 0.35 && y < 2.15 + (x + 6) * 0.35 ? M.AC_ORANGE : 0), { thin: true });   // fin flash
      decal(body, 'FT', { x: -6.2, y: 1.45, side: s, px: 0.1, mat: DARK, z0: 0.05, z1: 0.3 });
      decal(body, '92-4417', { x: -4.5, y: 0.78, side: s, px: 0.045, mat: s > 0 ? LIGHT : M.AC_YELLOW, z0: 0.6, z1: 0.95 });
      decal(body, 'FORT TALON', { x: 1.6, y: 0.3, side: s, px: 0.035, mat: M.AC_WHITE, z0: 0.7, z1: 0.95 });
      decalTop(body, 'NO STEP', { x: -0.6, z: s * 1.7, y0: -0.04, y1: 0.12, px: 0.04, mat: DARK });
    }
    body.paint(3.4, -1.0, -0.62, 3.75, -0.4, 0.62, (x, y, z) => (Math.abs(z) < 0.08 && y < -0.9 ? M.AC_RED : 0), { md: 0.12, thin: true });
    body.paint(2.0, 0.2, -0.9, 2.4, 0.9, 0.9, (x, y, z) => (Math.abs(Math.abs(z) - 0.8) < 0.02 ? M.AC_WHITE : 0), { md: 0.1, thin: true });
    // seams, rivets, the gun port and the blast panel, canopy break-in marks
    seams(body, [-8.0, -0.4, -0.9, 6.8, 1.0, 0.9], [-7.1, -6.2, -5.0, -4.0, -2.8, -1.6, -0.4, 0.8, 2.0, 5.5, 6.3], { w: 0.011, mat: DARK, ymin: -0.5 });
    seamsZ(body, [-3.4, -0.3, -5.1, 1.8, 0.1, 5.1], [0.9, 1.7, 2.5, 3.3, 4.1], { w: 0.01, mat: DARK, y0: -0.2, y1: 0.12 });
    rivets(body, [-7.0, 0.3, -0.7, 0.9, 0.95, 0.7], 0.22, 0.22, { mat: DARK, ymin: 0.4 });
    rivets(body, [-3.3, -0.2, -5.0, 1.8, 0.1, 5.0], 0.26, 0.26, { mat: DARK, ymin: -0.1 });
    body.cyl('x', -0.3, -0.62, 0.05, 0.05, 4.2, 4.5, BLACK);
    body.paint(3.6, -0.55, -0.8, 4.7, -0.05, -0.4, (x, y, z) => (Math.abs(y + 0.3) < 0.2 && Math.abs(x - 4.1) < 0.5 ? DARK : 0), { thin: true, md: 0.1 });
    for (const s of [-1, 1]) body.paint(1.4, 0.6, s * 0.5 - 0.05, 3.7, 0.75, s * 0.5 + 0.05, (x) => (Math.floor((x - 1.4) / 0.28) % 2 ? M.AC_YELLOW : DARK), { thin: true, md: 0.1 });
    // pitot boom with an angle of attack vane, an IR sensor ahead of the canopy, antenna blades, formation lights
    body.cyl('x', 0.05, 0, 0.02, 0.01, 7.0, 7.9, M.STEEL, { md: 0.12 });
    for (const s of [-1, 1]) body.box(6.3, 0.0, s * 0.24 - 0.03, 6.6, 0.1, s * 0.24 + 0.03, M.AC_METAL, { md: 0.1 });
    body.ell(4.25, 0.58, 0, 0.14, 0.09, 0.12, M.AC_CANOPY, { md: 0.1 });
    body.box(6.0, 0.36, -0.04, 6.1, 0.5, 0.04, DARK, { md: 0.1 });
    body.box(-0.1, 0.98, -0.02, 0.5, 1.2, 0.02, DARK, { md: 0.1 });
    for (const x of [-3.2, -2.3]) body.box(x, 0.97, -0.02, x + 0.12, 1.3, 0.02, DARK, { md: 0.1 });
    for (const s of [-1, 1]) for (const x of [-5.0, -2.0, 0.9]) body.box(x, 0.2, s * 0.8 - 0.01, x + 0.4, 0.26, s * 0.82, M.NAV_GREEN, { md: 0.08 });
    navLights(body, { left: [-2.4, -0.1, -5.15], right: [-2.4, -0.1, 5.15], tail: [-7.65, 1.0, 0], beacon: [0.2, -0.65, 0], size: 0.07 });
    // pylons under the wing: one per station
    for (const s of [-1, 1]) {
      pylon(body, -0.4, -0.16, -0.38, s * 2.6, { len: 1.4, mat: GRAY, dark: DARK });
      pylon(body, -1.0, -0.16, -0.34, s * 1.6, { len: 1.1, mat: GRAY, dark: DARK });
      body.box(-1.6, -0.88, s * 0.55, -0.4, -0.84, s * 0.95, DARK, { md: 0.2 });                            // gear bay doors
    }
    body.box(3.9, -0.84, -0.02, 4.7, -0.8, 0.02, DARK, { md: 0.2 });
    // the canopy sill, a headrest fairing and the canopy rails
    body.box(0.9, 0.55, -0.5, 1.55, 0.75, 0.5, GRAY);
    for (const s of [-1, 1]) body.box(1.2, 0.6, s * 0.46 - 0.04, 4.0, 0.7, s * 0.46 + 0.04, DARK, { md: 0.1 });

    // ------------------------------------------------------------------ movable surfaces, cut out of the airframe so the gaps are real
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      const W = WNG(s);
      const fp = wingSurface(k, body, 'flaperon' + n, W, { z0: 1.0, z1: 4.88, hx: () => -2.35, mat: GRAY });
      paint(fp, [-3.5, -0.4, Math.min(0.9 * s, 5.0 * s), -2.2, 0.4, Math.max(0.9 * s, 5.0 * s)]);
      seams(fp, [-3.5, -0.4, Math.min(0.9 * s, 5.0 * s), -2.2, 0.4, Math.max(0.9 * s, 5.0 * s)], [-2.9], { w: 0.01, mat: DARK });
      const st = k.part('stab' + n, { pivot: [-6.95, -0.12, s * 1.5] });
      st.wing([-5.6, -0.12, s * 0.62], 2.15, 2.6, 1.0, 1.7, 0.0, 0.04, 0.03, s, GRAY);
      paint(st, [-8.3, -0.4, Math.min(0.6 * s, 2.9 * s), -5.5, 0.3, Math.max(0.6 * s, 2.9 * s)]);
      seamsZ(st, [-8.3, -0.4, -3, -5.5, 0.3, 3], [1.4, 2.0], { w: 0.009, mat: DARK });
      st.box(-7.9, -0.14, s * 2.7 - 0.05, -7.1, -0.1, s * 2.75, DARK, { md: 0.1 });
    }
    const hinge = finAt(FIN, 1.2);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: GRAY, box: [-8.0, 0.7, -0.2, -5.0, 3.2, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.34 && y > FIN.y + 0.2; },
      pivot: [hinge.te + hinge.chord * 0.34, FIN.y + 1.2, 0],
    });
    paint(rd, [-8.0, 0.7, -0.2, -5.0, 3.2, 0.2]);
    rd.paint(-7.6, 1.2, -0.2, -4.6, 2.9, 0.2, (x, y) => (y > 1.9 + (x + 6) * 0.35 && y < 2.15 + (x + 6) * 0.35 ? M.AC_ORANGE : 0), { thin: true });
    const ab = k.part('airbrake', { pivot: [-4.6, -0.42, 0], visibleWhen: 'airbrake' });
    ab.box(-5.9, -0.5, -0.5, -4.6, -0.42, 0.5, DARK, { thin: true });
    for (const z of [-0.3, 0, 0.3]) ab.box(-5.85, -0.5, z - 0.02, -4.65, -0.38, z + 0.02, GRAY, { md: 0.08 });
    // ------------------------------------------------------------------ landing gear legs with wheels; folded away and hidden when retracted
    const gn = k.part('gearNose', { pivot: [4.3, -0.5, 0], visibleWhen: 'gearOut' });
    gearLeg(gn, [4.3, -0.5, 0], [4.3, -1.62, 0], { thick: 0.12, lower: 0.09, fork: 0.2 });
    gn.box(4.1, -1.0, -0.04, 4.28, -0.8, 0.04, DARK, { md: 0.12 });
    gn.box(4.05, -1.2, 0.08, 4.4, -1.0, 0.13, M.HEADLIGHT, { md: 0.1 });
    wheel(k.part('wheelNose', { pivot: [4.3, -1.62, 0], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.28, 0.17);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [-1.1, -0.5, s * 0.6], visibleWhen: 'gearOut' });
      gearLeg(g, [-1.1, -0.5, s * 0.6], [-1.1, -1.55, s * 1.2], { thick: 0.16, lower: 0.11, fork: 0.25, drag: [-1.9, -0.55, s * 0.8] });
      g.box(-1.4, -0.9, s * 1.2 + (s > 0 ? 0.13 : -0.16), -0.8, -0.5, s * 1.2 + (s > 0 ? 0.16 : -0.13), DARK, { md: 0.2 });
      wheel(k.part('wheel' + n, { pivot: [-1.1, -1.55, s * 1.2], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.38, 0.26);
    }
    // ------------------------------------------------------------------ canopy: tinted bubble with a frame, hidden from inside
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(2.4, 0.66, 0, 1.55, 0.6, 0.52, M.AC_CANOPY);
    cn.ell(2.4, 0.66, 0, 1.47, 0.53, 0.45, 0, { md: 0.3 });
    cn.carve(0.5, -1, -1, 4.2, 0.62, 1);
    cn.paint(0.7, 0.55, -0.7, 4.2, 1.4, 0.7, (x, y, z) => (Math.abs(x - 3.5) < 0.035 || Math.abs(x - 1.5) < 0.035 || Math.abs(x - 0.95) < 0.04 || (Math.abs(z) < 0.02 && x < 3.4 && x > 1.5) || (y < 0.7 && Math.abs(Math.abs(z) - 0.5) < 0.04) ? M.COCKPIT_TRIM : 0), { thin: true, md: 0.12 });
    // ------------------------------------------------------------------ stores: heat seekers on the wingtip rails, rocket pods and bombs on the pylons. Visible while loaded.
    for (const s of [-1, 1]) {
      const id = s < 0 ? 'L' : 'R';
      store(k, 'seeker' + id, 'tip' + id, 'aam', [-1.45, 0.0, s * 5.15], { voxel: 0.03125 });
      const p = k.part('pods' + id, { visibleWhen: 'store_pylon' + id, voxel: 0.03125 });
      rocketPod(p, -0.3, -0.62, s * 2.6, { len: 1.7, radius: 0.19, mat: M.AC_OLIVE, tubes: 7 });
      store(k, 'bombs' + id, 'pylon' + id + '2', 'mk82', [-0.9, -0.6, s * 1.6], { voxel: 0.03125 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ cockpit tub (1.2 cm voxels)
    const c = k.interior('cabin');
    c.box(1.0, -0.3, -0.42, 3.6, 0.48, 0.42, M.COCKPIT_TRIM);
    c.carve(1.4, -0.25, -0.34, 3.4, 0.5, 0.34);
    c.box(1.9, -0.28, -0.32, 3.4, -0.2, 0.32, M.COCKPIT_PANEL);                         // floor
    // side consoles
    for (const s of [-1, 1]) {
      c.box(1.8, -0.2, s * 0.36 - 0.11, 3.5, 0.18, s * 0.36 + 0.11, M.COCKPIT_PANEL);
      c.box(1.8, 0.18, s * 0.36 - 0.11, 3.5, 0.21, s * 0.36 + 0.11, M.COCKPIT_TRIM);
      c.box(2.1, 0.21, s * 0.36 - 0.1, 2.5, 0.24, s * 0.36 + 0.1, M.SWITCH_GRAY, { md: 0.03 });
      for (let i = 0; i < 6; i++) c.box(2.55 + i * 0.1, 0.21, s * 0.36 - 0.07, 2.6 + i * 0.1, 0.25, s * 0.36 + 0.07, i % 2 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.03 });
    }
    // ejection seat: tilted back, headbox, yellow and black pull handle
    c.box(1.9, -0.25, -0.2, 2.5, -0.1, 0.2, M.SEAT_FABRIC);
    c.box(1.75, -0.1, -0.2, 2.0, 0.55, 0.2, M.SEAT_FABRIC);
    c.box(1.7, 0.55, -0.16, 1.98, 0.85, 0.16, M.COCKPIT_TRIM);
    c.box(1.85, 0.7, -0.22, 1.98, 0.8, 0.22, M.AC_GRAY_DARK, { md: 0.04 });
    c.box(2.15, -0.1, -0.08, 2.4, -0.06, 0.08, M.AC_YELLOW, { md: 0.03 });
    for (const s of [-1, 1]) c.box(1.78, -0.05, s * 0.24 - 0.02, 2.4, 0.06, s * 0.24 + 0.02, M.AC_BLACK, { md: 0.03 });
    // canopy frame: sills, bow arch and a rear bow behind the headrest
    for (const s of [-1, 1]) c.box(1.3, 0.5, s * 0.5 - 0.03, 3.6, 0.58, s * 0.5 + 0.03, M.COCKPIT_TRIM);
    for (const s of [-1, 1]) c.box(3.55, 0.5, s * 0.41 - 0.09, 3.65, 0.6, s * 0.41 + 0.09, M.COCKPIT_TRIM);
    ringYZ(c, 3.5, 3.6, 0.55, 0, 0.5, 0.045, M.COCKPIT_TRIM);
    ringYZ(c, 1.55, 1.63, 0.55, 0, 0.48, 0.04, M.COCKPIT_TRIM);

    // ------------------------------------------------------------------ instrument panel and HUD (6 mm voxels)
    const pn = k.interior('panel', { voxel: 0.006 });
    pn.box(3.62, 0.44, -0.4, 3.9, 0.9, 0.4, M.COCKPIT_TRIM);                    // panel face, above the tub rim
    pn.box(3.5, 0.9, -0.42, 4.1, 1.0, 0.42, M.COCKPIT_PANEL);                   // glare shield
    pn.box(3.4, 0.98, -0.16, 3.76, 1.02, 0.16, M.COCKPIT_PANEL);                // HUD housing
    pn.box(3.42, 1.0, -0.17, 3.5, 1.02, 0.17, M.COCKPIT_PANEL);
    // combiner: an open frame, the symbology itself is drawn by the HUD overlay
    pn.box(3.47, 1.0, -0.16, 3.49, 1.3, -0.145, M.COCKPIT_PANEL, { thin: true });
    pn.box(3.47, 1.0, 0.145, 3.49, 1.3, 0.16, M.COCKPIT_PANEL, { thin: true });
    pn.box(3.46, 1.28, -0.16, 3.5, 1.32, 0.16, M.COCKPIT_PANEL);
    pn.box(3.47, 1.15, -0.15, 3.485, 1.16, 0.15, M.HUD_GLASS, { thin: true });
    // three displays: a metal rim, a dark glass face and thin bright symbology
    const mfd = (z, y, w, h) => {
      pn.box(3.6, y - h / 2 - 0.01, z - w / 2 - 0.01, 3.625, y + h / 2 + 0.01, z + w / 2 + 0.01, M.AC_GRAY_DARK);
      pn.box(3.585, y - h / 2, z - w / 2, 3.6, y + h / 2, z + w / 2, M.GAUGE_FACE);
    };
    const line = (x0, y0, z0, x1, y1, z1, m) => pn.box(x0, y0, z0, x1, y1, z1, m, { thin: true, md: 0.02 });
    mfd(-0.26, 0.64, 0.19, 0.17);                                              // tactical: range rings and a contact
    for (let i = 1; i <= 3; i++) ringYZ(pn, 3.578, 3.584, 0.64, -0.26, 0.022 * i, 0.004, M.NAV_GREEN);
    line(3.578, 0.575, -0.34, 3.584, 0.705, -0.338, M.NAV_GREEN);
    line(3.576, 0.66, -0.235, 3.584, 0.675, -0.22, M.AC_YELLOW);
    mfd(0.26, 0.64, 0.19, 0.17);                                               // systems: engine and fuel bars
    for (let i = 0; i < 6; i++) line(3.578, 0.57, 0.19 + i * 0.026, 3.584, 0.57 + 0.03 + ((i * 5) % 4) * 0.018, 0.196 + i * 0.026, i === 4 ? M.AC_YELLOW : M.NAV_GREEN);
    pn.box(3.6, 0.53, -0.09, 3.625, 0.75, 0.09, M.AC_GRAY_DARK);               // centre well behind the attitude ball
    pn.box(3.59, 0.54, -0.08, 3.6, 0.74, 0.08, M.GAUGE_FACE);
    // round gauges, warning lights and rocker switches
    gauge(pn, 3.62, 0.795, -0.32, 0.045); gauge(pn, 3.62, 0.795, 0.32, 0.045);
    gauge(pn, 3.62, 0.795, -0.19, 0.03); gauge(pn, 3.62, 0.795, 0.19, 0.03);
    for (let i = 0; i < 8; i++) pn.box(3.58, 0.84, -0.12 + i * 0.03, 3.62, 0.87, -0.1 + i * 0.03, i % 3 ? M.SWITCH_GRAY : i % 2 ? M.SWITCH_RED : M.AC_YELLOW, { md: 0.02 });
    for (let i = 0; i < 9; i++) pn.box(3.6, 0.47, -0.36 + i * 0.045, 3.63, 0.5, -0.34 + i * 0.045, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });

    // ------------------------------------------------------------------ animated controls
    const stick = k.interior('stick', { pivot: [2.6, -0.18, 0.36], local: true, voxel: 0.01 });
    stick.cyl('y', 0, 0, 0.022, 0.022, 0, 0.3, M.COCKPIT_TRIM);
    stick.box(-0.05, 0.28, -0.03, 0.05, 0.4, 0.03, M.AC_BLACK);
    stick.box(-0.04, 0.34, -0.035, 0.0, 0.36, 0.035, M.SWITCH_RED, { md: 0.01 });
    const thr = k.interior('throttleLever', { pivot: [2.4, -0.05, -0.36], local: true, voxel: 0.01 });
    thr.cyl('y', 0, 0, 0.02, 0.02, 0, 0.22, M.COCKPIT_TRIM);
    thr.box(-0.06, 0.2, -0.03, 0.06, 0.28, 0.03, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.16], ['pedalR', 0.16]]) {
      const p = k.interior(n, { pivot: [3.4, -0.2, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.08, -0.07, 0.02, 0.1, 0.07, M.STEEL_DARK);
    }
    for (const [n, cz] of [['nASI', -0.3], ['nALT', 0.3]]) needle(k.interior(n, { pivot: [3.596, 0.8, cz], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    const ai = k.interior('attitude', { pivot: [3.6, 0.64, 0.0], local: true, voxel: 0.004 });
    const R = 0.065;
    ai.fn(-R, -R, -R, R, R, R, (x, y, z) => {
      if (x * x + y * y + z * z > R * R) return 0;
      if (Math.abs(y) < 0.0035) return M.GAUGE_WHITE;
      return y > 0 ? M.SIDING_BLUE : M.BRICK_BROWN;
    });
  },
});
