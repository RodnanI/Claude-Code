// CPU-side frame cost of the game. Software WebGL makes the GPU numbers meaningless, but the JavaScript time of a frame
// (node selection, uploads, draw submission, traffic) is real, so this is a fair A/B between two builds.
// Usage: node tools/bench.mjs [file.html] [preset] [x z agl heading] [frames] [w h]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve } from 'node:path';

const [file = 'dist/fly-high.html', preset = 'high', x = '4300', z = '-7300', agl = '250', heading = '0', frames = '60', w = '960', h = '540'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS[preset], preset, timeOfDay: 15.5, traffic: 100, cloudCover: 0.45, ...JSON.parse(process.env.OVR || '{}') });
const page = await ctx.newPage();
await page.goto('file://' + resolve(file));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
await page.evaluate(([x, z, agl, heading]) => {
  const g = window.__fh.game;
  g.startFlight({ planeId: 'skylark', startId: 'airport-09R', airborne: true });
  const y = g.ground.h(+x, +z) + +agl;
  g.ent.placeAirborne({ x: +x, y, z: +z, headingDeg: +heading, ias: g.cruiseFor(g.ent.spec), gear: 1 });
  g.ent.model.input.throttle = 0; g.pause(); g.hud.visible = false;
}, [x, z, agl, heading]);
await waitFor(page, () => window.__fh.nodes.settled, { timeout: 500000, poll: 800 });
// let the frame statistics fill with settled frames only
const f0 = await page.evaluate(() => window.__fh.frames);
await waitFor(page, (n) => window.__fh.frames >= n, { arg: f0 + +frames, timeout: 900000, poll: 500 });
const r = await page.evaluate(() => {
  const g = window.__fh.game, s = g.getStats();
  return { cpuMs: +g.cpuMs.avg.toFixed(2), frameMs: +g.frameMs.avg.toFixed(0), draws: s.draws, tris: s.tris, nodes: s.nodesDrawn, gpuMB: +(s.gpuMB || 0).toFixed(1), buildMs: +(s.buildMs || 0).toFixed(1) };
});
console.log(file, preset, JSON.stringify(r));
await browser.close();
