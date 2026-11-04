// Referrals merge (agentflow-3mjma) screenshots on STAGING.
// usage: NODE_PATH=~/.mmi-research/node_modules node shots.js <outDir> [paths-json]
// One Chromium, one context per role x width.
const { chromium } = require('playwright');
const { login } = require('../../recruit-e2e-lab/scripts/auth');
const OUT = process.argv[2];
const BASE = 'https://recruit.viet18.com';
const DEFAULT = [
  ['lo', 'bao.trinh+lo-referrer@loanfactory.com', ['/my-referrals']],
  ['manager', 'victoria.pham+stg@loanfactory.com', ['/my-referrals', '/referrals']],
  ['admin', 'bao.trinh+admin@loanfactory.com', ['/my-referrals', '/referrals']],
  ['recruiter', 'bao.trinh+recruiter@loanfactory.com', ['/my-referrals']],
];
const PLAN = process.argv[3] ? JSON.parse(process.argv[3]) : DEFAULT;
const WIDTHS = (process.env.WIDTHS || '1440,375').split(',').map(Number);
const slug = (p) => p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '') || 'root';
(async () => {
  const b = await chromium.launch({ headless: true });
  const out = [];
  for (const [name, email, paths] of PLAN) {
    for (const w of WIDTHS) {
      let r;
      try { r = await login(b, email, { w }); } catch (e) { out.push({ name, w, error: 'login ' + e.message.slice(0, 120) }); continue; }
      await r.p.setViewportSize({ width: w, height: w < 600 ? 1500 : 1300 });
      for (const entry of paths) {
        const [path, action] = entry.split('|');
        await r.p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await r.p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await r.p.waitForTimeout(4000);
        if (action === 'cards' || action === 'table') {
          const btn = r.p.getByRole('radio', { name: new RegExp(action, 'i') }).or(r.p.getByRole('button', { name: new RegExp(action, 'i') })).first();
          await btn.click({ timeout: 8000 }).catch(e => out.push({ name, path, warn: 'toggle ' + e.message.slice(0, 80) }));
          await r.p.waitForTimeout(2500);
        }
        const file = `${OUT}/${name}-${slug(path)}${action ? '-' + action : ''}-${w}.png`;
        await r.p.screenshot({ path: file, fullPage: false });
        const nav = (await r.p.locator('nav').allInnerTexts().catch(() => [])).join(' | ');
        out.push({ name, w, path, url: r.p.url().replace(BASE, ''), navReferrals: (nav.match(/[A-Za-z ]*[Rr]eferral[A-Za-z ]*/g) || []).map(s => s.trim()), file });
      }
      await r.ctx.close();
    }
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})();
