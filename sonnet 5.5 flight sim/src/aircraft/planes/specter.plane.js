import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, gauge, needle } from '../builders/parts.js';
import { decal, camo, seams, seamsZ, rivets, navLights, pilot, gearLeg, store, pylon } from '../builders/detail.js';
import { wingDef, wingSolid, wingSurface, wingAt } from '../builders/surfaces.js';
import { hash2, hashUnit } from '../../core/util.js';

/* Specter FW-3: a flying wing. No fuselage, no tail, a sawtooth trailing edge and two weapon bays in the belly deep enough for a
   900 kg bomb each. It was designed to be hard to see and heavy enough to be hard to turn: the stick is a polite suggestion. Two
   seats side by side under a faceted canopy at the front. Bay doors open when a bomb is armed; cruise missiles ride under the wings.
   Body origin at the center of gravity, +x forward. */

const SK = M.AC_GRAY_DARK, SKL = M.AC_GRAY, EDGE = M.BLACK_METAL, BLK = M.AC_BLACK;

const WR = wingDef([4.2, 0.0, 0.0], 12.0, 9.0, 1.4, 6.0, 0.0, 0.16, 0.06, 1);
const WL = wingDef([4.2, 0.0, 0.0], 12.0, 9.0, 1.4, 6.0, 0.0, 0.16, 0.06, -1);
const solid = wingSolid(WR);
const wsolid = (x, y, z, c) => solid(x, y, Math.abs(z), c);
const wy = () => 0.0;

/** The trailing edge: a full beaver tail in the middle, then two sawteeth on each side that cut forward and step back. Behind this line there is no wing. */
const teCut = (z) => {
  const az = Math.abs(z);
  if (az < 1.0) return -99;
  if (az < 4.6) return -4.8 + ((az - 1.0) / 3.6) * 3.0;
  if (az < 6.2 || az > 9.6) return -99;
  const nat = -4.8 + 0.1333 * az;
  return nat + ((az - 6.2) / 3.4) * 1.25;
};
const notch = (x, y, z) => x < teCut(z);

/** Stealth panels: one dark tone broken into rectangular panels that differ a hair, the way coated skin does. */
const paint = (r, box) => r.paint(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z) => {
  if (y < 0.0) return SKL;
  const h = hash2(Math.floor((x + 12) / 1.3), Math.floor((Math.abs(z) + 1) / 1.5), 11 + (z < 0 ? 5 : 0));
  const u = hashUnit(h);
  return u < 0.6 ? SK : u < 0.86 ? M.STEEL_DARK : EDGE;
});

export default defineAircraft({
  id: 'specter',
  name: 'Specter FW-3',
  manufacturer: 'Fort Talon Aerospace',
  role: 'Stealth bomber',
  category: 'military',
  order: 7,
  difficulty: 4,
  tags: ['Flying wing', 'Stealth', 'Bomb bays', 'Cruise missiles', 'Heavy'],
  description: 'A black boomerang with two bomb bays and a 24 meter wing. It cruises high and fast, rolls like a ship and drops the biggest bombs on the island. Doors open under the belly when you arm a bomb, and two cruise missiles hang under the wings for the targets that are far off.',
  voxel: 0.0625,
  interiorVoxel: 0.016,
  lodLevels: 4,
  mass: { empty: 14500, fuel: 8500, payload: 200 },
  inertia: [900000, 1450000, 380000],
  wing: { area: 128, span: 24.0, chord: 5.5, y: 0 },
  aero: {
    CL0: 0.12, CLa: 3.9, CLmax: 1.45, alphaStall: 0.34, CD0: 0.019, k: 0.075, CDflap: 0.02, CLflap: 0.15, Cmflap: -0.03, CLmaxFlap: 0.2, CDgear: 0.02, CDair: 0.05,
    Cm0: 0.02, Cma: -0.5, Cmq: -22, Clb: 0.08, Clp: -0.7, Cnb: 0.045, Cnr: -0.14, Cyb: 0.2, Cnda: 0.01,
    machDrag: 0.025, machCrit: 0.8, spin: 0.2, stallPitchDown: 0.08,
    control: { elevator: 0.4, aileron: 0.05, rudder: 0.035 },
  },
  propulsion: { type: 'jet', thrust: 130000, fuelBurn: 1.9, idleRpm: 40, spool: 0.6 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [3.3, -1.9, 0], radius: 0.38, k: 200000, c: 15000, steer: 0.4, cornering: 0.8, travel: 0.35 },
      { pos: [-0.6, -1.85, -3.2], radius: 0.55, k: 520000, c: 40000, brake: true, travel: 0.32 },
      { pos: [-0.6, -1.85, 3.2], radius: 0.55, k: 520000, c: 40000, brake: true, travel: 0.32 },
    ],
  },
  skids: [
    { p: [5.2, 0.0, 0], kind: 'nose' }, { p: [-4.7, 0.0, 0], kind: 'tail' }, { p: [-3.0, 0.0, 11.9], kind: 'tip' }, { p: [-3.0, 0.0, -11.9], kind: 'tip' },
    { p: [0.0, -0.9, 0], kind: 'belly' }, { p: [-3.5, -0.5, 4.0], kind: 'belly' }, { p: [-3.5, -0.5, -4.0], kind: 'belly' },
  ],
  limits: { vne: 255, maxG: 4, minG: 1, flapSpeed: 105, gearSpeed: 130, crashVs: 4.2 },
  cameras: { cockpit: [3.2, 0.88, -0.42], chase: { distance: 38, height: 8 }, near: { distance: 17, height: 3.8 } },
  hud: 'fighter',
  liveries: [
    { id: 'default', name: 'Low observable gray' },
    { id: 'black', name: 'Night operations', remap: { AC_GRAY_DARK: 'AC_BLACK', AC_GRAY: 'AC_GRAY_DARK', BLACK_METAL: 'AC_BLACK' } },
    { id: 'arctic', name: 'Arctic', remap: { AC_GRAY_DARK: 'AC_GRAY', AC_GRAY: 'AC_GRAY_LIGHT', BLACK_METAL: 'AC_GRAY_DARK' } },
  ],
  stations: [
    { id: 'hL', pos: [0.0, -0.45, -1.1], kind: 'bay' }, { id: 'hR', pos: [0.0, -0.45, 1.1], kind: 'bay' },
    { id: 'cL', pos: [-1.0, -0.62, -6.0], kind: 'pylon' }, { id: 'cR', pos: [-1.0, -0.62, 6.0], kind: 'pylon' },
    { id: 'kL', pos: [0.4, -0.5, -3.7], kind: 'pylon' }, { id: 'kR', pos: [0.4, -0.5, 3.7], kind: 'pylon' },
  ],
  weapons: [
    { id: 'heavy', name: 'GP-2000 heavy bomb', type: 'bomb', munition: 'mk84', stations: ['hL', 'hR'], bay: true, salvo: 1 },
    { id: 'cruise', name: 'LR-9 standoff missile', type: 'missile', munition: 'cruise', stations: ['cL', 'cR'], range: 22000 },
    { id: 'cluster', name: 'Cluster bomb', type: 'bomb', munition: 'cluster', stations: ['kL', 'kR'] },
  ],
  animations: [
    { part: 'elevonL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.4 },
    { part: 'elevonR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.4 },
    { part: 'elevonL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.35 },
    { part: 'elevonR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.35 },
    { part: 'dragTopL', type: 'rotate', axis: [1, 0, 0], channel: 'airbrake', gain: -1.1 },
    { part: 'dragTopR', type: 'rotate', axis: [1, 0, 0], channel: 'airbrake', gain: 1.1 },
    { part: 'dragBotL', type: 'rotate', axis: [1, 0, 0], channel: 'airbrake', gain: 1.1 },
    { part: 'dragBotR', type: 'rotate', axis: [1, 0, 0], channel: 'airbrake', gain: -1.1 },
    { part: 'bayDoorL', type: 'rotate', axis: [1, 0, 0], channel: 'bay', gain: -1.45 },
    { part: 'bayDoorR', type: 'rotate', axis: [1, 0, 0], channel: 'bay', gain: 1.45 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: -1.6, offset: 1.6 },
    { part: 'gearL', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: 1.55, offset: -1.55 },
    { part: 'gearR', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: 1.55, offset: -1.55 },
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
    { part: 'stickL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.25 },
    { part: 'stickL', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.25 },
    { part: 'stickR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.25 },
    { part: 'stickR', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.25 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -0.9, offset: 0.45 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0092, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0004, offset: 0 },
  ],
  model(k) {
    const body = k.part('body');
    // ------------------------------------------------------------------ the wing is the whole airframe
    for (const W of [WR, WL]) body.wing(W.root, W.span, W.cr, W.ct, W.sweep, W.dih, W.tr, W.tt, W.side, SK);
    // the hump over the center section, the cockpit nose, the faired intakes on top
    body.loft('x', [
      { a: -2.0, c1: 0.05, c2: 0, r1: 0.74, r2: 2.8, n: 2.7 },
      { a: 0.6, c1: 0.1, c2: 0, r1: 0.7, r2: 2.1, n: 2.6 },
      { a: 2.8, c1: 0.1, c2: 0, r1: 0.55, r2: 1.4, n: 2.5 },
      { a: 4.4, c1: 0.06, c2: 0, r1: 0.35, r2: 0.7, n: 2.4 },
      { a: 5.35, c1: 0.0, c2: 0, r1: 0.14, r2: 0.28, n: 2.2 },
    ], SK);
    // beaver tail: the center of the trailing edge stays full, the rest steps forward in a sawtooth
    body.fn(-5.4, -1.0, -9.8, -1.5, 1.0, 9.8, (x, y, z) => (x < teCut(z) ? -1 : 0));
    // ------------------------------------------------------------------ bay cavities: carved up into the wing, a dark lining on top
    for (const s of [-1, 1]) {
      body.fn(-2.6, -1.2, s * 0.62 - 0.05, 2.6, 0.05, s * 1.58 + 0.05, (x, y, z, c) => (wsolid(x, y, z, c) && Math.abs(z) > 0.62 && Math.abs(z) < 1.58 && x > -2.5 && x < 2.5 && y < 0.05 ? -1 : 0));
      body.box(-2.5, 0.03, s * 0.65 - 0.0, 2.5, 0.12, s * 1.55, BLK);
      body.box(-2.5, -0.5, s * 0.62 - 0.02, 2.5, 0.05, s * 0.62 + 0.02, EDGE);            // the keel beam between the bays
      body.box(-2.5, -0.5, s * 1.58 - 0.02, 2.5, 0.05, s * 1.58 + 0.02, EDGE);
      for (const x of [-2.0, -0.7, 0.7, 2.0]) body.box(x - 0.04, -0.1, s * 0.65, x + 0.04, 0.05, s * 1.55, EDGE, { md: 0.12 });   // frames
    }
    // intakes: two flush scoops on the upper surface near the leading edge, each with a dark mouth and a splitter
    for (const s of [-1, 1]) {
      body.fn(0.6, 0.15, s * 2.6 - 0.65, 2.6, 0.9, s * 2.6 + 0.65, (x, y, z, c) => {
        const u = (x - 0.6) / 2.0, hw = 0.62 - 0.12 * u;
        return Math.abs(z - s * 2.6) < hw && y > 0.2 && y < 0.2 + 0.06 ? M.AC_BLACK : 0;
      }, { md: 0.5 });
      body.carve(1.9, 0.18, s * 2.6 - 0.55, 2.6, 0.7, s * 2.6 + 0.55, { md: 0.5 });
      body.box(1.95, 0.15, s * 2.6 - 0.5, 2.6, 0.21, s * 2.6 + 0.5, BLK);
      body.box(1.9, 0.15, s * 2.6 - 0.02, 2.65, 0.3, s * 2.6 + 0.02, SKL);
    }
    // the canopy bay and the cockpit
    body.carve(2.2, -0.12, -0.9, 4.8, 1.0, 0.9);
    // ------------------------------------------------------------------ paint: an edge treatment, the dark seams of access panels, a few markings
    paint(body, [-5.0, -1.0, -12.1, 5.4, 1.0, 12.1]);
    for (const s of [-1, 1]) {
      // leading edge strips and the sawtooth edge in a darker tone
      body.paint(-5.0, -0.6, s * 12.1, 5.4, 0.8, 0, (x, y, z) => (x > 4.2 - 6 * (Math.abs(z) / 12) - 0.14 ? EDGE : 0), { thin: true });
    }
    seams(body, [-5.0, -0.8, -12.0, 4.8, 0.8, 12.0], [-4.3, -3.2, -2.0, -0.4, 1.2, 3.0], { w: 0.014, mat: EDGE, ymin: -0.8 });
    seamsZ(body, [-5.0, -0.8, -12.0, 4.8, 0.8, 12.0], [0.95, 2.4, 3.8, 5.2, 6.6, 8.0, 9.4, 10.6], { w: 0.014, mat: EDGE, mirror: true });
    rivets(body, [-3.0, 0.0, -9.0, 2.0, 0.8, 9.0], 0.4, 0.4, { mat: EDGE, ymin: 0.1 });
    decal(body, 'FT-3', { x: 0.2, y: 0.6, side: 1, px: 0.06, mat: SKL, z0: 2.2, z1: 2.6 });
    // exhausts: heat-tile troughs on top of the trailing edge behind each engine
    for (const s of [-1, 1]) {
      body.paint(-4.4, 0.1, s * 3.4 - 0.7, -3.4, 0.9, s * 3.4 + 0.7, (x, y, z) => (y > 0.1 ? M.AC_EXHAUST : 0), { thin: true, md: 0.2 });
      body.paint(-5.0, 0.0, s * 2.2 - 0.3, -3.6, 0.9, s * 2.2 + 0.3, (x, y, z) => (y > 0.1 ? M.AC_EXHAUST : 0), { thin: true, md: 0.2 });
    }
    // pitot probes at the nose, antennas, wing tip lights
    strut(body, [5.2, 0.0, 0.1], [5.9, 0.0, 0.12], 0.025, M.AC_METAL, { md: 0.1 });
    strut(body, [5.2, 0.0, -0.1], [5.9, 0.0, -0.12], 0.025, M.AC_METAL, { md: 0.1 });
    body.box(-2.5, 0.64, -0.08, -2.2, 0.9, 0.08, SK, { md: 0.1 });
    navLights(body, { left: [-3.0, 0.0, -11.9], right: [-3.0, 0.0, 11.9], tail: [-4.7, 0.02, 0], beacon: [0.2, 0.82, 0] });
    for (const s of [-1, 1]) {
      pylon(body, 0.4, -0.16, -0.36, s * 3.7, { len: 1.8, mat: SK, dark: EDGE });
      pylon(body, -1.0, -0.16, -0.38, s * 6.0, { len: 2.2, mat: SK, dark: EDGE });
    }
    // ------------------------------------------------------------------ elevons: one big surface on each outer wing, sawtooth-free
    for (const [W, s] of [[WL, -1], [WR, 1]]) {
      const n = s < 0 ? 'L' : 'R';
      const ev = wingSurface(k, body, 'elevon' + n, W, { z0: 4.9, z1: 11.7, frac: 0.28, mat: SK, mask: notch });
      paint(ev, [-5.0, -0.6, Math.min(4.8 * s, 11.8 * s), 0.0, 0.6, Math.max(4.8 * s, 11.8 * s)]);
      seams(ev, [-5.0, -0.6, Math.min(4.8 * s, 11.8 * s), 0.0, 0.6, Math.max(4.8 * s, 11.8 * s)], [-3.0], { w: 0.01, mat: EDGE });
      // drag rudders at each tip: a flap above and one below that open together
      for (const [name, top] of [['dragTop' + n, true], ['dragBot' + n, false]]) {
        const d = k.part(name, { pivot: [-2.9, 0.0, s * 10.7], visibleWhen: 'airbrake' });
        const e0 = wingAt(W, 10.7);
        d.box(-3.5, top ? e0.y + 0.0 : e0.y - 0.06, s * 10.0 - 0.0, -2.9, top ? e0.y + 0.06 : e0.y + 0.0, s * 11.4, EDGE, { thin: true });
      }
      // the bay doors, the lower skin of the wing over each cavity
      const door = k.part('bayDoor' + n, { pivot: [0, -0.4, s * 0.62] });
      door.fn(-2.6, -1.2, s * 0.6 - 0.03, 2.6, 0.0, s * 1.6 + 0.03, (x, y, z, c) => (wsolid(x, y, z, c) && Math.abs(z) > 0.62 && Math.abs(z) < 1.58 && x > -2.5 && x < 2.5 && (c > 0.15 || !wsolid(x, y - 0.1, z, c)) ? SKL : 0), { thin: true });
    }
    // ------------------------------------------------------------------ landing gear
    const gn = k.part('gearNose', { pivot: [3.3, -0.5, 0], visibleWhen: 'gearOut' });
    gearLeg(gn, [3.3, -0.5, 0], [3.3, -1.9, 0], { thick: 0.14, lower: 0.1, fork: 0.2 });
    gn.box(3.1, -1.2, 0.1, 3.5, -0.95, 0.14, M.HEADLIGHT, { md: 0.1 });
    wheel(k.part('wheelNose', { pivot: [3.3, -1.9, 0], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.38, 0.22);
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const g = k.part('gear' + n, { pivot: [-0.6, -0.5, s * 3.2], visibleWhen: 'gearOut' });
      gearLeg(g, [-0.6, -0.5, s * 3.2], [-0.6, -1.85, s * 3.2], { thick: 0.2, lower: 0.14, fork: 0.3, drag: [-1.9, -0.45, s * 3.2] });
      wheel(k.part('wheel' + n, { pivot: [-0.6, -1.85, s * 3.2], local: true, visibleWhen: 'gearOut' }), 0, 0, 0, 0.55, 0.3);
      body.box(-1.4, -0.52, s * 3.2 - 0.4, 0.2, -0.4, s * 3.2 + 0.4, EDGE, { md: 0.15 });      // door
    }
    // ------------------------------------------------------------------ canopy: two big panes at the front and three smaller ones, faceted
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(3.35, 0.58, 0, 1.35, 0.5, 0.95, M.AC_CANOPY);
    cn.ell(3.35, 0.58, 0, 1.28, 0.45, 0.88, 0, { md: 0.4 });
    cn.carve(1.5, -0.4, -1.5, 5.0, 0.3, 1.5);
    for (const sz of [-0.42, 0.42]) {
      const pl = k.part(sz < 0 ? 'pilotFigure' : 'copilotFigure', { hideInCockpit: true });
      // the pilot flying has a hand on the outer sidestick and one on the pedestal; the one beside him mirrors it
      const outer = sz < 0 ? -0.3 : 0.3, inner = sz < 0 ? 0.4 : -0.4;
      pilot(pl, 2.8, 0.07, { hands: sz < 0 ? [[3.35, 0.2, inner], [3.4, 0.24, outer]] : [[3.4, 0.24, outer * 0 - 0.4], [3.4, 0.24, 0.3]], feet: 3.4, suit: M.AC_OLIVE, helmet: M.AC_WHITE, visor: M.GLASS_BRONZE });
      for (const op of pl.ops) op.xf = { tx: 0, ty: 0, tz: sz, ang: 0 };
    }
    // ------------------------------------------------------------------ stores
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      store(k, 'heavy' + n, 'h' + n, 'mk84', [0.0, -0.33, s * 1.1], { voxel: 0.04 });
      store(k, 'cruise' + n, 'c' + n, 'cruise', [-1.0, -0.38 - 0.4, s * 6.0], { voxel: 0.05 });
      store(k, 'cluster' + n, 'k' + n, 'cluster', [0.4, -0.52 - 0.2, s * 3.7], { voxel: 0.04 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ the cockpit: two seats, a wall of screens, a center pedestal
    const c = k.interior('cabin');
    c.box(2.4, -0.2, -0.95, 4.6, -0.12, 0.95, M.COCKPIT_PANEL);
    for (const s of [-1, 1]) {
      c.box(2.4, -0.18, s * 0.92 - 0.03, 4.6, 0.62, s * 0.92 + 0.03, M.COCKPIT_TRIM);
      c.box(2.4, 0.6, s * 0.9 - 0.06, 4.6, 0.66, s * 0.9 + 0.06, M.COCKPIT_TRIM);
      // seats: a cushion, a back, a headbox, harness
      const z = s * 0.42;
      c.box(2.45, -0.02, z - 0.22, 3.05, 0.08, z + 0.22, M.SEAT_FABRIC);
      c.box(2.35, 0.05, z - 0.24, 2.5, 0.95, z + 0.24, M.SEAT_FABRIC);
      c.box(2.28, 0.8, z - 0.16, 2.5, 1.12, z + 0.16, M.COCKPIT_TRIM);
      for (const t of [-1, 1]) c.box(2.5, 0.08, z + t * 0.18 - 0.015, 3.0, 0.6, z + t * 0.18 + 0.015, M.AC_BLACK, { md: 0.03 });
      // the sidestick sits on the outer console
      c.box(3.0, -0.02, s * 0.72 - 0.08, 3.5, 0.1, s * 0.72 + 0.08, M.COCKPIT_PANEL);
    }
    // center pedestal with the throttles and a switch bank
    c.box(2.8, -0.12, -0.1, 4.1, 0.15, 0.1, M.COCKPIT_PANEL);
    for (let i = 0; i < 10; i++) c.box(3.2 + i * 0.07, 0.15, -0.06, 3.23 + i * 0.07, 0.18 + (i % 2) * 0.015, 0.06, i % 3 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.03 });
    // frames
    const bow = (x, ry, rz, th = 0.03) => c.fn(x - th, 0.3, -rz - 0.05, x + th, 0.3 + ry + 0.05, rz + 0.05, (px, py, pz) => { const d = Math.sqrt(((py - 0.3) / ry) ** 2 + (pz / rz) ** 2); return py >= 0.3 && Math.abs(d - 1) < 0.07 ? M.COCKPIT_TRIM : 0; });
    bow(2.2, 0.62, 0.92); bow(3.35, 0.65, 0.92, 0.025); bow(4.55, 0.4, 0.9, 0.04);
    // ------------------------------------------------------------------ the panel (8 mm voxels): four screens side by side
    const pn = k.interior('panel', { voxel: 0.008 });
    pn.box(4.5, 0.05, -0.92, 4.62, 0.5, 0.92, M.COCKPIT_TRIM);
    pn.box(4.35, 0.5, -0.94, 4.8, 0.56, 0.94, M.COCKPIT_PANEL);
    const scr = (z, y, w, h, x = 4.5) => { pn.box(x - 0.014, y - h / 2 - 0.012, z - w / 2 - 0.012, x + 0.002, y + h / 2 + 0.012, z + w / 2 + 0.012, EDGE); pn.box(x - 0.022, y - h / 2, z - w / 2, x - 0.012, y + h / 2, z + w / 2, M.GAUGE_FACE); };
    const line = (x0, y0, z0, x1, y1, z1, m) => pn.box(x0, y0, z0, x1, y1, z1, m, { thin: true, md: 0.02 });
    for (const z of [-0.65, -0.22, 0.22, 0.65]) scr(z, 0.32, 0.36, 0.3);
    // contents: a map with a route, a radar picture, systems bars, a weapons page
    for (let i = 0; i < 9; i++) line(4.48, 0.22 + i * 0.03, -0.8, 4.488, 0.223 + i * 0.03, -0.5, M.NAV_GREEN);
    line(4.48, 0.22, -0.78, 4.488, 0.42, -0.76, M.AC_YELLOW);
    for (let i = 1; i <= 4; i++) line(4.48, 0.32, -0.22 - 0.16 + i * 0.07, 4.488, 0.325, -0.22 - 0.16 + i * 0.07 + 0.004, M.NAV_GREEN);
    for (let i = 0; i < 7; i++) line(4.48, 0.2 + (i % 3) * 0.02, 0.1 + i * 0.045, 4.488, 0.24 + ((i * 5) % 4) * 0.025, 0.106 + i * 0.045, i === 4 ? M.AC_YELLOW : M.NAV_GREEN);
    for (let i = 0; i < 4; i++) pn.box(4.478, 0.22 + i * 0.07, 0.52, 4.488, 0.26 + i * 0.07, 0.78, i === 2 ? M.SWITCH_RED : M.NAV_GREEN, { md: 0.02 });
    gauge(pn, 4.5, 0.12, 0, 0.04); gauge(pn, 4.5, 0.12, -0.2, 0.04); gauge(pn, 4.5, 0.12, 0.2, 0.04);
    // ------------------------------------------------------------------ controls: two sidesticks, a throttle quadrant, pedals, two standby needles
    for (const [n, z] of [['stickL', -0.72], ['stickR', 0.72]]) {
      const st = k.interior(n, { pivot: [3.4, 0.1, z], local: true, voxel: 0.01 });
      st.cyl('y', 0, 0, 0.02, 0.02, 0, 0.18, M.COCKPIT_TRIM);
      st.box(-0.04, 0.16, -0.03, 0.05, 0.28, 0.03, M.AC_BLACK);
      st.box(-0.03, 0.26, -0.035, 0.0, 0.29, 0.035, M.SWITCH_RED, { md: 0.01 });
    }
    const th = k.interior('throttleLever', { pivot: [3.4, 0.18, 0.0], local: true, voxel: 0.01 });
    th.cyl('y', 0, 0, 0.02, 0.02, 0, 0.2, M.COCKPIT_TRIM);
    th.box(-0.06, 0.18, -0.04, 0.06, 0.26, 0.04, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.55], ['pedalR', 0.25]]) {
      const p = k.interior(n, { pivot: [4.3, -0.05, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.05, -0.07, 0.02, 0.1, 0.07, M.STEEL_DARK);
    }
    needle(k.interior('nASI', { pivot: [4.498, 0.12, -0.2], local: true, voxel: 0.004 }), 0.03, M.NEEDLE_ORANGE);
    needle(k.interior('nALT', { pivot: [4.498, 0.12, 0.2], local: true, voxel: 0.004 }), 0.03, M.NEEDLE_ORANGE);
  },
});
