import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';

/* Ground support equipment and airfield vehicles as static props: baggage trains, belt loaders, stairs, fuelers, caterers,
   pushback tugs, power carts, apron buses, crash tenders and follow-me cars, plus the olive machines of a military ramp and the
   tractor and pickup of a farm strip. Local +x is the front, the wheels rest on y = 0. Body panels use CAR_PAINT so the instance
   tint gives each machine its own color; everything else keeps a fixed color. */

const rules = (size) => ({ fine: true, size, conservative: true, maxDist: 2600 });
const wheel = (b, x, z, r, w = 0.3) => {
  b.cyl('z', x, r, r, r, z - w / 2, z + w / 2, M.TIRE);
  b.cyl('z', x, r, r * 0.5, r * 0.5, z - w / 2 - 0.02, z + w / 2 + 0.02, M.STEEL, { md: 0.2 });
};
const wheels = (b, xs, hw, r, w = 0.3) => { for (const x of xs) for (const s of [-1, 1]) wheel(b, x, s * (hw - w / 2), r, w); };
const lights = (b, x, hw, y, front = true) => {
  for (const s of [-1, 1]) b.box(x - 0.05, y, s * (hw - 0.3) - 0.14, x + 0.05, y + 0.18, s * (hw - 0.3) + 0.14, front ? M.HEADLIGHT : M.TAILLIGHT, { md: 0.4 });
};
const beacon = (b, x, y, z = 0) => b.box(x - 0.1, y, z - 0.1, x + 0.1, y + 0.2, z + 0.1, M.BEACON_RED);
const LUGGAGE = [M.TARP_BLUE, M.PAINT_BARN_RED, M.WOOD_DARK, M.PAINT_GREEN, M.PAINT_BLUEGRAY, M.TARP_ORANGE, M.SIDING_GRAY];

// A baggage tractor with its train of carts. Variant 1 pulls two carts.
const tug = defineScenery({
  id: 'gse-tug', variants: 2, rules: rules(16),
  build(b, v) {
    b.box(-0.9, 0.3, -0.68, 1.5, 0.95, 0.68, M.CAR_PAINT);
    b.box(0.9, 0.95, -0.6, 1.5, 1.35, 0.6, M.CAR_PAINT);
    b.box(-0.9, 0.95, -0.68, 0.7, 1.1, 0.68, M.STEEL_DARK);
    for (const x of [-0.8, 0.65]) for (const z of [-0.62, 0.62]) b.box(x - 0.04, 1.1, z - 0.04, x + 0.04, 2.0, z + 0.04, M.STEEL_DARK, { md: 0.3 });
    b.box(-0.95, 1.98, -0.75, 0.75, 2.06, 0.75, M.CAR_PAINT);
    b.box(-0.4, 1.1, -0.3, 0.1, 1.5, 0.3, M.SEAT_FABRIC, { md: 0.5 });
    b.box(0.55, 1.1, -0.3, 0.6, 1.9, 0.3, M.CAR_GLASS, { md: 0.4 });
    lights(b, 1.5, 0.68, 0.55);
    beacon(b, -0.7, 2.06);
    wheels(b, [-0.55, 1.05], 0.72, 0.32);
    const n = v === 1 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const x0 = -1.0 - 0.7 - i * 4.0, x1 = x0 - 3.3;
      b.box(x1, 0.42, -0.95, x0, 0.56, 0.95, M.STEEL_DARK);
      b.box(x1, 0.56, -0.95, x0, 0.62, 0.95, M.CONCRETE_DARK, { md: 0.4 });
      for (const z of [-0.93, 0.93]) b.box(x1, 0.62, z - 0.02, x0, 1.15, z + 0.02, M.STEEL, { md: 0.25 });
      b.box(x1, 0.62, -0.95, x1 + 0.04, 1.15, 0.95, M.STEEL, { md: 0.25 });
      b.box(x0 - 1.1, 0.4, -0.04, x0 + 0.72, 0.5, 0.04, M.STEEL_DARK, { md: 0.3 });
      for (let k = 0; k < 4; k++) {
        const bx = x1 + 0.2 + (k % 2) * 1.5, bz = -0.7 + Math.floor(k / 2) * 0.75;
        b.box(bx, 0.62, bz, bx + 1.3 - 0.1 * ((i + k) % 3), 0.62 + 0.42 + 0.12 * ((i * 3 + k) % 3), bz + 0.6, LUGGAGE[(i * 4 + k) % LUGGAGE.length], { md: 0.6 });
      }
      wheels(b, [x0 - 0.5, x1 + 0.5], 0.85, 0.22, 0.2);
    }
  },
});

// Belt loader: a low chassis and a conveyor raised toward the front, where it meets the hold.
const belt = defineScenery({
  id: 'gse-belt', variants: 1, rules: rules(6),
  build(b) {
    b.box(-2.2, 0.35, -0.9, 1.2, 0.85, 0.9, M.CAR_PAINT);
    b.box(-2.2, 0.85, 0.15, -0.9, 1.9, 0.9, M.CAR_PAINT);
    b.box(-2.15, 1.1, 0.2, -1.0, 1.7, 0.86, M.CAR_GLASS, { md: 0.5 });
    b.box(-2.2, 1.9, 0.1, -0.85, 2.0, 0.95, M.STEEL_DARK, { md: 0.5 });
    const slope = 0.5;
    for (const z of [-0.82, 0.82]) b.fn(-0.6, 0.6, z - 0.06, 3.9, 3.6, z + 0.06, (lx, ly) => { const y = 0.95 + (lx + 0.6) * slope; return ly > y && ly < y + 0.6 ? M.CAR_PAINT : 0; });
    b.fn(-0.6, 0.6, -0.8, 3.9, 3.6, 0.8, (lx, ly) => { const y = 0.95 + (lx + 0.6) * slope; return ly > y && ly < y + 0.14 ? M.TIRE : 0; });
    b.box(3.8, 2.6, -0.95, 4.2, 3.4, 0.95, M.STEEL_DARK, { md: 0.5 });
    b.box(-0.4, 0.5, -0.05, 2.4, 1.6, 0.05, M.STEEL_DARK, { md: 0.4 });
    wheels(b, [-1.5, 0.7], 0.96, 0.34);
    beacon(b, -1.5, 2.0, -0.6);
    lights(b, 1.2, 0.9, 0.5);
  },
});

// Passenger stairs on a truck: a long flight, rails, a landing at the top.
const stairs = defineScenery({
  id: 'gse-stairs', variants: 1, rules: rules(8),
  build(b) {
    b.box(-3.0, 0.45, -1.1, 2.2, 1.05, 1.1, M.CAR_PAINT);
    b.box(1.0, 1.05, -1.0, 2.2, 2.2, 1.0, M.CAR_PAINT);
    b.box(2.1, 1.35, -0.9, 2.2, 2.1, 0.9, M.CAR_GLASS, { md: 0.5 });
    b.fn(-3.4, 0.9, -0.62, 2.2, 3.7, 0.62, (lx, ly) => { const st = Math.floor((lx + 3.4) / 0.5), top = 1.05 + st * 0.26; return ly <= top && ly >= top - 0.16 ? M.CONCRETE : 0; });
    for (const z of [-0.66, 0.66]) b.fn(-3.4, 0.9, z - 0.03, 2.2, 4.6, z + 0.03, (lx, ly) => { const y = 1.05 + ((lx + 3.4) / 0.5) * 0.26 + 0.95; return Math.abs(ly - y) < 0.05 ? M.STEEL_BRIGHT : 0; }, { md: 0.5 });
    b.box(2.0, 3.4, -1.2, 3.6, 3.52, 1.2, M.CONCRETE_DARK);
    b.box(2.0, 3.52, -1.2, 3.6, 4.4, -1.15, M.STEEL_BRIGHT, { md: 0.3 });
    b.box(2.0, 3.52, 1.15, 3.6, 4.4, 1.2, M.STEEL_BRIGHT, { md: 0.3 });
    b.box(3.55, 3.52, -1.2, 3.6, 4.0, 1.2, M.SIGN_YELLOW, { md: 0.3 });
    wheels(b, [-2.0, 1.6], 1.15, 0.45, 0.32);
    beacon(b, 1.4, 2.2);
  },
});

// Refueler: a cab, a white tank with a red band, a hose reel and a catwalk.
const fuel = defineScenery({
  id: 'gse-fuel', variants: 1, rules: rules(10),
  build(b) {
    b.box(-4.6, 0.55, -1.0, 4.6, 0.95, 1.0, M.STEEL_DARK);
    b.box(3.0, 0.95, -1.1, 5.0, 2.7, 1.1, M.CAR_PAINT);
    b.box(4.4, 1.5, -1.0, 5.05, 2.55, 1.0, M.CAR_GLASS, { md: 0.5 });
    b.box(4.9, 0.6, -1.05, 5.15, 1.2, 1.05, M.CAR_TRIM, { md: 0.4 });
    b.cyl('x', 2.05, 0, 1.25, 1.25, -4.4, 2.7, M.TANK_WHITE);
    b.cyl('x', 2.05, 0, 1.28, 1.28, -1.4, -0.6, M.SIGN_RED, { md: 0.5 });
    b.cyl('x', 2.05, 0, 1.28, 1.28, 0.6, 1.0, M.SIGN_YELLOW, { md: 0.5 });
    b.box(-4.3, 3.2, -0.5, 2.5, 3.32, 0.5, M.STEEL_BRIGHT, { md: 0.4 });
    b.box(-4.6, 1.0, -1.05, -3.3, 2.5, 1.05, M.CAR_PAINT);
    b.cyl('y', -4.2, 0, 0.3, 0.3, 3.3, 3.55, M.STEEL, { md: 0.4 });
    b.box(-3.0, 0.95, -1.08, -2.2, 1.5, -0.98, M.STEEL_BRIGHT, { md: 0.4 });
    wheels(b, [-3.4, -2.1, 3.9], 1.05, 0.55, 0.4);
    beacon(b, 4.2, 2.7);
  },
});

// Catering truck: the box rides on a scissor lift, shown half raised.
const catering = defineScenery({
  id: 'gse-catering', variants: 1, rules: rules(8),
  build(b) {
    b.box(-3.6, 0.5, -1.05, 3.0, 0.95, 1.05, M.STEEL_DARK);
    b.box(2.0, 0.95, -1.1, 3.9, 2.5, 1.1, M.CAR_PAINT);
    b.box(3.4, 1.45, -1.0, 3.95, 2.4, 1.0, M.CAR_GLASS, { md: 0.5 });
    for (const x of [-2.4, 0.8]) for (const z of [-0.7, 0.7]) b.box(x - 0.06, 0.95, z - 0.06, x + 0.06, 2.8, z + 0.06, M.STEEL, { md: 0.3 });
    b.box(-3.6, 2.8, -1.25, 1.9, 5.2, 1.25, M.PLASTER_WHITE);
    b.box(-3.6, 2.8, -1.28, 1.9, 3.0, 1.28, M.STEEL_DARK, { md: 0.5 });
    b.box(-3.6, 5.2, -1.3, 1.9, 5.3, 1.3, M.CONCRETE_PANEL);
    b.box(-3.55, 3.4, 1.25, 0.9, 4.9, 1.32, M.STEEL_BRIGHT, { md: 0.5 });
    b.box(1.9, 3.3, -1.0, 2.7, 4.7, 1.0, M.STEEL_DARK, { md: 0.5 });
    b.box(-3.6, 3.4, -1.32, -0.6, 4.8, -1.25, M.CAR_PAINT, { md: 0.5 });
    wheels(b, [-2.9, -1.7, 3.0], 1.1, 0.5, 0.35);
    beacon(b, 3.0, 2.5);
  },
});

// Pushback tug: low and wide, a tow bar out in front.
const pushback = defineScenery({
  id: 'gse-pushback', variants: 1, rules: rules(8),
  build(b) {
    b.box(-1.9, 0.35, -1.05, 1.9, 0.9, 1.05, M.CAR_PAINT);
    b.box(-1.6, 0.9, -0.95, 0.7, 1.75, 0.95, M.CAR_PAINT);
    b.box(0.6, 1.0, -0.9, 0.7, 1.65, 0.9, M.CAR_GLASS, { md: 0.5 });
    b.box(-1.7, 1.75, -1.0, 0.8, 1.85, 1.0, M.CAR_PAINT);
    for (const x of [-1.5, 0.6]) for (const z of [-0.9, 0.9]) b.box(x - 0.04, 1.0, z - 0.04, x + 0.04, 1.78, z + 0.04, M.STEEL_DARK, { md: 0.3 });
    for (let i = 0; i < 6; i++) b.box(-1.9 + i * 0.66, 0.5, -1.07, -1.6 + i * 0.66, 0.8, 1.07, i & 1 ? M.CAR_TRIM : M.SIGN_YELLOW, { md: 0.5 });
    b.box(1.9, 0.45, -0.06, 5.3, 0.6, 0.06, M.STEEL_DARK, { md: 0.5 });
    b.box(1.9, 0.5, -0.5, 2.0, 0.6, 0.5, M.STEEL_DARK, { md: 0.5 });
    wheels(b, [-1.2, 1.2], 1.15, 0.42, 0.34);
    beacon(b, -0.5, 1.85);
  },
});

// Ground power cart on two wheels with a cable coil and a tow handle.
const gpu = defineScenery({
  id: 'gse-gpu', variants: 1, rules: rules(3),
  build(b) {
    b.box(-0.9, 0.35, -0.55, 0.9, 1.35, 0.55, M.CAR_PAINT);
    b.box(-0.9, 1.35, -0.5, 0.9, 1.42, 0.5, M.STEEL_DARK, { md: 0.4 });
    b.box(-0.6, 0.6, 0.55, 0.0, 1.1, 0.62, M.CAR_TRIM, { md: 0.4 });
    b.cyl('x', 0.9, 0.62, 0.3, 0.3, 0.4, 0.62, M.TIRE, { md: 0.4 });
    b.box(0.9, 0.5, -0.05, 1.7, 0.6, 0.05, M.STEEL_DARK, { md: 0.4 });
    for (const s of [-1, 1]) wheel(b, 0, s * 0.6, 0.28, 0.16);
    b.box(-0.9, 0.3, -0.05, -0.75, 0.5, 0.05, M.STEEL, { md: 0.4 });
  },
});

// Apron bus: a long, low, wide coach with big windows and doors on the side facing the aircraft.
const bus = defineScenery({
  id: 'gse-bus', variants: 1, rules: rules(13),
  build(b) {
    b.box(-6.0, 0.4, -1.4, 6.0, 3.0, 1.4, M.CAR_PAINT);
    b.box(-6.0, 3.0, -1.35, 6.0, 3.1, 1.35, M.PLASTER_WHITE);
    for (const s of [-1, 1]) {
      b.box(-5.6, 1.5, s * 1.4 - 0.03, 5.0, 2.7, s * 1.4 + 0.03, M.CAR_GLASS);
      for (const x of [-3.0, 0.4, 3.6]) b.box(x, 0.5, s * 1.4 - 0.05, x + 1.3, 2.6, s * 1.4 + 0.05, M.CAR_TRIM, { md: 0.4 });
    }
    b.box(5.95, 1.4, -1.3, 6.05, 2.8, 1.3, M.CAR_GLASS);
    lights(b, 6.0, 1.4, 0.6);
    lights(b, -6.0, 1.4, 1.0, false);
    b.box(-4.0, 3.1, -0.9, -1.5, 3.4, 0.9, M.STEEL_DARK, { md: 0.5 });
    wheels(b, [-3.6, 3.7], 1.4, 0.5, 0.4);
  },
});

// Crash tender: three axles, a roof turret, side lockers, light bars that flash.
const crash = defineScenery({
  id: 'gse-crash', variants: 1, rules: rules(11),
  build(b) {
    b.box(-4.8, 0.55, -1.25, 4.8, 1.0, 1.25, M.STEEL_DARK);
    b.box(-4.8, 1.0, -1.3, 2.4, 3.1, 1.3, M.AC_RED);
    b.box(2.4, 1.0, -1.3, 4.9, 3.4, 1.3, M.AC_RED);
    b.box(3.7, 2.0, -1.25, 4.95, 3.3, 1.25, M.CAR_GLASS, { md: 0.5 });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.box(-4.2 + i * 1.6, 1.3, s * 1.3 - 0.04, -2.8 + i * 1.6, 2.7, s * 1.3 + 0.04, M.STEEL_BRIGHT, { md: 0.4 });
    b.box(-4.8, 2.4, -1.32, 2.4, 2.6, 1.32, M.PAINT_WHITE, { md: 0.5 });
    b.cyl('y', -0.6, 0, 0.35, 0.3, 3.1, 3.5, M.STEEL_DARK, { md: 0.5 });
    b.box(-0.6, 3.4, -0.18, 1.5, 3.7, 0.18, M.STEEL_DARK, { md: 0.5 });
    b.box(2.6, 3.4, -0.9, 3.0, 3.6, 0.9, M.STEEL_DARK, { md: 0.5 });
    beacon(b, 2.8, 3.6, -0.6); beacon(b, 2.8, 3.6, 0.6);
    b.box(4.9, 0.7, -1.0, 5.15, 1.3, 1.0, M.STEEL_BRIGHT, { md: 0.4 });
    lights(b, 4.95, 1.3, 1.5);
    wheels(b, [-3.6, -2.2, 3.4], 1.25, 0.62, 0.45);
  },
});

// Follow-me car: a yellow pickup with a checkered sign on the roof.
const followMe = defineScenery({
  id: 'gse-followme', variants: 1, rules: rules(5),
  build(b) {
    b.box(-2.3, 0.3, -0.95, 2.2, 1.0, 0.95, M.SIGN_YELLOW);
    b.box(-0.2, 1.0, -0.88, 1.6, 1.65, 0.88, M.CAR_GLASS);
    b.box(-0.2, 1.62, -0.88, 1.6, 1.72, 0.88, M.SIGN_YELLOW);
    b.box(-2.3, 1.0, -0.95, -0.4, 1.3, 0.95, M.SIGN_YELLOW, { md: 0.5 });
    b.box(0.3, 1.72, -0.7, 0.6, 2.3, 0.7, M.TIRE, { md: 0.5 });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) b.box(0.27, 1.9 + j * 0.2, -0.7 + i * 0.23, 0.63, 2.1 + j * 0.2, -0.47 + i * 0.23, (i + j) & 1 ? M.TAXI_LINE : M.TIRE, { md: 0.3 });
    beacon(b, 0.9, 1.72, -0.5); beacon(b, 0.9, 1.72, 0.5);
    lights(b, 2.2, 0.95, 0.55);
    lights(b, -2.3, 0.95, 0.55, false);
    wheels(b, [-1.4, 1.35], 0.95, 0.36, 0.26);
  },
});

// Olive machines for a military ramp.
const milTruck = defineScenery({
  id: 'mil-truck', variants: 1, rules: rules(8),
  build(b) {
    b.box(-3.6, 0.55, -1.0, 3.4, 0.95, 1.0, M.STEEL_DARK);
    b.box(1.8, 0.95, -1.1, 3.5, 2.7, 1.1, M.MIL_OLIVE);
    b.box(3.0, 1.5, -1.0, 3.55, 2.5, 1.0, M.CAR_GLASS, { md: 0.5 });
    b.box(-3.6, 0.95, -1.15, 1.6, 1.3, 1.15, M.MIL_OLIVE);
    for (let i = 0; i < 6; i++) b.box(-3.5 + i * 0.85, 1.3, -1.1, -3.4 + i * 0.85, 2.7, 1.1, M.MIL_TAN, { md: 0.4 });
    b.box(-3.6, 2.3, -1.15, 1.6, 2.9, 1.15, M.MIL_TAN);
    b.box(-3.6, 1.3, -1.15, 1.6, 2.4, -1.1, M.MIL_TAN, { md: 0.8 });
    b.box(-3.6, 1.3, 1.1, 1.6, 2.4, 1.15, M.MIL_TAN, { md: 0.8 });
    wheels(b, [-2.9, -1.5, 2.6], 1.15, 0.6, 0.4);
    lights(b, 3.5, 1.1, 0.8);
  },
});
const milFuel = defineScenery({
  id: 'mil-fuel', variants: 1, rules: rules(9),
  build(b) {
    b.box(-4.2, 0.55, -1.0, 4.2, 0.95, 1.0, M.STEEL_DARK);
    b.box(2.6, 0.95, -1.1, 4.5, 2.6, 1.1, M.MIL_OLIVE);
    b.box(4.0, 1.5, -1.0, 4.55, 2.4, 1.0, M.CAR_GLASS, { md: 0.5 });
    b.cyl('x', 2.0, 0, 1.2, 1.2, -4.0, 2.4, M.MIL_OLIVE);
    b.cyl('x', 2.0, 0, 1.22, 1.22, -0.4, 0.2, M.MIL_TAN, { md: 0.5 });
    b.box(-3.8, 3.15, -0.4, 2.0, 3.27, 0.4, M.STEEL_DARK, { md: 0.4 });
    b.box(-4.3, 0.95, -1.0, -3.2, 2.3, 1.0, M.MIL_OLIVE, { md: 0.8 });
    wheels(b, [-3.2, -1.9, 3.5], 1.05, 0.55, 0.4);
    lights(b, 4.5, 1.1, 0.8);
  },
});
const milJeep = defineScenery({
  id: 'mil-jeep', variants: 1, rules: rules(4.5),
  build(b) {
    b.box(-1.9, 0.4, -0.85, 1.9, 0.95, 0.85, M.MIL_OLIVE);
    b.box(0.2, 0.95, -0.85, 0.3, 1.5, 0.85, M.CAR_GLASS, { md: 0.5 });
    b.box(-1.9, 0.95, -0.85, -1.7, 1.25, 0.85, M.MIL_OLIVE, { md: 0.5 });
    b.box(-0.8, 0.95, -0.55, -0.1, 1.25, -0.1, M.SEAT_FABRIC, { md: 0.5 });
    b.cyl('z', -2.05, 0.75, 0.32, 0.32, -0.15, 0.15, M.TIRE, { md: 0.5 });
    b.box(-0.2, 1.0, 0.5, -0.1, 1.1, 0.75, M.STEEL_DARK, { md: 0.4 });
    lights(b, 1.9, 0.85, 0.55);
    wheels(b, [-1.15, 1.2], 0.9, 0.36, 0.3);
  },
});
const milTug = defineScenery({
  id: 'mil-tug', variants: 1, rules: rules(9),
  build(b) {
    b.box(-1.8, 0.4, -1.1, 2.0, 1.1, 1.1, M.SIGN_YELLOW);
    b.box(-1.5, 1.1, -1.0, 0.6, 2.1, 1.0, M.MIL_OLIVE);
    b.box(0.5, 1.2, -0.95, 0.6, 2.0, 0.95, M.CAR_GLASS, { md: 0.5 });
    b.box(-1.6, 2.1, -1.05, 0.7, 2.2, 1.05, M.MIL_OLIVE);
    for (let i = 0; i < 8; i++) b.box(-1.8 + i * 0.47, 0.55, -1.12, -1.55 + i * 0.47, 0.85, 1.12, i & 1 ? M.TIRE : M.SIGN_YELLOW, { md: 0.5 });
    b.box(2.0, 0.5, -0.08, 6.4, 0.65, 0.08, M.STEEL_DARK, { md: 0.5 });
    b.box(6.3, 0.45, -0.45, 6.5, 0.7, 0.45, M.STEEL_DARK, { md: 0.5 });
    wheels(b, [-1.2, 1.3], 1.25, 0.5, 0.45);
    beacon(b, -0.6, 2.2);
  },
});
const milLoader = defineScenery({
  id: 'mil-loader', variants: 1, rules: rules(6),
  build(b) {
    b.box(-1.4, 0.35, -0.9, 1.6, 0.8, 0.9, M.MIL_OLIVE);
    b.box(-1.3, 0.8, -0.5, -0.3, 1.5, 0.5, M.MIL_OLIVE);
    for (const z of [-0.45, 0.45]) b.box(-0.6, 0.8, z - 0.06, 3.6, 1.0, z + 0.06, M.STEEL_DARK);
    b.cyl('x', 1.25, 0, 0.22, 0.22, 0.2, 2.8, M.MIL_GRAY, { md: 0.5 });
    b.cyl('x', 1.25, 0, 0.16, 0.05, 2.8, 3.3, M.MIL_TAN, { md: 0.5 });
    for (let x = 0.6; x < 3.4; x += 0.8) b.box(x, 1.02, -0.58, x + 0.08, 1.4, 0.58, M.STEEL_DARK, { md: 0.4 });
    wheels(b, [-0.8, 1.1], 0.95, 0.32, 0.3);
  },
});

// Farm strip: a red tractor and an old pickup that has not moved in years.
const tractor = defineScenery({
  id: 'tractor', variants: 1, rules: rules(4),
  build(b) {
    b.box(-1.0, 0.7, -0.5, 1.4, 1.4, 0.5, M.PAINT_BARN_RED);
    b.box(0.5, 1.3, -0.4, 1.4, 1.65, 0.4, M.PAINT_BARN_RED);
    b.box(-1.0, 1.4, -0.42, 0.1, 2.5, 0.42, M.PAINT_BARN_RED, { md: 0.5 });
    b.box(-1.05, 2.5, -0.5, 0.15, 2.58, 0.5, M.STEEL_DARK, { md: 0.5 });
    b.box(-0.7, 1.4, -0.25, -0.3, 1.65, 0.25, M.SEAT_LEATHER, { md: 0.5 });
    b.cyl('y', 1.1, 0.28, 0.05, 0.05, 1.65, 2.5, M.STEEL_DARK, { md: 0.3 });
    for (const s of [-1, 1]) { wheel(b, -0.85, s * 0.85, 0.8, 0.42); wheel(b, 1.15, s * 0.6, 0.45, 0.24); }
    b.box(-1.7, 0.4, -0.5, -1.0, 0.6, 0.5, M.STEEL_DARK, { md: 0.5 });
  },
});
const oldPickup = defineScenery({
  id: 'rusty-pickup', variants: 2, rules: rules(5.5),
  build(b, v) {
    const paint = v ? M.PAINT_GREEN : M.PAINT_BLUEGRAY;
    b.box(-2.6, 0.45, -0.95, 2.6, 1.0, 0.95, M.RUST);
    b.box(0.6, 1.0, -0.9, 2.5, 1.2, 0.9, paint);
    b.box(-0.6, 1.0, -0.9, 1.3, 1.85, 0.9, paint);
    b.box(-0.55, 1.15, -0.88, 1.2, 1.75, 0.88, M.GLASS_DARK, { md: 0.5 });
    b.box(-2.6, 1.0, -0.95, -0.7, 1.35, 0.95, M.RUST_DARK);
    b.box(-2.55, 1.0, -0.9, -0.75, 1.3, -0.85, M.WOOD_WEATHERED, { md: 0.5 });
    b.box(2.3, 0.45, -0.9, 2.65, 0.8, 0.9, M.STEEL_DARK, { md: 0.5 });
    for (const [x, z] of [[-1.7, -0.9], [-1.7, 0.9], [1.5, -0.9], [1.5, 0.9]]) b.cyl('z', x, 0.3, 0.34, 0.34, z - 0.12, z + 0.12, M.TIRE);
  },
});

export default [tug, belt, stairs, fuel, catering, pushback, gpu, bus, crash, followMe, milTruck, milFuel, milJeep, milTug, milLoader, tractor, oldPickup];
