# Recruit UI learns the HR app — handoff (16/10 afternoon, bead agentflow-9mazq)

Plan and decisions: `PLAN.md`. Everything below is on **STAGING only** (recruit.viet18.com). Production waits for Bao.
recruit-fe production is a fast-forward push of the whole `staging` branch. The call-workspace session (agentflow-2c) agreed not to push it without checking first.

## Shipped to staging
| PR | What | master sha | Reviews |
|---|---|---|---|
| #497 | HR dropdown theme (rows, ticks, chips), HR DatePicker/TimeSelect/DateTimePicker replacing every native date/time input; prefilled date defaults (table in PLAN.md); Button size sm / radius md app-wide; keyboard access; locale-aware typed dates | 9bd7bb9d | 2 + delta review, browser-checked on staging |
| #500 | Picker follow-up: Tab stop when the anchor day is disabled; Esc on the trigger closes only the picker | de5547a7 | 2 |
| #498 | List pages like HR: one page frame, scope pills (tint, not solid), "Label: value" filter bar, quiet notices, uniform row buttons, pills, icon tile removed from every PageHead, tablet/phone layouts (Today strip stacks, task table scrolls, Hot/Cold cards, sticky actions), Referrals table fits | cb221e16 | 2 + 2 final |
| #503 | Candidate page Profile tab → HR detail blocks (icon tile + title + accent Edit, uppercase label grid 3/2/1 cols, legal-name confirm as a normal primary button) | 62d5c3dd | 2, real-data local check + staging check |
| #505 | Profile tab: Edit edits the block in place (HR style, Cancel/Save in header, no modal); legal name inside Identity; "1-1 outcome" heading removed (hint instead); minus key blocked, no negative-number message; compact Referral reason; languages placeholder/hint; HR chips (grey #f1f3f5, centred) for every MultiSelect/TagsInput | 9dca3f3f | 2 + 2 delta; Bao approved local preview |

Other sessions merged in between: #499/#501 call popup tabs (agentflow-2c), #502 platform SDK 0.4.40.

## Screenshots
`shots/pickers-staging/`, `shots/lists-staging/`, `shots/lists/before|after/`, `shots/profile/` (+ `real-data/`), `shots/profile-staging/`.

## Not done / follow-ups
- The same Bao decisions (16/10 PM) for the CALL POPUP / workspace Profile column (no "1-1 outcome", legal name in Identity, no negatives, no "needs you", no "N fields", compact Referral, read-only blocks as plain text with a "Change…" link) are being done by the call-workspace session (agentflow-2c).
- HR page-header description lines not added (Recruit keeps less text, Bao/Thuận rule).
- Referrals filter row at 375 scrolls sideways (last select partly hidden by design). The sticky action column at 768 covers the columns on its left until the user scrolls.
- Business hours for the defaults are mirrored as constants (08:00–17:00 LA) because non-admins can't read the setting. Holidays are not skipped, same as `nextBusinessMorning`.
- Moving the kit (Calendar/, HrKit/, HrList/, HrDetail/) into tera-components = the "share later" step Bao chose.
- Worktrees `recruit-fe-worktrees/pv497` and `hr-kit` are still held by idle playwright-mcp processes; remove them later (`git worktree remove --force`).
