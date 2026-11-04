// Staging after PR #452: Hot leads per role + the states. Claim is answered in-browser (nothing written to staging).
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const S = 'https://recruit.viet18.com';
const settle = async (p, ms = 5000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
(async () => {
  const b = await chromium.launch({ headless: true });
  const shot = async (email, tag, path, opts = {}) => {
    const r = await login(b, email); const ctx = r.ctx; const p = r.p;
    if (opts.w) await p.setViewportSize({ width: opts.w, height: 812 });
    if (opts.dark) await p.emulateMedia({ colorScheme: 'dark' });
    if (opts.claim) await ctx.route('**/recruit-svc/api/v1/candidates/*/claim', (route) => { const id = route.request().url().split('/candidates/')[1].split('/')[0]; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: { id, owner_id: 'me', stage: 'S1' }, error: null }) }); });
    await p.goto(S + path, { waitUntil: 'domcontentloaded' }); await settle(p, 7000);
    if (opts.claim) { const rows = p.locator('table.rec-hot-tbl tbody tr'); await rows.nth(1).getByRole('button', { name: /^(Claim|Nhận)$/ }).click(); await p.waitForTimeout(3000); await p.mouse.move(5, 5); }
    await p.screenshot({ path: `${OUT}/${tag}.png`, fullPage: Boolean(opts.full) });
    await ctx.close();
  };
  await shot('bao.trinh+recruiter@loanfactory.com', 'recruiter', '/inbox/hot');
  await shot('bao.trinh+manager@loanfactory.com', 'manager', '/inbox/hot');
  await shot('bao.trinh+hh@loanfactory.com', 'headhunter', '/inbox/hot');
  await shot('bao.trinh+recruiter@loanfactory.com', 'claimed', '/inbox/hot', { claim: true });
  await shot('bao.trinh+recruiter@loanfactory.com', 'tab-overdue-sort', '/inbox/hot?tab=overdue&sort=waiting&pageSize=50');
  await shot('bao.trinh+recruiter@loanfactory.com', 'search', '/inbox/hot?q=qa%20a&source=REFERRAL');
  await shot('bao.trinh+recruiter@loanfactory.com', 'dark', '/inbox/hot', { dark: true });
  await shot('bao.trinh+recruiter@loanfactory.com', 'phone', '/inbox/hot', { w: 375 });
  await shot('bao.trinh+recruiter@loanfactory.com', 'today', '/today', { full: true });
  await shot('bao.trinh+manager@loanfactory.com', 'exceptions-mgr', '/exceptions');
  await b.close(); console.log('done');
})();
