// ---------------------------------------------------------------------------
// Hand drawn heads (facing right). Codes map to costume materials, see
// HEAD_CODES in rig.js: h/H hair, s/S skin, e eye, a/b/c accent ramps,
// E emissive. Outer outlines are generated, so none are drawn here.
// Each head has variants: 0 normal, 1 blink, 2 hurt, 3 shout.
// pts are anchor pixels for live ribbons (ponytails, beards, plumes).
// ---------------------------------------------------------------------------
const HEADS = {};
function mkSprite(rows, ax, ay, pts) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const d = new Uint8Array(w * h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') d[y * w + x] = r.charCodeAt(x); });
  return { w, h, ax, ay, d, pts: pts || {} };
}
function patchSprite(base, patches) {
  const s = { ...base, d: base.d.slice() };
  for (const [x, y, c] of patches) s.d[y * s.w + x] = c === '.' ? 0 : c.charCodeAt(0);
  return s;
}
// variants: { 1: [[x,y,code]...], 2: [...], 3: [...] }
function defHead(name, rows, ax, ay, pts, variants = {}) {
  const base = mkSprite(rows, ax, ay, pts);
  HEADS[name] = [base, 1, 2, 3].map((v, i) => (i === 0 ? base : variants[v] ? patchSprite(base, variants[v]) : base));
}

// Lu Yan: high ponytail tied with a crimson ribbon, side locks
defHead('hero', [
  '...yAh......',
  '..hhhhHh....',
  '.hhhhhhHHh..',
  'hhhhhhhhhHh.',
  'hhhhhhhsSSh.',
  'hhhhhjsSSeS.',
  'hhhhhjsSSSST',
  '.hhhhdsSSSs.',
  '..hhhdssdss.',
  '...hj.ddss..',
  '......dd....',
], 6, 10, { hair: [3, 0], ribbon: [4, 0] }, {
  1: [[9, 5, 'd']], 2: [[9, 5, 'D'], [8, 5, 'd'], [8, 8, 'e']], 3: [[8, 8, 'e'], [9, 8, 'm']],
});

// Qin Shuang: bun with jade pin, long hair down the back
defHead('qin', [
  '...cC.......',
  '...hhhh.....',
  '..hhhhhHH...',
  '..hhhhhhHH..',
  '.hhhhhhhhHh.',
  '.hhhhhhhhhhh',
  '.hhhhhjsSShh',
  '.hhhhjsSeSS.',
  '.hhhhjsSSSS.',
  '.jhhhjdsSSs.',
  '..jhhjdsAs..',
  '...j..dds...',
  '.....dd.....',
], 6, 12, { hair: [2, 5] }, { 1: [[8, 7, 'd']], 2: [[8, 7, 'D'], [8, 10, 'e']], 3: [[8, 10, 'e']] });

// Master Bai: white hair, small gold crown, long beard
defHead('bai', [
  '.....BB.....',
  '....hB%h....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhhhHH.',
  '.hhhhhjsSII.',
  '.hhhhjsSeSS.',
  '.jhhhjsSSSST',
  '..jhhjHIIHs.',
  '..jhhjhHHHh.',
  '...jhjhHHHh.',
  '......hHHh..',
  '.....dhHh...',
], 6, 12, { beard: [8, 11], hair: [3, 2] }, { 1: [[8, 6, 'd']], 2: [[8, 6, 'D']] });

// Mo Ying, the Faceless Blade: black hood, blank bone mask
defHead('moying', [
  '............',
  '....hhhh....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhhhHh.',
  '.hhhhhhh&*h.',
  '.hhhhhhC&&*.',
  '.hhhhhhCxx&.',
  '.hhhhhhC&&&&',
  '.jhhhhhcC&&.',
  '..jhhhhhcC..',
  '...jhhhh....',
  '.....hh.....',
], 6, 12, { hood: [2, 9] }, { 2: [[8, 7, 'E'], [9, 7, 'x']] });

// Crimson cult initiate: red hood, painted bone mask
defHead('cultist', [
  '............',
  '....hhhh....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhh&*h.',
  '.hhhhhhC&**.',
  '.hhhhhhCxAx.',
  '.hhhhhhC&A&.',
  '.hhhhhhC&A&&',
  '.jhhhhhcC&&.',
  '..jhhhhcCC..',
  '...jhhh.....',
  '.....dd.....',
], 6, 12, { hood: [2, 8] }, { 2: [[8, 6, 'c'], [10, 6, 'c']] });

// Cult spearman: bronze helmet with plume socket
defHead('spear', [
  '.....BB.....',
  '....b%%B....',
  '...bBB%%B...',
  '..bBBBBB%B..',
  '..bbbbbbbbb.',
  '.jhhhhjsSSs.',
  '.jhhhjsSeSS.',
  '.jhhhjsSSSST',
  '..jhhjdsSS..',
  '..jhhbdsms..',
  '....b.dds...',
  '.....dd.....',
], 6, 11, { plume: [5, 0] }, { 1: [[8, 6, 'd']], 2: [[8, 6, 'D'], [8, 9, 'e']] });

// Shadow assassin: black wrap, only the eyes show
defHead('assassin', [
  '............',
  '....hhhh....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhhhHh.',
  '.hhhhhhhhhh.',
  '.hhhhhhsSSh.',
  '.hhhhhhseSs.',
  '.hhhhhhhhhhh',
  '.jhhhhhhhHh.',
  '..jhhhhhhh..',
  '...jhhhh....',
  '.....hh.....',
], 6, 12, { scarf: [3, 10] }, { 2: [[8, 7, 'd']] });

// Black Wind bandit brute: bald, topknot, big beard
defHead('brute', [
  '......hh......',
  '.....sSSs.....',
  '...dsSSSTTs...',
  '..dsssSSSSTs..',
  '..dssssSSSSSs.',
  '.ddsssssSSSSs.',
  '.ddssssDDDSSs.',
  '.dddsssseSSSSs',
  '.dddssssSSSSST',
  '..ddhhhhhhSSs.',
  '..dhhhhhhhhh..',
  '...hhhhhhhh...',
  '....hhhhhh....',
  '.....dddd.....',
], 6, 13, { knot: [6, 0] }, { 1: [[8, 7, 'd']], 2: [[8, 7, 'D'], [7, 7, 'e']] });

// Bandit: headband, scruffy hair
defHead('bandit', [
  '............',
  '...hhhhh....',
  '..hhhhhHH...',
  '.hhhhhhhHH..',
  '.aaAAAA@@@..',
  '.hhhhhhsSSs.',
  '.hhhhjsSeSS.',
  '.jhhhjsSSSST',
  '..jhhjdsSSs.',
  '..jhhjhhhs..',
  '...j..dhs...',
  '.....dd.....',
], 6, 11, { band: [1, 4] }, { 1: [[8, 6, 'd']], 2: [[8, 6, 'D'], [8, 9, 'e']] });

// Archer: wide conical straw hat, face in shade
defHead('archer', [
  '......A@.......',
  '.....AA@@......',
  '....aAAA@@.....',
  '..aaaAAAA@@@...',
  'yyaaaaaaaaaaayy',
  '...jhhhddss....',
  '...jhhdsSeS....',
  '...jhhdsSSSS...',
  '....jhddsSs....',
  '....jhdsms.....',
  '......dds......',
  '......dd.......',
], 7, 11, {}, { 1: [[9, 6, 'd']], 2: [[9, 6, 'D']] });

// Jiangshi: official's hat; the talisman is a live ribbon
defHead('jiangshi', [
  '.....aa.....',
  '....hhhh....',
  '..hhhhhHHh..',
  '.hhhhhhhhHh.',
  'hhhhhhhhhhhh',
  '..jhhhdsSS..',
  '..jhhdsSeS..',
  '..jhhdsSSSS.',
  '...jhdsSSs..',
  '...jhddsms..',
  '......dds...',
  '.....dd.....',
], 6, 11, { talisman: [10, 4] }, { 2: [[8, 6, 'E']] });

// Silver Needle Liu: pinned bun, jade earring, painted lips
defHead('liu', [
  '..%...hh....',
  '...Bhhhhh...',
  '..hhhhhhHh..',
  '..hhhhhhhHH.',
  '.hhhhhhhhhH.',
  '.hhhhhhhhhhh',
  '.hhhhhjsSShh',
  '.hhhhjsSeSS.',
  '.hhhhjsSSSS.',
  '.jhhhcdsSSs.',
  '..jhhCdsAs..',
  '...j..dds...',
  '.....dd.....',
], 6, 12, { hair: [2, 6] }, { 1: [[8, 7, 'd']], 2: [[8, 7, 'D'], [8, 10, 'e']], 3: [[8, 10, 'e']] });

// Tie Fo, the Iron Buddha: shaved head with ordination scars
defHead('tiefo', [
  '....dsssss....',
  '...dsdSdSdS...',
  '..dssSSSSSTs..',
  '..dsssSSSSSSs.',
  '.ddssssSSSSSs.',
  '.ddsssDDDDSSs.',
  '.dddsssDeSSSSs',
  '.dddssssSSSSST',
  '.dddsssssSSSs.',
  '..ddsssdmmmSs.',
  '..dddsssssSs..',
  '...dddssss....',
  '.....dddd.....',
], 6, 12, {}, { 1: [[8, 6, 'D']], 2: [[8, 6, 'D'], [9, 9, 'e'], [10, 9, 'e']], 3: [[8, 9, 'e'], [9, 9, 'e'], [10, 9, 'e']] });

// Xue Tianmo, the Crimson Heaven Demon: loose hair, gold crown, burning eye
defHead('demon', [
  '.....BB.....',
  '....hB%h....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhhhHh.',
  '.hhhhhhhhhh.',
  '.hhhhhjsSSh.',
  '.hhhhjsSESS.',
  '.hhhhjsSSSST',
  'hhhhhjdsSS..',
  'hhhhhjdsms..',
  'hhhh..dds...',
  'hhh..dd.....',
], 6, 12, { hair: [1, 6] }, { 2: [[8, 7, 'G']], 3: [[8, 10, 'e']] });

// Elder Gu Wen: grey topknot, thin moustache
defHead('guwen', [
  '....hhh.....',
  '...hHHHh....',
  '...hhhhHH...',
  '..hhhhhhHH..',
  '..hhhhhhhHh.',
  '.jhhhhjsSSs.',
  '.jhhhjsSeSS.',
  '.jhhhjsSSSST',
  '..jhhjdshhs.',
  '..jhhjdsss..',
  '....j.dhh...',
  '.....ddh....',
  '.....dd.....',
], 6, 12, {}, { 1: [[8, 6, 'd']], 2: [[8, 6, 'D'], [8, 9, 'e']] });

// Villager: cloth cap
defHead('villager', [
  '............',
  '....aaaa....',
  '...aAAA@@...',
  '..aaaaaaaa..',
  '..hhhhhhhs..',
  '.hhhhhjsSSs.',
  '.hhhhjsSeSS.',
  '.jhhhjsSSSST',
  '..jhhjdsSS..',
  '...jhjdsms..',
  '......dds...',
  '.....dd.....',
], 6, 11, {}, { 1: [[8, 6, 'd']], 2: [[8, 6, 'D'], [8, 9, 'e']] });
