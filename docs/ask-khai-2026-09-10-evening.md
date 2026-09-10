Hi Khải — omni/recruit status and what is left on your side. Everything asked
earlier today has landed; this is the remainder.

**Landed today, nothing needed:** omni-service #281 · #283 · #282 · tera-fe #555
(+ omni packages 0.1.1). LO_CANDIDATE is wired end to end on staging — SPI
resolver reports `subject_types=[LOAN, LO_CANDIDATE]`, cast writes bound to
`recruit-be`, and the host call answers 200 with the right Access-Token / 401
with a wrong one.

---

**1. Two omni-service PRs open — they need a click (the repo has auto-merge off)**

- **#284** — log the cast write that PASSED, not only the ones refused. On a
  cast-only type the cast is the read ACL, so a cast write is an authorization
  write, and today only refusals are recorded. Adds one Info line per cast
  *write* carrying `presented_service` and `key_scoped`.
- **#285** — spell the adopter `recruit-be` (35 stale mentions, all comments /
  docs / fixtures) and fix the `base_url` examples, which were wrong on service,
  namespace *and* port: they said `recruiting-be.recruiting…:8080`, the cluster
  has `recruit-be.recruit-be.svc.cluster.local:8090`. A second commit on the same
  PR de-stales one more comment: `redispub/publisher.go` said *"Nothing subscribes
  it yet"* of the generic change channel, and recruit-be now does — so a change to
  that channel's shape stops a live conversation refreshing, with nothing in
  omni-service going red.

Both: full suite green, conformance replayed against a real Postgres, no fixture
and no wire byte changed.

**2. Retiring the legacy unscoped `INTERNAL_API_KEY` — please merge #284 first**

`omni-sta` still boots with `keys: 2`, one of them unscoped. Right now nothing on
either side can attribute a cast write: omni's request log carries an empty user
for a key-only caller, and an unscoped key's `Principal.ServiceName` is the raw
`X-Service-Name` header, so the adopter's own logs cannot answer it either.

A correction, in case an earlier draft reached you: the field to read is
`identity_from_key`, **not** `key_scoped`. Scope and identity are independent in
the key config — a key with `allowed_subject_types` and no `service_name` is
scoped while still taking its name from the header — so scope is not a stand-in
for provenance. #284 now logs both, and step 3 below names the right one.

We know who holds it. Hashes only, values never printed:

```
omni-sta    INTERNAL_API_KEY               791a25f4b29bdcbc  (len 48)
tera-be     OMNI_INTERNAL_API_KEY          791a25f4b29bdcbc  ← same key
recruit-be  RECRUIT_OMNI_INTERNAL_API_KEY  010d5c6ed73e7766  ← different (scoped)
negative control (an unrelated secret)     66bc44da052ddcd1  ← differs from both
```

**Suggested order. It waits for a POSITIVE signal, never for an empty list:**

1. merge **#284**, let staging redeploy — now an authorized cast write is recorded
   at all;
2. **issue tera-be a scoped key and deploy it** — `service_name: tera-be`,
   `allowed_subject_types: ["LOAN"]`. Add it *alongside* the unscoped one; the key
   set already holds two, so both are valid during the switch and nothing breaks
   at any point;
3. wait for a LOAN cast write to log `presented_service=tera-be` with
   **`identity_from_key=true`**. That line is tera-be confirming omni resolved its
   name from the key rather than reading it off a header it sent;
4. **then** remove the unscoped key.

**Why not "watch for a day and delete if nothing shows".** That was our first
draft and it is unsafe, for two measured reasons:

- a cast write needs a human doing recruiter or LOS work. On recruit-be's side the
  only unconditional push is `ActivityServiceImpl:114` logging an activity. The
  other **six** call sites are all gated on the candidate already having a cast —
  five `pushIfAlreadyCast`, plus `pushAllIfAlreadyCast` filtering a bulk list
  through the same memo — and they do nothing at all for a candidate never
  contacted. Staging saw **0 cast writes** across a pod's whole 41-minute life. An
  empty list there means *no traffic*, not *no callers*.
- and the caller we are looking for writes **LOAN** casts, not `LO_CANDIDATE` —
  so watching recruiting traffic could not answer the question even if it were
  busy.

The order above is immune to both: step 3 is something that must *appear*, so a
quiet environment stalls the runbook instead of authorizing a deletion.

**If an unknown third holder exists**, removing the key surfaces it as a 403 whose
log line already carries `presented_service` — attributable and revertible, rather
than a silent failure.

**3. `roles/pubsub.publisher` for `recruit-be@lenderrate-master`**

Currently 0 bindings, so the flag cannot be turned on at all.

**4. Two access items**

- Please revoke the borrowed omni-deploy key
  `a3087a4fcf8d1baabc47f768381a252b5a408d81`.
- Read access on the prod cluster would remove a real blind spot on our side.
  Today `omni-prod` and `frontendconfigs` on `moso-gke` both return Forbidden, so
  we can verify staging and only infer production. Read-only is enough.

**5. omni-react / omni-core — this one is now a PR, not a request**

**tera-fe #560.** Both things I would have asked for, done and measured:

- the config seam (`ConversationSectionConfig`, `DEFAULT_ROLES`,
  `DEFAULT_CAPABILITIES`) re-exported from the root `src/index.ts` — **not** as a
  new `exports` subpath, which would have published the private `_config` tree to
  reach three symbols;
- `typesVersions` added to both manifests, so `omni-core/i18n` and
  `omni-react/tailwind-preset` resolve under `moduleResolution: node10` (which
  ignores `exports` entirely). Proven by mutation: TS2307 goes 0 → 1 when the key
  is removed, with a positive control either side.

Both packages bumped `0.1.1` → `0.1.2`. Nothing ships until a tag is pushed:
`git tag omni-v0.1.2 && git push origin omni-v0.1.2`.

One judgement call left to you: `DEFAULT_ROLES` is the **loan** role table under a
generic name, so a non-loan host that adopts it wholesale loses translated labels,
the avatar palette and a meaningful sort order. The PR documents that next to the
export and pins it with a test. `LOAN_ROLES` would be the honest name, but that is
breaking, so it is not in the PR.

**6. zoom-go `call-artifacts`** — still the open question from earlier.

**7. One question, not a request — who can open LO_CANDIDATE's triage queue?**

`LO_CANDIDATE`'s staff grant is empty (`loCandidateStaffGrant = []string{}`), so
on a cast-only type the cast *is* the read ACL and nobody — us included — can open
the triage queue for it. We had this filed as "not assigned to a team yet", which
was wrong: it is not an ownership question, there is simply no grant that opens it.

Two ways this could be intended, and we do not know which:

- it stays cast-only and recruiting candidates are never triaged from that queue; or
- a staff grant gets defined, and we would need to know which role.

Not blocking anything on our side — we just do not want to build against the wrong
assumption.
