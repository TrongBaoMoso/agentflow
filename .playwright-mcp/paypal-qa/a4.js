async (page) => {
  const A = { card: '378282246310005', cvv: '1234', tag: 'a4-amex3782' };
  const URLP = 'https://www.viet18.com/register-loan-officer?key=ahNzfmxlbmRlcnJhdGUtbWFzdGVychcLEgxMT1JlY3J1aXRpbmcY1cWey4QBDKIBEDU3MTYxMDQwMjY1MjE2MDA';
  await page.goto(URLP);
  await page.waitForSelector('iframe[name^="__zoid__paypal_buttons"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  const pp = page.frames().find(f => /^https:\/\/www\.sandbox\.paypal\.com\/smart\/buttons/.test(f.url()));
  if (!pp) throw new Error('no sandbox buttons frame');
  await pp.locator('[data-funding-source="card"]').first().click();
  let cf = null;
  for (let i = 0; i < 20 && !cf; i++) { await page.waitForTimeout(500); cf = page.frames().find(f => /smart\/card-fields/.test(f.url())); }
  await cf.waitForSelector('#credit-card-number', { timeout: 20000 });
  const origin = await cf.evaluate(() => location.origin);
  if (origin !== 'https://www.sandbox.paypal.com') throw new Error('NOT SANDBOX: ' + origin);
  const token = (cf.url().match(/token=([^&]+)/) || [])[1];
  const t = (sel, v, d = 25) => cf.locator(sel).pressSequentially(v, { delay: d });
  await t('#email', 'qa.paypal@loanfactory-test.invalid');
  await t('#credit-card-number', A.card, 40);
  await t('#expiry-date', '1230', 60);
  await t('#credit-card-security', A.cvv, 60);
  await t('#billingAddress\\.givenName', 'Qa');
  await t('#billingAddress\\.familyName', 'Tester');
  await t('#billingAddress\\.line1', '123 Test St');
  await t('#billingAddress\\.city', 'San Jose');
  await cf.locator('#billingAddress\\.state').selectOption('CA');
  await t('#billingAddress\\.postcode', '95132', 30);
  await t('#phone', '4085550123', 30);
  await page.waitForTimeout(1500);
  const fl = cf.getByRole('checkbox', { name: /Fastlane/i });
  const n = await fl.count();
  if (n && await fl.first().isChecked()) await fl.first().uncheck({ force: true });
  await page.waitForTimeout(500);
  const fastlaneAfter = n ? await fl.first().isChecked() : 'absent';
  const last4 = (await cf.locator('#credit-card-number').inputValue()).slice(-4);
  await cf.locator('#submit-button').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/Users/apple/Projects/agentflow/.playwright-mcp/paypal-qa/06-${A.tag}-filled.png` });
  const log = [], ppErr = [], cons = [];
  const onResp = async r => {
    const u = r.url();
    if (/viet18\.com/.test(u) && !/_next\/(static|image)|\.(js|css|png|jpg|svg|woff2?|webp)(\?|$)|_rsc=/.test(u)) { let body = ''; try { body = (await r.text()).slice(0, 800); } catch (e) {} log.push({ m: r.request().method(), s: r.status(), u: u.slice(0, 160), req: (r.request().postData() || '').slice(0, 500), body }); }
    else if (/paypal\.com\/(graphql|v2\/checkout|smart\/api)/.test(u)) { let body = ''; try { body = await r.text(); } catch (e) {} if (/error|declin|INSTRUMENT|COMPLIANCE|RISK/i.test(body) || r.status() >= 400) ppErr.push({ s: r.status(), u: u.slice(0, 120), body: body.slice(0, 700) }); }
  };
  const onCons = m => { if (/error|declin|approve|capture/i.test(m.text())) cons.push(m.type() + ': ' + m.text().slice(0, 250)); };
  page.on('response', onResp); page.on('console', onCons);
  await cf.locator('#submit-button').click();
  let declined = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const still = page.frames().find(f => /smart\/card-fields/.test(f.url()));
    if (still) { try { declined = await still.evaluate(() => (document.body.innerText.match(/[^\n]*declin[^\n]*/i) || [null])[0]); } catch (e) {} }
    if (declined || log.some(l => /InterestedLoanOfficer/i.test(l.u + l.req))) break;
  }
  await page.waitForTimeout(6000);
  page.off('response', onResp); page.off('console', onCons);
  await page.screenshot({ path: `/Users/apple/Projects/agentflow/.playwright-mcp/paypal-qa/07-${A.tag}-result.png` });
  return { tag: A.tag, origin, token, last4, fastlaneAfter, declined, log, ppErr, cons };
}
