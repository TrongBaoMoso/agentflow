# Conflict Register — Tera Plus recruiting/onboarding redesign

Cross-stakeholder contradictions found across transcripts in this directory.
Classification rules: see `README.md`.

**Status values:** `open` · `proposed` (a reconciliation is drafted, not confirmed)
· `escalated` (waiting on a human decision) · `resolved` (decision recorded, with source)

---

## C-001 — Auto-assign owner for the recruiter role

| | |
|---|---|
| **Type** | B (different scope/role) — *provisional, pending Thuan transcript* |
| **Status** | open |
| **Decides** | Antoine (CEO) — or dissolves if the per-role design satisfies both |

**Position A — Victoria (Recruiting Manager)**
Wants recruiters to self-claim; does NOT want round-robin auto-assign for the
recruiter role specifically. Explicitly supports auto-assign for onboarding /
support / HR / licensing.

- `12:37` — "I understand Antoine wants to automate as much as possible. **I am aligned with him on that.** The only thing is I wonder if this automatic owner assignment is helpful because ... what matters is when the recruiter call that lead."
- `13:17` — "We don't even have that many leads per day to be honest. Like I don't know like 10 leads or something. So it's not like it saves us time."
- `28:05` — "I'm going to uncheck the recruiter — **you can put here as an option still** — and add licensing and HR here."
- `28:23` — "the reason why I don't want recruiter to be added for automatic is ... it's a first line that needs to contact loan officers ... they are basically sales people, they're different than other support specialists or onboarding specialists"
- `29:00` — "But **we can put everything here. That's still okay.** I just let you know."

**Position B — Thuan / Antoine (CEO), relayed by Phung and Benjamin**
Wants automatic assignment to reduce human error and to scale.

- `11:14` (Phung, relaying) — "he doesn't want to ... rely on people to pick themselves like that. He wants to detect the workload of people and then assign automatically"
- `11:45` (Phung) — "in the new system we can set by the workload ... Brian can handle currently 30 per day ... whoever has the largest capacity we will assign it first, then it will go around"
- `18:46` (Benjamin) — "Antoine wants us to have as many automation processes as possible because he wants to avoid human mistake"
- `25:26` (Phung, relaying Antoine) — "whenever we have leads in the pipeline, immediately we will assign the onboarding spec, support spec and recruiter to the lead ... round robin"
- ⚠️ **Thuan's own transcript not yet added.** Position B above is second-hand. Do not treat as Thuan's verbatim position until his transcript is in this directory.

**Why this is probably type B, not type A**
Victoria is not against automation; she is against it *for one role*, with a stated
reason (first-line sales, ~10 leads/day, latency-to-call matters more than ownership).
The meeting itself converged on a design that satisfies both:

- `29:15` (Victoria) — "we all agree that it's going to be kept and be enhanced ... add some more teams and also add some logic that whenever ... anyone who does not work on it within let's say three business hours or five business hours ... then it's going to assign to someone else. Let's do that."
- `29:45` (Phung) — "we can detect ... if this is the time frame ... then we will reassign, or we will pop up something to show you that it needs to be reassigned. So anyone who has free time they can pick it, or system will reassign it."

**Proposed reconciliation (not yet confirmed with Thuan/Antoine)**
Auto-assign engine stays, configured **per role**:
- recruiter → claim-first + SLA fallback auto-reassign
- onboarding / support / HR / licensing → auto-assign, triggered by onboarding stage

**Question to put to Thuan/Antoine:** does claim-first + SLA fallback meet the
"avoid human mistake / don't rely on people picking" goal? If yes, C-001 dissolves.

---

## C-002 — SLA window before reassignment

| | |
|---|---|
| **Type** | Not a conflict — an unresolved parameter |
| **Status** | open |
| **Decides** | Victoria / Brian |

Values floated in one meeting: 1–2 hours (Benjamin `14:15`), 3 hours (Brian `15:33`,
Victoria `20:40`), "three business hours or five business hours" (Victoria `29:28`),
same business day (Benjamin `20:08`). Victoria explicitly deferred:
`29:33` — "we're going to agree at this, you know, later point".

---

## C-003 — What counts as "worked on" (blocks SLA reassignment)

| | |
|---|---|
| **Type** | D (definition) |
| **Status** | open |
| **Decides** | Brian (in the workflow doc he owes Phung) |

Brian `14:53`–`16:03`: a lead may have **no phone number**; contact may be an email
sent from the note section, an inbound text to HR rather than to the assigned
recruiter, or a note. If SLA only counts outbound calls, reassignment will fire
incorrectly. Needs an explicit list of qualifying interaction types and direction
(inbound vs outbound, and to whom).

---

## Register of derived open questions (not conflicts — unanswered in transcript)

These cannot be settled by reading more transcripts; they need Victoria/Brian.

| # | Question | Source |
|---|---|---|
| Q1 | Auto-assign for recruiter: remove entirely, or keep as an option defaulted off? | `28:05` vs `29:00` |
| Q2 | "Loans since 2022": replace the career-production field, or add a new one? Auto-pull from Modex or still manual? | `1:03:02`–`1:04:58` |
| Q3 | Email feature: delete it, or fix it (no self-CC, replies land in both inbox and notes)? | `48:56`–`49:14` |
| Q4 | Actions recruiting doesn't use (create new account, regenerate e-sign docs, loan referral) — HR and Leads dept use them; **neither has been consulted** | `58:56`, `1:00:46` |
| Q5 | Conversations view: new top-level page, or a tab under Interested LO? | `59:45` ("right below interested loan officers") |
| Q6 | SMS/email templates: centrally managed by admin, or recruiter-authored? | `46:48`–`47:11` |
| Q7 | Follow-up automation: send automatically, or one-click-from-template? Brian warns automatic sends lack context | `39:56`, `42:15` |
| Q8 | Which stats stay on the pipeline header? Victoria deferred: "I need to sit down and think about it" | `4:09` |

---

## Cross-check against known system state

Claims here must be reconciled against what already exists before becoming tickets:

- `reference_recruit_omni_sms_wired_but_inbound_misroutes` — omni outbound SMS is
  wired, **inbound misroutes to LOAN**. Victoria's "conversations page" ask may be a
  known bug, not a missing feature.
- `project_recruit_call_outcome_next_steps` — call-outcome next-steps work already
  merged; overlaps the follow-up asks here.
- `project_recruit_prod_gaps` — production go-live checklist.
- `docs/lo-recruiting-e2e-flow.md`, `docs/lo-recruiting-feature-review.md`.
