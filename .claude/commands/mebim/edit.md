---
description: [mebim] Hướng dẫn dựng video trên CapCut cho người mới (video editor coach). Cờ --ba = kênh BA, mặc định MẸ.
---

Hệ hai kênh affiliate nuôi con. Repo ở `mebim-content/`. Session chạy ở gốc `agentflow` → MỌI path có tiền tố `mebim-content/`.

## Xác định KÊNH
- `--ba` → Kênh=BA, `<CH>`=`ba`; `--me`/không cờ → Kênh=MẸ, `<CH>`=`me` (mặc định). Bỏ cờ khỏi mô tả.

1. Đọc `mebim-content/CLAUDE.md` + vai trò `mebim-content/.claude/agents/video-editor-mebim.md`
   (coach dựng CapCut — KHÔNG tự dựng file video) + giọng `mebim-content/channels/<CH>/voice.md`.
2. Tìm kịch bản nguồn trong `mebim-content/channels/<CH>/scripts/`. Nếu người dùng mô tả footage thật đã quay, bám theo footage đó.
3. Tạo `mebim-content/channels/<CH>/scripts/<slug>--edit.md`: phiếu dựng theo timeline (cắt / chuyển cảnh /
   timestamp / chữ / âm thanh / nhạc + "vì sao"), kịch bản phụ đề (để auto-caption CapCut rồi sửa), QC checklist.
   Viết cho người CHƯA biết edit trừ khi người dùng nói đã quen CapCut.
4. Cập nhật `mebim-content/shared/content-log.md` → `Đã có phiếu dựng`.

Video + mô tả footage đã quay: $ARGUMENTS
