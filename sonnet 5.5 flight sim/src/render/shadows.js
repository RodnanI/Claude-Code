import { mat4 } from '../core/math.js';

/** Cascaded shadow maps: a depth texture array, one layer per cascade, sphere-fitted and texel-snapped. */
export class CascadedShadows {
  constructor(gl) {
    this.gl = gl;
    this.tex = null;
    this.fbos = [];
    this.count = 0;
    this.size = 0;
    this.mats = Array.from({ length: 4 }, () => new Float32Array(16));
    this.matsD = Array.from({ length: 4 }, () => mat4.create());
    this.splits = new Float32Array(4);
    this.texel = new Float32Array(4);
    this.flat = new Float32Array(64);
    this.centers = Array.from({ length: 4 }, () => [0, 0, 0]);
    this.radii = new Float32Array(4);
    this._view = mat4.create();
    this._ortho = mat4.create();
  }

  configure(count, size) {
    const gl = this.gl;
    if (count === this.count && size === this.size) return;
    this.dispose();
    this.count = count; this.size = size;
    if (!count) return;
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH_COMPONENT24, size, size, count);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    for (let i = 0; i < count; i++) {
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, this.tex, 0, i);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      this.fbos.push(fbo);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  dispose() {
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    for (const f of this.fbos) gl.deleteFramebuffer(f);
    this.tex = null; this.fbos = []; this.count = 0; this.size = 0;
  }

  /** Fit cascades to the camera frustum. sun is the unit vector toward the sun. distance is the total shadow range. */
  update(camera, sun, distance) {
    const n = this.count;
    const tanH = Math.tan(camera.fov / 2), tanW = tanH * camera.aspect;
    // light view: looking along -sun, camera-relative
    const up = Math.abs(sun[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
    mat4.lookAt(this._view, 0, 0, 0, -sun[0], -sun[1], -sun[2], up[0], up[1], up[2]);
    const V = this._view;
    // split distances: blend of logarithmic and linear
    const near = 1.0;
    let prev = near;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / n;
      const log = near * Math.pow(distance / near, f), lin = near + (distance - near) * f;
      const s = 0.7 * log + 0.3 * lin;
      this.splits[i] = s;
      const far = s;
      // frustum slice corners
      let cx = 0, cy = 0, cz = 0;
      const pts = [];
      for (const d of [prev, far]) {
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          const x = camera.fwd[0] * d + camera.right[0] * sx * tanW * d + camera.up[0] * sy * tanH * d;
          const y = camera.fwd[1] * d + camera.right[1] * sx * tanW * d + camera.up[1] * sy * tanH * d;
          const z = camera.fwd[2] * d + camera.right[2] * sx * tanW * d + camera.up[2] * sy * tanH * d;
          pts.push([x, y, z]); cx += x; cy += y; cz += z;
        }
      }
      cx /= 8; cy /= 8; cz /= 8;
      let r = 0;
      for (const p of pts) r = Math.max(r, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz));
      r = Math.ceil(r * 8) / 8;
      // center in light space, snapped to texel grid
      const lx = V[0] * cx + V[4] * cy + V[8] * cz, ly = V[1] * cx + V[5] * cy + V[9] * cz, lz = V[2] * cx + V[6] * cy + V[10] * cz;
      const texel = (2 * r) / this.size;
      const sxq = Math.floor(lx / texel) * texel, syq = Math.floor(ly / texel) * texel;
      const margin = 2600;
      mat4.ortho(this._ortho, sxq - r, sxq + r, syq - r, syq + r, -(lz + r) - margin, -(lz - r));
      const M = mat4.multiply(this.matsD[i], this._ortho, V);
      const out = this.mats[i];
      for (let k = 0; k < 16; k++) out[k] = M[k];
      for (let k = 0; k < 16; k++) this.flat[i * 16 + k] = out[k];
      this.texel[i] = texel;
      this.centers[i][0] = cx; this.centers[i][1] = cy; this.centers[i][2] = cz;
      this.radii[i] = r;
      prev = far;
    }
    for (let i = n; i < 4; i++) { this.splits[i] = this.splits[Math.max(0, n - 1)]; }
  }
}
