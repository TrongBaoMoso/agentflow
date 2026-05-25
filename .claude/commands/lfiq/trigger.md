---
name: "LFIQ: Trigger Pipeline Now"
description: "Force-fire the full LFIQ automation pipeline immediately (doc-to-jira → backfill → auto-implement), as if the 06:00 or 14:00 schedule had fired. Useful when a new Doc entry needs to be processed without waiting for the next scheduled run."
category: Workflow
tags: [lfiq, jira, schedule, launchd, automation, trigger, manual]
---

# LFIQ Trigger — Run the Pipeline Now

**Argument**: `$ARGUMENTS` — optional. Accepted values:
- empty / `all` (default): fire all 3 jobs in sequence (doc-to-jira → backfill → auto-implement)
- `doc-to-jira` or `doc`: only fire doc-to-jira
- `backfill` or `link`: only fire jira-backfill-deeplink
- `auto-implement` or `impl`: only fire auto-implement
- `dry-run`: show what would happen, don't actually fire

## Why this command exists

The LFIQ pipeline normally runs on macOS launchd schedule (06:00 + 10:00 daily). But sometimes the user wants to process a NEW Doc entry **right now** without waiting for the next scheduled run.

Common situations:
- BA Thư just added entry #287 to the Google Doc → user wants Jira ticket + PR ready in 30 min
- Testing/demo prep — user wants to show pipeline live
- Recovering from a missed run (Mac was off, machine sleep got stuck)

**Important context for the agent:**

The LFIQ pipeline = 3 macOS launchd jobs running on this Mac mini (NOT cron, NOT Claude Cloud routines). All schedules live in `~/Library/LaunchAgents/com.loanfactory.*.plist`. Memory key: `lfiq-pipeline-final-schedule-as-of-2026-05` (search via `bd memories schedule`).

## Pipeline overview

| Order | Job | Script | Duration | Purpose |
|---|---|---|---|---|
| 1 | `com.loanfactory.lfiq-doc-to-jira` | `~/.config/gcloud/lfiq-doc-to-jira.py` | ~10s | Read Doc → create Jira tickets |
| 2 | `com.loanfactory.jira-backfill-deeplink` | `~/.config/gcloud/jira-backfill-deeplink.py` | ~30s-2min | Link Jira ↔ Doc anchors |
| 3 | `com.loanfactory.lfiq-auto-implement` | `~/.config/gcloud/lfiq-auto-implement.py --max 50` | 5min-5h | Claim tickets + spawn `claude` CLI per ticket |

## Steps to execute

### Step 1: Pre-flight check

Run these in parallel to confirm pipeline is healthy:

```bash
# 1. All 3 launchd jobs are loaded
launchctl list | grep loanfactory

# 2. None are currently running (avoid double-fire)
ps -ef | grep -E 'lfiq-(doc-to-jira|auto-implement)|jira-backfill' | grep -v grep

# 3. Current time + last log mtime
date '+%Y-%m-%d %H:%M:%S %Z (%A)'
ls -la ~/Library/Logs/loanfactory/
```

If any job is already running (ps shows a python3 process), **STOP** and report to user — don't double-fire.

### Step 2: Decide which job(s) to fire based on `$ARGUMENTS`

- empty / `all` → fire all 3 in sequence
- `doc`, `doc-to-jira` → fire only doc-to-jira
- `backfill`, `link` → fire only backfill
- `impl`, `auto-implement` → fire only auto-implement
- `dry-run` → print plan only, don't fire

### Step 3: Fire jobs sequentially

For each job in order, run `launchctl start com.loanfactory.<job-name>` and wait for completion before firing the next.

**Job 1 — doc-to-jira:**
```bash
launchctl start com.loanfactory.lfiq-doc-to-jira
# Poll log until "Total runtime:" appears (~10-15s)
until grep -q "Total runtime" ~/Library/Logs/loanfactory/lfiq-doc-to-jira.log 2>/dev/null && \
      [ "$(stat -f %m ~/Library/Logs/loanfactory/lfiq-doc-to-jira.log)" -gt "$(date -v-1M +%s)" ]; do
  sleep 2
done
# Show final block
awk '/^=== LFIQ Doc/{block=$0; capture=1; next} capture{block=block ORS $0} /^Total runtime/{print block; exit}' \
  ~/Library/Logs/loanfactory/lfiq-doc-to-jira.log | tail -30
```

**Job 2 — backfill-deeplink:** (wait 3s, then fire)
```bash
sleep 3
launchctl start com.loanfactory.jira-backfill-deeplink
# Poll log for "Summary:" line (~30s-2min)
until grep -q "Summary: ok=" ~/Library/Logs/loanfactory/jira-backfill-deeplink.log 2>/dev/null && \
      [ "$(stat -f %m ~/Library/Logs/loanfactory/jira-backfill-deeplink.log)" -gt "$(date -v-2M +%s)" ]; do
  sleep 3
done
tail -25 ~/Library/Logs/loanfactory/jira-backfill-deeplink.log
```

**Job 3 — auto-implement:** (wait 3s, then fire — this is the long one)
```bash
sleep 3
launchctl start com.loanfactory.lfiq-auto-implement
# Auto-implement takes 5min-5h. Don't poll until done — instead:
# 1. Confirm it started (process appears in ps)
sleep 5
ps -ef | grep 'lfiq-auto-implement.py' | grep -v grep

# 2. Show the "Ready tickets" line so user knows the queue
sleep 10
tail -20 ~/Library/Logs/loanfactory/lfiq-auto-implement.log
```

For auto-implement, **DO NOT WAIT for full completion** in the slash command (could be 5h). Just confirm it started and show initial output, then return to user with monitoring instructions.

### Step 4: Final report

After firing, summarize:

```markdown
## Pipeline Triggered Manually @ {timestamp}

### Job 1: doc-to-jira ✅ done in {Xs}
- New tickets: {N}
- Created: {list of LFIQ-NNN keys}

### Job 2: backfill-deeplink ✅ done in {Xs}
- ok={N}  skipped={N}  failed={N}

### Job 3: auto-implement 🔄 running (PID {pid})
- Ready tickets: {N}
- Top of queue: {LFIQ-NNN}: {summary}
- Expected duration: ~{Xmin} for {N} tickets

**Monitor progress:**
```bash
tail -F ~/Library/Logs/loanfactory/lfiq-auto-implement.log
```

**Or re-run `/lfiq:status` in {30min} to see results.**
```

## Special: argument-specific behavior

### If `$ARGUMENTS = doc` only
Fire ONLY doc-to-jira. Useful when:
- Just want to sync new Doc entries to Jira
- Don't want to burn auto-implement quota yet
- Want to review tickets first before triggering implement

### If `$ARGUMENTS = impl` only
Fire ONLY auto-implement. Useful when:
- Tickets already exist in Jira (created manually or earlier)
- Want to process queued tickets without re-reading Doc

### If `$ARGUMENTS = dry-run`
Print the plan, don't fire anything. Show:
- Which jobs would fire
- Current ready queue (from `python3 ~/.config/gcloud/lfiq-auto-implement.py --dry-run`)
- Last run timestamps

## Safety rules

- **Never** fire if another instance is already running — check `ps -ef` first
- **Never** fire on weekends if user didn't explicitly ask (mention if Sat/Sun)
- **Always** show the Jira ticket keys created so user can verify
- **Always** show monitoring command for auto-implement (it's the long-running one)

## Example interactions

### User: `/lfiq:trigger`
→ Fire all 3 jobs, full report

### User: `/lfiq:trigger doc`
→ Fire only doc-to-jira, report new tickets created

### User: `/lfiq:trigger dry-run`
→ Show plan + current queue, don't fire

### User: `/lfiq:trigger impl`
→ Fire only auto-implement, monitor for 30s then return with tail instructions
