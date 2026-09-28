import { Program, createGL, gpuInfo } from './gl.js';
import { voxVert, voxFrag, skyVert, skyFrag, depthFrag } from './shaders/index.js';
import { Camera, Frustum } from './camera.js';
import { CascadedShadows } from './shadows.js';
import { mat4 } from '../core/math.js';
import { NODE_CELLS } from '../world/config.js';

/** Depth is split between a far pass and a near pass so one 24-bit buffer covers 0.3 m to tens of kilometers. */
export const NEAR_SPLIT = 1500;

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.gl = createGL(canvas, { antialias: !!opts.antialias });
    this.info = gpuInfo(this.gl);
    this.camera = new Camera();
    this.shadows = new CascadedShadows(this.gl);
    this.q = null;
    this.progs = null;
    this.progKey = '';
    this.gpuBytes = 0;
    this.stats = { draws: 0, tris: 0, nodes: 0, batches: 0, models: 0 };
    this.emptyVao = this.gl.createVertexArray();
    this.scale = 1;
    this.cullFrustum = new Frustum();
    this.shadowFrustum = new Frustum();
    this._vp = mat4.create();
    this._vpN = mat4.create();
    this._invVP = mat4.create();
    this._f32 = new Float32Array(16);
    this._r32 = new Float32Array(9);
    this._skyProj = mat4.create();
    this.nearVP = mat4.create();
    this.farVP = mat4.create();
  }

  // ------------------------------------------------------------------ configuration
  configure(q) {
    const gl = this.gl;
    this.q = q;
    const defs = {
      WATER_Q: q.water | 0, EDGES: q.voxelEdges > 0, MACRO: !!q.macro, SHADOWS: (q.shadows | 0) > 0,
    };
    const skyDefs = { CLOUDS: q.clouds | 0, CLOUD_OCT: Math.max(2, q.cloudOctaves | 0 || 4) };
    const key = JSON.stringify([defs, skyDefs]);
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
        sky: new Program(gl, skyVert, skyFrag, skyDefs, 'sky'),
      };
      this.progKey = key;
    }
    this.shadows.configure(q.shadows | 0, q.shadowSize | 0 || 1024);
  }

  resize(cssW, cssH, dpr = 1, scale = 1) {
    this.scale = scale;
    const w = Math.max(2, Math.round(cssW * dpr * scale)), h = Math.max(2, Math.round(cssH * dpr * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.camera.aspect = w / h;
    this.camera.width = w; this.camera.height = h;
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
    gl.vertexAttribIPointer(0, 4, gl.SHORT, 12, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribIPointer(1, 4, gl.UNSIGNED_BYTE, 12, 8);
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
    gl.vertexAttribIPointer(0, 4, gl.SHORT, 12, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribIPointer(1, 4, gl.UNSIGNED_BYTE, 12, 8);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 24, 20); gl.vertexAttribDivisor(4, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.gpu.ibo);
    gl.bindVertexArray(null);
    this.gpuBytes += data.byteLength;
    return { vao, buf, count, model, bytes: data.byteLength };
  }
  freeInstances(b) {
    this.gl.deleteVertexArray(b.vao); this.gl.deleteBuffer(b.buf);
    this.gpuBytes -= b.bytes;
  }

  // ------------------------------------------------------------------ frame
  _frameUniforms(p, f) {
    const e = f.env, cam = this.camera;
    p.f3('u_sunDir', e.sunDir[0], e.sunDir[1], e.sunDir[2]);
    p.f3('u_sunColor', e.sunColor[0], e.sunColor[1], e.sunColor[2]);
    p.f3('u_zenith', e.zenith[0], e.zenith[1], e.zenith[2]);
    p.f3('u_horizon', e.horizon[0], e.horizon[1], e.horizon[2]);
    p.f3('u_fogColor', e.fog[0], e.fog[1], e.fog[2]);
    p.f3('u_fogSun', e.fogSun[0], e.fogSun[1], e.fogSun[2]);
    p.f1('u_night', e.night);
    p.f1('u_exposure', e.exposure);
  }

  _voxUniforms(p, f) {
    const e = f.env, cam = this.camera, q = this.q;
    this._frameUniforms(p, f);
    p.f3('u_ambSky', e.ambSky[0], e.ambSky[1], e.ambSky[2]);
    p.f3('u_ambGround', e.ambGround[0], e.ambGround[1], e.ambGround[2]);
    const vd = f.viewDistance;
    p.f1('u_fogDensity', 1.35 / vd);
    p.f1('u_fogHeight', 0.00006);
    p.f1('u_fogEnd', vd);
    p.f1('u_camY', cam.pos[1]);
    p.f1('u_time', f.time);
    p.f1('u_edge', q.voxelEdges || 0);
    p.f1('u_aoStrength', q.ao === false ? 0 : 1);
    if (q.shadows > 0) {
      const sh = this.shadows, gl = this.gl;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, sh.tex);
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

  _drawBatches(p, n, cam) {
    if (!n.batches || !n.batches.length) return;
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
    gl.bindVertexArray(mesh.gpu.vao);
    gl.drawElements(gl.TRIANGLES, mesh.gpu.indexCount, mesh.gpu.indexType, 0);
    this.stats.draws++; this.stats.models++; this.stats.tris += mesh.gpu.indexCount / 3;
  }

  _shadowPass(f) {
    const gl = this.gl, sh = this.shadows, cam = this.camera, P = this.progs;
    sh.update(cam, f.env.sunDir, this.q.shadowDistance || 1200);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(2.0, 4.0);
    gl.viewport(0, 0, sh.size, sh.size);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    const range = (this.q.shadowDistance || 1200) + 900;
    for (let c = 0; c < sh.count; c++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sh.fbos[c]);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      const vp = sh.matsD[c];
      const reach = sh.splits[c] + 400;
      P.dNode.use(); this._setVP(P.dNode, vp);
      for (const n of f.nodes) if (n.dMin < reach && n.level <= (this.q.shadowMaxLevel ?? 4)) this._drawNode(P.dNode, n, cam);
      P.dInst.use(); this._setVP(P.dInst, vp);
      P.dInst.f3('u_tint', 1, 1, 1);
      for (const n of f.nodes) if (n.dMin < reach && n.batches && n.batches.length) this._drawBatches(P.dInst, n, cam);
      P.dModel.use(); this._setVP(P.dModel, vp);
      for (const m of f.models) this._drawModel(P.dModel, m, cam);
    }
    void range;
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  _skyPass(f) {
    const gl = this.gl, p = this.progs.sky, cam = this.camera, e = f.env;
    p.use();
    this._frameUniforms(p, f);
    mat4.perspective(this._skyProj, cam.fov, cam.aspect, 0.1, 10);
    mat4.multiply(this._vp, this._skyProj, cam.view);
    mat4.invert(this._invVP, this._vp);
    const m = this._f32;
    for (let i = 0; i < 16; i++) m[i] = this._invVP[i];
    p.m4('u_invVP', m);
    p.f3('u_cam', cam.pos[0], cam.pos[1], cam.pos[2]);
    p.f1('u_time', f.time);
    p.f1('u_cover', 1 - e.cover * 0.85);
    p.f2('u_wind', e.wind[0], e.wind[1]);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }

  /**
   * Draw one frame. f = { env, time, viewDistance, nodes: [{gpu, batches, x0, z0, ix, iz, level, cell, bounds}],
   * models: [{mesh, x, y, z, rot, tint}], cockpit: [models] }.
   */
  render(f) {
    const gl = this.gl, cam = this.camera, P = this.progs;
    this.stats.draws = 0; this.stats.tris = 0; this.stats.nodes = 0; this.stats.batches = 0; this.stats.models = 0;
    const far = Math.max(f.viewDistance * 1.6, 9000);
    for (const n of f.nodes) this._nodeDist(n, cam);
    cam.buildVP(0.3, NEAR_SPLIT + 200, this.nearVP);
    cam.buildVP(NEAR_SPLIT - 200, far, this.farVP);
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
      const all = f.nodes;
      f = { ...f, nodes: all.filter((n) => n.dMin < (this.q.shadowDistance || 1200) + 600) };
      this._shadowPass(f);
      f = { ...f, nodes: visible };
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.depthFunc(gl.LEQUAL);
    this._skyPass(f);

    const drawWorld = (vp, sel) => {
      P.node.use(); this._voxUniforms(P.node, f); this._setVP(P.node, vp);
      for (const n of visible) if (sel(n)) this._drawNode(P.node, n, cam);
      P.inst.use(); this._voxUniforms(P.inst, f); this._setVP(P.inst, vp);
      P.inst.f3('u_tint', 1, 1, 1);
      for (const n of visible) if (sel(n)) this._drawBatches(P.inst, n, cam);
    };
    // far pass
    drawWorld(this.farVP, (n) => n.dMax > NEAR_SPLIT - 300);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    // near pass
    drawWorld(this.nearVP, (n) => n.dMin < NEAR_SPLIT + 300);
    if (f.models && f.models.length) {
      P.model.use(); this._voxUniforms(P.model, f); this._setVP(P.model, this.nearVP);
      for (const m of f.models) this._drawModel(P.model, m, cam);
    }
    // cockpit pass with its own tight frustum
    if (f.cockpit && f.cockpit.length) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      cam.buildVP(0.03, 60, this._vpN);
      P.model.use(); this._voxUniforms(P.model, f); this._setVP(P.model, this._vpN);
      for (const m of f.cockpit) this._drawModel(P.model, m, cam);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    if (this.progs) for (const p of Object.values(this.progs)) p.dispose();
    this.shadows.dispose();
  }
}
const ONE = [1, 1, 1];
