# P4 S6, the rest, on staging (08/11/2026)

Bead `agentflow-0gwad.5.6` (under `agentflow-0gwad.5`). recruit-be decisions **D402**, **D403**, **D404**, **D411**. STAGING only; production values untouched.
**No token, secret or PII is in this folder or in any log.** Test addresses were `bao.trinh+…@loanfactory.com` only. No SMS was sent. The `+stg` demo accounts and their leads were not touched.

## What changed (recruit-be)

| # | PR | Squash commit | What |
|---|---|---|---|
| 1 | #902 | `afabf1235` | **D402.** A 1-1 marked DONE with a future meeting date answers **400**, not 500. The checklist PATCH validations threw `IllegalArgumentException`, which the core handler maps to 500; they now throw `BadRequestException`. The rule is unchanged: "today" is the business date (`business_hours.timezone`, America/Los_Angeles), the same one the FE date picker caps at. No +1 day tolerance: a 1-1 held on a Vietnam morning is the previous evening in Los Angeles, so the business date is the right date to file. The message now names the sent date, the business today and the zone |
| 2 | #903 | `e9272009c` | **D403.** The invite card's "invited" step for a lead with **no MOSO record** reads Recruit's own state: its invite `lo_mail_sends` row SENT (done by e-mail), else the live D207 hand-off (done, "Handed off", the specialist named), else not done (with D354 and no specialist: `WAITING_FOR_SPECIALIST`). No resend and no "send again after N days" on this path. The resend rule gains `WAITING_FOR_SPECIALIST`, so the card's `can_resend` agrees with the endpoint's D354 409. MOSO-linked leads and offers with a packs row are unchanged. **No recruit-fe change** was needed: the card already renders the hand-off |
| 3 | — | — | **The 1-1 reminder needed no code.** With `lo-mail-reminders` on (staging) the tick already calls its guards with `requireMosoLink=false` (D329), and its copy carries no join link, so it is "just the reminder". D399's gap note overstated it. Only the packs path (production today) needs a MOSO key, as it must. Proven on staging below. Written into D404 (6) |
| 4 | #904 | `4813d924e` | **D404, V334.** The start-up fee "paid" confirmations after a fee **Recruit recorded** (`fee_payments` PAID): MOSO's `email/paid_startup_fee_successfully` to the Loan Officer (tenant copy) and `email/paid_startup_fee_by_ilo` to the onboarding specialist and the recruiter (global copy), verbatim from MOSO production Datastore apart from the token map in V334's header. From = the specialist (D328), else the owner. Flag `recruit.features.lo-mail-fee-paid` (staging on, production absent) and `recruit.lo-mail.app-base-url` (staging `https://recruit.viet18.com`, the staff mail's link to the lead) |
| 5 | #908 | `45c00fc97` | **D411** (found during this E2E). A lead with no MOSO record **could never pay**: after the 1-1 was marked DONE the portal still said "You're done for now. We will call you soon", because "1-1 done" was read only from the MOSO mirror or a SENT packs row. For a lead with no MOSO record, Recruit's `ONB_PREMEETING` item DONE now counts. Linked leads are unchanged |

All five went to staging: promote of `e9272009c` (cd-staging 42456217478), `4813d924e` (42457404536) and `45c00fc97` (42468703910), each successful.

### Why the paid mails go for every fee Recruit recorded, not only for leads with no MOSO record

packs mails these when **it** flips `paid_startup_fee`, and since agentflow-0gwad.5.2 it skips both for a Recruit-portal row. A fee Recruit records was taken on Recruit's portal, so packs never records it (with the mirror off it never hears of it; with it on, it skips the mails). So packs mails the fees packs records and Recruit mails the fees Recruit records, and nothing is sent twice. A staff "mark paid" in Recruit sends nothing.

### Not built, on purpose

- **The daily "unfinished onboarding" mail** (`email/daily_onboarding_update`). It is a status table of NMLS status, associate to-dos and departments that Recruit does not hold. For a lead with no MOSO record, the D380 invite reminder (day 2, 5 and 10, with the portal link since D401) is the "existing reminder engine" option P4-PLAN S6 names.
- **"Agreement ready" and "signing completed"**: they need e-sign (S4/S5).

## Review

An independent java-reviewer, given only each diff:

| PR | Found | Fixed |
|---|---|---|
| #902 | 0 CRITICAL, 0 HIGH (4 LOW) | — |
| #903 | 2 HIGH, 3 MEDIUM | HIGH: the card offered a resend the endpoint 409s under D354, and an offer not SENT yet could read "handed off". MEDIUM: `resend_eligible` on a path that cannot resend. All fixed before merge |
| #904 | 0 CRITICAL, 0 HIGH, 4 MEDIUM | A replay of the same PAID order now retries the keyed mails (a crash or a transient refusal is not lost for good); one failing mail no longer stops the next; a startup WARN when the app URL is not https. Packs' skip for portal rows was checked in packs source. Accepted: the mails are sent within the confirm request (up to three) |
| #908 | 0 CRITICAL, 0 HIGH, 1 MEDIUM | DONE only, not NA, documented; an IT for the portal unlock plus the linked control was added |

CI caught two problems that a local gradle run would have caught: `CandidateEntity` has no owner setter (D132), and `NurtureDripTemplatesIT` counts the ONBOARDING templates. The decision-number guard also refused D405 (taken by other open PRs), so it was renumbered to D411. Local gradle never got a RAM slot (`ram-gate` denied 2.5 GB every time), so CI ran the tests.

## Staging E2E (08/11, 06:44–10:10Z)

Admin test account through the gateway API, plus Chromium under ram-gate (headless for the card, headed Chrome for the PayPal sandbox card form). Three new leads with no MOSO record were created; all three are **ARCHIVED** at the end.

### 1. Future 1-1 date (D402)

| | Lead `bf80abda-…`, `PATCH /checklist-items/{ONB_PREMEETING}` DONE with `meeting_date` = LA today + 1 |
|---|---|
| BEFORE (staging on #901) | **500** "Something went wrong" |
| AFTER (`e9272009c`) | **400** `meeting_date 2026-11-08 is in the future: today is 2026-11-07 in America/Los_Angeles (the business time zone). Pick the date the 1-1 was held, 2026-11-07 or earlier` |

### 2. Invite card for a lead with no MOSO record (D403)

Same lead, offer SENT with `approve_now`; the specialist was auto-assigned (hand-off), so no invite e-mail went out.

| | `GET /candidates/{id}/invite-status` | Card |
|---|---|---|
| BEFORE | `invited.done=false`, `channel=null` | "Invited · Pending": `d403-before-invite-card-1440.png`, `d403-before-invite-card-375.png` |
| AFTER | `invited.done=true`, `status=SENT`, `channel=HANDOFF`, `at` = the offer's SENT time, specialist set; `problem=null`, `can_resend=false`, `resend_eligible=false` | "Handed off · Lisbeth · Today" with a tick: `d403-after-invite-card-1440.png`, `d403-after-invite-card-375.png` |

### 3. The 1-1 reminder reaches a lead with no MOSO record (no code change)

- Lead `655a9ca0-…`, offer SENT, 1-1 scheduled on behalf for 08:57Z (so the 2-hour reminder was due at 06:57Z).
- **Shared staging setting, changed briefly and restored:** `onboarding.reminder.allowed_emails` (the 1-1 reminder's own allowlist) got the test lead's address added at **06:48:49Z** and was restored to its single original entry at **07:01:38Z** (about 13 minutes). The restored value was read back from `recruit_settings`. Nothing else changed.
- The 07:00 tick: `onboarding_meeting_reminders` offset 120 **SENT** at 07:00:03Z to the test alias; `lo_mail_sends` kind `REMINDER` **SENT**. The body carries no portal link (the V204 copy has none), which is correct.

### 4. Paid confirmations (D404) and the fee unlock (D411)

Lead `c4d93ffa-…`, offer `a6206954-…` SENT, 1-1 marked DONE (the welcome went out), a staff portal link minted into a 0600 file (deleted afterwards), the portal profile filled with fake data.

| Step | Result |
|---|---|
| Fee step BEFORE D411 (staging on `4813d924e`) | "You're done for now. We will call you soon. After the call…" and no PayPal button, although the 1-1 was DONE |
| Fee step AFTER D411 (`45c00fc97`) | the PayPal and card buttons show |
| Pay with PayPal's documented **sandbox** test Visa (headed Chrome, inline card form; no real card) | PayPal capture 201; recruit-be `fee-paypal` **200 `PAID`**, order `0K832367TJ8085840`; `fee_payments` PAID, `COMPLETED/COMPLETED`, 100.00, 1 attempt; offer fee **PAID** |
| Loan Officer mail | `lo_mail_sends` `FEE_PAID` **SENT**, template `tpl-lo-fee-paid`, key `fee-paid:<offer>`, to the test alias, subject "Your Payment Has Been Successfully Received", no unresolved token |
| Staff mails (specialist and owner) | two `FEE_PAID` rows, template `tpl-lo-fee-paid-staff`, keys `fee-paid-staff:<offer>:<user>`, **SKIPPED `ALLOWLIST`**: both are real staff addresses, which staging's Loan Officer mail allowlist (`bao.trinh+*`) refuses, as designed. There is no non-demo test account with the ONBOARDING role left on staging (they were removed for the Victoria demo), so a delivered staff mail was not measured live; its rendering is proven by `LoanOfficerMailTemplatesIT` |

### Cleanup

The three leads are ARCHIVED (bulk-archive 200, 3 OK), which also revokes their portal links (D401). The link file and the scratch scripts hold no secret; the admin token stays in its own cache file.

## Open questions for Bao

1. **The paid mail's contact line.** The production (tenant) copy says "reach out to Lisbeth Giraldo - Onboarding Team Lead at (669) 306-6244 or email <onboarding department e-mail>". Recruit has no "onboarding department e-mail", so that address is the sender's (the specialist's). Keep it, or use MOSO's global copy ("please feel free to email to <address>"), which names nobody? It is editable in /templates. *Recommendation: keep the production copy for now; switch to the global wording if the team lead changes.*
2. **Staff "mark fee paid" in Recruit** sends no paid confirmation (only a PayPal payment on the portal does). *Recommendation: keep it that way; a staff mark is usually a waiver or an offline payment the specialist already knows about.*
3. **The daily onboarding update** is not ported (see above). *Recommendation: rely on the D380 day 2/5/10 reminder; revisit only if the onboarding team asks for a daily mail.*
4. **A test ONBOARDING account** for staging E2E: none is left outside the demo accounts. *Recommendation: after Tuesday's demo, give `bao.trinh+role-onb` its ONBOARDING role back so staff mails can be measured live.*

## Links

- recruit-be #902: https://github.com/LoanFactory-Inc/recruit-be/pull/902
- recruit-be #903: https://github.com/LoanFactory-Inc/recruit-be/pull/903
- recruit-be #904: https://github.com/LoanFactory-Inc/recruit-be/pull/904
- recruit-be #908: https://github.com/LoanFactory-Inc/recruit-be/pull/908
