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
  const full = capReached();
  const capTip = `title="🚫 Trần capacity — bạn đang ôm ${ownedOpen()}/${CONFIG.maxOpen} lead (max_open, config D24)"`;
  const row = (c) => `<div class="row">${rowWho(c)}
    <div class="meta">
      <span class="chip ${c.source === 'Referral' ? 'blue' : c.source === 'Self-apply' ? 'grey' : 'orange'}">${c.source}</span>
      ${c.dupOf ? `<span class="chip red click" onclick="mMerge('${c.dupOf}')" title="D17 — cùng NMLS với record đang ở pipeline">⚠ nghi TRÙNG — gộp?</span>` : ''}
      ${c.nmls ? fmtProd(c) : '<span class="chip amber click" onclick="mNmls(\'' + c.id + '\')">Chưa có NMLS — ＋ nhập để enrich</span>'}
      · ${claimChip(c)}
    </div>
    <div class="acts">
      <button class="btn sm primary" ${full ? 'disabled ' + capTip : ''} onclick="actClaim('${c.id}')">Claim</button>
      <button class="btn sm green" ${full ? 'disabled ' + capTip : ''} onclick="actContact('${c.id}','call')">Call — tự claim</button>
    </div></div>`;
  return `
  <div class="card" style="background:var(--cream)"><div class="sec-h" style="border:0">🗄 Kho (S0) — màn CHUNG, mọi recruiter thấy cùng danh sách này</div>
    <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">
    Record ở đây <b>chưa có owner, chưa có SLA cá nhân</b>. Nhận việc bằng nút <b>Claim</b> — hoặc bấm <b>Call luôn, máy tự claim</b>
    (không chặn hành động, cũng không để lead vô chủ: hành động đầu tiên = gắn owner + ghi vào feed chung).
    · Bạn đang ôm <b class="chip ${capReached() ? 'red' : ownedOpen() >= CONFIG.maxOpen - 1 ? 'amber' : 'green'}">${ownedOpen()}/${CONFIG.maxOpen} lead</b> (trần max_open — config D24; chạm trần là nút Claim mờ — thử claim thêm 1 người!)</div></div>
  <div class="card">
    <div class="sec-h">🔥 HOT — tự giơ tay (webinar / self-apply / referral) <span class="cnt">${hot.length}</span>
      <span class="hint">đồng hồ chờ-nhận ${CONFIG.sla[0].hours}h của cả TEAM chạy từ lúc lead xuất hiện · quá hạn → leo lên Exceptions của Manager</span></div>
    ${hot.map(row).join('') || '<div class="empty">Không có lead hot chờ nhận — mọi lead giơ tay đều đã có người ôm ✓</div>'}
  </div>
  <div class="card">
    <div class="sec-h">🧊 COLD — danh bạ Modex, đi "săn" chủ động <span class="cnt">${cold.length} (demo) · 102.715 (thật)</span>
      <span class="hint">CEO #6: biết ai GIỎI trước rồi mới bỏ công — mặc định top producer lên đầu</span>
      <span style="margin-left:auto;display:flex;gap:6px">
        <button class="btn sm ${(S.khoSort || 'prod') === 'prod' ? 'primary' : 'ghost'}" onclick="S.khoSort='prod';render()">Sort: production ↓</button>
        <button class="btn sm ${S.khoSort === 'new' ? 'primary' : 'ghost'}" onclick="S.khoSort='new';render()">Mới import</button>
      </span></div>
    ${((S.khoSort || 'prod') === 'prod' ? [...cold].sort((a, b) => (b.since22 || b.vol || 0) - (a.since22 || a.vol || 0)) : cold).map(row).join('') || '<div class="empty">trống</div>'}
    <div style="padding:10px 16px 14px"><button class="btn sm ghost" onclick="actImport()">⬆ Import list (CSV / Modex)</button></div>
  </div>
  <div class="card">
    <div class="sec-h">⬆ Đợt import — kết quả TỪNG ĐỢT, không im lặng <span class="cnt">${IMPORT_BATCHES.length}</span>
      <span class="hint">bài học hệ cũ: import chạy xong báo count = 0 dù có ghi dữ liệu → không ai biết thành hay bại</span></div>
    ${IMPORT_BATCHES.map((b) => `<div class="row">
      <div class="meta" style="flex:1"><b>${esc(b.file)}</b> · ${esc(b.when)} ·
        ${b.status === 'RUNNING' ? '<span class="chip amber">đang chạy…</span>'
        : `<span class="chip green">${b.ok} vào kho ✓</span>${b.dup ? ` <span class="chip amber">${b.dup} trùng (chờ gộp — D17)</span>` : ''}${b.fail ? ` <span class="chip red">${b.fail} lỗi (xem dòng nào, vì sao)</span>` : ''} / ${b.rows} dòng`}</div>
      <div class="acts">${b.fail ? `<button class="btn sm ghost" onclick="toast('Danh sách ${b.fail} dòng lỗi + lý do từng dòng (thiếu tên, phone sai định dạng…) — tải về sửa rồi import lại.')">Xem lỗi</button>` : ''}</div></div>`).join('')}
  </div>
  <p class="src-note">Khác hệ cũ: kho cũ ai gọi cũng được mà không ai chịu trách nhiệm (2 người gọi 1 lead · 96,8% không ai đụng). Ở đây: <b>gọi được ngay nhưng cú gọi tự gắn trách nhiệm</b>. Import bulk vào KHO (S0), KHÔNG auto-assign — kho là kho.</p>`;
}

/* ---------- ⬆ Import mới — mỗi đợt một dòng theo dõi ---------- */
function actImport() {
  const b = { file: 'modex-batch-aug.csv', when: 'hôm nay', rows: 320, ok: 0, dup: 0, fail: 0, status: 'RUNNING' };
  IMPORT_BATCHES.unshift(b);
  render();
  toast('⬆ Import bắt đầu — theo dõi ở card "Đợt import" (không còn kiểu chạy xong báo count=0).');
  setTimeout(() => {
    b.status = 'DONE'; b.ok = 301; b.dup = 14; b.fail = 5;
    toast('✅ <b>modex-batch-aug.csv</b>: 301 vào kho · 14 trùng chờ gộp · 5 lỗi (có danh sách lý do từng dòng).');
    render();
  }, 2400);
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

/* ---------- OUTCOME WIZARD — sau mỗi cú gọi, hỏi đúng 2 câu (CEO 14/08 #3): ① thái độ → ② bước kế tiếp ----------
   Trước đây 5 nút ngang hàng làm "✅ Quan tâm" và "📅 Hẹn lại CÓ ngày" trông na ná (CEO confuse).
   Giờ bước 1 chỉ hỏi THÁI ĐỘ; "hẹn lại có ngày" tụt xuống bước 2 của nhánh 😐 Trung lập/bận.
   Data vẫn tách 2 field (attitude + next-step) — AI sau này cần cả hai. */
function mOutcome(id) {
  const c = C(id);
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">📋 Kết quả cú gọi — ${esc(c.name)} <span class="chip grey">bước 1/2 — họ thế nào?</span></div>
    <div class="mb">
      <p style="font-size:12px;color:var(--ink-2)">Luật "S2+ luôn có bước kế tiếp" nằm ở đây: <b>không đóng được modal mà chưa chọn</b>. Hỏi đúng 2 câu: <b>① thái độ</b> → <b>② bước kế tiếp + ngày</b>.</p>
      <div class="fld"><label>📝 Ghi chú cuộc gọi — NÊN ghi (lưu vào thread hồ sơ dạng INTERNAL: ứng viên không thấy, cả team đọc lại được — D29/D36; hệ cũ: ghi giấy hoặc không gì cả)</label>
        <textarea id="outNote" rows="2" placeholder="Vd: quan tâm comp P3+, vợ chuyển việc tháng 10 — gọi lại giữa tháng 8…" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:inherit;resize:vertical"></textarea></div>
      <button class="btn ghost w" onclick="S.outNote=($('outNote')||{}).value;mNextStep('${id}')">✅ Quan tâm — tích cực, muốn đẩy tới → bước 2: bạn chọn bước kế tiếp</button>
      <button class="btn ghost w" onclick="S.outNote=($('outNote')||{}).value;mNeutral('${id}')">😐 Trung lập / bận — chưa đọc được thái độ → bước 2: giữ nhịp (hẹn ngày / nurture)</button>
      <button class="btn ghost w" onclick="actOutcome('${id}','noanswer')">📵 Không bắt máy → task gọi lại tự tạo (không cần bước 2)</button>
      <button class="btn ghost w" onclick="S.outNote=($('outNote')||{}).value;mArchive('${id}')">🚫 Không quan tâm → Archive + lý do (không xoá — re-source sau được)</button>
    </div></div></div>`);
}

/* 😐 Bước 2 — nhánh Trung lập/bận: KHÔNG đẩy tới, chỉ giữ nhịp. "Hẹn lại CÓ ngày" sống ở đây. */
function mNeutral(id) {
  const c = C(id);
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">😐 ${esc(c.name)} trung lập / bận <span class="chip grey">bước 2/2 — giữ nhịp</span></div>
    <div class="mb">
      <p style="font-size:12px;color:var(--ink-2)">Khác nhánh ✅ Quan tâm (đẩy tới bằng comp sheet / 1-1 / webinar / lên S3) — ở đây chỉ <b>giữ nhịp</b> chờ đúng thời điểm.</p>
      <button class="btn ghost w" onclick="mNurtureDate('${id}')">📅 Bận nhưng HẸN ĐƯỢC ngày (du lịch 2 tuần, chờ thi bằng…) → Nurture + wake-up đúng ngày</button>
      <button class="btn ghost w" onclick="actOutcome('${id}','nurture')">🌙 Chưa hẹn được ngày → Nurture, cadence mặc định tự nhắc (inbound = dừng chuỗi)</button>
    </div>
    <div class="mf"><button type="button" class="btn ghost" onclick="mOutcome('${id}')">← Quay lại bước 1</button></div>
  </div></div>`);
}

/* ✅ QUAN TÂM → RECRUITER QUYẾT ĐỊNH bước kế tiếp (yêu cầu Bao 13/08) — không có "Interested" nằm chờ
   Hệ cũ: chọn status "Interested but thinking"/"Want to join" xong… hết — 0 người nằm trong 2 status đó.
   App mới: "quan tâm" KHÔNG phải trạng thái để nằm; nó bắt buộc đổi thành 1 next-step cụ thể có hạn. */
function mNextStep(id) {
  const c = C(id);
  openModal(`<div class="modal-bg"><div class="modal">
    <div class="mh">✅ ${esc(c.name)} QUAN TÂM — bạn quyết định bước kế tiếp <span class="chip grey">bước 2/2 — đẩy tới</span></div>
    <div class="mb">
      <p style="font-size:12px;color:var(--ink-2)">Mỗi lựa chọn sinh đúng <b>1 task có hạn</b> trên Today — "quan tâm" không phải chỗ nằm. Chọn theo độ chín của lead:</p>
      <div class="fld"><label>Hạn / ngày hẹn (bỏ trống = ngày mai)</label><input type="date" id="nsDate"></div>
      <button class="btn ghost w" onclick="actNextStep('${id}','callnext')">📞 Hẹn cuộc gọi / Zoom kế tiếp → task đúng ngày, script theo stage nằm cạnh nút gọi</button>
      <button class="btn ghost w" onclick="actNextStep('${id}','sendinfo')">📄 Gửi comp sheet / info package (template ACTIVE) → task "check đã mở chưa" tự tạo</button>
      <button class="btn ghost w" onclick="actNextStep('${id}','webinar')">🎥 Mời tham gia webinar kế tiếp → điểm danh tự ghi vào hồ sơ (D40) + task hỏi cảm nhận sau buổi</button>
      <button class="btn ghost w" onclick="actNextStep('${id}','meet11')">🗓 Mời book 1-1 (Calendly) → chip 🗓 lên hồ sơ + task theo dõi booking</button>
      ${!c.nmls ? `<button class="btn ghost w" onclick="actNextStep('${id}','verify')">🔢 Xin NMLS để verify production → nhập là Modex tự kéo (zero-click), mở cổng S3→S4</button>` : ''}
      ${c.stage === 'S2' ? `<button class="btn ghost w" onclick="actNextStep('${id}','s3')">⬆ Đủ độ chín (đã 2 chiều, hỏi sâu comp) → chuyển S3 · Engaged</button>` : ''}
      <button class="btn ghost w" style="border-color:var(--green)" onclick="actNextStep('${id}','join')">🚀 Muốn join LUÔN (kể cả "gọi 1 phát ăn ngay") → verify NMLS → request offer → manager duyệt band → offer + link e-sign tự gửi</button>
    </div>
    <div class="mf"><button type="button" class="btn ghost" onclick="mOutcome('${id}')">← Quay lại kết quả gọi</button></div>
  </div></div>`);
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

/* Dời hạn follow-up — task KHÔNG mất, chỉ đổi ngày (hệ cũ: dời lịch = tự nhớ trong đầu) */
function mResched(id) {
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">📅 Dời follow-up — ${esc(C(id).name)}</div>
    <form onsubmit="event.preventDefault();actResched('${id}',this.d.value)">
      <div class="mb"><div class="fld"><label>Dời đến ngày</label><input type="date" name="d" required autofocus></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Task giữ nguyên nội dung — chỉ đổi hạn; đúng ngày lại tự nổi lên Today. Khác với Done: Done = việc này xong và phải chọn next-step mới.</p></div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Dời lịch</button></div>
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
