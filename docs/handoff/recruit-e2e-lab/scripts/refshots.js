const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2];
(async () => { const b = await chromium.launch({ headless: true }); const r = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const p = r.p;
  for (const [u, n] of [['/inbox/cold', 'cold'], ['/pipeline', 'pipeline'], ['/today', 'today']]) {
    await p.goto('https://recruit.viet18.com' + u, { waitUntil: 'domcontentloaded' }); await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(4000);
    await p.screenshot({ path: `${OUT}/ref-${n}.png`, fullPage: n === 'pipeline' ? false : false }); }
  await b.close(); })();
