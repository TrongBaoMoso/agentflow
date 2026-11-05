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

## FOLLOW-UP 06/11 00:15 — manager review row shows volume (gap 1 above, Bao approved 05/11 18:40)

| Repo | PR | Merged | Staging |
|---|---|---|---|
| recruit-be | #868 | `ac4beed9` | promote-staging run 42069051730, `cd-staging` 42069119031, helm rev 504 — promoted alone (nothing else unpromoted at the time) |
| recruit-fe | #709 | `448c4cad` | promote-staging run 42071571963, `cd-staging` 42071611856, helm rev 496 — promoted alone (#708 was already on staging) |

- BE: `PendingApprovalQueueResponse.Rule` gains `career_production` (BigDecimal, null when never filled, never 0) from `CandidateEntity.careerProduction`; `Rule.from(explanation, careerProduction)`. Display only — the rule does not judge volume. Not flagged (additive field). Tests: `PendingApprovalQueueRuleJsonTest` (new), `OfferServiceImplPendingApprovalTest#ruleCarriesVolume`, `PendingApprovalQueueIT` asserts the key (CI green).
- FE: Today invites-to-review row + Focus card (same node, `useDecisionTasks.tsx`) add a third Production line "Volume (12 months)" / vi "Doanh số (12 tháng)" = `$` + next-intl number (grouped), uncoloured; muted "—" when null/absent (older BE). The value wraps under its label (column floor 112px) — checked at 1440 and 1920. No level badge, no thresholds (by design).
- Other approval surfaces checked: Exceptions ApprovalQueueSection, /invites, bell/notification texts do NOT show the two loan figures → nothing added there. InviteModal (the request form) already had volume from #697.
- Staging evidence (QA Test Admin = bao.trinh+admin): API `rule.career_production` = 900000 for Blake/Skyler Demo, null for others; UI shows "$900,000" / "—". No test data created or changed (8 pending invites already existed). Before/after in the artifact (Version 2): https://claude.ai/artifact/7zKyQTSzAQrihwZPTpFE38

### Rides along in the next prod FF (origin/production..origin/staging, measured 06/11 00:15)
recruit-be (17): #869 20f99f3f7 (vk8qv / recruit-be #864 items 1-2, agentflow-19) · #868 ac4beed9c (fzlut, this) · #867 1c761addc (d2uzb) · #865 877765ffd (ub7zs) · #866 3a93a3ae1 (6o9sa.1, staging-only values) · #840 7af1fbd65 (D364 Connect Zoom, staging values) · #850 cfef17df0 (D381) · #859 01f269a31 (D383) · #861 0b59ec877 (0gwad.4.9, V328) · #862 5b5d6996c (0gwad.2, D384) · #863 0b1b189b2 (3mjma, D388) · #860 ef8aeca54 (fzlut, D385, flag absent in prod) · #830 e1e54de82 (D374) · #841 2e8329ef7 (b4hpa.2, D379, V324 — HOLD, see memory: no own flag) · #842 5e591884a (b4hpa.5, D378) · #858 23543787a (0gwad.5.3) · #853 6c36668b8 (0gwad.2, D382).
recruit-fe (32): #709 448c4cad (fzlut, this) · #708 df8f7656, #706 f65e583f, #705 601d0a34 (ub7zs) · #707 f61c5afd (wjutn) · #703 9777095b (xqqz6) · #702 9c807129 (ugh3x) · #701 ec2139b5 (mph70) · #700 3bafde30, #699 653e5a57, #695 f8cd6727 (0gwad.2) · #696 94dc5255 (D369) · #698 595a2701 (3mjma) · #697 0470f5b5 (fzlut) · #694 27d37c66 (b4hpa.2) · #693 55539ff4 (b4hpa.5) · #692 ba33e8fa (b4hpa.3) · #691 3e405a8a (4r8je) · #690 4a034b98 (7z536) · #689 7603f2e8 (0gwad.5.2) · #688 5619e873 (D374) · #686 dbbeabbb, #685 0ca22e44 (0gwad.4.6) · #687 d324fe9f, #684 12596b98, #681 48df1d8f, #678 8a9653e0 (bd9mc) · #683 25d6aa55 (t39dn) · #682 9fe927b0 (0gwad.10) · #680 8b6e3e07 (conversations) · #675 536fae6e (webinar B3) · #679 67145339 (z6f8l).
Prod still waits for Bao. #868/#709 are safe to ship with or without the D385 flag (read-only display).

## PROD PLAN — Bao 06/11: ride the NEXT shared prod release (no separate push)
Separate release is not possible: cherry-picking #860/#868 onto `production` conflicts (CandidateViewController, CandidateViewResponse, CandidateFacadeImplTest, docs) and #697 conflicts (candidateViewConfig.api.ts) — they depend on unreleased commits.
Whoever pushes the next recruit prod release (FF `production` past be `ac4beed9c` and fe `448c4cad`) must ALSO, for this feature to turn on:
1. Add `RECRUIT_FEATURES_OFFER_FIGURES_REQUIRED: "true"` to recruit-be `helm-chart/config/production/values.yaml`.
2. Update `OfferFiguresRequiredFlagTest` (it currently asserts production does NOT have the flag).
Without step 1 the code ships dormant (old form, no gate) — safe. The volume line on the manager review row has no flag and shows as soon as fe 448c4cad + be ac4beed9c are on prod.
No need to ask session 29c4fa84 before FF-ing these commits.
