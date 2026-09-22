# Stakeholder Transcripts

Raw meeting transcripts used as the shared, citable source of truth for requirements
gathering on the Tera Plus recruiting/onboarding redesign (and adjacent work).

## Why these live in the repo

Multiple Claude sessions read the same requirement material. If a transcript only
exists in one session's chat context, other sessions cannot verify a claim — they can
only trust it. Files here let any session open the exact line a claim came from.

## Naming

```
YYYY-MM-DD_<speakers>_<topic>.md
```

Examples:

```
2026-09-22_victoria-brian-benjamin_recruiting-pipeline-feedback.md
2026-09-__ _thuan_<topic>.md
2026-09-__ _antoine-ceo_<topic>.md
```

## Adding a transcript

Two steps, and that is all that is required of the person adding it:

1. Create a `.md` file in this directory.
2. Paste the transcript in, **keeping the original timestamps**.

Any filename is fine — a date and a name (`2026-09-15-thuan.md`) is enough. It will
be renamed to the convention below during processing.

## Processing (done by Claude, not by the person pasting)

After a raw transcript lands here, a pass adds:

- the front-matter block (below),
- a transcription-artifact glossary — this can only be written **after** reading the
  file, so it is never expected from whoever pastes it,
- the rename to `YYYY-MM-DD_<speakers>_<topic>.md`,
- entries in `conflict-register.md`.

Front-matter added during that pass:

```markdown
---
date: 2026-09-22
participants:
  - Victoria — Recruiting Manager (LoanFactory)
  - Brian — Recruiting Team Lead
topic: Interested Loan Officer pipeline — pain points, Tera Plus redesign input
source: Zoom auto-transcript (verbatim, uncorrected)
note: |
  Transcription artifacts: "palm line"/"pallet" = pipeline; "Bonso" = Bonzo; ...
---
```

## Do not clean up the text

Keep the text verbatim, including auto-transcription errors. A cleaned transcript is
an interpretation, and interpretations are exactly what we are trying to cross-check.
Mis-transcribed terms are handled by the glossary in the front-matter, not by editing
the body.

## Citation rule

Every requirement, conflict entry, or ticket derived from this material must be
**quote-anchored**: cite speaker + timestamp + the literal sentence. Never paraphrase
a stakeholder position without the quote that backs it.

Bad:  "Victoria doesn't want auto-assign."
Good: "Victoria, 28:05 — 'I'm going to uncheck the recruiter ... you can put here as
       an option still and add licensing and HR here.'"

## Conflict register

Stakeholders disagree. Conflicts are classified, not silently resolved:

| Type | Meaning | Handling |
|------|---------|----------|
| A | Genuine goal conflict — both understand correctly, want opposite outcomes | Escalate; a human decides |
| B | Different scope/role — both are right within their own scope | Design per-role configuration, do not pick a winner |
| C | Different points in time — policy changed between meetings | Newer wins; explicitly record that the older rule is dead |
| D | Same word, different meaning | Clarify the definition; the conflict usually dissolves |

The register lives at `conflict-register.md` in this directory.

## Related existing docs

Prior recruiting context already in `docs/` (read before deriving new requirements):

- `lo-recruiting-e2e-flow.md`
- `lo-recruiting-feature-review.md`
- `lo-recruiting-meeting-prep-victoria.md`
- `lo-recruiting-invite-to-join-design.md`
- `lo-recruiting-redesign-direction.md`

## Transcribing a new recording

Local whisper tool: `~/.local/share/claude-whisper/` (see its `README.md`).

```bash
~/.local/share/claude-whisper/venv/bin/python \
  ~/.local/share/claude-whisper/transcribe.py "/path/to/Recording.mp4" ./out-prefix
```

Run it **twice** — once as above, once with `--no-prompt` — and keep both. Vocabulary
priming changes *how* domain nouns are wrong rather than fixing them, so the unprimed
baseline is what tells you which terms are untrustworthy. Established on the 2026-08-11
licensing recording; see `2026-08-11_y_licensing-walkthrough.GLOSSARY.md`.
