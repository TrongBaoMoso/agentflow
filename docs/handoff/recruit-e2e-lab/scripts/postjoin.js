const { chromium } = require('playwright'); const { login, api } = require('./auth'); const fs = require('fs');
const P = JSON.parse(fs.readFileSync('prep.json')); const id = P[process.argv[2]].cand; const steps = (process.argv[3] || 'HR_TODO,HR_DOCS,LICENSING').split(','); const setup = process.argv[4] === 'setup';
(async () => { let t = JSON.parse(fs.readFileSync('tokens.json'));
  let r = await api(t.rec, 'GET', `/candidates/${id}/onboarding-progress`);
  if (r.status === 401) { const b = await chromium.launch({ headless: true }); t = { rec: (await login(b, 'bao.trinh+recruiter@loanfactory.com')).token, mgr: (await login(b, 'bao.trinh+manager@loanfactory.com')).token, onb: (await login(b, 'bao.trinh+onb-test@loanfactory.com')).token }; await b.close(); fs.writeFileSync('tokens.json', JSON.stringify(t)); r = await api(t.rec, 'GET', `/candidates/${id}/onboarding-progress`); }
  console.log('progress', r.status, JSON.stringify(r.body).slice(0, 600));
  for (const s of steps) { if (!s) continue; const x = await api(t.rec, 'PUT', `/candidates/${id}/onboarding-progress/${s}`, {}); console.log(s, x.status, JSON.stringify(x.body).slice(0, 200)); }
  if (setup) { const items = await api(t.onb, 'GET', `/candidates/${id}/checklist-items`); const it = (items.body.payload || []).find(i => i.template_code === 'ONB_SETUP_CALL'); console.log('setup item', it && it.status); if (it) { const x = await api(t.onb, 'PATCH', `/checklist-items/${it.id}`, { status: 'DONE' }); console.log('setup', x.status, JSON.stringify(x.body).slice(0, 200)); } }
})();
