// agentflow-1hn6r (D573): staging screenshots of Exceptions "first sight" section + candidate marker. Read-only.
// usage: node firstsightshots.js <outDir> [candidateId]
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const CAND = process.argv[3]; const STG = 'https://recruit.viet18.com';
const settle = async (p, ms = 5000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
(async () => {
  const b = await chromium.launch({ headless: true });
  const man = await login(b, 'bao.trinh+admin@loanfactory.com');
  const st = await man.ctx.storageState(); await man.ctx.close();
  for (const [w, dark] of [[1440, false], [1440, true], [375, false], [375, true]]) {
    const ctx = await b.newContext({ storageState: st, viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage(); let fs = null;
    p.on('response', async (r) => { if (/\/exceptions\/first-sight$/.test(new URL(r.url()).pathname)) { try { fs = await r.json(); } catch {} } });
    await p.goto(STG + '/exceptions', { waitUntil: 'domcontentloaded' }); await settle(p);
    const tag = `${w}-${dark ? 'dark' : 'light'}`;
    const pl = fs && (fs.payload || fs);
    console.log(tag, 'first-sight total', pl && pl.total, 'items', pl && pl.items && pl.items.length,
      'ids', pl && pl.items ? JSON.stringify(pl.items.map((i) => ({ id: i.id || i.review_id, cand: i.candidate_id, kind: i.kind }))) : '');
    const sec = p.locator('section[aria-labelledby="exc-first-sight-h"]');
    if (await sec.count()) { await sec.scrollIntoViewIfNeeded(); await sec.screenshot({ path: `${OUT}/section-${tag}.png` }); }
    else console.log(tag, 'no first-sight section rendered');
    await p.screenshot({ path: `${OUT}/exceptions-${tag}.png`, fullPage: false });
    if (w === 375) { const ow = await p.evaluate(() => document.documentElement.scrollWidth); console.log(tag, 'scrollWidth', ow); }
    if (CAND) {
      await p.goto(STG + '/candidates?candidate=' + CAND, { waitUntil: 'domcontentloaded' }); await settle(p, 7000);
      const mk = p.locator('[role="note"]:has-text("MOSO")').first();
      if (await mk.count()) { await mk.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/marker-${tag}.png` }); } else { console.log(tag, 'marker not found'); await p.screenshot({ path: `${OUT}/drawer-${tag}.png` }); }
    }
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
