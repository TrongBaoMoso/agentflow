# Review ct7o — webinar registration suppression gate (correctness & blast radius)

Reviewed on `agent/ct7o-webinar-suppression-gate` @ `288eb81`, which is `origin/master` (checked with
`git ls-remote origin refs/heads/master` → `288eb817`). The only open PRs are #390 and #393, and
neither touches these files. Paths are relative to `recruit-be/` unless marked `packs:` or `recruit-fe:`.

## Verdict

**Implement with changes.** Step 1 as proposed (throw at the enqueue site) is a **BLOCKER**. Step 2
is right, but it is incomplete without a timeline retraction on SKIPPED. The exact change list is in §4.

**Throw vs skip: skip.** Reasons are in §3.

---

## 1. Claims in the brief checked against the code

| Claim | Result | Evidence |
|---|---|---|
| Picking a session enqueues a registration at ~335 | TRUE | `FollowUpServiceImpl.java:333-335` |
| `FollowUpServiceImpl` has no reference to `assertOutboundAllowed` or suppression | TRUE in effect. The only match is a javadoc sentence (`:737`); there is no call and no injected `SuppressionService` (`:122-136`) | grep |
| `resolveWebinar` checks only `NOT_CONTACTABLE` statuses | TRUE | `PacksWritebackPayloadResolver.java:231-256` |
| …and `BLOCKED` in that set would catch a blacklist | **FALSE / moot.** `BLOCKED` has **zero writers**. Blacklists live only in the ledger | `CandidateStatus.java:36-43` |
| "A candidate who **texted STOP** … passes both gates" (the motivating case) | **FALSE as a motivation for THIS fix.** A texted STOP writes `STOP_SMS / PHONE / channel=SMS` (`InboundOptOutSuppressionWriter.java:138-143`). `blocks()` matches a STOP_SMS only on its **named** channel (`SuppressionServiceImpl.java:143`), so an `EMAIL` gate lets the SMS-STOP person through before and after this change. That is correct under TCPA (opt-outs are per channel). The fix catches **BLACKLIST** (any channel, `:140-141`) and **email opt-outs** (`STOP_SMS` + `channel=EMAIL`, imported by `MosoRowMapper.java:~588-595`). The PR text and tests must not claim it blocks SMS STOP | as cited |
| packs sends `WEBINAR_EMAIL_TEMPLATE` plus a Calendar invite | TRUE | `packs: SaveLORecruitingFromRecruitOp.java:136, 193, 219, 226-233` |
| Precedent: PR #383 / `agentflow-2a3w` | TRUE | `9bb1c47`; `OfferServiceImpl.java:300-352`; `PacksWritebackPayloadResolver.java:167-196` |
| 8-attempt backoff | TRUE | `PacksWritebackProperties.java:76` (`maxAttempts = 8`). The message of commit `777814c` says "five": it is stale, not code |
| Premise still true on master | TRUE | HEAD == remote master, and neither open PR touches these files |

## 2. Findings

### BLOCKER-1 — Throwing at line 335 orphans a remote follow-up and throws away the recorded call

Order inside `interested()`:

1. `:150` `autoClearOnCallLogged`. This **remote, irreversible** close of due follow-ups
   (`FollowUpAutoClear.java:56`) runs from `recordOutcome` before the branch switch.
2. `:304-312` `client.create(...)`. **Remote**: it creates the WEBINAR next-step follow-up in followup-be.
3. `:313-319` local writes: note, `status=ACTIVE`, `nurtureUntil=null`, `noAnswerStreak=0`. Also, from
   `recordOutcome` `:156-171`: `nextStepLocation`, `nextStepSendDraft`, `pendingCallAt/ActorId` cleared.
4. `:333-335` webinar enqueue. **The proposal throws here.**
5. `:349-351` activity line + `save`.

If `assertOutboundAllowed` throws at step 4, `@Transactional` (`:140`) rolls back every local write.
Steps 1 and 2 have already happened remotely and do not roll back. The caller ends up with:

- **HTTP 400** (`BadRequestException`) with body `"Outbound EMAIL suppressed: BLACKLIST on EMAIL <address> (<reason>)"`
  (`SuppressionServiceImpl.java:39-43`). The FE gets it through `CandidateFacadeImpl.java:218`.
- **The note, the ACTIVE status, the streak reset and the pending-call discharge are lost.** The D51
  reminder (`:161-171`) keeps telling the recruiter to log a result they just tried to log.
- **An orphan WEBINAR follow-up exists in followup-be.** The recruiter's natural next move is to re-submit
  with a different next step, and that creates a **second** active next step. This breaks the "one active
  next step" invariant (D50). It is the exact defect `0e19c73` (agentflow-kvps) fixed for SEND_INFO,
  and the reason is written at `:285-290`: *"a BadRequestException thrown after it … would 400 the
  caller yet leave an orphaned … follow-up … and a retry would create a second one."*
- Auto-clear's audit lines (`FollowUpAutoClear.java:70-80`, saved inside the outer transaction) roll back.
  The remote closes they describe stay closed, so the timeline no longer records them.

Existing tests: none break on behaviour. But `FollowUpServiceImplTest.java:118-121` builds the service
**positionally**, so injecting `SuppressionService` into `FollowUpServiceImpl` is a **compile break** in
that test until it is updated. `PacksWritebackPayloadResolverTest` already mocks `SuppressionService`
(`:37-41`, `:47`), and Mockito's default empty `Optional` keeps its existing webinar tests green (`:373`, `:423`).

### MAJOR-2 — A delivery-time SKIP leaves a permanent, false "registered for webinar X" on the timeline

`interested()` writes `", registered for webinar X"` at enqueue time (`:349-350`). The tick takes that
claim back **only on DEAD_LETTER** (`PacksWritebackTickServiceImpl.java:127`, `:160-176`). The SKIPPED
branch (`:98-104`) sets status and `last_error` and logs, but writes **nothing** to the timeline.

Step 2 of the proposal therefore produces exactly the harm #380 (`777814c`) was written to prevent. Two ways it happens:

- compliance adds a suppression row after the recruiter clicked, or
- `resolveSurvivor` redirects the delivery to a suppressed survivor.

Either way the row is SKIPPED and the timeline keeps saying the person is registered. **The gap already
exists** for the NOT_CONTACTABLE skip, and the resolver's own javadoc describes the 10:00 → 10:03 → 10:05
ARCHIVE scenario (`PacksWritebackPayloadResolver.java:217-224`). This PR adds a second route into it.
The retraction must fire on **SKIPPED of a `WEBINAR_REGISTRATION` row**, not only on dead-letter.

### MAJOR-3 — Under skip, the recruiter gets no signal at the moment of action

`recordOutcome` returns the masked `CandidateEntity` (`CandidateFacadeImpl.java:218`), and nothing in it
says whether a registration happened. The FE toast for INTERESTED is the generic `t('done_next_step')`
(`recruit-fe: OutcomeSection.tsx:225-227`). The only place the refusal shows is the timeline, after the
`['recruit']` refetch (`OutcomeSection.tsx:~237`). The FE carries no suppression flag it could use to
pre-disable the picker. It learns about suppression only from a gate's 400 (`recruit-fe: ContactButtons/index.tsx:53-54,112`).

This does not block the BE PR, because the timeline line is truthful. It does need a **follow-up bead**
(an FE/contract change), and the options are listed in §4(e). A recruiter on the phone who sees "done"
will tell the candidate "check your inbox".

### MINOR-4 — Channel: EMAIL is correct, with one identity caveat

- In packs, registering means adding `LORecruiting.email` to `Webinar.guests` (which triggers the
  Calendar sync) and mailing `webinar_registration` to the same address
  (`packs: SaveLORecruitingFromRecruitOp.java:226-233, 193`). There is no SMS in the op (grep for
  `sms|twilio`: none). The Calendar invite is not a separate channel: Google delivers it to the same
  email identifier, so EMAIL covers both legs. Not verified: `LORecruiting.afterSave` and
  `SyncWebinarsCalendarOp` in full (packs clone @ `5c78bc3`, 21/09).
- Caveat: recruit checks `candidate.emailNormalized` (`SuppressionServiceImpl.java:70-71`), but packs
  mails `LORecruiting.email`. Those can differ while profile writeback is dark. A suppression on the
  packs-side address that recruit never saw will not match. This is outside this PR's scope; put one
  sentence in the PR body.

### MINOR-5 — PII: never route `assertOutboundAllowed`'s message anywhere persistent

- Its message contains the identifier **value** and the free-text **reason** (`SuppressionServiceImpl.java:39-43`).
- In the resolver, **throwing** takes the path `onDeliveryFailure` → `last_error = failure.getMessage()`
  (`PacksWritebackTickServiceImpl.java:119`). After 8 attempts it also reaches the **timeline**, because
  the dead-letter retraction copies `failure.getMessage()` into an activity (`:170-172`). That is two
  leaks. It is a second reason (besides retry semantics) that `firstBlocking` is mandatory there.
- In `FollowUpServiceImpl`, the tempting shortcut `try { assertOutboundAllowed } catch (e) { log(e.getMessage()) }`
  leaks the same way into logs and the activity. Use `firstBlocking` and write `getSuppressionType()`
  only, exactly as `PacksWritebackPayloadResolver.java:189-195` and `OfferServiceImpl.java:340-343` do.
- The existing skip reasons (NOT_CONTACTABLE, legacy_key) contain only ids and a status, so they are safe
  to copy into a retraction activity (MAJOR-2).

### MINOR-6 — Retry semantics

- `nothingToSend` → `SKIPPED`: terminal, `attempts` unchanged, no backoff (`PacksWritebackTickServiceImpl.java:98-104`). Correct.
- A throw → `RETRIED` with exponential backoff up to 8 attempts (`:115-135`), then `DEAD_LETTER` plus retraction.
  Suppression is not transient, so that would burn 8 attempts over hours, raise a `log.error`, and leak
  PII (MINOR-5). Same reasoning as `PacksWritebackPayloadResolver.java:179-185`.

### MINOR-7 — Where the check goes in `resolveWebinar`

All four checks are terminal SKIPPED, so order changes only **which reason is recorded**, never the
outcome. A blank `webinar_id` cannot be enqueued (`PacksWritebackEnqueuer.java:179-181`), so that check's
position does not matter. Recommendation: run suppression **immediately after `resolveSurvivor`, before
NOT_CONTACTABLE** (`:232`→`:238`). The compliance reason is the one the evidence trail needs six months
later, and an ARCHIVED + BLACKLISTED survivor should record the BLACKLIST. Mirroring `resolveInvite`
(after the eligibility check, before legacy_key) is also acceptable. Whichever order is chosen, the
suppression check must be against `resolved`, never `row.getCandidateId()`.

Do **not** edit the stale "No re-check at delivery time" header in `V091__packs_writeback_webinar_kind.sql:23-28`.
It is a Flyway checksum (hard rule #12). Correct it in the resolver javadoc instead (`:214-230`).

### Not a finding (noted so it is not re-raised)

`recordOutcome` has no CALL gate for a blacklisted person. It records a call that already happened; the
gate belongs on initiating a call (`ActivityServiceImpl.java:120`). Out of scope.

## 3. Throw vs skip — answer

**Skip, and write a truthful, PII-free timeline line in the same place as the existing `false` branch
(`:328-335`, `:349-350`).** Four reasons:

1. **The outcome is a fact; the registration is a side effect.** The call happened and the candidate said
   they were interested. Suppression forbids *emailing* them, not *recording* that. The offer precedent
   throws because a SENT transition *is* the send (`OfferServiceImpl.java:313-321`: "swallowing … would
   leave the offer looking sent"). Here nothing looks sent, provided the line says "NOT registered".
2. **Throwing at 335 is BLOCKER-1**: an orphan remote follow-up, a lost local record, and a duplicate
   next step when the recruiter retries.
3. **Throwing earlier is not free either.** Moving the throw to the top of `interested()`, next to the
   send-draft validation at `:291-294`, avoids the orphan. But it then refuses outcomes that would have
   sent **nothing**: the writeback flag defaults to off (`PacksWritebackEnqueuer.java:60`; "staging's
   state today", `FollowUpServiceImpl.java:329`), and candidates without a `legacy_key` never enqueue
   (`:183-187`). Avoiding those false refusals means copying the enqueuer's eligibility rules, which is
   the drift pattern this codebase keeps paying for. Separately, `autoClearOnCallLogged` has already
   closed remote follow-ups before *any* throw inside `interested()` (`:150`). The existing 400s
   (`requireCrudKind`, `buildSendDraft`) share that problem already; do not add another 400 on top of it.
4. **The file's own design says the outcome must survive a failed side effect.** See the class javadoc
   `:99-114` (agentflow-61mu) and the enqueuer's own contract "the recruiter's outcome has to commit
   whether or not packs is reachable" (`PacksWritebackEnqueuer.java:158-162`).

What the recruiter should see: the outcome is saved, and on the timeline
`"Call outcome INTERESTED -> WEBINAR due …, webinar <id> NOT registered — outbound EMAIL suppressed (BLACKLIST)"`.
A follow-up FE change should make this visible in the toast (MAJOR-3). What the caller sees: **200**
with the candidate, the same as today's flag-off path.

## 4. Exact changes

**(a) `FollowUpServiceImpl`**
- Inject `SuppressionService`.
- In `interested()`, before `:333`, when `kind == WEBINAR && isNotBlank(webinarId)`: call
  `suppressionService.firstBlocking(candidate, ActivityType.EMAIL)`.
  - If present: **do not call the enqueuer**. Log `log.warn("Webinar registration refused for candidate {} webinar {}: outbound EMAIL suppressed by a {} rule (identifier and reason omitted — PII)", …)`,
    and append the activity suffix `", webinar <id> NOT registered — outbound EMAIL suppressed (<TYPE>)"`.
  - If absent: existing behaviour.
- Never call `assertOutboundAllowed` here, and never use `e.getMessage()` from it.
- Update the comment at `:327-332` so it names the third `false`-like case.

**(b) `PacksWritebackPayloadResolver#resolveWebinar`**
- `firstBlocking(resolved, EMAIL)` right after `resolveSurvivor` (MINOR-7).
- Return `nothingToSend("candidate <id> is suppressed for outbound EMAIL (<TYPE>) at delivery time — the webinar registration will not be sent")`:
  id and type only.
- Fix the javadoc `:214-230`.

**(c) `PacksWritebackTickServiceImpl`**
- On SKIPPED of a `WEBINAR_REGISTRATION` row, append a retraction SYSTEM activity naming the webinar and
  the `skipReason`, same shape as `retractWebinarRegistrationClaim` (`:160-176`).
- This is safe because every resolver skip reason is PII-free (MINOR-5). It fixes MAJOR-2 for the
  suppression skip and for the existing NOT_CONTACTABLE skip.

**(d) Tests**
- `FollowUpServiceImplTest.java:118`: add the `SuppressionService` mock to the constructor, or it will not compile.
- New unit tests in `FollowUpServiceImplTest`:
  - suppressed → enqueuer **never** called, `save(candidate)` called with status ACTIVE, activity contains
    "NOT registered" and the TYPE, activity `doesNotContain` the identifier value or the reason,
    `client.create` is still called exactly once.
  - not suppressed → unchanged (`:488-508`).
  - a positive control that `firstBlocking` is not consulted for non-WEBINAR kinds.
- Resolver unit tests:
  - suppressed survivor → `nothingToSend`, reason has the type, no identifier.
  - suppressed **loser** with a clean survivor → sends (proves the survivor is checked).
- Tick test: a SKIPPED webinar row writes the retraction; a SKIPPED PROFILE row writes none.
- An IT against real ledger rows, modelled on `OfferInviteSuppressionIT`:
  - BLACKLIST blocks.
  - `STOP_SMS channel=EMAIL` blocks.
  - **`STOP_SMS channel=SMS` does NOT block.** This locks in the channel-scoped TCPA rule and stops a
    later "fix" from over-gating.

**(e) Follow-up bead (not this PR)**
Tell the recruiter at the moment of action. Either:
- the response carries the registration outcome and the FE toast says "not registered — suppressed", or
- the FE disables the webinar picker when an EMAIL suppression matches.

Per hard rule #15, update `docs/STATUS.md` in the same PR if the webinar vertical's row changes.
`INTEGRATIONS.md` needs nothing: no new integration.
