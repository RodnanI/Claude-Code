import { M } from '../voxel/palette.js';

/**
 * A signal mast: a pole on the right hand sidewalk, an arm reaching over the approach and a three lamp head hanging at its
 * end, facing oncoming traffic. The frame is the vehicle frame of the approach: +x is the direction of travel, +y is up and
 * +z points to the right hand curb where the pole stands, so the arm reaches toward -z.
 * state: 0 red, 1 green, 2 amber. Only the lamp that is lit is emissive, the other two are dark glass.
 */
const LIT = [M.SIGNAL_RED, M.SIGNAL_GREEN, M.SIGNAL_AMBER];
const LAMP_Y = [5.36, 4.74, 5.05]; // red on top, amber in the middle, green below, indexed by state

export function buildSignalHead(r, state, reach) {
  const iron = M.STEEL_DARK, dark = M.CAR_TRIM, lens = M.GLASS_SLATE;
  r.cyl('y', 0, 0, 0.11, 0.08, 0, 6.05, iron);
  r.cyl('y', 0, 0, 0.2, 0.2, 0, 0.4, iron, { md: 0.2 });
  r.cyl('z', 0, 5.8, 0.07, 0.05, -reach, 0, iron);
  const hz = -reach;
  r.box(-0.17, 4.55, hz - 0.2, 0.17, 5.62, hz + 0.2, dark, { thin: true });               // housing
  r.box(-0.03, 5.62, hz - 0.05, 0.03, 5.8, hz + 0.05, iron, { md: 0.2 });                  // hanger
  for (let s = 0; s < 3; s++) {
    const y = LAMP_Y[s];
    r.box(-0.27, y + 0.14, hz - 0.17, -0.13, y + 0.19, hz + 0.17, dark, { md: 0.08 });     // visor, only where it will not hide the lamp
    r.cyl('x', y, hz, 0.13, 0.13, -0.21, -0.12, s === state ? LIT[s] : lens, { thin: true });
  }
  // a small controller cabinet on the pole
  r.box(-0.14, 2.4, -0.13, 0.14, 3.0, 0.13, dark, { md: 0.4 });
}

/** Arm reach in meters for a road of width w: the head hangs over the middle of the approach lanes. */
export const signalReach = (w) => Math.round((w / 4 + 0.9) * 2) / 2;
