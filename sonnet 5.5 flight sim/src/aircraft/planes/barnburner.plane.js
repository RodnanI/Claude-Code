import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { munitionRecipe } from '../munitions.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, pilot, nozzle, store } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Barnburner BB-1: a red barn with an afterburning grain silo on the roof. The pilot sits on a tractor seat by the Dutch door and
   flies through the top half. Behind him the barn is a barn: stalls, a loft, hay, a lantern. The wings are barn doors, the tail
   is more barn doors, and the silo lights up when the throttle goes all the way forward. It has no business being airborne and
   it will not let that stop it. Body origin at the center of gravity, +x forward. */

const RED = M.PAINT_BARN_RED, WHITE = M.PAINT_WHITE, WOODD = M.WOOD_DARK, WOODM = M.WOOD_MID, WOODL = M.WOOD_LIGHT, HAY = M.HAY, DARK = M.STEEL_DARK;
const FLOOR = -1.0;
/** Height of the gambrel roof's outer surface above the floor line at a lateral offset z (steep lower slope, shallow upper one). */
const roofTop = (z) => { const a = Math.abs(z); return a < 0.9 ? 2.3 - 0.33 * (a / 0.9) : 2.0 - 0.85 * ((a - 0.9) / 0.85); };

const WING = (s) => wingDef([1.0, -0.3, s * 1.6], 3.4, 2.2, 1.3, 0.5, 0.35, 0.1, 0.09, s);
const ST = (s) => wingDef([-6.2, 0.1, s * 0.05], 2.4, 1.3, 0.9, 0.2, 0, 0.08, 0.08, s);
const FIN = (s) => ({ x: -6.2, y: 0.1, z: s * 1.0, chord: 1.3, tip: 0.9, height: 2.0, sweep: 0.5, thick: 0.05 });

export default defineAircraft({
  id: 'barnburner',
  name: 'Barnburner BB-1',
  manufacturer: 'Hollis Farm Equipment',
  role: 'Rocket barn',
  category: 'homebuilt',
  order: 13,
  difficulty: 5,
  tags: ['Afterburning silo', 'Barn', 'Plunger rockets', 'Hay loft'],
  description: 'A three-stall barn with a grain silo on the roof that somebody connected to a fuel line. Barn doors for wings, more barn doors for a tail, a tractor seat for a cockpit and a hay loft behind it. Hit the throttle past the stop and the silo lights up. Fire plungers at what is left.',
  voxel: 0.05,
  interiorVoxel: 0.025,
  lodLevels: 4,
  mass: { empty: 1800, fuel: 200, payload: 150 },
  inertia: [2600, 8600, 7400],
  wing: { area: 17, span: 10.4, chord: 1.8, y: -0.3 },
  aero: {
    CL0: 0.25, CLa: 4.3, CLmax: 1.5, alphaStall: 0.3, CD0: 0.14, k: 0.08, CDflap: 0.09, CLflap: 0.5, Cmflap: -0.1, CLmaxFlap: 0.45, CDgear: 0.04, CDair: 0.25,
    Cm0: 0.03, Cma: -0.8, Cmq: -14, Clb: 0.06, Clp: -0.5, Cnb: 0.12, Cnr: -0.17, Cyb: 0.55, Cnda: 0.03,
    machDrag: 0.05, machCrit: 0.7, spin: 0.05, stallPitchDown: 0.06,
    control: { elevator: 0.55, aileron: 0.06, rudder: 0.045 },
  },
  propulsion: { type: 'jet', thrust: 13000, afterburner: 8500, fuelBurn: 0.28, idleRpm: 40, spool: 0.7 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [2.4, -1.1, 0], radius: 0.3, k: 60000, c: 5000, steer: 0.6, cornering: 0.8, travel: 0.2 },
      { pos: [-0.8, -1.0, -1.9], radius: 0.55, k: 150000, c: 11000, brake: true, travel: 0.2 },
      { pos: [-0.8, -1.0, 1.9], radius: 0.55, k: 150000, c: 11000, brake: true, travel: 0.2 },
    ],
  },
  skids: [
    { p: [3.1, -0.9, 0], kind: 'nose' }, { p: [-7.6, 0.1, 1.0], kind: 'tail' }, { p: [-7.6, 0.1, -1.0], kind: 'tail' }, { p: [0.4, 0.0, 5.0], kind: 'tip' }, { p: [0.4, 0.0, -5.0], kind: 'tip' },
    { p: [0.0, -1.1, 0], kind: 'belly' }, { p: [-6.5, 2.2, 1.0], kind: 'tail' }, { p: [-6.5, 2.2, -1.0], kind: 'tail' }, { p: [0.0, 3.4, 0], kind: 'tail' },
  ],
  limits: { vne: 140, maxG: 3.2, minG: 0.8, flapSpeed: 85, gearSpeed: 999, crashVs: 5.5 },
  cameras: { cockpit: [2.1, 0.3, 0], chase: { distance: 24, height: 6 }, near: { distance: 12, height: 3.2 } },
  liveries: [
    { id: 'default', name: 'Barn red' },
    { id: 'weathered', name: 'Gray with age', remap: { PAINT_BARN_RED: 'WOOD_WEATHERED' } },
    { id: 'whitewash', name: 'Whitewash', remap: { PAINT_BARN_RED: 'PAINT_WHITE', PAINT_WHITE: 'PAINT_BARN_RED' } },
    { id: 'green', name: 'Greenhouse', remap: { PAINT_BARN_RED: 'PAINT_GREEN' } },
  ],
  stations: [
    { id: 'rkL', pos: [1.4, -0.6, -3.2], kind: 'rack' }, { id: 'rkR', pos: [1.4, -0.6, 3.2], kind: 'rack' },
    { id: 'btL', pos: [2.2, 0.3, -1.75], kind: 'rack' }, { id: 'btR', pos: [2.2, 0.3, 1.75], kind: 'rack' },
    { id: 'propL', pos: [0.2, -1.2, -1.2], kind: 'rack' }, { id: 'propR', pos: [0.2, -1.2, 1.2], kind: 'rack' },
  ],
  weapons: [
    { id: 'plungers', name: 'Plunger rockets', type: 'rocket', munition: 'plunger', stations: ['rkL', 'rkR'], rounds: 6, muzzleX: 0.9, tube: 0.1 },
    { id: 'bottles', name: 'Bottle rockets', type: 'rocket', munition: 'bottle', stations: ['btL', 'btR'], rounds: 12, muzzleX: 0.6, tube: 0.08 },
    { id: 'propane', name: 'Propane tank', type: 'bomb', munition: 'propane', stations: ['propL', 'propR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.45 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.45 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.7 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.45 },
    { part: 'rudderL', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'rudderR', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.5 },
    { part: 'vane', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 1.2 },
    { part: 'doorL', type: 'rotate', axis: [0, 1, 0], channel: 'iasKnots', gain: 0.006, offset: -1.8 },
    { part: 'doorR', type: 'rotate', axis: [0, 1, 0], channel: 'iasKnots', gain: -0.006, offset: 1.8 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheel', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 1.4 },
    { part: 'wheel', type: 'translate', axis: [1, 0, 0], channel: 'elevator', gain: -0.1 },
    { part: 'gearStick', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.8, offset: 0.4 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0143, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.0006, offset: -2.3 },
  ],
  model(k) {
    const body = k.part('body');
    const FINE = { md: 0.1 };
    // ------------------------------------------------------------------ the barn: floor, plank walls, gable ends, a gambrel roof
    body.box(-3.0, FLOOR - 0.12, -1.6, 3.0, FLOOR, 1.6, WOODD);                                           // floor beams
    for (const s of [-1, 1]) body.box(-3.0, FLOOR, s > 0 ? 1.5 : -1.6, 3.0, 1.34, s > 0 ? 1.6 : -1.5, RED);   // the side walls, 10 cm
    body.fn(-3.0, FLOOR, -1.6, -2.9, 2.4, 1.6, (x, y, z) => (y <= roofTop(z) - 0.02 ? RED : 0));         // back gable end
    body.fn(2.9, FLOOR, -1.6, 3.0, 2.4, 1.6, (x, y, z) => (y <= roofTop(z) - 0.02 ? RED : 0));           // front gable end
    // the roof: two slopes a side, a ridge; corrugated steel with rust, overhanging the ends
    body.fn(-3.25, 1.0, -1.95, 3.25, 2.5, 1.95, (x, y, z) => {
      const t = roofTop(z);
      if (y < t - 0.02 || y > t + 0.07) return 0;
      if (Math.abs(z) > 1.9 || Math.abs(x) > 3.2) return 0;
      const rib = Math.floor(Math.abs(x) / 0.12) % 2;
      return (Math.floor(x * 5) * 3 + Math.floor(z * 4)) % 9 === 0 ? M.RUST : rib ? M.STEEL : M.STEEL_BRIGHT;
    });
    // the front: Dutch door opening (top half open), the hayloft door, the trim, the X braces, the lower half closed
    body.carve(2.85, 0.3, -0.9, 3.05, 1.1, 0.9, FINE);                                                    // the open top half of the door
    body.carve(2.85, 1.3, -0.45, 3.05, 1.95, 0.45, FINE);                                                 // the hayloft door
    body.paint(2.85, FLOOR, -1.65, 3.05, 2.45, 1.65, (x, y, z) => {
      const trim = Math.abs(Math.abs(z) - 0.95) < 0.05 || y > 1.15 && y < 1.25 && Math.abs(z) < 1.0 || Math.abs(Math.abs(z) - 1.6) < 0.06 || y < FLOOR + 0.1;
      if (trim) return WHITE;
      if (Math.abs(z) < 0.95 && y < 0.3) { const d = (y + 1.0) / 1.3, e = Math.abs(z) / 0.95; return Math.abs(d - e) < 0.05 || Math.abs(d - (1 - e)) < 0.05 ? WHITE : 0; }   // the X brace on the lower door
      if (Math.abs(z) < 0.5 && y > 1.28 && y < 2.0 && (Math.abs(Math.abs(z) - 0.45) < 0.05 || y < 1.33 || y > 1.93)) return WHITE;
      return 0;
    }, { thin: true, md: 0.12 });
    // board seams and corner trim on the other walls
    body.paint(-3.05, FLOOR, -1.65, 3.05, 2.45, 1.65, (x, y, z) => {
      if (Math.abs(z) > 1.55 && x < 2.85) return Math.abs(x - 2.9) < 0.1 || Math.abs(x + 2.9) < 0.1 ? WHITE : Math.abs(((x + 3) % 0.2) - 0.1) < 0.012 ? M.RUST : y < FLOOR + 0.1 ? WHITE : 0;
      if (x < -2.88) return Math.abs(((z + 2) % 0.2) - 0.1) < 0.012 ? M.RUST : 0;
      return 0;
    }, { thin: true, md: 0.12 });
    body.box(2.95, 1.3, -0.05, 3.3, 1.6, 0.95, WOODD, { md: 0.1 });                                          // the pulley beam out of the peak, with a hook and a bit of rope
    strut(body, [3.25, 1.3, 0.9], [3.25, 0.8, 0.9], 0.025, M.WOOD_LIGHT, { md: 0.08 });
    body.box(3.2, 0.72, 0.87, 3.3, 0.8, 0.93, M.STEEL_BRIGHT, { md: 0.08 });
    body.box(2.2, 1.3, -0.4, 2.9, 1.5, 0.4, HAY, { md: 0.1 });                                               // a bale hanging out of the hayloft door
    decal(body, 'HOLLIS', { x: 0.0, y: 0.35, side: 1, px: 0.07, mat: WHITE, z0: 1.55, z1: 1.7 });
    decal(body, 'HOLLIS', { x: 0.0, y: 0.35, side: -1, px: 0.07, mat: WHITE, z0: 1.55, z1: 1.7 });
    decal(body, 'BB-1', { x: -0.0, y: 0.85, side: 1, px: 0.05, mat: M.AC_BLACK, z0: 1.55, z1: 1.7 });
    decal(body, 'BB-1', { x: -0.0, y: 0.85, side: -1, px: 0.05, mat: M.AC_BLACK, z0: 1.55, z1: 1.7 });
    // ------------------------------------------------------------------ the silo on the roof: ribbed, a ladder up the side, a dome cap, and a nozzle at the back
    const sy = 2.85;
    body.cyl('x', sy, 0, 0.55, 0.55, -3.8, 2.2, M.TANK_WHITE);
    for (let x = -3.7; x < 2.1; x += 0.36) body.cyl('x', sy, 0, 0.575, 0.575, x, x + 0.06, M.AC_GRAY, { thin: true, md: 0.1 });
    body.loft('x', [0, 0.2, 0.45, 0.7, 0.9, 1].map((t) => ({ a: 2.2 + 0.6 * t, c1: sy, c2: 0, r1: 0.55 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.02, r2: 0.55 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.02, n: 2 })), M.AC_GRAY_LIGHT);
    for (const z of [-0.12, 0.12]) strut(body, [-3.5, sy + 0.55, z], [1.9, sy + 0.55, z], 0.03, M.AC_METAL, { md: 0.08 });      // ladder rails
    for (let x = -3.4; x < 1.9; x += 0.3) body.box(x, sy + 0.54, -0.12, x + 0.03, sy + 0.58, 0.12, M.AC_METAL, { md: 0.08 });  // rungs
    for (const x of [-2.4, -0.4, 1.4]) { strut(body, [x, 2.15, 0.0], [x, sy - 0.4, 0.0], 0.14, WOODD, { md: 0.1 }); body.box(x - 0.2, sy - 0.5, -0.5, x + 0.2, sy - 0.4, 0.5, WOODD, { md: 0.1 }); }   // saddle blocks
    nozzle(body, -3.85, sy, 0, 0.44, { len: 0.7, petals: 14 });
    for (const s of [-1, 1]) strut(body, [-3.0, sy - 0.3, s * 0.3], [-3.6, sy - 0.2, s * 0.44], 0.05, M.AC_BLACK, { md: 0.1 });
    body.cyl('x', sy, 0, 0.5, 0.5, -3.78, -3.55, M.RUST_DARK, { md: 0.1 });
    // ------------------------------------------------------------------ wings of barn doors, struts, booms of fence rails, an H tail
    for (const s of [-1, 1]) {
      const w = WING(s); body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, WOODM);
      const st = ST(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, WOODM);
      strut(body, [0.8, 0.9, s * 1.6], [0.5, -0.45, s * 3.4], 0.07, M.RUST_DARK, { md: 0.2 });               // wing struts from the eave
      strut(body, [0.0, 0.9, s * 1.6], [0.1, -0.45, s * 3.4], 0.07, M.RUST_DARK, { md: 0.2 });
      body.box(-7.8, -0.05, s * 1.0 - 0.1, -3.0, 0.15, s * 1.0 + 0.1, WOODM);                                  // booms
      strut(body, [-3.0, 0.8, s * 1.3], [-6.8, 0.1, s * 1.0], 0.06, WOODD, { md: 0.15 });
      body.loft('y', finStations(FIN(s)), RED, { thin: true });
      body.paint(-7.8, -0.4, -2.6, -3.0, 0.6, 2.6, (x, y, z) => { const b = Math.floor(Math.abs(z) / 0.3), f = Math.abs(z) / 0.3 - b; return f < 0.05 ? WOODD : 0; }, { thin: true, md: 0.1 });
    }
    // barn-door planks on the wings: Z braces on the top face
    for (const s of [-1, 1]) body.paint(-1.2, -0.7, s > 0 ? 1.6 : -5.0, 1.2, 0.2, s > 0 ? 5.0 : -1.6, (x, y, z) => { const b = Math.floor(Math.abs(z) / 0.34), f = Math.abs(z) / 0.34 - b; return f < 0.05 ? WOODD : (b % 5 === 2 ? M.RUST : 0); }, { thin: true, md: 0.12 });
    // X braces and trim on the tail fins
    for (const s of [-1, 1]) body.paint(-7.8, 0.1, s * 1.0 - 0.1, -5.4, 2.2, s * 1.0 + 0.1, (x, y) => (Math.abs((y - 0.1) / 2.0 - (x + 7.7) / 1.6) < 0.045 || Math.abs((y - 0.1) / 2.0 + (x + 7.7) / 1.6 - 1) < 0.045 ? WHITE : 0), { thin: true, md: 0.1 });
    decal(body, 'HAY', { x: -6.85, y: 1.3, side: 1, px: 0.06, mat: M.AC_WHITE, z0: 1.0, z1: 1.2 });
    // the weathervane on the front peak and a lightning rod
    const vn = k.part('vane', { pivot: [2.4, 2.35, 0], local: true });
    strut(vn, [0, 0, 0], [0, 0.55, 0], 0.03, M.STEEL_BRIGHT);
    vn.box(-0.35, 0.5, -0.02, 0.35, 0.54, 0.02, M.STEEL_BRIGHT, { md: 0.04 });                                  // the arrow
    vn.box(0.3, 0.46, -0.02, 0.45, 0.62, 0.02, M.STEEL_BRIGHT, { md: 0.04 });
    vn.box(-0.45, 0.4, -0.02, -0.3, 0.7, 0.02, M.STEEL_BRIGHT, { md: 0.04 });
    vn.ell(0.0, 0.72, 0, 0.12, 0.08, 0.02, M.AC_RED, { md: 0.04 });                                            // the rooster
    vn.box(0.08, 0.76, -0.02, 0.2, 0.84, 0.02, M.AC_RED, { md: 0.04 });
    // ------------------------------------------------------------------ the front doors, flung open and blowing back with speed
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      const dr = k.part('door' + n, { pivot: [3.0, 0, s * 0.95], hideInCockpit: true });
      dr.box(3.0, FLOOR + 0.1, s > 0 ? 0.0 : -0.95, 3.07, 0.3, s > 0 ? 0.95 : 0.0, RED, { thin: true });
      dr.box(2.995, 0.3, s > 0 ? 0.0 : -0.95, 3.075, 1.1, s > 0 ? 0.95 : 0.0, RED, { thin: true });
      dr.paint(2.9, -1, -1, 3.2, 1.2, 1, (x, y, z) => { const e = Math.abs(z) / 0.95; return Math.abs((y + 0.9) / 2.0 - e) < 0.05 || Math.abs((y + 0.9) / 2.0 - (1 - e)) < 0.05 ? WHITE : 0; }, { thin: true });
    }
    // ------------------------------------------------------------------ control surfaces
    for (const [W, st, s, n] of [[WING(-1), ST(-1), -1, 'L'], [WING(1), ST(1), 1, 'R']]) {
      wingSurface(k, body, 'flap' + n, W, { z0: 1.8, z1: 3.4, frac: 0.28, mat: WOODM });
      wingSurface(k, body, 'aileron' + n, W, { z0: 3.5, z1: 4.95, frac: 0.28, mat: WOODM });
      wingSurface(k, body, 'elevator' + n, st, { z0: 0.1, z1: 2.4, frac: 0.4, mat: WOODL });
      const f = FIN(s), hinge = finAt(f, 0.9);
      loftSurface(k, body, 'rudder' + n, {
        stations: finStations(f), axis: 'y', mat: RED, box: [-8.0, 0.1, s * 1.0 - 0.2, -5.0, 2.2, s * 1.0 + 0.2],
        aft: (x, y) => { const a = finAt(f, y); return x < a.te + a.chord * 0.4; },
        pivot: [hinge.te + hinge.chord * 0.4, 0.9, s * 1.0],
      });
    }
    // ------------------------------------------------------------------ the burner: a plume of fire behind the silo, drawn when the afterburner is lit
    const bn = k.part('burner', { pivot: [-4.55, sy, 0], local: true, visibleWhen: 'afterburner' });
    bn.cyl('x', 0, 0, 0.42, 0.06, -3.6, 0.0, M.RWY_LIGHT_AMBER);
    bn.cyl('x', 0, 0, 0.3, 0.03, -3.1, -0.1, M.RWY_LIGHT_RED, { md: 0.2 });
    bn.cyl('x', 0, 0, 0.2, 0.02, -2.5, -0.2, M.HEADLIGHT, { md: 0.2 });
    for (let i = 0; i < 4; i++) bn.cyl('x', 0, 0, 0.26 - i * 0.04, 0.1, -0.5 - i * 0.7, -0.8 - i * 0.7, M.STROBE, { md: 0.2 });
    // ------------------------------------------------------------------ wheels: tractor tires
    const gn = k.part('gearNose');
    strut(gn, [2.4, FLOOR, 0], [2.4, -1.1, 0], 0.12, DARK);
    for (const s of [-1, 1]) strut(gn, [2.4, -1.1, s * 0.16], [2.4, -1.1, s * 0.16], 0.12, DARK);
    wheel(k.part('wheelNose', { pivot: [2.4, -1.1, 0], local: true }), 0, 0, 0, 0.3, 0.2, M.AC_TIRE, M.RUST);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n);
      strut(g, [-0.8, FLOOR, s * 1.6], [-0.8, -1.0, s * 1.9], 0.16, DARK);
      strut(g, [-1.4, FLOOR, s * 1.6], [-0.8, -1.0, s * 1.9], 0.07, M.RUST_DARK, { md: 0.1 });
      wheel(k.part('wheel' + n, { pivot: [-0.8, -1.0, s * 1.9], local: true }), 0, 0, 0, 0.55, 0.32, M.AC_TIRE, M.PAINT_GREEN);
    }
    // ------------------------------------------------------------------ the pilot on a tractor seat, and the stores: plungers in milk crates, bottle rockets, propane tanks
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 1.85, -0.5, { hands: [[2.45, -0.2, -0.18], [2.45, -0.2, 0.18]], feet: 2.45, suit: M.PAINT_BLUEGRAY, helmet: M.HAY, visor: M.PLASTER_TERRA, vest: M.AC_RED });
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const pg = munitionRecipe('plunger');
      const crate = k.part('rack' + n, { visibleWhen: 'store_rk' + n, voxel: 0.025 });
      crate.box(1.0, -0.78, s * 3.2 - 0.4, 1.9, -0.72, s * 3.2 + 0.4, M.CONTAINER_GREEN);
      for (const zz of [-0.4, 0.4]) crate.box(1.0, -0.78, s * 3.2 + zz - 0.02, 1.9, -0.45, s * 3.2 + zz + 0.02, M.CONTAINER_GREEN);
      for (const xx of [1.0, 1.9]) crate.box(xx - 0.02, -0.78, s * 3.2 - 0.4, xx + 0.02, -0.45, s * 3.2 + 0.4, M.CONTAINER_GREEN);
      for (let i = 0; i < 6; i++) crate.stamp(pg, 1.4, -0.62 + (i >= 3 ? 0.12 : 0), s * 3.2 - 0.3 + (i % 3) * 0.3, 0);
      const bt = munitionRecipe('bottle');
      const hay = k.part('bottles' + n, { visibleWhen: 'store_bt' + n, voxel: 0.02 });
      hay.box(1.9, 0.2, s * 1.75 - 0.2, 2.6, 0.24, s * 1.75 + 0.2, M.WOOD_LIGHT);
      for (let i = 0; i < 6; i++) hay.stamp(bt, 2.25 + (i % 2) * 0.05, 0.3 + (i >> 1) * 0.0, s * 1.75 - 0.15 + (i % 3) * 0.15, 0);
      store(k, 'propane' + n, 'prop' + n, 'propane', [0.2, -1.2, s * 1.2], { voxel: 0.03125 });
      strut(body, [0.2, FLOOR, s * 1.2], [0.2, -1.1, s * 1.2], 0.03, DARK, { md: 0.1 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ inside the barn (2.5 cm): plank floor, stalls, a loft over the back with hay, rafters, a ladder, a lantern
    const c = k.interior('barn');
    c.box(-2.9, FLOOR, -1.5, 2.9, FLOOR + 0.05, 1.5, WOODM);
    for (let i = 0; i < 20; i++) c.box(-2.9, FLOOR + 0.05, -1.5 + i * 0.15, 2.9, FLOOR + 0.055, -1.5 + i * 0.15 + 0.012, WOODD, { md: 0.04 });
    c.box(-2.9, FLOOR + 0.05, -1.5, 2.9, FLOOR + 0.12, -1.0, HAY, { md: 0.04 }); c.box(-2.9, FLOOR + 0.05, 1.0, 2.9, FLOOR + 0.12, 1.5, HAY, { md: 0.04 });   // loose straw along the walls
    // the loft over the back half: planks on beams, hay piled on it, a hole for the ladder
    c.box(-2.9, 1.0, -1.5, 0.6, 1.07, 1.5, WOODL);
    for (const x of [-2.5, -1.5, -0.5, 0.5]) c.box(x - 0.08, 0.9, -1.5, x + 0.08, 1.0, 1.5, WOODD);
    c.carve(0.0, 0.99, 0.6, 0.55, 1.08, 1.1);
    c.box(-2.8, 1.07, -1.4, -1.4, 1.5, -0.2, HAY); c.ell(-1.9, 1.5, -0.8, 0.8, 0.3, 0.55, HAY);                  // a big hay pile
    c.box(-1.0, 1.07, 0.3, -0.3, 1.4, 1.2, HAY, { md: 0.04 });
    for (const x of [-2.6, -1.7, -0.8]) for (const y of [FLOOR + 0.05, FLOOR + 0.45]) c.box(x - 0.4, y, 0.2, x + 0.4, y + 0.4, 0.95, HAY);   // stacked bales on the floor
    // three stalls along the left wall, partitions and gates
    for (const x of [-1.9, -0.5, 0.9]) {
      c.box(x - 0.03, FLOOR + 0.05, -1.5, x + 0.03, 0.2, -0.75, WOODD);
      c.box(x - 0.03, 0.2, -1.5, x + 0.03, 0.35, -0.75, WOODL);
    }
    c.box(-1.9, FLOOR + 0.05, -0.78, 0.9, 0.15, -0.72, WOODD);
    for (let i = 0; i < 6; i++) c.box(-1.9 + i * 0.47, 0.15, -0.78, -1.87 + i * 0.47, 0.5, -0.72, WOODD, { md: 0.03 });
    c.box(-1.9, 0.48, -0.78, 0.9, 0.52, -0.72, WOODD, { md: 0.04 });
    c.box(-1.4, FLOOR + 0.05, -1.45, -1.2, -0.7, -1.2, M.STEEL_BRIGHT, { md: 0.04 });                           // a feed bucket
    // rafters across the roof, every 0.7 m, and a ridge beam
    for (let x = -2.7; x < 2.9; x += 0.7) {
      for (const s of [-1, 1]) {
        c.box(x - 0.04, 1.2, s * 0.2 - 0.05, x + 0.04, 2.1, s * 0.2 + 0.05, WOODD, { md: 0.05 });
        strut(c, [x, 1.2, s * 1.5], [x, 2.05, s * 0.85], 0.07, WOODD, { md: 0.05 });
      }
      c.box(x - 0.05, 1.19, -1.55, x + 0.05, 1.27, 1.55, WOODD, { md: 0.05 });
    }
    c.box(-2.9, 2.18, -0.05, 2.9, 2.26, 0.05, WOODD, { md: 0.05 });
    // the ladder up to the loft, a pitchfork on the wall, a lantern hanging from a beam with a warm glow
    c.box(0.55, FLOOR + 0.05, 0.6, 0.6, 1.0, 0.66, WOODL); c.box(0.55, FLOOR + 0.05, 1.08, 0.6, 1.0, 1.14, WOODL);
    for (let i = 0; i < 9; i++) c.box(0.55, FLOOR + 0.2 + i * 0.22, 0.62, 0.6, FLOOR + 0.24 + i * 0.22, 1.12, WOODL, { md: 0.03 });
    strut(c, [-2.3, 0.2, 1.46], [-2.3, 1.1, 1.46], 0.03, WOODL, { md: 0.03 });                                    // a pitchfork on the wall
    for (const dz of [-0.1, 0, 0.1]) strut(c, [-2.3, 1.1, 1.46 + dz * 0.5], [-2.3, 1.25, 1.46 + dz], 0.015, M.STEEL_BRIGHT, { md: 0.03 });
    strut(c, [0.8, 1.0, 0.0], [0.8, 0.6, 0.0], 0.015, M.AC_METAL, { md: 0.02 });                                 // the lantern's hook chain
    c.box(0.7, 0.35, -0.08, 0.9, 0.62, 0.08, M.AC_BLACK, { md: 0.02 });
    c.box(0.72, 0.38, -0.06, 0.88, 0.56, 0.06, M.LAMP_SODIUM, { md: 0.02 });
    // the tractor seat on its spring, a milking stool for good measure
    c.cyl('y', 1.85, 0, 0.04, 0.04, FLOOR + 0.05, -0.55, DARK);
    c.box(1.6, -0.55, -0.22, 2.1, -0.5, 0.22, M.STEEL_DARK);
    c.box(1.55, -0.5, -0.2, 1.62, -0.25, 0.2, M.STEEL_DARK);
    c.cyl('y', 0.4, 0.8, 0.14, 0.14, FLOOR + 0.05, -0.65, WOODL, { md: 0.03 });
    // the Dutch door's lower half, its latch, a horseshoe above the panel
    c.box(2.8, FLOOR + 0.05, -0.95, 2.9, 0.3, 0.95, WOODM);
    for (let i = 0; i < 6; i++) c.box(2.79, FLOOR + 0.05, -0.95 + i * 0.32, 2.795, 0.3, -0.95 + i * 0.32 + 0.012, WOODD, { md: 0.03 });
    c.box(2.78, 0.3, -0.95, 2.9, 0.34, 0.95, WOODD);
    // ------------------------------------------------------------------ the panel: gauges on the closed half of the door, a steering wheel and a gear stick
    const pn = k.interior('panel', { voxel: 0.008 });
    const gx = 2.78;
    gauge(pn, gx, 0.0, -0.5, 0.1); gauge(pn, gx, 0.0, -0.22, 0.07); gauge(pn, gx, 0.0, 0.22, 0.07); gauge(pn, gx, 0.0, 0.5, 0.1);
    needle(k.interior('nASI', { pivot: [gx - 0.028, 0.0, -0.5], local: true, voxel: 0.004 }), 0.082, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [gx - 0.028, 0.0, 0.5], local: true, voxel: 0.004 }), 0.082, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [gx - 0.028, 0.0, -0.22], local: true, voxel: 0.004 }), 0.056, M.NEEDLE_ORANGE);
    pn.cyl('x', 0.0, 0.0, 0.1, 0.1, gx - 0.04, gx - 0.01, M.PAINT_YELLOW, { md: 0.03 });                       // a lucky horseshoe, painted
    pn.cyl('x', 0.0, 0.0, 0.07, 0.07, gx - 0.045, gx - 0.005, M.WOOD_MID, { md: 0.03 });
    pn.box(gx - 0.045, -0.12, -0.1, gx - 0.005, -0.04, 0.1, M.WOOD_MID, { md: 0.03 });
    for (let i = 0; i < 5; i++) pn.box(gx - 0.04, -0.2, -0.4 + i * 0.2, gx - 0.02, -0.16, -0.36 + i * 0.2, i === 2 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    pn.box(gx - 0.03, 0.2, -0.7, gx - 0.015, 0.27, 0.7, M.PAINT_WHITE, { md: 0.02 });                           // a hand-painted label strip
    const sw = k.interior('wheel', { pivot: [2.3, -0.1, 0], local: true, voxel: 0.012 });
    sw.cyl('x', 0, 0, 0.2, 0.2, -0.02, 0.03, M.AC_BLACK);
    sw.cyl('x', 0, 0, 0.16, 0.16, -0.03, 0.04, 0);
    sw.box(-0.03, -0.03, -0.18, 0.04, 0.03, 0.18, M.AC_BLACK); sw.box(-0.03, -0.18, -0.03, 0.04, 0.18, 0.03, M.AC_BLACK);
    sw.cyl('x', 0, 0, 0.03, 0.03, 0.03, 0.5, M.AC_GRAY_DARK);
    const gs = k.interior('gearStick', { pivot: [2.15, -0.5, 0.3], local: true, voxel: 0.01 });
    gs.cyl('y', 0, 0, 0.018, 0.018, 0, 0.4, M.AC_METAL);
    gs.ell(0, 0.43, 0, 0.045, 0.05, 0.045, M.AC_RED);
    for (const [n, z] of [['pedalL', -0.15], ['pedalR', 0.15]]) {
      const p = k.interior(n, { pivot: [2.55, -0.6, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.08, -0.06, 0.02, 0.1, 0.06, M.STEEL_DARK);
    }
  },
});
