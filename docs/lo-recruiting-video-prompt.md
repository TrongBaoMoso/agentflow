# LO Recruiting — Role Walkthrough Video (prompt tái sử dụng)

Mục đích: quay video ghi lại **từng hành động của từng role** khi recruit 1 LO trên system cũ
(`www.viet18.com`), để làm bằng chứng pain point cho bản rebuild trên Tera+.

Lồng tiếng **tiếng Việt** (macOS `say -v Linh`), phụ đề **tiếng Anh** burned-in + `.srt` tiếng Anh.
Sample giọng đã test 03/08/2026: Linh đọc được, thuật ngữ tiếng Anh cần phiên âm trong field `vi`
(xem quy tắc `narration.json` bên dưới).

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

=== AUDIO / SUBTITLE SPEC (this is the part that differs from the lf-chat-service tour) ===
- Voiceover: VIETNAMESE, macOS `say -v Linh` (vi_VN, already installed and approved).
- Subtitles: ENGLISH, burned-in, plus an English `.srt`. Also emit a Vietnamese `.vi.srt`
  as a secondary track (not burned in).
- `narration.json` carries TWO strings per segment:
    { "id": "act1_s3",
      "vi": "…Mô-đex… số En Em Eo Ét…",   // TTS INPUT — phonetically respelled so Linh reads it well
      "en": "…Modex… the NMLS number…" }  // SUBTITLE TEXT — correct English spelling
  Rules:
  * Timings are derived from the VIETNAMESE audio (ffprobe each generated segment).
    The English subtitle inherits its segment's start/end verbatim — never re-time from
    English text length.
  * One `vi` segment == one `en` segment. Never split or merge across the two tracks,
    or the whole track drifts.
  * `vi` may phonetically respell English product terms (Mô-đex, En Em Eo Ét, Cờ-ren-đờ-la)
    so the Vietnamese voice is intelligible; `en` always keeps the real spelling
    (Modex, NMLS, Calendly) so it matches the on-screen UI.
  * English subtitle wrapping: max 2 lines, ~42 chars/line. If the English rendering of a
    segment exceeds that, shorten the English (it's a subtitle, not a transcript) rather
    than extending the segment.
- Reminder: local ffmpeg has NO libass. Subtitles are Playwright-rendered PNG overlays per
  the playbook. Render the ENGLISH text; also verify Vietnamese diacritics render correctly
  in the pain-point badges if any Vietnamese survives on screen.
- On-screen pain badges: ENGLISH ("Pain #17 — recruiter copies NMLS into another site by hand")
  so the burned-in layer is one language throughout.

=== ENVIRONMENT & AUTH (staging — safe to touch) ===
- Staging data: submit / change / create / update are ALLOWED. Still: don't delete records
  you didn't create yourself, and never touch the Modex portal.
- I will LOG IN MYSELF as admin "Chau Chau" at https://www.viet18.com/login inside the
  recorded Chromium (single session — auth does not survive relaunch; expect me to
  re-login on each re-record). You NEVER type credentials.
- Role switching: as admin, search "Associates" → find the account → "Login as".
  Accounts (all staging test accounts):
  - HR:                  Ken Customer            — test10990305@test.com
  - Licensing:           Chu Con Gi Nua Testcase — chuconginua@viet18.com
  - Recruiter (Outside): Luis Testcase 635211    — luis7522333@viet18.com
  - Recruiter (Inside):  Nocha Hien              — test4591872@test.com
  - Onboard Specialist:  Maria Testcase          — m123123aria@test.com
  - Accounting:          Admin Request           — admingiftrequestor@viet18.com
- PRE-FLIGHT CHECK: verify the login-as ROUND-TRIP (role → back to admin) works without
  re-entering credentials. If each switch needs a fresh admin login, plan the act order
  accordingly and tell me the schedule so I stay nearby to re-login between acts.
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
- PAIN-POINT CALLOUTS: when a scene shows a documented pain point, overlay the English
  badge synced with the narration, and log it for the index.
- Length unconstrained.

=== BEFORE RECORDING ===
1. Read the 3 context docs, then explore the module LIVE per role (login-as each account,
   walk the menus) → complete per-role screen/action inventory + exact UI strings + selectors.
2. Write a storyboard (act/scene: role, screen path, action, `vi` narration, `en` subtitle,
   selector, pain-point refs) and let me review/add.
3. Confirm with me: the login-as handoff schedule, and play me 2–3 assembled sample
   segments (Vietnamese audio + English burned-in subtitle) before committing to the full run.
4. Pre-build narration + durations + record/assemble scripts offline, then run a live
   selector --probe against the real DOM and FIX selectors BEFORE the real recording.
Then record act-by-act (per-act re-record is fine), verify by extracting frames per scene,
assemble, and send me the final .mp4 + .srt (EN) + .vi.srt + a PAIN-POINT INDEX
(markdown table: timestamp → role → screen → pain #).

If anything is unclear or you get BLOCKED (permission wall, missing data, broken staging
flow), STOP and ask me instead of guessing.
```
