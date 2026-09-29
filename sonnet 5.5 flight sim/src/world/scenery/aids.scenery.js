import { defineScenery } from '../region.js';
import { M } from '../../voxel/palette.js';
import { textBoxes, textPixels } from '../../voxel/glyphs.js';

/* Visual aids of an airfield: approach light bars, precision approach path indicators, taxiway and holding position signs, high
   mast floodlights, cones, barriers and bollards. Lamps are emissive, and the approach and runway lamps glow by day as well. */

// Local +x points along the approach, toward the runway. Variants: a centerline bar, a crossbar, red side lamps, a green wing bar.
const approachLight = defineScenery({
  id: 'approach-light',
  variants: 4,
  rules: { fine: true, size: 2.4, conservative: true },
  build(b, v) {
    b.box(-0.05, 0, -0.05, 0.05, 1.15, 0.05, M.STEEL_DARK);
    if (v === 0) {
      b.box(-0.2, 1.1, -0.22, 0.2, 1.4, 0.22, M.RWY_LIGHT_WHITE);
    } else if (v === 1) {
      b.box(-0.06, 1.1, -3.0, 0.06, 1.22, 3.0, M.STEEL_DARK);
      for (let i = -2; i <= 2; i++) b.box(-0.16, 1.2, i * 1.1 - 0.2, 0.16, 1.5, i * 1.1 + 0.2, M.RWY_LIGHT_WHITE);
    } else if (v === 2) {
      b.box(-0.06, 1.1, -1.4, 0.06, 1.22, 1.4, M.STEEL_DARK);
      for (const z of [-1.1, 0, 1.1]) b.box(-0.16, 1.2, z - 0.2, 0.16, 1.5, z + 0.2, M.RWY_LIGHT_RED);
    } else {
      b.box(-0.06, 1.1, -4.4, 0.06, 1.22, 4.4, M.STEEL_DARK);
      for (let i = -3; i <= 3; i++) b.box(-0.16, 1.2, i * 1.2 - 0.22, 0.16, 1.5, i * 1.2 + 0.22, M.RWY_LIGHT_GREEN);
    }
  },
});

// Four lamp housings across the approach, two red and two white (slightly low on the slope). +x is the approach direction.
const papi = defineScenery({
  id: 'papi',
  variants: 1,
  rules: { fine: true, size: 30, conservative: true },
  build(b) {
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * 3.0;
      b.box(z * 0 - 0.5, 0, z - 0.4, 0.5, 0.5, z + 0.4, M.CONCRETE_DARK);
      b.box(-0.45, 0.5, z - 0.35, 0.45, 1.6, z + 0.35, M.STEEL_BRIGHT);
      b.box(0.4, 0.75, z - 0.28, 0.55, 1.5, z + 0.28, i < 2 ? M.RWY_LIGHT_RED : M.RWY_LIGHT_WHITE);
      b.box(-0.35, 1.6, z - 0.3, 0.35, 1.75, z + 0.3, M.STEEL_DARK, { md: 0.5 });
    }
  },
});

/** A sign face on posts, readable from +z: color plate, text in black or white, and a frame. */
function signBoard(b, text, plate, ink, px, h) {
  const w = textPixels(text, 1) * px + 0.5;
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) b.box(x - 0.05, 0, -0.06, x + 0.05, h * 0.6, 0.06, M.STEEL_DARK);
  const y0 = h * 0.55;
  b.box(-w / 2, y0, -0.06, w / 2, y0 + h, 0.06, plate);
  b.box(-w / 2 - 0.05, y0 - 0.05, -0.09, w / 2 + 0.05, y0, 0.09, M.STEEL_DARK, { md: 0.4 });
  b.box(-w / 2 - 0.05, y0 + h, -0.09, w / 2 + 0.05, y0 + h + 0.05, 0.09, M.STEEL_DARK, { md: 0.4 });
  textBoxes(b, text, 0, y0 + (h - 7 * px) / 2, 0.05, px, ink, 0.06);
  textBoxes(b, text, 0, y0 + (h - 7 * px) / 2, -0.11, px, ink, 0.06);
}

const TAXI_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'A1', 'B2'];
const taxiSign = defineScenery({
  id: 'taxi-sign',
  variants: TAXI_NAMES.length,
  rules: { fine: true, size: 3, conservative: true },
  build(b, v) { signBoard(b, TAXI_NAMES[v], M.SIGN_YELLOW, M.TIRE, 0.14, 1.15); },
});

const HOLD_NAMES = ['09R-27L', '09L-27R', '07-25', '09-27'];
const holdSign = defineScenery({
  id: 'hold-sign',
  variants: HOLD_NAMES.length,
  rules: { fine: true, size: 5, conservative: true },
  build(b, v) { signBoard(b, HOLD_NAMES[v], M.SIGN_RED, M.PAINT_WHITE, 0.125, 1.15); },
});

/**
 * Floodlight mast for aprons and ramps. Variants: 0 a high mast, 1 a medium mast, 2 a twin-head pole for a parking area.
 * The lamp heads glow at night.
 */
const floodlight = defineScenery({
  id: 'floodlight',
  variants: 3,
  rules: { fine: true, size: 30, conservative: true, noShadow: false },
  build(b, v) {
    if (v === 0) {
      const H = 24;
      b.cyl('y', 0, 0, 0.95, 0.95, 0, 0.6, M.CONCRETE_DARK);
      b.cyl('y', 0, 0, 0.42, 0.24, 0.6, H, M.STEEL_BRIGHT);
      for (let y = 4; y < H; y += 4) b.cyl('y', 0, 0, 0.36 - y * 0.005, 0.36 - y * 0.005, y, y + 0.12, M.STEEL, { md: 0.5 });
      b.cyl('y', 0, 0, 1.9, 1.9, H, H + 0.3, M.STEEL_DARK);
      b.cyl('y', 0, 0, 1.8, 1.8, H + 0.3, H + 1.0, M.STEEL_DARK, { md: 0.5 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 1.75, z = Math.sin(a) * 1.75;
        b.box(x - 0.42, H + 0.35, z - 0.42, x + 0.42, H + 1.35, z + 0.42, M.STEEL_DARK);
        b.box(x - 0.38 + Math.cos(a) * 0.32, H + 0.42, z - 0.38 + Math.sin(a) * 0.32, x + 0.38 + Math.cos(a) * 0.32, H + 1.28, z + 0.38 + Math.sin(a) * 0.32, M.LAMP_WHITE);
      }
      b.box(-0.06, H + 1.0, -0.06, 0.06, H + 2.6, 0.06, M.STEEL, { md: 0.5 });
      b.box(-0.14, H + 2.6, -0.14, 0.14, H + 2.95, 0.14, M.BEACON_RED);
    } else if (v === 1) {
      const H = 12;
      b.cyl('y', 0, 0, 0.5, 0.5, 0, 0.4, M.CONCRETE_DARK);
      b.cyl('y', 0, 0, 0.26, 0.16, 0.4, H, M.STEEL_BRIGHT);
      b.box(-1.8, H, -0.12, 1.8, H + 0.25, 0.12, M.STEEL_DARK);
      for (const x of [-1.4, 0, 1.4]) { b.box(x - 0.5, H + 0.2, -0.5, x + 0.5, H + 0.75, 0.5, M.STEEL_DARK); b.box(x - 0.45, H + 0.1, -0.45, x + 0.45, H + 0.24, 0.45, M.LAMP_WHITE); }
    } else {
      b.cyl('y', 0, 0, 0.16, 0.1, 0, 7.6, M.STEEL_DARK);
      b.box(-1.5, 7.4, -0.09, 1.5, 7.6, 0.09, M.STEEL_DARK);
      for (const x of [-1.5, 1.5]) { b.box(x - 0.4, 7.1, -0.22, x + 0.4, 7.4, 0.22, M.STEEL_DARK); b.box(x - 0.34, 7.0, -0.2, x + 0.34, 7.15, 0.2, M.LAMP_SODIUM); }
    }
  },
});

const cone = defineScenery({
  id: 'traffic-cone',
  variants: 1,
  rules: { fine: true, size: 0.8, conservative: true, maxDist: 900 },
  build(b) {
    b.box(-0.22, 0, -0.22, 0.22, 0.04, 0.22, M.TARP_ORANGE);
    b.cyl('y', 0, 0, 0.16, 0.04, 0.04, 0.68, M.TARP_ORANGE);
    b.cyl('y', 0, 0, 0.1, 0.075, 0.28, 0.4, M.PAINT_WHITE, { md: 0.06 });
  },
});

const barrier = defineScenery({
  id: 'barrier',
  variants: 1,
  rules: { fine: true, size: 3.4, conservative: true, maxDist: 1200 },
  build(b) {
    b.box(-1.5, 0, -0.32, 1.5, 0.25, 0.32, M.CONCRETE);
    b.box(-1.5, 0.25, -0.22, 1.5, 0.62, 0.22, M.CONCRETE);
    b.box(-1.5, 0.62, -0.15, 1.5, 0.85, 0.15, M.CONCRETE);
    b.box(-1.5, 0.3, 0.2, 1.5, 0.5, 0.34, M.SIGN_RED, { md: 0.3 });
  },
});

const bollard = defineScenery({
  id: 'bollard',
  variants: 1,
  rules: { fine: true, size: 0.6, conservative: true, maxDist: 900 },
  build(b) {
    b.cyl('y', 0, 0, 0.14, 0.14, 0, 1.0, M.SIGN_YELLOW);
    b.cyl('y', 0, 0, 0.15, 0.15, 0.55, 0.65, M.TIRE, { md: 0.06 });
  },
});

export default [approachLight, papi, taxiSign, holdSign, floodlight, cone, barrier, bollard];
