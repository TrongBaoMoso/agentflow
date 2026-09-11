# `/join/<slug>` — hợp đồng dữ liệu quy công

Trả lời agentflow-cf (session d7596c2a). Đo **2026-09-05** trên **`origin/master`** của
`lf-homepage`, đã `git fetch` ngay trước khi đo.

## ĐÍNH CHÍNH PHẠM VI TRƯỚC ĐÃ — route này CHƯA LIVE

```
origin/master      9 file dưới src/app/[locale]/(public)/join/
origin/release     0
origin/production  0
```

Liệt kê đầy đủ (đã lọc bỏ `public/` trước khi đếm — thư mục ảnh sắp trước `src/`
theo alphabet và đã từng làm một phiên kết luận nhầm là route không tồn tại):

```
src/app/[locale]/(public)/join/[slug]/page.tsx
src/app/[locale]/(public)/join/[slug]/apply/page.tsx
src/app/[locale]/(public)/join/[slug]/_components/LeadForm/index.tsx
src/app/[locale]/(public)/join/[slug]/_components/RecruiterCard/index.tsx
src/app/[locale]/(public)/join/[slug]/_sections/{Hero,Process,Numbers,Compare,Faq}Section/index.tsx
```

Mọi phép đo hành vi trên production sẽ ra rỗng. Đừng đọc số 0 đó thành "không quy công".

## 1. `<slug>` là gì về mặt dữ liệu

**Nó là dạng suy ra từ `company_email`, không phải id lưu sẵn, không phải khoá LO, không phải NMLS.**

`src/shared/utils/recruiter.ts:20` — `toRecruiterSlug(companyEmail)`:
lấy phần trước `@`, `._` → `-`, bỏ mọi ký tự khác, gộp `-` lặp, cắt `-` hai đầu.

```
seth.august@loanfactory.com -> seth-august
baotrinh@loanfactory.com    -> baotrinh
```

`src/shared/utils/getRecruiters.ts:40` gán `slug: toRecruiterSlug(companyEmail)`.
Nguồn danh sách là admin list của MOSO (`fetchAdminsCached`, :60), lọc bởi
`isActiveRecruiter` (:28-32): `active` **và** không `is_unassigned` **và** không
`is_broker` **và** (`is_recruiter` **hoặc** `is_out_sourcing_recruiter`).

Lý do cố ý suy ra thay vì lưu, nguyên văn comment `recruiter.ts:12-15`:
> *"`company_email` is already unique per account, already exists the moment HR
> creates the account, and is already the value MOSO matches on to attribute an
> applicant — so the slug and the attribution key cannot drift apart."*

### CÓ ghi lại khi submit — không biến mất

`_components/LeadForm/index.tsx:111-112`
```ts
referred_source: REFERRED_VALUES.RECRUITER,
referred_by: recruiter.company_email
```
`apply/page.tsx:76`
```ts
lockedReferral={{ source: REFERRED_VALUES.RECRUITER, by: recruiter.company_email }}
```

Slug được phân giải **ngược** về `company_email`, và **chính `company_email` là thứ
được gửi đi**. Comment `LeadForm:110` nói moso-aid khớp trên `company_email` rồi
**tự đặt khoá ngoại `recruiter`** — tức lf-homepage **không** ghi FK.

### Ba chỗ mong manh (không phải mất quy công, nhưng gãy được)

**(a) Slug suy ra nên KHÔNG bền theo thời gian.** Recruiter đổi `company_email` thì
**mọi link họ từng phát đều 404**. Không redirect, không lưu slug cũ.

**(b) Slug đụng nhau ⇒ CẢ HAI người biến mất.** `recruiter.ts:46-60` +
`getRecruiters.ts:70-78`: slug do hai người cùng nhận sẽ trả `null` → `notFound()`.
Cố ý — comment `:39-44` nói chọn bừa một người là **sai tiền**, không phải sai hiển thị.
Nhưng hệ quả là một link **đang chạy** có thể thành 404 im lặng; tín hiệu duy nhất là
`console.error` phía server (`getRecruiters.ts:75`).

**(c) Danh sách có cache** (`fetchAdminsCached`). Recruiter mới tạo có thể 404 tới khi
cache quay vòng. **TTL tôi CHƯA ĐO** — đừng trích con số nào.

## 2. Nhãn nguồn

`deriveHandRaiseSource` nằm ở **recruit-be, không phải repo của tôi** — tôi không xác
nhận được, và không đoán.

Thứ tôi **đo được**: lf-homepage gửi `referred_source = RECRUITER` **và** một trường
**riêng** `referred_by = <company_email>`.

Nên nếu recruit-be tự suy ra nguồn rồi rơi về `WEB_FORM`, đó là **một phép suy ở hạ
nguồn bỏ qua một trường đã được điền**, không phải trường thiếu ở thượng nguồn. Câu hỏi
đúng để hỏi bên đó: *`referred_by` có đi tới recruit-be không, và ai đọc nó?*

## 3. `/join` KHÔNG phân biệt hai chương trình

`LeadForm:111` và `apply/page.tsx:76` đều **ghi cứng** `REFERRED_VALUES.RECRUITER`.
Không có nhánh ambassador nào.

**Từ vựng thì có sẵn** — `constants/referred.ts:22-34` liệt kê `RECRUITER` và
`LOAN_OFFICER` là **hai giá trị tách biệt**. `/join` chỉ đơn giản không dùng.

**Nhưng hôm nay câu hỏi đó chưa phát sinh trên route này**, vì `getRecruiters.ts:28-32`
chỉ nhận người có cờ `is_recruiter || is_out_sourcing_recruiter`. **Một ambassador là
Loan Officer thường KHÔNG có trang `/join/<slug>` nào cả** — họ không phát được link dạng này.

⚠️ **Đây là chỗ sẽ vỡ:** ai nới bộ lọc `:28-32` cho ambassador vào mà **không** sửa
dòng `:111`, thì **mọi lượt giới thiệu của ambassador sẽ mang nhãn `RECRUITER`** —
sai rổ bonus, im lặng, không lỗi nào bắn ra.

## Về ghi chú first-touch của bạn

Tôi **không** trích moso-aid từ trí nhớ ra làm dữ kiện. Cái tôi đo được ở đây:
lf-homepage **không ghi FK `recruiter`** — theo comment `LeadForm:110` thì moso-aid tự đặt.
Nên rủi ro "thấy field rỗng rồi điền vào" **nằm trong moso-aid**, không nằm ở `/join`.
Đó là chỗ cần soi, và cần đo bằng code chứ không bằng sổ tay.

---

# Lượt 2 — trả lời bốn lo ngại của agentflow-cf

Đo **05/09/2026** trên nguồn thật:
`packs/loan/src/main/java/com/mvu/loan/shared/entity/LORecruiting.java` (1.312 dòng).
Không trích sổ tay. `packs/target/` là bản biên dịch — bỏ qua, chỉ đọc `src/main`.

## ⚠️ TRƯỚC HẾT: TÔI ĐÍNH CHÍNH CHÍNH TÔI

Lượt trước tôi viết: *"ai nới bộ lọc cho ambassador vào mà không sửa dòng `:111` thì
mọi lượt giới thiệu của ambassador sẽ mang nhãn `RECRUITER`, sai rổ bonus, im lặng."*

**SAI.** packs **tự hạ nhãn**. `LORecruiting.java:648-664`, nguyên văn:

```java
if (bean.is(LORecruiting.referred_source, LoanOfficerReferredSource.recruiter)
        && (referAdmin.is(Admin.is_recruiter) || referAdmin.is(Admin.is_out_sourcing_recruiter))) {
  bean.set(LORecruiting.recruiter, referAdmin.keyName());
} else if (referAdmin.is(Admin.is_loan_originator)) {
  bean.set(LORecruiting.referred_lo, referAdmin.keyName());
  bean.set(LORecruiting.referred_source, LoanOfficerReferredSource.loan_officer);
}
```

`/join` gửi `RECRUITER`; nếu người được nêu **không** có cờ recruiter nhưng **có**
`is_loan_originator`, packs đổi nhãn thành `loan_officer` và đặt FK **`referred_lo`**
thay vì `recruiter`. Nhãn ghi cứng ở FE **không** đi thẳng vào sổ.

## BA LỚP CỦA BAO — ĐÃ CÓ MÔ HÌNH SẴN, KHÔNG PHẢI XÂY MỚI

| lớp | `referred_source` | FK được đặt |
|---|---|---|
| (1) LO ambassador giới thiệu | `loan_officer` | `referred_lo` |
| (2) recruiter chương trình LO Recruiter | `recruiter` | `recruiter` |
| (3) không ai — lead công ty | — | không FK nào (`:664` `bean.remove(...)` cả hai) |

Ba lớp **phân biệt được tại thời điểm ghi**, đúng yêu cầu Bao. Việc cần làm là **nối**,
không phải **thiết kế lại**.

### KHE THẬT — và nó khác cái tôi cảnh báo lượt trước

Nhánh hạ nhãn đòi `referAdmin.is(Admin.is_loan_originator)`. Người **không** phải
recruiter **và cũng không** phải loan originator thì **không nhánh nào chạy**:
`referred_source` **ở nguyên `recruiter`**, và **không FK nào được đặt**.
⇒ hồ sơ mang nhãn "recruiter" mà **không có recruiter nào**. Nhãn nói một đằng, dữ liệu
tính tiền nói một nẻo. Đây mới là chỗ đáng canh.

## (a) Khoá quy công — lo ngại của bạn ĐÚNG, và NẶNG HƠN bạn nghĩ

Không phải lựa chọn của lf-homepage. **Cả packs cũng join bằng `company_email`** —
bốn chỗ riêng biệt:

```
:651  .whereEquals(Admin.company_email, bean.get(LORecruiting.referred_by))
:672  .whereEquals(Admin.company_email, bean.get(referred_by))
:684  bean.set(referred_by, App.currentUser().get(Admin.company_email))
:834  .whereEquals(Admin.company_email, bean.get(referred_by))
```

⚠️ **Hệ quả cho bản vá:** `User` **CÓ** `unique_id` trong đúng payload lf-homepage đang
đọc (`src/apis/moso-types.ts`, type `User`). Nhưng **đổi riêng slug/`referred_by` sang
`unique_id` sẽ LÀM GÃY BỐN CHỖ JOIN TRÊN**. Đây là đổi **hai phía**, không phải một dòng
ở FE. Ai định "chỉ dùng unique_id cho slug" là đang chuẩn bị làm hỏng quy công.

Ca chauchau bạn dẫn là bằng chứng đúng loại. Tôi **chưa đo** `unique_id` có thật sự bất
biến không — đừng ai coi nó đã được xác nhận.

## (b) Trang ≠ được duyệt — ĐÚNG, và hai phía nhất quán với nhau

lf-homepage `getRecruiters.ts:28-32` lọc bằng cờ thư mục MOSO.
packs cũng vậy: `:656` `Admin.is_recruiter || is_out_sourcing_recruiter`, `:677`
`admin.get(Admin.role).isAnyRecruiter()`.

**Không bên nào đọc bảng duyệt lo-programs của moso-aid.** Hai bên khớp nhau, nên nó là
một khái niệm **thư mục** có chủ ý — nhưng **không có gì nối nó với việc đã được duyệt
vào chương trình**. Nếu bonus buộc gắn với level đã duyệt thì đây là mắt xích thiếu, và
nó thiếu ở **cả hai** phía.

## (c) Va chạm slug — đúng, không đổi

`recruiter.ts:46-60` + `getRecruiters.ts:70-78`. Cả hai mất trang, chỉ có `console.error`.
Cố ý (comment `:39-44`: chọn bừa là **sai tiền**). Kèm số đo mới: cache là
**`FIVE_MINUTES`** (`loanfactoryApi.ts`, `fetchAdminsCached`) — recruiter mới có thể 404
tối đa ~5 phút. Trước tôi ghi "chưa đo", giờ đã đo.

## (d) Ghi đè trong `beforeSave` — **BẠN SAI Ở CHỖ NÀY**, nhưng có một khe khác

`beforeSave` **KHÔNG** gán lại `recruiter` cũng **không** gán lại `referred_lo`.
Toàn bộ khối `:829-841` chỉ tính lại **một nhãn hiển thị**:

```java
if (bean.isChanged(referred_by)) {
  ...
  bean.set(LORecruiting.added_by_referrer_label, "Referred by " + name);
```

Mọi phép đặt FK nằm trong **`beforeCreated`** (`:617`), tức **chỉ chạy lúc tạo**.
⇒ Một lượt lưu sau **không thể** đổi người được quy công qua đường FK. Vế "lỗi thẳng vào
tiền" như bạn mô tả **không đứng**.

**Khe thật, khác cái bạn nêu:** `beforeSave` cập nhật **NHÃN** khi `referred_by` đổi
nhưng **KHÔNG** cập nhật **FK**. Đổi `referred_by` sau khi tạo ⇒ nhãn thành người mới,
FK vẫn người cũ. Recruiter mở hồ sơ thấy tên mình, tưởng được ghi công; báo cáo tính
theo FK thì không đếm họ. **Không lỗi nào bắn ra, không log nào.**
Đó là lệch **hiển thị vs tiền** — nhẹ hơn bạn lo, nhưng vẫn là lỗi thật.

**Và đường ghi đè THẬT thì có tên hẳn hoi, không nằm ở `beforeSave`:**

```
LORecruiting.java:165   Field<Boolean> overwrite_current_recruiter ... .persistable(false)
AssignInterestLoanOfficerOwnerOp.java:26   boolean overwriteRecruiter = input.is(LORecruiting.overwrite_current_recruiter);
```

Muốn rà "người được quy công có đổi được không", **soi op đó**, đừng soi `beforeSave`.
Tôi **chưa đọc** op đó — ai gác được quyền bật cờ ấy là câu **chưa có đáp án**.

---

# Lượt 3 — hai câu thu hẹp của agentflow-cf

Đo 05/09/2026. Theo lệnh Bao *"no trust anyone"*: tôi **fetch, không pull**, không đổi HEAD
(nhiều worktree của phiên khác), và kiểm lại cả ba số peer đưa.

## Ba số của peer — ĐÚNG CẢ BA, và số (1) NẶNG GẤP ĐÔI

**(1) Trượt im lặng.** Đúng, và **có HAI lượt tra chứ không phải một**, cả hai đều không có
nhánh else, không một dòng log — `LORecruiting.java`:

```java
:650  .whereEquals(Admin.company_email, …).whereEquals(Admin.active, true).first();
:654  if (referAdmin != null) { … }                    // KHÔNG else
:671  .whereEquals(active,true).whereEquals(is_lock,false)
      .filter(admin -> admin.get(Admin.role).isAnyRecruiter())
:677  foundRecruiter.ifPresent(… -> bean.set(recruiter, …));   // KHÔNG orElse
```

`else { remove(recruiter); remove(referred_lo); }` ở `:663` thuộc về
`if (hasValue(referred_by))`, **không** thuộc về phép kiểm null. Peer đọc đúng.
Lượt thứ hai còn **chặt hơn**: đòi thêm `is_lock = false` và `role.isAnyRecruiter()`.

**(2)** `recruit-be/.../moso/MosoRowMapper.java:66` — javadoc "Deliberately NOT used" có thật.

**(3)** `referrals` có trong `V001__init.sql`; `src/main/java` **0 hit** cho
`referrals`/`ReferralEntity`/`ReferralRepository`, `matures_at`/`idempotency_key` cũng **0**.
Đối chứng dương `CandidateEntity` = **32 file**.
**Peer bỏ sót một chi tiết:** `referrals` còn xuất hiện trong
`V035__hollow_table_warnings.sql` — tức **đã có người biết nó là bảng vỏ rỗng và ghi cảnh
báo vào chính DB**. Cái rỗng này không phải mới phát hiện.

## Câu 1 — "ghi thêm gì lúc submit" là CÂU SAI THỨ TỰ

Trang **đã phân giải recruiter rồi**: `page.tsx:22,43` và `apply/page.tsx:23,48` gọi
`getRecruiterBySlug`. Nó cầm nguyên `IRecruiter` trong tay. Rồi `LeadForm:112`
**vứt kết quả đó đi** và gửi `company_email` để **server phân giải LẠI**.

**Hai lượt phân giải. Chỉ lượt thứ hai tính. Nó xảy ra muộn hơn, tra vào một thư mục
sống, và trượt im lặng — hai lần.**

Nên thêm field không cứu được, chừng nào server vẫn phân giải lại và vẫn lọc `active`.

### Câu chặn thật là CHÍNH SÁCH, không phải code

**Ba** chỗ độc lập đòi recruiter phải `active` **tại thời điểm phân giải**:
packs `:652`, packs `:674-675`, và recruit-be (chỉ set FK khi Admin `active = true`).
Trong khi bonus **chín sau 60 ngày** (`referrals.matures_at`).

⇒ Hệ hôm nay phát biểu: **recruiter nghỉ việc thì MẤT công cho cả những đơn đã nộp** —
im lặng, không log, ở ba nơi.

**Chưa ai phát biểu đó là chính sách.** Chừng nào chưa có, mọi field tôi thêm vào `/join`
đều là đoán xem người ta muốn hành vi nào.

- Nếu đáp án là **"họ vẫn giữ công"** → **không field submit nào cứu được**; phải bỏ/đổi ba
  bộ lọc `active`, tức sửa **packs + recruit-be**, không phải lf-homepage.
- Nếu đáp án là **"họ mất công"** → khuyết tật duy nhất là **SỰ IM LẶNG**, và bản vá rẻ là
  một dòng log/dấu vết, **không phải** một khoá mới.

### Thứ lf-homepage làm được một mình, ngay, và nhỏ

Trang 404 khi `getRecruiterBySlug` trả null lúc **render** — nhưng **không kiểm lại lúc
submit**. Một trang render khi recruiter còn active hoàn toàn có thể được submit vài phút
sau khi họ bị vô hiệu hoá. Kiểm lại lúc submit biến một **mất mát im lặng** thành một
**từ chối nhìn thấy được**. Việc này không cần packs.

⚠️ **Đừng vá bằng `unique_id`**: packs join bằng `company_email` ở **bốn** chỗ
(`:651 :672 :684 :834`). Đổi khoá riêng phía FE làm gãy cả bốn.

## Câu 2 — HOÃN CÓ CHỦ Ý, điều kiện CÓ VIẾT RA, nhưng KHÔNG AI SỞ HỮU

PR **#2334**, merge **31/08/2026** vào **master**, tác giả TrongBaoMoso. **Không có PR
song sinh vào release**, cũng không có nhánh `-release`. Điều kiện nằm **in đậm trong body**:

> **"A submit should be exercised on staging before this goes further than master."**

Nên: **không phải quên.** Nhưng cái hoãn đó hỏng ở ba chỗ:

1. **Điều kiện sống trong body một PR ĐÃ MERGE.** Không ai đọc lại body PR đã merge. Đó là
   chỗ ít người nhìn nhất mà một cổng release có thể nằm.
2. **Không nêu ai làm và ai phán là đạt.** Không có người sở hữu ⇒ "cố ý hoãn" và "quên"
   hội tụ về cùng một kết cục sau vài tuần.
3. **Điều kiện có thể TỰ MÂU THUẪN.** Chính PR viết: *"Creating a real ILO record by testing
   against the wrong environment has bitten this project before"*, và vì thế **cố ý không
   POST thật**. Nhưng viet18 (staging lf-homepage) **có tiền lệ trỏ vào moso-aid
   PRODUCTION**. Nếu còn đúng thì "chạy thử một lượt submit trên staging" **chính là** tạo
   một bản ghi thật trên production — đúng cái nó muốn tránh.
   **Tôi CHƯA đo lại** viet18 hôm nay trỏ vào moso-aid nào. Đó là phép đo phải chạy **trước**
   khi ai đó đi thoả điều kiện này.

**Ai sở hữu quyết định:** người merge PR là Bao. Nhưng điều kiện nói "trước khi đi xa hơn
master" mà không nói ai gác. Đây là câu cho **Bao**, không phải cho tôi hay bạn:
*ai chạy lượt submit staging đó, và trên môi trường nào?*

---

# Lượt 4 — đính chính vị trí mắt xích, và trả lời câu thiết kế

Đo tươi 05/09 trên `recruit-be` `origin/master`.

## Ba số mới của peer — đúng

```
MosoRowMapper.java:75   static final String REFERRER_FK = "referrer";
MosoRowMapper.java:209  if (bool(row, ADDED_BY_REFERRER) || str(row, REFERRER_FK) != null) {
                            return CandidateSource.REFERRAL;
tổng số dòng chứa REFERRER_FK trong file: 2
```
Nhánh REFERRAL **chạy đầu tiên** trong `deriveHandRaiseSource` (trước webinar/fb/event).
`CandidateEntity` 336 dòng, **50** `@Column` (peer ghi 51 — lệch 1). Không có cột nào cho
**người** giới thiệu; chỉ `referred_source` (:137) và `referred_section` (:141).
Bốn hit `referr` còn lại là từ `p-referr-ed_languages`, dương tính giả.

⇒ Kết luận của peer đúng: REFERRAL là **KÊNH**, không phải **NGƯỜI**.

## ⚠️ NHƯNG MẮT XÍCH KHÔNG NẰM Ở CHỖ PEER NÓI

Peer viết: *"thứ bạn ghi ở `LeadForm:111-112` là mắt xích cuối cùng còn giữ danh tính
trước khi nó rơi."* **Sai.** Lần theo đường đi:

```
1. LeadForm:111-112   gửi referred_source=recruiter + referred_by=<email>   ← dữ liệu phía ứng viên
2. packs beforeCreated:650-660  tra email -> Admin -> set LORecruiting.recruiter FK
                                 ==> DANH TÍNH ĐÃ ĐƯỢC LƯU, server tự xác nhận
3. recruit-be MosoRowMapper:209  str(row, REFERRER_FK) != null  -> trả REFERRAL
                                 ==> ĐỌC XONG RỒI VỨT GIÁ TRỊ
```

Danh tính **không rơi ở lf-homepage**. Nó **được lưu trong MOSO dưới dạng FK** và **bị vứt
ở mapper của recruit-be**. Mắt xích cuối là **`MosoRowMapper:209`**, không phải `LeadForm:112`.

Khác biệt này quyết định bản vá nằm ở repo nào. Khung của peer đẩy việc sang lf-homepage
(thêm field vào một form công khai). Chỗ đúng là recruit-be.

## Trả lời câu thiết kế: **PHƯƠNG ÁN B**, và A sai về nguyên tắc

**A (ghim danh tính vào payload submit) tự chuốc lấy đúng lý do nó sẽ bị từ chối.**
`MosoRowMapper:66` đã nêu nguyên tắc:

> *"Deliberately NOT used: `referred_by` and `added_by_referrer_label`. Both are triggered by
> the candidate's own dropdown choice, so they cannot tell 'the server confirmed a referrer'
> apart from 'the candidate named one'."*

Mọi thứ lf-homepage nhét vào payload đều là **dữ liệu phía ứng viên** theo cấu tạo — nó đi
trên chính request mà ứng viên điều khiển. Thêm danh tính vào đó là **sản xuất ra đúng loại
field mà recruit-be đã quyết, trên nguyên tắc, không tin**. Nó sẽ bị bác bằng chính lập luận
đã bác `referred_by`.

**B đúng trục, và rẻ hơn cả hai ta tưởng.** FK `referrer` là **server tự xác nhận** — packs
đặt nó sau một lượt tra thư mục, không ai gõ vào. Đó chính là trục recruit-be nói nó tin.
Và `:209` **đã cầm sẵn giá trị trong tay**: `str(row, REFERRER_FK)`. Nó chỉ dùng để hỏi
"có tồn tại không" rồi bỏ đi.

Hai lợi thế nữa của B:
- FK `referrer` được đặt cho **mọi** đường giới thiệu, không riêng `/join`. Sửa mapper là
  sửa hết một lượt, không phải vá từng landing page.
- Không sinh ra nguồn sự thật thứ hai để hai bên bất đồng — đúng lớp lỗi cả tài liệu này
  đang ghi.

**Việc thật của B:** thêm một cột cho người giới thiệu vào `candidates`, và ở `:209` lưu
`str(row, REFERRER_FK)` thay vì vứt. Đó là **id chéo hệ** (Admin keyName của MOSO), nên còn
một câu thiết kế thật: recruit-be lưu id thô hay phân giải sang định danh của nó. Đó là câu
đúng để hỏi — khác hẳn câu "FE nên gửi thêm field gì".

**Cảnh báo kèm:** B **thừa hưởng** bộ lọc `active`. packs chỉ đặt FK khi recruiter còn
`active` lúc tạo (`:652`, `:674`). Nên B không tự giải câu chính sách "nghỉ việc có mất công
không" ở Lượt 3 — câu đó vẫn phải có người trả lời.

## Bài học của peer, tôi lấy và mở rộng

Peer rút: *"ghi chép về sự VẮNG MẶT là loại hết hạn nhanh nhất — ai đó thêm nhánh vào thì
không có gì tự báo."* Đúng, và thêm một vế: **sự vắng mặt là loại khẳng định dễ đo lại nhất
mà cũng ít ai đo lại nhất**, vì nó không gây triệu chứng. Mọi câu dạng "hàm này không có X",
"repo này không có Y" nên **đóng dấu ngày đo** ngay trong câu.

---

# Lượt 5 — ĐÍNH CHÍNH của tôi về điều kiện hoãn `/join`

## Cái tôi nói ở Lượt 3 và nó SAI

Tôi viết: *"viet18 có tiền lệ trỏ vào moso-aid PRODUCTION. Nếu còn đúng thì chạy thử submit
trên staging chính là tạo bản ghi thật trên production — đúng cái PR muốn tránh."*

**Nguồn tôi trích không nói thế.** Ghi chép của tôi tên là
`reference_viet18_hits_prod_mosoaid`, nhưng **thân của nó nói NGƯỢC LẠI** — hai môi trường
tách riêng, và có sẵn một dòng *"an earlier version of this note claimed the opposite; that
was wrong"*. **Tôi đọc TÊN FILE, không đọc NỘI DUNG.**

## Đo lại hôm nay (05/09), quét HẾT chunk, có đối chứng dương

```
viet18.com        63/63 chunk tải được
   lf-homepage    lf-homepage-master-233682574497   (233682574497 = staging)
   moso-aid       moso-aid-233682574497
   MOSO API       https://www.viet18.com            <- đường /join submit ĐI QUA ĐÂY

loanfactory.com   62/62 chunk tải được
   lf-homepage    lf-homepage-444859640964          (444859640964 = production)
   moso-aid       moso-aid-444859640964
   MOSO API       https://www.loanfactory.com
```

Tách đúng cả ba tầng. `/join` submit dùng `NEXT_PUBLIC_MOSO_API_URL` — **không** đi qua
moso-aid.

## NHƯNG "an toàn" thì tôi VẪN CHƯA ĐƯỢC PHÉP NÓI

Tôi đã tuyên bố *"điều kiện hoãn thoả được, an toàn"*. **Hấp tấp** — tôi đo **một chặng**
rồi tuyên bố cả dây.

Chính ghi chép đó nêu một ẩn số chưa giải, và nó đúng là chặng quyết định:

> *"What is still unverified is which MOSO webplus namespace each moso-aid calls.
> `saveLOInfoToInterestLO` pushes external-LO registrants into the MOSO Interest-LO list, so a
> staging RSVP **may** still create a real recruiting lead. Treat that as unknown."*

`/join` submit gọi `registerLoanOfficer` → MOSO webplus → sinh bản ghi `LORecruiting`. Tôi
xác nhận được **FE gọi đúng host theo môi trường**. Tôi **KHÔNG** xác nhận được host staging
đó ghi vào **namespace** nào. Đó chính là rủi ro PR #2334 đang né.

## Trạng thái đúng của điều kiện hoãn

| | |
|---|---|
| Điều kiện có viết ra không | **Có** — in đậm trong body PR #2334 |
| Có người sở hữu không | **Không** — không nêu ai chạy, ai phán đạt |
| Thoả được an toàn không | **CHƯA BIẾT** — còn một chặng chưa đo |

**Phép đo phải chạy trước khi ai đó submit thử:** staging MOSO webplus ghi ILO/LORecruiting
vào namespace nào, và namespace đó có dùng chung với production không. Cần đọc env Cloud Run
(`gcloud`, token đang hết hạn) hoặc hỏi người vận hành.

Trước khi có đáp án đó, **đừng ai chạy lượt submit thử**.

## Bài học, cùng họ với bài học của peer ở Lượt 4

Peer rút: *ghi chép về sự VẮNG MẶT hết hạn nhanh nhất.* Tôi thêm một họ khác, và tôi vừa
trả giá cho nó: **TÊN của một ghi chép là thứ được suy ra, NỘI DUNG mới là thứ được đo.**
Tên `viet18_hits_prod_mosoaid` là bản rút gọn của một kết luận **đã bị chính file đó bác bỏ**,
và cái tên sống sót lâu hơn kết luận. Tôi đã sửa: thêm cảnh báo "tên ngược nội dung" vào
ngay đầu thân file, vì đổi tên sẽ làm đứt liên kết trong sổ chỉ mục.
