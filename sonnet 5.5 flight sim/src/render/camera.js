import { mat4 } from '../core/math.js';

/** Six-plane frustum in camera-relative space. AABBs must be given relative to the camera position. */
export class Frustum {
  constructor() { this.p = new Float64Array(24); }
  setFromVP(m) {
    const p = this.p;
    // Plane k = row3 + sign * rowAxis of the column-major matrix (Gribb and Hartmann).
    const set = (k, axis, sign) => {
      const x = m[3] + sign * m[axis], y = m[7] + sign * m[4 + axis], z = m[11] + sign * m[8 + axis], w = m[15] + sign * m[12 + axis];
      const l = Math.hypot(x, y, z) || 1;
      p[k * 4] = x / l; p[k * 4 + 1] = y / l; p[k * 4 + 2] = z / l; p[k * 4 + 3] = w / l;
    };
    set(0, 0, 1); set(1, 0, -1); set(2, 1, 1); set(3, 1, -1); set(4, 2, 1); set(5, 2, -1);
    return this;
  }
  /** Returns false when the box is fully outside any plane. */
  aabb(minx, miny, minz, maxx, maxy, maxz) {
    const p = this.p;
    for (let i = 0; i < 6; i++) {
      const nx = p[i * 4], ny = p[i * 4 + 1], nz = p[i * 4 + 2], d = p[i * 4 + 3];
      const x = nx > 0 ? maxx : minx, y = ny > 0 ? maxy : miny, z = nz > 0 ? maxz : minz;
      if (nx * x + ny * y + nz * z + d < 0) return false;
    }
    return true;
  }
}

/** Camera with a double-precision world position and rotation-only view matrix (camera-relative rendering). */
export class Camera {
  constructor() {
    this.pos = new Float64Array(3);
    this.fwd = new Float64Array([0, 0, -1]);
    this.up = new Float64Array([0, 1, 0]);
    this.right = new Float64Array([1, 0, 0]);
    this.fov = 1.05;
    this.aspect = 16 / 9;
    this.view = mat4.create();
    this.proj = mat4.create();
    this.vp = mat4.create();
    this.frustum = new Frustum();
    this.width = 1280; this.height = 720;
  }
  setPose(x, y, z, fx, fy, fz, ux = 0, uy = 1, uz = 0) {
    this.pos[0] = x; this.pos[1] = y; this.pos[2] = z;
    const l = Math.hypot(fx, fy, fz) || 1;
    this.fwd[0] = fx / l; this.fwd[1] = fy / l; this.fwd[2] = fz / l;
    mat4.lookAt(this.view, 0, 0, 0, this.fwd[0], this.fwd[1], this.fwd[2], ux, uy, uz);
    // right and up from the view matrix rows
    this.right[0] = this.view[0]; this.right[1] = this.view[4]; this.right[2] = this.view[8];
    this.up[0] = this.view[1]; this.up[1] = this.view[5]; this.up[2] = this.view[9];
  }
  /** Projection scale in pixels for a 1 meter object at 1 meter distance. */
  get projScale() { return this.height / (2 * Math.tan(this.fov / 2)); }
  buildVP(near, far, out = this.vp) {
    mat4.perspective(this.proj, this.fov, this.aspect, near, far);
    return mat4.multiply(out, this.proj, this.view);
  }
}
