// Швидка перевірка в headless Chromium (потрібен playwright): node tools/smoke.cjs
// Підставляє спрощений html2canvas, додає демо-дані, чекає завершення завантаження й робить скріншот.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const c = await b.newContext({viewport: {width: 402, height: 874}, deviceScaleFactor: 1, isMobile: true, hasTouch: true});
  await c.addInitScript(fs.readFileSync(path.join(__dirname, 'mock-html2canvas.js'), 'utf8'));
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../docs/index.html'));
  await p.evaluate(() => window.__seed());
  await p.waitForFunction(() => !__dbg().boot, null, {timeout: 90000});
  await p.waitForTimeout(1500);
  await p.screenshot({path: path.join(__dirname, 'smoke.png')});
  console.log(errs.length ? 'ПОМИЛКИ:\n' + errs.join('\n') : 'OK, помилок немає. Скріншот: tools/smoke.png');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
