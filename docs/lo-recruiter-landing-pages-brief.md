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
`/join/rp_7f3a91c2` — không ai dán cái đó lên Facebook. (Phụ lục A.3: MOSO đã tách sẵn hai thứ này —
`Admin.url` là slug, `Admin.unique_id` là khoá — nên phần dựng registry ở §3.2 chỉ còn là bảng
hiển thị ảnh/tiểu sử, không phải nơi sinh khoá.) Best practice của vanity URL nói rõ:
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
| **`/join/<slug>` + `/apply/<slug>`** ✅ | Động từ đúng với hành động, ngắn, dễ đọc qua điện thoại, hai link đối xứng | Cần đăng ký 2 segment vào `pageSections()` |
| `<slug>.loanfactory.com` | Sang | DNS + cert + middleware cho từng người — quá sức cho V1 |

**CHỐT (31/08, sau khi đọc hệ cũ — xem Phụ lục A.6): `/join/<slug>` (Loại 1) và `/apply/<slug>` (Loại 2).**
Hai động từ, cùng một tầng, không có đuôi — nên không link nào là link hạng hai.

Chế độ là thuộc tính **của cái link**, không phải của trang. Hai path riêng để (a) recruiter
copy đúng link mà không phải nhớ tham số, (b) analytics tách sạch hai phễu, (c) không ai vô
tình gửi link "trả phí" cho một lead lạnh.

**Bắt buộc:** `robots: { index: false }` + canonical trỏ về `/loan-officer`. N bản gần-giống-hệt
nhau mà để Google index là tự tạo duplicate content. Các trang `-v1`/`-v3` trong repo đã làm
đúng vậy rồi, theo cùng khuôn.

---

## 5. Hai chế độ form

| | **Loại 1 — Lead** `/join/<slug>` | **Loại 2 — Apply** `/apply/<slug>` |
|---|---|---|
| Gửi cho ai | Đại trà: post FB, email blast, group | LO chuyên nghiệp đã nói chuyện rồi |
| Mục tiêu | Lấy được cách liên lạc + đủ để chấm nóng/lạnh | Chạy hết quy trình, kể cả trả phí |
| Bước | Chỉ 1 form ngắn | Before-you-begin → Basic info → Phí → Ký → NMLS |
| Dùng lại | `GetInTouchSection` của `/loan-officer` | `RegisterLoanOfficerForms` nguyên vẹn |
| Ghi vào | `registerWebinar` → LORecruiting | `registerLoanOfficer` → LORecruiting |
| Sau khi submit | Cảm ơn + đề nghị đặt lịch với recruiter | Đúng luồng hiện tại |
| Đường lên | Nút "I'm ready to join" → mang toàn bộ field sang `/apply/<slug>` (cơ chế đã có) | — |

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
| **Thuan** | Trang này thuộc `lf-homepage` (www.loanfactory.com/join/…) hay `lo-homepage`? — Phụ lục A.6 đã trả lời bằng kỹ thuật: lf-homepage, vì `/<slug>` của MOSO loại mất recruiter không phải LO. Vẫn cần Thuan xác nhận về mặt sản phẩm. |
| **MOSO dev** | Cho `registerLoanOfficer` từ lf-homepage gửi kèm `lo_labels` (+ `utm_campaign`) — API đã nhận, chỉ FE chưa gửi. |

---

## 10. Lộ trình

**Phase 0 — chạy được trong vài ngày, không cần backend mới**
Sổ đăng ký là một file trong repo (3–5 recruiter đầu), **giá trị slug lấy từ `Admin.url`, khoá lấy từ
`Admin.unique_id`** (Phụ lục A.2/A.3 — không tự chế). `/join/<slug>` + `/apply/<slug>`.
**Kèm bắt buộc:** xin MOSO thêm `join` và `apply` vào `pageSections()` để không ai bị tự sinh slug trùng.
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

---

# PHỤ LỤC A — Đọc hệ cũ (packs / moso / base / moso-configuration), 31/08/2026

> Đọc trên `origin/master` sau khi `git fetch` cả 4 repo. Kết luận: **§3 của brief này (tự dựng sổ
> đăng ký slug) là THỪA.** Hệ cũ đã có sẵn toàn bộ vòng đời slug, khoá định danh, và thậm chí một
> link giới thiệu cá nhân **đang chạy trên production**.

## A.1 Link giới thiệu cá nhân — ĐÃ CÓ, ĐANG CHẠY

```java
// packs/loan/.../client/view/InviteALoanOfficerForm.java:240
public static String loanOfficerInviteUrl() {
  return Core.baseUrl() + "/loan-officer?ref=" + App.currentUser().get(Admin.unique_id);
}
```

Có nút copy, và màn hình **"My Loan Officer Referrals"**
(`moso/src/main/java/com/lenderrate/client/view/interested_loan_officer/MyLoanOfficerReferrals.java:54`).
Thông báo khi copy (`LoanMessages.properties:832`):

> *"You can now share this link on any social media platform to invite other loan officers. The
> system will automatically recognize you as the referrer, ensuring that you receive credit for
> any loan officers who join through your link."*

Tức là **lời hứa đã được đưa ra với người dùng rồi**. Việc của chúng ta không phải phát minh link,
mà là **cho cái link đó một trang tử tế và một chế độ thứ hai**.

## A.2 "Unique key" HR sẽ cấp — chính là Associate ID, đã tồn tại

```java
// packs/loan/.../shared/entity/Admin.java:310
Field<Long> unique_id = TYPE.f("unique_id", "Associate ID", true, LongType.instance()).track();
```

Mọi Admin đều có. Seth August = `1004403`, Brayan Suarez = `1002273`, Miley Dau = `1002783`.
Ai đã có account thì **đã có khoá rồi** — không cần chờ, không cần bịa khoá tạm. Bài toán "chưa có
account" chỉ còn đúng với recruiter hoàn toàn mới chưa được tạo Admin.

## A.3 Vòng đời slug — đã build đầy đủ, đúng y hệt thiết kế §3.1

`HasMyPage.url`, cài trên `Admin`, `Branch`, `PartnerAgent`, `Agent`:

| Thứ tôi đề xuất tự làm ở §3 | Hệ cũ đã có |
|---|---|
| Sinh slug từ tên | `Admin.beforeCreated` tự sinh, đụng thì lấy email local-part, vẫn đụng thì thêm hậu tố ngẫu nhiên (`Admin.java:1845-1858`) |
| Chống trùng | `ReservedPageUrls.isTaken()` — soát route token, Template, Branch active, Admin active, PartnerAgent (`ReservedPageUrls.java`) |
| Đổi slug mà link cũ vẫn chạy | `previous_urls` giữ mọi slug cũ + tự invalidate cache (`Admin.java:1991-2006`) |
| Người dùng tự chọn slug trùng | Ném lỗi rõ: *"This link is already in use. Please choose another one."* |

→ **Không dựng registry mới.** Dùng `Admin.url` làm slug và `Admin.unique_id` làm khoá.

## A.4 Dạng URL mà hệ cũ đã chọn cho trang hành động cá nhân

```java
// packs/loan/.../server/op/partner_agent/ReferralAgentInvitationOp.java:35
String inviteUrl = Server.baseUrl()
        + (partnerUser.hasValue(PartnerAgent.url) ? "/" + partnerUser.get(PartnerAgent.url) : "")
        + "/apply?partner_email=" + ... ;
```

Tức là **`/<slug-người>/<hành-động>`** — slug trước, hành động sau. Đây là tiền lệ trong nhà cho
cuộc tranh luận `/join/<slug>` hay `/<slug>/join`.

## A.5 Giới hạn quyết định: `/<slug>` chỉ phục vụ người là loan originator

```java
// packs/loan/.../shared/entity/Admin.java:1136
should_have_domain = (role.isLoanOriginator() || role.isRealEstateAgent()
        || (role.isOriginatorAssistant() && hasValue(originator_assistant_nmls)))
        && !role.isBrokerOrAssistant();
```

`AdminPages.findRoot` chỉ nhận admin `active && should_have_domain && !is_pending_loan_officer`,
và cả nhánh này còn bị chặn bởi cờ cấu hình `associate_landing_page`.

→ Seth August (Loan Officer + Outside recruiter) **có** trang `/seth-august`.
→ Một inside recruiter thuần, không phải LO, **không có** — dù vẫn có slug làm giá trị.

Đây là lý do quyết định cho việc chọn dạng URL ở A.6.

## A.6 Hai phương án URL, và khuyến nghị

| | **A. `/seth-august/join` + `/seth-august/apply`** | **B. `/join/seth-august` + `/apply/seth-august`** |
|---|---|---|
| Giống tiền lệ trong nhà | ✅ đúng `ReferralAgentInvitationOp` | ✖ dạng mới |
| Vòng đời slug | ✅ miễn phí, MOSO lo hết | ✅ vẫn dùng `Admin.url`, chỉ khác chỗ đặt |
| Chạy cho recruiter KHÔNG phải LO | ✖ **không** (`should_have_domain`) | ✅ có |
| Nằm ở repo nào | **lo-homepage** (MOSO route `/<slug>` đẩy sang đó qua `x-base-path`) | **lf-homepage** — nơi đã có `/loan-officer`, `/register-loan-officer`, `/lo-recruiter-program` |
| Việc phải làm thêm | bật `should_have_domain`/`associate_landing_page` cho recruiter | đăng ký `join` + `apply` vào `pageSections()` để không ai bị slug trùng |

**Khuyến nghị: B.** Lý do duy nhất nhưng đủ mạnh — nhóm cần trang này nhất (inside recruiter,
outside recruiter không phải LO) chính là nhóm mà phương án A loại ra. Toàn bộ nội dung tuyển LO
cũng đang nằm ở lf-homepage.

**Việc bắt buộc kèm theo B:** thêm `join` và `apply` vào `Server.appConfig().pageSections()` bên
MOSO. Không làm, một ngày nào đó có người tên trùng được tự sinh slug `join` và chiếm mất route.

## A.7 Một lỗi đang tồn tại, nên báo dù có làm dự án này hay không

Nút copy ở A.1 phát cho **mọi associate** link `/loan-officer?ref=<unique_id>` kèm lời hứa "hệ
thống sẽ tự nhận ra bạn là người giới thiệu". Nhưng phía lf-homepage:

```ts
// loan-officer/_sections/GetInTouchSection/WebinarForm/index.tsx:260
const refLO = dataProps.loanOfficers.find((lo) => lo.unique_id === refKey)
if (refLO) { setValue('referred_source', REFERRED_VALUES.LOAN_OFFICER); ... }
```

và `loanOfficers` chỉ gồm admin thoả `!is_broker && active && is_loan_originator`
(`loan-officer/page.tsx:184`), còn mảng `recruiters` được dựng **không kèm `unique_id`**
(`register-loan-officer/page.tsx:113`).

Hệ quả, hai mức:

1. **Recruiter không phải loan originator** → không có trong `loanOfficers` → link im lặng không
   ghi nhận gì. Lời hứa trong thông báo là sai.
2. **Recruiter là loan originator** → có ghi nhận, nhưng luôn bị đóng dấu
   `referred_source = loan_officer`, không bao giờ là `recruiter`. Bên MOSO nó rơi vào
   *Word of Mouth / Current LF LO* thay vì *Word of Mouth / Company Recruiter* — sai ô báo cáo.

Cần xác minh trên dữ liệu thật rồi mở ticket riêng.

## A.8 Quà mới có từ hôm qua — dùng ngay được

`packs` master `18153ee957` (merge 31/08) thêm vào `LORecruiting`:

```java
Field<Date>   last_registration_at    // KHI nào một lượt đăng ký công khai tới
Field<String> last_registration_event  // = lo_labels.get(0), tức NHÃN ĐẦU TIÊN client gửi
```

Chỉ `RegisterInterestedLoanOfficer` (đường form công khai) mới đóng dấu; admin sửa tay trong back
office đi qua `SaveOp` thường nên **không** chạm vào.

Ý nghĩa cho dự án này: **tốt hơn hẳn đề xuất §3.3 (dựa vào `lo_labels`).** `lo_labels` là danh sách
unique, không thứ tự, nên đăng ký lại lần hai không đổi gì. Còn `last_registration_event` là
một-giá-trị-mới-nhất-thắng. Nếu trang gửi `lo_labels: ["Recruiter page · seth-august"]` thì ta có
ngay **"lần gần nhất người này giơ tay là qua trang của ai, lúc nào"** — chính là dữ liệu để phân
xử first-touch vs last-touch ở §6.

**Ràng buộc phải tuân:** field lấy `labels.get(0)`, nên nhãn trang recruiter phải là **phần tử đầu
tiên**, hoặc tốt nhất là nhãn duy nhất.

---

# Phụ lục B — Đo trên production 31/08: Seth là NGOẠI LỆ, không phải mẫu đại diện

Viết sau khi Bao hỏi thẳng: *"Tại sao là chạy thật với 1 recruiter vậy? … recruiter này chưa có
(chưa tuyển được hoặc chưa có account chính thức trong MOSO)"*. Câu hỏi đúng. Đề xuất Phase 0 cũ
(chạy thật với Seth) dựa trên một giả định chưa ai đo. Đo rồi thì giả định đó **sai**.

## B.1 Phép đo

`curl https://www.loanfactory.com/<slug>`, so `<title>` và số byte:

| Người | Vai trò trong MOSO | Kết quả |
|---|---|---|
| Seth August | Loan Officer **+** Outside recruiter | `/sethaugust` → *"…From Seth August"*, 1.102.178 byte — **trang thật** |
| Brayan Suarez | Inside recruiter | → trang chủ marketing |
| Miley Dau | Onboarding specialist | → trang chủ |
| Dave Hoang | HR | → trang chủ |
| Rosaline Pham | Accounting | → trang chủ |
| Dung Nguyen | Licensing | → trang chủ |

**Đối chứng âm** (bắt buộc, nếu không thì "ra trang chủ" đứng chung chỗ với "phép đo hỏng"):
`/zzzznobody999` cũng ra trang chủ, **1.249.518 byte — trùng khít 5 dòng dưới**. Vậy 5 dòng đó
thật sự KHÔNG có slug, không phải curl sai.

Đối chứng dương thứ hai: `/jeremymcdonald` (slug lấy từ docstring
`lo-homepage/src/shared/utils/lo-domain.ts:36`) ra đúng trang Jeremy McDonald, 781.182 byte.

## B.2 Nguyên nhân trong code — không phải ngẫu nhiên

`Admin.java:1136`:

```java
should_have_domain = (role.isLoanOriginator() || role.isRealEstateAgent()
        || (role.isOriginatorAssistant() && có originator_assistant_nmls))
        && !role.isBrokerOrAssistant();
```

`RECRUITER` / `OUT_SOURCING_RECRUITER` **không nằm trong danh sách**. Sinh slug tự động ở
`Admin.java:1843` gác sau `should_have_domain` → recruiter thuần không bao giờ được cấp slug.

Seth có slug **vì anh ấy là loan officer**, không phải vì anh ấy là recruiter.

## B.3 Hệ quả: P2 cũng sẽ không có slug

Hai quần thể khác nhau, đừng gộp:

- **P1** — recruiter đã có trong MOSO hôm nay. Có `Admin` + `unique_id`. Đa số **không** có slug.
- **P2** — recruiter tuyển được từ `/lo-recruiter-program`. Chưa có account. Đây là quần thể Bao
  đang nói tới.

Copy của chính trang tuyển (`RecruiterProgramV3Page.hero`) nói rõ P2 là ai:
*"A full-time job at Loan Factory" · "Recruiting loan officers is the whole job." · "Full-time
role, not a side program."*

⇒ P2 là recruiter **toàn thời gian, không phải LO** ⇒ role `RECRUITER`/`OUT_SOURCING_RECRUITER`
⇒ theo B.2, **không có slug**. Cùng cái hố với đa số P1.

Nói cách khác: Phase 0 chạy với Seth chứng minh đường ống chạy được trên **đúng một người mà
chương trình này không nhắm tới**. Nó không nói gì về người mà ta thật sự sẽ phục vụ.

## B.4 Slug thật không có gạch nối

`Admin.java:1845`: `(first_name.replaceAll("[\\W_]","") + last_name.replaceAll("[\\W_]","")).toLowerCase()`

⇒ Seth = `sethaugust`, không phải `seth-august`. Đã xác nhận bằng curl (B.1).

Mockup và §4 đang vẽ `/join/seth-august` ⇒ **không khớp `Admin.url`**. Chỉ có hai lối, không có
lối thứ ba:

- **B4-a — dùng thẳng `Admin.url`:** URL thành `loanfactory.com/join/sethaugust`. Xấu hơn, nhưng
  MIỄN PHÍ: đã có sinh tự động, đã có chống trùng `ReservedPageUrls`, đã có `previous_urls` giữ
  link cũ khi đổi tên. Nhược: recruiter thuần **không có giá trị này** (B.2) → vẫn phải cấp tay.
- **B4-b — slug riêng của hệ tuyển dụng:** `seth-august` đẹp hơn và cấp được cho cả người chưa
  có `Admin`. Nhược: đúng thứ Phụ lục A khuyên tránh — slug thứ hai phải tự sinh, tự chống trùng,
  tự giữ alias khi đổi tên, và **tự đồng bộ** khi `Admin.url` đổi.

Ghi chú: A khuyên tránh B4-b vì tưởng `Admin.url` phủ hết. B.2 cho thấy nó **không** phủ hết đúng
quần thể mục tiêu — nên lời khuyên đó phải đọc lại, không áp dụng máy móc.

## B.5 Phase 0 sửa lại

Không lấy một người. Lấy **hai**, để cả hai hình dạng đều bị chạm:

1. **Seth (`sethaugust`)** — có `Admin` + `unique_id` + slug. Đường dễ. Chứng minh: link → trang →
   form → attribution về đúng `referred_by`/`referred_source` trong MOSO.
2. **Một recruiter thuần** (Brayan là ứng viên sẵn có) — có `Admin` + `unique_id`, **không** slug.
   Đường thật. Chứng minh: cấp slug bằng cách nào, và attribution có còn về đúng chỗ không khi
   người này không phải LO — nhớ đây chính là defect `agentflow-mxm6(a)`: dropdown "Referral
   recruiter" đang **bỏ sót** hẳn nhóm này.

Chỉ khi (2) chạy được thì mới nói được gì về P2. Và làm (2) buộc phải chốt B4-a hay B4-b — nên
quyết định đó không hoãn được sang sau.

## B.6 Đã sửa lại nhận định nào

- §10 Phase 0 "slug lấy từ `Admin.url`" — **đúng cho P1-có-LO, sai cho P2**. Xem B.4.
- Phụ lục A "MOSO đã có sẵn slug, đừng tự dựng registry" — **đúng một nửa**. Có sẵn, nhưng chỉ cho
  loan originator / real estate agent. Xem B.2.

## B.7 Đếm trên production 31/08 — con số quyết định

Nguồn: `GET www.loanfactory.com/api/webplus/v1/5716104026521600/getAdmins` — chính endpoint
`fetchAdmins()` mà `/register-loan-officer` đang dùng. Lọc `active && !is_broker && !is_unassigned`.

| | Số |
|---|---|
| Associate active, không phải broker | 2.988 |
| **Recruiter (inside 9 + outside 3)** | **12** |
| … đồng thời là loan officer → **có** slug | **2** |
| … không phải loan officer → **không** slug | **10** |

Và mức độ phổ quát của quy tắc `should_have_domain`:

| | Có `Admin.url` |
|---|---|
| `is_loan_originator` = true (2.687 người) | 2.685 — **99,93 %** |
| `is_loan_originator` = false (301 người) | **0** |

**Đối chứng dương** (bắt buộc, nếu không thì "0" đứng chung chỗ với "payload không trả field đó"):
2.685 hàng trong chính payload ấy CÓ mang `url`. Vậy số 0 là **vắng mặt thật**.

⇒ Quy tắc ở B.2 không phải xu hướng, nó là tuyệt đối: **ngoài loan originator ra, không ai có slug.**

### Hệ quả 1 — cho quyết định B4

`Admin.url` phủ được **2 trong 12** recruiter hiện tại (17 %). 10 người còn lại phải cấp tay dù
chọn phương án nào. Xem B.8.

### Hệ quả 2 — định lượng cho `agentflow-mxm6(a)`

Dropdown *"Referral recruiter"* dựng bên trong `if (… && admin.is_loan_originator)` nên nó hiện
đúng **2 trong 12** recruiter. **10 người vô hình** — ứng viên do họ tuyển không có đường nào khai
đúng tên người giới thiệu. Con số này đóng nốt phần còn thiếu của acceptance criteria bead đó.

## B.8 So B4-a và B4-b theo số thật

Điểm mấu chốt: **B4-a không thay thế được đường cấp tay, nó chỉ cộng thêm vào.**

| | B4-a — dùng `Admin.url` | B4-b — slug riêng của hệ tuyển dụng |
|---|---|---|
| Phủ được ngay | 2/12 | 12/12 |
| Recruiter thuần | vẫn phải cấp tay | cùng một đường |
| Recruiter tương lai (P2, full-time) | vẫn phải cấp tay | cùng một đường |
| Số cơ chế phải nuôi | **2** + một luật phân xử cái nào thắng | **1** |
| Dạng URL | `/join/sethaugust` | `/join/seth-august` |
| Chống trùng | MOSO lo, nhưng chỉ cho nhánh có slug | ta lo, trong bảng của ta |
| Đổi tên giữ link cũ | có `previous_urls`, nhưng ta vẫn phải tự tra | ta tự quyết — hoặc **bất biến**, xem dưới |

Ba thứ B4-a phải trả thêm mà nhìn qua không thấy:

1. **Hai nguồn slug trong cùng một namespace `/join/<x>`** → phải chống trùng chéo giữa slug tay
   và `Admin.url`, và phải có luật khi một recruiter *về sau* được bật cờ LO: `Admin.url` đột nhiên
   xuất hiện — link cũ đổi hay giữ? Câu này không có câu trả lời nào không đau.
2. **Link marketing bị buộc vào slug cá nhân của LO.** `Admin.url` là tài sản thương hiệu, LO đổi
   được. Link in trên card / gửi mass email / dán QR mà đổi theo là hỏng. B4-b cho phép chọn
   **slug bất biến** — với link theo dõi thì bất biến là *tính năng*, không phải hạn chế.
3. **Lối tắt "bật `is_loan_originator` cho recruiter để lấy slug" là bẫy, đừng đi.** Đọc
   `Admin.java` `beforeSave`: bật cờ đó kéo theo khởi tạo GMB onboarding (2143), gán escrow mặc
   định + `ensureDefaultClosingFee` (2265-2271), **kiểm tra MLO compensation có thể `throw` chặn
   luôn lệnh lưu** (2286-2291), set `ca_dre_licenses` và đồng bộ `RealEstateService` (2293-2305).
   Tức là đẩy một nhân viên tuyển dụng vào toàn bộ đường ống vận hành của loan officer, để đổi lấy
   một chuỗi ký tự.

Một điều chỉnh so với ghi chú trước: nỗi lo *"phải xin MOSO reserve `join`/`apply` trong
`pageSections()`"* nhẹ hơn tôi viết. `/join/<slug>` và `/<slug>` là hai độ sâu khác nhau; ai đó
có slug `join` sẽ chiếm `/join` (một đoạn), **không** phá `/join/<slug>`. Vẫn nên reserve cho sạch,
nhưng nó không còn là điều kiện chặn.

**Khuyến nghị: B4-b.** Không phải vì nó đẹp hơn, mà vì đằng nào cũng phải xây đường cấp tay cho
10/12 người hôm nay và cho toàn bộ P2 ngày mai — xây một lần dùng cho tất cả, hơn là nuôi hai cơ
chế song song rồi phải nhớ ai thuộc nhánh nào.

## B.9 Code sửa ở đâu — đo 31/08

### Phát hiện nền: MOSO làm router, `/<slug>/*` là namespace của nó

`www.loanfactory.com` đứng trước **hai app Next.js khác nhau** (chứng minh: chunk `1225` khác hash
giữa `/` và `/sethaugust`). MOSO ở phía trước phân luồng:

| URL | Đi tới | Bằng chứng |
|---|---|---|
| `/our-lenders` | **lf-homepage** | title *"Our Lenders \| 240+ …"* |
| `/sethaugust/our-lenders` | **lo-homepage** | title *"… \| Seth August"* — tên được ghép vào |
| `/sethaugust/lo-recruiter-program-v1` | lo-homepage, route không có → về trang chủ Seth | |
| `/api/webplus/v1/…` | MOSO | |

Cơ chế: MOSO tra slug (kể cả custom domain kiểu `briannahomeloans.com`) → **cắt slug khỏi path**,
tiêm header `x-moso-user-id` = key của LO, rồi mới chuyển sang lo-homepage. Cả hai app đọc header
này (`lf-homepage/.../lo-info-check/page.tsx:77`, `lo-homepage/.../equity-line/page.tsx:72`).

**Hệ quả cho lựa chọn URL — một lý do nữa chọn `/join/<slug>`:** dạng cũ `/<slug>/join` (kiểu
`ReferralAgentInvitationOp` dùng cho partner agent) rơi vào namespace MOSO đang quản → phải sửa
**router MOSO + lo-homepage**. `/join/<slug>` có `join` ở segment đầu, không phải slug nào cả, nên
rơi thẳng về lf-homepage — **không đụng router**.

### Việc phải làm, chung cho cả hai phương án

1. **lf-homepage** — phần lớn nhất. Route `/join/[slug]` + `/apply/[slug]`; tự tra slug → recruiter
   (MOSO **không** tiêm header ở đây vì `join` không phải slug); form hai chế độ; prefill và khoá
   `referred_source` + `referred_by`.
2. **lo-homepage** — chỉ khi muốn trang chạy cả dưới domain riêng của LO. Bỏ qua được ở Phase 0.
3. **MOSO (packs)** — **không bắt buộc.** `RegisterLoanOfficerRequest` (`moso-types.ts:1481`) đã có
   sẵn `referred_source` + `referred_by`, nên phần "ai giới thiệu" chạy được ngay hôm nay. Chỉ khi
   muốn biết **đến từ trang nào** mới cần thêm `lo_labels` vào `registerLoanOfficer` — để tận dụng
   `last_registration_event` ở A.8. Xếp Phase 2.

### Chỗ hai phương án khác nhau: nơi cất slug

| | B4-a | B4-b |
|---|---|---|
| Nguồn slug | `Admin.url`, **`getAdmins` đã trả sẵn** → 0 dòng MOSO | một nơi mới |
| Phủ | 2/12 | 12/12 |
| 10 người còn lại | **vẫn phải thêm nơi lưu mới** | cùng nơi đó |
| Tổng số nơi lưu | 2 | 1 |

**Nơi lưu cho B4-b nên là `moso-aid`, KHÔNG phải MOSO packs.** moso-aid là backend Node/Mongo mà
lf-homepage vốn đã gọi (`getLOInfo` → `GET /api/lo-setting?key=`). Thêm một collection
`recruiter → slug` + 2 endpoint (resolve công khai, CRUD cho admin) là xong. Tránh hẳn việc phải
đụng entity GWT, chờ review MOSO, và chờ deploy hệ cũ.

⇒ Đính chính một hiểu lầm dễ mắc: **B4-b không có nghĩa là phải sửa hệ cũ.** Cả hai phương án đều
gần như không đụng MOSO; khác nhau ở chỗ B4-a bắt ta nuôi *hai* nguồn slug thay vì một.

---

# Phụ lục C — Trả lời hai câu của Bao (31/08): lấy info recruiter, và báo cho MOSO ai giới thiệu

Bao đặt lại vấn đề, đúng hơn cách chúng ta đang bàn: recruiter rồi cũng được cấp account MOSO như
HR / Licensing / Accounting, nên mỗi người đã có định danh duy nhất. Việc còn lại chỉ là hai câu.

## C.1 — Câu 2 trước, vì nó đã xong sẵn: MOSO biết ai giới thiệu bằng cách nào

**Không phải viết gì cả.** `LORecruiting.java:669-678` đã có:

```java
if (bean.is(referred_source, LoanOfficerReferredSource.recruiter)) {
  if (bean.hasValue(referred_by)) {
    find(Admin.TYPE)
      .whereEquals(Admin.company_email, bean.get(referred_by))
      .whereEquals(Admin.active, true)
      .whereEquals(Admin.is_lock, false)
      .list().stream()
      .filter(admin -> admin.get(Admin.role).isAnyRecruiter())   // <-- KHÔNG đòi is_loan_originator
      .findFirst()
      .ifPresent(a -> bean.set(recruiter, a.keyName()));
  }
}
```

Và `LORecruiting` có hẳn FK riêng cho việc này (`:159` `referred_lo`, cùng chỗ với `recruiter`).
Tức MOSO đã coi "recruiter nào sở hữu ứng viên này" là khái niệm hạng nhất, không phải chắp vá.

**Cách dùng:** form gửi đúng hai field đã có trong `RegisterLoanOfficerRequest`
(`moso-types.ts:1481`):

```
referred_source = "recruiter"                    // hằng số có sẵn, referred.ts:4
referred_by     = "<company_email của recruiter>"
```

MOSO tự tra `company_email` → kiểm `role.isAnyRecruiter()` → set FK `recruiter`. **Zero dòng Java.**

Ba điều đáng chú ý:

1. Nhánh recruiter **không đòi `is_loan_originator`** → chạy đúng cho cả 10 recruiter thuần. Đây là
   khác biệt then chốt so với dropdown ở FE (`agentflow-mxm6`), nơi điều kiện LO bị lồng vào và
   loại mất họ. **Backend đúng, frontend sai** — nên đây là bug FE thuần, không cần MOSO vá.
2. Nhánh `else if (referAdmin.is(is_loan_originator))` ở `:658-661` **ghi đè**
   `referred_source` thành `loan_officer`. Đây chính là gốc của defect (c): FE gửi sai loại thì
   MOSO đóng dấu lại theo LO. Gửi đúng `recruiter` thì không bị.
3. Điều kiện lọc gồm `active && !is_lock` → recruiter nghỉ việc thì link của họ ngừng quy công,
   im lặng. Hành vi này hợp lý, nhưng phải biết để không đi tìm bug.

## C.2 — Câu 1: lấy thông tin recruiter để render trang

**Dữ liệu đã có sẵn, công khai, không cần auth.** Chính endpoint `getAdmins` mà
`/register-loan-officer` đang gọi đã trả về đủ cho **cả 12/12 recruiter, kể cả 10 người không phải
LO**. Đếm ngày 31/08:

| Field | 12 recruiter | 10 người không phải LO |
|---|---|---|
| `key` (khoá MOSO), `unique_id`, `company_email` | 12 | 10 |
| `first_name`, `last_name`, `title` | 12 | 10 |
| `preferred_languages`, `member_of_departments`, `office_location` | 12 | 10 |
| `avatar` | 11 | 9 |
| `company_phone` | 11 | 9 |
| `url`, `originator_nmls`, `licenses`, `experience` | 2 | **0** |

Nhóm cuối toàn field **riêng của loan officer** — trang recruiter không cần. Mọi thứ cần để dựng
một trang cá nhân hoá (ảnh, tên, chức danh, ngôn ngữ, văn phòng, email, điện thoại) **đã có**.

⇒ Không phải xây nguồn dữ liệu mới. Nhưng **phải xây một endpoint gọn** — xem C.4.

## C.3 — Điều này giải tán luôn tranh luận B4-a / B4-b

Bao nói đúng chỗ mấu chốt: *"mỗi account sẽ có name hoặc company email unique khác nhau để định
danh"*. Đo lại thì `company_email` **chính là** khoá mà MOSO dùng để quy công (C.1). Vậy đừng đẻ
thêm slug nào cả:

> **slug = phần trước `@` của `company_email`, đổi `.` thành `-`**

| company_email | URL |
|---|---|
| `seth.august@loanfactory.com` | `/join/seth-august` |
| `baotrinh@loanfactory.com` | `/join/baotrinh` |

Đúng dạng URL Bao muốn từ đầu, và đúng ví dụ Bao đưa. Đo trên production:

- **0 trùng** trên 12 recruiter.
- **0** local-part chứa ký tự không an toàn cho URL (toàn bộ 2.988 người).
- Có sẵn cho 12/12 hôm nay, và cho mọi recruiter tương lai **ngay khi HR tạo account**.
- **Không cần bảng lưu nào** — không B4-a, không B4-b, không collection ở moso-aid.

Điểm mạnh thật sự không phải là "đỡ một bảng", mà là: **slug và khoá quy công là cùng một thứ.**
Không có mapping nào để lệch, không có job đồng bộ nào để hỏng, không có câu hỏi "người này vừa
được bật cờ LO thì link đổi không".

**Bốn cảnh báo phải xử, không được bỏ qua:**

1. **Trùng across domain.** 3 trùng trên 2.988 người, vì không phải ai cũng `@loanfactory.com`
   (1/12 recruiter dùng `@elitemtgconsulting.com`). Resolver phải **phát hiện trùng và trả lỗi**,
   tuyệt đối không im lặng lấy người đầu tiên — quy công sai người là hỏng tiền, không phải hỏng UI.
2. **Đừng map ngược `-` → `.`.** 2/2.988 local-part vốn đã có dấu `-`, nên `a-b-c` có thể ứng với
   `a-b.c` hoặc `a.b.c`. Cách đúng: **tính slug xuôi** cho từng recruiter rồi so khớp — ta đằng nào
   cũng phải có danh sách recruiter để render.
3. **Đổi email thì link gãy.** Hiếm với nhân viên, nhưng nếu sau này có recruiter cần link cố định
   (in card, QR) thì thêm một cột `slug_override` — lúc đó mới cần, không phải bây giờ (YAGNI).
4. **Slug lộ local-part email công ty.** Với nhân viên thì chấp nhận được (nó nằm sẵn trên name
   card), nhưng phải nói ra để HR biết chứ không phát hiện sau.

## C.4 — Một defect hiệu năng có sẵn, đừng cộng thêm vào

`fetchAdmins()` gọi `mosoGet(..., {})` → `cacheRevalidate = 0` → `next: { revalidate: 0 }`
(`mosoApi.ts:41-51`) → **không cache**. Payload đo được **16,5 MB**.

Nghĩa là mỗi lần render `/loan-officer` và `/register-loan-officer` đang kéo 16,5 MB từ MOSO.
Đây là vấn đề có sẵn, không phải do dự án này gây ra — nhưng nếu `/join/<slug>` dùng lại đúng lời
gọi ấy thì mỗi lượt xem trang recruiter cũng kéo 16,5 MB.

Cách xử, theo thứ tự ưu tiên:

- **Ngắn hạn:** thêm `cacheRevalidate` cho `fetchAdmins()` (ví dụ 5 phút) — một dòng, có lợi ngay
  cho hai trang đang chạy.
- **Đúng đắn:** xin moso-aid một endpoint hẹp `GET /api/recruiters` trả đúng 12 dòng với ~8 field
  (`slug, full_name, title, avatar, company_email, company_phone, office_location, preferred_languages`).
  Nhẹ hơn ~3 bậc, và giấu `company_email` của toàn bộ 2.988 associate khỏi mọi lượt tải trang.

Cái thứ hai là chỗ **duy nhất** trong toàn bộ thiết kế này cần code backend mới — và nó ở moso-aid
(Node/Mongo), **không phải MOSO**.

## C.5 — Bảng tổng: code nằm ở đâu

| Việc | Repo | Bắt buộc |
|---|---|---|
| Trang `/join/[slug]` + `/apply/[slug]`, form 2 chế độ, resolve slug, prefill + khoá 2 field | **lf-homepage** | Có — ~80% khối lượng |
| Endpoint hẹp `GET /api/recruiters` | **moso-aid** | Nên — xem C.4 |
| Quy công `referred_source` + `referred_by` → FK `recruiter` | **MOSO** | **Không — đã có sẵn** |
| Thêm `lo_labels` để biết đến từ trang nào | MOSO | Không — Phase 2 |
| Sửa dropdown bỏ sót 10/12 recruiter | lf-homepage + lo-homepage | Riêng, `agentflow-mxm6` |

---

# Phụ lục D — Workflow đầy đủ: trang recruiter chạy thế nào, từ cú click tới lúc MOSO ghi công

Mọi khẳng định dưới đây đọc từ code trên `origin/master` ngày 31/08, không suy đoán.

## D.1 Toàn cảnh — hai link, một hồ sơ

Recruiter cầm **hai đường link**, cùng trỏ về **một người** (chính họ), khác nhau ở chỗ **đi sâu tới đâu**:

```
                 ┌─ /join/seth-august   (Link 1 — thu gom)   → form ngắn, 6 ô, không thu tiền
recruiter  ──────┤
                 └─ /apply/seth-august  (Link 2 — xử lý)     → stepper 4 bước, có trả phí $100
                                   │
                                   ▼
                    cùng POST registerLoanOfficer
                                   │
                                   ▼
                    MOSO RegisterInterestedLoanOfficer
                                   │
                    khử trùng THEO EMAIL → một hồ sơ LORecruiting duy nhất
```

Điểm mấu chốt để hiểu cả thiết kế: **hai link không tạo hai loại dữ liệu.** `WebPlusAPI.java:1171`
(`registerWebinar`) và `:2121` (`registerLoanOfficer`) **cùng gọi một op** —
`RegisterInterestedLoanOfficer`. Nên một người vào bằng Link 1 hôm nay, quay lại bằng Link 2 tháng
sau, vẫn là **một hồ sơ được điền dày thêm**, không phải hai bản ghi rời.

## D.2 Recruiter cầm gì trong tay

| | Link 1 — `/join/<slug>` | Link 2 — `/apply/<slug>` |
|---|---|---|
| Dùng khi | rải đại trà: post Facebook, email blast, group Zalo | gửi đích danh một LO đã nói chuyện rồi |
| Người nhận | chưa biết Loan Factory là gì | đã muốn chuyển, cần làm thủ tục |
| Mục tiêu | **lấy được thông tin liên lạc** | **đưa họ qua hết quy trình** |
| Form | 6 ô, xong trong ~40 giây | 4 bước: thông tin → trả phí $100 → ký thoả thuận → cấp quyền NMLS |
| Có thu tiền không | **Không** | Có, $100 một lần |

Slug lấy từ local-part của `company_email` (Phụ lục C.3), nên HR tạo account xong là link **có ngay**,
không phải cấu hình gì thêm.

## D.3 Trang có nội dung gì

Cả hai link dùng **chung một khung trang**, chỉ khác phần form ở cuối. Thứ tự các khối đi theo đúng
thứ tự câu hỏi trong đầu người đọc:

| # | Khối | Trả lời câu hỏi ngầm | Nguồn dữ liệu |
|---|---|---|---|
| 1 | **Hero cá nhân hoá** — ảnh, tên, chức danh, văn phòng, ngôn ngữ của recruiter | *"Ai đang mời tôi?"* | `getAdmins`: `avatar`, `full_name`, `title`, `office_location`, `preferred_languages` |
| 2 | **Dải số 60 giây** — $500/khoản vay đã đóng, tiết kiệm $1.000+/tháng, cấp phép 48 bang | *"Có đáng đọc tiếp không?"* | copy đã duyệt trong `messages/en.json` |
| 3 | **Bảng so sánh** — Loan Factory vs nơi họ đang làm | *"Hơn chỗ tôi ở chỗ nào?"* | copy đã duyệt |
| 4 | **7 bước gia nhập** — phí $100 tách hẳn thành một bước riêng, nói rõ | *"Tôi phải làm gì, và có mất tiền không?"* | `RegisterLoanOfficerPage.onboard_process_*` |
| 5 | **Form** | — | xem D.4 |
| 6 | **Bằng chứng** — số lender, số bang, điều kiện tham gia | *"Có thật không?"* | copy đã duyệt |
| 7 | **FAQ** | phản đối thường gặp | copy đã duyệt |

Ba nguyên tắc nội dung, rút từ chính chương trình:

- **Không giấu phí.** Bước trả $100 để nguyên một khối riêng, không nhét vào chân trang. Người đọc
  biết trước thì tỉ lệ bỏ giữa chừng ở bước 2 giảm; giấu đi thì họ bỏ đúng lúc tốn công nhất.
- **Cá nhân hoá là recruiter, không phải công ty.** Khác biệt duy nhất giữa trang của Seth và trang
  của Bảo Trịnh là khối 1 và ô ẩn quy công. Mọi con số về sản phẩm phải giống hệt nhau — recruiter
  **không** được tự sửa số liệu, nếu không sẽ có 12 phiên bản sự thật.
- **Link 1 không được hứa nhiều hơn nó làm.** Nút phải ghi rõ đại ý *"Gửi thông tin — chưa cam kết
  gì"*, chứ không phải "Apply now", vì form này không đưa họ vào quy trình.

## D.4 Khi LO bấm Submit — chuyện gì xảy ra, theo từng lớp

### Lớp 1 — trên trình duyệt (lf-homepage)

1. Trang đã biết mình thuộc recruiter nào (giải slug từ D.2) nên nắm sẵn `company_email` của người đó.
2. Form nhét thêm **hai ô ẩn** vào payload:
   ```
   referred_source = "recruiter"
   referred_by     = "seth.august@loanfactory.com"
   ```
3. Hai ô này được **khoá** (`setIsDisabledRefer(true)`, `BasicInfoForm/index.tsx:300-346` — cơ chế
   này **đã tồn tại**, hiện đang dùng cho tham số prefill). Ứng viên không sửa được, cũng không vô
   tình chọn nhầm người trong dropdown.
4. Với Link 1, bật cờ `waive_startup_fee` → bước trả phí biến mất khỏi thanh tiến trình:
   `visibleRealSteps = STEP_MENU.filter(s => !(s.id === 1 && waive_startup_fee))`
   (`RegisterLoanOfficerForms/index.tsx:642` — **đã tồn tại**, không phải viết mới).

### Lớp 2 — MOSO nhận (`WebPlusAPI.registerLoanOfficer`, `:2121`)

```java
if (Strings.isEmpty(key)) → RegisterInterestedLoanOfficer   // lần gửi ĐẦU
else                      → SaveOp                          // các bước sau
```

Lần đầu chưa có `key`, nên đi vào op đầy đủ. FE nhận lại `key` trong response và nạp lại trang với
`?key=<key>` (`index.tsx:521-527`) → **hồ sơ dở dang quay lại làm tiếp được**. Đây chính là cây cầu
miễn phí giữa Link 1 và Link 2.

### Lớp 3 — op `RegisterInterestedLoanOfficer` (118 dòng, đọc hết)

Theo đúng thứ tự:

1. **Khử trùng theo email** — tìm `LORecruiting` mới nhất có `recruiting_type = interested` và cùng
   `email`; thấy thì **dùng lại `key` cũ** thay vì tạo hồ sơ mới.
2. **`stampRegistration`** — ghi `last_registration_at` và `last_registration_event = lo_labels[0]`.
3. **`normalizeReferredSource`** — quy giá trị cũ về mô hình hai tầng hiện hành. Đã kiểm:
   `recruiter` rơi vào nhánh `default: return source` → **giữ nguyên**, không bị đổi.
4. Lưu, rồi xếp hàng `EnsureLORecruiterOp`, và gửi email `webinar_registration` nếu chưa
   `ready_to_join`.

### Lớp 4 — entity `LORecruiting` tự quy công (`beforeCreated`, `:669-678`)

```java
if (referred_source == recruiter && có referred_by) {
  find(Admin).whereEquals(company_email, referred_by)
             .whereEquals(active, true).whereEquals(is_lock, false)
             .filter(a -> a.get(role).isAnyRecruiter())      // KHÔNG đòi is_loan_originator
             .findFirst()
             .ifPresent(a -> bean.set(recruiter, a.keyName()));   // FK thật
}
```

Và `beforeSave:843-846` suy ra `referred_section = referred_source.section()` → `recruiter` thuộc
**`word_of_mouth`**. Vậy hồ sơ nằm đúng ô **Word of Mouth → Company Recruiter**.

## D.5 Kết quả cuối cùng trên một hồ sơ

| Trường | Giá trị | Ai ghi |
|---|---|---|
| `referred_source` | `recruiter` | FE gửi, op giữ nguyên |
| `referred_section` | `word_of_mouth` | `beforeSave` suy ra |
| `referred_by` | `seth.august@loanfactory.com` | FE gửi |
| **`recruiter`** (FK → Admin) | key của Seth | `beforeCreated` tra ra |
| `added_by_referrer_label` | `"Referred by Seth August"` | `beforeSave:829-841` |
| `last_registration_at` / `_event` | thời điểm + nhãn trang | `stampRegistration` |

FK `recruiter` mới là thứ báo cáo và tiền thưởng chạy trên đó. Hai trường kia là **chữ**, dùng để
người đọc hiểu, không dùng để tính.

## D.6 ⚠️ Rủi ro lớn nhất: ứng viên ĐÃ CÓ trong hệ thống

Khối quy công ở D.4 nằm trong **`beforeCreated`** (`:617-709`), **không** phải `beforeSave`. Kiểm
toàn file: cả 4 lệnh ghi FK `recruiter` (`:657`, `:664`, `:677`, `:679`) đều nằm trong
`beforeCreated`. **`beforeSave` không ghi FK này một lần nào.**

Ghép với bước khử trùng ở Lớp 3:

> Nếu email đó **đã có** một hồ sơ `interested`, op dùng lại `key` cũ → hoá ra là lệnh **update** →
> `beforeCreated` **không chạy** → **FK `recruiter` giữ nguyên giá trị cũ (thường là rỗng).**

Chỗ độc: `beforeSave:829` **vẫn** cập nhật nhãn chữ thành `"Referred by Seth August"`.

**Nên màn hình nói một đằng, dữ liệu tính tiền nói một nẻo.** Recruiter mở hồ sơ, thấy tên mình,
tưởng đã được ghi công — trong khi báo cáo nhóm theo FK `recruiter` không đếm họ. Không có lỗi nào
bắn ra, không có log nào ghi lại.

Ba điều cần nói rõ về rủi ro này:

1. **Nó trả lời luôn câu first-touch / last-touch mà tôi từng định đi hỏi Seth/Victoria.** Hệ thống
   **đã** là first-touch, ngầm định, và ghi không nhất quán. Đây là mô tả hiện trạng, không phải một
   lựa chọn ai đó từng cân nhắc.
2. **Phạm vi hẹp hơn nghe tưởng.** Khử trùng chỉ so trong `recruiting_type = interested`, nên kho
   106k RLO (`recruited`) không đụng tới. Chỉ dính người **từng điền form quan tâm trước đây**.
3. **Chưa đo được số.** Muốn biết nặng nhẹ phải đếm trên production: trong các hồ sơ `interested`
   hiện có, bao nhiêu cái có `referred_by` mà FK `recruiter` rỗng. Chưa làm — **đừng đoán**.

Ba hướng xử, phải chốt trước khi mở link ra ngoài:

- **(a) Không làm gì** — chấp nhận first-touch. Rẻ nhất, nhưng phải **bỏ nhãn chữ** đi, nếu không
  thì đang nói dối recruiter.
- **(b) Sửa MOSO** — chuyển khối quy công sang `beforeSave` với điều kiện *chỉ set khi FK đang rỗng*.
  Giữ first-touch nhưng vá được ca "chưa ai sở hữu". Đây là thay đổi MOSO **duy nhất** tôi nghĩ đáng
  làm cho dự án này.
- **(c) Last-touch** — luôn ghi đè. **Không khuyến nghị**: hai recruiter sẽ giành nhau bằng cách gửi
  lại link, và điều đó biến thành tiền.

## D.7 Cái gì đã có sẵn, cái gì phải xây

| Mảnh | Trạng thái |
|---|---|
| Op nhận đăng ký, khử trùng theo email | ✅ có |
| Quy công `referred_by` → FK `recruiter`, không đòi LO | ✅ có (`beforeCreated:669`) |
| Giá trị `referred_source = recruiter`, xếp vào Word of Mouth | ✅ có |
| Hai ô `referred_source` + `referred_by` trong payload | ✅ có (`moso-types.ts:1481`) |
| Prefill + khoá ô quy công | ✅ có (`BasicInfoForm:300-346`) |
| Ẩn bước trả phí cho Link 1 | ✅ có (`waive_startup_fee`, `index.tsx:642`) |
| Hồ sơ dở dang làm tiếp bằng `?key=` | ✅ có (`index.tsx:521-527`) |
| Slug cho recruiter | ✅ có — local-part `company_email` (C.3) |
| Thông tin recruiter để render trang | ✅ có — `getAdmins` (C.2) |
| **Trang `/join/[slug]` + `/apply/[slug]`** | ❌ **phải xây** — lf-homepage |
| **Endpoint hẹp `GET /api/recruiters`** | ❌ nên xây — moso-aid (tránh 16,5 MB, C.4) |
| **Quyết cách xử D.6** | ❌ **phải chốt trước khi phát link** |
| `lo_labels` để biết đến từ trang nào | ❌ Phase 2 — MOSO |
| Dropdown bỏ sót 10/12 recruiter | ❌ `agentflow-mxm6`, việc riêng |

---

# Phụ lục E — 31/08 chiều: Phương chốt first-touch. Một khuyến nghị của tôi bị rút.

## E.1 Quy tắc

Bao thuật lại từ Phuong Nguyen: **first-touch**. LO điền form qua nguồn nào **trước** thì nguồn đó
được tính công.

Ví dụ của Phương: LO đăng ký webinar qua **domain công ty** trước, sau đó recruiter mới mời →
**vẫn tính công ty**. Lý do vận hành: công ty có đội (Victoria, Brayan — sắp đổi tên thành
department kiểu `LO_SUPPORT`) nhận lead công ty và **gọi ngay** sau khi LO submit. Đội đó đã làm
việc thật trên lead đó.

## E.2 Hệ quả 1 — y60m không còn là bug về quy công

Phụ lục D.6 gọi "FK `recruiter` không được ghi đè khi hồ sơ đã tồn tại" là bug. **Theo quy tắc
trên thì đó là hành vi ĐÚNG.** MOSO đang thi hành first-touch, chỉ là không ai viết ra.

Bead `agentflow-y60m` hạ **P1 → P2** và **không còn chặn** việc phát link.

## E.3 Hệ quả 2 — khuyến nghị (b) của tôi SAI, đã rút trước khi code

D.6 khuyến nghị: *"chuyển khối quy công sang `beforeSave`, chỉ set khi FK đang rỗng."*

Sai, vì nó dựa trên một giả định tôi chưa kiểm: rằng **FK rỗng = chưa ai sở hữu**. Theo Phương,
trên một hồ sơ `interested` **đã tồn tại**, FK rỗng nghĩa là **lead của công ty** — đội LO_SUPPORT
sở hữu nó. Điền recruiter vào chỗ đó không phải "vá ca chưa ai sở hữu", mà là **lấy lead công ty
gán cho cá nhân** — vi phạm đúng cái first-touch vừa chốt.

Đây là kiểu sai nguy hiểm: bản vá chạy đúng về kỹ thuật, test xanh, và **âm thầm chuyển tiền
thưởng sai người**. Không cổng nào bắt được, vì nó làm đúng thứ nó được bảo làm.

## E.4 Lỗi còn lại — thu hẹp, và ĐỔI CHIỀU sửa

`beforeSave:829-841` vẫn cho lượt gửi sau ghi đè **ba field mô tả**, trong khi FK giữ nguyên:

| Field | Sau lượt gửi thứ hai | Sự thật |
|---|---|---|
| `referred_source` | `recruiter` | công ty |
| `referred_by` | email recruiter mới | — |
| `added_by_referrer_label` | "Referred by \<recruiter\>" | — |
| **`recruiter`** (FK) | **rỗng — giữ nguyên** | ✅ đúng |

Một hồ sơ **công ty sở hữu** lại mang nhãn tên một recruiter. Recruiter mở ra tưởng của mình; báo
cáo nhóm theo `referred_source` đếm nó là recruiter-sourced trong khi FK nói không phải ai cả.

⇒ Hướng sửa đúng **không phải** "cho FK cập nhật" mà là **"chặn ba field kia cập nhật"** khi hồ sơ
đã tồn tại — tức thi hành first-touch cho **đủ**, thay vì nửa vời như hiện nay (bảo vệ FK, bỏ mặc
ba field mô tả).

## E.5 Vì sao quy tắc áp được sạch, không có ca mơ hồ

`RegisterInterestedLoanOfficer.java:35` khử trùng **chỉ trong `recruiting_type = interested`**.
Kho 106k RLO nhập máy từ Modex (`recruiting_type = recruiting`) **không đụng tới**.

Nên mọi ca trùng đều là **một lần tự điền form trước đó = một cú chạm thật**. Không phát sinh câu
hỏi khó "một bản ghi do máy nhập có tính là cú chạm không" — ca đó không tồn tại ở đây.

## E.6 Ghi thêm về phạm vi

Bao cho biết **ambassador-program và lo-recruiter-program sẽ nằm trong scope của recruit app**
(`recruit-be` / `recruit-fe`), không ở lại lf-homepage mãi.

Ý nghĩa khi thiết kế tiếp: phần **logic** (đơn, duyệt, hạ bậc, quy công, roster) nên coi là **tạm
trú** ở lf-homepage/moso-aid, sẽ dời sang recruit app. Phần **trang marketing công khai** thì ở
lại. Đừng khoá cứng logic vào lf-homepage.
