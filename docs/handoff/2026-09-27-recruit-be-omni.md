# BÀN GIAO — recruit-be + omni-service

| | |
|---|---|
| **Session ID** | `75835574-d8fe-49b0-a83f-978a40c4bf77` |
| **Link** | https://claude.ai/code/session_016cVFfBB9hiAG15DTXeFr4o |
| **Khoảng thời gian** | 25/09 → 27/09/2026 |
| **Cập nhật** | **28/09** — omni#357 đã merge master (Khải duyệt), promote **#435** đang chờ; #429 + #446 đã merge; lỗi sắp xếp đã sửa. *(PHẦN 4 do session `045f1440` bổ sung.)* |
| **Phạm vi** | `recruit-be`, `omni-service` |

> **Đọc PHẦN 1 trước khi làm bất cứ gì.** Đó là những chỗ mà làm theo hướng cũ sẽ **sai**.

---

# PHẦN 1 — QUYẾT ĐỊNH ĐÃ ĐỔI

## ⚠️ 1. `master` KHÔNG phải môi trường staging (recruit-be)

| | |
|---|---|
| **CŨ** | `CLAUDE.md` viết *"master = STAGING, merge LÀ deploy"*, dẫn file `auto-deploy.yaml` — **file này không còn tồn tại** |
| **MỚI** | Ba nhánh. `cd-staging.yml` → `branches:[staging]` · `cd-production.yml` → `branches:[production]` |

**⇒ Merge vào `master` KHÔNG deploy gì cả.**

Promote lên staging (dev tự làm, không cần PR):

```bash
git fetch origin
git rev-list --count origin/master..origin/staging   # phải = 0
git push origin origin/master:refs/heads/staging
```

Kiểm nguồn sự thật bằng chính trigger, đừng tin đoạn văn:

```bash
git show origin/master:.github/workflows/cd-staging.yml | grep -A2 '^on:'
```

✅ **PR #446 ĐÃ MERGE (27/09) và đã lên staging.** `CLAUDE.md` trên master nay nói đúng.

Đoạn cảnh báo bên trên vẫn giữ, vì **bài học** còn nguyên: gặp tài liệu mô tả luồng deploy thì **kiểm bằng trigger của workflow trước khi tin**.

> Phiên nào báo *"đã merge master = đã ship"* là **báo sai**. Phiên này đã mắc đúng lỗi đó.

---

## ⚠️ 2. HR handoff: Pub/Sub → HTTP — **D143**, PR #430 (đã merge + đã lên staging)

| | |
|---|---|
| **CŨ** | D116 — publish Pub/Sub `recruit.hr-handoff.topic`, **chờ DevOps tạo topic** |
| **MỚI** | `POST {base}/internal/v1/recruit/hires`, hợp đồng `recruit.hired.v1` |

**⇒ Yêu cầu DevOps tạo topic ĐÃ HUỶ. Đừng mở lại.**

Lý do đổi: HR **không** làm subscriber, họ làm **cửa HTTP** (tera-docs `2438c72`, 24/09 — tức **8 ngày sau** D116). `grep RECRUIT_HIRED` trong `ai-hr-be` ra **0**.

### 🛑 Cú gọi này KHÔNG mang credential nào

HR trả **403 `INTERNAL_ROUTE_HAS_CALLER`** cho mọi request có `Authorization` / `X-User-ID` / `X-Dev-User-ID` / `X-HR-Act-As` — **kể cả token hợp lệ**.

Lý do: credential tới được đó nghĩa là request đã qua api-gateway, mà gateway **không phân quyền theo path** (HR đo 20/08: token nhân viên thường đọc được **toàn bộ danh bạ**).

**⇒ `base-url` PHẢI là ClusterIP, KHÔNG BAO GIỜ là api-gateway.**

`HrHandoffClient#assertCarriesNoCaller` chặn tại chỗ nếu có header cấm lọt vào.

---

## ⚠️ 3. Lead đã nói chuyện → KHÔNG tự thu hồi — **D148 + §6 R26**, PR #443

| | |
|---|---|
| **CŨ** | Mọi lead HOT bị đếm 4 giờ làm việc rồi tự trả về kho |
| **MỚI** | **Một đồng hồ, hai hậu quả** |

Neo / ngân sách / cảnh báo / màn Manager / nút Nhắc **giữ nguyên cho mọi lead**. Khác biệt **duy nhất**: lead có cuộc trò chuyện thật trong `hot.established_contact_window_days` (**V141**, seed **180**) **không bao giờ** bị cron thu hồi.

**Thu hẹp thi hành của D138, KHÔNG đảo nhận định của D138** — chuyển tay vẫn sinh nghĩa vụ liên hệ, chỉ là thi hành bằng màn Manager thay vì tự giật.

### 🛑 Hai bẫy

**`findDue` giờ KHÔNG còn nghĩa "ai đang trên đồng hồ"** — nó là *"ai được phép thu hồi"*. Màn Manager và `/today` mới trả lời câu kia. Ai dùng `findDue` làm proxy cho "on the clock" sẽ sai. Xem helper `assertOnClockButNotReleasable`.

**Nhánh INBOUND trong `establishedContactWithin` cố ý KHÔNG ràng buộc actor.** `recordInbound` đặt `actorId = null` (D101 dùng actor rỗng làm dấu máy-nạp). Thêm `actor_id IS NOT NULL` vào đó sẽ **bỏ sót đúng bằng chứng mạnh nhất** — ứng viên chủ động nhắn lại. Có test canh; sửa là CI đỏ.

### "Đã nói chuyện" chặt hơn `worked()`

Một trong ba, trong cửa sổ, bởi **bất kỳ chủ nào**:
- kết quả gọi `INTERESTED` / `NEUTRAL` / `NOT_INTERESTED`
- `direction = 'INBOUND'`
- SMS/EMAIL omni **gửi tới nơi thật**

**Loại `NO_ANSWER`** — gọi mà không ai bắt máy không phải một mối quan hệ.

---

## ⚠️ 4. Hàng bị từ chối phải đóng dấu lại `next_run_at` — **D149 + §6 R27**, PR #444

**Lỗi cũ:** từ chối → `return`, không đụng `next_run_at` ⇒ hàng giữ mốc cũ ⇒ **luôn đứng đầu** `ORDER BY next_run_at` ⇒ đủ 50 hàng là **không ứng viên khoẻ nào được gửi nữa, im lặng**.

**Mới:**

| Loại từ chối | Xử lý |
|---|---|
| Cổng SMS (TCPA chưa xây) | **đóng dấu lại giờ**, giữ `ENROLLED` |
| Sender vĩnh viễn | `stopEnrollment(UNDELIVERABLE)` |
| Sender tạm thời | đóng dấu lại giờ |
| STOP / blacklist | `SUPPRESSED` — không đụng, vốn đã đúng |

`SequenceSendResult` thêm cờ `permanent` + 3 factory; `SequenceStopReason` thêm `UNDELIVERABLE`.

> **Đừng cho cổng SMS dừng hẳn enrollment** — đã thử, test cũ bác đúng: cổng TCPA *sẽ* có, ứng viên phải tự chạy tiếp. Ghi ở **§6 R27**.

---

## ⚠️ 5. Thang gọi lại là `[3,5,10,30]`, KHÔNG phải `3`

```
V013 → '2'  →  V056 → '3'  →  V074 → '[3,5,10,30]'   ← ĐANG CÓ HIỆU LỰC
```

**4 bậc, trải 48 ngày.**

`recruit_settings` phân giải theo `effective_from` **mới nhất**. Grep migration phải **sắp thứ tự** rồi lấy dòng **cuối** — hoặc đo thẳng DB. Phiên này đã đọc sai vì dùng `tail` trên kết quả chưa sắp.

---

## ⚠️ 6. `agentflow-d79q` — **QUYẾT ĐỊNH: KHÔNG CODE**

Thiết kế *"thêm nhánh OR vào `findClaimedIdle`"* **bị bác** bởi 2 phản biện, ≥3 lỗi chặn:

- toán tử sai (`>=` vs `>`) ⇒ báo động **sớm 30 ngày**, lúc bậc cuối vừa cắm và đang chờ
- nút **Nhắc trả 409** trên chính hàng nó thêm vào
- `/today` **trống** — recruiter mở lead Manager vừa gắn cờ thì không thấy gì
- **chuông báo cho mọi recruiter**, không chỉ Manager; khoá chống trùng chỉ báo **một lần trong đời**
- `no_answer_streak` **không reset khi chuyển tay** ⇒ gắn nhãn sai cho người mới
- **mở lại lỗ bỏ đói** mà D148 vừa vá

**⇒ Nếu thấy 48 ngày quá dài: đổi một dòng cài đặt, không code.**

Tiêu đề bead đã sửa (tiêu đề cũ nói sai).

---

## ⚠️ 7. Cổng go-live sequence `agentflow-jqpu`: **3,5/5 đã đóng**

Mô tả bead viết **06/09** và **đã lỗi thời**. Đo lại 25/09:

| | |
|---|---|
| **HIGH-2** internal tick không auth | ✅ **đã đóng 07/09** (bead `agentflow-rk8x`) — **đừng làm lại** |
| **HIGH-1** RBAC fail-open | ✅ endpoint **có** gác `SEQUENCE_MANAGE/READ`; staging `RBAC_ENFORCE=true`<br>⚠️ **còn lại**: `0` vai nào được cấp `SEQUENCE_*` — Bao đã chốt cấp cho **MANAGER** |
| **MED-1** không test row-lock thật | ✅ đã có `SequenceEnrollmentTickLivelockIT` (Testcontainers) |
| **MED-2** giữ lock qua `send()` | ✅ đã sửa 21/09 |
| **MED-3** idempotency chưa dedup | ⏳ **còn mở** — phụ thuộc sender thật (omni) |

---

## ⚠️ 8. CI mới: số D/R trong `DECISIONS.md` giờ **có guard** — PR #445

Job đổi tên: *"Flyway version guard"* → **"Version + decision-number guard"**.

Thêm `D` hoặc `R` trùng số với master **hoặc với PR đang mở** ⇒ **CI đỏ**.

> Git **chỉ** báo xung đột khi hai người sửa gần nhau. Đã chứng minh: PR A chèn `D102` ở đầu bảng, PR B chèn `D102` ở cuối — `git merge` **sạch trơn**, cây có **hai** `D102`.

Trong hai ngày đã đụng số **6 lần**: `V124` · `D138` · `R22` · `D139` · `V140`.

**Số phiên này đã dùng:** `D143` `D148` `D149` · `R24` `R26` `R27` · `V141`

---

# PHẦN 2 — TRẠNG THÁI HIỆN TẠI

## Đã merge và **đang chạy trên staging**

`master` = `staging` = **`dc78e524`** *(cập nhật 28/09: recruit-be master = staging = `d08752a3`, đã có thêm #448/#449/#450/#451 — xem PHẦN 4)*

| PR | |
|---|---|
| **#430** | HR handoff HTTP — D143 |
| **#433** | `TemplateRenderer` phía server |
| **#443** | D148 + R26 + V141 |
| **#444** | D149 + R27 |
| **#445** | Guard số D/R |
| **omni#423** | `OMNI_INBOUND_REPLY_TOPIC` vào chart staging (merged master) |

## HR handoff **đã bật** trên staging — 27/09 06:40 UTC

Ba khoá trong `recruit-svc-secret` *(secret **không** do Helm quản ⇒ `kubectl patch` không bị revert)*:

```
RECRUIT_HR_HANDOFF_BASE_URL          = http://ai-hr-backend.hr-dev.svc.cluster.local:8312
RECRUIT_HR_HANDOFF_INTERNAL_API_KEY  = <64 hex>
RECRUIT_FEATURES_HR_HANDOFF_PUBLISH  = true
```

> ⚠️ Cả ba là biến của **recruit-app**. HR **không cấp gì**. Cái *"internal api key"* gác **cửa nội bộ của chính mình** để `cron-service-go` gọi vào — **không phải** khoá để gọi sang HR.

**Bằng chứng đã đo:**
- `Registered cron job recruit-be-svc/recruit-hr-handoff-tick — '0 0/5 * * * ?'`
- tick `POST .../internal/tick` → `200` lúc 06:40 *(200 chứ không 401 ⇒ khoá khớp hai đầu)*
- từ pod recruit-be gọi HR → `HTTP 400` với `source_key` cố ý sai *(route thông, không tạo gì)*

Chưa có lượt gửi thật nào — chờ người bấm **"Send to HR"**.

## ✅ omni — dừng-khi-trả-lời đã tới môi trường (28/09 01:52)

`omni#423` (vào master) **và** `omni#429` (promote `master → staging`) **đều đã merge**. Anh Thành merge #429.

Bốn tầng xác minh:

| | |
|---|---|
| omni#429 | MERGED `2026-09-28T01:52` |
| Deploy staging (GKE) | **success**, cùng thời điểm |
| Chart trên `origin/staging` | `OMNI_INBOUND_REPLY_TOPIC: "omni-inbound-reply"` |
| ConfigMap trên `omni-sta` | `omni-inbound-reply` ← **đã live** |

⇒ Bom hẹn giờ đã tháo: lần deploy dựng từ chart tiếp theo **không** còn làm mất biến, nên tính năng *"ứng viên trả lời hoặc nhắn STOP thì ngừng nhắn tự động"* **không bị tắt im lặng nữa**.

⚠️ **Còn một việc dọn, không gấp, thuộc bên omni:** biến vẫn được đặt tay trên Deployment `omni-sta` (cùng giá trị). **Container env thắng ConfigMap**, nên để lâu sẽ gây hiểu nhầm *"sửa chart mà không thấy đổi"*. Gỡ cái đặt tay đi để ConfigMap thành nguồn duy nhất.

*(Promote này chở thêm `6de1aaf` của ThanhTranLF — nhãn riêng cho pod Flyway Job, #431. Không liên quan, deploy xanh.)*

---

## Đang mở, chờ người khác

| | |
|---|---|
| **omni#435** | Promote `master → staging` cho **#357** (đã merge master 28/09 08:31 sau khi Khải duyệt). Chở đúng 1 commit `5d1a1ba`. **Chờ duyệt** — giống hệt #429 hôm trước.<br>⚠️ Merge master **chưa** có tác dụng với môi trường; phải có #435 thì quản trị viên tuyển dụng mới thật sự xem lại được tin đã xoá.<br>⚠️ Cố ý **không** thêm `RECRUIT#ADMIN` vào `loCandidateStaffGrant` — đó là mở quyền đọc **mọi** hội thoại ứng viên, phải là PR riêng có lập luận riêng |


## Bead

**Mở:** `h0zu` (ghi `user_id` từ HR vào `candidates.account_id` — **đã mở khoá, làm được ngay**) · `vb13` (gửi `sponsorships[]` thay `sponsor_states`) · `d79q` (mục 6 — **đã quyết định không code**) · `8pqy` · `jqpu` (mục 7)

**Đã đóng:** `asex` · `ibpv` · `rdmw` · `hzof` · `mpz9` · `8ogk`

---

## ✅ 9. Test chập chờn — `agentflow-mpz9` — **ĐÃ SỬA 27/09 (recruit-be #451, session `045f1440`)** — xem PHẦN 4, mục B1. Nội dung dưới đây là lịch sử, KHÔNG còn đúng.

`ContactRuleSlaClockIT#list_capAndTruncation`: local (macOS) **đỏ 3/3**, CI (ubuntu) **xanh 4/5**.

**Đã đo:**
- đỏ **cả ở commit trước D148** ⇒ **không phải do PR #443**
- đỏ **cả khi chạy riêng một method** ⇒ không phải nhiễm chéo
- nghi còn lại: **múi giờ**, hoặc một dòng `candidate_owner_history` thứ hai — **chưa kiểm**

> Nó làm CI đỏ **ngẫu nhiên trên PR không liên quan**. Thấy CI đỏ ở test này thì **không phải lỗi của bạn**.
>
> **Đừng sửa bằng cách nới lỏng assertion** — test cố ý seed ngược thứ tự để kết quả không thể do thứ tự chèn tạo ra.

---

# PHẦN 3 — LUẬT LÀM VIỆC BAO CHỐT TRONG PHIÊN NÀY

- **omni:** PR vào `master` thì **cứ merge**, rồi tạo PR `master → staging` để đó chờ Khải.
- **Trước khi nhờ ai:** phải kiểm kỹ xem **có tự làm được không**, rồi mới quyết định nhờ.
- **Staging là self-serve** — tự bật / tự cấu hình được thì làm.
- **Hệ thống càng đơn giản càng tốt**; chấp nhận rủi ro thay vì ràng buộc user nhiều. Chưa release chính thức nên được **"đập đi xây lại"** nếu logic gọn hơn.
- **`SEQUENCE_MANAGE` → cấp cho MANAGER** (đã chốt, **chưa làm**).
- **Thí điểm cadence:** stage **S1**, một recruiter tự nguyện, **EMAIL-only** (SMS hoãn).
- **Nội dung email cadence:** chỉ làm **một loại** (người chưa từng liên hệ được). Loại *"đã quen"* **bị bác** — automation chỉ dành cho lead **không phản hồi** (yêu cầu cứng của Victoria, `docs/FEEDBACK/01-recruiter.md`).

---
---

# PHẦN 4 — BỔ SUNG TỪ SESSION `045f1440` (24/09 → 28/09)

| | |
|---|---|
| **Session ID** | `045f1440-bbe3-4b89-8250-09ed8803dacd` |
| **Tên hiện tại** | `agentflow-2a` (trước đó từng mang tên `agentflow-f5`, `agentflow-a5`) |
| **Link** | https://claude.ai/code/session_01KJCaPLUqyhJNKb9mEtA1aq |
| **Phạm vi** | recruit-be, recruit-fe, tera-fe (omni-react), omni-service |

> Đọc mục A trước. Đó là những quyết định Bao đã chốt. Làm theo hướng cũ sẽ **sai**.

## A. QUYẾT ĐỊNH ĐÃ ĐỔI (đã apply)

### A1. "Đã liên hệ" (để tự thu lead) chỉ tính BẰNG CHỨNG — D138 (#429)
- **Chỉ tính:** tin SMS/Email **gửi qua omni** mà không bounce (`outbound_omni_message_id` có giá trị), hoặc **kết quả cuộc gọi đã ghi** (`call_outcome`).
- **Không tính:** bấm icon SMS/Email/Call ngoài app (click thiết bị), và MEETING/NOTE ghi qua API.
- **Ngoại lệ tự động (fallback):** khi omni mirror không chạy (production hiện nay), click **SMS/EMAIL** thiết bị được tính. Click **Call** thì **không bao giờ** được tính.
- Setting `hot.idle_device_click_counts` (mặc định false) thay cho `hot.idle_call_click_counts` (backend không đọc key cũ nữa).
- Báo cáo, thứ tự trên Today, `last_outbound_at` và referral hold **vẫn** tính click như "đã thử". Không đổi.

### A2. Tin nhắn gửi từ app Zoom KHÔNG được tính — phương án A (Bao chốt 25/09)
- Khi báo team luật mới phải dặn: **"nhắn trong app recruit mới được tính"**.
- Đã đo 25/09: trên staging khoảng 27% tin gửi từ app Zoom, nhưng là dữ liệu test của 1 người; production chưa có dữ liệu. Khi production có số liệu thật thì đo lại.

### A3. Lead được giao lại (TRANSFER) có đồng hồ MỚI — D138
- CLAIM và TRANSFER đều bắt đầu tính giờ. AUTO_CLAIM, IMPORT, CREATE, MERGE thì không.
- Có mốc cắt `hot.claim_sla_starts_at` (seed = lúc migration V123 chạy). Chỉ tính lead nhận hoặc được giao sau mốc này.

### A4. Danh sách "Đã nhận, chưa liên hệ" của Manager LUÔN HIỆN — D138
- Danh sách không còn phụ thuộc cờ tự thu lead.
- Mỗi dòng có thêm `contact_warn_at`, `contact_due_at` (luôn có giá trị), `release_enforced`, `established`, `clock_reason`.
- `warn_at` / `idle_release_at` chỉ có giá trị khi `release_enforced=true`.

### A5. Thông báo trên chuông + nút Nhắc + ghim trên Today — D142 (#435, V133)
- Bảng `recruit_notifications`. Các loại thông báo: `HOT_CLAIM_WARN`, `MANAGER_REMIND`, `REASSIGNED_AWAY`, `ASSIGNED_TO_YOU`, `RELEASED`.
- **HOT_CLAIM_WARN được tạo lúc người nhận poll chuông, KHÔNG dùng cron.** Production không có cron, nên đừng chuyển sang tick.
- Ghim trên Today được tính lúc đọc: tự gỡ khi có liên hệ thật (theo luật A1), khi đổi chủ, hoặc sau **72 giờ** (`hot.manager_remind_pin_hours`). Mỗi lead phải chờ 60 phút mới nhắc lại được.
- Ghim **KHÔNG** dùng follow-up CALL_NEXT, vì production không có followup-be và manager không tạo được follow-up.

### A6. Lead đã từng nói chuyện: hiển thị theo TỪNG lead — sửa bổ sung D148 (#449)
- `release_enforced = isEnforced() AND NOT established`, tính riêng cho từng dòng danh sách, từng mục trên `/today` và từng payload HOT_CLAIM_WARN.
- Lý do: trước đây lead đã nói chuyện vẫn hiện "sẽ bị thu lúc X" trong khi hệ thống không bao giờ thu.
- Giao diện (#241): lead đã nói chuyện hiện *"Won't be auto-released — already in conversation"* / *"Sẽ không tự động trả về kho — đang trao đổi với người này"*.

### A7. Khi hạn liên hệ bằng nhau: lead chờ lâu nhất lên đầu (#451, sửa gốc `mpz9`)
- **Nguyên nhân thật của mpz9:** các claim cùng rơi vào cuối tuần/đêm/ngày lễ thì có hạn giờ làm việc BẰNG NHAU, và Java sắp xếp theo `candidateId`.
- Giả thuyết cũ "mỗi lead có thêm một dòng ledger" là **SAI**.
- Thứ tự sắp xếp giờ là: `contactDueAt → claimedAt → candidateId`.

### A8. Icon SMS/Email mở modal OMNI + kiểm TCPA trước — recruit-fe #240, recruit-be #450
- `GET /api/v1/candidates/{id}/contact-route?channel=SMS|EMAIL` (quyền ACTIVITY_LOG) trả về `{allowed, suppression_type, identifier_type, identifier_masked, route: OMNI_COMPOSER|DEVICE, blocked_reason}`.
- Bước kiểm chạy ở icon **VÀ ngay trong ConversationModal**, nên mọi lối mở omni đều được kiểm. Lỗi mạng thì coi như bị chặn (fail closed).
- **Cờ build-time `NEXT_PUBLIC_CONTACT_ROUTE_GATE_ENABLED`:** chỉ `cd-staging.yml` đặt `true`. Production **không có cờ**, nên chạy y như trước PR.
- Nút "Send info" trước đây mở ở tab **Team only**, nên SMS soạn sẵn đi tới đồng nghiệp. Đã sửa bằng `side:'EXTERNAL'`.

### A9. ⚠️ HIỆN lý do chặn gốc từ MOSO cho MỌI người (Bao chốt 28/09) — ĐẢO NGƯỢC khuyến nghị reviewer
- Reviewer pháp lý từng đề xuất "không bao giờ hiện `blocked_reason`", và #240 đã làm theo. **Bao bác đề xuất đó**: người dùng chuyển từ hệ thống cũ sang cần biết **vì sao** một LO bị "đừng liên hệ".
- Đang làm (bead `agentflow-hreo`): backend thêm field `suppression_reason` (chỉ ghi chú gốc); giao diện hiện *"Lý do (từ MOSO): …"*. **Ai có quyền cũng thấy**, không giới hạn manager.
- Bead `agentflow-67jk` ("ẩn lý do") **đã huỷ**. Đừng mở lại.

### A10. ⚠️ Chặn promote recruit-fe lên PRODUCTION — bead `agentflow-v74b`
- recruit-fe master đã dùng **omni-react 0.1.5**. Từ 0.1.4 trở đi, thư viện gửi thêm `subject` khi share, mà omni-service production **chưa có #421** (`5690907`) nên sẽ trả 400. Không làm cờ được, vì thay đổi này nằm trong thư viện.
- **Không promote recruit-fe master→production** trước khi `5690907` có trong `omni-service origin/production`. `DEPLOY.md` của recruit-fe có bảng "Known promote blockers".
- Muốn bật cờ A8 trên production thì recruit-be #450 cũng phải lên production.

### A11. Thư viện omni-react (tera-fe) đã phát hành
- **0.1.4** (tag `1a9d1ce3a`): `InitialDraft.side` (#930), kèm các commit chưa phát hành của Khải.
- **0.1.5** (#980, tag `f74b33a22`): bản nháp tự chuyển sang kênh còn được phép, thêm lớp chặn lúc gửi, ô trả lời chuyển kênh khi SMS bị đóng. Đây là vá lỗ TCPA "bản nháp SMS cũ vẫn gửi được sau khi ứng viên STOP".
- **0.1.6** (#985, **đang review, chưa merge**): Share và template tôn trọng `channels.email`.
- PR #815 cũ (`onCallPlaced`) đang xung đột và dùng số 0.1.4 đã phát hành. Nếu còn cần thì phải lên **0.1.7**.

### A12. Quy trình
- **Reviewer KHÔNG được đụng worktree của implementer** (không stash, reset, checkout hay build ở đó). Phải dùng `gh pr diff` hoặc worktree riêng. Ngày 24/09 đã có lần suýt mất code.
- **Reviewer đề xuất ẩn hay đổi thông tin nghiệp vụ người dùng đang thấy → HỎI Bao trước**, không tự áp dụng (bài học từ A9).
- recruit-fe cũng deploy staging qua nhánh `staging` (#239 đã sửa DEPLOY.md/CLAUDE.md). Dev tự FF-push `origin/master:refs/heads/staging`.

## B. ĐÃ MERGE (27–28/09, session này)

| Repo | PR | Nội dung |
|---|---|---|
| recruit-be | #429 | D138: luật bằng chứng, TRANSFER tính đồng hồ, danh sách manager luôn hiện (V123) |
| recruit-be | #435 | D142: thông báo, nút Nhắc, ghim (V133) |
| recruit-be | #448 | Ghi chú bàn giao trong payload thông báo; IT cho trường hợp gộp hồ sơ trùng (không reparent) |
| recruit-be | #449 | A6: enforcement theo từng lead + field `established` |
| recruit-be | #450 | A8: contact-route |
| recruit-be | #451 | A7: sửa gốc mpz9 (**B1**) |
| recruit-fe | #232 | Chuông, nút Remind/Take back, ghim, setting mới |
| recruit-fe | #238 | Nhắc bị từ chối (409) hiện đúng lý do (`error_payload` trong apiClient) |
| recruit-fe | #239 | Màn hình 320–1024 không tràn ngang; DEPLOY.md đúng quy trình 3 nhánh |
| recruit-fe | #240 | A8 + omni 0.1.5 + cờ chỉ bật trên staging |
| recruit-fe | #241 | Câu chữ cho lead đã trao đổi; chuông hiện lý do và ghi chú bàn giao (ngôi thứ ba khi manager giao lại) |
| recruit-fe | #242 | Lịch sử lead và "Handed to you" dùng chung luật ngôi |
| tera-fe | #930, #980 | omni 0.1.4 / 0.1.5 (xem A11) |

## C. ĐÃ XONG SAU KHI VIẾT BẢN TRÊN (28/09) — tất cả đã merge + lên staging

| Repo | PR | Nội dung |
|---|---|---|
| recruit-be | #452 | Chuông xếp theo `occurred_at DESC, claimed_at ASC, id DESC`; cast `claimed_at` có regex bảo vệ (dữ liệu sai định dạng → dùng occurred_at, không lỗi 500) |
| recruit-be | #453 | contact-route trả `suppression_reason`; lỗi 400 của POST /activities mang `bindingArgs {suppression_type, identifier_type, suppression_reason}`; **D150** |
| recruit-fe | #243 | Lịch sử lead ghi đúng người trả lead về kho (chủ tự trả / manager thu hồi / hệ thống tự thu) |
| recruit-fe | #244 | Test composer thật: bấm Send/Enter/Ctrl+Enter không gửi SMS cho người đã STOP |
| recruit-fe | #245 | Hiện **"Lý do:" / "Reason:"** (nhãn trung tính, KHÔNG ghi "từ MOSO") dưới câu bị chặn; toast có id riêng (hàm dùng chung `useToast` ẩn toast cũ trước khi hiện toast mới); kiểm lại bị lỗi thì kênh đóng |
| tera-fe | #985 + tag omni-v0.1.6 | Share và template tôn trọng `channels.email`. **Chưa có app nào nâng lên 0.1.6.** Khi recruit-fe nâng lên thì ứng viên bị chặn email sẽ mất luôn nút Share nội bộ (gốc là `agentflow-j4hl`: profile chưa phân biệt nội bộ/bên ngoài) |

recruit-be staging = `eec91113` · recruit-fe staging = `08c19f1c` (28/09).

## D. CÒN CHỜ NGƯỜI
- **Khải:** promote omni-service #421 (và #426) lên production (A10); xem PR #815; xem đề xuất đổi `!textable` thành `!channels.sms` trong ô trả lời.
- **Omni:** lớp chặn TCPA lúc gửi (`agentflow-ujk2`, `agentflow-j4hl`), đang chờ chốt luật START. Đây mới là lớp chặn thật.
- **Bao:** thử trên staging rồi quyết có bật `hot.idle_release_enabled` không. Trước khi bật phải báo team luật mới (A1, A2).
