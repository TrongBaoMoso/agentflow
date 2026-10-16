# Nurture email drafts: facts, sources, logo, variables

Measured 2026-10-16. lf-homepage `origin/master` e3ad06d5, lo-homepage `origin/master` 5b1f95677, recruit-be and
recruit-fe `origin/master` (fetched the same day). Live checks: https://www.loanfactory.com/loan-officer (HTTP 200).

Shorthand: `LOP` = `lf-homepage/src/app/[locale]/(public)/loan-officer/`, `en.json` = `lf-homepage/src/messages/en.json`.

## Facts used in the emails

| Fact (as written in the emails) | Used in | Source |
|---|---|---|
| 1099: keep 100% of the commission on every closed loan | t1 t2 t4 | en.json `LoanOfficerV1Page.compensation.cards.w1099.text`; `proof.commission_label` ("commission, minus a flat fee") |
| W-2: 90% of the commission after the admin and processing fees | t2 t4 | en.json `LoanOfficerV1Page.compensation.cards.w2.text` |
| $595 admin fee per closed loan | t2 t4 | `LOP/_data/claims.ts` `ADMIN_FEE = '595'` (shown live: 19 matches on prod page) |
| $500 processing fee per closed loan | t2 t4 | `LOP/_data/claims.ts` `PROCESSING_FEE = '500'` |
| Software free for Loan Officers; about $963/month saved | t1 t2 | en.json `hero.sub`, `no_fees.lede`; `LOP/_data/claims.ts` `SOFTWARE_SAVINGS_TOTAL = 963` = sum of `LOP/_data/software-savings.ts` |
| Platform covers marketing, leads, processing, pricing, funding | t2 | en.json `LoanOfficerV1Page.software.apps.*` |
| Live support 7 days a week | t1 t2 t4 | en.json `proof.support_value/label` ("7 days", "a week of live support"); `programs.items.coach.mid` |
| New Loan Officers not on a team get a coach who reviews files | t2 t4 | en.json `programs.items.coach.mid` |
| Ongoing training | t4 | en.json `programs.items.coach.mid` ("join ongoing training sessions") |
| Join a team led by a Team Leader | t4 | en.json `programs.items.teams.mid` |
| We handle NMLS sponsorship and HR paperwork; setup 2 days to 1 week | t2 | en.json `join.steps.setup.text/time` |
| One-time $100 sign-up fee | t2 | en.json `join.lede`; `LOP/_data/claims.ts` `SIGNUP_FEE = '100'` |
| License must be Active or Approved-Inactive; expired must be renewed in NMLS first | t4 | en.json `RegisterLoanOfficerPage.Forms.BeforeYouBegin.req_licensing_active/expired` |
| Sponsorship approval takes a few days | t4 | en.json `RegisterLoanOfficerPage.Forms.PayingFee.start_sponsoring_you` |
| Commission-only, no health / 401k / paid time off benefits | t4 | en.json `GetInTouchPage.FAQsSection.faqs_modal.about_loan_factory.benefits_provided` (shown in the /loan-officer FAQ, `LOP/_components/FaqSection.tsx`) |
| Work from home in most states, depends on state rules | t4 | same FAQ group, `working_from_home` |
| Who can join: newly licensed, or 2+ loans closed in past 12 months; background check + management approval | t4 | en.json `LoanOfficerV1Page.who_can_join` |
| "Why Loan Factory" webinar, hosted live by CEO Thuan Nguyen, free, online, 1 to 1.5 hours, live Q&A | t3 | en.json `join.steps.webinar.text`, `webinar.title`, `webinar.line`, `band.text` |
| Webinar topics (how he became #1, why Loan Officers join, lenders and free tech) | t3 | en.json `webinar.bullet_1..3` |
| Thuan Nguyen: number one Loan Officer in the US in 2021 and 2022 per Scotsman Guide | t3 | FAQ `ceo_of_loan_factory` |
| Other webinar dates can be picked on the same page | t3 | `LOP/_components/WebinarSection.tsx` date picker (`webinar.earlier/later`) |
| Address 2195 Tully Road, San Jose, CA 95122 | footer | `LOP/(landing)/page.tsx` schema.org `PostalAddress` |
| NMLS #320841 | footer | live page footer ("NMLS #320841", "NMLS ID 320841"), en.json footer strings |

lo-homepage `LOP/_data/claims.ts` holds the same numbers (595, 500, 100, 963, 20,000), so the two sites agree.

### Facts deliberately NOT used

- "$10B+ in loans funded in 2025": marked `UNCONFIRMED placeholder` in `claims.ts`.
- Lender count: live API value, changes (live page showed 242+ on 16/10). Left out so the email never goes stale.
- Loan Officer count and Google review count: live API values, same reason.
- Referral bonus up to $20,000, Partner tiers (3% / 5%), Language Fund, Coordinator: real facts, but they are
  programs for people already at Loan Factory, not for a "maybe later" prospect. Easy to add to t2 if wanted.
- "Every Friday": the page says the webinar is every Friday, but the plan's `{{next_webinar}}` example is a
  Wednesday, so t3 only states the date from `{{next_webinar}}`.

## Logo

- **URL:** `https://storage.googleapis.com/lender-rate/CDN/loanfactory/img/loan_factory_logo.png`
- `curl -sI` -> `HTTP/2 200`, `content-type: image/png`, 5,085 bytes. PNG 471 x 46, transparent background,
  orange "O"s with black wordmark. Shown at 200 px wide (sharp on retina).
- Already used by MOSO/packs email templates (19 references in packs / moso-configuration).
- Other candidates checked: `.../weekly_newsletter1/loan_factory.png` = 404;
  `.../logo_test/mini_logo_LF.png` = 200 PNG but icon only (no wordmark); `.../loan_factory_logo_dark_1.png` =
  white-text version for dark backgrounds; `https://www.loanfactory.com/images/logo/loanfactory.svg` = SVG
  (Gmail and Outlook block SVG in email).
- Risk: transparent PNG with black text. Mail apps that force dark mode (Outlook.com, some Gmail apps) may darken
  the white header and make the black text hard to read. Fix if it shows up in testing: host a copy with a solid
  white background.

## Template variables (recruit-be / recruit-fe origin/master)

`TemplateRenderer` (`recruit-be/src/main/java/com/loanfactory/recruit/template/render/TemplateRenderer.java`)
replaces `{{word}}` tokens. A token with no value (null or blank) is kept as is and reported as unresolved; the
onboarding reminder refuses to send in that case (`OnboardingReminderComposer`, `TEMPLATE_UNRESOLVED`).

There is no global variable map. Each caller builds its own:

| Variable | Exists where | Used in drafts |
|---|---|---|
| `{{first_name}}` | server: `OnboardingReminderComposer` (only server caller); FE: `CallScriptPanel`, `FollowUpsPanel/OutcomeSection` | yes |
| `{{recruiter_name}}` | FE only (`hooks/useRecruiterName.ts`, `CallScriptPanel`, `OutcomeSection`); documented to authors in `recruit-fe/src/messages/en/tplmanage.json` `body_placeholders_hint` | yes (server must add it for the drip) |
| `{{last_name}}` | FE only (`OutcomeSection`) | no |
| `{{meeting_time}}`, `{{meeting_minutes}}`, `{{meeting_link}}` | server, 1-1 reminder only | no |
| `{{next_webinar}}` | NEW, planned (`docs/handoff/nurture-drip/PLAN.md`, BE-2) | yes (t3) |

**Needed but not existing:**
- `{{recruiter_name}}` on the server side (drip tick must put it in the map, or every template is refused).
- No `{{recruiter_phone}}` / `{{recruiter_email}}`. The signature therefore says "Reply to this email to reach me
  directly", which works because From/Reply-To = recruiter (D101). Add these two if a phone line is wanted.
- No webinar link variable. t3 uses the fixed link `https://www.loanfactory.com/loan-officer#webinar`
  (section `id="webinar"` in `LOP/_components/WebinarSection.tsx`, confirmed in the live HTML). A
  `{{webinar_link}}` that points to the exact session would be better.
- No unsubscribe link variable. The footer asks for a reply ("unsubscribe"); per the plan any inbound reply stops the
  drip. A real one-click unsubscribe link (and `List-Unsubscribe` header) is recommended for CAN-SPAM and Gmail/Yahoo
  bulk-sender rules.

## HTML or plain text?

- Templates are stored as **plain text** (recruit `/templates`, `message_templates.body`).
- The only automated email today (1-1 reminder) goes through packs `EmailOp`, which sends **HTML**. recruit-be
  converts the plain text with `ReminderEmailHtml.toHtml` (`recruit-be/.../onboarding/reminder/ReminderEmailHtml.java`):
  every character is HTML-escaped, blank lines become `<p>`, newlines `<br>`, bare `https://` links become `<a>`.
  packs then runs `ReminderHtmlSanitizer` with an allowlist of `p`, `br`, `a href`.
- **Consequence:** the `.html` drafts (tables, inline CSS, `<img>` logo, button) cannot be sent through today's path:
  they would arrive escaped as visible code, and `img`/`table` would be stripped by packs. Options:
  1. Send the `.txt` versions now through the existing path (links auto-linked, no logo).
  2. Add an HTML layout on the server: keep the template body as plain text, and wrap it in a fixed, code-owned
     layout (logo header, signature, footer) after rendering, plus allow `img`/`table` in the packs sanitizer for this
     message type. This keeps author-supplied HTML out of the template editor (the `TemplateRenderer` security note).
- Plain-text bodies in `t*.txt` start with `Subject:` and `Preheader:` lines for review; strip those two lines when
  pasting into `/templates` (subject goes in its own field).

## Links

- https://www.loanfactory.com/loan-officer : HTTP 200 (t1, t2)
- https://www.loanfactory.com/loan-officer#webinar : webinar sign-up form on that page (t3)
- https://www.loanfactory.com/loan-officer#faq : FAQ section, `id="faq"` confirmed live (t4)

## Rotation

t1 Quick check-in -> t2 How Loan Factory works -> t3 Upcoming webinar -> t4 Questions -> repeat.
If no webinar is open, the plan skips t3 (it uses `{{next_webinar}}`).
