const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const Z1 = '0f192583-7d87-483d-9f52-6470de0d0951';
const ROLES = {
  'bao.trinh+recruiter@loanfactory.com': ['/today', '/today/focus', '/inbox/hot', '/inbox/cold', '/pipeline', '/pipeline?view=board', '/pipeline?view=card', '/invites', '/dormant', '/conversations', '/templates', '/my-referrals', '/settings/connections', '/candidates/' + Z1 + '?section=overview', '/candidates/' + Z1 + '?section=activity', '/candidates/' + Z1 + '?section=profile', '/pipeline?c=' + Z1],
  'bao.trinh+manager@loanfactory.com': ['/today', '/exceptions', '/reports', '/duplicates', '/audit', '/referrals', '/work'],
  'bao.trinh+onb-test@loanfactory.com': ['/today', '/work', '/checklist-templates', '/candidates/' + Z1 + '?section=overview'],
  'chauchau.inc@gmail.com': ['/settings', '/permissions', '/checklist-templates'],
  'bao.trinh+hh@loanfactory.com': ['/today', '/pipeline', '/invites'] };
const WIDTHS = [320, 375, 768, 1024, 1440];
const res = [];
const probe = () => {
  const out = { overflowX: document.documentElement.scrollWidth - window.innerWidth, clipped: [], rawKeys: [], english: [] };
  const els = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && e.childElementCount === 0 && (e.innerText || '').trim().length > 1);
  for (const e of els) {
    const cs = getComputedStyle(e); const t = e.innerText.trim();
    if (e.scrollWidth > e.clientWidth + 2 && (cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow !== 'ellipsis' && out.clipped.length < 8) out.clipped.push(t.slice(0, 50));
    const r = e.getBoundingClientRect(); if (r.right > window.innerWidth + 2 && cs.position !== 'fixed' && out.clipped.length < 8 && !e.closest('[style*="overflow"], .mantine-ScrollArea-root, table')) out.clipped.push('offscreen: ' + t.slice(0, 40));
    if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/.test(t) || /^[a-z]+(_[a-z]+){1,}$/.test(t)) out.rawKeys.push(t.slice(0, 50));
  }
  return out; };
(async () => {
  const b = await chromium.launch({ headless: true });
  for (const [email, routes] of Object.entries(ROLES)) { if (process.argv[2] && !process.argv[2].split(',').includes(email)) continue;
    let s; for (let k = 0; k < 3 && !s; k++) { try { s = await login(b, email); } catch (e) { res.push({ email, err: 'login try ' + k + ' ' + e.message.slice(0, 60) }); await new Promise(r => setTimeout(r, 15000)); } } if (!s) continue;
    const p = s.p; p.on('pageerror', e => res.push({ email, url: p.url(), pageerror: e.message.slice(0, 120) }));
    for (const r of routes) {
      for (const scheme of ['light', 'dark']) {
        await p.emulateMedia({ colorScheme: scheme });
        for (const w of WIDTHS) {
          if (scheme === 'dark' && ![375, 1440].includes(w)) continue;
          await p.setViewportSize({ width: w, height: 900 });
          try { await p.goto('https://recruit.viet18.com' + r, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { res.push({ email, r, w, err: 'goto' }); continue; }
          await p.waitForTimeout(w === WIDTHS[0] || scheme === 'dark' ? 6000 : 3500);
          const x = await p.evaluate(probe).catch(() => null);
          const tag = email.split('@')[0].replace(/[^a-z0-9]/gi, '') + '_' + r.replace(/[^a-z0-9]/gi, '_').slice(0, 40) + '_' + w + '_' + scheme;
          if (x && (x.overflowX > 2 || x.clipped.length || x.rawKeys.length) || w === 375 || w === 1440) await p.screenshot({ path: 'sweep/' + tag + '.png', fullPage: w <= 375 }).catch(() => {});
          res.push({ email, r, w, scheme, finalUrl: p.url().replace('https://recruit.viet18.com', ''), ...x });
        }
      }
    }
    // Vietnamese pass for this role at 1440 light
    await p.emulateMedia({ colorScheme: 'light' }); await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto('https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000); try { await p.getByRole('button', { name: /English/ }).first().click(); await p.waitForTimeout(800); await p.getByText(/Tiếng Việt/).first().click(); await p.waitForTimeout(3000); } catch (e) { res.push({ email, err: 'lang switch ' + e.message.slice(0, 60) }); }
    for (const r of routes.slice(0, 6)) {
      await p.goto('https://recruit.viet18.com' + r, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(4000);
      const en = await p.evaluate(() => { const words = ['Today','Pipeline','Overdue','Claim','Search','Save','Cancel','Loan officer','Next step','Status','Open','Done','Waiting']; const t = document.body.innerText; return { lang: document.documentElement.lang, hits: words.filter(w => new RegExp('\\b' + w + '\\b').test(t)) }; });
      res.push({ email, r, vi: true, ...en });
      await p.screenshot({ path: 'sweep/vi_' + email.split('@')[0].replace(/[^a-z0-9]/gi, '') + r.replace(/[^a-z0-9]/gi, '_').slice(0, 30) + '.png' }).catch(() => {});
    }
    
    await s.ctx.close();
  }
  fs.writeFileSync(process.argv[3] || 'sweep.json', JSON.stringify(res, null, 1)); await b.close(); console.log('done', res.length);
})();
