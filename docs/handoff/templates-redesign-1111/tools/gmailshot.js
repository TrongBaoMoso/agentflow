// Find a test email in Gmail (Chrome CDP 9345, logged in as bao.trinh@loanfactory.com) by subject and capture it as
// received: desktop (Gmail web, tall window so the whole message shows) + mobile (Gmail web at 390px, phone UA).
// usage: node gmailshot.js "<subject text>" <outPrefix>
const { chromium } = require('/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const [subject, out, idxArg] = process.argv.slice(2);
const IDX = idxArg === undefined ? -1 : Number(idxArg);
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9345');
  const ctx = b.contexts()[0];
  const p = await ctx.newPage();
  const s = await ctx.newCDPSession(p);
  const done = async (code) => { try { await s.detach(); } catch (e) { /* closed */ } await p.close(); process.exit(code); };
  try {
    await s.send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 2600, deviceScaleFactor: 1, mobile: false });
    const q = encodeURIComponent(`subject:"${subject}" newer_than:1d`);
    let url = null;
    for (let i = 0; i < 10 && !url; i++) {
      await p.goto(`https://mail.google.com/mail/u/0/#search/${q}`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4500);
      const row = p.locator('div[role="main"] tr.zA').first();
      if (await row.count()) { await row.click(); await p.waitForTimeout(3500); const m = p.url().match(/\/([A-Za-z0-9]{20,})$/); url = m ? `https://mail.google.com/mail/u/0/#all/${m[1]}` : p.url(); await p.goto(url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4500); } else await p.waitForTimeout(10000);
    }
    if (!url) { console.log('NOT_FOUND', subject); return done(2); }
    // expand a collapsed message if any, then capture the reading pane
    // a thread with 2 messages of the same subject: expand the one we want (older ones are collapsed)
    if (IDX >= 0) { const heads = p.locator('div[role="main"] div.adn, div[role="main"] div.kv'); const n = await heads.count(); if (n > IDX) { await heads.nth(IDX).click().catch(() => {}); await p.waitForTimeout(2000); } }
    const main = p.locator('div[role="main"]').first();
    // the newest message: open it if collapsed, then reveal Gmail's "trimmed content" (•••) so the whole body shows
    const msgs = p.locator('div[role="main"] div.adn');
    const n = await msgs.count();
    const target = IDX >= 0 && IDX < n ? msgs.nth(IDX) : msgs.last();
    for (const sel of ['div.ajR', 'img.ajT']) { const t = target.locator(sel).first(); if (await t.count() && await t.isVisible()) { await t.click().catch(() => {}); await p.waitForTimeout(1500); break; } }
    const mb = await main.boundingBox(); const tb = await target.boundingBox(); const hb0 = await p.locator('h2.hP').first().boundingBox();
    const top = Math.max(mb.y, (hb0 ? hb0.y : tb.y) - 12);
    await p.screenshot({ path: `${out}-desktop.png`, clip: { x: mb.x, y: top, width: mb.width, height: Math.min(tb.y + tb.height + 16, mb.y + mb.height) - top } });
    // phone: take the body exactly as Gmail rendered it (div.a3s, Gmail-sanitised HTML) and lay it out at 390px under a
    // Gmail-app-like header, in a separate headless browser (the real Gmail web UI has no phone layout).
    const msg = await p.evaluate((IDX) => {
      const all = [...document.querySelectorAll('div.a3s')]; const body = IDX >= 0 ? all[IDX] || all[all.length - 1] : all[all.length - 1];
      const subj = (document.querySelector('h2.hP') || {}).innerText || '';
      const from = (document.querySelector('span.gD') || {}).innerText || '';
      const email = (document.querySelector('span.gD') || { getAttribute: () => '' }).getAttribute('email') || '';
      const when = (document.querySelector('span.g3') || {}).innerText || '';
      // Gmail keeps the email's <head> styles, renamed (.msgNNN .m_NNNclass) in the page head: carry them over so the
      // phone render applies the same @media rules a phone Gmail app would.
      let css = '';
      if (body) { const c = [...body.querySelectorAll('[class]')].map((e) => String(e.className)).join(' ').match(/m_(-?\d+)/);
        if (c) css = [...document.querySelectorAll('style')].map((x) => x.textContent).filter((t) => t.includes('m_' + c[1])).join('\n'); }
      return { html: body ? body.outerHTML : '', subj, from, email, when, css };
    }, IDX);
    const hb = await require('/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright').chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    const mp = await (await hb.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: PHONE_UA, isMobile: true })).newPage();
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    await mp.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Roboto,Arial,sans-serif;background:#fff}.bar{height:52px;display:flex;align-items:center;gap:22px;padding:0 16px;border-bottom:1px solid #eee;color:#444;font-size:20px}.subj{font-size:21px;line-height:28px;padding:16px 16px 6px;color:#1f1f1f}.from{display:flex;gap:12px;align-items:center;padding:10px 16px 14px}.av{width:40px;height:40px;border-radius:50%;background:#7b8fd1;color:#fff;display:grid;place-items:center;font-size:17px}.nm{font-size:15px;color:#1f1f1f;font-weight:500}.sm{font-size:13px;color:#5f6368}.body{padding:0 8px 24px;overflow-x:auto}</style><style>${msg.css}</style></head><body>
      <div class="bar">&#8592;<span style="margin-left:auto">&#128465;</span><span>&#9993;</span><span>&#8942;</span></div>
      <div class="subj">${esc(msg.subj)}</div>
      <div class="from"><div class="av">${esc((msg.from || '?').trim()[0] || '?')}</div><div><div class="nm">${esc(msg.from)} <span class="sm">${esc(msg.when)}</span></div><div class="sm">to me</div></div></div>
      <div class="body">${msg.html}</div></body></html>`, { waitUntil: 'load' }).catch(() => {});
    await mp.waitForTimeout(2500);
    await mp.screenshot({ path: `${out}-mobile.png`, fullPage: true });
    await hb.close();
    console.log('OK', url);
    return done(0);
  } catch (e) { console.log('ERR', e.message); return done(1); }
})();
