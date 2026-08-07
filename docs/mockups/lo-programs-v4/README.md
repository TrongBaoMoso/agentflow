# Loan Officer programmes — version 4 preview source

Built output lives in `lf-homepage/public/lo-programs/v4/` and is what ships
(PR LoanFactory-Inc/lf-homepage#2170). This folder is the source it is built
from, kept here because the shipped files are single self-contained documents
with the font and 27 photographs inlined as data URIs — not something you want
to hand-edit.

Origin: the Claude Design canvas project `fbd2f9e6-e992-4a6f-ada4-9f2abd861443`
(`LO Ambassador Program.dc.html`, `Producing LO Recruiter Program.dc.html`,
`Program Admin.dc.html`). An earlier v4 came from a *different* canvas project
that v3 had already been built from, which is why the two looked the same; this
replaces it.

## Build

    python3 build.py ../../../lf-homepage/public/lo-programs/v4

## The one thing that will bite you

The canvas writes inline styles in React's camelCase — `fontSize`,
`borderRadius`, `flexWrap`. A browser **silently ignores** those in a real
`style` attribute, so a straight copy of the canvas markup renders unstyled.
`build.py` rewrites every declaration to kebab-case and aborts if one survives.
Keep authoring `*.body.html` in the canvas's own camelCase (so the markup still
diffs against the design) and kebab-case inside the `*.js` strings, which the
rewriter does not touch.

## Layout

| Path | What |
|---|---|
| `src/common.css` | base + the hover/focus states the canvas wrote as `style-hover` |
| `src/_chrome.css` | preview bar, lifted verbatim from lf-homepage#2169 so all versions match |
| `src/<page>.body.html` | page markup; `data-when` marks the five viewer states |
| `src/<page>.js` | data arrays and the behaviour the canvas held in component state |
| `photos/lg` | 27 portraits at 320px — the 230px directory cards |
| `photos/sm` | the same 27 at 96px — admin rows and the 52px chips |
| `build.py` | assembles head + preview bar + body + scripts, inlines assets, asserts |

## Data

Every name, NMLS number and photograph is invented; portraits come from
randomuser.me. No real Loan Factory loan officer appears anywhere in v4, and
each page says so in its own footnote.
