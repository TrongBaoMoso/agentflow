# P4 S6 (first part) on staging: the invite and welcome link to the Recruit portal (07/11/2026)

Bead `agentflow-0gwad.5.6` (under `agentflow-0gwad.5`). recruit-be decision **D399** (amends D382). STAGING only; production values untouched.
**No token, secret or PII is in this folder or in any log.** Test addresses were `bao.trinh+…@loanfactory.com` only. No SMS was sent.

## What changed (recruit-be)

| PR | Commit | What |
|---|---|---|
| #897 | `7c45e0938` (squash), promoted (cd-staging run 42275441823, success) | Flag `recruit.features.portal-join-link` (`RECRUIT_FEATURES_PORTAL_JOIN_LINK`): staging `true`, production absent |
| #898 | `73ff60428` (squash), test only, merged | `PortalJoinLinkWelcomeIT`: the same path with staging's onboarding flags. CI green: the 1-1 DONE sends the welcome with a live `?t=` link, and the body is REDACTED |

**When the flag is live.** The flag counts only when all of these hold (`PortalJoinLinkSwitch`): the flag on, `onboarding-portal` on, an https `RECRUIT_ONBOARDING_PORTAL_PUBLIC_URL`, and Recruit's invite and welcome mails both on.

**Then, for a Loan Officer with no MOSO record (`legacy_key` null):**
- The D382 refusal lifts. Invite, approve, resend and Save & invite all go through. `GET /config/candidate-view` answers `invite_needs_moso_record: false`. recruit-fe already follows it (#695), so there is no FE change.
- The invite and welcome e-mails carry `<public-url>?t=<token>` for the lead's offer instead of MOSO's `?key=` link. The welcome uses the lead's SENT or SIGNED offer.
- No packs INVITE row is written and packs is never called. These leads have no MOSO record.

**MOSO-linked leads do not change.** They keep the `?key=` link and the packs INVITE. `RECRUIT_FEATURES_PORTAL_MOSO_MIRROR` stays `false`.

**Mail copy does not change.** The invite and welcome templates are as before; only the link differs.

### Token lifecycle

1. **The link is made last.** Recruit renders the mail with a `?t=REDACTED` marker, claims the mail's dedupe key, and only then makes the link (`OnboardingTokenService#issue`). It does this in its own committed transaction, under the offer row lock. The marker is swapped for the real link only in the copy that is published.
2. **A mail that does not go out makes nothing.** This covers a refused mail (suppressed, allowlist, template refused), a claim lost to another pod, and DRY_RUN. The Loan Officer's earlier link keeps working. A DRY_RUN body shows `?t=DRY_RUN`.
3. **If no link can be made after the claim** (the offer closed, the record merged away, or the body does not carry the link), the claim is released: SKIPPED `NO_LINK`, and the key is free again.
4. **The newest e-mail always opens.** Every e-mail that goes out (the first invite, a confirmed resend, the welcome) makes a new link and revokes the older one (D368 rotation). So:
   - a resend after a failed invite carries a fresh link;
   - the welcome kills the invite's link;
   - a staff "copy link" (`POST /offers/{id}/onboarding-link`) kills the link that was mailed.
5. **No secret is kept.**
   - `lo_mail_sends.rendered_body` keeps only the `REDACTED` marker, and the database stores only the token's SHA-256.
   - No log line prints the token.
   - A failed publish of such a mail stores only the error type.
6. **Accepted:** a publish that fails AFTER the link was made leaves the older link revoked until a resend. The ledger row is FAILED, and the resend flow already handles that.

### Review

An independent java-reviewer agent, given only the diff, found 0 CRITICAL issues and 1 HIGH issue.

| Finding | Problem | Fix |
|---|---|---|
| HIGH | The link was made before the render, the claim and the publish. A refused template or a lost claim could kill the Loan Officer's live link while no new mail went out | Second commit in #897: make the link after the claim |
| Re-review gap | No check that the marker URL was in the rendered body before making the link | Third commit in #897: add that check |

The re-review confirmed the HIGH is resolved.

### Tests (CI, real Postgres)

- `PortalJoinLinkMailIT`, 4/4:
  - **Recruit-only invite:** the e-mail carries a live `?t=` link for this offer. The token's hash is the offer's only live token, the stored body says `REDACTED`, and there are 0 packs rows.
  - **Resend and welcome:** a resend after a failed invite brings a new link and marks the first ROTATED. The welcome then rotates it again.
  - **MOSO-linked control:** `?key=`, one packs INVITE row, no token.
  - **DRY_RUN:** no link is made.
- `MosoRecordOptionalIT`, 4/4. The flag is absent here, so this is the negative control: the D382 refusal still holds.
- Unit tests, about 190 across 10 classes:
  - `LoanOfficerMailSenderTest`: the link is made after the claim; refused mails make nothing; DRY_RUN; NO_LINK releases the claim; the body-without-link guard; a publish error keeps only the error type.
  - `InviteMailTest`, `WelcomeMailTest`, `MosoRecordRequiredFlagTest`, `PortalJoinLinkSwitchTest`.
  - The resend, invite-status and my-invites suites.

## Staging E2E (07/11, 01:35–02:45 VN; recruit-be `7c45e0938`)

**Setup.** Admin test account `bao.trinh+admin`, through the API (`gateway.viet18.com/recruit-svc`) and headless Chromium under ram-gate.

**On staging the invite e-mail is never sent, for any lead.** Two staging flags cause this:
- `RECRUIT_FEATURES_ONBOARDING_V2_HANDOFF`: the D207 hand-off;
- `RECRUIT_FEATURES_INVITE_WAITS_FOR_SPECIALIST`: D354.

The invite is handed to the onboarding specialist, so the Loan Officer's first Recruit e-mail is the **welcome** after the 1-1, and that is the e-mail that carries the portal link. Production also has the hand-off on (since 29/10). The invite-mail path itself is proven by `PortalJoinLinkMailIT`.

| Step | Result |
|---|---|
| **BEFORE** (staging still on #896): lead `176f9b75-49f7-4802-9a05-777e5c259d03` (`bao.trinh+s6h5yt2`, no MOSO record), "Add lead", claim, 3 figures, then offer request | **400**: "S6 Before h5yt2 can't be invited yet because they haven't signed up on the Loan Factory website…". `invite_needs_moso_record: true`. Shot: `before-1-invite-refused.png` (Log result → Interested → "Yes, prepare offer" shows the refusal) |
| Flag after promote | `GET /config/candidate-view` answers `invite_needs_moso_record: false` and `moso_record_required: false` |
| **AFTER, invite:** lead `59ea5eb6-21ac-493e-9fa5-2ddf592a1e21` (`bao.trinh+s6wca35`, no MOSO record), "Add lead", claim, figures, offer with `approve_now` | **201**, offer `693ed070-d2f6-4fb8-b097-aacb0ab43c15` **SENT**. The specialist was auto-assigned and the lead moved to Onboarding. Hand-off means no invite e-mail. No packs INVITE row (the invite card has no `invited` row and no delivery problem). Shot: `after-1-lead-handed-off.png` |
| **Portal opens the lead's own data** (a staff link minted with `POST /offers/{id}/onboarding-link`, kept in a 0600 file and deleted afterwards) | At both 1440 and 375, `profile`, `fee-config` and `page-texts` answered 200. After "Before You Begin", the form fields hold the lead's first and last name ("S6", "After wca35") and their e-mail. Shots: `after-2-portal-desktop-intro.png`, `after-2-portal-desktop-basic-info.png`, `after-2-portal-mobile-intro.png`, `after-2-portal-mobile-basic-info.png` (the site's video teaser covers part of the mobile form) |
| **1-1 DONE** (`PATCH /checklist-items/31cd4002-…`, `lo_type` INDEPENDENT) | **200** DONE. The **welcome went out**: the timeline shows "Email sent · Loan Factory Onboarding: Complete These Initial Steps" (19:35:39Z). Shot: `after-3-welcome-email-sent.png` |
| **The welcome made a new link** | The staff link from the portal step, opened again after the welcome, now gets `profile` **404** and `fee-config` **404** (before the welcome it was 200). It was rotated, and the only link made after it is the welcome's. Shots: `after-4-older-link-after-welcome-*.png` |
| **Control: MOSO-linked lead** `d0e4b60c-3962-4b7b-91c0-91756f3a3f15` (`bao.trinh+a3009e`, idle test lead since 01/10), figures, offer with `approve_now` | Offer `4625018e-732a-4564-9027-6ca0941004f0` **SENT**. The invite card says `invited: SENT, channel HANDOFF`, specialist set, no Recruit mail. This is the packs INVITE delivered to MOSO exactly as before |
| Cleanup | All 3 leads ARCHIVED (bulk-archive 200, 3 OK) |

### Not measured on staging, and why

- **The `lo_mail_sends` row and the stored body (`?t=REDACTED`), checked in the database.** GKE access (kubectl and the read-only DB pod) failed mid-run: Bao's gcloud session needs an interactive `gcloud auth login`, which nobody can do while he is asleep. CI proves the same thing on a real Postgres (`PortalJoinLinkMailIT`, `PortalJoinLinkWelcomeIT`).
  - Once logged in, check with: `SELECT kind, status, rendered_body ~ 'register-loan-officer\?t=REDACTED' FROM lo_mail_sends WHERE candidate_id = '59ea5eb6-21ac-493e-9fa5-2ddf592a1e21';`
- **The pod env check by kubectl.** Instead:
  - cd-staging succeeded on `7c45e0938`;
  - `candidate-view` reports the flag live, which needs `RECRUIT_FEATURES_PORTAL_JOIN_LINK` together with the portal and mail flags.
- **Clicking the link in the e-mail itself.** I have no access to Bao's inbox (the Gmail connector is not his). The welcome sits in the `bao.trinh+s6wca35@loanfactory.com` inbox, and **its link is the live one**. Archiving does not revoke a link; only a decline or expiry does (D368).
- **The pod logs.**

### Found during the E2E (not fixed, pre-existing)

1. **A future 1-1 date answers 500, not 400.** The first PATCH sent "today" in Vietnam time (2026-11-07), which was tomorrow in UTC, and got **500 "Something went wrong"**. A past date gave 200. The refusal of a future meeting date surfaces as a 500. #898's IT shows the D399 path itself is fine.
2. **A rotated or dead `?t=` link shows the empty public sign-up form, with no "this link has expired" message** (`after-4-…`). The Loan Officer cannot tell the link died. This becomes more likely with D399, because the welcome rotates the invite's link. It belongs to the lf-homepage S2 page, and the copy is Bao's decision.
3. **The invite card's "invited" step stays not-done for a Recruit-only lead under the hand-off.** That step reads only packs INVITE rows, and these leads have none. The lead itself moves to Onboarding correctly.

## Gaps (accepted in D399)

- **Signing.** There is no e-sign for these leads yet (S4/S5 not built). The portal keeps its existing state, "you can sign after your call / we will email you". No new copy was invented.
- **Reminders.** The invite reminder (D380) and the 1-1 reminder still need a MOSO record, so they skip a Recruit-only lead. Nothing breaks: they simply do not send.
- **Staff "copy link".** It rotates the mailed link, which is the S1 rule. Whoever copies a link should know the Loan Officer's e-mailed link stops working.

## Open questions for Bao

1. **The dead-link page.** Should a rotated or expired `?t=` link show a "this link has expired, check your latest e-mail or ask your onboarding specialist" page on lf-homepage, instead of the empty form? The copy is yours to choose.
2. **Should the invite reminder (D380) carry the portal link too** for Recruit-only leads? It would then make a new link with each reminder, by the same rule.
3. **Should archiving a lead revoke its portal link?** Today only a decline or expiry of the offer does.

## Links

- recruit-be #897 (D399): https://github.com/LoanFactory-Inc/recruit-be/pull/897
- recruit-be #898 (IT): https://github.com/LoanFactory-Inc/recruit-be/pull/898
