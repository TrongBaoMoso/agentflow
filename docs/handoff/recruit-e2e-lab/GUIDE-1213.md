# Hướng dẫn test lại — kết quả sheet của Bao ngày 12/10 (viết 13/10)

Môi trường: staging, https://recruit.viet18.com. Mỗi mục dưới đây là một bước Bao đánh dấu cần làm rõ.
Sheet `recruit-e2e-lab.html` đã sửa chữ theo đúng các mục này.

---

## A23 — chuông "HR is done for …"

Kết luận: **không phải lỗi**. Tự tick thì hệ không gửi chuông cho chính mình (quy ước chung của mọi chuông).
Hôm 12/10 Bao tick bằng đúng tài khoản onboarding specialist của QA Tenmain, nên không có chuông.

Cách thấy chuông:

1. Đăng nhập tài khoản HR `bao.trinh+role-hr@loanfactory.com`.
2. Ô tìm gõ `Tenmain` → mở **QA Tenmain**.
3. Trên thẻ HR, tick **HR to-do**, rồi tick **HR docs**.
4. Đăng xuất. Đăng nhập lại bằng tài khoản là onboarding specialist của QA Tenmain.
5. Bấm **chuông** (góc trên bên phải).
6. Kết quả đúng: có dòng "**HR is done for QA Tenmain**".

Lưu ý: hai ô HR của QA Tenmain đã Done từ 12/10. Muốn test lại thì bấm **Undo** ở hai ô đó trước (bằng tài khoản HR), rồi làm từ bước 3.

---

## B9 — NMLS

Kết luận: **phần 2 của bước viết sai, đã bỏ**. QA Bnonmls vốn không có NMLS, nên ô NMLS trống sẵn, không có gì để xoá.

Chỉ làm phần 1:

1. Đăng nhập `bao.trinh+recruiter@loanfactory.com`.
2. Ô tìm gõ `Bnonmlstwo` → mở **QA Bnonmlstwo**.
3. Bấm **Log result** → **Interested** → **Yes, prepare offer**.
4. Kết quả đúng: hộp thoại báo "**NMLS missing from the profile**" + link "**Update NMLS in the profile**"; nút gửi bị khoá.

---

## B13 — dải đỏ "The invite did not reach MOSO" (chỉ nhìn)

Kết luận: **QA Claudeofferb đã được gửi lại ngày 10/10** nên không còn dải đỏ — Bao không thấy là đúng. Đổi sang LO khác.

1. Đăng nhập tài khoản Manager.
2. Ô tìm gõ `Tenadsupport` → mở **QA Tenadsupport**
   (link: https://recruit.viet18.com/candidates/911687e3-91f6-422f-ad1a-78f4fdb252c7).
3. Tab **Overview**.
4. Kết quả đúng:
   - dải đỏ "**The invite did not reach MOSO.**" (MOSO báo tài khoản gửi thiếu quyền RECRUITING) và nút **Resend invite**;
   - mục **Offer**: "Invited" với chữ đỏ "**Not delivered to MOSO**".
5. Chỉ nhìn, **đừng bấm Resend invite**.

---

## B14 — packs #3645 (Claude đã chạy 13/10)

Tình trạng: packs #3645 **đã lên MOSO staging** (12/10 15:26). **Chưa lên production**.
`bao.trinh+recruiter` không dùng được cho bước này (nó vốn gửi được, kể cả trước #3645).

Cách test:

1. Đăng nhập `bao.trinh+role-losupport@loanfactory.com` (bên MOSO tài khoản này là `bao.trinh+role-losupport+1@loanfactory.com`).
2. Mở **QA Tenadsupport** (link ở B13) → tab **Overview**.
3. Trong dải đỏ, bấm **Resend invite**.
4. Hộp thoại "Send the invitation email again?" → bấm **Send again**.
5. Đợi tới mốc cron kế tiếp (phút :00 hoặc :05) + 1 phút.
6. Mở lại tab **Overview**.

Kết quả Claude chạy (13/10, 03:04 VN = 12/10 20:04 UTC):

- Bấm **Send again** → hệ trả 200: `POST /offers/3e4086a4…/resend-invite`, hiện chữ "…again. This can take a few minutes."
- Cron 20:05:00 UTC gửi sang MOSO → **vẫn 401**. Bảng `packs_writeback_outbox`, dòng mới `8b17209f…`:
  - status `DEAD_LETTER`, reason_code `MOSO_ACTOR_LACKS_RECRUITING`, actor `bao.trinh+role-losupport+1@loanfactory.com`;
  - lỗi: "POST /candidate/invite -> 401: Authorization failed - acting user lacks recruiting permission (**needs RECRUITING, INTERESTED_LOAN_OFFICERS or RECRUITED_LOAN_OFFICERS, or to be flagged is_recruiter or is_out_sourcing_recruiter**)";
  - `delivery_actor_email` trống (không có lần thử lại bằng tài khoản hệ thống).
- Mở lại Overview: dải đỏ và chữ "Not delivered to MOSO" **vẫn còn**.

Giải thích:

- Lỗi lần này **có thêm đoạn "(needs RECRUITING, INTERESTED_LOAN_OFFICERS …)"**. Lần lỗi cũ ngày 10/10 không có đoạn này. Đoạn này là code mới của #3645, nên #3645 **đang chạy** trên staging.
- MOSO Admin của `role-losupport+1` không có quyền nào trong 5 quyền #3645 chấp nhận, nên MOSO cố ý từ chối. Đây **không phải lỗi deploy**.

Muốn bước này ra "Đạt": một MOSO admin cấp cho `bao.trinh+role-losupport+1` một trong các quyền trên (vd. INTERESTED_LOAN_OFFICERS). Sau đó làm lại từ bước 3.

Ảnh chụp: `scratchpad/sheeth/b14-before.png`, `b14-after-click-dialog.png`, `b14-after-send-again.png`, `b14-after-cron.png`.

---

## F7b — nút "Edit before sending" ở đâu

Nút này nằm ở **đáy hộp thoại**, bên trái nút cam **Save & send**. Nó chỉ hiện khi chọn **Send now** và nội dung có chữ.

1. Mở hồ sơ LO (vd. QA Tenfsend) → **Log result**.
2. **Interested** → **Send info**.
3. Send via **Email**.
4. Chọn **Send now** (không chọn "Schedule for later").
5. Mở ô **Template** → chọn một mẫu Team (hoặc tự gõ nội dung). Nội dung **không được trống**.
6. Nhìn xuống đáy hộp thoại: nút viền **Edit before sending** nằm bên trái **Save & send** → bấm.
7. Kết quả đúng: mở khung soạn thư đã điền sẵn nội dung.

---

## F5 / F6 — khi nào LO hiện lại trên /today, và cách tự đặt nhắc việc

- **Webinar (F5).**
  - Hiện tại hệ đặt 1 follow-up vào **ngày làm việc kế tiếp**, không theo ngày webinar.
  - Sau bản sửa (PR đang làm), hệ tự đặt **2 follow-up: 1 ngày trước và 1 ngày sau buổi webinar**.
- **Meet 1-1 (F6): không đổi.** Follow-up đặt đúng giờ hẹn, nên LO hiện trên /today vào ngày họp.

Tự thêm follow-up:

1. Mở hồ sơ LO → tab **Overview**.
2. Mục **Next step** → bấm **Add follow-up** (chỉ chủ lead hoặc manager thấy).
3. Chọn ngày (và nội dung nếu có) → lưu.
4. Cách khác: trên **My work today**, ở dòng của LO đó bấm **Add follow-up** (hoặc **Remind later**).
5. Sau buổi webinar hoặc buổi 1-1: bấm **Log result** lần nữa để đặt bước tiếp theo.

---

## F7 — template có `{{first_name}}` được không?

**Được.** Khi chọn template, hệ tự thay `{{first_name}}`, `{{last_name}}`, `{{recruiter_name}}` bằng thông tin của LO (vd. "Hi {{first_name}}" thành "Hi QA").

**Save & send** chỉ bị khoá khi còn sót `{{…}}` trong nội dung lúc gửi, tức là khi:
- tự gõ tay `{{first_name}}` sau khi đã chọn template; hoặc
- có một biến lạ hệ không biết.

Khi đó hệ báo "Fill in {{first_name}} first, or edit before sending". Bấm **Edit before sending** để sửa.

Sheet trước đây ghi nhầm `{{{{first_name}}}}` (4 ngoặc), đã sửa thành `{{first_name}}`.

---

## Ghi chú ngắn

- **B10 — giữ nguyên (đúng thiết kế, Bao đã chốt).** Bấm **Call** trên lead của người khác vẫn quay số và hiện "X already owns this candidate". Không đánh Fail vì điều này. Phần chính của B10 (không làm được offer, không có thẻ Ready to join) vẫn ĐẠT.
- **B7 — đang sửa.** Bao đã chốt cho sửa hai con số ngay trong hộp thoại **Edit & resend**; PR đang làm.
  - Sau bản sửa: sửa số trực tiếp trong hộp thoại → **Send to onboarding**.
  - Trước bản sửa: **Profile → Edit → Production** → 6/3 → Save → quay lại **My hand-offs** → **Edit & resend** → **Send to onboarding**.
- **C2 / C3 — đang sửa.**
  - Recruit sắp chỉ còn hai lựa chọn **W-2** và **1099** (PR đang làm).
  - Trang LO hiện lựa chọn W-2/1099 mà **chính LO chọn lúc đăng ký**. Recruit không đổi nó cho Corporate/Mortgage advisor. Vì vậy QA Tenccorp hiện 1099, còn QA Tencadvisor hiện W-2.
  - Khi test, ghi lại trang hiện cái nào.
- **G2 — đang sửa.**
  - Thư trả lời của Bao **đã tới hệ thống** lúc 00:48 VN 13/10, nghĩa là đường Google đã thông.
  - Nhưng recruit-be chưa nhận ra địa chỉ `cand-<id>@reply.viet18.com`, nên thư nằm ở hàng chờ "chưa khớp" của omni, không vào hội thoại. Đây là lỗi code bên recruit-be, PR đang làm.
  - Sau khi bản sửa lên staging: Bao (hoặc Claude) **Reply lại một lần nữa** vào email recruit gửi cho LO, rồi mở **Conversations** kiểm tra thư có vào hội thoại không.
