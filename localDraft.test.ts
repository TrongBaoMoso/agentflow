import { clearAllCallWorkspaceDrafts, DRAFT_TTL_MS, draftKey, readDraft, writeDraft } from '../localDraft'

describe('localDraft', () => {
  beforeEach(() => window.localStorage.clear())

  it('keys by user, candidate and field', () => {
    expect(draftKey('u1', 'c1', 'phone')).toBe('recruit.cwDraft.v1:u1:c1:phone')
  })

  it('round-trips strings and lists', () => {
    writeDraft('k1', 'abc')
    writeDraft('k2', ['TX', 'OK'])
    expect(readDraft('k1')).toBe('abc')
    expect(readDraft('k2')).toEqual(['TX', 'OK'])
  })

  it('expires after 24 hours and deletes the entry', () => {
    writeDraft('k', 'abc', 1000)
    expect(readDraft('k', 1000 + DRAFT_TTL_MS)).toBe('abc')
    expect(readDraft('k', 1000 + DRAFT_TTL_MS + 1)).toBeNull()
    expect(window.localStorage.getItem('k')).toBeNull()
  })

  it('treats a corrupt entry as no draft', () => {
    window.localStorage.setItem('k', '{not json')
    expect(readDraft('k')).toBeNull()
  })

  it('wipes every draft on sign-out and nothing else', () => {
    writeDraft(draftKey('u1', 'c1', 'phone'), 'a')
    writeDraft(draftKey('u2', 'c9', 'email'), 'b')
    window.localStorage.setItem('recruit.callWorkspace.v1:u1', 'on')
    clearAllCallWorkspaceDrafts()
    expect(readDraft(draftKey('u1', 'c1', 'phone'))).toBeNull()
    expect(readDraft(draftKey('u2', 'c9', 'email'))).toBeNull()
    expect(window.localStorage.getItem('recruit.callWorkspace.v1:u1')).toBe('on')
  })

  it('never throws when storage is blocked', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readDraft('k')).toBeNull()
    spy.mockRestore()
  })
})
