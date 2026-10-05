// SQUEAKBORNE :: enemies
// Data-driven creatures with shared AI archetypes, status effects, billiard launches and elites.

const hpScale = () => [1, 2.3, 4.2, 6.8][Run.biome()] * SPICE[Run.spice].hp;
const dmgScale = (base) => base * [1, 1.55, 2.2, 3.0][Run ? Run.biome() : 0] * (Run ? SPICE[Run.spice].dmg : 1);

const ENEMY = {
  roach: { name: 'Cockroach', hp: 24, dmg: 9, w: 14, h: 8, art: 'roach', ai: 'charger', speed: 0.7, chase: 1.5, sight: 170, range: 90, wind: 26, dashSp: 4.6, dashT: 20, cd: 70, gold: [1, 4], crumbs: [1, 2], weight: 0.8,
    aggro: ['skitter skitter', 'FRESH MEAT', 'hehehe', 'i have 4000 siblings', 'you look crunchy'], die: ['tell my 4000 kids', 'i will be back. we always are', 'skrrrk', 'worth it'] },
  slime: { name: 'Moldy Cheese', hp: 30, dmg: 10, w: 12, h: 10, art: 'slime', ai: 'hopper', hop: [1.8, -4.6], hopCd: [45, 80], sight: 150, gold: [1, 4], crumbs: [1, 2], weight: 1, split: true,
    aggro: ['blorp', 'i am aged to perfection', 'BLORP', 'smell me'], die: ['i was brie-lliant', 'splorch', 'gouda-bye'] },
  minislime: { name: 'Mini Cheese', hp: 9, dmg: 6, w: 8, h: 7, art: 'slime', ai: 'hopper', hop: [2.2, -3.6], hopCd: [30, 55], sight: 150, gold: [0, 1], crumbs: [0, 1], weight: 0.5, scale: 0.6, die: ['blip'] },
  spider: { name: 'Spider', hp: 22, dmg: 8, w: 12, h: 9, art: 'spider', ai: 'spider', speed: 0.9, chase: 1.6, sight: 170, range: 140, cd: 110, gold: [1, 4], crumbs: [1, 2], weight: 0.7,
    aggro: ['hello lunch', 'eight legs. zero chill.', 'come into my parlor'], die: ['my web... my beautiful web', 'curled up. classic.'] },
  rat: { name: 'Rat Thug', hp: 60, dmg: 15, w: 12, h: 18, art: 'rat', ai: 'brute', speed: 0.5, chase: 1.15, sight: 150, range: 26, wind: 34, atkT: 10, cd: 80, box: [26, 24], weight: 1.6, gold: [3, 7], crumbs: [2, 3],
    aggro: ['you lost, pipsqueak?', 'this is rat turf', 'boss said no mice', 'oi'], die: ['tell the boss...', 'ow my everything', 'i just wanted cheese'] },
  fly: { name: 'Fly', hp: 14, dmg: 7, w: 8, h: 6, art: 'fly', ai: 'flyer', speed: 1.3, sight: 170, range: 100, wind: 22, dashSp: 4.2, dashT: 18, cd: 80, flying: true, weight: 0.5, gold: [0, 2], crumbs: [1, 1],
    aggro: ['bzz', 'BZZZZT', 'i only live 28 days. let me have this.'], die: ['bz.', 'day 28...'] },
  dust: { name: 'Dust Bunny', hp: 32, dmg: 11, w: 12, h: 10, art: 'dust', ai: 'hopper', hop: [2.4, -5.2], hopCd: [32, 58], sight: 160, gold: [1, 4], crumbs: [1, 2], weight: 0.7, cloud: true,
    aggro: ['achoo', 'i am made of skin flakes', 'boing boing'], die: ['poof', 'achOO'] },
  soldier: { name: 'Toy Soldier', hp: 42, dmg: 11, w: 10, h: 20, art: 'soldier', ai: 'shooter', speed: 0.55, sight: 230, range: 200, keep: 90, wind: 32, cd: 95, shot: 'corke', shotSp: 4, gold: [2, 5], crumbs: [1, 2], weight: 1,
    aggro: ['HALT', 'for king and toy box', 'hut hut hut', 'target acquired'], die: ['tell my batteries i loved them', 'medic', 'wind me up again'] },
  moth: { name: 'Moth', hp: 24, dmg: 10, w: 12, h: 10, art: 'moth', ai: 'flyer', speed: 1, sight: 180, range: 46, wind: 30, cd: 100, flying: true, burst: true, weight: 0.6, gold: [1, 3], crumbs: [1, 2],
    aggro: ['LAMP?', 'is that a lamp', 'ooh shiny'], die: ['into the light', 'lamp...'] },
  monkey: { name: 'Cymbal Monkey', hp: 56, dmg: 14, w: 14, h: 18, art: 'monkey', ai: 'brute', speed: 0.45, chase: 0.9, sight: 160, range: 40, wind: 40, atkT: 6, cd: 110, clap: true, weight: 1.4, gold: [3, 6], crumbs: [2, 3],
    aggro: ['CLANG CLANG', 'hehehehe', 'it is showtime'], die: ['clang...', 'my batteries'] },
  worm: { name: 'Bookworm', hp: 36, dmg: 12, w: 10, h: 16, art: 'worm', ai: 'burrower', speed: 1.1, sight: 170, range: 22, cd: 80, weight: 1, gold: [2, 5], crumbs: [1, 3],
    aggro: ['shh. library.', 'have you read this', 'actually...'], die: ['overdue...', 'the end'] },
  chef: { name: 'Chef Roach', hp: 50, dmg: 13, w: 10, h: 18, art: 'chef', ai: 'shooter', speed: 0.6, sight: 220, range: 170, keep: 70, wind: 28, cd: 100, shot: 'cleaver', arc: true, gold: [3, 6], crumbs: [2, 3], weight: 1,
    aggro: ['ZE RAT IN MY KITCHEN', 'sacre bleu', 'you are ze special today'], die: ['not ze souffle', 'mon dieu', 'too much salt'] },
  meatball: { name: 'Meatball', hp: 60, dmg: 15, w: 14, h: 14, art: 'meatball', ai: 'roller', speed: 0.12, max: 3.4, sight: 180, gold: [3, 6], crumbs: [2, 3], weight: 1.3,
    aggro: ['ROLL OUT', 'mamma mia', 'i am 40% oregano'], die: ['spaghett...', 'saucy end'] },
  wasp: { name: 'Wasp', hp: 30, dmg: 13, w: 12, h: 10, art: 'wasp', ai: 'flyer', speed: 1.7, sight: 190, range: 110, wind: 18, dashSp: 5.4, dashT: 16, cd: 70, flying: true, weight: 0.6, gold: [2, 4], crumbs: [1, 2],
    aggro: ['STING STING STING', 'you looked at me', 'violence'], die: ['worth it', 'bzzk'] },
  knight: { name: 'Fork Knight', hp: 90, dmg: 17, w: 12, h: 20, art: 'knight', ai: 'brute', speed: 0.5, chase: 1, sight: 170, range: 44, wind: 30, atkT: 8, cd: 85, shield: true, lungeK: 4, box: [44, 12], weight: 2, gold: [4, 8], crumbs: [2, 4],
    aggro: ['en garde', 'i was forged for this', 'utensils, assemble'], die: ['bent...', 'into the drawer...'] },
  pepper: { name: 'Angry Pepper', hp: 26, dmg: 22, w: 8, h: 16, art: 'pepper', ai: 'exploder', hop: [2, -4.6], hopCd: [30, 50], sight: 170, gold: [1, 4], crumbs: [1, 2], weight: 0.8,
    aggro: ['SPICY', 'scoville time', 'i am VERY upset'], die: ['too hot to handle'] },
  kitten: { name: 'Kitten', hp: 70, dmg: 18, w: 16, h: 12, art: 'kitten', ai: 'pouncer', speed: 0.8, chase: 1.9, sight: 200, range: 110, wind: 36, cd: 70, gold: [4, 8], crumbs: [2, 4], weight: 1,
    aggro: ['mrrp?', 'MEW', 'play with me', 'i will knock you off a table'], die: ['mrrrow...', 'i am telling mom'] },
  yarn: { name: 'Yarn Ball', hp: 50, dmg: 16, w: 12, h: 12, art: 'yarn', ai: 'roller', speed: 0.15, max: 3.8, sight: 200, gold: [3, 6], crumbs: [2, 3], weight: 1,
    aggro: ['roll roll roll'], die: ['unraveled'] },
  wisp: { name: 'Catnip Wisp', hp: 40, dmg: 13, w: 12, h: 14, art: 'wisp', ai: 'flyshooter', speed: 0.8, sight: 220, range: 160, keep: 100, wind: 30, cd: 110, flying: true, weight: 0.6, gold: [2, 5], crumbs: [2, 3],
    aggro: ['so... groovy', 'whoaaa', 'smell the vibes'], die: ['far out...'] },
  dummy: { name: 'Training Dummy', hp: 1e9, dmg: 0, w: 12, h: 22, art: 'dummy', ai: 'dummy', weight: 99 },
};
const ELITE_PRE = ['Unionized', 'Swole', 'Furious', 'Certified', 'Feral', 'Tenured', 'Extra Large', 'Undercover'];

function makeEnemy(type, x, y, elite) { return new Enemy(type, x, y, elite); }

class Enemy extends Ent {
  constructor(type, x, y, elite) {
    const d = ENEMY[type];
    const sc = elite ? 1.25 : 1;
    super(x - (d.w * sc) / 2, y - d.h * sc, round(d.w * sc), round(d.h * sc));
    this.d = d; this.type = type; this.elite = !!elite; this.sc = (d.scale || 1) * sc;
    const hs = type === 'dummy' ? 1 : hpScale();
    this.maxHp = this.hp = round(d.hp * hs * (elite ? 3.2 : 1));
    this.dmg = round(dmgScale(d.dmg) * (elite ? 1.3 : 1));
    this.state = 'patrol'; this.st = 0; this.cd = rndi(30, 80);
    this.face = chance(0.5) ? 1 : -1;
    this.status = {}; this.flash = 0; this.aggro = false; this.lost = 0;
    this.flying = !!d.flying; this.noPlat = this.flying;
    this.hop = 0; this.sq = 1; this.rot = 0; this.home = { x, y };
    this.anim = rnd(100); this.hitT = -999; this.dps = []; this.spawnFx = 0;
    if (elite) this.name = pick(ELITE_PRE) + ' ' + d.name;
    if (d.ai === 'spider') this.hangSetup();
    if (d.ai === 'burrower') { this.state = 'hidden'; this.intangible = true; }
  }
  hangSetup() {
    let ty = floor(this.y / TS);
    for (let i = 0; i < 10 && ty > 0 && !isSolidT(lv.get(floor(this.cx / TS), ty - 1)); i++) ty--;
    if (ty > 0 && isSolidT(lv.get(floor(this.cx / TS), ty - 1))) { this.anchorY = ty * TS; this.y = this.anchorY + 6; this.state = 'hang'; this.flying = true; }
  }
  target() {
    for (const f of lv.fx) if (f.decoy && !f.dead && dist(f.cx, f.cy, this.cx, this.cy) < 170) return f;
    return pl;
  }
  sees(t) {
    if (!t || t.dead) return false;
    const d = dist(t.cx, t.cy, this.cx, this.cy);
    if (d > (this.aggro ? this.d.sight * 1.6 : this.d.sight)) return false;
    return los(this.cx, this.y + 3, t.cx, t.cy);
  }
  addStatus(k, t) {
    if (this.dead) return;
    if (this.boss && k === 'freeze') t = min(t, 45);
    if (k === 'poison') { this.status.poison = max(this.status.poison || 0, t); this.poisonStacks = min(5, (this.poisonStacks || 0) + 1); return; }
    this.status[k] = max(this.status[k] || 0, t);
    if (k === 'freeze') sfx('ice', this.cx);
  }
  stun(t) {
    if (this.boss) t = min(t, 40);
    this.status.stun = max(this.status.stun || 0, t);
    if (this.state === 'wind' || this.state === 'atk') { this.state = 'rec'; this.st = 0; }
  }
  updStatus() {
    const s = this.status;
    for (const k in s) if (--s[k] <= 0) delete s[k];
    if (s.burn) {
      if (this.t % 20 === 0) this.hurt(max(1, round(this.maxHp * 0.012 + 2 * (1 + Run.biome()))), null, { kb: 0, dot: true, col: C.or2 });
      if (this.t % 3 === 0) Parts.add({ k: 2, x: this.cx + rnd(-4, 4), y: this.y + rnd(0, this.h), vy: -0.8, s: 1.8, c: pick([C.or2, C.yl1, C.rd3]), life: 14, gr: -0.03, a: 0.9 });
    }
    if (s.poison) {
      if (this.t % 25 === 0) this.hurt(max(1, round((this.poisonStacks || 1) * (2 + 1.5 * Run.biome()))), null, { kb: 0, dot: true, col: C.gr3 });
      if (this.t % 8 === 0) Parts.add({ k: 0, x: this.cx + rnd(-4, 4), y: this.y + rnd(0, this.h), vy: -0.4, s: 2, c: C.gr3, life: 20, shrink: true });
    } else this.poisonStacks = 0;
  }
  contactHurt(mult = 1) {
    const t = this.target();
    if (t && !t.dead && overlap(this, t)) {
      if (t === pl) pl.hurt(this.dmg * mult, this, { cause: this.d.name });
      else if (t.hurt && (this.decoyCd || 0) < this.t) { t.hurt(); this.decoyCd = this.t + 30; }
    }
  }
  strike(box, mult = 1) {
    if (Debug.boxes) Debug.box(box);
    const t = this.target();
    if (t && !t.dead && overlap(box, t)) {
      if (t === pl) return pl.hurt(this.dmg * mult, this, { cause: (this.elite ? 'a ' + this.name : this.d.name), kb: 3 });
      else if (t.hurt && (this.decoyCd || 0) < this.t) { t.hurt(); this.decoyCd = this.t + 30; }
    }
    return false;
  }
  aggroUp(t) {
    if (!this.aggro) {
      this.aggro = true;
      if (this.d.aggro && chance(0.35)) Bubbles.say(this, pick(this.d.aggro), 90);
      this.alert = 30;
    }
    this.lost = 0;
  }
  faceTo(t) { if (t) this.face = t.cx > this.cx ? 1 : -1; }
  physics(fric = 0.8) {
    if (!this.flying) {
      this.vy = min(this.vy + 0.32, 6);
      if (this.onGround) this.vx *= fric;
    }
    moveBody(this);
  }
  update() {
    this.t++; this.anim++;
    if (this.flash > 0) this.flash--;
    if (this.alert > 0) this.alert--;
    if (this.spawnFx > 0) this.spawnFx--;
    this.sq += (1 - this.sq) * 0.2;
    this.updStatus();
    if (this.dead) return;
    if (!this.aggro && pl && dist(pl.cx, pl.cy, this.cx, this.cy) > 520) return;
    if (this.state === 'launched') return this.updLaunched();
    if (this.status.freeze) { if (!this.flying || this.state === 'hang') this.physics(0.5); return; }
    if (this.status.stun) {
      if (this.state === 'hang') { this.state = 'patrol'; this.flying = !!this.d.flying; }
      if (this.flying) { this.vx *= 0.9; this.vy = min(this.vy + 0.15, 3); }
      this.physics(0.7);
      return;
    }
    if (this.cd > 0) this.cd--;
    const ai = AI[this.d.ai];
    if (ai) ai(this);
    if (this.status.root) this.vx = 0;
    if (this.status.slow) this.vx *= 0.6;
    if (this.status.confuse && this.t % 30 === 0) this.face *= -1;
    if (this.y > lv.th * TS + 50) this.dead = true;
  }
  updLaunched() {
    this.vy = min(this.vy + 0.3, 7); this.rot += this.vx * 0.12;
    const vx0 = this.vx;
    moveBody(this);
    if (this.hitWall) { this.vx = -vx0 * 0.55; sfx('bonk', this.cx); FX.shake(0.12); this.hurt(this.launchDmg * 0.4, null, { kb: 0, quiet: true }); puff(this.cx, this.cy, 3, C.st4); }
    for (const o of lv.enemies) {
      if (o === this || o.dead || o.boss || this.bumped.has(o) || !overlap(this, o)) continue;
      this.bumped.add(o);
      o.hurt(this.launchDmg, this, { kb: abs(this.vx) * 0.8, dir: sign(this.vx) || 1, launchY: -3, billiard: abs(this.vx) > 3 });
      FText.add(o.cx, o.y - 8, pick(['STRIKE!', 'BONK!', 'BOWLED!', 'COMBO!']), C.yl1, { sc: 1 });
      sfx('bonk', o.cx); FX.stop(3);
      Run.billiards++;
    }
    if (this.dead) return;
    if (this.onGround && abs(this.vx) < 0.8 && this.st++ > 2) { this.state = 'patrol'; this.rot = 0; this.stun(35); }
    else if (this.onGround) { this.vx *= 0.82; if (abs(vx0) > 2 && this.vy === 0) this.vy = -abs(vx0) * 0.4; }
  }
  hurt(dmg, src, o = {}) {
    if (this.dead || this.intangible) return 0;
    if (this.d.ai === 'dummy') return this.dummyHurt(dmg, src, o);
    let blocked = false;
    if (this.d.shield && src === pl && !o.crit && !o.dot && (pl.cx - this.cx) * this.face > 0 && !this.status.stun && this.state !== 'atk') {
      dmg *= 0.2; blocked = true;
      sparks(this.cx + this.face * 6, this.cy, 5, C.fu4); sfx('block', this.cx);
      if (chance(0.3)) FText.add(this.cx, this.y - 6, 'BLOCKED', C.st4, { f: '3' });
    }
    dmg = max(1, round(dmg));
    this.hp -= dmg;
    if (!o.dot) this.flash = 6;
    this.hitT = this.t;
    if (!o.quiet) {
      const col = o.col || (o.crit ? C.yl1 : '#fff6ea');
      FText.add(this.cx + rnd(-4, 4), this.y - 4, o.crit ? dmg + '!' : dmg, col, { sc: o.crit ? 2 : 1, dmg: true, shake: o.crit ? 1 : 0, f: o.dot ? '3' : '5' });
    }
    if (!o.dot && !blocked) {
      const sx = src && src.cx !== undefined ? src.cx : this.cx - this.face;
      const dir = o.dir || (this.cx >= sx ? 1 : -1);
      const kb = (o.kb !== undefined ? o.kb : 1.5) / this.d.weight;
      if (!this.boss && kb > 0) {
        this.vx = dir * kb * 1.2;
        if (o.launchY) this.vy = o.launchY / max(0.8, this.d.weight * 0.8);
        else if (this.onGround && kb > 1.2) this.vy = -1.4;
        if (this.state === 'hang') { this.state = 'patrol'; this.flying = false; }
      }
      if (o.billiard && !this.boss && abs(kb) > 2.5 && this.state !== 'launched') {
        this.state = 'launched'; this.st = 0; this.vx = dir * min(9, kb * 1.6); this.vy = -3.2;
        this.bumped = new Set(); this.launchDmg = dmg * 0.8;
      }
      if (this.state === 'wind' && (o.crit || o.stun || this.d.weight < 1) && !this.elite && !this.boss) { this.state = 'rec'; this.st = 0; this.cd = 40; }
      sfx(o.crit ? 'crit' : 'hit', this.cx);
      sparks(this.cx, this.cy, o.crit ? 9 : 5, o.crit ? C.yl1 : C.fu4, { dir: dir > 0 ? 0 : PI, spread: 1.2 });
      if (o.crit) { ringFx(this.cx, this.cy, C.yl1, 14, 8); Run.crits++; }
      this.sq = 0.7;
    }
    if (o.stun) this.stun(o.stun);
    if (o.burn) this.addStatus('burn', o.burn);
    if (o.slow) this.addStatus('slow', o.slow);
    if (src === pl || (src && src.team === 'p') || (src && src.src)) this.aggroUp();
    Run.dmgDealt += dmg;
    if (this.hp <= 0) this.die(src, o);
    return dmg;
  }
  dummyHurt(dmg, src, o) {
    this.flash = 6; this.sq = 0.7;
    dmg = round(dmg);
    this.dps.push({ t: Game.frame, d: dmg });
    FText.add(this.cx + rnd(-4, 4), this.y - 4, o.crit ? dmg + '!' : dmg, o.crit ? C.yl1 : '#fff6ea', { sc: o.crit ? 2 : 1, dmg: true });
    if (!o.dot) { sfx(o.crit ? 'crit' : 'hit', this.cx); sparks(this.cx, this.cy, 5, C.br4); }
    if (o.burn) this.addStatus('burn', o.burn);
    if (chance(0.15)) Bubbles.say(this, pick(['please stop', 'i have a family', 'ow', 'is this necessary', 'i am just a sack', 'harder. no wait.']), 80);
    return dmg;
  }
  die(src, o = {}) {
    if (this.dead) return;
    this.dead = true;
    Run.kills++;
    Run.killsBy[this.type] = (Run.killsBy[this.type] || 0) + 1;
    if (Run.curse > 0) { Run.curse--; if (Run.curse === 0) { UI.toast('CURSE LIFTED', 'You may now be hit like a normal mouse.', C.tl3); sfx('secret'); } }
    const art = this.frameSet()[0];
    gibs(art, this.cx, this.cy, this.elite ? 6 : 4, (this.vx || 0) * 0.5, this.face < 0);
    puff(this.cx, this.cy, 6, C.fu3, { sp: 1.4 });
    sfx(this.d.ai === 'hopper' ? 'splat' : 'kill', this.cx);
    const b = Run.biome();
    const gm = [1, 1.6, 2.3, 3][b] * (this.elite ? 6 : 1);
    if (this.type !== 'minislime') dropCoins(this.cx, this.cy, rndi(this.d.gold[0], this.d.gold[1]) * gm);
    dropCrumbs(this.cx, this.cy, rndi(this.d.crumbs[0], this.d.crumbs[1]) * (this.elite ? 8 : 1));
    if (this.elite) {
      FX.stop(8); FX.shake(0.4); confetti(this.cx, this.cy, 30);
      if (chance(0.55)) { const bp = rollBlueprint(); if (bp) lv.items.push(new Blueprint(this.cx, this.y, bp)); }
      if (chance(0.5)) lv.items.push(new Food(this.cx, this.y, 'cheese'));
      Run.elites++;
    } else if (chance(0.03)) lv.items.push(new Food(this.cx, this.y, 'bread'));
    if (this.d.die && chance(0.3)) { const ghost = { cx: this.cx, y: this.y, dead: false }; Bubbles.say(ghost, pick(this.d.die), 80); }
    if (this.d.split) for (let i = 0; i < 2; i++) { const m = makeEnemy('minislime', this.cx + (i ? 6 : -6), this.bot, false); m.vx = i ? 2 : -2; m.vy = -3; m.aggro = true; lv.enemies.push(m); }
    if (this.d.cloud) { for (let i = 0; i < 12; i++) Parts.add({ k: 2, x: this.cx + rnd(-16, 16), y: this.cy + rnd(-10, 6), vx: rnd(-0.5, 0.5), vy: rnd(-0.4, 0.1), s: rnd(3, 6), c: pick([C.st3, C.st4]), life: rndi(50, 90), a: 0.6, top: true }); sfx('achoo', this.cx); }
    if (this.type === 'pepper') explode(this.cx, this.cy, 40, this.dmg, { team: 'e', cause: 'an exploding pepper', small: true });
    onKill(this, o.src);
    if (o.crit) { FX.slowmo(0.5, 8); }
  }
  frameSet() {
    const A = ART[this.d.art];
    const s = this.state;
    switch (this.d.art) {
      case 'roach': return s === 'wind' ? A.wind : s === 'atk' ? A.dash : A.walk;
      case 'slime': case 'dust': return this.onGround ? (A.land && this.sq < 0.85 ? A.land : A.idle) : (A.jump || A.idle);
      case 'spider': return s === 'hang' ? A.hang : A.walk;
      case 'rat': return s === 'wind' ? A.wind : s === 'atk' || (s === 'rec' && this.st < 12) ? A.smash : A.walk;
      case 'soldier': return s === 'wind' ? A.aim : s === 'atk' || (s === 'rec' && this.st < 8) ? A.fire : A.walk;
      case 'monkey': return s === 'wind' ? A.wind : s === 'atk' || (s === 'rec' && this.st < 10) ? A.clap : A.idle;
      case 'worm': return s === 'emerge' ? A.up : s === 'atk' ? A.bite : A.idle;
      case 'chef': return s === 'wind' ? A.wind : s === 'atk' || (s === 'rec' && this.st < 8) ? A.throw : A.walk;
      case 'knight': return s === 'wind' ? A.wind : s === 'atk' ? A.thrust : A.walk;
      case 'pepper': return this.lit ? A.lit : A.hop;
      case 'kitten': return s === 'wind' ? A.wiggle : s === 'atk' ? A.pounce : abs(this.vx) > 0.3 ? A.run : A.idle;
      case 'wasp': return s === 'atk' ? A.dive : A.fly;
      case 'meatball': case 'yarn': return A.roll;
      case 'dummy': return SPR.dummy;
      default: return A.fly || A.walk || A.idle;
    }
  }
  draw() {
    if (this.state === 'hidden') {
      if (this.t % 4 === 0) debris(this.cx, this.bot - 1, 1, [C.br2, C.br3], { sp: 0.8 });
      R(g, this.cx - 5, this.bot - 2, 10, 2, C.br1); R(g, this.cx - 3, this.bot - 3, 6, 1, C.br2);
      return;
    }
    if (this.state === 'hang' || (this.anchorY && this.type === 'spider' && this.state !== 'launched' && this.y - this.anchorY < 200 && this.webT !== false)) {
      if (this.anchorY && this.state === 'hang') LINE(g, this.cx, this.anchorY, this.cx, this.y + 2, '#c8c0c4');
    }
    const set = this.frameSet();
    let fr;
    const s = this.state;
    if (this.d.art === 'roach') fr = set[s === 'patrol' || s === 'chase' || s === 'atk' ? floor(this.anim / (s === 'atk' ? 2 : 5)) % set.length : 0];
    else if (this.d.art === 'meatball' || this.d.art === 'yarn') fr = set[(floor(this.anim * abs(this.vx) * 0.12) % set.length + set.length) % set.length];
    else if (this.d.art === 'slime' || this.d.art === 'dust') fr = set[floor(this.anim / 10) % set.length];
    else fr = set[floor(this.anim / (this.flying ? 4 : 8)) % set.length];
    let wob = 0;
    if (s === 'wind' && this.t % 4 < 2) wob = 1;
    const tele = s === 'wind' && this.st > this.windT - 14 && this.t % 6 < 3;
    const sx = this.sc * (this.sq < 1 ? 2 - this.sq : 1) * (this.status.freeze ? 1 : 1), sy = this.sc * this.sq;
    const alpha = this.spawnFx > 0 ? 1 - this.spawnFx / 20 : undefined;
    if (this.elite) glow(this.cx, this.cy, this.w + 6, C.rd3, 0.25 + 0.1 * sin(this.t * 0.15));
    spr(fr, this.cx + wob, this.rot ? this.cy : this.bot + 1, this.face < 0, this.flash > 0 || tele, { sx, sy, rot: this.rot, ax: 0.5, ay: this.rot ? 0.5 : 1, alpha });
    if (this.status.freeze) spr(fr, this.cx, this.bot + 1, this.face < 0, false, { sx, sy, tint: C.tl4, alpha: 0.6 });
    if (this.status.burn && this.t % 8 < 4) spr(fr, this.cx, this.bot + 1, this.face < 0, false, { sx, sy, tint: C.or2, alpha: 0.35 });
    if (this.status.stun) for (let i = 0; i < 3; i++) { const a = this.t * 0.12 + (i * TAU) / 3; PX(g, this.cx + cos(a) * 7, this.y - 4 + sin(a) * 2, i ? C.yl1 : C.wh); }
    if (this.status.confuse) txt('?', this.cx, this.y - 14, C.gr3, { a: 'c', f: '3', ol: C.ink });
    if (s === 'wind' || this.alert > 15) { const yy = this.y - 12 - (this.st < 4 ? 4 - this.st : 0); txt('!', this.cx, yy, s === 'wind' ? C.rd3 : C.yl1, { a: 'c', ol: C.ink }); }
    if ((this.t - this.hitT < 180 || this.elite) && this.hp > 0 && this.type !== 'dummy') {
      const w = this.elite ? 26 : 16, x = round(this.cx - w / 2), y = round(this.y - 6);
      R(g, x - 1, y - 1, w + 2, 4, C.ink); R(g, x, y, w, 2, C.dk2); R(g, x, y, round(w * this.hp / this.maxHp), 2, this.elite ? C.rd3 : C.rd2);
      if (this.elite) txt(this.name, this.cx, y - 8, C.rd3, { a: 'c', f: '3', ol: C.ink });
    }
    if (this.type === 'dummy') {
      const now = Game.frame;
      this.dps = this.dps.filter((x) => now - x.t < 180);
      const tot = this.dps.reduce((a, b) => a + b.d, 0);
      if (tot) txt('DPS ' + round(tot / 3), this.cx, this.y - 10, C.yl1, { a: 'c', f: '3', ol: C.ink });
    }
  }
  get windT() { return this.d.wind || 30; }
}

// ---------------- AI archetypes ----------------
function walkPatrol(e, sp) {
  if (e.onGround) {
    if (wallAhead(e, e.face) || !floorAhead(e, e.face)) { e.face *= -1; e.vx = 0; }
    e.vx = approach(e.vx, e.face * sp, 0.2);
    if (e.t % 200 === 0 && chance(0.3)) e.face *= -1;
  }
}
function walkTo(e, t, sp) {
  e.faceTo(t);
  if (!e.onGround) return;
  if (abs(t.cx - e.cx) < 6) { e.vx *= 0.7; return; }
  if (!floorAhead(e, e.face, 4) || wallAhead(e, e.face)) {
    if (wallAhead(e, e.face) && e.onGround && t.y < e.y - 8 && e.d.weight < 1.5 && (e.jumpCd || 0) < e.t) { e.vy = -5; e.jumpCd = e.t + 60; }
    e.vx *= 0.6; return;
  }
  e.vx = approach(e.vx, e.face * sp, 0.25);
}
function lostCheck(e, sees) {
  if (sees) { e.lost = 0; return false; }
  if (++e.lost > 240) { e.aggro = false; e.state = 'patrol'; e.lost = 0; return true; }
  return false;
}
const AI = {
  dummy(e) { e.physics(0.5); },
  charger(e) {
    const t = e.target(), sees = e.sees(t);
    e.st++;
    switch (e.state) {
      case 'patrol': walkPatrol(e, e.d.speed); if (sees) { e.aggroUp(t); e.state = 'chase'; } break;
      case 'chase':
        walkTo(e, t, e.d.chase);
        lostCheck(e, sees);
        if (e.cd <= 0 && abs(t.cx - e.cx) < e.d.range && abs(t.cy - e.cy) < 26 && sees) { e.state = 'wind'; e.st = 0; e.faceTo(t); sfx('tele', e.cx); }
        break;
      case 'wind': e.vx *= 0.6; if (e.st >= e.d.wind) { e.state = 'atk'; e.st = 0; sfx('dash', e.cx); } break;
      case 'atk':
        e.vx = e.face * e.d.dashSp;
        if (e.st % 2 === 0) puff(e.cx - e.face * 6, e.bot - 1, 1, C.st4, { s: 1, life: 10 });
        e.contactHurt();
        if (e.st >= e.d.dashT || e.hitWall || (e.onGround && !floorAhead(e, e.face, 2))) { e.state = 'rec'; e.st = 0; e.vx *= 0.3; }
        break;
      case 'rec': e.vx *= 0.8; if (e.st > 28) { e.state = 'chase'; e.cd = e.d.cd; } break;
    }
    e.physics();
  },
  hopper(e) {
    const t = e.target(), sees = e.sees(t);
    if (sees) e.aggroUp(t); else lostCheck(e, false);
    if (e.onGround) {
      if (!e.wasGround) { e.sq = 0.6; e.vx = 0; }
      e.vx *= 0.7;
      if (--e.hop <= 0) {
        const [hx, hy] = e.d.hop;
        if (e.aggro && t) e.faceTo(t); else if (chance(0.5)) e.face *= -1;
        e.vx = e.face * hx * (e.aggro ? 1 : 0.5); e.vy = hy * (e.aggro ? 1 : 0.7); e.sq = 1.3;
        e.hop = rndi(e.d.hopCd[0], e.d.hopCd[1]);
        if (e.d.art === 'dust' && chance(0.3)) sfx('boing', e.cx);
      }
    } else if (e.aggro) e.contactHurt();
    e.wasGround = e.onGround;
    if (e.onGround && e.aggro && overlap(e, t)) e.contactHurt();
    const pv = e.vx;
    e.physics(1);
    if (e.hitWall) e.vx = -pv * 0.5;
  },
  spider(e) {
    const t = e.target();
    e.st++;
    if (e.state === 'hang') {
      e.vx = 0; e.vy = 0;
      e.y = e.anchorY + 6 + sin(e.t * 0.05) * 3;
      if (t && abs(t.cx - e.cx) < 40 && t.y > e.y && t.y - e.y < 220 && los(e.cx, e.cy, t.cx, t.cy)) {
        e.state = 'drop'; e.flying = false; e.aggroUp(t); sfx('whoosh', e.cx);
      }
      return;
    }
    if (e.state === 'drop') { e.physics(); if (e.onGround) { e.state = 'chase'; e.sq = 0.6; } else e.contactHurt(); return; }
    const sees = e.sees(t);
    if (e.state === 'patrol') { walkPatrol(e, e.d.speed); if (sees) { e.aggroUp(t); e.state = 'chase'; } }
    else if (e.state === 'chase') {
      walkTo(e, t, e.d.chase);
      lostCheck(e, sees);
      if (e.cd <= 0 && sees && abs(t.cx - e.cx) < e.d.range) { e.state = 'wind'; e.st = 0; sfx('tele', e.cx); }
      if (overlap(e, t) && (e.biteCd || 0) < e.t) { e.biteCd = e.t + 40; e.contactHurt(); }
    } else if (e.state === 'wind') {
      e.vx *= 0.6; e.faceTo(t);
      if (e.st >= 24) {
        const a = atan2(t.cy - e.cy, t.cx - e.cx);
        lv.projs.push(new Proj(e.cx, e.cy, cos(a) * 3.4, sin(a) * 3.4 - 0.6, { team: 'e', kind: 'web', dmg: e.dmg * 0.7, grav: 0.04, life: 90, slowP: 120, cause: 'a web' }));
        e.state = 'rec'; e.st = 0; sfx('shoot', e.cx);
      }
    } else if (e.state === 'rec') { if (e.st > 24) { e.state = 'chase'; e.cd = e.d.cd; } }
    e.physics();
  },
  brute(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    e.st++;
    switch (e.state) {
      case 'patrol': walkPatrol(e, d.speed); if (sees) { e.aggroUp(t); e.state = 'chase'; } break;
      case 'chase':
        walkTo(e, t, d.chase);
        lostCheck(e, sees);
        if (e.cd <= 0 && abs(t.cx - e.cx) < d.range + e.w / 2 && abs(t.cy - e.cy) < 30) { e.state = 'wind'; e.st = 0; e.faceTo(t); sfx('tele', e.cx); }
        break;
      case 'wind':
        e.vx *= 0.5;
        if (d.lungeK && e.st < d.wind - 6) e.faceTo(t);
        if (e.st >= d.wind) {
          e.state = 'atk'; e.st = 0;
          sfx(d.clap ? 'clang' : 'heavy', e.cx);
          if (d.lungeK) e.vx = e.face * d.lungeK;
          if (d.clap) {
            FX.shake(0.25); ringFx(e.cx, e.cy, C.yl1, 60, 18, 2);
            if (dist(t.cx, t.cy, e.cx, e.cy) < 58) e.strike({ x: t.x, y: t.y, w: t.w, h: t.h });
            for (const s of [-1, 1]) lv.projs.push(new Proj(e.cx + s * 8, e.bot - 6, s * 2.6, 0, { team: 'e', kind: 'wave', dmg: e.dmg * 0.7, life: 50, w: 10, h: 10, ground: true, pierce: 99, cause: 'a cymbal shockwave' }));
          } else { FX.shake(0.15); }
        }
        break;
      case 'atk': {
        const [bw, bh] = d.box || [26, 24];
        const box = { x: e.face > 0 ? e.cx : e.cx - bw, y: e.bot - bh, w: bw, h: bh };
        if (!d.clap && e.st <= d.atkT) e.strike(box);
        if (!d.clap && e.st === 2) { debris(e.cx + e.face * bw * 0.7, e.bot - 2, 4, [C.st3, C.st4], { sp: 1.5 }); }
        if (e.st > d.atkT) { e.state = 'rec'; e.st = 0; }
        break;
      }
      case 'rec': e.vx *= 0.8; if (e.st > 30) { e.state = 'chase'; e.cd = d.cd; } break;
    }
    e.physics();
  },
  flyer(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    e.st++;
    const hoverTo = (tx, ty, sp) => {
      const dx = tx - e.cx, dy = ty - e.cy, dd = hypot(dx, dy) || 1;
      e.vx = approach(e.vx, (dx / dd) * sp, 0.12); e.vy = approach(e.vy, (dy / dd) * sp, 0.12);
    };
    switch (e.state) {
      case 'patrol':
        hoverTo(e.home.x + sin(e.t * 0.02) * 40, e.home.y + sin(e.t * 0.05) * 10, d.speed * 0.6);
        if (sees) { e.aggroUp(t); e.state = 'chase'; }
        break;
      case 'chase': {
        const ox = (e.cx < t.cx ? -1 : 1) * (d.burst ? 10 : 50);
        hoverTo(t.cx + ox, t.cy - (d.burst ? 6 : 36) + sin(e.t * 0.08) * 8, d.speed);
        e.faceTo(t);
        lostCheck(e, sees);
        if (e.cd <= 0 && sees && dist(t.cx, t.cy, e.cx, e.cy) < d.range) { e.state = 'wind'; e.st = 0; sfx(d.burst ? 'tele' : 'buzz', e.cx); }
        break;
      }
      case 'wind':
        e.vx *= 0.85; e.vy *= 0.85; e.faceTo(t);
        if (e.st >= d.wind) {
          e.st = 0;
          if (d.burst) {
            e.state = 'rec';
            for (let i = 0; i < 14; i++) Parts.add({ k: 2, x: e.cx + rnd(-20, 20), y: e.cy + rnd(-16, 16), vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), s: rnd(2, 4), c: pick([C.br4, C.br5, C.fu3]), life: rndi(30, 50), a: 0.6, top: true });
            sfx('achoo', e.cx);
            if (dist(t.cx, t.cy, e.cx, e.cy) < 34) e.strike({ x: t.x, y: t.y, w: t.w, h: t.h });
          } else {
            e.state = 'atk';
            const a = atan2(t.cy - e.cy, t.cx - e.cx);
            e.vx = cos(a) * d.dashSp; e.vy = sin(a) * d.dashSp;
            sfx('dash', e.cx);
          }
        }
        break;
      case 'atk':
        e.contactHurt();
        if (e.st % 2 === 0) Parts.add({ k: 1, x: e.cx, y: e.cy, vx: -e.vx * 0.3, vy: -e.vy * 0.3, c: C.fu4, life: 6, len: 2 });
        if (e.st >= d.dashT || e.hitWall || e.hitCeil || e.onGround) { e.state = 'rec'; e.st = 0; }
        break;
      case 'rec': e.vx *= 0.9; e.vy = approach(e.vy, -0.8, 0.1); if (e.st > 34) { e.state = 'chase'; e.cd = d.cd; } break;
    }
    const pvx = e.vx, pvy = e.vy;
    moveBody(e);
    if (e.hitWall) e.vx = -pvx * 0.5;
    if (e.hitCeil || e.onGround) e.vy = -pvy * 0.5;
  },
  flyshooter(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    e.st++;
    const hoverTo = (tx, ty, sp) => { const dx = tx - e.cx, dy = ty - e.cy, dd = hypot(dx, dy) || 1; e.vx = approach(e.vx, (dx / dd) * sp, 0.1); e.vy = approach(e.vy, (dy / dd) * sp, 0.1); };
    if (e.state === 'patrol') { hoverTo(e.home.x + sin(e.t * 0.02) * 30, e.home.y + sin(e.t * 0.04) * 12, d.speed * 0.5); if (sees) { e.aggroUp(t); e.state = 'chase'; } }
    else if (e.state === 'chase') {
      const side = e.cx < t.cx ? -1 : 1;
      hoverTo(t.cx + side * d.keep, t.cy - 40 + sin(e.t * 0.06) * 14, d.speed);
      e.faceTo(t); lostCheck(e, sees);
      if (e.cd <= 0 && sees) { e.state = 'wind'; e.st = 0; sfx('tele', e.cx); }
    } else if (e.state === 'wind') {
      e.vx *= 0.9; e.vy *= 0.9;
      if (e.st >= d.wind) {
        const a = atan2(t.cy - e.cy, t.cx - e.cx);
        for (const off of [-0.25, 0, 0.25]) lv.projs.push(new Proj(e.cx, e.cy, cos(a + off) * 3, sin(a + off) * 3, { team: 'e', kind: 'leaf', dmg: e.dmg * 0.8, life: 100, cause: 'groovy catnip leaves' }));
        sfx('shoot', e.cx); e.state = 'rec'; e.st = 0;
      }
    } else if (e.state === 'rec') { e.vx *= 0.95; e.vy *= 0.95; if (e.st > 40) { e.state = 'chase'; e.cd = d.cd; } }
    moveBody(e);
  },
  shooter(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    e.st++;
    switch (e.state) {
      case 'patrol': walkPatrol(e, d.speed); if (sees) { e.aggroUp(t); e.state = 'chase'; } break;
      case 'chase': {
        const dx = t.cx - e.cx, ad = abs(dx);
        e.faceTo(t);
        if (ad < d.keep && e.onGround) { const away = -sign(dx); if (floorAhead(e, away, 4) && !wallAhead(e, away)) e.vx = approach(e.vx, away * d.speed * 1.4, 0.2); else e.vx *= 0.7; }
        else if (ad > d.range * 0.8) walkTo(e, t, d.speed * 1.2);
        else e.vx *= 0.7;
        e.faceTo(t);
        lostCheck(e, sees);
        if (d.art === 'chef' && ad < 26 && abs(t.cy - e.cy) < 20 && e.cd <= 0) { e.state = 'slash'; e.st = 0; sfx('tele', e.cx); break; }
        if (e.cd <= 0 && sees && ad < d.range) { e.state = 'wind'; e.st = 0; sfx('tele', e.cx); }
        break;
      }
      case 'wind':
        e.vx *= 0.6; e.faceTo(t);
        if (e.st >= d.wind) {
          e.state = 'atk'; e.st = 0;
          if (d.arc) {
            const dx = t.cx - e.cx, tt = 34, vx = dx / tt, vy = (t.cy - e.cy) / tt - 0.5 * 0.22 * tt;
            lv.projs.push(new Proj(e.cx, e.y + 4, clamp(vx, -5, 5), clamp(vy, -7, 2), { team: 'e', kind: 'cleaver', dmg: e.dmg, grav: 0.22, life: 120, w: 8, h: 8, cause: 'a flying cleaver' }));
            sfx('whoosh', e.cx);
          } else {
            lv.projs.push(new Proj(e.cx + e.face * 8, e.y + 9, e.face * d.shotSp, 0, { team: 'e', kind: 'corke', dmg: e.dmg, life: 110, w: 5, h: 4, cause: 'a toy cork bullet' }));
            sfx('pop', e.cx); puff(e.cx + e.face * 10, e.y + 9, 2, C.fu4);
          }
        }
        break;
      case 'slash': {
        e.vx *= 0.5;
        if (e.st === 14) { sfx('swing', e.cx); e.strike({ x: e.face > 0 ? e.cx : e.cx - 24, y: e.y, w: 24, h: e.h }); }
        if (e.st > 30) { e.state = 'chase'; e.cd = 50; }
        break;
      }
      case 'atk': if (e.st > 4) { e.state = 'rec'; e.st = 0; } break;
      case 'rec': e.vx *= 0.8; if (e.st > 30) { e.state = 'chase'; e.cd = d.cd; } break;
    }
    e.physics();
  },
  burrower(e) {
    const t = e.target(), d = e.d;
    e.st++;
    switch (e.state) {
      case 'hidden':
        e.intangible = true;
        if (t && dist(t.cx, t.cy, e.cx, e.cy) < d.sight) {
          e.aggro = true;
          walkTo(e, t, d.speed);
          if (e.cd <= 0 && abs(t.cx - e.cx) < d.range && abs(t.bot - e.bot) < 24) { e.state = 'emerge'; e.st = 0; e.intangible = false; sfx('quake', e.cx); debris(e.cx, e.bot - 2, 8, [C.br2, C.br3], { sp: 2 }); }
        } else e.vx *= 0.8;
        break;
      case 'emerge':
        e.vx = 0;
        if (e.st === 8) e.strike({ x: e.x - 2, y: e.y - 6, w: e.w + 4, h: e.h + 6 }, 1.2);
        if (e.st > 18) { e.state = 'up'; e.st = 0; if (chance(0.4)) Bubbles.say(e, pick(d.aggro), 80); }
        break;
      case 'up':
        e.faceTo(t);
        if (t && abs(t.cx - e.cx) < 26 && e.st % 50 === 25) { e.state = 'atk'; e.st = 0; sfx('snap', e.cx); }
        if (e.st > 110) { e.state = 'burrow'; e.st = 0; }
        break;
      case 'atk':
        if (e.st === 6) e.strike({ x: e.face > 0 ? e.cx : e.cx - 22, y: e.y, w: 22, h: e.h });
        if (e.st > 16) { e.state = 'up'; e.st = 26; }
        break;
      case 'burrow':
        if (e.st > 14) { e.state = 'hidden'; e.st = 0; e.cd = d.cd; debris(e.cx, e.bot - 2, 5, [C.br2, C.br3], { sp: 1.5 }); }
        break;
    }
    e.physics();
  },
  roller(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    if (sees) e.aggroUp(t); else lostCheck(e, false);
    if (e.aggro && t) {
      const dir = t.cx > e.cx ? 1 : -1;
      e.vx = clamp(e.vx + dir * d.speed, -d.max, d.max);
      if (e.onGround && abs(t.cx - e.cx) < 60 && t.y < e.y - 10 && (e.jumpCd || 0) < e.t) { e.vy = -5.2; e.jumpCd = e.t + 70; }
    } else e.vx *= 0.95;
    if (abs(e.vx) > 1.5) e.contactHurt();
    if (abs(e.vx) > 2 && e.onGround && e.t % 4 === 0) debris(e.cx, e.bot - 1, 1, d.art === 'meatball' ? [C.rd1, C.rd2] : [C.pk1], { sp: 0.6 });
    const pvx = e.vx;
    e.vy = min(e.vy + 0.32, 6);
    moveBody(e);
    if (e.hitWall) { e.vx = -pvx * 0.7; sfx('bonk', e.cx); e.sq = 0.7; }
    e.face = e.vx >= 0 ? 1 : -1;
  },
  exploder(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    if (sees) e.aggroUp(t);
    if (e.lit) {
      e.vx *= 0.9;
      if (e.t % 4 === 0) sparks(e.cx, e.y, 2, C.yl1, { dir: -PI / 2, spread: 1, min: 0.5, max: 1.5 });
      if (e.t % 10 === 0) sfx('tele', e.cx);
      if (--e.fuse <= 0) { e.hp = 0; e.die(null, {}); }
      e.physics(1);
      return;
    }
    if (e.aggro && t && dist(t.cx, t.cy, e.cx, e.cy) < 34) { e.lit = true; e.fuse = 42; sfx('fire', e.cx); Bubbles.say(e, pick(['uh oh', 'SPICY TIME', 'goodbye cruel world']), 50); return; }
    AI.hopper(e);
  },
  pouncer(e) {
    const t = e.target(), sees = e.sees(t), d = e.d;
    e.st++;
    switch (e.state) {
      case 'patrol': walkPatrol(e, d.speed); if (sees) { e.aggroUp(t); e.state = 'chase'; } break;
      case 'chase':
        walkTo(e, t, d.chase); lostCheck(e, sees);
        if (e.cd <= 0 && sees && abs(t.cx - e.cx) < d.range && abs(t.cy - e.cy) < 50) { e.state = 'wind'; e.st = 0; e.faceTo(t); sfx('tele', e.cx); }
        break;
      case 'wind': e.vx *= 0.5; if (e.st >= d.wind) { e.state = 'atk'; e.st = 0; const dx = t.cx - e.cx; e.vx = clamp(dx / 26, -4.6, 4.6); e.vy = -4.4; sfx('meow'); } break;
      case 'atk': e.contactHurt(); if (e.onGround && e.st > 4) { e.state = 'rec'; e.st = 0; e.vx *= 0.3; puff(e.cx, e.bot, 4, C.st4); } break;
      case 'rec': e.vx *= 0.8; if (e.st > 30) { e.state = 'chase'; e.cd = d.cd; } break;
    }
    e.physics(e.state === 'atk' ? 1 : 0.8);
  },
};
