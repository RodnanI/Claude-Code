import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { Facade, roofCap, rooftop, mast, foundation, pick } from './_tower.js';
import { storefront, flatRoof, SIGNS } from './towers.kit.js';

/* Schools, hospitals, museums, railway stations and shopping malls. Same conventions as the other kits: local origin at
   the footprint center on the ground, rot 0 faces +z, facade materials draw the windows. */

const school = defineKit({
  id: 'school',
  build(d, b, rng) {
    const st = d.style || {};
    const w = Math.max(d.w, 30), dp = Math.max(d.d, 18);
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_BRICK_RED', 'FAC_BRICK_BROWN', 'FAC_PLASTER_CREAM']));
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const wing = T.bay * 4;
    const fl = 2;
    const parts = [[-w / 2, -dp / 2, -w / 2 + wing, dp / 2, fl], [w / 2 - wing, -dp / 2, w / 2, dp / 2, fl], [-w / 2 + wing - 0.1, -dp * 0.15, w / 2 - wing + 0.1, dp * 0.15, 1]];
    for (const [x0, z0, x1, z1, f] of parts) {
      const r = T.wall(x0, z0, x1, z1, 0, T.Y(f));
      b.box(r[0] - 0.3, T.Y(f) - 0.7, r[1] - 0.3, r[2] + 0.3, T.Y(f), r[3] + 0.3, M.STONE_LIGHT, { md: 1.5 });
      flatRoof(b, rng, r[0], r[1], r[2], r[3], T.Y(f), M.STONE_LIGHT, 1);
    }
    // bell tower over the entrance and a gym at the back
    const tx0 = T.X(-T.bay), tx1 = tx0 + T.bay * 2;
    const [a0, e0, a1, e1] = T.wall(tx0, -dp * 0.15, tx1, dp * 0.15 + T.bay * 0.5, 0, T.Y(3));
    b.hip(a0 - 0.3, e0 - 0.3, a1 + 0.3, e1 + 0.3, T.Y(3), 5, M.ROOF_SLATE);
    b.box(a0 + 0.6, T.Y(3) - 2.6, e1 - 0.05, a1 - 0.6, T.Y(3) - 0.6, e1 + 0.05, M.CLADDING_GRAY, { md: 0.75 });
    const gx = w / 2 - wing - T.bay * 3;
    const gym = new Facade(d, b, 'FAC_CORR_GRAY');
    const [g0, gz0, g1, gz1] = gym.wall(gx - T.bay * 3, -dp / 2 - 14, gx + T.bay * 3, -dp / 2 + 2, 0, 12);
    b.gable(g0 - 0.4, gz0 - 0.4, g1 + 0.4, gz1 + 0.4, 12, 3, 'x', M.ROOF_TIN);
    // flagpole on the lawn
    b.cyl('y', -w * 0.3, dp / 2 + 6, 0.12, 0.08, 0, 11, M.STEEL_BRIGHT, { md: 1 });
    b.box(-w * 0.3, 8.6, dp / 2 + 6 - 0.03, -w * 0.3 + 2.4, 10.4, dp / 2 + 6 + 0.03, M.SIGN_RED, { md: 1 });
  },
});

const hospital = defineKit({
  id: 'hospital',
  build(d, b, rng) {
    const st = d.style || {};
    const w = Math.max(d.w, 36), dp = Math.max(d.d, 24);
    const T = new Facade(d, b, st.fac ?? pick(rng, ['FAC_GRID_WHITE', 'FAC_RIBBON_WHITE', 'FAC_APT_RIBBON']));
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    // low base, a tall ward block and a wing
    const base = T.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, T.Y(3));
    storefront(b, rng, T, base[0], base[1], base[2], base[3], { awning: false, mat: M.GLASS_CLEAR });
    roofCap(b, base[0], base[1], base[2], base[3], T.Y(3), M.CONCRETE_PANEL);
    const ward = T.wall(-w * 0.2, -dp * 0.35, w * 0.2, dp * 0.35, 0, T.Y(9));
    b.box(ward[0] - 0.3, T.Y(9) - 0.9, ward[1] - 0.3, ward[2] + 0.3, T.Y(9), ward[3] + 0.3, M.STEEL_DARK, { md: 3 });
    flatRoof(b, rng, ward[0], ward[1], ward[2], ward[3], T.Y(9), M.CONCRETE_PANEL, 2);
    // helipad on the ward roof, red cross on the front, ambulance canopy
    const cx = (ward[0] + ward[2]) / 2, cz = (ward[1] + ward[3]) / 2;
    b.cyl('y', cx, cz, 5.5, 5.5, T.Y(9) + 0.5, T.Y(9) + 0.8, M.CONCRETE, { md: 8 });
    b.cyl('y', cx, cz, 4.8, 4.8, T.Y(9) + 0.8, T.Y(9) + 0.88, M.SIGN_YELLOW, { md: 4 });
    b.box(cx - 1.8, T.Y(9) + 0.88, cz - 0.3, cx + 1.8, T.Y(9) + 0.94, cz + 0.3, M.NEON_WHITE, { md: 2 });
    b.box(ward[0] + 2, T.Y(6) + 0.6, ward[3] - 0.05, ward[0] + 6, T.Y(6) + 1.8, ward[3] + 0.15, M.NEON_RED, { md: 2 });
    b.box(ward[0] + 3.4, T.Y(6) - 0.6, ward[3] - 0.05, ward[0] + 4.6, T.Y(6) + 3.0, ward[3] + 0.15, M.NEON_RED, { md: 2 });
    b.box(base[2] - 14, T.Y(1) - 0.5, base[3], base[2] - 2, T.Y(1) - 0.1, base[3] + 6, M.STEEL_DARK, { md: 2 });
  },
});

const museum = defineKit({
  id: 'museum',
  build(d, b, rng) {
    const w = Math.max(d.w, 36), dp = Math.max(d.d, 24);
    const T = new Facade(d, b, 'FAC_PIER_LIME');
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    // stepped podium, main hall with a colonnade, two wings and a dome
    for (let s = 0; s < 4; s++) b.box(-w / 2 - 2 + s * 0.6, s * 0.4, -dp / 2 - 2 + s * 0.6, w / 2 + 2 - s * 0.6, s * 0.4 + 0.4, dp / 2 + 3 - s * 0.3, M.LIMESTONE);
    const wing = T.bay * 3;
    for (const [x0, x1] of [[-w / 2, -w / 2 + wing], [w / 2 - wing, w / 2]]) {
      const r = T.wall(x0, -dp / 2 + 1, x1, dp / 2 - 1, 1.6, T.Y(2) + 1.6);
      b.box(r[0] - 0.3, T.Y(2) + 0.6, r[1] - 0.3, r[2] + 0.3, T.Y(2) + 1.6, r[3] + 0.3, M.LIMESTONE, { md: 2 });
      b.box(r[0], T.Y(2) + 1.6, r[1], r[2], T.Y(2) + 2.0, r[3], M.CONCRETE_DARK);
    }
    const hall = T.wall(-w / 2 + wing, -dp / 2 + 2, w / 2 - wing, dp / 2 - 2, 1.6, T.Y(3) + 1.6);
    const y = T.Y(3) + 1.6;
    b.gable(hall[0] - 0.5, hall[3] - 6, hall[2] + 0.5, hall[3] + 3, y, 3.6, 'x', M.LIMESTONE);
    for (let x = hall[0] + 1.2; x < hall[2]; x += 3.4) b.cyl('y', x, hall[3] + 1.6, 0.5, 0.45, 1.6, y, M.LIMESTONE, { md: 1.5 });
    b.box(hall[0], y, hall[1], hall[2], y + 0.5, hall[3], M.CONCRETE_DARK);
    // dome and lantern
    const cx = (hall[0] + hall[2]) / 2, cz = (hall[1] + hall[3]) / 2 - 3, R = Math.min((hall[2] - hall[0]) * 0.32, 11);
    b.cyl('y', cx, cz, R + 0.6, R + 0.6, y + 0.5, y + 3, M.LIMESTONE);
    b.ell(cx, y + 3, cz, R, R * 0.9, R, M.ROOF_COPPER);
    b.cyl('y', cx, cz, 1.4, 1.4, y + 3 + R * 0.9 - 0.3, y + 3 + R * 0.9 + 3.6, M.LIMESTONE, { md: 2 });
    b.cyl('y', cx, cz, 0.4, 0.1, y + 3 + R * 0.9 + 3.6, y + 3 + R * 0.9 + 9, M.STEEL_BRIGHT, { md: 4 });
  },
});

const station = defineKit({
  id: 'station',
  build(d, b, rng) {
    const w = Math.max(d.w, 44), dp = Math.max(d.d, 24);
    const T = new Facade(d, b, 'FAC_BRICK_RED');
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    // head house with a clock tower, and a long vaulted train shed behind it
    const head = T.wall(-w / 2, dp * 0.05, w / 2, dp / 2, 0, T.Y(3));
    storefront(b, rng, T, head[0], head[1], head[2], head[3], { awning: false, mat: M.GLASS_SLATE });
    b.box(head[0] - 0.4, T.Y(3) - 1.2, head[1] - 0.4, head[2] + 0.4, T.Y(3), head[3] + 0.4, M.STONE_LIGHT, { md: 1.5 });
    b.gable(head[0] - 0.5, head[1] - 0.5, head[2] + 0.5, head[3] + 0.5, T.Y(3), 5, 'x', M.ROOF_SLATE);
    const cx = (head[0] + head[2]) / 2;
    const tw = T.wall(cx - T.bay, head[3] - T.bay * 2.5, cx + T.bay, head[3] - T.bay * 0.5, 0, T.Y(8));
    b.box(tw[0] - 0.3, T.Y(8), tw[1] - 0.3, tw[2] + 0.3, T.Y(8) + 0.5, tw[3] + 0.3, M.STONE_LIGHT);
    b.hip(tw[0] - 0.4, tw[1] - 0.4, tw[2] + 0.4, tw[3] + 0.4, T.Y(8) + 0.5, 9, M.ROOF_COPPER);
    b.box(tw[0] + 0.4, T.Y(8) - 5.2, tw[3] - 0.05, tw[2] - 0.4, T.Y(8) - 1.2, tw[3] + 0.12, M.NEON_WHITE, { md: 1 });
    // train shed: a barrel vault along z, glass with steel ribs, open at the platform end
    const sx0 = -w * 0.34, sx1 = w * 0.34, sz0 = -dp / 2, sz1 = dp * 0.05, R = (sx1 - sx0) / 2, mx = (sx0 + sx1) / 2;
    b.loft('z', [{ a: sz0, c1: mx, c2: 0.6, r1: R, r2: 8, n: 2 }, { a: sz1, c1: mx, c2: 0.6, r1: R, r2: 8, n: 2 }], M.GLASS_TEAL);
    b.loft('z', [{ a: sz0 - 1, c1: mx, c2: 0.6, r1: R - 0.5, r2: 7.5, n: 2 }, { a: sz1 - 0.6, c1: mx, c2: 0.6, r1: R - 0.5, r2: 7.5, n: 2 }], 0);
    b.box(sx0 - 1, -8, sz0 - 1, sx1 + 1, 0.6, sz1 + 1, M.CONCRETE_DARK);
    for (let z = sz0 + 2; z < sz1 - 1; z += 5) b.loft('z', [{ a: z, c1: mx, c2: 0.6, r1: R + 0.3, r2: 8.3, n: 2 }, { a: z + 0.5, c1: mx, c2: 0.6, r1: R + 0.3, r2: 8.3, n: 2 }], M.STEEL_DARK, { md: 1.5 });
    // platforms and a couple of tracks
    for (let k = -1; k <= 1; k++) b.box(sx0 + 8 + k * 14 - 3, 0.6, sz0 - 30, sx0 + 8 + k * 14 + 3, 1.2, sz1, M.CONCRETE, { md: 4 });
  },
});

const mall = defineKit({
  id: 'mall',
  build(d, b, rng) {
    const w = Math.max(d.w, 40), dp = Math.max(d.d, 24), h = d.h || 12;
    const T = new Facade(d, b, pick(rng, ['FAC_PLASTER_WHITE', 'FAC_CORR_TAN', 'FAC_PLASTER_CREAM']));
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 3);
    const r = T.wall(-w / 2, -dp / 2, w / 2, dp / 2, 0, T.Y(Math.max(2, Math.round(h / T.fh))));
    const top = T.Y(Math.max(2, Math.round(h / T.fh)));
    b.box(r[0] - 0.3, 0, r[1] - 0.3, r[2] + 0.3, T.Y(1), r[3] + 0.3, M.GLASS_DARK, { md: 2 });
    // entrance block with a tall glass front and a lit sign
    const cx = (r[0] + r[2]) / 2;
    b.box(cx - 9, 0, r[3], cx + 9, top + 3, r[3] + 6, M.GLASS_BLUE);
    b.box(cx - 9.3, top + 3, r[3] - 0.3, cx + 9.3, top + 3.6, r[3] + 6.3, M.STEEL_DARK);
    b.box(cx - 7, top + 4, r[3] + 2, cx + 7, top + 6.5, r[3] + 2.4, pick(rng, SIGNS), { md: 4 });
    b.box(r[0], top, r[1], r[2], top + 0.5, r[3], M.CONCRETE_DARK);
    rooftop(b, rng, r[0] + 2, r[1] + 2, r[2] - 2, r[3] - 2, top + 0.5, 6);
    for (let x = r[0] + 6; x < r[2] - 6; x += 22) b.box(x, 0, r[1] - 2.5, x + 6, 4, r[1], M.STEEL_DARK, { md: 2 });
    mast(b, r[2] - 6, r[1] + 6, top + 0.5, 12, 0.3);
  },
});

export default [school, hospital, museum, station, mall];
