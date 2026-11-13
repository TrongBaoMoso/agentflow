# RESUME — Conversations: lọc theo kênh (Channel) ra 0 dòng (session 1e475fb7, pause 11/11 ~16:00 VN)

## Trạng thái: CHƯA CODE GÌ. Đang chờ Bao "OK" đề xuất bên dưới. Không có agent/cron/worktree nào đang chạy.

## Bao hỏi
Trang recruit.viet18.com/conversations (staging), acc Victoria (VP, Manager), tab All: chọn Channel Email/SMS -> 0 dòng.
"Tối qua demo cho Victoria vẫn được, sáng nay không?"

## Đã chứng minh (đo 11/11 trên staging)
- FE (recruit-fe `conversations/_components/ConversationsClient/index.tsx`): Channel + Unread lọc TRÊN MÁY, chỉ 50 dòng của
  trang đang xem, dựa vào omni `GET /api/v1/comm/latest` (`src/shared/omni/useLatestMessages.ts`). Logic có từ #661 (03/11), không đổi.
- omni `internal/messages/store_latest.go`: chỉ trả tin cho người ĐANG CÓ MẶT trong hội thoại (callerCTE). Không đổi từ 09/11.
- Acc Victoria / admin: `/comm/latest` trả `{"payload":{}}` -> cột Latest message trống, lọc kênh nào cũng 0.
- Acc Chau Chau (recruiter trong hội thoại): trả đủ dữ liệu.
- Tối qua Bao demo bằng acc **QA Test Recruiter** (avatar QR, 22:09): 93 hội thoại, SMS 1/50, Email 6/50 -> chạy được vì acc đó có mặt trong hội thoại.
  => Không hỏng qua đêm; khác người xem. moso-off (#969 23:31) không liên quan.
- Transcript `docs/transcripts/2026-11-10_recruit-app-q-and-a-session-feedback.md`:
  5:55 Bao nói "chị Vi xem được toàn bộ"; 6:30–8:04 Victoria xin filter call/email/text trên nhiều LO (7:58 "Ý chị là cái này á hả?");
  7:29 muốn biết "đã trả lời chưa / ai chưa trả lời"; 1:01:32–1:06:36 Miley cần xem hội thoại của LO người khác khi cover.
- Đây chính là mục **.20** (bead agentflow-ewc4e.20) trong `docs/handoff/team-feedback-1011/QA-1011-ITEMS.md` (omni change allowed, STAGING only).

## Đề xuất đã gửi Bao (chờ OK)
1. recruit-be tự lưu theo từng LO: has_sms / has_email / has_call, kênh + người gửi + thời điểm tin mới nhất (mọi người gửi);
   backfill 1 lần từ omni; lọc Channel ở SERVER -> đếm & phân trang đúng trên toàn danh sách (bỏ "x of 50 on this page").
2. Cột Latest message cho manager lấy từ dữ liệu đó (chỉ "Ryan texted · Oct 13"; nội dung chỉ khi mở hội thoại).
3. Filter mới "Awaiting reply" = tin mới nhất từ LO, team chưa trả lời.
- 2 câu chờ chốt (đề xuất): "Text" = có SMS bất kỳ trong hội thoại; recruiter cover người khác: xem hết, trả lời CHỈ email (làm sau).
- Unread giữ nguyên (chỉ chủ LO). Lên STAGING, prod cờ TẮT. Đo bằng acc Victoria + QA Test Recruiter.
- Bước đầu khi code: kiểm recruit-be đã nhận event tin nhắn từ omni chưa; chưa thì sửa omni trên staging.

## Ghi chú kỹ thuật
- Script đo: scratchpad session cũ `vic3.js` (login Victoria, bấm "Not now" passkey, lưu state), playwright `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` (chromium 1248).
- State Victoria đã lưu lại: `docs/handoff/recruit-e2e-lab/scripts/state_victoria_pham_stg_loanfactory_com.json` (không commit — repo public).
- Luôn `ram-gate acquire chrome` trước khi mở browser.

## Liên quan
- Plan đầy đủ 3 phần của .20 (lọc server-side, xem email đầy đủ, vai COVER cho recruiter trả lời thay) nằm trong NOTES của bead
  `agentflow-ewc4e.20` (viết 13:12 bởi session fa8844b5). Đề xuất ở trên = phần (1) + thêm "Awaiting reply". Đọc `bd show agentflow-ewc4e.20`.

## ĐO LẠI 13/11 09:15 VN (session 1e475fb7)
- be #1034 có ở master + staging, CHƯA có ở production (cờ RECRUIT_FEATURES_CONVERSATION_FACTS: staging true, prod không có → mặc định false).
- fe #798 #800 đã có ở production (tự lùi về hành vi cũ khi route counts 404).
- Staging, Victoria: All 267; Text 13; Email 96; Call 76; Text+Needs reply 1 (TRINH VU TRONG BAO, NMLS 121212); Awaiting 91; Mine+Needs 0 (Today không hiện nút).
- Staging, QA Test Recruiter: Today hiện "Needs reply"; Mine+Needs = 1 (QA Claudeboard, NMLS 9931984).
- LỆCH HIỂN THỊ mới thấy: QA Claudeboard với recruiter ghi "QA Test Recruiter emailed · See you tomorrow…" (omni latest), nhưng facts = email TỰ ĐỘNG (nhắc webinar, last_automated=true) → vẫn Needs reply. Victoria thấy "Automated email · Nov 13" (đúng). Chưa sửa, chờ Bao.
- Phần 2 (xem email đầy đủ) + phần 3 (cover reply) của ewc4e.20: chưa có PR, chờ Bao OK.

## PAUSE 13/11 ~17:10 VN (session 1e475fb7, Bao tắt máy) — session này GIỮ TRỌN bead agentflow-ewc4e.20
Đọc `bd show agentflow-ewc4e.20` (notes chi tiết từng PR). Mọi thứ STAGING, prod cờ TẮT/không có.

### ĐÃ LÊN STAGING 13/11
- Conversations polish: be #1052, fe #814; fe #817 (Team needs reply cho manager); fe #822 #823 ("Last real contact"); be #1056 (deadlock, D526).
- Xem đầy đủ email: be #1053 #1055 #1061 #1062, fe #816 #818; tera-components #1217 (prop renderEmail, kênh staging); tera-docs #1141 (đã merge).
- Trả lời thay (cover, D525): omni #730, be #1054 #1058 #1060, fe #815. Bao chốt: giữ luật auto-claim D43; LO_SUPPORT không cover.
- Pipeline: fe #819 #821 (nút Message, People on it), fe #830 (Claim về cột cuối, "Loan Factory · Automated", avatar LF trong View e-mail).
- Dòng thứ 2 tin gõ tay: omni #731, be #1059.
- Email gõ tay: omni #732 (STATUS_MAIL → Delivered), omni #733 + be #1065 + fe #825 #826 (kit 2026 + chữ ký, header kiểu email client, sửa UTC). #734 revert bằng #735; be #1064 đóng.
- Email theo merge / khi có chủ: be #1066 (D533), be #1068 (D535). Bao test QA Bwaivetwo OK.
- OB follow-up (D527): be #1057 staging; fe #820 merged 10:02Z (kiểm đã promote staging).
- Observer race: fe #824 staging.

### DỞ (resume làm tiếp, tạo agent mới nếu cần)
1. recruit-be #1063 (observer race, D529): auto-merge bật, có thể đã tự merge → kiểm, promote recruit-be staging, gửi Bao bước test (Victoria mở/đóng QA Claudeboard 5 lần liên tiếp).
2. recruit-be #1067 (avatar chữ ký = logo LF `lf-logo-mark-192.png` ở recruit.viet18.com/images/email, icon điện thoại, V418): sau #1063 → update branch, kiểm số V, merge, KIỂM PR MERGED, promote; Bao test bằng 1 email gõ tay mới tới QA Claudeboard.
3. moso-notifier #442 (Gmail opens bị lọc bot vì 74.125.x): wave-freeze; đã xin anh Khải ở notification-service#232 (issuecomment-6848813230). Khi Khải OK → thêm "Wave freeze approved: <url>", merge, promote staging, kiểm log. Prod mất Gmail opens mọi app — Khải quyết.
4. fe #820: xác nhận đã lên staging; gửi Bao bước test OB follow-up (Miley: "+ Set" ở Pipeline Mine, Today hiện follow-up của chính mình).
