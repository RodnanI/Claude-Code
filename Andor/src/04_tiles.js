// ANDOR :: procedural tile painting. Every tile is painted in world space with
// seeded noise, so seams vanish and no two walls repeat.

const T = {
  EMPTY: 0, SOLID: 1, ALT: 2, ONEWAY: 3, AWNING: 4, SPIKE_U: 5, SPIKE_D: 6, SPIKE_L: 7, SPIKE_R: 8,
  QUICK: 9, FAKE: 10, CRUMBLE: 11, GATE: 12, ROPE: 13,
};
const isSolidT = (t) => t === T.SOLID || t === T.ALT || t === T.CRUMBLE || t === T.GATE;
const isOneWayT = (t) => t === T.ONEWAY || t === T.AWNING || t === T.ROPE;
const isSpikeT = (t) => t >= T.SPIKE_U && t <= T.SPIKE_R;

// Small carved hieroglyphs (also used as UI ornaments).
const GLYPHS = [
  ['.###.', '#...#', '.#.#.', '#####', '..#..', '..#..', '..#..'],
  ['.#####.', '#..#..#', '.#####.', '...#.#.', '..#...#'],
  ['.##..', '#.##.', '..##.', '.####', '.####', '..#.#', '.#..#'],
  ['..##.', '.#..#', '..#..', '...#.', '..#..', '.#...', '.####'],
  ['.#.#.#.', '#.#.#.#'],
  ['..#..', '.##..', '.#.#.', '.#.#.', '..##.', '..#..', '..#..'],
  ['.###.', '#.#.#', '#####', '#.#.#', '.###.'],
  ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  ['..#', '.##', '.##', '.##', '.#.', '.#.', '#..'],
  ['#####', '.###.', '#####', '.###.', '#####', '.#.#.', '.#.#.'],
  ['.##.', '#..#', '#..#', '.##.', '..#.', '.##.', '#..#'],
  ['...#', '..##', '.###', '####', '#...'],
];

function paintGlyph(pb, gi, x, y, dark, light) {
  const g = GLYPHS[gi % GLYPHS.length];
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[r].length; c++)
      if (g[r][c] === '#') {
        pb.set(x + c, y + r, dark);
        if (light !== undefined && !(g[r + 1] && g[r + 1][c] === '#')) pb.set(x + c, y + r + 1, light);
      }
}

// 8-point star tilework motif, 8x8, used for Persian glazed tiles.
const GIRIH = ['t..ww..t', '.t.ww.t.', '..tttt..', 'wwtyytww', 'wwtyytww', '..tttt..', '.t.ww.t.', 't..ww..t'];

// Each theme: palette + painters. Painters receive the pixel buffer, tile
// pixel origin (px, py), world tile coords (tx, ty), and neighbour solidity.
function nb(level, tx, ty) {
  const s = (x, y) => level.solidAt(x, y);
  return {
    u: s(tx, ty - 1), d: s(tx, ty + 1), l: s(tx - 1, ty), r: s(tx + 1, ty),
    ul: s(tx - 1, ty - 1), ur: s(tx + 1, ty - 1), dl: s(tx - 1, ty + 1), dr: s(tx + 1, ty + 1),
  };
}

// Common edge treatment for a solid tile: outline where exposed and round corners.
function edgeTile(pb, px, py, n, out, hi, sh) {
  if (!n.u) for (let x = 0; x < 16; x++) pb.set(px + x, py, out);
  if (!n.d) for (let x = 0; x < 16; x++) pb.set(px + x, py + 15, out);
  if (!n.l) for (let y = 0; y < 16; y++) pb.set(px, py + y, out);
  if (!n.r) for (let y = 0; y < 16; y++) pb.set(px + 15, py + y, out);
  if (!n.u) for (let x = !n.l ? 1 : 0; x < (!n.r ? 15 : 16); x++) pb.set(px + x, py + 1, hi);
  if (!n.l) for (let y = !n.u ? 2 : 0; y < (!n.d ? 15 : 16); y++) pb.set(px + 1, py + y, hi);
  if (!n.r && sh) for (let y = !n.u ? 2 : 0; y < (!n.d ? 15 : 16); y++) pb.set(px + 14, py + y, sh);
  if (!n.d && sh) for (let x = !n.l ? 1 : 0; x < (!n.r ? 15 : 16); x++) pb.set(px + x, py + 14, sh);
  const clr = 0;
  if (!n.u && !n.l) { pb.set(px, py, clr); pb.set(px + 1, py + 1, out); }
  if (!n.u && !n.r) { pb.set(px + 15, py, clr); pb.set(px + 14, py + 1, out); }
  if (!n.d && !n.l) { pb.set(px, py + 15, clr); pb.set(px + 1, py + 14, out); }
  if (!n.d && !n.r) { pb.set(px + 15, py + 15, clr); pb.set(px + 14, py + 14, out); }
}

const THEMES = {};
const PAINT = { level: null };

// ---------------------------------------------------------------------------
// ISFAHAN BAZAAR: plastered adobe, exposed brick, glazed tile bands, cedar beams.
THEMES.bazaar = (() => {
  const c = {
    out: C('#3a2214'), pl0: C('#e2b57a'), pl1: C('#d1a066'), pl2: C('#b98549'), pl3: C('#9c6a37'),
    br0: C('#a5603b'), br1: C('#874a2c'), mor: C('#c49a6c'), cap0: C('#f6dcaa'), cap1: C('#e8c48a'), capS: C('#8d5c30'),
    t: C('#3fb5a3'), tD: C('#22396e'), w: C('#f2e6c8'), y: C('#dea12a'), grout: C('#e9dcc0'),
    wd0: C('#b07a45'), wd1: C('#8b5a34'), wd2: C('#5e3a20'), rope: C('#d8c49a'),
    bk0: C('#6c4528'), bk1: C('#5d3a21'), bk2: C('#4b2e19'), bkB: C('#6e3c26'), beam: C('#2f1c10'), beamH: C('#4a2e1a'),
  };
  const theme = { c, spike: ['#3a3a40', '#8a8a92', '#d8d8de'], name: 'bazaar' };
  theme.solid = (pb, px, py, tx, ty, n) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const v = fbm(wx / 14, wy / 14, 11);
        let col = v > 0.5 ? c.pl0 : v > 0.35 ? c.pl1 : c.pl2;
        if (Math.abs(v - 0.5) < 0.035) col = bayer(wx, wy) > 0.5 ? c.pl1 : c.pl0;
        // exposed brick where the plaster has fallen away
        const e = fbm(wx / 15 + 40, wy / 15, 5);
        if (e > 0.69) {
          const row = Math.floor(wy / 4), off = (row & 1) * 4;
          const mortar = wy % 4 === 3 || (wx + off) % 8 === 7;
          col = mortar ? c.mor : hash2(Math.floor((wx + off) / 8), row, 3) > 0.5 ? c.br0 : c.br1;
          if (e < 0.715) col = c.pl3;
        }
        pb.set(wx, wy, col);
      }
    // hairline cracks
    if (hash2(tx, ty, 9) < 0.25) {
      let x = px + 3 + Math.floor(hash2(tx, ty, 10) * 10), y = py + 2 + Math.floor(hash2(tx, ty, 12) * 6);
      for (let i = 0; i < 7; i++) {
        pb.set(x, y, c.pl3);
        y++;
        x += hash2(tx + i, ty, 13) > 0.5 ? 1 : -1;
      }
    }
    edgeTile(pb, px, py, n, c.out, c.pl0, c.pl3);
    // houses, not rock: arched lattice windows (some lamplit) and beam ends
    if (n.u && n.d && n.l && n.r && PAINT.level) {
      // windows sit in storeys counted down from the roof line above
      let d = 0;
      while (d < 14 && PAINT.level.solidAt(tx, ty - d - 1)) d++;
      if (d % 3 === 1 && tx % 3 === 1 && hash2(tx, ty, 101) < 0.72) paintWindow(pb, px + 4, py + 2, hash2(tx, ty, 102) < 0.4);
    }
    if (!n.u) {
      // flat roof parapet cap
      for (let x = 0; x < 16; x++) {
        if ((x === 0 && !n.l) || (x === 15 && !n.r)) continue;
        pb.set(px + x, py + 1, c.cap0);
        pb.set(px + x, py + 2, c.cap1);
        pb.set(px + x, py + 3, bayer(px + x, py) > 0.5 ? c.cap1 : c.capS);
        pb.set(px + x, py + 4, c.capS);
        // projecting cedar beam ends under the parapet
        if ((px + x) % 6 === 2 && x > 0 && x < 15) {
          pb.set(px + x, py + 6, c.wd2);
          pb.set(px + x + 1, py + 6, c.wd1);
          pb.set(px + x, py + 7, c.out);
          pb.set(px + x + 1, py + 7, c.wd2);
        }
      }
    }
  };
  theme.rope = (pb, px, py, tx, ty, n) => {
    const rope = C('#d8c49a'), ropeD = C('#8a7a5a');
    const cloths = ['#b02a2c', '#f2e6c8', '#3fb5a3', '#dea12a', '#c47a42', '#2a807c'].map((h) => C(h));
    for (let x = 0; x < 16; x++) {
      const sag = Math.round(Math.sin(((px + x) % 48) / 48 * Math.PI) * 1);
      pb.set(px + x, py + sag, rope);
      pb.set(px + x, py + 1 + sag, ropeD);
    }
    // a garment pegged to the line in most cells
    const r = hash2(tx, ty, 120);
    if (r < 0.8) {
      const col = cloths[Math.floor(r * 100) % cloths.length], w = 6 + Math.floor(r * 5), h = 6 + Math.floor(hash2(tx, ty, 121) * 6);
      const x0 = px + 2 + Math.floor(hash2(tx, ty, 122) * (14 - w));
      for (let y = 2; y < h; y++)
        for (let x = 0; x < w; x++) {
          const edge = y === h - 1 && x % 2 === 1;
          if (edge) continue;
          pb.set(x0 + x, py + y, y === 2 || x === w - 1 ? mixC(col) : col);
        }
      pb.set(x0 + 1, py + 1, C('#5e3a20'));
      pb.set(x0 + w - 2, py + 1, C('#5e3a20'));
    }
    if (!n.lw) for (let y = -6; y < 16; y++) { pb.set(px, py + y, C('#5e3a20')); pb.set(px + 1, py + y, C('#3a2214')); }
    if (!n.rw) for (let y = -6; y < 16; y++) { pb.set(px + 14, py + y, C('#5e3a20')); pb.set(px + 15, py + y, C('#3a2214')); }
  };
  theme.alt = (pb, px, py, tx, ty, n) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const ch = GIRIH[wy & 7][wx & 7];
        let col = ch === 't' ? c.t : ch === 'w' ? c.w : ch === 'y' ? c.y : c.tD;
        if ((wx & 7) === 0 && (wy & 7) === 0) col = c.grout;
        // weathering: some glaze lost
        if (fbm(wx / 6, wy / 6, 77) > 0.7) col = bayer(wx, wy) > 0.4 ? c.pl1 : c.pl2;
        pb.set(wx, wy, col);
      }
    edgeTile(pb, px, py, n, c.out, c.grout, c.tD);
  };
  theme.oneway = (pb, px, py, tx, ty, n) => {
    for (let x = 0; x < 16; x++) {
      const wx = px + x;
      const grain = hash2(wx >> 2, ty, 4) > 0.7;
      pb.set(wx, py, c.out);
      pb.set(wx, py + 1, c.wd0);
      pb.set(wx, py + 2, grain ? c.wd2 : c.wd1);
      pb.set(wx, py + 3, c.wd1);
      pb.set(wx, py + 4, c.wd2);
      pb.set(wx, py + 5, c.out);
    }
    // rope lashings at beam ends and every few tiles
    if (!n.lw || tx % 4 === 0) for (let y = 1; y < 5; y++) { pb.set(px + 2, py + y, c.rope); pb.set(px + 3, py + y, y & 1 ? c.rope : c.wd2); }
    if (!n.rw) for (let y = 0; y < 6; y++) pb.set(px + 15, py + y, c.out);
    if (!n.lw) for (let y = 0; y < 6; y++) pb.set(px, py + y, c.out);
  };
  theme.awning = (pb, px, py, tx, ty, n) => {
    const red = C('#b02a2c'), redD = C('#7e1b23'), cr = C('#f2e6c8'), crD = C('#cdb894');
    for (let x = 0; x < 16; x++) {
      const wx = px + x;
      const stripe = Math.floor(wx / 4) & 1;
      for (let y = 0; y < 6; y++) {
        let col = stripe ? red : cr;
        if (y >= 4) col = stripe ? redD : crD;
        pb.set(wx, py + y, col);
      }
      // scalloped hem
      const sc = Math.abs((wx % 4) - 1.5) < 1 ? 1 : 0;
      if (sc) pb.set(wx, py + 6, stripe ? redD : crD);
      pb.set(wx, py, C('#3a2214'));
    }
    if (!n.lw) for (let y = 0; y < 6; y++) pb.set(px, py + y, c.out);
    if (!n.rw) for (let y = 0; y < 6; y++) pb.set(px + 15, py + y, c.out);
  };
  theme.back = (pb, px, py, tx, ty) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const v = fbm(wx / 16, wy / 16, 21);
        let col = v > 0.52 ? c.bk0 : v > 0.4 ? c.bk1 : c.bk2;
        if (Math.abs(v - 0.52) < 0.025) col = bayer(wx, wy) > 0.5 ? c.bk0 : c.bk1;
        const e = fbm(wx / 20 + 9, wy / 20, 6);
        if (e > 0.66) {
          const row = Math.floor(wy / 4), off = (row & 1) * 4;
          col = wy % 4 === 3 || (wx + off) % 8 === 7 ? c.bk2 : c.bkB;
        }
        pb.set(wx, wy, col);
      }
    // cedar beam every 5 rows
    if (ty % 5 === 0)
      for (let x = 0; x < 16; x++) {
        pb.set(px + x, py + 12, c.beamH);
        pb.set(px + x, py + 13, c.beam);
        pb.set(px + x, py + 14, c.beam);
        pb.set(px + x, py + 15, c.bk2);
      }
  };
  return theme;
})();

// ---------------------------------------------------------------------------
// SEA OF DUNES: layered sandstone with drifted sand caps, carved ruin blocks.
THEMES.desert = (() => {
  const c = {
    out: C('#4a2a16'), bands: ['#e3ab6a', '#d29659', '#bd7f47', '#a8693a', '#c98d50', '#94592f'].map((h) => C(h)),
    hi: C('#f2c98d'), sh: C('#7a4426'), pit: C('#6e3c22'),
    s0: C('#f8e2b4'), s1: C('#efd09a'), s2: C('#e0b87a'), s3: C('#c99a5c'),
    rb0: C('#d9b47c'), rb1: C('#c49a62'), rb2: C('#a57c4a'), rbL: C('#8a6438'),
    wd0: C('#9a6a3a'), wd1: C('#73492a'), wd2: C('#4e301b'),
    bk0: C('#9a6038'), bk1: C('#86512e'), bk2: C('#6f4226'),
  };
  const theme = { c, spike: ['#5a3a22', '#c9b48a', '#f2e6c8'], name: 'desert' };
  theme.solid = (pb, px, py, tx, ty, n) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const warp = vnoise(wx / 24, wy / 40, 3) * 7 + vnoise(wx / 7, wy / 9, 8) * 1.5;
        const b = Math.floor((wy + warp) / 3.5);
        let col = c.bands[((b % 6) + 6) % 6];
        const fr = (wy + warp) / 3.5 - b;
        if (fr < 0.2 && bayer(wx, wy) > 0.5) col = c.hi;
        if (hash2(wx, wy, 31) < 0.012) col = c.pit;
        pb.set(wx, wy, col);
      }
    edgeTile(pb, px, py, n, c.out, c.hi, c.sh);
    if (!n.u) {
      // drifted sand cap with a wavy lower edge
      for (let x = 0; x < 16; x++) {
        const wx = px + x;
        const depth = 3 + Math.round(vnoise(wx / 5, ty, 14) * 3);
        for (let y = 0; y <= depth; y++) {
          if ((x === 0 && !n.l && y === 0) || (x === 15 && !n.r && y === 0)) continue;
          let col = y === 0 ? c.s0 : y < depth - 1 ? (bayer(wx, py + y) > 0.35 + y * 0.12 ? c.s1 : c.s2) : c.s3;
          if (y === depth) col = c.sh;
          pb.set(wx, py + y, col);
        }
      }
    }
  };
  theme.alt = (pb, px, py, tx, ty, n) => {
    // ancient carved ruin blocks
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const by = Math.floor(wy / 8), off = (by & 1) * 8;
        const bx = Math.floor((wx + off) / 16);
        const ly = wy % 8, lx = (wx + off) % 16;
        let col = hash2(bx, by, 41) > 0.5 ? c.rb0 : c.rb1;
        if (ly === 0) col = c.s1;
        if (ly === 7 || lx === 15) col = c.rbL;
        if (lx === 0 && ly > 0 && ly < 7) col = c.rb0;
        if (fbm(wx / 5, wy / 5, 12) > 0.68) col = c.rb2;
        pb.set(wx, wy, col);
      }
    if (hash2(tx, ty, 44) < 0.35) paintGlyph(pb, Math.floor(hash2(tx, ty, 45) * GLYPHS.length), px + 5, py + 4, c.rbL, c.rb0);
    edgeTile(pb, px, py, n, c.out, c.s1, c.rb2);
  };
  theme.oneway = (pb, px, py, tx, ty, n) => {
    for (let x = 0; x < 16; x++) {
      const wx = px + x;
      pb.set(wx, py, c.out);
      pb.set(wx, py + 1, c.wd0);
      pb.set(wx, py + 2, hash2(wx >> 1, ty, 5) > 0.75 ? c.wd2 : c.wd1);
      pb.set(wx, py + 3, c.wd2);
      pb.set(wx, py + 4, c.out);
    }
    if (tx % 3 === 0) for (let y = 1; y < 4; y++) pb.set(px + 7, py + y, c.wd2);
    if (!n.lw) for (let y = 0; y < 5; y++) pb.set(px, py + y, c.out);
    if (!n.rw) for (let y = 0; y < 5; y++) pb.set(px + 15, py + y, c.out);
  };
  theme.awning = theme.oneway;
  theme.back = (pb, px, py, tx, ty) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const by = Math.floor(wy / 8), off = (by & 1) * 8;
        const ly = wy % 8, lx = (wx + off) % 16;
        let col = fbm(wx / 10, wy / 10, 51) > 0.5 ? c.bk0 : c.bk1;
        if (ly === 7 || lx === 15) col = c.bk2;
        // crumbled holes reveal the sky behind
        if (fbm(wx / 18, wy / 14, 52) > 0.69) continue;
        pb.set(wx, wy, col);
      }
  };
  return theme;
})();

// ---------------------------------------------------------------------------
// TOMB OF KHEMET-RA: dressed limestone, carved glyphs, painted friezes.
THEMES.tomb = (() => {
  const c = {
    out: C('#2a221c'), b0: C('#c9b896'), b1: C('#b5a37f'), b2: C('#9c8b6a'), line: C('#6b5d48'), hi: C('#e4d6b6'),
    carve: C('#7d6e56'), carveL: C('#ddd0b2'), red: C('#a8432c'), lap: C('#2b4a7c'), gold: C('#d9a12e'), tealP: C('#2f7f74'),
    bk0: C('#4e443a'), bk1: C('#443b32'), bk2: C('#372f28'), bkG: C('#5d5246'),
    lg0: C('#d8c8a6'), lg1: C('#a8977a'), lg2: C('#6b5d48'),
  };
  const theme = { c, spike: ['#5a3a10', '#c8902a', '#fff1b3'], name: 'tomb' };
  const block = (pb, px, py, tx, ty, n, painted) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const row = Math.floor(wy / 8), off = Math.floor(hash2(row, 0, 61) * 16);
        const ly = wy % 8, lx = (wx + off) % 24;
        const bid = Math.floor((wx + off) / 24);
        const tone = hash2(bid, row, 62);
        let col = tone > 0.66 ? c.b0 : tone > 0.33 ? c.b1 : c.b2;
        if (fbm(wx / 6, wy / 6, 63) > 0.62 && bayer(wx, wy) > 0.5) col = c.b2;
        if (ly === 0) col = c.hi;
        if (ly === 7 || lx === 23) col = c.line;
        if (painted) {
          const pr = (wy >> 1) % 8;
          if (ly >= 2 && ly <= 5) col = pr < 2 ? c.red : pr < 4 ? c.gold : pr < 6 ? c.lap : c.tealP;
          if (ly === 1 || ly === 6) col = c.gold;
        }
        pb.set(wx, wy, col);
      }
    if (!painted && hash2(tx, ty, 66) < 0.3)
      paintGlyph(pb, Math.floor(hash2(tx, ty, 67) * GLYPHS.length), px + 4 + Math.floor(hash2(tx, ty, 68) * 5), py + 4, c.carve, c.carveL);
    edgeTile(pb, px, py, n, c.out, c.hi, c.line);
  };
  theme.solid = (pb, px, py, tx, ty, n) => block(pb, px, py, tx, ty, n, false);
  theme.alt = (pb, px, py, tx, ty, n) => block(pb, px, py, tx, ty, n, true);
  theme.oneway = (pb, px, py, tx, ty, n) => {
    for (let x = 0; x < 16; x++) {
      const wx = px + x;
      pb.set(wx, py, c.out);
      pb.set(wx, py + 1, c.lg0);
      pb.set(wx, py + 2, c.lg1);
      pb.set(wx, py + 3, bayer(wx, py) > 0.5 ? c.lg1 : c.lg2);
      pb.set(wx, py + 4, c.lg2);
      if (wx % 4 === 0) pb.set(wx, py + 5, c.lg2);
      pb.set(wx, py + 5 + (wx % 4 === 0 ? 1 : 0), c.out);
    }
    if (!n.lw) for (let y = 0; y < 6; y++) pb.set(px, py + y, c.out);
    if (!n.rw) for (let y = 0; y < 6; y++) pb.set(px + 15, py + y, c.out);
  };
  theme.awning = theme.oneway;
  theme.back = (pb, px, py, tx, ty) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const row = Math.floor(wy / 16), off = (row & 1) * 16;
        const ly = wy % 16, lx = (wx + off) % 32;
        let col = hash2(Math.floor((wx + off) / 32), row, 71) > 0.5 ? c.bk0 : c.bk1;
        if (fbm(wx / 9, wy / 9, 72) > 0.6 && bayer(wx, wy) > 0.5) col = c.bk2;
        if (ly === 15 || lx === 31) col = c.bk2;
        pb.set(wx, wy, col);
      }
    // faint carved register of glyphs on some rows
    if (ty % 4 === 1 && hash2(tx, ty, 73) < 0.8) {
      paintGlyph(pb, Math.floor(hash2(tx, ty, 74) * GLYPHS.length), px + 2, py + 4, c.bk2, c.bkG);
      paintGlyph(pb, Math.floor(hash2(tx, ty, 75) * GLYPHS.length), px + 9, py + 4, c.bk2, c.bkG);
    }
  };
  return theme;
})();

// ---------------------------------------------------------------------------
// ANDOR, CITY OF BRASS: basalt masonry banded in brass, emerald seams.
THEMES.andor = (() => {
  const c = {
    out: C('#0d0a08'), s0: C('#4a4038'), s1: C('#3c332c'), s2: C('#2e2722'), line: C('#1d1814'), hi: C('#5e5348'),
    br0: C('#6e3f10'), br1: C('#a86d16'), br2: C('#dea12a'), br3: C('#f4cf62'), br4: C('#fff1b3'),
    em: C('#25b56a'), em2: C('#79f0a5'), emD: C('#0d3a26'),
    bk0: C('#2a2016'), bk1: C('#221a12'), bk2: C('#18120c'), bkB: C('#4a3214'), bkB2: C('#6e4a18'),
  };
  const theme = { c, spike: ['#4a2a08', '#c8902a', '#fff1b3'], name: 'andor' };
  theme.solid = (pb, px, py, tx, ty, n) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const row = Math.floor(wy / 8), off = (row & 1) * 8;
        const ly = wy % 8, lx = (wx + off) % 16;
        const tone = hash2(Math.floor((wx + off) / 16), row, 81);
        let col = tone > 0.6 ? c.s0 : tone > 0.25 ? c.s1 : c.s2;
        if (ly === 0 || lx === 0) col = c.hi;
        if (ly === 7 || lx === 15) col = c.line;
        pb.set(wx, wy, col);
      }
    // emerald seam
    if (hash2(tx, ty, 83) < 0.18) {
      const sx = px + 3 + Math.floor(hash2(tx, ty, 84) * 10);
      for (let y = 2; y < 14; y++) pb.set(sx, py + y, y % 5 === 0 ? c.em2 : c.em);
      pb.set(sx - 1, py + 7, c.emD);
      pb.set(sx + 1, py + 9, c.emD);
    }
    edgeTile(pb, px, py, n, c.out, c.hi, c.line);
    if (!n.u)
      for (let x = 0; x < 16; x++) {
        if ((x === 0 && !n.l) || (x === 15 && !n.r)) continue;
        const wx = px + x;
        pb.set(wx, py + 1, c.br3);
        pb.set(wx, py + 2, c.br2);
        pb.set(wx, py + 3, c.br1);
        pb.set(wx, py + 4, c.br0);
        if (wx % 6 === 2) { pb.set(wx, py + 2, c.br4); pb.set(wx, py + 3, c.br2); }
      }
  };
  theme.alt = (pb, px, py, tx, ty, n) => {
    // polished brass block with an engraved lattice
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const band = (y + Math.floor(x / 4)) % 8;
        let col = band < 2 ? c.br3 : band < 5 ? c.br2 : c.br1;
        const g = GIRIH[wy & 7][wx & 7];
        if (g === 't') col = c.br0;
        if (g === 'y') col = c.em;
        pb.set(wx, wy, col);
      }
    edgeTile(pb, px, py, n, c.out, c.br4, c.br0);
  };
  theme.oneway = (pb, px, py, tx, ty, n) => {
    for (let x = 0; x < 16; x++) {
      const wx = px + x;
      pb.set(wx, py, c.out);
      pb.set(wx, py + 1, c.br3);
      pb.set(wx, py + 2, c.br1);
      pb.set(wx, py + 3, wx % 3 === 0 ? c.br1 : 0);
      pb.set(wx, py + 4, wx % 3 === 0 ? c.br0 : 0);
      pb.set(wx, py + 5, c.br0);
      pb.set(wx, py + 6, c.out);
    }
    if (!n.lw) for (let y = 0; y < 7; y++) pb.set(px, py + y, c.out);
    if (!n.rw) for (let y = 0; y < 7; y++) pb.set(px + 15, py + y, c.out);
  };
  theme.awning = theme.oneway;
  theme.back = (pb, px, py, tx, ty) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const wx = px + x, wy = py + y;
        const v = fbm(wx / 12, wy / 12, 91);
        let col = v > 0.5 ? c.bk0 : c.bk1;
        const g = GIRIH[(wy >> 1) & 7][(wx >> 1) & 7];
        if (g === 't' && ty % 3 !== 2) col = c.bkB;
        if (g === 'y' && ty % 3 !== 2) col = c.bkB2;
        if (wy % 48 < 2) col = c.bk2;
        pb.set(wx, wy, col);
      }
    // vertical pipe every so often
    if (tx % 9 === 4)
      for (let y = 0; y < 16; y++) {
        pb.set(px + 6, py + y, c.br0);
        pb.set(px + 7, py + y, c.br1);
        pb.set(px + 8, py + y, c.br2);
        pb.set(px + 9, py + y, c.br0);
        if ((py + y) % 32 === 0) for (let x = 5; x <= 10; x++) pb.set(px + x, py + y, c.br3);
      }
  };
  return theme;
})();

// A pointed-arch lattice window, 8x12. Lit windows glow amber.
function paintWindow(pb, x, y, lit) {
  const frame = C('#efcf98'), frameD = C('#8d5c30'), dark = C('#0e1c20'), warm = C('#f0b54a'), warm2 = C('#ffd98a'), lat = C('#3a2214');
  const rows = ['..ffff..', '.ffiiff.', 'ffiiiiff', 'fiiiiiif', 'fiiiiiif', 'fiiiiiif', 'fiiiiiif', 'fiiiiiif', 'fiiiiiif', 'fiiiiiif', 'ssssssss', 'dddddddd'];
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < 8; i++) {
      const ch = rows[j][i];
      if (ch === '.') continue;
      let col = ch === 'f' ? frame : ch === 's' ? frame : ch === 'd' ? frameD : lit ? ((i + j) % 3 === 0 ? lat : j < 5 ? warm2 : warm) : (i + j) % 4 === 0 ? lat : dark;
      if (ch === 'i' && (i === 3 || i === 4) && j > 2 && j < 10 && !lit) col = lat;
      pb.set(x + i, y + j, col);
    }
}
function mixC(c) {
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
  return packRgb((r * 0.7) | 0, (g * 0.7) | 0, (b * 0.7) | 0, 255);
}

// Spikes are shared, recoloured per theme. dir: 'u','d','l','r'
function paintSpikes(pb, px, py, dir, cols) {
  const [d, m, l] = cols.map((h) => C(h));
  for (let k = 0; k < 4; k++)
    for (let i = 0; i < 7; i++) {
      const half = Math.max(0, Math.floor((7 - i) / 2.6));
      for (let j = -half; j <= half; j++) {
        const a = k * 4 + 2 + j - (j > 0 ? 1 : 0);
        const col = j < 0 ? l : j === 0 ? m : d;
        const along = a, out = i;
        if (dir === 'u') pb.set(px + along, py + 15 - 2 - out, col);
        else if (dir === 'd') pb.set(px + along, py + 2 + out, col);
        else if (dir === 'l') pb.set(px + 15 - 2 - out, py + along, col);
        else pb.set(px + 2 + out, py + along, col);
      }
    }
  for (let a = 0; a < 16; a++)
    for (let b = 0; b < 2; b++) {
      const col = b === 0 ? m : d;
      if (dir === 'u') pb.set(px + a, py + 14 + b, col);
      else if (dir === 'd') pb.set(px + a, py + 1 - b, col);
      else if (dir === 'l') pb.set(px + 14 + b, py + a, col);
      else pb.set(px + 1 - b, py + a, col);
    }
}

function paintQuicksand(pb, px, py, tx, ty, n, top) {
  const a = C('#e6c084'), b = C('#d4a868'), d = C('#b8884e'), s = C('#f2d8a2');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const wx = px + x, wy = py + y;
      const sw = Math.sin(wx / 3 + Math.sin(wy / 4) * 2 + wy / 5);
      let col = sw > 0.4 ? a : sw > -0.3 ? b : d;
      if (top && y === 0) col = s;
      pb.set(wx, wy, col);
    }
}
