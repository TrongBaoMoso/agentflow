# The two recruiting landing pages — plain-language revision

**Why this exists.** Thuan, 19 Aug 2026: *"Can you make the two landing page become easier to
understand? It is still difficult to understand. Please ask 2 loan officers and Harry give feedback.
Everyone should QUICKLY understand these two programs."*

Live pages under review:

- <https://www.loanfactory.com/ambassador-program>
- <https://www.loanfactory.com/lo-recruiter-program>

Revision preview (mockup, not live): `docs/mockups/lo-programs/v2-ambassador.html` and
`v2-recruiter.html`.

Nothing about either program changed. Every number, level, threshold and bonus figure is the same.
What changed is the order the page says things in, and the words it says them with.

---

## 1. What is actually making them hard

### The problem both pages share

**Neither page admits the other one exists.** A loan officer who lands on either page has no way to
tell whether they are on the right one. The two programs are genuinely different — one is a side
activity for people already employed here, the other is a full-time job — and nothing on either page
draws that line. That is almost certainly the root of "still difficult to understand": the reader is
not confused about a paragraph, they are confused about which program they are reading.

### Recruiter page — two lines that can be read backwards

| Line on the live page | How it is meant | How it reads |
|---|---|---|
| "12+ verified units to qualify" | The **candidate** you recruit must have 12+ closed loans | **You** need 12+ closed loans to apply |
| "Get paid per unit" | Paid per recruiting month, on the combined production of that month's hires | Paid a fixed amount for each loan |
| "Up to $30,000 per month" | The top of the one-time bonus scale | A monthly salary of $30,000 |

Those three are not style problems. A reader who takes any of them the wrong way has understood the
program wrongly, and two of the three make the job sound like something they are not qualified for.

Also on that page:

- The bonus table is 30 rows and 60 numbers, and there is no worked example anywhere before it.
- The page never states the basics of a job posting: that this is full-time, who you report to, that
  the bonus is on top of the role rather than instead of it.
- "unit", "verified", "trailing 12-month", "locked recruiting month", "KPI" — all undefined.

### Ambassador page — the money is hidden

- The headline is **"Recruit. Earn. Get Supported."** Three verbs with no object. It does not say
  who it is for or what you get.
- The opening sentence is written from the company's side: *"...helps Loan Factory LOs and staff
  support our recruiting efforts."* The reader is looking for what they get.
- The first concrete fact on the page is Level 1's budget: **None**. The page opens by telling you
  you get nothing.
- The thing you actually get paid — the referral bonus on every loan officer who joins — appears
  once, as a bullet, with no amount and no explanation, below the "None".
- Three level cards carry roughly forty bullets between them. The one fact that separates the levels
  (how much marketing money we spend on you) is buried inside them.
- "ALLY", "MMI", "good standing", "90-Day Activity Target", "qualified pipeline" — all undefined.

---

## 2. What the revision does

Both pages, first screen:

1. **A two-card chooser** — "Pick the one that is you." One card per program, one sentence each,
   with the current page marked. This is the single biggest change and it is the one aimed straight
   at Thuan's complaint.
2. **A headline that names the reader and the payoff.**
   Ambassador: *"Know a good loan officer? Get paid to bring them here."*
   Recruiter: *"Recruiting loan officers is the whole job."*
3. **A glossary at the bottom of each page** defining every internal word the page uses.

### Ambassador

- The whole program is restated as **three numbered steps**: turn Recruiting on in ALLY → we post
  for you → send us names. Nothing to apply for.
- One full-width statement fixes the mental model: *every loan officer who joins because of you pays
  you a referral bonus — that part is the same at every level. The levels are only about how much
  marketing money we put behind you.*
- The three level cards collapse into **one comparison table**, four rows: budget / how you get in /
  what we ask of you / what you get on top. The forty bullets move behind a "Who leadership
  approves" expander.
- On a phone the table stacks into labelled blocks rather than scrolling sideways.

### Recruiter

- The 12-loan rule gets its own statement, in the largest type on the page:
  **"A hire only counts if *that loan officer* closed 12 or more loans in their last 12 months"** —
  followed by *"The 12 loans are theirs, not yours. You are not required to have closed anything."*
- "unit" is replaced with "closed loan" everywhere.
- The bonus is explained as one sentence of arithmetic — *every 12 loans in the combined total is
  $1,000 to you, paid once, up to $30,000* — and given a **slider** that shows the bonus for any
  total, seeded with a worked two-hire example. The 30-row table moves behind an expander.
- The four performance numbers keep their figures and lose their jargon (3 in the first 60 days /
  2 a month / 5–7 is a good month / 10 real conversations a week).

---

## 3. The feedback round Thuan asked for

Two loan officers and Harry, separately, no coaching, no explanation from us first. Give each person
one page, let them read it once, then ask — in this order:

1. In one sentence, what is this program?
2. Is it for you? Why, or why not?
3. What would you have to do to get money out of it?
4. How much could you make, and when would it arrive?
5. What is the first thing you would do after reading this?
6. Was there anything you had to read twice?

Then show them the other page and ask one more:

7. What is the difference between the two programs?

**How to read the answers.** Q1–Q2 test whether the top of the page works. Q3–Q4 test the money —
if anyone answers Q4 with "$30,000 a month salary" or says they need 12 closed loans themselves, the
old wording is still winning. Q7 is the one Thuan is really asking about; if it takes more than a
sentence to answer, the chooser needs to be louder.

Worth timing Q1: if it takes longer than about ten seconds to answer, "QUICKLY understand" has not
been met yet, whatever they eventually say.

---

## 4. Revision round two — Bao's review, 20 Aug 2026

The first pass answered the comprehension problem but lost design the live page already had. Seven
points came back on the Ambassador page; all seven are in the mockup now.

1. **"LO" is never abbreviated.** Every reader-facing mention is now "Loan Officer" in full —
   "Loan Officer Ambassador Program", "Senior Loan Officer Ambassador", "Producing Loan Officer
   Recruiter". Code identifiers (`lo-programs`, `LoProgramsShared`, `lo_recruiter`) keep `lo`.
2. **The hero's right half is no longer empty.** The side rail from the live page is back, carrying
   the three budget figures for a visitor — and, once signed in, the viewer's own application
   status: in at Level 1 / waiting on leadership / approved / not approved. Status belongs in the
   first screen, not at the foot of the page. The preview toolbar switches between the five viewers.
3. **Each level keeps its own colour through the comparison table.** Level 1 neutral, Level 2 orange
   tint, Level 3 dark — the same escalation the three cards had. The budget figure is now the large
   type and "per month" is small and muted underneath, instead of both running together on one line.
4. **The Level 2 / Level 3 approval criteria are cards, always open.** The expander is gone. The
   only part of this program anyone has to be approved for should not be behind a click.
5. **The team-leader band is a balanced two-column split on ink**, matching the live page — heading
   left, the two callouts right, instead of one narrow column with dead space beside it.
6. Unchanged from round one and staying: the two-program chooser, the three-step "whole program"
   block, and the glossary.
7. **The closing CTA was broken** — the section carried `.apply` without `band band--ink`, so it had
   no band padding and `.apply__inner`'s two-column grid split the centred copy in half. It is now
   the same `closer` layout the live page uses: copy left, button right, on ink.

---

## 5. Shipped — Ambassador page, lf-homepage

Branch `feature/ambassador-plain-language`, cut from `origin/production`.

**Both versions are live.** The new page is `/ambassador-program`; the page as it read before
this revision is kept at `/ambassador-program-v1` so the two can be compared side by side.
The old route is `noindex` with its canonical pointing at the real URL, and it is registered in
`RELEASE_PAGES` so it resolves on staging and production. Delete that route once the comparison
is done.

**How the old page is frozen.** The new page owns the `AmbassadorProgramPage` i18n namespace; the
copy that was in it moved verbatim to `AmbassadorProgramLegacyPage`, which only the v1 route reads.
So a later edit to the live page's wording cannot drift the comparison copy, and vice versa. The
two shared components that take a namespace (`StatusPanel`, `PrimaryCta`) accept the legacy one too.

**Sections**, in the order a reader asks the questions:

| Section | What it is |
|---|---|
| `HeroSection` | New headline and lede; keeps the level rail for visitors and the viewer's own status panel once signed in. The rail's money column now puts the unit under the figure. |
| `PickSection` | New — the two-program chooser. |
| `FirstStepsSection` | New — the three things you do, with the live ALLY switch state on step one, then the statement separating bonus money from budget money. |
| `LevelsSection` | Rewritten — one four-row comparison table with per-level colour, then the Level 2 / Level 3 approval criteria as cards (apply buttons moved into those cards). |
| `TeamLeaderSection` | Same split-on-ink layout; benefit callout now leads, warning follows. |
| `DirectorySection` | Unchanged (shared component). |
| `GlossarySection` | New — six terms. |
| `CtaSection` | New copy, same closer layout. |

**CSS.** New components (`.pick`, `.first`, `.big`, `.plain`, `.crit`, `.gloss`) appended to
`src/styles/lo-programs.css`. The few rules that restyle an existing component — the hero rail's
money column and the ink band's split ratio — are scoped to a `.lop--plain` modifier on the new
page's `<main>`, because the Recruiter page and the frozen v1 page share that stylesheet and must
not shift.

**One copy correction.** The mockup's pending-status panel said a decision is emailed within 3–5
business days. The shipped behaviour is that the decision appears on the page and nothing is
emailed, which is what the production copy already said — so the implementation uses the true
version and the mockup was corrected to match.

**i18n.** 122 keys × 5 locales (en / es / vi / zh / he), all written, none machine-placeholdered.

**Empty roster hides itself.** "Meet our ambassadors" used to hold its place with a panel saying
the first members were being approved — a heading, a subtitle and an explanation in exchange for no
information. `DirectorySection` now returns nothing when no member is on the roster, and nothing
while the fetch is in flight (appearing and then vanishing would move everything below it). The
empty-state copy and its CSS are deleted rather than left unreachable. This is a shared component,
so the Recruiter page and the frozen v1 page get the same behaviour.

One consequence on the frozen page: v1's hero carries an always-visible "Meet Our Ambassadors"
ghost button, so with an empty roster that button now scrolls nowhere. It was left as is rather
than edited, because v1 exists to show the old page unchanged. On the new page and the Recruiter
page the only link to the roster is in the approved-member state, and an approved member is on the
roster by definition.

---

## 6. Shipped — Recruiter page, lf-homepage

Branch `feature/recruiter-plain-language`, cut from `origin/production` (which by then already
carried the Ambassador page). Same arrangement as the Ambassador half: the new page is
`/lo-recruiter-program`, the page it replaces stays at `/lo-recruiter-program-v1` (noindex,
canonical on the real URL, registered in `RELEASE_PAGES`), and the frozen copy lives in a
`RecruiterProgramLegacyPage` namespace so neither version can drift the other.

Three of the review points turned out to be true of the mockup only — production had already
solved them: the hero rail and status panel were there, the four target cards were already on an
ink band, and the closing CTA already used the `closer` layout. What the implementation actually
changes is the copy, the section order, and two new things:

| Section | What it is |
|---|---|
| `HeroSection` | New headline (the old one, "Recruit producers. Get paid per unit.", read as piecework on the reader's own loans). The rail's money row now reads `$30,000` with **one-time** under it, and the caption says outright that it is not a salary — the hero closes that misreading instead of leaving it to a later section. |
| `PickSection` | New — the two-program chooser, mirror of the Ambassador one. |
| `CountsSection` | The 12-loan ownership rule promoted to the largest statement on the page, above the two qualify/route cards. |
| `StandardsSection` | The four numbers, on ink, new copy. |
| `PaySection` | New — the scale stated as one sentence of arithmetic, then a slider seeded with a real two-hire month (30 + 18 = 48 → $4,000), then the published table behind a disclosure with the row the slider lands on marked. Table and figure are both derived from one expression, so they cannot disagree. |
| `ProcessSection` | Five steps, new copy. |
| `GlossarySection` | New — six terms, including "unit" and "one-time bonus". |
| `CtaSection` | New copy, same closer layout. |

`BonusCalculator` is the page's only client component; the trigger note is rendered on the server
and passed in, because it carries rich text and sits between the two slider-driven parts.

**i18n.** 113 keys × 5 locales, written by hand.

**One process note.** Another session was editing the Ambassador worktree while this work started,
so the Recruiter change was done in its own worktree. Worth doing by default rather than on
noticing.

---

## 7. Fix — the calculator shipped unstyled

Bao caught it on staging: the "What it pays" section rendered with no card, a raw
browser slider, and the five slider ticks run together as one string — `096192288360+`.

**Cause.** `.calc`, `.calc__slider`, `.calc__scale`, `.calc__out*` and `.more` existed only in the
mockup stylesheet (`docs/mockups/lo-programs/v2.css`). When the Ambassador page was implemented I
ported the components *that page* needed (`.pick`, `.first`, `.big`, `.plain`, `.crit`, `.gloss`) and
then, for the Recruiter page, checked that `.bonus`, `.targets` and `.qual` were already in
`src/styles/lo-programs.css` — they were, because the old page used them. The calculator was new to
production, so nothing of it was there, and the markup fell back to browser defaults.

**Why the verification missed it.** Every check was a computed-style probe of a thing I had
changed — the rail suffix, the marked row, the ink band — plus screenshots of the hero. The one
section built from scratch was never looked at. A probe confirms a property; it does not notice a
component that has no properties at all.

**The check that would have caught it, now run on both pages:** collect every class name the page's
JSX renders and assert each one matches a rule in the production stylesheet. On the Recruiter page it
returned the nine `calc*` classes plus `more`. On the Ambassador page it returned nothing, so that
page is clean.

Fixed by porting the calculator block into `src/styles/lo-programs.css` (scoped `.lop--plain`), with
the range track and thumb drawn explicitly rather than left to `accent-color`, so the control looks
the same in every browser instead of only in the one it was checked in.

**Also, per Bao:** the published bonus table is no longer behind a disclosure. It renders in full,
directly under the calculator, on the page and in the mockup — someone deciding whether to take this
job should not have to click to see what it pays.

---

## 8. Status

- Copy and layout: done, in the mockup, verified on desktop (1440) and at 375px, no console errors,
  no sideways scroll. Mobile keeps the level colour-coding when the table stacks.
- Awaiting: Thuan's approval on direction, plus the three interviews above.
- Recruiter page: only the two shared fixes are in (Loan Officer spelled out, CTA band). Its own
  design review is a separate round.
- Not yet done: implementation in `lf-homepage` (i18n keys across 5 locales + section components),
  and translation of the new copy into es / vi / zh / he.
