import { open, ok } from './lib.mjs'
const OUT = process.argv[2]
const S = (id, date, status, extra = {}) => ({ id, series_id: 'ser-1', series_title: 'Why Loan Factory', local_date: date,
  starts_at: `${date}T21:00:00Z`, ends_at: `${date}T22:30:00Z`, status, skip_reason: null, holiday_keys: [],
  meeting_url: `https://meet.google.com/${id}-abcd-efg`, registered_count: 63, ...extra })
const SERIES = { id: 'ser-1', title: 'Why Loan Factory', weekday: 5, local_start_time: '13:00', zone: 'America/Los_Angeles',
  duration_minutes: 90, capacity: 200, active: true, skip_holidays: true, effective_from: '2026-01-01', effective_until: null,
  meeting_url: 'https://meet.google.com/usw-rroo-jgy', host_user_id: 'u1', host_name: 'Victoria Pham', host_google_status: 'CONNECTED', horizon_weeks: 12 }
const SESSIONS = [S('s0', '2026-10-30', 'HELD', { registered_count: 71 }), S('s1', '2026-11-06', 'HELD'), S('s2', '2026-11-13', 'SCHEDULED', { registered_count: 38 }), S('s3', '2026-11-20', 'SCHEDULED', { registered_count: 12 })]

// 63 registrants: 18 attended (5 of them left early, under 45 of 90 min), 45 no-show.
const FIRST = ['Anna', 'Ben', 'Chris', 'Dana', 'Eli', 'Fiona', 'Gabe', 'Hana', 'Ivan', 'Jade', 'Kai', 'Lena', 'Marco', 'Nina', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vic', 'Wes', 'Xena', 'Yuri']
const LAST = ['Lee', 'Carter', 'Diaz', 'Nguyen', 'Patel', 'Kim', 'Rossi', 'Walker', 'Silva', 'Brown', 'Tran', 'Lopez', 'Reed', 'Young', 'Cruz']
const OWNERS = ['acct-brayan', 'acct-yen-vu', 'acct-minh-tran', null, 'acct-brayan', 'acct-yen-vu']
const ATTENDED = { 0: 52, 2: 9, 5: 88, 7: 90, 9: 22, 12: 85, 14: 31, 16: 74, 19: 90, 22: 67, 25: 38, 28: 90, 31: 81, 35: 58, 40: 90, 44: 63, 49: 87, 55: 71 }
const rows = Array.from({ length: 63 }, (_, i) => {
  const name = i === 0 ? 'Anna Lee' : i === 1 ? 'Ben Carter' : i === 2 ? 'Chris Diaz' : `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`
  const minutes = ATTENDED[i]
  const day = i < 3 ? 5 : 1 + (i % 4), hour = i < 3 ? 14 + i : 8 + ((i * 5) % 11)
  return { registration_id: `r${i + 1}`, candidate_id: `c-r${i + 1}`, name, email: name.toLowerCase().replace(' ', '.') + `${i > 2 ? i : ''}@example.com`,
    nmls_id: String(1200000 + i * 137), owner_id: OWNERS[i % OWNERS.length], status: 'REGISTERED', moved_to_session_id: null,
    registered_at: `2026-11-0${day}T${String((hour + 7) % 24).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00Z`,
    attendance: minutes ? 'ATTENDED' : 'NO_SHOW', attended_minutes: minutes ?? null }
})
console.log('attended', rows.filter((r) => r.attendance === 'ATTENDED').length, 'left early', rows.filter((r) => r.attended_minutes && r.attended_minutes < 45).length)
const USERS = [['acct-brayan', 'Brayan Cole'], ['acct-yen-vu', 'Yen Vu'], ['acct-minh-tran', 'Minh Tran']].map(([user_id, display_name]) => ({ user_id, display_name, role_codes: ['RECRUITER'], can_own: true }))

const shots = [['default', ''], ['noshow', '?attendance=NO_SHOW'], ['cards', '?view=cards']]
for (const [w, h] of [[1440, 900], [375, 1500]]) {
  for (const [name, qs] of shots) {
    const { browser, page, unhandled } = await open({ width: w, height: h }, async ({ path, json }) => {
      if (path.endsWith('/webinar-series')) return json(ok([SERIES]))
      if (path.endsWith('/webinar-sessions')) return json(ok(SESSIONS))
      if (path.endsWith('/s1/registrations')) return json(ok(rows))
      if (path.endsWith('/registrations')) return json(ok([]))
      if (path === '/users') return json(ok(USERS))
      if (path === '/saved-filters') return json(ok([]))
    }, { permissions: ['WEBINAR_SCHEDULE_READ', 'WEBINAR_SCHEDULE_MANAGE', 'CANDIDATE_READ'], roles: ['MANAGER'] })
    await page.goto(`http://localhost:3917/webinar-schedule/sessions/s1${qs}`, { waitUntil: 'networkidle', timeout: 180000 })
    await page.waitForSelector(name === 'cards' ? '.pcard-grid .pcard' : '.ws-att-tbl tbody tr[data-attendance]', { timeout: 40000 }).catch(async () => {
      await page.screenshot({ path: `${OUT}/debug.png` }); console.log(page.url(), (await page.innerText('body')).slice(0, 500), [...unhandled]); process.exit(1) })
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/1-session-${name}-${w}.png`, fullPage: false })
    if (w === 1440 && name === 'default') { await page.locator('.ph-pager').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/1-session-pager-${w}.png` }) }
    if (w === 1440 && name === 'default') console.log([...unhandled].filter((u) => !/notifications|candidate-view|google|offers|saved-filters|hot\/counts/.test(u)))
    await browser.close()
  }
}
