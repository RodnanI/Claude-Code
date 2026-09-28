/** Thin WebGL2 helpers: context creation, program compilation with defines, uniform caching. */

export function createGL(canvas, { antialias = false, powerPreference = 'high-performance' } = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias, depth: true, stencil: false, powerPreference,
    preserveDrawingBuffer: false, desynchronized: false, failIfMajorPerformanceCaveat: false,
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  return gl;
}

export function gpuInfo(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxArrayLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS),
    maxSamples: gl.getParameter(gl.MAX_SAMPLES),
  };
}

function compile(gl, type, src, label) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    const numbered = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
    throw new Error(`Shader compile failed (${label}):\n${log}\n${numbered}`);
  }
  return sh;
}

export class Program {
  constructor(gl, vsSrc, fsSrc, defines = {}, label = 'program') {
    this.gl = gl;
    this.label = label;
    const defs = Object.entries(defines).map(([k, v]) => (v === true ? `#define ${k}\n` : v === false || v === undefined ? '' : `#define ${k} ${v}\n`)).join('');
    const inject = (s) => s.replace('#version 300 es\n', '#version 300 es\n' + defs);
    const vs = compile(gl, gl.VERTEX_SHADER, inject(vsSrc), label + '.vert');
    const fs = compile(gl, gl.FRAGMENT_SHADER, inject(fsSrc), label + '.frag');
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Program link failed (${label}): ${gl.getProgramInfoLog(p)}`);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.p = p;
    this.locs = new Map();
  }
  use() { this.gl.useProgram(this.p); return this; }
  loc(name) {
    let l = this.locs.get(name);
    if (l === undefined) { l = this.gl.getUniformLocation(this.p, name); this.locs.set(name, l); }
    return l;
  }
  f1(n, v) { const l = this.loc(n); if (l) this.gl.uniform1f(l, v); }
  i1(n, v) { const l = this.loc(n); if (l) this.gl.uniform1i(l, v); }
  f2(n, a, b) { const l = this.loc(n); if (l) this.gl.uniform2f(l, a, b); }
  f3(n, a, b, c) { const l = this.loc(n); if (l) this.gl.uniform3f(l, a, b, c); }
  i3(n, a, b, c) { const l = this.loc(n); if (l) this.gl.uniform3i(l, a, b, c); }
  f4(n, a, b, c, d) { const l = this.loc(n); if (l) this.gl.uniform4f(l, a, b, c, d); }
  m4(n, m) { const l = this.loc(n); if (l) this.gl.uniformMatrix4fv(l, false, m); }
  m3(n, m) { const l = this.loc(n); if (l) this.gl.uniformMatrix3fv(l, false, m); }
  dispose() { this.gl.deleteProgram(this.p); }
}
