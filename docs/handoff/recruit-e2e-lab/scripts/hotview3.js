// HH / TEAM_LEAD with MOCKED back-in-pool rows (fulfilled in-browser; nothing sent to staging) + the EVENT_RSVP row.
const { chromium } = require('playwright'); const { login, api } = require('./auth'); const fs = require('fs');
const OUT = process.argv[2]; const HOT = '**/recruit-svc/api/v1/inbox/hot';
const settle = async (p) => { await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3500); };
(async () => {
  const b = await chromium.launch({ headless: true }); const log = {};
  const r = await login(b, 'bao.trinh+recruiter@loanfactory.com');
  const real = (await api(r.token, 'GET', '/inbox/hot')).body;
  const ev = real.payload.items.find((i) => i.candidate.source === 'EVENT_RSVP');
  await r.p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(r.p);
  if (ev) { const row = r.p.locator('table.rec-tbl tbody tr').nth(real.payload.items.indexOf(ev));
    await row.scrollIntoViewIfNeeded(); await row.screenshot({ path: `${OUT}/row-event.png` }); log.event = (await row.innerText()).replace(/\s+/g, ' '); }
  await r.ctx.close();
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const bip = [
    { reason: 'IDLE_RELEASE', at: ago(5), by_name: null, by_you: false, was_yours: true },
    { reason: 'RELEASE', at: ago(26), by_name: 'QA Test Manager', by_you: false, was_yours: false },
    { reason: 'RELEASE', at: ago(50), by_name: null, by_you: true, was_yours: true },
    { reason: 'PROGRAM_RELEASE', at: ago(72), by_name: null, by_you: false, was_yours: false },
    { reason: null, at: null, by_name: null, by_you: false, was_yours: false }];
  const mock = { ...real, payload: { ...real.payload, items: real.payload.items.slice(0, 5).map((i, k) => ({ ...i, back_in_pool: bip[k] })), total: 5, truncated: false, held_by_collector: [] } };
  for (const [email, tag] of [['bao.trinh+hh@loanfactory.com', 'hh'], ['bao.trinh+role-teamlead@loanfactory.com', 'teamlead']]) {
    const h = await login(b, email);
    await h.p.route(HOT, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock) }));
    await h.p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(h.p);
    await h.p.screenshot({ path: `${OUT}/${tag}-pool-mocked.png` });
    log[tag] = (await h.p.locator('table.rec-tbl tbody').innerText()).replace(/\s+/g, ' ').slice(0, 900);
    await h.ctx.close();
  }
  console.log(JSON.stringify(log, null, 1)); await b.close();
})();
