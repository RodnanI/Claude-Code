// Software isometric render of one kit or scenery model, no GPU. Fast enough to iterate on a building in seconds.
// Usage: node tools/iso.mjs out.png kit:terminal '{"w":170,"d":36,"h":13}' [key=value ...]
//        node tools/iso.mjs out.png "scenery:gse-tug@0.125,scenery:gse-belt@0.125" {} cols=2     (several models in one sheet)
//        node tools/iso.mjs out.png 'kit:hangar@0.5|{"w":36,"d":52};kit:tower@0.25|{"h":40}' {} cols=2   (';' separates items, '|' adds parameters)
//        node tools/iso.mjs out.png scenery:parked-airliner '{"variant":0}' cell=0.25
// Keys: cell (voxel size in meters, default 0.5), az (degrees, default 35), el (default 28), px (pixels per meter, default: fit),
//       views (1 or 4: four views in a sheet), night=1 (light emissive voxels only), w h (image size, default 1100x760)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePNG } from './png.mjs';
import { createWorld } from '../src/world/index.js';
import { Recipe, rasterize } from '../src/voxel/recipe.js';
import { M, PALETTE_RGB, PALETTE_FLAGS, FL } from '../src/voxel/palette.js';
import { Rng } from '../src/core/rng.js';
import { hashString } from '../src/core/util.js';

const [out, what, json = '{}', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((s) => s.split('=')));
const params = JSON.parse(json);
const world = createWorld({});
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const night = opt.night === '1';

/** Rasterize one kit or scenery model into its surface voxels. what is kind:id with an optional @cell suffix. */
function build(spec, p) {
  if (spec.includes('|')) { const at = spec.indexOf('|'); p = { ...p, ...JSON.parse(spec.slice(at + 1)) }; spec = spec.slice(0, at); }
  const [kindId, cellStr] = spec.split('@');
  const [family, id] = kindId.split(':');
  const cell = +(cellStr || opt.cell || 0.5);
  const recipe = new Recipe();
  let conservative = cell >= 3;
  if (family === 'kit') {
    const kit = world.kits.get(id);
    if (!kit) throw new Error('unknown kit ' + id);
    const d = { kind: id, x: 0, z: 0, y: 0, w: 30, d: 30, h: 12, rot: 0, yaw: 0, seed: 1, ...p };
    d.id = `iso#${id}`;
    kit.build(d, recipe, new Rng(world.seed ^ hashString(d.id) ^ (d.seed | 0)), { M, world });
    conservative = conservative || !!kit.conservative;
  } else {
    const def = world.scenery.get(id);
    if (!def) throw new Error('unknown scenery ' + id);
    const v = p.variant || 0;
    if (!def.build) throw new Error('scenery with expand() cannot be previewed');
    def.build(recipe, v, new Rng(hashString(id) ^ (v * 7919)));
    conservative = conservative || !!def.rules?.conservative;
  }
  const r = rasterize(recipe, { cell, anchor: [0, 0, 0], rot: 0, yaw: 0, conservative });
  if (!r) throw new Error('empty recipe ' + spec);
  const { vol } = r;
  const solid = (x, y, z) => vol.get(x, y, z) !== 0;
  const voxels = [];
  for (let y = 0; y < vol.ny; y++) for (let z = 0; z < vol.nz; z++) for (let x = 0; x < vol.nx; x++) {
    const m = vol.get(x, y, z);
    if (!m) continue;
    const f = (solid(x + 1, y, z) ? 0 : 1) | (solid(x - 1, y, z) ? 0 : 2) | (solid(x, y + 1, z) ? 0 : 4) | (solid(x, y - 1, z) ? 0 : 8) | (solid(x, y, z + 1) ? 0 : 16) | (solid(x, y, z - 1) ? 0 : 32);
    if (f) voxels.push([x, y, z, m, f]);
  }
  return { voxels, cell, ext: [vol.nx * cell, vol.ny * cell, vol.nz * cell], dims: [vol.nx, vol.ny, vol.nz] };
}

const W = +(opt.w || 1100), H = +(opt.h || 760);
const rgb = new Uint8Array(W * H * 3);

function render(model, azDeg, elDeg, ox, oy, vw, vh, pxOpt) {
  const { voxels, cell, ext } = model;
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  const view = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  const right = [Math.cos(az), 0, -Math.sin(az)];
  const up = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];
  // fit the projected box of the whole volume into the view
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const ix of [0, ext[0]]) for (const iy of [0, ext[1]]) for (const iz of [0, ext[2]]) {
    const p = [ix - ext[0] / 2, iy - ext[1] / 2, iz - ext[2] / 2];
    const sx = p[0] * right[0] + p[2] * right[2], sy = -(p[0] * up[0] + p[1] * up[1] + p[2] * up[2]);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const px = pxOpt || Math.min((vw * 0.92) / (x1 - x0), (vh * 0.9) / (y1 - y0));
  const mx = vw / 2 - ((x0 + x1) / 2) * px, my = vh / 2 - ((y0 + y1) / 2) * px;
  const cy = ext[1] / 2, cx = ext[0] / 2, cz = ext[2] / 2;
  const light = [0.45, 0.8, 0.35], ll = Math.hypot(...light);
  const zbuf = new Float32Array(vw * vh).fill(-1e9);
  const col = new Uint8Array(vw * vh * 3);
  for (let i = 0; i < vw * vh; i++) { col[i * 3] = 176; col[i * 3 + 1] = 190; col[i * 3 + 2] = 200; }
  const s = Math.max(1, Math.ceil(cell * px * 1.25));
  const put = (sx, sy, depth, c) => {
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const X = Math.round(sx) + dx - (s >> 1), Y = Math.round(sy) + dy - (s >> 1);
      if (X < 0 || Y < 0 || X >= vw || Y >= vh) continue;
      const i = Y * vw + X;
      if (depth > zbuf[i]) { zbuf[i] = depth; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
    }
  };
  // ground plane at y = 0 as a coarse grid of tiles
  const g = 5;
  for (let gx = -ext[0]; gx < ext[0] * 2; gx += g) for (let gz = -ext[2]; gz < ext[2] * 2; gz += g) {
    const p = [gx + g / 2 - cx, -cy, gz + g / 2 - cz];
    const sx = mx + (p[0] * right[0] + p[2] * right[2]) * px, sy = my - (p[0] * up[0] + p[1] * up[1] + p[2] * up[2]) * px;
    const dep = p[0] * view[0] + p[1] * view[1] + p[2] * view[2] - 1e4;
    const t = ((Math.floor(gx / g) + Math.floor(gz / g)) & 1) ? 128 : 138;
    const ss = Math.ceil(g * px * 1.3);
    for (let dy = -ss; dy <= ss; dy++) for (let dx = -ss; dx <= ss; dx++) {
      const X = Math.round(sx) + dx, Y = Math.round(sy) + dy;
      if (X < 0 || Y < 0 || X >= vw || Y >= vh) continue;
      const i = Y * vw + X;
      if (Math.abs(dx) + Math.abs(dy) * 1.6 > ss * 1.2) continue;
      if (dep > zbuf[i]) { zbuf[i] = dep; col[i * 3] = t; col[i * 3 + 1] = t + 8; col[i * 3 + 2] = t - 14; }
    }
  }
  for (const [x, y, z, m, f] of voxels) {
    let best = -2, n = null;
    for (let k = 0; k < 6; k++) {
      if (!(f & (1 << k))) continue;
      const d = NORMALS[k][0] * view[0] + NORMALS[k][1] * view[1] + NORMALS[k][2] * view[2];
      if (d > best) { best = d; n = NORMALS[k]; }
    }
    if (best <= -0.05) continue;
    const lam = Math.max(0, (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / ll);
    const emi = (PALETTE_FLAGS[m] & FL.EMISSIVE) !== 0;
    const k = night ? (emi ? 1.25 : 0.22) : emi ? 1.1 : 0.42 + 0.62 * lam;
    const c = [Math.min(255, PALETTE_RGB[m * 3] * k), Math.min(255, PALETTE_RGB[m * 3 + 1] * k), Math.min(255, PALETTE_RGB[m * 3 + 2] * k)];
    const p = [(x + 0.5) * cell - cx, (y + 0.5) * cell - cy, (z + 0.5) * cell - cz];
    const sx = mx + (p[0] * right[0] + p[2] * right[2]) * px, sy = my - (p[0] * up[0] + p[1] * up[1] + p[2] * up[2]) * px;
    put(sx, sy, p[0] * view[0] + p[1] * view[1] + p[2] * view[2], c);
  }
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    const a = (y * vw + x) * 3, b = ((oy + y) * W + ox + x) * 3;
    rgb[b] = col[a]; rgb[b + 1] = col[a + 1]; rgb[b + 2] = col[a + 2];
  }
}

const az0 = +(opt.az || 35), el = +(opt.el || 28);
const pxFixed = opt.px ? +opt.px : 0;
let note;
if (what.includes(';') || opt.sheet === '1' || (what.includes(',') && !what.includes('|'))) {
  // several models in a grid, each fitted to its own tile; parameters come from name={json} pairs after the list is split
  const items = what.split(what.includes(';') ? ';' : ',');
  const cols = +(opt.cols || Math.ceil(Math.sqrt(items.length))), rows = Math.ceil(items.length / cols);
  const vw = Math.floor(W / cols), vh = Math.floor(H / rows);
  items.forEach((it, i) => render(build(it, {}), az0, el, (i % cols) * vw, Math.floor(i / cols) * vh, vw, vh, pxFixed));
  note = `${items.length} models`;
} else {
  const model = build(what, params);
  if ((opt.views || '1') === '4') {
    const vw = W / 2, vh = H / 2;
    [0, 90, 180, 270].forEach((a, i) => render(model, az0 + a, el, (i % 2) * vw, Math.floor(i / 2) * vh, vw, vh, pxFixed));
  } else render(model, az0, el, 0, 0, W, H, pxFixed);
  note = `${model.voxels.length} surface voxels, ${model.dims.join('x')} at ${model.cell} m`;
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePNG(W, H, rgb));
console.log('wrote', out, note);
