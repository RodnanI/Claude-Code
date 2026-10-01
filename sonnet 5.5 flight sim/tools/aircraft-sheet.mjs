// Renders a set of camera views of one aircraft with the aircraft test scene.
// Usage: node tools/aircraft-sheet.mjs <plane> [preset] [query extras] ; writes out/sheet-<plane>-<view>.png
// Env: VIEWS=front34,side,... (names below), FOV, SIZE=WxH, DIST=meters to override the framing distance.
import { loadPlaywright, launch, waitFor } from '../tests/browser/harness.mjs';
import { AIRCRAFT } from '../src/generated/registry.js';
import { AircraftInstance } from '../src/aircraft/instance.js';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const [plane, preset = 'medium', extra = ''] = process.argv.slice(2);
const spec = AIRCRAFT.find((a) => a.id === plane);
if (!spec) { console.log('unknown plane', plane); process.exit(1); }
const ext = new AircraftInstance(spec, { fromRecipe: () => null }).extent();
// the framing distance: the whole aircraft fills most of the frame at a 40 degree field of view
const D = +(process.env.DIST || 0) || Math.max(ext.length, ext.span * 0.9) * 1.25;
const [W, H] = (process.env.SIZE || '1100x620').split('x').map(Number);
const e = spec.cameras.cockpit, L = ext.length;
// az: 0 looks at the nose from the front, 90 from the pilot's right; el in degrees; k scales the distance; t is the body point looked at
const VIEWS = {
  front34: { az: 35, el: 14, k: 1.0 }, rear34: { az: 145, el: 14, k: 1.0 }, side: { az: 90, el: 3, k: 1.05 }, top: { az: 20, el: 78, k: 1.1 },
  front: { az: 0, el: 6, k: 0.9 }, rear: { az: 180, el: 8, k: 0.9 }, under: { az: 40, el: -22, k: 1.0 },
  nose: { az: 28, el: 10, k: 0.38, t: [L * 0.28, 0.3, 0] }, tail: { az: 150, el: 12, k: 0.42, t: [-L * 0.3, 0.8, 0] }, wing: { az: 60, el: 25, k: 0.5, t: [0, 0.2, ext.span * 0.2] },
  gear: { az: 55, el: 4, k: 0.4, t: [0, -0.8, 0] },
  cockpit: { view: 'cockpit' }, cockpitL: { view: 'cockpit', ly: -70 }, cockpitR: { view: 'cockpit', ly: 70 }, cockpitBack: { view: 'cockpit', ly: 160 }, cockpitDown: { view: 'cockpit', lp: -38 }, cockpitUp: { view: 'cockpit', lp: 40 },
  cabin: { view: 'cockpit', ly: 180, eye: [e[0] - 0.9, e[1] - 0.1, 0] }, cabinFwd: { view: 'cockpit', ly: 0, eye: [e[0] - 4.5, e[1] - 0.1, 0] }, cabinL: { view: 'cockpit', ly: -90, lp: -10, eye: [e[0] - 2, e[1] - 0.1, 0.2] },
};
const only = process.env.VIEWS ? process.env.VIEWS.split(',') : ['front34', 'rear34', 'side', 'top', 'cockpit'];
const pw = loadPlaywright();
const browser = await launch(pw);
const p = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const logs = [];
p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
p.on('pageerror', (e) => logs.push('pageerror ' + e.message));
const url = (v) => `file://${resolve('dist/test-aircraft.html')}?plane=${plane}&preset=${preset}&fov=${process.env.FOV || 40}&cfov=${process.env.CFOV || 80}${v && v.q ? '&' + v.q : ''}${extra ? '&' + extra : ''}`;
let first = true;
mkdirSync(resolve('out'), { recursive: true });
for (const name of only) {
  const v = VIEWS[name];
  if (!v) { console.log('no view', name); continue; }
  // the scene reads its parameters once, so each distinct query is its own page load (cheap next to the first world build)
  if (first || v.q) { await p.goto(url(v)); await waitFor(p, () => window.__fh && window.__fh.frames > 3 && window.__fh.nodes.settled, { timeout: 300000, poll: 500 }); first = false; }
  await p.evaluate(([v, D]) => {
    const st = window.__fh.st;
    st.view = v.view || 'external';
    st.ly = v.ly || 0; st.lp = v.lp || 0; st.eye = v.eye || null;
    if (v.az !== undefined) { st.az = v.az; st.el = v.el; st.dist = D * v.k; const t = v.t || [0, 0.4, 0]; st.tx = t[0]; st.ty = t[1]; st.tz = t[2]; }
    window.__fh.resume();
  }, [v, D]);
  await p.evaluate(() => { window.__f0 = window.__fh.frames; });
  await waitFor(p, () => window.__fh.frames > 4 + window.__f0 && window.__fh.nodes.settled, { timeout: 120000, poll: 300 }).catch(() => {});
  await p.evaluate(() => window.__fh.pause());
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: resolve(`out/sheet-${plane}-${name}.png`), timeout: 180000 });
  console.log('wrote', `out/sheet-${plane}-${name}.png`);
}
if (logs.length) console.log(logs.slice(0, 8).join('\n'));
await browser.close();
