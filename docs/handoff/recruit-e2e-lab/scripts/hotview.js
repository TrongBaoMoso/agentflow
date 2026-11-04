// Screenshot /inbox/hot for each staging role account + record roles/permissions and the raw /inbox/hot payload shape.
const { chromium } = require('playwright'); const { login, api } = require('./auth'); const fs = require('fs');
const OUT = process.argv[2]; const ACCS = process.argv.slice(3);
(async () => {
  const b = await chromium.launch({ headless: true }); const res = {};
  for (const email of ACCS) {
    const tag = email.replace(/@.*/, '').replace(/[^a-z0-9]/gi, '_');
    try {
      const r = await login(b, email); const p = r.p;
      const nav = await api(r.token, 'GET', '/me/nav-context');
      const perms = await api(r.token, 'GET', '/admin/rbac/me');
      const hot = await api(r.token, 'GET', '/inbox/hot');
      await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(4000);
      const url = p.url(); const text = (await p.innerText('body')).replace(/\s+/g, ' ');
      const nav_items = await p.$$eval('nav a, aside a', as => as.map(a => a.innerText.trim()).filter(Boolean));
      await p.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
      await p.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });
      const pl = hot.body && hot.body.payload;
      res[email] = { url, hot_status: hot.status, roles: nav.body?.payload?.role_codes ?? nav.body, perms: perms.body?.payload ?? perms.body,
        total: pl?.total, items: pl?.items?.length, truncated: pl?.truncated,
        back_in_pool: pl?.items?.filter(i => i.back_in_pool).length, held_by_collector: pl?.held_by_collector?.length,
        claim_buttons: (text.match(/\bClaim\b/g) || []).length, take_back: (text.match(/Take back/g) || []).length,
        has_why_back: /Why it/i.test(text), strips: (text.match(/no result yet/g) || []).length, nav_items };
      console.log(email, JSON.stringify({ url, roles: res[email].roles, total: res[email].total, items: res[email].items }));
      await r.ctx.close();
    } catch (e) { res[email] = { error: String(e).slice(0, 300) }; console.log(email, 'ERR', String(e).slice(0, 200)); }
  }
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); await b.close();
})();
