// ---------- shared data ----------
const META = { env: { vi: "STAGING · bản 10/10: recruit-be c0db3260 · recruit-fe 986569f0 (cả hai đã lên production 10/10 ~02:30 VN) · 6 stage BẬT · Inkless BẬT", en: "STAGING · as of 10/10: recruit-be c0db3260 · recruit-fe 986569f0 (both promoted to production 10/10 ~02:30 VN) · 6 stages ON · Inkless ON" } };

const WHO = {
  LO: { vi: "LO (bạn, không đăng nhập)", en: "LO (you, no login)" },
  REC: { vi: "Recruiter", en: "Recruiter" }, REC2: { vi: "Recruiter thứ hai", en: "Second recruiter" }, RECSMS: { vi: "Recruiter có Zoom", en: "Recruiter with Zoom" },
  MGR: { vi: "Manager", en: "Manager" }, ONB: { vi: "Onboarding", en: "Onboarding" }, ONBG: { vi: "Onboarding có Google", en: "Onboarding with Google" },
  HH: { vi: "Headhunter", en: "Headhunter" }, ADMIN: { vi: "Admin", en: "Admin" }, HR: { vi: "HR (HR app)", en: "HR (HR app)" },
  ANY: { vi: "Mọi vai", en: "Any role" }, DEV: { vi: "Nhờ dev / Claude", en: "Ask dev / Claude" },
  TL: { vi: "Team lead", en: "Team lead" }, OFR: { vi: "Officer recruiter", en: "Officer recruiter" }, LOS: { vi: "LO support", en: "LO support" },
  RHR: { vi: "HR (vai recruit)", en: "HR (recruit role)" }, LIC: { vi: "Licensing", en: "Licensing" }, ACCT: { vi: "Accounting", en: "Accounting" },
  ONBP: { vi: "Onboarding thuần", en: "Pure Onboarding" }, NG: { vi: "Đăng nhập, không có quyền recruit", en: "Signed in, no recruit grant" }
};

const ACC = {
  rec: { email: "bao.trinh+recruiter@loanfactory.com", label: WHO.REC,
    use: { vi: "“QA Test Recruiter”. Recruiter chính cho hầu hết case. Có branch MOSO. Không có Zoom nên không gửi SMS / gọi Zoom được.", en: "“QA Test Recruiter”. Main recruiter for most cases. Has a MOSO branch. No Zoom, so no SMS / Zoom calls." } },
  recSms: { email: "manhadmin@viet18.com", label: WHO.RECSMS,
    use: { vi: "“Manh Admin”. Recruiter duy nhất có Zoom (gửi SMS, gọi Zoom — đường dây (408) 538-1464 trên Mac). Luôn giữ vai RECRUITER. Chủ LO TRINH VU TRONG BAO. Dùng cho case G, Y, OM9 và làm recruiter thứ hai (case I, Y3).", en: "“Manh Admin”. The only recruiter with Zoom (SMS, Zoom calls — line (408) 538-1464 on the Mac). Always stays RECRUITER. Owns LO TRINH VU TRONG BAO. Use for cases G, Y, OM9 and as the second recruiter (I, Y3)." } },
  mgr: { email: "bao.trinh+manager@loanfactory.com", label: WHO.MGR,
    use: { vi: "“QA Test Manager”. Duyệt offer ở My work today → “Waiting on your decision”, Exceptions, Remind, Take back, Reassign, Audit, Duplicates, Dormant → Revive, gán specialist. Không có MOSO Admin (ghi sang MOSO bằng tài khoản này có thể 401 — staging có thử lại bằng tài khoản hệ thống, m4eyx).", en: "“QA Test Manager”. Approves offers on My work today → “Waiting on your decision”, Exceptions, Remind, Take back, Reassign, Audit, Duplicates, Dormant → Revive, assigns specialists. No MOSO Admin (MOSO writes from it may 401 — staging retries as system, m4eyx)." } },
  onb: { email: "bao.trinh+onb-test@loanfactory.com", label: WHO.ONB,
    use: { vi: "Onboarding specialist “ONB Test Specialist LF”: Team queue, 1-1, Done…, tick tiến độ, nhắn LO của chính mình (OM4). Không nối được Google (alias có dấu +).", en: "Onboarding specialist “ONB Test Specialist LF”: Team queue, 1-1, Done…, progress ticks, messaging its own LOs (OM4). Cannot connect Google (+ alias)." } },
  onbG: { email: "bao.trinh@loanfactory.com", label: { vi: "Recruiter + Onboarding (tài khoản thật của anh)", en: "Recruiter + Onboarding (your real account)" },
    use: { vi: "Tài khoản DUY NHẤT nối được Google → Meet tự tạo (case J-G). Cũng là Onboarding đang hoạt động trong MOSO nên có thể được gán làm specialist.", en: "The ONLY account that can connect Google → auto Meet (case J-G). Also an active MOSO onboarding specialist, so it may be auto-assigned." } },
  hh: { email: "bao.trinh+hh@loanfactory.com", label: WHO.HH,
    use: { vi: "“HH Test Headhunter”, vai chương trình LO Recruiter: chỉ thấy lead của mình; trang /join/bao-trinhhh; người giới thiệu cho W10 (My referrals).", en: "“HH Test Headhunter”, LO Recruiter program role: sees only its own leads; page /join/bao-trinhhh; the referrer for W10 (My referrals)." } },
  admin: { email: "chauchau.inc@gmail.com", label: { vi: "Admin recruit + HR + MOSO staging", en: "Recruit Admin + HR + MOSO staging" },
    use: { vi: "“Chau Chau” — admin mọi app staging: recruit ADMIN (Settings, Permissions), HR app <code>hr.viet18.com</code> (tạo nhân viên), MOSO admin <code>www.viet18.com</code> (Interested LOs → Status, Email History).", en: "“Chau Chau” — admin of every staging app: recruit ADMIN (Settings, Permissions), HR app <code>hr.viet18.com</code> (create associates), MOSO admin <code>www.viet18.com</code> (Interested LOs → Status, Email History)." } }
};

// 10/10 role accounts (created on staging by the orchestrator; case AB checks them before use)
Object.assign(ACC, {
  roleTl: { email: "bao.trinh+role-teamlead@loanfactory.com", label: WHO.TL, use: { vi: "Vai TEAM_LEAD (phạm vi ORIGIN_TEAM: lead của mình + lead do team thu về). Staging chưa có thành viên chương trình nào có khoá team lead → phần “lead của team” có thể không kiểm được (AD6).", en: "TEAM_LEAD role (ORIGIN_TEAM scope: own leads + leads collected by the team). No staging program member has a team-lead key yet → the “team leads” part may not be testable (AD6)." } },
  roleOfr: { email: "bao.trinh+role-officer@loanfactory.com", label: WHO.OFR, use: { vi: "Vai OFFICER_RECRUITER: như Recruiter nhưng không có Hot leads và không xác nhận tên pháp lý.", en: "OFFICER_RECRUITER role: like Recruiter but no Hot leads and no legal-name confirm." } },
  roleLos: { email: "bao.trinh+role-losupport@loanfactory.com", label: WHO.LOS, use: { vi: "Vai LO_SUPPORT: như Recruiter nhưng không có Cold list và không xác nhận tên pháp lý.", en: "LO_SUPPORT role: like Recruiter but no Cold list and no legal-name confirm." } },
  roleHr: { email: "bao.trinh+role-hr@loanfactory.com", label: WHO.RHR, use: { vi: "Vai HR trong recruit (KHÔNG phải HR app): tick việc phòng HR trong checklist.", en: "HR role inside recruit (NOT the HR app): ticks HR department checklist items." } },
  roleLic: { email: "bao.trinh+role-licensing@loanfactory.com", label: WHO.LIC, use: { vi: "Vai LICENSING: tick việc phòng Licensing.", en: "LICENSING role: ticks Licensing department items." } },
  roleAcc: { email: "bao.trinh+role-accounting@loanfactory.com", label: WHO.ACCT, use: { vi: "Vai ACCOUNTING: Team queue mở ở phòng Accounting.", en: "ACCOUNTING role: Team queue opens on Accounting." } },
  roleOnb: { email: "bao.trinh+role-onb@loanfactory.com", label: WHO.ONBP, use: { vi: "Onboarding THUẦN (chỉ một vai ONBOARDING, không vai nào khác) — dùng cho các bước “Onboarding bị chặn”. Không phải specialist của LO nào cho tới khi được gán.", en: "PURE Onboarding (only the ONBOARDING role) — for “Onboarding is blocked” steps. Not anyone's specialist until assigned." } },
  roleNg: { email: "bao.trinh+role-nogrant@loanfactory.com", label: WHO.NG, use: { vi: "Có tài khoản đăng nhập chung nhưng KHÔNG có quyền recruit nào (như người giới thiệu / ambassador).", en: "Has a shared sign-in account but NO recruit grant (like a referrer / ambassador)." } }
});

// which account each role signs in with (a step may override with .as = ACC key or {vi,en})
const LOGIN = { REC: "rec", REC2: "recSms", RECSMS: "recSms", MGR: "mgr", ONB: "onb", ONBG: "onbG", HH: "hh", ADMIN: "admin", HR: "admin",
  TL: "roleTl", OFR: "roleOfr", LOS: "roleLos", RHR: "roleHr", LIC: "roleLic", ACCT: "roleAcc", ONBP: "roleOnb", NG: "roleNg" };

const PW_NOTE = {
  vi: "Mật khẩu: <b>trong file tài khoản test / hỏi Bao</b> (trang này không bao giờ ghi mật khẩu). Quên mật khẩu: <code>account.viet18.com</code> → <b>Forgot password?</b> → nhập đúng email đó (thư về hộp <code>bao.trinh@loanfactory.com</code>). Alias có dấu <code>+</code> KHÔNG đăng nhập Google được.",
  en: "Password: <b>in the test-accounts file / ask Bao</b> (this page never shows passwords). Forgot it: <code>account.viet18.com</code> → <b>Forgot password?</b> → type that exact email (mail goes to <code>bao.trinh@loanfactory.com</code>). <code>+</code> aliases cannot use Google sign-in."
};

const RES = {
  loginShort: { title: { vi: "Đăng nhập", en: "Sign in" }, body: {
    vi: "Mở <code>recruit.viet18.com</code> → tự chuyển sang <code>account.viet18.com</code> → nhập đúng email ghi ở bước + mật khẩu → <b>Sign in</b> → về <b>My work today / Việc hôm nay của tôi</b>. Đổi người: góc trên phải (khối tên) → <b>Sign out</b>. Hai vai cùng lúc = 2 profile Chrome (hoặc 1 thường + 1 ẩn danh), KHÔNG dùng 2 tab cùng cửa sổ. Đổi ngôn ngữ chỉ có ở trang đăng nhập (nút <b>Change language / Đổi ngôn ngữ</b>). " + PW_NOTE.vi,
    en: "Open <code>recruit.viet18.com</code> → redirects to <code>account.viet18.com</code> → the exact email named in the step + password → <b>Sign in</b> → lands on <b>My work today</b>. Switch person: top right (name block) → <b>Sign out</b>. Two roles at once = 2 Chrome profiles (or normal + incognito), NOT two tabs in one window. The language switch only exists on the sign-in page (<b>Change language</b>). " + PW_NOTE.en } },

  paypal: { title: { vi: "💳 Trả phí $100 bằng PayPal sandbox (đủ từng bước)", en: "💳 Pay the $100 fee with PayPal sandbox (every step)" }, body: {
    vi: `<ol class="prep">
<li>Mở <b>link của LO</b> (cột “Link của LO (?key)” trong bảng LO, hoặc link trong email “Loan Factory Onboarding: Complete These Initial Steps”) bằng cửa sổ ẩn danh.</li>
<li>Bước <b>Paying One-Time Startup Fee $100</b> → nút <b>Debit or Credit Card</b> (mở popup PayPal).</li>
<li>Country: <b>United States</b>.</li>
<li>Card number <code>4032033814197955</code>${cp("4032033814197955")} · Expires <code>12/30</code>${cp("12/30")} · CVV <code>123</code>${cp("123")}</li>
<li>First / Last name = tên LO (chỉ chữ cái, ví dụ <code>QA Amain</code>).</li>
<li>Billing: <code>123 Test Street</code>${cp("123 Test Street")} · <code>Dallas</code> · State <b>Texas</b> · ZIP <code>75201</code>${cp("75201")} · Mobile <code>4085550100</code>${cp("4085550100")} · Email = email LO.</li>
<li><b>TẮT</b> công tắc “Save info &amp; create your PayPal account” (mặc định đang BẬT).</li>
<li>Bấm <b>Pay now</b> / “Continue as guest”. Nếu PayPal báo “We can't verify your address” → chọn <b>Use the address you entered</b> → <b>Continue</b>.</li>
<li>Kết quả đúng: trang LO hiện <b>Payment successful</b>. Recruit ghi <b>Paid</b> trong ~1 phút.</li></ol>
<div class="meta">Thẻ 4111…/5555… bị PayPal từ chối (dùng cho case thẻ sai). Cần thẻ khác: developer.paypal.com → Testing tools → Credit card generator (Visa, US).</div>`,
    en: `<ol class="prep">
<li>Open the <b>LO's link</b> (“LO's link (?key)” column in the LO table, or the link in the email “Loan Factory Onboarding: Complete These Initial Steps”) in an incognito window.</li>
<li>Step <b>Paying One-Time Startup Fee $100</b> → <b>Debit or Credit Card</b> (opens the PayPal popup).</li>
<li>Country: <b>United States</b>.</li>
<li>Card number <code>4032033814197955</code>${cp("4032033814197955")} · Expires <code>12/30</code>${cp("12/30")} · CVV <code>123</code>${cp("123")}</li>
<li>First / Last name = the LO's name (letters only, e.g. <code>QA Amain</code>).</li>
<li>Billing: <code>123 Test Street</code>${cp("123 Test Street")} · <code>Dallas</code> · State <b>Texas</b> · ZIP <code>75201</code>${cp("75201")} · Mobile <code>4085550100</code>${cp("4085550100")} · Email = the LO's email.</li>
<li>Turn <b>OFF</b> “Save info &amp; create your PayPal account” (it is ON by default).</li>
<li>Click <b>Pay now</b> / “Continue as guest”. If PayPal says “We can't verify your address” → <b>Use the address you entered</b> → <b>Continue</b>.</li>
<li>Correct result: the LO page shows <b>Payment successful</b>. Recruit shows <b>Paid</b> within ~1 minute.</li></ol>
<div class="meta">Cards 4111…/5555… are refused by PayPal (use them for the bad-card case). Need another card: developer.paypal.com → Testing tools → Credit card generator (Visa, US).</div>` } },

  sign: { title: { vi: "✍️ Ký thoả thuận bằng Inkless (staging đã BẬT Inkless từ 08/10 18:30)", en: "✍️ Sign the agreement in Inkless (staging Inkless ON since 08/10 18:30)" }, body: {
    vi: `<ol class="prep"><li>Sau khi trả phí: trên trang LO bấm <b>Next</b> → bước <b>Review and Sign agreement</b>. Trang ghi “You are tentatively classified as: Outside Loan Officer (W-2)” (hoặc “Independent Loan Officer (1099)”).</li>
<li>Bấm <b>Click Here to Sign Documents</b> → mở tab mới <b>Inkless</b> (tài liệu demo, thanh trên ghi “0 of 5 Completed”).</li>
<li>Bấm <b>I Accept</b> → <b>START</b> → trang tự cuộn tới ô vàng <b>SIGN</b> đầu tiên → bấm ô đó.</li>
<li>Lần đầu hiện hộp <b>Create your signature</b>: gõ tên LO (vd <code>QA Tenmain</code>) → <b>Set Signature</b>. Các ô SIGN sau chỉ cần bấm (đã có chữ ký); nếu ô không tự nhảy, bấm <b>NEXT</b> ở thanh bên phải.</li>
<li>Khi đủ “5 of 5 Completed” → bấm <b>FINISH</b> → <b>Complete Signing</b>.</li>
<li>1099: hợp đồng còn bắt gõ <b>ngày hiệu lực</b> (gõ ngày hôm nay, dạng <code>10/10/2026</code>) và <b>địa chỉ nhận thông báo</b> (<code>123 Test Street, Dallas, TX 75201</code>) — bỏ trống thì “This input is required” (F-16).</li>
<li>Kết quả đúng: Inkless báo hoàn tất. Recruit ghi <b>Signed</b> và tự lên <b>Joined</b> trong ~1 phút (nếu đã trả phí hoặc được miễn). Nếu MOSO đã ký mà recruit vẫn chưa: cron đối soát chạy mỗi 20 phút (phút :00/:20/:40) sẽ tự sửa.</li></ol>
<div class="meta">Ký dở rồi đóng tab → mở lại phải ký lại từ đầu (F-14). Nút “gửi lại thoả thuận” trong recruit chỉ gửi được tới 5 email allowlist (onb-welcome1/2, agree1/2/3) — xem V5.</div>`,
    en: `<ol class="prep"><li>After paying: on the LO page click <b>Next</b> → step <b>Review and Sign agreement</b>. It says “You are tentatively classified as: Outside Loan Officer (W-2)” (or “Independent Loan Officer (1099)”).</li>
<li>Click <b>Click Here to Sign Documents</b> → a new <b>Inkless</b> tab (demo document, top bar “0 of 5 Completed”).</li>
<li><b>I Accept</b> → <b>START</b> → it scrolls to the first yellow <b>SIGN</b> box → click it.</li>
<li>The first time, <b>Create your signature</b> appears: type the LO's name (e.g. <code>QA Tenmain</code>) → <b>Set Signature</b>. Later SIGN boxes just need a click; if it doesn't jump, click <b>NEXT</b> in the right sidebar.</li>
<li>At “5 of 5 Completed” → <b>FINISH</b> → <b>Complete Signing</b>.</li>
<li>1099: the agreement also asks for the <b>effective date</b> (type today, e.g. <code>10/10/2026</code>) and a <b>notice address</b> (<code>123 Test Street, Dallas, TX 75201</code>) — blank gives “This input is required” (F-16).</li>
<li>Correct result: Inkless says it's complete. Recruit shows <b>Signed</b> and moves to <b>Joined</b> within ~1 min (if paid or waived). If MOSO is signed but recruit isn't: the reconcile cron every 20 min (:00/:20/:40) heals it.</li></ol>
<div class="meta">Closing half-way and reopening restarts the signing (F-14). The recruit “resend agreement” only reaches 5 allowlisted emails (onb-welcome1/2, agree1/2/3) — see V5.</div>` } },

  inbox: { title: { vi: "📬 Email của LO về đâu, chờ bao lâu", en: "📬 Where LO emails arrive, how long to wait" }, body: {
    vi: `<ul class="prep"><li>Mọi email LO giả dạng <code>bao.trinh+…@loanfactory.com</code> về hộp <b>bao.trinh@loanfactory.com</b>. Nhìn dòng <b>To</b>. Gmail: tìm <code>to:bao.trinh+t10a1@loanfactory.com</code>. <b>Luôn xem cả thư mục Spam</b>.</li>
<li>Offer được duyệt: LO <b>KHÔNG</b> nhận email (offer chuyển cho Onboarding). Email đầu tiên LO nhận: <b>“Loan Factory Onboarding: Complete These Initial Steps”</b> — sau khi Onboarding bấm <b>Mark meeting done</b> buổi 1-1. Trễ 5–30 phút (hàng gửi MOSO chạy mỗi 5 phút + MOSO gửi mail).</li>
<li>Email nhắc lịch 1-1 (2 ngày / 1 ngày / 2 giờ trước giờ họp, cron mỗi 5 phút) và lời mời Google: CHỈ tới khách trong allowlist (vd <code>bao.trinh+a3009f@loanfactory.com</code> = LO “QA Anewe”). Trên staging thư nhắc đi qua Mailgun <code>mg.viet18.com</code> và hay rơi vào <b>Spam</b> (crfc1, DMARC); production dùng SendGrid.</li>
<li>Email gửi từ hội thoại recruit (Omni) trên staging: tới được hộp mail.tm (đã đo 08/10); với hộp Gmail alias thì có thể không tới. “Sent ✓” chỉ nghĩa là nhà gửi đã nhận.</li>
<li>Email Welcome / Activate sau khi HR tạo nhân viên: MOSO staging <b>TẠO</b> email (Email History có “Welcome to Chau Chau Inc…”) nhưng <b>cố ý không gửi</b> vì người gửi là <code>@test.com</code> → chỉ kiểm trong MOSO Email History (V3/M7).</li></ul>`,
    en: `<ul class="prep"><li>Every fake LO email <code>bao.trinh+…@loanfactory.com</code> lands in <b>bao.trinh@loanfactory.com</b>. Check the <b>To</b> line. Gmail search: <code>to:bao.trinh+t10a1@loanfactory.com</code>. <b>Always check Spam too</b>.</li>
<li>Offer approved: the LO gets <b>NO</b> email (the offer goes to Onboarding). The LO's first email is <b>“Loan Factory Onboarding: Complete These Initial Steps”</b> — after Onboarding clicks <b>Mark meeting done</b> for the 1-1. 5–30 min delay (MOSO queue every 5 min + MOSO mail).</li>
<li>1-1 reminder emails (2 days / 1 day / 2 hours before, 5-min cron) and Google invites reach ONLY allowlisted guests (e.g. <code>bao.trinh+a3009f@loanfactory.com</code> = LO “QA Anewe”). On staging reminders go through Mailgun <code>mg.viet18.com</code> and often land in <b>Spam</b> (crfc1, DMARC); production uses SendGrid.</li>
<li>Email from the recruit conversation (Omni) on staging reached a mail.tm inbox (08/10); a Gmail alias may not receive it. “Sent ✓” only means the provider accepted it.</li>
<li>Welcome / Activate after HR creates the employee: MOSO staging <b>CREATES</b> it (Email History “Welcome to Chau Chau Inc…”) but <b>deliberately doesn't send</b> because the sender is <code>@test.com</code> → check MOSO Email History only (V3/M7).</li></ul>` } },

  hrapp: { title: { vi: "🏢 HR app: tạo nhân viên từ bản nháp recruit + kiểm NMLS", en: "🏢 HR app: create the employee from the recruit draft + check NMLS" }, body: {
    vi: `<ol class="prep"><li>Đăng nhập <code>hr.viet18.com</code> bằng <code>chauchau.inc@gmail.com</code>${cp("chauchau.inc@gmail.com")} (admin mọi app; hoặc tài khoản HR anh đang dùng). Nếu hiện tour trợ lý HR → <b>Skip</b>.</li>
<li>Menu <b>People → Associates → Add associate</b> (trang <b>New hires</b>). Tìm tên LO (danh sách ghi kiểu “Họ Tên”, vd “Tenmain QA”) có chip <b>Recruit</b>, “Still needed: …”.</li>
<li><b>Review</b> → đi 4 bước. Kiểm tên, email, SĐT, địa chỉ, <b>NMLS</b>, loại LO, bang, loại hợp đồng đã điền sẵn.</li>
<li><b>Work email</b>: email chưa ai dùng, quy tắc <code>qa.&lt;tên LO viết thường&gt;1010@loanfactory.com</code>, vd <code>qa.tenmain1010@loanfactory.com</code>.</li>
<li><b>Licence</b>: bấm thêm dòng → bang <b>TX</b> → loại <b>Mortgage Company License</b> → ngày hết hạn <code>12/31/2026</code>. (Danh mục TX chỉ có 3 loại công ty — 8ecq0.)</li>
<li>Review: “Everything required is filled in.” → <b>Create associate</b> → toast <b>Associate created</b>.</li>
<li>Vài giây sau, recruit (hồ sơ LO → <b>Activity / Hoạt động</b>) có dòng <b>HR created the employee account</b> và bước <b>HR account / Tài khoản HR</b> trong thẻ Onboarding progress thành Done.</li>
<li><b>Kiểm NMLS bên HR (M2)</b>: HR → <b>People → Associates</b> → ô tìm gõ email cá nhân của LO (vd <code>bao.trinh+t10a1@loanfactory.com</code>) → mở → tab <b>Business information</b> → ô <b>NMLS NUMBER</b> phải = NMLS trong recruit (vd <code>9931202</code>). Staging đã sửa (ai-hr-be #1030 + user-service #59/#60/#61 — user-service mới chỉ ở staging).</li></ol>`,
    en: `<ol class="prep"><li>Sign in to <code>hr.viet18.com</code> as <code>chauchau.inc@gmail.com</code>${cp("chauchau.inc@gmail.com")} (admin of every app; or the HR account you use). If the HR assistant tour shows → <b>Skip</b>.</li>
<li><b>People → Associates → Add associate</b> (<b>New hires</b> page). Find the LO (listed “Last First”, e.g. “Tenmain QA”) with chip <b>Recruit</b>, “Still needed: …”.</li>
<li><b>Review</b> → go through 4 steps. Check name, email, phone, address, <b>NMLS</b>, LO type, state, contract type are prefilled.</li>
<li><b>Work email</b>: an unused address, rule <code>qa.&lt;lowercase LO name&gt;1010@loanfactory.com</code>, e.g. <code>qa.tenmain1010@loanfactory.com</code>.</li>
<li><b>Licence</b>: add a row → state <b>TX</b> → type <b>Mortgage Company License</b> → expiry <code>12/31/2026</code>. (The TX catalogue only has 3 company types — 8ecq0.)</li>
<li>Review: “Everything required is filled in.” → <b>Create associate</b> → toast <b>Associate created</b>.</li>
<li>Seconds later, recruit (LO profile → <b>Activity</b>) shows <b>HR created the employee account</b> and the <b>HR account</b> step of the Onboarding progress card turns Done.</li>
<li><b>Check NMLS in HR (M2)</b>: HR → <b>People → Associates</b> → search the LO's personal email (e.g. <code>bao.trinh+t10a1@loanfactory.com</code>) → open → <b>Business information</b> tab → <b>NMLS NUMBER</b> must equal the recruit NMLS (e.g. <code>9931202</code>). Fixed on staging (ai-hr-be #1030 + user-service #59/#60/#61 — user-service is staging-only so far).</li></ol>` } },

  time: { title: { vi: "🕐 Giờ giấc của hệ (đọc trước khi test SLA / lịch)", en: "🕐 System clock (read before SLA / scheduling tests)" }, body: {
    vi: `<ul class="prep"><li>Giờ làm việc (recruit-be V241, #607): <b>08:00–17:00 giờ Pacific (America/Los_Angeles), thứ 2–6</b>. Hiện giờ PDT: VN = Pacific + 14 giờ → giờ làm việc = <b>22:00 hôm đó → 07:00 sáng hôm sau giờ VN</b> (từ 02/11, PST: +15 giờ → 23:00–08:00). Kiểm giá trị đang dùng: Admin → <b>Settings / Thông số</b> → mục <b>Business hours / Giờ làm việc</b> (Opens / Closes / Working days, “Timezone: America/Los_Angeles”). Ngoài giờ, đồng hồ SLA đứng yên. Thứ 2 12/10/2026 là ngày lễ (Columbus Day) — không tính.</li>
<li>“Hôm nay” của hệ = ngày ở Los Angeles: sang ngày mới lúc <b>14:00 giờ VN</b> (15:00 từ 02/11). Ảnh hưởng: nhóm Overdue / Later today, ngày mặc định ở modal Done 1-1, bộ lọc ngày.</li>
<li>Quy tắc chọn giờ hẹn: “ngày làm việc kế tiếp, 10:00 AM Pacific” = <b>00:00 giờ VN của ngày hôm sau ngày đó</b> (vd thứ 3 13/10 10:00 PT = 00:00 VN thứ 4 14/10). Modal hẹn ghi “Start time (your time zone: …)” — gõ theo giờ VN của máy anh, dòng phụ hiện giờ LA để đối chiếu.</li>
<li>VN đặt follow-up “ngày mai 7:00” = 17:00 hôm nay ở California → nằm ở nhóm <b>Later today / Muộn hơn trong ngày</b> (đúng thiết kế).</li></ul>`,
    en: `<ul class="prep"><li>Business hours (recruit-be V241, #607): <b>08:00–17:00 Pacific (America/Los_Angeles), Mon–Fri</b>. During PDT Vietnam = Pacific + 14 h → business hours = <b>22:00 that day → 07:00 next morning Vietnam time</b> (from 02/11, PST: +15 h → 23:00–08:00). Check the live value: Admin → <b>Settings</b> → <b>Business hours</b> (Opens / Closes / Working days, “Timezone: America/Los_Angeles”). Outside them the SLA clock stops. Monday 12/10/2026 is a holiday (Columbus Day).</li>
<li>The system's “today” is the Los Angeles date: it rolls over at <b>14:00 Vietnam</b> (15:00 from 02/11). Affects Overdue / Later today, the Done 1-1 default date, date filters.</li>
<li>Picking a meeting time: “next business day, 10:00 AM Pacific” = <b>00:00 Vietnam on the following day</b> (e.g. Tue 13/10 10:00 PT = 00:00 VN Wed 14/10). The modal says “Start time (your time zone: …)” — type it in your Vietnam time; the sub-line shows LA time to compare.</li>
<li>A follow-up set from Vietnam for “tomorrow 7:00” = 17:00 today in California → shows under <b>Later today</b> (by design).</li></ul>` } },

  cron: { title: { vi: "⏱️ Lịch chạy tự động (cron, giờ UTC, phút cố định)", en: "⏱️ Automatic jobs (cron, UTC, fixed minutes)" }, body: {
    vi: `<div class="tbl"><table><thead><tr><th>Việc</th><th>Chạy lúc</th><th>Chờ bao lâu khi test</th></tr></thead><tbody>
<tr><td>MOSO → recruit (đăng ký mới, trả phí, ký, đổi status MOSO)</td><td>đẩy ngay (webhook)</td><td>~1 phút; đăng ký mới 1–3 phút</td></tr>
<tr><td>Recruit → MOSO (offer/specialist/1-1 done)</td><td>mỗi 5 phút (:00, :05, :10…)</td><td>≤5 phút, rồi MOSO gửi mail 5–30 phút</td></tr>
<tr><td>Send to HR (tự gửi bản nháp)</td><td>mỗi 5 phút</td><td>≤5 phút sau khi Joined</td></tr>
<tr><td>Đối soát “MOSO đã ký” (8r58m #612)</td><td>mỗi 20 phút (:00, :20, :40)</td><td>≤20 phút</td></tr>
<tr><td>Trả lead bỏ quên về kho (chỉ khi BẬT)</td><td>mỗi 5 phút</td><td>tick :00/:05/… — tránh khi đang bật thử</td></tr>
<tr><td>Email nhắc lịch 1-1</td><td>mỗi 5 phút</td><td>2 ngày / 1 ngày / 2 giờ trước giờ họp</td></tr>
<tr><td>Điểm danh Google Meet</td><td>mỗi 5 phút</td><td>sau giờ kết thúc buổi 1-1</td></tr>
<tr><td>Gửi lại tên đồng nghiệp cho Omni (ld7ef #610)</td><td>mỗi 5 phút</td><td>không có màn hình — chỉ dev xem bảng</td></tr>
<tr><td>Đổi Settings</td><td>—</td><td>có hiệu lực sau ≤30 giây</td></tr></tbody></table></div>`,
    en: `<div class="tbl"><table><thead><tr><th>Job</th><th>Runs</th><th>Wait when testing</th></tr></thead><tbody>
<tr><td>MOSO → recruit (new registration, paid, signed, MOSO status change)</td><td>pushed at once (webhook)</td><td>~1 min; new registration 1–3 min</td></tr>
<tr><td>Recruit → MOSO (offer/specialist/1-1 done)</td><td>every 5 min (:00, :05, :10…)</td><td>≤5 min, then MOSO mails in 5–30 min</td></tr>
<tr><td>Send to HR (auto draft)</td><td>every 5 min</td><td>≤5 min after Joined</td></tr>
<tr><td>“Signed in MOSO” reconcile (8r58m #612)</td><td>every 20 min (:00, :20, :40)</td><td>≤20 min</td></tr>
<tr><td>Return idle claimed leads (only when ON)</td><td>every 5 min</td><td>ticks :00/:05/… — avoid them while trying it</td></tr>
<tr><td>1-1 reminder emails</td><td>every 5 min</td><td>2 days / 1 day / 2 hours before the meeting</td></tr>
<tr><td>Google Meet attendance</td><td>every 5 min</td><td>after the 1-1 end time</td></tr>
<tr><td>Teammate-name re-push to Omni (ld7ef #610)</td><td>every 5 min</td><td>no screen — dev reads the table</td></tr>
<tr><td>Settings change</td><td>—</td><td>live within ≤30 s</td></tr></tbody></table></div>` } },

  settings: { title: { vi: "⚙️ Settings: đổi gì, giá trị gốc để TRẢ LẠI", en: "⚙️ Settings: what to change, original values to RESTORE" }, body: {
    vi: `<p>Chỉ Admin (<code>chauchau.inc@gmail.com</code>) vào được <code>recruit.viet18.com/settings</code> (menu <b>Settings / Thông số</b>). Đổi xong <b>đợi 30 giây</b>. Settings là CHUNG cho mọi người test — bấm nút “Tôi đang đổi /settings” ở case để người khác biết, trả lại rồi bấm nhả. Giá trị gốc dưới đây là giá trị seed trong code 10/10 — <b>trước khi đổi, chụp lại giá trị đang hiện</b> và trả về đúng giá trị đó.</p>
<div class="tbl"><table><thead><tr><th>Mục trên Settings (EN / VI)</th><th>Giá trị gốc</th><th>Hạ để test</th></tr></thead><tbody>
<tr><td>Business hours / Giờ làm việc (Opens / Closes / Working days)</td><td><code>08:00</code> – <code>17:00</code>, Mon–Fri, America/Los_Angeles</td><td>KHÔNG đổi — chỉ xem</td></tr>
<tr><td>Hot leads — first-touch deadline · Deadline for Web form</td><td><code>1</code> giờ làm việc</td><td>giữ 1 (chỉ test trong giờ làm việc)</td></tr>
<tr><td>Unclaimed → Exceptions after / Chưa ai nhận → vào Exceptions sau</td><td><code>5</code> phút</td><td><code>1</code> phút</td></tr>
<tr><td>Claimed but not contacted → back to the pool after</td><td><code>4</code> giờ làm việc · Warn before returning <code>1</code></td><td><code>1</code> · cảnh báo <code>0</code></td></tr>
<tr><td>Return idle claimed leads automatically / Tự trả về lead đã nhận mà bỏ quên</td><td><b>TẮT</b></td><td>chỉ bật &lt;1 phút cho W4, giữa hai tick (vd bật :01, tắt trước :05)</td></tr>
<tr><td>Follow-up · No-answer retry ladder</td><td><code>3, 5, 10, 30</code></td><td><code>1</code></td></tr>
<tr><td>Offers · Review deadline for an offer waiting on approval</td><td><code>24</code> giờ</td><td><code>1</code> giờ</td></tr>
<tr><td>Ready to join, invite not sent</td><td><code>2</code> ngày</td><td>giữ</td></tr>
<tr><td>Reminders &amp; notifications · Remind cooldown</td><td><code>60</code> phút</td><td>giữ</td></tr></tbody></table></div>
<div class="meta">Ngưỡng Big producer (5 / 2) KHÔNG có trên màn Settings (chỉ đổi được bằng backend). Bật “Return idle claimed leads automatically” lâu sẽ trả lại MỌI lead quá hạn trên staging — luôn tắt lại và tải lại trang để chắc đã TẮT.</div>`,
    en: `<p>Only Admin (<code>chauchau.inc@gmail.com</code>) can open <code>recruit.viet18.com/settings</code> (menu <b>Settings</b>). After a change <b>wait 30 seconds</b>. Settings are SHARED by all testers — press “I'm changing /settings” on the case, restore, then release. The originals below are the code seed values on 10/10 — <b>note the value shown before you change it</b> and restore exactly that.</p>
<div class="tbl"><table><thead><tr><th>Item on Settings</th><th>Original</th><th>Lower to test</th></tr></thead><tbody>
<tr><td>Business hours (Opens / Closes / Working days)</td><td><code>08:00</code> – <code>17:00</code>, Mon–Fri, America/Los_Angeles</td><td>do NOT change — look only</td></tr>
<tr><td>Hot leads — first-touch deadline · Deadline for Web form</td><td><code>1</code> business hour</td><td>keep 1 (test inside business hours)</td></tr>
<tr><td>Unclaimed → Exceptions after</td><td><code>5</code> min</td><td><code>1</code> min</td></tr>
<tr><td>Claimed but not contacted → back to the pool after</td><td><code>4</code> business hours · Warn before returning <code>1</code></td><td><code>1</code> · warn <code>0</code></td></tr>
<tr><td>Return idle claimed leads automatically</td><td><b>OFF</b></td><td>ON for &lt;1 min only for W4, between two ticks (e.g. on at :01, off before :05)</td></tr>
<tr><td>Follow-up · No-answer retry ladder</td><td><code>3, 5, 10, 30</code></td><td><code>1</code></td></tr>
<tr><td>Offers · Review deadline for an offer waiting on approval</td><td><code>24</code> hours</td><td><code>1</code> hour</td></tr>
<tr><td>Ready to join, invite not sent</td><td><code>2</code> days</td><td>keep</td></tr>
<tr><td>Reminders &amp; notifications · Remind cooldown</td><td><code>60</code> min</td><td>keep</td></tr></tbody></table></div>
<div class="meta">The Big producer thresholds (5 / 2) are NOT on the Settings screen (backend only). Leaving “Return idle claimed leads automatically” ON returns EVERY overdue lead on staging — always switch it off and reload to confirm OFF.</div>` } },

  sms: { title: { vi: "📱 Thiết lập SMS hai chiều", en: "📱 Two-way SMS setup" }, body: {
    vi: `<ul class="prep"><li>Máy vai LO: app <b>Zoom Workplace</b> desktop đăng nhập số <code>(408) 538-1464</code> → Phone → SMS.</li>
<li>Recruiter: <code>manhadmin@viet18.com</code> (tài khoản duy nhất có Zoom) → mở LO có sẵn <b>TRINH VU TRONG BAO</b>: <a href="https://recruit.viet18.com/candidates/07001ba1-360b-491f-b9e1-c1b45766739d" target="_blank" rel="noopener">hồ sơ</a>.</li>
<li>KHÔNG đăng ký LO mới bằng số 1464. KHÔNG nhắn đúng một chữ STOP / END / QUIT / CANCEL / UNSUBSCRIBE từ số 1464 (bị chặn vĩnh viễn trên staging).</li>
<li>Tin giữa 2 số nội bộ có thể mất (jblm) — gửi lại một lần.</li></ul>`,
    en: `<ul class="prep"><li>LO device: <b>Zoom Workplace</b> desktop signed in as <code>(408) 538-1464</code> → Phone → SMS.</li>
<li>Recruiter: <code>manhadmin@viet18.com</code> (the only account with Zoom) → open the existing LO <b>TRINH VU TRONG BAO</b>: <a href="https://recruit.viet18.com/candidates/07001ba1-360b-491f-b9e1-c1b45766739d" target="_blank" rel="noopener">profile</a>.</li>
<li>Do NOT register a new LO with 1464. Do NOT text exactly STOP / END / QUIT / CANCEL / UNSUBSCRIBE from 1464 (permanently blocked on staging).</li>
<li>Messages between two internal lines can be lost (jblm) — resend once.</li></ul>` } },

  google: { title: { vi: "📅 Nối Google (chỉ tài khoản thật của anh)", en: "📅 Connect Google (your real account only)" }, body: {
    vi: `<ol class="prep"><li>Đăng nhập <code>bao.trinh@loanfactory.com</code> → menu <b>Connections</b> (<code>/settings/connections</code>) → <b>Connect Google</b> → đồng ý → <b>Grant Meet access</b> nếu được hỏi.</li>
<li>Lời mời Google + email nhắc chỉ tới khách trong allowlist: LO <code>bao.trinh+a3009f@loanfactory.com</code> (“QA Anewe”) và email nội bộ @loanfactory.com / @viet18.com.</li></ol>`,
    en: `<ol class="prep"><li>Sign in as <code>bao.trinh@loanfactory.com</code> → <b>Connections</b> (<code>/settings/connections</code>) → <b>Connect Google</b> → allow → <b>Grant Meet access</b> if asked.</li>
<li>Google invites + reminders reach only allowlisted guests: LO <code>bao.trinh+a3009f@loanfactory.com</code> (“QA Anewe”) and internal @loanfactory.com / @viet18.com addresses.</li></ol>` } },

  stages: { title: { vi: "🧭 6 stage hiện tại (đã bật trên staging)", en: "🧭 The 6 stages (ON on staging)" }, body: {
    vi: `<div class="tbl"><table><thead><tr><th>Stage</th><th>Vào khi</th><th>Rời khi</th></tr></thead><tbody>
<tr><td><b>Not started</b> (S0, không có cột)</td><td>LO đăng ký / từ MOSO, chưa ai claim</td><td>Claim / gán → New lead</td></tr>
<tr><td><b>New lead</b> (S1)</td><td>Có người claim</td><td>Kết quả Interested/Neutral, LO trả lời SMS/email, đặt Meet 1-1 → Engaged</td></tr>
<tr><td><b>Engaged</b> (S2)</td><td>Như trên</td><td>Gửi offer (Send to onboarding / Request approval) → Offer</td></tr>
<tr><td><b>Offer</b> (S4)</td><td>Offer chờ duyệt</td><td>Được duyệt (tự động 5/2 hoặc manager) → Onboarding. Tự duyệt thì lướt qua Offer trong 1 giây.</td></tr>
<tr><td><b>Onboarding</b> (S5)</td><td>Offer gửi đi, Onboarding được gán</td><td>Đã ký VÀ (trả phí hoặc miễn) → Joined</td></tr>
<tr><td><b>Joined</b> (S6)</td><td>Như trên</td><td>HR account + HR to-do + HR docs + Licensing xong VÀ setup call Done → Onboarded</td></tr>
<tr><td><b>Onboarded</b> (S7)</td><td>Tự động</td><td>— (là nhân viên)</td></tr></tbody></table></div>
<div class="meta">Tự động chỉ đi tới. Người kéo lùi thì hệ không tự đẩy lên lại cho tới khi có tín hiệu mới. Not interested → Archived (giữ stage).</div>`,
    en: `<div class="tbl"><table><thead><tr><th>Stage</th><th>Enters when</th><th>Leaves when</th></tr></thead><tbody>
<tr><td><b>Not started</b> (S0, no column)</td><td>LO registers / comes from MOSO, nobody claimed</td><td>Claim / assign → New lead</td></tr>
<tr><td><b>New lead</b> (S1)</td><td>Someone claims</td><td>Interested/Neutral result, LO replies SMS/email, Meet 1-1 booked → Engaged</td></tr>
<tr><td><b>Engaged</b> (S2)</td><td>As above</td><td>Offer submitted (Send to onboarding / Request approval) → Offer</td></tr>
<tr><td><b>Offer</b> (S4)</td><td>Offer waiting for approval</td><td>Approved (auto at 5/2 or by a manager) → Onboarding. Auto-approved passes Offer in a second.</td></tr>
<tr><td><b>Onboarding</b> (S5)</td><td>Offer sent, onboarding assigned</td><td>Signed AND (paid or waived) → Joined</td></tr>
<tr><td><b>Joined</b> (S6)</td><td>As above</td><td>HR account + HR to-do + HR docs + Licensing done AND setup call Done → Onboarded</td></tr>
<tr><td><b>Onboarded</b> (S7)</td><td>Automatic</td><td>— (now an employee)</td></tr></tbody></table></div>
<div class="meta">Automatic moves only go forward. A human downgrade blocks auto moves until a newer signal. Not interested → Archived (keeps stage).</div>` } },

  emailReply: { title: { vi: "✉️ Email hai chiều cần Gmail riêng", en: "✉️ Two-way email needs a separate Gmail" }, body: {
    vi: "Alias <code>+</code> không dùng được: khi LO bấm Reply, Gmail gửi từ địa chỉ gốc nên hệ không biết LO nào. Tạo 1 Gmail test riêng (vd <code>lf.qa.lo01@gmail.com</code>), đăng ký đúng MỘT LO bằng Gmail đó ở <code>www.viet18.com/register-loan-officer</code>. Lưu ý omni #349: email từ recruit trên staging thường không tới — nếu không tới sau 30 phút, đánh “Bỏ” và ghi “omni #349”.",
    en: "A <code>+</code> alias does not work: when the LO hits Reply, Gmail sends from the base address so the system cannot tell which LO. Create a separate test Gmail (e.g. <code>lf.qa.lo01@gmail.com</code>) and register exactly ONE LO with it at <code>www.viet18.com/register-loan-officer</code>. Note omni #349: emails from recruit usually do not arrive on staging — if nothing after 30 min, mark “Skip” with “omni #349”." } },
  register: { title: { vi: "🆕 Đăng ký một LO mới (dùng dòng “CHƯA TẠO” của case)", en: "🆕 Register a fresh LO (use the case's “NOT CREATED” row)" }, body: {
    vi: `<ol class="prep"><li>Cửa sổ <b>ẩn danh</b> → <code>www.viet18.com/register-loan-officer</code>${cp("https://www.viet18.com/register-loan-officer")}.</li>
<li>Tick “I acknowledge…” → <b>Next</b>.</li>
<li>Basic info: First name <code>QA</code> · Last name = cột Tên của dòng (chỉ chữ cái, vd <code>Tenmain</code>) · Email, Phone, NMLS = đúng dòng đó (bấm ⧉ để chép).</li>
<li>Citizenship <b>US Citizen</b> · Address <code>123 Test Street</code> · City <code>Dallas</code> · State <b>Texas</b> · ZIP <code>75201</code>.</li>
<li>Licensed states + sponsor state: <b>Texas</b> (trừ khi dòng ghi bang khác). Loan Officer type: <b>Outside (W-2)</b> (trừ khi dòng ghi 1099). Compensation <code>0.5</code>.</li>
<li>Website <b>No</b> + tick ô “I agree to obtain Loan Factory's approval…” · Social media <b>No</b> · “How did you hear about us / referred by” = <b>Google</b> · tick ô xác nhận cuối → <b>Next</b>.</li>
<li>Kết quả đúng: URL có thêm <code>?key=…</code>, trang “You're done for now. We will call you soon…”. <b>Chép URL này vào Nhật ký lần chạy</b> (đây là “link của LO” để trả phí + ký sau).</li>
<li>Trong 1–3 phút LO hiện ở <b>Hot leads / Kho HOT</b> với chip nguồn <b>Web form</b>, stage <b>Not started</b>. Tìm nhanh: ô tìm đầu trang “Search candidates, NMLS, companies…” gõ NMLS.</li></ol>`,
    en: `<ol class="prep"><li><b>Incognito</b> window → <code>www.viet18.com/register-loan-officer</code>${cp("https://www.viet18.com/register-loan-officer")}.</li>
<li>Tick “I acknowledge…” → <b>Next</b>.</li>
<li>Basic info: First name <code>QA</code> · Last name = the row's Name column (letters only, e.g. <code>Tenmain</code>) · Email, Phone, NMLS = that row (click ⧉ to copy).</li>
<li>Citizenship <b>US Citizen</b> · Address <code>123 Test Street</code> · City <code>Dallas</code> · State <b>Texas</b> · ZIP <code>75201</code>.</li>
<li>Licensed + sponsor state: <b>Texas</b> (unless the row says otherwise). Loan Officer type: <b>Outside (W-2)</b> (unless the row says 1099). Compensation <code>0.5</code>.</li>
<li>Website <b>No</b> + tick “I agree to obtain Loan Factory's approval…” · Social media <b>No</b> · referred by / how did you hear = <b>Google</b> · tick the final confirm → <b>Next</b>.</li>
<li>Correct result: URL gains <code>?key=…</code>, page “You're done for now. We will call you soon…”. <b>Paste that URL into the Run log</b> (it is the “LO's link” for paying + signing later).</li>
<li>Within 1–3 min the LO shows in <b>Hot leads</b> with source chip <b>Web form</b>, stage <b>Not started</b>. Quick find: the header search “Search candidates, NMLS, companies…” with the NMLS.</li></ol>` } },

  zoom: { title: { vi: "📞 Gọi điện thật bằng Zoom (OM9, Y1–Y3)", en: "📞 Real calls through Zoom (OM9, Y1–Y3)" }, body: {
    vi: `<ol class="prep"><li>Trên Mac: mở app <b>Zoom Workplace</b>, đăng nhập đường dây <b>Manh Zoom line (408) 538-1464</b> (thuộc <code>manhadmin@viet18.com</code>). System Settings → Privacy &amp; Security → <b>Microphone</b> → bật cho <b>zoom.us</b>.</li>
<li>Recruit: đăng nhập <code>manhadmin@viet18.com</code> (recruiter duy nhất có Zoom). LO để gọi: <b>TRINH VU TRONG BAO</b> (<a href="https://recruit.viet18.com/candidates/07001ba1-360b-491f-b9e1-c1b45766739d" target="_blank" rel="noopener">hồ sơ</a>), SĐT <code>+1 303-499-7111</code> = đường dây đọc giờ NIST, tự nhấc máy.</li>
<li>Gọi: menu <b>Conversations / Hội thoại</b> → tìm <code>TRINH VU</code> → <b>Open</b> → trong panel Omni chọn kênh/tab <b>Call</b> → <b>Call now / Gọi ngay</b> → Zoom trên Mac tự quay số. Nghe đọc giờ khoảng <b>30 giây</b> → cúp máy trong Zoom.</li>
<li>Kiểm trong Omni: dòng cuộc gọi → <b>Call details</b>: Outcome <b>Connected</b>, thời lượng ~20–30 giây, Source Zoom Phone, <b>From = Manh Admin</b>, To = LO; <b>Play recording</b> phát được, có <b>Download</b> và tốc độ 1x–2x. Không còn dòng “Calling…” quay mãi.</li>
<li>Kiểm hồ sơ LO: dải đỏ “<b>Your call {giờ} has no result yet</b> — Log how it went so the next step gets scheduled.” + nút <b>Log result / Ghi kết quả</b>.</li></ol>
<div class="meta">Không gọi được số ngoài Mỹ từ đường dây này (yc2ag, hoãn). Gọi nội bộ Zoom→Zoom vẫn kẹt “Calling…” (5j85f, đang mở). Chưa có AI summary vì cuộc gọi chỉ là giọng đọc giờ.</div>`,
    en: `<ol class="prep"><li>On the Mac: open <b>Zoom Workplace</b>, signed in as <b>Manh Zoom line (408) 538-1464</b> (belongs to <code>manhadmin@viet18.com</code>). System Settings → Privacy &amp; Security → <b>Microphone</b> → enable <b>zoom.us</b>.</li>
<li>Recruit: sign in as <code>manhadmin@viet18.com</code> (the only recruiter with Zoom). LO to call: <b>TRINH VU TRONG BAO</b> (<a href="https://recruit.viet18.com/candidates/07001ba1-360b-491f-b9e1-c1b45766739d" target="_blank" rel="noopener">profile</a>), phone <code>+1 303-499-7111</code> = NIST time line, auto-answers.</li>
<li>Call: <b>Conversations</b> → search <code>TRINH VU</code> → <b>Open</b> → in the Omni panel pick the <b>Call</b> channel/tab → <b>Call now</b> → Zoom on the Mac dials. Listen ~<b>30 seconds</b> → hang up in Zoom.</li>
<li>Check in Omni: the call row → <b>Call details</b>: Outcome <b>Connected</b>, ~20–30 s, Source Zoom Phone, <b>From = Manh Admin</b>, To = the LO; <b>Play recording</b> plays, with <b>Download</b> and 1x–2x speed. No endless “Calling…”.</li>
<li>Check the LO profile: red strip “<b>Your call {time} has no result yet</b> — Log how it went so the next step gets scheduled.” + <b>Log result</b>.</li></ol>
<div class="meta">International numbers can't be dialled from this line (yc2ag, deferred). Internal Zoom→Zoom calls still stick on “Calling…” (5j85f, open). No AI summary because the call is only the time voice.</div>` } },

  results: { title: { vi: "📝 Ghi kết quả trên trang này", en: "📝 Recording results on this page" }, body: {
    vi: `<ol class="prep"><li>Mở trang này khi đã đăng nhập claude.ai → góc trên “View” = <b>Kết quả của tôi</b>.</li>
<li>Làm xong một bước: bấm <b>Đạt</b> / <b>Lỗi</b> / <b>Bỏ</b> bên trái bước. Bấm lại cùng nút = xoá.</li>
<li>Bấm <b>+ ghi chú</b> (hoặc tự mở khi chọn Lỗi): ghi email LO, ID ứng viên, <b>giờ VN</b>, chữ thực tế trên màn hình, mã bug. Lưu tự động sau 1 giây.</li>
<li>Chip viền nét đứt “Claude (tự test)” dưới bước = kết quả gần nhất Claude chạy (kèm ghi chú). Chọn “So sánh mọi người” để xem cả kết quả người khác.</li>
<li>Mỗi lần chạy một case: điền 1 dòng ở <b>Nhật ký lần chạy</b> cuối trang (case, email LO, ID ứng viên, tới bước nào, kết quả).</li>
<li>Case có đổi Settings: bấm “Tôi đang đổi /settings” trước, trả lại giá trị rồi bấm “Tôi đổi xong, đã trả lại”.</li></ol>`,
    en: `<ol class="prep"><li>Open this page while signed in to claude.ai → top “View” = <b>My results</b>.</li>
<li>After a step: click <b>Pass</b> / <b>Fail</b> / <b>Skip</b> on its left. Clicking the same one again clears it.</li>
<li><b>+ note</b> (opens by itself on Fail): LO email, candidate ID, <b>VN time</b>, the actual on-screen text, bug id. Saves automatically after a second.</li>
<li>The dashed “Claude (self-test)” chip under a step = Claude's latest result (with its note). “Compare everyone” shows other people's results too.</li>
<li>Each case run: add one line to the <b>Run log</b> at the bottom (case, LO email, candidate ID, reached step, result).</li>
<li>Cases that change Settings: press “I'm changing /settings” first, restore, then “Done, values restored”.</li></ol>` } }
};
