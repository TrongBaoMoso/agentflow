---
description: [mebim] Viết kịch bản + shot list (scriptwriter). Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở `mebim-content/`. Session chạy ở gốc `agentflow` → MỌI path có tiền tố `mebim-content/`.

## Xác định KÊNH
- `--ba` → Kênh=BA, `<CH>`=`ba`; `--me`/không cờ → Kênh=MẸ, `<CH>`=`me` (mặc định). Bỏ cờ khỏi mô tả.

1. Đọc `mebim-content/CLAUDE.md` + vai trò `mebim-content/.claude/agents/scriptwriter-mebim.md`
   + giọng kênh `mebim-content/channels/<CH>/voice.md` + `mebim-content/shared/family-context.md`.
2. Tìm (các) thẻ ý tưởng nguồn trong `mebim-content/channels/<CH>/daily/` hoặc `mebim-content/channels/<CH>/ideas/`.
   Nếu người dùng nói "V1,V3" thì lấy đúng các ý đó trong file daily hôm nay CỦA KÊNH ĐÓ.
3. Với MỖI ý tưởng, tạo `mebim-content/channels/<CH>/scripts/YYYY-MM-DD-<slug>.md`: tóm tắt + bảng kịch bản
   cột thời gian + shot list (quay cái gì, thoại, thời lượng, đạo cụ) + checklist chuẩn bị. Sản phẩm chỉ lấy từ `mebim-content/shared/products.md`.
4. Cập nhật `mebim-content/shared/content-log.md`: cột Kênh = kênh đang làm, trạng thái `Đã có kịch bản`.

Nhắc: storyboard đặt máy chạy `/mebim:camera` (kèm `--ba` nếu kênh BA).

Ý tưởng cần viết kịch bản: $ARGUMENTS
