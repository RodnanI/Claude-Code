// SQUEAKBORNE :: meta progression
// Save data, run state, quirks, spice levels, upgrades, hats and achievements.

const SAVE_KEY = 'squeakborne_save_v1';
const Save = {
  data: null,
  defaults() {
    return {
      v: 1, crumbs: 0, unlocked: [], found: [], seen: [], hats: ['none', 'acorn'], hat: 'acorn',
      upg: {}, spiceMax: 0, spice: 0, introSeen: false,
      stats: { runs: 0, deaths: 0, wins: 0, kills: 0, bestTime: 0, bestStage: 0, bossKills: [0, 0, 0, 0], deathsBy: {}, crumbsBanked: 0, playTime: 0, parries: 0, bonks: 0, billiards: 0, spikeDeaths: 0 },
      settings: { music: 0.55, sfx: 0.8, shake: 1, flash: true, pixelPerfect: false, scanlines: false, dmgNums: true, timer: true, preset: 'wasd', binds: null },
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') d = def;
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = def.stats[k];
    for (const k in def.settings) if (d.settings[k] === undefined) d.settings[k] = def.settings[k];
    this.data = d;
  },
  write() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* private mode */ } },
  reset() { const s = this.data.settings; this.data = this.defaults(); this.data.settings = s; this.write(); },
};

// ---------------- spice (difficulty after a win) ----------------
const SPICE = [
  { name: 'Mild', desc: 'The way grandma makes it.', hp: 1, dmg: 1, dmgTaken: 1 },
  { name: 'Medium', desc: 'Enemies +25% health. Elites appear more often.', hp: 1.25, dmg: 1.05, dmgTaken: 1, elite: 1 },
  { name: 'Hot', desc: 'Enemies hit 20% harder. One less cheese.', hp: 1.35, dmg: 1.2, dmgTaken: 1, flask: -1 },
  { name: 'Extra Hot', desc: 'Food heals less. Even more enemies.', hp: 1.5, dmg: 1.3, dmgTaken: 1.05, flask: -1 },
  { name: 'Diablo', desc: 'Bosses and enemies are much tougher.', hp: 1.75, dmg: 1.4, dmgTaken: 1.1, flask: -1 },
  { name: 'Ghost Pepper', desc: 'You asked for this.', hp: 2.1, dmg: 1.6, dmgTaken: 1.2, flask: -2 },
];

// ---------------- quirks ----------------
const QUIRKS = {
  thickfur: { name: 'Thick Fur', desc: 'Take 20% less damage.' },
  adrenaline: { name: 'Adrenaline', desc: '+50% damage while below 30% health.' },
  combo: { name: 'Combo Brain', desc: 'Kills grant +8% damage for 3s. Stacks 5 times.' },
  spite: { name: 'Spite', desc: 'Getting hit sprays thumbtacks everywhere.' },
  lucky: { name: 'Lucky Whiskers', desc: '+10% crit chance on everything.' },
  goldtooth: { name: 'Gold Tooth', desc: '+50% buttons from everything.' },
  zoomies: { name: 'Zoomies', desc: '+15% speed. Dodge cooldown is almost gone.' },
  vengeful: { name: 'Vengeful Squeak', desc: 'Taunting stuns nearby enemies (8s cooldown).' },
  necro: { name: 'Snack Between Kills', desc: 'Every kill heals 2% health.' },
  triplejump: { name: 'Triple Jump', desc: 'Jump one more time in the air.' },
  boompersonality: { name: 'Explosive Personality', desc: 'Dodging drops a lit firecracker.' },
  pointyhat: { name: 'Pointy Hat', desc: 'Ground pound deals triple damage.' },
  burp: { name: 'Cheese Addict', desc: 'Cheese heals 100%, then you burp and stun nearby enemies.' },
  static: { name: 'Static Fur', desc: 'Dodging through enemies shocks them.' },
  efficient: { name: 'Life Hacks', desc: 'Skills and ranged weapons recharge 20% faster.' },
  magnet: { name: 'Pocket Magnet', desc: 'Buttons and crumbs fly to you from further away.' },
  glass: { name: 'Glass Cannon', desc: '+35% damage, -40% max health. Bold.' },
  riposte: { name: 'Riposte', desc: 'Dodging an attack makes your next hits crit for 2s.' },
};
const QUIRK_IDS = Object.keys(QUIRKS);
function applyQuirk(q) {
  if (q === 'glass' || q === 'thickfur') pl.recalc();
  if (q === 'burp') { pl.flasks = min(pl.maxFlasks, pl.flasks + 0); }
}

// ---------------- permanent upgrades ----------------
const UPGRADES = [
  { id: 'flask1', name: 'Cheese Pouch', desc: '+1 cheese (heal) charge per biome.', cost: 30 },
  { id: 'flask2', name: 'Cheese Satchel', desc: '+1 more cheese charge.', cost: 110, req: 'flask1' },
  { id: 'flask3', name: 'Cheese Wheel', desc: '+1 more cheese charge. You are mostly cheese now.', cost: 260, req: 'flask2' },
  { id: 'pocket', name: 'Pocket Change', desc: 'Start every run with 60 buttons.', cost: 40 },
  { id: 'armory', name: 'The Armory', desc: 'Pick a bonus weapon from the rack before each run.', cost: 70 },
  { id: 'thick', name: 'Healthy Diet', desc: '+15% max health, forever.', cost: 150 },
  { id: 'mapper', name: 'Cartography', desc: 'See the whole map of each level from the start.', cost: 90 },
  { id: 'revive', name: 'Second Wind', desc: 'Once per run, survive a killing blow at 50% health.', cost: 450 },
  { id: 'banker', name: 'Crumb Insurance', desc: 'Keep 25% of carried crumbs when you die.', cost: 120 },
];
function hasUpg(id) { return !!Save.data.upg[id]; }

// ---------------- hats ----------------
const SECRET_HATS = ['propeller', 'cone', 'pea', 'fez'];
function unlockHat(h, quiet) {
  if (!h || Save.data.hats.includes(h)) return false;
  Save.data.hats.push(h);
  Save.write();
  sfx('secret');
  UI.toast('NEW HAT: ' + HATS[h].name.toUpperCase(), 'Change hats at the wardrobe in the mousehole.', C.yl1);
  return true;
}
function checkAchievements(win) {
  const S = Save.data.stats;
  if (S.deaths >= 10) unlockHat('party');
  if (S.kills >= 500) unlockHat('viking');
  if (S.spikeDeaths >= 5) unlockHat('banana');
  if (win) {
    if (Save.data.spiceMax >= 3) unlockHat('catears');
    if (Run && Run.heals === 0) unlockHat('halo');
    if (Run && Run.stats.cunning >= 10) unlockHat('wizard');
    if (Run && Run.stats.grit >= 10) unlockHat('bucket');
    if (Run && Run.stats.fury >= 10) unlockHat('horns');
  }
}

// ---------------- run state ----------------
const STAGES = [
  { k: 'biome', b: 0 }, { k: 'boss', b: 0 }, { k: 'rest', b: 0 },
  { k: 'biome', b: 1 }, { k: 'boss', b: 1 }, { k: 'rest', b: 1 },
  { k: 'biome', b: 2 }, { k: 'boss', b: 2 }, { k: 'rest', b: 2 },
  { k: 'biome', b: 3 }, { k: 'boss', b: 3 },
];
let Run = null;
function newRun(seed, spice) {
  Run = {
    seed, spice, rng: RNG(seed ^ 0x5eed), stage: -1, gold: hasUpg('pocket') ? 60 : 0, crumbs: 0, banked: 0,
    stats: { fury: 0, cunning: 0, grit: 0 }, quirks: [], curse: 0,
    kills: 0, killsBy: {}, time: 0, hitsTaken: 0, dmgTaken: 0, dmgDealt: 0, heals: 0, crits: 0, dodges: 0, parries: 0, bonks: 0,
    billiards: 0, taunts: 0, shots: 0, skillsUsed: 0, snacks: 0, itemsFound: 0, blueprints: 0, secrets: 0, elites: 0, bossKills: 0,
    goldEarned: 0, purchases: 0, propsSmashed: 0, ambushes: 0, cursedChests: 0, spikeHits: 0, reviveUsed: false,
    lastCause: '', lastHitBy: null,
    biome() { const s = STAGES[max(0, this.stage)]; return s ? s.b : 0; },
    itemLevel() { return 1 + this.biome() + (this.stage >= 0 && STAGES[this.stage].k !== 'biome' ? 1 : 0); },
  };
  return Run;
}
function flaskCount() {
  let n = 2 + (hasUpg('flask1') ? 1 : 0) + (hasUpg('flask2') ? 1 : 0) + (hasUpg('flask3') ? 1 : 0) + (SPICE[Run.spice].flask || 0);
  return max(1, n);
}

// funny death and victory text
const DEATH_TIPS = [
  'Tip: getting hit hurts. Consider not doing that.',
  'Tip: the roll button exists. It is free. It is right there.',
  'Tip: cheese heals. You had cheese. Probably.',
  'Tip: cats are liquid. This is not relevant.',
  'Tip: parry right before a hit. Feel like a god.',
  'Tip: ground pounding a skull is called a bonk.',
  'Tip: launched enemies make excellent bowling balls.',
  'Tip: the Hoarder keeps crumbs safe. Your pockets do not.',
  'Tip: snacks stack. Eat all the snacks.',
  'Tip: squeaking at enemies up close makes you sassy.',
  'Tip: some walls are cracked. Hit them. Find hats.',
  'Tip: elites drop blueprints. Blueprints become weapons.',
  'Tip: dying is just practice for living.',
];
const DEATH_TITLES = ['SQUEAK HAS PERISHED', 'YOU HAVE BEEN FLATTENED', 'SQUISHED', 'MOUSE DOWN', 'THAT WAS A MISTAKE', 'BACK TO THE MOUSEHOLE', 'OOF', 'SKILL ISSUE (AFFECTIONATE)'];
