# Recruit off MOSO mail: notifier, sender identity, templates, bell (read-only research, 2026-10-21)

All refs fetched 2026-10-21. "mn" = moso-notifier. Evidence format repo@ref:path:line.

## TL;DR

- **Production moso-notifier is already notifier-be** (Java 21 + tera-core + Postgres), cut over 2026-10-18. It is the
  TERA platform notification service (owner Khai), not "old MOSO": GKE `moso-gke` in GCP project `lender-rate`, ns
  `moso-notifier-prod`. Its only runtime tie to MOSO is **auth**: it reads the MOSO Datastore `Configuration/1.api_secret`
  (JWT secret) and MOSO user entities for Bearer callers. No packs dependency for sending.
- **notification-service (Go)** is a strangler sidecar in the same pod. On staging it now owns almost everything
  (steps 4-8 merged on mn master). It is **not in production**: mn production has no sidecar, and notification-service
  has no `production` branch. Production waves are planned Mon 10-26 to Tue 11-03 (Java render-only), not scheduled further.
- **The old MOSO LO mails do not touch moso-notifier at all**: packs renders the Datastore template and calls SendGrid
  directly (base `GAEEmailService`).
- **Sender as a person: supported.** A v2 event's `actor {email,name}` becomes the From (`Name <person@loanfactory.com>`)
  when the domain is on the app's `allowedFromDomains`, else `"Name (Display)" <app from>`. Reply-To = `email.replyTo`,
  else actor, else config. **No signature feature**: a signature has to be in the body.
- **No RECRUIT sender identity in production code** (master or production). Staging only. Adding one = a small mn config
  PR (or a mail_config admin API call), then the release team pushes `production`.
- **Templates**: notifier owns a catalog (definition + per-channel/language variants, base + edited layer, render
  preview, admin API). No version history. Editors exist in tera-fe (TERA) and ai-hr-fe (HR). Recruit **does not use
  notifier templates for body**: it keeps its own `message_templates` table + `/templates` screen and sends a
  "passthrough" type with the rendered HTML.
- **No scheduled send in notifier.** Recruit already schedules itself (tick + ledger).
- **Bell**: platform bell (`@loanfactory-inc/platform-react` PlatformShell) is live in prod FEs; recruit's publish to it
  (platform-inbox) is OFF in prod.
- Platform standard (tera-docs `notification/`): every producer on **v2** (`NOTIFICATION_EVENT_TOPIC` + declarations).
  tera-docs status tables are stale (say prod is still Mongo, recruit-be "v1").

---

## 1. moso-notifier master vs production; notification-service

**Both branches are notifier-be.** production = e979fd1f (2026-10-18), master is production + 13 commits, all
"staging step 2..8 on Go" / sidecar pins (`git log origin/production..origin/master`; production is an ancestor of master).

- README: "notifier-be ... replaces moso-notifier's Spring Boot 3.2 / MongoDB code in this repository", Postgres
  `notification_db`, Mongo only for the migrator (mn@origin/master:README.md:1-14).
- Prod cutover commits on production: `b4d331da feat: notifier-be replaces moso-notifier (#296)`, `4ce238e6 chore(production):
  cutover gate open`, `88ad6500 release the notifier-be subscriptions after the cutover smoke (#313)`.
- Gate open: mn@origin/production:helm-chart/config/production/values.yaml:192-193 `cutover.productionReady: true`;
  subscriptions released "2026-10-18T11:57:42Z" (same file:47-49 `disabledSubscriptions: ""`).
- Where it runs: cd-production deploys project `lender-rate`, cluster `moso-gke`, ns `moso-notifier-prod`
  (mn@origin/production:.github/workflows/cd-production.yml:105-109); image
  `us-central1-docker.pkg.dev/lender-rate/moso-svc-repo/moso-notifier:production` (values.yaml:28); public host
  `svc.loanfactory.com` (values.yaml:220). Release: only teams `release-moso-notifier` / `platform-release` push
  `production` (mn@origin/master:CLAUDE.md "Who can release").
- Ownership: TERA platform (tera-core service; tera-docs notification/README.md:7 "**Owner: Khai.**").
- Runtime MOSO dependency = auth only: `AuthDatastoreConfiguration` builds a "Moso Datastore client" when
  `spring.cloud.enabled=true` (mn@origin/production:src/main/java/com/loanfactory/notifier/auth/datastore/AuthDatastoreConfiguration.java:15-40);
  JWT secret = Datastore `Configuration/1.api_secret` (DatastoreJwtSecretProvider.java:11-26); MOSO users read from Datastore
  (DatastoreUserServiceImpl.java:20-49); namespace pinned in application-production.yml:38-39. No packs HTTP calls for sending.
- Production has **no Go sidecar**: no `sidecar` key in production values (grep of values.yaml on both branches), chart
  default `sidecar.enabled: false` (mn@origin/master:helm-chart/values.yaml:105-106). Staging has it on
  (mn@origin/master:helm-chart/config/staging/values.yaml:236-241, image pinned at :245).

**notification-service** (`gh api repos/LoanFactory-Inc/notification-service`): "Go notification service, replacing
moso-notifier (strangler sidecar)", default `master`; branches only `master`, `staging` (no `production`).
It has a `cd-production.yml` workflow, but nothing to deploy from.

- Model: Go is the sidecar on :8080, proxies every route it does not own to Java on 127.0.0.1:8081, takes Pub/Sub
  subscriptions one by one via `CONSUME_<SUB>` flags; Java and Go share the same Postgres tables (README "State" and
  "How notification-service talks...", ruling R-RECONCILE-1). README "State (2026-10-18)" is already stale (says prod is Mongo).
- Plan = docs/GO_CUTOVER_PLAN.md (written 2026-10-19): staging steps 2-8 (all merged on mn master: #314..#332),
  production Waves 1a-6a: 1a Mon 10-26 (proxy-all), 2 Tue 10-27, 3/3b Thu 10-29 (v2 send, SEND_MAIL), 4 Fri 10-30,
  **5 Mon 11-02 (CREATE_TEMPLATE, config/template writes, seeders, `CONFIG_WRITE_OWNER=go`)**, 6a Tue 11-03 earliest
  (Java render-only), 7-day watch to ~11-13 (GO_CUTOVER_PLAN.md section 14 table). Each wave = an mn values PR + promote
  + release-team push of `production` (section 10).
- End state: Java keeps only `/internal/render` (Thymeleaf) and Datastore Bearer/Basic auth; "Java fully removed: not
  scheduled" (section 17). Needs a Go renderer, native Datastore JWT auth, then Go's own Deployment, then archiving moso-notifier.

**Implication for recruit:** the wire contract (topics, v2 event, declarations, admin API) is the same under Java or Go;
callers change nothing. A config change (e.g. a RECRUIT identity seed) made in Java's `application*.yml` must also exist in
Go's seeder config once Wave 5 moves "the seeders" to Go on prod (on staging already: step 7, mn #330).

## 2. Sender identities

- Per-app SMTP identity = table `mail_config` keyed by `ApplicationID` (`fromAddress`, `fromDisplayName`, `replyTo`,
  `allowedFromDomains`, SMTP creds), managed by admin API `/api/v1/admin/mail/config` (ADMIN/SUPER/SYSTEM), no env vars
  (mn@origin/production:docs/MAIL.md "Admin API", "Fields"). A send for an app with no config fails
  (`MailConfigNotFoundException`, MAIL.md "Failure modes"). v2 sends use the **appCode's** config (tera-docs
  notification/NOTIFICATION_V2_PRODUCER_GUIDE.md:35-37).
- Header rules (MAIL.md "Sending (v2 legs)" table; code mn@origin/production:src/main/java/com/loanfactory/notifier/mail/service/impl/MailServiceImpl.java:229-292):
  - From = actor's own address + name **if** its domain is on `allowedFromDomains` ("Edward Chavez <edward.chavez@loanfactory.com>",
    :236-245), else `fromAddress` with display `"{actor} ({fromDisplayName})"` (:247-249). Sender header = config fromAddress.
  - Reply-To = event `email.replyTo`, else actor, else config `replyTo` (:274-292; NotificationCommand.EmailOptions).
  - Actor comes from the event: `EmailSender` maps `event.actor.email/name` (mn@origin/production:src/main/java/com/loanfactory/notifier/notification/send/EmailSender.java:64-65);
    `Actor{userId,email,name}` (NotificationCommand.java Actor class).
  - So **per-user From is supported** for any `@loanfactory.com` person (recruiter / onboarding specialist), DKIM-aligned
    via the app's SendGrid account. **There is no signature support**; recruit must put the signature in the HTML.
  - `senders` on a declaration (R56) can borrow another app's identity per channel, only if granted in
    `notifier.v2.sender-profiles`; prod grants only `LFIQ: EMAIL: ALL` (mn@origin/production:src/main/resources/application.yml:170-173).
- Identity copy seeder: `notifier.provider-identity.copy-from` creates/syncs a target app's config from a source app's
  SendGrid creds at every start (MAIL.md "Copy a provider identity"). application.yml (all envs) has only
  `MARKETPLACE: ENGAGEMENT` (application.yml:123-130).
- **RECRUIT**: `ApplicationID.RECRUIT` exists (ApplicationID.java:28). Identity only in staging:
  mn@origin/production:src/main/resources/application-staging.yml:41-49 (`RECRUIT: ENGAGEMENT`, from `info@loanfactory.com`,
  "Loan Factory Recruiting", `allowed-from-domains: loanfactory.com`, comment "Production does not get RECRUIT").
  Same on master. application-production.yml has no provider-identity block. (A row could still have been created by hand
  via the admin API in prod: that is DB data, not visible in code. Verify read-only with `GET /api/v1/admin/mail/config/RECRUIT`
  before acting.)
- **Adding a prod RECRUIT identity**: either (a) a PR moving the RECRUIT `copy-from` + `mail.RECRUIT` block into
  application.yml (or application-production.yml) on mn master, promote-staging, then the release team pushes
  `production` (CLAUDE.md "Deploying"); plus the same in Go's seeder config after Wave 5; prerequisite: ENGAGEMENT has an
  enabled prod mail config (else the copy WARNs and skips). Or (b) `POST /api/v1/admin/mail/config` with appId RECRUIT
  (needs a SendGrid key typed in, and admin credentials; per-pod cache, roll after). Also needed for a prod v2 send:
  recruit-be's GSA publish on `NOTIFICATION_EVENT_TOPIC`/`CREATE_TEMPLATE_TOPIC` in `lender-rate`
  (recruit-be@origin/production:src/main/resources/application.yml:631-645 lists the preconditions).

## 3. Templates: store, editor, variables; who owns the body

- notifier catalog = `notification_template` (definition: appCode, scope=lower(appCode), code=type, kind, name, group,
  mandatory, channelPolicy, senders, `arguments` metadata, trackClicks) + `template_variant` (channel EMAIL|SMS|DEVICE,
  lang, Thymeleaf content/subject) joined by (scope, code) (mn@origin/production:docs/NOTIFICATION-TEMPLATES.md §1).
  **Base vs edited layer**: producer declarations write the base; admin edits write `editedContent/editedSubject`; effective =
  edited if non-blank; reset clears it (same doc, "Base and edited layers"). **No version history** (only the two layers).
  Declaration = JSON array on `CREATE_TEMPLATE_TOPIC`; each item is a full replacement; omitted variants are retired;
  "Any non-blank payload `body` skips the stored template silently" (mn CLAUDE.md "Notification templates"; NOTIFICATION-TEMPLATES.md §2).
- Admin/edit API: `/api/v2/templates` list/get, `PATCH /{code}/variants/{channel}/{language}`, `.../reset`,
  `POST /{code}/render` (preview) (mn@origin/production:src/main/java/com/loanfactory/notifier/template/controller/PrivateTemplateV2Controller.java:28-66);
  v1 `/api/v1/templates` CRUD (PrivateTemplateController.java:15-104).
- UIs over it (all app-scoped, none generic):
  - TERA: tera-fe `company-settings/notification-templates` list + `[code]` editor (tera-fe@origin/master and
    origin/production, 10 files), via tera-be proxy `/api/v1/admin/notification-templates` (tera-be@origin/master:src/main/java/com/loanfactory/tera/notificationtemplate/controller/NotificationTemplateController.java:31; also on tera-be production).
  - HR: ai-hr-fe `settings/mail-templates` (ai-hr-fe@origin/master:app/(app)/settings/mail-templates/MailTemplateList.tsx)
    over ai-hr-be `internal/notiservice` ("moso-notifier's template API — the store the mails HR sends are WORDED in",
    ai-hr-be@origin/production:internal/notiservice/client.go:1-13), with AI rewrite and "Sent mail" history (internal/datamodel/mailtemplate.go).
  - LFIQ: lf-iq `(administration)/email-templates` (lfiq-backend's own template API, with send-test/scenarios).
  - No editor in tera-components / platform-react.
- **Recruit owns its bodies** (not the notifier):
  - Table `message_templates` (V012: type CALL_SCRIPT|EMAIL|SMS, stage, body, lifecycle DRAFT→IN_REVIEW→ACTIVE→RETIRED;
    recruit-be@origin/master:src/main/resources/db/migration/V012__message_templates.sql:15-27), V022 adds TEAM/PERSONAL
    scope, owner, subject (V022__template_scope_authoring.sql), V251 adds `purpose` (GENERAL|NURTURE|WEBINAR|MARKETING|ONBOARDING),
    `preheader`, `sort_order` and seeds 4 Nurture mails; 1-1 reminders are V204 rows relabelled ONBOARDING
    (V251__nurture_drip_settings_and_templates.sql:16-30,48-60). Tokens `{{first_name}}`, `{{recruiter_name}}`, `{{next_webinar}}` filled server-side.
  - Editor: recruit-fe `/templates` (recruit-fe@origin/master:src/app/[locale]/(private)/templates/page.tsx, TemplateModal.tsx).
  - Send: a **passthrough** type `RECRUIT_NURTURE_MAIL`, declared with no variants, EMAIL only, mandatory; every send
    carries subject+HTML in `content.EMAIL` (recruit-be@origin/master:src/main/java/com/loanfactory/recruit/nurture/drip/NurtureMailCatalog.java;
    NurtureMailEvents.java builds actor=owning recruiter, replyTo=omni reply address or recruiter, oneClickUnsubscribeUrl,
    idempotencyKey `nurture:<ledger>`). The bell catalog is a separate declaration (`PlatformInboxCatalog`, :25, :253).
  - So the CREATE_TEMPLATE declaration from recruit is a **type registration** (catalog row + channel policy), not a body.
    Recruit could instead ship variants and let admins edit them in the notifier, but no Recruit-scoped editor exists for that.
- document-esign: no email templates and no SMTP; it returns per-participant invitation links and the caller emails them
  "via notification-service" (document-esign@origin/master:src/main/java/com/loanfactory/platform/esign/ESIGN_PLAN.md:26,41,52).

## 4. Scheduled sends and delivery status

- **No scheduled/delayed delivery** in notifier-be: no send_at / scheduledAt / notBefore anywhere in
  mn@origin/production:src/main (grep empty). The `NotificationDeliverySweeper` is a retry sweeper
  (notification/sweep/NotificationDeliverySweeper.java:55). Recruit schedules on its side: `ScheduledSendTickServiceImpl`
  (15-min tick, claim-then-publish, at-most-once; recruit-be@origin/master:src/main/java/com/loanfactory/recruit/nurture/scheduled/ScheduledSendTickServiceImpl.java header).
- Delivery status: the SendGrid webhook re-publishes attributed events to `STATUS_MAIL_TOPIC`
  (mn@origin/production:src/main/java/com/loanfactory/notifier/webhook/WebhookProperties.java:44-45; StatusEchoView.java:16).
  Recruit consumer exists (`MailStatusMessageHandler`, V255 `mail_delivery_status` DELIVERED|FAILED|BOUNCED|DROPPED|UNSUBSCRIBED|SPAM),
  gated by `recruit.features.mail-status-intake` default false (recruit-be@origin/production:src/main/resources/application.yml:393),
  absent from prod values = off. Correlation needs `producerNotificationId`/`notificationId` on the event (MAIL.md "delivery").
- Caveat: prod webhook signature verification is **off** ("OFF until both keys are provisioned",
  mn@origin/production:helm-chart/config/production/values.yaml:84-86 `WEBHOOK_SIGNATURE_VERIFICATION_ENABLED: "false"`),
  so status events on that route are forgeable in prod today.

## 5. IN_APP / bell

- notifier IN_APP = the bell; channel policy per type; bell detail (R61-R64) (mn docs/BELL-CONTENT.md; NOTIFICATION-TEMPLATES.md §2.1).
  Link hosts allowed in prod: `recruit.loanfactory.com,crm.loanfactory.com` (mn@origin/production:src/main/resources/application-production.yml in-app.link-hosts).
- Renderer: `@loanfactory-inc/platform-react` `NotificationBell`, mounted in `PlatformHeader` inside `PlatformShell`
  (tera-components@origin/production:packages/platform-react/src/ui/shell/PlatformHeader.tsx:12,209). Reads
  `/user-svc/api/v1/users/me/notifications` (user-service proxies the notifier inbox; tera-components@origin/master:packages/platform-core/src/session/gatewayPaths.ts:4-11).
- Live in prod: tera-fe, recruit-fe, lf-iq, account-fe, ai-hr-fe production pin platform-react 0.4.50 and use PlatformShell
  (e.g. lf-iq@origin/production:src/shared/layout/LfiqShell/index.tsx:3; account-fe@origin/production:src/shared/components/PrivateShell/index.tsx:4;
  recruit-fe@origin/production:src/app/[locale]/(private)/_components/RecruitShell.tsx:130).
- Recruit-fe shows **two bells**: its own (recruit-be feed, D142) plus the platform one (RecruitHeaderActions.tsx:14-17).
  Recruit's copy into the platform inbox (`recruit.platform-inbox.enabled`) defaults false and is "production's value"
  (recruit-be@origin/production:src/main/resources/application.yml:631-645); no entry in prod values. Nurture drip and
  scheduled-send-info also off in prod (application.yml:474,482; prod values.yaml:230-233 "stay ABSENT here (= off)").

## 6. Other mail paths

| Service | Path | Prod evidence |
|---|---|---|
| **packs / MOSO** (the 5 LO mails) | Renders the Datastore template (`EmailTemplateOp` → `EmailAllOp.sendUsingTemplate`) and calls **SendGrid directly** with its own key; does not go through moso-notifier | packs@origin/master:loan/src/main/java/com/mvu/loan/server/op/recruiting/SaveLORecruitingFromRecruitOp.java:269-292; base@origin/master:appengine/src/main/java/com/mvu/appengine/GAEEmailService.java:85,132,176 |
| omni-service | notifier **v2** over Pub/Sub, appCode `TERA`, declares its types at start; reply domain `reply.loanfactory.com` | omni-service@origin/master:cmd/server/main.go:706-727; internal/outbox/config.go:239-240 (production); prod `COMM_DISPATCH_ENABLED: "true"` (omni-service@origin/production:helm-chart/config/production/values.yaml:345) |
| auth-service | notifier **v2** (`AuthNotificationSenderImpl` via tera-core `NotificationEventPublisher`, appCode AUTH_SVC), templates declared on CREATE_TEMPLATE_TOPIC, notifier renders | auth-service@origin/production:src/main/java/com/loanfactory/auth/thirdparty/notifier/service/impl/AuthNotificationSenderImpl.java; application.yml:415-421 |
| ai-hr-be (HR onboarding/welcome mails) | notifier **v2** (Pub/Sub, appID `HR`), sender = HR mail config, the human as actor; templates stored/edited in the notifier | ai-hr-be@origin/production:internal/notifier/pubsub.go:23,53-57; internal/notifierv2/event.go:64-90; prod values `notificationServiceUrl` = moso-notifier-prod, `notifierPubsubProject: lender-rate` (helm-chart/config/production/values.yaml:23,96) |
| tera-be | notifier **v2** only ("there is no v1 path and no switch"), boot sync of `notifier/templates/**` | tera-be@origin/production:helm-chart/config/production/values.yaml:236-258; src/main/resources/application.yml:1317-1322 |
| followup-be | notifier v2 client, `NOTIFY_ENABLED: "false"` in prod | followup-be@origin/production:helm-chart/config/production/values.yaml:73,78 |
| recruit-be | notifier v2 (nurture, scheduled info, platform inbox), all gated off in prod; plus the packs writeback that makes packs send the 5 MOSO mails | see §3, §5 |

Platform standard (tera-docs@origin/master:notification/): NOTIFICATION_V2_PRODUCER_GUIDE.md "Every producer, new or
existing, moves to `NOTIFICATION_EVENT_TOPIC` + template declarations"; v1 (`NOTIFICATION_TOPIC`, `SEND_MAIL_TOPIC`,
`/admin/notifications/push`) deprecated and removed once every producer moved (:252-258). Prereqs per environment:
v2 on, types declared, **app code has a mail config** (:30-40). The status tables there are stale: README.md:7 and
"Migration status: 2026-10-18" say prod runs Mongo (code shows the 10-18 cutover); the producer table (as of 10-09) lists
recruit-be as v1.

## 7. MOSO sunset / strangler plans

- moso-notifier itself: Mongo moso-notifier already replaced in place by notifier-be (staging 10-17, prod 10-18).
- Go strangler: notification-service docs/GO_CUTOVER_PLAN.md (prod waves 10-26 to 11-03; Java removal not scheduled,
  needs native Datastore JWT auth etc., section 17); tera-docs notification/NOTIFICATION_SERVICE_MIGRATION.md (decision
  "reconcile both", Khai 2026-10-17).
- MOSO (packs) mail: only the v1→v2 move of packs' own notifier producer is tracked (packs#3643
  `NOTIFIER_V2_SEND_ENABLED`, "TODOS stays on v1", PRODUCER_GUIDE table). There is **no notification-docs plan to move
  packs' direct-SendGrid template mails** (the 5 LO mails) off Datastore; that move is recruit's to do.

## What recruit would need to send the 5 LO mails itself (derived)

1. A prod RECRUIT mail_config (§2) with `allowedFromDomains: loanfactory.com` so From = the recruiter/specialist.
2. Recruit-owned templates for the 5 mails in `message_templates` (purpose ONBOARDING/WEBINAR/...), rendered by recruit,
   sent as passthrough types (like `RECRUIT_NURTURE_MAIL`), with actor = recruiter/specialist and the signature block
   rendered into the HTML (notifier has no signature concept; the "MOSO Admin branch signature" data must come from
   recruit/user-service, not the notifier).
3. Reminders/scheduling stay in recruit (notifier has no send_at); the agreement/e-sign link comes from document-esign
   (links returned to the caller).
4. Prod flags/IAM: publisher on the two topics in `lender-rate`; optionally `mail-status-intake` for bounces (and push
   to get webhook signature verification turned on in prod).
5. Coordinate config with the Go cutover (seeders move to Go at Wave 5, 11-02).
