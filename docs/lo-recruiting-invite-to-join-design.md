# LO Recruiting — "Mời gia nhập" (Invite to Join)

> Thiết kế V1 cho hành động CHỐT ứng viên. **Bản 2 — 2026-09-15**, viết lại sau 3 lượt phản biện
> độc lập + đo thật trên staging DB + đối chiếu phiên `c901655e` (14/09).
> Bản 1 có 7 chỗ hỏng; mục §11 liệt kê từng chỗ và vì sao.
> Trích dẫn đọc trên `origin/master` (packs thêm `origin/3.63.1` = production), repo `moso` ghi rõ khi dùng.

## 1. Vấn đề

`recruit-fe` dừng ở "gọi → ghi kết quả → đặt next step". `OutcomeModal` cho recruiter 4 lựa chọn,
nhánh `INTERESTED` có 4 next-step. **Không có nhánh "chốt"** — `git grep -w` cho `invite|convert|hire`
trên cả hai repo = 0 hit nghiệp vụ.

Hệ quả: `candidates.account_id` NULL toàn bộ; 323 record S6 + 180 S7 đều từ MOSO import.

## 2. Bản đồ: cái gì ĐÃ CÓ, cái gì THIẾU

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| ① Recruiter bấm **Mời** | ❌ **THIẾU — phạm vi của doc này** | chỉ có trong mockup đã duyệt (`app.js:432` `kind==='join'`) |
| ② LO điền form + trả $100 | ✅ chạy production | lf-homepage wizard + PayPal; 71 người đã trả thật |
| ③ Họp 1-1 chốt **W2/1099** | ⚠️ việc của người; **trạng thái có trong code** | nút ký chỉ hiện khi `onboarding_meeting_status = pre_onboarding_done` |
| ④ Ký agreement | ✅ chạy production | Inkless → `InklessProcessInterestedLoanOfficerCompletedOp:161` |
| ⑤ Tạo account thật | ✅ **hai cửa, cả hai chạy** | A: `moso` "Create new account" → `register.InviteAdminsOp` · B: HR wizard `POST /employees` → `packsclient CreateAdmin` → cùng op đó |
| ⑥ Đồng bộ 3 app | ⚠️ **đứt một chiều** | packs↔HR ✅ · packs→recruit ✅ (có trên 3.63.1) · **recruit→packs: code chỉ trên master, VẮNG trên 3.63.1, TẮT cả hai cổng** |
| ⑦ Checklist 4 phòng ban | ✅ merged | PR #330, tự sinh khi vào S6 |

**Kết luận:** từng mảnh chạy được, **dây chưa nối liền**. Chỗ đứt = ⑥ chiều recruit→packs, và ① chưa tồn tại.

## 3. Hai khoảnh khắc "chín mồi" — KHÔNG phải một

```
① "sẵn sàng nhận lời mời"   ← recruiter TỰ PHÁN ĐOÁN   → nút Invite       (doc này)
      ↓ LO điền form · trả phí · họp 1-1 · ký
② "đủ điều kiện bàn giao"   ← hệ thống TỰ TÍNH         → handoff sang HR   (bead 8pqy)
      ↓
③ checklist 4 phòng ban                                  ĐÃ CÓ
```

② đã có cổng tính sẵn: `assertJoinedGate` (`CandidateServiceImpl.java:671`) = offer **SIGNED** + fee **PAID/WAIVED**.
Không cần nút. Doc này **chỉ làm ①**; ② thuộc bead `agentflow-8pqy`.

## 4. Quyết định

| # | Quyết định | Căn cứ |
|---|---|---|
| **D-I1** | **MỘT lời mời.** Fee là trục độc lập (`fee_status`), không phải loại invite thứ hai | comment schema V001: *"fee / agreement / sponsorship are INDEPENDENT states; WAIVED is first-class"* |
| **D-I2** | **Giữ nguyên thứ tự hệ cũ**: form → trả phí → họp 1-1 → ký | Bao 15/09: $100 là bộ lọc bảo vệ lịch Onboarding specialist. 542 buổi họp để ra 71 người là đốt tài nguyên khan hiếm nhất |
| **D-I3** | **PA-1**: recruit chỉ CHỐT; LO điền/ký/trả trên lf-homepage đang chạy prod | không viết lại luồng đã onboard 2.601 người |
| **D-I4** | **BỎ toggle `send_invite`** của hệ cũ | trong recruit app candidate đã tồn tại → toggle "có gửi email không" mất lý do tồn tại |
| **D-I5** | **Một endpoint gộp** `POST /candidates/{id}/invite`, rule chấm **phía server**. Recruiter KHÔNG cầm `OFFER_APPROVE` | cấp quyền đó = recruiter duyệt được MỌI offer, phá D-I6 |
| **D-I6** | Recruiter chỉ đi về phía **thận trọng hơn**: rule AUTO → vẫn xin duyệt được; rule REVIEW → không tự gửi được | giữ quyền Victoria, vẫn cho recruiter dùng phán đoán |
| **D-I7** | **Miễn $100 → luôn REVIEW** (setting tắt được) | quyết định tiền duy nhất ở V1. ⚠️ căng với D-I1 — xem §12 |
| **D-I8** | Đầu vào rule **NULL → REVIEW** (fail-closed) | `CandidateEntity:212` *"NULL rows exist"*. "Không biết" ≠ "đạt". **Chưa hỏi Victoria — §10** |
| **D-I9** | Modal Mời **KHÔNG thu thập lại** 2 con số; chỉ **kiểm tra**, thiếu thì cho điền tại chỗ | hai ô đã sửa được từ hôm nay: `CandidateEditModal/ProductionTab.tsx:25-26` |
| **D-I10** | **Recruiter là người bấm nút ①** — đảo một hàng RBAC của e2e-flow | `e2e-flow:235` ghi "Soạn & gửi offer = HR ✅, Recruiter ❌". Đây là thay đổi có ý thức, không phải bỏ sót |

## 5. Rule duyệt (D64 — Victoria chốt Slack 26/08)

Nguyên văn: *"the only auto approval is 5+ loans since 2022 AND more than 2 loans in last 12 months"* ·
*"anything less than 2 loans in last 12 months need to send me for approval **regardless**"* ·
*"24 hours to make a decision"* · *"it should be editable"*.

### 5.1 Đầu vào — CÓ CỘT, nhưng RỖNG DỮ LIỆU

| Vế | Cột | Nguồn |
|---|---|---|
| loans since 2022 | `loans_since_anchor` + `loans_since_as_of` | gõ tay (D58); mốc năm = setting `modex.loans_since_year` |
| loans 12 tháng | `units_12mo` | Modex `performance_12_months_count` |

**Đo thật trên staging DB 15/09** (`kubectl run pgq … psql`):

| status | tổng | có `loans_since` | có `units_12mo` | **có CẢ HAI** |
|---|---|---|---|---|
| ACTIVE | 5.973 | **0** | 40 | **0** |
| ARCHIVED | 1.232 | **0** | 56 | **0** |
| NURTURE | 43 | **0** | 3 | **0** |

*(Đối chứng dương: cùng cú `count(*) filter (…is not null)` trả 99 cho `units_12mo` ⇒ cú pháp đúng, số 0 là thật.)*

**Lý do số 0 — KHÔNG phải "dữ liệu bất khả thi":**
```
recruit-be  2026-08-25  V017 thêm cột loans_since_anchor
recruit-fe  2026-09-15  màn hình để NHẬP nó (#176)   ← HÔM NAY
```
Cột có từ 25/08, UI nhập mới lên **hôm nay**. Chưa ai có một ngày nào để gõ.

> **Hệ quả cứng:** ngày bật tính năng, rule cho AUTO **đúng 0 người**. Phải chấp nhận điều đó và
> để D-I9 (kiểm-tại-chỗ) là đường nạp dữ liệu, chứ đừng hứa "rule chạy ngay".

**Sửa D64:** D64 ghi *"`loans_last_12mo` CHƯA TỒN TẠI"* — sai, `units_12mo` có. Nhưng **không được**
gọi đó là "D64 ghi nhầm rồi thôi": `BRIEF-VICTORIA:206` (Q46b) + D58 đã chốt *"dùng 12-month count
của Modex làm chỉ số chính thức = **đổi định nghĩa — cần Victoria**"*. Doc này **đang đóng Q46(b)**
theo hướng (b) và **phải hỏi Victoria**, không phải thông báo.

### 5.2 Bảng quyết định

| loans since 2022 | loans 12 tháng | Kết quả |
|---|---|---|
| ≥ 5 | ≥ 2 | **AUTO** |
| ≥ 5 | < 2 | REVIEW (*"regardless"*) |
| < 5 | ≥ 2 | REVIEW |
| < 5 | < 2 | REVIEW |
| **NULL bất kỳ vế nào** | | **REVIEW** (D-I8) |

Biên `> 2` vs `≥ 2`: đọc là "từ 2 trở lên"; Vic muốn khác thì nâng setting 2→3.

### 5.3 Setting (editable, không cần deploy — D24 / `recruit_settings`)

`offer.approval_mode` = `RULE_BASED` (mặc định) | `RECRUITER_DECIDES` | `ALWAYS_REVIEW` ·
`offer.auto_approve.loans_since_min`=5 · `offer.auto_approve.loans_12mo_min`=2 ·
`modex.loans_since_year`=2022 · `offer.approval_sla_hours`=24 ·
`offer.waive_requires_approval`=true · `offer.invite_resend_after_days`=3

Hết 24h chưa quyết → **giữ pending + nhắc**, không bao giờ auto-approve im lặng (D64).

## 6. CHẶN — phải xong trước khi code tính năng

### B1. `OfferService` là máy trạng thái assert-cứng, KHÔNG tái dùng làm reconcile được

`send()` đòi `APPROVED` (`OfferServiceImpl:113`) · `markSigned()` đòi `SENT` (`:127`) ·
`markFeePaid()`/`waiveFee()` đòi fee `PENDING` (`:139`,`:150`, ném `:205-209`) · `approve()` đòi
`PENDING_APPROVAL` (`:83`). **Không method nào chịu gọi lặp.** Mà webhook mang **trạng thái đích**,
không mang sự kiện chuyển.

Hai lối thoát, cả hai sai:
- **Ném** → `MosoWebhookSyncServiceImpl` là `@Transactional` → rollback **cả event** → mọi thay đổi
  profile trong payload đó mất vĩnh viễn; packs thấy 4xx thì log rồi bỏ, **không retry**. Lặp **mỗi
  ngày** vì `UpdateUnresponsiveILOsCronOp` save lại mọi row `invited_to_join` + `responded=false`.
- **`approve()`+`send()` với `actorId=SYSTEM`** → **tự duyệt offer Victoria chưa xem**. Fail-open.
  Phá sạch D-I5/D-I6 bằng một webhook packs.

**Bản vá:** đường ghi RIÊNG `OfferService.reconcileFromLegacy(offerId, targetStatus, targetFee,
targetAgreement)` — so trạng thái đích, **no-op khi đã ở đích**, ghi `offer_history` chỉ khi thực sự
chuyển, **không bao giờ** tự sinh `APPROVED`. **Đừng tái dùng** `/fee-paid` `/signed` `/send`.

### B2. `offers` không có unique constraint + dedup merge dồn offer mù ⇒ treo vĩnh viễn

`V001:169` chỉ là `CREATE INDEX` thường; `git grep -i unique` trên toàn migration cho offer = **0 hit**.
`DedupServiceImpl:158-165` bulk UPDATE re-key **toàn bộ** offer của loser sang survivor, **không kiểm
đụng độ** (`:67-69` liệt `OfferEntity` trong `CHILD_ENTITIES`).
`materializeOffer` dò bằng `getOneBy` — **ném khi >1 row**.

Chuỗi hỏng: merge 2 candidate đều có offer → survivor 2 offer → mọi webhook cho survivor ném
`NonUniqueResult` → **500** → `SendLORecruitingToRecruitOp:102-105` **retry bão vô hạn** → hồ sơ đóng
băng. Và `OfferServiceImpl.request():60-65` thấy 2 offer OPEN → **không mời lại được nữa**.

**Bug này tồn tại HÔM NAY**, không do thiết kế này. **Phải vá trước.**

**Bản vá:** `CREATE UNIQUE INDEX … ON offers (candidate_id) WHERE status IN (<OPEN_STATES>)` (partial)
+ dọn dữ liệu trùng sẵn có + xử lý đụng độ trong `DedupServiceImpl.merge`.
Index này đóng luôn TOCTOU double-click (`request()` là read-then-write, READ COMMITTED, không khoá).

### B3. `RequestOfferRequest.compBandId` là `@NotBlank` mà `comp_bands` là bảng rỗng

`RequestOfferRequest:19-20` + `V035__hollow_table_warnings.sql`: *"`comp_bands` — VỎ RỖNG 27/08,
chưa có entity/reader/dòng"*. ⇒ endpoint **không gọi được**. Phải nới ràng buộc hoặc seed một band
mặc định trước khi §7 chạy.

## 7. Tám mảnh

| # | Repo | Việc |
|---|---|---|
| **0** | recruit-be | **Migration**: unique partial index `offers(candidate_id)` + dọn trùng + vá `DedupServiceImpl.merge` (B2) |
| **0b** | recruit-be | Nới `compBandId` hoặc seed band mặc định (B3) |
| 1 | recruit-be | `OfferService.reconcileFromLegacy` + đổi `materializeOffer` create-only → upsert, idempotent (B1) |
| 2 | recruit-be | `OfferApprovalRule` — bảng §5.2, đọc `loans_since_anchor` + `units_12mo`, ngưỡng từ `recruit_settings` |
| 3 | recruit-be | `POST /candidates/{id}/invite` — gate `OFFER_REQUEST`; AUTO→tạo `APPROVED`+`SENT` trong MỘT transaction, ledger ghi `REQUESTED`→`APPROVED(rule + 2 con số làm căn cứ)`→`SENT`; REVIEW→`PENDING_APPROVAL` |
| 4 | **packs** | Mở rộng `SaveLORecruitingFromRecruitOp` (đã có trên master, VẮNG trên 3.63.1): thêm `waive_startup_fee`+reason, `status=invited_to_join`, kích hoạt email `interested_loan_officer_invitation_email`. Giữ `enterWriteback()/exitWriteback()`. **Port sang 3.63.x phải mang CẢ fence** — handler trên 3.63.1 hiện KHÔNG có fence |
| 5 | recruit-be | Client gọi packs. ⚠️ outbox `packswriteback` hiện **chỉ 1 call site + allow-list 3 field** (`PacksWritebackEnqueuer:19-38`) — **không ride được**, cần kênh/`payload_kind` thứ hai |
| 6 | recruit-fe | `InviteModal` + 2 lối vào: nhánh thứ 5 `INVITE_TO_JOIN` trong `OutcomeModal` (attitude `INTERESTED`), và nút header hiện có điều kiện. Nội dung: 2 con số (kiểm, không thu lại — D-I9) · referral source bắt buộc · NMLS thiếu→mở verify trước · fee [Thu $100 / Miễn+lý do] · nút theo kết quả rule |
| 7 | recruit-fe | Card "Tiến trình gia nhập" — xem §8, đã cắt bớt |
| 8 | recruit-be | SLA 24h cho `PENDING_APPROVAL` + nhắc; hết hạn giữ pending |

**Thứ tự:** `0` → `0b` → `1` → `2` → `3` → `4` → `5` → `6` → `7` → `8`.

### Kỷ luật nhánh packs (mảnh 4)
master (staging) **TRƯỚC**, port nhánh prod **SAU** · nhánh prod **cuộn theo release**, kiểm số
hiện tại trước khi mở PR port · packs **CHỈ MỞ PR, không tự merge** · PR #3519 (nhắm 3.62.1) đã
**CLOSED**, code đã lên master qua đường khác — đúng taxonomy KIND A.
Đo 15/09: 30 commit mắc kẹt trên 3.62.1, **0 cái động tới recruiting** (đã đối chứng dương).

## 8. Card tiến trình — đã cắt theo dữ liệu thật có

Bản 1 vẽ 5 mốc; **2 mốc không có nguồn**:
- *"Đã họp 1-1"* — `git grep -i "onboarding_meeting\|pre_onboarding"` trong `recruit-be/src/main` = **0 hit**.
  Field chỉ sống ở packs; `MosoRowMapper` vứt đi. Muốn có phải thêm cột + dòng mapper + migration.
- *"Đã điền hồ sơ"* — không `OfferEventType` nào mang nghĩa đó (`V046:40`).
- `offers` **không có** `paid_at` (`V001:149-167`); `offer_history.occurred_at` = lúc xử lý webhook,
  không phải lúc sự việc. Debounce 60s gộp trả-rồi-ký thành **một** event.

**V1 chỉ vẽ 3 mốc có nguồn thật:** ① Đã mời · ② Đã trả phí *(hoặc Miễn)* · ③ Đã ký.
Ghi rõ trên UI: *"thời điểm hệ thống ghi nhận, ±60 giây"*.
Nút "Gửi lại" treo theo `offer.invite_resend_after_days` tính từ ①, **không** treo vào mốc không tồn tại.
Hai mốc còn lại là bead riêng nếu business cần.

⚠️ Mốc ① đọc offer row **local đã commit** ⇒ hiện ✓ **bất kể HTTP có tới packs hay không**. Phải lấy
trạng thái ① từ `packs_writeback_outbox.status`, và cần surface `DEAD_LETTER`/`PENDING` quá hạn
(hiện chỉ có `log.error`, không endpoint/màn hình/alert).

## 9. Bảo mật — phải xử trước khi phát tán link

**CRITICAL.** Bản 1 xếp `?key=` là *"kế thừa, không phát sinh"* — **sai**: hôm nay recruit chưa phát
tán key nào; thiết kế này **bắt đầu chủ động email nó ra ngoài**.

Và lỗ nặng hơn `?key=`: `GetOp` có `@RequiresPermissions()` **rỗng** → `AbstractOp:424-430` không bao
giờ chạy `checkPermissions` · `LORecruiting` có 0 field `.secured()`, không `SecurityPolicy` →
`Bean.canRead()` = `true` vô điều kiện · `BorrowerApiFilter:44` set `Access-Control-Allow-Origin: *` ·
`GetOp.execute()` nhận **`kind`+`id`**, không bắt buộc `key`, mà chuỗi `"LORecruiting"` đã nằm trong
bundle JS public.

⇒ **Ẩn danh, từ bất kỳ origin nào, duyệt tuần tự toàn bộ danh sách ứng viên** — tên/email/phone/NMLS,
kèm **`url_signing_sessions` là link ký ĐANG SỐNG** (ký hợp đồng thay người ta).

Đã có bead **`agentflow-ahkx` (P0)** cho cùng cánh cửa qua `getAdmins` (đo sống prod 15/09).
Đây là **cùng nguyên nhân gốc**, khác entity. Chưa chạy PoC lên prod (tránh đọc PII sống) — cần một
request thử có kiểm soát trên staging trước khi báo cáo chính thức.

**Tin tốt (đã đo, hai giả định của bản 1 sai theo hướng có lợi):**
- `x-api-key` webhook **ĐÃ LIVE, fail-closed** (`PublicWebhookController:40-47, 86-90`, fix `8kn3`).
  Comment packs *"receiver's check is not live yet"* và `MOSO-REALTIME-INGEST.md:60` **đều lỗi thời**.
- RBAC **đang enforce thật** (`values-prod.yaml:87-88`, `values-sta.yaml:141-142` set cứng `true`);
  `V005` seed đúng D-I6: `RECRUITER` không có `OFFER_APPROVE`.
- **B1 của document-esign chưa vá nhưng KHÔNG chạm PA-1** — ký của LO recruiting đi qua packs/Inkless,
  tách hoàn toàn khỏi `document-esign` (dùng cho hồ sơ vay borrower).

**Mới, chưa ai bắt:** `OfferServiceImpl.approve():81-89` **không kiểm** người duyệt ≠ người request.
`MANAGER` giữ cả `OFFER_REQUEST` lẫn `OFFER_APPROVE` ⇒ **tự request rồi tự duyệt**. Thiếu
separation-of-duties. Bead riêng.

**Cho mảnh 4:** `AIAPI.executeOp` không có allowlist theo tên op, **không rate limit**, op không kiểm
"đã ở trạng thái đó thì bỏ qua" ⇒ ai giữ `x-api-key` quyền `RECRUITING` gọi N lần = **N email tới
cùng ứng viên**, và set được `waive_startup_fee` thẳng ở packs **vòng qua toàn bộ D-I7**. Cần
idempotency key trước khi nhét email vào op.

## 10. Cần người trả lời

**Victoria** (đang chờ sẵn — tin thứ Sáu 6:04 xin họp demo):
1. Q46(b), mở từ 25/08: lấy **số loan 12 tháng của Modex** làm chỉ số chính thức cho vế 2 — được không? Nó **đổi định nghĩa**.
2. Một trong hai số **trống** thì xử sao? Đề xuất: **gửi chị duyệt** ("không biết" ≠ "đạt").

**Team HR** (cho bead `8pqy`, không chặn doc này):
1. Subscriber HR **cố ý bỏ qua mọi thứ không phải `Admin`** (`signal.go:73`). Nhận **nháp** cho LO *chưa* tuyển là vượt ranh giới đó — bên HR có lý do giữ nguyên không?
2. Nháp vào **hàng đợi tuyển hiện tại** hay danh sách riêng?
3. Ai nhận việc đầu tiên, SLA bao lâu?
4. Bốn ô recruit **không thể tự điền**: `associate_type` (W-2/W-9/Outside Salesperson) · company email · branch · ngày bắt đầu. W2/1099 có đúng chốt ở buổi 1-1 không, **ghi ở đâu** trước khi HR gõ? Company email có quy tắc cố định không?
5. Nháp có cần đính kèm hợp đồng đã ký + biên nhận $100 không?

**Khai / platform:**
1. Thêm subscriber mới trong `ai-hr-be` — ổn về kiến trúc không, **ai sở hữu** normalizer?
2. `x-api-key` recruit→packs gắn service user nào, quyền gì? Bẫy: `createNewAccountForILC` gọi
   `createSectionUser(...)` ⇒ nếu user đó **không có quyền HR**, `Admin.branch` bị **ghi đè im lặng**
   bằng branch của user api-key (`InviteAdminsOp.java:212-214`).

## 11. Bản 1 sai chỗ nào (giữ lại để không lặp)

| Bản 1 viết | Thực tế đo được |
|---|---|
| "trạng thái tự chảy ngược về recruit miễn phí" | `materializeOffer` **create-only** — offer đã tồn tại thì bỏ qua, recruiter mù vĩnh viễn |
| "phải viết op packs mới" | op **đã có trên master** (`SaveLORecruitingFromRecruitOp`), chỉ cần mở rộng + port |
| "D64 ghi nhầm, rule chạy được ngay" | cột có nhưng **rỗng 100%**; và Q46(b) là **câu hỏi mở gửi Victoria**, không phải chuyện thông báo |
| "joined = (PAID hoặc WAIVED) AND SIGNED — luật cũ" | ba nguồn ba luật: packs `paid_and_signed` **không có WAIVED**; auto-set `joined` = `nmls sponsored ∧ hr completed ∧ meeting **setup_done**`; `SELF-TEST §4.3` khác nữa |
| "?key= kế thừa, không phát sinh" | thiết kế này **mở kênh phát tán key mới**; và lỗ thật là IDOR không cần key |
| "mỗi mốc có timestamp" | 2/5 mốc **không có nguồn**; `offers` không có `paid_at`; debounce 60s gộp mốc |
| "HR app chỉ soi gương" | HR **có wizard tuyển riêng** (`POST /employees`) và **đẩy ngược sang packs** (`CreateAdmin` → `InviteAdminsOp`) |
| "đường tự động duy nhất là qua packs Admin" | quá mạnh — panic ở `router.go:70` chỉ chặn **route HTTP**, không chặn subscriber Pub/Sub; đường thẳng recruit→HR khả thi (bead `8pqy`) |
| "candidate mới không mời được" | FE **không hề tạo candidate** (`git grep` trong `src/apis` = rỗng); mọi candidate đến từ MOSO ⇒ đều có `legacy_key`. Chỉ 9/7.248 dòng thiếu (nhiều khả năng dữ liệu test) |

## 12. Căng thẳng chưa giải

**D-I1 ↔ D-I7.** D-I1 nói fee là trục **độc lập**; D-I7 nói miễn phí thì **luôn REVIEW** — tức fee
quyết định đường đi của invite, đúng cái D-I1 cấm. Giữ cả hai có ý thức: D-I1 nói về **hình dạng dữ
liệu** (một offer, ba trục trạng thái), D-I7 nói về **quyền phê duyệt** (ai được quyết định tiền).
Nếu sau này thấy vướng, D-I7 là cái nhường.

## 13. KHÔNG làm ở V1

- **Comp band / offer đãi ngộ** — cột có sẵn, bật sau khi anh Thuận/HR chốt band
- **Handoff sang HR** — bead `agentflow-8pqy`, đã có thiết kế đầy đủ, khuyến nghị **draft** (HR app tự
  tuyên bố `draft.go:70`: *"submit is the HUMAN's click in the wizard — never call
  `employee_draft_submit` yourself"*). Đo 15/09: `HR_ASSOCIATE_ONBOARD` mang
  `{platform_user_id, role_codes, metadata}` — **không có `candidate_id`** ⇒ link-back phải qua
  `external_identity_map`, không dùng event trần được. Blocker IAM Pub/Sub **đã LIVE 14/09** (`lmb5`).
- **PA-3 (lai)** — recruit sở hữu trang checklist, từng ô deep-link sang trang cũ
- **PA-2 (nhà mới)** — recruit tự làm tất cả; chỉ đáng khi đã vá B1 của `document-esign`
- Cả hai **không phải làm lại**: nút, card và đường webhook của PA-1 giữ nguyên

## 14. Bead tách riêng

| Bead | Nội dung |
|---|---|
| `agentflow-i12w` | `?key=` không hết hạn — token là khoá datastore |
| `agentflow-dqch` | big form khoá ReadOnly ⇒ LO không sửa được thông tin sai |
| `agentflow-ahkx` (P0, có sẵn) | `GetOp`/`getAdmins` ẩn danh — cùng nguyên nhân gốc với §9 |
| `agentflow-8pqy` (có sẵn) | handoff sang HR |
| *(mới)* | `approve()` không kiểm actor ≠ requester — separation of duties |

## 15. Bằng chứng ngành (cho phần trình bày nội bộ)

Greenhouse/Lever/Ashby/Workable: nút chốt **xuất hiện có điều kiện** sau khi vào stage Offer ·
Gusto/Deel: trạng thái invite có **tên riêng**, nút "gửi lại" chỉ hiện khi hợp lý ·
Stripe Connect: `currently_due`/`eventually_due`+deadline thay cờ boolean ·
Baymard: *"số form field ảnh hưởng usability nhiều hơn hẳn số bước"* ·
Real Broker/eXp: cả hai thu phí **sau khi ký** — **không áp dụng cho ta** vì bức tường 1-1 meeting (D-I2), ghi lại để khỏi tranh luận lại.

> ⚠️ Mọi số Baymard/Stripe là **proxy từ e-commerce và fintech**. Không có nghiên cứu A/B trực tiếp
> cho "form dài + payment cùng bước" trong tuyển dụng. Phải nói rõ khi trình nội bộ.
