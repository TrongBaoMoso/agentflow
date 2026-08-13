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
  thread: null,        // v5: thread đang mở trong màn Conversations
  scriptFor: null,     // v5.1: row đang mở panel 📜 call script (D39 — cạnh nút gọi, mặc định gập)
  outNote: null,       // v5.1: ghi chú cuộc gọi tạm giữ khi chuyển sub-modal (hẹn ngày / archive)
  pivotSel: null,      // v5: ô đang drill trong Dashboard quá hạn
  funAxis: 'team',     // v5: trục KPI — person | team | company (D30)
  funPeriod: 'month',  // v5: mốc KPI — day | week | month (D30)
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
    if (c.stage === 'ARCHIVED' || c.stage === 'S0') return false; // kho có màn riêng (vKho); archived ra khỏi mọi list
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
  const map = { S0: 'grey', S1: 'orange', S2: 'grey', S3: 'blue', S4: 'green', S5: 'amber', S6: 'green', S7: 'green', NURTURE: 'grey', ARCHIVED: 'grey' };
  const st = STAGES.find((s) => s.id === c.stage);
  return `<span class="chip ${map[c.stage] || 'grey'}">${c.stage === 'NURTURE' ? '🌙 Nurture' : c.stage === 'ARCHIVED' ? '🗑 Archived' : c.stage === 'S0' ? 'S0 · Kho' : c.stage + ' · ' + st.name}</span>`;
}

const fmtVol = (c) => (c.vol == null ? '—' : `$${c.vol}M · ${c.units}u`);

/* Production theo lens (D31/R22): Recruiter chỉ thấy "loans since 2022";
   vol/units vẫn lưu + vẫn vào snapshot offer cho HR/Manager */
function fmtProd(c) {
  if (role().seeComp === 'band') return c.since22 != null ? `<b>${c.since22}</b> loans since 2022` : '—';
  return c.vol == null ? '—' : `<b>$${c.vol}M</b> · ${c.units}u (12m)`;
}

/* ---------- 6 ĐÈN TÍN HIỆU (derive từ state — không phải status mới) ---------- */
function candLights(c) {
  const inOnb = ['S6', 'S7'].includes(c.stage);
  const signed = c.offer?.status === 'SIGNED' || inOnb;
  const hv = c.hrVerify;
  const hrDone = hv ? hv.todos && hv.docs : c.stage === 'S7';
  const hrStarted = hv ? hv.todos || hv.docs : inOnb;
  return [
    { k: 'PAID',      on: !!c.paid,  src: 'tự động — PayPal verify' },
    { k: 'SIGNED',    on: signed,    src: 'tự động — document-esign event' },
    { k: 'LICENSED',  on: !!c.nmls,  src: 'GIẢ ĐỊNH: tay/CSV — Phase 2 NMLS reconcile' },
    { k: 'SPONSORED', on: c.licensing ? c.licensing.status === 'OK' : c.stage === 'S7', src: 'Licensing đánh dấu theo bang' },
    { k: 'HR',        on: hrDone, half: hrStarted && !hrDone, src: 'HR app event · fallback: 2 nút verify' },
    { k: 'ACCOUNT',   on: !!c.accountCreated || c.stage === 'S7', src: 'user-service báo account tạo xong' },
  ];
}
function lightsBar(c, sm) {
  return `<span class="lights ${sm ? 'sm' : ''}">${candLights(c).map((l) =>
    `<i class="lt ${l.on ? 'on' : l.half ? 'half' : ''}" title="${l.k} — ${esc(l.src)}">${sm ? '' : l.k}</i>`).join('')}</span>`;
}
/* HR status 5 giá trị cũ → 3 trạng thái DERIVE (không ai bấm tay) */
function hrStatusChip(c) {
  const l = candLights(c).find((x) => x.k === 'HR');
  return l.on ? '<span class="chip green">HR: Xong ✓</span>'
    : l.half ? '<span class="chip amber">HR: Đang chạy</span>'
    : '<span class="chip grey">HR: Chưa bắt đầu</span>';
}

/* ---------- ACTIONS (mọi nút bấm gọi vào đây) ---------- */

/* v5: trần capacity (D24) — đang ôm bao nhiêu lead active */
function ownedOpen() {
  return CANDIDATES.filter((c) => c.owner === role().user && !['S0', 'S7', 'NURTURE', 'ARCHIVED'].includes(c.stage)).length;
}
const capReached = () => ownedOpen() >= CONFIG.maxOpen;

/* v5: suppression (D18) — SMS bị chặn theo KÊNH */
const smsBlocked = (c) => !!c.suppressedSms;

/* ❓ Q&A phòng ban — 1 mảng asks/hồ sơ dùng chung mọi phòng; câu hỏi = entry INTERNAL trên cùng sổ hội thoại (D29) */
const asksOf = (c) => c.asks || [];
const deptPendingAsks = (dept) => CANDIDATES.filter((c) => asksOf(c).some((a) => a.to === dept && !a.answered));

/* 📜 Call script theo status — panel gập CẠNH NÚT GỌI (D39); nguồn = template CALL_SCRIPT đang ACTIVE (D26) */
function callScript(c, open) {
  const sc = TEMPLATES.find((t) => t.type === 'CALL_SCRIPT' && t.stage === c.stage && t.status === 'ACTIVE')
    || TEMPLATES.find((t) => t.type === 'CALL_SCRIPT' && t.status === 'ACTIVE');
  return sc ? `<details class="script"${open ? ' open' : ''}><summary>📜 Call script — ${sc.stage} (mặc định gập — D39)</summary>
    <div>${esc(sc.body)}<br><small style="color:var(--ink-3)">template "${esc(sc.name)}" · sửa trong 📨 Templates (vòng đời D26) — Re mới cần, Re cũ đã thuộc thì cứ để gập</small></div></details>` : '';
}
function actScript(id) { S.scriptFor = S.scriptFor === id ? null : id; render(); }

function actClaim(id) {
  const c = C(id);
  if (capReached()) { toast(`🚫 Trần capacity: bạn đang ôm <b>${ownedOpen()}/${CONFIG.maxOpen}</b> lead (max_open — config D24). Xử lý bớt hoặc nhờ Manager nâng trần trong Settings.`); return; }
  c.owner = role().user; c.stage = 'S1'; c.hot = null; c.claimMin = null;
  c.slaMin = CONFIG.sla.find((p) => p.id === 'touch').hours * 60;
  addTl(c, `Claim bởi ${me().name} → S1 · đồng hồ first-touch CÁ NHÂN bắt đầu (đồng hồ chờ-nhận của team dừng)`);
  toast(`🙋 <b>${esc(c.name)}</b> là của bạn — vào S1, first-touch SLA chạy. Xem ở Today.`);
  render();
}

function actContact(id, kind) {
  const c = C(id);
  const via = { call: 'Call qua Zoom Phone', sms: 'SMS qua Zoom service', email: 'Email' }[kind];
  if (kind === 'sms' && smsBlocked(c)) {
    toast(`⛔ <b>${esc(c.name)}</b> đã nhắn STOP (Jul 18) — kênh SMS bị chặn bởi <b>suppression list</b> (TCPA, D18). Call/email vẫn hợp lệ. Cadence tự bỏ qua SMS của người này.`);
    return;
  }
  if (c.stage === 'S0') {
    if (capReached()) { toast(`🚫 Trần capacity ${ownedOpen()}/${CONFIG.maxOpen} — không auto-claim thêm được (D24).`); return; }
    c.owner = role().user; c.stage = 'S1'; c.hot = null; c.claimMin = null;
    addTl(c, `AUTO-CLAIM bởi ${me().name} — hành động đầu tiên tự gắn owner (không chặn, không vô chủ)`);
  } else if (c.owner && c.owner !== role().user && S.role === 'recruiter') {
    toast(`⚠️ <b>${esc(c.name)}</b> đang thuộc <b>${USERS[c.owner]?.name}</b> — hoạt động của bạn vẫn ghi vào feed chung để cả hai thấy (chống gọi trùng).`);
  }
  addTl(c, `${via} bởi ${me().name} — activity log tự ghi`);
  if (c.stage === 'S1') { c.stage = 'S2'; c.slaMin = null; addTl(c, 'First touch ✓ → tự chuyển S2 · Contacted (SLA dừng)'); }
  toast(`📞 <b>${esc(c.name)}</b> — ${via}. Activity log tự ghi → SLA tự tính, không khai tay.`);
  render();
  if (kind === 'call' && S.role === 'recruiter' && ['S2', 'S3'].includes(c.stage)) mOutcome(id);
}

/* 📝 Ghi chú cuộc gọi — dùng chung cho modal Kết quả + modal Next-step; lưu timeline + thread INTERNAL */
function saveCallNote(c) {
  const note = (($('outNote') && $('outNote').value.trim()) || S.outNote || '').trim();
  S.outNote = null;
  if (!note) return;
  addTl(c, `📝 Ghi chú cuộc gọi: "${note}" — lưu vào thread hồ sơ (INTERNAL, ứng viên không thấy — cả team đọc được, D29/D36)`);
  const t = typeof THREADS !== 'undefined' ? THREADS.find((x) => x.cand === c.id) : null;
  if (t) t.msgs.push({ dir: 'note', kind: 'INTERNAL', who: role().user, when: 'bây giờ', text: '🔒 (INTERNAL) 📝 Note sau cú gọi: ' + note });
}

/* Kết quả cú gọi — mọi lead phải rẽ nhánh (S2+ luôn có next-step) + 📝 ghi chú lưu vào thread hồ sơ */
function actOutcome(id, kind, val) {
  const c = C(id);
  saveCallNote(c);
  /* nhánh "quan tâm" KHÔNG còn ở đây — nó đi qua mNextStep/actNextStep: recruiter tự quyết bước kế tiếp */
  if (kind === 'nurtureDate') { c.stage = 'NURTURE'; c.nurtureUntil = val; c.slaMin = null; addTl(c, `Outcome: hẹn lại ${val} → NURTURE, wake-up task tự tạo đúng ngày`); toast(`📅 Vào Nurture — wake-up <b>${esc(val)}</b> tự nổi ở Today, không cần nhớ.`); }
  if (kind === 'nurture') { c.stage = 'NURTURE'; c.nurtureSince = 'hôm nay'; c.slaMin = null; addTl(c, 'Outcome: chưa muốn, không hẹn → NURTURE, cadence mặc định tự nhắc'); toast('🌙 Vào Nurture — cadence config tự nhắc, inbound là tự dừng.'); }
  if (kind === 'noanswer') { c.followUp = 'Gọi lại — không bắt máy (retry tự tạo)'; addTl(c, 'Outcome: không bắt máy → task gọi lại tự tạo theo cadence'); toast('📵 Task gọi lại tự tạo.'); }
  if (kind === 'archive') { c.stage = 'ARCHIVED'; c.archiveReason = val; c.slaMin = null; addTl(c, `Outcome: ARCHIVE — lý do "${val}" (không xoá; lý do = suppression thì mọi kênh tự chặn)`); toast(`🗑 Archived — lý do "<b>${esc(val)}</b>" lưu audit. Record còn đó, re-source sau được.`); }
  closeModal(); render();
}

/* Nhập NMLS vào record có sẵn → enrich (gate S3→S4) */
function actNmls(id, nmls) {
  const c = C(id);
  c.nmls = nmls.trim();
  addTl(c, `${me().name} nhập NMLS ${c.nmls} — enrichment queued (zero-click)`);
  closeModal(); render();
  toast(`⚡ NMLS lưu — đang kéo Modex…`);
  setTimeout(() => { simulateEnrich(c); render(); }, 2200);
}

function simulateEnrich(c) {
  if (S.sim === 'modexDown') {
    c.enrichFail = 'Modex webhook down — hệ thống tự retry, không mất record';
    addTl(c, '⚠ Enrichment LỖI: Modex down → hàng retry tự động');
    toast(`⚠ <b>${esc(c.name)}</b>: enrichment lỗi (Modex down) — tự retry.`);
  } else if (c.nmls.endsWith('0')) {
    c.enrichFail = 'Modex unmatched — NMLS không khớp, cần verify tay';
    addTl(c, '⚠ Modex UNMATCHED → task verify tay tự tạo');
    toast(`⚠ <b>${esc(c.name)}</b>: Modex unmatched — task verify tay tự tạo.`);
  } else {
    c.vol = 12.7; c.units = 29; c.since22 = 63; c.licensed = '4 năm'; c.score = 77; c.enrichFail = null;
    addTl(c, '⚡ Modex payload về (webhook) — production tự điền, không ai gõ tay');
    toast(`⚡ <b>${esc(c.name)}</b> enriched: 63 loans since 2022 (Modex webhook). Zero-click.`);
  }
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
      const band = suggestBand(c);
      if (CONFIG.offerApproval === 'auto') {
        c.offer = { status: 'APPROVED', band, waitDays: 0, requestedBy: role().user, auto: true };
        c.stage = 'S5';
        addTl(c, `Offer AUTO-APPROVED band ${band} theo band rule (config offer_approval=auto) → thẳng bàn HR, không chờ ai`);
        toast(`⚙️ Gate S4→S5: <b>AUTO approve</b> band ${band} theo rule — sang thẳng Offer desk của HR. (Đổi sang "Manager duyệt" trong Settings nếu muốn có người gác.)`);
        render(); return;
      }
      c.offer = { status: 'REQUESTED', band, waitDays: 0, requestedBy: role().user };
      addTl(c, `Request offer approval (band ${band}) → chờ manager duyệt (config offer_approval=manager)`);
      toast(`✍️ Gate S4→S5: đã tạo <b>offer request</b> band ${band} — chờ Manager duyệt (xem role Manager).`);
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

/* HR verify 2 nút (fallback khi HR app chưa bắn event) — thiết kế "ổ cắm trước, phích sau" */
function actHrVerify(id, type) {
  const c = C(id);
  c.hrVerify = c.hrVerify || { todos: false, docs: false };
  c.hrVerify[type] = true;
  const lbl = type === 'todos' ? 'To-dos (courses…)' : 'Documents (W-9, Remote Policy…)';
  addTl(c, `HR verify ${lbl} ✓ bởi ${me().name} — sau này HR app bắn event là tự tick, không cần bấm`);
  if (c.hrVerify.todos && c.hrVerify.docs) addTl(c, 'Đèn HR bật ✓ (derive từ 2 verify — không có status "HR completed" bấm tay)');
  toast(`✅ Verify <b>${lbl}</b> cho ${esc(C(id).name)}. Đây là nút FALLBACK — khi hr.loanfactory.com bắn event, đèn tự bật.`);
  render();
}

/* Override tạo account vượt cổng (D35) — role Onboarding, bắt buộc lý do, HR app không cần biết là ngoại lệ */
function actOverride(id) {
  const c = C(id);
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">⚡ Tạo account vượt cổng — ${esc(c.name)}</div>
    <form onsubmit="event.preventDefault();actOverrideGo('${id}',this.reason.value)">
      <div class="mb">
        <p style="font-size:12px;color:var(--ink-2)">Bỏ qua điều kiện chưa đủ (đèn chưa xanh hết) và gửi request tạo account sang HR app ngay.
        <b>HR app không cần biết đây là ngoại lệ</b> — nó chỉ nhận data và báo HR member tạo account (D35).
        Lý do bắt buộc + ghi audit; chỉ role <b>Onboarding</b> có nút này.</p>
        <div class="fld"><label>Lý do override *</label><input name="reason" placeholder="Vd: CEO approve — start gấp ngày 15/08" required autofocus></div>
      </div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn primary">Gửi request tạo account</button></div>
    </form></div></div>`);
}
function actOverrideGo(id, reason) {
  const c = C(id);
  c.accountCreated = true;
  addTl(c, `⚡ OVERRIDE tạo account bởi ${me().name} — lý do: "${reason}" · audit ghi · request đẩy sang HR app (data thường, không nhãn ngoại lệ)`);
  closeModal();
  toast(`⚡ Request tạo account cho <b>${esc(c.name)}</b> đã sang HR app kèm lý do (audit). Đèn ACCOUNT sẽ bật khi user-service báo xong.`);
  render();
}

/* NMLS Reconcile (Phase 2 concept) — import CSV report từ NMLS, đối soát với app */
function actReconcile() {
  S.reconciled = true;
  toast('🔄 Đã nạp <b>Individual Roster CSV</b> (NMLS report) — đối soát chạy: khớp thì im lặng, lệch thì thành task.');
  render();
}

function actNudge(id, dept) {
  toast(`📣 Đã nhắc phòng <b>${esc(dept)}</b> về ${esc(C(id).name)} — in-app + Slack, không cần email qua lại.`);
}

/* Trả lời câu hỏi từ recruiter — GENERIC theo phòng (Licensing/HR/Onboarding/Accounting), không riêng Licensing */
function actAnswerRelay(id, dept = 'LICENSING') {
  const c = C(id);
  const a = asksOf(c).find((x) => x.to === dept && !x.answered);
  if (!a) return;
  a.a = a.a || {
    HR: 'W-2 đi comp plan chuẩn + benefits; 1099 chỉ cho Independent LO — HR gửi bảng so sánh (demo)',
    ONBOARDING: 'Checklist ~7–10 ngày làm việc nếu giấy tờ đủ (demo)',
    ACCOUNTING: 'Referral bonus chín sau 60 ngày, trả vào kỳ payroll kế tiếp (demo)',
  }[dept] || 'Đã trả lời (demo)';
  a.answered = true;
  addTl(c, `${dept} trả lời: "${a.a}" → task relay tự tạo cho recruiter ${USERS[c.owner].name}; Q&A lưu vĩnh viễn trên hồ sơ`);
  toast(`📨 Đã gửi trả lời cho recruiter <b>${USERS[c.owner].name}</b>. Đổi role Recruiter: follow-up "Relay câu trả lời" xuất hiện trên Today.`);
  render();
}

/* ✅ Quan tâm → RECRUITER QUYẾT ĐỊNH bước kế tiếp (Bao 13/08) — mỗi lựa chọn = đúng 1 task có hạn */
function actNextStep(id, kind) {
  const c = C(id);
  saveCallNote(c);
  const d = ($('nsDate') && $('nsDate').value) || '';
  c.followUpDue = d || null;
  const when = d ? ` — hạn ${d}` : ' — hạn mặc định: ngày mai';
  if (kind === 'callnext') {
    c.followUp = 'Cuộc gọi/Zoom kế tiếp đã hẹn';
    addTl(c, `Next-step (Re chọn): hẹn gọi/Zoom kế tiếp${when} — task tự nổi Today đúng hạn`);
    toast(`📞 Task "gọi/Zoom kế tiếp" đặt${when} — đúng ngày tự nổi lên Today, kèm 📜 script theo stage.`);
  }
  if (kind === 'sendinfo') {
    c.followUp = 'Đã gửi comp sheet — check đã mở chưa, mời bước kế';
    addTl(c, `Next-step (Re chọn): gửi comp sheet/info package bằng template ACTIVE (D26)${when} — email tracked, task check tự tạo`);
    toast(`📄 Gửi bằng template ACTIVE — email có tracking mở/click; task "check đã mở chưa" đặt${when}.`);
  }
  if (kind === 'meet11') {
    c.meeting = c.meeting || { status: 'invited', on: d || 'chờ book', via: 'Calendly' };
    c.followUp = 'Đã gửi link book 1-1 — theo dõi booking';
    addTl(c, `Next-step (Re chọn): mời book 1-1 qua Calendly${when} — chip 🗓 lên hồ sơ; ứng viên book là trạng thái tự đổi (Q39: Calendly vs GCal đang chờ chốt)`);
    toast(`🗓 Link 1-1 đã gửi — ứng viên book là chip 🗓 trên hồ sơ tự đổi. Task theo dõi đặt${when}.`);
  }
  if (kind === 'verify') {
    closeModal(); render();
    mNmls(id);
    toast(`🔢 Xin NMLS ngay trong cú gọi — nhập xong là Modex tự kéo production (zero-click), mở cổng S3→S4.`);
    return;
  }
  if (kind === 's3') {
    if (c.stage === 'S2') { c.stage = 'S3'; addTl(c, 'Next-step (Re chọn): đủ độ chín → chuyển S3 · Engaged (đã trao đổi 2 chiều, hỏi sâu comp)'); }
    c.followUp = c.followUp || 'S3: đào sâu comp expectations — chuẩn bị verify';
    toast(`⬆ <b>${esc(c.name)}</b> sang S3 · Engaged — bước kế: xin NMLS để verify, rồi mới nói số.`);
  }
  closeModal(); render();
}

/* Follow-up: Reschedule = đổi hạn (task không mất) · Done = xong việc → bắt chọn next-step (luật S2+) */
function actResched(id, d) {
  const c = C(id);
  c.followUpDue = d;
  addTl(c, `Follow-up dời đến ${d} — task giữ nguyên, đúng ngày tự nổi lại Today (không ai phải nhớ)`);
  closeModal();
  toast(`📅 Đã dời đến <b>${esc(d)}</b> — task không rơi mất, đúng ngày tự nổi lên Today.`);
  render();
}
function actFuDone(id) {
  const c = C(id);
  const relayA = asksOf(c).find((a) => a.answered && !a.relayed);
  if (relayA) { // task relay: đọc câu trả lời cho ứng viên xong là done — Q&A vẫn nằm trên hồ sơ
    relayA.relayed = true;
    addTl(c, `Relay hoàn tất: đã đọc câu trả lời của ${relayA.to} cho ứng viên ✓ (Q&A lưu vĩnh viễn trên hồ sơ)`);
    toast(`✓ Relay xong — hỏi & đáp vẫn đọc lại được trong mục "❓ Hỏi đáp phòng ban" trên hồ sơ.`);
    render();
    return;
  }
  c.followUp = null; c.followUpDue = null;
  addTl(c, 'Follow-up done ✓ — luật "S2+ luôn có next-step": phải chọn bước kế tiếp ngay');
  render();
  mOutcome(id);
  toast('✓ Done — chọn next-step ngay trong modal (S2+ không có lead "xong rồi thôi").');
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

function actSaveCadence(i, val) {
  CONFIG.cadence.tiers[i] = +val;
  toast(`⚙️ Cadence → bậc <b>${CONFIG.cadence.tiers.join(' / ')}</b> ngày — có hiệu lực từ lần quét kế (cron hằng ngày), audit ghi lại. Không deploy.`);
  render();
}

function actSaveMaxOpen(v) {
  CONFIG.maxOpen = +v;
  toast(`⚙️ Trần capacity → <b>${v}</b> lead/recruiter. Ai đang vượt trần thì KHÔNG bị thu lead — chỉ không nhận thêm (nút Claim mờ).`);
  render();
}

function actSaveOfferMode(v) {
  CONFIG.offerApproval = v;
  toast(v === 'auto'
    ? '⚙️ Offer approval → <b>AUTO</b>: band rule tự duyệt, S4→S5 không chờ ai. Lệch band/RSU vẫn cần người.'
    : '⚙️ Offer approval → <b>Manager duyệt</b>: mọi request xếp hàng ở màn Exceptions.');
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
    statuses: vStatuses, kho: vKho, nurture: vNurture,
    comms: vComms, templates: vTemplates, webinars: vWebinars, automation: vAutomation,
    dashboard: vDashboard, audit: vAudit, suppression: vSuppression,
  };
  const body = (screens[S.screen] || vToday)();
  app.innerHTML = `
    <div class="topbar">
      <div class="logo" onclick="logout()"><div class="dot"></div>Loan Factory&nbsp;<span>Recruit</span></div>
      <div class="search" style="position:relative;padding:0">
        <input id="searchbox" placeholder="🔍  Search loan officers, NMLS, company… (v5: gõ thật được)" oninput="actSearch(this.value)"
          style="width:100%;border:0;background:transparent;font:inherit;color:inherit;padding:8px 14px;outline:none">
        <div id="searchdrop"></div>
      </div>
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

/* v5: search thật — lọc theo tên / NMLS / company, KHÔNG re-render (giữ focus ô gõ) */
function actSearch(q) {
  const drop = $('searchdrop');
  const s = q.trim().toLowerCase();
  if (!s) { drop.innerHTML = ''; return; }
  const hits = CANDIDATES.filter((c) => c.stage !== 'ARCHIVED'
    && (c.name.toLowerCase().includes(s) || (c.nmls || '').includes(s) || (c.company || '').toLowerCase().includes(s))).slice(0, 6);
  drop.innerHTML = hits.length ? hits.map((c) => `<div class="s-hit" onclick="$('searchdrop').innerHTML='';$('searchbox').value='';openC('${c.id}')">
      <div class="av" style="background:${c.color};width:24px;height:24px;font-size:10px">${c.av}</div>
      <b>${esc(c.name)}</b><small>${c.nmls ? 'NMLS ' + c.nmls + ' · ' : ''}${esc(c.company)} · ${c.stage === 'S0' ? 'Kho' : c.stage}</small>
    </div>`).join('')
    : '<div class="s-hit" style="color:var(--ink-3)">Không khớp ai — thử tên (Kaprice), NMLS (107621), company (Fairway)</div>';
}

function resetDemo() { location.reload(); }

render();
