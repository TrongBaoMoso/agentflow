# HH PR5 (moso-aid roster/team + lf-homepage team-lead picker): combined review 02/10
Architect, security, moso-aid Repo Owner, lf-homepage Repo Owner: all AGREE-WITH-CHANGES. Orchestrator decisions in [brackets].

## Contract (one shape, contract tests in BOTH repos)
{program_id, generated_at,
 counts:{keyed_people, approved, by_status:{...}, keyless_approved, without_company_email},
 members:[{moso_key, company_email, status, level_id, rank, team_lead_key, updated_at}]}
- Drop applicant-typed `email`. No admin_key_name unless read from the Admin record (PR6 resolves keyName via packs and verifies; recruit is authoritative for binding).
- Non-approved members: only moso_key, status, level_id, updated_at (no company_email). Keyless excluded (counted). Cache-Control: no-store.
- Counts via separate countDocuments/distinct, not array length (partial-roster guard, hh-review-v2 #7).

## moso-aid
1. 503 when the directory fails OR comes back empty while members exist; generic body. A null company_email with a working directory = "not in directory" (counted), never "revoke".
2. company_email source: listRecruiters() is page-eligible-only + 5-min cache. Prefer a direct getAdmins lookup by key; else document null semantics.
3. Team-lead validity decided AT READ TIME: emit team_lead_key only if the member is approved AND below team_lead AND the lead is currently an approved team_lead in the same program; else null. Keep one reconcileTeamLeadAfterChange(programId, userKey) helper after every status/level path (updateApproval/bulk, changeLevel/downgrade/promote, withdraw, admin withdraw, revoke) as hygiene; it must never fail the primary op (log loudly). setTeamLead: server-side checks (member approved + below team_lead, not self, lead approved team_lead); no chains/cycles; clear a member's lead when they are promoted to team_lead. Cap history size.
4. listTeams: fetch every keyed row of the program once, group by person, resolve (no partial-slice resolution, no N+1).
5. [Actor] Flat actor_key/actor_name like the other admin routes; moso-aid stores the key only (resolve the name server-side or omit); require non-null actor_key on the team-lead write.
6. [Prod gate] PUT team-lead behind a moso-aid env switch LO_TEAMS_WRITE_ENABLED (fail closed; ON in staging, OFF in prod) until agentflow-048o is closed. GET teams + roster may ship.
7. RECRUIT_INBOUND_SERVICE_KEY in startup-check REQUIRED; code check that the three service keys differ (never print values); secret set on staging only; never paste values anywhere.
8. Tests: the real router registration; 503 paths; stale-lead read guard; each demotion path; startup-check ALL list; unique-index upsert.

## lf-homepage
1. Proxy (loAdminProxy.ts) for PUT lo-programs/team-lead: parse JSON (400 on invalid), 400 when body.program_id ≠ query program_id, OVERWRITE actor_key/actor_name from the authenticated actor and STRIP any other actor-like fields. Decide the getLOInfo fallback in non-deployed envs.
2. Programs with teams derived from level config (a team_lead level exists), "below team_lead" by rank; Ambassador drawer unchanged (test).
3. Use Mantine Select (as DecisionModal) or the existing `tsel` class; Tailwind not inline styles; show a short error note when the teams read fails; reset choice on drawer switch.
4. Tests: proxy test file (allowlist, mismatch 400, actor overwrite), rows in loProgramsQueueApi it.each, TeamLeadSection eligibility.
5. [Prod gate] Hide the picker when NEXT_PUBLIC_ENV === 'production' until 048o; the lf-homepage master→production PR must not ship before 048o or this gate (record on bead).
6. ram-gate for the husky build.

## Rollout
moso-aid PR (dark) → set staging key in moso-aid + recruit-be → lf-homepage picker → recruit PR6 (flag off) → PR7 nav → sync ON in staging only. Production waits: 048o, packs stamp release (#3590), owners' promotions.

## Open product question (asked Bao)
Outside hires apply keyless; nothing links their application to the MOSO account HR creates later → never on the roster, never get a role/page.

## Bao decision (02/10)
Outside hires: NO link action. Documented process: once they have a MOSO account, they log in and apply again; the admin approves the new application. moso-aid/lf-homepage only need to make that path clear (e.g. a note on the admin page / applicant page); PR6 treats keyless rows as not bindable.
