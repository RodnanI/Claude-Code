// Build script: bundles src/*.js into one standalone, offline HTML file.
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const srcDir = path.join(root, 'src');
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();

const header = '(function () {\n"use strict";\n';
let js = header;
let line = header.split('\n').length;
const map = [];
for (const f of files) {
  const code = fs.readFileSync(path.join(srcDir, f), 'utf8');
  js += `// ==== ${f} ====\n`;
  line += 1;
  map.push({ file: f, start: line });
  js += code + '\n';
  line += code.split('\n').length;
}
js += '})();';

try {
  new vm.Script(js, { filename: 'bundle.js' });
} catch (e) {
  const m = /bundle\.js:(\d+)/.exec(e.stack || '');
  if (m) {
    const ln = +m[1];
    const src = map.filter((o) => o.start <= ln).pop();
    console.error(`Syntax error in ${src.file}:${ln - src.start + 1}: ${e.message}`);
  } else console.error('Syntax error:', e.message);
  process.exit(1);
}

const tpl = fs.readFileSync(path.join(srcDir, 'template.html'), 'utf8');
const html = tpl.replace('/*GAME*/', () => js);
const out = path.join(root, 'squeakborne.html');
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(root, '.bundle-map.json'), JSON.stringify(map));
console.log(`Built ${path.basename(out)}: ${(html.length / 1024).toFixed(1)} KB from ${files.length} source files`);
