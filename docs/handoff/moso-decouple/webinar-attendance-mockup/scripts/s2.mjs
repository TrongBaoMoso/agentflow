import { open, ok } from './lib.mjs'
import { ANNA, BEN, CHRIS, hotItem, kpi, page, ME } from './data.mjs'
const OUT = process.argv[2]
const owned = { owner_id: ME, stage: 'S1' }
for (const [name, url, ready] of [['2-pipeline', '/pipeline', 'table'], ['2-hot', '/inbox/hot', 'table']]) {
  const { browser, page: pg, unhandled } = await open({ width: 1440, height: 620 }, async ({ path, json }) => {
    if (path === '/inbox/hot') return json(ok({ items: [ANNA(), BEN(), CHRIS()].map(hotItem), total: 3, truncated: false, escalate_after_minutes: 120 }))
    if (path === '/inbox/hot/counts') return json(ok({ hot_leads: 3, poll_after_seconds: 600 }))
    if (path === '/users') return json(ok([]))
    if (path === '/kpi/pipeline') return json(ok(kpi(3)))
    if (path === '/candidates') return json(page([ANNA(owned), BEN(owned), CHRIS(owned)]))
  }, { permissions: ['CANDIDATE_CLAIM', 'CANDIDATE_READ'], roles: ['RECRUITER'] })
  await pg.goto('http://localhost:3917' + url, { waitUntil: 'networkidle', timeout: 180000 })
  await pg.waitForTimeout(1500)
  await pg.screenshot({ path: `${OUT}/${name}-1440.png` })
  console.log(name, [...unhandled])
  await browser.close()
}
