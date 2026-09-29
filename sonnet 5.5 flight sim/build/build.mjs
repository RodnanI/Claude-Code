// Bundles the game into ONE standalone HTML file: CSS, main bundle and the inlined worker source.
// Usage: node build/build.mjs [--entry main|viewer|aircraft] [--no-minify]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { generate } from './gen-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const args = process.argv.slice(2);
const entryName = args.includes('--entry') ? args[args.indexOf('--entry') + 1] : 'main';
const minify = !args.includes('--no-minify');

const ENTRIES = {
  main: { file: 'main.js', out: 'fly-high.html', title: 'Fly High' },
  viewer: { file: 'test-scenes/viewer.js', out: 'test-viewer.html', title: 'Fly High: viewer' },
  aircraft: { file: 'test-scenes/aircraft.js', out: 'test-aircraft.html', title: 'Fly High: aircraft' },
  kits: { file: 'test-scenes/kits.js', out: 'test-kits.html', title: 'Fly High: kits' },
};
const entry = ENTRIES[entryName];
if (!entry) throw new Error('unknown entry ' + entryName);

generate();

const common = { bundle: true, format: 'iife', target: 'es2021', minify, legalComments: 'none', write: false, logLevel: 'warning', charset: 'utf8', define: { 'import.meta.url': '"http://localhost/"' } };
const worker = await esbuild.build({ ...common, entryPoints: [join(src, 'workers/world.worker.js')] });
const main = await esbuild.build({ ...common, entryPoints: [join(src, entry.file)] });

const css = readdirSync(join(src, 'styles')).sort().map((f) => readFileSync(join(src, 'styles', f), 'utf8')).join('\n');
const esc = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const cssMin = minify ? css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{};:,>])\s*/g, '$1').replace(/\s+/g, ' ') : css;

let html = readFileSync(join(src, 'index.html'), 'utf8');
html = html.replace('<title>Fly High</title>', `<title>${entry.title}</title>`);
html = html.replace('<!--HEAD-->', () => `<style>${cssMin}</style>`);
html = html.replace('<!--BODYEND-->', () => `<script type="text/plain" id="fh-worker-src">${esc(worker.outputFiles[0].text)}</script>\n<script>${esc(main.outputFiles[0].text)}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
const outPath = join(root, 'dist', entry.out);
writeFileSync(outPath, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`built dist/${entry.out}: ${kb} KB (main ${(main.outputFiles[0].text.length / 1024).toFixed(0)} KB, worker ${(worker.outputFiles[0].text.length / 1024).toFixed(0)} KB)`);
