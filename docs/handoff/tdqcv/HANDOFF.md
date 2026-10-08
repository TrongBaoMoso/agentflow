# HANDOFF — agentflow-tdqcv: Loan Officer registration form (website disclosure + shorter form)

Paused 2026-10-06 (Bao shut down the machine). Due **Fri 2026-10-09** (Phuong told CEO Thuan the new registration form ships by end of this week).
Bead: `bd show agentflow-tdqcv` (decisions are in the comments). Deferred: `agentflow-uii15` (save after every part).
SPEED MODE is on (memory feedback_speed_mode_vs_full_flow.md): targeted unit tests, 1 negative control per main fix, 2 reviewers + Repo Owner, list skipped items in PR body.

## Why
CEO email thread "LOs who have their own websites" (Aug 3 → Oct 4, 2026): Loan Officers must CLEARLY answer Yes/No whether they have a website that promotes mortgages; URL if Yes; must agree to get Loan Factory approval before creating a new one. Company was sued over an LO website, so answers are legal evidence. Separate feedback: /register-loan-officer looks bad and is too long.

## Decisions (Bao, 2026-10-06)
- Question: "Do you currently have a website or landing page that promotes mortgages?" + "Social media profiles are listed separately below." Required Yes/No; Yes ⇒ ≥1 https URL.
- Approval commitment = separate required checkbox, server stamps the time once.
- Storage = new packs `LORecruiting` fields; shown read-only in moso admin.
- Claude may self-merge + deploy STAGING after 2 reviewers + Repo Owner. Production waits for Bao.
- Mockup approved: Basic info split into 4 parts inside the same step. Artifact for Phuong: https://claude.ai/artifact/EUzjZEsGZrCqWBrf25GL6B (Bao must Share it). Source: `lf-homepage/docs/mockups/register-loan-officer-v2/index.html` (not committed); artifact copy in session scratchpad `rlo-mockup/`.
- Save once after part 4 (a); save after every part (b) deferred → agentflow-uii15.
- Mailing address "same as home" pre-checked for new applicants. Legal name stays optional.
- Sponsorship SC/AR/NE (`confirm_sponsorship`): Confirm required; Cancel removes AR/NE/SC.
- Copy fixes (5 locales): can_not_sponsored missing "sponsors"; "Returning LO" → "Returning Loan Officer". CA DRE license number only when CA sponsored.
- Recruiting ticket 37609417254 (Brayan): locked fee step copy → "You're done for now. We will call you soon. After the call, we will give you access to the following steps." — WE do it (PR #2619).

## OPEN question for Bao (asked, not answered — he paused)
Loan Officers who already passed Basic info (now on Pay fee / Sign / NMLS) never see the website question (lf-homepage owner finding 2 on #2618). Options offered:
1. (recommended) show a small required disclosure box at the top of whatever step they are on if unanswered;
2. send them back to Basic info;
3. only ask new applicants; Recruiting asks the rest manually.
The lf-homepage Repo Owner will only AGREE on #2618 once this is decided (or explicitly accepted in the bead).

## PR status at pause
| PR | Head | State |
|---|---|---|
| packs#3628 (into master) | d33439b9ab01f23e95cebd2e57ae455170e1f99b | Fields + guards. Owner AGREE (on older head 89830c8). rev2 REQUEST_CHANGES on 89830c8 → all 7 findings fixed in d33439b (ack_at tracked + immutable, ack one-way, ≤10 URLs ≤2048 chars, URI host check, URLs dropped unless Yes, API-path tests, `.access(PUBLIC)` so anonymous GetOp returns them). rev1 (java-reviewer) result pending — check PR comments. NEEDS: re-review of the delta by rev2 (or a fresh reviewer) + owner re-ack. |
| moso#1756 (into master) | f44a467a8f0131b2d46592b765913b6a39235539 | Admin display; ack + has_mortgage_website read-only. NOT compiled (needs new packs snapshot). Needs 2 reviewers + Repo Owner. |
| lf-homepage#2618 PR1 (into master) | 6a9054511668b49fc9a31f59ea804d647c46ff8d | Website block. Blocker (false "No") fixed: mapper omits keys when unanswered (never null — null CLEARS in packs SaveOp). 24/24 jest. rev1 REQUEST_CHANGES + owner DISAGREE were on old head 9050f15 → need re-review. Owner also waits on the OPEN question above. Merge ONLY after packs#3628 is on staging. |
| lf-homepage#2619 copy fixes (into master) | 8027dbaf81da3dd8604f4e099162a323ca4478a1 | Reviews by tdqcv-copy-rev + tdqcv-copy-owner — check PR comments. Independent of packs; can merge to staging once 2 approve. |
| lf-homepage PR2 `feat/tdqcv-register-form-parts` (draft, base = PR1 branch) | see branch on origin | 4-part form per mockup. Agent was told to push WIP at pause — check `git ls-remote origin feat/tdqcv-register-form-parts` and the PR list; retarget to master after #2618 merges. |

## Late updates at pause (all agents stopped cleanly, no ram-gate tokens held)
- **lf-homepage#2619 (copy)**: reviewer APPROVE + second reviewer/Repo Owner AGREE on head 8027dbaf → READY to merge into master (staging). Merging it first makes #2618 conflict in en.json only (keep #2618's 6 new keys + #2619's fixed line). Non-blocking notes: `registration_information_is_being_reviewed` still says "You can sign after your call" (check consistency); heading `pay_one_time_startup_fee` still hard-codes "$100"; longer "Returning Loan Officer" label may truncate (not checked visually).
- **packs#3628**: rev1 (java-reviewer) REQUEST_CHANGES on OLD head 89830c8. Verify against d33439b: (H1) a later keyed save with `has_mortgage_website:null, urls:[]` cleared a stored answer — d33439b lets the Loan Officer CHANGE the answer, but must NOT allow clearing an answered value back to null (protectLegalNames-style guard) → probably still open; (H2) registerWebinar (WebPlusAPI:1466) and submitReferALoanOfficer (:2410) don't strip ack_at — d33439b's beforeSave guard should cover all paths, verify with a test; (M) validation only when body says has=true → d33439b drops URLs unless Yes, verify; bare-string urls → must be 400 not IllegalStateException; (L) fields not in hasProfileChanges (LORecruiting:971) — confirm intended. Then 2 fresh reviews of d33439b + owner re-ack.
- **lf-homepage PR2 = #2620** (draft, base feat/tdqcv-mortgage-website-disclosure), head bbdfc38a, 121 targeted tests, tsc/eslint/build clean (husky NOT installed in worktree; build run manually). Deferred inside PR2: screenshots, inline social rows (kept modal), step-menu sub-steps + mobile "All steps", sticky action bar. OPEN product call: Confirm sponsorship is required whenever a LICENSED state is SC/AR/NE (today's needsConfirmingSponsor) — recommend requiring it only when a SPONSOR state is SC/AR/NE (Cancel only edits sponsor states, so licensed-only SC gets stuck). Ask Bao.
- lf-homepage#2618 head 6a905451 (mapper omits keys; 24/24). Old reviews were on 9050f15 → needs re-review.

## Staging rollout order (from packs Repo Owner, full text in session scratchpad tdqcv-owner.md)
1. Merge packs#3628 → master.
2. SWAT `type=install`: wait for "install packs/loan" on the merge commit; if none after ~10 min, Rerun latest install packs/loan (Branch=master). Do NOT rerun packaging first.
3. packaging moso + deploy chain run by themselves (~15 min). Verify `gcloud app versions list --project lenderrate-master --service default` (new createTime).
4. Then probe: POST staging registerLoanOfficer on www.viet18.com with a FRESH never-used tag email (e.g. `bao.trinh+tdqcv-<timestamp>@loanfactory.com`) and `"has_mortgage_website":true` → expect 400 (only AFTER deploy, else it creates a row). Also spot-check anonymous GetOp returns the 4 fields.
5. Compile moso#1756 locally against new snapshot incl. GWT (ram-gate gradle/mvn) — broken moso master blocks staging packaging for everyone.
6. Merge moso#1756; rerun install packs/loan; check LO Recruiting list/edit on staging.
7. Merge lf-homepage#2618 (then PR2 retargeted) → master; click through /register-loan-officer on staging (ram-gate chrome).
Production: later, Bao decides (packs hotfix into master + 3.63.x; packs before lf-homepage promote).

## Deferred (Speed mode — write down, never drop)
- agentflow-uii15: save after every part.
- moso: no URL editor in LORecruitingEditView (display only); LORecruitingListView has no new column.

## Resume checklist
1. `bd show agentflow-tdqcv`; read this file.
2. `gh pr view` each PR above: read new review comments; confirm heads.
3. Get Bao's answer to the OPEN question → tell PR1 agent (or a new dev-fe) to implement.
4. Re-review deltas (packs#3628 d33439b, lf-homepage#2618 6a90545), review moso#1756 and PR2.
5. Follow the staging rollout order. Respect ram-gate and the qsg2z priority (no recruit-fe merges/promote without agentflow-15).
Background agents (tdqcv-*) do NOT survive a shutdown — spawn fresh ones with self-contained prompts.

## Update 2026-10-06 ~09:50 (after resume)
- #2619 MERGED to master b8fee266. packs#3628 MERGED to master 076f5e9d (final head 4155e2b). Deferred LOW: URL cap 500 chars vs 1500-byte StringType limit.
- #2618 head 278e0ebf: rrA APPROVE, rrB APPROVE + OWNER AGREE — merge ONLY after packs is live on staging and the probe passes (else every resumed Loan Officer past Basic info is locked on the gate card).
- #2620: rvA APPROVE at 2f7f12cc; rvB REQUEST CHANGES (H1 lost moso-aid register-tracking on part validation failures, M1 submit test, M2 unmapped-required guard, L1 copy, L4 confirm reset, L2 compensation help collapse) — sent to tdqcv-ux2. Owner AGREE once fixed.
- #2620 merge procedure (rvB): merge #2618 with a merge commit → `gh pr edit 2620 --base master` and verify baseRefName=master → bring any post-278e0ebf #2618 commits in first → NEVER `gh pr merge 2620` while base is the feature branch → after merge verify on master (parts/PersonalInfoPart.tsx exists, part_progress in en.json).
- Staging click-through before production: 375 and 1440 widths; resumed registration on step 2 and step 3 (gate card).
- Mockup artifact v2 (EN/VI switch, Oct 6 decisions): https://claude.ai/artifact/EUzjZEsGZrCqWBrf25GL6B

## DECISION 2026-10-06 ~10:20 — route split (supersedes the "#2620 replaces BasicInfo" plan)
- /register-loan-officer stays as is (+ PR1 #2618 website disclosure + later-step gate, + #2619 copy).
- 4-part form → NEW route /register-loan-officer-v1 (variant of the same flow, same backend/?key, noindex, RELEASE_PAGES entry, NOT linked anywhere until Bao approves a switch).
- #2620 is being reworked by tdqcv-ux2; prior approvals on 2f8968e8 no longer apply → needs fresh review after rework.
- Packs install rerun queued on SWAT ~10:15 (Bao Rerun); moso#1756 compile by tdqcv-moso after the snapshot publishes.

## PRODUCTION INCIDENT 2026-10-06 (zo816) — state at 22:40 +07
- packs #3623 (SSN guard) live on prod since 14:03 → prod `execute/GetOp` LORecruiting = 400 → /register-loan-officer broken on production (first-save `?key` reload + resume).
- Merged into packs 3.64.1 (Bao approved): #3630 (334b0808, getRegisterLoanOfficer whitelist read + ns check) and #3631 (6b4c79fc, #3628 fields + 4 whitelist fields). NOT DEPLOYED: Bao's SWAT role has no Rerun on deploy_hot_fix; needs Khai / Tuan Vu / Tho Le / Dao / Trung to run `deploy_hot_fix v3.64.1` (after hours on 06/10).
- lf-homepage production hotfix #2624 (cherry-pick of #2621, 404 → GetOp fallback) merged cb87e149, Cloud Build f187d690 SUCCESS 15:13Z.
- Verify after packs deploy: POST https://www.loanfactory.com/api/webplus/v1/5716104026521600/getRegisterLoanOfficer?key=<fake LORecruiting key> must turn 404 → 400 "Registration not found"; then a real resume check. Fake prod key builder: see scratchpad prodkey.txt (s~lender-rate, LORecruiting id 123456789).
- NOT on production yet (decision for Bao, deadline Fri 09/10): website disclosure #2618 + copy #2619 + v1 route #2620 (only on master). Promote via a pinned hotfix PR, NOT a full master→production promote (master carries 37 commits incl. other people's staging-only work).

## MORNING 2026-10-07 — after Khai runs `deploy_hot_fix v3.64.1` (no watcher running)
1. Probe prod: `POST https://www.loanfactory.com/api/webplus/v1/5716104026521600/getRegisterLoanOfficer?key=zzz` → must be 400 (not 404).
2. Prod check lf-homepage /register-loan-officer: new registration reaches "You're done for now"; `?key` resume loads; website answers persist (test email bao.trinh+tag; prod = real data, keep it to one test registration and tell Recruiting).
3. Bao merges lo-homepage promote #880 (release → produciton-v2); then same check on an LO site (www.loanfactory.com/<slug>/register-loan-officer).
4. lf-homepage v1 approved UI (#2626, staging rev 01544) → production only after Bao approves it on https://www.viet18.com/register-loan-officer-v1 (pinned promote PR like #2625).
5. Follow-ups: agentflow-lm8sc (375px social links cut, button edge, duplicate disclosure component, index.tsx size), agentflow-wcwfu (remove GetOp fallback in both repos once prod serves the endpoint).

## RESUME POINT 2026-10-07 ~18:00 +07 (Bao paused to go home) — READ THIS FIRST
### Done today (verified)
- packs `deploy_hot_fix v3.64.1` RUN by Khai: prod GAE version `c` (2026-10-07 04:19Z = 11:19 +07, 100% traffic). Prod `getRegisterLoanOfficer` = 400 (was 404). Prod request logs since 05/10: outage window (14:03 06/10 → 11:19 07/10) had 198× getRegisterLoanOfficer 404 + 2× registerLoanOfficer 400 and ZERO sign/pay calls; after fix only our probe — no real Loan Officer has used the page since, so "fixed" is NOT yet proven by real traffic.
- Brayan ticket #37609417254 (Oct 7 4:13 AM: "Next does nothing" + "cannot pay even after pre-onboarding done", Jessica Phan / Steve Hutchins / Shane Ouimet) = this outage. Draft reply (EN, for Chi Tran / Bao to send) is in the chat; asks Brayan to retest. After he retests: re-read prod logs (filter `/5716104026521600/(getRegisterLoanOfficer|registerLoanOfficer|saveLoanOfficerPaidStartupFee|registerSigningAgreement)`), expect 200s. Brayan's wording request (Oct 5) is already on prod in lf + lo (`fee_deferred_until_approved`).
- lo-homepage: Bao merged promote #880 (7c3d2804) on 06/10 17:44Z; prod build SUCCESS.
- Mockup artifact https://claude.ai/artifact/V9KD9SQLreiHzokZ1tY52n now has a VERSION switch (Current calm / Previous bold dark hero). Sources: docs/handoff/tdqcv/mockups/{index,current,previous}.html (previous = rebuilt from the rlo-redesign-mockup agent log, state at 06/10 05:35Z).

### In progress — v1 UI review loop (LOCAL ONLY, Bao said: do not commit/push until he reviews on localhost)
- Worktree `/Users/apple/Projects/agentflow/_worktrees/rlo-v1-round2`, branch `feat/register-lo-v1-round2`. Commit a66decdc is pushed and PR **#2627 is DRAFT** (agent pushed before the stop message; Lead converted to draft). Everything after a66decdc is UNCOMMITTED in the worktree (Bao rounds 1–3).
- Bao round 1 (done, uncommitted): removed "Your answers are saved…" notes (sidebar + action bar); removed outer white card/shadow around the form; Check your answers = label left / value right, website + social URLs one per line without "Yes", referral split lines.
- Bao round 2 (done, uncommitted): new V1Hero (Phuong likes the bold hero layout, toned to v1 light style): headline "Join Loan Factory. We'll handle the rest.", pills, 5/3 split card, 8-step journey track, "You are here". Current card burnt orange #b8490a — Bao CONFIRMED keep it. Old CMS block above the form skipped on v1 only.
- Bao round 3 (IN PROGRESS when paused — check `docs/handoff/tdqcv/round3-v1-status.md`):
  1. Track "Your part" cards 1–5 clickable → jump to that step with the same guards as the left stepper (2 "Talk with us" → Pay step). Cards 6–8 not clickable.
  2. BUG: checks are positional (passing a step with Next marks Pay/Sign as ✓ though not paid/signed) — in BOTH the hero track and the left stepper. Fix = ✓ only from real stored status; passed-but-not-done shows caption: call "Waiting for your call"; pay "After your call" (locked) / "Not paid yet"; sign "After your call" / "Not signed yet"; NMLS "Not done yet". One shared pure function + unit tests. v1 only.
- To review again: `tok=$(~/.claude/bin/ram-gate acquire next-dev rlo-v1-review --wait 900)`; in the worktree `npx next dev -p 3100`; open http://localhost:3100/register-loan-officer-v1 (if hero shows raw `RegisterLoanOfficerForms.V1Hero.*` keys: `touch src/messages/*.json`).
- After Bao approves: commit in the worktree (hooks must run), push, mark #2627 ready, 2 reviewers + Repo Owner, merge to master (staging), then port the same v1 changes to lo-homepage (Bao: "làm tương tự cho lo-homepage").

### In progress — NEW route /register-loan-officer-v2 (bold dark hero, like mockup "Previous")
- Worktree `/Users/apple/Projects/agentflow/_worktrees/rlo-v2-bold`, branch `feat/register-lo-v2-bold` from origin/feat/register-lo-v1-round2 (a66decdc). UNCOMMITTED, not pushed. Status note: `docs/handoff/tdqcv/v2-bold-status.md`.
- Spec: same backend + same form logic as v1 (reuse BasicInfoFormV1 parts with a `.rlo-v2` skin; no business-logic fork), noindex, registered like v1 (grep "register-loan-officer-v1", RELEASE_PAGES), unlinked; old + v1 pages unchanged (prove with screenshots); fix the mockup overflow of "licensing@loanfactory.com sponsors you". Review on port 3101. Do not commit until Bao reviews.
- NOTE: v1 round 2/3 changes are uncommitted in the OTHER worktree, so v2 does not have the V1Hero/round-1 edits; merging the two branches later needs care (shared files: RegisterLoanOfficerForms/index.tsx, RegisterLoanOfficerView.tsx, V1Frame, messages).

### How to resume
1. Read this section + the two status notes above. `git -C <worktree> status` to see uncommitted work (it survives reboot).
2. Background agents do NOT survive a shutdown — spawn fresh dev-fe agents with self-contained prompts pointing at the worktree + status note. Rules: no commit/push until Bao reviews on localhost; ram-gate; cp -Rc node_modules; never bypass hooks.
3. Other open items: Bao to send Brayan reply; prod real-traffic confirmation; follow-up beads agentflow-lm8sc / agentflow-wcwfu (GetOp fallback removal now possible: prod serves the endpoint) / agentflow-uii15; moso#1756 deferred.
- UPDATE 18:05: v1 round 3 is CODE-COMPLETE (uncommitted; tsc/eslint clean; jest 74 passed), NOT yet seen in a browser. Open risk: Sign ✓ needs `lo_agreement_signed`/`paid_and_signed` in the getRegisterLoanOfficer response (unconfirmed; check on staging data — packs whitelist may need those 2 fields). v2 agent paused without writing v2-bold-status.md; inspect `git -C _worktrees/rlo-v2-bold status`.

## SHIPPED 2026-10-07 ~23:00 +07 (Bao approved after localhost review)
- lf-homepage #2627 (v1 rounds 1-4 + new /register-loan-officer-v2 + YoutubeWidget z-50) merged to master 5bf4ab15 → staging build SUCCESS; promoted via #2630 (05b95e6a, tree == master 5bf4ab15) → production build SUCCESS, Cloud Run lf-homepage-00733 at 100%. loanfactory.com /register-loan-officer, -v1, -v2 all 200; v1/v2 noindex, unlinked.
- packs #3636 (lo_agreement_signed on getRegisterLoanOfficer) on master + staging (SWAT chain ran by itself, deploy b 19:41 +07). Hotfix #3637 merged to 3.64.1 (cab47111) — WAITING for Khai: SWAT deploy_hot_fix v3.64.1. Until then the Sign step never shows a done check on prod (no crash).
- Reviews: TypeScript reviewer APPROVE, code reviewer + Repo Owner APPROVE + OWNER AGREE, browser smoke PASS (smoke-2627/).
- Follow-ups (non-blocking): sign status after the call but before paying should read "After you pay"; RegisterLoanOfficerForms/index.tsx 1276 lines + v2.css 2121 lines → split; page titles hardcoded English; YouTube popup clipped at 375 (pre-existing, all pages); lo-homepage port of v1/v2 (Bao: "làm tương tự cho lo-homepage") NOT started.
- Draft message to Victoria + Brayan asking them to review v1 vs v2 on staging is in the chat (Bao sends it).
- 2026-10-08 10:56 +07: packs prod GAE version `c` deployed (Khai) from 3.64.1 tip 2760f826, which contains #3637 (cab47111) → lo_agreement_signed is served on prod. Prod getRegisterLoanOfficer probe still 400 for a fake key (endpoint healthy). Not verified with a real signed record (would read real PII).
- SESSION CLOSED by Bao 08/10. Open (waiting on people, not on code): Victoria + Brayan choose v1 vs v2 (message sent by Bao) → then port ONLY the chosen variant to lo-homepage. Non-blocking cleanups: sign caption "After you pay" before the fee is paid; split RegisterLoanOfficerForms/index.tsx (1276 lines) + v2.css; i18n page titles.
