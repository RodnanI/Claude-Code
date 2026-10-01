import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { munitionRecipe } from '../munitions.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, pilot, fanFace, nozzle, store } from '../builders/detail.js';
import { wingDef, wingSurface, loftSurface, finStations, finAt } from '../builders/surfaces.js';

/* Thunderbox TB-1: a two-seat-less outhouse with a surplus jet engine strapped to the roof, plywood wings bolted through the
   walls and a barn door for a rudder. The pilot sits on the throne and flies through the open front. The chain is the throttle,
   the plunger is the stick, and the crescent moon on the side is there to let the smell out. It should not fly. It does. */

const WOOD = M.WOOD_WEATHERED, PLANK = M.WOOD_LIGHT, WOODM = M.WOOD_MID, WOODD = M.WOOD_DARK, TIN = M.STEEL, TINB = M.STEEL_BRIGHT, RUST = M.RUST, DARK = M.STEEL_DARK;
const roofY = (x) => 1.3 + (x + 0.7) * 0.16;         // the shed roof slopes up toward the front

const WR = wingDef([0.55, 0.5, 0.62], 2.5, 1.9, 1.3, 0.2, 0.1, 0.1, 0.09, 1);
const WL = wingDef([0.55, 0.5, -0.62], 2.5, 1.9, 1.3, 0.2, 0.1, 0.1, 0.09, -1);
const ST = (s) => wingDef([-3.55, 0.55, s * 0.08], 1.6, 0.95, 0.8, 0.05, 0, 0.07, 0.07, s);
const FIN = { x: -3.5, y: 0.3, chord: 1.1, tip: 0.8, height: 2.1, sweep: 0.3, thick: 0.04 };

/** Vertical plank seams on a wall: dark hairlines every plank width, with the odd board a shade off. */
const planks = (u, w = 0.18) => { const k = Math.floor(u / w), f = u - k * w; return f < 0.022 ? WOODD : (k * 7) % 5 === 0 ? PLANK : 0; };

export default defineAircraft({
  id: 'thunderbox',
  name: 'Thunderbox TB-1',
  manufacturer: 'Uncle Dwayne Surplus',
  role: 'Flying outhouse',
  category: 'homebuilt',
  order: 11,
  difficulty: 5,
  tags: ['Jet on a roof', 'Outhouse', 'Bottle rockets', 'Bad idea'],
  description: 'A jet engine from a target drone is strapped to the roof of a three-hole privy and the whole thing is bolted to some plywood wings. There is a plunger for a stick and a pull chain for a throttle. Nobody has ever explained why it works. It is fast, loud and smells like victory.',
  voxel: 0.04,
  interiorVoxel: 0.02,
  lodLevels: 4,
  mass: { empty: 620, fuel: 120, payload: 100 },
  inertia: [520, 1400, 1100],
  wing: { area: 9.6, span: 6.4, chord: 1.6, y: 0.5 },
  aero: {
    CL0: 0.25, CLa: 4.2, CLmax: 1.35, alphaStall: 0.3, CD0: 0.1, k: 0.085, CDflap: 0, CLflap: 0, Cmflap: 0, CLmaxFlap: 0, CDgear: 0.03, CDair: 0.1,
    Cm0: 0.02, Cma: -0.7, Cmq: -10, Clb: 0.07, Clp: -0.5, Cnb: 0.11, Cnr: -0.15, Cyb: 0.5, Cnda: 0.03,
    machDrag: 0.05, machCrit: 0.7, spin: 0.05, stallPitchDown: 0.06,
    control: { elevator: 0.55, aileron: 0.07, rudder: 0.05 },
  },
  propulsion: { type: 'jet', thrust: 7600, fuelBurn: 0.12, idleRpm: 40, spool: 0.9 },
  gear: {
    retractable: false,
    wheels: [
      { pos: [1.25, -1.2, 0], radius: 0.12, k: 18000, c: 1500, steer: 0.6, cornering: 0.7, travel: 0.1 },
      { pos: [-0.55, -1.1, -0.95], radius: 0.3, k: 45000, c: 3500, brake: true, travel: 0.15 },
      { pos: [-0.55, -1.1, 0.95], radius: 0.3, k: 45000, c: 3500, brake: true, travel: 0.15 },
    ],
  },
  skids: [
    { p: [1.3, -0.95, 0], kind: 'nose' }, { p: [-4.5, 0.35, 0], kind: 'tail' }, { p: [0.2, 0.5, 3.1], kind: 'tip' }, { p: [0.2, 0.5, -3.1], kind: 'tip' },
    { p: [-0.2, -1.0, 0], kind: 'belly' }, { p: [-4.1, 2.4, 0], kind: 'tail' }, { p: [-0.2, 2.2, 0], kind: 'tail' },
  ],
  limits: { vne: 125, maxG: 3.5, minG: 1.0, flapSpeed: 999, gearSpeed: 999, crashVs: 5.5 },
  cameras: { cockpit: [0.12, 0.55, 0], chase: { distance: 15, height: 3.6 }, near: { distance: 7.5, height: 2.0 } },
  liveries: [
    { id: 'default', name: 'Weathered' },
    { id: 'red', name: 'Barn red', remap: { WOOD_WEATHERED: 'PAINT_BARN_RED' } },
    { id: 'white', name: 'Whitewash', remap: { WOOD_WEATHERED: 'PAINT_WHITE', WOOD_LIGHT: 'AC_CREAM' } },
    { id: 'camo', name: 'Deer season', remap: { WOOD_WEATHERED: 'MIL_OLIVE', WOOD_LIGHT: 'MIL_TAN' } },
  ],
  stations: [
    { id: 'rkL', pos: [0.5, 0.3, -1.55], kind: 'rack' }, { id: 'rkR', pos: [0.5, 0.3, 1.55], kind: 'rack' },
    { id: 'propL', pos: [0.2, 0.2, -2.5], kind: 'rack' }, { id: 'propR', pos: [0.2, 0.2, 2.5], kind: 'rack' },
  ],
  weapons: [
    { id: 'spud', name: 'PVC potato cannon', type: 'gun', munition: 'spud', ammo: 40, rate: 2.2, muzzle: [1.65, 1.5, 0.52], spread: 0.016, flash: 0.5 },
    { id: 'bottles', name: 'Bottle rockets', type: 'rocket', munition: 'bottle', stations: ['rkL', 'rkR'], rounds: 10, muzzleX: 0.9, tube: 0.1 },
    { id: 'propane', name: 'Propane tank', type: 'bomb', munition: 'propane', stations: ['propL', 'propR'] },
  ],
  animations: [
    { part: 'aileronL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.5 },
    { part: 'aileronR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.5 },
    { part: 'elevatorL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.5 },
    { part: 'elevatorR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.5 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.55 },
    { part: 'door', type: 'rotate', axis: [0, 1, 0], channel: 'iasKnots', gain: -0.0075, offset: 1.85 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 1, 0], channel: 'steer', gain: -1 },
    { part: 'wheelL', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelR', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'wheelNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'wheelL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'wheelR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.4 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.4 },
    { part: 'chain', type: 'translate', axis: [0, 1, 0], channel: 'throttle', gain: -0.22 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0204, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'nRPM', type: 'rotate', axis: [1, 0, 0], channel: 'rpm', gain: 0.0006, offset: -2.3 },
  ],
  model(k) {
    const body = k.part('body');
    const FINE = { md: 0.09 };
    // ------------------------------------------------------------------ the privy: a plank floor on two skids, plank walls, a front that is mostly gone
    body.box(-1.25, -1.0, -0.5 - 0.06, 1.35, -0.9, -0.5 + 0.06, WOODD);                                   // skids
    body.box(-1.25, -1.0, 0.5 - 0.06, 1.35, -0.9, 0.5 + 0.06, WOODD);
    body.box(-1.0, -0.9, -0.76, 1.05, -0.8, 0.76, WOODM);                                                  // the deck
    for (const s of [-1, 1]) {
      const z0 = s > 0 ? 0.56 : -0.66, z1 = s > 0 ? 0.66 : -0.56;
      body.fn(-0.72, -0.82, z0, 0.72, 1.7, z1, (x, y) => (y <= roofY(x) - 0.01 ? WOOD : 0));            // side wall with a sloping top
    }
    body.fn(-0.76, -0.82, -0.66, -0.62, 1.7, 0.66, (x, y) => (y <= roofY(x) - 0.01 ? WOOD : 0));          // back wall
    body.box(0.64, -0.8, -0.65, 0.72, -0.4, 0.65, WOOD);                                                   // the lower front plank wall and the panel
    body.box(0.64, 1.38, -0.65, 0.72, roofY(0.7) - 0.01, 0.65, WOOD);                                      // the lintel
    for (const s of [-1, 1]) body.box(0.64, -0.4, s * 0.45, 0.72, 1.4, s * 0.65, WOOD);                    // the jambs
    // planks
    body.paint(-0.8, -0.9, -0.7, 0.8, 1.7, 0.7, (x, y, z) => {
      if (Math.abs(z) > 0.61 && x > -0.74) return planks(x + 0.74);                                      // side walls, outer layer
      if (x < -0.66 && Math.abs(z) < 0.62) return planks(z + 0.7);                                       // back wall, outer layer
      return 0;
    }, { thin: true, md: 0.1 });
    // crescent moons: a see-through window on each side and one in the back wall, to let the air through
    const moon = (u, v) => Math.hypot(u, v) < 0.3 && Math.hypot(u - 0.11, v + 0.03) > 0.25;
    body.fn(-0.4, 0.5, -0.7, 0.4, 1.2, -0.5, (x, y) => (moon(x, y - 0.85) ? -1 : 0), FINE);
    body.fn(-0.4, 0.5, 0.5, 0.4, 1.2, 0.7, (x, y) => (moon(x, y - 0.85) ? -1 : 0), FINE);
    body.fn(-0.8, 0.5, -0.4, -0.55, 1.2, 0.4, (x, y, z) => (moon(z, y - 0.85) ? -1 : 0), FINE);
    // the tin roof: corrugated, a little rust, a rolled edge
    body.fn(-0.98, 1.2, -0.88, 0.98, 1.7, 0.88, (x, y, z) => {
      const t = roofY(x);
      if (y < t - 0.01 || y > t + 0.07) return 0;
      const rib = Math.floor((z + 1) / 0.11) % 2;
      return (Math.floor(z * 9) * 3 + Math.floor(x * 6)) % 7 === 0 ? RUST : rib ? TIN : TINB;
    });
    strut(body, [-0.65, roofY(-0.65) + 0.02, 0.45], [-0.6, 2.35, 0.45], 0.1, DARK);                       // a stovepipe vent with a rain cap
    body.ell(-0.6, 2.4, 0.45, 0.14, 0.05, 0.14, TIN, { md: 0.1 });
    // ------------------------------------------------------------------ the engine on the roof: a drone turbojet in a plank cradle, strapped down, with cans of gas
    const ey = 1.82;
    body.cyl('x', ey, 0, 0.34, 0.34, -1.5, 0.62, M.AC_GRAY);
    body.cyl('x', ey, 0, 0.3, 0.3, -2.15, -1.5, M.AC_GRAY_DARK);
    body.cyl('x', ey, 0, 0.36, 0.36, 0.1, 0.2, TINB, { thin: true });
    for (const x of [-0.9, -0.2, 0.4]) body.cyl('x', ey, 0, 0.36, 0.36, x, x + 0.07, RUST, { thin: true });                 // hose clamps
    body.cyl('x', ey, 0, 0.35, 0.35, -1.15, -1.0, M.AC_METAL, { thin: true });
    for (const s of [-1, 1]) {
      body.box(-1.6, 1.38, s * 0.2 - 0.04, 0.5, 1.5, s * 0.2 + 0.04, WOODM);                                // the cradle, two rails
      body.box(-0.4, ey - 0.45, s * 0.38 - 0.02, -0.34, ey + 0.4, s * 0.38 + 0.02, M.AC_BLACK);              // ratchet straps
      body.box(0.2, ey - 0.45, s * 0.38 - 0.02, 0.26, ey + 0.4, s * 0.38 + 0.02, M.AC_BLACK);
      body.cyl('x', ey + 0.12, s * 0.48, 0.11, 0.11, -0.2, 0.28, M.AC_RED, { md: 0.1 });                    // a gas can per side
      body.box(-0.1, ey + 0.2, s * 0.48 - 0.03, 0.16, ey + 0.27, s * 0.48 + 0.03, M.STEEL_BRIGHT, { md: 0.1 });
    }
    fanFace(body, 0.62, ey, 0, 0.3, { depth: 0.9, rec: 0.2, blades: 16 });
    nozzle(body, -2.2, ey, 0, 0.26, { len: 0.55, petals: 10 });
    // ------------------------------------------------------------------ plywood wings bolted through the walls, a boom of fence posts and a barn door tail
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, WOODM);
    for (const s of [-1, 1]) {
      const st = ST(s); body.wing(st.root, st.span, st.cr, st.ct, st.sweep, st.dih, st.tr, st.tt, s, WOODM);
      strut(body, [0.2, 0.47, s * 1.9], [0.0, -0.85, s * 0.7], 0.06, M.RUST_DARK, { md: 0.2 });                // wing struts, rusty pipe
      strut(body, [-0.6, 0.47, s * 1.9], [-0.7, -0.85, s * 0.7], 0.06, M.RUST_DARK, { md: 0.2 });
      strut(body, [0.2, 0.52, s * 2.6], [0.4, 1.0, s * 0.64], 0.025, DARK, { md: 0.08 });                    // a cable up to the roof edge
      body.paint(-2.0, 0.2, s > 0 ? 0.62 : -3.2, 0.6, 0.9, s > 0 ? 3.2 : -0.62, (x, y, z) => {                // plywood sheets: seams and the odd rust bloom
        const b = Math.floor(Math.abs(z) / 0.31), f = Math.abs(z) / 0.31 - b;
        return f < 0.05 ? WOODD : (b * 5) % 7 === 0 ? RUST : 0;
      }, { thin: true, md: 0.12 });
    }
    body.box(-4.4, 0.2, -0.09, -0.62, 0.38, 0.09, WOODM);                                                  // the tail boom: a pair of fence posts
    strut(body, [-0.8, 1.2, 0], [-3.6, 0.4, 0], 0.07, WOODD, { md: 0.12 });
    strut(body, [-3.2, 0.3, 0.0], [-2.0, 1.25, 0.0], 0.05, DARK, { md: 0.1 });
    body.loft('y', finStations(FIN), WOOD, { thin: true });                                                 // the fin is a barn door with a Z brace
    body.paint(-4.7, 0.3, -0.1, -3.3, 2.5, 0.1, (x, y) => {
      if (Math.abs((y - 0.3) - (-3.45 - x) * 1.55) < 0.07 && y > 0.5 && y < 2.2 && x > -4.55 && x < -3.5) return PLANK;   // the Z brace
      return Math.abs(((x + 4.7) % 0.17) - 0.08) < 0.01 ? WOODD : 0;
    }, { thin: true, md: 0.1 });
    decal(body, 'DWAYNE', { x: -0.0, y: 0.1, side: 1, px: 0.05, mat: M.AC_RED, z0: 0.63, z1: 0.7 });
    decal(body, 'DWAYNE', { x: -0.0, y: 0.1, side: -1, px: 0.05, mat: M.AC_RED, z0: 0.63, z1: 0.7 });
    decal(body, 'TB-1', { x: -4.05, y: 1.5, side: 1, px: 0.07, mat: M.AC_WHITE, z0: 0.02, z1: 0.2 });
    decal(body, 'TB-1', { x: -4.05, y: 1.5, side: -1, px: 0.07, mat: M.AC_WHITE, z0: 0.02, z1: 0.2 });
    // ------------------------------------------------------------------ the potato cannon: a PVC pipe taped along the roof edge
    const sp = k.part('spudGun');
    sp.cyl('x', 1.42, 0.52, 0.07, 0.07, -0.5, 1.7, M.AC_WHITE, { thin: true });
    sp.cyl('x', 1.42, 0.52, 0.04, 0.04, 1.55, 1.72, 0, { md: 0.04 });
    sp.cyl('x', 1.42, 0.52, 0.09, 0.09, -0.52, -0.38, M.AC_GRAY_DARK, { md: 0.06 });
    for (const x of [-0.1, 0.4, 0.9]) sp.cyl('x', 1.42, 0.52, 0.078, 0.078, x, x + 0.06, M.AC_GRAY_LIGHT, { thin: true, md: 0.06 });   // duct tape
    sp.box(-0.3, 1.5, 0.5, -0.2, 1.62, 0.54, M.AC_RED, { md: 0.04 });                                     // the igniter button
    // ------------------------------------------------------------------ the front door, hanging on one hinge and blowing back when you speed up
    const dr = k.part('door', { pivot: [0.72, 0, -0.46], hideInCockpit: true });
    dr.box(0.66, -0.4, -0.46, 0.72, 1.4, 0.46, PLANK, { thin: true });
    for (let i = 0; i < 6; i++) dr.box(0.655, -0.4, -0.46 + i * 0.1533, 0.665, 1.4, -0.46 + i * 0.1533 + 0.012, WOODD, { md: 0.06 });
    dr.fn(0.64, 0.4, -0.35, 0.74, 1.3, 0.35, (x, y, z) => (moon(z, y - 0.85) ? -1 : 0), FINE);
    dr.box(0.725, 0.2, -0.46, 0.745, 0.3, 0.46, WOODD);
    dr.box(0.725, 1.0, -0.46, 0.745, 1.1, 0.46, WOODD);
    dr.box(0.74, 0.5, 0.3, 0.77, 0.58, 0.44, M.STEEL_BRIGHT, { md: 0.06 });                                // the hasp
    // ------------------------------------------------------------------ control surfaces: ailerons, elevators and a barn door rudder
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      wingSurface(k, body, 'aileron' + n, W, { z0: 1.7, z1: 3.1, frac: 0.3, mat: WOODM });
      wingSurface(k, body, 'elevator' + n, ST(s), { z0: 0.15, z1: 1.65, frac: 0.42, mat: PLANK });
    }
    const hinge = finAt(FIN, 1.2);
    loftSurface(k, body, 'rudder', {
      stations: finStations(FIN), axis: 'y', mat: PLANK, box: [-4.8, 0.3, -0.2, -3.0, 2.5, 0.2],
      aft: (x, y) => { const a = finAt(FIN, y); return x < a.te + a.chord * 0.42; },
      pivot: [hinge.te + hinge.chord * 0.42, 1.2, 0],
    });
    // ------------------------------------------------------------------ gear: a shopping cart wheel in front, two tractor wheels behind
    const gn = k.part('gearNose');
    strut(gn, [1.15, -0.9, 0], [1.25, -1.2, 0], 0.06, DARK);
    gn.box(1.1, -1.2, -0.1, 1.4, -1.15, 0.1, DARK, { md: 0.06 });
    wheel(k.part('wheelNose', { pivot: [1.25, -1.2, 0], local: true }), 0, 0, 0, 0.12, 0.08);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n);
      strut(g, [-0.55, -0.9, s * 0.62], [-0.55, -1.1, s * 0.95], 0.12, DARK);
      strut(g, [-0.9, -0.9, s * 0.65], [-0.55, -1.1, s * 0.95], 0.05, RUST, { md: 0.08 });
      wheel(k.part('wheel' + n, { pivot: [-0.55, -1.1, s * 0.95], local: true }), 0, 0, 0, 0.3, 0.2, M.TIRE, M.RUST);
    }
    // ------------------------------------------------------------------ stores: milk crates of bottle rockets, propane tanks, the pilot on his throne
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const crate = k.part('crate' + n, { visibleWhen: 'store_rk' + n, voxel: 0.02 });
      crate.box(0.1, 0.12, s * 1.55 - 0.3, 0.9, 0.16, s * 1.55 + 0.3, M.CONTAINER_BLUE);
      crate.box(0.1, 0.12, s * 1.55 - 0.3, 0.14, 0.5, s * 1.55 + 0.3, M.CONTAINER_BLUE, { md: 0.04 });
      crate.box(0.86, 0.12, s * 1.55 - 0.3, 0.9, 0.5, s * 1.55 + 0.3, M.CONTAINER_BLUE, { md: 0.04 });
      for (const zs of [-0.3, 0.3]) crate.box(0.1, 0.12, s * 1.55 + zs - 0.02, 0.9, 0.5, s * 1.55 + zs + 0.02, M.CONTAINER_BLUE);
      const bt = munitionRecipe('bottle');
      for (let i = 0; i < 8; i++) crate.stamp(bt, 0.5 + (i % 2) * 0.05, 0.22 + Math.floor(i / 4) * 0.12 + 0.06, s * 1.55 - 0.24 + (i % 4) * 0.16, 0);
      strut(body, [0.5, 0.2, s * 1.55], [0.4, 0.55, s * 1.7], 0.03, DARK, { md: 0.1 });
      store(k, 'propane' + n, 'prop' + n, 'propane', [0.2, 0.0, s * 2.5], { voxel: 0.03125 });
      strut(body, [0.2, 0.12, s * 2.5], [0.2, 0.45, s * 2.5], 0.03, DARK, { md: 0.1 });
    }
    const pl = k.part('pilotFigure', { hideInCockpit: true });
    pilot(pl, -0.35, -0.15, { hands: [[0.35, 0.18, -0.2], [0.35, 0.1, 0.2]], feet: 0.5, suit: M.PAINT_BLUEGRAY, helmet: M.HAY, visor: M.PLASTER_TERRA, vest: M.PAINT_ORANGE });
  },
  interior(k) {
    // ------------------------------------------------------------------ inside the privy (2 cm): floor planks, the throne, a cistern with a pull chain
    const c = k.interior('cabin');
    c.box(-0.6, -0.8, -0.56, 0.64, -0.76, 0.56, WOODM);                                                    // floor planks
    for (let i = 0; i < 8; i++) c.box(-0.6, -0.76, -0.58 + i * 0.145, 0.64, -0.755, -0.58 + i * 0.145 + 0.012, WOODD, { md: 0.04 });
    const P = M.PAINT_WHITE;
    c.box(-0.6, -0.76, -0.38, -0.08, -0.26, 0.38, P);                                                      // the throne
    c.box(-0.6, -0.26, -0.4, -0.06, -0.22, 0.4, P);
    c.box(-0.58, -0.22, -0.34, -0.1, -0.19, 0.34, M.WOOD_LIGHT);                                               // the seat
    c.fn(-0.45, -0.24, -0.2, -0.2, -0.17, 0.2, (x, y, z) => (Math.pow((x + 0.325) / 0.125, 2) + Math.pow(z / 0.17, 2) < 1 ? -1 : 0));   // the round hole
    c.box(-0.6, -0.19, -0.3, -0.56, 0.4, 0.3, P);                                                          // lid, up
    c.box(-0.6, 0.2, -0.3, -0.56, 0.22, 0.3, M.AC_CREAM);
    c.box(-0.62, 0.9, -0.22, -0.45, 1.16, 0.22, M.AC_METAL);                                               // the high cistern
    c.box(-0.62, 1.16, -0.2, -0.44, 1.2, 0.2, TIN);
    strut(c, [-0.55, 0.9, 0.0], [-0.5, -0.2, 0.0], 0.05, M.AC_METAL, { md: 0.04 });                       // the flush pipe
    c.cyl('z', 0.1, -0.3, 0.09, 0.09, -0.56, -0.4, M.AC_WHITE, { md: 0.03 });                              // a roll of tissue on its spindle
    c.cyl('z', 0.1, -0.3, 0.035, 0.035, -0.57, -0.4, M.WOOD_LIGHT, { md: 0.03 });
    c.box(-0.2, 0.55, -0.56, 0.1, 0.78, -0.545, M.PAINT_WHITE, { md: 0.04 });                              // a hunting calendar
    c.box(-0.19, 0.58, -0.55, 0.09, 0.7, -0.54, M.PAINT_GREEN, { md: 0.04 });
    c.box(-0.5, 0.0, 0.5, -0.1, 0.04, 0.56, WOODD, { md: 0.04 });                                        // a shelf with the catalog
    c.box(-0.45, 0.04, 0.5, -0.18, 0.1, 0.55, M.PAINT_YELLOW, { md: 0.04 });
    // the pine tree air freshener, swinging from the lintel
    c.box(0.55, 1.2, 0.28, 0.58, 1.38, 0.31, M.AC_BLACK, { md: 0.02 });
    c.box(0.54, 0.95, 0.24, 0.6, 1.2, 0.35, M.PAINT_GREEN, { md: 0.03 });
    // ------------------------------------------------------------------ the pull chain: a handle at the end of a chain that goes up through the roof
    const ch = k.interior('chain', { pivot: [-0.5, 0.9, -0.2], local: true, voxel: 0.01 });
    for (let i = 0; i < 18; i++) ch.box(-0.008, -0.03 * i - 0.025, -0.008 + (i & 1) * 0.004, 0.008, -0.03 * i, 0.008, M.STEEL_BRIGHT, { md: 0.012 });
    ch.box(-0.03, -0.58, -0.02, 0.03, -0.64, 0.02, WOODD);
    ch.box(-0.04, -0.62, -0.03, 0.04, -0.7, 0.03, M.AC_WHITE);
    // ------------------------------------------------------------------ the dash: a plank with salvaged gauges
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(0.55, -0.4, -0.55, 0.64, 0.58, 0.55, WOODM);
    pn.box(0.5, 0.54, -0.55, 0.64, 0.58, 0.55, WOODD);
    const gx = 0.55;
    gauge(pn, gx, 0.38, -0.3, 0.075); gauge(pn, gx, 0.38, 0.0, 0.065); gauge(pn, gx, 0.38, 0.3, 0.075);
    needle(k.interior('nASI', { pivot: [gx - 0.028, 0.38, -0.3], local: true, voxel: 0.004 }), 0.06, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [gx - 0.028, 0.38, 0.0], local: true, voxel: 0.004 }), 0.052, M.NEEDLE_ORANGE);
    needle(k.interior('nRPM', { pivot: [gx - 0.028, 0.38, 0.3], local: true, voxel: 0.004 }), 0.06, M.NEEDLE_ORANGE);
    pn.box(gx - 0.02, 0.1, -0.2, gx, 0.26, -0.02, M.AC_BLACK);                                              // a beer thermometer for fuel
    pn.box(gx - 0.025, 0.12, -0.12, gx - 0.015, 0.2, -0.1, M.AC_RED, { md: 0.01 });
    pn.cyl('x', 0.18, 0.2, 0.04, 0.04, gx - 0.03, gx, M.AC_RED, { md: 0.02 });                               // the big red button
    pn.cyl('x', 0.18, 0.34, 0.025, 0.025, gx - 0.02, gx, M.AC_BLACK, { md: 0.02 });
    pn.box(gx - 0.04, 0.02, -0.5, gx - 0.012, 0.06, -0.3, M.AC_YELLOW, { md: 0.02 });                       // electrical tape
    for (let i = 0; i < 5; i++) pn.box(gx - 0.02, 0.26, -0.5 + i * 0.07, gx - 0.008, 0.28, -0.47 + i * 0.07, i === 2 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });
    // ------------------------------------------------------------------ the plunger stick and two cedar blocks for pedals
    const st = k.interior('stick', { pivot: [0.3, -0.76, 0], local: true, voxel: 0.01 });
    st.cyl('y', 0, 0, 0.018, 0.018, 0, 0.55, M.WOOD_LIGHT);
    st.cyl('y', 0, 0, 0.1, 0.03, 0.5, 0.64, M.AC_RED, { md: 0.015 });
    st.cyl('y', 0, 0, 0.082, 0.082, 0.58, 0.64, 0, { md: 0.01 });
    for (const [n, z] of [['pedalL', -0.2], ['pedalR', 0.2]]) {
      const p = k.interior(n, { pivot: [0.45, -0.6, z], local: true, voxel: 0.01 });
      p.box(-0.04, -0.04, -0.07, 0.04, 0.1, 0.07, WOODD);
    }
  },
});

