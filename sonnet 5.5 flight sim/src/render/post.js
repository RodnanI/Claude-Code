import { Program } from './gl.js';
import { fullscreenVert, skyLutFrag } from './shaders/sky.js';
import { bloomDownFrag, bloomUpFrag, exposureFrag, taaFrag, ssaoFrag, ssaoBlurFrag, compositeFrag } from './shaders/post.js';
import { cloudFrag } from './shaders/clouds.js';
import { bakeLUT, GRADES } from './grade.js';
import { buildCloudNoise } from './cloudnoise.js';
import { mat4 } from '../core/math.js';

const LUT_SIZE = 48;
const HALTON2 = [0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875, 0.0625, 0.5625, 0.3125, 0.8125, 0.1875, 0.6875, 0.4375, 0.9375, 0.03125];
const HALTON3 = [1 / 3, 2 / 3, 1 / 9, 4 / 9, 7 / 9, 2 / 9, 5 / 9, 8 / 9, 1 / 27, 10 / 27, 19 / 27, 4 / 27, 13 / 27, 22 / 27, 7 / 27, 16 / 27];

/**
 * HDR frame graph: scene MRT (color, distance, normal), sky LUT, volumetric clouds, SSAO, temporal AA with camera
 * reprojection, bloom chain, GPU-side auto exposure and a composite pass with 3D LUT grading. All targets are recreated on resize.
 */
export class PostChain {
  constructor(gl) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    this.supported = !!this.ext;
    this.progs = {};
    this.tex = {};
    this.fbo = {};
    this.w = 0; this.h = 0;
    this.q = null;
    this.vao = gl.createVertexArray();
    this.frame = 0;
    this.expIdx = 0;
    this.prevVP = mat4.create();
    this.prevPos = new Float64Array(3);
    this.hasHistory = false;
    this.lutName = '';
    this.noiseBuilt = false;
    this._f = new Float32Array(16);
    this.jitter = [0, 0];
  }

  // ------------------------------------------------------------ resources
  _tex2D(w, h, fmt, filter = 'linear', wrap = 'clamp') {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    const f = filter === 'linear' ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    const wr = wrap === 'clamp' ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    return t;
  }
  _fbo(colors, depthRb = null) {
    const gl = this.gl;
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    colors.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.drawBuffers(colors.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    if (depthRb) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete: 0x' + st.toString(16));
    return f;
  }
  _free() {
    const gl = this.gl;
    for (const t of Object.values(this.tex)) if (Array.isArray(t)) t.forEach((x) => gl.deleteTexture(x)); else gl.deleteTexture(t);
    for (const f of Object.values(this.fbo)) if (Array.isArray(f)) f.forEach((x) => gl.deleteFramebuffer(x)); else gl.deleteFramebuffer(f);
    if (this.depthRb) gl.deleteRenderbuffer(this.depthRb);
    this.tex = {}; this.fbo = {}; this.depthRb = null;
  }

  resize(w, h) {
    const gl = this.gl;
    if (w === this.w && h === this.h && this.tex.scene) return;
    // keep persistent textures (lut, noise, sky lut, exposure)
    const keep = { lut: this.tex.lut, noise: this.tex.noise, skyLut: this.tex.skyLut, exp: this.tex.exp };
    const keepF = { skyLut: this.fbo.skyLut, exp: this.fbo.exp };
    const t = this.tex, f = this.fbo;
    delete t.lut; delete t.noise; delete t.skyLut; delete t.exp; delete f.skyLut; delete f.exp;
    this._free();
    Object.assign(this.tex, Object.fromEntries(Object.entries(keep).filter(([, v]) => v)));
    Object.assign(this.fbo, Object.fromEntries(Object.entries(keepF).filter(([, v]) => v)));
    this.w = w; this.h = h;
    const q = this.q || {};
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    this.depthRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    this.tex.scene = this._tex2D(w, h, gl.RGBA16F);
    this.tex.dist = this._tex2D(w, h, gl.R32F, 'nearest');
    this.tex.normal = this._tex2D(w, h, gl.RGBA8);
    this.fbo.scene = this._fbo([this.tex.scene, this.tex.dist, this.tex.normal], this.depthRb);
    this.tex.taa = [this._tex2D(w, h, gl.RGBA16F), this._tex2D(w, h, gl.RGBA16F)];
    this.fbo.taa = this.tex.taa.map((x) => this._fbo([x]));
    // bloom chain
    this.tex.bloom = []; this.fbo.bloom = [];
    let bw = hw, bh = hh;
    for (let i = 0; i < 7 && bw >= 8 && bh >= 8; i++) {
      const tx = this._tex2D(bw, bh, gl.RGBA16F);
      this.tex.bloom.push(tx); this.fbo.bloom.push(this._fbo([tx]));
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    }
    this.bloomSizes = this.tex.bloom.map((_, i) => [Math.max(2, hw >> i), Math.max(2, hh >> i)]);
    // ao
    this.tex.ao = [this._tex2D(hw, hh, gl.RGBA8), this._tex2D(hw, hh, gl.RGBA8)];
    this.fbo.ao = this.tex.ao.map((x) => this._fbo([x]));
    // clouds
    const cs = q.cloudScale || 0.5;
    this.cw = Math.max(2, Math.round(w * cs)); this.ch = Math.max(2, Math.round(h * cs));
    this.tex.cloud = this._tex2D(this.cw, this.ch, gl.RGBA16F);
    this.fbo.cloud = this._fbo([this.tex.cloud]);
    if (!this.tex.skyLut) {
      this.tex.skyLut = this._tex2D(128, 64, gl.RGBA16F);
      this.fbo.skyLut = this._fbo([this.tex.skyLut]);
    }
    if (!this.tex.exp) {
      this.tex.exp = [this._tex2D(1, 1, gl.RGBA32F, 'nearest'), this._tex2D(1, 1, gl.RGBA32F, 'nearest')];
      this.fbo.exp = this.tex.exp.map((x) => this._fbo([x]));
      for (const fb of this.fbo.exp) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.clearColor(0.05, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.hasHistory = false;
  }

  _lut(name) {
    const gl = this.gl;
    if (this.lutName === name && this.tex.lut) return;
    if (this.tex.lut) gl.deleteTexture(this.tex.lut);
    const data = bakeLUT(name, LUT_SIZE);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, t);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, LUT_SIZE, LUT_SIZE, LUT_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_3D, p, gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.CLAMP_TO_EDGE);
    this.tex.lut = t;
    this.lutName = name;
  }

  _noise() {
    const gl = this.gl;
    if (this.tex.noise) return;
    const { size, data } = buildCloudNoise(48, 7);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, t);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_3D, p, gl.LINEAR);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
    this.tex.noise = t;
  }

  /** q: { grade, aa (0 off, 1 fxaa, 2 taa), bloom, ssao, cloudsVolumetric, cloudSteps, cloudScale, motionBlur, godRays, vignette, grain, chromatic, sharpen, flare, exposureBias, aoRadius } */
  configure(q) {
    const gl = this.gl;
    const prev = this.q;
    this.q = q;
    const key = JSON.stringify([q.aa, !!q.bloom, !!q.ssao, !!q.cloudsVolumetric, q.cloudSteps, !!q.motionBlur, !!q.godRays, q.chromatic > 0, q.grain > 0, q.sharpen > 0]);
    if (key !== this.progKey) {
      for (const p of Object.values(this.progs)) p.dispose();
      const P = (vs, fs, defs, label) => new Program(gl, vs, fs, defs, label);
      const cd = { CLOUD_STEPS: q.cloudSteps || 32 };
      this.progs = {
        skyLut: P(fullscreenVert, skyLutFrag, {}, 'skyLut'),
        bloomDown: P(fullscreenVert, bloomDownFrag, {}, 'bloomDown'),
        bloomUp: P(fullscreenVert, bloomUpFrag, {}, 'bloomUp'),
        exposure: P(fullscreenVert, exposureFrag, {}, 'exposure'),
        taa: P(fullscreenVert, taaFrag, { TAA: q.aa === 2, CLOUDS: !!q.cloudsVolumetric, SSAO: !!q.ssao }, 'taa'),
        ssao: P(fullscreenVert, ssaoFrag, {}, 'ssao'),
        ssaoBlur: P(fullscreenVert, ssaoBlurFrag, {}, 'ssaoBlur'),
        composite: P(fullscreenVert, compositeFrag, { FXAA: q.aa === 1, CHROMA: q.chromatic > 0, GRAIN: q.grain > 0, SHARPEN: q.sharpen > 0, BLOOM: !!q.bloom, GODRAYS: !!q.godRays, MOBLUR: !!q.motionBlur }, 'composite'),
      };
      if (q.cloudsVolumetric) this.progs.cloud = P(fullscreenVert, cloudFrag, cd, 'cloud');
      this.progKey = key;
    }
    this._lut(q.grade in GRADES ? q.grade : 'cinematic');
    if (q.cloudsVolumetric) this._noise();
    if (!prev || prev.cloudScale !== q.cloudScale) this.w = -1;
  }

  /** Jitter offset in pixels for this frame (Halton 2,3). */
  nextJitter() {
    this.frame++;
    if (!this.q || this.q.aa !== 2) { this.jitter[0] = 0; this.jitter[1] = 0; return this.jitter; }
    const i = this.frame % 16;
    this.jitter[0] = HALTON2[i] - 0.5; this.jitter[1] = HALTON3[i] - 0.5;
    return this.jitter;
  }

  // ------------------------------------------------------------ drawing helpers
  _pass(prog, fbo, w, h) {
    const gl = this.gl;
    prog.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(false);
  }
  _bind(unit, tex, target) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target || gl.TEXTURE_2D, tex);
  }
  _draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  _m4(p, name, m) {
    for (let i = 0; i < 16; i++) this._f[i] = m[i];
    p.m4(name, this._f);
  }

  /** Render the sky-view LUT for the current sun and camera altitude. */
  skyLut(env, altitude) {
    const p = this.progs.skyLut;
    this._pass(p, this.fbo.skyLut, 128, 64);
    p.f1('u_alt', Math.max(1, altitude));
    p.f3('u_atmSun', env.sunTrue[0], env.sunTrue[1], env.sunTrue[2]);
    p.f1('u_sunI', 30);
    p.f1('u_sunAz', env.sunAz);
    this._draw();
  }

  beginScene() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.scene);
    gl.viewport(0, 0, this.w, this.h);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
    gl.depthMask(true);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 1]);
    gl.clearBufferfv(gl.COLOR, 1, [1e6, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 2, [0.5, 1, 0.5, 0]);
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Run every post pass and write the final image to the default framebuffer.
   * cam: Camera (jitter-free matrices in cam.view/proj), frame: renderer frame info.
   */
  finish(cam, env, dt, sunScreen, clean) {
    const gl = this.gl, q = this.q, P = this.progs;
    const w = this.w, h = this.h;
    const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    const aspect = cam.aspect;
    // unjittered VP for reprojection
    const proj = mat4.create(), vp = mat4.create(), inv = mat4.create();
    mat4.perspective(proj, cam.fov, aspect, 0.3, 100000);
    mat4.multiply(vp, proj, cam.view);
    mat4.invert(inv, vp);

    // --- volumetric clouds
    if (q.cloudsVolumetric && P.cloud) {
      const p = P.cloud;
      this._pass(p, this.fbo.cloud, this.cw, this.ch);
      this._bind(0, this.tex.dist); this._bind(1, this.tex.noise, gl.TEXTURE_3D); this._bind(2, this.tex.skyLut);
      p.i1('u_dist', 0); p.i1('u_noise', 1); p.i1('u_skyLut', 2);
      this._m4(p, 'u_invVP', inv);
      p.f3('u_cam', cam.pos[0], cam.pos[1], cam.pos[2]);
      p.f3('u_sunDir', env.sunDir[0], env.sunDir[1], env.sunDir[2]);
      p.f3('u_sunColor', env.sunColor[0], env.sunColor[1], env.sunColor[2]);
      p.f3('u_ambSky', env.ambSky[0], env.ambSky[1], env.ambSky[2]);
      p.f3('u_fogColor', env.fog[0], env.fog[1], env.fog[2]);
      p.f1('u_time', clean.time);
      p.f4('u_cloud', 0.25 + 0.75 * env.cover, 1900, 1700, 1.0);
      p.f2('u_wind', env.wind[0], env.wind[1]);
      p.f1('u_frame', this.frame);
      p.f1('u_night', env.night);
      this._draw();
    }

    // --- ssao
    if (q.ssao) {
      let p = P.ssao;
      this._pass(p, this.fbo.ao[0], hw, hh);
      this._bind(0, this.tex.dist); this._bind(1, this.tex.normal);
      p.i1('u_dist', 0); p.i1('u_normal', 1);
      this._m4(p, 'u_invVP', inv); this._m4(p, 'u_vp', vp);
      p.f2('u_res', hw, hh); p.f1('u_frame', this.frame); p.f1('u_radius', q.aoRadius || 1);
      this._draw();
      p = P.ssaoBlur;
      this._pass(p, this.fbo.ao[1], hw, hh);
      this._bind(0, this.tex.ao[0]); this._bind(1, this.tex.dist);
      p.i1('u_ao', 0); p.i1('u_dist', 1); p.f2('u_dir', 1 / hw, 0);
      this._draw();
      this._pass(p, this.fbo.ao[0], hw, hh);
      this._bind(0, this.tex.ao[1]); this._bind(1, this.tex.dist);
      p.f2('u_dir', 0, 1 / hh);
      this._draw();
    }

    // --- temporal resolve (also composites clouds and AO)
    const write = this.frame & 1, read = write ^ 1;
    {
      const p = P.taa;
      this._pass(p, this.fbo.taa[write], w, h);
      this._bind(0, this.tex.scene); this._bind(1, this.tex.taa[read]); this._bind(2, this.tex.dist);
      this._bind(3, this.tex.normal); this._bind(4, this.tex.cloud); this._bind(5, this.tex.ao[0]);
      p.i1('u_cur', 0); p.i1('u_hist', 1); p.i1('u_dist', 2); p.i1('u_normal', 3); p.i1('u_cloud', 4); p.i1('u_ao', 5);
      this._m4(p, 'u_invVP', inv); this._m4(p, 'u_prevVP', this.prevVP);
      p.f3('u_camDelta', cam.pos[0] - this.prevPos[0], cam.pos[1] - this.prevPos[1], cam.pos[2] - this.prevPos[2]);
      p.f2('u_res', w, h);
      p.f1('u_blend', 0.9);
      p.f1('u_useHist', this.hasHistory ? 1 : 0);
      p.f1('u_aoStrength', 0.85 - 0.35 * Math.max(0, env.sunDir[1]) * (1 - env.night));
      this._draw();
    }
    const resolved = this.tex.taa[write];

    // --- bloom
    let bloomTex = null;
    if (q.bloom && this.tex.bloom.length) {
      const n = this.tex.bloom.length;
      let p = P.bloomDown;
      for (let i = 0; i < n; i++) {
        const [bw, bh] = this.bloomSizes[i];
        this._pass(p, this.fbo.bloom[i], bw, bh);
        const src = i === 0 ? resolved : this.tex.bloom[i - 1];
        const [sw, sh] = i === 0 ? [w, h] : this.bloomSizes[i - 1];
        this._bind(0, src);
        p.i1('u_src', 0); p.f2('u_texel', 1 / sw, 1 / sh); p.f1('u_first', i === 0 ? 1 : 0);
        this._draw();
      }
      p = P.bloomUp;
      for (let i = n - 2; i >= 0; i--) {
        const [bw, bh] = this.bloomSizes[i];
        const [lw, lh] = this.bloomSizes[i + 1];
        this._pass(p, this.fbo.bloom[i], bw, bh);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        this._bind(0, this.tex.bloom[i + 1]);
        p.i1('u_low', 0); p.f2('u_texel', 1 / lw, 1 / lh); p.f1('u_weight', 0.95);
        this._draw();
        gl.disable(gl.BLEND);
      }
      bloomTex = this.tex.bloom[0];
    }

    // --- exposure
    {
      const p = P.exposure;
      const wr = this.expIdx ^ 1;
      this._pass(p, this.fbo.exp[wr], 1, 1);
      const meterTex = this.tex.bloom.length ? this.tex.bloom[this.tex.bloom.length - 1] : resolved;
      const [mw, mh] = this.tex.bloom.length ? this.bloomSizes[this.tex.bloom.length - 1] : [w, h];
      this._bind(0, meterTex); this._bind(1, this.tex.exp[this.expIdx]); this._bind(2, this.tex.dist);
      p.i1('u_src', 0); p.i1('u_prev', 1); p.i1('u_dist', 2);
      const l = p.loc('u_size');
      if (l) gl.uniform2i(l, Math.min(mw, 32), Math.min(mh, 32));
      p.f1('u_dt', Math.min(dt, 0.25));
      p.f4('u_range', 0.004, 2.4, 0.27, Math.pow(2, q.exposureBias || 0));
      p.f3('u_sun', sunScreen.x, sunScreen.y, sunScreen.on ? 1 : 0);
      p.f1('u_lock', q.exposureLock ? 1 : 0);
      this._draw();
      this.expIdx = wr;
    }

    // --- composite to the canvas
    {
      const p = P.composite;
      this._pass(p, null, gl.drawingBufferWidth, gl.drawingBufferHeight);
      this._bind(0, resolved); this._bind(1, bloomTex || resolved); this._bind(2, this.tex.exp[this.expIdx]);
      this._bind(3, this.tex.dist); this._bind(4, this.tex.lut, gl.TEXTURE_3D); this._bind(5, this.tex.normal);
      p.i1('u_scene', 0); p.i1('u_bloom', 1); p.i1('u_exp', 2); p.i1('u_dist', 3); p.i1('u_lut', 4); p.i1('u_normal', 5);
      p.f2('u_res', w, h);
      p.f1('u_time', clean.time);
      p.f4('u_fx', q.vignette || 0, q.grain || 0, q.chromatic || 0, q.bloomStrength ?? 0.08);
      p.f4('u_fx2', q.sharpen || 0, q.flare || 0, q.godRays ? (q.godRayStrength ?? 1) : 0, LUT_SIZE);
      p.f3('u_sun', sunScreen.x, sunScreen.y, sunScreen.on ? 1 : 0);
      p.f3('u_sunColor', env.sunColor[0], env.sunColor[1], env.sunColor[2]);
      p.f1('u_night', env.night);
      p.f1('u_expManual', 0);
      this._m4(p, 'u_invVP', inv); this._m4(p, 'u_prevVP', this.prevVP);
      p.f3('u_camDelta', cam.pos[0] - this.prevPos[0], cam.pos[1] - this.prevPos[1], cam.pos[2] - this.prevPos[2]);
      p.f1('u_moblur', q.motionBlur ? (q.motionBlurStrength ?? 0.5) : 0);
      this._draw();
    }
    gl.bindVertexArray(null);
    // history for next frame
    for (let i = 0; i < 16; i++) this.prevVP[i] = vp[i];
    this.prevPos[0] = cam.pos[0]; this.prevPos[1] = cam.pos[1]; this.prevPos[2] = cam.pos[2];
    this.hasHistory = true;
  }

  dispose() {
    this._free();
    for (const p of Object.values(this.progs)) p.dispose();
  }
}
