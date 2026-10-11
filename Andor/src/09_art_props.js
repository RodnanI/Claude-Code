// ANDOR :: creature and prop sprites.

const ART = {};
(function buildArt() {
  const S = (rows, pal, ax, ay) => mkSprite(rows, pal, ax, ay);

  // --- Scorpion -----------------------------------------------------------
  const sp = { k: '#170c08', a: '#7a3a18', A: '#4e2410', y: '#b8622c', s: '#f0c040', S: '#9a6a10', e: '#ff5a2a' };
  ART.scorpion = [
    S(['....kkkk........', '...kyaaak.......', '..kak..kak......', '..kak...kssk....', '..kak....kk.....', '...kak..........', '...kyaaaaaak.kk.', '..kyaaaaaaaakyak', '..kAAAAAAAeAkaak', '..kkAkAkAkAkkkk.', '...k.k.k.k.k....'], sp, 8, 11),
    S(['....kkkk........', '...kyaaak.......', '..kak..kak......', '..kak...kssk....', '..kak....kk.....', '...kak..........', '...kyaaaaaak.kk.', '..kyaaaaaaaakyak', '..kAAAAAAAeAkaak', '..kkkAkAkAkAkkk.', '..k.k.k.k.k.....'], sp, 8, 11),
    // strike: tail lashing forward
    S(['................', '.......kkkkk....', '......kyaaaak...', '.....kak....kk..', '....kak......sk.', '...kak.......kS.', '...kyaaaaaak.kk.', '..kyaaaaaaaakyak', '..kAAAAAAAeAkaak', '..kkAkAkAkAkkkk.', '...k.k.k.k.k....'], sp, 8, 11),
  ];
  // --- Cobra --------------------------------------------------------------
  const cp = { k: '#140f08', g: '#5a6224', G: '#343a14', Y: '#d8c070', e: '#ff6a2a', r: '#d9482f', h: '#7a8430' };
  const cobraBase = ['...kgYk.....', '...kgYk.....', '..kgYgk.....', '.kkgggkkkk..', 'kgggggggggk.', 'khgGgGgGgGk.', '.kkkkkkkkkk.'];
  ART.cobra = [
    S(['....kkk.....', '...kgggk....', '..kghGegk...', '..kgGGGgk...', '..kgYYYgk...', '...kgYgk....', '....kgYk....', '....kgYk....', ...cobraBase], cp, 5, 15),
    S(['....kkk.....', '...kgggk....', '..kghGegkk..', '..kgGGGgkrk.', '..kgYYYgk...', '...kgYgk....', '...kgYk.....', '...kgYk.....', ...cobraBase], cp, 5, 15),
    S(['.....kkk....', '....kgggk...', '...kghGegkk.', '...kgGGGgkrr', '...kgYYYgk..', '....kgYgk...', '....kgYk....', '...kgYk.....', ...cobraBase], cp, 5, 15),
  ];
  // --- Vulture ------------------------------------------------------------
  const vp = { k: '#140c08', b: '#4a2e22', B: '#2e1c14', w: '#e8dcc0', h: '#d88a6a', y: '#e0b040', f: '#6e4a36' };
  ART.vulture = [
    S(['kk..............kk..', 'kbk............kbk..', '.kbk..........kbk...', '.kbbk.......kkbbk...', '..kbbkkwwk.kbbbk....', '...kbbbwwhhkbbk.....', '....kBBbbbhykk......', '.....kBBbbbk........', '......kfkfk.........', '......k.k.k.........'], vp, 10, 10),
    S(['....................', '....................', '........kwwk........', '...kkkkkwwhhk.......', '.kkbbbbbbbhyk.......', 'kbbbbbBBbbbkkkk.....', '.kkbbBBBbbbbbbbkk...', '...kkkBBbbkkkkbbk...', '......kfkfk...kk....', '......k.k.k.........'], vp, 10, 10),
  ];
  // --- Bat ----------------------------------------------------------------
  const bp = { k: '#0c0808', b: '#3a2a2e', B: '#241a1e', e: '#ff4a2a', f: '#5a4448' };
  ART.bat = [
    S(['k............k', 'kbk..k..k..kbk', '.kbbkbkkbkbbk.', '..kbbbeebbbk..', '...kbbbbbbk...', '....kBkkBk....', '.....k..k.....'], bp, 7, 7),
    S(['..............', '.....k..k.....', '....kbkkbk....', 'kkkbbbeebbbkkk', 'kbbbBbbbbBbbbk', '.kk.kBkkBk.kk.', '.....k..k.....'], bp, 7, 7),
  ];
  // --- Scarab -------------------------------------------------------------
  const sc = { k: '#0a0c0a', g: '#1f5c4a', G: '#103a2e', y: '#dea12a', h: '#5fd0a8' };
  ART.scarab = [
    S(['..kk..', '.kyyk.', 'kghggk', 'kgGgGk', 'kggggk', 'k.kk.k'], sc, 3, 6),
    S(['..kk..', '.kyyk.', 'kghggk', 'kgGgGk', 'kggggk', '.k..k.'], sc, 3, 6),
  ];

  // --- Pickups ------------------------------------------------------------
  const gp = { k: '#6a3c0a', y: '#e3a92f', Y: '#fff1b3', A: '#b07418', a: '#8a5410' };
  ART.coin = [
    S(['..kkk..', '.kyYyk.', 'kyYAyyk', 'kyAyyAk', 'kyyyyAk', '.kyAAk.', '..kkk..'], gp, 3, 7),
    S(['..kk..', '.kYyk.', 'kyYAyk', 'kyAyAk', 'kyyyAk', '.kyAk.', '..kk..'], gp, 3, 7),
    S(['.kk.', 'kYyk', 'kYAk', 'kyAk', 'kyAk', 'kyAk', '.kk.'], gp, 2, 7),
    S(['.k.', 'kYk', 'kyk', 'kyk', 'kak', 'kak', '.k.'], gp, 1, 7),
  ];
  ART.gem = S(['..kkk..', '.kEeEk.', 'kEeeEEk', 'kEeEEdk', '.kEEdk.', '..kdk..', '...k...'], { k: '#06200f', E: '#25b56a', e: '#a8ffc8', d: '#0d6a3a' }, 3, 7);
  ART.ruby = S(['..kkk..', '.kRrRk.', 'kRrrRRk', 'kRrRRdk', '.kRRdk.', '..kdk..', '...k...'], { k: '#2a0608', R: '#d9302a', r: '#ffb0a0', d: '#7e1015' }, 3, 7);
  ART.pomegranate = S(['...kgk...', '..kgkgk..', '..kRrRk..', '.kRrrrRk.', 'kRrwrrrRk', 'kRrrrrrRk', 'kRrrrrRRk', '.kRrRRRk.', '..kkkkk..'], { k: '#2a0a0c', g: '#5a8a3a', R: '#a8202a', r: '#d9443a', w: '#ffd0c0' }, 4, 9);
  ART.scroll = S(['.kkkkkkk.', 'kcCcccCck', 'kccrrrcck', 'kcCcccCck', '.kkkkkkk.'], { k: '#2a1a0e', c: '#f2e2b8', C: '#c9b080', r: '#b02a2c' }, 4, 5);
  const rp = { k: '#3a1e06', y: '#dea12a', Y: '#fff1b3', A: '#9a5e12', a: '#6e3f10', t: '#3fb5a3', T: '#1f6a60', e: '#25b56a', E: '#a8ffc8', r: '#c0392b', w: '#f9edd2', d: '#0d3a26' };
  ART.relics = {
    bazaar: S(['....kk.....', '...kyyk....', '...kkkk....', '.kkyyyykk..', 'kyyYkkYyyk.', 'kyYkyykYyk.', 'kykyrrykyk.', 'kyYkyykYyk.', 'kyyYkkYyyk.', '.kkyyyykk..', '...kkkk....'], rp, 5, 11),
    desert: S(['....kk.....', '...kyyk....', '..kttttk...', '.ktTttTtk..', 'kyktttttkyk', '.kttTTTttk.', 'kyktttttkyk', '.ktTtttTtk.', '..ktttttk..', '...kyyyk...', '....kkk....'], rp, 5, 11),
    tomb: S(['...kkkkk...', '..kyYYYyk..', '.kyYkYkYyk.', '.kyYYYYYyk.', '.kyykkkyyk.', '..kyyyyyk..', '.kyYyyyYyk.', 'kyYyyyyyYyk', 'kyyyAyAyyyk', '.kyyyyyyyk.', '..kkkkkkk..'], rp, 5, 11),
    andor: S(['...........', '..kkkkkkk..', '.kyyyyyyyk.', 'kyeeEEEeeyk', 'kyeEdddEeyk', 'kyeEdEdEeyk', 'kyeEdddEeyk', 'kyyeeEeeyyk', '.kkyyyykk..', '...kyk.ky..', '...kk...k..'], rp, 5, 11),
  };
  ART.ring = S(['...kkk...', '...kAk...', '..kkAkk..', '.kyYYYyk.', 'kyk...kyk', 'kYk...kyk', 'kyk...kAk', '.kyyyAAk.', '..kkkkk..'], rp, 4, 4);

  // --- Props --------------------------------------------------------------
  const potShape = ['...kkkk...', '...kyyk...', '..kkkkkk..', '.kttTTttk.', 'kttTTTTttk', 'ktTTttTTtk', 'kttttttttk', 'kTttwttTTk', 'kTTttttTTk', '.kTTTTTTk.', '..kkkkkk..'];
  ART.pot = {
    bazaar: S(potShape, { k: '#10181a', y: '#dea12a', t: '#3fb5a3', T: '#1f6a60', w: '#e9fff4' }, 5, 11),
    desert: S(potShape, { k: '#2a1408', y: '#e3c08a', t: '#c47a42', T: '#8a4a26', w: '#f2c98d' }, 5, 11),
    tomb: S(['..kkkkkk..', '.kyYyyYyk.', '.kyysyyyk.', '..kkkkkk..', '.kwwWWwwk.', 'kwwWyyWwwk', 'kwWwyywWwk', 'kwwWyyWwwk', 'kWwwwwwWWk', '.kWWWWWWk.', '..kkkkkk..'], { k: '#1c140e', y: '#dea12a', Y: '#fff1b3', s: '#3a2a1a', w: '#e8dcc0', W: '#b8aa88' }, 5, 11),
    andor: S(potShape, { k: '#0d0a08', y: '#79f0a5', t: '#dea12a', T: '#a86d16', w: '#fff1b3' }, 5, 11),
  };
  ART.brazier = S(['.kkkkkkkkkk.', 'kyYYYYYYYYyk', '.kyAAAAAAyk.', '..kyAAAAyk..', '...kkyykk...', '....kAAk....', '...kA..Ak...', '..kA....Ak..', '.kk......kk.'], rp, 6, 9);
  ART.lever = [
    S(['........kk', '.......kyk', '......kyk.', '.....kyk..', '....kak...', '..kkAkk...', '.kAAAAAk..', 'kAaaaaaAk.'], rp, 4, 8),
    S(['kk........', 'kyk.......', '.kyk......', '..kyk.....', '...kak....', '...kkAkk..', '..kAAAAAk.', '.kAaaaaaAk'], rp, 5, 8),
  ];
  ART.torch = S(['.kk.', 'kAAk', 'kaak', '.ka.', '.ka.', 'kkkk', 'kAAk'], rp, 2, 7);
  ART.lantern = S(['..k..', '..k..', '.kyk.', 'kyYyk', 'kYwYk', 'kYwYk', 'kyYyk', '.kyk.', '..k..'], { k: '#2a1a0a', y: '#dea12a', Y: '#f4cf62', w: '#fff8d0' }, 2, 0);
  ART.dartFace = S(['.kkkkkkkkkkkkk.', 'kwWWWWWWWWWWWWk', 'kWwwwwwwwwwwwWk', 'kWwkkwwwwwkkwWk', 'kWwkewwwwwkewWk', 'kWwwwwwwwwwwwWk', 'kWwwwwkkkwwwwWk', 'kWwwwwkdkwwwwWk', 'kWwwwwkkkwwwwWk', 'kWwwwwwwwwwwwWk', '.kWWWWWWWWWWWk.'], { k: '#1c140e', w: '#a8977a', W: '#6e6250', e: '#ff8a2a', d: '#000000' }, 7, 10);
  ART.skull = S(['.kkkk.', 'kwwwwk', 'kwkwkw', 'kwwwwk', '.kwkk.'], { k: '#2a2218', w: '#e8dcc0' }, 3, 5);

  // Decor: camel resting (bazaar/desert)
  ART.camel = S([
    '..........kkk.......',
    '.........kcck.......',
    '.........kcCkk......',
    '..........kcck......',
    '....kkk...kcck......',
    '..kkcccckkkcck......',
    '.kcccccccccCck......',
    'kcCccccccccccck.....',
    'kcCCcccccccccck.....',
    '.kCCCcccccccCk......',
    '..kkkkkkkkkkkk......',
  ], { k: '#2a1a0e', c: '#c99a5c', C: '#9a6a3a' }, 7, 11);
  ART.sarcophagus = S([
    '....kkkk....', '...kyYYyk...', '..kylyylyk..', '.kylyYYylyk.', '.klyYyyYylk.', '.kyYkyykYyk.', '.klyYyyYylk.', '.kylyYYylyk.',
    '.klyykkyylk.', '..kyyyyyyk..', '.kkrrggrrkk.', 'kgyrryyrrygk', 'kyyyYkkYyyyk', 'kyyYkyykYyyk', 'kwwwwwwwwwwk', 'kwllwwwwllwk',
    'kwwwwyywwwwk', 'kwlwlwwlwlwk', 'kwwwwwwwwwwk', '.kwwyyyywwk.', '.kwwwwwwwwk.', '.kwlwlwlwlk.', '..kwwwwwwk..', '..kkkkkkkk..',
  ], { k: '#1c140e', y: '#dea12a', Y: '#fff1b3', l: '#2b4a7c', r: '#a8432c', g: '#2f7f74', w: '#e4d4b0' }, 6, 24);
  ART.crystal = S([
    '.....k......', '....kek.....', '....kEk..k..', '.k..kEek.ek.', 'kek.kEEk.Ek.', 'kEk.kEEkkEk.', 'kEEkkEEkEEk.', '.kEEkEEEEk..', '.kEEEEEEEk..', 'kddddddddddk',
  ], { k: '#06200f', e: '#a8ffc8', E: '#25b56a', d: '#3a2a10' }, 6, 10);
  // Date palm: ringed trunk with a crown of drooping fronds and dates.
  (function palm() {
    const W = 30, H = 44, pb = new PixBuf(W, H);
    const tr = C('#7a5232'), trD = C('#4e3220'), trL = C('#a8763e'), out = C('#2a1a0e');
    const fr = C('#4f7a33'), frD = C('#2f4a22'), frL = C('#89ad48'), date = C('#b8622c');
    let x = 15;
    for (let y = H - 1; y > 14; y--) {
      const lean = Math.round(Math.sin((H - y) / 30) * 3);
      const cx = x + lean;
      pb.set(cx - 2, y, out);
      pb.set(cx + 2, y, out);
      pb.set(cx - 1, y, (y % 3 === 0) ? trD : trL);
      pb.set(cx, y, (y % 3 === 0) ? trD : tr);
      pb.set(cx + 1, y, trD);
    }
    const topX = 15 + Math.round(Math.sin((H - 15) / 30) * 3), topY = 14;
    for (let k = 0; k < 8; k++) {
      const a = Math.PI + (k / 7) * Math.PI;
      const len = 12 + (k % 2) * 2;
      for (let i = 0; i < len; i++) {
        const u = i / len;
        const fx = topX + Math.cos(a) * i * 1.05, fy = topY + Math.sin(a) * i * 0.55 + u * u * 9;
        pb.set(fx, fy + 1, out);
        pb.set(fx, fy, u < 0.5 ? frL : fr);
        if (i % 2 === 0 && u > 0.2) pb.set(fx, fy + 2, frD);
      }
    }
    for (const [dx, dy] of [[-2, 2], [-1, 3], [1, 3], [2, 2], [0, 4]]) pb.set(topX + dx, topY + dy, date);
    ART.palm = new Sprite(pb.toCanvas(), 15, H);
  })();
  // Bedouin tent: striped goat-hair cloth on poles, guy ropes, a rug at the door.
  (function tent() {
    const W = 40, H = 22, pb = new PixBuf(W, H);
    const k = C('#1c120d'), dark = C('#3a2a22'), mid = C('#5a4030'), cream = C('#d8c49a'), rope = C('#c9b080'), rugR = C('#b02a2c'), rugY = C('#dea12a');
    for (let x = 2; x < W - 2; x++) {
      const t = Math.abs(x - W / 2) / (W / 2 - 2);
      const top = Math.round(3 + t * t * 9);
      for (let y = top; y < H - 1; y++) {
        let col = Math.floor(x / 3) % 4 === 0 ? cream : (y + x) % 7 === 0 ? mid : dark;
        if (y === top) col = k;
        if (x > W / 2 - 5 && x < W / 2 + 4 && y > H - 10) col = C('#120a06');
        pb.set(x, y, col);
      }
    }
    for (const px of [W / 2 - 1, 4, W - 5]) for (let y = 1; y < H; y++) if (px === W / 2 - 1 || y > 10) pb.set(px, y, C('#6b4024'));
    for (let i = 0; i < 6; i++) {
      pb.set(1 - i * 0.2, 12 + i * 1.6, rope);
      pb.set(W - 2 + i * 0.2, 12 + i * 1.6, rope);
    }
    for (let x = W / 2 - 7; x < W / 2 + 7; x++) pb.set(x, H - 1, (x % 2) ? rugR : rugY);
    ART.tent = new Sprite(pb.toCanvas(), W >> 1, H);
  })();
})();

// Procedural flame drawn upward from (x, y); size ~ height in pixels.
function drawFlame(g, x, y, size, t, seed = 0) {
  x = Math.round(x);
  y = Math.round(y);
  const h = size;
  for (let i = 0; i < h; i++) {
    const u = i / h;
    const w = Math.max(0, Math.round((1 - u) * (size * 0.38) * (0.8 + 0.2 * Math.sin(t * 13 + i + seed))));
    const off = Math.round(Math.sin(t * 9 + i * 0.7 + seed) * u * 1.6);
    const col = u < 0.25 ? '#fff3b8' : u < 0.5 ? '#ffc444' : u < 0.78 ? '#f07a22' : '#c8401a';
    if (w <= 0 && u > 0.6) continue;
    g.fillStyle = col;
    g.fillRect(x - w + off, y - i, w * 2 + 1, 1);
  }
  g.fillStyle = '#fff8ea';
  g.fillRect(x, y - 1, 1, 1);
}
