---
description: [mebim] Storyboard trực quan đặt máy — sơ đồ + khung hình mẫu (director/DOP). Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở `mebim-content/`. Session chạy ở gốc `agentflow` → MỌI path có tiền tố `mebim-content/`.

## Xác định KÊNH
- `--ba` → Kênh=BA, `<CH>`=`ba`; `--me`/không cờ → Kênh=MẸ, `<CH>`=`me` (mặc định). Bỏ cờ khỏi mô tả.

1. Đọc `mebim-content/CLAUDE.md` + vai trò `mebim-content/.claude/agents/director-dop-mebim.md` (Đạo diễn hình ảnh).
2. Tìm kịch bản nguồn trong `mebim-content/channels/<CH>/scripts/` (hoặc thẻ ý tưởng trong `mebim-content/channels/<CH>/daily/`).
3. Tạo file storyboard tự chứa `mebim-content/channels/<CH>/scripts/<slug>--storyboard.html` (HTML + SVG):
   sơ đồ đặt máy nhìn từ trên xuống, khung hình mẫu 9:16 mỗi góc, chiến lược 1-góc-hay-nhiều-góc,
   kèm chỉ dẫn quay + an toàn. Tham khảo format `mebim-content/channels/me/scripts/2026-07-08-an-dam-7-ngay--storyboard.html`.
4. Cập nhật `mebim-content/shared/content-log.md` (thêm link storyboard vào cột File).

Trả về: nhắc người dùng MỞ file HTML bằng Chrome (`file:///Users/apple/Projects/agentflow/mebim-content/channels/<CH>/scripts/...--storyboard.html`)
và tóm tắt vị trí máy bằng chữ.

Video cần storyboard: $ARGUMENTS
