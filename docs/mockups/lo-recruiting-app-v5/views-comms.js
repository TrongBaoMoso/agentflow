/* =========================================================
   LF Recruit v5 · 💬 CONVERSATIONS (D29 + D36) + 📨 TEMPLATES (D26)
   Conversations = MÀN RIÊNG, không phải tab trong hồ sơ:
   owner thấy của mình · manager thấy cả team · note INTERNAL không lọt thread
   ========================================================= */

/* ---------- 💬 CONVERSATIONS ---------- */
function commThreads() {
  const r = role();
  return THREADS.filter((t) => {
    const c = C(t.cand);
    if (!c) return false;
    if (r.rows === 'all') return true;                    // manager/admin: cả team
    return (t.ownerOverride || c.owner) === r.user && !t.teamOnly; // recruiter: chỉ của mình
  });
}

function vComms() {
  const list = simE(commThreads());
  const selId = S.thread && list.some((t) => t.cand === S.thread) ? S.thread : (list[0] && list[0].cand);
  const sel = list.find((t) => t.cand === selId);
  const kindIcon = { SMS: '💬', EMAIL: '✉️', CALL: '📞', INTERNAL: '🔒', SYS: '⚙️' };
  const items = list.map((t) => {
    const c = C(t.cand);
    const lastMsg = t.msgs[t.msgs.length - 1];
    return `<div class="qi ${t.cand === selId ? 'on' : ''}" onclick="S.thread='${t.cand}';render()">
      <div class="av" style="background:${c.color};width:30px;height:30px;font-size:11px">${c.av}</div>
      <div style="min-width:0"><b>${esc(c.name)} ${t.unread ? '<span class="chip red" style="font-size:9.5px">MỚI</span>' : ''}</b>
      <small style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${kindIcon[lastMsg.kind] || ''} ${esc(lastMsg.text.slice(0, 44))}…</small></div>
      <small style="margin-left:auto;color:var(--ink-3);flex-shrink:0">${esc(t.last)}</small>
    </div>`;
  }).join('');
  const msgs = sel ? sel.msgs.map((m) => {
    if (m.kind === 'SYS') return `<div class="msg sys">${esc(m.text)}</div>`;
    if (m.kind === 'INTERNAL') return `<div class="msg internal"><b>🔒 Note nội bộ — không vào thread ứng viên thấy, không share ra ngoài team</b>${esc(m.text.replace('🔒 (INTERNAL) ', ''))}<small>${esc(USERS[m.who]?.name || '')} · ${esc(m.when)}</small></div>`;
    return `<div class="msg ${m.dir}"><span class="k">${kindIcon[m.kind]} ${m.kind}</span>${esc(m.text)}<small>${m.dir === 'in' ? esc(C(sel.cand).name) : esc(USERS[m.who]?.name || '')} · ${esc(m.when)}</small></div>`;
  }).join('') : '';
  const c = sel ? C(sel.cand) : null;
  return `
  <div class="focus-wrap">
    <div class="card queue">
      <div class="qh">Hội thoại ${role().rows === 'all' ? '(CẢ TEAM — lens Manager)' : '(của tôi)'} <span class="chip grey">${list.length}</span></div>
      ${items || '<div class="empty">Không có hội thoại nào</div>'}
    </div>
    <div class="card fcard">
      ${sel ? `
      <div class="fc-head">
        <div class="av" style="background:${c.color}">${c.av}</div>
        <div><h2>${esc(c.name)}</h2><div class="sub">${stageChip(c)} · owner: <b>${USERS[sel.ownerOverride || c.owner]?.name || '—'}</b></div></div>
        <button class="btn sm ghost" style="margin-left:auto" onclick="openC('${c.id}')">Hồ sơ 360 →</button>
      </div>
      <div class="fc-body" style="gap:8px">${msgs}</div>
      <div class="fc-foot" style="flex-wrap:wrap">
        <input id="replyBox" placeholder="Trả lời ngay từ đây (SMS/email theo kênh của tin cuối)…" style="flex:1;min-width:220px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit">
        <button class="btn primary sm" onclick="actReply('${sel.cand}', false)">Gửi</button>
        <button class="btn ghost sm" title="Note chỉ team nội bộ thấy — toggle INTERNAL per-note (D36)" onclick="actReply('${sel.cand}', true)">🔒 Lưu note INTERNAL</button>
      </div>` : '<div class="empty">Chọn một hội thoại</div>'}
    </div>
  </div>
  <p class="src-note">💬 <b>Conversations là màn RIÊNG</b> (D29) — pain thật: ReM đang phải nhờ người rà pipeline TAY mỗi ngày vì reply bị chôn.
  SMS + email + call của MỘT người gom về MỘT thread (hệ cũ tách 4 tab theo kênh). Feed mặc định SHARED cho cả team — riêng tư xử lý per-note bằng nút 🔒 INTERNAL (D36), không chia hệ thống private/public cứng.
  Đổi role Recruiter ⇄ Manager để thấy phạm vi khác nhau: Brayan không thấy thread của Gary (owner Nocha), Victoria thấy hết + inbound vô chủ.</p>`;
}

function actReply(candId, internal) {
  const box = $('replyBox');
  const txt = (box && box.value.trim()) || (internal ? 'Ghi chú nội bộ (demo)' : 'Đã nhận thông tin, tôi gửi chi tiết trong hôm nay nhé!');
  const t = THREADS.find((x) => x.cand === candId);
  if (internal) t.msgs.push({ dir: 'note', kind: 'INTERNAL', who: role().user, when: 'bây giờ', text: '🔒 (INTERNAL) ' + txt });
  else t.msgs.push({ dir: 'out', kind: t.msgs.filter((m) => m.kind !== 'INTERNAL' && m.kind !== 'SYS').slice(-1)[0]?.kind === 'EMAIL' ? 'EMAIL' : 'SMS', who: role().user, when: 'bây giờ', text: txt });
  t.unread = false;
  const c = C(candId);
  addTl(c, internal ? 'Note INTERNAL thêm vào thread (chỉ team thấy)' : 'Reply gửi từ màn Conversations — activity log tự ghi');
  toast(internal ? '🔒 Note INTERNAL lưu — KHÔNG gửi cho ứng viên, không hiện trong thread share.' : '📤 Đã gửi — reply-to trỏ về hộp thư hệ thống nên thư trả lời quay lại đúng thread này (D28).');
  render();
}

/* ---------- 📨 TEMPLATES (D26) ---------- */
function vTemplates() {
  const isApprover = S.role === 'manager'; // quyền TEMPLATE_APPROVE
  const stChip = (s) => ({
    DRAFT: '<span class="chip grey">DRAFT</span>', IN_REVIEW: '<span class="chip amber">IN_REVIEW — chờ duyệt</span>',
    ACTIVE: '<span class="chip green">ACTIVE</span>', RETIRED: '<span class="chip grey" style="opacity:.55">RETIRED</span>',
  }[s]);
  const typeIcon = { EMAIL: '✉️ Email', SMS: '💬 SMS', CALL_SCRIPT: '📜 Call script' };
  const rows = TEMPLATES.map((t) => {
    const acts = [];
    if (t.status === 'ACTIVE') acts.push(`<button class="btn sm primary" onclick="toast('📤 Gửi bằng template ACTIVE — ai cũng gửi được, không cần chờ duyệt (D26). Biến \\'${'$'}{first_name}\\'… tự điền.')">Dùng để gửi</button>`);
    if (t.status === 'DRAFT') acts.push(`<button class="btn sm ghost" onclick="actTpl('${t.id}','IN_REVIEW')">Nộp duyệt →</button>`);
    if (t.status === 'IN_REVIEW') acts.push(isApprover
      ? `<button class="btn sm green" onclick="actTpl('${t.id}','ACTIVE')">✓ Duyệt → ACTIVE</button>`
      : `<button class="btn sm ghost" disabled title="Cần quyền TEMPLATE_APPROVE — role này không có">Chờ duyệt (khoá)</button>`);
    if (t.status === 'ACTIVE' && isApprover) acts.push(`<button class="btn sm ghost" onclick="actTpl('${t.id}','RETIRED')">Retire</button>`);
    return `<div class="row" style="align-items:flex-start">
      <div style="flex:1;min-width:0">
        <b>${typeIcon[t.type]} — ${esc(t.name)}</b> <span class="chip blue">${t.stage}</span> ${stChip(t.status)}
        <div style="font-size:12px;color:var(--ink-2);margin-top:4px">${esc(t.body)}</div>
        <small style="color:var(--ink-3)">sửa cuối: ${esc(t.by)} · ${esc(t.updated)}</small>
      </div>
      <div class="acts" style="flex-direction:column">${acts.join('')}</div>
    </div>`;
  }).join('');
  return `
  <div class="card">
    <div class="sec-h">📨 Thư viện template — email · SMS · call script, THEO STATUS <span class="cnt">${TEMPLATES.length}</span>
      <span class="hint">vòng đời DRAFT → IN_REVIEW → ACTIVE → RETIRED (D26) · role hiện tại ${isApprover ? 'CÓ' : 'KHÔNG có'} quyền duyệt</span>
      <button class="btn sm primary" style="margin-left:auto" onclick="toast('＋ Template mới vào DRAFT — bạn dùng nháp của mình được ngay, nhưng muốn cả team dùng thì nộp duyệt.')">＋ Tạo template</button></div>
    ${rows}
  </div>
  <p class="src-note">Đây là "<b>ngôn ngữ tuyển dụng của công ty</b>" — 1 trong 5 thứ hệ cũ làm ĐÚNG phải bê sang (EVIDENCE §5); chỗ hỏng duy nhất của hệ cũ là nó nằm trong trang settings mà nửa công ty mở được.
  Luật D26: ai cũng <b>gửi</b> được template ACTIVE (Re không bị chờ duyệt để làm việc hằng ngày) — chỉ vai có quyền TEMPLATE_APPROVE mới <b>phát hành</b> bản mới (không có 12 dị bản email công ty chạy ngoài tự nhiên).
  Call script ở đây chính là nguồn cho panel 📜 cạnh nút gọi (D39 — xem Focus mode).</p>`;
}

function actTpl(id, to) {
  const t = TEMPLATES.find((x) => x.id === id);
  const from = t.status; t.status = to;
  if (to === 'ACTIVE') t.by = me().name;
  toast({
    IN_REVIEW: `📨 "<b>${esc(t.name)}</b>" nộp duyệt — vai có TEMPLATE_APPROVE (Manager) sẽ thấy nút Duyệt.`,
    ACTIVE: `✅ "<b>${esc(t.name)}</b>" → ACTIVE — từ giờ mọi recruiter gửi được. Audit ghi: ${esc(me().name)} duyệt (${from} → ACTIVE).`,
    RETIRED: `🗄 "<b>${esc(t.name)}</b>" → RETIRED — không gửi được nữa, giữ lại để audit các lần đã gửi.`,
  }[to]);
  render();
}
