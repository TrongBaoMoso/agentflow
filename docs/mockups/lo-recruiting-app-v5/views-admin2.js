/* =========================================================
   LF Recruit v5 · 🧾 AUDIT LOG (D38) + ⛔ SUPPRESSION (D18)
   + 🔀 GỘP TRÙNG (D17) + 🏷 LABELS (Q41)
   ========================================================= */

/* ---------- 🧾 AUDIT LOG — Manager + Admin (D38) ---------- */
function vAudit() {
  const kindChip = (k) => ({
    CONFIG_CHANGE: 'blue', OVERRIDE_GATE: 'amber', BULK_SMS: 'grey',
    TEMPLATE_APPROVE: 'green', REASSIGN: 'blue', CANDIDATE_DELETE: 'red',
  }[k] || 'grey');
  const rows = AUDIT_EVENTS.map((e) => `<tr>
    <td style="white-space:nowrap">${esc(e.when)}</td><td><b>${esc(e.who)}</b></td>
    <td><span class="chip ${kindChip(e.what)}">${e.what}</span></td>
    <td>${esc(e.target)}</td><td style="color:var(--ink-2)">${esc(e.detail)}</td></tr>`).join('');
  return `
  <div class="card">
    <div class="sec-h">🧾 Audit log <span class="cnt">${AUDIT_EVENTS.length}</span>
      <span class="hint">chỉ MANAGER + ADMIN xem được (D38 — Bao chốt 12/08); Recruiter thường không có mục này trong nav</span>
      <button class="btn sm ghost" style="margin-left:auto" onclick="toast('Export audit — copy pattern tera-fe/(private)/audit-log/ (AuditExportModal).')">⬇ Export</button></div>
    <div class="tblwrap"><table class="tbl">
      <tr><th>Khi nào</th><th>Ai</th><th>Loại</th><th>Trên cái gì</th><th>Chi tiết</th></tr>${rows}
    </table></div>
  </div>
  <p class="src-note">Không tự viết hệ audit — mọi event đi qua <b>audit_outbox</b> của tera-core rồi lên audit-log-service của platform (D08, write-once).
  Mọi hành động trong prototype này (đổi SLA, override, duyệt template, reassign, bulk, xoá) đều sinh một dòng ở đây.</p>`;
}

/* ---------- ⛔ SUPPRESSION LIST (D18) ---------- */
function vSuppression() {
  const stopRows = SUPPRESSION.filter((s) => s.type === 'STOP_SMS').map((s) => `<div class="row">
    <div class="meta" style="flex:1"><span class="chip amber">STOP_SMS — theo KÊNH</span> <b>${esc(s.ident)}</b>
      <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">từ ${esc(s.since)} · nguồn: ${esc(s.src)} · ${esc(s.scope)}</div></div>
    <div class="acts">${s.cand ? `<button class="btn sm ghost" onclick="openC('${s.cand}')">Hồ sơ</button>` : ''}
      <button class="btn sm ghost" disabled title="TCPA — không gỡ tay được; chỉ gỡ khi chính người đó nhắn START">Gỡ (khoá)</button></div></div>`).join('');
  const blkRows = SUPPRESSION.filter((s) => s.type === 'BLACKLIST').map((s) => `<div class="row">
    <div class="meta" style="flex:1"><span class="chip red">BLACKLIST — theo NGƯỜI</span> <b>${esc(s.ident)}</b>
      <div style="font-size:11.5px;color:var(--ink-3);margin-top:3px">từ ${esc(s.since)} · nguồn: ${esc(s.src)} · ${esc(s.scope)} · <b>rehire_after: ${esc(s.rehire)}</b></div></div>
    <div class="acts"><button class="btn sm ghost" onclick="toast('Gỡ blacklist = quyền riêng + lý do + audit. Tới ngày rehire_after thì record tự đổi trạng thái \\'xét lại được\\'.')">Xét lại</button></div></div>`).join('');
  return `
  <div class="card"><div class="sec-h">⛔ STOP_SMS — chặn theo KÊNH (luật TCPA, tự động) <span class="cnt">${SUPPRESSION.filter((s) => s.type === 'STOP_SMS').length}</span>
    <span class="hint">người ta nhắn STOP → chỉ kênh SMS bị chặn; call/email vẫn hợp lệ</span></div>
    ${stopRows}</div>
  <div class="card"><div class="sec-h">🚫 BLACKLIST — chặn theo NGƯỜI (công ty quyết định) <span class="cnt">${SUPPRESSION.filter((s) => s.type === 'BLACKLIST').length}</span>
    <span class="hint">mọi kênh + không tuyển lại, có ngày rehire_after</span>
    <button class="btn sm primary" style="margin-left:auto" onclick="toast('＋ Thêm vào blacklist: nhập NMLS/email/phone (chuẩn hoá E.164 / lowercase) + lý do + rehire_after — quyền riêng, audit.')">＋ Thêm</button></div>
    ${blkRows}</div>
  <p class="src-note">D18: hai ngữ nghĩa TÁCH NHAU, cùng một bảng suppression_list, khớp theo <b>định danh chuẩn hoá</b> (E.164 / email lowercase / NMLS) —
  nên <b>sống độc lập với record</b>: xoá/gộp/tạo lại record cùng số điện thoại thì vẫn bị chặn (dòng thứ 2 ở trên không khớp record nào mà vẫn chặn được).
  Hiệu ứng nhìn thấy: mở hồ sơ <b>Hank Rossi</b> (S2) — nút SMS mờ ở MỌI màn, cadence tự bỏ qua kênh SMS của anh này.</p>`;
}

/* ---------- 🔀 GỘP TRÙNG (D17) ---------- */
function dupBanner(c) {
  const other = c.dupOf ? C(c.dupOf) : c.hasDup ? C(c.hasDup) : null;
  if (!other) return '';
  return `<div class="card alertcard"><div class="in"><b>⚠ Nghi TRÙNG:</b> record này và <b>${esc(other.name)}</b> (${other.stage === 'S0' ? 'S0 · Kho' : other.stage}) cùng NMLS <b>${esc(c.nmls || other.nmls)}</b> (chuẩn hoá).
    Hệ cũ chỉ dán nhãn "(Duplicated)" rồi để đó — ở đây gộp thật:
    <button class="btn sm primary" style="margin-left:8px" onclick="mMerge('${c.dupOf ? other.id : c.id}')">So sánh & gộp →</button></div></div>`;
}

function mMerge(survivorId) {
  const a = C(survivorId);              // bản sống (đang ở pipeline)
  const b = C(a.hasDup || 'kaprice2');  // bản trùng trong kho
  const rowF = (label, va, vb, pick) => `<tr><td><b>${label}</b></td>
    <td style="${pick === 'a' ? 'background:var(--green-soft)' : ''}">${esc(va || '—')}</td>
    <td style="${pick === 'b' ? 'background:var(--green-soft)' : ''}">${esc(vb || '—')}</td></tr>`;
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal" style="max-width:560px">
    <div class="mh">🔀 Gộp record trùng — chọn giữ field nào (survivorship từng field)</div>
    <div class="mb">
      <table class="set-tbl"><tr><th>Field</th><th>Bản SỐNG — ${esc(a.name)} (${a.stage})</th><th>Bản trùng — kho S0</th></tr>
        ${rowF('NMLS', a.nmls, b.nmls, 'a')}
        ${rowF('Email', 'kaprice@imperium.com', 'k.nicholson@gmail.com', 'b')}
        ${rowF('Owner + timeline', USERS[a.owner]?.name + ' · ' + (a.timeline || []).length + ' sự kiện', 'không có', 'a')}
        ${rowF('Nguồn', a.source + ' (batch Feb)', b.source + ' (batch khác)', 'a')}
      </table>
      <p style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Ô xanh = giá trị được GIỮ (demo chọn sẵn; bản thật click từng ô). Mọi activity của bản trùng chuyển về bản sống; bản trùng ghi <code>merged_into_id</code>, KHÔNG xoá — audit trace giữ nguyên (D17).</p>
    </div>
    <div class="mf"><button class="btn ghost" onclick="closeModal()">Cancel</button>
      <button class="btn primary" onclick="actMerge('${a.id}','${b.id}')">Gộp về bản sống</button></div>
  </div></div>`);
}

function actMerge(aId, bId) {
  const a = C(aId), b = C(bId);
  b.stage = 'ARCHIVED'; b.archiveReason = 'Merged → ' + a.name; b.dupOf = null;
  a.hasDup = null;
  a.caseNote = a.caseNote.replace(' ⚠ Kho có 1 bản NGHI TRÙNG (cùng NMLS).', '');
  addTl(a, `🔀 Gộp bản trùng (kho S0) về record này — email phụ giữ lại, merged_into_id ghi trên bản kia, audit đủ vết`);
  closeModal();
  toast(`🔀 Đã gộp — kho bớt 1 dòng rác, <b>${esc(a.name)}</b> giữ đủ lịch sử. Hệ cũ: 8 dòng "Test Test" + nhãn "(Duplicated)" không ai gộp được.`);
  render();
}

/* ---------- 🏷 LABELS (Q41 — hybrid: gõ tự do + catalog + chuẩn hoá) ---------- */
function labelChips(c, editable) {
  const chips = (c.labels || []).map((l) => `<span class="chip blue" style="font-size:10.5px">🏷 ${esc(l)}</span>`).join(' ');
  return `${chips}${editable ? ` <span class="chip grey click" style="font-size:10.5px" onclick="event.stopPropagation();mLabel('${c.id}')">＋ nhãn</span>` : ''}`;
}

function mLabel(id) {
  const c = C(id);
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">🏷 Gắn nhãn — ${esc(c.name)}</div>
    <form onsubmit="event.preventDefault();actAddLabel('${id}',this.l.value)">
      <div class="mb">
        <div class="fld"><label>Gõ tự do (CÓ dấu cách, unicode OK — hệ cũ regex chặn dấu cách và từ chối IM LẶNG)</label>
          <input name="l" list="lblcat" placeholder="Vd: Cần gọi tối" required autofocus>
          <datalist id="lblcat">${LABEL_CATALOG.map((l) => `<option>${esc(l)}</option>`).join('')}</datalist></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Chuẩn hoá chống trùng: gõ "webinar  feb" / "WEBINAR FEB" đều khớp nhãn có sẵn <b>Webinar Feb</b> trong catalog thay vì tạo bản mới.
        Manager gộp/đổi tên nhãn trong Settings. (Q41 — chờ ghi sổ thành D41)</p>
      </div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Gắn nhãn</button></div>
    </form></div></div>`);
}

function actAddLabel(id, raw) {
  const c = C(id);
  const norm = raw.trim().replace(/\s+/g, ' ');
  const hit = LABEL_CATALOG.find((l) => l.toLowerCase() === norm.toLowerCase());
  const label = hit || norm;
  if (!hit) LABEL_CATALOG.push(label);
  c.labels = c.labels || [];
  if (!c.labels.includes(label)) c.labels.push(label);
  addTl(c, `🏷 Gắn nhãn "${label}" bởi ${me().name}${hit ? ' (khớp catalog — không tạo bản trùng)' : ' (nhãn MỚI → vào catalog chung)'}`);
  closeModal();
  toast(hit
    ? `🏷 Khớp nhãn có sẵn "<b>${esc(label)}</b>" trong catalog (chuẩn hoá hoa/thường/khoảng trắng) — không sinh "da goi" vs "Đã gọi".`
    : `🏷 Nhãn MỚI "<b>${esc(label)}</b>" tạo + vào catalog chung — người sau gõ gần giống sẽ được gợi ý dùng lại.`);
  render();
}
