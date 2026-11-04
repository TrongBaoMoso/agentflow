# recruit-fe #347 (PR7-B) review round 1 (03/10). FE reviewer REQUEST_CHANGES (small); architect still reviewing — his items are appended here when they arrive. Batch everything into one push.

0. (Orchestrator decision) Roles LOADING (nav-context undefined) = treat as scoped for unsafe calls: no GET /users, no Today batch-claim handout, no /kpi/pipeline until nav-context resolves; tests for loading and for nav-context null (fails OPEN by design, documented); a CI-draft negative control.
1. ONE rule everywhere: scoped-unsafe calls wait while roles load; useUserDirectory uses useRowScope (honours "*" wildcard); the handout is hidden until scoped === false; a comment + tests for loading and for nav-context null.
2. Link modal: preselect a candidate account only when there is exactly ONE free candidate, and never a created_after_approval one; test with the risky row listed FIRST.
3. Invalidate the pending list onSettled (or refetch onError) so a 409 refreshes it.
4. Instants: format with useFormatter / Intl in the user's local time, or label them UTC — including candidate created_at vs the approval time.
5. Remove releaseCountOf / leads_to_release (the BE never sends it); confirm pm_unlink_body_unknown exists in en and vi.
6. Board view owner names for scoped users: collect ids from the board columns too (or hide owner names on the board).
7. expectedRoleCodes must come from the same source as the row (grant ?? directory); test a person WITHOUT a grant row; check what the BE does with an empty expected list (read recruit-be RbacAdminServiceImpl on master).
8. Route-coverage: add a candidate-drawer row (its calls) + PeerHandoffDialog / NoteComposer / CandidateTeam directory uses; one behavioural test per hide (KPI, batch-claim, bulk bar, directory) asserting apiClient was NOT called.
9. qualifies_now_true copy neutral: "The numbers alone meet the approval rule." (en/vi); show it only when program_reasons has entries if the BE sends []; aria-describedby on the disabled buttons pointing at the refusal text.
10. Revert unrelated reformatting in candidates.api.ts; aria-controls id only when the row is open, and sanitised; note the SegmentedControl in the PR body (a11y label, narrow width); don't mount board columns until collected_key_status is known; guard the Link modal close while the request is pending.

## Architect (REQUEST_CHANGES), appended 03/10
11. The candidate 360 drawer makes calls the BE refuses for an HH on every open: GET /candidates/{id}/checklist-items (CandidateChecklist on Overview) and GET /candidates/{id}/followers (CandidateTeam, ActivityTab). Decision: allowlist them in recruit-be (a separate small BE PR, being done by the coordinator), NOT hide. FE: add a "drawer" section to the HH route-coverage test listing EVERY drawer call, each marked allowed (after the BE PR) or hidden-with-reason; transfer / revive / sync-trace stay refused and must be hidden for scoped users.
12. Vendor recruit-be docs/scoped-route-allowlist.json BYTE FOR BYTE as the fixture (record the source commit in a sidecar note or the test header), instead of a TS transcription; add a test/CI diff against recruit-be master if feasible (e.g. a script that fetches it with gh and compares; optional in CI).
13. UI copy: Unlink is reachable only for SUSPENDED members today (the pending list shows pending + suspended); say so in the screen copy; a view for active linked members comes later (bead filed by the coordinator).
14. Keep every gate in the explicit `=== false` form (scoped === false), never truthy/falsy.
