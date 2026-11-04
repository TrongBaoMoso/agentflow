# Ambassador standing bridge to ALLY, and the ten emails the program never sent

**Bead**: `agentflow-nktr`
**Related**: `agentflow-5dh7` (P1, open — this change closes its remaining third) · `agentflow-048o` (P2, open, PROD — gates event #9; see Prerequisite)
**Repos touched**: `moso-aid` (most code), `lf-homepage` (admin-removal call path only), MOSO Datastore (10 `Template` entities), `ally-specs` (one proposal asking ALLY for one endpoint)

> **Revision 7 (2026-09-21).** Revision 1 was rejected by two independent adversarial reviews; revision 2 was rejected by two more. Both round-2 reviewers independently found the same blocking error in revision 2's own new text. Every finding below was re-verified against the code by the author before being accepted. The change log is at the end.

## Problem

Once a loan officer is approved at Level 2 or 3 of the Ambassador program, everything they were approved *for* happens in ALLY: they post, they run ads, they spend the marketing budget. ALLY is never told what they were approved for.

Three holes, each measured:

**1. ALLY receives exactly one boolean, ever.** `ally.js:448` sends `PUT /v1/users/auto-post-events?key=` with body `{is_auto_lo_recruiting: <bool>}` (`:464`) and nothing else. Level, rank and budget cap are never transmitted.

**2. That one signal is gated to membership *edges*, and the transition that matters most is not an edge.** `syncAllyOnMembershipEdge` (`lo-program.js:620`) returns early when `isMember === wasMember` (`:623`). Revoking Level 2 writes a `fallback` standing at the entry level (`:782-793`) *before* that comparison runs (`:801`); `wasMember` was read at `:768`, before both writes. So the person is still a member, the comparison holds, and **no call is made at all**. The ordering is deliberate — its own comment (`:795-800`) explains why. ALLY never learns a loan officer lost Level 2 and lost the $500 cap. Not late: never. Promotion and demotion are worse — `changeLevel` (`:989-1035`) contains no ALLY call of any kind.

**3. The program sends no email.** `catalog.notifications` (status → template key) exists at `models/lo-program.js:84`, is seeded `{}` for both programs (`:470`, `:540`), and is read by no code — those three lines are its only references in the repo. Approve, reject, revoke, promote, demote, self-withdraw and admin-removal are all silent. The absence is deliberate and documented (`lo-program.js:739-741`), which is why `reason` is mandatory on revocation and why `DecisionModal.tsx` tells the manager "this program sends no email, so this is the only place they will read it".

## Prerequisite for event #9 only

### The literal hole

`PUT /lo-programs/applications/withdraw` (`routes/index.js:245`) carries no gate. Its four sibling admin actions do — `approval` (`:235`), `approval/bulk` (`:238`), `downgrade` (`:246`), `promote` (`:247`) all sit behind `requireLoAdmin`. The route comment ("no more exposed than the sibling admin endpoints already were") was true when written and is now stale: the siblings were gated afterwards; this one was missed.

The route serves three callers; only two carry proof (`resolveWithdrawSubject`, `:880-910`):

| Caller | Credential | Real proof? |
|---|---|---|
| Accountless applicant | `status_token`, 32-hex, from their own `?ref=` link | yes |
| Signed-in loan officer | `program_id` + their own `user_key` | yes |
| Admin | `id` + `by_admin: true` + `actor_key` (unchecked string) | **no** |

`validateWithdraw` (`validation/lo-program.js:149-174`) requires only that `id` be a valid Mongo id when `by_admin` is set. The id is obtainable: `GET /lo-programs/me?user_key=` is public (`routes/index.js:251`) and returns `latest_application` as a raw `.lean()` document.

**This is not new scope.** Bead `agentflow-5dh7` — which commissioned this very feature — stated on 2026-09-05: *"withdraw PHAI khoa bang status_token hoac user key, khong duoc chi nhan id"*, with the consequence *"ai cung rut duoc don cua nguoi khac"*. Two selectors satisfy it; the admin one is exactly what the bead forbade. That bead is open at P1.

### The larger hole behind it, which this change neither creates nor closes

Closing the literal hole is necessary and not sufficient, but the part that remains is **not specific to this feature** and is not this change's to fix.

`agentflow-048o` (P2, **open**, production), measured 2026-09-11 unauthenticated with a deliberately bogus value:

```
GET https://lf-homepage-…-us-central1.run.app/                 -> HTTP 200
-H 'x-moso-user-id: BOGUS-DIRECT-PROBE-NOT-A-KEY'  /lo-info-check
    -> the page renders the bogus value as the resolved identity (6 echoes)
negative control: a value never sent                            -> 0 echoes
```

The Cloud Run service answers the public internet on its own `*.run.app` URL, so a caller skips App Engine. The bead names what is behind that door: *"/manage-lo-programs/[programSlug] renders AdminConsole for a key whose looked-up profile carries the program permission — and that console can **Revoke / Decline / Remove** other people from the program. **Write-capable.**"* It also measured the obvious mitigation away: *"Datastore Admin keys base64-embed the account email, so they are **guessable-shaped from a target's identity, not secret-shaped**."*

The proxy this change routes through says the same of itself (`loAdminProxy.ts:20-24`): *"`x-moso-user-id` ... is an **UNVERIFIED claim** on this app — it is **defence-in-depth and UX parity, not a hard boundary**."* Mechanically `actorKey` is read from the query string (`:221`) and `assertSameSite` (`:118-141`) compares only the `Origin`/`Referer` host, which any same-origin `fetch` satisfies and any non-browser client can simply set.

**Two things follow, and revision 3 got both wrong.**

First, `048o`'s own text is *"TWO PARTS, BOTH NEEDED. Neither alone is sufficient"* — (a) ingress restriction and (b) a verifiable identity. Revision 3 named part (a) alone as the gate. Part (a) closes the `*.run.app` bypass; a forged identity presented at the **front door** is closed only by (b). Worse, `loAdminProxy.ts` does not call `resolveMosoUserKey` at all — it reads the query parameter itself — so it is **structurally outside `048o`'s enumerated surfaces**, and fixing all 23 production `resolveMosoUserKey` call sites would leave it untouched. Recording that is a task of this change; fixing it is not.

Second, and decisively: this exposure reaches **every admin action equally** — Approve, Reject, Revoke, Promote, Demote and Remove all travel the same proxy and the same `authorize()`. Revision 3 held event #9 behind a flag while letting events #3–#7 ship unconditionally. There is no principle behind that line: the hole is the console, not one button.

**Decision (with the user, 2026-09-21): accepted, with the two paths separated.**

| Path | Reachable by | Scope of effect | This change |
|---|---|---|---|
| Self-declared `by_admin` | **anyone** | the Remove button only | **fixed here** (three steps below) — the feature would otherwise be creating new harm |
| Forged `x-moso-user-id` | someone holding a guessable-shaped privileged key | **all six admin actions** | **accepted and recorded**; escalated on `048o`, which also gains the `loAdminProxy` finding |

The distinction that justifies the split is **who can reach the path**, not how much harm it does. The first path is reachable by anyone at all, so leaving it open while attaching new effects to it would be this feature creating a new class of victim. The second requires possession of a guessable-shaped privileged key, predates this work, and applies uniformly to six admin actions.

**What this change adds on the second path, stated plainly rather than minimised.** An earlier draft called the email "amplification of an existing capability, not a new door". That was not honest, and two things make it false:

- **A real third-party financial consequence that does not exist today.** Hole #2 above means a forged revocation currently reaches ALLY *not at all*. Closing that hole is the point of this change — so afterwards, the same forged write **will** cut a real person's budget in a live third-party system. That is new leverage handed to a forger by this work.
- **Attacker-chosen text delivered from a trusted domain.** `reason` is routed into the outbound email by design. A forger can today revoke a level; afterwards they can additionally make Loan Factory's own mail system deliver wording of their choosing to a named victim. That is phishing-shaped, and nothing like it exists before this feature.

The decision is to accept both, because gating six of ten events behind an open-ended P2 would stop the feature without reducing the underlying access-control risk by one bit — that risk is closed by `048o(a)+(b)` plus the proxy fix, and by nothing here. What is **not** acceptable is accepting it quietly, so it is written down, escalated on `048o`, and listed here as a consequence of shipping rather than a footnote.

### Rollout

Removing the `by_admin` branch from the public route is a breaking change for any client still calling it, and this repo has had a production incident from getting exactly this sequence backwards (`reference_mosoaid_admin_gate_prod_rollout_order`: the lf-homepage proxy must deploy first).

1. **moso-aid** — add a gated admin route, `PUT /lo-programs/applications/withdraw/admin`, behind `requireServiceKey('LO_ADMIN_SERVICE_KEY')`. Its controller sets `by_admin: true` **server-side**; the flag is never read from the body on this route. It reuses `withdraw()` unchanged. The public route is untouched. Both live.
2. **lf-homepage** — add `lo-programs/applications/withdraw/admin: ['PUT']` to `ADMIN_ROUTES` (`loAdminProxy.ts:39-60`); repoint `withdrawFromLoProgram`'s admin branch (`loProgramsQueueApi.ts:105-141`) from `MOSO_AID` direct to the `LO_ADMIN` proxy, sending `program_id` so the proxy re-checks *this* program's `required_permission`. Deploy. **The two self-service branches are not touched** — neither of their credentials is a service key.
3. **moso-aid** — only once step 2 is live: make the **public route's controller** ignore `by_admin` entirely (hardcode the self-service path) and split `validateWithdraw` into `validateWithdrawSelf` (drops the `by_admin`/`actor_*` fields and the `by_admin` arm of its custom body validator at `validation/lo-program.js:164-172`) and `validateWithdrawAdmin` (requires `id`, `actor_key`, `reason`). **The `byAdmin` branch inside `resolveWithdrawSubject` is NOT deleted** — the gated route depends on it. Step 3 changes routing and validation only, never the shared service function.

**Event #9's emitter ships in the same moso-aid release as step 3, and no earlier.** The emitter hangs on the `withdraw()` function, which both routes call, so it cannot tell them apart; arming it between steps 2 and 3 would let a zero-credential forged call debit a third-party budget and email the victim, which is strictly worse than today. Shipping it *with* step 3 removes that window without a feature flag — and so removes the flag's own failure mode, a misparsed env var that fails open, in a repo that has already shipped an inverted boolean to production once (`resolveMosoUserKey`, 2026-09-10, reverted the next day). Events #1–#8 and #10 carry no such constraint.

## Solution

Three parts, each extending a mechanism already in production.

### 1. Push — a second call in the existing ALLY client

```
PUT {ALLY_API_URL}/v1/users/ambassador-standing?key=<mosoUserKey>
x-api-key: <ALLY_API_KEY>

{ "program_id": "ambassador", "status": "approved",
  "level_id": "lo_ambassador", "level_name": "LO Ambassador", "rank": 2,
  "budget_max_monthly": 500,
  "effective_at": "2026-09-18T09:14:22.031Z",
  "updated_at":   "2026-09-18T09:14:22.031Z" }
```

Same base URL, same `x-api-key`, same `mosoUserKey` identity, same 4 s timeout (`ally.js:27`), same soft-fail. **No `reason`.**

**Fired unconditionally on every lifecycle action; it must NOT reuse `syncAllyOnMembershipEdge`.** That gate is right for a binary switch and wrong for level-and-budget data, and it is the whole of hole #2. The two gates it keeps are still correct: `usesAllyActivation(program)` — the LO Recruiter program must not pay for the call — and `user?.key` (`:605`), since no Moso key means no ALLY account.

ALLY builds the receiving endpoint. The house way to ask is a proposal in `ally-specs/openspec/changes/`, as `user-posting-readiness-api` (on `origin/dev`) produced the `posting-readiness` endpoint moso-aid calls today. That companion proposal must also state the **required bulk-poll interval** as a hard requirement.

### 2. Pull — two read endpoints on moso-aid

```
GET /api/lo-programs/ally/standing?program_id=&key=<mosoUserKey>
GET /api/lo-programs/ally/standings?program_id=&status=&updated_since=<cursor>&limit=
```

Behind the repo's existing `requireServiceKey('ALLY_INBOUND_SERVICE_KEY')` — **not a new `x-api-key` scheme.** `middleware/service-auth.js` already does sha256 + `timingSafeEqual` (`:30-35`), returns **503** when the secret is unset (`:40-44`) and **401** for a missing or wrong key (`:54-56`), and guards fifteen routes. A second inbound idiom whose header name collides with the *outbound* ALLY key is how a later implementer wires the wrong secret into the wrong door. A **separate env var** from `LO_ADMIN_SERVICE_KEY` on purpose: a leaked third-party key should reach two read-only, no-PII endpoints, not the admin surface.

**The bulk endpoint gathers rows in two phases.** This is the part revision 2 left ambiguous and is easy to get wrong:

1. **Scan** `{program_id, updated_at: {$gte: cursor.updated_at − GRACE}}` ordered by `(updated_at, _id)` to collect the **distinct `user.key`s** touched in the window.
2. **Re-query every current row** for each of those people, then call `resolveAllyStanding` on the complete set.

Resolving over the window-scoped rows alone is wrong and silently so: someone holding a months-old approved Level 1 row who submits a Level 2 application today would have only the new `pending` row inside the window, and the resolver would report `pending` for a person who is actually an approved member — disagreeing with the per-user endpoint, which the design promises cannot happen.

`next_cursor` is computed from the **last row scanned** in phase 1, never from the emitted set. A row collapsed by per-person resolution must not be able to push the cursor past data that was never delivered.

**`status=` and `updated_since=` are separate modes**, not composable: `status=` is the full-roster read, `updated_since=` is reconciliation. Supplying both is a 400 rather than a query no index covers.

**Both modes run the same two-phase gather.** `status=` must not filter the raw `status` field and emit what it finds, because a person can hold **two simultaneously `approved` rows**: `joinActivationLevel` writes a Level 1 standing through `upsertStanding` (source `self`, `:504-551`) entirely off the application axis, and a later Level 2 approval writes a second — which is precisely why `getMine` resolves by highest rank across a *set* of approved rows (`:1180-1181`) rather than reading one. A raw filter would return that person twice, once at the wrong rank and budget, contradicting both the "one resolved row per person" rule and the success criterion that a person with four history rows appears once. So `status=` scans for matching rows, re-queries each matched person's complete row set, resolves, and only then filters to the requested **resolved** status. The scan cannot miss anyone, because every resolved status in the table is backed by at least one raw row of that same status — the resolution only ever *demotes* a candidate out of the result, never conjures one the scan did not see. The existing `{program_id, status}` index serves phase 1 of that scan.

**Both modes paginate by the same `(updated_at, _id)` cursor.** `limit=` caps a page; it does not page. A roster larger than one page is walked with `next_cursor` exactly as reconciliation is, so there is one paging mechanism rather than two.

### 3. Email — ten events, derived from the action

MOSO renders a named `Template` entity; `WebPlusAPI.java:1060-1069` hands the whole request JSON to `EmailTemplateOp`, and templates accept free-text `String` context params (`escalation_ticket_change_status.json` declares `note: String, title: String`), so level names, both budget figures and the reason all reach the body.

The existing `sendEmailToLO` (`event.js:133-140`) cannot be reused as-is: it builds a fixed four-key payload (`eventName, name, email, template`) and forwards nothing else. A sibling `sendProgramEmail` adds the per-event context. The transport, endpoint and auth posture (`POST /api/webplus/v1/{ns}/sendEmail`, no auth header, by design) are unchanged.

## Decisions

### Product (with the user, 2026-09-21)

- **We grant the CAP, not the ledger.** `budget_max_monthly` travels as a ceiling. ALLY owns spend, accrual, periods and reconciliation. Consequence, stated plainly: we cannot answer "how much has this person spent".
- **Push *and* pull, not either.** Push-only was rejected on its failure mode: one dropped 4-second call leaves ALLY permanently showing a revoked loan officer as funded, with no path to notice.
- **Routing through MOSO Datastore was rejected.** Ambassador data lives in moso-aid's MongoDB; mirroring it into Datastore would create a second copy of one truth, and the service behind `/ai/mcp/api` has no repo in `agentflow`.
- **Ten events, not eight.** The user's list plus the two the code performs that nobody named: **application submitted** and **admin removal**.
- **No internal notification to admin or marketing.** The apparent precedent is not one — in `event.js:252-260` "internal" means an *internal loan officer*, and both branches mail the applicant.

### Correctness

- **Events derive from the action, never from the stored status.** The stored status misreports intent in both directions:
  - `changeLevel` writes `applyStatus(..., 'revoked', ...)` on the outgoing row for a **promotion** as well as a demotion, `note` defaulting to `Moved up to ${target.name}` (`:1010-1011`).
  - A move is deliberately two rows (`:975-982`).
  - `withdraw` calls `applyStatus` **once per live row** (`:943-947`) and one person can hold several — the code cites a production case of an approved Level 1 standing *plus* a pending Level 2 application (`:845-848`).
  - The emitter therefore sits at the six **action** functions — `joinActivationLevel`, `submitApplication`, `updateApproval`, `promote`, `downgrade`, `withdraw` — and **never on `applyStatus` or `upsertStanding`**, the shared primitives all six funnel through. That single mistake reproduces every double- and N-fire above at once. `promote`/`downgrade` are wrapped individually rather than `changeLevel`, which is also what disambiguates promoted from downgraded without inspecting status.
- **`submitApplication` needs a new check to tell #2 from #10.** Its only guard is a `status: 'pending'` duplicate check (`:450-455`); re-applying after a rejection creates a brand-new document and never touches the old row, so `transitions: {rejected: ['pending']}` is never consulted on this path (`assertTransition` runs only inside `applyStatus`). The event is `application_resubmitted` when any prior row exists for this applicant+program under the same `applicantFilter`, otherwise `application_submitted`. This check does not exist today and is in scope.
- **`bulkUpdateApproval` emits one event per row, intended.** It loops `await updateApproval(...)` serially (`:1041-1052`), so N rows give N events — correct, N people each get their own decision.
- **Bulk dispatch must be bounded, not fire-and-forget on faith.** The existing bulk pattern (`event.js:547-552`) dispatches unawaited. On Cloud Run that is only safe with CPU always allocated; with request-scoped CPU, queued work can stop mid-flight with no exception and therefore **no log line at all** — a push failure that `logMosoSideEffectFailure` cannot catch, and one that fails open. **Verify the service's CPU allocation as a task.** If it is request-scoped, dispatch with bounded concurrency and await the batch instead; the endpoint's latency is then bounded by the 4 s timeout times the number of waves, not by N.
- **Revocation is a demotion to Level 1, not an exit.** `:770-779`: "Levels 2 and 3 are separate offers, not rungs you climb". A revoked loan officer's outbound row is `level_id: general_participation, budget_max_monthly: null, status: approved`.
- **One resolved row per person, and it must be able to say "gone".** Revision 1 proposed reusing `getMine`'s derivation. That was wrong: the query is `status: 'approved'` only (`:1162`), and `withdraw` deliberately writes **no** fallback row (`:935-947`, contrasted with revoke at `:839-843`). A fully withdrawn person holds zero approved rows, so an approved-only endpoint would drop them from the list **permanently** — a dropped push on departure would never be reconciled, which is the failure the pull path exists to prevent.

  One `resolveAllyStanding(program, rows)` serves the per-user endpoint, the bulk endpoint and the push. Precedence, highest first:

  | Rows held | Emitted | Level / budget | `effective_at` |
  |---|---|---|---|
  | any `approved` | `approved` | highest-**rank** approved (not most recent — `:1170-1181`), its level's cap | `at` of that row's newest `approved` `status_history` entry |
  | else newest live is `pending` | `pending` | level applied for, cap `null` | `at` of its `pending` entry |
  | else any `withdrawn` | `withdrawn` | `null` / `null` | `at` of the newest `withdrawn` entry |
  | else any `revoked` | `revoked` | `null` / `null` | `at` of the newest `revoked` entry |
  | else newest is `rejected` | `rejected` | level applied for, cap `null` | `at` of its `rejected` entry |
  | no rows | omitted from the list; per-user 404 | — | — |

  The `revoked` tier is not redundant with the fallback rule. `updateApproval` writes the entry-level standing only when the revoked level **is not itself** the entry level (`:783`, `if (entry && entry.level_id !== updated.level_id)`), so revoking someone's Level 1 — their only standing — writes no fallback and leaves a single `revoked` row. Without this tier that person falls through to "no rows" and is dropped from the list, which is the same disappearing act the `withdrawn` tier exists to prevent: someone who lost their standing must be reported as having lost it, not omitted.

    `effective_at` is read from `status_history`, never from the row's `updated_at` — the two drift the moment anything edits a row without a status change. "Newest live is `pending`" is well defined because the submit-time guard (`:450-455`) permits at most one live `pending` row per applicant+program.

  Rows with `user.key == null` are **excluded from both endpoints and from the push**: a keyless applicant has no ALLY account (the existing `pushAllySwitch` already returns `null` for them, `:605`), and production holds five such rows. `superseded_by` rows need no special case — the resolver reads the person.
- **Add the index the cursor depends on.** `LOProgramApplicationSchema` has three indexes plus the partial unique one on `status_token` (`:379-392`); **none mentions `updated_at`**. Add `{ program_id: 1, updated_at: 1, _id: 1 }`.

### Reconciliation and failure

- **The watermark is issued by us and re-read with a grace window.** Three hazards:
  1. *ALLY's clock* — never used; the cursor is the opaque `next_cursor` we return.
  2. *Millisecond ties* — the cursor is a `(updated_at, _id)` pair; two rows can share a millisecond.
  3. *Late-committing write* — `updated_at` is stamped by Node, not the database (`timestamps: { updatedAt: 'updated_at' }`, `:377`), and moso-aid runs several Cloud Run instances. Instance A can stamp at `t1`, instance B stamp and commit at `t2 > t1`, a page read through `t2` and advance the cursor — and A's row lands afterwards holding `t1`, behind the cursor and **excluded forever**. Direction: a lost *revocation* leaves ALLY funding someone cut off (fails open); a lost *promotion* under-credits (a bug). Mitigation: scan from `cursor.updated_at − GRACE` (named constant, initially 60 s). Re-sending a few unchanged rows per poll is the price; the push is idempotent, so a repeat costs ALLY nothing.
- **Push and email log and continue; neither blocks the business action.** Following `logMosoSideEffectFailure` (`event.js:47-49`). The page still shows the correct status, so a failed email costs latency, not information.
- **The startup config check is a floor, not an alarm.** Every "loud" precedent here is a bare `console.warn`/`console.error` wired to nothing. A single startup-time `console.error` naming each unset required variable is still worth having — it turns a silent months-long outage into one line at the top of a deploy log — but it is not alerting, and this proposal does not claim it is. Directions differ by variable: `ALLY_INBOUND_SERVICE_KEY` unset fails **closed** (503, verified `:40-44`); `ALLY_API_URL`/`ALLY_API_KEY` unset fails **open** (push silently no-ops, ALLY over-grants past a revoke); `API_CRAWL` unset silently kills all ten emails — the same shape as the bug `config/api.js` already had, which `ally.js`'s `config()` comment warns about.
- **Bulk-poll cadence is a requirement on ALLY, not their discretion.** Pull heals immediately for anyone who logs in; for anyone who does not, correctness returns only on ALLY's schedule. "No path to notice" honestly reads "no *bounded* path to notice" unless the interval is committed, so the companion `ally-specs` proposal states it.

### Privacy

- **`reason` is not sent to ALLY.** It is free text an admin types when taking a level back or removing someone, and can carry a complaint, a compliance matter, or a third party's name. It reaches exactly the two audiences that need it, both already built: the **admin**, via the service-key-gated roster, rendered from `status_history` at `AdminConsole/ApplicationDrawer.tsx:448`; and the **loan officer**, on their program page and now by email. Revision 1's "no PII" decision covered only the read endpoints and left the push — the one channel leaving our estate — unexamined.
- **Membership status itself is disclosed, and that is accepted.** `rejected` and `withdrawn`, keyed to a person, tell ALLY something about an internal recognition programme. This is not free, but it is load-bearing: ALLY must know not to grant budget to someone rejected or departed, and the `withdrawn` tier exists precisely so a departure cannot go unreconciled. Considered and accepted; `reason` is the part that was not necessary and is dropped.
- **Neither read endpoint returns a name or an email.** `key` plus standing fields only; ALLY already keys its own records by `mosoUserKey`. An `x-api-key` in a Cloud Run env var is readable by anyone with project Viewer, so it is a latch rather than a boundary, and a latch should not be the only thing in front of a roster of names.
- **Per-user rate limiting is descoped, with the reason recorded.** moso-aid has no shared store and no rate-limit dependency (25 packages, none matching), and it runs several instances, so an in-process counter would read as protection while providing none. More to the point it would protect nothing: a caller holding the inbound key can read the whole roster from the bulk endpoint in one request, so throttling the per-user endpoint does not reduce what a leaked key yields. The control that matters is the key's blast radius, which is why it is separate from `LO_ADMIN_SERVICE_KEY` and why the payload carries no PII.

## The ten events

`catalog.notifications` is re-keyed from **status** to **event** — a schema change that breaks nothing, since the map is `{}` today and read by no code — so the ten template names stay config rather than constants.

| # | Event | Action | Function | Stored status | Reason |
|---|---|---|---|---|---|
| 1 | `level_activated` | Self-activate Level 1 | `joinActivationLevel` | `approved` (source `self`) | — |
| 2 | `application_submitted` | Submit Level 2/3, no prior row | `submitApplication` | `pending` | — |
| 3 | `application_approved` | Approve | `updateApproval('approved')` | `approved` | — |
| 4 | `application_rejected` | Reject | `updateApproval('rejected')` | `rejected` | — |
| 5 | `level_revoked` | Revoke | `updateApproval('revoked')` | `revoked` + `fallback` | enforced, `:747` |
| 6 | `level_promoted` | Promote | `promote` → `changeLevel('up')` | `revoked` + `approved` | — |
| 7 | `level_downgraded` | Demote | `downgrade` → `changeLevel('down')` | `revoked` + `approved` | enforced, `:993` |
| 8 | `member_left` | Leave | `withdraw(by_admin=false)` | `withdrawn` | — |
| 9 | `member_removed` | Remove (admin) | `withdraw(by_admin=true)` | `withdrawn` | already enforced, `:898` |
| 10 | `application_resubmitted` | Submit with a prior row present | `submitApplication` | `pending` | — |

Copy that must not be written the obvious way:

| Event | True message | The false one it is easy to write |
|---|---|---|
| 5 revoke L2 | No longer at LO Ambassador; **still in the program** at Level 1; the $500 cap is gone. Plus reason. | "You have been removed from the program" |
| 7 demote 3→2 | Moved from Senior to LO Ambassador. Cap $1,000 → **$500**. Plus reason. | "Your level was revoked" |
| 6 promote 2→3 | Congratulations — Senior LO Ambassador. Cap $500 → **$1,000**. | "Your level was revoked" |
| 9 remove | Out of the program entirely, Level 1 included; they may apply again; nothing is deleted. Plus reason. | The same copy as #8, thanking someone for a decision they did not make |

`DecisionModal`'s existing help text is the reference wording for 5, 7 and 9 — the manager and the recipient should read the same account of what happened.

## Scope

**In** — the withdraw-auth prerequisite (three steps, as specified); shipping event #9's emitter in the same release as step 3; recording the `loAdminProxy` gap on `agentflow-048o`; `resolveAllyStanding`; the two read endpoints behind `requireServiceKey`; the two-phase bulk gather; the standing push in `ally.js`; the event emitter over the six action functions; the new prior-row check in `submitApplication`; wiring `changeLevel` to push; the `{program_id, updated_at, _id}` index; the `notifications` re-key and `sendProgramEmail`; the startup config check; verifying the Cloud Run CPU allocation and bounding bulk dispatch accordingly; tests.

**Out** — `agentflow-048o` itself (larger than this feature; recorded as a dependency for event #9); any spend, ledger or period entity; enforcing `min_connections` / `min_referrals_per_90_days` (advisory, model comment `:42-46`); a retry queue or outbox; internal notification to admin or marketing; per-user rate limiting (reason recorded above); ALLY's own implementation; any change to the two self-service withdraw selectors.

## Success criteria

- Revoking Level 2 from someone who also holds Level 1 produces **one** push carrying `level_id: general_participation, budget_max_monthly: null` — the case that produces no call at all today.
- Promoting Level 2 → 3 produces **one** push and **one** email, and the email says promoted — although two rows were written and one says `revoked`.
- Withdrawing a Level 2 member produces a bulk-list row reading `status: withdrawn, level_id: null, budget_max_monthly: null`. **They are still returned.**
- Revoking a member's Level 1 — their only standing, so no fallback is written — produces `status: revoked, level_id: null, budget_max_monthly: null`. **They are still returned**, not dropped.
- A member holding an approved Level 1 standing whose only change in the poll window is a new `pending` Level 2 application is reported `approved` at Level 1 — not `pending`. This is the criterion that fails if the bulk endpoint resolves over window-scoped rows.
- A member holding an approved Level 1 standing *and* a pending Level 2 application who leaves produces **one** email and **one** push, not two.
- Submitting after a rejection emits `application_resubmitted`; a first submission emits `application_submitted`.
- A 50-row bulk revoke returns within a bound that does not grow with N, with ALLY unreachable.
- A person with four history rows appears **once** in the bulk list, in **both** modes.
- A member who self-activated Level 1 and was then approved for Level 2 — two simultaneous `approved` rows — appears **once**, at Level 2 with the $500 cap, in `status=approved`. This is the criterion that fails if `status=` filters raw rows.
- A roster larger than one page is fully walked with `next_cursor` in `status=` mode.
- Three standings written in the same millisecond are all returned across a paged sync; a row committed late, stamped behind an already-issued cursor, is delivered on the next poll.
- No response from either read endpoint contains a name or an email address, and no push payload contains `reason`.
- Both read endpoints return **401** for a missing or wrong key and **503** when the secret is unset.
- Supplying both `status=` and `updated_since=` returns 400.
- Event #9's emitter is absent from the moso-aid release that carries step 1, and present in the one that carries step 3.
- After step 3, an admin removal sent straight to the public moso-aid route is treated as a self-service request and refused for want of a credential; a loan officer's own self-withdrawal still succeeds without a service key; and the gated admin route still works.
- A loan officer who submits a Level 2 application receives an acknowledgement — today they receive nothing.

## Change log

**Revision 2 → 5** (six reviewers across three rounds; both round-2 reviewers independently raised the first item, and round 3 caught the `status=` gap):

| Finding | Severity | Fix |
|---|---|---|
| "Hooks land after step 2" re-opens the hole with a loudspeaker attached during the step-2→3 window | BLOCKING ×2 | Event #9's emitter ships **in the same release as step 3** — no window, and no flag to misconfigure |
| Routing through the proxy was described as establishing admin identity; `x-moso-user-id` is a forgeable query param and `048o` is an open production bug with `Remove` explicitly behind it | BLOCKING | Stated plainly |
| *(round 3)* `048o(a)` was named as the gate, but the bead says *"both parts needed"*, and `loAdminProxy` never calls `resolveMosoUserKey` so it sits outside `048o`'s surfaces entirely | CRITICAL | Corrected; the proxy gap is recorded on `048o`; the residual is accepted rather than mis-gated |
| *(round 3)* Events #3–#7 face the identical exposure yet only #9 was flagged — no principle behind the line | HIGH | Line removed; the two paths are separated by *who can reach them*, and the decision is recorded with the other tradeoffs |
| *(round 3)* Flag parse/polarity unspecified, in a repo that shipped an inverted boolean to production | MEDIUM | Flag removed entirely |
| Bulk endpoint's row scope unspecified — resolving over window-scoped rows misreports an approved member as `pending` | HIGH | Two-phase gather specified; `next_cursor` from rows scanned |
| `submitApplication` has no signal to tell #2 from #10 | HIGH | New prior-row check specified and added to scope |
| Step 3 "delete the `by_admin` branch" would break the new gated route, which shares the service function | HIGH | Specified as a controller + validator split; the service branch is kept |
| `effective_at` underived | MEDIUM | Read from `status_history`, per branch |
| Cursor basis (scanned vs emitted) unspecified | MEDIUM | From the last row scanned |
| Success criterion said 401 for an unset secret | MEDIUM | 503 unset, 401 wrong — matches `service-auth.js` |
| New index does not cover `status=` combined with the cursor | MEDIUM | Modes made mutually exclusive; 400 if combined |
| *(round 3)* `status=` mode was left resolving over raw rows — a member holding a self-activated Level 1 standing **and** an approved Level 2 has two `approved` rows and would be emitted twice, at the wrong rank | HIGH | `status=` runs the same two-phase gather-then-resolve; filtering happens on the **resolved** status |
| *(round 3)* `status=` had `limit=` but no paging | MEDIUM | Both modes paginate by the same `(updated_at, _id)` cursor |
| *(author, round 4)* The precedence table had no `revoked` tier. Revoking someone's **Level 1** writes no fallback (`:783` compares against the entry level), so their only row is `revoked` and they fell through to "no rows" — dropped from the list, exactly like the `withdrawn` bug round 1 caught | HIGH | `revoked` tier added between `withdrawn` and `rejected` |
| Bulk fire-and-forget may be silently killed by request-scoped Cloud Run CPU | MEDIUM | Verify allocation; bound the dispatch if request-scoped |
| Rate limiting named but no mechanism exists that works across instances | MEDIUM | Descoped with the reason recorded |
| Disclosure of `rejected`/`withdrawn` to ALLY not addressed | MEDIUM | Considered and accepted explicitly |
| Prose implied `sendEmailToLO` could carry the new context | LOW | It cannot — fixed four-key payload; `sendProgramEmail` is new |
| Citations `:606` and `:743` off by a line or two | LOW | Corrected to `:605` and `:747` |

**Revision 1 → 2**: pull reused `getMine`'s approved-only derivation so a withdrawn person vanished forever (BLOCKING); `withdraw(by_admin=true)` unauthenticated (BLOCKING); `reason` sent to ALLY (BLOCKING); late-commit cursor drop (HIGH); no index (HIGH); a new `x-api-key` scheme invented (MEDIUM); `bulkUpdateApproval` unaddressed (MEDIUM); `withdraw`'s per-row N-fire (MEDIUM); no startup check (MEDIUM). Revision 1 also claimed a reason requirement on admin removal was "to add" — it is already enforced at `:898` and tested.
