// Read (and optionally set) recruit staging settings as bao.trinh+admin, and count program snapshot coverage
// over the admin referrals list. usage: node settings.js [key=true ...]
const { chromium } = require('playwright'); const { login, api } = require('../../recruit-e2e-lab/scripts/auth');
const KEYS = ['referral.program_snapshot_enabled', 'referral.program_qualification_enabled',
  'referral.program_status_visible_to_referrer', 'program_sync.mode'];
(async () => { const b = await chromium.launch({ headless: true });
  const r = await login(b, 'bao.trinh+admin@loanfactory.com'); await r.ctx.close(); await b.close();
  for (const kv of process.argv.slice(2)) { const [k, v] = kv.split('=');
    const put = await api(r.token, 'PUT', '/admin/settings/' + k, { value: JSON.parse(v) });
    console.log('PUT', k, v, put.status, JSON.stringify(put.body).slice(0, 300)); }
  const all = await api(r.token, 'GET', '/admin/settings'); const list = all.body?.payload ?? all.body;
  const arr = Array.isArray(list) ? list : (list?.items || list?.settings || []);
  for (const k of KEYS) { const s = arr.find(x => (x.key || x.setting_key) === k); console.log(k, '=', JSON.stringify(s && (s.value ?? s)).slice(0, 200)); }
  if (!arr.length) console.log('settings GET', all.status, JSON.stringify(all.body).slice(0, 300));
  const counts = {}; let page = 0, total = 0;
  for (;;) { const res = await api(r.token, 'GET', `/referrals?pageSize=200&page=${page}`);
    const p = res.body?.payload ?? res.body; if (res.status !== 200) { console.log('referrals', res.status); break; }
    for (const i of p.items) { const k = `program=${i.program} entry=${i.entry_type} inferred=${i.entry_type_inferred} q=${i.qualifying_status}`; counts[k] = (counts[k] || 0) + 1; }
    total = p.total_items; page++; if (page >= p.total_pages) break; }
  console.log('admin rows (this year):', total); console.log(JSON.stringify(counts, null, 1));
})();
