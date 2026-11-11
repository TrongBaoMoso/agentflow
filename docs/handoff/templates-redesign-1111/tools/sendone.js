const S='/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/';
const { chromium } = require('/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const { login } = require(S+'auth');
const [acc, ...ids] = process.argv.slice(2);
(async()=>{ const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}); const a=await login(b,acc);
 for (const id of ids){ const r=await fetch('https://gateway.viet18.com/recruit-svc/api/v1/templates/'+id+'/test-send',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:'{}'}); console.log(id, r.status, (await r.text()).slice(0,120)); }
 await b.close(); process.exit(0); })();
