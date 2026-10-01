import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { loftTest } from '../../voxel/recipe.js';
import { strut, wheel, gauge, needle, ringYZ, clipToHull } from '../builders/parts.js';
import { decal, rivets, seams, navLights, pilot, fanFace, nozzle, gearLeg } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt, wingAt } from '../builders/surfaces.js';

/* Aerolux AL-9: a twin-engine business jet with a T-tail, winglets and a cabin fitted out like a hotel lobby: club chairs, a
   divan, a galley and a lavatory behind a cockpit with three glass screens. Easy to fly, quiet in the climb and happy to cruise
   at 450 knots. The hull is hollow: windows and the windshield are real openings, so from the left seat you can turn around and
   the whole cabin is there. Body origin at the center of gravity, +x forward. */

const WHITE = M.AC_WHITE, CREAM = M.AC_CREAM, BLUE = M.GLASS_BLUE, GOLD = M.PAINT_YELLOW, GLASS = M.AC_CANOPY, GRAY = M.AC_GRAY_LIGHT;

const R = 1.1, WALL = 0.1;
const PX = 7.35;          // instrument panel face
const SX = 6.0;           // seat hip reference
const FLOOR = -0.7;       // top of the carpet

const WR = wingDef([1.6, -0.78, 1.0], 8.4, 3.4, 1.1, 2.6, 0.9, 0.12, 0.09, 1);
const WL = wingDef([1.6, -0.78, -1.0], 8.4, 3.4, 1.1, 2.6, 0.9, 0.12, 0.09, -1);
const FIN = { x: -6.2, y: 0.6, z: 0, chord: 3.6, tip: 1.7, height: 3.5, sweep: 2.4, thick: 0.09 };
const STAB = (s) => wingDef([-8.2, 4.05, s * 0.12], 3.0, 1.7, 0.85, 0.95, 0.0, 0.09, 0.07, s);

/** The fuselage: a round tube with a pointed nose and a long tail cone. c1 is the vertical center, r1 the height, r2 the width. */
const FUS = [
  { a: -9.5, c1: 0.55, c2: 0, r1: 0.1, r2: 0.1, n: 2 },
  { a: -8.4, c1: 0.5, c2: 0, r1: 0.3, r2: 0.28, n: 2.1 },
  { a: -6.5, c1: 0.32, c2: 0, r1: 0.74, r2: 0.7, n: 2.1 },
  { a: -4.8, c1: 0.12, c2: 0, r1: 1.0, r2: 1.0, n: 2.1 },
  { a: -3.0, c1: 0.0, c2: 0, r1: R, r2: R, n: 2.1 },
  { a: 5.2, c1: 0.0, c2: 0, r1: R, r2: R, n: 2.1 },
  { a: 6.4, c1: -0.02, c2: 0, r1: 1.08, r2: 1.08, n: 2.1 },
  { a: 7.4, c1: -0.06, c2: 0, r1: 1.02, r2: 1.0, n: 2.1 },
  { a: 8.4, c1: -0.18, c2: 0, r1: 0.76, r2: 0.72, n: 2.1 },
  { a: 9.2, c1: -0.27, c2: 0, r1: 0.42, r2: 0.38, n: 2.05 },
  { a: 9.95, c1: -0.3, c2: 0, r1: 0.1, r2: 0.1, n: 2 },
];
const outer = loftTest(FUS, 'x'), inner = loftTest(FUS, 'x', -WALL);
const skin = (x, y, z) => outer(x, y, z) && !inner(x, y, z);

function stationAt(a) {
  let i = 0;
  while (i < FUS.length - 2 && a > FUS[i + 1].a) i++;
  const s0 = FUS[i], s1 = FUS[i + 1], t = Math.min(1, Math.max(0, (a - s0.a) / (s1.a - s0.a)));
  const L = (p, q) => p + (q - p) * t;
  return { a, c1: L(s0.c1, s1.c1), c2: 0, r1: L(s0.r1, s1.r1), r2: L(s0.r2, s1.r2), n: L(s0.n ?? 2, s1.n ?? 2) };
}
/** The hull between a0 and a1, shrunk by w: the cavity, the liner rings and the bulkheads all come from it. */
function shell(a0, a1, w) {
  const sts = [stationAt(a0), ...FUS.filter((s) => s.a > a0 && s.a < a1), stationAt(a1)];
  return sts.map((s) => ({ a: s.a, c1: s.c1, c2: 0, r1: s.r1 - w, r2: s.r2 - w, n: s.n ?? 2 }));
}

/** Opens the usable room inside the cavity: flat sidewalls, a narrower strip at the floor, an elliptical arch for the roof. Constant along x, so the walls are clean planes. */
function carveRoom(r, x0, x1, { w, wf, yw, dh }) {
  r.box(x0, FLOOR - 0.04, -wf, x1, -0.5, wf, 0);
  r.box(x0, -0.5, -w, x1, yw, w, 0);
  r.fn(x0, yw, -w - 0.05, x1, yw + dh + 0.02, w + 0.05, (x, y, z) => { const u = (y - yw) / dh, v = z / w; return u * u + v * v <= 1 ? -1 : 0; });
}

// cabin windows: an oval every 78 cm; none on the left where the door is
const WX = [];
for (let x = 4.55; x > -4.2; x -= 0.78) WX.push(x);
/** Normalised distance to the nearest cabin window (below 1 is glass), or Infinity away from the cabin wall. */
function winD(x, y, z) {
  if (Math.abs(z) < 0.7 || x > 4.9 || x < -4.5 || (z < 0 && x > 3.4)) return Infinity;
  const dy = Math.abs(y - 0.22) / 0.22;
  if (dy > 1.6) return Infinity;
  let best = Infinity;
  for (const xw of WX) { const dx = Math.abs(x - xw) / 0.17; if (dx < 1.6) best = Math.min(best, Math.pow(dx, 2.6) + Math.pow(dy, 2.6)); }
  return best;
}
// the windshield: two panes either side of a center post; a side window by each pilot
const PANE_X0 = 6.95, PANE_X1 = 8.35, PANE_Y0 = 0.14;
const paneIn = (x, y, z) => x >= PANE_X0 && x <= PANE_X1 && y >= PANE_Y0 && Math.abs(z) > 0.05 && Math.abs(z) < 0.86;
const sideIn = (x, y, z) => Math.abs(z) > 0.7 && Math.pow(Math.abs(x - 6.3) / 0.45, 3) + Math.pow(Math.abs(y - 0.5) / 0.27, 3) < 1;

export default defineAircraft({
  id: 'aerolux',
  name: 'Aerolux AL-9',
  manufacturer: 'Aerolux Meridian',
  role: 'Business jet',
  category: 'private',
  order: 8,
  difficulty: 2,
  tags: ['Twin jet', 'T-tail', 'Full cabin', 'Glass cockpit', 'Long range'],
  description: 'Eight seats, a divan, a galley and a lavatory behind a glass cockpit. The AL-9 climbs quietly, cruises at 450 knots and lands like a limousine. The cabin behind your seat is fully modeled: turn around to see the table laid and the lights on.',
  voxel: 0.0625,
  interiorVoxel: 0.025,
  lodLevels: 4,
  mass: { empty: 9300, fuel: 3700, payload: 820 },
  inertia: [34000, 168000, 150000],
  wing: { area: 41, span: 19.0, chord: 2.2, y: -0.78 },
  aero: {
    CL0: 0.2, CLa: 5.2, CLmax: 1.55, alphaStall: 0.26, CD0: 0.031, k: 0.042, CDflap: 0.06, CLflap: 0.5, Cmflap: -0.09, CLmaxFlap: 0.7, CDgear: 0.025, CDair: 0.06,
    Cm0: 0.04, Cma: -0.85, Cmq: -16, Clb: 0.075, Clp: -0.55, Cnb: 0.085, Cnr: -0.15, Cyb: 0.38, Cnda: 0.015,
    machDrag: 0.04, machCrit: 0.78, spin: 0.3, stallPitchDown: 0.12,
    control: { elevator: 0.55, aileron: 0.05, rudder: 0.035 },
  },
  propulsion: { type: 'jet', thrust: 36000, fuelBurn: 0.42, idleRpm: 35, spool: 0.7 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [6.4, -2.05, 0], radius: 0.28, k: 160000, c: 12000, steer: 0.5, cornering: 0.8, travel: 0.35 },
      { pos: [-0.8, -1.95, -1.9], radius: 0.38, k: 300000, c: 24000, brake: true, travel: 0.32 },
      { pos: [-0.8, -1.95, 1.9], radius: 0.38, k: 300000, c: 24000, brake: true, travel: 0.32 },
    ],
  },
  skids: [
    { p: [9.9, -0.3, 0], kind: 'nose' }, { p: [-9.4, 0.55, 0], kind: 'tail' }, { p: [-1.0, 0.3, 9.4], kind: 'tip' }, { p: [-1.0, 0.3, -9.4], kind: 'tip' },
    { p: [0.0, -1.1, 0], kind: 'belly' }, { p: [-6.0, 0.2, 1.8], kind: 'belly' }, { p: [-6.0, 0.2, -1.8], kind: 'belly' }, { p: [-8.8, 4.1, 0], kind: 'tail' },
  ],
  limits: { vne: 200, maxG: 3.8, minG: 1.0, flapSpeed: 120, gearSpeed: 140, crashVs: 4.8 },
  cameras: { cockpit: [6.25, 0.58, -0.38], chase: { distance: 38, height: 7.5 }, near: { distance: 18, height: 3.8 } },
  liveries: [
    { id: 'default', name: 'Aerolux blue' },
    { id: 'gold', name: 'Gold line', remap: { GLASS_BLUE: 'PAINT_YELLOW', PAINT_YELLOW: 'GLASS_BLUE' } },
    { id: 'red', name: 'Cardinal red', remap: { GLASS_BLUE: 'AC_RED', PAINT_YELLOW: 'AC_WHITE' } },
    { id: 'black', name: 'Night charter', remap: { AC_WHITE: 'AC_GRAY_DARK', AC_CREAM: 'AC_BLACK', GLASS_BLUE: 'PAINT_YELLOW', PAINT_YELLOW: 'AC_WHITE' } },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.45 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.45 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.75 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.75 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.45 },
    { part: 'spoilerL', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: -1.0 },
    { part: 'spoilerR', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: -1.0 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: -1.6, offset: 1.6 },
    { part: 'gearL', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: -1.5, offset: 1.5 },
    { part: 'gearR', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: 1.5, offset: -1.5 },
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
    { part: 'yokeL', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 1.1 },
    { part: 'yokeL', type: 'translate', axis: [1, 0, 0], channel: 'elevator', gain: -0.1 },
    { part: 'throttleA', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.8, offset: 0.4 },
    { part: 'throttleB', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.8, offset: 0.4 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0092, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.00006283 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage, belly fairing, wings and winglets
    body.loft('x', FUS, WHITE);
    body.loft('x', [
      { a: -1.8, c1: -0.92, c2: 0, r1: 0.1, r2: 1.1, n: 2.4 },
      { a: 0.2, c1: -0.95, c2: 0, r1: 0.3, r2: 1.4, n: 2.4 },
      { a: 3.4, c1: -0.92, c2: 0, r1: 0.28, r2: 1.2, n: 2.4 },
      { a: 5.4, c1: -0.88, c2: 0, r1: 0.1, r2: 0.7, n: 2.4 },
    ], CREAM);
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, WHITE);
    for (const s of [-1, 1]) {
      const wt = wingAt(s > 0 ? WR : WL, 9.4);
      body.loft('y', finStations({ x: wt.x, y: wt.y - 0.1, z: s * 9.4, chord: 1.15, tip: 0.5, height: 1.35, sweep: 0.75, thick: 0.045 }), WHITE, { thin: true });
      // rear engines on short pylons
      const ez = s * 1.62;
      body.loft('x', [
        { a: -8.35, c1: 0.3, c2: ez, r1: 0.38, r2: 0.38, n: 2 },
        { a: -7.5, c1: 0.3, c2: ez, r1: 0.48, r2: 0.48, n: 2 },
        { a: -6.0, c1: 0.3, c2: ez, r1: 0.53, r2: 0.53, n: 2 },
        { a: -5.0, c1: 0.3, c2: ez, r1: 0.5, r2: 0.5, n: 2 },
        { a: -4.7, c1: 0.3, c2: ez, r1: 0.47, r2: 0.47, n: 2 },
      ], WHITE);
      body.box(-7.6, 0.0, s * 1.05, -4.9, 0.55, s * 1.3, WHITE);
      body.box(-8.0, 0.25, s * 0.78, -4.5, 0.58, s * 1.1, WHITE);
      fanFace(body, -4.65, 0.3, ez, 0.42, { depth: 0.8, rec: 0.18, blades: 20 });
      nozzle(body, -8.45, 0.3, ez, 0.36, { len: 0.7, petals: 12 });
    }
    // ------------------------------------------------------------------ the T tail
    body.loft('y', finStations(FIN), WHITE, { thin: true });
    body.loft('y', [
      { a: 0.5, c1: -4.9, c2: 0, r1: 1.4, r2: 0.12, n: 2.4 },
      { a: 1.1, c1: -5.5, c2: 0, r1: 0.9, r2: 0.1, n: 2.4 },
      { a: 1.8, c1: -6.1, c2: 0, r1: 0.5, r2: 0.08, n: 2.4 },
    ], WHITE);
    for (const s of [-1, 1]) { const st = STAB(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, 0, st.tr, st.tt, s, WHITE); }
    body.box(-8.9, FIN.y + FIN.height - 0.05, -0.1, -7.0, FIN.y + FIN.height + 0.12, 0.1, GRAY, { md: 0.12 });
    // ------------------------------------------------------------------ the hollow hull: cavity, floor, windows, windshield (fine detail only)
    const FINE = { md: 0.07 };
    body.loft('x', shell(-4.95, PX + 0.12, WALL), 0, FINE);
    body.fn(-4.95, -1.3, -1.3, PX + 0.12, FLOOR - 0.04, 1.3, (x, y, z) => (inner(x, y, z) ? M.AC_GRAY : 0), FINE);
    body.fn(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z) => (winD(x, y, z) < 1 ? -1 : 0), FINE);
    body.fn(PANE_X0, PANE_Y0, -0.9, PANE_X1, 1.4, 0.9, (x, y, z) => (paneIn(x, y, z) ? -1 : 0), FINE);
    body.fn(5.8, 0.1, -1.25, 6.8, 0.8, 1.25, (x, y, z) => (sideIn(x, y, z) ? -1 : 0), FINE);
    // far away the openings are simply dark paint on the solid hull
    const dark = { mn: 0.1, thin: true };
    body.paint(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z) => (winD(x, y, z) < 1 ? GLASS : 0), dark);
    body.paint(PANE_X0, PANE_Y0, -0.9, PANE_X1, 1.4, 0.9, (x, y, z) => (paneIn(x, y, z) ? GLASS : 0), dark);
    body.paint(5.8, 0.1, -1.25, 6.8, 0.8, 1.25, (x, y, z) => (sideIn(x, y, z) ? GLASS : 0), dark);
    // pale frames around the cabin windows
    body.paint(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z) => { const d = winD(x, y, z); return d >= 1 && d < 1.9 ? M.AC_GRAY : 0; }, { thin: true, md: 0.14 });

    // ------------------------------------------------------------------ the livery: cheatline, tail art, doors, markings
    body.paint(-9.5, -0.9, -1.25, 10.0, 0.6, 1.25, (x, y) => {
      const yc = -0.08 + (x > 5 ? -(x - 5) * 0.07 : x < -5 ? (-5 - x) * 0.16 : 0), yy = y - yc;
      if (yy > -0.12 && yy < 0.0) return BLUE;
      if (yy > 0.025 && yy < 0.065) return GOLD;
      return 0;
    }, { thin: true, md: 0.2 });
    body.paint(-9.6, -1.4, -1.2, 10.0, -0.75, 1.2, () => CREAM, { md: 0.4 });                         // pale belly
    body.paint(9.1, -0.7, -0.6, 10.1, 0.2, 0.6, () => M.AC_GRAY_DARK, { md: 0.4 });                    // radome
    body.paint(FIN.x - FIN.sweep - FIN.tip - 0.2, FIN.y + 0.4, -0.2, FIN.x + 0.2, FIN.y + FIN.height, 0.2, (x, y) => (x > -9.0 && (y - FIN.y) > 0.4 + (x + 9.0) * 0.12 ? BLUE : 0), { thin: true, md: 0.2 });
    body.paint(FIN.x - FIN.sweep - FIN.tip - 0.2, FIN.y + 1.2, -0.2, FIN.x + 0.2, FIN.y + 2.4, 0.2, (x, y) => (Math.abs((y - FIN.y - 1.7) - (x + 7.6) * 0.5) < 0.1 && x > -8.6 ? GOLD : 0), { thin: true, md: 0.2 });
    decal(body, 'AEROLUX', { x: -1.6, y: -0.6, side: 1, px: 0.075, mat: BLUE, z0: 0.7, z1: 1.3 });
    decal(body, 'AEROLUX', { x: -1.6, y: -0.6, side: -1, px: 0.075, mat: BLUE, z0: 0.7, z1: 1.3 });
    decal(body, 'N 9AL', { x: -6.0, y: 0.52, side: 1, px: 0.05, mat: BLUE, z0: 0.3, z1: 0.8 });
    decal(body, 'N 9AL', { x: -6.0, y: 0.52, side: -1, px: 0.05, mat: BLUE, z0: 0.3, z1: 0.8 });
    // the entry door on the left, a handle and a hairline outline
    body.paint(3.5, -0.75, -1.2, 5.0, 0.9, -0.7, (x, y) => {
      const dx = x - 4.2, dy = y - 0.05;
      if (Math.abs(dx) < 0.62 && Math.abs(dy) < 0.76) {
        if (Math.abs(Math.abs(dx) - 0.62) < 0.03 || Math.abs(Math.abs(dy) - 0.76) < 0.03) return M.AC_GRAY;
        if (Math.abs(dx + 0.38) < 0.06 && Math.abs(dy) < 0.1) return M.AC_METAL;
      }
      return 0;
    }, { thin: true, md: 0.14 });
    // de-icing boots on the wing leading edges, panel seams, rivets
    for (const s of [-1, 1]) body.paint(-1.0, -1.0, s > 0 ? 1.0 : -9.3, 2.0, 0.5, s > 0 ? 9.3 : -1.0, (x, y, z) => { const t = (Math.abs(z) - 1.0) / 8.4, le = 1.6 - 2.6 * t; return x > le - 0.22 ? M.AC_BLACK : 0; }, { thin: true, md: 0.14 });
    seams(body, [-9.0, -1.0, -1.2, 9.5, 1.0, 1.2], [-8.0, -6.8, -5.4, -4.8, -2.0, 1.0, 3.2, 5.6, 6.5, 8.2], { w: 0.01, mat: M.AC_GRAY, ymin: -0.9 });
    rivets(body, [-9.0, -0.1, -1.2, 9.5, 0.9, 1.2], 0.3, 0.3, { mat: M.AC_GRAY, ymin: 0.3, ymax: 1.0 });
    navLights(body, { left: [-1.0, 0.6, -9.45], right: [-1.0, 0.6, 9.45], tail: [-9.45, 0.55, 0], beacon: [-1.0, 1.15, 0], size: 0.09 });
    body.box(-8.8, FIN.y + FIN.height + 0.1, -0.05, -8.4, FIN.y + FIN.height + 0.16, 0.05, M.STROBE, { md: 0.1 });
    // pitot probes, a TCAS blade, antennas, wing root landing lights
    for (const s of [-1, 1]) {
      strut(body, [9.0, -0.3, s * 0.2], [9.5, -0.3, s * 0.22], 0.03, M.AC_METAL, { md: 0.1 });
      body.box(1.8, -0.72, s * 1.1 - 0.12, 2.3, -0.62, s * 1.1 + 0.12, M.HEADLIGHT, { md: 0.1 });
    }
    body.box(2.0, 1.1, -0.05, 2.5, 1.45, 0.05, GRAY, { md: 0.1 });
    body.box(-3.2, 1.1, -0.04, -2.9, 1.28, 0.04, GRAY, { md: 0.1 });

    // ------------------------------------------------------------------ glass: real openings, filled from outside and hidden from the cockpit
    const gl = k.part('glass', { hideInCockpit: true });
    const shells = new Map();
    const glassSkin = (x, y, z, c) => {                                            // at coarse cells the shell is one cell thick, so it is never empty
      if (c <= 0.07) return skin(x, y, z);
      let t = shells.get(c);
      if (!t) { t = loftTest(FUS, 'x', -c); shells.set(c, t); }
      return outer(x, y, z) && !t(x, y, z);
    };
    gl.fn(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z, c) => (winD(x, y, z) < 1 && glassSkin(x, y, z, c) ? GLASS : 0));
    gl.fn(PANE_X0, PANE_Y0, -0.9, PANE_X1, 1.4, 0.9, (x, y, z, c) => (paneIn(x, y, z) && glassSkin(x, y, z, c) ? GLASS : 0));
    gl.fn(5.8, 0.1, -1.25, 6.8, 0.8, 1.25, (x, y, z, c) => (sideIn(x, y, z) && glassSkin(x, y, z, c) ? GLASS : 0));

    // ------------------------------------------------------------------ control surfaces, cut from the airframe
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      wingSurface(k, body, 'flap' + n, W, { z0: 1.8, z1: 5.5, frac: 0.28, mat: WHITE });
      wingSurface(k, body, 'aileron' + n, W, { z0: 5.8, z1: 9.0, frac: 0.28, mat: WHITE });
      const sy = -0.78 + 0.9 * (3.2 / 8.4);
      const sp = k.part('spoiler' + n, { pivot: [0.5, sy + 0.16, s * 3.2], visibleWhen: 'airbrake' });
      sp.box(-0.2, sy + 0.12, s * 3.2 - 0.9, 0.5, sy + 0.19, s * 3.2 + 0.9, GRAY, { thin: true });
      const el = wingSurface(k, body, 'elevator' + n, STAB(s), { z0: 0.2, z1: 3.1, frac: 0.32, mat: WHITE });
      el.paint(-10.5, 3.9, Math.min(0.1 * s, 3.2 * s), -7.0, 4.2, Math.max(0.1 * s, 3.2 * s), (x) => (x < -9.6 ? BLUE : 0), { thin: true });
    }
    const hinge = finAt(FIN, 1.6);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: WHITE, box: [-9.6, 0.7, -0.2, -5.6, 4.2, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.32 && y > FIN.y + 0.2; },
      pivot: [hinge.te + hinge.chord * 0.32, 1.6, 0],
    });
    rd.paint(-9.6, 0.7, -0.2, -5.6, 4.2, 0.2, (x, y) => ((y - FIN.y) > 0.4 + (x + 9.0) * 0.12 && x > -9.0 ? BLUE : 0), { thin: true });

    // ------------------------------------------------------------------ landing gear
    const gn = k.part('gearNose', { pivot: [6.4, -0.7, 0], visibleWhen: 'gearOut' });
    gearLeg(gn, [6.35, -0.7, 0], [6.4, -2.05, 0], { thick: 0.13, lower: 0.09, fork: 0.19 });
    gn.box(6.1, -1.5, 0.1, 6.5, -1.25, 0.15, M.HEADLIGHT, { md: 0.1 });
    wheel(k.part('wheelNose', { pivot: [6.4, -2.05, 0], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.28, 0.16);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [-0.8, -0.8, s * 1.9], visibleWhen: 'gearOut' });
      gearLeg(g, [-0.8, -0.8, s * 1.9], [-0.8, -1.95, s * 1.9], { thick: 0.17, lower: 0.12, fork: 0.25, drag: [-2.0, -0.85, s * 1.9] });
      wheel(k.part('wheel' + n, { pivot: [-0.8, -1.95, s * 1.9], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.38, 0.22);
      body.box(-1.4, -0.95, s * 1.9 - 0.35, -0.2, -0.82, s * 1.9 + 0.35, CREAM, { md: 0.15 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the cabin (2.5 cm voxels): a liner ring with window openings, floor, club seating, a divan, a galley
    const c = k.interior('cabin');
    c.loft('x', shell(-4.9, 5.2, WALL), M.WOOD_MID);                                                  // liner, touching the skin cavity
    carveRoom(c, -4.9, 5.2, { w: 0.8, wf: 0.64, yw: 0.45, dh: 0.45 });
    c.carve(-5.0, -1.4, -1.4, 5.3, FLOOR - 0.04, 1.4);                                                 // nothing below the floor
    c.box(-4.9, FLOOR - 0.04, -0.75, 5.2, FLOOR, 0.75, M.CARPET);
    c.box(-4.9, FLOOR, -0.1, 5.2, FLOOR + 0.005, 0.1, M.SEAT_FABRIC);                                    // aisle runner
    c.fn(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z) => (winD(x, y, z) < 1 ? -1 : 0));
    c.paint(-4.9, -0.7, -1.1, 5.2, 1.1, 1.1, (x, y) => (y > 0.05 ? M.PLASTER_CREAM : y > 0.0 ? M.WOOD_LIGHT : 0));   // wainscot below, plaster above
    c.paint(-4.9, 0.5, -0.6, 5.2, 1.0, 0.6, (x, y, z) => (y > 0.7 && Math.abs(Math.abs(z) - 0.3) < 0.04 ? M.LAMP_WHITE : 0));   // ceiling light strips
    c.paint(-4.4, -0.1, -1.25, 4.95, 0.55, 1.25, (x, y, z) => { const d = winD(x, y, z); return d >= 1 && d < 1.9 ? M.WOOD_DARK : 0; });  // trim around each window
    // chairs: two facing pairs with a table between, the table with a glass and a book
    const chair = (x, z, face) => {
      const bx = x - face * 0.25;
      c.box(x - 0.25, FLOOR, z - 0.035, x + 0.25, -0.3, z + 0.035, M.STEEL_DARK, { md: 0.06 });         // pedestal
      c.box(x - 0.25, -0.3, z - 0.25, x + 0.25, -0.2, z + 0.25, M.SEAT_LEATHER);                       // cushion
      c.box(bx - 0.05, -0.2, z - 0.25, bx + 0.05, 0.5, z + 0.25, M.SEAT_LEATHER);                      // back
      c.box(bx - 0.07, 0.34, z - 0.14, bx + 0.07, 0.6, z + 0.14, M.SEAT_LEATHER);                      // headrest
      for (const t of [-1, 1]) c.box(x - 0.23, -0.2, z + t * 0.26 - 0.025, x + 0.23, -0.1, z + t * 0.26 + 0.025, M.WOOD_DARK, { md: 0.06 });  // armrests
    };
    for (const z of [-0.5, 0.5]) {
      for (const [xa, xb, xt] of [[3.7, 2.6, 3.15], [0.65, -0.45, 0.1]]) {
        chair(xa, z, -1); chair(xb, z, 1);
        c.box(xt - 0.15, -0.03, z - 0.27, xt + 0.15, 0.01, z + 0.27, M.WOOD_DARK);                          // table top
        c.box(xt - 0.03, FLOOR, z - 0.03, xt + 0.03, -0.03, z + 0.03, M.STEEL_DARK, { md: 0.05 });
      }
      c.cyl('y', 3.15, z, 0.03, 0.025, 0.01, 0.1, M.GLASS_CLEAR, { md: 0.04 });
      c.box(0.04, 0.01, z - 0.1, 0.18, 0.03, z + 0.04, M.AC_RED, { md: 0.04 });
    }
    // a divan on the left wall, a credenza and coffee counter on the right
    c.box(-3.5, FLOOR, -0.66, -1.9, -0.5, -0.42, M.WOOD_DARK);
    c.box(-3.5, -0.5, -0.86, -1.9, -0.22, -0.4, M.SEAT_LEATHER);
    c.box(-3.5, -0.22, -0.9, -1.9, 0.38, -0.8, M.SEAT_LEATHER);
    for (let i = 0; i < 3; i++) c.box(-3.45 + i * 0.52, -0.22, -0.84, -3.0 + i * 0.52, -0.1, -0.5, M.SEAT_FABRIC, { md: 0.05 });
    c.box(-3.4, FLOOR, 0.45, -1.9, -0.4, 0.66, M.WOOD_DARK);
    c.box(-3.4, -0.4, 0.42, -1.9, -0.06, 0.84, M.WOOD_MID);
    c.box(-3.45, -0.06, 0.4, -1.85, 0.0, 0.86, M.GRANITE);
    c.box(-2.9, 0.0, 0.58, -2.5, 0.14, 0.78, M.STEEL_BRIGHT, { md: 0.05 });                              // coffee machine
    c.cyl('y', -2.2, 0.66, 0.05, 0.05, 0.0, 0.1, M.AC_WHITE, { md: 0.04 });
    for (let i = 0; i < 4; i++) c.box(-3.3 + i * 0.4, -0.38, 0.415, -2.95 + i * 0.4, -0.1, 0.425, M.WOOD_LIGHT, { md: 0.04 });   // drawer fronts
    // aft bulkhead with the lavatory and galley doors, forward bulkhead with an open cockpit door and a wardrobe
    const disk = (a0, a1, w, m) => c.loft('x', [{ ...stationAt(a0), r1: stationAt(a0).r1 - w, r2: stationAt(a0).r2 - w }, { ...stationAt(a1), r1: stationAt(a1).r1 - w, r2: stationAt(a1).r2 - w }], m);
    disk(-4.9, -4.8, WALL + 0.02, M.WOOD_LIGHT);
    c.carve(-5.0, -1.4, -1.4, -4.7, FLOOR - 0.04, 1.4);
    c.box(-4.8, -0.58, -0.42, -4.77, 0.55, -0.02, M.WOOD_MID);
    c.box(-4.8, -0.58, 0.14, -4.77, 0.7, 0.74, M.WOOD_DARK);
    c.box(-4.77, 0.0, -0.12, -4.74, 0.1, -0.06, M.STEEL_BRIGHT, { md: 0.04 });
    c.box(-4.77, 0.0, 0.2, -4.74, 0.1, 0.26, M.STEEL_BRIGHT, { md: 0.04 });
    disk(5.12, 5.2, WALL + 0.02, M.WOOD_MID);
    c.carve(5.0, FLOOR, -0.33, 5.3, 0.74, 0.33);                                                       // the cockpit door, left open
    c.box(5.1, FLOOR, -0.38, 5.2, 0.8, -0.33, M.WOOD_DARK); c.box(5.1, FLOOR, 0.33, 5.2, 0.8, 0.38, M.WOOD_DARK); c.box(5.1, 0.74, -0.38, 5.2, 0.8, 0.38, M.WOOD_DARK);
    c.box(4.45, FLOOR, 0.34, 5.1, 0.7, 0.62, M.WOOD_MID);                                              // wardrobe
    c.box(4.449, 0.0, 0.34, 4.452, 0.0 + 0.01, 0.62, M.WOOD_DARK, { md: 0.04 });
    c.box(4.43, -0.2, 0.55, 4.45, 0.0, 0.58, M.STEEL_BRIGHT, { md: 0.04 });
    c.box(5.06, 0.4, -0.3, 5.1, 0.66, 0.3, M.GAUGE_FACE);                                              // a flight-information screen over the door
    clipToHull(c, FUS, 'x', WALL, [-5.05, -1.3, -1.3, 5.3, 1.3, 1.3]);

    // ------------------------------------------------------------------ the flight deck (1.6 cm voxels): ring, floor, two seats, pedestal, overhead panel
    const cp = k.interior('cockpit', { voxel: 0.016 });
    cp.loft('x', shell(5.2, PX + 0.02, WALL), M.AC_GRAY);
    carveRoom(cp, 5.2, PX + 0.02, { w: 0.73, wf: 0.56, yw: 0.5, dh: 0.34 });
    cp.carve(5.1, -1.4, -1.4, PX + 0.1, FLOOR - 0.04, 1.4);
    cp.box(5.2, FLOOR - 0.04, -0.8, PX, FLOOR, 0.8, M.CARPET);
    cp.fn(PANE_X0 - 0.02, PANE_Y0, -0.9, PANE_X1, 1.4, 0.9, (x, y, z) => (paneIn(x, y, z) ? -1 : 0));
    cp.fn(5.8, 0.1, -1.25, 6.8, 0.8, 1.25, (x, y, z) => (sideIn(x, y, z) ? -1 : 0));
    cp.paint(5.2, -0.8, -1.1, PX, 1.1, 1.1, (x, y) => (y > 0.45 ? M.AC_GRAY_LIGHT : y < -0.25 ? M.AC_GRAY_DARK : 0));
    for (const s of [-1, 1]) {
      const z = s * 0.38, x = SX;
      cp.box(x - 0.28, -0.3, z - 0.26, x + 0.3, -0.2, z + 0.26, M.SEAT_LEATHER);
      cp.box(x - 0.36, -0.2, z - 0.27, x - 0.24, 0.55, z + 0.27, M.SEAT_LEATHER);
      cp.box(x - 0.38, 0.45, z - 0.16, x - 0.26, 0.74, z + 0.16, M.SEAT_LEATHER);
      cp.box(x - 0.2, FLOOR, z - 0.05, x + 0.1, -0.3, z + 0.05, M.STEEL_DARK);
      for (const t of [-1, 1]) cp.box(x - 0.25, -0.2, z + t * 0.27 - 0.02, x + 0.2, -0.08, z + t * 0.27 + 0.02, M.COCKPIT_PANEL);
      cp.box(x - 0.24, 0.1, z - 0.1, x - 0.2, 0.42, z + 0.1, M.AC_BLACK, { md: 0.03 });               // harness
    }
    // pedestal with the throttle quadrant, radios, a flap lever and trim switches
    cp.box(SX - 0.1, FLOOR, -0.11, PX - 0.2, -0.3, 0.11, M.COCKPIT_PANEL);
    cp.box(SX - 0.1, -0.3, -0.11, PX - 0.2, -0.26, 0.11, M.COCKPIT_TRIM);
    cp.box(6.78, -0.26, -0.1, 7.12, -0.2, 0.1, M.AC_BLACK);
    for (let i = 0; i < 12; i++) cp.box(6.8 + (i >> 1) * 0.05, -0.2, -0.09 + (i & 1) * 0.1, 6.83 + (i >> 1) * 0.05, -0.18, -0.06 + (i & 1) * 0.1, i % 5 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    cp.box(6.55, -0.26, 0.06, 6.58, -0.12, 0.09, M.COCKPIT_TRIM, { md: 0.04 }); cp.box(6.53, -0.14, 0.05, 6.6, -0.1, 0.1, M.SWITCH_GRAY, { md: 0.04 });
    // overhead panel: flush with the headliner, a grid of switches and annunciators drawn as colored cells
    cp.paint(6.2, 0.7, -0.3, 6.95, 0.95, 0.3, (x, y, z) => {
      if (y < 0.72 || Math.abs(z) > 0.27) return 0;
      const fx = ((x - 6.2) % 0.045) / 0.045, fz = ((z + 0.3) % 0.045) / 0.045;
      const i = Math.floor((x - 6.2) / 0.045), j = Math.floor((z + 0.3) / 0.045);
      if (fx > 0.3 && fx < 0.8 && fz > 0.3 && fz < 0.8) return (i * 7 + j * 3) % 11 === 0 ? M.SWITCH_RED : (i + j) % 5 === 0 ? M.NAV_GREEN : M.SWITCH_GRAY;
      return M.AC_GRAY_DARK;
    });
    // the first officer, who is always there
    const fo = k.interior('copilot', { voxel: 0.02 });
    pilot(fo, SX, -0.2, { hands: [[6.62, 0.2, -0.2], [6.62, 0.2, 0.2]], feet: SX + 0.85, suit: M.PAINT_BLUEGRAY, helmet: M.PLASTER_CREAM, visor: M.PLASTER_CREAM, vest: M.PAINT_WHITE });
    for (const op of fo.ops) op.xf = { tx: 0, ty: 0, tz: 0.38, ang: 0 };
    clipToHull(cp, FUS, 'x', WALL, [5.1, -1.3, -1.3, PX + 0.1, 1.3, 1.3]);

    // ------------------------------------------------------------------ the instrument panel (8 mm voxels): a dash across the hull, glare shield, three screens
    const pn = k.interior('panel', { voxel: 0.008 });
    const dash = (w) => [{ ...stationAt(PX), r1: stationAt(PX).r1 - w, r2: stationAt(PX).r2 - w }, { ...stationAt(PX + 0.14), r1: stationAt(PX + 0.14).r1 - w, r2: stationAt(PX + 0.14).r2 - w }];
    pn.loft('x', dash(WALL + 0.02), M.COCKPIT_TRIM);
    pn.carve(PX - 0.2, 0.34, -1.2, PX + 0.3, 1.4, 1.2);
    pn.box(PX - 0.16, 0.3, -0.7, PX + 0.08, 0.36, 0.7, M.COCKPIT_PANEL);                               // glare shield
    pn.box(PX - 0.24, 0.355, -0.66, PX + 0.08, 0.375, 0.66, M.AC_BLACK);
    const fx = PX - 0.004;
    const scr = (z, y, w, h) => {
      pn.box(fx - 0.016, y - h / 2 - 0.012, z - w / 2 - 0.012, fx + 0.004, y + h / 2 + 0.012, z + w / 2 + 0.012, M.AC_GRAY_DARK);
      pn.box(fx - 0.024, y - h / 2, z - w / 2, fx - 0.014, y + h / 2, z + w / 2, M.GAUGE_FACE);
    };
    const line = (y0, z0, y1, z1, m) => pn.box(fx - 0.03, Math.min(y0, y1), Math.min(z0, z1), fx - 0.02, Math.max(y0, y1) + 0.004, Math.max(z0, z1) + 0.004, m, { thin: true, md: 0.02 });
    for (const z of [-0.4, 0, 0.4]) scr(z, 0.12, 0.34, 0.3);
    scr(0, -0.2, 0.3, 0.16);
    // primary flight display: sky and ground, a pitch ladder, speed and altitude tapes; navigation display: a route and a range ring; engine bars
    pn.box(fx - 0.03, 0.12, -0.57, fx - 0.024, 0.27, -0.27, M.SIDING_BLUE); pn.box(fx - 0.03, -0.03, -0.57, fx - 0.024, 0.12, -0.27, M.BRICK_BROWN);
    line(0.12, -0.57, 0.12, -0.27, M.GAUGE_WHITE);
    for (const dy of [-0.05, 0.05]) line(0.12 + dy, -0.46, 0.12 + dy, -0.38, M.GAUGE_WHITE);
    line(-0.02, -0.57, 0.26, -0.55, M.AC_BLACK); line(-0.02, -0.29, 0.26, -0.27, M.AC_BLACK);
    for (let i = 0; i < 9; i++) line(-0.02 + i * 0.03, -0.57, -0.02 + i * 0.03, -0.55, M.GAUGE_WHITE);
    for (let i = 0; i < 9; i++) line(-0.02 + i * 0.03, -0.29, -0.02 + i * 0.03, -0.27, M.GAUGE_WHITE);
    line(0.12, -0.46, 0.12, -0.38, M.AC_YELLOW);
    for (let i = 0; i < 9; i++) line(-0.02 + i * 0.03, -0.17 + i * 0.012, -0.015 + i * 0.03, -0.13 + i * 0.012, i % 3 === 0 ? M.GAUGE_WHITE : M.NAV_GREEN);
    line(-0.02, 0.12, 0.26, 0.14, M.AC_YELLOW); line(0.07, 0.0, 0.2, 0.08, M.NAV_GREEN);
    for (let i = 0; i < 6; i++) { line(-0.26, -0.12 + i * 0.04, -0.2 + ((i * 5) % 4) * 0.02, -0.115 + i * 0.04, i === 3 ? M.AC_YELLOW : M.NAV_GREEN); }
    for (let i = 0; i < 5; i++) line(0.0 + i * 0.05, 0.28, 0.04 + i * 0.05, 0.285, M.NAV_GREEN);
    // right screen: an engine page with two N1 bars, temperature ticks and a line of readouts
    for (const [zz, fill] of [[0.27, 0.17], [0.35, 0.16]]) {
      pn.box(fx - 0.03, -0.02, zz, fx - 0.022, 0.24, zz + 0.04, M.AC_GRAY_DARK);
      pn.box(fx - 0.034, -0.02, zz + 0.004, fx - 0.026, -0.02 + fill, zz + 0.036, M.NAV_GREEN);
      pn.box(fx - 0.034, 0.17, zz + 0.004, fx - 0.026, 0.19, zz + 0.036, M.AC_YELLOW);
    }
    for (let i = 0; i < 6; i++) line(0.2 - i * 0.04, 0.44, 0.2 - i * 0.04, 0.44 + 0.02 + ((i * 7) % 4) * 0.015, i % 3 === 1 ? M.AC_YELLOW : M.GAUGE_WHITE);
    for (let i = 0; i < 14; i++) pn.box(fx - 0.02, -0.36, -0.62 + i * 0.09, fx - 0.004, -0.34, -0.6 + i * 0.09, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    // two round standby gauges with real needles
    gauge(pn, fx, -0.19, -0.55, 0.05); gauge(pn, fx, -0.19, 0.55, 0.05);
    needle(k.interior('nASI', { pivot: [fx - 0.026, -0.19, -0.55], local: true, voxel: 0.004 }), 0.042, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [fx - 0.026, -0.19, 0.55], local: true, voxel: 0.004 }), 0.042, M.NEEDLE_ORANGE);
    clipToHull(pn, FUS, 'x', WALL, [PX - 0.3, -1.2, -1.2, PX + 0.2, 1.2, 1.2]);

    // ------------------------------------------------------------------ yokes, throttles, pedals
    const wheelYoke = (name, z, withMotion) => {
      const y = k.interior(name, { pivot: [6.62, 0.2, z], local: true, voxel: 0.01 });
      y.cyl('x', 0, 0, 0.022, 0.022, 0.02, 0.72, M.COCKPIT_TRIM);                                     // column into the dash
      ringYZ(y, -0.02, 0.03, 0, 0, 0.17, 0.04, M.AC_BLACK);
      y.box(-0.03, 0.1, -0.1, 0.04, 0.24, 0.1, 0);                                                   // open at the top
      y.box(-0.02, -0.05, -0.05, 0.06, 0.05, 0.05, M.AC_BLACK);
      y.box(-0.03, -0.01, 0.14, 0.0, 0.04, 0.19, M.SWITCH_RED, { md: 0.01 });
      return y;
    };
    wheelYoke('yokeL', -0.38); wheelYoke('yokeR', 0.38);
    for (const [n, x] of [['throttleA', 6.42], ['throttleB', 6.5]]) {
      const t = k.interior(n, { pivot: [x, -0.26, 0.0], local: true, voxel: 0.01 });
      t.cyl('y', 0, 0, 0.016, 0.016, 0, 0.16, M.COCKPIT_TRIM);
      t.box(-0.03, 0.14, -0.025, 0.05, 0.22, 0.025, M.AC_BLACK);
    }
    for (const [n, z] of [['pedalL', -0.5], ['pedalR', -0.34]]) {
      const p = k.interior(n, { pivot: [7.0, -0.5, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.06, -0.06, 0.02, 0.1, 0.06, M.STEEL_DARK);
    }
  },
});
