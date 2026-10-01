import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { hash2, hashUnit } from '../../core/util.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, decalTop, prop, sitter } from '../builders/detail.js';
import { makeHull } from '../builders/hull.js';
import { wingDef, wingSurface, surfaceSeams, loftSurface, finStations, finAt } from '../builders/surfaces.js';
import { munitionRecipe } from '../munitions.js';

/* Scrapper B-1: a homebuilt taildragger bush plane welded together from whatever was in the barn. Patchwork fabric,
   automotive engine, tundra tires, an open cockpit and a wing that will lift off in the length of a driveway.
   It will also bite: adverse yaw, a small fin and a tailwheel that wants to lead. Pilot sits under the wing. */

const FABRIC = M.FABRIC_TAN, FRAME = M.STEEL_DARK;

const FUS = [
  { a: 0.75, c1: 0.08, c2: 0, r1: 0.5, r2: 0.44, n: 3.2 },
  { a: -0.2, c1: 0.1, c2: 0, r1: 0.52, r2: 0.42, n: 3.2 },
  { a: -1.5, c1: 0.13, c2: 0, r1: 0.46, r2: 0.3, n: 3 },
  { a: -3.0, c1: 0.17, c2: 0, r1: 0.3, r2: 0.16, n: 2.6 },
  { a: -4.5, c1: 0.2, c2: 0, r1: 0.14, r2: 0.06, n: 2.4 },
];
const H = makeHull(FUS, 0.06);
const WNG = (s) => wingDef([0.35, 1.1, s * 0.02], 4.78, 1.5, 1.3, 0.0, 0.05, 0.12, 0.1, s);
const STB = (s) => wingDef([-3.55, 0.42, s * 0.02], 1.55, 0.78, 0.7, 0.0, 0.0, 0.06, 0.05, s);
const FIN = { x: -3.85, y: 0.3, chord: 0.9, tip: 0.8, height: 1.05, sweep: 0.05, thick: 0.05 };

/** Deterministic patchwork: most of the cloth stays original, the rest is whatever color was on the shelf. */
function patch(u, v, seed) {
  const h = hashUnit(hash2(Math.floor(u), Math.floor(v), seed));
  return h < 0.46 ? 0 : h < 0.58 ? M.PATCH_A : h < 0.7 ? M.PATCH_B : h < 0.78 ? M.PATCH_C : h < 0.86 ? M.PATCH_D : h < 0.92 ? M.TARP_BLUE : h < 0.96 ? M.PAINT_ORANGE : M.AC_CREAM;
}

export default defineAircraft({
  id: 'scrapper',
  name: 'Scrapper B-1',
  manufacturer: "Cousin Earl's Garage",
  category: 'homebuilt',
  role: 'Bush plane',
  order: 10,
  difficulty: 4,
  tags: ['Tailwheel', 'STOL', 'Open cockpit', 'Bites back'],
  description: 'Fabric, chrome-moly tube and a converted car engine. Lands on a road, a pasture or a sandbar. Spins if you look at it wrong. The only aircraft the hillbilly strip was built for.',
  voxel: 0.045,
  interiorVoxel: 0.015,
  lodLevels: 3,
  mass: { empty: 360, fuel: 50, payload: 95 },
  inertia: [470, 900, 640],
  wing: { area: 14.2, span: 9.6, chord: 1.48, y: 1.1 },
  aero: {
    CL0: 0.38, CLa: 4.7, CLmax: 1.9, alphaStall: 0.323, CD0: 0.045, k: 0.07, CDflap: 0.07, CLflap: 0.55, Cmflap: -0.1, CLmaxFlap: 0.45,
    Cm0: 0.07, Cma: -0.75, Cmq: -11, Clb: 0.06, Clp: -0.5, Cnb: 0.05, Cnr: -0.1, Cyb: 0.28, Cnda: 0.03, spin: 0.9, stallPitchDown: 0.1,
    control: { elevator: 0.6, aileron: 0.06, rudder: 0.045 },
  },
  propulsion: { type: 'prop', power: 75000, efficiency: 0.72, propDiameter: 1.75, maxRpm: 2600, idleRpm: 800, fuelBurn: 0.0065, staticFactor: 0.55 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [0.42, -1.0, -0.85], radius: 0.33, k: 14000, c: 1300, brake: true, travel: 0.3 },
      { pos: [0.42, -1.0, 0.85], radius: 0.33, k: 14000, c: 1300, brake: true, travel: 0.3 },
      { pos: [-4.5, -0.52, 0], radius: 0.1, k: 8000, c: 700, steer: -0.6, castor: 0.4, cornering: 0.5, travel: 0.12 },
    ],
  },
  skids: [{ p: [0.0, 1.1, 4.8], kind: 'tip' }, { p: [0.0, 1.1, -4.8], kind: 'tip' }, { p: [2.05, 0.05, 0], kind: 'nose' }, { p: [0.2, -0.45, 0], kind: 'belly' }, { p: [-4.4, 1.35, 0], kind: 'tail' }],
  stations: [{ id: 'btL', pos: [0.5, 0.8, -2.2], kind: 'rack' }, { id: 'btR', pos: [0.5, 0.8, 2.2], kind: 'rack' }],
  weapons: [
    { id: 'spud', name: 'Potato cannon', type: 'gun', munition: 'spud', ammo: 24, rate: 1.8, muzzle: [2.1, 0.45, 0.32], spread: 0.02, flash: 0.4 },
    { id: 'bottles', name: 'Bottle rockets', type: 'rocket', munition: 'bottle', stations: ['btL', 'btR'], rounds: 6, muzzleX: 0.7, tube: 0.07 },
  ],
  limits: { vne: 55, maxG: 4, minG: 1.5, flapSpeed: 30, gearSpeed: 999, crashVs: 6 },
  cameras: { cockpit: [0.05, 0.76, 0], chase: { distance: 12, height: 3 }, near: { distance: 6.2, height: 1.7 } },
  liveries: [
    { id: 'default', name: 'Barn find patchwork' },
    { id: 'mailbox', name: 'Mailbox red', remap: { FABRIC_TAN: 'AC_RED', PATCH_A: 'AC_CREAM', PATCH_B: 'AC_ORANGE' } },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.6 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.6 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.5 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.5 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.55 },
    { part: 'propeller', type: 'rotate', axis: [1, 0, 0], channel: 'propAngle', gain: 1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'tailwheel', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'tailwheel', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.4 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.4 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.4 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0383, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.001533, offset: -2.3 },
  ],
  model(k) {
    const body = k.part('body');
    const FINE = { md: 0.07 };
    const zr = (s, a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
    // ------------------------------------------------------------------ fuselage: welded tube frame under cloth, boxy and tapering hard toward the tail
    body.loft('x', FUS, FABRIC);
    // open cockpit with a raised coaming, cargo space behind the seat
    body.carve(-1.05, 0.2, -0.29, 0.6, 0.8, 0.29);
    body.carve(-1.7, 0.22, -0.2, -1.05, 0.8, 0.2);
    body.box(-1.06, 0.5, -0.33, 0.62, 0.6, -0.27, M.SEAT_LEATHER, { md: 0.09 });
    body.box(-1.06, 0.5, 0.27, 0.62, 0.6, 0.33, M.SEAT_LEATHER, { md: 0.09 });
    body.box(0.55, 0.5, -0.32, 0.65, 0.66, 0.32, M.SEAT_LEATHER, { md: 0.09 });
    // behind the cargo bay the fuselage is hollow, and the cloth has torn away in two bays so the tube frame shows through
    const BAYS = [[-2.58, -1.98], [-3.3, -2.78]];
    const torn = (x, y, z) => {
      if (Math.abs(z) < 0.04) return false;
      for (const [x0, x1] of BAYS) {
        if (x < x0 || x > x1) continue;
        const s = H.at(x), j = (hashUnit(hash2(Math.floor(x * 16), Math.floor(y * 16), z > 0 ? 5 : 9)) - 0.5) * 0.1;
        if (Math.abs(y - s.c1) < s.r1 * 0.56 + j && x > x0 + 0.03 + Math.abs(j) && x < x1 - 0.03 - Math.abs(j)) return true;
      }
      return false;
    };
    body.fn(-3.7, -0.5, -0.5, -1.85, 0.8, 0.5, (x, y, z) => (H.inner(x, y, z) ? -1 : 0), FINE);
    body.fn(-3.4, -0.5, -0.6, -1.9, 0.8, 0.6, (x, y, z) => (torn(x, y, z) ? -1 : 0), FINE);
    const pt = (x, su, sv, kk = 0.74) => { const s = H.at(x); return [x, s.c1 + su * s.r1 * kk, sv * s.r2 * kk]; };
    const XS = [-1.9, -2.65, -3.4];
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      let prev = pt(-1.9, su, sv);
      for (const x of [-2.65, -3.4, -3.7]) { const q = pt(x, su, sv); strut(body, prev, q, 0.05, FRAME, FINE); prev = q; }          // the four longerons
    }
    for (const x of XS) {
      for (const sv of [-1, 1]) strut(body, pt(x, -1, sv), pt(x, 1, sv), 0.045, FRAME, FINE);                                      // uprights
      for (const su of [-1, 1]) strut(body, pt(x, su, -1), pt(x, su, 1), 0.04, FRAME, FINE);                                       // cross tubes
    }
    for (let i = 0; i < XS.length - 1; i++) for (const sv of [-1, 1]) strut(body, pt(XS[i], i % 2 ? 1 : -1, sv), pt(XS[i + 1], i % 2 ? -1 : 1, sv), 0.035, M.WOOD_MID, FINE);   // diagonal braces, a broom handle each
    // patchwork over the whole fuselage skin
    body.paint(-4.6, -0.5, -0.6, 0.76, 0.8, 0.6, (x, y, z) => patch(x / 0.55 + 9, (y + 1) / 0.5 + Math.sign(z) * 3, 3), { md: 0.14 });
    decal(body, 'EARLS', { x: -0.62, y: -0.1, side: 1, px: 0.04, mat: M.AC_RED, z0: 0.25, z1: 0.6 });
    decal(body, 'EARLS', { x: -0.62, y: -0.1, side: -1, px: 0.04, mat: M.AC_RED, z0: 0.25, z1: 0.6 });
    // ------------------------------------------------------------------ engine: an air cooled flat four out of a small car, hung in the breeze with a tin hood over the top
    const EY = 0.05;
    body.paint(0.7, -0.5, -0.5, 0.76, 0.7, 0.5, () => FRAME);                                            // the firewall face
    body.box(0.85, EY - 0.2, -0.2, 1.52, EY + 0.2, 0.2, M.AC_GRAY_DARK, { md: 0.2 });                   // crankcase
    body.box(0.88, EY + 0.2, -0.17, 1.49, EY + 0.24, 0.17, M.AC_GRAY, { md: 0.12 });
    for (const s of [-1, 1]) for (const cx of [0.98, 1.4]) {
      const [b0, b1] = zr(s, 0.2, 0.42), [h0, h1] = zr(s, 0.42, 0.56), [v0, v1] = zr(s, 0.56, 0.6), [p0, p1] = zr(s, 0.47, 0.49);
      body.cyl('z', cx, EY, 0.1, 0.1, b0, b1, M.AC_GRAY, { md: 0.2 });                                  // the barrel
      for (let i = 0; i < 5; i++) { const [f0, f1] = zr(s, 0.23 + i * 0.037, 0.245 + i * 0.037); body.cyl('z', cx, EY, 0.125, 0.125, f0, f1, M.AC_GRAY_DARK, { md: 0.09 }); }   // cooling fins
      body.box(cx - 0.11, EY - 0.1, h0, cx + 0.11, EY + 0.12, h1, M.AC_GRAY, { md: 0.2 });              // the head
      body.box(cx - 0.09, EY - 0.02, v0, cx + 0.09, EY + 0.1, v1, M.STEEL_BRIGHT, { md: 0.12 });         // the chrome valve cover
      body.box(cx - 0.012, EY + 0.12, p0, cx + 0.012, EY + 0.2, p1, M.AC_WHITE, { md: 0.06 });           // spark plug
      strut(body, [cx, EY + 0.2, s * 0.48], [1.19, EY + 0.3, 0], 0.02, M.AC_BLACK, { md: 0.05 });         // plug wire to the distributor
      strut(body, [cx, EY - 0.1, s * 0.5], [cx, EY - 0.3, s * 0.62], 0.06, M.RUST, { md: 0.2 });          // header pipe
    }
    body.cyl('y', 1.19, 0, 0.05, 0.05, EY + 0.2, EY + 0.32, M.AC_BLACK, { md: 0.1 });                   // the distributor cap
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) strut(body, [0.8, EY + sy * 0.28, sz * 0.32], [0.95, EY + sy * 0.14, sz * 0.2], 0.05, FRAME, { md: 0.2 });   // the engine mount
    body.box(1.0, EY - 0.3, -0.16, 1.5, EY - 0.2, 0.16, M.RUST_DARK, { md: 0.2 });                       // oil pan
    body.cyl('x', EY, 0, 0.09, 0.09, 1.52, 1.62, M.STEEL, { md: 0.2 });                                  // crank pulley
    body.cyl('x', EY, 0, 0.04, 0.04, 1.5, 2.02, M.STEEL_BRIGHT, { md: 0.2 });                            // the prop shaft
    body.cyl('x', EY, 0, 0.055, 0.055, 1.98, 2.1, M.STEEL_BRIGHT, { md: 0.12 });                         // prop flange
    body.box(1.62, EY - 0.34, -0.14, 1.72, EY - 0.1, 0.14, M.AC_BLACK, { md: 0.12 });                    // oil cooler, a car heater core strapped under the engine
    for (const s of [-1, 1]) {
      const [t0, t1] = zr(s, 0.62, 0.66);
      strut(body, [0.98, EY - 0.3, s * 0.62], [-0.55, -0.26, s * 0.6], 0.09, M.RUST_DARK, { md: 0.2 });   // the long exhaust back past the cockpit
      strut(body, [1.4, EY - 0.3, s * 0.62], [0.98, EY - 0.3, s * 0.62], 0.075, M.RUST, { md: 0.2 });     // collector
      body.cyl('x', -0.26, s * 0.6, 0.1, 0.12, -0.64, -0.5, M.RUST_DARK, { md: 0.12 });                   // flared end
      strut(body, [0.3, -0.2, s * 0.42], [0.3, -0.27, s * 0.58], 0.04, FRAME, { md: 0.1 });               // pipe brackets
      strut(body, [-0.2, -0.2, s * 0.4], [-0.2, -0.26, s * 0.58], 0.04, FRAME, { md: 0.1 });
      body.box(0.2, -0.3, t0, 0.8, -0.24, t1, M.RUST, { md: 0.06, thin: true });
    }
    // the tin hood, a paint can for an air cleaner poking through a hole in it, a deer skull for an ornament
    body.box(0.78, 0.4, -0.3, 1.72, 0.44, 0.3, M.ROOF_TIN_RUST, { md: 0.2 });
    body.paint(0.78, 0.4, -0.3, 1.72, 0.44, 0.3, (x, y, z) => (Math.floor((z + 0.3) / 0.05) % 2 ? M.ROOF_TIN : 0), { md: 0.1 });
    body.cyl('y', 1.1, 0, 0.14, 0.14, 0.38, 0.46, 0, { md: 0.1 });
    body.cyl('y', 1.1, 0, 0.13, 0.13, 0.3, 0.5, M.AC_METAL, { md: 0.2 });
    body.cyl('y', 1.1, 0, 0.125, 0.125, 0.5, 0.53, M.AC_RED, { md: 0.1 });
    for (const s of [-1, 1]) strut(body, [0.8, 0.4, s * 0.27], [1.7, 0.4, s * 0.27], 0.04, FRAME, { md: 0.2 });
    body.ell(1.7, 0.5, 0, 0.07, 0.055, 0.045, M.AC_CREAM, { md: 0.1 });
    for (const s of [-1, 1]) {
      strut(body, [1.68, 0.53, s * 0.03], [1.66, 0.7, s * 0.12], 0.025, M.AC_CREAM, { md: 0.06 });
      strut(body, [1.66, 0.7, s * 0.12], [1.7, 0.82, s * 0.19], 0.025, M.AC_CREAM, { md: 0.06 });
      strut(body, [1.66, 0.7, s * 0.12], [1.55, 0.78, s * 0.2], 0.02, M.AC_CREAM, { md: 0.06 });
    }
    // ------------------------------------------------------------------ wing: strut braced, high mounted, thick lifting section, coat after coat of repairs
    for (const s of [-1, 1]) {
      const w = WNG(s), [za, zb] = zr(s, 0.05, 4.8), [ya, yb] = zr(s, 1.1, 1.5), [zc, zd] = zr(s, 1.25, 1.5);
      body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, FABRIC);
      body.paint(-1.2, 0.95, za, 0.4, 1.25, zb, (x, y, z) => patch(x / 0.62 + 4, Math.abs(z) / 0.85 + (s > 0 ? 40 : 0), 7), { thin: true });
      body.paint(-1.2, 0.95, za, 0.4, 1.25, zb, (x, y, z) => (Math.abs((Math.abs(z) % 0.42) - 0.21) < 0.012 && y > 1.1 ? M.STEEL_DARK : 0), { md: 0.05, thin: true });   // rib tape
      body.paint(-1.2, 0.95, Math.min(s * 1.1, s * 1.5), 0.4, 1.3, Math.max(s * 1.1, s * 1.5), (x, y, z) => (Math.abs(Math.abs(z) - 1.25 - x * 0.12) < 0.05 && y > 1.12 ? M.STEEL_BRIGHT : 0), { md: 0.09, thin: true });    // duct tape
      body.paint(0.28, 0.95, za, 0.4, 1.3, zb, () => M.ROOF_TIN, { md: 0.1, thin: true });          // a leading edge from roofing tin
      // wing tip and lift struts, cabane, bungee wraps
      body.box(0.2, 1.06, s * 4.75, 0.42, 1.2, s * 4.85, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.09 });
      strut(body, [0.05, -0.28, s * 0.3], [0.1, 1.06, s * 2.75], 0.07, M.STEEL);
      strut(body, [-0.65, -0.28, s * 0.3], [-0.6, 1.06, s * 2.75], 0.06, M.WOOD_MID, { md: 0.2 });
      strut(body, [0.075, 0.39, s * 1.5], [-0.62, 0.39, s * 1.5], 0.04, FRAME, { md: 0.1 });            // a cross piece between the lift struts
      for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.22; body.cyl('y', 0.05 + t * 0.05, s * (0.3 + 2.45 * t), 0.055, 0.055, -0.28 + 1.34 * t - 0.02, -0.28 + 1.34 * t + 0.02, M.AC_YELLOW, { md: 0.09 }); }   // tape on the strut
      strut(body, [0.32, 0.55, s * 0.24], [0.2, 1.05, s * 0.42], 0.06, FRAME, { md: 0.2 });
      strut(body, [-0.5, 0.5, s * 0.24], [-0.4, 1.05, s * 0.42], 0.06, FRAME, { md: 0.2 });
      strut(body, [0.2, 1.05, s * 4.2], [0.1, 1.06, s * 2.75], 0.015, M.STEEL, { md: 0.05 });           // a flying wire out to the tip
      body.cyl('y', 0.13, s * 1.0, 0.08, 0.08, 0.35 + 0.03, 0.35 + 0.05, M.AC_BLACK, { md: 0.06 });
    }
    // a steel drum for a fuel tank, bolted on top of the wing center, a hose down to the carburetor
    body.cyl('z', -0.3, 1.43, 0.2, 0.2, -0.32, 0.32, M.CONTAINER_RED, { md: 0.2 });
    for (const z of [-0.2, 0, 0.2]) body.cyl('z', -0.3, 1.43, 0.215, 0.215, z - 0.012, z + 0.012, M.RUST, { md: 0.09 });
    body.cyl('y', -0.3, 0.12, 0.045, 0.045, 1.62, 1.66, M.STEEL_BRIGHT, { md: 0.1 });
    for (const s of [-1, 1]) body.box(-0.5, 1.19, s * 0.22 - 0.05, -0.1, 1.24, s * 0.22 + 0.05, M.WOOD_MID, { md: 0.1 });
    strut(body, [-0.3, 1.25, 0.1], [0.35, 0.8, 0.14], 0.03, M.AC_BLACK, { md: 0.07 });
    strut(body, [0.35, 0.8, 0.14], [1.1, 0.38, 0.1], 0.03, M.AC_BLACK, { md: 0.07 });
    // a stop sign for a patch, a car mirror on the left strut, a jerry can lashed to the right one
    body.paint(-0.6, 1.1, -2.6, -0.1, 1.3, -1.4, (x, y, z) => (y > 1.17 ? M.AC_RED : 0), { md: 0.1, thin: true });
    decalTop(body, 'STOP', { x: -0.35, z: -2.0, y0: 1.12, y1: 1.3, px: 0.04, mat: M.AC_WHITE });
    body.box(0.2, 0.4, -0.7, 0.3, 0.55, -0.62, M.STEEL_BRIGHT, { md: 0.09 });
    strut(body, [0.25, 0.4, -0.66], [0.07, 0.4, -0.45], 0.02, FRAME, { md: 0.06 });
    body.box(0.0, 0.0, 1.1, 0.3, 0.38, 1.22, M.AC_RED, { md: 0.12 });
    body.paint(0.0, 0.0, 1.1, 0.3, 0.38, 1.22, (x, y) => (Math.abs(y - 0.19) < 0.02 || Math.abs(x - 0.15) < 0.015 ? M.AC_BLACK : 0), { md: 0.07, thin: true });
    // ------------------------------------------------------------------ tail group: strut braced tailplane and a tall square fin
    for (const s of [-1, 1]) {
      const w = STB(s);
      body.wing(w.root, w.span, w.cr, w.ct, w.sweep, w.dih, w.tr, w.tt, s, FABRIC);
      strut(body, [-3.8, 0.0, s * 0.08], [-3.75, 0.4, s * 1.15], 0.045, M.WOOD_MID, { md: 0.2 });
      strut(body, [-4.1, 1.28, 0], [-3.9, 0.42, s * 1.45], 0.015, M.STEEL, { md: 0.05 });
    }
    body.loft('y', finStations(FIN), FABRIC, { thin: true });
    // the fin is cloth on a steel tube outline: the tube shows as a dark edge, the hinge as a seam
    const HX = (y) => { const a = finAt(FIN, y); return a.te + a.chord * 0.3; };
    const ft = (x, y) => { const a = finAt(FIN, y); return (x > a.le - 0.05 && x < a.le + 0.03) || x < a.te + 0.035 || y > FIN.y + FIN.height - 0.04 || Math.abs(x - HX(y)) < 0.012 ? FRAME : 0; };
    body.paint(-5, 0.5, -0.2, -3.8, 1.4, 0.2, ft, { thin: true });
    body.paint(-5, 0.5, -0.2, -4.4, 1.4, 0.2, (x, y, z) => (y > 0.6 && y < 1.2 && Math.abs(z) < 0.12 && ((Math.floor((x + 4) * 5) + Math.floor(y * 5)) & 1) ? M.PAINT_ORANGE : 0), { md: 0.08, thin: true });
    decal(body, 'B1', { x: -4.18, y: 0.62, side: 1, px: 0.045, mat: M.AC_BLACK, z0: 0.02, z1: 0.3 });
    decal(body, 'B1', { x: -4.18, y: 0.62, side: -1, px: 0.045, mat: M.AC_BLACK, z0: 0.02, z1: 0.3 });
    // license plate, hood ornament mount, antenna coat hanger
    body.box(-4.42, 0.55, -0.09, -4.36, 0.7, 0.09, M.AC_CREAM, { md: 0.09 });
    body.box(-4.425, 0.6, -0.06, -4.4, 0.65, 0.06, M.AC_BLACK, { md: 0.03 });
    strut(body, [-0.9, 0.95, 0.4], [-0.9, 1.35, 0.55], 0.014, M.STEEL, { md: 0.03 });
    // a fishing rod sticking out of the cargo bay, bobber and all
    strut(body, [-1.45, 0.2, 0.12], [-3.3, 0.95, 0.3], 0.03, M.WOOD_LIGHT, { md: 0.07 });
    strut(body, [-3.3, 0.95, 0.3], [-3.3, 0.55, 0.3], 0.01, M.AC_BLACK, { md: 0.05 });
    body.ell(-3.3, 0.5, 0.3, 0.035, 0.045, 0.035, M.AC_RED, { md: 0.07 });
    // main gear: sprung struts, axle and rubber cord wraps
    for (const s of [-1, 1]) {
      strut(body, [0.5, -0.32, s * 0.2], [0.42, -1.0, s * 0.8], 0.08, M.STEEL);
      strut(body, [0.05, -0.34, s * 0.2], [0.4, -1.0, s * 0.78], 0.06, M.STEEL, { md: 0.2 });
      for (let i = 0; i < 6; i++) { const t = 0.16 + i * 0.13; body.cyl('y', 0.5 - 0.08 * t, s * (0.2 + 0.6 * t), 0.065, 0.065, -0.32 - 0.68 * t - 0.025, -0.32 - 0.68 * t + 0.025, M.AC_BLACK, { md: 0.09 }); }
    }
    strut(body, [0.42, -1.0, -0.8], [0.42, -1.0, 0.8], 0.06, FRAME, { md: 0.2 });
    // tail spring
    strut(body, [-4.3, 0.05, 0], [-4.5, -0.42, 0], 0.05, M.STEEL, { md: 0.2 });
    strut(body, [-4.38, -0.02, 0], [-4.46, -0.3, 0], 0.04, M.STEEL, { md: 0.06 });

    // ------------------------------------------------------------------ control surfaces, cut out of the airframe so the gaps are real
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      const W = WNG(s), sp = { z0: 0.5, z1: 2.8, frac: 0.33 }, ap = { z0: 2.8, z1: 4.78, frac: 0.3 };
      const fl = wingSurface(k, body, 'flap' + n, W, { ...sp, mat: FABRIC });
      const al = wingSurface(k, body, 'aileron' + n, W, { ...ap, mat: FABRIC });
      const [fa, fb] = zr(s, 0.5, 2.8), [aa, ab] = zr(s, 2.8, 4.8);
      fl.paint(-1.2, 0.95, fa, 0.2, 1.25, fb, (x, y, z) => patch(x / 0.3 + 6, Math.abs(z) / 0.6 + 50, 13), { thin: true });
      al.paint(-1.2, 0.95, aa, 0.2, 1.25, ab, (x, y, z) => patch(x / 0.3 + 2, Math.abs(z) / 0.6 + 30, 11), { thin: true });
      for (const [r, spec] of [[body, sp], [fl, sp], [body, ap], [al, ap]]) surfaceSeams(r, W, { ...spec, mat: FRAME });
      const stab = STB(s);
      const el = wingSurface(k, body, 'elevator' + n, stab, { z0: 0.1, z1: 1.55, frac: 0.45, mat: FABRIC });
      for (const r of [body, el]) surfaceSeams(r, stab, { z0: 0.1, z1: 1.55, frac: 0.45, mat: FRAME });
    }
    const hinge = finAt(FIN, 0.9);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: FABRIC, box: [-5.1, 0.34, -0.2, -3.7, 1.45, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.3 && y > FIN.y + 0.04; },
      pivot: [hinge.te + hinge.chord * 0.3, 0.9, 0],
    });
    rd.paint(-5.1, 0.2, -0.2, -4.3, 1.5, 0.2, (x, y) => (y > 0.7 && y < 1.1 ? M.AC_RED : 0), { thin: true });
    rd.paint(-5.1, 0.5, -0.2, -3.9, 1.4, 0.2, ft, { thin: true });
    // propeller: a wooden two-blade with tape on the tips, a chrome hubcap for a spinner
    const pp = k.part('propeller', { pivot: [2.1, 0.05, 0], local: true, voxel: 0.03125 });
    prop(pp, 0.875, 2, { chord: 0.15, mat: M.WOOD_MID, tip: M.AC_YELLOW, hub: M.STEEL_DARK, hubR: 0.1, twist: 0.3, tipLen: 0.14 });
    pp.cyl('x', 0, 0, 0.085, 0.045, 0.08, 0.14, M.STEEL_BRIGHT, { md: 0.1 });
    // wheels: tundra tires with a tread, hubs with lug nuts
    for (const s of [-1, 1]) {
      const w = k.part(s < 0 ? 'wheelL' : 'wheelR', { pivot: [0.42, -1.0, s * 0.85], local: true });
      wheel(w, 0, 0, 0, 0.33, 0.2);
      w.paint(-0.34, -0.34, -0.11, 0.34, 0.34, 0.11, (x, y) => (Math.hypot(x, y) > 0.28 && Math.floor((Math.atan2(y, x) + Math.PI) / (Math.PI / 12)) % 2 ? M.AC_GRAY_DARK : 0), { md: 0.1 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; w.box(Math.cos(a) * 0.09 - 0.012, Math.sin(a) * 0.09 - 0.012, s * 0.1 - 0.012, Math.cos(a) * 0.09 + 0.012, Math.sin(a) * 0.09 + 0.012, s * 0.1 + 0.012, M.STEEL_BRIGHT, { md: 0.06 }); }
    }
    const tw = k.part('tailwheel', { pivot: [-4.5, -0.52, 0], local: true });
    wheel(tw, 0, 0, 0, 0.1, 0.07);
    strut(tw, [0, 0, 0], [0.05, 0.28, 0], 0.03, M.STEEL, { md: 0.03 });
    // windscreen: a small tinted plate with a cross of duct tape, hidden from the cockpit so the pilot sees over it
    const gl = k.part('glass', { hideInCockpit: true });
    gl.box(0.66, 0.6, -0.27, 0.7, 0.95, 0.27, M.AC_CANOPY, { thin: true });
    gl.box(0.7, 0.6, -0.27, 0.9, 0.8, -0.24, M.AC_CANOPY, { thin: true });
    gl.box(0.7, 0.6, 0.24, 0.9, 0.8, 0.27, M.AC_CANOPY, { thin: true });
    gl.paint(0.64, 0.6, -0.28, 0.72, 0.96, 0.28, (x, y, z) => (Math.abs(z) < 0.02 || Math.abs(y - 0.8) < 0.018 ? M.STEEL_BRIGHT : 0), { md: 0.1, thin: true });
    // the pilot in overalls and a straw hat, and a hound riding in the cargo bay in goggles
    const pl = k.part('pilotFigure', { hideInCockpit: true, voxel: 0.025 });
    sitter(pl, -0.28, -0.18, 0, { hands: [[0.2, 0.2, -0.26], [0.15, 0.15, 0]], floor: -0.4, feetX: 0.3, shirt: M.AC_RED, pants: M.TARP_BLUE, cap: M.HAY, hair: M.RUST_DARK, headset: false, shades: true });
    pl.cyl('y', -0.26, 0, 0.22, 0.22, 0.688, 0.708, M.HAY, { md: 0.1 });
    const dog = k.part('dog', { voxel: 0.025 });
    dog.ell(-1.52, -0.12, 0, 0.17, 0.17, 0.11, M.AC_CREAM);
    dog.ell(-1.36, 0.0, 0, 0.24, 0.17, 0.115, M.AC_CREAM);
    dog.ell(-1.2, 0.1, 0, 0.14, 0.24, 0.11, M.AC_CREAM);
    dog.paint(-1.7, -0.4, -0.15, -1.0, 0.4, 0.15, (x, y, z) => (Math.hypot(x + 1.38, y - 0.06) < 0.11 && z > 0 ? M.RUST : Math.abs(y - 0.3) < 0.022 && x > -1.3 && x < -1.1 ? M.AC_RED : 0), { thin: true });
    for (const s of [-1, 1]) {
      strut(dog, [-1.2, 0.0, s * 0.06], [-1.18, -0.34, s * 0.07], 0.07, M.AC_CREAM);
      dog.box(-1.14, -0.37, s * 0.07 - 0.04, -1.04, -0.33, s * 0.07 + 0.04, M.AC_CREAM);
      strut(dog, [-1.5, -0.2, s * 0.09], [-1.4, -0.34, s * 0.1], 0.08, M.AC_CREAM);
      dog.ell(-1.13, 0.5, s * 0.1, 0.045, 0.09, 0.022, M.SEAT_LEATHER);
      dog.ell(-1.02, 0.545, s * 0.045, 0.032, 0.032, 0.025, M.AC_CANOPY);
    }
    strut(dog, [-1.2, 0.25, 0], [-1.14, 0.43, 0], 0.13, M.AC_CREAM);
    dog.ell(-1.1, 0.5, 0, 0.12, 0.1, 0.085, M.AC_CREAM);
    dog.ell(-0.98, 0.45, 0, 0.1, 0.055, 0.05, M.AC_CREAM);
    dog.ell(-0.89, 0.46, 0, 0.025, 0.025, 0.03, M.AC_BLACK);
    strut(dog, [-1.11, 0.545, -0.09], [-1.11, 0.545, 0.09], 0.02, M.AC_BLACK, { md: 0.06 });
    strut(dog, [-1.64, -0.16, 0], [-1.74, -0.04, 0], 0.05, M.AC_CREAM);
    // a potato cannon of gray PVC along the right side of the cowl, and under each wing a milk crate of bottle rockets
    const sp = k.part('spudGun');
    sp.cyl('x', 0.45, 0.32, 0.055, 0.055, 0.1, 2.12, M.AC_WHITE, { thin: true });
    for (const x of [0.5, 1.0, 1.5]) sp.cyl('x', 0.45, 0.32, 0.062, 0.062, x, x + 0.05, M.AC_GRAY_LIGHT, { thin: true, md: 0.1 });
    sp.cyl('x', 0.45, 0.32, 0.075, 0.075, 0.08, 0.2, M.AC_GRAY_DARK, { thin: true, md: 0.1 });
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const crate = k.part('crate' + n, { visibleWhen: 'store_bt' + n, voxel: 0.03125 });
      crate.box(0.1, 0.72, s * 2.2 - 0.24, 0.9, 0.76, s * 2.2 + 0.24, M.CONTAINER_RED);
      for (const zz of [-0.24, 0.24]) crate.box(0.1, 0.72, s * 2.2 + zz - 0.02, 0.9, 0.98, s * 2.2 + zz + 0.02, M.CONTAINER_RED);
      for (const xx of [0.1, 0.9]) crate.box(xx - 0.02, 0.72, s * 2.2 - 0.24, xx + 0.02, 0.98, s * 2.2 + 0.24, M.CONTAINER_RED);
      const bt = munitionRecipe('bottle');
      for (let i = 0; i < 6; i++) crate.stamp(bt, 0.5, 0.8 + (i >= 3 ? 0.11 : 0), s * 2.2 - 0.14 + (i % 3) * 0.14, 0);
      strut(body, [0.5, 1.06, s * 2.2], [0.5, 0.95, s * 2.2], 0.02, M.AC_BLACK, { md: 0.08 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ cockpit (2.5 cm voxels)
    const c = k.interior('cabin');
    c.box(-1.7, -0.48, -0.26, 0.6, -0.4, 0.26, M.WOOD_DARK);                           // floorboards
    c.box(-0.5, -0.4, -0.26, 0.05, -0.18, 0.26, M.SEAT_FABRIC);                          // seat cushion
    c.box(-0.6, -0.18, -0.24, -0.5, 0.5, 0.24, M.SEAT_FABRIC);                           // seat back
    c.box(-0.62, 0.5, -0.12, -0.5, 0.62, 0.12, M.SEAT_LEATHER, { md: 0.05 });             // headrest
    for (const s of [-1, 1]) {
      c.box(-0.6, -0.4, s * 0.27 - 0.02, 0.05, 0.5, s * 0.27 + 0.02, M.STEEL_DARK, { md: 0.1 });      // tube frame
      c.box(-0.45, 0.15, s * 0.24, -0.1, 0.19, s * 0.34, M.SEAT_FABRIC, { md: 0.07 });                  // seat belt
      c.box(-1.7, -0.42, s * 0.24, -1.0, 0.3, s * 0.27, M.WOOD_MID, { md: 0.1 });                       // cargo side board
    }
    c.box(0.55, -0.45, -0.28, 0.7, 0.62, 0.28, M.STEEL_DARK);                            // firewall
    c.box(-1.7, -0.42, -0.2, -1.0, -0.36, 0.2, M.WOOD_LIGHT);                            // cargo floor

    // plywood instrument board with a few mismatched gauges (8 mm voxels)
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(0.55, 0.16, -0.3, 0.62, 0.63, 0.3, M.WOOD_MID);
    pn.box(0.5, 0.63, -0.32, 0.72, 0.68, 0.32, M.WOOD_DARK);
    gauge(pn, 0.55, 0.5, -0.16, 0.055); gauge(pn, 0.55, 0.5, 0.0, 0.055); gauge(pn, 0.55, 0.5, 0.16, 0.055, M.GAUGE_FACE);
    gauge(pn, 0.55, 0.33, -0.08, 0.04); gauge(pn, 0.55, 0.33, 0.1, 0.04);
    pn.box(0.5, 0.26, -0.22, 0.55, 0.3, -0.16, M.SWITCH_RED, { md: 0.03 });
    pn.box(0.5, 0.26, 0.2, 0.55, 0.3, 0.26, M.SWITCH_GRAY, { md: 0.03 });
    pn.cyl('x', 0.22, 0.26, 0.02, 0.02, 0.47, 0.55, M.STEEL_BRIGHT, { md: 0.03 });             // ignition, a bottle cap
    pn.box(0.5, 0.57, -0.03, 0.55, 0.6, 0.03, M.STEEL, { md: 0.03 });                             // compass

    // ------------------------------------------------------------------ animated controls
    const st = k.interior('stick', { pivot: [0.15, -0.42, 0], local: true, voxel: 0.0125 });
    st.cyl('y', 0, 0, 0.018, 0.018, 0, 0.55, M.STEEL);
    st.cyl('y', 0, 0, 0.03, 0.03, 0.5, 0.62, M.AC_BLACK, { md: 0.02 });
    const th = k.interior('throttleLever', { pivot: [0.2, -0.05, -0.27], local: true, voxel: 0.0125 });
    th.cyl('y', 0, 0, 0.012, 0.012, 0, 0.24, M.STEEL);
    th.cyl('y', 0, 0, 0.03, 0.03, 0.22, 0.3, M.AC_RED, { md: 0.02 });
    for (const [n, z] of [['pedalL', -0.14], ['pedalR', 0.14]]) {
      const p = k.interior(n, { pivot: [0.45, -0.34, z], local: true, voxel: 0.0125 });
      p.box(-0.02, -0.06, -0.07, 0.02, 0.12, 0.07, M.STEEL_DARK);
    }
    needle(k.interior('nASI', { pivot: [0.516, 0.5, -0.16], local: true, voxel: 0.004 }), 0.045, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [0.516, 0.5, 0.0], local: true, voxel: 0.004 }), 0.045, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [0.516, 0.5, 0.16], local: true, voxel: 0.004 }), 0.045, M.NEEDLE_ORANGE);
  },
});
