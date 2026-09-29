// Opens the in-game island map on a flight and saves a screenshot of it.
// Usage: node tools/map-shot.mjs out.png [w h]
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { PRESETS } from '../src/settings/presets.js';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [out, w = '1280', h = '900'] = process.argv.slice(2);
const pw = loadPlaywright();
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
await ctx.addInitScript((values) => { localStorage.setItem('flyhigh.settings.v1', JSON.stringify({ v: 1, values })); }, { ...PRESETS.potato, preset: 'potato' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/fly-high.html'));
await waitFor(page, () => !!(window.__fh && window.__fh.app), { timeout: 400000, poll: 500 });
await page.evaluate(() => { const g = window.__fh.game; g.startFlight({ planeId: 'skylark', startId: 'airport-09R', airborne: true }); g.pause(); });
await page.click('#screen-pause .btn:has-text("Island map")');
await waitFor(page, () => !!document.querySelector('.map-wrap canvas'), { timeout: 10000 });
await new Promise((r) => setTimeout(r, +(process.env.WAIT || 20000)));
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 100000 });
console.log(out, errs.length ? errs : 'ok');
await browser.close();
