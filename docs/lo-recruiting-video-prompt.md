# LO Recruiting — Role Walkthrough Video (prompt tái sử dụng)

Mục đích: quay video ghi lại **từng hành động của từng role** khi recruit 1 LO trên system cũ
(`www.viet18.com`), để làm bằng chứng pain point cho bản rebuild trên Tera+.

Lồng tiếng **tiếng Anh** (macOS `say -v Samantha`) + phụ đề **tiếng Anh** burned-in + `.srt`.
Giọng tiếng Việt `say -v Linh` đã test và **loại** ngày 03/08/2026 — chất giọng nghe không được,
và đọc chậm hơn ~30% cho cùng nội dung (25s vs 19.4s). Không thử lại.

Paste nguyên khối dưới đây vào một session mới.

---

```text
Make a role-by-role walkthrough video of the OLD "LO Recruiting" module on staging
https://www.viet18.com — in the SAME style and to the SAME standard as the
lf-chat-service feature tour.

GOAL (this is the point of the whole video): document, step by step, EVERY action each
role performs to recruit ONE Loan Officer end-to-end — every screen they open, every
tab, every button, every filter, every form field — so we can SEE each role's pain
points in the old system. This video is evidence for the Tera+ rebuild, so the
narration must call out pain points at the exact moment they appear on screen.

Follow the playbook at /Users/apple/Projects/agentflow/docs/feature-tour-video-playbook.md
and REUSE the proven scripts at /Users/apple/Projects/agentflow/lf-chat-service/docs/video/
(copy them into /Users/apple/Projects/agentflow/docs/lo-recruiting-video/ and adapt only
the scenes, narration.json, and URLs).

CONTEXT DOCS — read these FIRST, the screens are already audited, don't re-derive:
- docs/lo-recruiting-e2e-flow.md            → 8-stage flow + per-role swimlanes (acts follow this)
- docs/lo-recruiting-feature-review.md      → screen-by-screen audit of the old module
- docs/lo-recruiting-redesign-direction.md  → 17 pain points (P0-1…P0-17); narration cites them by number

=== AUDIO / SUBTITLE SPEC ===
- ALL ENGLISH, exactly like the lf-chat-service tour: US English voiceover
  (macOS `say -v Samantha`) + burned-in English subtitles + an English `.srt`.
  No Vietnamese anywhere in the deliverable. A Vietnamese voice (`say -v Linh`) was
  tested and rejected on 03/08/2026 — do not revisit it.
- `narration.json` keeps the lf-chat-service single-field shape: one English string per
  segment, durations measured off the generated audio with ffprobe. No parallel tracks.
- Subtitle wrapping: max 2 lines, ~42 chars/line. If a segment's text exceeds that,
  shorten the line (it's a subtitle, not a transcript) rather than stretching the segment.
- Reminder: local ffmpeg has NO libass. Subtitles are Playwright-rendered PNG overlays per
  the playbook.
- On-screen pain badges in English too, e.g.
  "Pain #17 — recruiter copies NMLS into another site by hand".

=== ENVIRONMENT & AUTH (staging — safe to touch) ===
- Staging data: submit / change / create / update are ALLOWED. Still: don't delete records
  you didn't create yourself, and never touch the Modex portal.
- AUTH — ONE manual login per recording run, in the Playwright window:
  * viet18.com keeps its session in an HttpOnly cookie. Verified 03/08/2026: a fresh tab in
    my Chrome lands authenticated on /prospects/Mine while localStorage/sessionStorage hold
    NO token and no JS-readable session cookie exists.
  * DEAD ENDS — all three were tested on 03/08/2026, do NOT retry them:
    (a) Reading the session out of my Chrome by script — impossible, cookie is HttpOnly.
    (b) Copying the Chrome profile's Cookies DB into a Playwright profile and launching
        `channel:'chrome'` — cookie values are Keychain/app-bound encrypted; only 5 of
        thousands of cookies survived and /prospects/Mine rendered the Login screen.
    (c) `connectOverCDP` into my running Chrome — Chrome 151 (anything ≥136) refuses
        --remote-debugging-port on the default profile unless --user-data-dir points
        somewhere else, which is a blank profile with no session. Also `recordVideo` cannot
        be set on a CDP default context, so it would leave the proven pipeline anyway.
    (d) My Chrome autofills the login form, but that autofill lives in my real Chrome
        profile only — a Playwright-launched browser sees an empty form. It does not help.
  * SO: at the start of a recording run, open https://www.viet18.com/login in the Playwright
    window and hand it to me. I type the admin ("Chau Chau") credentials MYSELF — you NEVER
    type credentials, and you never read them from anywhere.
  * IMMEDIATELY after I log in, save `context.storageState({ path:
    docs/lo-recruiting-video/.auth/viet18-admin.json })` (gitignore that path) and then TEST
    whether it survives a relaunch: kill the browser, launch a new context seeded with that
    file, hit /prospects/Mine, and check the page is the app and not the Login screen.
    - Survives → I never log in again until the cookie expires. Say so, and use it for every
      later run and re-record.
    - Doesn't survive → that's the known lf-chat-service behaviour (playbook gotcha #1).
      Then plan for ONE login per run and record ALL acts inside that single session.
  * NEVER read, print, cat, or copy the contents of that file — it holds a live session cookie.
- Role switching: as admin, search "Associates" → find the account → "Login as".
  Accounts (all staging test accounts):
  - HR:                  Ken Customer            — test10990305@test.com
  - Licensing:           Chu Con Gi Nua Testcase — chuconginua@viet18.com
  - Recruiter (Outside): Luis Testcase 635211    — luis7522333@viet18.com
  - Recruiter (Inside):  Nocha Hien              — test4591872@test.com
  - Onboard Specialist:  Maria Testcase          — m123123aria@test.com
  - Accounting:          Admin Request           — admingiftrequestor@viet18.com
- Role switching costs no password: it happens INSIDE the app (admin → Associates → Login as).
  Snapshot storageState after each switch (one file per role) so any single act can be
  re-recorded on its own later without touching the others.
- ⚠️ Impersonation has NO way back: clicking "Login" swaps the session for the WHOLE browser
  and there is no "Back to admin" — the only exit is logout + log in again (audit §10.3).
  With 7 role switches that is the single biggest risk of the shoot. So the storageState
  survival test above is not optional — it decides whether I log in once or seven times.
  Save a storageState file per role right after each login-as, so a single act can be
  re-recorded later without replaying the earlier acts.
- The storyboard is already written: docs/lo-recruiting-video/storyboard.md — 8 acts, scene
  tables with the narration intent per scene, plus the shoot-risk list. Read it and refine
  it; do not start a new one from scratch.
- If any flow needs a NEW email inbox (invite a candidate, verification email, e-sign…),
  use https://temp-mail.org/vi/ (click "Xoá" for a fresh address) and show the received
  email on camera as part of the scene.

=== VIDEO STRUCTURE ===
ONE long video with chapter markers per act (the recruiting story is continuous — don't
cut it into per-role clips). Create ONE fresh test candidate with a temp-mail address and
follow that SAME person through every role. Act order below follows
docs/lo-recruiting-e2e-flow.md; if the old system's real sequence differs, adjust and flag
it at storyboard review.
- Act 0 — Admin overview (Chau Chau): the recruiting board/tabs incl. "Loan Officers
  Obtained from Modex", the /lo_recruiting_config page; introduce the cast of roles.
- Act 1 — Outside Recruiter (Luis): find/create the candidate, first contact — every
  filter, column, sort, click on the board.
- Act 2 — Inside Recruiter (Nocha): the same pipeline from the inside view — show
  view/permission DIFFERENCES vs Luis explicitly (side-by-side narration).
- Act 3 — Licensing (Chu Con Gi Nua): NMLS / licensing steps on the candidate.
- Act 4 — HR (Ken): offer / paperwork steps.
- Act 5 — Onboard Specialist (Maria): accounts / training / onboarding checklist steps.
- Act 6 — Accounting (Admin Request): comp / payroll / referral-payout (gift request) steps.
- Act 7 — Wrap-up: the candidate's final state + montage of every pain point encountered.

=== REQUIREMENTS (same standard as the lf-chat-service tour) ===
- 1080p screen recording driven by Playwright, visible synthetic cursor.
- REAL interactions: type real values, apply real filters, submit real forms (staging
  allows it), open every tab/panel/modal each role uses. "Introduce only" anything that
  can't be completed safely.
- NARRATION MUST EXPLAIN THE **WHY**, NOT DESCRIBE THE SCREEN. This is the single most
  important quality bar of this video. For EVERY action — each button click, each status
  change, each filter, each field typed — the narration answers: what is this person
  trying to accomplish in their job, what happens downstream if they do it, and what
  breaks if they skip it. Aim for a viewer who has never seen the system to finish an act
  able to describe that role's actual daily job.
  * BAD:  "Now we click Save, then change the status to Contacted."
  * GOOD: "Luis changes the status to Contacted because that is the only signal the
          inside recruiter has that this LO has already been called — there is no shared
          activity log, so if he forgets this dropdown, Nocha will call the same person
          tomorrow."
  * State plainly when an action exists only to work around a system limitation
    (re-typing data the system already holds, keeping a private spreadsheet, checking
    another site) — those moments are the whole point of the video.
  * Every act ends with one sentence naming that role's single worst friction.
- PAIN-POINT CALLOUTS: when a scene shows a documented pain point, overlay the English
  badge synced with the narration, and log it for the index.
- Length unconstrained.

=== BEFORE RECORDING ===
1. Read the 3 context docs, then explore the module LIVE per role (login-as each account,
   walk the menus) → complete per-role screen/action inventory + exact UI strings + selectors.
2. Write a storyboard (act/scene: role, screen path, action, narration, selector,
   pain-point refs) and let me review/add.
3. Confirm with me: the login-as handoff schedule, and play me 2–3 assembled sample
   segments before committing to the full run.
4. Pre-build narration + durations + record/assemble scripts offline, then run a live
   selector --probe against the real DOM and FIX selectors BEFORE the real recording.
Then record act-by-act (per-act re-record is fine), verify by extracting frames per scene,
assemble, and send me the final .mp4 + .srt + a PAIN-POINT INDEX
(markdown table: timestamp → role → screen → pain #).

If anything is unclear or you get BLOCKED (permission wall, missing data, broken staging
flow), STOP and ask me instead of guessing.
```
