// Open the pages an email's buttons lead to, without completing any step, and photograph them at 1440 and 390.
// usage: node landshot.js <jobs.json>   jobs = [{url, out, wait?, state?, scrollTo? (exact text of an element)}]   (out = path prefix; writes <out>-d.png, <out>-m.png, <out>-info.json)
// A SendGrid click-tracking URL is first resolved by hand (redirect: manual) so the info file records the real target.
// One headless Chrome, one context per width.
const { chromium } = require('/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const fs = require('fs');
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const WAIT_MS = 3000;

async function resolve(url) {
  let u = url;
  for (let i = 0; i < 6 && /ct\.sendgrid\.net|google\.com\/url/.test(u); i++) {
    let r;
    for (let t = 0; t < 4 && !r; t++) { r = await fetch(u, { redirect: 'manual' }).catch(() => null); if (!r) await new Promise((z) => setTimeout(z, 3000)); }
    if (!r) throw new Error('could not resolve ' + u.slice(0, 60));
    const loc = r.headers.get('location');
    if (!loc) break;
    u = new URL(loc, u).toString();
  }
  return u;
}

async function shoot(ctx, url, file, wait, scrollTo) {
  const p = await ctx.newPage();
  const net = [];
  p.on('response', (r) => { if (/recruit-svc|onboarding|public\/api/.test(r.url())) net.push(`${r.status()} ${r.request().method()} ${r.url().replace(/([?&](invite|t|r|token)=)[^&]+/g, '$1…')}`); });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => net.push('GOTO ' + e.message.slice(0, 80)));
  await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  // the sign-up portal fades in after its profile calls: wait for its step rail (or any other page's text) to settle
  for (let i = 0, last = -1; i < 10; i++) { const n = await p.evaluate(() => document.body.innerText.length).catch(() => 0); if (n === last && n > 400) break; last = n; await p.waitForTimeout(1500); }
  await p.waitForTimeout(wait || WAIT_MS);
  // the sign-up portal opens with a long intro; scroll so its step list and the open step are in the picture
  if (scrollTo) await p.evaluate((t) => { const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === t); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -110); } }, scrollTo).catch(() => {});
  await p.waitForTimeout(800);
  await p.screenshot({ path: file });
  const info = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const heads = [...document.querySelectorAll('h1,h2,h3,[role=heading]')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 12);
    const fields = [...document.querySelectorAll('input,select,textarea')].filter(vis)
      .map((e) => ({ name: e.name || e.id || e.getAttribute('aria-label') || '', type: e.type, value: e.type === 'password' ? '' : String(e.value || '').slice(0, 60) }))
      .filter((f) => f.type !== 'hidden').slice(0, 30);
    return { title: document.title, heads, fields, text: document.body.innerText.slice(0, 1500) };
  }).catch((e) => ({ error: e.message }));
  const final = p.url();
  await p.close();
  return { final, net: net.slice(0, 20), ...info };
}

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2]));
  const b = await chromium.launch({ headless: !process.env.HEADED, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const d = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: PHONE_UA, isMobile: true, hasTouch: true });
  for (const j of jobs) {
    try {
      const target = await resolve(j.url);
      // a staff page (Recruit) needs a signed-in staff context: j.state = a Playwright storageState file (auth.js keeps one per account)
      const dc = j.state ? await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: j.state }) : d;
      const mc = j.state ? await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: PHONE_UA, isMobile: true, hasTouch: true, storageState: j.state }) : m;
      const di = await shoot(dc, target, `${j.out}-d.png`, j.wait, j.scrollTo);
      const mi = await shoot(mc, target, `${j.out}-m.png`, j.wait, j.scrollTo);
      if (j.state) { await dc.close(); await mc.close(); }
      fs.writeFileSync(`${j.out}-info.json`, JSON.stringify({ url: j.url, target, desktop: di, mobile: { final: mi.final, heads: mi.heads } }, null, 1));
      console.log('OK', j.out, '→', di.final.replace(/([?&](invite|t|r)=)[^&]+/, '$1…'), '|', (di.heads || []).slice(0, 3).join(' / '));
    } catch (e) { console.log('ERR', j.out, e.message.slice(0, 160)); }
  }
  await b.close();
})();
