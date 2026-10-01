import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, ringYZ, gauge, needle, clipToHull } from '../builders/parts.js';
import { decal, seams, seamsZ, rivets, prop, spinner, gearLeg, fairedStrut, frameBox, panelOutline, sitter } from '../builders/detail.js';
import { wingDef, wingSurface, surfaceSeams, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Skylark SK-172: a forgiving four-seat high-wing trainer. Docile stall, long-travel gear, fixed tricycle undercarriage.
   Pilot sits in the left seat (negative z). Cockpit interior is modeled at 2 cm voxels. The airframe is a hollow hull with real
   window openings, cut-out control surfaces, faired struts and a painted cheatline. */

const WHITE = M.AC_WHITE, RED = M.AC_RED, GRAY = M.AC_GRAY_LIGHT, DARK = M.AC_GRAY_DARK, BLACK = M.AC_BLACK, PIN = M.AC_ORANGE;

const WNG = (s) => wingDef([0.55, 1.0, 0], 5.55, 1.62, 1.2, 0.0, 0.29, 0.15, 0.11, s);
const STB = (s) => wingDef([-3.6, 0.66, s * 0.06], 1.65, 0.95, 0.72, 0.1, 0.1, 0.07, 0.06, s);
const FIN = { x: -3.42, y: 0.62, chord: 1.15, tip: 0.6, height: 1.25, sweep: 0.28, thick: 0.06 };
const yw = (z) => 1.0 + (0.29 * Math.abs(z)) / 5.55;                 // mid height of the wing at a station
const FUS = [
  { a: 3.52, c1: -0.02, c2: 0, r1: 0.38, r2: 0.43, n: 2.4 },
  { a: 3.4, c1: -0.01, c2: 0, r1: 0.44, r2: 0.47, n: 2.4 },
  { a: 3.1, c1: 0.0, c2: 0, r1: 0.5, r2: 0.5, n: 2.4 },
  { a: 2.0, c1: 0.06, c2: 0, r1: 0.6, r2: 0.55, n: 2.4 },
  { a: 1.4, c1: 0.15, c2: 0, r1: 0.72, r2: 0.56, n: 2.6 },
  { a: -0.6, c1: 0.15, c2: 0, r1: 0.72, r2: 0.56, n: 2.6 },
  { a: -1.9, c1: 0.2, c2: 0, r1: 0.6, r2: 0.44, n: 2.4 },
  { a: -3.2, c1: 0.32, c2: 0, r1: 0.4, r2: 0.29 },
  { a: -4.6, c1: 0.42, c2: 0, r1: 0.16, r2: 0.09 },
];
// the cheatline follows the belt of the cabin, then climbs with the centerline of the tail cone
const bandY = (x) => (x > -1.0 ? 0.04 : 0.04 + (-1.0 - x) * 0.095);
const bandW = (x) => (x > -1.0 ? 0.075 : Math.max(0.03, 0.075 - (-1.0 - x) * 0.012));

export default defineAircraft({
  id: 'skylark',
  name: 'Skylark SK-172',
  manufacturer: 'Meridian Aeroworks',
  category: 'private',
  role: 'Light trainer',
  order: 1,
  difficulty: 1,
  tags: ['Docile stall', 'Short field', 'Fixed gear'],
  description: 'Four seats, one propeller and a wing that wants to keep flying. The aircraft to learn the island in. Short-field capable and impossible to spin by accident.',
  voxel: 0.04,
  interiorVoxel: 0.02,
  lodLevels: 4,
  mass: { empty: 770, fuel: 144, payload: 165 },
  inertia: [1285, 2667, 1825],
  wing: { area: 16.2, span: 11.1, chord: 1.5 },
  aero: {
    CL0: 0.31, CLa: 4.6, CLmax: 1.6, alphaStall: 0.28, CD0: 0.031, k: 0.0568, CDflap: 0.05, CLflap: 0.5, Cmflap: -0.09, CLmaxFlap: 0.45,
    Cm0: 0.05, Cma: -0.9, Cmq: -13, Clb: 0.09, Clp: -0.47, Cnb: 0.07, Cnr: -0.11, Cyb: 0.31, Cnda: 0.02,
    control: { elevator: 0.55, aileron: 0.045, rudder: 0.03 },
  },
  propulsion: { type: 'prop', power: 118000, efficiency: 0.8, propDiameter: 1.9, maxRpm: 2700, idleRpm: 700, fuelBurn: 0.0095 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [2.35, -1.26, 0], radius: 0.24, k: 26000, c: 2200, steer: 0.5, cornering: 0.7, travel: 0.25 },
      { pos: [-0.42, -1.2, -1.42], radius: 0.3, k: 46000, c: 3400, brake: true, travel: 0.25 },
      { pos: [-0.42, -1.2, 1.42], radius: 0.3, k: 46000, c: 3400, brake: true, travel: 0.25 },
    ],
  },
  skids: [{ p: [-4.45, 0.45, 0], kind: 'tail' }, { p: [0.2, -0.62, 0], kind: 'belly' }, { p: [0, 1.15, 5.55], kind: 'tip' }, { p: [0, 1.15, -5.55], kind: 'tip' }, { p: [3.8, 0, 0], kind: 'nose' }],
  limits: { vne: 89, maxG: 4.4, flapSpeed: 46, gearSpeed: 999, crashVs: 7 },
  cameras: { cockpit: [0.3, 0.44, -0.3], chase: { distance: 15, height: 4 }, near: { distance: 7.4, height: 2.1 } },
  liveries: [{ id: 'default', name: 'Factory white and red' }],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.55 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.55 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'propeller', type: 'rotate', axis: [1, 0, 0], channel: 'propAngle', gain: 1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'yoke', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 1.1 },
    { part: 'yoke', type: 'translate', axis: [-1, 0, 0], channel: 'elevator', gain: 0.07 },
    { part: 'throttleKnob', type: 'translate', axis: [1, 0, 0], channel: 'throttle', gain: 0.07 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.02556, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nVSI', type: 'rotate', axis: [1, 0, 0], channel: 'vsFpm', gain: 0.00115 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.001533, offset: -2.3 },
    { part: 'attitude', type: 'rotate', axis: [0, 0, 1], channel: 'pitchGauge', gain: 1 },
    { part: 'attitude', type: 'rotate', axis: [1, 0, 0], channel: 'rollGauge', gain: -1 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage, the cabin hollowed out and its windows opened
    body.loft('x', FUS, WHITE);
    body.loft('x', [
      { a: 1.72, c1: 0.16, c2: 0, r1: 0.62, r2: 0.49, n: 2.6 },
      { a: -1.7, c1: 0.18, c2: 0, r1: 0.62, r2: 0.49, n: 2.6 },
    ], 0);
    const WS = [1.05, 0.34, -0.72, 1.7, 0.78, 0.72], LW = [-1.35, 0.3, -0.72, 1.05, 0.78, -0.35], RW = [-1.35, 0.3, 0.35, 1.05, 0.78, 0.72];
    const LQ = [-1.7, 0.3, -0.72, -1.35, 0.7, -0.4], RQ = [-1.7, 0.3, 0.4, -1.35, 0.7, 0.72];
    for (const b of [WS, LW, RW, LQ, RQ]) body.carve(...b);
    // ------------------------------------------------------------------ wings: high, straight leading edge, a little dihedral; the center section runs over the cabin roof
    for (const s of [-1, 1]) {
      const w = WNG(s);
      body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, WHITE);
      body.ell(-0.05, yw(5.55), s * 5.56, 0.62, 0.072, 0.1, RED);                                          // the rounded tip cap
    }
    // ------------------------------------------------------------------ tail: stabilizers, fin
    for (const s of [-1, 1]) { const w = STB(s); body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, WHITE); }
    body.loft('y', finStations(FIN), WHITE, { thin: true });
    // ------------------------------------------------------------------ cowling: a red bezel on the face, two cooling inlets, the split line, fasteners and a tail pipe
    body.paint(3.46, -0.6, -0.6, 3.6, 0.6, 0.6, (x, y, z) => ((Math.abs(z / 0.43) ** 2.4 + Math.abs((y + 0.02) / 0.38) ** 2.4) ** (1 / 2.4) > 0.84 ? RED : 0));
    const inlet = (s, y, z, e) => ((z - s * 0.3) / (0.095 + e)) ** 2 + ((y + 0.03) / (0.13 + e)) ** 2 < 1;
    for (const s of [-1, 1]) {
      body.fn(3.3, -0.2, s * 0.3 - 0.12, 3.6, 0.2, s * 0.3 + 0.12, (x, y, z) => (x > 3.38 && inlet(s, y, z, 0) ? -1 : 0), { md: 0.1 });
      body.paint(3.3, -0.2, s * 0.3 - 0.14, 3.6, 0.2, s * 0.3 + 0.14, (x, y, z) => (x > 3.33 && inlet(s, y, z, 0.03) ? BLACK : 0), { md: 0.1 });
    }
    body.cyl('x', -0.52, 0.2, 0.05, 0.045, 1.9, 2.4, M.AC_EXHAUST, { md: 0.1 });                            // the tail pipe under the belly
    // ------------------------------------------------------------------ paint: cheatline with a pinstripe, fin tip, wing walkways, fuel caps
    body.paint(-4.7, -0.3, -0.7, 3.5, 0.8, 0.7, (x, y) => {
      const d = y - bandY(x), w = bandW(x);
      if (Math.abs(d) < w) return RED;
      if (Math.abs(d - w - 0.045) < 0.014) return PIN;
      return 0;
    }, { thin: true });
    const finPaint = (r) => r.paint(-4.7, 1.3, -0.2, -3.5, 1.95, 0.2, (x, y) => (y > 1.64 ? RED : Math.abs(y - 1.59) < 0.014 ? PIN : 0), { thin: true });
    finPaint(body);
    for (const s of [-1, 1]) {
      body.paint(-0.2, 0.9, Math.min(s * 0.66, s * 1.55), 0.42, 1.5, Math.max(s * 0.66, s * 1.55), (x, y, z) => (y > yw(z) + 0.02 ? DARK : 0));    // the non-slip walkway at the wing root
      body.paint(-0.07, 1.0, s * 3.0 - 0.1, 0.09, 1.5, s * 3.0 + 0.1, (x, y, z) => (y > yw(z) && Math.hypot(x - 0.0, z - s * 3.0) < 0.075 ? M.AC_METAL : 0));   // fuel filler cap
      decal(body, 'N172SK', { x: -3.2, y: 0.4, side: s, px: 0.03, mat: DARK, z0: 0.05, z1: 0.4 });
      body.paint(-0.9, 0.9, Math.min(s * 3.3, s * 5.2), 0.6, 1.5, Math.max(s * 3.3, s * 5.2), (x, y, z) => (y > yw(z) && Math.abs(x + 0.2) < 0.01 ? GRAY : 0), { thin: true });   // the spar line
    }
    // ------------------------------------------------------------------ cabin: window gaskets, doors, handles, struts
    for (const b of [WS, LW, RW, LQ, RQ]) frameBox(body, b, 0.03, BLACK);
    for (const s of [-1, 1]) {
      panelOutline(body, s, -0.55, -0.52, 1.02, 0.3, { w: 0.014, mat: DARK, z0: 0.3 });                    // the cabin door
      panelOutline(body, s, 2.55, 0.02, 3.0, 0.3, { w: 0.008, mat: M.AC_GRAY, z0: 0.3 });                       // the oil access door
      body.box(0.6, 0.12, s > 0 ? 0.54 : -0.62, 0.8, 0.18, s > 0 ? 0.62 : -0.54, M.AC_METAL, { md: 0.1 });  // the door handle
      body.box(2.88, 0.14, s > 0 ? 0.5 : -0.56, 2.94, 0.18, s > 0 ? 0.56 : -0.5, M.AC_METAL, { md: 0.08 });
      // wing struts: a faired main strut and a jury strut to the wing
      fairedStrut(body, [0.1, -0.42, s * 0.42], [0.12, 1.07, s * 2.7], { chord: 0.2, thick: 0.07, mat: WHITE });
      strut(body, [0.112, 0.5, s * 1.83], [0.14, 1.1, s * 3.5], 0.035, WHITE, { md: 0.1 });
      body.box(0.0, 1.0, s * 2.7 - 0.08, 0.24, 1.08, s * 2.7 + 0.08, WHITE, { md: 0.1 });                  // the strut attach fitting
      body.box(-0.03, -0.46, s * 0.4 - 0.05, 0.23, -0.38, s * 0.4 + 0.05, DARK, { md: 0.1 });
    }
    seams(body, [-4.5, -0.7, -0.7, 3.5, 0.9, 0.7], [2.1, -1.95, -2.5, -3.95], { w: 0.01, mat: GRAY, ymin: -0.62 });
    rivets(body, [2.2, 0.2, -0.5, 3.4, 0.62, 0.5], 0.16, 0.24, { mat: GRAY, ymin: 0.3, size: 0.016 });
    // ------------------------------------------------------------------ lights, antennas, pitot, stall vane
    for (const s of [-1, 1]) {
      body.ell(0.3, yw(5.56), s * 5.62, 0.2, 0.075, 0.045, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.1 });
      body.ell(-0.62, yw(5.56), s * 5.58, 0.07, 0.05, 0.04, M.STROBE, { md: 0.1 });
    }
    body.box(0.5, 0.99, -3.75, 0.62, 1.07, -3.55, M.LAMP_WHITE, { md: 0.1 });                               // landing light in the left leading edge
    body.cyl('x', 1.03, -3.3, 0.018, 0.014, 0.55, 0.95, M.STEEL, { md: 0.1 });                              // pitot
    body.box(0.5, 0.98, -3.34, 0.62, 1.04, -3.26, M.AC_GRAY_DARK, { md: 0.1 });
    body.box(0.5, 1.06, 3.0, 0.62, 1.13, 3.04, DARK, { md: 0.1 });                                          // the stall warning vane
    body.box(-1.3, 0.8, -0.015, -1.2, 1.0, 0.015, M.STEEL_DARK, { md: 0.1 });                               // com whip on the cabin roof
    body.box(-3.05, 0.72, -0.012, -2.75, 0.84, 0.012, DARK, { md: 0.1 });                                   // the ELT blade
    body.box(0.55, -0.72, -0.015, 0.7, -0.56, 0.015, DARK, { md: 0.1 });                                    // DME blade under the belly
    body.box(-3.98, 1.86, -0.045, -3.82, 1.93, 0.045, M.BEACON_RED, { md: 0.1 });                           // beacon on the fin
    body.box(-4.66, 0.34, -0.045, -4.57, 0.46, 0.045, M.STROBE, { md: 0.2 });                               // tail light
    // ------------------------------------------------------------------ landing gear: a sprung nose leg, steel spring main legs
    gearLeg(body, [2.3, -0.3, 0], [2.35, -1.26, 0], { thick: 0.1, lower: 0.07, fork: 0.1 });
    body.box(2.2, -0.72, -0.1, 2.5, -0.34, 0.1, WHITE, { md: 0.3 });
    body.cyl('y', 2.34, 0, 0.065, 0.065, -0.78, -0.72, M.AC_METAL, { md: 0.1 });
    for (const s of [-1, 1]) {
      fairedStrut(body, [-0.1, -0.45, s * 0.46], [-0.42, -1.16, s * 1.36], { chord: 0.24, thick: 0.07, mat: M.STEEL_DARK, taper: 0.8 });
      body.cyl('z', -0.42, -1.2, 0.04, 0.04, s * 1.3 - 0.07, s * 1.3 + 0.07, M.AC_METAL, { md: 0.1 });
      body.box(-0.62, -1.3, s * 1.28 - 0.02, -0.5, -1.12, s * 1.28 + 0.02, DARK, { md: 0.1 });              // brake caliper
      body.box(-0.2, -0.56, s * 0.5 - 0.03, 0.08, -0.5, s * 0.5 + 0.03, DARK, { md: 0.1 });                  // leg fitting on the cabin side
    }

    // ------------------------------------------------------------------ control surfaces, cut out of the airframe so the gaps are real
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      const W = WNG(s), sp = { z0: 0.75, z1: 2.95, frac: 0.3 }, ap = { z0: 3.1, z1: 5.2, frac: 0.28 };
      const fl = wingSurface(k, body, 'flap' + n, W, { ...sp, mat: WHITE });
      const al = wingSurface(k, body, 'aileron' + n, W, { ...ap, mat: WHITE });
      for (const [r, spec] of [[body, sp], [fl, sp], [body, ap], [al, ap]]) surfaceSeams(r, W, { ...spec, mat: DARK });
      const stab = STB(s);
      const el = wingSurface(k, body, 'elevator' + n, stab, { z0: 0.14, z1: 1.64, frac: 0.4, mat: WHITE });
      for (const r of [body, el]) surfaceSeams(r, stab, { z0: 0.14, z1: 1.64, frac: 0.4, mat: DARK });
      seamsZ(el, [-4.6, 0.5, Math.min(0.6 * s, 1.2 * s), -4.27, 0.9, Math.max(0.6 * s, 1.2 * s)], [0.7, 1.1], { w: 0.008, mat: DARK });      // the trim tab
      seams(el, [-4.5, 0.5, Math.min(0.7 * s, 1.1 * s), -4.2, 0.9, Math.max(0.7 * s, 1.1 * s)], [-4.27], { w: 0.008, mat: DARK });
    }
    const hinge = finAt(FIN, 1.1);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: WHITE, box: [-4.8, 0.72, -0.2, -3.4, 1.95, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.36 && y > FIN.y + 0.1; },
      pivot: [hinge.te + hinge.chord * 0.36, 1.1, 0],
    });
    finPaint(rd);
    // ------------------------------------------------------------------ propeller and wheels (local, spin about their pivots)
    const pp = k.part('propeller', { pivot: [3.68, -0.02, 0], local: true });
    prop(pp, 0.95, 2, { chord: 0.17, hubR: 0.07, twist: 0.35, tipLen: 0.2 });
    spinner(pp, -0.14, 0.24, 0.19, RED);
    pp.cyl('x', 0, 0, 0.2, 0.2, -0.17, -0.14, M.AC_METAL, { md: 0.1 });                                      // the spinner back plate
    wheel(k.part('wheelNose', { pivot: [2.35, -1.26, 0], local: true }), 0, 0, 0, 0.24, 0.13);
    wheel(k.part('wheelL', { pivot: [-0.42, -1.2, -1.42], local: true }), 0, 0, 0, 0.3, 0.15);
    wheel(k.part('wheelR', { pivot: [-0.42, -1.2, 1.42], local: true }), 0, 0, 0, 0.3, 0.15);
    for (const [n, w] of [['wheelNose', 0.13], ['wheelL', 0.15], ['wheelR', 0.15]]) {
      const wp = k.parts.find((p) => p.name === n).recipe;
      wp.cyl('z', 0, 0, 0.05, 0.05, -w / 2 - 0.035, w / 2 + 0.035, M.AC_METAL, { md: 0.1 });                 // axle nut and hub cap
    }
    // ------------------------------------------------------------------ glass, hidden from the cockpit so the pilot sees through the openings
    const gl = k.part('glass', { hideInCockpit: true });
    gl.box(1.06, 0.36, -0.68, 1.68, 0.8, 0.68, M.AC_CANOPY);
    gl.carve(1.1, 0.4, -0.64, 1.64, 0.76, 0.64, { md: 0.3 });
    gl.box(1.08, 0.5, -0.66, 1.66, 0.79, 0.66, M.AC_CANOPY);
    for (const s of [-1, 1]) {
      gl.box(-1.34, 0.32, s * 0.545, 1.04, 0.76, s * 0.575, M.AC_CANOPY, { thin: true });
      gl.box(-1.68, 0.32, s * 0.5, -1.36, 0.7, s * 0.53, M.AC_CANOPY, { thin: true });
      gl.box(1.0, 0.3, s * 0.5, 1.14, 0.8, s * 0.6, WHITE, { md: 0.1 });                                      // the A pillars
      gl.box(-1.4, 0.3, s * 0.5, -1.3, 0.76, s * 0.6, WHITE, { md: 0.1 });                                    // the B pillars
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ static cabin (3 cm voxels)
    const c = k.interior('cabin');
    c.box(-1.7, -0.5, -0.5, 1.72, -0.4, 0.5, M.CARPET);
    c.box(1.2, -0.5, -0.5, 1.72, -0.06, 0.5, M.COCKPIT_TRIM);             // firewall trim
    // seats: pilot left, passenger right, bench behind
    for (const s of [-1, 1]) {
      c.box(0.05, -0.4, s * 0.3 - 0.2, 0.62, -0.26, s * 0.3 + 0.2, M.SEAT_FABRIC);               // cushion
      c.box(-0.02, -0.26, s * 0.3 - 0.2, 0.14, 0.3, s * 0.3 + 0.2, M.SEAT_FABRIC);               // back
      c.box(-0.04, 0.3, s * 0.3 - 0.1, 0.1, 0.52, s * 0.3 + 0.1, M.SEAT_FABRIC);                 // headrest
      c.box(0.2, -0.48, s * 0.3 - 0.03, 0.5, -0.4, s * 0.3 + 0.03, M.STEEL_DARK, { md: 0.06 });  // rail
    }
    c.box(-1.0, -0.4, -0.44, -0.45, -0.26, 0.44, M.SEAT_FABRIC);
    c.box(-1.08, -0.26, -0.44, -0.94, 0.3, 0.44, M.SEAT_FABRIC);
    // center console with flap and trim controls
    c.box(-0.25, -0.4, -0.07, 0.55, -0.2, 0.07, M.COCKPIT_TRIM);
    c.box(0.15, -0.2, -0.02, 0.35, -0.14, 0.02, M.SWITCH_RED, { md: 0.05 });
    // door panels, armrests, window frames, headliner
    for (const s of [-1, 1]) {
      c.box(-1.7, -0.3, s * 0.44, 1.2, 0.28, s * 0.47, M.COCKPIT_TRIM, { thin: true });
      c.box(-0.3, -0.08, s * 0.4, 0.5, -0.02, s * 0.47, M.SEAT_LEATHER, { md: 0.1 });
      c.box(0.05, 0.04, s * 0.44, 0.14, 0.09, s * 0.48, M.STEEL, { md: 0.05 });
      c.box(1.02, 0.28, s * 0.5, 1.2, 0.85, s * 0.56, M.COCKPIT_TRIM);   // A pillar
      c.box(-1.4, 0.3, s * 0.5, -1.3, 0.8, s * 0.56, M.COCKPIT_TRIM);     // B pillar
    }
    c.box(-1.7, 0.72, -0.5, 1.2, 0.8, 0.5, M.AC_GRAY);
    c.box(0.45, 0.66, -0.12, 0.95, 0.72, 0.12, M.COCKPIT_TRIM);
    c.box(0.6, 0.6, -0.03, 0.75, 0.66, 0.03, M.SWITCH_RED, { md: 0.05 });
    // co-pilot yoke (static)
    c.box(1.14, -0.09, 0.3, 1.2, -0.01, 0.34, M.COCKPIT_TRIM);
    ringYZ(c, 0.72, 0.78, -0.02, 0.32, 0.15, 0.03, M.COCKPIT_PANEL);
    c.box(0.72, 0.13, 0.31, 0.78, 0.14, 0.33, M.COCKPIT_PANEL, { md: 0.03 });
    c.cyl('x', -0.02, 0.32, 0.03, 0.03, 0.76, 1.14, M.COCKPIT_PANEL);
    // a flight bag on the rear bench, a map case in the door pocket
    c.ell(-0.74, -0.12, -0.14, 0.26, 0.14, 0.19, M.AC_DRAB);
    c.box(-0.98, 0.0, -0.14 - 0.03, -0.5, 0.03, -0.14 + 0.03, M.AC_GRAY_DARK, { md: 0.06 });
    c.box(-0.56, -0.16, -0.31, -0.5, -0.04, -0.01, M.AC_BLACK, { md: 0.06 });
    clipToHull(c, FUS, 'x', 0.09, [-2, -0.8, -0.8, 2, 0.2, 0.8]);

    // ------------------------------------------------------------------ instrument panel (8 mm voxels)
    const pn = k.interior('panel', { voxel: 0.0078125 });
    pn.box(1.1, 0.02, -0.52, 1.3, 0.56, 0.52, M.COCKPIT_PANEL);             // panel
    pn.box(1.02, 0.56, -0.52, 1.5, 0.63, 0.52, M.COCKPIT_TRIM);              // glare shield
    pn.box(1.26, -0.06, -0.5, 1.36, 0.04, 0.5, M.COCKPIT_TRIM);
    pn.box(1.2, 0.02, -0.06, 1.32, 0.3, 0.06, M.COCKPIT_TRIM);              // center stack
    for (let i = 0; i < 5; i++) pn.box(1.08, 0.06 + i * 0.05, -0.05, 1.11, 0.09 + i * 0.05, 0.05, i % 2 ? M.SWITCH_GRAY : M.SWITCH_RED, { md: 0.06 });
    for (let i = 0; i < 6; i++) pn.box(1.09, 0.03, -0.44 + i * 0.05, 1.11, 0.07, -0.42 + i * 0.05, i % 3 ? M.SWITCH_GRAY : M.SWITCH_RED, { md: 0.02 });
    pn.cyl('x', 0.5, 0.36, 0.022, 0.022, 1.04, 1.1, M.STEEL_BRIGHT, { md: 0.02 });   // magnetic compass
    pn.cyl('x', 0.5, 0.36, 0.016, 0.016, 1.036, 1.04, M.GAUGE_FACE, { md: 0.02 });
    const gx = 1.1;
    gauge(pn, gx, 0.44, -0.44, 0.075); gauge(pn, gx, 0.44, -0.27, 0.075); gauge(pn, gx, 0.44, -0.1, 0.075);
    gauge(pn, gx, 0.26, -0.44, 0.075); gauge(pn, gx, 0.26, -0.27, 0.075); gauge(pn, gx, 0.26, -0.1, 0.075);
    gauge(pn, gx, 0.44, 0.22, 0.09); gauge(pn, gx, 0.24, 0.22, 0.07); gauge(pn, gx, 0.44, 0.42, 0.05);

    // the front seat passenger, who holds the right-hand yoke
    const px = k.interior('passenger', { voxel: 0.02 });
    sitter(px, 0.3, -0.27, 0.3, { hands: [[0.74, 0.0, 0.2], [0.74, 0.0, 0.44]], floor: -0.4, feetX: 0.95, shirt: M.PAINT_BLUEGRAY, pants: M.SIDING_BLUE, hair: M.AC_GRAY_DARK, headset: false, shades: false });
    clipToHull(px, FUS, 'x', 0.07, [-0.5, -0.9, -0.9, 1.4, 1.0, 0.9]);

    // ------------------------------------------------------------------ animated controls
    const yoke = k.interior('yoke', { pivot: [1.14, -0.02, -0.32], local: true, voxel: 0.015625 });
    yoke.cyl('x', 0, 0, 0.03, 0.03, -0.42, 0.0, M.COCKPIT_PANEL);
    ringYZ(yoke, -0.44, -0.38, 0, 0, 0.15, 0.03, M.COCKPIT_PANEL);
    yoke.box(-0.44, -0.16, -0.03, -0.38, 0.16, 0.03, M.COCKPIT_PANEL);
    yoke.box(-0.44, 0.14, -0.05, -0.36, 0.2, 0.05, M.SWITCH_GRAY, { md: 0.04 });
    const thr = k.interior('throttleKnob', { pivot: [1.1, -0.02, 0.0], local: true, voxel: 0.0078125 });
    thr.cyl('x', 0, 0, 0.012, 0.012, -0.08, 0.02, M.STEEL);
    thr.cyl('x', 0, 0, 0.035, 0.035, -0.14, -0.08, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.24], ['pedalR', 0.24]]) {
      const p = k.interior(n, { pivot: [1.0, -0.42, z], local: true, voxel: 0.015625 });
      p.box(-0.02, -0.1, -0.09, 0.02, 0.1, 0.09, M.STEEL_DARK);
      p.box(-0.02, -0.14, -0.09, 0.0, -0.1, 0.09, M.AC_BLACK, { md: 0.03 });
    }
    const gx2 = 1.068; // in front of the gauge face (its front is at 1.074), otherwise the needles are buried
    for (const [n, cy, cz, len] of [['nASI', 0.44, -0.44, 0.06], ['nALT', 0.44, -0.1, 0.06], ['nVSI', 0.26, -0.1, 0.055], ['nRPM', 0.44, 0.22, 0.07]]) {
      needle(k.interior(n, { pivot: [gx2, cy, cz], local: true, voxel: 0.00390625 }), len, M.NEEDLE_ORANGE);
    }
    // attitude indicator: a two-tone gyro ball that pitches and rolls behind the bezel
    const ai = k.interior('attitude', { pivot: [1.118, 0.44, -0.27], local: true, voxel: 0.00390625 });
    const R = 0.052;
    ai.fn(-R, -R, -R, R, R, R, (x, y, z) => {
      if (x * x + y * y + z * z > R * R) return 0;
      if (Math.abs(y) < 0.0035) return M.GAUGE_WHITE;
      if (x < 0) for (let t = 1; t <= 3; t++) if (Math.abs(Math.abs(y) - 0.014 * t) < 0.0025 && Math.abs(z) < 0.024 - 0.005 * t) return M.GAUGE_WHITE;
      return y > 0 ? M.SIDING_BLUE : M.BRICK_BROWN;
    });
  },
});
