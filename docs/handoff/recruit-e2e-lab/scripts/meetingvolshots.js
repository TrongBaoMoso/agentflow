// Before (staging) / after (local next dev :3312) for Bao 06/11: Volume in the "Mark the 1-1 meeting done" Experience card.
// GETs forwarded to staging, writes answered locally; nothing is written on staging.
const { chromium } = require('playwright'); const { login } = require('./auth');
const OUT = process.argv[2]; const LOCAL = 'http://localhost:3312'; const STG = 'https://recruit.viet18.com';
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
    if (opts.cand && /\/candidates\/[^/]+$/.test(url.pathname)) {
      const j = JSON.parse(body); const pl = j.payload || j; Object.assign(pl, opts.cand(pl)); body = JSON.stringify(j);
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
async function openMeeting(p) {
  const btns = p.getByRole('button', { name: /^Mark done/ });
  await btns.first().waitFor({ timeout: 60000 });
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    await btns.nth(i).scrollIntoViewIfNeeded(); await btns.nth(i).click(); await p.waitForTimeout(2500);
    const m = p.locator('.mantine-Modal-content').filter({ hasText: 'Mark the 1-1 meeting done' });
    if (await m.count()) { await p.waitForTimeout(2000); return m.last(); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  }
  throw new Error('no 1-1 meeting row');
}
(async () => {
  const b = await chromium.launch({ headless: true });
  const who = process.argv[3] || 'bao.trinh+admin@loanfactory.com';
  const r = await login(b, who); const tok = r.token; const auth = await authEntry(r.p);
  await r.p.goto(STG + '/today', { waitUntil: 'domcontentloaded' }); await settle(r.p, 6000);
  let m = await openMeeting(r.p); await m.screenshot({ path: `${OUT}/before-meeting.png` }); await r.ctx.close();
  for (const dark of [false, true]) {
    const { ctx, p } = await localPage(b, tok, { auth, dark });
    await p.goto(LOCAL + '/today', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    m = await openMeeting(p); await m.screenshot({ path: `${OUT}/after-meeting${dark ? '-dark' : ''}.png` }); await ctx.close();
  }
  { const { ctx, p } = await localPage(b, tok, { auth, w: 375 });
    await p.goto(LOCAL + '/today', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    await openMeeting(p); await p.screenshot({ path: `${OUT}/after-meeting-375.png`, fullPage: false }); await ctx.close(); }
  // Simulated figures (marked in the review page): the masked band an onboarding specialist gets, and an exact figure.
  const exp = (pl) => ({ ...pl.experience_level, level: 'INEXPERIENCED', loans_since_anchor: 4, units12mo: 3, loans_since_year: 2022 });
  for (const [name, extra] of [['band', { career_production: null, production_band: 'FROM_1M_TO_3M' }], ['exact', { career_production: 1500000, production_band: null }]]) {
    const { ctx, p } = await localPage(b, tok, { auth, cand: (pl) => ({ experience_level: exp(pl), ...extra }) });
    await p.goto(LOCAL + '/today', { waitUntil: 'domcontentloaded', timeout: 240000 }); await settle(p, 6000);
    m = await openMeeting(p); await m.screenshot({ path: `${OUT}/after-meeting-${name}.png` }); await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
