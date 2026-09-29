// Shared helpers for driving the built HTML in headless Chromium with software WebGL.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const CANDIDATES = ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright'];

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const name of CANDIDATES) {
    try { if (name.startsWith('/') && !existsSync(name)) continue; return require(name); } catch { /* try next */ }
  }
  return null;
}

export const CHROME_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage'];

export async function launch(pw) {
  return pw.chromium.launch({ args: CHROME_ARGS });
}

/** Wait until a predicate evaluated in the page returns truthy, with a timeout and periodic progress. */
export async function waitFor(page, fn, { timeout = 60000, poll = 250, arg } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await page.evaluate(fn, arg);
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, poll));
  }
}
