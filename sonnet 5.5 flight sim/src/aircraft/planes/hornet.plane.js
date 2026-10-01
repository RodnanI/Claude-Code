import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, rivets, navLights, pilot, prop, spinner } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Hornet S-2: a short, stubby aerobatic biplane. Symmetrical wings, ailerons on all four panels, a big engine for 700 kilograms and
   a fat rudder; it rolls faster than you can say it and flies just as well upside down. Painted in a sunburst so you can see where
   the wings are from a long way off. Body origin at the center of gravity, +x forward. */

const YEL = M.AC_YELLOW, RED = M.AC_RED, BLK = M.AC_BLACK, WHT = M.AC_WHITE, STEEL = M.STEEL_DARK;

const UW = (s) => wingDef([0.95, 1.0, s * 0.35], 2.75, 1.25, 1.2, 0.04, 0.05, 0.12, 0.1, s);          // upper wing, tip at 3.1
const LW = (s) => wingDef([0.55, -0.28, s * 0.3], 2.5, 1.15, 1.1, 0.04, 0.12, 0.12, 0.1, s);          // lower wing, tip at 2.8
const ST = (s) => wingDef([-2.5, 0.2, s * 0.1], 1.25, 0.95, 0.6, 0.15, 0, 0.07, 0.06, s);
const FIN = { x: -2.4, y: 0.25, chord: 1.0, tip: 0.6, height: 1.05, sweep: 0.35, thick: 0.05 };

/** Wedges radiating from a point behind the wings: yellow, red and black, wider the further out you go. */
const burst = (x, y, z) => {
  const a = Math.atan2(Math.abs(z) + 0.05, x + 1.6), i = Math.floor(a / 0.15);
  return i % 3 === 0 ? YEL : i % 3 === 1 ? RED : BLK;
};

export default defineAircraft({
  id: 'hornet',
  name: 'Hornet S-2',
  manufacturer: 'Vesper Aerobatics',
  role: 'Aerobatic biplane',
  category: 'private',
  order: 10,
  difficulty: 4,
  tags: ['Biplane', 'Aerobatic', 'Inverted flight', 'Tailwheel'],
  description: 'A big engine in a small airplane with four ailerons and wings that do not care which way is up. The Hornet rolls like a thrown wrench, stalls without warning and punishes sloppy feet. It is also the most fun you can have with a throttle.',
  voxel: 0.04,
  interiorVoxel: 0.02,
  lodLevels: 4,
  mass: { empty: 540, fuel: 80, payload: 100 },
  inertia: [330, 640, 480],
  wing: { area: 11.6, span: 6.2, chord: 1.25, y: 0.35 },
  aero: {
    CL0: 0.06, CLa: 4.4, CLmax: 1.5, alphaStall: 0.31, CD0: 0.045, k: 0.085, CDflap: 0, CLflap: 0, Cmflap: 0, CLmaxFlap: 0, CDgear: 0.02, CDair: 0.07,
    Cm0: 0.0, Cma: -0.75, Cmq: -9, Clb: 0.06, Clp: -0.32, Cnb: 0.09, Cnr: -0.11, Cyb: 0.3, Cnda: 0.02, spin: 0.18, stallPitchDown: 0.08,
    control: { elevator: 0.7, aileron: 0.125, rudder: 0.055 },
  },
  propulsion: { type: 'prop', power: 194000, efficiency: 0.82, propDiameter: 1.9, maxRpm: 2700, idleRpm: 700, fuelBurn: 0.012, staticFactor: 0.65, spin: 0.18 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [0.8, -0.72, -0.62], radius: 0.28, k: 36000, c: 2800, brake: true, travel: 0.2 },
      { pos: [0.8, -0.72, 0.62], radius: 0.28, k: 36000, c: 2800, brake: true, travel: 0.2 },
      { pos: [-2.75, -0.38, 0], radius: 0.09, k: 12000, c: 900, steer: -0.6, castor: 0.4, cornering: 0.5, travel: 0.1 },
    ],
  },
  skids: [
    { p: [3.0, 0, 0], kind: 'nose' }, { p: [-3.1, 0.25, 0], kind: 'tail' }, { p: [0.4, 1.05, 3.1], kind: 'tip' }, { p: [0.4, 1.05, -3.1], kind: 'tip' },
    { p: [0.1, -0.2, 2.8], kind: 'tip' }, { p: [0.1, -0.2, -2.8], kind: 'tip' }, { p: [0.4, -0.55, 0], kind: 'belly' }, { p: [-2.7, 1.3, 0], kind: 'tail' },
  ],
  limits: { vne: 95, maxG: 8, minG: 5, flapSpeed: 999, gearSpeed: 999, crashVs: 6 },
  cameras: { cockpit: [0.55, 0.86, 0], chase: { distance: 13, height: 3.2 }, near: { distance: 6.4, height: 1.6 } },
  liveries: [
    { id: 'default', name: 'Sunburst' },
    { id: 'tricolor', name: 'Stars and bars', remap: { AC_YELLOW: 'AC_WHITE', AC_BLACK: 'GLASS_BLUE' } },
    { id: 'night', name: 'Night mission', remap: { AC_YELLOW: 'AC_ORANGE', AC_RED: 'AC_BLACK', AC_BLACK: 'AC_GRAY_DARK' } },
    { id: 'pearl', name: 'Pearl', remap: { AC_YELLOW: 'AC_WHITE', AC_RED: 'AC_ORANGE', AC_BLACK: 'AC_GRAY_DARK' } },
  ],
  animations: [
    { part: 'aileronUL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronUR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'aileronLL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronLR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
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
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.45 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0155, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.00115, offset: -2.3 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ fuselage: a deep oval behind the engine, a slim tail
    body.loft('x', [
      { a: -3.1, c1: 0.24, c2: 0, r1: 0.05, r2: 0.04, n: 2 },
      { a: -2.6, c1: 0.2, c2: 0, r1: 0.12, r2: 0.09, n: 2.2 },
      { a: -1.4, c1: 0.12, c2: 0, r1: 0.34, r2: 0.25, n: 2.3 },
      { a: 0.0, c1: 0.06, c2: 0, r1: 0.5, r2: 0.4, n: 2.3 },
      { a: 1.2, c1: 0.0, c2: 0, r1: 0.52, r2: 0.45, n: 2.3 },
      { a: 1.75, c1: 0.0, c2: 0, r1: 0.54, r2: 0.52, n: 2.1 },
    ], YEL);
    // cowl: blunt and round, black, with a bright lip and cooling slots
    body.loft('x', [
      { a: 1.7, c1: 0.0, c2: 0, r1: 0.54, r2: 0.52, n: 2.1 },
      { a: 2.15, c1: 0.0, c2: 0, r1: 0.55, r2: 0.55, n: 2 },
      { a: 2.52, c1: 0.0, c2: 0, r1: 0.5, r2: 0.5, n: 2 },
    ], BLK);
    body.cyl('x', 0, 0, 0.5, 0.5, 2.48, 2.56, M.AC_METAL);
    body.cyl('x', 0, 0, 0.36, 0.36, 2.5, 2.6, BLK);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; body.box(2.0, Math.sin(a) * 0.55 - 0.02, Math.cos(a) * 0.55 - 0.045, 2.34, Math.sin(a) * 0.55 + 0.02, Math.cos(a) * 0.55 + 0.045, M.AC_GRAY_DARK, { md: 0.06 }); }
    // the top deck behind the cockpit and a headrest fairing
    body.loft('x', [
      { a: -2.2, c1: 0.2, c2: 0, r1: 0.1, r2: 0.12, n: 2 },
      { a: -1.2, c1: 0.5, c2: 0, r1: 0.1, r2: 0.2, n: 2.2 },
      { a: -0.8, c1: 0.55, c2: 0, r1: 0.12, r2: 0.22, n: 2.2 },
    ], RED);
    // ------------------------------------------------------------------ wings, tail surfaces, fin
    for (const s of [-1, 1]) {
      for (const W of [UW(s), LW(s)]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, YEL);
      const st = ST(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, YEL);
    }
    body.loft('y', finStations(FIN), YEL, { thin: true });
    // ------------------------------------------------------------------ struts and wires: an N each side, cabane struts, flying wires
    for (const s of [-1, 1]) {
      strut(body, [0.28, -0.2, s * 1.5], [0.7, 0.92, s * 1.5], 0.07, M.AC_GRAY_DARK, { md: 0.2 });
      strut(body, [-0.28, -0.2, s * 1.5], [0.12, 0.92, s * 1.5], 0.07, M.AC_GRAY_DARK, { md: 0.2 });
      strut(body, [0.7, 0.92, s * 1.5], [0.12, -0.2, s * 1.5], 0.025, STEEL, { md: 0.1 });                  // the diagonal in the N
      strut(body, [0.8, 0.5, s * 0.22], [0.9, 0.93, s * 0.5], 0.06, M.AC_GRAY_DARK, { md: 0.2 });         // cabane struts
      strut(body, [-0.05, 0.54, s * 0.22], [0.05, 0.93, s * 0.5], 0.06, M.AC_GRAY_DARK, { md: 0.2 });
      strut(body, [0.5, 0.9, s * 0.5], [0.3, -0.2, s * 1.5], 0.016, STEEL, { md: 0.06 });                   // flying and landing wires
      strut(body, [0.4, 0.92, s * 1.5], [0.45, -0.15, s * 0.32], 0.016, STEEL, { md: 0.06 });
      strut(body, [0.9, 0.93, s * 2.6], [0.7, -0.2, s * 2.55], 0.016, STEEL, { md: 0.06 });
      strut(body, [0.4, 0.92, s * 2.6], [0.4, -0.2, s * 1.5], 0.016, STEEL, { md: 0.06 });
      strut(body, [-1.5, 0.3, s * 0.14], [-2.45, 0.3, s * 1.1], 0.016, STEEL, { md: 0.06 });                // tail bracing
    }
    // ------------------------------------------------------------------ the open cockpit: a well in the deck, a combing, a roll hoop behind
    body.carve(-0.95, 0.12, -0.31, 1.2, 1.0, 0.31, { md: 0.07 });
    body.paint(-0.95, 0.12, -0.36, 1.2, 0.52, 0.36, (x, y, z) => (Math.abs(z) < 0.35 && y < 0.5 ? M.SEAT_FABRIC : 0), { md: 0.07, thin: true });
    body.box(-1.0, 0.5, -0.4, 1.0, 0.56, -0.31, M.AC_GRAY_DARK, { md: 0.1 });                                 // the combing, padded
    body.box(-1.0, 0.5, 0.31, 1.0, 0.56, 0.4, M.AC_GRAY_DARK, { md: 0.1 });
    body.box(1.0, 0.78, -0.4, 1.32, 0.85, 0.4, M.AC_GRAY_DARK, { md: 0.1 });                                     // the glare shield
    body.box(-0.95, 0.12, -0.31, 1.2, 0.17, 0.31, M.WOOD_DARK, { md: 0.07 });                                  // the cockpit floor
    // ------------------------------------------------------------------ livery: sunburst wings, a red belly, black stripes on the tail
    for (const W of [UW, LW]) {
      for (const s of [-1, 1]) {
        const w = W(s), z0 = Math.min(w.root[2], w.root[2] + s * w.span), z1 = Math.max(w.root[2], w.root[2] + s * w.span);
        body.paint(w.root[0] - 1.5, w.root[1] - 0.3, z0, w.root[0] + 0.1, w.root[1] + 0.5, z1, (x, y, z) => burst(x, y, z), { thin: true, md: 0.3 });
      }
    }
    body.paint(-3.2, -0.6, -0.6, 1.2, -0.02, 0.6, (x, y) => (y < -0.14 ? RED : y < -0.08 ? BLK : 0), { md: 0.3, thin: true });
    body.paint(-3.2, 0.0, -0.4, -1.8, 0.8, 0.4, (x, y, z) => (Math.abs((y - 0.15) + (x + 2.6) * 0.5) < 0.08 ? BLK : Math.abs((y - 0.15) + (x + 2.6) * 0.5 - 0.2) < 0.06 ? RED : 0), { md: 0.2, thin: true });
    body.paint(-3.0, 0.2, -0.1, -1.8, 1.4, 0.1, (x, y) => (y > 0.7 ? (Math.floor((y - 0.7) / 0.14) % 2 ? BLK : RED) : 0), { md: 0.2, thin: true });
    decal(body, 'HORNET', { x: -1.0, y: 0.0, side: 1, px: 0.04, mat: BLK, z0: 0.05, z1: 0.5 });
    decal(body, 'HORNET', { x: -1.0, y: 0.0, side: -1, px: 0.04, mat: BLK, z0: 0.05, z1: 0.5 });
    decal(body, 'N2S', { x: -2.2, y: 0.28, side: 1, px: 0.04, mat: WHT, z0: 0.02, z1: 0.3 });
    decal(body, 'N2S', { x: -2.2, y: 0.28, side: -1, px: 0.04, mat: WHT, z0: 0.02, z1: 0.3 });
    rivets(body, [-1.4, -0.3, -0.4, 1.1, 0.5, 0.4], 0.16, 0.16, { mat: M.AC_GRAY, ymin: -0.2, ymax: 0.2 });
    navLights(body, { left: [0.4, -0.2, -2.8], right: [0.4, -0.2, 2.8], tail: [-3.1, 0.3, 0], size: 0.06 });
    // exhaust stacks, a pitot on the lower wing, a small mirror
    for (const s of [-1, 1]) {
      strut(body, [1.9, -0.45, s * 0.22], [1.5, -0.55, s * 0.3], 0.1, M.AC_EXHAUST, { md: 0.12 });
      strut(body, [1.5, -0.55, s * 0.3], [1.15, -0.57, s * 0.34], 0.09, M.STEEL_BRIGHT, { md: 0.12 });
    }
    strut(body, [0.8, -0.3, 1.4], [1.5, -0.3, 1.4], 0.03, M.AC_METAL, { md: 0.1 });

    // ------------------------------------------------------------------ control surfaces, cut from the airframe: four ailerons, two elevators, a big rudder
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      for (const [W, tag] of [[UW(s), 'U'], [LW(s), 'L']]) {
        const part = wingSurface(k, body, 'aileron' + tag + n, W, { z0: 1.55, z1: Math.abs(W.root[2] + s * W.span) - 0.02, frac: 0.3, mat: YEL });
        part.paint(-2, -1, -4, 2, 2, 4, (x, y, z) => burst(x, y, z), { thin: true });
      }
      const el = wingSurface(k, body, 'elevator' + n, ST(s), { z0: 0.2, z1: 1.3, frac: 0.42, mat: YEL });
      el.paint(-4, -1, -2, 0, 1, 2, () => RED, { thin: true });
    }
    const hinge = finAt(FIN, 0.7);
    const rd = loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: YEL, box: [-3.4, 0.2, -0.2, -1.5, 1.4, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.5; },
      pivot: [hinge.te + hinge.chord * 0.5, 0.7, 0],
    });
    rd.paint(-3.4, 0.2, -0.2, -1.5, 1.4, 0.2, (x, y) => (y > 0.7 ? (Math.floor((y - 0.7) / 0.14) % 2 ? BLK : RED) : RED), { thin: true });

    // ------------------------------------------------------------------ fixed gear: spring legs, wheel pants, a tail spring
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n);
      strut(g, [0.75, -0.3, s * 0.15], [0.8, -0.72, s * 0.62], 0.1, M.AC_GRAY_DARK);
      strut(g, [0.45, -0.3, s * 0.3], [0.8, -0.72, s * 0.62], 0.05, STEEL, { md: 0.1 });
      g.ell(0.8, -0.72, s * 0.62 + s * 0.03, 0.46, 0.34, 0.1, YEL, { md: 0.1 });                               // pant
      g.ell(0.8, -0.72, s * 0.62 + s * 0.03, 0.4, 0.28, 0.095, 0, { md: 0.1 });
      wheel(k.part('wheel' + n, { pivot: [0.8, -0.72, s * 0.62], local: true }), 0, 0, 0, 0.28, 0.14);
    }
    const tw = k.part('tailwheel', { pivot: [-2.75, -0.38, 0], local: true });
    wheel(tw, 0, 0, 0, 0.09, 0.06);
    strut(tw, [0, 0, 0], [0.05, 0.44, 0], 0.035, M.STEEL_BRIGHT);
    // ------------------------------------------------------------------ propeller: two broad blades and a red spinner
    const pr = k.part('propeller', { pivot: [2.58, 0, 0], local: true, voxel: 0.03 });
    prop(pr, 0.95, 2, { chord: 0.2, mat: M.AC_PROP, tip: YEL, hubR: 0.12, tipLen: 0.14 });
    spinner(pr, 0.0, 0.42, 0.2, RED);
    // ------------------------------------------------------------------ skeleton canopy: three arches, two rails, a windscreen. Hidden in the cockpit so the view is open.
    const cn = k.part('canopy', { hideInCockpit: true });
    const arch = (x, h) => cn.fn(x - 0.025, 0.5, -0.45, x + 0.025, 0.5 + h + 0.05, 0.45, (px, py, pz) => {
      const u = (py - 0.5) / h, v = pz / 0.42;
      if (u < 0) return 0;
      const d = u * u + v * v;
      return d > 0.9 && d < 1.12 ? M.AC_METAL : 0;
    }, { thin: true });
    arch(-0.9, 0.55); arch(-0.25, 0.62); arch(0.35, 0.62); arch(0.95, 0.5);
    for (const s of [-1, 1]) cn.box(-0.9, 0.5, s * 0.42 - 0.02, 0.95, 0.54, s * 0.42 + 0.02, M.AC_METAL, { md: 0.1 });
    cn.box(-0.9, 1.1, -0.02, 0.35, 1.14, 0.02, M.AC_METAL, { md: 0.1 });
    cn.box(-0.9, 0.55, -0.4, 0.95, 1.1, 0.4, M.AC_CANOPY, { mn: 0.3 });                                              // far away the cockpit is one dark block
    cn.fn(0.88, 0.5, -0.38, 1.3, 1.0, 0.38, (x, y, z) => {                                                    // the windscreen: a slab sloping up and back
      const yw = 0.6 + (1.28 - x) * 0.98;
      return Math.abs(y - yw) < 0.025 && Math.abs(z) < 0.36 - Math.max(0, y - 0.7) * 0.25 ? M.AC_CANOPY : 0;
    }, { thin: true });
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, 0.4, 0.1, { hands: [[0.95, 0.56, 0.0], [0.5, 0.3, -0.3]], feet: 1.1, suit: M.AC_ORANGE, helmet: M.AC_WHITE, visor: M.AC_BLACK });
  },
  interior(k) {
    // ------------------------------------------------------------------ the open cockpit (1.2 cm): a bucket seat with a harness, a rear seat, a floor, tubes
    const cp = k.interior('cockpit', { voxel: 0.012 });
    const seat = (x) => {
      cp.box(x - 0.22, 0.17, -0.22, x + 0.25, 0.24, 0.22, M.SEAT_FABRIC);
      cp.box(x - 0.3, 0.17, -0.23, x - 0.2, 0.74, 0.23, M.SEAT_FABRIC);
      cp.box(x - 0.31, 0.62, -0.13, x - 0.26, 0.82, 0.13, M.SEAT_LEATHER);
      for (const s of [-1, 1]) cp.box(x - 0.2, 0.17, s * 0.23 - 0.015, x + 0.2, 0.34, s * 0.23 + 0.015, M.SEAT_FABRIC);
    };
    seat(0.4); seat(-0.55);
    for (const s of [-1, 1]) {
      cp.box(0.3, 0.2, s * 0.09 - 0.025, 0.46, 0.7, s * 0.09 + 0.025, M.AC_BLACK, { md: 0.03 });                  // shoulder harness
      cp.box(0.25, 0.22, s * 0.2 - 0.025, 0.4, 0.26, s * 0.02, M.AC_BLACK, { md: 0.03 });
      cp.box(0.15, 0.18, s * 0.1, 0.22, 0.25, s * 0.1 + 0.04, M.STEEL_BRIGHT, { md: 0.03 });                    // buckle
    }
    cp.box(-0.9, 0.17, -0.32, 0.98, 0.5, -0.3, M.SEAT_FABRIC);                                                  // padded side panels
    cp.box(-0.9, 0.17, 0.3, 0.98, 0.5, 0.32, M.SEAT_FABRIC);
    for (let i = 0; i < 6; i++) { cp.box(-0.9 + i * 0.32, 0.17, -0.3, -0.88 + i * 0.32, 0.5, 0.3, M.AC_GRAY_DARK, { md: 0.02 }); }   // floor ribs, tubes
    strut(cp, [-0.9, 0.17, -0.28], [0.98, 0.17, -0.28], 0.03, M.STEEL_BRIGHT);
    strut(cp, [-0.9, 0.17, 0.28], [0.98, 0.17, 0.28], 0.03, M.STEEL_BRIGHT);
    // ------------------------------------------------------------------ the panel: round gauges in a black board with a tilted compass on top
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(1.2, 0.12, -0.34, 1.3, 0.78, 0.34, M.COCKPIT_PANEL);
    pn.box(1.1, 0.76, -0.36, 1.32, 0.82, 0.36, M.COCKPIT_TRIM);
    const gx = 1.2;
    const gs = [[0.62, -0.22, 'asi'], [0.62, 0.0, 'alt'], [0.62, 0.22, 'att'], [0.45, -0.22, 'rpm'], [0.45, 0.0, 'oil'], [0.45, 0.22, 'g']];
    for (const [y, z] of gs) gauge(pn, gx, y, z, 0.065);
    needle(k.interior('nASI', { pivot: [gx - 0.028, 0.62, -0.22], local: true, voxel: 0.004 }), 0.052, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [gx - 0.028, 0.62, 0.0], local: true, voxel: 0.004 }), 0.052, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [gx - 0.028, 0.45, -0.22], local: true, voxel: 0.004 }), 0.052, M.NEEDLE_ORANGE);
    pn.box(gx - 0.03, 0.58, 0.16, gx - 0.026, 0.66, 0.28, M.SIDING_BLUE); pn.box(gx - 0.03, 0.58, 0.16, gx - 0.026, 0.62, 0.28, M.BRICK_BROWN);   // the horizon
    for (let i = 0; i < 6; i++) pn.box(gx - 0.026, 0.3, -0.3 + i * 0.12, gx - 0.012, 0.32, -0.27 + i * 0.12, i === 2 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    pn.cyl('x', 0.86, 0.0, 0.05, 0.05, gx - 0.06, gx, M.AC_METAL, { md: 0.04 });                                    // compass
    pn.box(gx - 0.058, 0.84, -0.03, gx - 0.056, 0.88, 0.03, M.GAUGE_FACE, { md: 0.01 });
    // ------------------------------------------------------------------ stick, throttle, pedals
    const st = k.interior('stick', { pivot: [0.95, 0.12, 0], local: true, voxel: 0.01 });
    st.cyl('y', 0, 0, 0.02, 0.016, 0, 0.5, M.STEEL_BRIGHT);
    st.box(-0.04, 0.48, -0.035, 0.05, 0.62, 0.035, M.AC_BLACK);
    st.box(0.02, 0.58, -0.02, 0.06, 0.62, 0.02, M.SWITCH_RED, { md: 0.008 });
    const th = k.interior('throttleLever', { pivot: [0.45, 0.32, -0.3], local: true, voxel: 0.01 });
    th.cyl('y', 0, 0, 0.014, 0.014, 0, 0.18, M.STEEL_BRIGHT);
    th.ell(0, 0.2, 0, 0.03, 0.03, 0.03, M.AC_RED, { md: 0.02 });
    for (const [n, z] of [['pedalL', -0.14], ['pedalR', 0.14]]) {
      const p = k.interior(n, { pivot: [1.05, 0.2, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.05, -0.06, 0.02, 0.1, 0.06, M.STEEL_DARK);
    }
  },
});
