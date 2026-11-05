// Referrals redesign (agentflow-3mjma, 06/11) screenshots on STAGING.
// usage: NODE_PATH=~/.mmi-research/node_modules node capture.js <outDir> <before|after>
// One Chromium, one context per role x width (ram-gate: acquire chrome first).
const { chromium } = require('playwright');
const { login } = require('../../../recruit-e2e-lab/scripts/auth');
const OUT = process.argv[2];
const PHASE = process.argv[3] || 'before';
const BASE = 'https://recruit.viet18.com';
const MANAGER = 'victoria.pham+stg@loanfactory.com';
const LO = 'bao.trinh+lo-referrer@loanfactory.com';
const ALL = '/my-referrals?scope=all';
const log = [];

const settle = async (p) => {
  await p.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await p.waitForSelector('[data-testid="referral-row"], [data-testid="referral-card"], .mantine-Notification-root, [data-testid="empty-state"]', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(2500);
};
const go = async (p, path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 }); await settle(p); };
const shot = async (p, file, opts = {}) => { await p.screenshot({ path: `${OUT}/${file}.png`, ...opts }); log.push({ file, url: p.url().replace(BASE, '') }); };
// The sideways scroller: the body scroller after the redesign, the table card before it.
const scroller = '[data-testid="referrals-table-scroll"], [data-testid="referrals-table"]';
// The body scroller sits INSIDE the table card, so ask for it first (querySelector with a list returns document order).
const pick = (sel) => sel.split(',').map((s) => document.querySelector(s.trim())).find(Boolean);
const scrollRight = (p) => p.evaluate((sel) => { const el = sel.split(',').map((s) => document.querySelector(s.trim())).find(Boolean); if (el) { el.scrollLeft = el.scrollWidth; el.dispatchEvent(new Event('scroll')); } }, scroller);
const scrollPage = (p, y) => p.evaluate((top) => window.scrollTo(0, top), y);
const tableTop = (p) => p.evaluate((sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : 0; }, scroller);

async function manager1440(b) {
  const r = await login(b, MANAGER, { w: 1440 });
  const p = r.p; await p.setViewportSize({ width: 1440, height: 1000 });
  await go(p, ALL);
  await shot(p, 'manager-all-1440');
  await shot(p, 'manager-all-1440-full', { fullPage: true });
  await scrollRight(p); await p.waitForTimeout(600);
  await shot(p, 'manager-all-1440-scrolled-right');
  const top = await tableTop(p);
  await scrollPage(p, top + 500); await p.waitForTimeout(800);
  await shot(p, 'manager-all-1440-mid-scroll');
  await scrollPage(p, 0);
  if (PHASE === 'after') {
    const kpi = p.locator('[data-testid="referrals-kpi"]');
    if (await kpi.count()) { await kpi.screenshot({ path: `${OUT}/manager-kpi-strip.png` }); log.push({ file: 'manager-kpi-strip' }); }
    const top5 = p.locator('[data-testid="top-referrers"]');
    if (await top5.count()) { await top5.screenshot({ path: `${OUT}/manager-top-referrers.png` }); log.push({ file: 'manager-top-referrers' }); }
    await go(p, `${ALL}&group=referrer`);
    await shot(p, 'manager-grouped-b3-1440');
    await scrollPage(p, (await tableTop(p)) - 40); await p.waitForTimeout(500);
    await shot(p, 'manager-grouped-b3-1440-rows');
    await scrollPage(p, 0);
    const firstKey = await p.evaluate(() => document.querySelector('[data-testid="top-referrer-row"]')?.getAttribute('data-owner') || null);
    if (firstKey) { await go(p, `${ALL}&referrer=${encodeURIComponent(firstKey)}`); await shot(p, 'manager-filtered-one-referrer-1440'); log.push({ filteredBy: firstKey, topReferrersVisible: await p.locator('[data-testid="top-referrers"]').count() }); }
    await go(p, `${ALL}&q=${encodeURIComponent('Mary Test')}&range=all`);
    await shot(p, 'manager-mary-test-dash-1440');
    await go(p, `${ALL}&q=${encodeURIComponent('QA Tentrefer')}`);
    await shot(p, 'manager-search-qa-tentrefer-none-1440');
    log.push({ qaTentreferRows: await p.locator('[data-testid="referral-row"]').count() });
    await go(p, `${ALL}&view=cards`);
    await shot(p, 'manager-cards-1440');
    await go(p, ALL);
    await p.locator('[data-testid="kpi-joined"]').click().catch(() => {});
    await settle(p); await shot(p, 'manager-kpi-joined-selected-1440');
  }
  await r.ctx.close();
}

async function manager375(b) {
  const r = await login(b, MANAGER, { w: 375 });
  const p = r.p; await p.setViewportSize({ width: 375, height: 1500 });
  await go(p, ALL);
  await shot(p, 'manager-all-375');
  log.push({ w375_hscroll: await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) });
  await r.ctx.close();
}

async function lo(b, w) {
  const r = await login(b, LO, { w });
  const p = r.p; await p.setViewportSize({ width: w, height: w < 600 ? 1500 : 1000 });
  await go(p, '/my-referrals');
  await shot(p, `lo-mine-${w}`);
  if (w > 600) { await scrollRight(p); await p.waitForTimeout(500); await shot(p, `lo-mine-${w}-scrolled-right`); }
  await r.ctx.close();
}

(async () => {
  const b = await chromium.launch({ headless: true });
  for (const job of [manager1440, manager375, (x) => lo(x, 1440), (x) => lo(x, 375)]) {
    try { await job(b); } catch (e) { log.push({ error: e.message.slice(0, 200) }); }
  }
  await b.close();
  console.log(JSON.stringify(log, null, 1));
})();
