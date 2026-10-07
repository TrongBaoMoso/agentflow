// ---------- cases part 4: O, P, Q, R, S, T, U, V ----------
CASES.push({ id: "O", group: G_SCR, short: { vi: "My work today", en: "My work today" },
  title: { vi: "My work today theo từng vai", en: "My work today per role" },
  goal: { vi: "Trang đầu tiên hiện đúng việc trong NGÀY của từng vai; số trên ô = số dòng.", en: "The home page shows each role's work for TODAY; tile numbers = rows." },
  acc: ["rec", "mgr", "onb", "hh"], res: ["time"],
  steps: [
    S("O1", "REC", "Mở <b>My work today</b>. Đếm số dòng trên trang.", "Ô <b>To contact</b> = đúng số dòng; ô <b>Never contacted</b> = số LO chưa ai gọi/nhắn đi. Không có nhóm “Another day”.", "Open <b>My work today</b>. Count the rows.", "<b>To contact</b> tile = row count; <b>Never contacted</b> = LOs nobody contacted outbound. No “Another day” group."),
    S("O2", "REC", "Bấm ô Never contacted, rồi ô To contact.", "Danh sách lọc theo (<code>?f=untouched</code> / <code>?f=all</code>).", "Click Never contacted, then To contact.", "List filters (<code>?f=untouched</code> / <code>?f=all</code>)."),
    S("O3", "REC", "Xem thứ tự nhóm.", "Thẻ Next up → <b>Overdue</b> → Within the hour → <b>Later today</b> → <b>No follow-up set</b>. Follow-up “ngày mai sáng” đặt từ VN nằm ở Later today với giờ VN.", "Check the group order.", "Next up card → <b>Overdue</b> → Within the hour → <b>Later today</b> → <b>No follow-up set</b>. A “tomorrow morning” follow-up set from VN sits under Later today with VN time."),
    S("O4", "REC", "Menu ⋯ trên một dòng: Copy phone / Hand off… / I already did this outside the app / Manage follow-ups.", "Mỗi mục làm đúng; “I already did this…” báo “Follow-up done — pick the next step” rồi mở khung kết quả.", "⋯ menu on a row: Copy phone / Hand off… / I already did this outside the app / Manage follow-ups.", "Each works; “I already did this…” says “Follow-up done — pick the next step” and opens the result wizard."),
    S("O5", "REC", "<b>Focus mode</b> → Prev / Next (phím ← →) / Skip / Remind later “In 1 hour”.", "Một LO mỗi màn; dời lịch có toast; hết thì “Queue clear 🎉”.", "<b>Focus mode</b> → Prev / Next (← →) / Skip / Remind later “In 1 hour”.", "One LO per screen; reschedule toast; at the end “Queue clear 🎉”."),
    S("O6", "REC", "Cuối trang.", "Dòng “N loan officers are waiting on payment or signing → My hand-offs” và “All times: {múi giờ}”.", "Bottom of the page.", "“N loan officers are waiting on payment or signing → My hand-offs” and “All times: {zone}”."),
    S("O7", "MGR", "Manager → My work today.", "Ô <b>Decisions waiting</b> + khối Waiting on your decision; link “N leads are past their SLA → Exceptions”.", "Manager → My work today.", "<b>Decisions waiting</b> tile + Waiting on your decision; link “N leads are past their SLA → Exceptions”."),
    S("O8", "ONB", "Onboarding → My work today.", "Ô 1-1 today / to book / to close; khối Your onboarding (xem J8); dòng setup call khi HR + Licensing xong.", "Onboarding → My work today.", "Tiles 1-1 today / to book / to close; Your onboarding (see J8); setup-call row once HR + Licensing are done."),
    S("O9", "HH", "Headhunter → My work today.", "Chỉ lead của mình (QA Ejoin, QA Erecruit); không có Select / hand-off.", "Headhunter → My work today.", "Only its own leads (QA Ejoin, QA Erecruit); no Select / hand-off.")
  ] });

CASES.push({ id: "P", group: G_SCR, short: { vi: "Phân quyền", en: "Permissions" },
  title: { vi: "Phân quyền theo vai — phải bị chặn / ẩn đúng", en: "Role permissions — must be blocked / hidden" },
  goal: { vi: "Đăng nhập từng vai, thử việc không được phép. Đạt = bị chặn / ẩn đúng.", en: "Sign in as each role and try forbidden actions. Pass = correctly blocked / hidden." },
  acc: ["rec", "mgr", "onb", "hh", "admin"],
  steps: [
    S("P1", "REC", "Xem menu.", "My work today, Hot leads, Cold list, Pipeline, My hand-offs, Dormant, Conversations, Templates, Connections (+ My referrals nếu có). KHÔNG có Exceptions, Reports, Team queue, Settings, Permissions.", "Read the menu.", "My work today, Hot leads, Cold list, Pipeline, My hand-offs, Dormant, Conversations, Templates, Connections (+ My referrals if any). NO Exceptions, Reports, Team queue, Settings, Permissions."),
    S("P2", "REC", "Gõ thẳng <code>recruit.viet18.com/work</code>, <code>/settings</code>, <code>/permissions</code>.", "Bị đưa về My work today.", "Type <code>recruit.viet18.com/work</code>, <code>/settings</code>, <code>/permissions</code>.", "Redirected to My work today."),
    S("P3", "REC", "Hồ sơ LO → menu trái.", "Không có mục Sync.", "LO profile → left menu.", "No Sync section."),
    S("P4", "MGR", "Xem menu.", "Như Recruiter + Exceptions, Reports, Team queue, Duplicates, Audit, Referrals by referrer.", "Read the menu.", "Recruiter's + Exceptions, Reports, Team queue, Duplicates, Audit, Referrals by referrer."),
    S("P5", "ONB", "Xem menu; mở một LO → Log result.", "Menu: My work today, Team queue, Conversations (+ Checklist templates). Không có Hot leads / Cold list / Pipeline. Không có thẻ Ready to join / Prepare offer.", "Menu; open an LO → Log result.", "Menu: My work today, Team queue, Conversations (+ Checklist templates). No Hot leads / Cold list / Pipeline. No Ready to join / Prepare offer."),
    S("P6", "HH", "Xem menu; mở LO không phải của mình (dán link hồ sơ QA Amain).", "Menu: My work today, Hot leads, Pipeline, My hand-offs. Hồ sơ người khác: “Lead not available” / không có nút gọi, offer, ghi chú.", "Menu; open an LO that isn't yours (paste QA Amain's profile link).", "Menu: My work today, Hot leads, Pipeline, My hand-offs. Others' profile: “Lead not available” / no call, offer, note buttons."),
    S("P7", "HH", "Offer cho QA Ejoin (của mình).", "Hai con số chỉ đọc; nút luôn <b>Request approval</b> (offer của chương trình luôn tới manager).", "Offer on QA Ejoin (own lead).", "Numbers read-only; button always <b>Request approval</b> (program offers always go to a manager)."),
    S("P8", "ADMIN", "Admin → Permissions → <b>Give access to someone</b> → tìm email → chọn vai → Give access. Rồi Edit → bỏ vai → lý do → Save.", "Người được cấp tải lại thấy menu mới; Audit ghi lại.", "Admin → Permissions → <b>Give access to someone</b> → search → role → Give access. Then Edit → remove → reason → Save.", "The person sees the new menu after reload; Audit records it."),
    S("P9", "ANY", "Pipeline: tìm nút “Add lead”.", "Không có (LO chỉ vào từ trang đăng ký).", "Pipeline: look for “Add lead”.", "Absent (LOs only come from registration pages).")
  ] });

CASES.push({ id: "Q", group: G_SCR, short: { vi: "Quick view & hồ sơ", en: "Quick view & profile" },
  title: { vi: "Quick view và trang hồ sơ đầy đủ (kiểu TERA)", en: "Quick view and the full profile page (TERA style)" },
  goal: { vi: "Bấm dòng → Quick view; Open full profile → trang riêng; Back về đúng danh sách đã lọc.", en: "Row → Quick view; Open full profile → own page; Back returns to the exact filtered list." },
  los: ["A2"], acc: ["rec"],
  steps: [
    S("Q1", "REC", "Rê chuột lên tên LO ở danh sách.", "Tên đổi màu cam, KHÔNG gạch chân.", "Hover an LO name in a list.", "Turns orange, NO underline."),
    S("Q2", "REC", "Pipeline → lọc Status = ACTIVE + tìm “QA” → bấm một dòng → <b>Open full profile</b> → <b>Back</b>.", "Back về Pipeline với đúng bộ lọc/tìm cũ, Quick view không tự mở lại.", "Pipeline → Status ACTIVE + search “QA” → click a row → <b>Open full profile</b> → <b>Back</b>.", "Back returns to Pipeline with the same filters, Quick view does not reopen."),
    S("Q3", "REC", "Trên hồ sơ bấm Overview / Activity / Profile.", "URL đổi <code>?section=…</code>, mục đang chọn được tô.", "Click Overview / Activity / Profile.", "URL changes <code>?section=…</code>, current item highlighted."),
    S("Q4", "REC", "Gõ <code>recruit.viet18.com/candidates/%E0%A4%A</code>.", "Báo không xem được + nút Back (KHÔNG phải trang lỗi 500).", "Open <code>recruit.viet18.com/candidates/%E0%A4%A</code>.", "“Unavailable” + Back (NOT a 500 page)."),
    S("Q5", "REC", "Mở hồ sơ với <code>?from=/%09/evil.com</code> rồi bấm Back.", "Vẫn ở trong recruit.viet18.com.", "Open a profile with <code>?from=/%09/evil.com</code> and click Back.", "Stays inside recruit.viet18.com."),
    S("Q6", "REC", "Đang ở một hồ sơ, bấm một thông báo trong chuông về LO khác.", "Mở hồ sơ của LO đó (không nhảy về Today).", "While on a profile, click a bell notification about another LO.", "Opens that LO's profile (not Today)."),
    S("Q7", "REC", "Profile → Edit → email <code>abc@</code> → Save; đổi Referral mà không ghi lý do.", "Báo lỗi bằng câu dễ hiểu. <b>Nếu thấy chữ thô “invalid_email” / “reason_required” → đánh Lỗi.</b>", "Profile → Edit → email <code>abc@</code> → Save; change Referral without a reason.", "Readable error. <b>If raw “invalid_email” / “reason_required” shows → Fail.</b>"),
    S("Q8", "REC", "Profile → Legal name → <b>Checked with the LO — confirm</b>; thử gõ <code>Anna2</code>.", "Toast “Legal name confirmed”; “Anna2” bị từ chối (chỉ chữ, khoảng trắng, ' . -).", "Profile → Legal name → <b>Checked with the LO — confirm</b>; try <code>Anna2</code>.", "Toast “Legal name confirmed”; “Anna2” refused (letters, spaces, ' . - only).")
  ] });

CASES.push({ id: "R", group: G_SCR, short: { vi: "Nurture / Dormant", en: "Nurture / Dormant" },
  title: { vi: "Nurture và Dormant", en: "Nurture and Dormant" },
  goal: { vi: "LO “chưa phải lúc” và LO ngủ đông quay lại đúng trạng thái.", en: "“Not now” and dormant LOs come back correctly." },
  los: ["R1"], acc: ["rec"],
  steps: [
    S("R1", "REC", "Pipeline → Status = NURTURE → QA Rnurture.", "Chip Nurture, vòng stage xám, ghi ngày thức dậy (~30 ngày).", "Pipeline → Status NURTURE → QA Rnurture.", "Nurture chip, grey stage circle, wake-up date (~30 days)."),
    S("R2", "REC", "QA Rnurture → Log result → Interested → Call again ngày mai.", "Về ACTIVE, stage Engaged, hiện lại ở My work today.", "QA Rnurture → Log result → Interested → Call again tomorrow.", "Back to ACTIVE, stage Engaged, back on My work today."),
    S("R3", "REC", "Menu Dormant → một LO bất kỳ → <b>Revive</b>.", "Toast “Revived {tên} — back to ACTIVE”.", "Dormant → any LO → <b>Revive</b>.", "Toast “Revived {name} — back to ACTIVE”.")
  ] });

CASES.push({ id: "S", group: G_SCR, short: { vi: "Pipeline & màn quản lý", en: "Pipeline & admin screens" },
  title: { vi: "Pipeline 6 stage, Big producer, Duplicates, Reports, Templates, Audit", en: "6-stage Pipeline, Big producer, Duplicates, Reports, Templates, Audit" },
  goal: { vi: "Các màn quản lý.", en: "Management screens." },
  los: ["S1", "S2", "B1"], acc: ["rec", "mgr"],
  loNote: { vi: "S1, S2 cố ý trùng NMLS 9931899 (email khác) để test Duplicates.", en: "S1, S2 deliberately share NMLS 9931899 (different emails) for Duplicates." },
  steps: [
    S("S1", "REC", "Pipeline → các tab.", "Tab: <b>All / New lead / Engaged / Offer / Onboarding / Joined / Onboarded</b>. LO chưa ai claim hiện ở All với nhãn “Not started”.", "Pipeline → tabs.", "Tabs: <b>All / New lead / Engaged / Offer / Onboarding / Joined / Onboarded</b>. Unclaimed LOs show under All as “Not started”."),
    S("S2", "REC", "Hot leads: xem nhãn sản xuất.", "LO chưa có số: “Check production first”. Sau khi nhập 6/3 (B1): “<b>Big producer</b>”; Big producer xếp đầu.", "Hot leads: production label.", "No numbers: “Check production first”. After 6/3 (B1): “<b>Big producer</b>”; big producers sort first."),
    S("S3", "REC", "Pipeline → Board view → kéo một LO của mình sang cột khác; Card view.", "Toast “Moved {tên} to {stage}”.", "Pipeline → Board view → drag one of your LOs; Card view.", "Toast “Moved {name} to {stage}”."),
    S("S4", "REC", "Lọc Status / Source / Label / Sort / More filters → tải lại trang.", "Bộ lọc giữ nguyên (nằm trên URL).", "Filter Status / Source / Label / Sort / More filters → reload.", "Filters stay (in the URL)."),
    S("S5", "MGR", "Pipeline → tick vài dòng → <b>Export CSV</b>.", "Tải file; toast “Exported {n} rows…”.", "Pipeline → tick rows → <b>Export CSV</b>.", "File downloads; toast “Exported {n} rows…”."),
    S("S6", "MGR", "<b>Duplicates</b> → nhóm “Same NMLS” có QA Sdupone + QA Sduptwo → chọn dòng giữ → Merge → Confirm merge.", "Toast “Merged … into …”; lịch sử chuyển sang dòng giữ.", "<b>Duplicates</b> → “Same NMLS” group QA Sdupone + QA Sduptwo → pick the keeper → Merge → Confirm merge.", "Toast “Merged … into …”; history moves to the keeper."),
    S("S7", "MGR", "<b>Reports</b> → Activity / By month created → Export CSV.", "Số theo recruiter; bấm ô bảng tháng mở danh sách tên.", "<b>Reports</b> → Activity / By month created → Export CSV.", "Per-recruiter numbers; clicking a month cell lists names."),
    S("S8", "REC", "<b>Templates</b> → New template (Team) → Submit for review; Manager → Approve.", "Mẫu dùng được ở Send info.", "<b>Templates</b> → New template (Team) → Submit for review; Manager → Approve.", "Template usable in Send info."),
    S("S9", "MGR", "<b>Audit</b>.", "Có dòng cho các thay đổi vừa làm (cấp vai, đổi settings).", "<b>Audit</b>.", "Rows for recent changes (grants, settings).")
  ] });

CASES.push({ id: "T", group: G_SCR, short: { vi: "Referrals", en: "Referrals" },
  title: { vi: "My referrals và Referrals by referrer (đang BẬT trên staging)", en: "My referrals and Referrals by referrer (ON on staging)" },
  goal: { vi: "Người giới thiệu thấy LO mình giới thiệu; manager/admin xem theo người giới thiệu.", en: "Referrers see their referred LOs; managers/admins see them by referrer." },
  los: ["E6c", "N2", "B4"], acc: ["rec", "mgr"],
  loNote: { vi: "E6c, N2, B4 được giới thiệu qua trang Refer a Loan Officer với “referred by” = <code>bao.trinh+recruiter@loanfactory.com</code>.", en: "E6c, N2, B4 were referred via Refer a Loan Officer with “referred by” = <code>bao.trinh+recruiter@loanfactory.com</code>." },
  steps: [
    S("T1", "REC", "<code>bao.trinh+recruiter</code> → menu <b>My referrals</b>.", "Thấy 3 LO đã giới thiệu; ô Referred / In progress / Onboarded / Bonus pending / Bonus paid; mốc tiến trình.", "<code>bao.trinh+recruiter</code> → <b>My referrals</b>.", "3 referred LOs; tiles Referred / In progress / Onboarded / Bonus pending / Bonus paid; milestones."),
    S("T2", "MGR", "<b>Referrals by referrer</b> → lọc Referrer / Entry page / Stalled only → Export CSV.", "Lọc đúng; tải file.", "<b>Referrals by referrer</b> → filter Referrer / Entry page / Stalled only → Export CSV.", "Filters work; file downloads.")
  ] });

CASES.push({ id: "U", group: G_SCR, short: { vi: "Ngôn ngữ, giao diện, điện thoại", en: "Language, theme, phone" },
  title: { vi: "Tiếng Việt, giao diện tối, màn hình điện thoại", en: "Vietnamese, dark mode, phone screens" },
  goal: { vi: "Recruit có đủ EN/VI và chạy ở màn hẹp.", en: "Recruit is complete in EN/VI and works on narrow screens." },
  acc: ["rec", "onb"],
  steps: [
    S("U1", "ANY", "Góc trên → đổi ngôn ngữ sang Tiếng Việt; đi qua My work today, hồ sơ, Offer modal, Team queue.", "Không còn chữ tiếng Anh sót / không hiện khoá thô.", "Top bar → switch to Vietnamese; walk My work today, profile, Offer modal, Team queue.", "No leftover English / no raw keys."),
    S("U2", "ANY", "Bật giao diện tối.", "Chip, thanh tiến độ, chú giải màu đọc rõ.", "Switch to dark mode.", "Chips, progress bars, legends are readable."),
    S("U3", "ANY", "Màn hình 375px (DevTools) → My work today, hồ sơ, My hand-offs.", "Không tràn ngang; stage thành chấm + một dòng chữ; thẻ Onboarding progress xếp dọc.", "375px screen (DevTools) → My work today, profile, My hand-offs.", "No horizontal scroll; stepper becomes dots + one line; progress card stacks.")
  ] });

CASES.push({ id: "V", group: G_SCR, short: { vi: "Chưa test được", en: "Not testable" },
  title: { vi: "Chưa test được trên staging (để biết)", en: "Not testable on staging (for information)" },
  goal: { vi: "Đánh “Bỏ” nếu chưa bật. Khi bật sẽ thành case thật.", en: "Mark “Skip” while off. They become real cases once switched on." },
  steps: [
    S("V1", "DEV", "Tự trả lead chưa liên hệ về pool (auto-release).", "Đang TẮT — chỉ có cảnh báo.", "Auto-release of uncontacted leads.", "OFF — warnings only."),
    S("V2", "DEV", "Licensing tự tick từ sự kiện HR.", "Chưa chạy: subscription HR update trên staging thiếu quyền (chờ Khải). Licensing tick tay.", "Licensing auto-tick from HR events.", "Not working: staging HR update subscription lacks IAM (waiting on Khải). Licensing is manual."),
    S("V3", "DEV", "Email Welcome / Activate sau khi tạo nhân viên.", "Staging chỉ ghi MOSO Email History.", "Welcome / Activate email after hiring.", "Staging only logs MOSO Email History."),
    S("V4", "DEV", "Email gửi từ hội thoại recruit (omni).", "SendGrid staging không có IP (omni #349).", "Emails from the recruit conversation (omni).", "Staging SendGrid has no IP (omni #349)."),
    S("V5", "DEV", "Gửi lại thoả thuận ký từ recruit.", "Chỉ 5 email allowlist; staging tắt Inkless.", "Re-send the agreement from recruit.", "Only 5 allowlisted emails; Inkless off on staging."),
    S("V6", "DEV", "Chuông recruit chép sang hộp thư chung của nền tảng.", "Đang tắt.", "Recruit bells mirrored to the platform inbox.", "Off.")
  ] });
