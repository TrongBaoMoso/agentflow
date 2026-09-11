# Gửi Khải — recruit ↔ omni, 10/09/2026

Mọi con số dưới đây đo trên staging hôm nay, không suy đoán. Phần cuối liệt kê những thứ
**đã có rồi** để anh khỏi làm lại.

---

## A. Hai việc mở khoá phần còn lại — làm cùng nhau

### A1. Merge `omni-service` **#281**
*"registry: let a compiled subject type carry a host-subject endpoint, so LO_CANDIDATE can have one"*

- Mở từ 2026-09-09 15:35Z · `mergeStateStatus=CLEAN` · **0 review** · 8 file `+396/-15`
- `git merge-base --is-ancestor <head> origin/master` = **không** ⇒ chưa vào master
- Không có nó thì `LO_CANDIDATE` (compiled type) **không có đường nào** nhận host:
  một khai báo config không được trùng tên một compiled type.

Bằng chứng nó đang thiếu, lấy từ log boot omni-sta:

```
"host-subject SPI resolver ready", subject_types: ["LOAN"]
"host-subject SPI has no host for this subject type — answering CLOSED
 (inbound falls to triage)", method=active, subject_type=LO_CANDIDATE
```

### A2. Đặt cấu hình — **một lượt, cả ba giá trị**

| nơi | khoá | giá trị |
|---|---|---|
| `omni-sta` configmap | `HOST_SUBJECTS_BASE_URL_LO_CANDIDATE` | `http://recruit-be.recruit-be.svc.cluster.local:8090` |
| `omni-service-secret` | `HOST_SUBJECTS_ACCESS_TOKEN_LO_CANDIDATE` | *(secret mới)* |
| `recruit-svc-secret` (ns `recruit-be`) | `RECRUIT_HOST_SUBJECTS_ACCESS_TOKEN` | **cùng giá trị** |

**Nửa vời là trạng thái tệ nhất.** #281 cố ý *fail boot* khi có base-url mà thiếu token —
vì nửa cấu hình thì mọi cú gọi bị 401 và SPI fail-closed, không phân biệt được với
"host im lặng". Phía recruit-be, token rỗng thì endpoint trả
`401 "Host-subject SPI is not enabled"`.

Hôm nay `recruit-svc-secret` **chưa có** khoá đó (8 khoá: DB_*, MOSO_WEBHOOK_API_KEY,
RECRUIT_OMNI_BASE_URL, RECRUIT_OMNI_INTERNAL_API_KEY).

---

## B. Hai quyết định trong `omni-service` **#282** (DRAFT, CI đỏ có chủ ý)

1. **Đánh vần.** Source omni còn **31 chỗ** ghi `recruiting-be` (tên cũ), còn key scoped đang
   chạy khai `recruit-be`. Với key scoped thì `service_name` **chính là** danh tính và nó ghi đè
   header ⇒ khai sai chính tả là **403 mọi cú push**, mà vẫn boot sạch.
2. **Ví dụ "unbound".** Ba chỗ trong suite dùng `LO_CANDIDATE` làm type-không-có-chủ
   (`declaration_test.go:419`, `machine_auth_test.go:75-77`, `TestCastWritePerKeySubjectTypeScope`).
   Bind nó xong thì suite không còn ví dụ nào. Ứng viên thay thế tự nhiên là một type khai bằng
   config (`LO_APPLICANT` trong `configtype_test.go`) — nhưng đó là đổi thứ test bảo mật của anh
   đang chứng minh, nên em không tự làm.

---

## C. Rút key platform legacy — **đây mới là chỗ đóng lỗ**

Log boot omni-sta:

```
"internal key set configured", keys: 2
"per-adopter internal key", service_name=recruit-be, allowed_subject_types=["LO_CANDIDATE"], unscoped=false
"cast writes UNBOUND (any internal-key holder may write this type's cast)", subject_type=LO_CANDIDATE
```

2 key nhưng chỉ 1 per-adopter ⇒ còn **một key legacy unscoped**. Nó không có `ServiceName`
cấu hình nên danh tính lấy từ header (`auth/middleware.go:194-197`), và key unscoped thoả
`MayActOnSubjectType` cho **mọi** type (`auth/internalkeys.go:48-50`).

⇒ Ai giữ key đó chỉ cần gửi `X-Service-Name: recruit-be` là **ghi được cast** của ứng viên.
Trên một type **cast-only** (`loCandidateStaffGrant = []`) thì **cast CHÍNH LÀ danh sách quyền đọc**
— nên đó là ghi-được-quyền-đọc.

Bind `owner_service` (#282) là **cổng chống cấu hình sai**, không phải biên bảo mật.
Việc đóng thật là **rút key legacy**, và nó 401 mọi adopter còn dùng ⇒ là việc vận hành của anh,
không nhét vào PR được.

---

## D. Package `omni-react` / `omni-core` — bug đang bắn 403 lặp vô hạn

`capabilities.triage: false` che nút inbox (`ConversationSection:325`) và modal (`:470`) nhưng
**không** chạm query 60s phía sau: `useTriageActions` gọi vô điều kiện ở `:284`, và
`useGetUnmatched` (`commTriage.api.ts:88-101`) có `refetchInterval` mà không có `enabled`.

**Đo được: 56 lần `GET /api/v1/comm/unmatched → 403` trong 14 tiếng**, đúng một phút một lần,
từ **một** panel đang mở. recruit-fe không có triage surface và không có grant.

Kiểm cả trong `dist` đã publish (`omni-core@0.1.0`) lẫn `tera-fe origin/master` ⇒ **upstream cũng
chưa sửa**, nên "chờ bản mới" không phải cách sửa.

Đã vá: **tera-fe #555** (đã gán anh review), bump `0.1.1` cả hai gói.
`enabled` mặc định `true` nên **mọi caller hiện có không đổi một byte** — tera-fe khai
`triage: true`, poll y như cũ.

**Hai bước, bước hai không tự xảy ra khi merge:**
1. review + merge #555
2. push tag `omni-v0.1.1` (runbook `packages/README.md`)

---

## E. Câu hỏi về zoom-go — cho panel AI summary / transcript

Panel Summary/Recording/Transcript **có sẵn** trong package và **không** bị `zoomCalls` chặn.
Cổng đọc `calls/service.go:144-166` cho **INTERNAL cast participant** qua ⇒ recruiter sở hữu
đọc được, **không cần cấp thêm quyền gì**. Hàng call của recruit-be cũng đã tạo được
(`POST /subjects/LO_CANDIDATE/<id>/calls` → 200).

Còn thiếu đúng một mắt: `POST /public/api/v1/comm/hooks/zoom/call-artifacts`
(`ai_summary`, `transcript`, `recording_url`).

Đếm trên omni-sta, cửa sổ 2026-09-09 16:30Z → 2026-09-10 07:20Z:

```
5  /public/api/v1/comm/hooks/inbound-email
6  /public/api/v1/comm/hooks/zoom/call-finished
0  /public/api/v1/comm/hooks/zoom/call-artifacts        (không xuất hiện)
```

**Đây là câu hỏi, không phải kết luận.** Artifact đòi cuộc gọi *đã kết nối và có ghi âm*; trong
6 cú đó có ít nhất một `outcome: MISSED` và một cú omni không đặt được counterparty, còn 4 cú
kia bọn em chưa đo outcome ⇒ mẫu có thể **không có cuộc nào đủ điều kiện**, và khi đó 0 artifact
là kết quả đúng, không nói gì về zoom-go.

> **Hỏi:** zoom-go có phát `call-artifacts` cho cuộc gọi Zoom Phone của recruiter không, và
> recruiter cần gì để transcript webhook về được — bật recording? hạng licence? thuộc workspace
> `STGZOOM1`?

---

## F. Ba việc hạ tầng nhỏ

1. **`roles/pubsub.publisher`** cho `recruit-be@lenderrate-master.iam.gserviceaccount.com`.
   SA này có **0 binding cấp project** (đối chứng dương: `moso-kube@` có 9).
   Workload identity chạy được nhưng không được phép làm gì ⇒ `core.pubsub.provider` phải để
   `none`, nên cron tick / audit relay / mail / e-sign đều chưa chảy.
   **Xin đúng `publisher`** — không phải `pubsub.admin`, không bind vào `moso-kube@`
   (bind vào đó là ăn trọn `roles/editor` của nó).
2. **Thu hồi key mượn**: `omni-deploy@lenderrate-master` key_id
   `a3087a4fcf8d1baabc47f768381a252b5a408d81` (USER_MANAGED, tạo 2026-08-25T13:44:16Z).
   Đã hết cần: `recruit-deployer@` có key riêng từ 2026-09-03T07:13:31Z và
   `GCP_SERVICE_KEY_STA/PROD` của cả hai repo cập nhật 07:23:19-20Z cùng ngày.
   Bọn em **không tự xoá** vì `omni-deploy` còn một key user-managed khác (`0517f0f…`, 24/08)
   và không biết cái nào là key CI của omni.
3. **Quyền đọc k8s namespace `omni-prod`** (prod cluster) cho `bao.trinh@loanfactory.com`.
   Hiện `pods/deploy/cm/secret` đều `Forbidden`; đối chứng dương: cùng lệnh trên `omni-sta`
   và trên `recruit-be` (prod) đều OK. Cần để kiểm omni prod trước cutover.

---

## G. ĐÃ CÓ RỒI — anh khỏi làm lại

| Việc | Trạng thái đo 10/09 |
|---|---|
| `INTERNAL_API_KEYS` scoped `{recruit-be, [LO_CANDIDATE]}` | **đã có** trong `omni-service-secret`, boot log xác nhận `unscoped=false` |
| Role cho `recruit-deployer@` | **đã cấp**: `artifactregistry.writer` · `container.developer` · `iam.serviceAccountUser` |
| Workload-identity binding | **đã có**, và bind vào `recruit-be@` (đúng hơn yêu cầu gốc `moso-kube@`) |
| SSO client `RECRUIT` | **đã đăng ký cả hai env**, allowlist đúng theo từng host, chỉ nhận `https` |
| `SERVICE_KEYS` / `allowServiceAuth` cho recruit-service | **không cần** — cả 3 client gọi ra đều đã có đường riêng |
| Creds Modex / Google Meet / Calendly | **chưa có chỗ cắm**: `application.yml` = 0 khoá cho cả ba; Modex là webhook-vào và key của nó đã có |
