// Inlines src/ into one standalone index.html.  Run: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), 'utf8');
const heroes = readdirSync(at('src/heroes/')).filter((f) => f.endsWith('.js')).sort();
const parts = {
  css: read('src/shell.css'),
  lib: read('src/lib.js'),
  heroes: heroes.map((f) => read('src/heroes/' + f)).join('\n'),
  shell: read('src/shell.js'),
};
for (const [k, v] of Object.entries(parts)) if (/<\/script/i.test(v)) throw new Error(`"</script" found in ${k}; it would end the inline script early`);
const html = read('src/shell.html').replace(/\/\*@(css|lib|heroes|shell)\*\//g, (_, k) => parts[k]);
writeFileSync(at('index.html'), html);
console.log(`index.html  ${(html.length / 1024).toFixed(0)} KB  ${heroes.length} heroes`);
