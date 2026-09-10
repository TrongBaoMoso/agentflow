# recruit ↔ omni: hợp nhất timeline + Call Result vào Conversation modal

**Ngày:** 2026-09-11
**Trạng thái:** đã chốt hướng (compose-on-read), chưa code
**Bead:** agentflow (mở khi bắt đầu từng phase)
**Quyết định của Bao:** omni sở hữu HỘI THOẠI (không điều kiện); recruit sở hữu SỔ (activities); phần đọc **ghép lúc đọc**, KHÔNG mirror.

---

## 0. Vì sao có tài liệu này

Câu hỏi gốc của Bao (5 ảnh, 2026-09-10):

1. Vì sao Conversation modal của recruit chỉ có Chat/Note/Email ở tab TEAM và chỉ Email ở tab Candidate?
2. Một số từ ngữ bị sai (clone từ bên khoản vay — "Borrower").
3. Khu action icon ở top modal của tera là gì, recruit dùng được không?
4. CONTACT HISTORY trong drawer 360 còn cần không?
5. Call Result modal (chọn next step + ghi note) gộp được vào Conversation modal không?
6. Omni còn chừa chỗ cho gì nữa?

---

## 1. Trả lời câu 1 — cổng HAI PHẦN, một nửa đã mở

```
recruit-fe/src/shared/omni/candidateSectionConfig.tsx:206
    channels: { email: true, sms: false, call: false }
```

Cờ này gác **Ô SOẠN**, không gác hiển thị. Cuộc gọi vẫn hiện trên timeline vì
`recruit-be` mirror nó sang omni (`CandidateCallMirror`) rồi Zoom webhook bơm
thời lượng/bản ghi vào đúng hàng đó.

Chuỗi cổng:

| tầng | trạng thái đo 2026-09-10 |
|---|---|
| FE hard-code `sms/call = false` | ĐANG TẮT |
| `senderIdentity()` trả NO_LINK | **ĐÃ SỬA** — đọc `recruiter_zoom_link` (V060) |
| omni wire cho LO_CANDIDATE | **ĐÃ WIRE** — pod boot log `resolver ready subject_types=[LOAN, LO_CANDIDATE]` |
| `recruiter_zoom_link` có dữ liệu | **0 ROWS** (đối chứng dương: `candidates = 7243`) |

⇒ Phỏng đoán của Bao ĐÚNG: nó liên quan tới `recruiter_zoom_link`. Nhưng
javadoc `:188-191` biện hộ cho cái cờ đó **đã sai cả hai mệnh đề** và phải sửa.

Chat/Note có mặt ở tab TEAM vì kênh nội bộ **không cần sender identity**.

**Việc:** khi có 2 giá trị Zoom → `PUT /api/v1/admin/zoom-links/{central_user_id}`
với `{zoom_los_user_id, zoom_account_email, note}` → bật `sms/call = true`.
Chưa có dữ liệu thì bật cờ = ô soạn hiện ra rồi gửi lỗi.

---

## 2. Phát hiện lớn hơn câu hỏi — ba icon trên row đang LÀM MẤT NỘI DUNG

```
recruit-fe/src/shared/components/ContactButtons/index.tsx:28-29
    SMS:   (c) => c.phone ? `sms:${c.phone}` : null
    EMAIL: (c) => c.email ? `mailto:${c.email}` : null
    CALL:  zoomphonecall: deep link
    + useLogActivity() → POST /candidates/{id}/activities
```

Đây là **device handoff**: mở app của máy, ghi một dòng log "đã bấm".
Nội dung không được lưu, và **trả lời của ứng viên không bao giờ quay về**.
Đường đang được coi là "chạy tốt" chính là đường mất nội dung.

⇒ Sau khi ô soạn omni bật được, ba icon này phải **mở Conversation modal**
thay vì handoff.

---

## 3. Câu 3 + 4 — tiền lệ của platform

`tera-fe/src/shared/components/workflow/RecordDrawer/RecordIdentityRow.tsx:163-201`

| icon | hành động |
|---|---|
| IconFileText | `drawer_open_1003` |
| IconFolder | `drawer_open_conditions_docs` |
| IconCalendar | `drawer_view_dates` |
| IconHistory | `drawer_view_history` |
| IconMessage | `nav_conversation` |

**Tiền lệ:** tera giữ **conversation và history là HAI VIEW trong MỘT vỏ**.
Và package còn chừa sẵn `historyHref?` (`conversationSectionConfig.ts:108`).

⇒ Trả lời câu 4: CONTACT HISTORY **còn cần**, nhưng đổi vai — nó không còn là
"nơi xem tin nhắn" (modal làm việc đó tốt hơn) mà là **sổ ai-làm-gì-lúc-nào**,
gồm cả những thứ modal không bao giờ có: đổi chủ, đổi stage, follow-up,
SYSTEM. Đặt nó thành view thứ hai trong cùng vỏ, đi qua `historyHref`.

---

## 4. Câu 5 — Call Result: gộp ĐƯỢC, nhưng KHÔNG bằng cách thẳng nhất

### 4.1 Đường nguy hiểm (đã LOẠI, có bằng chứng)

Ý tưởng đầu: reply vào chính hàng CALL đã mirror để thread cái note.

```
CandidateCastRole:50            CANDIDATE(CandidateCastSide.EXTERNAL, 40)
registry/lo_candidate.go:34     ExternalPrincipal: true
CandidateCallMirror:159-160     createCall(..., RECIPIENT_ROLE.side().name())  => EXTERNAL
messages/service.go:894         side := parent.Side   // reply KHÔNG đổi phía
messageshttp/handler.go:106-113 replyBody KHÔNG có field `note`
httpx/decode.go:115             DisallowUnknownFields()
```

⇒ Gửi `"note":true` trên reply = **400**. Không gửi = hàng
**EXTERNAL, note=false** — tức **ghi chú nội bộ của recruiter đậu lên phía ứng
viên nhìn thấy**. Hai kết cục, cả hai sai. LOẠI.

### 4.2 Đường đúng — compose một note INTERNAL

`POST /messages` với `{side: INTERNAL, note: true}`, không channel, không
recipient. omni cho phép:

```
service.go:745   ErrNoExternalSide chỉ bắn khi Side == SideExternal
service.go:833   "a channel-less INTERNAL compose reads as 'added an internal note'"
service.go:1756  validateChannelTargets 400 chỉ khi channels có EMAIL/SMS
```

**Ràng buộc thật** không phải recipient mà là **authorship**:
`resolveAuthor:1857 → authorOn:1931` trả `ErrNotInternalParticipant` khi
`!Read || Confined` ⇒ recruiter **phải có hàng ACTIVE INTERNAL trên cast**.
Nghĩa là bước này chạy **SAU** cast push, không cần network call thứ hai để đọc cast.

### 4.3 Ghép vào đâu trong code

```
ActivityServiceImpl.java:123-126
    final Runnable mirror = request.getType() == ActivityType.CALL
            ? candidateCallMirror.mirrorTask(candidateId, actorId) : null;
    candidateCastPush.pushAfterCommit(candidateId, mirror);   // "One task, two phases"
```

Đã là **một task hai pha**, KHÔNG phải hai hook đua nhau. Việc mới là
**pha thứ ba của cùng task đó**, nối vào `pushThen`.

⚠️ **Nối vào LƯỢT THỬ (task), KHÔNG nối vào nhánh PUT thành công.** Javadoc của
chính class đó đã cảnh báo: nối vào nhánh thành công thì ca phổ biến nhất
("fingerprint unchanged → không PUT gì cả" = mọi cú gọi từ lần thứ hai) sẽ
**bị bỏ qua**. Phải có test: *cast unchanged (no PUT at all) → follow-on VẪN chạy*.

### 4.4 Hai transaction — đây là hạn chế thật

```
recruit-fe/src/apis/recruit/candidates.api.ts:232  POST /candidates/{id}/activities    (log)
recruit-fe/src/apis/recruit/candidates.api.ts:266  POST /candidates/{id}/call-outcome  (outcome)
```

Hai endpoint, HAI transaction. Không có đường nào log call + lưu outcome trong
một lượt. Note của Call Result nằm ở `FollowUpServiceImpl:301`, và class đó
**không có một dependency omni nào**.

⇒ Phase 3 phải **allowlist theo call site**, không phải guard `type != CALL`:
`new ActivityEntity()` có **9 call site**, chỉ 1 có omni wiring.
Hai site `actor = NULL` (`FollowUpAutoClear:72`, `MosoRowUpsertServiceImpl:304`)
thì `OmniCallerIdentity.capture(null)` trả null ⇒ mirror tự bỏ (fail-closed, ĐÚNG).

---

## 5. Quyết định đọc: COMPOSE-ON-READ, không mirror

### Phép đo giết chi phí của compose-on-read

```
recruit-fe/src/apis/recruit/candidates.api.ts:300  ACTIVITY_PAGE_SIZE = 100
                                            :308   { currentPage: 0, pageSize: 100 }
CandidateDrawer:  grep 'loadMore|fetchNextPage|hasNextPage' = 0
                  (đối chứng dương: 4 file trong src/apis dùng currentPage)
```

Drawer đọc **100 dòng, một trang, không load-more**. Nên "ghép lúc đọc" chỉ là
ghép ≤100 + ≤100 dòng trong bộ nhớ. Không có bài toán phân trang xuyên nguồn.

### Ba lập luận độc lập chống mirror NOTE

1. **Mirror không đạt mục tiêu.** Modal của omni không render được hàng của
   recruit. Đẩy note sang omni để "thấy chung một chỗ" thì chỗ đó vẫn không thấy.
2. **Erasure của omni sẽ phá ghi chú vận hành của chính recruiter.**
   `previews.go:402` xếp `KindNote` cùng nhóm EMAIL/SMS/CHAT (**có text ⇒ bị cào**),
   còn CALL/SYSTEM là "textless by construction" ⇒ sống.
   Cùng lúc đó văn bản y hệt vẫn nằm trong `activities` của recruit
   (ngoài tầm với của erasure omni). **Sai cả hai đầu**: recruiter mất sổ,
   mà lượt erasure cũng không erase thật.
3. **`mosoNote` mang con số D31 qua biên mà không có mask.**

### Fence D31 đã tồn tại và fail-closed

```
recruit-be/.../candidate/CandidateProductionVisibility.java
  :79   EXACT_PRODUCTION_ROLES = Set.of("ADMIN")     // ALLOWLIST
  :101  setProductionBand(ProductionBand.of(getCareerProduction(), thresholds));
  :102  setCareerProduction(null);
  :105  setMosoNote(withoutVolumeLine(candidate.getMosoNote()));
  :119  canViewExactProduction → roleCodes(userId) anyMatch allowlist
```

Actor **không có role resolve được** ⇒ bị mask. Nên **caller máy nhận band
theo cấu trúc**. Luật là: *đi qua `CandidateFacade`, đừng bao giờ đọc entity.*

---

## 6. Retention/erasure — hôm nay đang GIỮ, và nó là một dòng config

Ba khoá độc lập, cả ba đang giữ dữ liệu (đo 2026-09-11, omni `1e617aa`):

```
registry/declaration.go:238-240   type không khai retention block = RETAIN-FOREVER
registry/lo_candidate.go          grep 'retention|retain|Erasure' = 0 hit
config/config.go:487-517          RETENTION_PURGE_EXECUTE_ENABLED default FALSE
                                  RETENTION_PURGE_SUBJECT_TYPES   default RỖNG
```

Staging: 0 key RETENTION trong 18-key configmap + 11-key secret.
Production: **omni chưa deploy** — `omni-prod` rỗng, 0 deployment omni/comm
trên toàn cluster 40+ namespace (đối chứng dương: `recruit-be = 4`).

⚠️ `retention/retention.go` package doc vẫn ghi *"THIS PACKAGE DELETES AND
ANONYMIZES NOTHING"* — **SAI**, `destructive.go` đã land. Đọc `destructive.go`.

**Tín hiệu ra ngoài:** `erasure.go:572` phát `subject.erased` qua govaudit;
topic `audit-events` đã có **5 subscription độc lập** (kể cả
`audit-events-posthog` của team khác) ⇒ recruit thêm một cái là có tiền lệ.
Chỉ IAM cấp topic là không đọc được (PERMISSION_DENIED) ⇒ **một ask**.

---

## 7. Câu 6 — Omni còn chừa gì

Hai cổng, và **có route ở omni ≠ dùng được**:

| bề mặt | omni-service | omni-react | kết luận |
|---|---|---|---|
| **unread badge** | `GET /api/v1/comm/unread-counts?subject_type=&subject_ids=csv` → `map[id]int`, ≤200 id, zeros omitted | `commPaths.ts:95-98` có `unreadCounts()` | 🟢 **một lượt gọi/trang**. Per-kind chỉ có trong lượt đọc MỘT subject (`service.go:526` trong `ListThreadedPage`) ⇒ row = badge TỔNG, mở modal mới thấy tách kênh |
| **share** | có | `OmniProvider.tsx:205` `share = declared && (omni-direct \|\| hasHostEndpoints)`, gate lifted 2026-08-19 | 🟢 **một cờ**. Comment trong recruit đã hết hạn |
| **pin** | có | đang dùng | 🟢 tin được ghim = ngữ cảnh do recruiter tự chọn ⇒ nguyên liệu AI tốt nhất |
| **tickets** | 4 route, `Department` free text, OPEN/IN_PROGRESS/RESOLVED, closed access, companion INTERNAL message ⇒ render thành card | `composerConfig.ts:407,454` `ticket: null`; **không có `commPaths` entry**; `conversationConfig.ts:56` "temporarily hidden … the tickets feature isn't ready" | 🟡 **render-only**. Được miễn phí: kho + vòng đời + phân quyền + card. Phải tự làm: form hỏi/trả lời |
| **previews** | `GET /messages/previews` (chạy cùng `Service.readGate`) | không gọi | 🟡 khuôn mẫu cho compose-on-read: sổ ở recruit, nội dung xin omni lúc đọc |
| **attachments** | có | `OmniProvider.tsx:202` `attachments = declared && hasHostEndpoints`; recruit **không có `hostSubject`** | 🔴 **cờ không đủ** — cần recruit-be mở endpoint phục vụ byte |
| **triage** | có | gated `capabilities.triage`, đọc ở `ConversationHeader.tsx:30` + `HeaderControls.tsx:12` | 🔴 cần màn riêng xuyên-nhiều-ứng-viên; chưa ai nhận (Q60) |
| **SYSTEM write** | `SystemRecorder.RecordSystemEvent(...)` idempotent, side=SYSTEM | — | 🔴 **0 route, 0 caller** (`git grep 'SQLSystemStore' -- cmd/` = rỗng) ⇒ chip "System update" đếm 0 ngay trên tera |
| **audit feed** | không có route | — | 🔴 sổ ai-làm-gì **ở lại recruit-be**, không phải lựa chọn |

**Đính chính:** tôi từng nói tickets là "phát hiện lớn nhất, xoá được `c.asks[]`
của mockup v5". **SAI** — tôi đo backend rồi kết luận về tính năng. Nó là
**một việc có backend sẵn**, không phải một cờ.

---

## 8. Wording drift — đo được

`recruit-fe/src/messages/{en,vi}/conversation.json` spread THỨ HAI lên
`conversationEn.Conversation` (381 key của package) ⇒ **25 override + 9 addition**.
Còn **50 key chưa override mang từ vựng khoản vay**. Nhóm với tới được:

| key | chuỗi hiện tại | dùng ở |
|---|---|---|
| `ghost_toggle` | "Show borrower activity" | |
| `ghost_toggle_hint` | | |
| `people_borrower_parties` | "Borrower & parties" | `PersonFilterControl:357`, `ContextPanel:121` |
| `search_results` | "…across Team and Borrower & parties" | `StreamNotices:72` |
| `tpl_docs_*` / `tpl_status_*` / `tpl_closing_*` | 3 mẫu email, có "Your closing appointment" | |
| `tour_*` | ~10 key | |

**Không có config seam** cho template hay tour — **i18n override là đòn duy nhất**.

Ghi chú role: `conversationConfig.ts:423-426` `makeRoleLabel` **humanize** role
không biết (`LO_CANDIDATE` → "Lo candidate"), KHÔNG echo "unknown" ⇒ suy giảm,
không vỡ. Nhưng `DEFAULT_ROLES` là bộ **LOAN** (11/14 key là loan) ⇒ dùng ngoài
miền khoản vay thì mất nhãn dịch, `avatarBg` rơi `bg-gray-5`, `rank` sắp theo loan.
⇒ **compose trên default**, đừng tự viết cả bộ.

---

## 9. AI / Modex — dùng lại, không phát minh

Đã có trong nhà:

| thứ | ở đâu | trạng thái |
|---|---|---|
| agent host | `agent-client` | có |
| MCP app contract | `docs/agent-host-mcp-app-contract.md` + `reference/mcp_server/` | có, runnable |
| FE package | `tera-assistant-react` (28 event, write-confirmation card, `screenContext`) | **CHƯA publish** GitHub Packages ⇐ điều kiện tiên quyết |
| script surface của recruit | `callScript.ts` + `CallScriptPanel` × 5 mount | có |

```
recruit-fe/src/shared/utils/callScript.ts
  resolveCallScript = (templates, stage) =>
    templates.find(t => t.stage === stage) ?? templates.find(t => t.stage === null) ?? null
  renderScriptBody = (body, vars) => body.replace(/\{\{(\w+)\}\}/g, …)
```

Mount: `ColdRow:111`, `HotRow:117`, `FocusClient:298`, `TodayHero:121`, `TodayQueueRow:215`.

**Ranh giới:** host lo hội thoại/ngữ cảnh/memory/model/chi phí/cổng duyệt;
app lo tool + authz. **Modex** là **state-không-có-ngày** ⇒ thuộc panel hoặc
MCP tool, **KHÔNG** thuộc timeline append-only.
**D31 phải enforce ở tầng corpus** vì **không RBAC nào gác văn xuôi**.

---

## 10. Ba giai đoạn

### Phase 1 — dọn nền (không phụ thuộc gì, làm ngay)

| việc | file | ghi chú |
|---|---|---|
| 13 i18n override | `src/messages/{en,vi}/conversation.json` | hết "Show borrower activity" + 3 mẫu email |
| unread badge trên row | `commPaths.unreadCounts()` | một lượt gọi/trang, ≤200 id |
| bật `share` | `candidateSectionConfig.tsx` | một cờ, gate lifted 2026-08-19 |
| sửa javadoc stale | `candidateSectionConfig.tsx:188-191` | cả hai mệnh đề đã sai |
| dedup key column | recruit-be | **prefix bắt buộc** — `uq_comm_message_dedupe_tenant` là `(tenant_id, dedupe_key)`, **KHÔNG có subject**, và không gian đó đang bị id thô của provider dùng (`inbound/call.go:800` DedupeKey=zoom callID) |
| quyết tickets | — | dùng omni làm kho, tự làm form; hoặc hoãn |

### Phase 2 — compose-on-read (Bao đã chốt)

- Drawer đọc `activities` (recruit, ≤100) **+** `messages/previews` (omni) rồi ghép **lúc đọc**.
- Sổ ở recruit, nội dung xin omni ⇒ tin bị xoá thì tự thôi hiện, không cần ai dọn.
- **Idempotency key dẫn từ activity id** — bắt buộc cho cả hai đường; retry vào sink không idempotent là nhân đôi hàng.
- Call Result: compose một note INTERNAL, nối vào **pha thứ ba của task hiện có**, test ca `cast unchanged`.
- CONTACT HISTORY đổi vai thành view thứ hai qua `historyHref`.

### Phase 3 — SYSTEM + AI (chờ người khác)

- SYSTEM row cần omni mở **route + wiring** (store + recorder + route + auth + tenant resolve) — không phải chỉ một route.
- Quyết định còn treo (DEV để mở): có mirror các site SYSTEM **có actor** không (`CandidateServiceImpl:286/322/348`, `DedupServiceImpl:167`).
- AI: publish `tera-assistant-react` trước; corpus đi qua `CandidateFacade`.

---

## 11. Asks cho Khải (design, không phải permission)

1. omni deploy production khi nào (hôm nay **chưa deploy ở đó**).
2. **Subject guard cho dedupe lookup** — `system.go:78-80` trả existing IM LẶNG, không so subject.
3. SYSTEM row có cho external thấy không. Hôm nay `placement.go:61-62` cho `SideSystem`
   khớp MỌI tab và `system.go:16-21` tự khai "renders in BOTH channel tabs to EVERY
   caller, confined external callers included". Thứ duy nhất đang chặn ứng viên là
   họ **không resolve về party của chính mình** (`CandidateCastAssembler:169`
   `principal_id = trimToNull(candidate.getAccountId())`, và `setAccountId` chỉ có
   **1 writer**: `DedupServiceImpl:298` merge-fill). Cột đó **có kế hoạch được điền**
   khi có S7 writer ⇒ một dòng SYSTEM ghi hôm nay sẽ **nằm chờ** tới ngày đó.
   Đây KHÔNG phải "đường lý thuyết".
4. Retention declaration cho LO_CANDIDATE là gì, ai ký để đổi.
5. IAM cấp topic `audit-events` (đọc không được từ phía tôi).

## 12. Ask cho IT/Khải (dữ liệu, chặn SMS/Call)

`zoom_los_user_id` (admin.zoom.us → User Management → Users → người đó → User ID)
và `zoom_account_email`. Chưa có UI ⇒ `curl` `PUT /api/v1/admin/zoom-links/{central_user_id}`
(ADMIN với tới `SETTINGS_MANAGE` qua wildcard `"*"`).
