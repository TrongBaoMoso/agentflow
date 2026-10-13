# omni-service: release notes for promoting staging to production

Prepared 2026-10-13 for imkhai (`release-omni-service`). **Nothing was pushed, merged or opened.**

## Why there is no PR

omni-service does not accept a pull request into a deploy branch:

- `CLAUDE.md` on master, "An ordinary change" step 2: "Never merge into a deploy branch, never open a pull request into one: `deploy-branch-guard.yml` closes it with directions."
- `.github/workflows/deploy-branch-guard.yml` runs on every `pull_request` and calls `lf-workflows/deploy-branch-guard.yml@070ad685`.
- `tera-docs/infrastructure/DELIVERY_FLOW.md`: production is promoted with `git push origin origin/staging:production` by the release team, fast-forward only. Only `release-omni-service` (imkhai) and `platform-release` can push `production`.

The promotion is one command, run by imkhai:

```bash
git fetch origin
git push origin c6c9ce1122504af169c8b73bfff5fb9b1e9c0edb:refs/heads/production
```

## What is being promoted

| Ref | SHA | Date |
|---|---|---|
| `origin/production` (today) | `a771443` | 2026-10-08 20:27 +07, `cd-production` run green |
| `origin/staging` = `origin/master` | `c6c9ce1122504af169c8b73bfff5fb9b1e9c0edb` | 2026-10-13 15:23 +07 |

- `production` is an ancestor of `staging`, so the push is a fast-forward.
- 33 commits, `staging..production` = 0.
- `cd-staging` run 38368953978 deployed `c6c9ce1` with success at 08:23Z. The staging pod restarted at 08:27Z.

## Commits (`git log --reverse origin/production..origin/staging`)

| SHA | PR | One line |
|---|---|---|
| b5b545d | #548 | outbound-sent event and internal outbound read carry `side`, so recruit-be stops counting Team-only mail as LO contact (recruit-be #605) |
| 373b4b5 | #551 | go1.26.9, x/net v0.60.0 (govulncheck) |
| c0754f5 | #550 | email attachments and host-held downloads through files-service links |
| 693659f | #552 | ci: shared Go SDK, cached DB images |
| d8d787c | #553 | files-service links ON on staging |
| bfb827f | #554 | **files-service links ON in production** (`FILES_LINKS_ENABLED: "true"`) |
| cd90498 | #555 | ci: self-hosted compile of the staging release |
| e6bb8d9 | #558 | calls: play the recording of a call Zoom logged on two legs |
| f8669d6 | #559 | ci: golangci-lint lock isolation |
| 5c27d2f | (#556) | files-service grants client |
| 1dab7d4 | (#557) | internal share routes (production: `FILES_SHARE_ENABLED: "false"`) |
| 4690fbc | (#562) | never widen a declared LOAN_PARTY grantee |
| bae6e13 | (#557) | enable file sharing on staging only |
| e0f31d8 | #566 | mint email attachments as the author's user id |
| 54784fb | #570 | migrator base image from mirror.gcr.io, pinned by digest |
| d1fb5dc | #568 | sharing: 404 for ended own links, forward refusals |
| 359587f | #571 | docs: file sharing |
| c1414a1 | #572 | share routes accept a long acting-authorities list |
| 37e58a9 | #573 | sharing metrics and request log |
| 4b6e467 | #574 | sharing: whole-call budgets |
| 14003fb | #578 | sharing: previewable flag, grantee detail route |
| 3c6e7e3 | #579 | sharing: NOT_A_SHARER refusals |
| 9a38d17 | #580 | sharing: outside-links routes (production: `FILES_OUTSIDE_LINKS_ENABLED: "false"`) |
| 7e90039 | #582 | ci: promoter-key guard on U5 pool |
| 9805f14 | #583 | inbound: Team-side sign-in match + verify-sender Team-thread guard, **migration V33** |
| d953786 | #585 | sign-in match key with a domain-separation label; pause lookups when the host is down. "Release omni before tera-be." |
| 07f9bda | #587 | AI13: name alias-source parties on staff reads after a merge |
| e0bb309 | #588 | count sign-in matches by teammate, not by seat |
| 25bdc20 | #591 | FYI email lists files as links (production: `COMM_SHARE_FILES_AS_LINKS` unset, so the default `false` applies) |
| 43be28d | #592 | `{"email": null}` clears an INTERNAL party's email |
| 437dcae | #565 | **every omni mail on moso-notifier v2 as app TERA; omni declares its own types** (fixes prod recruit `MailConfigNotFoundException` for app LO) |
| 2639a5e | #594 | **inbound: attribute a teammate's email only when the From is authenticated** (gated by #593, see below) |
| c6c9ce1 | #595 | read the Workspace MX verdict from ARC-Authentication-Results |

Note on #558: in omni it is only the two-leg recording fix. The "empty From" and endless "Calling…" fixes are not in any omni commit in this range. If they shipped, they shipped in another repo.

## BLOCKER: #593 must happen before this promotion

omni-service issue #593 (OPEN): "Before promoting #589 to production: ship the inbound-email-service trace headers to prod". #594 (2639a5e) is the #589 fix and is in this range.

> If omni production carries #589 before the steps below, every teammate reply in production (work address included) is filed off-file (EXTERNAL, unverified, no author) instead of on the Team tab.

What I checked on 2026-10-13:

- inbound-email-service `Deploy to Production` last ran on `29381c2` (2026-10-07).
- The trace-header change (#12, `7e4e13a`, merged 2026-10-13 07:01Z) is one commit ahead of that build and has only reached `Deploy to Master`.
- **Step 1 of #593 is therefore not done.** I could not read step 2 (the Firestore `forwardTraceHeaders` on the `loan` and `cand` mappings in `loanfactory-email-service`).

The release team's order, from #593:

1. inbound-email-service: run `deploy-production.yml` from master (at or after `7e4e13a`).
2. Firestore `email_endpoint_mappings` (`loanfactory-email-service`): set `forwardTraceHeaders: true` on `loan` and `cand`.
3. Send one reply from a company mailbox to a prod loan alias. The forwarder receipt log must show `authResults`.
4. Only then push omni `production`.

Alternative if the prod email fix (#565) cannot wait for this: hotfix #565 onto `production` (CLAUDE.md "A hotfix"). It carries no schema change, but it still needs the back-merge dance, so pushing the whole of staging after #593 is simpler.

## Risks

1. **#565 gates the whole outbox, SMS included, on the notifier catalog declaration.** `Poller.SetDispatchGate(notify.Client.Declared)` means omni claims nothing until a publish to `CREATE_TEMPLATE_TOPIC` is confirmed. It retries from 1s doubling to 1m and logs ERROR per failed attempt. If the publish fails in prod, no email and no SMS leave. Nothing is lost: rows wait in the outbox.
   - Prod runtime SA `moso-svc@lender-rate` holds `roles/pubsub.admin` project-wide (read from the project IAM policy), so permission is not the risk.
   - The topic must exist in `lender-rate`. I have no permission to list prod topics, so this is unverified. tera-be already publishes there, which makes it likely.
   - On staging the declaration confirmed on attempt 1 (`moso-notifier types declared ... CREATE_TEMPLATE_TOPIC types:2`, 08:27:52Z).
2. **The omni mail identity changes to app code TERA** for every mail, recruit LO_CANDIDATE mail included. It uses the TERA mail config in prod moso-notifier with no fallback. If that row is missing, mail fails the same way it does for LO today.
3. **Migration V33** is `ALTER TABLE comm_message ADD COLUMN IF NOT EXISTS reply_thread_key VARCHAR(8)`. It is catalog-only (no default, no NOT NULL, no index), runs through the helm migrator hook, and does no backfill. This is the only migration (V01–V32 untouched). It is low risk, but it is a schema change, so a helm rollback leaves the column behind. That is harmless.
4. **`FILES_LINKS_ENABLED: "true"` in production values (#554).** The boot is refused if `FILES_CALLER_KEY` is missing from `omni-service-secret` in `omni-prod`. The values comment says the key is there and matches files-service by fingerprint. I cannot read the prod secret or `files-service-prod`, so this is unverified. With the flag on, LOAN mail attachments become 24h files-service links, and host-held downloads stream through files-service.
5. **#594 regression risk** while #593 is open (above).
6. **#585 ordering:** "Release omni before tera-be". omni accepts the old and the derived sign-in key for one release. Promote omni first, then tera-be's derived-key change.
7. **#548 is additive** (optional `side` field, schema_version stays 1). recruit-be #605 reads it. An older recruit-be ignores it.
8. Removed config keys: `COMM_EMAIL_TOPIC`, `COMM_EMAIL_PROVIDER`, `COMM_EMAIL_APPLICATION_ID`, `NOTIFIER_V2_SEND_ENABLED`, and the `SEND_MAIL_TOPIC` envelope. Leftovers in the prod secret are ignored.
9. New config keys: `NOTIFIER_EVENT_TOPIC` (default `NOTIFICATION_EVENT_TOPIC`) and `NOTIFIER_TEMPLATE_TOPIC` (default `CREATE_TEMPLATE_TOPIC`); prod relies on these defaults. Also `FILES_*` and `COMM_SHARE_FILES_AS_LINKS`; prod values set only the three `FILES_*` keys listed above.

## Prod config checklist (before the push)

- [ ] #593 steps 1 to 3 done (inbound-email-service prod at or after `7e4e13a`, Firestore `forwardTraceHeaders` on `loan` and `cand`, receipt log shows `authResults`).
- [ ] moso-notifier prod has the TERA mail config: `GET /api/v1/admin/mail/config/TERA` returns a row. Not checked by me.
- [ ] Topics `NOTIFICATION_EVENT_TOPIC` and `CREATE_TEMPLATE_TOPIC` exist in `lender-rate`, and moso-notifier prod subscribes to both (v2, dual since 2026-10-08).
- [ ] `omni-service-secret` in `omni-prod` has `FILES_CALLER_KEY`, and files-service is Ready in `files-service-prod`.
- [ ] `lf-workflows` pin `@v1.1.0` in `cd-production.yml` is unchanged in this range. Nothing to bump.

## Test plan (after the push)

1. `cd-production` run for `c6c9ce1` is green. The migrator job applied V33.
2. Pods in `omni-prod` are Ready with zero restarts. The image digest matches the run.
3. Logs contain:
   - `outbox EMAIL transport WIRED: moso-notifier v2`;
   - `moso-notifier types declared ... CREATE_TEMPLATE_TOPIC types:2`.
   There must be no repeating declaration ERROR.
4. Recruit prod: send an email to a test candidate (`bao.trinh+tag@loanfactory.com`). Expect moso-notifier to have no `MailConfigNotFoundException`, the mail to arrive, and the omni row to become `sent`/delivered.
5. A loan email with an attachment: the attachment arrives as a files-service link that opens.
6. A teammate replies from a company mailbox to a prod loan alias. The reply lands on the Team tab, authored. `omni_inbound_email_sender_auth_total{outcome="teammate_unauthenticated"}` stays near zero.
7. One outbound SMS is still delivered, which proves the dispatch gate opened.
8. A call recording for a staff-to-staff call plays (#558).
9. Rollback: `helm rollback` in `omni-prod`, then fix forward. V33 is harmless to leave.

## tera-components #314 (omni-react @mention highlight in the composer)

- Merged to master on 2026-10-09 (`74c97ab`), while omni-react on master was at 0.4.25.
- **A stable release has been published.** The first release that contains it is `0.4.25` (release PR #386, `475e41e`, 2026-10-12). `0.4.26`, `0.4.27`, `0.4.28` and `0.4.29` contain it too. The `0.4.24` release does not.
- recruit-fe pins `@loanfactory-inc/omni-react` (and omni-core, platform-react) at **0.4.27** on `master`, `staging` and `production`, and package-lock resolves 0.4.27 on each. That release contains #314, so **no recruit-fe pin bump is needed**.
- The CHANGELOG lists no adopter step: no CSS import and no prop change.
- Nothing was published.
