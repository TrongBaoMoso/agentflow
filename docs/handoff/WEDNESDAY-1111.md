# Wednesday 11/11/2026: what to do (MOSO-decouple, STAGING only)

Written 09/11 evening by session 460363a7. When Bao opens any session on 11/11 and asks "hôm nay làm gì", read this file, **measure each item again**, then do it. Every step is STAGING only. In PROD every new flag stays OFF/absent (Tài syncs prod to the staging tip; see memory feedback_tai_pushes_prod_0911).

Reason these waited: the Victoria team demo ran on staging Tue 10/11 22:00-23:00 VN. Do these after it.

## A. Switch on (approved by Bao 08-09/11)
1. **MOSO-off trial, 24h.** Set `recruit.features.moso-off=true` on staging per `docs/handoff/moso-decouple/P6-INVENTORY.md` §4 runbook.
   - Take the baseline first.
   - Then watch error logs and `GET /api/v1/admin/moso-off` skip counts.
   - Revert if a core flow breaks.
   - E-sign stays OK: it runs through document-esign now.
2. **Webinar on Recruit.**
   - Set `RECRUIT_WEBINAR_SESSIONS=true` on Cloud Run `lf-homepage-master` and `lo-homepage-master` (`--update-env-vars` ONLY).
   - On recruit-be staging, set `webinar.drip_mail.after_1_month=P1M`, then `webinar.drip_mail.enabled=true`.
   - Details: `docs/handoff/moso-decouple/p3-intake-staging/DRIPS.md`.
   - Sender rule (Bao 09/11): the owning recruiter; no owner or owner left -> recruiting@.
3. **Referrer review card.** Set `NEXT_PUBLIC_REFERRER_REVIEW_ENABLED=true` in recruit-fe `.github/workflows/cd-staging.yml`, merge, let staging redeploy, then check the admin Referrals page.
4. **Referral list from Recruit.** Set `referrals.source=RECRUIT` on staging. Check the SHADOW gauges first; this moves independence to about 66%.
5. **BE-12 referrer identity RECRUIT mode.**
   - Set `RECRUIT_REFERRALS_REFERRER_IDENTITY_SOURCE=RECRUIT` in the staging values.
   - Check `user_service_other_user=0` first.
   - Visible effect: one person gains 5 referrals from a second key, and people MOSO calls inactive but HR keeps get linked at first login.
   - The 2 people HR says have left (packs still links them): show Bao their names before or right after.
6. ~~Portal redesign~~ CANCELLED 10/11 by Bao: lf-homepage and lo-homepage landing pages (incl. /register-loan-officer) keep their current UI. lf #2739 closed.

## B. Follow-ups / checks
- Tue night (or Wed morning if missed): give `bao.trinh+role-onb` its ONBOARDING role back, then check that a delivered staff "Startup Fee Payment Confirmation" mail (D404) arrives (S9 script `docs/handoff/moso-decouple/p4-s9-e2e/s9-e2e.js`).
- Re-measure P6-INVENTORY independence after A1-A5 and report the %.
- LO Recruiter Program: after about 1 week of matching roster counts (from 09/11), move approvals into Recruit (Bao approved the 3-step plan).
- Referral bonus amount: check `docs/handoff/moso-decouple/referral-diagnose/BONUS-AMOUNT.md`. MOSO pays mostly $200, some $500. Ask Bao which rule Recruit keeps.

## C. Waiting on others (re-measure before nudging)
- omni opt-out push route (our PR, staging): Khải answers the 3 design defaults and releases prod.
- Referral payout via accounting: the accounting-be team (truongdoan / travis) adds an internal payout route.
- user-service company_email fix (our PR): Tài confirms or deploys prod; 2 questions in the PR.
- packs Facebook fix (+ moso web.xml): staging only; prod via Vinh/Khải Hot Fix. Bao 09/11: do NOT rotate the Meta secret ("kệ đi, ko cần đổi").
- ai-hr-be #1343 + #1369 (HR files the Recruit-signed agreement): DONE on staging 10/11, morning checklist all pass (session 0fcb4e66 closed). Before prod (owners, not urgent): DE #147 HRIS read grant in prod config, use_inkless on prod DE, recruit prod flag `RECRUIT_FEATURES_HR_HANDOFF_AGREEMENT_FIELDS`. Bao 10/11: no FYI to Hùng/Tuấn/Vinh needed. recruit-be #864 item 4 (org log sink) stays open for Khải, does not block anything.
- Known issue for the portal redesign session (`design/lo-portal-tera`): the first "Ký" on the Recruit portal can show 503 because the DE send takes 9.5-12.5 s, longer than the lf-homepage proxy waits. Fix the proxy timeout in that pass.
- Stripe for the LO fee: Khải announces it. Until then payment stays in MOSO and Recruit PayPal stays staging-only.

## Pointers
- Latest resume doc: `docs/handoff/moso-decouple/pause-0911/RESUME-EVENING.md`
- Number ledger: `docs/handoff/moso-decouple/pause-0911/NUMBER-LEDGER.txt`
- Agent rules: `docs/handoff/moso-decouple/pause-0911/AGENT-RULES.txt`
