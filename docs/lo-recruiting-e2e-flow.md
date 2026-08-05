# LO Recruiting trên Tera+ — Flow end-to-end chi tiết

> **Phạm vi:** hành trình hoàn chỉnh của MỘT ứng viên LO từ lúc là một dòng data đến lúc thành LO active — và công việc của TỪNG phòng ban trên hành trình đó.
> **Căn cứ:** 17 pain points trong [lo-recruiting-redesign-direction.md](lo-recruiting-redesign-direction.md) + năng lực tích hợp Modex đã xác minh 31/07/2026 (webhook list-sync) + ma trận role đo thật trên production.
> **Cách đọc ký hiệu:** các mã như **P0-17, P1-5, P1-10** là số hiệu pain point (điểm đau) trong doc direction — P0 = nghiêm trọng nhất, P1 = cao, P2 = trung bình. **S0 → S7** là 8 chặng của phễu trong doc này. Mọi từ viết tắt/chuyên ngành được giải thích ở **Bảng thuật ngữ** ngay dưới đây.
> **Nhân vật minh hoạ:** ứng viên **Roger Kube** (NMLS 107621 — case study thật trong P0-17) và các role thật: Inside Recruiter (Brayan), Outside Recruiter (Seth), HR (Dave), Licensing (Dung), Onboard Specialist (Miley), Accounting (Rosaline), Recruiting Manager (Victoria).

---

## Bảng thuật ngữ — đọc trước khi đọc flow

### Từ ngành mortgage & tuyển dụng

| Từ | Nghĩa đời thường |
|---|---|
| **LO (Loan Officer)** | Chuyên viên tín dụng mua nhà — chính là "ứng viên" mà bộ phận recruiting đi tuyển về |
| **NMLS / NMLS ID** | Hệ thống cấp phép hành nghề mortgage toàn nước Mỹ. Mỗi LO có một mã số NMLS duy nhất theo suốt sự nghiệp — coi như "số CMND nghề nghiệp", dùng để tra cứu và chống trùng hồ sơ |
| **NMLS Consumer Access** | Trang tra cứu công khai, miễn phí của NMLS: xem được lịch sử giấy phép + nơi từng làm việc, nhưng **không có doanh số** |
| **Sponsorship transfer** | Thủ tục chuyển "bảo trợ giấy phép" trên NMLS từ công ty cũ sang LF. LO chỉ được hành nghề dưới công ty đang bảo trợ mình → chưa xong bước này thì chưa làm việc được |
| **Modex / Modex Score** | Nền tảng dữ liệu ngành mortgage mà LF đang trả phí (1,6 triệu hồ sơ LO). Modex Score = điểm 0–100 do Modex chấm, tóm tắt mức "đáng tuyển" của một LO |
| **Lead** | Một đầu mối ứng viên tiềm năng — mới chỉ là cái tên + thông tin liên hệ, chưa chắc đã quan tâm |
| **Record / hồ sơ** | Lead sau khi được lưu thành hồ sơ trong hệ thống |
| **Pipeline (phễu)** | Chuỗi các chặng từ "mới biết tên" đến "vào làm chính thức". Càng về sau càng rơi rụng bớt người → hình cái phễu |
| **Stage (chặng)** | Một bước trong phễu — doc này có 8 chặng, đánh số S0 → S7 |
| **Nurture (nuôi)** | Ứng viên bảo "3 tháng nữa hãy gọi lại" → hồ sơ chuyển sang chế độ nuôi, hẹn ngày đánh thức (wake-date); đúng ngày đó việc tự nổi lên lại, không cần ai nhớ |
| **Offer / comp band** | Offer = thư mời làm việc kèm gói đãi ngộ. Comp band = **khung đãi ngộ theo hạng năng suất** — LO doanh số cao được chào khung cao hơn; chào "ngoài khung" phải có sếp duyệt |
| **Onboarding** | Giai đoạn "nhập môn" sau khi ký: giấy tờ, tạo tài khoản, chuyển giấy phép, training — đến khi LO làm việc được thật |
| **LOS / CRM** | LOS = phần mềm xử lý hồ sơ vay LO dùng hằng ngày. CRM = phần mềm quản lý quan hệ khách hàng. (Nhắc đến ở bước tạo tài khoản cho người mới) |
| **Retention / check-in 30-60-90** | Retention = giữ chân người mới. Check-in 30/60/90 = lịch hỏi thăm sau 30, 60, 90 ngày làm việc — vì mất một LO mới tuyển đắt hơn nhiều so với tuyển thêm |

### Từ trong cách app vận hành

| Từ | Nghĩa đời thường |
|---|---|
| **Intake** | "Cửa tiếp nhận" — nơi mọi lead từ mọi nguồn đổ vào hệ thống |
| **Identity resolution / dedup (chống trùng)** | Máy tự nhận ra "người này đã có hồ sơ rồi" bằng cách so lần lượt NMLS → email → số điện thoại, để không bao giờ có 2 hồ sơ cho 1 người |
| **Owner / claim** | Owner = recruiter chịu trách nhiệm chính hồ sơ đó. Claim = tự nhận một hồ sơ từ hàng chờ về tay mình |
| **Auto-assign / round-robin** | Máy tự chia lead cho recruiter theo luật định sẵn (theo bang, theo nguồn) hoặc xoay vòng đều tay (round-robin) |
| **First touch** | Lần liên hệ ĐẦU TIÊN với ứng viên (cuộc gọi/tin nhắn/email đầu) — chậm quá là nguội |
| **SLA** | Cam kết thời hạn xử lý, vd "lead mới phải được liên hệ trong 24 giờ". Quá hạn → hệ thống tự nhắc người làm và báo lên quản lý (**escalate** = đẩy lên cấp trên) |
| **Gate (chốt chặn)** | Điều kiện bắt buộc mới được qua chặng sau. Vd: chưa có số liệu xác minh → nút tạo offer bị khoá |
| **Verification Card (thẻ xác minh)** | Khối thông tin trên hồ sơ LO hiển thị số liệu đã xác minh: doanh số 12 tháng, số khoản vay, số năm giữ license, nơi đang làm... kèm ghi chú "số này lấy từ đâu, lúc nào" |
| **Zero-click** | "Không cần bấm gì" — dữ liệu tự chảy về hồ sơ TRƯỚC khi người dùng cần đến, thay vì phải bấm nút tra cứu |
| **Today view** | Màn hình "việc của tôi hôm nay" — thứ đầu tiên hiện ra khi mở app, gom mọi việc đến hạn của đúng người đó |
| **Queue (hàng chờ)** | Danh sách việc/hồ sơ đang chờ ai đó nhận xử lý — vd queue "Unassigned" = các lead chưa có người phụ trách |
| **Timeline** | Dòng thời gian trên mỗi hồ sơ: ghi lại mọi hoạt động theo thứ tự (ai gọi, ai note, chuyển chặng lúc nào) — mở ra là thấy toàn bộ lịch sử |
| **Snapshot** | "Ảnh chụp" số liệu tại một thời điểm, lưu cứng vào hồ sơ — để 6 tháng sau vẫn trả lời được "lúc duyệt offer, số liệu là bao nhiêu", dù data gốc đã thay đổi |
| **Do-not-contact / reason code** | Do-not-contact = danh sách "không được liên hệ nữa" (người đã từ chối hẳn). Reason code = lý do chọn từ danh sách chuẩn thay vì gõ tự do — để sau này thống kê được "vì sao mất ứng viên" |
| **E-sign** | Ký hợp đồng điện tử qua mạng (kiểu DocuSign) — hệ thống biết được thư đã gửi / đã mở xem / đã ký |
| **Attribution (ghi công)** | Ghi vĩnh viễn vào hồ sơ: "ứng viên này đến từ nguồn nào, ai tuyển" — nền tảng để tính hiệu quả từng nguồn, từng người |
| **RBAC (phân quyền theo vai trò)** | Quyền đi theo VAI TRÒ (Recruiter được gì, HR được gì...) thay vì cấp lẻ tẻ cho từng người — hệ thống cũ cấp lẻ tẻ nên mỗi người một kiểu quyền, không ai kiểm soát nổi |
| **403** | Mã lỗi chuẩn nghĩa là "bạn không có quyền xem trang này". App mới sẽ NÓI THẲNG như vậy, thay vì âm thầm đá người dùng sang trang khác không một lời giải thích (silent-redirect) như hiện tại |

### Từ kỹ thuật & tích hợp

| Từ | Nghĩa đời thường |
|---|---|
| **Webhook** | Cơ chế "bên kia TỰ ĐẨY dữ liệu sang mình khi có cái mới" — Modex chủ động gửi dữ liệu về máy chủ Tera+ mỗi khi list thay đổi hoặc có data tháng mới; mình không phải đi hỏi từng lần |
| **Payload** | "Gói hàng dữ liệu" trong mỗi lần đẩy — chứa doanh số, giấy phép, điểm số... của LO |
| **Synced list** | Danh sách LO bên Modex được đánh dấu "đồng bộ" — ai nằm trong list này thì dữ liệu tự chảy về Tera+ |
| **Upsert** | Thao tác máy "có hồ sơ rồi thì cập nhật, chưa có thì tạo mới" — gộp 2 việc làm 1, không sinh trùng |
| **Diff** | So sánh bản dữ liệu mới với bản cũ để tìm ra CÁI GÌ VỪA THAY ĐỔI (vd: LO này vừa đổi công ty) |
| **Signal** | Tín hiệu hệ thống bắn ra từ kết quả diff, kèm gợi ý hành động ("LO X vừa đổi công ty → nên gọi lại") |
| **CSV / bulk** | CSV = file bảng tính dạng đơn giản (xuất từ Excel) để import danh sách. Bulk = làm hàng loạt |
| **Health-check** | Kiểm tra định kỳ "kết nối này còn sống không" (Zoom Phone, Calendly, Modex...) — để biết hỏng TRƯỚC khi người dùng bấm vào và vỡ trận |

### Từ đo lường

| Từ | Nghĩa đời thường |
|---|---|
| **KPI** | Chỉ số đo hiệu quả công việc |
| **Conversion (tỉ lệ chuyển đổi)** | Mỗi chặng phễu giữ lại được bao nhiêu % — vd 100 lead → 20 nói chuyện → 5 offer → 3 ký |
| **Time-in-stage** | Hồ sơ nằm ở một chặng bao lâu — chỗ nào lâu bất thường là chỗ tắc |
| **Source ROI** | Nguồn nào đáng đồng tiền: chi cho nguồn đó bao nhiêu, ra được mấy LO vào làm thật |
| **Funnel analytics (phân tích phễu)** | Gộp các số trên lại thành bức tranh: rơi rụng ở đâu, tắc ở ai, nguồn nào tốt |

---

## 0. Bức tranh một trang

```
6 nguồn lead ──▶ [S0 Intake+Dedup] ──▶ [S1 New] ──▶ [S2 Contacted] ──▶ [S3 Engaged]
                     (tự động)          Recruiter      Recruiter         Recruiter
                                                                     NMLS bắt buộc ▼
[S7 Active] ◀── [S6 Onboarding] ◀── [S5 Offer] ◀── [S4 Verified] ◀── Modex tự đổ data
 Payout+90d      4 phòng ban         HR + e-sign     gate trước offer   (zero-click)
                 song song
                        ┌──────────────────────────────┐
     nhánh phụ:         │ Nurture (wake-date = task)    │◀── từ S2/S3 khi "not now"
                        │ Do-not-contact (reason code)  │
                        └──────────────────────────────┘
```

**Một phễu duy nhất.** Không còn RLO Company / ILO Company / tab Modex tách rời — mọi nguồn đổ vào một pipeline, phân biệt bằng field `source`, không phải bằng màn hình riêng.

---

## 1. Sáu nguồn vào — Stage 0: Intake & Identity (hệ thống tự làm, không ai phải trực)

| Nguồn | Cách vào | Data có sẵn lúc vào |
|---|---|---|
| **Modex synced list** (list prospecting team nuôi bên Modex: "TMC - Brayan list", "newly licensed LOs"…) | Webhook JSON tự đổ về endpoint Tera+ gần-real-time + refresh hàng tháng | **Đầy đủ nhất**: NMLS, Modex Score, volume/units 12m, employment, licenses, contact (nếu đã unlock) |
| Self-apply (form careers trên loanfactory.com) | API tạo lead ngay khi submit | Tự khai: tên, email, phone, NMLS (nếu điền), state |
| Facebook Lead Ads | Connector, tạo lead theo campaign | Tên, contact, campaign id |
| Referral từ LO hiện hữu | Form referral trong app LO | Tên, contact + **referrer_id** (để trả thưởng sau này) |
| Webinar / event | Import từ danh sách đăng ký | Tên, email, event tag |
| CSV import | Upload → chạy job → **báo cáo matched / unmatched / ambiguous** trả về người upload (không còn job im lặng 10 phút) | Tuỳ file |

**Hệ thống tự chạy khi một lead vào (bất kể nguồn):**

1. **Identity resolution (chống trùng người)** theo thứ tự khoá: `NMLS → email → phone` — so mã NMLS trước, không có thì so email, rồi tới số điện thoại.
   - Trùng record đang active → KHÔNG tạo mới; gắn activity "xuất hiện lại từ nguồn X" vào record cũ + notify owner.
   - Giống nhưng không chắc (tên giống, thiếu khoá) → cờ **Review Similar**, nằm ở queue riêng cho recruiter xử tay.
   - Mới hoàn toàn → tạo record, `source` + `entered_at` ghi vĩnh viễn (phục vụ funnel analytics).
2. **Nếu có NMLS** → tự thêm vào synced Modex list → payload production đổ về trong vài phút → record giàu data **trước khi có người mở nó ra**.
3. Đổ vào queue **Unassigned** của Stage 1.

> Giải pain: dedup 6 nguồn (P2-18), job ngầm không báo kết quả, tab Modex silo.

---

## 2. Hành trình của Roger Kube qua 8 stage

### S1 — New (chưa ai nhận) · SLA: có người nhận trong 4h làm việc, first touch trong 24h

| | |
|---|---|
| **Vào stage khi** | Intake xong, không trùng ai |
| **Ai làm** | Recruiter (Inside: Brayan — high volume; Outside: Seth — lead từ quan hệ cá nhân/event) |
| **Làm gì** | Lead tự chia theo rule (territory / source / round-robin) HOẶC recruiter tự claim từ queue Unassigned. Roger vào từ "TMC - Brayan list" → auto-assign Brayan. |
| **Hệ thống tự làm** | Đếm SLA. Quá 4h chưa ai nhận → nổi đỏ trên Today view của Manager. |
| **Trên màn hình** | Card gọn: tên, source, state, **production snapshot nếu là Modex lead** ($103.85M / 138 units / Score 100 — Brayan biết ngay đây là cá lớn TRƯỚC khi bấm gì) |
| **Thoát stage khi** | Có owner + có next-step task đầu tiên |

### S2 — Contacted (đang chào một chiều) · SLA: không được để record không có next task

| | |
|---|---|
| **Ai làm** | Recruiter (owner) |
| **Làm gì** | Chạy outreach (chào mời chủ động): **click-to-call** — bấm vào số trong app là gọi luôn qua Zoom Phone (kết nối được health-check định kỳ, không còn kiểu bấm gọi mới biết hỏng), SMS, email theo mẫu. Mỗi lần kết thúc một lượt liên hệ, hệ thống **bắt buộc chọn bước kế tiếp**: gọi lại ngày N / chuyển Engaged / Not-now (nuôi) / Do-not-contact (ngừng liên hệ). |
| **Hệ thống tự làm** | Log mọi activity vào timeline record (ai, kênh, lúc nào, note). Record không có next task = lỗi dữ liệu, nổi lên Today view. |
| **Nhánh ra** | – LO trả lời & quan tâm → **S3 Engaged**. <br>– "Đang bận, 3 tháng nữa" → **Nurture**: đặt wake-date; ĐÚNG ngày đó việc nổi lên Today view như một task (không phải ẩn record đi như follow-up flag cũ). <br>– Từ chối hẳn / yêu cầu ngừng liên hệ → **Do-not-contact** + reason code (bắt buộc chọn, phục vụ phân tích). |

> Giải pain: P1-5 (không có "việc hôm nay"), follow-up = snooze-ẩn, Zoom Phone mapping hỏng ngầm.

### S3 — Engaged (hai chiều, qualify) · Gate ra: NMLS bắt buộc

| | |
|---|---|
| **Ai làm** | Recruiter + ứng viên |
| **Làm gì** | Trao đổi thật: nhu cầu, state đang làm, lý do muốn đổi. Đặt meeting với branch manager qua **Calendly nhúng trong app** (không rời màn hình). Nhập **NMLS** vào record — validate định dạng + check trùng ngay lúc gõ. |
| **Hệ thống tự làm** | Nhập NMLS xong → tự thêm vào synced Modex list → **vài phút sau Verification Card tự đầy**: volume/units 12m, avg loan, mix purchase/refi, số năm license, employer hiện tại + tenure, Modex Score, badge nguồn + thời điểm ("Modex · as of 31/07/2026"). Đây là **zero-click**: Brayan không copy/paste NMLS đi đâu cả. |
| **Nếu Modex không match** | Task "verify thủ công" + link NMLS Consumer Access (miễn phí, có license/employment nhưng không có volume) — record đánh dấu `verified_source=NMLS_CA`, độ tin thấp hơn. |
| **Thoát stage khi** | NMLS đã nhập (bắt buộc) + meeting note đầu tiên đã log |

> Giải pain: P0-17 — quy trình 6 bước copy/paste NMLS ra modex.com **biến mất hoàn toàn**. Data đến trước khi người cần nó.

### S4 — Verified / Evaluation (gate trước offer) · Đây là chốt chặn quan trọng nhất

| | |
|---|---|
| **Ai làm** | Recruiter đề xuất, Manager duyệt |
| **Điều kiện vào việc** | Verification Card **fresh** (≤90 ngày). Cũ hơn → nút "Re-verify" (đẩy lại vào list, chờ payload mới). |
| **Làm gì** | Hệ thống hiện **gợi ý khung đãi ngộ (comp band) theo hạng năng suất**: Mới có license / dưới 10 khoản vay/năm / 10–50 / trên 50 / siêu sao (high producer). Roger thuộc hạng siêu sao. Brayan chọn gói đề xuất trong khung (muốn chào vượt khung — phải ghi lý do) → gửi Manager. Victoria duyệt **ngay trong app**: nhìn thấy đề xuất + đúng số liệu làm căn cứ trên cùng một màn hình, không phải mở chỗ khác đối chiếu. |
| **Audit ghi lại** | Ai verify, số liệu nào (snapshot đóng băng tại thời điểm duyệt), ai duyệt, lúc nào — trả lời được câu "offer này dựa trên cái gì" sau 6 tháng. |
| **Gate cứng** | Không có verified data → **không tạo được offer**. Manager được override nhưng phải nhập lý do, log vĩnh viễn. |

> Giải pain: P0-17 (quyết định tiền dựa trên data ngoài hệ thống, không ai kiểm chứng lại được).

### S5 — Offer (HR vào việc) · SLA: offer gửi trong 2 ngày từ khi duyệt; nhắc sau 3 ngày im lặng

| | |
|---|---|
| **Ai làm** | HR (Dave) — nhận task **tự động** khi deal chuyển stage, không cần ai nhắn Slack |
| **Làm gì** | Sinh offer letter từ template + comp package đã duyệt (không gõ lại số — số chảy từ S4 sang). Gửi **e-sign**. |
| **Hệ thống tự làm** | Track trạng thái: sent → viewed → signed / declined. Ứng viên xem mà không ký sau 3 ngày → task nhắc cho Brayan (recruiter chăm quan hệ, không phải HR). |
| **Nhánh ra** | – Signed → **S6**, tự sinh bộ checklist onboarding. <br>– Declined + lý do → về Nurture (wake 6 tháng) hoặc Closed-lost, reason code bắt buộc. |

### S6 — Onboarding (4 phòng ban chạy SONG SONG trên một checklist)

Ký xong, hệ thống sinh checklist chia theo role — mỗi người thấy phần việc của mình trong Today view của chính họ, không ai phải hỏi "tới lượt tôi chưa":

| Role | Việc | Phụ thuộc |
|---|---|---|
| **Licensing (Dung)** | NMLS sponsorship transfer; kiểm tra state licenses khớp state sẽ làm việc; theo dõi trạng thái transfer trên NMLS | Chặn các việc "go-live"; các role khác vẫn chạy song song phần của mình |
| **HR (Dave)** | I-9 (xác nhận quyền làm việc tại Mỹ — bắt buộc theo luật lao động), background check (xác minh lý lịch), hồ sơ nhân sự, chốt ngày bắt đầu | — |
| **Onboard Specialist (Miley)** | Tạo account (email, LOS, CRM, phone), thiết bị, lịch training tuần đầu | Sau khi HR xác nhận ngày bắt đầu |
| **Accounting (Rosaline)** | Cài đặt gói hoa hồng (đúng gói đã ký ở S5 — số tự chảy sang, không gõ lại), payroll (bảng lương), W-9 (khai thuế) + direct deposit (đăng ký nhận lương qua tài khoản ngân hàng) | Sau khi HR có hồ sơ |

**Hệ thống tự làm:** progress % trên record (Roger: 7/12 việc xong); việc bị chặn hiện rõ *"chờ: NMLS transfer — Licensing"*; SLA từng task; task quá hạn nổi lên Today view của đúng người + Manager.

**Thoát stage khi:** checklist 100% + Licensing xác nhận sponsorship active.

> Giải pain: onboarding hiện tại là chuỗi bàn giao mù (không ai biết đang tắc ở đâu, ở ai).

### S7 — Onboarded / Active (kết thúc recruiting, bắt đầu vòng đời LO)

1. Record chuyển trạng thái **Active LO**, bàn giao sang hệ thống production/org của Tera+.
2. **Attribution đóng băng vĩnh viễn**: source + recruiter + toàn bộ timeline → nuôi funnel analytics (nguồn nào ra LO thật, mất bao lâu, ai recruit giỏi).
3. **Nếu source = Referral** → tự tạo **payout request** sang queue của Accounting: người giới thiệu, LO mới, mốc điều kiện (vd: sau 30 ngày active / N loans đầu), trạng thái theo dõi được — thay cron thứ Bảy chạy ngầm không ai thấy.
4. **Retention check-in 30/60/90 ngày**: task tự sinh cho recruiter — "Roger tháng đầu thế nào?" (giữ người đắt gấp nhiều lần tuyển mới).

### Nhánh Nurture & vòng tái sinh (leads không bao giờ "chết im")

- Record Nurture có **wake-date = task thật**: đúng ngày nổi lên Today view, kèm nguyên timeline cũ.
- **Modex monthly refresh làm việc hộ recruiter**: mỗi tháng payload mới về, hệ thống diff và bắn signal — *"LO X trong nurture vừa ĐỔI CÔNG TY"*, *"volume LO Y tăng 40%"* → task re-engage tự sinh. Nurture list tự canh mình, không cần ai nhớ.
- **Do-not-contact** được tôn trọng tuyệt đối ở intake: nguồn nào đưa người này vào lại cũng bị chặn, khỏi outreach nhầm.

---

## 3. Một ngày làm việc của từng phòng ban (Today view — màn hình mặc định khi mở app)

| Role · 9:00 sáng | Thấy gì trên Today view |
|---|---|
| **Inside Recruiter (Brayan)** | ① 3 lead mới auto-assign chưa first-touch (SLA 24h đếm ngược) · ② 5 call-back đến hạn hôm nay · ③ 2 nurture wake hôm nay · ④ 1 signal "LO trong nurture vừa đổi công ty" · ⑤ 1 offer viewed-chưa-ký ngày thứ 3 |
| **Outside Recruiter (Seth)** | Như trên nhưng lead từ nguồn referral/event của mình; thêm danh sách meeting Calendly hôm nay |
| **Recruiting Manager (Victoria)** | ① 2 đề xuất offer chờ duyệt (kèm verification card ngay cạnh) · ② Lead unassigned quá 4h · ③ Task onboarding quá SLA ở phòng nào · ④ Funnel tuần này: intake → engaged → offer → signed theo source |
| **HR (Dave)** | ① 1 offer cần soạn (Roger — package đã duyệt đính kèm) · ② 2 bộ hồ sơ onboarding đang chờ ứng viên nộp giấy tờ |
| **Licensing (Dung)** | ① 2 NMLS transfer đang pending (kèm số ngày đã chờ) · ② 1 LO mới cần kiểm license state |
| **Onboard Specialist (Miley)** | ① Checklist Roger: 3 việc đến hạn hôm nay (accounts, thiết bị) · ② Lịch training tuần |
| **Accounting (Rosaline)** | ① 1 comp plan cần setup (số chảy sẵn từ offer đã ký) · ② 2 referral payout đến mốc điều kiện, chờ chi |

**Nguyên tắc:** không ai phải "đi tuần" qua các bảng mega-column để tìm việc — việc tự tìm đến người, bảng chỉ để tra cứu.

---

## 4. RBAC theo tác vụ (thay per-user grant drift hiện tại — P1-10)

| Tác vụ | Inside/Outside Recruiter | Manager | HR | Licensing | Onboard | Accounting |
|---|---|---|---|---|---|---|
| Xem pipeline + record | ✅ (book của mình + team) | ✅ tất cả | ✅ từ S5 | ✅ từ S6 | ✅ từ S6 | ✅ từ S6 |
| Tạo/sửa lead, outreach, nurture | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Re-verify Modex | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Duyệt offer / override gate | ❌ | ✅ (override phải ghi lý do) | ❌ | ❌ | ❌ | ❌ |
| Soạn & gửi offer, e-sign | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Task onboarding của role mình | ❌ | ✅ xem | ✅ | ✅ | ✅ | ✅ |
| Chi referral payout | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete record / bulk action | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Config (stages, SLA, comp bands, integrations) | ❌ | ✅ (admin) | ❌ | ❌ | ❌ | ❌ |

- Không truy cập → **403 nói thẳng**, không silent-redirect.
- Grant cá nhân ngoài role = ngoại lệ **có thời hạn + audit**, không phải cơ chế phân quyền chính.

---

## 5. Bảng sự kiện tự động (system events)

| Sự kiện | Hệ thống làm gì |
|---|---|
| Lead mới vào (mọi nguồn) | Identity resolution → tạo/merge/Review-Similar → auto-assign → SLA start |
| NMLS được nhập | Validate → add vào synced Modex list → chờ webhook |
| Webhook Modex về | Upsert verification card + badge "as of" + notify owner nếu record đang mở S3/S4 |
| Modex monthly refresh | Diff toàn bộ → signals (đổi công ty / volume thay đổi lớn) → task re-engage |
| Verification > 90 ngày mà record ở S4 | Badge chuyển vàng, chặn tạo offer, gợi ý re-verify |
| Offer signed | Chuyển S6, sinh checklist 4 role, notify từng người |
| Task quá SLA | Nổi Today view người đó + Manager; escalate sau 2 ngày |
| Onboarding 100% | Chuyển S7, đóng băng attribution, sinh payout request (nếu referral), sinh check-in 30/60/90 |
| Job nền bất kỳ (CSV import, bulk enrich) | Chạy xong PHẢI báo kết quả: thành công/thất bại/bao nhiêu record, cho người bấm nút |

---

## 6. KPI hệ thống tự đo được nhờ flow này (hiện tại không đo được)

- Conversion từng stage + time-in-stage (tắc ở đâu, ai tắc).
- Source ROI: nguồn nào (Modex list / FB Ads / referral / self-apply) ra LO onboarded thật, chi phí trên mỗi hire.
- First-touch SLA hit-rate theo recruiter.
- Offer accept-rate theo comp band (band nào chào trượt nhiều → chỉnh).
- Onboarding lead-time theo phòng ban (Licensing transfer trung bình mấy ngày).
- Retention 90 ngày của LO mới theo recruiter/nguồn.

---

## 7. Điều kiện tiên quyết & câu hỏi còn mở

1. **4 câu hỏi hợp đồng Modex** (đã nằm trong email draft cho Victoria): kích hoạt lại connection, sync limit/tháng, quota credit contact, giá seat. **Sync limit quyết định S0**: limit hẹp → chỉ auto-enrich record vào pipeline; limit rộng → enrich cả kho.
2. **Thêm LO vào Modex list bằng máy được không** (API/CSV import tự động) — quyết định zero-click tự động hoàn toàn hay cần 1 người curate list định kỳ.
3. E-sign dùng gì (DocuSign / có sẵn trong hệ sinh thái Tera+?).
4. Comp band tiers do ai định nghĩa và duyệt thay đổi (đề xuất: Manager + Accounting).
5. Trainings của Benjamin gắn vào S6 (milestone trong checklist) hay module riêng — câu hỏi mở #5 của doc direction, chưa chốt.

---

## 8. Phụ lục — Business rules kế thừa từ hệ thống cũ

> **Nguồn:** spec reverse-engineering code hệ thống hiện tại (`lo-recruiting-referrals-spec.docx`, đọc 03/08/2026 — entity LORecruiting/LORecruiter, các view GWT, server ops, cron). Đây là những luật nghiệp vụ đang **chôn trong code**, không có tài liệu — liệt kê ra để app mới hoặc GIỮ NGUYÊN, hoặc QUYẾT ĐỊNH LẠI một cách có ý thức, chứ không được để rơi mất trong lúc rebuild.

### 8.1 Trạng thái & chốt chặn (map vào S4–S7)

| Luật trong hệ thống cũ | Áp vào flow mới | Giữ / xét lại |
|---|---|---|
| Muốn `joined` phải **đã đóng startup fee + đã ký agreement** (chặn cả client lẫn server) | Gate S6→S7 | **GIỮ** |
| Tự chuyển `joined` khi đủ 3 điều kiện: NMLS `sponsored` + HR `completed` + onboarding meeting `setup_done` | Checklist S6 đạt 100% → tự chuyển S7 | **GIỮ** (dạng checklist tường minh) |
| Đóng fee HOẶC ký agreement HOẶC được cấp NMLS access → tự nhảy status `interviewed_and_accepted` | Tương đương vào S5/S6 | **XÉT LẠI** — flow mới dùng chuyển stage tường minh, không auto-flip ngầm khiến người dùng không hiểu vì sao status đổi |
| Từ chối (denied) **bắt buộc chọn lý do** (+ mô tả chi tiết nếu chọn "Other"), lưu thành note | Reason code ở S2/S5 | **GIỮ** |

### 8.2 Luật licensing theo bang (gate S4/S6 — lý do kiến trúc phải nằm trên Tera+)

| Bang | Luật |
|---|---|
| SC / WI / WY | Phải có **Corporate branch** có license bang đó trong bán kính lái xe: SC = 75 dặm, WI = 100, WY = 100 |
| NE / RI | Phải có Corporate branch **trong bang của ứng viên** có license bang sponsor |
| NJ | Chỉ hợp lệ trong **2.5 giờ lái xe** từ branch có license NJ |
| GA / MT / OH / OR / PA | Bắt buộc bước xác nhận sponsorship |
| SC / AR / NE | Bắt buộc field confirm_sponsorship |
| CA / IN | Luật DRE (CA) / SOS (IN): chưa có endorsement → tự set loại hình "corporate loan officer" |

→ **GIỮ NGUYÊN toàn bộ** — và vì các luật này cần đọc dữ liệu branch/licensing của công ty, đây chính là lý do #2 của quyết định "module trên Tera+".

### 8.3 Chống trùng & an toàn (map vào S0 + mọi lần sửa record)

| Luật | Áp vào flow mới | Giữ / xét lại |
|---|---|---|
| Guard "Duplicated NMLS" — NMLS đã tồn tại ở record khác thì chặn lưu | Identity resolution S0 | **GIỮ**, nâng cấp: thay vì chặn cứng thì đề nghị merge / cờ Review Similar |
| Check **blacklist** theo email/phone/NMLS khi tạo và khi đổi email/NMLS | S0 + mọi lần sửa | **GIỮ** |
| Check **rehire**: trùng nhân sự cũ có cờ "not eligible for rehire" → gắn nhãn cảnh báo | Badge cảnh báo từ S1 | **GIỮ** |
| LO nhắn **"STOP"/"Unsubscribe"** → tự archive record + note audit | Map vào Do-not-contact, chặn ở intake mọi nguồn | **GIỮ NGUYÊN — BẮT BUỘC** (tuân thủ TCPA, luật chống làm phiền qua điện thoại/tin nhắn ở Mỹ) |

### 8.4 Referral & bonus (spec chi tiết cho payout ở S7)

Đây là phần trước giờ mù mờ nhất ("cron thứ Bảy"), giờ đã rõ luật:

- **Thời điểm chín:** bonus chỉ được xét sau **60 ngày** kể từ ngày LO được giới thiệu chính thức join.
- **Chuỗi điều kiện 2 phía:** LO được giới thiệu phải *eligible + còn active + mức cash bonus > 0*; **người giới thiệu** phải *còn active + đạt chuẩn referral_qualified*. Trượt điều kiện nào → đánh dấu "không đủ điều kiện" kèm lý do (vd REFERRER_NOT_QUALIFIED), không âm thầm bỏ qua.
- **Chống chi trùng (idempotency):** cờ `requested_last_12_months_refer_bonus` — cron chạy lại không tạo bonus lần hai.
- **Hai hình thức thưởng:** Cash = hệ thống tự tạo phiếu chi (Check, trạng thái Requested) cho Accounting xử lý; RSU = bật tay, **chỉ người có quyền HR** được bật.
- **Cấu hình:** các mức bonus là bảng cấu hình được, luôn có **đúng 1 chương trình default**.
- **Phân loại nguồn 2 tầng** (section → source): Word of Mouth / Search & AI / Social Media / Events & Job Boards / Direct Invite / Other — kèm mapping các giá trị cũ (job_posting, postcard...) để data lịch sử không gãy.
- **Referrer nội bộ vs bên ngoài:** nội bộ nhận diện qua company email của nhân viên đang active; bên ngoài lưu thông tin Zelle để chuyển tiền; bonus mặc định = cash khi nguồn không phải LO nội bộ.

→ **GIỮ toàn bộ logic**, đổi cách chạy: thay cron ẩn thứ Bảy bằng **payout request có trạng thái nhìn thấy được** trong queue của Accounting (S7), có thể trace từng bước.

### 8.5 Mapping field Modex → record (tái dùng cho webhook mapper mới)

Hệ thống cũ đã có sẵn bảng map khi merge data Modex (hàm `setLOData`) — dùng lại làm khởi điểm cho mapper của webhook payload:

`work_email→email · nmls_id→nmls · company_name→company_name · company_nmls_id→company_nmls · mobile_phone→phone · office_phone→office_phone · socials (facebook/linkedin/twitter/zillow) · performance_12_months_count→closed_loan_past_12_months · performance_12_months_sum→total_volume_past_12_months · transaction history (chỉ lấy dòng count>0 & sum>0)`

Kèm cờ `is_synced_modex=true` trên record — flow mới thay bằng badge "Modex · as of {ngày}".

### 8.6 Root-cause đã xác nhận từ code

- Pain "stats panel lệch ~8 ngày" (đo được trên staging + production): spec chỉ ra statistic op **cache TTL = 691.200 giây = đúng 8 ngày**. Không phải cảm giác — là hằng số trong code. Flow mới: số liệu tính theo sự kiện (event-driven), không cache dài hạn.

### 8.7 Anti-patterns KHÔNG mang theo

1. **God-entity**: một entity LORecruiting gánh cả 2 flow (Interested + Recruited) bằng field phân loại `recruiting_type` + hàng chục mixin — app mới tách model theo domain.
2. Job nền chạy im lặng không báo kết quả (import, merge, update Modex).
3. Bug đã ghi nhận trong spec: import ILO **luôn báo "0 record"** dù tạo thành công (biến đếm truyền by-value) — minh chứng cho việc job im lặng + không ai test kết quả trả về.
4. Nút Export bị **comment-out trong code** nhưng server op vẫn sống — chức năng "có mà không có", gây hiểu lầm về năng lực hệ thống.
5. Status tự nhảy ngầm ở nhiều chỗ (beforeSave) khiến người dùng không giải thích được vì sao record đổi trạng thái — flow mới: mọi chuyển stage đều có actor hoặc rule hiển thị trong timeline.

---

## 9. Ghi chú brainstorm 04/08/2026 (Q&A với Bao sau khi xem mockup)

Định hướng chung từ anh Thuận (CEO): **tinh gọn action, giúp user/team tương tác dễ, kết hợp AI để làm việc hiệu quả** — mọi quyết định thiết kế dưới đây đều bám tiêu chí này.

### 9.1. Nguồn dữ liệu và tiêu chí "lead sắp trễ hạn"

- Dữ liệu nằm ngay trong app, không lấy từ ngoài: mỗi lead khi được tạo (từ 6 nguồn intake §1) ghi `created_at` và deadline liên hệ lần đầu = `created_at` + SLA (tính theo **giờ làm việc**, không đếm đêm/cuối tuần — lịch làm việc cũng là config).
- "Đã liên hệ" xác định bằng **activity log**: Call/SMS/Email bấm trong app đều đi qua service (Zoom/mail) nên có bản ghi thật — không dựa vào recruiter tự khai. Hệ thống cũ đã có op đếm call/text theo lead (`CountCallAndTextForLeadOp`, `ScheduleToCountZoomCallAndTextForLORecruitingOp`) — khái niệm không mới, chỉ chưa được dùng để enforce SLA.
- "Sắp trễ" = chưa có first touch VÀ thời gian còn lại < ngưỡng cảnh báo (mặc định đề xuất: còn <25% thời lượng hoặc <1h). "Trễ" = quá deadline → escalation (notify manager, hoặc trả lead về pool chung).

### 9.2. SLA phải configurable (yêu cầu Bao 04/08) — KHÔNG hardcode 4h

Theo mô hình **SLA policy** của Zendesk/Salesforce/HubSpot, mỗi policy gồm:

| Thành phần | Ví dụ |
|---|---|
| Điều kiện áp dụng | nguồn lead = Modex List, team = Recruiting-West, stage = S1 |
| Target | first touch ≤ 4h; follow-up ≤ 24h |
| Lịch giờ làm việc | Mon–Fri 8am–6pm CT (calendar riêng, tái sử dụng) |
| Ngưỡng cảnh báo | còn 25% thời lượng |
| Hành động khi vi phạm | notify manager / reassign về pool |

Lưu trong DB + admin UI chỉnh; đổi 4h→2h có hiệu lực cho **lead mới** (lead cũ giữ deadline đã gán — không retro); mọi thay đổi có audit (ai đổi, khi nào). Đây là bảng cấu hình đầu tiên của recruiting-service.

### 9.3. Call/SMS dùng hạ tầng Zoom Phone có sẵn (đã xác minh trong code 04/08)

- Hệ thống cũ KHÔNG gọi Zoom API trực tiếp — nó proxy qua **service Zoom riêng**: `https://zoom.loanfactory.com/api/` (staging `zoom.viet18.com`), auth bằng `X-API-Key` (xem `packs/loan/.../op/zoom/ZoomAPIServlet.java:63`).
- Repo trên org LoanFactory-Inc: **`zoom`** (bản gốc) và **`zoom-go`** (Go rewrite, strangler migration) — cả hai chưa có trong agentflow, cần pull về.
- Capability có sẵn (theo tên op cũ): assign số phone cho user, gửi SMS, list messages, download call recording, đếm call/text theo lead, webhook subscription activated/suspended.
- recruiting-service chỉ cần gọi service này → nút Call/SMS trong mockup khả thi với hạ tầng hiện có. Mở rộng AI: recording → tóm tắt cuộc gọi tự ghi vào timeline.
- Phát hiện kèm: org có repo **`document-esign`** (ứng viên trả lời câu hỏi mở "e-sign vendor" cho bước offer S5 — dùng nội bộ thay vì mua DocuSign) và **`callcenter`** (cần xem có liên quan routing cuộc gọi không).

### 9.4. Pipeline: kanban KHÔNG phải view duy nhất

Best practice các ATS hiện đại (Ashby/Greenhouse/Lever): **cùng một dữ liệu, nhiều view, toggle được, view lưu trong URL**:

1. **Kanban** (đã mockup) — mặc định cho recruiter, chỉ hiện thẻ của mình/team; chết khi 1 cột có hàng trăm thẻ nên phải giới hạn.
2. **Table view** — bắt buộc có song song: filter + sort + bulk action, cho ops/manager làm việc trên khối lượng lớn (dữ liệu cũ 106K record).
3. **Focus mode / next-best-action queue** — hệ thống xếp sẵn hàng đợi ưu tiên, recruiter xử lý từng người, xong tự nhảy người kế (kiểu power-dialer). Khớp nhất với "tinh gọn action" của CEO; ứng viên tốt cho v2.
4. **Funnel view** — cho manager: chỉ số + drill-down, không thao tác.

> Mockup 05/08/2026: cả 3 view (Table / Focus / Funnel) đã dựng tại `docs/mockups/lo-recruiting-views.html` — kanban ở `docs/mockups/lo-recruiting-mockup.html`.

### 9.5. Per-role visibility: cùng hồ sơ, khác ống kính (2 chiều)

- **Row-level** (thấy NHỮNG AI): recruiter = lead mình + team; HR = từ S4–S5 trở đi; Licensing/Accounting = việc S6/S7 của phòng mình; LO giới thiệu = chỉ tiến độ người mình giới thiệu.
- **Field-level** (thấy TRƯỜNG NÀO): số tiền offer/comp chỉ HR + manager; LO giới thiệu KHÔNG BAO GIỜ thấy comp; dữ liệu licensing nhạy cảm chỉ team Licensing.
- Ma trận RBAC §4 hiện mới phủ chiều tác vụ — cần bổ sung chiều field-level khi viết spec chi tiết.

> Mockup 05/08/2026: 6 màn hình theo role (Manager / HR / Licensing / Onboarding / Accounting / Referring LO) tại `docs/mockups/lo-recruiting-roles.html` — mỗi màn có banner "ống kính" ghi rõ role thấy hàng nào, trường nào bị khoá; Recruiter view = mockup 1.

### 9.6. Comp band là ĐỀ XUẤT MỚI, hệ thống cũ không có

Band P1–P4 + ngưỡng trong mockup là placeholder minh hoạ. Hệ thống cũ: recruiter tự tra Modex rồi tự ước offer (chính là pain). Con số thật (bao nhiêu band, ngưỡng volume/units, comp đi kèm) phải do anh Thuận/HR chốt — đã nằm trong danh sách quyết định Nhóm 2. Kỹ thuật chỉ là bảng mapping volume→band, rẻ, có thể ship sau v1 mà không ảnh hưởng kiến trúc.

---
### 9.7. Ghi chú bổ sung 05/08/2026 (sau khi Bao xem mockup views + roles)

**View config (để làm — yêu cầu Bao):** không chốt cứng view mặc định. Cần 2 lớp cấu hình:
1. **Admin đặt default view theo role** (vd Recruiter → Focus, Manager → Funnel) — bảng config, đổi được không cần deploy.
2. **User tự override**: chọn default riêng + đánh dấu favorite views (saved view có tên, kèm bộ lọc). View state nằm trong URL nên share được link.

**Ai thấy Kanban (và mọi pipeline view)?** Nguyên tắc: *view và quyền là hai thứ tách nhau* — 4 view (Kanban/Table/Focus/Funnel) chỉ là 4 cách vẽ, còn **ống kính role (row-level + field-level §9.5) áp dụng cho MỌI view**:

| Role | Mở được Pipeline? | Thấy gì trong đó |
|---|---|---|
| Recruiter | Có — mặc định thẻ của mình | Mọi stage, lead của mình/team |
| Manager | Có — toàn team | Mọi stage, mọi recruiter |
| HR | Có (ít dùng — landing là queue offer) | Kanban chỉ đổ dữ liệu từ S4 trở đi, cột S1–S3 trống |
| Licensing / Onboarding / Accounting | Không cần — landing là queue riêng | (nếu cấp quyền: chỉ S6/S7, comp vẫn khoá) |
| Referring LO | Không bao giờ | Chỉ card tiến độ trong LO portal |

**Benchmark role-based view của các app khác (kiểm chứng mô hình 2 chiều):**

| App | Cách họ làm |
|---|
### 9.8. Tech stack + deploy (đề xuất 05/08/2026 — theo pattern thật của platform, chờ Tai/anh Thuận gật)

**Nguồn sự thật:** quét 149 repo org LoanFactory-Inc (gh CLI) + mổ `deploy/` và `.github/workflows/auto-deploy.yaml` của auth-service, tera-be, account-fe + trao đổi Slack với Tai Pham 05/08 (BE build ở private network k8s, KHÔNG Cloud Run; trong private network service gọi nhau trực tiếp không cần access token).

| Lớp | Chọn | Vì sao |
|---|---|---|
| BE | **Java 21 + Spring Boot** qua Gradle plugin `com.loanfactory.service-conventions` (xuất bản từ tera-core/build-conventions) | 1 dòng plugin = toolchain + Spring Boot + convention chuẩn LF; đội thuần Java; reviewer (Tai) review Java; tera-core cho sẵn auth/search/envelope. Go hợp lệ trong org (ai-hr-be, crm-be-go…) nhưng recruiting là app domain-rich → Java lợi hơn |
| DB | **PostgreSQL + Flyway** migration từ ngày 1 (theo tera-be `db/migration/V0xx__*.sql`) | KHÔNG lặp lại lỗi lfiq-backend (Hibernate auto-DDL, không Flyway → field primitive NPE, schema drift) |
| FE | **Next.js 15 + React 18 + Mantine 8 + Zustand 5 + React Query 5 + TS** — copy skeleton account-fe/tera-fe (2 repo này trùng stack từng version) | Lý do KHÔNG phải SEO: account-fe (portal nội bộ, zero SEO) vẫn dùng Next → chuẩn công ty cho app hệ sinh thái là Next+Mantine. React/Vite SPA (tiền lệ life-of-a-loan) không sai nhưng tạo đảo pattern: tự trả tiền routing/auth-guard/i18n/deploy conventions |
| Deploy | **GKE k8s + Helm chart trong `deploy/` + GitHub Actions `auto-deploy.yaml`** — copy auth-service (BE) / account-fe (FE, folder `helm-chart/`) | Flow chuẩn: push branch `staging` → cluster moso-kube (project lenderrate-master), push `production` → moso-gke (lender-rate); build image → Artifact Registry → helm upgrade với values-sta/values-prod. moso-aid (Cloud Run + nginx tự chế) là NGOẠI LỆ lịch sử, không copy |
| Service-to-service | Trong private network gọi **trực tiếp qua k8s service name, không token** (lời Tai) | S7 gọi user-service, licensing data gọi tera-be — không cần bearer nội bộ. Webhook Modex là traffic TỪ INTERNET → phải vào qua edge/ingress có xác thực (X-API-Key/HMAC + IP allowlist) rồi mới chạm service |
| Tên repo | **recruiting-be / recruiting-fe** — CHỐT bởi Bao 05/08/2026 | Ngắn gọn, theo kiểu ai-hr-be/ai-hr-fe |
| Jobs định kỳ | Đăng ký qua **cron-service-go** (centralized dynamic cron, Postgres SKIP LOCKED) thay vì tự nuôi Quartz | SLA breach check, nurture wake-up, re-verify 90 ngày đều là cron — dùng hạ tầng chung |
| RBAC | **App-owned** (bảng roles/grants trong schema recruiting) — central chỉ là IdP | Đúng pivot đã học từ LOL RBAC + pattern LFIQ; ống kính row/field-level §9.5 nằm trong app |


### 9.9. Bản đồ phụ thuộc Modex + fallback (05/08/2026 — Victoria chưa reply contract)

**Nguyên tắc kiến trúc:** Modex là NGUỒN DỮ LIỆU cắm vào qua webhook + bảng `modex_snapshots`, không phải xương sống. Mọi số liệu xác minh lưu kèm `source` (MODEX | SELF_REPORTED | DOCUMENT | NMLS_CA) + `as_of_date` → gate S4 kiểm tra "có số liệu đủ tươi từ nguồn đủ tin" chứ không kiểm tra "có Modex". Đổi/thêm nhà cung cấp (MMI...) là config, không phải viết lại.

| Feature | Cần Modex? | Không có Modex thì sao |
|---|---|---|
| Pipeline S0–S7, SLA engine, Today view, 4 views | KHÔNG | Chạy bình thường — đây là phần lõi |
| Call/SMS (Zoom), offer + e-sign, onboarding 4 phòng, referral bonus, RBAC | KHÔNG | Chạy bình thường |
| Nurture wake-up theo ngày hẹn | KHÔNG | Chạy bình thường |
| Lead intake từ Modex prospecting list | CÓ (1/6 nguồn) | 5 nguồn còn lại vẫn chạy; thay bằng CSV import |
| Zero-click enrichment (P0-17) | CÓ | Fallback: NMLS Consumer Access (miễn phí — license + nơi làm, KHÔNG có volume) + nhập tay số ứng viên tự khai |
| Verification card / gate S4 | MỘT PHẦN | Gate vẫn hoạt động với source=SELF_REPORTED (khai) hoặc DOCUMENT (W2/paystub HR verify ở bước offer) — card ghi rõ nguồn + độ tin |
| Signals đổi công ty / volume tăng (monthly diff) | CÓ, KHÔNG fallback | Mất hẳn feature này cho tới khi có sync — nurture wake-up theo ngày vẫn còn |
| Comp band suggestion | GIÁN TIẾP | Vẫn gợi ý từ số self-reported, gắn cờ "chưa xác minh" |

**Ảnh hưởng tiến độ:** Track B (schema, scaffold, webhook receiver) KHÔNG bị chặn — webhook viết theo field mapping §8.5 của hệ cũ + payload giả; khi contract xong chỉ là Modex team cấu hình connection trỏ vào URL (họ config, mình không code thêm). Rủi ro thật duy nhất: contract kéo dài nhiều tuần (tài khoản hiện 1 seat/-1, không còn connection active → gần như chắc chắn phải thương lượng lại) → nếu launch trước khi có sync, 3 feature cột "CÓ" chạy chế độ fallback. Khuyến nghị: nudge Victoria trong tuần; nếu cần đòn bẩy giá, dùng quote MMI (benchmark §trước).


### 9.10. Data model v1.1 — chốt sau review 05/08/2026

Review dựa trên bằng chứng đo thật trên production (106.145 dòng tồn kho, 96,8% "Not claimed" là hàng import, 8 dòng trùng cùng tên "Test Test", record "(Duplicated)" dán nhãn mà không gộp, ma trận quyền 2/5/14/15/30/74 công tắc trên 6 người, "100% onboarded" trong khi checklist dở dang). Kết luận: **nhận toàn bộ các bổ sung, với 3 điều chỉnh gọn hoá**.

**8 bổ sung được chốt:**

1. **`candidates.account_id`** (UUID, null tới khi joined) — tham chiếu identity trung tâm sau S7. KHÔNG phải FK cứng (user-service là DB khác) → kèm job đối soát định kỳ chống drift (bài học LOL grant user_id drift: account re-provision là mọi tham chiếu mồ côi). Sự kiện provisioning ghi vào `stage_history`.
2. **Dedup là quy trình, không phải constraint:** NMLS nullable, không unique constraint cứng (production đầy NMLS trống + rác `50000`/`123456`). Cơ chế gộp = `candidates.merged_into_id` + bảng **`candidate_merges`** (survivor, loser, survivorship từng field, ai gộp, lúc nào); khi merge, activities/stage_history dồn về survivor, id cũ redirect. Gate S3 validate NMLS + check trùng cho record NHẬP MỚI; hàng import đi qua pipeline dedup.
3. **Assignment đa vai:** `candidates.owner` = recruiter (claim = hành động set owner từ pool, có ghi vết); **`checklist_items.assignee` + `department`** cho onboarding (act 5: có recruiter nhưng không ai assign onboarding specialist → tàng hình trên board của Miley); `routing_rules` đổ output ra được cả hai trục.
4. **Audit dùng platform `audit-log-service`** (phát hiện 05/08 khi đọc repo: write-once, Pub/Sub → Postgres 16 partitioned + BigQuery archive + digest ký KMS, LIVE staging, tera-be producer đã chạy — recruiting-be copy producer pattern outbox+poller của tera-be, epic tera-be#17). Outbox local đảm bảo độ bền nếu prod rollout audit-svc (#80) chưa xong. Phạm vi audit: sửa offer, đổi comp band, cấp quyền, đổi config, đổi trạng thái bonus — mọi mutation ngoài pipeline.
5. **`sponsorships(candidate_id, state, status, rule_applied, dates...)`** — trạng thái licensing runtime per ứng viên per bang (NY xong mà NJ còn vướng course 2.5h là chuyện bình thường); checklist items licensing sinh theo bang từ `licensing_state_rules`. Board cũ nén thành 1 bit "NMLS sponsored" — đó là một phần pain.
6. **`suppression_list` độc lập**, khớp theo định danh chuẩn hoá (phone E.164 / email lowercase / NMLS), 2 loại ngữ nghĩa: `STOP_SMS` (TCPA — theo KÊNH, bắt buộc pháp lý) và `BLACKLIST` (theo NGƯỜI: reason, blocked_by, rehire_after). Sống bất kể dòng candidate bị xoá/gộp/tạo lại. `candidates` chỉ giữ flag hiển thị tính từ bảng này.
7. **`import_batches`** (nguồn SFTP/S3/CSV/tay, file, số dòng vào/lỗi/trùng, ai chạy) + `candidates.import_batch_id` — 96,8% kho cũ là hàng import tàng hình, và "import count=0 bug" nằm trong danh sách anti-pattern §8.7. `webhook_events` giữ riêng cho Modex webhook.
8. **`stage_requirements`** (bảng config): field nào bắt buộc ở chặng nào — validation sống ở STAGE TRANSITION, không ở record-level. **Mọi profile field trong `candidates` nullable ở tầng DB** (structural: id/created_at/stage/source vẫn NOT NULL). Bài học bức tường 5-field: 106k dòng import thiếu field → không ai sửa nổi một số điện thoại.

**3 chỉnh trong bảng đã có:**
- `offers.fee_status` enum PENDING/PAID/**WAIVED** + `waived_by/waived_at` — Waived là trạng thái hạng nhất (board cũ có `data-name='Waived'`); fee / agreement / sponsorship là các trạng thái ĐỘC LẬP, "joined" = tổng hợp, không phải dropdown chọn tay.
- `candidates.status` (ACTIVE/NURTURE/ARCHIVED/BLOCKED) + `archive_reason` (reason code) — tách khỏi `stage`; hệ cũ có 3 terminal khác ngữ nghĩa (23.995 "Archived – Wrong information" / 6.267 "Block display" / 4.386 "Archived").
- KPI: giữ nguyên tắc **no-cache, đọc thẳng stage_history + activities**; nếu 100k+ dòng làm dashboard chậm → materialized view refresh TƯỜNG MINH, rebuild được từ nguồn, không bao giờ là nguồn sự thật (khác bản chất cache TTL 8 ngày của hệ cũ).

**3 điều chỉnh gọn hoá so với bản review:**
- `duplicate_of` và bảng merge là MỘT cơ chế — chỉ dùng `merged_into_id` + `candidate_merges`, không thêm cột thứ hai.
- `audit_log` tự chế → thay bằng tích hợp audit-log-service (mục 4).
- blacklist / do-not-contact / STOP gộp về MỘT chỗ là `suppression_list` (mục 6) — không rải cờ trên candidates.

---

*Tài liệu cùng bộ:* [lo-recruiting-redesign-direction.md](lo-recruiting-redesign-direction.md) (17 pain points + hướng + quyết định kiến trúc §6) · [lo-recruiting-feature-review.md](lo-recruiting-feature-review.md) (hiện trạng chi tiết + Phụ lục C production)
