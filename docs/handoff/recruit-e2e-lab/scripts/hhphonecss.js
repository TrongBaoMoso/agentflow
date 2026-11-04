// Preview a CSS fix on staging without deploying: injects the given CSS file into /inbox/hot at 375px (read-only).
const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const [OUT, CSS, EMAIL] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME || undefined });
  for (const dark of [false, true]) {
    const r = await login(b, EMAIL || 'bao.trinh+hh@loanfactory.com'); const p = r.p;
    await p.setViewportSize({ width: 375, height: 900 });
    if (dark) await p.emulateMedia({ colorScheme: 'dark' });
    await p.goto('https://recruit.viet18.com/inbox/hot', { waitUntil: 'domcontentloaded' });
    await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}); await p.waitForTimeout(6000);
    await p.addStyleTag({ content: fs.readFileSync(CSS, 'utf8') }); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/phone-fix${dark ? '-dark' : ''}.png`, fullPage: true });
    await r.ctx.close();
  }
  await b.close(); console.log('done');
})();
