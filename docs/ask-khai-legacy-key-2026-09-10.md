# Gửi Khải — rút khoá platform legacy của omni (staging)

Đo trên staging 10/09/2026. Phần cuối là những gì **đã xong**, để anh khỏi làm lại.

---

## Lỗ hổng, nói gọn

`LO_CANDIDATE` là subject type **cast-only** (`internal/registry/lo_candidate.go:68`,
`loCandidateStaffGrant = []string{}`). Trên một type cast-only thì **cast CHÍNH LÀ danh sách quyền
đọc** — `internal/casthttp/handler.go:309-315` từ chối người không có mặt trên cast.

⇒ **Ghi được cast = cấp được quyền đọc.** Ai sửa được cast của một ứng viên thì tự thêm mình vào để
đọc toàn bộ hội thoại của ứng viên đó.

Hai dòng code làm cho khoá legacy làm được việc đó:

```
internal/auth/internalkeys.go:47-49
    func (k InternalKey) MayActOnSubjectType(subjectType string) bool {
        if len(k.AllowedSubjectTypes) == 0 { return true }     // UNSCOPED => MỌI type

internal/auth/middleware.go:181-186   serviceKeyPrincipal()
    name := r.Header.Get("X-Service-Name")
    if s := key.ServiceName; s != "" { name = s }              // khoá scoped ghi đè header
    //  khoá LEGACY không có ServiceName  =>  danh tính LẤY TỪ HEADER
```

⇒ Ai giữ khoá legacy chỉ cần gửi `X-Service-Name: recruit-be` là **qua** cổng `owner_service`.

**Bind `owner_service` (PR #282) KHÔNG đóng được lỗ này** — nó chỉ chống cấu hình sai. Thứ đóng lỗ
là **rút khoá legacy**.

---

## Ai đang giữ nó: **tera-be**

Boot log omni-sta:

```
"internal key set configured", keys: 2
"per-adopter internal key", service_name=recruit-be, allowed_subject_types=["LO_CANDIDATE"], unscoped=false
```

2 khoá nhưng chỉ 1 per-adopter ⇒ còn một khoá **unscoped**. Nó là `INTERNAL_API_KEY` (số ít) trong
`omni-service-secret`.

Tìm ra bên giữ bằng cách so **sha256 của giá trị đã giải mã** (không đọc, không in, không log giá trị):

| nơi | khoá | sha256[:16] | độ dài |
|---|---|---|---|
| `omni-sta/omni-service-secret` | `INTERNAL_API_KEY` | `791a25f4b29bdcbc` | 48 |
| **`tera-be/tera-be-secret`** | **`OMNI_INTERNAL_API_KEY`** | **`791a25f4b29bdcbc`** | **48** |
| `recruit-be/recruit-svc-secret` | `RECRUIT_OMNI_INTERNAL_API_KEY` | `010d5c6ed73e7766` | 64 |

⇒ **tera-be giữ đúng khoá legacy.** recruit-be thì giữ khoá scoped riêng (khác giá trị, khác độ dài).

Quét tên khoá qua 10 namespace (`omni-sta, recruit-be, tera-be, document-esign, follow-up-stag,
crm-go-sta, callcenter, lfiq-be-sta, cron-service, auth-service`) chỉ ra **hai** bên giữ khoá omni:
tera-be và recruit-be. Không quét toàn cluster và không so giá trị ở đâu khác.

⚠️ **Giới hạn của phép đo:** đây là staging, và em **không đọc được `omni-prod`**
(`pods/deploy/cm/secret` đều `Forbidden`). Prod có thể khác. Ai được cấp khoá thì chỉ anh biết —
phép đo này chỉ tìm được bên giữ **trong cluster staging** và **trùng tên khoá kiểu omni**.

---

## Runbook đề nghị, 3 bước — bước 3 mới đóng lỗ

Rút thẳng khoá legacy **sẽ 401 tera-be ngay**, nên thứ tự bắt buộc:

**1. Cấp cho tera-be một khoá SCOPED**

```json
{ "service_name": "tera-be", "allowed_subject_types": ["LOAN"] }
```

thêm vào `INTERNAL_API_KEYS` của `omni-service-secret` (cùng mảng với entry recruit-be đang có).

**2. Đổi giá trị trong `tera-be-secret` / `OMNI_INTERNAL_API_KEY`** sang khoá mới, rồi restart tera-be.
Kiểm: boot log omni phải in **hai** dòng `per-adopter internal key` — `tera-be`/`["LOAN"]` và
`recruit-be`/`["LO_CANDIDATE"]`.

**3. Xoá `INTERNAL_API_KEY` (số ít) khỏi `omni-service-secret`**, restart omni.
Kiểm: `"internal key set configured", keys: 2` và **cả hai** đều `unscoped=false`.

Sau bước 3: không còn khoá unscoped nào ⇒ không ai gửi `X-Service-Name: recruit-be` mà qua được, và
`owner_service` (#282) trở thành biên thật thay vì chỉ là cổng chống cấu hình sai.

**Em không tự làm bước nào** — bước 1-2 là cấp/đổi credential cho service của anh, bước 3 sẽ 401 bất
kỳ bên nào còn dùng mà em không thể liệt kê hết. Em có quyền ghi vào `omni-service-secret` trên
staging, nên nếu anh muốn em thao tác thì nói, em làm theo đúng thứ tự trên.

---

## Bổ sung 10/09 — #282 KHÔNG phải chờ việc khoá này

Có một lo ngại về thứ tự: sau #282, bất cứ ai ghi cast `LO_CANDIDATE` dưới tên khác `recruit-be`
sẽ bị 403 — và tera-be đang giữ khoá unscoped, nên trên nguyên tắc nó *có thể* ghi.

**Đo trên source tera-be thì lo ngại đó không thành:** subject type là **hằng số biên dịch**, không
phải tham số.

```java
// tera-be/.../communication/omni/OmniCastPushClient.java
:61  private static final String CAST_PATH = "/api/v1/subjects/LOAN/%s/cast";
// .../communication/omni/OmniCommClient.java
:52  private static final String SUBJECT   = "LOAN";
:54  private static final String CAST_PATH = "/api/v1/subjects/LOAN/%s/cast";
```

Và trên toàn `src/main` của tera-be: `LO_CANDIDATE` = **0 file**, `lo.candidate` = **0 file**
(đối chứng dương: tham chiếu `"LOAN"` = **9 file**, nên số 0 là số 0 thật).

⇒ **#282 không thể làm tera-be hỏng**, nên nó merge được trước hay sau việc khoá đều được.

⚠️ Nhưng đây là khẳng định về **code của tera-be**, KHÔNG phải về runtime. Lỗ hổng vẫn còn nguyên:
ai giữ khoá unscoped cộng `curl` là ghi được cast ứng viên. Thứ vắng mặt là **đường code của
tera-be**, không phải **quyền của khoá**. Nên hai việc không thay nhau được: **#282 là cổng chống
cấu hình sai, rút khoá mới là biên bảo mật.**

### Xin thêm MỘT DÒNG LOG, cùng lúc với việc khoá

Khoảng trống: **không đầu nào ghi lại danh tính người ghi cast khi ghi THÀNH CÔNG.**
recruit-be log push thành công ở mức `debug` (`CandidateCastPush:195`) còn staging chạy INFO; access
log của omni thì không ghi `X-Service-Name` đã trình.

Và nâng log phía em **không giải quyết được** — đây mới là chỗ đáng nói: log của recruit-be chỉ ghi
**thứ bọn em GỬI**, còn `Principal.ServiceName` là **thứ omni ĐÃ CHO PHÉP**. Sau #282 hai giá trị đó
**có thể khác nhau một cách hợp lệ**: người giữ khoá legacy gửi `X-Service-Name: recruit-be` sẽ tạo ra
một `ServiceName = recruit-be` mà bọn em **chưa từng gửi**. Nên log của recruit-be không bao giờ trả
lời được câu "ai đã ghi cast này", kể cả ở mức DEBUG.

⇒ Chỉ omni trả lời được, và chỉ khi nó log **principal đã resolve** (không phải header). Đó là
**một dòng** trong request logger của omni. Xin anh làm cùng lúc với việc khoá, vì đó là thứ duy nhất
cho phép trả lời câu hỏi này **về sau** — trên một type cast-only, ghi cast LÀ cấp quyền đọc, nên đây
là dấu vết kiểm toán của một hành động phân quyền.

## Còn một việc nữa, cùng người cấp

**Quyền đọc k8s namespace `omni-prod`** cho `bao.trinh@loanfactory.com`. Hiện
`pods / deploy / cm / secret` đều `Forbidden`. Đối chứng dương: cùng lệnh trên `omni-sta` và trên
`recruit-be` (prod) đều OK. Cần để kiểm omni prod trước cutover — và để trả lời chính câu hỏi khoá
legacy ở trên cho môi trường prod.

---

## ĐÃ XONG, anh khỏi làm lại

| Việc | Trạng thái |
|---|---|
| omni **#281** (compiled type mang được host endpoint) | **merged + deployed** |
| omni **#283** (đặt `HOST_SUBJECTS_BASE_URL_LO_CANDIDATE` cho staging) | **merged + deployed** |
| Boot log omni-sta | `"host-subject SPI WIRED"` `subject_type=LO_CANDIDATE` · `resolver ready subject_types:["LOAN","LO_CANDIDATE"]` |
| Token `HOST_SUBJECTS_ACCESS_TOKEN_LO_CANDIDATE` (omni) + `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN` (recruit-be) | **đã đặt**, cùng giá trị (so sha256) |
| SPI của recruit-be | đã kiểm live: token đúng → `200`, token sai / không token → `401` |
| tera-fe **#555** + tag **`omni-v0.1.1`** | **đã publish**; registry có `0.1.1` cho cả hai gói |
| recruit-fe lên `^0.1.1` | PR #161, auto-merge |
| Vòng 403 `/comm/unmatched` mỗi 60s | **đã sửa** ở `0.1.1` |
| Redirect http→https cho `recruit.viet18.com` + `recruit.loanfactory.com` | **đã apply**, cả hai trả `301` |

**Còn chờ anh:** hai quyết định trong **#282** thì Bao đã chốt — đánh vần `recruit-be`, và
`LO_APPLICANT` làm ví-dụ-không-có-chủ thay cho `LO_CANDIDATE`. Chỉ còn review + merge sau khi bọn em
sửa 8 test.
