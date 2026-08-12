/* =========================================================
   LF Recruit — interactive prototype · MOCK DATA
   Một kho hồ sơ duy nhất — mọi role đọc từ đây qua "ống kính"
   Tên nhân sự nội bộ: Brayan/Seth/Dave/Dung/Miley/Rosaline = thật (production roles)
   Victoria Pham (manager) = thật (Q22 chốt 12/08) · David Park (LO) = placeholder chờ chốt
   Nhãn "GIẢ ĐỊNH" = nội dung vẽ theo giả định hợp lý, chờ xác nhận (Q11/Q12, Q13, Q27)
   ========================================================= */

const STAGES = [
  { id: 'S1', name: 'New',        note: 'SLA: claim + first touch' },
  { id: 'S2', name: 'Contacted',  note: 'Rule: luôn có next-step' },
  { id: 'S3', name: 'Engaged',    note: 'Gate ra: NMLS bắt buộc' },
  { id: 'S4', name: 'Verified',   note: 'Gate: data fresh ≤90d' },
  { id: 'S5', name: 'Offer',      note: 'HR owns · e-sign tracked' },
  { id: 'S6', name: 'Onboarding', note: '4 phòng ban song song' },
  { id: 'S7', name: 'Active',     note: 'Attribution đóng băng' },
];

const USERS = {
  brayan:   { name: 'Brayan Suarez',  role: 'Inside Recruiter',   av: 'BS', color: '#1D4ED8' },
  seth:     { name: 'Seth August',    role: 'Outside Recruiter',  av: 'SA', color: '#2E7D57' },
  luis:     { name: 'Luis Ortega',    role: 'Inside Recruiter',   av: 'LO', color: '#D93025' },
  nocha:    { name: 'Nocha Kelly',    role: 'Inside Recruiter · OOO đến 10/8', av: 'NK', color: '#8A5A44' },
  tracy:    { name: 'Victoria Pham',  role: 'Recruiting Manager', av: 'VP', color: '#7C5CBF' },
  dave:     { name: 'Dave Hoàng',     role: 'HR',                 av: 'DH', color: '#B45309' },
  dung:     { name: 'Dung Nguyễn',    role: 'Licensing',          av: 'DN', color: '#5B6472' },
  miley:    { name: 'Miley Dau',      role: 'Onboard Specialist', av: 'MD', color: '#0E7490' },
  rosaline: { name: 'Rosaline Pham',  role: 'Accounting',         av: 'RP', color: '#9D174D' },
  david:    { name: 'David Park',     role: 'Loan Officer (referrer)', av: 'DP', color: '#4D7C0F' },
};

/* ---- Cấu hình admin sửa được (Settings) ---- */
const CONFIG = {
  sla: [
    { id: 'claim',  label: 'Claim lead mới',          appliesTo: 'Mọi nguồn',      hours: 4,  warnPct: 25, breach: 'Notify manager + lead lên đầu queue' },
    { id: 'touch',  label: 'First touch (liên hệ lần đầu)', appliesTo: 'Mọi nguồn', hours: 24, warnPct: 25, breach: 'Escalate manager → reassign' },
    { id: 'refer',  label: 'First touch — nguồn Referral',  appliesTo: 'Source = Referral', hours: 12, warnPct: 25, breach: 'Escalate manager (referral quý hơn)' },
    { id: 'offer',  label: 'HR duyệt offer request',  appliesTo: 'S4 → S5',        hours: 72, warnPct: 33, breach: 'Nhắc manager mỗi ngày' },
  ],
  compBands: [
    { id: 'P1', label: 'P1 · Mới vào nghề', rule: '< $5M hoặc < 12 loans /12m' },
    { id: 'P2', label: 'P2 · Đang lên',     rule: '$5–25M · 12–50 loans' },
    { id: 'P3', label: 'P3 · Vững',         rule: '$25–100M · 50–120 loans' },
    { id: 'P4', label: 'P4 · High producer', rule: '$100M+ hoặc 120+ loans' },
  ],
  defaultView: { recruiter: 'today', manager: 'exceptions', hr: 'hrq', licensing: 'licq', onboarding: 'onbq', accounting: 'accq', referrer: 'portal' },
  favoriteViews: {}, // per-role user override — set bằng nút ⭐
};

/* ---- Role lens: ai thấy gì (row-level + field-level) ---- */
const ROLES = {
  recruiter: {
    user: 'brayan', label: 'Recruiter', icon: '🎯',
    landing: 'Việc hôm nay của TÔI — lead của mình + team',
    rules: ['Thấy: lead của mình / team', 'Comp: chỉ thấy band gợi ý', 'Không sửa số comp cuối'],
    nav: [['today', '☀️ Today'], ['pipeline', '📊 Pipeline'], ['portal', null], ['settings', null]],
    stages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'], seeComp: 'band', rows: 'own',
  },
  manager: {
    user: 'tracy', label: 'Manager', icon: '🧭',
    landing: 'Chỉ NGOẠI LỆ: trễ SLA, nghẽn, chờ duyệt — mọi thứ êm thì màn hình trống',
    rules: ['Thấy: toàn team, mọi stage', 'Comp: xem & duyệt', 'Quyền riêng: reassign, duyệt offer, Settings'],
    nav: [['exceptions', '🚨 Exceptions'], ['pipeline', '📊 Pipeline'], ['statuses', '🧬 Status model (draft)'], ['settings', '⚙️ Settings']],
    stages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'], seeComp: 'full', rows: 'all',
  },
  hr: {
    user: 'dave', label: 'HR', icon: '📝',
    landing: 'Offer cần soạn + e-sign cần theo — ứng viên qua gate S4 tự hiện ra',
    rules: ['Thấy: chỉ từ S4 trở đi', 'Comp: toàn quyền (duy nhất sửa số cuối)', 'S1–S3: không thấy'],
    nav: [['hrq', '📝 Offer desk'], ['pipeline', '📊 Pipeline (S4+)']],
    stages: ['S4', 'S5', 'S6', 'S7'], seeComp: 'full', rows: 'all',
  },
  licensing: {
    user: 'dung', label: 'Licensing', icon: '📋',
    landing: 'Hàng đợi giấy phép — luật bang tự bật cờ, không cần nhớ 50 bang',
    rules: ['Thấy: S6 + câu hỏi licensing từ S3', 'Comp: 🔒 ẩn', 'Quyền riêng: state rules, NMLS transfer'],
    nav: [['licq', '📋 Licensing queue']],
    stages: ['S6'], seeComp: 'none', rows: 'all',
  },
  onboarding: {
    user: 'miley', label: 'Onboarding', icon: '🎓',
    landing: 'Người mới nào đang kẹt, kẹt ở phòng nào — tick việc của mình, nhắc phòng khác',
    rules: ['Thấy: S6 + checklist 4 phòng', 'Comp: 🔒 ẩn', 'Đủ 100% → tự chuyển S7 Active'],
    nav: [['onbq', '🎓 Onboarding board']],
    stages: ['S6'], seeComp: 'none', rows: 'all',
  },
  accounting: {
    user: 'rosaline', label: 'Accounting', icon: '💵',
    landing: 'Bonus giới thiệu nào đến hạn, cái nào đủ điều kiện — đủ mới hiện nút trả',
    rules: ['Thấy: S7 + payout queue', 'Không thấy: pipeline, production', 'Quyền riêng: phát lệnh trả'],
    nav: [['accq', '💵 Payout queue']],
    stages: ['S7'], seeComp: 'none', rows: 'all',
  },
  referrer: {
    user: 'david', label: 'Referring LO', icon: '🤝',
    landing: 'Không vào app Recruit — chỉ MỘT card trong LO portal',
    rules: ['Thấy: tiến độ người mình giới thiệu', 'Không thấy: comp, ghi chú, pipeline'],
    nav: [['portal', '🤝 My referrals']],
    stages: [], seeComp: 'none', rows: 'referred',
  },
};

/* =========================================================
   CANDIDATES — mỗi người một CASE cụ thể, các phòng ban
   nhìn cùng hồ sơ này qua lens của mình
   ========================================================= */
const CANDIDATES = [
  {
    id: 'kaprice', name: 'Kaprice Nicholson', av: 'KN', color: '#7C5CBF',
    nmls: '2667971', company: 'Imperium Lending', city: 'Charlotte, NC', st: 'NC',
    stage: 'S1', source: 'Modex List', sourceNote: 'TMC batch Feb', owner: 'brayan',
    vol: 18.2, units: 41, since22: 96, licensed: '11 tháng', score: 84,
    slaMin: 220, // còn 3h40m
    caseNote: 'Lead mới từ Modex list — chưa từng liên hệ. Đồng hồ SLA first-touch đang chạy.',
    ai: '“Hi Kaprice, this is Brayan with Loan Factory. Saw you closed 41 loans in your first year at Imperium — that’s a serious start. LOs at your volume usually keep 40–60% more per file on our comp plan. Worth a 10-minute call this week?”',
    timeline: [['Aug 3', 'Lead tạo từ Modex list import (batch TMC) — auto-assign Brayan']],
  },
  {
    id: 'elizabeth', name: 'Elizabeth Knaack', av: 'EK', color: '#B45309',
    nmls: '', company: 'Mortgage Calculator Co', city: 'Tampa, FL', st: 'FL',
    stage: 'S1', source: 'Self-apply', owner: 'brayan',
    vol: null, units: null, licensed: null, score: null,
    slaMin: 842,
    caseNote: 'Tự apply, CHƯA có NMLS → chưa enrich được. Việc của recruiter: hỏi + nhập NMLS là data tự về.',
    ai: '“Hi Elizabeth, Brayan from Loan Factory — got your application. Quick one: what’s your NMLS ID? I’ll pull your production so we can talk real numbers on the first call.”',
    timeline: [['Aug 3', 'Self-apply qua website — form không bắt NMLS (by design, giảm friction)']],
  },
  {
    id: 'tara', name: 'Tara Wilkins', av: 'TW', color: '#7C5CBF',
    nmls: '2201456', company: 'HomeBridge', city: 'Raleigh, NC', st: 'NC',
    stage: 'S1', source: 'Modex List', owner: 'luis',
    vol: 11.4, units: 26, since22: 61, licensed: '2 năm', score: 71,
    slaMin: -120, breachedFor: '26h',
    caseNote: 'TRỄ SLA — vào 26h chưa ai chạm. Owner Luis trễ 4 lần tuần này → tự leo lên màn Manager.',
    timeline: [['Aug 2', 'Lead tạo — auto-assign Luis Ortega'], ['Aug 3', '⚠️ SLA first-touch breach — escalated to manager']],
  },
  {
    id: 'gary', name: 'Gary Boyd', av: 'GB', color: '#B45309',
    nmls: '1877002', company: 'CrossCountry', city: 'Denver, CO', st: 'CO',
    stage: 'S1', source: 'Event · Webinar', owner: 'nocha',
    vol: 22.7, units: 48, since22: 118, licensed: '5 năm', score: 78,
    slaMin: -60, breachedFor: '25h',
    caseNote: 'Owner Nocha đang OOO nhưng routing vẫn auto-assign vào → case để manager sửa rule.',
    timeline: [['Aug 2', 'Đăng ký webinar “Comp that makes sense” → lead tạo'], ['Aug 3', '⚠️ SLA breach — owner OOO, routing rule cần sửa']],
  },
  {
    id: 'jenna', name: 'Jenna Tran', av: 'JT', color: '#8A93A2',
    nmls: '2318890', company: 'Rocket', city: 'Houston, TX', st: 'TX',
    stage: 'S1', source: 'Referral', referredBy: 'david', referredOn: 'Jul 30', owner: 'brayan',
    vol: 6.8, units: 15, since22: 34, licensed: '18 tháng', score: 66,
    slaMin: 400,
    caseNote: 'Referral của David Park (Jul 30) — David theo dõi tiến độ cô ấy trong LO portal.',
    timeline: [['Jul 30', 'David Park giới thiệu qua LO portal → lead tạo, badge Referral']],
  },
  {
    id: 'chad', name: 'Chad Standish', av: 'CS', color: '#8A5A44',
    nmls: '843765', company: 'Credit Karma Mortgage', city: 'Dallas, TX', st: 'TX',
    stage: 'S2', source: 'Modex List', owner: 'brayan',
    vol: 41.2, units: 96, since22: 233, licensed: '9 năm', score: 88,
    followUp: 'Sent comp sheet — check nếu đã mở, mời Zoom',
    caseNote: 'Đã gửi comp sheet — follow-up hôm nay để mời Zoom.',
    timeline: [['Jul 31', 'First call — quan tâm, xin comp sheet'], ['Aug 1', 'Email comp sheet (tracked)'], ['Aug 3', 'Task follow-up đến hạn']],
  },
  {
    id: 'dominic', name: 'Dominic Silvestri', av: 'DS', color: '#2E7D57',
    nmls: '234156', company: 'Imperium Lending', city: 'Austin, TX', st: 'TX',
    stage: 'S2', source: 'Referral', referredBy: null, sourceNote: 'by T. Nguyen', owner: 'brayan',
    vol: 9.4, units: 22, since22: 52, licensed: '4 năm', score: 74,
    caseNote: 'Referral từ T. Nguyen — đã liên hệ, đang hẹn lịch nói chuyện sâu.',
    timeline: [['Aug 1', 'SMS intro — trả lời sau 20 phút'], ['Aug 2', 'Hẹn call thứ Tư']],
  },
  {
    id: 'joseph', name: 'Joseph Guarino', av: 'JG', color: '#1D4ED8',
    nmls: '1637367', company: 'Guaranteed Rate', city: 'Austin, TX', st: 'TX',
    stage: 'S3', source: 'Modex List', owner: 'brayan',
    vol: 514, units: 1410, since22: 4210, licensed: '14 năm', score: 99,
    followUp: 'Gọi sau closing thứ Sáu — bàn comp expectations',
    caseNote: 'Cá lớn nhất pipeline ($514M). Hẹn gọi lại sau closing thứ Sáu.',
    timeline: [['Jul 24', 'First call — “gọi lại sau closing thứ Sáu”'], ['Jul 28', 'Zoom 25 phút — hỏi sâu về comp structure'], ['Aug 1', 'Modex refresh: volume xác nhận $514M/1,410u']],
  },
  {
    id: 'maria', name: 'Maria Torres', av: 'MT', color: '#5B6472',
    nmls: '1990254', company: 'Fairway', city: 'San Jose, CA', st: 'CA',
    stage: 'S3', source: 'Event · Webinar', owner: 'brayan',
    vol: 12.6, units: 28, since22: 68, licensed: '6 năm', score: 80,
    licRelay: { q: 'CA: DRE license — cần corporate filing gì không?', a: 'DRE cần thêm corporate filing, ~3 tuần', answered: false },
    caseNote: 'Đang chờ câu trả lời DRE (CA) từ Licensing — recruiter hỏi TRƯỚC khi offer, khỏi bể kèo sau.',
    timeline: [['Jul 29', 'Webinar Q&A — hỏi về California DRE'], ['Jul 30', 'Recruiter gửi câu hỏi cho Licensing (in-app, không email)']],
  },
  {
    id: 'roger', name: 'Roger Kube', av: 'RK', color: '#E8570E',
    nmls: '107621', company: 'Fairway Independent Mortgage', city: 'Plano, TX', st: 'TX',
    stage: 'S4', source: 'Referral', owner: 'brayan',
    vol: 103.85, units: 138, since22: 312, avgLoan: '$752K', licensed: '15 năm', score: 100,
    verified: 'Aug 1 · fresh', mix: { purchase: 61, refi: 39, conv: 72, va: 18, fha: 10 },
    offer: { status: 'REQUESTED', band: 'P4', waitDays: 2, requestedBy: 'brayan' },
    caseNote: 'Verified fresh (Aug 1). Offer request band P4 đang chờ manager duyệt — 2 ngày.',
    ai: '“Roger — following up on our Zoom. With $103.8M across 138 units you’d sit in our top comp tier. I’ve asked my manager to fast-track your offer; expect the package this week.”',
    timeline: [['Jul 24', 'First call — quan tâm comp structure'], ['Jul 28', 'Zoom với branch manager — notes đính kèm'], ['Jul 30', 'Brayan nhập NMLS → auto-add vào synced list'], ['Aug 1', 'Verified — Modex payload về (webhook), card tự cập nhật'], ['Aug 1', 'Brayan bấm Request offer approval → chờ Tracy']],
  },
  {
    id: 'angela', name: 'Angela Ho', av: 'AH', color: '#2E7D57',
    nmls: '1544207', company: 'NewRez', city: 'San Antonio, TX', st: 'TX',
    stage: 'S4', source: 'Modex List', owner: 'seth',
    vol: 8.4, units: 19, since22: 44, licensed: '3 năm', score: 76,
    verified: 'Aug 1', mix: { purchase: 70, refi: 30, conv: 80, va: 12, fha: 8 },
    offer: { status: 'REQUESTED', band: 'P2', waitDays: 4, requestedBy: 'seth', note: 'muốn remote, hỏi về đội TX' },
    signal: 'Volume +38% ($6.1M → $8.4M) — vượt tier, comp band cũ không còn đúng',
    caseNote: 'Từ nurture thức dậy nhờ signal volume +38%. Offer request chờ duyệt 4 ngày — đang làm nghẽn S4→S5.',
    timeline: [['Mar 12', 'Vào nurture — “chưa sẵn sàng, hỏi lại mùa hè”'], ['Aug 1', 'Modex refresh: volume +38% → signal bắn cho recruiter'], ['Aug 1', 'Re-engage call — giờ thì sẵn sàng'], ['Aug 1', 'Request offer approval']],
  },
  {
    id: 'trent', name: 'Trent Malone', av: 'TM', color: '#8A5A44',
    nmls: '556201', company: 'Caliber', city: 'Houston, TX', st: 'TX',
    stage: 'S5', source: 'Referral', owner: 'brayan', paid: true,
    vol: 67.9, units: 122, since22: 290, licensed: '11 năm', score: 92,
    offer: { status: 'VIEWED', band: 'P3', sent: 'Jul 29', viewedNote: 'mở 3 lần, dừng ở trang comp', stallDays: 5, pay: 'Cash' },
    caseNote: 'Offer gửi Jul 29 — XEM 3 lần nhưng chưa ký, dừng ở trang comp → tín hiệu đang so offer khác.',
    timeline: [['Jul 25', 'Manager duyệt band P3'], ['Jul 29', 'HR gửi offer qua document-esign'], ['Jul 30', 'Viewed lần 1 (12 phút)'], ['Aug 1', 'Viewed lần 3 — dừng ở trang comp']],
  },
  {
    id: 'dana', name: 'Dana Whitfield', av: 'DW', color: '#5B6472',
    nmls: '1120843', company: '(joined)', city: 'Tulsa, OK', st: 'OK',
    stage: 'S6', source: 'Self-apply', owner: 'brayan', signedOn: 'Jul 24', dayN: 11,
    paid: true, hrVerify: { todos: false, docs: false }, accountCreated: false,
    vol: 8.1, units: 20, since22: 47, licensed: '3 năm', score: 72,
    licensing: { state: 'SC', rule: 'SC: branch phải ≤ 75 dặm', status: 'FAIL', detail: 'chi nhánh gần nhất 82 dặm → cần xác nhận lại địa chỉ', nmlsTransfer: 'đang chờ' },
    checklist: {
      'Licensing':    [['NMLS transfer', false], ['SC distance rule', false, 'blocked'], ['State filing OK', true], ['W-9 license copy', true], ['E&O insurance', false]],
      'HR paperwork': [['Employment agreement', true], ['I-9', true], ['Direct deposit', true], ['Handbook ký', true]],
      'IT & systems': [['Email + SSO', true], ['LOS account', true], ['Phone (Zoom seat)', false]],
      'Accounting':   [['Payroll setup', true], ['Comp plan vào hệ thống', false]],
    },
    caseNote: 'Ký Jul 24, ngày 11 onboarding. KẸT ở Licensing: luật SC ≤75 dặm — chi nhánh gần nhất 82 dặm.',
    timeline: [['Jul 22', 'HR gửi offer'], ['Jul 24', 'Signed ✓ → tự chuyển S6, checklist tự mở'], ['Jul 28', '⚠️ Licensing flag: SC 75mi rule — 82 dặm, không đạt']],
  },
  {
    id: 'louis', name: 'Louis Pham', av: 'LP', color: '#2E7D57',
    nmls: '1667220', company: '(joined)', city: 'Newark, NJ', st: 'NJ',
    stage: 'S6', source: 'Referral', referredBy: 'david', referredOn: 'Jun 14', owner: 'brayan',
    signedOn: 'Jul 20', dayN: 15, paid: true, hrVerify: { todos: true, docs: true }, accountCreated: true,
    vol: 14.9, units: 33, since22: 79, licensed: '5 năm', score: 82,
    licensing: { state: 'NJ', rule: 'NJ: trong bán kính 2.5h lái xe', status: 'OK', detail: 'đã xác nhận ✓ · Sponsorship filed Jul 28' },
    checklist: {
      'Licensing':    [['NMLS transfer', true], ['NJ 2.5h rule', true], ['Sponsorship filed', true], ['State filing', true], ['E&O insurance', true]],
      'HR paperwork': [['Employment agreement', true], ['I-9', true], ['Direct deposit', true], ['Handbook ký', true]],
      'IT & systems': [['Email + SSO', true], ['LOS account', true], ['Phone (Zoom seat)', true]],
      'Trainings (Benjamin)': [['Orientation', true], ['LOS basics', true], ['Compliance 101', true], ['First-file shadow', false]],
    },
    bonus: { referrer: 'david', joined: 'Jul 20', mature: 'Sep 18', daysLeft: 44, eligible: null, pay: 'Cash → tự phát Check' },
    caseNote: 'Referral của David Park. Onboarding ngày 15 — chỉ còn 1 training. Tick nốt là TỰ chuyển S7 Active.',
    timeline: [['Jun 14', 'David Park giới thiệu'], ['Jul 18', 'Offer ký'], ['Jul 20', 'Join — bonus clock 60 ngày bắt đầu'], ['Aug 2', 'Trainings 3/4 — còn First-file shadow']],
  },
  {
    id: 'rita', name: 'Rita Moreno', av: 'RM', color: '#1D4ED8',
    nmls: '1433012', company: '(active)', city: 'Phoenix, AZ', st: 'AZ',
    stage: 'S7', source: 'Referral', sourceNote: 'by T. Nguyen', owner: 'seth', joinedOn: 'Jun 2',
    bonus: { referrer: null, referrerName: 'T. Nguyen', joined: 'Jun 2', mature: 'Aug 1', matured: true, eligible: true, idem: true, pay: 'RSU — chờ HR xác nhận tay', paid: false },
    caseNote: 'Bonus CHÍN Aug 1, đủ điều kiện 2 phía, chưa từng trả (idempotency ✓). RSU nên cần HR xác nhận tay.',
    timeline: [['Jun 2', 'Joined — bonus clock bắt đầu'], ['Aug 1', 'Bonus chín — eligibility check pass 2 phía']],
  },
  {
    id: 'kyle', name: 'Kyle Dunn', av: 'KD', color: '#D93025',
    nmls: '1789004', company: '(active)', city: 'Las Vegas, NV', st: 'NV',
    stage: 'S7', source: 'Referral', sourceNote: 'by M. Reyes', owner: 'luis', joinedOn: 'May 28',
    bonus: { referrerName: 'M. Reyes', joined: 'May 28', mature: 'Jul 27', matured: true, eligible: false, reason: 'Người giới thiệu (M. Reyes) đã nghỉ Jun 30 — điều kiện 2 phía không đạt', pay: '—', paid: false, rejected: true },
    caseNote: 'Bonus chín Jul 27 nhưng KHÔNG đạt: người giới thiệu nghỉ Jun 30 → auto-reject, lý do lưu hồ sơ.',
    timeline: [['May 28', 'Joined'], ['Jun 30', 'M. Reyes (referrer) nghỉ việc'], ['Jul 27', 'Bonus chín → auto-reject, lý do ghi vào hồ sơ']],
  },
  {
    id: 'peter', name: 'Peter Lawson', av: 'PL', color: '#C2410C',
    nmls: '774021', company: 'NewFi West', city: 'Portland, OR', st: 'OR',
    stage: 'NURTURE', source: 'Modex List', owner: 'brayan', nurtureSince: 'May',
    vol: 31.5, units: 64, since22: 152, licensed: '8 năm', score: 85,
    signal: 'Changed company: Imperium Lending → NewFi West (Jul 2026) — cửa sổ vàng để gọi lại',
    caseNote: 'Nằm nurture từ May. Modex refresh phát hiện ĐỔI CÔNG TY → signal bắn về, đúng lúc dễ rủ nhất.',
    timeline: [['May 6', 'Vào nurture — “vừa ký lại 1 năm, hỏi lại sau”'], ['Aug 1', 'Modex refresh: đổi công ty sang NewFi West → signal']],
  },
  {
    id: 'trina', name: 'Trina Vo', av: 'TV', color: '#0E7490',
    nmls: '2100455', company: 'LoanDepot', city: 'Garden Grove, CA', st: 'CA',
    stage: 'NURTURE', source: 'Event · Trade show', owner: 'brayan', nurtureSince: 'Feb',
    vol: 9.9, units: 24, since22: 55, licensed: '4 năm', score: 70,
    wakeUp: 'Tự hẹn “hỏi lại tháng 8” — hôm nay đến hẹn',
    caseNote: 'Wake-up đúng hẹn tháng 8 — chính cô ấy xin thế.',
    timeline: [['Feb 20', 'Trade show — “đang bận refi pipeline, hỏi lại tháng 8”'], ['Aug 3', 'Wake-up task tự tạo']],
  },
];

/* ---- AI weekly digest (manager) ---- */
const AI_DIGEST = 'Tuần này referral từ chi nhánh TX tạo 3/5 candidate Verified. Luis trễ SLA 4 lần liên tiếp vào thứ Hai — cân nhắc đổi lịch trực lead weekend. 6 offer request đợi duyệt >3 ngày là nghẽn lớn nhất (S4→S5 giảm 18 điểm).';

/* ---- Funnel numbers (tháng này vs tháng trước) ---- */
const FUNNEL = [
  { s: 'S1 · New', n: 184, conv: '→ S2 62%', delta: '▲3', up: true, w: 100 },
  { s: 'S2 · Contacted', n: 114, conv: '→ S3 34%', delta: '▲5', up: true, w: 62 },
  { s: 'S3 · Engaged', n: 39, conv: '→ S4 67%', delta: '▲1', up: true, w: 21 },
  { s: 'S4 · Verified', n: 26, conv: '→ S5 31%', delta: '▼18', up: false, w: 14 },
  { s: 'S5 · Offer', n: 8, conv: '→ S6 75%', delta: '▲8', up: true, w: 4.5, green: true },
  { s: 'S6 · Onboarding', n: 6, conv: '→ Active 100%', delta: '', up: true, w: 3.3, green: true },
];
const RECRUITER_STATS = [
  { u: 'brayan', leads: 61, sla: 96, engaged: 15, offers: 3, joined: 2 },
  { u: 'seth', leads: 48, sla: 91, engaged: 11, offers: 2, joined: 2 },
  { u: 'nocha', leads: 44, sla: 78, engaged: 8, offers: 2, joined: 1 },
  { u: 'luis', leads: 31, sla: 64, engaged: 5, offers: 1, joined: 1 },
];
const SOURCES_EFF = [
  { s: 'Referral', pct: 4.8, w: 88, green: true },
  { s: 'Modex List', pct: 2.4, w: 45 },
  { s: 'Self-apply', pct: 1.6, w: 30 },
  { s: 'Event', pct: 1.1, w: 21 },
];
