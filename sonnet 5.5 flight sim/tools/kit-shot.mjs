// Screenshot of buildings on a flat pad, with the full renderer. Build the page first: node build/build.mjs --entry kits
// Usage: node tools/kit-shot.mjs out.png '[["skyscraper",{"w":44,"d":44,"h":260,"seed":1}]]' [key=value ...]
// Keys: preset hour cover az el dist tx ty tz fov cols gap w h (window size)
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const [out, items, ...rest] = process.argv.slice(2);
const opts = Object.fromEntries(rest.map((s) => s.split('=')));
const W = +(opts.w || 1280), H = +(opts.h || 720);
const q = new URLSearchParams({ items, ...opts });
const pw = loadPlaywright();
const browser = await launch(pw);
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 400)); });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await page.goto('file://' + resolve('dist/test-kits.html') + '?' + q.toString());
await waitFor(page, () => window.__fh && window.__fh.frames > 3 && window.__fh.nodes.settled, { timeout: 300000, poll: 400 }).catch(() => errs.push('never settled'));
const f0 = await page.evaluate(() => window.__fh.frames);
await waitFor(page, (n) => window.__fh.frames >= n, { arg: f0 + +(opts.frames || 24), timeout: 300000, poll: 400 }).catch(() => errs.push('frame wait timed out'));
await page.evaluate(() => window.__fh.pause());
await new Promise((r) => setTimeout(r, 600));
mkdirSync(dirname(resolve(out)), { recursive: true });
await page.screenshot({ path: resolve(out), timeout: 300000 });
const st = await page.evaluate(() => { const s = window.__fh.stats(); return { tris: s.tris, draws: s.draws, nodes: s.nodesDrawn, buildMs: +(s.avgBuildMs || 0).toFixed(1) }; });
console.log(out, JSON.stringify(st), errs.length ? errs.slice(0, 6) : 'ok');
await browser.close();
