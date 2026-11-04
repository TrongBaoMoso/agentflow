// Register one test person through a staging join page (agentflow-3mjma test data).
// usage: node joinsubmit.js <url> <first> <last> <email> <phone10> <shot.png>
const { chromium } = require('playwright');
(async () => { const [url, first, last, email, phone, shot] = process.argv.slice(2);
  const b = await chromium.launch({ headless: true }); const p = await (await b.newContext({ viewport: { width: 1280, height: 1400 } })).newPage();
  const posts = []; p.on('response', r => { if (r.request().method() === 'POST') posts.push(r.status() + ' ' + r.url().slice(0, 120)); });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(6000);
  const soon = p.getByRole('button', { name: /Soonest/ }).first(); if (await soon.count()) { await soon.click(); await p.waitForTimeout(2500); }
  await p.fill('input[name=first_name]', first); await p.fill('input[name=last_name]', last);
  await p.fill('input[name=email]', email); await p.fill('input[name=phone]', phone);
  await p.check('input[name=is_consent_checkbox]').catch(() => p.locator('input[name=is_consent_checkbox]').click({ force: true }));
  await p.getByRole('button', { name: /Save my seat|Submit|Register|Join/i }).last().click();
  await p.waitForTimeout(10000); await p.screenshot({ path: shot });
  console.log(posts.join('\n')); console.log((await p.locator('body').innerText()).slice(0, 600).replace(/\n+/g, ' | ')); await b.close(); })();
