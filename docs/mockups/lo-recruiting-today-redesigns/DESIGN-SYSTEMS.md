# Design systems trong hệ sinh thái LoanFactory — khảo sát 21/08/2026

> Trích từ code thật (tailwind.config / Mantine theme / global.css của từng repo) bởi 4 agents quét song song.
> Mục đích: chọn design system cho **recruiting-fe**. Mỗi kiểu có 1 bản redesign Today page trong thư mục này.

## Bức tranh lớn: 3 "họ" design system

| Họ | Repos | Cam chủ đạo | Font | Nhân cách |
|---|---|---|---|---|
| **Marketing/IQ** | lf-homepage, lo-homepage, lf-iq | `#f36f20` (+ lf-iq admin v2 lệch sang `#F97316`) | Montserrat | Trắng sạch, pill button, chip pastel |
| **Tera+ platform** | tera-fe, account-fe, recruiting-fe | tera `#f36f20` / account+recruiting `#E4642A` | Inter / Public Sans | Ấm cream, token kỷ luật, dark-mode ready |
| **LoaL editorial** | life-of-a-loan | `#f36f20/#f36f23` | Geist + Instrument Serif | Print-magazine + glass, pill 999px |

---

## 01 — lf-homepage / lo-homepage (byte-identical theme)

- **Palette**: primary `#f36f20` (shade 5 pinned, hover `#d95707`, tint `#fff0e2/#ffe1cd`), secondary near-black `#272727`, text `#2e2e2e` (dark-6), borders gray `#ced4da/#dee2e6`
- **Font**: Montserrat toàn bộ (LF load 300/500/700/800/900, LO chỉ 300/500/700). Quirk: Mantine `<Title>` KHÔNG được remap → rơi về system font
- **Radius**: Button `xl` = 32px (pill), Card `lg` = 16px, inputs `md` = 8px + `size=lg` (to). Quirk: `rounded-xl` (32px) > `rounded-2xl` (16px) — thang không đơn điệu
- **Shadow**: Mantine soft + `custom: 0 0 40px rgba(0,0,0,.102)`
- **Chữ ký**: button pill UPPERCASE tracking-wide (282 chỗ dùng `uppercase`), spacing scale mở rộng tới 7xl=100px
- **Quirk khác**: `shadow-soft`/`tracking-ultra` được dùng ở exam-center nhưng KHÔNG định nghĩa (no-op); Container size `responsive` là dead config

## 02 — lf-iq

- **Palette**: HAI hệ cam song song — Mantine primary `#f36f20` (homeowners) vs Tailwind brand `#F97316/#EA580C/#C2410C` (admin v2). Text `#111827/#6B7280`, borders `#E5E7EB`, nền `#FAFAFA`
- **Font**: Montserrat (chỉ 300/500/700 → 400/600 là synthesized!) + JetBrains Mono
- **Radius**: Card 8px, Button pill 32px (nhưng admin v2 tự vẽ nút `rounded-md`), chips 4px
- **Shadow**: rất nhẹ — `xs 0 1px 2px rgba(15,23,42,.04)`, `card 0 2px 6px`, hover mới lên `md-soft`
- **Chữ ký**: stat card = nút lọc bấm được (`ring-2 #F97316` khi active), chip pastel 10px semibold (`#ECFDF5/#047857`…), row hover cam nhạt `#FFF7ED`, avatar gradient, dark mode surface ramp riêng
- **Vibe**: utilitarian dashboard mật độ cao

## 03 — tera-fe (Tera+ LOS)

- **Palette**: primary `#f36f20` nhưng màn People/Pipeline dùng lớp cream riêng: acc `#e35a0d`, soft `#ffefe2`, ink `#15171c`, hairline `#ece6d8`. Sidebar `#16191F` + radial wash cam
- **Font**: Inter (headings không remap — quirk giống lf-homepage)
- **Radius**: Button `sm` = **4px** (khác hẳn họ marketing), Card 16px, thang riêng 6/8/11/14
- **Chữ ký**: phản hồi vật lý — button shadow xs→sm + `translateY(-1px)` hover, `scale(.98)` active; KPI 27px fw800 tabular-nums; section header dạng gray callout; motion vocab đầy đủ (fade-in-up, pop, stagger 35ms, reduced-motion kill-switch)
- **Quirk**: Checkbox/Switch default màu `orange` stock Mantine (`#fd7e14`) chứ không phải primary — bug theme

## 04 — account-fe / recruiting-fe (skeleton identical)

- **Palette**: primary `#E4642A` (khác #f36f20!). Token `--lf-*` scheme-aware đầy đủ: accent/tint/deep, blue `#2e5a88`, green `#2e7d5b`, gold `#b7791f`, app-bg `#faf9f7`, borders `#eceae6→#e4e1dc`, input-bg `#fbfaf8`
- **Dark mode**: THẬT — dark scale OKLCH ấm (hue 46) thay dark xanh lạnh của Mantine, có contrast test
- **Font**: Public Sans (variable)
- **Radius**: Card 16px, Button `sm` 4px, inputs 8px `size=sm`; nav pill 10px; login card 28px
- **Shadow**: hệ 2 token — `--lf-lift` (inset trắng cạnh trên) + `--lf-shadow-card/raised`
- **Chữ ký**: nav pill accent-tint (`#fbeae0` chữ `#ad4a1b`), section label uppercase 13px tracked, ambient radial wash sau header, AuthCard 2 panel kiểu Google
- **Quan trọng**: recruiting-fe ĐANG ship nguyên hệ này — chỉ chưa dùng ở màn private (RecruitShell còn stub). Quirk: `themeColor #E8570E` trong layout lệch với accent `#E4642A`

## 05 — life-of-a-loan (LoaL)

- **Palette**: cam `#f36f20` (CSS vars) / `#f36f23` (Tailwind — lệch nhẹ), cream `#fbfaf7`, ink tím-than `#161422`, mint `#10b981`, amber `#d97706`, rose `#f43f5e`; hairline `rgba(22,20,34,.08)` @ 0.5px
- **Font**: Geist (headline tracking -0.035em) + Instrument Serif italic (chỉ dùng cho em-phrase) + Geist Mono (eyebrow/counters)
- **Radius**: card 22px, mọi thứ interactive = pill 999px
- **Shadow**: có inset trắng + glow màu theo accent (`0 6px 14px -6px rgba(243,111,32,.55)` cho tab active)
- **Chữ ký**: nav capsule kính nổi (sticky top-12, blur 22px), eyebrow mono uppercase + gạch cam 18px, bloom cam blur 40px + grain, CTA chính màu INK (không phải cam)
- **Quirk**: 2 hệ token song song CSS-vars vs Tailwind lệch hex; tailwind fontFamily khai Inter/Source Serif nhưng không load

## 06 — MIX đề xuất: "LF Recruit Blend"

Lấy gì từ đâu (lý do):

| Thành phần | Nguồn | Vì sao |
|---|---|---|
| Token nền `--lf-*`, palette `#E4642A`, Public Sans, cream `#faf9f7`, card lift+shadow, nav pill tint, dark mode | **account-fe** | Đã ship sẵn trong recruiting-fe → chi phí port ≈ 0, dark mode + contrast test có sẵn |
| Stat card bấm-là-lọc, chip pastel đặc nhỏ, row hover wash, mật độ 13px | **lf-iq** | Today/Pipeline là màn công-cụ mật độ cao; pattern này team đã quen |
| Eyebrow mono + serif italic em-phrase (điểm nhấn, dùng tiết chế) | **LoaL** | Cho app có cá tính, tránh "dashboard-by-numbers" |
| Button physics (hover nhấc + active nhún), tabular-nums cho số | **tera-fe** | Cảm giác "được chế tác", rẻ (2 dòng CSS) |

**Không lấy**: pill UPPERCASE của marketing (ồn với app), sidebar đen của tera (nặng nề với recruiter cả ngày), glass blur của LoaL (đắt perf, khó giữ nhất quán ở bảng dữ liệu).

---

## Bước tiếp theo sau khi chọn

1. Port token kiểu đã chọn vào `recruiting-fe` (theme Mantine + CSS vars — với kiểu 04/06 thì token đã nằm sẵn trong `global.css`)
2. Dựng bộ primitive: `AppSidebar`, `SectionCard`, `RowItem`, `Chip`, `StatCard`, `EmptyState`
3. Code full flow trên nền primitive — các trang sau tự ra dáng
