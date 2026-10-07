const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const Z5 = '68bc8416-6630-440f-9f64-1eb59a872e41'; const out = [];
const chk = (step, ok, note) => { out.push({ step, status: ok === null ? 'skip' : ok ? 'pass' : 'fail', note }); console.log(step, ok, note); };
const txt = async (p) => (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
const shot = (p, n) => p.screenshot({ path: 'shots/u2-' + n + '.png', fullPage: false }).catch(() => {});
(async () => { const b = await chromium.launch({ headless: true });
  const s = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const p = s.p;
  // Q4 malformed
  let r = await p.goto('https://recruit.viet18.com/candidates/%E0%A4%A', { waitUntil: 'domcontentloaded' }).catch(e => null); await p.waitForTimeout(6000);
  let t = await txt(p); await shot(p, 'q4');
  chk('Q4', !/500|Internal Server Error|Application error/i.test(t) && /Back/i.test(t), 'UI /candidates/%E0%A4%A: ' + t.slice(0, 160));
  // Q5 open redirect
  await p.goto('https://recruit.viet18.com/candidates/' + Z5 + '?from=' + encodeURIComponent('/%09/evil.com'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
  await p.getByText(/^Back$/).first().click().catch(() => {}); await p.waitForTimeout(3000);
  chk('Q5', /recruit\.viet18\.com/.test(p.url()), 'UI Back với from=/%09/evil.com → ' + p.url());
  // AA1 global search
  await p.goto('https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  const sb = p.getByPlaceholder(/Search candidates|Search everything/i).first();
  await sb.click().catch(() => {}); await p.keyboard.type('Claudenoanswer', { delay: 40 }); await p.waitForTimeout(4000);
  t = await txt(p); await shot(p, 'aa1');
  chk('AA1', /Claudenoanswer/.test(t), 'UI ô tìm toàn cục “Claudenoanswer”: ' + (/Claudenoanswer/.test(t) ? 'có kết quả' : 'không thấy kết quả'));
  await p.keyboard.press('Escape');
  // Q3 sections + Q7 edit modal invalid email, X3 negative in UI
  await p.goto('https://recruit.viet18.com/candidates/' + Z5 + '?section=profile', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
  t = await txt(p); chk('Q3', /Company & production|Identity/i.test(t) && /section=profile/.test(p.url()), 'UI ?section=profile mở mục Profile');
  const edit = p.getByRole('button', { name: /^Edit$/ }).first(); await edit.click().catch(() => {}); await p.waitForTimeout(2500);
  await shot(p, 'edit0');
  const em = p.locator('input[name=email], input[type=email]').first();
  if (await em.isVisible().catch(() => false)) {
    await em.fill('abc@'); await p.getByRole('button', { name: /^Save/ }).last().click().catch(() => {}); await p.waitForTimeout(2500);
    t = await txt(p); await shot(p, 'q7');
    chk('Q7', !/invalid_email|reason_required/.test(t), 'UI Edit profile email “abc@”: ' + (/invalid_email/.test(t) ? 'hiện khoá thô invalid_email' : (t.match(/[^.]{0,40}(valid|email)[^.]{0,60}/i) || [''])[0]));
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  } else chk('Q7', null, 'Không tìm thấy ô email trong Edit profile');
  await p.goto('https://recruit.viet18.com/candidates/' + Z5 + '?section=profile', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
  await p.getByRole('button', { name: /^Edit$/ }).first().click().catch(() => {}); await p.waitForTimeout(2000);
  await p.getByRole('tab', { name: /Production/ }).click().catch(() => {}); await p.waitForTimeout(1200);
  const units = p.getByLabel(/Closed units/i).first();
  if (await units.isVisible().catch(() => false)) {
    await units.fill('-1'); await p.getByRole('button', { name: /^Save/ }).last().click().catch(() => {}); await p.waitForTimeout(2500);
    t = await txt(p); await shot(p, 'x3');
    const saved = /Profile updated/.test(t);
    chk('X3', !saved, 'UI Closed units = -1: ' + (saved ? 'LƯU ĐƯỢC (thiếu kiểm tra)' : 'bị chặn: ' + (t.match(/[^.]{0,60}(must|least|positive|valid|0)[^.]{0,40}/i) || ['(không thấy chữ báo)'])[0]));
  } else chk('X3', null, 'Không mở được tab Production');
  // conversation modal: Team only + Show candidate activity + outside confirm
  await p.goto('https://recruit.viet18.com/candidates/' + Z5, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
  await p.getByRole('button', { name: /^Email$|Send email|email/i }).first().click().catch(() => {}); await p.waitForTimeout(5000);
  t = await txt(p); await shot(p, 'conv');
  chk('Y5', /Team only/.test(t) && /Candidate & parties/.test(t), 'UI hội thoại có tab Team only + Candidate & parties: ' + (/Team only/.test(t)) + '/' + (/Candidate & parties/.test(t)));
  fs.writeFileSync('ui_check2.json', JSON.stringify(out, null, 1)); await b.close(); })();
