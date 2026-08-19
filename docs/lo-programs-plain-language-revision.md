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

## 4. Status

- Copy and layout: done, in the mockup, verified on desktop and at 375px.
- Awaiting: Thuan's approval on direction, plus the three interviews above.
- Not yet done: implementation in `lf-homepage` (i18n keys across 5 locales + section components),
  and translation of the new copy into es / vi / zh / he.
