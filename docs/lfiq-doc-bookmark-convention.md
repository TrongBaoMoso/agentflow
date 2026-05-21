# LFIQ Doc → Jira: Convention Heading 3 cho Thư

> **Mục đích**: Khi schedule chạy tự động tạo Jira ticket từ entry mới trong Google Doc, ticket sẽ có **deep-link nhảy thẳng vào entry** thay vì chỉ link về Doc tổng.

## TL;DR — 1 phím tắt cho mỗi entry mới

```
1. Bôi đen dòng title:   **275. [BUG] Realtor info sync fully into LF IQ**
2. Nhấn Cmd+Opt+3        (Mac)   →  apply Heading 3
   hoặc Ctrl+Alt+3       (Windows)
```

→ Google Docs tự generate 1 ID ẩn cho heading đó. Agent đọc qua Docs API → tự construct URL deep-link → embed vào Jira ticket. Dev/QC click link → nhảy thẳng tới entry.

## ⚙️ Setup 1 lần để Heading 3 trông giống bold thường

Heading 3 mặc định của Google Docs to/màu khác. Để Heading 3 giống style title hiện tại:

1. Apply Heading 3 lên 1 entry bất kỳ (Cmd+Opt+3)
2. Format lại title đó cho giống style mong muốn (bold, đen, size như normal text). Có thể dùng:
   - Toolbar: Bold (B), Font size 11, color đen
3. Right-click vào title → menu hiện ra → **Format options → Update 'Heading 3' to match** (đúng dòng thứ 2 trong screenshot menu của bạn)

Từ giờ, mọi entry áp Heading 3 sẽ tự inherit style đó. **Thư không cần làm setup này nữa.**

> 💡 Có thể setup luôn trong "Format → Paragraph styles → Heading 3 → Update to match"

## 📝 Workflow hằng ngày

Sau khi setup xong:

```
[Viết entry mới]
**280. [BUG] User cannot save profile**
  - Mô tả 1
  - Mô tả 2

[Bôi đen title → Cmd+Opt+3]
**280. [BUG] User cannot save profile**   ← giờ là Heading 3 (look giống cũ)
  - Mô tả 1
  - Mô tả 2

[Xong. Agent sẽ tự deep-link tới đây]
```

## ✅ Do's

- ✅ Apply Heading 3 cho **mỗi entry mới** trước khi schedule chạy
- ✅ Setup Heading 3 style 1 lần để inherit style mong muốn
- ✅ Vẫn dùng `=> DONE` hoặc chữ "done" để mark entry đã xong
- ✅ Số entry **luôn tăng dần** (vd: 278, 279, 280 — không reuse số cũ)

## ❌ Don'ts

- ❌ Đừng dùng cùng số entry với entry cũ (vd: doc đã có entry 275 — đừng tạo entry 275 mới)
- ❌ Đừng quên apply Heading 3 — nếu quên, ticket Jira chỉ có fallback link về doc tổng (vẫn work, nhưng không deep-link)
- ❌ Đừng apply Heading 3 cho cả entry (chỉ apply cho dòng title)
- ❌ Đừng apply Heading 1/2/4/5/6 — agent expect Heading 3

## 🆘 FAQ

**Q: Tôi quên apply Heading 3 cho 1 entry. Có sao không?**

A: Không sao — ticket Jira vẫn được tạo, nhưng link sẽ chỉ ref về doc tổng (không nhảy tới entry cụ thể). Dev click link → mở doc → Ctrl+F gõ số entry để tìm. Có thể quay lại doc bất cứ lúc nào để apply Heading 3 — ticket cũ không tự update, nhưng entry mới sẽ work.

**Q: Apply Heading 3 xong title to/khác style cũ, làm sao quay về?**

A: Làm setup 1 lần ở phần trên (Update 'Heading 3' to match). Sau đó Heading 3 sẽ giống style cũ. Hoặc undo (Cmd+Z) rồi setup trước, apply sau.

**Q: Tôi có nên đánh Bookmark nữa không?**

A: KHÔNG cần — Heading 3 thay thế hoàn toàn bookmark. Bookmark (Insert → Bookmark) **không expose ra Docs API**, agent không đọc được. Heading 3 thì có anchor ID auto-generated mà API trả về.

**Q: Tôi sửa title của 1 entry đã có Heading 3, deep-link còn work không?**

A: Có. `headingId` cố định khi heading được tạo, không thay đổi theo content. Sửa title không ảnh hưởng anchor.

**Q: Doc có nhiều tabs, agent đọc tab nào?**

A: Agent đọc **tab đầu tiên** ("Pending Points"). Entries ở tab khác sẽ không được parse. Nếu cần process tab khác, báo Bảo để config thêm.

**Q: Convention `done` skip vẫn work chứ?**

A: Vẫn work. Entry nào chứa từ "done" (any case) sẽ KHÔNG tạo ticket, kể cả có Heading 3.

---

## Behind the scenes — bạn cần biết gì

- Schedule cloud agent chạy lúc **0h và 6h sáng** Asia/Saigon, Thứ 3 → Thứ 7
- Doc hiện có **15 tabs**, agent đọc tab 0 ("Pending Points") only
- Số entry duplicate (cùng NNN xuất hiện nhiều lần) → agent pick LATEST (entry mới nhất trong doc)
- Nếu Thư reuse số cũ → entry cũ vẫn được giữ trong doc nhưng agent process entry mới
- Strikethrough hiện CHƯA auto-skip — Thư cần thêm chữ "done" hoặc xóa hẳn entry để skip

## Contact

- Schedule không chạy / có lỗi → @Bảo (bao.trinh@loanfactory.com)
- Convention cần đổi → discuss trên Slack #lfiq-team
