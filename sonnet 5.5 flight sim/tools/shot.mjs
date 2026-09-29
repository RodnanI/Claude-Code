// Headless screenshot of a built test page.
// Usage: node tools/shot.mjs <page.html> "<query>" <out.png> [width height settleMs]
// Example: node tools/shot.mjs dist/test-aircraft.html "plane=shrike&az=40" out/shrike.png 1280 720
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [page, query = '', out = 'out/shot.png', w = '1280', h = '720', extra = '1500'] = process.argv.slice(2);
const pw = loadPlaywright();
if (!pw) { console.error('playwright not found'); process.exit(2); }
const browser = await launch(pw);
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
const p = await ctx.newPage();
const logs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await p.goto(`file://${resolve(page)}?${query}`);
try {
  await waitFor(p, () => window.__fh && window.__fh.frames > 3 && (window.__fh.nodes?.settled ?? window.__fh.stats?.().settled), { timeout: 240000, poll: 500 });
} catch (e) { logs.push('[timeout] terrain never settled: ' + e.message); }
await new Promise((r) => setTimeout(r, +extra));
const stats = await p.evaluate(() => JSON.stringify(window.__fh.stats ? window.__fh.stats() : {}));
await p.evaluate(() => window.__fh.pause && window.__fh.pause());
await new Promise((r) => setTimeout(r, 800));
mkdirSync(dirname(resolve(out)), { recursive: true });
await p.screenshot({ path: resolve(out), timeout: 180000 });
console.log(out, stats);
for (const l of logs.slice(0, 12)) console.log(l);
await browser.close();
