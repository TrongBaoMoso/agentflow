# Email của Recruit: hành trình của Loan Officer (theo code recruit-be origin/master fc218308d, 11/11)

Nhân vật: **Jordan** = Loan Officer, **Alex** = recruiter, **Sam** = onboarding specialist, **Riley** = người giới thiệu Jordan.
Chi tiết từng email (ai gửi, khi nào, khi nào không gửi, nút bấm, nguồn): `FLOWS.json`.

> Mọi email gửi LO đi qua 1 cổng chung, mỗi email có cờ riêng và chỉ gửi 1 lần cho mỗi khoá. Email bị bỏ qua khi người nhận đã huỷ đăng ký, bị chặn, email bị trả về, sai địa chỉ, không nằm trong danh sách cho phép, hoặc mẫu còn chỗ trống chưa điền. Khi `delivery_mode = DRY_RUN` thì chỉ lưu lại, không gửi. Hiện phần lớn cờ đang **tắt ở prod**, MOSO vẫn tự gửi bản của nó.

## 1. Cuộc gọi đầu → mời
| Bước | Ai làm gì | Email | Khi nào |
|---|---|---|---|
| Gọi lần đầu | Alex gọi Jordan, ghi kết quả trong Recruit | không có (nếu kết quả Neutral hoặc hết lượt "No answer" → xem Nurture) | — |
| Mời | Offer của Alex được duyệt và gửi (offer chuyển SENT) | **tpl-lo-invite** ("Join Loan Factory") | ngay |
| Chưa xong | Jordan chưa ký hoặc chưa trả phí | **tpl-lo-invite-reminder** ("Continue where you left off") | ngày 2, 5, 10 sau lời mời; chỉ gửi trong 24 giờ sau mốc |

Không gửi email mời nếu lead đã giao cho specialist. Nếu D354 bật mà chưa có specialist thì cũng không gửi.

## 2. Webinar (không bắt buộc, "Why Loan Factory", thứ Sáu)
Có 2 đường:
- **Buổi của MOSO**: Alex bấm "Register for webinar" → MOSO xác nhận xong → **tpl-lo-webinar-registered**. Nhắc lịch và drip của buổi này do MOSO gửi.
- **Buổi của Recruit** (cờ `webinar-schedule`, prod đang tắt): Jordan được đăng ký qua form trên web, qua admin hoặc qua recruiter:
  - **session-confirmed**: gửi ngay, có nút Join và Add to calendar
  - **session-link**: khi link Meet mới được tạo hoặc bị đổi (tick hằng giờ)
  - **session-moved**: khi admin bỏ hoặc huỷ buổi, Jordan được chuyển sang buổi kế tiếp cùng series
  - **reminder-2d / -1d / -2h**: 2 ngày, 1 ngày, 2 giờ trước giờ bắt đầu (tick hằng giờ). Ở mốc 1 ngày và 2 giờ có thêm SMS.
  - 30 phút sau khi buổi kết thúc, Recruit đọc điểm danh từ Meet.
  - Hôm sau lúc 14:00, mỗi người nhận đúng 1 bản: **follow-up-attended** (có dự), **follow-up-missed** (vắng: có bản ghi + buổi kế tiếp), hoặc **follow-up** (chưa biết có dự hay không).
  - Nếu Jordan có dự và có người giới thiệu: **referrer-attended** gửi Riley (trong 72 giờ sau khi đọc điểm danh).
  - Drip lúc 14:00: **drip-1m** (1 tháng sau, cho người còn "interested", mặc định TẮT), **drip-2m / drip-3m** (2 và 3 tháng sau, cho người đã mời mà im lặng, tạm ngưng hoặc từ chối).
- Gửi tay: Alex dùng **Send info** để gửi mẫu GENERAL "Webinar follow-up (demo)", gửi ngay hoặc hẹn ngày.

## 3. Buổi 1-1 onboarding
| Bước | Thao tác | Email | Khi nào |
|---|---|---|---|
| Đặt lịch | Sam bấm "Book 1-1" | **tpl-onb-1on1-reminder-2d / -1d / -2h** ("Join the call") | 2 ngày, 1 ngày, 2 giờ trước. Bỏ qua mốc nào đã qua lúc đặt lịch. Gửi qua MOSO, mặc định DRY_RUN |
| Xong | Sam bấm "Mark done" | **tpl-lo-welcome** ("Start your setup": xem thông tin, trả $100, ký) | ngay. Chỉ gửi khi MOSO không tự gửi bản của nó |

## 4. Offer → hợp đồng → phí → vào công ty
- Offer đi kèm lời mời (bước 1).
- Nhân viên sửa chi tiết hợp đồng chưa ký, hoặc bấm "Send new version": **tpl-lo-agreement-updated**, gửi 15 phút sau lần lưu cuối (mỗi lần lưu mới lùi lại 15 phút).
- **tpl-lo-agreement-link**: không có code nào gửi nên đã **bỏ khỏi Templates** ngày 11/11 (Bao duyệt).
- Jordan trả phí trên portal (lf-homepage `/register-loan-officer?invite=`) bằng PayPal:
  - Gửi ngay: **tpl-lo-fee-paid** cho Jordan và **tpl-lo-fee-paid-staff** cho Sam và Alex (mỗi người 1 email).
  - Chỉ gửi với khoản Recruit tự ghi nhận; không gửi khi được miễn phí.
- Khi Jordan đã ký và trả phí thì email nhắc dừng. Sau đó là NMLS và HR (không có mẫu email cho bước này).

## 5. Nhánh Nurture (chưa sẵn sàng)
Lịch NURTURE_CALL được mở khi recruiter ghi kết quả Neutral, hoặc khi "No answer" lần thứ 5 (hẹn gọi lại sau 3 tháng).
- **tpl-nurture-1..4**: email đầu gửi 4 tuần sau khi tạo lịch (`interval_weeks` chọn được 2, 3 hoặc 4), sau đó cứ 4 tuần 1 email.
- Chỉ gửi trong giờ làm việc, không gửi từ ngày hẹn trở đi.
- Mẫu nào dùng ít nhất thì đi trước, nên thứ tự là #1 → #4 rồi lặp lại.
- Dừng hẳn khi Jordan trả lời, có người thật gọi/nhắn/email cho Jordan, Jordan bị lưu trữ, hoặc Jordan huỷ đăng ký.

## Ví dụ theo giờ
Thứ Hai 10:00 Alex gọi Jordan → 10:20 gửi offer → **invite**. 11:00 Alex đăng ký Jordan vào buổi Recruit 13:00 PST thứ Sáu → **session-confirmed**. Thứ Tư ~13:00 **reminder-2d** + **invite-reminder** (ngày 2). Thứ Năm ~13:00 **reminder-1d** + SMS. Thứ Sáu ~11:00 **reminder-2h** + SMS. Jordan dự → khoảng 15:00 Riley nhận **referrer-attended**. Thứ Bảy 14:00 **follow-up-attended**. Thứ Bảy (ngày 5) **invite-reminder**. Thứ Hai Sam đặt 1-1 lúc 15:00 thứ Năm → **1on1-reminder-2d / -1d / -2h**. Thứ Năm 15:25 Mark done → **welcome**. 20:10 Jordan trả phí → **fee-paid** + 2× **fee-paid-staff**. Jordan ký → hết email nhắc.

## Chỗ chưa rõ trong code
- Nhắc 1-1: người gửi là ai (email đi qua packs outbox).
- Drip: nhãn nút (không thấy `B.cta` trong kit.js).
- Tần suất cron của Nurture và của email nhắc lời mời (là setting, chưa đọc).
- Email gửi người giới thiệu: có kiểm ô "email me" của MOSO không.
- Webinar: đăng ký sau khi đã qua mốc nhắc thì sao.
- Nội dung và nút của "Webinar follow-up (demo)" (chưa đọc).
