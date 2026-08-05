/* =========================================================
   LF Recruit — interactive prototype · STATE + ACTIONS
   Load order: data.js → views-pipeline.js → views-roles.js → app.js
   ========================================================= */

const S = {
  role: null,          // key trong ROLES, null = màn login
  screen: null,        // nav hiện tại
  view: 'kanban',      // pipeline sub-view: kanban|table|focus|funnel
  sel: null,           // candidate id đang mở drawer 360
  focusIdx: 0,         // vị trí trong focus queue
  focusDone: [],       // [{id, note}]
  tableChecked: [],    // ids đã tick trong table view
  log: [],             // hoạt động phát sinh trong phiên demo
  sim: 'normal',       // giả lập trạng thái: normal | quiet | modexDown | esignDown
};

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const C = (id) => CANDIDATES.find((c) => c.id === id);
const role = () => ROLES[S.role];
const me = () => USERS[role().user];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

function toast(html) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = html;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3800);
}

function addTl(c, txt) {
  c.timeline = c.timeline || [];
  c.timeline.push(['Hôm nay', txt]);
}

/* Giả lập trạng thái hệ thống (empty/error states có hệ thống) */
const simE = (arr) => (S.sim === 'quiet' ? [] : arr);
function setSim(v) {
  S.sim = v;
  const msg = {
    normal: 'Trở về trạng thái bình thường.',
    quiet: '🎉 <b>Ngày vắng</b>: mọi task queue trống — xem empty state của từng màn. Với Manager, "màn hình trống" chính là thành công.',
    modexDown: '💥 <b>Modex webhook down</b>: banner degraded-mode, enrichment lỗi + tự retry, data verify chuyển sang as-of cũ (fallback §9.9).',
    esignDown: '💥 <b>e-sign service down</b>: nút gửi/nhắc offer bên HR tạm khoá, trạng thái sẽ đồng bộ lại khi service hồi.',
  }[v];
  if (S.role) render();
  toast(msg);
}

/* Row-level lens: role này được thấy những candidate nào */
function visibleCands() {
  const r = role();
  return CANDIDATES.filter((c) => {
    if (r.rows === 'referred') return c.referredBy === r.user || c.referredBy === 'david';
    if (c.stage === 'NURTURE') return r.rows !== 'referred' && (r.rows === 'all' || c.owner === r.user);
    if (!r.stages.includes(c.stage)) return false;
    if (r.rows === 'own') return c.owner === r.user || c.owner === 'brayan'; // demo: recruiter = Brayan
    return true;
  });
}

/* Field-level lens: comp hiển thị thế nào */
function compView(c) {
  const mode = role().seeComp;
  if (mode === 'none') return '<span class="mask">🔒 ••••••</span>';
  const band = c.offer?.band || suggestBand(c);
  if (mode === 'band') return `<b>Band ${band}</b> (gợi ý)`;
  const b = CONFIG.compBands.find((x) => x.id === band);
  return `<b>${band}</b> — ${b ? b.rule : ''}`;
}

function suggestBand(c) {
  if (!c.vol) return 'P1';
  if (c.vol >= 100 || c.units >= 120) return 'P4';
  if (c.vol >= 25) return 'P3';
  if (c.vol >= 5) return 'P2';
  return 'P1';
}

function slaChip(c) {
  if (c.slaMin == null) return '';
  if (c.slaMin < 0) return `<span class="chip red">⏱ TRỄ ${c.breachedFor || ''}</span>`;
  const h = Math.floor(c.slaMin / 60), m = c.slaMin % 60;
  const total = CONFIG.sla.find((p) => p.id === 'touch').hours * 60;
  const cls = c.slaMin < total * (CONFIG.sla[1].warnPct / 100) ? 'red' : 'amber';
  return `<span class="chip ${cls}">⏱ còn ${h}h ${String(m).padStart(2, '0')}m</span>`;
}

function stageChip(c) {
  const map = { S1: 'orange', S2: 'grey', S3: 'blue', S4: 'green', S5: 'amber', S6: 'green', S7: 'green', NURTURE: 'grey' };
  const st = STAGES.find((s) => s.id === c.stage);
  return `<span class="chip ${map[c.stage] || 'grey'}">${c.stage === 'NURTURE' ? '🌙 Nurture' : c.stage + ' · ' + st.name}</span>`;
}

const fmtVol = (c) => (c.vol == null ? '—' : `$${c.vol}M · ${c.units}u`);

/* ---------- ACTIONS (mọi nút bấm gọi vào đây) ---------- */

function actContact(id, kind) {
  const c = C(id);
  const via = { call: 'Call qua Zoom Phone', sms: 'SMS qua Zoom service', email: 'Email' }[kind];
  addTl(c, `${via} bởi ${me().name} — activity log tự ghi`);
  if (c.stage === 'S1') { c.stage = 'S2'; c.slaMin = null; addTl(c, 'First touch ✓ → tự chuyển S2 · Contacted (SLA dừng)'); }
  toast(`📞 <b>${esc(c.name)}</b> — ${via}. Activity log tự ghi → SLA tự tính, không khai tay.`);
  render();
}

function actAdvance(id) {
  const c = C(id);
  const order = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const i = order.indexOf(c.stage);
  if (i < 0 || i >= 6) return;
  const next = order[i + 1];
  // gates
  if (next === 'S4' && !c.nmls) { toast(`🚫 Gate S3→S4: <b>${esc(c.name)}</b> chưa có NMLS — nhập NMLS để verify trước.`); return; }
  if (next === 'S5') {
    if (!c.offer || c.offer.status === 'NONE') {
      c.offer = { status: 'REQUESTED', band: suggestBand(c), waitDays: 0, requestedBy: role().user };
      addTl(c, `Request offer approval (band ${c.offer.band}) → chờ manager duyệt`);
      toast(`✍️ Gate S4→S5: đã tạo <b>offer request</b> band ${c.offer.band} — chờ Manager duyệt (xem role Manager).`);
      render(); return;
    }
    if (c.offer.status === 'REQUESTED') { toast(`⏳ <b>${esc(c.name)}</b>: offer request đang chờ Manager duyệt — recruiter không tự qua gate này được.`); return; }
  }
  c.stage = next;
  addTl(c, `Chuyển ${order[i]} → ${next} bởi ${me().name}`);
  toast(`➡️ <b>${esc(c.name)}</b> → ${next}. Timeline ghi lại ai chuyển, lúc nào.`);
  render();
}

function actApprove(id) {
  const c = C(id);
  c.offer.status = 'APPROVED';
  c.stage = 'S5';
  addTl(c, `Manager ${me().name} duyệt offer band ${c.offer.band} → S5, sang bàn HR`);
  toast(`✅ Duyệt offer <b>${esc(c.name)}</b> (band ${c.offer.band}) → chuyển S5. Đổi sang role <b>HR</b> sẽ thấy việc "soạn offer" hiện ra.`);
  render();
}

function actChangeBand(id) {
  const c = C(id);
  const bands = CONFIG.compBands.map((b) => b.id);
  const cur = bands.indexOf(c.offer.band);
  c.offer.band = bands[(cur + 1) % bands.length];
  addTl(c, `Manager đổi band → ${c.offer.band} (có ghi lý do trong bản thật)`);
  toast(`🔁 Band của <b>${esc(c.name)}</b> → <b>${c.offer.band}</b> (demo: bấm xoay vòng; bản thật là dropdown + lý do).`);
  render();
}

function actReassign(id, toUser) {
  const c = C(id);
  const from = USERS[c.owner]?.name || c.owner;
  c.owner = toUser;
  c.slaMin = 200; c.breachedFor = null;
  addTl(c, `Reassign ${from} → ${USERS[toUser].name} bởi manager · SLA reset`);
  toast(`🔀 <b>${esc(c.name)}</b>: ${esc(from)} → <b>${USERS[toUser].name}</b>. SLA reset, audit log ghi lại.`);
  render();
}

function actDraftOffer(id) {
  const c = C(id);
  c.offer.status = 'SENT'; c.offer.sent = 'hôm nay'; c.offer.stallDays = 0; c.offer.pay = c.offer.pay || 'Cash';
  addTl(c, `HR soạn offer (số liệu snapshot đóng băng) → gửi qua document-esign`);
  toast(`📤 Offer <b>${esc(c.name)}</b> đã gửi qua <b>document-esign</b>. Trạng thái viewed/signed sẽ tự cập nhật.`);
  render();
}

function actSign(id) {
  const c = C(id);
  c.offer.status = 'SIGNED'; c.stage = 'S6'; c.signedOn = 'hôm nay'; c.dayN = 0;
  c.checklist = c.checklist || {
    'Licensing': [['NMLS transfer', false], ['State rules check', false], ['E&O insurance', false]],
    'HR paperwork': [['Employment agreement', true], ['I-9', false], ['Direct deposit', false]],
    'IT & systems': [['Email + SSO', false], ['LOS account', false]],
    'Accounting': [['Payroll setup', false], ['Comp plan vào hệ thống', false]],
  };
  addTl(c, 'Signed ✓ → TỰ chuyển S6, checklist 4 phòng ban tự mở (không ai chuyển tay)');
  toast(`✍️ <b>${esc(c.name)}</b> đã ký! Tự chuyển S6 — đổi role <b>Onboarding/Licensing</b> sẽ thấy checklist mở sẵn.`);
  render();
}

function actRemind(id) {
  const c = C(id);
  addTl(c, 'HR gửi reminder e-sign + recruiter được nhắc gọi');
  toast(`🔔 Đã nhắc <b>${esc(c.name)}</b> (email tự động) + tạo task gọi cho recruiter ${USERS[c.owner].name}.`);
  render();
}

function actTick(id, dept, idx) {
  const c = C(id);
  const item = c.checklist[dept][idx];
  item[1] = !item[1];
  if (item[1] && item[2] === 'blocked') item[2] = null;
  addTl(c, `${dept}: "${item[0]}" ${item[1] ? '✓ xong' : 'mở lại'} bởi ${me().name}`);
  const all = Object.values(c.checklist).flat();
  if (all.every((x) => x[1])) {
    c.stage = 'S7'; c.joinedOn = c.joinedOn || 'hôm nay';
    if (c.referredBy && c.bonus) c.bonus.clockNote = 'đồng hồ 60 ngày đang chạy';
    addTl(c, '🎉 Checklist 100% → TỰ chuyển S7 Active · attribution đóng băng · bonus clock chạy');
    toast(`🎉 <b>${esc(c.name)}</b> đủ 100% checklist → tự chuyển <b>S7 Active</b>. Đổi role <b>Referring LO</b> xem card của David đổi theo!`);
  }
  render();
}

function actNudge(id, dept) {
  toast(`📣 Đã nhắc phòng <b>${esc(dept)}</b> về ${esc(C(id).name)} — in-app + Slack, không cần email qua lại.`);
}

function actAnswerRelay(id) {
  const c = C(id);
  c.licRelay.answered = true;
  addTl(c, `Licensing trả lời: "${c.licRelay.a}" → task relay tự tạo cho recruiter ${USERS[c.owner].name}`);
  toast(`📨 Đã gửi trả lời cho recruiter <b>${USERS[c.owner].name}</b>. Đổi role Recruiter: follow-up "Relay câu trả lời" xuất hiện.`);
  render();
}

function actLicDone(id) {
  const c = C(id);
  if (c.licensing) c.licensing.status = 'OK';
  addTl(c, `Licensing: ${me().name} đánh dấu xong state rules`);
  toast(`✅ Licensing của <b>${esc(c.name)}</b> xong — checklist Licensing bên Onboarding cũng thấy trạng thái này.`);
  render();
}

function actPay(id) {
  const c = C(id);
  c.bonus.paid = true;
  addTl(c, `Accounting phát lệnh trả bonus → khoá vĩnh viễn (idempotency)`);
  toast(`💵 Bonus của <b>${esc(c.name)}</b> đã phát lệnh — record KHOÁ vĩnh viễn, không thể trả trùng (bài học hệ cũ).`);
  render();
}

function actReengage(id) {
  const c = C(id);
  c.stage = 'S2'; c.nurtureSince = null;
  addTl(c, `Re-engage từ nurture (signal Modex) bởi ${me().name} → S2`);
  toast(`🔥 <b>${esc(c.name)}</b> quay lại pipeline (S2). Signal từ Modex refresh — nurture list tự canh mình.`);
  render();
}

function actFocusNext(logIt) {
  const q = focusQueue();
  const cur = q[S.focusIdx];
  if (cur) {
    if (logIt) { addTl(cur, `Focus mode: xử lý xong bởi ${me().name}`); S.focusDone.push(cur.id); }
    else { S.focusDone.push(cur.id); addTl(cur, 'Focus mode: skip (lý do ghi lại)'); }
  }
  if (S.focusIdx < q.length - 1) S.focusIdx++;
  toast(logIt ? '✓ Logged — người kế tiếp.' : '⏭ Skipped — lý do đã ghi, người kế tiếp.');
  render();
}

function actAI(id, tone) {
  const c = C(id);
  const t = {
    short: '“Kaprice — Brayan @ Loan Factory. 41 loans năm đầu là số đẹp. 10 phút tuần này nói chuyện comp?”',
    comp: '“Hi Kaprice — với 41 units/12m, comp plan của LF thường giúp LO giữ thêm 40–60% mỗi file so với retail. Tôi gửi bảng so sánh nhé?”',
    rewrite: '“Chào Kaprice, tôi là Brayan (Loan Factory). Theo dõi production của bạn qua NMLS data — ấn tượng thật sự. Bạn có 10 phút tuần này không?”',
  }[tone];
  c.ai = t || c.ai;
  toast('✨ AI viết lại draft — recruiter luôn sửa được trước khi gửi, không auto-send.');
  render();
}

function actAddLead(ev) {
  ev.preventDefault();
  const f = ev.target;
  const name = f.lname.value.trim(); if (!name) return false;
  const nmls = f.lnmls.value.trim();
  const id = 'new' + Date.now();
  const c = {
    id, name, av: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(), color: '#0E7490',
    nmls, company: f.lcompany.value.trim() || '—', city: f.lcity.value.trim() || '—', st: '',
    stage: 'S1', source: f.lsource.value, owner: 'brayan',
    vol: null, units: null, score: null, slaMin: CONFIG.sla.find((p) => p.id === 'touch').hours * 60,
    caseNote: 'Lead vừa thêm trong demo.',
    timeline: [['Hôm nay', `Thêm bởi ${me().name} (${f.lsource.value})${nmls ? ' — có NMLS, enrichment queued' : ' — CHƯA có NMLS'}`]],
  };
  CANDIDATES.unshift(c);
  closeModal();
  toast(`＋ Lead <b>${esc(name)}</b> vào S1, SLA ${CONFIG.sla[1].hours}h bắt đầu chạy.${nmls ? ' ⚡ Zero-click enrichment: đang kéo Modex…' : ' Chưa có NMLS — nhớ hỏi để enrich.'}`);
  render();
  if (nmls) setTimeout(() => {
    if (S.sim === 'modexDown') {
      c.enrichFail = 'Modex webhook down — hệ thống tự retry, không mất record';
      addTl(c, '⚠ Enrichment LỖI: Modex webhook down → vào hàng retry tự động, card giữ nguyên chờ data');
      toast(`⚠ <b>${esc(name)}</b>: enrichment lỗi (Modex down) — tự retry, KHÔNG cần ai nhập tay lại.`);
    } else if (nmls.endsWith('0')) {
      c.enrichFail = 'Modex unmatched — NMLS không khớp, cần verify tay';
      addTl(c, '⚠ Modex UNMATCHED: NMLS không khớp record nào → task "verify tay" tự tạo cho recruiter');
      toast(`⚠ <b>${esc(name)}</b>: Modex unmatched (NMLS không khớp) — task verify tay tự tạo. (Demo: NMLS kết thúc bằng 0 → unmatched.)`);
    } else {
      c.vol = 12.7; c.units = 29; c.licensed = '4 năm'; c.score = 77; c.enrichFail = null;
      addTl(c, '⚡ Modex payload về (webhook) — production tự điền, không ai gõ tay');
      toast(`⚡ <b>${esc(name)}</b> enriched: $12.7M · 29u (Modex webhook). Zero-click.`);
    }
    render();
  }, 2600);
  return false;
}

function actSaveSla(id, val) {
  const p = CONFIG.sla.find((x) => x.id === id);
  p.hours = +val;
  toast(`⚙️ SLA "<b>${esc(p.label)}</b>" → <b>${val}h</b>. Áp cho lead MỚI (không breach hồi tố) · audit log ghi lại.`);
  render();
}

function actSaveDefaultView(rk, v) {
  CONFIG.defaultView[rk] = v;
  toast(`⚙️ Default view của role <b>${esc(ROLES[rk]?.label || rk)}</b> → <b>${esc(v)}</b>.`);
}

function actFav() {
  const key = S.role;
  CONFIG.favoriteViews[key] = CONFIG.favoriteViews[key] === S.view ? null : S.view;
  toast(CONFIG.favoriteViews[key] ? `⭐ Đã lưu <b>${esc(S.view)}</b> làm favorite view — lần sau vào Pipeline sẽ mở view này.` : 'Đã bỏ favorite — quay về default do admin đặt.');
  render();
}

function actToggleCheck(id) {
  const i = S.tableChecked.indexOf(id);
  if (i >= 0) S.tableChecked.splice(i, 1); else S.tableChecked.push(id);
  render();
}

function actBulk(what) {
  toast(`📦 <b>${what}</b> trên ${S.tableChecked.length} record — bulk action có audit log (ai làm gì trên bao nhiêu record).`);
  S.tableChecked = [];
  render();
}

/* ---------- focus queue ---------- */
function focusQueue() {
  return simE(visibleCands()
    .filter((c) => ['S1', 'S2', 'S3', 'S4', 'S5'].includes(c.stage) || c.wakeUp || c.signal)
    .sort((a, b) => (a.slaMin ?? 9e9) - (b.slaMin ?? 9e9)));
}

/* ---------- navigation ---------- */
function login(rk) {
  S.role = rk; S.sel = null; S.tableChecked = []; S.focusIdx = 0; S.focusDone = [];
  S.screen = CONFIG.defaultView[rk] || role().nav[0][0];
  if (S.screen === 'pipeline') S.view = CONFIG.favoriteViews[rk] || 'kanban';
  render();
  toast(`Đăng nhập: <b>${me().name}</b> — ${role().label}. Landing = default view do admin config (đổi được trong Settings).`);
}
function logout() { S.role = null; render(); }
function go(screen) { S.screen = screen; S.sel = null; if (screen === 'pipeline') S.view = CONFIG.favoriteViews[S.role] || S.view; render(); }
function setView(v) { S.view = v; S.sel = null; render(); }
function openC(id) { S.sel = id; render(); }
function closeC() { S.sel = null; render(); }
function openModal(html) { $('modal').innerHTML = html; $('modal').style.display = ''; }
function closeModal() { $('modal').style.display = 'none'; $('modal').innerHTML = ''; }

/* ---------- render dispatch ---------- */
function render() {
  const app = $('app');
  if (!S.role) { app.innerHTML = vLogin(); return; }
  const r = role();
  const navHtml = r.nav.filter((n) => n[1]).map(([k, lbl]) =>
    `<div class="nav ${S.screen === k ? 'on' : ''}" onclick="go('${k}')">${lbl}</div>`).join('');
  const screens = {
    today: vToday, pipeline: vPipeline, exceptions: vExceptions, hrq: vHrQueue,
    licq: vLicQueue, onbq: vOnbBoard, accq: vAccQueue, portal: vPortal, settings: vSettings,
  };
  const body = (screens[S.screen] || vToday)();
  app.innerHTML = `
    <div class="topbar">
      <div class="logo" onclick="logout()"><div class="dot"></div>Loan Factory&nbsp;<span>Recruit</span></div>
      <div class="search">🔍&nbsp; Search loan officers, NMLS, company…</div>
      <div class="top-right">
        <select class="rolesel" onchange="login(this.value)">
          ${Object.keys(ROLES).map((k) => `<option value="${k}" ${k === S.role ? 'selected' : ''}>${ROLES[k].icon} ${USERS[ROLES[k].user].name} · ${ROLES[k].label}</option>`).join('')}
        </select>
        <div class="avatar" style="background:${me().color}">${me().av}</div>
      </div>
    </div>
    <div class="layout">
      <div class="side">
        ${navHtml}
        ${S.sim === 'modexDown'
          ? '<div class="health" style="background:var(--red-soft);color:var(--red)"><b>● Modex sync LỖI</b>Zoom · Calendly vẫn OK<br>Payload cuối: 26h trước · đang retry</div>'
          : S.sim === 'esignDown'
          ? '<div class="health" style="background:var(--amber-soft);color:var(--amber)"><b>● document-esign LỖI</b>Modex · Zoom vẫn OK<br>Health check fail 3 lần · đang retry</div>'
          : '<div class="health"><b>● Integrations healthy</b>Modex sync · Zoom · Calendly<br>Last payload: 22 min ago</div>'}
      </div>
      <div class="main">${vLens()}${body}</div>
    </div>
    ${S.sel ? vDrawer(C(S.sel)) : ''}`;
}

function vLens() {
  const r = role();
  return `<div class="lens">
    <div><h1>${r.icon} ${me().name} — ${r.label}</h1><p>${r.landing}</p></div>
    <div class="rules">${r.rules.map((x) => `<span class="chip ${x.includes('🔒') || x.includes('Không') ? 'amber' : x.includes('Quyền') ? 'blue' : 'green'}">${x}</span>`).join('')}</div>
  </div>`;
}

/* keyboard: focus mode J/K/Enter */
document.addEventListener('keydown', (e) => {
  if (!S.role || S.screen !== 'pipeline' || S.view !== 'focus' || S.sel) return;
  if (e.key === 'j' || e.key === 'J') { actFocusNext(true); }
  if (e.key === 'k' || e.key === 'K') { if (S.focusIdx > 0) { S.focusIdx--; render(); } }
  if (e.key === 'Enter') { const c = focusQueue()[S.focusIdx]; if (c) actContact(c.id, 'call'); }
});

function resetDemo() { location.reload(); }

render();
