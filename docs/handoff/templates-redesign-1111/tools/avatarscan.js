const S='/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/';
const { chromium } = require('/Users/apple/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const { login } = require(S+'auth');
const G='https://gateway.viet18.com/recruit-svc/api/v1';
const ACC=process.argv.slice(2);
(async()=>{ const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for (const e of ACC){ try{ const a=await login(b,e,{fresh:true}); const r=await fetch(G+'/templates/tpl-lo-invite/preview',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:'{}'});
  const t=await r.text(); const img=(t.match(/<img[^>]*(sig-mono|sig-av)[^>]*>/)||[''])[0]; const src=(img.match(/src=\\?"([^"\\]+)/)||[])[1]||'';
  console.log(e, r.status, src.includes('lf-mark')?'LOGO':(src?'AVATAR '+src.slice(0,80):'none')); await a.ctx.close(); }catch(x){console.log(e,'ERR',x.message.slice(0,80));} }
 await b.close(); process.exit(0); })();
