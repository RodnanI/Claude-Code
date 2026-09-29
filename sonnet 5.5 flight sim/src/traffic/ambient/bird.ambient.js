import { defineAmbient } from '../ambient-def.js';
import { M } from '../../voxel/palette.js';
import { Rng } from '../../core/rng.js';

/* Flocks of birds, each flock one mesh: gulls along the coasts, crows over the forests, geese in long vs high over the island.
   Local +x is the direction of flight. The two low bits of the variant are the wing beat (the system steps them a few times a
   second) and the rest picks one of four arrangements, so a flock is never one rigid pattern. Every bird starts its beat at a
   different point, which reads as flapping rather than as a wave. */

const TIP = [0.44, 0.14, -0.32, -0.06];   // height of the wing tip above the shoulder by beat, at bird scale 1

/** One bird at (x, y, z), scale s, wing beat ph. body, wing and tip are materials. */
function bird(b, x, y, z, ph, s, body, wing, tip, head = body) {
  b.ell(x, y, z, 0.32 * s, 0.1 * s, 0.1 * s, body);
  b.ell(x + 0.33 * s, y + 0.05 * s, z, 0.09 * s, 0.075 * s, 0.075 * s, head, { md: 0.5 * s });
  b.box(x - 0.55 * s, y - 0.015 * s, z - 0.06 * s, x - 0.28 * s, y + 0.02 * s, z + 0.06 * s, wing, { md: 0.4 * s });
  for (const side of [-1, 1]) {
    // the arm of the wing, then the primaries carrying the beat farther out
    b.wing([x + 0.12 * s, y + 0.06 * s, z + side * 0.05 * s], 0.5 * s, 0.34 * s, 0.22 * s, 0.05 * s, TIP[ph] * 0.5 * s, 0.14, 0.1, side, wing, { md: 2 * s });
    b.wing([x + 0.16 * s, y + 0.06 * s + TIP[ph] * 0.5 * s, z + side * (0.05 + 0.5) * s], 0.44 * s, 0.22 * s, 0.09 * s, 0.1 * s, TIP[ph] * 0.5 * s, 0.12, 0.08, side, tip, { md: 2 * s });
  }
}

const GULL = [M.AC_WHITE, M.AC_GRAY_LIGHT, M.AC_BLACK], CROW = [M.AC_BLACK, M.AC_BLACK, M.AC_BLACK], GOOSE = [M.AC_GRAY, M.AC_GRAY_LIGHT, M.AC_BLACK];

/** A loose cluster: birds scattered in a disc with a little height between them. */
function cluster(b, v, sizes, radius, scale, mats) {
  const phase = v & 3, n = sizes[v >> 2], rng = new Rng(9100 + (v >> 2) * 17);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, 6.283), r = radius * Math.sqrt(rng.next());
    bird(b, Math.cos(a) * r * 1.3, rng.range(-radius * 0.18, radius * 0.18), Math.sin(a) * r, (phase + i + (i >> 2)) & 3, scale * rng.range(0.88, 1.12), mats[0], mats[1], mats[2]);
  }
}

const gulls = defineAmbient({
  id: 'gulls', kind: 'bird', name: 'Gulls', length: 24, variants: 16, maxDist: 4000, flap: 5, cells: [0.05, 0.1, 0.2, 0.4, 0.8, 1.6],
  build(b, v) { cluster(b, v, [6, 8, 10, 12], 8, 1.1, GULL); },
});

const crows = defineAmbient({
  id: 'crows', kind: 'bird', name: 'Crows', length: 22, variants: 16, maxDist: 3000, flap: 6, cells: [0.05, 0.1, 0.2, 0.4, 0.8, 1.6],
  build(b, v) { cluster(b, v, [9, 12, 15, 18], 9, 1.0, CROW); },
});

const geese = defineAmbient({
  id: 'geese', kind: 'bird', name: 'Geese', length: 40, variants: 16, maxDist: 6000, flap: 3, cells: [0.1, 0.2, 0.4, 0.8, 1.6, 3.2],
  build(b, v) {
    const phase = v & 3, n = [5, 7, 9, 11][v >> 2];
    for (let i = 0; i < n; i++) {
      const rank = (i + 1) >> 1, side = i % 2 ? 1 : -1;
      const x = i === 0 ? 0 : -rank * 3.6, z = i === 0 ? 0 : side * rank * 3, y = i === 0 ? 0 : -rank * 0.12;
      bird(b, x, y, z, (phase + i) & 3, 2.4, GOOSE[0], GOOSE[1], GOOSE[2], M.AC_BLACK);
    }
  },
});

export default [gulls, crows, geese];
