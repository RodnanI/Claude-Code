// wndo :: thin WebGL2 layer (programs, render targets, textures)
(() => {
  const W = window.W;

  class GL {
    constructor(canvas) {
      const gl = canvas.getContext('webgl2', {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance',
      });
      if (!gl) throw new Error('This browser has no WebGL2.');
      this.gl = gl;
      this.hdr = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
      this.floatLinear = !!gl.getExtension('OES_texture_float_linear');
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.emptyVAO = gl.createVertexArray();
      this.programs = [];
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    }

    compile(type, src, name) {
      const gl = this.gl, s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s) || '';
        const lines = src.split('\n');
        const m = /ERROR: \d+:(\d+)/.exec(log);
        const at = m ? +m[1] : 0;
        const ctx = at ? lines.slice(Math.max(0, at - 4), at + 2).map((l, i) => at - 3 + i + ': ' + l).join('\n') : '';
        throw new Error('Shader "' + name + '" failed:\n' + log + '\n' + ctx);
      }
      return s;
    }

    // defines: {NAME: value}
    program(vs, fs, name, defines) {
      const gl = this.gl;
      let pre = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n';
      if (defines) for (const k in defines) pre += '#define ' + k + ' ' + defines[k] + '\n';
      const p = gl.createProgram();
      gl.attachShader(p, this.compile(gl.VERTEX_SHADER, pre + vs, name + '.vs'));
      gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, pre + fs, name + '.fs'));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link "' + name + '": ' + gl.getProgramInfoLog(p));
      const prog = new Program(this, p, name);
      this.programs.push(prog);
      return prog;
    }

    // render target with one color attachment
    target(w, h, opts = {}) {
      const gl = this.gl;
      const t = { w: 0, h: 0, tex: gl.createTexture(), fbo: gl.createFramebuffer(), opts };
      this.resizeTarget(t, w, h);
      return t;
    }

    resizeTarget(t, w, h) {
      const gl = this.gl;
      w = Math.max(1, Math.round(w));
      h = Math.max(1, Math.round(h));
      if (t.w === w && t.h === h) return false;
      t.w = w;
      t.h = h;
      const o = t.opts;
      let internal, format = gl.RGBA, type;
      if (o.format === 'r8') {
        internal = gl.R8; format = gl.RED; type = gl.UNSIGNED_BYTE;
      } else if (o.format === 'rgba8' || !this.hdr) {
        internal = gl.RGBA8; type = gl.UNSIGNED_BYTE;
      } else {
        internal = gl.RGBA16F; type = gl.HALF_FLOAT;
      }
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
      const filt = o.nearest ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      const wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return true;
    }

    bind(t) {
      const gl = this.gl;
      if (t) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
        gl.viewport(0, 0, t.w, t.h);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
    }

    drawFS() {
      const gl = this.gl;
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // texture from canvas / image, optional mipmaps
    texture(src, opts = {}) {
      const gl = this.gl, tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!opts.premultiply);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (opts.mips !== false) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.mips !== false ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      return tex;
    }

    // RGBA32F data texture, sampled with texelFetch
    dataTexture(w, h, data, tex) {
      const gl = this.gl;
      tex = tex || gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }

    deleteTexture(t) {
      if (t) this.gl.deleteTexture(t);
    }
  }

  class Program {
    constructor(G, p, name) {
      const gl = G.gl;
      this.G = G;
      this.gl = gl;
      this.p = p;
      this.name = name;
      this.u = {};
      this.units = {};
      let unit = 0;
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const key = info.name.replace(/\[0\]$/, '');
        const loc = gl.getUniformLocation(p, info.name);
        const isSampler = info.type === gl.SAMPLER_2D;
        this.u[key] = { loc, type: info.type, size: info.size };
        if (isSampler) {
          this.units[key] = unit;
          gl.useProgram(p);
          gl.uniform1i(loc, unit);
          unit++;
        }
      }
    }

    use() {
      this.gl.useProgram(this.p);
      return this;
    }

    // set many uniforms; textures by passing a WebGLTexture or a target object
    set(vals) {
      const gl = this.gl;
      for (const k in vals) {
        const u = this.u[k];
        if (!u) continue;
        const v = vals[k];
        switch (u.type) {
          case gl.FLOAT:
            if (u.size > 1) gl.uniform1fv(u.loc, v);
            else gl.uniform1f(u.loc, v);
            break;
          case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
          case gl.INT: case gl.BOOL: gl.uniform1i(u.loc, v); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
          case gl.SAMPLER_2D: {
            gl.activeTexture(gl.TEXTURE0 + this.units[k]);
            gl.bindTexture(gl.TEXTURE_2D, v && v.tex ? v.tex : v);
            break;
          }
        }
      }
      return this;
    }
  }

  W.GL = GL;
})();
