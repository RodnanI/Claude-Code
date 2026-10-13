'use strict';
/* =====================================================================
   TIDEMARK :: simulation core
   Constants, definitions, seeded RNG, hashing, tide tables.
   Everything in the simulation layer is integer arithmetic and never
   touches the DOM, Date or Math.random, so a snapshot plus the action
   log reproduces the same future on any machine.
   ===================================================================== */

const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // N E S W
const DIRN = ['N', 'E', 'S', 'W'];
const opp = d => (d + 2) & 3;
const TPH = 100, TPD = 2400;                    // ticks per hour, per day
const CANAL_LVL = 100;                          // impounded canal water level
const LEVEL_TOL = 6;                            // lock "level" tolerance

const T_LAND = 0, T_SEA = 1, T_CANAL = 2, T_LOCK = 3;
const D_NONE = 0, D_COAL = 1, D_ORE = 2, D_CLAY = 3, D_FERTILE = 4;

const RES = [
  ['grain', 'Grain', '#d8b24c', 2], ['flour', 'Flour', '#ece2c6', 4], ['bread', 'Bread', '#b8762e', 6],
  ['logs', 'Logs', '#7a5232', 2], ['planks', 'Planks', '#cfa66b', 5], ['furniture', 'Furniture', '#7b3b2a', 22],
  ['coal', 'Coal', '#2d2b29', 3], ['ore', 'Iron ore', '#94503a', 3], ['steel', 'Steel', '#8d979c', 14],
  ['tools', 'Tools', '#41505a', 30], ['clay', 'Clay', '#c47c4b', 1], ['bricks', 'Bricks', '#a3412c', 4],
].map((a, i) => ({ i, id: a[0], name: a[1], col: a[2], price: a[3] }));
const NR = RES.length;
const R = {}; RES.forEach(r => { R[r.id] = r.i; });
const zr = () => new Array(NR).fill(0);

/* Building definitions.
   inp/out: [[res, qty]] per cycle. dur: ticks per cycle at full staff.
   pw: power demand (MW). gen: generation. cap: storage. node: transfer mode. */
const BT = {
  house:      { name: 'House', w: 1, h: 1, cost: 60, cat: 'home', jobs: 0, bays: 1 },
  market:     { name: 'Market hall', w: 2, h: 2, cost: 300, cat: 'home', jobs: 4, pw: 1, bays: 2, range: 14 },
  farm:       { name: 'Farm', w: 2, h: 2, cost: 250, cat: 'extract', jobs: 8, out: [[R.grain, 2]], dur: 120, ext: 'fertile', tools: 1, bays: 2 },
  forester:   { name: 'Forester', w: 1, h: 1, cost: 150, cat: 'extract', jobs: 4, out: [[R.logs, 1]], dur: 60, ext: 'trees', tools: 1, bays: 1 },
  claypit:    { name: 'Clay pit', w: 2, h: 2, cost: 200, cat: 'extract', jobs: 6, out: [[R.clay, 2]], dur: 90, ext: D_CLAY, tools: 1, bays: 2 },
  coalmine:   { name: 'Coal mine', w: 2, h: 2, cost: 400, cat: 'extract', jobs: 12, out: [[R.coal, 2]], dur: 80, ext: D_COAL, tools: 1, bays: 2 },
  oremine:    { name: 'Iron mine', w: 2, h: 2, cost: 400, cat: 'extract', jobs: 12, out: [[R.ore, 2]], dur: 90, ext: D_ORE, tools: 1, bays: 2 },
  mill:       { name: 'Roller mill', w: 2, h: 1, cost: 350, cat: 'industry', jobs: 6, pw: 4, inp: [[R.grain, 2]], out: [[R.flour, 2]], dur: 50, bays: 2 },
  bakery:     { name: 'Bakery', w: 2, h: 1, cost: 300, cat: 'industry', jobs: 6, pw: 2, inp: [[R.flour, 1]], out: [[R.bread, 4]], dur: 40, bays: 2 },
  sawmill:    { name: 'Sawmill', w: 2, h: 2, cost: 400, cat: 'industry', jobs: 8, pw: 5, inp: [[R.logs, 2]], out: [[R.planks, 3]], dur: 70, bays: 2 },
  joinery:    { name: 'Joinery', w: 2, h: 1, cost: 350, cat: 'industry', jobs: 6, pw: 3, inp: [[R.planks, 3]], out: [[R.furniture, 1]], dur: 110, bays: 2 },
  brickworks: { name: 'Brickworks', w: 2, h: 2, cost: 450, cat: 'industry', jobs: 8, pw: 2, inp: [[R.clay, 2], [R.coal, 1]], out: [[R.bricks, 4]], dur: 100, bays: 2 },
  steelworks: { name: 'Steelworks', w: 3, h: 2, cost: 800, cat: 'industry', jobs: 16, pw: 8, inp: [[R.ore, 2], [R.coal, 1]], out: [[R.steel, 1]], dur: 80, bays: 3 },
  toolworks:  { name: 'Toolworks', w: 2, h: 2, cost: 600, cat: 'industry', jobs: 10, pw: 6, inp: [[R.steel, 1]], out: [[R.tools, 2]], dur: 100, bays: 2 },
  powerplant: { name: 'Coal power station', w: 2, h: 2, cost: 900, cat: 'power', jobs: 8, gen: 120, fuel: R.coal, bays: 2 },
  tidemill:   { name: 'Tide mill', w: 1, h: 1, cost: 300, cat: 'power', jobs: 0, gen: 24, tidal: 1 },
  warehouse:  { name: 'Warehouse', w: 2, h: 2, cost: 300, cat: 'logistics', jobs: 4, cap: 240, bays: 3, store: 1 },
  depot:      { name: 'Truck depot', w: 2, h: 1, cost: 200, cat: 'logistics', jobs: 4 },
  station:    { name: 'Rail station', w: 3, h: 1, cost: 400, cat: 'logistics', jobs: 6, cap: 160, node: 'rail', bays: 2, store: 1 },
  station2:   { name: 'Twin-platform station', w: 3, h: 2, cost: 700, cat: 'logistics', jobs: 8, cap: 240, node: 'rail', bays: 3, store: 1 },
  quay:       { name: 'Harbour quay', w: 3, h: 2, cost: 1200, cat: 'logistics', jobs: 12, cap: 400, node: 'water', wt: T_SEA, bays: 3, store: 1 },
  wharf:      { name: 'Canal wharf', w: 2, h: 1, cost: 350, cat: 'logistics', jobs: 6, cap: 120, node: 'water', wt: T_CANAL, bays: 2, store: 1 },
  lighthouse: { name: 'Lighthouse', w: 1, h: 1, cost: 0, cat: 'deco', jobs: 0 },
};
for (const k in BT) BT[k].id = k;
const HCAP = [0, 6, 14, 24];                 // residents per house level
const HPOW = [0, 1, 2, 3];                   // MW per house level (x1.5 in the evening)
const MEAL = 2 * TPD;                        // resident-ticks per loaf: one loaf feeds a resident for two days
const TAX = [0, 3, 5, 8];                    // credits per resident per day
const WORK_PCT = 60;                         // share of residents in the labour force
const BURN = 9600;                           // MW-ticks per unit of coal
const UPG = [null, [[R.bricks, 4], [R.planks, 2]], [[R.bricks, 6], [R.planks, 4], [R.furniture, 2]]];

const VT = {
  truck:     { name: 'Truck', cap: 12, spd: 24, cost: 150, upkeep: 4 },
  train:     { name: 'Freight train', cap: 48, spd: 40, cost: 1000, upkeep: 20, len: 2 },
  barge:     { name: 'Barge', cap: 30, spd: 16, cost: 600, upkeep: 10 },
  freighter: { name: 'Freighter', cap: 120, spd: 22, cost: 0, upkeep: 0 },
};

const COST = { road: 8, roadBridge: 50, rail: 15, railBridge: 70, signal: 25, canal: 30, lock: 400, power: 4 };
const WX = ['Clear', 'Overcast', 'Rain', 'Fog', 'Storm'];
const W_CLEAR = 0, W_CLOUD = 1, W_RAIN = 2, W_FOG = 3, W_STORM = 4;
// speed percentages per weather: [truck, boat, train]
const WX_SPD = [[100, 100, 100], [100, 100, 100], [90, 95, 100], [85, 60, 85], [80, 70, 90]];

/* ---------------- seeded RNG (sfc32), state kept in S.rng ---------------- */
function seedRng(seed) {
  let s = seed >>> 0;
  const sm = () => { s = (s + 0x9E3779B9) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B) >>> 0; z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35) >>> 0; return (z ^ (z >>> 16)) >>> 0; };
  return [sm(), sm(), sm(), sm()];
}
function rngNext(S) {
  const st = S.rng;
  let a = st[0] | 0, b = st[1] | 0, c = st[2] | 0, d = st[3] | 0;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
  t = (t + d) | 0; c = (c + t) | 0;
  st[0] = a >>> 0; st[1] = b >>> 0; st[2] = c >>> 0; st[3] = d >>> 0;
  return t >>> 0;
}
const rngInt = (S, n) => rngNext(S) % n;

/* A small standalone generator for map building (same algorithm). */
function makeGen(seed) { const S = { rng: seedRng(seed) }; return { int: n => rngNext(S) % n, u: () => rngNext(S) }; }

/* ---------------- hashing ---------------- */
function hmix(h, v) { h = Math.imul((h ^ (v | 0)) >>> 0, 0x9E3779B1) >>> 0; return (h ^ (h >>> 15)) >>> 0; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h >>> 0; }
const hex = h => ('00000000' + (h >>> 0).toString(16)).slice(-8);

/* Record an agent decision: folds into a rolling hash and a short log. */
const DEC = ['', 'consign', 'truck', 'train', 'barge', 'signal', 'lockAdmit', 'lockCycle', 'reroute', 'divert',
  'cancel', 'wreck', 'freighter', 'labour', 'power', 'deliver', 'upgrade', 'strand', 'reloc', 'lost', 'berth', 'export'];
function dec(S, code, a, b, c) {
  let h = S.dec.h;
  h = hmix(h, code); h = hmix(h, a); h = hmix(h, b); h = hmix(h, c); h = hmix(h, S.tick);
  S.dec.h = h; S.dec.n++;
  const L = S.dec.log; L.push([S.tick, code, a | 0, b | 0, c | 0]); if (L.length > 400) L.shift();
}

/* ---------------- tide and clock ---------------- */
const SIN = new Int16Array(256);
for (let i = 0; i < 256; i++) SIN[i] = Math.round(Math.sin(i * Math.PI * 2 / 256) * 1000);
const TIDE_P = 1240;                 // ~12.4 h semidiurnal period
const SPRING_P = TPD * 14;           // spring/neap cycle
function tideAt(t) {
  const sp = Math.floor((t % SPRING_P) * 256 / SPRING_P);
  const amp = 42 + Math.floor(8 * SIN[sp] / 1000);
  const ph = Math.floor((t % TIDE_P) * 256 / TIDE_P);
  return 70 + Math.floor(amp * SIN[ph] / 1000);
}
function tideFlow(t) {               // -1000..1000, signed tidal current
  const ph = Math.floor((t % TIDE_P) * 256 / TIDE_P);
  return SIN[(ph + 64) & 255];
}
function clockStr(t) {
  const d = Math.floor(t / TPD) + 1, h = Math.floor((t % TPD) / TPH), m = Math.floor((t % TPH) * 60 / TPH);
  return 'Day ' + d + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
const hourOf = t => Math.floor((t % TPD) / TPH);

/* ---------------- tiny helpers ---------------- */
const tIdx = (S, x, y) => y * S.W + x;
const inb = (S, x, y) => x >= 0 && y >= 0 && x < S.W && y < S.H;
function nb(S, t, d) { const x = t % S.W + DX[d], y = (t / S.W | 0) + DY[d]; return inb(S, x, y) ? y * S.W + x : -1; }
function dirTo(S, a, b) {
  const W = S.W; const dx = (b % W) - (a % W), dy = ((b / W) | 0) - ((a / W) | 0);
  if (dx === 1 && dy === 0) return 1; if (dx === -1 && dy === 0) return 3;
  if (dy === 1 && dx === 0) return 2; if (dy === -1 && dx === 0) return 0; return -1;
}
const isWater = v => v === T_SEA || v === T_CANAL || v === T_LOCK;
const sumArr = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
function resName(r) { return RES[r] ? RES[r].name : '?'; }
function xy(S, t) { return '(' + (t % S.W) + ',' + ((t / S.W) | 0) + ')'; }
