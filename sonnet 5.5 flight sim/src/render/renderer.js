import { Program, createGL, gpuInfo } from './gl.js';
import { voxVert, voxFrag, depthFrag } from './shaders/vox.js';
import { skyFrag, fullscreenVert } from './shaders/sky.js';
import { Camera, Frustum } from './camera.js';
import { CascadedShadows } from './shadows.js';
import { PostChain } from './post.js';
import { mat4 } from '../core/math.js';
import { NODE_CELLS } from '../world/config.js';
import { buildPaletteTexels } from '../voxel/palette.js';

/** Depth is split between a far pass and a near pass so one 24-bit buffer covers 0.3 m to tens of kilometers. */
export const NEAR_SPLIT = 1500;

/**
 * The scene renderer. Owns GPU resources, shader variants, the shadow pass, the planar reflection pass and the
 * HDR post chain. Falls back to a direct tone-mapped forward path when float render targets are unavailable
 * or the quality tier disables post-processing.
 */
export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.gl = createGL(canvas, { antialias: !!opts.antialias });
    const gl = this.gl;
    this.info = gpuInfo(gl);
    this.camera = new Camera();
    this.shadows = new CascadedShadows(gl);
    this.post = new PostChain(gl);
    this.q = null;
    this.usePost = false;
    this.progs = null;
    this.progKey = '';
    this.gpuBytes = 0;
    this.stats = { draws: 0, tris: 0, nodes: 0, batches: 0, models: 0 };
    this.emptyVao = gl.createVertexArray();
    this.scale = 1;
    this.cullFrustum = new Frustum();
    this._vp = mat4.create();
    this._skyVP = mat4.create();
    this._skyProj = mat4.create();
    this._invVP = mat4.create();
    this._f32 = new Float32Array(16);
    this._r32 = new Float32Array(9);
    this.nearVP = mat4.create();
    this.farVP = mat4.create();
    this.reflVP = mat4.create();
    this.cockpitVP = mat4.create();
    this.refl = null;
    this.frameNo = 0;
    // palette texture: 256 x 3 RGBA8
    this.paletteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 3, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildPaletteTexels());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // ------------------------------------------------------------------ configuration
  configure(q) {
    const gl = this.gl;
    this.q = q;
    this.usePost = !!q.post && this.post.supported;
    const post = this.usePost;
    const volumetric = (q.clouds | 0) >= 2 && post;
    const reflOn = !!q.reflections && post;
    const defs = {
      WATER_Q: q.water | 0, EDGES: q.voxelEdges > 0, MACRO: !!q.macro, SHADOWS: (q.shadows | 0) > 0, DETAIL: !!q.detail,
      POST: post, SKY_LUT: post, CLOUD_SHADOWS: !!q.cloudShadows && post, REFL_TEX: reflOn,
    };
    const skyDefs = {
      CLOUDS: (q.clouds | 0) === 0 ? 0 : (volumetric ? 2 : 1), CLOUD_FIRST: volumetric ? 1 : 0,
      CLOUD_OCT: Math.max(2, q.cloudOctaves | 0 || 4), POST: post, SKY_LUT: post,
    };
    const key = JSON.stringify([defs, skyDefs, reflOn]);
    if (key !== this.progKey) {
      if (this.progs) for (const p of Object.values(this.progs)) p.dispose();
      const mk = (vs, fs, extra, label) => new Program(gl, vs, fs, { ...defs, ...extra }, label);
      this.progs = {
        node: mk(voxVert, voxFrag, {}, 'node'),
        inst: mk(voxVert, voxFrag, { INSTANCED: true }, 'inst'),
        model: mk(voxVert, voxFrag, { MODEL: true }, 'model'),
        dNode: new Program(gl, voxVert, depthFrag, { DEPTH_ONLY: true }, 'dNode'),
        dInst: new Program(gl, voxVert, depthFrag, { DEPTH_ONLY: true, INSTANCED: true }, 'dInst'),
        dModel: new Program(gl, voxVert, depthFrag, { DEPTH_ONLY: true, MODEL: true }, 'dModel'),
        sky: new Program(gl, fullscreenVert, skyFrag, skyDefs, 'sky'),
      };
      if (reflOn) {
        const r = { ...defs, POST: false, HDR1: true, REFLECT: true, REFL_TEX: false, SHADOWS: false, CLOUD_SHADOWS: false };
        this.progs.nodeR = new Program(gl, voxVert, voxFrag, r, 'nodeR');
        this.progs.instR = new Program(gl, voxVert, voxFrag, { ...r, INSTANCED: true }, 'instR');
        this.progs.modelR = new Program(gl, voxVert, voxFrag, { ...r, MODEL: true }, 'modelR');
        this.progs.skyR = new Program(gl, fullscreenVert, skyFrag, { ...skyDefs, POST: false, HDR1: true, REFLECT: true }, 'skyR');
      }
      this.progKey = key;
    }
    if (post) this.post.configure(q.postQ || {});
    this.shadows.configure(q.shadows | 0, q.shadowSize | 0 || 1024);
    if (!reflOn && this.refl) this._freeRefl();
  }

  _freeRefl() {
    const gl = this.gl, r = this.refl;
    gl.deleteTexture(r.tex); gl.deleteRenderbuffer(r.depth); gl.deleteFramebuffer(r.fbo);
    this.refl = null;
  }

  _ensureRefl(w, h) {
    const gl = this.gl;
    if (this.refl && this.refl.w === w && this.refl.h === h) return;
    if (this.refl) this._freeRefl();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.refl = { tex, depth, fbo, w, h };
  }

  resize(cssW, cssH, dpr = 1, scale = 1) {
    this.scale = scale;
    const w = Math.max(2, Math.round(cssW * dpr * scale)), h = Math.max(2, Math.round(cssH * dpr * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.camera.aspect = w / h;
    this.camera.width = w; this.camera.height = h;
    if (this.usePost) this.post.resize(w, h);
  }

  // ------------------------------------------------------------------ uploads
  uploadMesh(m) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, m.vertexData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 4, gl.SHORT, 8, 0);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indexData, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const bytes = m.vertexData.byteLength + m.indexData.byteLength;
    this.gpuBytes += bytes;
    return { vao, vbo, ibo, indexCount: m.indexCount, indexType: m.indexData instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, bytes };
  }
  freeMesh(g) {
    const gl = this.gl;
    gl.deleteVertexArray(g.vao); gl.deleteBuffer(g.vbo); gl.deleteBuffer(g.ibo);
    this.gpuBytes -= g.bytes;
  }
  /** Instance batch: 24 bytes per instance (f32 x,y,z,yaw,scale | u8 tint). Shares the model's vertex buffers. */
  uploadInstances(data, count, model) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.gpu.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 4, gl.SHORT, 8, 0);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 24, 20); gl.vertexAttribDivisor(3, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.gpu.ibo);
    gl.bindVertexArray(null);
    this.gpuBytes += data.byteLength;
    return { vao, buf, count, model, bytes: data.byteLength };
  }
  freeInstances(b) {
    this.gl.deleteVertexArray(b.vao); this.gl.deleteBuffer(b.buf);
    this.gpuBytes -= b.bytes;
  }

  // ------------------------------------------------------------------ uniforms
  _bindTex(unit, target, tex) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, tex);
  }

  _envUniforms(p, f) {
    const e = f.env;
    p.f3('u_sunDir', e.sunDir[0], e.sunDir[1], e.sunDir[2]);
    p.f3('u_sunColor', e.sunColor[0], e.sunColor[1], e.sunColor[2]);
    p.f3('u_zenith', e.zenith[0], e.zenith[1], e.zenith[2]);
    p.f3('u_horizon', e.horizon[0], e.horizon[1], e.horizon[2]);
    p.f3('u_fogColor', e.fog[0], e.fog[1], e.fog[2]);
    p.f3('u_fogSun', e.fogSun[0], e.fogSun[1], e.fogSun[2]);
    p.f3('u_atmSun', e.sunTrue[0], e.sunTrue[1], e.sunTrue[2]);
    p.f1('u_sunAz', e.sunAz);
    p.f1('u_night', e.night);
    p.f1('u_exposure', e.exposure);
  }

  _voxUniforms(p, f, reflect = false) {
    const e = f.env, cam = this.camera, q = this.q;
    this._envUniforms(p, f);
    p.f3('u_ambSky', e.ambSky[0], e.ambSky[1], e.ambSky[2]);
    p.f3('u_ambGround', e.ambGround[0], e.ambGround[1], e.ambGround[2]);
    p.f3('u_haze', e.haze[0], e.haze[1], e.haze[2]);
    const vd = f.viewDistance;
    p.f1('u_fogDensity', 1.35 / vd);
    p.f1('u_fogHeight', 0.00035);
    p.f1('u_fogEnd', vd);
    p.f1('u_camY', cam.pos[1]);
    p.f1('u_time', f.time);
    p.f1('u_edge', q.voxelEdges || 0);
    p.f1('u_aoStrength', q.ao === false ? 0 : 1);
    p.f1('u_noPost', 0);
    p.f4('u_cloudCtl', 0.25 + 0.75 * e.cover, 1900, 1700, f.time);
    p.f2('u_wind', e.wind[0], e.wind[1]);
    p.f2('u_res', this.canvas.width, this.canvas.height);
    this._bindTex(1, this.gl.TEXTURE_2D, this.paletteTex);
    p.i1('u_palette', 1);
    if (this.usePost) { this._bindTex(2, this.gl.TEXTURE_2D, this.post.tex.skyLut); p.i1('u_skyLut', 2); }
    if (!reflect && this.refl && q.reflections) { this._bindTex(3, this.gl.TEXTURE_2D, this.refl.tex); p.i1('u_refl', 3); }
    if (q.shadows > 0 && !reflect) {
      const sh = this.shadows, gl = this.gl;
      this._bindTex(0, gl.TEXTURE_2D_ARRAY, sh.tex);
      p.i1('u_shadowMap', 0);
      const l = p.loc('u_shadowVP');
      if (l) gl.uniformMatrix4fv(l, false, sh.flat);
      p.f4('u_cascadeSplit', sh.splits[0], sh.splits[1], sh.splits[2], sh.splits[3]);
      p.f4('u_shadowTexel', sh.texel[0], sh.texel[1], sh.texel[2], sh.texel[3]);
      p.f3('u_camFwd', cam.fwd[0], cam.fwd[1], cam.fwd[2]);
      p.i1('u_cascades', sh.count);
      p.f1('u_shadowSize', sh.size);
    }
  }

  _setVP(p, vp) {
    const f = this._f32;
    for (let i = 0; i < 16; i++) f[i] = vp[i];
    p.m4('u_vp', f);
  }

  _nodeDist(n, cam) {
    const b = n.bounds;
    const ox = n.x0 - cam.pos[0], oy = -cam.pos[1], oz = n.z0 - cam.pos[2];
    const x0 = ox + b[0], y0 = oy + b[1], z0 = oz + b[2], x1 = ox + b[3], y1 = oy + b[4], z1 = oz + b[5];
    const dx = x0 > 0 ? x0 : x1 < 0 ? -x1 : 0, dy = y0 > 0 ? y0 : y1 < 0 ? -y1 : 0, dz = z0 > 0 ? z0 : z1 < 0 ? -z1 : 0;
    n.dMin = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const fx = Math.max(Math.abs(x0), Math.abs(x1)), fy = Math.max(Math.abs(y0), Math.abs(y1)), fz = Math.max(Math.abs(z0), Math.abs(z1));
    n.dMax = Math.sqrt(fx * fx + fy * fy + fz * fz);
    n._rel = [x0, y0, z0, x1, y1, z1];
  }

  _drawNode(p, n, cam) {
    const g = n.gpu;
    if (!g || !g.indexCount) return;
    const gl = this.gl;
    p.f3('u_origin', n.x0 - cam.pos[0], -cam.pos[1], n.z0 - cam.pos[2]);
    p.f1('u_cell', n.cell);
    p.i3('u_cellOrigin', n.ix * NODE_CELLS, 0, n.iz * NODE_CELLS);
    p.f3('u_worldOrigin', n.x0, 0, n.z0);
    gl.bindVertexArray(g.vao);
    gl.drawElements(gl.TRIANGLES, g.indexCount, g.indexType, 0);
    this.stats.draws++; this.stats.tris += g.indexCount / 3;
  }

  _drawBatches(p, n, cam, maxDist = 1e9) {
    if (!n.batches || !n.batches.length || n.dMin > maxDist) return;
    const gl = this.gl;
    p.f3('u_origin', n.x0 - cam.pos[0], -cam.pos[1], n.z0 - cam.pos[2]);
    p.i3('u_cellOrigin', 0, 0, 0);
    p.f3('u_worldOrigin', n.x0, 0, n.z0);
    for (const b of n.batches) {
      const m = b.model;
      p.f1('u_cell', m.cell);
      p.f3('u_modelOff', m.off[0], m.off[1], m.off[2]);
      gl.bindVertexArray(b.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, m.gpu.indexCount, m.gpu.indexType, 0, b.count);
      this.stats.draws++; this.stats.batches++; this.stats.tris += (m.gpu.indexCount / 3) * b.count;
    }
  }

  _drawModel(p, m, cam) {
    const gl = this.gl;
    const mesh = m.mesh;
    if (!mesh || !mesh.gpu) return;
    p.f3('u_origin', m.x - cam.pos[0], m.y - cam.pos[1], m.z - cam.pos[2]);
    const r = this._r32;
    for (let i = 0; i < 9; i++) r[i] = m.rot[i];
    p.m3('u_rot', r);
    p.f1('u_cell', mesh.cell);
    p.f3('u_modelOff', mesh.off[0], mesh.off[1], mesh.off[2]);
    p.i3('u_cellOrigin', 0, 0, 0);
    p.f3('u_worldOrigin', m.x, m.y, m.z);
    const t = m.tint || ONE;
    p.f3('u_tint', t[0], t[1], t[2]);
    p.f1('u_noPost', m.noPost ? 1 : 0);
    gl.bindVertexArray(mesh.gpu.vao);
    gl.drawElements(gl.TRIANGLES, mesh.gpu.indexCount, mesh.gpu.indexType, 0);
    this.stats.draws++; this.stats.models++; this.stats.tris += mesh.gpu.indexCount / 3;
  }

  _shadowPass(f, visibleForShadow) {
    const gl = this.gl, sh = this.shadows, cam = this.camera, P = this.progs;
    sh.update(cam, f.env.sunDir, this.q.shadowDistance || 1200);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2.0, 4.0);
    gl.viewport(0, 0, sh.size, sh.size);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.depthMask(true);
    for (const n of visibleForShadow) if (!n._rel) this._nodeDist(n, cam);
    for (let c = 0; c < sh.count; c++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sh.fbos[c]);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      const vp = sh.matsD[c];
      const reach = sh.splits[c] + 400;
      for (const prog of [P.dNode, P.dInst, P.dModel]) {
        prog.use(); this._setVP(prog, vp);
        prog.f1('u_time', f.time);
        this._bindTex(1, gl.TEXTURE_2D, this.paletteTex); prog.i1('u_palette', 1);
      }
      P.dInst.f3('u_tint', 1, 1, 1);
      P.dNode.use();
      for (const n of visibleForShadow) if (n.dMin < reach && n.level <= (this.q.shadowMaxLevel ?? 4)) this._drawNode(P.dNode, n, cam);
      P.dInst.use();
      for (const n of visibleForShadow) if (n.dMin < reach && n.batches && n.batches.length) this._drawBatches(P.dInst, n, cam);
      P.dModel.use();
      for (const m of f.models) this._drawModel(P.dModel, m, cam);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _skyPass(f, prog, viewProj) {
    const gl = this.gl, p = prog, cam = this.camera, e = f.env;
    p.use();
    this._envUniforms(p, f);
    mat4.perspective(this._skyProj, cam.fov, cam.aspect, 0.1, 10);
    mat4.multiply(this._skyVP, this._skyProj, cam.view);
    mat4.invert(this._invVP, this._skyVP);
    const m = this._f32;
    for (let i = 0; i < 16; i++) m[i] = this._invVP[i];
    p.m4('u_invVP', m);
    p.f3('u_cam', cam.pos[0], cam.pos[1], cam.pos[2]);
    p.f1('u_time', f.time);
    p.f1('u_cover', 1 - e.cover * 0.85);
    p.f2('u_wind', e.wind[0], e.wind[1]);
    if (this.usePost) { this._bindTex(2, gl.TEXTURE_2D, this.post.tex.skyLut); p.i1('u_skyLut', 2); }
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }

  _reflectionPass(f, nodes) {
    const gl = this.gl, cam = this.camera, P = this.progs;
    const rw = Math.max(2, this.canvas.width >> 1), rh = Math.max(2, this.canvas.height >> 1);
    this._ensureRefl(rw, rh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.refl.fbo);
    gl.viewport(0, 0, rw, rh);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this._skyPass(f, P.skyR);
    cam.buildVP(2, Math.min(f.viewDistance * 1.2, 30000), this.reflVP);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    P.nodeR.use(); this._voxUniforms(P.nodeR, f, true); this._setVP(P.nodeR, this.reflVP);
    const cy = cam.pos[1];
    for (const n of nodes) {
      // mirrored bounds about y = 0 in camera-relative space
      const r = n._rel;
      if (!r) continue;
      const y0 = -r[4] - 2 * cy, y1 = -r[1] - 2 * cy;
      if (n.dMin > f.viewDistance) continue;
      if (!this.cullFrustum.aabb(r[0], y0, r[2], r[3], y1, r[5])) continue;
      if (n.bounds[4] < -1) continue;
      this._drawNode(P.nodeR, n, cam);
    }
    P.instR.use(); this._voxUniforms(P.instR, f, true); this._setVP(P.instR, this.reflVP);
    P.instR.f3('u_tint', 1, 1, 1);
    for (const n of nodes) if (n.batches && n.batches.length && n.dMin < 1800) this._drawBatches(P.instR, n, cam, 1800);
    if (f.models.length) {
      P.modelR.use(); this._voxUniforms(P.modelR, f, true); this._setVP(P.modelR, this.reflVP);
      for (const m of f.models) this._drawModel(P.modelR, m, cam);
    }
    gl.frontFace(gl.CCW);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _sunScreen(env) {
    const cam = this.camera, v = cam.view;
    const s = env.sunTrue;
    const x = v[0] * s[0] + v[4] * s[1] + v[8] * s[2], y = v[1] * s[0] + v[5] * s[1] + v[9] * s[2], z = v[2] * s[0] + v[6] * s[1] + v[10] * s[2];
    const t = Math.tan(cam.fov / 2);
    const on = z < -1e-4;
    const w = -z;
    const nx = on ? x / (w * t * cam.aspect) : 0, ny = on ? y / (w * t) : 0;
    return { x: nx * 0.5 + 0.5, y: ny * 0.5 + 0.5, on: on && s[1] > -0.06 && Math.abs(nx) < 1.6 && Math.abs(ny) < 1.6 };
  }

  /**
   * Draw one frame. f = { env, time, dt, viewDistance, nodes: [{gpu, batches, x0, z0, ix, iz, level, cell, bounds}],
   * models: [{mesh, x, y, z, rot, tint, noPost}], cockpit: [models] }.
   */
  render(f) {
    const gl = this.gl, cam = this.camera, P = this.progs;
    this.frameNo++;
    const post = this.usePost;
    if (post) this.post.resize(this.canvas.width, this.canvas.height);
    this.stats.draws = 0; this.stats.tris = 0; this.stats.nodes = 0; this.stats.batches = 0; this.stats.models = 0;
    const far = Math.max(f.viewDistance * 1.6, 9000);
    const jit = post ? this.post.nextJitter() : [0, 0];
    for (const n of f.nodes) this._nodeDist(n, cam);
    cam.buildVP(0.3, NEAR_SPLIT + 200, this.nearVP, jit[0], jit[1]);
    cam.buildVP(NEAR_SPLIT - 200, far, this.farVP, jit[0], jit[1]);
    cam.buildVP(0.3, far, this._vp);
    this.cullFrustum.setFromVP(this._vp);
    const visible = [];
    for (const n of f.nodes) {
      const r = n._rel;
      if (n.dMin > f.viewDistance * 1.02) continue;
      if (!this.cullFrustum.aabb(r[0], r[1], r[2], r[3], r[4], r[5])) continue;
      visible.push(n);
    }
    visible.sort((a, b) => a.dMin - b.dMin);
    this.stats.nodes = visible.length;

    if (this.q.shadows > 0) {
      const near = f.nodes.filter((n) => n.dMin < (this.q.shadowDistance || 1200) + 600);
      this._shadowPass(f, near);
    }
    if (post) this.post.skyLut(f.env, Math.max(1, cam.pos[1]));
    if (post && this.q.reflections && P.nodeR) this._reflectionPass(f, visible);

    if (post) this.post.beginScene();
    else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.DEPTH_TEST);
    this._skyPass(f, P.sky);

    const drawWorld = (vp, sel) => {
      P.node.use(); this._voxUniforms(P.node, f); this._setVP(P.node, vp);
      for (const n of visible) if (sel(n)) this._drawNode(P.node, n, cam);
      P.inst.use(); this._voxUniforms(P.inst, f); this._setVP(P.inst, vp);
      P.inst.f3('u_tint', 1, 1, 1);
      for (const n of visible) if (sel(n)) this._drawBatches(P.inst, n, cam);
    };
    drawWorld(this.farVP, (n) => n.dMax > NEAR_SPLIT - 300);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    drawWorld(this.nearVP, (n) => n.dMin < NEAR_SPLIT + 300);
    if (f.models && f.models.length) {
      P.model.use(); this._voxUniforms(P.model, f); this._setVP(P.model, this.nearVP);
      for (const m of f.models) this._drawModel(P.model, m, cam);
    }
    if (f.cockpit && f.cockpit.length) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      cam.buildVP(0.03, 60, this.cockpitVP, jit[0], jit[1]);
      P.model.use(); this._voxUniforms(P.model, f); this._setVP(P.model, this.cockpitVP);
      for (const m of f.cockpit) this._drawModel(P.model, m, cam);
    }
    gl.bindVertexArray(null);
    if (post) {
      // unjittered matrices for reprojection are rebuilt inside the post chain from cam.view and cam.fov
      this.post.finish(cam, f.env, f.dt || 0.016, this._sunScreen(f.env), { time: f.time });
    }
  }

  dispose() {
    if (this.progs) for (const p of Object.values(this.progs)) p.dispose();
    this.shadows.dispose();
    this.post.dispose();
  }
}
const ONE = [1, 1, 1];
