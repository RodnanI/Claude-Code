import { defineAircraft } from '../base.js';
import { M } from '../../voxel/palette.js';
import { strut, wheel, ringYZ, gauge, needle, wingPair, fin } from '../builders/parts.js';

/* Shrike F-9: a single-engine light fighter with a relaxed-stability airframe, a fly-by-wire G limiter and an afterburning
   turbofan. Sidestick, bubble canopy, HUD. Built for speed and turn rate; unforgiving on the approach.
   Body origin is the center of gravity, +x forward. Pilot eye is inside the bubble at [2.75, 0.85, 0]. */

const GRAY = M.AC_GRAY, LIGHT = M.AC_GRAY_LIGHT, DARK = M.AC_GRAY_DARK, BLACK = M.AC_BLACK;

export default defineAircraft({
  id: 'shrike',
  name: 'Shrike F-9',
  manufacturer: 'Fort Talon Aerospace',
  category: 'military',
  role: 'Light fighter',
  order: 3,
  difficulty: 5,
  tags: ['Afterburner', 'Fly-by-wire', 'Cannon', 'Missiles', 'Rockets', 'Bombs'],
  description: 'Single engine, afterburning, fly-by-wire. A 9 G airframe that will happily fly faster than sound and land exactly as carefully as you make it. Cannon, heat seekers, rocket pods and bombs.',
  voxel: 0.0625,
  interiorVoxel: 0.012,
  lodLevels: 4,
  mass: { empty: 8570, fuel: 3200, payload: 240 },
  inertia: [12875, 85552, 75674],
  wing: { area: 27.9, span: 9.96, chord: 3.45, y: -0.1 },
  aero: {
    CL0: 0.05, CLa: 3.5, CLmax: 1.6, alphaStall: 0.44, CD0: 0.022, k: 0.125, CDflap: 0.02, CLflap: 0.15, Cmflap: -0.03, CLmaxFlap: 0.25, CDgear: 0.02, CDair: 0.06,
    Cm0: 0.0, Cma: -0.34, Cmq: -9, Clb: 0.06, Clp: -0.38, Cnb: 0.11, Cnr: -0.22, Cyb: 0.6, Cnda: 0.01,
    machDrag: 0.03, machCrit: 0.86, spin: 0.35, stallPitchDown: 0.15,
    control: { elevator: 0.62, aileron: 0.085, rudder: 0.05, schedule: 11000 },
  },
  propulsion: { type: 'jet', thrust: 76000, afterburner: 53000, fuelBurn: 1.2, idleRpm: 30, spool: 0.5 },
  gear: {
    retractable: true,
    wheels: [
      { pos: [4.3, -1.62, 0], radius: 0.28, k: 120000, c: 9000, steer: 0.45, cornering: 0.8, travel: 0.35 },
      { pos: [-1.1, -1.55, -1.25], radius: 0.38, k: 260000, c: 20000, brake: true, travel: 0.3 },
      { pos: [-1.1, -1.55, 1.25], radius: 0.38, k: 260000, c: 20000, brake: true, travel: 0.3 },
    ],
  },
  skids: [
    { p: [-8.0, -0.15, 0], kind: 'tail' }, { p: [0.5, -0.85, 0], kind: 'belly' }, { p: [-2.4, 0.0, 4.95], kind: 'tip' }, { p: [-2.4, 0.0, -4.95], kind: 'tip' },
    { p: [7.0, 0.0, 0], kind: 'nose' }, { p: [-3.2, -0.55, 1.0], kind: 'belly' }, { p: [-3.2, -0.55, -1.0], kind: 'belly' },
  ],
  limits: { vne: 330, maxG: 9, minG: 3, flapSpeed: 120, gearSpeed: 150, gLimiter: true, crashVs: 6 },
  cameras: { cockpit: [2.75, 0.85, 0], chase: { distance: 26, height: 6 }, near: { distance: 12.5, height: 3.1 } },
  hud: 'fighter',
  liveries: [
    { id: 'default', name: 'Air superiority gray' },
    { id: 'talon', name: 'Fort Talon olive', remap: { AC_GRAY: 'AC_OLIVE', AC_GRAY_LIGHT: 'AC_DRAB', AC_GRAY_DARK: 'AC_BLACK' } },
  ],
  stations: [
    { id: 'tipL', pos: [-2.3, 0.0, -5.15], kind: 'rail' }, { id: 'tipR', pos: [-2.3, 0.0, 5.15], kind: 'rail' },
    { id: 'pylonL', pos: [-0.6, -0.42, -2.6], kind: 'pylon' }, { id: 'pylonR', pos: [-0.6, -0.42, 2.6], kind: 'pylon' },
    { id: 'pylonL2', pos: [-1.0, -0.36, -1.6], kind: 'pylon' }, { id: 'pylonR2', pos: [-1.0, -0.36, 1.6], kind: 'pylon' },
  ],
  weapons: [
    { id: 'cannon', name: 'M-20 20 mm cannon', type: 'gun', munition: 'cannon20', ammo: 510, rate: 100, muzzle: [4.4, -0.3, -0.62], spread: 0.004 },
    { id: 'seeker', name: 'SW-9 heat seeker', type: 'missile', munition: 'aam', stations: ['tipL', 'tipR'], range: 9000 },
    { id: 'pods', name: '70 mm rocket pod', type: 'rocket', munition: 'hvar', stations: ['pylonL', 'pylonR'], rounds: 19, muzzleX: 1.25, tube: 0.09 },
    { id: 'bombs', name: 'GP-500 bomb', type: 'bomb', munition: 'mk82', stations: ['pylonL2', 'pylonR2'] },
  ],
  animations: [
    { part: 'flaperonL', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: 0.4 },
    { part: 'flaperonR', type: 'rotate', axis: [0, 0, 1], channel: 'aileron', gain: -0.4 },
    { part: 'stabL', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.4 },
    { part: 'stabR', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: -0.4 },
    { part: 'rudder', type: 'rotate', axis: [0, 1, 0], channel: 'rudder', gain: 0.4 },
    { part: 'airbrake', type: 'rotate', axis: [0, 0, 1], channel: 'airbrake', gain: 0.9 },
    { part: 'gearNose', type: 'rotate', axis: [0, 0, 1], channel: 'gear', gain: 1.6, offset: -1.6 },
    { part: 'gearL', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: -1.45, offset: 1.45 },
    { part: 'gearR', type: 'rotate', axis: [1, 0, 0], channel: 'gear', gain: 1.45, offset: -1.45 },
    { part: 'gearNose', type: 'translate', axis: [0, 1, 0], channel: 'comp0', gain: 1 },
    { part: 'gearL', type: 'translate', axis: [0, 1, 0], channel: 'comp1', gain: 1 },
    { part: 'gearR', type: 'translate', axis: [0, 1, 0], channel: 'comp2', gain: 1 },
    { part: 'wheelNose', type: 'rotate', axis: [0, 0, 1], channel: 'wheelAngle', gain: -1 },
    { part: 'stick', type: 'rotate', axis: [0, 0, 1], channel: 'elevator', gain: 0.28 },
    { part: 'stick', type: 'rotate', axis: [1, 0, 0], channel: 'aileron', gain: 0.28 },
    { part: 'throttleLever', type: 'rotate', axis: [0, 0, 1], channel: 'throttle', gain: -1.0, offset: 0.5 },
    { part: 'pedalL', type: 'translate', axis: [1, 0, 0], channel: 'rudderL', gain: 0.05 },
    { part: 'pedalR', type: 'translate', axis: [1, 0, 0], channel: 'rudderR', gain: 0.05 },
    { part: 'nASI', type: 'rotate', axis: [1, 0, 0], channel: 'iasKnots', gain: 0.0092, offset: -2.3 },
    { part: 'nALT', type: 'rotate', axis: [1, 0, 0], channel: 'altFeet', gain: 0.0006283 },
    { part: 'attitude', type: 'rotate', axis: [0, 0, 1], channel: 'pitchGauge', gain: 1 },
    { part: 'attitude', type: 'rotate', axis: [1, 0, 0], channel: 'rollGauge', gain: -1 },
  ],
  model(k) {
    const body = k.part('body');
    // fuselage: long and slightly flattened, cheek to cheek with the blended wing root
    body.loft('x', [
      { a: -8.1, c1: 0.05, c2: 0, r1: 0.4, r2: 0.4, n: 2.2 },
      { a: -7.5, c1: 0.05, c2: 0, r1: 0.5, r2: 0.5, n: 2.3 },
      { a: -6.0, c1: 0.0, c2: 0, r1: 0.62, r2: 0.68, n: 2.5 },
      { a: -3.0, c1: 0.05, c2: 0, r1: 0.72, r2: 0.84, n: 2.6 },
      { a: -0.5, c1: 0.1, c2: 0, r1: 0.78, r2: 0.88, n: 2.6 },
      { a: 1.5, c1: 0.12, c2: 0, r1: 0.7, r2: 0.8, n: 2.5 },
      { a: 3.2, c1: 0.12, c2: 0, r1: 0.6, r2: 0.62, n: 2.4 },
      { a: 5.0, c1: 0.1, c2: 0, r1: 0.44, r2: 0.44, n: 2.2 },
      { a: 6.4, c1: 0.05, c2: 0, r1: 0.24, r2: 0.24, n: 2 },
      { a: 7.05, c1: 0.0, c2: 0, r1: 0.04, r2: 0.04, n: 2 },
    ], GRAY);
    // dorsal spine and nose radome
    body.loft('x', [
      { a: -6.5, c1: 0.62, c2: 0, r1: 0.1, r2: 0.28, n: 2.4 },
      { a: -3.0, c1: 0.78, c2: 0, r1: 0.16, r2: 0.36, n: 2.4 },
      { a: -0.5, c1: 0.86, c2: 0, r1: 0.18, r2: 0.4, n: 2.4 },
      { a: 0.9, c1: 0.78, c2: 0, r1: 0.1, r2: 0.3, n: 2.4 },
    ], GRAY);
    body.loft('x', [
      { a: 5.5, c1: 0.08, c2: 0, r1: 0.38, r2: 0.38, n: 2.2 },
      { a: 6.4, c1: 0.05, c2: 0, r1: 0.23, r2: 0.23, n: 2 },
      { a: 7.05, c1: 0.0, c2: 0, r1: 0.05, r2: 0.05, n: 2 },
    ], BLACK, { md: 0.2 });
    // cockpit tub, the canopy sits above it
    body.ell(2.35, 0.55, 0, 1.4, 0.42, 0.44, 0);
    body.box(0.9, 0.4, -0.4, 3.6, 0.7, 0.4, 0);
    // chin intake with a dark duct
    body.box(1.5, -0.98, -0.6, 3.7, -0.38, 0.6, DARK);
    body.carve(3.2, -0.9, -0.5, 3.75, -0.46, 0.5);
    body.box(3.3, -0.88, -0.42, 3.4, -0.5, 0.42, BLACK, { md: 0.2 });
    body.box(1.5, -0.4, -0.5, 3.2, -0.3, 0.5, GRAY);
    // engine nozzle: petals and a dark inner ring
    body.cyl('x', 0.05, 0, 0.52, 0.42, -8.35, -7.6, DARK);
    body.cyl('x', 0.05, 0, 0.4, 0.34, -8.4, -7.9, M.AC_EXHAUST, { md: 0.2 });
    body.carve(-8.5, -0.2, -0.3, -8.0, 0.3, 0.3, { md: 0.09 });
    // wings: 40 degree leading edge sweep, thin section, small leading edge flap line
    wingPair(body, [1.7, -0.1, 0.55], 4.4, 5.0, 1.3, 3.6, 0.0, 0.045, 0.035, GRAY);
    for (const s of [-1, 1]) {
      body.box(-2.3 - 0.8, -0.14, s * 4.95, -2.3 + 0.2, -0.02, s * 5.1, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.09 });
      // roundel on the upper wing
      body.paint(-1.8, -0.2, s * 2.4, -0.2, 0.1, s * 3.6, (x, y, z) => {
        const r = Math.hypot(x + 1.0, z - s * 3.0);
        return r < 0.16 ? M.AC_ORANGE : r < 0.3 ? M.AC_CREAM : r < 0.42 ? M.AC_OLIVE : 0;
      }, { thin: true });
      // wing fence and leading edge dogtooth
      body.box(0.0, -0.13, s * 3.4, -1.2, 0.05, s * 3.44, LIGHT, { md: 0.09 });
    }
    // strakes (leading edge root extensions)
    for (const s of [-1, 1]) body.wing([3.3, 0.02, s * 0.62], 1.0, 1.6, 0.4, 1.3, 0.0, 0.03, 0.03, s, GRAY);
    // fixed tail: vertical fin with a dark tip and a beacon
    fin(body, -4.3, 0.55, 3.6, 1.4, 2.6, 1.9, 0.11, GRAY);
    body.box(-6.4, 3.05, -0.06, -5.7, 3.16, 0.06, DARK, { md: 0.15 });
    body.box(-7.7, 0.95, -0.05, -7.6, 1.05, 0.05, M.BEACON_RED, { md: 0.1 });
    // fin insignia: tail flash
    body.paint(-7.6, 1.2, -0.2, -4.6, 2.9, 0.2, (x, y) => (y > 1.9 + (x + 6) * 0.35 && y < 2.15 + (x + 6) * 0.35 ? M.AC_ORANGE : 0), { thin: true });
    // ventral fins and the exhaust fairing
    for (const s of [-1, 1]) body.wing([-4.2, -0.5, s * 0.55], 0.55, 1.2, 0.9, 0.5, 0.0, 0.06, 0.06, s, DARK);
    // pitot boom, IR sensor and antenna blades
    body.cyl('x', 0.05, 0, 0.02, 0.01, 7.0, 7.9, M.STEEL, { md: 0.12 });
    body.box(6.0, 0.36, -0.04, 6.1, 0.5, 0.04, DARK, { md: 0.1 });
    body.box(-0.1, 0.98, -0.02, 0.5, 1.2, 0.02, DARK, { md: 0.1 });
    // pylons (fixed; stores are separate parts)
    for (const s of [-1, 1]) {
      body.box(-1.1, -0.34, s * 2.5 - 0.06, 0.1, -0.18, s * 2.5 + 0.06, DARK, { md: 0.15 });
      body.box(-1.4, -0.3, s * 1.5 - 0.06, -0.3, -0.15, s * 1.5 + 0.06, DARK, { md: 0.15 });
      body.box(-2.6, -0.02, s * 5.02 - 0.03, -1.0, 0.1, s * 5.02 + 0.03, DARK, { md: 0.15 });
      // gear doors
      body.box(-1.6, -0.88, s * 0.55, -0.4, -0.84, s * 0.95, DARK, { md: 0.2 });
    }
    body.box(3.9, -0.84, -0.02, 4.7, -0.8, 0.02, DARK, { md: 0.2 });
    // paint: intake warning marking and number
    body.paint(3.4, -1.0, -0.62, 3.75, -0.4, 0.62, (x, y, z) => (Math.abs(z) < 0.08 && y < -0.9 ? M.AC_RED : 0), { md: 0.12, thin: true });
    body.paint(2.0, 0.2, -0.9, 2.4, 0.9, 0.9, (x, y, z) => (Math.abs(Math.abs(z) - 0.8) < 0.02 ? M.AC_WHITE : 0), { md: 0.1, thin: true });

    // ------------------------------------------------------------------ control surfaces
    for (const s of [-1, 1]) {
      const fp = k.part(s < 0 ? 'flaperonL' : 'flaperonR', { pivot: [-3.3, -0.1, s * 2.6] });
      fp.wing([-2.35, -0.1, s * 1.05], 3.4, 1.0, 0.75, -0.02, 0.0, 0.05, 0.04, s, GRAY);
      const st = k.part(s < 0 ? 'stabL' : 'stabR', { pivot: [-6.95, -0.12, s * 1.5] });
      st.wing([-5.6, -0.12, s * 0.62], 2.15, 2.6, 1.0, 1.7, 0.0, 0.04, 0.03, s, GRAY);
    }
    const rd = k.part('rudder', { pivot: [-7.5, 2.0, 0] });
    rd.loft('y', [
      { a: 0.9, c1: -7.72, c2: 0, r1: 0.32, r2: 0.06, n: 4 },
      { a: 3.0, c1: -7.5, c2: 0, r1: 0.22, r2: 0.045, n: 4 },
    ], GRAY, { thin: true });
    const ab = k.part('airbrake', { pivot: [-4.6, -0.42, 0], visibleWhen: 'airbrake' });
    ab.box(-5.9, -0.5, -0.5, -4.6, -0.42, 0.5, DARK, { thin: true });
    // landing gear legs with wheels; folded away and hidden when retracted
    const gn = k.part('gearNose', { pivot: [4.3, -0.5, 0], visibleWhen: 'gearOut' });
    strut(gn, [4.3, -0.5, 0], [4.3, -1.62, 0], 0.12, M.STEEL_BRIGHT);
    gn.box(4.1, -1.0, -0.04, 4.28, -0.8, 0.04, DARK, { md: 0.12 });
    const wn = k.part('wheelNose', { pivot: [4.3, -1.62, 0], local: true, visibleWhen: 'gearOut' });
    wheel(wn, 0, 0, 0, 0.28, 0.17);
    for (const s of [-1, 1]) {
      const g = k.part(s < 0 ? 'gearL' : 'gearR', { pivot: [-1.1, -0.5, s * 0.6], visibleWhen: 'gearOut' });
      strut(g, [-1.1, -0.5, s * 0.6], [-1.1, -1.4, s * 1.2], 0.15, M.STEEL_BRIGHT);
      strut(g, [-1.6, -0.6, s * 0.8], [-1.1, -1.4, s * 1.2], 0.09, M.STEEL, { md: 0.2 });
      g.cyl('z', -1.1, -1.55, 0.38, 0.38, s * 1.12 - 0.13, s * 1.12 + 0.13, M.AC_TIRE);
      g.cyl('z', -1.1, -1.55, 0.22, 0.22, s * 1.12 - 0.14, s * 1.12 + 0.14, M.AC_HUB, { md: 0.12 });
      g.box(-1.4, -0.9, s * 1.2 + (s > 0 ? 0.13 : -0.16), -0.8, -0.5, s * 1.2 + (s > 0 ? 0.16 : -0.13), DARK, { md: 0.2 });
    }
    // canopy: transparent bubble, hidden from inside
    const cn = k.part('canopy', { hideInCockpit: true });
    cn.ell(2.4, 0.66, 0, 1.55, 0.6, 0.52, M.AC_CANOPY);
    cn.ell(2.4, 0.66, 0, 1.47, 0.53, 0.45, 0, { md: 0.3 });
    cn.carve(0.5, -1, -1, 4.2, 0.62, 1);
    // stores: heat seekers on the wingtip rails, rocket pods and bombs on the pylons. Visible while loaded.
    for (const s of [-1, 1]) {
      const id = s < 0 ? 'L' : 'R';
      const m = k.part('seeker' + id, { visibleWhen: 'store_tip' + id });
      m.cyl('x', 0.0, s * 5.15, 0.08, 0.08, -3.0, -0.3, LIGHT);
      m.cyl('x', 0.0, s * 5.15, 0.08, 0.02, -0.3, 0.15, BLACK, { md: 0.12 });
      for (const fx of [-2.9, -0.5]) m.box(fx, -0.005, s * 5.15 - 0.19, fx + 0.35, 0.005, s * 5.15 + 0.19, DARK, { md: 0.08 });
      const p = k.part('pods' + id, { visibleWhen: 'store_pylon' + id });
      p.cyl('x', -0.12, s * 2.6, 0.2, 0.2, -1.5, 0.5, M.AC_OLIVE);
      p.cyl('x', -0.12, s * 2.6, 0.2, 0.05, 0.5, 0.75, LIGHT, { md: 0.1 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; p.cyl('x', -0.12 + Math.sin(a) * 0.11, s * 2.6 + Math.cos(a) * 0.11, 0.035, 0.035, 0.3, 0.52, BLACK, { md: 0.08 }); }
      const b = k.part('bombs' + id, { visibleWhen: 'store_pylon' + id + '2' });
      b.ell(-1.0, -0.62, s * 1.6, 0.85, 0.2, 0.2, M.AC_OLIVE);
      b.box(-1.85, -0.85, s * 1.6 - 0.02, -1.5, -0.4, s * 1.6 + 0.02, M.AC_OLIVE, { md: 0.12 });
      b.box(-1.85, -0.62 - 0.02, s * 1.6 - 0.35, -1.5, -0.62 + 0.02, s * 1.6 + 0.35, M.AC_OLIVE, { md: 0.12 });
      b.box(-0.2, -0.64, s * 1.6 - 0.03, 0.05, -0.6, s * 1.6 + 0.03, M.AC_YELLOW, { md: 0.09 });
    }
  },
  interior(k) {
    // ------------------------------------------------------------------ cockpit tub (1.2 cm voxels)
    const c = k.interior('cabin');
    c.box(1.0, -0.3, -0.42, 3.6, 0.48, 0.42, M.COCKPIT_TRIM);
    c.carve(1.4, -0.25, -0.34, 3.4, 0.5, 0.34);
    c.box(1.9, -0.28, -0.32, 3.4, -0.2, 0.32, M.COCKPIT_PANEL);                         // floor
    // side consoles
    for (const s of [-1, 1]) {
      c.box(1.8, -0.2, s * 0.36 - 0.11, 3.5, 0.18, s * 0.36 + 0.11, M.COCKPIT_PANEL);
      c.box(1.8, 0.18, s * 0.36 - 0.11, 3.5, 0.21, s * 0.36 + 0.11, M.COCKPIT_TRIM);
      c.box(2.1, 0.21, s * 0.36 - 0.1, 2.5, 0.24, s * 0.36 + 0.1, M.SWITCH_GRAY, { md: 0.03 });
      for (let i = 0; i < 6; i++) c.box(2.55 + i * 0.1, 0.21, s * 0.36 - 0.07, 2.6 + i * 0.1, 0.25, s * 0.36 + 0.07, i % 2 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.03 });
    }
    // ejection seat: tilted back, headbox, yellow and black pull handle
    c.box(1.9, -0.25, -0.2, 2.5, -0.1, 0.2, M.SEAT_FABRIC);
    c.box(1.75, -0.1, -0.2, 2.0, 0.55, 0.2, M.SEAT_FABRIC);
    c.box(1.7, 0.55, -0.16, 1.98, 0.85, 0.16, M.COCKPIT_TRIM);
    c.box(1.85, 0.7, -0.22, 1.98, 0.8, 0.22, M.AC_GRAY_DARK, { md: 0.04 });
    c.box(2.15, -0.1, -0.08, 2.4, -0.06, 0.08, M.AC_YELLOW, { md: 0.03 });
    for (const s of [-1, 1]) c.box(1.78, -0.05, s * 0.24 - 0.02, 2.4, 0.06, s * 0.24 + 0.02, M.AC_BLACK, { md: 0.03 });
    // canopy frame: sills, bow arch and a rear bow behind the headrest
    for (const s of [-1, 1]) c.box(1.3, 0.5, s * 0.5 - 0.03, 3.6, 0.58, s * 0.5 + 0.03, M.COCKPIT_TRIM);
    for (const s of [-1, 1]) c.box(3.55, 0.5, s * 0.41 - 0.09, 3.65, 0.6, s * 0.41 + 0.09, M.COCKPIT_TRIM);
    ringYZ(c, 3.5, 3.6, 0.55, 0, 0.5, 0.045, M.COCKPIT_TRIM);
    ringYZ(c, 1.55, 1.63, 0.55, 0, 0.48, 0.04, M.COCKPIT_TRIM);

    // ------------------------------------------------------------------ instrument panel and HUD (6 mm voxels)
    const pn = k.interior('panel', { voxel: 0.006 });
    pn.box(3.62, 0.44, -0.4, 3.9, 0.9, 0.4, M.COCKPIT_TRIM);                    // panel face, above the tub rim
    pn.box(3.5, 0.9, -0.42, 4.1, 1.0, 0.42, M.COCKPIT_PANEL);                   // glare shield
    pn.box(3.4, 0.98, -0.16, 3.76, 1.02, 0.16, M.COCKPIT_PANEL);                // HUD housing
    pn.box(3.42, 1.0, -0.17, 3.5, 1.02, 0.17, M.COCKPIT_PANEL);
    // combiner: an open frame, the symbology itself is drawn by the HUD overlay
    pn.box(3.47, 1.0, -0.16, 3.49, 1.3, -0.145, M.COCKPIT_PANEL, { thin: true });
    pn.box(3.47, 1.0, 0.145, 3.49, 1.3, 0.16, M.COCKPIT_PANEL, { thin: true });
    pn.box(3.46, 1.28, -0.16, 3.5, 1.32, 0.16, M.COCKPIT_PANEL);
    pn.box(3.47, 1.15, -0.15, 3.485, 1.16, 0.15, M.HUD_GLASS, { thin: true });
    // three displays: a metal rim, a dark glass face and thin bright symbology
    const mfd = (z, y, w, h) => {
      pn.box(3.6, y - h / 2 - 0.01, z - w / 2 - 0.01, 3.625, y + h / 2 + 0.01, z + w / 2 + 0.01, M.AC_GRAY_DARK);
      pn.box(3.585, y - h / 2, z - w / 2, 3.6, y + h / 2, z + w / 2, M.GAUGE_FACE);
    };
    const line = (x0, y0, z0, x1, y1, z1, m) => pn.box(x0, y0, z0, x1, y1, z1, m, { thin: true, md: 0.02 });
    mfd(-0.26, 0.64, 0.19, 0.17);                                              // tactical: range rings and a contact
    for (let i = 1; i <= 3; i++) ringYZ(pn, 3.578, 3.584, 0.64, -0.26, 0.022 * i, 0.004, M.NAV_GREEN);
    line(3.578, 0.575, -0.34, 3.584, 0.705, -0.338, M.NAV_GREEN);
    line(3.576, 0.66, -0.235, 3.584, 0.675, -0.22, M.AC_YELLOW);
    mfd(0.26, 0.64, 0.19, 0.17);                                               // systems: engine and fuel bars
    for (let i = 0; i < 6; i++) line(3.578, 0.57, 0.19 + i * 0.026, 3.584, 0.57 + 0.03 + ((i * 5) % 4) * 0.018, 0.196 + i * 0.026, i === 4 ? M.AC_YELLOW : M.NAV_GREEN);
    pn.box(3.6, 0.53, -0.09, 3.625, 0.75, 0.09, M.AC_GRAY_DARK);               // centre well behind the attitude ball
    pn.box(3.59, 0.54, -0.08, 3.6, 0.74, 0.08, M.GAUGE_FACE);
    // round gauges, warning lights and rocker switches
    gauge(pn, 3.62, 0.795, -0.32, 0.045); gauge(pn, 3.62, 0.795, 0.32, 0.045);
    gauge(pn, 3.62, 0.795, -0.19, 0.03); gauge(pn, 3.62, 0.795, 0.19, 0.03);
    for (let i = 0; i < 8; i++) pn.box(3.58, 0.84, -0.12 + i * 0.03, 3.62, 0.87, -0.1 + i * 0.03, i % 3 ? M.SWITCH_GRAY : i % 2 ? M.SWITCH_RED : M.AC_YELLOW, { md: 0.02 });
    for (let i = 0; i < 9; i++) pn.box(3.6, 0.47, -0.36 + i * 0.045, 3.63, 0.5, -0.34 + i * 0.045, i % 4 === 1 ? M.SWITCH_RED : M.SWITCH_GRAY, { md: 0.02 });

    // ------------------------------------------------------------------ animated controls
    const stick = k.interior('stick', { pivot: [2.6, -0.18, 0.36], local: true, voxel: 0.01 });
    stick.cyl('y', 0, 0, 0.022, 0.022, 0, 0.3, M.COCKPIT_TRIM);
    stick.box(-0.05, 0.28, -0.03, 0.05, 0.4, 0.03, M.AC_BLACK);
    stick.box(-0.04, 0.34, -0.035, 0.0, 0.36, 0.035, M.SWITCH_RED, { md: 0.01 });
    const thr = k.interior('throttleLever', { pivot: [2.4, -0.05, -0.36], local: true, voxel: 0.01 });
    thr.cyl('y', 0, 0, 0.02, 0.02, 0, 0.22, M.COCKPIT_TRIM);
    thr.box(-0.06, 0.2, -0.03, 0.06, 0.28, 0.03, M.AC_BLACK);
    for (const [n, z] of [['pedalL', -0.16], ['pedalR', 0.16]]) {
      const p = k.interior(n, { pivot: [3.4, -0.2, z], local: true, voxel: 0.01 });
      p.box(-0.02, -0.08, -0.07, 0.02, 0.1, 0.07, M.STEEL_DARK);
    }
    for (const [n, cz] of [['nASI', -0.3], ['nALT', 0.3]]) needle(k.interior(n, { pivot: [3.596, 0.8, cz], local: true, voxel: 0.004 }), 0.04, M.NEEDLE_ORANGE);
    const ai = k.interior('attitude', { pivot: [3.6, 0.64, 0.0], local: true, voxel: 0.004 });
    const R = 0.065;
    ai.fn(-R, -R, -R, R, R, R, (x, y, z) => {
      if (x * x + y * y + z * z > R * R) return 0;
      if (Math.abs(y) < 0.0035) return M.GAUGE_WHITE;
      return y > 0 ? M.SIDING_BLUE : M.BRICK_BROWN;
    });
  },
});
