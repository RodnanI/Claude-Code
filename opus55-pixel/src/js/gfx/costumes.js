// ---------------------------------------------------------------------------
// Costumes: materials, proportions, garment layers, weapons and the live
// ribbons (hair, sashes, tassels, scarves) each character carries.
// ribbon: [anchor, material, length(px), segments, width, stiffness, behind]
// ---------------------------------------------------------------------------
const BODY_STD = {
  hip: 22, th: 10, sh: 10, foot: 3.6, torso: 13, neck: 1, ua: 7, fa: 7, shDown: 2.5, shOff: 0.6,
  rTh: [2.7, 2.1], rSh: [2.05, 1.5], rAnk: 1.3, rToe: 1.05, rUa: [1.75, 1.45], rFa: [1.55, 1.3], hand: 1.45,
  tw: { hipB: 3.4, hipF: 3.3, waistB: 3.0, waistF: 2.9, chestB: 3.3, chestF: 3.9, shB: 3.3, shF: 3.1, nkB: 1.5, nkF: 1.3 },
};
function body(o = {}, scale = 1, bulk = 1) {
  const b = JSON.parse(JSON.stringify(BODY_STD));
  for (const k of ['hip', 'th', 'sh', 'torso', 'ua', 'fa', 'foot']) b[k] *= scale;
  for (const k of ['rTh', 'rSh', 'rUa', 'rFa']) b[k] = b[k].map(v => v * bulk);
  b.rAnk *= bulk; b.rToe *= bulk; b.hand *= bulk;
  for (const k in b.tw) b.tw[k] *= bulk;
  for (const k in o) { if (k === 'tw') Object.assign(b.tw, o.tw); else b[k] = o[k]; }
  return b;
}

// Quiver strapped to the back
function quiverBack(B, C, J, P, pt) {
  const a = pt(0.25, -C.body.tw.waistB - 1), b = pt(1.05, -C.body.tw.shB - 2.2);
  seg(B, a[0], a[1], b[0], b[1], 1.6, 1.8, C.M.leather, GR.BODY, C.shC);
  for (let i = 0; i < 3; i++) bline(B, b[0] - 1 + i, b[1] - 1, b[0] - 2 + i * 1.5, b[1] - 4, C.M.fletch, 3, GR.BODY);
}
// Scabbard hanging at the back hip
function scabbardBack(B, C, J, P, pt) {
  const a = pt(0.2, -C.body.tw.waistB - 0.5);
  const d = dv(-38 - (P.t || 0) * 0.4 - (J.rot || 0));
  seg(B, a[0], a[1], a[0] + d[0] * 12, a[1] + d[1] * 12, 0.95, 0.8, C.M.scab, GR.ROBEB, { ...C.shC, band: [[0, 0.1, C.M.gold], [0.92, 1.01, C.M.gold]] });
}
// Cape hung from the shoulders is a ribbon; this draws the clasp
function claspFront(B, C, J, P, pt) {
  const p = pt(0.96, C.body.tw.shF * 0.2);
  disc(B, p[0], p[1], 1.1, C.M.gold, GR.BODY, SH_METAL);
}

const HERO_MATS = {
  skin: RAMP.skin, hair: RAMP.ink, robe: RAMP.white, trim: RAMP.crimson, pants: RAMP.charcoal, boot: RAMP.ink,
  bracer: RAMP.leather, steel: RAMP.steel, gold: RAMP.gold, jade: RAMP.jade, hilt: RAMP.crimson, scab: RAMP.maroon, eyeW: RAMP.white, wraps: RAMP.hairGray,
};

defCostume('hero', {
  mats: HERO_MATS, shiny: ['steel', 'gold', 'jade'],
  headMap: { a: 'trim', b: 'gold', c: 'jade' },
  body: body(), head: 'hero',
  torso: { mat: 'robe', collar: 'trim', inner: 'robe', belt: 'trim', pendant: 'jade', back: scabbardBack },
  robe: { mat: 'robe', trim: 'trim', len: 12, flare: 1.4, stiff: 0.45, backLen: 1.12, hemW: 1.6, stitch: 'gold' },
  arms: { upper: 'robe', fore: 'bracer', cuff: 'trim', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'wraps', boot: 'boot', wrapFrom: 0.5 },
  weapon: 'jian', anims: 'hero',
  ribbons: [['hair', 'hair', 17, 7, 2.6, 0.5, 1], ['ribbon', 'trim', 11, 5, 1, 0.3, 1], ['sash', 'trim', 9, 4, 1.4, 0.25, 0], ['fTassel', 'trim', 6, 3, 1, 0.2, 0]],
});
// ghost of the hero for afterimages uses the same costume
defCostume('qin', {
  mats: { ...HERO_MATS, skin: RAMP.skinFair, robe: RAMP.celadon, trim: RAMP.white, pants: RAMP.celadon, bracer: RAMP.white, hilt: RAMP.jade, scab: RAMP.jade, lip: RAMP.pinkSilk },
  shiny: ['steel', 'gold', 'jade'],
  headMap: { a: 'lip', b: 'gold', c: 'jade' },
  body: body({ tw: { chestF: 3.6, waistF: 2.6, waistB: 2.7 } }, 0.97, 0.94), head: 'qin',
  torso: { mat: 'robe', collar: 'trim', inner: 'trim', belt: 'jade', pendant: 'gold' },
  robe: { mat: 'robe', trim: 'trim', len: 15, flare: 2, stiff: 0.55, backLen: 1.1 },
  arms: { upper: 'robe', fore: 'robe', cuff: 'trim', wide: 3 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'trim' },
  weapon: 'jian', anims: 'hero',
  ribbons: [['hair', 'hair', 20, 7, 3, 0.55, 1], ['sash', 'jade', 11, 4, 1.4, 0.25, 0], ['fTassel', 'jade', 6, 3, 1, 0.2, 0]],
});
defCostume('bai', {
  mats: { skin: RAMP.skin, hair: RAMP.hairGray, robe: RAMP.ivory, outer: RAMP.hairGray, trim: RAMP.gold, pants: RAMP.ivory, boot: RAMP.ink, gold: RAMP.gold, wood: RAMP.wood, eyeW: RAMP.white },
  shiny: ['gold'], headMap: { b: 'gold' },
  body: body({ tw: { chestF: 3.6 } }, 1, 1.02), head: 'bai',
  torso: { mat: 'outer', collar: 'trim', inner: 'robe', belt: 'robe' },
  robe: { mat: 'outer', trim: 'trim', len: 19, flare: 2.2, stiff: 0.7, backLen: 1.05 },
  arms: { upper: 'outer', fore: 'outer', cuff: 'robe', wide: 4.5 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'boot' },
  weapon: 'whisk', anims: 'npc',
  ribbons: [['beard', 'hair', 9, 4, 2.2, 0.6, 0], ['fWhisk', 'robe', 10, 5, 2, 0.4, 0]],
});
defCostume('guwen', {
  mats: { skin: RAMP.skin, hair: RAMP.hairGray, robe: RAMP.earth, trim: RAMP.gold, pants: RAMP.ink, boot: RAMP.ink, gold: RAMP.gold, eyeW: RAMP.white },
  shiny: ['gold'], body: body({}, 0.98), head: 'guwen',
  torso: { mat: 'robe', collar: 'trim', inner: 'robe', belt: 'trim' },
  robe: { mat: 'robe', trim: 'trim', len: 18, flare: 2, stiff: 0.7 },
  arms: { upper: 'robe', fore: 'robe', cuff: 'trim', wide: 4 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'boot' },
  anims: 'npc', ribbons: [],
});
defCostume('villager', {
  mats: { skin: RAMP.skinTan, hair: RAMP.ink, robe: RAMP.khaki, cap: RAMP.earth, trim: RAMP.earth, pants: RAMP.earth, boot: RAMP.straw, eyeW: RAMP.white },
  headMap: { a: 'cap' }, body: body({}, 0.95), head: 'villager',
  torso: { mat: 'robe', collar: 'trim', belt: 'trim' },
  robe: { mat: 'robe', trim: 'trim', len: 9, flare: 1, stiff: 0.5 },
  arms: { upper: 'robe', fore: 'robe', cuff: 'trim' },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'robe', boot: 'boot' },
  anims: 'npc', ribbons: [],
});

// ---- enemies ----------------------------------------------------------
const CULT_MATS = {
  skin: RAMP.skin, hood: RAMP.cult, robe: RAMP.cult, trim: RAMP.ink, armor: RAMP.charcoal, pants: RAMP.ink, boot: RAMP.leather,
  bracer: RAMP.charcoal, steel: RAMP.steel, gold: RAMP.bronze, hilt: RAMP.leather, leather: RAMP.leather, mask: RAMP.bone, paint: RAMP.crimson, wood: RAMP.wood, eyeW: RAMP.white,
};
defCostume('cultist', {
  mats: CULT_MATS, shiny: ['steel', 'gold', 'armor'],
  headMap: { hair: 'hood', a: 'paint', c: 'mask' }, body: body({}, 1, 1.04), head: 'cultist',
  torso: { mat: 'robe', vest: 'armor', vestPat: 'lamellar', belt: 'leather', buckle: 'gold' },
  robe: { mat: 'robe', trim: 'trim', len: 11, flare: 1.4, stiff: 0.45 },
  arms: { upper: 'robe', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'boot', boot: 'boot', wrapFrom: 0.5 },
  weapon: 'dao', anims: 'saber',
  ribbons: [['hood', 'hood', 8, 4, 2.4, 0.5, 1], ['sash', 'paint', 7, 3, 1.2, 0.3, 0]],
});
defCostume('spearman', {
  mats: { ...CULT_MATS, hair: RAMP.ink, helm: RAMP.bronze, armor: RAMP.bronze, plume: RAMP.crimson },
  shiny: ['steel', 'helm', 'armor', 'gold'],
  headMap: { b: 'helm' }, body: body({}, 1.02, 1.05), head: 'spear',
  torso: { mat: 'robe', vest: 'armor', vestPat: 'lamellar', belt: 'leather', buckle: 'gold' },
  robe: { mat: 'robe', trim: 'armor', len: 11, flare: 1.2, stiff: 0.5, hemW: 2 },
  arms: { upper: 'robe', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'boot', boot: 'boot', wrapFrom: 0.5 },
  weapon: 'spear', anims: 'spear',
  ribbons: [['plume', 'plume', 9, 4, 2.2, 0.45, 1], ['fTassel', 'plume', 6, 3, 2, 0.3, 0]],
});
defCostume('assassin', {
  mats: { skin: RAMP.skinFair, hair: RAMP.ink, suit: RAMP.ink, scarf: RAMP.crimson, wrap: RAMP.charcoal, steel: RAMP.darkSteel, gold: RAMP.bronze, hilt: RAMP.ink, eyeW: RAMP.white },
  shiny: ['steel'], body: body({ tw: { chestF: 3.4, chestB: 3 } }, 0.97, 0.9), head: 'assassin',
  torso: { mat: 'suit', belt: 'wrap' },
  arms: { upper: 'suit', fore: 'wrap', wrap: true, hand: 'wrap' },
  legs: { thigh: 'suit', shin: 'suit', wrap: 'wrap', boot: 'suit', wrapFrom: 0.35 },
  weapon: 'dagger', weapon2: 'dagger', anims: 'dual',
  ribbons: [['scarf', 'scarf', 20, 7, 2.2, 0.25, 1], ['sash', 'scarf', 8, 3, 1.2, 0.3, 0]],
});
defCostume('bandit', {
  mats: { skin: RAMP.skinTan, hair: RAMP.ink, band: RAMP.crimson, robe: RAMP.earth, trim: RAMP.leather, pants: RAMP.khaki, boot: RAMP.straw, bracer: RAMP.leather, steel: RAMP.steel, gold: RAMP.bronze, hilt: RAMP.leather, leather: RAMP.leather, eyeW: RAMP.white },
  shiny: ['steel'], headMap: { a: 'band' }, body: body({}, 0.98, 1.02), head: 'bandit',
  torso: { mat: 'robe', collar: 'trim', belt: 'leather', buckle: 'gold' },
  robe: { mat: 'robe', trim: 'trim', len: 9, flare: 1, stiff: 0.5 },
  arms: { upper: 'robe', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'robe', boot: 'boot' },
  weapon: 'dao', anims: 'saber',
  ribbons: [['band', 'band', 8, 4, 1.2, 0.3, 1]],
});
defCostume('brute', {
  mats: { skin: RAMP.skinTan, hair: RAMP.ink, fur: RAMP.fur, pants: RAMP.earth, boot: RAMP.leather, bracer: RAMP.leather, wood: RAMP.wood, steel: RAMP.steel, leather: RAMP.leather, gold: RAMP.bronze, sash: RAMP.maroon, eyeW: RAMP.white },
  shiny: ['steel'],
  body: body({ tw: { chestF: 5.6, chestB: 4.8, waistF: 5.4, waistB: 4.6, hipF: 4.6, hipB: 4.4, shF: 4.6, shB: 4.8, nkB: 2.5, nkF: 2.3 } }, 1.12, 1.35), head: 'brute',
  torso: { mat: 'skin', vest: 'fur', vestPat: 'fur', belt: 'sash', buckle: 'gold' },
  robe: { mat: 'pants', trim: 'leather', len: 10, flare: 1.5, stiff: 0.5 },
  arms: { upper: 'skin', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'leather', boot: 'boot' },
  weapon: 'club', anims: 'brute', shC: { dither: 0.35 },
  ribbons: [['knot', 'hair', 6, 3, 1.6, 0.4, 1], ['sash', 'sash', 8, 3, 1.6, 0.3, 0]],
});
defCostume('archer', {
  mats: { skin: RAMP.skinTan, hair: RAMP.ink, hat: RAMP.straw, robe: RAMP.khaki, trim: RAMP.earth, pants: RAMP.earth, boot: RAMP.leather, bracer: RAMP.leather, wood: RAMP.wood, leather: RAMP.leather, fletch: RAMP.white, bone: RAMP.bone, gold: RAMP.bronze, eyeW: RAMP.white },
  headMap: { a: 'hat' }, body: body({}, 0.98), head: 'archer',
  torso: { mat: 'robe', collar: 'trim', belt: 'leather', back: quiverBack },
  robe: { mat: 'robe', trim: 'trim', len: 10, flare: 1, stiff: 0.5 },
  arms: { upper: 'robe', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'robe', boot: 'boot' },
  weapon: 'bow', anims: 'archer', ribbons: [],
});
defCostume('jiangshi', {
  mats: { skin: RAMP.skinPale, hair: RAMP.ink, cap: RAMP.crimson, robe: RAMP.teal, trim: RAMP.gold, badge: RAMP.gold, pants: RAMP.ink, boot: RAMP.ink, paper: RAMP.paper, eyeW: RAMP.white, glow: RAMP.glowJade },
  shiny: ['badge'], headMap: { a: 'cap' }, body: body({}, 1.02), head: 'jiangshi',
  torso: { mat: 'robe', collar: 'trim', badge: 'badge', belt: 'trim' },
  robe: { mat: 'robe', trim: 'trim', len: 19, flare: 1.2, stiff: 0.8, hemW: 2 },
  arms: { upper: 'robe', fore: 'robe', cuff: 'trim', wide: 2.2 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'boot' },
  anims: 'hopper',
  ribbons: [['talisman', 'paper', 9, 3, 3.2, 0.7, 0]],
});

// ---- bosses -----------------------------------------------------------
defCostume('moying', {
  mats: { skin: RAMP.skinPale, hair: RAMP.ink, coat: RAMP.ink, inner: RAMP.charcoal, trim: RAMP.bone, mask: RAMP.bone, pants: RAMP.charcoal, boot: RAMP.ink, bracer: RAMP.charcoal, steel: RAMP.steel, gold: RAMP.bronze, hilt: RAMP.ink, eyeW: RAMP.white, glow: RAMP.glowRed },
  shiny: ['steel'], headMap: { c: 'mask' }, body: body({ tw: { chestF: 3.5, chestB: 3.1 } }, 1.08, 0.95), head: 'moying',
  torso: { mat: 'coat', collar: 'trim', inner: 'inner', belt: 'trim' },
  robe: { mat: 'coat', trim: 'trim', len: 21, flare: 2.4, stiff: 0.5, backLen: 1.15, hemW: 1.1 },
  arms: { upper: 'coat', fore: 'bracer', wrap: true },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'coat', boot: 'boot' },
  weapon: 'hook', weapon2: 'hook', anims: 'moying',
  ribbons: [['hood', 'coat', 14, 5, 2.6, 0.4, 1], ['sash', 'trim', 12, 5, 1.2, 0.2, 0]],
});
defCostume('liu', {
  mats: { skin: RAMP.skinFair, hair: RAMP.ink, robe: RAMP.jade, outer: RAMP.ivory, trim: RAMP.gold, pants: RAMP.ivory, boot: RAMP.jade, silk: RAMP.ivory, steel: RAMP.steel, gold: RAMP.gold, jadeR: RAMP.jade, lip: RAMP.crimson, eyeW: RAMP.white },
  shiny: ['steel', 'gold'], headMap: { a: 'lip', b: 'gold', c: 'jadeR' },
  body: body({ tw: { chestF: 3.5, waistF: 2.5, waistB: 2.6, hipB: 3.3 } }, 1, 0.92), head: 'liu',
  torso: { mat: 'robe', collar: 'trim', inner: 'outer', belt: 'trim', pendant: 'gold' },
  robe: { mat: 'outer', trim: 'robe', len: 18, flare: 2.4, stiff: 0.45, backLen: 1.2, hemW: 2, stitch: 'gold' },
  arms: { upper: 'robe', fore: 'outer', cuff: 'robe', wide: 4 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'boot' },
  weapon: 'fan', anims: 'liu',
  ribbons: [['hair', 'hair', 16, 6, 2.6, 0.5, 1], ['sash', 'robe', 16, 6, 1.4, 0.2, 0], ['sashB', 'trim', 14, 5, 1, 0.2, 1]],
});
const TIEFO_MATS = { skin: RAMP.skinTan, hair: RAMP.ink, robe: RAMP.saffron, sash: RAMP.maroon, pants: RAMP.saffron, boot: RAMP.leather, beads: RAMP.wood, gold: RAMP.gold, eyeW: RAMP.white };
const TIEFO_DEF = {
  shiny: ['beads', 'gold'],
  body: body({ tw: { chestF: 6, chestB: 5.4, waistF: 6.2, waistB: 5.2, hipF: 5, hipB: 4.8, shF: 5, shB: 5.4, nkB: 2.8, nkF: 2.6 }, hand: 2.3 }, 1.22, 1.45), head: 'tiefo',
  torso: { mat: 'robe', collar: 'sash', inner: 'skin', belt: 'sash', beads: 'beads' },
  robe: { mat: 'robe', trim: 'sash', len: 18, flare: 2.2, stiff: 0.6, hemW: 1.8 },
  arms: { upper: 'skin', fore: 'skin', cuff: 'sash' },
  legs: { thigh: 'pants', shin: 'pants', wrap: 'sash', boot: 'boot' },
  anims: 'tiefo', shC: { dither: 0.3 },
  ribbons: [['sash', 'sash', 12, 4, 2.2, 0.3, 0]],
};
defCostume('tiefo', { mats: TIEFO_MATS, ...TIEFO_DEF });
defCostume('tiefoGold', { mats: { ...TIEFO_MATS, skin: RAMP.skinGold }, ...TIEFO_DEF, shiny: ['beads', 'gold', 'skin'] });
const DEMON_MATS = {
  skin: RAMP.skinFair, hair: RAMP.ink, robe: RAMP.ink, inner: RAMP.crimson, trim: RAMP.crimson, gold: RAMP.gold, pants: RAMP.ink, boot: RAMP.ink,
  bracer: RAMP.gold, blade: RAMP.blood, hilt: RAMP.ink, cape: RAMP.maroon, eyeW: RAMP.white, glow: RAMP.glowRed, steel: RAMP.steel,
};
const DEMON_DEF = {
  shiny: ['gold', 'blade'], headMap: { b: 'gold' },
  body: body({ tw: { chestF: 4.2, chestB: 3.8, shB: 3.8 } }, 1.1, 1.05), head: 'demon',
  torso: { mat: 'robe', collar: 'trim', inner: 'inner', belt: 'gold', buckle: 'trim', front: claspFront },
  robe: { mat: 'robe', trim: 'trim', len: 20, flare: 2.4, stiff: 0.5, backLen: 1.1, hemW: 2, edge: 'gold', stitch: 'gold' },
  arms: { upper: 'robe', fore: 'robe', cuff: 'gold', wide: 3.2 },
  legs: { thigh: 'pants', shin: 'pants', boot: 'boot' },
  weapon: 'bloodjian', anims: 'demon',
  ribbons: [['hair', 'hair', 24, 8, 3, 0.5, 1], ['hair', 'cape', 26, 8, 5, 0.35, 1], ['sash', 'trim', 12, 5, 1.4, 0.25, 0], ['fTassel', 'trim', 7, 3, 1, 0.2, 0]],
};
defCostume('demon', { mats: DEMON_MATS, ...DEMON_DEF });
defCostume('demon2', { mats: { ...DEMON_MATS, trim: RAMP.glowRed, inner: RAMP.glowRed, blade: RAMP.glowRed }, ...DEMON_DEF, shiny: ['gold', 'blade', 'trim'] });
