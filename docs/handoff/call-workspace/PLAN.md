# Call workspace — implementation plan (overnight 16→17/10)

Approved design: mockup v3 https://claude.ai/artifact/2aabL49ThdkT2XB24Uz4xk (HR Center style).
Code read at: recruit-fe `origin/master` bacae1de · recruit-be `origin/master` 747b9130 (default branch `master`).

## Owner decisions (Bao, 16/10)
- Clicking **Call** (and an LO reply in the omni bubble) opens a ready-to-type workspace; nothing pops over it.
- Keep the current UI for comparison: **per-user toggle** "Try the new Call workspace", default OFF, AND BE flag `call_workspace` (staging ON, production OFF).
- Ship tonight **through production with the prod flag OFF**.
- Rename "Loans closed since verify" / "Closed units (12mo)" → "Loans since {year}" / "Loans in the last 12 months" **everywhere** (old UI too). Year = `modex.loans_since_year` via `useLoansSinceYear()`.
- Editable in the workspace: target compensation, production volume, loans closed (self-reported), county. (Decision taken overnight: these 4 inputs appear **only in the new workspace**; the old edit modal is unchanged apart from the rename, so the comparison stays honest.)
- Omni embedded with `ConversationSection` `hideHeader` (official prop in pinned omni-react 0.4.39; tera-fe `EmbeddedConversationPanel.tsx:120` does the same).

## Findings (file:line evidence)
1. **Flags**: no `/features` endpoint; FE reads BE flags from `GET /api/v1/config/candidate-view` (`CandidateViewController.java:47-56`, `CandidateViewResponse`), each flag a `@Component` reading `recruit.features.x` (`application.yml:339+`), per-env in `helm-chart/config/{staging,production}/values.yaml`. FE: `candidateViewConfig.api.ts:53`, pattern hook `usePostJoinedProgressOn.ts:7`.
2. **Per-user toggle**: no user-prefs store in recruit-be → localStorage `recruit.callWorkspace.v1:<userId>` (precedent `pipeline/_utils/boardFolds.ts:13`). Not URL state (it is a preference).
3. **PUT /candidates/{id}**: non-null fields only (`UpdateCandidateRequest.java:17-21`); `''` clears text, numbers cannot be cleared. D263 compares only fields the request sets AND lists in `expected` (`CandidateServiceImpl.java:242`) → one field per PUT = true per-field conflicts. Unknown `expected` key = 400 (`ProfileEditConflictGuard.fields()` :198-243). Every PUT writes `candidate_change_log`. Mailing address = one object. Referral needs `referral_change_reason`. Legal name via `POST /legal-name/confirm`; labels via labels API. Gap: PUT response lacks `detailExtras` (GET sets them, `CandidateController.java:81` vs :85).
4. **The 4 fields exist** (no migration): `target_compensation` (`CandidateEntity.java:429`, V249), `self_reported_volume` (:301, V043), `self_reported_closed_loans` (:305, V043), `county` (:414, V249). Not in UpdateCandidateRequest / CandidateProfileField / guard / diff / scoped lists. MOSO sync overwrites them (`MosoRowUpsertServiceImpl` ~:941/:944, :1080-1081) → must be `copyIfPresentUnlessLocked` + `MosoProfileFields.fillPlan` lock check. `county`/`target_compensation` are `@JsonIgnore`, reach FE only as GET extras (`MosoProfileFields.detailView:232-235`).
5. **Pending-outcome auto-open** fires on focus/visibility (`usePendingOutcome.ts:159-179`); 4 callers guard only their own modals → fix inside the hook.
6. **OutcomeSection** is a pure component (`OutcomeSection.tsx:71-138`); ModalSection/ModalFoot are plain markup → can render inline. Note sits at bottom (:719), state internal → optional props. Full Log result body lives in `FollowUpsPanel/index.tsx` ~440-620 → extract.
7. **InviteModal**: `InviteModalBody` (:102) wraps in RecModal (:395-577) → `variant="inline"` + `onBack`.
8. **Conversation**: gating (contact-route/TCPA, ensure-cast, observer, `buildCandidateSectionConfig`) all inside `ConversationModal/index.tsx:133-571` → extract `ConversationPanel`. Replies are NOT a recruit NotificationBell kind; they come via the omni bubble `CandidateInboxBubble:100-109` → `useConversationPopupStore.openConversation` → `GlobalConversationHost` (`RecruitShell.tsx:167`). Inbound email HTML is a sandboxed `iframe srcdoc` with allow-same-origin (selection readable, omni internals).
9. **Focus**: pointer `?at=`, quick view `?c=` (`FocusClient:79-83`).
10. **Call timing**: `ContactButtons.fire` (:205-239) awaits the activity log before `onLogged` → add synchronous `onCallStart`.

## PRs (merge order)

### BE-1 recruit-be `feature/call-workspace-flag-and-profile-fields`
Flag `recruit.features.call-workspace` (`RECRUIT_FEATURES_CALL_WORKSPACE`, staging true, prod absent) → `CallWorkspaceFlag` → `CandidateViewResponse.callWorkspace`. 4 fields in `UpdateCandidateRequest` (validation: targetCompensation 0..999999999999.99, selfReportedVolume 0..9999999999999.99, selfReportedClosedLoans ≥0, county ≤200), `CandidateServiceImpl.update`, `CandidateProfileField` (COUNTY/TARGET_COMPENSATION pii; volume/closed loans not pii; all mosoOwned), `CandidateProfileDiff`, guard keys, scoped-role lists (county editable; other 3 refused), MOSO lock (`copyIfPresentUnlessLocked` + fillPlan), PUT response sets `detailExtras`. Docs: DECISIONS new D (flag + fields + MOSO lock), STATUS row.
Tests: view flag; guard 409 per new key + stale A does not refuse B; IT; diff/change-log (pii masked); scoped; MOSO locked survives / unlocked syncs; 400 validation.

### FE-1 recruit-fe flag + toggle + rename
`call_workspace` in candidateViewConfig; `useCallWorkspaceOn` (flag AND per-user localStorage toggle); `CallWorkspaceToggle` in Today/Focus PageHead actions (only when flag on); rename labels en+vi with `{year}` (`candidateEdit.json`, `audit.json`, OverviewTab:141-146, ProfileTab:161-162, holdAttention.ts:20-22, ProductionTab:77-82, audit renderer); `UpdateCandidateInput` + 4 fields (types only).
Tests: hook truth table, per-user persistence, label year from config + 2022 fallback, expected keys.

### FE-2 workspace shell + profile autosave
`shared/components/CallWorkspace/`: Host (in RecruitShell), `useCallWorkspaceUrl` (`?ws=<id>&wsTab=result|offer|conversation`), store (call start time, one-shot payloads), `WorkspaceFrame` (94%, non-modal region, header, ✕, Esc ignored in fields), `TodayStrip`, `ProfileColumn` (all sections, jump chips, find, collapse, hide→rail, 4 new inputs), `useFieldAutosave` (idle/saving/saved+undo 5s/error+retry/invalid/conflict keep-yours/use-theirs; baseline at focus), `useLocalDraft` (24h TTL, cleared on save/sign-out). `usePendingOutcome` skips auto-open while workspace open. `ContactButtons.onCallStart`. Today row / Focus / pending strip open the workspace when on.
Tests: parallel field saves independent; 409 isolates one field; undo/retry; draft survives close/switch; no wizard pop while open; Esc guard; toggle OFF = master behaviour.

### FE-3 call result inline
Extract `FollowUpsPanelBody`; OutcomeSection optional `notePosition="top"`, `autoFocusNote`, `draftKey`; InviteModal `variant="inline"` + `onBack`; Save & open message → Conversation tab with draft.

### FE-4 conversation tab + bubble entry + put-into
Extract `ConversationPanel` (hideHeader) from ConversationModal; GlobalConversationHost opens workspace (wsTab=conversation, focusMessageId) when on; `PutIntoChip` (selection in panel + same-origin iframe srcdoc; feature-detect) → Email / Legal name / Mailing via autosave.

### FE-5 polish
i18n audit, contrast, keyboard order, aria-live, narrow widths, UI_UX_SIMPLE checklist, HR-style tokens.

## Risks
Number clear is a no-op (show "can't be cleared"); iframe selection depends on omni internals (feature-detect); PII in localStorage (TTL + wipe on sign-out); refactor regressions (pure extractions, existing suites gate); stale expected baseline (take at focus); release all-or-nothing (flag AND toggle).

## Verification
Staging: deploy green; candidate-view `call_workspace:true`; toggle OFF = old flow; toggle ON: Call opens workspace, note focused, timer; two quick edits independent; second user edits Phone → only Phone conflicts; refocus >15s no wizard; Esc in field no-op; draft persists; strip switches person; Prepare offer inline; bubble reply → Conversation tab; 4 fields saved + change_log; renamed labels.
Production (flag OFF): FF go-live; candidate-view `call_workspace:false`; no env var; no toggle, Call → old wizard; renamed labels visible.
