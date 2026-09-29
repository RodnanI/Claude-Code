import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Facade, TOWER_GLASS, TOWER_STONE, ACCENTS, crown, roofCap, rooftop, mast, foundation, pick, facId } from './_tower.js';

/* Skyline towers. Descriptor: { w, d, h, rot, seed, style: { fac, accent, crown, podium, podFac, tiers, fins } }.
   Walls carry facade materials, so windows, floors and night lights come from the shader on a world grid; the kits place
   walls, setbacks, crowns and ornament. Detail ops carry md (largest voxel size that still shows them). */

const CROWNS = ['flat', 'mast', 'spire', 'pyramid', 'slant', 'halo', 'stepped', 'helipad', 'crownlit'];
const PODIUM = ['FAC_PIER_LIME', 'FAC_BRICK_RED', 'FAC_RIBBON_STONE', 'FAC_PUNCH_SAND', 'FAC_GRID_CONCRETE', 'FAC_BRICK_BROWN'];
const PLINTH = [M.GLASS_DARK, M.GRANITE, M.STONE_DARK, M.GLASS_SLATE];

/** Ground floor band and the first window row: stone or dark glass, so the window grid starts on a whole floor. */
function plinth(b, T, x0, z0, x1, z1, mat, ins = 0.25) {
  b.box(x0 - ins, 0, z0 - ins, x1 + ins, T.Y(1), z1 + ins, mat);
  b.box(x0 - ins - 0.2, T.Y(1) - 0.5, z0 - ins - 0.2, x1 + ins + 0.2, T.Y(1) + 0.15, z1 + ins + 0.2, M.CONCRETE_PANEL, { md: 2 });
}

/** Optional low block under a tower. Returns its top height. */
function podium(b, rng, d, T, st, w, dp) {
  const pf = new Facade(d, b, st.podFac ?? pick(rng, PODIUM));
  const floors = rng.int(3, 5), ph = pf.Y(floors), ex = pf.bay * rng.int(1, 2);
  const [x0, z0, x1, z1] = pf.wall(-w / 2 - ex, -dp / 2 - ex, w / 2 + ex, dp / 2 + ex, 0, ph);
  plinth(b, pf, x0, z0, x1, z1, pick(rng, PLINTH), 0.3);
  roofCap(b, x0, z0, x1, z1, ph, M.STONE_LIGHT, { ph: 0.9 });
  // entrance canopy on one side, glass box lobby
  const cx = (x0 + x1) / 2;
  b.box(cx - 7, pf.Y(1) - 0.8, z1, cx + 7, pf.Y(1) - 0.3, z1 + 5, M.STEEL_DARK, { md: 1.5 });
  b.box(cx - 6.6, 0, z1 + 4.4, cx - 6.2, pf.Y(1) - 0.8, z1 + 4.8, M.STEEL, { md: 0.75 });
  b.box(cx + 6.2, 0, z1 + 4.4, cx + 6.6, pf.Y(1) - 0.8, z1 + 4.8, M.STEEL, { md: 0.75 });
  return ph;
}

/** Split `total` floors into n tiers, tallest at the bottom. */
function tierFloors(rng, total, n) {
  const w = [1.0, 0.7, 0.5, 0.36].slice(0, n).map((v) => v * rng.range(0.85, 1.15));
  const s = w.reduce((a, c) => a + c, 0);
  const out = w.map((v) => Math.max(3, Math.round((v / s) * total)));
  let sum = out.reduce((a, c) => a + c, 0);
  out[0] += total - sum;
  return out;
}

const slab = defineKit({
  id: 'skyscraper',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const fac = facId(st.fac ?? pick(rng, TOWER_GLASS));
    const accent = st.accent ?? pick(rng, ACCENTS);
    const T = new Facade(d, b, fac);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);
    if (st.podium ?? rng.chance(0.55)) podium(b, rng, d, T, st, w, dp);
    const total = T.floors(h);
    const nT = Math.max(1, Math.min(st.tiers ?? (h > 300 ? rng.int(2, 4) : h > 150 ? rng.int(1, 3) : rng.int(1, 2)), Math.floor(total / 4)));
    const per = tierFloors(rng, total, nT);
    let x0 = -w / 2, x1 = w / 2, z0 = -dp / 2, z1 = dp / 2, k = 0;
    const fins = st.fins ?? rng.chance(0.3);
    for (let i = 0; i < nT; i++) {
      const top = T.Y(k + per[i]);
      const [ax0, az0, ax1, az1] = T.wall(x0, z0, x1, z1, 0, top);
      x0 = ax0; z0 = az0; x1 = ax1; z1 = az1;
      if (i === 0) plinth(b, T, x0, z0, x1, z1, pick(rng, PLINTH));
      // corner posts and belts
      for (const px of [x0 - 0.15, x1 - 0.55]) for (const pz of [z0 - 0.15, z1 - 0.55]) b.box(px, i === 0 ? T.Y(1) : T.Y(k), pz, px + 0.7, top, pz + 0.7, accent, { md: 2 });
      b.box(x0 - 0.3, top - 0.9, z0 - 0.3, x1 + 0.3, top, z1 + 0.3, accent, { md: 3 });
      if (fins) {
        for (let fx = x0 + T.bay; fx < x1 - T.bay * 0.5; fx += T.bay * 2) {
          b.box(fx - 0.15, T.Y(k + 1), z1, fx + 0.15, top - 0.9, z1 + 0.55, accent, { md: 2 });
          b.box(fx - 0.15, T.Y(k + 1), z0 - 0.55, fx + 0.15, top - 0.9, z0, accent, { md: 2 });
        }
      }
      for (let f = k + 10; f < k + per[i] - 2; f += 10) b.box(x0 - 0.2, T.Y(f), z0 - 0.2, x1 + 0.2, T.Y(f) + 0.7, z1 + 0.2, accent, { md: 3 });
      k += per[i];
      if (i < nT - 1) {
        b.box(x0, top, z0, x1, top + 0.5, z1, M.CONCRETE_DARK);
        const inset = () => T.bay * rng.int(1, Math.max(1, Math.floor((Math.min(x1 - x0, z1 - z0) / T.bay - 3) / 2)));
        const mode = rng.int(0, 2);
        if (mode === 0) { const a = inset(); x0 += a; x1 -= a; z0 += a; z1 -= a; } else if (mode === 1) { x0 += inset(); z0 += inset(); } else { x1 -= inset(); z1 -= inset(); }
        if (x1 - x0 < T.bay * 3) { x0 = (x0 + x1) / 2 - T.bay * 1.5; x1 = x0 + T.bay * 3; }
        if (z1 - z0 < T.bay * 3) { z0 = (z0 + z1) / 2 - T.bay * 1.5; z1 = z0 + T.bay * 3; }
      }
    }
    crown(b, rng, st.crown ?? pick(rng, CROWNS), T, x0, z0, x1, z1, T.Y(k), h, accent, T.mat);
  },
});

/** Art deco stack: stone piers, deep setbacks, corner buttresses, a lit finial. */
const deco = defineKit({
  id: 'tower-deco',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_PIER_LIME', 'FAC_PIER_LIME', 'FAC_PIER_DARK', 'FAC_PUNCH_SAND']));
    const accent = st.accent ?? pick(rng, [M.LIMESTONE, M.GRANITE, M.SANDSTONE, M.STEEL_BRIGHT]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);
    const total = T.floors(h);
    const nT = Math.min(rng.int(3, 5), Math.floor(total / 5));
    const per = tierFloors(rng, total, nT);
    let x0 = -w / 2, x1 = w / 2, z0 = -dp / 2, z1 = dp / 2, k = 0;
    for (let i = 0; i < nT; i++) {
      const top = T.Y(k + per[i]);
      [x0, z0, x1, z1] = T.wall(x0, z0, x1, z1, 0, top);
      if (i === 0) plinth(b, T, x0, z0, x1, z1, M.GRANITE);
      const by = i === 0 ? T.Y(1) : T.Y(k);
      // buttresses at the corners and mid-face, rising a little past the tier
      for (const px of [x0 - 0.9, x1 - 0.9]) for (const pz of [z0 - 0.9, z1 - 0.9]) b.box(px, by, pz, px + 1.8, top + 1.5, pz + 1.8, accent, { md: 3 });
      for (const cx of [(x0 + x1) / 2]) { b.box(cx - 0.7, by, z1, cx + 0.7, top - 1, z1 + 0.6, accent, { md: 2 }); b.box(cx - 0.7, by, z0 - 0.6, cx + 0.7, top - 1, z0, accent, { md: 2 }); }
      b.box(x0 - 0.4, top - 1.2, z0 - 0.4, x1 + 0.4, top + 0.3, z1 + 0.4, accent, { md: 3 });
      b.box(x0 - 0.5, top + 0.3, z0 - 0.5, x1 + 0.5, top + 0.6, z1 + 0.5, M.NEON_WHITE, { md: 8 });
      k += per[i];
      if (i < nT - 1) {
        b.box(x0, top, z0, x1, top + 0.5, z1, M.CONCRETE_DARK);
        const a = T.bay * rng.int(1, 2);
        x0 += a; x1 -= a; z0 += a; z1 -= a;
        if (x1 - x0 < T.bay * 3 || z1 - z0 < T.bay * 3) break;
      }
    }
    const top = T.Y(k), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    roofCap(b, x0, z0, x1, z1, top, accent);
    let sy = top + 0.5, sw = x1 - x0, sd = z1 - z0;
    for (let s = 0; s < 4; s++) {
      sw *= 0.72; sd *= 0.72;
      const sh = T.fh * (1.7 - s * 0.25);
      b.box(cx - sw / 2, sy, cz - sd / 2, cx + sw / 2, sy + sh, cz + sd / 2, s === 3 ? M.NEON_WHITE : T.mat, { md: 12 });
      b.box(cx - sw / 2 - 0.3, sy + sh, cz - sd / 2 - 0.3, cx + sw / 2 + 0.3, sy + sh + 0.5, cz + sd / 2 + 0.3, accent, { md: 4 });
      sy += sh + 0.5;
    }
    b.cyl('y', cx, cz, 0.7, 0.12, sy, sy + Math.min(70, 18 + h * 0.12), M.STEEL_BRIGHT, { md: 8 });
    b.box(cx - 0.5, sy + Math.min(70, 18 + h * 0.12), cz - 0.5, cx + 0.5, sy + Math.min(70, 18 + h * 0.12) + 1.2, cz + 0.5, M.BEACON_RED, { md: 8 });
  },
});

/** Round tower: glass drum on a low podium ring, a lit crown band and a mast. */
const round = defineKit({
  id: 'tower-round',
  build(d, b, rng) {
    const st = d.style || {};
    const r = Math.min(d.w, d.d) / 2, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, TOWER_GLASS.slice(0, 6)));
    const accent = st.accent ?? pick(rng, ACCENTS);
    const total = T.floors(h), top = T.Y(total);
    const taper = st.taper ?? rng.range(0.72, 1.0);
    b.cyl('y', 0, 0, r + 0.5, r + 0.5, -4, 0.05, M.CONCRETE_DARK);
    b.cyl('y', 0, 0, r * 1.22, r * 1.22, 0, T.Y(2), M.STONE_LIGHT);
    b.cyl('y', 0, 0, r * 1.22 + 0.3, r * 1.22 + 0.3, T.Y(2), T.Y(2) + 0.5, accent, { md: 2 });
    b.cyl('y', 0, 0, r, r * taper, 0, top, T.mat);
    b.cyl('y', 0, 0, r + 0.25, r + 0.25, 0, T.Y(1), pick(rng, PLINTH));
    for (let f = 12; f < total - 3; f += 12) b.cyl('y', 0, 0, r + 0.4 - (r * (1 - taper) * f) / total, r + 0.4 - (r * (1 - taper) * f) / total, T.Y(f), T.Y(f) + 0.7, accent, { md: 3 });
    const rt = r * taper;
    b.cyl('y', 0, 0, rt + 0.3, rt + 0.3, top, top + 0.6, M.CONCRETE_DARK);
    b.cyl('y', 0, 0, rt + 0.5, rt + 0.5, top + 0.6, top + 1.7, accent, { md: 2 });
    b.cyl('y', 0, 0, rt + 0.6, rt + 0.6, top + 1.7, top + 2.1, M.NEON_WHITE, { md: 12 });
    b.cyl('y', 0, 0, rt * 0.5, rt * 0.5, top + 0.6, top + T.fh * 1.6, T.mat);
    mast(b, 0, 0, top + T.fh * 1.6, 16 + h * 0.08, 0.5);
    rooftop(b, rng, -rt * 0.6, -rt * 0.6, rt * 0.6, rt * 0.6, top + 0.6, 2);
  },
});

/** Two shafts of different height on one podium, joined by a glazed sky bridge. */
const twin = defineKit({
  id: 'tower-twin',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, TOWER_GLASS));
    const accent = st.accent ?? pick(rng, ACCENTS);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);
    const pf = new Facade(d, b, st.podFac ?? pick(rng, PODIUM));
    const ph = pf.Y(rng.int(3, 4));
    const [px0, pz0, px1, pz1] = pf.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, ph);
    plinth(b, pf, px0, pz0, px1, pz1, pick(rng, PLINTH));
    roofCap(b, px0, pz0, px1, pz1, ph, M.STONE_LIGHT);
    const along = w >= dp;   // the shafts stand side by side along the longer axis
    const bay = T.bay, gap = bay * 3;
    const L = (along ? w : dp), s = Math.floor((L - gap) / 2 / bay) * bay, m = along ? dp : w;
    const sm = Math.floor((m * 0.8) / bay) * bay;
    const hs = [h, h * rng.range(0.72, 0.9)];
    const tops = [];
    for (let i = 0; i < 2; i++) {
      const c0 = i === 0 ? -L / 2 : L / 2 - s, c1 = c0 + s;
      const [a0, e0, a1, e1] = along ? T.wall(c0, -sm / 2, c1, sm / 2, 0, T.Y(T.floors(hs[i]))) : T.wall(-sm / 2, c0, sm / 2, c1, 0, T.Y(T.floors(hs[i])));
      const top = T.Y(T.floors(hs[i]));
      tops.push(top);
      plinth(b, T, a0, e0, a1, e1, M.GLASS_DARK, 0.2);
      for (const cx of [a0 - 0.15, a1 - 0.55]) for (const cz of [e0 - 0.15, e1 - 0.55]) b.box(cx, ph, cz, cx + 0.7, top, cz + 0.7, accent, { md: 2 });
      crown(b, rng, i === 0 ? pick(rng, ['spire', 'halo', 'crownlit']) : pick(rng, ['mast', 'stepped', 'flat']), T, a0, e0, a1, e1, top, hs[i], accent, T.mat);
    }
    // sky bridge two thirds of the way up the shorter tower
    const by = T.Y(Math.floor(T.floors(hs[1]) * 0.66)), bh = T.fh * 2;
    const b0 = -L / 2 + s, b1 = L / 2 - s, bz0 = -bay, bz1 = bay;
    if (b1 - b0 > 1) {
      if (along) T.wall(b0, bz0, b1, bz1, by, by + bh, T.mat); else T.wall(bz0, b0, bz1, b1, by, by + bh, T.mat);
      if (along) b.box(b0, by - 0.6, bz0, b1, by, bz1, accent, { md: 3 }); else b.box(bz0, by - 0.6, b0, bz1, by, b1, accent, { md: 3 });
    }
  },
});

/** Stacked, staggered blocks with planted terraces: the modern condo tower. */
const stagger = defineKit({
  id: 'tower-stagger',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_APT_RIBBON', 'FAC_GRID_WHITE', 'FAC_RIBBON_WHITE', 'FAC_CURTAIN_BLUE', 'FAC_GRID_CONCRETE']));
    const accent = st.accent ?? pick(rng, [M.PLASTER_WHITE, M.STEEL_DARK, M.CONCRETE_PANEL]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);
    const total = T.floors(h);
    const stack = Math.max(2, Math.round(total / rng.int(6, 9)));
    const each = Math.floor(total / stack);
    const bw = Math.floor((w * 0.8) / T.bay) * T.bay, bd = Math.floor((dp * 0.8) / T.bay) * T.bay;
    let ox = 0, oz = 0, k = 0;
    let last = null;
    for (let i = 0; i < stack; i++) {
      const fl = i === stack - 1 ? total - k : each;
      const cx = ox, cz = oz;
      const box = T.wall(cx - bw / 2, cz - bd / 2, cx + bw / 2, cz + bd / 2, i === 0 ? 0 : T.Y(k), T.Y(k + fl));
      if (i === 0) plinth(b, T, box[0], box[1], box[2], box[3], pick(rng, PLINTH));
      // the slab below is exposed where this block does not cover it: a planted terrace
      if (last) {
        const [lx0, lz0, lx1, lz1] = last;
        b.box(lx0, T.Y(k), lz0, lx1, T.Y(k) + 0.45, lz1, M.GREEN_ROOF);
        b.box(lx0 - 0.2, T.Y(k) - 0.4, lz0 - 0.2, lx1 + 0.2, T.Y(k), lz1 + 0.2, accent, { md: 3 });
        railing(b, lx0, lz0, lx1, lz1, T.Y(k) + 0.45);
      }
      last = box;
      k += fl;
      const step = T.bay * rng.int(1, 2);
      ox += (rng.chance(0.5) ? 1 : -1) * step; oz += (rng.chance(0.5) ? 1 : -1) * step;
      ox = Math.max(-(w - bw) / 2, Math.min((w - bw) / 2, ox)); oz = Math.max(-(dp - bd) / 2, Math.min((dp - bd) / 2, oz));
    }
    const [x0, z0, x1, z1] = last;
    crown(b, rng, pick(rng, ['flat', 'halo', 'helipad', 'mast']), T, x0, z0, x1, z1, T.Y(total), h, accent, T.mat);
  },
});

function railing(b, x0, z0, x1, z1, y) {
  b.box(x0, y, z0, x1, y + 1.0, z0 + 0.12, M.GLASS_CLEAR, { md: 0.5 });
  b.box(x0, y, z1 - 0.12, x1, y + 1.0, z1, M.GLASS_CLEAR, { md: 0.5 });
  b.box(x0, y, z0, x0 + 0.12, y + 1.0, z1, M.GLASS_CLEAR, { md: 0.5 });
  b.box(x1 - 0.12, y, z0, x1, y + 1.0, z1, M.GLASS_CLEAR, { md: 0.5 });
}

/** Slender needle: many small setbacks up to a spire. */
const taper = defineKit({
  id: 'tower-taper',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_CURTAIN_SILVER', 'FAC_CURTAIN_DARK', 'FAC_CURTAIN_BLUE', 'FAC_CURTAIN_TEAL']));
    const accent = st.accent ?? pick(rng, [M.STEEL_BRIGHT, M.STEEL, M.STEEL_DARK]);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);
    const total = T.floors(h);
    // the shaft can only lose a bay per side so many times before it is a needle: spread the setbacks over the full height
    const maxSteps = Math.max(1, Math.floor((Math.min(w, dp) / T.bay - 4) / 2));
    const step = Math.max(rng.int(5, 8), Math.ceil(total / (maxSteps + 1)));
    let x0 = -w / 2, x1 = w / 2, z0 = -dp / 2, z1 = dp / 2, k = 0;
    while (k < total) {
      const fl = Math.min(step, total - k);
      [x0, z0, x1, z1] = T.wall(x0, z0, x1, z1, k === 0 ? 0 : T.Y(k), T.Y(k + fl));
      if (k === 0) plinth(b, T, x0, z0, x1, z1, pick(rng, PLINTH));
      k += fl;
      b.box(x0 - 0.25, T.Y(k) - 0.8, z0 - 0.25, x1 + 0.25, T.Y(k), z1 + 0.25, accent, { md: 3 });
      if (k >= total) break;
      const nx0 = x0 + T.bay, nx1 = x1 - T.bay, nz0 = z0 + T.bay, nz1 = z1 - T.bay;
      if (nx1 - nx0 < T.bay * 3 || nz1 - nz0 < T.bay * 3) break;
      b.box(x0, T.Y(k), z0, x1, T.Y(k) + 0.45, z1, M.CONCRETE_DARK);
      x0 = nx0; x1 = nx1; z0 = nz0; z1 = nz1;
    }
    crown(b, rng, pick(rng, ['spire', 'spire', 'halo', 'crownlit']), T, x0, z0, x1, z1, T.Y(k), h, accent, T.mat);
  },
});

/** The city's icon: three wings around a core, tiered by wing, with a lit crown and a tall mast. */
const supertall = defineKit({
  id: 'supertall',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_CURTAIN_SILVER', 'FAC_CURTAIN_DARK', 'FAC_CURTAIN_BLUE']));
    const accent = st.accent ?? M.STEEL_BRIGHT;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 6);
    const total = T.floors(h);
    const pf = new Facade(d, b, 'FAC_PIER_LIME');
    const ph = pf.Y(4);
    const [px0, pz0, px1, pz1] = pf.wall(-w / 2 - 12, -dp / 2 - 12, w / 2 + 12, dp / 2 + 12, 0, ph);
    plinth(b, pf, px0, pz0, px1, pz1, M.GRANITE, 0.3);
    roofCap(b, px0, pz0, px1, pz1, ph, M.STONE_LIGHT);
    // central core plus four wings that drop out at different heights
    const cw = Math.floor((w * 0.5) / T.bay) * T.bay, cd = Math.floor((dp * 0.5) / T.bay) * T.bay;
    const wingFloors = [0.92, 0.78, 0.62, 0.48];
    const wings = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    wings.forEach(([sx, sz], i) => {
      const wf = Math.floor(total * wingFloors[i]);
      const x0 = sx > 0 ? cw / 2 - T.bay : sx < 0 ? -w / 2 : -cw / 2 + T.bay, x1 = sx < 0 ? -cw / 2 + T.bay : sx > 0 ? w / 2 : cw / 2 - T.bay;
      const z0 = sz > 0 ? cd / 2 - T.bay : sz < 0 ? -dp / 2 : -cd / 2 + T.bay, z1 = sz < 0 ? -cd / 2 + T.bay : sz > 0 ? dp / 2 : cd / 2 - T.bay;
      T.wall(x0, z0, x1, z1, 0, T.Y(wf));
      b.box(x0 - 0.3, T.Y(wf) - 0.8, z0 - 0.3, x1 + 0.3, T.Y(wf), z1 + 0.3, accent, { md: 3 });
      b.box(Math.min(x0, x1), T.Y(wf), Math.min(z0, z1), Math.max(x0, x1), T.Y(wf) + 0.5, Math.max(z0, z1), M.CONCRETE_DARK);
    });
    const [cx0, cz0, cx1, cz1] = T.wall(-cw / 2, -cd / 2, cw / 2, cd / 2, 0, T.Y(total));
    plinth(b, T, -w / 2, -dp / 2, w / 2, dp / 2, M.GLASS_DARK);
    for (const f of [Math.floor(total * 0.3), Math.floor(total * 0.55), Math.floor(total * 0.8)]) b.box(cx0 - 0.4, T.Y(f), cz0 - 0.4, cx1 + 0.4, T.Y(f) + 1.2, cz1 + 0.4, accent, { md: 4 });
    roofCap(b, cx0, cz0, cx1, cz1, T.Y(total), accent);
    // crown: stepped lit drum and a long mast
    let sy = T.Y(total) + 0.5, sw = cx1 - cx0, sd = cz1 - cz0;
    const cx = (cx0 + cx1) / 2, cz = (cz0 + cz1) / 2;
    for (let s = 0; s < 4; s++) {
      sw *= 0.74; sd *= 0.74;
      const sh = T.fh * (2.4 - s * 0.4);
      b.box(cx - sw / 2, sy, cz - sd / 2, cx + sw / 2, sy + sh, cz + sd / 2, s % 2 ? accent : T.mat, { md: 16 });
      b.box(cx - sw / 2 - 0.3, sy + sh, cz - sd / 2 - 0.3, cx + sw / 2 + 0.3, sy + sh + 0.6, cz + sd / 2 + 0.3, M.NEON_WHITE, { md: 16 });
      sy += sh + 0.6;
    }
    const L = Math.min(120, 30 + h * 0.15);
    b.cyl('y', cx, cz, 1.0, 0.15, sy, sy + L, M.STEEL_BRIGHT, { md: 10 });
    b.box(cx - 0.7, sy + L, cz - 0.7, cx + 0.7, sy + L + 1.6, cz + 0.7, M.BEACON_RED, { md: 10 });
  },
});

export default [slab, deco, round, twin, stagger, taper, supertall];
