const snap = (v) => Math.round(v * 2) / 2;

/* Lots and frontage. A block is cut into lots by recursive splitting; every lot faces one of the block's street sides.
   rot 0 faces +z (south), 2 faces -z (north), 1 faces -x (west), 3 faces +x (east). Descriptor w runs along the street
   frontage, d is the depth away from the street. */

export const FLOOR = 3.6;
/** Terrain height snapped to the floor grid, so window rows and the ground floor line up with the ground. */
export const snapY = (h) => Math.round(h / FLOOR) * FLOOR;

/** Cut rect r into lots. min is the smallest side, max the side above which a lot is always cut, gap the alley between lots. */
export function subdivide(rng, r, { min = 40, max = 100, gap = 4, stop = 0.3 } = {}) {
  const out = [];
  const rec = (x0, z0, x1, z1, depth) => {
    const w = x1 - x0, d = z1 - z0;
    const canX = w >= min * 2 + gap, canZ = d >= min * 2 + gap;
    const tooBig = w > max || d > max;
    if ((!canX && !canZ) || (!tooBig && depth > 0 && rng.chance(stop))) { out.push({ x0, z0, x1, z1 }); return; }
    const splitX = canX && (!canZ || w > d * 1.12 || (w > d * 0.88 && rng.chance(0.5)));
    const span = splitX ? w : d, lo = (min + gap / 2) / span;
    const t = Math.min(1 - lo, Math.max(lo, rng.range(0.38, 0.62)));
    if (splitX) {
      const c = x0 + w * t;
      rec(x0, z0, c - gap / 2, z1, depth + 1); rec(c + gap / 2, z0, x1, z1, depth + 1);
    } else {
      const c = z0 + d * t;
      rec(x0, z0, x1, c - gap / 2, depth + 1); rec(x0, c + gap / 2, x1, z1, depth + 1);
    }
  };
  rec(r.x0, r.z0, r.x1, r.z1, 0);
  return out.map((l) => ({ ...l, w: l.x1 - l.x0, d: l.z1 - l.z0, cx: (l.x0 + l.x1) / 2, cz: (l.z0 + l.z1) / 2 }));
}

/** The block side a lot faces: one of the sides it touches, preferring the longer frontage. */
export function faceOf(rng, r, L) {
  const e = 0.6, sides = [];
  if (L.z1 >= r.z1 - e) sides.push(['S', L.w]);
  if (L.z0 <= r.z0 + e) sides.push(['N', L.w]);
  if (L.x0 <= r.x0 + e) sides.push(['W', L.d]);
  if (L.x1 >= r.x1 - e) sides.push(['E', L.d]);
  if (!sides.length) {
    const dn = L.z0 - r.z0, ds = r.z1 - L.z1, dw = L.x0 - r.x0, de = r.x1 - L.x1, m = Math.min(dn, ds, dw, de);
    return m === dn ? 'N' : m === ds ? 'S' : m === dw ? 'W' : 'E';
  }
  return rng.weighted(sides.map(([s, len]) => [s, len * len]));
}

export const ROT = { S: 0, N: 2, W: 1, E: 3 };

/**
 * Footprint of a building in lot L facing `side`. front is the setback from the street, sides the setback along the
 * frontage, maxW and maxD cap the size. Returns { x, z, w, d, rot } ready for a kit descriptor.
 */
export function footprint(L, side, { front = 3, sides = 0, back = 0, maxW = 1e9, maxD = 1e9, jitter = 0, rng = null } = {}) {
  const horiz = side === 'N' || side === 'S';
  const fw = horiz ? L.w : L.d, dd = horiz ? L.d : L.w;
  const w = Math.max(6, Math.min(maxW, fw - 2 * sides)), d = Math.max(6, Math.min(maxD, dd - front - back));
  const j = jitter && rng ? rng.range(-jitter, jitter) * Math.max(0, fw - w) / 2 : 0;
  let x, z;
  if (side === 'S') { x = L.cx + j; z = L.z1 - front - d / 2; }
  else if (side === 'N') { x = L.cx + j; z = L.z0 + front + d / 2; }
  else if (side === 'W') { x = L.x0 + front + d / 2; z = L.cz + j; }
  else { x = L.x1 - front - d / 2; z = L.cz + j; }
  return { x: snap(x), z: snap(z), w, d, rot: ROT[side] };
}

/** Height field from skyline peaks in lattice block units: [{ i, j, reach, amp, sy }]. Returns (rng, r) => meters. */
export function skyline(peaks, hmin, hmax, { bias = 1.15, noise = 0.4, spike = 0.06 } = {}) {
  return (rng, r) => {
    let t = 0;
    for (const p of peaks) t = Math.max(t, Math.max(0, 1 - Math.hypot(r.i - p.i, (r.j - p.j) * (p.sy ?? 1)) / p.reach) * (p.amp ?? 1));
    let h = hmin + (hmax - hmin) * Math.pow(t, bias);
    h *= rng.range(1 - noise, 1);
    if (t > 0.35 && rng.chance(spike)) h *= rng.range(1.15, 1.4);
    return h;
  };
}

/** True when a circle of the given radius around (x, z) stays clear of every inter-city road. */
export function clearOfHighways(ctx, x, z, radius) {
  const hw = ctx.world.highway;
  if (!hw) return true;
  for (const s of hw.segments) {
    const abx = s.bx - s.ax, abz = s.bz - s.az, l2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * abx + (z - s.az) * abz) / l2));
    if (Math.hypot(x - (s.ax + abx * t), z - (s.az + abz * t)) < radius + (s.w ?? 12) / 2 + 6) return false;
  }
  return true;
}
