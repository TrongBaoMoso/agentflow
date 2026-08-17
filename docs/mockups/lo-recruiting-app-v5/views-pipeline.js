/* =========================================================
   LF Recruit — interactive prototype · VIEWS: login + pipeline + drawer
   ========================================================= */

/* ---------- LOGIN (role picker) ---------- */
function vLogin() {
  const cards = Object.keys(ROLES).map((k) => {
    const r = ROLES[k], u = USERS[r.user];
    return `<div class="rolecard" onclick="login('${k}')">
      <div class="rc-top"><div class="av" style="background:${u.color}">${u.av}</div>
        <div><h3>${u.name}</h3><div class="rt">${r.icon} ${r.label}${r.user === 'david' ? ' · tên placeholder' : ''}</div></div>
      </div>
      <p>${r.landing}</p>
      <div class="tags">${r.rules.slice(0, 2).map((x) => `<span class="chip ${x.includes('🔒') || x.includes('Không') ? 'amber' : 'green'}">${x}</span>`).join('')}</div>
    </div>`;
  }).join('');
  return `<div class="login">
    <h1>Bạn là ai hôm nay?</h1>
    <p>Cùng MỘT kho hồ sơ — mỗi role một ống kính (row-level + field-level). Chọn role để thấy đúng màn hình của họ, bấm thử mọi nút.<br>
    Mẹo demo: duyệt offer ở <b>Manager</b> → sang <b>HR</b> soạn & ký → sang <b>Onboarding</b> tick checklist → sang <b>Referring LO</b> xem card đổi theo.</p>
    <div class="rolegrid">${cards}</div>
  </div>`;
}

/* ---------- PIPELINE (view switcher + 4 views) ---------- */
function vPipeline() {
  const r = role();
  /* vá 17/08 (#17): Focus dời sang Today (nút ▶ Bắt đầu) — Pipeline chỉ còn chế độ NHÌN */
  const views = [['kanban', 'Kanban'], ['table', 'Table'], ['funnel', 'Funnel']];
  const fav = CONFIG.favoriteViews[S.role];
  const sw = `<div class="toolrow">
    <div class="vswitch">${views.map(([v, l]) => `<button class="${S.view === v ? 'on' : ''}" onclick="setView('${v}')">${l}${fav === v ? ' ⭐' : ''}</button>`).join('')}</div>
    <button class="fav ${fav === S.view ? 'on' : ''}" title="Đặt làm favorite view" onclick="actFav()">⭐</button>
    <span class="chip grey">Default (admin): ${CONFIG.defaultView[S.role]}</span>
    ${S.role === 'recruiter' ? `<span class="chip grey click" onclick="go('nurture')">🌙 Nurture (${CANDIDATES.filter((c) => c.stage === 'NURTURE').length})</span>` : ''}
    <button class="btn primary" style="margin-left:auto" onclick="mAddLead()">＋ Add lead</button>
  </div>`;
  const body = ({ kanban: vKanban, table: vTable, funnel: vFunnel }[S.view] || vKanban)();
  return sw + body;
}

/* ---------- KANBAN ---------- */
function vKanban() {
  const r = role();
  const s0col = `<div class="colk" style="max-width:200px">
      <h3>S0 · Kho <span class="cnt">102.715</span></h3>
      <div class="gate-note">Danh bạ (RLO cũ) — chưa ai đụng, CHƯA có owner, CHƯA có SLA</div>
      <div class="lockmsg" style="opacity:.8;text-align:left;padding:12px">Không vẽ card ở đây (kanban vô nghĩa với 100k dòng) — làm việc ở màn <b class="click" onclick="go('kho')" style="cursor:pointer;text-decoration:underline">🗄 Kho</b>.<br><br>
      Sang S1 bằng (bật/tắt trong Settings — Q34):<br>• <b>máy chia</b> (auto-assign)<br>• <b>Claim</b> tay<br>• hoặc <b>Call luôn → tự claim</b></div>
    </div>`;
  const TOPN = 3; // vá 17/08 (#16): kanban chỉ vẽ top-N mỗi cột — 200 card/cột thì xem ở Table
  const cols = s0col + STAGES.filter((s) => s.id !== 'S7').map((st) => {
    const locked = !r.stages.includes(st.id);
    const cands = locked ? [] : visibleCands().filter((c) => c.stage === st.id);
    const cardsH = cands.slice(0, TOPN).map((c) => `
      <div class="kcard ${S.sel === c.id ? 'sel' : ''}" onclick="openC('${c.id}')">
        ${st.id !== 'S6' ? `<button class="adv" title="Chuyển stage kế (check gate)" onclick="event.stopPropagation();actAdvance('${c.id}')">→</button>` : ''}
        <b>${esc(c.name)}</b>
        <small>${c.nmls ? 'NMLS ' + c.nmls + ' · ' : ''}${esc(c.company)} · ${esc(c.city)}</small>
        <div class="tags">
          <span class="chip ${c.source === 'Referral' ? 'blue' : c.source === 'Self-apply' ? 'grey' : 'orange'}">${c.source}</span>
          ${slaChip(c)}
          ${c.offer?.status === 'REQUESTED' ? '<span class="chip amber">chờ duyệt ' + (c.offer.waitDays || 0) + 'd</span>' : ''}
          ${c.offer?.status === 'VIEWED' ? '<span class="chip amber">viewed · chưa ký</span>' : ''}
          ${c.licensing?.status === 'FAIL' ? '<span class="chip red">licensing kẹt</span>' : ''}
          ${c.enrichFail ? '<span class="chip red">⚠ enrich lỗi</span>' : ''}
          ${c.vol >= 100 ? '<span class="chip orange">High producer</span>' : ''}
        </div>
        ${['S4', 'S5', 'S6'].includes(st.id) ? lightsBar(c, true) : ''}
      </div>`).join('')
      + (cands.length > TOPN ? `<div class="lockmsg click" style="cursor:pointer;opacity:.85" onclick="setView('table')">＋ ${cands.length - TOPN} nữa — xem tất cả → Table<br><small>(#16: kanban không vẽ 200 card/cột)</small></div>` : '');
    return `<div class="colk ${locked ? 'col-locked' : ''}">
      <h3>${st.id} · ${st.name} <span class="cnt">${locked ? '🔒' : cands.length}</span></h3>
      <div class="gate-note">${st.note}</div>
      ${locked ? '<div class="lockmsg">🔒 Ngoài lens của role này<br>(view ≠ permission)</div>' : cardsH || '<div class="lockmsg" style="opacity:.6">trống</div>'}
    </div>`;
  }).join('');
  /* vá 17/08 (#14): CEO muốn thấy Nurture ở pipeline view — dải cạnh kanban, KHÔNG thêm cột (nurture không phải stage) */
  const nurt = CANDIDATES.filter((c) => c.stage === 'NURTURE');
  const nurtureStrip = ['recruiter', 'manager'].includes(S.role) ? `<div class="card" style="display:flex;align-items:center;gap:8px;padding:9px 16px;font-size:12.5px;flex-wrap:wrap;margin-bottom:10px">
    🌙 <b>Nurture (${nurt.length})</b> — nằm cạnh kanban, không phải cột (CEO #14):
    ${nurt.slice(0, 3).map((c) => `<span class="chip ${c.signal ? 'red' : c.wakeUp ? 'amber' : 'grey'} click" onclick="openC('${c.id}')">${esc(c.name.split(' ')[0])} · ${c.signal ? '📡 signal' : c.wakeUp ? '⏰ đến hẹn' : 'từ ' + esc(c.nurtureSince || '—')}</span>`).join(' ')}
    <button class="btn sm ghost" style="margin-left:auto" onclick="go('nurture')">Mở Nurture →</button></div>` : '';
  return `${nurtureStrip}<div class="board">${cols}</div>
  <p class="src-note">Click card → hồ sơ 360 · nút <b>→</b> chuyển stage (gate tự chặn: S3→S4 cần NMLS, S4→S5 cần manager duyệt). Cột 🔒 = ngoài lens của role.</p>`;
}

/* ---------- TABLE ---------- */
function vTable() {
  const cands = visibleCands().filter((c) => c.stage !== 'NURTURE' || true);
  const canDelete = S.role === 'manager'; // quyền CANDIDATE_DELETE (D27) — demo: chỉ Manager
  const bulk = S.tableChecked.length ? `<div class="bulk"><b>${S.tableChecked.length} selected</b>
      <button class="btn sm" onclick="actBulk('Assign owner')">Assign owner ▾</button>
      <button class="btn sm" onclick="actBulk('Add to nurture')">Add to nurture</button>
      <button class="btn sm" onclick="actBulk('Export CSV')">Export CSV</button>
      <button class="btn sm primary" onclick="actBulk('Bulk SMS (template)')">Bulk SMS (template) ▾</button>
      <button class="btn sm" style="color:var(--amber)" onclick="actBulk('Bulk ARCHIVE (bắt lý do — quyền CANDIDATE_ARCHIVE)')">Archive…</button>
      ${canDelete
        ? `<button class="btn sm" style="color:var(--red)" onclick="actBulk('Bulk DELETE — quyền CANDIDATE_DELETE, audit từng record')">🗑 Delete</button>`
        : '<span class="chip grey" title="D27: xoá là QUYỀN — role này không có CANDIDATE_DELETE nên nút không render">🗑 Delete: không có quyền</span>'}
      <span style="margin-left:auto;color:#B9C0CE">Mọi hành động phá huỷ hỗ trợ BULK từ ngày đầu (D27)</span></div>` : '';
  const rows = cands.map((c) => `<tr>
      <td><input type="checkbox" ${S.tableChecked.includes(c.id) ? 'checked' : ''} onclick="actToggleCheck('${c.id}')"></td>
      <td class="cname" onclick="openC('${c.id}')"><b>${esc(c.name)}</b><small>${c.nmls ? 'NMLS ' + c.nmls : 'NMLS —'} · ${esc(c.city)}</small></td>
      <td>${stageChip(c)}</td>
      <td>${c.source}</td>
      <td>${fmtProd(c)}</td>
      <td>${c.slaMin != null ? slaChip(c) : esc(c.followUp || c.caseNote?.slice(0, 42) + '…' || '—')}</td>
      <td>${USERS[c.owner]?.name || '—'}</td>
      <td>${compView(c)}</td>
    </tr>`).join('');
  return `<div class="saved">Saved views:
      <span class="chip orange click" onclick="toast('Saved view = filter+sort đóng gói, nằm trong URL — share link là người khác thấy đúng view.')">TX high producers</span>
      <span class="chip grey click" onclick="toast('Stale >14 days — lọc last_activity cũ hơn 14 ngày.')">Stale &gt;14 days</span>
      <span class="chip grey click" onclick="toast('＋ Save current: lưu bộ lọc hiện tại thành view có tên.')">＋ Save current</span>
    </div>
    ${bulk}
    <div class="card"><div class="tblwrap"><table class="tbl">
      <tr><th></th><th>Candidate</th><th>Stage</th><th>Source</th><th>Production (lens: Re thấy loans since 2022 — R22)</th><th>SLA / Next task</th><th>Owner</th><th>Comp (lens!)</th></tr>
      ${rows}
    </table></div>
    <div class="pager">1–${cands.length} of <b>&nbsp;${cands.length} (demo) · 4,812 (thật)&nbsp;</b><span style="margin-left:auto">Tick checkbox → bulk bar hiện ra · cột Comp đổi theo role</span></div></div>
    <p class="src-note">Table cho ops/manager — kanban vô dụng khi một cột vài trăm thẻ (kho cũ 106K record). Filter + sort + view nằm trong URL.</p>`;
}

/* ---------- FOCUS ---------- */
function vFocus() {
  const q = focusQueue();
  if (!q.length) return '<div class="card"><div class="empty">Queue trống — mọi việc hôm nay đã xử lý xong 🎉</div></div>';
  if (S.focusIdx >= q.length) S.focusIdx = q.length - 1;
  const cur = q[S.focusIdx];
  const items = q.map((c, i) => {
    const done = S.focusDone.includes(c.id);
    return `<div class="qi ${i === S.focusIdx ? 'on' : ''} ${done ? 'done' : ''}" onclick="S.focusIdx=${i};render()">
      <span class="n">${done ? '✓' : i + 1}</span>
      <div><b>${esc(c.name)}</b><small>${c.slaMin != null ? (c.slaMin < 0 ? 'SLA TRỄ' : 'SLA còn ' + Math.floor(c.slaMin / 60) + 'h') : esc(c.signal ? 'Signal Modex' : c.wakeUp ? 'Wake-up đúng hẹn' : c.followUp || c.offer?.status || '')}</small></div>
    </div>`;
  }).join('');
  const why = cur.slaMin != null && cur.slaMin >= 0 ? `⏱ SLA first touch — còn ${Math.floor(cur.slaMin / 60)}h ${cur.slaMin % 60}m`
    : cur.slaMin < 0 ? '⏱ SLA ĐÃ TRỄ — ưu tiên 1' : cur.signal ? '📡 Signal từ Modex refresh' : cur.wakeUp ? '🌙 Wake-up đúng hẹn' : '📞 Follow-up đã hẹn hôm nay';
  return `<div class="focus-wrap">
    <div class="card queue">
      <div class="qh">Queue hôm nay <span class="chip grey">${q.length}</span></div>${items}
    </div>
    <div class="card fcard">
      <div class="fc-head">
        <div class="av" style="background:${cur.color}">${cur.av}</div>
        <div><h2>${esc(cur.name)}</h2><div class="sub">${cur.nmls ? 'NMLS ' + cur.nmls + ' · ' : ''}${esc(cur.company)} · ${esc(cur.city)}</div>
          <div style="margin-top:5px">${talkBadge(cur)}</div></div>
        <div class="why"><span class="chip ${cur.slaMin < 0 ? 'red' : 'amber'}">${why}</span>
        <div style="font-size:11px;color:var(--ink-3);margin-top:4px">Vì sao người này lên đầu queue</div></div>
      </div>
      <div class="fc-body">
        <div class="facts">
          ${role().seeComp === 'band'
            ? `<div class="fact"><b>${cur.since22 ?? '?'}</b>Loans since 2022</div>`
            : `<div class="fact"><b>${cur.vol != null ? '$' + cur.vol + 'M' : '?'}</b>Volume 12m</div>
               <div class="fact"><b>${cur.units ?? '?'}</b>Units 12m</div>`}
          <div class="fact"><b>${cur.licensed || '?'}</b>Licensed</div>
          <div class="fact"><b>${cur.source}</b>Source</div>
          <div class="fact"><b>${esc((cur.timeline?.length || 0) + ' sự kiện')}</b>Lịch sử</div>
        </div>
        <div style="font-size:12.5px;color:var(--ink-2)">📌 <b>Case:</b> ${esc(cur.caseNote || '')}</div>
        ${cur.ai ? `<div class="ai">
          <div class="aih">✨ AI gợi ý mở lời <span class="rg">${cur.aiCtx ? `soạn từ ${cur.aiCtx.length} nguồn ngữ cảnh — sửa được trước khi gửi` : 'soạn từ data Modex — sửa được trước khi gửi'}</span></div>
          ${cur.aiCtx ? `<div class="aictx">
            ${cur.aiCtx.map((s) => `<span class="chip ${{ MODEX: 'green', CALL: 'blue', NOTE: 'amber', EMAIL: 'blue', WEBINAR: 'grey', MEETING: 'blue' }[s.k] || 'grey'}" title="Nguồn ngữ cảnh AI dùng — bấm vào record gốc trên hồ sơ để đối chiếu">${{ MODEX: '🧲', CALL: '📞', NOTE: '📝', EMAIL: '✉️', WEBINAR: '🎥', MEETING: '🗓' }[s.k] || '·'} ${esc(s.l)}</span>`).join(' ')}
            <small>AI đọc: <b>các cú gọi trước · note recruiter (INTERNAL) · email tracking · điểm danh webinar · trạng thái 1-1</b> (idea CEO 13/08) — nguồn nào KHÔNG có thì không nhắc tới, không bịa. ${cur.aiCtx.length === 1 ? 'Lead lạnh lần đầu liên hệ → chỉ có Modex.' : 'Lead ấm → câu mở lời có "trí nhớ", không chào như người lạ.'}</small>
          </div>` : ''}
          <div class="aib">${esc(cur.ai)}</div>
          <div class="aif">
            <button class="btn sm ghost" onclick="actAI('${cur.id}','short')">Đổi giọng: ngắn hơn</button>
            <button class="btn sm ghost" onclick="actAI('${cur.id}','comp')">Nhấn về comp</button>
            <button class="btn sm ghost" onclick="actAI('${cur.id}','rewrite')">Viết lại</button>
          </div></div>` : ''}
      </div>
      ${callScript(cur) /* 📜 D39 — panel gập cạnh nút gọi; helper dùng chung với Today + hồ sơ 360 */}
      <div class="fc-foot">
        <button class="btn green" onclick="actContact('${cur.id}','call')">📞 Call</button>
        ${smsBlocked(cur)
          ? '<button class="btn ghost" disabled title="⛔ STOP_SMS — suppression (D18)">SMS ⛔</button>'
          : `<button class="btn primary" onclick="actContact('${cur.id}','sms')">Send SMS</button>`}
        <button class="btn ghost" onclick="actContact('${cur.id}','email')">Email</button>
        ${cur.signal ? `<button class="btn ghost" onclick="actReengage('${cur.id}')">🔥 Re-engage</button>` : ''}
        <button class="btn ghost" onclick="actFocusNext(true)">Log & Next →</button>
        <button class="btn ghost" onclick="actFocusNext(false)">Skip (lý do…)</button>
        <span class="kbd"><i>J</i> next · <i>K</i> back · <i>Enter</i> gọi</span>
      </div>
    </div>
  </div>
  <p class="src-note">Focus mode — "tinh gọn action": không nhìn bảng, không chọn việc; xử lý xong tự nhảy người kế. Call/SMS đi qua Zoom service → activity log tự ghi → SLA tự tính.</p>`;
}

/* ---------- FUNNEL ---------- */
function vFunnel() {
  /* D30 — KPI 3 trục (recruiter/team/công ty) × 3 mốc (ngày/tuần/tháng); đếm từ CÚ CLICK trong app, không từ log Zoom */
  const axisK = { person: 0.28, team: 1, company: 2.6 }[S.funAxis];
  const perK = { day: 1 / 22, week: 1 / 4.3, month: 1 }[S.funPeriod];
  const scale = (n) => Math.max(1, Math.round(n * axisK * perK));
  const seg = (opts, cur, set) => `<div class="vswitch" style="margin:0">${opts.map(([v, l]) =>
    `<button class="${cur === v ? 'on' : ''}" onclick="S.${set}='${v}';render()">${l}</button>`).join('')}</div>`;
  const switcher = `<div class="toolrow" style="margin-bottom:10px">
    ${seg([['person', '👤 ' + me().name.split(' ')[0]], ['team', '👥 Team'], ['company', '🏢 Công ty']], S.funAxis, 'funAxis')}
    ${seg([['day', 'Ngày'], ['week', 'Tuần'], ['month', 'Tháng']], S.funPeriod, 'funPeriod')}
    <span class="chip grey" title="D30 — người gọi bằng máy riêng vẫn được đếm vì đếm cú click trong app; log Zoom chỉ bổ sung duration + đối soát">đếm từ cú click trong app · Zoom log = đối soát</span></div>`;
  const rows = FUNNEL.map((f) => `<div class="fun-row">
      <div class="lbl">${f.s}</div>
      <div class="fun-track"><i style="width:${f.w}%${f.green ? ';background:var(--green)' : ''}">${scale(f.n)}</i></div>
      <div class="fun-conv">${f.conv} ${f.delta ? `<span class="${f.up ? 'up' : 'down'}">${f.delta}</span>` : ''}</div>
    </div>`).join('');
  const recr = RECRUITER_STATS.map((r) => {
    const u = USERS[r.u];
    const cls = r.sla >= 90 ? 'green' : r.sla >= 75 ? 'amber' : 'red';
    return `<tr><td><b>${u.name}</b>${r.u === 'seth' ? ' <small>outside</small>' : ''}</td><td>${r.leads}</td>
      <td><span class="chip ${cls}">${r.sla}%</span></td><td>${r.engaged}</td><td>${r.offers}</td><td>${r.joined}</td></tr>`;
  }).join('');
  const srcs = SOURCES_EFF.map((s) => `<div class="fun-row" style="padding:5px 0">
      <div class="lbl" style="flex-basis:90px;font-size:12px">${s.s}</div>
      <div class="fun-track" style="height:18px"><i style="width:${s.w}%;${s.green ? 'background:var(--green);' : ''}font-size:10.5px">${s.pct}%</i></div>
    </div>`).join('');
  return `${switcher}<div class="fun-grid">
    <div class="fun-main">
      <div class="card" style="padding:8px 0 10px">${rows}</div>
      <div class="card"><table class="tbl">
        <tr><th>Recruiter</th><th>Leads</th><th>First touch trong SLA</th><th>Engaged</th><th>Offers ký</th><th>Joined</th></tr>${recr}
      </table></div>
    </div>
    <div class="fun-rail">
      <div class="card alertcard"><div class="in"><b>⚠ Nghẽn ở S4 → S5</b><br>Conversion giảm 18 điểm so với tháng 7. <b>Offer request đợi duyệt &gt;3 ngày.</b><br>
        <button class="btn sm primary" style="margin-top:8px" onclick="${S.role === 'manager' ? "go('exceptions')" : `toast('Drill-down: role Manager sẽ nhảy thẳng vào queue duyệt.')`}">Xem các request</button></div></div>
      <div class="card" style="padding:14px 16px"><h4 style="font-size:12.5px;margin-bottom:10px">Nguồn hiệu quả nhất (joined / lead)</h4>${srcs}</div>
      <div class="card" style="padding:14px 16px;background:var(--cream)"><h4 style="font-size:12.5px;margin-bottom:6px">✨ AI weekly digest</h4>
        <p style="font-size:12px;color:var(--ink-2)">“${AI_DIGEST}”</p></div>
    </div>
  </div>
  <p class="src-note">Funnel — manager/CEO nhìn số, thấy nghẽn, drill-down. KPI đo từ activity log, không ai làm report tay.</p>`;
}

/* ---------- DRAWER 360 ---------- */
function vDrawer(c) {
  const r = role();
  const mix = c.mix ? `<div style="padding:10px 12px">
      <div class="mixbar"><i style="width:${c.mix.purchase}%;background:var(--green)"></i><i style="width:${c.mix.refi}%;background:#9DC8B4"></i></div>
      <div class="mixlbl"><span>Purchase ${c.mix.purchase}%</span><span>Refi ${c.mix.refi}%</span></div>
      <div class="mixbar" style="margin-top:8px"><i style="width:${c.mix.conv}%;background:var(--orange)"></i><i style="width:${c.mix.va}%;background:#F0A878"></i><i style="width:${c.mix.fha}%;background:#F8D5BC"></i></div>
      <div class="mixlbl"><span>Conv ${c.mix.conv}%</span><span>VA ${c.mix.va}%</span><span>FHA ${c.mix.fha}%</span></div>
    </div>` : '';
  /* D14 — mọi số verify mang NGUỒN + as_of: MODEX / SELF_REPORTED / DOCUMENT / NMLS_CA */
  const srcChip = (src) => src ? { MODEX: '<span class="chip green" title="D14 — nguồn số liệu">nguồn: MODEX</span>', SELF_REPORTED: '<span class="chip amber" title="D14 — ứng viên tự khai, chưa verify">nguồn: TỰ KHAI</span>', DOCUMENT: '<span class="chip blue">nguồn: GIẤY TỜ</span>', NMLS_CA: '<span class="chip blue">nguồn: NMLS CA</span>' }[src] : '';
  const prod = c.vol != null ? `<div class="vcard">
      <div class="vh">${c.verified ? '✅ Verified production' : '📈 Production (chưa verify)'} <span class="fresh">${srcChip(c.verifySrc)} ${S.sim === 'modexDown' && c.verified ? '⚠ Modex down — dùng as-of ' + c.verified : c.verified ? 'as-of ' + c.verified : 'list import'}</span></div>
      ${r.seeComp === 'band'
        ? `<div class="vgrid" style="grid-template-columns:1fr 1fr">
        <div class="vcell"><b>${c.since22 ?? '—'}</b><span>LOANS SINCE 2022</span></div>
        <div class="vcell"><b>${c.licensed || '—'}</b><span>LICENSED</span></div>
      </div><div style="padding:0 12px 10px;font-size:11px;color:var(--ink-3)">Volume/units ẩn với Recruiter (R22 — Re chỉ dùng loans since 2022); vẫn lưu &amp; vẫn đóng băng vào snapshot offer cho HR/Manager (D31)</div>`
        : `<div class="vgrid">
        <div class="vcell"><b>$${c.vol}M</b><span>VOLUME (12M)</span></div>
        <div class="vcell"><b>${c.units}</b><span>UNITS (12M)</span></div>
        <div class="vcell"><b>${c.avgLoan || '—'}</b><span>AVG LOAN</span></div>
        <div class="vcell"><b>${c.licensed || '—'}</b><span>LICENSED</span></div>
      </div>${mix}`}</div>`
    : `<div class="vcard"><div class="vh" style="background:var(--amber-soft);color:var(--amber)">⚠️ Chưa có production data</div>
      <div style="padding:12px;font-size:12px;color:var(--ink-2)">Chưa có NMLS → chưa enrich được. Nhập NMLS là Modex data tự về (zero-click).</div></div>`;
  const comp = `<div class="comp"><h5>💰 Comp</h5><div class="band">${compView(c)}
      ${c.offer?.snapshot && r.seeComp === 'full' ? ` <span class="chip blue click" onclick="mSnapshot('${c.id}')" title="D37 — căn cứ duyệt bị đóng băng lúc submit">🧊 Xem snapshot offer</span>` : ''}</div>
      ${r.seeComp === 'none' ? '<p>Field-level RBAC: role này không cần thấy tiền cho việc của mình (least-privilege).</p>'
      : '<p>Snapshot số liệu đóng băng vào offer để audit. ' + (r.seeComp === 'band' ? 'Số cuối chỉ HR sửa.' : 'Bạn có quyền sửa/duyệt.') + '</p>'}</div>`;
  /* vá 17/08 (#22): timeline mặc định GỌN — dòng tóm tắt + 3 mục gần nhất; "xem đầy đủ" mới xổ */
  const tlAll = (c.timeline || []).slice().reverse();
  const tlItem = ([t, x]) => `<div class="tl-item"><span class="t">${t}</span><span>${esc(x)}</span></div>`;
  const tlTxtAll = tlAll.map(([, x]) => x).join(' · ');
  const tlN = (re) => (tlTxtAll.match(re) || []).length;
  const tlSum = tlAll.length ? `<div class="tl-item" style="color:var(--ink-2)"><span class="t">∑</span><span><b>${tlAll.length} sự kiện</b> · ${tlN(/call|cú gọi|zoom|gọi/gi)} chạm thoại · ${tlN(/email|sms/gi)} email·SMS — entry máy ghi lặp được gộp (CEO #22)</span></div>` : '';
  const tl = tlSum + tlAll.slice(0, 3).map(tlItem).join('')
    + (tlAll.length > 3 ? `<details><summary style="cursor:pointer;font-size:11.5px;color:var(--ink-3);padding:5px 0">xem đầy đủ — còn ${tlAll.length - 3} mục cũ hơn ▾</summary>${tlAll.slice(3).map(tlItem).join('')}</details>` : '');
  const foot = [];
  if (S.role === 'recruiter' && c.stage === 'S4' && (!c.offer || c.offer.status === 'NONE')) foot.push(`<button class="btn primary" style="flex:1" onclick="actAdvance('${c.id}')">Request offer approval →</button>`);
  if (S.role === 'manager' && c.offer?.status === 'REQUESTED') foot.push(`<button class="btn green" style="flex:1" onclick="actApprove('${c.id}');closeC()">Approve offer (band ${c.offer.band})</button>`);
  if (S.role === 'hr' && c.offer?.status === 'APPROVED') foot.push(`<button class="btn primary" style="flex:1" onclick="actDraftOffer('${c.id}');closeC()">Soạn & gửi offer</button>`);
  if (!c.nmls) foot.push(`<button class="btn ghost" onclick="mNmls('${c.id}')">＋ Nhập NMLS (enrich)</button>`);
  if (S.role === 'recruiter' && ['S2', 'S3', 'S4'].includes(c.stage)) {
    // Hỏi được MỌI phòng (Licensing/HR/Onboarding/Accounting), hỏi nhiều lần — lịch sử nằm ở mục ❓ bên trên
    foot.push(`<button class="btn ghost" onclick="mAsk('${c.id}')">❓ Hỏi phòng ban${asksOf(c).some((a) => !a.answered) ? ' <span class="chip amber" style="font-size:10px">⏳ ' + asksOf(c).filter((a) => !a.answered).length + ' chờ</span>' : ''}</button>`);
  }
  if (S.role === 'recruiter' && c.owner === role().user && ['S1', 'S2', 'S3', 'S4', 'S5'].includes(c.stage)) {
    // vá 17/08 (#33a): quá tải → tự chuyển cho peer, không cần manager
    foot.push(`<button class="btn ghost" onclick="mTransfer('${c.id}')" title="Peer transfer (#33a) — tự san việc khi quá tải, notify người nhận, audit ghi">↔ Chuyển</button>`);
  }
  foot.push(`<button class="btn ghost" onclick="actContact('${c.id}','call')">📞 Call</button>`);
  foot.push('<button class="btn ghost" onclick="closeC()">Đóng</button>');
  return `<div class="overlay" onclick="if(event.target===this)closeC()">
    <div class="drawer">
      <div class="dr-head"><div class="top">
        <div class="av" style="width:42px;height:42px;border-radius:50%;background:${c.color};color:#fff;display:grid;place-items:center;font-weight:700">${c.av}</div>
        <div><h2>${esc(c.name)}</h2><div class="sub">${c.nmls ? 'NMLS ' + c.nmls + ' · ' : ''}${esc(c.company)} · ${esc(c.city)}</div>
          <div style="margin-top:5px">${stageChip(c)} <span class="chip grey">${c.source}</span>
            ${c.meeting ? `<span class="chip ${c.meeting.status === 'done' ? 'green' : 'blue'}" title="Buổi 1-1 pre-onboarding — điều kiện của automation rule r2">🗓 1-1 ${c.meeting.status === 'done' ? 'đã họp' : 'đã book'} · ${esc(c.meeting.via)} ${esc(c.meeting.on)}</span>` : ''}
            ${smsBlocked(c) ? '<span class="chip red" title="STOP_SMS — suppression list (D18)">⛔ SMS chặn (TCPA)</span>' : ''}</div>
          <div style="margin-top:5px">${labelChips(c, true)}</div>
          ${['S4', 'S5', 'S6', 'S7'].includes(c.stage) ? '<div style="margin-top:7px">' + lightsBar(c) + '</div>' : ''}</div>
        ${c.score ? `<div class="score"><b>${c.score}</b><span>MODEX SCORE</span></div>` : ''}
        <button class="dr-x" onclick="closeC()">✕</button>
      </div></div>
      <div class="dr-body">
        ${dupBanner(c)}
        ${journeyStrip(c)}
        <div style="font-size:12.5px;color:var(--ink-2)">📌 <b>Case:</b> ${esc(c.caseNote || '')}</div>
        ${prod}${comp}
        ${asksOf(c).length ? `<div class="tl"><h5>❓ Hỏi đáp phòng ban — nội bộ; MỌI role mở hồ sơ đều đọc được (cùng sổ với 💬 Conversations, D29)</h5>
          ${asksOf(c).map((a) => `<div class="tl-item"><span class="t">${esc(a.at)}</span><span><b>${esc(USERS[a.by]?.name || 'Re')} → ${a.to}</b>: “${esc(a.q)}”<br>
            ${a.answered ? `↳ <b>${a.to} trả lời:</b> “${esc(a.a)}”${a.relayed ? ' <span class="chip green" style="font-size:10px">đã relay cho ứng viên ✓</span>' : ' <span class="chip blue" style="font-size:10px">chờ Re relay</span>'}` : `↳ <span class="chip amber">⏳ chờ ${a.to} trả lời</span>`}</span></div>`).join('')}</div>` : ''}
        ${callScript(c) /* 📜 D39 — call script theo status ngay trong hồ sơ, cạnh nút 📞 Call ở footer */}
        <div class="tl"><h5>Timeline (mới nhất trên cùng — mọi action tự ghi)</h5>${tl}</div>
      </div>
      <div class="dr-foot">${foot.join('')}</div>
    </div>
  </div>`;
}

/* ---------- ❓ HỎI PHÒNG BAN (generic — Licensing/HR/Onboarding/Accounting; relay 2 chiều trong app) ---------- */
function mAsk(id) {
  const c = C(id);
  const asked = asksOf(c);
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">❓ Hỏi phòng ban — về ${esc(c.name)} (${esc(c.st) || 'bang ?'})</div>
    <form onsubmit="event.preventDefault();actAsk('${id}',this.dept.value,this.q.value)">
      <div class="mb">
        <div class="fld"><label>Hỏi phòng nào? (câu hỏi đi thẳng vào queue của phòng đó — KHÔNG email qua lại)</label>
          <select name="dept">
            <option value="LICENSING">📜 Licensing — luật bang, sponsorship, DRE/NMLS</option>
            <option value="HR">🧑‍💼 HR — comp plan, W-2/1099, benefits</option>
            <option value="ONBOARDING">📦 Onboarding — checklist, timeline nhập môn</option>
            <option value="ACCOUNTING">💵 Accounting — payroll, referral bonus</option>
          </select></div>
        <div class="fld"><label>Câu hỏi</label>
          <input name="q" placeholder="Vd: CA — DRE license có cần corporate filing gì thêm không?" required autofocus></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Hỏi TRƯỚC khi offer để khỏi bể kèo sau. Phòng trả lời → task relay tự nổi lên <b>Today</b> của bạn kèm nguyên văn câu trả lời. Cả hỏi lẫn đáp lưu vĩnh viễn ở mục <b>"❓ Hỏi đáp phòng ban"</b> trên hồ sơ — Re/ReM/mọi phòng mở hồ sơ đều đọc lại được toàn bộ lịch sử (Q1 hỏi Licensing, Q2 hỏi HR…).</p>
        ${asked.length ? `<p style="font-size:11.5px;color:var(--ink-3)">Đã hỏi trước đó: ${asked.map((a) => `<span class="chip ${a.answered ? 'green' : 'amber'}">${a.to} ${a.answered ? '✓' : '⏳'}</span>`).join(' ')}</p>` : ''}
      </div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Gửi câu hỏi</button></div>
    </form></div></div>`);
}
function actAsk(id, dept, q) {
  const c = C(id);
  const demoA = { LICENSING: 'DRE cần thêm corporate filing, ~3 tuần (demo)' }[dept] || '';
  c.asks = asksOf(c).concat([{ to: dept, q, a: demoA, answered: false, at: 'hôm nay', by: role().user }]);
  addTl(c, `❓ ${me().name} gửi câu hỏi cho ${dept}: "${q}" — vào queue "Câu hỏi từ recruiter" của phòng ${dept}; Q&A lưu vĩnh viễn trên hồ sơ`);
  closeModal();
  toast(`❓ Câu hỏi đã vào queue của <b>${dept}</b>. Đổi sang role phòng đó → mục "Câu hỏi từ recruiter"; họ bấm "Gửi trả lời" là follow-up relay nổi lên Today của bạn.`);
  render();
}

/* ---------- 🧊 SNAPSHOT OFFER (D37) — căn cứ duyệt bị đóng băng ---------- */
function mSnapshot(id) {
  const c = C(id), s = c.offer.snapshot;
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">🧊 Snapshot của offer — ${esc(c.name)} (band ${c.offer.band})</div>
    <div class="mb">
      <table class="set-tbl"><tr><th>Volume (12m)</th><th>Units (12m)</th><th>Nguồn số liệu</th><th>Chụp lúc (as_of)</th></tr>
        <tr><td><b>$${s.vol}M</b></td><td><b>${s.units}</b></td><td><span class="chip green">${s.source}</span></td><td><b>${esc(s.asOf)}</b></td></tr></table>
      <p style="font-size:12px;color:var(--ink-2);margin-top:10px">D37: 4 giá trị này <b>nhúng vào offer lúc submit-for-approval</b> (offers.comp_details JSONB) — thiếu là hệ thống trả 400, không cho trình duyệt.
      Từ đây Modex sync đè số mới lên hồ sơ <b>không đổi được snapshot</b> — ai duyệt band nào dựa trên con số nào, mãi mãi truy được (giải Q30: hệ cũ để số "sống" trên record, sync một cái là mất căn cứ duyệt).</p>
      <p style="font-size:11.5px;color:var(--ink-3)">Chỉ HR/Manager thấy (Recruiter bị ẩn volume/units — D31, nhưng số VẪN nằm trong snapshot).</p>
    </div>
    <div class="mf"><button class="btn primary" onclick="closeModal()">Đóng</button></div>
  </div></div>`);
}

/* ---------- ADD LEAD MODAL ---------- */
function mAddLead() {
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">＋ Add lead <span style="margin-left:auto;font-weight:500;font-size:11.5px;color:var(--ink-3)">chỉ 4 field — không có bức tường 5-field như hệ cũ</span></div>
    <form onsubmit="return actAddLead(event)">
      <div class="mb">
        <div class="fld"><label>Họ tên *</label><input name="lname" placeholder="Vd: Marcus Reyes" required autofocus></div>
        <div class="fld"><label>NMLS (không bắt buộc — có là auto-enrich)</label><input name="lnmls" placeholder="Vd: 1076215"></div>
        <div style="display:flex;gap:10px">
          <div class="fld" style="flex:1"><label>Company hiện tại</label><input name="lcompany" placeholder="Vd: Fairway"></div>
          <div class="fld" style="flex:1"><label>City</label><input name="lcity" placeholder="Vd: Plano, TX"></div>
        </div>
        <div class="fld"><label>Nguồn</label><select name="lsource">
          <option>Referral</option><option>Self-apply</option><option>Event · Webinar</option><option>Modex List</option><option>Khác</option>
        </select></div>
        <p style="font-size:11.5px;color:var(--ink-3)">⚡ Có NMLS → production data tự về từ Modex trong vài phút (xem toast sau khi thêm). Mọi field khác nullable ở DB — validation nằm ở gate chuyển stage, không chặn lúc nhập (bài học bức tường 5-field / 106k dòng).<br>🧪 Demo error path: NMLS kết thúc bằng <b>0</b> → Modex unmatched (verify tay); bật "💥 Modex down" trên thanh đen → enrichment lỗi + tự retry.</p>
      </div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn primary">Thêm vào S1</button></div>
    </form>
  </div></div>`);
}
