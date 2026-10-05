#!/usr/bin/env node
/* Bundles src/ into one standalone, offline HTML file: fever-parlor.html
   Usage: node build.js */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');
const debug = process.argv.includes('--debug');
const order = ['util', 'audio', 'art', 'data', 'fx', 'board', 'reels', 'meta', 'run', 'ui', 'main'];

const js = order.map(n => `/* ---------- ${n}.js ---------- */\n` + fs.readFileSync(path.join(src, 'js', n + '.js'), 'utf8')).join('\n');
if (/<\/script/i.test(js)) throw new Error('A closing script tag inside the JS would break the inline bundle.');

const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
const font = (family, file, weight) =>
  `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${fs.readFileSync(path.join(src, 'fonts', file)).toString('base64')}) format('woff2');font-weight:${weight};font-style:normal;font-display:block;}`;
const fonts = [
  font('Bungee', 'bungee.woff2', 400),
  font('Shrikhand', 'shrikhand.woff2', 400),
  font('Barlow Condensed', 'barlow-500.woff2', 500),
  font('Barlow Condensed', 'barlow-700.woff2', 700),
].join('\n');

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
// function replacers so "$" sequences in the code are never treated as patterns
html = html
  .replace('/*@@FONTS@@*/', () => fonts)
  .replace('/*@@CSS@@*/', () => css)
  .replace('/*@@JS@@*/', () => `(() => {\n'use strict';\n${js}\n${debug ? 'window.__FP = { Game, Board, UI, Meta, Reels, FX, Sound, Art };' : ''}\n})();`);

const out = debug ? path.resolve(process.argv[process.argv.indexOf('--debug') + 1]) : path.join(root, 'fever-parlor.html');
fs.writeFileSync(out, html);
console.log(`built ${path.relative(process.cwd(), out)}  ${(html.length / 1024).toFixed(1)} KB`);
