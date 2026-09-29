import { M } from '../../voxel/palette.js';
import { kitFor } from '../../aircraft/instance.js';

/* Static aircraft for aprons, ramps and hangar lines. Models stand on y = 0 with local +x as the nose. Paint that should follow
   the instance tint (an airline color) uses CAR_PAINT, the one material whose color the tint multiplies. Files starting with an
   underscore are not registered as scenery. */

const WHITE = M.AC_WHITE, GRAY = M.AC_GRAY_LIGHT, DARK = M.AC_GRAY_DARK, TINT = M.CAR_PAINT;

/**
 * A twin-jet airliner. k scales the whole airframe (1 is a 37 m narrow-body, 1.7 a 64 m widebody); heavy gives the widebody its
 * six-wheel main bogies and larger engines.
 */
export function airliner(b, { k = 1, heavy = false, stripe = true } = {}) {
  const S = (v) => v * k;
  const ax = S(3.6);
  const fus = [
    [18.8, 3.0, 0.2], [18.0, 3.2, 0.9], [16.6, 3.45, 1.55], [14.4, 3.6, 1.9], [11.0, 3.6, 2.0], [-9.0, 3.6, 2.0], [-12.5, 3.9, 1.75], [-16.0, 4.6, 1.05], [-18.5, 5.4, 0.3],
  ];
  b.loft('x', fus.map(([x, y, r]) => ({ a: S(x), c1: S(y), c2: 0, r1: S(r), r2: S(r), n: 2.15 })), WHITE);
  // belly, nose, cockpit glass, passenger windows, doors, cheatline
  b.paint(S(-19), 0, S(-2.2), S(19), S(2.55), S(2.2), () => GRAY, { md: 8 });
  b.paint(S(17.3), S(2.5), S(-1.2), S(19), S(4.6), S(1.2), () => DARK);
  b.paint(S(15.5), S(3.95), S(-2.1), S(17.5), S(4.6), S(2.1), () => M.AC_CANOPY);
  const pitch = 0.76 * k;
  b.paint(S(-13), S(3.95), S(-2.2), S(13.6), S(4.36), S(2.2), (lx) => (((lx % pitch) + pitch) % pitch < pitch * 0.58 ? M.AC_CANOPY : 0), { md: 0.6 });
  for (const dx of [14.3, -11.4]) b.paint(S(dx - 0.55), S(2.3), S(-2.2), S(dx + 0.55), S(4.3), S(2.2), (lx, ly, lz) => (Math.abs(lz) > S(1.72) ? M.AC_GRAY : 0), { md: 1 });
  if (stripe) b.paint(S(-13), S(3.3), S(-2.2), S(14), S(3.62), S(2.2), () => TINT);
  // wings with a raked tip, engines, pylons
  const wing = (s) => {
    b.wing([S(4.2), S(2.5), s * S(1.7)], S(15.3), S(6.4), S(1.5), S(8.2), S(1.4), 0.13, 0.09, s, WHITE);
    b.box(S(-5.7), S(3.85), s * S(16.85), S(-4.0), S(5.4), s * S(17.1), WHITE, { md: 1 });
    b.box(S(-5.7), S(3.85), s * S(16.85), S(-5.0), S(4.3), s * S(17.1), s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.5 });
    const z = s * S(5.7), er = S(heavy ? 1.55 : 1.05), ey = S(heavy ? 1.75 : 1.6);
    b.box(S(1.0), ey + er * 0.7, z - S(0.2), S(4.6), S(2.85), z + S(0.2), WHITE, { md: 1 });
    b.cyl('x', ey, z, er * 0.9, er, S(1.1), S(5.7), WHITE);
    b.cyl('x', ey, z, er * 1.02, er * 1.02, S(5.3), S(5.7), stripe ? TINT : WHITE);
    b.cyl('x', ey, z, er * 0.8, er * 0.8, S(4.95), S(5.8), 0);
    b.cyl('x', ey, z, er * 0.78, er * 0.78, S(4.7), S(4.9), M.AC_BLACK);
    b.cyl('x', ey, z, er * 0.28, er * 0.06, S(4.6), S(5.5), M.AC_METAL, { md: 1 });
    b.cyl('x', ey, z, er * 0.6, er * 0.55, S(0.5), S(1.5), M.AC_EXHAUST, { md: 2 });
    b.cyl('x', ey, z, er * 0.28, er * 0.1, S(0.3), S(1.1), DARK, { md: 1 });
    // horizontal tail
    b.wing([S(-13.4), S(4.7), s * S(0.8)], S(6.0), S(3.4), S(1.2), S(4.2), S(0.6), 0.1, 0.08, s, WHITE);
  };
  wing(-1); wing(1);
  // fin, in the tint color when there is one, with a white rudder edge and a tip light
  b.fn(S(-24), S(4.9), S(-0.22), S(-10), S(12.1), S(0.22), (lx, ly) => {
    const t = (ly - S(4.9)) / S(7.2), le = S(-11) - S(5.2) * t, te = le - (S(7) - S(4.2) * t);
    if (lx > le || lx < te) return 0;
    return stripe && lx > te + S(1.2) ? TINT : WHITE;
  });
  b.box(S(-17.2), S(12.05), -0.12, S(-16.6), S(12.35), 0.12, M.STROBE, { md: 1 });
  b.box(S(-0.2), S(5.55), -0.14, S(0.1), S(5.8), 0.14, M.BEACON_RED, { md: 1 });
  b.box(S(-1.0), S(1.55), -0.14, S(-0.7), S(1.62), 0.14, M.BEACON_RED, { md: 1 });
  b.box(S(4.5), S(5.55), -0.05, S(5.6), S(6.1), 0.05, WHITE, { md: 1 });
  b.cyl('x', S(4.9), 0, S(0.35), S(0.08), S(-20), S(-18.4), DARK, { md: 1 });
  // landing gear: two nose wheels and the main bogies
  const nx = S(13.4), wr = S(heavy ? 0.55 : 0.4);
  b.box(nx - 0.1, wr, -0.09, nx + 0.1, S(1.9), 0.09, M.STEEL, { md: 1 });
  for (const s of [-1, 1]) b.cyl('z', nx, wr, wr, wr, s * 0.3 - 0.13, s * 0.3 + 0.13, M.AC_TIRE);
  const mr = S(heavy ? 0.7 : 0.55), axles = heavy ? [-1.6, 0, 1.6] : [-0.6, 0.6];
  for (const s of [-1, 1]) {
    const z = s * S(3.9);
    b.box(S(-0.2) - 0.14, mr, z - 0.14, S(-0.2) + 0.14, S(2.55), z + 0.14, M.STEEL, { md: 1 });
    b.box(S(-0.2) + axles[0] * k - 0.14, mr * 1.1, z - 0.12, S(-0.2) + axles[axles.length - 1] * k + 0.14, mr * 1.4, z + 0.12, M.STEEL_DARK, { md: 1 });
    for (const a of axles) for (const dz of [-0.24, 0.24]) b.cyl('z', S(-0.2) + a * k, mr, mr, mr, z + dz * k - 0.16 * k, z + dz * k + 0.16 * k, M.AC_TIRE);
  }
  // a little light on the wheels and the underside so it does not read as a flat white slab
  b.box(S(-1.4), S(1.35), S(-1.1), S(3.4), S(1.75), S(1.1), GRAY, { md: 1 });
}

/** A business jet with rear-mounted engines and a T-tail, about 19 m long. */
export function bizjet(b, { stripe = true } = {}) {
  const fus = [[9.8, 1.5, 0.15], [9.0, 1.65, 0.65], [7.4, 1.95, 1.0], [5.0, 2.0, 1.12], [-1.0, 2.0, 1.15], [-4.5, 2.1, 0.95], [-8.0, 2.55, 0.5], [-9.7, 2.9, 0.18]];
  b.loft('x', fus.map(([x, y, r]) => ({ a: x, c1: y, c2: 0, r1: r, r2: r, n: 2.1 })), WHITE);
  b.paint(-10, 0, -1.3, 10, 1.55, 1.3, () => GRAY, { md: 8 });
  b.paint(8.6, 1.4, -1, 10, 2.5, 1, () => DARK);
  b.paint(6.4, 2.15, -1.2, 8.4, 2.6, 1.2, () => M.AC_CANOPY);
  b.paint(-3.5, 2.1, -1.3, 5.4, 2.42, 1.3, (lx) => (((lx % 0.7) + 0.7) % 0.7 < 0.36 ? M.AC_CANOPY : 0), { md: 0.5 });
  if (stripe) b.paint(-8, 1.72, -1.3, 8, 1.95, 1.3, () => TINT);
  for (const s of [-1, 1]) {
    b.wing([1.6, 0.95, s * 0.9], 8.1, 3.2, 1.3, 3.4, 0.5, 0.11, 0.08, s, WHITE);
    b.box(-2.4, 1.15, s * 8.85, -1.1, 1.9, s * 9.05, s < 0 ? M.NAV_RED : M.NAV_GREEN, { md: 0.5 });
    b.cyl('x', 2.4, s * 1.75, 0.5, 0.46, -6.6, -3.4, WHITE);
    b.cyl('x', 2.4, s * 1.75, 0.36, 0.36, -3.6, -3.3, 0, { md: 0.5 });
    b.cyl('x', 2.4, s * 1.75, 0.3, 0.3, -6.8, -6.4, M.AC_EXHAUST, { md: 0.5 });
    b.box(-6.2, 2.0, s * 1.15, -3.8, 2.6, s * 1.4, WHITE, { md: 0.6 });
    b.wing([-8.4, 4.9, s * 0.1], 2.5, 1.6, 0.9, 1.4, 0.15, 0.09, 0.07, s, WHITE);
  }
  b.fn(-11.5, 2.5, -0.13, -6.2, 5.1, 0.13, (lx, ly) => { const t = (ly - 2.5) / 2.6, le = -6.6 - 1.5 * t, te = le - (3.4 - 1.5 * t); return lx <= le && lx >= te ? (stripe && ly < 4 ? TINT : WHITE) : 0; });
  b.box(-0.6, 0.55, -0.08, -0.4, 1.0, 0.08, M.STEEL, { md: 0.5 });
  for (const s of [-1, 1]) b.cyl('z', 6.2, 0.28, 0.28, 0.28, s * 0.14 - 0.08, s * 0.14 + 0.08, M.AC_TIRE);
  b.box(6.1, 0.3, -0.06, 6.3, 1.4, 0.06, M.STEEL, { md: 0.5 });
  for (const s of [-1, 1]) {
    b.box(-0.4, 0.35, s * 1.55 - 0.06, -0.2, 1.2, s * 1.55 + 0.06, M.STEEL, { md: 0.5 });
    b.cyl('z', -0.3, 0.36, 0.36, 0.36, s * 1.55 - 0.13, s * 1.55 + 0.13, M.AC_TIRE);
  }
  b.box(-0.3, 2.95, -0.05, 0.4, 3.15, 0.05, WHITE, { md: 0.5 });
}

/** A light utility helicopter with skids. */
export function helicopter(b, { body = M.AC_RED, stripe = M.AC_WHITE } = {}) {
  b.ell(0.4, 1.75, 0, 1.75, 1.05, 0.95, body);
  b.paint(-2, 0.4, -1.2, 3, 2.9, 1.2, (lx, ly) => (ly < 1.05 ? DARK : ly > 1.55 && ly < 1.75 ? stripe : 0), { md: 4 });
  b.ell(1.6, 1.95, 0, 0.6, 0.55, 0.9, M.AC_CANOPY);
  b.box(-6.6, 1.75, -0.16, -1.0, 2.15, 0.16, body);
  b.box(-6.6, 2.0, -0.14, -6.0, 3.4, 0.14, body);
  b.box(-6.2, 3.0, -0.6, -5.7, 3.1, 0.6, WHITE, { md: 1 });
  for (const s of [-1, 1]) {
    b.box(-1.2, 0.15, s * 0.95 - 0.05, 2.0, 0.25, s * 0.95 + 0.05, M.STEEL_DARK);
    b.box(-0.6, 0.25, s * 0.95 - 0.04, -0.5, 0.95, s * 0.7, M.STEEL_DARK, { md: 1 });
    b.box(1.1, 0.25, s * 0.95 - 0.04, 1.2, 0.95, s * 0.7, M.STEEL_DARK, { md: 1 });
  }
  b.cyl('y', 0.2, 0, 0.16, 0.16, 2.7, 3.2, M.STEEL_DARK);
  b.box(-4.8, 3.18, -0.14, 5.0, 3.26, 0.14, M.AC_BLACK, { md: 0.4 });
  b.box(-0.14, 3.18, -4.9, 0.54, 3.26, 4.9, M.AC_BLACK, { md: 0.4 });
  b.box(-6.5, 2.9, 0.15, -6.3, 3.5, 0.2, M.STROBE, { md: 0.5 });
}

/**
 * The real Skylark, Scrapper or Shrike as a static prop: every exterior part of the flyable model, stamped at its rest position with
 * the wheels on y = 0. armed adds the stores of a fighter.
 */
export function stampAircraft(b, spec, { armed = false } = {}) {
  const kit = kitFor(spec);
  const lift = -Math.min(...spec.gear.wheels.map((w) => w.pos[1] - w.radius));
  for (const p of kit.parts) {
    if (p.group !== 'exterior') continue;
    if (p.visibleWhen && p.visibleWhen !== 'gearOut' && !(armed && /^store_/.test(p.visibleWhen))) continue;
    const [px, py, pz] = p.local ? p.pivot : [0, 0, 0];
    b.stamp(p.recipe, px, py + lift, pz, 0);
  }
  return lift;
}
