// Сравнение: официальная WebMap (ArcGIS JS) против нашего приложения в одних и тех же местах
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const PLACES = [['wilhelmsburg', 10.005, 53.495, 13], ['hafen', 9.97, 53.54, 14]];
(async () => {
  const out = 'qa/cmp'; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync('qa/cmp/console.txt', '');
  for (let i = 0; i < 40; i++) { // ждём, пока GitHub Pages отдаст новые данные
    const m = await (await fetch('https://artex777.github.io/angelkarte/data/meta.json?x=' + Date.now())).json().catch(() => ({}));
    if ((m.layers || []).length && !(m.layers || []).some(l => l.url.includes('OhneAnglNutz'))) break;
    await new Promise(r => setTimeout(r, 15000));
  }
  const b = await chromium.launch();
  if (process.env.ONLY_TEST) { await b.close(); return; }
  const vp = { viewport: { width: 412, height: 700 } };
  for (const [name, lon, lat, z] of PLACES) {
    const p1 = await b.newPage(vp);
    await p1.goto('file://' + path.resolve('qa/arcgis.html') + `?id=a1ff38ae31254838a4048a091bb03884&lon=${lon}&lat=${lat}&scale=${591657527.59 / Math.pow(2, z)}`);
    await p1.waitForFunction(() => window.READY, null, { timeout: 180000 }).catch(() => {});
    await p1.screenshot({ path: `${out}/${name}-original.png` });
    fs.writeFileSync(`${out}/${name}-layers.json`, JSON.stringify(await p1.evaluate(() => window.INFO), null, 1)); await p1.close();
    const ctx = await b.newContext(vp); const p2 = await ctx.newPage();
    await p2.addInitScript(([lon, lat, z]) => { try { localStorage.setItem('angelkarte-hh-v2', JSON.stringify({ center: [lon, lat], zoom: z - 1, lang: 'ru' })); } catch (e) {} }, [lon, lat, z]);
    await p2.goto('https://artex777.github.io/angelkarte/?x=' + Date.now());
    await p2.waitForFunction(() => document.getElementById('status').style.display === 'none', null, { timeout: 90000 }).catch(() => {});
    await p2.waitForTimeout(7000);
    await p2.screenshot({ path: `${out}/${name}-app.png` }); await ctx.close();
  }
  await b.close();
})();
