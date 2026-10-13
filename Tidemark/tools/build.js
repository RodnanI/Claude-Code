// Concatenates src/ into the single standalone TIDEMARK.html.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const shell = fs.readFileSync(path.join(src, 'shell.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');
const js = fs.readdirSync(src).filter(f => /^\d\d_.*\.js$/.test(f)).sort()
  .map(f => '/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const out = shell.replace('/*STYLE*/', () => css).replace('/*SCRIPT*/', () => js);
fs.writeFileSync(path.join(root, 'TIDEMARK.html'), out);
console.log('TIDEMARK.html', (out.length / 1024).toFixed(1) + ' KB');
