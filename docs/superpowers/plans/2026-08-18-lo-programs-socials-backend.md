# LO Programs socials — moso-aid backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give moso-aid the schema, validation, ALLY client and catalog needed to store a Level 2/3 applicant's social profiles with audience metrics, and rename the ambassador level ids to semantic slugs.

**Architecture:** Social profiles are a top-level array on the application document — not inside `answers`, which is a flat scalar map that both `validateAnswers` and `exportCSV` assume. A permissive adapter inside the existing ALLY client normalises whatever shape ALLY returns into one canonical row. Provenance, the network, the audience label and both totals are computed server-side; nothing derived is accepted from the client.

**Tech Stack:** Node 22 ESM, Express, Mongoose, Jest 29 + mongodb-memory-server (`test/setup.js` boots an in-memory Mongo and clears collections between tests).

**Spec:** `docs/superpowers/specs/2026-08-18-lo-programs-socials-and-form-design.md`

## Global Constraints

- Repo `moso-aid`, base branch `master`. Work in a worktree.
- Tests: `npm test` (the script already passes `--experimental-vm-modules`). Lint: `npm run lint`.
- Ambassador level ids become `general_participation` (rank 1), `lo_ambassador` (rank 2), `senior_lo_ambassador` (rank 3). `lo_recruiter` is untouched.
- Every token is lowercase snake_case. Code enums are exported const arrays from the model plus `enum:` on the schema field.
- `null` from ALLY means *unknown* and must never render as *false*. Failures are soft: the client returns `null`.
- Measured and claimed audience totals are never summed together, in any output including CSV.
- Staging data is throwaway: reseed with `--reset-applications` rather than migrating level ids.
- Three items in the spec carry `[PROPOSAL]` (the social table replacing `linkedin`/`other_social`, the conditional `connections_range`, applicant self-reporting). Build them, but do not ship to production before the program owner confirms.

---

### Task 1: Semantic level ids

**Files:**
- Modify: `src/models/lo-program.js` — `DEFAULT_CATALOG`, ambassador levels (~lines 176-206)
- Modify: `test/services/lo-program.test.js` — 33 occurrences of `'l1'`/`'l2'`/`'l3'`
- Modify: `test/scripts/lo-programs-seed.test.js` — 1 occurrence

**Interfaces:**
- Consumes: nothing.
- Produces: level ids `general_participation` | `lo_ambassador` | `senior_lo_ambassador`, used by every later task and by the frontend plan.

- [ ] **Step 1: Write the failing test**

Add to `test/scripts/lo-programs-seed.test.js`:

```js
it('seeds the ambassador levels under semantic ids, not positional ones', async () => {
  await seedLoPrograms({ log: () => {} })
  const program = await LOProgramCatalog.findOne({ program_id: 'ambassador' }).lean()
  expect(program.levels.map((l) => l.level_id)).toEqual([
    'general_participation',
    'lo_ambassador',
    'senior_lo_ambassador'
  ])
  // rank carries the ordering, so identity never has to be renumbered
  expect(program.levels.map((l) => l.rank)).toEqual([1, 2, 3])
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/scripts/lo-programs-seed.test.js`
Expected: FAIL, received `['l1','l2','l3']`.

- [ ] **Step 3: Rename the ids in the catalog**

In `src/models/lo-program.js`, in `DEFAULT_CATALOG`'s ambassador entry change only the three `level_id` values. `rank`, `name`, `budget_max_monthly`, `application_required`, `requires_nmls`, `activation` and `form_id` all stay:

```js
{ level_id: 'general_participation', rank: 1, /* … unchanged … */ },
{ level_id: 'lo_ambassador',         rank: 2, /* … unchanged … */ },
{ level_id: 'senior_lo_ambassador',  rank: 3, /* … unchanged … */ }
```

- [ ] **Step 4: Update the existing tests**

Run: `sed -i '' "s/'l1'/'general_participation'/g; s/'l2'/'lo_ambassador'/g; s/'l3'/'senior_lo_ambassador'/g" test/services/lo-program.test.js test/scripts/lo-programs-seed.test.js`

Then read the diff and check the one case sed cannot know about: `level_id: 'l9'` is an intentionally invalid id in a rejection test — leave it alone.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/lo-program.js test/
git commit -m "refactor(lo-programs): semantic ambassador level ids"
```

---

### Task 2: Social profile schemas

**Files:**
- Modify: `src/models/lo-program.js` — `FormFieldSchema.type` enum, two new subschemas, `LOProgramApplicationSchema`
- Test: `test/services/lo-program-socials.test.js` (create)

**Interfaces:**
- Consumes: Task 1's level ids.
- Produces: exported `SOCIAL_NETWORKS`, `AUDIENCE_LABELS`, `SOCIAL_SOURCES`, `CONNECTIONS_RANGES`; `social_profiles` and `audience_summary` on the application; `social_profiles` accepted in `FormFieldSchema.type`.

- [ ] **Step 1: Write the failing test**

Create `test/services/lo-program-socials.test.js`:

```js
import { LOProgramApplication, SOCIAL_NETWORKS, AUDIENCE_LABELS } from '../../src/models/lo-program.js'

describe('application social profile subdocuments', () => {
  it('stores a row with its provenance and keeps the raw ALLY metrics', async () => {
    const doc = await LOProgramApplication.create({
      program_id: 'ambassador',
      level_id: 'lo_ambassador',
      user: { key: 'lo-1', email: 'a@b.com', name: 'A B' },
      status: 'pending',
      agreement_accepted: true,
      social_profiles: [
        {
          network: 'linked_in',
          url: 'https://linkedin.com/in/a',
          audience_count: 4120,
          audience_label: 'connections',
          metrics: { connections: 4120, followers: 900 },
          source: 'ally',
          captured_at: new Date('2026-08-18T09:12:00Z')
        }
      ],
      audience_summary: {
        measured_total: 4120,
        claimed_total: 0,
        profile_count: 1,
        range: '2000_5000',
        range_source: 'derived'
      }
    })

    expect(doc.social_profiles[0].metrics.followers).toBe(900)
    expect(doc.audience_summary.range_source).toBe('derived')
  })

  it('rejects a network or label outside the enum', async () => {
    const base = { program_id: 'ambassador', level_id: 'lo_ambassador', status: 'pending',
      agreement_accepted: true, user: { key: 'k', email: 'a@b.com', name: 'A' } }
    await expect(LOProgramApplication.create({
      ...base, social_profiles: [{ network: 'myspace', url: 'https://x.com', source: 'ally' }]
    })).rejects.toThrow(/network/)
    await expect(LOProgramApplication.create({
      ...base, social_profiles: [{ network: 'others', url: 'https://x.com', source: 'ally',
        audience_label: 'fans' }]
    })).rejects.toThrow(/audience_label/)
  })

  it('exports the token lists so nothing has to restate them', () => {
    expect(SOCIAL_NETWORKS).toContain('facebook_fanpage')
    expect(AUDIENCE_LABELS).toEqual(
      expect.arrayContaining(['followers', 'friends', 'connections', 'subscribers', 'members'])
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/services/lo-program-socials.test.js`
Expected: FAIL, `SOCIAL_NETWORKS` is not exported.

- [ ] **Step 3: Add the enums and subschemas**

In `src/models/lo-program.js`, above `LOProgramApplicationSchema`:

```js
/**
 * Network tokens, matching SOCIAL_LINKS in the frontend's
 * src/shared/constants/social-links.ts. `others` is the deliberate escape hatch:
 * ALLY may report a network we have no token for, and dropping the row would
 * lose an audience the applicant is being judged on.
 */
export const SOCIAL_NETWORKS = [
  'facebook_fanpage', 'facebook_profile', 'google_my_business', 'instagram', 'linked_in',
  'tiktok', 'twitter', 'yelp', 'youtube', 'zillow', 'others'
]

/** What the number counts. It differs per network, so it travels with the number. */
export const AUDIENCE_LABELS = ['followers', 'friends', 'connections', 'subscribers', 'members']

/**
 * Where a row came from. `ally` was measured, `moso_profile` is a link the
 * directory already held (no count), `self_reported` is the applicant's own.
 * Never collapse them: a self-typed number passing as a measured one is what
 * would make this block worthless to a reviewer.
 */
export const SOCIAL_SOURCES = ['ally', 'moso_profile', 'self_reported']

export const CONNECTIONS_RANGES = ['under_500', '500_1000', '1000_2000', '2000_5000', '5000_plus']

const SocialProfileSchema = new mongoose.Schema(
  {
    network: { type: String, required: true, enum: SOCIAL_NETWORKS },
    /** Only meaningful for `others`: the name ALLY used, kept verbatim. */
    label: { type: String, default: null },
    url: { type: String, required: true },
    /** null = not measured. Distinct from 0, which is a measurement. */
    audience_count: { type: Number, default: null, min: 0 },
    audience_label: { type: String, default: null, enum: [...AUDIENCE_LABELS, null] },
    /** Raw ALLY payload for this profile — theirs to shape, ours to keep. */
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, required: true, enum: SOCIAL_SOURCES },
    /** When ALLY measured it. Null for anything the applicant typed. */
    captured_at: { type: Date, default: null }
  },
  { _id: false }
)

const AudienceSummarySchema = new mongoose.Schema(
  {
    measured_total: { type: Number, default: 0 },
    claimed_total: { type: Number, default: 0 },
    profile_count: { type: Number, default: 0 },
    range: { type: String, default: null, enum: [...CONNECTIONS_RANGES, null] },
    range_source: { type: String, default: null, enum: ['derived', 'self_declared', null] }
  },
  { _id: false }
)
```

Add both to `LOProgramApplicationSchema`, immediately after `answers`:

```js
    social_profiles: { type: [SocialProfileSchema], default: [] },
    audience_summary: { type: AudienceSummarySchema, default: () => ({}) },
```

Extend the form field type enum:

```js
    type: { type: String, required: true,
      enum: ['text', 'textarea', 'url', 'select', 'checkbox', 'social_profiles'] },
```

- [ ] **Step 4: Run the test**

Run: `npm test -- test/services/lo-program-socials.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/lo-program.js test/services/lo-program-socials.test.js
git commit -m "feat(lo-programs): social profile + audience summary subdocuments"
```

---

### Task 3: ALLY social-profile client

**Files:**
- Modify: `src/services/ally.js`
- Test: `test/services/ally-socials.test.js` (create)

**Interfaces:**
- Consumes: Task 2's enums.
- Produces: `normalizeSocialProfiles(payload) → row[]` and `getSocialProfiles(userKey) → row[] | null`, a row being `{ network, label, url, audience_count, audience_label, metrics, source: 'ally', captured_at }`.

- [ ] **Step 1: Write the failing test**

Create `test/services/ally-socials.test.js`:

```js
import { jest } from '@jest/globals'
import { getSocialProfiles, normalizeSocialProfiles, invalidateAll } from '../../src/services/ally.js'

beforeEach(() => {
  process.env.ALLY_API_URL = 'https://ally.test/api/posts'
  process.env.ALLY_API_KEY = 'test-key'
  global.fetch = jest.fn()
  invalidateAll()
})

describe('normalizeSocialProfiles', () => {
  it('maps ALLY network names onto our tokens and picks the right count per network', () => {
    const rows = normalizeSocialProfiles([
      { network: 'linkedin', url: 'https://linkedin.com/in/a', metrics: { connections: 4120 } },
      { network: 'FB', url: 'https://facebook.com/p', metrics: { followers: 900, friends: 8000 } },
      { network: 'youtube', url: 'https://youtube.com/@a', metrics: { subscriber_count: 9200 } }
    ])
    expect(rows.map((r) => r.network)).toEqual(['linked_in', 'facebook_fanpage', 'youtube'])
    expect(rows.map((r) => [r.audience_count, r.audience_label])).toEqual([
      [4120, 'connections'],
      [900, 'followers'],
      [9200, 'subscribers']
    ])
  })

  it('keeps an unknown network instead of dropping the row', () => {
    const [row] = normalizeSocialProfiles([
      { network: 'Threads', url: 'https://threads.net/@a', metrics: { followers: 1240 } }
    ])
    expect(row.network).toBe('others')
    expect(row.label).toBe('Threads')
    expect(row.audience_count).toBe(1240)
  })

  it('distinguishes an unmeasured profile from one measured at zero', () => {
    const rows = normalizeSocialProfiles([
      { network: 'facebook', url: 'https://facebook.com/private', metrics: {} },
      { network: 'tiktok', url: 'https://tiktok.com/@a', metrics: { followers: 0 } }
    ])
    expect(rows[0].audience_count).toBeNull()
    expect(rows[1].audience_count).toBe(0)
  })

  it('drops only rows with no usable url', () => {
    expect(normalizeSocialProfiles([{ network: 'linkedin' }, { url: '' }])).toEqual([])
  })
})

describe('getSocialProfiles', () => {
  it('calls the keyed endpoint and stamps every row as ally-sourced', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ data: [{ network: 'linkedin', url: 'https://linkedin.com/in/a',
        metrics: { connections: 10 }, measured_at: '2026-08-18T09:12:00Z' }] })
    })
    const rows = await getSocialProfiles('admin-key-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toBe('ally')
    expect(rows[0].captured_at).toEqual(new Date('2026-08-18T09:12:00Z'))
    expect(global.fetch).toHaveBeenCalledWith(
      'https://ally.test/api/posts/v1/users/social-profiles?key=admin-key-1',
      expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': 'test-key' }) })
    )
  })

  it('returns null — unknown, not empty — when ALLY cannot be asked', async () => {
    global.fetch.mockRejectedValueOnce(new Error('timeout'))
    await expect(getSocialProfiles('admin-key-1')).resolves.toBeNull()

    global.fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    await expect(getSocialProfiles('admin-key-2')).resolves.toBeNull()
  })

  it('reports a user ALLY has never seen as no profiles, which is an answer', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
    await expect(getSocialProfiles('nobody')).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/services/ally-socials.test.js`
Expected: FAIL, `normalizeSocialProfiles` is not exported.

- [ ] **Step 3: Implement the adapter and the client**

Append to `src/services/ally.js`, above the default export:

```js
const socialCache = new Map()

/**
 * ALLY's network names are theirs, not ours, and the endpoint does not exist yet
 * (expected 2026-08-19) — so these alias tables absorb the difference and stay
 * the only thing that changes if their shape differs from what we asked for.
 */
const NETWORK_ALIASES = {
  linkedin: 'linked_in', 'linked-in': 'linked_in', linked_in: 'linked_in',
  facebook: 'facebook_fanpage', fb: 'facebook_fanpage', facebook_page: 'facebook_fanpage',
  facebook_fanpage: 'facebook_fanpage', facebook_profile: 'facebook_profile',
  instagram: 'instagram', ig: 'instagram',
  tiktok: 'tiktok', youtube: 'youtube', yt: 'youtube',
  x: 'twitter', twitter: 'twitter',
  yelp: 'yelp', zillow: 'zillow', google_my_business: 'google_my_business'
}

/** Metric key -> our label. ALLY may send any spelling on the left. */
const METRIC_ALIASES = {
  followers: 'followers', follower_count: 'followers', followers_count: 'followers',
  friends: 'friends', friend_count: 'friends', friends_count: 'friends',
  connections: 'connections', connection_count: 'connections',
  subscribers: 'subscribers', subscriber_count: 'subscribers',
  members: 'members', member_count: 'members'
}

/** Which metric is "audience" for each network, when several are sent. */
const PRIMARY_LABEL = {
  linked_in: 'connections',
  facebook_fanpage: 'followers',
  facebook_profile: 'friends',
  instagram: 'followers',
  tiktok: 'followers',
  twitter: 'followers',
  youtube: 'subscribers'
}

const toNetwork = (raw) => {
  const key = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return NETWORK_ALIASES[key] || 'others'
}

const toMetrics = (raw) => {
  const out = {}
  for (const [key, value] of Object.entries(raw || {})) {
    const label = METRIC_ALIASES[String(key).trim().toLowerCase()]
    if (label && Number.isFinite(Number(value))) out[label] = Number(value)
  }
  return out
}

/**
 * One canonical row per profile. Anything unrecognised is preserved rather than
 * discarded: a row without a count is still a link a manager can open, and a
 * network we have no token for is still an audience.
 */
export const normalizeSocialProfiles = (payload) => {
  if (!Array.isArray(payload)) return []
  return payload.reduce((rows, item) => {
    const url = String(item?.url || '').trim()
    if (!url) return rows

    const network = toNetwork(item?.network)
    const metrics = toMetrics(item?.metrics)
    const preferred = PRIMARY_LABEL[network]
    const label = preferred && metrics[preferred] !== undefined
      ? preferred
      : Object.keys(metrics)[0] || null

    rows.push({
      network,
      label: network === 'others' ? String(item?.network || '').trim() || null : null,
      url,
      // null is "not measured"; 0 is a measurement. Never conflate them.
      audience_count: label ? metrics[label] : null,
      audience_label: label,
      metrics,
      source: 'ally',
      captured_at: item?.measured_at ? new Date(item.measured_at) : null
    })
    return rows
  }, [])
}

/**
 * Every profile ALLY holds for one user, or `null` when ALLY could not be asked.
 * `null` is not `[]`: one means unknown, the other means they have none, and the
 * page renders them differently.
 */
export const getSocialProfiles = async (userKey) => {
  if (!userKey) return null

  const cached = socialCache.get(userKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const cfg = config()
  if (!cfg) return null

  const url = `${cfg.base}/v1/users/social-profiles?key=${encodeURIComponent(userKey)}`
  let res
  try {
    res = await fetch(url, {
      headers: { 'x-api-key': cfg.key, accept: 'application/json' },
      signal: AbortSignal.timeout(ALLY_TIMEOUT_MS)
    })
  } catch (error) {
    console.warn('[ally] social-profiles unreachable:', error?.message || error)
    return null
  }

  if (res.status === 404) {
    socialCache.set(userKey, { value: [], expiresAt: Date.now() + CACHE_TTL_MS })
    return []
  }
  if (res.status === 401 || res.status === 403) {
    console.error(`[ally] social-profiles rejected the service key (${res.status}) — check ALLY_API_KEY`)
    return null
  }
  if (!res.ok) {
    console.warn(`[ally] social-profiles returned ${res.status}`)
    return null
  }

  const body = await res.json().catch(() => null)
  if (!Array.isArray(body?.data)) {
    console.warn('[ally] social-profiles returned an unexpected shape')
    return null
  }

  const value = normalizeSocialProfiles(body.data)
  socialCache.set(userKey, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}
```

Extend `invalidateAll` so both caches clear together, and add the new functions to the default export:

```js
export const invalidateAll = () => {
  cache.clear()
  socialCache.clear()
}

export default { getPostingReadiness, getSocialProfiles, normalizeSocialProfiles, invalidateAll }
```

- [ ] **Step 4: Run both ALLY suites**

Run: `npm test -- test/services/ally.test.js test/services/ally-socials.test.js`
Expected: PASS. The existing readiness tests must still pass — `invalidateAll` changed.

- [ ] **Step 5: Commit**

```bash
git add src/services/ally.js test/services/ally-socials.test.js
git commit -m "feat(ally): social-profile client with a permissive normaliser"
```

---

### Task 4: Accept, derive and persist on submit

**Files:**
- Modify: `src/validation/lo-program.js` — `validateSubmitApplication`
- Modify: `src/services/lo-program.js` — `validateAnswers`, `submitApplication`
- Test: `test/services/lo-program-socials.test.js` (extend)

**Interfaces:**
- Consumes: Task 2's schemas, Task 3's `normalizeSocialProfiles`.
- Produces: `submitApplication` persists `social_profiles` + `audience_summary`; the request body accepts `social_profiles: [{ url, audience_count }]` and nothing else.

- [ ] **Step 1: Write the failing test**

Append to `test/services/lo-program-socials.test.js`:

```js
import { loProgramService } from '../../src/services/lo-program.js'
import { DEFAULT_CATALOG, DEFAULT_FORMS, LOProgramCatalog, LOProgramForm }
  from '../../src/models/lo-program.js'

const seed = async () => {
  await LOProgramCatalog.insertMany(DEFAULT_CATALOG)
  await LOProgramForm.insertMany(DEFAULT_FORMS)
}

const submission = (overrides = {}) => ({
  program_id: 'ambassador',
  level_id: 'lo_ambassador',
  agreement_accepted: true,
  user: { key: 'lo-1', email: 'a@loanfactory.com', name: 'A B', nmls: '123' },
  answers: { why: 'I refer people already.' },
  ...overrides
})

describe('submitApplication with social profiles', () => {
  beforeEach(seed)

  it('derives network and label from the url instead of trusting the client', async () => {
    const app = await loProgramService.submitApplication('ambassador', submission({
      // a hostile payload: the network claimed does not match the link
      social_profiles: [{ url: 'facebook.com/mine', audience_count: 8000, network: 'linked_in' }]
    }))
    expect(app.social_profiles[0].network).toBe('facebook_fanpage')
    expect(app.social_profiles[0].audience_label).toBe('friends')
    expect(app.social_profiles[0].source).toBe('self_reported')
    expect(app.social_profiles[0].captured_at).toBeNull()
  })

  it('keeps measured and claimed totals apart', async () => {
    const app = await loProgramService.submitApplication('ambassador', submission({
      social_profiles: [{ url: 'facebook.com/mine', audience_count: 8000 }],
      ally_profiles: [{ network: 'linkedin', url: 'https://linkedin.com/in/a',
        metrics: { connections: 4120 }, measured_at: '2026-08-18T00:00:00Z' }]
    }))
    expect(app.audience_summary.measured_total).toBe(4120)
    expect(app.audience_summary.claimed_total).toBe(8000)
    expect(app.audience_summary.profile_count).toBe(2)
  })

  it('derives the range from measured rows, and marks self-declared otherwise', async () => {
    const measured = await loProgramService.submitApplication('ambassador', submission({
      ally_profiles: [{ network: 'linkedin', url: 'https://linkedin.com/in/a',
        metrics: { connections: 4120 } }]
    }))
    expect(measured.audience_summary).toMatchObject({ range: '2000_5000', range_source: 'derived' })

    const declared = await loProgramService.submitApplication('ambassador', submission({
      user: { key: 'lo-2', email: 'b@loanfactory.com', name: 'B C', nmls: '124' },
      answers: { why: 'x', connections_range: '5000_plus' }
    }))
    expect(declared.audience_summary).toMatchObject({ range: '5000_plus', range_source: 'self_declared' })
  })

  it('does not derive a range from rows that were never measured', async () => {
    const app = await loProgramService.submitApplication('ambassador', submission({
      answers: { why: 'x', connections_range: '1000_2000' },
      ally_profiles: [{ network: 'facebook', url: 'https://facebook.com/private', metrics: {} }]
    }))
    // measured_total is 0 only because nothing could be measured; deriving
    // under_500 from that would assert a small audience on no evidence
    expect(app.audience_summary.range_source).toBe('self_declared')
    expect(app.audience_summary.range).toBe('1000_2000')
  })

  it('rejects a half-filled self-reported row', async () => {
    await expect(loProgramService.submitApplication('ambassador', submission({
      social_profiles: [{ url: 'facebook.com/mine' }]
    }))).rejects.toThrow('INCOMPLETE SOCIAL PROFILE')
    await expect(loProgramService.submitApplication('ambassador', submission({
      social_profiles: [{ audience_count: 900 }]
    }))).rejects.toThrow('INCOMPLETE SOCIAL PROFILE')
  })

  it('ignores an entirely empty row — that is a row they decided against', async () => {
    const app = await loProgramService.submitApplication('ambassador', submission({
      social_profiles: [{ url: '', audience_count: '' }]
    }))
    expect(app.social_profiles).toEqual([])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/services/lo-program-socials.test.js`
Expected: FAIL, `social_profiles` is not persisted.

- [ ] **Step 3: Teach `validateAnswers` to skip the declaration field**

In `src/services/lo-program.js`, inside `validateAnswers`, immediately after `const value = answers[field.key]`:

```js
    // A social_profiles field declares that this program collects profiles from
    // this level up; the data itself travels in the top-level payload key, so it
    // never appears in `answers` and must not be read as a missing answer.
    if (field.type === 'social_profiles') continue
```

- [ ] **Step 4: Derive and persist**

Add to `src/services/lo-program.js`, above `submitApplication`:

```js
import { normalizeSocialProfiles } from './ally.js'
import { CONNECTIONS_RANGES } from '../models/lo-program.js'

/** Host -> network + unit, mirroring the frontend's SOCIAL_URL_PATTERNS. */
const HOST_NETWORKS = [
  [/(^|\.)linkedin\.com$/, 'linked_in', 'connections'],
  [/(^|\.)facebook\.com$/, 'facebook_fanpage', 'friends'],
  [/(^|\.)instagram\.com$/, 'instagram', 'followers'],
  [/(^|\.)tiktok\.com$/, 'tiktok', 'followers'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube', 'subscribers'],
  [/(^|\.)(x\.com|twitter\.com)$/, 'twitter', 'followers'],
  [/(^|\.)yelp\.com$/, 'yelp', 'followers'],
  [/(^|\.)zillow\.com$/, 'zillow', 'followers']
]

/**
 * Network and unit come from the URL, never from the request. A payload naming
 * LinkedIn for a Facebook link would put a false provenance beside a real
 * number, and provenance is the only reason these numbers are worth reading.
 */
const describeUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return null
  let host
  try {
    host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host.includes('.')) return null
  const hit = HOST_NETWORKS.find(([re]) => re.test(host))
  return hit
    ? { network: hit[1], audience_label: hit[2], label: null }
    : { network: 'others', audience_label: 'followers', label: host }
}

const toSelfReported = (rows = []) =>
  rows.map((row) => {
    const url = String(row?.url || '').trim()
    const rawCount = row?.audience_count
    const hasCount = rawCount !== undefined && rawCount !== null && String(rawCount).trim() !== ''

    // An empty row is one they decided against, not an error.
    if (!url && !hasCount) return null

    // Both halves or neither: a link with no number, or a number with no link,
    // is a half-answer the reviewer cannot act on.
    if (!url || !hasCount) throw new Error('INCOMPLETE SOCIAL PROFILE')

    const described = describeUrl(url)
    if (!described) throw new Error('INVALID SOCIAL PROFILE URL')

    const count = Number(String(rawCount).replace(/[^0-9]/g, ''))
    if (!Number.isFinite(count)) throw new Error('INVALID SOCIAL PROFILE URL')

    return {
      ...described,
      url,
      audience_count: count,
      metrics: { [described.audience_label]: count },
      source: 'self_reported',
      captured_at: null
    }
  }).filter(Boolean)

const RANGE_CEILINGS = [[500, 'under_500'], [1000, '500_1000'], [2000, '1000_2000'],
  [5000, '2000_5000'], [Infinity, '5000_plus']]

const toRange = (total) => (RANGE_CEILINGS.find(([ceiling]) => total < ceiling) || [])[1] || '5000_plus'

/**
 * Measured rows and the applicant's own rows, summarised without ever being
 * added together, plus the range and where that range came from.
 */
const summarise = (measured, mine, declaredRange) => {
  const counted = measured.filter((row) => row.audience_count !== null)
  const measuredTotal = counted.reduce((sum, row) => sum + row.audience_count, 0)
  const claimedTotal = mine.reduce((sum, row) => sum + (row.audience_count || 0), 0)

  // Rows existing is not the test — a non-null count is. Rows ALLY returned but
  // could not measure would otherwise derive `under_500` from a total of zero.
  const derived = counted.length > 0

  return {
    measured_total: measuredTotal,
    claimed_total: claimedTotal,
    profile_count: measured.length + mine.length,
    range: derived
      ? toRange(measuredTotal)
      : (CONNECTIONS_RANGES.includes(declaredRange) ? declaredRange : null),
    range_source: derived ? 'derived' : (declaredRange ? 'self_declared' : null)
  }
}
```

Then inside `submitApplication`, before the `create` call:

```js
  // `ally_profiles` is the measured set the caller already fetched — the route
  // passes whatever getSocialProfiles returned, tests pass it directly.
  const measured = normalizeSocialProfiles(payload.ally_profiles || [])
  const mine = toSelfReported(payload.social_profiles)
  const social_profiles = [...measured, ...mine]
  const audience_summary = summarise(measured, mine, payload.answers?.connections_range)
```

and add `social_profiles, audience_summary` to the object passed to `LOProgramApplication.create`.

- [ ] **Step 5: Guard the envelope**

In `src/validation/lo-program.js`, add to `validateSubmitApplication` before `handleValidationErrors`:

```js
  body('social_profiles').optional().isArray({ max: 20 })
    .withMessage('social_profiles must be an array of at most 20 rows'),
  body('social_profiles.*.url').optional().isString().trim().isLength({ max: 500 }),
  body('social_profiles.*.audience_count').optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1000000000 }).withMessage('audience_count must be a non-negative integer'),
```

Network, label, source, captured_at and every total are deliberately absent: the service derives them, so accepting them would only create a way to lie.

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/lo-program.js src/validation/lo-program.js test/services/lo-program-socials.test.js
git commit -m "feat(lo-programs): persist social profiles with server-derived provenance"
```

---

### Task 5: Expose the measured profiles to the page

**Files:**
- Modify: `src/services/lo-program.js` — the `/lo-programs/me` reducer
- Test: `test/services/lo-program-socials.test.js` (extend)

**Interfaces:**
- Consumes: Task 3's `getSocialProfiles`.
- Produces: `ally_social_profiles: row[] | null` on the `me` response, consumed by the frontend plan's social block.

- [ ] **Step 1: Write the failing test**

```js
import { invalidateAll as invalidateAllyCache } from '../../src/services/ally.js'

describe('me: measured profiles', () => {
  beforeEach(seed)

  it('carries the measured rows, and null when ALLY could not be asked', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: [{ network: 'linkedin', url: 'https://linkedin.com/in/a',
        metrics: { connections: 4120 } }] })
    })
    const mine = await loProgramService.getMine('ambassador', 'lo-1')
    expect(mine.ally_social_profiles).toHaveLength(1)

    invalidateAllyCache()
    global.fetch = jest.fn().mockRejectedValue(new Error('down'))
    const unknown = await loProgramService.getMine('ambassador', 'lo-2')
    expect(unknown.ally_social_profiles).toBeNull()
  })
})
```

If `getMine` is named differently in the service, use the actual exported name — read the file first.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/services/lo-program-socials.test.js -t "measured profiles"`
Expected: FAIL, `ally_social_profiles` is undefined.

- [ ] **Step 3: Add the field**

Fetch both ALLY answers concurrently — they are independent, and neither may delay the page:

```js
  const [ally_readiness, ally_social_profiles] = await Promise.all([
    getPostingReadiness(userKey),
    getSocialProfiles(userKey)
  ])
```

and return `ally_social_profiles` alongside `ally_readiness`.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/lo-program.js test/services/lo-program-socials.test.js
git commit -m "feat(lo-programs): return ALLY-measured profiles from /me"
```

---

### Task 6: CSV columns

**Files:**
- Modify: `src/services/lo-program.js` — `exportCSV`
- Test: `test/services/lo-program-socials.test.js` (extend)

**Interfaces:**
- Consumes: Task 4's stored fields.
- Produces: CSV columns `measured_total`, `claimed_total`, `profile_count`, `range`, `range_source`, `social_profiles`.

- [ ] **Step 1: Write the failing test**

```js
describe('exportCSV with socials', () => {
  beforeEach(seed)

  it('keeps the two totals in separate columns and flattens the rows', async () => {
    await loProgramService.submitApplication('ambassador', submission({
      social_profiles: [{ url: 'facebook.com/mine', audience_count: 8000 }],
      ally_profiles: [{ network: 'linkedin', url: 'https://linkedin.com/in/a',
        metrics: { connections: 4120 } }]
    }))
    const { csv } = await loProgramService.exportCSV({ program_id: 'ambassador' })
    const [header, row] = csv.split('\n')
    expect(header).toContain('measured_total,claimed_total,profile_count,range,range_source')
    expect(row).toContain('linked_in|https://linkedin.com/in/a|4120|connections|ally')
    expect(row).toContain('facebook_fanpage|facebook.com/mine|8000|friends|self_reported')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/services/lo-program-socials.test.js -t "exportCSV with socials"`
Expected: FAIL, the header lacks the columns.

- [ ] **Step 3: Add the columns**

```js
  const header = ['name', 'email', 'nmls', 'role', 'level', 'status', 'submitted_at', 'decided_by',
    'measured_total', 'claimed_total', 'profile_count', 'range', 'range_source', 'social_profiles',
    ...answerKeys]
```

and in the row array, before `...answerKeys.map(...)`:

```js
      r.audience_summary?.measured_total ?? '',
      r.audience_summary?.claimed_total ?? '',
      r.audience_summary?.profile_count ?? '',
      r.audience_summary?.range ?? '',
      r.audience_summary?.range_source ?? '',
      (r.social_profiles || [])
        .map((p) => [p.network, p.url, p.audience_count ?? '', p.audience_label ?? '', p.source].join('|'))
        .join('; '),
```

`csvEscape` already quotes any cell containing a comma, quote or newline, so the joined cell needs no special handling.

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/lo-program.js test/services/lo-program-socials.test.js
git commit -m "feat(lo-programs): social columns in the CSV export"
```

---

### Task 7: Form v2 and the recruiter role option

**Files:**
- Modify: `src/models/lo-program.js` — `DEFAULT_FORMS`
- Modify: `src/services/lo-program.js` — `getForm`, only if it does not already select the newest version
- Test: `test/scripts/lo-programs-seed.test.js` (extend)

**Interfaces:**
- Consumes: Task 2's `social_profiles` field type.
- Produces: `ambassador-apply` v2 and `lo-recruiter-apply` v2, which the frontend renders.

- [ ] **Step 1: Write the failing test**

```js
it('publishes ambassador-apply v2 without the two link fields', async () => {
  await seedLoPrograms({ log: () => {} })
  const v2 = await LOProgramForm.findOne({ form_id: 'ambassador-apply', version: 2 }).lean()
  expect(v2.fields.map((f) => f.key)).toEqual(['social_profiles', 'connections_range', 'why', 'experience'])
  // Role is not asked here: it comes from the directory (Duyen 2026-08-10)
  expect(v2.fields.map((f) => f.key)).not.toContain('current_role')
  expect(v2.fields.find((f) => f.key === 'connections_range').required).toBe(false)
  // v1 stays immutable so historical applications keep validating against it
  const v1 = await LOProgramForm.findOne({ form_id: 'ambassador-apply', version: 1 }).lean()
  expect(v1.fields.map((f) => f.key)).toContain('linkedin')
})

it('offers corporate_coach on the one form that asks for a role', async () => {
  await seedLoPrograms({ log: () => {} })
  const recruiter = await LOProgramForm.findOne({ form_id: 'lo-recruiter-apply', version: 2 }).lean()
  expect(recruiter.fields.find((f) => f.key === 'current_role').options).toEqual([
    'loan_officer', 'team_leader', 'corporate_coach', 'branch_manager', 'operations_support'
  ])
})

it('a fresh submission is pinned to the newest form version', async () => {
  await seedLoPrograms({ log: () => {} })
  const app = await loProgramService.submitApplication('ambassador', {
    program_id: 'ambassador', level_id: 'lo_ambassador', agreement_accepted: true,
    user: { key: 'lo-9', email: 'z@loanfactory.com', name: 'Z', nmls: '9' },
    answers: { why: 'x', connections_range: '1000_2000' }
  })
  expect(app.form_version).toBe(2)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- test/scripts/lo-programs-seed.test.js`
Expected: FAIL, no v2 documents.

- [ ] **Step 3: Add the v2 form documents**

Append to `DEFAULT_FORMS`, leaving both v1 entries untouched — published versions are immutable:

```js
  {
    /**
     * v2 replaces the two free-text link fields with the social_profiles block:
     * ALLY now reports a Loan Officer's connected profiles with audience counts,
     * which two text inputs cannot hold. `connections_range` drops to
     * required:false because the frontend raises it to required only when
     * nothing was measured — with measured rows present, asking for a range as
     * well is two numbers for one fact.
     *
     * Role is deliberately absent: it comes from the Loan Factory directory,
     * like name, email and NMLS (Duyen 2026-08-10).
     */
    form_id: 'ambassador-apply',
    version: 2,
    fields: [
      { key: 'social_profiles', type: 'social_profiles', required: false,
        visible_when: { level_rank_gte: 2 } },
      { key: 'connections_range', type: 'select', required: false,
        options: ['under_500', '500_1000', '1000_2000', '2000_5000', '5000_plus'],
        visible_when: { level_rank_gte: 2 } },
      { key: 'why', type: 'textarea', required: true, visible_when: { level_rank_gte: 2 } },
      { key: 'experience', type: 'textarea', required: false, visible_when: { level_rank_gte: 2 } }
    ]
  },
  {
    // Only change from v1: corporate_coach joins the role options. This is the
    // one form that asks for a role at all.
    form_id: 'lo-recruiter-apply',
    version: 2,
    fields: [
      { key: 'current_role', type: 'select', required: true,
        options: ['loan_officer', 'team_leader', 'corporate_coach', 'branch_manager',
          'operations_support'] },
      { key: 'recruiting_experience_years', type: 'select', required: false,
        options: ['none', 'under_2', 'two_to_five', 'five_plus'] },
      { key: 'availability', type: 'select', required: true, options: ['full_time', 'part_time'] },
      { key: 'phone', type: 'text', required: false },
      { key: 'linkedin', type: 'url', required: false },
      { key: 'experience', type: 'textarea', required: true },
      { key: 'why', type: 'textarea', required: false }
    ]
  }
```

- [ ] **Step 4: Make sure the newest version is the one served**

Read `getForm` in `src/services/lo-program.js`. If it does not sort by version descending, change the lookup to `.sort({ version: -1 })` — a v2 document nobody selects leaves this whole change inert. The `form_version` assertion in Step 1 is what proves it.

- [ ] **Step 5: Run the suite and the linter**

Run: `npm test && npm run lint`
Expected: both clean.

- [ ] **Step 6: Reseed staging**

```bash
npm run lo-programs:seed -- --reset-applications
```

Expected: `catalog upserted: ambassador`, `form kept (immutable): ambassador-apply v1`, `form created: ambassador-apply v2`, and a non-zero applications-deleted count. Staging holds only test data, so dropping it is the intended path rather than migrating level ids.

- [ ] **Step 7: Commit and push**

```bash
git add src/models/lo-program.js src/services/lo-program.js test/
git commit -m "feat(lo-programs): ambassador-apply v2 + corporate_coach role option"
git push -u origin <branch>
```

---

## Verification before handing over

- [ ] `npm test` green and `npm run lint` clean.
- [ ] `git grep -n "'l1'\|'l2'\|'l3'" src test` returns nothing but the intentionally invalid `'l9'`.
- [ ] `git grep -n "audience_count" src/validation` shows the count accepted but network, label, source and the totals absent.
- [ ] A submission whose `social_profiles` claims a network that contradicts its URL stores the network derived from the URL.
