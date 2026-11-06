// Before (staging) / after (local next dev :3311, GETs forwarded to staging, writes answered locally) for
// Bao 06/11: Today progress colour bands + Exceptions "Mark handled" modal. Nothing is written on staging.
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const LOCAL = 'http://localhost:3311'; const STG = 'https://recruit.viet18.com';
const settle = async (p, ms = 4000) => { await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(ms); };
async function localPage(b, token, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: 900 }, colorScheme: opts.dark ? 'dark' : 'light' });
  await ctx.route('**/recruit-svc/**', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() !== 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payload: null, error: null }) });
    const res = await fetch('https://gateway.viet18.com' + url.pathname + url.search, { headers: { authorization: 'Bearer ' + token } });
    let body = await res.text();
    if (opts.done != null && /\/today$/.test(url.pathname)) {
      const j = JSON.parse(body); const pl = j.payload || j; pl.progress = { done: opts.done, total: 18 }; body = JSON.stringify(j);
    }
    route.fulfill({ status: res.status, contentType: res.headers.get('content-type') || 'application/json', body });
  });
  // The local app reads its session from the same storage entry staging writes; seed it before any script runs.
  if (opts.auth) await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v) }, opts.auth);
  return { ctx, p: await ctx.newPage() };
}
const authEntry = (p) => p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const v = localStorage.getItem(k); if (v && v.includes('"accessToken"')) return [k, v]; } return null; });
async function shootProgress(p, file) {
  const card = p.locator('.rec-tprog').first();
  if (await card.count()) await card.screenshot({ path: file }); else console.log('no progress card', file);
}
async function openHandled(p) {
  const btn = p.getByRole('button', { name: /^Mark handled$/ }).first();
  await btn.waitFor({ timeout: 60000 }); await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(1500);
  return p.locator('.mantine-Modal-content').last();
}
(async () => {
  const b = await chromium.launch({ headless: true });
  const rec = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const recTok = rec.token; const recAuth = await authEntry(rec.p);
  // BEFORE: staging
  await rec.p.goto(STG + '/today', { waitUntil: 'domcontentloaded' }); await settle(rec.p, 6000);
  await shootProgress(rec.p, `${OUT}/before-progress.png`); await rec.ctx.close();
  const man = await login(b, 'bao.trinh+admin@loanfactory.com'); const manTok = man.token; const manAuth = await authEntry(man.p);
  await man.p.goto(STG + '/exceptions', { waitUntil: 'domcontentloaded' }); await settle(man.p, 6000);
  let m = await openHandled(man.p); await m.screenshot({ path: `${OUT}/before-modal.png` });
  await man.ctx.close();
  // AFTER: local, five bands
  for (const done of [6, 25, 70, 220]) {
    const { ctx, p } = await localPage(b, recTok, { auth: recAuth, done });
    await p.goto(LOCAL + '/today', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    await shootProgress(p, `${OUT}/after-progress-${done}.png`); await ctx.close();
  }
  { const { ctx, p } = await localPage(b, recTok, { auth: recAuth, done: 11, dark: true });
    await p.goto(LOCAL + '/today', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    await shootProgress(p, `${OUT}/after-progress-70-dark.png`); await ctx.close(); }
  // AFTER: modal
  for (const dark of [false, true]) {
    const { ctx, p } = await localPage(b, manTok, { auth: manAuth, dark });
    await p.goto(LOCAL + '/exceptions', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    m = await openHandled(p); const sfx = dark ? '-dark' : '';
    await m.screenshot({ path: `${OUT}/after-modal-empty${sfx}.png` });
    await p.getByRole('radio', { name: /Already handled in MOSO/ }).click(); await p.waitForTimeout(400);
    await p.mouse.move(5, 5); await m.screenshot({ path: `${OUT}/after-modal-picked${sfx}.png` });
    await p.getByRole('radio', { name: /^Other$/ }).click(); await p.waitForTimeout(400);
    await p.mouse.move(5, 5); await m.screenshot({ path: `${OUT}/after-modal-other${sfx}.png` });
    await ctx.close();
  }
  { const { ctx, p } = await localPage(b, manTok, { auth: manAuth, w: 375 });
    await p.goto(LOCAL + '/exceptions', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    await openHandled(p); await p.screenshot({ path: `${OUT}/after-modal-375.png` }); await ctx.close(); }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
