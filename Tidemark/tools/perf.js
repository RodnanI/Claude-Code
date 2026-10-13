const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto('file://' + require('path').join(__dirname, '..', 'TIDEMARK.html') + '?play=showcase');
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    G.speed = 0; const out = {};
    for (const z of [0.5, 1, 2]) {
      RV.cam.z = z; recenter(); RV.cam.z = z;
      const parts = { ground: 0, total: 0 };
      const t0 = performance.now(); for (let i = 0; i < 20; i++) renderFrame(G.S, 0.016); const t1 = performance.now();
      out['z' + z] = ((t1 - t0) / 20).toFixed(1) + ' ms/frame';
    }
    const t0 = performance.now(); for (let i = 0; i < 500; i++) step(G.S); out.tick = ((performance.now() - t0) / 500).toFixed(3) + ' ms/tick';
    return out;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
