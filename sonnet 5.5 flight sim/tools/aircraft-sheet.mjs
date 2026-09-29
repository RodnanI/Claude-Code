// Renders a set of camera views of one aircraft with the aircraft test scene.
// Usage: node tools/aircraft-sheet.mjs <plane> [preset] [query extras] ; writes out/sheet-<plane>-<view>.png
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const [plane, preset = 'medium', extra = ''] = process.argv.slice(2);
const VIEWS = {
  front34: { az: 35, el: 12, dist: 1.0 }, rear34: { az: 150, el: 12, dist: 1.0 }, side: { az: 90, el: 4, dist: 1.1 }, top: { az: 20, el: 68, dist: 1.1 }, cockpit: { view: 'cockpit' },
};
const D = { skylark: 14, shrike: 26, scrapper: 12 }[plane] || 16;
const only = process.env.VIEWS ? process.env.VIEWS.split(',') : Object.keys(VIEWS);
const pw = loadPlaywright();
const browser = await launch(pw);
const p = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const logs = [];
p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
p.on('pageerror', (e) => logs.push('pageerror ' + e.message));
await p.goto(`file://${resolve('dist/test-aircraft.html')}?plane=${plane}&preset=${preset}&fov=${process.env.FOV || 62}${extra ? '&' + extra : ''}`);
await waitFor(p, () => window.__fh && window.__fh.frames > 3 && window.__fh.nodes.settled, { timeout: 300000, poll: 500 });
mkdirSync(resolve('out'), { recursive: true });
for (const name of only) {
  const v = VIEWS[name];
  await p.evaluate(([v, D]) => { const st = window.__fh.st; st.view = v.view || 'external'; if (v.az !== undefined) { st.az = v.az; st.el = v.el; st.dist = D * v.dist; } window.__fh.resume(); }, [v, D]);
  await p.evaluate(() => { window.__f0 = window.__fh.frames; });
  await waitFor(p, () => window.__fh.frames > 4 + window.__f0 && window.__fh.nodes.settled, { timeout: 120000, poll: 300 }).catch(() => {});
  await p.evaluate(() => window.__fh.pause());
  await new Promise((r) => setTimeout(r, 600));
  await p.screenshot({ path: resolve(`out/sheet-${plane}-${name}.png`), timeout: 180000 });
  console.log('wrote', `out/sheet-${plane}-${name}.png`);
}
if (logs.length) console.log(logs.slice(0, 8).join('\n'));
await browser.close();
