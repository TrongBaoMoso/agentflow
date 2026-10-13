# Feasibility: Team-tab @mention notifications + SMS "Sent" after a rejection (13/10)

Read-only study. No code was changed. I read every repo at a freshly fetched `origin/master`:

| Repo | Commit read |
|---|---|
| omni-service | `c6c9ce1` (13/10 15:23) |
| recruit-be | `a49261c9` |
| recruit-fe | `6837ad17` |
| tera-components (the omni-react and omni-core packages live here now) | `7ea04405` |
| zoom-go | `2e15cd9` |
| moso-notifier | `4cdcc0a8` |

There is no separate omni-react clone. The package moved into `tera-components/packages/omni-react`.

---

## Q1: @mention in the Team-only tab notifies nobody

### What exists today (verified in code)

**omni-service**

- Mentions are stored with a real identity: table `comm_message_mention` (V29), rows `(message_id, party_id, rune_offset, rune_length)`.
  - They are validated server-side in `internal/messages/mentions.go`.
  - Allowed on INTERNAL rows only (`ErrMentionOnExternalSide`).
  - Every party must be a live INTERNAL teammate on the subject (`validateMentionParties` → `validateRecipients`, which raises `MENTION_NOT_TEAMMATE`).
- The mention email exists (`internal/outbox/mention.go`, issue #436). Compose and Reply call it at `service.go:1336` and `:1574` (`EnqueueMentionEmails`).
  - The switch is `COMM_MENTION_EMAIL_ENABLED` and it is **one global boolean** (`outbox/mention.go:185`). It is not per subject type, so turning it on also turns it on for LOAN.
  - Production: `"false"` (`helm-chart/config/production/values.yaml:341`).
  - Staging: `"true"` (staging values `:158`).
  - Only a LOAN deep link is configured (`COMM_CONVERSATION_LINK_LOAN`). No `COMM_CONVERSATION_LINK_LO_CANDIDATE` exists in either environment. A recruit mention mail would therefore carry no "Open conversation" link.
  - The mail is sent as `OMNI_MENTION`, app code TERA, through moso-notifier.
  - Likely reason nothing arrived on staging: omni#349, where staging omni email is deferred because the staging SendGrid subuser has no IPs. **UNCONFIRMED for this exact send.**
- omni already has a per-user "unread mentions" read: `GET /api/v1/comm/inbox` (`internal/messages/inbox.go`, `store_inbox.go`, issue #438).
  - It has a `mention` arm: an INTERNAL row whose `comm_message_mention` names one of the caller's live INTERNAL party ids, and whose author is not the caller.
- omni emits **no event that carries a mention**:
  - The Redis change frame (`internal/redispub`) carries the message id and side only.
  - The outbound-sent Pub/Sub topic (`internal/messages/outboundnotify.go`) fires for SMS and EMAIL only. A channel-less chat row is dropped. Payload: `schema_version, subject_type, subject_id, omni_message_id, channel, direction, occurred_at, sender_user_id, event_type, side`.
- No `/api/v1/internal` route reads messages or mentions. The internal group has ping, consent backfill, alias, legal hold, erasure, import, `outbound` (SMS/EMAIL only), provider call, share and outside (`cmd/server/main.go:1193-1240`).
- `cast.Party.PrincipalID` is the platform user id. recruit-be pushes it in `OmniCastPushRequest.principalId`. A mentioned `party_id` can therefore be mapped back to a recruit user id with no guessing.

**recruit-be**

- Bell kind `MENTIONED` exists: V200, `NotificationKind.MENTIONED`. Only the profile internal-note path writes it (`POST /candidates/{id}/notes`, `CandidateFollowerServiceImpl#notifyMention`, D191).
  - Dedupe key: `MENTIONED:<noteId>:<userId>`.
  - Repeat bells collapse while an unread MENTIONED bell for the same candidate and recipient is younger than `followers.mention_bell_collapse_minutes`.
  - Payload: `activity_id`, `excerpt`, `followed`, `on_team`.
- The platform inbox mirrors bells: `PlatformInboxCatalog`, app RECRUIT, IN_APP only. EMAIL, SMS and PUSH are OFF. MENTIONED has no template of its own and reads as the generic update (D227 note).
- recruit-be already consumes omni:
  - Outbound-sent Pub/Sub (`omni/outbound/OmniOutboundMessageHandler`). An unknown `event_type` is ack-dropped with metric `omni_outbound_dropped{reason=unknown-event-type}`, so a new event type is forward-safe.
  - Inbound Pub/Sub.
  - The Redis change channel `omni:{tenant}:LO_CANDIDATE:{id}:changes` (`candidateevents/CandidateEventsSubscriber`).
  - The cast push and the internal `/outbound` read.
  - Per the prod-parity handoff, the outbound/inbound topics and subscriptions are wired and running on prod (Khai, recruit-be #589).

**recruit-fe / omni-react**

- The omni inbox bubble with a **"Mentions" filter** is mounted: `src/shared/components/CandidateInboxBubble`, `OmniInboxBubble` from omni-react.
- It is ON in both environments: `NEXT_PUBLIC_OMNI_INBOX_BUBBLE_ENABLED=true` in `cd-staging.yml:55` and `cd-production.yml:66`.
- It polls `useGetCommInbox` for `LO_CANDIDATE`.
- **So B should already see a mention count in the bubble.** **UNCONFIRMED:** I cannot check this without a browser. Bao should look at B's bubble after the next test. If the bubble is also empty, the composer is not sending identified `mentions` (for example, a hand-typed `@Name` is not a mention), and that changes the diagnosis.
- The omni-react composer's `onAfterSend` callback takes **no arguments** (`composer/Composer.tsx:69`, `useComposerSend.ts:339`). The host app cannot learn which message was sent or who was tagged.

### Options

| | What | Repos | Needs Khai? | Size | Risks |
|---|---|---|---|---|---|
| **(0) recruit-fe only** | The recruit bell reads the omni inbox `mention` arm. The query is already polled for the bubble, so read its cache. Show "X mentioned you on {candidate}" rows next to the recruit-be rows, and link them to the candidate conversation. | recruit-fe | **No** | S, about 1 day with tests | Not stored in `recruit_notifications`, so no platform inbox and no email. Read state is omni's cursor (opening the Team tab clears it). The privacy rule is already omni's (`MENTION_NOT_TEAMMATE` at write time, cast-gated at read time). No duplicate with note-mentions, because those are different rows. |
| **(a) omni event → recruit-be bell** | omni publishes, after commit, one event per mentioned party on the **existing** outbound-sent topic. Fields: new `event_type: "MENTIONED"`, plus `mentioned_principal_id` and `author_principal_id`; content-free. recruit-be handles that type: bell kind `OMNI_MENTIONED` (new V-migration and catalog row), key `OMNI_MENTIONED:<omni_message_id>:<user>`, and it re-checks that the user is still on the cast. | omni-service (small: a hook beside `mentionEmailTargets` at `service.go:1336/1574`, a payload field, tests); recruit-be (handler branch, kind, migration, bell + platform inbox, IT); recruit-fe (bell label) | **Yes**: omni merge + prod release | omni S (about 50-100 lines + tests); recruit M (1-2 days) | Ship recruit-be first: today's build ack-drops an unknown `event_type`, so either order is safe, but recruit-first loses nothing. Use a NEW kind, not `MENTIONED`, or the note-mention collapse query (`kind='MENTIONED' AND candidate_id AND recipient_id`) would swallow one bell with the other, and the payload shapes differ (`activity_id` vs `omni_message_id`). Privacy: omni has already enforced `MENTION_NOT_TEAMMATE`; recruit should not show the body (D191 pattern: candidate name + "mentioned you", text behind the click). Pub/Sub is at-least-once; the dedupe key covers it. Reusing the topic needs no new infra; a new topic would need Khai to create topic + subscription + DLQ on prod. |
| **(b) recruit-be polls / reads omni** | On each Redis change frame with side INTERNAL (already received), recruit-be GETs the message and its `mentions`. | omni-service (**a new internal read is required**: no internal message read exists, and the user route needs a real user identity, which recruit-be must not impersonate) + recruit-be | **Yes** | omni S-M, recruit M | Redis pub/sub is at-most-once and fans out to every pod: missed frames on restart become missed bells, and duplicates need the dedupe key. More moving parts than (a) for the same omni dependency. **Not recommended.** |
| **(c) turn on omni's mention email** | Set `COMM_MENTION_EMAIL_ENABLED=true` on prod and add `COMM_CONVERSATION_LINK_LO_CANDIDATE=https://<recruit-fe>/...{subject_id}...{message_id}`. | omni-service helm values only (+ optionally a recruit-fe route that honours `messageId`; recruit-fe has none today) | **Yes**, and it is a **cross-product** decision: the flag is global, so LOAN prod would start mailing mentions too | XS config | Email only, no bell. Mail goes as app TERA through prod moso-notifier. Today's finding: prod LO mail config is missing (`MailConfigNotFoundException`). TERA should be fine, but **UNCONFIRMED for OMNI_MENTION on prod**. Staging proves nothing while omni#349 (no SendGrid IPs) stands. |
| (d) composer reports mentions to recruit | omni-react `onAfterSend(message)` passes the sent message (id + mentions) to the host. recruit-fe POSTs to recruit-be, which checks each user against its own cast map (`CandidateCastAssembler#members`) and rings. | tera-components (omni-react) + recruit-fe + recruit-be | Package owner (tera-components publish) | M | Trusts the author's client: no omni proof that the message exists. Rate limits from D191 would be needed. Not better than (a). |

### Recommendation

Do **(0) now**: recruit-fe only, no Khai. B then sees Team-tab mentions in the recruit bell, using data omni already computes for the bubble, with omni's privacy rule intact.

First, Bao checks whether B's omni bubble shows the mention. If it does not, the problem is upstream (the composer is not sending identified mentions) and must be found before any of this.

If a durable bell or the platform inbox is wanted, add **(a)** next. omni's part is small and reuses an armed topic; recruit-be does the rest. Ship recruit-be first, then ask Khai for the omni PR.

(c) is a separate product call for LOAN as well, and should not be bundled in.

---

## Q2: SMS rejected still shows "Sent" (agentflow-wapn, P1)

### How the send works (verified)

1. Compose writes the message plus an outbox row and stamps engagement `sending`.
2. The poller calls **zoom-go** (`POST` to zoom-go, which calls Zoom `POST /phone/sms/messages`; `internal/outbox/smssender.go`). omni never calls the Zoom API directly.
3. The zoom-go response is the **only** status signal. In `dispatch.go:458-462`: *"zoom-go accepted the send → advance sending → sent (SMS has no status listener, so this token is the only thing that moves it off 'sending')"*.

Outcomes:

| Case | Result | Where |
|---|---|---|
| 2xx | `sent` | |
| Coded rejection (USER_NOT_CONNECTED, MESSAGING_DISABLED, ...) | `failed` + reason, no retry | `zoomerr.go` |
| Impossible NANP number | `failed` before the call | wapn fix, omni#287 |
| Any other non-2xx, including an uncoded 500 "invalid number" | retried with backoff, `MaxAttempts` 8 (about 15 min) | then `bounced` |

When `bounced` or `failed` is stamped, omni also publishes `DELIVERY_FAILED` on the outbound-sent topic. recruit-be records it as `activities.delivery_failed_at` (D131).

### Where "Sent" comes from, and the three ways a rejection still reads "Sent"

The FE fix (mtwd) is in: `tera-components/packages/omni-react/.../EngagementSummary.tsx` puts bounced and failed first for SMS and never relabels over a terminal failure. recruit-fe pins omni-react **0.4.27**, which contains it. So an SMS that omni marked bounced or failed renders "Bounced" or "Not sent". The rejection Bao saw must be one of these three cases:

1. **Rejected after zoom-go accepted it (carrier or Zoom-side, asynchronous).** omni has no status listener: the token stays `sent` forever.
   - zoom-go does see failures: its `phone.sms_sent` handler maps `failure_reason` to `status='failed'` in its own `sms_messages` (`webhook_sms.go:190-203`), and it forwards `status` in the omni fan-out payload (`SmsNotificationEventData.Status`).
   - But omni's `ZoomSMSWebhook` DTO has **no status field** (`internal/inbound/webhook_dto.go:19`), and an echo of our own send is skipped by `ZOOM_MESSAGE_ID` (`inbound/outbound_echo.go:42`). The failure is dropped on the floor.
   - zoom-go only processes `phone.sms_sent` and `phone.sms_received` (`handlers_webhook.go:478`). Whether Zoom sends a separate failure event (`phone.sms_sent_failed`?) is **UNCONFIRMED**: not in zoom-go code, and not found in a web search.
   - Measurement to make: zoom-go DB, `SELECT event_type, count(*) FROM webhook_events WHERE event_type LIKE 'phone.sms%' GROUP BY 1`, plus `sms_messages WHERE status='failed'` for the test send.
2. **Within the 15-minute retry window of an uncoded rejection.** During retries the token is only `sending`, and after 2 minutes the FE stale rule relabels it **"Sent"** until attempt 8 stamps `bounced`. This is a real 2-15 minute fail-open window.
3. **Email (today's prod case).** A pre-SMTP moso-notifier failure (`MailConfigNotFoundException`) publishes nothing. `STATUS_MAIL_TOPIC` is published only from moso-notifier's `SendGridWebhookHandler` (`:630`), meaning after SendGrid. So even with `COMM_EMAIL_STATUS_ENABLED=true` (unset, default false: `config.go:1309`, `main.go:307-313`) omni would never hear about it. The bubble keeps "Sent".

Also: the failure **reason** is still not on the wire. omni SELECTs `dispatch_error` and discards it (`store_page.go:647-657`). The FE can say *that* a send failed, not *why*.

### Can Claude build the fix? Yes. Repos and owners

| Fix | Repos | Owner gate |
|---|---|---|
| F1 Carrier rejection → `failed`: omni reads `status`/`failure_reason` on the zoom SMS hook. For an echo that matches our `ZOOM_MESSAGE_ID`, call `ApplyFailure` instead of skipping. This automatically fires `DELIVERY_FAILED` to recruit. zoom-go: also pass `failure_reason`/`error_code` (only `status` is forwarded today), and process the Zoom failure event if one exists. | omni-service + zoom-go | **Khai** (omni); zoom-go owner. Measure first (above). |
| F2 Shorter retry window: classify zoom-go's uncoded "does not conform to E.164" / invalid-number 500 as permanent. Best done as a coded error in zoom-go (`INVALID_RECIPIENT`) plus a new code in omni `zoomerr.go`. | zoom-go + omni-service | Khai + zoom-go owner |
| F3 Show the reason: put `dispatch_error` on MessageView and render it beside "Not sent". | omni-service + tera-components | Khai + package publish |
| F4 Email pre-SMTP: moso-notifier publishes a DROPPED/FAILED status event when a v2 send fails before SMTP, correlated on `producerNotificationId`; omni turns on `COMM_EMAIL_STATUS_ENABLED`. | moso-notifier + omni helm | notifier owner + Khai |

**It is not all omni**, but every fix that changes the bubble goes through omni (Khai), because the bubble only renders omni's engagement tokens.

### What recruit can do alone (no Khai)

- **R1: show delivery failure in recruit's own timeline.** recruit-be already stores `activities.delivery_failed_at` from `DELIVERY_FAILED` (D131), but no response DTO exposes it, and recruit-fe shows nothing.
  - Expose it on the activity response and render "Not delivered" on the SMS/EMAIL row.
  - recruit-be + recruit-fe, S. Covers every failure omni already knows about (pre-send refusals, coded rejections, give-up bounces). It does not cover F1 or F4 until those land.
- **R2: already done.** Phone normalization to E.164 (recruit-be #322, en5g) and the omni impossible-number guard (#287).
- **Not possible from recruit alone:** detecting a rejection that happens after Zoom accepted the send (case 1), or a pre-SMTP email failure (case 3). Recruit never receives those signals.

### Recommendation

1. Measure case 1 in zoom-go first (one query) to learn whether Zoom reports SMS failures at all.
2. Ship R1 (recruit-only).
3. Ask Khai for F1 (+F2) as one omni PR; zoom-go needs a small change to forward the reason.
4. Raise F4 with the moso-notifier owner together with the prod LO mail-config fix that is already on the prod-parity list.

---

## Open items / UNCONFIRMED

- Does B's omni bubble show the mention? Not checked (no browser).
- Does Zoom emit an SMS failure webhook, and does `phone.sms_sent` ever carry `failure_reason`? Check zoom-go `webhook_events`.
- Does OMNI_MENTION (app TERA) deliver on prod moso-notifier? Not checked.
- Which of cases 1-3 matched Bao's test send today: the message id and its engagement tokens are needed.
