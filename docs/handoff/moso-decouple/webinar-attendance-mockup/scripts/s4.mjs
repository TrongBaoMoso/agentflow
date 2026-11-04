import { open, ok, inst } from './lib.mjs'
import { ANNA, ME } from './data.mjs'
const OUT = process.argv[2]
const cand = ANNA({ owner_id: ME, stage: 'S1' })
const item = {
  candidate: cand, last_activity_at: null, last_outbound_at: null, last_inbound_at: null,
  follow_up: { id: 'f1', kind: 'WEBINAR', wakeup_at: inst('2026-11-09T19:00:00Z'), note: null, status: 'OPEN' },
  open_follow_up_count: 1, due_today_count: 1
}
const queue = { items: [item], total_owned: 1, truncated: false, cadence_tiers: [3, 7, 14], cadence_auto_send_tiers: [], cadence_enabled_stages: ['S1', 'S2', 'S3', 'S5'],
  batch_claim_size: 10, tab_counts: { all: 1, follow_up_today: 1, upcoming: 0 }, carried_over: 0, scheduled_later: 0, pending_outcomes: [], manager_reminders: [], progress: { done: 0, total: 1 } }
for (const [w, h] of [[1440, 560]]) {
  const { browser, page: pg, unhandled } = await open({ width: w, height: h }, async ({ path, json }) => {
    if (path === '/today') return json(ok(queue))
    if (path === '/kpi/pipeline') return json(ok({ total: 1, by_stage_status: {} }))
    if (path === '/users') return json(ok([]))
  }, { permissions: ['CANDIDATE_CLAIM', 'CANDIDATE_READ', 'ACTIVITY_READ'], roles: ['RECRUITER'] })
  await pg.goto('http://localhost:3917/today', { waitUntil: 'networkidle', timeout: 180000 })
  await pg.waitForTimeout(2500)
  await pg.screenshot({ path: `${OUT}/4-today-${w}.png`, fullPage: w < 500 })
  console.log(w, [...unhandled].filter((u) => !/notifications|candidate-view|google|offers|saved-filters|hot\/counts/.test(u)))
  await browser.close()
}
