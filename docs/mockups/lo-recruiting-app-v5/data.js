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
  offerApproval: 'auto', // 'auto' = band rule tự duyệt · 'manager' = chờ Manager (đổi trong Settings — dynamic, không chốt cứng)
  maxOpen: 13, // trần capacity mỗi recruiter (D24) — ôm đủ thì nút Claim mờ, không nhận thêm (demo: Brayan đang 12)
  cadence: { // D23/D24 — bậc nhắc tự động, dynamic config (không hardcode như OnboardedLOFollowUpCronOp)
    tiers: [1, 5, 7, 30],           // ngày kể từ lần chạm cuối
    scope: ['S1', 'S2', 'NURTURE'], // stage nào có cadence
    overdue: [{ days: 7, color: 'amber' }, { days: 14, color: 'red' }],
    stopOnInbound: true,            // luật Q35: lead trả lời (inbound) là chuỗi TỰ DỪNG
  },
};

/* ---- Role lens: ai thấy gì (row-level + field-level) ---- */
const ROLES = {
  recruiter: {
    user: 'brayan', label: 'Recruiter', icon: '🎯',
    landing: 'Việc hôm nay của TÔI — lead của mình + team',
    rules: ['Thấy: lead của mình / team', 'Comp: chỉ thấy band gợi ý', 'Không sửa số comp cuối'],
    nav: [['today', '☀️ Today'], ['kho', '🗄 Kho (S0)'], ['pipeline', '📊 Pipeline'], ['nurture', '🌙 Nurture'], ['comms', '💬 Hội thoại'], ['templates', '📨 Templates'], ['webinars', '🎥 Webinar'], ['portal', null], ['settings', null]],
    stages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'], seeComp: 'band', rows: 'own',
  },
  manager: {
    user: 'tracy', label: 'Manager', icon: '🧭',
    landing: 'Chỉ NGOẠI LỆ: trễ SLA, nghẽn, chờ duyệt — mọi thứ êm thì màn hình trống',
    rules: ['Thấy: toàn team, mọi stage', 'Comp: xem & duyệt', 'Quyền riêng: reassign, duyệt offer, Settings'],
    nav: [['exceptions', '🚨 Exceptions'], ['dashboard', '📈 Dashboard quá hạn'], ['pipeline', '📊 Pipeline'], ['kho', '🗄 Kho (S0)'], ['comms', '💬 Hội thoại (team)'], ['templates', '📨 Templates'], ['webinars', '🎥 Webinar'], ['automation', '⚡ Automation rules'], ['suppression', '⛔ Chặn liên hệ'], ['audit', '🧾 Audit log'], ['statuses', '🧬 Status model (draft)'], ['settings', '⚙️ Settings']],
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
    vol: 18.2, units: 41, since22: 96, licensed: '11 tháng', score: 84, verifySrc: 'MODEX',
    labels: ['High priority'], hasDup: 'kaprice2',
    slaMin: 220, // còn 3h40m
    caseNote: 'Lead mới từ Modex list — chưa từng liên hệ. Đồng hồ SLA first-touch đang chạy. ⚠ Kho có 1 bản NGHI TRÙNG (cùng NMLS).',
    ai: '“Hi Kaprice, this is Brayan with Loan Factory. Saw you closed 41 loans in your first year at Imperium — that’s a serious start. LOs at your volume usually keep 40–60% more per file on our comp plan. Worth a 10-minute call this week?”',
    /* idea CEO 13/08: AI soạn từ NGUỒN NGỮ CẢNH — lead lạnh lần đầu liên hệ nên chỉ có Modex, không bịa thêm */
    aiCtx: [{ k: 'MODEX', l: 'Modex: 41 loans năm đầu · $18.2M/96u' }],
    timeline: [['Aug 3', 'Lead tạo từ Modex list import (batch TMC) — auto-assign Brayan']],
  },
  {
    id: 'elizabeth', name: 'Elizabeth Knaack', av: 'EK', color: '#B45309',
    nmls: '', company: 'Mortgage Calculator Co', city: 'Tampa, FL', st: 'FL',
    stage: 'S1', source: 'Self-apply', owner: 'brayan',
    vol: null, units: null, licensed: null, score: null, verifySrc: 'SELF_REPORTED',
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
    vol: 41.2, units: 96, since22: 233, licensed: '9 năm', score: 88, verifySrc: 'MODEX',
    labels: ['Webinar Feb'], cadence: { tier: 2, label: 'bậc 2/4 — nhắc sau 5 ngày', due: 'hôm nay' },
    followUp: 'Sent comp sheet — check nếu đã mở, mời Zoom',
    /* Lịch sử Q&A nhiều phòng trên 1 hồ sơ: Licensing đã trả lời & relay xong · HR còn treo — Re mở hồ sơ đọc lại được hết */
    asks: [
      { to: 'LICENSING', q: 'TX sponsorship transfer mất bao lâu?', a: 'TX nhanh — 3–5 ngày làm việc sau khi nộp', answered: true, relayed: true, at: 'Aug 1', by: 'brayan' },
      { to: 'HR', q: 'Ứng viên hỏi W-2 vs 1099 — khác gì về comp plan & benefits?', a: '', answered: false, at: 'Aug 3', by: 'brayan' },
    ],
    caseNote: 'Đã gửi comp sheet — follow-up hôm nay để mời Zoom.',
    /* idea CEO 13/08: lead ẤM — AI đọc lịch sử cú gọi + note recruiter + email tracking + webinar để soạn câu MỞ LỜI CÓ TRÍ NHỚ */
    ai: '“Chad — last call you asked how our comp handles files over $800K; the sheet I sent covers it on page 2, and I saw you opened it this morning. You also stayed through the branch-manager Q&A at our Feb webinar — want 15 minutes with him directly?”',
    aiCtx: [
      { k: 'CALL', l: 'Cú gọi Jul 31 — quan tâm, xin comp sheet' },
      { k: 'NOTE', l: 'Note 31/07: “hỏi comp cho file >$800K”' },
      { k: 'EMAIL', l: 'Comp sheet Aug 1 — đã mở sáng nay (tracked)' },
      { k: 'WEBINAR', l: 'Webinar Feb — xem tới hết phần Q&A' },
      { k: 'MODEX', l: 'Modex $41.2M/96u' },
    ],
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
    id: 'hank', name: 'Hank Rossi', av: 'HR', color: '#C2410C',
    nmls: '1450778', company: 'PrimeLending', city: 'Charlotte, NC', st: 'NC',
    stage: 'S2', source: 'Modex List', owner: 'brayan',
    vol: 15.3, units: 35, since22: 82, licensed: '7 năm', score: 75, verifySrc: 'MODEX',
    suppressedSms: true,
    caseNote: 'Đã nhắn "STOP" ngày Jul 18 → suppression list chặn KÊNH SMS (TCPA). Call/email vẫn hợp lệ — nút SMS tự mờ ở MỌI màn (D18).',
    timeline: [['Jul 15', 'SMS intro'], ['Jul 18', 'Inbound "STOP" → STOP_SMS tự ghi vào suppression list — mọi SMS (tay + cadence) tự chặn từ đây']],
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
    /* ❓ Q&A phòng ban — 1 mảng chung cho MỌI phòng (Licensing/HR/Onboarding/Accounting), lưu vĩnh viễn trên hồ sơ */
    asks: [{ to: 'LICENSING', q: 'CA: DRE license — cần corporate filing gì không?', a: 'DRE cần thêm corporate filing, ~3 tuần', answered: false, at: 'Jul 30', by: 'brayan' }],
    caseNote: 'Đang chờ câu trả lời DRE (CA) từ Licensing — recruiter hỏi TRƯỚC khi offer, khỏi bể kèo sau.',
    timeline: [['Jul 29', 'Webinar Q&A — hỏi về California DRE'], ['Jul 30', 'Recruiter gửi câu hỏi cho Licensing (in-app, không email)']],
  },
  {
    id: 'roger', name: 'Roger Kube', av: 'RK', color: '#E8570E',
    nmls: '107621', company: 'Fairway Independent Mortgage', city: 'Plano, TX', st: 'TX',
    stage: 'S4', source: 'Referral', owner: 'brayan',
    vol: 103.85, units: 138, since22: 312, avgLoan: '$752K', licensed: '15 năm', score: 100,
    verified: 'Aug 1 · fresh', mix: { purchase: 61, refi: 39, conv: 72, va: 18, fha: 10 }, verifySrc: 'MODEX',
    meeting: { status: 'done', on: 'Jul 28', via: 'Calendly' },
    offer: { status: 'REQUESTED', band: 'P4', waitDays: 2, requestedBy: 'brayan', snapshot: { vol: 103.85, units: 138, source: 'MODEX', asOf: 'Aug 1' } },
    caseNote: 'Verified fresh (Aug 1). Offer request band P4 đang chờ manager duyệt — 2 ngày.',
    ai: '“Roger — following up on our Zoom. With $103.8M across 138 units you’d sit in our top comp tier. I’ve asked my manager to fast-track your offer; expect the package this week.”',
    aiCtx: [
      { k: 'MEETING', l: '1-1 đã họp Jul 28 (Calendly)' },
      { k: 'CALL', l: 'Zoom Jul 28 với branch manager — notes đính kèm' },
      { k: 'MODEX', l: 'Verified $103.85M/138u (as-of Aug 1)' },
    ],
    timeline: [['Jul 24', 'First call — quan tâm comp structure'], ['Jul 28', 'Zoom với branch manager — notes đính kèm'], ['Jul 30', 'Brayan nhập NMLS → auto-add vào synced list'], ['Aug 1', 'Verified — Modex payload về (webhook), card tự cập nhật'], ['Aug 1', 'Brayan bấm Request offer approval → chờ Tracy']],
  },
  {
    id: 'angela', name: 'Angela Ho', av: 'AH', color: '#2E7D57',
    nmls: '1544207', company: 'NewRez', city: 'San Antonio, TX', st: 'TX',
    stage: 'S4', source: 'Modex List', owner: 'seth',
    vol: 8.4, units: 19, since22: 44, licensed: '3 năm', score: 76,
    verified: 'Aug 1', mix: { purchase: 70, refi: 30, conv: 80, va: 12, fha: 8 }, verifySrc: 'MODEX',
    meeting: { status: 'booked', on: 'Aug 5', via: 'Calendly' },
    offer: { status: 'REQUESTED', band: 'P2', waitDays: 4, requestedBy: 'seth', note: 'muốn remote, hỏi về đội TX', snapshot: { vol: 8.4, units: 19, source: 'MODEX', asOf: 'Aug 1' } },
    signal: 'Volume +38% ($6.1M → $8.4M) — vượt tier, comp band cũ không còn đúng',
    caseNote: 'Từ nurture thức dậy nhờ signal volume +38%. Offer request chờ duyệt 4 ngày — đang làm nghẽn S4→S5.',
    timeline: [['Mar 12', 'Vào nurture — “chưa sẵn sàng, hỏi lại mùa hè”'], ['Aug 1', 'Modex refresh: volume +38% → signal bắn cho recruiter'], ['Aug 1', 'Re-engage call — giờ thì sẵn sàng'], ['Aug 1', 'Request offer approval']],
  },
  {
    id: 'trent', name: 'Trent Malone', av: 'TM', color: '#8A5A44',
    nmls: '556201', company: 'Caliber', city: 'Houston, TX', st: 'TX',
    stage: 'S5', source: 'Referral', owner: 'brayan', paid: true,
    vol: 67.9, units: 122, since22: 290, licensed: '11 năm', score: 92,
    meeting: { status: 'done', on: 'Jul 22', via: 'Calendly' },
    offer: { status: 'VIEWED', band: 'P3', sent: 'Jul 29', viewedNote: 'mở 3 lần, dừng ở trang comp', stallDays: 5, pay: 'Cash', snapshot: { vol: 67.9, units: 122, source: 'MODEX', asOf: 'Jul 25' } },
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
      'Licensing':    [['NMLS transfer', false], ['SC distance rule', false, 'blocked'], ['Background check (luật bang — GIẢ ĐỊNH)', false], ['State filing OK', true], ['W-9 license copy', true], ['E&O insurance', false]],
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

  /* ---- S0 · KHO — CHƯA có owner. Cold (danh bạ Modex) vs HOT (tự giơ tay → đồng hồ chờ-nhận của TEAM) ---- */
  {
    id: 'omar', name: 'Omar Haddad', av: 'OH', color: '#2E7D57',
    nmls: '1988420', company: 'Rate.com', city: 'Chicago, IL', st: 'IL',
    stage: 'S0', source: 'Modex List', owner: null, cold: true,
    vol: 29.8, units: 66, since22: 161, licensed: '9 năm', score: 88,
    caseNote: 'COLD — nằm kho từ đợt import Feb, điểm cao nhất kho. Không đồng hồ; recruiter đi "săn" thì Claim.',
    timeline: [['Feb 10', 'Import Modex list (batch TMC) — vào kho, chưa có owner']],
  },
  {
    id: 'wanda', name: 'Wanda Perez', av: 'WP', color: '#7C5CBF',
    nmls: '2455091', company: 'UWM Retail', city: 'Miami, FL', st: 'FL',
    stage: 'S0', source: 'Modex List', owner: null, cold: true,
    vol: 14.2, units: 31, since22: 74, licensed: '6 năm', score: 79,
    caseNote: 'COLD — danh bạ Modex, chưa ai đụng.',
    timeline: [['Feb 10', 'Import Modex list — vào kho']],
  },
  {
    id: 'kaprice2', name: 'Kaprice Nicholson', av: 'KN', color: '#8A93A2',
    nmls: '2667971', company: 'Imperium Lending', city: 'Charlotte, NC', st: 'NC',
    stage: 'S0', source: 'Modex List', owner: null, cold: true, dupOf: 'kaprice',
    vol: 18.2, units: 41, since22: 96, licensed: '11 tháng', score: 84,
    caseNote: 'NGHI TRÙNG với Kaprice (S1) — cùng NMLS 2667971, khác email. Hệ cũ chỉ dán nhãn "(Duplicated)" rồi để đó; ở đây có flow GỘP (D17).',
    timeline: [['Feb 10', 'Import Modex list — batch khác, cùng NMLS với record đang ở S1'], ['Hôm nay', '⚠ Máy phát hiện trùng theo NMLS chuẩn hoá → banner gộp trên cả 2 hồ sơ']],
  },
  {
    id: 'nina', name: 'Nina Volkov', av: 'NV', color: '#B45309',
    nmls: '', company: '—', city: 'Seattle, WA', st: 'WA',
    stage: 'S0', source: 'Event · Webinar', owner: null, hot: true, claimMin: 150,
    vol: null, units: null, score: null,
    caseNote: 'HOT — vừa đăng ký webinar, CHƯA ai nhận. Đồng hồ chờ-nhận của cả TEAM đang chạy (không phải của cá nhân nào).',
    timeline: [['Hôm nay', 'Đăng ký webinar “Comp that makes sense” → vào khay chờ nhận, đồng hồ team 4h chạy']],
  },
  {
    id: 'raj', name: 'Raj Patel', av: 'RJ', color: '#0E7490',
    nmls: '2237761', company: 'NEXA', city: 'Phoenix, AZ', st: 'AZ',
    stage: 'S0', source: 'Self-apply', owner: null, hot: true, claimMin: 35,
    vol: 7.6, units: 18, since22: 41, licensed: '3 năm', score: 72,
    caseNote: 'HOT — tự apply 3,5h trước, còn 35 phút là bể SLA chờ-nhận (4h). Không ai nhận nữa → tự leo lên màn Exceptions của Manager.',
    timeline: [['Hôm nay', 'Self-apply qua website → khay chờ nhận']],
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

/* =========================================================
   v5 — DATA MỚI cho 10 màn còn thiếu (theo docs/MOCKUP-AUDIT.md)
   ========================================================= */

/* ---- 💬 Conversations (D29/D36): thread hợp nhất SMS+email+call theo lead ---- */
const THREADS = [
  { cand: 'chad', unread: true, last: '09:41 hôm nay', msgs: [
    { dir: 'out', kind: 'EMAIL', who: 'brayan', when: 'Aug 1', text: 'Comp sheet đính kèm — anh xem thử phần fee structure nhé.' },
    { dir: 'in',  kind: 'EMAIL', who: 'chad',   when: '09:41 hôm nay', text: 'Looks interesting. What does the 250bps actually cover?' },
    { dir: 'note', kind: 'INTERNAL', who: 'brayan', when: '09:50', text: '🔒 (INTERNAL) Chad đang so với offer của CrossCountry — đừng nhả thêm số trước buổi Zoom.' },
  ]},
  { cand: 'trent', unread: true, last: '08:15 hôm nay', msgs: [
    { dir: 'out', kind: 'SMS', who: 'brayan', when: 'Aug 1', text: 'Trent — offer đã gửi qua email, anh xem giúp phần comp nhé.' },
    { dir: 'in',  kind: 'SMS', who: 'trent',  when: '08:15 hôm nay', text: 'Đang xem. Tuần này call nhanh 15p được không?' },
  ]},
  { cand: 'jenna', unread: false, last: 'Jul 31', msgs: [
    { dir: 'out', kind: 'CALL', who: 'brayan', when: 'Jul 31', text: '📞 4 phút — giới thiệu, hẹn gửi tài liệu (log tự ghi từ Zoom Phone).' },
  ]},
  { cand: 'hank', unread: false, last: 'Jul 18', msgs: [
    { dir: 'out', kind: 'SMS', who: 'brayan', when: 'Jul 15', text: 'Hank — Brayan bên Loan Factory, 82 loans since 2022 là số đẹp…' },
    { dir: 'in',  kind: 'SMS', who: 'hank',   when: 'Jul 18', text: 'STOP' },
    { dir: 'sys', kind: 'SYS', who: null, when: 'Jul 18', text: '⛔ STOP_SMS tự ghi vào suppression list — kênh SMS chặn từ đây (TCPA), call/email vẫn hợp lệ.' },
  ]},
  { cand: 'maria', unread: false, last: 'Jul 30', ownerOverride: 'brayan', msgs: [
    { dir: 'out', kind: 'EMAIL', who: 'brayan', when: 'Jul 30', text: 'Maria — mình đã hỏi Licensing về DRE California, có câu trả lời sẽ báo ngay.' },
  ]},
  { cand: 'gary', unread: true, last: '07:58 hôm nay', teamOnly: true, msgs: [
    { dir: 'in', kind: 'SMS', who: 'gary', when: '07:58 hôm nay', text: 'Hi, còn slot webinar tuần sau không?' },
    { dir: 'sys', kind: 'SYS', who: null, when: '07:58', text: '⚠ Owner (Nocha) đang OOO — inbound chưa ai trả lời. Manager thấy dòng này, Brayan (rows=own) KHÔNG thấy.' },
  ]},
];

/* ---- 📨 Templates (D26): vòng đời DRAFT → IN_REVIEW → ACTIVE → RETIRED ---- */
const TEMPLATES = [
  { id: 't1', type: 'EMAIL', stage: 'S1', name: 'Intro — first touch', status: 'ACTIVE', by: 'Victoria Pham', updated: 'Jul 12', body: 'Hi ${first_name}, this is ${sender} with Loan Factory. Saw you closed ${loans_since_2022} loans since 2022…' },
  { id: 't2', type: 'SMS', stage: 'S1', name: 'Intro SMS ngắn', status: 'ACTIVE', by: 'Victoria Pham', updated: 'Jul 12', body: '${first_name} — ${sender} @ Loan Factory. 10 phút tuần này nói chuyện comp? ${calendly_link}' },
  { id: 't3', type: 'CALL_SCRIPT', stage: 'S2', name: 'Script comp talk (S2 · Contacted)', status: 'ACTIVE', by: 'Victoria Pham', updated: 'Jun 30', body: 'Mở lời: nhắc production của họ (loans since 2022). Điểm chốt: 250bps · 100% commission · fee structure minh bạch · referral bonus. KHÔNG hứa số comp cụ thể — đó là việc của offer. Chốt: mời Zoom 15 phút / gửi comp sheet.' },
  { id: 't4', type: 'CALL_SCRIPT', stage: 'S3', name: 'Script objection-handling (S3 · Engaged)', status: 'ACTIVE', by: 'Victoria Pham', updated: 'Jun 30', body: '"Tôi đang ổn ở chỗ cũ" → hỏi họ giữ được bao nhiêu mỗi file. "Sợ đổi LOS" → kể onboarding 4 phòng song song, có checklist. Chốt: xin NMLS để verify số thật.' },
  { id: 't5', type: 'EMAIL', stage: 'S2', name: 'Comp sheet follow-up v2', status: 'IN_REVIEW', by: 'Brayan Suarez', updated: 'hôm qua', body: '(bản Brayan viết lại, thêm bảng so sánh net-per-file) — chờ duyệt' },
  { id: 't6', type: 'SMS', stage: 'NURTURE', name: 'Wake-up nhẹ nhàng', status: 'DRAFT', by: 'Brayan Suarez', updated: 'hôm nay', body: '${first_name}, hẹn "${nurture_note}" của mình tới rồi — tình hình bên đó sao rồi? ☕' },
  { id: 't7', type: 'EMAIL', stage: 'S5', name: 'Offer reminder (bản 2024)', status: 'RETIRED', by: '—', updated: 'Feb 2', body: '(đã thay bằng flow nhắc tự động của document-esign)' },
];

/* ---- 🎥 Webinar (D40): điểm danh tự động qua Meet API, CSV fallback ---- */
const WEBINARS = [
  { id: 'w1', title: 'Comp that makes sense', when: 'Aug 14 · 11:00 PT', status: 'UPCOMING', reg: 41, seq: 2,
    note: 'Chuỗi 6 email đang chạy — bước 2/6 (nhắc T-7) đã gửi 38/41, 3 bounce.' },
  { id: 'w2', title: 'Scaling past $30M', when: 'Jul 31 · 11:00 PT', status: 'DONE', reg: 58, seq: 6, synced: false,
    attendees: [
      { name: 'Gary Boyd', cand: 'gary', joined: '11:02', left: '11:48', dur: '46m' },
      { name: 'Nina Volkov', cand: 'nina', joined: '11:00', left: '11:55', dur: '55m' },
      { name: 'Wanda Perez', cand: 'wanda', joined: '11:10', left: '11:22', dur: '12m' },
      { name: 'P. Okafor', cand: null, noShow: true },
      { name: 'D. Kimura', cand: null, noShow: true },
    ]},
];

/* ---- ⚡ Automation rules (EVIDENCE §5): port Escalation Desk, INPUT = đèn tự động, OUTPUT = việc có trạng thái ---- */
const AUTORULES = [
  { id: 'r1', on: true,  prio: 'High',   when: 'Đèn PAID bật', then: 'Tạo việc "Book buổi 1-1 pre-onboarding" → Recruiting (owner của lead)', src: 'Escalation Desk: "Status=Onboarding + Paid → make sure signed and paid"' },
  { id: 'r2', on: true,  prio: 'High',   when: 'PAID + SIGNED + 1-1 done', then: 'Mở checklist "Start NMLS onboarding" → Licensing', src: 'Escalation Desk: ticket 09-Licensing' },
  { id: 'r3', on: true,  prio: 'Normal', when: 'Đèn SPONSORED bật (mọi bang xin đều OK)', then: 'Tạo việc "License approved — chạy checklist HR" → HR', src: 'Escalation Desk: ticket 08-HR' },
  { id: 'r4', on: true,  prio: 'Normal', when: 'Đèn HR = Xong', then: 'Tạo việc "Setup Call với người mới" → Recruiting', src: 'Escalation Desk: ticket 14' },
  { id: 'r5', on: true,  prio: 'Normal', when: 'Checklist onboarding 100% (S7)', then: 'Tạo việc "Training + gán Support Specialist" → LO Support', src: 'Escalation Desk: ticket 08 + 00-LO Support' },
  { id: 'r6', on: false, prio: 'High',   when: 'Đồng hồ chờ-nhận kho HOT bể (quá 4h không ai claim)', then: 'Alert lên Exceptions của Manager', src: 'rule MỚI — hệ cũ không có khái niệm chờ-nhận' },
  { id: 'r7', on: true,  prio: 'High',   when: 'PAID + SIGNED + 1-1 done', then: 'GỬI REQUEST TẠO ACCOUNT sang HR app (kèm data ứng viên) — user-service báo xong → đèn ACCOUNT tự bật', src: 'thay bước HR bấm tay "CREATE NEW ASSOCIATES" của hệ cũ; đường thường TỰ ĐỘNG, nút ⚡ override chỉ là ngoại lệ (D35)' },
];

/* ---- 🧾 Audit log (D38) ---- */
const AUDIT_EVENTS = [
  { when: '09:52 hôm nay', who: 'Victoria Pham', what: 'CONFIG_CHANGE', target: 'SLA "First touch" 24h → 12h', detail: 'áp cho lead mới, không hồi tố' },
  { when: '09:14 hôm nay', who: 'Miley Dau', what: 'OVERRIDE_GATE', target: 'Tạo account vượt cổng — (demo)', detail: 'lý do: "CEO approve — start gấp"' },
  { when: 'hôm qua', who: 'Brayan Suarez', what: 'BULK_SMS', target: '14 record (template Intro SMS)', detail: '2 record bị chặn bởi suppression — tự loại' },
  { when: 'hôm qua', who: 'Victoria Pham', what: 'TEMPLATE_APPROVE', target: '"Comp sheet follow-up v2" → ACTIVE', detail: 'thay bản Jul 12' },
  { when: 'Jul 30', who: 'Victoria Pham', what: 'REASSIGN', target: 'Tara Wilkins: Luis → Brayan', detail: 'SLA reset · lý do: trễ 4 lần' },
  { when: 'Jul 28', who: 'Dave Hoàng', what: 'CANDIDATE_DELETE', target: '1 record test "Test Test"', detail: 'quyền CANDIDATE_DELETE — chỉ Admin/HR có (D27)' },
];

/* ---- ⛔ Suppression list (D18): STOP_SMS theo KÊNH vs BLACKLIST theo NGƯỜI ---- */
const SUPPRESSION = [
  { type: 'STOP_SMS', ident: '+1 (704) 555-0132 · Hank Rossi', since: 'Jul 18', src: 'Inbound "STOP" — tự động (TCPA)', scope: 'Chỉ kênh SMS — call/email vẫn hợp lệ', cand: 'hank' },
  { type: 'STOP_SMS', ident: '+1 (312) 555-8807 · (không khớp record nào)', since: 'Jun 4', src: 'Inbound "UNSUBSCRIBE"', scope: 'Sống độc lập với record — tạo record mới cùng số vẫn bị chặn' },
  { type: 'BLACKLIST', ident: 'NMLS 1450992 · Carl Mendez', since: 'May 2', src: 'HR đánh dấu — vi phạm hợp đồng lần trước', scope: 'MỌI kênh + không tuyển lại', rehire: 'xét lại từ 01/2027' },
];

/* ---- 🏷 Labels (Q41 — hybrid: gõ tự do + catalog + chuẩn hoá chống trùng) ---- */
const LABEL_CATALOG = ['High priority', 'Webinar Feb', 'Spanish speaker', 'Referral VIP', 'Cần gọi tối'];

/* ---- ⬆ Import batches (bài học bug count=0 của hệ cũ) ---- */
const IMPORT_BATCHES = [
  { file: 'modex-tmc-feb.csv', when: 'Feb 10', rows: 1840, ok: 1802, dup: 31, fail: 7, status: 'DONE' },
  { file: 'webinar-jul31-registrants.csv', when: 'Aug 1', rows: 58, ok: 58, dup: 0, fail: 0, status: 'DONE' },
];

/* ---- 📈 Dashboard quá hạn (Q37): recruiter × tháng-tạo-lead = số lead quá hạn follow-up ---- */
const PIVOT = {
  months: ['Th4', 'Th5', 'Th6', 'Th7', 'Th8'],
  rows: [
    { u: 'brayan', cells: [0, 1, 0, 2, 1] },
    { u: 'seth',   cells: [0, 0, 1, 1, 0] },
    { u: 'nocha',  cells: [2, 1, 3, 4, 2] },
    { u: 'luis',   cells: [1, 2, 2, 5, 3] },
  ],
  drill: { // (recruiter|tháng) → tên lead quá hạn — bấm ô là ra
    'luis|Th7': ['Tara Wilkins (26h)', 'M. Delgado (9 ngày)', 'K. Osei (12 ngày)', 'B. Tran (15 ngày)', 'J. Whitman (21 ngày)'],
    'nocha|Th7': ['Gary Boyd (25h)', 'A. Fontaine (8 ngày)', 'R. Silva (11 ngày)', 'T. Nakamura (19 ngày)'],
    'brayan|Th7': ['C. Bishop (7 ngày)', 'D. Reyes (10 ngày)'],
  },
};
