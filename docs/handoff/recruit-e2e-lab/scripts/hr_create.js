const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const [name, workEmail, mode] = process.argv.slice(2);
const log = (...a) => { const s = a.join(' '); console.log(s); fs.appendFileSync('hr.log', s + '\n'); };
(async () => { const b = await chromium.launch({ headless: true });
  const s = await login(b, 'chauchau.inc@gmail.com', { app: 'https://hr.viet18.com/associates/new' }); const p = s.p;
  await p.goto('https://hr.viet18.com/associates/new', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
  for (const n of [/^skip$/i, /^close$/i, /got it/i]) { try { await p.getByRole('button', { name: n }).first().click({ timeout: 2000 }); } catch {} }
  try { await p.getByRole('button', { name: 'Close the assistant' }).click({ timeout: 2000 }); } catch {}
  await p.getByPlaceholder('Name').fill(name); await p.waitForTimeout(5000);
  await p.getByRole('button', { name: 'Row actions' }).first().click(); await p.waitForTimeout(1000);
  await p.getByRole('menuitem', { name: /review/i }).click(); await p.waitForTimeout(6000);
  log(name, 'URL', p.url());
  const vals = async (t) => log(name, t, JSON.stringify(await p.$$eval('main input', els => els.filter(e => e.offsetParent && e.type !== 'radio').map(e => [(e.closest('[class*=InputWrapper],div')?.querySelector('label')?.innerText || e.placeholder || '').trim().slice(0, 30), e.value]))));
  await vals('STEP1'); await p.screenshot({ path: `shots/hr-${name}-1.png`, fullPage: true });
  const we = p.getByPlaceholder('first.last@loanfactory.com'); await we.fill(workEmail);
  for (let st = 2; st <= 4; st++) {
    await p.getByRole('button', { name: /^next$/i }).last().click(); await p.waitForTimeout(3000);
    await vals('STEP' + st); await p.screenshot({ path: `shots/hr-${name}-${st}.png`, fullPage: true });
    const body = (await p.innerText('main')).replace(/\s+/g, ' ');
    if (/licen/i.test(body) && st === 3) log(name, 'LIC TEXT', body.slice(body.search(/licen/i) - 100, body.search(/licen/i) + 600));
    if (mode === 'probe') continue;
    if (st === 3) {
      const lic = p.getByPlaceholder('Choose a license').first();
      await lic.click(); await p.waitForTimeout(1000);
      const opts = await p.$$eval('[role=option]', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
      log(name, 'LIC OPTIONS', JSON.stringify(opts));
      await p.getByRole('option', { name: /Mortgage Company License/i }).first().click(); await p.waitForTimeout(800);
      const cells = p.locator('main table tbody tr').first().locator('button, input');
      const exp = p.locator('main table tbody tr').first().locator('td').nth(4).locator('button, input').first();
      await exp.click(); await p.waitForTimeout(1000);
      const di = p.getByPlaceholder('mm/dd/yyyy').last(); await di.fill('12/31/2026'); await di.press('Enter');
      await p.waitForTimeout(800); await p.keyboard.press('Escape');
      await p.screenshot({ path: `shots/hr-${name}-3b.png`, fullPage: true });
      await p.getByRole('button', { name: /^back$/i }).count();
    }
  }
  log(name, 'END', (await p.innerText('main')).replace(/\s+/g, ' ').slice(0, 500));
  if (mode !== 'probe') { const c = p.getByRole('button', { name: /create associate/i }).first(); log(name, 'create enabled', await c.isEnabled().catch(() => 'x')); if (await c.isEnabled().catch(() => false)) { await c.click(); await p.waitForTimeout(8000); log(name, 'AFTER', p.url(), (await p.innerText('body')).replace(/\s+/g, ' ').match(/Associate created[^.]{0,40}/i)?.[0] || 'no toast'); await p.screenshot({ path: `shots/hr-${name}-done.png`, fullPage: true }); } }
  await b.close(); })();
