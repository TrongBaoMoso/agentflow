const { chromium } = require('playwright'); const { login } = require('./auth');
(async () => { const b = await chromium.launch({ headless: true }); const s = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const p = s.p;
  await p.goto('https://recruit.viet18.com/candidates/672c9c81-3bd3-44bc-a5da-433599b18dfa', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(9000);
  await p.getByRole('button', { name: /^Email$/ }).first().click(); await p.waitForTimeout(6000);
  await p.screenshot({ path: 'shots/sms-0.png' });
  const t = (await p.innerText('body')).replace(/\s+/g, ' ');
  console.log('modal text', (t.match(/(Team only|Candidate & parties|opted out|Zoom|Texting is off)[^.]{0,80}/g) || []).slice(0, 6));
  const box = p.locator('[role=dialog] textarea, [role=dialog] [contenteditable=true]').last();
  console.log('box', await box.count());
  await box.click(); await p.keyboard.type('QA 08/10 Claude test email 1', { delay: 15 });
  await p.screenshot({ path: 'shots/sms-1.png' });
  await p.getByRole('button', { name: /QA Claudemailtwo/ }).last().click().catch(e => console.log('chip err', e.message.slice(0, 60))); await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/em-chip.png' }); await p.getByRole('button', { name: /Send to QA/ }).last().click({ timeout: 8000 }); await p.waitForTimeout(2500);
  const conf = p.getByRole('button', { name: /^Send$/ }).last();
  const dlg = (await p.innerText('body')).match(/Send outside the company\?[^]{0,200}/);
  console.log('confirm', dlg ? dlg[0].replace(/\s+/g, ' ').slice(0, 200) : 'none');
  if (dlg) { await conf.click(); await p.waitForTimeout(5000); }
  await p.screenshot({ path: 'shots/sms-2.png' });
  console.log('after', (await p.innerText('[role=dialog]').catch(() => '')).replace(/\s+/g, ' ').slice(-300));
  await b.close(); })();
