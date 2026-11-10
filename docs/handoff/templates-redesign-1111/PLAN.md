# Recruit Templates redesign — overnight plan (bead agentflow-cwlrr)

Bao approved mockup v7.2 on 11/11 ~02:30 and went to sleep: "làm end-to-end tới sáng, không được stop".
Mockup: https://claude.ai/artifact/QVHCAdWQfVJdjBUkMuEuct — source in `./mockup/` (index.html, app.js, kit.js).
Target: everything on **STAGING**. Prod gets the code with Tài's normal recruit pushes, so **every new behaviour sits behind a
setting / flag that is ON on staging and OFF on prod**. Migrations expand-only. No prod writes, no prod deploys by us.

## Decisions (all from Bao, see bead agentflow-cwlrr notes)
1. Manager (TEMPLATE_APPROVE) creating/editing a TEAM template can **Publish** directly (ACTIVE). Others: Draft → Submit for review.
2. Approve → bell to the writer. Return to writer → **comments required** (each comment: field subject|body|preheader|general,
   quoted words, note), bell to the writer with the first comment; writer sees comments, can Resolve/Reopen. Reviewer may also
   edit directly; then "Save changes and publish" + bell "edited and published".
3. Retire → **Archive** (RETIRED keeps the DB value) + **Restore**.
4. Call scripts are unused (Hot/Cold removed them 29/09, a6daf07e): archive the 8 CALL_SCRIPT rows, no new call scripts. Stage
   is only used by call scripts: drop Stage column/field/filter in the UI (keep the DB column).
5. List = the list standard (like Duplicates): Team/Mine scope pills, status tabs All/Active/Needs review/Drafts/Archived with
   counts, search (name, subject, body), Channel + Purpose filters, sort Template/Updated, Reset, Refresh, saved filters,
   row count, Table/Cards, ListPager, all state in the URL. Columns: Template (name + email subject 2nd line), Channel, Sent
   (Sent by recruiter / Sent by the app / Signature block / Sent by you) with "N sent" under it, Purpose, Status, Updated
   (avatar + name + date; built-in rows: date only).
6. Row click → right drawer preview: Preview / History tabs, Desktop / Mobile, prev/next "n of N", Send test to me, Edit/Review.
7. Editor = RecModal, 2 columns: form left (Name, Purpose; Channel/Who-can-use only on create; Subject, Preview text, Body,
   Insert field menu, unknown-field chip that blocks save, SMS segment meter), live preview right (debounced BE preview).
   Channel + scope shown as chips in the header when editing. Comments: select words in Subject/Body → floating "Comment"
   button at the pointer → popover (⌘Enter); cards under their field; "N comments" opens a list with edit/delete.
8. **The 3 portal page texts** (tpl-lo-portal-*) leave Templates entirely: lf-homepage writes its own copy in code ("dev sửa").
9. **Email kit** (mockup kit.js, based on tera-be TERA_EMAIL_LAYOUT rate-alert kit): one shell, one signature (full, of the
   sender), one footer, one primary button, no emoji, details panel, steps, bullets, note. Rewritten copy for the 26 LO mails
   + 3 one-on-one reminders; plain-text mails (Nurture, Send info) in the same shell. No recruiter/team contact cards; one
   small backup line to the recruiting team where the old copy had Victoria's number. Fast-track image → 5 text steps.
   Behind flag: staging ON, prod OFF.
10. Send history: GET per template from lo_mail_sends + nurture_drip_sends (real data), "N sent" in the list.
11. AI "Write with AI" LAST, behind a flag; stop and report if recruit-be cannot reach moso-router.

## API contract (recruit-be → recruit-fe). Additive only.
- `GET /api/v1/templates/capabilities` → `{ approver_publish, review_comments, archive_restore, kit_v2, test_send, send_history, ai_write }`
  (booleans from settings; FE hides/falls back when false — this is what keeps prod on the old behaviour).
- `GET /templates/manage` — unchanged shape + `sends_count` (int), `submitted_by` (user id|null), `open_comments` (int);
  excludes PageTextTemplates ids.
- `POST /templates` and `PUT /templates/{id}` accept `publish: true` → ACTIVE when caller has TEMPLATE_APPROVE and
  approver_publish is on (TEAM rows). Otherwise unchanged.
- `POST /templates/{id}/submit` sets `submitted_by` = caller.
- `POST /templates/{id}/reject` body `{ comments: [{ field, quote, note }] }` (≥1 when review_comments on) → DRAFT, stores
  comments, bell to submitted_by (fallback last_modified_by).
- `POST /templates/{id}/approve` → ACTIVE + bell to the writer. Approver PUT with publish on an IN_REVIEW row = edited and published (bell says so).
- `GET /templates/{id}/comments` → `[{ id, field, quote, note, author_id, created_at, resolved_at }]`;
  `PATCH /templates/{id}/comments/{cid}` `{ note? , resolved? }` (author edits note; writer/approver resolves); `DELETE` (author).
- `POST /templates/{id}/restore` → RETIRED → ACTIVE (approver for TEAM, owner for PERSONAL).
- `POST /templates/{id}/preview` (exists) — with kit_v2 on: LO mails render the kit body, TEXT mails render in the kit shell.
- `POST /templates/{id}/test-send` `{ subject?, body? }` → renders like preview and sends ONE email to the caller's own
  address through the normal notifier path; rate limit (e.g. 20/hour per user); answers `{ to }`.
- `GET /templates/{id}/sends?limit=8` → `{ total, rows: [{ candidate_id, candidate_name, sent_at, delivery_status, opened_at }] }`.
- (last) `POST /templates/ai/write` `{ type, prompt, subject, body }` → `{ subject, body }`; tokens must survive (server checks).

## Repos / branches
- recruit-be: feature branches off origin/master → PRs → self-merge when CI green + review (owner repo) → staging.
- recruit-fe: same.
- lf-homepage: PR into master (= staging); never production.
- Settings: new flags default OFF in migrations; set ON for staging only (staging settings/env), never prod.

## Morning deliverable
- Everything above on staging, measured.
- `docs/handoff/templates-redesign-1111/emails/`: every email template sent for real (test-send to bao.trinh+manager@)
  and captured in Gmail (Chrome CDP 9345, logged in as bao.trinh@loanfactory.com), desktop + mobile, each with
  "who gets it, when, example" — published as an artifact for Bao.
- Before/after screenshots of the Templates screen (Bao rule: every UI change gets before/after).

## Migration numbers (recruit-be)
- origin/master max = V372 (11/11 ~03:00); open PRs #983 #923 #884 #757 carry no migrations.
- **V373 = be-templates** (agent templates-be, branch `agent/agentflow-cwlrr-templates-be`): settings, submitted_by, template_review_comments, call-script archive, name cleanup.
- **be-mailkit: took V385 (master moved to V384 before merge)** (or higher if V374 shows up on master).

## Setting keys (recruit_settings, all default OFF in V373; staging ON)
- `templates.approver_publish_enabled`
- `templates.review_comments_enabled`
- `templates.archive_restore_enabled`
- `templates.test_send_enabled`
- `templates.send_history_enabled`
- `templates.ai_write_enabled`
- `templates.kit_v2_enabled` ← be-mailkit reads this same key (seeded by V373, do NOT re-insert; use ON CONFLICT DO NOTHING if you do)

## be-templates notes for recruit-fe (recruit-be PR #985)
- Bell kinds (GET /notifications rows, candidate_id = null): `TEMPLATE_APPROVED`, `TEMPLATE_RETURNED`, `TEMPLATE_EDITED_PUBLISHED`.
  payload: `template_id`, `template_name`; RETURNED adds `comment_count`, `field`, `quote`, `note` (first comment). Click → `/templates` (open the row by template_id).
- With `review_comments` ON, `POST /reject` without ≥1 comment answers 400 — the FE must send `{comments:[…]}`.
- `/sends` rows also carry `channel` (EMAIL|SMS). Sources: lo_mail_sends + nurture_drip_sends + call_text_first, status SENT only. Manual "Send info" sends have no template ledger → not counted.
- Comments JSON: `id, template_id, field, quote, note, author_id, created_at, resolved_at, resolved_by`.
- `/restore` off → 400 "not turned on". `/sends` off → 400.
- D471 = be-templates decision (be-mailkit: take D472+).

## fe-templates notes (recruit-fe PR #758, branch agent/agentflow-cwlrr-templates-fe)
- FE reads `GET /templates/capabilities`; 404/405/error = all false = today's flow (draft → submit → approve/reject, retire). Verified on staging before #985 lands.
- Editor live preview: saved EMAIL = `POST /templates/{id}/preview {subject, body}` debounced 400 ms. A NEW template (no id) renders client side (sample values + TEXT paragraphs), so its preview is not the kit until saved. SMS / call script previews are client side.
- Unknown fields = client list (TemplatePreviewSamples + signature/todo_*/sender_*) ∪ BE `unresolved`; blocks save.
- Reviewer comments are local until "Return to writer" → `POST /reject {comments:[{field,quote,note}]}` (one call). Writer resolves via `PATCH …/comments/{cid} {resolved}`; author edits/deletes saved ones.
- Approver edits in review: approver_publish ON → one `PUT {…, publish:true}`; OFF → `PUT` then `POST /approve`.
- Return with edits: `PUT` (no publish) then `POST /reject`.
- Bell: TEMPLATE_* rows open `/templates?open=<id>` (drawer) or `?edit=<id>` (RETURNED → editor).
- Restore is never offered for CALL_SCRIPT rows (they stay archived). Live call scripts are hidden client side too.

## be-mailkit contract (agent be-mailkit, branch `agent/agentflow-cwlrr-mailkit`, migration V385)
- `message_templates.kit_subject` / `kit_body` (nullable; kit_body is ALWAYS HTML, also on the 3 TEXT 1-1 reminders). Seeded for
  the 21 tpl-lo-* mails + 3 tpl-onb-1on1-reminder-* + `tpl-lo-mail-signature` (kit signature). Generator:
  recruit-be `scripts/mailkit/gen-kit-migration.js` (port of mockup kit.js with the real tokens/sections).
- Entity JSON now also carries `kit_subject`, `kit_body` (read-only for the client).
- With `templates.kit_v2_enabled` ON, a row WITH a kit body is shown/edited AS its kit version (no FE change needed):
  `GET /templates/manage` answers subject=kit_subject (else subject), body=kit_body, body_format=HTML (a detached copy,
  `TemplateKitView.present`); `PUT /templates/{id}` writes kit_subject/kit_body (old subject/body untouched).
  → **be-templates: if you replace the manage answer with a DTO, build it from `TemplateKitView.present(kitOn, entity)`;
  in `update()` keep the `TemplateKitView.editsKit` branch.**
- Preview with the flag ON: kit rows render the kit (override = kit text), the signature row renders in the kit card, TEXT
  emails (nurture, Send info) render in the kit shell with the Nurture footer. `kit_footer` is rendered by code
  (`MailKitFooter`: SYSTEM / SYSTEM_UNSUBSCRIBE (invite-reminder, agreement-updated) / REFERRER / STAFF / NURTURE).
- `POST /templates/{id}/test-send` `{subject?, body?}` → `{to, subject, unresolved}`: owned by be-mailkit
  (`TemplateTestSendService`, own controller class so no conflict with TemplateController). Settings: `templates.test_send_enabled`
  (V374 seeds it only when absent), `templates.test_send_per_hour` = 20.
- V374 inserts its settings with `WHERE NOT EXISTS (setting_key)`, so V373 seeding the same keys is fine **as long as V373 runs
  first** (V373 must be on master before V374; Flyway does not run out of order). be-mailkit waits for V373 on master before merging.
- Signature icons: recruit-fe PR #760 (`public/images/email/ic-{mobile,office,mail}.png`); env `RECRUIT_LO_MAIL_KIT_ICON_BASE_URL`
  (staging values = recruit.viet18.com/images/email/).

## ⚠️ Migration renumber (11/11 ~04:30, be-templates)
- master got **V378** (#989, ewc4e.17) before #985 merged; Flyway does not run out of order, so a V373 landing after V378 would
  refuse to boot on staging. **be-templates is now V379** (`V379__templates_review_redesign.sql`).
- Open PRs: #988 V376, #990 (be-mailkit) V374 → **be-mailkit must renumber to V380 or higher** (above everything on master when it merges).
  V380 seeding `templates.kit_v2_enabled` / `test_send_enabled` keys: V379 already inserts them (ON CONFLICT (id) DO NOTHING).
- **be-mailkit DONE 11/11 ~04:55 VN:** recruit-be #990 merged cb814e6b (V385) → staging deployed; recruit-fe #760 merged c92c99bd → staging. Staging settings
  `templates.kit_v2_enabled` = true, `templates.test_send_enabled` = true (PUT /admin/settings as bao.trinh+admin). Prod untouched (both false via V379).
  Staging check: POST /templates/{id}/preview for 29 rows (21 tpl-lo + signature + 3 1-1 + 4 nurture) → all 200, `unresolved: []`, no `{{`, kit header on all 28 mails.
  Test-send tpl-lo-invite + tpl-nurture-1 → 200 `{to: bao.trinh+manager@loanfactory.com}`.
