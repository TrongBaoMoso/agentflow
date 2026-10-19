# HR onboarding checklist on the recruit card (agentflow-w9fk4) — STAGING DONE 2026-10-19

Source: tera-docs#677 + ai-hr-be#1116 (Hung Cao, Slack 19/10 "gắn HR vô giúp e"). Product owner Bao 19/10:
tasks (HR / IT / manager steps) are **neither shown nor an S7 gate**; scope **staging only**, no production.

## Shipped

| Repo | PR | Merge | Staging |
|---|---|---|---|
| recruit-be | #682 (D285) | dd0593cf | deployed (cd-staging success); pod env `RECRUIT_HR_UPDATE_ONBOARDING_ENABLED=true` |
| recruit-fe | #525 | 34a563f6 | deployed (cd-staging success) |

- BE: `GET /api/v1/candidates/{id}/onboarding-progress/hr-checklist` (CANDIDATE_READ). States DISABLED / NO_ACCOUNT /
  NO_CHECKLIST (absent, blank/none/cancelled, HR 404) / HR_UNAVAILABLE (200) / AVAILABLE with `todos` + `docs`
  `{total, done_count, all_done, open[], done[]}`. Lenient `steps` parse (never breaks the D258 tick read). 4s timeout
  (`recruit.hr-handoff.checklist-timeout-ms`).
- FE: "In HR" list under HR to-do and HR docs; done steps folded; footer "Checklist from the HR app · read …".
- Mockup v2 (approved): https://claude.ai/artifact/PyRJdeGjhoMp3vYnH7wsKh
- Staging setting `onboarding.progress_reconcile_enabled` = true (set 19/10 via settings API as manhadmin).

## Verified on staging (19/10)
- ai-hr-be staging serves the block (5 LOs probed from the recruit-be pod).
- Endpoint live: a1007 (b5beb0d0…) and t08q20 (f84f8be9…) return AVAILABLE with HR's exact steps.
- Card screenshots: `shots/stg-a1007-desk-light.png`, `-desk-dark`, `stg-t08q20-phone-dark.png`; HR's own view for
  comparison `shots/hr-hire.png` (same 3 steps).
- E2E: as chauchau → View as "QA AnewO" (a1007) → uploaded `Office policies…` acknowledgment (test PDF). HR counted it
  done at once (ack doc); recruit received `associate.updated` at 08:32Z (`hr-update 19598: onboarding ALREADY_DONE`:
  both HR steps were already ticked by hand) and the card shows HR docs **1 of 2 done** (`shots/stg-a1007-after-upload.png`).

## Open
- **agentflow-79nv5**: staging has no `RECRUIT_POST_JOINED_RECONCILE_INTERNAL_API_KEY`, so the reconcile cron is NOT
  registered ("cron NOT registered (key unset)"). Ticks fire only on HR events / one-off checks until it is added.
- **For Hung (HR side):** to-do step `câc` (to-do #124) is linked into the LO checklist but the LO has **no such to-do
  in their to-do list** (View as a1007 → To-dos: not there), so nobody can complete it and HR to-do can never reach
  1/1 except by Complete onboarding. Also the step title "câc" looks like test data.
- Production: not touched (flag default false). Needs ai-hr-be #1116 on prod + Bao's go.
- Slack draft for Hung: in the session reply (Bao sends).

---

# RESUME POINT 2026-10-19 (paused for shutdown) — Licensing states (agentflow-1kw50)

**Bao 19/10 OK:** under the Licensing step, list each applied-for state (`candidates.sponsor_states`) with ONLY
Sponsored / Not sponsored yet / No license yet (NO "In process"; recruit only cares sponsored yes/no; nothing needed
from Hung). Header states the rule, never "x of y": "1 state needed" (or "1 license needed" when no applied-for
states) → "AL sponsored"; other states fold under "N more". **Visibility only — LicensingInference /
HrLicensingProcessor unchanged (D257: one applied-for state sponsored = done).** Same flow as w9fk4: 2 reviewers per
side → CI → merge → promote STAGING → screenshots; **no prod**; no local preview needed.

- Mockup v2 (approved): https://claude.ai/artifact/8Fw3ZHQaVRoSjM44kniF4L
- Contract: `GET /api/v1/candidates/{id}/onboarding-progress/licences` →
  `{state: AVAILABLE|NO_ACCOUNT|UNAVAILABLE|DISABLED, rule: ANY_APPLIED_STATE|ANY_LICENSE, sponsored_state, states:[{state, license_name, status: SPONSORED|NOT_SPONSORED|NO_LICENSE, sponsored_date}]}`; non-AVAILABLE = only `state`.
- Local commits, NOT pushed, NOT reviewed yet — BE 7698dade (D289), FE eb24f460:
  - BE `/Users/apple/Projects/agentflow/recruit-be-worktrees/1kw50-lic` (branch `feat/1kw50-licence-states`)
  - FE `/Users/apple/Projects/agentflow/recruit-fe-worktrees/1kw50-lic` (branch `feat/1kw50-licence-states`)
- Next steps: finish/verify each side (BE: full unit suite, NOT integrationTest locally — Docker on the Mac hung; CI
  runs it. D-number: check master AND open PRs, CI guard rejects collisions); 2 reviewers per side; push + PR; CI;
  merge BE first → `gh workflow run promote-staging.yml -f sha=<merge sha>` → confirm cd-staging; then FE; screenshot
  LO bao.trinh+a3009f (candidate 73fd9c9c-ae63-4ac7-8ffe-2347a49f3798: applied AK/AL/TX, AL licence not sponsored).
- Test in HR staging with **chauchau** (full permissions): Associates → QA Anewe → Licenses → Edit licenses → AL
  Sponsored = Sponsored → recruit should auto-tick Licensing and header "AL sponsored".

Other open items: agentflow-79nv5 (staging reconcile cron key); Bao will reproduce + explain the HR to-do list naming
issue he saw with Hung.
