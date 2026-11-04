// Print role codes + referral flags of each account (no secrets printed).
const { chromium } = require('playwright'); const { login, api } = require('../../recruit-e2e-lab/scripts/auth');
(async () => { const b = await chromium.launch({ headless: true });
  for (const email of process.argv.slice(2)) { try { const r = await login(b, email);
    const nav = await api(r.token, 'GET', '/me/nav-context'); const p = nav.body?.payload ?? nav.body;
    const mine = await api(r.token, 'GET', '/referrals/mine?pageSize=1'); const all = await api(r.token, 'GET', '/referrals?pageSize=1');
    console.log(email, JSON.stringify({ roles: p?.role_codes, keys: Object.keys(p || {}).filter(k => /refer|lo/i.test(k)).map(k => k + '=' + JSON.stringify(p[k])), mine: mine.status, mineTotal: (mine.body?.payload ?? mine.body)?.total_items, all: all.status, allTotal: (all.body?.payload ?? all.body)?.total_items }));
    await r.ctx.close(); } catch (e) { console.log(email, 'ERR', e.message.slice(0, 100)); } }
  await b.close(); })();
