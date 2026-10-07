const { chromium } = require('playwright'); const { login } = require('./auth');
(async () => { const b = await chromium.launch({ headless: true }); const s = await login(b, 'manhadmin@viet18.com'); const p = s.p;
  await p.goto('https://recruit.viet18.com/candidates/07001ba1-360b-491f-b9e1-c1b45766739d', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(9000);
  await p.getByRole('button', { name: /^SMS$/ }).first().click(); await p.waitForTimeout(6000);
  await p.screenshot({ path: 'shots/sms-0.png' });
  const t = (await p.innerText('body')).replace(/\s+/g, ' ');
  console.log('modal text', (t.match(/(Team only|Candidate & parties|opted out|Zoom|Texting is off)[^.]{0,80}/g) || []).slice(0, 6));
  const box = p.locator('[role=dialog] textarea, [role=dialog] [contenteditable=true]').last();
  console.log('box', await box.count());
  await box.click(); await p.keyboard.type('QA 08/10 Claude test SMS 1 — please reply "QA reply 1" from Zoom', { delay: 15 });
  await p.screenshot({ path: 'shots/sms-1.png' });
  await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const conf = p.getByRole('button', { name: /^Send$/ }).last();
  const dlg = (await p.innerText('body')).match(/Send outside the company\?[^]{0,200}/);
  console.log('confirm', dlg ? dlg[0].replace(/\s+/g, ' ').slice(0, 200) : 'none');
  if (dlg) { await conf.click(); await p.waitForTimeout(5000); }
  await p.screenshot({ path: 'shots/sms-2.png' });
  console.log('after', (await p.innerText('[role=dialog]').catch(() => '')).replace(/\s+/g, ' ').slice(-300));
  await b.close(); })();
