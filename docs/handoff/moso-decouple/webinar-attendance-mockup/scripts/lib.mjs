import { chromium } from 'playwright-core'
export const ok = (payload) => ({ payload, response_date: '', http_code: 200 })
export const fail = (code = 404) => ({ http_code: code, response_date: '', error: { messages: [''] } })
export const inst = (iso) => ({ timestamp: Math.floor(new Date(iso).getTime() / 1000), formatted: iso, zone: 'America/Los_Angeles' })
export const CHROME = process.env.CHROME
export async function open(viewport, handler, { permissions = [], roles = ['MANAGER'] } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME })
  const ctx = await browser.newContext({ viewport, timezoneId: 'America/Los_Angeles', locale: 'en-US' })
  const page = await ctx.newPage()
  const unhandled = new Set()
  // The "now" of the mockup: the Monday after the 06/11 session, so it has happened and 13/11 is still ahead.
  await ctx.clock.setFixedTime(new Date('2026-11-09T09:00:00-08:00'))
  await ctx.addInitScript(() => {
    const css = document.createElement('style')
    css.textContent = 'nextjs-portal{display:none!important}'
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(css))
  })
  page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 300)) })
  await page.route('**/recruit-svc/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/recruit-svc/api/v1', '')
    const method = route.request().method()
    const json = async (b, status = 200) => { await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) }); return true }
    if (path === '/admin/rbac/me') return json(ok(permissions))
    if (path === '/me/nav-context' || path.endsWith('/nav-context')) return json(ok({ role_codes: roles }))
    const r = await handler({ path, url, method, json, body: route.request().postData() })
    if (r === undefined) {
      unhandled.add(`${method} ${path}`)
      return json(fail(404), 404)
    }
    return r
  })
  return { browser, ctx, page, unhandled }
}
