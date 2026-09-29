// Several screenshots of the island from named views in ONE browser session (the world only loads once), through the
// free-camera viewer page. Faster than hero-shot for looking at scenery, terrain shading and coast.
// Build the viewer first: node build/build.mjs --entry viewer
// Usage: node tools/tour.mjs <outDir> [preset] [view,view,...|all] [w h]
// Env:   VIEW=6000 (view distance in meters, default from the preset)  SCALE=1 (resolution scale)  HOUR=15.5  COVER=0.4
//        FRAMES=8 (frames to settle after the nodes arrive)  PAGE=dist/test-viewer.html  QUERY='detail=false' (extra settings)
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

export const VIEWS = {
  // name: [x, z, agl, headingDeg, pitch, fovDeg]
  forest: [3200, -3000, 40, 20, -0.14, 65],
  forestclose: [-2000, -1400, 14, 90, -0.06, 70],
  forestair: [-4000, -1800, 140, 250, -0.2, 65],
  meadow: [6400, 2600, 30, 200, -0.08, 65],
  lake: [-9000, -1700, 150, 200, -0.16, 65],
  farmland: [1200, -200, 60, 30, -0.14, 65],
  farmhigh: [2400, 1500, 260, 250, -0.3, 65],
  mountain: [-3600, 4400, 420, 250, -0.1, 65],
  peak: [-6800, 3600, 900, 60, -0.12, 65],
  coast: [13000, 4200, 60, 60, -0.1, 65],
  beach: [13350, 4700, 18, 90, -0.05, 70],
  metropolis: [4300, -6600, 260, 0, -0.16, 65],
  highland: [-6500, 300, 600, 90, -0.2, 65],
  vista: [800, 2500, 1600, 320, -0.16, 65],
  river: [-3600, -3600, 90, 200, -0.18, 65],
  hollow: [-800, 3000, 40, 350, -0.1, 65],
  port: [5600, 7400, 200, 0, -0.2, 65],
};

const [outDir = 'out/tour', preset = 'medium', which = 'forest,mountain,coast', W = '960', H = '540'] = process.argv.slice(2);
const names = which === 'all' ? Object.keys(VIEWS) : which.split(',');
const pw = loadPlaywright();
if (!pw) { console.error('playwright not found'); process.exit(2); }
mkdirSync(resolve(outDir), { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

const q = new URLSearchParams({ preset, hour: process.env.HOUR || '15.5', cover: process.env.COVER || '0.4', x: '0', z: '0', y: '500' });
if (process.env.VIEW) q.set('viewDistance', process.env.VIEW);
if (process.env.SCALE) q.set('resolutionScale', process.env.SCALE);
if (process.env.WORKERS) q.set('w', process.env.WORKERS);
for (const kv of (process.env.QUERY || '').split('&').filter(Boolean)) { const [k, v] = kv.split('='); q.set(k, v); }

const browser = await launch(pw);
const page = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve(process.env.PAGE || 'dist/test-viewer.html') + '?' + q.toString());
await waitFor(page, () => window.__fh && window.__fh.frames > 1, { timeout: 300000, poll: 300 });
log('page up');
for (const name of names) {
  const v = VIEWS[name];
  if (!v) { log('unknown view', name); continue; }
  const [x, z, agl, heading, pitch, fov] = v;
  await page.evaluate(([x, z, agl, heading, pitch, fov]) => {
    const f = window.__fh;
    f.resume();
    const y = f.world.heightAt(x, z, 0) + agl;
    f.set(x, y, z, (heading * Math.PI) / 180, pitch);
    f.fovDeg = fov;
  }, [x, z, agl, heading, pitch, fov]);
  // give the selection a couple of frames to react to the new pose before testing for "settled"
  const fa = await page.evaluate(() => window.__fh.frames);
  await waitFor(page, (n) => window.__fh.frames >= n + 3, { arg: fa, timeout: 300000, poll: 200 });
  await waitFor(page, () => window.__fh.nodes.settled, { timeout: 900000, poll: 500 }).catch(() => errs.push(name + ': never settled'));
  const fb = await page.evaluate(() => window.__fh.frames);
  await waitFor(page, (n) => window.__fh.frames >= n, { arg: fb + +(process.env.FRAMES || 8), timeout: 600000, poll: 300 });
  await page.evaluate(() => window.__fh.pause());
  await new Promise((r) => setTimeout(r, 400));
  const file = `${resolve(outDir)}/${name}.png`;
  await page.screenshot({ path: file, timeout: 300000 });
  const st = await page.evaluate(() => { const s = window.__fh.stats(); return { tris: s.tris, draws: s.draws, nodes: s.nodesDrawn }; });
  log(name, JSON.stringify(st));
}
await browser.close();
if (errs.length) console.log('problems:', errs.slice(0, 8));
