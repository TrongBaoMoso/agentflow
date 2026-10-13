# Does MOSO have only W-2 and 1099 loan officers? (research for Bao, 13/10/2026)

Read only. Nothing was changed or written. Code was fetched fresh on 13/10:
- packs `origin/master` 033e7b77 (12/10) and prod `origin/3.64.1` 918ba2e2 (12/10). `git diff` between them is empty for `LoanOfficerType.java`, `Admin.java`, `AdminRole.java` and `SendSignedLOAgreementOp.java`.
- moso `origin/master`, lf-homepage `origin/master`, recruit-be `origin/master` 75ace547 (12/10) and `origin/production`, recruit-fe `origin/master` f6257b38 (13/10), ai-hr-be `origin/master` 8bc98d24.
- Data: MOSO **prod** Datastore (counts only, through `runAggregationQuery`), the recruit **staging** DB (`q.sh`) and the recruit **prod** DB (`pgq.sh`, read-only SELECT).

## Short answer

**Miley is right about the agreement and onboarding flow. She is not right about MOSO as a whole.**

- **Onboarding (`LORecruiting`) is two-way.** The flow that records a recruit and builds the agreement knows only W-2 or 1099. It is ONE boolean, `is_corporate_loan_officer`, and despite its name `true` means **W-2 (Outside)**, not Corporate.
- **The account (`Admin.lo_type`) is four-way.** After the loan officer has an account, MOSO has a 4-value enum: OUTSIDE (W-2), INDEPENDENT (1099), CORPORATE and MORTGAGE_ADVISOR. Staff set CORPORATE and MORTGAGE_ADVISOR by hand on the Admin. No onboarding path produces them.
- **Prod has real people of both rare types.** CORPORATE: 17 Admins, 11 of them active. MORTGAGE_ADVISOR: 2 Admins, both active. For comparison, OUTSIDE has 1877 (1122 active) and INDEPENDENT has 2982 (1573 active).
- **CORPORATE changes behaviour.** It drives a different bonus, Pylon access, Zoom handling, the RSU dashboard and its Google group. MORTGAGE_ADVISOR is only a label: no code path treats it differently.
- **Neither has an agreement.** MOSO has no Corporate or Advisor agreement. The only LO agreements are W-2 and 1099.

## (1) What MOSO models (file:line, packs origin/master; prod 3.64.1 is identical)

### A. Onboarding: one boolean, two outcomes
| Fact | Where |
|---|---|
| `LORecruiting.is_corporate_loan_officer` is a Boolean labelled "Loan officer type" | `loan/src/main/java/com/mvu/loan/shared/entity/LORecruiting.java:122` |
| Agreement employment type: `true` gives OUTSIDE ("W2"), otherwise INDEPENDENT ("1099"). There is no third branch. | `loan/.../server/op/admin/EnsureSigningSessionsRequestNewLOAgreement.java:46-48` |
| Only the W-2 or the 1099 agreement file is sent | `loan/.../server/op/admin/SendSignedLOAgreementOp.java:35-40` |
| The only agreement templates are `W2_Agreement_Form_Finalized` and `_1099_Agreement_Form_Finalized` | `loan/.../client/view/LOSignNewAgreementForm.java:352-358`; `InklessProcessHRDocumentCompletedOp.java:530-532` |
| The MOSO admin edit of a recruit offers only 2 options: true = "Outside loan officer (W-2)", false = "Independent loan officer (1099)" | moso `src/main/java/com/lenderrate/client/view/interested_loan_officer/LORecruitingEditView.java:757-761` |
| Converting the recruit into an Admin writes OUTSIDE or INDEPENDENT only, with associate_type outside_sales_person or contractor | moso `.../LORecruitingListView.java:1378-1388` |
| `onboardingMeeting` refuses only when `is_corporate_loan_officer` is missing | `loan/.../server/op/api/RecruitAPI.java:943-952, 2751-2764` |
| The public register form (lf-homepage) shows the LO two choices, "Outside loan officer (W-2)" and "Independent loan officer (1099)". `ALWAYS_CORPORATE_STATES` (GA, MA, MS, MT, NC, NJ, NV, RI, SC, VT) means "always W-2" and forces `true`. | lf-homepage `src/app/[locale]/(public)/register-loan-officer/RegisterLoanOfficerForms/BasicInfoForm/index.tsx:70-74, 222, 287-293` |

### B. Account: a 4-value enum
| Fact | Where |
|---|---|
| `enum LoanOfficerType { OUTSIDE("W2"), INDEPENDENT("1099"), CORPORATE("Corporate"), MORTGAGE_ADVISOR("Advisor") }` | `loan/.../shared/LoanOfficerType.java:5-26` |
| `Admin.lo_type` is that enum, labelled "Loan officer type" | `loan/.../shared/entity/Admin.java:398` |
| Role names: "Corporate loan officer", "Outside loan officer (W-2)", "Independent loan officer (1099)", "Mortgage Advisor". They are picked as roles on the Admin. | `loan/.../shared/typekey/AdminRole.java:282-286, 405-408, 461, 1030-1043` |

**What CORPORATE changes:**
- Corporate LO bonus (CLO bonus) only for CORPORATE: `CalculateBonusAutomationOp.java:1142-1182` and `:1158` ("CLO bonus is reserved for Corporate LOs only"); also `:972` and `:1428`.
- No RSU dashboard: `UpdateRSUDashboard.java:60`.
- Pylon access: `LoansView.java:2511`.
- Zoom ("contact IT", no LO seat): `GetZoomSubscriptionOp.java:48`.
- Its own Google group email: `AdminRetrieveUserGroups.java:226-240`.
- Credit report notifier role: `CreditReportNotifier.java:55`.

**What MORTGAGE_ADVISOR changes:** nothing beyond the label and the filter. It is referenced only in `AdminRole.java:286, 408, 461, 551, 799, 1040`, `AccountDetails.java:140` and `LoanOfficerType.java`. It gets no group email (`AdminRetrieveUserGroups.java:233-240`, default branch null). ai-hr-be says the same: "nothing in packs ties MORTGAGE_ADVISOR to a tax status" (`internal/jobrole/losubtype.go:27-37`).

**Behaviour that exists only for W-2 or 1099:**
- Payroll report defaults to OUTSIDE: `GeneratePayrollReportView.java:49`.
- W-2 off-board: `HandleW2LoanOfficerOffBoardOp.java`.
- 1099 wallet and bank: `LoanUtils.java:3653, 3666`; `AdminStatusWalletFreezeOp.java:47`; `MassPayCommissionOp.java:314`.
- Commission split 100/90 for 1099: `CommissionAgentShareDetailsPopUp.java:117`.
- `practice_real_estate` is cleared unless the type is OUTSIDE or INDEPENDENT: `UpdateMemberOp.java:319-321`.

### C. Prod data (MOSO prod, namespace 5716104026521600, counts only, 13/10)
| `Admin.lo_type` | all | active |
|---|---|---|
| OUTSIDE | 1877 | 1122 |
| INDEPENDENT | 2982 | 1573 |
| CORPORATE | 17 | 11 |
| MORTGAGE_ADVISOR | 2 | 2 |

- **Check on the enum format:** the same query with ordinals 0-3 returns 0, so values are stored as names.
- **`LORecruiting.is_corporate_loan_officer`:** true = 1956, false = 10000. The total is 131073 rows. The exact 10000 looks like a cap, so treat "false" as at least 10000.
- **Earlier staging measurement (26/09):** `.worktrees/_designs/lotype-mapping-measurement.md` §4. 23 of 27 CORPORATE Admins signed no W-2/1099 agreement at all. None reached CORPORATE through the recruiting flag; someone set it by hand later.

**Conclusion for (1):** the W-2/1099 boolean decides the agreement, the meeting and the conversion. CORPORATE is a real fourth account type that changes bonus and permissions, and only staff set it on the Admin. MORTGAGE_ADVISOR is a label used by 2 people. Neither can be chosen during onboarding in MOSO.

## (2) Why recruit has Corporate and Mortgage advisor

- **Where the values come from.** They were never asked for as onboarding choices. The agent built the list by copying MOSO's `LoanOfficerType` and ai-hr-be's `validLoType`, so that Send to HR could carry `lo_type`.
  - recruit-be PR #411 (TrongBaoMoso, merged 23/09/2026 23:47Z), bead `agentflow-dkt0` (created 23/09, closed 24/09).
  - Migration `V106__candidate_hire_classification_and_hr_handoff_permission.sql:1-6`: "Values are exactly MOSO LoanOfficerType / ai-hr-be jobrole.validLoType".
  - What Bao approved on 24/09 was the Send to HR button and the Onboarding rights (V106:20-22). The bead's own question to Bao was "(b) record the 1-1 outcome (W-2|1099|corporate/outside/independent)".
- **How they reached the Done picker.** D153 (28/09/2026) added "a required W-2/1099/Corporate/Mortgage-advisor pick" to the Done… modal (DECISIONS.md D153). It comes from `.worktrees/_designs/onboarding-w2-1099-design.md` ("Idea approved by Bao 28/09").
  - Rev 2, "Bao's product direction", had 3 options: W-2, 1099 and "Other (Corporate / Mortgage advisor)" (design :245, :270).
  - The FINAL rev 3 changed this to **four flat radios** on critic B's UX advice (design :89). That came from the critics, not from a named person.
  - "Bao's mapping" (design :352; `HireClassification.java:20-23`): Corporate and Advisor send nothing to MOSO, and their agreement "is handled manually".
- **Open question never answered.** Q-2/B2 (design :207): "the Corporate/Advisor end state. Needs Onboarding's answer, not Bao's." It is still open. Miley's statement answers it.
- **D158 (30/09, product decision by the user)** only made MORTGAGE_ADVISOR exempt from the INDEPENDENT ⇔ contract pairing, to match HR (V153).
- **Unrelated "corporate" in the licensing rule.** The CA/IN rule (Q8, 13/09, V066 `value: CORPORATE_LOAN_OFFICER`) says "corporate" but means W-2, the same misnomer. It is inert (Q33).

## (3) If recruit offers only W-2 and 1099

### Existing rows
- **recruit prod DB (13/10):** all 1018 candidates (541 active) have `lo_type` NULL. **0 are CORPORATE or MORTGAGE_ADVISOR, and 0 `hr_handoff_outbox` rows** belong to them. Prod has `RECRUIT_FEATURES_ONBOARDING_HIRE_CLASSIFICATION` unset (false). Note that the profile-edit select (below) has no flag, so someone could still set a value on prod today.
- **recruit staging DB (13/10):** CORPORATE 2, MORTGAGE_ADVISOR 2, OUTSIDE 26, INDEPENDENT 9 and NULL 7495. The 4 rows are all QA test accounts at stage S5, ACTIVE, `employment_type` null, with 0 HR hand-off rows:
  - `fad3d47c-0dcc-4182-a093-333d09f6c94c` QA Claudecorp, CORPORATE (08/10)
  - `efbec8d9-43d5-4ad4-985c-46f5a4e70720` QA Claudeadvisor, MORTGAGE_ADVISOR (08/10)
  - `9d7eae7a-b2d6-4c86-ac81-c9301151bd3e` QA Tenccorp, CORPORATE (12/10)
  - `0131f68d-36b4-4ea2-8d56-00ba1da4d740` QA Tencadvisor, MORTGAGE_ADVISOR (12/10)
- **These 4 rows show a live gap.** Each has an `ONBOARDING_MEETING` row in status SENT. MOSO recorded the meeting with the LO's own registration W-2/1099 value. So for a "Corporate" pick, MOSO still built a W-2 or 1099 envelope. Recruit "sending nothing" does not mean MOSO sends nothing.

### Recommended migration: hide, don't delete
1. Keep CORPORATE and MORTGAGE_ADVISOR **readable and storable** in the BE:
   - V106 CHECK, V153, `HireClassification.LO_TYPES`, `HrIntakeRules.LO_TYPES`.
   - Removing them would break the old rows (the CHECK) and dedup.
   - HR (ai-hr-be) also accepts all 4.
2. **Refuse them as NEW input** at both write doors, but allow an unchanged value:
   - `HireClassificationWriter.applyForOnboardingDone`
   - `applyForProfileUpdate`, only when `requestedLoType` changes to one of them, so re-saving an untouched profile does not 400.
   - Add an `ALLOWED_NEW_LO_TYPES = {OUTSIDE, INDEPENDENT}` set next to `LO_TYPES`.
3. **FE:** both pickers offer W-2 and 1099 only. A candidate already holding CORPORATE/MA shows it read-only (profile drawer label), and the select shows it as the current value with the 2 real choices to move to.
4. **Data:** no migration needed on prod (0 rows). On staging, the 4 QA rows can stay as test data for the "legacy value" display, or a person can re-pick them. A blind remap is unsafe: Corporate is not W-2 by rule, and staging measured that most Corporate Admins signed no agreement at all.
5. **Labels:** fix `candidateEdit.json` `lo_type_CORPORATE: "Corporate — W-2"`. That label is wrong; Corporate has no W-2 agreement.

### Code paths to change
**recruit-be (origin/master)**
- `candidate/HireClassification.java:18`: `LO_TYPES` stays. Add the new-input set; `isCorporateLoanOfficer` (:96-104) and `deriveEmploymentType` (:81-83) stay for legacy rows.
- `candidate/HireClassificationWriter.java:76-95, 104-130`: reject a new CORPORATE/MA. The :91-92 skip stays.
- `checklist/facade/impl/ChecklistFacadeImpl.java:174, 240-253` (`requireHireClassification`): error text and validation.
- `checklist/model/request/ChecklistItemStatusChangeRequest.java:47-57` and `candidate/model/request/UpdateCandidateRequest.java:85`: javadoc and allowed values.
- `agreement/AgreementSendGate.java:76-84` (`isExcludedClass`): keep, still needed for legacy rows. `agreement/service/AgreementSendService.java:18`, `AgreementStatusServiceImpl`, `AgreementReasonCodes`: copy only.
- `packswriteback/PacksWritebackPayloadResolver.java:245, 418, 681-687, 785-786, 830-831`, `PacksWritebackTickServiceImpl.java:1067-1068` (`HIRE_CLASSIFICATION_MOSO_OWNED`), `PacksWritebackEnqueuer.java:378`, `PacksWritebackFieldMapping.java:52`, `model/PacksWritebackKind.java:97-98`, `recruitapi/RecruitApiClient.java:397`: keep the legacy branches; comments only.
- `hrhandoff/HrIntakeRules.java:55-58, 101-110`, `HrHandoffReadinessService.java:176-180`, `HrHandoffPayloadResolver.java:282`: keep (HR accepts 4).
- `candidate/entity/CandidateEntity.java:406`, `dedup/service/impl/DedupServiceImpl.java`, `CandidateProfileDiff`/`CandidateProfileField`: no logic change.
- Migrations V106/V153/V158: do not edit. A new V only if a CHECK for new rows is wanted; not recommended, enforce it in Java.
- `licensing/model/LicensingRuleType.java:24` + V066 `CORPORATE_LOAN_OFFICER`: separate, latent; leave it or rename it to mean W-2.
- `docs/DECISIONS.md`: a new D-entry superseding D153's 4-way pick.
- **Tests (20 files)** that pick CORPORATE/MA as an input must change. The ones that test legacy rows stay:
  - `AgreementSendGateTest`, `AgreementSendIT`, `AgreementSendServiceImplTest`, `AgreementStatusServiceImplTest`
  - `CandidateProfileDiffTest`, `HireClassificationTest`, `HireClassificationWriterTest`, `DedupServiceImplTest`
  - `HrAutoHandoffIT`, `HrAutoHandoffOffIT`, `HrIntakeRulesTest`, `HrHandoffReadinessServiceTest`
  - `LicensingItemGeneratorImplTest`, `LicensingRuleDescriberTest`
  - `PacksWritebackPayloadResolverAgreementTest`, `PacksWritebackPayloadResolverTest`, `PacksWritebackWaitReleaseServiceTest`
  - `PacksWritebackTickServiceImplAgreementTest`, `PacksWritebackTickServiceImplTest`, `RecruitApiClientTest`

**recruit-fe (origin/master)**
- `src/shared/constants/hireClassification.ts:2` (`LO_TYPES`, used by the profile select) and `:19` (`HIRE_MODAL_ORDER`, the Done… radios): split into "selectable" (OUTSIDE, INDEPENDENT) and "known" (all 4). `agreementClassFor`/`hireEditWarningVariant`/`hireEditOldChoiceKey` keep handling legacy values.
- `src/app/[locale]/(private)/work/_components/WorkQueueClient/OnboardingHireMeetingModal.tsx:82, 134, 154`: 2 radios; drop the manual note (`isManual`).
- `src/shared/components/CandidateEditModal/LicensingTab.tsx:106`: select data. Show a legacy value as current only.
- `src/shared/components/CandidateEditModal/schema.ts:120, 146`: allowed values.
- `src/shared/components/CandidateDrawer/ProfileTab.tsx:85`: read-only label, keep.
- `WorkQueueClient/workQueue.ts:378` (`HIRE_CLASSIFICATION_MOSO_OWNED`, keep for legacy rows) and `:407-408`.
- Messages, en and vi:
  - `workQueue.json:179-183, 200-201` (`meeting_hire_corporate`, `meeting_hire_advisor`, `meeting_hire_manual_note`); `meeting_confirm_disabled_hint` "Pick W-2, 1099, Corporate or Mortgage advisor first."; `sync_hire_moso_owned`.
  - `candidateEdit.json:39-42, 57-58`; `lo_type_CORPORATE` "Corporate — W-2" is wrong.
- Tests: `OnboardingHireMeetingModal.realCatalog.test.tsx:82-83`, `WorkQueueClient.hireClassification.test.tsx:159-168, 335`, `hireI18nKeyCoverage.test.ts:83-93`, `workQueue.test.ts:423-455`, `AgreementSend.realCatalog.test.tsx:60, 276`, `AgreementSend.test.tsx:595`, `CandidateEditModal.agreementPrompt.test.tsx:170-180`, `LicensingTab.test.tsx:171-292`, `schema.test.ts:272`, `hireClassification.test.ts` (whole file).

**Reports:** no recruit report or export groups by `lo_type` (grep of recruit-be `src/main` finds only the paths above). In MOSO, reports such as payroll and commission use `Admin.lo_type`, which recruit does not write.

## (4) Risks
1. **Corporate hires are real, so there must be another way to record them.** Prod has 11 active CORPORATE Admins. If Onboarding still hires a Corporate LO, the Done modal will force W-2 or 1099, and MOSO will build that agreement. Today that is already what happens: the 4 staging QA rows went to MOSO with the LO's own pick. Hiding the options does not create this gap, but someone must confirm with Miley: "a Corporate hire is set on the Admin in MOSO afterwards; in recruit, pick what the LO signs (or W-2)". Otherwise ask Miley what a Corporate hire signs.
2. **HR gets a different lo_type than MOSO's Admin.** Recruit sends OUTSIDE/INDEPENDENT to HR, while the Admin is later hand-changed to CORPORATE. ai-hr-be syncs from packs two-way (`internal/db/packssync_two_way.go:304`), so HR may flip it later. That is acceptable, but expect drift.
3. **Do not delete the enum values or narrow the V106 CHECK.** Old staging rows, dedup merges and the HR payload would 500 or 400. Do not remap the 4 QA rows to W-2 blindly.
4. **A profile save must not 400 on a legacy value.** Allow an unchanged CORPORATE/MA through `applyForProfileUpdate`; refuse only a change to one.
5. **The edit warning logic depends on 3 classes.** `hireEditWarningVariant` treats Corporate/Advisor as "no agreement". Keep that for legacy rows, or an OUTSIDE→(legacy) display could warn wrongly.
6. **The naming trap stays.** `is_corporate_loan_officer=true` means W-2 everywhere: MOSO, lf-homepage `ALWAYS_CORPORATE_STATES`, the recruit-be V066 rule. Any new copy that says "corporate" will be misread. Say W-2 / 1099.
7. **Second-hand evidence.** Who exactly picked "four flat radios" (critic B, 28/09) is from the design doc only. No message from Bao or Onboarding asking for Corporate in the picker was found.
