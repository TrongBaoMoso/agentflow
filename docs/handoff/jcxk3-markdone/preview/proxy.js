// Local preview proxy (agentflow-jcxk3): /recruit-svc -> staging gateway with the onb-test Bearer.
// /today: turns ONE BOOK_1ON1 row into a 1-1 that started 10 min ago (preview only); PATCH on that row is faked.
const http = require('http'); const fs = require('fs');
const TOKEN = fs.readFileSync(process.argv[2], 'utf8').trim(); const PORT = 8099; const UP = 'https://gateway.viet18.com/recruit-svc';
let fakeItemId = null;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const body = Buffer.concat(chunks);
  if (fakeItemId && req.method === 'PATCH' && req.url.includes(fakeItemId)) {
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ payload: { id: fakeItemId, status: 'DONE' }, http_code: 200 }));
  }
  const headers = { ...req.headers, authorization: 'Bearer ' + TOKEN }; delete headers.host; delete headers['content-length']; delete headers['accept-encoding']; delete headers['x-user-id'];
  const r = await fetch(UP + req.url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
  let text = await r.text();
  if (req.method === 'GET' && /^\/api\/v1\/today(\?|$)/.test(req.url)) {
    try { const j = JSON.parse(text); const items = j.payload?.onboarding_items || [];
      const i = items.findIndex((x) => x.task === 'BOOK_1ON1' && x.checklist_item_id);
      if (i >= 0) { fakeItemId = items[i].checklist_item_id;
        items[i] = { ...items[i], task: 'MEETING_TODAY', meeting_at: new Date(Date.now() - 10 * 60000).toISOString(), meeting_minutes: 60, meeting_link: 'https://meet.google.com/preview-only' };
        text = JSON.stringify(j); }
    } catch (e) {}
  }
  const out = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) out[k] = v; });
  res.writeHead(r.status, out); res.end(text);
}).listen(PORT, () => process.stdout.write('proxy on ' + PORT + '\n'));
