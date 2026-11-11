const { chromium } = require('/Users/apple/.npm/_npx/fd3bca3c548369c0/node_modules/playwright');
const G='https://gateway.loanfactory.com/recruit-svc/api/v1';
const KEYS=['templates.approver_publish_enabled','templates.review_comments_enabled','templates.archive_restore_enabled','templates.send_history_enabled','templates.kit_v2_enabled','templates.test_send_enabled'];
(async()=>{ const b=await chromium.connectOverCDP('http://localhost:9345'); const ctx=b.contexts()[0]; const p=await ctx.newPage();
 await p.goto('https://recruit.loanfactory.com/today',{waitUntil:'domcontentloaded',timeout:120000}); await p.waitForTimeout(8000);
 console.log('url',p.url());
 const token=await p.evaluate(()=>{for(const s of [localStorage,sessionStorage])for(let i=0;i<s.length;i++){const v=s.getItem(s.key(i));const m=v&&v.match(/"accessToken":"([^"]+)"/);if(m)return m[1];}return null;});
 if(!token){console.log('NO TOKEN');await p.close();process.exit(1);}
 const h={'content-type':'application/json',authorization:'Bearer '+token};
 const cap=async t=>{const r=await fetch(G+'/templates/capabilities',{headers:h});console.log(t,r.status,(await r.text()).slice(0,300));};
 await cap('before');
 if(process.argv[2]==='set') for(const k of KEYS){const r=await fetch(G+'/admin/settings/'+k,{method:'PUT',headers:h,body:JSON.stringify({value:true})});console.log('PUT',k,r.status);}
 await cap('after'); await p.close(); process.exit(0); })();
