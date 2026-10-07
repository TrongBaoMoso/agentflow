const { chromium } = require('playwright'); const { login, api } = require('./auth'); const fs = require('fs');
const seeded = JSON.parse(fs.readFileSync('seeded.json'));
const cands = Object.fromEntries(fs.readFileSync('cands.txt','utf8').split('\n').slice(1).map(l => l.split(' | ')).filter(a => a.length > 1).map(a => [a[0].trim(), a[1].trim()]));
const only = process.argv[2] ? process.argv[2].split(',') : null;
const ptDate = (d = 0) => { const t = new Date(Date.now() + d*86400000); return t.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); };
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync('prep.log', s + '\n'); };
(async () => {
  const b = await chromium.launch({ headless: true });
  const rec = (await login(b, 'bao.trinh+recruiter@loanfactory.com')).token;
  const mgr = (await login(b, 'bao.trinh+manager@loanfactory.com')).token;
  const onb = (await login(b, 'bao.trinh+onb-test@loanfactory.com')).token;
  await b.close();
  fs.writeFileSync('tokens.json', JSON.stringify({ rec, mgr, onb }));
  const out = fs.existsSync('prep.json') ? JSON.parse(fs.readFileSync('prep.json')) : {};
  for (const lo of Object.values(seeded)) {
    if (only && !only.includes(lo.id)) continue;
    if (lo.prep === 'S0') continue;
    const id = cands[lo.em]; if (!id) { log(lo.id, 'NO CANDIDATE'); continue; }
    const r = out[lo.id] || { id: lo.id, cand: id, steps: [] }; out[lo.id] = r;
    const step = async (name, tok, m, p, body) => { if (r.steps.includes(name)) return true; const x = await api(tok, m, p, body); const ok = x.status < 300; log(lo.id, name, x.status, ok ? '' : JSON.stringify(x.body).slice(0, 300)); if (ok) r.steps.push(name); fs.writeFileSync('prep.json', JSON.stringify(out, null, 1)); return ok ? x : null; };
    const owner = lo.prep === 'CLAIM_SMS' ? mgr : rec;
    await step('claim', owner, 'POST', `/candidates/${id}/claim`);
    if (lo.prep === 'CLAIM_STOP') await step('stop', rec, 'POST', '/suppressions', { identifier_type: 'PHONE', identifier_value: lo.ph.replace(/\D/g, ''), suppression_type: 'STOP_SMS', channel: 'SMS', reason: 'QA test: LO texted STOP' });
    if (lo.prep === 'NURTURE') await step('neutral', rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'NEUTRAL', note: 'QA prep: not now', nurture_until: ptDate(30) });
    if (['PENDING','READY','S5','S5DONE','S6','S6HR','S7'].includes(lo.prep)) {
      if (['S5','S5DONE','S6','S6HR','S7'].includes(lo.prep)) await step('numbers', rec, 'PUT', `/candidates/${id}`, { loans_since_anchor: 6, units12mo: 3 });
      await step('interested', rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', note: 'QA prep: ready to join', send_invite: true });
      if (lo.prep !== 'READY') { const o = await step('offer', rec, 'POST', `/candidates/${id}/offers`, { waive_fee: false, note: 'QA prep' }); if (o && o.body && o.body.payload) { r.offer = o.body.payload.id; r.offerStatus = o.body.payload.status; } }
    }
    if (['S5DONE','S6','S6HR','S7'].includes(lo.prep)) {
      const items = await api(onb, 'GET', `/candidates/${id}/checklist-items`);
      const pre = (items.body.payload || []).find(i => i.template_code === 'ONB_PREMEETING');
      if (!pre) log(lo.id, 'no ONB_PREMEETING', JSON.stringify(items.body).slice(0, 200));
      else await step('1on1done', onb, 'PATCH', `/checklist-items/${pre.id}`, { status: 'DONE', meeting_date: ptDate(0), lo_type: 'OUTSIDE' });
    }
  }
  log('DONE');
})();
