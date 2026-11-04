# The ten lifecycle emails

**Status**: shipped in moso-aid #173. Marketing can rewrite any of it without a deploy — see "Two ways to send".
**Bead**: `agentflow-nktr`, task 3.4.

## Two ways to send, and the catalog picks

An earlier draft of this document asked for ten `Template` entities in the MOSO tenant DB before a single email could go out — which needed Datastore write access and sign-off on ten sets of words. Tho pointed out the route that removes that block (Slack, 2026-09-21):

```bash
curl -X POST "https://www.viet18.com/api/webplus/v1/5716104026521600/sendEmail" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "blank_email_with_signature",
    "to": ["someone@example.com"],
    "from": "${Server.getCompanyWithDBAInfo().email}",
    "title": "Test from WebPlus staging",
    "content": "<p>Dear Someone,</p><p>Body text.</p><br>${template('\''company_signature_generator'\'')}"
  }'
```

`blank_email_with_signature` renders a body the **caller** supplies. Verified: it exists in namespace `5716104026521600`, declares no `context` and no `to`, and its default body signs with `admin_signature_generator, {admin: Server.currentUser()}`.

So the shipped behaviour is:

| Catalog `notifications` has… | What happens | Who owns the words |
|---|---|---|
| a template key for this event | that template is sent facts only — it owns its own subject, body and recipients | **marketing**, no deploy |
| nothing | `blank_email_with_signature` renders the body in `services/lo-program-copy.js` | the repo, deploy needed |

Both ship today. `notifications` is seeded **empty**, so every event uses the fallback. Marketing takes ownership of any single event by creating a template and adding one line to the catalog — no code change.

### Two expressions that must not be edited

Both are MOSO expressions evaluated on their side, travelling as literal strings. Interpolating, escaping or "tidying" either in JavaScript breaks them.

- **`${template('''company_signature_generator''')}`** in `content`. The blank template's own default signature uses `Server.currentUser()`, and a machine-to-machine call has no current user — so the body signs as the **company** instead.
- **`from: "${Server.getCompanyWithDBAInfo().email}"`**. Same reason: the template's default `from` is `Server.currentUser().company_email`, which is empty here.

Tho, verbatim: *"anh đừng sửa trong `${....}` ni nghe"*.

### Copy is keyed by PROGRAMME, not by event

The first version keyed it by event, and that mailed the **LO Recruiter** programme too — whose `notifications` is empty *on purpose*: its applicants are candidates from outside Loan Factory with no account here, its audience is different, and its wording has not been agreed. Two unrelated test suites caught it, and the subject line they printed read *"We have your null application"*.

A programme with no entry in `COPY_BY_PROGRAM` sends nothing. That is the structural form of the decision rather than a flag somebody has to remember.

## Context fields

Flattened onto the payload by `sendProgramEmail`, and available to a dedicated template as `String` context params the same way `escalation_ticket_change_status` declares `note` and `title`.

| Field | Example | Notes |
|---|---|---|
| `name` | `Jordan Mackey` | |
| `program_name` | `Loan Officer Ambassador Program` | |
| `level_name` | `Loan Officer Ambassador` | The level held **now**. **Can be null** — guard it, or a template renders the word "null". |
| `budget_max_monthly_display` | `$500` | **`null` means no budget at this level, not `$0`** |
| `from_level_name` / `to_level_name` | `Loan Officer Ambassador` → `Senior…` | Moves only |
| `from_budget_display` / `to_budget_display` | `$500` → `$1,000` | Moves only |
| `reason` | *free text an admin typed* | Revoke, demote, remove. Always render it. |

## Three sentences that must not be written

Not style preferences. Each is false, and each is the wording the system's own field names invite. All three are asserted against in tests.

| Event | Never say | Because |
|---|---|---|
| `level_revoked` | "You have been removed from the program" | Revoking returns them to Level 1. They are **still a member**. `DecisionModal`'s help text already promises the manager exactly this. |
| `level_promoted` | "Your level was revoked" | A promotion writes `revoked` on the outgoing row. The database says revoked; the person was promoted. |
| `level_downgraded` | "Your level was revoked" | Same row, same trap. A smaller budget, same programme. |

## The ten, as shipped

Subjects and bodies are in `moso-aid/src/services/lo-program-copy.js`.

| # | Event | Subject | The point of it |
|---|---|---|---|
| 1 | `level_activated` | You're in — General Participation | No budget at this level; Levels 2 and 3 are separate applications, not rungs |
| 2 | `application_submitted` | We have your ${level_name} application | **Closes a real gap**: today they submit and receive nothing |
| 3 | `application_resubmitted` | We have your new ${level_name} application | Worded so it does not read as a duplicate; does not restate the refusal |
| 4 | `application_approved` | You're approved — ${level_name} | Cap, and **that the budget is spent in Ally**. An approval that does not send them there leaves a budget with nowhere to go. |
| 5 | `application_rejected` | About your ${level_name} application | Not this time; may apply again; reason if given |
| 6 | `level_revoked` | A change to your ${program_name} standing | **Still in the programme**, at Level 1, cap gone. Plus the mandatory reason. |
| 7 | `level_promoted` | You've moved up to ${to_level_name} | Both levels, both caps. No reason — nobody asks for a promotion to be justified. |
| 8 | `level_downgraded` | A change to your ${program_name} level | Both levels, both caps, still in the programme, plus the mandatory reason |
| 9 | `member_left` | You've left the ${program_name} | Every level goes including Level 1, and Ally recruiting posts switch off |
| 10 | `member_removed` | You've been removed from the ${program_name} | Unlike #9 they did not decide this; the reason is the whole explanation |

**#10 has words but no emitter yet.** It ships in the same release that closes the public withdraw route's self-declared `by_admin` path — until then an unauthenticated caller could trigger it carrying text of their own choosing, under Loan Factory's name.

## Still open

**Localisation.** The programme pages serve five locales; these bodies are English only, as all 74 existing MOSO templates are. Following the existing convention rather than deciding for it — worth a decision, separately.
