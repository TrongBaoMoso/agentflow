# RESUME 10/11 ~07:45 VN (session 460363a7, pause for machine shutdown)

## State (measured 07:29)
- Independence on staging: 26/44 = 59% live, 34/44 = 77% incl. dark. Prod ~0%.
- Merged overnight (01:30-03:00 VN): packs #3865 #3866, recruit-be #951 #955, ai-hr-be #1370 #1371. Nothing 03:00-07:30 (agents idle — do not let that happen again).
- referral_bonus_state: 0/368 packs_closed_loans filled -> MOSO staging lacks packs master.
- Morning report inputs backed up at ~/.claude/projects/-Users-apple-Projects-agentflow/morning-1011-backup.md (scratchpad is wiped on reboot).

## In flight
- Agent be28-roster-read (started 07:35): recruit-be switch `recruit.features.program-roster-source` MOSO_AID|RECRUIT (staging MOSO_AID, prod absent) so BE-28/BE-41 -> Replaced-dark (36/44 = 82% incl. dark). Paused at 07:45: WIP branch + notes in bead agentflow-0gwad (check `bd show agentflow-0gwad`). Resume: re-spawn with same goal, continue from its branch.
- portal-ui-design2: LO portal tera-docs restyle; lf-homepage branch design/lo-portal-tera NOT on origin yet. Merge only after Tue 10/11 23:00 VN. Before/after artifact required. Re-spawn if needed.

## Waiting on Bao
1. SWAT login -> install/deploy packs master on MOSO staging (FB fix #3865 + field #3866). Then merge moso #1826 (web.xml) and verify FB unsigned POST refused + packs_closed_loans fills.
2. Q1: bonus loan count = Recruit units_12mo [rec] vs staff-confirmed like MOSO.
3. Send Tài message (text in the backup file). Tell Khải omni #682-#690 went to staging + 4 questions on omni #688.
4. Optional: flip Wednesday switches early (user-visible) — Bao undecided.

## Crons to RE-CREATE on resume (session-only, lost on shutdown)
- Tue 10/11 22:37 VN: give role-onb its ONBOARDING role back; check fee-paid staff mail.
- Wed 11/11 09:17 VN: Wednesday switches per docs/handoff/WEDNESDAY-1111.md.

## Rules recap
Staging only; new flags off/absent in prod; ledger first for D/V numbers (latest V361, D441); Vietnamese plain words to Bao; no secrets; ram-gate.
