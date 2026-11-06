# Monday 09/11/2026: what is waiting on Bao

Written 06/11 late evening (session 0fcb4e66). This page answers "what do I need to do / who do I message
today / what needs my support". **Measure each item again before acting**: someone may have done it over the weekend.

Bead: see `bd list --status=open | grep MONDAY-0911`.

## 1. Messages to send (could not be sent on 06/11)

### 1a. Vinh or Khai: deploy the packs hotfix to MOSO production
- packs #3832 (Recruit portal marker) is on **staging** (06/11 23:46). The hotfix copy #3847 is merged into the
  production branch `3.64.1`, but **production is not deployed**: Bao's SWAT role "Dev" has no Deploy Hot Fix button.
- Check first: `curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{}' https://www.loanfactory.com/api/recruit/v1/candidate/portalState`
  - 404 = not deployed yet, send the message. 401 = someone already deployed it, drop this item.
- Draft (Vietnamese, Bao sends):
  > Anh ơi, em đã merge packs #3832 vào master (staging đã deploy OK) và hotfix #3847 vào 3.64.1. Code chỉ đổi hành vi với hồ sơ có marker portal Recruit, prod Recruit chưa bật portal nên chưa ảnh hưởng gì. Nhờ anh bấm **Deploy Hot Fix v3.64.1** giúp em nhé. Thêm nữa, test packs/loan nhóm 0 trên master đang đỏ từ chiều 06/11 (test tính giá), anh xem giúp log trên SWAT.

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

## 2. Decisions only Bao can make

| What | State | Where |
|---|---|---|
| Turn on real SMS on Recruit production | Code ON since 06/11 (recruit-be #851, e33bcd19b). Still closed by 3 Settings: `nurture.drip.delivery_mode` DRY_RUN→SEND, `nurture.drip.recipient_policy` ALLOWLIST→ANY, `scheduled_send_info.sms_enabled` false→true. Production has no users yet, so no rush. | memory `project_resume_sms_go_live_0611` |
| /join v2 to production | On staging; production needs Bao's approval, a packs hotfix (Khai) and removal of temporary retry/marker code. lf #2723 + lo #941 (type scale) were open on 06/11. | `docs/handoff/lo-registration-v2/HANDOFF.md` |
| Ambassador Activity round 3 | lf #2724 merged to master; not cherry-picked to production yet; moso-aid #222 waits for its prod deploy. | `docs/handoff/ally-lo-posting-activity/HANDOFF.md` |
| Moso-decouple open asks | Connect Zoom on staging with Bao's own Zoom; approve lf #2702 screenshots; Meet recordings Drive sharing; two Add lead questions. | `docs/handoff/moso-decouple/HANDOFF.md` |

## 3. Calendar
- **Tue 10/11, 8:00 PST (23:00 VN): demo with Victoria's team.** Videos 00-06 are on Drive; open item: grant
  `is_recruiter` in MOSO staging to the `+stg` recruiter accounts (needs Bao's OK). `docs/handoff/victoria-demo-video/HANDOFF.md`.

## 4. Done on 06/11 (no action, for reference)
- Recruiting production release #886: recruit-be d5c84a8a5 + recruit-fe cd389a24 (all READY PROD batches).
- Offer "3 production figures required" ON in production (#890).
- Meet repeat bell (#841) runs in production (setting back to 2, as Bao chose).
- recruit-be #851 (SMS plumbing) in production, still closed by the 3 settings above.
