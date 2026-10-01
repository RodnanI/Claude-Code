import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle, clipToHull } from '../builders/parts.js';
import { decal, rivets, seams, navLights, pilot, fanFace, nozzle } from '../builders/detail.js';
import { wingDef, wingSurface } from '../builders/surfaces.js';
import { makeHull, carveRoom, oval } from '../builders/hull.js';

/* Vantage VJ-1: a single-engine personal jet. The engine sits on top of the tail cone behind the cabin, the V-tail clears its
   exhaust, the wing is a plain low straight wing and the cabin is all window. Easy, forgiving, and quick for what it is. Sidesticks,
   one wide glass panel. Body origin at the center of gravity, +x forward. */

const WHITE = M.AC_WHITE, CREAM = M.AC_CREAM, COPPER = M.AC_ORANGE, GRAPH = M.AC_GRAY_DARK, GLASS = M.AC_CANOPY, GRAY = M.AC_GRAY_LIGHT;
const WALL = 0.07, PX = 3.15, FLOOR = -0.55;

const H = makeHull([
  { a: -4.7, c1: 0.42, c2: 0, r1: 0.06, r2: 0.06, n: 2 },
  { a: -4.2, c1: 0.4, c2: 0, r1: 0.15, r2: 0.13, n: 2.1 },
  { a: -3.0, c1: 0.3, c2: 0, r1: 0.45, r2: 0.36, n: 2.1 },
  { a: -1.6, c1: 0.12, c2: 0, r1: 0.76, r2: 0.66, n: 2.1 },
  { a: -0.4, c1: 0.04, c2: 0, r1: 0.88, r2: 0.76, n: 2.1 },
  { a: 1.6, c1: 0.04, c2: 0, r1: 0.88, r2: 0.76, n: 2.1 },
  { a: 2.9, c1: 0.0, c2: 0, r1: 0.84, r2: 0.7, n: 2.1 },
  { a: 3.9, c1: -0.1, c2: 0, r1: 0.62, r2: 0.5, n: 2.1 },
  { a: 4.6, c1: -0.2, c2: 0, r1: 0.3, r2: 0.26, n: 2.05 },
  { a: 4.95, c1: -0.26, c2: 0, r1: 0.1, r2: 0.1, n: 2 },
], WALL);
const { FUS, skin, glassSkin, shell } = H;

const WR = wingDef([0.95, -0.5, 0.62], 5.2, 1.95, 0.95, 0.55, 0.5, 0.15, 0.11, 1);
const WL = wingDef([0.95, -0.5, -0.62], 5.2, 1.95, 0.95, 0.55, 0.5, 0.15, 0.11, -1);
const VT = (s) => wingDef([-3.6, 0.6, s * 0.05], 1.65, 1.15, 0.62, 0.8, 1.15, 0.1, 0.08, s);
const VANGLE = Math.atan2(1.15, 1.65), VS = Math.sin(VANGLE), VC = Math.cos(VANGLE);

// the cabin windows: five ovals a side, the first beside the pilots
const WX = [1.95, 1.2, 0.45, -0.3, -1.05];
function winD(x, y, z) {
  if (Math.abs(z) < 0.5 || x > 2.3 || x < -1.4) return Infinity;
  const dy = Math.abs(y - 0.16) / 0.19;
  if (dy > 1.6) return Infinity;
  let best = Infinity;
  for (const xw of WX) { const dx = Math.abs(x - xw) / 0.16; if (dx < 1.6) best = Math.min(best, oval(dx, dy)); }
  return best;
}
const PANE_X0 = 2.35, PANE_X1 = 3.55, PANE_Y0 = 0.1;
const paneIn = (x, y, z) => x >= PANE_X0 && x <= PANE_X1 && y >= PANE_Y0 && Math.abs(z) < 0.62;

export default defineAircraft({
  id: 'vantage',
  name: 'Vantage VJ-1',
  manufacturer: 'Vantage Aero',
  role: 'Personal jet',
  category: 'private',
  order: 3,
  difficulty: 2,
  tags: ['Single jet', 'V-tail', 'Sidestick', 'Glass cockpit'],
  description: 'One engine on top of the tail, a V-tail behind it and a cabin that is mostly window. The VJ-1 is the friendliest jet there is: it stalls gently, lands slowly and cruises at 280 knots. Sidesticks, one wide glass panel and four leather seats.',
  voxel: 0.04,
  interiorVoxel: 0.02,
  lodLevels: 4,
  mass: { empty: 1750, fuel: 560, payload: 380 },
  inertia: [2900, 5600, 4600],
  wing: { area: 18, span: 11.6, chord: 1.55, y: -0.5 },
  aero: {
    CL0: 0.22, CLa: 5.3, CLmax: 1.5, alphaStall: 0.27, CD0: 0.027, k: 0.045, CDflap: 0.05, CLflap: 0.5, Cmflap: -0.08, CLmaxFlap: 0.6, CDgear: 0.012, CDair: 0.05,
    Cm0: 0.04, Cma: -0.9, Cmq: -14, Clb: 0.085, Clp: -0.5, Cnb: 0.075, Cnr: -0.12, Cyb: 0.33, Cnda: 0.015,
    machDrag: 0.05, machCrit: 0.72, spin: 0.1, stallPitchDown: 0.1,
    control: { elevator: 0.55, aileron: 0.05, rudder: 0.035 },
  },
  propulsion: { type: 'jet', thrust: 7200, fuelBurn: 0.16, idleRpm: 35, spool: 0.8 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [3.0, -1.22, 0], radius: 0.2, k: 40000, c: 3200, steer: 0.5, cornering: 0.7, travel: 0.25 },
      { pos: [-0.35, -1.2, -1.1], radius: 0.26, k: 100000, c: 7600, brake: true, travel: 0.25 },
      { pos: [-0.35, -1.2, 1.1], radius: 0.26, k: 100000, c: 7600, brake: true, travel: 0.25 },
    ],
  },
  skids: [
    { p: [4.9, -0.26, 0], kind: 'nose' }, { p: [-4.6, 0.45, 0], kind: 'tail' }, { p: [0.4, 0.1, 5.8], kind: 'tip' }, { p: [0.4, 0.1, -5.8], kind: 'tip' },
    { p: [0.2, -0.8, 0], kind: 'belly' }, { p: [-4.3, 1.7, 1.7], kind: 'tail' }, { p: [-4.3, 1.7, -1.7], kind: 'tail' },
  ],
  limits: { vne: 150, maxG: 3.8, flapSpeed: 90, gearSpeed: 999, crashVs: 6 },
  cameras: { cockpit: [1.95, 0.46, -0.31], chase: { distance: 24, height: 5 }, near: { distance: 11, height: 2.6 } },
  liveries: [
    { id: 'default', name: 'Copper' },
    { id: 'graphite', name: 'Graphite', remap: { AC_WHITE: 'AC_GRAY_DARK', AC_ORANGE: 'AC_WHITE', AC_GRAY_DARK: 'AC_BLACK' } },
    { id: 'scarlet', name: 'Scarlet', remap: { AC_ORANGE: 'AC_RED' } },
    { id: 'forest', name: 'Forest', remap: { AC_ORANGE: 'PAINT_GREEN', AC_GRAY_DARK: 'AC_OLIVE' } },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'ruddervatorR', type: 'rotate', axis: [0, VS, VC], channel: 'elevator', gain: -0.4 },
    { part: 'ruddervatorR', type: 'rotate', axis: [0, VS, VC], channel: 'rudder', gain: 0.4 },
    { part: 'ruddervatorL', type: 'rotate', axis: [0, -VS, VC], channel: 'elevator', gain: -0.4 },
    { part: 'ruddervatorL', type: 'rotate', axis: [0, -VS, VC], channel: 'rudder', gain: -0.4 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'stickL', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.5 },
    { part: 'stickL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.4 },
    { part: 'throttleA', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.8, offset: 0.4 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.04 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.04 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0092, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.00006283 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage, belly keel, wings, the engine on top, the V-tail
    body.loft('x', FUS, WHITE);
    body.loft('x', [
      { a: -1.4, c1: -0.84, c2: 0, r1: 0.06, r2: 0.7, n: 2.4 },
      { a: 0.6, c1: -0.86, c2: 0, r1: 0.2, r2: 0.95, n: 2.4 },
      { a: 2.2, c1: -0.84, c2: 0, r1: 0.1, r2: 0.6, n: 2.4 },
    ], CREAM);
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, WHITE);
    // the engine: a pod on the spine with a round inlet at the front and a pipe at the back
    body.loft('x', [
      { a: -4.15, c1: 0.7, c2: 0, r1: 0.2, r2: 0.2, n: 2 },
      { a: -3.4, c1: 0.78, c2: 0, r1: 0.34, r2: 0.34, n: 2 },
      { a: -2.2, c1: 0.82, c2: 0, r1: 0.4, r2: 0.4, n: 2 },
      { a: -1.5, c1: 0.8, c2: 0, r1: 0.37, r2: 0.37, n: 2 },
    ], WHITE);
    body.box(-3.6, 0.3, -0.22, -1.4, 0.8, 0.22, WHITE);                                                   // the fairing from pod into fuselage
    fanFace(body, -1.45, 0.8, 0, 0.3, { depth: 0.6, rec: 0.14, blades: 18 });
    nozzle(body, -4.2, 0.7, 0, 0.2, { len: 0.5, petals: 10 });
    for (const s of [-1, 1]) { const v = VT(s); body.wing(v.root, v.span, v.cr, v.ct, v.sweep, v.dih, v.tr, v.tt, s, WHITE); }
    body.box(-4.2, 0.62, -0.1, -3.4, 0.9, 0.1, WHITE, { md: 0.1 });

    // ------------------------------------------------------------------ the hollow hull: cavity, floor, windows and windshield (fine detail only)
    const FINE = { md: 0.07 };
    body.loft('x', shell(-2.3, PX + 0.12, WALL), 0, FINE);
    body.fn(-2.3, -1.3, -1.3, PX + 0.12, FLOOR - 0.04, 1.3, (x, y, z) => (H.inner(x, y, z) ? M.AC_GRAY : 0), FINE);
    body.fn(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => (winD(x, y, z) < 1 ? -1 : 0), FINE);
    body.fn(PANE_X0, PANE_Y0, -0.7, PANE_X1, 1.2, 0.7, (x, y, z) => (paneIn(x, y, z) ? -1 : 0), FINE);
    const dark = { mn: 0.1, thin: true };
    body.paint(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => (winD(x, y, z) < 1 ? GLASS : 0), dark);
    body.paint(PANE_X0, PANE_Y0, -0.7, PANE_X1, 1.2, 0.7, (x, y, z) => (paneIn(x, y, z) ? GLASS : 0), dark);
    body.paint(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => { const d = winD(x, y, z); return d >= 1 && d < 1.9 ? M.AC_GRAY : 0; }, { thin: true, md: 0.1 });

    // ------------------------------------------------------------------ livery: a copper sweep from the nose over the cabin and up the tail, a graphite belly
    body.paint(-4.7, -0.9, -0.9, 5.0, 0.7, 0.9, (x, y) => {
      const yc = -0.12 + (x > 2.4 ? -(x - 2.4) * 0.06 : 0) + (x < -1.2 ? (-1.2 - x) * 0.2 : 0), yy = y - yc;
      if (yy > -0.1 && yy < 0.0) return COPPER;
      if (yy > 0.03 && yy < 0.055) return M.AC_YELLOW;
      return 0;
    }, { thin: true, md: 0.16 });
    body.paint(-4.8, -1.2, -1.0, 5.0, -0.62, 1.0, () => GRAPH, { md: 0.3 });
    body.paint(4.3, -0.5, -0.5, 5.1, 0.2, 0.5, () => GRAPH, { md: 0.3 });
    for (const s of [-1, 1]) {
      const v = VT(s);
      body.paint(-4.9, 0.55, s > 0 ? 0.0 : -1.8, -3.0, 2.0, s > 0 ? 1.8 : 0.0, (x, y) => (x < v.root[0] - 0.45 - (y - 0.6) * 0.2 ? COPPER : 0), { thin: true, md: 0.16 });
    }
    decal(body, 'VJ-1', { x: -2.9, y: 0.76, side: 1, px: 0.04, mat: COPPER, z0: 0.2, z1: 0.5 });
    decal(body, 'VJ-1', { x: -2.9, y: 0.76, side: -1, px: 0.04, mat: COPPER, z0: 0.2, z1: 0.5 });
    decal(body, 'N1VJ', { x: -2.4, y: 0.4, side: 1, px: 0.035, mat: GRAPH, z0: 0.2, z1: 0.7 });
    decal(body, 'N1VJ', { x: -2.4, y: 0.4, side: -1, px: 0.035, mat: GRAPH, z0: 0.2, z1: 0.7 });
    for (const s of [-1, 1]) body.paint(-0.8, -0.6, s > 0 ? 0.62 : -5.9, 1.2, 0.1, s > 0 ? 5.9 : -0.62, (x, y, z) => { const t = (Math.abs(z) - 0.62) / 5.2, le = 0.95 - 0.55 * t; return x > le - 0.14 ? M.AC_BLACK : 0; }, { thin: true, md: 0.1 });
    seams(body, [-4.5, -0.9, -0.9, 4.8, 0.9, 0.9], [-3.4, -2.2, -1.4, 0.2, 1.8, 2.7], { w: 0.008, mat: M.AC_GRAY, ymin: -0.7 });
    rivets(body, [-4.0, -0.2, -0.9, 2.5, 0.7, 0.9], 0.2, 0.2, { mat: M.AC_GRAY, ymin: 0.3, ymax: 0.8 });
    navLights(body, { left: [0.4, 0.08, -5.78], right: [0.4, 0.08, 5.78], tail: [-4.65, 0.45, 0], beacon: [-1.0, 1.25, 0], size: 0.07 });
    body.box(-4.2, 0.66, -0.04, -3.8, 0.72, 0.04, M.STROBE, { md: 0.08 });
    strut(body, [4.7, -0.3, 0.12], [5.1, -0.3, 0.14], 0.025, M.AC_METAL, { md: 0.08 });
    body.box(0.5, 0.88, -0.04, 0.9, 1.1, 0.04, GRAY, { md: 0.08 });                                          // antenna blade
    body.box(1.0, -0.62, 0.8 - 0.08, 1.4, -0.54, 0.8 + 0.08, M.HEADLIGHT, { md: 0.08 });
    body.box(1.0, -0.62, -0.8 - 0.08, 1.4, -0.54, -0.8 + 0.08, M.HEADLIGHT, { md: 0.08 });

    // ------------------------------------------------------------------ glass, hidden from the cockpit so the openings are real
    const gl = k.part('glass', { hideInCockpit: true });
    gl.fn(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z, c) => (winD(x, y, z) < 1 && glassSkin(x, y, z, c) ? GLASS : 0));
    gl.fn(PANE_X0, PANE_Y0, -0.7, PANE_X1, 1.2, 0.7, (x, y, z, c) => (paneIn(x, y, z) && glassSkin(x, y, z, c) ? GLASS : 0));

    // ------------------------------------------------------------------ control surfaces, cut from the airframe
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      wingSurface(k, body, 'flap' + n, W, { z0: 1.2, z1: 3.4, frac: 0.28, mat: WHITE });
      wingSurface(k, body, 'aileron' + n, W, { z0: 3.6, z1: 5.7, frac: 0.28, mat: WHITE });
      const rv = wingSurface(k, body, 'ruddervator' + n, VT(s), { z0: 0.25, z1: 1.65, frac: 0.36, mat: WHITE });
      rv.paint(-5, 0.5, s > 0 ? 0.0 : -1.8, -3.0, 2.0, s > 0 ? 1.8 : 0.0, () => COPPER, { thin: true });
    }

    // ------------------------------------------------------------------ fixed gear with wheel pants
    const gn = k.part('gearNose');
    strut(gn, [3.05, -0.55, 0], [3.0, -1.22, 0], 0.1, M.AC_METAL);
    gn.box(2.9, -1.1, -0.04, 3.2, -0.5, 0.04, WHITE, { md: 0.1 });
    wheel(k.part('wheelNose', { pivot: [3.0, -1.22, 0], local: true }), 0, 0, 0, 0.2, 0.12);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n);
      strut(g, [-0.35, -0.5, s * 0.8], [-0.35, -1.0, s * 1.1], 0.14, M.AC_GRAY_DARK);
      g.ell(-0.3, -1.22, s * 1.1, 0.7, 0.3, 0.13, WHITE, { md: 0.1 });                                      // the pant over the wheel
      g.ell(-0.3, -1.42, s * 1.1, 0.64, 0.12, 0.125, GRAPH, { md: 0.1 });
      wheel(k.part('wheel' + n, { pivot: [-0.35, -1.2, s * 1.1], local: true }), 0, 0, 0, 0.26, 0.16);
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the cabin (2 cm voxels): liner, floor, two rows of seats, side tables
    const c = k.interior('cabin');
    c.loft('x', shell(-2.2, 1.2, WALL), M.SEAT_FABRIC);
    carveRoom(c, -2.2, 1.2, { floor: FLOOR, w: 0.56, wf: 0.42, yw: 0.22, dh: 0.5, yf: -0.3 });
    c.carve(-2.3, -1.4, -1.4, 1.2, FLOOR - 0.04, 1.4);
    c.box(-2.2, FLOOR - 0.04, -0.6, 1.2, FLOOR, 0.6, M.CARPET);
    c.fn(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => (winD(x, y, z) < 1 ? -1 : 0));
    c.paint(-2.2, -0.7, -1.0, 1.2, 1.0, 1.0, (x, y) => (y > 0.0 ? M.AC_CREAM : y > -0.06 ? M.WOOD_LIGHT : 0));
    c.paint(-2.2, 0.4, -0.4, 1.2, 0.9, 0.4, (x, y, z) => (y > 0.55 && Math.abs(z) < 0.04 ? M.LAMP_WHITE : 0));
    c.paint(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => { const d = winD(x, y, z); return d >= 1 && d < 1.9 ? M.WOOD_DARK : 0; });
    const seat = (r, x, z) => {
      r.box(x - 0.2, FLOOR, z - 0.05, x + 0.14, -0.38, z + 0.05, M.STEEL_DARK, { md: 0.06 });
      r.box(x - 0.24, -0.38, z - 0.22, x + 0.26, -0.3, z + 0.22, M.SEAT_LEATHER);
      r.box(x - 0.3, -0.3, z - 0.22, x - 0.2, 0.3, z + 0.22, M.SEAT_LEATHER);
      r.box(x - 0.31, 0.2, z - 0.13, x - 0.21, 0.46, z + 0.13, M.SEAT_LEATHER);
      for (const t of [-1, 1]) r.box(x - 0.16, -0.3, z + t * 0.24 - 0.02, x + 0.2, -0.22, z + t * 0.24 + 0.02, M.WOOD_DARK, { md: 0.05 });
    };
    for (const z of [-0.31, 0.31]) { seat(c, 0.55, z); seat(c, -0.75, z); }
    c.box(-0.6, FLOOR, -0.08, 0.7, -0.3, 0.08, M.WOOD_MID);                                                  // a center console between the rows
    c.box(-0.6, -0.3, -0.08, 0.7, -0.27, 0.08, M.WOOD_DARK);
    c.box(0.1, -0.27, -0.05, 0.24, -0.2, 0.05, M.STEEL_BRIGHT, { md: 0.04 });                                 // a cup in the console
    c.box(-1.9, FLOOR, -0.5, -1.4, -0.1, 0.5, M.WOOD_MID);                                                  // baggage shelf at the back
    c.box(-1.9, -0.1, -0.5, -1.4, -0.06, 0.5, M.WOOD_DARK);
    clipToHull(c, FUS, 'x', WALL, [-2.4, -1.3, -1.3, 1.3, 1.3, 1.3]);

    // ------------------------------------------------------------------ the flight deck (1.2 cm): liner, seats, console, overhead
    const cp = k.interior('cockpit', { voxel: 0.012 });
    cp.loft('x', shell(1.2, PX + 0.02, WALL), M.AC_GRAY);
    carveRoom(cp, 1.2, 2.2, { floor: FLOOR, w: 0.55, wf: 0.4, yw: 0.2, dh: 0.45, yf: -0.3 });
    carveRoom(cp, 2.2, PX + 0.02, { floor: FLOOR, w: 0.5, wf: 0.34, yw: 0.2, dh: 0.45, yf: -0.3 });
    cp.carve(1.1, -1.4, -1.4, PX + 0.1, FLOOR - 0.04, 1.4);
    cp.box(1.2, FLOOR - 0.04, -0.6, PX, FLOOR, 0.6, M.CARPET);
    cp.fn(PANE_X0 - 0.02, PANE_Y0, -0.7, PANE_X1, 1.2, 0.7, (x, y, z) => (paneIn(x, y, z) ? -1 : 0));
    cp.fn(-1.4, -0.1, -1.0, 2.3, 0.5, 1.0, (x, y, z) => (winD(x, y, z) < 1 ? -1 : 0));
    cp.paint(1.2, -0.8, -1.0, PX, 1.0, 1.0, (x, y) => (y > 0.3 ? M.AC_GRAY_LIGHT : y < -0.3 ? M.AC_GRAY_DARK : 0));
    for (const s of [-1, 1]) seat(cp, 1.75, s * 0.31);
    cp.box(1.5, FLOOR, -0.09, PX - 0.2, -0.3, 0.09, M.COCKPIT_PANEL);                                         // the center console
    cp.box(1.5, -0.3, -0.09, PX - 0.2, -0.26, 0.09, M.COCKPIT_TRIM);
    cp.box(2.4, -0.26, -0.07, 2.8, -0.22, 0.07, M.AC_BLACK);
    for (let i = 0; i < 10; i++) cp.box(2.42 + (i >> 1) * 0.07, -0.22, -0.05 + (i & 1) * 0.07, 2.45 + (i >> 1) * 0.07, -0.2, -0.02 + (i & 1) * 0.07, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.015 });
    cp.box(1.9, -0.26, 0.04, 1.93, -0.14, 0.07, M.COCKPIT_TRIM, { md: 0.03 }); cp.box(1.88, -0.16, 0.03, 1.95, -0.12, 0.08, M.SWITCH_GRAY, { md: 0.03 });   // flaps lever
    // the overhead panel, flush with the headliner
    cp.paint(1.3, 0.45, -0.28, 2.05, 0.8, 0.28, (x, y, z) => {
      if (y < 0.5 || Math.abs(z) > 0.25) return 0;
      const fx = ((x - 1.3) % 0.04) / 0.04, fz = ((z + 0.3) % 0.04) / 0.04, i = Math.floor((x - 1.3) / 0.04), j = Math.floor((z + 0.3) / 0.04);
      if (fx > 0.3 && fx < 0.8 && fz > 0.3 && fz < 0.8) return (i * 7 + j * 3) % 11 === 0 ? M.SWITCH_RED : (i + j) % 5 === 0 ? M.NAV_GREEN : M.SWITCH_GRAY;
      return M.AC_GRAY_DARK;
    });
    const fo = k.interior('copilot', { voxel: 0.02 });
    pilot(fo, 1.75, -0.3, { hands: [[2.5, -0.2, -0.22], [2.02, -0.02, 0.19]], feet: 2.6, suit: M.PAINT_BLUEGRAY, helmet: M.PLASTER_CREAM, visor: M.PLASTER_CREAM, vest: M.PAINT_WHITE, reach: true });
    for (const op of fo.ops) op.xf = { tx: 0, ty: 0, tz: 0.31, ang: 0 };
    clipToHull(cp, FUS, 'x', WALL, [1.1, -1.3, -1.3, PX + 0.1, 1.3, 1.3]);

    // ------------------------------------------------------------------ the panel (8 mm): a dash across the hull, glare shield, a wide pair of screens and a center stack
    const pn = k.interior('panel', { voxel: 0.008 });
    H.disk(pn, PX, PX + 0.14, WALL + 0.02, M.COCKPIT_TRIM);
    pn.carve(PX - 0.2, 0.26, -1.0, PX + 0.3, 1.4, 1.0);
    pn.box(PX - 0.14, 0.22, -0.52, PX + 0.08, 0.28, 0.52, M.COCKPIT_PANEL);
    pn.box(PX - 0.2, 0.275, -0.48, PX + 0.08, 0.295, 0.48, M.AC_BLACK);
    const fx = PX - 0.004;
    const scr = (z, y, w, h) => {
      pn.box(fx - 0.016, y - h / 2 - 0.012, z - w / 2 - 0.012, fx + 0.004, y + h / 2 + 0.012, z + w / 2 + 0.012, M.AC_GRAY_DARK);
      pn.box(fx - 0.024, y - h / 2, z - w / 2, fx - 0.014, y + h / 2, z + w / 2, M.GAUGE_FACE);
    };
    const line = (y0, z0, y1, z1, m) => pn.box(fx - 0.03, Math.min(y0, y1), Math.min(z0, z1), fx - 0.02, Math.max(y0, y1) + 0.004, Math.max(z0, z1) + 0.004, m, { thin: true, md: 0.02 });
    scr(-0.3, 0.06, 0.34, 0.3); scr(0.3, 0.06, 0.34, 0.3); scr(0, 0.0, 0.2, 0.24);
    // the primary display: sky and ground, a ladder, speed and altitude tapes. the multifunction display: a route over a range ring
    pn.box(fx - 0.03, 0.06, -0.46, fx - 0.024, 0.2, -0.14, M.SIDING_BLUE); pn.box(fx - 0.03, -0.09, -0.46, fx - 0.024, 0.06, -0.14, M.BRICK_BROWN);
    line(0.06, -0.46, 0.06, -0.14, M.GAUGE_WHITE);
    for (const dy of [-0.04, 0.04]) line(0.06 + dy, -0.35, 0.06 + dy, -0.25, M.GAUGE_WHITE);
    line(-0.08, -0.46, 0.19, -0.44, M.AC_BLACK); line(-0.08, -0.16, 0.19, -0.14, M.AC_BLACK);
    for (let i = 0; i < 8; i++) { line(-0.08 + i * 0.034, -0.46, -0.08 + i * 0.034, -0.44, M.GAUGE_WHITE); line(-0.08 + i * 0.034, -0.16, -0.08 + i * 0.034, -0.14, M.GAUGE_WHITE); }
    line(0.06, -0.35, 0.06, -0.25, M.AC_YELLOW);
    for (let i = 0; i < 9; i++) line(-0.07 + i * 0.03, 0.18 + i * 0.012, -0.065 + i * 0.03, 0.22 + i * 0.012, i % 3 === 0 ? M.GAUGE_WHITE : M.NAV_GREEN);
    line(-0.04, 0.2, 0.17, 0.26, M.AC_YELLOW); line(0.02, 0.32, 0.12, 0.4, M.NAV_GREEN); line(0.12, 0.4, 0.0, 0.46, M.NAV_GREEN);
    for (const [zz, fill] of [[-0.06, 0.12], [0.03, 0.11]]) {
      pn.box(fx - 0.03, -0.1, zz, fx - 0.022, 0.1, zz + 0.04, M.AC_GRAY_DARK);
      pn.box(fx - 0.034, -0.1, zz + 0.004, fx - 0.026, -0.1 + fill, zz + 0.036, M.NAV_GREEN);
    }
    for (let i = 0; i < 12; i++) pn.box(fx - 0.02, -0.25, -0.52 + i * 0.09, fx - 0.004, -0.23, -0.5 + i * 0.09, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    gauge(pn, fx, -0.12, -0.47, 0.045); gauge(pn, fx, -0.12, 0.47, 0.045);
    needle(k.interior('nASI', { pivot: [fx - 0.026, -0.12, -0.47], local: true, voxel: 0.004 }), 0.038, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [fx - 0.026, -0.12, 0.47], local: true, voxel: 0.004 }), 0.038, M.NEEDLE_ORANGE);
    clipToHull(pn, FUS, 'x', WALL, [PX - 0.3, -1.2, -1.2, PX + 0.2, 1.2, 1.2]);

    // ------------------------------------------------------------------ sidesticks, throttle, pedals
    const stick = (name, z) => {
      const y = k.interior(name, { pivot: [2.0, -0.28, z], local: true, voxel: 0.01 });
      y.box(-0.04, 0, -0.04, 0.06, 0.06, 0.04, M.COCKPIT_TRIM);
      y.cyl('y', 0.01, 0, 0.022, 0.026, 0.05, 0.3, M.AC_BLACK);
      y.box(-0.03, 0.26, -0.035, 0.08, 0.34, 0.035, M.AC_BLACK);
      y.box(0.0, 0.3, -0.02, 0.05, 0.33, 0.02, M.SWITCH_RED, { md: 0.008 });
      return y;
    };
    stick('stickL', -0.5); stick('stickR', 0.5);
    const t = k.interior('throttleA', { pivot: [2.55, -0.26, 0.0], local: true, voxel: 0.01 });
    t.cyl('y', 0, 0, 0.018, 0.018, 0, 0.17, M.COCKPIT_TRIM);
    t.box(-0.03, 0.15, -0.03, 0.05, 0.24, 0.03, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.4], ['pedalR', -0.22]]) {
      const p = k.interior(n, { pivot: [2.7, -0.42, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.06, -0.06, 0.02, 0.1, 0.06, M.STEEL_DARK);
    }
  },
});
