# Call workspace — handoff (overnight 16→17/10)

Epic `agentflow-iidiu` · plan `PLAN.md` · mockup v3 https://claude.ai/artifact/2aabL49ThdkT2XB24Uz4xk

## What shipped
| PR | What | Merged | Staging | Production |
|---|---|---|---|---|
| recruit-be #649 | flag `call_workspace` (staging ON, prod absent=OFF), PUT accepts county / target comp / self-reported volume + closed loans, MOSO sync never overwrites a recruiter edit, PUT response redacted like GET, D267 | 077fdb12 | ✅ | ✅ 077fdb12 |
| recruit-fe #490 | per-user toggle "Try the new Call workspace" (localStorage per user, shared store), rename "Loans since {year}" / "Loans in the last 12 months" everywhere | 0445fc52 | ✅ | ✅ |
| recruit-fe #491 | workspace shell (≈ full width, TODAY strip, ✕/Esc rules), profile column with per-field autosave (Saving/Saved·Undo/Retry/invalid/conflict), local drafts, no wizard pop while open | 4f3fda10 | ✅ | ✅ |
| recruit-fe #492 | full Log result inline (note on top, focused), offer inline with Back, Hot/Cold routing | bc062991 | ✅ | ✅ |
| recruit-fe #493 | omni Conversation inside (hideHeader), bubble reply → workspace Conversation tab, select text → "Put into" | bed75afe | ✅ | ✅ |
| recruit-fe #494 | polish from staging QA: strip tiles, banner Prepare offer → workspace, timer only for a live call, header Call, HR-style visuals, legal name inline + drafts, scoped 409, inert shell | 10bb1f4c | ✅ | ✅ 10bb1f4c |

Every PR: 2 independent reviewers + CI green before merge. Staging browser QA (11 scenarios) done on bed75afe; re-smoke on 10bb1f4c.

## Production proof (flag OFF)
- `kubectl --context gke_lender-rate_us-central1_moso-gke -n recruit-be get deploy recruit-be -o json` → no `RECRUIT_FEATURES_CALL_WORKSPACE` env (default `false`, application.yml `recruit.features.call-workspace`). 2/2 ready.
- recruit.loanfactory.com serves the new copy ("Loans in the last 12 months"; "Closed units (12mo)" / "Loans closed since verify" gone). The toggle string ships in the bundle but renders only when the flag is true.

## How to try it (staging)
recruit.viet18.com → My work today → switch **Try the new Call workspace** (top right, next to refresh) → click Call / Log result on any row, or an LO reply bubble. Toggle is remembered per user per browser.

## Known limits / follow-ups
- `agentflow-65b8b` turn ON for production = owner decision (helm prod value + go-live).
- `agentflow-20nyn` omni People rail can't be auto-opened (no prop in omni-react 0.4.39) → tera-components PR for Tai.
- `agentflow-vo7ni` /candidates/[id] and Invites still open the old offer modal.
- `agentflow-q24h6` pre-existing `followUp.test.ts` vi weekday failure (Node ICU).
- Legal name: BE writes it only through confirm, so the two boxes save on "Checked with the LO — confirm" (drafts kept until then).
- Numbers can't be cleared via PUT (BE ignores null) → inline "can't be cleared here".
- Put-into reads omni's same-origin email iframe; feature-detected, hidden if unreadable.
- Staging QA side effects: QA Tenaeboard got an "Interested" result; QA Claudeladder / QA Tenaeboard have a logged call without result. All edited profile fields were restored.

## 17/10 — Popup tabs (3rd mode, default)
- recruit-fe #499 (09d2393b) + #501 (1dcae8af) on **staging only**; production waits for Bao (staging also carries agentflow-b2's staging-only HR kit #497/#500/#498…).
- Mode selector "Call view: Classic · Workspace · Popup tabs" on Today/Focus (flag call_workspace), default Popup tabs, per user+browser.
- Popup: one 1160px modal, book tabs on the left edge (icon above label), white body + 3px accent strip; Log result = FollowUpsPanelBody (note after outcome), Conversation = ConversationPanel hideHeader, Profile = shared ProfileTabContent (2 columns). Every Call / Log result / Prepare offer / reply bubble routes by mode.
- Open: agentflow-2kqyf (omni draft/side callbacks for reload persistence, tera-components), number clear needs BE, omni first-visit tour shows inside the popup.
- Report: https://claude.ai/artifact/91EeRYbXEYcZpjJqHAXe6L
