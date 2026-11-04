# Tasks — ambassador-ally-bridge

Design: `proposal.md` (revision 5). Bead `agentflow-nktr`; prerequisite work also closes the open third of `agentflow-5dh7`.

Four waves, and **two hard dependencies that are not scheduling preferences**:

- **Task 2.6's `withdraw` wiring is split.** The five other action functions, and `withdraw` for the **self-service** path (`by_admin=false`), have no hazard and ship with wave 2. **The admin-removal branch's push is task 3.9's** — it ships in the same moso-aid release as task 1.3 and no earlier. `withdraw()` is one function serving both routes and cannot tell them apart, so wiring the push into it while the public `by_admin` route is still open would let a **zero-credential** call cut a real person's ALLY budget. That is the "strictly worse than today" state this whole prerequisite exists to prevent, and a wave label is not enough to stop it.
- **Task 2.7 is blocked on task 0.2.** If 0.2's answer is not recorded, 2.7 implements the **bounded awaited** path. The unsafe default must not be the one that passes by doing nothing.

Otherwise waves 1 and 2 proceed in parallel; wave 3 follows wave 1; wave 4 can start any time.

Every wave is `moso-aid` unless stated. Branch per task, `agent/<bead>-<short-desc>`.

---

## Wave 0 — measure before writing (no code)

- [x] 0.1 **Read production before touching it** — done 21/09 via the public `/lo-programs/directory` on both services (`233682574497` = staging `lenderrate-master`, `444859640964` = production). **Production**: ambassador 11 approved rows, all at `general_participation`, **0 people holding more than one level**; lo_recruiter 0. **Staging**: ambassador 1; lo_recruiter **52 approved rows across 48 distinct people — 3 hold more than one level** (`John Homeowner` holds three). So the two-approved-rows case that breaks a raw `status=` filter is **live in staging data today** and is not hypothetical; one page suffices at current volumes, but paging is still built because the `status=` scan is over rows, not people. Keyless and withdrawn counts are not visible on the public endpoint — read them from the gated roster on staging during wave 2 rather than reading a production secret for a number that only sizes a decision already made.
- [ ] 0.2 **Verify the Cloud Run CPU allocation** **[NOT DONE — `gcloud run services list` returned nothing for this account; needs someone with Cloud Run view on the moso-aid project. Task 2.7 therefore takes its safe default.]** for the moso-aid service. If CPU is request-scoped, wave 2's bulk dispatch must be a bounded awaited batch rather than fire-and-forget — unawaited work can be killed after the response with no exception and therefore no log line. Record the answer in the bead either way.
- [x] 0.3 **Record the `loAdminProxy` gap on `agentflow-048o`**: it reads `x-moso-user-id` from the query string itself (`loAdminProxy.ts:221`) and never calls `resolveMosoUserKey`, so it sits outside that bead's enumerated surfaces and outside its (b) fix. One note, with the file reference. No code. **Done 21/09** — the note also corrects an earlier draft that treated `048o(a)` alone as sufficient. While touching that file in task 1.2, also fix its two in-code references to `agentflow-q577`, which is **closed** and superseded by `048o`.

---

## Wave 1 — close the self-declared-admin path (prerequisite for event #9)

Three steps, **two deploys, order not optional**. Step 3 and task 3.9 ship in the same moso-aid release.

- [x] 1.1 **moso-aid — add the gated admin route.** `PUT /lo-programs/applications/withdraw/admin` behind `requireServiceKey('LO_ADMIN_SERVICE_KEY')` (the existing `requireLoAdmin` alias, `routes/index.js:190`). New controller sets `by_admin: true` **server-side** — never read from the body on this route — and calls `loProgramService.withdraw()` unchanged. New `validateWithdrawAdmin` requiring `id`, `actor_key`, `reason`. The public route and `validateWithdraw` are untouched; both routes live.  **[moso-aid #171]**
  - Tests: gated route 401 without the service key, 503 when `LO_ADMIN_SERVICE_KEY` is unset, and a removal succeeds with it. A body carrying `by_admin: false` on this route still performs an admin removal (proving the flag is server-side).
- [x] 1.2 **lf-homepage — repoint the admin branch.** Add `'lo-programs/applications/withdraw/admin': ['PUT']` to `ADMIN_ROUTES` (`loAdminProxy.ts:39-60`). In `withdrawFromLoProgram` (`loProgramsQueueApi.ts:105-141`) the admin branch calls the `LO_ADMIN` proxy with `program_id` in the query so `authorize()` re-checks *this* program's `required_permission` rather than the default. **The `statusToken` and `userKey` branches keep calling `MOSO_AID` directly and are not edited** — neither credential is a service key. Deploy before 1.3.  **[lf-homepage #2544]**
  - Test: the admin path reaches the proxy; both self-service paths still reach moso-aid directly.
- [ ] 1.3 **moso-aid — close the public route.** Only once 1.2 is live. The public controller ignores `by_admin` entirely (hardcoded self-service). Split `validateWithdraw` into `validateWithdrawSelf` — drops `by_admin`/`actor_key`/`actor_name` and the `by_admin` arm of the custom body validator (`validation/lo-program.js:164-172`) — leaving `validateWithdrawAdmin` on the gated route. **Do not delete the `byAdmin` branch inside `resolveWithdrawSubject` (`lo-program.js:896-903`)** — the gated route depends on it; this step changes routing and validation only.
  - Tests: a `by_admin: true` body on the public route is refused for want of a self-service credential rather than performing a removal; `status_token` and `program_id`+`user_key` withdrawals still succeed with no service key; the gated route still works.

---

## Wave 2 — the ALLY bridge

- [x] 2.1 **`resolveAllyStanding(program, rows)`** — one resolver, used by the push and both read endpoints so they cannot disagree. Precedence and `effective_at` per the proposal's table; `effective_at` always read from `status_history`, never from `updated_at`. Excludes `user.key == null`.  **[moso-aid #172]**
  - Tests, one per row of the table, plus: approved L1 + pending L2 → `approved` at L1; a self-activated L1 **and** an approved L2 → **one** row at L2 with the $500 cap; mid-move (`revoked` + `approved`) → the new level; all-`withdrawn` → `withdrawn`, level and cap `null`; a revoked **Level 1** as the only row → `revoked`, level and cap `null`, still returned (no fallback is written when the revoked level is the entry level); `rejected` only → `rejected`; four history rows → one result.
- [x] 2.2 **Index** `{ program_id: 1, updated_at: 1, _id: 1 }` on `LOProgramApplicationSchema`.  **[moso-aid #172]**
- [x] 2.3 **`GET /lo-programs/ally/standing`** — per-user, behind `requireServiceKey('ALLY_INBOUND_SERVICE_KEY')`. 404 for someone with no rows. No name, no email in the response.  **[moso-aid #172]**
- [x] 2.4 **`GET /lo-programs/ally/standings`** — bulk. **Both** `status=` and `updated_since=` run the same two phases: scan for matching rows, re-query each matched person's complete row set, resolve, then filter on the **resolved** status. `next_cursor` from the last row **scanned**. `updated_since=` scans from `cursor.updated_at − GRACE` (named constant, 60 s). Both modes page by the same `(updated_at, _id)` cursor; supplying both modes is 400.  **[moso-aid #172]**
  - Tests: three rows written in one millisecond all returned across pages; a row stamped behind an already-issued cursor delivered on the next poll; a member whose only in-window change is a new pending L2 reported `approved` at L1 (the criterion that fails on window-scoped resolution); a roster larger than one page fully walked in **both** `status=` and `updated_since=` mode (round 3 caught `status=` having `limit=` but no paging — a generic test would let that regress); 401 wrong key, 503 unset key; no PII in any response.
- [x] 2.5 **`pushAmbassadorStanding` in `ally.js`** — `PUT {ALLY_API_URL}/v1/users/ambassador-standing?key=`, same `x-api-key`, same 4 s timeout, same soft-fail shape as `setAutoLoRecruiting`. **No `reason` in the payload.** Keeps the `usesAllyActivation(program)` and `user?.key` gates; **must not** use `syncAllyOnMembershipEdge`.  **[moso-aid #172]**
- [x] 2.6 **Emit on the six action functions** — `joinActivationLevel`, `submitApplication`, `updateApproval`, `promote`, `downgrade`, `withdraw`. **Never on `applyStatus` or `upsertStanding`.** **`withdraw`'s `by_admin=true` branch is excluded here and belongs to task 3.9** — see the dependency note at the top; wiring it in this wave would arm a zero-credential path.** `promote`/`downgrade` wrapped individually, not `changeLevel`. `changeLevel`'s paths gain a push, which they have none of today.  **[moso-aid #172]**
  - Tests that fail on the obvious wrong implementation: a promotion emits `promoted` and exactly **one** push (not `revoked`, not two); a revocation of L2 emits **one** push carrying `general_participation` and a `null` cap; a member holding an approved L1 and a pending L2 who leaves emits **one** event, not two.
- [ ] 2.7 **Bulk dispatch bounded per 0.2.** **[DEFERRED to the safe default — 0.2 unanswered, so the awaited-bounded path applies. Not implemented yet; `bulkUpdateApproval` currently awaits each `updateApproval` as it always has, so no new unawaited work was introduced.]** `bulkUpdateApproval` emits N events for N rows, intended. Dispatch so a 50-row bulk revoke with ALLY unreachable returns in a time that does not grow with N — **and not by copying `event.js:547-552`'s unawaited `forEach`, which satisfies that sentence literally by returning instantly while the work may be killed mid-flight with no exception and therefore no log line.** If 0.2 recorded "CPU always allocated", fire-and-forget with a `.catch` is fine; **if 0.2 is unanswered or says request-scoped, implement the bounded awaited batch.** The safe branch is the default.

---

## Wave 3 — the ten emails

- [x] 3.1 **Re-key `catalog.notifications`** from status to event and re-seed both programs. Breaks nothing: the map is `{}` today and read by no code.  **[moso-aid #173]**
- [x] 3.2 **`sendProgramEmail`** beside `sendEmailToLO`. The existing one builds a fixed four-key payload (`event.js:133-140`) and cannot carry level names, both budget figures or the reason; the transport, endpoint and auth posture are unchanged.  **[moso-aid #173]**
- [x] 3.3 **Prior-row check in `submitApplication`** so `application_submitted` and `application_resubmitted` are distinguishable — the current guard only looks for a live `pending` row (`lo-program.js:450-455`), and re-applying after a rejection creates a fresh document. Use the same `applicantFilter`, which already handles keyed and keyless applicants symmetrically.  **[moso-aid #172]**
- [ ] 3.4 **Ten `Template` entities in MOSO Datastore.** **[BLOCKED — needs a human: Datastore write access + marketing sign-off. Copy drafted in `email-copy.md`.]** Needs Datastore write access and marketing sign-off on copy. Use `DecisionModal`'s existing help text as the reference wording for revoke, demote and remove, so the manager and the recipient read the same account. Revoke must not say "removed from the program"; promote and demote must not say "revoked".
- [x] 3.6 **Wire `sendProgramEmail` into the action functions for the nine non-#9 events** — `joinExtracted`/`joinActivationLevel` (#1), `submitApplication` (#2, #10), `updateApproval` (#3, #4, #5), `promote` (#6), `downgrade` (#7), `withdraw` with `by_admin=false` (#8). Same emitter seam as task 2.6, same rule: **never on `applyStatus` or `upsertStanding`**. Template key resolved from the re-keyed `catalog.notifications`; a missing key logs and sends nothing rather than throwing. Event #9 is task 3.9's, not this one.  **[moso-aid #173]**
  - Tests: each of the nine fires exactly one email with the right template key and context; a promotion's email is `level_promoted`, not `level_revoked`; a member holding an approved L1 and a pending L2 who leaves gets **one** email; an unmapped event logs and does not throw.
- [x] 3.5 **Startup config check** — one `console.error` naming each of `ALLY_API_URL`, `ALLY_API_KEY`, `API_CRAWL`, `ALLY_INBOUND_SERVICE_KEY` that is unset in a deployed environment. A floor, not an alarm; the proposal says so.  **[moso-aid #173]**
- [ ] 3.9 **[HELD] Event #9's emitter (`member_removed`) — BOTH the email AND the ALLY push for `withdraw(by_admin=true)`** — ships in the **same moso-aid release as task 1.3**, and no earlier. The emitter hangs on `withdraw()`, which both routes call, so arming it while the public `by_admin` path is still live would let a zero-credential forged call debit a third-party budget and email the victim.

---

## Wave 4 — the ask on ALLY

- [x] 4.1 **OpenSpec proposal in `ally-specs/openspec/changes/ambassador-standing-push/`**, following `user-posting-readiness-api` (on `origin/dev`) — the precedent that produced the endpoint moso-aid calls today. Must specify: the receiving endpoint's shape and auth (`x-api-key` against their `SERVICE_API_KEY`, as the two existing ones are), idempotency, and the **required bulk-poll interval** as a hard requirement rather than left to their discretion. Pull heals immediately only for people who log in; for everyone else correctness returns on their schedule, so the interval is part of the contract.  **[ally-specs #157]**

---

## Rollback

One commit per task means task 1.3 (routing closure) and task 3.9 (event #9's emitter) are two commits inside one release, not one atomic change. **Reverting 1.3 alone while 3.9 stays in place recreates the exact armed-emitter-plus-open-route state the release order exists to prevent** — so 1.3 and 3.9 revert together or not at all. The backstop is task 1.3's own regression test ("a `by_admin: true` body on the public route is refused rather than performing a removal"): it must be a permanent CI-gated test, not a one-off check, because it is the only thing that fails loudly if the two are ever decoupled.

## Done when

- All of wave 1 is live on production and `agentflow-5dh7` can be closed.
- The proposal's success criteria hold, verified by running them on staging by hand as well as in tests — staging is self-serve, so the data and the keys do not need anyone else.
- `agentflow-048o` carries the `loAdminProxy` note. This change does not close it, and event #9 ships with that residual recorded and accepted.
