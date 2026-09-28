#!/usr/bin/env node
/* Bundles src/ into one standalone HTML file: stylesheets and scripts are inlined in the order
   src/index.html lists them. No dependencies. Usage: node build.js */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');
const read = p => fs.readFileSync(path.join(src, p), 'utf8').trim();

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, p) => `<style>\n${read(p)}\n</style>`);

const scripts = [];
html = html.replace(/<script src="([^"]+)"><\/script>\n?/g, (_, p) => {
  scripts.push(p);
  return scripts.length === 1 ? '@@BUNDLE@@\n' : '';
});
const js = scripts.map(p => `/* ---- ${p} ---- */\n${read(p)}\n`).join('\n');
if (/<\/script/i.test(js)) throw new Error('A script contains "</script", which would end the inline script early.');
html = html.replace('@@BUNDLE@@', () => `<script>\n(() => {\n${js}\n})();\n</script>`);

const out = path.join(root, 'learn-to-type.html');
fs.writeFileSync(out, html + '\n');
console.log(`Wrote ${path.basename(out)}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB from ${scripts.length} scripts`);
