import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, camo, seams, seamsZ, rivets, navLights, pilot, nozzle, gearLeg, store, pylon, roundelSide } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt, wingAt } from '../builders/surfaces.js';

/* Kestrel X-7: a canard delta fighter with two engines side by side behind a wide, flat fuselage. Relaxed stability and a fly-by-wire
   computer keep the foreplanes and elevons ahead of a pilot who would otherwise be riding a coin toss. Mach two on a good day, a
   turn that tightens the more you ask of it, and six heat seekers to say so. Body origin at the center of gravity. */

const GRAY = M.AC_GRAY_LIGHT, DARK = M.AC_GRAY, DEEP = M.AC_GRAY_DARK, BLACK = M.AC_BLACK;

const WR = wingDef([1.0, 0.04, 0.9], 4.4, 7.0, 1.4, 5.0, 0.0, 0.07, 0.05, 1);
const WL = wingDef([1.0, 0.04, -0.9], 4.4, 7.0, 1.4, 5.0, 0.0, 0.07, 0.05, -1);
const wy = (z) => wingAt(WR, Math.abs(z)).y;
const FIN = { x: -3.6, y: 0.62, z: 0, chord: 4.2, tip: 1.7, height: 3.3, sweep: 2.5, thick: 0.1 };
const CAN = (s) => wingDef([3.55, 0.5, s * 0.5], 1.8, 1.7, 0.7, 0.95, 0.2, 0.05, 0.04, s);

const under = (x, y, z) => y < (Math.abs(z) > 0.9 && x < 1.1 ? wy(Math.abs(z)) : 0.2);
const paint = (r, box) => camo(r, box, [GRAY, M.AC_GRAY_LIGHT, DARK], { scale: 2.6, seed: 77, under, underMat: DARK, soft: 0.0 });

export default defineAircraft({
  id: 'kestrel',
  name: 'Kestrel X-7',
  manufacturer: 'Fort Talon Aerospace',
  role: 'Air superiority fighter',
  category: 'military',
  order: 6,
  difficulty: 5,
  tags: ['Canard delta', 'Afterburner', 'Fly-by-wire', 'Supersonic', 'Missiles'],
  description: 'Two afterburning engines, a delta wing and canards, and a computer that does the flying while you do the thinking. It will go faster than sound before you have finished raising the gear and turn tighter than the Shrike at half the speed. Six heat seekers, bombs, a cannon.',
  voxel: 0.05,
  interiorVoxel: 0.014,
  lodLevels: 4,
  mass: { empty: 9800, fuel: 4400, payload: 100 },
  inertia: [18500, 142000, 126000],
  wing: { area: 52, span: 10.7, chord: 5.0, y: 0.04 },
  aero: {
    CL0: 0.03, CLa: 2.9, CLmax: 1.55, alphaStall: 0.52, CD0: 0.022, k: 0.2, CDflap: 0.0, CLflap: 0.0, Cmflap: 0.0, CLmaxFlap: 0.0, CDgear: 0.02, CDair: 0.06,
    Cm0: 0.0, Cma: -0.32, Cmq: -9, Clb: 0.05, Clp: -0.4, Cnb: 0.1, Cnr: -0.2, Cyb: 0.5, Cnda: 0.01,
    machDrag: 0.035, machCrit: 0.9, spin: 0.3, stallPitchDown: 0.12,
    control: { elevator: 0.65, aileron: 0.09, rudder: 0.05, schedule: 9500 },
  },
  propulsion: { type: 'jet', thrust: 122000, afterburner: 82000, fuelBurn: 1.7, idleRpm: 30, spool: 0.5 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [5.2, -1.6, 0], radius: 0.28, k: 130000, c: 9500, steer: 0.45, cornering: 0.8, travel: 0.35 },
      { pos: [-1.6, -1.55, -1.7], radius: 0.4, k: 280000, c: 22000, brake: true, travel: 0.3 },
      { pos: [-1.6, -1.55, 1.7], radius: 0.4, k: 280000, c: 22000, brake: true, travel: 0.3 },
    ],
  },
  skids: [
    { p: [-7.8, 0.3, 0], kind: 'tail' }, { p: [8.1, 0.2, 0], kind: 'nose' }, { p: [-5.0, 0.0, 5.2], kind: 'tip' }, { p: [-5.0, 0.0, -5.2], kind: 'tip' },
    { p: [0.0, -0.45, 0.0], kind: 'belly' }, { p: [-5.0, -0.2, 0.9], kind: 'belly' }, { p: [-5.0, -0.2, -0.9], kind: 'belly' }, { p: [-4.5, 3.9, 0], kind: 'tail' },
  ],
  limits: { vne: 400, maxG: 9, minG: 3, flapSpeed: 130, gearSpeed: 160, gLimiter: true, crashVs: 5.5 },
  cameras: { cockpit: [3.3, 1.2, 0], chase: { distance: 27, height: 6 }, near: { distance: 12.5, height: 3 } },
  hud: 'fighter',
  liveries: [
    { id: 'default', name: 'Air defense gray' },
    { id: 'display', name: 'Display team', remap: { AC_GRAY_LIGHT: 'AC_WHITE', AC_GRAY: 'AC_RED', AC_GRAY_DARK: 'AC_GRAY_DARK' } },
    { id: 'night', name: 'Night raider', remap: { AC_GRAY_LIGHT: 'AC_GRAY_DARK', AC_GRAY: 'AC_BLACK', AC_GRAY_DARK: 'AC_BLACK' } },
  ],
  stations: [
    { id: 'tipL', pos: [-3.2, 0.04, -5.2], kind: 'rail' }, { id: 'tipR', pos: [-3.2, 0.04, 5.2], kind: 'rail' },
    { id: 'w1L', pos: [-1.8, -0.18, -3.5], kind: 'pylon' }, { id: 'w1R', pos: [-1.8, -0.18, 3.5], kind: 'pylon' },
    { id: 'w2L', pos: [-0.2, -0.2, -2.2], kind: 'pylon' }, { id: 'w2R', pos: [-0.2, -0.2, 2.2], kind: 'pylon' },
    { id: 'bL', pos: [0.4, -0.5, -0.75], kind: 'rack' }, { id: 'bR', pos: [0.4, -0.5, 0.75], kind: 'rack' },
  ],
  weapons: [
    { id: 'cannon', name: 'M-27 27 mm cannon', type: 'gun', munition: 'cannon30', ammo: 220, rate: 30, muzzle: [3.2, 0.1, 0.62], spread: 0.0035, flash: 0.45, blast: 2.0 },
    { id: 'tip', name: 'SW-9 short range missile', type: 'missile', munition: 'aam', stations: ['tipL', 'tipR'], range: 9000 },
    { id: 'long', name: 'LR-4 long range missile', type: 'missile', munition: 'aam', stations: ['w1L', 'w1R'], range: 14000, speed: 1200, blast: 14, turn: 2.1 },
    { id: 'bombs', name: 'GP-500 bomb', type: 'bomb', munition: 'mk82', stations: ['w2L', 'w2R'] },
    { id: 'agm', name: 'AGM-9 air to ground missile', type: 'missile', munition: 'agm', stations: ['bL', 'bR'] },
  ],
  animations: [
    { part: 'elevonIL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.42 },
    { part: 'elevonIR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.42 },
    { part: 'elevonOL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.42 },
    { part: 'elevonOR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.42 },
    { part: 'elevonIL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.3 },
    { part: 'elevonIR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.3 },
    { part: 'elevonOL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.3 },
    { part: 'elevonOR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.3 },
    { part: 'canardL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'canardR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'airbrake', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: 0.8 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: -1.6, offset: 1.6 },
    { part: 'gearL', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: -1.45, offset: 1.45 },
    { part: 'gearR', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: 1.45, offset: -1.45 },
    { part: 'gearNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gearL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'gearR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.25 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.25 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -1.0, offset: 0.5 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0074, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage: a wide flat rear that holds both engines, a long pointed nose
    body.loft('x', [
      { a: -7.0, c1: 0.3, c2: 0, r1: 0.55, r2: 1.2, n: 3.0 },
      { a: -6.0, c1: 0.3, c2: 0, r1: 0.62, r2: 1.28, n: 2.9 },
      { a: -3.5, c1: 0.32, c2: 0, r1: 0.66, r2: 1.2, n: 2.7 },
      { a: -1.0, c1: 0.33, c2: 0, r1: 0.7, r2: 1.05, n: 2.5 },
      { a: 1.5, c1: 0.36, c2: 0, r1: 0.68, r2: 0.9, n: 2.4 },
      { a: 3.5, c1: 0.36, c2: 0, r1: 0.55, r2: 0.62, n: 2.3 },
      { a: 5.5, c1: 0.3, c2: 0, r1: 0.42, r2: 0.42, n: 2.2 },
      { a: 7.2, c1: 0.22, c2: 0, r1: 0.26, r2: 0.26, n: 2.1 },
      { a: 8.15, c1: 0.2, c2: 0, r1: 0.05, r2: 0.05, n: 2 },
    ], GRAY);
    // spine, a blended dorsal hump behind the canopy, and a tail beaver between the nozzles
    body.loft('x', [
      { a: -6.8, c1: 0.78, c2: 0, r1: 0.12, r2: 0.34, n: 2.4 },
      { a: -3.0, c1: 0.95, c2: 0, r1: 0.2, r2: 0.55, n: 2.4 },
      { a: 0.2, c1: 1.02, c2: 0, r1: 0.18, r2: 0.46, n: 2.4 },
      { a: 2.6, c1: 0.78, c2: 0, r1: 0.12, r2: 0.3, n: 2.4 },
    ], GRAY);
    body.box(-7.9, 0.1, -0.12, -6.9, 0.62, 0.12, DARK);
    // the radome dark, the chin sensor blister and the nose pitot boom
    body.paint(6.2, -0.2, -0.5, 8.3, 0.7, 0.5, (x) => (x > 6.3 ? BLACK : 0), { md: 0.5 });
    body.ell(5.3, -0.28, 0, 0.35, 0.12, 0.2, M.AC_CANOPY);
    body.cyl('x', 0.2, 0, 0.018, 0.012, 8.1, 8.8, M.AC_METAL, { md: 0.1 });
    // canopy well
    body.carve(2.2, 0.62, -0.38, 4.9, 1.2, 0.38);
    // ------------------------------------------------------------------ intakes: rectangular mouths with a splitter plate and a dark duct, under the leading edge extensions
    for (const s of [-1, 1]) {
      body.box(1.8, -0.1, s * 0.78 - 0.34, 4.4, 0.62, s * 0.78 + 0.34, GRAY);
      body.wing([4.5, 0.3, s * 0.55], 0.3, 2.0, 0.8, 0.3, 0, 0.1, 0.08, s, GRAY);
      body.carve(3.7, -0.02, s * 0.84 - 0.26, 4.5, 0.54, s * 0.84 + 0.26);                    // the mouth
      body.box(2.2, 0.0, s * 0.84 - 0.26, 3.75, 0.52, s * 0.84 + 0.26, BLACK);                   // duct
      body.box(3.6, -0.02, s * 0.56 - 0.02, 4.55, 0.56, s * 0.56 + 0.02, DARK);                  // splitter plate
      body.box(3.6, 0.52, s * 0.84 - 0.3, 4.5, 0.58, s * 0.84 + 0.3, DEEP);                      // bleed slot
    }
    // ------------------------------------------------------------------ delta wing, leading edge extensions, the single fin and ventral fins
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, GRAY);
    for (const s of [-1, 1]) {
      body.wing([4.2, 0.26, s * 0.4], 1.3, 3.2, 0.3, 2.3, 0.0, 0.05, 0.03, s, GRAY);                // strakes
      body.wing([-3.3, -0.12, s * 0.95], 0.8, 2.3, 1.5, 0.4, -0.5, 0.05, 0.04, s, DARK);            // ventral strakes
    }
    body.loft('y', finStations(FIN), GRAY, { thin: true });
    body.loft('y', [
      { a: 0.55, c1: -3.2, c2: 0, r1: 1.1, r2: 0.14, n: 2.4 },
      { a: 1.0, c1: -3.4, c2: 0, r1: 0.8, r2: 0.11, n: 2.4 },
      { a: 1.6, c1: -3.8, c2: 0, r1: 0.5, r2: 0.09, n: 2.4 },
    ], GRAY);
    body.box(-7.9, FIN.y + FIN.height - 0.1, -0.1, -6.0, FIN.y + FIN.height + 0.16, 0.1, DEEP, { md: 0.12 });
    // engine nozzles, side by side
    for (const s of [-1, 1]) nozzle(body, -7.95, 0.3, s * 0.66, 0.56, { len: 1.2, petals: 18 });
    // ------------------------------------------------------------------ paint and detail
    paint(body, [-8.0, -0.6, -5.3, 8.3, 4.2, 5.3]);
    for (const s of [-1, 1]) {
      roundelSide(body, 0.3, 0.6, s > 0 ? 0.6 : -1.1, s > 0 ? 1.1 : -0.6, [[0.16, M.AC_WHITE], [0.11, M.AC_RED], [0.06, M.AC_WHITE]]);
      body.paint(FIN.x - FIN.sweep - FIN.tip - 0.1, FIN.y + 1.6, -0.2, FIN.x + 0.1, FIN.y + 2.0, 0.2, (x) => (x > -7.0 ? M.AC_RED : 0), { thin: true, md: 0.12 });
    }
    decal(body, 'K7', { x: -5.6, y: 2.1, side: 1, px: 0.14, mat: M.AC_RED, z0: 0.05, z1: 0.3 });
    decal(body, 'K7', { x: -5.6, y: 2.1, side: -1, px: 0.14, mat: M.AC_RED, z0: 0.05, z1: 0.3 });
    decal(body, 'FT 7.03', { x: 0.2, y: 0.12, side: 1, px: 0.05, mat: M.AC_WHITE, z0: 0.9, z1: 1.3 });
    seams(body, [-7.0, -0.2, -1.3, 8.0, 1.0, 1.3], [-6.4, -5.2, -4.0, -2.6, -1.0, 0.8, 2.0, 4.8, 5.6, 6.6], { w: 0.012, mat: DEEP, ymin: -0.3 });
    seamsZ(body, [-6.0, -0.1, -5.3, 1.0, 0.3, 5.3], [1.4, 2.2, 3.1, 4.0, 4.8], { w: 0.011, mat: DEEP, y0: -0.3, y1: 0.4 });
    rivets(body, [-7.0, 0.5, -1.2, 3.0, 1.2, 1.2], 0.3, 0.3, { mat: DEEP, ymin: 0.9 });
    body.box(-2.4, 1.14, -0.3, -1.0, 1.3, 0.3, DEEP, { md: 0.1 });                                  // the airbrake's recess
    navLights(body, { left: [-4.3, 0.04, -5.25], right: [-4.3, 0.04, 5.25], tail: [-8.0, 0.4, 0], beacon: [-3.9, 3.9, 0] });
    body.box(-4.9, FIN.y + 1.2, -0.12, -3.9, FIN.y + 1.3, 0.12, M.NAV_RED, { md: 0.1 });
    for (const x of [-4.0, -3.6]) body.box(x, -0.34, -0.55, x + 0.3, -0.28, 0.55, DEEP, { md: 0.1 });       // chaff and flare dispensers
    body.box(3.0, 0.1, 0.5, 3.4, 0.14, 0.7, BLACK, { md: 0.1 });                                       // gun port
    // engines: intake ducts show a fan far inside, so the mouths are not empty
    // pylons and rails
    for (const s of [-1, 1]) {
      pylon(body, -1.8, wy(3.5) + 0.04, wy(3.5) - 0.2, s * 3.5, { len: 1.4 });
      pylon(body, -0.2, wy(2.2) + 0.04, wy(2.2) - 0.2, s * 2.2, { len: 1.5 });
      body.box(-3.4, 0.0, s * 5.2 - 0.03, -1.2, 0.16, s * 5.2 + 0.03, DEEP, { md: 0.12 });
      body.box(0.0, -0.58, s * 0.75 - 0.3, 1.3, -0.46, s * 0.75 + 0.3, DEEP, { md: 0.12 });
    }
    // ------------------------------------------------------------------ control surfaces: elevons cut from the delta, a canard on each side, the rudder, a dorsal brake
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      const bx = (a, b) => [-6.2, -0.4, Math.min(a * s, b * s), -2.0, 0.4, Math.max(a * s, b * s)];
      const ei = wingSurface(k, body, 'elevonI' + n, W, { z0: 1.0, z1: 3.0, frac: 0.2, mat: GRAY });
      paint(ei, bx(0.9, 3.1));
      const eo = wingSurface(k, body, 'elevonO' + n, W, { z0: 3.05, z1: 5.25, frac: 0.26, mat: GRAY });
      paint(eo, bx(3.0, 5.3));
      const cn = CAN(s);
      const c = k.part('canard' + n, { pivot: [3.55 - 0.45, 0.5 + 0.1, s * 1.2] });
      c.wing(cn.root, cn.span, cn.cr, cn.ct, cn.sweep, cn.dih, cn.tr, cn.tt, s, GRAY);
      c.box(3.4, 0.4, s * 0.55 - 0.15, 3.6, 0.7, s * 0.55 + 0.15, DEEP, { md: 0.12 });
      paint(c, [1.5, 0.2, Math.min(0.3 * s, 2.5 * s), 3.7, 0.9, Math.max(0.3 * s, 2.5 * s)]);
    }
    const hinge = finAt(FIN, FIN.y + 1.2);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: GRAY, box: [-8.0, FIN.y, -0.2, -3.0, FIN.y + FIN.height + 0.1, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.3 && y > FIN.y + 0.15; },
      pivot: [hinge.te + hinge.chord * 0.3, FIN.y + 1.4, 0],
    });
    paint(rd, [-8.0, FIN.y, -0.2, -3.0, FIN.y + FIN.height + 0.1, 0.2]);
    rd.paint(-8.0, FIN.y + 1.5, -0.2, -3.0, 4.0, 0.2, (x, y) => (y > FIN.y + 2.1 ? M.AC_RED : 0), { thin: true });
    const ab = k.part('airbrake', { pivot: [-1.0, 1.13, 0] });
    ab.box(-2.4, 1.1, -0.28, -1.0, 1.16, 0.28, DEEP, { thin: true });
    ab.box(-2.3, 1.14, -0.2, -1.1, 1.17, 0.2, M.AC_RED, { md: 0.1 });
    // ------------------------------------------------------------------ afterburner flames: a hot cone with shock diamonds, only drawn while the burners are lit
    for (const s of [-1, 1]) {
      const bn = k.part('burner' + (s < 0 ? 'L' : 'R'), { pivot: [-7.95, 0.3, s * 0.66], local: true, visibleWhen: 'afterburner' });
      bn.cyl('x', 0, 0, 0.44, 0.06, -2.4, 0.0, M.RWY_LIGHT_AMBER);
      bn.cyl('x', 0, 0, 0.32, 0.03, -2.1, -0.1, M.RWY_LIGHT_RED, { md: 0.25 });
      bn.cyl('x', 0, 0, 0.2, 0.02, -1.8, -0.2, M.HEADLIGHT, { md: 0.25 });
      for (let i = 0; i < 3; i++) bn.cyl('x', 0, 0, 0.26 - i * 0.05, 0.1, -0.5 - i * 0.55, -0.7 - i * 0.55, M.STROBE, { md: 0.25 });
    }
    // ------------------------------------------------------------------ gear
    const gn = k.part('gearNose', { pivot: [5.2, -0.2, 0], visibleWhen: 'gearOut' });
    gearLeg(gn, [5.15, -0.2, 0], [5.2, -1.6, 0], { thick: 0.11, lower: 0.08, fork: 0.17 });
    gn.box(5.0, -1.0, 0.1, 5.4, -0.75, 0.14, M.HEADLIGHT, { md: 0.1 });
    wheel(k.part('wheelNose', { pivot: [5.2, -1.6, 0], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.28, 0.16);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [-1.6, -0.35, s * 1.7], visibleWhen: 'gearOut' });
      gearLeg(g, [-1.6, -0.35, s * 1.7], [-1.6, -1.55, s * 1.7], { thick: 0.15, lower: 0.11, fork: 0.24, drag: [-2.6, -0.4, s * 1.5] });
      wheel(k.part('wheel' + n, { pivot: [-1.6, -1.55, s * 1.7], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.4, 0.24);
      body.box(-2.3, -0.42, s * 1.7 - 0.5, -0.9, -0.32, s * 1.7 + 0.5, DEEP, { md: 0.15 });
    }
    // ------------------------------------------------------------------ canopy, pilot
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(3.7, 0.86, 0, 1.7, 0.58, 0.4, M.AC_CANOPY);
    cn.ell(3.7, 0.86, 0, 1.63, 0.53, 0.35, 0, { md: 0.3 });
    cn.carve(1.5, -0.2, -1, 5.8, 0.6, 1);
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 2.95, 0.42, { hands: [[3.4, 0.6, -0.3], [3.62, 0.72, 0.26]], feet: 3.95, suit: M.AC_ORANGE, helmet: M.AC_WHITE });
    // ------------------------------------------------------------------ stores
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      store(k, 'tip' + n, 'tip' + n, 'aam', [-1.7, 0.04 + 0.0, s * 5.2]);
      store(k, 'long' + n, 'w1' + n, 'aam', [-1.8, wy(3.5) - 0.37, s * 3.5]);
      store(k, 'bomb' + n, 'w2' + n, 'mk82', [-0.2, wy(2.2) - 0.45, s * 2.2]);
      store(k, 'agm' + n, 'b' + n, 'agm', [0.5, -0.66, s * 0.75]);
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ cockpit (1.4 cm voxels): a frameless bubble, an ejection seat, a wide display
    const c = k.interior('cabin');
    c.box(2.5, 0.28, -0.36, 4.6, 0.34, 0.36, M.COCKPIT_PANEL);
    for (const s of [-1, 1]) {
      c.box(2.5, 0.3, s * 0.38 - 0.04, 4.7, 0.66, s * 0.38 + 0.04, M.COCKPIT_TRIM);
      c.box(2.5, 0.64, s * 0.38 - 0.06, 4.7, 0.7, s * 0.38 + 0.06, M.COCKPIT_TRIM);
      c.box(2.9, 0.34, s * 0.3 - 0.1, 3.9, 0.52, s * 0.3 + 0.1, M.COCKPIT_PANEL);
      for (let i = 0; i < 9; i++) c.box(2.95 + i * 0.1, 0.52, s * 0.3 - 0.06, 2.99 + i * 0.1, 0.55 + (i % 2) * 0.012, s * 0.3 + 0.06, i % 3 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.03 });
    }
    // an ejection seat tilted back, headbox with the firing handle on top, yellow and black straps
    c.box(2.82, 0.36, -0.2, 3.35, 0.46, 0.2, M.SEAT_FABRIC);
    c.box(2.68, 0.4, -0.2, 2.9, 1.2, 0.2, M.SEAT_FABRIC);
    c.box(2.6, 1.1, -0.15, 2.9, 1.42, 0.15, M.COCKPIT_TRIM);
    c.box(2.7, 1.38, -0.12, 2.9, 1.46, 0.12, M.AC_YELLOW, { md: 0.04 });
    c.box(3.1, 0.46, -0.05, 3.3, 0.5, 0.05, M.AC_YELLOW, { md: 0.03 });
    for (const s of [-1, 1]) c.box(2.82, 0.5, s * 0.17 - 0.015, 3.3, 0.92, s * 0.17 + 0.015, M.AC_BLACK, { md: 0.03 });
    // the canopy rails, a single arch and the windscreen bow
    const bow = (x, ry, rz, th = 0.03) => c.fn(x - th, 0.7, -rz - 0.05, x + th, 0.7 + ry + 0.05, rz + 0.05, (px, py, pz) => { const d = Math.sqrt(((py - 0.7) / ry) ** 2 + (pz / rz) ** 2); return py >= 0.7 && Math.abs(d - 1) < 0.07 ? M.COCKPIT_TRIM : 0; });
    bow(2.1, 0.58, 0.4); bow(4.95, 0.45, 0.4, 0.04);
    c.box(2.1, 0.68, -0.4, 5.0, 0.72, -0.37, M.COCKPIT_TRIM); c.box(2.1, 0.68, 0.37, 5.0, 0.72, 0.4, M.COCKPIT_TRIM);
    // ------------------------------------------------------------------ panel (8 mm): HUD, one wide display and two side screens, a standby cluster
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(4.6, 0.4, -0.4, 4.72, 0.86, 0.4, M.COCKPIT_TRIM);
    pn.box(4.45, 0.86, -0.42, 4.95, 0.92, 0.42, M.COCKPIT_PANEL);
    pn.box(4.5, 0.92, -0.17, 4.82, 0.95, 0.17, M.COCKPIT_PANEL);
    pn.box(4.5, 0.95, -0.17, 4.56, 1.22, -0.16, M.COCKPIT_PANEL, { thin: true }); pn.box(4.5, 0.95, 0.16, 4.56, 1.22, 0.17, M.COCKPIT_PANEL, { thin: true });
    pn.box(4.5, 1.2, -0.17, 4.6, 1.24, 0.17, M.COCKPIT_PANEL);
    const scr = (z, y, w, h, x = 4.6) => { pn.box(x - 0.015, y - h / 2 - 0.012, z - w / 2 - 0.012, x + 0.002, y + h / 2 + 0.012, z + w / 2 + 0.012, DEEP); pn.box(x - 0.022, y - h / 2, z - w / 2, x - 0.012, y + h / 2, z + w / 2, M.GAUGE_FACE); };
    const line = (x0, y0, z0, x1, y1, z1, m) => pn.box(x0, y0, z0, x1, y1, z1, m, { thin: true, md: 0.02 });
    scr(0, 0.66, 0.42, 0.2); scr(-0.28, 0.5, 0.2, 0.14); scr(0.28, 0.5, 0.2, 0.14);
    // the wide display: a horizon line, a speed scale and an altitude scale, drawn in lines
    line(4.575, 0.66, -0.2, 4.585, 0.668, 0.2, M.NAV_GREEN);
    for (let i = 0; i < 8; i++) { line(4.575, 0.58 + i * 0.022, -0.2, 4.585, 0.585 + i * 0.022, -0.16 + (i % 2) * 0.02, M.NAV_GREEN); line(4.575, 0.58 + i * 0.022, 0.16 - (i % 2) * 0.02, 4.585, 0.585 + i * 0.022, 0.2, M.NAV_GREEN); }
    for (let i = 1; i <= 3; i++) for (let a = 0; a < 6; a++) line(4.575, 0.5 + Math.sin(a) * 0.015 * i, -0.28 + Math.cos(a) * 0.015 * i, 4.585, 0.505 + Math.sin(a) * 0.015 * i, -0.278 + Math.cos(a) * 0.015 * i, M.NAV_GREEN);
    for (let i = 0; i < 6; i++) line(4.575, 0.44 + (i % 3) * 0.02, 0.2 + i * 0.027, 4.585, 0.48 + ((i * 5) % 4) * 0.015, 0.206 + i * 0.027, i === 3 ? M.AC_YELLOW : M.NAV_GREEN);
    gauge(pn, 4.6, 0.43, -0.28, 0.035); gauge(pn, 4.6, 0.43, 0.28, 0.035);
    for (let i = 0; i < 14; i++) pn.box(4.58, 0.4, -0.36 + i * 0.055, 4.6, 0.42, -0.34 + i * 0.055, i % 5 === 1 ? M.SWITCH_RED : i % 5 === 3 ? M.AC_YELLOW : M.SWITCH_GRAY, { md: 0.02 });
    // ------------------------------------------------------------------ controls
    const stick = k.interior('stick', { pivot: [3.65, 0.34, 0.26], local: true, voxel: 0.01 });
    stick.cyl('y', 0, 0, 0.018, 0.018, 0, 0.22, M.COCKPIT_TRIM);
    stick.box(-0.04, 0.2, -0.03, 0.05, 0.34, 0.03, M.AC_BLACK);
    stick.box(-0.03, 0.3, -0.035, 0.0, 0.33, 0.035, M.SWITCH_RED, { md: 0.01 });
    const th = k.interior('throttleLever', { pivot: [3.4, 0.54, -0.3], local: true, voxel: 0.01 });
    th.cyl('y', 0, 0, 0.018, 0.018, 0, 0.2, M.COCKPIT_TRIM);
    th.box(-0.06, 0.18, -0.03, 0.06, 0.26, 0.03, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.14], ['pedalR', 0.14]]) {
      const p = k.interior(n, { pivot: [4.45, 0.34, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.05, -0.07, 0.02, 0.1, 0.07, M.STEEL_DARK);
    }
    needle(k.interior('nASI', { pivot: [4.598, 0.43, -0.28], local: true, voxel: 0.004 }), 0.03, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [4.598, 0.43, 0.28], local: true, voxel: 0.004 }), 0.03, M.NEEDLE_ORANGE);
  },
});
