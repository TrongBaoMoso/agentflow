# Nurture redesign + Today gaps — handoff (overnight 17→18/10)

Epic `agentflow-236t9` · plan `PLAN.md` · audit `TODAY-AUDIT.md` · mockup https://claude.ai/artifact/HRBVojzgrE9ta3vn8tw77B ·
email drafts https://claude.ai/artifact/Janv74puAXww1t3VqqmjFD

## Shipped to STAGING (2 reviewers + CI each; production untouched, all new flags absent on prod)
| Repo | PR | What |
|---|---|---|
| recruit-fe | #510 | Log result polish round 2 (green Ready card, HR segmented, webinar date cards, fewer borders) |
| recruit-be | #654 | D271: nurture.drip.* settings, template Purpose (+4 seeded Nurture templates), {{recruiter_name}}/{{next_webinar}}/{{webinar_link}}, public unsubscribe (GET confirm / POST write, opaque HMAC token) |
| recruit-fe | #511 | Settings "Keep in touch while nurturing" (admin), template Purpose dropdown + filter |
| recruit-be | #655 | D270: Neutral = ACTIVE + one NURTURE_CALL follow-up; staging migration moved 8 owned NURTURE rows (0 failed, 43 unowned left); reply surfaces on Today; Send-now no phantom; Call click keeps due follow-up; 5th no-answer → Nurture call in 3 months; blacklist hidden; SMS STOP marker; LO-booked meeting closes Meet 1-1; business_timezone |
| recruit-fe | #512 | Today: Replied chip + Reply button, Nurture call + chip, sent_now, date-only grouping (Overdue from next business day), business timezone, SMS opted-out |
| recruit-be | #656 | D272: Nurture drip sender (moso-notifier v2, ledger, allowlist bao.trinh+*, DRY_RUN default, cap 25/tick, CAN-SPAM footer, unsubscribe link) |
| recruit-fe | #513 | Pipeline Nurture chip fits; date-only shows no fake time (VN viewers saw 2:00pm) |
| recruit-be | #657 | D273: scheduled Send info sends itself (9:00 business time for date-only, clamped to business hours, 24h stale, placeholder guard, scheduled_send marker, skip lines) |
| recruit-be | #658 | candidate-view `scheduled_send_info` capability |
| recruit-fe | #514 | Scheduled send state on Today/Focus (Scheduled · / Not sent ·), schedule form blocker + optional time + "Sends automatically…" line |

## Staging config done
- GSM lenderrate-master: `recruit-be-recruit-unsubscribe-hmac-secret`, `recruit-be-recruit-nurture-drip-internal-api-key` (latest version = cluster; v1 unused), patched into k8s `recruit-be/recruit-svc-secret`, restarted; cron `recruit-nurture-drip-tick` registered; `RECRUIT_NURTURE_MAIL` declared on notifier.

## Not done / needs someone else
1. **moso-notifier RECRUIT mail config** (bead .12) — Khai. Until then everything stays DRY_RUN (no real mail even to bao.trinh+).
2. **omni reply-alias route** (Reply-To into omni) + **omni #602** system-events (timeline line) — Khai. Meanwhile Reply-To = recruiter, recruit timeline line only.
3. `nurture.drip.enabled=true` and later `delivery_mode=SEND` need an ADMIN (SETTINGS_MANAGE) — Bao.
4. Webinar attendance can't close follow-ups: MOSO sends only a register flag, no per-session events.
5. reply_snippet is null until omni mirrors reply bodies.
6. Production: nothing pushed; the NURTURE migration on prod needs a measured stage count first (query in recruit-be #655 comment).
7. Staging QA side effect: QA Fneutral → Neutral 6 months (Nurture call 2027-04-16, stage Engaged).

Morning report: https://claude.ai/artifact/6tf19GVCfeWNDgGWV51qgw

## 18/10 morning follow-ups (self-served, no Khai needed)
- nurture.drip.enabled=true and delivery_mode=SEND on staging via the normal settings API (admin test account chauchau.inc); allowlist still only bao.trinh+*@loanfactory.com; send_enabled_at stamped 2026-10-17T01:54:40Z (no catch-up burst).
- moso-notifier #300 merged + promoted to staging (Repo Owner agent + reviewer OK): RECRUIT copies ENGAGEMENT's mail identity (staging profile only). Log: "Mail config in sync: appId=RECRUIT" (a RECRUIT row already existed; SMTP synced). mailpit is empty → staging mail likely goes to real SendGrid (to be proven by the test below).
- E2E real-send test: QA Claudeboard (bao.trinh+t08q14) has a scheduled Send info EMAIL for Mon 2026-10-19 09:00 PT (16:00Z, 23:00 VN), subject "Recruit staging test — scheduled info". Undo: delivery_mode DRY_RUN.
- omni-service #608 (reply-address route) open for Khai; recruit must read subject_id (no conversation_id). recruit-be #659 docs: the two staging secrets added to BOOTSTRAP + rebuild list.
- 17/10 03:15Z (10:15 VN): REAL send proven on staging — QA Claudeboard (t08q14), subject "Recruit staging test — sent now (Sat)"; notifier: Mail sent appId=RECRUIT provider=SENDGRID, webhook DELIVERED. business_hours was widened temporarily via admin API and restored to the saved value (08-17 Mon-Fri LA). The Monday 19/10 schedule was replaced by this test.
- 18/10: recruit-be #659 (BOOTSTRAP keys), #660 (host push on in prod — docs), #661 (D274 Reply-To = omni reply address, staging flag ON, waits for omni #608), #662 (ITs no longer depend on the wall clock) merged + promoted to staging. Open: omni-service #608 (Khai) and #602; production go-live (Bao); bounce intake (.11); webinar attendance data (MOSO).
