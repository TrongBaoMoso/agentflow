// Open the first webinar session's form on a join page and list its fields (no submit).
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ headless: true }); const p = await (await b.newContext({ viewport: { width: 1280, height: 1400 } })).newPage();
  await p.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(6000);
  await p.getByRole('button', { name: /Soonest/ }).click(); await p.waitForTimeout(3000);
  const fields = await p.$$eval('input,select,textarea,button', els => els.filter(e => e.offsetParent).map(e => [e.tagName, e.type, e.name, e.placeholder, (e.innerText || '').slice(0, 40).replace(/\n/g, ' '), e.getAttribute('aria-label'), e.required].join('|')));
  console.log(fields.join('\n')); await p.screenshot({ path: process.argv[3], fullPage: false }); await b.close(); })();
