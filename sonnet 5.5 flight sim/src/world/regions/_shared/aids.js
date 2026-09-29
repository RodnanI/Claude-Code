/* Airfield furniture shared by the region files: approach lighting, PAPI, taxiway lights, signs, floodlights, and a stand helper
   that parks an aircraft with the crew and vehicles around it. Positions are in the airfield frame (u along the runway heading,
   v to its right). Everything here only appends props and structures to a region's layout output. */

const D2R = Math.PI / 180;

/** Packed instance tint (0xAABBGGRR) from red, green and blue bytes. */
export const rgb = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
export const TINTS = {
  red: rgb(206, 44, 40), orange: rgb(240, 130, 30), yellow: rgb(240, 200, 40), blue: rgb(40, 96, 190), green: rgb(40, 150, 90), white: rgb(245, 245, 240),
  teal: rgb(30, 150, 160), navy: rgb(30, 50, 120), gray: rgb(150, 154, 158), olive: rgb(90, 100, 60), black: rgb(40, 40, 44), maroon: rgb(140, 30, 50),
};

/** A prop at (u, v) facing `dir` degrees clockwise from the runway heading. */
export function propAt(af, out, type, u, v, dir = 0, opts = {}) {
  const [x, z] = af.toWorld(u, v);
  out.props.push({ type, x, z, yaw: af.propYawAt(dir), scale: 1, ...opts });
}

/**
 * Approach lighting for one runway end: barrettes on the extended centerline every 30 m, a crossbar every 150 m, red side rows
 * in the inner 300 m and a green wing bar at the threshold. end is 'west' (the u0 end) or 'east'.
 */
export function approachLights(af, rw, end, out, length = 900) {
  const s = end === 'west' ? -1 : 1, base = end === 'west' ? rw.u0 - (rw.blast?.west || 0) : rw.u1 + (rw.blast?.east || 0);
  const dir = end === 'west' ? 0 : 180;
  for (let k = 1; k <= length / 30; k++) {
    const u = base + s * k * 30;
    propAt(af, out, 'approach-light', u, rw.v, dir, { variant: k % 5 === 0 ? 1 : 0 });
    if (k <= 10) for (const side of [-1, 1]) propAt(af, out, 'approach-light', u, rw.v + side * 9, dir, { variant: 2 });
  }
  propAt(af, out, 'approach-light', base + s * 1.5, rw.v, dir, { variant: 3 });
}

/** Precision approach path indicator: four units 300 m in, beside the runway. side is +1 (right) or -1. */
export function papi(af, rw, end, out, side = -1) {
  const u = end === 'west' ? rw.u0 + 300 : rw.u1 - 300;
  const v = rw.v + side * (rw.w / 2 + 16);
  propAt(af, out, 'papi', u, v, end === 'west' ? 180 : 0);
}

/** Blue edge lights and green centerline lights along a polyline of local points. Skips points that fall on a runway. */
export function taxiLights(af, out, poly, w, { edge = true, center = true, edgeStep = 30, centerStep = 24, skip = null } = {}) {
  let carry = 0, carryC = 0;
  for (let i = 0; i + 1 < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-6) continue;
    const dx = (bx - ax) / len, dy = (by - ay) / len, nx = -dy, ny = dx;
    for (let t = carry; t < len; t += edgeStep) {
      const u = ax + dx * t, v = ay + dy * t;
      if (edge && !(skip && skip(u, v))) for (const s of [-1, 1]) propAt(af, out, 'runway-light', u + nx * s * (w / 2 - 0.2), v + ny * s * (w / 2 - 0.2), 0, { variant: 4 });
    }
    carry = (carry + Math.ceil((len - carry) / edgeStep) * edgeStep) - len;
    for (let t = carryC; t < len; t += centerStep) {
      const u = ax + dx * t, v = ay + dy * t;
      if (center && !(skip && skip(u, v))) propAt(af, out, 'runway-light', u, v, 0, { variant: 1 });
    }
    carryC = (carryC + Math.ceil((len - carryC) / centerStep) * centerStep) - len;
  }
}

/** True when a local point is on any runway of the airfield (with a margin), for skipping lights that would sit in it. */
export function onRunway(af, margin = 4) {
  return (u, v) => af.runways.some((rw) => u >= rw.u0 - margin && u <= rw.u1 + margin && Math.abs(v - rw.v) <= rw.w / 2 + margin);
}

/** A row of floodlight masts from (u0, v0) to (u1, v1), n of them. variant 0 high mast, 1 medium, 2 twin pole. */
export function floodline(af, out, u0, v0, u1, v1, n, variant = 0) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    propAt(af, out, 'floodlight', u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0, { variant });
  }
}

/** Ground crews by aircraft: [type, forward from the aircraft center, right of its axis, turn in degrees, tint]. Set 0 is a turnaround at the
    gate, set 1 a fueling and baggage stop, set 2 a bare stand with a power cart. */
export const CREWS = [
  [['gse-gpu', 16, -3.6, 0, TINTS.orange], ['gse-pushback', 25, 0, 0, TINTS.yellow], ['gse-belt', -9, 5.0, -90, TINTS.white], ['gse-catering', -10, -5.8, 90, TINTS.white]],
  [['gse-gpu', 16, 3.6, 180, TINTS.orange], ['gse-fuel', 3, 11.5, 90, TINTS.white], ['gse-tug', -12, 8.0, 0, TINTS.orange], ['gse-stairs', 8, -5.5, 90, TINTS.white]],
  [['gse-gpu', 16, -3.6, 0, TINTS.orange], ['traffic-cone', 21.5, -3, 0], ['traffic-cone', 21.5, 3, 0], ['gse-bus', 7, 10.5, 90, TINTS.orange]],
];

/**
 * Park an aircraft at a stand and put a crew around it. The stand itself is painted by the region (af.stand). (u, v) is the nose wheel
 * stop point and dir the direction the nose points; `len` is the distance from the model origin to that wheel (13.4 for the airliner).
 */
export function parkAt(af, out, { u, v, dir, model, tint, len = 13.4, crew = [], variant = 0 }) {
  const a = dir * D2R, fu = Math.cos(a), fv = Math.sin(a), ru = -fv, rv = fu;
  const cu = u - fu * len, cv = v - fv * len;
  propAt(af, out, model, cu, cv, dir, { tint, variant });
  for (const [type, f, r, turn = 0, ct] of crew) propAt(af, out, type, cu + fu * f + ru * r, cv + fv * f + rv * r, dir + turn, ct === undefined ? {} : { tint: ct });
  return [cu, cv];
}

/**
 * Airline stand on a pier: the aircraft's nose points at the pier face. faceU is the u of the boarding face, side +1 when the aircraft
 * parks on the +u side of it, gz the v of the bridge; the aircraft sits 4 m off the bridge line toward its left so the cab meets
 * the front door. Places the jet bridge, paints the stand and, unless model is null, parks the aircraft with crew set `crew`.
 */
export function pierGate(af, ctx, out, { faceU, side, gz, id, tint, model = 'parked-airliner', crew = 0, seed = 1 }) {
  const dir = side > 0 ? 180 : 0;
  const vAir = side > 0 ? gz - 4 : gz + 4;
  const uNose = faceU + side * 25.6;
  af.place(ctx, out, 'jetbridge', faceU, gz, 24, 4, 4.4, side > 0 ? 0 : 180, seed);
  af.stand({ u: uNose, v: vAir, dir, id, lead: 42, span: 36, len: 40, box: true });
  if (model) parkAt(af, out, { u: uNose, v: vAir, dir, model, tint, crew: CREWS[crew] || [] });
}
