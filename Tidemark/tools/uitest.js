// Interaction test in Chromium: select, build, ledger, verify replay, stress test.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + require('path').join(__dirname, '..', 'TIDEMARK.html') + '?play=showcase');
  await p.waitForTimeout(2500);
  // speed up a little to get traffic
  await p.evaluate(() => { for (let i = 0; i < 400; i++) step(G.S); });
  await p.waitForTimeout(800);
  const vpos = await p.evaluate(() => { for (const [id, s] of RV.vpos) { const v = vById(G.S, id); if (v && v.k === 'truck' && s[0] > 120 && s[0] < 950 && s[1] > 80 && s[1] < 850) return { id, x: s[0], y: s[1] }; } return null; });
  console.log('truck on screen', JSON.stringify(vpos));
  if (vpos) { await p.mouse.click(vpos.x, vpos.y); await p.waitForTimeout(400); }
  console.log('panel after vehicle click:', (await p.textContent('#panelBody')).slice(0, 160).replace(/\s+/g, ' '));
  await p.screenshot({ path: SP + '/u1.png' });
  // click a building: the first market
  const bpos = await p.evaluate(() => { const m = G.S.blds.find(b => b.type === 'mill'); centerOnTile(m.x, m.y); renderFrame(G.S, 0); const s = worldToScreen(...P(m.x + 0.5, m.y, 14)); return { id: m.id, x: s[0], y: s[1] }; });
  await p.mouse.click(bpos.x, bpos.y); await p.waitForTimeout(400);
  console.log('panel after building click:', (await p.textContent('#panelBody')).slice(0, 200).replace(/\s+/g, ' '));
  // road tool drag
  const nActs = await p.evaluate(() => G.S.acts.length);
  await p.keyboard.press('r');
  const pts = await p.evaluate(() => { const a = worldToScreen(...P(6, 16, 0)), b = worldToScreen(...P(12, 16, 0)); return [a, b]; });
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); await p.mouse.move((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2, { steps: 4 }); await p.mouse.move(pts[1][0], pts[1][1], { steps: 4 }); await p.mouse.up();
  await p.waitForTimeout(300);
  console.log('actions before/after road drag', nActs, await p.evaluate(() => G.S.acts.length), 'toast:', await p.textContent('#toast'));
  await p.keyboard.press('Escape');
  // ledger
  await p.click('#tabs [data-tab="ledger"]'); await p.waitForTimeout(400);
  console.log('ledger:', (await p.textContent('#panelBody')).slice(0, 120).replace(/\s+/g, ' '));
  // snapshot and verify
  await p.evaluate(() => { for (let i = 0; i < 300; i++) step(G.S); });
  await p.click('#tabs [data-tab="time"]'); await p.waitForTimeout(400);
  await p.click('[data-a="verify"]');
  await p.waitForSelector('#modalBody h2:has-text("Replay")', { timeout: 60000 });
  console.log('verify:', (await p.textContent('#modalBody')).slice(0, 220).replace(/\s+/g, ' '));
  await p.screenshot({ path: SP + '/u2.png' });
  await p.click('#modalClose');
  // stress test
  await p.click('#tabs [data-tab="logi"]'); await p.waitForTimeout(400);
  await p.click('[data-a="stress"]');
  await p.waitForSelector('#modalBody #stressOpen', { timeout: 120000 });
  console.log('stress:', (await p.textContent('#modalBody')).slice(0, 400).replace(/\s+/g, ' '));
  await p.screenshot({ path: SP + '/u3.png' });
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  await b.close();
})();
