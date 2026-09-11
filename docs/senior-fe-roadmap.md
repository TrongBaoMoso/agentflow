# Lộ trình Senior FE — 12 tuần (React/Next.js/TypeScript)

> Mục tiêu: lấp 4 khoảng trống đã xác định — (1) TypeScript type-level design, (2) Next.js RSC + caching internals, (3) Testing kỷ luật, (4) Performance đo đạc bài bản. Mọi bài tập đều áp dụng thẳng vào lf-iq / lf-homepage.
>
> Nhịp đề xuất: ~5–7h/tuần (2 buổi tối + 1 buổi cuối tuần). Mỗi block 3 tuần, kết thúc bằng một deliverable thật (PR hoặc doc) — không có deliverable = chưa xong block.

---

## Block 1 — TypeScript type-level design (Tuần 1–3)

**Tại sao trước tiên:** lf-iq đã `strict: true` nên là sân tập tốt nhất; lf-homepage/lo-homepage đang `strict: false` nên ít bị ép luyện — phải chủ động.

### Tuần 1 — Generics & inference thực chiến

Học:
- [TypeScript Handbook — Generics, Conditional Types, Mapped Types](https://www.typescriptlang.org/docs/handbook/2/generics.html) (đọc kỹ, không skim)
- [Total TypeScript — free tutorials](https://www.totaltypescript.com/tutorials) (phần Generics + Type Transformations)

Bài tập trên lf-iq:
1. Tìm 5 chỗ trong lf-iq đang dùng `as` assertion hoặc `any` (grep `as any`, `: any`). Với mỗi chỗ, viết lại để type tự infer — ghi chú lại chỗ nào **không thể** bỏ và tại sao.
2. Viết `isApiSuccess<T>(res): res is ApiSuccessResponse<T>` type guard cho envelope `ApiBaseResponse<T>` — dùng discriminated union thay vì check field lỏng lẻo.

### Tuần 2 — Type hệ thống: API envelope + hooks

Học:
- [type-challenges](https://github.com/type-challenges/type-challenges) — làm hết mức **easy** (13 bài) + 5 bài medium (`Pick`, `Readonly`, `DeepReadonly`, `ReturnType`, `Omit`)

Bài tập trên lf-iq:
1. Viết generic hook `useApiQuery<T>` bọc TanStack Query, sao cho gọi `useApiQuery(fetchReports)` **tự infer** kiểu data từ hàm fetch — không phải truyền type param bằng tay. Kỹ thuật chính: `Awaited<ReturnType<typeof fn>>`.
2. Type hoá `PageableResponse<T>`: viết `type ExtractItem<P> = P extends PageableResponse<infer T> ? T : never` và dùng thật ở một list page.

### Tuần 3 — Type-safe i18n + tổng kết

Bài tập trên lf-iq:
1. **Bài đinh của block:** derive union type cho translation keys từ `src/messages/en.json` (`typeof en` + template literal types / recursive mapped type) để `t('...')` gõ sai key là đỏ ngay compile-time. next-intl có sẵn hướng dẫn augment `IntlMessages` — làm theo và mở PR.
2. Viết doc ngắn 1 trang "TS conventions cho lf-iq" (khi nào generic, khi nào `unknown`, khi nào chấp nhận `as`) — đây là artifact kiểu senior: nâng chuẩn team chứ không chỉ nâng code mình.

**Đạt khi:** PR typed-i18n merge được; làm được type-challenges easy không nhìn đáp án; giải thích được `infer` cho một junior trong 5 phút.

---

## Block 2 — Next.js RSC + caching internals (Tuần 4–6)

**Tại sao:** các bug kiểu `Button component={Link}` 500 trong server component cho thấy đang dùng App Router theo kinh nghiệm, chưa theo mental model. Block này xây model đó.

### Tuần 4 — RSC mental model

Học:
- [Next.js docs — Server & Client Components](https://nextjs.org/docs/app/building-your-application/rendering) (đọc trọn chương Rendering)
- Josh Comeau — "Making Sense of React Server Components" (bài giải thích RSC dễ hiểu nhất hiện có)

Bài tập:
1. Vẽ sơ đồ (giấy hoặc mermaid) ranh giới server/client cho **một route thật** của lf-iq (gợi ý: trang report detail). Đánh dấu: component nào chạy ở đâu, props nào phải serializable, chỗ nào `"use client"` đang đặt cao hơn mức cần.
2. Trả lời viết ra (như tự phỏng vấn): tại sao `Button component={Link}` 500 ở server component nhưng `next build` không bắt được? Tại sao curl route thật mới lộ? (Bạn đã có memory về bug này — giờ giải thích được cơ chế.)

### Tuần 5 — 4 lớp cache của Next.js

Học:
- [Next.js docs — Caching](https://nextjs.org/docs/app/building-your-application/caching) — chương quan trọng nhất của cả block. Đọc 2 lần.

Bài tập (làm ở playground riêng, không đụng repo chính):
1. Tạo mini-app Next 14 trong scratchpad/side folder. Thí nghiệm và **ghi log kết quả** cho từng lớp: Request Memoization, Data Cache (`fetch` + `revalidate`/`tags`), Full Route Cache, Router Cache. Mỗi lớp: làm 1 thí nghiệm chứng minh nó tồn tại, 1 thí nghiệm invalidate nó.
2. Thử `revalidateTag` / `revalidatePath` từ một route handler và quan sát hành vi dev vs `next build && next start` (khác nhau đáng kể — đây là bẫy kinh điển).

### Tuần 6 — Áp vào repo thật

Bài tập:
1. Lập bảng audit cho lf-homepage: mỗi route public → rendering strategy hiện tại (SSG/SSR/ISR?) → strategy **nên là gì** và tại sao. Landing pages marketing mà đang SSR động là tiền vứt đi.
2. Viết checklist "RSC gotchas" cho team (5–10 mục: serializable props, Mantine components cần `"use client"`, `usePathname` locale gotcha bạn đã dính, curl route thật trước khi tin `next build`...) — bỏ vào `docs/` của lf-iq.

**Đạt khi:** giải thích được 4 lớp cache không nhìn docs; bảng audit lf-homepage hoàn thành; checklist RSC được team dùng.

---

## Block 3 — Testing kỷ luật (Tuần 7–9)

**Hiện trạng:** lf-iq đã có Jest + tests cho utils/permissions (nền tốt), nhưng **chưa có** @testing-library/react, MSW, Playwright — tức là hook/component/E2E gần như trống.

### Tuần 7 — Component & hook testing với Testing Library

Học:
- [Testing Library — Guiding Principles](https://testing-library.com/docs/guiding-principles/) + Kent C. Dodds "Common mistakes with React Testing Library"

Bài tập trên lf-iq:
1. Cài `@testing-library/react` + `@testing-library/jest-dom`. Viết test cho `usePrivateListSort` và `useOnboarding` bằng `renderHook` (đã có `usePendingDateRange.test.ts` làm mẫu — nhân rộng pattern).
2. Viết component test cho `TotalCountStat` (component shared trên 10 admin pages — ROI test cao nhất): render đúng số, đúng label, đúng trạng thái loading.

### Tuần 8 — Mock API với MSW

Bài tập trên lf-iq:
1. Cài MSW, setup handlers cho 2–3 endpoint chính (envelope `ApiBaseResponse` + `PageableResponse`). Viết test cho một hook có fetch (vd `useInfiniteReports`): trang đầu, trang tiếp, error state.
2. Nguyên tắc cần nội hoá: **test behavior, không test implementation** — không assert internal state, chỉ assert cái user/consumer thấy. Refactor hook mà test vẫn xanh = test tốt.

### Tuần 9 — E2E với Playwright + coverage ratchet

Bài tập:
1. Cài Playwright cho lf-iq. Viết 1 flow E2E quan trọng nhất: login → mở danh sách homeowners → mở report detail. Dùng deterministic waits (`await expect(...).toBeVisible()`), cấm `waitForTimeout`.
2. Chạy `jest --coverage`, ghi baseline. Set `coverageThreshold` trong jest.config **bằng đúng baseline** (ratchet: không cho tụt, tăng dần theo quý) — thực tế hơn là ép 80% ngay.

**Đạt khi:** PR thêm RTL+MSW+Playwright infra merge; 1 E2E flow chạy xanh trên máy local; coverage threshold có trong CI config.

---

## Block 4 — Performance đo đạc bài bản (Tuần 10–12)

**Tại sao cuối:** cần nền RSC/caching (Block 2) để fix đúng chỗ, và kết quả block này dễ "khoe" nhất — số liệu trước/sau.

### Tuần 10 — Đo baseline

Học:
- [web.dev — Core Web Vitals](https://web.dev/articles/vitals) (LCP, INP, CLS — hiểu từng metric đo cái gì, ngưỡng bao nhiêu)

Bài tập trên lf-homepage:
1. Chạy Lighthouse (Chrome DevTools, chế độ mobile, production build) cho 4 trang: `/`, `/best-price`, một trang loan-product, `/quote`. Ghi bảng LCP/INP/CLS/TBT/bundle size — đây là baseline, mọi cải thiện sau đo so với nó.
2. Cài `@next/bundle-analyzer`, chạy trên lf-homepage và lf-iq. Liệt kê top 10 chunk nặng nhất. Nghi phạm quen thuộc của stack này: Tiptap (9 extensions), Recharts, @xyflow/react, Google Maps — kiểm chứng bằng số.

### Tuần 11 — Fix có chủ đích

Bài tập trên lf-homepage:
1. Chọn **1 trang** có LCP tệ nhất. Fix theo thứ tự chi phí/lợi ích: hero image (`priority`, đúng kích cỡ, AVIF/WebP) → font loading (`next/font`, preload weight chính) → dynamic import lib nặng dưới fold (`next/dynamic` cho chart/map/Tiptap) → xoá JS không dùng khỏi route.
2. Đo lại Lighthouse sau mỗi fix riêng lẻ (không gộp) — để biết fix nào ăn tiền, fix nào không. Đây chính là khác biệt senior: quy được cải thiện về từng thay đổi.

### Tuần 12 — Runtime performance + tổng kết

Bài tập trên lf-iq:
1. Mở React DevTools Profiler trên trang admin table nặng nhất (users-v2 hoặc homeowners). Record một lần filter/sort. Tìm re-render thừa: component nào render lại mà props không đổi? Fix bằng cách tách state/derive đúng chỗ trước, `memo` là biện pháp cuối.
2. Viết report 1 trang "Performance trước/sau" (bảng số liệu + fix đã làm + việc còn lại) — gửi team. Cân nhắc thêm Lighthouse CI vào pipeline để giữ thành quả.

**Đạt khi:** LCP trang mục tiêu cải thiện đo được (vd 4s → <2.5s); giải thích được INP khác FID chỗ nào; report trước/sau tồn tại.

---

## Nhịp duy trì sau 12 tuần

- **type-challenges**: 1 bài medium/tuần cho đến khi hết bộ medium.
- **Mỗi PR mình mở**: tự hỏi "PR này thiếu test gì?" trước khi request review.
- **Mỗi quý**: chạy lại Lighthouse baseline 4 trang, nâng coverage threshold thêm 3–5%.
- **Đọc release notes**: Next.js major/minor + React — 30 phút mỗi khi có bản mới, đặc biệt phần caching semantics (Next đổi default cache liên tục giữa 14→15).

## Nguyên tắc xuyên suốt

1. **Deliverable thật > tutorial.** Mỗi block kết thúc bằng PR hoặc doc trong repo, không phải "đã đọc xong".
2. **Giải thích được = hiểu.** Cuối mỗi tuần, tự nói (hoặc viết) lời giải thích cho một junior tưởng tượng. Chỗ nào ấp úng là chỗ chưa hiểu.
3. **Đo trước khi fix.** Áp cho cả performance lẫn refactor — không có số baseline thì không có "cải thiện".
