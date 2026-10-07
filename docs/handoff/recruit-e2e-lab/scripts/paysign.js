const { chromium } = require('playwright'); const fs = require('fs');
const S = JSON.parse(fs.readFileSync('seeded.json'));
const ids = process.argv[2].split(','); const mode = process.argv[3] || 'both';
const log = (...a) => { const s = a.join(' '); console.log(s); fs.appendFileSync('paysign.log', s + '\n'); };
async function pay(ctx, p, lo) {
  const fr = p.frames().find(f => /paypal\.com.*smart\/buttons/.test(f.url()));
  if (!fr) throw new Error('no paypal buttons');
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), fr.locator('[data-funding-source="card"]').first().click()]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(6000);
  log(lo.id,'popup',pop.url().slice(0,60)); await pop.selectOption('select[name=country]', 'US'); await pop.waitForTimeout(5000); await pop.screenshot({ path: `shots/${lo.id}-pp-us.png`, fullPage: true }); globalThis.__pop = pop;
  const fill = async (n, v) => { log(lo.id,'fill',n); const el = pop.locator(`input[name=${n}]`).first(); await el.click(); await el.fill(''); await el.pressSequentially(v, { delay: 30 }); };
  await fill('cardnumber', '4032033814197955'); await fill('exp-date', '1230'); await fill('cvv', '123');
  await fill('fname', lo.fn); await fill('lname', lo.ln);
  await fill('billingLine1', '123 Test Street'); await fill('billingCity', 'Dallas');
  await pop.selectOption('select[name=billingState]', 'TX').catch(() => {});
  await fill('billingPostalCode', '75201');
  try { await pop.getByRole('button', { name: /yes, i accept/i }).click({ timeout: 3000 }); } catch {}
  const em = pop.getByLabel(/^email/i).first(); if (await em.isVisible().catch(() => false)) { await em.fill(lo.em); }
  const ph = pop.getByLabel(/phone number/i).first(); if (await ph.isVisible().catch(() => false)) { await ph.click(); await ph.pressSequentially('4085550100', { delay: 30 }); }
  for (let k = 0; k < 3; k++) {
    const pwv = await pop.getByText(/create password/i).first().isVisible().catch(() => false);
    if (!pwv) break;
    const t = pop.getByText(/save info & create your paypal account/i).first();
    await t.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await t.boundingBox(); const vw = (pop.viewportSize() || { width: 568 }).width;
    if (bb) await pop.mouse.click(Math.min(vw - 30, bb.x + bb.width + 70), bb.y + bb.height / 2);
    await pop.waitForTimeout(1500);
  }
  log(lo.id, 'pw visible after', await pop.getByText(/create password/i).first().isVisible().catch(() => 'x'));
  await pop.screenshot({ path: `shots/${lo.id}-pp-filled.png`, fullPage: true });
  await pop.getByRole('button', { name: /pay now/i }).last().click();
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(3000);
    if (pop.isClosed()) break;
    const use = pop.getByText(/use the address you entered/i).first();
    if (await use.isVisible().catch(() => false)) { await use.click(); await pop.waitForTimeout(800); const c = pop.getByRole('button', { name: /continue/i }).first(); if (await c.isVisible().catch(() => false)) await c.click(); }
    const pw = pop.locator('input[name=disabledPassword], input[type=password]').first();
    if (i === 6) await pop.screenshot({ path: `shots/${lo.id}-pp-mid.png`, fullPage: true }).catch(() => {});
  }
  await p.waitForTimeout(6000);
  const t = (await p.innerText('body')).replace(/\s+/g, ' ');
  const ok = /payment successful/i.test(t); log(lo.id, 'PAY', ok ? 'OK' : 'NOT-CONFIRMED');
  await p.screenshot({ path: `shots/${lo.id}-after-pay.png`, fullPage: true });
  if (!pop.isClosed()) await pop.screenshot({ path: `shots/${lo.id}-pp-end.png`, fullPage: true }).catch(() => {});
  return ok;
}
async function sign(ctx, p, lo) {
  await p.goto('https://www.viet18.com/register-loan-officer?key=' + lo.key + '&selectTab=Review%20and%20Sign%20agreement', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForTimeout(12000);
  const t = (await p.innerText('body')).replace(/\s+/g, ' '); const m = t.match(/tentatively classified as:?\s*[^.]{0,60}/i); log(lo.id, 'CLASS', m && m[0]);
  const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), p.getByText(/click here to sign documents/i).first().click()]);
  await tab.waitForLoadState('domcontentloaded'); await tab.waitForTimeout(10000);
  for (let k = 0; k < 30; k++) {
    const body = (await tab.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
    if (/finished signing|successfully completed your signing/i.test(body)) break;
    const sub = tab.locator('#submit:visible').first();
    if (await sub.isVisible().catch(() => false)) { const smp = tab.locator('input[name=sample]:visible'); if (await smp.count() && !(await smp.first().inputValue())) await smp.first().fill(lo.fn + ' ' + lo.ln); await sub.click({ timeout: 5000 }).catch(e => log(lo.id, 'subfail', e.message.slice(0,60))); log(lo.id, 'submit'); await tab.waitForTimeout(2500); continue; }
    const box = tab.locator('#click-here-to-sign:visible').first();
    if (await box.count()) { await box.scrollIntoViewIfNeeded().catch(() => {}); await box.click().catch(() => {}); log(lo.id, 'box'); await tab.waitForTimeout(1800); continue; }
    const c = tab.locator('#ctrl_action_btn'); if (await c.isVisible().catch(() => false)) { log(lo.id, 'ctrl', await c.innerText()); await c.click({ timeout: 5000 }).catch(() => {}); await tab.waitForTimeout(3000); continue; }
    await tab.waitForTimeout(2000);
  }
  await tab.screenshot({ path: `shots/${lo.id}-tab-end.png` }).catch(() => {});
  const tt = (await tab.innerText('body')).replace(/\s+/g, ' ');
  const ok = /finished signing|successfully completed your signing/i.test(tt); log(lo.id, 'SIGN', ok ? 'OK' : 'NOT-CONFIRMED', tt.slice(0, 200));
  await tab.screenshot({ path: `shots/${lo.id}-sign-end.png`, fullPage: true });
  return ok;
}
(async () => {
  fs.mkdirSync('shots', { recursive: true });
  const b = await chromium.launch({ headless: true });
  for (const id of ids) {
    const lo = S[id]; const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, locale: 'en-US', timezoneId: 'America/Chicago' }); const p = await ctx.newPage();
    try {
      if (mode !== 'sign') {
        await p.goto('https://www.viet18.com/register-loan-officer?key=' + lo.key, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(12000);
        try { await p.locator('#accept-cookies-button').click({ timeout: 3000 }); } catch {}
        await pay(ctx, p, lo);
      }
      if (mode !== 'pay') await sign(ctx, p, lo);
    } catch (e) { log(id, 'ERR', e.message.split('\n')[0]); if (globalThis.__pop && !globalThis.__pop.isClosed()) await globalThis.__pop.screenshot({ path: `shots/${id}-pop-err.png`, fullPage: true }).catch(() => {}); await p.screenshot({ path: `shots/${id}-err.png`, fullPage: true }).catch(() => {}); }
    await ctx.close();
  }
  await b.close();
})();
