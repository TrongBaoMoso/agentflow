const S='/Users/apple/Projects/agentflow/docs/handoff/recruit-e2e-lab/scripts/';
const { chromium } = require('/Users/apple/.npm/_npx/fd3bca3c548369c0/node_modules/playwright');
const { login } = require(S+'auth');
const BASE='https://gateway.viet18.com/recruit-svc/api/v1';
const BAD=/Lisbeth|Giraldo|Victoria|591-8143|306-6244/;
(async () => { const b = await chromium.launch({ headless: true, executablePath: '/Users/apple/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
 const m = await login(b, 'bao.trinh+manager@loanfactory.com');
 const H={ 'content-type':'application/json', authorization:'Bearer '+m.token };
 const post=async(p)=>{const r=await fetch(BASE+p,{method:'POST',headers:H,body:'{}'});let j=null;try{j=await r.json()}catch(e){};return [r.status,j];};
 const [ps,pj]=await post('/templates/tpl-lo-invite-reminder/preview');
 const html=JSON.stringify(pj); const strip=html.replace(/<[^>]*>/g,' ');
 const iP=strip.indexOf('Pay the start-up fee'), iS=strip.indexOf('Sign your agreement');
 console.log('reminder preview', ps, 'pay@',iP,'sign@',iS,'PAY_BEFORE_SIGN=',iP>=0&&iS>=0&&iP<iS);
 const r=await fetch(BASE+'/templates/manage',{headers:H}); const list=await r.json(); const rows=Array.isArray(list)?list:(list.payload||[]);
 console.log('manage',r.status,rows.length,'keys',Object.keys(rows[0]||{}).join(','));
 const active=rows.filter(t=>(t.status||'')==='ACTIVE'); let bad=[];
 for(const t of active){ const raw=JSON.stringify([t.subject,t.body,t.kit_subject,t.kit_body]); if(BAD.test(raw)) bad.push(t.id+' (row)');
   const [s,j]=await post('/templates/'+t.id+'/preview'); if(s!==200) console.log('preview',s,t.id); else if(BAD.test(JSON.stringify(j))) bad.push(t.id+' (preview)'); }
 console.log('active',active.length,'BAD:',JSON.stringify(bad));
 for (const id of ['tpl-lo-invite-reminder','tpl-lo-fee-paid','tpl-lo-webinar-reminder-1d']) { const [s,j]=await post('/templates/'+id+'/preview'); console.log('preview',s,id, BAD.test(JSON.stringify(j))?'HAS PERSON':'clean'); const [ts,tj]=await post('/templates/'+id+'/test-send'); console.log('test-send',ts,id,tj&&tj.payload&&tj.payload.subject); await new Promise(z=>setTimeout(z,1500)); }
 await b.close(); })();
