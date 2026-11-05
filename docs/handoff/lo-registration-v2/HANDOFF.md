# LO Registration v2 — HANDOFF

## RESUME POINT — PAUSED 05/11 ~02:00 (session 8658d500)

Nothing running. All work below is pushed.

**Done 05/11**
- Mockup v19 (https://claude.ai/artifact/92Yarua4tCB9TwhQontgn7): tech literacy = last section (7) of Step 4; waiver chips removed; hero style A locked. Brayan signed off ("everything seems good"). PLAN.md §9 has every decision.
- CT/NY/VI dropped from the states-to-sponsor pickers: LIVE on PRODUCTION (lf #2700 -> `production`, lo #931 -> `produciton-v2`, cherry-pick only), verified on www.loanfactory.com + www.suongloanofficer.com (use www; apex lands on the home page in headless Chrome).
- Mississippi may choose 1099 (Licenses "Both"): on STAGING (lf #2701, lo #932), verified on www.viet18.com (MS editable, SC control still W-2).
- Bao skipped: NC/KY exclusivity question, RI supervisory-distance copy.

**Waiting on Bao**
1. MS 1099 to production? If yes: cherry-pick lf 73e8c48b onto `production`, lo 10894b343 onto `produciton-v2` (do NOT merge master: lf has ~37, lo ~120 unreleased commits), PR, merge, verify like the CT/NY/VI check (scratchpad scripts are temporary; re-create from this note).
2. Start coding the /join v2 form? First deliver a plan + time estimate, no code before Bao says go.
3. Still unanswered from 30/10: D268/D269 staging flags; close tdqcv/zo816/tax65/lr5an; wcwfu + lm8sc.

**Notes**
- gcloud auth expired on 05/11 night (Bao: `gcloud auth login` + `gcloud auth login --update-adc` if needed). Prod deploy was confirmed by the page buildId changing instead.
- Worktrees: lf/lo-homepage-worktrees/{sponsor-prod,ms-1099} are merged and can be removed.

## RESUME POINT — PAUSED 04/11 evening (+07), session 8658d500

**Done 04/11**
- Read the New Landing Page chat + Victoria's feedback doc (Google Doc 1hlnCe8dANHZBWKa4Op02nxBZwZi2Zm5DvRlDaYVTDGs,
  Brayan's notes inside). Victoria: 3 two-hour windows OK; special requests approved by the Recruiting Manager
  (Victoria → Benjamin). Hero A/B not answered.
- Bao GO → mockup updated (artifact 92Yarua4tCB9TwhQontgn7 version 16, source `mockup/join-flow.html`) + PLAN.md §9,
  commit 56b73a6 pushed. §9 also holds the state-rule audit vs the Licenses settings page (CT/NY/VI in STATES,
  MS forced W-2, NC/KY missing from exclusivity groups, RI missing from distance list).
- Group reply drafted (EN + VI) in the chat, NOT sent yet — item 7 must be rewritten (see below).

**Open question to Bao (asked, no answer yet): when can the Loan Officer change W-2/1099?**
Measured on latest code 04/11:
- OB picks W-2/1099 at Mark done in Recruit (OnboardingHireMeetingModal, prefilled from lo_type, MOSO value as hint);
  write-back sets `is_corporate_loan_officer` + `pre_onboarding_done`.
- packs `RegisterInterestedLoanOfficer.protectMeetingClassification` (also on prod 3.64.1) silently drops any public-form
  change after the meeting; lf `getLockedLoanOfficerType` shows it read-only.
- Agreement docs follow the stored value (`computeRequiredDocs`: W-2 or 1099 agreement, + Exclusive Agent for 1099 in
  VA/MS, + CA compliance when CA without DRE). A staff change while unsigned rebuilds the envelope (`force_regenerate`, prod too).
- packs builds 1099 + Exclusive Agent for MS → MS allows 1099; lf/lo forcing MS to W-2 is outdated.
- Mockup v16 lets the Loan Officer change it in Step 4 (after the call) → conflicts with the packs guard.
- **Proposal waiting for Bao:** move employment type to Step 2 (before the 1-1), prefilled by state, editable except
  W-2-required states; OB confirms at Mark done (unchanged); Step 4 + Review read-only "Confirmed on your call".
  If OK: edit mockup + republish same URL, update PLAN §9 item 9, rewrite group message item 7 to:
  "Employment type is now on Step 2, prefilled from the states. The Loan Officer can change it (except in states that
  require W-2), and our onboarding specialist confirms it on the 1-1 call."

**Next on resume**
1. Get Bao's answer on the W-2/1099 proposal → apply.
2. Give Bao the final group message (EN + VI, no horizontal rules) to send himself.
3. Still unanswered from 30/10: turn on D268/D269 staging flags? close tdqcv/zo816/tax65/lr5an? do wcwfu + lm8sc?
4. No code until Bao says go.

## (SUPERSEDED) RESUME POINT — PAUSED 30/10 evening (+07), session 8658d500

Resume: `claude --resume 8658d500-15e8-4830-b017-aaec2ebd2e74`, or a new session that reads this section + PLAN.md §7–§8.

### Done 30/10
- Read "New Landing Page" chat 29/10 + meeting transcript `docs/transcripts/lf-homepage/2026-10-29_register-loan-officer-new-flow-victoria-pham.md`.
- Decisions written to `PLAN.md` §7 (Victoria meeting: 2 paths at Step 3, pay/sign gated by `pre_onboarding_done`,
  3 two-hour windows instead of free-busy booking, first-missing-step rule, review screen instead of attestation email,
  name lock, special requests, measured lead sources, brand gaps) and §8 (all mockup decisions). Commits f11286f, 678beec.
- Full-flow interactive mockup: claude.ai artifact https://claude.ai/artifact/92Yarua4tCB9TwhQontgn7 (org-shared);
  source copy in `mockup/join-flow.html` (edit it, then republish to the same artifact URL).
- Bead agentflow-oxwsb created = Recruit side of Thuan's special-requests ticket.
- Measured MOSO prod 30/10 (24,601 inbound leads): staff-created 35% / webinar 28% / register form 24% / Refer page 12%
  of joins (12 mo); register form joins at 60%. Raw rows deleted.
- Review message for the group drafted in English (with Vietnamese translation) — Bao sends it himself, adds a
  screenshot of Thuan's ticket under "New: Special requests". Design note says colours follow Brand Guidelines because
  Thuan asked in the 30/10 morning meeting.

### Waiting on
- Bao to send the review message; replies from Victoria (3 two-hour windows OK? who approves special requests?),
  Matt (layout/brand), Benjamin.
- Thuan/Bao: who approves special requests; how Licensing sees them (role removed D315) — bead oxwsb.

### Next on resume
1. Ask Bao for the group's replies; update mockup (`mockup/join-flow.html` → republish) and PLAN.md.
2. When Bao says go: Phase 1 code (lf + lo form at `/join`, 5 locales), Phase 2 recruit-be/fe (time windows on the lead,
   confirm-time → Google Calendar + Meet, skipped-call badge, special requests), packs fields (special requests +
   disclaimer ack). Make first/last name editable on keyed links (FE only); keep email locked.
3. Re-fetch all repos before coding.

### recruit-be prod release (30/10 evening)
Session a8ef2df9 asked to fast-forward recruit-be staging→production (bd agentflow-9syty, includes our be #772
V299–V301). Replied GO with conditions: prod pre-check no `referral.program%` settings rows; after deploy Flyway
299–301 success, all 3 flags false, 0 rows in candidate_referral_program / candidate_program_qualification after ~10 min,
no ReferralProgramCatchUp errors; flags stay OFF on prod.
**DONE 30/10 ~16:07 UTC, all checks PASS** (a8ef2df9 report; re-verified here: 03a162f1 ancestor of origin/production
65b464f8, 2 prod pods Running 0 restarts). D268/D269 BE is now on prod, dark. bd 9syty closed.

### Unrelated items from the 30/10 morning audit still unanswered by Bao
- Turn on the 3 D268/D269 staging flags and measure (DESIGN.md lo-recruiter-program-credit)?
- Close done-but-open beads tdqcv, zo816, tax65, lr5an?
- Do wcwfu (remove GetOp fallback in lf `getRegisterLOProcessInfo`, now unblocked) + lm8sc polish?

---

## (SUPERSEDED) paused 28/10 evening

Session 8658d500. Bao paused to go home; resume with `claude --resume` (this session) or a new session + this file.

## State
- PLAN: `PLAN.md` in this folder (Matt's wireframes + handoff.pdf alongside). Section 6 = Bao's decisions 28/10:
  URL map (form at `/join`, recruiter landing `/join/<slug>` → `/recruit/<slug>`, old `/recruit/<slug>` removed,
  lo `/<site>/join` landing → `/<site>/recruit`, form on `/<site>/join`, `/register-loan-officer` kept; no redirects,
  measured 0 real leads) and booking rules (claim model kept; claim deadline = min(SLA, booked time − 30 min);
  reminder 15 min before; CALL_NO_RESULT after; Calendly dropped).
- NOT confirmed by Bao yet: the referral typeahead handling (proposal: locked when arriving via a link, otherwise
  "claimed" referrer confirmed in Recruit — 07/09 rule kept). Bao only asked "is this Matt's proposal?" (yes).
- Message to Matt drafted in chat 28/10 (Bao sends it himself) — see "Message to Matt" below.
- Waiting on: Victoria to confirm the new form (Phuong asked 28/10 14:22 in "New Landing Page"); Matt's placeholders.
- No code written for v2. Nothing running (dev servers stopped, RAM released).

## Done earlier the same day (production)
Victoria's answers on `/loan-officer-old` live on lf (#2683, #2684, promote #2685 → rev lf-homepage-00754-vpb) and
lo (#918–#922, #920 → produciton-v2 → rev lo-homepage-v2-00291-zn7). Memory: feedback_lo_old_vic_answers_prod_2810.

## Next steps on resume
1. Ask Bao: did Matt/Vic reply? Is the referral typeahead proposal OK?
2. When Bao says go: Phase 1 (form + URL moves, lf + lo, 5 locales), Phase 2 (Recruit: booking on recruiters'
   Google Calendars, booked badge, claim deadline, reminders), Phase 3 (NMLS prefill, LO name search, restrict getAdmins).
3. Before coding: re-fetch all repos; the lo `/join` landing is already on lo origin/master (another session pushed the
   join-page work) — check `docs/handoff/lo-join-page/HANDOFF.md` vs reality.

## Message to Matt (as drafted)
See the chat of 28/10 evening; summary: URL map, intro call is the recruiter's (not onboarding), referral question
handling, own Google Calendar scheduler instead of Calendly, placeholders to fill.
