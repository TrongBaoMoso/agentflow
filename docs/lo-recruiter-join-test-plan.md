# Kế hoạch kiểm thử — trang tuyển LO riêng cho recruiter (`/join/<slug>`)

Trạng thái ngày 31/08/2026: **chưa có gì chạy thật.** Hai PR đang mở, chưa merge, chưa deploy.

| PR | Repo | Vào nhánh | Nội dung |
|---|---|---|---|
| [#2334](https://github.com/LoanFactory-Inc/lf-homepage/pull/2334) | lf-homepage | `master` (staging) | 2 trang, +1.784 dòng / 23 file |
| [#146](https://github.com/LoanFactory-Inc/moso-aid/pull/146) | moso-aid | `master` | `GET /api/recruiters`, +565 dòng / 7 file |

**Thứ tự bắt buộc:** moso-aid deploy TRƯỚC. Chi tiết ở agentflow-4fc8.

---

## 0. Cái đã kiểm rồi, và cái CHƯA

Nói rõ để không ai tưởng đã xong.

| Đã kiểm (máy local + dữ liệu production đọc-chỉ) | Cách kiểm |
|---|---|
| Hàm slug | 9 ca unit, kể cả `+`, dấu chấm kép, rác |
| Resolver trên **dữ liệu production thật** | 12/12 recruiter ra đúng, 0 trùng, slug bịa → null |
| Endpoint moso-aid | 29 test; smoke thật: 15,8 MB → 4,3 KB, 3.405ms → 0ms |
| Ô quy công bị khoá | **kiểm đột biến**: gỡ prop → mở khoá; cắm lại → khoá |
| Không hồi quy `/register-loan-officer` | ô referral vẫn trống + sửa được như cũ |
| Mobile 375px | không tràn ngang; bảng so sánh cuộn trong khung |
| tsc / eslint / build | 0 / 0 / 0 |

| **CHƯA kiểm** | Vì sao |
|---|---|
| **Gửi form thật, ghi thật vào MOSO** | Dự án từng tạo nhầm ILO thật trên production. Hợp đồng payload đọc từ source, chưa chạy end-to-end. **Đây là rủi ro số 1.** |
| Giao diện với **dữ liệu recruiter thật** | `.env` local trỏ staging → tôi chỉ thấy 51 recruiter rác ("Captain Purchaser", ảnh placeholder). Production có 12 người thật, tên/ảnh/chức danh khác hẳn. |
| Bản dịch es / zh / he | Đang mang chữ tiếng Anh |
| Email tự động sau khi submit | `RegisterInterestedLoanOfficer` gửi template `webinar_registration` — chưa ai thấy nó trông thế nào từ đường này |
| Trên trình duyệt thật (Safari/Firefox), thiết bị thật | Mới chỉ chạy trong Browser pane |

---

## 1. Vòng 1 — trên staging, sau khi merge vào `master`

Không cần tài khoản, không cần quyền. Ai cũng chạy được.

### 1.1 Đường sống của link

| Việc | Kỳ vọng |
|---|---|
| Mở `/join/<slug-thật>` | Trang hiện tên, ảnh, chức danh **đúng người đó** |
| Mở `/join/<slug-bịa>` | Trang "Page not found", **không** phải trang trắng hay lỗi 500 |
| Mở `/join/<slug>/apply` | Stepper 5 bước |
| Đổi chữ hoa/thường trong slug | Vẫn ra đúng người |

Lấy slug thật ở đâu: `GET /api/recruiters` trả cả danh sách.

### 1.2 Điều quan trọng nhất — quy công có bị khoá không

Trên `/join/<slug>/apply`, sang **bước 2**:

- [ ] Ô *"Are you referred to Loan Factory by?"* = **Recruiter**, **mờ đi, bấm không được**
- [ ] Ô *"Referral Recruiter"* = **đúng tên recruiter đó**, cũng mờ
- [ ] Danh sách recruiter **chỉ có đúng một người** — không có ai khác để chọn nhầm

> Nếu một trong ba cái này sai, **dừng lại**. Quy công là toàn bộ lý do trang này tồn tại.

### 1.3 Không được làm hỏng trang cũ

- [ ] `/register-loan-officer` — ô referral vẫn **trống và tự chọn được** như trước
- [ ] `/loan-officer` — form GetInTouch vẫn chạy

---

## 2. Vòng 2 — kiểm UI/UX

Đây là phần trả lời câu "làm sao test UI/UX".

### 2.1 Bốn khổ màn hình, đo cả hai chiều

Mở DevTools → chọn từng khổ: **320 · 375 · 768 · 1440**.

| Cần nhìn | Đạt là thế nào |
|---|---|
| Tràn ngang | Cuộn ngang trang **phải bằng 0** ở mọi khổ |
| Bảng so sánh | Ở 320/375 nó **tự cuộn trong khung nó**, không đẩy cả trang |
| Ảnh recruiter | Tròn, không méo, người không có ảnh thì hiện chữ cái đầu |
| Tiêu đề dài | Tên dài (vd "Nguyễn Thị Thanh Hương") không vỡ layout |

Cách đo nhanh, dán vào Console:

```js
const de = document.documentElement, cmp = document.querySelector('.rjoin-compare')
console.table({
  viewport: innerWidth,
  tranNgang: de.scrollWidth > innerWidth + 1,          // phải là false
  bangTuCuon: cmp.scrollWidth > cmp.clientWidth        // ở 375 nên là true
})
```

### 2.2 Bàn phím và người khiếm thị

- [ ] Chỉ dùng **Tab** đi hết được form, thứ tự hợp lý
- [ ] Ô đang focus **nhìn thấy được viền**
- [ ] FAQ mở/đóng được bằng **Enter**
- [ ] Ô bị khoá thì trình đọc màn hình cũng báo là khoá, không phải chỉ nhìn mờ

### 2.3 Nội dung — phần dễ bỏ sót nhất

Đây không phải lỗi kỹ thuật, nhưng là thứ **làm hỏng lòng tin**:

- [ ] Con số trên trang **khớp** với `/loan-officer` và `/register-loan-officer`. Nếu lệch một chỗ là hỏng — trang này cố ý đọc số từ chính namespace của các trang kia để không thể lệch, nên lệch = có người copy số ra
- [ ] Bước trả **$100** hiện rõ, không giấu
- [ ] Nút của Link 1 **không** hứa quá: phải là "gửi thông tin", không phải "apply now"
- [ ] Không còn chuỗi base64 nào lọt ra (đã từng có, xem §0)

### 2.4 Người nên nhìn — không phải dev

| Ai | Nhìn cái gì |
|---|---|
| **Một recruiter thật** (Seth hoặc Brayan) | *"Anh có dám gửi link này cho ứng viên không?"* — đây là câu hỏi thật sự quan trọng |
| **Duyên / marketing** | Chữ nghĩa, giọng điệu, có giống các trang LF khác không |
| **Thuận / Victoria** | Có hứa gì mà công ty không giữ được không |

Cách làm: gửi link staging + **một câu hỏi cụ thể**, đừng gửi kèm "cho xin ý kiến". Hỏi mở thì nhận về ý kiến mở.

---

## 3. Vòng 3 — gửi thật, đầu-cuối (BẮT BUỘC trước khi phát link)

Đây là vòng chưa ai chạy, và là vòng duy nhất chứng minh **tiền về đúng người**.

### 3.1 Chuẩn bị

- Dùng **staging** (`viet18.com`). Trước khi POST bất cứ đâu, xác nhận project number:
  `233682574497` = staging · `444859640964` = **PRODUCTION, không được chạm**
- Email test: dùng Mailinator (hộp thư công khai, mở bằng URL)
- Ghi lại email đã dùng, để dọn sau

### 3.2 Ca A — người hoàn toàn mới, qua Link 1

1. Mở `/join/<slug>`, điền form ngắn, gửi
2. Mở back office MOSO → danh sách **Interested Loan Officers**, tìm email vừa gửi

| Trường | Phải bằng |
|---|---|
| `referred_source` | `Recruiter` |
| `referred_by` | email công ty của recruiter |
| **`recruiter`** (ô liên kết) | **đúng tên recruiter** ← quan trọng nhất |
| `referred_section` | `Word of Mouth` |

> Nếu `referred_by` có mà ô **`recruiter` rỗng** → đó chính là bug **agentflow-y60m**. Xem §3.4.

### 3.3 Ca B — cùng người đó đi tiếp qua Link 2

3. Vẫn email đó, mở `/join/<slug>/apply`, làm tới bước trả phí
4. Kiểm: **không sinh hồ sơ thứ hai** — vẫn là một hồ sơ, được điền dày thêm

### 3.4 Ca C — ca sẽ lộ bug y60m

5. Lấy **email đã có sẵn** trong danh sách Interested từ trước
6. Gửi email đó qua `/join/<slug>`
7. Kiểm ô `recruiter`

**Dự đoán của tôi: nó sẽ RỖNG**, trong khi nhãn chữ vẫn hiện "Referred by <tên>". Nếu đúng vậy thì y60m được xác nhận trên dữ liệu thật, và **phải sửa trước khi phát link**.

### 3.5 Dọn

Xoá các hồ sơ test vừa tạo. Ghi lại email đã dùng ngay từ bước 1 để khỏi sót.

---

## 4. Vòng 4 — sau khi lên production

- [ ] `RELEASE_PAGES` có `'/join': true` (thiếu là 404 trên prod trong khi local vẫn chạy)
- [ ] Mở thử **cả 12 slug thật**, xem có ai hiện sai tên/thiếu ảnh không
- [ ] Kiểm `GET /api/recruiters` trả 12 người
- [ ] Sau 1 tuần: đếm hồ sơ mới có `referred_source = recruiter`, so với số recruiter báo là đã gửi link

---

## 5. Tiêu chí dừng

**Không phát link ra ngoài khi còn một trong các điều sau:**

1. Ca A ở §3.2 chưa chạy, hoặc ô `recruiter` chưa về đúng người
2. **agentflow-y60m** chưa chốt hướng xử lý
3. Chưa có một recruiter thật nào xem qua trang
