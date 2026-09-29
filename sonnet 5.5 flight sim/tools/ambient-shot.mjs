// Screenshot of an ambient actor (ship, boat or airliner) from a chosen camera offset.
// Usage: node tools/ambient-shot.mjs out.png actorId [preset hour distance elevDeg azDeg clock index] [w h]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [out, id = 'cargo-ship', preset = 'medium', hour = '14', dist = '260', el = '14', az = '40', clock = '0', index = '0', w = '1280', h = '720'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS[preset], preset, timeOfDay: +hour, traffic: 60, cloudCover: 0.35, ...JSON.parse(process.env.OVR || '{}') });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
const info = await page.evaluate(([id, dist, el, az, clock, index]) => {
  const g = window.__fh.game;
  g.startFlight({ planeId: 'skylark', startId: 'airport-09R', airborne: true });
  g.ent.model.input.throttle = 0; g.pause(); g.hud.visible = false;
  g.ambient.time = +clock;
  const list = g.ambient.actors.filter((a) => a.def.id === id);
  const a = list[+index % list.length];
  const o = {};
  g.ambient.pose(a, o);
  const A = (+az * Math.PI) / 180, E = (+el * Math.PI) / 180;
  const cx = o.x + Math.cos(o.yaw + A) * Math.cos(E) * +dist, cz = o.z - Math.sin(o.yaw + A) * Math.cos(E) * +dist, cy = o.y + Math.sin(E) * +dist + 2;
  g.camOverride = { x: cx, y: cy, z: cz, fx: o.x - cx, fy: o.y + 6 - cy, fz: o.z - cz, fov: 50 };
  g.ent.placeAirborne({ x: cx, y: cy + 400, z: cz, headingDeg: 0, ias: g.cruiseFor(g.ent.spec), gear: 1 });
  return { count: list.length, pos: [o.x | 0, o.y | 0, o.z | 0] };
}, [id, dist, el, az, clock, index]);
await waitFor(page, () => window.__fh.nodes.settled, { timeout: 500000, poll: 800 }).catch(() => errs.push('never settled'));
const f0 = await page.evaluate(() => window.__fh.frames);
await waitFor(page, (n) => window.__fh.frames >= n, { arg: f0 + +(process.env.FRAMES || 16), timeout: 400000, poll: 500 }).catch(() => errs.push('frame wait timed out'));
await page.evaluate(() => window.__fh.pause());
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => { for (const el of document.querySelectorAll('.screen, .hint')) el.style.display = 'none'; });
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 400000 });
console.log(out, JSON.stringify(info), errs.length ? errs.slice(0, 4) : 'ok');
await browser.close();
