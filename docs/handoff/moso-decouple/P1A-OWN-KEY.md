# P1a: Recruit owns the lead key (agentflow-0gwad.2, recruit-be D382)

Staging only. Production values are untouched (both flags absent = today's behaviour: MOSO-only entry, D165).

- Staging flags: `RECRUIT_FEATURES_NATIVE_CANDIDATE_CREATE=true`, `RECRUIT_FEATURES_MOSO_RECORD_REQUIRED=false`
  (`recruit-be/helm-chart/config/staging/values.yaml`). recruit-fe needs no env: it reads both from
  `GET /api/v1/config/candidate-view` (`native_candidate_create` shows "Add lead"; `invite_needs_moso_record` is new).
- PRs: recruit-be #853 (merged `6c36668b8`), recruit-fe #695 (merged `f8cd67279`). Both promoted to staging 05/11
  (recruit-be cd-staging run 41889976048, recruit-fe cd-staging run 41894006574; pod `recruit-be` image `d3c56a89c68b`,
  env MOSO_RECORD_REQUIRED=false, NATIVE_CANDIDATE_CREATE=true; Flyway still V326, no migration in this change).

## 1. Audit (origin/master, 04/11/2026 22:45 VN)

Scenario: a lead with `legacy_key` NULL, `moso-record-required=false`, `native-candidate-create=true`, created by
"Add lead" (`POST /candidates`) or by lead intake.

| Area | Verdict on master | Evidence | Fixed in P1a? |
|---|---|---|---|
| Manual create | OK (flag gate only) | `CandidateFacadeImpl:137`; `CandidateServiceImpl.create` sets no MOSO field | n/a |
| Manual create twin by e-mail | Twin allowed (no lookup); shows on /duplicates | no `email_normalized` lookup in create | No (open question Q2) |
| Owner / claim / HOT auto-assign / owner sync | OK | no `legacy_key` read; `MosoOwnerSync` only runs on a MOSO push | n/a |
| Calls, SMS, notes, activities, cast | OK | no key read | n/a |
| Nurture drip, scheduled Send info, Text first | OK | no key read | n/a |
| Profile edits | OK (MOSO write-back skipped quietly) | `PacksWritebackEnqueuer:363`, `MosoFieldSync:111` | n/a |
| Lists, search, Today, My invites, reports | OK | only `MosoSignedReconcileStore:37` filters on the key (correctly) | n/a |
| Webinar, Recruit schedule | OK | `POST /api/v1/admin/webinar-sessions/{id}/registrations` (D360) checks only that the candidate exists | n/a |
| Webinar picked in a call outcome | SKIPS WITH REASON | goes through packs only (`FollowUpServiceImpl:762`, `PacksWritebackEnqueuer:798`); timeline says "NOT registered — no MOSO record" | No (Q3) |
| **Invite (request / approve / send / resend / Save & invite)** | **BROKEN**: reached SENT, packs INVITE row born SKIPPED, Recruit invite mail had no join link (`MosoApplyLinks.joinUrl` null). The recruiter saw "Invited", the Loan Officer received nothing | `OfferServiceImpl:671-690, 806-829`, `InviteResendServiceImpl:148`, `FollowUpServiceImpl:554` | **Yes**: refused with the D165 words, flag on or off |
| Invite modal (FE) | BROKEN copy: "the invite will not be sent to them for now. It is still saved…" | recruit-fe `InviteModal/index.tsx:236-240`, `invite.json:146` | **Yes**: blocks with the existing `no_moso_record` copy |
| **Merge: unlinked survivor over linked loser** | **BROKEN**: allowed, but the key stayed on the merged-away loser, so later MOSO pushes were log-only and the kept row could never be invited | `DedupServiceImpl:201-209` (D314 (4)) | **Yes**: the survivor takes the key (ordered statements, compare-and-set, 409 on a lost race) |
| **MOSO push for the same e-mail as a hand-typed lead** | **BROKEN**: second candidate (twin); `linkForPush` only linked intake rows inside the 7-day window | `LeadIntakeLinker:62-95, 129-135`, `MosoRowUpsertServiceImpl:146-152` | **Yes**: links THE one ACTIVE, unmerged, key-less lead with that e-mail (any source, any age). Two or more such leads: none is linked |
| Lead intake post (no `moso_key`) for an existing e-mail | OK: `duplicate=true`, no twin | `LeadIntakeService:112` | n/a |
| Welcome mail, invite reminder mail, Send agreement, 1-1 reminder | Refuse/skip with reason (`TEMPLATE_UNRESOLVED`, `NOT_LINKED`) | `WelcomeMail:79`, `InviteReminderLoMail:65`, `AgreementSendServiceImpl:101`, `OnboardingReminderGuards:100` | No: all after the invite, which is now refused |
| Referral views, register status, sync trace | Keyed by MOSO by nature; FE says "No MOSO link" | `JdbcReferralCandidateReader:165`, `SyncTraceSection` | n/a |

## 2. What changed (D382)

1. `MosoRecordRequiredFlag#refusesInvite`: an invite needs a MOSO record whatever the flag says, until
   `recruitJoinLinkLive()` (false; P4 S2 turns it on when the invite mail can mint the Recruit portal link via
   `OnboardingTokenService#issue`). Same words as before. `candidate-view` reports `invite_needs_moso_record`.
2. `DedupServiceImpl#carryMosoRecord` (flag off): the survivor takes the loser's key (and `legacy_ref` if it has none).
3. `LeadIntakeLinker#onlyKeylessRecruitOwned` (flag off, lead-intake on or off): a MOSO push links the one ACTIVE
   Recruit-only lead with that e-mail. NURTURE, DORMANT, BLOCKED and ARCHIVED leads are not linked (the push update
   copies MOSO's mapped status and must not wake or lift them).
4. recruit-fe: Invite modal blocks on `doesInviteNeedMosoRecord`; the D314 "Save invite / not sent" copy is removed.

## 3. Staging E2E

Measured 05/11 on staging, admin test account, addresses `bao.trinh+p1a…@loanfactory.com` only, no SMS.

| Step | Result |
|---|---|
| `GET /config/candidate-view` | `native_candidate_create: true`, `moso_record_required: false`, `invite_needs_moso_record: true` |
| Lead 1 create ("Add lead" API) | 201, `c6b641e7-ae90-44ca-9822-ce50c4b668a7`, `legacy_key` null, source MANUAL |
| Claim (owner) | 200, owner set |
| Note + call log | 201 + 201 |
| Recruit webinar registration (session `7d30491c…`, 06/11) | 201, registration `84aab0ea-fa9e-4c77-b5f8-da44b07bd813`; confirmation mail sent ("You're registered", timeline line) |
| Offer request | 400, refused before any write (0 offers) |
| Save &amp; invite (call outcome) | 400 |
| MOSO realtime push, same e-mail upper-cased, test key `p1a-e2e-4469e8` | 200; ONE candidate (no twin), key linked onto `c6b641e7`, owner and ACTIVE kept, timeline "MOSO re-sent this record" |
| Lead 2 create + claim | `17ab0017-b1e0-48db-8cd7-ed32a445d314` |
| Lead 2 offer request / Save &amp; invite | 400 + 400: "&lt;name&gt; can't be invited yet because they haven't signed up on the Loan Factory website. Ask them to sign up, then send the invite again." |
| Merge, survivor lead 2 (no key) over lead 1 (key) | 200; survivor now holds `p1a-e2e-4469e8`, loser key null + merged, `filled_from_loser` lists `legacy_key` |
| Cleanup | lead 2 ARCHIVED (it carries the fake test key); the webinar registration CANCELLED; 0 packs write-back rows for both |

Screenshots (`p1a-shots/`, real staging screen, 1440x900, no full page):
- `before-1-interested.png`, `before-2-after-save-and-invite.png`: OLD recruit-fe on the new BE, call-outcome answer mocked
  in the browser (nothing written) to show what D314 used to say: "the invite will not be sent to them for now. It is still
  saved…", with an enabled "Qualified" button.
- `server-refusal-2-after-save-and-invite.png`: old FE, real BE: the server's refusal toast.
- `after-1-interested.png`, `after-2-after-save-and-invite.png`: NEW recruit-fe (same mock): the modal blocks with the
  existing `no_moso_record` copy, "Qualified" disabled.
- `after-real-2-after-save-and-invite.png`: new FE, real BE: refusal toast, nothing saved.

**Found during E2E (not fixed, Q5):** a merge does not move the loser's Recruit webinar registrations
(`webinar_registration` is not among `DedupServiceImpl.CHILD_ENTITIES`), so the merged-away row keeps them. Same for
linked and unlinked leads; predates P1a.

## 3b. Follow-ups Q2 + Q4 (recruit-be D384), approved for staging 05/11

- PRs:
  - recruit-be #862, merged `5b5d6996c`, promoted (cd-staging run 41908336736; Flyway V327 from another PR, none here).
  - recruit-fe #699, merged `653e5a577`, promoted.
  - recruit-fe #700, merged `3bafde30b`, promoted. Its single `shrink-0` class keeps the "Open lead" button from being cut to "Open lea" on the real screen.
- **Q2:** "Add lead" with the e-mail or phone of a lead that is not merged and not archived returns 409 `DUPLICATE_LEAD`. The id of the existing lead is included only when the caller may see that lead (D283). The check runs under the same per-person locks as the intake and the MOSO push.
- **Q4:** a MOSO push links the one key-less ACTIVE or NURTURE Recruit-only lead. A NURTURE lead created by Recruit stays NURTURE on every push. The sign-up still counts as a hand-raise (HOT, owner's bell); this was accepted in the review.
- **Staging E2E 05/11:**
  - Lead A `99bd8a54` created (201).
  - Same e-mail in upper case: 409 `{reason: DUPLICATE_LEAD, existing_candidate_id: 99bd8a54…}`.
  - Another e-mail: 201 `a9ac77fd`.
  - The UI on the real screen shows the notice and **Open lead**, which routes to the existing lead: `p1a-shots/after-q2-add-lead-duplicate.png`. The first version with the cut-off button is `q2-add-lead-duplicate-v1-truncated.png`. There is no BEFORE shot: the old FE showed only the generic "Could not add this lead." toast, and a second row was created.
  - Q4 push to an ACTIVE lead `098621b7`, twice: linked, still one row.
- **Q4 NURTURE case not reproducible on staging:**
  - With D270 (`nurture-followup`) on, staging never parks a lead as NURTURE: a Neutral result is ACTIVE plus a Nurture-call follow-up.
  - 0 key-less NURTURE rows exist there.
  - The DB helper is read-only, so a NURTURE row could not be staged by hand.
  - The behaviour is covered by `RecruitOwnedPushLinkIT#nurtureLinksAndKeepsItsStatus` (two pushes, status and wake date kept), green in CI.
  - In practice Q4 only matters for legacy NURTURE rows.
- All test leads are archived.

## 4. Open questions for Bao

- **Q1** The invite of a Recruit-only lead stays refused until P4 S2 (Recruit portal page + its link in the invite
  mail). Safest option chosen: an honest refusal, MOSO-linked leads unchanged.
- **Q2** DONE 05/11 (D384, staging).
- **Q3** A webinar picked in a call outcome still registers only through MOSO (packs session list). Recruit sessions
  take a Recruit-only lead through the admin registration endpoint. Moving the call-outcome pick to Recruit sessions
  belongs to the webinar rollout (P3b), not P1a.
- **Q4** DONE 05/11 (D384, staging), see 3b.
- **Q5** Should a merge carry the loser's Recruit webinar registrations to the survivor (see E2E note)? Belongs to the
  webinar owner (P3b).
