import { formatCallTimer } from '../callTimer'
import { resolveCallStartedAt } from '../useCallWorkspaceStore'

describe('formatCallTimer', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [61_000, '01:01'],
    [599_000, '09:59'],
    [3_600_000, '1:00:00'],
    [3_723_000, '1:02:03'],
    [-5000, '00:00'],
    [Number.NaN, '00:00']
  ])('%s ms reads %s', (ms, text) => expect(formatCallTimer(ms)).toBe(text))
})

describe('resolveCallStartedAt', () => {
  it('prefers the server stamp', () => expect(resolveCallStartedAt(100, 200)).toBe(200))
  it('falls back to this tab', () => expect(resolveCallStartedAt(100, null)).toBe(100))
  it('is null with no call', () => expect(resolveCallStartedAt(undefined, undefined)).toBeNull())
})
