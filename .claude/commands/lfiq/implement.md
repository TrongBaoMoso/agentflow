---
name: "LFIQ: Implement Jira Ticket"
description: "End-to-end LFIQ implementation: fetch Jira ticket → read Doc entry (with images) → infer FE/BE → branch → code → test → PR → update Jira → log timesheet"
category: Workflow
tags: [lfiq, jira, automation, autonomous]
---

# LFIQ Implement — Autonomous Ticket Pipeline

**Argument**: `$ARGUMENTS` — a Jira ticket key, e.g. `LFIQ-260`. If empty, pick the next NEW unassigned LFIQ ticket via JQL.

## Pipeline

```
1. Get ticket → 2. Read doc entry + images → 3. Infer FE/BE
   → 4. Branch → 5. Implement → 6. Test + lint + build
   → 7. PR + push → 8. Update Jira → 9. Log timesheet → 10. Report
```

## Constants you can rely on

- LFIQ doc ID: `1vL0gQ1TLMBlXVfEgJkPaFoCWF1C9fjKhknIQl-HK-Xc`
- LFIQ Sheet ID (timesheet): `1HZoQV1P3-IOZgxQpJ5kbFx8m2t5SEzUSbhBmdJqcP6A`
- Atlassian Cloud: `mosoteam.atlassian.net`
- Bao Trinh accountId: `712020:48967791-066e-4dab-a7ec-4d5122d11093`
- FE repo: `/Users/apple/Projects/agentflow/lf-iq` (Next.js 14 + Mantine 7)
- BE repo: `/Users/apple/Projects/agentflow/lfiq-backend` (Java 21 + Spring Boot)
- Helper script: `python3 ~/.config/gcloud/gws.py <cmd>`
- JIRA env vars in shell: `$JIRA_URL`, `$JIRA_EMAIL`, `$JIRA_API_TOKEN`

## Branch + merge policy (CRITICAL)

| Repo | Base branch | PR target | After PR |
|---|---|---|---|
| lf-iq (FE) | `production` | `master` | CI auto-merges feature→master. Bao self-tests on master, then merges master→production manually |
| lfiq-backend (BE) | (check at runtime via `git remote show origin`) | base branch | Wait for Bao to review + merge manually |

## START TIMER

Record `START_TIME` as the current UTC ISO timestamp (`date -u +%Y-%m-%dT%H:%M:%SZ`). You'll use it at Step 9 for timesheet logging.

---

## Step 1 — Get the Jira ticket

If `$ARGUMENTS` is empty:
```bash
curl -sS -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=project=LFIQ+AND+status=New+AND+assignee+is+EMPTY+AND+labels=from-doc+ORDER+BY+created+ASC&maxResults=1"
```
Take `issues[0].key` → that's the ticket. If none, report "No NEW unassigned LFIQ tickets" and exit.

If `$ARGUMENTS` is provided (e.g., `LFIQ-260`), use it directly.

Fetch full ticket:
```bash
curl -sS -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/LFIQ-XXX?fields=summary,description,status,labels,parent,issuetype"
```

Extract:
- `summary` — should contain `[NNN]` prefix; parse `NNN` as the doc entry number
- `description` — ADF; look for the deep-link URL (may contain `#bookmark=` or `#heading=`)
- `issuetype.name` — Bug or Task
- `labels` — should contain `from-doc`

If summary has no `[NNN]` prefix, abort: ticket wasn't created by the auto-triage routine.

## Step 2 — Read doc entry + download images

```bash
python3 ~/.config/gcloud/gws.py doc-entry 1vL0gQ1TLMBlXVfEgJkPaFoCWF1C9fjKhknIQl-HK-Xc <NNN> 5 /tmp
```

Output JSON includes:
- `entry_title`, `entry_text` — content
- `images[]` — `{ path, mime, bytes }` for each inline image (capped at 5)
- `title_strikethrough` — true if Thư marked the title struck-through (treat as completed)
- `title_named_style` — `"HEADING_3"` if Thư applied Heading 3, else `"NORMAL_TEXT"`
- `title_heading_id` — auto-generated anchor ID (only if Heading 3)
- `deep_link` — full URL to the entry (only if Heading 3); use this for the Jira PR comment
- `duplicate_count` — informational; if >1, doc-entry already picked the latest occurrence

Pre-checks BEFORE coding:
- If `error` present → entry not found. Possible: doc updated since ticket was created; renumbered. Stop and ask Bao.
- If `title_strikethrough: true` → entry was marked completed visually. STOP and ask Bao whether to proceed (Thư may have struck it through after the ticket was created).
- If `deep_link` is null → Thư didn't apply Heading 3. Continue, but the PR comment falls back to the doc-tab URL.

For each image in `images[]`, use the `Read` tool with the image path. You'll see the image content (multimodal). Carefully observe:
- Which page/screen is shown (login, dashboard, report, etc.)
- Any error messages, broken layouts, mismatched data
- UI elements involved (buttons, modals, forms, lists)

## Step 3 — Infer FE vs BE (no explicit tag from Thư)

Based on entry text + images, classify:

| Signal | Side |
|---|---|
| Screenshot of UI (browser, mobile view, page layout, button, modal, form) | FE |
| API response, JSON, error 500, stack trace, DB schema, query result | BE |
| Mentions specific page name (Dashboard, Login, Report, Refinance, Rate Alert, Profile) | FE |
| Mentions endpoint, controller, service, repository, JPA, Hibernate | BE |
| Mentions both visible UI + data fetching behavior | FullStack — investigate both |

Output your inference: `Classified as: FE | BE | FullStack` with 1-line reasoning.

Tie-breaker if uncertain — quick grep:
```bash
# Pick 2-3 keywords from entry title
cd /Users/apple/Projects/agentflow/lf-iq && grep -r "keyword" src/ | wc -l
cd /Users/apple/Projects/agentflow/lfiq-backend && grep -r "keyword" src/ | wc -l
```
Whichever repo has more matches → that side.

If FullStack: implement BE first (interface), then FE (consumer). Two PRs, in sequence.

## Step 4 — Branch

For FE:
```bash
cd /Users/apple/Projects/agentflow/lf-iq
git fetch origin production
git checkout -B feat/lfiq-<NNN>-<short-slug> origin/production
```

For BE (check default branch first):
```bash
cd /Users/apple/Projects/agentflow/lfiq-backend
DEFAULT_BRANCH=$(git remote show origin | awk '/HEAD branch/ {print $NF}')
git fetch origin $DEFAULT_BRANCH
git checkout -B feat/lfiq-<NNN>-<short-slug> origin/$DEFAULT_BRANCH
```

`<short-slug>`: kebab-case, max 4 words, from entry title.

## Step 5 — Implement

Read relevant code first. Use Grep/Glob to find files matching keywords from entry. Use the entry images to identify exact page/component.

Then edit. Keep changes **scoped to the ticket**. Don't refactor unrelated code.

### FE-specific reminders (lf-iq)

- Use Mantine components (Button, Modal, etc.), not raw HTML
- Use Tailwind utility classes, NOT `style={{}}`
- Use `useTranslations()` for any user-facing text — add to all 7 locale files in `src/messages/<locale>.json`
- Snake_case keys in CamelCase namespace
- URL-as-source pattern for list page filters (reference: users-v2 page)
- Pagination field is `pageSize` not `limit`

### BE-specific reminders (lfiq-backend)

- Java 21 + Spring Boot 3.x
- API contract: `ApiBaseResponse<T>` envelope, `PageableResponse<T>` for paginated
- Snake_case JSON fields, UUID IDs

## Step 6 — Test + lint + build

### FE
```bash
cd /Users/apple/Projects/agentflow/lf-iq
HUSKY=0 npm run lint
npx tsc --noEmit
npm test
HUSKY=0 npm run build  # may fail in dev env due to .next manifest issue — set HUSKY=0
```

Build can sometimes fail in dev env (known issue). If `npm run build` fails with `.next/static SSG manifest`, it's a pre-existing env issue — record this as a known failure but proceed if `tsc` + `lint` + `test` passed.

### BE
```bash
cd /Users/apple/Projects/agentflow/lfiq-backend
./gradlew check
./gradlew test
./gradlew build -x test  # build artifact
```

If any of these fail with REAL errors (not env issues), **stop, fix, then continue**. Don't push broken code.

## Step 7 — Commit + push + PR

Commit:
```bash
git add -A
git commit -m "feat: <summary cleaned from ticket title> [LFIQ-<NNN>]

<short description of what changed>

Refs: $JIRA_URL/browse/LFIQ-<NNN>"
```

Push:
```bash
git push -u origin feat/lfiq-<NNN>-<short-slug>
```

Open PR via `gh`:

**FE** (PR target: `master`):
```bash
gh pr create --base master --title "LFIQ-<NNN>: <title>" --body "$(cat <<EOF
Implements [LFIQ-<NNN>]($JIRA_URL/browse/LFIQ-<NNN>).

## Summary
<1-2 sentences>

## Changes
- file1: what changed
- file2: what changed

## Test plan
- [ ] <verify steps>

🤖 Auto-implemented via /lfiq:implement
EOF
)"
```

**BE** (PR target: default branch — usually `main`):
Same as above but `--base <default-branch>`.

Capture the PR URL from `gh pr create` output. Save as `PR_URL`.

## Step 8 — Update Jira

Transition ticket from "New" to "Testing":
```bash
# Get transition IDs first if unsure
curl -sS -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/LFIQ-<NNN>/transitions"
# Story workflow: New(4)→In Progress(6)→Testing(5)→Done. Transition to Testing = id 5 usually,
# but might need to go through "In Progress" first. Check available transitions.
```

Then transition + assign to Bao + add comment with PR URL:
```bash
# Assign
curl -sS -X PUT -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"712020:48967791-066e-4dab-a7ec-4d5122d11093"}' \
  "$JIRA_URL/rest/api/3/issue/LFIQ-<NNN>/assignee"

# Transition to Testing (do "In Progress" first if needed)
curl -sS -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transition":{"id":"<TRANSITION_ID>"}}' \
  "$JIRA_URL/rest/api/3/issue/LFIQ-<NNN>/transitions"

# Add comment with PR URL + doc deep-link (if available from Step 2)
# If deep_link is null (Thư didn't apply Heading 3), omit the doc link line.
curl -sS -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":{"version":1,"type":"doc","content":[
    {"type":"paragraph","content":[{"type":"text","text":"PR: "},{"type":"text","text":"<PR_URL>","marks":[{"type":"link","attrs":{"href":"<PR_URL>"}}]}]},
    {"type":"paragraph","content":[{"type":"text","text":"Doc entry: "},{"type":"text","text":"open in doc","marks":[{"type":"link","attrs":{"href":"<DEEP_LINK_OR_DOC_TAB_URL>"}}]}]}
  ]}}' \
  "$JIRA_URL/rest/api/3/issue/LFIQ-<NNN>/comment"
```

## Step 9 — Log timesheet

Calculate elapsed time:
- `END_TIME` = current UTC ISO
- Duration in hours, rounded to nearest 0.25h (15 min)
- Min: 0.25h. Max: 8h (sanity cap per ticket)

Find current sprint tab in LFIQ sheet:
```bash
python3 ~/.config/gcloud/gws.py sheet-tabs 1HZoQV1P3-IOZgxQpJ5kbFx8m2t5SEzUSbhBmdJqcP6A
```
Pick the latest sprint tab (highest sprint number).

Inspect first row of issues table:
```bash
python3 ~/.config/gcloud/gws.py sheet-read 1HZoQV1P3-IOZgxQpJ5kbFx8m2t5SEzUSbhBmdJqcP6A "'<TAB_NAME>'!A8:P9"
```

Identify columns (typically: Date, Developer, Ticket, Description, Hours, Status, ...). The exact 16 columns vary per sprint — adapt to what's there.

Append a row:
```bash
python3 ~/.config/gcloud/gws.py sheet-append 1HZoQV1P3-IOZgxQpJ5kbFx8m2t5SEzUSbhBmdJqcP6A "'<TAB_NAME>'!A9" '[["<DATE>", "Bao Trinh (auto)", "LFIQ-<NNN>", "<ticket summary>", "<HOURS>", "Testing", ...]]'
```

If the sheet schema is ambiguous on first run, **print the columns + what you appended** and ASK BAO to confirm format. Don't silently append wrong data.

## Step 10 — Final report

```
✅ LFIQ-<NNN> implemented

Doc entry: #<NNN>
Classification: <FE|BE|FullStack>  (reasoning: ...)
Images viewed: <N> (key signals: ...)
Files changed: <N>
Lint/test/build: ✅ all passed (or list failures)
PR: <PR_URL>
Jira status: New → Testing, assigned to Bao
Timesheet: <HOURS>h logged to sprint <X> tab
Elapsed: <START_TIME> → <END_TIME> (<DURATION> wall-clock)
```

If any step failed, output:
```
⚠️ LFIQ-<NNN> partially complete

Completed: <list>
Failed at: <step>
Reason: <error>
What to do: <suggestion>
```

---

## Constraints

- **Never auto-merge** into `production` for lf-iq (Bao does that)
- **Never auto-merge** any PR for lfiq-backend (Bao reviews + merges)
- **Always run lint + test BEFORE pushing** — never push broken code
- **If ticket description is unclear or entry not found** — stop and ask Bao
- **Scope discipline**: only edit files relevant to the ticket
- **Atomic commits**: one ticket = one branch = one PR
