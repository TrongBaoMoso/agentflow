const { chromium } = require('playwright'); const fs = require('fs'); const S = __dirname;
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  for (const mode of ['manager', 'viewer']) for (const w of [1440, 375]) {
    fs.writeFileSync(S + '/mode.txt', mode);
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    await p.goto('http://localhost:3007/work?dept=ONBOARDING', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const btn = p.getByRole('button', { name: /pick a specialist/i }).first();
    await btn.waitFor({ timeout: 60000 }).catch(async (e) => { await p.screenshot({ path: S + "/shots/debug.png" }); throw e; }); await btn.click();
    const input = p.getByRole('dialog').getByRole('textbox'); await input.waitFor(); await p.waitForTimeout(2500); await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await input.click({ timeout: 15000 }).catch(async (e) => { await p.screenshot({ path: S + "/shots/debug.png" }); throw e; }); await p.waitForTimeout(800);
    await p.screenshot({ path: `${S}/shots/picker-${mode}-${w}.png` });
    await p.getByText('Assign the onboarding specialist').click(); await p.waitForTimeout(600);
    await p.screenshot({ path: `${S}/shots/hold-row-${mode}-${w}.png` });
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
