// SQUEAKBORNE :: items and combat
// Item database, rarity, affixes, melee combos, ranged, shields, skills, projectiles, explosions.

const STATS = {
  fury: { name: 'Fury', col: C.rd3, desc: '+15% damage with red gear. +10% health.' },
  cunning: { name: 'Cunning', col: C.tl3, desc: '+15% damage with teal gear. +10% health.' },
  grit: { name: 'Grit', col: C.yl1, desc: '+15% damage with gold gear. +25% health.' },
};
const RARITY = [
  { name: 'Common', col: '#e8dccb', aff: 0, mult: 1 },
  { name: 'Fancy', col: C.gr3, aff: 1, mult: 1.1 },
  { name: 'Rare', col: C.or2, aff: 2, mult: 1.22 },
  { name: 'Absurd', col: C.rd3, aff: 3, mult: 1.4 },
];
const LEGEND_SUFFIX = ['Unreasonable Doom', 'Mild Inconvenience', 'the Last Crumb', "Grandma's Wrath", 'Absolute Cheese', 'Questionable Origin', 'Big Squeak Energy', 'Eternal Snacking', 'Tax Evasion', 'the Couch Cushions'];

const M = (w, a, r, dmg, reach, o = {}) => Object.assign({ w, a, r, dmg, reach, hh: 18, yo: -1, back: 4, kb: 1.8, lunge: 1.2, fx: 'slash', a0: -2.2, a1: 0.9, sfx: 'swing' }, o);
const ITEMS = {
  // ---- melee ----
  needle: { name: 'Sewing Needle', kind: 'melee', stat: 'fury', base: 10, shape: 'needle', desc: 'Quick 3-hit combo. The third poke always crits.',
    moves: [M(5, 4, 10, 1, 24), M(5, 4, 10, 1, 24, { a0: 1.0, a1: -1.7, fx: 'slash2', sfx: 'swing2' }), M(7, 5, 16, 1.5, 32, { hh: 10, kb: 3, lunge: 2.6, fx: 'thrust', a0: 0, a1: 0, crit: true, sfx: 'thrust' })] },
  fork: { name: 'Fork of Destiny', kind: 'melee', stat: 'fury', base: 13, shape: 'fork', desc: 'Long thrusts. Crits enemies caught on the very tip.', critTip: true,
    moves: [M(7, 5, 14, 1, 42, { hh: 12, kb: 2.2, lunge: 1.8, fx: 'thrust', a0: 0, a1: 0, sfx: 'thrust' }), M(8, 5, 18, 1.2, 46, { hh: 12, kb: 3, lunge: 2.4, fx: 'thrust', a0: -0.15, a1: -0.15, sfx: 'thrust' })] },
  spoon: { name: "Grandma's Spoon", kind: 'melee', stat: 'grit', base: 24, shape: 'spoon', desc: 'Slow, heavy smacks. Crits stunned enemies. BONK.', critStunned: true,
    moves: [M(14, 6, 18, 1, 30, { hh: 28, yo: -6, kb: 3.5, launch: -2.5, stun: 40, fx: 'smash', a0: -2.7, a1: 0.7, sfx: 'heavy', lunge: 1.5 }), M(16, 7, 22, 1.4, 32, { hh: 30, yo: -6, kb: 5, launch: -4, stun: 60, fx: 'smash', a0: -2.9, a1: 0.9, sfx: 'heavy', lunge: 2 })] },
  toothpick: { name: 'Toothpick Twins', kind: 'melee', stat: 'cunning', base: 6, shape: 'toothpick', desc: 'Very fast stabs. Crits enemies from behind.', critBack: true,
    moves: [M(2, 3, 6, 1, 20, { hh: 12, fx: 'thrust', a0: 0, a1: 0, sfx: 'thrust', lunge: 0.6 }), M(2, 3, 6, 1, 20, { hh: 12, fx: 'thrust', a0: 0.2, a1: 0.2, sfx: 'thrust', lunge: 0.6 }), M(2, 3, 6, 1, 20, { hh: 12, fx: 'thrust', a0: -0.2, a1: -0.2, sfx: 'thrust', lunge: 0.6 }), M(4, 4, 12, 1.6, 22, { fx: 'slash', sfx: 'swing', lunge: 1.4 })] },
  match: { name: 'Lit Match', kind: 'melee', stat: 'fury', base: 9, shape: 'match', desc: 'Sets things on fire. Crits burning enemies.', burn: 150, critBurning: true,
    moves: [M(5, 4, 11, 1, 24, { sfx: 'swing' }), M(5, 4, 11, 1, 24, { a0: 1.0, a1: -1.7, fx: 'slash2', sfx: 'swing2' }), M(9, 5, 18, 1.4, 28, { fx: 'smash', a0: -2.7, a1: 0.7, hh: 26, yo: -5, sfx: 'heavy' })] },
  spaghetti: { name: 'Spaghetti Whip', kind: 'melee', stat: 'cunning', base: 12, shape: 'spaghetti', desc: 'Long lash. Crits at the very tip. Al dente.', critTip: true, whip: true,
    moves: [M(8, 5, 14, 1, 64, { hh: 10, back: -8, kb: 1.4, lunge: 0.3, fx: 'whip', sfx: 'whip' }), M(8, 5, 14, 1, 64, { hh: 10, back: -8, kb: 1.4, lunge: 0.3, fx: 'whip', yo: -6, sfx: 'whip' })] },
  tenderizer: { name: 'Meat Tenderizer', kind: 'melee', stat: 'grit', base: 15, shape: 'tenderizer', desc: 'Third hit slams the floor in a shockwave.',
    moves: [M(7, 5, 12, 1, 26, { kb: 2.5, sfx: 'swing' }), M(7, 5, 12, 1, 26, { a0: 1.0, a1: -1.7, fx: 'slash2', kb: 2.5, sfx: 'swing2' }), M(13, 6, 20, 1.6, 30, { fx: 'smash', a0: -2.8, a1: 0.8, hh: 28, yo: -6, kb: 3, launch: -3, quake: true, sfx: 'heavy' })] },
  baguette: { name: 'Baguette', kind: 'melee', stat: 'grit', base: 11, shape: 'baguette', desc: 'Every hit heals a little. Carbs are medicine.', lifesteal: 0.06,
    moves: [M(6, 5, 12, 1, 28, { kb: 2.2, sfx: 'swing' }), M(6, 5, 12, 1, 28, { a0: 1.0, a1: -1.7, fx: 'slash2', kb: 2.2, sfx: 'swing2' })] },
  rollingpin: { name: 'Rolling Pin', kind: 'melee', stat: 'fury', base: 19, shape: 'rollingpin', desc: 'HOME RUN. Launched enemies crash into other enemies.', billiard: true,
    moves: [M(10, 6, 16, 1, 30, { kb: 5, launch: -2, fx: 'slash', a0: -1.6, a1: 1.2, sfx: 'heavy', hh: 22 }), M(14, 6, 20, 1.5, 32, { kb: 8, launch: -3.5, fx: 'slash2', a0: 1.4, a1: -1.4, sfx: 'heavy', hh: 24 })] },
  chopsticks: { name: 'Chopsticks', kind: 'melee', stat: 'cunning', base: 7, shape: 'chopsticks', desc: 'Rapid jabs. Every 5th hit is a crit.', critEvery: 5,
    moves: [M(3, 3, 7, 1, 26, { hh: 10, fx: 'thrust', a0: 0, a1: 0, sfx: 'thrust', lunge: 0.8 }), M(3, 3, 7, 1, 26, { hh: 10, fx: 'thrust', a0: -0.15, a1: -0.15, sfx: 'thrust', lunge: 0.8 })] },
  corkscrew: { name: 'Corkscrew Drill', kind: 'melee', stat: 'fury', base: 5, shape: 'corkscrew', desc: 'Hold to drill. Shreds everything in front of you.', drill: true,
    moves: [M(3, 999, 8, 1, 26, { hh: 12, kb: 0.4, fx: 'drill', a0: 0, a1: 0, sfx: 'thrust', lunge: 0 })] },
  paperclip: { name: 'Paperclip Rapier', kind: 'melee', stat: 'cunning', base: 13, shape: 'paperclip', desc: 'Lunging pokes. Crits right after a dodge.', critAfterDodge: true,
    moves: [M(6, 4, 12, 1, 34, { hh: 10, fx: 'thrust', a0: 0, a1: 0, lunge: 3, sfx: 'thrust' }), M(6, 4, 14, 1.2, 36, { hh: 10, fx: 'thrust', a0: -0.1, a1: -0.1, lunge: 3.4, sfx: 'thrust' })] },
  // ---- ranged ----
  slingshot: { name: 'Rubber Band Slingshot', kind: 'ranged', stat: 'cunning', base: 9, cd: 24, shape: 'slingshot', desc: 'Pings pebbles across the room. Reliable.', wind: 5 },
  crossbow: { name: 'Thumbtack Crossbow', kind: 'ranged', stat: 'cunning', base: 24, cd: 56, shape: 'crossbow', desc: 'Piercing tacks. Shots after a short rest crit.', wind: 8 },
  straw: { name: 'Pea Shooter', kind: 'ranged', stat: 'cunning', base: 4, cd: 7, shape: 'straw', desc: 'Hold to spray peas. Peas slow enemies down.', auto: true, wind: 1 },
  boomerang: { name: 'Bent Popsicle Stick', kind: 'ranged', stat: 'fury', base: 12, cd: 46, shape: 'boomerang', desc: 'Flies out, comes back, hits twice. Catch it.', wind: 6 },
  hotsauce: { name: 'Hot Sauce Bottle', kind: 'ranged', stat: 'fury', base: 3, cd: 4, shape: 'hotsauce', desc: 'Hold to spray burning sauce at close range.', auto: true, wind: 1 },
  cork: { name: 'Cork Pistol', kind: 'ranged', stat: 'grit', base: 11, cd: 30, shape: 'cork', desc: 'Huge knockback. Corks bounce off walls.', wind: 4 },
  // ---- shields ----
  capshield: { name: 'Bottle Cap Shield', kind: 'shield', stat: 'grit', base: 16, shape: 'capshield', desc: 'Hold to block. Block just before a hit to PARRY.' },
  potlid: { name: 'Pot Lid', kind: 'shield', stat: 'grit', base: 26, shape: 'potlid', desc: 'Heavy block. Parries release a shockwave.' },
  // ---- skills ----
  firecracker: { name: 'Firecracker', kind: 'skill', stat: 'fury', base: 32, cd: 330, desc: 'Throw it. It goes BOOM. Sets things on fire.' },
  mousetrap: { name: 'Mousetrap', kind: 'skill', stat: 'cunning', base: 70, cd: 480, desc: 'Place a trap that snaps the first enemy for huge damage. The irony.' },
  bricks: { name: 'Toy Bricks', kind: 'skill', stat: 'cunning', base: 14, cd: 450, desc: 'Scatter bricks. Enemies who step on them hop in agony.' },
  cushion: { name: 'Whoopee Cushion', kind: 'skill', stat: 'grit', base: 8, cd: 600, desc: 'PFFFT. Stuns everything nearby. Dignity not included.' },
  teeth: { name: 'Chattering Teeth', kind: 'skill', stat: 'cunning', base: 13, cd: 660, desc: 'Wind-up teeth run forward and bite everything.' },
  icecube: { name: 'Ice Cube', kind: 'skill', stat: 'cunning', base: 14, cd: 540, desc: 'Shatters into a freeze. Frozen enemies always take crits.' },
  duck: { name: 'Rubber Duck', kind: 'skill', stat: 'grit', base: 45, cd: 720, desc: 'Enemies cannot resist attacking it. Then it explodes.' },
  sugar: { name: 'Sugar Cube', kind: 'skill', stat: 'fury', base: 0, cd: 1200, desc: 'SUGAR RUSH: faster movement, attacks and cooldowns for 6s.' },
  garlic: { name: 'Garlic Clove', kind: 'skill', stat: 'grit', base: 7, cd: 900, desc: 'A stink aura damages nearby enemies for 6s.' },
  bubble: { name: 'Bubble Wrap', kind: 'skill', stat: 'grit', base: 28, cd: 900, desc: 'Absorbs the next hit, then pops on everyone nearby.' },
};
for (const id in ITEMS) ITEMS[id].id = id;
const STARTER_UNLOCKS = ['needle', 'fork', 'spoon', 'slingshot', 'crossbow', 'capshield', 'firecracker', 'mousetrap', 'bricks'];
const BLUEPRINT_COST = {
  toothpick: 30, match: 25, spaghetti: 35, tenderizer: 40, baguette: 30, rollingpin: 55, chopsticks: 30, corkscrew: 45, paperclip: 40,
  straw: 30, boomerang: 35, hotsauce: 45, cork: 35, potlid: 50, cushion: 40, teeth: 55, icecube: 45, duck: 50, sugar: 60, garlic: 45, bubble: 50,
};
const AFFIXES = {
  dmg: { pre: 'Sharp', desc: '+{v}% damage', roll: (r) => r.int(15, 35) },
  burn: { pre: 'Spicy', desc: 'Hits set enemies on fire', k: ['melee', 'ranged'] },
  poison: { pre: 'Moldy', desc: 'Hits poison enemies (stacks)', k: ['melee', 'ranged'] },
  crit: { pre: 'Lucky', desc: '+{v}% crit chance', roll: (r) => r.int(10, 25), k: ['melee', 'ranged'] },
  boss: { pre: 'Bossy', desc: '+{v}% damage to bosses and elites', roll: (r) => r.int(30, 60) },
  fullhp: { pre: 'Smug', desc: '+{v}% damage at full health', roll: (r) => r.int(40, 70) },
  killheal: { pre: 'Hungry', desc: 'Kills heal {v}% health', roll: (r) => r.int(2, 4), k: ['melee', 'ranged'] },
  boom: { pre: 'Explosive', desc: 'Kills cause confetti explosions' },
  speed: { pre: 'Caffeinated', desc: '+{v}% attack speed', roll: (r) => r.int(12, 25), k: ['melee', 'ranged'] },
  launch: { pre: 'Homerun', desc: 'Launched enemies crash into others', k: ['melee'] },
  freeze: { pre: 'Chilly', desc: 'Crits freeze enemies', k: ['melee', 'ranged'] },
  gold: { pre: 'Greedy', desc: 'Hits can knock buttons loose', k: ['melee', 'ranged'] },
  cdr: { pre: 'Efficient', desc: '-{v}% cooldown', roll: (r) => r.int(15, 30), k: ['ranged', 'skill'] },
  crowd: { pre: 'Rowdy', desc: '+{v}% damage per nearby enemy', roll: (r) => r.int(8, 14), k: ['melee'] },
};

function unlockedItems() { return Object.keys(ITEMS).filter((id) => STARTER_UNLOCKS.includes(id) || Save.data.unlocked.includes(id)); }
function rollBlueprint() {
  const locked = Object.keys(BLUEPRINT_COST).filter((id) => !Save.data.unlocked.includes(id) && !Save.data.found.includes(id));
  return locked.length ? pick(locked) : null;
}
function makeItem(id, lvl, rar, aff) {
  const def = ITEMS[id];
  const it = { def, id, lvl, rar, aff: aff || [], cd: 0, combo: 0, comboT: 0, hits: 0, lastShot: -999 };
  it.dmg = def.base * (1 + 0.6 * (lvl - 1)) * RARITY[rar].mult;
  let n = def.name;
  if (it.aff.length) n = AFFIXES[it.aff[0].id].pre + ' ' + n;
  if (rar === 3) n += ' of ' + LEGEND_SUFFIX[hashStr(id + lvl + it.aff.map((a) => a.id).join()) % LEGEND_SUFFIX.length];
  it.name = n;
  return it;
}
function rollItem(rng, lvl, kind, boost = 0) {
  let pool = unlockedItems();
  if (kind) pool = pool.filter((id) => ITEMS[id].kind === kind);
  const id = rng.pick(pool);
  const r = rng();
  let rar = r < 0.04 + 0.06 * boost ? 3 : r < 0.17 + 0.12 * boost ? 2 : r < 0.48 + 0.1 * boost ? 1 : 0;
  if (boost >= 3) rar = 3;
  const ilvl = lvl + (rng.chance(0.2) ? 1 : 0);
  const k = ITEMS[id].kind === 'shield' ? 'melee' : ITEMS[id].kind;
  const ids = rng.shuffle(Object.keys(AFFIXES).filter((a) => !AFFIXES[a].k || AFFIXES[a].k.includes(k)));
  const aff = ids.slice(0, RARITY[rar].aff).map((a) => ({ id: a, v: AFFIXES[a].roll ? AFFIXES[a].roll(rng) : 0 }));
  return makeItem(id, ilvl, rar, aff);
}
function shopPrice(it) { return round((40 + it.lvl * 38) * [1, 1.4, 2, 3][it.rar] * (it.def.kind === 'skill' ? 0.9 : 1)); }
const hasAff = (it, id) => it && it.aff.some((a) => a.id === id);
const affV = (it, id) => { const a = it && it.aff.find((x) => x.id === id); return a ? a.v : 0; };
function itemDesc(it) {
  const lines = [it.def.desc];
  for (const a of it.aff) lines.push('{y}\u2022 ' + AFFIXES[a.id].desc.replace('{v}', a.v) + '{/}');
  return lines;
}
function itemDps(it) {
  const d = it.def;
  if (d.kind === 'melee') {
    let tot = 0, fr = 0;
    for (const m of d.moves) { tot += m.dmg; fr += m.w + (m.a > 100 ? 8 : m.a) + m.r; }
    return round(it.dmg * tot / fr * 60 * (1 + 0.15 * Run.stats[d.stat]));
  }
  return round(it.dmg * (1 + 0.15 * Run.stats[d.stat]));
}
// ---------------- icons ----------------
const SKILL_ICONS = {
  firecracker: (c) => { R(c, 4, 6, 8, 5, C.rd2); R(c, 4, 6, 8, 1, C.rd3); R(c, 7, 6, 2, 5, C.yl1); LINE(c, 12, 8, 14, 4, C.br4); PX(c, 14, 3, C.yl1); PX(c, 15, 2, C.or2); },
  mousetrap: (c) => { R(c, 1, 9, 14, 4, C.br3); R(c, 1, 9, 14, 1, C.br4); LINE(c, 3, 8, 10, 8, C.st4); LINE(c, 10, 8, 10, 3, C.st4); R(c, 11, 7, 3, 2, C.yl1); },
  bricks: (c) => { R(c, 2, 8, 7, 4, C.rd2); R(c, 3, 6, 2, 2, C.rd2); R(c, 6, 6, 2, 2, C.rd2); R(c, 8, 10, 7, 4, C.tl2); R(c, 9, 8, 2, 2, C.tl2); R(c, 12, 8, 2, 2, C.tl2); },
  cushion: (c) => { ELL(c, 8, 9, 6, 4, C.pk1); ELL(c, 7, 8, 4, 2, C.pk2); R(c, 13, 9, 3, 2, C.pk0); },
  teeth: (c) => { R(c, 2, 9, 12, 4, C.pk1); R(c, 2, 4, 12, 4, C.pk1); for (let i = 0; i < 5; i++) { R(c, 3 + i * 2, 7, 1, 2, C.wh); } R(c, 14, 6, 2, 2, C.yl0); },
  icecube: (c) => { R(c, 3, 4, 10, 10, C.bl3); R(c, 4, 5, 8, 8, C.tl4); R(c, 5, 6, 2, 2, C.wh); R(c, 3, 4, 10, 1, C.wh); },
  duck: (c) => { ELL(c, 7, 11, 6, 3, C.yl1); DISC(c, 10, 6, 3, C.yl1); R(c, 13, 6, 3, 1, C.or1); PX(c, 11, 5, C.ink); },
  sugar: (c) => { R(c, 4, 4, 9, 9, C.fu4); R(c, 4, 4, 9, 2, C.wh); PX(c, 6, 8, C.fu2); PX(c, 10, 10, C.fu2); PX(c, 9, 6, C.fu2); },
  garlic: (c) => { DISC(c, 8, 9, 5, C.fu4); R(c, 7, 2, 2, 4, C.gr3); LINE(c, 8, 5, 8, 13, C.fu2); PX(c, 5, 9, C.fu2); PX(c, 11, 9, C.fu2); },
  bubble: (c) => { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { DISC(c, 5 + a * 6, 5 + b * 6, 3, C.tl4); PX(c, 4 + a * 6, 4 + b * 6, C.wh); } },
};
function itemIcon(def) {
  if (def.kind === 'skill') return iconSprite('s_' + def.id, SKILL_ICONS[def.id]);
  if (def.id === 'spaghetti') return iconSprite('w_spag', (c) => { for (let i = 0; i < 12; i++) PX(c, 3 + i, 12 - i + round(sin(i) * 1.5), i % 2 ? C.yl1 : C.yl0); LINE(c, 2, 13, 4, 11, C.br2, 2); });
  return weaponIcon(def.shape, def.id);
}

// ---------------- damage ----------------
function statMul(it) { return 1 + 0.15 * Run.stats[it.def.stat]; }
function calcDmg(p, it, mult, e, crit) {
  let d = it.dmg * mult * statMul(it);
  for (const a of it.aff) {
    if (a.id === 'dmg') d *= 1 + a.v / 100;
    else if (a.id === 'boss' && e && (e.boss || e.elite)) d *= 1 + a.v / 100;
    else if (a.id === 'fullhp' && p.hp >= p.maxHp) d *= 1 + a.v / 100;
    else if (a.id === 'crowd') { let n = 0; for (const o of lv.enemies) if (!o.dead && dist(o.cx, o.cy, p.cx, p.cy) < 90) n++; d *= 1 + (a.v / 100) * min(5, n); }
  }
  if (p.buffs.sass) d *= 1.3;
  if (Run.quirks.includes('adrenaline') && p.hp < p.maxHp * 0.3) d *= 1.5;
  if (Run.quirks.includes('combo') && p.comboStacks) d *= 1 + 0.08 * p.comboStacks;
  if (Run.quirks.includes('glass')) d *= 1.35;
  if (crit) d *= it.def.critMult || 2;
  return max(1, round(d * rnd(0.93, 1.07)));
}
function stompDamage() {
  const base = 16 * (1 + 0.6 * (Run.biome())) * (1 + 0.05 * (Run.stats.fury + Run.stats.grit));
  return round(base * (Run.quirks.includes('pointyhat') ? 3 : 1));
}
function attackSpeed(p, it) {
  let s = 1 + affV(it, 'speed') / 100;
  if (p.buffs.sugar) s *= 1.35;
  return s;
}
function cooldownOf(it) {
  let c = it.def.cd || 0;
  c *= 1 - affV(it, 'cdr') / 100;
  if (Run.quirks.includes('efficient')) c *= 0.8;
  return round(c);
}
function onDealt(p, it, e, dmg, crit) {
  if (p.rally > 0) { const back = min(p.rally, dmg * 0.25); p.hp = min(p.maxHp, p.hp + back); p.rally -= back; }
  if (!it) return;
  it.hits++;
  if (hasAff(it, 'burn') || it.def.burn) e.addStatus('burn', it.def.burn || 150);
  if (hasAff(it, 'poison')) e.addStatus('poison', 240);
  if (hasAff(it, 'freeze') && crit) e.addStatus('freeze', 90);
  if (hasAff(it, 'gold') && chance(0.25)) dropCoins(e.cx, e.y, 1);
  if (it.def.lifesteal) p.heal(max(1, dmg * it.def.lifesteal), false);
}
function onKill(e, src) {
  if (!pl) return;
  const it = src && src.def ? src : null;
  if (hasAff(it, 'killheal')) pl.heal(pl.maxHp * affV(it, 'killheal') / 100, true);
  if (hasAff(it, 'boom')) explode(e.cx, e.cy, 36, calcDmg(pl, it, 0.8, e, false), { team: 'p', confetti: true });
  if (Run.quirks.includes('necro')) pl.heal(max(1, pl.maxHp * 0.02), false);
  if (Run.quirks.includes('combo')) { pl.comboStacks = min(5, (pl.comboStacks || 0) + 1); pl.buffs.comboT = 180; }
}
function isCrit(p, A, e) {
  const d = A.it.def, mv = A.mv;
  if (mv && mv.crit) return true;
  if (e.status.freeze) return true;
  if (d.critTip && abs(e.cx - p.cx) > (mv ? mv.reach : 50) * 0.62) return true;
  if (d.critBack && e.face === p.face && (e.cx - p.cx) * p.face > 0) return true;
  if (d.critBurning && e.status.burn) return true;
  if (d.critStunned && (e.status.stun || e.status.freeze || e.state === 'stun')) return true;
  if (d.critEvery && A.it.hits % d.critEvery === d.critEvery - 1) return true;
  if (d.critAfterDodge && p.t - (p.lastDodge || -999) < 90) return true;
  if (p.buffs.riposte) return true;
  let ch = affV(A.it, 'crit') / 100;
  if (Run.quirks.includes('lucky')) ch += 0.1;
  return Math.random() < ch;
}

// ---------------- using items ----------------
function tryUse(p, idx) {
  const it = p.slots[idx];
  if (!it || p.state !== 'move') return false;
  const d = it.def;
  if (d.kind === 'melee') {
    if (p.act) {
      if (p.act.it === it && p.act.kind === 'melee' && p.act.phase === 'r' && p.act.t >= 2) { startMelee(p, it, (p.act.mi + 1) % d.moves.length); return true; }
      return false;
    }
    startMelee(p, it, it.comboT > 0 ? it.combo % d.moves.length : 0);
    return true;
  }
  if (d.kind === 'ranged') {
    if (it.cd > 0) return false;
    if (p.act && !(p.act.kind === 'shoot' && p.act.phase === 'r')) return false;
    p.act = { kind: 'shoot', it, phase: 'w', t: 0, w: d.wind || 4, r: d.auto ? 6 : 12, moveMul: d.auto ? 0.45 : 0.5, canTurn: true, airHang: 0.6, key: SLOT_KEYS[idx] };
    return true;
  }
  if (d.kind === 'skill') {
    if (it.cd > 0) { if (Input.p(SLOT_KEYS[idx])) { sfx('deny'); } return false; }
    if (p.act) return false;
    useSkill(p, it);
    it.cd = cooldownOf(it);
    p.act = { kind: 'skill', it, phase: 'r', t: 0, r: 14, moveMul: 0.6, canTurn: true };
    Run.skillsUsed++;
    return true;
  }
  return false;
}
function startMelee(p, it, mi) {
  const mv = it.def.moves[mi];
  const sp = attackSpeed(p, it);
  if (Input.d('left') || Input.d('right')) p.face = Input.d('right') ? 1 : -1;
  p.act = { kind: 'melee', it, mi, mv, phase: 'w', t: 0, w: max(1, round(mv.w / sp)), a: mv.a > 100 ? 999 : max(2, round(mv.a / sp)), r: max(2, round(mv.r / sp)), hit: new Set(), moveMul: 0.18, canTurn: false, airHang: 0.3, key: SLOT_KEYS[p.slots.indexOf(it)] };
  it.combo = (mi + 1) % it.def.moves.length;
  it.comboT = 50;
}
function meleeBox(p, mv) {
  const back = mv.back, reach = mv.reach;
  const x = p.face > 0 ? p.cx - back : p.cx - reach;
  return { x, y: p.cy + (mv.yo || 0) - mv.hh / 2, w: reach + back, h: mv.hh };
}
function updateAct(p) {
  const A = p.act;
  A.t++;
  for (const s of p.slots) if (s && s.comboT > 0 && s !== A.it) s.comboT--;
  if (A.kind === 'melee') {
    if (A.phase === 'w') {
      if (A.t >= A.w) {
        A.phase = 'a'; A.t = 0;
        p.vx += p.face * A.mv.lunge * (p.onGround ? 1 : 0.6);
        if (!p.onGround && p.vy > 0) p.vy *= 0.4;
        sfx(A.mv.sfx, p.cx);
      }
    } else if (A.phase === 'a') {
      if (A.it.def.drill) {
        if (A.t % 10 === 1) A.hit.clear();
        if (A.t % 8 === 0) sfx('thrust', p.cx);
        if (!Input.d(A.key) || A.t > 600) { A.phase = 'r'; A.t = 0; }
      }
      meleeHits(p, A);
      if (A.mv.quake && A.t === 1 && p.onGround) {
        lv.projs.push(new Proj(p.cx + p.face * 10, p.bot - 6, p.face * 3.2, 0, { team: 'p', kind: 'wave', dmg: calcDmg(p, A.it, 0.8, null, false), life: 40, w: 10, h: 10, pierce: 99, ground: true }));
        FX.shake(0.25);
      }
      if (A.t >= A.a) { A.phase = 'r'; A.t = 0; }
    } else if (A.t >= A.r) {
      p.act = null;
      A.it.comboT = 22;
    }
  } else if (A.kind === 'shoot') {
    if (A.phase === 'w') {
      if (A.t >= A.w) { fireRanged(p, A.it); A.it.cd = cooldownOf(A.it); A.phase = 'r'; A.t = 0; }
    } else if (A.t >= A.r) {
      if (A.it.def.auto && Input.d(A.key)) { if (A.it.cd <= 0) { fireRanged(p, A.it); A.it.cd = cooldownOf(A.it); } A.t = A.r - 1; }
      else p.act = null;
    }
  } else if (A.kind === 'skill') {
    if (A.t >= A.r) p.act = null;
  } else if (A.kind === 'block') {
    if (A.t % 30 === 0) sfx('block', p.cx);
  }
}
function meleeHits(p, A) {
  const mv = A.mv, box = meleeBox(p, mv);
  for (const e of lv.enemies) {
    if (e.dead || A.hit.has(e) || e.intangible || !overlap(box, e)) continue;
    A.hit.add(e);
    const crit = isCrit(p, A, e);
    const dmg = calcDmg(p, A.it, mv.dmg, e, crit);
    const dealt = e.hurt(dmg, p, { kb: mv.kb * (crit ? 1.4 : 1), crit, launchY: mv.launch, stun: mv.stun, src: A.it, dir: p.face, billiard: A.it.def.billiard || hasAff(A.it, 'launch') });
    if (dealt) onDealt(p, A.it, e, dealt, crit);
    if (!A.connected) { A.connected = true; FX.stop(crit ? 6 : 3); FX.shake(crit ? 0.22 : 0.1); }
  }
  for (const it of lv.items) if (it.prop && !it.dead && !A.hit.has(it) && overlap(box, it)) { A.hit.add(it); it.hurt(); }
  if (A.t === 1) hitTilesInBox(box.x, box.y, box.w, box.h);
  for (const pr of lv.projs) if (pr.team === 'e' && pr.breakable && overlap(box, pr)) { pr.kill(); sparks(pr.cx, pr.cy, 5, C.yl1); sfx('block', pr.cx); }
}
function shieldHold(p, it, idx, held) {
  if (held && !p.act && p.state === 'move' && p.healT <= 0) { p.act = { kind: 'block', it, t: 0, moveMul: 0.3, canTurn: false, phase: 'b' }; sfx('block', p.cx); }
  else if (!held && p.act && p.act.kind === 'block' && p.act.it === it) p.act = null;
}
function shieldBlock(p, dmg, src, o) {
  const A = p.act, it = A.it;
  if (A.t <= 14) {
    sfx('parry', p.cx); FX.stop(9); FX.flash(0.3, '#fff'); FX.shake(0.3);
    ringFx(p.cx + p.face * 8, p.cy, C.yl1, 26, 12, 2); sparks(p.cx + p.face * 8, p.cy, 12, C.yl1);
    FText.add(p.cx, p.y - 12, 'PARRY!', C.yl1, { sc: 2, life: 50 });
    if (src instanceof Proj) { src.team = 'p'; src.vx = -src.vx * 1.4; src.vy = -abs(src.vy) * 0.5 - 1; src.dmg = calcDmg(p, it, 2, null, true); src.hit = new Set(); src.life = 90; src.reflected = true; }
    else if (src && src.hurt) { const d = calcDmg(p, it, 2.2, src, true); src.hurt(d, p, { crit: true, stun: 100, kb: 4, src: it }); }
    if (it.id === 'potlid') { ringFx(p.cx, p.cy, C.fu4, 60, 16, 2); for (const e of lv.enemies) if (!e.dead && dist(e.cx, e.cy, p.cx, p.cy) < 64) e.hurt(calcDmg(p, it, 1, e, false), p, { kb: 4, stun: 60 }); }
    p.inv = 24; A.t = 15;
    Run.parries++;
    return true;
  }
  if (src instanceof Proj) src.blocked = true;
  sfx('block', p.cx); sparks(p.cx + p.face * 7, p.cy, 6, C.fu4, { dir: p.face > 0 ? 0 : PI, spread: 1 });
  p.vx = -p.face * 1.6;
  const taken = round(dmg * (it.id === 'potlid' ? 0.12 : 0.25) * SPICE[Run.spice].dmgTaken);
  if (taken > 0) { p.hp -= taken; FText.add(p.cx, p.y - 6, '-' + taken, C.st4, { f: '3', dmg: true }); if (p.hp <= 0) p.die(); }
  p.inv = 10;
  return true;
}
function actPose(p, P) {
  const A = p.act;
  if (A.kind === 'melee') {
    const mv = A.mv;
    if (mv.fx === 'thrust' || mv.fx === 'drill' || mv.fx === 'whip') {
      P.hand = A.phase === 'w' ? [-2, -7] : A.phase === 'a' ? [7, -7] : [5, -7];
      P.lean = A.phase === 'a' ? 1 : A.phase === 'w' ? -1 : 0;
    } else if (mv.fx === 'smash') {
      P.hand = A.phase === 'w' ? [-2, -13] : A.phase === 'a' ? [6, -5] : [5, -5];
      P.lean = A.phase === 'w' ? -1 : 1; P.crouch = A.phase === 'a' ? 1 : 0;
    } else {
      const up = mv.a0 < 0;
      P.hand = A.phase === 'w' ? (up ? [-1, -11] : [2, -3]) : A.phase === 'a' ? [6, -7] : (up ? [5, -5] : [5, -9]);
      P.lean = A.phase === 'a' ? 1 : 0;
    }
    P.eye = 'angry'; P.earBack = 1;
  } else if (A.kind === 'shoot') { P.hand = [6, -8]; P.eye = 'angry'; }
  else if (A.kind === 'block') { P.hand = [5, -7]; P.crouch = 1; P.eye = 'angry'; }
  else if (A.kind === 'skill') { P.hand = A.t < 6 ? [-2, -12] : [6, -10]; }
}
function handWorld(p, P) { return [p.cx + P.hand[0] * p.face, p.bot + P.hand[1]]; }
const wAng = (p, a) => (p.face > 0 ? a : PI - a);
function drawAct(p) {
  const A = p.act, P = p.pose();
  const [hx, hy] = handWorld(p, P);
  const it = A.it, d = it.def;
  const col = STATS[d.stat].col;
  if (A.kind === 'melee') {
    const mv = A.mv;
    let ang;
    const pr = A.phase === 'w' ? 0 : A.phase === 'a' ? clamp(A.t / A.a, 0, 1) : 1;
    if (mv.fx === 'slash' || mv.fx === 'slash2' || mv.fx === 'smash') {
      const pull = A.phase === 'w' ? (mv.a0 < 0 ? -0.5 : 0.5) * (A.t / A.w) : 0;
      ang = A.phase === 'w' ? mv.a0 + pull : lerp(mv.a0, mv.a1, ease.outQuad(pr));
      if (A.phase !== 'w' && (A.phase === 'a' || A.t < 4)) {
        const fade = A.phase === 'a' ? 1 : 1 - A.t / 4;
        const a0 = mv.a0, a1 = lerp(mv.a0, mv.a1, ease.outQuad(pr));
        const lo = min(a0, a1), hi = max(a0, a1);
        const R1 = mv.reach - 2, cxw = p.cx, cyw = p.cy + (mv.yo || 0);
        const wa0 = p.face > 0 ? lo : PI - hi, wa1 = p.face > 0 ? hi : PI - lo;
        g.globalAlpha = 0.85 * fade;
        ARC(g, cxw, cyw, R1 * 0.45, R1, wa0, wa1, col);
        g.globalAlpha = 0.95 * fade;
        ARC(g, cxw, cyw, R1 * 0.72, R1 + 1, wa0, wa1, '#fff8ee');
        g.globalAlpha = 1;
      }
      drawShape(g, hx, hy, wAng(p, ang), SHAPES[d.shape]);
    } else if (mv.fx === 'thrust' || mv.fx === 'drill') {
      ang = mv.a0;
      const ext = A.phase === 'w' ? -3 : A.phase === 'a' ? 6 : 3;
      const wx = hx + p.face * ext;
      drawShape(g, wx, hy, wAng(p, ang + (mv.fx === 'drill' ? sin(A.t * 2) * 0.08 : 0)), SHAPES[d.shape]);
      if (A.phase === 'a' || (A.phase === 'r' && A.t < 3)) {
        const tipx = p.cx + p.face * mv.reach, y = p.cy + (mv.yo || 0) + sin(ang) * 6;
        g.globalAlpha = A.phase === 'a' ? 0.9 : 0.4;
        POLY(g, [wx, y - 3, tipx, y, wx, y + 3], col);
        LINE(g, wx, y, tipx, y, '#fff8ee');
        g.globalAlpha = 1;
        if (mv.fx === 'drill' && A.t % 3 === 0) sparks(tipx, y, 1, C.yl1, { dir: p.face > 0 ? PI : 0, spread: 0.8 });
      }
    } else if (mv.fx === 'whip') {
      const len = A.phase === 'w' ? 6 : A.phase === 'a' ? lerp(10, mv.reach, ease.outQuad(pr)) : lerp(mv.reach, 8, A.t / A.r);
      let px0 = hx, py0 = hy;
      for (let i = 1; i <= 12; i++) {
        const tt = i / 12;
        const x = hx + p.face * len * tt, y = hy + (mv.yo || 0) * tt + sin(tt * 9 - A.t * 0.9) * (A.phase === 'a' ? 3 : 2) * tt;
        OLINE(g, px0, py0, x, y, i % 2 ? C.yl1 : C.yl0, 1);
        px0 = x; py0 = y;
      }
      if (A.phase === 'a') DISC(g, px0, py0, 2, '#fff8ee');
    }
  } else if (A.kind === 'shoot') {
    const kick = A.phase === 'r' ? max(0, 3 - A.t) : 0;
    drawShape(g, hx - p.face * kick, hy, wAng(p, -0.05), SHAPES[d.shape]);
  } else if (A.kind === 'block') {
    const [sx, sy] = [hx + p.face * 2, hy + 1];
    drawShape(g, sx, sy, wAng(p, 0), SHAPES[d.shape]);
    if (A.t <= 14) glow(sx + p.face * 3, sy, 10, C.yl1, 0.5);
  } else if (A.kind === 'skill' && A.t < 8) {
    spr(itemIcon(d), hx, hy + 6, p.face < 0);
  }
}
function drawIdleWeapon(p) {
  const it = p.slots[0];
  if (!it || it.def.kind === 'skill') return;
  const P = p.pose();
  const [hx, hy] = handWorld(p, P);
  const a = it.def.kind === 'shield' ? 0 : it.def.kind === 'ranged' ? 0.5 : -1.1 + sin(p.t * 0.05) * 0.05;
  if (it.def.id === 'spaghetti') { for (let i = 0; i < 6; i++) PX(g, hx + p.face * i, hy + 1 + i * 0.7 + sin(p.t * 0.1 + i), C.yl1); return; }
  drawShape(g, hx, hy, wAng(p, a), SHAPES[it.def.shape]);
  if (it.def.id === 'match') {
    const [tx, ty] = AXP(hx, hy, wAng(p, a), 12, 0);
    flame(tx, ty - 2, 1);
  }
}
function flame(x, y, s = 1) {
  const f = floor(Game.frame / 3) % 3;
  POLY(g, [x - 2 * s, y + 2, x + 2 * s, y + 2, x + (f - 1) * 0.5, y - (5 + f) * s], C.or2);
  POLY(g, [x - 1, y + 2, x + 1, y + 2, x, y - 3 * s], C.yl1);
  Light.add(x, y, 40 * s, '#ffa040', 0.5);
  glow(x, y, 6 * s, C.or1, 0.4);
}

// ---------------- ranged ----------------
function fireRanged(p, it) {
  const d = it.def, f = p.face;
  const x = p.cx + f * 8, y = p.cy - 2;
  const dmg = (crit) => calcDmg(p, it, 1, null, crit);
  const base = { team: 'p', src: it };
  switch (d.id) {
    case 'slingshot': lv.projs.push(new Proj(x, y, f * 6.5, -0.4, Object.assign({}, base, { kind: 'pebble', dmg: dmg(false), grav: 0.05, life: 70 }))); sfx('twang', x); break;
    case 'crossbow': {
      const crit = p.t - it.lastShot > 110;
      lv.projs.push(new Proj(x, y, f * 8.5, 0, Object.assign({}, base, { kind: 'tack', dmg: dmg(crit), crit, pierce: 99, life: 60, w: 8, h: 4 })));
      it.lastShot = p.t; sfx('twang', x); if (crit) sparks(x, y, 4, C.yl1);
      break;
    }
    case 'straw': lv.projs.push(new Proj(x, y, f * 6, rnd(-0.6, 0.6), Object.assign({}, base, { kind: 'pea', dmg: dmg(false), slow: 60, life: 50, w: 4, h: 4 }))); sfx('pea', x); break;
    case 'boomerang': lv.projs.push(new Proj(x, y, f * 6, 0, Object.assign({}, base, { kind: 'boomerang', dmg: dmg(false), pierce: 99, life: 120, noclip: true, ret: true, w: 10, h: 10 }))); sfx('whoosh', x); break;
    case 'hotsauce': for (let i = 0; i < 2; i++) lv.projs.push(new Proj(x, y, f * rnd(3.5, 4.8), rnd(-0.8, 0.5), Object.assign({}, base, { kind: 'sauce', dmg: dmg(false), burn: 120, pierce: 2, life: rndi(14, 20), w: 6, h: 6, grav: 0.05 }))); if (p.t % 4 === 0) sfx('fire', x); break;
    case 'cork': lv.projs.push(new Proj(x, y, f * 6, -0.5, Object.assign({}, base, { kind: 'corkp', dmg: dmg(false), kb: 6, bounce: 3, grav: 0.08, life: 120, w: 6, h: 6 }))); sfx('pop', x); FX.shake(0.08); p.vx -= f * 1.2; break;
  }
  Run.shots++;
}
class Proj extends Ent {
  constructor(x, y, vx, vy, o) {
    super(x - (o.w || 6) / 2, y - (o.h || 6) / 2, o.w || 6, o.h || 6);
    Object.assign(this, { team: 'p', dmg: 5, kind: 'pebble', life: 90, pierce: 1, grav: 0, bounce: 0, kb: 1.6 }, o);
    this.vx = vx; this.vy = vy; this.hit = new Set(); this.max = this.life;
    this.breakable = o.breakable !== undefined ? o.breakable : this.team === 'e';
  }
  kill() {
    if (this.dead) return;
    this.dead = true;
    const k = this.kind;
    if (this.onDie) this.onDie(this);
    if (k === 'cheese' || k === 'meat') debris(this.cx, this.cy, 5, [C.yl1, C.yl0], { sp: 1.5 });
    else if (k === 'web') puff(this.cx, this.cy, 4, C.fu4);
    else if (k === 'icecube' || k === 'shard') sparks(this.cx, this.cy, 5, C.tl4);
    else sparks(this.cx, this.cy, 3, C.fu4, { max: 2 });
  }
  update() {
    this.t++;
    if (--this.life <= 0) return this.kill();
    const k = this.kind;
    if (this.ret) {
      if (this.t > 22) {
        const dx = pl.cx - this.cx, dy = pl.cy - this.cy, d = hypot(dx, dy) || 1;
        this.vx = lerp(this.vx, (dx / d) * 7, 0.12); this.vy = lerp(this.vy, (dy / d) * 7, 0.12);
        if (d < 10) { this.dead = true; sfx('pickup'); return; }
        if (this.t === 23) this.hit.clear();
      } else this.vx *= 0.97;
    }
    if (this.homing && this.t > 10) {
      const tg = this.team === 'e' ? pl : null;
      if (tg) { const a = atan2(tg.cy - this.cy, tg.cx - this.cx), sp = hypot(this.vx, this.vy); const cur = atan2(this.vy, this.vx); const na = cur + clamp(((a - cur + PI * 3) % TAU) - PI, -this.homing, this.homing); this.vx = cos(na) * sp; this.vy = sin(na) * sp; }
    }
    this.vy += this.grav;
    if (this.ground) {
      this.x += this.vx;
      if (rectSolid(this.x, this.y, this.w, this.h) || !rectSolid(this.x + this.w / 2, this.bot + 2, 1, 2)) return this.kill();
      if (this.t % 2 === 0) debris(this.cx, this.bot - 1, 1, [C.st3, C.fu3], { sp: 1, vy: -1 });
    } else if (this.noclip) { this.x += this.vx; this.y += this.vy; }
    else {
      const nx = this.x + this.vx, ny = this.y + this.vy;
      if (rectSolid(nx, this.y, this.w, this.h)) {
        if (this.bounce > 0) { this.bounce--; this.vx = -this.vx * 0.8; sfx('bonk', this.cx); } else { if (this.team === 'p') hitTilesInBox(nx, this.y, this.w, this.h); return this.kill(); }
      } else this.x = nx;
      if (rectSolid(this.x, ny, this.w, this.h)) {
        if (this.bounce > 0 || this.bouncy) { if (this.bounce > 0) this.bounce--; this.vy = -this.vy * 0.75; if (abs(this.vy) < 1) this.vy = -3; if (this.onBounce) this.onBounce(this); }
        else { if (this.stick) { this.vx = 0; this.vy = 0; this.grav = 0; this.stuck = true; } else return this.kill(); }
      } else this.y = ny;
    }
    this.trail();
    if (this.team === 'p') {
      for (const e of lv.enemies) {
        if (e.dead || this.hit.has(e) || e.intangible || !overlap(this, e)) continue;
        this.hit.add(e);
        let crit = this.crit || (e.status.freeze ? true : false);
        if (this.src && this.src.def && !crit) crit = Math.random() < affV(this.src, 'crit') / 100 + (Run.quirks.includes('lucky') ? 0.1 : 0);
        const dmg = crit && !this.crit ? this.dmg * 2 : this.dmg;
        const dealt = e.hurt(dmg, this, { kb: this.kb, crit, dir: sign(this.vx) || 1, src: this.src, burn: this.burn, slow: this.slow });
        if (dealt && this.src && this.src.def) onDealt(pl, this.src, e, dealt, crit);
        if (this.onHit) this.onHit(this, e);
        if (--this.pierce <= 0) return this.kill();
      }
      for (const it of lv.items) if (it.prop && !it.dead && overlap(this, it)) { it.hurt(); if (--this.pierce <= 0) return this.kill(); }
    } else if (pl && !pl.dead && overlap(this, pl)) {
      const r = pl.hurt(this.dmg, this, { cause: this.cause, kb: this.kb, burn: this.burn });
      if (this.reflected) return;
      if (r || this.blocked) { if (this.slowP) pl.buffs.slowed = this.slowP; return this.kill(); }
    }
  }
  trail() {
    const k = this.kind;
    if (k === 'sauce' && this.t % 2 === 0) Parts.add({ k: 2, x: this.cx, y: this.cy, s: 2, c: pick([C.rd2, C.or1, C.rd3]), life: 10, a: 0.8, gr: -0.02 });
    if ((k === 'firecracker') && this.t % 2 === 0) sparks(this.cx, this.y, 1, C.yl1, { dir: -PI / 2, spread: 1, min: 0.5, max: 1.5 });
    if (k === 'fire' && this.t % 2 === 0) Parts.add({ k: 2, x: this.cx, y: this.cy, s: 2.5, c: pick([C.or2, C.rd3, C.yl1]), life: 12, a: 0.9, gr: -0.04 });
    if (this.reflected && this.t % 2 === 0) Parts.add({ k: 0, x: this.cx, y: this.cy, s: 1, c: C.yl1, life: 8 });
  }
  draw() {
    const x = round(this.cx), y = round(this.cy), k = this.kind, f = this.vx >= 0 ? 1 : -1;
    switch (k) {
      case 'pebble': DISC(g, x, y, 2, C.ink); DISC(g, x, y, 1, C.st4); PX(g, x - 1, y - 1, C.fu4); break;
      case 'tack': OLINE(g, x - f * 4, y, x + f * 3, y, C.st5); R(g, x - f * 4 - 1, y - 2, 2, 5, this.crit ? C.yl1 : C.rd2); break;
      case 'pea': DISC(g, x, y, 2, C.ink); DISC(g, x, y, 1, C.gr3); PX(g, x, y - 1, C.gr4); break;
      case 'boomerang': { const a = this.t * 0.5; drawShape(g, x, y, a, SHAPES.boomerang, 0.9); break; }
      case 'sauce': DISC(g, x, y, 2, C.rd2); PX(g, x, y - 1, C.or2); break;
      case 'corkp': R(g, x - 3, y - 3, 6, 6, C.ink); R(g, x - 2, y - 2, 4, 4, C.br4); PX(g, x - 1, y - 1, C.br5); break;
      case 'firecracker': R(g, x - 3, y - 2, 6, 4, C.ink); R(g, x - 2, y - 1, 4, 2, C.rd2); PX(g, x, y - 3, C.yl1); break;
      case 'icecube': R(g, x - 4, y - 4, 8, 8, C.ink); R(g, x - 3, y - 3, 6, 6, C.tl4); PX(g, x - 2, y - 2, C.wh); break;
      case 'tackb': OLINE(g, x - 2, y - 2, x + 2, y + 2, C.st5); break;
      case 'wave': {
        const h = 8 + sin(this.t * 0.8) * 2;
        POLY(g, [x - 6, this.bot, x + 6, this.bot, x + f * 2, this.bot - h], this.team === 'p' ? C.fu4 : C.rd3);
        POLY(g, [x - 3, this.bot, x + 3, this.bot, x + f, this.bot - h * 0.6], this.team === 'p' ? C.wh : C.yl1);
        break;
      }
      case 'cheese': R(g, x - 3, y - 3, 7, 6, C.ink); R(g, x - 2, y - 2, 5, 4, C.yl1); PX(g, x, y - 1, C.or2); break;
      case 'web': DISC(g, x, y, 3, C.fu3); PX(g, x - 1, y - 1, C.wh); break;
      case 'corke': R(g, x - 2, y - 2, 5, 4, C.ink); R(g, x - 1, y - 1, 3, 2, C.br4); break;
      case 'cleaver': { const a = this.stuck ? 0.6 : this.t * 0.45; g.save(); g.translate(x, y); g.rotate(a); R(g, -5, -4, 9, 7, C.ink); R(g, -4, -3, 7, 5, C.st4); R(g, -4, -3, 7, 1, C.wh); R(g, 3, -1, 4, 2, C.br1); g.restore(); break; }
      case 'dust': DISC(g, x, y, 4, C.st3); DISC(g, x - 1, y - 1, 2, C.st4); PX(g, x - 2, y - 1, C.ink); PX(g, x + 1, y - 1, C.ink); break;
      case 'salt': R(g, x - 1, y - 1, 2, 2, C.wh); break;
      case 'fedora': { g.save(); g.translate(x, y); g.rotate(this.t * 0.4); R(g, -7, 0, 14, 2, C.ink); R(g, -4, -4, 8, 4, C.ink); R(g, -6, 0, 12, 1, C.br1); R(g, -3, -3, 6, 3, C.br1); R(g, -3, -1, 6, 1, C.rd1); g.restore(); break; }
      case 'pancake': R(g, x - 7, y - 2, 14, 5, C.ink); R(g, x - 6, y - 1, 12, 3, C.br4); R(g, x - 4, y - 1, 6, 1, C.yl1); break;
      case 'hairball': DISC(g, x, y, 6, C.ink); DISC(g, x, y, 5, C.or0); for (let i = 0; i < 4; i++) PX(g, x + cos(this.t * 0.2 + i) * 3, y + sin(this.t * 0.2 + i) * 3, C.or1); break;
      case 'shard': POLY(g, [x - 2, y + 2, x + 2, y + 2, x, y - 3], C.tl3); break;
      case 'leaf': DISC(g, x, y, 2, C.gr3); PX(g, x, y, C.gr4); break;
      case 'spark': PX(g, x, y, C.yl2); glow(x, y, 4, C.yl1, 0.6); break;
      case 'fire': DISC(g, x, y, 3, C.or2); DISC(g, x, y, 1, C.yl1); break;
      case 'knife': OLINE(g, x - f * 5, y, x + f * 4, y, C.st5); R(g, x - f * 6 - 1, y - 1, 3, 3, C.br1); break;
      case 'bigslime': DISC(g, x, y, 5, C.ink); DISC(g, x, y, 4, C.yl1); PX(g, x - 1, y - 2, C.yl2); break;
      case 'mug': R(g, x - 5, y - 5, 10, 10, C.ink); R(g, x - 4, y - 4, 8, 8, C.rd2); R(g, x + 4, y - 2, 3, 4, C.ink); PX(g, x - 2, y - 3, C.rd3); break;
      default: DISC(g, x, y, 2, this.team === 'e' ? C.rd3 : C.fu4);
    }
    if (this.team === 'e' && k !== 'wave') glow(x, y, 7, C.rd2, 0.15);
  }
}
function explode(x, y, r, dmg, o = {}) {
  sfx(o.small ? 'pop' : 'explode', x);
  FX.shake(o.small ? 0.2 : 0.45); FX.stop(o.small ? 2 : 4);
  ringFx(x, y, o.col || C.yl1, r, 14, 2);
  Parts.add({ k: 3, x, y, s: 4, grow: r * 0.6, c: '#fff8e0', life: 8, th: 3, top: true });
  if (o.confetti) confetti(x, y, 24);
  for (let i = 0; i < 10; i++) Parts.add({ k: 2, x: x + rnd(-r / 3, r / 3), y: y + rnd(-r / 3, r / 3), vx: rnd(-1, 1), vy: rnd(-1.2, 0.2), s: rnd(3, 6), c: pick(o.ice ? [C.tl4, C.bl3, C.wh] : [C.or2, C.yl1, C.rd3, C.st3]), life: rndi(14, 26), gr: -0.02, a: 0.9, top: true });
  sparks(x, y, 10, o.ice ? C.tl4 : C.yl1, { max: 5 });
  Light.add(x, y, r * 3, o.ice ? '#a0e0ff' : '#ffb050', 1);
  if (o.team === 'e') {
    if (pl && dist(pl.cx, pl.cy, x, y) < r + 4) pl.hurt(dmg, { cx: x, cy: y }, { cause: o.cause || 'an explosion', kb: 4 });
    for (const e of lv.enemies) if (!e.dead && !e.boss && dist(e.cx, e.cy, x, y) < r) e.hurt(dmg * 0.5, { cx: x }, { kb: 3 });
  } else {
    for (const e of lv.enemies) {
      if (e.dead || dist(e.cx, e.cy, x, y) > r + e.w / 2) continue;
      const dealt = e.hurt(dmg, { cx: x, cy: y, team: 'p' }, { kb: o.kb || 3.5, launchY: -3, dir: sign(e.cx - x) || 1, crit: e.status.freeze ? true : false, burn: o.burn, src: o.src });
      if (o.freeze) e.addStatus('freeze', o.freeze);
      if (dealt && o.src) onDealt(pl, o.src, e, dealt, false);
    }
    for (const it of lv.items) if (it.prop && !it.dead && dist(it.cx, it.cy, x, y) < r) it.smash();
    hitTilesInBox(x - r / 2, y - r / 2, r, r);
  }
}

// ---------------- skills ----------------
function useSkill(p, it) {
  const f = p.face, d = calcDmg(p, it, 1, null, false);
  switch (it.id) {
    case 'firecracker':
      lv.projs.push(new Proj(p.cx + f * 6, p.y + 2, f * 3.6 + p.vx * 0.5, -3.6, { team: 'p', kind: 'firecracker', dmg: 0, grav: 0.22, life: 55, pierce: 1, bouncy: true, src: it, onDie: (pr) => explode(pr.cx, pr.cy, 46, d, { burn: 150, src: it }), onHit: (pr) => { pr.life = 1; } }));
      sfx('whoosh', p.cx); break;
    case 'icecube':
      lv.projs.push(new Proj(p.cx + f * 6, p.y + 2, f * 4.5, -2.5, { team: 'p', kind: 'icecube', dmg: 0, grav: 0.2, life: 60, src: it, onDie: (pr) => { explode(pr.cx, pr.cy, 50, d, { freeze: 170, ice: true, col: C.tl4, small: true, src: it }); sfx('ice', pr.cx); }, onHit: (pr) => { pr.life = 1; } }));
      sfx('whoosh', p.cx); break;
    case 'mousetrap': lv.fx.push(new Gadget('trap', p.cx + f * 14, p.bot, it, d)); sfx('snap', p.cx); break;
    case 'bricks': for (let i = 0; i < 6; i++) { const b = new Gadget('brick', p.cx, p.y, it, d); b.vx = f * rnd(0.5, 3.5) + rnd(-1, 1); b.vy = rnd(-4, -2); lv.fx.push(b); } sfx('bonk', p.cx); break;
    case 'cushion': lv.fx.push(new Gadget('cushion', p.cx + f * 12, p.bot, it, d)); break;
    case 'teeth': { const t = new Gadget('teeth', p.cx + f * 8, p.bot, it, d); t.face = f; lv.fx.push(t); sfx('snap', p.cx); break; }
    case 'duck': lv.fx.push(new Gadget('duck', p.cx + f * 14, p.bot, it, d)); sfx('squeak', p.cx); break;
    case 'sugar': p.buffs.sugar = 360; sfx('levelup'); FText.add(p.cx, p.y - 10, 'SUGAR RUSH!', C.fu4, { sc: 2 }); ringFx(p.cx, p.cy, C.fu4, 30, 14); for (const s of p.slots) if (s && s !== it) s.cd *= 0.5; break;
    case 'garlic': p.buffs.garlic = 360; p.garlicDmg = d; sfx('fart', p.cx); FText.add(p.cx, p.y - 10, 'STINKY', C.gr3); break;
    case 'bubble': p.buffs.bubble = 99999; sfx('pop', p.cx); ringFx(p.cx, p.cy, C.tl4, 14, 12); break;
  }
}
class Gadget extends Ent {
  constructor(kind, x, y, it, dmg) {
    const sz = { trap: [16, 6], brick: [6, 4], cushion: [14, 8], teeth: [12, 9], duck: [12, 11] }[kind];
    super(x - sz[0] / 2, y - sz[1], sz[0], sz[1]);
    this.kind = kind; this.it = it; this.dmg = dmg;
    this.life = { trap: 1200, brick: 480, cushion: 30, teeth: 480, duck: 300 }[kind];
    this.hp = 3; this.used = 0; this.hitCd = new Map();
    this.decoy = kind === 'duck';
  }
  update() {
    this.t++;
    if (--this.life <= 0) return this.expire();
    if (this.kind !== 'teeth') { this.vy = min(this.vy + 0.25, 5); this.vx *= this.onGround ? 0.7 : 0.98; moveBody(this); }
    const k = this.kind;
    if (k === 'trap') {
      for (const e of lv.enemies) if (!e.dead && !e.flying && overlap(this, e)) {
        e.hurt(this.dmg, this, { kb: 0, stun: 120, crit: true, src: this.it }); e.addStatus('root', 150);
        sfx('snap', this.cx); FX.shake(0.25); FText.add(this.cx, this.y - 10, 'SNAP!', C.yl1, { sc: 2 });
        this.dead = true; return;
      }
    } else if (k === 'brick') {
      for (const e of lv.enemies) {
        if (e.dead || e.flying || !overlap(this, e) || (this.hitCd.get(e) || 0) > this.t) continue;
        this.hitCd.set(e, this.t + 50);
        e.hurt(this.dmg, this, { kb: 0, stun: 50, src: this.it });
        e.vy = -3.5; sfx('ow', e.cx);
        if (chance(0.5)) Bubbles.say(e, pick(['OW OW OW', 'MY FOOT', 'WHO LEAVES THESE HERE', 'AAAA']), 60);
        if (++this.used >= 3) { this.dead = true; return; }
      }
    } else if (k === 'cushion') {
      if (this.life === 1) {
        sfx('fart', this.cx); FX.shake(0.2);
        FText.add(this.cx, this.y - 12, 'PFFFFT', C.gr3, { sc: 2, life: 60 });
        for (let i = 0; i < 18; i++) Parts.add({ k: 2, x: this.cx + rnd(-30, 30), y: this.cy + rnd(-20, 6), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0), s: rnd(4, 8), c: pick([C.gr3, C.gr2, C.gr4]), life: rndi(60, 110), a: 0.5, gr: -0.005, top: true });
        for (const e of lv.enemies) if (!e.dead && dist(e.cx, e.cy, this.cx, this.cy) < 76) { e.hurt(this.dmg, this, { kb: 1, src: this.it }); e.stun(e.boss ? 60 : 170); e.addStatus('confuse', 170); }
      }
    } else if (k === 'teeth') {
      this.vy = min(this.vy + 0.25, 5);
      this.vx = this.face * 1.8;
      moveBody(this);
      if (this.hitWall || (this.onGround && !floorAhead(this, this.face, 4))) this.face *= -1;
      if (this.t % 6 === 0) sfx('snap', this.cx);
      for (const e of lv.enemies) {
        if (e.dead || !boxHit(this.x - 4, this.y - 6, this.w + 8, this.h + 8, e) || (this.hitCd.get(e) || 0) > this.t) continue;
        this.hitCd.set(e, this.t + 18);
        e.hurt(this.dmg, this, { kb: 0.8, src: this.it });
      }
    } else if (k === 'duck') {
      if (this.t % 50 === 0) sfx('squeak', this.cx);
      if (this.hp <= 0) this.life = 1;
    }
  }
  expire() {
    this.dead = true;
    if (this.kind === 'duck') explode(this.cx, this.cy, 56, this.dmg, { src: this.it });
    else puff(this.cx, this.cy, 3, C.st4);
  }
  hurt() { this.hp--; FText.add(this.cx, this.y - 6, 'SQUEAK', C.yl1, { f: '3' }); }
  draw() {
    const k = this.kind, x = this.cx, y = this.bot + 1;
    if (k === 'trap') spr(SPR.mousetrap[0], x, y);
    else if (k === 'brick') spr(ART.brick, x, y);
    else if (k === 'cushion') spr(ART.cushion[this.life < 6 ? 1 : 0], x, y);
    else if (k === 'teeth') spr(ART.teeth[floor(this.t / 4) % 2], x, y, this.face < 0);
    else if (k === 'duck') { spr(ART.duck[floor(this.t / 20) % 2], x, y); if (this.life < 60 && this.t % 6 < 3) spr(ART.duck[0], x, y, false, true); }
  }
}
// garlic aura ticks from the player (called in game update)
function garlicTick(p) {
  if (!p.buffs.garlic) return;
  if (p.t % 4 === 0) Parts.add({ k: 2, x: p.cx + rnd(-30, 30), y: p.cy + rnd(-20, 10), vy: -0.3, s: rnd(2, 4), c: pick([C.gr3, C.gr4]), life: 30, a: 0.35, gr: -0.01 });
  if (p.t % 20 === 0) for (const e of lv.enemies) if (!e.dead && dist(e.cx, e.cy, p.cx, p.cy) < 56) e.hurt(p.garlicDmg || 5, p, { kb: 0.6, noFlash: false });
}
