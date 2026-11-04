---
description: [mebim] Lên ý tưởng nội dung — ≥2 video + 3-10 post (content strategist). Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở thư mục con `mebim-content/`.

**Đường dẫn:** session chạy ở gốc `agentflow` → MỌI path repo có tiền tố `mebim-content/`.
- CHUNG (mọi kênh): `mebim-content/shared/content-log.md`, `mebim-content/shared/products.md`, `mebim-content/shared/family-context.md`, `mebim-content/CLAUDE.md`.
- RIÊNG kênh: `mebim-content/channels/<CH>/` (voice.md · strategy/ · daily/ · ideas/ · scripts/ · queue/ · analytics/).

## Xác định KÊNH
- `$ARGUMENTS` chứa `--ba` → **Kênh = BA**, `<CH>` = `ba`; chứa `--me` hoặc không cờ → **Kênh = MẸ**, `<CH>` = `me` (mặc định). Bỏ cờ khỏi mô tả trước khi xử lý.

Các bước (chế độ Ý TƯỞNG):
1. Đọc `mebim-content/CLAUDE.md` + vai trò `mebim-content/.claude/agents/content-strategist-mebim.md`.
2. Đọc `mebim-content/channels/<CH>/voice.md` + strategy mới nhất trong `mebim-content/channels/<CH>/strategy/`
   + `mebim-content/shared/family-context.md`.
3. Đọc `mebim-content/shared/content-log.md` — loại trùng 30 ngày **xét CẢ HAI kênh** (không lên trùng khoảnh khắc/góc của bé).
4. Tạo ≥2 thẻ ý tưởng VIDEO + 3-10 ý POST (đúng trụ cột của kênh), lưu `mebim-content/channels/<CH>/daily/YYYY-MM-DD.md`,
   mỗi ý có ô `[ ]`. Đánh dấu 3 ý nên làm trước.

Nhắc người dùng: duyệt bằng `[x]` hoặc nói "duyệt V1,V3" rồi chạy `/mebim:script` (kèm `--ba` nếu là kênh BA).

Yêu cầu người dùng (số lượng, trụ cột, dịp...): $ARGUMENTS
