import { Recipe } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';

/* Everything an aircraft can throw: the numbers that fly it (SI units) and the voxel model that is seen on the wing, in the air
   and in the crater it leaves. A weapon in an aircraft definition names a munition and may override any number:
     { id: 'pods', name: '70 mm rocket pod', type: 'rocket', munition: 'hvar', stations: [...], rounds: 19 }
   type: gun | rocket | missile | bomb. speed is the muzzle speed of a gun or the top speed of a motor; speed0 is what a motor
   starts with, relative to the launching aircraft; accel and burn are the motor (m/s^2, seconds); dragK slows a coasting body by
   dragK * v^2; turn is the guidance limit in rad/s; blast is the lethal radius in meters; mass is what leaves the airframe. */

export const MUNITIONS = {
  // ---- guns
  cannon30: { name: '30 mm API', type: 'gun', speed: 1010, life: 2.4, spread: 0.0042, blast: 2.3, rate: 62, tracer: 4, grav: 1, model: null },
  cannon20: { name: '20 mm HE', type: 'gun', speed: 1040, life: 2.2, spread: 0.0035, blast: 1.9, rate: 100, tracer: 4, grav: 1, model: null },
  mg50: { name: '.50 cal', type: 'gun', speed: 880, life: 1.9, spread: 0.0055, blast: 1.2, rate: 13, tracer: 5, grav: 1, model: null },
  spud: { name: 'Spud', type: 'gun', speed: 95, life: 7, spread: 0.014, blast: 3.6, rate: 2.4, tracer: 0, grav: 1, model: 'spud', mass: 0 },
  // ---- rockets
  hvar: { name: '70 mm rocket', type: 'rocket', speed: 560, speed0: 40, accel: 310, burn: 1.7, dragK: 0, life: 9, spread: 0.011, blast: 7.5, rate: 9, mass: 8, trail: 0.42, model: 'hvar', grav: 1 },
  hvar5: { name: '127 mm rocket', type: 'rocket', speed: 620, speed0: 50, accel: 340, burn: 1.9, dragK: 0, life: 10, spread: 0.01, blast: 11, rate: 6, mass: 62, trail: 0.55, model: 'zuni', grav: 1 },
  bottle: { name: 'Bottle rocket', type: 'rocket', speed: 130, speed0: 18, accel: 46, burn: 2.6, dragK: 0.0006, life: 7, spread: 0.05, blast: 4.4, rate: 7, mass: 0.6, trail: 0.3, wobble: 0.9, model: 'bottle', grav: 1, fuel: 5 },
  plunger: { name: 'Plunger rocket', type: 'rocket', speed: 300, speed0: 25, accel: 120, burn: 2.4, dragK: 0.0004, life: 8, spread: 0.02, blast: 8.5, rate: 3.2, mass: 7, trail: 0.4, wobble: 0.3, model: 'plunger', grav: 1, fuel: 8 },
  // ---- guided missiles
  agm: { name: 'Air to ground missile', type: 'missile', speed: 650, speed0: 80, accel: 200, burn: 3.4, dragK: 0, turn: 0.95, life: 20, range: 9000, blast: 17, mass: 100, trail: 0.5, model: 'agm', grav: 1, lock: 'ground', fuel: 6 },
  aam: { name: 'Air to air missile', type: 'missile', speed: 1050, speed0: 60, accel: 300, burn: 4.2, dragK: 0, turn: 1.9, life: 22, range: 10000, blast: 12, mass: 85, trail: 0.42, model: 'aam', grav: 1, lock: 'ground', fuel: 4 },
  cruise: { name: 'Standoff missile', type: 'missile', speed: 300, speed0: 120, accel: 40, burn: 30, dragK: 0, turn: 0.55, life: 60, range: 22000, blast: 30, mass: 650, trail: 0.7, model: 'cruise', grav: 0.15, lock: 'ground', fuel: 14 },
  // ---- bombs
  mk82: { name: 'GP bomb 227 kg', type: 'bomb', dragK: 4.6e-5, blast: 23, mass: 227, model: 'mk82', fuel: 8 },
  mk84: { name: 'GP bomb 900 kg', type: 'bomb', dragK: 3.3e-5, blast: 40, mass: 925, model: 'mk84', fuel: 14 },
  cluster: { name: 'Cluster bomb', type: 'bomb', dragK: 6e-5, blast: 7, mass: 340, model: 'cluster', cluster: { n: 18, spread: 52, height: 150 }, fuel: 2 },
  jug: { name: 'Moonshine jug', type: 'bomb', dragK: 0.0024, blast: 11, mass: 12, model: 'jug', fuel: 16 },
  propane: { name: 'Propane tank', type: 'bomb', dragK: 0.0019, blast: 21, mass: 22, model: 'propane', fuel: 30 },
  dart: { name: 'Lawn dart', type: 'bomb', dragK: 0.0003, blast: 4.8, mass: 2.5, model: 'dart', fuel: 3 },
  bomblet: { name: 'Bomblet', type: 'bomb', dragK: 0.0006, blast: 7, mass: 0, model: 'bomblet', fuel: 2, internal: true },
};

/* ------------------------------------------------------------------ model helpers: everything points along +x, centered on 0 */

/** Fins around a body: n = 4 gives a plus (or an X when diag). Positions are the root leading edge x, chord, tip chord, span, sweep. */
export function finSet(r, { x, chord, tip = chord * 0.5, span, sweep = chord * 0.5, r0 = 0.05, t = 0.012, mat, diag = false, md }) {
  const R = r0 + span, x0 = x - sweep - Math.max(chord, tip) - 0.01;
  r.fn(x0, -R, -R, x + 0.01, R, R, (px, py, pz, cell) => {
    const a = diag ? (py - pz) * 0.7071 : py, b = diag ? (py + pz) * 0.7071 : pz;
    const th = Math.max(t, cell * 0.9) * 0.5;
    let u;
    if (Math.abs(b) < th) u = Math.abs(a); else if (Math.abs(a) < th) u = Math.abs(b); else return 0;
    if (u < r0 * 0.6 || u > R) return 0;
    const s = Math.min(1, Math.max(0, (u - r0) / span));
    const xle = x - sweep * s, xte = xle - (chord + (tip - chord) * s);
    return px <= xle && px >= xte ? mat : 0;
  }, md ? { md } : undefined);
  return r;
}

/** A body of revolution about the x axis from stations [x, radius]; later stations override earlier overlaps cleanly. */
export function revolve(r, stations, mat, o) {
  r.loft('x', stations.map(([x, rad]) => ({ a: x, c1: 0, c2: 0, r1: rad, r2: rad, n: 2 })), mat, o);
  return r;
}

/** A painted ring on a body of revolution. */
export function band(r, x0, x1, rad, mat) {
  r.cyl('x', 0, 0, rad + 0.002, rad + 0.002, x0, x1, mat, { thin: true });
  return r;
}

const ogive = (x0, x1, r0, steps = 8, tipR = 0) => {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([x0 + (x1 - x0) * t, Math.max(tipR, r0 * Math.sqrt(Math.max(0, 1 - t * t * 0.96)) * (1 - t * 0.12))]);
  }
  return out;
};

/* ------------------------------------------------------------------ the models */
const BUILDERS = {
  /** Heat seeker or radar missile, 3 m, white with a black dome. */
  aam(r) {
    revolve(r, [[-1.5, 0.066], [1.15, 0.066]], M.AC_WHITE);
    revolve(r, ogive(1.15, 1.62, 0.066, 9, 0.012), M.AC_WHITE);
    revolve(r, ogive(1.46, 1.62, 0.036, 4, 0.012), M.AC_BLACK, { md: 0.06 });         // seeker window
    band(r, 0.55, 0.62, 0.066, M.AC_YELLOW); band(r, 0.7, 0.74, 0.066, M.AC_RED); band(r, -0.4, -0.36, 0.066, M.AC_YELLOW);
    band(r, -0.9, -0.86, 0.066, M.AC_BLACK);
    r.cyl('x', 0, 0, 0.06, 0.07, -1.56, -1.5, M.AC_EXHAUST, { md: 0.05 });
    r.cyl('x', 0, 0, 0.045, 0.045, -1.58, -1.5, M.AC_BLACK, { md: 0.04 });
    finSet(r, { x: 0.86, chord: 0.24, tip: 0.12, span: 0.15, sweep: 0.1, r0: 0.062, t: 0.01, mat: M.AC_GRAY_LIGHT, diag: false });   // canards
    finSet(r, { x: -0.62, chord: 0.62, tip: 0.2, span: 0.2, sweep: 0.3, r0: 0.062, t: 0.014, mat: M.AC_GRAY_LIGHT });               // wings
    finSet(r, { x: -1.3, chord: 0.3, tip: 0.18, span: 0.19, sweep: 0.16, r0: 0.062, t: 0.012, mat: M.AC_WHITE });                    // tail fins
    r.box(-0.5, 0.062, -0.014, 0.4, 0.092, 0.014, M.STEEL, { md: 0.03 });                                              // rail lug
    r.box(-0.4, -0.092, -0.012, -0.34, -0.06, 0.012, M.STEEL_DARK, { md: 0.03 });
  },
  /** Ground attack missile, 1.8 m, olive with a glass nose. */
  agm(r) {
    revolve(r, [[-0.9, 0.085], [0.78, 0.085]], M.AC_OLIVE);
    revolve(r, ogive(0.78, 1.0, 0.085, 7, 0.02), M.AC_OLIVE);
    r.ell(0.94, 0, 0, 0.1, 0.055, 0.055, M.AC_CANOPY, { md: 0.06 });
    band(r, 0.2, 0.26, 0.085, M.AC_YELLOW); band(r, 0.3, 0.32, 0.085, M.AC_WHITE); band(r, -0.5, -0.46, 0.085, M.AC_YELLOW);
    r.cyl('x', 0, 0, 0.07, 0.08, -0.95, -0.9, M.AC_EXHAUST, { md: 0.05 });
    finSet(r, { x: 0.32, chord: 0.5, tip: 0.3, span: 0.2, sweep: 0.12, r0: 0.08, t: 0.014, mat: M.AC_OLIVE, diag: true });
    finSet(r, { x: -0.7, chord: 0.22, tip: 0.14, span: 0.17, sweep: 0.1, r0: 0.08, t: 0.012, mat: M.AC_OLIVE, diag: true });
    r.box(-0.4, 0.083, -0.015, 0.4, 0.112, 0.015, M.STEEL_DARK, { md: 0.03 });
    r.box(0.5, 0.082, -0.05, 0.62, 0.095, 0.05, M.AC_BLACK, { md: 0.05 });
  },
  /** 70 mm rocket, 1.4 m. */
  hvar(r) {
    revolve(r, [[-0.7, 0.036], [0.52, 0.036]], M.AC_GRAY);
    revolve(r, ogive(0.52, 0.72, 0.036, 6, 0.004), M.AC_OLIVE);
    band(r, 0.3, 0.34, 0.036, M.AC_YELLOW); band(r, 0.36, 0.38, 0.036, M.AC_WHITE);
    r.cyl('x', 0, 0, 0.034, 0.03, -0.76, -0.7, M.AC_EXHAUST, { md: 0.04 });
    finSet(r, { x: -0.5, chord: 0.15, tip: 0.1, span: 0.07, sweep: 0.03, r0: 0.034, t: 0.008, mat: M.STEEL, diag: true, md: 0.05 });
  },
  /** 127 mm rocket, 2.0 m. */
  zuni(r) {
    revolve(r, [[-1.0, 0.063], [0.74, 0.063]], M.AC_WHITE);
    revolve(r, ogive(0.74, 1.04, 0.063, 7, 0.006), M.AC_GRAY_LIGHT);
    band(r, 0.3, 0.38, 0.063, M.AC_YELLOW); band(r, 0.45, 0.48, 0.063, M.AC_RED);
    r.cyl('x', 0, 0, 0.06, 0.05, -1.08, -1.0, M.AC_EXHAUST, { md: 0.04 });
    finSet(r, { x: -0.76, chord: 0.24, tip: 0.18, span: 0.13, sweep: 0.04, r0: 0.06, t: 0.01, mat: M.AC_GRAY, diag: false, md: 0.06 });
  },
  /** Standoff cruise missile with a fuselage, wings and a tail. */
  cruise(r) {
    revolve(r, [[-2.4, 0.2], [1.6, 0.2]], M.AC_GRAY_LIGHT);
    revolve(r, ogive(1.6, 2.5, 0.2, 9, 0.03), M.AC_GRAY_LIGHT);
    r.box(-0.1, 0.18, -0.12, 0.7, 0.3, 0.12, M.AC_GRAY, { md: 0.08 });          // inlet fairing
    band(r, 0.9, 1.05, 0.2, M.AC_BLACK); band(r, -1.4, -1.34, 0.2, M.AC_YELLOW);
    r.wing([0.2, 0.0, 0.18], 0.9, 0.55, 0.3, 0.3, 0, 0.05, 0.04, 1, M.AC_GRAY_LIGHT);
    r.wing([0.2, 0.0, -0.18], 0.9, 0.55, 0.3, 0.3, 0, 0.05, 0.04, -1, M.AC_GRAY_LIGHT);
    finSet(r, { x: -1.9, chord: 0.5, tip: 0.2, span: 0.38, sweep: 0.3, r0: 0.19, t: 0.02, mat: M.AC_GRAY_LIGHT, diag: true });
    r.cyl('x', 0, 0, 0.12, 0.14, -2.5, -2.4, M.AC_EXHAUST, { md: 0.05 });
  },
  /** General purpose bomb, 2.2 m, 270 mm, olive with a yellow band and a conical tail with fins. */
  mk82(r) {
    revolve(r, [[-0.62, 0.135], [0.5, 0.135]], M.AC_OLIVE);
    revolve(r, ogive(0.5, 1.1, 0.135, 8, 0.02), M.AC_OLIVE);
    revolve(r, [[-1.1, 0.07], [-0.9, 0.12], [-0.62, 0.135]], M.AC_OLIVE);
    band(r, 0.1, 0.18, 0.135, M.AC_YELLOW); band(r, 0.26, 0.29, 0.135, M.AC_YELLOW); band(r, -0.2, -0.16, 0.135, M.AC_YELLOW);
    r.cyl('x', 0.0, 0, 0.03, 0.03, 1.1, 1.18, M.STEEL_BRIGHT, { md: 0.05 });                // nose fuze
    r.box(-0.04, 0.133, -0.02, 0.04, 0.17, 0.02, M.STEEL_DARK, { md: 0.05 });              // lug
    r.box(-0.4, 0.133, -0.02, -0.32, 0.17, 0.02, M.STEEL_DARK, { md: 0.05 });
    // box fins, a ring around the tail cone
    finSet(r, { x: -0.7, chord: 0.46, tip: 0.46, span: 0.2, sweep: 0, r0: 0.1, t: 0.014, mat: M.AC_OLIVE, diag: true });
    r.cyl('x', 0, 0, 0.21, 0.21, -1.12, -1.04, M.AC_OLIVE, { thin: true, md: 0.08 });
    r.cyl('x', 0, 0, 0.19, 0.19, -1.1, -1.06, 0, { md: 0.08 });
  },
  /** 900 kg bomb. */
  mk84(r) {
    revolve(r, [[-1.0, 0.23], [0.9, 0.23]], M.AC_OLIVE);
    revolve(r, ogive(0.9, 1.9, 0.23, 9, 0.03), M.AC_OLIVE);
    revolve(r, [[-1.9, 0.11], [-1.5, 0.2], [-1.0, 0.23]], M.AC_OLIVE);
    band(r, 0.3, 0.42, 0.23, M.AC_YELLOW); band(r, 0.52, 0.56, 0.23, M.AC_YELLOW); band(r, -0.4, -0.34, 0.23, M.AC_YELLOW);
    r.cyl('x', 0, 0, 0.05, 0.05, 1.9, 2.02, M.STEEL_BRIGHT, { md: 0.06 });
    r.box(-0.08, 0.228, -0.03, 0.08, 0.28, 0.03, M.STEEL_DARK, { md: 0.06 });
    r.box(-0.62, 0.228, -0.03, -0.46, 0.28, 0.03, M.STEEL_DARK, { md: 0.06 });
    finSet(r, { x: -1.2, chord: 0.74, tip: 0.74, span: 0.34, sweep: 0, r0: 0.18, t: 0.02, mat: M.AC_OLIVE, diag: true });
    r.cyl('x', 0, 0, 0.36, 0.36, -1.94, -1.8, M.AC_OLIVE, { thin: true, md: 0.1 });
    r.cyl('x', 0, 0, 0.33, 0.33, -1.92, -1.82, 0, { md: 0.1 });
  },
  /** Cluster canister, 2.3 m, blue gray with a nose probe and a boat tail. */
  cluster(r) {
    revolve(r, [[-1.0, 0.2], [0.8, 0.2]], M.AC_GRAY);
    revolve(r, ogive(0.8, 1.2, 0.2, 6, 0.05), M.AC_GRAY);
    revolve(r, [[-1.15, 0.12], [-1.0, 0.2]], M.AC_GRAY);
    r.cyl('x', 0, 0, 0.015, 0.015, 1.18, 1.52, M.STEEL, { md: 0.05 });                       // proximity probe
    band(r, 0.2, 0.3, 0.2, M.AC_ORANGE); band(r, -0.3, -0.26, 0.2, M.AC_BLACK); band(r, 0.5, 0.54, 0.2, M.AC_BLACK);
    for (let i = 0; i < 6; i++) r.box(-0.8 + i * 0.28, 0.19, -0.1, -0.76 + i * 0.28, 0.21, 0.1, M.STEEL_DARK, { md: 0.05 });   // hatch seams
    finSet(r, { x: -0.95, chord: 0.3, tip: 0.3, span: 0.22, sweep: 0, r0: 0.15, t: 0.016, mat: M.AC_GRAY, diag: true });
    r.box(-0.04, 0.198, -0.03, 0.06, 0.24, 0.03, M.STEEL_DARK, { md: 0.06 });
  },
  /** One bomblet of a cluster: a little finned can. */
  bomblet(r) {
    revolve(r, [[-0.18, 0.05], [0.14, 0.05]], M.AC_ORANGE);
    revolve(r, ogive(0.14, 0.26, 0.05, 4, 0.01), M.AC_ORANGE);
    band(r, -0.02, 0.04, 0.05, M.AC_BLACK);
    finSet(r, { x: -0.14, chord: 0.1, tip: 0.1, span: 0.07, sweep: 0, r0: 0.045, t: 0.008, mat: M.AC_BLACK, diag: true });
  },
  /** A glass soda bottle with a stick: the hillbilly rocket. Glass body, bottle cap, a coat hanger fin set, a taped stick. */
  bottle(r) {
    revolve(r, [[-0.1, 0.034], [0.07, 0.036], [0.13, 0.034], [0.16, 0.018], [0.26, 0.015], [0.28, 0.019]], M.GLASS_GREEN);
    r.cyl('x', 0, 0, 0.02, 0.02, 0.28, 0.3, M.RUST, { md: 0.04 });
    r.cyl('x', 0, 0, 0.03, 0.03, -0.1, -0.095, M.AC_BLACK, { md: 0.03 });
    r.box(-0.04, -0.008, -0.01, 0.1, 0.008, 0.01, M.PAINT_WHITE, { md: 0.03 });                 // label
    // the stick, taped on, running well back past the tail
    r.box(-1.2, -0.05, -0.008, 0.06, -0.034, 0.008, M.WOOD_MID, { md: 0.07 });
    r.box(-0.02, -0.056, -0.012, 0.02, -0.03, 0.012, M.STEEL_BRIGHT, { md: 0.03 });
    r.box(-0.09, -0.056, -0.012, -0.06, -0.03, 0.012, M.STEEL_BRIGHT, { md: 0.03 });
    r.box(-0.45, 0.03, -0.003, -0.1, 0.037, 0.003, M.STEEL, { md: 0.03 });                       // the fuse, a wire
  },
  /** A toilet plunger on a broom handle strapped to a coffee can motor. The cup is the warhead and it is red. */
  plunger(r) {
    r.cyl('x', 0, 0, 0.05, 0.05, -0.5, 0.18, M.STEEL);                                         // the can
    band(r, -0.4, -0.3, 0.05, M.PAINT_YELLOW); band(r, -0.06, 0.0, 0.05, M.RUST);
    r.cyl('x', 0, 0, 0.04, 0.04, -0.54, -0.5, M.AC_EXHAUST, { md: 0.04 });
    r.cyl('x', 0, 0, 0.012, 0.012, 0.18, 0.62, M.WOOD_LIGHT, { md: 0.07 });                    // handle
    r.cyl('x', 0, 0, 0.012, 0.012, -0.9, -0.5, M.WOOD_LIGHT, { md: 0.07 });                    // handle, the other way, as a tail
    r.cyl('x', 0, 0, 0.026, 0.1, 0.5, 0.64, M.AC_RED, { md: 0.07 });                           // rubber cup
    r.cyl('x', 0, 0, 0.082, 0.082, 0.6, 0.64, 0, { md: 0.04 });
    r.box(-0.82, -0.1, -0.004, -0.62, 0.1, 0.004, M.WOOD_WEATHERED, { md: 0.05 });             // plywood fins
    r.box(-0.82, -0.004, -0.1, -0.62, 0.004, 0.1, M.WOOD_WEATHERED, { md: 0.05 });
  },
  /** A stoneware jug, three X marks and a cork. */
  jug(r) {
    r.ell(0, 0, 0, 0.17, 0.22, 0.17, M.WOOD_MID);                                              // glazed brown
    r.cyl('y', 0, 0, 0.065, 0.045, 0.2, 0.34, M.WOOD_MID);
    r.cyl('y', 0, 0, 0.05, 0.05, 0.34, 0.38, M.WOOD_LIGHT, { md: 0.03 });                      // cork
    r.box(-0.1, 0.24, -0.02, 0.1, 0.27, 0.02, M.WOOD_DARK, { md: 0.03 });
    r.box(0.1, 0.16, -0.025, 0.2, 0.3, 0.025, M.WOOD_MID, { md: 0.04 });                       // handle
    r.paint(0.1, -0.15, -0.16, 0.19, 0.1, 0.16, (x, y, z) => (Math.abs(y - 0.02) < 0.018 && Math.abs(Math.abs(z) % 0.08 - 0.04) < 0.02 ? M.AC_BLACK : 0), { thin: true, md: 0.03 });
    for (const dz of [-0.07, 0, 0.07]) { r.box(0.15, -0.03, dz - 0.012, 0.18, 0.07, dz + 0.012, M.AC_BLACK, { md: 0.03 }); }
  },
  /** A barbecue propane cylinder with a collar, a valve and a foot ring. */
  propane(r) {
    revolve(r, [[-0.3, 0.0], [-0.28, 0.1], [-0.2, 0.15], [-0.1, 0.17], [0.2, 0.17], [0.3, 0.15], [0.34, 0.1], [0.36, 0.0]], M.TANK_WHITE);
    r.cyl('x', 0, 0, 0.12, 0.12, -0.34, -0.26, M.STEEL_DARK, { md: 0.04 });                    // foot ring
    r.cyl('x', 0, 0, 0.08, 0.08, 0.34, 0.4, M.STEEL, { md: 0.04 });                            // collar
    r.cyl('x', 0, 0, 0.045, 0.045, 0.4, 0.46, M.RUST, { md: 0.04 });                           // valve
    r.box(0.38, 0.0, -0.1, 0.44, 0.04, 0.1, M.AC_RED, { md: 0.04 });                            // handwheel
    band(r, -0.04, 0.0, 0.17, M.AC_RED); band(r, 0.1, 0.14, 0.17, M.AC_RED);
    r.box(-0.02, 0.17, -0.1, 0.02, 0.19, 0.1, M.STEEL_DARK, { md: 0.04 });
  },
  /** A lawn dart: a steel tip, a rubber sleeve, three plastic fins. */
  dart(r) {
    r.cyl('x', 0, 0, 0.012, 0.012, 0.1, 0.42, M.STEEL_BRIGHT);
    r.cyl('x', 0, 0, 0.0, 0.012, 0.42, 0.5, M.STEEL_BRIGHT);
    r.cyl('x', 0, 0, 0.028, 0.028, -0.1, 0.1, M.AC_YELLOW);
    r.cyl('x', 0, 0, 0.012, 0.012, -0.4, -0.1, M.AC_YELLOW);
    finSet(r, { x: -0.1, chord: 0.2, tip: 0.1, span: 0.09, sweep: 0.04, r0: 0.02, t: 0.01, mat: M.AC_RED, diag: false });
  },
  /** A potato. */
  spud(r) {
    r.ell(0, 0, 0, 0.11, 0.07, 0.075, M.PAINT_YELLOW);
    r.paint(-0.12, -0.08, -0.08, 0.12, 0.08, 0.08, (x, y, z) => (((x * 53 + z * 31 + y * 17) % 0.07 + 0.07) % 0.07 < 0.012 ? M.WOOD_MID : 0), { md: 0.03 });
  },
};

const cache = new Map();

/** The recipe of a munition model (shared; never modified). */
export function munitionRecipe(model) {
  let r = cache.get(model);
  if (!r) {
    const b = BUILDERS[model];
    if (!b) throw new Error('unknown munition model ' + model);
    r = new Recipe();
    b(r);
    cache.set(model, r);
  }
  return r;
}

export const MUNITION_MODELS = Object.keys(BUILDERS);

/** A weapon of an aircraft with the numbers of its munition filled in. */
export function resolveWeapon(w) {
  const m = MUNITIONS[w.munition];
  if (!m) throw new Error(`weapon ${w.id}: unknown munition ${w.munition}`);
  return { ...m, ...w, type: w.type || m.type };
}

/** Mass of everything carried on stations, kg: it rides in the payload and leaves the aircraft one store at a time. */
export function storesMass(spec) {
  let m = 0;
  for (const w of spec.weapons || []) {
    const d = MUNITIONS[w.munition];
    if (!d) continue;
    const mass = w.mass ?? d.mass ?? 0;
    const n = (w.stations || []).length;
    const type = w.type || d.type;
    if (type === 'rocket') m += n * (w.rounds ?? 1) * mass;
    else if (type !== 'gun') m += n * mass;
  }
  return m;
}
