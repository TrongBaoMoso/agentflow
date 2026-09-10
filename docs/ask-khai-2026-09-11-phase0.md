# omni / recruit — what is left on your side, 11/09/2026

Everything asked on 10/09 has merged: omni-service **#281 #282 #283 #284 #285**.
Nothing below repeats those.

Two of the items here are **new findings from today**, not follow-ups: §1 (the
production question) and §5 (a disclosure decision that a recruit-be change on
09/09 turned from theoretical into live).

Ordered by what is blocking whom, not by size.

---

## 1. When does omni go to production?

Measured today, without needing cluster access:

| measurement | result |
|---|---|
| `git ls-remote --exit-code origin prod` | **rc=2 — the branch does not exist** (control: 56 remote heads) |
| `gh run list --workflow=cd.yml --limit 400` | **172 runs total: 170 push/master + 2 workflow_dispatch/master + 0 on `prod`** |
| `cd.yml` | all 16 prod selectors key on `github.ref == 'refs/heads/prod'` |
| `kubectl get ns omni-prod` | Active 17d |

So CD has never deployed omni to production, and both manual dispatches ran on
`master` (i.e. they deployed staging).

**Stating the scope precisely:** both measurements are about the **pipeline**, not the
**cluster**. A `helm upgrade` run by hand bypasses CI entirely, and ruling that out
needs read access on `omni-prod` — see §2. So the claim is "omni has never been
deployed to production through its only pipeline", not "production is empty".

**Why we are asking rather than planning around it:** every recruit feature we
are about to build on omni is verifiable on staging and *unverifiable* on prod.
A green staging acceptance would read as "done" and be wrong. We would rather
hold the recruit rollout to your timeline than ship something that only works in
one environment.

## 2. Read access to namespace `omni-prod`

`bao.trinh@loanfactory.com` is Forbidden there — both namespaced and at cluster
scope. `recruit-be` reads fine, so this is per-namespace RBAC, not a broken
kubeconfig.

This is not only about measurement. It is the **precondition for any fail-closed
guard on prod config**: a hard guard written against configuration we cannot read
turns a weak-but-running deployment into one that will not boot. Until we can read
it, we will ship fail-*visible* (a warning line) where a refusal would be correct.

## 3. Subject guard on the dedupe lookup

`V08__comm_message_dedupe_tenant.sql` is unique on `(tenant_id, dedupe_key)` —
**no subject**. And that namespace is already populated by raw provider ids:
`inbound/call.go:800` uses the Zoom call id, `sms_ports.go:145,177` and
`email.go:380` do the same. `system.go:78-81` returns the existing row **silently**
without comparing subject.

We will prefix every key we write, so this is not blocking us. We are raising it
because the guard belongs on your side: it changes `RecordSystemEvent` behaviour
for **every** adopter, and `SystemRecorder` has no caller yet
(`git grep SQLSystemStore -- cmd/` is empty; control: `main.go` has 4 hits for
`NewKeySet|messageshttp`), so there is nobody on our side to patch it for.

## 4. SYSTEM rows — two questions, one of them a policy call

**(a) Wiring.** `internal/messages/system.go` has a complete, idempotent
`SystemRecorder`, and `system_sqlc.go:29/:48` have the store — but no route, and
`cmd/` never constructs it. That is why the "System update" filter chip counts 0
even in tera. Missing: store wiring + recorder + route + auth + tenant resolve.

**(b) Visibility — this is the policy call.** `placement.go:61-62` lets
`SideSystem` match **every** tab, and `system.go:16-21` states it "renders in BOTH
channel tabs to EVERY caller, confined external callers included". Today the only
thing keeping a candidate out is that they do not resolve to their own party:
`CandidateCastAssembler:169` sets `principal_id = trimToNull(candidate.getAccountId())`,
and `setAccountId` has exactly **one** writer (`DedupServiceImpl:298`, a merge fill).

That column is *planned* to be filled when an S7 writer lands. So a SYSTEM row we
write today would **sit there** until that day and then become visible. We would
like the decision before we write any, not after.

## 5. Should an elevated actor appear on the cast? — **new, and live since 09/09**

recruit-be **#316** (D110) lets an actor holding `REPORT_TEAM` (MANAGER, ADMIN via
the wildcard) view and act on **any** candidate's follow-ups, and attributes every
activity to the **acting** user, never to the owner. That was a product request.

But `CandidateCastRole:16-23` says recruit-be **deliberately never pushes**
`HIRING_MANAGER`, and gives the reason:

> "Mapping an rbac role onto it instead (`MANAGER`, say) would be inventing an
> edge: every manager would land on every candidate's conversation and gain the
> INTERNAL read that `access.Decide` grants a cast member, **which is a disclosure
> decision nobody has made**."

Measured: `grep HIRING_MANAGER` over `recruit-be/src/main/java` returns 3 hits, all
javadoc or the enum declaration — no push site.

Consequence: a manager records a call outcome, we try to write that note to omni
under their identity, `authorOn` returns `ErrNotInternalParticipant`
(`service.go:1931-1938`; LO_CANDIDATE is cast-only, `loCandidateStaffGrant = []`),
and the write is refused. **Exactly the notes D110 exists to make team-visible are
the ones that would never reach omni.**

We are shipping the fail-closed option: **do not mirror an off-cast actor's note,
and say so in the UI.** Nothing is silently lost and we need nobody's decision.

The question for you is whether the other option is acceptable — pushing
`HIRING_MANAGER` for an elevated actor. Stating the real scope, because it is wider
than it sounds: `access/gate.go:245-246` returns `Access{Read: true, Confined: false}`
for `hasInternal`, and `Confined: false` means **both sides**. There is no narrower
axis — `.Rank` has 0 hits in `internal/access/`, so rank orders the display and
grants nothing. So the decision is not "let a manager see the team's notes", it is:

> **a manager reads the candidate's entire correspondence — every email, every SMS
> the candidate exchanged — not just the Team side.**

**And one thing we want to rule out before it comes up:** filling
`loCandidateStaffGrant` is *not* an alternative. It widens read the same way
(`Confined: false`) but org-wide instead of per-candidate — your own javadoc calls
that "how a recruiting record ends up readable by the whole company" — and it still
does **not** let the manager author the note, because `internalAuthorIn`
(`service.go:1946-1956`) requires a real INTERNAL cast row matching `principal_id`
and has no staff-grant branch. It is the dangerous half without the useful half.

We also considered writing the manager's note as a SYSTEM row (authorless, so it
skips `authorOn` entirely). We are not doing that: `system.go:16-21` says a SYSTEM
row "renders in BOTH channel tabs to EVERY caller, confined external callers
included", and on `LO_CANDIDATE` the external caller is the candidate.

If the answer to (a) is no, we will keep the fail-closed behaviour permanently
rather than leave it as a stopgap.

## 6. Retention declaration for `LO_CANDIDATE`

Today it is retain-forever, through three independent locks:
`declaration.go:238-240` (a type declaring no retention block is retain-forever),
`registry/lo_candidate.go` (0 hits for retention/erasure), and
`config.go:487-517` (`RETENTION_PURGE_EXECUTE_ENABLED` defaults false,
`RETENTION_PURGE_SUBJECT_TYPES` defaults empty).

We are designing on the assumption that this can change with **one line of config**
and that no CI of ours would notice. Two questions: what is the intended retention
class for `LO_CANDIDATE`, and who signs off on changing it?

Context for why it matters to us: `destructive_sql.go:35` `notSystem` means the only
rows surviving a scrub are `side='SYSTEM' OR sys_type IS NOT NULL`. NOTE bodies and
CALL content (`transcript`, `recording_url`, `ai_summary`) are all in scope. That is
what pushed us to keep recruiter notes in recruit-be and join content at read time
instead of mirroring it — so a change here changes our design, not just our data.

## 7. IAM on the `audit-events` topic

We would like to consume `subject.erased` (`erasure.go:572`, via govaudit) so a
future AI context corpus can be revoked when a subject is erased. The topic already
has 5 independent pull subscriptions, including another team's
`audit-events-posthog`, so a sixth is precedented. Topic-level IAM is the only part
we cannot read (PERMISSION_DENIED), so we cannot tell whether we already have it.

## 8. Small correction in your repo

`internal/retention/retention.go:4-6` still carries the boxed banner
`# STAGE A: FOUNDATION ONLY — THIS PACKAGE DELETES AND ANONYMIZES NOTHING. #`,
while `destructive.go`, `destructive_sql.go` and `executor.go` have all landed and
do delete and anonymise.

Worth a line because it is a *framed* banner: it reads like a live guarantee, so a
reader checking "can retention touch this data?" gets a confident wrong answer.

## 9. `cd.yml` — one line that turns a silent failure into a loud one

Not a request for access; a defect we found while answering §1, and the cheapest item
on this list.

`cd.yml` has 16 selectors of the form
`${{ github.ref == 'refs/heads/prod' && <prod> || <staging> }}`, matching that exact
string, and no step fails on an unrecognised ref — the else branch is **staging**.

So whoever cuts the production branch and names it **`production`** gets
`environment=staging`, `project=lenderrate-master`, `cluster=moso-kube`,
`namespace=omni-sta`, `values-file=values-staging.yaml`. CI green, deploy green,
production empty — and **staging overwritten by what everyone believes is the
production release**. Nothing logs a problem, because by the pipeline's own reckoning
everything ran correctly.

This is not hypothetical. In this org `recruit-be`, `recruit-fe` and `lf-homepage` all
use `production`; omni is the repo that uses `prod`. Whoever cuts that branch will most
likely type the name they type everywhere else.

Fix: make the ref an explicit allowlist and **fail the job** on anything else, instead
of falling through to staging. Or minimally, a first step:
`if github.ref not in {master, prod} → exit 1`.

Worth doing **before** the branch is cut, because that is the day it fires, and it
fires quietly. It also protects your staging, not just our rollout.

---

## Separately — for IT, not for you unless you own it

We need two values from `admin.zoom.us` for each recruiter who should be able to
send SMS or place calls from the recruit app:

- `zoom_los_user_id` — User Management → Users → the person → User ID
- `zoom_account_email`

Then `PUT /api/v1/admin/zoom-links/{central_user_id}` with
`{zoom_los_user_id, zoom_account_email, note}`. ADMIN reaches `SETTINGS_MANAGE`
through the wildcard, and there is no UI yet, so this is a curl for now.

**This is the single item blocking the feature the business asked for first.**
Everything else in omni is ready: `senderIdentity()` now reads `recruiter_zoom_link`
(V060) instead of returning `NO_LINK`, and the SPI resolver reports
`subject_types=[LOAN, LO_CANDIDATE]`. The table has **0 rows** (control:
`candidates` = 7243), so SMS and Call stay switched off in the UI until it is
populated — turning the flag on first would only show a composer that fails to send.
