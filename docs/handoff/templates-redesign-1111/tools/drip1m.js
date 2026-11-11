const S='/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/';
const { chromium } = require('/Users/apple/.npm/_npx/fd3bca3c548369c0/node_modules/playwright');
const { login } = require(S+'auth');
const G='https://gateway.viet18.com/recruit-svc/api/v1/admin/settings/';
(async () => { const b = await chromium.launch({ headless: true, executablePath: '/Users/apple/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
 const a = await login(b, 'bao.trinh+admin@loanfactory.com'); const h={ 'content-type': 'application/json', authorization: 'Bearer ' + a.token };
 
 const show=async(t)=>{ const r = await fetch(G.slice(0,-1),{headers:h}); const j=await r.json(); const all=(j.payload||[]).filter(e=>String(e.setting_key||e.key).startsWith('webinar.drip_mail')); console.log(t,r.status,(j.payload||[]).length, JSON.stringify(all.map(e=>[e.setting_key||e.key,e.value,e.effective_from&&e.effective_from.formatted]))); };
 await show('before');
 if (process.argv[2]==='set') { const r = await fetch(G+'webinar.drip_mail.after_1_month', { method: 'PUT', headers: h, body: JSON.stringify({ value: 'P1M' }) }); console.log('set 1m', r.status, (await r.text()).slice(0,200)); await show('after'); }
 await b.close(); })();
