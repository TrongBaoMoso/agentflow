# Feature‑Tour Video Playbook (reusable)

> Goal: produce a narrated, English‑subtitled screen‑recording that tours the implemented
> features of a web app — **the same way the `lf-chat-service` feature tour was made**.
> This playbook captures the exact pipeline AND every gotcha already solved, so a fresh
> agent does it **right and complete** without re‑discovering the traps.

**Reference implementation (copy this, don't reinvent):**
`/Users/apple/Projects/agentflow/docs/lo-recruiting-video/` — `narration.json`,
`build-narration.mjs`, `recorder/record.mjs`, `recorder/inspect.mjs`,
`recorder/assemble.mjs`, `storyboard.md`. The **harness is ~90% project‑agnostic** — adapt
only the scene functions (selectors/actions), `narration.json`, and the URL.

> ⚠️ **The original reference implementation is GONE.** It lived at
> `lf-chat-service/docs/video/` and was **never committed** — only empty directories and a
> `package-lock.json` survive. It had to be rebuilt from this playbook on 03/08/2026. Lesson
> now enforced by `docs/lo-recruiting-video/.gitignore`: **commit the scripts, ignore the
> artifacts** (audio clips, webm, markers, final mp4, and the `.auth/` session file).

---

## 1) Paste‑this prompt for a NEW session

```
Make a feature‑tour video for <PROJECT_NAME> (path: <ABS_PATH>, dev URL: http://localhost:<PORT><CHAT_OR_APP_PATH>),
in the SAME style and to the SAME standard as the lf-chat-service feature tour.

Follow the playbook at /Users/apple/Projects/agentflow/docs/feature-tour-video-playbook.md
and REUSE the proven scripts at /Users/apple/Projects/agentflow/lf-chat-service/docs/video/
(copy them into <ABS_PATH>/docs/video/ and adapt only the scenes, narration.json, and URL).

Requirements (same as before):
- US English voiceover (macOS `say -v Samantha`) + burned‑in English subtitles + a .srt file.
- 1080p screen recording driven by Playwright, with a visible synthetic cursor.
- I will START the FE and LOG IN myself; you open a fresh Chromium and record (single session — auth does not survive relaunch, so login + record happen in one run; expect to re‑login on each re‑record).
- Length is unconstrained. Cover every meaningful feature; demonstrate real interactions
  (scroll lists & content, type messages, emoji picker, attachments drag‑drop, reply/quote,
  react + manage reactions, edit/delete, lightbox, detail/side panels, in‑app search, filters,
  header controls — and "introduce only" any destructive/irreversible controls).

Before recording:
1. Use the `understand` plugin + parallel Explore agents to build a COMPLETE feature inventory
   and the exact UI strings + selectors (i18n en file, component markup).
2. Write a storyboard (acts/scenes: action + narration + selector for each beat) and let me review/add.
3. Confirm with me: narration voice (offer samples) and the login‑handoff method.
4. Pre‑build narration + durations + the record/assemble scripts (offline), then run a live
   selector `--probe`/inspect against the real DOM and FIX selectors before the real recording.
Then record, verify by extracting frames per scene, assemble, and send me the final .mp4.
```

Fill the `<...>` placeholders. If the project isn't a chat app, the same method applies — just
change the scene list to that app's features.

**Optional opening act — "you got an email → click → land in the app".** When the feature is
reached from a notification/transactional email (e.g. the lf-iq Homeowner Report, reached from
the backend `report_template.html`), start the video with a rendered REAL email and a CTA click
that navigates into the app. Don't hand‑draw a fake email. See **§9** for the full recipe.

---

## 2) Deliverable spec (definition of done)

- `docs/video/final/lf-... -feature-tour.mp4` — **1080p (1920×1080)**, H.264 + AAC stereo.
- **US voiceover** (macOS `say -v Samantha`, ~172 wpm, loudness‑normalized).
- **Burned‑in English subtitles**, bottom‑center, white w/ outline+shadow, synced to action.
- `subtitles.srt` shipped alongside (soft‑sub, editable/translatable).
- Login footage trimmed off; video starts cleanly on the app screen.
- Every requested feature shown with a REAL interaction (not just narration over a static screen).
- Destructive/irreversible controls (logout, switch profile, etc.) are **introduce‑only** (hover/show, no click).

---

## 3) Local tooling (all offline — no cloud keys)

| Need | Use | Notes |
|---|---|---|
| Screen recording | **Playwright** (`launch` headed + `recordVideo` 1920×1080) | `npx playwright install chromium` in a local recorder dir |
| Voiceover (TTS) | **macOS `say -v Samantha`** | No ElevenLabs/fal.ai key available. Confirm voice with user (render samples). |
| Audio/video mux | **ffmpeg** (`/usr/local/bin`, v8.x) | ⚠️ built **without libass/libfreetype** → see §6 |
| Caption rendering | **Playwright Chromium** → transparent PNG → `overlay` | because no `subtitles`/`ass`/`drawtext` filter |
| Cursor | injected synthetic cursor (Playwright recordVideo has none) | follows `mousemove`, grows on `mousedown` |

Probe first: `which ffmpeg`, `say -v '?' | grep en_US`, `node -v`, free dev ports.

---

## 4) Pipeline (step by step)

1. **Understand the codebase.** Check for `.understand-anything/knowledge-graph.json`; use the
   `understand` plugin. Dispatch parallel **Explore** agents to produce: feature inventory,
   exact English UI strings (i18n `en` file), and per‑feature selectors (component markup).
2. **Probe env** (ffmpeg, voices, node, ports).
3. **Storyboard** — acts → scenes; each scene = `{action, narration, selector}`. User reviews/augments.
4. **Narration** — `narration.json` = `[{id, act, text}]` → `build-narration.mjs` renders each
   line (`say -v Samantha`), `loudnorm`, 48k stereo WAV, writes `durations.json`.
   Keep text **TTS‑friendly** (spell out/avoid acronyms like "XMPP" — they get mispronounced).
5. **Sample assets** — generate any files needed (e.g., images to drag‑drop) via `gen-images.mjs`
   (HTML→PNG screenshot; ffmpeg `drawtext` is NOT available here).
6. **Recorder** (`record.mjs`) — single session: launch headed Chromium → `newContext({recordVideo})`
   → inject cursor → `goto(URL)` → **wait‑for‑login loop** → run scene functions (each holds
   `max(actionTime, narrationDur)+gap`) → write `markers.json` `{videoTrimSec, videoPath, scenes:[{id,offset}]}`.
7. **Validate selectors live** — run an `--probe`/`inspect` pass against the real DOM (login once),
   dump element counts + screenshots, FIX selectors. Iterate cheaply before the real record.
8. **Record** (user logs in), then **verify** by extracting a frame per scene at `videoTrimSec+offset`.
9. **Assemble** (`assemble.mjs`) — trim login → build master narration track → SRT → caption PNGs →
   overlay‑burn + mux → `final/*.mp4`. Verify frames + audio stream.
10. **Deliver** the mp4 (+ srt). Offer no‑re‑record tweaks vs re‑record changes.

---

## 5) Sync model (how audio/subs line up with video)

- Each scene logs `offset = now − demoStart` into `markers.json`; the scene then **holds** until
  `narrationDuration + GAP(0.6s)` has elapsed, so the video always lasts ≥ the narration.
- `assemble.mjs` places each narration clip at its `offset` via `adelay`+`amix` over an `anullsrc`
  bed, and times each subtitle cue to the same offset → audio, subs, and video stay aligned.
- Wrap each scene in try/catch; a failed scene becomes a no‑op (narration still plays) instead of crashing.

---

## 6) CRITICAL gotchas (these already bit us — don't repeat) ⚠️

1. **Auth doesn't survive browser relaunch.** Cookies are session cookies + tokens in
   `sessionStorage` → a fresh context = logged out. **Login + record in ONE session.** Re‑login on
   every re‑record. (Persistent profile / storageState did NOT keep the session.)
2. **ffmpeg has NO libass/libfreetype** → no `subtitles`/`ass`/`drawtext` filters. Burn captions by
   rendering each cue to a **transparent PNG** (Chromium, `omitBackground:true`,
   **`deviceScaleFactor:1`** — 2 doubles pixels and overflows the frame) and `overlay` them with
   `enable=between(t\,START\,END)`. **Escape commas** in filtergraph values (`\,`) because
   `execFileSync` runs with **no shell** to protect them.
3. **Two webms can appear** (SSO opens a 2nd tab). Don't pick "largest file". Write the exact
   driven page's `await page.video().path()` into `markers.json` and use it.
4. **Hover action buttons:** the `.group` (group‑hover) class is on the **message bubble**, not the
   row. Hover the **bubble** (row center lands in empty space beside side‑aligned bubbles). Buttons
   are descendants → click them **directly** (don't glide the cursor through the gap, or `:hover`
   drops and they disappear before the click).
5. **List reorders by recency.** Don't trust "first row". Open a **deterministic** target (e.g. a
   GROUP by its type badge, not a 1‑1). Do any conversation‑switch scene (1‑1) **LAST** so it can't
   drift the earlier scenes. Re‑opening "the same" item by index is unreliable.
6. **Scope selectors to regions.** `[class*="cursor-pointer"]` etc. also match the left list →
   scope modal actions to `.mantine-Modal-*` and side‑panel actions to their accordion/tabs, so a
   click can't accidentally switch context.
7. **Icons:** Tabler v3 renders `svg.tabler-icon-<name>` (e.g. `tabler-icon-info-circle`,
   `tabler-icon-search`, `tabler-icon-switch-horizontal`). Mantine `ActionIcon`s in headers have
   **no `title`** → target by the tabler svg class, not by title/tooltip (tooltips are portals).
8. **TTS pronunciation:** avoid raw acronyms/symbols in narration text.
9. **Synthetic cursor required** — Playwright `recordVideo` shows no cursor. Inject one via
   `addInitScript`.
10. **Confirm with the user up front:** narration voice (send samples) and login‑handoff method.
    Tell them re‑records each need a login.

---

## 7) Keyword cheat‑sheet

`understand plugin` · `parallel Explore agents → feature inventory + i18n en strings + selectors` ·
`storyboard (act/scene: action+narration+selector)` · `narration.json → say -v Samantha → loudnorm WAV → durations.json` ·
`Playwright headed + recordVideo 1920x1080` · `single session (no auth persistence)` · `wait‑for‑login loop` ·
`synthetic cursor injection` · `per‑scene hold = max(action, narrationDur)+0.6s` · `markers.json {videoTrimSec, videoPath, scenes}` ·
`--probe/inspect live DOM → fix selectors` · `hover bubble not row` · `direct click action buttons` ·
`open GROUP deterministically, 1‑1 LAST` · `scope to .mantine-Modal-*/panel` · `tabler-icon-<name>` ·
`introduce‑only destructive controls` · `trim login (videoTrimSec)` · `master audio: anullsrc + adelay + amix` ·
`captions = PNG overlay (no libass), deviceScaleFactor 1, escape commas \,` · `verify by frame extraction` ·
`email‑intro: compile REAL template (Thymeleaf‑lite subst + inline/stub fragments) → static html → CTA click navigates in‑place → app` ·
`deliver mp4 + srt`.

---

## 8) What to copy vs adapt

- **Copy as‑is:** `build-narration.mjs`, `gen-images.mjs`, and the harness/helpers in `record.mjs`
  (cursor, `glide/moveTo/click/typeInto/smoothScroll/scrollableNear`, `scene()` pacing, markers),
  and **all of `assemble.mjs`** (trim → master audio → SRT → caption PNGs → overlay burn → mux).
- **Adapt per project:** `narration.json` (the lines), the `run(page)` **scene functions**
  (selectors + actions for that app), the URL/path, sample assets, and the storyboard.
- **Reuse the inspect scripts** (`inspect.mjs`/`inspect2.mjs`) to validate the new app's selectors.
- **Add for an email‑intro:** `recorder/build-email-intro.mjs` + a `sceneEmailIntro(page)` scene
  (see §9). Both are reusable across apps — only the template path, the data, and the CTA selector change.

---

## 9) Email‑intro scene (render a REAL backend email, click its CTA → app) ✉️

Use this when the feature is reached **from a transactional email** (e.g. the lf-iq Homeowner
Report opened from the backend `report_template.html`). The point is authenticity: render the
**real template**, fill it with data that matches the demo record, and let the synthetic cursor
click the real CTA so the browser **navigates into the app on camera** — that transition is the
bridge into the main tour. Never hand‑draw a fake email.

### Recipe

1. **Locate the real template.** Spring/Thymeleaf emails live under
   `src/main/resources/templates/<locale>/<name>.html` (lf-iq example:
   `lfiq-backend/src/main/resources/templates/en/report_template.html`). Note the data
   placeholders from its `args/<name>.args.json` sidecar (lf-iq: `ownerName`, `streetAddress`,
   `cityStateZip`, `avmValueFormatted`, `valueIncrease`, `reportUrl`, `agents[]`) and the CTA
   (lf-iq: orange `#ff6b35` link `🚀 View Complete Report`, `<a th:href="${reportUrl}">`).

2. **`build-email-intro.mjs` — compile the template to a static, self‑contained HTML.** It is a
   pure offline transform (no Spring needed):
   - Read the template + any referenced fragments (`th:replace="~{team-section :: ...}"`,
     `~{en/footer :: ...}`). **Inline or stub** each fragment — an unstubbed `th:replace` row
     renders empty.
   - Apply the Thymeleaf‑lite substitution: for `th:text="${x} ?: 'fallback'"` set the element's
     text to `data[x] ?? fallback`; for `th:href="${x} ?: '#'"` set the href; for list/`th:each`
     blocks (e.g. `agents`) expand from `data`. Strip any leftover `th:*` attrs (Chromium ignores
     them, but `th:text` won't populate text unless you apply it).
   - **Sanitize smart quotes / Thymeleaf literals** copied from the template (the lf-iq team
     row uses `’ … ’` and `|…|`) — replace with plain text so they don't break parsing.
   - Set `data.reportUrl` = the **exact local report URL the user gives you** (e.g.
     `http://localhost:3000/en/<reportId>`), so the CTA navigates to the real demo report.
   - Optionally wrap in minimal **inbox chrome** (sender row + avatar + subject
     "Your Monthly Home Report is ready") on the template's own `#f5f7fa` bed, so it reads as an
     inbox. Keep the email body the untouched real template.
   - The email is **600px wide** → on a 1920×1080 frame it's tiny. Center it and scale up with a
     CSS `transform: scale(~1.4)` (transform‑only — never animate width/height) so it fills the
     frame; keep `deviceScaleFactor:1` to match the rest of the pipeline.
   - Write `docs/video/assets/email-intro.html`.

3. **`sceneEmailIntro(page)` — first scene in `record.mjs`'s `run(page)`:**
   - `await page.goto('file://…/assets/email-intro.html')` (same page/context as the rest).
   - Hold for its narration; glide the cursor to the CTA
     (`page.getByRole('link', { name: /View Complete Report/i })` or scope to the orange button),
     then **click it**.
   - The click navigates the **same page** to `reportUrl` → keep it in one context so the single
     `recordVideo` captures the email → report transition continuously. `await page.waitForURL(/…/)`
     then `waitFor` a stable report selector before the next scene starts.

### Watch out (email‑intro specific)

- **Same page, no new tab.** Navigate in place (`<a>` default), not `target="_blank"`, or the
  continuous video breaks and you get a second webm (cf. §6.3).
- **Auth vs link‑viewable.** If the report URL needs a session, the click lands on a login page.
  Either confirm the URL is link‑viewable, **or** log in first (off‑camera, trimmed via
  `videoTrimSec`) so the in‑video click lands on the real report (cf. §6.1).
- **Unresolved fragments/placeholders render empty** — verify the compiled `email-intro.html` in a
  browser (owner name, address, value, CTA href all populated) BEFORE recording.
- **TTS** for the intro line: spell things out as in §6.8 (e.g. "Loan Factory I‑Q", not "LFIQ").
- **Frame the value, not the chrome** — the email exists to motivate the click; keep the intro
  short (one or two narration beats) and let the report tour carry the runtime.
