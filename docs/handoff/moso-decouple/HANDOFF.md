# Recruit ⇢ off old MOSO — HANDOFF

Session `460363a7` (21/10/2026). Paused 21/10. **Approved by Bao 23/10**: see RESUME HERE. Nothing coded yet.

## PAUSE 23/10 (Bao shut the machine down mid-work) — RESUME FROM HERE

All 4 worker agents were told to stop at a safe point and to write exact resume notes into their beads. **Read those first:**
- `bd show agentflow-0gwad.1` (P0 snapshot)
- `bd show agentflow-0gwad.2` (P1a flag + P1b mail/logo)
- `bd show agentflow-kzwcg` (Cold import filter)

### PR state, measured with gh at pause time

| PR | What | State |
|---|---|---|
| recruit-be #722 `feat/moso-record-flag` | P1a: flag `recruit.features.moso-record-required` (default TRUE = no change), D314, V271 | OPEN, sha 4dcc9586, worktree recruit-be-worktrees/moso-record-flag. **CI RED**: (1) `SchemaDocFreshnessTest`: regenerate docs/SCHEMA.md for V271; (2) `OnboardingReminderIT` 'outbox insert fails leaves NO ledger row' relied on the legacy_key NOT NULL that V271 drops, so force the failure through another NOT NULL column; (3) check the PR-title regex. Round-1 reviewers approved; round-2 verdicts pending (respawn reviewers if gone). Then merge → staging. |
| recruit-fe #569 `feat/moso-record-flag` | P1a FE: invite modal + duplicates follow the flag; honest "saved, not sent" toast | OPEN, sha 82b61175, worktree recruit-fe-worktrees/moso-record-flag. **CI RED**: `WorkQueueClient.templateFilter.test.tsx` (not touched by this PR; check whether it also fails on master) + PR-title check. 2 reviewers APPROVED. LOW: `onSent` callers WorkspaceOfferSlot / MosoSyncSection. Merge AFTER #722. |
| recruit-fe #568 `chore/email-logo-asset` | P1b: logo hosted in recruit-fe | MERGED (staging) |
| recruit-be #721 `chore/email-logo-url` (sha 1f975059, worktree recruit-be-worktrees/logo-url) | P1b: e-mail logo URL from recruit-fe (`recruit.nurture.email-logo-url`), off the MOSO bucket | OPEN. CI green, 2 reviewers APPROVED, staging logo URL already returns 200. Next: merge if still not behind, then check the staging pod env RECRUIT_EMAIL_LOGO_URL. Note: recruit-fe must reach prod before prod nurture/Send-info are switched on. |
| notification-service #363 (worktree `_worktrees/ns-recruit-sender`) | P1b: the same RECRUIT entry in the Go service's startup seeding (needed after Wave 5, 02/11) | OPEN, PR only, Khai. After #350 merges it needs a java-acks line. Suggest holding the prod push until the Wave 6a watch ends (~04/11) and announcing it on notification-service#232. |
| moso-notifier #350 `chore/recruit-prod-mail-identity` | P1b: RECRUIT prod mail config copied from ENGAGEMENT | OPEN, **PR only. Khai reviews/merges.** The SendGrid-account question for Khai is in the PR body. |
| recruit-be #724 `feat/cold-import-filter` | Cold import safe by default (D316) | OPEN. java-reviewer APPROVED. code-reviewer has **1 HIGH open**: runner `--target` is not verified against `--import-base` (could hit prod). Also 2 MEDIUMs: `--exclusions FILE` 24h age check; record `limit` in the manifest and refuse apply. Also implement Bao's owner rule NONE (below). **No prod run.** ⚠️ The p0-coldfilter agent hit the session limit (resets 05:00 VN) BEFORE it read the owner-rule and HIGH messages, so none of that is implemented yet; last pushed sha 16cd45a9 (CI green). Worktree recruit-be-worktrees/cold-import-filter. |

### Bao decisions (23/10, round 3)
- **Cold owner rule = NONE:** every Cold row is imported UNOWNED. The old MOSO recruiter is stored as read-only reference info only, never as owner, never feeding Mine/claim/auto-own. (P0 found `claimed_profile` = the Loan Officer claiming their public profile, not a recruiter claim; MOSO `recruiter` alone would have given 3,354 rows to 6 staff.)
- **moso-aid data:** Bao approves ONE read-only admin CSV export of the LO Recruiter Program applications, approvals and roster. Steps or result are in P0-SNAPSHOT.md / `agentflow-0gwad.1` notes. Do NOT use the Cloud Run env secrets.

### P0 results (details in `P0-SNAPSHOT.md`, committed 8893126)
- **Prod settings:** referrals.enabled=true; program_sync.mode=DRY_RUN; onboarding.reminder.delivery_mode=DRY_RUN with 0 allowed emails (**prod sends NO 1-1 reminder emails**); headhunter.auto_own=false; hot.idle_release_omni_check=true; nurture off. packs_writeback_outbox has 0 rows.
- **Snapshot** in `~/.cache/claude-recruit/moso-snapshot-2310/` (PII, chmod 700, never commit): LORecruiting 131,201; Admin 6,278; BlackListUser 83; SMSOptOut 7,828; OptOutRequest 51,502; referral Checks 484; Webinar 200. CallOptOut is the federal DNC list (looked up by phone, 0 non-federal hits).
- **Cold dry-run:** 71,935 open → minus 56 already in recruit, 458 WORKING at LF, 2 no-rehire → **71,419 to import**.
- **Templates** in `templates/`. The prod welcome email has no onboarding-doc or Canva links; keep it as-is (Bao: keep current content). The 1-1 reminder has no MOSO template; recruit writes its own.
- **SECURITY (tell Bao/DevOps):** moso-aid on Cloud Run keeps MONGO_URI, JWT_SECRET and the SSO client secret as plain env vars.

### Next after resume
1. Re-read the bead notes. Re-check each PR (`gh pr view`); CI may have finished while the machine was off.
2. Finish #722 then #569, and #721 (staging only).
3. #724: owner rule NONE + the HIGH/MEDIUM fixes, re-review, merge (staging), staging dry-run. A prod run only with Bao's explicit go.
4. P1c: port the 4 templates plus a new 1-1 reminder body into recruit `message_templates` (From = recruiter/OB).
5. Ping Khai on moso-notifier #350.

## RESUME HERE (updated 23/10)

Bao APPROVED the plan on 23/10. Beads were created; no code yet.

- Epic `agentflow-0gwad`, with children:
  - `.1` P0 rescue data + measure prod settings
  - `.2` P1 foundations
  - `.3` P2 own emails
  - `.4` P3 lead intake + webinars
  - `.5` P4 portal / fee / e-sign
  - `.6` P5 data + programs
  - `.7` P6 cut
- Dependency wiring:
  - `.3`, `.4`, `.5` and `.6` depend on `.2`.
  - `.5` also depends on `.3`.
  - `.7` depends on `.3`–`.6`.
  - `agentflow-kzwcg` (Cold import) depends on `.1`.
- Bao's decisions (23/10):
  1. Plan approved.
  2. 8oafx and `agentflow-61yi6` stay as a **thin flagged bridge** until P4; remove them in P6; no new investment.
  3. Email From = **the actual recruiter/OB**; the signature comes from that person's profile.
  4. The Loan Officer portal **stays on lf-homepage**, with its API repointed to recruit-be (not packs).
- New since 21/10: Bao's gcloud identity can READ MOSO prod Datastore, so P0 exports can read Datastore directly (HR pattern) with no MOSO admin cookie. Recruit prod DB is readable through a temporary pod in ns `recruit-be`.
- Next: start `agentflow-0gwad.1` (P0) and `.2` (P1), unless Bao picks another order. Still open from §5: 1 (Cold owner-map), 3 (e-sign Inkless vs built-in plus legal review), 4 (fee), 6 (webinar owner), 7 (DE and accounting sprint), 8 (packs owner to switch off MOSO recruiting automation).

### Decisions round 2 (23/10)

Bao 23/10 decisions (accepted all of the lead's recommendations):
1. Cold import owner-map: EXCLUDE loan officers currently WORKING at LF (NMLS or email match against MOSO Admin: active, lo_joined_date set, no terminate_date) and not_eligible_for_rehire rows. A row MOSO marks as claimed by one of the active MOSO recruiting staff keeps that recruiter as owner (reuse the D310 / prod_grant_proposal mapping). Everything else is imported UNOWNED into Cold.
2. E-sign: keep Inkless and the CURRENT agreement content and signing flow. Do it via document-esign's existing 1099/W-2 templates. No legal re-review; a person compares the new PDF to the current MOSO PDF before go-live.
3. Start-up fee: keep PayPal, the same amount and the same waiver rules, using the same PayPal account. Port packs checkPayPalTransaction to recruit-be. No change for the Loan Officer.
4. Webinars: Recruit owns them (Google Calendar + Meet; recruit-be already has the Calendar client and Meet attendance). The same team creates webinars, in Recruit instead of MOSO.
5. document-esign and accounting changes: the lead writes the PRs; Khai reviews and merges. No sprint planning needed.
6. MOSO recruiting automation: when Recruit's own emails go live in prod (P2), the lead sends a small packs PR so MOSO's LORecruiting follow-up crons/mails skip Recruit-managed rows; Khai deploys after Bao says "ok tắt".

Next: P0 (`.1`) and P1 (`.2`) in progress, staging only.

## 1. What was done

- Bao asked for **every** Recruit dependency on the old MOSO system. Three independent auditors read recruit-be @`8c064b0d` and recruit-fe @`0b353055` plus the MOSO repos (`git grep`/`git show`, read-only):
  - `audits/A-code-forward.md`: 81 items, recruit code → outbound.
  - `audits/B-reverse-from-moso.md`: 61 items, MOSO side → recruit (packs `3.64.1` treated as prod).
  - `audits/C-business-flows.md`: 71 items, traced per business flow, with runtime config. (`C-fe-notes.md` was lost when /tmp was wiped; its findings are already in C §2.P.)
- The lead merged and deduped them into **85 items in 12 groups**, verified the disputed points itself, and measured production (§3).
- Bao then asked for a plan to become independent of old MOSO, by owning each capability in Recruit or by using other non-MOSO services. Two researchers mapped replacements across the whole org:
  - `replacements/R1-replacements-leads-data.md`: lead intake, identity, Loan Officer data, opt-outs, webinars, referrals, moso-aid, Cold pool.
  - `replacements/R2-replacements-comms-onboarding.md`: email, templates, reminders, e-sign, portal and fee, accounts, staff identity, bell, omni, hosting.
  - Plus R2 helper notes: `email-templates-bell.md`, `esign-portal-payment-hr.md`, `identity-accounts-hosting.md`.
- The audit files were rebuilt from the agents' transcripts after `/private/tmp` was wiped. If one is missing here, the facts in §2–§3 are the authoritative summary.

## 2. Scope: what counts as "old MOSO"

- **Remove:**
  - `packs` + `moso`: the GAE monolith at `www.loanfactory.com/api/*`.
  - MOSO Datastore: SystemProps and Templates.
  - `moso-aid`: Node + Mongo, keyed by MOSO Admin keys, reads MOSO webplus.
- **Keep** (these are platform services, not old MOSO):
  - omni-service.
  - moso-notifier: prod is notifier-be on Postgres since 18/10; the Go notification-service waves run 26/10–03/11.
  - cron-service-go, tera-core, gateway.
  - GCP project `lender-rate` and clusters `moso-gke`/`moso-kube`. This is simply the company GCP; **no move needed**.
- **Platform-owned** (not Recruit's work):
  - MOSO SSO in auth-service (`iss https://www.loanfactory.com`).
  - user-service copying users from MOSO.
  - zoom-go `los_user_id`.

## 3. Facts verified by the lead (not just reported by agents)

- **Prod recruit → packs write-back is OFF.** Measured with kubectl, read-only, on 21/10, context `gke_lender-rate_us-central1_moso-gke`, ns `recruit-be`, key names plus boolean flags only:
  - Neither the deployment env nor `recruit-svc-secret` has `RECRUIT_FEATURES_PACKS_WRITEBACK`, `AGREEMENT_SEND`, `ONBOARDING_WRITEBACK` or `ONBOARDING_V2_HANDOFF`.
  - So in prod an Offer is marked SENT and **no invite email goes out from Recruit**.
  - Prod env flags that are set: `ONBOARDING_REMINDERS=true`, `NURTURE_FOLLOWUP=true`, `GOOGLE_CONNECT=true`, `HR_HANDOFF_PUBLISH=true`, `HR_HANDOFF_AUTO_SEND=false`, `POST_JOINED_PROGRESS=true`, `OMNI_INBOUND_REPLY_ENABLED=true`, `OMNI_FOLLOWER_ROLE_ENABLED=true`.
  - The secret has 24 keys, including `MOSO_WEBHOOK_API_KEY`, `RECRUIT_API_KEY`, `PACKS_WRITEBACK_INTERNAL_API_KEY`, `RECRUIT_MOSO_SIGNED_RECONCILE_INTERNAL_API_KEY`, `RECRUIT_MOSO_AID_BASE_URL` and `RECRUIT_MOSO_AID_ROSTER_KEY`.
  - Consequence: the signed-reconcile cron (20 min) **does** register in prod. Auditors B and C had guessed it did not.
- **packs `GET /api/recruit/v1/webinars` exists on BOTH `3.64.1` and master** (`RecruitAPI.java:270`). Auditor C was wrong.
- **The omni reply-address endpoint is missing** from omni master and production. It exists only on `origin/feat/subject-reply-address` (PR #608, no reviews). On staging, the recruit flag silently falls back to the recruiter as Reply-To.
- **moso-notifier has no RECRUIT sender in production config.** It is in `application-staging.yml:41-49` only ("Production does not get RECRUIT").
- **lf-homepage no longer calls recruit `register-status`** (commit `72cef7e3`, 29/09). The endpoint has no caller.
- **ai-hr-be creates the MOSO Admin** for a hire via packs `InviteAdminsOp` (`internal/packsclient/client.go`).
- **`lead-be` exists** in the org and is live (it serves borrower leads, not Loan Officers).
- **Still unmeasured:**
  - Prod DB settings: `referrals.enabled`, `program_sync.mode`, `onboarding.reminder.delivery_mode` (decides whether 1-1 reminder emails really go out in prod), `headhunter.auto_own_enabled`, `hot.idle_release_omni_check`.
  - Which packs build GAE prod runs.
  - The share of Recruit users on MOSO SSO.
  - Which CloudSQL instance holds the prod Recruit Postgres.
  - Who actually sends the invite to Loan Officers in prod today. **Guess (unverified):** staff press invite in MOSO admin.

## 4. Plan (as presented to Bao, not yet approved)

Principle (copied from how HR did it): go **per capability**. Recruit becomes the system of record for one capability at a time and only *notifies* packs while other MOSO consumers still need the data. Each step runs dual behind a flag, gets reconciled, then cuts over and the old code is removed. Don't wait for a company-wide MOSO shutdown.

- **Phase 0 — Rescue data and lock decisions (now).** Some exports only work while MOSO is up (they need a MOSO admin session). This is the ONLY hard deadline.
  - Cold pool export: about 72k open in MOSO vs 377 Cold rows in prod. Blocked by the owner-map decision, bead `agentflow-kzwcg`.
  - Opt-out ledgers: BlackList and SMS/email/call opt-outs. First fix the 100-note STOP scan cap. Note the mismatch: ai-donotcall has 53 blacklist rows, recruit 121.
  - moso-aid Mongo: the LO Recruiter Program roster and applications.
  - The 5 email bodies packs sends: invite, webinar, welcome/pre_onboarding_done, agreement link, 1-1 reminder.
  - Referral bonus state and webinar history.
  - Rule from now on: no new `RecruitApiClient` write kinds.
- **Phase 1 — Foundations.**
  - (a) Recruit's own candidate UUID becomes the key; `legacy_key` becomes optional; the `requireMosoRecord` gate goes behind a flag. The candidate links to the user-service `user_id` at hire. This blocks phases 3 and 4. (M)
  - (b) Add the RECRUIT prod sender in notifier, before Wave 5 on 02/11. Turn on mail-status intake. Move the logo off the `lender-rate` bucket. (S)
  - (c) Port the 5 email bodies into recruit `message_templates`. Decide where the signature comes from. (M)
- **Phase 2 — Recruit sends its own email (quick wins).**
  - 1-1 reminders (S): Recruit already owns the schedule; only the final send goes to packs.
  - Webinar confirmation (S).
  - Nurture and Send info on in prod.
  - Invite and welcome sent by Recruit, temporarily still linking to MOSO `/apply_loan_officer`.
  - Ask the packs owner to switch off MOSO's own LORecruiting crons and mails (e.g. `ProcessLORecruitingFollowUpEDCCronOp`, B-113) for Recruit-owned rows, so nobody gets double mail.
- **Phase 3 — Own lead intake.**
  - Keyed public intake in recruit-be, ported from `lead-be`. (L)
  - lf/lo-homepage forms (Register, Refer-a-LO, webinar, /join, /recruit) dual-post, then flip to Recruit as primary.
  - Move FB lead ads and Calendly. Turn on `native-candidate-create`. Recruit stamps origin itself.
  - Own webinars (M): a MOSO webinar is just a Google Calendar event with a Meet link, and recruit-be already has the Calendar client and Meet attendance.
  - Watch the reverse dependency: crm-be-go's "LO recruiting" newsletter list reads MOSO.
- **Phase 4 — Onboarding, contract, fee (hardest; these ship together).**
  - Recruit public portal (token, not the MOSO key) replacing `/apply_loan_officer`. (L)
  - PayPal server-side verification, recorded in accounting. (M)
  - E-sign via `document-esign`, which is live in prod and already has Inkless plus 1099/W-2 templates. The DE team needs to add a RECRUIT caller, a service type and a candidate signer role. Recruit ports packs' required-document-per-state rules. Legal reviews the text. (M–L)
  - Applies to new offers only; in-flight Loan Officers finish in MOSO, with the push and reconcile kept alive.
  - HR hand-off (ai-hr-be) becomes the only path for "joined", adding the experience class and W-2/1099. Accounting turns on `COMMISSION_PLANS_FROM_HR` in prod.
- **Phase 5 — Loan Officer data and programs (parallel to 3–4).**
  - Loans: Modex only. (S)
  - NMLS, licences, sponsorship: extend ai-hr-be's NMLS report puller. (M)
  - Opt-outs: ai-donotcall plus omni SMS suppression; recruit keeps its ledger.
  - Referral bonus state: owned by Recruit, paid via accounting-be or CSV.
  - LO Recruiter Program: Recruit takes it over from moso-aid, and the lf-homepage console and Ally are repointed. (M–L)
- **Phase 6 — Cut.**
  - Turn off the MOSO push listener and remove `RecruitApiClient` kinds one by one. The "recruiter must be a MOSO Admin" lock (A-019) disappears with the last one.
  - Remove about 150 "do X in MOSO" UI strings, the "Signed in MOSO" Exceptions desk and the MOSO sync trace.
  - `legacy_key` becomes archive data.

Order: 0 → 1 → 2 sequential; 3, 4 and 5 in parallel after 1; 6 last.

**Tension flagged to Bao.** In-flight work still *adds* MOSO write-back:
- 8oafx syncs NMLS, phone, email and name to MOSO (staging; packs #3721/#3722 wait for Khai).
- bead `agentflow-61yi6` turns on packs-writeback in prod.

Recommendation: treat these as a **thin, flagged bridge** while sign, pay and register still live in MOSO (until Phase 4), mark them for removal in Phase 6, and invest nothing more in them.

## 5. Decisions waiting on Bao or other people

1. Cold pool owner-map (`agentflow-kzwcg`). This blocks Phase 0.
2. Email From: each recruiter or "Loan Factory Recruiting"? Where does the signature come from?
3. E-sign: Inkless or document-esign's built-in signer? Who in legal reviews the text?
4. Start-up fee: keep PayPal? Still $100? Must it land in accounting?
5. Portal: in recruit-fe, or stay on lf-homepage with its API repointed?
6. Who owns webinars after MOSO?
7. Which sprint do the document-esign and accounting teams give this?
8. Will the packs owner switch off MOSO's recruiting automation in Phase 2?

## 6. Agents used (all finished; nothing running)

`moso-dep-A`, `moso-dep-B`, `moso-dep-C`, `replace-map-1`, `replace-map-2`. All were read-only: no checkouts, builds or pushes. replace-map-1 made shallow clones only in its own scratchpad.
