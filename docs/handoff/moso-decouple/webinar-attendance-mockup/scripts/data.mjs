import { ok, inst } from './lib.mjs'
const SESSION_START = '2026-11-06T21:00:00Z'
export const ME = 'acct-brayan'
const base = (id, first, last, extra = {}) => ({
  id, created_date: inst('2026-11-02T18:00:00Z'), stage: 'S1', status: 'ACTIVE', source: 'WEBINAR', owner_id: null,
  first_name: first, last_name: last, email: `${first}.${last}@example.com`.toLowerCase(), phone: '(714) 555-01' + id.slice(-2),
  nmls_id: '1' + id.slice(-2).padStart(6, '2'), company_name: 'Pacific Home Lending', state: 'CA', career_production: null,
  moso_note: null, self_reported_volume: null, self_reported_closed_loans: null, units12mo: null, modex_synced_at: null,
  last_outbound_at: null, labels: [], ...extra
})
const wb = (attendance, minutes) => ({ webinar: { starts_at: SESSION_START, attendance, attended_minutes: minutes } })
export const ANNA = (extra = {}) => base('c-r1', 'Anna', 'Lee', { source_detail: wb('ATTENDED', 52), ...extra })
export const BEN = (extra = {}) => base('c-r2', 'Ben', 'Carter', { source_detail: wb('NO_SHOW', null), ...extra })
export const CHRIS = (extra = {}) => base('c-r3', 'Chris', 'Diaz', { source_detail: wb('LEFT_EARLY', 9), ...extra })
export const hotItem = (c) => ({ candidate: c, sla_due_at: inst('2026-11-10T17:00:00Z'), first_touch_hours: 24, anchor_at: inst('2026-11-06T22:00:00Z'), first_touch_basis: 'SOURCE' })
const STAGES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']
const STATUSES = ['ACTIVE', 'ARCHIVED', 'HIRED', 'DROPPED']
export const kpi = (n) => ({ total: n, by_stage_status: Object.fromEntries(STAGES.map((s) => [s, Object.fromEntries(STATUSES.map((t) => [t, s === 'S1' && t === 'ACTIVE' ? n : 0]))])) })
export const page = (rows) => ({ payload: rows, response_date: '', http_code: 200, page: { totalElements: rows.length, pageSize: 25, currentPage: 0, totalPages: 1 } })
