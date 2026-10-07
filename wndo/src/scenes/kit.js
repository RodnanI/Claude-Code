// wndo :: kit for the nature scenes. Painted sprites (trees, grass, branches) and a billboard renderer.
(() => {
  const W = window.W;
  const K = (W.kit = {});

  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  // ---------- painters. Each draws into (0,0)-(w,h), base of the plant at the bottom centre ----------
  K.paint = {
    pine(g, w, h, r, o = {}) {
      const cx = w / 2;
      const top = h * 0.03, bot = h * 0.86;
      const maxW = w * 0.47 * (o.slim ? 0.72 : 1);
      // trunk
      const tg = g.createLinearGradient(cx - 6, 0, cx + 6, 0);
      tg.addColorStop(0, '#1b130e');
      tg.addColorStop(0.6, '#3a2a1f');
      tg.addColorStop(1, '#22180f');
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(cx - w * 0.018, h);
      g.lineTo(cx - w * 0.004, top);
      g.lineTo(cx + w * 0.004, top);
      g.lineTo(cx + w * 0.02, h);
      g.fill();
      const hue = o.hue != null ? o.hue : r.range(125, 150);
      const tiers = Math.floor(r.range(30, 44) * (h / 900));
      const snow = o.snow || 0;
      g.lineCap = 'round';
      for (let i = 0; i < tiers; i++) {
        const t = (i + r.range(-0.3, 0.3)) / tiers;
        const y = top + t * (bot - top);
        const half = maxW * (0.05 + 0.95 * Math.pow(t, 0.92)) * r.range(0.72, 1.06);
        const nb = 2 + Math.floor(r.range(0, 3));
        for (let b = 0; b < nb; b++) {
          const side = b % 2 ? 1 : -1;
          const depth = r.range(0.35, 1);
          const len = half * depth;
          const droop = h * 0.035 * (0.4 + t) * r.range(0.6, 1.3);
          const lift = h * 0.012 * (1 - t);
          const shade = 0.55 + 0.45 * depth;
          const n = Math.max(3, Math.floor(len / 2.6));
          for (let k = 0; k < n; k++) {
            const u = k / n;
            const bx = cx + side * len * u;
            const by = y - lift * u + droop * u * u;
            const tuft = (1 - u * 0.35) * r.range(3, 7) * (h / 900) * 2.2;
            const nn = 3 + Math.floor(r.range(0, 3));
            for (let m = 0; m < nn; m++) {
              const a = Math.PI / 2 + side * r.range(0.25, 1.35) - r.range(0, 0.9) * side * (m % 2);
              const l = tuft * r.range(0.6, 1.3);
              const lit = (1 - t) * 10 + u * 9 + (m === 0 ? 6 : 0);
              g.strokeStyle = hsl(hue + r.range(-8, 8), r.range(18, 32), (6 + lit * 0.55 + r.range(0, 5)) * shade, 0.9);
              g.lineWidth = r.range(0.8, 1.9) * (h / 900) * 1.6;
              g.beginPath();
              g.moveTo(bx, by);
              g.lineTo(bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.8);
              g.stroke();
            }
            if (snow && r() < 0.75 * snow && u > 0.08) {
              g.fillStyle = hsl(210, 20, r.range(80, 94), r.range(0.7, 0.95));
              g.beginPath();
              g.ellipse(bx, by - tuft * 0.3, tuft * r.range(0.8, 1.4), tuft * r.range(0.3, 0.55), side * 0.15, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      }
    },

    birch(g, w, h, r, o = {}) {
      const cx = w / 2 + r.range(-0.05, 0.05) * w;
      const lean = r.range(-0.06, 0.06) * w;
      const tw = w * 0.032;
      // trunk with lenticels
      const steps = 60;
      for (let i = 0; i < steps; i++) {
        const t = i / steps, y = h - t * h * 0.82, x = cx + lean * t * t;
        const wd = tw * (1 - t * 0.75);
        const lg = g.createLinearGradient(x - wd, 0, x + wd, 0);
        lg.addColorStop(0, '#8d877c');
        lg.addColorStop(0.35, '#e7e2d6');
        lg.addColorStop(0.7, '#d8d2c4');
        lg.addColorStop(1, '#6f695f');
        g.fillStyle = lg;
        g.fillRect(x - wd, y - h * 0.82 / steps - 1, wd * 2, h * 0.82 / steps + 2);
        if (r() < 0.55) {
          g.fillStyle = `rgba(20,18,16,${r.range(0.5, 0.9)})`;
          g.fillRect(x - wd * r.range(0.2, 1), y - r.range(1, 3), wd * r.range(0.4, 1.4), r.range(1, 3.2));
        }
        if (t < 0.12 && r() < 0.5) {
          g.fillStyle = 'rgba(25,22,18,0.7)';
          g.fillRect(x - wd, y - 4, wd * 2, r.range(2, 6));
        }
      }
      // branches and leaves
      const hue = o.hue != null ? o.hue : r.range(62, 90);
      const leaves = [];
      const branch = (x, y, a, len, wd, d) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.strokeStyle = d < 2 ? '#2a2420' : '#3a322b';
        g.lineWidth = wd;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo((x + x2) / 2 + r.range(-6, 6), (y + y2) / 2 + r.range(-4, 8), x2, y2);
        g.stroke();
        if (d > 3 || len < 10) {
          for (let k = 0; k < 20; k++) leaves.push([x2 + r.range(-26, 26) * (h / 1000), y2 + r.range(-18, 30) * (h / 1000)]);
          return;
        }
        const n = 2 + Math.floor(r.range(0, 2));
        for (let k = 0; k < n; k++) {
          let na = a + r.range(-0.6, 0.6) + (k - n / 2) * 0.22;
          const nx = x2 + Math.cos(na) * len * 0.7;
          if (nx < w * 0.08 || nx > w * 0.92) na = -Math.PI / 2 + (na + Math.PI / 2) * 0.3;
          branch(x2, y2, na, len * r.range(0.55, 0.75), wd * 0.62, d + 1);
        }
        if (d > 1) for (let k = 0; k < 10; k++) leaves.push([x + (x2 - x) * r() + r.range(-14, 14), y + (y2 - y) * r() + r.range(-6, 20)]);
      };
      for (let i = 0; i < 9; i++) {
        const t = r.range(0.35, 0.95), y = h - t * h * 0.82, x = cx + lean * t * t;
        const side = i % 2 ? 1 : -1;
        branch(x, y, -Math.PI / 2 + side * r.range(0.25, 0.75), h * r.range(0.07, 0.13) * (1.15 - t * 0.5), tw * 0.45, 0);
      }
      branch(cx + lean, h * 0.18, -Math.PI / 2 + r.range(-0.2, 0.2), h * 0.12, tw * 0.4, 1);
      // leaves: lit from upper left, darker inside
      const lx = cx - w * 0.2, ly = h * 0.1;
      for (const [x, y] of leaves) {
        const d = Math.hypot(x - lx, y - ly) / h;
        const l = 22 + 30 * (1 - Math.min(d, 1)) + r.range(-6, 8);
        g.fillStyle = hsl(hue + r.range(-10, 14), r.range(35, 60), l, r.range(0.75, 1));
        g.beginPath();
        g.ellipse(x, y, r.range(2.2, 4.2) * (h / 1000) * 1.6, r.range(1.4, 2.6) * (h / 1000) * 1.6, r.range(0, Math.PI), 0, Math.PI * 2);
        g.fill();
      }
    },

    // a broad deciduous crown (oak-ish), used as a dark silhouette at night or a soft tree by day
    oak(g, w, h, r, o = {}) {
      const cx = w / 2;
      g.fillStyle = o.trunk || '#241a12';
      g.beginPath();
      g.moveTo(cx - w * 0.05, h);
      g.quadraticCurveTo(cx - w * 0.02, h * 0.7, cx - w * 0.03, h * 0.45);
      g.lineTo(cx + w * 0.03, h * 0.45);
      g.quadraticCurveTo(cx + w * 0.03, h * 0.7, cx + w * 0.06, h);
      g.fill();
      const blobs = 70;
      for (let i = 0; i < blobs; i++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r());
        const x = cx + Math.cos(a) * rr * w * 0.4, y = h * 0.36 + Math.sin(a) * rr * h * 0.27;
        const s = r.range(0.05, 0.11) * w;
        const lit = (1 - (y / h)) * 14 + (x < cx ? 6 : 0);
        for (let k = 0; k < 90; k++) {
          const b = r() * Math.PI * 2, q = Math.sqrt(r()) * s;
          g.fillStyle = hsl(o.hue || r.range(85, 110), o.sat || 30, (o.light || 10) + lit * (o.litK || 1) * r.range(0.4, 1), 0.9);
          g.beginPath();
          g.ellipse(x + Math.cos(b) * q, y + Math.sin(b) * q, r.range(2, 5) * w / 600, r.range(1.5, 3.5) * w / 600, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    },

    grass(g, w, h, r, o = {}) {
      const n = o.n || 90;
      const hue = o.hue != null ? o.hue : 75;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = w / 2 + r.gauss() * w * 0.16;
        const bh = h * r.range(0.35, 0.98);
        const bend = r.range(-0.35, 0.35) * w * 0.4;
        const lg = g.createLinearGradient(0, h, 0, h - bh);
        lg.addColorStop(0, hsl(hue + 10, o.sat || 35, (o.light || 14) * 0.6));
        lg.addColorStop(1, hsl(hue - 18 + r.range(-10, 10), (o.sat || 35) + 10, (o.light || 14) + r.range(6, 22)));
        g.strokeStyle = lg;
        g.lineWidth = r.range(1, 2.6) * (w / 256);
        g.beginPath();
        g.moveTo(x, h);
        g.quadraticCurveTo(x + bend * 0.2, h - bh * 0.6, x + bend, h - bh);
        g.stroke();
        if (o.seeds && r() < 0.12) {
          g.fillStyle = hsl(40, 40, 45, 0.9);
          g.beginPath();
          g.ellipse(x + bend, h - bh, 2.5, 8, bend * 0.004, 0, Math.PI * 2);
          g.fill();
        }
        if (o.flowers && r() < 0.05) {
          g.fillStyle = r.pick(['#e8e2c8', '#d9c34a', '#c8a2d8', '#efefe6']);
          g.beginPath();
          g.arc(x + bend, h - bh, r.range(2, 4.5) * (w / 256), 0, Math.PI * 2);
          g.fill();
        }
      }
    },

    // a pine bough reaching in from the side, seen close up
    bough(g, w, h, r, o = {}) {
      g.lineCap = 'round';
      const pts = [];
      let x = 0, y = h * 0.25, a = r.range(0.05, 0.25);
      for (let i = 0; i < 40; i++) {
        pts.push([x, y]);
        x += Math.cos(a) * w / 40;
        y += Math.sin(a) * w / 40;
        a += r.range(-0.04, 0.06);
      }
      g.strokeStyle = '#2b2018';
      g.lineWidth = h * 0.03;
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
      for (let i = 2; i < pts.length; i++) {
        const [px, py] = pts[i];
        const u = i / pts.length;
        for (let k = 0; k < 2; k++) {
          const side = k ? 1 : -1;
          let tx = px, ty = py, ta = Math.PI / 2 * side * 0.7 + r.range(-0.2, 0.2) + 0.3;
          const tl = h * r.range(0.12, 0.3) * (1 - u * 0.4);
          for (let s = 0; s < 8; s++) {
            const nx = tx + Math.cos(ta) * tl / 8, ny = ty + Math.sin(ta) * tl / 8;
            for (let m = 0; m < 9; m++) {
              const na = ta + side * r.range(0.6, 1.4) * (m % 2 ? 1 : -1);
              const nl = h * r.range(0.03, 0.055);
              g.strokeStyle = hsl(o.hue || 135, 28, r.range(8, 20) + (ty < py ? 8 : 0), 0.95);
              g.lineWidth = h * 0.004;
              g.beginPath();
              g.moveTo(nx, ny);
              g.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl);
              g.stroke();
            }
            if (o.snow && r() < 0.6) {
              g.fillStyle = hsl(210, 15, r.range(82, 95), 0.9);
              g.beginPath();
              g.ellipse(nx, ny - h * 0.012, h * r.range(0.02, 0.04), h * 0.012, 0, 0, Math.PI * 2);
              g.fill();
            }
            tx = nx; ty = ny;
            ta += r.range(-0.1, 0.15) * side;
          }
        }
      }
    },
  };

  // paint a set of sprites into one atlas canvas; returns {canvas, rects: {name: [u0,v0,u1,v1, aspect]}}
  K.atlas = function (specs, size = 2048) {
    // shelf packing, tallest first; the atlas grows downward as needed
    const order = specs.slice().sort((a, b) => b.h - a.h);
    let x = 0, y = 0, rowH = 0;
    const pos = new Map();
    for (const s of order) {
      if (x + s.w > size) {
        x = 0;
        y += rowH + 4;
        rowH = 0;
      }
      pos.set(s, [x, y]);
      x += s.w + 4;
      rowH = Math.max(rowH, s.h);
    }
    const H = Math.min(4096, y + rowH);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = H;
    const g = c.getContext('2d');
    const rects = {};
    for (const s of specs) {
      const [px, py] = pos.get(s);
      if (py + s.h > H) continue;
      g.save();
      g.translate(px, py);
      g.beginPath();
      g.rect(0, 0, s.w, s.h);
      g.clip();
      K.paint[s.kind](g, s.w, s.h, W.rng(s.seed || 1), s.o || {});
      g.restore();
      rects[s.name] = [px / size, py / H, (px + s.w) / size, (py + s.h) / H, s.w / s.h];
    }
    return { canvas: c, rects };
  };

  // ---------- billboards ----------
  const BB_VS = /* glsl */ `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aPos;   // base xyz, width
layout(location = 2) in vec4 aUV;    // atlas rect
layout(location = 3) in vec4 aP;     // height, sway, phase, brightness
uniform vec3 uCamPos; uniform mat3 uCamMat; uniform vec2 uTanHalf;
uniform float uTime, uGust, uWind;
out vec2 vUv; out float vDist; out float vH; out float vBright; out vec3 vW; out float vPh;
void main(){
  vec3 R = normalize(vec3(uCamMat[0].x, 0.0, uCamMat[0].z));
  vec2 c = vec2(aCorner.x * 0.5, aCorner.y * 0.5 + 0.5);
  float gw = uGust * (0.55 + 0.45 * sin(aPos.x * 0.07 - uTime * 0.9 + aPos.z * 0.03));
  float sway = (sin(uTime * (0.9 + aP.z * 0.25) + aP.z * 6.0) * (0.12 + uWind * 0.3) + gw * 1.1) * aP.y;
  float hh = c.y * c.y;
  vec3 p = aPos.xyz + R * (c.x * aPos.w + sway * hh * aP.x * 0.12) + vec3(0.0, c.y * aP.x - abs(sway) * hh * aP.x * 0.02, 0.0);
  vec3 cc = transpose(uCamMat) * (p - uCamPos);
  vUv = vec2(mix(aUV.x, aUV.z, c.x + 0.5), mix(aUV.w, aUV.y, c.y));
  vDist = length(p - uCamPos);
  vH = c.y; vBright = aP.w; vW = p; vPh = aP.z;
  gl_Position = vec4(cc.x / uTanHalf.x, cc.y / uTanHalf.y, 0.0, cc.z);
}
`;
  const BB_FS = /* glsl */ `
${W.GLSL.common}
uniform sampler2D uAtlas;
uniform float uTime, uGust, uFlutter;
uniform vec3 uAmb, uSun, uFogCol; uniform float uFogD, uDepthPass;
uniform vec3 uLift;
in vec2 vUv; in float vDist; in float vH; in float vBright; in vec3 vW; in float vPh;
out vec4 o;
void main(){
  vec2 uv = vUv;
  float fl = (vnoise(vW.xy * 3.0 + uTime * (2.0 + uGust * 6.0) + vPh) - 0.5) * uFlutter * (0.3 + uGust) * vH;
  uv.x += fl * 0.004;
  vec4 c = texture(uAtlas, uv);
  if (uDepthPass > 0.5) { if (c.a < 0.55) discard; o = vec4(0.0, 0.0, 0.0, vDist); return; }
  if (c.a < 0.004) discard;
  vec3 alb = c.rgb / max(c.a, 1e-3);
  alb = alb * alb;
  float shimmer = 1.0 + fl * 0.9;
  vec3 col = alb * (uAmb + uSun * (0.55 + 0.45 * vH)) * vBright * shimmer + uLift * alb;
  float f = 1.0 - exp(-vDist * uFogD);
  col = mix(col, uFogCol, f);
  o = vec4(col * c.a, c.a);
}
`;

  K.Billboards = class {
    constructor(R, atlasCanvas) {
      const G = R.G, gl = R.gl;
      this.R = R;
      this.prog = G.program(BB_VS, BB_FS, 'billboard');
      this.tex = G.texture(atlasCanvas, { premultiply: true });
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      for (let i = 0; i < 3; i++) {
        gl.enableVertexAttribArray(1 + i);
        gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 48, i * 16);
        gl.vertexAttribDivisor(1 + i, 1);
      }
      gl.bindVertexArray(null);
      this.items = [];
    }
    // x,y,z base, rect from atlas, height in metres, sway, brightness
    add(x, y, z, rect, height, sway = 1, bright = 1) {
      this.items.push({ x, y, z, rect, h: height, w: height * rect[4], sway, bright, ph: Math.random() * 10 });
    }
    // sort far to near once (the camera barely moves)
    upload(camPos) {
      const gl = this.R.gl;
      this.items.sort((a, b) => Math.hypot(b.x - camPos[0], b.z - camPos[2]) - Math.hypot(a.x - camPos[0], a.z - camPos[2]));
      const d = new Float32Array(this.items.length * 12);
      this.items.forEach((it, i) => {
        d.set([it.x, it.y, it.z, it.w, it.rect[0], it.rect[1], it.rect[2], it.rect[3], it.h, it.sway, it.ph, it.bright], i * 12);
      });
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
      this.n = this.items.length;
    }
    draw(t, u, depth) {
      const R = this.R, gl = R.gl, c = R.cam;
      this.prog.use().set({
        uCamPos: c.pos, uCamMat: c.mat, uTanHalf: c.tanHalf, uTime: t, uAtlas: this.tex,
        uGust: u.gust, uWind: u.wind, uFlutter: u.flutter != null ? u.flutter : 1,
        uAmb: u.amb, uSun: u.sun, uFogCol: u.fogCol, uFogD: u.fogD, uLift: u.lift || [0, 0, 0], uDepthPass: 0,
      });
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      gl.bindVertexArray(this.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
      if (depth) {
        // write the nearest opaque distance into alpha so lights behind trees get hidden
        this.prog.set({ uDepthPass: 1 });
        gl.colorMask(false, false, false, true);
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.MIN);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
        gl.colorMask(true, true, true, true);
        gl.blendEquation(gl.FUNC_ADD);
      }
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
  };

  // shared GLSL: physically-flavoured sky for daytime scenes
  W.GLSL.sky = /* glsl */ `
vec3 skyGrad(vec3 rd, vec3 sunDir, vec3 zenith, vec3 horizon, vec3 sunCol, float haze){
  float h = max(rd.y, 0.0);
  vec3 c = mix(horizon, zenith, pow(h, 0.45));
  float mu = max(dot(rd, sunDir), 0.0);
  c += sunCol * (pow(mu, 8.0) * 0.25 + pow(mu, 64.0) * 0.6) * (0.5 + haze);
  c = mix(c, horizon, exp(-h * 18.0) * haze * 0.6);
  return c;
}
`;
})();
