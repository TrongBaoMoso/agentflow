# Loan Officer programmes — version 4 preview source

Built output lives in `lf-homepage/public/lo-programs/v4/` and is what ships
(PR LoanFactory-Inc/lf-homepage#2166). This folder is the source it is built
from, kept here because the shipped files are single self-contained documents
with the font and every photograph inlined as data URIs — not something you
want to hand-edit.

Origin: the Claude Design canvas project `LO Programs`
(`LO Ambassador Program.dc.html`, `Producing LO Recruiter Program.dc.html`).
The canvas styles everything inline; that is preserved on purpose so the
markup still reads like the design. `src/common.css` carries only what an
inline style cannot express — `@font-face`, the hover/focus states the canvas
wrote as `style-hover` / `style-focus` attributes, the preview chrome and the
media queries.

## Build

    python3 build.py ../../../lf-homepage/public/lo-programs/v4

The script inlines `montserrat.woff2` and every `photos/*.jpg` referenced by an
`__IMG_<name>__` token, then refuses to write a file that still holds an
unsubstituted token or points at anything outside itself.

## Layout

| Path | What |
|---|---|
| `src/common.css` | shared stylesheet, `__FONT__` token |
| `src/<page>.body.html` | page markup, `data-when` blocks for the five viewer states |
| `src/<page>.js` | the data arrays and the behaviour the canvas expressed as component state |
| `photos/` | 18 portraits, 192 px, q72 |
| `build.py` | assembles head + preview toolbar + body + scripts, inlines assets |

## Data

Every name, NMLS number and photograph is invented. The portraits come from
randomuser.me. No real Loan Factory loan officer appears anywhere in v4, and
each page says so in its own footnote.
