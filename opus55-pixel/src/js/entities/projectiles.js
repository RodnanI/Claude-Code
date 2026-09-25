// ---------------------------------------------------------------------------
// Projectiles: qi waves, darts, arrows, needles, shockwaves, palms, blood
// arts. Positions are centers. Parried projectiles fly back at the sender.
// ---------------------------------------------------------------------------
const PROJ = {
  wave: {
    w: 22, h: 44, dmg: 22, life: 52, pierce: true, ghost: true, kb: [3.4, -2], stun: 26, stop: 5, shake: 2,
    update(p) { p.vx *= 1.01; if (p.t % 2 === 0) FX.part({ kind: 'px', x: p.x - p.facing * 6 + rnd(-2, 2), y: p.y + rnd(-14, 14), vx: -p.facing * 0.6, vy: 0, life: 14, cols: ['#fff8d8', '#ffd060', '#c08020'], layer: 1 }); for (const o of G.ents) if (o.proj && o.team !== p.team && Math.abs(o.x - p.x) < 16 && Math.abs(o.y - p.y) < 20) { o.remove = true; FX.star(o.x, o.y, { size: 8 }); } },
    draw(p, ctx, x, y) {
      Light.glow(ctx, x, y, 26, '#ffc850', 0.35);
      crescent(ctx, x - p.facing * 7, y, p.facing, 19, 5, p.t + 1, ['#fff4c8', '#ffd060', '#c88a24', '#8a5a14']);
      crescent(ctx, x, y, p.facing, 23, 8, p.t, ['#ffffff', '#fff4c8', '#ffd060', '#c88a24']);
    },
  },
  dart: {
    w: 6, h: 6, dmg: 8, life: 90, kb: [1.4, -0.6], stun: 16, stop: 3,
    draw(p, ctx, x, y) { const f = (p.t >> 1) & 1; ctx.fillStyle = '#c9d0d3'; if (f) { ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); } else { ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x, y, 1, 1); } ctx.fillStyle = '#34393f'; ctx.fillRect(x, y, 1, 1); },
  },
  knife: {
    w: 8, h: 5, dmg: 7, life: 80, kb: [1.6, -0.6], stun: 16, stop: 3,
    draw(p, ctx, x, y) { ctx.fillStyle = '#f6f9f9'; ctx.fillRect(x - 3 * p.facing, y, 6, 1); ctx.fillStyle = '#5f676f'; ctx.fillRect(x - 5 * p.facing - (p.facing < 0 ? 1 : 0), y, 2, 1); ctx.fillStyle = '#951410'; ctx.fillRect(x - 6 * p.facing, y - 1, 1, 1); },
  },
  arrow: {
    w: 8, h: 4, dmg: 10, life: 140, g: 0.05, kb: [1.8, -0.8], stun: 18, stop: 4,
    draw(p, ctx, x, y) {
      const a = Math.atan2(p.vy, p.vx), dx = Math.cos(a), dy = Math.sin(a);
      for (let i = -5; i <= 4; i++) { ctx.fillStyle = i > 2 ? '#c9d0d3' : '#86602d'; ctx.fillRect(Math.round(x + dx * i), Math.round(y + dy * i), 1, 1); }
      ctx.fillStyle = '#e3d9c7'; ctx.fillRect(Math.round(x - dx * 5 - dy), Math.round(y - dy * 5 + dx), 1, 1); ctx.fillRect(Math.round(x - dx * 5 + dy), Math.round(y - dy * 5 - dx), 1, 1);
    },
  },
  needle: {
    w: 7, h: 3, dmg: 6, life: 100, kb: [1.2, -0.4], stun: 14, stop: 3,
    draw(p, ctx, x, y) { const a = Math.atan2(p.vy, p.vx), dx = Math.cos(a), dy = Math.sin(a); for (let i = -4; i <= 3; i++) { ctx.fillStyle = i > 1 ? '#ffffff' : '#a2aab0'; ctx.fillRect(Math.round(x + dx * i), Math.round(y + dy * i), 1, 1); } },
  },
  shock: {
    w: 16, h: 16, dmg: 12, life: 70, pierce: true, ground: true, kb: [3, -4.5], stun: 24, stop: 6, shake: 2, unblock: false, reflect: false,
    update(p) { p.y = G.map.surfaceBelow(p.x, p.y - 20) - 8; if (G.map.solidPx(p.x + p.facing * 8, p.y - 2)) p.remove = true; if (p.t % 2 === 0) FX.part({ kind: 'smoke', x: p.x + rnd(-4, 4), y: p.y + 6, vx: rnd(-0.3, 0.3), vy: rnd(-1.4, -0.4), size: 2, grow: 0.08, life: 20, cols: p.cols || ['#e8dcc0', '#c8b898', '#9a8a70'], layer: 1 }); },
    draw(p, ctx, x, y) { const h = 14 + Math.sin(p.t * 0.6) * 2; for (let i = -5; i <= 5; i++) { const hh = Math.round(h * (1 - Math.abs(i) / 6)); ctx.fillStyle = Math.abs(i) < 2 ? (p.cols ? p.cols[0] : '#f0e4c8') : (p.cols ? p.cols[1] : '#c8b898'); ctx.fillRect(x + i, y + 8 - hh, 1, hh); } },
  },
  palm: {
    w: 26, h: 30, dmg: 16, life: 110, pierce: true, ghost: true, kb: [4.6, -2.6], stun: 28, stop: 8, shake: 3, reflect: false,
    update(p) { if (p.t % 3 === 0) FX.qi(p.x - p.facing * 10, p.y, 1, p.cols ? p.cols : ['#fff6c0', '#f0c050', '#b8801a']); },
    draw(p, ctx, x, y) { palmShape(ctx, x, y, p.facing, p.big ? 1.6 : 1, p.cols || ['#fff6c0', '#f4cc5a', '#d49a2a', '#8a5a14'], p.t); },
  },
  bloodwave: {
    w: 20, h: 38, dmg: 17, life: 70, pierce: true, ghost: true, kb: [3.6, -2.4], stun: 26, stop: 6, shake: 2,
    update(p) { if (p.t % 2 === 0) FX.part({ kind: 'px', x: p.x - p.facing * 6, y: p.y + rnd(-16, 16), vx: -p.facing * 0.5, vy: 0, life: 16, cols: ['#ff8a5a', '#d4200f', '#6a0808'], layer: 1 }); },
    draw(p, ctx, x, y) { Light.glow(ctx, x, y, 26, '#ff3a1a', 0.35); crescent(ctx, x - p.facing * 7, y, p.facing, 20, 5, p.t + 1, ['#ff8a5a', '#b8140c', '#5a0606', '#2a0404']); crescent(ctx, x, y, p.facing, 23, 8, p.t, ['#ffe0d0', '#ff5a36', '#b8140c', '#5a0606']); },
  },
  spike: {
    w: 18, h: 44, dmg: 14, life: 70, pierce: true, ghost: true, noMove: true, kb: [1, -6], stun: 30, stop: 6, shake: 3, reflect: false, unblock: true,
    update(p) { p.active = p.t >= 36 && p.t < 56; if (p.t === 36) { SFX.play('spike'); FX.kick(3); FX.dust(p.x, p.y + 22, 6); } },
    draw(p, ctx, x, y) {
      const base = y + 22;
      if (p.t < 36) { if ((p.t >> 2) & 1) { ctx.fillStyle = '#ff3a1a'; ctx.fillRect(x - 9, base - 1, 19, 1); ctx.fillStyle = '#8a0f0a'; ctx.fillRect(x - 7, base - 2, 15, 1); } return; }
      const k = p.t < 40 ? (p.t - 36) / 4 : p.t > 56 ? Math.max(0, 1 - (p.t - 56) / 12) : 1;
      for (const [ox, hh] of [[-6, 30], [0, 44], [6, 34], [-2, 22], [3, 26]]) {
        const h = Math.round(hh * k);
        for (let j = 0; j < h; j++) { const w = Math.max(0, Math.round((1 - j / hh) * 3)); ctx.fillStyle = j > h - 3 ? '#ffd0b0' : w > 1 ? '#c02418' : '#ff4a26'; ctx.fillRect(x + ox - w, base - j, w * 2 + 1, 1); }
      }
    },
  },
  blade: {
    w: 8, h: 26, dmg: 12, life: 120, g: 0, ghost: true, kb: [0.6, 2], stun: 20, stop: 5, shake: 1.5, reflect: false,
    update(p) {
      if (p.t < 34) { p.vy = 0; p.hold = true; } else { p.hold = false; p.vy = 7.5; }
      p.active = p.t >= 34;
      const s = G.map.surfaceBelow(p.x, p.y - 30);
      if (p.y + 13 >= s && p.t > 34) { p.remove = true; FX.sparks(p.x, s - 2, -Math.PI / 2, 8, ['#ffd0b0', '#ff4a26', '#8a0f0a']); FX.dust(p.x, s, 4); SFX.play('clink'); }
    },
    draw(p, ctx, x, y, cam) {
      if (p.t < 34) { const s = G.map.surfaceBelow(p.x, p.y) - cam.y; if ((p.t >> 1) & 1) { ctx.fillStyle = 'rgba(255,60,30,0.5)'; ctx.fillRect(x, y, 1, s - y); } }
      ctx.fillStyle = '#8a0f0a'; ctx.fillRect(x - 3, y - 10, 7, 2);
      ctx.fillStyle = '#1f191b'; ctx.fillRect(x, y - 14, 1, 4);
      for (let j = 0; j < 22; j++) { ctx.fillStyle = j > 19 ? '#ffd0b0' : '#c02418'; ctx.fillRect(x - (j < 18 ? 1 : 0), y - 8 + j, j < 18 ? 2 : 1, 1); ctx.fillStyle = '#ff6a45'; ctx.fillRect(x, y - 8 + j, 1, 1); }
    },
  },
};

function crescent(ctx, x, y, dir, R, th, t, cols) {
  for (let j = -R; j <= R; j++) {
    const u = j / R, w = Math.round(th * Math.sqrt(1 - u * u));
    const ox = Math.round(Math.sqrt(1 - u * u) * R * 0.55) * dir;
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = i === 0 ? cols[0] : i < w * 0.4 ? cols[1] : i < w * 0.75 ? cols[2] : cols[3];
      if (i >= w * 0.75 && ((x + y + j + t) & 1)) continue;
      ctx.fillRect(x + ox - i * dir, y + j, 1, 1);
    }
  }
}
function palmShape(ctx, x, y, dir, s, cols, t) {
  const px = (ox, oy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + (dir > 0 ? ox : -ox - w)), Math.round(y + oy), w, h); };
  const S = n => Math.round(n * s);
  const flick = (t >> 1) & 1;
  px(S(-8), S(-9), S(12), S(18), cols[2]);
  px(S(-7), S(-8), S(10), S(16), cols[1]);
  for (let f = 0; f < 4; f++) { const fy = S(-9 + f * 4.5); px(S(4), fy, S(8 - Math.abs(f - 1.5)), S(3), cols[1]); px(S(4), fy, S(8 - Math.abs(f - 1.5)), 1, cols[0]); }
  px(S(-2), S(-14), S(5), S(6), cols[1]);
  px(S(-12), S(-4), S(5), S(8), flick ? cols[3] : cols[2]);
  px(S(-5), S(-5), S(6), S(9), cols[0]);
}

function spawnProj(kind, owner, ox, oy, vx, vy) {
  const p = new Proj(kind, owner.x + ox * owner.facing, owner.y + oy, vx * owner.facing, vy, owner);
  G.ents.push(p);
  return p;
}

class Proj extends Ent {
  constructor(kind, x, y, vx, vy, owner) {
    super(x, y);
    const D = PROJ[kind];
    this.kind = kind; this.D = D; this.vx = vx; this.vy = vy; this.owner = owner; this.team = owner.team;
    this.facing = Math.sign(vx) || owner.facing; this.w = D.w; this.h = D.h; this.dmg = D.dmg; this.life = D.life; this.t = 0;
    this.hitSet = new Set(); this.dmgMul = 1; this.proj = true; this.active = true; this.z = 5;
    this.hitDef = { dmg: D.dmg, kb: D.kb, stun: D.stun, stop: D.stop, shake: D.shake || 1, unblock: D.unblock, knock: D.knock, fx: D.fx };
  }
  box() { return [this.x - this.w / 2, this.y - this.h / 2, this.w, this.h]; }
  update() {
    this.t++;
    if (!this.D.noMove) { this.vy += this.D.g || 0; this.x += this.vx; this.y += this.vy; }
    if (this.D.update) this.D.update(this);
    if (this.t > this.life) this.remove = true;
    if (!this.D.ghost && !this.D.ground && G.map.solidPx(this.x, this.y)) { this.remove = true; FX.sparks(this.x, this.y, this.vx > 0 ? Math.PI : 0, 4); SFX.play('clink'); return; }
    if (!this.active) return;
    this.hitDef.dmg = this.dmg;
    const b = this.box();
    for (const t of G.ents) {
      if (t.dead || !t.hittable || t.team === this.team || t.team === 0 || t.proj || this.hitSet.has(t.id)) continue;
      if (t.team === 3 && this.team !== 1) continue;
      if (!overlap(b, t.box())) continue;
      this.hitSet.add(t.id);
      const r = Combat.resolve(this, t, this.hitDef, Math.sign(this.vx) || this.facing);
      if (r !== 'parry' && !this.D.pierce) { this.remove = true; break; }
    }
  }
  draw(ctx, cam) { this.D.draw(this, ctx, Math.round(this.x - cam.x), Math.round(this.y - cam.y), cam); }
}
