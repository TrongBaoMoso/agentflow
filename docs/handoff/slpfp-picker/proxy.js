// Preview-only proxy (agentflow-slpfp): staging gateway + fakes. See PR body.
const http = require('http'); const fs = require('fs');
const S = __dirname; const TOKEN = fs.readFileSync(S + '/token.txt', 'utf8').trim(); const UP = 'https://gateway.viet18.com/recruit-svc';
const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);
  const url = req.url;
  if (req.method === 'POST' && /\/onboarding\/specialists\/[^/]+\/clear-hold/.test(url)) { // FAKED, BE endpoint not deployed
    return json(res, { payload: { user_id: 'x', email: 'x', moso_refused_at: null }, http_code: 200 });
  }
  if (req.method === 'GET' && /\/checklist\/departments\/ONBOARDING\/queue/.test(url)) { // FAKED one row, no specialist
    return json(res, { http_code: 200, payload: [{ id: 'prev-1', candidate_id: 'prev-c', department: 'ONBOARDING', title: 'Pre-onboarding meeting', status: 'OPEN', due_at: new Date(Date.now() + 86400000).toISOString(),
      candidate: { id: 'prev-c', first_name: 'Alicia', last_name: 'Martinez', stage: 'S6' },
      onboarding_meeting: { writeback_enabled: true, specialist: null, moso_specialist: null, meeting_date: null, moso_meeting_status: null, writeback_status: 'NONE', pending_reason: null, missing_fields: [], last_attempt_at: null } }] });
  }
  const headers = { ...req.headers, authorization: 'Bearer ' + TOKEN }; delete headers.host; delete headers['content-length']; delete headers['accept-encoding']; delete headers['x-user-id'];
  const r = await fetch(UP + url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  let text = await r.text();
  try {
    if (req.method === 'GET' && /\/admin\/rbac\/me/.test(url)) { // FAKED permissions per mode
      const mode = fs.readFileSync(S + '/mode.txt', 'utf8').trim(); const j = JSON.parse(text);
      const base = ['CHECKLIST_READ', 'CHECKLIST_ITEM_MANAGE_ONBOARDING', 'ONBOARDING_SPECIALIST_ASSIGN'];
      j.payload = mode === 'manager' ? [...base, 'REPORT_TEAM'] : base; text = JSON.stringify(j);
    }
    if (req.method === 'GET' && /\/onboarding\/specialists/.test(url)) { // FAKED: hold ONE specialist
      const j = JSON.parse(text); const list = j.payload || [];
      if (list.length > 1) list[1] = { ...list[1], moso_refused_at: new Date(Date.now() - 3600000).toISOString() };
      text = JSON.stringify(j);
    }
  } catch (e) {}
  const out = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) out[k] = v; });
  res.writeHead(r.status, out); res.end(text);
}).listen(8099, () => console.log('proxy on 8099'));
