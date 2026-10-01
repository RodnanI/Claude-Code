import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle, ringYZ } from '../builders/parts.js';
import { decal, pilot, prop, spinner, store, navLights, rivets } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Hauler RH-1: a county school bus with a radial engine where the hood was, a wing bolted on the roof and the stop sign still
   works. The driver sits on the left like always, the seats are all still there, and the flashing lights are red for a reason. It
   hauls twenty children or a ton of anything and lands where the road is. Body origin at the center of gravity, +x forward. */

const YEL = M.AC_YELLOW, BLK = M.AC_BLACK, WHT = M.AC_WHITE, GLASS = M.GLASS_DARK, DARK = M.STEEL_DARK;
const FL = -0.5;                                          // top of the floor
const WX_L = [0.7, -0.1, -0.9, -1.7, -2.5, -3.2], WX_R = [0.7, -0.1, -0.9, -1.7, -2.5, -3.2];
const WIN = { y0: 0.5, y1: 1.3, h: 0.34 };
const roofY = (z) => 1.7 + 0.12 * (1 - (z / 1.2) ** 2);

const WING = (s) => wingDef([1.0, 2.7, s * 0.4], 6.1, 2.4, 1.8, 0.3, 0.2, 0.09, 0.08, s);
const ST = (s) => wingDef([-6.8, 0.5, s * 0.1], 2.5, 1.4, 1.0, 0.2, 0, 0.08, 0.08, s);
const FIN = { x: -6.8, y: 0.5, chord: 1.6, tip: 1.0, height: 2.8, sweep: 0.5, thick: 0.05 };

export default defineAircraft({
  id: 'hauler',
  name: 'Hauler RH-1',
  manufacturer: 'County Transit Surplus',
  role: 'Flying school bus',
  category: 'homebuilt',
  order: 14,
  difficulty: 4,
  tags: ['School bus', 'Radial engine', 'Full interior', 'Stop sign'],
  description: 'A surplus school bus with a radial engine in the nose, a wing on the roof and two telephone poles for a tail. The seats are green vinyl, the driver sits on the left and the stop sign deploys with the air brake. Carries a ton, lands on a road, and always stops traffic.',
  voxel: 0.0625,
  interiorVoxel: 0.025,
  lodLevels: 4,
  mass: { empty: 2400, fuel: 220, payload: 550 },
  inertia: [5200, 21000, 18000],
  wing: { area: 33, span: 13.0, chord: 2.2, y: 2.7 },
  aero: {
    CL0: 0.32, CLa: 4.7, CLmax: 1.65, alphaStall: 0.3, CD0: 0.052, k: 0.05, CDflap: 0.07, CLflap: 0.55, Cmflap: -0.1, CLmaxFlap: 0.5, CDgear: 0.04, CDair: 0.18,
    Cm0: 0.04, Cma: -0.9, Cmq: -15, Clb: 0.1, Clp: -0.55, Cnb: 0.1, Cnr: -0.18, Cyb: 0.45, Cnda: 0.02, spin: 0.25, stallPitchDown: 0.08,
    control: { elevator: 0.55, aileron: 0.06, rudder: 0.045 },
  },
  propulsion: { type: 'prop', power: 600000, efficiency: 0.76, propDiameter: 3.0, maxRpm: 2300, idleRpm: 650, fuelBurn: 0.05, staticFactor: 0.6, spin: 0.25 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [2.2, -0.75, -1.35], radius: 0.5, k: 70000, c: 5500, steer: 0.5, cornering: 0.8, travel: 0.2 },
      { pos: [2.2, -0.75, 1.35], radius: 0.5, k: 70000, c: 5500, steer: 0.5, cornering: 0.8, travel: 0.2 },
      { pos: [-1.2, -0.75, -1.35], radius: 0.5, k: 70000, c: 5500, brake: true, travel: 0.2 },
      { pos: [-1.2, -0.75, 1.35], radius: 0.5, k: 70000, c: 5500, brake: true, travel: 0.2 },
    ],
  },
  skids: [
    { p: [4.8, 0.0, 0], kind: 'nose' }, { p: [-7.2, 0.5, 0], kind: 'tail' }, { p: [0.5, 2.7, 6.6], kind: 'tip' }, { p: [0.5, 2.7, -6.6], kind: 'tip' },
    { p: [0.4, -0.7, 0], kind: 'belly' }, { p: [-6.6, 3.2, 0], kind: 'tail' }, { p: [-3.8, 0.0, 0], kind: 'belly' },
  ],
  limits: { vne: 85, maxG: 3, minG: 0.6, flapSpeed: 42, gearSpeed: 999, crashVs: 5 },
  cameras: { cockpit: [1.85, 0.66, -0.55], chase: { distance: 28, height: 6 }, near: { distance: 13, height: 3.2 } },
  liveries: [
    { id: 'default', name: 'School bus yellow' },
    { id: 'church', name: 'Church bus', remap: { AC_YELLOW: 'AC_WHITE', AC_BLACK: 'GLASS_BLUE' } },
    { id: 'rust', name: 'Retired', remap: { AC_YELLOW: 'RUST', AC_BLACK: 'RUST_DARK' } },
    { id: 'county', name: 'Green county', remap: { AC_YELLOW: 'PAINT_GREEN' } },
  ],
  stations: [
    { id: 'jugL', pos: [1.2, 2.4, -4.0], kind: 'rack' }, { id: 'jugR', pos: [1.2, 2.4, 4.0], kind: 'rack' },
    { id: 'propL', pos: [1.0, 2.4, -5.4], kind: 'rack' }, { id: 'propR', pos: [1.0, 2.4, 5.4], kind: 'rack' },
  ],
  weapons: [
    { id: 'spud', name: 'Hood-mounted potato cannon', type: 'gun', munition: 'spud', ammo: 50, rate: 3, muzzle: [4.2, 0.42, 0.0], spread: 0.016, flash: 0.5 },
    { id: 'jugs', name: 'Moonshine jugs', type: 'bomb', munition: 'jug', stations: ['jugL', 'jugR'] },
    { id: 'propane', name: 'Propane tank', type: 'bomb', munition: 'propane', stations: ['propL', 'propR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.45 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.45 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'propeller', type: 'rotate', axis: [1, 0, 0], channel: 'propAngle', gain: 1 },
    { part: 'stopSign', type: 'rotate', axis: [0, 1, 0], channel: 'airbrake', gain: -1.55 },
    ...['FL', 'FR', 'RL', 'RR'].flatMap((n, i) => [
      { part: 'wheel' + n, type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
      { part: 'wheel' + n, type: 'translate', axis: [0, 1, 0], channel: 'comp' + i, gain: 1 },
    ]),
    { part: 'wheelFL', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelFR', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'busWheel', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 2.0 },
    { part: 'busWheel', type: 'translate', axis: [1, 0, 0], channel: 'elevator', gain: -0.1 },
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
    // ------------------------------------------------------------------ the bus body: floor, side walls, a front and a rear wall, a gently crowned roof
    body.box(-3.8, -0.62, -1.2, 2.7, FL - 0.02, 1.2, DARK);                                                  // the frame and floor
    body.box(-3.8, FL - 0.02, -1.2, 2.7, 1.62, -1.1, YEL);                                                    // left wall
    body.box(-3.8, FL - 0.02, 1.1, 2.7, 1.62, 1.2, YEL);                                                      // right wall
    body.box(2.6, FL - 0.02, -1.2, 2.7, 1.62, 1.2, YEL);                                                      // front wall
    body.box(-3.8, FL - 0.02, -1.2, -3.7, 1.62, 1.2, YEL);                                                    // rear wall
    body.fn(-3.82, 1.55, -1.22, 2.72, 1.9, 1.22, (x, y, z) => (y >= 1.55 && y <= roofY(z) ? (y > roofY(z) - 0.1 ? WHT : YEL) : 0));   // the roof, crowned and white
    // beltline stripes, rub rails, the black skirt, a black bumper, rear lights and a rear door
    body.paint(-3.9, -0.7, -1.3, 2.8, 1.8, 1.3, (x, y, z) => {
      const side = Math.abs(z) > 1.14 || x > 2.64 || x < -3.76;
      if (!side) return 0;
      if (y < -0.35) return BLK;
      if (Math.abs(y - 0.33) < 0.06 || Math.abs(y + 0.08) < 0.05 || Math.abs(y - 1.55) < 0.05) return BLK;
      return 0;
    }, { thin: true, md: 0.1 });
    body.box(-3.95, -0.45, -1.15, -3.8, -0.3, 1.15, BLK, { md: 0.1 });
    body.box(2.6, -0.45, -1.15, 2.78, -0.3, 1.15, BLK, { md: 0.1 });
    // windows: tall rectangles down both sides, the windshield in two panes with a post, a rear window, the right-hand door opening
    for (const x of WX_L) body.carve(x - WIN.h, WIN.y0, -1.25, x + WIN.h, WIN.y1, -1.05, FINE);
    for (const x of WX_R) body.carve(x - WIN.h, WIN.y0, 1.05, x + WIN.h, WIN.y1, 1.25, FINE);
    body.carve(1.2, WIN.y0, -1.25, 2.4, 1.3, -1.05, FINE);                                                   // the driver's big window
    body.carve(2.55, 0.52, -1.04, 2.75, 1.5, -0.04, FINE); body.carve(2.55, 0.52, 0.04, 2.75, 1.5, 1.04, FINE);   // windshield
    body.carve(-3.85, 0.5, -0.9, -3.65, 1.3, 0.9, FINE);                                                     // rear window
    body.carve(1.5, FL - 0.1, 1.05, 2.4, 1.45, 1.25, FINE);                                                  // the entry door, open
    for (const x of WX_L) body.paint(x - WIN.h - 0.07, WIN.y0 - 0.07, -1.25, x + WIN.h + 0.07, WIN.y1 + 0.07, -1.05, (px, py) => (px < x - WIN.h + 0.02 || px > x + WIN.h - 0.02 || py < WIN.y0 + 0.02 || py > WIN.y1 - 0.02 ? M.AC_GRAY : 0), { thin: true, md: 0.1 });
    for (const x of WX_R) body.paint(x - WIN.h - 0.07, WIN.y0 - 0.07, 1.05, x + WIN.h + 0.07, WIN.y1 + 0.07, 1.25, (px, py) => (px < x - WIN.h + 0.02 || px > x + WIN.h - 0.02 || py < WIN.y0 + 0.02 || py > WIN.y1 - 0.02 ? M.AC_GRAY : 0), { thin: true, md: 0.1 });
    decal(body, 'SCHOOL BUS', { x: -1.0, y: 1.32, side: 1, px: 0.045, mat: BLK, z0: 1.15, z1: 1.3 });
    decal(body, 'SCHOOL BUS', { x: -1.0, y: 1.32, side: -1, px: 0.045, mat: BLK, z0: 1.15, z1: 1.3 });
    decal(body, 'HAULER', { x: -1.8, y: 0.15, side: 1, px: 0.05, mat: BLK, z0: 1.15, z1: 1.3 });
    decal(body, 'HAULER', { x: -1.8, y: 0.15, side: -1, px: 0.05, mat: BLK, z0: 1.15, z1: 1.3 });
    decal(body, '9', { x: 0.2, y: 0.15, side: 1, px: 0.09, mat: BLK, z0: 1.15, z1: 1.3 });
    decal(body, '9', { x: 0.2, y: 0.15, side: -1, px: 0.09, mat: BLK, z0: 1.15, z1: 1.3 });
    rivets(body, [-3.7, -0.3, -1.3, 2.6, 1.5, 1.3], 0.22, 0.22, { mat: M.AC_GRAY_LIGHT, ymin: -0.2, ymax: 1.5 });
    // flashing lights, roof hatches, mirrors, the exhaust stack
    for (const [x, z, m] of [[2.4, -1.0, M.NAV_RED], [2.4, 1.0, M.NAV_RED], [2.4, -0.7, M.AC_ORANGE], [2.4, 0.7, M.AC_ORANGE], [-3.6, -1.0, M.NAV_RED], [-3.6, 1.0, M.NAV_RED], [-3.6, -0.7, M.AC_ORANGE], [-3.6, 0.7, M.AC_ORANGE]]) body.box(x - 0.08, 1.58, z - 0.08, x + 0.08, 1.72, z + 0.08, m, { md: 0.1 });
    for (const x of [0.6, -1.4]) body.box(x - 0.3, 1.78, -0.3, x + 0.3, 1.85, 0.3, M.AC_GRAY_LIGHT, { md: 0.1 });
    for (const s of [-1, 1]) {
      strut(body, [2.9, 0.1, s * 1.15], [3.2, 0.5, s * 1.45], 0.04, M.STEEL_BRIGHT, { md: 0.08 });
      body.ell(3.2, 0.5, s * 1.5, 0.04, 0.18, 0.12, M.STEEL_BRIGHT, { md: 0.08 });
    }
    strut(body, [-2.8, -0.4, 1.3], [-2.8, 1.5, 1.3], 0.1, M.STEEL_BRIGHT, { md: 0.1 });
    body.cyl('y', -2.8, 1.3, 0.14, 0.14, 1.5, 1.6, DARK, { md: 0.1 });
    // ------------------------------------------------------------------ the engine: a round cowl where the hood used to be, a bumper, headlights, cooling slots
    body.loft('x', [
      { a: 2.7, c1: -0.15, c2: 0, r1: 0.64, r2: 0.74, n: 2.2 },
      { a: 3.2, c1: -0.15, c2: 0, r1: 0.62, r2: 0.66, n: 2 },
      { a: 3.9, c1: -0.15, c2: 0, r1: 0.6, r2: 0.6, n: 2 },
    ], BLK);
    body.cyl('x', -0.15, 0, 0.64, 0.64, 3.86, 3.98, M.AC_METAL);
    body.cyl('x', -0.15, 0, 0.45, 0.45, 3.9, 4.02, BLK);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; body.box(3.1, -0.15 + Math.sin(a) * 0.63 - 0.03, Math.cos(a) * 0.63 - 0.06, 3.7, -0.15 + Math.sin(a) * 0.63 + 0.03, Math.cos(a) * 0.63 + 0.06, M.AC_GRAY_DARK, { md: 0.06 }); }
    for (const s of [-1, 1]) {
      body.box(2.6, -0.2, s * 0.85 - 0.12, 2.9, 0.1, s * 0.85 + 0.12, YEL);                                   // the fenders' remains
      body.ell(2.78, -0.05, s * 0.88, 0.1, 0.12, 0.12, M.HEADLIGHT, { md: 0.08 });
    }
    body.box(3.95, -0.62, -0.9, 4.15, -0.4, 0.9, BLK, { md: 0.1 });                                            // the push bumper
    // ------------------------------------------------------------------ the wing, parasol on struts from the roof; N struts from the beltline; a pair of poles back to the tail
    for (const s of [-1, 1]) {
      const w = WING(s); body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, M.AC_WHITE);
      const st = ST(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, YEL);
      strut(body, [0.8, 1.7, s * 0.7], [1.0, 2.62, s * 0.7], 0.12, M.AC_GRAY_DARK, { md: 0.25 });             // cabane struts off the roof
      strut(body, [-0.5, 1.7, s * 0.7], [-0.4, 2.62, s * 0.7], 0.12, M.AC_GRAY_DARK, { md: 0.25 });
      strut(body, [0.6, 0.2, s * 1.2], [0.8, 2.62, s * 3.4], 0.1, M.AC_GRAY_DARK, { md: 0.25 });              // the main struts
      strut(body, [-0.4, 0.2, s * 1.2], [-0.2, 2.62, s * 3.4], 0.1, M.AC_GRAY_DARK, { md: 0.25 });
      body.cyl('x', 0.7, s * 1.0, 0.11, 0.1, -6.8, -3.7, M.WOOD_DARK);                                          // telephone poles for tail booms
      strut(body, [-2.0, 1.6, s * 1.1], [-6.6, 0.8, s * 0.9], 0.03, DARK, { md: 0.1 });
      body.paint(-1.4, 2.3, s > 0 ? 0.4 : -6.5, 2.0, 3.0, s > 0 ? 6.5 : -0.4, (x, y, z) => {
        const b = Math.floor(Math.abs(z) / 0.8), f = Math.abs(z) / 0.8 - b;
        return f < 0.03 ? M.AC_GRAY : (b * 7) % 11 === 3 ? M.RUST : (b * 5) % 9 === 1 ? M.PATCH_B : 0;
      }, { thin: true, md: 0.12 });
    }
    body.box(-1.4, 2.6, -0.4, 1.0, 2.8, 0.4, WHT);                                                          // the wing's center section
    body.box(-6.9, 0.45, -1.1, -6.7, 0.7, 1.1, M.WOOD_DARK, { md: 0.12 });
    body.loft('y', finStations(FIN), YEL, { thin: true });
    body.paint(-7.8, 0.5, -0.2, -5.0, 3.4, 0.2, (x, y) => (Math.floor((y - 0.5) / 0.28) % 2 ? BLK : 0), { thin: true, md: 0.14 });
    decal(body, 'RH-1', { x: -7.5, y: 2.2, side: 1, px: 0.06, mat: WHT, z0: 0.02, z1: 0.2 });
    decal(body, 'RH-1', { x: -7.5, y: 2.2, side: -1, px: 0.06, mat: WHT, z0: 0.02, z1: 0.2 });
    navLights(body, { left: [0.9, 2.7, -6.55], right: [0.9, 2.7, 6.55], tail: [-7.25, 0.5, 0], beacon: [-1.0, 1.9, 0], size: 0.11 });
    // ------------------------------------------------------------------ the stop sign arm: an octagon on a hinge, folded flat against the left side until the air brake is used
    const ss = k.part('stopSign', { pivot: [1.7, 0.45, -1.28], local: true });
    ss.fn(-0.4, -0.4, -0.04, 0.4, 0.4, 0.0, (x, y) => (Math.abs(x) + Math.abs(y) < 0.56 && Math.abs(x) < 0.4 && Math.abs(y) < 0.4 ? (Math.abs(x) + Math.abs(y) > 0.5 || Math.abs(x) > 0.35 || Math.abs(y) > 0.35 ? WHT : M.AC_RED) : 0), { thin: true });
    ss.box(-0.06, -0.12, -0.05, 0.06, 0.12, -0.04, WHT, { md: 0.04 });
    ss.box(0.38, -0.04, -0.04, 0.5, 0.04, 0.02, DARK, { md: 0.04 });
    // ------------------------------------------------------------------ glass in the windows and windshield, hidden from the cockpit
    const gl = k.part('glass', { hideInCockpit: true });
    for (const x of WX_L) gl.box(x - WIN.h, WIN.y0, -1.17, x + WIN.h, WIN.y1, -1.13, GLASS, { thin: true });
    for (const x of WX_R) gl.box(x - WIN.h, WIN.y0, 1.13, x + WIN.h, WIN.y1, 1.17, GLASS, { thin: true });
    gl.box(1.2, WIN.y0, -1.17, 2.4, 1.3, -1.13, GLASS, { thin: true });
    gl.box(2.62, 0.52, -1.04, 2.68, 1.5, -0.04, GLASS, { thin: true }); gl.box(2.62, 0.52, 0.04, 2.68, 1.5, 1.04, GLASS, { thin: true });
    gl.box(-3.77, 0.5, -0.9, -3.73, 1.3, 0.9, GLASS, { thin: true });
    // ------------------------------------------------------------------ control surfaces
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      wingSurface(k, body, 'flap' + n, WING(s), { z0: 0.8, z1: 3.2, frac: 0.3, mat: M.AC_WHITE });
      wingSurface(k, body, 'aileron' + n, WING(s), { z0: 3.4, z1: 6.45, frac: 0.28, mat: M.AC_WHITE });
      wingSurface(k, body, 'elevator' + n, ST(s), { z0: 0.15, z1: 2.55, frac: 0.38, mat: YEL });
    }
    const hinge = finAt(FIN, 1.3);
    loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: YEL, box: [-8.6, 0.5, -0.2, -6.0, 3.4, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.38; },
      pivot: [hinge.te + hinge.chord * 0.38, 1.3, 0],
    });
    // ------------------------------------------------------------------ propeller, three paddle blades with a yellow spinner
    const pr = k.part('propeller', { pivot: [4.05, -0.15, 0], local: true, voxel: 0.04 });
    prop(pr, 1.35, 3, { chord: 0.34, mat: M.AC_PROP, tip: YEL, hubR: 0.18, tipLen: 0.2 });
    spinner(pr, 0.0, 0.5, 0.27, YEL);
    // ------------------------------------------------------------------ the wheels: four big tires sticking out the sides under fender arches
    for (const [n, x, z] of [['FL', 2.2, -1.35], ['FR', 2.2, 1.35], ['RL', -1.2, -1.35], ['RR', -1.2, 1.35]]) {
      const s = z < 0 ? -1 : 1;
      const g = k.part('gear' + n);
      strut(g, [x, -0.6, s * 1.15], [x, -0.75, z], 0.14, DARK);
      body.box(x - 0.6, -0.7, s * 1.12 - 0.04, x + 0.6, -0.5, s * 1.12 + 0.04, DARK, { md: 0.1 });
      body.box(x - 0.64, -0.25, s * 1.28 - 0.02, x + 0.64, -0.2, s * 1.28 + 0.02, YEL, { md: 0.12 });                // the fender lip
      wheel(k.part('wheel' + n, { pivot: [x, -0.75, z], local: true }), 0, 0, 0, 0.5, 0.3, M.AC_TIRE, M.AC_GRAY_LIGHT);
    }
    // the driver at the left, visible through the windshield from outside
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 1.7, -0.12, { hands: [[2.3, 0.05, -0.2], [2.3, 0.05, 0.2]], feet: 2.4, suit: M.PAINT_BLUEGRAY, helmet: M.HAY, visor: M.PLASTER_TERRA, vest: M.PAINT_ORANGE });
    for (const op of pl.ops) op.xf = { tx: 0, ty: 0, tz: -0.55, ang: 0 };
    // ------------------------------------------------------------------ stores: jugs and propane tanks hung under the wing
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      store(k, 'jug' + n, 'jug' + n, 'jug', [1.2, 2.4, s * 4.0], { voxel: 0.03125 });
      store(k, 'propane' + n, 'prop' + n, 'propane', [1.0, 2.4, s * 5.4], { voxel: 0.03125 });
      strut(body, [1.2, 2.64, s * 4.0], [1.2, 2.55, s * 4.0], 0.02, M.AC_BLACK, { md: 0.08 });
      strut(body, [1.0, 2.64, s * 5.4], [1.0, 2.5, s * 5.4], 0.02, M.AC_BLACK, { md: 0.08 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the bus inside (2.5 cm): ribbed rubber floor, cream walls with a green band, bench seats, roof lights, an emergency door
    const c = k.interior('bus');
    c.box(-3.7, FL - 0.04, -1.1, 2.6, FL, 1.1, M.AC_GRAY_DARK);
    for (let x = -3.6; x < 2.6; x += 0.12) c.box(x, FL, -0.1, x + 0.03, FL + 0.01, 0.1, M.AC_BLACK, { md: 0.04 });   // aisle ribs
    for (const z0 of [-1.1, 1.08]) c.box(-3.7, FL, z0, 2.6, 1.55, z0 + 0.02, M.AC_CREAM);
    c.box(-3.7, FL, -1.1, -3.68, 1.55, 1.1, M.AC_CREAM); c.box(2.58, FL, -1.1, 2.6, 1.55, 1.1, M.AC_CREAM);
    c.box(-3.7, 1.52, -1.1, 2.6, 1.58, 1.1, M.AC_WHITE);                                                      // the roof liner
    for (const z0 of [-1.1, 1.08]) { c.box(-3.7, 0.2, z0, 2.6, 0.32, z0 + 0.025, M.PAINT_GREEN, { md: 0.04 }); c.box(-3.7, FL, z0, 2.6, FL + 0.18, z0 + 0.025, M.AC_GRAY, { md: 0.04 }); }
    for (const x of [-3.0, -1.5, 0.0]) c.box(x, 1.5, -0.2, x + 0.4, 1.52, 0.2, M.LAMP_WHITE, { md: 0.05 });
    for (const x of WX_L) c.carve(x - WIN.h, WIN.y0, -1.15, x + WIN.h, WIN.y1, -1.05);
    for (const x of WX_R) c.carve(x - WIN.h, WIN.y0, 1.05, x + WIN.h, WIN.y1, 1.15);
    c.carve(1.2, WIN.y0, -1.15, 2.4, 1.3, -1.05);
    c.carve(1.5, FL, 1.05, 2.4, 1.45, 1.15);                                                                  // the doorway
    c.carve(2.55, 0.52, -1.04, 2.65, 1.5, -0.04); c.carve(2.55, 0.52, 0.04, 2.65, 1.5, 1.04);
    c.carve(-3.75, 0.5, -0.9, -3.6, 1.3, 0.9);
    for (const x of WX_L) { c.box(x - WIN.h - 0.03, WIN.y0 - 0.03, -1.1, x + WIN.h + 0.03, WIN.y0 + 0.01, -1.04, M.AC_GRAY, { md: 0.04 }); c.box(x - WIN.h - 0.03, WIN.y1 - 0.01, -1.1, x + WIN.h + 0.03, WIN.y1 + 0.03, -1.04, M.AC_GRAY, { md: 0.04 }); }
    for (const x of WX_R) { c.box(x - WIN.h - 0.03, WIN.y0 - 0.03, 1.04, x + WIN.h + 0.03, WIN.y0 + 0.01, 1.1, M.AC_GRAY, { md: 0.04 }); c.box(x - WIN.h - 0.03, WIN.y1 - 0.01, 1.04, x + WIN.h + 0.03, WIN.y1 + 0.03, 1.1, M.AC_GRAY, { md: 0.04 }); }
    // bench seats, two a row, green vinyl with a steel frame and a handhold on the aisle side
    const V = M.PAINT_GREEN;
    for (let x = 0.7; x > -3.5; x -= 0.6) {
      for (const s of [-1, 1]) {
        const z0 = s < 0 ? -1.08 : 0.15, z1 = s < 0 ? -0.15 : 1.08;
        c.box(x - 0.2, FL, z0 + 0.05, x + 0.2, FL + 0.12, z1 - 0.05, M.STEEL_DARK, { md: 0.04 });               // the pedestal
        c.box(x - 0.22, FL + 0.12, z0, x + 0.18, FL + 0.2, z1, V);                                               // cushion
        c.box(x - 0.26, FL + 0.2, z0, x - 0.2, FL + 0.9, z1, V);                                                 // back
        c.box(x - 0.27, FL + 0.9, z0, x - 0.2, FL + 0.96, z1, M.STEEL_BRIGHT, { md: 0.03 });                     // the grab rail
        c.box(x - 0.22, FL + 0.21, s < 0 ? z1 - 0.03 : z0 + 0.0, x + 0.18, FL + 0.9, s < 0 ? z1 : z0 + 0.03, M.STEEL_DARK, { md: 0.04 });   // aisle panel
      }
    }
    // the emergency door in the back with its red bar and the sign; the driver's side: the bus driver's seat, a convex mirror, a coat hook
    c.box(-3.68, FL, -0.4, -3.64, 1.4, 0.4, M.AC_CREAM);
    c.box(-3.68, 0.5, -0.4, -3.64, 0.56, 0.4, M.AC_RED, { md: 0.03 });
    c.box(-3.69, 1.3, -0.3, -3.65, 1.42, 0.3, M.AC_RED, { md: 0.03 });
    c.ell(2.5, 1.35, 0.0, 0.2, 0.08, 0.2, M.AC_METAL, { md: 0.03 });                                           // the overhead convex mirror
    const seatX = 1.7, seatZ = -0.55;
    c.box(seatX - 0.25, FL, seatZ - 0.04, seatX + 0.1, -0.2, seatZ + 0.04, M.STEEL_DARK);                       // the driver's seat
    c.box(seatX - 0.26, -0.2, seatZ - 0.25, seatX + 0.24, -0.12, seatZ + 0.25, M.SEAT_LEATHER);
    c.box(seatX - 0.32, -0.12, seatZ - 0.25, seatX - 0.22, 0.6, seatZ + 0.25, M.SEAT_LEATHER);
    c.box(seatX - 0.33, 0.5, seatZ - 0.15, seatX - 0.23, 0.78, seatZ + 0.15, M.SEAT_LEATHER);
    for (const t of [-1, 1]) c.box(seatX - 0.2, -0.12, seatZ + t * 0.27 - 0.02, seatX + 0.2, 0.0, seatZ + t * 0.27 + 0.02, M.AC_GRAY_DARK, { md: 0.03 });
    // the engine tunnel: no hood now, but a doghouse cover remains between the seats at the front
    c.box(2.0, FL, -0.05, 2.55, 0.0, 0.5, M.AC_GRAY_DARK);
    c.box(1.6, FL, 0.5, 2.5, FL + 0.3, 1.05, M.STEEL_DARK);                                                    // the steps down at the door
    c.box(1.6, FL + 0.3, 0.7, 2.5, FL + 0.33, 1.05, M.AC_BLACK, { md: 0.03 });
    // ------------------------------------------------------------------ the dash: big round gauges, a stop-arm panel with a switch, a dome of mirrors
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(2.5, -0.5, -1.05, 2.58, 0.52, 0.05, M.COCKPIT_PANEL);
    pn.box(2.44, 0.5, -1.06, 2.6, 0.54, 0.06, M.COCKPIT_TRIM);
    const gx = 2.5;
    gauge(pn, gx, 0.34, -0.9, 0.09); gauge(pn, gx, 0.34, -0.65, 0.07); gauge(pn, gx, 0.34, -0.4, 0.09); gauge(pn, gx, 0.34, -0.15, 0.06);
    needle(k.interior('nASI', { pivot: [gx - 0.028, 0.34, -0.9], local: true, voxel: 0.004 }), 0.072, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [gx - 0.028, 0.34, -0.4], local: true, voxel: 0.004 }), 0.072, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [gx - 0.028, 0.34, -0.65], local: true, voxel: 0.004 }), 0.056, M.NEEDLE_ORANGE);
    for (let i = 0; i < 7; i++) pn.box(gx - 0.03, 0.12, -0.95 + i * 0.1, gx - 0.012, 0.16, -0.92 + i * 0.1, i === 1 ? M.SWITCH_RED : i === 4 ? M.AC_ORANGE : M.SWITCH_GRAY, { md: 0.02 });
    pn.box(gx - 0.04, 0.26, 0.0, gx - 0.0, 0.4, 0.04, M.AC_BLACK, { md: 0.03 });
    for (let i = 0; i < 4; i++) pn.box(gx - 0.05, 0.28 + i * 0.03, 0.0, gx - 0.04, 0.3 + i * 0.03, 0.04, i % 2 ? M.NAV_GREEN : M.NAV_RED, { md: 0.01 });
    // ------------------------------------------------------------------ the bus steering wheel (big and nearly flat), a long shifter and pedals
    const sw = k.interior('busWheel', { pivot: [2.15, 0.06, -0.55], local: true, voxel: 0.012 });
    ringYZ(sw, -0.02, 0.04, 0, 0, 0.26, 0.05, M.AC_BLACK);
    sw.box(-0.03, -0.03, -0.26, 0.05, 0.03, 0.26, M.AC_BLACK); sw.box(-0.03, -0.26, -0.03, 0.05, 0.26, 0.03, M.AC_BLACK);
    sw.cyl('x', 0, 0, 0.06, 0.06, -0.04, 0.06, M.AC_RED);
    sw.cyl('x', 0, 0, 0.035, 0.035, 0.05, 0.4, M.AC_GRAY_DARK);
    const sh = k.interior('shifter', { pivot: [2.1, -0.45, -0.12], local: true, voxel: 0.01 });
    sh.cyl('y', 0, 0, 0.02, 0.02, 0, 0.5, M.AC_METAL);
    sh.ell(0, 0.52, 0, 0.05, 0.05, 0.05, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.7], ['pedalR', -0.42]]) {
      const p = k.interior(n, { pivot: [2.3, -0.4, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.07, -0.07, 0.02, 0.1, 0.07, M.STEEL_DARK);
    }
  },
});
