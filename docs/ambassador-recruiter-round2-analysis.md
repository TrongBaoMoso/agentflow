# Ambassador + LO Recruiter — vòng phân tích 2

**Ngày:** 01/09/2026 · **Nguồn:** trao đổi Bao ↔ Phuong Nguyen
**Trạng thái:** phân tích + câu hỏi, **chưa code gì**

Tiếp nối `lo-recruiter-landing-pages-brief.md` (Phụ lục A–E). Vòng này thêm
**Ambassador program** (hoàn toàn mới) và bổ sung yêu cầu cho **LO Recruiter program**.

---

## 0. Cái gì mới, cái gì đã bàn rồi

Bao dặn kiểm xem lần trước có thiếu ý nào không. Đối chiếu:

| Yêu cầu Phương nêu | Trạng thái |
|---|---|
| LP riêng mỗi recruiter, `/join/<slug>` | ĐÃ BÀN + đã code (Phụ lục B, C) |
| Form đổi câu "Are you referred by?" → quy công recruiter | ĐÃ BÀN + đã code (prefill + khoá) |
| `/join/<slug>` chỉ step 1+2, `/apply` full flow | ĐÃ BÀN + đã code |
| First-touch | ĐÃ BÀN (Phụ lục E) |
| **Bio của recruiter trên LP** | **MỚI** — chưa code, nhưng field đã có sẵn (§1.2) |
| **Biết LO đã tồn tại trong hệ thống chưa + từ nguồn nào, lúc nào** | **MỚI** — đây là cơ chế thực thi first-touch |
| **1 user = 1 row/card (khử `(Duplicated)`)** | **MỚI** — yêu cầu data model cho recruit app |
| **Cơ chế reassign/claim + audit khi tranh chấp** | **MỚI** — và nó *sửa* luật first-touch thuần (§3) |
| **Toàn bộ Ambassador program** | **MỚI** |
| **Luật "TO STAY AT THIS LEVEL"** | **MỚI** |
| Form nên bọc trong modal như lf-iq? | **MỚI** — câu hỏi cho tôi (§5) |

Không có ý nào ở vòng trước bị bỏ sót. Vòng này thêm 7 nhóm mới.

---

## 1. Đo hệ thống trước khi thiết kế

Phần này là lý do ước lượng thay đổi hẳn. **Phần lớn hạ tầng đã tồn tại** — nhưng
nằm rải ở ba kho khác nhau, và một mảnh chạy ngược với luật Ambassador.

### 1.1 Quy công cho Ambassador ĐÃ ĐƯỢC ĐẤU DÂY SẴN

`LORecruiting.java:159`:

```java
FK<String> referred_lo = TYPE.fk("referred_lo", "Referring LO", true, …).ref(Admin.TYPE).track();
Field<Boolean> has_referred_lo = TYPE.f("has_referred_lo", …)
        .function(bean -> bean.hasValue(referred_lo) ? Optional.of(true) : Optional.absent());
```

Và trong `beforeCreated` (`:648-667`), cùng một khối đã phục vụ recruiter:

```java
if (bean.isChanged(LORecruiting.referred_by)) {
  Bean referAdmin = find(Admin.TYPE).whereEquals(Admin.company_email, bean.get(referred_by))
                    .whereEquals(Admin.active, true).first();
  if (referAdmin != null) {
    if (bean.is(referred_source, recruiter) && (is_recruiter || is_out_sourcing_recruiter)) {
      bean.set(recruiter, referAdmin.keyName());
    } else if (referAdmin.is(Admin.is_loan_originator)) {
      bean.set(referred_lo, referAdmin.keyName());          // ← AMBASSADOR
      bean.set(referred_source, LoanOfficerReferredSource.loan_officer);
    }
  }
}
```

**Hệ quả:** hai view LO-facing đầu tiên Phương xin — "tracking process những LO
được họ ref" và "tracking status" — **truy vấn được ngay hôm nay**, không cần
field mới, không cần migration:

```
LORecruiting where referred_lo = <Admin key của LO đó>
```

Đây là cái rẻ nhất trong toàn bộ danh sách. Nên làm trước.

### 1.2 Bio của recruiter: field đã có, và đã public

`base/core/.../HasMyPage.java:111` và `HasAdvanceInformation.java:21`:

```java
Field<String> bio = TYPE.f("bio", "Bio", true, StringType.unindexedText()).access(PUBLIC);
```

`Admin` kế thừa (`Admin.java:245`), `bio` nằm trong `ADMIN_WEBSITE_FIELDS`, và
moso-aid **đã trả về rồi** (`lo-setting.js:46`, cạnh `ai_bio`).

**Nhưng có một quyết định ẩn trong đó:** `bio` này là bio *trang LO cá nhân* của họ
(dùng trên `/loan-officer/<slug>`). Recruiter viết bio để tuyển LO thì giọng khác
hẳn bio để bán loan cho người mua nhà. Dùng chung một field = sửa bên này hỏng bên
kia. → **Câu hỏi Q7.**

### 1.3 moso-aid đã có nguyên bộ API lo-programs

`moso-aid/src/routes/index.js:158-173` — 14 endpoint đã chạy:

```
GET  /lo-programs/catalog            GET  /lo-programs/me
POST /lo-programs/applications       GET  /lo-programs/readiness
POST /lo-programs/activations        GET  /lo-programs/directory
PUT  /lo-programs/applications/approval        (+ /bulk)
PUT  /lo-programs/applications/downgrade
PUT  /lo-programs/applications/promote
```

Model `LOProgramApplication` (Mongo) giữ `program_id`, `level_id`, `user`,
`status`, `status_history[]`, `source`, `superseded_by`. Chuỗi audit đã tử tế:
mỗi lần đổi level ghi `revoked` bản cũ, tạo bản mới, và trỏ `superseded_by` nối
hai bản lại.

### 1.4 …nhưng promote/downgrade là THỦ CÔNG HOÀN TOÀN

`lo-program.js:674-676` + `changeLevel`:

```java
const downgrade = (id, target, actor, reason) => changeLevel(id, target, actor, reason, 'down')
const promote   = (id, target, actor, reason) => changeLevel(id, target, actor, reason, 'up')
```

`changeLevel` chỉ kiểm:
- bản ghi đang `approved`
- xuống thì **bắt buộc có `reason`**, lên thì không
- đúng chiều (`target.rank` cao/thấp hơn)

**Không có:** bộ đếm, đồng hồ, cửa sổ 90 ngày, hạn mức, tự động lên/xuống. Và
**không ép mỗi lần một bậc** — chỉ ép đúng chiều, nên gọi một phát từ Level 3 về
Level 1 là hợp lệ.

→ Toàn bộ câu hỏi của Phương về "TO STAY AT THIS LEVEL" **không phải câu hỏi chỉnh
tham số. Nó là câu hỏi thiết kế cái chưa tồn tại.**

### 1.5 Tiền lệ tier tự động trong nhà — và nó chạy NGƯỢC

`ReferralTracking.ranking_auto` (`:65`) là field **tính sống**, qua
`LoanUtils.getReferrerRank` (`:1729`), đọc ngưỡng từ entity config
`AppreciationSetting` (bronze/silver/gold/platinum × 3 loại referrer).

Đây là một mẫu tốt và đáng học ở hai điểm:
1. **Ngưỡng nằm trong config entity, không hardcode** — đúng kỷ luật đã chốt.
2. **Giữ CẢ HAI field**: `ranking` (người đặt tay) đứng cạnh `ranking_auto` (máy
   tính). Tự động không xoá được quyền quyết định của người.

Nhưng cơ chế thì **ngược hẳn** với Ambassador:

```java
for (Field<Integer> field : fields) {
  if (setting.get(field) >= trackingRecord.get(ReferralTracking.referee)) return rankSetting.get(field);
}
```

`referee` là **tổng tích luỹ trọn đời**. Không cửa sổ thời gian, không reset,
không bao giờ xuống. Ambassador thì đòi *"6 loan officers every 90 days"* — có cửa
sổ, và tụt được.

**Kết luận: không tái sử dụng được `getReferrerRank` cho Ambassador.** Học kiến
trúc (config-driven + auto/manual song song), viết mới phần tính.

### 1.6 `(Duplicated)` chỉ là cái nhãn

Không có field `is_duplicated`. Nhãn đỏ trên grid là do client GWT tự tính; phía
server chỉ có `CheckOfficerDuplicatedNmlsOp` (so NMLS) và một lần chặn cứng khi
tạo (`LORecruiting.java:718` → `throw new ErrorMessage("Duplicated NMLS")`).

Khử trùng lúc submit (`RegisterInterestedLoanOfficer:33-40`) thì hẹp hơn nữa: chỉ
trong `recruiting_type=interested`, và **chỉ so email**.

Nên đúng như Phương nói: hệ thống *phát hiện* trùng nhưng **không gộp**. Người
dùng đổi email là ra record mới, và cái nhãn đỏ là toàn bộ phản ứng của hệ thống.

### 1.7 Dữ liệu để biết "lead có được làm việc chưa" ĐÃ CÓ

`beforeCreated` tạo sẵn một `CommunicationStatistic` cho mọi record, và grid đã
hiện cột Call `0/0`, Text `0/0`, Email `0/0`. Đây là mảnh quan trọng nhất cho §3:
cơ chế "hết hạn nếu không ai làm" **đo được bằng dữ liệu đang có**, không cần
dựng hệ thống tracking mới.

### 1.8 Tiền: rải ba chỗ

- `LORecruiting.referral_bonus_requests` (mảng JSON), `is_referral_bonus_requested`,
  `refer_bonus_method`, `zelle_the_referrer_bonus`, `referral_zelle_info`
- `LoanOfficerReferralProgram` — chỉ có `amount` + `is_default`
- `LOProgramApplication` (Mongo) — level, không có tiền

Không chỗ nào là **sổ cái**. `referral_bonus_requests` là danh sách *yêu cầu*, không
phải bản ghi *đã trả*. Muốn trả lời "LO này đã nhận bao nhiêu tiền" thì phải cộng
tay qua ba nguồn.

### 1.9 Hai chương trình ĐÃ SHIP trên lf-homepage — đo lại sau khi Bao nhắc

Bao chỉ ra các route đang có. Đo trên `lf-homepage`:

```
src/app/[locale]/(public)/ambassador-program/           (+ -v1, -v3)
src/app/[locale]/(public)/lo-recruiter-program/         (+ -v1, -v3)
src/app/[locale]/(public)/refer/refer-a-loan-officer/
src/app/[locale]/(private)/manage-lo-programs/[programSlug]/
```

`src/shared/components/LoPrograms/` có **4.157 dòng** đã viết, gồm `ApplyModal`
(496), `AdminConsole` (326 + 6 file con), `StatusPanel`, `ActivationPanel`,
`BonusLadder`, `DirectorySection`.

**Console admin đã có số liệu** (`AdminConsole/useProgramStats.ts`):

| Có sẵn | Ghi chú |
|---|---|
| `pending` / `approved` / `rejected` / `total` | đếm thật bằng `countDocuments`, không phải đếm số dòng một trang |
| `budgetCommitted` | tổng ngân sách **đã cam kết** theo bậc |
| `approvedByLevel[]` | phân bố theo bậc, kèm ngân sách từng bậc |
| `weekly[12]` | biểu đồ 12 tuần lượng đơn, **có khai báo khi dữ liệu vượt giới hạn** thay vì vẽ thiếu im lặng |

→ **Sửa lại điều tôi viết ở §6.2:** không phải "chưa có dashboard admin". Đã có,
và làm cẩn thận. Cái chưa có là **tầng quy công/hiệu suất** — console hiện tại
không biết ai giới thiệu ai, không có tỷ lệ chuyển đổi, không có năng suất. Nó đo
**luồng đơn vào chương trình**, không đo **kết quả của người đã vào**.

Tương tự với ngân sách: `budgetCommitted` đã trả lời được *"LO này đang có trần bao
nhiêu"* — chính là thứ Phương nói là đủ. Cái chưa có là **sổ chi**, và Phương nói
rõ chưa cần. Nên mục 4 trong danh sách LO-facing **rẻ hơn tôi đánh giá ban đầu**.

### 1.10 Ambassador ĐÃ CÓ link giới thiệu — bằng cơ chế KHÁC recruiter

`src/shared/utils/loProgramStatus.ts:267,292`:

```ts
const COMPANY_REFERRAL_PATH = '/refer/refer-a-loan-officer'
referralUrl: facts.domainUrl
  ? `${facts.domainUrl.replace(/\/+$/, '')}${COMPANY_REFERRAL_PATH}`
  : COMPANY_REFERRAL_PATH
```

Ambassador nhận link **trên domain riêng của chính họ** — và MOSO biết ai giới
thiệu nhờ header `x-moso-user-id` mà proxy tiêm vào, không cần slug.

Đặt cạnh cái tôi làm cho recruiter thì thành hai cơ chế:

| | Ambassador (đã có) | Recruiter (`/join/<slug>`) |
|---|---|---|
| Link | `<domain riêng>/refer/refer-a-loan-officer` | `loanfactory.com/join/<slug>` |
| Biết là ai nhờ | header `x-moso-user-id` từ proxy | slug suy từ `company_email` |
| Điều kiện | **phải có domain riêng** | không cần gì |

**Sự khác nhau này có lý do thật, không phải bất nhất:** đã đo ở Phụ lục B —
`should_have_domain` loại các role chỉ-là-recruiter, nên 10/12 recruiter **không có
domain**. Ambassador thì là LO nên có sẵn.

Nhưng nó đẻ ra một câu hỏi thật: **một người vừa là LO vừa là recruiter thì có hai
link, hai đường quy công.** Đó chính là Q14 — và giờ nó không còn là câu hỏi lý
thuyết nữa, mà là hai đường dẫn đang cùng chạy trên production.

---

## 2. VẤN ĐỀ LỚN NHẤT: ba kho dữ liệu, không khoá chung

Bao dặn đánh giá data mapping / migration. Đây là kết luận:

```
   MOSO Datastore              moso-aid Mongo            MOSO Datastore
   ───────────────             ──────────────            ──────────────
   LORecruiting                LOProgramApplication      referral_bonus_requests
   • referred_lo   ──?──       • level_id                • (mảng JSON nhúng)
   • referred_by                 • status_history
   • recruiter                   • superseded_by
   AI GIỚI THIỆU AI            ĐANG Ở LEVEL NÀO          ĐÃ XIN BAO NHIÊU TIỀN
```

Ba câu hỏi của một màn hình Ambassador nằm ở ba kho. Khoá nối duy nhất là
**email / Admin key**, và nó nối được — nhưng:

1. **Không join được trong một truy vấn.** Mọi report phải fan-out rồi ghép ở tầng
   ứng dụng. Với ~12 recruiter thì không sao; với vài trăm ambassador thì đây là
   N+1 kinh điển.
2. **Không có giao dịch chung.** Lên level ghi Mongo, quy công ghi Datastore. Một
   bên hỏng thì lệch, và không có gì tự phát hiện.
3. **Đếm để xét level phải đọc kho KHÁC với kho giữ level.** Đây là điểm đau nhất:
   engine tính tier sống ở moso-aid nhưng số liệu đầu vào (`referred_lo`) sống ở
   MOSO. Muốn tính sống như `ranking_auto` thì mỗi lần render phải gọi chéo.

**Khuyến nghị cho giai đoạn lf-homepage:** đừng cố hợp nhất. Chấp nhận đọc chéo,
nhưng **ghi thêm một sổ cái sự kiện ở moso-aid** — mỗi lần MOSO xác nhận một
`referred_lo` thì append một dòng bất biến `{ambassador_key, candidate_key, stage,
at, source}`. Ba lợi ích: đếm không phải gọi chéo, có bản ghi *thời điểm* (thứ
first-touch cần), và khi dời sang recruit app thì sổ này chính là dữ liệu migration
— không phải bới lại Datastore.

Không có sổ này thì mọi report Ambassador là ảnh chụp hiện tại, **không trả lời
được câu hỏi lịch sử** ("quý trước LO này ref mấy người"), mà đó chính là câu hỏi
luật level cần.

---

## 3. First-touch + cơ chế tranh chấp

### 3.1 Kịch bản Phương nêu, và vì sao nó phá luật first-touch thuần

> LO đăng ký webinar → ghi công công ty → **không ai gọi** → 2 tuần sau recruiter
> liên hệ và thuyết phục được → tranh cãi.

Phụ lục E chốt first-touch dựa trên lý lẽ *"đội Victoria/Brayan gọi ngay nên lead
là của họ"*. Kịch bản này rút chính cái chân đó ra: **nếu không ai gọi thì lý lẽ
biện minh cho first-touch không còn.**

Nên first-touch thuần là sai — nhưng không phải sai ở nguyên tắc, mà **thiếu điều
kiện**.

### 3.2 Ngành gọi cái này là gì

Đối chiếu ba nguồn:

**(a) Deal registration trong kênh phân phối B2B** — đây là tương đồng sát nhất.
Partner "đăng ký" một cơ hội, được **độc quyền có thời hạn** (90–180 ngày phổ
biến), và **hết hạn thì cơ hội mở lại**. Cấu phần bắt buộc: luật phân xử viết sẵn,
SLA phản hồi (~5 ngày làm việc), và **một người có tên** chịu trách nhiệm phân xử.

**(b) Định tuyến lead bất động sản** — "speed to lead". Lead chưa được làm việc thì
**tự chuyển sang người dự phòng** sau một khoảng ngắn. Luật quan trọng: *leo thang
khi quyền sở hữu / vùng phủ / thời gian hỏng — KHÔNG leo thang chỉ vì khách không
bắt máy.*

**(c) Affiliate first-touch vs last-touch** — first-touch luôn đi kèm **cửa sổ quy
công** (60–90 ngày), và mọi chỉnh tay phải để lại **audit trail bất biến**.

Cả ba đều nói cùng một điều: **first-touch không bao giờ là vĩnh viễn vô điều kiện.
Nó luôn có hạn, và hạn gắn với việc có làm hay không.**

### 3.3 Đề xuất: first-touch có điều kiện làm việc

Thay vì xử tranh chấp sau khi đã cãi nhau, để hệ thống tự nhả:

```
LO submit → ghi công nguồn đầu tiên (first-touch)  → quyền sở hữu TẠM
                    │
                    ├─ có touch thật trong N ngày   → quyền sở hữu CHỐT
                    │                                  (khoá theo cửa sổ M ngày)
                    └─ KHÔNG touch nào trong N ngày → tự về HỒ CHUNG
                                                       ai làm thì người đó nhận
```

Ba lý do nên đi đường này:

1. **Nó đo được bằng dữ liệu đang có** (§1.7) — `CommunicationStatistic` đã đếm
   call/text/email sẵn.
2. **Nó biến tranh chấp thành luật.** Không ai phải phân xử ca của Phương nữa: sau
   N ngày im lặng, lead tự mở, recruiter nhận công một cách hợp lệ ngay từ đầu.
3. **Nó tạo áp lực đúng chỗ.** Đội inbound có động cơ gọi nhanh, vì không gọi là
   mất lead — chứ không phải mất lead vì người khác nhanh tay.

Điểm phải cẩn thận: **"touch" phải là hành vi thật, không phải mở record ra xem.**
Nếu đếm cả lượt xem thì đội inbound giữ lead bằng cách bấm vào nó. Luật (b) nói
đúng: đếm nỗ lực liên hệ, không đếm kết quả (khách không bắt máy vẫn tính là đã
làm).

### 3.4 Vẫn cần công cụ phân xử tay

Tự động phủ được ca thường; ca lạ thì không. Bộ tối thiểu:

- **Nút reassign** có: người thực hiện, thời điểm, **lý do bắt buộc**, và bản ghi
  quy công cũ giữ nguyên (không ghi đè — thêm dòng mới trỏ về dòng cũ). Mẫu này
  moso-aid **đã làm đúng rồi** với `superseded_by` (§1.3) — bê nguyên sang.
- **Dòng thời gian quy công** trên hồ sơ: ai chạm lúc nào, qua đường nào. Đây là
  thứ chấm dứt cãi nhau, vì cả hai bên nhìn cùng một màn hình.
- **Quyền reassign tách riêng** — không nằm trong quyền recruiter. Xem ma trận
  quyền đã đo: Accounting (người chi bonus) *không có* quyền mở pipeline, nên
  người phân xử và người trả tiền hiện là hai người không nhìn thấy việc của nhau.

---

## 4. Luật level Ambassador

### 4.1 Trả lời trực tiếp hai câu của Phương

**Q1 — "every 90 days" có phải là quý không? Đầu quý reset?**

Chữ trên trang **không nói quý**, nói *"every 90 days"*. Hai cách đọc:
- **Quý theo lịch** — mọi người cùng reset 01/01, 01/04… Dễ hiểu, dễ báo cáo.
- **Cửa sổ trượt 90 ngày** — lúc nào cũng nhìn lại 90 ngày gần nhất.

Ngành nghiêng hẳn về **cửa sổ trượt**: quý theo lịch tạo *vách đá* — ai ref được 5
người vào ngày 25/03 thì mất trắng vào 01/04, và tháng đầu quý ai cũng thấy xa
đích nên không ai chạy. Cửa sổ trượt giữ nhịp đều quanh năm.

Đổi lại: cửa sổ trượt **khó hiểu hơn với người dùng** ("hôm nay tôi đang mấy điểm?"
phải tra mới biết) và **khó đối chiếu với kế toán** nếu ngân sách chi theo tháng.

→ Khuyến nghị: **cửa sổ trượt 90 ngày**, nhưng UI phải hiện thẳng *"bạn có 4 trong
90 ngày qua; 1 lượt sẽ rơi khỏi cửa sổ vào 12/10"*. Không hiện cái đó thì đừng dùng
cửa sổ trượt.

**Q2 — Lên level ngay hay chờ hết quý? Tụt thì tụt từng bậc hay về Level 1?**

Ngành thống nhất một mẫu **bất đối xứng**: lên nhanh, xuống chậm.

| | Khuyến nghị | Vì sao |
|---|---|---|
| Lên level | **Ngay khi đủ** | Phần thưởng cách hành vi càng xa càng mất tác dụng. Và ngân sách vốn đã có trần. |
| Tụt level | **Chỉ tại kỳ xét định kỳ** (hàng tháng), có báo trước 30 ngày | Tụt bất ngờ phá quan hệ nặng hơn giá trị răn đe |
| Tụt bao nhiêu | **Một bậc một lần, không bao giờ về đáy** | Tụt về Level 1 = mất luôn lý do cố. Còn một bậc để giữ thì còn động cơ |
| Ân hạn | 30–60 ngày kèm lộ trình khắc phục viết ra | Chuẩn ngành; 90 ngày là mức rộng nhất |

Tức là: **lên ngay, xuống một bậc, và chỉ xuống sau khi đã báo.**

Máy hiện có (§1.4) đã đủ để làm phần *thực thi* — `promote`/`downgrade` có sẵn,
`superseded_by` có sẵn. Thiếu đúng bộ đếm và cái đồng hồ.
Lưu ý: `changeLevel` **không ép mỗi lần một bậc**, nên nếu chốt luật "một bậc" thì
phải thêm ràng buộc đó, không thì nó chỉ là quy ước trong đầu người bấm nút.

### 4.2 Câu hỏi Phương chưa hỏi mà sẽ vỡ ngay tháng đầu

**Lên level giữa tháng thì ngân sách marketing tính sao?** Level 2 là *"up to $500 a
month"*, Level 3 là *"up to $1,000"*. Lên ngày 15 thì tháng đó $500, $750, hay
$1,000? Và nếu tụt giữa tháng khi đã tiêu hết $1,000?

Đây là tiền thật, và nó là hệ quả trực tiếp của khuyến nghị "lên ngay". Phải chốt
cùng lúc, không thì "lên ngay" tạo ra một lỗ chi tiêu.

---

## 5. Form nên bọc trong modal không?

**Trước hết phải tách ba thứ đang bị gọi chung là "form":**

1. **Đơn xin vào chương trình** (LO xin làm ambassador/recruiter) — `ApplyModal`
   đã có, 496 dòng, **đã là modal rồi**. Câu hỏi này đã được trả lời bằng code.
2. **Form ứng viên bước 1+2** trên `/join/<slug>`.
3. **Form ứng viên full flow** trên `/join/<slug>/apply`.

Phương đang hỏi về (2) và (3). Trả lời khác nhau.

**`/join/<slug>` (step 1+2) — CÓ, modal hợp lý.** Form ngắn, không có gì phải rời
trang, và modal giữ người ở lại trang bán hàng thay vì đẩy sang một trang trắng.
Đúng mẫu lf-iq.

**`/join/<slug>/apply` (full flow) — KHÔNG.** Ba lý do đo được:
1. Flow này **nối lại được bằng `?key=`**. Người dùng đóng máy, mở mail, bấm lại
   link. Modal không có URL riêng → mất khả năng đó.
2. Nó có **trả tiền và ký điện tử**. Hai bước này redirect ra ngoài rồi quay lại.
   Không có URL để quay về thì hỏng.
3. Nó **5 bước**. Modal dài là mẫu chống chỉ định — đã trả giá ở lf-iq với modal
   cao bị kẹp chân (xem sổ `reference_lfiq_modal_footer_clip`).

Nếu làm modal cho step 1+2 thì vẫn nên **đẩy một URL nông** (`?join=1`) để nút Back
đóng modal thay vì rời trang, và link chia sẻ được.

---

## 6. Report Ambassador nên có gì

Phương nói "chưa biết nên report gì". Đây là đề xuất, chia theo *câu hỏi người xem
đang hỏi* chứ không theo *dữ liệu ta có*.

### 6.1 View của LO (ambassador)

Bốn thứ Phương liệt kê, xếp theo độ rẻ:

| # | Nội dung | Chi phí | Ghi chú |
|---|---|---|---|
| 1 | Danh sách LO mình đã giới thiệu + họ đang ở bước nào | **Rẻ** | Query `referred_lo` (§1.1) |
| 2 | Trạng thái từng người | **Rẻ** | Cùng query |
| 3 | Tiền đã nhận | **Đắt** | Không có sổ cái (§1.8) |
| 4 | Level hiện tại + ngân sách đang có | **Vừa** | Level có sẵn; ngân sách chưa có chỗ ở |

Thêm một thứ không ai xin nhưng là thứ giữ người ta quay lại: **"còn thiếu bao
nhiêu nữa thì lên bậc"**. Một thanh tiến độ. Nếu dùng cửa sổ trượt thì bắt buộc
phải có, kèm ngày lượt cũ rơi ra (§4.1).

Về mục 3, Phương nói rõ là **chỉ cần biết đang có bao nhiêu ngân sách**, không cần
theo dõi tiền vào tài khoản hay quá trình tiêu. Đọc đúng thì mục 4 chỉ là *hiển thị
trần theo level* — rẻ hơn nhiều. Nhưng câu hỏi *"tôi tiêu còn bao nhiêu"* sẽ đến
ngay sau đó, và nó cần một sổ chi. → **Q11.**

### 6.2 View của Admin

**Trước hết, phân biệt với cái đã có.** `docs/mockups/lo-programs/admin.html` đã
dựng một console admin, nhưng đọc `admin-data.js` thì thấy nó xoay quanh
`{program, tier, status, connections, units, submitted}` — tức là **màn duyệt ĐƠN
đăng ký**: ai xin vào chương trình, bậc nào, duyệt/chờ. Hai panel của nó là
"Registrations by week" và "Level distribution".

Cái Phương đang xin là **thứ khác hẳn**: "LO nào ref LO nào", "năng suất của các LO
join program". Đó là **hiệu suất sau khi đã vào**, không phải luồng vào. Hai màn
này không thay nhau được, và màn hiệu suất là màn chưa có.

Đây cũng là lý do §2 (ba kho dữ liệu) đau: màn duyệt đơn chỉ cần Mongo, nên nó dựng
được dễ. Màn hiệu suất phải nối Mongo (level) với Datastore (`referred_lo`) — và
đó là màn chưa ai dựng.


Nghiên cứu phần mềm employee-referral cho một danh sách chuẩn. Sắp theo mức hữu ích:

**Tầng 1 — sức khoẻ chương trình (thứ trả lời "có nên duy trì không")**
- **Tỷ lệ tham gia**: % LO đủ điều kiện có ≥1 lượt giới thiệu trong kỳ. Đây là chỉ
  số số một của ngành, và nó là thứ duy nhất phát hiện được "chương trình sống nhờ
  3 người".
- **Phân bố**: bao nhiêu % lượt giới thiệu đến từ top 10% ambassador. Lệch quá thì
  đây không phải chương trình, mà là 3 hợp đồng cá nhân.
- **Tỷ lệ giới thiệu → tuyển được**, tách theo người giới thiệu.

**Tầng 2 — chất lượng (thứ anh Thuan sẽ hỏi)**
- **LO được giới thiệu có fund loan không**, mốc 90/180 ngày, so với LO đến từ
  nguồn khác. Đây là chỉ số phân biệt chương trình thật với chương trình phù phiếm.
  Đếm lượt giới thiệu thì luôn đẹp; đếm khoản vay mới ra sự thật.
- **Tỷ lệ giữ chân** LO được giới thiệu ở mốc 6 tháng.
- **Chi phí mỗi lượt tuyển** qua kênh này so với recruiter và so với Modex.

**Tầng 3 — vận hành**
- Bảng xếp hạng (Phương ngụ ý "năng suất của các LO join program").
- **Nghĩa vụ chi chưa trả**: tổng bonus đã chín nhưng chưa chi. Đây là con số kế
  toán, và hiện không ai trả lời được (§1.8).
- Ai giới thiệu ai — sơ đồ. Phương xin trực tiếp.
- Nhật ký đổi level: ai lên/xuống, lúc nào, ai bấm, lý do. `status_history` đã có
  sẵn (§1.3), chỉ cần dựng màn hình.

**Không nên đưa vào:** số lượt xem trang LP, tỷ lệ click. Nghe hay nhưng không dẫn
tới quyết định nào, và nó kéo sự chú ý khỏi tầng 2.

---

## 7. Câu hỏi cho anh Thuan

Xếp theo mức thiệt hại nếu đoán sai.

### Nhóm A — First-touch (chốt trước khi code bất cứ thứ gì về quy công)

**Q1. "Chạm đầu tiên" tính từ hành vi nào?**
Đăng ký webinar tính không? Đến xem tradeshow mà không điền form? Bị import từ
Modex? Hay chỉ tính khi LO **tự điền một form**?
*Vì sao quan trọng:* kho có 106.145 record RLO nhập máy, 96,8% chưa ai nhận. Nếu
import tính là chạm đầu tiên thì **gần như mọi LO ở Mỹ đã thuộc về công ty** và
chương trình recruiter không bao giờ trả bonus được.

**Q2. Quyền sở hữu có hết hạn không, và sau bao lâu?**
Đề xuất: hết hạn nếu **không có nỗ lực liên hệ nào** trong N ngày. N = 7? 14? 30?

**Q3. "Đã làm việc" đo bằng gì?**
Đề xuất: một cuộc gọi / SMS / email **đi ra** có ghi nhận. Mở record ra xem **không**
tính. Anh Thuan có đồng ý không đếm lượt xem không?

**Q4. Ca của Phương xử ra sao — theo luật hay theo phân xử?**
(Công ty nhận lead, không ai gọi, 2 tuần sau recruiter chốt được.) Nếu Q2 chốt được
thì ca này tự giải, không cần ai phân xử.

**Q5. Nếu vẫn cần phân xử tay: ai là người quyết, và trong bao lâu?**
Ngành khuyến nghị một người có tên + SLA 5 ngày làm việc. Hiện Accounting — người
chi bonus — **không có quyền mở pipeline**, nên họ không thể tự kiểm.

**Q6. Quy công có được sửa sau khi bonus đã chi không?** Nếu có thì thu hồi bằng
đường nào?

### Nhóm B — Trang recruiter

**Q7. Bio recruiter dùng chung với bio trang LO hay tách riêng?**
Field `bio` đã có và đã public, nhưng nó đang là bio bán hàng cho người mua nhà.
Dùng chung = sửa bên này đổi bên kia. Tách = thêm field mới.

**Q8. LP recruiter có cho lên Google không?**
Nếu có thì 12 trang gần giống nhau → rủi ro nội dung trùng lặp. Nếu không thì phải
`noindex`, và recruiter phải tự phát link.

### Nhóm C — Level Ambassador

**Q9. "6 loan officers every 90 days" — đếm cái gì?**
LO **nộp form**? LO **được tuyển** (paid + signed)? Hay LO **đã fund khoản vay đầu
tiên**? Ba cách đếm chênh nhau khoảng một bậc độ lớn, và nó quyết định chương trình
có khả thi về tiền hay không.
*Đây là câu hỏi giá trị nhất trong toàn bộ danh sách.*

**Q10. Cửa sổ trượt 90 ngày hay quý theo lịch?**
Khuyến nghị: trượt (§4.1), với điều kiện UI hiện rõ ngày lượt cũ rơi ra.

**Q11. Lên level giữa tháng thì ngân sách marketing tính sao?**
Nguyên tháng, chia theo tỷ lệ, hay tháng sau? Và tụt level khi đã tiêu vượt trần
mới thì xử lý thế nào?

**Q12. Tụt level: một bậc hay về Level 1? Báo trước bao lâu?**
Khuyến nghị: một bậc, báo trước 30 ngày. Máy hiện **không ép** một bậc — phải thêm
ràng buộc nếu chốt vậy.

**Q13. Ambassador thôi làm ở LF thì các lượt giới thiệu đang chạy tính sao?**
Bonus đã chín vẫn trả? Người được giới thiệu chuyển cho ai?

### Nhóm D — Ranh giới hai chương trình

**Q14. Một người vừa là LO vừa là recruiter thì sao?**
Hôm nay `beforeCreated` kiểm `is_recruiter` **trước**, nên nếu `referred_source`
gửi lên là `recruiter` thì họ được tính là recruiter; ngược lại rơi sang nhánh
`is_loan_originator`. Tức **giá trị `referred_source` gửi lên đang quyết định người
đó được trả theo chương trình nào** — không phải một luật nghiệp vụ nào cả. Đó là
tai nạn, không phải thiết kế.

**Q15. Trả cả hai chương trình cho một lượt tuyển có bao giờ đúng không?**
Nếu không thì phải có luật chọn một, và luật đó phải nằm ở server.

---

## 8. Nếu làm trên lf-homepage bây giờ — cái gì nên, cái gì không

| Việc | Làm bây giờ? | Lý do |
|---|---|---|
| Bio trên LP recruiter | **Nên** | Field có sẵn, public sẵn, moso-aid trả sẵn |
| View LO xem người mình đã giới thiệu | **Nên** | Query `referred_lo`, không cần data mới |
| Modal cho step 1+2 | **Nên** | Rẻ, đảo lại được |
| Sổ cái sự kiện quy công ở moso-aid | **Nên** | Càng bắt đầu sớm càng nhiều lịch sử; là dữ liệu migration sau này |
| Report admin tầng 1 | **Nên** | Đọc chéo được, số lượng nhỏ |
| Cơ chế hết hạn quyền sở hữu | **Chờ Q1–Q3** | Đụng tiền; đoán sai thì trả sai |
| Engine tính level tự động | **Chờ Q9–Q12** | Chưa chốt luật thì viết ra là viết bỏ |
| Sổ chi ngân sách marketing | **Chờ Q11** | |
| Gộp record trùng (1 user = 1 row) | **KHÔNG** | Việc của recruit app. Gộp trong MOSO là sửa dữ liệu 106k dòng không hoàn tác được |
| Report tầng 2 (chất lượng) | **KHÔNG** | Cần nối sang dữ liệu khoản vay; đó là việc của recruit app |

Một nguyên tắc xuyên suốt: **làm phần ĐỌC bây giờ, hoãn phần GHI cho tới khi luật
được chốt.** Đọc thì sai được và sửa được. Ghi sai vào quy công là sai tiền, và
`beforeCreated` chỉ chạy một lần — sai rồi không có lần thứ hai để sửa.

---

## Nguồn tham khảo

- Deal registration / xung đột kênh: [Magentrix](https://www.magentrix.com/blog/unified-deal-registration-improves-prm-a-channel-sales-must-have) · [Channeltivity](https://help.channeltivity.com/support/solutions/articles/144850-deal-registration-best-practices) · [PartnerStandard](https://pro.partnerstandard.com/guides/deal-registration)
- Speed-to-lead / định tuyến lead: [Sierra Interactive](https://www.sierrainteractive.com/insights/blog/real-estate-lead-routing-maximizing-speed-to-lead/) · [Roof AI](https://www.roofai.com/blog/lead-routing-for-teams)
- Quy công affiliate first/last-touch: [Rewardful](https://www.rewardful.com/articles/first-touch-vs-last-touch-attribution) · [CAKE](https://support.getcake.com/support/solutions/articles/5000545958-understanding-first-touch-vs-last-touch-attribution) · [Track360 — audit trail](https://track360.io/glossary/affiliate-commission-audit)
- Chỉ số chương trình giới thiệu: [Sprad — 12 KPI](https://sprad.io/blog/employee-referral-program-metrics-12-kpis-dach-hr-should-track-beyond-hires)
- Bậc đối tác / ân hạn / tụt mềm: [Introw](https://www.introw.io/blog/partner-tiers) · [GTM Playbooks](https://gtmplaybooks.substack.com/p/the-climb-mapping-partner-tiering) · [Loyalty Juggernaut](https://lji.io/guides/tier-strategy)
