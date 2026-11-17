// agentflow-1hn6r (D573): staging FE rendered with ONE injected first-sight row + marker (browser-side route rewrite of GET
// responses only; nothing is written to staging). Proves layout/theme/phone of the shipped UI before real items exist.
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const STG = 'https://recruit.viet18.com';
const settle = async (p, ms = 5000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
(async () => {
  const b = await chromium.launch({ headless: true });
  const man = await login(b, 'bao.trinh+admin@loanfactory.com');
  const seen = [];
  man.p.on('response', async (r) => { if (r.request().method() === 'GET' && /recruit-svc/.test(r.url())) { try { const t = await r.text(); const m = t.match(/"candidate_id":"([0-9a-f-]{36})"|"candidate":\{"id":"([0-9a-f-]{36})"/); if (m) seen.push(m[1] || m[2]); } catch {} } });
  await man.p.goto(STG + '/inbox/hot', { waitUntil: 'domcontentloaded' }); await settle(man.p, 8000);
  let cid = await man.p.evaluate(() => { const a = [...document.querySelectorAll('a[href*="/candidates/"]')].map((x) => x.getAttribute('href')); const m = a.map((h) => (h.match(/\/candidates\/([0-9a-f-]{36})/) || [])[1]).find(Boolean); return m || null; });
  if (!cid) cid = seen[0] || null;
  if (!cid) { const r = man.p.locator('tbody tr').first(); await r.click().catch(() => {}); await settle(man.p, 3000); cid = (man.p.url().match(/([0-9a-f-]{36})/) || [])[1] || null; }
  console.log('candidate id', cid);
  const st = await man.ctx.storageState(); await man.ctx.close();
  const now = Date.now();
  const items = [
    { id: '00000000-0000-0000-0000-0000000000a1', kind: 'CURRENT_LOAN_OFFICER', candidate: { id: cid, first_name: 'Sample', last_name: 'Current LO', nmls_id: null }, owner_id: null, status: 'ACTIVE', stage: 'S0', first_seen: new Date(now - 3600e3).toISOString(), last_seen: new Date(now - 600e3).toISOString(), seen_count: 2 },
    { id: '00000000-0000-0000-0000-0000000000a2', kind: 'NOT_ELIGIBLE_FOR_REHIRE', candidate: { id: cid, first_name: 'Sample', last_name: 'No rehire', nmls_id: null }, owner_id: null, status: 'ACTIVE', stage: 'S0', first_seen: new Date(now - 86400e3).toISOString(), last_seen: new Date(now - 86400e3).toISOString(), seen_count: 1 },
    { id: '00000000-0000-0000-0000-0000000000a3', kind: 'SAME_PERSON_SKIPPED', candidate: { id: cid, first_name: 'Sample', last_name: 'Twin skipped', nmls_id: null }, owner_id: null, status: 'NURTURE', stage: 'S2', first_seen: new Date(now - 2 * 86400e3).toISOString(), last_seen: new Date(now - 7200e3).toISOString(), seen_count: 4 },
  ];
  for (const [w, dark] of [[1440, false], [1440, true], [375, false], [375, true]]) {
    const ctx = await b.newContext({ storageState: st, viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
    await ctx.route('**/*', async (route) => {
      const req = route.request(); const u = new URL(req.url());
      if (req.method() !== 'GET' || req.resourceType() === 'document' || !/recruit-svc/.test(u.href)) return route.continue();
      if (/\/exceptions\/first-sight$/.test(u.pathname)) {
        const res = await route.fetch(); let j; try { j = await res.json(); } catch { return route.fulfill({ response: res }); } const pl = j.payload !== undefined ? j.payload : j;
        Object.assign(pl, { items, total: items.length, truncated: false });
        return route.fulfill({ response: res, body: JSON.stringify(j) });
      }
      if (cid && new RegExp('/candidates/' + cid + '$').test(u.pathname)) {
        const res = await route.fetch(); let j; try { j = await res.json(); } catch { return route.fulfill({ response: res }); } const pl = j.payload !== undefined ? j.payload : j;
        if (pl && typeof pl === 'object') pl.first_sight_review = ['CURRENT_LOAN_OFFICER', 'NOT_ELIGIBLE_FOR_REHIRE'];
        return route.fulfill({ response: res, body: JSON.stringify(j) });
      }
      return route.continue();
    });
    const p = await ctx.newPage(); const tag = `${w}-${dark ? 'dark' : 'light'}`;
    await p.goto(STG + '/exceptions', { waitUntil: 'domcontentloaded' }); await settle(p);
    const sec = p.locator('section[aria-labelledby="exc-first-sight-h"]');
    await sec.waitFor({ timeout: 45000 }).catch(() => {});
    if (await sec.count()) { await sec.scrollIntoViewIfNeeded(); await sec.screenshot({ path: `${OUT}/inj-section-${tag}.png` }); } else console.log(tag, 'section missing');
    if (w === 375 && await sec.count()) {
      const wrap = sec.locator('.rec-tblwrap'); const info = await wrap.evaluate((el) => ({ ox: getComputedStyle(el).overflowX, sw: el.scrollWidth, cw: el.clientWidth }));
      console.log(tag, 'tblwrap', JSON.stringify(info));
      await wrap.evaluate((el) => { el.scrollLeft = el.scrollWidth; }); await p.waitForTimeout(500);
      const btn = sec.getByRole('button', { name: 'Mark handled' }).first(); const bb = await btn.boundingBox();
      console.log(tag, 'button box after scroll', JSON.stringify(bb));
      await sec.screenshot({ path: `${OUT}/inj-section-scrolled-${tag}.png` });
    }
    console.log(tag, 'exceptions scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
    if (cid) {
      await p.goto(STG + '/candidates/' + cid, { waitUntil: 'domcontentloaded' }); await settle(p, 7000);
      const mk = p.locator('[role="note"]').filter({ hasText: /MOSO|first|rehire|loan officer/i }).first();
      if (await mk.count()) { await mk.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/inj-marker-${tag}.png` }); await mk.screenshot({ path: `${OUT}/inj-marker-crop-${tag}.png` }); }
      else { console.log(tag, 'marker missing'); await p.screenshot({ path: `${OUT}/inj-drawer-${tag}.png` }); }
      console.log(tag, 'candidate scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
    }
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
