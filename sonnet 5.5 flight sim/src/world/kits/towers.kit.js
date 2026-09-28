import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { pick, parapet, roofClutter, foundation, GLASS_SETS } from './_util.js';

/* Towers and mid-rises. Descriptor: { w, d, h, seed, style: { wall, glass, lit, facade, crown, podium, tiers, bay } }.
   Local origin is the footprint center at ground level. Every detail op carries a maxVoxel so fine geometry only
   exists when the voxels are small enough to show it. */

function facadeFor(b, x0, y0, z0, x1, y1, z1, o) {
  b.facade(x0, y0, z0, x1, y1, z1, o);
}

const skyscraper = defineKit({
  id: 'skyscraper',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const wall = st.wall ?? pick(rng, [M.CONCRETE_PANEL, M.STONE_LIGHT, M.PLASTER_GRAY, M.STEEL, M.CLADDING_GRAY]);
    const accent = st.accent ?? pick(rng, [M.STEEL_DARK, M.GRANITE, M.STONE_DARK]);
    const glass = st.glass ?? pick(rng, Object.values(GLASS_SETS));
    const coarse = st.coarse ?? M.GLASS_BLEND_DARK;
    const lit = st.lit ?? 0.3;
    const style = st.facade ?? pick(rng, ['curtain', 'punched', 'ribbon']);
    const bay = st.bay ?? rng.range(3.0, 4.4);
    const floorH = st.floorH ?? 3.9;
    const podium = st.podium ?? rng.chance(0.55);
    const podH = podium ? Math.min(h * 0.16, rng.range(9, 17)) : 0;
    const mullion = style === 'curtain' ? 1.5 : 0;
    const F = (x0, y0, z0, x1, y1, z1, extra) => facadeFor(b, x0, y0, z0, x1, y1, z1, {
      floorH, bay, winW: bay * 0.6, winH: floorH * 0.5, sill: floorH * 0.28, glass, lit, seed: d.seed, style, coarse, mullion, frame: M.STEEL_DARK, ...extra,
    });

    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 4);

    let y = 0;
    let px = w, pz = dp;
    if (podium) {
      px = w * 1.32; pz = dp * 1.32;
      b.box(-px / 2, 0, -pz / 2, px / 2, podH, pz / 2, pick(rng, [M.STONE_LIGHT, M.BRICK_DARK, M.CONCRETE_PANEL]));
      F(-px / 2, 0, -pz / 2, px / 2, podH, pz / 2, { style: 'punched', floorH: 4.6, bay: 4.4, winW: 2.4, winH: 2.6, sill: 1.0, ground: 5.4, groundGlass: M.GLASS_CLEAR, top: 1.2 });
      b.box(-px / 2 - 0.4, podH - 0.9, -pz / 2 - 0.4, px / 2 + 0.4, podH, pz / 2 + 0.4, accent, { md: 1.5 });
      parapet(b, -px / 2, -pz / 2, px / 2, pz / 2, podH, 1.0, 0.5, M.CONCRETE_PANEL, { md: 1 });
      // entrance canopy
      b.box(-6, 4.4, pz / 2, 6, 4.8, pz / 2 + 4, accent, { md: 1 });
      b.box(-6, 0, pz / 2 + 3.4, -5.6, 4.4, pz / 2 + 3.8, M.STEEL, { md: 0.5 });
      b.box(5.6, 0, pz / 2 + 3.4, 6, 4.4, pz / 2 + 3.8, M.STEEL, { md: 0.5 });
      y = podH;
    }

    const tiers = st.tiers ?? Math.max(1, Math.min(4, Math.round(h / 90)) + rng.int(0, 1));
    const rest = h - y;
    const fr = tiers === 1 ? [1] : tiers === 2 ? [0.68, 0.32] : tiers === 3 ? [0.5, 0.3, 0.2] : [0.4, 0.28, 0.2, 0.12];
    let tw = w, td = dp, cx = 0, cz = 0;
    for (let i = 0; i < tiers; i++) {
      const th = rest * fr[i];
      const x0 = cx - tw / 2, x1 = cx + tw / 2, z0 = cz - td / 2, z1 = cz + td / 2;
      const isBase = i === 0;
      b.box(x0, y, z0, x1, y + th, z1, wall);
      F(x0, y, z0, x1, y + th, z1, { ground: isBase && !podium ? 6 : 0, groundGlass: M.GLASS_CLEAR, top: 1.4, corner: 1.4 });
      // corner columns and crown band
      const cw = 0.9;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const ex = sx > 0 ? x1 : x0, ez = sz > 0 ? z1 : z0;
        b.box(ex - (sx > 0 ? cw : -0.35), y, ez - (sz > 0 ? cw : -0.35), ex + (sx > 0 ? 0.35 : -cw), y + th, ez + (sz > 0 ? 0.35 : -cw), accent, { md: 1 });
      }
      b.box(x0 - 0.3, y + th - 1.0, z0 - 0.3, x1 + 0.3, y + th, z1 + 0.3, accent, { md: 1.5 });
      // exposed roof ring of the tier below the next setback
      y += th;
      if (i < tiers - 1) {
        parapet(b, x0, z0, x1, z1, y, 0.9, 0.45, M.CONCRETE_PANEL, { md: 1 });
        roofClutter(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, y, 3);
        const s = rng.range(0.74, 0.88);
        tw *= s; td *= s;
        cx += rng.range(-0.05, 0.05) * w; cz += rng.range(-0.05, 0.05) * dp;
      }
    }

    // crown
    const x0 = cx - tw / 2, x1 = cx + tw / 2, z0 = cz - td / 2, z1 = cz + td / 2;
    const crown = st.crown ?? pick(rng, ['flat', 'spire', 'sloped', 'pyramid', 'flat', 'stepped']);
    const topY = y;
    if (crown === 'flat') {
      parapet(b, x0, z0, x1, z1, topY, 1.2, 0.5, M.CONCRETE_PANEL, { md: 1 });
      b.box(cx - tw * 0.22, topY, cz - td * 0.22, cx + tw * 0.22, topY + 5.5, cz + td * 0.22, wall);
      roofClutter(b, rng, x0 + 1, z0 + 1, x1 - 1, z1 - 1, topY, 6);
      b.cyl('y', cx + tw * 0.1, cz, 0.35, 0.18, topY + 5.5, topY + 5.5 + Math.min(40, h * 0.15), M.STEEL, { md: 1 });
      b.box(cx + tw * 0.1 - 0.5, topY + 5.5 + Math.min(40, h * 0.15), cz - 0.5, cx + tw * 0.1 + 0.5, topY + 6.5 + Math.min(40, h * 0.15), cz + 0.5, M.BEACON_RED);
      b.box(x0, topY + 1.0, z0, x1, topY + 1.4, z1, M.NEON_WHITE, { md: 1, mn: 0 });
    } else if (crown === 'spire') {
      parapet(b, x0, z0, x1, z1, topY, 1.0, 0.5, M.CONCRETE_PANEL, { md: 1 });
      let sy = topY, sw = tw * 0.7, sd = td * 0.7;
      for (let k = 0; k < 3; k++) {
        b.box(cx - sw / 2, sy, cz - sd / 2, cx + sw / 2, sy + h * 0.035, cz + sd / 2, wall);
        b.box(cx - sw / 2 - 0.1, sy, cz - sd / 2 - 0.1, cx + sw / 2 + 0.1, sy + 0.5, cz + sd / 2 + 0.1, accent, { md: 1 });
        sy += h * 0.035; sw *= 0.72; sd *= 0.72;
      }
      const sl = Math.min(90, h * 0.24);
      b.cyl('y', cx, cz, Math.min(sw, sd) * 0.5, 0.0, sy, sy + sl, M.STEEL_BRIGHT);
      b.box(cx - 0.6, sy + sl - 0.5, cz - 0.6, cx + 0.6, sy + sl + 1.2, cz + 0.6, M.BEACON_RED);
    } else if (crown === 'sloped') {
      const rh = Math.min(tw, td) * 0.55;
      b.wedge(x0, topY, z0, x1, topY + rh, z1, '+z', M.GLASS_TEAL);
      b.wedge(x0 + 0.5, topY, z0 + 0.5, x1 - 0.5, topY + rh - 0.6, z1 - 0.5, '+z', M.GLASS_DARK, { md: 1 });
      b.box(x0, topY, z1 - 0.5, x1, topY + rh, z1, accent);
      b.cyl('y', cx, cz - td * 0.2, 0.3, 0.15, topY + rh, topY + rh + 18, M.STEEL, { md: 1 });
    } else if (crown === 'pyramid') {
      b.hip(x0, z0, x1, z1, topY, Math.min(tw, td) * 0.7, pick(rng, [M.GLASS_TEAL, M.ROOF_COPPER, M.GLASS_DARK]));
      b.cyl('y', cx, cz, 0.3, 0.1, topY + Math.min(tw, td) * 0.7, topY + Math.min(tw, td) * 0.7 + 20, M.STEEL, { md: 1 });
    } else {
      // stepped crown
      let sy = topY, sw = tw, sd = td;
      for (let k = 0; k < 3; k++) {
        sw *= 0.78; sd *= 0.78;
        const sh = h * 0.045;
        b.box(cx - sw / 2, sy, cz - sd / 2, cx + sw / 2, sy + sh, cz + sd / 2, wall);
        F(cx - sw / 2, sy, cz - sd / 2, cx + sw / 2, sy + sh, cz + sd / 2, { top: 0.5, corner: 0.8 });
        sy += sh;
      }
      b.cyl('y', cx, cz, 0.5, 0.15, sy, sy + Math.min(50, h * 0.18), M.STEEL, { md: 1 });
      b.box(cx - 0.5, sy + Math.min(50, h * 0.18), cz - 0.5, cx + 0.5, sy + Math.min(50, h * 0.18) + 1.2, cz + 0.5, M.BEACON_RED);
    }
  },
});

const midrise = defineKit({
  id: 'midrise',
  build(d, b, rng) {
    const st = d.style || {};
    const w = d.w, dp = d.d, h = d.h;
    const wall = st.wall ?? pick(rng, [M.BRICK_RED, M.BRICK_BROWN, M.PLASTER_CREAM, M.CONCRETE_BLDG, M.PLASTER_WHITE, M.STONE_LIGHT]);
    const trim = st.trim ?? pick(rng, [M.STONE_LIGHT, M.CONCRETE_PANEL, M.PLASTER_WHITE]);
    const glass = st.glass ?? [M.GLASS_SLATE, M.GLASS_CLEAR, M.GLASS_TEAL];
    const bay = st.bay ?? rng.range(3.0, 3.8);
    const floorH = st.floorH ?? 3.4;
    const lit = st.lit ?? 0.26;
    const balconies = st.balconies ?? rng.chance(0.35);
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    b.facade(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, {
      floorH, bay, winW: bay * 0.5, winH: floorH * 0.5, sill: floorH * 0.3, glass, lit, seed: d.seed, style: 'punched',
      ground: st.ground ?? (rng.chance(0.6) ? 4.4 : 0), groundGlass: M.GLASS_CLEAR, coarse: M.GLASS_BLEND_LIGHT, top: 1.2, corner: 1.2,
    });
    // plinth, string course and cornice
    b.box(-w / 2 - 0.3, 0, -dp / 2 - 0.3, w / 2 + 0.3, 1.0, dp / 2 + 0.3, M.GRANITE, { md: 1.5 });
    b.box(-w / 2 - 0.5, h - 1.2, -dp / 2 - 0.5, w / 2 + 0.5, h, dp / 2 + 0.5, trim, { md: 1.5 });
    b.box(-w / 2 - 0.25, 4.6, -dp / 2 - 0.25, w / 2 + 0.25, 5.0, dp / 2 + 0.25, trim, { md: 1 });
    if (balconies) {
      const floors = Math.floor(h / floorH);
      for (let f = 2; f < floors - 1; f += 1) {
        for (let bx = -w / 2 + bay * 1.5; bx < w / 2 - bay * 1.5; bx += bay * 2) {
          b.box(bx - 1.0, f * floorH, dp / 2, bx + 1.0, f * floorH + 0.3, dp / 2 + 1.3, M.CONCRETE_PANEL, { md: 0.75 });
          b.box(bx - 1.0, f * floorH + 0.3, dp / 2 + 1.15, bx + 1.0, f * floorH + 1.2, dp / 2 + 1.3, M.STEEL_DARK, { md: 0.4 });
        }
      }
    }
    parapet(b, -w / 2, -dp / 2, w / 2, dp / 2, h, 0.9, 0.45, trim, { md: 1 });
    roofClutter(b, rng, -w / 2 + 1, -dp / 2 + 1, w / 2 - 1, dp / 2 - 1, h, Math.max(2, Math.round((w * dp) / 300)));
    if (rng.chance(0.4)) {
      // water tank on a stand
      const tx = rng.range(-w * 0.25, w * 0.25), tz = rng.range(-dp * 0.25, dp * 0.25);
      for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(tx + ax * 1.3 - 0.15, h, tz + az * 1.3 - 0.15, tx + ax * 1.3 + 0.15, h + 2.2, tz + az * 1.3 + 0.15, M.WOOD_DARK, { md: 0.4 });
      b.cyl('y', tx, tz, 1.9, 1.9, h + 2.2, h + 5.2, M.WOOD_MID, { md: 1.5 });
      b.cyl('y', tx, tz, 2.0, 0.3, h + 5.2, h + 6.2, M.ROOF_SLATE, { md: 1.5 });
    }
  },
});

export default [skyscraper, midrise];
