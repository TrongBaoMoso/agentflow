## What

A new read-only endpoint for **packs** (MOSO backend), so it can decide LO Recruiter Program credit when a referrer is attached to a lead (Bao 24-25/10): credit is decided **once, at that moment**, from "was this Loan Officer an approved `lo_recruiter` member **at time T**". A member revoked later keeps credit on the leads she already has; a lead referred before approval stays a Referral.

`GET /api/lo-programs/standing/members?program_id=lo_recruiter`

```json
{ "success": true, "program_id": "lo_recruiter", "generated_at": "...",
  "members": [ { "user_key": "<MOSO Admin websafe key>", "approved_at": "ISO", "ended_at": "ISO | null" } ] }
```

- One record per **approved spell** (approved -> revoked/withdrawn ends it; approved again starts a new one), read from `status_history`. **A person's spells that overlap or sit within ~1 s are merged**, so a level move (old row revoked, new row approved a few ms later) reads as one continuous membership.
- **Approval dates never come from `updated_at`** (it moves on every later edit). Every status change and the grandfather script write history, so the two pre-history branches are LEGACY: they use only stable timestamps (the first history event, else `created_at`; an unrecorded end is the last event) and are covered by tests. Counting such rows: the only database reachable from this environment (`.env.dev`, db `test`) has 0 rows in `lo_program_applications`, so there is no staging or production count; no production database was touched.
- **Keys and dates only.** No name, e-mail, answers or levels. Keyless applicants (no MOSO account) are left out: they cannot be a lead's referrer.
- `Cache-Control: no-store`.

## Auth

Its own server-to-server key, the existing pattern: `requireServiceKey('PACKS_INBOUND_SERVICE_KEY')` (header `x-service-key`, constant-time compare, **fails closed with 503 when unset**). Recruit's key and the admin key do **not** open it, and packs' key opens neither of their doors (tested). Added to `startup-check` (required list, and the "inbound keys must all differ" check).

## Tests

- `test/services/lo-program-membership.test.js`: spells (open, revoked, withdrawn then approved again, unordered history, history-less approved row, pending/rejected never a spell) and "keys and dates only".
- `test/routes/lo-programs-packs-standing.test.js`: through the real router: packs key opens, Recruit/admin/no key are 401, unset key is 503, packs key does not open other doors, missing `program_id` is 400.
- `test/config/startup-check.test.js`: the new key is listed and compared.
- Negative control: pointing the route at Recruit's key, or never ending a spell, turns the route and service tests red. Related suites (`test/routes`, `test/config`) pass.

## Deploy

- **New secret `PACKS_INBOUND_SERVICE_KEY`** on moso-aid (staging first), a value different from the other inbound keys. The same value goes into packs as the system property `moso_aid_packs_service_key`.
- Additive and read-only; no data change. Until packs is deployed nothing calls it.

Dependency of packs #3739 (master) / #3740 (3.64.1). Staging only, two reviewers before merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
