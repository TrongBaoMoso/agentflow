// ---------- shared data ----------
const META = { env: { vi: "STAGING · code 07/10: recruit-be f740879f · recruit-fe 168b7fec · 6 stage BẬT", en: "STAGING · code 07/10: recruit-be f740879f · recruit-fe 168b7fec · 6 stages ON" } };

const WHO = {
  LO: { vi: "LO (bạn, không đăng nhập)", en: "LO (you, no login)" },
  REC: { vi: "Recruiter", en: "Recruiter" }, REC2: { vi: "Recruiter thứ hai", en: "Second recruiter" }, RECSMS: { vi: "Recruiter có Zoom", en: "Recruiter with Zoom" },
  MGR: { vi: "Manager", en: "Manager" }, ONB: { vi: "Onboarding", en: "Onboarding" }, ONBG: { vi: "Onboarding có Google", en: "Onboarding with Google" },
  HH: { vi: "Headhunter", en: "Headhunter" }, ADMIN: { vi: "Admin", en: "Admin" }, HR: { vi: "HR (HR app)", en: "HR (HR app)" },
  ANY: { vi: "Mọi vai", en: "Any role" }, DEV: { vi: "Nhờ dev / Claude", en: "Ask dev / Claude" }
};

const ACC = {
  rec: { email: "bao.trinh+recruiter@loanfactory.com", label: WHO.REC,
    use: { vi: "Recruiter chính cho hầu hết case. Có branch MOSO. Không có Zoom nên không gửi SMS được.", en: "Main recruiter for most cases. Has a MOSO branch. No Zoom, so it cannot send SMS." } },
  recSms: { email: "manhadmin@viet18.com", label: WHO.RECSMS,
    use: { vi: "Recruiter duy nhất có Zoom (gửi SMS). Luôn giữ vai RECRUITER. Dùng cho case G và làm recruiter thứ hai (case I, B-không-phải-chủ).", en: "The only recruiter with Zoom (can send SMS). Always stays RECRUITER. Use for case G and as the second recruiter (cases I, B not-owner)." } },
  mgr: { email: "bao.trinh+manager@loanfactory.com", label: WHO.MGR,
    use: { vi: "Duyệt offer ở My work today → “Waiting on your decision”, Exceptions, Remind, Take back, Reassign, gán specialist. Không có MOSO Admin (việc ghi sang MOSO bằng tài khoản này bị 401 — đã biết).", en: "Approves offers on My work today → “Waiting on your decision”, Exceptions, Remind, Take back, Reassign, assigns specialists. No MOSO Admin (MOSO writes from this account get 401 — known)." } },
  onb: { email: "bao.trinh+onb-test@loanfactory.com", label: WHO.ONB,
    use: { vi: "Onboarding specialist “ONB Test Specialist LF”. Không nối được Google (alias có dấu +).", en: "Onboarding specialist “ONB Test Specialist LF”. Cannot connect Google (+ alias)." } },
  onbG: { email: "bao.trinh@loanfactory.com", label: { vi: "Recruiter + Onboarding (tài khoản thật của anh)", en: "Recruiter + Onboarding (your real account)" },
    use: { vi: "Tài khoản DUY NHẤT nối được Google → Meet tự tạo (case J-G). Cũng là Onboarding đang hoạt động trong MOSO nên có thể được gán làm specialist.", en: "The ONLY account that can connect Google → auto Meet (case J-G). Also an active MOSO onboarding specialist, so it may be auto-assigned." } },
  hh: { email: "bao.trinh+hh@loanfactory.com", label: WHO.HH,
    use: { vi: "Vai chương trình LO Recruiter: chỉ thấy lead của mình.", en: "LO Recruiter program role: sees only its own leads." } },
  admin: { email: "chauchau.inc@gmail.com", label: { vi: "Admin recruit + HR staging", en: "Recruit Admin + HR staging" },
    use: { vi: "ADMIN đầy đủ trên recruit (/settings, /permissions) và có quyền HR app staging (tạo nhân viên).", en: "Full recruit ADMIN (/settings, /permissions) and HR app staging access (create associates)." } }
};

const PW_NOTE = {
  vi: "Mật khẩu: như bộ tài khoản test anh đang dùng. Quên mật khẩu: <code>account.viet18.com</code> → <b>Forgot password?</b> → nhập đúng email đó (thư về hộp <code>bao.trinh@loanfactory.com</code>). Alias có dấu <code>+</code> KHÔNG đăng nhập Google được.",
  en: "Password: the same test-account set you already use. Forgot it: <code>account.viet18.com</code> → <b>Forgot password?</b> → type that exact email (mail goes to <code>bao.trinh@loanfactory.com</code>). <code>+</code> aliases cannot use Google sign-in."
};

const RES = {
  loginShort: { title: { vi: "Đăng nhập", en: "Sign in" }, body: {
    vi: "Mở <code>recruit.viet18.com</code> → tự chuyển sang <code>account.viet18.com</code> → nhập email + mật khẩu → <b>Sign in</b> → về <b>My work today</b>. Đổi người: góc trên phải → <b>Sign out</b>. Hai vai cùng lúc = 2 profile Chrome (hoặc 1 thường + 1 ẩn danh), KHÔNG dùng 2 tab cùng cửa sổ. " + PW_NOTE.vi,
    en: "Open <code>recruit.viet18.com</code> → redirects to <code>account.viet18.com</code> → email + password → <b>Sign in</b> → lands on <b>My work today</b>. Switch person: top right → <b>Sign out</b>. Two roles at once = 2 Chrome profiles (or normal + incognito), NOT two tabs in one window. " + PW_NOTE.en } },

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

  sign: { title: { vi: "✍️ Ký thoả thuận trên trang LO (staging ký ngay trên trang)", en: "✍️ Sign the agreement on the LO page (staging signs in-page)" }, body: {
    vi: `<ol class="prep"><li>Sau khi trả phí: <b>Next</b> → bước <b>Review and Sign agreement</b>. Trang ghi “You are tentatively classified as: Outside Loan Officer (W-2)” (hoặc “Independent Loan Officer (1099)”).</li>
<li><b>Click Here to Sign Documents</b> → mở tab mới <code>/document_signing_tabs?key=…</code>.</li>
<li>Bấm lần lượt từng ô <b>CLICK HERE TO SIGN</b> (W-2 có 5 ô) → hộp “Your name” → gõ tên LO → <b>SUBMIT</b>. Lặp tới 5/5.</li>
<li>Kết quả đúng: <b>You've finished signing!</b>. Recruit ghi <b>Signed</b> và tự lên <b>Joined</b> trong ~1 phút (nếu đã trả phí hoặc được miễn).</li></ol>
<div class="meta">Staging tắt Inkless (dùng chữ ký trên trang). Nút gửi lại thoả thuận từ recruit chỉ chạy cho 5 email allowlist (onb-welcome1/2, agree1/2/3).</div>`,
    en: `<ol class="prep"><li>After paying: <b>Next</b> → step <b>Review and Sign agreement</b>. The page says “You are tentatively classified as: Outside Loan Officer (W-2)” (or “Independent Loan Officer (1099)”).</li>
<li><b>Click Here to Sign Documents</b> → new tab <code>/document_signing_tabs?key=…</code>.</li>
<li>Click each <b>CLICK HERE TO SIGN</b> box (W-2 has 5) → “Your name” box → type the LO's name → <b>SUBMIT</b>. Repeat to 5/5.</li>
<li>Correct result: <b>You've finished signing!</b>. Recruit shows <b>Signed</b> and moves the LO to <b>Joined</b> within ~1 minute (if paid or waived).</li></ol>
<div class="meta">Staging has Inkless off (in-page signing). The recruit “send agreement” button only works for the 5 allowlisted emails (onb-welcome1/2, agree1/2/3).</div>` } },

  inbox: { title: { vi: "📬 Email của LO về đâu, chờ bao lâu", en: "📬 Where LO emails arrive, how long to wait" }, body: {
    vi: `<ul class="prep"><li>Mọi email LO giả dạng <code>bao.trinh+…@loanfactory.com</code> về hộp <b>bao.trinh@loanfactory.com</b>. Nhìn dòng <b>To</b> để biết LO nào. Gmail: tìm <code>to:bao.trinh+t08a1@loanfactory.com</code>.</li>
<li>Offer được duyệt: LO <b>KHÔNG</b> nhận email (offer chuyển cho Onboarding). Email đầu tiên LO nhận: <b>“Loan Factory Onboarding: Complete These Initial Steps”</b> — sau khi Onboarding bấm Done buổi 1-1. Trễ 5–30 phút (chờ MOSO đồng bộ mỗi 5 phút + gửi mail), xem cả Spam.</li>
<li>Email nhắc lịch 1-1 và lời mời Google: CHỈ tới <code>bao.trinh+a3009f@loanfactory.com</code> (LO “QA Anewe” có sẵn).</li>
<li>Email gửi từ hội thoại recruit (omni) trên staging thường KHÔNG tới (omni #349: SendGrid staging không có IP). “Sent ✓” chỉ nghĩa là SendGrid đã nhận.</li>
<li>Email Welcome / Activate sau khi HR tạo nhân viên: staging KHÔNG gửi (MOSO chỉ ghi Email History).</li></ul>`,
    en: `<ul class="prep"><li>Every fake LO email <code>bao.trinh+…@loanfactory.com</code> lands in <b>bao.trinh@loanfactory.com</b>. Check the <b>To</b> line. Gmail search: <code>to:bao.trinh+t08a1@loanfactory.com</code>.</li>
<li>Offer approved: the LO gets <b>NO</b> email (the offer goes to Onboarding). The LO's first email is <b>“Loan Factory Onboarding: Complete These Initial Steps”</b> — after Onboarding marks the 1-1 Done. 5–30 min delay (MOSO sync every 5 min + mail), check Spam.</li>
<li>1-1 reminder emails and Google invites reach ONLY <code>bao.trinh+a3009f@loanfactory.com</code> (existing LO “QA Anewe”).</li>
<li>Emails sent from the recruit conversation (omni) usually do NOT arrive on staging (omni #349: staging SendGrid has no IP). “Sent ✓” only means SendGrid accepted it.</li>
<li>Welcome / Activate email after HR creates the employee: staging does NOT send it (MOSO only records Email History).</li></ul>` } },

  hrapp: { title: { vi: "🏢 HR app: tạo nhân viên từ bản nháp recruit", en: "🏢 HR app: create the employee from the recruit draft" }, body: {
    vi: `<ol class="prep"><li>Đăng nhập <code>hr.viet18.com</code> bằng <code>chauchau.inc@gmail.com</code>${cp("chauchau.inc@gmail.com")} (nếu hiện tour trợ lý HR → <b>Skip</b>).</li>
<li>Menu <b>People → Associates → Add associate</b> (trang <b>New hires</b>). Tìm tên LO (danh sách ghi kiểu “Họ Tên”, vd “Amain QA”) có chip <b>Recruit</b>, “Still needed: …”.</li>
<li><b>Review</b> → đi 4 bước. Kiểm tên, email, SĐT, địa chỉ, NMLS, loại LO, bang, loại hợp đồng đã điền sẵn.</li>
<li><b>Work email</b>: đổi thành email chưa ai dùng, vd <code>qa.amain1008@loanfactory.com</code>.</li>
<li><b>Licence TX</b>: danh mục chỉ có 3 lựa chọn — chọn <b>Mortgage Company License</b>, ngày hết hạn <code>12/31/2026</code>. (Thiếu licence cá nhân — bug 8ecq0.)</li>
<li>Review: “Everything required is filled in.” → <b>Create associate</b> → toast <b>Associate created</b>.</li>
<li>Vài giây sau, recruit (hồ sơ LO → Activity) có dòng <b>HR created the employee account</b> và bước <b>HR account</b> trong thẻ Onboarding progress thành Done.</li></ol>`,
    en: `<ol class="prep"><li>Sign in to <code>hr.viet18.com</code> as <code>chauchau.inc@gmail.com</code>${cp("chauchau.inc@gmail.com")} (if the HR assistant tour shows → <b>Skip</b>).</li>
<li><b>People → Associates → Add associate</b> (<b>New hires</b> page). Find the LO (listed “Last First”, e.g. “Amain QA”) with chip <b>Recruit</b>, “Still needed: …”.</li>
<li><b>Review</b> → go through 4 steps. Check name, email, phone, address, NMLS, LO type, state, contract type are prefilled.</li>
<li><b>Work email</b>: an unused address, e.g. <code>qa.amain1008@loanfactory.com</code>.</li>
<li><b>TX licence</b>: the catalogue has only 3 options — pick <b>Mortgage Company License</b>, expiry <code>12/31/2026</code>. (No individual licence — bug 8ecq0.)</li>
<li>Review: “Everything required is filled in.” → <b>Create associate</b> → toast <b>Associate created</b>.</li>
<li>Seconds later, recruit (LO profile → Activity) shows <b>HR created the employee account</b> and the <b>HR account</b> step of the Onboarding progress card turns Done.</li></ol>` } },

  time: { title: { vi: "🕐 Giờ giấc của hệ (đọc trước khi test SLA / lịch)", en: "🕐 System clock (read before SLA / scheduling tests)" }, body: {
    vi: `<ul class="prep"><li>Giờ làm việc: <b>08:00–18:00 giờ Pacific, thứ 2–6</b> = <b>22:00–08:00 giờ VN</b>. Ngoài giờ, đồng hồ SLA đứng yên. Thứ 2 12/10 là ngày lễ (Columbus Day) — không tính.</li>
<li>“Hôm nay” của hệ = ngày ở Los Angeles: sang ngày mới lúc <b>14:00 giờ VN</b> (15:00 sau 02/11). Ảnh hưởng: nhóm Overdue / Later today, ngày mặc định ở modal Done 1-1, bộ lọc ngày.</li>
<li>VN đặt follow-up “ngày mai 7:00” = 17:00 hôm nay ở California → hiện ở nhóm <b>Later today</b> (đúng thiết kế).</li>
<li>Recruit → MOSO mỗi 5 phút; MOSO → recruit (trả phí, ký, đăng ký mới) ~1 phút; Send to HR mỗi 5 phút; đổi /settings có hiệu lực sau 30 giây.</li></ul>`,
    en: `<ul class="prep"><li>Business hours: <b>08:00–18:00 Pacific, Mon–Fri</b> = <b>22:00–08:00 Vietnam</b>. Outside them the SLA clock stops. Monday 12/10 is a holiday (Columbus Day).</li>
<li>The system's “today” is the Los Angeles date: it rolls over at <b>14:00 Vietnam</b> (15:00 after 02/11). Affects Overdue / Later today groups, the Done 1-1 default date, date filters.</li>
<li>A follow-up set from Vietnam for “tomorrow 7:00” = 17:00 today in California → shows under <b>Later today</b> (by design).</li>
<li>Recruit → MOSO every 5 min; MOSO → recruit (pay, sign, new registration) ~1 min; Send to HR every 5 min; a /settings change takes effect after 30 s.</li></ul>` } },

  settings: { title: { vi: "⚙️ /settings: đổi gì, giá trị gốc để TRẢ LẠI", en: "⚙️ /settings: what to change, original values to RESTORE" }, body: {
    vi: `<p>Chỉ Admin (<code>chauchau.inc@gmail.com</code>) vào được <code>recruit.viet18.com/settings</code>. Đổi xong <b>đợi 30 giây</b>. Settings là CHUNG cho mọi người test — bấm nút “Tôi đang đổi /settings” ở case để người khác biết.</p>
<div class="tbl"><table><thead><tr><th>Mục trên /settings</th><th>Giá trị gốc (07/10)</th><th>Hạ để test</th></tr></thead><tbody>
<tr><td>Hot leads — first-touch deadline · Web form</td><td><code>1</code> giờ làm việc</td><td>giữ 1 (chỉ test trong giờ làm việc)</td></tr>
<tr><td>Unclaimed → Exceptions after</td><td><code>5</code> phút</td><td><code>1</code> phút</td></tr>
<tr><td>Claimed but not contacted → back to the pool after</td><td><code>4</code> giờ làm việc · cảnh báo <code>1</code></td><td><code>1</code> · cảnh báo <code>0</code></td></tr>
<tr><td>Follow-up · No-answer retry ladder</td><td><code>3, 5, 10, 30</code></td><td><code>1</code></td></tr>
<tr><td>Offers · review deadline</td><td><code>24</code> giờ</td><td><code>1</code> giờ</td></tr>
<tr><td>Ready to join, invite not sent</td><td><code>2</code> ngày</td><td>(giữ — LO t08h12 đã được tạo sẵn từ 07/10)</td></tr></tbody></table></div>
<div class="meta">KHÔNG bật “auto-release” lead (hot.idle_release_enabled) — nó trả lại MỌI lead quá hạn trên staging.</div>`,
    en: `<p>Only Admin (<code>chauchau.inc@gmail.com</code>) can open <code>recruit.viet18.com/settings</code>. After a change <b>wait 30 seconds</b>. Settings are SHARED by all testers — press “I'm changing /settings” on the case so others know.</p>
<div class="tbl"><table><thead><tr><th>Item on /settings</th><th>Original value (07/10)</th><th>Lower to test</th></tr></thead><tbody>
<tr><td>Hot leads — first-touch deadline · Web form</td><td><code>1</code> business hour</td><td>keep 1 (test inside business hours)</td></tr>
<tr><td>Unclaimed → Exceptions after</td><td><code>5</code> min</td><td><code>1</code> min</td></tr>
<tr><td>Claimed but not contacted → back to the pool after</td><td><code>4</code> business hours · warn <code>1</code></td><td><code>1</code> · warn <code>0</code></td></tr>
<tr><td>Follow-up · No-answer retry ladder</td><td><code>3, 5, 10, 30</code></td><td><code>1</code></td></tr>
<tr><td>Offers · review deadline</td><td><code>24</code> hours</td><td><code>1</code> hour</td></tr>
<tr><td>Ready to join, invite not sent</td><td><code>2</code> days</td><td>(keep — LO t08h12 was prepared on 07/10)</td></tr></tbody></table></div>
<div class="meta">Do NOT turn on lead auto-release (hot.idle_release_enabled) — it releases EVERY overdue lead on staging.</div>` } },

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
    en: "A <code>+</code> alias does not work: when the LO hits Reply, Gmail sends from the base address so the system cannot tell which LO. Create a separate test Gmail (e.g. <code>lf.qa.lo01@gmail.com</code>) and register exactly ONE LO with it at <code>www.viet18.com/register-loan-officer</code>. Note omni #349: emails from recruit usually do not arrive on staging — if nothing after 30 min, mark “Skip” with “omni #349”." } }
};
