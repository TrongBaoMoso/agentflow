# Chuẩn bị buổi walkthrough Recruiting với Victoria — 05/08/2026

**Buổi họp:** 05/08 09:00 PDT = **23:00 giờ VN cùng ngày**. Chi Tran đặt lịch, mục đích ghi trong
chat: *"Review the recruiting process and make sure our documentation accurately reflects the current
workflow."* Victoria muốn **1–2 người trong team cô** vào cùng (múi giờ US).

**Tài liệu đang được review:** "LO Recruiting — Current Features Review (EN)"
(`1xMhsuqKsoKqx2rLST-EWTJGjU8Wc-SSrwELO16FBPO0`) — Part 1, bản as-is. Part 2 (Pain Points &
Redesign Direction) là phần Victoria đang chờ.

---

## 1. Việc phải nói trong 3 phút đầu (nếu không nói, sẽ bị bắt bài)

Doc Part 1 được viết từ **staging (viet18.com)**. Sau đó tôi đã đo lại trên **production**
(www.loanfactory.com) bằng 6 account thật, và **§9 + §10.1 của doc sai trên production**:

| Doc Part 1 nói | Production thật (đo 05/08) |
|---|---|
| "General Settings ✅" cho **mọi** role; §10.1: "Every role with LO Recruiting can open General Settings" | Chỉ **4/6** mở được: Brayan (inside recruiter), Dung (licensing), Dave (HR), Rosaline (accounting). **Seth** (outside recruiter) và **Miley** (onboarding specialist) KHÔNG. |
| Licensing = ❌ mọi thứ, *"entirely outside the module"* | Dung **mở được cả pipeline ILO — 23.612 record** (dù công tắc `INTERESTED_LOAN_OFFICERS` **tắt** trong cây quyền), và mở được cả General Settings. Chỉ RLO là bị redirect. → **lỗ enforcement**, không phải "ngoài module". |

Cách nói: *"Part 1 tôi viết trên staging. Tôi đã đo lại trên production và tự tìm ra hai chỗ trong
chính doc của mình sai — đây là hai chỗ đó. Nên buổi này đúng là để sửa as-is, và tôi đang cần chị
làm việc đó."* Mở đầu bằng lỗi của mình sẽ khiến phần còn lại dễ được tin, và đúng mục đích buổi họp.

**Số quyền thật /82 công tắc** (đọc từ Associates → Permissions, không cần login-as):

| Người | Role | Số quyền | Ghi chú |
|---|---|---|---|
| Seth August | Outside recruiter | **2** | không có CONFIG |
| Miley Dau | Onboarding specialist | **5** | không có CONFIG |
| Rosaline Pham | Accounting | **14** | có CONFIG, **không** mở được pipeline mà cô ấy chi tiền cho |
| Brayan Suarez | Inside recruiter | **15** | có CONFIG, bulk SMS, tải bản ghi Zoom |
| Dung Nguyen | Licensing | **30** | có CONFIG, sửa được mọi transaction, trả hoa hồng chi nhánh |
| Dave Hoang | HR | **74** | gồm `PAM_GRANT_PERMISSION` — tự cấp quyền cho người khác |

Cùng một cụm từ "recruiter" = một người 15 công tắc và một người 2 công tắc. Đây là bằng chứng định
lượng mạnh nhất cho "quyền cấp theo từng người, không suy ra từ role".

---

## 2. Agenda 40 phút (Victoria nói nhiều nhất)

| Phút | Nội dung |
|---|---|
| 0–3 | Part 1 là as-is theo yêu cầu anh Thuận, **cố ý không có feature mới**. Part 2 mới là pipeline mới. + hai chỗ doc sai ở trên. |
| 3–8 | 4 comment trong doc (mục 3) — chốt từng cái. |
| 8–30 | **Victoria/team đi lại một ngày làm việc thật.** Tôi hỏi theo danh sách mục 4, không thuyết trình. |
| 30–37 | Đối chiếu số production tại chỗ (mục 5) — mở màn hình thật, không dùng slide. |
| 37–40 | Chốt: ai xác nhận as-is bằng văn bản, và lịch cho Part 2. |

**Đừng chiếu video 28 phút trong buổi này.** Nó là bằng chứng để gửi kèm sau, hoặc để mở đúng 1
đoạn 30–60 giây khi có tranh luận. Buổi này giá trị nằm ở việc **họ nói**, không phải ta trình bày.

---

## 3. Bốn comment trong doc → câu hỏi cụ thể

**(1) Brayan — "Invite LO to join Marketplace: I have never seen this feature before"**
Anh ấy là inside recruiter, 15/82 quyền, và chưa từng thấy một row action **có sẵn trên board của
chính mình**. → Hỏi: có ai từng dùng luồng Marketplace-invite này chưa? Nếu không ai dùng thì
**bỏ khỏi scope rebuild** (nó là một funnel thứ hai, kéo theo tài khoản pre-created + email
template). Đây cũng là minh chứng: người dùng không biết mình có quyền gì.

**(2) Victoria — "Invite 1-1 meeting: no longer use this feature"** ⚠️ **quan trọng nhất**
Câu này phá một mắt trong flow as-is của tôi. Phải bóc tách rõ:
- Vẫn phỏng vấn 1-1 nhưng **không qua Calendly** (Zoom/Meet đặt tay), hay **bỏ luôn** bước 1-1?
- Nếu bỏ luôn → ai đang là người "đánh giá con người" trước khi cho onboard, và ở bước nào?
- Nếu chỉ bỏ Calendly → **personal access token Calendly trong config để làm gì nữa?** (đang là
  token của một cá nhân — người đó rời công ty là hỏng.)
- Counter "1-1 meeting completed but HR not initiated" hôm qua **33**, hôm nay **0**. Là HR đã dọn,
  hay là cột này chết theo feature? → quyết định cột đó có tồn tại trong thiết kế mới không.

**(3) Victoria — "11 counter là quá nhiều, nên giảm số status trong thiết kế mới"**
Cô ấy đã tự bước sang Part 2. Đem sẵn dữ liệu: trên 106.145 record RLO, **"Want to join" = 0** và
**"Interested but thinking" = 0** — hai status công ty tự định nghĩa mà không ai dùng. → Hỏi:
trong 10 status RLO + 8 status ILO, **cái nào chị thật sự đặt tay**, cái nào chưa bao giờ chạm?
Cái nào chị *muốn* có mà hiện không có? (Đây là input trực tiếp cho stage model S0–S7 của Part 2.)

**(4) Victoria — "Modex staging page dùng để làm gì? team tôi không dùng data này đúng không?"**
Giờ tôi có bằng chứng production: **mọi record trong `/modex_data` đều có ngày nhận 24/01/2024**,
timestamp cách nhau 7 giây → đổ đúng **một batch** rồi chết. Hai tuần sau ngày đó Modex công bố
MOSO là integration partner. → Hỏi: hôm nay team pitch bằng số liệu ở đâu (tự tra modex.com bằng
tay?), hợp đồng Modex còn hiệu lực không, ai là người chạy sync. Nếu không ai chạy → **page này ra
khỏi scope**, và bài toán thật là "làm sao có volume/units tự động lúc recruiter cần".

---

## 4. Danh sách claim cần Victoria xác nhận (xếp theo mức rủi ro nếu sai)

Đây là phần cốt lõi của buổi họp. Mỗi dòng: claim trong doc → câu hỏi → **vì sao quan trọng**.

1. **Cổng "100% onboarded" chỉ cần Paid + Signed.** NMLS sponsored / HR completed / 1-1 chỉ phục vụ
   auto-join; admin set tay được. → *"Có đúng là một người có thể được đếm 100% onboarded mà chưa
   được bảo trợ license ở bang nào không?"*
   **Vì sao:** production đang có **2.603** record ở trạng thái này. Nếu claim đúng, mọi báo cáo
   tuyển dụng đều dựa trên một dropdown. Đây là phát hiện nặng nhất của cả bản audit.
2. **Bức tường 5 field required.** Muốn sửa **một** field trên record RLO đã có, hệ thống bắt điền
   đủ 5 field mà chính nó tạo ra thiếu (Licensed states, States to sponsor, Career Production,
   Mailing address, Preferred languages), lỗi bung ra từng cái một. → *"Đây có phải lý do không ai
   sửa record cũ không?"*
   **Vì sao:** kho 106.145 record, 102.715 chưa ai claim. Nếu đúng, đây là lý do kỹ thuật của
   "data thối", và là hạng mục bắt buộc của Part 2.
3. **Ô "search" thật ra là label picker.** Chọn suggestion → filter theo `?labels=` trong khi chip
   mặc định còn bật → ra "No results" → người dùng kết luận "chưa có trong hệ thống" → tạo bản
   trùng. Production có dòng bị hệ thống đánh **"(Duplicated)"** đỏ ngay trên grid.
   → *"Team có hay gặp cảnh tìm không ra rồi tạo mới không?"*
4. **Call/SMS phụ thuộc Zoom Phone mapping từng người.** Counter Call lấy từ **log Zoom**, không từ
   cú click. → *"Recruiter có gọi bằng điện thoại cá nhân không? Bao nhiêu phần trăm?"*
   **Vì sao:** nếu có, số liệu hoạt động của team **thấp hơn thực tế** một cách hệ thống — ảnh hưởng
   cách đánh giá người.
5. **Note + email là workflow engine.** Mọi bàn giao giữa phòng ban đi qua "Conversation history"
   dưới dạng note kèm email; không task, không assignee, không deadline.
   → *"Khi chị cần Licensing trả lời, chị làm gì? Trong app hay ngoài app (Chat/email)?"*
   **Vì sao:** quyết định Part 2 có cần task/SLA thật hay chỉ cần cải tiến note.
6. **Auto-assign owner** (tab ILO Owner Assignment) là lý do record mới đã có chủ.
   → *"Ai đang set rule này? Chị có biết rule hiện tại là gì?"*
   **Vì sao:** Miley (onboarding specialist) **không mở được** trang config chứa rule quyết định
   việc của chính cô ấy.
7. **Referral: chín 60 ngày → cron thứ Bảy → commission team duyệt ≈ 75 ngày.**
   → *"Người giới thiệu có phàn nàn chậm không? 5 điều kiện loại có ai kiểm bằng tay không?"*
8. **6 nguồn lead** (Modex / CSV / FB Lead Ads / self-apply / webinar / referral).
   → *"Hôm nay thực tế còn nguồn nào chạy? Facebook Lead Ads có đang bật không?"*
   **Vì sao:** self-apply queue trên production chỉ có **1** dòng; nếu FB Ads chạy thật thì lead
   vào đâu, ai gọi.
9. **Webinar là kênh nurture lớn nhất, attendance import bằng file CSV.**
   → *"Ai export từ Zoom rồi import? Bao lâu một lần?"*
10. **Licensing** (mục 1 ở trên) → *"Dung có thật sự dùng danh sách ILO không, hay chị ấy giữ danh
    sách riêng ngoài hệ thống?"*

---

## 5. Số production để đối chiếu tại chỗ (đo 05/08)

Mở màn hình thật cùng nhau, đừng đọc slide.

**Recruited LO (kho nguội):** Total **106.145** · Not claimed **102.715** · Claimed **11** ·
Archived-Wrong information **23.995** · Block display **6.267** · Initiate contact **759** ·
Message sent **1.118** · Dialogue **18** · Want to join **0** · Interested but thinking **0** ·
Invited to join **0** *(bằng 0 vì record được invite sẽ **rời** board này — không phải "không ai dùng")*

**Interested LO (pipeline):** Total **23.613** · New **8** · Invited but not onboarding **545** ·
Onboarding **62** · **100% onboarded 2.603** · Paid startup fee **73** · Agreement signed **71** ·
Paid but not signed **5** · NMLS sponsored but HR onboarding **1** · HR completed but NMLS not
sponsored **0** · 1-1 completed but HR not initiated **0** *(hôm qua là 33)*

Hai câu hỏi từ chính bảng số này:
- **Claimed 11 / 106.145.** *"Nghĩa là recruiter không bắt đầu ngày làm việc bằng danh sách của
  mình, đúng không? Vậy sáng ra chị/team quyết định gọi ai bằng cách nào?"*
- **Claimed + Not claimed = 102.726, thiếu 3.419 so với Total** trên cùng một panel, và số bị cache
  (audit đo lệch tới 8 ngày). → *"Leadership đang đọc số nào?"*

---

## 6. Buổi HR riêng (Yen Vu / Dave Hoang) — danh sách khác

Yen Vu: giờ VN bình thường, hoặc Dave Hoang ca đêm. Câu hỏi cho HR, **không trùng** với Victoria:

1. Sau khi LO trả phí + ký, HR làm gì theo đúng thứ tự? BGC ở bước nào (`Pending BGC` → `Done BGC`)?
2. Cột `HR status` có 6 giá trị (`HR not initiated / Pending BGC / Done BGC / HR onboarding /
   HR Completed / Pre-onboarding done / Setup call done`) — thực tế dùng mấy giá trị?
3. "Create new account" (form CREATE NEW ASSOCIATES: W-2/W-9, classification, branch/team/manager,
   company email) — **HR bấm, hay ai cũng bấm được?** Trên production **mọi role có quyền pipeline
   đều thấy nút này trên cùng toolbar.**
4. Dave đang có **74/82** quyền, gồm quyền tự cấp quyền cho người khác — có ai review việc cấp quyền không?
5. Bước nào của HR hiện đang phải làm ngoài hệ thống (Sheet/Drive/Chat)?
6. Ai chịu trách nhiệm khi record kẹt (ví dụ "Paid but not signed") — có ai được giao không?

---

## 7. Sau buổi họp: cái gì sẽ phải sửa

**Video production (28:38, 51 scene) — CHƯA nên chốt trước buổi họp.** Ba câu narration đang sai
hoặc bị comment của Victoria phủ định:

| Scene | Câu đang có | Vấn đề |
|---|---|---|
| `s0_4` | *"Four of the six operational roles can, and the two who cannot are **the recruiters**"* | Sai. Hai người không có CONFIG là Seth (outside recruiter) **và Miley (onboarding specialist)**; Brayan cũng là recruiter và **có** CONFIG. |
| `s3_1` | *"Dung… **cannot open either** recruiting list"* | Sai trên production: cô ấy **mở được** ILO (23.612 record). Chỉ RLO bị redirect. Và chính `s3_4` chiếu board ILO dưới session của cô ấy → narration tự mâu thuẫn với hình. |
| `s4_6` | *"…**thirty-three** records on this pipeline are sitting in exactly that state right now"* | Counter giờ là **0**, và Victoria nói feature 1-1 **không còn dùng** → sai cả số lẫn tiền đề. |

Sửa narration = đổi độ dài audio = **phải quay lại act tương ứng** (0, 3, 4). Act 0 cần admin state
→ **cần bạn login tay một lần**. Vì buổi họp có thể còn đổi thêm vài câu nữa (nhất là mục 3.2), nên
**gộp tất cả vào một lượt sau buổi họp** thay vì sửa hai lần và tốn hai lần login.

Ngoài ra sau buổi họp cần: cập nhật §9/§10 của doc Part 1 theo số production, reply 4 comment trong
doc, và xin Victoria xác nhận as-is **bằng văn bản** (một comment "confirmed" trong doc là đủ) —
vì Part 2 sẽ được xây trên nền đó.
