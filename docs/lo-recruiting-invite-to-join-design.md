# LO Recruiting — "Mời gia nhập" (Invite to Join)

> Thiết kế V1 cho hành động CHỐT ứng viên trong recruit app.
> Chốt 2026-09-15 (Bao). Mọi trích dẫn code đọc trên `origin/master` / `origin/3.63.1`, không phải local.

## 1. Vấn đề

`recruit-fe` hôm nay dừng ở **"gọi → ghi kết quả → đặt next step"**. `OutcomeModal` cho recruiter đúng 4 lựa chọn
(`INTERESTED` / `NEUTRAL` / `NO_ANSWER` / `NOT_INTERESTED`), nhánh `INTERESTED` có 4 next-step
(`CALL_NEXT` / `SEND_INFO` / `WEBINAR` / `MEET_ONE_ON_ONE`). **Không có nhánh "chốt"**.

Hệ quả đo được: `candidates.account_id` NULL trên mọi row; 323 record S6 + 180 S7 đều đến từ MOSO import,
**không record nào do app sinh ra**. Nút này là cây cầu duy nhất biến candidate thành LO thật.

`git grep -w` trên `origin/master` cả hai repo: `invite` / `convert` / `hire` / `close candidate` = 0 hit nghiệp vụ.
`git grep -i offers src/apis` (recruit-fe) = rỗng — BE có đủ API offer, FE không có màn hình nào dùng.

## 2. Quyết định chốt

| # | Quyết định | Căn cứ |
|---|---|---|
| **D-I1** | **MỘT lời mời, không phân loại 2 kiểu.** Fee là một trục độc lập (`fee_status`), không phải một loại invite khác | Comment schema V001: *"fee / agreement / sponsorship are INDEPENDENT states; 'joined' is computed, never a hand-picked dropdown. WAIVED is first-class."* |
| **D-I2** | **Giữ nguyên thứ tự nghiệp vụ hệ cũ**: form → trả phí → 1-1 meeting (chốt W2/1099) → contract → ký | Bao 15/09: $100 là bộ lọc bảo vệ lịch Onboarding specialist. 542 buổi 1-1 để ra 71 người là đốt tài nguyên khan hiếm nhất của chuỗi |
| **D-I3** | **PA-1**: recruit chỉ CHỐT. LO điền/ký/trả trên `lf-homepage/register-loan-officer?key=` (đang chạy prod) | Không viết lại luồng đã onboard 2.601 người; đường về đã có sẵn |
| **D-I4** | **BỎ toggle `send_invite`** của hệ cũ | Trong recruit app candidate đã tồn tại → toggle "có gửi email không" mất lý do tồn tại |
| **D-I5** | **Rule duyệt của Victoria chạy NGAY ở V1** (xem §5) — không chờ Modex | `units_12mo` đã tồn tại và recruiter sửa được (xem §5.1) |
| **D-I6** | Recruiter **chỉ được đi về phía thận trọng hơn**: rule AUTO → vẫn xin duyệt được; rule REVIEW → không tự gửi được (trừ khi có `OFFER_APPROVE`) | Giữ quyền Victoria mà vẫn cho recruiter dùng phán đoán |
| **D-I7** | **Miễn $100 → luôn REVIEW** (trừ khi setting nói khác) | Đó là quyết định tiền duy nhất ở V1; hệ cũ cũng bắt nhập `waive_startup_fee_reason` |
| **D-I8** | Đầu vào rule **NULL → REVIEW** (fail-closed) | `CandidateEntity:212` javadoc: *"Wrapper type — NULL rows exist."* Không biết ≠ đạt. Khớp tinh thần Vic *"regardless… send me"*. **Vic chưa được hỏi ô này — báo cho biết, không hỏi lại** |

## 3. Luồng nghiệp vụ (KHÔNG đổi so với hệ cũ)

```
Recruiter bấm "Mời gia nhập"
  → rule quyết định: gửi ngay  |  vào hàng chờ Manager (SLA 24h)
  → email có link → lf-homepage /register-loan-officer?key=…   ← trang cũ, không đụng vào
  → LO điền hồ sơ
  → trả $100  (bước này ẨN nếu fee_status = WAIVED)
  → ⏸ chờ 1-1 meeting: Onboarding specialist chốt W2/1099
  → contract sinh ra → LO ký
  → joined khi (PAID hoặc WAIVED) AND SIGNED         ← luật cũ, giữ nguyên
```

Cổng chờ-họp đã có sẵn trong code cả hai bản:
`onboarding_meeting_status === 'pre_onboarding_done'` mới hiện nút ký
(`ApplyLoanOfficerForm.java:258-262` · `RegisterLoanOfficerForms/index.tsx:790-802`).

## 4. Kiến trúc — đường ống 4 khúc

| Khúc | Trạng thái | Bằng chứng |
|---|---|---|
| 1. packs phát tín hiệu khi LO trả/ký | ✅ đang chạy prod | `RecruitLORecruitingWatchers` — `runAfterSideEffect(LORecruiting.TYPE, onSaved)`, chạy prod+staging. Trả: `InterestedLoanOfficerPaidStartupFee.java:45`. Ký: `InklessProcessInterestedLoanOfficerCompletedOp.java:161` |
| 2. Gói tin mang đủ field | ✅ | `SendLORecruitingToRecruitOp` — `new LinkedHashMap<>(loRecruiting.getProperties())`, không lọc. Debounce 60s |
| 3. recruit-be hiểu | ✅ | `MosoRowMapper.mapIlo:649-653` — cây 8 nhánh dịch sang `OfferStatus`/`FeeStatus`/`AgreementStatus` |
| 4. recruit-be **GHI** | ❌ **GÃY** | `MosoRowUpsertServiceImpl.materializeOffer:513-520` — `if (existing != null) return 0;` **chỉ tạo, không bao giờ cập nhật** |

Khúc 4 là lý do mảnh #6 **bắt buộc**: recruit tạo offer row lúc bấm Mời → mọi cập nhật sau đó bị bỏ qua → recruiter mù vĩnh viễn.

Sửa phải đi qua `OfferService` (`/fee-paid`, `/waive-fee`, `/signed`), không `entityService.save()` thẳng — comment tại chỗ đã cảnh báo:
*"it would show fee PAID with ZERO history on the audit screen: the same silent hole V046 exists to close."*

## 5. Rule duyệt (D64 — Victoria chốt Slack 26/08)

Nguyên văn Victoria:
- *"the only auto approval is 5+ loans since 2022 AND more than 2 loans in last 12 months"*
- *"anything less than 2 loans in last 12 months need to send me for approval **regardless** they closed more than 5 loans since 2022 or not"*
- *"you can let the request be 24 hours to make a decision"*
- *"it should be editable because sometimes LOs send extra document to support that they closed more loans than that, so we need to edit it"*

### 5.1 Cả hai vế đầu vào ĐÃ CÓ — D64 ghi nhầm

| Vế | Cột trong recruit-be | Nguồn |
|---|---|---|
| loans since 2022 | `loans_since_anchor` + `loans_since_as_of` | gõ tay tại NMLS verify (D58); mốc năm = setting `modex.loans_since_year` |
| loans in last 12 months | **`units_12mo`** | Modex `performance_12_months_count` → `closed_loan_past_12_months` (§8.5). Webhook gần-real-time + refresh hàng tháng |

`CandidateEntity.java:212` — *"12-month closed units (§8.5 performance_12_months_count). Wrapper type — NULL rows exist."*

Và `units_12mo` **recruiter sửa được** với edit-provenance freeze (`UpdateCandidateRequest.units12mo`,
`CandidateProfileField.UNITS_12MO`, `ModexCandidateMapper.apply` + `lockedFields`) — Modex resync **không đè lên**
con số recruiter vừa sửa theo document LO gửi. Đúng yêu cầu cuối của Victoria.

> **Chỗ D64 nhầm:** D58 đúng khi nói Modex không tính được *"loans since \<năm\>"* (cần giao dịch kèm ngày).
> Nhưng Modex **có** trả aggregate đúng 12 tháng — chính là vế 2. Hai thứ bị gộp, rồi kết luận cả rule không chạy được.

### 5.2 Bảng quyết định (4 ô + NULL)

| loans since 2022 | loans 12 tháng | Kết quả |
|---|---|---|
| ≥ 5 | ≥ 2 | **AUTO** |
| ≥ 5 | < 2 | REVIEW |
| < 5 | ≥ 2 | REVIEW |
| < 5 | < 2 | REVIEW |
| NULL bất kỳ vế nào | | **REVIEW** (D-I8) |

Biên `> 2` vs `≥ 2`: bảng Bao gửi ghi `≥ 2`, Vic reply *"more than 2"*. Đọc là **"từ 2 trở lên"**;
Vic muốn khác thì tự nâng setting 2→3, khỏi hỏi lại.

### 5.3 Recruiter override (D-I6)

| | Rule = AUTO | Rule = REVIEW |
|---|---|---|
| Không làm gì | Gửi ngay | Vào hàng chờ |
| Bấm "Xin duyệt trước" | Vào hàng chờ ✅ | (đã ở đó) |
| Bấm "Gửi ngay" | (đã gửi) | ❌ trừ khi có `OFFER_APPROVE` |

### 5.4 Setting (tất cả editable, không cần deploy — D24 / `recruit_settings`)

`offer.approval_mode` = `RULE_BASED` (mặc định V1) | `RECRUITER_DECIDES` | `ALWAYS_REVIEW`
`offer.auto_approve.loans_since_min` = 5 · `offer.auto_approve.loans_12mo_min` = 2
`modex.loans_since_year` = 2022 · `offer.approval_sla_hours` = 24
`offer.waive_requires_approval` = true · `offer.invite_resend_after_days` = 3

Hết 24h chưa ai quyết → **giữ pending + nhắc lại**, KHÔNG auto-approve im lặng (D64).

## 6. Tám mảnh

| # | Repo | Việc |
|---|---|---|
| 1 | recruit-fe | `InviteModal` + 2 lối vào: nhánh thứ 5 `INVITE_TO_JOIN` trong `OutcomeModal` (attitude `INTERESTED`), và nút header hiện có điều kiện. Nội dung: referral source (bắt buộc) · NMLS (thiếu → mở NMLS verify trước) · fee [Thu $100 / Miễn + lý do] · preview email · nút theo kết quả rule |
| 2 | recruit-be | Tái dùng `POST /candidates/{id}/offers` · `/offers/{id}/waive-fee` · `/send` · `/approve` · `/decline`. **Không thêm endpoint vòng đời mới** |
| 3 | recruit-be | `OfferApprovalRule` — bảng §5.2, đọc `loans_since_anchor` + `units_12mo`, ngưỡng từ `recruit_settings` |
| 4 | recruit-be | Client gọi packs qua outbox `packswriteback` (`PacksWritebackClient`, x-api-key, retry). Đang DARK — bật bằng cờ riêng |
| 5 | **packs** | **Mở rộng `SaveLORecruitingFromRecruitOp`** (đã có trên master, vắng trên 3.63.1): thêm `waive_startup_fee` + reason, `status = invited_to_join`, kích hoạt email `interested_loan_officer_invitation_email`. Giữ `enterWriteback()`/`exitWriteback()`. Sửa javadoc còn ghi "Unlike the 3.62.1 PROD line" (prod giờ là 3.63.1, CÓ đường push) |
| 6 | recruit-be | **`materializeOffer`: create-only → upsert qua `OfferService`**, idempotent. **Bắt buộc** — thiếu là mù hoàn toàn |
| 7 | recruit-fe | Card "Tiến trình gia nhập": ① Đã mời ② Đã điền hồ sơ ③ Đã trả phí (hoặc Miễn) ④ Đã họp 1-1 ⑤ Đã ký. Mỗi mốc có timestamp. Nút "Gửi lại" chỉ hiện khi ① rồi mà ② chưa, quá `offer.invite_resend_after_days` (mặc định 3) |
| 8 | recruit-be | SLA 24h cho offer `PENDING_APPROVAL` + nhắc; hết hạn giữ pending |

### Thứ tự thực hiện

`6` (sửa chỗ gãy) → `3` → `2` → `5` (packs, master trước) → `4` → `1` → `7` → `8`.
Mảnh 6 đi đầu vì không có nó thì mọi mảnh sau không verify được end-to-end.

### Kỷ luật nhánh packs (mảnh 5)

- **master (staging) TRƯỚC, port nhánh prod SAU.** Không target thẳng nhánh prod.
- Nhánh prod **cuộn theo release** — kiểm prod đang là số mấy trước khi mở PR port.
- packs: **chỉ mở PR, không tự merge.** Merge để Hoà bấm.
- Bản port sang prod **cũng cần** echo-suppress (3.63.1 có đường push, khác 3.62.1 ngày xưa).
- Đo 15/09: 30 commit mắc kẹt trên 3.62.1 (patch vắng ở cả master lẫn 3.63.1), **0 cái động tới recruiting** (đã đối chứng dương). Phần việc này sạch.

## 7. Phễu đo được — thứ hệ cũ không có

Webhook đẩy đủ field nên mỗi mốc của card ở §6 mảnh 7 đóng dấu thời gian được. Trả lời được câu
*"542 người rụng ở đâu"* (form 45 field hay ô $100) mà **không đổi chính sách gì**.
Đo trước, đổi sau.

Số liệu nền hệ cũ (prod, đo 05/08): Invited but not onboarding **542** · Paid startup fee **71** ·
Agreement signed **70** · Paid nhưng chưa ký **4** → ≈13% qua được mốc trả phí.

## 8. KHÔNG làm ở V1

- **Comp band / offer đãi ngộ theo hạng năng suất** — bảng `offers` có sẵn `comp_band_id` / `comp_details`,
  bật sau khi anh Thuận/HR chốt band. Không chặn V1.
- **PA-3 (lai)** — recruit sở hữu trang checklist, từng ô deep-link sang trang cũ.
  Chọn khi muốn kiểm soát trải nghiệm/thứ tự mà không viết lại thanh toán + e-sign.
- **PA-2 (nhà mới)** — recruit tự làm tất cả. Chỉ đáng khi đã vá lỗ auth **B1** của `document-esign`
  (endpoint envelope trả live signing link + PII **không kiểm quyền**) và khi muốn cắt hẳn phụ thuộc packs.
- Cả hai **không phải làm lại từ đầu**: nút, card trạng thái và đường webhook của PA-1 giữ nguyên.

## 9. Rủi ro & việc tách riêng

| Rủi ro | Ghi chú |
|---|---|
| `?key=` **không bao giờ hết hạn** — "token" chính là khoá datastore | Kế thừa, không phát sinh từ việc này. Bead riêng |
| Big form khoá `first_name/last_name/email/phone` **ReadOnly** (`BasicInfoForm` khi `existed==true`) → LO **không sửa được** thông tin sai | Ngược ý "LO double check và sửa". Rẻ, nằm ở lf-homepage. Bead riêng |
| Webhook không phân biệt "LO nộp thật" với "record bị re-save" — payload giống hệt | Dùng `last_registration_at` (`MosoRowMapper:51-52`) |
| `packswriteback` đang DARK cả hai cổng, `PACKS_API_BASE_URL`/`PACKS_API_KEY` blank | Bật theo cờ, staging trước |
| Modex `units_12mo` NULL trên một phần dân số | Đã xử bằng D-I8 (fail-closed → REVIEW). Cần báo Victoria biết ô này |

## 10. Nguồn bằng chứng ngành (cho phần trình bày nội bộ)

- Greenhouse / Lever / Ashby / Workable: nút chốt **xuất hiện có điều kiện** sau khi vào stage Offer — không ai gom vào một nút.
- Gusto / Deel: trạng thái invite có **tên riêng** (`invited_started` / `invited_overdue` / `ONBOARDING AT RISK`), nút "gửi lại" chỉ hiện khi hợp lý.
- Stripe Connect: `currently_due` / `eventually_due` + `current_deadline` thay cho một cờ boolean "đã xong onboarding".
- Baymard: *"the number of form fields impacts overall usability far more than the number of steps"* — cắt field trước, cắt bước sau.
- Real Broker / eXp Realty: cả hai thu phí **sau khi ký**. **Không áp dụng cho ta** vì bức tường 1-1 meeting (D-I2) — ghi lại để lần sau khỏi tranh luận lại.

> ⚠️ Mọi số Baymard/Stripe là **proxy từ e-commerce và fintech**. Không tìm được nghiên cứu A/B trực tiếp
> cho "form dài + payment cùng bước" trong tuyển dụng. Phải nói rõ khi trình nội bộ.
