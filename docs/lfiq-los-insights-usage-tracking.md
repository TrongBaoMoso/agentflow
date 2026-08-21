# LOS Insights — Usage Tracking Integration (lf-iq Frontend)

> Design spec. Rewritten 2026-06-29 for the platform's 4-feature-type model; revised 2026-08-21
> after the surface-scope repair (P1) and the per-type retyping (P2), both of which changed §5–§9.
> Owner: bao.trinh@loanfactory.com · Source guide: Confluence 2969600001 (rev Jun 26, 2026).

## 1. Goal

Stream lf-iq feature-usage telemetry to the LOS Insights Usage Tracking platform so the org can
see, per user/role/department: how many use a feature, completed vs abandoned, where they get
stuck (funnels), how long it takes, and conversation depth.

Two explicit non-functional goals:
- **Fire-and-forget**: telemetry must never slow or break a feature. Async, swallow all errors.
- **Removability**: the whole integration must be deletable/disable-able in minutes (§8).

## 2. Architecture — FE-direct (Option A), isolated module

Decision (locked): tracking is implemented **on the frontend**; the browser sends events directly
to the LOS API. The FE owns session detection (only the UI knows when a feature opens/closes,
which step a wizard reached, how long a page was viewed).

```
lf-iq (browser)                                  LOS Insights API
─────────────────                                ────────────────
@shared/usage (one isolated module)              POST /events  (batch, recommended)
 ├── UsageTrackingProvider (single wiring point)  POST /event   (single, realtime)
 ├── usageTracker (singleton: buffer/flush)        GET  /features?project_id=…  (resolve ids)
 ├── hooks: useFeatureSession / useStepFlow /      header: X-Usage-Key (per-project)
 │          trackUsageClick / useConversation
 └── usageTransport (swap FE-direct ↔ relay here)
```

### CORS — resolved

Probed 2026-06-29 the LOS API returned no `Access-Control-Allow-*` headers, which would have blocked
every browser call (the custom `X-Usage-Key` header always forces a preflight). That has since been
granted and FE-direct works in production. The relay fallback is no longer needed, but the seam it
would have used still exists: `usageTransport.ts` is the only file that knows how an event leaves the
browser, so swapping to a backend relay remains a one-file change.

## 3. The 4 feature types

A feature's **type** (chosen once in the dashboard, immutable once it has events) decides which
events the FE sends:

| Type | FE sends | Used for | Dashboard |
|---|---|---|---|
| **single_action** | `session_start → session_end(is_complete)` | one op w/ start/end, success + timing | success rate, p50/p95, failure reasons |
| **step_flow** | `session_start → step(step_key)×N → session_end(is_complete)` | ordered multi-step wizard | funnel: drop %, bottleneck, rework |
| **conversational** | `session_start → turn(seq)×N → session_end(is_complete)` | multi-turn chat | avg turns, resolution rate |
| **counter** | `click` (each = +1) | just count clicks/views | total count, distinct users |

## 4. Event model

### 4.1 Endpoints
- `POST {API}/events` — **batch** (recommended). Envelope body: `{ project_id, events: [ {…} ] }`
  (each event has `feature_id` but NOT `project_id`). Returns `202` `{accepted, dropped, dropped_events}`.
  One bad event is dropped, not the batch — EXCEPT a wrong `project_id` rejects the whole batch.
- `POST {API}/event` — **single** (realtime). Flat body: `project_id` inside the event. Returns `202`.
- We use `/events` for **both** paths. The unload path differs only in that it does not await:
  `sendBeacon` cannot set `X-Usage-Key`, so `beaconEvents` posts to the same `/events` with
  `keepalive: true`. `/event` is unused.

### 4.2 Required fields (every event)
`project_id` (envelope for /events) · `feature_id` · `event_type`
(`session_start|session_end|step|turn|click`) · `session_id` (UUID we generate; optional for `click`)
· `email` (the logged-in user's email; lowercased server-side; unknown still accepted) · `timestamp`
(**STRING** — RFC3339 `"2026-…Z"`; a raw number → 400).

### 4.3 Per-type / outcome fields
- `is_complete` (bool) on `session_end` (and `step`). On `session_end`: drives the outcome.
- `end_reason` (string) on `session_end`: drives failed/escalated/active_drop.
- `step_key` (string, **required** on `step`, must be a declared step) — step_flow only.
- `seq` (int, increasing, dedup key) on `turn` — conversational only.

**Outcome is inferred server-side from how you close** (we never compute it):

| Close with | Outcome |
|---|---|
| `session_end` `is_complete:true` | ✅ completed |
| `is_complete:false` + reason contains `escalat…` | ⤴️ escalated |
| `is_complete:false` + reason contains `error/fail/crash/exception` | ❌ failed |
| `is_complete:false` + other/empty | 🚪 active_drop |
| (no `session_end`) | ⏰ timeout (server auto-closes after silence) |

> There is **no `feature_complete` event** in this model. Completion = `session_end` with
> `is_complete:true`. (Earlier draft used `feature_complete`; removed.)

### 4.4 Optional fields (best-effort; bad/missing never drops the event)
- `platform`: always send `"web"`.
- `kind`: user role. Map from `current_profile`: `LOAN_OFFICER→0` (lo), `HOME_OWNER→1` (borrower),
  `REALTOR→2` (realtor); `ADMIN`/unknown → omit (server infers from email).
- `metadata`: small free-form JSON (≤8KB) for debugging only (e.g. `{app_version}`). Optional.

### 4.5 Idle / abandonment
Handled **server-side** (auto-close after the feature's timeout → `timeout`). The client only sends
explicit boundaries: `session_end` on real leave/unmount, `sendBeacon` on tab-close. Tab-switch only
flushes the buffer; it never ends a session. (No client-side idle timer.)

## 5. Registration model (dashboard-managed)

- **Projects & features are created in the Insights Dashboard**, not via API (`POST /projects` and
  `POST /features` both 401 with the service key). Bulk-create = **Import** a catalog JSON
  (Manage catalog → Import → dry-run → Apply). Import matches by id (existing→update, new→create);
  Export→Import carries ids between staging↔prod.
- Project ids live in deploy config only (§9). Staging and production are **separate projects and
  have diverged** — staging is not a rehearsal of production, so read `GET /projects` and
  `GET /features` before trusting any remembered id.
- **A feature's `feature_type` can only be changed while it has zero events.** Measured 2026-08-21,
  not guessed: an import retyping nine features changed the two with no sessions and silently skipped
  the seven that had some, after a dry run that reported `41 UPDATE, 0 ERROR`. **A clean dry run
  proves nothing about what will be written** — always re-read `GET /features` and diff. The Edit
  dialog does not offer the type at all (static badge); name, timeout, allow-anonymous and tags are
  editable.
- Retyping a feature that already has events therefore means creating a new one. Prefer
  **rename-the-old + create-the-new** over delete: the delete dialog keeps the rows but orphans the
  label, whereas a rename leaves the history readable under `<Name> (retired counter)`. Production
  carries seven such retired copies from the P2 retyping.
- **`X-Usage-Key` is per-project**; only the project's creator can view or rotate it. The key is
  read-and-send only: it can `GET /projects`, `GET /features`, `GET /catalog/export` and `POST /events`,
  but `POST /features` and `PATCH /features/{id}` return 401.
- **FE bootstrap = lookup only**: `project_id` from env `NEXT_PUBLIC_USAGE_PROJECT_ID`;
  `GET /features?project_id=<env>` → map feature **name → feature_id**. No project lookup, no POST.
  Names in the FE registry must match the dashboard exactly. Unmapped features no-op.

## 6. Session lifecycle per surface

The type is a claim about what the surface really is, not a default. The rule that drives everything
below: **a passive view must never be a session.** The reader closes the tab, no `session_end` that
means anything ever arrives, and every visit scores as an abandonment or a timeout.

- **counter** — views and fire-and-forget clicks. One `click` per occurrence: `useFeatureView` on
  mount (ref-guarded, so StrictMode's dev double-mount still counts once), or `trackUsageClick` /
  `useUsageClick` on the action. This covers the report and all its sections, every screen view, and
  the count-only loan-officer actions. Redirect CTAs pass `{ sync: true }` so the event leaves via
  keepalive before navigation.
- **single_action** — an attempt with an outcome: `session_start` → `session_end` carrying
  `is_complete`, via `useFeatureSession`. The session ends on the first of
  {`markComplete`, `markFailed`, unmount}; an unmount with no outcome is reported as
  `is_complete:false` + `user_exit`, so "tried and failed" is distinguishable from "opened and walked
  away". Two shapes:
  - *the surface IS the intent* (a modal that exists only because the user opened it) → leave
    `autoStart` on, and the denominator is opens.
  - *mounting means nothing* (a page section whose view is already counted under its own key) →
    `{ autoStart: false }` and call `start()` at the top of the submit handler, so the denominator is
    attempts. Used by `export_database_run` and `profile_save`.
- **step_flow** (`generate_report`) — `session_start` when the wizard opens, one `step` per step
  reached (`step_key` ∈ `GENERATE_REPORT_STEPS`, exported from the registry so the form cannot drift),
  `session_end` on the create call's outcome. Forward progress only: going back is not a new step.
  Edit mode passes `{ enabled: false }`, so editing a report never enters the funnel.
- **conversational** — `session_start` on open, one `turn(seq)` per message round, `session_end` with
  the outcome. Implemented and unit-typed, but **nothing calls it today**: the only candidate,
  `ai_chat`, renders for admin profiles only and admin is out of scope.
- **async** (`bulk_import_homeowner`) — single_action, complete when the upload is **accepted**
  (API 2xx), not when the background job later finishes. That later outcome is a different question.

### Surface scope

Sixteen of the seventeen report keys live in components that are also rendered by the loan officer's
create/edit preview, the admin report list's preview, and a fake-data copy used as decorative
wallpaper. Most of those paths run through `useModal` or `dynamic(() => import(...))`, so a JSX search
shows none of them. `UsageScope` (default on) silences a whole subtree; four surfaces opt out. Because
a plain function cannot read context, a CTA inside such a component must use `useUsageClick`, not
`trackUsageClick`. `__tests__/trackingSurface.test.ts` rebuilds the render graph, cuts it at each
opt-out, and fails if a report key becomes reachable from anywhere else or from an admin page.

## 7. Feature registry (38)

Names must match the dashboard exactly — bootstrap resolves ids by **name**, not by key. The full
list lives in `featureRegistry.ts`; `__tests__/featureRegistry.test.ts` scans `src/` and fails if a
fired key is undeclared, a declared key is fired by nothing, two names collide, a step flow declares
no steps, or a key is driven by a hook its type does not allow.

- **counter (29):** `report_view` + 10 `report_sec_*` · 6 `report_cta_*` · 8 screen views
  (`dashboard`, `homeowners_list`, `referral_partners_list`, `engagement_analytics`,
  `bulk_import_list`, `export_database`, `profile`, `messages`) · `report_resend`,
  `report_download_pdf_lo`, `homeowners_export`, `sync_data`.
- **single_action (8):** `feedback_submit`, `bulk_import_homeowner`, `export_database_run`,
  `referral_partner_invite`, `referral_partner_add`, `homeowners_send_email`, `profile_save`,
  `change_password`.
- **step_flow (1):** `generate_report` (steps `address`, `property`, `contact`).
- **conversational (0).**

Removed rather than retyped: `ai_chat` (admin-only surface) and `set_default_realtor` (its only
caller is a component nothing imports). `messages` was added — it had been passed to a hook without
ever being declared, so it resolved to no id and reported nothing for months.

## 8. FE module design — built for removal

Everything lives under **`src/shared/usage/`** with a single public barrel; feature code imports
**only** from `@shared/usage`.

```
src/shared/usage/
  index.ts                  # BARREL — the only public surface (hooks + helpers)
  types.ts                  # UsageEventType, UsageFeatureType, UsageEvent, FeatureDef…
  featureRegistry.ts        # USAGE_PROJECT_NAME + USAGE_FEATURES (name/key/type/steps)
  usageTransport.ts         # postEvents / beaconEvents — swap FE-direct↔relay HERE only
  usageTracker.ts           # singleton: buffer, 30s flush, sendBeacon, kind/platform, dedup
  usageBootstrap.ts         # GET features by env project_id → name→id map (localStorage-cached)
  hooks.ts                  # useFeatureView · useFeatureSession · useStepFlow · useConversation
                            #   · trackUsageClick · useUsageClick
  UsageScope.tsx            # context switch: silences tracking for a whole subtree
  UsageTrackingProvider.tsx # the SINGLE wiring point (configure + bootstrap), mounted once
```

Removability guarantees:
1. **Single wiring point** — `<UsageTrackingProvider>` mounted once inside `AuthProviderClient`.
2. **Barrel-only imports** — call sites do `import { useFeatureSession } from '@shared/usage'`; never
   deep-import. So `grep -rn "@shared/usage"` lists every touch point.
3. **Comment marker** — every call site tagged `// [usage-tracking]`.
4. **Kill-switch** — drop any one of the three `NEXT_PUBLIC_USAGE_*` vars (§9) and `configure()`
   no-ops the whole module. There is deliberately no separate `ENABLED` flag: a fourth var that can
   disagree with the other three is one more thing to get wrong.
5. **No-op safety** — hooks do nothing when disabled / ids unresolved; a stray call after partial
   removal is harmless.
6. **Edge-only call sites** — hooks are called at mount / success-callback / onClick, never woven
   into business logic, so deletion is surgical.

**To DISABLE:** remove `NEXT_PUBLIC_USAGE_KEY` (or either of the other two) from the deploy env.
**To REMOVE (3 steps):** (a) delete `src/shared/usage/` + remove `<UsageTrackingProvider>` from
AuthProviderClient; (b) `npx tsc --noEmit` → TS errors point at every call site; (c) delete those
call sites (or `grep -rn "@shared/usage\|\[usage-tracking\]"`).
**To UPDATE transport (e.g. FE-direct → backend relay):** edit only `usageTransport.ts` + env.

## 9. Env / config

| Var | Meaning |
|---|---|
| `NEXT_PUBLIC_USAGE_API_URL` | LOS Insights usage API base |
| `NEXT_PUBLIC_USAGE_KEY` | per-project service key, sent as `X-Usage-Key` |
| `NEXT_PUBLIC_USAGE_PROJECT_ID` | the dashboard project these features belong to |

Values are held in the deploy configuration and are **not** recorded here — they differ per
environment and the key is a credential. `.env.example` lists the names with empty values.

Tracking is on when all three are present AND the user is signed in, not impersonated
(`isLoginAs`), and has an email. Feature ids are resolved by name and cached in `localStorage` under
`lfiq_usage_feature_map_v<N>`; the cache has no expiry, so **bump `CACHE` whenever the registry
changes or a dashboard feature is recreated** — a returning browser otherwise keeps posting to ids
that may no longer exist. A map that resolved only part of the registry is used for the session but
never written, so a partial answer cannot become permanent.

## 10. Testing

`src/shared/usage/__tests__/` (node env, mocked globals, mocked transport):

| File | Guards |
|---|---|
| `usageTracker.test.ts` | per-type emission, `is_complete`/`end_reason`, kind/platform, timestamp-as-string, parked-event replay, identity clearing on user change, buffer ceiling |
| `usageTransport.test.ts` | envelope + key; 5xx/429 raise so the batch is re-queued, 4xx are treated as delivered so a rejected batch cannot pin the buffer |
| `usageBootstrap.test.ts` | GET-by-name maps only what exists; a partial map is used but not cached, and is re-fetched next time |
| `featureRegistry.test.ts` | registry ↔ call sites, and each key driven by the hook its type requires |
| `trackingSurface.test.ts` | render graph: report keys reachable only from the report page, nothing reachable from an admin page |
| `usageScope.test.ts` · `featureSession.test.ts` | the scope gate and the imperative half of `useFeatureSession`, rendered server-side |

**Not unit-covered, deliberately:** anything that only happens in a React *effect* — mount
auto-start, the unmount abandon, and the `enabled` toggle in `useStepFlow`/`useConversation`. Effects
need a DOM, the repo has no DOM test environment, and adding `jest-environment-jsdom` to a shared
repo does not belong in a tracking change. Those paths are instead made hard to get wrong in the
code: each cleanup releases its session id, so nothing can attach to a closed session.

## 11. Decision log

- 2026-08-21 (P2): types corrected per surface — 8 form submits to `single_action`, `generate_report`
  to `step_flow`, everything passive stays `counter`. `messages` declared; `ai_chat` and
  `set_default_realtor` removed. Seven event-bearing features were renamed `(retired counter)` and
  recreated so their history survives, which changed their ids and forced a `CACHE` bump.
- 2026-08-21 (P1): `UsageScope` added after finding 16 of 17 report keys firing from previews, the
  admin report list and a decorative backdrop. Report keys are now graph-asserted to one surface.
- 2026-06-29: Option A (FE-direct) confirmed; CORS since granted, so no relay was needed.
- 4-feature-type model adopted (replaces earlier shape/feature_complete draft).
- Type mapping locked; 39-feature catalog imported to staging (dry-run clean, step_flow OK).
- Sections + screen-views = single_action (dwell). generate_report = step_flow (address/property/contact).
- Removability is an explicit design goal (§8).
- Open: confirm lf-iq deployed origin(s) for the CORS allowlist; prod project + its key (separate).
