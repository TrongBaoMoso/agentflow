# Phương's 22/10 recruit feedback — HANDOFF (paused 22/10 evening, Bao going home)

Session: da43ac56-60ea-4ce0-8af1-2972ee58cfc7. Read this file top to bottom before doing anything.

## Sources
- Meeting 22/10 transcript: `docs/transcripts/2026-10-22_phuong-nguyen_feedback-recruit-app-demo.md`
- Meeting 15/10 with chị Phương (menu, My today, tracking…): **misfiled** at
  `docs/transcripts/lf-homepage/2026-10-15_summary-the-register-loan-officer-form.md` (name says "register form",
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
