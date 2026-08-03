# LO Recruiting — role walkthrough video

Narrated, English-subtitled screen recording of the legacy LO Recruiting system, one act per role.
Pipeline and gotchas: [`../feature-tour-video-playbook.md`](../feature-tour-video-playbook.md).
Scene-by-scene plan: [`storyboard.md`](storyboard.md).

## Hard rules (read before recording)

1. **Never type credentials.** Bao logs in himself, on camera-off. Scripts wait for login; they
   never fill a password field, and no password/token goes into any file in this repo.
2. **Never print, `cat`, log or paste the contents of the `.auth` / `storageState` file.** It is a
   live session. Reference it by path only. It must stay out of git.
3. **Staging sends REAL email.** Any address typed during a recording must be a throwaway
   temp-mail address — never a colleague's, a candidate's, or a real LoanFactory inbox.
4. Destructive / irreversible controls (logout, delete, switch profile, bulk actions) are
   **introduce-only**: hover and describe, never click.
5. Login footage is trimmed out via `videoTrimSec`, but it is still recorded — do not put anything
   on screen during login that must not be captured.

## Run the three steps in order

```bash
# 0) one-time setup
cd recorder && npm install && npx playwright install chromium && cd ..

# 1) AUDIO — render the voiceover and find out how long the video will be
node build-narration.mjs

# 2) RECORD — Bao logs in when prompted; one browser context per act
cd recorder
npm run probe -- --act 1    # read-only selector probe (inspect.mjs). Do this per act, fix, repeat.
npm run record

# 3) ASSEMBLE — trim, concat, mix narration, burn subtitles, mux, verify
npm run assemble
```

Re-runs: step 1 is incremental (only re-renders clips whose narration changed; `--force` for all).
Step 3 is safe to re-run any time. Step 2 needs a fresh login every time — session auth does not
survive a browser relaunch.

## What each step produces

| Step | Output | What it is |
|---|---|---|
| 1 | `audio/clips/<id>.wav` | One narration clip per scene. 48 kHz stereo, loudness-normalized. |
| 1 | `audio/durations.json` | `{ "<id>": seconds }` measured on the final WAV. The recorder holds each shot at least this long; the assembler uses it to place audio and time subtitles. |
| 1 | console summary | Per-act subtotals + **total estimated runtime**, so you know the length before recording. Also warns about acronyms the TTS will mispronounce. |
| 2 | `recorder/markers.json` | `{ videoTrimSec, videos: [{ act, videoPath, scenes: [{ id, offset }] }] }` — one entry per act video, with the exact `videoPath` (never glob for a webm). |
| 2 | `recorder/video/*.webm` | Raw 1920×1080 footage, one file per act. |
| 3 | `final/lo-recruiting-role-walkthrough.mp4` | **The deliverable.** 1920×1080 H.264 + AAC stereo, burned-in subtitles, one chapter per act. |
| 3 | `final/subtitles.srt` | Soft subs, same cue segmentation as the burned-in layer. Editable / translatable. |
| 3 | `final/verify/<id>_<t>s.png` | One frame per scene at its adjusted offset. **Eyeball these before sending the mp4.** |
| 3 | `final/work/` | Intermediates: `master.wav`, filtergraph scripts, chapter metadata. Kept for debugging. |

## Notes that will save you an hour

- **Narration voice/pace:** macOS `say -v Samantha -r 140`. `say -r` quantizes into coarse bands —
  the default rate runs ~197 wpm (14% over the 172 wpm target); `-r 110…150` all land at ~180 wpm.
  Details in the header comment of `build-narration.mjs`.
- **Subtitles are PNG overlays, not libass.** This ffmpeg has no `libass`/`libfreetype`, so there is
  no `subtitles`, `ass` or `drawtext` filter. Each cue is rendered in Chromium at
  `deviceScaleFactor: 1` and burned with `overlay … enable=between(t\,S\,E)`.
- **Cues are split per sentence, not per scene.** Narration runs 3-4 sentences per scene, so each
  scene becomes several contiguous cues sharing that scene's clip duration, max 2 lines × ~42 chars.
- **Multiple act videos** are concatenated in act order; each act's scene offsets are shifted by the
  cumulative length of the preceding acts, so audio, subtitles and verify frames stay aligned.
- **Impersonation has no way back to admin** — logging in as another user replaces the whole browser
  session. That is why acts are recorded in role order; see `storyboard.md` §3.
