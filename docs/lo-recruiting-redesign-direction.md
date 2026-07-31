# LO Recruiting — Pain Points & Redesign Direction

> **Bối cảnh:** Yêu cầu làm mới hoàn toàn module LO Recruiting (new tech / new UI / new system) cho Tera+. Tài liệu này **chưa bàn technical stack** — chỉ trả lời: app hiện tại đau ở đâu, user gặp bất cập gì, và app mới nên đi theo hướng nào.
>
> **Căn cứ:** Khảo sát thực nghiệm 3 vòng trên staging viet18.com (bấm thật từng CTA, tạo record thật, chạy trọn flow tuyển 1 LO từ lead → 100% onboarded, login-as 6 role khác nhau) **+ 1 vòng đối chiếu read-only trên PRODUCTION www.loanfactory.com ngày 31/07/2026** (login-as 5 role thật, đo coverage trên dữ liệu thật, tra chéo tài khoản Modex Recruit thật). Chi tiết hiện trạng: [lo-recruiting-feature-review.md](lo-recruiting-feature-review.md).
>
> **Người thực hiện:** Bao Trinh — 07/2026

---

## 0. Kết luận một dòng

> App hiện tại là **một cái database có UI** — nó cho bạn xem và sửa mọi trường dữ liệu.
> App mới nên là **một trợ lý quy trình** — dẫn từng role đi qua đúng bước, đúng thời điểm, với ít quyết định thừa nhất.

Mọi pain point bên dưới đều là biểu hiện của khoảng cách đó.

---

## 1. Những con số nói lên vấn đề

| Chỉ số quan sát được | Giá trị | Ý nghĩa |
|---|---|---|
| Số "kho" chứa cùng một con người trong phễu | **2** (Recruited LO ↔ Interested LO) | Không có view xuyên suốt vòng đời 1 LO |
| Số status phải nhớ | **10 + 8** (2 bộ khác nhau, có nghĩa chồng nhau) | Trạng thái mù mờ, dễ set sai |
| Điểm chạm (clickable) trên **1 dòng** LO | **~20** | Không biết "giờ nên làm gì tiếp" |
| Số cột bảng chính | **16–17** (phải cuộn ngang) | Thông tin quan trọng nằm ngoài viewport |
| Role vào cùng 1 view ILO | **5** (Recruiter/HR/Onboarding/Accounting/Admin) | Không ai thấy đúng thứ mình cần |
| Role mở được trang config công ty | staging **6/7** · **production 7/7** (cả Licensing) | Phân quyền lỏng, gồm cả Calendly token |
| Độ lệch của stats panel | **~8 ngày** | Người dùng không tin số liệu |
| Job ngầm không có thông báo hoàn thành | **~10 phút** (Modex merge, dashboard Run Update) | Làm xong không biết đã xong |
| Nguồn lead phải hợp nhất | **6** (Modex/CSV/FB Ads/self-apply/webinar/referral) | Dedup và identity là bài toán lõi |
| Record có dữ liệu experience/production (mẫu 100, RLO Company) | staging **2/100** · **production 1/100** — còn lại in chữ *"Check Modex"* | Quyết định offer nằm ngoài hệ thống (xem P0-17) |
| Record trong tab "Obtained from Modex" | staging **9** · production **~100+** — tất cả nhập **24/01/2024** | Không phải integration — là một lần import CSV chết từ 01/2024 trên **cả hai môi trường** |
| LO trong database Modex thật (portal LF đang trả tiền) | **1,647,676**, dữ liệu tươi đến **07/2026** | Dữ liệu để định giá offer TỒN TẠI — chỉ là app không lấy về |

---

## 2. Pain points theo mức độ đau

Ký hiệu: **P0** = phải giải quyết ở kiến trúc app mới · **P1** = ảnh hưởng hiệu suất công việc hàng ngày · **P2** = gây khó chịu / mất niềm tin.

### 🔴 P0-1. Phễu bị chẻ làm hai kho rời nhau
**Ai đau:** Recruiter (nặng nhất), Manager, Admin.
**Hiện tượng:** Cùng một con người, khi còn "cold" nằm ở *Recruited Loan Officers*; sau khi bấm "Invite … to join company" thì **nhảy sang một trang khác** (*Interested Loan Officers*) — URL khác, bộ cột khác, bộ action khác, thậm chí bộ status khác. Recruiter phải tự nhớ "người này giờ đang ở kho nào".
**Hệ quả:** Không trả lời được câu hỏi cơ bản nhất — *"lead này đã đi được bao xa, ai đã chạm, còn thiếu bước gì?"*. Không đo được conversion xuyên phễu.
**Hướng app mới:** **Một pipeline duy nhất**, một record LO duy nhất, stage thay vì kho. Chuyển stage là chuyển trạng thái — không phải "chuyển trang".

### 🔴 P0-2. Nhiều role dùng chung một cái bảng khổng lồ
**Ai đau:** tất cả role vận hành (Recruiter, HR, Onboarding, Accounting).
**Hiện tượng:** Cả 5 role mở đúng cùng một trang ILO với cùng bảng 16 cột; khác biệt duy nhất là *scope dữ liệu* (Mine vs company-wide) và vài item trong Action menu. Recruiter cần "hôm nay gọi ai"; HR cần "ai đã trả phí, chờ tạo account"; Accounting cần "đối soát startup fee" — nhưng cả ba nhìn cùng một bảng rồi tự lọc bằng tay.
**Hệ quả:** Ai cũng phải học toàn bộ hệ thống mới dùng được phần của mình; onboarding người mới rất chậm; dễ thao tác sai vào việc của bộ phận khác.
**Hướng app mới:** **Role-based workspace** — mỗi role có màn hình mặc định trả lời đúng câu hỏi nghiệp vụ của họ. Cùng dữ liệu, khác cách trình bày và khác bộ hành động.

### 🔴 P0-3. Quá tải hành động, không có "bước tiếp theo"
**Ai đau:** Recruiter mới, Onboarding specialist.
**Hiện tượng:** Trên một dòng LO: 11 mục trong Action menu + Call + Zoom SMS + Note + Assign owner + toggle Loan referral + 4 dropdown inline (status / priority / channel / experience). Không có gợi ý hành động, không có thứ tự ưu tiên.
**Hệ quả:** Người dùng phải tự xây quy trình trong đầu; hai recruiter làm hai kiểu; chất lượng phụ thuộc người.
**Hướng app mới:** Mỗi stage chỉ phơi ra **2–3 hành động chính đúng lúc** (next-best-action), phần còn lại vào "More". Quy trình do hệ thống dẫn, không do trí nhớ.

### 🔴 P0-4. Trạng thái mù mờ, auto và manual lẫn lộn
**Ai đau:** HR, Onboarding, Manager (báo cáo sai).
**Hiện tượng:** 10 status ở Recruited + 8 ở Interested, nhiều nhãn nghĩa chồng nhau (*"Invited to join"* tồn tại ở cả hai kho). Trả phí thì status **tự nhảy** sang "Onboarding" mà không thông báo. Ngược lại, admin **set tay được "100% onboarded"** dù NMLS/HR chưa xong — vì gate cứng chỉ là Paid + Signed.
**Hệ quả:** Cùng một status không đảm bảo cùng một thực tế → báo cáo funnel không đáng tin; người sau không biết vì sao record ở trạng thái này.
**Hướng app mới:** Tách rạch ròi **stage (do người quyết, ít và rõ)** khỏi **milestone (do hệ thống ghi nhận: paid / signed / NMLS sponsored / HR completed / meeting done)**. Stage chỉ tiến khi milestone bắt buộc đã đủ; mọi lần tiến/thoái đều log kèm lý do.

### 🔴 P0-17. Không có tra cứu LO theo NMLS — recruiter phải rời app để định giá offer
> *Pain point do **Phuong Nguyen** nêu; đã kiểm chứng bằng thao tác thật ngày 31/07/2026.*

**Ai đau:** Recruiter (nặng), Manager (không kiểm soát được offer), Onboarding.

**Bối cảnh nghiệp vụ:** Sau khi LO đồng ý về LF, recruiter cần biết người này *mới vào nghề hay đã nhiều năm kinh nghiệm, làm bao nhiêu loan/volume* để đưa ra **offer hợp lý**. Đây là bước quyết định tiền — nhưng hệ thống không hỗ trợ.

**Những gì đo được trên hệ thống:**

| Kiểm chứng | Kết quả thực tế |
|---|---|
| Tổng số record trong tab *Loan Officers Obtained from Modex* | **9 record** |
| Received Date của toàn bộ 9 record | **12–20/01/2024** → dữ liệu ~2.5 năm tuổi, chưa từng làm mới |
| Chất lượng dữ liệu liên hệ trong đó | placeholder: `workemail1@moso.com`, phone `111111111` / `0000000000` |
| Tra NMLS `684563834` (có thật trong pipeline) trong tab Modex | **"No results found"** — search chỉ tìm trong 9 record cũ, **không gọi Modex** |
| Nút **Check Modex** trên từng record | mở tab mới tới `https://modex.com/login` — **không deep-link theo NMLS, không SSO** |
| Cột *Experience/12-month loans* trên 100 record mẫu (Recruited LO → Company) | **chỉ 2/100 có dữ liệu**; **98/100 hiện đúng chữ "Check Modex"** |
| Cột *NMLS* trên cùng 100 record đó | **82/100 có NMLS** → khoá tra cứu đã có sẵn, chỉ thiếu tự động hoá |
| Nút **Sync Status** / **Update** | "Status is updating in background" / "~10 minutes" — **không báo cáo kết quả** (bao nhiêu khớp, bao nhiêu không tìm thấy NMLS) |

**Kiểm chứng thêm trên PRODUCTION (www.loanfactory.com, 31/07/2026):**

| Kiểm chứng | Kết quả trên production |
|---|---|
| Tab *Obtained from Modex* | "1-100 of over 100" record — **toàn bộ Received Date = 24/01/2024**, y hệt staging: bãi import chết ~2.5 năm. Đa số record "No email / No phone" |
| Record `Pareetjot Thiara` (nằm trong tab Modex của LF) | tra trên Modex thật ra **"Inactive Loan Officer"** → bản import 2024 còn chứa người đã nghỉ |
| RLO Company (filter Active), mẫu 100 dòng | **1/100 có dữ liệu experience** · 48/100 in chữ "Check Modex" · 48/100 có NMLS |
| ILO Company, mẫu 100 dòng | 62/100 có experience **nhưng** giá trị dạng *"Experienced — Past 12 months: N, Since 2021: N"* — mốc **"Since 2021" hardcode**, đến 2026 vẫn đếm từ 2021; nguồn chủ yếu tự khai/import cũ, 52/100 có NMLS |
| **Modex Recruit portal** (account LF đang có, do Victoria đứng tên) | **1,647,676 LO**; dữ liệu volume theo tháng **tươi đến July 2026**; quick-search **nhận NMLS** ra kết quả tức thì; profile mỗi LO có: Modex Score, số năm license, employment history 10 năm, current employer + tenure, Total Volume/Units 12 tháng, avg loan, mix VA/FHA/Conv, mix Refi/Purchase, property cities/types, transaction-level data, nút download |
| Case study: **Roger Kube** — dòng ĐẦU TIÊN của RLO production, ô Experience in "Check Modex" | Tra NMLS `107621` trên Modex: **$103.85M volume / 138 units / 12 tháng, avg loan $752K, 15 năm license, Modex Score 100** — một high producer thứ thiệt mà hệ thống hiển thị như tờ giấy trắng |

→ Kết luận chắc chắn sau khi xem cả hai môi trường: vấn đề **không phải "data Modex thiếu/sai"** như cảm nhận ban đầu — mà là **không tồn tại đường ống dữ liệu**. Dữ liệu chuẩn, tươi, đầy đủ nằm ngay sau login Modex mà công ty đang trả tiền; app chỉ giữ một bản CSV chết từ 01/2024 và in chữ "Check Modex" đẩy việc cho người.

**Tra cứu năng lực tích hợp của Modex (modex.com + support.modex.com + portal, 31/07/2026, read-only):**

| Câu hỏi | Đáp án đã xác minh |
|---|---|
| Modex có bán API/integration không? | **CÓ.** 4 phương thức: **Webhook** (JSON push — phổ biến nhất), Direct CRM, **SFTP** (JSON/CSV), **AWS S3** (JSON/CSV). Cơ chế: **list-sync push một chiều** — thêm LO vào List → bấm Sync → Modex đẩy payload về endpoint gần-real-time; bật *monthly refresh* thì toàn bộ list được đẩy lại mỗi khi Modex nạp data tháng mới. Không phải API query on-demand tự do; **mọi connection do Modex team cấu hình** (liên hệ account executive), user không tự bật được. |
| Payload có đủ dữ liệu P0-17 cần không? | **Đủ 100%**: NMLS, **Modex Score**, employment (tenure hiện tại, tổng năm trong nghề, số job 10 năm), state licenses, contact (nếu unlock), **production đầy đủ** — Volume/Units theo timeframe, avg loan, mix loan type / transaction type / property type, banked/brokered, reverse. Modex cung cấp sẵn data dictionary + sample JSON khi hỏi. |
| Quan hệ Modex ↔ MOSO? | **Đã là integration partner công bố chính thức**: bài news trên modex.com ngày **07/02/2024** — "Modex and MOSO announce their integration partnership... bring Modex's robust mortgage data into MOSO's platform", quote cả **Thuan Nguyen (president & co-founder MOSO)** và Dale Larson III (CEO Modex). Ngày này chỉ **2 tuần sau** mốc import chết 24/01/2024 → tab Modex trong LF chính là dấu vết lần đổ data đầu của partnership; sau đó pipe không chạy nữa. |
| Pipe có còn sống không? | **KHÔNG.** Trong portal, list detail (vd "TMC - Brayan list" 372 LO) **không có nút Sync** — theo docs Modex, nút này chỉ hiện khi account có ít nhất một export connection đang cấu hình → account Loan Factory hiện **không có connection nào active**. Khớp với data đóng băng 24/01/2024. |
| Hợp đồng hiện tại (nhìn từ trong portal) | Subscription **"Loan Factory" — Active**, coverage **toàn quốc (mọi state)**. **Total Seats = 1 · Seats Used = 2 (cùng email victoria.pham 2 dòng) · Seats Available = −1** · 1 invitation treo. Cả công ty (Victoria/Leslie/Brayan — thấy qua tên các List) dùng chung 1 seat; ngay trong lúc khảo sát, session bị đá logout giữa chừng — đúng triệu chứng single-seat. |
| Contact data (email/phone LO) | **Tính theo credit**: xem lần đầu = 1 credit/LO, xem lại miễn phí, credit **reset đầu mỗi tháng**; field contact trong payload chỉ đổ về nếu đã unlock. Quota credit của hợp đồng LF = chưa rõ, phải hỏi. |

→ **Hệ quả cho thiết kế**: kiến trúc P0-17 không phải "gọi API theo NMLS" mà là **list-sync webhook**: nút *"Verify with Modex"* = thêm LO vào một synced list phía Modex → payload JSON đổ về endpoint của Tera+ → upsert + lưu snapshot; bật monthly refresh để cả kho tự tươi mỗi tháng. Mô hình này khớp luôn cách team đang làm việc thật (đã có sẵn các List: "TMC - Brayan list" 372, "Morty LOs 1/29/2026", "Top 1000 LOs by Production"...).

→ **Câu hỏi còn lại cho Victoria / Modex AE thu hẹp còn 4 ý hợp đồng**: (1) kích hoạt lại export connection (webhook về hệ thống mới) — có sẵn trong gói hay phí thêm; (2) sync limit bao nhiêu record/tháng; (3) quota credit contact-data; (4) giá thêm seat (hiện đang −1 seat, dùng chồng).

**Quy trình recruiter đang phải làm bằng tay (6 bước, ngoài hệ thống):**
copy NMLS trong LF → mở tab Modex → **đăng nhập bằng credential riêng** → dán NMLS, search → đọc số liệu → quay lại LF *tự nhớ / tự nhập* (và thường không nhập → nên cột experience trống 98%).

**Vì sao đây là P0, không phải chuyện nhỏ:**
- Hệ thống **tự thừa nhận không có dữ liệu** bằng cách in chữ "Check Modex" vào ô đáng lẽ chứa dữ liệu → đẩy việc cho người, đúng nghĩa "database có UI".
- Quyết định **tiền** (offer, comp band) đang dựa vào dữ liệu **không nằm trong hệ thống, không ai kiểm chứng lại được**: không biết ai đã tra, tra lúc nào, thấy số gì.
- Tab Modex hiện tại **không phải integration** — nó là bãi chứa của một lần import CSV năm 2024. Gọi là "Modex integration" gây hiểu sai về năng lực hệ thống.
- Ghi chú: trên staging, giá trị cột này ở vài record là dãy `301000 / 302000 / 305000...` trông như seed data. **Đã đối chiếu production (bảng trên): production cũng đóng băng 24/01/2024** — vậy câu "data không đủ / không chính xác" của Phuong thực chất là: *toàn bộ* dữ liệu Modex trong app đã chết từ 01/2024, không phải sai lẻ tẻ.

**Hướng app mới — biến "check tay" thành "verify một click":**
1. **NMLS là first-class identifier**: validate định dạng, bắt buộc trước khi tiến sang stage Engaged, dùng làm khoá dedup và khoá tra cứu.
2. **Nút "Verify with Modex" trên LO 360** → cơ chế đã xác minh (bảng trên): **list-sync webhook** — thêm LO vào synced list phía Modex, payload JSON đổ về endpoint Tera+ gần-real-time, bật monthly refresh cho cả kho. Fallback nếu đàm phán connection thất bại: **NMLS Consumer Access** (license/employment công khai, miễn phí — nhưng không có volume/units) + CSV export tay định kỳ từ portal.
3. **Lưu snapshot kết quả vào record**, kèm `nguồn + thời điểm + người chạy`. Hiển thị badge *"as of 12/07/2026"*, cảnh báo khi cũ hơn 90 ngày, cho phép re-verify.
4. **Verification card** trong LO 360: số năm có license, nơi làm hiện tại + thời gian ở đó, các state có license, **loan count & volume 12 tháng**, mix purchase/refi.
5. **Gợi ý comp band từ production tier** (Newly licensed / <10 loans / 10–50 / 50+ / high producer) → đây chính là thứ recruiter cần để "offer hợp lý", thay vì tự phán đoán.
6. **Verification là milestone bắt buộc** trước khi ra offer (gate giữa *Engaged* → *Onboarding*), có audit: ai verify, thấy gì, offer dựa trên số nào.
7. **Bulk enrich có báo cáo**: khi import list, chạy enrich hàng loạt rồi trả về *matched / unmatched / ambiguous* để người xử lý phần còn lại — không phải job im lặng 10 phút.

### 🟠 P1-5. Không có "việc của tôi hôm nay"
**Ai đau:** Recruiter, Onboarding specialist.
**Hiện tượng:** Không có màn hình nào trả lời "hôm nay tôi phải làm gì". Cơ chế duy nhất là *follow-up flag* — thực chất là **snooze: ẩn record khỏi pipeline đến ngày wake-up**. Có bộ lọc "Follow-ups overdue" nhưng đó là filter, không phải danh sách công việc.
**Hệ quả:** Lead nguội âm thầm; "ẩn đi" dễ thành "quên hẳn"; không có SLA.
**Hướng app mới:** **Task/Today view là màn hình mặc định**: việc đến hạn, lead mới chưa ai chạm, deal đang nguội, việc quá hạn — kèm nhắc nhở. Follow-up là *task có deadline*, không phải nút ẩn record.

### 🟠 P1-6. Bảng mega-column, thông tin quan trọng nằm ngoài màn hình
**Ai đau:** mọi role.
**Hiện tượng:** 16–17 cột, phải cuộn ngang mới thấy Recruiter / NMLS / Registered webinar. Ba chế độ view (chart/text/ẩn) chỉ đổi panel thống kê, không giải quyết chiều ngang.
**Hướng app mới:** Danh sách gọn (5–6 cột quan trọng theo role) + **detail drawer "LO 360"** mở bên phải: hồ sơ, timeline chạm, milestone, tài liệu, task — không rời khỏi danh sách.

### 🟠 P1-7. Không có dòng thời gian hợp nhất của một LO
**Ai đau:** Recruiter kế nhiệm, HR, Manager.
**Hiện tượng:** Lịch sử bị xé thành nhiều nơi: Conversation history (note), Audit log (field-level), Flag history (follow-up), counter Call/Text lấy từ Zoom, email history theo campaign, e-sign riêng.
**Hệ quả:** Muốn hiểu "đã xảy ra gì với người này" phải mở 5–6 chỗ.
**Hướng app mới:** **Một timeline duy nhất** merge mọi loại sự kiện (call, SMS, email, note, đổi stage, milestone, tài liệu, task) — filter theo loại, ai làm, thời điểm.

### 🟠 P1-8. Tìm kiếm phản chủ
**Ai đau:** mọi role.
**Hiện tượng:** Chọn gợi ý autocomplete lại chuyển thành filter `?labels=` → ra "No results" dù record tồn tại; record vừa tạo không tìm thấy ngay (index eventual-consistency). Gõ URL không có quyền thì **redirect im lặng** sang trang khác, không báo gì.
**Hướng app mới:** Full-text search tin cậy (tên/email/phone/NMLS/company), kết quả tức thì sau khi ghi, và **báo lỗi trung thực** (404 / không đủ quyền) thay vì âm thầm đổi trang.

### 🟠 P1-9. Số liệu không đáng tin, job ngầm không có trạng thái
**Ai đau:** Manager, Accounting, Admin.
**Hiện tượng:** Stats panel lệch tới ~8 ngày; dashboard phải bấm **Run Update** thủ công mới đúng; Modex merge và update-by-Modex chạy nền "~10 phút" nhưng không thông báo khi xong, không biết thành/bại.
**Hệ quả:** Không ai dám dùng số của hệ thống để ra quyết định → quay về Excel.
**Hướng app mới:** Số liệu near-realtime; mọi job có **trạng thái rõ ràng** (đang chạy / xong / lỗi + lý do) và thông báo khi hoàn tất.

### 🟠 P1-10. Phân quyền lỏng: ai cũng vào được cấu hình công ty
**Ai đau:** Admin, bộ phận bảo mật, và cả công ty (rủi ro).
**Hiện tượng (staging):** 6/7 role test được đều mở `/lo_recruiting_config` — gồm tab **Calendly (chứa personal access token)**, chuỗi email automation, Facebook Ads. HR và Accounting **xoá được** ILO toàn công ty.
**Kiểm chứng production (login-as 5 role thật, 31/07/2026):** còn tệ hơn staging —
- **7/7 role mở được trang config** (kể cả **Licensing** — role duy nhất bị chặn trên staging), tab Calendly hiển thị đủ.
- **Inside & Outside recruiter thấy nguyên toolbar admin trên kho RLO 106,145 record**: cả nút **Delete** lẫn **Assign recruiter** — staging thì recruiter bị ẩn các nút này.
- Accounting & Licensing bị chặn RLO nhưng bằng **redirect im lặng** sang Marketplace/Applications (không có thông báo "bạn không có quyền").
- **Cùng một role, quyền khác nhau giữa 2 môi trường / giữa 2 người** → bằng chứng phân quyền là **grant per-user thủ công** (menu Associates → Permissions) chồng lên role, không phải RBAC thật. Không audit được "ai có quyền gì, vì sao".
**Hướng app mới:** RBAC theo **tác vụ** (không theo trang), tách hẳn *cấu hình hệ thống* khỏi *vận hành*; secret không hiển thị trong UI vận hành; quyền suy ra từ role — grant cá nhân là ngoại lệ có thời hạn và có audit; báo lỗi 403 trung thực thay vì redirect im lặng; mọi hành động phá huỷ đều có xác nhận + audit + khả năng hoàn tác.

### 🟠 P1-11. Impersonation một chiều
**Ai đau:** Admin, support.
**Hiện tượng:** "Login as" mở tab mới nhưng **thay session của cả browser**; không có nút "Back to admin" — đường về duy nhất là logout rồi đăng nhập lại.
**Hướng app mới:** Impersonate có banner cảnh báo, **một-click thoát**, giới hạn thời gian, ghi audit rõ "ai đóng vai ai, làm gì".

### 🟡 P2-12. Phản hồi hệ thống không trung thực
**Hiện tượng:** Đổi status **thành công** nhưng toast báo *"We're experiencing technical difficulty"*. Form Create không đánh dấu required và **lộ lỗi dần từng field** qua nhiều lần submit. Lỗi Zoom SMS chỉ nói *"User not found"* mà không nói phải map Zoom Phone ở đâu.
**Hướng app mới:** Validation inline ngay khi nhập; thông báo nói đúng điều đã xảy ra; mọi lỗi kèm **cách khắc phục** (kèm link tới đúng trang cấu hình).

### 🟡 P2-13. Integration là điều kiện ngầm, không được onboard
**Hiện tượng:** Call/SMS phụ thuộc mapping Zoom Phone của từng user; chưa map là hỏng ngay lúc cần gọi. Calendly, Facebook Ads, Modex đều là cấu hình rời rạc không có health-check.
**Hướng app mới:** Trang **Integrations** có trạng thái từng kết nối (đã kết nối / lỗi / chưa cấu hình) + hướng dẫn tự phục vụ; tính năng phụ thuộc integration thì disable kèm lý do, không để user bấm rồi mới hỏng.

### 🟡 P2-14. Template & nội dung bị rải rác
**Hiện tượng:** Call script nằm trong modal Call; template Email/SMS/Call theo status nằm trong "Template settings"; chuỗi 6 email webinar nằm trong config; email blast lại có template riêng. Không thấy được "record này đang dùng template nào, đã nhận email gì".
**Hướng app mới:** **Comms hub** tập trung: thư viện template có version, gắn với stage/sequence, và log gửi hiển thị ngay trên timeline của LO.

### 🟡 P2-15. Không dùng được trên điện thoại
**Hiện tượng:** UI GWT cũ, bảng cuộn ngang, modal nhiều bước — trong khi công việc recruiter phần lớn là **gọi điện và nhắn tin**, thường ngoài bàn làm việc.
**Hướng app mới:** Mobile-first cho các luồng recruiter (queue gọi, log kết quả 1 chạm, task hôm nay).

### 🟡 P2-16. Trùng lặp & chất lượng dữ liệu do 6 nguồn đổ về
**Hiện tượng:** Modex có badge *Existing / Review Similar* (đã manh nha dedup), nhưng CSV / FB Ads / self-apply / webinar / referral thì không có cơ chế hợp nhất; trong staging thấy nhiều record gắn nhãn *(Duplicated)*.
**Hướng app mới:** **Identity resolution** ở tầng nhập liệu (khoá theo NMLS + email + phone), gợi ý merge có review, một "master record" duy nhất cho mỗi con người.

---

## 3. Những gì app cũ làm ĐÚNG — nên giữ / port sang app mới

Không phải mọi thứ đều cần thay. Đây là các tài sản có giá trị nghiệp vụ thật, xây lại từ đầu sẽ lãng phí:

1. **Chuỗi 6 email automation cho webinar** (confirm → 3 reminder → mời join → follow-up 1 tháng) — logic nurture đã chín, chỉ cần chuyển sang engine mới.
2. **Call script bán hàng** (Technology / Support / Compensation với số liệu cụ thể) — nội dung đào tạo recruiter, nên đưa vào comms hub kèm version.
3. **Modex enrichment**: profile production 12 tháng (volume/count) + transaction mix → đây là *vũ khí* để recruiter chào đúng người; giữ nguyên và làm mạnh hơn.
4. **Referral policy engine**: 5 rule ineligible + payout 60 ngày sau onboard + cron thứ Bảy → Commission Team. Logic rõ ràng, chỉ cần minh bạch hoá tiến độ cho người refer.
5. **Campaign tracking cho email blast** + dynamic contact list (điều kiện tính lúc gửi) — ý tưởng tốt, giữ lại.
6. **Auto owner assignment** theo cấu hình (Recruiter / Onboarding / Support) — cần giữ, nhưng phải hiển thị "vì sao bạn được gán".
7. **Audit log field-level** — nền tảng tốt cho compliance; app mới nên mở rộng thành timeline hợp nhất.

---

## 4. Định hướng UX/flow cho app mới

### 4.1. Nguyên tắc thiết kế (5 điều)

1. **Một người, một record, một vòng đời.** Không còn hai kho. Chuyển stage ≠ chuyển trang.
2. **Màn hình mặc định là công việc, không phải bảng dữ liệu.** Mở app ra thấy "việc hôm nay", không phải 2000 dòng.
3. **Hệ thống dẫn đường.** Mỗi stage có checklist + next-best-action; người dùng không cần nhớ quy trình.
4. **Trung thực về trạng thái.** Số liệu realtime, job có trạng thái, lỗi nói rõ cách sửa, mọi thay đổi có dấu vết.
5. **Quyền theo việc, không theo trang.** Thấy đúng phần mình cần; cấu hình hệ thống tách khỏi vận hành.

### 4.2. Vòng đời LO đề xuất (5 stage + milestone tách rời)

```
[1] Sourced        → lead vừa vào từ 6 nguồn, chưa ai chạm, đã dedup
[2] Contacting     → đang liên hệ (call/SMS/email), có SLA "chạm trong 24h"
[3] Engaged        → đã có đối thoại/đăng ký webinar/hẹn 1-1; đang thuyết phục
[4] Onboarding     → đã đồng ý join; chạy checklist milestone
[5] Active LO      → đã có account, bắt đầu originate  (bàn giao sang Tera+ core)

Thoát phễu:  Nurture (chưa phải lúc)  ·  Disqualified (kèm lý do)  ·  Lost (kèm lý do)
```

**Milestone (hệ thống ghi nhận, hiển thị dạng checklist trong stage Onboarding):**
`Startup fee paid (hoặc waived)` · `LO Agreement signed` · `NMLS sponsorship submitted → approved` · `HR profile created` · `1-1 onboarding meeting done` · `Training bắt buộc hoàn thành` *(chỗ nối cho phần của Benjamin)*

→ Stage 5 chỉ đạt khi **tất cả milestone bắt buộc** xong. Muốn ép sớm thì phải **override có lý do + audit**, không phải chọn im lặng trong dropdown.

### 4.3. Bản đồ màn hình (theo role)

| Màn hình | Cho ai | Trả lời câu hỏi |
|---|---|---|
| **Today / My Work** | Recruiter, Onboarding | "Hôm nay tôi phải làm gì?" — task đến hạn, lead mới, việc quá hạn, deal nguội |
| **Pipeline** (Kanban + list toggle) | Recruiter, Manager | "Phễu đang ra sao? ai đang tắc ở đâu?" |
| **LO 360 drawer** | mọi role | "Người này là ai, đã xảy ra gì, còn thiếu gì?" — hồ sơ + timeline + milestone + task + tài liệu + **verification card (NMLS/production)** |
| **Verify & Offer** (trong LO 360) | Recruiter, Manager | "Người này mới hay lâu năm, làm bao nhiêu loan — nên offer band nào?" — 1 click verify, snapshot có timestamp, gợi ý comp band |
| **Call Queue** (mobile-first) | Recruiter | "Gọi ai tiếp theo?" — kèm script, log kết quả 1 chạm |
| **Onboarding Board** | HR, Onboarding, Licensing | "Ai đang ở bước nào, ai đang chờ tôi?" — checklist theo cột milestone |
| **Fees & Referrals** | Accounting | "Ai đã trả phí, ai chờ payout, đã đối soát chưa?" |
| **Sources & Imports** | Admin, Ops | "Lead từ đâu về, có trùng không, job import đang chạy thế nào?" |
| **Comms Hub** | Marketing, Admin | "Template nào đang chạy, sequence nào hiệu quả?" |
| **Analytics** | Manager, CEO | "Conversion từng stage, time-in-stage, hiệu suất từng recruiter/nguồn" |
| **Settings / Integrations** | chỉ Admin | "Cấu hình, phân quyền, trạng thái kết nối" |

### 4.4. Ba thay đổi tạo khác biệt lớn nhất so với app cũ

1. **Task engine thay cho follow-up flag.** Mọi ý định trong tương lai đều là task có deadline + người phụ trách + hiển thị trên Today view. Không còn chuyện "ẩn record rồi quên".
2. **Timeline hợp nhất.** Một dòng thời gian cho tất cả sự kiện của một LO — thay vì 5–6 chỗ rời rạc (note / audit / flag history / Zoom counter / email campaign / e-sign).
3. **Stage-scoped actions.** Mỗi stage phơi ra đúng 2–3 hành động; hành động khác ẩn đi. Giảm từ ~20 điểm chạm/dòng xuống còn 3–5.

### 4.5. Chỉ số để biết app mới có thật sự tốt hơn

| Đo cái gì | Baseline app cũ | Mục tiêu app mới |
|---|---|---|
| Số click để hoàn tất 1 vòng liên hệ (mở → gọi → log → hẹn follow-up) | ~8–10 click qua 3 modal | ≤ 3 |
| Thời gian onboard người dùng mới (recruiter tự làm được việc) | phải học cả hệ thống | < 1 ngày, học theo role |
| Lead không được chạm trong 24h | không đo được | có SLA + cảnh báo |
| Độ trễ số liệu dashboard | tới ~8 ngày / phải bấm Run Update | near-realtime |
| Tỉ lệ record trùng | có nhãn *(Duplicated)* rải rác, không kiểm soát | dedup tại nguồn + hàng chờ merge |
| Conversion từng stage | không có (2 kho rời) | đo được xuyên suốt |
| Record có dữ liệu production để định giá offer | **2%** (98% phải tra tay ngoài app) | > 90% tự động, có timestamp |
| Số bước để biết 1 LO mới hay lâu năm | **6 bước, 2 hệ thống, 2 lần login** | 1 click trong LO 360 |

---

## 5. Câu hỏi cần chốt trước khi vào technical

1. **Scope quan hệ với Tera+:** app riêng có SSO, hay module trong Tera+? (Ảnh hưởng trực tiếp tới identity, RBAC, và điểm bàn giao ở stage *Active LO*.)
2. **Ai là chủ dữ liệu Associates/HR?** App mới tạo account nhân sự, hay đẩy request sang HR system hiện có?
3. **Referral payout** còn đi qua Commission Team + cron thứ Bảy như cũ, hay tự động hoá trong app mới?
4. **Integration nào bắt buộc ở v1?** (Zoom Phone, Calendly, Facebook Lead Ads, Modex, e-sign) — nên chọn 2–3 cho v1 thay vì port hết. **Modex nên nằm trong nhóm bắt buộc** (xem P0-17). Phần kỹ thuật đã tra xong 31/07/2026: Modex CÓ webhook/SFTP/S3 list-sync, MOSO từng là integration partner công bố 02/2024, account hiện **không còn connection active** và chỉ có **1 seat (đang dùng −1)**. Còn lại là 4 câu hỏi hợp đồng cho Victoria/Modex AE (kích hoạt lại connection, sync limit, credit contact-data, giá thêm seat).
5. **Phần Trainings của Benjamin** nối vào đâu: milestone trong Onboarding, hay module tách riêng phát tín hiệu ngược lại?

---

*Tài liệu liên quan:* hiện trạng chi tiết CTA + ma trận phân quyền → [lo-recruiting-feature-review.md](lo-recruiting-feature-review.md) · [English](lo-recruiting-feature-review.en.md)
