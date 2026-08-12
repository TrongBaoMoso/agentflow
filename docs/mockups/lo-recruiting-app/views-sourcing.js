/* =========================================================
   LF Recruit — interactive prototype · S0 KHO + NURTURE + OUTCOME
   Kho = shared pool (mọi recruiter thấy chung, chưa có owner)
   Outcome modal = luật "sau mỗi cuộc nói chuyện phải có bước kế"
   ========================================================= */

/* ---------- S0 · KHO (shared pool) ---------- */
function vKho() {
  const pool = simE(CANDIDATES.filter((c) => c.stage === 'S0'));
  const hot = pool.filter((c) => c.hot);
  const cold = pool.filter((c) => !c.hot);
  const claimChip = (c) => {
    if (!c.hot) return '<span class="chip grey">cold — không đồng hồ</span>';
    const h = Math.floor(c.claimMin / 60), m = c.claimMin % 60;
    return `<span class="chip ${c.claimMin < 60 ? 'red' : 'amber'}">⏱ TEAM chờ nhận — còn ${h}h ${String(m).padStart(2, '0')}m</span>`;
  };
  const row = (c) => `<div class="row">${rowWho(c)}
    <div class="meta">
      <span class="chip ${c.source === 'Referral' ? 'blue' : c.source === 'Self-apply' ? 'grey' : 'orange'}">${c.source}</span>
      ${c.nmls ? fmtProd(c) : '<span class="chip amber click" onclick="mNmls(\'' + c.id + '\')">Chưa có NMLS — ＋ nhập để enrich</span>'}
      · ${claimChip(c)}
    </div>
    <div class="acts">
      <button class="btn sm primary" onclick="actClaim('${c.id}')">Claim</button>
      <button class="btn sm green" onclick="actContact('${c.id}','call')">Call — tự claim</button>
    </div></div>`;
  return `
  <div class="card" style="background:var(--cream)"><div class="sec-h" style="border:0">🗄 Kho (S0) — màn CHUNG, mọi recruiter thấy cùng danh sách này</div>
    <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">
    Record ở đây <b>chưa có owner, chưa có SLA cá nhân</b>. Nhận việc bằng nút <b>Claim</b> — hoặc bấm <b>Call luôn, máy tự claim</b>
    (không chặn hành động, cũng không để lead vô chủ: hành động đầu tiên = gắn owner + ghi vào feed chung).
    Trần capacity: đang ôm quá <i>max_open</i> lead (config) thì nút Claim mờ.</div></div>
  <div class="card">
    <div class="sec-h">🔥 HOT — tự giơ tay (webinar / self-apply / referral) <span class="cnt">${hot.length}</span>
      <span class="hint">đồng hồ chờ-nhận ${CONFIG.sla[0].hours}h của cả TEAM chạy từ lúc lead xuất hiện · quá hạn → leo lên Exceptions của Manager</span></div>
    ${hot.map(row).join('') || '<div class="empty">Không có lead hot chờ nhận — mọi lead giơ tay đều đã có người ôm ✓</div>'}
  </div>
  <div class="card">
    <div class="sec-h">🧊 COLD — danh bạ Modex, đi "săn" chủ động <span class="cnt">${cold.length} (demo) · 102.715 (thật)</span>
      <span class="hint">không đồng hồ — không ai cam kết gọi 102k người; filter + sort điểm rồi Claim con mồi ngon</span></div>
    ${cold.map(row).join('') || '<div class="empty">trống</div>'}
    <div style="padding:10px 16px 14px"><button class="btn sm ghost" onclick="toast('Import Modex list / CSV — bulk vào kho, KHÔNG auto-assign (kho là kho).')">⬆ Import list</button></div>
  </div>
  <p class="src-note">Khác hệ cũ: kho cũ ai gọi cũng được mà không ai chịu trách nhiệm (2 người gọi 1 lead · 96,8% không ai đụng). Ở đây: <b>gọi được ngay nhưng cú gọi tự gắn trách nhiệm</b>.</p>`;
}

/* ---------- NURTURE ---------- */
function vNurture() {
  const list = simE(visibleCands().filter((c) => c.stage === 'NURTURE'));
  return `<div class="card">
    <div class="sec-h">🌙 Nurture — "chưa phải bây giờ" <span class="cnt">${list.length}</span>
      <span class="hint">rời pipeline nhưng không mất; wake-up + signal Modex tự canh giùm</span></div>
    ${list.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">${c.wakeUp ? '⏰ ' + esc(c.wakeUp)
        : c.nurtureUntil ? '⏰ hẹn quay lại: <b>' + esc(c.nurtureUntil) + '</b> — wake-up task tự tạo đúng ngày'
        : '🌙 từ ' + esc(c.nurtureSince || 'hôm nay') + ' — không có ngày hẹn → cadence mặc định (config) tự nhắc'}
        ${c.signal ? ' · <span class="chip red">📡 ' + esc(c.signal.split('—')[0]) + '</span>' : ''}</div>
      <div class="acts"><button class="btn sm primary" onclick="actReengage('${c.id}')">Re-engage</button>
        <button class="btn sm ghost" onclick="openC('${c.id}')">Hồ sơ</button></div></div>`).join('')
    || '<div class="empty">Không ai trong nurture</div>'}
  </div>
  <p class="src-note">Vào đây từ modal "Kết quả cú gọi" (chọn hẹn lại). Ra khỏi đây 3 đường: đến ngày hẹn (task tự nổi ở Today) · signal Modex (đổi công ty / volume tăng) · re-engage tay. Thay cho 2 status chết "Interested but thinking" / "Want to join" (0 người dùng).</p>`;
}

/* ---------- OUTCOME MODAL — sau mỗi cú gọi, lead phải rẽ nhánh ---------- */
function mOutcome(id) {
  const c = C(id);
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">📋 Kết quả cú gọi — ${esc(c.name)}</div>
    <div class="mb">
      <p style="font-size:12px;color:var(--ink-2)">Luật "S2+ luôn có bước kế tiếp" nằm ở đây: <b>không đóng được modal mà chưa chọn</b>. Mọi lead rẽ nhánh tại chỗ này — không còn lead "nói chuyện xong rồi thôi".</p>
      <button class="btn ghost w" onclick="actOutcome('${id}','next')">✅ Quan tâm — đặt follow-up, giữ trong pipeline</button>
      <button class="btn ghost w" onclick="mNurtureDate('${id}')">📅 Hẹn lại CÓ ngày → Nurture + wake-up đúng ngày</button>
      <button class="btn ghost w" onclick="actOutcome('${id}','nurture')">🌙 Chưa muốn, KHÔNG hẹn → Nurture, cadence mặc định tự nhắc</button>
      <button class="btn ghost w" onclick="actOutcome('${id}','noanswer')">📵 Không bắt máy → task gọi lại tự tạo</button>
      <button class="btn ghost w" onclick="mArchive('${id}')">🗑 Không quan tâm → Archive + lý do (không xoá — re-source sau được)</button>
    </div></div></div>`);
}

function mNurtureDate(id) {
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">📅 Hẹn quay lại — ${esc(C(id).name)}</div>
    <form onsubmit="event.preventDefault();actOutcome('${id}','nurtureDate',this.d.value)">
      <div class="mb"><div class="fld"><label>Ngày hẹn (LO tự xin)</label><input type="date" name="d" required autofocus></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Đúng ngày này, wake-up task tự nổi lên Today của bạn — không cần nhớ, không cần ghi giấy.</p></div>
      <div class="mf"><button type="button" class="btn ghost" onclick="mOutcome('${id}')">← Quay lại</button>
        <button type="submit" class="btn primary">Vào Nurture</button></div>
    </form></div></div>`);
}

function mArchive(id) {
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">🗑 Archive — ${esc(C(id).name)}</div>
    <form onsubmit="event.preventDefault();actOutcome('${id}','archive',this.r.value)">
      <div class="mb"><div class="fld"><label>Lý do (bắt buộc — audit)</label>
        <select name="r"><option>Không quan tâm</option><option>Đã ký nơi khác</option><option>Thông tin sai</option><option>Yêu cầu ngừng liên hệ (→ suppression)</option></select></div></div>
      <div class="mf"><button type="button" class="btn ghost" onclick="mOutcome('${id}')">← Quay lại</button>
        <button type="submit" class="btn primary">Archive</button></div>
    </form></div></div>`);
}

/* ---------- NHẬP NMLS → enrich (Q13: gate S3→S4 cần NMLS) ---------- */
function mNmls(id) {
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">＋ Nhập NMLS — ${esc(C(id).name)}</div>
    <form onsubmit="event.preventDefault();actNmls('${id}',this.n.value)">
      <div class="mb"><div class="fld"><label>NMLS ID (hỏi ứng viên — không bắt lúc đăng ký để giảm friction)</label>
        <input name="n" placeholder="Vd: 1076215" required autofocus></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Nhập xong là Modex tự trả production về (zero-click). 🧪 Demo: số kết thúc bằng 0 → unmatched, task verify tay.</p></div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Lưu & enrich</button></div>
    </form></div></div>`);
}
