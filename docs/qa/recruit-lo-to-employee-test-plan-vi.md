# Kịch bản test: LO lạ → nhân viên (recruit ↔ MOSO ↔ HR) — STAGING

> Soạn 29/09/2026 từ code `origin/master` recruit-be `8e5d453e` / recruit-fe `3f55beb3`, HR `dev-5a62ad20`,
> và từ một lần chạy thật end-to-end cùng ngày. Chỉ test **staging**. Đi được tới đâu ghi tới đó.
>
> Ký hiệu: `[ ]` chưa test · `[x]` đạt · `[!]` lỗi (ghi bead/ghi chú) · 🐞 = lỗi ĐÃ BIẾT, kết quả "sai" là dự kiến.

---

## 0. Chuẩn bị

### 0.1 Địa chỉ

| Hệ thống | URL | Ai dùng |
|---|---|---|
| Trang đăng ký LO (lf-homepage) | https://www.viet18.com/register-loan-officer | LO (không cần đăng nhập) |
| Recruit app | https://recruit.viet18.com | Recruiter, Manager, Onboarding, Licensing, HR, Accounting |
| HR app | https://hr.viet18.com | HR |
| MOSO admin (màn LO Recruiting) | https://www.viet18.com/lo_recruiting | Staff MOSO (chỉ để đối chiếu) |
| Trang ký (LO) | link "Click Here to Sign Documents" trong bước 4 của trang đăng ký | LO |

### 0.2 Tài khoản / vai trò cần có

- [ ] **Recruit — RECRUITER** (claim, log call, Invite to join). *Admin MOSO của người này phải có `branch`* — nếu không, lời mời hỏng (🐞 agentflow-aen3f). Đã biết có branch: `manhadmin@viet18.com`.
- [ ] **Recruit — MANAGER** (duyệt offer ở `/exceptions`, xem Sync trace).
- [ ] **Recruit — ONBOARDING** (1-1 meeting ở `/work`, **Send to HR**). Specialist được gán tự động theo vòng tròn — người test phải là người được gán, hoặc Manager đổi specialist.
- [ ] Recruit — LICENSING, HR, ACCOUNTING (xem/đóng việc phòng ban ở `/work`, Sponsorships).
- [ ] **HR app — HR** (thấy "New hires", bấm Create associate).
- Tài khoản test sẵn có trên recruit staging: `bao.trinh+recruiter@`, `bao.trinh+manager@`, `bao.trinh+onb-test@loanfactory.com` (hộp thư của anh Bao). Muốn dùng tài khoản của mình: nhờ Admin cấp vai trò ở `/permissions`.

### 0.3 Quy ước dữ liệu test (để không đụng dữ liệu thật)

- Email LO: alias của chính bạn, mỗi case một tag: `<ban>+e2e<ngày><case>@loanfactory.com` (vd `huy.q.nguyen+e2e0930a@loanfactory.com`). Mọi email gửi cho LO sẽ về hộp của bạn.
- Tên: **chỉ chữ cái** (PayPal và HR từ chối chữ số). Vd `Etoe Casea`.
- NMLS: 7 số ngẫu nhiên chưa ai dùng, vd `99` + 5 số.
- SĐT: số US hợp lệ dạng `(714) 555-01xx`.
- Địa chỉ: `123 Test Street, Dallas, TX 75201`.
- **Thẻ PayPal sandbox** (guest checkout): Visa `4032033814197955`, hạn `12/30`, CVV `123`, Country = United States. ⚠️ Thẻ test công khai `4111…`, `4012888888881881`, `5555…` đều bị sandbox từ chối. Cần thêm thẻ: sinh số hợp lệ Luhn tiền tố `403203` (công cụ Card Generator của PayPal Developer).

### 0.4 Thời gian chờ bình thường

| Việc | Chờ tối đa |
|---|---|
| LO đăng ký → hiện trong recruit | ~1 phút |
| Recruit → MOSO (lời mời, 1-1 meeting) | 5 phút (cron) |
| MOSO → recruit (đã trả phí / đã ký) | ~1 phút |
| Send to HR → bản nháp trong HR | 5 phút (cron) |

### 0.5 Cách tự kiểm không cần DB

- Drawer ứng viên → thẻ **Invite to join**: Invited / Paid the fee / Signed.
- Drawer → tab **Sync trace** (MANAGER, ONBOARDING): trường MOSO + lịch sử writeback.
- `/work` → Onboarding: trạng thái dòng "Not sent" / "Syncing" / "Sent to MOSO".
- Hộp thư alias của bạn: các email MOSO gửi LO.

### 0.6 Lỗi đã biết (đọc trước khi test)

| Bead | Triệu chứng | Workaround |
|---|---|---|
| 🐞 agentflow-aen3f | Manager duyệt xong nhưng LO **không nhận email mời**; drawer không tiến. Nguyên nhân: Admin MOSO của recruiter request không có `branch`. Không có nút gửi lại ("Resend invite" bị khoá). | Decline offer → recruiter/manager có branch (vd manhadmin) request lại → duyệt. |
| 🐞 agentflow-0h41a | LO đã trả phí + ký nhưng stage vẫn **S1 "New lead"**; nút **Send to HR không hiện**. UI không có nút chuyển stage. | Nhờ dev gọi API `POST /api/v1/candidates/{id}/transition` S5 rồi S6 (ghi ID ứng viên cho dev). |
| 🐞 agentflow-ks99 / qn3cx | HR tạo nhân viên xong, recruit **không đổi gì** (không có tài khoản, checklist HR/IT vẫn Open); MOSO `hr_status` vẫn "not initiated". | Không có — chiều về chưa được xây. |
| 🐞 agentflow-2jrpw | Trang ký ghi "tentatively classified as **Independent Loan Officer (1099)**" dù LO là W-2. Tài liệu ký thật vẫn đúng loại. | Bỏ qua dòng chữ, kiểm tên tài liệu. |
| 🐞 (nhỏ) | HR wizard báo 100% nhưng Create associate báo "names must be 1-80 letters…" nếu tên có chữ số. | Dùng tên chỉ chữ cái. |
| 🐞 (nhỏ) | Trường `recruiter` bên MOSO giữ người MOSO tự gán lúc đăng ký, không đổi sang người claim trong recruit. | Chỉ ghi nhận. |

---

## 1. Luồng chính A — LO lạ, W-2, trả $100 (happy path)

Ghi lại: email LO ______ · NMLS ______ · ID ứng viên recruit ______ · giờ bắt đầu ______

### A1. LO đăng ký (vai: LO, không đăng nhập)
- [ ] Mở `/register-loan-officer`. Stepper có 5 bước: Before You Begin · Fill Out Basic Information · Paying one-time fee AFTER YOUR CALL · Review and Sign agreement · Grant Access on NMLS.
- [ ] Tick "I acknowledge…" → **Next**.
- [ ] Điền Basic Info (tên, legal name, email, phone, Citizenship, địa chỉ, tick "Same as personal address", NMLS, Licensed states = Texas, sponsor = Texas, **Loan Officer type = Outside loan officer (W-2)**, compensation, "Are you referred…" = Google, tick xác nhận) → **Next**.
- [ ] Kỳ vọng: URL có `?key=…` (lưu lại link này — đây là "link của LO"). Trang Pay hiện: *"You're done for now. We will call you soon. After the call, we will email you a link to pay the $100 fee and sign."* Không có nút PayPal.
- [ ] Bấm sang bước Review and Sign: chỉ thấy thông báo chờ, **không** có link ký.

### A2. Lead vào recruit (vai: RECRUITER)
- [ ] Trong ~1 phút ứng viên xuất hiện (tìm theo tên/email ở `/inbox/hot` hoặc `/today`), stage **S0 Unclaimed**.
- [ ] Thông tin trong drawer khớp form (tên, email, SĐT, NMLS, bang).
- [ ] **Claim** → stage **S1 New lead**, owner = bạn.

### A3. Gọi + mời (vai: RECRUITER)
- [ ] Drawer → **Log result** → "Call result — {tên}" → **Interested**.
- [ ] Trong nhánh Interested bấm **🤝 Invite to join** → modal "Invite to join — {tên}".
- [ ] Modal hiện: Referral source, NMLS on file, "The two numbers" (loans since 2022 / last 12 months — để trống), Startup fee **Charge $100** (mặc định).
- [ ] Vì thiếu 2 con số: hiện "Will need manager approval" → nút **Request approval →**. Bấm.
- [ ] Toast "Sent for manager approval."; drawer hiện "Offer is waiting for manager approval".

### A4. Duyệt (vai: MANAGER)
- [ ] `/exceptions` → mục **"Offers waiting for your approval"** có dòng ứng viên, lý do "Loans since 2022 unknown" / "Last-12-month loans unknown".
- [ ] Bấm **Approve & send** → toast "Approved and sent to {tên}".
- [ ] Trong ≤5 phút: email **"Invitation to join …"** về hộp LO. ⚠️ Nếu không tới → 🐞 aen3f (xem Sync trace: INVITE dead-letter).
- [ ] Drawer: Invited ✓. Một Onboarding specialist được gán; `/work` → Onboarding có dòng "Pre-onboarding meeting" (1-1) cho ứng viên.

### A5. 1-1 meeting (vai: ONBOARDING — đúng specialist được gán)
- [ ] `/work` → Onboarding → bật **1-1 meetings** → thấy dòng ứng viên.
- [ ] (tuỳ chọn) **Schedule 1-1** → mở Google Calendar link / Copy Meet link.
- [ ] **Done…** → modal "Mark the 1-1 meeting done": ngày họp (không được ở tương lai) + **W-2 or 1099?** = *W-2 · Outside loan officer* → **Mark done**.
- [ ] Dòng chuyển "Syncing" → trong ≤5 phút **"Sent to MOSO"**.
- [ ] Email **"Loan Factory Onboarding: Complete These Initial Steps"** về hộp LO.

### A6. LO trả phí (vai: LO)
- [ ] Mở lại link của LO (hoặc link trong email). Bước Pay giờ có nút PayPal (sandbox).
- [ ] **Debit or Credit Card** → popup "PayPal Guest Checkout" → Country United States → thẻ sandbox ở 0.3 → tên chỉ chữ cái → **Pay now as guest**.
- [ ] Kỳ vọng: "Payment successful". Email xác nhận trả phí về hộp LO.
- [ ] Recruit (≤1 phút): drawer thẻ Invite — **Paid the fee: Paid**.

### A7. LO ký (vai: LO)
- [ ] **Next** → "Review and Sign agreement" → 🐞 2jrpw: dòng "classified as 1099" là sai, bỏ qua.
- [ ] **Click Here to Sign Documents** → tab mới "Signing Pages", 0 of 5.
- [ ] Tài liệu đầu là **"Loan Originator Employment Agreement — Outside Salesperson"** (đúng W-2).
- [ ] **Start** → xác nhận tên → **SUBMIT**; bấm từng ô cam "CLICK HERE TO SIGN" tới 5/5 → **COMPLETE** → **SUBMIT**.
- [ ] Kỳ vọng: "You've finished signing!", email bản đã ký về hộp LO.
- [ ] Recruit (≤1 phút): thẻ Invite — **Signed** ✓.

### A8. Sang Joined (vai: ONBOARDING / RECRUITER)
- [ ] Kỳ vọng thiết kế: ứng viên sang **S6 Joined** và drawer có **Send to HR**.
- [ ] 🐞 0h41a thực tế: stage vẫn S1, không có nút. → ghi ID ứng viên, nhờ dev chuyển S6 bằng API, rồi tải lại drawer.
- [ ] Sau khi S6: 14 việc phòng ban tự sinh ở `/work` (Licensing, HR, Accounting, IT, Onboarding).

### A9. Send to HR (vai: ONBOARDING)
- [ ] Drawer → **Send to HR** (không có danh sách thiếu) → toast "Sent to HR".
- [ ] Drawer hiện "Sent to HR · {giờ}", và "Changes made after sending are not sent to HR again."
- [ ] Không hiện "Sending to HR failed…" sau 5 phút.

### A10. HR tạo nhân viên (vai: HR, trên hr.viet18.com)
- [ ] `Associates` → **Add associate** / "New hires": thấy bản nháp có chip **Recruit**, ghi chú "From recruit, offer signed …", thanh % và "Still needed: …".
- [ ] **Review** → wizard 4 bước: Personal Information · Engagement & Contract · Role & Licensing · Review. Kiểm dữ liệu từ recruit đã điền sẵn: tên, email cá nhân, SĐT, địa chỉ, NMLS, LO type, bang TX, employment type.
- [ ] Điền **Work email** (bước 1).
- [ ] Role & Licensing → licence TX chọn **Mortgage Loan Originator License** + **ngày hết hạn** (bắt buộc).
- [ ] 100% → **Create associate** → toast "Associate created", mở trang nhân viên (mã LF-US-xxxx).
- [ ] Email mời vào MOSO (Admin) về hộp LO.

### A11. Chiều về recruit (vai: ONBOARDING / MANAGER)
- [ ] Kỳ vọng thiết kế: recruit biết LO đã thành nhân viên.
- [ ] 🐞 ks99/qn3cx thực tế: không đổi gì — ghi lại để xác nhận lỗi vẫn còn (stage, checklist HR/IT, Sync trace `hr_status`).

---

## 2. Các kịch bản khác (mỗi cái 1 LO mới, trừ khi ghi khác)

### B. Phí và duyệt offer
- [ ] **B1 Tự duyệt**: ở modal Invite nhập *Loans since 2022* = 6, *last 12 months* = 3, Charge $100 → nút là **Send invite →**, toast "Invite sent…", **không** vào hàng chờ manager.
- [ ] **B2 Ngưỡng biên**: nhập 5 và 2 (đúng ngưỡng) → vẫn tự duyệt; nhập 4 và 2 → "Below loans-since-2022 minimum", cần duyệt.
- [ ] **B3 Miễn phí, manager đồng ý**: chọn **🎁 Waive + reason** (vd Top producer) → luôn cần duyệt (kể cả số đủ). Manager bấm **Approve, waive $100 & send** → LO **không** phải trả phí; bước Pay bị bỏ qua sau 1-1; thẻ Invite hiện "Fee waived".
- [ ] **B4 Miễn phí, manager giữ phí**: như B3 nhưng bấm **Approve, keep $100 fee & send** → toast "…$100 fee kept, waive not applied"; LO phải trả.
- [ ] **B5 Manager từ chối**: **Decline** → bắt buộc lý do → drawer "Declined by {manager}: {lý do}"; LO không nhận email mời.
- [ ] **B6 Mời lại sau khi từ chối**: sau B5, recruiter mở lại Invite to join → tạo offer mới được (không bị "already has an open offer").
- [ ] **B7 Một offer mở mỗi lúc**: khi offer đang chờ duyệt, thử mời lần 2 → bị từ chối "already has an open offer".
- [ ] **B8 Từ chối khi đã trả phí**: offer đã PAID → Decline → hiện cảnh báo "This loan officer already paid the fee… must be refunded".
- [ ] **B9 Quá hạn duyệt**: offer chờ > `offer.approval_sla_hours` (24h mặc định, sửa ở `/settings`) → badge "Offer approval is overdue".
- [ ] **B10 Thiếu NMLS**: ứng viên không có NMLS → modal Invite hiện "NMLS missing from the profile", nút gửi bị khoá.

### C. Loại LO (1-1 Done)
- [ ] **C1 1099 · Independent loan officer** → tài liệu ký là bản Independent/1099; HR bản nháp employment type = contract.
- [ ] **C2 Corporate** → kiểm tài liệu ký và HR employment type.
- [ ] **C3 Mortgage advisor** → như trên.
- [ ] **C4 LO chọn W-2 lúc đăng ký nhưng Onboarding chọn 1099** → bên nào thắng (tài liệu ký, MOSO `is_corporate_loan_officer`, HR)? Ghi kết quả.
- [ ] **C5 Không bật hire classification** (nếu được) → modal Done không hỏi W-2/1099.

### D. Bang / giấy phép
- [ ] **D1 Sponsor OR, GA hoặc KY** → sau khi trả phí + ký: MOSO gửi email background check (`ILO_completes_background_check`) cho LO.
- [ ] **D2 CA** → form đăng ký hỏi thêm DRE (`has_dre_endorsed`…); kiểm validate.
- [ ] **D3 IN** → form hỏi `has_sos_licensed`.
- [ ] **D4 Nhiều bang** (TX + FL) → HR bản nháp có 2 dòng licence; `/sponsorships` hiện 2 bang.
- [ ] **D5 Licensing**: `/sponsorships` → ứng viên ở bucket đúng (Ready / Waiting on the Loan Officer / …); đổi trạng thái 1 bang; không còn ô license number (đã bỏ theo D145).

### E. Đăng ký và nguồn lead
- [ ] **E1 Đăng ký lại cùng email** → MOSO không tạo bản ghi mới (dedupe theo email); recruit không tạo ứng viên trùng.
- [ ] **E2 Tiếp tục bằng link `?key=`** sau khi đóng tab → đúng bước đang dở.
- [ ] **E3 Form trên lo-homepage** (trang của Loan Officer) → lead vào recruit như E1; có ghi referrer đúng.
- [ ] **E4 Staff mở `/apply_loan_officer?key=`** (form MOSO cũ) → cùng quy tắc: trước 1-1 không trả/ký được; sau 1-1 phải trả trước khi ký (deep link "Review and Sign" chuyển về Pay khi chưa trả).
- [ ] **E5 Validate form**: bỏ trống từng trường bắt buộc (*) → báo lỗi, không gửi.

### F. Nhánh cuộc gọi (vai: RECRUITER)
- [ ] **F1 No answer** → "A retry call is scheduled automatically" → hiện lại ở Today đúng ngày.
- [ ] **F2 Neutral** → vào Nurture, có "Wake me up on" → nổi lại đúng ngày.
- [ ] **F3 Not interested** → archive với lý do (Signed elsewhere / Asked to stop contact…) → ứng viên archived; Send to HR (nếu có) báo "The candidate is archived".
- [ ] **F4 Interested → Webinar** → dropdown "Which webinar?" có buổi → lưu → LO nhận email đăng ký webinar.
- [ ] **F5 Interested → Meet 1-1** → "Open in Google Calendar" mở đúng template.
- [ ] **F6 Interested → Send info** → chọn template, Send now / Schedule for later.
- [ ] **F7 Interested mà không chọn bước tiếp** → không lưu được (bắt buộc chọn 1 next step).

### G. Onboarding 1-1
- [ ] **G1 Chưa có specialist** → `/work` hiện "Pick a specialist first" → Manager/Onboarding **Assign**.
- [ ] **G2 Đổi specialist** → người cũ mất quyền Schedule/Done dòng đó.
- [ ] **G3 Người không phải specialist** bấm Done/Schedule → bị chặn.
- [ ] **G4 Ngày họp ở tương lai** → Done bị từ chối.
- [ ] **G5 MOSO không nhận** → dòng "Not sent" + lý do "missing: {fields}" → sửa rồi **Send again**.
- [ ] **G6 Staff đổi 1-1 ở MOSO** (`/lo_recruiting` dropdown "1-1 Onboarding meeting") → recruit tự đóng dòng 1-1.

### H. Thanh toán và ký (vai: LO)
- [ ] **H1 Thẻ bị từ chối** (vd 4111…) → PayPal báo lỗi, không ghi Paid, trang vẫn cho trả lại.
- [ ] **H2 Đóng popup PayPal giữa chừng** → không ghi Paid.
- [ ] **H3 Vào thẳng bước ký khi chưa trả** (link email có `selectTab=Review and Sign`) → bị chuyển về Pay, sign hiện "pay first".
- [ ] **H4 Ký dở (2/5) rồi đóng tab** → mở lại, tiến trình giữ nguyên; recruit chưa Signed.
- [ ] **H5 Trả phí trước 1-1** → không có nút PayPal ("done for now").

### I. Send to HR — điều kiện (vai: ONBOARDING, ứng viên ở S6)
Mỗi dòng: làm thiếu 1 thứ trong hồ sơ → drawer phải liệt kê đúng câu, có link sửa:
- [ ] **I1** chưa ký/trả → "The offer is not signed and paid (or waived) yet"
- [ ] **I2** không NMLS → "NMLS number is missing"
- [ ] **I3** SĐT sai → "Phone number is not a valid number"; không SĐT → "Phone number is missing"
- [ ] **I4** không địa chỉ gửi thư → "Mailing address is missing"
- [ ] **I5** chưa làm 1-1 Done → "1-1 outcome: loan officer type is missing" / "employment type is missing"
- [ ] **I6** ứng viên archived → "The candidate is archived"
- [ ] **I7** đã gửi rồi → nút không bấm lại được; sửa hồ sơ sau khi gửi **không** sang HR lại.
- [ ] **I8** Miễn phí (B3) + ký → Send to HR vẫn được (WAIVED tính như đã trả).

### J. HR app (vai: HR)
- [ ] **J1** Bản nháp thiếu work email → "Still needed: Work email"; Create associate bị khoá.
- [ ] **J2** Licence không chọn từ danh mục / thiếu ngày hết hạn → báo thiếu.
- [ ] **J3** Work email đã có người dùng → báo trùng.
- [ ] **J4** Xoá bản nháp → recruit không tự gửi lại (ghi nhận); nhờ dev gửi lại → tạo bản nháp mới.
- [ ] **J5** LO đã là nhân viên (gửi lại sau khi HR tạo) → HR không tạo bản nháp thứ 2.
- [ ] **J6** 1099 LO + licence chỉ dành cho W-2 → HR từ chối.
- [ ] **J7** Sau Create: kiểm LO nhận email mời vào MOSO; đăng nhập được account.viet18.com (mật khẩu theo email mời).

### K. Việc phòng ban và S7 (vai: LICENSING / HR / ACCOUNTING / IT / ONBOARDING)
- [ ] **K1** Sau S6, mỗi phòng thấy việc của mình ở `/work` (vd Licensing: NMLS sponsor; HR: BGC, Docs, Onboarding, Complete; Accounting: W9, payroll, direct deposit, comp; IT: account, equipment).
- [ ] **K2** Phòng khác chỉ xem: "You can see {dept}'s work, but only {dept} can close it."
- [ ] **K3** **Blocked…** (có lý do) / **Unblock** / **N/A…** (bắt buộc lý do) / **Done**.
- [ ] **K4** `/checklist-templates`: bật/tắt mục bắt buộc → ảnh hưởng cổng "100% onboarded".
- [ ] **K5** Đủ 100% mục bắt buộc → chuyển S7 (hiện chỉ qua API — ghi nhận nếu UI không có).

---

## 3. Phân quyền (test âm) — mỗi dòng: đăng nhập vai đó, thử hành động, phải BỊ CHẶN

| # | Vai | Hành động | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| P1 | RECRUITER | Duyệt offer ở `/exceptions` | không thấy mục duyệt / bị chặn | [ ] |
| P2 | RECRUITER | Send to HR | không thấy nút | [ ] |
| P3 | RECRUITER | Done 1-1 meeting | bị chặn | [ ] |
| P4 | MANAGER | Send to HR | không thấy nút (chỉ ONBOARDING) | [ ] |
| P5 | ONBOARDING | Invite to join / request offer | không có nút | [ ] |
| P6 | ONBOARDING | Claim lead | bị chặn | [ ] |
| P7 | LICENSING | Đóng việc HR ở `/work` | chỉ xem | [ ] |
| P8 | HR (recruit) | Đóng việc Licensing | chỉ xem | [ ] |
| P9 | ACCOUNTING | Xem `/work` các phòng khác | xem được, không đóng được | [ ] |
| P10 | Không có vai | Vào `/work` | "You cannot see department work" | [ ] |
| P11 | RECRUITER | Sync trace tab | không thấy (chỉ MANAGER, ONBOARDING) | [ ] |
| P12 | HR app không có quyền HR | Vào New hires | không thấy / bị chặn | [ ] |
| P13 | RECRUITER A | Mở ứng viên của recruiter B, Log result | theo luật sở hữu (ghi nhận) | [ ] |

---

## 4. Nhật ký kết quả

| Ngày | Case | LO email / ID ứng viên | Tới bước nào | Kết quả | Ghi chú / bead |
|---|---|---|---|---|---|
| 29/09 | A (Claude chạy) | …+e2e0929a / d9d71e23 | A11 | Qua hết với 2 workaround | aen3f, 0h41a, ks99, qn3cx, 2jrpw |
| | | | | | |

**Khi gặp lỗi, ghi đủ:** email LO, ID ứng viên (URL drawer), giờ (ghi rõ giờ VN hay UTC), vai đang đăng nhập, ảnh chụp, và nội dung tab Sync trace nếu có.
