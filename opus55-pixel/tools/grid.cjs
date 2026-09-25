// Compose screenshots into one contact sheet: node tools/grid.cjs out.png cols a.png b.png ...
const path = require('path'), fs = require('fs');
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
(async () => {
  const [out, cols, ...files] = process.argv.slice(2);
  const imgs = files.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('');
  const html = `<style>body{margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},960px);gap:4px}img{width:960px;height:540px;image-rendering:pixelated}</style>${imgs}`;
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: cols * 964, height: 400 } });
  await p.setContent(html);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
