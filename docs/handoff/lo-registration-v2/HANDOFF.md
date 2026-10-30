# LO Registration v2 — HANDOFF

## RESUME POINT — PAUSED 30/10 evening (+07), session 8658d500

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
