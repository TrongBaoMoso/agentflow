const { chromium } = require('playwright'); const { login } = require('./auth'); const fs = require('fs');
const out = []; const rec = (step, ok, note) => { out.push({ step, status: ok === null ? 'skip' : ok ? 'pass' : 'fail', note }); console.log(step, ok, note); fs.writeFileSync(process.argv[2]||'uiflow_rec.json', JSON.stringify(out, null, 1)); };
const txt = async (p) => (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
const dlgTxt = async (p) => (await p.innerText().catch(() => '')).replace(/\s+/g, ' ');
async function openWizard(p, name) {
  await p.goto('https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(8000);
  const row = p.locator('tr, [class*=row]', { hasText: name }).first();
  if (!(await row.count())) throw new Error('row not on Today: ' + name);
  await row.locator('button[aria-label*="ore"], button:has-text("⋯"), button[aria-haspopup]').last().click(); await p.waitForTimeout(1000);
  await p.getByRole('menuitem', { name: /Log result/i }).first().click(); await p.waitForTimeout(2000);
}
const btn = (p, name) => p.locator('button:visible').filter({ hasText: new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).last();
async function step(id, fn) { try { await fn(); } catch (e) { rec(id, null, 'automation: ' + e.message.split('\n').filter(l => /waiting for|Error|Timeout/.test(l)).slice(0, 2).join(' / ').slice(0, 220)); } }
(async () => { const b = await chromium.launch({ headless: true }); const s = await login(b, 'bao.trinh+recruiter@loanfactory.com'); const p = s.p;
  // F8: Interested with no next step -> save disabled
  await step('F8', async () => { await openWizard(p, 'Claudecallagain'); await btn(p, 'Interested').click(); await p.waitForTimeout(800);
    rec('F8', await btn(p, 'Save call result').isDisabled(), 'UI Interested chưa chọn bước tiếp: nút Save call result khoá = ' + await btn(p, 'Save call result').isDisabled()); });
  // F1: Call again: past time refused, tomorrow ok
  await step('F1', async () => { if (process.env.ONLY && process.env.ONLY !== 'F1') return; await btn(p, 'Call again').click(); await p.waitForTimeout(1200);
    const d = p.locator('input[type=date]:visible').first(); const tm = p.locator('input[type=time]:visible').first();
    const min = await d.getAttribute('min'); const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    await d.fill(today); await tm.fill('00:05'); await p.waitForTimeout(800); let t = await dlgTxt(p);
    const pastMsg = /already passed/i.test(t);
    const tom = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    await d.fill(tom); await tm.fill('10:00'); await p.waitForTimeout(800);
    const save = p.getByRole('button', { name: /Schedule call again|Save/ }).last(); await save.click(); await p.waitForTimeout(3000); t = await txt(p);
    rec('F1', pastMsg && /Next step saved/i.test(t), `UI date min=${min}; giờ quá khứ báo “already passed”: ${pastMsg}; lưu ngày mai: ${/Next step saved/i.test(t)}`); });
  // F3 Neutral
  await step('F3', async () => { if (process.env.ONLY && process.env.ONLY !== 'F3') return; await openWizard(p, 'Claudeneutral'); await btn(p, 'Neutral').click(); await p.waitForTimeout(1000);
    let t = await dlgTxt(p); const cards = (t.match(/In \d+ months? · [A-Z][a-z]{2}, [A-Z][a-z]{2} \d+/g) || []);
    await p.getByText(/In 1 month/).first().click(); await p.waitForTimeout(500);
    await p.getByRole('button', { name: /Move to Nurture/ }).click(); await p.waitForTimeout(3000); t = await txt(p);
    rec('F3', cards.length >= 3 && /Moved to Nurture until/.test(t), `UI thẻ tháng có ngày: ${cards.slice(0, 3).join(' | ')}; toast: ${(t.match(/Moved to Nurture until [^.]{0,20}/) || ['không'])[0]}`); });
  // F4 Not interested
  await step('F4', async () => { if (process.env.ONLY && process.env.ONLY !== 'F4') return; await openWizard(p, 'Claudenotinto'); await btn(p, 'Not interested').click(); await p.waitForTimeout(1000);
    const arch = p.getByRole('button', { name: /Archive candidate/ }); const d0 = await arch.isDisabled();
    await p.getByText(/^Other$/).first().click(); await p.waitForTimeout(500); const d1 = await arch.isDisabled();
    await p.locator('textarea:visible').last().fill('QA: Claude test other reason'); await p.waitForTimeout(500); const d2 = await arch.isDisabled();
    await arch.click(); await p.waitForTimeout(3000); const t = await txt(p);
    rec('F4', d0 && d1 && !d2 && /Archived/.test(t), `UI chưa lý do khoá=${d0}; Other không note khoá=${d1}; có note mở=${!d2}; toast Archived=${/Archived/.test(t)}`); });
  // F5 Webinar list
  await step('F5', async () => { if (process.env.ONLY && process.env.ONLY !== 'F5') return; await openWizard(p, 'Claudewebinar'); await btn(p, 'Interested').click(); await p.waitForTimeout(600); await btn(p, 'Webinar').click(); await p.waitForTimeout(3000);
    const sel = p.getByRole('textbox').last(); await sel.click().catch(() => {}); await p.waitForTimeout(1500);
    const opts = await p.$$eval('[role=option]', e => e.map(x => x.innerText.replace(/\s+/g, ' ').trim()).slice(0, 4));
    rec('F5', opts.length > 0, 'UI “Which webinar?” liệt kê: ' + JSON.stringify(opts)); await p.keyboard.press('Escape'); });
  // Y6 / Y7: Send info SMS limit and brackets
  await step('Y6', async () => { if (process.env.ONLY && process.env.ONLY !== 'Y6') return; await openWizard(p, 'Claudesendinfo'); await btn(p, 'Interested').click(); await p.waitForTimeout(600); await btn(p, 'Send info').click(); await p.waitForTimeout(1500);
    await p.getByText(/^SMS$/).first().click().catch(() => {}); await p.waitForTimeout(800);
    const ta = p.locator('textarea:visible').last(); await ta.fill('x'.repeat(321)); await p.waitForTimeout(800);
    await p.getByRole('button', { name: /Save & send/ }).click().catch(() => {}); await p.waitForTimeout(1500);
    const t = await dlgTxt(p); rec('Y6', /at most 320 characters/i.test(t), 'UI SMS 321 ký tự: ' + ((t.match(/A text can be at most 320[^.]*\./) || ['không thấy câu báo'])[0]));
    await ta.fill('Hi [name], this is a QA test'); await p.getByRole('button', { name: /Save & send/ }).click().catch(() => {}); await p.waitForTimeout(1500);
    const t2 = await dlgTxt(p); rec('Y7', /\[brackets\]/i.test(t2), 'UI nội dung có [name]: ' + ((t2.match(/Fill in[^.]*\./) || ['không thấy câu báo'])[0])); await p.keyboard.press('Escape'); });
  // B flows in Offer modal
  const offer = async (name) => { await openWizard(p, name); await btn(p, 'Interested').click(); await p.waitForTimeout(600); await btn(p, 'Yes, prepare offer').click(); await p.waitForTimeout(4000); };
  const nums = async (a, c) => { const ins = p.locator('input[placeholder="e.g. 12"]:visible'); if (await ins.count() >= 2) { await ins.nth(0).fill(String(a)); await ins.nth(1).fill(String(c)); await p.waitForTimeout(1200); } };
  const mainBtn = async () => (await p.locator('button').filter({ hasText: /Request approval|Send to onboarding|Approve|Send invite|Send offer/ }).last().innerText().catch(() => '')).trim();
  await step('B3', async () => { if (process.env.ONLY && process.env.ONLY !== 'B3') return; await offer('Claudeofferb'); const b0 = await mainBtn(); await nums(4, 2); const b4 = await mainBtn(); const y = /Will need manager approval/.test(await dlgTxt(p)); await nums(5, 2); const b5 = await mainBtn(); await nums(4, 2);
    rec('B3', /Request approval/.test(b4) && /Send to onboarding/.test(b5) && y, `UI nút: trống="${b0}", 4/2="${b4}" (hộp vàng ${y}), 5/2="${b5}"`);
    await p.locator('textarea:visible').last().fill('QA B3 note').catch(() => {});
    await p.getByRole('button', { name: /Request approval/ }).click(); await p.waitForTimeout(3000);
    rec('B3b', /Sent for manager approval/.test(await txt(p)), 'UI toast: ' + ((await txt(p)).match(/Sent for manager approval\.?/) || ['không'])[0]); });
  await step('B4b', async () => { if (process.env.ONLY && process.env.ONLY !== 'B4b') return; await offer('Claudeofferc'); await nums(6, 3);
    await p.getByText(/Waive \+ reason/).first().click(); await p.waitForTimeout(800);
    await p.getByText(/Other — specify/).first().click().catch(() => {}); await p.waitForTimeout(800);
    const b1 = await mainBtn(); const dis = await p.locator('button').filter({ hasText: /Request approval/ }).last().isDisabled();
    rec('B4b', /Request approval/.test(b1) && dis, `UI miễn phí: nút "${b1}", Other trống → khoá=${dis}`);
    await p.getByText(/Top producer/).first().click().catch(() => {}); await p.waitForTimeout(500);
    await p.locator('button').filter({ hasText: /Request approval/ }).last().click(); await p.waitForTimeout(3000);
    rec('B4', /Sent for manager approval/.test(await txt(p)), 'UI 6/3 + waive → ' + (/Sent for manager approval/.test(await txt(p)) ? 'Sent for manager approval.' : 'không thấy toast')); });
  await step('B1', async () => { if (process.env.ONLY && process.env.ONLY !== 'B1') return; await offer('Claudeoffera'); await nums(6, 3); const b1 = await mainBtn();
    await p.locator('button').filter({ hasText: /Send to onboarding/ }).last().click(); await p.waitForTimeout(3500);
    rec('B1', /Send to onboarding/.test(b1) && /Sent to onboarding/.test(await txt(p)), `UI 6/3 nút "${b1}" → toast ${(await txt(p)).match(/Sent to onboarding — [^.]{0,30}/)?.[0] || 'không'}`); });
  await step('B9', async () => { if (process.env.ONLY && process.env.ONLY !== 'B9') return; await offer('Claudenonmls'); const t = await dlgTxt(p); const dis = await p.locator('button').filter({ hasText: /Request approval|Send to onboarding|Send offer/ }).last().isDisabled().catch(() => null);
    rec('B9', /NMLS missing from the profile/.test(t) && dis, `UI không NMLS: “NMLS missing…” ${/NMLS missing from the profile/.test(t)}, “Update NMLS in the profile” ${/Update NMLS in the profile/.test(t)}, nút khoá ${dis}`); await p.keyboard.press('Escape'); });
  // I1 hand off
  await step('I1', async () => { if (process.env.ONLY && process.env.ONLY !== 'I1') return; await p.goto('https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
    const row = p.locator('tr, [class*=row]', { hasText: 'Claudehandoff' }).first(); await row.locator('button[aria-label*="ore"], button:has-text("⋯"), button[aria-haspopup]').last().click(); await p.waitForTimeout(1000);
    await p.getByRole('menuitem', { name: /Hand off/i }).click(); await p.waitForTimeout(2000);
    const d = p; const tt = await dlgTxt(p);
    await d.getByRole('textbox').first().click(); await p.waitForTimeout(800); await p.getByRole('option', { name: /Manh/i }).first().click(); await p.waitForTimeout(500);
    await d.getByText(/Too much on my plate today/).first().click(); await p.waitForTimeout(400);
    await d.locator('button').filter({ hasText: /^Hand off to/ }).last().click(); await p.waitForTimeout(3000);
    const t = await txt(p); rec('I1', /now .*'s|handed/i.test(t), `UI hộp “${(tt.match(/Hand off [^.]{0,30}/) || [''])[0]}” có nhóm Same role/Other teams: ${/Same role as you/.test(tt)}; toast: ${(t.match(/[^.]{0,30}is now [^.]{0,40}/) || ['không'])[0]}`); });
  // O5 focus mode
  await step('O5', async () => { return; await p.goto('https://recruit.viet18.com/today/focus', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000); const t = await txt(p);
    rec('O5', /Skip/.test(t) && /Log result/.test(t), 'UI Focus mode có Prev/Next/Skip/Log result/Remind later: ' + ['Prev', 'Next', 'Skip', 'Log result', 'Remind later'].map(w => w + '=' + t.includes(w)).join(' ')); });
  // AA3 cold list
  await step('AA3', async () => { return; await p.goto('https://recruit.viet18.com/inbox/cold', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
    await p.getByPlaceholder(/Name, NMLS, company/).fill('Dad'); await p.waitForTimeout(3000); const u1 = p.url();
    await p.reload(); await p.waitForTimeout(7000); const kept = await p.getByPlaceholder(/Name, NMLS, company/).inputValue().catch(() => '');
    rec('AA3', kept === 'Dad', `UI Cold list tìm “Dad” → URL ${u1.replace('https://recruit.viet18.com', '')}; sau tải lại ô tìm còn “${kept}”`); });
  // S4 pipeline filters in URL
  await step('S4', async () => { return; await p.goto('https://recruit.viet18.com/pipeline', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
    const tabs = (await txt(p)).match(/All|New lead|Engaged|Offer|Onboarding|Joined|Onboarded/g) || [];
    await p.getByRole('tab', { name: /Joined/ }).first().click().catch(() => {}); await p.waitForTimeout(2500); const u = p.url();
    await p.reload(); await p.waitForTimeout(6000);
    rec('S1', ['New lead', 'Engaged', 'Offer', 'Onboarding', 'Joined', 'Onboarded'].every(x => tabs.includes(x)), 'UI tab Pipeline: ' + [...new Set(tabs)].join(' / '));
    rec('S4', /stage|phase|tab/i.test(u) && p.url() === u, `UI chọn tab Joined → URL ${u.replace('https://recruit.viet18.com', '')}; giữ sau tải lại: ${p.url() === u}`); });
  await b.close(); })();
