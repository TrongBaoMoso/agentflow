# LO Programs — social profiles, value conventions, and apply-form redesign

**Date:** 2026-08-18
**Repos:** `moso-aid` (backend, base `master`) · `lf-homepage` (frontend, base `production`)
**Program:** `ambassador` (`LO Ambassador Program`)
**Status:** design approved, not yet implemented

---

## 1. Why

The Ambassador apply form asks Level 2/3 applicants for two social links and a
self-selected connections bucket, because at build time no audience data existed
anywhere. ALLY is adding an endpoint that returns a Loan Officer's connected
social profiles **with audience counts**, which changes what the form should ask
and what a reviewing manager can trust.

Seven changes were requested. They divide into three groups:

| Group | Requests |
|---|---|
| Data model / integration | dynamic social profiles with metrics (3, 4, 5), value conventions (7) |
| Catalog & questions | role options (2) |
| UI | level cards in the form (1), hero CTA covering all levels (6), modal density |

Staging holds only throwaway test data, so breaking changes to identifiers are
allowed and the catalog is reseeded rather than migrated.

## 2. Current state (verified in code)

- The question set is **catalog data**, not code: `lo_program_forms` documents,
  immutable per `{form_id, version}` (`moso-aid/src/models/lo-program.js`).
  `ApplyModal` renders from `detail.forms` and never from hardcoded inputs.
- Select option values are already snake_case tokens; the FE maps token → i18n
  label. The model comment states the rule: never store display strings.
- `level_id` is `l1` / `l2` / `l3`; **all ordering logic runs on `rank`** —
  `visible_when.level_rank_gte`, `isLevelOpen`, `status.heldRank`.
- ALLY is **not** an eligibility gate for Level 2/3. `isLevelOpen`'s
  application branch reads only `requires_nmls`, `state !== 'pending'` and
  `rank > heldRank`; the `ally` value it receives is never consulted there.
  What ALLY affects is `primaryAction`'s single-CTA priority chain:
  `join → ally_enable → ally_channels → apply`.
- `answers` is a flat scalar map. `validateAnswers` throws
  `INVALID FIELD VALUE` for any non-string, non-boolean value, and `exportCSV`
  maps answer keys as scalars. **An array cannot live in `answers`.**
- The MOSO profile already carries `stored_social_links` (`SocialLink[]`) and
  `is_corporate_coach: boolean`.
- A network-token vocabulary already exists:
  `lf-homepage/src/shared/constants/social-links.ts` — 11 tokens plus URL
  regexes. No second vocabulary will be introduced.
- `moso-aid/src/services/ally.js` establishes the integration pattern:
  `x-api-key`, 4s timeout, 60s cache, and the discipline that `null` means
  *unknown* and must never render as *false*.

## 3. Value conventions

**Governing rule: identity must not encode order.** `"1"/"2"/"3"` couples a
level's identity to its rank, so inserting a level between two others forces
either a dishonest id (`"2.5"`) or a migration of every historical row. A
semantic slug lets `rank` change freely while identity stays fixed — and a log,
CSV or Jira ticket reading `senior_lo_ambassador` needs no lookup table.

| Concern | Convention |
|---|---|
| `level_id` | semantic snake_case slug, never numeric, never renamed |
| ordering | `rank` only |
| every other token | lowercase snake_case, never a display string |
| FE single source | `src/shared/constants/loPrograms.ts` — `const X = [...] as const` → `type X = (typeof X)[number]` |
| BE single source | exported const array from the model + `enum:` on the schema field |

**Where an enum belongs.** If code branches on the value, it is a code enum.
If only humans read it, it is catalog data.

- Code enums: form field `type`, social `source`, `audience_label`, `network`.
- Catalog data (changeable without a deploy): the level list, `current_role`
  options, `connections_range` options, statuses, transitions.

**Level id rename** (`ambassador` program):

| Old | New | rank |
|---|---|---|
| `l1` | `general_participation` | 1 |
| `l2` | `lo_ambassador` | 2 |
| `l3` | `senior_lo_ambassador` | 3 |

The obvious slug for rank 2 would be `ambassador`, but that is already the
`program_id` — `program=ambassador level=ambassador` in a log or CSV reads as a
mistake. The slugs follow the level names instead (`Loan Officer Ambassador`,
`Senior Loan Officer Ambassador`), which keeps every identifier distinct.

The `lo_recruiter` program already complies (`recruiter`, `team_lead`) and is
left alone. Reseed with `npm run lo-programs:seed --reset-applications`; the
FE's `RAIL` constant in `HeroSection` disappears anyway (see §8).

## 4. Social profiles — data model

Stored **top-level on the application**, not inside `answers`, because
`validateAnswers` rejects non-scalars and `exportCSV` assumes scalars:

```js
social_profiles: [{
  network: 'linked_in',          // SOCIAL_LINKS token; 'others' when unmapped
  label: null,                   // free text, only when network === 'others'
  url: 'https://linkedin.com/in/…',
  audience_count: 4120,          // normalised, sortable; null = not measured
  audience_label: 'connections', // followers|friends|connections|subscribers|members
  metrics: { connections: 4120, followers: 900 }, // raw ALLY payload, verbatim
  source: 'ally' | 'moso_profile' | 'self_reported',
  captured_at: '2026-08-18T09:12:00Z' // when ALLY measured; null for self_reported
}],
audience_summary: {
  measured_total: 5100,          // sum of source ally|moso_profile rows
  claimed_total: 8000,           // sum of source self_reported rows
  profile_count: 3,
  range: '5000_plus',            // connections_range token
  range_source: 'derived' | 'self_declared'
}
```

**Measured and claimed totals are never added together.** A combined figure lets
a self-typed number pass as a measured one, which destroys the only property
that makes the block worth reviewing. Two separate figures, everywhere —
form, admin table, CSV.

`audience_summary` is derived at submit time from the frozen rows. Derived data
normally risks drift; here the rows are an immutable snapshot, so it cannot, and
it buys the admin queue a sortable column without mapping arrays per row.

**Snapshot, not live.** Numbers are frozen at submit. A manager deciding five
days later judges what the applicant actually submitted. A second application
(Level 2 then Level 3) produces a second snapshot, so growth between them is
readable at no extra cost.

**What a self-reported row asks for: a link and a number. Nothing else.** The
network and the `audience_label` are derived from the URL's host — LinkedIn
counts connections, Facebook friends, Instagram/TikTok/X followers, YouTube
subscribers — using the host patterns already in
`lf-homepage/src/shared/constants/social-links.ts`. An unrecognised host is
filed as `others` and keeps its hostname rather than being rejected.

The client therefore sends only `{ url, audience_count }` per self-reported row,
and **moso-aid re-derives `network` and `audience_label` from the URL rather than
trusting what the browser sent** — a payload claiming LinkedIn for a Facebook
link would put a false provenance next to a real number, which is the one thing
this block cannot afford.

Validation: a row needs both halves or neither. One half filled is an error that
blocks submit (the applicant sees which half is missing); an entirely empty row
is discarded silently, being a row they decided against. There is no save step
and no per-row cancel — the rows are the form.

**Editability.** `ally` and `moso_profile` rows are read-only, including their
URLs — a wrong link is fixed in ALLY, which stays the single source of truth,
and the form deep-links there. Self-added rows accept **both** a URL and a
count: the manager clicks through to verify either way, so a claimed number is
useful evidence of what the applicant asserts, provided its provenance is
visible.

**No uniqueness constraint on `network`, anywhere.** A Loan Officer may hold
several Facebook pages, and may add more even when ALLY already measured one.
Two profiles are two audiences; merging them would invent a number nobody
measured.

**One dedupe rule only:** same `network` **and** identical normalised URL → a
single row under `ally` (it carries the count as well). Every other collision
renders as two rows, because the discrepancy is the information: an applicant
naming `linkedin.com/in/morgan` while ALLY measured
`linkedin.com/in/morgan-reyes-lo` is something the manager must see.

## 5. ALLY contract

ALLY's endpoint does not exist yet (expected 2026-08-19). Our contract is
defined first and an adapter absorbs whatever shape arrives.

`normalizeSocialProfiles(payload)` in `moso-aid/src/services/ally.js`, beside
`getPostingReadiness` and under the same soft-fail discipline:

- **Metric key aliases** — `followers|follower_count|followers_count`,
  `friends|friend_count|friends_count`, `connections|connection_count`,
  `subscribers|subscriber_count`, `members`.
- **Network aliases** — `facebook|fb|facebook_page` → `facebook_fanpage`,
  `linkedin|linked-in` → `linked_in`, `x|twitter` → `twitter`, and so on.
  Unmapped → `others` with the raw name preserved in `label`. Never drop a row.
- **`audience_count` selection** — LinkedIn → connections; Facebook page →
  followers; Facebook profile → friends; Instagram / X / TikTok → followers;
  YouTube → subscribers; otherwise the first numeric metric found.
- **Failure is soft** — unreachable, timeout, 401/403, or an unexpected shape
  returns `null`, and `null` means *unknown*. The block then falls back to
  `moso_profile` rows. A social-media integration must never 500 the page.

**The ask to send ALLY** (they build toward this; if they diverge, only the
alias tables change):

```
GET /v1/users/social-profiles?key=<moso user key>
x-api-key: <SERVICE_API_KEY>

{ "data": [
  { "network": "linkedin", "url": "https://…", "handle": "morgan-reyes-lo",
    "metrics": { "connections": 4120 }, "measured_at": "2026-08-18T09:12:00Z" }
]}
```

## 6. `connections_range` — conditional, not removed

The field exists because no audience data was available; where ALLY now
supplies data it is double entry, and where ALLY supplies nothing it carries the
entire signal. So its behaviour is conditional, reusing machinery `ApplyModal`
already has — a question the profile can answer is submitted but not shown
(`visibleFields = applicableFields.filter(f => !answeredByProfile(...))`).

| Condition | Behaviour |
|---|---|
| at least one measured row carries a non-null `audience_count` | derive the bucket from `measured_total`, submit it, **do not render the select**; the applicant sees the read-only totals |
| otherwise (no measured rows, **or** rows whose counts are all `null`) | render the select, **required**, `range_source: 'self_declared'` |

The second row covers scenario B1 specifically: rows that exist but were never
measured would otherwise derive `under_500` from a `measured_total` of 0, which
asserts a small audience on no evidence. Rows present is not the test — a
non-null count is.

Catalog keeps `required: false` and `visible_when.level_rank_gte: 2`; the FE
raises it to required in the second branch. No catalog schema change needed.

The label stays **"Professional + social connections"** and gains a hint that it
counts networks no platform measures — a professional network, an owned group, a
past-client list. That breadth is why the field is not redundant with follower
counts.

The page copy "Level 2 prefers 1,000+ · Level 3 prefers 2,000+" moves onto the
level cards as guidance. The rule stays visible; it stops being a question.

## 7. Scenario matrix

**A — data source**

| # | Situation | Form shows | Submitted | Admin sees |
|---|---|---|---|---|
| A1 | ALLY returns rows with counts | read-only rows + Measured total | `source: ally` + `captured_at` | `ALLY · measured 18/08` |
| A2 | ALLY returns empty (no channels connected) | required select + Add profile | range `self_declared` + any self rows | `range 5000_plus · self-declared` |
| A3 | ALLY unreachable / timeout / rejected key | rows from `stored_social_links` (no counts) + required select | `source: moso_profile` | `from profile · not measured` |
| A4 | ALLY down **and** profile has no links | required select + Add profile only | range + any self rows | `no audience data` when empty |
| A5 | Applicant adds a profile | editable row: network + url + count + unit | `source: self_reported`, `captured_at: null` | `self-reported` (amber) |

A3 is the discipline case: `ally_readiness: null` means *unknown*, not *none*.
The social block renders as if the question had not been asked.

**B — per-row data quality**

| # | Situation | Handling |
|---|---|---|
| B1 | Link present, count absent (private account, unreadable metrics) | row renders, `audience_count: null`, UI reads `not measured`, excluded from Measured total |
| B2 | Count is 0 | render `0`. Zero is a fact and is distinct from `null` |
| B3 | Unrecognised network | `others` + raw `label`. Row is never dropped |
| B4 | Stale or wrong ALLY link | read-only, with a deep link to ALLY so it is fixed at the source |
| B5 | Several metrics for one network (FB: 900 followers + 4,120 friends) | `metrics` keeps both; `audience_count` follows the per-network rule; UI shows the primary with the rest in a tooltip |

**C — duplication**

| # | Situation | Handling |
|---|---|---|
| C1 | Same network from both ALLY and the profile / applicant | two rows in two sections, each marked by source. Collapsed to one row only when the normalised URL is identical |
| C2 | Two Facebook pages | two rows, and adding more is allowed even when ALLY measured one |

**D — lifecycle**

| # | Situation | Handling |
|---|---|---|
| D1 | Submitted today, decided five days later | frozen snapshot; the manager judges what was submitted |
| D2 | Level 2 then Level 3 application | two snapshots; growth is comparable |
| D3 | Revoked, then applies again | new application, new snapshot |

**E — decided out of scope**

Level 1 is an activation with no form, so Level-1-only participants supply no
social data. Surfacing ALLY-measured audience for them in the admin roster was
considered and **declined** for this change. Social data exists only on Level
2/3 applications.

## 8. Catalog and form changes

Form `ambassador-apply` **v2** (a new version document; v1 stays immutable so
existing applications keep validating against what they were shown):

> **Correction to an earlier draft of this spec.** It had `current_role` added to
> the ambassador form as a required select. That was wrong twice over. v7 —
> the approved mockup, whose header records it as "Duyen's copy + form feedback
> applied" — states inline: *"Role is no longer asked in the form — it comes from
> the Loan Factory directory, same as name/email/NMLS (Duyen 2026-08-10)"*, and
> `grep -c "Your role" v7/ambassador.html` returns 0. The catalog agrees: only
> `lo-recruiter-apply` carries `current_role`. moso-aid's own model comments the
> same decision: *"role comes from the directory, never from a form field — per
> program-owner feedback"*. The ambassador form does not ask for role.

| Field | Change |
|---|---|
| `current_role` | **not added.** Stays absent from `ambassador-apply`; role continues to come from the directory into `user.role` |
| `social_profiles` | **added** (new field type, `required: false`, `visible_when.level_rank_gte: 2`) |
| `connections_range` | kept, `required: false`, conditional per §6 |
| `linkedin`, `other_social` | **removed** — superseded by the social block |
| `why`, `experience` | unchanged |

`corporate_coach` — the fifth role option requested — belongs to
`lo-recruiter-apply`, the only form that asks for role. That form's
`current_role` options become `loan_officer`, `team_leader`, `corporate_coach`,
`branch_manager`, `operations_support`, and `corporate_coach` is prefilled from
`is_corporate_coach` on the profile. This does not touch the ambassador form.

The `social_profiles` form field is a **declaration**, not a data container: it
tells the FE this program collects profiles from rank 2 up (so a program owner
can retarget or disable it without a deploy), while the data travels in the
top-level payload keys of §4. `validateAnswers` must skip fields of this type —
they never appear in `answers`.

Backend work:
- `FormFieldSchema.type` enum gains `social_profiles`.
- `SocialProfileSchema` + `AudienceSummarySchema` subdocuments on the
  application, with `enum:` on `network`, `audience_label`, `source`.
- `validateSubmitApplication` gains chains for the two new top-level keys
  (array bounds, URL shape, non-negative integer counts, token membership).
- `exportCSV` gains columns: `measured_total`, `claimed_total`, `profile_count`,
  `range`, `range_source`, plus one flattened `social_profiles` column
  (`network|url|count|label|source` per row, semicolon-separated).
- `normalizeSocialProfiles` + a `getSocialProfiles(userKey)` client.

Frontend prefill:
- `corporate_coach` is derived from `is_corporate_coach` on the profile.
- `ROLE_PRIORITY` becomes
  `team_leader > branch_manager > corporate_coach > loan_officer > operations_support`.
- i18n keys for the new role option and the social block go into all **5**
  locales (`en`, `es`, `vi`, `zh`, `he`) under
  `LoProgramsShared.form_fields.*`.

## 9. UI

**Level selector (request 1).** `RadioField` → `LevelCardsField`: selectable
cards per the approved mockups, with the real radio input kept (hidden) so
keyboard navigation and screen-reader semantics survive. Selected state is an
orange border plus a tinted surface, using the ported `.lop` design tokens.

**Hero (request 6).** The hero renders one card per level still open to the
viewer, derived from `applicableLevels` — the hardcoded `RAIL` constant goes.
Level 1 routes to `JoinActivationButton`; Levels 2 and 3 open the modal with
`defaultLevelId` already set. Signed-out viewers get cards that route to sign-in.

This deliberately bypasses `primaryAction`'s ALLY-first priority chain, which is
what forced an ALLY-off viewer toward ALLY instead of into an application they
were always eligible for. The nudge is **not** discarded: it becomes a hint on
the Level 1 card ("Recruiting is off in ALLY"), never a block on Level 2/3.

**Social block.** Two labelled sections — `Measured by ALLY` (read-only) and
`Added by you` (editable) — rather than badges alone, so provenance is
structural on the applicant's side. Each row is a single line: network icon,
clickable link (`target="_blank"`), count with unit, capture date. `Add profile`
is a button, not a form left open.

**Modal density.** Two distinct goals, because the row count is dynamic and
zero-scroll cannot be guaranteed:

- **Guaranteed:** Submit is always visible and never requires scrolling —
  `agreement` and Submit move into a sticky footer outside the scroll area.
  This is the failure lf-iq already hit, where a capped-height modal clipped its
  own footer on short viewports.
- **Targeted:** no scrolling in the common path — signed in, ≤3 social rows,
  viewport ≥ 800px.

| Change | Effect |
|---|---|
| sticky footer | Submit always reachable |
| level chip + `change` link when the level came from a hero card | removes the tallest new block in the common path; mirrors the existing single-level branch |
| `size="sm"` on inputs | 36px → 32px (wrappers spread `...otherProps` to Mantine, so no wrapper edits) |
| `gap-5` → `gap-4`, modal `640` → `720` | tighter rhythm, workable two-column rows |
| `current_role` + `connections_range` on one row | two short selects share a line |
| `experience` behind a `+ add detail (optional)` disclosure | reclaims ~96px from an optional question |

Heights, measured in the browser at a 720px modal width rather than estimated —
an earlier draft of this section put the common path at 580px and compared it
against *screen* height, and both were wrong:

| Path | Modal | Needs viewport |
|---|---|---|
| From Get started, Level 1 chosen (ALLY panel) | 514px | 572px |
| From a Level 2 card: chip, social table, why, experience | 803px | 893px |

The panel is capped at `90vh`, so a path fits without scrolling only when the
**viewport** is at least height / 0.9. A 1440×900 laptop leaves roughly 810px of
viewport after browser chrome — about 729px of usable panel — so the second path
scrolls by ~75px. Closing that would mean cutting the `why` textarea or the
experience field, which are the application. **The promise is therefore the
sticky footer, not the absence of scroll**: Submit is always on screen, and
because the measured rows sit in a table (32px per row, not 59px) the remaining
scroll is short and independent of how many channels ALLY reports.

Two defects found by measuring rather than looking, both fixed: the row separator
was `--gray-1`, which is also the read-only row background, so the line was
invisible exactly where rows needed telling apart (now `--gray-2`); and the
modal body's `overflow-y: auto` made `overflow-x` compute to `auto`, so a table
whose min-content exceeded the panel clipped the right edge of every row — the
table now uses `table-layout: fixed` with an ellipsised URL column inside its own
scroll container, the body is `overflow-x: hidden`, and its grid children carry
`min-width: 0` so a wide child scrolls its own box instead of stretching the row.

## 9a. Admin listing

Columns: applicant (avatar, name, NMLS, email) · applied for · holds now ·
**Network** · **Social** · submitted · status · actions.

- **No audience column.** The numbers belong next to the link they came from,
  where a manager is one click from verifying them; a bare total in a cell
  invites being read as a score.
- **Social** shows one icon per profile, undifferentiated. Hover or keyboard
  focus opens a popover listing every profile with its network, link, count and
  provenance (`ALLY · measured 18 Aug` or `LO input`). The popover is
  `position: fixed` and appended to `<body>`: rendered inside the cell it would
  be clipped by the table's own `overflow-x`.
- **Network** is `answers.connections_range` — the column the shipped console
  already has (`ApplicationsTable.tsx`), called "Reach / experience" in v1
  because the same table served the recruiter program, where the equivalent
  answer is `recruiting_experience_years`. It gains a provenance subline:
  `derived from ALLY` or `self-declared`. A Level 1 row has no form and so no
  answer; the cell says `no form at Level 1` rather than showing a blank that
  reads like a bug.
- **Submitted** shows both the date and the age (`Aug 16, 2026` / `2 days ago`).
  The shipped console shows only the date; v1 showed only the age.
- CSV keeps `measured_total` and `claimed_total` as separate columns. Sorting is
  offered on the measured column only.

## 9b. Items awaiting the program owner

Marked `[PROPOSAL]` in the mockup, following v7's own convention. Each changes a
decision Duyen made, so none may be treated as settled:

1. `social_profiles` table replacing the approved `linkedin` and `other_social`
   text fields.
2. `connections_range` becoming conditional — she approved it as always
   required.
3. Applicants listing profiles themselves at all (link + number), which no
   version of the form has asked for.

Everything else in this spec is either already approved in v7 or already shipped
in the catalog.

## 10. Non-goals

- No change to `lo_recruiter` levels or its form.
- No audience data for Level-1-only participants (§7 E).
- No live re-fetch of counts after submit; the snapshot is the record.
- No ALLY-based gating of Level 2/3 eligibility — it never existed and is not
  being added.
- No merging of measured and claimed totals, in any surface.

## 11. Order of work

1. **moso-aid** — value conventions, level-id reseed, schemas and enums,
   `normalizeSocialProfiles` + client, validation, CSV columns, unit tests over
   several plausible ALLY payload shapes. Needs nothing from ALLY.
2. **lf-homepage** — `loPrograms.ts` constants and types, `LevelCardsField`,
   hero level cards, modal density. Needs nothing from ALLY.
3. **lf-homepage** — social block driven by `moso_profile` prefill.
4. **After ALLY ships** — wire the real endpoint, adjust alias tables only.

Testing: unit tests for the normalizer (alias coverage, unknown network, missing
counts, zero counts, dedupe rule) and for `audience_summary` derivation; form
validation tests for the two new payload keys; visual checks of the modal and
hero at 375 / 768 / 1440 in both the measured and no-data branches.

Branches: lf-homepage worktree from `origin/production` (feature → master, and a
separate manual PR into release); moso-aid worktree from `master`.
