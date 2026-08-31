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
