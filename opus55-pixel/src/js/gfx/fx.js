// ---------------------------------------------------------------------------
// Effects: particles, sword arcs, thrust streaks, impact stars, rings,
// afterimages, floating text, screen flash and shake. Two layers: 0 behind
// fighters, 1 in front.
// ---------------------------------------------------------------------------
const FX = {
  list: [],
  shake: 0,
  flashT: 0, flashL: 1, flashC: '#fff',
  clear() { this.list.length = 0; this.shake = 0; this.flashT = 0; },
  add(e) { this.list.push(e); return e; },
  update() {
    let j = 0;
    for (let i = 0; i < this.list.length; i++) { const e = this.list[i]; if (e.update() !== false) this.list[j++] = e; }
    this.list.length = j;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.35);
    if (this.flashT > 0) this.flashT--;
  },
  draw(ctx, cam, layer) { for (const e of this.list) if ((e.layer || 0) === layer) e.draw(ctx, cam); },
  drawFlash(ctx) {
    if (this.flashT <= 0) return;
    ctx.save();
    ctx.globalAlpha = (this.flashT / this.flashL) * 0.85;
    ctx.fillStyle = this.flashC;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  },
  flash(c = '#fff', l = 8) { this.flashC = c; this.flashT = this.flashL = l; },
  kick(n) { this.shake = Math.max(this.shake, n); },

  // ---- emitters ----
  part(o) { return this.add(new Part(o)); },
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + rnd(-o.spread, o.spread) : rnd(TAU), s = rnd(o.s0 || 0.5, o.s1 || 2.5);
      this.part({ ...o, x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rndi(o.l0 || 12, o.l1 || 24) });
    }
  },
  dust(x, y, n = 6, dir = 0) {
    this.burst(x, y - 1, n, { kind: 'smoke', dir: dir ? (dir > 0 ? 0 : Math.PI) : -Math.PI / 2, spread: dir ? 0.5 : 1.4, s0: 0.3, s1: dir ? 1.8 : 0.9, drag: 0.9, g: -0.02, size: 2, grow: 0.12, cols: ['#e8dcc0', '#c8b898', '#9a8a70'], l0: 14, l1: 26, layer: 0, jx: 3 });
  },
  sparks(x, y, dir, n = 8, cols = ['#ffffff', '#fff0a0', '#ffb040', '#c05020']) {
    this.burst(x, y, n, { kind: 'spark', dir, spread: 1.1, s0: 2, s1: 5.5, drag: 0.86, g: 0.12, cols, l0: 8, l1: 18, layer: 1 });
  },
  blood(x, y, dir, n = 8) {
    this.burst(x, y, n, { kind: 'px', dir, spread: 0.8, s0: 1, s1: 3.6, drag: 0.94, g: 0.22, size: 2, cols: ['#c42418', '#951410', '#630b0c'], l0: 16, l1: 34, layer: 1, floor: true });
  },
  ink(x, y, n = 14) {
    this.burst(x, y, n, { kind: 'smoke', s0: 0.3, s1: 1.6, drag: 0.9, g: -0.03, size: 2, grow: 0.2, cols: ['#1a1414', '#2c2322', '#4a3c38', '#6a5a52'], l0: 20, l1: 44, layer: 1, jx: 6, jy: 10 });
  },
  qi(x, y, n = 6, cols = ['#fffbe0', '#ffe68a', '#d49a18']) {
    this.burst(x, y, n, { kind: 'px', s0: 0.2, s1: 1.2, drag: 0.92, g: -0.05, size: 1, cols, l0: 16, l1: 30, layer: 1, jx: 4, jy: 6 });
  },
  text(x, y, s, c = '#fff', o = {}) { return this.add(new FloatText(x, y, s, c, o)); },
  slash(owner, o) { return this.add(new Slash(owner, o)); },
  star(x, y, o = {}) { return this.add(new ImpactStar(x, y, o)); },
  ring(x, y, o = {}) { return this.add(new Ring(x, y, o)); },
  streak(x, y, dir, len, o = {}) { return this.add(new Streak(x, y, dir, len, o)); },
  ghost(ent, color, life = 14) {
    if (!ent.frame) return;
    return this.add(new Ghost(ent.frame, ent.x, ent.y, ent.facing, color, life));
  },
};

class Part {
  constructor(o) {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.g = 0; this.drag = 1; this.life = 20; this.t = 0;
    this.size = 1; this.grow = 0; this.cols = ['#fff']; this.kind = 'px'; this.layer = 1; this.rot = rnd(TAU); this.spin = 0;
    Object.assign(this, o);
  }
  update() {
    this.t++;
    this.vx *= this.drag; this.vy = this.vy * this.drag + this.g;
    this.x += this.vx; this.y += this.vy; this.rot += this.spin; this.size += this.grow;
    if (this.sway) this.x += Math.sin(this.t * this.sway + this.rot) * 0.35;
    if (this.floor && G.map) {
      const fy = G.map.surfaceBelow(this.x, this.y - 2);
      if (this.y >= fy) { this.y = fy - 1; this.vy *= -0.2; this.vx *= 0.5; if (Math.abs(this.vy) < 0.3) { this.vy = 0; this.g = 0; } }
    }
    return this.t < this.life;
  }
  draw(ctx, cam) {
    const k = this.t / this.life;
    const c = this.cols[Math.min(this.cols.length - 1, (k * this.cols.length) | 0)];
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = c;
    switch (this.kind) {
      case 'px': { const s = Math.max(1, Math.round(this.size * (1 - k * 0.5))); ctx.fillRect(x, y, s, s); break; }
      case 'spark': {
        const L = Math.min(5, Math.hypot(this.vx, this.vy) * 0.9);
        const n = Math.max(1, Math.round(L));
        for (let i = 0; i < n; i++) ctx.fillRect(Math.round(x - (this.vx / (Math.hypot(this.vx, this.vy) || 1)) * i), Math.round(y - (this.vy / (Math.hypot(this.vx, this.vy) || 1)) * i), 1, 1);
        break;
      }
      case 'smoke': {
        const r = this.size;
        if (k > 0.55 && ((x + y + this.t) & 1)) break;
        discPx(ctx, x, y, r, c);
        break;
      }
      case 'ember': { if (Math.sin(this.t * 0.6 + this.rot * 5) > -0.2) ctx.fillRect(x, y, 1, 1); break; }
      case 'petal': {
        const ph = Math.floor(((this.rot % TAU) + TAU) % TAU / (TAU / 4));
        if (ph === 0) ctx.fillRect(x, y, 2, 1); else if (ph === 1) { ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); } else if (ph === 2) ctx.fillRect(x, y, 1, 2); else { ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
        if (this.c2) { ctx.fillStyle = this.c2; ctx.fillRect(x, y, 1, 1); }
        break;
      }
      case 'leaf': {
        const a = this.rot, dx = Math.cos(a), dy = Math.sin(a) * 0.6;
        for (let i = -2; i <= 2; i++) ctx.fillRect(Math.round(x + dx * i), Math.round(y + dy * i), 1, 1);
        if (this.c2) { ctx.fillStyle = this.c2; ctx.fillRect(Math.round(x + dx * 2), Math.round(y + dy * 2), 1, 1); }
        break;
      }
      case 'feather': {
        // tiny swallow silhouette
        const f = (this.t >> 2) & 1;
        ctx.fillRect(x, y, 1, 1);
        if (f) { ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x + 1, y - 1, 2, 1); } else { ctx.fillRect(x - 2, y + 1, 2, 1); ctx.fillRect(x + 1, y + 1, 2, 1); }
        ctx.fillRect(x - (this.vx > 0 ? 1 : -1), y, 1, 1);
        break;
      }
      case 'glint': {
        const s = Math.round(3 * Math.sin(k * Math.PI));
        ctx.fillRect(x - s, y, s * 2 + 1, 1); ctx.fillRect(x, y - s, 1, s * 2 + 1);
        break;
      }
    }
  }
}

// Crescent sword arc anchored to its owner. Angles use the rig convention.
class Slash {
  constructor(owner, o) {
    this.o = owner; this.fac = owner.facing;
    this.cx = o.cx || 0; this.cy = o.cy !== undefined ? o.cy : -30;
    this.r = o.r || 26; this.a0 = o.a0; this.a1 = o.a1; this.th = o.th || 7;
    this.life = o.life || 11; this.sweep = o.sweep || 3; this.t = 0;
    this.cols = o.cols || SLASH_COLS.hero;
    this.follow = o.follow !== false; this.layer = 1;
    this.flat = o.flat || 1;
    this.x = owner.x + this.cx * this.fac; this.y = owner.y + this.cy;
  }
  update() {
    this.t++;
    if (this.follow && this.o) { this.x = this.o.x + this.cx * this.fac; this.y = this.o.y + this.cy; }
    return this.t < this.life;
  }
  draw(ctx, cam) {
    const head = Math.min(1, (this.t + 1) / this.sweep);
    const tail = this.t < this.sweep ? 0 : Math.pow((this.t - this.sweep) / (this.life - this.sweep), 0.8);
    if (tail >= head) return;
    const R = this.r, span = this.a1 - this.a0, dir = Math.sign(span) || 1, aspan = Math.abs(span);
    const cx = this.x - cam.x, cy = this.y - cam.y;
    const x0 = Math.floor(cx - R - 1), x1 = Math.ceil(cx + R + 1), y0 = Math.floor(cy - R * this.flat - 1), y1 = Math.ceil(cy + R * this.flat + 1);
    const [c0, c1, c2, c3] = this.cols;
    const fade = this.t / this.life;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) * this.fac, dy = (y + 0.5 - cy) / this.flat;
      const r = Math.hypot(dx, dy);
      if (r > R || r < R - this.th - 1) continue;
      let ang = Math.atan2(dx, dy) / DEG;
      let rel = dir > 0 ? ang - this.a0 : this.a0 - ang;
      rel = ((rel % 360) + 360) % 360;
      if (rel > aspan) continue;
      const p = rel / aspan;
      if (p < tail || p > head) continue;
      const q = (p - tail) / Math.max(0.001, head - tail);
      const thp = this.th * Math.pow(Math.sin(Math.min(1, q * 1.08) * Math.PI * 0.5 + 0.0001), 0.7) * (1 - fade * 0.6);
      const depth = R - r;
      if (depth > thp) continue;
      let c;
      if (depth < 1.2) c = c0;
      else if (depth < thp * 0.45) c = c1;
      else if (depth < thp * 0.8) c = c2;
      else { if (bayer(x, y) > 0.5) continue; c = c3 || c2; }
      if (fade > 0.6 && bayer(x, y) < (fade - 0.6) * 2.4) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
const SLASH_COLS = {
  hero: ['#ffffff', '#fff4c8', '#e9c96a', '#b8862a'],
  heroQi: ['#ffffff', '#fff8d8', '#ffd060', '#e08a20'],
  enemy: ['#fff0e0', '#f0b890', '#c0704a', '#803020'],
  demon: ['#ffe0d0', '#ff5a36', '#b8140c', '#5a0606'],
  jade: ['#f4fff8', '#b8f0d0', '#4fb48e', '#1d6250'],
  bone: ['#ffffff', '#e0dccf', '#a8a090', '#605850'],
};

class Streak {
  constructor(x, y, dir, len, o) {
    this.x = x; this.y = y; this.dir = dir; this.len = len; this.t = 0; this.life = o.life || 9; this.layer = 1;
    this.cols = o.cols || SLASH_COLS.hero; this.w = o.w || 3;
  }
  update() { this.t++; return this.t < this.life; }
  draw(ctx, cam) {
    const k = this.t / this.life, x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const L = Math.round(this.len * (0.6 + k * 0.4)), tail = Math.round(this.len * k);
    for (let i = tail; i < L; i++) {
      const u = i / this.len, w = Math.max(0, Math.round(this.w * (1 - u) * (1 - k)));
      const px = x + i * this.dir;
      ctx.fillStyle = this.cols[1]; ctx.fillRect(px, y - w, 1, w * 2 + 1);
      ctx.fillStyle = this.cols[0]; ctx.fillRect(px, y, 1, 1);
    }
  }
}

class ImpactStar {
  constructor(x, y, o) { this.x = x; this.y = y; this.t = 0; this.life = o.life || 8; this.s = o.size || 10; this.layer = 1; this.cols = o.cols || ['#ffffff', '#fff0a0', '#ff9a30']; this.rot = rnd(TAU); }
  update() { this.t++; return this.t < this.life; }
  draw(ctx, cam) {
    const k = this.t / this.life, x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const L = this.s * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k * 0.5);
    for (let i = 0; i < 8; i++) {
      const a = this.rot + (i / 8) * TAU, ll = i % 2 ? L * 0.55 : L;
      ctx.fillStyle = i % 2 ? this.cols[1] : this.cols[0];
      for (let r = 1 + k * L * 0.6; r < ll; r++) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
    if (k < 0.5) discPx(ctx, x, y, 3 * (1 - k * 2), this.cols[0]);
  }
}

class Ring {
  constructor(x, y, o) { this.x = x; this.y = y; this.t = 0; this.life = o.life || 14; this.r0 = o.r0 || 2; this.r1 = o.r1 || 30; this.c = o.c || '#fff'; this.flat = o.flat || 1; this.layer = o.layer !== undefined ? o.layer : 1; this.th = o.th || 1; }
  update() { this.t++; return this.t < this.life; }
  draw(ctx, cam) {
    const k = Ease.out(this.t / this.life), r = lerp(this.r0, this.r1, k);
    const x = this.x - cam.x, y = this.y - cam.y;
    ctx.fillStyle = this.c;
    const n = Math.ceil(r * 6);
    for (let i = 0; i < n; i++) {
      if (k > 0.6 && (i & 1)) continue;
      const a = (i / n) * TAU;
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * this.flat), this.th, this.th);
    }
  }
}

class Ghost {
  constructor(fr, x, y, facing, color, life) { this.fr = fr; this.x = x; this.y = y; this.f = facing; this.c = color; this.t = 0; this.life = life; this.layer = 0; }
  update() { this.t++; return this.t < this.life; }
  draw(ctx, cam) {
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - this.t / this.life);
    blitFrame(ctx, this.fr, this.x - cam.x, this.y - cam.y, this.f, frameTint(this.fr, this.c));
    ctx.restore();
  }
}

class FloatText {
  constructor(x, y, s, c, o) { this.x = x; this.y = y; this.s = String(s); this.c = c; this.t = 0; this.life = o.life || 40; this.layer = 1; this.vy = o.vy !== undefined ? o.vy : -0.6; this.scale = o.scale || 1; }
  update() { this.t++; this.y += this.vy; this.vy *= 0.93; return this.t < this.life; }
  draw(ctx, cam) {
    if (this.t > this.life - 10 && (this.t & 1)) return;
    Font.draw(ctx, this.s, this.x - cam.x, this.y - cam.y, this.c, { align: 'center', outline: '#140c0a', scale: this.scale });
  }
}
