const { execFileSync } = require('child_process');
const ACC = '/Users/apple/Projects/agentflow/.worktrees/_designs/staging-test-accounts.local.md';
function pw(email) {
  return execFileSync('awk', ['-F|', `{e=$2; gsub(/ /,"",e); sub(/^\\[/,"",e); sub(/\\]\\(mailto:.*$/,"",e); if (e=="${email}") {p=$3; gsub(/^ +| +$/,"",p); gsub(/\`/,"",p); print p}}`, ACC]).toString().trim();
}
async function login(b, email, opts = {}) {
  const fs = require('fs'); const sf = __dirname + '/state_' + email.replace(/[^a-z0-9]/gi, '_') + '.json';
  if (fs.existsSync(sf) && !opts.fresh) {
    const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: 900 }, storageState: sf }); const p = await ctx.newPage();
    await p.goto(opts.app || 'https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForTimeout(5000);
    if (!/account\.viet18\.com/.test(p.url())) {
      const token = await p.evaluate(() => { for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) { const v = s.getItem(s.key(i)); const m = v && v.match(/"accessToken":"([^"]+)"/); if (m) return m[1]; } return null; });
      return { ctx, p, token };
    }
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: opts.w || 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(opts.app || 'https://recruit.viet18.com/today', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const id = p.locator('input[name=username]').first();
  await id.waitFor({ timeout: 60000 });
  await id.fill(email);
  const nx = p.getByRole('button', { name: /^next$/i });
  if (await nx.count()) await nx.click();
  const pass = p.locator('input[name=password]').first();
  await pass.waitFor({ timeout: 30000 });
  await pass.fill(pw(email));
  await p.getByRole('button', { name: /^sign in$/i }).first().click();
  await p.waitForURL(u => !/account\.viet18\.com/.test(u.toString()), { timeout: 90000 });
  await p.waitForTimeout(4000);
  const token = await p.evaluate(() => {
    for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) {
      const k = s.key(i), v = s.getItem(k); const m = v && v.match(/"accessToken":"([^"]+)"/); if (m) return m[1];
    }
    return null;
  });
  try { await ctx.storageState({ path: __dirname + '/state_' + email.replace(/[^a-z0-9]/gi, '_') + '.json' }); } catch (e) {}
  return { ctx, p, token };
}
async function api(token, method, path, body) {
  const r = await fetch('https://gateway.viet18.com/recruit-svc/api/v1' + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
module.exports = { login, api, pw };
