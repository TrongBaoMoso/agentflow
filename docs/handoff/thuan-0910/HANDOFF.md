# Thuan feedback 09/10 — /register-loan-officer-v1 + /loan-officer (owner session agentflow-cc, 8658d500)

## RESUME POINT 2026-10-09 ~18:00 +07 (Bao paused, shutting down)
Rules from Bao for this round: work LOCAL first, Bao reviews on localhost, ONLY THEN commit/push/deploy. Register: v1 only (v2 later if v1 approved). Never invent copy/features.

Mockup (approved choices): https://claude.ai/artifact/BejybX7JwkLmvwWA1KAWJS (file docs/mockups/thuan-0910/index.html — starts with <title>, no html/head/body; republish with Artifact on that path).
Decisions: Register hero = keep current big square cards + changes below; Webinar = option C; AI platform = option A; date cards = keep the new centered/bigger cards on 3101; webinar required marker = "*"; name tag "#1 Loan Officer in the country".

### A. Register v1 — worktree /Users/apple/Projects/agentflow/_worktrees/rlo-thuan-fixes (local WIP commit on branch wip/register-v1-thuan-0910, NOT pushed; base origin/master). Review server was port 3100 (stopped).
Done (v1 only; v2 + legacy unchanged, gated by V1OnlyContext + `.rlo-v1:not(.rlo-v2)` CSS in BasicInfoFormV1/ui/v1-feedback.css):
- Hero: "Join Loan Factory in 5 easy steps." (5 locales), recruiting pill removed, 5/3 card removed → big 60px "5 steps for you" / "3 steps for us" labels, "Then we take over" round arrow + text between groups, no status captions, no emails, step 6 "Loan Factory sponsors you".
- Form: no helper text, "Required" chip instead of *, wider (1440), +1–2px text, Social media card removed (new applicants save have_social_links=false), part 4 single question + centred recruiting line, rail = sticky white card, action bar right after content (Lead's rule at end of v1-feedback.css).
- IN PROGRESS when paused: rail = the hero's 5 steps (1 Fill out your information [sub: Before you begin + 4 parts], 2 Talk with us on a short call [new page with the "We will call you soon" notice], 3 Pay the $100 startup fee, 4 Sign the Loan Officer Agreement, 5 Give Loan Factory access to your NMLS record).
  Bugs Bao found, to fix next: (1) Next on step 2 jumps to Sign — must go to Pay (locked notice "You can pay after your call with us."), then Sign, NMLS; save (complete_percentage) must happen at the same logical point as master (leaving the Pay page); (2) right-side page titles must equal the step labels (Pay the $100 startup fee / Sign the Loan Officer Agreement / Give Loan Factory access to your NMLS record). Then POST-intercept parity vs origin/master for: new, call pending, call done unpaid, paid unsigned, signed.
- Draft PR #2653 (old v1+v2 attempt, pushed by mistake) is a DRAFT — do not merge; close it or reuse the branch when shipping.

### B. /loan-officer — worktree /Users/apple/Projects/agentflow/_worktrees/lo-webinar-platform, branch feat/loan-officer-webinar-c-platform-a (local WIP commit, NOT pushed). Review server was port 3101 (stopped).
Done: webinar option C (navy, sharp cut-out photo extracted from public/images/why-us/our_founder.svg → public/images/loan-officer/thuannguyen-hd.webp 720x1280, name tag one line, high-contrast form, centered bigger date cards w/ arrows, "*" required + aria-required, consent first sentence + "Read the full terms" <details>, Save + Skip buttons side by side, photo under bullets); AI platform option A (function title first, app name small below, purpose + sourced features only, no "Features to confirm", 1 column on mobile); whole page container 1440/24px; hero stats 3-column on mobile. Webinar stays in its current position.
Before shipping: re-run full jest + payload parity (last edits not re-verified), next build, 2 reviewers + Repo Owner, staging, prod. Flag to compliance: consent text now collapsed (Bao's request).
Open questions for Bao: Mobile card line "messages" (chat is COMING SOON) → "Your loans and pricing on your phone."?; Ally "Facebook ads" source is the recruiting-budget sentence; keep?

### Restart review servers on resume
For each worktree: `tok=$(~/.claude/bin/ram-gate acquire next-dev <label> --wait 900)`; `npx next dev -p 3100` (register, rlo-thuan-fixes) / `-p 3101` (loan-officer, lo-webinar-platform); if raw message keys show, `touch src/messages/*.json`. Kill only your own PID (an agent once pkill'd the other server).

## SHIPPED 2026-10-09 ~22:00 +07
- lf-homepage #2655 (register v1, squash 83aaa58d) + #2656 (/loan-officer webinar C + platform A + wider landing + webinar moved after No software fees + Language Team hidden, squash f370f978) → master/staging, then production via #2657 (33b1c702, Cloud Run lf-homepage-00742, 100%). Verified www.loanfactory.com: /loan-officer, /register-loan-officer(-v1,-v2), /loan-officer-old all 200; v1 shows "5 easy steps"; Language Team gone.
- Bao decisions: /recruit/[slug] follows v1 (same form); consent text stays collapsed behind "Read the full terms" (Repo Owner flagged for compliance; Bao kept it).
- Draft PR #2653 closed (superseded by #2655).
- Next: Bao sends the review email to Thuan (draft in chat, EN + VI, asks Victoria/Brayan/Matt/Khai/Ben for ideas to simplify registration by Wed 14/10); lo-homepage /loan-officer: hide Language Team too; v2 not updated (only v1 was approved).
