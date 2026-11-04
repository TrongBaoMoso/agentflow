// AFTER extras: bonus columns scrolled into view, Cards view, page-level horizontal overflow at 375, CSV export, row click.
const { chromium } = require('playwright'); const { login, api } = require('../../recruit-e2e-lab/scripts/auth');
const BASE = 'https://recruit.viet18.com'; const OUT = '../after';
const settle = async (p) => { await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3500); };
(async () => { const b = await chromium.launch({ headless: true }); const log = [];
  for (const [name, email] of [['manager', 'victoria.pham+stg@loanfactory.com'], ['lo', 'bao.trinh+lo-referrer@loanfactory.com']]) {
    const r = await login(b, email);
    const path = name === 'manager' ? '/my-referrals?scope=all&q=QA%20Merge' : '/my-referrals';
    await r.p.goto(BASE + path); await settle(r.p);
    // scroll every horizontally scrollable container fully right
    await r.p.evaluate(() => document.querySelectorAll('*').forEach(el => { if (el.scrollWidth > el.clientWidth + 20 && getComputedStyle(el).overflowX !== 'visible') el.scrollLeft = el.scrollWidth; }));
    await r.p.waitForTimeout(800); await r.p.screenshot({ path: `${OUT}/${name}-bonus-columns-1440.png` });
    const toggles = await r.p.$$eval('button,[role=radio]', els => els.map(e => e.getAttribute('aria-label') || '').filter(Boolean));
    const cards = r.p.locator('[aria-label*="ard" i]').first();
    if (await cards.count()) { await cards.click(); await r.p.waitForTimeout(2500); await r.p.screenshot({ path: `${OUT}/${name}-cards-1440.png` }); }
    else log.push({ name, cardsToggle: 'not found', labels: toggles.slice(0, 40) });
    const tbl = r.p.locator('[aria-label*="able" i]').first(); if (await tbl.count()) await tbl.click().catch(() => {});
    if (name === 'manager') {
      // whole-row click opens the CandidateDrawer
      await r.p.goto(BASE + '/my-referrals?scope=all&q=QA%20Mergeprog'); await settle(r.p);
      const row = r.p.locator('tr').filter({ hasText: 'QA Mergeprog' }).first();
      await row.locator('td').nth(3).click().catch(e => log.push({ rowClick: e.message.slice(0, 80) })); await r.p.waitForTimeout(3500);
      log.push({ afterRowClick: r.p.url().replace(BASE, ''), drawer: await r.p.locator('[role=dialog]').count() });
      await r.p.screenshot({ path: `${OUT}/manager-row-opens-drawer-1440.png` });
      const csv = await api(r.token, 'GET', '/referrals/export.csv?q=QA%20Merge&sort=referrer');
      const text = typeof csv.body === 'string' ? csv.body : JSON.stringify(csv.body);
      require('fs').writeFileSync(`${OUT}/manager-export-sample.csv`, text);
      log.push({ csvStatus: csv.status, csvHeader: text.split('\r\n')[0], csvRows: text.split('\r\n').filter(Boolean).length - 1 });
    }
    await r.ctx.close();
    const r2 = await login(b, email, { w: 375 }); await r2.p.setViewportSize({ width: 375, height: 812 });
    await r2.p.goto(BASE + (name === 'manager' ? '/my-referrals?scope=all' : '/my-referrals')); await settle(r2.p);
    log.push({ name, w375: await r2.p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth })) });
    await r2.ctx.close();
  }
  await b.close(); console.log(JSON.stringify(log, null, 1)); })();
