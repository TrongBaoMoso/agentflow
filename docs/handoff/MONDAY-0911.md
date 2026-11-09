# Monday 09/11/2026: what is waiting on Bao

Written 06/11 late evening (session 0fcb4e66). This page answers "what do I need to do / who do I message
today / what needs my support". **Measure each item again before acting**: someone may have done it over the weekend.

Bead: see `bd list --status=open | grep MONDAY-0911`.

## 1. Messages to send (could not be sent on 06/11)

### 1a. Vinh or Khai: deploy the packs hotfix to MOSO production
- packs #3832 (Recruit portal marker) is on **staging** (06/11 23:46). The hotfix copy #3847 is merged into the
  production branch `3.64.1`, but **production is not deployed**: Bao's SWAT role "Dev" has no Deploy Hot Fix button.
- Same deploy also ships packs #3848 (cherry-pick of #3840, /join v2 registration fields), merged into `3.64.1` 07/11 (5b62809042c).
  Check after deploy: `curl -s -X POST -H 'Content-Type: application/json' -d '{}' "https://www.loanfactory.com/api/webplus/v1/5716104026521600/getRegisterLoanOfficer?key=<a prod LORecruiting key>"` lists `ready_to_join`; then /join v2 can go to production (Bao approval + remove the temporary retry/marker in lf + lo).
- Check first: `curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{}' https://www.loanfactory.com/api/recruit/v1/candidate/portalState`
  - 404 = not deployed yet, send the message. 401 = someone already deployed it, drop this item.
- Draft (Vietnamese, Bao sends):
  > Anh ơi, em đã merge packs #3832 vào master (staging đã deploy OK) và hotfix #3847 + #3848 (field cho form đăng ký /join mới) vào 3.64.1. Code chỉ đổi hành vi với hồ sơ có marker portal Recruit, prod Recruit chưa bật portal nên chưa ảnh hưởng gì. Nhờ anh bấm **Deploy Hot Fix v3.64.1** giúp em nhé. Thêm nữa, test packs/loan nhóm 0 trên master đang đỏ từ chiều 06/11 (test tính giá), anh xem giúp log trên SWAT.

### 1b. Khai: Recruit onboarding portal + PayPal (Khai was off on 06/11)
Source: memory `project_remind_khai_portal_paypal_0911`, `docs/handoff/moso-decouple/HANDOFF.md` ("PAUSED 06/11").
- Secrets `recruit-be-recruit-onboarding-portal-api-keys` and `...-paypal-client-secret`. Measured 06/11:
  the staging cluster secret has `RECRUIT_ONBOARDING_PORTAL_API_KEYS`; **production has neither** in `recruit-svc-secret`
  (the handoff says Tan Thanh created the Secret Manager entries on 06/11, so it may only need a prod release to sync).
- PayPal REST apps: sandbox for staging, live for production (the Loan Factory account MOSO uses).
- A zoom-go staging account that can send SMS, only if the manhadmin route did not work.
- Without these the Recruit portal stays inert. Nothing breaks.

### 1c. Khai: issue recruit-be #864, item 4
Items 1-3 are on production (06/11). Item 4 is waiting on Khai's answer on the issue.

### 1d. DONE (answered 06/11 23:39 in the chat, checked 09/11): Victoria: where to find the Ambassador Activity tab
Measured 06/11 23:30: Activity is fully on PROD (moso-aid-00130, lf-homepage-00767) — posts, referrals, budget, post links.
Reply (EN, attach `.playwright-mcp/activity-shots/prod-r3-wide.png` + `prod-links.png`):
> No LO role needed, chị. Sign in to Loan Factory (MOSO) with your usual account and open
> https://www.loanfactory.com/manage-lo-programs/ambassador-program?tab=activity — then the "Activity" tab next to
> "Applications". You can also click the ↗ icon on any post to open it on Facebook/Instagram. If it says you have
> no access, tell me and I'll check your permission (the page needs MOSO RECRUITING).
Before sending: check whether she already found it (Google Chat thread "Ambassador & Recruting").

### 1e. Dat (optional, not urgent): emails filter on Ally posting-activity
First Activity load on prod is ~16 s (Ally reads 17 pages); within 10 min it is 1.5 s. Ask Dat for
`emails=a@x,b@y` on `/v1/reports/service/posting-activity` (bead agentflow-6o9sa.13). Re-check the Ally spec first.

## 2. Decisions only Bao can make

| What | State | Where |
|---|---|---|
| Turn on real SMS on Recruit production | Code ON since 06/11 (recruit-be #851, e33bcd19b). Still closed by 3 Settings: `nurture.drip.delivery_mode` DRY_RUN→SEND, `nurture.drip.recipient_policy` ALLOWLIST→ANY, `scheduled_send_info.sms_enabled` false→true. Production has no users yet, so no rush. | memory `project_resume_sms_go_live_0611` |
| /join v2 to production | On staging; production needs Bao's approval, a packs hotfix (Khai) and removal of temporary retry/marker code. lf #2723 + lo #941 (type scale) were open on 06/11. | `docs/handoff/lo-registration-v2/HANDOFF.md` |
| Moso-decouple open asks | Connect Zoom on staging with Bao's own Zoom; approve lf #2702 screenshots; Meet recordings Drive sharing; two Add lead questions. | `docs/handoff/moso-decouple/HANDOFF.md` |

## 3. Calendar
- **Tue 10/11, 8:00 PST (23:00 VN): demo with Victoria's team.** Videos 00-06 are on Drive; open item: grant
  `is_recruiter` in MOSO staging to the `+stg` recruiter accounts (needs Bao's OK). `docs/handoff/victoria-demo-video/HANDOFF.md`.

## 4. Done on 06/11 (no action, for reference)
- Ambassador Activity: all 3 review rounds + post links ON PROD 06/11 (moso-aid-00130, lf-homepage-00767); `docs/handoff/ally-lo-posting-activity/HANDOFF.md` "CLOSED".
- Recruiting production release #886: recruit-be d5c84a8a5 + recruit-fe cd389a24 (all READY PROD batches).
- Offer "3 production figures required" ON in production (#890).
- Meet repeat bell (#841) runs in production (setting back to 2, as Bao chose).
- recruit-be #851 (SMS plumbing) in production, still closed by the 3 settings above.
