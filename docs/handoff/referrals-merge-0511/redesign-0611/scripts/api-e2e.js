// Referrals redesign (agentflow-3mjma, 06/11) API evidence on STAGING.
// usage: NODE_PATH=~/.mmi-research/node_modules node api-e2e.js <outFile>
// Counts per role, program / Headhunter rows present or not, CSV rows, 403s. Prints no secrets.
const fs = require('fs');
const { chromium } = require('playwright');
const { login, api } = require('../../../recruit-e2e-lab/scripts/auth');
const OUT = process.argv[2];
const SINCE = '2026-01-01';
const HH_NAMES = ['QA Tentrefer', 'QA W10Refer'];
const ROLES = [
  ['manager', 'victoria.pham+stg@loanfactory.com'],
  ['admin', 'bao.trinh+admin@loanfactory.com'],
  ['lo', 'bao.trinh+lo-referrer@loanfactory.com'],
  ['recruiter', 'bao.trinh+recruiter@loanfactory.com'],
  ['headhunter', 'bao.trinh+hh@loanfactory.com'],
];
const summarize = (items) => {
  const by = {};
  let program = 0, hh = 0;
  for (const i of items) {
    const k = `${i.program ?? 'null'}/${i.entry_type}`;
    by[k] = (by[k] || 0) + 1;
    if (i.program === 'LO_RECRUITER_PROGRAM' || (!i.program && i.entry_type === 'PROGRAM')) program++;
    if ((i.referrer_owner_key || '').toLowerCase() === 'bao.trinh+hh@loanfactory.com') hh++;
  }
  return { by, programRows: program, hhReferrerRows: hh, hhNamesListed: items.filter((i) => HH_NAMES.includes(i.display_name)).map((i) => i.display_name) };
};
(async () => {
  const b = await chromium.launch({ headless: true });
  const log = [];
  for (const [name, email] of ROLES) {
    let r;
    try { r = await login(b, email, { w: 1440 }); } catch (e) { log.push({ name, error: 'login ' + e.message.slice(0, 100) }); continue; }
    const all = await api(r.token, 'GET', `/referrals?since=${SINCE}&page=0&pageSize=200`);
    const row = { name, all_status: all.status };
    if (all.status === 200) {
      const p = all.body.payload;
      row.all = { total_items: p.total_items, totals: p.totals, referrers: (p.totals_by_referrer || []).length,
        referrer_options: (p.referrer_options || []).length,
        hh_in_totals_by_referrer: (p.totals_by_referrer || []).some((g) => (g.owner_key || '').toLowerCase() === 'bao.trinh+hh@loanfactory.com'),
        hh_in_referrer_options: (p.referrer_options || []).some((o) => (o.owner_key || '').toLowerCase() === 'bao.trinh+hh@loanfactory.com'),
        last_referred_on_present: (p.totals_by_referrer || []).some((g) => g.last_referred_on),
        ...summarize(p.items) };
      const search = await api(r.token, 'GET', `/referrals?since=${SINCE}&page=0&pageSize=50&q=${encodeURIComponent('QA Tentrefer')}`);
      row.search_qa_tentrefer = search.status === 200 ? search.body.payload.total_items : search.status;
      const csv = await fetch(`https://gateway.viet18.com/recruit-svc/api/v1/referrals/export.csv?since=${SINCE}`, { headers: { authorization: 'Bearer ' + r.token } });
      const text = await csv.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      row.csv = { status: csv.status, data_rows: Math.max(0, lines.length - 1), has_hh_names: HH_NAMES.filter((n) => text.includes(n)), has_lrp: /LO_RECRUITER_PROGRAM|LO Recruiter Program/.test(text) };
    }
    const mine = await api(r.token, 'GET', `/referrals/mine?since=2000-01-01&page=0&pageSize=200`);
    row.mine_status = mine.status;
    if (mine.status === 200) row.mine = { total_items: mine.body.payload.total_items, ...summarize(mine.body.payload.items) };
    log.push(row);
    await r.ctx.close();
  }
  await b.close();
  const text = JSON.stringify({ at: new Date().toISOString(), since: SINCE, roles: log }, null, 1);
  fs.writeFileSync(OUT, text);
  console.log(text);
})();
