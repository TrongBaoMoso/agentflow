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

## Bao's answers on the gap list (23/10 ~00:30)
- My work today 5–10 rows per group + More: DECLINED.
- Post-hire Loan Officer tracking for LO Support: DECLINED.
- HR offboard event: DO IT tonight (agent started; candidate side only — left_company_at + timeline entry, flag hr.offboard.enabled staging ON / prod OFF; role removal stays with session agentflow-99's P4).
- Quick view "who referred / who takes care (CS)": explained to Bao; not started.
- "Store every field for a dashboard": explained to Bao; offered to draft report questions + missing-field list — awaiting answer.

## Night 23/10 progress log
- BE-1: recruit-be #718 (D309). packs #3735 (domain_url in referrers/resolve) — PR only, for Khai.
- FE: recruit-fe #565 (My referrals v2), built against the plan; contract matches #718.
- Security review of #718: approve. For Bao (product, not blockers): a referrer who TYPED their own e-mail for an LO now sees that
  LO's full step position, recruiter + onboarding specialist NAMES, licensed-state codes and bonus amounts (F2/F3); self-declared
  rows are opened too, not only typed-e-mail rows (F1) — consistent with Bao's "show immediately" choice. Fixes F4 (no e-mail in
  logs), F5 (link lookup never breaks /mine), F6 (domain_url https only), F8 (join base URL per environment) requested before merge.
- Avatars: null for now (staff avatars only in central user-svc behind the caller's own token) — needs a source decision.
- Quick view "who takes care (CS)": "Referred by" already shown; recruit stores no CS person. Proposed to skip until Phuong defines CS.

- 23/10 Bao: drop the "CS / who takes care" item for the quick view — Phuong had the wrong context. Closed.

- 23/10 night, Bao: "every LO has <site>/join" (decision 16/10, docs/handoff/lo-join-page, recruit-be Q63). Measured: that lo-homepage
  page exists only as 3 LOCAL commits in _worktrees/lo-join-page (3e2c49081, 68714c087, c890937fb) — never pushed/PR'd/deployed,
  pending Victoria+Matt and 2 open questions (editor location, empty-bio). So <site>/join is 404 today. Tonight #718 keeps
  <site>/loan-officer (works, attribution live since 06/10) and /join/<slug> only for dedicated headhunters. ASK BAO: (1) switch
  My referrals to <site>/join once the page ships and resume the lo-join-page work, or (2) keep /loan-officer until it is agreed.

- 23/10 night, Bao chose (a): ship the LO site /join page (agent started: moso-aid -> lo-homepage -> lf redirect, STAGING only,
  2 reviewers + Repo Owner each) and switch My referrals referral_link to <site>/join once live. Editor stays in lo /lo-setting
  (Bao accepted: no real login there, ?loKey=). Empty bio hidden.
- Night decision (mine, reversible, to report to Bao): My referrals shows ALL-TIME referrals and money (the BE default window is
  Jan 1 this year; FE sends an early since). Day counts use the business timezone.

## 23/10 early morning — state (STAGING only, nothing on production)
- recruit-be #718 (D312) is on STAGING (deploy of 15d08ff1 succeeded). `/referrals/mine` returns current_step, waiting_on,
  waiting_since, bonus_amount, onboarding_specialist_name and referral_link (verified with the HH token).
- recruit-fe #565: 2 reviewers approved, CI green. Checked locally against staging at 1440/1280/390: no sideways scroll and no
  page errors. Auto-merge is on, and a background loop keeps the branch updated and promotes staging after the merge.
  The "Email me" switch stays hidden until #725 is on staging (its endpoint returns 404 today).
- recruit-be #725 (change e-mails, V272, D317): both reviewers' findings fixed at 5f39dde6, CI green, re-review running.
  Staging cron needs secret `RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY` (Secret Manager + recruit-svc-secret); production is dark.
- LO /join page: moso-aid #194 and lo-homepage #910 are on STAGING (e.g. https://www.viet18.com/mama1/join). lf-homepage #2674
  (redirect) is ON HOLD.
- DECISION NEEDED from Bao, from the #2674 Repo Owner review: credit for sign-ups via the LO site.
  - The site `/join` and register pages always send `referred_source=loan_officer`, so LO Recruiter Program members would lose
    recruiter credit.
  - Option (a): build "program follows the link owner" (D268/D269) in Recruit first.
  - Option (b): the site sends recruiter credit when the owner is a program member.
- My referrals `referral_link` NOT yet switched to `<site>/join`, because production has no /join page yet. The URL format to use
  later: `https://www.loanfactory.com/<url>/join`, or `<domain_url>/join` when the Loan Officer has their own domain.
- #723 (HR offboard): waits for #717 and #716 to merge. DevOps must create `HR_ASSOCIATE_DEACTIVE_SUBSCRIBE_RECRUIT_STAGING`.

## 23/10 ~05:45 — My referrals v2 is fully on STAGING
- recruit-fe #565 merged as f7a60d84 and deployed to staging.
- recruit-be #725 (change e-mails, V272, D317) merged as 2cbd42da and deployed to staging. 2 reviewers approved; their
  follow-ups are fixed:
  - snapshot age limit 72 h, never less than 3 rotations, with a WARN when more than 5% of a pass is re-seeded;
  - names that look like web addresses are neutralised;
  - opt-out works for Headhunter and Team Lead users;
  - fixed the race when the switch is flipped during a pass.
- Checked on staging with the HH token: GET `/referrals/notifications` returns `{enabled:true}`; PUT false, then true, works;
  an empty body returns 400.
- STILL NEEDED before staging sends e-mails: create secret `RECRUIT_REFERRALS_NOTIFY_INTERNAL_API_KEY` (Secret Manager +
  recruit-svc-secret, see BOOTSTRAP.md). Until then no cron is registered and nothing is mailed. Staging recipients are allowed
  only for `bao.trinh+*@loanfactory.com`.
- Production: nothing deployed, and the flag is absent there. The go-live list is in bead agentflow-236t9.14.

## RESUME POINT (pause 23/10 morning: Bao shutting down to go to the office)
No background agents, dev servers or pending merges are running. Everything is pushed, and nothing is on production.
Next steps, in order:
1. Ask Bao for their answers to the open items in the previous section:
   - #2674 credit, option a or b;
   - who creates the staging cron secret;
   - the self-decided items (all-time window, business timezone, avatar source, typed-e-mail exposure).
2. If (b): lo-homepage `/join` and `register-loan-officer` send recruiter credit when the site owner is a LO Recruiter Program
   member. Then merge lf #2674, staging only.
3. After the cron secret exists on staging: wait for one hourly tick (minute 20), change a test referral's step, and confirm a
   digest reaches bao.trinh+hh@loanfactory.com.
4. When production gets /join: follow-up recruit-be PR to switch `referral_link` to `https://www.loanfactory.com/<url>/join`
   (or `<domain_url>/join`).
5. #723: merge after #716 (V269), check V-number order (#726 holds V273), then ask DevOps for the subscription.
Staging tokens for previews: node scratch script hhtok.js equivalent = docs/handoff/recruit-e2e-lab/scripts/auth.js login
(write `~/.cache/claude-recruit/preview/stg_<port>.token`, 3390 = bao.trinh+hh, 3370 = chauchau).

## 23/10 resumed (Bao back) — answers and actions
Bao's answers:
- #2674 credit: (b). The site's /join and register pages send recruiter credit when the owner is an LO Recruiter Program member.
  An agent is building it (lo-homepage, maybe moso-aid), then merging lf #2674 to staging.
- Staging cron secret: done by me.
  - Secret Manager `recruit-be-recruit-referrals-notify-internal-api-key` (lenderrate-master, v1) created and patched into
    `recruit-svc-secret`; the recruit-be staging deployment was restarted.
  - Bao's account can add versions but cannot read the value back.
  - Cron `recruit-referral-change-emails-tick` (minute 20 hourly) is registered.
  - First tick 02:20 UTC: referrers=22, seeded=22, failed=0. Digests go out from the next change onward, to bao.trinh+* only.
- Kept: the all-time window, the business timezone, typed-e-mail visibility. Avatars: use central user-svc.
- New request: on My referrals, add a date-range filter plus the standard list kit from #566 (search, filters, sort, paging,
  Reset, Refresh, saved filters, row count, URL state, Table/Cards). An agent is building it together with the avatars.
- #723: master is at V273 now, so an agent is rebasing it and renumbering V270 to the next free version.

## 23/10 midday
- recruit-be #723 (HR offboard): rebased, migration V270 renamed to V276, D311 kept. Merged as 479237d1 and deployed to
  STAGING. It stays dark until DevOps creates the subscription.
- Draft for Bao to send to DevOps/Khải (NOT sent):
  > Anh ơi, em cần 1 subscription Pub/Sub trên staging (lenderrate-master) cho recruit-be:
  > `HR_ASSOCIATE_DEACTIVE_SUBSCRIBE_RECRUIT_STAGING` trên topic HR_ASSOCIATE_DEACTIVE, kèm DLQ + `.monitor`,
  > và quyền subscriber cho SA runtime của recruit-be staging (giống HR_ASSOCIATE_ONBOARD_SUBSCRIBE_RECRUIT_STAGING).
  > Thêm 1 câu hỏi cho Tài: khi 1 người còn employment khác ở LF thì HR có gửi sự kiện DEACTIVE không?
- After it exists: set `RECRUIT_HR_OFFBOARD_SUBSCRIPTION` in the staging helm values, then add a row to
  docs/secrets/SECRETS-INVENTORY.md.
- In progress:
  - /join recruiter credit on every page of an approved member's site: moso-aid #195 and lo-homepage #911, fix round.
  - My referrals list kit: recruit-be #729, then a recruit-fe PR.

## 23/10 afternoon — My referrals list kit on STAGING
- recruit-be #729 (D321, no migration) merged as a45509c7. `/referrals/mine` now takes q, to, current_step, waiting_on, sort
  and dir, all applied before paging.
- recruit-fe #573 merged as 0ed780ff. It adds the list standard: search, date-range pill, Step and Waiting-on filters, Sort,
  row count, saved views (`MY_REFERRALS`), Table|Cards, Refresh, Reset, state in the URL. Staff avatars come from user-svc
  `/users/search` with the caller's token, falling back to initials.
- Both are on STAGING. Screenshots are in `shots-list-kit/`. My referrals stays all-time by default; the Admin page keeps "this year".
- Choices for Bao to review:
  - `to` is applied after the packs fetch (packs takes only `since`).
  - The date range also narrows the money cards and the tab counts.
  - Saved views are hidden for viewers without CANDIDATE_READ.
  - The toolbar is the full kit on phones too.
- Process notes:
  - The agent ran its reviewers as headless `claude -p` runs: 2 per PR, all approved.
  - One jest/tsc run happened after a ram-gate denial (exit code not checked).
- /join recruiter credit: moso-aid #195 and lo-homepage #911 are approved by all 3 reviewers. The agent is merging to staging,
  then running live verification, then taking lf #2674 off hold.
- Open for Bao: should packs record recruiter credit in MOSO for approved members without the HR recruiter flag?
  Today MOSO records them as `loan_officer`, while Recruit counts them as program leads.

## 23/10 afternoon — /join recruiter credit on STAGING (Bao: every page of an approved member's site)
- moso-aid #195 merged as 3cb32a51 (Cloud Run moso-aid-00185-q2g). `recruiter_slug` goes to /join page holders, or to an
  approved lo_recruiter whatever LO_RECRUITER_PAGE_REQUIRES_APPROVAL says (staging true, prod unset). The lookup is a single
  findOne.
- lo-homepage #911 merged as ad53c7d7 (lo-homepage-master-00372-spf).
  - Pages covered: /join, register (+ -v1), /loan-officer GetInTouch, /loan-officer-old.
  - Credit is sent on create only. A visitor's ?ref= is kept.
  - Lookup: retries at 2s then 1s, logs `join-overlay-failed`, falls back to loan_officer.
- Live check on mama1 (approved member):
  - /join, /loan-officer and register all reached recruit as recruiter, with JOIN_SLUG / RECRUIT_SLUG, and referred_by =
    the owner.
  - Mindie (a plain Loan Officer) still reached recruit as loan_officer.
  - Test leads: bao.trinh+cjm1, cjl1, crm4, crm5, cjp1, cpl1, cpr1, cpr2.
- Anomalies seen:
  - One `join-overlay-failed reason=TimeoutError`, from a cold moso-aid; it fell back as designed.
  - The register attempt `crm3` returned 200 but never reached recruit. crm4 and crm5 did arrive. Suspected dedupe on the
    random NMLS or phone; not confirmed.
- lf #2674 (redirect from lf /join/<slug> to the Loan Officer's site): security approved. Correctness and Repo Owner reviews
  were cut off by the usage limit and have been resumed. Merge it to master (staging) once all three approve.
- Open for Bao:
  - Should packs record recruiter credit in MOSO for approved members without the HR flag?
  - Rate limit on /api/join-page (follow-up).
