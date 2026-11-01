# E — Recruit work shipped since 01/10 vs the MOSO decouple plan (audit 01/11)

Read-only audit, 01/11/2026. Question from Bao: are the many Recruit features shipped lately part of the plan to get Recruit off old MOSO (packs + moso GAE, MOSO Datastore, moso-aid)? Or are they separate product work? And do some of them ADD MOSO dependency?

## How this was measured

- PRs: `gh pr list --state merged --search "merged:>=2026-10-01"` on recruit-be (253 PRs, #506–#785) and recruit-fe (322 PRs, #298–#648). All were merged into `master`.
- Prod/staging status: `git merge-base --is-ancestor <mergeCommit> origin/production` (then `origin/staging`), after `git fetch` on 01/11. Only refs were read; nothing was checked out.
  - **Everything is on production except three PRs:**
    - be #784 (D351) is on staging only.
    - be #785 (packs byOwner retry) is on master only.
    - fe #648 (docs) is on master only.
- Plan and decisions:
  - `HANDOFF.md` §4 and the 23/10 decision rounds.
  - `bd show agentflow-0gwad` and its children .1–.11.
  - recruit-be `origin/master:docs/DECISIONS.md`.
  - prod helm values (`origin/production:helm-chart/config/production/values.yaml`).
  - `git diff` of `RecruitApiClient` / `PacksWritebackKind` since `b976aff2`, the last master commit before 01/10.
- Classification is per **feature**, not per PR. Every PR got exactly one bucket; the PR-to-bucket map is reproducible from the tables below.

## Counts

| Bucket | Meaning | Features | be PRs | fe PRs | Total PRs |
|---|---|---:|---:|---:|---:|
| DECOUPLE-PLAN | Work the plan names (phase, bead or D-number) | 8 | 24 | 8 | 32 |
| DECOUPLE-HELPS | Not in the plan, but it moves a capability to Recruit or to a non-MOSO platform service | 4 | 32 | 14 | 46 |
| ADDS-MOSO, labelled bridge | New MOSO write-back or sync that the plan labels a **thin flagged bridge** (8oafx, agentflow-61yi6), plus the packs MEETING_REMINDER kind that P2 already replaces | 3 | 19 | 13 | 32 |
| ADDS-MOSO, not labelled | New MOSO, packs or moso-aid read/write/mirror that the plan does not label a bridge | 8 | 21 | 6 | 27 |
| Maintains existing MOSO link | Fixes to the pre-existing MOSO push; no new dependency | 1 | 3 | 1 | 4 |
| NEUTRAL product work | Today, Pipeline, Hot/Cold, hand-offs, call workspace, Nurture, RBAC, omni, design… | ~20 | 121 | 247 | 368 |
| Infra / CI / SDK bumps / docs / tests | Not a feature | – | 33 | 33 | 66 |
| **Total** | | | **253** | **322** | **575** |

In short: about **14% of PRs** are decouple work, either in the plan or helping it (78 of 575). About **10%** add MOSO coupling (59), and more than half of those sit inside the bridge Bao accepted on 23/10. About **76%** are product or infra work that neither adds nor removes MOSO.

## 1. DECOUPLE-PLAN

| Feature (plain words) | be PRs | fe PRs | Env | Phase / bead / D |
|---|---|---|---|---|
| Import MOSO's Cold pool safely (dry-run by default, exclude LOs working at LF and no-rehire, a runner fix for unindexed SMSOptOut, profile-fill-only import for existing rows) | #724, #742, #776, #643, #715 (go-live alignment script) | – | prod; import applied 31/10 (102,266 rows) | P0, agentflow-kzwcg, D316 |
| Cold-imported rows never follow MOSO's owner; show the old MOSO recruiter by name, as reference only | #732, #736, #744 | #577 | prod | P0 expansion, D325 / D327 / D333 (agentflow-flyuv) |
| MOSO record optional: Recruit's own candidate id is the key (flag `moso-record-required`, default TRUE = no change) | #722 | #569, #631 | prod (flag still TRUE everywhere) | P1(a), 0gwad.2, D314; FE toast = 0gwad.8 |
| E-mail logo, social icons and webinar image hosted by recruit-fe instead of MOSO's `lender-rate` bucket | #721 | #568, #572 | prod | P1(b), 0gwad.2 |
| The 5 Loan Officer e-mails packs sends, copied in as Recruit templates with preview (nothing sends them yet) | #730 | – | prod | P1(c), 0gwad.2, D324 |
| Recruit sends its own Loan Officer e-mails (sender + signature from user-service, 1-1 reminder, webinar confirmation, invite + welcome, offer card shows Recruit's invite and owns its resend, mail the invite when MOSO refuses the specialist) | #737, #739, #740, #741, #782, #784 | #636 | prod **dark**: `lo_mail` DRY_RUN, no `LO_MAIL` flags. #784 staging only | P2, 0gwad.3, D328–D331, D350 (0gwad.9), D351 (0gwad.11.2) |
| Loan production from Modex (CSV import, NMLS export, immutable snapshot, Modex page) | #699, #700, #701 | #552 | prod | P5 "Loans: Modex only" (built 20/10, before the plan; the plan adopted it), D299–D301 |
| Loan production from MMI CRM Push (non-MOSO source; NMLS links open MMI) | #707, #762, #769, #773 | #557 | prod, ON since 29/10 | P5 loans (same note), D305 |

## 2. DECOUPLE-HELPS (not named in the plan, but lowers MOSO reliance)

| Feature | be PRs | fe PRs | Env | Why it helps |
|---|---|---|---|---|
| Licences and sponsor status from HR / user-service, not MOSO; post-Joined licence reconcile | #586, #597, #632, #689 | #403, #540 | prod | Matches P5 "NMLS, licences, sponsorship" via HR |
| HR hand-off: Send to HR fires by itself, carries the sponsored states, reads HR's checklist, HR offboarding marks a hire as left | #588, #591, #705, #682, #692, #723, #633, #595 | #405, #525, #433, #582 | prod | P4 wants ai-hr-be as the single "joined" path; this builds it |
| Recruit's own Google Calendar / Meet for the 1-1 (Connect Google, event + Meet link, colleagues, attendance read, Meet call card to omni, calls count as contact) | #521, #552, #553, #555–#557, #560, #564, #566–#570, #596, #621, #637, #638, #640, #750 | #342, #369, #371, #378, #382–#384, #474 | prod; Calendar/Meet ON 29/10 (#766) | The plan's P3 "own webinars" relies on exactly this client. On its own it does not remove a MOSO call: the 1-1 still writes ONBOARDING_MEETING to packs |
| Manual offer send/signed/fee-paid/waive routes removed (stop hand-mirroring MOSO state) | #617 | – | prod | Less surface that pretends to be MOSO; D248 |

## 3. ADDS-MOSO — labelled thin flagged bridge (Bao 23/10: keep until P4, remove in P6, "no new investment")

| Feature | be PRs | fe PRs | Env | Bridge | Note |
|---|---|---|---|---|---|
| A recruiter's fix of name, phone, NMLS or e-mail is written to MOSO per field, with an e-mail-taken pre-check; MOSO field-change / refused bells | #704, #706; bells #767, #770, #774 | #556, #612, #613, #626 | prod: `IDENTITY_WRITEBACK` + `_EMAIL` **ON since 29/10** (#703) | 8oafx, D303, D344, D346 | New packs read `/candidate/emailAvailable` and new payload `new_email`. **#767, #770, #774 (29–30/10) and fe #612, #626 were built AFTER the 23/10 "no new investment" rule.** They polish the bridge's bells (who changed it, one bell per change); Bao asked for them on 29–30/10 |
| Packs write-back ON in prod: onboarding v2 hand-off (the invite goes to the specialist through MOSO), hand-off rings only after MOSO accepts and holds MOSO-refused specialists, the "why the 1-1 sync to MOSO failed" line, the "welcome e-mail did not go" line, experience level handed to MOSO, stale-meeting reset payload, system-actor fallback | #703 (prod switch-on of 7 flags), #554, #561, #563, #765, #690, #694, #748, #778, #702, #647, #601 | #366, #385, #391, #544, #580, #584, #632, #635, #436 | prod: `PACKS_WRITEBACK`, `ONBOARDING_WRITEBACK`, `ONBOARDING_V2_HANDOFF`, `HIRE_CLASSIFICATION`, `LEGAL_NAME` **ON since 29/10**; experience write needs DB setting `packs.writeback.experience_enabled` (no row on prod at P0) | agentflow-61yi6, D207, D292, D295, D302, D336, D348 | D336 (24/10) and D348 (31/10) were added after 23/10. Both are read-outs of bridge failures, needed because the bridge is now live |
| Packs `MEETING_REMINDER` write kind (1-1 reminder mailed by packs) | #526, #551 | – | prod; reminder delivery DRY_RUN | not labelled, but superseded | Added 02/10, before the plan. P2 #739 (D329) replaces it with Recruit's own send behind a flag. Remove the kind in P6 |

## 4. ADDS-MOSO — not labelled as a bridge in the plan

| Feature | be PRs | fe PRs | Env | What it adds | Plan exit |
|---|---|---|---|---|---|
| REFERRER role: a sweep reads packs `referrals/byOwner` to find new referrers, plus a backfill with a timeout and retries for MOSO 502s | #734, #781, #783, #785 | – | prod ON 31/10 (480 assigned); #785 master only | **New runtime read of packs after the 23/10 rule.** The rule banned new *write* kinds only, so this is allowed, but it is a new dependency | P5 "referral bonus state owned by Recruit" must give the sweep a Recruit-owned source |
| My referrals v2: bonus amounts from MOSO Checks, a referral link built from the moso-aid slug, change e-mails, the list kit | #718, #725, #729 | #565, #573, #616 | prod | Deepens the packs `byOwner` / Check read (v1 #496 was 30/09) | P5 referral bonus |
| Referrer's program recorded at registration (D268/D269); it settles only from a packs verdict | #772 | (#616 above) | prod, dark | New read of the packs verdict on the MOSO push | P5 |
| LO Recruiter Program sync: a new moso-aid roster client (MOSO Admin keys), program roles from the roster, grants only to recruiter-flagged members | #532, #592, #761 | – | prod pins set (`PROGRAM_SYNC_MOSO_*`); `program_sync.mode` DRY_RUN at P0 | New moso-aid dependency. The headhunter features on top of it (D196 own-page auto-own, D201, D203, D283) are counted NEUTRAL | P5 "Recruit takes over from moso-aid" |
| The owner of an S5–S7 row follows the MOSO recruiter on every push | #716 | – | prod, flag `MOSO_OWNER_SYNC` **absent (off)** | MOSO becomes the owner source (built 22/10, one day before the plan) | Not in the plan. Candidate for P6 removal, or leave it off for good |
| Pay/sign tracking follows MOSO (auto-heal), scheduled MOSO signed-agreement reconcile, "Signed in MOSO" Exceptions actions | #585, #612, #685 | #401, #535 | prod; the reconcile cron runs (20 min) | A new scheduled packs read (D246) and logic on MOSO state (D230, D287) | P4 keeps the push and reconcile for in-flight LOs. P6 removes the "Signed in MOSO" desk |
| Webinar registration/attendance from the MOSO push plans and closes follow-ups; dated webinar reminder plus feedback call | #668, #629 | – | prod; `WEBINAR_SIGNALS` ON 29/10 (#766) | Reads MOSO's webinar data | P3 own webinars |
| MOSO-mirrored fields: MOSO LO-profile fields recruit used to drop, the packs origin stamp, prod config for the MOSO Recruit API and the packs referrals actor | #639, #515, #572, #598 | #475 | prod | More MOSO fields mirrored and shown | Mostly fine to keep as archive data (also useful for P0 rescue). The live mirror ends at P6 |

## 5. Maintains the existing MOSO link (no new dependency)

| Feature | be PRs | fe PRs | Env |
|---|---|---|---|
| MOSO push mapping fixes: first sight with history is not a hand-raise, an admin-typed row is not a hand-raise, a re-registration keeps the held legal name | #687, #688, #583 | #398 | prod |

## 6. NEUTRAL product work (grouped; 121 be + 247 fe PRs)

None of these call packs, moso or moso-aid in a new way. Two of them rest on MOSO data that already flows in: the Headhunter features use the moso-aid roster mirror (§4), and Hot/Cold use the MOSO push.

| Feature group | Examples |
|---|---|
| Today v3, Focus mode, progress bar, urgent banner, business hours | be #512, #518, #528, #636, #669, #738, #747, #749, #751, #752; fe #314, #375, #400, #460–#472, #576, #587, #590–#600 |
| Pipeline (six stages, Mine/All, days-in-stage, departed owner) and KPI | be #587, #672, #677, #678, #510; fe #301, #306, #404, #516–#530, #546 |
| Hot leads / Cold list, claim-first, idle release, auto-assign (off), Assign | be #519, #625, #634, #681, #693, #695, #759; fe #331, #364, #444, #452–#459, #534, #538, #542, #543 |
| Headhunter / Team lead roles and scope, program invites | be #517, #520, #522, #524, #525, #531, #533, #539, #545, #550, #624, #635, #686, #698; fe #333, #347, #359, #361, #443, #459, #530, #541 |
| Call result / Log result, no-answer retry, follow-ups, Send info | be #565, #580, #584, #697, #622, #623, #674; fe #312, #341, #363, #368, #379, #381, #394–#396, #510, #551, #553 |
| My hand-offs / My invites / Team queue / Offer modal / waiver reason | be #575–#578, #708, #710–#713, #731, #746, #754, #755; fe #389–#392, #559, #563, #578, #592–#595 |
| Onboarding 1-1 flow, setup call, Mark done, no-show | be #602, #630, #647, #726, #771; fe #416, #417, #451, #537, #570, #590, #591, #596, #600, #610, #620 |
| Nurture drip, scheduled Send info (e-mail + SMS through omni), delivery status. P2 lists "turn it on in prod" as a go-live item, but it is Recruit-owned mail that does not replace a MOSO mail | be #654–#658, #661–#665, #764, #775; fe #511–#514, #619, #630 |
| Omni integration (cast, followers, @mention, Team-only notes, inbound reply) | be #511, #513, #589, #605, #606, #609–#611, #626, #753; fe #304, #311, #315, #422, #423, #425, #473, #477 |
| Platform inbox through moso-notifier v2 (a kept platform service, not old MOSO) | be #514, #527, #593, #603, #615, #645 |
| RBAC P1–P5 central permissions (auth-service), roles removed, D349 holes | be #714, #717, #727, #728, #733, #777, #780; fe #567, #574, #598 |
| Experience level display and Reports (the MOSO write-back half is in §3) | be #763; fe #554, #618, #621 |
| Call workspace, popup tabs, LO profile redesign, TERA/HR kit, 2026 design layer, landing page, menus, tables | fe #300–#330, #399, #481–#509, #555, #562, #564, #566, #581, #583, #586, #605, #629–#643 and more |

## 7. Plan items EXPANDED beyond the original plan

| Item | Origin | Why |
|---|---|---|
| **0gwad.8** (closed) FE approvals toast for a candidate with no MOSO record, fe #631 | Review of fe #569 (P1a), 23/10 | Blocker for turning `moso-record-required` OFF anywhere: the toast falsely said "invite sent" |
| **0gwad.9** (closed) The offer card shows Recruit's own invite mail; Recruit owns the resend with no packs row, be #782 (D350) + fe #636 | Review of be #741 (P2 invite) | With write-back off in prod, a Recruit-sent invite had no resend path (409 without a packs row), and the card only read the packs row |
| **0gwad.10** (open) Approvals toast for other delivery states (PENDING / NOT_QUEUED / suppressed) | Follow-up of .8 | .8 only covered SKIPPED + no MOSO key |
| **0gwad.11** (in progress) Go-live gates before `lo-mail-invite` ON in prod: resend rule for legacy SENT offers, a stuck CLAIMED row, DROPPED wording | Reviews of fe #636 | Pre-D331 offers that packs mailed would show "could not confirm" plus Resend once the flag is ON |
| **0gwad.11.2** (closed, staging) Invite lost when MOSO refuses the onboarding specialist, be #784 (**D351**). .11.1 was closed as a duplicate | Staging e2e 30–31/10 | **An interaction between the bridge (D207 hand-off) and P2.** A refused specialist made the tick retry record-only, so nobody mailed the LO |
| **D325 / D327 / D333** (Cold rows exempt from the MOSO owner sync; previous MOSO recruiter shown by name, Cold rows only) | P0 Cold import, kzwcg | The import had to stay safe against D310, and recruiters wanted the old owner as reference |
| **D316** dry-run-by-default import + a MOSO Datastore client for the exclusions (R48); #776 runner fix | P0 / decision round 2 item 1 | The owner-map decision (exclude LOs working at LF) and the unindexed `SMSOptOut.active` returning 0 rows |
| P1(b) logo work grew to the social icons and webinar image (fe #572) | P1(b) | The P1(c) templates reference those images too |
| Outside recruit: moso-notifier #350 / notification-service #363 (RECRUIT prod sender) | P1(b) | Still waiting on Khai. Not in this PR count |

## 8. Observations for Bao

1. **The 23/10 rule "no new RecruitApiClient write kinds" held.** Since 23/10 no new `PacksWritebackKind` was added. The only new kinds since 01/10 are `MEETING_REMINDER` (02/10) and the D303 payload `new_email` plus the read `emailAvailable` (20–21/10), all before the rule. **New packs READ paths did grow after it:** the REFERRER sweep and backfill (D326, #734/#783/#785) and the packs verdict for the referral program (#772).
2. **The bridge is no longer "thin" in prod.** Since 29/10 (#703) seven write-back flags are ON in production, including the identity write-back to MOSO. Bridge-polish PRs landed after 23/10: D336, D344, D346, D348 (be #748, #767, #770, #774, #778; fe #580, #584, #612, #626, #632, #635). Each was asked for, but together they are new investment in code that P6 must delete.
3. **Not labelled as bridge but should be on the P6 removal list:** D310 owner sync (#716, off in prod), REFERRER's packs sweep (D326), My referrals' packs/Check read (D317/D321/D718), the moso-aid roster client (D202/D340), the webinar signals from the MOSO push (D277/D253), and the signed reconcile (D246). Only the last is already named (P4/P6).
4. **The decouple work that is done is mostly dark in prod.** P1(a) flag still TRUE; P2 mail DRY_RUN with flags absent; #784 staging only. The parts that are live are the P0 Cold import, the asset hosting, Modex/MMI and the HR licence and hand-off paths.
