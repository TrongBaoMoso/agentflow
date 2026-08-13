/* =========================================================
   LF Recruit v5 · 🎥 WEBINAR (D40) + ⚡ AUTOMATION RULES (EVIDENCE §5)
   + 📈 DASHBOARD QUÁ HẠN cho ReM (Q37)
   ========================================================= */

/* ---------- 🎥 WEBINAR ---------- */
function vWebinars() {
  const seqSteps = ['Xác nhận đăng ký', 'Nhắc T-7', 'Nhắc T-1', 'Nhắc 1h trước', 'Cảm ơn + recording', 'Follow-up CTA'];
  const cards = WEBINARS.map((w) => {
    const seq = `<div style="display:flex;gap:4px;margin:8px 0;flex-wrap:wrap">${seqSteps.map((s, i) =>
      `<span class="chip ${i < w.seq ? 'green' : 'grey'}" style="font-size:10px">${i + 1}. ${s}${i < w.seq ? ' ✓' : ''}</span>`).join('')}</div>`;
    if (w.status === 'UPCOMING') {
      return `<div class="card"><div class="sec-h">🎥 ${esc(w.title)} <span class="chip blue">${esc(w.when)}</span> <span class="chip amber">SẮP DIỄN RA</span>
        <span class="hint">${w.reg} người đăng ký · landing page + chuỗi 6 email kế thừa từ hệ cũ (nó đang chạy TỐT)</span></div>
        <div style="padding:0 16px 6px">${seq}<div style="font-size:12px;color:var(--ink-2)">${esc(w.note)}</div></div>
        <div style="padding:8px 16px 14px;display:flex;gap:8px">
          <button class="btn sm ghost" onclick="toast('Danh sách đăng ký = lead HOT vào Kho S0 với đồng hồ chờ-nhận của TEAM (rule sở hữu lead — kế thừa, chỉ đổi chỗ ở).')">Xem 41 người đăng ký</button>
          <button class="btn sm ghost" onclick="toast('Landing page + Facebook Ads connection giữ nguyên hệ cũ — chỉ đổi nơi lead đổ về (Kho S0 thay vì bảng RLO).')">Landing page ↗</button>
        </div></div>`;
    }
    const att = (w.attendees || []).map((a) => {
      if (a.noShow) return `<div class="row"><div class="who"><div class="av" style="background:#8A93A2">${a.name.split(' ').map((x) => x[0]).join('')}</div><b>${esc(a.name)}</b></div>
        <div class="meta"><span class="chip grey">đăng ký, KHÔNG vào</span> → tự vào nhánh email "tiếc quá + recording", KHÔNG tính attended</div></div>`;
      const shown = w.synced;
      return `<div class="row"><div class="who" ${a.cand ? `onclick="openC('${a.cand}')"` : ''}><div class="av" style="background:${a.cand ? C(a.cand).color : '#8A93A2'}">${a.name.split(' ').map((x) => x[0]).join('')}</div><b>${esc(a.name)}</b></div>
        <div class="meta">${shown
          ? `<span class="chip green">✓ attended (TỰ ĐỘNG)</span> vào ${a.joined} · ra ${a.left} · <b>${a.dur}</b> — Meet API trả mốc join/leave, cờ tự bật`
          : '<span class="chip amber">attended: chưa nạp</span> — bấm "Đồng bộ Meet API" hoặc import CSV'}</div></div>`;
    }).join('');
    return `<div class="card"><div class="sec-h">🎥 ${esc(w.title)} <span class="chip grey">${esc(w.when)}</span> <span class="chip green">ĐÃ DIỄN RA</span>
      <span class="hint">${w.reg} đăng ký · ${(w.attendees || []).filter((a) => !a.noShow).length} vào phòng</span></div>
      <div style="padding:0 16px 4px">${seq}</div>
      ${att}
      <div style="padding:10px 16px 14px;display:flex;gap:8px;align-items:center">
        ${w.synced
          ? '<span class="chip green">✓ Đã đồng bộ Meet API — không ai phải nhập bảng tính điểm danh nữa</span>'
          : `<button class="btn sm primary" onclick="actMeetSync('${w.id}')">⚡ Đồng bộ điểm danh — Google Meet API</button>
             <button class="btn sm ghost" onclick="actMeetSync('${w.id}')">⬆ Import CSV (fallback V1)</button>`}
      </div></div>`;
  }).join('');
  return `${cards}
  <p class="src-note">🎥 Webinar = <b>kênh nuôi dưỡng lớn nhất phễu</b>. Hệ cũ làm ĐÚNG: chuỗi 6 email + landing page + rule sở hữu lead (EVIDENCE §5) — bê nguyên.
  Chỗ hỏng duy nhất: cờ "attended" nạp sau bằng bảng tính nên luôn trễ. <b>D40 (verified 12/08):</b> Google Workspace của công ty gói Business Plus trở lên
  (thấy toggle "Attendance tracking" trong Meet) → đọc <b>Meet REST API v2 conferenceRecords.participants</b> lấy mốc vào/ra ⇒ thời lượng ⇒ cờ attended TỰ bật. Import CSV giữ làm dự phòng V1.</p>`;
}

function actMeetSync(id) {
  const w = WEBINARS.find((x) => x.id === id);
  w.synced = true;
  toast('⚡ Meet API v2 trả về participants (join/leave/duration) — cờ <b>attended</b> tự bật cho 3 người, 2 no-show tự vào nhánh email recording. Không ai mở bảng tính.');
  render();
}

/* ---------- ⚡ AUTOMATION RULES ---------- */
function vAutomation() {
  const rows = AUTORULES.map((r) => `<div class="row" style="align-items:flex-start">
    <label class="switch" title="Bật/tắt từng rule — như Escalation Desk cũ">
      <input type="checkbox" ${r.on ? 'checked' : ''} onclick="actRuleToggle('${r.id}')"><i></i></label>
    <div style="flex:1;min-width:0">
      <b>KHI</b> <span class="chip blue">${esc(r.when)}</span> <b>→</b> <span class="chip ${r.on ? 'green' : 'grey'}">${esc(r.then)}</span>
      <div style="font-size:11px;color:var(--ink-3);margin-top:4px">nguồn: ${esc(r.src)} · priority: ${r.prio}</div>
    </div>
    <div class="acts"><button class="btn sm ghost" onclick="toast('Audit per-rule: rule này chạy 14 lần trong 30 ngày, lần cuối hôm qua 16:02 — như Escalation Desk cũ có audit log từng rule.')">Audit</button></div>
  </div>`).join('');
  return `
  <div class="card">
    <div class="sec-h">⚡ Automation rules — bộ máy ĐẨY VIỆC LIÊN PHÒNG <span class="cnt">${AUTORULES.length} (demo) · ~50 (hệ cũ)</span>
      <span class="hint">port từ Escalation Desk "Automation configuration" — mô hình rule là ĐÚNG, chỉ sửa 2 đầu vào/ra</span></div>
    ${rows}
  </div>
  <div class="card" style="background:var(--cream)"><div class="sec-h" style="border:0">Khác gì hệ cũ?</div>
    <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">
    Hệ cũ đã có ~50 rule "tổ hợp field khớp → tự tạo ticket cho phòng X" (owner mặc định, priority, template, bật/tắt, audit) — <b>giữ nguyên mô hình đó</b>.
    Sửa đúng 2 chỗ hỏng: <b>INPUT</b> — điều kiện hệ cũ là dropdown bấm tay (Paid/Signed/HR status…), ở đây là <b>6 đèn tín hiệu tự bật</b> (PayPal verify, e-sign event, Meet API…);
    <b>OUTPUT</b> — hệ cũ tạo ticket văn xuôi ai đọc nấy hiểu, ở đây tạo <b>việc/checklist có trạng thái</b> nằm đúng queue của phòng nhận. Rule sửa được lúc chạy (bảng recruiting_settings — D24), không deploy.</div></div>
  <p class="src-note">Thử tắt rule đầu rồi bật lại — mỗi lần gạt là một dòng audit. Rule cuối (chờ-nhận kho HOT) là rule MỚI, đang tắt để demo trạng thái off.</p>`;
}

function actRuleToggle(id) {
  const r = AUTORULES.find((x) => x.id === id);
  r.on = !r.on;
  toast(`⚙️ Rule "${esc(r.when)}" → <b>${r.on ? 'BẬT' : 'TẮT'}</b> — audit ghi: ${esc(me().name)}, lý do hỏi khi tắt rule đang chạy (bản thật).`);
  render();
}

/* ---------- 📈 DASHBOARD QUÁ HẠN (Q37) ---------- */
function vDashboard() {
  const key = S.pivotSel;
  const cellCls = (n) => (n === 0 ? '' : n >= 4 ? 'style="background:var(--red-soft);color:var(--red);font-weight:700"' : n >= 2 ? 'style="background:var(--amber-soft);color:var(--amber);font-weight:700"' : 'style="font-weight:600"');
  const head = `<tr><th>Recruiter ↓ · tháng tạo lead →</th>${PIVOT.months.map((m) => `<th style="text-align:center">${m}</th>`).join('')}<th>Tổng</th></tr>`;
  const body = PIVOT.rows.map((r) => {
    const total = r.cells.reduce((a, b) => a + b, 0);
    return `<tr><td><b>${USERS[r.u].name}</b>${r.u === 'nocha' ? ' <span class="chip grey">OOO</span>' : ''}</td>
      ${r.cells.map((n, i) => `<td ${cellCls(n)} class="click" style="text-align:center;cursor:${n ? 'pointer' : 'default'}"
        onclick="${n ? `S.pivotSel='${r.u}|${PIVOT.months[i]}';render()` : ''}">${n || '·'}</td>`).join('')}
      <td style="text-align:center"><b>${total}</b></td></tr>`;
  }).join('');
  const drill = key && PIVOT.drill[key]
    ? `<div class="card"><div class="sec-h">🔍 ${USERS[key.split('|')[0]].name} · lead tạo ${key.split('|')[1]} — đang quá hạn follow-up <span class="cnt">${PIVOT.drill[key].length}</span>
        <button class="btn sm ghost" style="margin-left:auto" onclick="S.pivotSel=null;render()">Đóng</button></div>
      ${PIVOT.drill[key].map((n) => `<div class="row"><div class="meta"><b>${esc(n)}</b></div>
        <div class="acts"><button class="btn sm ghost" onclick="toast('Mở hồ sơ + nút reassign ngay tại đây (bản thật).')">Hồ sơ</button></div></div>`).join('')}</div>`
    : key ? `<div class="card"><div class="empty">Ô này chưa có drill-down demo — bấm các ô Th7</div></div>` : '';
  return `
  <div class="card">
    <div class="sec-h">📈 Bảng chéo quá hạn — recruiter × tháng-tạo-lead = SỐ LEAD ĐANG QUÁ HẠN FOLLOW-UP
      <span class="hint">realtime từ activities — KHÔNG cache (hệ cũ lệch 8 ngày vì cache TTL 691.200s)</span></div>
    <div class="tblwrap"><table class="tbl">${head}${body}</table></div>
    <div style="padding:8px 16px 14px;font-size:12px;color:var(--ink-2)">Bấm vào ô có số → danh sách TÊN lead quá hạn (thứ CSV export hệ cũ không có — ReM phải lật ~100 trang tay).</div>
  </div>
  ${drill}
  <p class="src-note">Q37 — Recruiter team xin ĐÍCH DANH bảng này ("we monitor our pipeline every day"). Re xem số của mình, ReM xem cả team (trùng ranh giới D29). Ngưỡng màu vàng/đỏ đọc từ config cadence (D24), không hardcode.</p>`;
}
