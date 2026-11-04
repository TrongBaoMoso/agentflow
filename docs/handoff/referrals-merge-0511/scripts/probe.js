// One admin call + one LO call, print status/body head. usage: node probe.js <path> [email]
const { chromium } = require('playwright'); const { login, api } = require('../../recruit-e2e-lab/scripts/auth');
(async () => { const b = await chromium.launch({ headless: true });
  const r = await login(b, process.argv[3] || 'bao.trinh+admin@loanfactory.com'); await r.ctx.close(); await b.close();
  for (let i = 0; i < 3; i++) { const t = Date.now(); const res = await api(r.token, 'GET', process.argv[2]);
    console.log(res.status, (Date.now() - t) + 'ms', JSON.stringify(res.body).slice(0, 250)); }
})();
