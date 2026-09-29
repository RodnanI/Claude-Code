// Top-down plan of an airfield in its own frame (runway heading to the right), straight from the world code, no GPU.
// Shows what the painter draws (pavement, markings, wear), structure footprints, props and start positions.
// Usage: node tools/plan.mjs out.png airport [key=value ...]     (site keys: airport, fortTalon, hollow)
// Keys: mpp (meters per pixel, default 1), u0 u1 v0 v1 (window in the airfield frame, default the region bounds),
//       cell (paint detail in meters, default = mpp), props=0|1, structs=0|1, spawns=0|1
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePNG } from './png.mjs';
import { createWorld } from '../src/world/index.js';
import { PALETTE_RGB, M } from '../src/voxel/palette.js';
import { SITES } from '../src/world/layout.js';
import { hashString } from '../src/core/util.js';

const [out, siteKey, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((s) => s.split('=')));
const S = SITES[siteKey];
if (!S) throw new Error('unknown site ' + siteKey);
const world = createWorld({});
const region = world.regionsList.find((r) => r.kind === 'airfield' && Math.hypot(r.bounds[0] / 2 + r.bounds[2] / 2 - S.x, r.bounds[1] / 2 + r.bounds[3] / 2 - S.z) < 1500);
const h = (S.heading * Math.PI) / 180, sn = Math.sin(h), cs = Math.cos(h);
const toWorld = (u, v) => [S.x + u * sn + v * cs, S.z - u * cs + v * sn];
const toLocal = (x, z) => [(x - S.x) * sn - (z - S.z) * cs, (x - S.x) * cs + (z - S.z) * sn];
const b = region.bounds;
const corners = [toLocal(b[0], b[1]), toLocal(b[2], b[1]), toLocal(b[0], b[3]), toLocal(b[2], b[3])];
const mpp = +(opt.mpp || 1);
const u0 = +(opt.u0 ?? Math.min(...corners.map((c) => c[0]))), u1 = +(opt.u1 ?? Math.max(...corners.map((c) => c[0])));
const v0 = +(opt.v0 ?? Math.min(...corners.map((c) => c[1]))), v1 = +(opt.v1 ?? Math.max(...corners.map((c) => c[1])));
const W = Math.ceil((u1 - u0) / mpp), H = Math.ceil((v1 - v0) / mpp);
const cell = +(opt.cell || mpp);
const rgb = new Uint8Array(W * H * 3);
const shade = (m, k = 1) => [Math.min(255, PALETTE_RGB[m * 3] * k), Math.min(255, PALETTE_RGB[m * 3 + 1] * k), Math.min(255, PALETTE_RGB[m * 3 + 2] * k)];
const grass = shade(M.GRASS, 0.9);
const t0 = Date.now();
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const [x, z] = toWorld(u0 + (i + 0.5) * mpp, v0 + (j + 0.5) * mpp);
  const m = world.paint(x, z, cell, 0);
  const c = m ? shade(m) : grass;
  const k = (j * W + i) * 3;
  rgb[k] = c[0]; rgb[k + 1] = c[1]; rgb[k + 2] = c[2];
}
const px = (u, v) => [Math.floor((u - u0) / mpp), Math.floor((v - v0) / mpp)];
const setPx = (i, j, c) => { if (i < 0 || j < 0 || i >= W || j >= H) return; const k = (j * W + i) * 3; rgb[k] = c[0]; rgb[k + 1] = c[1]; rgb[k + 2] = c[2]; };
const layout = world.layoutOf(region);
if (opt.structs !== '0') {
  for (const d of layout.structures) {
    const ang = ((d.rot || 0) & 3) * (Math.PI / 2) + (d.yaw || 0), ca = Math.cos(ang), sa = Math.sin(ang);
    const hw = d.w / 2, hd = d.d / 2, R = Math.hypot(hw, hd);
    const [cu, cv] = toLocal(d.x, d.z);
    const hue = hashString(d.kind) % 360;
    const c = [140 + (hue % 90), 120 + ((hue * 7) % 100), 110 + ((hue * 13) % 110)];
    const [ia, ja] = px(cu - R - 2, cv - R - 2), [ib, jb] = px(cu + R + 2, cv + R + 2);
    for (let j = Math.max(0, ja); j <= Math.min(H - 1, jb); j++) for (let i = Math.max(0, ia); i <= Math.min(W - 1, ib); i++) {
      const [x, z] = toWorld(u0 + (i + 0.5) * mpp, v0 + (j + 0.5) * mpp);
      const dx = x - d.x, dz = z - d.z;
      const lx = dx * ca + dz * sa, lz = -dx * sa + dz * ca;
      if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) {
        const edge = Math.abs(lx) > hw - mpp || Math.abs(lz) > hd - mpp;
        setPx(i, j, edge ? [40, 36, 34] : c);
      }
    }
  }
}
if (opt.props !== '0') {
  const PC = { 'runway-light': [255, 250, 200], 'tire-marker': [230, 120, 30], car: [230, 40, 40], bush: [30, 90, 30], oak: [20, 80, 30] };
  for (const p of layout.props) {
    const [u, v] = toLocal(p.x, p.z);
    const [i, j] = px(u, v);
    const c = PC[p.type] || [255, 0, 255];
    setPx(i, j, c);
    if (mpp < 0.8) { setPx(i + 1, j, c); setPx(i, j + 1, c); setPx(i + 1, j + 1, c); }
  }
}
if (opt.spawns !== '0') {
  for (const s of region.spawns) {
    const [u, v] = toLocal(s.x, s.z);
    const [i, j] = px(u, v);
    for (let d = -3; d <= 3; d++) { setPx(i + d, j, [255, 90, 20]); setPx(i, j + d, [255, 90, 20]); }
    const a = ((s.heading - S.heading) * Math.PI) / 180;
    for (let d = 3; d < 12; d++) setPx(Math.round(i + Math.sin(a) * d), Math.round(j - Math.cos(a) * d), [255, 200, 40]);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePNG(W, H, rgb));
console.log('wrote', out, `${W}x${H} px, ${mpp} m/px, ${layout.structures.length} structures, ${layout.props.length} props, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
