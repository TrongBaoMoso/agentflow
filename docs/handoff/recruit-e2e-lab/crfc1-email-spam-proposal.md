# agentflow-crfc1: onboarding reminder emails in Spam — investigation and proposal

Date: 2026-10-09. Investigation was read-only: no code, config, data or settings were changed.
Sources: packs `origin/master` 832b8d31fb, base `origin/master` 7f39defc21, recruit-be `origin/master` = `origin/production` e5caa333, public DNS, Cloud Logging (lender-rate, lenderrate-master), staging Datastore (read-only `runQuery`). Production Datastore (`lender-rate`) returned **403 PERMISSION_DENIED** for bao.trinh@, so no prod EmailHistory rows were read directly.

## TL;DR

- **The spam problem only affects staging.** Staging LF tenant sends through **Mailgun `mg.viet18.com`**. The From address is `@loanfactory.com`, so DKIM `d=mg.viet18.com` and SPF `mailgun.org` do not align with the From domain. DMARC fails, and `loanfactory.com` is `p=quarantine pct=100`, so Gmail puts the mail in Spam. The bead's screenshots show exactly this.
- **Production sends through SendGrid, and SendGrid is authenticated on `loanfactory.com`.**
  - The prod LF `Configuration(1)` has `email_service_provider = SendGrid`.
  - Prod receives thousands of `/exec/SendGridHook` callbacks on `www.loanfactory.com` and **zero** `/exec/MailGunHook` callbacks since 10/07.
  - `s1/s2._domainkey.loanfactory.com` are CNAMEs to SendGrid (`u6370153.wl154.sendgrid.net`).
  - The SPF record for `loanfactory.com` includes `sendgrid.net`.
  - DKIM `d=loanfactory.com` therefore aligns with a `@loanfactory.com` From, so **real prod reminders and invites should pass DMARC.**
  - Inference, not yet proven by a received header: one prod mail's "Show original" should be checked (see Next steps).
- Prod also has a Mailgun domain configured, **`mg1.loanfactory.com`**, with DKIM `pic._domainkey.mg1.loanfactory.com`. Under `adkim=r` it would also align. It is only used when a send names Mailgun or a sending domain explicitly (campaign override). Recruit sends do not.
- **Recommendation:** fix staging only. Add or verify a Mailgun domain under `loanfactory.com` for staging (e.g. `mg-staging.loanfactory.com`, DNS by DevOps) and set it as staging's `mailgun_domain`. As an interim option, staging could send From the sending domain with the specialist as Reply-To. Separately, add delivery visibility on the recruit side (section 5).
- **Security finding (urgent, separate from crfc1):** prod App Engine logs contain a **plaintext dump of the LF `Configuration` entity, including `mailgun_api_key`** (and the field list suggests other secured keys too).
  - Seen at `2026-10-08T16:39:50Z`, module `cloud-tasks` version `c`, log `/var/log/app`.
  - It is inside `java.lang.IllegalStateException: Could not evaluate '$updated_user.full_name' of <Entity [!5716104026521600:Configuration(1)] ...>`.
  - Anyone with Logs Viewer on `lender-rate` can read it. The value is deliberately not copied here.
  - Recommend that DevOps/MOSO owners rotate the Mailgun key (and any other secured value in that dump) and stop the template engine from printing whole entities in error messages.

## 1. Production sending domain and From

### Code path (who picks the provider)

1. recruit-be calls packs `POST /api/recruit/v1/candidate/meetingReminder`. `RecruitMeetingReminder` → `RecruitAPI.emailNotQueuedReason(...)` queues `EmailOp` with:
   - `from = actor.company_email`, where the actor here is the row's **onboarding specialist** (`usableSpecialist`: active Admin with a non-empty `company_email`);
   - `reply_to = reply_to override or the same company_email`;
   - template `email/onboarding_meeting_reminder`;
   - **no `provider` and no `sending_domain`** (packs RecruitAPI.java:2470-2477).
2. `base` `GAEEmailService` (lines ~55-110):
   - When `provider == null`, it uses `Configuration.email_service_provider`.
   - `SendGrid` → SendGrid API with `From = options.from` (unchanged).
   - Otherwise → Mailgun with `mailgun_domain`.
   - It records `EmailHistory.provider` and `sending_domain`, the latter only for Mailgun.

### What each environment actually uses

| | Staging (`lenderrate-master`, www.viet18.com) | Production (`lender-rate`, www.loanfactory.com) |
|---|---|---|
| Provider for recruit mail | **Mailgun**. EmailHistory rows for `email/onboarding_meeting_reminder` say `provider=Mailgun`, `sending_domain=mg.viet18.com` (3 rows: 10/02 `opened`, 10/07 `sent`, 10/08 `sent`) | **SendGrid**. Configuration(1) `email_service_provider = SendGrid`, `from_email = info@loanfactory.com` (from the log dump above) |
| Webhook evidence since 2026-10-07 | 192 `/exec/MailGunHook` on www.viet18.com (positive control) | ≥2000 `/exec/SendGridHook` on www.loanfactory.com (query capped at 2000); **0** `/exec/MailGunHook` |
| Mailgun domain configured | `mg.viet18.com` | `mg1.loanfactory.com` (only for explicit overrides) |
| From on recruit mails | specialist / actor `company_email` (`@loanfactory.com`) | same code path, so `@loanfactory.com` |
| DMARC result | **fail** (unaligned), so Spam | expected **pass** (DKIM `d=loanfactory.com` via SendGrid domain auth) |

The other Mailgun domains in prod config (`mailgun_sending_domains = r7k2.theloanyouwant.com, ...`) are the neutral campaign domains used by `EmailProviderOverride`. They are not used for recruit.

## 2. DNS (dig, 2026-10-09)

| Record | Value |
|---|---|
| `_dmarc.loanfactory.com` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@loanfactory.com; ruf=...; fo=1; pct=100; aspf=r; adkim=r` |
| SPF `loanfactory.com` | `v=spf1 include:sendgrid.net include:_spf.google.com ~all` (Mailgun is **not** included) |
| DKIM `loanfactory.com` | `s1._domainkey`, `s2._domainkey` → CNAME SendGrid `u6370153.wl154.sendgrid.net`; `google._domainkey` (Workspace) |
| `mg1.loanfactory.com` | SPF `v=spf1 include:mailgun.org ~all`; DKIM `pic._domainkey.mg1.loanfactory.com` present; MX mxa/mxb.mailgun.org; tracking `email.mg1.loanfactory.com` → mailgun.org. (A stray TXT `"mxa.mailgun.org"` also exists. It is harmless junk.) |
| `mg.viet18.com` | SPF `include:mailgun.org`; DKIM `pic._domainkey.mg.viet18.com`; `_dmarc.viet18.com` `p=none` |

Alignment (relaxed, `adkim=r aspf=r`):
- `mg.viet18.com` vs From `@loanfactory.com`: **no**, because the organizational domains differ. This is the staging failure.
- SendGrid DKIM `d=loanfactory.com`: **yes**.
- `mg1.loanfactory.com` (DKIM `d=mg1.loanfactory.com`, Return-Path `@mg1.loanfactory.com`): **yes** for DKIM and for SPF under relaxed alignment.

## 3. Other email types with the same pattern

Every MOSO mail that recruit triggers "as" a staff member uses the same `EmailOp` → `GAEEmailService` path with From = a staff `@loanfactory.com` address. They all share the same outcome: they fail DMARC on staging and should pass on prod.

| Email | Trigger (packs) | From | Staging evidence |
|---|---|---|---|
| Onboarding 1-1 reminder | `candidate/meetingReminder` | specialist `company_email` | 3 rows, Mailgun mg.viet18.com, only 10/02 `opened` (the plain-text one). 10/07 and 10/08 were in Spam (Bao's screenshots) |
| Invite (`email/interested_loan_officer_invitation_email`) | `candidate/invite` (via packs write-back INVITE) | requesting recruiter `company_email` (D127) | rows exist (old 2023 test data in the first page); same provider |
| Webinar registration (`email/webinar_registration_send_manually`) | `candidate/registerWebinar` | actor | same |
| Welcome / pre-onboarding e-sign mail, agreement send (`LINK_AGAIN` / `UPDATED_AGREEMENT`) | `candidate/onboardingMeeting`, `candidate/agreement/send` → `LORecruiting.afterSave` / e-sign document mail | acting specialist/admin (signature rendered from the acting Admin) | not sampled; same `GAEEmailService` default, so same result |

**Prod opens:** these could not be measured. Prod Datastore is 403 for this account, and request logs do not carry the SendGrid event type. Recruit itself has sent none of these on prod yet:
- `packs_writeback_outbox` = 0 rows (`RECRUIT_FEATURES_PACKS_WRITEBACK` absent);
- `offer_history` has no `REQUESTED` events;
- reminders are `DRY_RUN`.

So any prod opens would belong to mail sent from MOSO's own UI. To get the number, someone with Datastore Viewer on `lender-rate` (or the MOSO Email History screen, filtered by template) should count `status=opened` vs `sent` for the templates above.

## 4. Options

| # | Option | Pros | Cons | Owner |
|---|---|---|---|---|
| A | **Staging: authenticate a Mailgun domain under loanfactory.com** (e.g. `mg-staging.loanfactory.com`, or reuse `mg1.loanfactory.com` on the staging Mailgun account) and set staging `Configuration.mailgun_domain` to it | Staging behaves like prod (aligned, inbox). No code change. Same From semantics as prod | DNS change on the prod brand domain (DevOps). Staging test mail would carry loanfactory.com reputation. Must only ever reach allow-listed test inboxes (recruit already has recipient policies) | DevOps (DNS + Mailgun), MOSO admin (staging config) |
| B | **Staging: switch provider to SendGrid** with a staging SendGrid key on the same authenticated `loanfactory.com` | Identical to prod path | Shares the prod SendGrid account/reputation and the prod domain auth with test traffic. Needs a key from DevOps | DevOps |
| C | **From = `noreply@<sending domain>` (or `recruiting@loanfactory.com`), Reply-To = specialist, display name = specialist name** in packs `emailNotQueuedReason` / reminder | Always aligned whatever the provider. Replies still reach the specialist | Code change in packs (repo-owner review). LO sees a generic address. On prod it would change working behaviour for no gain unless gated to "provider domain not aligned" | packs dev |
| D | **Google Workspace send-as** (Gmail API with each specialist's token) | Real mailbox, best deliverability, sent copy in their Gmail | Per-user OAuth/delegation, quota, large change, outside MOSO EmailHistory/webhooks | big project; not recommended now |
| E | Do nothing on staging, mark staging spam as known | Zero effort | QA keeps misreading "SENT" as delivered, which is how crfc1 started | — |

**Recommendation: A** (DevOps adds the DNS records Mailgun gives for a `loanfactory.com` subdomain; a MOSO admin sets staging `mailgun_domain`). It makes staging match prod alignment without touching code paths that already work in production. If DNS cannot happen soon, use **C gated to staging** (only when the configured Mailgun domain is not under the From's organizational domain) as a stop-gap. No production change is needed for crfc1. Before closing the prod half, confirm with one real prod header (next steps).

## 5. Recruit-side visibility (SENT ≠ delivered)

Today the outbox / ledger says `SENT` when packs answers `QUEUED`. Proposal:

1. **Store the packs response on the outbox row:** `packs_outcome` (QUEUED/REFUSED/NOT_SENT/ambiguous), `packs_reason_code`, `packs_request_id`, `packs_responded_at`. Additive migration, nullable columns.
2. **Mailgun/SendGrid message id.** packs only enqueues a Cloud Task, so the id does not exist at response time. Two options:
   - (a) recruit polls a new read-only packs op `emailStatus(request_id)` that looks up the `EmailHistory` row by label (`candidate.key`) + template + created ≥ request time and returns `{provider, sending_domain, message_id, status}`. Status values: `sent / delivered / opened / failed / dropped / bounced`, already maintained by MailGunHook/SendGridHook.
   - (b) packs pushes the status back on the existing MOSO→recruit webhook channel.
   - (a) is simpler: a cron in recruit-be checks rows younger than 72 h.
3. **UI:** show "Queued → Delivered → Opened" or "Failed (bounced / spam-dropped)" on the timeline instead of a bare SENT. Raise a notice when a mail stays `sent` with no `delivered` after N hours, or when it lands as `failed/dropped`.
4. Log `provider` + `sending_domain` with each delivery, so an unaligned domain (like `mg.viet18.com` with a `@loanfactory.com` From) is visible in a single query.

## Next steps

1. Bao or Victoria: open one recent **prod** MOSO mail sent as a staff member (any recruit/LO-facing template) → "Show original". Expect `dkim=pass header.d=loanfactory.com` and `dmarc=pass`. This closes the prod half of crfc1.
2. DevOps: option A DNS for staging. **Also rotate the Mailgun API key** (and other secured Configuration values) exposed in prod logs, and file a MOSO bug for the entity dump in template errors.
3. File a recruit bead for section 5 (outbox packs-response columns + status poll).
