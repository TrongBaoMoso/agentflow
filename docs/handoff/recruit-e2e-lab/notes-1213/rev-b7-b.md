# B7 (D254) — second independent review (rev-b7-b)

Reviewed heads: recruit-fe #445 `b4f638b7`, recruit-be #628 `a0e65e9d`. These were read in my own throwaway worktrees, which are now removed. I pushed nothing and did not touch the implementer's worktrees.

## Verdicts
- **recruit-fe #445: APPROVE.** No blocking issue. Findings 2 to 4 are worth a follow-up.
- **recruit-be #628: APPROVE.** This PR has docs and an IT only. Its claim "no BE code change needed" holds (verified below). I suggest a one-line addition to D254 (finding 1).

## Verification
- jest (`--runTestsByPath`, under the ram-gate): 3 InviteModal suites + predictRuleReasons + localeParity + translationKeysResolve = **6 suites, 143/143 passed**, which matches the PR body.
- I wrote my own probe tests (throwaway) to check behaviour the PR suite does not pin (P1 to P3 below).
- BE gate audit:
  - Every role that holds `OFFER_REQUEST` also holds `CANDIDATE_UPDATE`: RECRUITER and MANAGER (V003 + V005), LO_SUPPORT and OFFICER_RECRUITER (V036), HEADHUNTER and TEAM_LEAD (V191), and ADMIN `*`.
  - `PUT /candidates/{id}` = `CANDIDATE_UPDATE` + `refuseBonusFieldsForScopedActor` (D190(5)).
  - `POST /candidates/{id}/offers` = `OFFER_REQUEST` + `OfferRequestPermission` (owner or OFFER_APPROVE, D209). The FE `canInviteCandidate` mirrors this, and Edit & resend checks it before it opens the dialog.

## Findings, by severity

### 1. MEDIUM (product decision, not a code bug): after a manager DECLINES, the recruiter can raise the numbers in the dialog and the resend goes out AUTO (SENT), with no manager
- **What happens:** the button flips live from "Send for review" to "Send invite" as the numbers go up. The IT pins this: `raisedFigureIsAutoSent` 9/1 → 9/3 = SENT. That case has no DECLINED prior offer, but nothing in `OfferServiceImpl.request` treats a prior DECLINED offer differently. I grepped DECISIONS: no rule forces review on a resend after a decline.
- **Mitigations:**
  - The capability already existed through Profile → Production (same PUT, same D64 rule).
  - The D247 PRODUCTION audit row records who moved the number.
- **What changes with B7:** the bypass is now one step inside the resend flow, and the live label shows exactly when it stops needing a manager.
- **Ask Bao:** is "fix the numbers upward → straight out" intended? Or should a resend whose latest offer is DECLINED always go to review?
- **Either way, D254 should say it explicitly.** It currently describes only the "lower → review" direction for the resend.

### 2. LOW-MEDIUM: a refetch silently discards the user's unsent edits, in both inputs
- **Probe P1:** type units = 2, then the candidate prop arrives with only `loans_since_anchor` changed (7 → 8). The units input snaps back to the file value 4.
- **Cause:** the second `useEffect` (index.tsx ~L159) resets BOTH inputs whenever EITHER on-file number changes.
- **When it bites:** Edit & resend feeds the dialog from the live `useCandidate(resendFor)`. Any in-tab invalidation of `['recruit', ...]` while someone else has edited the numbers will wipe what the recruiter typed, with no notice. Global `refetchOnWindowFocus: false` makes this rare, not impossible.
- **The opposite case:** snapshot callers (Today, Focus, Inbox claim) pass a `Candidate` held in state, so the prefill can be stale. The dialog then predicts on the stale numbers while the BE decides on the real ones. The final toast is still truthful, because it reads `response.payload.status`.
- **Overwrite risk is limited:** dirty-only per field means an untouched number is never written. Only a field the user actually changed can overwrite a manager's concurrent edit (last write wins, no version check). That is the same as the Profile edit modal, so it is not a regression in kind.
- **Suggestion:** reset only on open or a candidate change, or per field only while that field is untouched.

### 3. LOW: when the save succeeds but the offer request fails, the toast does not say the numbers were saved
- **Probe P3:** after a save `onSuccess` and an offer `onError`, the toast is the BE message or `toast_failed` ("Could not send"). The numbers were changed, but the user is not told.
- **Retry works:**
  - The dialog stays open, so the user can click again.
  - Live-candidate path (Edit & resend): the invalidation refreshes the file, so the retry sends no PUT and only requests the offer.
  - Snapshot path: the retry sends the same PUT again. That is harmless: `CandidateProfileDiff.diff` means no new change-log or audit row, and `loans_since_as_of` is restamped only on the same day.
- **Optional:** add "Numbers saved; the offer was not sent" copy.

### 4. LOW (existed before, now on more inputs): decimals are accepted
- **Probe P2:** typing `2.5` sends `{"units12mo":2.5}`. `isInvalidFigure` allows non-integers, and NumberInput does not set `allowDecimal={false}`.
- **BE side:** the fields are `Integer`. Jackson's default `ACCEPT_FLOAT_AS_INT` most likely truncates to 2 without an error. I inferred this and did not test it with a real request.
- **Effect:** the prediction can differ from the stored number. Before, this applied only to a missing number; now it applies to every number.
- **Suggestion:** `allowDecimal={false}`, or refuse non-integers in `isInvalidFigure`.

### 5. LOW: the audit trail records who, not where
- **Who:** the PUT writes a `candidate_change_log` row with `actor_id` = the editor (SOURCE_API) and the D247 PRODUCTION audit row, so the editor is recorded.
- **Where:** an edit from the dialog and one from the Profile tab look the same (both `SOURCE_API`). No source marker says the edit came from the offer dialog. `CandidateChangeLogEntity` says a distinct source can be added later without a migration.
- **IT coverage:** the new IT does not assert the change-log or audit row for this path. It relies on D247's own tests.
- I'd accept this as is, but naming it in D254 would help a manager reading the audit.

### 6. OK: who may edit (FE gate matches the BE)
- **Editable:** a RECRUITER on their own lead, a MANAGER, LO_SUPPORT and OFFICER_RECRUITER get editable inputs, and the PUT accepts them.
- **Read-only:**
  - HEADHUNTER and TEAM_LEAD (`figuresLocked`) see read-only numbers and no PUT is sent. The BE refuses those two fields for scoped actors.
  - While roles are loading, the submit button is disabled and the numbers are read-only.
  - If the roles cannot be read (null), the numbers are read-only.
- **Mixed roles:** a user with both a program role and MANAGER is locked in the FE even when the BE might allow it. That errs on the safe side, so nobody sees a field that then returns 403.
- **Non-owner recruiter:** cannot open the dialog (D209 mirror). One small gap: `useCan` fails open while permissions load, but `rolesLoading` disables submit in that window anyway.

### 7. OK: the first-invite path
- Same inputs, prefilled.
- A number on file cannot be emptied: `figure_required` disables submit.
- A missing number stays empty with no error and predicts review, as in D-I9 state C.
- The approve-now path (manager) edits first, then requests with `approveNow`. Its tests are in InviteModal.approve.

### 8. OK: copy
- en: "Enter a number. Use 0 if there are none."
- vi: "Nhập một số. Không có thì nhập 0."
- Both are plain and natural, and localeParity passes.
