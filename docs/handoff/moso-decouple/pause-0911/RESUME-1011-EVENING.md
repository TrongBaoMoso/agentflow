# RESUME — paused Tue 10/11 17:50 VN (session 460363a7)

Bao shut the machine down. On resume: read this, re-check each line against GitHub/staging, then continue.

## State at pause
- Staging decouple: **36/44 = 82% live** (was 31/44 at 15:00).
  - #963 roster source RECRUIT (BE-28/41) — live, tick same=2 differing=0, 0 suspensions, shadow 53/53.
  - #967 referrer identity RECRUIT (BE-12) + Loan Officer check HR — live.
  - #968 portal MOSO mirror on (BE-08/10) — live. Staging deploy = b7e7e8b6d.
  - Earlier today: #959 D444 NMLS same-person link, #961 auto-run after backfill, #962 202+background, #960 D445 roster company e-mail.
- **#969 moso-off (D414, A1) is OPEN, NOT merged.** MOSO_OFF=false on staging. Deliberately left off through the Victoria Q&A demo 22:00–23:00 VN.
- #964 (`/last` shows lastFailure) has auto-merge armed; it may land on master while paused but is NOT promoted.
- Prod: untouched; every new switch absent/off there.

## Next steps on resume
1. If before 23:00 VN: do not merge #969 until the Victoria demo is over.
2. Merge #969 (update-branch → required checks green → squash) and promote the CURRENT origin/master tip
   (`gh workflow run promote-staging.yml -R LoanFactory-Inc/recruit-be -f sha=<tip>`); verify pod env MOSO_OFF=true.
   Helper: scratchpad `flipstep.sh <pr>` (waits cd-staging, update-branch, checks, merge, promote tip).
3. Smoke pass of main flows (lead→invite→onboarding, referrals + My referrals, webinar sessions, program roster, bonus sweep);
   scan recruit-be logs for calls still going to packs/MOSO/moso-aid, each = gap with file:line.
4. Update P6-INVENTORY §0i with the new %; leave it running Wed 11/11 + Thu 12/11 (Bao 16:40: all switches on staging,
   duplicate mails OK, mail still allowlist-only).
5. NMLS prod check: no message to Tài; after the prod flip read `/nmls-link/last` — expect 5 linked; if fewer, ask Tài then.

## Bao decisions today
- All decouple switches ON on staging now, test through Wed/Thu; prod stays off until Bao says.
- Ambassador applications stay owned by moso-aid; only the "still at LF + company e-mail" check moved to Recruit (user-service).
- Khải omni #688 questions: skip, they don't block Recruit.
