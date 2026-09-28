/* Minimal allocation-free vector, quaternion and matrix helpers.
   Matrices are column-major (GL layout). Vectors and quaternions are plain arrays or typed arrays. */

export const vec3 = {
  create: (x = 0, y = 0, z = 0) => new Float64Array([x, y, z]),
  set(o, x, y, z) { o[0] = x; o[1] = y; o[2] = z; return o; },
  copy(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; },
  add(o, a, b) { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
  sub(o, a, b) { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
  scale(o, a, s) { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; },
  addScaled(o, a, b, s) { o[0] = a[0] + b[0] * s; o[1] = a[1] + b[1] * s; o[2] = a[2] + b[2] * s; return o; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross(o, a, b) {
    const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0];
    o[0] = x; o[1] = y; o[2] = z; return o;
  },
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  normalize(o, a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o;
  },
  lerp(o, a, b, t) {
    o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o;
  },
};

export const quat = {
  create: () => new Float64Array([0, 0, 0, 1]),
  identity(o) { o[0] = 0; o[1] = 0; o[2] = 0; o[3] = 1; return o; },
  copy(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; return o; },
  /** o = a * b (apply b first, then a). */
  multiply(o, a, b) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    const bx = b[0], by = b[1], bz = b[2], bw = b[3];
    o[0] = aw * bx + ax * bw + ay * bz - az * by;
    o[1] = aw * by - ax * bz + ay * bw + az * bx;
    o[2] = aw * bz + ax * by - ay * bx + az * bw;
    o[3] = aw * bw - ax * bx - ay * by - az * bz;
    return o;
  },
  normalize(o, a) {
    const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1;
    o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; o[3] = a[3] / l; return o;
  },
  conjugate(o, a) { o[0] = -a[0]; o[1] = -a[1]; o[2] = -a[2]; o[3] = a[3]; return o; },
  fromAxisAngle(o, ax, ay, az, angle) {
    const l = Math.hypot(ax, ay, az) || 1;
    const s = Math.sin(angle * 0.5) / l;
    o[0] = ax * s; o[1] = ay * s; o[2] = az * s; o[3] = Math.cos(angle * 0.5); return o;
  },
  /** Rotate vector a by quaternion q. */
  rotate(o, q, a) {
    const x = a[0], y = a[1], z = a[2];
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    o[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    o[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    o[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return o;
  },
  /** Integrate body-frame angular velocity w (rad/s) over dt into q (body to world). */
  integrate(q, wx, wy, wz, dt) {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const hx = wx * dt * 0.5, hy = wy * dt * 0.5, hz = wz * dt * 0.5;
    q[0] = qx + qw * hx + qy * hz - qz * hy;
    q[1] = qy + qw * hy + qz * hx - qx * hz;
    q[2] = qz + qw * hz + qx * hy - qy * hx;
    q[3] = qw - qx * hx - qy * hy - qz * hz;
    return quat.normalize(q, q);
  },
  slerp(o, a, b, t) {
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
    if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    let s0, s1;
    if (1 - cos > 1e-6) {
      const om = Math.acos(cos), so = Math.sin(om);
      s0 = Math.sin((1 - t) * om) / so; s1 = Math.sin(t * om) / so;
    } else { s0 = 1 - t; s1 = t; }
    o[0] = s0 * a[0] + s1 * bx; o[1] = s0 * a[1] + s1 * by; o[2] = s0 * a[2] + s1 * bz; o[3] = s0 * a[3] + s1 * bw;
    return o;
  },
  /** Build from heading (about world up), pitch, roll. Body +X forward, +Y up, +Z right. Heading 0 = north (-Z). */
  fromHeadingPitchRoll(o, heading, pitch, roll) {
    // Base: body X -> world -Z (north), Y -> Y, Z -> +X. That is a -90 degree yaw about +Y applied to identity body.
    const base = quat.fromAxisAngle(new Float64Array(4), 0, 1, 0, Math.PI / 2);
    const yaw = quat.fromAxisAngle(new Float64Array(4), 0, 1, 0, -heading);
    const p = quat.fromAxisAngle(new Float64Array(4), 0, 0, 1, pitch);
    const r = quat.fromAxisAngle(new Float64Array(4), 1, 0, 0, roll);
    const t = new Float64Array(4);
    quat.multiply(t, yaw, base);
    quat.multiply(t, t, p);
    quat.multiply(o, t, r);
    return o;
  },
};

const _v = new Float64Array(3);
/** Heading, pitch, roll (radians) of a body-to-world quaternion. Roll positive is right wing down. */
export function attitudeOf(q, out = { heading: 0, pitch: 0, roll: 0 }) {
  quat.rotate(_v, q, [1, 0, 0]);
  const fx = _v[0], fy = _v[1], fz = _v[2];
  out.heading = Math.atan2(fx, -fz);
  if (out.heading < 0) out.heading += Math.PI * 2;
  out.pitch = Math.asin(Math.max(-1, Math.min(1, fy)));
  quat.rotate(_v, q, [0, 0, 1]);
  const ry = _v[1];
  quat.rotate(_v, q, [0, 1, 0]);
  out.roll = Math.atan2(-ry, _v[1]);
  return out;
}

export const mat4 = {
  create: () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  identity(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  copy(o, a) { for (let i = 0; i < 16; i++) o[i] = a[i]; return o; },
  multiply(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
    return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  },
  /** View matrix looking from eye to target. */
  lookAt(o, ex, ey, ez, tx, ty, tz, ux = 0, uy = 1, uz = 0) {
    let zx = ex - tx, zy = ey - ty, zz = ez - tz;
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    l = Math.hypot(xx, xy, xz);
    if (l < 1e-8) { xx = 1; xy = 0; xz = 0; } else { xx /= l; xy /= l; xz /= l; }
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez);
    o[13] = -(yx * ex + yy * ey + yz * ez);
    o[14] = -(zx * ex + zy * ey + zz * ez);
    o[15] = 1;
    return o;
  },
  invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  fromQuat(o, q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, yx = y * x2, yy = y * y2, zx = z * x2, zy = z * y2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    o[0] = 1 - yy - zz; o[1] = yx + wz; o[2] = zx - wy; o[3] = 0;
    o[4] = yx - wz; o[5] = 1 - xx - zz; o[6] = zy + wx; o[7] = 0;
    o[8] = zx + wy; o[9] = zy - wx; o[10] = 1 - xx - yy; o[11] = 0;
    o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
    return o;
  },
  translation(o, x, y, z) { mat4.identity(o); o[12] = x; o[13] = y; o[14] = z; return o; },
  /** Transform point (with w=1) and write to out. */
  transformPoint(out, m, x, y, z) {
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
  },
  toFloat32(out, m) { for (let i = 0; i < 16; i++) out[i] = m[i]; return out; },
};
