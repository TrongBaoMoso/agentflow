// Hot leads: per-variant row shots (real data), plus MOCKED states staging has no data for. Nothing is written to staging:
// mocked calls are fulfilled inside the browser (page.route), never sent.
const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const OUT = process.argv[2]; const HOT = '**/recruit-svc/api/v1/inbox/hot';
const settle = async (p) => { await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3500); };
(async () => {
  const b = await chromium.launch({ headless: true }); const log = {};
  // A) recruiter, real data
  const r = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const p = r.p;
  let realHot = null;
  p.on('response', async (res) => { if (/\/inbox\/hot$/.test(res.url()) && res.request().method() === 'GET') { try { realHot = await res.json(); } catch {} } });
  await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p);
  const rows = p.locator('table.rec-tbl tbody tr');
  const shotRow = async (re, name) => {
    const row = rows.filter({ hasText: re }).first();
    if (await row.count()) { await row.scrollIntoViewIfNeeded(); await row.screenshot({ path: `${OUT}/row-${name}.png` }); log[name] = (await row.innerText()).replace(/\s+/g, ' ').slice(0, 200); }
    else log[name] = 'NOT FOUND';
  };
  await shotRow(/Referred by|Invited by|Referral/, 'referral');
  await shotRow(/Webinar/, 'webinar');
  await shotRow(/Event|RSVP/, 'event');
  await shotRow(/Big producer|producer/i, 'producer');
  await shotRow(/Due in|due soon|Due soon/i, 'due-ok');
  // tooltip on first-touch due of first row
  const due = rows.first().locator('td').nth(3).locator('.rec-focusable');
  if (await due.count()) { await p.mouse.move(0, 0); await due.hover(); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/tooltip-due.png`, clip: { x: 700, y: 300, width: 740, height: 260 } }); }
  // Claimed-in-place "Yours" (claim POST mocked; the real list keeps the row via keep())
  await p.route('**/recruit-svc/api/v1/candidates/*/claim', async (route) => {
    const id = route.request().url().split('/candidates/')[1].split('/')[0];
    const it = realHot?.payload?.items?.find((i) => i.candidate.id === id);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: { ...(it?.candidate || {}), owner_id: 'd8186688-77d4-454d-a649-a1bdf8842bb6', stage: 'S1' }, error: null }) });
  });
  await p.route(HOT, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(realHot) }));
  const btn = rows.nth(1).getByRole('button', { name: /^Claim$/ });
  if (await btn.count()) { await btn.click(); await p.waitForTimeout(3000); await rows.nth(1).scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/claimed-yours.png` }); log.claimed = (await rows.nth(1).innerText()).replace(/\s+/g, ' ').slice(0, 200); }
  await p.unrouteAll({ behavior: 'ignoreErrors' });
  // Dark + 375 mobile, real data
  await p.emulateMedia({ colorScheme: 'dark' }); await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/recruiter-dark.png` });
  await p.emulateMedia({ colorScheme: 'light' }); await p.setViewportSize({ width: 375, height: 812 }); await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/recruiter-375.png` });
  await p.setViewportSize({ width: 1440, height: 900 });
  // Empty state for an unscoped user (mocked empty list)
  await p.route(HOT, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: { ...realHot.payload, items: [], total: 0, held_by_collector: [] }, error: null }) }));
  await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/recruiter-empty.png` });
  // Truncated notice (mocked cap)
  await p.unrouteAll({ behavior: 'ignoreErrors' });
  await p.route(HOT, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: { ...realHot.payload, items: realHot.payload.items.slice(0, 3), total: 250, truncated: true }, error: null }) }));
  await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(p);
  await p.screenshot({ path: `${OUT}/recruiter-truncated.png` });
  await r.ctx.close();
  // B) HEADHUNTER with MOCKED back-in-pool rows (staging HH has 0)
  const src = realHot.payload.items.slice(0, 5); const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const bip = [
    { reason: 'IDLE_RELEASE', at: ago(5), by_name: null, by_you: false, was_yours: true },
    { reason: 'RELEASE', at: ago(26), by_name: 'QA Test Manager', by_you: false, was_yours: false },
    { reason: 'RELEASE', at: ago(50), by_name: null, by_you: true, was_yours: true },
    { reason: 'PROGRAM_RELEASE', at: ago(72), by_name: null, by_you: false, was_yours: false },
    { reason: null, at: null, by_name: null, by_you: false, was_yours: false }];
  const mock = { payload: { ...realHot.payload, items: src.map((i, k) => ({ ...i, back_in_pool: bip[k] })), total: 5, held_by_collector: [] }, error: null };
  const h = await login(b, 'bao.trinh+hh@loanfactory.com'); const q = h.p;
  await q.route(HOT, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mock) }));
  await q.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(q);
  await q.screenshot({ path: `${OUT}/hh-pool-mocked.png` });
  log.hh = (await q.locator('table.rec-tbl tbody').innerText()).replace(/\s+/g, ' ').slice(0, 900);
  await h.ctx.close();
  fs.writeFileSync(`${OUT}/result2.json`, JSON.stringify(log, null, 1)); console.log(JSON.stringify(log, null, 1)); await b.close();
})();
