import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { hash2, hashUnit } from '../../core/util.js';
import { strut, wheel, gauge, needle, wingPair, fin, propeller } from '../builders/parts.js';

/* Scrapper B-1: a homebuilt taildragger bush plane welded together from whatever was in the barn. Patchwork fabric,
   automotive engine, tundra tires, an open cockpit and a wing that will lift off in the length of a driveway.
   It will also bite: adverse yaw, a small fin and a tailwheel that wants to lead. Pilot sits under the wing. */

const FABRIC = M.FABRIC_TAN, FRAME = M.STEEL_DARK;

/** Deterministic patchwork: most of the cloth stays original, the rest is whatever color was on the shelf. */
function patch(u, v, seed) {
  const h = hashUnit(hash2(Math.floor(u), Math.floor(v), seed));
  return h < 0.46 ? 0 : h < 0.58 ? M.PATCH_A : h < 0.7 ? M.PATCH_B : h < 0.78 ? M.PATCH_C : h < 0.86 ? M.PATCH_D : h < 0.92 ? M.TARP_BLUE : h < 0.96 ? M.PAINT_ORANGE : M.AC_CREAM;
}

export default defineAircraft({
  id: 'scrapper',
  name: 'Scrapper B-1',
  manufacturer: "Cousin Earl's Garage",
  role: 'Bush plane',
  order: 2,
  difficulty: 4,
  tags: ['Tailwheel', 'STOL', 'Open cockpit', 'Bites back'],
  description: 'Fabric, chrome-moly tube and a converted car engine. Lands on a road, a pasture or a sandbar. Spins if you look at it wrong. The only aircraft the hillbilly strip was built for.',
  voxel: 0.0625,
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
  limits: { vne: 55, maxG: 4, minG: 1.5, flapSpeed: 30, gearSpeed: 999, crashVs: 6 },
  cameras: { cockpit: [0.05, 0.76, 0], chase: { distance: 12, height: 3 } },
  liveries: [
    { id: 'default', name: 'Barn find patchwork' },
    { id: 'mailbox', name: 'Mailbox red', remap: { FABRIC_TAN: 'AC_RED', PATCH_A: 'AC_CREAM', PATCH_B: 'AC_ORANGE' } },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'flapL', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.6 },
    { part: 'flapR', type: 'rotate', axis: [0, 0, 1], channel: 'flap', gain: 0.6 },
    { part: 'elevator', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.5 },
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
    // fuselage: welded tube frame under cloth, boxy and tapering hard toward the tail
    body.loft('x', [
      { a: 1.95, c1: 0.05, c2: 0, r1: 0.34, r2: 0.36, n: 3 },
      { a: 1.1, c1: 0.05, c2: 0, r1: 0.4, r2: 0.42, n: 3 },
      { a: 0.75, c1: 0.08, c2: 0, r1: 0.5, r2: 0.44, n: 3.2 },
      { a: -0.2, c1: 0.1, c2: 0, r1: 0.52, r2: 0.42, n: 3.2 },
      { a: -1.5, c1: 0.13, c2: 0, r1: 0.46, r2: 0.3, n: 3 },
      { a: -3.0, c1: 0.17, c2: 0, r1: 0.3, r2: 0.16, n: 2.6 },
      { a: -4.5, c1: 0.2, c2: 0, r1: 0.14, r2: 0.06, n: 2.4 },
    ], FABRIC);
    // open cockpit with a raised coaming, cargo space behind the seat
    body.carve(-1.05, 0.2, -0.29, 0.6, 0.8, 0.29);
    body.carve(-1.7, 0.22, -0.2, -1.05, 0.8, 0.2);
    body.box(-1.06, 0.5, -0.33, 0.62, 0.6, -0.27, M.SEAT_LEATHER, { md: 0.09 });
    body.box(-1.06, 0.5, 0.27, 0.62, 0.6, 0.33, M.SEAT_LEATHER, { md: 0.09 });
    body.box(0.55, 0.5, -0.32, 0.65, 0.66, 0.32, M.SEAT_LEATHER, { md: 0.09 });
    // patchwork over the whole fuselage skin
    body.paint(-4.6, -0.5, -0.6, 2.0, 0.8, 0.6, (x, y, z) => patch(x / 0.55 + 9, (y + 1) / 0.5 + Math.sign(z) * 3, 3), { md: 0.14 });
    // engine: a flat four, cylinder heads and finned covers hang out in the airstream
    body.box(0.75, -0.2, -0.38, 1.35, 0.32, 0.38, M.AC_GRAY_DARK, { md: 0.2 });
    for (const s of [-1, 1]) {
      body.box(0.85, -0.12, s * 0.5 - 0.09, 1.3, 0.1, s * 0.5 + 0.09, M.AC_GRAY, { md: 0.18 });
      for (let i = 0; i < 5; i++) body.box(0.87 + i * 0.09, -0.14, s * 0.5 - 0.11, 0.9 + i * 0.09, 0.12, s * 0.5 + 0.11, M.AC_GRAY_DARK, { md: 0.09 });
      // exhaust stacks with rust
      strut(body, [1.05, -0.2, s * 0.42], [0.35, -0.3, s * 0.55], 0.07, M.RUST, { md: 0.2 });
      strut(body, [0.35, -0.3, s * 0.55], [-0.5, -0.26, s * 0.58], 0.09, M.RUST_DARK, { md: 0.2 });
    }
    body.box(1.5, 0.3, -0.16, 1.9, 0.42, 0.16, M.STEEL_BRIGHT, { md: 0.12 });                 // radiator and cowl lip
    body.box(1.94, -0.28, -0.3, 2.0, 0.34, 0.3, M.AC_GRAY_DARK, { md: 0.12 });
    body.cyl('x', 0.05, 0, 0.05, 0.05, 1.98, 2.1, M.STEEL_BRIGHT, { md: 0.12 });                // prop flange
    // wing: strut braced, high mounted, thick lifting section, coat after coat of repairs
    wingPair(body, [0.35, 1.1, 0.02], 4.78, 1.5, 1.3, 0.0, 0.05, 0.12, 0.1, FABRIC);
    for (const s of [-1, 1]) {
      body.paint(-1.2, 0.95, s * 0.05, 0.4, 1.25, s * 4.8, (x, y, z) => patch(x / 0.62 + 4, Math.abs(z) / 0.85 + (s > 0 ? 40 : 0), 7), { thin: true });
      body.paint(-1.2, 0.95, s * 0.05, 0.4, 1.25, s * 4.8, (x, y, z) => (Math.abs((Math.abs(z) % 0.42) - 0.21) < 0.012 && y > 1.1 ? M.STEEL_DARK : 0), { md: 0.05, thin: true });   // rib tape
      body.paint(-1.2, 0.95, s * 1.1, 0.4, 1.3, s * 1.5, (x, y, z) => (Math.abs(Math.abs(z) - 1.25 - x * 0.12) < 0.05 && y > 1.12 ? M.STEEL_BRIGHT : 0), { md: 0.09, thin: true });    // duct tape
      // wing tip and lift struts, cabane, bungee wraps
      body.box(0.2, 1.06, s * 4.75, 0.42, 1.2, s * 4.85, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.09 });
      strut(body, [0.05, -0.28, s * 0.3], [0.1, 1.06, s * 2.75], 0.07, M.STEEL);
      strut(body, [-0.65, -0.28, s * 0.3], [-0.6, 1.06, s * 2.75], 0.06, M.STEEL, { md: 0.2 });
      strut(body, [0.32, 0.55, s * 0.24], [0.2, 1.05, s * 0.42], 0.06, FRAME, { md: 0.2 });
      strut(body, [-0.5, 0.5, s * 0.24], [-0.4, 1.05, s * 0.42], 0.06, FRAME, { md: 0.2 });
    }
    // tail group: strut braced tailplane and a tall square fin
    wingPair(body, [-3.55, 0.42, 0.02], 1.55, 0.78, 0.7, 0.0, 0.0, 0.06, 0.05, FABRIC);
    fin(body, -3.85, 0.3, 0.75, 0.7, 1.05, 0.05, 0.05, FABRIC);
    for (const s of [-1, 1]) strut(body, [-3.8, 0.0, s * 0.08], [-3.75, 0.4, s * 1.15], 0.045, M.STEEL, { md: 0.2 });
    body.paint(-4.6, 0.3, -0.2, -3.8, 1.5, 0.2, (x, y, z) => (y > 0.45 && y < 1.3 && Math.abs(z) < 0.12 && ((Math.floor((x + 4) * 5) + Math.floor(y * 5)) & 1) ? M.PAINT_ORANGE : 0), { md: 0.08, thin: true });
    // license plate, hood ornament, antenna coat hanger
    body.box(-4.42, 0.55, -0.09, -4.36, 0.7, 0.09, M.AC_CREAM, { md: 0.09 });
    body.box(-4.425, 0.6, -0.06, -4.4, 0.65, 0.06, M.AC_BLACK, { md: 0.03 });
    body.box(1.76, 0.42, -0.03, 1.84, 0.5, 0.03, M.STEEL_BRIGHT, { md: 0.06 });
    strut(body, [-0.9, 0.95, 0.4], [-0.9, 1.35, 0.55], 0.014, M.STEEL, { md: 0.03 });
    // main gear: sprung struts, axle and rubber cord wraps
    for (const s of [-1, 1]) {
      strut(body, [0.5, -0.32, s * 0.2], [0.42, -1.0, s * 0.8], 0.08, M.STEEL);
      strut(body, [0.05, -0.34, s * 0.2], [0.4, -1.0, s * 0.78], 0.06, M.STEEL, { md: 0.2 });
      for (let i = 0; i < 4; i++) { const t = 0.2 + i * 0.18; body.cyl('y', 0.5 - 0.08 * t, s * (0.2 + 0.6 * t), 0.06, 0.06, -0.32 - 0.66 * t - 0.02, -0.32 - 0.66 * t + 0.02, M.AC_BLACK, { md: 0.06 }); }
    }
    strut(body, [0.42, -1.0, -0.8], [0.42, -1.0, 0.8], 0.06, FRAME, { md: 0.2 });
    // tail spring
    strut(body, [-4.3, 0.05, 0], [-4.5, -0.42, 0], 0.05, M.STEEL, { md: 0.2 });

    // ------------------------------------------------------------------ control surfaces
    for (const s of [-1, 1]) {
      const a = k.part(s < 0 ? 'aileronL' : 'aileronR', { pivot: [-0.75, 1.1, s * 3.8] });
      a.wing([-0.72, 1.1, s * 2.8], 2.0, 0.42, 0.36, 0, 0.0, 0.05, 0.045, s, FABRIC);
      a.paint(-1.2, 0.95, s * 2.8, 0.2, 1.25, s * 4.8, (x, y, z) => patch(x / 0.3 + 2, Math.abs(z) / 0.6 + 30, 11), { thin: true });
      const f = k.part(s < 0 ? 'flapL' : 'flapR', { pivot: [-0.7, 1.1, s * 1.7] });
      f.wing([-0.68, 1.1, s * 0.5], 2.3, 0.5, 0.45, 0, 0.0, 0.06, 0.055, s, FABRIC);
    }
    const el = k.part('elevator', { pivot: [-4.32, 0.42, 0] });
    for (const s of [-1, 1]) el.wing([-4.27, 0.42, s * 0.02], 1.55, 0.36, 0.34, 0, 0.0, 0.06, 0.05, s, FABRIC);
    const rd = k.part('rudder', { pivot: [-4.6, 0.7, 0] });
    rd.loft('y', [
      { a: 0.3, c1: -4.75, c2: 0, r1: 0.16, r2: 0.05, n: 4 },
      { a: 1.35, c1: -4.7, c2: 0, r1: 0.15, r2: 0.045, n: 4 },
    ], FABRIC, { thin: true });
    rd.paint(-5, 0.2, -0.2, -4.4, 1.5, 0.2, (x, y) => (y > 0.7 && y < 1.1 ? M.AC_RED : 0), { thin: true });
    // propeller: a wooden two-blade with tape on the tips
    propeller(k.part('propeller', { pivot: [2.1, 0.05, 0], local: true, voxel: 0.03125 }), 0.875, 2, 0.14, M.WOOD_MID, M.AC_YELLOW);
    // wheels
    for (const s of [-1, 1]) wheel(k.part(s < 0 ? 'wheelL' : 'wheelR', { pivot: [0.42, -1.0, s * 0.85], local: true }), 0, 0, 0, 0.33, 0.2);
    const tw = k.part('tailwheel', { pivot: [-4.5, -0.52, 0], local: true });
    wheel(tw, 0, 0, 0, 0.1, 0.07);
    strut(tw, [0, 0, 0], [0.05, 0.28, 0], 0.03, M.STEEL, { md: 0.03 });
    // windscreen: a small tinted plate, hidden from the cockpit so the pilot sees over it
    const gl = k.part('glass', { hideInCockpit: true });
    gl.box(0.66, 0.6, -0.27, 0.7, 0.95, 0.27, M.AC_CANOPY, { thin: true });
    gl.box(0.7, 0.6, -0.27, 0.9, 0.8, -0.24, M.AC_CANOPY, { thin: true });
    gl.box(0.7, 0.6, 0.24, 0.9, 0.8, 0.27, M.AC_CANOPY, { thin: true });
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
    // jerry can and a coil of rope in the cargo space
    c.box(-1.55, -0.36, 0.05, -1.25, -0.05, 0.19, M.AC_RED, { md: 0.09 });
    c.box(-1.5, -0.05, 0.1, -1.4, 0.02, 0.15, M.AC_BLACK, { md: 0.05 });
    c.cyl('y', -1.3, -0.1, 0.11, 0.11, -0.36, -0.22, M.HAY, { md: 0.09 });

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
