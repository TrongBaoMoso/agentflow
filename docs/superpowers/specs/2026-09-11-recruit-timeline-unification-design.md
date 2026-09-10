# recruit ↔ omni: hợp nhất timeline + Call Result vào Conversation modal

**Ngày:** 2026-09-11 · **sửa sau peer review cùng ngày**
**Trạng thái:** đã chốt hướng (compose-on-read), chưa code
**Neo cây:** recruit-be `origin/master` = **b8bc0df** · omni-service = **1e617aa** · recruit-fe = **12e4ebf**

> ## ⛔ KHÔNG MỤC NÀO TRONG TÀI LIỆU NÀY CHẠY TRÊN PRODUCTION
> **omni CHƯA BAO GIỜ deploy production QUA PIPELINE DUY NHẤT CỦA NÓ.** Branch
> `prod` không tồn tại và **0/172** run CD nào chạy trên ref đó (§6).
> ⚠️ **Đúng phạm vi:** cả hai bằng chứng nói về **PIPELINE**, không nói về
> **CLUSTER** — một `helm upgrade` gõ tay đi vòng qua toàn bộ CI, và loại trừ nó
> cần quyền đọc `omni-prod` mà ta **bị Forbidden**.
> Nghiệm thu trên staging KHÔNG nói gì về prod — đúng hình dạng cái bẫy
> `next_follow_up_at`. Mọi báo cáo "Phase N xong" mà không nhắc dòng này là thiếu.
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

## 0.5 Peer review đã sửa gì trong bản đầu (68378b6)

Bốn phiên đo lại. **Mọi claim chịu lực của họ tôi đã tự đo lại trước khi nhận.**

| # | bản đầu của tôi | sự thật | ai bắt |
|---|---|---|---|
| a | "`omni-prod` rỗng, 0 deployment trên 40+ ns" | **số 0 từ lỗi Forbidden** — §6 | DOUBLE CHECK |
| b | "compose-on-read qua `previews`" | `previews` nhận **omni message id**, và `activities` **KHÔNG có cột nào giữ nó** — §5.0 | LEAD |
| c | "corpus AI đi qua `CandidateFacade`" gói chung với drawer | `previews` cắt **240 code point**, cap **50 id** ⇒ đủ cho drawer, **bất khả thi cho corpus AI** — §5.1, §9 | LEAD |
| d | "nối pha thứ ba vào `pushThen`" | API chỉ có **MỘT slot `then`** — §4.3 | DEV |
| e | "khe hai transaction" | **khe đó KHÔNG tồn tại** — `recordOutcome` là một `@Transactional` — §4.4 | DEV |
| f | erasure law = `authoredWithBody` | law thật là `notSystem`; và **CALL content BỊ purge** — §6 | phiên omni |
| g | 9 call site `ActivityEntity` | đúng 9 **construction**, nhưng có **site thứ 10 là MUTATION** — §4.5 | DEV |
| h | tickets 🟡 "để mở" | **HOÃN dứt khoát** — omni không có route hàng đợi xuyên-subject — §7 | LEAD |

**Và một thứ land SAU commit 68378b6:** PR **#316 / D110** (`b8bc0df`) — *"managers/admins
can view+act on team follow-ups"*. Nó mở một lỗ bản đầu không thể thấy: **§4.6**.

Mọi số dòng `FollowUpServiceImpl` trong bản đầu lệch **+27**.

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

⇒ Trả lời câu 4, **và bản đầu biện hộ một nửa** (LEAD bắt):

**Đáp án không phải "giữ", cũng không phải "bỏ".** Ràng buộc tôi tìm ra là THẬT:
omni **không có route audit feed**, nên đổi chủ / đổi stage / follow-up / SYSTEM
**không có nhà nào khác**. Đó không phải "giữ vì nó tồn tại", đó là "dữ liệu chỉ
có một chỗ ở".

**NHƯNG** điều đó bênh vực **DỮ LIỆU** và **MỘT VIEW**, không bênh vực **CÁI PANEL**.
Bao đang hỏi về cái panel **như nó hôm nay** — một chỗ để đọc tin nhắn. **Vai đó
chết.** Trả lời "còn cần" mà không nói vai đã đổi thì Bao nghe thành "không đổi gì",
UI đọc-tin-nhắn ở lại, và ta có **hai bề mặt cùng render hội thoại** — chúng sẽ trôi
khỏi nhau, đúng thứ compose-on-read sinh ra để diệt.

**Và tiền lệ tera là một GIẤY PHÉP, không phải một LÝ DO.** `historyHref` cho phép
có hai view; nó không nói nên có hai view. Câu sắc hơn mà compose-on-read mở ra và
tera KHÔNG có: **khi timeline đã ghép rồi thì "Contact History" là một VIEW THỨ HAI
hay một CHIP LỌC trên một timeline?**

> **QUYẾT: gập vào làm BỘ LỌC trên timeline đã ghép; giữ `historyHref` làm đường lui.**

**Phép đo lật quyết định (chưa ai chạy):** RBAC và KHỐI LƯỢNG của hàng audit so với
hàng activity. Hàng audit chỉ ADMIN xem được, **hoặc** nhiều gấp một bậc ⇒ nó là
view riêng. Ngược lại ⇒ một cái chip. **Đo trước khi dựng cái nào.**

Câu nói với Bao, đúng một câu: *"panel như hôm nay thì bỏ; dữ liệu trong đó thì giữ,
và nó thành một bộ lọc."*

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

**Và đóng luôn cửa người sau sẽ đẩy** (phiên omni bổ sung, tôi đo lại): *"reply xong
rồi `PATCH` note=true là xong chứ gì"* — **không xong**, và lý do khác hẳn:

```
messages/placement.go:61-62  matchesSide(m, side) { return side=="" || m.Side==side || m.Side==SideSystem }
is_note trong internal/messages/*.go  ->  5 file, 0 chỗ nằm trong WHERE
                                          (chỉ ở SELECT list, store_page.go:92 suy ra Kind, mapper.go:210 json tag)
service.go:789               Note: in.Note        <- Compose set note KHÔNG có side guard nào
```

⇒ **`note` là một CÁI NHÃN, không phải một CÁI CỔNG.** Một hàng `side=EXTERNAL,
note=true` **vẫn hiện với ứng viên**. Nên câu chốt đúng không phải *"reply cho ra
note=false nên ứng viên thấy"* mà là:

> **Trên đường reply, `side` là axis DUY NHẤT kiểm soát ai thấy — và `note` không
> cứu được, kể cả khi set được.**

### 4.2 Đường đúng — compose một note INTERNAL

`POST /messages` với `{side: INTERNAL, note: true}`, không channel, không
recipient. omni cho phép:

```
service.go:745   ErrNoExternalSide chỉ bắn khi Side == SideExternal
service.go:833   "a channel-less INTERNAL compose reads as 'added an internal note'"
service.go:1756  validateChannelTargets 400 chỉ khi channels có EMAIL/SMS
```

**Đối chứng ĐƯỜNG CHẠY, không phải đọc code** (phiên omni đo trên staging):
cú gọi 18:05:51 hôm nay (ứng viên `eec3628a`, lần chạm đầu tiên, `master-704071e1`)
cho `PUT /cast 200` → `GET /cast 200` → **`POST /calls 200 user=bc47b6e5`**.
`CreateCall` đi qua đúng `authorOn`/`internalAuthorIn` đó ⇒ **party RECRUITER thật
sự resolve được trên staging.** Mạnh hơn một lượt đọc code.

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

Đã là **một task hai pha**, KHÔNG phải hai hook đua nhau.

### ⚠️ SỬA — "pha thứ ba" là một API KHÔNG TỒN TẠI (DEV bắt, tôi đo lại)

```
git grep -n 'Runnable' -- '*CandidateCastPush.java'    -> ĐÚNG 3 hit:
  :109  public void pushAfterCommit(final String candidateId, final Runnable then)
  :177  private void submit(final String candidateId, final Runnable then)
  :201  private void pushThen(final String candidateId, final Runnable then)
```

**Một slot `then` duy nhất.** `pushThen` = `send()` trong try/catch, rồi
`if (then == null) return;`, rồi `then.run()` trong try/catch. **Hai pha, hết.**

Gộp hai Runnable (`() -> { mirror.run(); note.run(); }`) thì chúng vào **MỘT**
try/catch — phá đúng bất biến class tự hứa ở `:100-102`: *"The push is wrapped so
a defect in it cannot swallow the follow-on; the follow-on is wrapped so a defect
in it cannot surface on a pool thread."* Gộp cho 2 pha cô lập, không phải 3:
mirror ném thì note biến mất. Hôm nay `CandidateCallMirror.send` bắt hết ở từng
bước nên nó không ném — nhưng **dựa vào điều đó là đúng dạng "phụ thuộc im lặng"**.

⇒ **Bản vá:** đổi `Runnable then` thành varargs / `List<Runnable>` và **lặp, mỗi
phần tử một try/catch**. Nhỏ, giữ nguyên câu javadoc đang đúng, và làm "pha thứ N"
thành sự thật thay vì cách nói.

### ⚠️ `then` KHÔNG PHẢI LUÔN CHẠY — outcome thứ năm

`pushThen:85-90` liệt kê bốn lối ra của `send` mà `then` vẫn chạy (pushed /
unchanged / empty cast / failed). Nhưng có lối thứ năm **nằm ngoài javadoc đó**:

```
submit:177-192   omniCastPushExecutor.execute(...)
                 catch (RuntimeException notScheduled) {   // queue bounded đầy, hoặc pool shutdown
                     log.warn("... was not scheduled ...; omni's copy stays stale");
                     if (then != null) log.warn("Omni follow-on task ... was dropped with the push");
                 }
pushAfterCommit:114  if (!isConfigured() || isBlank(candidateId)) return;   // gate CẢ `then`
```

**Chênh lệch quyết định:** với **call mirror**, drop là chấp nhận được —
`CandidateCallMirror:68-75` nói không retry vì cửa sổ webhook Zoom đóng thì hàng
mồ côi còn tệ hơn. Với **NOTE** thì khác: note **không có cửa sổ hết hạn**, nó chỉ
là **phân kỳ dữ liệu không có đường về**. Bản đầu thừa hưởng chính sách no-retry
của call mirror cho một payload có ngữ nghĩa khác — **phải quyết riêng**.
Tối thiểu: đánh dấu trên hàng `activity` là "chưa mirror" để có đường sửa sau.

⚠️ **Nối vào LƯỢT THỬ (task), KHÔNG nối vào nhánh PUT thành công.** Javadoc của
chính class đó đã cảnh báo: nối vào nhánh thành công thì ca phổ biến nhất
("fingerprint unchanged → không PUT gì cả" = mọi cú gọi từ lần thứ hai) sẽ
**bị bỏ qua**. Phải có test: *cast unchanged (no PUT at all) → follow-on VẪN chạy*.

### 4.4 ⚠️ SỬA — "khe hai transaction" KHÔNG TỒN TẠI

Bản đầu lo: *"người dùng lưu note xong, outcome fail ⇒ note đã vào omni mà
next-step chưa set."* **Khe đó đóng SẴN, bằng cấu trúc.** Đo lại:

```
FollowUpServiceImpl:64-67
    @Override
    @Transactional
    public CandidateEntity recordOutcome(final String candidateId,
                                         final CallOutcomeRequest request, final String actorId) {
```

`saveNote` + `systemActivity` + `upsertAuto` **tất cả nằm trong** transaction đó.
Outcome fail ⇒ rollback ⇒ **không commit** ⇒ `afterCommit` **không bao giờ chạy**
⇒ không có gì vào omni.

⇒ Ba phương án tôi từng nêu (gộp endpoint / đảo thứ tự / hiện lỗi): **không cái nào.**
**Điều kiện duy nhất: mirror PHẢI cưỡi `afterCommit`, không được gọi trong thân method.**

### 4.4b Và đường Focus KHÔNG CÓ HÀNG CALL NÀO — compose-note là đường CHÍNH

Javadoc của chính `recordOutcome` (`:69-71`), nguyên văn:

> *"an outcome IS a call that already happened (**the Focus "Log result" path never
> logs a CALL activity, so hook 1 in ActivityServiceImpl does not cover it; this is
> the only place that does**)"*

Ba hệ quả:

1. Trên đường Focus, "một modal một lượt lưu" **ĐÃ LÀ hiện thực** — một endpoint,
   một transaction. Không có gì để gộp.
2. `channel_ref` của một hàng CALL thường **không tồn tại vì hàng CALL không tồn tại**.
   ⇒ nhánh compose-note **không phải fallback, nó là đường chính** — một lý do độc
   lập nữa để bỏ bước đọc message id, ngoài lý do EXTERNAL-side ở §4.1.
3. `autoClearOnCallLogged` gọi ở `:75` **trước** switch, cho mọi branch ⇒ nếu mirror
   cả SYSTEM thì nhớ nó cũng phát hàng qua `FollowUpAutoClear:72`, và site đó
   `actorId = null`.

**Khe THẬT (tiền tồn, không phải của tôi — chỉ đừng làm rộng thêm):** `upsertAuto`
là một **network call tới followup-be nằm TRONG transaction** (`:211-215`, comment
"REMOTE FIRST"). Javadoc `:43-48` bảo vệ chiều *remote fail ⇒ không có gì local*.
Chiều ngược thì không: remote **thành công** rồi một lượt ghi local sau đó fail ⇒
rollback local, followup-be **vẫn giữ arm**. `noAnswer` có 4 lượt ghi local sau remote.
⇒ Nếu spec hứa "một lượt lưu nguyên tử" thì **giới hạn câu hứa vào Postgres của
recruit-be**, đừng hứa xuyên followup-be.

### 4.5 Site thứ 10 — MUTATION, không phải CONSTRUCTION

Con số 9 của tôi (`new ActivityEntity()`) **đứng**, và DEV kiểm bằng ba neo khác:
`ActivityEntity.builder()` = 0 (đối chứng dương: `.builder()` có ở 7 file khác, và
`ActivityEntity` **có** `@SuperBuilder` nên đây là đường đáng nghi nhất — nó sạch);
`entityService.save(activity` = 9; `INSERT INTO activities` native = 0.

**Nhưng có site thứ 10, và mọi phép đếm theo construction LẪN theo receiver đều mù:**

```
DedupServiceImpl:55-57
  /** Child tables that follow the survivor — each has a plain candidateId column. */
  private static final List<String> CHILD_ENTITIES = List.of(
        "ActivityEntity", "StageHistoryEntity", "OwnerHistoryEntity", "OfferEntity");
```

Merge dedup **re-point hàng activity sang `candidate_id` của survivor**. Không `new`,
không `save(activity)` mới. Hệ quả: hàng đã mirror lên omni dưới subject A xuất hiện
trên timeline của B ở recruit-be, còn **omni vẫn giữ chúng ở A**.
`DedupServiceImpl` đã re-push cast của survivor, nhưng **omni không có API di dời
message giữa subject** ⇒ câu trả lời đúng có thể là **"chấp nhận và ghi ra"**,
không phải "vá". Allowlist theo call site KHÔNG nhìn thấy ca này.

### 4.6 ⛔ LỖ D110 — MANAGER GHI OUTCOME, MÀ MANAGER KHÔNG CÓ TRÊN CAST

**Land sau commit 68378b6** (PR #316, `b8bc0df`). Bản đầu không thể thấy. Chuỗi bốn mắt:

```
1. FollowUpServiceImpl:302   if (!isOwner(candidate, actorId) && !isElevated(actorId)) { ... }
                             isElevated = hasPermission(actorId, RecruitPermission.REPORT_TEAM)
2. javadoc :287-299          "An actor holding REPORT_TEAM (MANAGER, ADMIN via the wildcard) can
                             act on ANY candidate's follow-ups, including an unowned one … every
                             activity is attributed to actorId — the ACTING user … NEVER to the owner"
3. CandidateCastRole:16-23   "HIRING_MANAGER is declared by omni and deliberately NEVER pushed by
                             recruit-be … Mapping an rbac role onto it instead (MANAGER, say) would
                             be inventing an edge … which is a disclosure decision nobody has made."
                             grep HIRING_MANAGER -- src/main/java = 3 hit, TOÀN BỘ là javadoc/khai báo
4. omni service.go:1931-1938 authorOn -> ErrNotInternalParticipant khi !d.Read || d.Confined
                             lo_candidate.go:68 loCandidateStaffGrant = []  (cast-only)
```

Cast chỉ mang `RECRUITER` (= `owner_id`), `ONBOARDING`/`LICENSING` (checklist assignee),
`CANDIDATE`. **Manager không có mặt.**

⇒ **Manager ghi outcome ⇒ note không có tác giả trên cast ⇒ omni trả 400 ⇒ mirror
log rồi return.** Tức **đúng những note mà D110 vừa được tạo ra để team nhìn thấy
lại là những note không bao giờ tới omni** — và im lặng, vì mirror nuốt hết ngoại lệ.

Không phải edge hiếm: D110 tồn tại vì Bao yêu cầu (*"đã là manager thì … thậm chí
thao tác được luôn"*).

**Ba lối, cả ba là quyết định của người khác:**

| | nội dung | ai quyết |
|---|---|---|
| (a) | push `HIRING_MANAGER` lên cast cho actor elevated | **Khải** — xem §4.6b: nội dung THẬT của quyết định đó rộng hơn nó nghe |
| (b) | **không mirror note của actor off-cast, và NÓI RA trong UI** rằng note này chỉ có trong recruit-be | không cần ai quyết — **fail-closed** |
| (c) | đi đường `SystemRecorder` authorless | chưa có wiring (§7) |

**Khuyến nghị: (b) cho Phase 2** vì nó fail-closed và không chờ ai; **(a) là ask riêng.**

### 4.6b INTERNAL read KHÔNG CÓ THANG BẬC — và staff-grant là NGÕ CỤT

```
access/gate.go:245-246  case hasInternal:   return Access{Read: true, Confined: false}
access/gate.go:252-253  case hasStaffGrant: return Access{Read: true, Confined: false}
.Rank trong internal/access/  ->  0 hit   (rank chỉ để sắp xếp, KHÔNG phải trục quyền)
```

`Confined: false` = **đọc CẢ HAI SIDE**. Nên nội dung thật của *"a disclosure decision
nobody has made"* **không phải** "cho manager thấy note của team". Nó là:

> **Push `HIRING_MANAGER` = manager đọc TOÀN BỘ thư từ phía ứng viên — mọi email,
> mọi SMS ứng viên đã trao đổi — không chỉ phần Team-side.**

**Và omni có HAI cần, chỉ MỘT giải được D110:**

| cần | Read | **Author** | phạm vi |
|---|---|---|---|
| (a) push cast row `HIRING_MANAGER` | `Confined:false` | ✅ | **theo từng ứng viên** |
| (b) điền `loCandidateStaffGrant` | `Confined:false` | ❌ **KHÔNG** | **toàn tổ chức, mọi ứng viên** |

```
service.go:1946-1956  internalAuthorIn(castRows, userID):
    for ... if p.Side == registry.SideInternal && p.PrincipalID != nil && *p.PrincipalID == userID
    return nil, ErrNotInternalParticipant
    => KHÔNG có nhánh staff-grant nào trong đường author
```

⇒ **(b) là ngõ cụt cho D110** — nó nới READ ra **toàn công ty** (javadoc `lo_candidate.go`
gọi thẳng: *"how a recruiting record ends up readable by the whole company"*) mà **vẫn
không cho manager ghi được note**. Nửa nguy hiểm không kèm nửa hữu ích. Và nó là cái
**dễ đề nghị nhất**, vì `loCandidateStaffGrant = []` nằm đó trông như chỗ trống chờ điền.
⇒ **Ask phải nói thẳng (b) KHÔNG phải phương án thay thế**, kèm hai dòng trên.

**Cửa thứ ba, và nó TỆ HƠN:** "ghi note của manager thành hàng SYSTEM" — authorless nên
bỏ qua `authorOn` hoàn toàn, và sống qua erasure. Hai thứ đang chặn biến mất cùng lúc.
**Đừng** — `system.go:16-21` tự khai *"renders in BOTH channel tabs to EVERY caller,
confined external callers included"* ⇒ **ứng viên đọc được note của manager**. Fail-open
theo chiều ngược, tệ hơn (a) vì (a) ít nhất còn là nội bộ. (Và chưa nối được:
`RecordSystemEvent` = 0 caller; đối chứng dương `NewService(` = 24 hit non-test.)

## 5. Quyết định đọc: COMPOSE-ON-READ, không mirror

### 5.0 ⛔ ĐIỀU KIỆN TỒN TẠI CỦA PHASE 2 — HÔM NAY KHOÁ NỐI KHÔNG CÓ

LEAD nêu, **không ai đo**, tôi đo:

`previews` nhận **omni MESSAGE ID** (`?ids=<comma-separated message ids>`). Nên
Phase 2 **ngầm giả định** hàng `activities` của recruit MANG omni message id.

```
ActivityEntity.java (b8bc0df) — 11 @Column:
  candidate_id · type · direction · channel_ref · summary · subject · body
  internal · actor_id · automation_ref · occurred_at
git grep -inE 'omni|message_id' -- 'db/migration/*' | grep -i activit
  -> 3 hit, TOÀN BỘ là COMMENT (V014:6, V059:7, V059:33). KHÔNG cột nào.
  (đối chứng dương cho chính grep: 'activities' trong V001__init.sql = 5 hit)
```

⇒ **KHÔNG CÓ CỘT NÀO GIỮ omni message id.** ⚠️ Nhưng ghi cho chuẩn, kẻo người sau
**tìm thấy `channel_ref` và dùng nó**: có **đúng một cột hình dạng phù hợp, và nó đã
bị đặt tên cho thứ khác**.

```
ActivityEntity.java:53-54    @Column(name="channel_ref") private String channelRef;
ActivityServiceImpl.java:93  activity.setChannelRef(request.getChannelRef());  <- writer DUY NHẤT,
                             ghi thứ CLIENT gửi (LogActivityRequest:28)
getChannelRef trên entity    = 0 reader
OmniCallMirrorClient:113-116 "documented as the Zoom Phone call id and OVERLOADING IT
                              WOULD DESTROY THAT MEANING, while a new column is only
                              worth having once something reads it."
```

**Và cùng javadoc đó THU HẸP blocker này** (phiên omni chỉ ra):

> *"omni already reconciles the two sides **on the Zoom call id**, so the link exists
> where it is needed without recruit-be keeping a copy."*

⇒ Với hàng **CALL**, mối nối **ĐÃ TỒN TẠI** qua Zoom call id — **không cần cột**.
Cột mới chỉ cần cho **NOTE / CHAT** (không có provider id nào). Blocker phải nói vậy,
đừng nói "previews chưa dùng được" chung chung.

**Và đây là chỗ bản đầu gộp thật:** "dedup key column" (Phase 1) và "idempotency key
dẫn từ activity id" (Phase 2) — bản đầu đặt **HAI TÊN ở HAI PHASE** và không nói
chúng có phải **MỘT** không. Trả lời: **có, và nó là ĐIỀU KIỆN TỒN TẠI của Phase 2**,
không phải một chi tiết của Phase 2.

⇒ **Tiêu đề thật của Phase 1 là "CÓ KHOÁ NỐI", không phải 13 key i18n.**

Hai thiết kế nối khả dĩ — **chọn tường minh, kẻo người sau dựng lại cái bị loại**:

| | skeleton lấy từ | ghi chú |
|---|---|---|
| **A (CHỌN)** | bảng `activities` của recruit + cột mới giữ omni message id | giàu hơn, cục bộ hơn, recruit đã sở hữu sổ |
| B (LOẠI) | audit log — **đây là cách tera làm** | thêm một phụ thuộc, và audit của recruit ở recruit-be nên không mua được gì |

Việc thật của Phase 1: **thêm cột + backfill**. Đó là việc **lớn nhất** của Phase 1,
không phải i18n.

### 5.1 ⚠️ previews CẮT 240 CODE POINT, CAP 50 ID — đủ cho drawer, KHÔNG đủ cho AI

```
previews.go:44   MaxPreviewIDs   = 50
previews.go:49   ExcerptMaxRunes = 240
previews.go:369  p.Excerpt = truncateRunes(strings.Join(parts, excerptJoiner), ExcerptMaxRunes)
previews.go:157  if len(ids) > MaxPreviewIDs { ... }      <- 400, KHÔNG cắt ngầm
```

Bản đầu gói **hai** thứ vào một câu "compose-on-read":

| | trạng thái |
|---|---|
| **(i) DRAWER** | ✅ **hoàn hảo, SHIP.** Quote block 240 ký tự, muốn đọc đủ thì bấm vào modal. Chỉnh một chi tiết: drawer đọc 100 dòng, cap là 50 ⇒ **HAI lượt gọi**, hoặc trần 50 hàng omni. Handler **TỪ CHỐI** (400) chứ không cắt ngầm — *"a silently shortened batch renders some feed rows with content and some without"* |
| **(ii) CORPUS CỦA AI** | ⛔ **BẤT KHẢ THI bằng cơ chế này.** Một AI được bảo "nhắc lại context các lần trước" mà đọc **bản cụt 240 ký tự** thì **nó ĐIỀN NỐT PHẦN THIẾU** — chế độ hỏng "sai một cách tự tin", đi vào bằng cửa khác: không phải mất hàng, mà **hàng nào cũng bị cắt** |

⇒ **TÁCH LÀM HAI CÂU.** "compose-on-read cho DRAWER = `previews`" (chốt, ship) vs
"corpus của AI đọc **THÂN ĐẦY ĐỦ**" (endpoint khác, chi phí khác, câu chuyện erasure khác).

### 5.2 Và omni TỰ KHAI đây là ý đồ thiết kế, không phải tác dụng phụ

`messageshttp/handler.go:217-226`, nguyên văn:

> *"It exists because audit envelopes are content-free by design (#177) — the feed
> joins content back at READ time, through omni's own gate, so **erasure, retention
> and legal hold apply to the History drawer for free**."*

⇒ Câu "tin bị xoá thì tự thôi hiện" **được chính omni bảo chứng**. Điều đó biến
Phase 2 từ *một lựa chọn của tôi* thành *sự phù hợp với thiết kế của nhà cung cấp*.

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
   ⚠️ **SỬA CƠ CHẾ** — bản đầu dẫn `previews.go:402 authoredWithBody`. **Sai nguồn.**
   Luật erasure thật (§6): `notSystem` = `NOT (m.side='SYSTEM' OR m.sys_type IS NOT NULL)`.
   NOTE **không có miễn trừ** ⇒ body bị null. (Và **CALL cũng không** — xem §6.)
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

**Production — ĐÍNH CHÍNH 2026-09-11 (DOUBLE CHECK bắt, tôi đo lại và nhận).**
Bản đầu của tài liệu này viết *"`omni-prod` rỗng, 0 deployment omni/comm trên
toàn cluster 40+ namespace"*. **Phép đo đó HỎNG.** Đo lại, không nuốt stderr:

```
kubectl --context gke_lender-rate_us-central1_moso-gke get deploy -n omni-prod
  Error from server (Forbidden): ... User "bao.trinh@loanfactory.com" cannot
  list resource "deployments" ... in the namespace "omni-prod"        rc=1
kubectl ... get deploy -A                                             rc=1  (Forbidden, cluster scope)
kubectl ... get deploy -n recruit-be    recruit-be 2/2 2 2 7d5h        rc=0
```

⇒ Số 0 kia là **SỐ 0 TỪ LỖI**. Và đối chứng dương `recruit-be` **không cứu
được**: nó chạy trong một namespace tôi ĐỌC ĐƯỢC, tức nó chứng minh `kubectl`
chạy chứ **không** chứng minh tôi đọc được `omni-prod`. Đối chứng phải chia
**cùng luồng quyền** với thứ đang đo, không chỉ cùng câu lệnh.

**Bằng chứng thay thế — không phụ thuộc quyền k8s.** `cd.yml` chọn prod bằng
`github.ref == 'refs/heads/prod'` ở **toàn bộ** 16 selector (image, project,
channel, WIF provider, service account, cluster `moso-gke`, namespace
`omni-prod`, `values-prod.yaml`). Vậy:

| phép đo | kết quả |
|---|---|
| `git ls-remote --exit-code origin prod` | `rc=2` — **branch `prod` KHÔNG tồn tại** (đối chứng dương: 56 branch remote; `grep -i prod` chỉ ra `ci/cve-watch-prod-arm`) |
| `gh run list --workflow=cd.yml --limit 400` | **172 run toàn lịch sử: 170 push master + 2 workflow_dispatch master, 0 trên ref `prod`** |
| `kubectl get ns omni-prod` | Active 17d — provisioned ~25/08, khớp sổ cũ "provisioned 24/08 chưa deploy" |

Hai lượt `workflow_dispatch` cũng trên master ⇒ chúng deploy **staging**, nên
đường dispatch tay không mở lỗ nào.

**Câu đúng để trình:** *"CD chưa từng deploy omni lên production — branch `prod`
không tồn tại và 0/172 run nào chạy trên ref đó. Namespace `omni-prod` đã
provisioned nhưng account của ta không đọc được nội dung nó."*
**Không** nói "0 deployment trên 40+ namespace" — câu đó **không đo được** bằng
quyền hiện có. Còn một khe không đo được: một lượt `helm upgrade` tay ngoài CD.

### ⛔ LUẬT ERASURE THẬT — `notSystem`, KHÔNG PHẢI `authoredWithBody`

Bản đầu dẫn `previews.go:398-406 authoredWithBody` làm luật erasure. **Sai nguồn.**
Phiên omni bắt, tôi đo lại:

`authoredWithBody` có **đúng MỘT caller** — `previews.go:393 contentErased()` — và
nó trả lời *"hàng này có PHẢI đã bị cào không, để tôi dán nhãn lên preview"*. Tức
nó là **bộ dò BIA MỘ lúc ĐỌC**. CALL/SYSTEM bị loại khỏi nó **không phải vì erasure
tha chúng**; javadoc `:388-390` nói lý do ngược lại: *"for those, 'no body' is the
NORMAL state and the tombstone would be a lie."*

Luật thật, và nó chỉ có **MỘT** ngoại lệ:

```
retention/destructive_sql.go:31-35
  // notSystem is the predicate that keeps SYSTEM/audit timeline rows out of every ...
  const notSystem = `NOT (m.side = 'SYSTEM' OR m.sys_type IS NOT NULL)`
  dùng ở :432 :454 :693 :818
destructive.go:30-31   "SYSTEM/AUDIT ROWS ARE NEVER PURGED. Every message-body scrub
                        excludes the SYSTEM timeline rows"
is_note trong destructive_sql.go + erasure.go  ->  0 hit
```

**Và CALL KHÔNG SỐNG.** Nó có nhánh purge riêng:

```
destructive_sql.go:502-508  UPDATE comm_call SET transcript = NULL, ai_summary = NULL
                            WHERE message_id IN (SELECT ... AND notSystem)
:109  ErasedCallTextColumns    = {recording_url, ai_summary}
:115  PurgedCallContentColumns = {ai_summary}
:95   PurgedBodyColumns        = {body, body_trimmed, subject, body_html}
```

⇒ **Thứ duy nhất sống qua erasure/purge là `side='SYSTEM' OR sys_type IS NOT NULL`.**
NOTE không miễn trừ ⇒ body null. CALL không miễn trừ ⇒ transcript + recording_url
+ ai_summary null.

**Kết luận chống mirror NOTE không đổ — nó MẠNH HƠN.** Nhưng ⛔ **HƯỚNG CỦA
PREDICATE THÌ NGƯỢC VỚI BẢN TRƯỚC CỦA TÔI** (DEV bắt, tôi đo lại):

### ⛔ `notSystem` LÀ LUẬT **MIỄN TRỪ**, KHÔNG PHẢI LUẬT **BẢO VỆ**

Bản trước viết *"phương án 'chỉ mirror SYSTEM' được chính predicate xác nhận"*.
**Đọc predicate theo chiều nó thật sự chạy thì nó nói điều ngược lại:**

```
git grep -n notSystem -- internal/retention/*.go   (bỏ test)
  :35 định nghĩa · :432 :454 :693 :818 — CẢ BỐN đều là `AND notSystem`
  => "chỉ chạm hàng KHÔNG phải SYSTEM"
sys_detail trong toàn package retention  ->  0 hit  (rc=1)
  => KHÔNG câu nào null nó, bao giờ
```

| hàng được mirror | `notSystem` | bị erasure? | confined external thấy? |
|---|---|---|---|
| **NOTE** (`side=INTERNAL`, `note=true`) | TRUE | **CÓ** — body bị null | **KHÔNG** |
| **SYSTEM** (`side=SYSTEM`, `sys_type` set) | FALSE | **KHÔNG BAO GIỜ** | **CÓ** |

Và SYSTEM hiện cho confined external **trên đường ROOT**, không có cổng thứ hai:

```
service.go:404-406  if confined { effectiveSide = registry.SideExternal }
service.go:478      for _, m := range roots { if matchesSide(m, effectiveSide) && ... }
placement.go:61-62  return side=="" || m.Side==side || m.Side==registry.SideSystem
service.go:500      if confined && r.Side != effectiveSide  <- chỉ áp cho REPLIES (r.Side),
                    KHÔNG áp cho roots. Một hàng RecordSystemEvent LÀ root.
```

**Và nội dung recruit-be sắp đẩy vào đó là dữ liệu cá nhân, nguyên văn:**

```
FollowUpServiceImpl:242-244
  systemActivity(candidate, actorId,
      "Call outcome NOT_INTERESTED -> ARCHIVED "
          + (NO_REASON.equals(reason) ? reason : "(" + reason + ")"));
recruit-fe OutcomeModal/index.tsx:29
  ARCHIVE_REASONS = ['Not interested','Signed elsewhere','Wrong information','Asked to stop contact']
```

⇒ Một hàng nói **"Call outcome NOT_INTERESTED -> ARCHIVED (Asked to stop contact)"**,
**không bao giờ xoá được**, **hiện trên cả hai tab cho mọi caller đọc được cast, kể cả
confined external** — và external của LO_CANDIDATE **chính là ứng viên**. Đó là bộ ba
thuộc tính người ta thiết kế để **TRÁNH**, không phải để chọn.

> **CÂU ĐÚNG ĐỂ GHI:** `notSystem` **không bảo vệ** SYSTEM — nó **MIỄN TRỪ** SYSTEM
> khỏi erasure. Cộng `matchesSide` khớp mọi tab, một hàng SYSTEM là **vĩnh viễn +
> hiện cho external**. Nên nó là **lý do THỨ BA để KHÔNG mirror SYSTEM** (cạnh
> actor-off-cast §4.6 và fan-out), và là **lý do ĐỘC LẬP ĐỂ mirror NOTE**:
> `side=INTERNAL` không bao giờ tới confined caller, và `notSystem`=TRUE nên body
> của nó **nằm trong** phạm vi right-to-erasure.

**Vì sao phải sửa dù kết luận không đổi:** nếu spec ghi "predicate xác nhận
chỉ-mirror-SYSTEM" thì người đọc sáu tháng sau dùng đúng câu đó để **thăng Phase 3**,
với niềm tin rằng retention đã bảo vệ họ — trong khi retention là thứ **miễn trừ**
hàng đó khỏi mọi lượt xoá. **Số đúng + cơ chế sai vẫn là báo cáo sai**, và ở đây cơ
chế sai đẩy quyết định về **phía có hại**.

**Giới hạn trung thực (DEV tự hoãn, tôi giữ):** hôm nay **ứng viên chưa đọc được gì** —
`candidates.account_id` có đúng một writer (`DedupServiceImpl:298`, merge fill, loser
cũng null) nên `principal_id` luôn rỗng. Đây là **rủi ro có ngày hết hạn** (S7 writer),
**không phải lỗ đang chảy**. Đừng ghi "ứng viên sẽ thấy" ở thì hiện tại — ghi là
*"sẽ thấy kể từ khi có S7 writer, và hàng đã ghi thì không xoá được."*

⚠️ **Xoá mọi câu ngụ ý "CALL sống qua erasure".** Người sau đọc `authoredWithBody`
như luật erasure sẽ kết luận bản ghi cuộc gọi miễn nhiễm — sai, và sai về phía
"giữ được dữ liệu", tức đúng hướng dễ đem ra biện hộ cho một thiết kế.

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
| **tickets** | 4 route, `Department` free text, OPEN/IN_PROGRESS/RESOLVED, closed access, companion INTERNAL message ⇒ render thành card | `composerConfig.ts:407,454` `ticket: null`; **không có `commPaths` entry**; `conversationConfig.ts:56` "temporarily hidden … the tickets feature isn't ready" | 🔴 **HOÃN** — xem §7.1 |
| **previews** | `GET /messages/previews` (chạy cùng `Service.readGate`) | không gọi | 🟡 khuôn mẫu cho compose-on-read: sổ ở recruit, nội dung xin omni lúc đọc |
| **attachments** | có | `OmniProvider.tsx:202` `attachments = declared && hasHostEndpoints`; recruit **không có `hostSubject`** | 🔴 **cờ không đủ** — cần recruit-be mở endpoint phục vụ byte |
| **triage** | có | gated `capabilities.triage`, đọc ở `ConversationHeader.tsx:30` + `HeaderControls.tsx:12` | 🔴 cần màn riêng xuyên-nhiều-ứng-viên; chưa ai nhận (Q60) |
| **SYSTEM write** | `SystemRecorder.RecordSystemEvent(...)` idempotent, side=SYSTEM | — | 🔴 **0 route, 0 caller** (`git grep 'SQLSystemStore' -- cmd/` = rỗng) ⇒ chip "System update" đếm 0 ngay trên tera |
| **audit feed** | không có route | — | 🔴 sổ ai-làm-gì **ở lại recruit-be**, không phải lựa chọn |

### 7.1 TICKETS — HOÃN DỨT KHOÁT (LEAD khuyến nghị, tôi đo lại và nhận)

Bản đầu để nó "mở, quyết trong Phase 1". **Sai** — một quyết định để mở trong bảng
phase **sẽ bị đọc là "nhỏ, tự giải quyết"**, và cái này rẽ thành *hoãn* hoặc
*làm một tính năng*.

Hai dữ kiện quyết định (đo trên `1e617aa`):

```
ticketshttp/handler.go:61-66   Mount(r):   r.Get(base+"/tickets")            <- base = SUBJECT-SCOPED
                                           r.Post(base+"/tickets")
                                           r.Get(base+"/tickets/{ticketId}")
                                           r.Patch(base+"/tickets/{ticketId}/status")
                              => CẢ 4 route đều dưới một subject.
tickets/store_sqlc.go:107-109 ListBySubject(ctx, subj) — phép list DUY NHẤT
                              WHERE t.tenant_id=$1 AND (t.subject_type, t.subject_id) IN (...)
                              => KHÔNG có ListByDepartment, KHÔNG có route xuyên nhiều ứng viên.
tickets/service.go:130-132    department = TrimSpace(in.Department)
                              if department=="" || len(...)>maxDepartmentLen -> 400
                              => FREE TEXT. Không enum, không tập đóng.
```

`c.asks[]` của mockup v5 là **hình dạng HÀNG ĐỢI**: `vLicQueue` / `vHrQueue` =
*"mọi câu hỏi đang mở gửi cho Licensing"*, **xuyên nhiều ứng viên**. omni **không có
route trả lời được câu đó**, và không có khoá **có kiểu** để nhóm theo — free text
không chở được routing key ("Licensing" và "licensing " là hai phòng ban.)

⇒ Phải tự làm: form + **enum phòng ban** + hàng đợi xuyên-subject + vòng hỏi-đáp.
omni mua hộ cái **KHO** và cái **CARD**. Đó là nửa nhỏ hơn.

**Và bản đầu BẤT NHẤT VỚI CHÍNH NÓ:** tôi xếp `audit feed` 🔴 với đúng lý do
*"không có route ⇒ ở lại recruit-be, không phải lựa chọn"*. Tickets có **cùng hình
dạng đó** cho phần queue, mà tôi xếp 🟡. Đã sửa thành 🔴.

> **QUYẾT: HOÃN. Mở lại khi omni có (a) enum phòng ban khai báo được VÀ (b) route
> list theo department xuyên subject. Thiếu một trong hai thì làm ở recruit.**

Ghi điều kiện mở lại để lần sau không phải cãi từ đầu.

**Đính chính:** tôi từng nói tickets là "phát hiện lớn nhất, xoá được `c.asks[]`
của mockup v5". **SAI.** Và ghi cho chuẩn **cơ chế** (LEAD sắc lại): lỗi không phải
"đo backend rồi kết luận về tính năng" chung chung. Là **đo TẦNG LƯU TRỮ rồi kết
luận về TẦNG QUY TRÌNH**. **Kho có sẵn không nói gì về hàng đợi.**

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

### ⛔ CORPUS CỦA AI KHÔNG ĐƯỢC ĐỌC BẢN COMPOSE-ON-READ

Bản đầu viết "corpus đi qua `CandidateFacade`" và **gói nó chung với drawer**. Tách ra:

| | nguồn | vì sao |
|---|---|---|
| **DRAWER** | `previews` — excerpt **240 code point**, cap **50 id** | đủ: người dùng bấm vào modal để đọc đủ |
| **CORPUS AI** | **KHÔNG được là `previews`** | AI đọc bản cụt 240 ký tự thì **nó điền nốt phần thiếu** |

Đó là chế độ hỏng **"sai một cách tự tin"** — và nó vào bằng một cửa khác cửa đã
lường: không phải **mất hàng**, mà **hàng nào cũng bị cắt**. Một AI được bảo
*"nhắc lại context các lần trước"* mà đọc bản cụt là tệ hơn một AI không có context,
vì recruiter **tin** nó.

⇒ Corpus cần **thân đầy đủ** ⇒ endpoint khác (`GET /messages` threaded list, phân
trang), **chi phí khác**, và **câu chuyện erasure khác** (một corpus đã nạp vào
memory của host là một **bản sao KHÔNG XOÁ ĐƯỢC** — xem trục retention-vs-erasure ở §6).
Đây là **quyết định chưa làm**, không phải chi tiết triển khai.

---

## 10. HAI TRỤC — thứ tự XÂY và thứ tự HỎI

Bản đầu chỉ có một trục (thứ tự xây), và nó **ngụ ý một thứ tự giá trị** mà không ai
viết ra. Đúng hình dạng `two-true-rules-one-false-composite`: không câu nào sai,
tài liệu nói một điều sai.

**Điểm quyết định không phải sự minh bạch — là CÁI ĐỒNG HỒ.** Một ask gửi NGƯỜI có
độ trễ tính bằng *ngày-tới-không-bao-giờ*, và **đồng hồ của nó chạy từ lúc GỬI, không
phải từ lúc phase tiêu thụ nó.**

### Phase 0 — GỬI NGAY HÔM NAY, bất kể phase nào tiêu thụ

| ask | cho ai | chặn gì |
|---|---|---|
| 2 giá trị Zoom (`zoom_los_user_id`, `zoom_account_email`) | **IT / Khải** | **SMS + Call** — thứ Bao hỏi ĐẦU TIÊN |
| omni deploy production | Khải | **toàn bộ** tài liệu này trên prod |
| quyền đọc ns `omni-prod` | Khải | mọi guard fail-closed trên cấu hình prod |
| **`cd.yml` fail-loud khi ref lạ** | Khải | **ngày ai đó cắt nhánh prod** — xem §10.2 |
| subject guard cho dedupe lookup | Khải | an toàn khoá dedup |
| SYSTEM row có cho external thấy không | Khải | Phase 3 |
| push `HIRING_MANAGER` lên cast? (lỗ D110, §4.6) | Khải | note của manager có tới omni không |
| retention declaration cho LO_CANDIDATE | Khải | §6 |
| IAM cấp topic `audit-events` | Khải | tín hiệu erasure |

**SMS/Call là món DUY NHẤT có ngày bắt đầu KHÔNG nằm trong tay tôi.** Xếp nó xuống
sau là tự nguyện trả thêm độ trễ đó. Nó ở Phase 0 **không phải vì nó rẻ**.

### Phase 1 — CÓ KHOÁ NỐI (đây là tiêu đề thật, không phải i18n)

| # | việc | ghi chú |
|---|---|---|
| **1** | **cột giữ omni message id trên `activities` + backfill** | **ĐIỀU KIỆN TỒN TẠI của Phase 2** (§5.0). Hôm nay **không có cột nào**. Đây là việc lớn nhất của Phase 1. Chọn thiết kế **A** (skeleton từ `activities`), **loại B** (từ audit log — cách tera làm) |
| **2** | dedup key **có PREFIX bắt buộc** | `uq_comm_message_dedupe_tenant` là `(tenant_id, dedupe_key)`, **KHÔNG có subject**, và không gian đó đang bị id thô của provider dùng |
| 3 | 13 i18n override + **test chống rò định kỳ** | xem §10.1 |
| 4 | unread badge trên row | một lượt gọi/trang, ≤200 id |
| 5 | bật `share` | một cờ |
| 6 | sửa javadoc stale `candidateSectionConfig.tsx:188-191` | cả hai mệnh đề đã sai |
| ~~7~~ | ~~quyết tickets~~ | **ĐÃ QUYẾT: HOÃN** (§7.1) |

Việc 1+2 có thể là **cùng một cột** — nếu vậy nói rõ, đừng để hai tên ở hai phase.

### 10.2 ⛔ BẪY: NGÀY AI ĐÓ CẮT NHÁNH PROD, LẦN "DEPLOY PRODUCTION" ĐẦU TIÊN SẼ ĐÈ LÊN STAGING

LEAD tìm ra, tôi đo lại trên `omni-service` `1e617aa`.

`cd.yml` có **16 selector**, tất cả cùng một hình dạng, và **KHÔNG selector nào có
nhánh báo lỗi** — else của chúng là **staging**:

```
cd.yml:55-60  environment: ${{ github.ref == 'refs/heads/prod' && 'production' || 'staging' }}
              project:     ${{ ...                            && 'lender-rate'  || 'lenderrate-master' }}
              cluster:     ${{ ...                            && 'moso-gke'     || 'moso-kube' }}
              namespace:   ${{ ...                            && 'omni-prod'    || 'omni-sta' }}
              values-file: ${{ ...                            && 'values-prod.yaml' || 'values-staging.yaml' }}
grep -nE 'exit 1|fail' cd.yml   ->  KHÔNG có bước nào chặn ref lạ
```

Khớp **chuỗi CHÍNH XÁC** `refs/heads/prod`. Nên người cắt nhánh prod mà đặt tên
**`production`** sẽ được:

```
environment = staging · project = lenderrate-master · cluster = moso-kube
namespace   = omni-sta · values-file = values-staging.yaml
```

**CI xanh. Deploy xanh. Prod không có gì. Và staging vừa bị ghi đè bằng thứ người ta
tin là bản production.** Không log nào kêu — theo pipeline thì mọi thứ đã chạy đúng.

**Đây KHÔNG phải rủi ro lý thuyết — tiền lệ trong chính org này, tôi đo:**

```
recruit-be   refs/heads/production
recruit-fe   refs/heads/production
lf-homepage  refs/heads/production
omni-service (nhánh deploy prod của nó là 'prod' — KHÁC MỌI REPO KHÁC)
```

Người đi cắt nhánh prod cho omni **gần như chắc sẽ gõ `production`** theo thói quen
của mọi repo khác họ chạm.

⇒ **Bản vá một dòng, biến fail-silent thành fail-loud:** đổi ternary thành allowlist
tường minh và **FAIL job** khi ref lạ, thay vì rơi về staging. Tối thiểu: một bước đầu
job `if github.ref không thuộc {master, prod} → exit 1`.

⇒ **Thuộc Phase 0, không phải Phase 3** — nó phải được vá **TRƯỚC** ngày ai đó cắt
nhánh prod, vì **đúng ngày đó là ngày nó nổ, và nó nổ về phía im lặng**.

### 10.3 Bẫy công cụ khi đo branch — ghi lại để không ai kết luận ngược

```
git ls-remote --heads origin prod              -> rc=0   <- SAI, trông như CÓ tồn tại
git ls-remote --exit-code --heads origin prod  -> rc=2   <- ĐÚNG
```

`ls-remote` **thoát 0 dù không khớp gì**. Khẳng định "branch không tồn tại" phải dùng
`--exit-code`, hoặc đọc OUTPUT chứ đừng đọc `rc`.

### 10.1 ⚠️ "13 i18n override" là MỘT LẦN QUÉT cho một chỗ RÒ ĐỊNH KỲ

§8 đo **50 key** còn mang từ vựng khoản vay; Phase 1 override **13**. Mỗi bản phát
hành mới của package thêm được key khoản vay và **không CI nào của recruit đỏ** —
lại `gate-anchored-in-another-repo`.

⇒ Bản vá **không hết hạn** là **một test ĐỎ khi một key ĐANG RENDER chứa từ vựng
khoản vay** (`borrower` / `closing` / `loan`), kèm **allowlist tường minh 37 key
biết-mà-chưa-sửa**. Không có nó, 13 override là bản vá **có hạn sử dụng, và không ai
biết ngày nó hết hạn**.

### Phase 2 — compose-on-read cho DRAWER (Bao đã chốt)

- Drawer đọc `activities` (recruit, ≤100) **+** `previews` (omni, **cap 50 ⇒ HAI lượt
  gọi**, hoặc trần 50 hàng omni — handler **400** chứ không cắt ngầm) rồi ghép **lúc đọc**.
- Sổ ở recruit, nội dung xin omni ⇒ **omni tự khai đây là ý đồ thiết kế** (§5.2).
- **Call Result:** compose một note INTERNAL. Nối vào **task** (không vào nhánh PUT
  thành công), và **đổi `then` thành list + per-item catch** (§4.3) — API hôm nay chỉ
  có một slot.
- **Lỗ D110:** chọn **(b)** — không mirror note của actor off-cast, và **NÓI RA trong
  UI** rằng note này chỉ có trong recruit-be. Fail-closed, không chờ ai (§4.6).
- **Đánh dấu "chưa mirror"** trên hàng activity — vì `then` **có thể bị drop** (§4.3).
- CONTACT HISTORY: **gập thành bộ lọc**, giữ `historyHref` làm đường lui (§3).
  Đo RBAC + volume của hàng audit **trước khi dựng**.
- Nếu hứa "nguyên tử": **giới hạn câu hứa vào Postgres của recruit-be** — `upsertAuto`
  là remote-trong-transaction (§4.4).

### Phase 3 — SYSTEM + AI (chờ Phase 0)

- SYSTEM row cần omni mở **route + wiring** (store + recorder + route + auth + tenant
  resolve) — không phải chỉ một route.
- Câu mở: có mirror các site SYSTEM **có actor** không. **D110 đã trả lời một nửa:**
  actor của những site đó **cũng có thể là manager off-cast** (`CandidateServiceImpl:286`
  handoff/transfer là hành vi manager điển hình) ⇒ cùng rơi im lặng, cùng cơ chế §4.6.
  Thêm lý do **định lượng**: một outcome `NO_ANSWER` phát **1 NOTE + 1 SYSTEM + N SYSTEM**
  (vòng `:220-224`, mỗi arm cũ bị thu hồi một hàng) ⇒ **fan-out không chặn trên** cho mỗi
  lượt lưu. Với pool 2 thread và no-retry, đó là **quyết định về TẢI**, không chỉ về ngữ nghĩa.
- Merge dedup re-point hàng activity sang survivor mà **omni không có API di dời message**
  ⇒ có thể đáp án đúng là **"chấp nhận và ghi ra"** (§4.5).
- AI: publish `tera-assistant-react` trước; corpus đọc **thân đầy đủ**, KHÔNG đọc
  `previews` (§9).

## 11. Asks cho Khải (design, không phải permission)

1. omni deploy production khi nào. Đo được: branch `prod` không tồn tại và
   0/172 run CD nào chạy trên ref đó ⇒ **CD chưa từng deploy omni lên prod**.
   Kèm một ask phụ: **quyền đọc namespace `omni-prod`** — account
   `bao.trinh@loanfactory.com` bị Forbidden ở đó (namespaced LẪN cluster scope),
   nên phía chúng tôi không xác minh được trạng thái prod bằng phép đo trực tiếp.
   Quyền đó cũng là **điều kiện** để dựng bất kỳ guard fail-closed nào trên cấu
   hình prod — dựng guard cứng trên cấu hình mình không đọc được là đổi một
   deployment YẾU-MÀ-ĐANG-CHẠY thành một deployment KHÔNG BOOT ĐƯỢC.
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
