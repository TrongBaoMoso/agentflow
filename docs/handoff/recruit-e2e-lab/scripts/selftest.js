const { chromium } = require('playwright'); const { login, api } = require('./auth'); const fs = require('fs');
const cands = Object.fromEntries(fs.readFileSync('cands.txt','utf8').split('\n').slice(1).map(l => l.split(' | ')).filter(a => a.length > 1).map(a => [a[0].trim(), a[1].trim()]));
const C = (id) => cands[`bao.trinh+t08${id.toLowerCase()}@loanfactory.com`];
const { execFileSync } = require('child_process');
const q = (sql) => execFileSync('/Users/apple/Projects/agentflow/.worktrees/_designs/e2-helpers/q.sh', [sql]).toString().split('\n')[1]?.trim();
const R = []; const rec = (step, status, note) => { R.push({ step, status, note }); console.log(step, status, note); };
const msg = (x) => JSON.stringify(x.body?.error?.messages || x.body?.payload?.status || x.body).slice(0, 160);
const ptDate = (d = 0) => new Date(Date.now() + d*86400000).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
(async () => {
  const b = await chromium.launch({ headless: true });
  const t = { rec: (await login(b, 'bao.trinh+recruiter@loanfactory.com')).token, mgr: (await login(b, 'bao.trinh+manager@loanfactory.com')).token, onb: (await login(b, 'bao.trinh+onb-test@loanfactory.com')).token, hh: (await login(b, 'bao.trinh+hh@loanfactory.com')).token };
  await b.close(); fs.writeFileSync('tokens.json', JSON.stringify(t));
  // Z2: below rule -> pending -> manager approve
  let id = C('Z2'); await api(t.rec, 'POST', `/candidates/${id}/claim`); await api(t.rec, 'PUT', `/candidates/${id}`, { loans_since_anchor: 4, units12mo: 2 });
  let x = await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', send_invite: true });
  x = await api(t.rec, 'POST', `/candidates/${id}/offers`, { waive_fee: false, note: 'QA B3 note' });
  const o2 = x.body?.payload?.id ? x.body.payload : { id: q(`select id from offers where candidate_id='${id}' order by created_date desc limit 1`), status: q(`select status from offers where candidate_id='${id}' order by created_date desc limit 1`) }; rec('B3b', o2?.status === 'PENDING_APPROVAL' ? 'pass' : 'fail', `API: 4/2 → offer ${o2?.status} (Claude LO QA Claudebelow)`);
  x = await api(t.mgr, 'GET', '/offers/pending-approval'); const bodyS = JSON.stringify(x.body); const row = bodyS.includes(id) ? bodyS.slice(bodyS.indexOf(id) - 300, bodyS.indexOf(id) + 500) : null;
  rec('B3c', row ? 'pass' : 'fail', `API: hàng chờ duyệt có QA Claudebelow · ${(row || '').match(/BELOW[A-Z_]*|reason[^,]{0,60}/i)?.[0] || ''}`);
  x = await api(t.mgr, 'POST', `/offers/${o2?.id}/approve`, {}); rec('B3d', x.status < 300 && /SENT/.test(JSON.stringify(x.body)) ? 'pass' : 'fail', `API: approve → ${x.status} ${msg(x)}`);
  // fee-paid guard on pending
  // Z3: decline then re-request
  id = C('Z3'); await api(t.rec, 'POST', `/candidates/${id}/claim`);
  await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', send_invite: true });
  x = await api(t.rec, 'POST', `/candidates/${id}/offers`, { waive_fee: false }); const o3 = x.body?.payload;
  x = await api(t.mgr, 'POST', `/offers/${o3?.id}/fee-paid`, {}); rec('B6', x.status >= 400 ? 'pass' : 'fail', `API guard 7h4fw: fee-paid trên offer PENDING_APPROVAL → ${x.status} (phải bị từ chối)`);
  x = await api(t.mgr, 'POST', `/offers/${o3?.id}/decline`, { reason: 'abc' }); const shortOk = x.status >= 400;
  x = await api(t.mgr, 'POST', `/offers/${o3?.id}/decline`, { reason: 'QA decline test' }); rec('B6', x.status < 300 ? 'pass' : 'fail', `API: decline lý do ngắn → ${shortOk ? 'bị từ chối' : 'KHÔNG bị từ chối'}; lý do đủ → ${x.status}`);
  await api(t.rec, 'PUT', `/candidates/${id}`, { loans_since_anchor: 6, units12mo: 3 });
  x = await api(t.rec, 'POST', `/candidates/${id}/offers`, { waive_fee: false }); rec('B7', /SENT/.test(JSON.stringify(x.body)) ? 'pass' : 'fail', `API: gửi lại sau decline → ${x.status} ${msg(x)}`);
  x = await api(t.rec, 'GET', '/offers/mine?size=200'); const mine = JSON.stringify(x.body); const cnt = (mine.match(new RegExp(id, 'g')) || []).length;
  rec('B7', cnt === 1 ? 'pass' : 'fail', `API My hand-offs: số dòng của QA Claudedecline = ${cnt}; có “declined before”: ${/decline/i.test(mine.slice(mine.indexOf(id) - 600, mine.indexOf(id) + 900))}`);
  // Z6: waiver
  id = C('Z6'); await api(t.rec, 'POST', `/candidates/${id}/claim`); await api(t.rec, 'PUT', `/candidates/${id}`, { loans_since_anchor: 6, units12mo: 3 });
  await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', send_invite: true });
  x = await api(t.rec, 'POST', `/candidates/${id}/offers`, { waive_fee: true, waive_reason: 'Top producer' }); const o6 = x.body?.payload;
  rec('B4', o6?.status === 'PENDING_APPROVAL' ? 'pass' : 'fail', `API: 6/3 + waive → ${o6?.status} (miễn phí luôn cần duyệt)`);
  x = await api(t.mgr, 'POST', `/offers/${o6?.id}/approve`, {}); rec('B4c', /WAIVED/.test(JSON.stringify(x.body)) ? 'pass' : 'fail', `API: approve waive → fee ${JSON.stringify(x.body?.payload?.fee_status || '')}`);
  // Z4: no answer ladder
  id = C('Z4'); await api(t.rec, 'POST', `/candidates/${id}/claim`);
  x = await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'NO_ANSWER' }); rec('F2', x.status < 300 ? 'pass' : 'fail', `API: NO_ANSWER → ${x.status} ${JSON.stringify(x.body?.payload?.next_follow_up_at || x.body?.payload?.follow_up || '').slice(0, 120)}`);
  // Z5: past next step refused
  id = C('Z5'); await api(t.rec, 'POST', `/candidates/${id}/claim`);
  x = await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', next_step_kind: 'CALL_NEXT', next_step_at: new Date(Date.now() - 3600e3).toISOString() });
  rec('F1', x.status === 400 ? 'pass' : 'fail', `API: Call again giờ quá khứ → ${x.status} ${msg(x)}`);
  x = await api(t.rec, 'POST', `/candidates/${id}/call-outcome`, { attitude: 'INTERESTED', next_step_kind: 'CALL_NEXT', next_step_at: new Date(Date.now() + 26*3600e3).toISOString() });
  rec('F10', x.status < 300 ? 'pass' : 'fail', `API: Call again ngày mai → ${x.status}`);
  // permissions
  x = await api(t.rec, 'GET', '/admin/settings'); rec('P2', x.status === 403 ? 'pass' : 'fail', `API: Recruiter đọc /admin/settings → ${x.status}`);
  x = await api(t.onb, 'POST', `/candidates/${C('B9')}/offers`, { waive_fee: false }); rec('P5', x.status === 403 ? 'pass' : 'fail', `API: Onboarding tạo offer → ${x.status}`);
  x = await api(t.hh, 'GET', `/candidates/${C('A1')}`); rec('P6', [403, 404].includes(x.status) ? 'pass' : 'fail', `API: Headhunter mở LO không phải của mình → ${x.status}`);
  x = await api(t.hh, 'GET', `/candidates/${C('E6f')}`); rec('E1c', x.status === 200 ? 'pass' : 'fail', `API: Headhunter mở QA Ejoin (tự làm chủ từ /join) → ${x.status}`);
  x = await api(t.rec, 'POST', `/candidates`, { first_name: 'QA', last_name: 'Nope' }); rec('P9', x.status === 403 ? 'pass' : 'fail', `API: tạo lead tay → ${x.status}`);
  x = await api(t.hh, 'PUT', `/candidates/${C('N1')}/onboarding-progress/HR_TODO`, {}); rec('N7', x.status >= 400 ? 'pass' : 'fail', `API: người không phải chủ tick tiến độ → ${x.status}`);
  fs.writeFileSync('selftest.json', JSON.stringify(R, null, 1));
})();
