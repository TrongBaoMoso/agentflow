---
name: "LFIQ: Schedule Status"
description: "Check LFIQ automation pipeline — what scheduled jobs ran today, what's queued, what's next. Self-contained so a fresh session understands without prior context."
category: Workflow
tags: [lfiq, jira, schedule, launchd, automation, status]
---

# LFIQ Schedule Status — Pipeline Health Check

**Argument**: `$ARGUMENTS` — optional. If a time like `09:00`, `14:00`, `6:00` or `today`/`yesterday` is given, focus the report on that. If empty, give the full daily status.

## Why this command exists

When the user asks questions like:
- *"schedule 9 AM đang làm gì?"*
- *"có gì new ko? schedule đã làm gì?"*
- *"sáng nay schedule chạy đúng các job ko?"*
- *"hôm qua afternoon batch xong chưa?"*

…they mean the **LFIQ automation pipeline running via macOS launchd**, NOT cron, NOT scheduled-tasks MCP, NOT Claude Code routines. A fresh session has no memory of this — that's why this command exists.

**DO NOT** check `crontab -l`, `CronList`, `mcp__scheduled-tasks__list_scheduled_tasks`, or `~/.claude/scheduled-tasks/` — those are all empty. The pipeline lives entirely in `~/Library/LaunchAgents/com.loanfactory.*.plist`.

## What runs (the pipeline)

The pipeline is 3 launchd jobs + 1 Mac wake schedule, running 2 cycles per day:

| Time | Job | Action | Caffeinated |
|---|---|---|---|
| 05:58 | `pmset repeat wakeorpoweron` | Mac mini auto-wakes from sleep | (system) |
| 06:00 | `com.loanfactory.lfiq-doc-to-jira` | Reads Google Doc → creates new Jira tickets | ✅ |
| 06:02 | `com.loanfactory.jira-backfill-deeplink` | Backfills Jira↔Doc deep-links | ✅ |
| 06:05 | `com.loanfactory.lfiq-auto-implement` | Claims today's tickets, runs `claude` CLI to implement (`--max 50`) | ✅ |
| 10:00 | `com.loanfactory.lfiq-doc-to-jira` | (mirror of 06:00) | ✅ |
| 10:02 | `com.loanfactory.jira-backfill-deeplink` | (mirror of 06:02) | ✅ |
| 10:05 | `com.loanfactory.lfiq-auto-implement` | (mirror of 06:05) | ✅ |

All scripts live at `~/.config/gcloud/`:
- `lfiq-doc-to-jira.py`
- `jira-backfill-deeplink.py`
- `lfiq-auto-implement.py`

All logs live at `~/Library/Logs/loanfactory/` (NOT `/tmp/` — was migrated to avoid macOS cleanup):
- `lfiq-doc-to-jira.log`
- `jira-backfill-deeplink.log`
- `lfiq-auto-implement.log`

Both `PYTHONUNBUFFERED=1` is set so `tail -F` works in real-time.

## Key design facts to remember

- **`--max 50`** in auto-implement = effectively unlimited (process all today's ready tickets, no artificial cap of 3)
- **JQL filter `created >= startOfDay()`** in auto-implement script — old tickets (LFIQ-368, LFIQ-359, anything created before today) are NEVER auto-picked. Implement manually via `/lfiq:implement <KEY>` if needed.
- **Schedule runs 7 days/week** including Sat/Sun (Mac mini auto-wakes). Weekend behavior: idempotent skip (no new entries → "Nothing to do").
- **First claude CLI call at 06:05** doubles as the morning Claude Max **5-hour quota window** opener (06:05 → 11:05 covers the 10:05 batch too).
- **macOS timezone**: launchd runs in LOCAL time (Saigon, +07:00). Log timestamps inside scripts are in **UTC** — so 06:00 Saigon = 23:00 UTC of the previous day. Don't get confused.

## Execution steps

### Step 1: Current time + day-of-week
```bash
date '+%Y-%m-%d %H:%M:%S %Z (%A)'
```

This determines which scheduled jobs SHOULD have run today vs. which are still upcoming. Today is the local Saigon date (the user is in Vietnam).

### Step 2: Verify schedules are registered
```bash
launchctl list | grep loanfactory
```

Expect 3 entries: `lfiq-doc-to-jira`, `lfiq-auto-implement`, `jira-backfill-deeplink`. If anything is missing, the pipeline is partially broken.

### Step 3: Read all 3 logs — filter to TODAY only
The internal log timestamps are UTC. Compute today's UTC date and grep:

```bash
# What date does TODAY's logs use? Both formats:
LOCAL=$(date '+%Y-%m-%d')
UTC=$(date -u '+%Y-%m-%d')
echo "Local: $LOCAL | UTC: $UTC"

# Today's doc-to-jira runs (timestamps inside use UTC)
awk -v d="$UTC" '/^=== LFIQ Doc/ && index($0, d){p=1} p{print}' \
  ~/Library/Logs/loanfactory/lfiq-doc-to-jira.log

# Today's auto-implement runs
awk -v d="$UTC" '/^=== lfiq-auto-implement/ && index($0, d){p=1} p{print}' \
  ~/Library/Logs/loanfactory/lfiq-auto-implement.log

# Backfill log doesn't include date headers, just tail the last ~60 lines
tail -60 ~/Library/Logs/loanfactory/jira-backfill-deeplink.log
```

**Important**: Saigon 06:00 = UTC 23:00 **previous day**. So if user asks about TODAY's 06:00 run, search the log for `(yesterday's date in UTC)T23:00`.

### Step 4: Cross-check Jira — tickets created today
```bash
source ~/.zshrc
curl -sS -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -G "$JIRA_URL/rest/api/3/search/jql" \
  --data-urlencode 'jql=project=LFIQ AND created >= startOfDay() ORDER BY created DESC' \
  --data-urlencode 'fields=summary,status,assignee,created' \
  --data-urlencode 'maxResults=20' | python3 -m json.tool
```

### Step 5: Cross-check GitHub PRs — opened/merged today
```bash
gh pr list --repo LoanFactory-Inc/lf-iq --state all --limit 10 \
  --json number,title,state,createdAt,mergedAt,headRefName \
  --jq '[.[] | select(.createdAt[:10] == "'"$(date '+%Y-%m-%d')"'" or .mergedAt[:10] == "'"$(date '+%Y-%m-%d')"'")]'

gh pr list --repo LoanFactory-Inc/lfiq-backend --state all --limit 10 \
  --json number,title,state,createdAt,mergedAt,headRefName \
  --jq '[.[] | select(.createdAt[:10] == "'"$(date '+%Y-%m-%d')"'" or .mergedAt[:10] == "'"$(date '+%Y-%m-%d')"'")]'
```

### Step 6: Check if any auto-implement process is currently RUNNING
```bash
ps -ef | grep -E 'lfiq-(doc-to-jira|auto-implement)|jira-backfill|/usr/local/bin/claude' | grep -v grep
```

If a `claude` process is running, the user might be in the middle of an active implement. Note the elapsed time (`ps -o etime`) and which ticket it's processing (visible in the command line).

### Step 7: Verify pmset wake schedule is still set
```bash
pmset -g sched | grep -A1 'Repeating'
```

Expect `wakepoweron at 5:58AM every day`. If missing, Mac won't wake for 06:00 batch.

## Output format

Give the user a clean summary in this shape:

```
## Schedule status — <date> <day-of-week>

### Đã chạy hôm nay
| Time | Job | Result |
|---|---|---|
| 06:00 | doc-to-jira | ✅/⚠️/❌ — N new tickets, runtime Xs |
| 06:02 | backfill | ✅ — N skipped, M ok, K failed |
| 06:05 | auto-implement | ✅/🔄 — N tickets, all rc=0 |
| 10:00 | ... | ... |

### Tickets created today
- LFIQ-NNN [Status] [Assignee] Summary
- ...

### PRs today
- PR#NNN [state] Title

### Còn lại chưa chạy (if any time before next fire)
- 14:00 doc-to-jira at HH:MM

### Issues / Anomalies (if any)
- e.g. "10:05 auto-implement still running 30 min in, processing LFIQ-NNN"
- e.g. "06:00 doc-to-jira failed — check log"
```

If the user passed `$ARGUMENTS` like `06:00` or `morning`, focus the report on just that cycle. If `yesterday`, swap `startOfDay()` → `startOfDay(-1d)` in the Jira query and use yesterday's UTC date for log filtering.

## Common questions to anticipate

| Question | What to report |
|---|---|
| "schedule N AM đang làm gì?" | Most recent run at that time + result |
| "có gì new ko?" | New tickets today + new PRs today + currently-running jobs |
| "sáng nay làm đúng ko?" | All 06:xx runs + verify counts match expected |
| "tại sao ko có ticket mới?" | Show doc-to-jira "to create: 0" — explain Doc had no new entries |
| "tại sao 06:00 không chạy?" | Check `launchctl print` last exit code + Mac sleep state |
| "afternoon batch chạy chưa?" | Look for 10:xx runs in log + compare current time |

## Don't ask the user to clarify what they mean

The user is referring to **this pipeline**. Don't search elsewhere. Don't ask "schedule nào?". Just run the steps above and report.
