# Phương's 22/10 recruit feedback — HANDOFF (paused 22/10 evening, Bao going home)

Session: da43ac56-60ea-4ce0-8af1-2972ee58cfc7. Read this file top to bottom before doing anything.

## Sources
- Meeting 22/10 transcript: `docs/transcripts/2026-10-22_phuong-nguyen_feedback-recruit-app-demo.md`
- Meeting 15/10 with chị Phương (menu, My today, tracking…): **misfiled** at
  `docs/transcripts/2026-10-15_phuong-nguyen_recruit-feedback.md` (name says "register form",
  content is the Vietnamese Phương meeting). The real register-form meeting is `…improve-the-register-loan-officer-form-discussion.md`.
  Bao has NOT answered whether to rename/move it — ask.
- Slack #lo-recruiting (C0BJXSC5B8A): Phương's screenshots 22/10 (Qualified/waiver column, remove Type, Overdue above
  header, label Recruiter, Loan production, menu). Design reference: https://ramp.com/ (memory project_design_direction_ramp_1022).
- Mockup canvas (all screens, shared org-wide): https://claude.ai/artifact/Ltmn46envGibNbgEx6Ckda
  (local source: session scratchpad `today-mock/project/*.dc.html` — scratchpad may be wiped; the artifact is the truth).

## DONE — all on recruit STAGING, NOT production
| PR | What | master sha |
|---|---|---|
| recruit-fe #560 | My work today manager review: Qualified/Not qualified only; waiver → popover on Qualified (Bao picked option B), "Waiver requested" chip in Note, Recruiter column + "You" chip, no Type column, ONE sticky header under the first group bar, columns with floors+fr (spread on wide screens, sideways scroll < 1440px) | b32acd9f |
| recruit-fe #561 | Column "Loan production" → "Production" / "Sản lượng" (same as Cold list) | 60bc7edf |
| recruit-fe #562 | Menu in named groups like TERA/HR (Bao picked option A): Today · Leads · Hand-offs · Referrals · Manage · Setup; "Exceptions" → "Needs attention" / "Cần chú ý" everywhere user-visible | f806b98e |
Each: 2 reviewers approved, CI green, staging deploy success, verified on staging (popover checked read-only, nothing approved).
Production: NOT pushed — Bao decides (go-live = `git push origin origin/staging:refs/heads/production`, release team).

Also done: 7 staging test accounts for Chi (chi.tran+recruiter/manager/onboarding/hh/teamlead/losupport/admin@loanfactory.com),
one role each, central RECRUIT role granted by session agentflow-99, real logins passed. Plain-text file for Chi:
`.worktrees/_designs/staging-test-accounts-chi.txt` (chmod 600, Finder revealed for Bao). Never print it.
Risk: chi.tran+onboarding is in the onboarding round robin (may get auto-assigned LOs on staging).

## IN PROGRESS — My referrals redesign (mockup waiting for Bao's final OK)
Mockup = bottom of the canvas ("My referrals · redesign"). Agreed so far with Bao:
- One row per LO: Loan officer (name + NMLS) · Came through (Program / Referral) · Stage (+ progress bar, "Stalled" chip) ·
  **Recruiter** column · **Onboarding specialist** column (separate, each with AVATAR) · Latest step + date · Bonus chip.
- Stage shows **HR** / **Licensing** directly (not "Onboarding · HR"). Derive from milestones: hr_account_created_on set &
  hr_completed_on not → HR; HR done & licensing_sponsored_on not → Licensing.
- Click a row → right panel: both people with avatars, bonus sentence, 9 steps with dates.
- Masked row wording "Not confirmed yet" (was "Pending review"). Remove ALL explanatory text/footnotes.
- Bao asked twice why masked rows hide the name; last explanation (self-typed referrer on the public form → hidden until a
  recruiter has touched the LO at S1+, else anyone could type someone's e-mail to watch an LO's pipeline; design §6.3,
  `ReferralAssembler.gate`). Not confirmed he is satisfied — check.
- "Stalled" = active and no human touch for `referrals.stalled_after_days` (7) days (`ReferralAssembler.isStalled`).

Plan once Bao OKs: BE first (recruit-be referralview: add onboarding_specialist_name + avatar urls for recruiter and OB +
maybe sub-stage; `MyReferralItem` has an allow-list test `MyReferralItemAllowListTest` — update it deliberately), then FE
(`src/app/[locale]/(private)/my-referrals/*`), local preview for Bao BEFORE commit, 2 reviewers, staging.

## NOT STARTED / parked (from the 22/10 + 15/10 meetings)
- Combine Recruiting & Referral pages — Bao: leave it ("kệ nó đi").
- Finalise /loan-officer + register pages — Bao: park it.
- Tracking every field for a future dashboard (15/10) — not started; needs Phương's spec.
- Onboard Victoria's & Benjamin's teams on staging with their own accounts/real roles — needs names/emails/roles from Bao.
- Bao's own: design concept (Ramp) with anh Khải/Đạt/Tài; 1–2 min intro video for anh Khải's Monday meeting; weekly user
  interview (Chi collects Thu, Phương sends anh Thuận Fri); tell anh Thuận Modex has no API → MMI primary.

## Worktrees (recruit-fe) — safe to remove after merge
- `recruit-fe-worktrees/today-review-1022` (#560, merged), `today-production-label` (#561, merged), `menu-groups` (#562, merged).
- No dev servers running; ram-gate tokens released. Preview recipe: `.env.local` from `_worktrees/recruit-fe-1owir`,
  `npx next dev -p 3511` in the worktree, `node ~/.cache/claude-recruit/preview/front_3511.js stg_<port>.token <port>`
  (3510 Manager, 3520 Recruiter, 3550 Onboarding, 3570 Châu Châu/admin); tokens via the e2e-lab `auth.js` login script with
  `NODE_PATH=/Users/apple/.npm/_npx/705bc6b22212b352/node_modules` (playwright is not installed in the repo).

## Next step on resume
1. Ask Bao: OK the My referrals mockup? (and the transcript rename question).
2. If OK → BE change in recruit-be, then FE, local preview, PRs, staging.

## UPDATE 22/10 night (resumed) — My referrals v2 decisions (Bao)
Mockup: canvas board "My referrals v2" (1110px = real width at 1440 with the sidebar).
- Money first: Paid to you / On the way / People you referred (no sub-captions), referral link + Copy + "Refer someone"
  (proposed: opens /refer/refer-a-loan-officer prefilled with the referrer — not confirmed by Bao).
- Table: 9 detailed steps as columns, header numbered 1–9 with step name + who owns it (Referred·You, Contacted·Recruiting,
  Offer sent·Recruiting, Agreement signed·Your friend, Fee paid·Your friend, HR forms·Friend+HR, Licensing·Licensing,
  Setup call·Onboarding, Joined). Done = ✓ + date; current = colored dot + days waiting + chip "Waiting on X" UNDER that
  dot (orange = the friend, blue = a Loan Factory team). No chip for joined/stopped rows. Recruiter + Onboarding
  specialist with avatars, NO message buttons (Bao: don't load employees with LO questions). Bonus column.
- Tabs All / In progress / Joined / Stopped; "Email me when something changes" switch (new feature).
- **Typed-e-mail referrals (REFERRED_BY_EMAIL / self-declared, e.g. /refer/refer-a-loan-officer "Your email") are SHOWN
  immediately — Bao chose option 3 (no masking, no confirmation).** BE: `ReferralAssembler.gate` must stop returning
  MASKED (keep HIDDEN only if the typed address is not the caller's current company e-mail). Record as a recruit-be
  DECISIONS entry when implementing (supersedes design §6.3 masking). Prod: 1,411 rows were masked.
- Mobile: tables don't fit — one card per Loan Officer with the 9 steps vertical (proposed).
- REFERRER central role (for Loan Officers without a recruit role) belongs to session agentflow-99's central-RBAC work:
  grant on the event when recruit receives a referral + one nightly reconcile (new referrers are 11–28/month);
  sizing written in docs/handoff/recruit-central-rbac/HANDOFF.md.
- MOSO dependency: referral list, bonus eligibility/amount/checks all come live from MOSO via packs RecruitAPI.

## PLAN — My referrals v2 build (Bao 22/10 night: only "Copy link" button; e-mail notifications IN this batch)
Order: BE-1 then BE-2 then FE (local preview for Bao before any FE commit). BE PRs: 2 reviewers + CI, merge = master, promote staging.
- BE-1 recruit-be referralview (contract for FE):
  - Stop masking typed-e-mail referrals (Bao option 3); keep HIDDEN when the typed address is not the caller's current company e-mail. DECISIONS entry (supersedes design 6.3 masking).
  - MyReferralItem adds: onboarding_specialist_name, recruiter_avatar_url, onboarding_specialist_avatar_url,
    current_step (REFERRED|CONTACTED|OFFER_SENT|AGREEMENT_SIGNED|FEE_PAID|HR_FORMS|LICENSING|SETUP_CALL|JOINED = first step not done),
    waiting_on (FRIEND|RECRUITING|HR|LICENSING|ONBOARDING|null), waiting_since (date the previous step finished), bonus_amount (MOSO).
    Update MyReferralItemAllowListTest deliberately.
  - Totals add bonus_on_the_way_amount_sum (eligible/waiting/requested, not paid). Response adds referral_link
    (program member: /join/<slug>; else MOSO domain_url + /loan-officer; null if none).
- BE-2 notifications: per-user preference GET/PUT /api/v1/referrals/notifications (default ON); periodic job compares each
  opted-in referrer's items (current_step, joined, bonus status) with a last-notified snapshot and sends ONE digest e-mail per
  referrer when something changed. Flag referrals.notify.enabled: staging ON (mail only to the staging allowlist), prod OFF
  until Bao (bead agentflow-236t9.14 checklist for prod auto-emails).
- FE recruit-fe my-referrals: desktop table per mockup (1110px, sideways scroll below 1440), mobile = one card per LO with
  vertical steps, money cards, Copy link only, tabs, notification switch. Remove old cards/milestones/footnotes.

## Gap audit 22/10 night (both transcripts re-read) — still open, NOT in tonight's scope (Bao: My referrals only tonight)
- Partly done: My work today for Victoria — 15/10 asked a fixed 5–10 rows per group + "More" (only Nothing scheduled is capped, 25).
- Partly done: 22/10 (d) referrer / CS / LO support of an LO "in the profile / quick view" — not verified that the quick view shows them.
- Not done: HR offboard event listener (onboard exists, offboard not) — overlaps session agentflow-99's HR_ASSOCIATE_DEACTIVE plan.
- Not done: store every field for a future dashboard / AI Assistant reports (needs Phuong's spec; Bao: later).
- Not done: post-hire Loan Officer tracking for LO Support (training done, onboarded, programs, Zoom Phone, Google Business Profile) — needs spec; Bao: later.
- Unclear: 22/10 at 27:21 "cái cột này nhớ chỉnh lại" — transcript garbled; ask Bao/Phuong which column.
- Done earlier: Qualified/Not qualified wording; one program per LO (D268, 16/10).
