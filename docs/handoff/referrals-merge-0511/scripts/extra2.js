// Cards view + row click -> drawer, Manager All scope (taller viewport).
const { chromium } = require('playwright'); const { login } = require('../../recruit-e2e-lab/scripts/auth');
const BASE = 'https://recruit.viet18.com'; const OUT = '../after';
const settle = async (p) => { await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3500); };
(async () => { const b = await chromium.launch({ headless: true }); const log = [];
  for (const [name, email, path] of [['manager', 'victoria.pham+stg@loanfactory.com', '/my-referrals?scope=all&q=QA%20Merge'], ['lo', 'bao.trinh+lo-referrer@loanfactory.com', '/my-referrals']]) {
    const r = await login(b, email); await r.p.setViewportSize({ width: 1440, height: 1300 });
    await r.p.goto(BASE + path); await settle(r.p);
    const labels = await r.p.$$eval('button', els => els.map(e => (e.getAttribute('aria-label') || '') + '#' + (e.title || '')).filter(s => s !== '#'));
    log.push({ name, labels: labels.filter(l => /view|card|table|list|grid/i.test(l)) });
    const cardBtn = r.p.locator('button[aria-label*="Card" i], button[title*="Card" i], [role=radio][aria-label*="Card" i]').first();
    if (await cardBtn.count()) { await cardBtn.click(); await r.p.waitForTimeout(2500); await r.p.screenshot({ path: `${OUT}/${name}-cards-1440.png` }); log.push({ name, cards: 'ok' }); }
    const tblBtn = r.p.locator('button[aria-label*="Table" i], button[title*="Table" i], [role=radio][aria-label*="Table" i]').first();
    if (await tblBtn.count()) { await tblBtn.click(); await r.p.waitForTimeout(1500); }
    if (name === 'manager') {
      const cell = r.p.getByText('Not assigned yet').nth(1);
      await cell.click({ timeout: 10000 }).catch(e => log.push({ rowClick: e.message.slice(0, 100) }));
      await r.p.waitForTimeout(4000);
      log.push({ afterRowClick: r.p.url().replace(BASE, ''), dialogs: await r.p.locator('[role=dialog]').count() });
      await r.p.screenshot({ path: `${OUT}/manager-row-opens-drawer-1440.png` });
    }
    await r.ctx.close();
  }
  await b.close(); console.log(JSON.stringify(log, null, 1)); })();
