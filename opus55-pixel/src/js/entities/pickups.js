// ---------------------------------------------------------------------------
// Pickups (qi motes, steamed buns, ginseng) and breakables (jars, training
// dummies, crates) that shatter into shards and drop rewards.
// ---------------------------------------------------------------------------
class Pickup extends Body {
  constructor(kind, x, y) {
    super(x, y);
    this.kind = kind; this.w = 8; this.h = 8; this.t = 0; this.team = 0;
    this.vx = rnd(-1.2, 1.2); this.vy = rnd(-3.6, -2); this.grav = kind === 'qi' ? 0.12 : 0.3; this.z = 4;
  }
  update() {
    this.t++;
    const p = G.player;
    if (p && !p.dead) {
      const dx = p.x - this.x, dy = p.y - 20 - this.y, d = Math.hypot(dx, dy);
      const mag = this.kind === 'qi' ? 70 : 26;
      if (d < mag && this.t > 20) { this.noGrav = true; this.vx += (dx / d) * 0.6; this.vy += (dy / d) * 0.6; this.vx *= 0.9; this.vy *= 0.9; this.x += this.vx; this.y += this.vy; }
      else { this.noGrav = false; this.vx *= this.grounded ? 0.8 : 0.98; this.physics(); }
      if (d < 12 && this.t > 12) this.collect(p);
    }
    if (this.t > 900) this.remove = true;
  }
  collect(p) {
    this.remove = true;
    if (this.kind === 'qi') { p.qi = Math.min(p.qiMax, p.qi + 4); SFX.play('qiPick'); FX.qi(p.x, p.y - 24, 3); }
    else if (this.kind === 'bun') { p.hp = Math.min(p.maxHp, p.hp + 20); SFX.play('heal'); FX.text(p.x, p.y - 56, '+20', '#9fe07a'); }
    else if (this.kind === 'ginseng') { p.hp = p.maxHp; p.qi = Math.min(p.qiMax, p.qi + 30); SFX.play('heal'); FX.text(p.x, p.y - 56, 'RESTORED', '#9fe07a'); }
  }
  draw(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y - 4 + Math.sin(this.t * 0.1) * 1.5);
    if (this.kind === 'qi') {
      const f = (this.t >> 2) % 4;
      ctx.fillStyle = '#fffbe0'; ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = '#ffd060'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = '#c08020'; if (f === 0) ctx.fillRect(x - 2, y - 2, 1, 1); if (f === 1) ctx.fillRect(x + 2, y - 2, 1, 1); if (f === 2) ctx.fillRect(x + 2, y + 2, 1, 1); if (f === 3) ctx.fillRect(x - 2, y + 2, 1, 1);
    } else if (this.kind === 'bun') {
      ctx.drawImage(cachedArt('bun', genBun), x - 5, y - 4);
    } else {
      ctx.drawImage(cachedArt('ginseng', genGinseng), x - 5, y - 8);
    }
  }
}
function genBun() {
  const P = new Paint(10, 8);
  P.ellipse(5, 5, 4.6, 3.6, (x, y, d, dx, dy) => (dy < -0.4 ? '#fffaf0' : dy < 0.3 ? '#f2e6cc' : '#d8c4a0'));
  P.px(4, 2, '#c8a878'); P.px(5, 2, '#c8a878'); P.px(5, 3, '#b89868'); P.px(3, 3, '#d8c4a0');
  P.outline('#5a4430');
  return P.done();
}
function genGinseng() {
  const P = new Paint(10, 12);
  P.thick(5, 3, 5, 9, 3, '#e8c890'); P.thick(5, 8, 2, 11, 1, '#d8b070'); P.thick(5, 8, 8, 11, 1, '#d8b070');
  P.px(5, 1, '#6a9a3a'); P.px(4, 0, '#8ab04a'); P.px(6, 0, '#8ab04a'); P.px(5, 2, '#c02418');
  P.outline('#4a3018');
  return P.done();
}

const BREAKABLE = {
  jar: { hp: 1, w: 12, h: 16, art: genJar, shards: ['#5a3a24', '#7a5236', '#3a2414', '#c23a22'] },
  dummy: { hp: 3, w: 12, h: 38, art: genDummy, shards: ['#86602d', '#5f3f1d', '#aa8143'] },
  crate: { hp: 2, w: 16, h: 16, art: genCrate, shards: ['#86602d', '#5f3f1d', '#3c2511'] },
};
class Breakable extends Body {
  constructor(kind, x, y, drop) {
    super(x, y);
    const D = BREAKABLE[kind];
    this.kind = kind; this.D = D; this.hp = D.hp; this.w = D.w; this.h = D.h; this.team = 3; this.hittable = true;
    this.drop = drop; this.wob = 0; this.z = -1; this.img = cachedArt('br_' + kind, D.art);
  }
  onStrike(att, h, dir) {
    this.hp--; this.wob = 10;
    FX.sparks(this.x, this.y - this.h / 2, dir > 0 ? 0 : Math.PI, 4, this.D.shards);
    SFX.play(this.kind === 'jar' ? 'crack' : 'wood');
    G.hitstop = Math.max(G.hitstop, 2);
    if (this.hp <= 0) this.shatter(dir);
    if (att === G.player) { att.qi = Math.min(att.qiMax, att.qi + 1); if (G.onBreak) G.onBreak(this); }
    return 'hit';
  }
  shatter(dir) {
    this.remove = true; this.dead = true;
    for (let i = 0; i < 14; i++) FX.part({ kind: 'px', x: this.x + rnd(-5, 5), y: this.y - rnd(2, this.h), vx: rnd(-1.5, 1.5) + dir, vy: rnd(-4, -1), g: 0.25, drag: 0.98, size: rndi(1, 3), life: rndi(30, 60), cols: [pick(this.D.shards)], layer: 1, floor: true });
    SFX.play(this.kind === 'jar' ? 'shatter' : 'woodBreak');
    const d = this.drop || (Math.random() < 0.35 ? 'bun' : 'qi');
    if (d !== 'none') {
      const n = d === 'qi' ? 3 : 1;
      for (let i = 0; i < n; i++) G.ents.push(new Pickup(d, this.x, this.y - 10));
    }
  }
  update() { if (this.wob > 0) this.wob--; this.physics(); }
  draw(ctx, cam) {
    const o = this.wob ? Math.round(Math.sin(this.wob * 1.7) * 1.5) : 0;
    ctx.drawImage(this.img, Math.round(this.x - cam.x - this.img.width / 2) + o, Math.round(this.y - cam.y - this.img.height));
  }
}
function genJar() {
  const P = new Paint(14, 18);
  for (let y = 0; y < 18; y++) {
    const t = y / 17, hw = y < 3 ? 3 : 3 + Math.sin(Math.min(1, (y - 2) / 13) * Math.PI) * 3.6 + (y > 14 ? -0.6 : 0);
    for (let x = Math.round(7 - hw); x <= Math.round(7 + hw); x++) {
      const u = (x - 7) / hw;
      let c = y < 2 ? '#3a2414' : ['#2e1c10', '#4a2e1a', '#6a4428', '#8a5c36', '#a8764a'][clamp(Math.round(2.4 - u * 1.6 + (y < 7 ? 0.8 : 0) - t * 0.6), 0, 4)];
      if (y > 7 && y < 12 && Math.abs(x - 7) < 3) c = y === 8 || y === 11 ? '#8a1c12' : '#c23a22';
      if (y > 8 && y < 11 && x === 7) c = '#1a0c08';
      P.px(x, y, c);
    }
  }
  P.outline('#140a06');
  return P.done();
}
function genDummy() {
  const P = new Paint(18, 40);
  for (let y = 4; y < 40; y++) for (let x = 6; x < 12; x++) P.px(x, y, S_WOOD[x === 6 ? 4 : x === 11 ? 1 : 3 - ((y * 3 + x) % 11 === 0 ? 1 : 0)]);
  for (let y = 0; y < 6; y++) for (let x = 7; x < 11; x++) P.px(x, y, S_WOOD[y === 0 ? 5 : 3]);
  for (const [y, dx] of [[12, 1], [16, -1], [26, 1]]) for (let i = 0; i < 6; i++) { P.px(dx > 0 ? 12 + i : 5 - i, y + Math.floor(i / 3), S_WOOD[i % 2 ? 2 : 4]); P.px(dx > 0 ? 12 + i : 5 - i, y + 1 + Math.floor(i / 3), S_WOOD[1]); }
  for (let x = 5; x < 13; x++) { P.px(x, 20, '#9a8458'); P.px(x, 21, '#c4ad78'); }
  P.outline('#140c06');
  return P.done();
}
function genCrate() {
  const P = new Paint(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const e = x === 0 || y === 0 || x === 15 || y === 15, diag = Math.abs(x - y) < 1.2 || Math.abs(15 - x - y) < 1.2;
    P.px(x, y, e ? S_WOOD[1] : diag ? S_WOOD[4] : y % 5 === 0 ? S_WOOD[2] : S_WOOD[3]);
  }
  return P.done();
}
