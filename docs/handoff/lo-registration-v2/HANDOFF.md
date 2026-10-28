# LO Registration v2 — HANDOFF (paused 28/10 evening)

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
