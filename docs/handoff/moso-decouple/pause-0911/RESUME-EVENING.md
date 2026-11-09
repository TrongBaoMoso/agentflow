# RESUME POINT: PAUSED 09/11 ~17:20 VN (session 460363a7)

Bao is going home. Resume with `claude --resume 460363a7-f761-459c-8a6f-1df51d1e90fb` from /Users/apple/Projects/agentflow, then `! gcloud auth login --update-adc` (expires about every 4h).

## State
- Independence from MOSO: staging 57% live (measured 12:30); about 80% including dark/shadow code (estimate, not yet re-measured). Prod about 0%.
- Tài (taipham0901) syncs recruit-be prod to the staging tip several times a day. Bao knows and agrees. Every new flag stays OFF/absent in prod.

## Done today (all staging)
- E-sign live through the document-esign built-in path (other session 0fcb4e66 / document-esign-pr-140-review); S9 E2E all 15 steps PASS.
- PDF compare done (artifact GbQaqhsNzYV3grVL4BtJjo). Address fix #946. DE #143 is open for Tuấn/Vinh.
- Referrer rule D437 (referred_lo first); 89→8 mismatches; 170 MOSO-only referrals imported; Referrer review card (fe #733, OFF until Wed).
- BE-12 Recruit referrer identity (#944 #947 #948 #949, SHADOW): 95% agreement. #949 (HR-only "has left" check + all keys) is merged, but its staging deploy was QUEUED at pause (run 42592807288, rerun after the build was stuck). Re-measure after it deploys.
- P5 roster: 53/53 matched; roster shadow 100% equal (#945, D439).
- Webinar drips: copy verified, real 1-month subject (#935), sender rules (#941, #942). OFF until Wed.
- moso-aid #225/#226 merged. The RSVP intake waits for a DevOps secret read.
- Payout CSV parked (#934, #936): Bao chose the accounting route B.

## Khải 09/11 (Slack)
- Payment stays in MOSO for now; Stripe news in 1-2 days. Recruit PayPal stays staging-only, no PayPal LIVE ask.
- Every UI follows tera-docs/design-system. Agent portal-ui-design started restyling lf register-loan-officer; WIP is on its lf branch, see bead agentflow-0gwad.5.5 notes.

## Crons to RE-CREATE on resume (session-only, lost on shutdown)
- Tue 10/11 22:37 VN: give bao.trinh+role-onb its ONBOARDING role back; verify the D404 staff fee-paid mail.
- Wed 11/11 09:17 VN, staging, after the demo:
  1. MOSO-off trial for 24h (P6-INVENTORY §4).
  2. RECRUIT_WEBINAR_SESSIONS=true on lf/lo staging, plus webinar.drip_mail.after_1_month=P1M, then enabled=true.
  3. NEXT_PUBLIC_REFERRER_REVIEW_ENABLED=true in recruit-fe cd-staging.yml.
  4. Consider referrals.source=RECRUIT (~66%) and BE-12 RECRUIT mode, after checking user_service_other_user=0.

## Next on resume
1. Check the #949 staging deploy; have BE-12 re-measure.
2. Resume portal-ui-design (or re-spawn it from its bead note).
3. Waiting on others: packs Deploy Hot Fix (Vinh/Khải); DE #140 and #143 review (Tuấn/Vinh); omni opt-out route and the referral-payout question (Khải); DevOps secret read; ai-hr-be #1343 (Hùng); Tài to confirm users cannot set ref_keys.
