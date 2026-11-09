# RESUME POINT: PAUSED 09/11 ~08:10 VN (session 460363a7)

Bao shut the machine down to go to the office. Resume with `claude --resume 460363a7-f761-459c-8a6f-1df51d1e90fb` from /Users/apple/Projects/agentflow.

## Goal
Bao (08/11): "dồn hết nguồn lực" so that Recruit is fully independent of old MOSO. Everything goes to STAGING. Prod code ships dark: every new flag stays OFF or absent in prod, and Bao flips prod in one go after testing.

## Measured independence (P6-INVENTORY.md, 09/11 ~02:00)
- Staging live: 19/44 = 43%. Counting dark code: 32/44 = 73%. Prod: about 0%.
- 12 blockers remain: BE-12 referrer identity/domain (P6 agent), moso-aid BE-14/28/41, and the 8 bridges (draft #923).

## Agents at pause (teammates; resume each with SendMessage "Resume: continue where you stopped")
- p6-moso-off-switch: BE-12; FE agreement line; draft #923 (keeps the 4 prod-ON behaviours, D432/D428). Sub-agent a2414c2899950b256 (the #923 author).
- p5-lo-data: monthly referral payout CSV (read-only), dark omni/ai-donotcall push clients. P5 final report is in P5-PLAN.md.
- p3-intake-finish: #924 webinar drips (D431, V355). Its copy is NOT verified against MOSO prod templates; verify after gcloud login.
- p4-s4s5-esign: MOSO-only referral import (DRY_RUN) and diagnosis SQL for 89 referrer mismatches / 175 packs-only rows.
- p4-s8-hr: S9 E2E script done (docs/handoff/moso-decouple/p4-s9-e2e/). The full DB run waits for gcloud.
- Closed/idle: p4-s6-rest, p4-s6-invite-link, paypal-*, packs-3832-overnight.
- If teammates are gone after the restart, spawn fresh agents with briefs built from the bead notes + this file + AGENT-RULES.txt.

## Session-only crons (lost on shutdown; RE-CREATE on resume)
- Tue 10/11 22:37 VN: give bao.trinh+role-onb its ONBOARDING role back on staging; verify the D404 staff fee-paid mail.
- Wed 11/11 09:17 VN: MOSO-off staging trial, 24h (P6-INVENTORY.md §4 runbook). Also turn RECRUIT_WEBINAR_SESSIONS=true back on for staging lf/lo.

## First steps on resume
1. `! gcloud auth login --update-adc` (Bao). Expires about every 4h.
2. Set the staging lf env: RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS='bao.trinh+p3only-s9*@loanfactory.com' (--update-env-vars). Then run the S9 full run.
3. Diagnose the referral 89/175 in the DB, and verify the #924 drip copy against the MOSO templates.
4. Send Bao the morning report (MORNING-INPUTS.md): the % figure, the Khai message, the decision list in plain words.

## Number ledger
NUMBER-LEDGER.txt. Reserve D/V numbers there first. The live copy was in the session scratchpad; this is a snapshot.

## Late additions at pause
- p5-lo-data: recruit-be #932 (monthly referral payout CSV, read-only) and #933 (dark blacklist push) were in CI with auto-merge armed. GitHub may merge them while the machine is off. On resume: promote to staging and verify. The omni API ask for Khai is in P5-PLAN.md.
- p4-s4s5-esign: the referral import (#928/#931) DRY_RUN is done. The diagnosis script is docs/handoff/moso-decouple/referral-diagnose/diagnose.sh, and it needs gcloud.
