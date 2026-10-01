import { M } from '../../voxel/palette.js';
import { textDots, textPixels } from '../../voxel/glyphs.js';
import { Noise } from '../../core/noise.js';
import { strut } from './parts.js';
import { munitionRecipe } from '../munitions.js';

/* The small things that make a voxel aircraft read as a machine: lettering, insignia, camouflage, panel seams, rivets, lights,
   a pilot in the seat, jet intakes with a fan, nozzles with petals, landing gear legs and the stores that hang under the wings.
   Every function writes into a Recipe in body-frame meters (x forward, y up, z right) and is a pure function of its arguments. */

const noises = new Map();
const noiseFor = (seed) => { let n = noises.get(seed); if (!n) { n = new Noise(seed); noises.set(seed, n); } return n; };

/**
 * Paint lettering on the side of a fuselage or tail. x is the center of the text along the aircraft, y its baseline, side +1
 * for the right side (the text reads toward the nose) and -1 for the left (it reads toward the tail), px the size of one
 * pixel of the 5 by 7 font. z0 and z1 bound the skin in depth so only the outer shell is touched.
 */
export function decal(r, text, { x, y, side = 1, px = 0.06, mat = M.AC_WHITE, z0 = 0.05, z1 = 4, gap = 1 }) {
  const dots = new Set(textDots(text, gap).map(([c, row]) => c + ',' + row));
  const w = textPixels(text, gap) * px, xa = x - w / 2;
  r.paint(xa - px, y - px, side > 0 ? z0 : -z1, xa + w + px, y + 8 * px, side > 0 ? z1 : -z0, (lx, ly) => {
    const c = Math.floor((side > 0 ? lx - xa : xa + w - lx) / px), row = 6 - Math.floor((ly - y) / px);
    return dots.has(c + ',' + row) ? mat : 0;
  }, { thin: true });
}

/** Lettering on a horizontal surface (wing, deck) readable from above with the nose at the top: x is the middle, z the middle across. */
export function decalTop(r, text, { x, z, y0, y1, px = 0.08, mat = M.AC_WHITE, gap = 1, flip = false }) {
  const dots = new Set(textDots(text, gap).map(([c, row]) => c + ',' + row));
  const w = textPixels(text, gap) * px, za = z - w / 2;
  r.paint(x - 4 * px, y0, za - px, x + 4 * px, y1, za + w + px, (lx, ly, lz) => {
    const c = Math.floor((flip ? za + w - lz : lz - za) / px), row = Math.floor((x + 3.5 * px - lx) / px);
    return dots.has(c + ',' + row) ? mat : 0;
  }, { thin: true });
}

/** Concentric rings on a surface that faces up or down: a roundel. rings is a list of [radius, material] from the outside in. */
export function roundel(r, cx, cz, y0, y1, rings, dist = 0) {
  const R = rings[0][0];
  r.paint(cx - R, y0, cz - R, cx + R, y1, cz + R, (x, y, z) => {
    const d = Math.hypot(x - cx, z - cz);
    for (let i = rings.length - 1; i >= 0; i--) if (d < rings[i][0] && d >= (rings[i + 1] ? rings[i + 1][0] : 0)) return rings[i][1];
    return 0;
  }, { thin: true });
}

/** Rings on a side: the same for a vertical surface facing +z or -z (a fuselage side, a fin). */
export function roundelSide(r, cx, cy, z0, z1, rings) {
  const R = rings[0][0];
  r.paint(cx - R, cy - R, z0, cx + R, cy + R, z1, (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    for (let i = rings.length - 1; i >= 0; i--) if (d < rings[i][0] && d >= (rings[i + 1] ? rings[i + 1][0] : 0)) return rings[i][1];
    return 0;
  }, { thin: true });
}

/**
 * A blotchy camouflage over a box: mats are the colors from most to least common, scale the size of the patches in meters.
 * Everything already solid in the box is recolored, so run it before the details that must keep their own color.
 * under: below this height the surface takes the pale underside color instead (a countershaded belly).
 */
export function camo(r, box, mats, { scale = 1.4, seed = 1, under = null, underMat = M.AC_GRAY_LIGHT, soft = 0.1, y = 1, along = 1 } = {}) {
  const n = noiseFor(seed), n2 = noiseFor(seed + 9);
  const k = mats.length;
  r.paint(box[0], box[1], box[2], box[3], box[4], box[5], (x, yy, z) => {
    if (under !== null && (typeof under === 'function' ? under(x, yy, z) : yy < under)) return underMat;
    const v = n.n3((x / scale) * along, yy / (scale * 0.9) * y, z / scale) * 0.7 + n2.n3(x / (scale * 0.4), yy / (scale * 0.4), z / (scale * 0.4)) * soft;
    // thresholds that spread the colors with the first most common
    if (v < -0.1 || k === 1) return mats[0];
    if (k === 2) return mats[1];
    return v < 0.28 ? mats[1] : mats[2];
  });
}

/** Panel seams: thin lines at the given stations along x, over a box (the airframe skin only: the seam is painted, not cut). */
export function seams(r, box, xs, { w = 0.012, mat = M.AC_GRAY_DARK, ymin = -99, ymax = 99 } = {}) {
  r.paint(box[0], box[1], box[2], box[3], box[4], box[5], (x, y) => {
    if (y < ymin || y > ymax) return 0;
    for (let i = 0; i < xs.length; i++) if (Math.abs(x - xs[i]) < w) return mat;
    return 0;
  }, { thin: true });
}

/** Seams along z (spanwise lines on a wing): at the given z stations, both sides if mirror. */
export function seamsZ(r, box, zs, { w = 0.012, mat = M.AC_GRAY_DARK, mirror = true, y0 = -99, y1 = 99 } = {}) {
  r.paint(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z) => {
    if (y < y0 || y > y1) return 0;
    const a = mirror ? Math.abs(z) : z;
    for (let i = 0; i < zs.length; i++) if (Math.abs(a - zs[i]) < w) return mat;
    return 0;
  }, { thin: true });
}

/** A grid of rivets or screws: dots every dx by dz over a box, only on the upper surface voxels above ymin. */
export function rivets(r, box, dx, dz, { mat = M.AC_GRAY_DARK, ymin = -99, ymax = 99, size = 0.014, phase = 0 } = {}) {
  r.paint(box[0], box[1], box[2], box[3], box[4], box[5], (x, y, z) => {
    if (y < ymin || y > ymax) return 0;
    const fx = ((x + phase) % dx + dx) % dx, fz = ((Math.abs(z)) % dz + dz) % dz;
    return Math.min(fx, dx - fx) < size && Math.min(fz, dz - fz) < size ? mat : 0;
  }, { thin: true, md: 0.06 });
}

/** Navigation and anti-collision lights: red on the left tip, green on the right, white on the tail, a beacon on top. */
export function navLights(r, { left, right, tail = null, beacon = null, size = 0.1 }) {
  const b = (p, m) => r.box(p[0] - size, p[1] - size * 0.5, p[2] - size * 0.5, p[0] + size, p[1] + size * 0.5, p[2] + size * 0.5, m, { md: 0.12 });
  b(left, M.NAV_RED); b(right, M.NAV_GREEN);
  if (tail) b(tail, M.STROBE);
  if (beacon) r.box(beacon[0] - size * 0.7, beacon[1], beacon[2] - size * 0.7, beacon[0] + size * 0.7, beacon[1] + size * 0.6, beacon[2] + size * 0.7, M.BEACON_RED, { md: 0.12 });
}

// ---------------------------------------------------------------------------------------------------------------- people
/**
 * A pilot sitting in a seat, looking along +x. (x, y) is the hip point at the seat center. hands are the two grip points
 * [[x, y, z], [x, y, z]] the arms reach for. Colors: suit, helmet, visor. Fine voxels show the harness and the oxygen hose.
 */
export function pilot(r, x, y, { hands = [[x + 0.42, y + 0.2, -0.2], [x + 0.42, y + 0.2, 0.2]], feet = x + 0.5, suit = M.AC_OLIVE, helmet = M.AC_WHITE, visor = M.AC_BLACK, skin = M.PLASTER_TERRA, vest = M.AC_BLACK, lean = 0, head = 0.115, reach = true } = {}) {
  const hx = x + lean * 0.5;
  // legs: thighs forward, shins down to the pedals, boots
  for (const s of [-1, 1]) {
    strut(r, [x - 0.02, y + 0.09, s * 0.115], [x + 0.4, y + 0.14, s * 0.12], 0.17, suit, { md: 0.1 });
    strut(r, [x + 0.4, y + 0.14, s * 0.12], [feet, y - 0.3, s * 0.12], 0.13, suit, { md: 0.1 });
    r.box(feet - 0.06, y - 0.38, s * 0.12 - 0.065, feet + 0.17, y - 0.28, s * 0.12 + 0.065, M.AC_BLACK, { md: 0.12 });
  }
  // torso with a chest and a harness
  r.ell(hx - 0.02, y + 0.36, 0, 0.14, 0.27, 0.215, suit);
  r.ell(hx + 0.01, y + 0.45, 0, 0.12, 0.17, 0.19, vest, { md: 0.1 });
  r.paint(hx - 0.2, y + 0.1, -0.26, hx + 0.2, y + 0.7, 0.26, (px, py, pz) => (px > hx + 0.04 && Math.abs(Math.abs(pz) - 0.1 - (py - y - 0.2) * 0.25) < 0.025 ? M.AC_ORANGE : 0), { thin: true, md: 0.08 });
  // shoulders, arms and gloves
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1, h = hands[i];
    r.ell(hx - 0.02, y + 0.58, s * 0.235, 0.085, 0.085, 0.085, suit);
    if (reach) {
      const ex = hx + 0.12, ey = y + 0.3, ez = s * 0.3;
      strut(r, [hx - 0.02, y + 0.58, s * 0.24], [ex, ey, ez], 0.11, suit, { md: 0.12 });
      strut(r, [ex, ey, ez], [h[0], h[1], h[2]], 0.095, suit, { md: 0.12 });
      r.box(h[0] - 0.04, h[1] - 0.04, h[2] - 0.045, h[0] + 0.06, h[1] + 0.05, h[2] + 0.045, M.AC_BLACK, { md: 0.1 });
    }
  }
  // neck, head, helmet, visor, mask
  r.box(hx - 0.04, y + 0.62, -0.05, hx + 0.04, y + 0.72, 0.05, skin, { md: 0.1 });
  const hy = y + 0.82;
  r.ell(hx + 0.01, hy, 0, head * 1.12, head * 1.08, head, helmet);
  r.ell(hx + head * 0.5, hy - 0.025, 0, head * 0.78, head * 0.55, head * 0.9, visor, { md: 0.12 });
  r.box(hx + head * 0.9, hy - 0.085, -0.045, hx + head * 1.35, hy - 0.04, 0.045, M.AC_GRAY_DARK, { md: 0.1 });
  r.box(hx - head * 0.6, hy - 0.07, -head * 0.95, hx + head * 0.5, hy - 0.02, -head * 1.12, M.AC_GRAY_DARK, { md: 0.1 });         // ear cup
  r.box(hx - head * 0.6, hy - 0.07, head * 0.95, hx + head * 0.5, hy - 0.02, head * 1.12, M.AC_GRAY_DARK, { md: 0.1 });
  strut(r, [hx + head * 1.1, hy - 0.06, 0], [hx + 0.08, y + 0.5, 0.08], 0.022, M.AC_BLACK, { md: 0.06 });                          // oxygen hose
}

// ------------------------------------------------------------------------------------------------------------------ engines
/**
 * An engine inlet: the mouth is opened, a dark duct runs back from it and a ring of fan blades sits recessed behind the lip. The
 * axis is x and the lip is at x; the duct is `depth` deep and the fan stands `rec` behind the lip.
 */
export function fanFace(r, x, y, z, R, { depth = 0.9, rec = 0.2, blades = 22, hub = 0.28, housing = M.AC_BLACK, blade = M.STEEL_BRIGHT, dark = M.STEEL_DARK, phase = 0 } = {}) {
  r.cyl('x', y, z, R, R, x - depth, x + 0.04, 0);                                  // open the mouth
  r.cyl('x', y, z, R, R * 0.9, x - depth, x - rec - 0.03, housing);                // the duct, narrowing a little
  r.fn(x - rec - 0.05, y - R, z - R, x - rec + 0.005, y + R, z + R, (px, py, pz) => {
    const dy = py - y, dz = pz - z, d = Math.hypot(dy, dz) / R;
    if (d > 0.99) return 0;
    if (d < hub) return d < hub * 0.35 ? M.STEEL_BRIGHT : M.STEEL;
    const a = Math.atan2(dz, dy) + phase + d * 0.9;                                // a twist with radius, like real blades
    return (Math.floor(((a / (2 * Math.PI)) + 1) * blades * 2) & 1) ? blade : dark;
  }, { md: 0.14 });
  // a bright lip around the mouth
  r.cyl('x', y, z, R + 0.045, R + 0.045, x - 0.05, x, M.AC_METAL, { thin: true, md: 0.1 });
  r.cyl('x', y, z, R, R, x - 0.06, x + 0.01, 0, { thin: true });
}

/** A nozzle: a ring of petals around a dark throat. Open end at x (facing -x), the can runs forward by `len`. */
export function nozzle(r, x, y, z, R, { len = 0.7, petals = 16, shell = M.AC_GRAY_DARK, burn = M.AC_EXHAUST, inner = M.STEEL_DARK, taper = 0.84 } = {}) {
  r.cyl('x', y, z, R, R * taper, x, x + len, shell);
  r.cyl('x', y, z, R * 0.9, R * 0.9 * taper * 0.96, x - 0.002, x + len * 0.96, 0);                 // hollow it
  r.cyl('x', y, z, R * 0.88, R * 0.82, x + 0.001, x + len * 0.7, burn, { md: 0.2 });               // burnt inner wall
  r.cyl('x', y, z, R * 0.5, R * 0.45, x + len * 0.55, x + len * 0.8, inner, { md: 0.2 });          // turbine disk deep inside
  // petals: thin gaps and a lighter edge on every other petal
  r.paint(x - 0.01, y - R, z - R, x + len * 0.55, y + R, z + R, (px, py, pz) => {
    const dy = py - y, dz = pz - z, d = Math.hypot(dy, dz);
    if (d < R * 0.78) return 0;
    const a = Math.atan2(dz, dy), t = ((a / (2 * Math.PI)) + 1) * petals;
    const f = t - Math.floor(t);
    if (f < 0.07 || f > 0.93) return M.AC_BLACK;
    return Math.floor(t) & 1 ? M.AC_GRAY : 0;
  }, { thin: true, md: 0.1 });
}

/** A propeller spinner: a cone on the +x side of the hub (recipe origin = hub center). */
export function spinner(r, x0, x1, R0, mat = M.AC_RED, tip = 0.012) {
  r.loft('x', [0, 0.18, 0.4, 0.62, 0.82, 1].map((t) => ({ a: x0 + (x1 - x0) * t, c1: 0, c2: 0, r1: Math.max(tip, R0 * Math.sqrt(Math.max(0, 1 - t * t * 0.9))), r2: Math.max(tip, R0 * Math.sqrt(Math.max(0, 1 - t * t * 0.9))), n: 2 })), mat);
}

/**
 * A propeller of n blades with real taper and a shaped tip, about +x, recipe origin at the hub. Blade chord narrows toward the tip,
 * a brightly painted tip band is the part the eye follows when it spins.
 */
export function prop(r, radius, blades = 3, { chord = 0.2, mat = M.AC_PROP, tip = M.AC_PROP_TIP, hub = M.AC_METAL, hubR = 0.1, twist = 0.3, tipLen = 0.18 } = {}) {
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    r.fn(-0.08, -radius, -radius, 0.08, radius, radius, (x, y, z, cell) => {
      const along = y * ca + z * sa, perp = -y * sa + z * ca;
      if (along < hubR * 0.7 || along > radius) return 0;
      const u = along / radius;
      // a paddle: narrow at the root (the shank), widest at about 60 percent, rounded at the tip
      const shape = 0.42 + 0.58 * Math.sin(Math.min(1, u / 0.62) * 1.5708) - 0.34 * Math.max(0, (u - 0.62) / 0.38) ** 2;
      const w = Math.max(chord * shape * 0.5, cell * 0.55);
      // the blade is a twisted plate: its pitch changes with radius, so it leans forward at the tip
      const lean = perp * twist * (0.4 + u);
      const th = Math.max(0.026 * (1 - 0.6 * u) + 0.01, cell * 0.55) * 0.5;
      if (Math.abs(perp) > w || Math.abs(x - lean * 0.12) > th) return 0;
      return along > radius - tipLen ? tip : mat;
    }, { thin: true });
  }
  r.cyl('x', 0, 0, hubR, hubR, -0.08, 0.08, hub);
}

// ------------------------------------------------------------------------------------------------------------------ gear
/**
 * A landing gear leg and its details, in body coordinates, built into a part recipe: an oleo from the top to the axle, a torque
 * link, a brake caliper and hose, a door. Not the wheel itself (that is its own part so it can spin and compress).
 */
export function gearLeg(r, top, axle, { thick = 0.14, lower = 0.1, mat = M.STEEL_BRIGHT, dark = M.STEEL_DARK, link = true, fork = 0.15, drag = null } = {}) {
  const mid = [top[0] + (axle[0] - top[0]) * 0.5, top[1] + (axle[1] - top[1]) * 0.5, top[2] + (axle[2] - top[2]) * 0.5];
  strut(r, top, mid, thick, dark);
  strut(r, mid, axle, lower, mat);
  r.cyl('y', mid[0], mid[2], thick * 0.62, thick * 0.62, mid[1] - 0.03, mid[1] + 0.03, M.AC_METAL, { md: 0.15 });      // the piston collar
  if (link) {
    // scissor links
    strut(r, [mid[0] - 0.02, mid[1] + 0.02, mid[2] + 0.06], [axle[0] - 0.12, axle[1] + 0.12, axle[2] + 0.06], 0.035, dark, { md: 0.12 });
    strut(r, [mid[0] - 0.02, mid[1] + 0.02, mid[2] - 0.06], [axle[0] - 0.12, axle[1] + 0.12, axle[2] - 0.06], 0.035, dark, { md: 0.12 });
  }
  if (fork) {
    r.box(axle[0] - 0.05, axle[1] - 0.04, axle[2] - fork, axle[0] + 0.05, axle[1] + 0.06, axle[2] + fork, dark, { md: 0.14 });
  }
  if (drag) strut(r, top, drag, 0.07, dark, { md: 0.18 });                                                           // a drag brace
}

// ----------------------------------------------------------------------------------------------------------------- stores
/**
 * A store hung on a pylon: a part that shows while its station is loaded. `model` is a munition model, `at` where its center
 * hangs, `voxel` the size of its own voxels. The part is called `name` and is visible when channel store_<station> is on.
 */
export function store(k, name, station, model, at, { voxel = 0.03125, rot = 0 } = {}) {
  const p = k.part(name, { visibleWhen: 'store_' + station, voxel });
  p.stamp(munitionRecipe(model), at[0], at[1], at[2], rot);
  for (const op of p.ops) if (op.t !== 'paint') op.thin = op.thin || op.t === 'cyl' || op.t === 'fn';
  return p;
}

/** A pylon from the wing: a swept plate with a fairing and sway braces. */
export function pylon(r, x, yTop, yBottom, z, { len = 1.4, thick = 0.09, mat = M.AC_GRAY, dark = M.AC_GRAY_DARK } = {}) {
  r.loft('y', [
    { a: yBottom, c1: x, c2: z, r1: len * 0.5, r2: thick * 0.7, n: 2.6 },
    { a: yBottom + (yTop - yBottom) * 0.5, c1: x + len * 0.04, c2: z, r1: len * 0.52, r2: thick, n: 2.6 },
    { a: yTop, c1: x + len * 0.1, c2: z, r1: len * 0.5, r2: thick * 0.8, n: 2.6 },
  ], mat);
  r.box(x - len * 0.5, yBottom - 0.02, z - thick * 1.4, x + len * 0.5, yBottom + 0.03, z + thick * 1.4, dark, { md: 0.1 });
}

/** A rocket pod: a drum with a rounded nose and tail cap, a ring of tube mouths, a bracket and rails. Axis x, centered at (cx, cy, cz). */
export function rocketPod(r, cx, cy, cz, { len = 1.5, radius = 0.2, mat = M.AC_OLIVE, tubes = 7, cap = M.AC_GRAY_LIGHT } = {}) {
  r.cyl('x', cy, cz, radius, radius, cx - len / 2, cx + len / 2, mat);
  r.cyl('x', cy, cz, radius, radius * 0.45, cx + len / 2, cx + len / 2 + 0.2, cap, { md: 0.12 });
  r.cyl('x', cy, cz, radius * 0.95, radius * 0.55, cx - len / 2 - 0.16, cx - len / 2, M.AC_GRAY_DARK, { md: 0.12 });
  r.cyl('x', cy, cz, radius + 0.012, radius + 0.012, cx - len * 0.28, cx - len * 0.24, M.AC_YELLOW, { thin: true, md: 0.1 });
  r.cyl('x', cy, cz, radius + 0.012, radius + 0.012, cx + len * 0.22, cx + len * 0.26, M.AC_YELLOW, { thin: true, md: 0.1 });
  for (let i = 0; i < tubes; i++) {
    const a = i === 0 ? 0 : ((i - 1) / (tubes - 1)) * Math.PI * 2, rr = i === 0 ? 0 : radius * 0.56;
    r.cyl('x', cy + Math.sin(a) * rr, cz + Math.cos(a) * rr, radius * 0.17, radius * 0.17, cx + len / 2 + 0.01, cx + len / 2 + 0.2, M.AC_BLACK, { md: 0.1 });
  }
  r.box(cx - 0.15, cy + radius * 0.9, cz - 0.05, cx + 0.15, cy + radius + 0.06, cz + 0.05, M.AC_GRAY_DARK, { md: 0.1 });
}
