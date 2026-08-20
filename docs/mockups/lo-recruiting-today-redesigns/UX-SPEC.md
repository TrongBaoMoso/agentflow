# Today page — UX spec v2 (bắt buộc cho mọi variant)

> Bài học từ v1 bị chê: v1 chỉ đổi màu trên cùng một layout liệt kê — hàng nào cũng
> "avatar + chữ + 4 nút", chip gãy dòng, không có hierarchy. v2 thiết kế lại UX trước,
> rồi mới khoác design language của từng hệ lên. Layout dưới đây là HỢP ĐỒNG chung.

## Nguyên tắc

1. **Một câu trả lời cho "làm gì trước?"** — màn hình phải trả lời trong 1 giây.
2. **Một hành động chính mỗi hàng** — nút phụ gom vào ⋯, không bày 4 nút/hàng.
3. **Không gãy dòng** — mọi hàng 1 dòng, cột grid cứng, truncate bằng ellipsis.
4. **Số là số** — tabular-nums, căn phải, đơn vị mờ.
5. **Chip tối đa 1/hàng** — chip nói VÌ SAO việc này ở đây, không trang trí.

## Cấu trúc màn (trên xuống)

```
┌ Shell (theo hệ: topnav / sidebar sáng / sidebar tối / capsule)
│
│  Header: chào + ngày ──────────────────── [▶ Bắt đầu Focus mode]
│  KPI strip: 4 stat-filter bấm-là-lọc (SLA gấp · Due · Wake-ups · Offers)
│
│  ★ NEXT UP — hero card: việc gấp nhất, to, đủ ngữ cảnh
│    [avatar lớn] Tên 18-20px · công ty  |  fact: nguồn · production · SLA đếm ngược to
│    [Call ngay — nút chính duy nhất]  [📜 script]  [⋯]
│
│  ┌─────────── cột chính ───────────────┐  ┌──── rail 280px ────┐
│  │ ⏮ Rollover (2 hàng, compact)        │  │ My funnel tuần này │
│  │ 🔥 New leads (còn lại sau hero)      │  │ ⚡ enrichment tip   │
│  │ 📞 Follow-ups hôm nay                │  └────────────────────┘
│  │ 📡 Signals                           │
│  │ ✍️ Offers chờ ký                     │
│  └──────────────────────────────────────┘
```

## Anatomy 1 hàng queue (grid cứng)

| Cột | Rộng | Nội dung |
|---|---|---|
| who | 280px | avatar 32 + tên (semibold, 1 dòng) + công ty·bang (mờ, 1 dòng) |
| context | 1fr | 1 chip VÌ-SAO + 1 câu ngữ cảnh, truncate |
| due | 110px, phải | SLA/hạn — tabular, đỏ khi gấp |
| action | ~150px, phải | 1 nút chính theo ngữ cảnh + nút ⋯ |

Nút chính theo ngữ cảnh: lead mới → **Call** · follow-up → **Call now** · signal → **Re-engage** · offer → **Remind**.

Row height 52–56px · hover đổi nền nhẹ · click row = mở hồ sơ 360 (mô phỏng bằng cursor).

## Chốt số liệu dùng chung (mọi variant giống nhau)

- Hero/Next-up: **Dana Patel** — Self-apply, $9.5M·21u, **SLA còn 42 phút**
- New leads còn lại: Sarah Chen (Modex, $18M·32u, 2h14m) · Marcus Reyes (Referral, No NMLS, 5h02m)
- Rollover: Chad (comp sheet, trễ 1d) · Joseph (gọi sau closing, trễ 2d)
- Follow-ups: Chad (relay câu trả lời Licensing) · Mia (comp sheet, cadence 3/7/14)
- Signals: Kaprice (đổi công ty) · Ryan (volume +40%)
- Offers: Joseph (viewed 3d, band B2)
- KPI: 2 SLA gấp (alert) · 2 due · 2 wake-ups · 1 offer
- Funnel: 14 / 92% / 6 / 3 / 1
