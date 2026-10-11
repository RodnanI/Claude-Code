// ANDOR :: camera, particles, lighting, weather and screen effects.

const Cam = {
  x: 0, y: 0, shakeT: 0, shakeMag: 0, sx: 0, sy: 0, look: 0, lock: null, lookY: 0,
  reset(px, py, level) {
    this.x = px - Screen.vw / 2;
    this.y = py - Screen.vh * 0.6;
    this.lock = null;
    this.clamp(level);
  },
  shake(mag, t = 0.25) {
    if (Settings.shake === false) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, t);
  },
  update(dt, p, level) {
    const vw = Screen.vw, vh = Screen.vh;
    this.look = approach(this.look, p.face * Math.min(28, vw * 0.09), dt * 70);
    let tx = p.cx + this.look - vw / 2;
    // vertical: follow feet with a dead zone; look further down while falling fast
    const feet = p.y + p.h;
    let ty = this.y;
    const top = this.y + vh * 0.32, bot = this.y + vh * 0.68;
    if (feet < top) ty = feet - vh * 0.32;
    if (feet > bot) ty = feet - vh * 0.68;
    if (p.onGround || p.state === 'hang' || p.state === 'swing') ty = lerp(ty, feet - vh * 0.62, 0.06);
    if (p.vy > 200) ty += (p.vy - 200) * 0.08;
    this.lookY = approach(this.lookY, p.lookDown ? 46 : 0, dt * 120);
    ty += this.lookY;
    if (this.lock) {
      const L = this.lock;
      tx = clamp(tx, L.x, L.x + L.w - vw);
      ty = clamp(ty, L.y, L.y + L.h - vh);
      if (L.w < vw) tx = L.x + (L.w - vw) / 2;
      if (L.h < vh) ty = L.y + L.h - vh;
    }
    const k = 1 - Math.pow(0.0005, dt);
    this.x = lerp(this.x, tx, Math.min(1, k * 1.6));
    this.y = lerp(this.y, ty, Math.min(1, k * 1.3));
    this.clamp(level);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.min(1, this.shakeT * 6);
      this.sx = Math.round(rnd(-m, m));
      this.sy = Math.round(rnd(-m, m));
      if (this.shakeT <= 0) this.shakeMag = 0;
    } else this.sx = this.sy = 0;
  },
  clamp(level) {
    const vw = Screen.vw, vh = Screen.vh;
    if (level.pw <= vw) this.x = (level.pw - vw) / 2;
    else this.x = clamp(this.x, 0, level.pw - vw);
    if (level.ph <= vh) this.y = level.ph - vh;
    else this.y = clamp(this.y, 0, level.ph - vh);
  },
  get rx() {
    return Math.round(this.x) + this.sx;
  },
  get ry() {
    return Math.round(this.y) + this.sy;
  },
};

// ---------------------------------------------------------------------------
const Parts = {
  list: [],
  max: 600,
  add(o) {
    if (this.list.length >= this.max) this.list.shift();
    const p = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, max: 0.5, col: '#fff', s: 1, g: 0, drag: 0, type: 'px', front: true }, o);
    p.max = p.life;
    this.list.push(p);
    return p;
  },
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rnd(-(o.spread || Math.PI), o.spread || Math.PI) : rnd(TAU);
      const sp = rnd(o.speedMin || 20, o.speed || 80);
      this.add({
        x: x + rnd(-(o.rx || 0), o.rx || 0), y: y + rnd(-(o.ry || 0), o.ry || 0),
        vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        life: rnd(o.lifeMin || 0.25, o.life || 0.6), col: Array.isArray(o.col) ? pick(o.col) : o.col || '#fff',
        s: o.s || 1, g: o.g === undefined ? 200 : o.g, drag: o.drag || 1, type: o.type || 'px', front: o.front !== false,
      });
    }
  },
  dust(x, y, n = 6, col = '#e6cf9e', dir = 0) {
    for (let i = 0; i < n; i++)
      this.add({ x: x + rnd(-4, 4), y: y - rnd(0, 2), vx: rnd(-30, 30) + dir * 40, vy: rnd(-30, -5), life: rnd(0.25, 0.5), col, g: 60, drag: 3, type: 'puff', s: rnd(1, 2.5) });
  },
  text(x, y, str, col = PAL.gold2) {
    this.add({ x, y, vy: -28, life: 0.9, str, col, type: 'text', drag: 2 });
  },
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) {
        L.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.collide && Game.level && Game.level.isSolidPx(p.x, p.y)) {
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.y -= 1;
      }
    }
  },
  draw(g, cam, front) {
    for (const p of this.list) {
      if (p.front !== front) continue;
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      const t = p.life / p.max;
      if (p.type === 'px') {
        g.fillStyle = p.col;
        g.fillRect(x, y, p.s, p.s);
      } else if (p.type === 'puff') {
        const r = p.s * (1.4 - t * 0.6);
        g.globalAlpha = Math.min(1, t * 1.6) * 0.8;
        pxCircle(g, x, y, r, p.col);
        g.globalAlpha = 1;
      } else if (p.type === 'spark') {
        g.fillStyle = p.col;
        g.fillRect(x, y, 1, 1);
        g.fillRect(Math.round(x - p.vx * 0.02), Math.round(y - p.vy * 0.02), 1, 1);
      } else if (p.type === 'ring') {
        g.globalAlpha = t;
        pxRing(g, x, y, (1 - t) * p.s + 2, p.col);
        g.globalAlpha = 1;
      } else if (p.type === 'text') {
        g.globalAlpha = Math.min(1, t * 3);
        drawText(g, p.str, x, y, p.col, { align: 'center', outline: PAL.ink });
        g.globalAlpha = 1;
      } else if (p.type === 'glow') {
        g.globalAlpha = t * 0.8;
        const s = lightStamp(p.s, p.col, 3);
        g.drawImage(s, x - p.s, y - p.s);
        g.globalAlpha = 1;
      } else if (p.type === 'leaf') {
        g.fillStyle = p.col;
        g.fillRect(x, y, Math.sin(p.life * 12) > 0 ? 2 : 1, 1);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Darkness with banded, dithered light pools. Lights are re-added every frame.
const Lighting = {
  c: null,
  g: null,
  lights: [],
  ambient: 0,
  tint: '#070403',
  begin(ambient, tint) {
    this.ambient = ambient;
    this.tint = tint || '#070403';
    this.lights.length = 0;
  },
  add(x, y, r, warm = '#ffb34a', power = 1) {
    this.lights.push({ x, y, r, warm, power });
  },
  render(g, cam, vw, vh) {
    if (this.ambient <= 0) return;
    if (!this.c || this.c.width !== vw || this.c.height !== vh) {
      this.c = makeCanvas(vw, vh);
      this.g = this.c.getContext('2d');
    }
    const lg = this.g;
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, vw, vh);
    lg.globalAlpha = this.ambient;
    lg.fillStyle = this.tint;
    lg.fillRect(0, 0, vw, vh);
    lg.globalAlpha = 1;
    lg.globalCompositeOperation = 'destination-out';
    for (const L of this.lights) {
      const x = Math.round(L.x - cam.x), y = Math.round(L.y - cam.y), r = Math.round(L.r);
      if (x + r < 0 || y + r < 0 || x - r > vw || y - r > vh) continue;
      lg.globalAlpha = Math.min(1, L.power);
      lg.drawImage(lightStamp(r, '#ffffff', 5), x - r, y - r);
    }
    lg.globalAlpha = 1;
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(this.c, 0, 0);
    // warm additive bloom
    g.globalCompositeOperation = 'lighter';
    for (const L of this.lights) {
      if (!L.warm) continue;
      const x = Math.round(L.x - cam.x), y = Math.round(L.y - cam.y), r = Math.round(L.r * 0.7);
      if (x + r < 0 || y + r < 0 || x - r > vw || y - r > vh) continue;
      g.globalAlpha = 0.16 * Math.min(1, L.power);
      g.drawImage(lightStamp(r, L.warm, 3), x - r, y - r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  },
};

// ---------------------------------------------------------------------------
const Weather = {
  storm: 0, // 0..1 sandstorm intensity
  target: 0,
  wind: 0,
  motes: [],
  init() {
    this.motes = [];
    for (let i = 0; i < 140; i++) this.motes.push({ x: rnd(1), y: rnd(1), s: rnd(0.4, 1), l: rnd(4, 14) });
  },
  update(dt) {
    this.storm = approach(this.storm, this.target, dt * 0.35);
    this.wind = this.storm;
  },
  draw(g, cam, vw, vh, t) {
    if (this.storm <= 0.01) return;
    const s = this.storm;
    g.globalAlpha = 0.28 * s;
    fillR(g, 0, 0, vw, vh, '#c99a5c');
    g.globalAlpha = 1;
    for (const m of this.motes) {
      const sp = 260 + m.s * 280;
      const x = ((m.x * (vw + 60) + t * sp - cam.x * 0.4) % (vw + 60) + vw + 60) % (vw + 60) - 30;
      const y = ((m.y * vh + Math.sin(t * 2 + m.x * 20) * 6 + t * 30 * m.s) % vh + vh) % vh;
      if (Math.random() > s * 1.2) continue;
      g.globalAlpha = 0.35 + m.s * 0.4;
      fillR(g, x, y, m.l * m.s, 1, m.s > 0.7 ? '#f6e0b0' : '#d9b27a');
    }
    g.globalAlpha = 1;
  },
};

// Cached vignette per view size.
const Vignette = {
  c: null,
  key: '',
  draw(g, vw, vh, strength = 1) {
    const key = vw + 'x' + vh;
    if (key !== this.key) {
      this.key = key;
      const pb = new PixBuf(vw, vh);
      const ink = hexToRgb('#0b0604');
      for (let y = 0; y < vh; y++)
        for (let x = 0; x < vw; x++) {
          const dx = (x - vw / 2) / (vw / 2), dy = (y - vh / 2) / (vh / 2);
          const d = Math.sqrt(dx * dx * 0.8 + dy * dy);
          const v = clamp((d - 0.72) * 1.4, 0, 1);
          const q = Math.floor(v * 4 + bayer(x, y)) / 4;
          if (q > 0) pb.set(x, y, packRgb(ink[0], ink[1], ink[2], Math.round(q * 150)));
        }
      this.c = pb.toCanvas();
    }
    g.globalAlpha = strength;
    g.drawImage(this.c, 0, 0);
    g.globalAlpha = 1;
  },
  red(vw, vh) {
    const key = vw + 'x' + vh;
    if (this.redKey !== key) {
      this.redKey = key;
      const pb = new PixBuf(vw, vh);
      for (let y = 0; y < vh; y++)
        for (let x = 0; x < vw; x++) {
          const dx = (x - vw / 2) / (vw / 2), dy = (y - vh / 2) / (vh / 2);
          const v = clamp((Math.sqrt(dx * dx * 0.7 + dy * dy) - 0.62) * 1.6, 0, 1);
          const q = Math.floor(v * 4 + bayer(x, y)) / 4;
          if (q > 0) pb.set(x, y, packRgb(150, 16, 20, Math.round(q * 200)));
        }
      this.redC = pb.toCanvas();
    }
    return this.redC;
  },
};
