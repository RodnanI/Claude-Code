// Top-down preview of the island. Usage: node tools/map-preview.mjs [out.png] [size] [halfExtentMeters]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePNG } from './png.mjs';
import { createWorld } from '../src/world/index.js';
import { PALETTE_RGB } from '../src/voxel/palette.js';
import { SITES } from '../src/world/layout.js';

const out = process.argv[2] || 'out/map.png';
const size = +process.argv[3] || 900;
const half = +process.argv[4] || 20000;
const cx = +process.argv[5] || 0, cz = +process.argv[6] || 0;
const world = createWorld({});
const rgb = new Uint8Array(size * size * 3);
const step = (half * 2) / size;
const col = { mat: 0 };
const H = new Float32Array(size * size);
const S = Array.from({ length: size * size }, () => null);
const cell = Math.max(2, step * 0.7);
for (let j = 0; j < size; j++) {
  for (let i = 0; i < size; i++) {
    const x = cx - half + (i + 0.5) * step, z = cz - half + (j + 0.5) * step;
    const s = {};
    H[j * size + i] = world.terrain.sample(x, z, cell, s);
    S[j * size + i] = s;
  }
}
for (let j = 0; j < size; j++) {
  for (let i = 0; i < size; i++) {
    const x = cx - half + (i + 0.5) * step, z = cz - half + (j + 0.5) * step;
    const h = H[j * size + i];
    const hx = H[j * size + Math.min(size - 1, i + 1)] - H[j * size + Math.max(0, i - 1)];
    const hz = H[Math.min(size - 1, j + 1) * size + i] - H[Math.max(0, j - 1) * size + i];
    const slope = Math.hypot(hx, hz) / (2 * step);
    const mat = world.surface.at(x, z, h, slope, cell, S[j * size + i]);
    const shade = Math.max(0.55, Math.min(1.25, 1 - (hx * 0.7 + hz * 0.7) / (2 * step) * 1.6));
    const k = (j * size + i) * 3;
    rgb[k] = Math.min(255, PALETTE_RGB[mat * 3] * shade);
    rgb[k + 1] = Math.min(255, PALETTE_RGB[mat * 3 + 1] * shade);
    rgb[k + 2] = Math.min(255, PALETTE_RGB[mat * 3 + 2] * shade);
  }
}
// site markers
for (const s of Object.values(SITES)) {
  const px = Math.round((s.x - (cx - half)) / step), pz = Math.round((s.z - (cz - half)) / step);
  for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
    const i = px + di, j = pz + dj;
    if (i < 0 || j < 0 || i >= size || j >= size) continue;
    const edge = Math.abs(di) === 3 || Math.abs(dj) === 3;
    const k = (j * size + i) * 3;
    rgb[k] = edge ? 20 : 255; rgb[k + 1] = edge ? 20 : 90; rgb[k + 2] = edge ? 20 : 30;
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePNG(size, size, rgb));
console.log('wrote', out, `${size}x${size}`, 'span', half * 2, 'm');
