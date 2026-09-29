// Screenshot of the Skyline run: the aircraft is placed short of a gate, facing it, with the HUD on.
// Usage: node tools/course-shot.mjs out.png [preset hour gate metersBefore camDist camHeight w h]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [out, preset = 'medium', hour = '16', gate = '0', before = '700', dist = '26', camH = '6', w = '1280', h = '720'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS[preset], preset, timeOfDay: +hour, traffic: 60, cloudCover: 0.4, challenge: 'skyline', ...JSON.parse(process.env.OVR || '{}') });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
await page.evaluate(() => { window.__fh.game.startFlight({ planeId: 'skylark', startId: 'airport-09R', airborne: true }); });
await waitFor(page, () => !!(window.__fh.game.course && window.__fh.game.course.gates.length), { timeout: 60000, poll: 300 });
const info = await page.evaluate(([gate, before, dist, camH]) => {
  const g = window.__fh.game, c = g.course, G = c.gates[+gate];
  const x = G.x - G.nx * +before, z = G.z - G.nz * +before, y = G.y - 30;
  const headingDeg = (Math.atan2(G.nx, -G.nz) * 180) / Math.PI;
  g.ent.placeAirborne({ x, y, z, headingDeg, ias: g.cruiseFor(g.ent.spec), gear: 1 });
  g.ent.model.input.throttle = 0; g.pause(); c.reset();
  const fx = Math.sin((headingDeg * Math.PI) / 180), fz = -Math.cos((headingDeg * Math.PI) / 180);
  g.camOverride = { x: x - fx * +dist, y: y + +camH, z: z - fz * +dist, fx: fx * +dist, fy: -+camH * 0.6, fz: fz * +dist, fov: 62 };
  return { gates: c.gates.length, x: x | 0, y: y | 0, z: z | 0, headingDeg: headingDeg | 0 };
}, [gate, before, dist, camH]);
await waitFor(page, () => window.__fh.nodes.settled, { timeout: 500000, poll: 800 }).catch(() => errs.push('terrain never settled'));
const f0 = await page.evaluate(() => window.__fh.frames);
await waitFor(page, (n) => window.__fh.frames >= n, { arg: f0 + +(process.env.FRAMES || 20), timeout: 400000, poll: 500 }).catch(() => errs.push('frame wait timed out'));
await page.evaluate(() => window.__fh.pause());
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => { for (const el of document.querySelectorAll('.screen, .hint')) el.style.display = 'none'; });
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 400000 });
console.log(out, JSON.stringify(info), errs.length ? errs.slice(0, 4) : 'ok');
await browser.close();
