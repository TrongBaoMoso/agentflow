const S='/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/';
const { chromium } = require('/Users/apple/.npm/_npx/fd3bca3c548369c0/node_modules/playwright');
const { login } = require(S+'auth');
const IDS = ['tpl-nurture-1','tpl-nurture-2','tpl-nurture-3','tpl-nurture-4','698b9cc2-323d-434e-80e2-244f2c5363dc'];
(async () => { const b = await chromium.launch({ headless: true, executablePath: '/Users/apple/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
 const m = await login(b, 'bao.trinh+manager@loanfactory.com');
 for (const id of IDS) { const r = await fetch(`https://gateway.viet18.com/recruit-svc/api/v1/templates/${id}/test-send`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + m.token }, body: '{}' }); const j = await r.json(); console.log(r.status, id, j.payload && j.payload.subject); await new Promise(z => setTimeout(z, 1500)); }
 await b.close(); })();
