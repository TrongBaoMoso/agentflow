# Test Meet thư người giới thiệu (referrer mail), 06/11/2026: ĐÃ XONG, PASS

Bead `agentflow-0gwad.4.9` (be #861, D386). Chỉ STAGING. Chỉ ghi id, không có PII.

## Hướng dẫn cho Bao (đã dùng lúc 01:15 VN 06/11, giữ lại để tham khảo)

Buổi test được dời từ 10:00 lên **01:15 VN** vì Bao rảnh sớm. Session và link Meet chỉ được tạo ở tick webinar chạy mỗi giờ đúng :00, nên 01:15 là giờ sớm nhất.

1. Link Meet: https://meet.google.com/srz-ohca-rfk (session `b12c3b56`, 01:15–01:30 VN).
2. Mở một **cửa sổ ẩn danh** và **KHÔNG đăng nhập bằng tài khoản organizer** (tài khoản Bao là host của lịch). Khi Meet hỏi tên, gõ đúng:
   `bao.trinh+reflol9kzg@loanfactory.com`
3. Vào lúc 01:15, ở lại khoảng 15 phút rồi rời.
   - Khách ẩn danh phải được người trong phòng cho vào. Nếu cần, mở thêm một cửa sổ đăng nhập tài khoản Bao để bấm "Admit".
   - Organizer không bao giờ được tính là người dự.
4. Sau đó:
   - Tick 02:00 VN đọc điểm danh Meet: session kết thúc 01:30, chờ 30 phút, mỗi lần thử lại cách 15 phút, tối đa 6 lần.
   - Ngay trong tick đó, thư "your referral attended" gửi tới `bao.trinh+lo-referrer@loanfactory.com`.

## Dữ liệu test

| | id |
|---|---|
| Series "NOW" (một lần, 05/11 10:15 LA = 06/11 01:15 VN, 15 phút, host 3e228b0a) | `58ca229d-8240-484d-b85c-13be8c603bbf` |
| Session đã dùng | `b12c3b56-3f0f-4276-b242-8d99d2eb2322` |
| LO được giới thiệu (Recruit candidate, không có số điện thoại nên không có SMS) | `18d097be-c37c-491f-a6dc-f3ad0614afbe` |
| Người giới thiệu | e-mail `bao.trinh+lo-referrer@loanfactory.com` (MOSO LORecruiter, không phải candidate Recruit). Nằm trong allowlist `bao.trinh+*@loanfactory.com`, không bị suppression |
| Series 10:00 (dự phòng, không cần nữa) | `d5697bbe-2980-4928-9b6c-048a8eee6be1`, session `af37064c-e6da-415c-839f-b9db4726902b`, 0 đăng ký. Xem phần "Dọn dẹp" |

**Cách tạo liên kết giới thiệu.** Dùng đúng đường của E2E seed trước đây: op công khai `submitReferALoanOfficer` của MOSO staging (ns 5716104026521600, giống form refer-a-loan-officer).
- Body: `referred_by` = bao.trinh+lo-referrer, `refer_loan_officer_email_me: true`, chỉ có e-mail, không có số điện thoại.
- MOSO tự push sang Recruit staging. `legacy_ref.referrer` = địa chỉ người giới thiệu, `legacy_ref.refer_loan_officer_email_me` = true.
- Không đụng dữ liệu MOSO thật.
- Không đụng session `7d30491c` và các đăng ký của nó.

## Kết quả đo (tick 19:00 UTC = 02:00 VN)

- `webinar_registration`: 18d097be trên b12c3b56 là REGISTERED, ATTENDED, 16 phút, `attendance_at` 19:00:00 UTC.
- `webinar_reminder`: kind REFERRER, SENT, ledger `d6cd4c4c-d910-4826-8949-ae23f81e1d97`.
- Lead xác nhận thư WEBINAR_REFERRER đã DELIVERED tới bao.trinh+lo-referrer. Bead 4.9 đã đóng.

## SQL kiểm tra (read-only: `bash ~/.cache/claude-recruit/pgq_stg.sh <pod-name> "<sql>"`)

```sql
select id, starts_at, status, google_meet_url, attendance_read_at, attendance_attempts, attendance_error
  from webinar_session where id = 'b12c3b56-3f0f-4276-b242-8d99d2eb2322';
select status, attendance, attended_minutes, attendance_at
  from webinar_registration where candidate_id = '18d097be-c37c-491f-a6dc-f3ad0614afbe';
select kind, status, reason, sent_at, ledger_id
  from webinar_reminder where candidate_id = '18d097be-c37c-491f-a6dc-f3ad0614afbe' and kind = 'REFERRER';
select id, kind, status, created_date from lo_mail_sends
  where dedupe_key = 'webinar-referrer:b12c3b56-3f0f-4276-b242-8d99d2eb2322:18d097be-c37c-491f-a6dc-f3ad0614afbe';
```

## Dọn dẹp

- Session 10:00 `af37064c` không còn cần. **Đã HỦY 06/11 02:35 VN** bằng `POST /api/v1/admin/webinar-sessions/af37064c-.../cancel`: status CANCELLED, 0 người đăng ký, không ai bị chuyển. Tick sau sẽ gỡ sự kiện Calendar của nó.
- Hai series test (`58ca229d`, `d5697bbe`) và các sự kiện Calendar giữ lại cho tới khi Bao nói "dọn lịch", giống các series test cũ.
