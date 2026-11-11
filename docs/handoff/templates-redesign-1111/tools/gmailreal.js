// Capture a REAL app-sent email (not a [Test] send) from Gmail over Chrome CDP 9345, by recipient plus-address, and dump
// every link in its body. Writes <out>-desktop.png / <out>-mobile.png (the body as Gmail delivered it, div.a3s, laid out
// under a Gmail-style header at 964 px and 390 px: Gmail web threads real mails under older sends of the same subject) and <out>-links.json ([{text, href}]).
// usage: node gmailreal.js <to-address> <outPrefix> [subjectContains] [bodyContains]
// Gmail threads mails with the same subject; the thread is expanded and the message addressed to <to-address> is picked
// (newest one if several, the newest whose body contains [bodyContains], or with "#n" the n-th newest).
const PW = '/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright';
const { chromium } = require(PW);
const fs = require('fs');
const [to, out, subj, bodyHas] = process.argv.slice(2);
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9345');
  const ctx = b.contexts()[0];
  const p = await ctx.newPage();
  const s = await ctx.newCDPSession(p);
  const done = async (code) => { try { await s.detach(); } catch (e) { /* closed */ } await p.close(); process.exit(code); };
  try {
    await s.send('Emulation.setDeviceMetricsOverride', { width: 1360, height: 2600, deviceScaleFactor: 1, mobile: false });
    const q = encodeURIComponent(`in:anywhere to:${to} newer_than:2d` + (subj ? ` subject:"${subj}"` : ''));
    let opened = false;
    for (let i = 0; i < 6 && !opened; i++) {
      await p.goto(`https://mail.google.com/mail/u/0/#search/${q}`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(4500);
      const row = p.locator('div[role="main"] tr.zA').first();
      if (await row.count()) { await row.click(); await p.waitForTimeout(4000); opened = true; } else await p.waitForTimeout(8000);
    }
    if (!opened) { console.log('NOT_FOUND', to, subj || ''); return done(2); }
    // expand every message of the thread so each body (div.a3s) and its recipients render
    const ex = p.locator('[aria-label="Expand all"]').first();
    if (await ex.count() && await ex.isVisible().catch(() => false)) { await ex.click().catch(() => {}); await p.waitForTimeout(3000); }
    // fallback: open the "N older messages" bubble, then every collapsed message (div.kv) one by one
    for (let round = 0; round < 6; round++) {
      const bubble = p.locator('div[role="main"] span.adx, div[role="main"] div.adv').first();
      if (await bubble.count() && await bubble.isVisible().catch(() => false)) { await bubble.click().catch(() => {}); await p.waitForTimeout(2000); continue; }
      const kv = p.locator('div[role="main"] div.kv');
      const n = await kv.count();
      if (!n) break;
      for (let k = n - 1; k >= 0; k--) { await kv.nth(k).click().catch(() => {}); await p.waitForTimeout(700); }
      await p.waitForTimeout(1500);
    }
    const idx = await p.evaluate(([to, bodyHas]) => {
      const msgs = [...document.querySelectorAll('div[role="main"] div.adn')];
      // bodyHas "#n" = the n-th newest message to that address (two templates sharing one subject, sent in order)
      const nth = /^#\d+$/.test(bodyHas) ? Number(bodyHas.slice(1)) : 0;
      const hits = [];
      msgs.forEach((m, i) => {
        const rcpt = [...m.querySelectorAll('span[email]')].map((e) => (e.getAttribute('email') || '').toLowerCase());
        const body = m.querySelector('div.a3s');
        if (rcpt.includes(to.toLowerCase()) && body && (nth || !bodyHas || body.innerText.includes(bodyHas))) hits.push(i);
      });
      return hits.length ? hits[hits.length - Math.max(nth, 1)] ?? -1 : -1;
    }, [to, bodyHas || '']);
    if (idx < 0) { console.log('NO_MESSAGE_TO', to); return done(3); }
    const target = p.locator('div[role="main"] div.adn').nth(idx);
    for (const sel of ['div.ajR', 'img.ajT']) { const t = target.locator(sel).first(); if (await t.count() && await t.isVisible()) { await t.click().catch(() => {}); await p.waitForTimeout(1500); break; } }
    const msg = await p.evaluate((idx) => {
      const m = document.querySelectorAll('div[role="main"] div.adn')[idx];
      const body = m.querySelector('div.a3s');
      const links = [...body.querySelectorAll('a[href]')].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute('href'), alt: (a.querySelector('img') || {}).alt || '' }));
      const subj = (document.querySelector('h2.hP') || {}).innerText || '';
      const from = (m.querySelector('span.gD') || {}).innerText || '';
      const when = (m.querySelector('span.g3') || {}).innerText || '';
      let css = '';
      const c = [...body.querySelectorAll('[class]')].map((e) => String(e.className)).join(' ').match(/m_(-?\d+)/);
      if (c) css = [...document.querySelectorAll('style')].map((x) => x.textContent).filter((t) => t.includes('m_' + c[1])).join('\n');
      return { html: body.outerHTML, subj, from, when, css, links };
    }, idx);
    fs.writeFileSync(`${out}-links.json`, JSON.stringify({ to, subject: msg.subj, from: msg.from, when: msg.when, links: msg.links }, null, 1));
    const hb = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    const page = (w, mobile) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Roboto,Arial,sans-serif;background:#fff}.bar{height:52px;display:flex;align-items:center;gap:22px;padding:0 16px;border-bottom:1px solid #eee;color:#444;font-size:20px}.subj{font-size:${mobile ? 21 : 22}px;line-height:28px;padding:16px ${mobile ? 16 : 24}px 6px;color:#1f1f1f}.from{display:flex;gap:12px;align-items:center;padding:10px ${mobile ? 16 : 24}px 14px}.av{width:40px;height:40px;border-radius:50%;background:#7b8fd1;color:#fff;display:grid;place-items:center;font-size:17px}.nm{font-size:15px;color:#1f1f1f;font-weight:500}.sm{font-size:13px;color:#5f6368}.body{padding:0 ${mobile ? 8 : 72}px 24px;overflow-x:auto}</style><style>${msg.css}</style></head><body>
      <div class="bar">&#8592;<span style="margin-left:auto">&#128465;</span><span>&#9993;</span><span>&#8942;</span></div>
      <div class="subj">${esc(msg.subj)}</div>
      <div class="from"><div class="av">${esc((msg.from || '?').trim()[0] || '?')}</div><div><div class="nm">${esc(msg.from)} <span class="sm">${esc(msg.when)}</span></div><div class="sm">to ${mobile ? 'me' : esc(to)}</div></div></div>
      <div class="body">${msg.html}</div></body></html>`;
    for (const [w, mobile, sfx] of [[964, false, 'desktop'], [390, true, 'mobile']]) {
      const mc = await hb.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: mobile ? 2 : 1, userAgent: mobile ? PHONE_UA : undefined, isMobile: mobile });
      const mp = await mc.newPage();
      await mp.setContent(page(w, mobile), { waitUntil: 'load' }).catch(() => {});
      await mp.waitForTimeout(2500);
      await mp.screenshot({ path: `${out}-${sfx}.png`, fullPage: true });
      await mc.close();
    }
    await hb.close();
    console.log('OK', msg.subj, '|', msg.from, '|', msg.links.length, 'links');
    return done(0);
  } catch (e) { console.log('ERR', e.message); return done(1); }
})();
