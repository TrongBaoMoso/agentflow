import { open, ok } from './lib.mjs'
import { ANNA, BEN, ME } from './data.mjs'
import { inst } from './lib.mjs'
const OUT = process.argv[2]
const ev = (c, summary) => ({ id: 'a-' + c.id, candidate_id: c.id, type: 'SYSTEM', direction: null, channel_ref: null, summary, subject: null, body: null,
  internal: false, actor_id: null, occurred_at: inst('2026-11-06T22:05:00Z'), omni_message_id: null })
const cases = [
  ['anna', ANNA({ owner_id: ME }), 'Attended webinar Why Loan Factory · Fri 06/11 · 52 min'],
  ['ben', BEN({ owner_id: ME }), 'Missed webinar Why Loan Factory · Fri 06/11']
]
for (const [who, cand, summary] of cases) {
  for (const [w, h] of [[1440, 760], [375, 900]]) {
    const { browser, page: pg, unhandled } = await open({ width: w, height: h }, async ({ path, json }) => {
      if (path === `/candidates/${cand.id}`) return json(ok(cand))
      if (path === `/candidates/${cand.id}/activities`) return json({ ...ok([ev(cand, summary)]), page: { totalElements: 1, pageSize: 50, currentPage: 0, totalPages: 1 } })
      if (path === `/candidates/${cand.id}/stage-history`) return json(ok([]))
      if (path === '/users') return json(ok([]))
      if (path.endsWith('/follow-ups')) return json(ok([]))
    }, { permissions: ['CANDIDATE_CLAIM', 'CANDIDATE_READ', 'ACTIVITY_READ'], roles: ['RECRUITER'] })
    await pg.goto(`http://localhost:3917/candidates/${cand.id}?section=activity`, { waitUntil: 'networkidle', timeout: 180000 })
    await pg.waitForSelector('.rec-tl-row', { timeout: 30000 }).catch(async () => { await pg.screenshot({ path: `${OUT}/debug3.png` }); console.log(await pg.innerText('body').then((t) => t.slice(0, 400)), [...unhandled]); process.exit(1) })
    await pg.waitForTimeout(800)
    await pg.screenshot({ path: `${OUT}/3-timeline-${who}-${w}.png`, fullPage: w < 500 })
    console.log(who, w, [...unhandled].filter((u) => !/notifications|candidate-view|google|offers|saved-filters|hot\/counts/.test(u)))
    await browser.close()
  }
}
