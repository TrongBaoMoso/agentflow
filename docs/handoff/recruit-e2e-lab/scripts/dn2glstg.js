// agentflow-dn2gl (D575) staging check: counters + apply-default dry run + one batch (MOSO_OFF => all skipped, nothing
// written to MOSO or stored), then the Settings block at 1440/375, light/dark. Admin test account; prints ids/counts only.
const { chromium } = require('playwright'); const { login, api } = require('./auth');
const OUT = process.argv[2]; const STG = 'https://recruit.viet18.com';
(async () => {
  const b = await chromium.launch({ headless: true });
  const a = await login(b, 'bao.trinh+admin@loanfactory.com'); const tok = a.token; await a.ctx.close();
  const show = (label, r) => console.log(label, r.status, JSON.stringify(r.body && (r.body.payload ?? r.body)).slice(0, 600));
  show('state.before', await api(tok, 'GET', '/admin/per-lo-switch'));
  const pre = await api(tok, 'GET', '/admin/handled-by/apply-default'); show('preview', pre);
  const pv = pre.body.payload;
  show('stale-count', await api(tok, 'POST', '/admin/handled-by/apply-default', { default_handler: pv.default_handler, expected_remaining: pv.out_of_sync + 1, after_id: null }));
  show('wrong-default', await api(tok, 'POST', '/admin/handled-by/apply-default', { default_handler: pv.default_handler === 'RECRUIT' ? 'MOSO' : 'RECRUIT', expected_remaining: pv.out_of_sync, after_id: null }));
  const batch = await api(tok, 'POST', '/admin/handled-by/apply-default', { default_handler: pv.default_handler, expected_remaining: pv.out_of_sync, after_id: null });
  const bp = batch.body.payload || {}; console.log('batch', batch.status, JSON.stringify({ ...bp, failed_candidate_ids: (bp.failed_candidate_ids || []).length }));
  show('preview.after', await api(tok, 'GET', '/admin/handled-by/apply-default'));
  show('state.after', await api(tok, 'GET', '/admin/per-lo-switch'));
  for (const [w, dark] of [[1440, false], [1440, true], [375, false], [375, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: dark ? 'dark' : 'light', storageState: __dirname + '/state_bao_trinh_admin_loanfactory_com.json' });
    const p = await ctx.newPage(); await p.goto(STG + '/settings', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const blk = p.getByTestId('apply-default'); await blk.waitFor({ timeout: 90000 }).catch(() => {});
    await p.waitForTimeout(3000);
    if (await blk.count()) { await blk.scrollIntoViewIfNeeded(); await blk.screenshot({ path: `${OUT}/settings-apply-default-${w}${dark ? '-dark' : ''}.png` }); console.log('shot', w, dark, (await p.getByTestId('apply-default-count').innerText())); }
    else console.log('NO BLOCK', w, dark);
    if (w === 1440 && !dark && await blk.count()) {
      await p.getByRole('button', { name: 'Tell MOSO now' }).click(); await p.waitForTimeout(1500);
      await p.locator('.mantine-Modal-content').last().screenshot({ path: `${OUT}/settings-apply-default-dialog.png` });
    }
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
