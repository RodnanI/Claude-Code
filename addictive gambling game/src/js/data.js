/* ============================================================
   data.js : every pin, ball, charm, ticket, voucher, boss,
   cabinet, stake, achievement and unlock lives here.
   Hooks receive (charmInstance, ctx). ctx API is in run.js.
   ============================================================ */
const RAR = [
  null,
  { name: 'Common', w: 66 },
  { name: 'Uncommon', w: 26 },
  { name: 'Rare', w: 7.4 },
  { name: 'Legendary', w: 0.6 },
];

/* ---------------- PINS ---------------- */
const PINS = {
  basic: { name: 'Brass Pin', r: 5.5, rar: 0, cost: 0, desc: () => '{p|+2 Points}', hit(S) { S.pts(S.rd.rules.rust ? 0 : 2); } },
  copper: { name: 'Copper Pin', r: 6.5, rar: 1, cost: 3, desc: L => `{p|+${8 * L} Points}`, hit(S, L) { S.pts(8 * L); } },
  ruby: { name: 'Ruby Pin', r: 6.5, rar: 1, cost: 4, desc: L => `{m|+${L} Mult}`, hit(S, L) { S.mult(L); } },
  bumper: { name: 'Bumper', r: 14, rar: 1, cost: 4, desc: L => `{p|+${6 * L} Points} every bounce. Kicks balls away hard.`, hit(S, L) { S.pts(6 * L); if (S.ball.type === 'pearl') S.mult(2); } },
  magnet: { name: 'Magnet Pin', r: 6.5, rar: 1, cost: 3, desc: L => `{p|+${3 * L} Points}. Pulls nearby balls toward itself.`, hit(S, L) { S.pts(3 * L); } },
  gold: { name: 'Gold Pin', r: 6.5, rar: 2, cost: 5, desc: L => `{$|+$${L}} per ball that hits it (once per ball).`, hit(S, L) { if (S.once('g')) S.cash(L * (S.ball.type === 'gold' ? 2 : 1)); } },
  clover: { name: 'Clover Pin', r: 7, rar: 2, cost: 5, desc: L => `{c|1 in 3}: {m|+${3 * L} Mult}`, hit(S, L) { if (S.chance(1, 3)) { S.mult(3 * L); S.sparkle(); } } },
  bell: { name: 'Bell Pin', r: 6.5, rar: 2, cost: 4, desc: L => `{p|+${4 * L} Points}. Every {k|8} Bell hits spin the reels.`, hit(S, L) { S.pts(4 * L); S.bell(); } },
  sprout: {
    name: 'Sprout Pin', r: 6.5, rar: 2, cost: 4,
    desc: (L, p) => `{p|+${p ? p.g || 1 : 1} Points}, then grows {p|+${L}}. Growth is permanent.`,
    hit(S, L, p) { S.pts(p.g || 1); p.g = (p.g || 1) + L * (S.has('fertilizer') ? 2 : 1); S.grow(p); },
  },
  dice: {
    name: 'Dice Pin', r: 6.5, rar: 2, cost: 5, desc: L => `Rolls {m|+1 to +${4 * L} Mult}.`,
    hit(S, L, p) { let r = randi(1, 4); if (S.has('dicetower')) r = Math.max(r, randi(1, 4)); S.face(r); S.mult(r * L); },
  },
  gamble: {
    name: 'Gamble Pin', r: 6.5, rar: 2, cost: 5, desc: L => `Coin flip: {x|x${1 + L} Mult} or {x|x0.5 Mult}. Once per ball.`,
    hit(S, L) { if (!S.once('gb')) return; if (S.chance(1, 2)) S.xm(1 + L, null, false, 'WIN'); else S.xm(0.5, null, false, 'LOSE'); S.flip(); },
  },
  prism: { name: 'Prism Pin', r: 7, rar: 3, cost: 8, desc: L => `{x|x${1 + 0.5 * L} Mult}. Once per ball.`, hit(S, L) { if (S.once('pr')) S.xm(1 + 0.5 * L + (S.has('prismheart') ? 1 : 0)); } },
  bomb: { name: 'Powder Keg', r: 7, rar: 3, cost: 7, desc: L => `Explodes, triggering every pin within {k|${70 + 15 * L}} units. Rearms in 3s.`, hit(S, L) { S.explode(70 + 15 * L); } },
  split: { name: 'Splitter', r: 7, rar: 3, cost: 8, desc: L => `Spawns {k|${L}} extra ball${L > 1 ? 's' : ''} (once per ball). Splits score on their own.`, hit(S, L) { if (S.once('sp')) S.clone(L); } },
  warp: { name: 'Elevator', r: 7, rar: 3, cost: 7, desc: L => `{p|+${10 * L} Points}, then sends the ball back to the top (once per ball).`, hit(S, L) { S.pts(10 * L); S.warp(); } },
  seven: { name: 'Lucky 7 Pin', r: 7, rar: 3, cost: 6, desc: L => `{p|+${7 * L} Points} and spins the reels (once per ball).`, hit(S, L) { S.pts(7 * L); if (S.once('7')) S.spin(); } },
  rod: { name: 'Lightning Rod', r: 7, rar: 3, cost: 7, desc: L => `Zaps {k|${1 + L}} random pins nearby, triggering them.`, hit(S, L) { S.zap(1 + L); } },
  echo: { name: 'Echo Pin', r: 6.5, rar: 3, cost: 6, desc: L => `Repeats the last special pin this ball hit, {k|${L}x}.`, hit(S, L) { S.echo(L); } },
};
const PIN_SOUND = { basic: 'basic', copper: 'copper', ruby: 'ruby', bumper: 'bumper', magnet: 'magnet', gold: 'gold', clover: 'clover', bell: 'bell', sprout: 'sprout', dice: 'dice', gamble: 'gamble', prism: 'prism', bomb: 'bomb', split: 'split', warp: 'warp', seven: 'seven', rod: 'rod', echo: 'echo' };

/* ---------------- BALLS ---------------- */
const BALLS = {
  steel: { name: 'Steel Ball', rar: 0, cost: 0, desc: 'Plain, honest chrome.' },
  ruby: { name: 'Ruby Ball', rar: 1, cost: 4, desc: 'Starts with {m|+3 Mult}.', start(b) { b.mult += 3; }, trail: '#ff4a3a' },
  rubber: { name: 'Rubber Ball', rar: 1, cost: 4, desc: 'Extra bouncy. {p|+2 Points} on every pin hit.', rest: 0.8, trail: '#ff8a4a' },
  pearl: { name: 'Pearl', rar: 2, cost: 5, desc: 'Starts with {p|+20 Points}. Bumpers give it {m|+2 Mult}.', start(b) { b.points += 20; }, trail: '#fff2e0' },
  gold: { name: 'Gold Ball', rar: 2, cost: 5, desc: '{$|+$1} when it lands. Gold Pins pay it double.', trail: '#ffd34a' },
  lead: { name: 'Lead Ball', rar: 2, cost: 5, desc: 'Heavy. {x|x2 Points} from every pin, barely bounces.', rest: 0.3, grav: 1.12, trail: '#8a9096' },
  clover: { name: 'Lucky Ball', rar: 2, cost: 5, desc: 'Doubles every chance while it is in play.', trail: '#7dff6a' },
  ghost: { name: 'Ghost Ball', rar: 2, cost: 5, desc: 'Phases through Brass Pins (still scores them). Bounces off everything else.', trail: '#f2ead8' },
  eight: { name: 'Eight Ball', rar: 2, cost: 5, desc: 'Always spins the reels when it lands.', trail: '#e8e0d0' },
  glass: { name: 'Glass Ball', rar: 3, cost: 6, desc: '{x|x3 Mult} when it lands. {c|1 in 4} chance to shatter for good.', trail: '#bff8ee' },
  cluster: { name: 'Cluster Ball', rar: 3, cost: 7, desc: 'Bursts into {k|3} balls on its first pin.', trail: '#f0d8a0' },
  comet: { name: 'Comet Ball', rar: 3, cost: 7, desc: 'Every pin it hits triggers {k|twice}.', trail: '#ff9a2a' },
  echo: { name: 'Echo Ball', rar: 3, cost: 6, desc: 'When it lands, a free Steel Ball drops from the same spot.', trail: '#5fd8c8' },
  bomb: { name: 'Bomb Ball', rar: 3, cost: 7, desc: 'Detonates on its 8th pin hit, triggering every pin nearby.', trail: '#ff7b1c' },
};

/* ---------------- CHARMS ---------------- */
const CHARM_LIST = [
  // common
  { id: 'penny', name: 'Lucky Penny', rar: 1, cost: 4, icon: 'coin', desc: 'Brass Pins give {p|+2 Points} more.', pin(c, S) { if (S.pin.t === 'basic') S.pts(2, c, true); } },
  { id: 'thread', name: 'Red Thread', rar: 1, cost: 4, icon: 'spool', desc: 'Ruby Pins give {m|+1 Mult} more.', pin(c, S) { if (S.pin.t === 'ruby') S.mult(1, c, true); } },
  { id: 'die', name: 'Loaded Die', rar: 1, cost: 5, icon: 'die', desc: 'Every ball starts with {m|+2 Mult}.', start(c, S) { S.ball.mult += 2; } },
  { id: 'hands', name: 'Hot Hands', rar: 1, cost: 4, icon: 'flame', desc: 'The Hot Peg gives {m|+5 Mult} more.', hot(c, S) { S.mult(5, c); } },
  { id: 'bouncer', name: 'Bouncer', rar: 1, cost: 4, icon: 'bumper', desc: 'Bumpers give {p|+12 Points} more.', pin(c, S) { if (S.pin.t === 'bumper') S.pts(12, c, true); } },
  { id: 'edge', name: 'Edge Lord', rar: 1, cost: 5, icon: 'edges', desc: 'The two outermost pockets give {x|x2 Mult} more.', land(c, S) { if (S.pIdx === 0 || S.pIdx === NPOCK - 1) S.xm(2, c); } },
  { id: 'cushion', name: 'Velvet Cushion', rar: 1, cost: 5, icon: 'cup', desc: 'Every ball gains {m|+2 Mult} before its pocket multiplies.', pre(c, S) { S.mult(2, c); } },
  { id: 'coupon', name: 'Coupon Book', rar: 1, cost: 4, icon: 'ticket', desc: 'Rerolls cost {$|$1} less.' },
  { id: 'pincher', name: 'Penny Pincher', rar: 1, cost: 4, icon: 'coins', desc: 'Unused balls pay {$|$2} each instead of $1.' },
  { id: 'opener', name: 'Opening Act', rar: 1, cost: 5, icon: 'star', desc: 'The first ball of each round gets {x|x3 Mult}.', land(c, S) { if (S.ball.first) S.xm(3, c); } },
  { id: 'jockey', name: 'Slot Jockey', rar: 1, cost: 4, icon: 'lever', desc: 'Earn {$|$1} every time the reels spin.', spin(c, G) { G.cash(1, c); } },
  { id: 'tip', name: 'Tip Jar', rar: 1, cost: 4, icon: 'jar', desc: 'Earn {$|$1} whenever a ball lands in the FEVER pocket.', land(c, S) { if (S.pocket.fever) S.cash(1, c); } },
  { id: 'banger', name: 'Wall Banger', rar: 1, cost: 4, icon: 'brick', desc: 'Wall bounces give {p|+8 Points}.', wall(c, S) { S.pts(8, c, true); } },
  { id: 'magnetism', name: 'Animal Magnetism', rar: 1, cost: 4, icon: 'magnet', desc: 'Magnet Pins pull twice as hard and give {m|+1 Mult}.', pin(c, S) { if (S.pin.t === 'magnet') S.mult(1, c, true); } },
  { id: 'fertilizer', name: 'Fertilizer', rar: 1, cost: 4, icon: 'sprout', desc: 'Sprout Pins grow twice as fast.' },
  { id: 'shaker', name: 'Shaker', rar: 1, cost: 4, icon: 'shake', desc: 'Nudging gives every ball in play {m|+2 Mult}.', nudge(c, G) { let n = 0; G.ballsInPlay().forEach(b => { b.mult += 2; n++; }); if (n) G.proc(c, '+2 Mult', 'm'); } },
  { id: 'tacks', name: 'Brass Tacks', rar: 1, cost: 4, icon: 'nail', desc: 'Balls that hit only Brass Pins get {p|+40 Points}.', pre(c, S) { if (!S.ball.special && S.ball.hits > 0) S.pts(40, c); } },
  { id: 'bullseye', name: 'Bullseye', rar: 2, cost: 6, icon: 'target', desc: 'The FEVER pocket also gives {x|x4 Mult}.', land(c, S) { if (S.pocket.fever) S.xm(4, c); } },
  { id: 'loose', name: 'Loose Cabinet', rar: 1, cost: 4, icon: 'cog', desc: '{k|+2 Nudges} every round.' },
  // uncommon
  {
    id: 'snowball', name: 'Snowball', rar: 2, cost: 6, icon: 'snow',
    desc: c => `Gains {m|+1 Mult} each time two balls in a row land in the same pocket. (Now {m|+${(c && c.s.v) || 0} Mult})`,
    pre(c, S) { if (S.rd.lastPocket === S.pIdx) { c.s.v = (c.s.v || 0) + 1; S.G.proc(c, 'Upgraded!', 'k'); } if (c.s.v) S.mult(c.s.v, c); },
  },
  { id: 'piggy', name: 'Piggy Bank', rar: 2, cost: 5, icon: 'pig', desc: c => `Gains {$|$2} of sell value after every round. (Sells for {$|$${c ? Game.sellPrice(c) : 2}})`, roundEnd(c) { c.s.v = (c.s.v || 0) + 2; } },
  { id: 'compound', name: 'Compound Interest', rar: 2, cost: 6, icon: 'chart', desc: 'Interest cap raised by {$|$5}.' },
  { id: 'goldticket', name: 'Golden Ticket', rar: 2, cost: 6, icon: 'ticket', desc: 'Earn {$|$4} on every jackpot.', jackpot(c, G) { G.cash(4, c); } },
  { id: 'sevens', name: 'Lucky Sevens', rar: 2, cost: 6, icon: 'seven', desc: 'Sevens show up twice as often on the reels.' },
  { id: 'spare', name: 'Spare Change', rar: 2, cost: 6, icon: 'ballplus', desc: '{k|+1 ball} every round.' },
  { id: 'longfall', name: 'Long Fall', rar: 2, cost: 6, icon: 'arrowdown', desc: '{m|+1 Mult} for every 5 pins the ball hit.', pre(c, S) { const n = Math.floor(S.ball.hits / 5); if (n) S.mult(n, c); } },
  { id: 'chaingang', name: 'Chain Gang', rar: 2, cost: 6, icon: 'chain', desc: "After a ball's 12th hit, every pin also gives {m|+1 Mult}.", pin(c, S) { if (S.ball.hits > 12) S.mult(1, c, true); } },
  { id: 'collector', name: 'Collector', rar: 2, cost: 6, icon: 'grid', desc: () => `{m|+2 Mult} for each special pin type on your board. (Now {m|+${Game.run ? 2 * Game.pinTypes() : 0}})`, pre(c, S) { const n = S.G.pinTypes(); if (n) S.mult(2 * n, c); } },
  { id: 'minimal', name: 'Minimalist', rar: 2, cost: 6, icon: 'circle', desc: '{m|+4 Mult} for each empty charm slot.', pre(c, S) { const n = S.G.emptyCharmSlots(); if (n) S.mult(4 * n, c); } },
  { id: 'spender', name: 'Big Spender', rar: 2, cost: 6, icon: 'moneybag', desc: '{p|+3 Points} for every $1 you hold.', pre(c, S) { const m = Math.max(0, S.run.money); if (m) S.pts(3 * m, c); } },
  { id: 'lastcall', name: 'Last Call', rar: 2, cost: 6, icon: 'hourglass', desc: 'The last ball of each round gets {x|x4 Mult}.', land(c, S) { if (S.ball.last) S.xm(4, c); } },
  {
    id: 'soreloser', name: 'Sore Loser', rar: 2, cost: 5, icon: 'tear',
    desc: c => `Gains {p|+10 Points} every time a Reach fails. (Now {p|+${(c && c.s.v) || 0}})`,
    reachFail(c, G) { c.s.v = (c.s.v || 0) + 10; G.proc(c, '+10', 'p'); }, pre(c, S) { if (c.s.v) S.pts(c.s.v, c); },
  },
  { id: 'fuse', name: 'Fuse Box', rar: 2, cost: 6, icon: 'bomb', desc: 'Powder Kegs blast {k|50% wider} and give {m|+4 Mult} when they blow.' },
  { id: 'glassjaw', name: 'Glass Jaw', rar: 2, cost: 6, icon: 'glass', desc: 'Glass Balls give {x|x5 Mult} instead of x3.' },
  { id: 'belltower', name: 'Bell Tower', rar: 2, cost: 5, icon: 'bell', desc: 'Bell Pins spin the reels every {k|4} hits instead of 8.' },
  { id: 'dicetower', name: 'Dice Tower', rar: 2, cost: 5, icon: 'dice2', desc: 'Dice Pins roll twice and keep the higher roll.' },
  { id: 'blackcat', name: 'Black Cat', rar: 2, cost: 6, icon: 'cat', desc: '{c|1 in 7} chance for a ball to get {x|x7 Mult}.', land(c, S) { if (S.chance(1, 7)) S.xm(7, c); } },
  { id: 'midnight', name: 'Midnight Oil', rar: 2, cost: 5, icon: 'moonstar', desc: '{m|+2 Mult} per Floor reached.', pre(c, S) { S.mult(2 * S.run.floor, c); } },
  { id: 'loanshark', name: 'Loan Shark', rar: 2, cost: 1, icon: 'fin', nosell: true, desc: 'Pays {$|$20} the moment you buy it. Takes {$|$3} after every round. Cannot be sold.', buy(c, G) { G.cash(20, c); }, roundEnd(c, G, R) { R.push(['Loan Shark', -3]); } },
  { id: 'wishbone', name: 'Wishbone', rar: 2, cost: 6, icon: 'wish', desc: 'Failed Reaches have a {c|1 in 3} chance to slip into a jackpot.' },
  { id: 'hustler', name: 'Hustler', rar: 2, cost: 5, icon: 'hat', desc: 'Double or Nothing wins {c|60%} of the time.' },
  { id: 'rabbit', name: "Rabbit's Foot", rar: 2, cost: 7, icon: 'paw', desc: 'Doubles every listed chance.' },
  // rare
  { id: 'rigged', name: 'Rigged Reels', rar: 3, cost: 8, icon: 'reel', desc: 'Jackpot odds {x|x2}.' },
  { id: 'midas', name: 'Midas Touch', rar: 3, cost: 8, icon: 'hand', desc: 'Gold Pins also give {m|+3 Mult}.', pin(c, S) { if (S.pin.t === 'gold') S.mult(3, c, true); } },
  { id: 'mitosis', name: 'Mitosis', rar: 3, cost: 8, icon: 'cells', desc: "Split balls inherit their parent's Points and Mult." },
  { id: 'echochamber', name: 'Echo Chamber', rar: 3, cost: 8, icon: 'rings', desc: 'The first special pin each ball hits triggers twice.' },
  { id: 'tesla', name: 'Tesla Coil', rar: 3, cost: 8, icon: 'bolt', desc: 'Lightning Rods zap {k|2 more} pins. Zapped pins give {m|+1 Mult}.' },
  {
    id: 'jar', name: 'Jackpot Jar', rar: 3, cost: 8, icon: 'jar2',
    desc: c => `{x|x0.5 Mult} for every jackpot this run. (Now {x|x${1 + 0.5 * ((c && c.s.v) || 0)}})`,
    jackpot(c, G) { c.s.v = (c.s.v || 0) + 1; G.proc(c, 'Upgraded!', 'k'); }, land(c, S) { if (c.s.v) S.xm(1 + 0.5 * c.s.v, c); },
  },
  { id: 'feverdream', name: 'Fever Dream', rar: 3, cost: 8, icon: 'moon', desc: 'FEVER drops {k|5 more} balls.' },
  { id: 'secondwind', name: 'Second Wind', rar: 3, cost: 7, icon: 'wind', desc: 'If you miss the quota, get {k|3 more balls}. Then it blows away.' },
  { id: 'matryoshka', name: 'Matryoshka', rar: 3, cost: 7, icon: 'doll', desc: 'Split balls can split again and start with {m|+2 Mult}.' },
  { id: 'leadlining', name: 'Lead Lining', rar: 3, cost: 7, icon: 'weight', desc: 'Lead Balls also gain {m|+1 Mult} per pin hit.', pin(c, S) { if (S.ball.type === 'lead') S.mult(1, c, true); } },
  { id: 'ouro', name: 'Ouroboros', rar: 3, cost: 8, icon: 'ouro', desc: '{c|1 in 3} balls loop back to the top once instead of landing.' },
  // legendary
  { id: 'bloodmoon', name: 'Blood Moon', rar: 4, cost: 12, icon: 'drop', desc: 'Ruby Pins also give {x|x1.25 Mult}.', pin(c, S) { if (S.pin.t === 'ruby') S.xm(1.25, c, true); } },
  { id: 'calf', name: 'Golden Calf', rar: 4, cost: 12, icon: 'bull', desc: '{x|x1 Mult}, plus {x|x0.1} more for every $1 you hold.', land(c, S) { S.xm(1 + 0.1 * Math.max(0, S.run.money), c); } },
  { id: 'whale', name: 'The Whale', rar: 4, cost: 14, icon: 'whale', desc: 'Every pocket multiplier is doubled.' },
  { id: 'infinity', name: 'Infinity Loop', rar: 4, cost: 13, icon: 'infinity', desc: 'Every 3rd ball you drop is dropped twice.' },
  { id: 'crown', name: "King's Ransom", rar: 4, cost: 12, icon: 'crown', desc: '{x|x3 Mult} if your ball bag holds no Steel Balls.', land(c, S) { if (!S.run.bag.includes('steel')) S.xm(3, c); } },
  { id: 'prismheart', name: 'Prism Heart', rar: 4, cost: 12, icon: 'prism', desc: 'Prism Pins give an extra {x|x1 Mult}.' },
];
const CHARMS = {};
CHARM_LIST.forEach(c => { CHARMS[c.id] = c; });

const EDITIONS = {
  foil: { name: 'Foil', desc: '{p|+40 Points} per ball', cost: 2, w: 3.5 },
  holo: { name: 'Holo', desc: '{m|+8 Mult} per ball', cost: 3, w: 2.2 },
  gilded: { name: 'Gilded', desc: '{x|x1.5 Mult} per ball', cost: 5, w: 0.9 },
  phantom: { name: 'Phantom', desc: 'Takes no charm slot', cost: 5, w: 0.4 },
};

/* ---------------- TICKETS (consumables) ---------------- */
const TICKETS = {
  polish: { name: 'Polish', cost: 3, icon: 'sparkle', desc: 'Upgrade a pin one level. A Brass Pin becomes Copper.', target: 'pin' },
  pliers: { name: 'Pliers', cost: 2, icon: 'pliers', desc: 'Pull a pin out of the board, leaving a gap.', target: 'anypin' },
  wrench: { name: 'Wrench', cost: 3, icon: 'wrench', desc: 'Move a special pin to any other spot.', target: 'move' },
  copy: { name: 'Carbon Copy', cost: 5, icon: 'copy', desc: 'Copy a special pin onto a Brass Pin.', target: 'copy' },
  chalk: { name: 'Chalk', cost: 4, icon: 'chalk', desc: 'A pocket gets {x|+1x} multiplier, for good.', target: 'pocket' },
  gild: { name: 'Gilding', cost: 4, icon: 'ingot', desc: 'A pocket also pays {$|$1} per ball, for good.', target: 'pocket' },
  oil: { name: 'Reel Oil', cost: 3, icon: 'oil', desc: 'Your next {k|3} spins have double jackpot odds.' },
  spare: { name: 'Spare Balls', cost: 3, icon: 'ballplus', desc: '{k|+2 balls} this round. Use it mid-round.', round: true },
  kindling: { name: 'Kindling', cost: 3, icon: 'flame', desc: 'Your next {k|3} balls get {x|x2 Mult}.' },
  cookie: { name: 'Fortune Cookie', cost: 2, icon: 'cookie', desc: 'Crack it open for {$|$1 to $8}.' },
  scratch: { name: 'Scratch Card', cost: 2, icon: 'scratch', desc: 'Scratch three of a kind to win up to {$|$25}.' },
  crucible: { name: 'Crucible', cost: 4, icon: 'pot', desc: 'Melt a Steel Ball in your bag into a random special ball.' },
  wild: { name: 'Wild Card', cost: 5, icon: 'mask', desc: 'Conjure a random charm (needs a free slot).' },
  mint: { name: 'Mint Press', cost: 3, icon: 'coins', desc: 'Turn {k|4} random Brass Pins into Copper Pins.' },
  coal: { name: 'Hot Coal', cost: 3, icon: 'coal', desc: 'This round the Hot Peg also gives {x|x2 Mult}. Use it mid-round.', round: true },
};

/* ---------------- VOUCHERS (boss rewards) ---------------- */
const VOUCHERS = {
  v_ball: { name: 'Deep Pockets', icon: 'ballplus', desc: '{k|+1 ball} every round.' },
  v_slot: { name: 'Display Case', icon: 'grid', desc: '{k|+1 charm slot}.' },
  v_shelf: { name: 'Wider Shelf', icon: 'shelf', desc: 'The shop stocks {k|one more charm}.' },
  v_sale: { name: 'Clearance Sale', icon: 'tag', desc: 'Everything in the shop costs {k|25% less}.' },
  v_reroll: { name: 'House Credit', icon: 'refresh', desc: 'Your first reroll in every shop is {k|free}.' },
  v_vault: { name: 'Vault', icon: 'vault', desc: 'Interest cap raised by {$|$5}.' },
  v_reels: { name: 'Loose Reels', icon: 'reel', desc: 'Jackpot odds {x|x1.5}.' },
  v_twin: { name: 'Twin Flames', icon: 'flame', desc: '{k|Two} Hot Pegs every drop.' },
  v_pocket: { name: 'Coat Pocket', icon: 'ticket', desc: '{k|+1 ticket slot}.' },
  v_furnace: { name: 'Furnace', icon: 'thermo', desc: 'The Heat gauge fills {k|50% faster}.' },
  v_springs: { name: 'Spring Legs', icon: 'shake', desc: '{k|+2 Nudges} every round.' },
  v_capsule: { name: 'Capsule Club', icon: 'capsule', desc: 'Capsules offer {k|4 choices} instead of 3.' },
};

/* ---------------- BOSSES ---------------- */
const BOSSES = {
  rust: { min: 4, name: 'The Rust Baron', icon: 'cog', rule: 'Brass Pins give {p|0 Points}.' },
  gravity: { min: 2, name: 'Madame Gravity', icon: 'weight', rule: 'Gravity is {k|much} stronger.' },
  fog: { name: 'The Fog Merchant', icon: 'cloud', rule: 'The board is shrouded in fog.' },
  tight: { name: 'The Tightwad', icon: 'scissors', rule: 'The outermost pockets pay {x|x0.5}.' },
  wind: { name: 'Count Gale', icon: 'wind', rule: 'A crosswind shoves every ball.' },
  jammer: { name: 'The Jammer', icon: 'lock', rule: 'The FEVER pocket is sealed shut.' },
  fumble: { name: 'Old Butterfingers', icon: 'hand', rule: 'Balls drop from a random spot.' },
  counter: { min: 2, name: 'The Accountant', icon: 'chart', rule: '{k|3 fewer} balls this round.' },
  cold: { name: 'The Cold Shoulder', icon: 'snow', rule: 'No Hot Peg this round.' },
  thief: { min: 3, name: 'The Pickpocket', icon: 'mask', rule: 'Your leftmost charm is disabled.' },
  mirror: { name: 'Lady Mirror', icon: 'mirror', rule: 'Your aim is mirrored.' },
  mime: { name: 'The Mime', icon: 'x', rule: 'No nudging this round.' },
  taxman: { min: 3, name: 'The Taxman', icon: 'half', rule: "Every ball's Mult is {x|halved}." },
};
const HOUSE = { name: 'THE HOUSE', icon: 'eye', rule: 'Two house rules at once.' };

/* ---------------- CABINETS & STAKES ---------------- */
const CABINETS = {
  classic: { name: 'Classic', desc: 'The standard cabinet. 10 balls, $4, no tricks.', money: 4 },
  ruby: { name: 'Ruby Room', desc: 'Starts with 3 Ruby Pins and Red Thread.', money: 4, pins: { ruby: 3 }, charms: ['thread'] },
  goldrush: { name: 'Gold Rush', desc: 'Starts with $14 and 2 Gold Pins. No interest, ever.', money: 14, pins: { gold: 2 }, noInterest: true },
  bumper: { name: 'Bumper Crop', desc: 'Starts with 4 Bumpers. Half your balls are Rubber.', money: 4, pins: { bumper: 4 }, bag: { rubber: 5 } },
  lucky: { name: 'Lucky 7s', desc: 'Starts with Rigged Reels and a Lucky 7 Pin. Only 8 balls.', money: 4, pins: { seven: 1 }, charms: ['rigged'], balls: 8 },
  glass: { name: 'Glass House', desc: 'Starts with 4 Glass Balls and Glass Jaw. Only $2.', money: 2, bag: { glass: 4 }, charms: ['glassjaw'] },
  roller: { name: 'High Roller', desc: 'Starts with Hustler and $0. Every shop stocks a Scratch Card.', money: 0, charms: ['hustler'], scratch: true },
  bones: { name: 'Bare Bones', desc: 'A third of the pins are gone. Starts with Minimalist and 2 Pliers.', money: 4, charms: ['minimal'], tickets: ['pliers', 'pliers'], sparse: true },
};
const STAKES = [
  { name: 'Penny', desc: 'The base game.' },
  { name: 'Nickel', desc: 'Boss rounds pay no round reward.' },
  { name: 'Dime', desc: 'Quotas +20%.' },
  { name: 'Quarter', desc: 'Shop prices +$1.' },
  { name: 'Silver', desc: '1 fewer ball every round.' },
  { name: 'Gold', desc: 'Quotas +50% in total.' },
];
const QUOTA_BASE = [220, 700, 1800, 4500, 11000, 28000, 70000, 180000];
function quotaFor(floor, ri, stake) {
  let q = floor <= 8 ? QUOTA_BASE[floor - 1] : QUOTA_BASE[7] * Math.pow(3, floor - 8);
  q *= (floor === 1 ? [1, 1.4, 1.8] : [1, 1.5, 2])[ri];
  if (floor === 8 && ri === 2) q *= 1.25;
  if (stake >= 2) q *= 1.2;
  if (stake >= 5) q *= 1.25;
  return niceRound(q);
}

/* ---------------- REELS ---------------- */
const SYMS = ['cherry', 'bell', 'clover', 'bar', 'diamond', 'seven'];
const SYM_W = { cherry: 26, bell: 22, clover: 18, bar: 14, diamond: 9, seven: 11 };
const JACKPOTS = {
  cherry: { name: 'CHERRIES', desc: '+$3' },
  bell: { name: 'BELLS', desc: 'POCKETS +1x THIS ROUND' },
  clover: { name: 'CLOVERS', desc: '+2 BALLS' },
  bar: { name: 'TRIPLE BAR', desc: '3 PINS UPGRADED' },
  diamond: { name: 'DIAMONDS', desc: 'FREE CAPSULE' },
  seven: { name: 'SEVENS', desc: 'FEVER!' },
  skull: { name: 'SKULLS', desc: 'THE HOUSE TAKES A BALL' },
};

/* ---------------- ACHIEVEMENTS ---------------- */
const ACH = [
  { id: 'first', name: 'First Drop', desc: 'Drop your first ball.', icon: 'play' },
  { id: 'jackpot', name: 'Jackpot!', desc: 'Hit a jackpot.', icon: 'reel' },
  { id: 'fever', name: 'Fever Pitch', desc: 'Trigger FEVER.', icon: 'flame' },
  { id: 'premium', name: 'Premium Treatment', desc: 'Witness a Premium Reach.', icon: 'crown' },
  { id: 'chain3', name: 'Chain Reaction', desc: 'Blow 3 Powder Kegs with one ball.', icon: 'bomb' },
  { id: 'combo25', name: 'Pinball Wizard', desc: 'Hit 25 pins with one ball.', icon: 'chain' },
  { id: 'combo50', name: 'Perpetual Motion', desc: 'Hit 50 pins with one ball.', icon: 'infinity' },
  { id: 'ball1k', name: 'Four Figures', desc: 'Score 1,000 with one ball.', icon: 'star' },
  { id: 'ball100k', name: 'Six Figures', desc: 'Score 100,000 with one ball.', icon: 'gem' },
  { id: 'ball10m', name: 'Eight Figures', desc: 'Score 10M with one ball.', icon: 'crown' },
  { id: 'clutch', name: 'Clutch', desc: 'Meet the quota with your very last ball.', icon: 'hourglass' },
  { id: 'overkill', name: 'Overkill', desc: 'Score 5x the quota in one round.', icon: 'bolt' },
  { id: 'floor4', name: 'Regular', desc: 'Reach Floor 4.', icon: 'key' },
  { id: 'win', name: 'Broke the House', desc: 'Win a run.', icon: 'trophy' },
  { id: 'floor12', name: 'Night Owl', desc: 'Reach Floor 12.', icon: 'moonstar' },
  { id: 'fullhouse', name: 'Full House', desc: 'Fill every charm slot.', icon: 'grid' },
  { id: 'legend', name: 'Legendary', desc: 'Own a Legendary charm.', icon: 'flame' },
  { id: 'shiny', name: 'Shiny', desc: 'Own a Gilded or Phantom charm.', icon: 'sparkle' },
  { id: 'don3', name: 'Let It Ride', desc: 'Win Double or Nothing 3 times in one run.', icon: 'coins' },
  { id: 'badbeat', name: 'Bad Beat', desc: 'Lose Double or Nothing with $15+ on the line.', icon: 'skull' },
  { id: 'scratch', name: 'Scratch That', desc: 'Win the top prize on a Scratch Card.', icon: 'scratch' },
  { id: 'crowd', name: 'Crowded House', desc: 'Have 12 balls on the board at once.', icon: 'cells' },
  { id: 'elevator', name: 'Going Up', desc: 'Ride Elevators 6 times in one round.', icon: 'arrowdown' },
  { id: 'nudge', name: 'Hip Check', desc: 'Nudge 50 times.', icon: 'shake' },
  { id: 'collect30', name: 'Curator', desc: 'Discover 30 charms.', icon: 'book' },
  { id: 'streak3', name: 'Regular Customer', desc: 'Play the Daily 3 days in a row.', icon: 'calendar' },
  { id: 'rich', name: 'Fat Stacks', desc: 'Hold $100 at once.', icon: 'moneybag' },
  { id: 'sprout50', name: 'Green Thumb', desc: 'Grow a Sprout Pin to +50.', icon: 'sprout' },
  { id: 'speed', name: 'Speedrun', desc: 'Clear a round in under 25 seconds.', icon: 'fast' },
  { id: 'stake3', name: 'High Stakes', desc: 'Win on Dime stakes or higher.', icon: 'vault' },
];

/* ---------------- RANK UNLOCKS ---------------- */
const UNLOCKS = [
  [2, ['pin:bomb', 'charm:fuse', 'cab:ruby']],
  [3, ['ball:cluster', 'charm:mitosis', 'pin:seven']],
  [4, ['pin:gamble', 'charm:hustler', 'cab:goldrush']],
  [5, ['pin:warp', 'charm:ouro', 'ball:pearl']],
  [6, ['charm:tesla', 'pin:rod', 'cab:bumper']],
  [7, ['ball:comet', 'charm:echochamber', 'ticket:wild']],
  [8, ['charm:infinity', 'ball:ghost', 'cab:lucky']],
  [9, ['pin:echo', 'charm:matryoshka', 'ticket:crucible']],
  [10, ['charm:whale', 'ball:echo', 'cab:glass']],
  [11, ['charm:bloodmoon', 'charm:loanshark']],
  [12, ['ball:bomb', 'charm:calf', 'cab:roller']],
  [13, ['charm:crown', 'charm:wishbone']],
  [14, ['charm:prismheart', 'cab:bones']],
];
const LOCKED = new Set(UNLOCKS.flatMap(u => u[1]));
const xpForRank = r => 150 + r * 100;

const QUIPS = [
  'Fresh stock. No refunds, no crying.',
  'The house thanks you for your continued generosity.',
  'Every ball is a lucky ball. Statistically, no.',
  'Buy something shiny. You deserve it.',
  'That charm? Belonged to a man who won once.',
  'Cash only. Hopes and dreams not accepted.',
  'The reels remember you.',
  'One more round never hurt anybody. Probably.',
  'We polish the pins every night. With spite.',
  'Rumour says the sevens are loose tonight.',
  'You look like a high roller. Prove it.',
  'Careful. Capsules bite.',
  'Interest is just money for doing nothing. Our favourite kind.',
  'The Taxman is in a mood tonight.',
  'Nudge gently. The cabinet has feelings.',
];

const HINTS = {
  aim: 'Move to aim, then {k|click} or {k|tap} to drop. {k|Space} works too.',
  score: 'Each ball scores {p|POINTS} x {m|MULT}. Beat the {k|QUOTA} before your balls run out.',
  hot: 'The glowing pin is the {k|Hot Peg}. It moves every drop. Hit it for {m|+3 Mult}.',
  fever: 'The red {k|FEVER} pocket spins the reels. Three of a kind pays out. Three sevens? Pray.',
  nudge: 'Ball going the wrong way? {k|Nudge} the cabinet with the side buttons (or {k|Z} / {k|X}).',
  shop: '{k|Pins} go on the board. {k|Charms} bend the rules. {k|Balls} change your bag. {k|Tickets} are one-shot tricks.',
  boss: 'Boss rounds break the rules. Read the house rule before you drop.',
  place: 'Tap a pin on the board to swap it. Drop the same type on itself to {k|level it up}.',
};
