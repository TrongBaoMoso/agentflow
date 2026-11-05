// Referral pages visibility per role (05/11): nav + /my-referrals + /referrals, and the BE answers.
// usage: node refvis.js <outDir> <before|after>
const { chromium } = require('playwright'); const { login, api } = require('./auth');
const OUT = process.argv[2]; const TAG = process.argv[3] || 'before';
const ALL_ROLES = [['lo', 'bao.trinh+lo-referrer@loanfactory.com'], ['manager', 'bao.trinh+manager@loanfactory.com'],
  ['admin', 'bao.trinh+admin@loanfactory.com'], ['recruiter', 'bao.trinh+recruiter@loanfactory.com'],
  ['headhunter', 'bao.trinh+hh@loanfactory.com'], ['teamlead', 'bao.trinh+role-teamlead@loanfactory.com'],
  ['onboarding', 'bao.trinh+role-onb@loanfactory.com'], ['losupport', 'bao.trinh+role-losupport@loanfactory.com']];
const BASE = 'https://recruit.viet18.com';
const ROLES = process.env.ONLY ? ALL_ROLES.filter(([n]) => process.env.ONLY.split(',').includes(n)) : ALL_ROLES;
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined }); const rows = [];
  for (const [name, email] of ROLES) {
    let r;
    try { r = await login(b, email); } catch (e) { rows.push({ name, error: 'login: ' + e.message.slice(0, 80) }); continue; }
    const nav = await api(r.token, 'GET', '/me/nav-context');
    const mine = await api(r.token, 'GET', '/referrals/mine?pageSize=1');
    const all = await api(r.token, 'GET', '/referrals?pageSize=1');
    const row = { name, roles: nav.body?.payload?.role_codes ?? nav.body?.role_codes ?? nav.status,
      my_referrals: nav.body?.payload?.my_referrals,
      has_referrals: nav.body?.payload?.has_referrals ?? nav.body?.has_referrals,
      mine: mine.status, mineTotal: mine.body?.payload?.total_items, all: all.status, allTotal: all.body?.payload?.total_items };
    const PAGES = TAG === 'before' ? [['/my-referrals', 'my-referrals'], ['/referrals', 'referrals']]
      : [['/my-referrals', 'my-referrals'], ['/my-referrals?scope=all', 'referrals']];
    for (const [path, slug] of PAGES) {
      await r.p.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await r.p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await r.p.waitForTimeout(3500);
      const navText = await r.p.locator('nav').allInnerTexts().catch(() => []);
      row[slug + '_url'] = r.p.url().replace(BASE, '');
      row.navLinks = await r.p.locator('nav a[href*="referrals"]').allInnerTexts().catch(() => []);
      row.navMy = row.navLinks.length > 0;
      row[slug + '_denied'] = (await r.p.locator('[role=alert]').count()) > 0;
      row[slug + '_rows'] = await r.p.locator('table tbody tr').count().catch(() => -1);
      await r.p.screenshot({ path: `${OUT}/${TAG}-${name}-${slug}.png` });
    }
    rows.push(row); await r.ctx.close();
  }
  await b.close(); console.log(JSON.stringify(rows, null, 1));
})();
