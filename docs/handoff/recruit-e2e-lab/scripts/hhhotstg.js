// Staging after recruit-be#635 / recruit-fe#459 (D259): a headhunter's Hot leads with own-page rows. Read-only: nothing is clicked that writes.
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const S = 'https://recruit.viet18.com';
const settle = async (p, ms = 5000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME || undefined });
  const shot = async (email, tag, path, opts = {}) => {
    const r = await login(b, email); const ctx = r.ctx; const p = r.p;
    const seen = {};
    p.on('response', async (res) => {
      const u = res.url();
      if (!/recruit-svc\/api\/v1\/(inbox\/hot(\/counts)?|today)(\?|$)/.test(u)) return;
      try {
        const j = await res.json(); const pl = j.payload || {};
        if (/inbox\/hot\/counts/.test(u)) seen.counts = pl;
        else if (/inbox\/hot/.test(u)) seen.hot = { total: pl.total, items: (pl.items || []).length, own: (pl.items || []).filter((i) => i.own_page).length };
        else seen.today = { total_owned: pl.total_owned, items: (pl.items || []).length, has_from_page: 'new_from_page_total' in pl };
      } catch (e) {}
    });
    if (opts.w) await p.setViewportSize({ width: opts.w, height: 900 });
    if (opts.dark) await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto(S + path, { waitUntil: 'domcontentloaded' }); await settle(p, 7000);
    await p.screenshot({ path: `${OUT}/${tag}.png`, fullPage: Boolean(opts.full) });
    const focus = await p.evaluate(() => document.activeElement && document.activeElement.tagName);
    console.log(tag, JSON.stringify({ ...seen, focus }));
    await ctx.close();
  };
  await shot('bao.trinh+hh@loanfactory.com', 'hh-hot-1440', '/inbox/hot', { w: 1440 });
  await shot('bao.trinh+hh@loanfactory.com', 'hh-hot-375', '/inbox/hot', { w: 375, full: true });
  await shot('bao.trinh+hh@loanfactory.com', 'hh-hot-dark', '/inbox/hot', { w: 1440, dark: true });
  await shot('bao.trinh+hh@loanfactory.com', 'hh-today', '/today', { w: 1440, full: true });
  await shot('bao.trinh+recruiter@loanfactory.com', 'rec-hot-1440', '/inbox/hot', { w: 1440 });
  await b.close(); console.log('done');
})();
