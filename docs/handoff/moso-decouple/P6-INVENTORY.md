# P6 inventory: what still ties Recruit to old MOSO, and the moso-off switch

Bead: `agentflow-0gwad.7` (P6 preparation). Written 08/11/2026.

**Code read:** recruit-be `origin/master` at `e9272009c`, plus `4813d924e`. recruit-fe `origin/master` at `2c42f854`.

**Old MOSO** means three things (HANDOFF.md §2):
- packs + the moso GAE app (`www.loanfactory.com/api/*`, staging `www.viet18.com/api/*`);
- MOSO Datastore;
- moso-aid.

Out of scope: omni, notifier, cron-service-go, tera-core, gateway, auth-service SSO, user-service, zoom-go, ai-hr-be, Google, PayPal.

**How this was measured:**
- Each touchpoint was read in code (`git grep` / `git show`).
- Flag values come from `helm-chart/config/{staging,production}/values.yaml`. "absent" means the code default applies.
- No DB settings were read. Rows that depend on a DB setting say "not measured".
- recruit-be holds **no MOSO Datastore client** (`MosoImportExclusions.java:15-16`). Its Datastore reads happen outside recruit-be: the migration runner and `dsq_prod.sh`. So no Datastore row appears below.

## 0. The headline

| | Count |
|---|---|
| Backend touchpoints (rows with a status) | **44**, plus 3 rows that are archive or one-off |
| … replaced, live on staging | **15** |
| … replaced, code exists but dark | **2** |
| … **blockers** (no Recruit replacement yet) | **27** |
| Frontend message keys that name MOSO | **124** (122 distinct texts), in 10 groups |
| Frontend links that open a MOSO page | **0** |

**10/11 ~11:40 VN (§0f): 31 / 44 = 70% live, 36 / 44 = 82% including dark (BE-28 and BE-41 now Replaced-dark, on top of §0g).** Before that, **10/11 ~09:20 VN (§0g): 31 / 44 = 70% live, 34 / 44 = 77% including dark, after `referrals.source` = RECRUIT on staging.** Before that, **09/11 ~21:00 VN (§0e): 25 / 44 = 57% live, 33 / 44 = 75% including dark (BE-12 recounted as dark); 59% / 77% once recruit-be #950 (BE-14 RECRUIT) is on staging.** Earlier: Independence on staging (re-measured 09/11 ~12:30 VN, recruit-be master `5c91281e8`, which is what staging runs): 25 / 44 = 57%; counting code that exists but is still dark (shadow or flag off), 32 / 44 = 73%. History: 34% (08/11 morning), 41% (08/11 evening), 43% (09/11 night). See §0d.

Formula: **Replaced-on ÷ (Replaced-on + Replaced-dark + Blocker)**, over the backend rows in §1.
- Each row is one place where recruit-be talks to, waits on or relies on old MOSO.
- Rows marked n/a are excluded from both sides: Cold import (done), the stored "previous MOSO recruiter" name, and the sync-trace views (UI to delete in P6).
- Only backend rows count. The frontend strings follow the backend: each string disappears when its backend path does, so counting them would double-count.

**Production independence is lower: about 0%.**
- Almost every replacement flag is absent in production.
- Production still creates every lead from the MOSO push.
- It still sends invites, agreements and reminders through packs.

By group:

| Group | Rows | Replaced-on | Replaced-dark | Blocker | n/a |
|---|---|---|---|---|---|
| Outbound write (packs outbox) | 10 | 3 | 2 | 5 | 0 |
| Outbound read | 6 | 1 | 0 | 5 | 0 |
| Inbound push / MOSO-sourced data | 9 | 4 | 0 | 4 | 1 |
| Cron | 5 | 0 | 0 | 5 | 0 |
| Gate or rule | 5 | 3 | 0 | 2 | 0 |
| Secret / config | 7 | 2 | 0 | 5 | 0 |
| Data shown | 5 | 2 | 0 | 1 | 2 |
| **Total** | **47** | **15** | **2** | **27** | **3** |

Blockers by the phase that owes them:

| Owed by | Rows |
|---|---|
| P4 S4/S5: e-sign through document-esign, signed state (the MOSO agreement, its dry run, its reconcile, its welcome) | BE-03, BE-06, BE-15, BE-18 (signature half), BE-27, BE-34 |
| P4: D292 hand-off bell for MOSO-linked Loan Officers | BE-02 |
| P5: referral bonus state, referrer identity, Ambassador totals, referrer role, digest | BE-11, BE-12, BE-21, BE-23, BE-29, BE-30 |
| P5: moso-aid (LO Recruiter Program roster and member link) | none since 10/11 (§0f): BE-14 on, BE-28 and BE-41 dark (D442) |
| **No phase owns it yet:** a recruiter's Zoom texting identity is their MOSO Admin key | BE-13, BE-42 |
| **No phase owns it yet:** the "next webinar" token and list dates still read the packs picker, even with Recruit webinars on | BE-45 |
| P6 itself: bridges that only exist to keep MOSO in sync, deleted at the cut | BE-04, BE-05, BE-22, BE-26, BE-35, BE-36, BE-39, BE-40 |

## 0f. Program roster source switch built dark, 10/11 (~11:40 VN)

recruit-be #956 (D442, squash `e7d2bcb70`) is on staging. It was promoted by itself, and #957 deployed on top of it at 03:25Z.

- **The switch:** `recruit.features.program-roster-source` picks the roster the LO Recruiter Program sync acts on.
  - `MOSO_AID` is the default: `MosoAidRosterClient`, unchanged.
  - `RECRUIT` uses `RecruitRosterReader`. It reads the roster Recruit computes from `program_application_mirror` and `program_applicant_identity`, the same data as D439's `ProgramRosterShadowService`.
- **No moso-aid on `RECRUIT`:** the sync makes no moso-aid call and needs no moso-aid URL, roster key, app id or namespace. Pins that are set still pin the keys.
- **Dry-run compare:** with `program-roster-shadow` on, each tick also runs the other source through the same guards and decisions, read only and before any write. It logs `program roster source dry-run` with hashed ids.
- **Values:** staging `RECRUIT_FEATURES_PROGRAM_ROSTER_SOURCE=MOSO_AID`; production has no key (= `MOSO_AID`). `ProgramRosterSourceValuesTest` guards both.
- **When to flip:** at Bao's stage 3. The plan is mirror, then a week of matching from 09/11, then approvals in Recruit.

**Staging proof (10/11):**

| Check | Result |
|---|---|
| Pod env | `RECRUIT_FEATURES_PROGRAM_ROSTER_SOURCE=MOSO_AID`, `RECRUIT_FEATURES_PROGRAM_ROSTER_SHADOW=true` |
| Startup line | `Program roster source: MOSO_AID (dry-run comparison on)` |
| Every tick since 02:10Z (10-minute cron, 7 ticks on the current pod by 04:40Z) | `acting=MOSO_AID other=RECRUIT same=1 differing=1 MOSO_AID{grants=0 revokes=0 suspensions=0} RECRUIT{grants=0 revokes=0 suspensions=1} members=[f50acae235a9:MOSO_AID=[]/RECRUIT=[](COMPANY_EMAIL_MISSING)]` |
| Tick itself | `program sync tick dry_run: members=53 approved=53 linked=2 grants=0 revokes=0 suspensions=0` (`program_sync.mode` DRY_RUN) |
| Grants unchanged | `program_role_provisions` 0 rows and `rbac_grant_history` PROGRAM_SYNC 0 rows, both before the deploy and at 04:40Z |
| ERRORs | 5 on the new pod, none from the program sync (SSE converter, unknown `/me` and `/settings` routes, duplicate-lead refusal) |

**Before flipping to `RECRUIT`, resolve the one difference.** The compare covers the 2 linked members. One of them (`f50acae235a9`) would be **suspended `COMPANY_EMAIL_MISSING`** on `RECRUIT`, because their resolved user-service account has no company e-mail. This is the D439 shadow's "1 the account has none" case. Give that account a company e-mail, or accept the suspension, first.

**BE-41, what it means here:** the program sync no longer *needs* the moso-aid secrets once the source is `RECRUIT`. They stay in `recruit-svc-secret` and values for now. Staging still runs `MOSO_AID`, and the D421 applications import (`ProgramApplicationImportConfiguration`) and the referrals key also read them. They are deleted at the P6 cut.

| | Replaced-on | Replaced-dark | Blocker | Live | Incl. dark |
|---|---|---|---|---|---|
| Baseline §0g (10/11 ~09:20 VN) | 31 | 3 | 10 | 31 / 44 = 70% | 34 / 44 = 77% |
| 10/11 ~11:40 VN (+ BE-28, BE-41 dark) | 31 | 5 (BE-08, BE-10, BE-12, BE-28, BE-41) | 8 | 31 / 44 = **70%** | 36 / 44 = **82%** |

The 8 blockers left are the P6 bridges deleted at the cut: BE-04, 05, 22, 26, 35, 36, 39, 40.

## 0g. Re-measure after `referrals.source` = RECRUIT, 10/11 (~09:20 VN)

Bao approved WEDNESDAY-1111 items A2, A3 and A4 for STAGING. Production values were not touched.

**Switched on staging (settings API, read back):** `referrals.source` SHADOW → RECRUIT. Also, outside this inventory's rows: `webinar.drip_mail.after_1_month` P1M and `webinar.drip_mail.enabled` true (A2), `RECRUIT_WEBINAR_SESSIONS=true` on Cloud Run `lf-homepage-master` / `lo-homepage-master` (A2), and recruit-fe #738 (referrer review card, A3).

**Shadow just before the switch** (admin Referrals, all owners, since 2026-01-01; log `referral_source.shadow purpose=VIEW`): packs 111, recruit 151, only_packs 3, only_recruit 43, owner_differs 7, joined_differs 1, recruit_unknown 7, entry/eligible/amount differs 0.

**After:** SHADOW stops logging under RECRUIT. The admin list reads Recruit: 79 → 123 rows, 19 → 46 referrers. Most of the extra rows are Recruit-only staging test leads (Oct/Nov). My referrals answers 200. No new ERROR lines in the pod log.

**Pod check:** `RECRUIT_PROGRAM_MEMBER_LINK_CHECK` is RECRUIT on staging, so #950 (BE-14) is live. That makes the §0e "once #950" row the baseline: 26 on, 8 dark, 10 blockers.

| Row | Move | Why |
|---|---|---|
| BE-11, BE-23, BE-29, BE-30 | dark → **on** | D429: the list, totals, digest and REFERRER sweep reads follow `referrals.source` |
| BE-21 | dark → **on** | `RecruitReferralRows` joins `referral_bonus_state`, so the bonus shown now comes from Recruit |

| | Replaced-on | Replaced-dark | Blocker | Live | Incl. dark |
|---|---|---|---|---|---|
| 10/11 ~09:20 VN | 31 | 3 (BE-08, BE-10, BE-12) | 10 | 31 / 44 = **70%** | 34 / 44 = **77%** |

Production: still about 0%. Side effects to watch on staging:
- The REFERRER role sweep (BE-30) can now grant REFERRER to people who appear only in Recruit's referral rows.
- The digest (BE-29) still mails only `bao.trinh+*@loanfactory.com`, because of `RECRUIT_REFERRALS_NOTIFY_ALLOWED_EMAIL_PATTERNS`.

Revert: set `referrals.source` back to `"SHADOW"`.

## 0e. Background-only switches, 09/11 evening (~21:00 VN)

Bao approved at ~19:10 VN on 09/11: on STAGING, turn on the Recruit replacements that change NO screen or user-visible data, before the Victoria demo (Tue 10/11 22:00 VN). Each dark row and each shadow-built blocker was checked for anything a staging user could see (page, list, count, mail, bell). Code: recruit-be `origin/master` `5b84e7474` (what staging runs). Production values were not touched.

| Row | Switch | Decision | Why |
|---|---|---|---|
| BE-14 | `RECRUIT_PROGRAM_MEMBER_LINK_CHECK` SHADOW → RECRUIT (staging values) | **Flip**: recruit-be #950, waiting on CI (the self-hosted runners queued its jobs for over 80 minutes on 09/11, re-run queued too) | Read only on an admin `/link` (`ProgramMemberLinkService#verifyIdentity`); no tick, page, list, mail or bell. RECRUIT only widens acceptance: Recruit confirms (account ACTIVE + carries the member's websafe key), else packs decides as before. The user-service owner still confirms `ref_keys` cannot be self-set before production (D439). Revert: value back to "SHADOW". |
| BE-12 | `RECRUIT_REFERRALS_REFERRER_IDENTITY_SOURCE` SHADOW → RECRUIT | **Skipped: visible** | Not "first link only". Under RECRUIT `ownerKeysOf` returns all of a person's keys (D438 addendum 3b), and My referrals reads them all. Staging 09/11: 3 people hold two directory keys. 1 of them is already linked, and their second key carries 5 referral snapshots, so their My referrals would change at once. Also, the 35 people MOSO calls inactive but HR has on the books would be linked at first login, which also runs the headhunter catch-up. Needs Bao to accept those effects. |
| BE-28 | none exists | **Skipped: no switch** | `ProgramRosterShadowService` only compares. The program sync still grants from `MosoAidRosterClient`; nothing reads Recruit's roster to act. |
| BE-21 | `referral.bonus_state.*` | **Skipped: nothing to flip** | Readers of `referral_bonus_state` are the admin summary, `RecruitReferralRows` (only under `referrals.source` = RECRUIT, out of scope) and the payout list (parked by Bao, D435). |
| BE-08, BE-10 | `RECRUIT_FEATURES_PORTAL_MOSO_MIRROR` | **Skipped: visible** | Writes paid/signed into MOSO staging and changes MOSO's flow. A refused mark adds a Recruit timeline line, and the 1-1 write-back waits on the PORTAL_STATE row. |
| BE-11, 23, 29, 30 | `referrals.source` | Not touched (instruction) | Changes the Referrals pages. |

**Count fix:** §0d counted BE-12 as a Blocker while its §1 row says Replaced-dark (D438 is built and runs in SHADOW). It is counted as Replaced-dark from here on.

| | Replaced-on | Replaced-dark | Blocker | Live | Incl. dark |
|---|---|---|---|---|---|
| Now (09/11 ~21:00 VN, #950 not merged) | 25 | 8 | 11 | 25 / 44 = **57%** | 33 / 44 = **75%** |
| Once #950 is on staging | 26 | 8 | 10 | 26 / 44 = **59%** | 34 / 44 = **77%** |

Outbound read group once #950 lands: 6 rows, 4 on (BE-13, 14, 15, 16), 2 dark (BE-11, 12), 0 blockers. The 10 blockers left are BE-28, BE-41 and the 8 P6 bridges.

**To finish #950:** squash-merge on green, `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<squash sha>`, check the pod env and the startup line `Program member link check: RECRUIT`, and watch ERROR lines for 15 min (baseline 09/11, 3 h: 6 ERRORs, all `BaseExceptionHandler` "No referrer identity shadow run has finished on this pod yet"). Then move BE-14 to Replaced-on in §1.

## 0d. Re-measure, 09/11 midday (~12:30 VN)

**What was read:**
- Code: recruit-be `origin/master` `5c91281e8`. Staging runs that same sha: "Deploy staging (GKE)" succeeded at 05:17 UTC.
- Flags: `helm-chart/config/{staging,production}/values.yaml` at that sha.
- DB settings: the staging `recruit_settings` table, read-only, latest row per key.
- One row count on staging: `agreement_envelopes`.

**The finding that moves the number:** D409 is no longer dark on staging.
- recruit-be #937 set `RECRUIT_FEATURES_ESIGN_DE: "true"` on staging. document-esign #138 (the RECRUIT caller) is merged and on DE staging.
- DE staging keeps Inkless off, because Inkless would bill the production account. #940 added the staging-only `RECRUIT_ESIGN_DE_ALLOW_BUILT_IN: "true"`, so Recruit signs on DE's free built-in signing page instead. #939 logs a WARN when DE reports Inkless off.
- Positive control: staging `agreement_envelopes` holds 1 row in status COMPLETED. It was created at 05:12:11 UTC, completed at 05:13:44 UTC, and has signed files. So the send, the signature and the COMPLETED event all ran end to end through document-esign, with no packs involved.
- So "esign-de stays off" is out of date for staging. It is still absent (off) in production. Inkless itself (the paid signing service) is still off on DE staging, which affects only which signing page the Loan Officer sees.

| PR | Decision | Moves | Evidence |
|---|---|---|---|
| #937, #940 (+ DE #138) | D409 live | BE-03, BE-06, BE-15, BE-18, BE-27, BE-34: Replaced-dark → **Replaced-on** | `ESIGN_DE` and `ESIGN_DE_ALLOW_BUILT_IN` are both "true" on staging; 1 COMPLETED envelope (above). Same scope as before: Recruit-only portal Loan Officers. MOSO-linked Loan Officers finish in MOSO. |
| #930 | D434 | none (supports BE-15) | The staff agreement status reads `agreement_envelopes`. It is visible now that esign-de is on. |
| #927 | D432 | none (moso-off survival, see §0c) | `ONBOARDING_NATIVE` "true", inert while the packs write-back is armed on staging. |
| #928, #931 | D433 | none (BE-11 prep) | A one-time import of packs-only referrals into Recruit, to fill the data before `referrals.source` = RECRUIT. `referral.packs_import.apply_enabled` is false on staging now (it was set true from 02:39:17 to 02:40:02 UTC). |
| #938 | D437 | none (BE-12 in part) | Settles WHICH person a snapshot names as the referrer: MOSO `referred_lo`, else the page owner the server resolved, else MOSO `referrer`. Rows are still keyed by the MOSO Admin key. `ReferrerIdentityServiceImpl` and `DefaultReferralLinks` are unchanged since `4dc3aa661`. |
| #932, #934 | D435 | none | Payout list parked (`REFERRAL_PAYOUT_LIST` "false"); Bao chose the accounting route. |
| #933 | D436 | none (not a MOSO read) | Recruiter blacklist copied to ai-donotcall, built dark. |
| #935, #941 | D431 follow-ups | none (BE-16/45 already Replaced-on) | MOSO's 1-month drip subject; no-owner drips are sent From recruiting@. |
| moso-aid #225 | D421 | none | A read-only applications feed that Recruit reads (DRY_RUN, 60 rows). It is still a moso-aid read, so BE-14/28/41 stay blockers. |
| moso-aid #226 | D410 | none (BE-17 already Replaced-on) | After-party RSVPs dual-posted to Recruit's lead intake. Off by default; waiting on a DevOps secret. |

**Each blocker, checked:**

| Row | Moved? | Code path | Flag or setting on staging | Still waits on |
|---|---|---|---|---|
| BE-12 | Dark (identity half) | D438 (recruit-be #944 `5dc90213a` + #947 `eb168a9cf` + #948 `ede8e0ae4` + #949 `5b84e7474`, V358): Recruit's own referrer identity = central user id, in `referrer_directory` (MOSO key kept as the legacy alias). `ReferrerIdentityServiceImpl` resolves an unlinked person from it first under RECRUIT, packs fallback. `DefaultReferralLinks:80` (site domain) still reads packs; `MosoLoanOfficerCheck` runs with HR in shadow (D430). | `RECRUIT_REFERRALS_REFERRER_IDENTITY_SOURCE` "SHADOW" (prod absent = PACKS); `RECRUIT_REFERRALS_LOAN_OFFICER_SOURCE` "SHADOW" | Shadow 09/11 (88 directory users, first-login simulation vs packs `referrers/resolve`): agree 41, disagree 2, Recruit ambiguous 3, packs refuses 42 (INACTIVE 34, NONE 8); agreement where both answer 41/43 = 95%. Positive control: 33 of 34 packs-verified links map to the same user-service account, 0 to another. Re-measured 09/11 after #948 (`ede8e0ae4`, Recruit links only a person ACTIVE in user-service or on HR's books): agree 41, disagree 2, Recruit ambiguous 3, both refuse 1, packs refuses / Recruit links 41 (packs INACTIVE 34, NONE 7). The 34 MOSO-inactive people are ACTIVE in central (user-service or HR), so the gate does not move them: a source-of-truth call for Bao. Disagree 2 and ambiguous 3 are all one person holding two MOSO keys (packs' key is among Recruit's in all 3 ambiguous; in the 2 disagree Recruit's key is the one referral rows hold). Re-measured 09/11 after #949 (`5b84e7474` on staging: HR alone decides "has left"; all of a person's keys are owner keys under RECRUIT): backfill APPLY 136 keys (IDENTITY_LINK 34, USER_SERVICE_EMAIL 57, NOT_FOUND 45; written 0, pruned 0), control 33 same user, 0 other user, 1 not found. Shadow (88 users): agree 41, disagree 2, both refuse 8, packs refuses / Recruit links 35 (packs INACTIVE 34, NONE 1), Recruit refuses / packs links 2, Recruit ambiguous 0 (was 3). `recruit_several_keys` 3 (now resolved, no longer ambiguous); stored links: same key 32, among keys 0, other key 0, Recruit says departed 2. `referrer_active_check_total`: on HR books 78, departed 10 (8 both refuse + the 2 above, which packs still treats as active). The 2 disagree are now packs answering an e-mail key Recruit's directory lacks (1) or user-service does not know (1), not the two-key person. Open before RECRUIT: the 34 MOSO-inactive / HR-active people and the 2 HR-departed / packs-active people are a source-of-truth call for Bao; RECRUIT stays off until after the Victoria demo. Domain half: LO-site URL stays in moso-aid until P5; the `/join` slug fallback already works without MOSO. Rows stay keyed by the MOSO key (mapped to the user id by the directory). |
| BE-14 | No (shadow) | `ProgramMemberLinkService#verifyIdentity` → `ProgramMemberIdentityCheck` (recruit-be #945, D439) | `recruit.program.member-link-check` staging SHADOW, production absent = MOSO | P5: Recruit-first check built: the picked account is ACTIVE and carries the member's websafe MOSO key in user-service `ref_keys` (41 of 45 members with an e-mail would confirm by key on staging, 09/11). MOSO still decides on staging; no /link attempt yet, so the shadow counter `program_member_link_check` has 0 samples. Flip to RECRUIT after user-service confirms `ref_keys` cannot be self-set. |
| BE-28 | No (shadow) | `ProgramSyncService` → `MosoAidRosterClient:88` still acts; `ProgramRosterShadowService` compares beside it (recruit-be #945, D439) | `recruit.features.program-roster-shadow` staging true, production absent; `program_import.mode` APPLY on staging (60 rows) | P5: Recruit computes the roster from its application mirror + user-service accounts. Staging 09/11, tick 08:00Z: 53 keys, 53 approved on both sides, 0 status / level / team-lead differences, 43 identical, 10 e-mail differences (8 where moso-aid has no MOSO work e-mail but the account has a company e-mail, 1 the account has none, 1 both differ). Still a blocker until approvals move to Recruit and the program sync reads Recruit's roster. |
| BE-41 | No | moso-aid URL and keys in `recruit-svc-secret` and values | `PROGRAM_SYNC_MOSO_APP_ID/NAMESPACE` set | Goes away with BE-28 and BE-23 (P5). D439 adds no moso-aid key (its identity reads use user-service with the admin's bearer). |
| BE-04, 05, 22, 26, 35, 36, 39, 40 | No | Unchanged. The removal PR #923 is still OPEN and draft ("DO NOT MERGE until production runs on Recruit") | `PACKS_WRITEBACK` / `IDENTITY_WRITEBACK*` true; `MOSO_OFF` "false" | Production running on Recruit. They are deleted at the P6 cut, never replaced. |

The dark rows that are left, and why they are still dark: BE-08 and BE-10 (`PORTAL_MOSO_MIRROR` "false"). BE-11, BE-23, BE-29 and BE-30 (`referrals.source` "SHADOW" since 08/11 18:40 UTC). BE-21 (D420 bonus state runs in shadow, with no payout).

| Group | Rows | Replaced-on | Replaced-dark | Blocker | n/a |
|---|---|---|---|---|---|
| Outbound write | 10 | 6 | 2 | 2 | 0 |
| Outbound read | 6 | 3 | 1 | 2 | 0 |
| Inbound push / MOSO-sourced data | 9 | 5 | 2 | 1 | 1 |
| Cron | 5 | 1 | 2 | 2 | 0 |
| Gate or rule | 5 | 4 | 0 | 1 | 0 |
| Secret / config | 7 | 3 | 0 | 4 | 0 |
| Data shown | 5 | 3 | 0 | 0 | 2 |
| **Total** | **47** | **25** | **7** | **12** | **3** |

**Staging: 25 / 44 = 57% live. Including dark code: 32 / 44 = 73%** (unchanged, because these rows only went from dark to on). **Production: still about 0%.**
- `origin/production` is at `c80b18894`, so the D409 code is deployed there.
- But production's values carry none of the replacement flags (`ESIGN_DE`, `ONBOARDING_NATIVE`, `HANDOFF_BELL_RECRUIT`, `ZOOM_IDENTITY_FROM_ZOOMGO`, `WEBINAR_SCHEDULE`, `REFERRAL_BONUS_STATE`, `MOSO_OFF` are all absent).
- Production also still creates leads from the MOSO push. On staging the push is still live as well: 454 MOSO `webhook_events` in the last 24 hours, the newest at 05:05 UTC.

**What would move the next number:**
- Choosing `referrals.source` = RECRUIT on staging moves 4 rows from dark to on: BE-11, 23, 29, 30. It needs the D433 APPLY first.
- Switching on the portal mirror, or dropping it, settles BE-08 and BE-10.
- Nothing short of P5 (moso-aid roster, member link, referrer key) and the P6 cut moves the 12 blockers.

## 0c. Production-ON behaviours that rode the write-back flag (what the cut must not lose)

Draft #923 (P6 cut) and the moso-off switch (D414) turn off everything gated on "packs write-back armed". Four of those
gates carry behaviour that is ON in production today. Classified from the code (recruit-be `10f8d63b3`):

| Behaviour (prod today) | Truly needs MOSO | Recruit logic that only rode the flag | Recruit-native now |
|---|---|---|---|
| **D207 hand-off** (`onboarding-v2-handoff`): the invite goes to the onboarding specialist, no invite e-mail | Telling MOSO the specialist on the INVITE (`send_invite:false`), and the bell waiting for packs to ACCEPT that specialist (D292) | Deciding "hand-off, no e-mail" (`InviteMail#handsOff`), the specialist's "handed to you" bell, the hand-off chip (`onboarding_v2_handoff` on candidate-view), resend wording | **Yes**, D432 (recruit-be #927, `recruit.features.onboarding-native`, staging on): the hand-off survives; with packs disarmed Recruit rings the bell itself at send (linked and D399 branches) and on a specialist change. D427 (#918) already rang it at send while packs is armed. |
| **D354 wait for a specialist** (`invite-waits-for-specialist`): no specialist = no invite e-mail, the assigners are told | The packs INVITE row parked as `WAIT_SPECIALIST` and released by the specialist write | No invite e-mail while nobody holds the Loan Officer (`InviteMail#waitsForSpecialist`), the "waiting for a specialist" state, the bell to assigners, the specialist-wait reminders, Assign offered in My invites | **Yes**, D432: the wait shows with no packs row (`InviteDeliveryResolver`), My invites keeps Assign, reminders follow the native gate; the specialist assigned later gets the hand-off bell for the newest SENT offer. |
| **1-1 Done captures the meeting date + W-2/1099** (`onboarding-writeback`, `onboarding-hire-classification`) | Sending the date and `is_corporate_loan_officer` to packs `onboardingMeeting` so MOSO builds its agreement | Requiring the date and the W-2/1099 pick at Done, storing the date on the checklist item and `lo_type` on the candidate (read by D406 `recruit.hired.v1` contract_type and by D409 e-sign document choice), the modal flags (`writeback_enabled`, `hire_classification_enabled`) | **Yes**, D432: capture and storage survive; only the packs write disappears. Changing the specialist is allowed under capture alone. |
| **Agreement card** (MOSO Inkless status line + Send / Send updated) | **All of it**: it reads MOSO's envelope through packs `agreement/dryRun` and sends through packs `agreement/send` | none | **Replaced for Recruit-portal Loan Officers**: D434 (recruit-be #930 `f1c26ce05` + recruit-fe #732 `48a9bbb9`, on staging) shows the agreement signed through Recruit's own e-sign (D409) on the same Signed step: "Agreement sent for e-signature · {when}" / "Agreement signed · {when}", from `agreement_envelopes`, also under moso-off. Visible once `recruit.features.esign-de` is on (off everywhere today; D409's owner confirmed D409 had no staff view). MOSO-linked Loan Officers keep MOSO's card until they finish in MOSO. |

Also checked and left MOSO-only on purpose: `WelcomeMail` SENT_BY_MOSO (MOSO sends its own welcome only while it is told the 1-1 is done), `AgreementSendGate`, `OnboardingMeetingResendServiceImpl` (resend of the packs write), `HireClassificationWriter`'s lo_type enqueue, `PacksWritebackWaitReleaseService`, the packs payload resolver and tick.

**BE-12 (referrer identity and site domain), read 09/11, handed over by p5-lo-data (who owns only the D430 Loan Officer check):**
- *Site domain* (`DefaultReferralLinks`): the LO's own site domain comes from packs `referrers/resolve` → `domain_url`; the value itself lives in moso-aid's lo-setting (old MOSO), so there is no non-MOSO source to switch to yet. When packs cannot answer (including under moso-off, where the call is refused and counted), the code already falls back to Recruit's own `/join/<slug>` link from `program_members`. So the referral link keeps working without MOSO; what is lost is only the LO-site variant, which returns when P5 moves lo-setting off moso-aid. No code change needed.
- *Identity* (`ReferrerIdentityServiceImpl`): a person is mapped to their MOSO Admin key because referral rows are keyed by that key, in packs AND in D429's RECRUIT source (`RecruitReferralRows#byOwner(ownerKeys)`). Links already made are stored (`referrer_identity`) and need no MOSO call; only a person never linked needs packs. Replacing it means choosing Recruit's own referrer key (central user id) for D429's RECRUIT rows, which is the same open question as D429's SHADOW mismatch (89 of 120 rows name a different referrer: sign-up vs MOSO's current owner). **Waiting on Bao's D429 decision**; not built.
- BE-12 stays a blocker in the count, with both halves now explained.

**For #923 (still a draft):** keep these four behaviours by keeping their own flags and `recruit.features.onboarding-native` (or folding them into always-on), instead of deleting `onboarding-writeback`, `onboarding-hire-classification`, `onboarding-v2-handoff` and `invite-waits-for-specialist` together with the packs write-back. Asked of the #923 author.

## 0b. Re-measure, 09/11 night

| PR | Decision | Moves | Why |
|---|---|---|---|
| #918 | D427 | BE-02: Blocker → **Replaced-on** | Recruit rings the D207 hand-off bell at SEND for MOSO-linked leads too (`recruit.features.handoff-bell-recruit`, staging true). |
| #920 | D429 | BE-11, BE-23, BE-29, BE-30: Blocker → **Replaced-dark** | The referral list can come from Recruit's own data; staging runs `referrals.source` = SHADOW (packs still served, differences counted). They become Replaced-on when RECRUIT is chosen. |
| #921 | D430 | none yet (BE-12 in part) | "Is a Loan Officer" can come from HR (staging SHADOW); the referrer identity and site domain of BE-12 still read packs. |
| #911 | D421 | none | The LO Recruiter Program applications are mirrored FROM moso-aid (read-only): still a moso-aid read (BE-14/28/41 stay). |
| #913, #919 | D416 | none (opt-outs are not a recruit-be MOSO read) | Recruit's suppression list reconciled with ai-donotcall and omni. |
| #917 | D425, D426 | none (BE-17 already Replaced-on) | Webinar sign-ups on Recruit sessions; pre-offer portal link for self-registered leads. |
| #922 | D414 | none (switch plumbing) | `moso_off` on `GET /config/candidate-view`, read by recruit-fe #731. |

| Group | Rows | Replaced-on | Replaced-dark | Blocker | n/a |
|---|---|---|---|---|---|
| Outbound write | 10 | 4 | 4 | 2 | 0 |
| Outbound read | 6 | 2 | 2 | 2 | 0 |
| Inbound push / MOSO-sourced data | 9 | 4 | 3 | 1 | 1 |
| Cron | 5 | 0 | 3 | 2 | 0 |
| Gate or rule | 5 | 3 | 1 | 1 | 0 |
| Secret / config | 7 | 3 | 0 | 4 | 0 |
| Data shown | 5 | 3 | 0 | 0 | 2 |
| **Total** | **47** | **19** | **13** | **12** | **3** |

**12 blockers left:** BE-12 (referrer identity / domain via packs; HR half in shadow), BE-14 / BE-28 / BE-41 (moso-aid roster and member link), and the 8 P6 bridges deleted at the cut (BE-04, 05, 22, 26, 35, 36, 39, 40; draft removal PR in progress, marked do-not-merge).

**Frontend (recruit-fe #731, merged and on staging, inert while `moso_off` is false):** with `moso_off` true, groups A (Exceptions "Signed in MOSO", 13 strings) and B (Sync tab, 19) are hidden, E (MOSO agreement line, 23 of 26) renders nothing, and G (Zoom identity, 4) uses Zoom wording. C and D appear only on packs write-back states the backend no longer produces under moso-off; F is archive data. Before/after screenshots at 1440 and 375 (staging data through a read-only local proxy that sets `moso_off`): `moso-off-fe-shots/` next to this file (`<screen>-<before|after>-<width>.png`; the Zoom card shot simulates a backend without Connect Zoom, the production state, since staging has Connect Zoom on).

## 0a. Re-measure, 08/11 evening

What merged since the first measure, and how it moves the rows (code read on `origin/master` `22372d31e`, flags from the staging/production values files):

| PR | Decision | Moves | Why |
|---|---|---|---|
| #906, #916 | D409 | BE-03, BE-06, BE-15, BE-18, BE-27, BE-34: Blocker to **Replaced-dark** | A Recruit-only portal Loan Officer signs through document-esign; flag `recruit.features.esign-de` is `"false"` on staging until document-esign has the RECRUIT caller (#138). MOSO-linked Loan Officers keep packs' envelope. |
| #907 | D406 | none (HR side) | `recruit.hired.v1` carries W-2/1099, experience class and signed DMS ids for HR: part of P4 S8, not an old-MOSO touchpoint. |
| #910 | D420 | BE-21: Blocker to **Replaced-dark** | Recruit computes the referral bonus state (staging on), shadow-compared with packs, no payout. BE-11 (the referral LIST from packs) stays a blocker. |
| #912 | D422 | none (BE-17 was already Replaced-on) | Recruit-primary lead intake on the sites; packs still gets the row. |
| #915 | D423 | BE-45: Blocker to **Replaced-on** | The nurture next-webinar token reads Recruit's schedule (webinar-schedule is on in staging). |
| #915 | D424 | BE-13, BE-42: Blocker to **Replaced-on** | New Zoom texting identities come from zoom-go, not the MOSO Admin key (staging on). |
| #915 | D414 addendum | none (switch coverage) | The three caller-gated enqueues refuse 409 `MOSO_OFF` while the switch is on. |
| #911, #913 | D421, D416 | not counted | Still open at re-measure time (moso-aid applications mirror; opt-out reconcile). |

New counts:

| Group | Rows | Replaced-on | Replaced-dark | Blocker | n/a |
|---|---|---|---|---|---|
| Outbound write | 10 | 3 | 4 | 3 | 0 |
| Outbound read | 6 | 2 | 1 | 3 | 0 |
| Inbound push / MOSO-sourced data | 9 | 4 | 2 | 2 | 1 |
| Cron | 5 | 0 | 1 | 4 | 0 |
| Gate or rule | 5 | 3 | 1 | 1 | 0 |
| Secret / config | 7 | 3 | 0 | 4 | 0 |
| Data shown | 5 | 3 | 0 | 0 | 2 |
| **Total** | **47** | **18** | **9** | **17** | **3** |

**Staging: 18 / 44 = 41% independent** (Replaced-on ÷ (Replaced-on + Replaced-dark + Blocker), same formula). **Code-complete including dark: 27 / 44 = 61%.** Production: still about 0% (none of these flags is set there).

The 17 remaining blockers: P5 referral list / identity / Ambassador totals / referrer role / digest (BE-11, 12, 23, 29, 30), P5 moso-aid (BE-14, 28, 41), P4 hand-off bell for MOSO-linked leads (BE-02), and the P6 bridges deleted at the cut (BE-04, 05, 22, 26, 35, 36, 39, 40).

**D424 measured on staging (08/11 ~21:10 VN, after promote of `22372d31e`):** env `RECRUIT_FEATURES_ZOOM_IDENTITY_FROM_ZOOMGO=true`, `RECRUIT_FEATURES_MOSO_OFF=false`; no "zoom-go not configured" warning at startup; 0 ERROR lines. A DRY RUN of the batch (`POST /admin/zoom-links/auto-link?dry_run=true`, nothing written) examined 39 recruiting users: 9 already linked (untouched), 29 `ZOOMGO_NO_RECORD`, 1 `ZOOMGO_UNAVAILABLE` (zoom-go `check-email` answered 500 once). `recruiter_zoom_link` still holds the same 9 rows (8 MOSO-derived, none created in the last hour), so every existing SMS sender resolves exactly as before. No new identity could be linked from zoom-go on staging today: the 29 unlinked people have no zoom-go record (the MOSO batch had not linked them either). No SMS was sent. **There is no positive control yet** for a NEW zoom-go link: it needs one recruiting user without a row who has completed Connect Zoom.

## 1. Backend inventory

Paths are under `src/main/java/com/loanfactory/recruit/`. Columns:
- **stg / prod**: the flag values.
- **Off today**: what happens when the client is not configured. The moso-off switch reuses this path.
- **Status**: Replaced-on, Replaced-dark or Blocker.

### 1a. Outbound write: `RecruitApiClient` through the packs outbox

| id | Call site and trigger | Business effect | Gate (default) | stg / prod | Replacement or phase | Status |
|---|---|---|---|---|---|---|
| BE-01 | `recruitapi/RecruitApiClient.java` invite (POST `/candidate/invite`). Called from the relay tick, from `PacksWritebackEnqueuer#enqueueInvite`, and from `OfferServiceImpl` (send) / `InviteResendServiceImpl` | Tells MOSO the Loan Officer is invited. MOSO mails the invite unless Recruit does (D331 record-only) | `packs-writeback` (false); `lo-mail-invite` (false) | true / true; lo-mail-invite true / absent | D331 Recruit invite mail (P2); D399 portal link | Replaced-on |
| BE-02 | invite, specialist kind. Called from `OnboardingSpecialistAssignmentServiceImpl:596` | Tells MOSO the onboarding specialist. The D292 "handed to you" bell rings only when MOSO accepts | packs-writeback + onboarding-writeback | true,true / true,true | Not needed for no-MOSO leads (D399 rings at send). MOSO-linked leads: owed by P4 | ~~Blocker~~ → **Replaced-on** (D427 Recruit rings the hand-off bell at send (staging on, recruit-be #918); re-measured 09/11 night) |
| BE-03 | onboardingMeeting. Called from `ChecklistItemServiceImpl:641` (1-1 Done) | MOSO builds and sends the agreement (W-2/1099, legal name) plus `pre_onboarding_done` | onboarding-writeback, -hire-classification, -legal-name, -v2-handoff | all true / all true | P4 S4/S5 e-sign | ~~Blocker~~ ~~Replaced-dark (D409 document-esign signing for Recruit-only leads (flag `esign-de` off on staging until document-esign #138); re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-04 | sync. Called from `CandidateServiceImpl:281`, `HireClassificationWriter:97`, `ChecklistItemServiceImpl:645`, `ExperienceBackfillService:152` | Pushes company, sponsor states, lo_type and experience level to MOSO | packs-writeback; hire-classification; setting `packs.writeback.experience_enabled` | true / true; setting not measured | Bridge, delete in P6 | Blocker |
| BE-05 | sync (identity) and emailAvailable, from `packswriteback/identity/MosoFieldSync` | D303: name, phone, NMLS and e-mail fixes go to MOSO; e-mail checked for "taken" first | identity-writeback, identity-writeback-email | true,true / true,true | Bridge, delete in P6 | Blocker |
| BE-06 | agreementSend. Called from `AgreementSendServiceImpl:189` | A Recruit click sends MOSO's e-sign agreement | `agreement-send` AND hire-classification | true / absent | P4 S4/S5 | ~~Blocker~~ ~~Replaced-dark (D409; re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-07 | meetingReminder. Called from `JdbcOnboardingReminderLedger:116` and `OnboardingReminderTickServiceImpl` | 1-1 reminder mail sent by packs | onboarding-reminders; `lo-mail-reminders`; setting delivery_mode (not measured) | true,true / true,absent | D329 Recruit sends the reminder | Replaced-on |
| BE-08 | portalState. Called from `OfferServiceImpl:862/887` and `OnboardingTokenService:101` | D376: marks the row as Recruit-portal and mirrors paid/signed | `portal-moso-mirror` | "false" / absent | Bridge, delete in P6 | Replaced-dark |
| BE-09 | registerWebinar (plus GET `/webinars`). Called from `FollowUpServiceImpl:800` (only when webinar-schedule is off) | Registers the Loan Officer for a MOSO webinar; MOSO mails the confirmation | packs-writeback; `webinar-schedule` off | Recruit sessions on staging / MOSO path in prod | D359–D361, D392 own webinars; D330 mail | Replaced-on |
| BE-10 | portalUnmark, from `packswriteback/controller/PortalUnmarkController` | Admin undoes the D376 mark | SETTINGS_MANAGE | n/a | Bridge, delete in P6 | Replaced-dark |

### 1b. Outbound read

| id | Call site and trigger | Business effect | Gate | Off today | Replacement or phase | Status |
|---|---|---|---|---|---|---|
| BE-11 | `read /referrals/byOwner`, via `referralview/client/RecruitApiReferralOwnershipClient:137`, for My referrals, admin Referrals and CSV export | MOSO is the source of referrals and bonus state | setting `referrals.enabled` (not measured) | 503 `REFERRALS_UNAVAILABLE` | P5 referral bonus | ~~Blocker~~ ~~Replaced-dark (D429 referral list from Recruit data, `referrals.source` SHADOW on staging; re-measured 09/11 night)~~ → **Replaced-on** (D429 live: `referrals.source` RECRUIT on staging, 10/11 ~09:20 VN, §0g) |
| BE-12 | `read /referrers/resolve`, from `ReferrerIdentityServiceImpl:55`, `MosoLoanOfficerCheck` (D374), `DefaultReferralLinks:80` | Maps a person to their MOSO Admin key; "is a Loan Officer"; site domain | same | 503; the Loan Officer check falls back to roles; the link falls back to the /join slug | P5 | ~~Blocker~~ **Replaced-dark** (identity: D438 directory + RECRUIT-first resolve, staging SHADOW, 95% agreement where both answer, 09/11; after #949 0 ambiguous, 0 other-user links; site domain waits for P5, `/join` fallback) |
| BE-13 | `read /referrers/resolve`, from `zoomlink/ZoomLinkAutoLinkService:146/239` | D358: a recruiter's Zoom texting identity is their MOSO Admin key | `zoom-link-autolink` | caught, retried; new staff get no SMS identity | **No phase owns it.** zoom-go `los_user_id` is the old-LOS key | ~~Blocker~~ **Replaced-on** (D424 zoom-go identity (staging on); re-measured 08/11 evening) |
| BE-14 | `read resolve`, from `ProgramMemberLinkService:306` | D202: checks that a Program member's e-mail is that MOSO Admin | system actor | 503 "MOSO is unavailable" | P5 moso-aid | Replaced-on (recruit-be #950 `3dc55a679` on staging: pod env RECRUIT, startup line `Program member link check: RECRUIT`, re-checked 10/11; §0f) |
| BE-15 | agreementDryRun, from `AgreementStatusServiceImpl:112`, `AgreementSendServiceImpl:229`, `MosoSignedReconcileTickService:319` | Agreement status card; pre-send check | agreement-send | status carries a reason, no throw | P4 S4/S5 | ~~Blocker~~ ~~Replaced-dark (D409 (signing-link state replaces the dry run for Recruit-only leads); re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-16 | `webinar/WebinarClient:152-171` (packs webplus getNextWebinars), from the picker, `SourceDetailDecorator`, `WebinarFollowUps`, `NurtureTemplateVariables`, `WebinarConfirmationMail` | MOSO webinar picker, list dates, session dating | `RECRUIT_WEBINAR_BASE_URL` | UNAVAILABLE, never throws | Picker replaced by D392 `CallWebinarPick` (webinar-schedule) | Replaced-on |

### 1c. Inbound push and MOSO-sourced data

| id | Site | Business effect | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-17 | `moso/controller/PublicWebhookController:92`, then `MosoWebhookHandler` and `MosoRowUpsertServiceImpl` | **Creates and updates every production lead** | `MOSO_WEBHOOK_API_KEY` | secret / secret | D356 lead intake (stg true / prod absent); D382/D393 Add lead. P3 forms, FB ads and Calendly still owed | Replaced-on |
| BE-18 | `MosoRowUpsertServiceImpl:745-751,1567`; `ExceptionsController:70-109` (D287) | Fee paid / agreement signed in MOSO moves the Recruit offer | — | — | Fee: D375 PayPal (stg on / prod absent). Signature: P4 S5 | ~~Blocker~~ ~~Replaced-dark (fee D375 on; signature D409 dark; re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-19 | `MosoRowUpsertServiceImpl:556`, then `WebinarSignalCloser` | D277: a MOSO webinar registration or attendance closes follow-ups | `webinar-signals` | true / true | D359–D365 own sessions + Meet attendance | Replaced-on |
| BE-20 | `MosoOwnerSync:135/170` | D310: the S5–S7 owner follows MOSO's recruiter | `moso-owner-sync` | true / true | Native claim/transfer, D338 auto-assign | Replaced-on |
| BE-21 | `MosoRowUpsertServiceImpl:362/500/1497` | Referrer and program credit taken from MOSO fields | — | — | Intake carries referredBy (D339); bonus state owed by P5 | ~~Blocker~~ ~~Replaced-dark (D420 Recruit computes the bonus state (staging on, shadow vs packs, no payout); re-measured 08/11 evening)~~ → **Replaced-on** (`RecruitReferralRows` joins `referral_bonus_state`, so the bonus shown under `referrals.source` RECRUIT comes from Recruit; 10/11 ~09:20 VN, §0g) |
| BE-22 | `MosoRowUpsertServiceImpl:540/1173` (`afterMosoPush`), meeting auto-close; `moso_onboarding_specialist` read in `OnboardingSpecialistAssignmentServiceImpl:504-507,610` | MOSO echoes that unfreeze D303 fields; the MOSO_FIELD_CHANGED bell | — | — | Goes with BE-04/05 (P6) | Blocker |
| BE-23 | `ReferralActivityTotalsController:73`, then `ReferralTotalsPacksReader:82` (called by moso-aid) | Ambassador Activity totals, read from packs | `RECRUIT_REFERRALS_INTERNAL_API_KEY` | secret / secret | P5 | ~~Blocker~~ ~~Replaced-dark (D429 (clears once `referrals.source` = RECRUIT); re-measured 09/11 night)~~ → **Replaced-on** (D429 live: `referrals.source` RECRUIT on staging, 10/11 ~09:20 VN, §0g) |
| BE-24 | `registerstatus/controller/RegisterStatusController:68` | Pay gate for MOSO's `/register-loan-officer?key=` page (called by lf/lo-homepage) | public | live | D368 P4 S1/S2 portal (stg on / prod absent) | Replaced-on |
| BE-25 | `moso/controller/MosoImportController` | Cold import from an uploaded export (no network call) | IMPORT_RUN | — | Done once, prod 31/10 | n/a |

### 1d. Cron

| id | Registrar / tick | Effect | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-26 | `PacksWritebackTickCronRegistrar:53`, `PacksWritebackTickServiceImpl#tickOnce` | Delivers BE-01..BE-09 | `PACKS_WRITEBACK_INTERNAL_API_KEY` | secret / secret | Carries the blockers above | Blocker |
| BE-27 | `MosoSignedReconcileTickCronRegistrar:47`, `MosoSignedReconcileTickService` | D246: polls MOSO for signed agreements every 20 min | `moso-signed-reconcile` (true) | true / true | P4 S5 (DE COMPLETED event); keep for in-flight Loan Officers | ~~Blocker~~ ~~Replaced-dark (D409 ESIGN_ENVELOPE_COMPLETED subscription (#916 pre-set on staging, flag off); re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-28 | `ProgramSyncTickCronRegistrar:36`, `ProgramSyncService`, then `MosoAidRosterClient:88` | D202: Recruiter Program roster from moso-aid | setting `program_sync.mode` (staging DRY_RUN, 10/11) | — | P5 moso-aid | Replaced-dark (D442, recruit-be #956 `e7d2bcb70`: `recruit.features.program-roster-source` RECRUIT reads Recruit's own roster, staging MOSO_AID, production absent; per-tick dry-run compare; §0f) |
| BE-29 | `ReferralNoticeCronRegistrar:44`, `ReferralNoticeTickServiceImpl` | D317: referrer digest mail (reads packs referrals) | `referrals-notify` | true / absent | P5 | ~~Blocker~~ ~~Replaced-dark (D429 (clears once RECRUIT); re-measured 09/11 night)~~ → **Replaced-on** (D429 live: `referrals.source` RECRUIT on staging, 10/11 ~09:20 VN, §0g) |
| BE-30 | `ReferrerRoleSweep:79-109` on the RBAC reconcile tick | D326: grants REFERRER from packs referrals | `referrer-role` | true / true | P5 | ~~Blocker~~ ~~Replaced-dark (D429 (clears once RECRUIT); re-measured 09/11 night)~~ → **Replaced-on** (D429 live: `referrals.source` RECRUIT on staging, 10/11 ~09:20 VN, §0g) |

### 1e. Gates and rules

| id | Site | Rule | Gate | stg / prod | Replacement | Status |
|---|---|---|---|---|---|---|
| BE-31 | `candidate/MosoRecordRequiredFlag` (`OfferServiceImpl:172/745`, `InviteResendServiceImpl:134`, `FollowUpServiceImpl:568`) | A lead with no MOSO record cannot be invited | `moso-record-required` (true); `portal-join-link` | "false",true / absent,absent | D382 + D399 | Replaced-on |
| BE-32 | `MosoLink.isLinked` in offer, resend, delivery, dedup | `legacy_key` picks the packs path or the portal path | — | — | D399 / D382 | Replaced-on |
| BE-33 | `OnboardingSpecialistAssignmentServiceImpl:119/133` | D370: auto-pick only specialists MOSO knows | `ob-auto-pick-moso-known` | "false" / absent | D397 | Replaced-on |
| BE-34 | `onboarding/mail/WelcomeMail:76-80` | Welcome is skipped as SENT_BY_MOSO when the 1-1 write-back is on and the Loan Officer has a MOSO record | write-back flags | on / on | Tied to BE-03 / P4 | ~~Blocker~~ ~~Replaced-dark (D409: Recruit welcome + DE envelope for Recruit-only leads; re-measured 08/11 evening)~~ → **Replaced-on** (D409 live on staging, 1 COMPLETED envelope; re-measured 09/11 midday, §0d) |
| BE-35 | `RecruitApiClient` actor header | Every call acts as a MOSO Admin holding RECRUITING (A-019) | — | — | Goes away in P6 | Blocker |

### 1f. Secrets and config (key names only)

| id | Keys | stg / prod | Used by | Status |
|---|---|---|---|---|
| BE-36 | `RECRUIT_API_BASE_URL` (values), `RECRUIT_API_KEY` (secret) | viet18 / loanfactory `/api/recruit/v1` | everything in 1a/1b | Blocker |
| BE-37 | `RECRUIT_WEBINAR_BASE_URL` (+ namespace, type) | viet18 / loanfactory webplus | BE-16 | Replaced-on |
| BE-38 | `MOSO_WEBHOOK_API_KEY` | both | BE-17 | Replaced-on |
| BE-39 | `RECRUIT_API_FALLBACK_ACTOR_EMAIL`, `RECRUIT_API_REFERRALS_SYSTEM_ACTOR_EMAIL`, `RECRUIT_MOSO_SIGNED_RECONCILE_ACTOR_EMAIL`, `RECRUIT_PACKS_WRITEBACK_RETRY_UNKNOWN_ACTOR_AS_SYSTEM` | set / partly set | BE-35 | Blocker |
| BE-40 | `PACKS_WRITEBACK_INTERNAL_API_KEY`, `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY`, `RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY` | all three / first two | BE-26/27/29 | Blocker |
| BE-41 | `RECRUIT_MOSO_AID_BASE_URL`, `RECRUIT_MOSO_AID_ROSTER_KEY`, `RECRUIT_PROGRAM_SYNC_INTERNAL_API_KEY`, `RECRUIT_PROGRAM_SYNC_MOSO_APP_ID/NAMESPACE`, `RECRUIT_REFERRALS_INTERNAL_API_KEY` | both | BE-28 / BE-23 | Replaced-dark (D442: on source RECRUIT the program sync needs no moso-aid URL, roster key, app id or namespace; still set while staging runs MOSO_AID, and the D421 applications import and BE-23 still use them; §0f) |
| BE-42 | `RECRUIT_ZOOM_LINK_AUTOLINK_MOSO_APP_ID/NAMESPACE` | both | BE-13 | ~~Blocker~~ **Replaced-on** (D424: MOSO app id / namespace no longer needed; re-measured 08/11 evening) |

### 1g. Data shown

| id | Site | What users see | Replacement | Status |
|---|---|---|---|---|
| BE-43 | `template/lomail/MosoApplyLinks` (invite, welcome, invite reminder) | Mail links to MOSO's `/apply_loan_officer?key=` | D399 portal link (no-MOSO leads); under moso-off, everyone | Replaced-on |
| BE-44 | `moso/MosoRowMapper:1070-1166` (`MosoProfileFields`) | Profile fields mirrored from MOSO | D368/D372 portal profile save | Replaced-on |
| BE-45 | `NurtureTemplateVariables:90-106`, `SourceDetailDecorator:225-245` | "Next webinar" token and list dates still read the packs picker | none | ~~Blocker~~ **Replaced-on** (D423 Recruit schedule for the next-webinar token (list dates still packs for MOSO-registered leads); re-measured 08/11 evening) |
| BE-46 | `PreviousMosoRecruiterName` | Previous recruiter (stored, no call) | archive data | n/a |
| BE-47 | Sync trace, failure desk, field-sync views, Exceptions moso-sync, My invites reason codes | MOSO sync views | P6 removal | n/a |

## 2. Frontend inventory (recruit-fe `2c42f854`)

- **No link opens a MOSO page.** There is no `href` to MOSO admin, `apply_loan_officer` or moso-aid.
- **No inline English copy names MOSO.** Every inline `'…MOSO…'` literal is an enum or reason code.
- The only remote MOSO asset is the Loan Officer photo (`CandidateDrawer/LoAvatar.tsx:22`).

**124 English message keys name MOSO.** The `vi` files mirror them one for one.

| Group | Keys | Where (`src/messages/en/`) | Recruit replacement in the UI |
|---|---|---|---|
| A. Exceptions "Signed in MOSO" desk | 13 | `exceptions.json` 13–111 | None; the section only reconciles MOSO. Delete in P6 |
| B. Sync trace | 19 | `syncTrace.json`, `drawer.json:262` | None needed; a MOSO debugging view. Delete in P6 |
| C. Invite / offer delivery | 24 | `invite.json`, `invites.json`, `notifications.json:77` | Partly: the Recruit mail path and D382/D399 |
| D. Onboarding 1-1 write-back | 24 | `workQueue.json`, `settings.json:196` | Partly: `writeback_enabled=false` makes it a Recruit checklist item (what moso-off does) |
| E. Agreement / e-sign (MOSO Inkless) | 26 | `agreement.json`, `candidateEdit.json:42-44` | None; owed by P4 S4/S5 |
| F. Profile MOSO facts, legal name | 10 | `drawer.json`, `notifications.json:69-70` | Read-only imported fields; archive |
| G. Zoom identity | 4 | `connections.json:71-74`, `conversation.json:97` | Yes: native Connect Zoom (zoom-go OAuth) |
| H. Referrals | 1 | `referrals.json:78` (possibly orphaned) | No (P5) |
| I. Permissions | 2 | `permissions.json:40,47` | n/a (migration grant) |
| J. Audit | 1 | `audit.json:53` | n/a |

About 100 more keys sit on MOSO data without naming MOSO: the `moso_*` keys in `exceptions`, `drawer`, `notifications`, `candidateEdit` and `callWorkspace`.

Screens that work only on MOSO data:
- Exceptions moso-sync
- the drawer Sync tab
- the D303 field-sync notes
- the agreement card
- the 1-1 "Send again"
- the W-2/1099 warnings
- the invite gate
- the source chip from MOSO labels
- the duplicates survivor pick
- My referrals / All referrals
- Program members (hidden)

All are fed by the backend rows above, so each disappears or degrades with its backend row.

## 3. The moso-off switch (D414, recruit-be #909, squash `594ae3846`)

**`recruit.features.moso-off`.** Default false. Staging entry `RECRUIT_FEATURES_MOSO_OFF: "false"`. Production has no entry.

When ON:

| Touchpoint | Behaviour when ON | Rows |
|---|---|---|
| `RecruitApiClient` | `isConfigured()` is false; `send()` refuses `NOT_SENT` before any socket. Every existing "not configured" path applies: relay tick and reconcile idle (counted), Agreement send NOT_CONFIGURED, referrals 503, Zoom auto-link skips, email check empty | BE-01..15, 26, 27 |
| `PacksWritebackEnqueuer` | Disarmed. No row of any kind is queued, so there is no stale backlog when reverting. Every "MOSO write-back on?" answers false, so the 1-1, the invite (no D207 hand-off) and the welcome take Recruit's own paths | BE-01..09, 34 |
| `IdentityWritebackFlags` | D303 off; fields are Recruit's own | BE-05, 22 |
| `WebinarClient` | UNAVAILABLE | BE-16, 45 |
| `MosoAidRosterClient` | NOT_CONFIGURED; the program sync changes nothing | BE-28 |
| `PublicWebhookController` | Key checked, then 200 and the body dropped (nothing stored) | BE-17..22 |
| `MosoRecordRequiredFlag` | No MOSO record required (an invite still needs Recruit's portal link to be live) | BE-31 |
| `PortalJoinLinks` / `MosoApplyLinks` | Every Loan Officer gets the portal link; a MOSO URL is never printed. With no portal link the mail is refused, never sent with a dead link | BE-43 |
| `PortalUnmarkController` | 409 `MOSO_OFF` | BE-10 |

**Measuring it:**
- Every skip logs `moso_off_skip target=<packs|moso|moso-aid|moso-push> op=<…>`.
- Each skip also adds to `recruit.moso_off.skipped{target,op}`.
- `GET /api/v1/admin/moso-off` (SETTINGS_MANAGE) returns `{moso_off, skipped_since_pod_start}` for the pod that answers.

**Not faked:** every blocker in §0 stays a blocker. Under the switch it degrades to its existing "unavailable" or "not configured" answer:
- referrals show "temporarily unavailable" (503);
- the agreement card says MOSO e-sign is not available;
- the moso-aid roster does not sync;
- new recruiters get no Zoom texting identity from MOSO;
- the next-webinar token is empty.

**Known gaps in the switch:**
- (Closed 08/11, #915: they now refuse 409 `MOSO_OFF`.) `enqueueIdentityWriteback`, `enqueueAgreementSend` and `enqueueMeetingReminder` had no guard of their own. They rely on their callers' gates, which all answer "off" under the switch (`IdentityWritebackFlags`, `isConfigured()`). A future caller must keep that.
- The referrals 503 says "REFERRALS_UNAVAILABLE", not "MOSO is off". The frontend may match that exact text, so it was left alone.

### 3.1 Shipped and measured (08/11/2026, ~17:50 VN)
- recruit-be #909 was squash-merged as `594ae384643c7c7212689c814e40c8dba74de302`, then promoted (run 42472676872). The staging deploy (cd-staging run 42472696024) succeeded.
- On staging (`gke_lenderrate-master_us-central1_moso-kube`, ns `recruit-be`):
  - The deployment env has `RECRUIT_FEATURES_MOSO_OFF=false`.
  - The new pod `recruit-be-687878bb4d-szzp8` is Running.
  - It logged 0 ERROR lines in its first 3 minutes.
- `GET /api/v1/admin/moso-off` returned 200 `{"moso_off":false,"skipped_since_pod_start":{}}`.
- The MOSO push still lands: the newest `webhook_events` row with provider MOSO is 2026-11-08 10:33 UTC.
- Production: no entry, so the switch is off by default there. Nothing was deployed to production.
- Since this inventory was written, recruit-be #910 (D420) added a Recruit-computed referral bonus state that is shadow-compared with packs, with no payout. BE-11 and BE-21 are still blockers, because packs remains the source shown to users. The next inventory pass should count them as Replaced-dark.

## 4. Runbook: flip moso-off on STAGING (after the demo, from Wed 11/11 VN)

Do not flip before the Victoria demo ends (Tue 10/11 22:00 VN). **Never in production.**

### 4.1 Before the flip (baseline, 10 minutes)
1. Write down the pending outbox, because rows queued before the flip stay PENDING:
   - `bash ~/.cache/claude-recruit/pgq_stg.sh recruit "select payload_kind, status, count(*) from packs_writeback_outbox group by 1,2 order by 1,2"`
   - Also note the newest `webhook_events` row time: `select provider, max(created_date) from webhook_events group by 1`.
   - **Baseline measured 08/11 ~17:00 VN:** INVITE 4 PENDING, 17 DEAD_LETTER, 109 SENT, 1 SKIPPED; ONBOARDING_MEETING 54 SENT, 4 DEAD_LETTER; ONBOARDING_SPECIALIST 29 SENT, 10 DEAD_LETTER; PROFILE_WRITEBACK 26 SENT, 13 DEAD_LETTER, 14 SKIPPED; WEBINAR_REGISTRATION 7 SENT, 3 DEAD_LETTER; MEETING_REMINDER 6 SENT, 1 SKIPPED; AGREEMENT_SEND 2 SENT. Re-measure on the day: the 4 PENDING INVITE rows are the ones that would flush when reverting.
2. Error baseline for the last 24 hours (Cloud Logging, recruit-be staging, severity>=ERROR): count by logger.
3. Confirm the admin endpoint answers `moso_off:false`:
   - `curl -sS -H "Authorization: Bearer $(cat ~/.cache/claude-recruit/preview/stg_3370.token)" https://gateway.viet18.com/recruit-svc/api/v1/admin/moso-off`

### 4.2 Flip
1. In recruit-be, open a PR that changes `RECRUIT_FEATURES_MOSO_OFF` to `"true"` in `helm-chart/config/staging/values.yaml` only.
2. Squash-merge it on green, then promote: `gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<sha>`.
3. Check the env on each pod:
   - `kubectl --context gke_lender-rate_us-central1_moso-gke -n recruit-be get deploy recruit-be -o jsonpath='{..env[?(@.name=="RECRUIT_FEATURES_MOSO_OFF")].value}'`
   - Use the staging context your notes give (`lenderrate-master`). Read flags only.
4. The startup log must show `recruit.features.moso-off is ON`.

### 4.3 Measure (first 2 hours, then again after 24 hours)

| What | How | Expected |
|---|---|---|
| Skips by target | `GET /admin/moso-off` on each pod; Cloud Logging `moso_off_skip` | Grows for `packs relay tick`, `packs signed reconcile tick`, `moso-push listener`; no other `packs …` op unless a user hit a blocker |
| No MOSO traffic | Cloud Logging: no `Packs writeback … delivered`, no `RecruitApiClient` HTTP errors | 0 |
| No new outbox rows | the outbox query again | Counts unchanged |
| No new MOSO pushes stored | `select provider, max(created_date) from webhook_events group by 1` | The MOSO provider's max is unchanged since the flip |
| New ERRORs | severity>=ERROR vs the baseline | No new logger; any new one is a bug in the switch (file a child of 0gwad.7) |
| Invite a test lead with a MOSO record (`bao.trinh+<tag>@loanfactory.com` only, not a +stg demo lead) | UI: Pipeline → lead → Invite | Offer SENT; Recruit invite mail with the `?invite=` portal link; no packs INVITE row |
| 1-1 Done on that lead | Today / Onboarding | Checklist item done, no "Sync pending"; Recruit welcome mail with the portal link; **no agreement** (blocker BE-03) |
| Add lead / lead intake | Pipeline → Add lead; /join on lf staging | Lead created in Recruit |
| Webinar | Call outcome → Webinar | Recruit sessions (D392) are listed; the next-webinar token in nurture mail is empty (BE-45) |
| Screens expected to degrade (blockers, not regressions) | My referrals / All referrals; agreement card; Settings → Program members; Zoom auto-link for a new recruiter | 503 "temporarily unavailable"; "agreement not available"; roster unchanged; no auto-link |

Record the numbers in this file under a new heading "Staging flip <date>".

### 4.4 Revert (one value, about 10 minutes)
1. PR `RECRUIT_FEATURES_MOSO_OFF: "false"`, merge, promote, and check the env as in 4.2.
2. Rows queued **before** the flip deliver again: the relay resumes. Look at the 4.1 list first. If an INVITE or MEETING_REMINDER row is older than a day, mark it SKIPPED by hand rather than mailing late (ask first).
3. **MOSO pushes received while ON are lost:** the listener answered 200, so packs will not resend. A row MOSO changed during the window updates on its next MOSO save. If the window was long, run the MOSO reconcile or import for the leads touched in that window before trusting their MOSO-sourced fields.
4. Writes skipped while ON (identity fixes, lo_type, experience, specialist) are **not** replayed. MOSO keeps its older values for those leads until the next edit. That is acceptable on staging.

## 5. Questions for Bao (each with a recommendation)

1. **(Done 08/11: D424, recruit-be #915.) Zoom texting identity (BE-13/42).** It is keyed by the MOSO Admin key, and no phase owns it. **Recommendation:** add it to P5 as "Zoom identity from zoom-go OAuth only". Native Connect Zoom already exists, so moso-off just stops auto-linking new recruiters.
2. **(Done 08/11: D423, recruit-be #915.) Next-webinar token (BE-45).** **Recommendation:** a small P3b follow-up that reads Recruit's own schedule.
3. **Flip date.** **Recommendation:** Wed 11/11 morning VN, as the team lead proposed, for 24 hours, then decide whether staging stays MOSO-off. The agreement (P4 S4/S5) is the one flow staging loses while it is on.
