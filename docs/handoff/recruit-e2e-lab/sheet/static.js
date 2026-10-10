// ---------- static reference sections ----------
const accTable = () => {
  const keys = ["rec", "recSms", "mgr", "onb", "onbG", "hh", "admin"];
  return `<div class="ref tbl"><table><thead><tr>${U("accCols").map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${keys.map(k => `<tr><td><span class="role">${esc(T(ACC[k].label))}</span></td><td class="mono">${esc(ACC[k].email)}${cp(ACC[k].email)}</td><td>${T(ACC[k].use)}</td></tr>`).join("")}</tbody></table></div>`;
};
const guideBody = (l) => {
  const H = (n, vi, en) => `<h3 class="sub">${n}. ${l === "vi" ? vi : en}</h3>`;
  const R = (k) => RES[k].body[l];
  const browser = l === "vi"
    ? `<ul class="prep"><li>Chrome: tạo 3 profile (góc trên phải → hình người → <b>Add</b>): <b>P1 Recruiter</b> (<code>bao.trinh+recruiter</code>), <b>P2 Manager</b> (<code>bao.trinh+manager</code>), <b>P3 Onboarding</b> (<code>bao.trinh+onb-test</code>). Vai LO luôn dùng <b>cửa sổ ẩn danh</b> (⇧⌘N), không đăng nhập recruit.</li>
<li>Một profile chỉ giữ MỘT tài khoản recruit; đổi người thì khối tên → <b>Sign out</b>. Không mở 2 tài khoản ở 2 tab cùng profile.</li>
<li>Ngôn ngữ chỉ đổi ở trang đăng nhập (<b>Change language / Đổi ngôn ngữ</b>). Sáng/tối: nút mặt trăng trên thanh trên. Thử màn hẹp: DevTools (⌥⌘I) → ⇧⌘M → gõ độ rộng 375.</li>
<li>Các trang: Recruit <code>recruit.viet18.com</code> · đăng ký LO <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · MOSO admin <code>www.viet18.com/lo_recruiting</code> · đăng nhập chung <code>account.viet18.com</code>.</li></ul>`
    : `<ul class="prep"><li>Chrome: create 3 profiles (top right → person icon → <b>Add</b>): <b>P1 Recruiter</b> (<code>bao.trinh+recruiter</code>), <b>P2 Manager</b> (<code>bao.trinh+manager</code>), <b>P3 Onboarding</b> (<code>bao.trinh+onb-test</code>). The LO role always uses an <b>incognito window</b> (⇧⌘N), no recruit sign-in.</li>
<li>One profile holds ONE recruit account; to switch, name block → <b>Sign out</b>. Never two accounts in two tabs of the same profile.</li>
<li>Language only switches on the sign-in page (<b>Change language</b>). Light/dark: the moon button in the top bar. Narrow screens: DevTools (⌥⌘I) → ⇧⌘M → width 375.</li>
<li>Sites: Recruit <code>recruit.viet18.com</code> · LO registration <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · MOSO admin <code>www.viet18.com/lo_recruiting</code> · sign-in <code>account.viet18.com</code>.</li></ul>`;
  return H(1, "Tài khoản (mỗi bước có dòng 🔑 ghi đúng email)", "Accounts (each step has a 🔑 line with the exact email)") + accTable() + `<div class="callout warn" style="margin-top:8px">${PW_NOTE[l]}</div>`
    + H(2, "Trình duyệt", "Browser setup") + browser
    + H(3, "Múi giờ VN ↔ Pacific, giờ làm việc", "Vietnam ↔ Pacific time, business hours") + R("time")
    + H(4, "Lịch chạy tự động — chờ bao lâu", "Automatic jobs — how long to wait") + R("cron")
    + H(5, "Đăng ký một LO mới", "Register a fresh LO") + R("register")
    + H(6, "Trả phí PayPal sandbox", "Pay with PayPal sandbox") + R("paypal")
    + H(7, "Ký Inkless", "Sign in Inkless") + R("sign")
    + H(8, "Gọi Zoom", "Zoom calls") + R("zoom")
    + H(9, "HR app", "HR app") + R("hrapp")
    + H(10, "Email về đâu", "Where emails arrive") + R("inbox")
    + H(11, "Ghi kết quả", "Recording results") + R("results");
};
const STATIC = [
  { id: "status", code: "%", nav: { vi: "Tình trạng 10/10", en: "Status 10/10" }, title: { vi: "Tình trạng 10/10/2026 và cách dùng trang này", en: "Status on 10/10/2026 and how to use this page" }, body: { get vi() { return `
<p class="intro">Bản 10/10: mọi bước đã viết lại thành hướng dẫn từng bước (đăng nhập tài khoản nào, URL, nút nào, gõ gì, đợi bao lâu, chữ kỳ vọng). Code: recruit-be <code>c0db3260</code>, recruit-fe <code>986569f0</code> — cả hai lên production 10/10 ~02:30 VN.</p>
<div class="grid2">
<div><b>Kết quả Claude</b>262 / 263 bước cũ ĐẠT (chip “Claude (tự test)” dưới mỗi bước = kết quả gần nhất). Còn lại: <b>G2</b> phần 2 (LO trả lời email về recruit) bị chặn bởi định tuyến Google Workspace — bead <b>fexgs</b>.</div>
<div><b>Bước mới 10/10</b>B13, B14 (packs #3645 — chờ deploy), OM5b, OM10, OM11, Q4b, Q4c, Q9, S10 — chưa ai chạy.</div>
<div><b>LO mới cho lần chạy tay</b>LO tạo sẵn 07–08/10 phần lớn đã được Claude dùng. Mỗi case có dòng “CHƯA TẠO” (bao.trinh+t10…, (714) 555-12xx, NMLS 99312xx) — tự đăng ký theo mục 5 “Hướng dẫn chung”.</div>
<div><b>Đăng nhập</b>Mỗi bước có dòng 🔑 ghi đúng email cần đăng nhập. Mật khẩu: trong file tài khoản test / hỏi Bao.</div>
</div>
<h3 class="sub">Thay đổi từ 08/10 tới 10/10 (đã lên staging + production)</h3>
<ul class="prep">
<li>Ô tìm đầu trang tìm được LO theo tên / NMLS / email (#421). Thời gian chờ duyệt quá hạn màu đỏ + banner “Offer approval is overdue” (#421).</li>
<li>Giờ làm việc 08:00–17:00 PT, sửa được trong Settings (#420, be #607 V241).</li>
<li>Gọi từ panel Omni: ghi âm phát + tải được, From đúng, dải “Log result” sau cuộc gọi (#422, #425, be #609, omni-service #558 staging).</li>
<li>Onboarding specialist nhắn được LO của chính mình (#423, be #611). Email Team only không tính là liên hệ LO (be #605).</li>
<li>Link hỏng → “This loan officer isn't available” + Back về trang trước; đường dẫn lạ → “Page not found” trong app (#426, #427, #430).</li>
<li>Audit hiện sửa số loan (#428, be #616). Edit profile mở bằng <code>?pm=1</code> lưu được (#429).</li>
<li>LO từ trang Refer a Loan Officer vào thành lead mới S0 (be #608, V240). Đối soát “MOSO đã ký” mỗi 20 phút (be #612). Gửi lại tên đồng nghiệp cho Omni (be #610).</li>
<li>Staging ký bằng <b>Inkless</b> (từ 08/10 18:30). NMLS sang HR đúng (user-service #59/#60/#61 — mới ở staging).</li></ul>`; }, get en() { return `
<p class="intro">10/10 edition: every step is rewritten as a step-by-step guide (which account, URL, which button, what to type, how long to wait, the expected text). Code: recruit-be <code>c0db3260</code>, recruit-fe <code>986569f0</code> — both promoted to production 10/10 ~02:30 VN.</p>
<div class="grid2">
<div><b>Claude's results</b>262 / 263 old steps PASS (the “Claude (self-test)” chip under each step = latest result). Left: <b>G2</b> part 2 (LO email reply back into recruit) blocked by Google Workspace routing — bead <b>fexgs</b>.</div>
<div><b>New steps 10/10</b>B13, B14 (packs #3645 — waiting on deploy), OM5b, OM10, OM11, Q4b, Q4c, Q9, S10 — not run yet.</div>
<div><b>Fresh LOs for the manual run</b>The 07–08/10 prepared LOs were mostly used by Claude. Each case has “NOT CREATED” rows (bao.trinh+t10…, (714) 555-12xx, NMLS 99312xx) — register them per item 5 of the Quick start.</div>
<div><b>Sign-in</b>Every step has a 🔑 line naming the exact email. Password: in the test-accounts file / ask Bao.</div>
</div>
<h3 class="sub">Changes from 08/10 to 10/10 (on staging + production)</h3>
<ul class="prep">
<li>The header search finds LOs by name / NMLS / email (#421). Overdue approval wait time is red + “Offer approval is overdue” banner (#421).</li>
<li>Business hours 08:00–17:00 PT, editable in Settings (#420, be #607 V241).</li>
<li>Calls from the Omni panel: recordings play + download, correct From, “Log result” strip after the call (#422, #425, be #609, omni-service #558 staging).</li>
<li>The onboarding specialist can message their own LO (#423, be #611). A Team-only email is not LO contact (be #605).</li>
<li>Broken link → “This loan officer isn't available” + Back to the previous page; unknown path → in-app “Page not found” (#426, #427, #430).</li>
<li>Audit shows loan-number edits (#428, be #616). Edit profile opened by <code>?pm=1</code> saves (#429).</li>
<li>Refer a Loan Officer leads arrive as S0 new leads (be #608, V240). “Signed in MOSO” reconcile every 20 min (be #612). Teammate names re-pushed to Omni (be #610).</li>
<li>Staging signs with <b>Inkless</b> (since 08/10 18:30). NMLS reaches HR (user-service #59/#60/#61 — staging only so far).</li></ul>`; } } },

  { id: "guide", code: "★", nav: { vi: "Hướng dẫn chung (đọc trước)", en: "Quick start (read first)" }, title: { vi: "Hướng dẫn chung — đọc trước khi test", en: "Quick start — read before testing" }, body: {
    get vi() { return guideBody("vi"); }, get en() { return guideBody("en"); } } },

  { id: "accounts", code: "0", nav: { vi: "Tài khoản & đăng nhập", en: "Accounts & sign-in" }, title: { vi: "Tài khoản test và đăng nhập", en: "Test accounts and sign-in" }, body: {
    get vi() { return `${accTable()}<div class="callout warn" style="margin-top:10px">${PW_NOTE.vi}</div>
<ul class="prep" style="margin-top:10px"><li>Onboarding được hệ chia luân phiên giữa 2 tài khoản: <code>bao.trinh@loanfactory.com</code> (đăng nhập bằng Google) và <code>bao.trinh+onb-test@loanfactory.com</code>. Từ 08/10 12:40, tài khoản thừa <code>bao.trinh+onb-test@viet18.com</code> đã bị gỡ quyền; 9 LO của nó đã chuyển sang onb-test@loanfactory. 7 LO đã qua 1-1 (MOSO khoá đổi người) vẫn ghi @viet18 — mở bằng <code>bao.trinh+onb-test@loanfactory.com</code> và xác nhận “làm thay”.</li>
<li>Menu chỉ ẩn theo vai; trang cần quyền riêng (Settings, Permissions, Team queue…) gõ thẳng sẽ về My work today.</li>
<li>Trang khác: đăng ký LO <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · đăng nhập chung <code>account.viet18.com</code> · MOSO <code>www.viet18.com/lo_recruiting</code>.</li>
<li>Zoom: app Zoom Workplace trên Mac đăng nhập đường dây Manh Zoom (408) 538-1464 (của manhadmin) — xem khối 📞.</li></ul>`; },
    get en() { return `${accTable()}<div class="callout warn" style="margin-top:10px">${PW_NOTE.en}</div>
<ul class="prep" style="margin-top:10px"><li>Onboarding is assigned round-robin across 2 accounts: <code>bao.trinh@loanfactory.com</code> (Google sign-in) and <code>bao.trinh+onb-test@loanfactory.com</code>. Since 08/10 12:40 the stray <code>bao.trinh+onb-test@viet18.com</code> account is revoked; its 9 pre-1-1 LOs moved to onb-test@loanfactory. 7 LOs past the 1-1 (MOSO locks the specialist) still show @viet18 — open them as <code>bao.trinh+onb-test@loanfactory.com</code> and confirm “on behalf”.</li>
<li>Menus only hide by role; pages that need a grant (Settings, Permissions, Team queue…) redirect to My work today when typed directly.</li>
<li>Other sites: LO registration <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · sign-in <code>account.viet18.com</code> · MOSO <code>www.viet18.com/lo_recruiting</code>.</li></ul>`; } } },

  { id: "data", code: "LO", nav: { vi: "Bộ LO tạo sẵn", en: "Prepared LOs" }, title: { vi: "Bộ LO giả: đã tạo sẵn + LO mới “CHƯA TẠO” cho lần chạy 10/10", en: "Fake LOs: prepared + fresh “NOT CREATED” rows for the 10/10 run" }, body: {
    get vi() { return `<p class="intro">Claude tạo đêm 07/10 qua đúng API của từng trang đăng ký, rồi đẩy tới giai đoạn ghi ở cột “Trạng thái tạo sẵn”. Email đều về hộp <code>bao.trinh@loanfactory.com</code>. Dòng ghi “chưa tạo” là dữ liệu chừa sẵn để anh tự gõ trên form. Mỗi case bên dưới lặp lại đúng các dòng nó cần. Sau này thêm người test: tạo bộ riêng với đuôi email khác (vd <code>+v08…</code>) để không đụng nhau.</p>${loTable(LOS.map(l => l.id))}`; },
    get en() { return `<p class="intro">Created by Claude on the night of 07/10 through each registration page's own API, then moved to the stage in “Prepared state”. All mail goes to <code>bao.trinh@loanfactory.com</code>. Rows marked “not created” are reserved data for you to type on the form. Each case below repeats the rows it needs. Future testers get their own set with a different email tag (e.g. <code>+v08…</code>) so nobody collides.</p>${loTable(LOS.map(l => l.id))}`; } } },

  { id: "bugs", code: "!", nav: { vi: "Lỗi & phát hiện", en: "Bugs & findings" }, title: { vi: "Lỗi đã biết và phát hiện mới", en: "Known bugs and new findings" }, body: {
    get vi() { return `<p class="intro">Gặp triệu chứng trong bảng là dự kiến — đánh Lỗi kèm mã để xác nhận còn, làm theo cột cuối.</p><div class="ref tbl"><table><thead><tr><th>Mã</th><th>Triệu chứng</th><th>Ghi chú / đi vòng</th></tr></thead><tbody>${BUGS.map(b => `<tr><td class="mono">${esc(b[0])}</td><td>${b[1].vi}</td><td>${b[2].vi}</td></tr>`).join("")}</tbody></table></div>`; },
    get en() { return `<p class="intro">Symptoms in this table are expected — mark Fail with the id to confirm it is still there, then follow the last column.</p><div class="ref tbl"><table><thead><tr><th>Id</th><th>Symptom</th><th>Note / workaround</th></tr></thead><tbody>${BUGS.map(b => `<tr><td class="mono">${esc(b[0])}</td><td>${b[1].en}</td><td>${b[2].en}</td></tr>`).join("")}</tbody></table></div>`; } } },

  { id: "ref-res", code: "≡", nav: { vi: "Mọi hướng dẫn (bản gập)", en: "All how-tos (collapsed)" }, title: { vi: "Mọi hướng dẫn (cũng có sẵn trong từng case)", en: "All how-tos (also repeated in each case)" }, body: {
    get vi() { return ["stages", "register", "paypal", "sign", "inbox", "hrapp", "time", "cron", "settings", "zoom", "sms", "google", "results"].map(k => `<details class="ref" style="margin-bottom:8px"><summary><b>${T(RES[k].title)}</b></summary><div style="margin-top:8px">${RES[k].body.vi}</div></details>`).join(""); },
    get en() { return ["stages", "register", "paypal", "sign", "inbox", "hrapp", "time", "cron", "settings", "zoom", "sms", "google", "results"].map(k => `<details class="ref" style="margin-bottom:8px"><summary><b>${RES[k].title.en}</b></summary><div style="margin-top:8px">${RES[k].body.en}</div></details>`).join(""); } } }
];
