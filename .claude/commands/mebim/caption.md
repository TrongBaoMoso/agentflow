---
description: [mebim] Viết caption + hashtag + giờ đăng, đóng gói đăng thủ công (social executive). Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở `mebim-content/`. Session chạy ở gốc `agentflow` → MỌI path có tiền tố `mebim-content/`.

## Xác định KÊNH
- `--ba` → Kênh=BA, `<CH>`=`ba`; `--me`/không cờ → Kênh=MẸ, `<CH>`=`me` (mặc định). Bỏ cờ khỏi mô tả.

1. Đọc `mebim-content/CLAUDE.md` + vai trò `mebim-content/.claude/agents/social-executive-mebim.md`
   + giọng `mebim-content/channels/<CH>/voice.md` + lịch/giờ đăng trong `mebim-content/channels/<CH>/strategy/`.
2. Xác định nguồn: kịch bản trong `mebim-content/channels/<CH>/scripts/` (video) hoặc ý post trong
   `mebim-content/channels/<CH>/daily/` (post FB). Sản phẩm affiliate chỉ lấy từ `mebim-content/shared/products.md`.
3. Với MỖI nội dung, tạo `mebim-content/channels/<CH>/queue/YYYY-MM-DD-<slug>/package.md`: caption riêng từng
   nền tảng (không copy chéo, đúng giọng kênh), hashtag, giờ đăng đề xuất, link affiliate đúng chỗ, checklist đăng.
4. Cập nhật `mebim-content/shared/content-log.md` → `Sẵn sàng đăng`.

Nội dung cần đóng gói: $ARGUMENTS
