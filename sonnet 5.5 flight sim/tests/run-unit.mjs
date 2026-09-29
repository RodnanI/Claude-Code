// Portable unit test runner: regenerates the registry, then runs every tests/unit/*.test.mjs with the built-in runner.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generate } from '../build/gen-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
generate();
const dir = join(root, 'tests', 'unit');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(dir, f));
const r = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit', cwd: root });
process.exit(r.status ?? 1);
