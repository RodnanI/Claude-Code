import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIRCRAFT, REGIONS, KITS, SCENERY, VEHICLES } from '../../src/generated/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (dir, out = []) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };

test('the registry lists every content file by suffix', () => {
  const count = (dir, suffix) => walk(join(root, 'src', dir)).filter((f) => f.endsWith(suffix)).length;
  assert.equal(count('aircraft/planes', '.plane.js'), new Set(AIRCRAFT.map((a) => a.id)).size);
  assert.ok(REGIONS.length >= count('world/regions', '.region.js'), 'a region file may export several regions, never fewer than one');
  assert.equal(count('world/kits', '.kit.js') > 0, true);
  assert.ok(KITS.length >= count('world/kits', '.kit.js'));
  assert.ok(SCENERY.length >= count('world/scenery', '.scenery.js'));
  assert.ok(VEHICLES.length >= count('traffic/vehicles', '.vehicle.js'));
});

test('the game builds into one self-contained HTML file', () => {
  execFileSync(process.execPath, [join(root, 'build/build.mjs'), '--entry', 'main'], { cwd: root, stdio: 'pipe' });
  const file = join(root, 'dist', 'fly-high.html');
  const html = readFileSync(file, 'utf8');
  assert.ok(statSync(file).size < 3 * 1024 * 1024, `bundle is ${(statSync(file).size / 1048576).toFixed(2)} MB`);
  assert.match(html, /<canvas id="gl"/);
  assert.match(html, /id="fh-worker-src"/, 'worker source is inlined');
  assert.doesNotMatch(html, /<script[^>]+\ssrc=/i, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]+href=/i, 'no external stylesheets');
  assert.doesNotMatch(html, /url\(\s*['"]?https?:/i, 'no remote CSS resources');
  const urls = [...html.matchAll(/https?:\/\/[^\s"'`)\\]+/g)].map((m) => m[0]).filter((u) => !/^https?:\/\/(www\.w3\.org|localhost)/.test(u));
  assert.deepEqual(urls, [], 'the file must not reference the network');
  assert.doesNotMatch(html, /\bimport\s*\(|\brequire\(/, 'bundled: no dynamic module loading');
  assert.ok(html.includes('Fly High'));
});

test('no source file contains an em dash', () => {
  for (const f of walk(join(root, 'src')).concat(walk(join(root, 'tests')), walk(join(root, 'build')), walk(join(root, 'tools')))) {
    if (!/\.(js|mjs|css|html|md)$/.test(f)) continue;
    assert.ok(!readFileSync(f, 'utf8').includes(String.fromCharCode(8212)), `${f} contains an em dash`);
  }
  for (const f of ['PLAN.md', 'README.md']) { try { assert.ok(!readFileSync(join(root, f), 'utf8').includes(String.fromCharCode(8212)), f); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
});
