# Recruit UX + prod pusher — handoff 20/10 evening (session agentflow-76, id 15297c09-59ed-49cc-b5da-67d3cf96e298)

Resume: `claude --resume 15297c09-59ed-49cc-b5da-67d3cf96e298` from ~/Projects/agentflow (or read this file in a new session).

## State of the repos (20/10 ~17:00)
- PROD: recruit-be dc2b54ec, recruit-fe e80f45b8 (batch be #693-696, fe #543-548 pushed 20/10 by this session). Prod setting hot.queue_cap = 500 (was 200; set via in-cluster PUT /api/v1/admin/settings as Bao's id 4b9afbbe-...; verified /inbox/hot 290/290, truncated=false).
- STAGING ahead of prod (Bao: batch prod later, "gom nhiều PR rồi đẩy"):
  - recruit-fe: #549 time columns left-aligned (this session), #550 Offer form (OTHER session), #551 Log result v3 + Follow-ups v2 (this session), #552 Modex page (OTHER session), #553 Follow-ups spacing + due-chip hover + Hot "N+" counts (this session).
  - recruit-be: #697 D297 replace_follow_up_id (this session), #698 D298 (OTHER session).
  - Before the next prod FF: ask the owners of #550, #552, #698 (rule: memory feedback_prod_pusher_ask_pr_owner_first).

## In flight when paused
- DONE: popup-tabs-everywhere merged as recruit-fe #555 (0b353055) and on STAGING 20/10; today-old kept (bead agentflow-676kt reminds removal); follow-up bead agentflow-odtil.
  Bao decision 20/10: ONE popup (tabs Call result / Conversation / Profile) everywhere; Call/Log result -> Call result tab, SMS/Email/Conversation -> Conversation tab; no classic single modals anywhere (Today rows, Hot, Cold, Pipeline, Exceptions, Team queue, Focus, drawer, /candidates/[id], bell links); remove "Classic" from Call view; replace "Loading..." in the popup with a skeleton + Mantine Loader. Workspace (full page) keep/remove = agent to propose, Bao to decide.
  Next steps: finish implementation + tests + negative controls -> local preview (proxy :3610, next dev :3611) -> Bao OK -> PR -> 2 reviewers -> CI -> merge -> promote-staging. No prod.

## Decisions taken today (do not re-ask)
- Log result v3: no Follow-up history / To do today / Upcoming; "Already planned" card + Replace / Keep both (default Keep both, compact control on the same line, white track, orange selected); Replace = move the old follow-up (same kind only) via be #697; no CANCELLED (followup-be V03 removed it on purpose).
- Follow-ups modal v2: one card per follow-up, Done + Edit only (Remind later removed entirely), full note, no helper text, Clear renamed Done.
- Time/deadline columns left-aligned everywhere; number columns stay right.
- #690 (D292) stays on prod (Bao 20/10).

## Small open items
- PageTabs/ListPager build "+" themselves instead of useCountLabel (LOW, reviewer note).
- Bao's earlier list: Hùng to fix HR to-do "câc" #124; Slack draft to Hùng not sent; beads p45by, q6kia (LOW).

## CLOSE-OUT 29/10 (session 15297c09 closed, measured on origin)
- All 5 PRs of this session are MERGED and on STAGING, none on PRODUCTION: recruit-fe #549 #551 #553 #555, recruit-be #697.
- PRODUCTION has not moved since 20/10 02:05Z (fe e80f45b8, be dc2b54ec). Staging is now 53 (fe) / 56 (be) commits ahead, from many sessions. The batch prod push waited for Bao's OK, which never came. A future prod push must re-list origin/production..origin/staging and ask each PR owner (memory feedback_prod_pusher_ask_pr_owner_first).
- Prod setting hot.queue_cap = 500 (still in effect, measured 29/10).
- Beads: agentflow-676kt closed (today-old deleted by #576 on 23/10); agentflow-odtil open (cold /conversations skeleton, code still present); agentflow-vg1fu open (omni spinner/dark mode in tera-components).
- No worktree, branch, preview server or open PR of this session remains.
