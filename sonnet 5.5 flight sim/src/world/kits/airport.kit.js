import { defineKit } from '../region.js';
import { M } from '../../voxel/palette.js';
import { textBoxes, textPixels } from '../../voxel/glyphs.js';
import { pick, foundation, roofClutter, rails, leaves } from './_util.js';
import { Facade } from './_tower.js';

/* A civil airport: the terminal with its piers and elevated departures road, telescoping jet bridges, the cargo terminal, fire
   station, fuel farm, instrument landing antennas, canopies, lettered signs and a gatehouse. Local +z is the front (the airside for
   a terminal, the yard for a cargo shed). Kits are conservative so thin plates survive coarse voxels, and fine detail is gated. */

const sq = (v) => v * v;

/**
 * Terminal: two floors of curtain wall between ribbon-windowed end wings, one wave of roof over the lot, a glass barrel vault over
 * the hall, two piers with a bulge at every gate and a hammerhead at the tip, and on the landside an elevated road under a canopy.
 * Lettering: style.name on the airside roof edge, style.sub over the departures canopy.
 */
const terminal = defineKit({
  id: 'terminal',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 170, dp = d.d ?? 36, st = d.style || {};
    const G = new Facade(d, b, st.fac ?? 'FAC_CURTAIN_TEAL'), R = new Facade(d, b, st.wing ?? 'FAC_RIBBON_WHITE');
    const yTop = G.Y(2), y1 = G.Y(1);
    const zn = R.Z(-dp / 2), zs = R.Z(dp / 2);
    foundation(b, -w / 2, zn, w / 2, zs, 3);
    // the hall between two end wings
    const ew = 34, xa = R.X(-w / 2 + ew), xb = R.X(w / 2 - ew);
    G.wall(xa, zn, xb, zs, 0, yTop);
    R.wall(-w / 2, zn, xa, zs, 0, yTop);
    R.wall(xb, zn, w / 2, zs, 0, yTop);
    b.box(-w / 2 - 0.3, y1 - 0.25, zn - 0.3, w / 2 + 0.3, y1 + 0.15, zs + 0.3, M.CONCRETE_PANEL, { md: 3 });
    // one long wave of roof, crowned over the hall, with an edge fascia and skylight strips
    const rx = w / 2 + 5, rz0 = zn - 9, rz1 = zs + 9;
    b.fn(-rx, yTop, rz0, rx, yTop + 6.5, rz1, (lx, ly, lz, cell) => {
      const t = Math.min(1, Math.abs(lx) / rx);
      const top = yTop + 0.3 + 5.2 * Math.pow(Math.cos((t * Math.PI) / 2), 1.3), th = Math.max(0.9, cell * 1.05);
      if (ly > top || ly < top - th) return 0;
      if (lz > rz1 - 0.7 || lz < rz0 + 0.7 || Math.abs(lx) > rx - 0.7) return M.STEEL_BRIGHT;
      if (Math.abs(lz) < 2.4 && Math.abs(lx) > 34 && (Math.floor(Math.abs(lx) / 9) & 1) === 0) return M.GLASS_CLEAR;
      return ly < top - th + 0.3 ? M.CONCRETE_PANEL : M.PLASTER_WHITE;
    });
    // slim columns carrying the roof overhang on both faces
    for (let x = -w / 2 + 6; x <= w / 2 - 5; x += 12) for (const z of [rz0 + 1.6, rz1 - 1.6]) b.box(x - 0.35, 0, z - 0.35, x + 0.35, yTop + 0.5, z + 0.35, M.STEEL_BRIGHT, { md: 1 });
    // the hall's glass barrel vault with steel ribs
    const ax = 32, az = Math.min(zs, -zn) - 2.5, vb = yTop + 4.6;
    b.fn(-ax, vb, -az, ax, vb + 10.5, az, (lx, ly, lz, cell) => {
      const prof = 9 * Math.sqrt(Math.max(0, 1 - sq(lz / az))), th = Math.max(0.5, cell * 0.9);
      const y = vb + prof;
      if (Math.abs(lx) > ax - 0.6 && ly <= y && ly > vb) return M.GLASS_CLEAR;
      return Math.abs(ly - y) < th ? M.GLASS_TEAL : 0;
    });
    for (let x = -ax; x <= ax; x += 4) b.fn(x - 0.25, vb, -az, x + 0.25, vb + 10.5, az, (lx, ly, lz) => (Math.abs(ly - (vb + 9 * Math.sqrt(Math.max(0, 1 - sq(lz / az))))) < 0.55 ? M.STEEL_DARK : 0), { md: 1.2 });
    // piers: a glass corridor with a low barrel roof, a bulge and a boarding door at every gate, a hammerhead at the tip
    const pierL = st.pier ?? 140, pw = 24, gateZ = st.gates ?? [42, 88, 134];
    for (const fx0 of st.piers ?? [-0.32 * w, 0.32 * w]) {
      const fx = R.X(fx0);
      const [px0, pz0, px1, pz1] = G.wall(fx - pw / 2, zs - 2, fx + pw / 2, zs + pierL, 0, yTop);
      const pcx = (px0 + px1) / 2, phw = (px1 - px0) / 2 + 1.4;
      b.fn(px0 - 1.4, yTop, pz0, px1 + 1.4, yTop + 3.4, pz1 + 1.4, (lx, ly, lz, cell) => {
        const top = yTop + 0.3 + 2.6 * Math.sqrt(Math.max(0, 1 - sq((lx - pcx) / phw))), th = Math.max(0.7, cell);
        if (ly > top || ly < top - th) return 0;
        if (Math.abs(lx - pcx) < 1.7) return Math.floor(lz / 3) & 1 ? M.GLASS_CLEAR : M.STEEL;
        return ly < top - th + 0.3 ? M.CONCRETE_PANEL : M.ROOF_TIN;
      });
      const [hx0, hz0, hx1, hz1] = R.wall(pcx - 23, pz1 - 6, pcx + 23, pz1 + 22, 0, yTop);
      b.box(hx0 - 1.2, yTop, hz0 - 1.2, hx1 + 1.2, yTop + 0.9, hz1 + 1.2, M.CONCRETE_PANEL);
      b.gable(hx0 - 1.2, hz0 - 1.2, hx1 + 1.2, hz1 + 1.2, yTop + 0.9, 3.4, 'x', M.ROOF_TIN);
      for (const gz of gateZ) {
        for (const s of [-1, 1]) {
          const fxw = s > 0 ? px1 : px0;
          b.box(s > 0 ? fxw : fxw - 3.4, y1, gz - 7, s > 0 ? fxw + 3.4 : fxw, yTop, gz + 7, M.FAC_CURTAIN_BLUE);
          b.box(s > 0 ? fxw + 3.3 : fxw - 3.5, y1 + 0.5, gz - 1.7, s > 0 ? fxw + 3.5 : fxw - 3.3, y1 + 3.3, gz + 1.7, M.STEEL_DARK, { md: 1 });
          b.box(s > 0 ? fxw : fxw - 3.4, yTop, gz - 7.2, s > 0 ? fxw + 3.6 : fxw, yTop + 0.35, gz + 7.2, M.STEEL_BRIGHT, { md: 2 });
          b.box(s > 0 ? fxw + 0.2 : fxw - 3.2, y1 - 0.9, gz - 6, s > 0 ? fxw + 3.2 : fxw - 0.2, y1, gz + 6, M.CONCRETE_DARK, { md: 2 });
        }
      }
      // ramp level: baggage doors and a line of lights under the boarding floor
      for (const s of [-1, 1]) for (let z = pz0 + 8; z < pz1 - 6; z += 9) b.box(s > 0 ? px1 - 0.05 : px0 - 0.15, 0.2, z, s > 0 ? px1 + 0.15 : px0 + 0.05, 2.6, z + 3.2, M.STEEL_DARK, { md: 1 });
      b.box(pcx - 0.5, yTop + 3.3, pz1 + 2, pcx + 0.5, yTop + 7.3, pz1 + 2.6, M.STEEL, { md: 1.5 });
    }
    // the landside: an elevated departures road on columns under a glass canopy, ramps at both ends
    const dz0 = zn - 23, dz1 = zn - 3, dw = w * 0.86;
    b.box(-dw / 2, y1 - 0.9, dz0, dw / 2, y1, dz1, M.CONCRETE_DARK);
    b.box(-dw / 2, y1, dz0, dw / 2, y1 + 0.35, dz0 + 0.5, M.CONCRETE, { md: 1.5 });
    b.box(-dw / 2, y1, dz1 - 0.5, dw / 2, y1 + 0.35, dz1, M.CONCRETE, { md: 1.5 });
    for (let x = -dw / 2 + 4; x < dw / 2 - 6; x += 7) b.box(x, y1 + 0.01, (dz0 + dz1) / 2 - 0.12, x + 3.2, y1 + 0.06, (dz0 + dz1) / 2 + 0.12, M.ROAD_LINE_W, { md: 0.8 });
    for (let x = -dw / 2 + 6; x <= dw / 2 - 5; x += 12) for (const z of [dz0 + 1, dz1 - 1]) b.box(x - 0.45, 0, z - 0.45, x + 0.45, y1 - 0.9, z + 0.45, M.CONCRETE_PANEL, { md: 3 });
    for (const s of [-1, 1]) b.wedge(s > 0 ? dw / 2 : -dw / 2 - 26, 0, dz0, s > 0 ? dw / 2 + 26 : -dw / 2, y1, dz1, s > 0 ? '-x' : '+x', M.CONCRETE_DARK, { md: 3 });
    b.fn(-dw / 2 + 4, y1 + 5.2, dz0 - 1, dw / 2 - 4, y1 + 6.4, dz1 + 1.5, (lx, ly, lz, cell) => {
      const th = Math.max(0.5, cell);
      if (ly < y1 + 6.4 - th) return 0;
      return Math.abs(lz - (dz0 - 1)) < 0.5 || Math.abs(lx) > dw / 2 - 4.6 ? M.STEEL_BRIGHT : M.GLASS_CLEAR;
    });
    for (let x = -dw / 2 + 8; x <= dw / 2 - 7; x += 12) for (const z of [dz0, dz1 - 0.6]) b.box(x - 0.3, y1, z, x + 0.3, y1 + 6.0, z + 0.6, M.STEEL_BRIGHT, { md: 1 });
    // lettering: the name along the airside roof, the road name on the canopy, both readable from their own side
    const name = st.name ?? 'MERIDIAN';
    const px = Math.min(0.9, 40 / (textPixels(name) || 1));
    b.box(-textPixels(name) * px / 2 - 1.2, yTop + 5.1, zs + 8.0, textPixels(name) * px / 2 + 1.2, yTop + 5.7 + 7 * px + 0.4, zs + 8.6, M.STEEL_DARK, { md: 3 });
    textBoxes(b, name, 0, yTop + 5.7, zs + 8.6, px, M.NEON_WHITE, 0.5, { md: 1.6 });
    textBoxes(b, st.sub ?? 'DEPARTURES', 0, y1 + 6.9, dz0 - 1.2, 0.5, M.NEON_WHITE, 0.3, { md: 1 }, 1, true);
    // entrance doors and a rooftop of plant on the low wings
    for (let x = -14; x <= 14; x += 7) b.box(x - 1.6, 0.1, zn - 0.15, x + 1.6, 3.0, zn + 0.05, M.GLASS_DARK, { md: 0.7 });
    for (const s of [-1, 1]) roofClutter(b, rng, s * (w / 2 - 28), zn + 4, s * (w / 2 - 8), zs - 4, yTop + 1.6, 4);
    b.box(-0.3, yTop + 12.9, zs + 8.2, 0.3, yTop + 15.4, zs + 8.5, M.STEEL, { md: 1.2 });
    b.box(-0.35, yTop + 15.4, zs + 8.15, 0.35, yTop + 15.9, zs + 8.55, M.BEACON_RED, { md: 3 });
  },
});

/**
 * Passenger boarding bridge. Origin at the rotunda on the pier face; +x runs out toward the aircraft over d.w meters. Two
 * telescoping tunnels with a band of windows, the cab with its bellows at the aircraft end, a support column with wheels.
 */
const jetbridge = defineKit({
  id: 'jetbridge',
  conservative: true,
  build(d, b) {
    const L = d.w ?? 24, yf = d.y0 ?? 3.7, hgt = 2.7;
    b.cyl('y', 0, 0, 2.9, 2.9, yf - 0.4, yf + hgt + 0.5, M.PLASTER_WHITE);
    b.cyl('y', 0, 0, 3.0, 3.0, yf + hgt + 0.5, yf + hgt + 0.8, M.STEEL_DARK, { md: 1.5 });
    b.cyl('y', 0, 0, 2.6, 2.6, yf - 0.5, yf - 0.4, M.STEEL_DARK, { md: 1.5 });
    const seg = (x0, x1, hw, y0, y1, mat, glass) => {
      b.box(x0, y0, -hw, x1, y1, hw, mat);
      b.box(x0, y0 - 0.35, -hw + 0.2, x1, y0, hw - 0.2, M.STEEL_DARK, { md: 1.5 });
      b.box(x0 - 0.05, y1, -hw - 0.1, x1 + 0.05, y1 + 0.25, hw + 0.1, M.CONCRETE_PANEL, { md: 1.5 });
      b.box(x0, y0 + 1.0, -hw - 0.05, x1, y1 - 0.5, -hw + 0.05, glass, { md: 1.2 });
      b.box(x0, y0 + 1.0, hw - 0.05, x1, y1 - 0.5, hw + 0.05, glass, { md: 1.2 });
    };
    seg(2.6, L * 0.56, 1.7, yf, yf + hgt, M.PLASTER_WHITE, M.GLASS_DARK);
    seg(L * 0.5, L * 0.93, 1.5, yf + 0.1, yf + hgt - 0.1, M.PLASTER_WHITE, M.GLASS_DARK);
    // cab and bellows
    b.box(L * 0.9, yf + 0.1, -2.0, L + 1.6, yf + hgt + 0.5, 2.0, M.PLASTER_WHITE);
    b.box(L + 1.6, yf - 0.1, -1.8, L + 2.3, yf + hgt + 0.3, 1.8, M.TIRE);
    b.box(L + 2.3, yf - 0.1, -1.9, L + 2.45, yf + hgt + 0.35, 1.9, M.STEEL_DARK, { md: 1 });
    b.box(L + 1.0, yf + 1.1, -2.05, L + 1.6, yf + hgt - 0.3, -1.95, M.GLASS_DARK, { md: 1.2 });
    b.box(L + 1.0, yf + 1.1, 1.95, L + 1.6, yf + hgt - 0.3, 2.05, M.GLASS_DARK, { md: 1.2 });
    b.box(L * 0.9 - 0.1, yf + hgt + 0.5, -2.1, L + 1.7, yf + hgt + 0.75, 2.1, M.STEEL_BRIGHT, { md: 1.5 });
    b.box(L + 1.0, yf + hgt + 0.75, -0.5, L + 1.3, yf + hgt + 1.05, 0.5, M.BEACON_RED, { md: 2 });
    // support column, cross beam and the wheel bogie
    const cx = L * 0.72;
    for (const s of [-1, 1]) b.box(cx - 0.2, 0.55, s * 1.2 - 0.2, cx + 0.2, yf - 0.4, s * 1.2 + 0.2, M.STEEL, { md: 2 });
    b.box(cx - 0.3, yf - 0.9, -1.6, cx + 0.3, yf - 0.4, 1.6, M.STEEL_DARK, { md: 2 });
    b.box(cx - 0.5, 0.45, -1.6, cx + 0.5, 0.7, 1.6, M.STEEL_DARK, { md: 2 });
    for (const s of [-1, 1]) b.cyl('x', 0.28, s * 1.2, 0.28, 0.28, cx - 0.2, cx + 0.2, M.TIRE, { md: 2 });
    // stair from the apron up to the rotunda
    for (let i = 0; i < 9; i++) b.box(-3.6 - i * 0.05, i * 0.4, -1.1, -2.6 + i * 0.05 + 0.4, i * 0.4 + 0.4, 1.1, M.CONCRETE_DARK, { md: 1.2 });
  },
});

/**
 * Cargo terminal: a long shed with a tall sorting hall in the middle, dock doors under a canopy on the +z face, a bridge between the
 * two, stacks of unit load devices in the yard and the sign of the operator.
 */
const cargo = defineKit({
  id: 'cargo',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 120, dp = d.d ?? 40, h = d.h || 13, st = d.style || {};
    const wall = st.wall ?? M.FAC_CORR_GRAY;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2.5);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, wall);
    b.box(-w / 2 - 0.15, 0, -dp / 2 - 0.15, w / 2 + 0.15, 1.2, dp / 2 + 0.15, M.CONCRETE, { md: 1.5 });
    b.gable(-w / 2 - 0.5, -dp / 2 - 0.5, w / 2 + 0.5, dp / 2 + 0.5, h, 2.6, 'x', M.ROOF_TIN);
    // sorting hall
    const hw = 30;
    b.box(-hw, h, -dp * 0.3, hw, h + 7, dp * 0.3, M.FAC_RIBBON_DARK);
    b.box(-hw - 0.3, h + 7, -dp * 0.3 - 0.3, hw + 0.3, h + 7.6, dp * 0.3 + 0.3, M.CONCRETE_DARK);
    b.gable(-hw - 0.3, -dp * 0.3 - 0.3, hw + 0.3, dp * 0.3 + 0.3, h + 7.6, 2.4, 'x', M.ROOF_FLAT);
    for (let x = -hw + 5; x < hw - 3; x += 10) b.box(x - 1, h + 9.5, -1.5, x + 1, h + 11, 1.5, M.STEEL, { md: 1.5 });
    // dock doors and levelers along the yard face, each with a number, a light and rubber bumpers
    const n = Math.max(3, Math.floor((w - 10) / 8.5));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 6 + i * ((w - 12) / Math.max(1, n - 1));
      b.box(x - 1.9, 0.7, dp / 2, x + 1.9, 4.4, dp / 2 + 0.3, i % 4 === 1 ? M.STEEL_BRIGHT : M.STEEL_DARK, { md: 1 });
      b.box(x - 2.2, 0.0, dp / 2 + 0.3, x + 2.2, 1.25, dp / 2 + 2.2, M.CONCRETE, { md: 1 });
      for (const s of [-1, 1]) b.box(x + s * 1.9 - 0.15, 0.9, dp / 2 + 0.3, x + s * 1.9 + 0.15, 1.7, dp / 2 + 0.7, M.TIRE, { md: 0.8 });
      b.box(x - 0.25, 4.6, dp / 2 + 0.05, x + 0.25, 4.95, dp / 2 + 0.3, i % 3 === 0 ? M.SIGNAL_GREEN : M.SIGNAL_RED, { md: 0.9 });
    }
    // canopy over the yard, on columns
    b.box(-w / 2, 6.3, dp / 2 + 0.3, w / 2, 6.7, dp / 2 + 11, M.CONCRETE_PANEL);
    b.box(-w / 2, 6.7, dp / 2 + 10.5, w / 2, 7.1, dp / 2 + 11, M.STEEL_BRIGHT, { md: 1.5 });
    for (let x = -w / 2 + 4; x <= w / 2 - 3; x += 8.5) b.box(x - 0.3, 0, dp / 2 + 10.3, x + 0.3, 6.3, dp / 2 + 10.9, M.STEEL_BRIGHT, { md: 1 });
    // conveyor bridge to a small annex, an annex with a tank, containers in the yard
    b.box(-w / 2 - 12, 0, -dp * 0.1, -w / 2, 8, dp * 0.2, M.CONCRETE_PANEL);
    b.box(-w / 2 - 12.2, 8, -dp * 0.1 - 0.2, -w / 2 + 0.2, 8.4, dp * 0.2 + 0.2, M.CONCRETE_DARK);
    b.box(-w / 2 - 6, 3.6, dp * 0.2, -w / 2 - 3, 8.6, dp * 0.2 + 2.6, M.STEEL_DARK, { md: 1.5 });
    const boxCol = [M.CONTAINER_GRAY, M.CONTAINER_BLUE, M.CONTAINER_ORANGE, M.STEEL_BRIGHT, M.CONTAINER_GREEN];
    for (let i = 0; i < 9; i++) {
      const x = -w / 2 + 8 + i * 12.2 + rng.range(-1, 1);
      if (rng.chance(0.3)) continue;
      const k = rng.int(1, 2), z = dp / 2 + 14;
      for (let j = 0; j < k; j++) b.box(x, 0.2 + j * 1.75, z, x + 4.4, 1.95 + j * 1.75, z + 2.4, pick(rng, boxCol), { md: 1.5 });
    }
    // the operator's name along the hall, blocks of vents on the roof
    textBoxes(b, st.name ?? 'CARGO', 0, h + 2.4, dp * 0.3 + 0.6, 0.8, M.PAINT_WHITE, 0.3, { md: 1.6 });
    b.box(-hw + 2, h + 2.0, dp * 0.3 + 0.3, hw - 2, h + 8.4, dp * 0.3 + 0.6, M.SIGN_RED, { md: 3 });
    roofClutter(b, rng, -w / 2 + 4, -dp / 2 + 4, -hw - 2, dp / 2 - 4, h + 2.2, 3);
    roofClutter(b, rng, hw + 2, -dp / 2 + 4, w / 2 - 4, dp / 2 - 4, h + 2.2, 3);
  },
});

/** Airport fire station: four red bay doors, a hose-drying and lookout tower, and a burnt training airframe behind. */
const firestation = defineKit({
  id: 'firestation',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 44, dp = d.d ?? 22, h = d.h || 8;
    foundation(b, -w / 2, -dp / 2, w / 2, dp / 2, 2);
    b.box(-w / 2, 0, -dp / 2, w / 2, h, dp / 2, M.PLASTER_WHITE);
    b.box(-w / 2 - 0.2, h - 1.2, -dp / 2 - 0.2, w / 2 + 0.2, h, dp / 2 + 0.2, M.PAINT_BARN_RED, { md: 2 });
    b.box(-w / 2 - 0.5, h, -dp / 2 - 0.5, w / 2 + 0.5, h + 0.5, dp / 2 + 0.9, M.CONCRETE_DARK);
    b.wedge(-w / 2 - 0.5, h + 0.5, -dp / 2 - 0.5, w / 2 + 0.5, h + 1.6, dp / 2 + 0.9, '-z', M.ROOF_FLAT);
    // four bays: red roll-up doors part way open showing the dark inside
    const bw = 7.4, gap = (w - 4 * bw) / 5;
    for (let i = 0; i < 4; i++) {
      const x0 = -w / 2 + gap + i * (bw + gap);
      b.box(x0, 0, dp / 2 - 0.4, x0 + bw, 5.6, dp / 2 + 0.3, M.STEEL_DARK);
      const open = i % 2 === 0 ? 0.55 : 0.0;
      b.box(x0 + 0.2, 5.2 * open, dp / 2 + 0.05, x0 + bw - 0.2, 5.4, dp / 2 + 0.35, M.PAINT_BARN_RED, { md: 1 });
      for (let k = 0; k < 8; k++) b.box(x0 + 0.2, 5.2 * open + k * 0.5, dp / 2 + 0.35, x0 + bw - 0.2, 5.2 * open + k * 0.5 + 0.06, dp / 2 + 0.42, M.STEEL_DARK, { md: 0.5 });
      b.box(x0 - 0.3, 0, dp / 2 - 0.1, x0, 5.9, dp / 2 + 0.5, M.CONCRETE_PANEL, { md: 1.5 });
      b.box(x0 + bw / 2 - 0.5, 5.9, dp / 2 + 0.05, x0 + bw / 2 + 0.5, 6.3, dp / 2 + 0.5, M.BEACON_RED, { md: 1 });
    }
    b.box(-w / 2 + 3, 5.9, dp / 2 + 0.05, w / 2 - 3, 6.1, dp / 2 + 0.5, M.CONCRETE_DARK, { md: 2 });
    textBoxes(b, d.style?.name ?? 'FIRE', 0, 6.4, dp / 2 + 0.4, 0.22, M.PAINT_WHITE, 0.15, { md: 0.5 });
    // tower: four floors of a square shaft, lookout with glass, hose racks and a roof mast
    const tx = w / 2 - 1, tz = -dp / 4;
    b.box(tx - 3, h, tz - 3, tx + 3, h + 9, tz + 3, M.PLASTER_WHITE);
    b.box(tx - 3.6, h + 9, tz - 3.6, tx + 3.6, h + 9.4, tz + 3.6, M.CONCRETE_DARK);
    b.box(tx - 3.3, h + 9.4, tz - 3.3, tx + 3.3, h + 12.2, tz + 3.3, M.GLASS_DARK);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(tx + sx * 3.3 - 0.25, h + 9.4, tz + sz * 3.3 - 0.25, tx + sx * 3.3 + 0.25, h + 12.2, tz + sz * 3.3 + 0.25, M.STEEL_DARK, { md: 1 });
    b.box(tx - 4.0, h + 12.2, tz - 4.0, tx + 4.0, h + 12.7, tz + 4.0, M.PAINT_BARN_RED);
    b.hip(tx - 3.8, tz - 3.8, tx + 3.8, tz + 3.8, h + 12.7, 1.6, M.ROOF_RED_METAL, { md: 4 });
    b.cyl('y', tx, tz, 0.09, 0.05, h + 12.7, h + 18, M.STEEL, { md: 1 });
    b.box(tx - 0.2, h + 18, tz - 0.2, tx + 0.2, h + 18.5, tz + 0.2, M.BEACON_RED);
    for (let y = h + 1; y < h + 9; y += 2.4) b.box(tx - 3.05, y, tz - 0.6, tx - 2.9, y + 1.0, tz + 0.6, M.GLASS_DARK, { md: 1 });
    // the burnt training airframe: a fuselage tube, stub wings and a tail on a slab
    const bx = -w / 2 - 20, bz = -2;
    b.box(bx - 14, -0.3, bz - 7, bx + 14, 0.1, bz + 7, M.CONCRETE_DARK, { md: 3 });
    b.cyl('x', 2.1, bz, 1.7, 1.7, bx - 11, bx + 11, M.RUST_DARK, { md: 3 });
    b.cyl('x', 2.1, bz, 0.3, 1.7, bx + 11, bx + 12.4, M.RUST_DARK, { md: 3 });
    b.box(bx - 3, 1.9, bz - 9, bx + 3, 2.2, bz + 9, M.RUST_DARK, { md: 3 });
    b.box(bx - 11, 2.0, bz - 0.2, bx - 8, 6.4, bz + 0.2, M.RUST_DARK, { md: 3 });
    b.box(bx - 11, 3.5, bz - 3.2, bx - 9, 3.8, bz + 3.2, M.RUST_DARK, { md: 3 });
    for (let i = 0; i < 6; i++) b.box(bx - 8 + i * 3.2, 3.0, bz - 1.75, bx - 6.5 + i * 3.2, 3.6, bz - 1.65, M.GLASS_DARK, { md: 1 });
    b.blob(bx - 2, 1.2, bz + 0.5, 3.6, 1.0, 2.6, M.TIRE, (d.seed | 0) + 3, 0.5, M.RUST_DARK, 0.4, { md: 3 });
    // flagpole, a hydrant, the apron pad in front
    b.box(-w / 2 + 2 - 0.08, 0, dp / 2 + 5, -w / 2 + 2 + 0.08, 9, dp / 2 + 5.16, M.STEEL_BRIGHT, { md: 1 });
    b.box(-w / 2 + 2.1, 6.2, dp / 2 + 5.02, -w / 2 + 4.1, 7.9, dp / 2 + 5.1, M.SIGN_RED, { md: 0.8 });
    b.box(-w / 2, 0, dp / 2, w / 2, 0.05, dp / 2 + 14, M.CONCRETE, { md: 2 });
  },
});

/**
 * Fuel farm: a bunded yard of six tanks with cone roofs, stairs, foam chambers and rings, a pipe manifold with valve wheels, a
 * pump house, and a tanker loading gantry on the +z side.
 */
const fuelfarm = defineKit({
  id: 'fuelfarm',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 74, dp = d.d ?? 54, st = d.style || {};
    const mat = st.mat ?? M.TANK_WHITE;
    b.box(-w / 2, -0.5, -dp / 2, w / 2, 0.1, dp / 2, M.GRAVEL);
    for (const [x0, z0, x1, z1] of [[-w / 2, -dp / 2, w / 2, -dp / 2 + 0.7], [-w / 2, dp / 2 - 0.7, w / 2, dp / 2], [-w / 2, -dp / 2, -w / 2 + 0.7, dp / 2], [w / 2 - 0.7, -dp / 2, w / 2, dp / 2]]) b.box(x0, 0, z0, x1, 1.4, z1, M.CONCRETE);
    b.box(-w / 2, 1.4, -dp / 2, w / 2, 1.55, -dp / 2 + 0.7, M.CONCRETE_DARK, { md: 1.5 });
    const cols = 3, rowsZ = [-dp * 0.2, dp * 0.1], R = 8.4, H = 11;
    let k = 0;
    for (const z of rowsZ) for (let c = 0; c < cols; c++) {
      const x = -w / 2 + w * (c + 0.5) / cols;
      b.cyl('y', x, z, R + 0.5, R + 0.5, 0, 0.6, M.CONCRETE_DARK);
      b.cyl('y', x, z, R, R, 0.6, H, mat);
      b.cyl('y', x, z, R + 0.15, 0.6, H, H + R * 0.2, M.TANK_GRAY);
      for (let y = 3; y < H; y += 3) b.cyl('y', x, z, R + 0.12, R + 0.12, y, y + 0.18, M.STEEL, { md: 0.8 });
      b.cyl('y', x, z, R + 0.5, R + 0.5, H - 0.1, H + 0.3, M.STEEL, { md: 0.6 });
      // stair up the shell: treads winding around
      b.fn(x - R - 1.5, 0.6, z - R - 1.5, x + R + 1.5, H, z + R + 1.5, (lx, ly, lz) => {
        const rr = Math.hypot(lx, lz);
        if (rr < R + 0.05 || rr > R + 1.0) return 0;
        const a = Math.atan2(lz, lx), t = (((a - k * 0.7) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const hy = 0.6 + (t / (Math.PI * 2)) * (H - 0.6) * 0.98;
        return Math.abs(ly - hy) < 0.45 ? M.STEEL_DARK : 0;
      }, { md: 0.6 });
      b.cyl('y', x + R * 0.55, z + R * 0.65, 0.6, 0.6, H, H + 1.3, M.STEEL_DARK, { md: 1 });
      b.box(x + R - 0.2, 0.6, z - 0.25, x + R + 0.2, H, z + 0.25, M.SIGN_RED, { md: 0.6 });
      k++;
    }
    // manifold along the yard face and down to a pump house, gate valves in red
    b.box(-w / 2 + 3, 0, dp / 2 - 6.5, w / 2 - 3, 0.5, dp / 2 - 5.5, M.CONCRETE, { md: 2 });
    b.cyl('x', 1.0, dp / 2 - 6, 0.34, 0.34, -w / 2 + 3, w / 2 - 12, M.STEEL_DARK, { md: 2 });
    b.cyl('x', 1.7, dp / 2 - 6, 0.26, 0.26, -w / 2 + 3, w / 2 - 12, M.TANK_GRAY, { md: 2 });
    for (let x = -w / 2 + 8; x < w / 2 - 14; x += 9) { b.box(x - 0.2, 1.0, dp / 2 - 6.2, x + 0.2, 2.2, dp / 2 - 5.8, M.STEEL_DARK, { md: 1 }); b.cyl('y', x, dp / 2 - 6, 0.4, 0.4, 2.2, 2.35, M.SIGN_RED, { md: 0.8 }); }
    b.box(w / 2 - 12, 0, dp / 2 - 12, w / 2 - 3, 4.2, dp / 2 - 4, M.CONCRETE_PANEL);
    b.gable(w / 2 - 12.5, dp / 2 - 12.5, w / 2 - 2.5, dp / 2 - 3.5, 4.2, 1.6, 'x', M.ROOF_TIN);
    b.box(w / 2 - 7.8, 0, dp / 2 - 4.05, w / 2 - 6.2, 2.6, dp / 2 - 3.95, M.STEEL_DARK, { md: 1 });
    // the loading gantry: a canopy over two lanes with arms and a pair of hoses
    const gx = -w / 2 - 24;
    b.box(gx - 9, 6.2, dp / 2 - 12, gx + 9, 6.6, dp / 2, M.CONCRETE_PANEL);
    for (const x of [-8.5, 8.5]) for (const z of [dp / 2 - 11.5, dp / 2 - 0.5]) b.box(gx + x - 0.3, 0, z - 0.3, gx + x + 0.3, 6.2, z + 0.3, M.STEEL_BRIGHT, { md: 1 });
    for (const x of [-4, 4]) { b.box(gx + x - 0.2, 4.0, dp / 2 - 6.3, gx + x + 0.2, 6.2, dp / 2 - 5.7, M.STEEL, { md: 1 }); b.cyl('y', gx + x, dp / 2 - 6, 0.12, 0.12, 2.6, 4.0, M.TIRE, { md: 0.8 }); }
    b.box(gx - 9, 0, dp / 2 - 12, gx + 9, 0.05, dp / 2, M.CONCRETE, { md: 2 });
    b.box(gx - 9, 6.6, dp / 2 - 12, gx + 9, 6.75, dp / 2 - 11.7, M.SIGN_YELLOW, { md: 1.5 });
    // floodlights at the corners and a windsock-free vent stack
    for (const [x, z] of [[-w / 2, -dp / 2], [w / 2, -dp / 2], [w / 2, dp / 2]]) { b.box(x - 0.15, 0, z - 0.15, x + 0.15, 9, z + 0.15, M.STEEL_DARK, { md: 2 }); b.box(x - 0.5, 9, z - 0.4, x + 0.5, 9.4, z + 0.4, M.LAMP_WHITE, { md: 1.5 }); }
    b.cyl('y', -w / 2 + 2, dp / 2 - 3, 0.3, 0.2, 0, 8, M.STEEL, { md: 1.5 });
  },
});

/** Instrument landing system: the localizer array, a row of dipoles on posts facing down the runway, and its equipment shed. */
const localizer = defineKit({
  id: 'localizer',
  conservative: true,
  build(d, b) {
    const W = d.w ?? 34, n = 14;
    for (let i = 0; i < n; i++) {
      const z = -W / 2 + (i * W) / (n - 1);
      b.box(z * 0 - 0.06, 0, z - 0.06, 0.06, 2.6, z + 0.06, M.STEEL, { md: 0.6 });
      b.box(-0.05, 2.0, z - 0.4, 0.05, 2.1, z + 0.4, M.STEEL_BRIGHT, { md: 0.6 });
      b.box(-0.05, 2.5, z - 0.4, 0.05, 2.6, z + 0.4, M.STEEL_BRIGHT, { md: 0.6 });
      b.box(-0.9, 0, z - 0.06, 0.0, 0.1, z + 0.06, M.STEEL_DARK, { md: 1 });
    }
    b.box(-0.6, 2.3, -W / 2 - 0.4, 0.6, 2.36, W / 2 + 0.4, M.STEEL_DARK, { md: 0.6 });
    b.box(-5, 0, -3, -1.5, 2.6, 0.2, M.CONCRETE_PANEL, { md: 1.5 });
    b.box(-5.2, 2.6, -3.2, -1.3, 2.8, 0.4, M.CONCRETE_DARK, { md: 1.5 });
    b.box(-3.4, 0, 0.2, -3.0, 0.9, 0.6, M.STEEL_DARK, { md: 1.5 });
  },
});

/** Glide slope: a mast with three panel antennas, a sensor post and a shed. */
const glideslope = defineKit({
  id: 'glideslope',
  conservative: true,
  build(d, b) {
    b.box(-0.2, 0, -0.2, 0.2, 13, 0.2, M.STEEL, { md: 1 });
    for (const [y, s] of [[3.2, 1], [7.4, 0.9], [11.6, 0.8]]) b.box(-0.55, y, -s * 0.8, -0.35, y + 1.6, s * 0.8, M.RADAR_WHITE, { md: 1 });
    for (let y = 2; y < 13; y += 3) b.box(-0.45, y, -0.45, 0.45, y + 0.12, 0.45, M.STEEL_DARK, { md: 0.8 });
    b.box(-0.15, 13, -0.15, 0.15, 13.4, 0.15, M.BEACON_RED);
    b.box(-4, 0, 1.2, -1.2, 2.5, 3.6, M.CONCRETE_PANEL, { md: 1.5 });
    b.box(-4.2, 2.5, 1.0, -1.0, 2.7, 3.8, M.CONCRETE_DARK, { md: 1.5 });
    b.cyl('y', 3, -2.5, 0.05, 0.05, 0, 3.6, M.STEEL, { md: 0.6 });
  },
});

/** An open canopy: posts, a shallow roof and, at the back, a low wall. style.roof and style.post pick the colors. */
const canopy = defineKit({
  id: 'canopy',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 30, dp = d.d ?? 12, h = d.h || 4.2, st = d.style || {};
    b.box(-w / 2, 0, -dp / 2, w / 2, 0.1, dp / 2, st.slab ?? M.CONCRETE, { md: 2 });
    for (let x = -w / 2 + 0.5; x <= w / 2 - 0.4; x += 6) for (const z of [-dp / 2 + 0.5, dp / 2 - 0.5]) b.box(x - 0.2, 0, z - 0.2, x + 0.2, h, z + 0.2, st.post ?? M.STEEL_BRIGHT, { md: 1.5 });
    b.wedge(-w / 2 - 0.6, h, -dp / 2 - 0.6, w / 2 + 0.6, h + Math.min(1.8, dp * 0.14), dp / 2 + 0.6, '-z', st.roof ?? M.ROOF_TIN);
    b.box(-w / 2 - 0.6, h - 0.3, -dp / 2 - 0.6, w / 2 + 0.6, h, dp / 2 + 0.6, M.STEEL_DARK, { md: 2 });
    if (st.wall !== false) b.box(-w / 2, 0.1, -dp / 2, w / 2, Math.min(2.4, h - 0.3), -dp / 2 + 0.3, st.wallMat ?? M.CONCRETE_PANEL, { md: 3 });
    for (let x = -w / 2 + 3; x < w / 2 - 2; x += 6) b.box(x - 0.6, h - 0.3, -0.05, x + 0.6, h - 0.15, 0.05, M.LAMP_WHITE, { md: 1.2 });
  },
});

/**
 * A lettered sign on two posts. style.text is the words, plate and ink their colors; w and h size the panel. style.hand gives the
 * crooked, hand-painted look of a farm strip: a weathered board, letters that drift, one that has lost its paint.
 */
const signboard = defineKit({
  id: 'signboard',
  conservative: true,
  build(d, b, rng) {
    const st = d.style || {}, text = (st.text ?? 'AIRPORT').toUpperCase();
    const w = d.w ?? 14, h = d.h ?? 3.2;
    const plate = st.plate ?? M.SIGN_GREEN, ink = st.ink ?? M.PAINT_WHITE, base = st.base ?? 2.4;
    const cols = textPixels(text), px = Math.min((w - 1.2) / cols, (h - 0.8) / 7);
    if (st.hand) {
      for (const x of [-w / 2 + 0.6, w / 2 - 0.6]) b.box(x - 0.16, 0, -0.16, x + 0.16, base + h + 0.4, 0.16, M.WOOD_WEATHERED);
      b.box(-w / 2, base, -0.12, w / 2, base + h, 0.12, M.WOOD_LIGHT);
      for (let i = 1; i < 4; i++) b.box(-w / 2, base + i * h / 4 - 0.03, -0.13, w / 2, base + i * h / 4 + 0.03, 0.13, M.WOOD_DARK, { md: 0.5 });
      const y0 = base + (h - 7 * px) / 2;
      let k = 0;
      for (const ch of text) {
        const c = textPixels(text.slice(0, k + 1)) - 5;
        const off = (rng.next() - 0.5) * px * 0.9;
        textBoxes(b, ch, -cols * px / 2 + (c + 2.5) * px, y0 + off, 0.12, px, ch === 'O' && k === 3 ? M.WOOD_MID : ink, 0.06, { md: 0.9 });
        k++;
      }
      b.box(-w / 2 + 0.2, base + h - 0.4, -0.13, -w / 2 + 1.4, base + h, 0.13, M.TARP_BLUE, { md: 0.7 });
    } else {
      for (const x of [-w / 2 + 1, w / 2 - 1]) b.box(x - 0.2, 0, -0.2, x + 0.2, base, 0.2, M.STEEL_DARK);
      b.box(-w / 2, base, -0.2, w / 2, base + h, 0.2, M.STEEL_DARK);
      b.box(-w / 2 + 0.25, base + 0.25, 0.2, w / 2 - 0.25, base + h - 0.25, 0.32, plate);
      textBoxes(b, text, 0, base + (h - 7 * px) / 2, 0.32, px, ink, 0.1, { md: 0.8 });
      b.box(-w / 2 + 0.25, base + h - 0.3, 0.2, w / 2 - 0.25, base + h - 0.22, 0.34, ink, { md: 0.8 });
      for (const x of [-w / 4, w / 4]) b.box(x - 0.3, base + h, -0.1, x + 0.3, base + h + 0.4, 0.1, M.LAMP_WHITE, { md: 1 });
    }
  },
});

/** Gatehouse: two booths and a canopy over two lanes with striped barrier arms, signs and cones. */
const gatehouse = defineKit({
  id: 'gatehouse',
  conservative: true,
  build(d, b, rng) {
    const w = d.w ?? 18, dp = d.d ?? 12, st = d.style || {};
    b.box(-w / 2, 0, -dp / 2, w / 2, 0.1, dp / 2, M.CONCRETE_DARK, { md: 2 });
    b.box(-1.9, 0, -dp / 2 + 1.5, 1.9, 3.0, -dp / 2 + 5.5, st.mil ? M.MIL_TAN : M.CONCRETE_PANEL);
    b.box(-1.7, 0.9, -dp / 2 + 5.4, 1.7, 2.6, -dp / 2 + 5.6, M.GLASS_DARK, { md: 1 });
    b.box(-1.7, 0.9, -dp / 2 + 1.4, 1.7, 2.6, -dp / 2 + 1.6, M.GLASS_DARK, { md: 1 });
    b.box(-2.2, 3.0, -dp / 2 + 1.2, 2.2, 3.3, -dp / 2 + 5.8, M.CONCRETE_DARK);
    b.box(-w / 2, 5.4, -dp / 2, w / 2, 5.8, dp / 2, st.mil ? M.MIL_GRAY : M.CONCRETE_PANEL);
    for (const x of [-w / 2 + 0.6, w / 2 - 0.6, -3.2, 3.2]) for (const z of [-dp / 2 + 0.6, dp / 2 - 0.6]) b.box(x - 0.25, 0, z - 0.25, x + 0.25, 5.4, z + 0.25, M.STEEL_BRIGHT, { md: 1.5 });
    b.box(-w / 2, 5.8, dp / 2 - 0.2, w / 2, 6.6, dp / 2, M.SIGN_YELLOW, { md: 2 });
    for (const x of [-w / 4 - 1.6, w / 4 + 1.6]) {
      b.box(x - 0.3, 0, -dp / 2 + 3.2, x + 0.3, 1.2, -dp / 2 + 3.8, M.STEEL_DARK, { md: 1 });
      for (let i = 0; i < 6; i++) b.box(x + 0.3 + i * 0.85, 1.05, -dp / 2 + 3.3, x + 0.3 + (i + 0.5) * 0.85, 1.25, -dp / 2 + 3.7, i & 1 ? M.SIGN_RED : M.PAINT_WHITE, { md: 0.6 });
    }
    for (let i = 0; i < 5; i++) b.box(-w / 2 + 1 + i * 3.9, 0, dp / 2 + 0.2, -w / 2 + 2.5 + i * 3.9, 0.85, dp / 2 + 0.7, M.CONCRETE, { md: 1.5 });
    b.box(-0.9, 5.9, dp / 2 - 0.3, 0.9, 6.3, dp / 2 - 0.1, M.BEACON_RED, { md: 1.5 });
  },
});

export default [terminal, jetbridge, cargo, firestation, fuelfarm, localizer, glideslope, canopy, signboard, gatehouse];
