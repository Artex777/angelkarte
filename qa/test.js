// QA: открывает живой сайт в Chromium и делает скриншоты (запускается в GitHub Actions)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = 'qa/out'; fs.mkdirSync(out, { recursive: true });
  const log = [];
  const geo = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=3&q=Luisenweg%2C+Hamburg',
    { headers: { 'User-Agent': 'angelkarte-qa' } })).json();
  log.push('geo ' + JSON.stringify(geo.map(g => [g.lat, g.lon, g.display_name])));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => log.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') log.push('console ' + m.text()); });
  p.on('requestfailed', r => log.push('FAILED ' + r.url().slice(0, 150) + ' ' + (r.failure() || {}).errorText));
  const url = 'https://artex777.github.io/angelkarte/?qa=' + Date.now();
  const ready = () => p.waitForFunction(() => document.getElementById('status').style.display === 'none', null, { timeout: 90000 });
  await p.goto(url); await ready();
  // Мост Luisenweg: ищем место, где Luisenweg пересекает воду (по OSM), иначе первая точка
  const c = [+geo[0].lon, +geo[0].lat];
  for (const [name, z, groupsOff] of [['luisen-z17', 17, false], ['luisen-z19', 19, false], ['luisen-z19-nolayers', 19, true], ['elbe-z13', 13, false]]) {
    await p.evaluate(([c, z, off, name]) => {
      if (name.startsWith('elbe')) c = [9.96, 53.54];
      map.jumpTo({ center: c, zoom: z });
      for (const id of Object.keys(styleLayerGroups)) setGroup(id, !off && id !== 'boot');
    }, [c, z, groupsOff, name]);
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${out}/${name}.png` });
  }
  // попап с фото: ищем значок фото
  await p.evaluate(() => { map.jumpTo({ center: [9.9705, 53.5455], zoom: 16.5 }); for (const id of Object.keys(styleLayerGroups)) setGroup(id, id !== 'boot'); });
  await p.waitForTimeout(5000);
  const pt = await p.evaluate(() => {
    const fs = map.queryRenderedFeatures().filter(f => f.layer.id.startsWith('icon-fotos'));
    if (!fs.length) return null; const q = map.project(fs[0].geometry.coordinates); return [q.x, q.y];
  });
  log.push('photo point ' + JSON.stringify(pt));
  if (pt) { await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(5000); await p.screenshot({ path: `${out}/popup.png` }); }
  await p.click('#bLayers'); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/layers.png` });
  fs.writeFileSync(`${out}/log.txt`, log.join('\n'));
  await b.close();
})();
