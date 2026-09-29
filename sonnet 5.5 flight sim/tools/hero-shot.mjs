// Places the player aircraft anywhere and shoots it from a chosen camera. For visual checks of places and light.
// Setting overrides: OVR='{"shadows":2}' node tools/hero-shot.mjs ...
// Usage: node tools/hero-shot.mjs out.png preset plane hour x z agl heading fov [camDist camHeight camYawOffsetDeg] [w h]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [out, preset = 'high', plane = 'skylark', hour = '10.5', x = '4300', z = '-8000', agl = '300', heading = '90', fov = '60', dist = '18', camH = '4', yawOff = '20', w = '1280', h = '720'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS[preset], preset, timeOfDay: +hour, traffic: 100, cloudCover: 0.45, ...JSON.parse(process.env.OVR || '{}') });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
await page.evaluate(([plane, x, z, agl, heading, fov, dist, camH, yawOff]) => {
  const g = window.__fh.game;
  g.startFlight({ planeId: plane, startId: 'airport-09R', airborne: true });
  const y = g.ground.h(+x, +z) + +agl;
  g.ent.placeAirborne({ x: +x, y, z: +z, headingDeg: +heading, ias: g.cruiseFor(g.ent.spec), gear: g.ent.spec.gear.retractable ? 0 : 1 });
  g.ent.model.input.throttle = 0; g.pause();
  const hd = (+heading + +yawOff) * Math.PI / 180;
  // camera behind and beside the aircraft
  const fx = Math.sin(hd), fz = -Math.cos(hd);
  const px = +x, pz = +z;
  g.camOverride = { x: px - fx * +dist, y: y + +camH, z: pz - fz * +dist, fx: fx * +dist, fy: -+camH * 0.8, fz: fz * +dist, fov: +fov };
  g.hud.visible = false;
}, [plane, x, z, agl, heading, fov, dist, camH, yawOff]);
await waitFor(page, () => window.__fh.nodes.settled, { timeout: 500000, poll: 800 }).catch(() => errs.push('terrain never settled'));
// let auto exposure and temporal history converge: a number of frames, not a duration, so slow software rendering still settles
const f0 = await page.evaluate(() => window.__fh.frames);
await waitFor(page, (n) => window.__fh.frames >= n, { arg: f0 + +(process.env.FRAMES || 40), timeout: 400000, poll: 500 }).catch(() => errs.push('frame wait timed out'));
await page.evaluate(() => window.__fh.pause());
const expo = await page.evaluate(() => { const r = window.__fh.game.renderer; return r.post && r.post.readExposure ? r.post.readExposure().exposure : null; });
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => { for (const el of document.querySelectorAll('.screen, .hint')) el.style.display = 'none'; });
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 400000 });
console.log(out, 'exposure', expo && expo.toFixed(3), errs.length ? errs.slice(0, 4) : 'ok');
await browser.close();
