import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, ringYZ, gauge, needle, wingPair, fin, propeller, clipToHull } from '../builders/parts.js';

/* Skylark SK-172: a forgiving four-seat high-wing trainer. Docile stall, long-travel gear, fixed tricycle undercarriage.
   Pilot sits in the left seat (negative z). Cockpit interior is modeled at 3 cm voxels. */

const WHITE = M.AC_WHITE, RED = M.AC_RED, GRAY = M.AC_GRAY_LIGHT;

const FUS = [
  { a: 3.74, c1: 0.0, c2: 0, r1: 0.14, r2: 0.14 },
  { a: 3.56, c1: 0.0, c2: 0, r1: 0.34, r2: 0.36 },
  { a: 3.1, c1: 0.0, c2: 0, r1: 0.5, r2: 0.5 },
  { a: 2.0, c1: 0.06, c2: 0, r1: 0.6, r2: 0.55, n: 2.4 },
  { a: 1.4, c1: 0.15, c2: 0, r1: 0.72, r2: 0.56, n: 2.6 },
  { a: -0.6, c1: 0.15, c2: 0, r1: 0.72, r2: 0.56, n: 2.6 },
  { a: -1.9, c1: 0.2, c2: 0, r1: 0.6, r2: 0.44, n: 2.4 },
  { a: -3.2, c1: 0.32, c2: 0, r1: 0.4, r2: 0.29 },
  { a: -4.6, c1: 0.42, c2: 0, r1: 0.16, r2: 0.09 },
];

export default defineAircraft({
  id: 'skylark',
  name: 'Skylark SK-172',
  manufacturer: 'Meridian Aeroworks',
  role: 'Light trainer',
  order: 1,
  difficulty: 1,
  tags: ['Docile stall', 'Short field', 'Fixed gear'],
  description: 'Four seats, one propeller and a wing that wants to keep flying. The aircraft to learn the island in. Short-field capable and impossible to spin by accident.',
  voxel: 0.0625,
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
    { part: 'elevator', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
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
    // ------------------------------------------------------------------ static airframe
    const body = k.part('body');
    body.loft('x', FUS, WHITE);
    // hollow cabin with window openings so the interior is visible from the cockpit
    body.loft('x', [
      { a: 1.72, c1: 0.16, c2: 0, r1: 0.62, r2: 0.49, n: 2.6 },
      { a: -1.7, c1: 0.18, c2: 0, r1: 0.62, r2: 0.49, n: 2.6 },
    ], 0);
    body.carve(1.05, 0.34, -0.72, 1.7, 0.78, 0.72);      // windshield
    body.carve(-1.35, 0.3, -0.72, 1.05, 0.78, -0.35);     // left window
    body.carve(-1.35, 0.3, 0.35, 1.05, 0.78, 0.72);       // right window
    body.carve(-1.7, 0.3, -0.72, -1.35, 0.7, -0.4, {});   // rear quarter windows
    body.carve(-1.7, 0.3, 0.4, -1.35, 0.7, 0.72);
    // engine cowl details: inlets, cheatline, exhaust
    for (const s of [-1, 1]) {
      body.box(3.45, -0.05, s * 0.2 - 0.09, 3.6, 0.13, s * 0.2 + 0.09, M.AC_EXHAUST, { md: 0.15 });
      body.box(-3.4, 0.1, s * 0.31 - 0.02, 2.05, 0.3, s * 0.31 + 0.02 + (s > 0 ? 0.25 : 0) * 0, RED, { md: 0.3 });
    }
    body.cyl('x', -0.32, 0.05, 0.05, 0.04, 2.0, 3.2, M.AC_METAL, { md: 0.15 });
    // wings: high, slightly tapered, small dihedral
    wingPair(body, [0.55, 1.02, 0.55], 5.0, 1.58, 1.2, 0.0, 0.26, 0.15, 0.11, WHITE);
    // leading edge stripe and tips
    for (const s of [-1, 1]) {
      body.box(-0.05, 1.0, s * 5.2, 0.6, 1.3, s * 5.6, RED, { md: 0.4 });
      body.box(0.2, 1.12, s * 5.57 - 0.03, 0.55, 1.34, s * 5.57 + 0.03, s < 0 ? M.NAV_RED : M.NAV_GREEN);
      strut(body, [0.05, -0.42, s * 0.5], [0.08, 1.0, s * 2.6], 0.09, GRAY);
      strut(body, [-0.05, -0.4, s * 0.52], [-0.08, 1.02, s * 2.62], 0.06, GRAY, { md: 0.25 });
    }
    // fixed tail surfaces
    wingPair(body, [-3.75, 0.66, 0.06], 1.65, 0.62, 0.5, 0.12, 0.0, 0.09, 0.07, WHITE);
    fin(body, -3.42, 0.62, 1.15, 0.6, 1.25, 0.28, 0.05, WHITE);
    body.box(-4.2, 1.55, -0.05, -3.9, 1.88, 0.05, RED, { md: 0.3 });
    body.box(-4.62, 0.44, -0.05, -4.5, 0.55, 0.05, M.STROBE, { md: 0.2 });
    // landing gear legs and fairings
    strut(body, [2.3, -0.4, 0], [2.35, -1.12, 0], 0.09, M.AC_METAL);
    body.box(2.2, -0.55, -0.12, 2.5, -0.35, 0.12, WHITE, { md: 0.3 });
    for (const s of [-1, 1]) {
      strut(body, [-0.12, -0.5, s * 0.48], [-0.42, -1.1, s * 1.36], 0.11, M.AC_METAL);
      body.box(-0.58, -1.2, s * 1.42 - 0.13, -0.24, -0.98, s * 1.42 + 0.13, WHITE, { md: 0.3 });
    }
    // antenna, beacon, landing light, pitot
    body.box(0.4, 0.85, -0.02, 0.44, 1.05, 0.02, M.STEEL_DARK, { md: 0.1 });
    body.box(-0.9, 0.86, -0.04, -0.6, 0.9, 0.04, M.AC_GRAY_DARK, { md: 0.12 });
    body.box(0.62, 0.98, 4.9, 0.7, 1.06, 4.98, M.LAMP_WHITE, { md: 0.15 });
    body.box(0.15, 1.15, 3.4, 0.55, 1.19, 3.46, M.STEEL, { md: 0.12 });

    // ------------------------------------------------------------------ control surfaces
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'aileronL' : 'aileronR', f = s < 0 ? 'flapL' : 'flapR';
      const a = k.part(n, { pivot: [-0.66, 1.17, s * 4.15], local: false });
      a.wing([-0.68, 1.14, s * 3.0], 2.3, 0.36, 0.34, 0, 0.13, 0.05, 0.045, s, WHITE);
      a.box(-1.02, 1.13, s * 3.0, -0.6, 1.2, s * 5.3, RED, { md: 0.2 });
      const fl = k.part(f, { pivot: [-0.62, 1.07, s * 1.7] });
      fl.wing([-0.6, 1.06, s * 0.75], 1.95, 0.4, 0.38, 0, 0.09, 0.06, 0.05, s, WHITE);
    }
    const el = k.part('elevator', { pivot: [-4.32, 0.68, 0] });
    for (const s of [-1, 1]) el.wing([-4.27, 0.67, s * 0.08], 1.6, 0.32, 0.27, 0.05, 0.0, 0.05, 0.04, s, WHITE);
    const rd = k.part('rudder', { pivot: [-4.38, 1.2, 0] });
    rd.loft('y', [
      { a: 0.72, c1: -4.5, c2: 0, r1: 0.2, r2: 0.045, n: 4 },
      { a: 1.75, c1: -4.32, c2: 0, r1: 0.12, r2: 0.035, n: 4 },
    ], WHITE, { thin: true });
    // propeller and wheels (local, spin about their pivots)
    propeller(k.part('propeller', { pivot: [3.8, 0.02, 0], local: true }), 0.95, 2, 0.16);
    wheel(k.part('wheelNose', { pivot: [2.35, -1.26, 0], local: true }), 0, 0, 0, 0.24, 0.13);
    wheel(k.part('wheelL', { pivot: [-0.42, -1.2, -1.42], local: true }), 0, 0, 0, 0.3, 0.15);
    wheel(k.part('wheelR', { pivot: [-0.42, -1.2, 1.42], local: true }), 0, 0, 0, 0.3, 0.15);
    // glass, hidden from the cockpit so the pilot sees through the openings
    const gl = k.part('glass', { hideInCockpit: true });
    gl.box(1.06, 0.36, -0.68, 1.68, 0.8, 0.68, M.AC_CANOPY);
    gl.carve(1.1, 0.4, -0.64, 1.64, 0.76, 0.64, { md: 0.3 });
    gl.box(1.08, 0.5, -0.66, 1.66, 0.79, 0.66, M.AC_CANOPY);
    for (const s of [-1, 1]) {
      gl.box(-1.34, 0.32, s * 0.545, 1.04, 0.76, s * 0.575, M.AC_CANOPY, { thin: true });
      gl.box(-1.68, 0.32, s * 0.5, -1.36, 0.7, s * 0.53, M.AC_CANOPY, { thin: true });
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
