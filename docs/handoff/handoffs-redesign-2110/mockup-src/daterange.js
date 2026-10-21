// Screenshots of the date-range filter in Tera (communication activity) and the HR app (attendance report), staging.
const fs = require('fs');
const { chromium } = require('playwright');
const { login } = require('/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/auth');

const OUT = process.argv[2];
const HR_EMAIL = process.argv[3];
const TERA_EMAILS = process.argv.slice(4);

const settle = async (p, ms) => {
  await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(ms);
};

const dismiss = async (p) => {
  for (const name of [/^Skip$/, /^Not right now$/, /^Close$/]) {
    const btn = p.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await p.waitForTimeout(800);
    }
  }
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
};

const dumpControls = async (p, file) =>
  fs.writeFileSync(file, (await p.locator('button, input').evaluateAll((els) =>
    els.slice(0, 120).map((e) => `${e.tagName} | ${e.getAttribute('aria-label') || ''} | ${(e.innerText || e.value || e.placeholder || '').replace(/\s+/g, ' ').slice(0, 60)}`))).join('\n'));

const hr = async (b) => {
  const url = 'https://hr.viet18.com/attendance?tab=report';
  const { ctx, p } = await login(b, HR_EMAIL, { app: url });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await settle(p, 5000);
  await dismiss(p);
  await dismiss(p);
  await p.screenshot({ path: `${OUT}/hr-1-closed.png` });
  await p.locator('[role="group"] button').filter({ hasText: /\d{4}/ }).first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/hr-2-open.png` });
  await dumpControls(p, `${OUT}/hr-open-controls.txt`);
  await ctx.close();
};

const tera = async (b) => {
  const url = 'https://tera.viet18.com/communication-activity';
  for (const email of TERA_EMAILS) {
    try {
      const { ctx, p } = await login(b, email, { app: url });
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await settle(p, 7000);
      console.log('tera', email, p.url());
      await dismiss(p);
      await p.screenshot({ path: `${OUT}/tera-1-closed.png` });
      await dumpControls(p, `${OUT}/tera-controls.txt`);
      const picker = p.locator('button.mantine-DatePickerInput-input, [class*="DatePickerInput-input"]').first();
      if (await picker.count()) {
        await picker.click();
        await p.waitForTimeout(1500);
        await p.screenshot({ path: `${OUT}/tera-2-open.png` });
      } else {
        console.log('tera: no DatePickerInput on', p.url());
      }
      await ctx.close();
      return;
    } catch (e) {
      console.log('tera', email, 'ERR', e.message.split('\n')[0]);
    }
  }
};

(async () => {
  const b = await chromium.launch({ headless: true });
  await hr(b).catch((e) => console.log('hr ERR', e.message.split('\n')[0]));
  await tera(b);
  await b.close();
})();
