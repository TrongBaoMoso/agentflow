---
description: [mebim] Full flow tuần tự — ý tưởng → duyệt → kịch bản → storyboard → caption. Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở `mebim-content/`. Session chạy ở gốc `agentflow` → MỌI path có tiền tố
`mebim-content/`. Đọc `mebim-content/CLAUDE.md` trước.

## Xác định KÊNH (làm trước mọi bước)
- `$ARGUMENTS` chứa `--ba` → **Kênh = BA**, `<CH>` = `ba`; `--me`/không cờ → **Kênh = MẸ**, `<CH>` = `me` (mặc định).
- Bỏ cờ khỏi mô tả. TRUYỀN RÕ Kênh cho mọi bước. Toàn flow chỉ làm cho MỘT kênh (muốn cả hai thì chạy 2 lần).

Chạy TRỌN pipeline, tuần tự, có 1 cổng duyệt của người dùng ở giữa.

## Bước 1 — Ý TƯỞNG
Làm theo `/mebim:idea`: đọc `mebim-content/channels/<CH>/voice.md` + strategy + `mebim-content/shared/{family-context,content-log}.md`
(chống trùng xét CẢ HAI kênh), tạo ý tưởng, lưu `mebim-content/channels/<CH>/daily/YYYY-MM-DD.md`, trình danh sách.

## Bước 2 — CỔNG DUYỆT (DỪNG, chờ người dùng)
Hỏi người dùng chọn ý nào (vd "V1,V3,P2"). KHÔNG tự chọn, KHÔNG chạy tiếp khi chưa có phản hồi.

## Bước 3 — KỊCH BẢN (tuần tự từng ý video đã duyệt)
Với MỖI ý video: làm theo `/mebim:script` → `mebim-content/channels/<CH>/scripts/`.

## Bước 4 — STORYBOARD (tuần tự từng video)
Với MỖI kịch bản: làm theo `/mebim:camera` → `mebim-content/channels/<CH>/scripts/*--storyboard.html`.

## Bước 5 — CAPTION (tuần tự từng nội dung)
Với MỖI video + MỖI ý post đã duyệt: làm theo `/mebim:caption` → `mebim-content/channels/<CH>/queue/`.

## Bước 5b — PHIẾU DỰNG (CHỈ khi footage ĐÃ CÓ SẴN)
Mặc định phiếu dựng chạy sau khi người dùng đã quay, nên flow này bỏ qua nó. **NHƯNG nếu đầu vào là
footage có sẵn** (người dùng đưa clip/ảnh đã quay, hoặc ý tưởng dựng lại từ footage cũ trong `shoots/`)
thì điều kiện "đã quay" đã thoả ngay từ đầu → **PHẢI chạy `/mebim:edit` luôn trong flow này**,
với MỖI video → `mebim-content/channels/<CH>/scripts/*--edit.md`. Không bắt người dùng phải xin.

Dấu hiệu nhận biết: đầu vào có clip/ảnh đính kèm · mô tả "tôi có video/clip…" · storyboard bước 4
không có gì để quay ngoài vài shot phụ.

## Bước 6 — CHỐT
Cập nhật `mebim-content/shared/content-log.md` (cột Kênh = kênh đang làm). Báo cáo: danh sách file đã tạo +
checklist việc người dùng cần làm (quay theo storyboard → dựng theo phiếu edit → đăng thủ công).

Lưu ý: KHÔNG bỏ cổng duyệt Bước 2. Phiếu dựng (`/mebim:edit`) chạy sau khi người dùng đã quay —
xem Bước 5b cho trường hợp footage đã có sẵn (khi đó chạy ngay, không chờ).

Đầu vào: $ARGUMENTS
