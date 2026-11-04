Thanks @imkhai, and thanks for the clear verification notes on #304. We'll take this release, but recruit-fe can't go to production on its own right now. Here is why, what we will do, and the order.

> Please release only when your own staged work is ready. That is your call.

**Why not FE-only now.** recruit-fe staging is 155 commits ahead of production (`45d1561`) and recruit-be staging is 164 ahead (`b0e9f42d`). Several staged FE features call recruit-be endpoints that production does not have yet, so promoting FE alone would break them on production:
- "Save & invite" on the call result: production recruit-be answers 400.
- Assign onboarding specialist, schedule / resend the 1-1, legal-name confirm, resend invite, remind: 404 on click.
- The checklist template editor (fe #233/#237) must not ship before its BE change (be #442).

Features that tolerate a missing endpoint (My invites, bell, ready-to-join, role-based sidebar, Zoom notice) degrade safely, but the ones above don't.

**Order we will follow** (fast-forward only, pinned SHAs, per DEPLOY.md):
1. Prerequisites on our side: a recruit-DB-only backup, and a rollback test (boot the current production image `b0e9f42d` on a copy migrated to V178). recruit-be production goes from V131 to V178 (26 migrations, additive).
2. recruit-be: promote a pinned staging SHA, then check: migrations at v178, 2/2 pods ready, key settings as expected.
3. recruit-fe: promote the pinned staging SHA that includes #304 (currently `5475ea6`), only after step 2 passes.

**Your post-release checks:**
1. The production image build log shows `npm ci` resolving `@loanfactory-inc/*` from the lender-rate store. We'll check this.
2. Candidate conversation on production: omni is not configured for recruit-be production yet (no `RECRUIT_OMNI_*` in the production env, empty base URL). So the conversation panel will not load messages on production whatever the FE does. We'll report that state honestly on omni-service#467 rather than mark it passed. If the omni programme wants recruit conversations live on production, that needs the recruit-be production omni config as a separate step. Tell us if that's planned.
3. We'll post the results on omni-service#467.

**Rollback.** FE: re-pin the current production image, or revert and promote again. BE: re-pin the current production image, only once the rollback test in step 1 has passed.

**Timing.** We'll start once the step 1 prerequisites are done. The DB backup needs someone with Cloud SQL admin on the recruit DB. We'll update this issue when we begin and when each step lands.
