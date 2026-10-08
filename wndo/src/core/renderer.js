// wndo :: frame pipeline
// scene (HDR, alpha = distance) -> blur pyramid -> drops view (sharp + small lights)
// -> outside at current focus (+ bokeh discs) -> glass / frame / room / grade -> screen
(() => {
  const W = window.W;
  const MAXL = 6000;

  class Lights {
    constructor() {
      this.data = new Float32Array(MAXL * 12);
      this.n = 0;
    }
    clear() {
      this.n = 0;
    }
    // kind 0 point, 1 mirror in y=0, 2 motion streak (v = world velocity), 3 bokeh-only (area light)
    add(x, y, z, size, r, g, b, halo = 0, kind = 0, vx = 0, vy = 0, vz = 0) {
      if (this.n >= MAXL) return;
      const o = this.n++ * 12, d = this.data;
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size;
      d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = halo;
      d[o + 8] = kind; d[o + 9] = vx; d[o + 10] = vy; d[o + 11] = vz;
    }
    // light plus its reflection in a wet road or water at y = 0
    addRefl(x, y, z, size, r, g, b, halo, gain) {
      this.add(x, y, z, size, r, g, b, halo, 0);
      if (gain > 0) this.add(x, -y, z, size, r * gain, g * gain, b * gain, 0, 1);
    }
  }

  class Camera {
    constructor() {
      this.base = [0, 1.6, 0];
      this.pos = [0, 1.6, 0];
      this.yaw = 0;
      this.pitch = 0;
      this.fovY = 55;
      this.mat = new Float32Array(9);
      this.tanHalf = [1, 1];
      this.head = [0, 0];
      this.shake = [0, 0];
    }
    update(aspect) {
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const f = [sy * cp, sp, cy * cp];
      const r = W.v3.norm(W.v3.cross([0, 1, 0], f));
      const u = W.v3.cross(f, r);
      this.r = r; this.u = u; this.f = f;
      this.mat.set([r[0], r[1], r[2], u[0], u[1], u[2], f[0], f[1], f[2]]);
      const t = Math.tan((this.fovY * Math.PI) / 360) * Math.pow(W.clamp(1.45 / aspect, 1, 2.4), 0.5);
      this.tanHalf = [t * aspect, t];
      this.kp = 0.5 / t;
      const hx = this.head[0] + this.shake[0], hy = this.head[1] + this.shake[1];
      this.pos = [
        this.base[0] + r[0] * hx + u[0] * hy,
        this.base[1] + r[1] * hx + u[1] * hy,
        this.base[2] + r[2] * hx + u[2] * hy,
      ];
    }
    // world -> ndc (x,y in [-1,1]) and camera depth
    project(p) {
      const d = W.v3.sub(p, this.pos);
      const z = W.v3.dot(d, this.f);
      return [W.v3.dot(d, this.r) / (z * this.tanHalf[0]), W.v3.dot(d, this.u) / (z * this.tanHalf[1]), z];
    }
  }

  // window styles: screen margins at the glass (screen-height units), frame widths in metres
  const STYLES = {
    none: null,
    picture: { mx: 0.07, mt: 0.075, mb: 0.165, fw: 0.07, ft: 0.07, fb: 0.062, corner: 0.004, bars: () => [] },
    casement: { mx: 0.07, mt: 0.075, mb: 0.165, fw: 0.07, ft: 0.07, fb: 0.062, corner: 0.004, bars: (I) => [[-0.034, I[1], 0.034, I[3]]] },
    cross: {
      mx: 0.07, mt: 0.075, mb: 0.165, fw: 0.07, ft: 0.07, fb: 0.062, corner: 0.004,
      bars: (I) => {
        const y = I[1] + (I[3] - I[1]) * 0.6;
        return [[-0.03, I[1], 0.03, I[3]], [I[0], y - 0.028, I[2], y + 0.028]];
      },
    },
    sash: {
      mx: 0.07, mt: 0.075, mb: 0.165, fw: 0.068, ft: 0.07, fb: 0.062, corner: 0.004,
      bars: (I) => {
        const y = I[1] + (I[3] - I[1]) * 0.5;
        return [[I[0], y - 0.04, I[2], y + 0.04]];
      },
    },
    loft: {
      mx: 0.06, mt: 0.065, mb: 0.165, fw: 0.05, ft: 0.05, fb: 0.05, corner: 0.002,
      bars: (I) => {
        const w = I[2] - I[0], h = I[3] - I[1], t = 0.014;
        const out = [];
        const nx = w > 1.6 ? 3 : 2;
        for (let i = 1; i < nx; i++) {
          const x = I[0] + (w * i) / nx;
          out.push([x - t, I[1], x + t, I[3]]);
        }
        out.push([I[0], I[1] + h * 0.34 - t, I[2], I[1] + h * 0.34 + t]);
        out.push([I[0], I[1] + h * 0.7 - t, I[2], I[1] + h * 0.7 + t]);
        return out;
      },
    },
    train: { mx: 0.1, mt: 0.11, mb: 0.19, fw: 0.06, ft: 0.06, fb: 0.05, corner: 0.11, bars: () => [] },
  };

  const MATERIALS = {
    white: { kind: 0, frame: '#e7e1d6', sill: '#e2dccf' },
    oak: { kind: 1, frame: '#9b6c40', sill: '#8e623a' },
    charcoal: { kind: 0, frame: '#2e2d2b', sill: '#3a3835' },
    green: { kind: 0, frame: '#34493a', sill: '#d9d2c4' },
    steel: { kind: 2, frame: '#262728', sill: '#6e6457' },
    train: { kind: 3, frame: '#b9b4a9', sill: '#8c877d' },
  };

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.G = new W.GL(canvas);
      this.gl = this.G.gl;
      this.lights = new Lights();
      this.cam = new Camera();
      this.T = {};
      this.drops = 2;
      this.win = null;
      this.winKey = '';
      this.wipe = { seg: [0, 0, 0, 0], active: 0, pending: [] };
      this.build();
    }

    build() {
      const G = this.G, SH = W.SH;
      this.pDown = G.program(SH.vert, SH.down, 'down');
      this.pCopy = G.program(SH.vert, SH.copy, 'copy');
      this.pComp = G.program(SH.vert, SH.composite, 'composite');
      this.pBokeh = G.program(SH.bokehVS, SH.bokehFS, 'bokeh');
      this.pWipe = G.program(SH.vert, SH.wipe, 'wipe');
      this.pBg = G.program(SH.vert, SH.bokehBg, 'bokehBg');
      this.buildFinal();
      this.initBokehVAO();
      this.makeGlassNoise();
    }

    buildFinal() {
      this.pFinal = this.G.program(W.SH.vert, W.SH.final, 'final', { DROPS: this.drops });
    }

    setDropQuality(n) {
      n = n > 1 ? 2 : 1;
      if (n === this.drops) return;
      this.drops = n;
      this.buildFinal();
    }

    initBokehVAO() {
      const gl = this.gl;
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.instBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.lights.data.byteLength, gl.DYNAMIC_DRAW);
      for (let i = 0; i < 3; i++) {
        gl.enableVertexAttribArray(1 + i);
        gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 48, i * 16);
        gl.vertexAttribDivisor(1 + i, 1);
      }
      gl.bindVertexArray(null);
    }

    makeGlassNoise() {
      const G = this.G, gl = this.gl;
      const t = G.target(512, 512, { format: 'rgba8', repeat: true });
      const p = G.program(W.SH.vert, W.SH.glassTex, 'glassTex');
      G.bind(t);
      p.use();
      G.drawFS();
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      this.glassNoise = t;
    }

    // sizes: canvas pixels, scene scale, out scale
    resize(cw, ch, sceneScale, outScale) {
      const G = this.G, gl = this.gl, T = this.T;
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.sizes = [cw, ch, sceneScale, outScale];
      sceneScale *= this.sceneMul || 1;
      const sw = Math.max(64, Math.round(cw * sceneScale)), sh = Math.max(64, Math.round(ch * sceneScale));
      if (!T.scene) {
        T.scene = G.target(sw, sh, { nearest: false });
        T.L = [];
        for (let i = 0; i < 6; i++) T.L.push(G.target(8, 8));
        T.dv = G.target(8, 8);
        T.out = G.target(8, 8);
        T.wipeA = G.target(8, 8, { format: 'r8' });
        T.wipeB = G.target(8, 8, { format: 'r8' });
        T.depthCopy = null;
      }
      G.resizeTarget(T.scene, sw, sh);
      let w = sw, h = sh;
      for (let i = 0; i < 6; i++) {
        w = Math.max(2, Math.ceil(w / 2));
        h = Math.max(2, Math.ceil(h / 2));
        G.resizeTarget(T.L[i], w, h);
      }
      G.resizeTarget(T.dv, Math.round(cw * 0.5), Math.round(ch * 0.5));
      if (G.resizeTarget(T.out, Math.round(cw * outScale), Math.round(ch * outScale))) {
        gl.bindTexture(gl.TEXTURE_2D, T.out.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }
      const aspect = cw / ch;
      const wh = 216, ww = Math.round(216 * aspect);
      if (G.resizeTarget(T.wipeA, ww, wh)) {
        G.resizeTarget(T.wipeB, ww, wh);
        for (const t of [T.wipeA, T.wipeB]) {
          G.bind(t);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
      this.aspect = aspect;
      this.winKey = '';
    }

    // render the scene at a lower resolution while it is blurred anyway
    setSceneMul(m) {
      if (m === (this.sceneMul || 1) || !this.sizes) return;
      this.sceneMul = m;
      const [cw, ch, s, o] = this.sizes;
      this.resize(cw, ch, s, o);
    }

    // scene helpers ---------------------------------------------------------
    camUniforms() {
      const c = this.cam;
      return { uCamPos: c.pos, uCamMat: c.mat, uTanHalf: c.tanHalf, uRes: [this.T.scene.w, this.T.scene.h] };
    }
    // a copy of the scene's distance channel, for scenes that draw sprites with occlusion
    depthCopy() {
      const G = this.G, T = this.T;
      if (!T.depthCopy) T.depthCopy = G.target(T.scene.w, T.scene.h);
      G.resizeTarget(T.depthCopy, T.scene.w, T.scene.h);
      const gl = this.gl;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.scene.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.depthCopy.fbo);
      gl.blitFramebuffer(0, 0, T.scene.w, T.scene.h, 0, 0, T.scene.w, T.scene.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      G.bind(T.scene);
      return T.depthCopy;
    }

    // window geometry ---------------------------------------------------------
    windowFor(styleName, matName, opts) {
      const key = [styleName, matName, this.aspect.toFixed(3), this.cam.kp.toFixed(4), opts.candle, opts.mug, opts.plant].join('|');
      if (key === this.winKey) return this.win;
      this.winKey = key;
      const st = STYLES[styleName];
      const zg = 1.16, zf = 1.1, zw = 0.98, zl = 0.86;
      const kp = this.cam.kp, hw = this.aspect / 2;
      const mat = MATERIALS[matName] || MATERIALS.white;
      const win = { style: st ? Object.keys(STYLES).indexOf(styleName) : 0, z: [zw, zf, zg, zl] };
      if (!st) {
        Object.assign(win, { I3: [-9, -9, 9, 9], O3: [-9, -9, 9, 9], bars: [], corner: 0 });
      } else {
        const mx = st.mx * Math.min(1, Math.pow(this.aspect, 0.8));
        const I3 = [((-hw + mx) * zg) / kp, ((-0.5 + st.mb) * zg) / kp, ((hw - mx) * zg) / kp, ((0.5 - st.mt) * zg) / kp];
        const O3 = [I3[0] - st.fw, I3[1] - st.fb, I3[2] + st.fw, I3[3] + st.ft];
        Object.assign(win, { I3, O3, bars: st.bars(I3), corner: st.corner });
        const wid = I3[2] - I3[0], y = O3[1];
        win.candle = [I3[0] + Math.min(0.3, wid * 0.17), y, 0.955, opts.candle ? 1 : 0];
        win.mug = [I3[2] - Math.min(0.42, wid * 0.33), y, 0.93, opts.mug ? 1 : 0];
        win.plant = [I3[2] - Math.min(0.13, wid * 0.08), y, 1.035, opts.plant && wid > 0.95 ? 1 : 0];
        if (styleName === 'train') {
          win.candle[3] = 0;
          win.plant[3] = 0;
        }
      }
      win.mat = W.lin(mat.frame);
      win.mat2 = W.lin(mat.sill);
      win.matKind = mat.kind;
      this.win = win;
      return win;
    }

    // wipe strokes in glass coordinates
    addWipe(ax, ay, bx, by) {
      this.wipe.pending.push([ax, ay, bx, by]);
    }

    // per-frame ---------------------------------------------------------------
    frame(t, dt, scene, P) {
      const G = this.G, gl = this.gl, T = this.T, c = this.cam;
      // 1. the outside
      G.bind(T.scene);
      if (P.bokehOnly || !scene) {
        const bg = (scene && scene.bokehBg) || ['#0b0d10', '#14100c', '#060606'];
        this.pBg.use().set({ uTop: W.lin(bg[0]), uMid: W.lin(bg[1]), uBot: W.lin(bg[2]), uTime: t });
        G.drawFS();
      } else {
        scene.render(this, t, dt, P);
        G.bind(T.scene);
      }
      // 2. blur pyramid
      let src = T.scene;
      this.pDown.use();
      for (let i = 0; i < T.L.length; i++) {
        G.bind(T.L[i]);
        this.pDown.set({ uSrc: src, uTexel: [1 / src.w, 1 / src.h], uKaris: i === 0 ? 1 : 0 });
        G.drawFS();
        src = T.L[i];
      }
      // upload lights once
      const L = this.lights;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, L.data, 0, L.n * 12);

      // blur radius for the outside (px at out resolution)
      const kOut = P.K * (T.out.h / 1080);
      const rOut = kOut * Math.abs(P.focusInv - 1 / P.dTyp);
      this.blurAmt = W.clamp(rOut / (kOut * 0.86 + 1e-6), 0, 1);
      // 3. drops view: half-res sharp scene + small lights
      G.bind(T.dv);
      this.pCopy.use().set({ uSrc: T.L[0] });
      G.drawFS();
      this.drawLights(T.dv, true, P, 0);
      // 4. outside at the current focus
      const rScene = rOut * (T.scene.h / T.out.h);
      let A, B, mix, aSharp = 0;
      if (rScene < 1.7) {
        A = T.scene; B = T.L[0]; mix = rScene / 1.7; aSharp = 1;
      } else {
        const l = Math.min(1 + Math.log2(rScene / 1.7), 5.999);
        const i = Math.floor(l);
        A = i === 0 ? T.scene : T.L[i - 1];
        B = T.L[i];
        mix = l - i;
        aSharp = i === 0 ? 1 : 0;
      }
      G.bind(T.out);
      this.pComp.use().set({
        uLA: A, uLB: B, uSizeA: [A.w, A.h], uSizeB: [B.w, B.h], uMix: mix, uASharp: aSharp,
        uBl1: T.L[2], uBl2: T.L[4], uSizeBl1: [T.L[2].w, T.L[2].h], uSizeBl2: [T.L[4].w, T.L[4].h], uBloom: P.bloom,
      });
      G.drawFS();
      this.drawLights(T.out, false, P, kOut);
      gl.bindTexture(gl.TEXTURE_2D, T.out.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
      // 5. condensation wipes
      this.updateWipe(dt, P);
      // 6. the window
      G.bind(null);
      const w = this.win;
      const bars = new Float32Array(24);
      w.bars.slice(0, 6).forEach((b, i) => bars.set(b, i * 4));
      const kFinal = P.K * (gl.drawingBufferHeight / 1080);
      this.pFinal.use().set({
        uOut: T.out, uDV: T.dv, uWipe: T.wipeA, uNoise: this.glassNoise,
        uRes: [gl.drawingBufferWidth, gl.drawingBufferHeight], uTime: t,
        uHead: [(c.head[0] + c.shake[0]) * c.kp, (c.head[1] + c.shake[1]) * c.kp], uKp: c.kp,
        uK: kFinal, uFocusInv: P.focusInv, uGlassBlurK: 0.55,
        uWet: P.wet, uRunRate: P.runRate, uDropSize: P.dropSize, uFlowAng: P.flowAng, uCond: P.cond, uFrost: P.frost,
        uFogT: P.fogT, uSmudge: P.smudge, uSnowGlass: P.snowGlass, uOutLod: Math.max(0, Math.log2(T.out.h / 40)), uWipeOn: P.wipeOn ? 1 : 0,
        uStyle: w.style, uI3: w.I3, uO3: w.O3, uZ: w.z, uCorner: w.corner, uBars: bars, uBarN: Math.min(6, w.bars.length),
        uMat: w.mat, uMat2: w.mat2, uWall: P.wall, uMatKind: w.matKind,
        uLamp: P.lamp, uLampPos: [-0.95, 0.55, -0.35],
        uCandle: w.candle || [0, 0, 1, 0], uMug: w.mug || [0, 0, 1, 0], uPlant: w.plant || [0, 0, 1, 0],
        uFlame: P.flame, uFlameSway: P.flameSway,
        uRefl: P.refl, uTrain: P.train || 0, uFlash: P.flash, uFlashCol: P.flashCol,
        uExposure: P.exposure, uSat: P.sat, uContrast: P.contrast, uVig: P.vignette, uGrain: P.grain, uWarm: P.warm, uDim: P.dim,
        uLift: P.lift, uGain: P.gain,
      });
      G.drawFS();
    }

    drawLights(target, sharp, P, k) {
      const gl = this.gl, c = this.cam;
      if (!this.lights.n) return;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.pBokeh.use().set({
        uCamPos: c.pos, uCamMat: c.mat, uTanHalf: c.tanHalf, uTarget: [target.w, target.h],
        uK: k, uFocusInv: P.focusInv, uSharp: sharp ? 1 : 0, uBlurAmt: this.blurAmt,
        uGain: P.bokehGain * (sharp ? 1 : P.bokehBoost), uHalo: P.halo, uReflStretch: P.reflStretch, uShutter: P.shutter,
        uDepth: this.T.scene, uNoDepth: this.G.hdr ? 0 : 1,
        uBlades: P.blades, uBladeRot: 0.3, uRim: P.rim, uCat: P.cat, uCA: P.ca, uSoft: P.soft,
      });
      gl.bindVertexArray(this.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.lights.n);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }

    updateWipe(dt, P) {
      const G = this.G, T = this.T;
      const segs = this.wipe.pending.length ? this.wipe.pending : [null];
      const decay = Math.exp(-dt / P.refog);
      segs.forEach((sg, i) => {
        G.bind(T.wipeB);
        this.pWipe.use().set({
          uPrev: T.wipeA,
          uSeg: sg || [0, 0, 0, 0],
          uRad: 0.042,
          uDecay: i === 0 ? decay : 1,
          uActive: sg ? 1 : 0,
          uAspect: this.aspect,
        });
        G.drawFS();
        const tmp = T.wipeA;
        T.wipeA = T.wipeB;
        T.wipeB = tmp;
      });
      this.wipe.pending.length = 0;
    }
  }

  W.Renderer = Renderer;
  W.Lights = Lights;
  W.STYLES = STYLES;
  W.MATERIALS = MATERIALS;
})();
