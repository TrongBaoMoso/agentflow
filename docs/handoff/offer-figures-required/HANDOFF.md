# Offer requires 3 production figures — HANDOFF (agentflow-fzlut)

Night 05→06/11/2026, unattended (Bao asleep). Target STAGING only; production untouched.

**Artifact (before/after + E2E):** https://claude.ai/artifact/7zKyQTSzAQrihwZPTpFE38

## What shipped (staging)

| Repo | PR | Merged | Staging |
|---|---|---|---|
| recruit-be | #860 (D385) | `ef8aeca5` | helm rev 494, `cd-staging` run 41904342615 |
| recruit-fe | #697 | `0470f5b5` | helm rev 487, `cd-staging` run 41905772295 (promoted at this sha only, not the newer #698 on master) |

Flag: `recruit.features.offer-figures-required` / `RECRUIT_FEATURES_OFFER_FIGURES_REQUIRED` — on in `helm-chart/config/staging/values.yaml`, absent in production (pinned by `OfferFiguresRequiredFlagTest`). FE reads `offer_figures_required` from `GET /config/candidate-view`; absent = old form.

- BE: `OfferServiceImpl#request` → `OfferFigures#require` before anything is written: plain request, manager approve-now (D221) and D64 auto-send all refused with 400 `PRODUCTION_FIGURES_REQUIRED`, `error.bindingArgs.fields` = missing keys (`loans_since_anchor,units12mo,career_production`). Zero is valid. `approve` of an already-pending offer is NOT gated (from now on only).
- BE: HEADHUNTER / TEAM_LEAD may PUT the 3 figures while the flag is on (`CandidateFacadeImpl.SCOPED_OFFER_FIGURE_FIELDS`); referral channel, NMLS, e-mail, self-reported twins stay refused.
- FE: Offer form (dialog + Call workspace inline) adds "Volume (last 12 months)" ($, grouped); all 3 required → per-field error + button locked (approve-now too); program members can edit; still never approve-now.
- Profile tab values prefill the Offer form via the shared `['recruit','candidate',id]` cache (test `WorkspaceOfferSlot.profilePrefill.test.tsx`). Known gap: a form open in ANOTHER browser tab does not refresh.

## E2E on staging — 6/6 PASS
1. Config `offer_figures_required: true`.
2. Recruiter (QA Claudereminder), nothing on file → 3 errors, button locked; API 400 fields = all three.
3. Profile tab 12 / 4 → Offer form prefilled, volume error only; API 400 `career_production`.
4. Volume $1,500,000 on Profile → Log result → Interested → "Yes, prepare offer" → prefilled → Send → offer `7a70ee84…` SENT.
5. Manager approve-now (QA Test Admin, on QA Claudenurture) → "Qualified" disabled, 3 errors; API `approve_now:true` → 400, no offer.
6. Headhunter (Hhlead Testthree2, transferred to HH Test Headhunter for the test) → Profile autosave Saved 40/9/$2.5M, PUT 200; Offer form → Request approval → offer `b621efe1…` SENT.

## Judgment calls
- Feature-flagged (prod promote is all-or-nothing; prod waits for Bao).
- Pending-before-rule offers stay approvable (gate on request only).
- D number D385 (D383/D384 skipped to avoid collisions with other open night sessions).
- `bao.trinh+manager` no longer holds Manager (removed 05/11 for the Victoria demo) → used QA Test Admin; did not restore the role.
- Test data touched on staging: invites sent for QA Claudereminder and Hhlead Testthree2 (owner of Hhlead moved recruiter → HH); figures written on those two leads.

## Left for Bao / prod release
- Prod: FF `production` in both repos (recruit-be + recruit-fe; note other sessions' commits ride along) AND add `RECRUIT_FEATURES_OFFER_FIGURES_REQUIRED: "true"` to recruit-be production values (+ update `OfferFiguresRequiredFlagTest`, which pins prod absent).
- Observation (pre-existing, not changed): for a program member the form always predicts "Request approval", but D64 may auto-send (Headhunter test went SENT).
- `tsc` on recruit-fe master has a pre-existing error in `InviteProgressCard.test.tsx:397` (not from this change).
- recruit-be docs/list comments still say lists don't show volume (D31 wording on Pipeline/Cold/CSV); left as is per "don't rewrite list columns".

## RESUME POINT — PAUSED 05/11 (session 29c4fa84)

Re-measured 05/11 10:08: be #860 / fe #697 merged to master, NOT in `production`; staging config `offer_figures_required: true` (logged in as recruiter); prod values have no flag.

Transcript `docs/transcripts/2026-11-04_production-loan-officer-in-recruiting-app.md` (Phuong, first ~16 min) adds:
- Volume is needed for the Executive / Presidential levels: e.g. 15 loans OR $30M in the last 12 months.
- Flow: Recruiter enters figures -> Victoria (Manager) reviews the table and qualifies -> Support Specialist (= Onboarding Specialist, being renamed; teams merging per Thuan) assigned by level.
- Block at the Qualified click; null not allowed, 0 allowed (matches what shipped).

Gaps found (not built yet, waiting for Bao):
1. Manager review row (Today -> invites to review, `useDecisionTasks.tsx` ~L139) and BE `PendingApprovalQueueResponse.Rule` show only loans since / 12mo, no volume. Proposed: add volume, ship with the same prod release.
2. No level badge / level-based Support Specialist assignment; needs exact thresholds from Phuong.
3. Recruiter-entered figures + volume are not written back to MOSO/packs (`PacksWritebackPayloadResolver` only writes units12mo when source = MODEX). Matters only if the specialist is assigned in MOSO — ask Phuong/Thuan.

Waiting for Bao: (a) prod go-ahead, (b) do gap 1 now?, (c) ask Phuong about thresholds + where assignment happens, (d) Headhunter button label "Request approval" vs auto-send, (e) restore Manager role on bao.trinh+manager?
