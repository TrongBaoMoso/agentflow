# MOSO-17007 — After-Party RSVP → ILO: luồng dữ liệu & mapping "Referred by"

> Ticket: [MOSO-17007](https://mosoteam.atlassian.net/browse/MOSO-17007) — *[ILO] Capture "Referred by" value from RSVP form*
> Người nhận: MOSO dev (assignee: Le Van Tho) · Người tổng hợp: bao.trinh@loanfactory.com · Ngày: 2026-08-17
> Phạm vi: form RSVP trên `lf-homepage` route `/after-party-event/<year>/<month>/<state>`

---

## 1. Luồng dữ liệu sau khi user submit form RSVP

```
FE  lf-homepage  /after-party-event/[year]/[month]/[state]  →  RegistrationModal
      │  POST {MOSO_AID}/api/lo-events
      ▼
moso-aid  submitLOEvent()   → lưu Mongo (collection LOEvent) + trả kết quả cho FE
      │  (fire-and-forget, 2 nhánh, KHÔNG await, lỗi chỉ log)
      ├─► POST /api/webplus/v1/{ns}/registerLoanOfficer    ← API tạo ILO
      └─► POST /api/webplus/v1/{ns}/sendEmail              (template vip_afterparty_*)
              ▼
MOSO  WebPlusAPI.registerLoanOfficer
      → RegisterInterestedLoanOfficer (SaveOp)
      → bean LORecruiting (recruiting_type = interested)
      → hiển thị ở màn "Interested Loan Officers"
```

### Điểm neo code

| Hop | File / vị trí |
|---|---|
| Submit form (FE) | `lf-homepage/src/app/[locale]/(public)/after-party-event/_components/RegistrationModal/index.tsx:113-148` |
| Dropdown + field phụ (FE) | `lf-homepage/src/app/[locale]/(public)/after-party-event/_shared/ReferredFields.tsx` |
| Enum nguồn (FE) | `lf-homepage/src/shared/constants/referred.ts` (`REFERRED_OPTIONS`, `REFERRED_VALUES`) |
| Tính `referred_by` (FE) | `lf-homepage/src/app/[locale]/(public)/after-party-event/_shared/referredForm.ts:62` (`computeReferredBy`) |
| FE gọi API | `lf-homepage/src/apis/otherApi.ts:117` → `POST ${MOSO_AID}/api/lo-events` |
| Route | `moso-aid/src/routes/index.js:140` |
| Service | `moso-aid/src/services/event.js:234` (`submitLOEvent`) |
| Đẩy sang MOSO | `moso-aid/src/services/event.js:51` (`saveLOInfoToInterestLO`) |
| Gửi mail | `moso-aid/src/services/event.js:90` (`sendEmailToLO`) |
| MOSO endpoint | `packs/loan/.../server/op/api/WebPlusAPI.java:2021` (`registerLoanOfficer`) |
| MOSO op | `packs/loan/.../server/op/recruiting/RegisterInterestedLoanOfficer.java` |
| Enum MOSO | `packs/loan/.../shared/typekey/LoanOfficerReferredSource.java` |
| Section MOSO | `packs/loan/.../shared/typekey/LoanOfficerReferredSection.java` |
| Auto-derive section | `packs/loan/.../shared/entity/LORecruiting.java:826-832` |

### Nhánh rẽ internal LO

`moso-aid/src/services/event.js:208-218`: nếu `current_company` là Loan Factory **hoặc** email đã tồn tại trong `Admin`
(`checkIsInternalLO` gọi `FindSuggestionsOp`) thì **KHÔNG** tạo ILO — chỉ gửi email `vip_afterparty_internal_*`.

---

## 2. Payload từng chặng

### 2.1 FE → moso-aid: `POST /api/lo-events`

```json
{
  "event_id": "california-mortgage-expo-2026-afterparty",
  "full_name": "Tester La Toi",
  "email": "tester@example.com",
  "phone": "(000) 000-0000",
  "nmls": "785746",
  "current_company": "ABC Mortgage",
  "production_volume": 12000000,
  "total_loan_closed": 24,
  "is_significant_other": false,
  "is_interested_lf": true,

  "referred_source": "others",
  "referred_by": "referrer@email.com",
  "referrer_name": "John Doe",
  "referrer_phone": "(000) 000-0000"
}
```

- `referred_source` gửi đúng **`value` snake_case** trong `REFERRED_OPTIONS` (bảng mục 3).
- `referred_by` / `referrer_name` / `referrer_phone` chỉ có mặt khi source yêu cầu (xem mục 3.1).
- FE **không** gửi `referred_by_lo` / `referred_by_recruiter` / `referred_email` — chúng được gộp thành `referred_by`.

### 2.2 moso-aid → MOSO: `POST /api/webplus/v1/{ns}/registerLoanOfficer`

```json
{
  "kind": "LORecruiting",
  "lo_labels": ["2026 Aug · San Diego, CA — After Party"],
  "first_name": "Tester La Toi",
  "email": "tester@example.com",
  "phone": "(000) 000-0000",
  "nmls": "785746",
  "note": "Current company: ABC Mortgage\nProduction volume: 12000000\nTotal loan closed: 24",

  "referred_source": "others",
  "referred_by": "referrer@email.com",
  "referrer_name": "John Doe",
  "referrer_phone": "(000) 000-0000"
}
```

Ghi chú:

- `lo_labels` = `event_name` trong registry `moso-aid/src/models/event.js` (chính là label cam hiển thị trong ILOs).
- 4 field referral chỉ được đưa vào payload khi khác `undefined / null / ''` (`event.js:66-71`).
- `production_volume`, `total_loan_closed`, `is_significant_other`, `is_interested_lf` **không** có field riêng bên MOSO —
  chỉ đi kèm dưới dạng text trong `note`.
- `first_name` nhận **cả họ tên**; hiện không tách `last_name`.

---

## 3. Enum dropdown "Are you referred to Loan Factory by?"

Nguồn duy nhất: `lf-homepage/src/shared/constants/referred.ts`. 18 giá trị, đúng thứ tự hiển thị.
Cột "Section MOSO tự set hiện tại" = kết quả `LoanOfficerReferredSource.section()` đang chạy hôm nay.

| # | `referred_source` FE gửi | Label FE (EN) | Enum MOSO | Label MOSO (`toString()`) | Section MOSO tự set hiện tại | Mong muốn theo MOSO-17007 | Khớp? |
|---|---|---|---|---|---|---|---|
| 1 | `webinar` | Webinar | `webinar` | Webinar | Events and Job Boards | Events & Job Board / Webinar | ✅ |
| 2 | `social_media` | Social media | `social_media` *(legacy)* | Social Media | **Other** | **Social Media** | ❌ |
| 3 | `job_posting` | Job posting | `job_posting` *(legacy)* | Job Posting | Events and Job Boards | Events & Job Board | ✅ |
| 4 | `recruiter` | Recruiter | `recruiter` | Company Recruiter | Word of Mouth | Word of Mouth / Company Recruiter (+ Referral Recruiter) | ✅ |
| 5 | `loan_officer` | Loan officer | `loan_officer` | Current Loan Factory LO | Word of Mouth | Word of Mouth / Current LF LO (+ Loan officer) | ✅ |
| 6 | `outside_loan_officer` | Outside (Loan officer) | `outside_loan_officer` | LO Outside Loan Factory | Word of Mouth | Word of Mouth / LO Outside LF + referrer name/email/phone | ✅ |
| 7 | `mortgage_trade_show` | Mortgage trade show | `mortgage_trade_show` | Mortgage Trade Show | Events and Job Boards | Events & Job Board | ✅ |
| 8 | `postcard` | Postcard | `postcard` *(legacy)* | Postcard | Other | Other + reason = "Postcard" | ⚠️ thiếu reason |
| 9 | `email` | Email | `email` | Email | Direct Invite | Direct Invite | ✅ |
| 10 | `newsletter` | Newsletter | `newsletter` | Newsletter | Direct Invite | Direct Invite | ✅ |
| 11 | `partner_referral` | Partner referral | `partner_referral` *(legacy)* | Partner Referral | **Other** | **Word of Mouth / Friend-Family (`friend_family`)** | ❌ |
| 12 | `google` | Google | `google` | Google Search | Search and AI | Search & AI | ✅ |
| 13 | `facebook` | Facebook | `facebook` | Facebook | Social Media | Social Media | ✅ |
| 14 | `instagram` | Instagram | `instagram` | Instagram | Social Media | Social Media | ✅ |
| 15 | `linkedin` | Linkedin | `linkedin` | Linkedin | Social Media | Social Media | ✅ |
| 16 | `mmi` | MMI | `mmi` | MMI | Events and Job Boards | Events & Job Board | ✅ |
| 17 | `returning_lo` | Returning LO | `returning_lo` | I'm a returning LO | Direct Invite | Direct Invite | ✅ |
| 18 | `others` | Other Referral | `others` *(legacy)* | Other Referral | **Other** | **Word of Mouth / LO Outside Loan Factory** + referrer name/email/phone | ❌ |

Cả 18 value đều **tồn tại** dưới dạng hằng enum trong `LoanOfficerReferredSource`, nên payload hiện tại không gây lỗi parse —
vấn đề chỉ nằm ở section được suy ra và ở 5 value legacy.

### 3.1 Field phụ theo từng lựa chọn

| `referred_source` | Field phụ FE bắt buộc nhập | Giá trị gửi đi |
|---|---|---|
| `loan_officer` | dropdown **Loan officer** | `referred_by` = company email của LO |
| `recruiter` | dropdown **Referral recruiter** | `referred_by` = company email của recruiter |
| `outside_loan_officer` | Referrer name + email + phone | `referred_by` = email người giới thiệu, `referrer_name`, `referrer_phone` |
| `others` | Referrer name + email + phone | `referred_by` = email người giới thiệu, `referrer_name`, `referrer_phone` |
| tất cả còn lại | — | chỉ `referred_source` |

- `referred_by` **luôn là email**, không phải tên (`computeReferredBy`).
- Hook của `LORecruiting` tự resolve `referred_by` → `referred_lo` khi khớp `Admin.company_email`.
- `referrer_name` / `referrer_phone` là field hợp lệ của `LORecruiting` nên lưu thẳng được.
  Lưu ý `RegisterInterestedLoanOfficer` chỉ bóc `LORecruiter.recruiter_name` / `recruiter_phone` (tên field **khác**),
  nên `EnsureLORecruiterOp` vẫn nhận `N/A` — nếu muốn bản ghi `LORecruiter` có tên/điện thoại người giới thiệu thì cần map thêm.

---

## 4. Việc cần MOSO xử lý

1. **3 value lệch section** — `social_media`, `partner_referral`, `others` đang rơi vào nhánh `default → other`
   trong `LoanOfficerReferredSource.section()`. Theo ticket cần remap khi ingest:
   - `others` → `outside_loan_officer` (Word of Mouth / LO Outside Loan Factory)
   - `partner_referral` → `friend_family` (Word of Mouth)
   - `social_media` → giữ section `social_media`
2. **`postcard` thiếu reason** — `LORecruiting.java:826-832` chỉ *xoá* `referred_source_other_reason` khi section ≠ `other`,
   không tự điền. Cần set `referred_source_other_reason = "Postcard"` lúc register.
3. **FE vẫn dùng danh sách phẳng 18 value cũ**, trong khi MOSO đã chuyển sang mô hình 2 cấp Section → Source (MOSO-16294):
   `offeredChildren()` đã bỏ `job_posting`, `social_media`, `postcard`, `partner_referral`, `others`
   và thêm `friend_family`, `ai_chatbot`, `online_article_blog`, `youtube`, `tiktok`, `indeed`, `other`.
   → Hoặc MOSO map ở BE (theo ticket), hoặc FE đổi sang danh sách mới. **Chưa có thay đổi FE nào được thực hiện.**
4. **Silent failure** — `saveLOInfoToInterestLO` là fire-and-forget; MOSO trả lỗi bằng HTTP 200 + `{ error }` trong body,
   moso-aid chỉ `console.error`. Nếu mapping fail, user vẫn thấy submit thành công.

---

## 5. Phụ lục — snippet enum MOSO hiện hành

`LoanOfficerReferredSection`: `word_of_mouth`, `search_and_ai`, `social_media`, `events_and_job_boards`, `direct_invite`, `other`.

`LoanOfficerReferredSource.childrenOf(section)` (danh sách đang được chào bán):

| Section | Sources |
|---|---|
| `word_of_mouth` | `loan_officer`, `recruiter`, `friend_family`, `outside_loan_officer` |
| `search_and_ai` | `google`, `ai_chatbot`, `online_article_blog` |
| `social_media` | `facebook`, `instagram`, `linkedin`, `youtube`, `tiktok` |
| `events_and_job_boards` | `indeed`, `webinar`, `mortgage_trade_show`, `mmi` |
| `direct_invite` | `email`, `newsletter`, `returning_lo` |
| `other` | `other` |

Legacy-only (không còn chào bán nhưng vẫn map được cho dữ liệu cũ): `job_posting`, `social_media`, `postcard`, `partner_referral`, `others`.
