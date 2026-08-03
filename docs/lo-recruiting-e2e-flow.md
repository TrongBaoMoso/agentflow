# LO Recruiting trên Tera+ — Flow end-to-end chi tiết

> **Phạm vi:** hành trình hoàn chỉnh của MỘT ứng viên LO từ lúc là một dòng data đến lúc thành LO active — và công việc của TỪNG phòng ban trên hành trình đó.
> **Căn cứ:** 17 pain points trong [lo-recruiting-redesign-direction.md](lo-recruiting-redesign-direction.md) + năng lực tích hợp Modex đã xác minh 31/07/2026 (webhook list-sync) + ma trận role đo thật trên production.
> **Nhân vật minh hoạ:** ứng viên **Roger Kube** (NMLS 107621 — case study thật trong P0-17) và các role thật: Inside Recruiter (Brayan), Outside Recruiter (Seth), HR (Dave), Licensing (Dung), Onboard Specialist (Miley), Accounting (Rosaline), Recruiting Manager (Victoria).

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

1. **Identity resolution** theo thứ tự khoá: `NMLS → email → phone`.
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
| **Làm gì** | Chạy outreach: **click-to-call** (Zoom Phone — có health-check cấu hình, không còn hỏng ngầm), SMS, email template. Mỗi lần kết thúc activity, hệ thống **bắt buộc chọn next step**: gọi lại ngày N / chuyển Engaged / Not-now / Do-not-contact. |
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
| **Làm gì** | Hệ thống hiện **gợi ý comp band theo production tier**: Newly licensed / <10 loans / 10–50 / 50+ / high producer. Roger = high producer tier. Brayan chọn package đề xuất trong band (hoặc ngoài band — phải ghi lý do) → gửi Manager. Victoria duyệt **trong app**: thấy đề xuất + đúng số liệu làm căn cứ trên cùng một màn hình. |
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
| **HR (Dave)** | I-9, background check, hồ sơ nhân sự, ngày bắt đầu | — |
| **Onboard Specialist (Miley)** | Tạo account (email, LOS, CRM, phone), thiết bị, lịch training tuần đầu | Sau khi HR xác nhận ngày bắt đầu |
| **Accounting (Rosaline)** | Comp plan setup (đúng package đã ký — chảy từ S5, không gõ lại), payroll, W-9/direct deposit | Sau khi HR có hồ sơ |

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

*Tài liệu cùng bộ:* [lo-recruiting-redesign-direction.md](lo-recruiting-redesign-direction.md) (17 pain points + hướng) · [lo-recruiting-feature-review.md](lo-recruiting-feature-review.md) (hiện trạng chi tiết + Phụ lục C production)
