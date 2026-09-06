# Phản biện thiết kế — attribution model + sequence engine
**Cho:** agentflow-cf · **Từ:** phiên ecfa5fd9 (ghế PROGRAMS, độc lập) · **Ngày:** 06/09/2026
**Đo trên:** `recruit-be` `origin/master` = `24c5303` · `origin/release` = `68a25b1`
**Cách đọc:** mọi khẳng định dưới đây kèm `file:line` hoặc lệnh. Tôi không nhận số của ai — kể cả số trong bead.

---

## 0. TÓM TẮT — thứ tự theo mức thiệt hại

| # | Phát hiện | Mức | Hướng hỏng |
|---|---|---|---|
| **A1** | **`V047` TRÙNG SỐ giữa master và PR #215 đang mở** | **P0** | Flyway chết lúc boot, **mọi** env kể cả CI tươi |
| A2 | `V048/V049` của #215 nằm **dưới** `V050` đã áp | P1 | out-of-order → boot fail trên DB đã chạy V050 |
| B1 | `event_id` **chưa có luật mint** → dedup đường (A) chưa chặn gì | P1 | trùng dòng quy công, im lặng |
| B2 | `TRANSFER`/`CLAIM` **vô hiệu** dưới `firstTouch()` | P1 | dòng đầu sai = **không sửa được vĩnh viễn** |
| B3 | CHECK constraint **hẹp hơn** lời comment | P2 | `COMPANY_LEAD` + surrogate lọt qua DB |
| B4 | `occurred_at` chưa chốt nguồn | P2 | luật tiền quyết bởi đồng hồ bên phát |
| **C1** | **stop-on-reply gác trên tín hiệu KHÔNG máy nào sinh ra** | **P0** | **fail OPEN** — vẫn gửi cho người đã trả lời |
| C2 | `SequenceSender` có thể đi vòng cổng suppression duy nhất | P1 | gửi vượt STOP/TCPA |

Hai món P0 **không phải lỗi thiết kế của bạn**. A1 là va chạm với việc người khác; C1 là một tiền đề hạ tầng mà thiết kế đang dựa lên.

---

## A. TRƯỚC KHI BÀN THIẾT KẾ — một quả mìn đã cắm ngòi

### A1 · `V047` trùng số. P0.

```
master            V047__webhook_dedup_key.sql
PR #215 (mở)      V047__followup_denorm.sql
```

Đối chứng hai chiều — **không phải một file bị đổi tên**, mà là **hai file khác nhau cùng số**:

```
#215 có webhook_dedup_key ?  -> 0
master có followup_denorm ?  -> 0
```

Mô phỏng hợp nhất (union hai cây, lọc số V trùng): **`047`**.

⇒ Ngay khi #215 merge: `FlywayException: Found more than one migration with version 47` → **app không boot**. Và vì đây là **trùng số**, không phải out-of-order, nên **CI với Testcontainers DB tươi cũng chết** — tức lần này cổng *có* kêu. (Ngược với A2 bên dưới, cái đó CI im.)

**Nguyên nhân, không phải ai cẩu thả:** #215 tụt hậu master **19 commit**, cắt nhánh từ trước khi `V047__webhook_dedup_key` land. Nó lấy V047 lúc V047 còn trống. Đây đúng lớp lỗi đã trả giá ở repo này rồi (`migration-templates-are-schema-snapshots`, `right-command-wrong-tree`): **số migration là tài nguyên toàn cục, mà `ls` lại chạy trên cây cục bộ.**

**Vì sao báo cho bạn chứ không chỉ cho tác giả #215:** `V050` là của bạn, và nó là thứ biến A2 từ vô hại thành chặn. Ai rebase #215 sẽ phải nhảy qua **cả V050**, tức phải biết V050 tồn tại.

**Việc cần làm:** #215 rebase lên master rồi **đánh số lại V051/V052/V053**. Đừng đổi số ở phía V050 — nó đã áp trên release.

### A2 · `V048/V049` nằm dưới `V050` đã áp. P1.

`flyway.out-of-order` **không được set ở đâu** (grep `src/main/resources` + `src/test/resources` = 0 hit; `application.yml:45-47` chỉ có `enabled` + `locations`) ⇒ mặc định **false**.

`V050` đã có trên **master và release**. Staging nạp từ release ⇒ DB staging đã ở mức 50. Khi V048/V049 tới sau, Flyway thấy migration pending có version **thấp hơn** mốc đã áp → validate fail → **crash-loop**.

**Bẫy kèm:** CI dựng DB **tươi** nên áp 47→48→49→50 đúng thứ tự và **xanh**. ⇒ **CI xanh, staging chết.** Không có cổng nào đứng giữa. Rebase-và-đánh-số-lại ở A1 đóng luôn A2.

*(Phụ, không chặn: `feature/followup-automation` cũng mang một `V048__no_answer_retry_3_days.sql`, blob `233d6032`, khác blob `ab4494ae` của `V049` cùng tên trên #215. Nhánh này trông như bản cũ đã bị #215 thay — nêu để bạn biết nó tồn tại, không phải để xử lý.)*

---

## B. ATTRIBUTION MODEL

### Trước hết — ba chỗ tôi tán thành, có đo

1. **Trục "server xác nhận" thay vì "ứng viên khai"** — đúng, và `MosoRowMapper:66-69` đã tự khai lý do. Giữ.
2. **`record()` chặn `id != null`** (`ReferralAttributionEventServiceImpl:32-42`) — append-only thành **cơ chế**, không phải quy ước javadoc. Đây là kiểu guard đúng.
3. **Tie-break `occurred_at, id`** ở **cả hai** tầng (`findByCandidateId` sort + `firstTouch` comparator) — hiếm ai làm khớp hai đầu. Giữ.

### B1 · `event_id` chưa có luật mint → dedup đường (A) hiện chưa chặn gì. P1.

Đo: `setEventId` xuất hiện **0 lần trong `src/main/java`**, chỉ có trong test (`evt-1`, `evt-2`, `"evt-" + occurredAt`).

Migration viết: *"event_id do CHÍNH recruit-be MINT lúc ghi — nên nó LUÔN có giá trị, và UNIQUE PHẲNG là đủ để DB tự chặn trùng."*

**Bước chưa xét:** UNIQUE chỉ chặn trùng khi id là **hàm của danh tính sự kiện nguồn**. Nếu mint = `UUID.randomUUID()`, thì một sự kiện nguồn **giao lại** sinh id **mới** → chèn thành **hai dòng** → sổ append-only có hai lần quy công cho một sự kiện thật. Lúc đó `UNIQUE(event_id)` chỉ chặn việc chèn lại **đúng cùng một object** — mà `record()` đã chặn rồi bằng guard `id != null`.

⇒ Lập luận "(A) mạnh hơn (B)" đúng khi id **do nguồn cấp**. Khi **ta tự mint**, ta quay lại đúng bài toán của (B): cần một quy tắc **tất định**, tức một hàm băm trên các trường nguồn ổn định — **hình dạng y hệt content-hash**. Không phải (A) sai; là **(A) chưa hoàn tất**, và phần chưa hoàn tất chính là phần (B) đang mang lỗi.

**Đề nghị:** chốt `event_id` = hàm tất định của `(nguồn, khoá sự kiện nguồn, candidate_id, reason, surrogate_id)` và **viết luật đó vào cạnh cột**, không để trong bead. Kèm một test: gọi `record()` hai lần với cùng payload nguồn ⇒ lần hai phải bị DB từ chối. Hôm nay test đó **không tồn tại** nên tính chất này chưa được neo.

### B2 · `TRANSFER` / `CLAIM` vô hiệu — dòng đầu sai là **không sửa được**. P1. *(nặng nhất về thiết kế)*

`ReferralAttributionProjectionService` có **đúng một** phương thức: `firstTouch` (interface `:31`). Nó lấy `min(occurred_at, id)`.

Enum thì tả `TRANSFER` = *"Credit reassigned from one surrogate to another (**correction or dispute resolution**)"*.

**Hai câu đó mâu thuẫn.** Một `TRANSFER` được ghi **sau** luôn có `occurred_at` lớn hơn ⇒ **không bao giờ** thắng `min` ⇒ **không bao giờ đổi được kết quả**. Cộng với append-only (không có đường UPDATE — và điều đó **cố ý**, đúng), hệ quả là:

> **Một dòng đầu tiên ghi sai thì câu trả lời về tiền sai vĩnh viễn, và không có thao tác nào trong hệ sửa được nó.**

Đây không phải ca biên. Dòng đầu sinh ra từ một contract chưa chốt (`agentflow-3sad`), qua một đường import, trong lượt đầu tiên bật production — chính là lúc dễ sai nhất.

**Chỗ tôi tự bắt mình:** vòng trước tôi ra phán quyết *"first-touch sống ở PROJECTION"* để chặn "latest thắng". Đúng, nhưng **chưa đủ** — tôi không nói gì về **sửa sai**, nên đọc trọn nó thành "min là toàn bộ luật". Sổ ghi thiếu là sổ của tôi.

**Đề nghị — không bỏ append-only, thêm một lớp bãi bỏ tường minh:**
- thêm `VOID` (hoặc `SUPERSEDE`) + cột `supersedes_event_id`;
- `firstTouch` = min **trên tập đã trừ những event bị bãi bỏ**;
- bãi bỏ vẫn là **một dòng thêm** ⇒ append-only còn nguyên, lịch sử vẫn kể được ai sửa, lúc nào, vì sao;
- và cổng: chỉ vai có quyền mới ghi được `VOID` — nếu không thì đây là đường cướp quy công.

Không có lớp này thì `TRANSFER`/`CLAIM` là hai giá trị enum **không ai đọc** — tệ hơn thiếu, vì chúng làm người sau tin rằng đã có đường sửa.

### B3 · CHECK constraint hẹp hơn lời comment. P2.

```sql
CHECK (reason = 'COMPANY_LEAD' OR surrogate_id IS NOT NULL)
```

Comment trên cột nói: *"NULL **CHỈ** hợp lệ khi reason=COMPANY_LEAD"* và *"CHECK constraint enforce điều này ở tầng DB, không chỉ ở tầng code"*.

Constraint chỉ chặn **một chiều**: reason khác ⇒ surrogate bắt buộc. Chiều kia **không bị chặn** — dòng `(reason='COMPANY_LEAD', surrogate_id='seth')` **đi qua DB**. Rồi `firstTouch` trả về `reason=COMPANY_LEAD` **kèm** một surrogate ⇒ câu trả lời về tiền tự mâu thuẫn, và `ReferralAttribution` không có chỗ nào nói cái nào thắng.

Tương tự, comment `to_owner` viết *"null CHỈ ở COMPANY_LEAD"* — **không constraint nào** đụng tới `to_owner`.

Đây đúng `comment-wider-than-the-code`, và nó nguy hơn thường lệ vì comment **tự khai là đã được DB ép**. Người sau đọc xong sẽ **thôi kiểm**.

**Sửa:** đổi thành tương đương (`(reason = 'COMPANY_LEAD') = (surrogate_id IS NULL)`), hoặc **thu hẹp lời comment cho khớp**. Đừng để câu khai rộng hơn.

### B4 · `occurred_at` — chốt nguồn TRƯỚC caller production đầu tiên. P2.

Toàn bộ production code hôm nay set `occurred_at = Instant.now()` (16 chỗ). Attribution thì **chưa có caller nào**, nên nguồn còn để ngỏ.

Nếu `occurred_at` lấy từ payload nguồn: `firstTouch` = `min` biến **luật tiền** thành thứ do **đồng hồ bên phát** quyết. Ai đóng được mốc sớm hơn thì thắng, và vì append-only + min, **thắng vĩnh viễn**. Comment trong `firstTouch` còn nói rõ `min` tồn tại để một **backfill tới muộn** vẫn thắng — đó chính là cửa.

**Đề nghị:** tách hai cột — `occurred_at` (theo nguồn, để kể chuyện) và `recorded_at` (server, `Instant.now()`, bất biến). Luật first-touch chạy trên **`recorded_at`**, trừ khi có người **chốt bằng văn bản** rằng mốc nguồn mới là mốc tính tiền. Hôm nay chưa ai chốt ⇒ đừng để mặc định rơi vào cái manipulable được.

---

## C. SEQUENCE ENGINE

Đo trước: `Sequence*` trong `src/main/java` trên master = **0 file**; quét **mọi** remote branch tìm `SequenceSender|SequenceEnrollment|sequence_enrollment` = **0**. Nên đây thuần là phản biện thiết kế, đúng như bạn xin.

### C1 · stop-on-reply đang gác trên một tín hiệu **không máy nào sinh ra**. P0.

Khái niệm "đã trả lời" duy nhất trong hệ là `ActivityDirection.INBOUND`, và `DashboardServiceImpl:123-126` đã có sẵn vị ngữ đúng:

> `// Directionless rows (NOTE/SYSTEM) are NOT replies — only true INBOUND pauses the cadence (D56/R9.8: a lead who answered must never get an automatic nudge).`

**Nhưng:** chỗ **duy nhất** trong toàn bộ production code set `direction` là

```
ActivityServiceImpl:48   activity.setDirection(request.getDirection());
```

⇒ `INBOUND` chỉ tồn tại khi **một người gõ tay** (hoặc một API caller khai). **Không có đường nạp inbound nào** biến một SMS/email trả lời thật thành `INBOUND`.

⇒ Ứng viên trả lời bằng SMS, không ai log ⇒ `lastInbound` null ⇒ **cadence vẫn chạy**. Tính chất an toàn này **fail OPEN**.

**Và quyết định auto-send đổi hẳn mức thiệt hại.** Hôm nay cadence chỉ sinh **gợi ý** trên Today queue — người đọc và lọc, nên tín hiệu thiếu tốn một gợi ý xấu. Với auto-send (CEO #26: máy gửi, người giám sát), **cùng** tín hiệu thiếu đó tốn một **tin đã gửi thật** cho người vừa trả lời. Không phải vết xước UI — là chuyện TCPA và uy tín.

> Độ tin cậy đòi hỏi ở tín hiệu reply **không phải chi tiết triển khai** — nó **do quyết định auto-send sinh ra**, và nó là **cổng** của việc bật auto-send.

Cùng họ `silent-dependence-on-human-headers`: một đường chạy đúng trong mọi test có người thật phía sau, và hỏng đúng ở chỗ không có ai.

**Đề nghị:** trước khi bật auto-send, viết ra **đường nạp INBOUND** và **đo** nó (một tin thật đi hết đường vào thành một `ActivityEntity INBOUND`). Chưa có ⇒ auto-send phải **fail closed**: không có đường nạp thì không tự gửi, chỉ gợi ý.

### C2 · "Kiểm lúc gửi", đừng "đăng ký để dừng".

Bead chốt persist-execution-first vì `AbstractMessageHandler` **ack trước rồi nuốt exception** — đúng, và nó có hệ quả thứ hai chưa nêu:

**Cùng cái bẫy đó ăn luôn tín hiệu reply.** Nếu stop-on-reply nghe một event Pub/Sub, thì một lần `handleAfter` ném là **mất event, im lặng** ⇒ sequence gửi tiếp cho người đã trả lời. Persist-execution-first bảo vệ **lượt gửi**, không bảo vệ **lượt dừng**.

⇒ Luật: **stop-on-reply phải suy lại được từ trạng thái, không phụ thuộc việc đã nhận được event.** Ngay trước mỗi lượt gửi, **truy vấn** `max(occurredAt) where direction = INBOUND` cho candidate đó rồi mới quyết. Đắt hơn một chút, nhưng đúng chiều: quên một event ⇒ **không gửi thừa**, chỉ chậm.

Và **dùng lại đúng vị ngữ của `DashboardServiceImpl:123-126`**, đừng viết định nghĩa "reply" thứ hai. Hai định nghĩa sẽ trôi khỏi nhau, và cái trôi là cái quyết định có gửi hay không.

### C3 · `SequenceSender` phải đi **xuyên qua** `ActivityService`, không đứng cạnh nó.

`assertOutboundAllowed` được gọi **đúng một chỗ**: `ActivityServiceImpl:43`. Đó là **cổng STOP/TCPA duy nhất** của hệ — và omni **không có** cổng nào của riêng nó (C4 trong khảo sát omni; `suppression.stop_observed` trong doc **không tồn tại**).

⇒ Nếu `SequenceSender` gửi thẳng hoặc tự ghi entity, **caller duy nhất gửi mà không có người phía sau** cũng chính là caller duy nhất **đi vòng** cổng duy nhất. Cho `SequenceSender` gọi qua `ActivityService` để nó **thừa hưởng** cổng, và thêm một test dương: candidate đã STOP ⇒ lượt sequence phải **ném**, không phải bị lọc im.

---

## D. THỨ TÔI KHÔNG ĐO ĐƯỢC (đừng đọc thành "ổn")

- **Không chạy build/test** — không dựng worktree riêng cho lượt này. Mọi khẳng định trên là **đọc mã nguồn tại `24c5303`**, không phải kết quả suite.
- **Không đo hành vi Flyway thật** — A1/A2 suy từ cấu hình (`out-of-order` không set ⇒ default false) + hai cây file. Muốn chốt: dựng một Postgres, áp tới V050, rồi thả V047 thứ hai vào và đọc thông điệp lỗi thật.
- **Không đo omni** — phần inbound trong C1 dựa trên khảo sát omni cũ (25/08) cộng phép đo `setDirection` hôm nay. Phép đo `setDirection` là của tôi và chắc; phần omni thì **có tuổi**, cần đo lại trước khi chịu lực.

---

## E. NẾU CHỈ LÀM ĐƯỢC BA VIỆC

1. **A1** — báo #215 rebase + đánh số lại. Ngoài thiết kế, nhưng nó chặn mọi thứ và nó nổ ở boot.
2. **B2** — thêm đường bãi bỏ tường minh. Không có nó, lượt production đầu tiên ghi sai là sai vĩnh viễn.
3. **C1** — chốt fail-closed cho auto-send tới khi đường nạp INBOUND đo được.

B1 và B3 thì rẻ, làm lúc nào cũng được. B4 chỉ cần chốt **trước** caller production đầu tiên — mà hôm nay chưa có caller nào, nên vẫn còn kịp.
