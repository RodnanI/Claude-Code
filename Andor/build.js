// Andor build script.
// Bundles src/*.js (in filename order) and src/style.css into one standalone,
// offline HTML file (Andor.html) and writes a dev page (index.html) that loads
// the same sources as separate files for easier debugging.
// Usage: node build.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const srcDir = path.join(root, 'src');
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const tpl = fs.readFileSync(path.join(srcDir, 'template.html'), 'utf8');

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
js += '})();\n';

// Syntax check with a readable source location.
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

const html = tpl
  .replace('/*CSS*/', () => css)
  .replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
const out = path.join(root, 'Andor.html');
fs.writeFileSync(out, html);

const dev = tpl
  .replace('<style>/*CSS*/</style>', '<link rel="stylesheet" href="src/style.css">')
  .replace('<script>/*JS*/</script>', files.map((f) => `<script src="src/${f}"></script>`).join('\n'));
fs.writeFileSync(path.join(root, 'index.html'), dev);
fs.writeFileSync(path.join(root, 'tools', '.bundle-map.json'), JSON.stringify(map));
console.log(`Built Andor.html: ${(html.length / 1024).toFixed(1)} KB from ${files.length} source files`);
