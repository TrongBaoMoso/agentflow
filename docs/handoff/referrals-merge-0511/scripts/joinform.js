// Inspect the staging join page form (no submit). usage: node joinform.js <url>
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ headless: true }); const p = await (await b.newContext({ viewport: { width: 1280, height: 1400 } })).newPage();
  await p.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(6000);
  const fields = await p.$$eval('input,select,textarea,button', els => els.map(e => [e.tagName, e.type, e.name, e.placeholder, (e.innerText || '').slice(0, 40), e.getAttribute('aria-label')].join('|')));
  console.log(p.url()); console.log(fields.join('\n'));
  await p.screenshot({ path: process.argv[3] || '/tmp/x.png' }); await b.close(); })();
