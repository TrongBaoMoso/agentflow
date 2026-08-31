# Landing page riêng cho từng Recruiter — brief thiết kế

> Ngày: 2026-08-31 · Người viết: bao.trinh@loanfactory.com (soạn cùng Claude)
> Yêu cầu gốc: mỗi recruiter có 1 landing page riêng để đi tuyển LO, ý tưởng giống
> `loanfactoryiq.com/loan-officer/<tên>`. Hai loại link: (1) gửi đại trà — chỉ thu thông tin;
> (2) gửi cho LO chuyên nghiệp — chạy hết quy trình kể cả trả phí. LO submit từ page nào thì
> được tính về recruiter đó. HR sẽ cấp account/unique key cho recruiter, hiện chưa có.

---

## 0. Kết luận trước, dẫn chứng sau

**Khoảng 80% cơ chế đã có sẵn trong `lf-homepage` và đang chạy trên production.** Việc thật sự
mới chỉ có ba thứ: **một trang được cá nhân hoá**, **một sổ đăng ký slug → recruiter**, và
**một công tắc chọn chế độ form**. Không cần dựng phễu mới, không cần data model mới.

| Thành phần | Trạng thái | Bằng chứng |
|---|---|---|
| Trang bán "làm LO ở Loan Factory" cho ứng viên | **Đã có** — `/loan-officer`, 22 section | `src/app/[locale]/(public)/loan-officer/_sections/` |
| Form thu lead nhẹ (tên, email, phone, NMLS, states, consent) | **Đã có** — GetInTouch/WebinarForm | `.../loan-officer/_sections/GetInTouchSection/WebinarForm/index.tsx` |
| Form đầy đủ 4 bước (info → phí → ký → NMLS) | **Đã có** — `/register-loan-officer` | `.../register-loan-officer/RegisterLoanOfficerForms/index.tsx:216` |
| Attribution qua URL `?ref=<unique_id>` + **khoá không cho sửa** | **Đã có** | `WebinarForm/index.tsx:258-267` · `BasicInfoForm/index.tsx:328-345` (`isDisabledRefer`) |
| Chuyển tiếp lead nhẹ → form đầy đủ, mang theo toàn bộ dữ liệu | **Đã có** | `GetInTouchSection/index.tsx:130-186` → `BasicInfoForm/index.tsx:300-326` |
| Lưu dở rồi quay lại làm tiếp | **Đã có** — API trả `key`, page reload sang `?key=<key>` | `RegisterLoanOfficerForms/index.tsx:521-527` |
| Enum `referred_source = 'recruiter'` → MOSO "Company Recruiter" | **Đã có** | `shared/constants/referred.ts` · `docs/moso-17007-…md` §3 |
| `unique_id` trên mỗi Admin của MOSO | **Đã có** | `register-loan-officer/page.tsx:69,111` |
| **Trang cá nhân hoá theo recruiter** | ❌ chưa có | — |
| **Sổ slug → recruiter (khi chưa có account)** | ❌ chưa có | — |
| **`unique_id` cho recruiter** (mới chỉ lấy cho loan officer) | ❌ chưa có | `register-loan-officer/page.tsx:113-121` — object recruiter chỉ có `{label, value}` |

Nói cách khác: hôm nay ta đã có thể tạo link `www.loanfactory.com/loan-officer?ref=<unique_id>`
và nó tự điền + khoá ô "ai giới thiệu bạn". Chỉ là (a) nó chỉ match loan officer chứ chưa match
recruiter, và (b) một query string thì không dán lên Facebook được.

---

## 1. Ba trục dữ liệu tuyệt đối không được gộp

Đây là điểm thiết kế quan trọng nhất, và nó không phải ý kiến của tôi — `recruit-be` đã trả giá
để tách ra rồi:

```
V017__hot_foundation_referred_source_settings.sql
  source           = KÊNH tạo ra bản ghi (WEB_FORM, WEBINAR, EVENT_RSVP, REFERRAL, FB_ADS)
                     → quyết định HOT/COLD và SLA chạm đầu tiên. Là config, không phải code.
  referred_source  = thứ NGƯỜI TA TỰ KHAI khi được hỏi "bạn biết Loan Factory từ đâu"
```

`V043`/`V044` còn đi xa hơn: `company_name` (đã thẩm định, từ Modex) được tách khỏi
`self_reported_company` (người tự khai), vì *"trộn hai nguồn làm hỏng provenance"*.

Yêu cầu mới thêm vào **trục thứ ba mà cả hai đều không diễn tả được**:

> **Ownership — lead này thuộc về recruiter nào.**

Và đây là chỗ dễ sai nhất: hôm nay lf-homepage đang nhét quyền sở hữu vào `referred_by` bên
trong `referred_source = 'recruiter'` — tức là **dùng một ô tự-khai làm sổ đỏ**. Với form thường
thì chấp nhận được (người dùng tự chọn). Với landing page riêng thì **không**: khi lead đến từ
`/join/seth-august`, "ai giới thiệu" không còn là câu hỏi khảo sát, nó là **sự thật mà URL đã
biết trước**. Phải ghi nó như một dấu máy đóng, tách khỏi ô tự khai.

Hệ quả cụ thể — **đừng** đặt `source = RECRUITER_PAGE`. Loại 1 được mô tả là "post lên
Facebook", nên một lead hoàn toàn có thể là: kênh `FB_ADS` + bề mặt `landing page của Seth` +
tự khai `friend_family`. Gộp bề mặt vào kênh là mất thông tin ngay ở lead đầu tiên.

---

## 2. Đường dữ liệu hôm nay (đã đo, không suy đoán)

```
/loan-officer?ref=<unique_id>
   │  WebinarForm: tìm LO theo unique_id → set referred_source + referred_by → KHOÁ ô
   ├─ (Loại 1) Submit  → registerWebinar         → MOSO  → LORecruiting (lead)
   └─ "Register now"   → /register-loan-officer?first_name=…&referred_source=…&referred_by=…
                              │ BasicInfoForm đọc query, set + KHOÁ referral
                              └─ Submit → registerLoanOfficer {kind:'LORecruiting'}
                                          → trả `key` → reload sang ?key=<key>  (làm tiếp sau)
```

Ba sự thật rút ra:

1. **Loại 1 và Loại 2 ghi vào CÙNG một loại bản ghi** (`LORecruiting`). Khác nhau chỉ ở
   `complete_percentage` và số field đã điền. Không có hai kho dữ liệu.
2. **`key` chính là cây cầu giữa hai loại.** Ứng viên điền Loại 1 xong, sau này recruiter gửi
   `…/register-loan-officer?key=<key>` là họ mở lại đúng hồ sơ dở dang, không phải gõ lại.
   Đây là thứ đắt giá nhất đang có sẵn và hiện **chưa ai dùng cho mục đích này**.
3. **`referred_by` luôn là email**, và MOSO tự resolve `referred_by → referred_lo` bằng cách
   khớp `Admin.company_email` (`docs/moso-17007-…md` §3.1). Nghĩa là attribution chỉ "nối" được
   khi recruiter có bản ghi Admin — chính là cái account HR sắp tạo.

---

## 3. Trả lời câu hỏi khó nhất: "unique key khi chưa có account"

### 3.1 Nguyên tắc: slug (URL) ≠ identity (khoá attribution)

Đây là chỗ hầu hết hệ thống làm sai và phải trả giá lúc migrate. Hai thứ này thay đổi vì hai lý
do khác nhau:

- **slug** đổi khi người ta đổi tên, đổi thương hiệu, hoặc gõ nhầm → nhưng link đã in trên
  card, đã dán trên Facebook, đã nằm trong QR.
- **identity** đổi khi HR tạo account thật → nhưng dữ liệu cũ phải nối liền được.

Nếu dùng slug làm khoá thì đổi tên = mất attribution. Nếu dùng khoá làm URL thì được
`/join/rp_7f3a91c2` — không ai dán cái đó lên Facebook. Best practice của vanity URL nói rõ:
URL phải sạch, gần với ngôn ngữ nói, **và không được đổi thường xuyên** vì nó phá QR và bản in
([Bitly](https://bitly.com/blog/vanity-url-best-practices/), [Linemark PURL guide](https://www.linemark.com/personalized-urls-purls-for-direct-mail-the-2026-strategic-guide/)).

→ **Tách hẳn hai cột, nối bằng một sổ đăng ký.**

### 3.2 Sổ đăng ký `recruiter_pages`

```jsonc
{
  "slug": "seth-august",              // trong URL. Đổi được. Slug cũ → 301 sang slug mới.
  "page_id": "rp_7f3a91c2",           // khoá nội bộ, sinh 1 lần, KHÔNG BAO GIỜ đổi.
  "active": true,

  // Hiển thị trên trang — recruiter không tự sửa được (xem §6 compliance)
  "display_name": "Seth August",
  "title": "Outside Recruiter",
  "photo": "https://…",
  "covers_states": ["HI", "CA"],
  "calendly": "https://calendly.com/…",
  "phone": "+1…",

  // Attribution — phần duy nhất sẽ đổi khi HR cấp account
  "attribution": {
    "kind": "interim",                // "interim" → "moso_admin" khi có account
    "email": "seth.august@loanfactory.com",   // LUÔN gửi lên MOSO, kể cả khi chưa có Admin
    "unique_id": null,                // HR cấp xong thì điền vào đây
    "moso_admin_key": null
  },

  "default_mode": "lead"              // "lead" | "full"
}
```

**Vì sao `email` phải có ngay từ đầu, kể cả khi chưa có account:** MOSO nhận `referred_by` là
một chuỗi email và *lưu bình thường*; nó chỉ **không resolve được** sang `referred_lo` khi chưa
có Admin nào mang email đó. Tức là dữ liệu **không mất** — chỉ thiếu cái link. Khi HR tạo Admin
với đúng email đó, backfill là một câu query, không phải một dự án. Ngược lại, nếu bây giờ ta
bịa ra một khoá riêng rồi mai mốt mới map, ta tự tạo ra việc đối soát cho chính mình.

→ **Interim key = email công ty của recruiter.** Không phát minh khoá mới. Nếu recruiter ngoài
chưa có email `@loanfactory.com`, xin HR cấp *email trước, account sau* — email là thứ rẻ nhất
và là khoá join của cả hệ thống.

### 3.3 Ghi bề mặt vào `lo_labels` — cơ chế đã có, đã chứng minh

Vấn đề: `RegisterLoanOfficerRequest` (`src/apis/moso-types.ts:1481`) **không có** field nào cho
"lead này đến từ landing page nào". Cũng không có `utm_campaign`.

Nhưng after-party đã giải bài này rồi: nó nhét tên sự kiện vào **`lo_labels`**, và `recruit-be`
đã có sẵn máy đọc ngược:

```sql
-- V038__seed_event_rsvp_label_patterns.sql
'source.event_rsvp.label_patterns' = ["After Party","LoanFactory Summit"]
-- "Thứ duy nhất nói lên nguồn là lo_labels … Thêm một sự kiện mới KHÔNG được đòi một lần deploy"
```

→ **Dùng lại đúng cơ chế đó**: gắn `lo_labels: ["Recruiter page · rp_7f3a91c2 · seth-august"]`,
rồi thêm một setting `source.recruiter_page.label_patterns` trong `recruit-be`. Không cần MOSO
làm gì mới, và bề mặt không bao giờ bị mất kể cả khi `referred_by` chưa resolve được.

Việc duy nhất phải xin MOSO/FE: thêm `lo_labels` vào payload của `registerLoanOfficer` từ
lf-homepage (API đã nhận field này — đường after-party chứng minh — chỉ là type FE chưa khai).

---

## 4. Hình dạng URL

Namespace gốc `www.loanfactory.com/<tên>` **đã bị chiếm**: lo-homepage phục vụ LO không có
custom domain dưới đúng dạng đó (`getLoDomain(null, path, 'jeremymcdonald')` →
`www.loanfactory.com/jeremymcdonald/...`). Nên landing page recruiter phải nằm dưới một segment
riêng.

| Phương án | Ưu | Nhược |
|---|---|---|
| `/loan-officer?ref=<id>` (dùng luôn cái đã có) | 0 dòng code mới | Không dán được lên FB/QR, không cá nhân hoá được hero, `?` vi phạm best practice vanity URL |
| `/recruiter/<slug>` | Rõ ràng | Đọc như trang *về* recruiter, trong khi độc giả là **ứng viên** |
| **`/join/<slug>`** ✅ | Động từ đúng với hành động, ngắn, dễ đọc qua điện thoại | Cần đăng ký segment mới |
| `<slug>.loanfactory.com` | Sang | DNS + cert + middleware cho từng người — quá sức cho V1 |

**Đề xuất: `/join/<slug>` (Loại 1) và `/join/<slug>/apply` (Loại 2).**

Chế độ là thuộc tính **của cái link**, không phải của trang. Hai path riêng để (a) recruiter
copy đúng link mà không phải nhớ tham số, (b) analytics tách sạch hai phễu, (c) không ai vô
tình gửi link "trả phí" cho một lead lạnh.

**Bắt buộc:** `robots: { index: false }` + canonical trỏ về `/loan-officer`. N bản gần-giống-hệt
nhau mà để Google index là tự tạo duplicate content. Các trang `-v1`/`-v3` trong repo đã làm
đúng vậy rồi, theo cùng khuôn.

---

## 5. Hai chế độ form

| | **Loại 1 — Lead** `/join/<slug>` | **Loại 2 — Apply** `/join/<slug>/apply` |
|---|---|---|
| Gửi cho ai | Đại trà: post FB, email blast, group | LO chuyên nghiệp đã nói chuyện rồi |
| Mục tiêu | Lấy được cách liên lạc + đủ để chấm nóng/lạnh | Chạy hết quy trình, kể cả trả phí |
| Bước | Chỉ 1 form ngắn | Before-you-begin → Basic info → Phí → Ký → NMLS |
| Dùng lại | `GetInTouchSection` của `/loan-officer` | `RegisterLoanOfficerForms` nguyên vẹn |
| Ghi vào | `registerWebinar` → LORecruiting | `registerLoanOfficer` → LORecruiting |
| Sau khi submit | Cảm ơn + đề nghị đặt lịch với recruiter | Đúng luồng hiện tại |
| Đường lên | Nút "I'm ready to join" → mang toàn bộ field sang `/apply` (cơ chế đã có) | — |

### 5.1 Cảnh báo về số field của Loại 1

Form GetInTouch hôm nay hỏi: tên, email, phone, **NMLS, licensed states, states to sponsor,
nhánh CA-DRE/DFPI, nhánh Indiana SOS, confirm sponsorship**, referral, note, consent. Với một
người vừa bấm vào từ Facebook thì đó là **quá nhiều** — mỗi field thêm vào là một phần trăm
chuyển đổi mất đi, và tất cả những field licensing kia chỉ có nghĩa khi người ta đã quyết định
nghiêm túc.

Đề xuất Loại 1 giữ đúng 6 ô: **họ tên · email · điện thoại · bang đang hành nghề · "Bạn đã có
NMLS chưa?" (có/chưa + số, không bắt buộc) · consent.** Toàn bộ phần licensing/sponsorship dời
sang Loại 2 — nơi nó vốn thuộc về. Nếu muốn giữ nguyên form hiện tại để đỡ việc, thì ít nhất
phải để mọi field licensing là optional ở chế độ lead.

> Đây là chỗ tôi khuyên khác với mô tả gốc ("dùng form register-loan-officer, chỉ lấy Step 1 và
> Step 2"). Step Basic Info của form đó bắt buộc: citizenship, địa chỉ nhà, địa chỉ nhận thư,
> licensed states, sponsor states, NMLS, loại LO, hai mức target compensation, acknowledgment.
> Đưa nguyên khối đó lên một link Facebook thì lead sẽ bỏ giữa chừng. Quyết định cuối là của
> anh — nhưng nếu chọn giữ nguyên, hãy chọn có ý thức chứ đừng để nó là mặc định.

---

## 6. Luật attribution — phải viết ra trước khi code

| Câu hỏi | Đề xuất | Vì sao |
|---|---|---|
| First-touch hay last-touch? | **First-touch**, cửa sổ 90 ngày | Tiền thưởng gắn vào đây. Last-touch biến việc gửi link thành cuộc đua cướp lead nội bộ |
| Ghi lúc nào? | **Lúc xem trang**, lưu cookie/localStorage; submit chỉ đọc lại | Người ta hay xem hôm nay, điền tuần sau. Chỉ ghi lúc submit là mất phần lớn |
| Ứng viên sửa được không? | **Không** — đã khoá sẵn (`isDisabledRefer`) | URL biết sự thật rồi |
| Nếu họ gõ tên recruiter khác? | URL thắng, **nhưng ghi lại cả hai** | Có vết để xử tranh chấp, không cãi nhau bằng trí nhớ |
| Email/NMLS đã tồn tại, chủ khác? | **Không tự đổi chủ.** Báo recruiter "đã có trong hệ thống" | `recruit-be` đã có `candidate_merges` + survivorship; đừng tạo đường vòng |
| Chưa có account HR? | Vẫn gửi email thật làm `referred_by` + slug trong `lo_labels` | Dữ liệu đủ, chỉ thiếu link — backfill bằng query |

---

## 7. Nội dung trang (bản phác — chờ duyệt trước khi code)

Nguyên tắc: **mọi câu chữ lấy từ copy đã duyệt trên `/loan-officer` và `/register-loan-officer`,
không tự nghĩ ra con số nào.** Chỉ phần "người recruiter" là mới.

Áp luôn luật Seth đã chốt cho hai trang program: **thông tin cơ bản đọc hết trong 60 giây ở
trên, phần chi tiết nằm dưới hoặc trong FAQ.**

**Above the fold — cá nhân hoá**
> *Ảnh recruiter, bên cạnh:*
> **"I'm Seth. I help loan officers move to Loan Factory — and I'll walk you through it."**
> Keep 100% of your commission. $595 a file. 240+ lenders. No desk fee, no monthly fee.
> `[ Talk to me first ]` `[ Start my application ]`

Cá nhân hoá phần hero là thứ có tác dụng thật: landing page đổi tiêu đề/nội dung theo nguồn
traffic chuyển đổi cao hơn hẳn bản chung chung
([Landingi](https://landingi.com/landing-page/41-best-practices/), [Instapage — recruitment landing pages](https://instapage.com/blog/recruitment-landing-pages)).

**§1 — 60 giây: bạn được gì** (4 ô, số lấy từ trang hiện có)
100% commission · $595/file · 240+ lenders · không phí bàn/phí tháng · nền tảng công nghệ ·
được sponsor license sang bang mới.

**§2 — Đổi sang đây thì khác gì** — bảng so sánh 2 cột: hôm nay ở chỗ cũ / ở Loan Factory.
Chỉ so những trục LO thật sự quan tâm: chia hoa hồng, phí, số lender, hỗ trợ underwriting,
marketing.

**§3 — Bằng chứng** — số LO đang làm, số lender (lấy động như `/our-lenders` đang làm),
video, review.

**§4 — Vào bằng cách nào** — 4 bước, **nói thẳng khoản phí khởi tạo ngay ở đây**. Giấu chi phí
tới bước 3 là cách nhanh nhất để mất niềm tin và làm recruiter mất công.

**§5 — Người đồng hành của bạn** — recruiter: là ai, phụ trách bang nào, đặt lịch (Calendly),
gọi/nhắn. Đây là toàn bộ lý do trang này tồn tại thay vì `/loan-officer`.

**§6 — FAQ** — sponsor license mất bao lâu · comp thật sự tính thế nào · phí khởi tạo gồm gì,
có miễn không · pipeline đang dở thì sao · NMLS chuyển ra sao.

**§7 — Form** (Loại 1 hoặc Loại 2) + consent + disclosure.

---

## 8. Những thứ KHÔNG làm

- **Không** đẻ thêm trang program thứ tư. Đây là bản cá nhân hoá của `/loan-officer`.
- **Không** cho Google index. `noindex` + canonical.
- **Không** để mỗi recruiter tự viết con số của mình. Đây là ngành bị quản lý: trang công khai
  mang tên một người và nói về hoa hồng phải mang đủ disclosure/NMLS/Equal Housing như phần còn
  lại của site. → **cần một vòng kiểm compliance trước khi mở**.
- **Không** đăng số điện thoại/email cá nhân khi chưa có đồng ý bằng văn bản của recruiter.
- **Không** gộp bề mặt vào `source` (xem §1).
- **Không** để slug là khoá attribution (xem §3.1).

---

## 9. Câu hỏi cần người khác chốt

| Hỏi ai | Câu hỏi |
|---|---|
| **HR** | Khoá chính thức của recruiter là `unique_id` hay `company_email`? Recruiter ngoài (Seth) có được cấp email `@loanfactory.com` không, và bao giờ? |
| **Seth / Victoria** | First-touch hay last-touch? Cửa sổ bao lâu? Lead trùng đã có chủ thì xử sao? |
| **Thuan** | Trang này thuộc `lf-homepage` (www.loanfactory.com/join/…) hay `lo-homepage`? |
| **MOSO dev** | Cho `registerLoanOfficer` từ lf-homepage gửi kèm `lo_labels` (+ `utm_campaign`) — API đã nhận, chỉ FE chưa gửi. |

---

## 10. Lộ trình

**Phase 0 — chạy được trong vài ngày, không cần backend mới**
Sổ đăng ký là một file trong repo (3–5 recruiter đầu). `/join/<slug>` + `/join/<slug>/apply`.
Dùng lại `/loan-officer` sections + GetInTouch form (mode lead) và `RegisterLoanOfficerForms`
(mode full). Attribution qua `referred_source=recruiter` + `referred_by=<email>` + `lo_labels`.

**Phase 1 — sổ đăng ký lên moso-aid**, admin tự thêm recruiter + ảnh, không cần deploy.

**Phase 2 — HR cấp account**: điền `unique_id`/`moso_admin_key` vào sổ, `kind` → `moso_admin`,
backfill các bản ghi cũ theo email. **URL không đổi một chữ.**

**Phase 3 — `recruit-be` tiêu thụ**: đọc label → gán chủ sẵn cho lead (không thả vào hàng đợi
chung), SLA chạm đầu tiên 1 giờ theo `sla.first_touch_hours_by_source`, dashboard theo từng
trang.

**Đo lường (làm từ Phase 0):** mỗi trang phải có phễu riêng — *lượt xem → bắt đầu điền → submit
→ vào được*. Đó mới là con số dùng để đánh giá recruiter, và cũng là con số trả lời được câu
"link đại trà có đáng làm không".
