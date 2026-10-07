// ---------- static reference sections ----------
const accTable = () => {
  const keys = ["rec", "recSms", "mgr", "onb", "onbG", "hh", "admin"];
  return `<div class="ref tbl"><table><thead><tr>${U("accCols").map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${keys.map(k => `<tr><td><span class="role">${esc(T(ACC[k].label))}</span></td><td class="mono">${esc(ACC[k].email)}${cp(ACC[k].email)}</td><td>${T(ACC[k].use)}</td></tr>`).join("")}</tbody></table></div>`;
};
const STATIC = [
  { id: "status", code: "%", nav: { vi: "Tình trạng & cách dùng", en: "Status & how to use" }, title: { vi: "Tình trạng 08/10 và cách dùng trang này", en: "Status on 08/10 and how to use this page" }, body: { get vi() { return `
<p class="intro">Trang mới thay cho sheet 06/10 (link cũ vẫn giữ kết quả cũ). Mỗi case tự chứa đủ: LO đã tạo sẵn, tài khoản, thẻ PayPal, cách ký, cách vào HR, giá trị /settings để trả lại — không cần kéo lên trên.</p>
<div class="grid2">
<div><b>Kết quả riêng từng người</b>Mỗi người đăng nhập claude.ai bấm Đạt / Lỗi / Bỏ + ghi chú → chỉ ghi vào phần của mình, không ghi đè ai. Ô “View” trên cùng: <b>So sánh mọi người</b> để thấy kết quả của từng người dưới mỗi bước; hoặc chọn một người để xem riêng.</div>
<div><b>Claude đã tự test</b>Kết quả Claude chạy ghi dưới mỗi bước bằng chip viền nét đứt “Claude (tự test)”. Kết quả của anh vẫn trống để anh tự chạy.</div>
<div><b>Song ngữ</b>Nút <b>VI / EN</b> góc trên phải. Trang nhớ lựa chọn.</div>
<div><b>Đổi /settings</b>Settings dùng chung. Trước khi hạ SLA bấm “Tôi đang đổi /settings” trong case — mọi người thấy dải vàng trên cùng; trả lại giá trị rồi bấm nhả.</div>
</div>
<h3 class="sub">Claude đã tự chạy trên staging (đêm 07/10 → 08/10)</h3>
<div class="ref tbl"><table><thead><tr><th>Phần</th><th>Kết quả</th></tr></thead><tbody>${CLAUDE_RUNS.vi}</tbody></table></div>
<h3 class="sub">Thay đổi lớn so với sheet 06/10</h3>
<ul class="prep">
<li><b>6 stage</b> đã bật: Not started → New lead → Engaged → Offer → Onboarding → Joined → Onboarded (bảng ở case A).</li>
<li>Hồ sơ LO: bấm dòng mở <b>Quick view</b>, bấm <b>Open full profile</b> mở trang riêng <code>/candidates/&lt;id&gt;</code> (không còn drawer).</li>
<li>Trang đầu đổi tên <b>My work today</b>; ô <b>To contact</b> / <b>Never contacted</b>; không còn nhóm “Another day”.</li>
<li>“My invites” → <b>My hand-offs</b>, một dòng mỗi LO, thanh tiến độ 10 ô.</li>
<li>Offer modal đoán trước quy tắc 5/2; manager duyệt 1 bước; nút duyệt ngắn [Approve] / [Approve · charge $100] / [Approve · waive $100].</li>
<li><b>Send to HR tự động</b> khi LO vào Joined; thiếu trường thì “Missing for HR”.</li>
<li>Sau Joined: thẻ <b>Onboarding progress</b> (HR account / HR to-do / HR docs / Licensing / setup call) → tự lên <b>Onboarded</b>.</li>
<li>Department work → <b>Team queue</b> (Mine / Everyone / Needs owner, tìm kiếm, Assigned to). Màn Sponsorships / Licensing rules đã gỡ.</li>
<li>Call again không chọn được giờ quá khứ; No answer hiện ngày gọi lại, cuối tuần dời sang thứ 2; Send info “Save &amp; send”.</li>
<li>Referrals đang <b>BẬT</b> trên staging (My referrals, Referrals by referrer).</li></ul>`; }, get en() { return `
<p class="intro">This page replaces the 06/10 sheet (the old link keeps its results). Every case is self-contained: prepared LOs, accounts, PayPal card, signing, HR steps, /settings values to restore — no scrolling up.</p>
<div class="grid2">
<div><b>Per-person results</b>Everyone signed in to claude.ai stamps Pass / Fail / Skip + notes into their own slot; nobody overwrites anyone. The “View” box at the top: <b>Compare everyone</b> shows each person's result under every step; or pick one person.</div>
<div><b>Claude's self-test</b>Claude's runs appear under each step as a dashed “Claude (self-test)” chip. Your own results start empty.</div>
<div><b>Bilingual</b><b>VI / EN</b> button top right. The page remembers it.</div>
<div><b>Changing /settings</b>Settings are shared. Before lowering an SLA press “I'm changing /settings” in the case — everyone sees a yellow strip at the top; restore the value, then release.</div>
</div>
<h3 class="sub">What Claude ran on staging (night of 07/10 → 08/10)</h3>
<div class="ref tbl"><table><thead><tr><th>Part</th><th>Result</th></tr></thead><tbody>${CLAUDE_RUNS.en}</tbody></table></div>
<h3 class="sub">Big changes since the 06/10 sheet</h3>
<ul class="prep">
<li><b>6 stages</b> are on: Not started → New lead → Engaged → Offer → Onboarding → Joined → Onboarded (table in case A).</li>
<li>LO detail: a row opens <b>Quick view</b>; <b>Open full profile</b> opens <code>/candidates/&lt;id&gt;</code> (no more drawer).</li>
<li>Home renamed <b>My work today</b>; tiles <b>To contact</b> / <b>Never contacted</b>; no “Another day” group.</li>
<li>“My invites” → <b>My hand-offs</b>, one row per LO, 10-segment progress bar.</li>
<li>Offer modal predicts the 5/2 rule; manager approves in one step; short buttons [Approve] / [Approve · charge $100] / [Approve · waive $100].</li>
<li><b>Send to HR is automatic</b> on Joined; missing fields raise “Missing for HR”.</li>
<li>After Joined: <b>Onboarding progress</b> card (HR account / HR to-do / HR docs / Licensing / setup call) → auto <b>Onboarded</b>.</li>
<li>Department work → <b>Team queue</b> (Mine / Everyone / Needs owner, search, Assigned to). Sponsorships / Licensing rules screens removed.</li>
<li>Call again refuses past times; No answer lists retry dates, weekends move to Monday; Send info “Save &amp; send”.</li>
<li>Referrals are <b>ON</b> on staging (My referrals, Referrals by referrer).</li></ul>`; } } },

  { id: "accounts", code: "0", nav: { vi: "Tài khoản & đăng nhập", en: "Accounts & sign-in" }, title: { vi: "Tài khoản test và đăng nhập", en: "Test accounts and sign-in" }, body: {
    get vi() { return `${accTable()}<div class="callout warn" style="margin-top:10px">${PW_NOTE.vi}</div>
<ul class="prep" style="margin-top:10px"><li>Onboarding được hệ chia luân phiên giữa 3 tài khoản: <code>bao.trinh@loanfactory.com</code>, <code>bao.trinh+onb-test@loanfactory.com</code>, <code>bao.trinh+onb-test@viet18.com</code>. Bảng LO ghi rõ ai giữ LO nào. LO của tài khoản <code>@viet18.com</code>: dùng <code>bao.trinh+onb-test@loanfactory.com</code> và xác nhận “làm thay”.</li>
<li>Menu chỉ ẩn theo vai; trang cần quyền riêng (Settings, Permissions, Team queue…) gõ thẳng sẽ về My work today.</li>
<li>Trang khác: đăng ký LO <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · đăng nhập chung <code>account.viet18.com</code> · MOSO <code>www.viet18.com/lo_recruiting</code>.</li></ul>`; },
    get en() { return `${accTable()}<div class="callout warn" style="margin-top:10px">${PW_NOTE.en}</div>
<ul class="prep" style="margin-top:10px"><li>Onboarding is assigned round-robin across 3 accounts: <code>bao.trinh@loanfactory.com</code>, <code>bao.trinh+onb-test@loanfactory.com</code>, <code>bao.trinh+onb-test@viet18.com</code>. The LO table shows who holds which LO. For LOs of the <code>@viet18.com</code> account use <code>bao.trinh+onb-test@loanfactory.com</code> and confirm “on behalf”.</li>
<li>Menus only hide by role; pages that need a grant (Settings, Permissions, Team queue…) redirect to My work today when typed directly.</li>
<li>Other sites: LO registration <code>www.viet18.com/register-loan-officer</code> · HR <code>hr.viet18.com</code> · sign-in <code>account.viet18.com</code> · MOSO <code>www.viet18.com/lo_recruiting</code>.</li></ul>`; } } },

  { id: "data", code: "LO", nav: { vi: "Bộ LO tạo sẵn", en: "Prepared LOs" }, title: { vi: "Bộ LO giả đã tạo sẵn (của Bảo)", en: "Prepared fake LOs (Bao's set)" }, body: {
    get vi() { return `<p class="intro">Claude tạo đêm 07/10 qua đúng API của từng trang đăng ký, rồi đẩy tới giai đoạn ghi ở cột “Trạng thái tạo sẵn”. Email đều về hộp <code>bao.trinh@loanfactory.com</code>. Dòng ghi “chưa tạo” là dữ liệu chừa sẵn để anh tự gõ trên form. Mỗi case bên dưới lặp lại đúng các dòng nó cần. Sau này thêm người test: tạo bộ riêng với đuôi email khác (vd <code>+v08…</code>) để không đụng nhau.</p>${loTable(LOS.map(l => l.id))}`; },
    get en() { return `<p class="intro">Created by Claude on the night of 07/10 through each registration page's own API, then moved to the stage in “Prepared state”. All mail goes to <code>bao.trinh@loanfactory.com</code>. Rows marked “not created” are reserved data for you to type on the form. Each case below repeats the rows it needs. Future testers get their own set with a different email tag (e.g. <code>+v08…</code>) so nobody collides.</p>${loTable(LOS.map(l => l.id))}`; } } },

  { id: "bugs", code: "!", nav: { vi: "Lỗi & phát hiện", en: "Bugs & findings" }, title: { vi: "Lỗi đã biết và phát hiện mới", en: "Known bugs and new findings" }, body: {
    get vi() { return `<p class="intro">Gặp triệu chứng trong bảng là dự kiến — đánh Lỗi kèm mã để xác nhận còn, làm theo cột cuối.</p><div class="ref tbl"><table><thead><tr><th>Mã</th><th>Triệu chứng</th><th>Ghi chú / đi vòng</th></tr></thead><tbody>${BUGS.map(b => `<tr><td class="mono">${esc(b[0])}</td><td>${b[1].vi}</td><td>${b[2].vi}</td></tr>`).join("")}</tbody></table></div>`; },
    get en() { return `<p class="intro">Symptoms in this table are expected — mark Fail with the id to confirm it is still there, then follow the last column.</p><div class="ref tbl"><table><thead><tr><th>Id</th><th>Symptom</th><th>Note / workaround</th></tr></thead><tbody>${BUGS.map(b => `<tr><td class="mono">${esc(b[0])}</td><td>${b[1].en}</td><td>${b[2].en}</td></tr>`).join("")}</tbody></table></div>`; } } },

  { id: "ref-res", code: "≡", nav: { vi: "Hướng dẫn chung", en: "Shared how-tos" }, title: { vi: "Hướng dẫn chung (cũng có sẵn trong từng case)", en: "Shared how-tos (also repeated in each case)" }, body: {
    get vi() { return ["stages", "paypal", "sign", "inbox", "hrapp", "time", "settings", "sms", "google"].map(k => `<details class="ref" style="margin-bottom:8px"><summary><b>${T(RES[k].title)}</b></summary><div style="margin-top:8px">${RES[k].body.vi}</div></details>`).join(""); },
    get en() { return ["stages", "paypal", "sign", "inbox", "hrapp", "time", "settings", "sms", "google"].map(k => `<details class="ref" style="margin-bottom:8px"><summary><b>${RES[k].title.en}</b></summary><div style="margin-top:8px">${RES[k].body.en}</div></details>`).join(""); } } }
];
