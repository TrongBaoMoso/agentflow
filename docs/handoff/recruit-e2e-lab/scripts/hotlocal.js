// Local next dev (port 3311) of the Hot UI branch, every /recruit-svc call forwarded to STAGING with a real
// account's token. GET only: any write is answered locally (claim mocked), so nothing changes on staging.
const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const OUT = process.argv[2]; const BASE = 'http://localhost:3311';
const settle = async (p, ms = 4000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
async function localPage(b, token, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: opts.h || 900 }, colorScheme: opts.dark ? 'dark' : 'light' });
  await ctx.route('**/recruit-svc/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() !== 'GET') {
      if (/\/candidates\/[^/]+\/claim$/.test(url.pathname) && opts.claimPayload) {
        const id = url.pathname.split('/candidates/')[1].split('/')[0];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: { ...opts.claimPayload(id), owner_id: 'me', stage: 'S1' }, error: null }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: null, error: null }) });
    }
    const res = await fetch('https://gateway.viet18.com' + url.pathname + url.search, { headers: { authorization: 'Bearer ' + token } });
    const body = await res.text();
    if (opts.rewrite && /\/inbox\/hot$/.test(url.pathname)) return route.fulfill({ status: res.status, contentType: 'application/json', body: opts.rewrite(body) });
    route.fulfill({ status: res.status, contentType: res.headers.get('content-type') || 'application/json', body });
  });
  const p = await ctx.newPage(); return { ctx, p };
}
(async () => {
  const b = await chromium.launch({ headless: true }); const log = {};
  const tokens = {};
  for (const e of ['bao.trinh+recruiter@loanfactory.com', 'bao.trinh+manager@loanfactory.com']) { const r = await login(b, e); tokens[e] = r.token; await r.ctx.close(); }
  const rec = tokens['bao.trinh+recruiter@loanfactory.com'];
  // recruiter, light 1440
  let { ctx, p } = await localPage(b, rec);
  await p.goto(BASE + '/inbox/hot', { waitUntil: 'domcontentloaded', timeout: 180000 }); await settle(p, 8000);
  log.url = p.url(); await p.screenshot({ path: `${OUT}/l-recruiter.png` }); await p.screenshot({ path: `${OUT}/l-recruiter-full.png`, fullPage: true });
  log.text = (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 1500);
  // tab overdue + sort waiting
  await p.goto(BASE + '/inbox/hot?tab=soon', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/l-tab-soon.png` });
  await p.goto(BASE + '/inbox/hot?q=qa%20a&source=REFERRAL', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/l-search.png` });
  await p.goto(BASE + '/inbox/hot?sort=waiting&pageSize=50&page=2', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/l-page2.png`, fullPage: true });
  await p.goto(BASE + '/today', { waitUntil: 'domcontentloaded' }); await settle(p, 6000);
  await p.screenshot({ path: `${OUT}/l-today.png` });
  await ctx.close();
  // claimed state (claim mocked)
  let hotBody = null;
  ({ ctx, p } = await localPage(b, rec, { claimPayload: (id) => ({ id }) }));
  p.on('response', async (r) => { if (/\/inbox\/hot$/.test(r.url()) && !hotBody) { try { hotBody = await r.json(); } catch {} } });
  await p.goto(BASE + '/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p, 8000);
  const rows = p.locator('table.rec-hot-tbl tbody tr');
  await rows.nth(1).getByRole('button', { name: /^Claim$/ }).click(); await p.waitForTimeout(3000);
  await p.mouse.move(5, 5); await p.screenshot({ path: `${OUT}/l-claimed.png` });
  await ctx.close();
  // Cold claimed (shares ClaimedRowActions)
  ({ ctx, p } = await localPage(b, rec, { claimPayload: (id) => ({ id }) }));
  await p.goto(BASE + '/inbox/cold', { waitUntil: 'domcontentloaded' }); await settle(p, 8000);
  const crow = p.locator('table tbody tr').filter({ has: p.getByRole('button', { name: /^Claim$/ }) }).nth(1);
  if (await crow.count()) { await crow.getByRole('button', { name: /^Claim$/ }).click(); await p.waitForTimeout(3000); await crow.scrollIntoViewIfNeeded(); await p.mouse.move(5, 5); }
  await p.screenshot({ path: `${OUT}/l-cold-claimed.png` }); await ctx.close();
  // manager
  ({ ctx, p } = await localPage(b, tokens['bao.trinh+manager@loanfactory.com']));
  await p.goto(BASE + '/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p, 8000);
  await p.screenshot({ path: `${OUT}/l-manager.png` }); await ctx.close();
  // dark + 375
  ({ ctx, p } = await localPage(b, rec, { dark: true }));
  await p.goto(BASE + '/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p, 8000);
  await p.screenshot({ path: `${OUT}/l-dark.png` }); await ctx.close();
  ({ ctx, p } = await localPage(b, rec, { w: 375, h: 812 }));
  await p.goto(BASE + '/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p, 8000);
  await p.screenshot({ path: `${OUT}/l-375.png`, fullPage: true }); await ctx.close();
  fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1)); console.log(log.url, log.text.slice(0, 600)); await b.close();
})();
