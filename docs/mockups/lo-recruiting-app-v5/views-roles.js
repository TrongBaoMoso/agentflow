/* =========================================================
   LF Recruit — interactive prototype · VIEWS theo role
   Mọi list đều DERIVE từ CANDIDATES qua lens — không data riêng
   ========================================================= */

const rowWho = (c) => `<div class="who" onclick="openC('${c.id}')">
  <div class="av" style="background:${c.color}">${c.av}</div>
  <div><b>${esc(c.name)}</b><small>${c.nmls ? 'NMLS ' + c.nmls + ' · ' : ''}${esc(c.city)}</small></div></div>`;

/* ---------- RECRUITER · TODAY ---------- */
function vToday() {
  /* vá 17/08 (#17 — Phương Nguyên/CEO): Focus = chế độ LÀM của chính Today. Bấm ▶ là chạy queue tại chỗ. */
  if (S.todayFocus) {
    return `<div class="toolrow" style="margin-bottom:10px">
      <button class="btn ghost" onclick="S.todayFocus=false;render()">← Về danh sách Today</button>
      <span class="chip grey">Focus dời từ Pipeline sang Today (#17) — cùng queue, chế độ LÀM lần lượt · <i>J</i> next · <i>K</i> back · <i>Enter</i> gọi</span>
    </div>` + vFocus();
  }
  const mine = visibleCands();
  const newLeads = simE(mine.filter((c) => c.stage === 'S1' && c.slaMin != null && c.slaMin >= 0));
  const followUps = simE(mine.filter((c) => c.followUp || asksOf(c).some((a) => a.answered && !a.relayed)));
  const signals = simE(mine.filter((c) => c.signal && c.stage === 'NURTURE'));
  const wakeups = simE(mine.filter((c) => c.wakeUp));
  const offers = simE(mine.filter((c) => c.offer?.status === 'VIEWED'));
  const simBanner = S.sim === 'modexDown'
    ? `<div class="card alertcard"><div class="in"><b>⚠ Modex webhook lỗi từ 09:12</b> — enrichment & monthly refresh tạm dừng, hệ thống tự retry (không mất record nào).
       Verification dùng data as-of cũ; gate S4 vẫn chặn tạo offer nếu data &gt;90 ngày — pipeline S0–S7, SLA, Call/SMS <b>chạy bình thường</b> (fallback §9.9).</div></div>`
    : S.sim === 'quiet'
    ? `<div class="card" style="background:var(--green-soft);border-color:var(--green)"><div class="sec-h" style="border:0;color:var(--green)">🎉 Sạch việc — mọi SLA đạt, không follow-up quá hạn</div>
       <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">Đây là trạng thái đích của Today view: việc tự tìm đến bạn, hết việc = màn hình nói rõ "xong rồi" thay vì bảng trống vô hồn. Gợi ý lúc rảnh: mở 🌙 Nurture xem ai sắp wake-up.</div></div>`
    : '';
  /* vá 17/08 (#29): KPI card = quick-action filter — bấm là lọc danh sách bên trái, bấm lại là bỏ lọc */
  const F = S.todayFilter;
  const show = (k) => !F || F === k;
  const kpi = (n, l, alert, key) => `<div class="kpi ${alert ? 'alert' : ''}" title="Bấm để lọc Today theo nhóm này (#29)"
    style="cursor:pointer${F === key ? ';outline:2px solid #1D4ED8;border-radius:8px' : ''}"
    onclick="S.todayFilter=S.todayFilter==='${key}'?null:'${key}';render()"><b>${n}</b><span>${l}</span></div>`;
  const filterBar = F ? `<div class="card" style="display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:12px;color:var(--ink-2)">
    Đang lọc theo KPI: <b>${{ sla: '⏱ SLA gấp', due: '📞 Due today', wake: '📡 Wake-ups & signals', offer: '✍️ Offer pending' }[F]}</b>
    <button class="btn sm ghost" onclick="S.todayFilter=null;render()">✕ Bỏ lọc</button></div>` : '';
  /* vá 17/08 (#27/#31): rollover — task hôm qua KHÔNG biến mất, máy nhắc thay manager; missed-log nuôi Reports */
  const rollover = (S.role === 'recruiter' && !S.rolloverDismissed && S.sim !== 'quiet') ? `
    <div class="card" style="border-left:4px solid var(--amber)">
      <div class="sec-h" style="border:0">⏮ Hôm qua bạn còn 2 việc chưa xong <span class="hint">rollover giữ nguyên TUỔI TRỄ — máy nhắc, manager không đi nhắc tay (CEO #27/#31); bản ghi vào missed-log cho Reports</span>
        <button class="btn sm ghost" style="margin-left:auto" onclick="S.rolloverDismissed=true;render()">Đã hiểu</button></div>
      <div class="row">${rowWho(C('chad'))}<div class="meta">Follow-up comp sheet — <span class="chip amber">trễ 1 ngày (rollover)</span></div>
        <div class="acts"><button class="btn sm green" onclick="actContact('chad','call')">Call now</button></div></div>
      <div class="row">${rowWho(C('joseph'))}<div class="meta">Gọi sau closing thứ Sáu — <span class="chip red">trễ 2 ngày</span></div>
        <div class="acts"><button class="btn sm green" onclick="actContact('joseph','call')">Call now</button></div></div>
    </div>` : '';
  /* vá 17/08 (#17): nút vào Focus mode ngay trên Today */
  const focusBar = S.role === 'recruiter' ? `<div class="card" style="display:flex;align-items:center;gap:10px;padding:10px 16px;flex-wrap:wrap">
    <button class="btn primary" onclick="S.todayFocus=true;S.focusIdx=0;render()">▶ Bắt đầu — Focus mode (${focusQueue().length} việc)</button>
    <span style="font-size:12px;color:var(--ink-2)">Xử lý lần lượt, không chọn việc — Focus dời từ Pipeline sang đây (#17). Pipeline giữ Kanban/Table/Funnel (chế độ NHÌN).</span></div>` : '';
  /* 📜 D39 — nút cạnh Call mở panel script (mặc định gập, bấm là bung full-width ngay dưới row) */
  const scriptBtn = (c) => `<button class="btn sm ghost" onclick="actScript('${c.id}')" title="📜 Call script theo status — cạnh nút gọi, mặc định gập (D39)">📜</button>`;
  const cRow = (c, extra, acts) => `<div class="row">${rowWho(c)}<div class="meta">${extra}</div><div class="acts">${acts}</div></div>
    ${S.scriptFor === c.id ? `<div style="padding:0 16px 10px">${callScript(c, true)}</div>` : ''}`;
  const contactBtns = (c) => `<button class="btn sm green" onclick="actContact('${c.id}','call')">Call</button>${scriptBtn(c)}
    ${smsBlocked(c)
      ? '<button class="btn sm ghost" disabled title="⛔ STOP_SMS — suppression list (TCPA, D18)">SMS ⛔</button>'
      : `<button class="btn sm ghost" onclick="actContact('${c.id}','sms')">SMS</button>`}
    <button class="btn sm ghost" onclick="actContact('${c.id}','email')">Email</button>`;
  return `
  <div class="cols"><div class="col-main">
    ${simBanner}${rollover}${focusBar}${filterBar}
    ${show('sla') ? `<div class="card">
      <div class="sec-h">🔥 New leads — first touch SLA <span class="cnt">${newLeads.length}</span><span class="hint">auto-assigned · SLA ${CONFIG.sla[1].hours}h (admin đổi trong Settings)</span></div>
      ${newLeads.map((c) => cRow(c,
        `<span class="chip ${c.source === 'Referral' ? 'blue' : c.source === 'Self-apply' ? 'grey' : 'orange'}">${c.source}</span> &nbsp;
         ${c.vol != null ? fmtProd(c) : c.enrichFail ? `<span class="chip red">⚠ ${esc(c.enrichFail)}</span>` : `<span class="chip amber click" onclick="event.stopPropagation();mNmls('${c.id}')">No NMLS — ＋ hỏi & nhập để enrich</span>`} &nbsp;${slaChip(c)}`,
        contactBtns(c))).join('') || '<div class="empty">Không còn lead chờ first touch — Call/SMS xong là tự chuyển S2 ✓</div>'}
    </div>` : ''}
    ${(() => {
      /* Feedback CEO #1 (15/08): toggle demo — Signals để card riêng (hiện tại) vs gộp vào follow-ups
         thành "Hôm nay cần chạm" (đề xuất). Bản gộp: mỗi dòng mang chip LÝ DO (📅 bạn hẹn / 🌙 wake-up /
         📡 signal); việc CÓ HẠN nằm trên, signal là THỜI CƠ (không deadline) nên xếp cuối. */
      const merged = !!S.mergeSignals;
      const fuRows = followUps.map((c) => {
        const relayA = asksOf(c).find((a) => a.answered && !a.relayed); // câu trả lời phòng ban chưa relay → task
        return cRow(c,
          (merged ? '<span class="chip blue" title="Từ next-step bạn đã hẹn">📅 bạn hẹn</span> ' : '')
          + (relayA ? `<b>${relayA.to}</b> đã trả lời: “<b>${esc(relayA.a)}</b>” → relay cho ứng viên` : `“${esc(c.followUp)}”`)
          + (c.followUpDue ? ` · <span class="chip grey">dời → ${esc(c.followUpDue)}</span>` : '')
          + (c.cadence ? ` · <span class="chip amber" title="Cadence D23/D24 — bậc ${CONFIG.cadence.tiers.join('/')} ngày, config">⏲ ${esc(c.cadence.label)}</span> <span class="chip grey" title="Luật Q35 — lead trả lời là chuỗi tự dừng">inbound = dừng chuỗi</span>` : ''),
          `<button class="btn sm green" onclick="actContact('${c.id}','call')">Call now</button>${scriptBtn(c)}
           <button class="btn sm ghost" onclick="mResched('${c.id}')" title="Đổi hạn — task không mất, đúng ngày tự nổi lại">Reschedule</button>
           <button class="btn sm ghost" onclick="actFuDone('${c.id}')" title="Xong việc này — luật S2+ bắt chọn next-step ngay">Done</button>`);
      }).join('');
      const sigRows = signals.map((c) => cRow(c,
        (merged ? '<span class="chip orange" title="Máy phát hiện từ đợt Modex refresh — thời cơ, không phải deadline">📡 signal Modex</span> ' : '')
        + `<span class="chip red">${esc(c.signal.split(':')[0])}</span> ${esc(c.signal.split('—')[0].split(':').slice(1).join(':'))} — cửa sổ vàng`,
        `<button class="btn sm primary" onclick="actReengage('${c.id}')">Re-engage</button>
         <button class="btn sm ghost" onclick="toast('Dismissed — signal này không bắn lại.')">Dismiss</button>`)).join('');
      const wakeRows = wakeups.map((c) => cRow(c,
        (merged ? `<span class="chip grey">🌙 wake-up đúng hẹn</span> ${esc(c.wakeUp)}` : `🌙 ${esc(c.wakeUp)}`),
        `<button class="btn sm primary" onclick="actReengage('${c.id}')">Re-engage</button>
         <button class="btn sm ghost" onclick="openC('${c.id}')">Mở hồ sơ</button>`)).join('');
      const toggleBar = `<div class="card" style="display:flex;align-items:center;gap:8px;padding:9px 16px;font-size:12px;color:var(--ink-2);flex-wrap:wrap">
        📡 Vị trí Signals — toggle để demo (feedback CEO #1):
        <button class="btn sm ${merged ? 'ghost' : 'primary'}" onclick="S.mergeSignals=false;render()">Card riêng (hiện tại)</button>
        <button class="btn sm ${merged ? 'primary' : 'ghost'}" onclick="S.mergeSignals=true;render()">Gộp vào follow-ups (đề xuất)</button></div>`;
      if (!show('due') && !show('wake')) return '';
      return merged ? `${toggleBar}
    <div class="card">
      <div class="sec-h">📞 Hôm nay cần chạm <span class="cnt">${followUps.length + signals.length + wakeups.length}</span><span class="hint">một danh sách người-cũ duy nhất — chip nói VÌ SAO ở đây; việc có hạn trên, thời cơ (signal) cuối</span></div>
      ${fuRows}${wakeRows}${sigRows}${!(fuRows || wakeRows || sigRows) ? '<div class="empty">Hôm nay chưa có ai cần chạm</div>' : ''}
    </div>` : `${toggleBar}
    ${show('due') ? `<div class="card">
      <div class="sec-h">📞 Follow-ups hôm nay <span class="cnt">${followUps.length}</span><span class="hint">từ next-step bạn đã hẹn + relay từ phòng khác</span></div>
      ${fuRows || '<div class="empty">Chưa có follow-up đến hạn</div>'}
    </div>` : ''}
    ${show('wake') ? `<div class="card">
      <div class="sec-h">📡 Signals — Modex monthly refresh <span class="cnt">${signals.length}</span><span class="hint">nurture list tự canh mình — máy DIFF bản tháng mới vs bản cũ: đổi công ty / volume tăng</span></div>
      ${sigRows || '<div class="empty">Không có signal mới</div>'}
      ${wakeRows}
    </div>` : ''}`;
    })()}
    ${show('offer') ? `<div class="card">
      <div class="sec-h">✍️ Offers awaiting signature <span class="cnt">${offers.length}</span><span class="hint">mét cuối của deal — mở mà không ký = có lấn cấn; sort theo ngày chờ, quá ngưỡng leo Exceptions</span></div>
      ${offers.map((c) => cRow(c, `<span class="chip amber">Viewed — chưa ký · ${c.offer.stallDays}d</span> ${esc(c.offer.viewedNote || '')} · band ${c.offer.band}`,
        `<button class="btn sm primary" onclick="actRemind('${c.id}')">Send reminder</button>
         <button class="btn sm ghost" onclick="actContact('${c.id}','call')">Call</button>`)).join('') || '<div class="empty">Không có offer đang chờ ký</div>'}
    </div>` : ''}
  </div>
  <div class="rail">
    <div class="card"><h4>My funnel — tuần này</h4>
      <div class="funnel-line"><span>New leads</span><b>14</b></div>
      <div class="funnel-line"><span>First touch trong SLA</span><b>92%</b></div>
      <div class="funnel-line"><span>Moved to Engaged</span><b>6</b></div>
      <div class="funnel-line"><span>Verified</span><b>3</b></div>
      <div class="funnel-line"><span>Offers ký</span><b>1</b></div></div>
    <div class="card"><h4>KPIs <span class="chip grey" style="font-weight:500">bấm = lọc (#29)</span></h4><div style="display:flex;gap:8px;flex-wrap:wrap">
      ${kpi(newLeads.filter((c) => c.slaMin < 300).length, 'SLA gấp', true, 'sla')}${kpi(followUps.length, 'Due today', false, 'due')}${kpi(signals.length + wakeups.length, 'Wake-ups', false, 'wake')}${kpi(offers.length, 'Offer pending', false, 'offer')}</div></div>
    <div class="card" style="background:var(--cream)"><h4>⚡ Zero-click enrichment</h4>
      <p style="font-size:12px;color:var(--ink-2)">Nhập NMLS là đủ — production tự về từ Modex. Thử: <b>＋ Add lead</b> trong Pipeline, điền NMLS bất kỳ.</p></div>
  </div></div>
  <p class="src-note">Today = việc TỰ TÌM ĐẾN recruiter (không đi tuần bảng 106k dòng). Bấm Call/SMS trên lead S1 → tự chuyển S2 + timeline ghi.</p>`;
}

/* ---------- MANAGER · EXCEPTIONS ---------- */
function vExceptions() {
  const breached = simE(CANDIDATES.filter((c) => c.stage === 'S1' && c.slaMin != null && c.slaMin < 0));
  const requests = simE(CANDIDATES.filter((c) => c.offer?.status === 'REQUESTED'));
  const reassignSel = (c) => `<select class="select" style="padding:4px 8px;font-size:11.5px" onchange="if(this.value)actReassign('${c.id}',this.value)">
      <option value="">Reassign ▾</option>
      ${['brayan', 'seth'].map((u) => `<option value="${u}">${USERS[u].name}</option>`).join('')}</select>`;
  return `
  <div class="card">
    <div class="sec-h">🚨 SLA breached — cần reassign <span class="cnt">${breached.length}</span><span class="hint">lead trễ tự leo lên đây — không nằm im trong bảng</span></div>
    ${breached.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">Owner: <b>${USERS[c.owner].name}</b>${c.owner === 'nocha' ? ' — <b>đang OOO</b> mà routing vẫn assign vào → sửa rule' : c.owner === 'luis' ? ' — trễ SLA <b>4 lần</b> tuần này' : ''} · vào ${c.breachedFor} trước</div>
      <div class="acts">${reassignSel(c)}
        <button class="btn sm ghost" onclick="toast('Đã nhắc ${USERS[c.owner].name} (in-app + SMS).')">Nhắc</button>
        ${c.owner === 'nocha' ? `<button class="btn sm ghost" onclick="toast('⚙️ Routing rule: skip owner đang OOO — sửa trong Settings (demo).')">Sửa routing</button>` : ''}
      </div></div>`).join('') || '<div class="empty">Không còn lead trễ SLA — team đang chạy đúng nhịp 🎉</div>'}
  </div>
  ${(() => {
    /* vá 17/08 (#33 case B): người NGHỈ → manager mở coverage view xử lý thay — KHÔNG cần login-as.
       Hành động ghi tên manager + note "coverage cho X" (trung thực với audit hơn impersonation). */
    const cov = CANDIDATES.filter((c) => c.owner === 'nocha' && !['S0', 'S7', 'ARCHIVED'].includes(c.stage));
    return `<div class="card">
    <div class="sec-h">🧑‍🤝‍🧑 Coverage — người đang nghỉ <span class="cnt">1</span>
      <span class="hint">OOO từ HR app webhook / đánh dấu tay — auto-assign đã skip; việc đang ôm xử lý tại đây (#33 case B, không login-as)</span></div>
    <div class="row"><div class="who"><div class="av" style="background:${USERS.nocha.color}">NK</div>
      <div><b>Nocha Kelly</b><small>🌙 OOO đến 10/8 — nguồn: HR app webhook</small></div></div>
      <div class="meta">đang ôm <b>${cov.length}</b> lead active · routing đã tự skip từ lúc OOO bật</div>
      <div class="acts"><button class="btn sm ghost" onclick="toast('📦 Bulk reassign toàn bộ workload của Nocha — chia đều cho người còn tay (tôn trọng trần capacity). Nocha quay lại thì KHÔNG tự lấy lại — tránh giật việc giữa chừng.')">Chia đều cho team</button></div></div>
    ${cov.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">${stageChip(c)} ${slaChip(c)} · việc đang treo: ${esc(c.followUp || c.caseNote?.slice(0, 48) + '…' || '—')}</div>
      <div class="acts">
        <button class="btn sm primary" onclick="toast('📞 Gọi thay — activity ghi: Victoria Pham (coverage cho Nocha Kelly). Đúng tên người làm, audit không mù như login-as hệ cũ.')">Xử lý thay</button>
        <select class="select" style="padding:4px 8px;font-size:11.5px" onchange="if(this.value)actReassign('${c.id}',this.value)">
          <option value="">Reassign ▾</option>
          ${['brayan', 'seth'].map((u) => `<option value="${u}">${USERS[u].name}</option>`).join('')}</select>
      </div></div>`).join('')}
  </div>`;
  })()}
  <div class="card">
    <div class="sec-h">✍️ Offer requests chờ duyệt <span class="cnt">${requests.length}</span><span class="hint">nghẽn lớn nhất tháng — S4→S5 giảm 18đ</span></div>
    ${requests.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta"><b>${fmtVol(c)}</b> · Band gợi ý: <b>${c.offer.band}</b> · Recruiter: ${USERS[c.offer.requestedBy]?.name || '—'} · đợi <span class="chip ${c.offer.waitDays >= 3 ? 'red' : 'amber'}">${c.offer.waitDays} ngày</span>${c.offer.note ? ' · note: “' + esc(c.offer.note) + '”' : ''}</div>
      <div class="acts"><button class="btn sm green" onclick="actApprove('${c.id}')">Approve</button>
        <button class="btn sm ghost" onclick="actChangeBand('${c.id}')">Đổi band</button>
        <button class="btn sm ghost" onclick="toast('Đã gửi câu hỏi lại cho recruiter — thread ngay trên hồ sơ.')">Hỏi lại</button></div></div>`).join('')
    || '<div class="empty">Hết request chờ duyệt — S4→S5 thông ✓ (bạn vừa gỡ nghẽn đó!)</div>'}
  </div>
  <div class="card">
    <div class="sec-h">🤖 Gửi tự động bị CHẶN — cần người xử lý <span class="cnt">1</span>
      <span class="hint">D25: owner → trưởng phòng → CHẶN + alert (hệ cũ chỉ logger.warn — tin nhắn biến mất không ai biết)</span></div>
    <div class="row"><div class="who" onclick="openC('wanda')"><div class="av" style="background:#7C5CBF">WP</div>
      <div><b>Wanda Perez</b><small>chiến dịch re-source kho tháng 8 · email #1</small></div></div>
      <div class="meta"><span class="chip red">CHẶN</span> Lead <b>không có owner</b> (S0) và phòng Recruiting <b>chưa đặt head-of-department fallback</b> → máy KHÔNG gửi từ danh tính vô danh, cũng KHÔNG nuốt im lặng — tạo alert này.</div>
      <div class="acts"><button class="btn sm primary" onclick="toast('Gán owner → email tự gửi lại từ danh tính người đó (owner-first, D25).')">Gán owner</button>
        <button class="btn sm ghost" onclick="toast('Đặt head-of-department trong Settings → mọi lead vô chủ fallback về danh tính này.')">Đặt fallback</button></div></div>
  </div>
  <div class="card">
    <div class="sec-h">📊 Team hôm nay<span class="hint">bấm tên → pipeline của người đó</span></div>
    ${RECRUITER_STATS.map((r) => { const u = USERS[r.u]; const cls = r.sla >= 90 ? 'green' : r.sla >= 75 ? 'amber' : 'red';
      return `<div class="row"><div class="who" onclick="go('pipeline')"><div class="av" style="background:${u.color}">${u.av}</div><b>${u.name}</b>${r.u === 'seth' ? ' <span class="chip grey">outside</span>' : ''}</div>
      <div class="meta">${r.leads} active · SLA <span class="chip ${cls}">${r.sla}%</span> · ${r.offers} offer đang chạy${r.u === 'luis' ? ' · <b>cần 1:1 về routing thứ Hai</b>' : ''}</div></div>`; }).join('')}
  </div>
  <div class="card" style="background:var(--cream)"><div class="sec-h" style="border:0">✨ AI weekly digest</div>
    <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">“${AI_DIGEST}”</div></div>
  <p class="src-note">Manager chỉ thấy NGOẠI LỆ. Thử: Approve Roger Kube → đổi role sang HR sẽ thấy việc "soạn offer" hiện ra. Reassign Tara → SLA reset.</p>`;
}

/* ---------- HR · OFFER DESK ---------- */
function vHrQueue() {
  const toDraft = simE(CANDIDATES.filter((c) => c.offer?.status === 'APPROVED'));
  const tracking = simE(CANDIDATES.filter((c) => ['SENT', 'VIEWED'].includes(c.offer?.status)));
  const signed = simE(CANDIDATES.filter((c) => c.offer?.status === 'SIGNED'));
  const hrAsks = simE(deptPendingAsks('HR')); // cùng cơ chế queue câu hỏi như Licensing — mọi phòng đều có
  const down = S.sim === 'esignDown';
  const dis = down ? 'disabled title="e-sign service down — tạm khoá"' : '';
  return `
  ${hrAsks.length ? `<div class="card">
    <div class="sec-h">❓ Câu hỏi từ recruiter <span class="cnt">${hrAsks.length}</span><span class="hint">hỏi trong app — trả lời là relay tự nổi lên Today của Re; Q&A lưu trên hồ sơ</span></div>
    ${hrAsks.map((c) => {
      const a = asksOf(c).find((x) => x.to === 'HR' && !x.answered);
      return `<div class="row">${rowWho(c)}
      <div class="meta"><span class="chip blue">${esc(a.q)}</span> · hỏi bởi ${esc(USERS[a.by]?.name || 'Re')} · ${esc(a.at)}</div>
      <div class="acts"><button class="btn sm primary" onclick="actAnswerRelay('${c.id}','HR')">Gửi trả lời</button></div></div>`;
    }).join('')}
  </div>` : ''}
  ${down ? `<div class="card alertcard"><div class="in"><b>⚠ document-esign không phản hồi</b> (health check fail 3 lần liên tiếp) — nút soạn/gửi/nhắc tạm khoá để không mất offer vào hư không.
    Offer đã gửi vẫn ký được phía ứng viên; trạng thái viewed/signed sẽ <b>tự đồng bộ lại</b> khi service hồi. Không cần làm gì tay.</div></div>` : ''}
  <div class="card">
    <div class="sec-h">📝 Offer cần soạn <span class="cnt">${toDraft.length}</span><span class="hint">manager đã duyệt band — HR chốt số & gửi</span></div>
    ${toDraft.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">Band <b>${c.offer.band}</b> ${c.offer.snapshot ? `· <span class="chip blue click" onclick="mSnapshot('${c.id}')" title="D37 — căn cứ duyệt đóng băng lúc submit">🧊 snapshot $${c.offer.snapshot.vol}M · ${c.offer.snapshot.units}u · ${c.offer.snapshot.source} · ${c.offer.snapshot.asOf}</span>` : '· số liệu snapshot đóng băng vào offer'} · Trả bằng:
        <span class="chip grey click" onclick="toast('Cash ⇄ RSU — chỉ HR bật RSU được (rule kế thừa §8.4).')">Cash ▾</span>
        ${c.offer.note ? ' · note recruiter: “' + esc(c.offer.note) + '”' : ''}</div>
      <div class="acts"><button class="btn sm primary" ${dis} onclick="actDraftOffer('${c.id}')">Soạn & gửi offer</button>
        <button class="btn sm ghost" onclick="toast('Template offer theo band — chỉ điền phần cá nhân hoá.')">Template ▾</button></div></div>`).join('')
    || '<div class="empty">Chưa có offer chờ soạn — sang role Manager duyệt request là việc hiện ra ở đây (một kho, hai lens)</div>'}
  </div>
  <div class="card">
    <div class="sec-h">✍️ E-sign đang theo dõi <span class="cnt">${tracking.length}</span><span class="hint">qua document-esign service — trạng thái tự cập nhật</span></div>
    ${tracking.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">${c.offer.status === 'VIEWED'
        ? `<span class="chip amber">Viewed · chưa ký · ${c.offer.stallDays}d</span> ${esc(c.offer.viewedNote || '')}`
        : `<span class="chip blue">Sent ${c.offer.sent} · chưa mở</span>`}</div>
      <div class="acts"><button class="btn sm primary" ${dis} onclick="actRemind('${c.id}')">Nhắc + gọi</button>
        <button class="btn sm green" onclick="actSign('${c.id}')">（demo: ứng viên ký）</button>
        <button class="btn sm ghost" ${dis} onclick="toast('Đã gia hạn link e-sign thêm 7 ngày.')">Gia hạn link</button></div></div>`).join('')
    || '<div class="empty">Không có e-sign đang chờ</div>'}
  </div>
  ${signed.length ? `<div class="card"><div class="sec-h">✅ Vừa ký — đã tự sang S6 <span class="cnt">${signed.length}</span></div>
    ${signed.map((c) => `<div class="row">${rowWho(c)}<div class="meta"><span class="chip green">Signed ✓</span> → tự chuyển S6 · checklist tự mở — không ai chuyển tay</div>
    <div class="acts"><button class="btn sm ghost" onclick="openC('${c.id}')">Xem hồ sơ</button></div></div>`).join('')}</div>` : ''}
  ${vHrLights()}
  <p class="src-note">HR không hỏi "ai tới lượt tôi?" — qua gate S4 là tự hiện. Thử bấm "(demo: ứng viên ký)" cho Trent → rồi đổi role Onboarding xem checklist mở.</p>`;
}

/* ---------- HR · 6 ĐÈN + VERIFY (fallback trước khi HR app bắn event) ---------- */
function vHrLights() {
  const onb = simE(CANDIDATES.filter((c) => ['S6', 'S7'].includes(c.stage) && c.checklist));
  return `<div class="card">
    <div class="sec-h">🚥 Đang onboarding — đèn tín hiệu & verify <span class="cnt">${onb.length}</span>
      <span class="hint">PAID/SIGNED tự bật · đèn HR: chờ hr.loanfactory.com bắn event — tạm thời 2 nút verify</span></div>
    ${onb.map((c) => {
      const hv = c.hrVerify || { todos: false, docs: false };
      return `<div class="row">${rowWho(c)}
      <div class="meta">${lightsBar(c)} &nbsp;${hrStatusChip(c)}</div>
      <div class="acts">
        <button class="btn sm ${hv.todos ? 'ghost' : 'green'}" ${hv.todos ? 'disabled' : ''} onclick="actHrVerify('${c.id}','todos')">${hv.todos ? 'To-dos ✓' : 'Verify To-dos'}</button>
        <button class="btn sm ${hv.docs ? 'ghost' : 'green'}" ${hv.docs ? 'disabled' : ''} onclick="actHrVerify('${c.id}','docs')">${hv.docs ? 'Documents ✓' : 'Verify Documents'}</button>
      </div></div>`;
    }).join('') || '<div class="empty">Chưa ai trong onboarding</div>'}
    <div style="padding:10px 16px 14px;font-size:12px;color:var(--ink-2)">
      <span class="chip amber">GIẢ ĐỊNH</span> Nội dung To-dos (Compliance Courses…) & Documents (W-9, Remote Work Policy, Passport/GC, Cyber Security)
      lấy từ 13 ảnh chụp flow HR thật — chờ Q11/Q12 chốt danh sách chính thức. Khi HR app có outbound event, 2 nút này biến mất — đèn tự bật ("ổ cắm trước, phích sau").<br>
      <b>Tạo account:</b> đường THƯỜNG là tự động — automation rule "PAID + SIGNED + 1-1 done → gửi request tạo account sang HR app" (xem ⚡ Automation rules của Manager); HR app báo HR member, tạo xong thì user-service bắn event → đèn ACCOUNT bật. HR KHÔNG phải canh thủ công như "CREATE NEW ASSOCIATES" hệ cũ. Nút ⚡ vượt cổng bên Onboarding chỉ dành cho ngoại lệ.</div>
  </div>`;
}

/* ---------- LICENSING QUEUE ---------- */
function vLicQueue() {
  const queue = simE(CANDIDATES.filter((c) => c.stage === 'S6' && c.licensing));
  const relays = simE(deptPendingAsks('LICENSING'));
  return `
  <div class="card">
    <div class="sec-h">📋 Hàng đợi licensing <span class="cnt">${queue.length}</span><span class="hint">luật bang tự bật cờ — không cần nhớ 50 bang</span></div>
    ${queue.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta"><span class="chip ${c.licensing.status === 'FAIL' ? 'red' : 'green'}">${esc(c.licensing.rule)}</span> ${esc(c.licensing.detail)}
        ${c.licensing.nmlsTransfer ? ' · NMLS transfer: <span class="chip amber">' + c.licensing.nmlsTransfer + '</span>' : ''}</div>
      <div class="acts">${c.licensing.status === 'FAIL'
        ? `<button class="btn sm primary" onclick="toast('Mở case: xác nhận lại địa chỉ với ứng viên / xin exception — thread trên hồ sơ.')">Xử lý</button>
           <button class="btn sm ghost" onclick="actContact('${c.id}','sms')">Hỏi ứng viên</button>`
        : `<button class="btn sm green" onclick="actLicDone('${c.id}')">Đánh dấu xong</button>`}</div></div>`).join('')
    || '<div class="empty">Hàng đợi trống</div>'}
  </div>
  <div class="card">
    <div class="sec-h">❓ Câu hỏi từ recruiter (pre-check trước offer) <span class="cnt">${relays.length}</span><span class="hint">hỏi trong app — không email qua lại</span></div>
    ${relays.map((c) => {
      const a = asksOf(c).find((x) => x.to === 'LICENSING' && !x.answered);
      return `<div class="row">${rowWho(c)}
      <div class="meta"><span class="chip blue">${esc(a.q)}</span> → trả lời: <b>${esc(a.a || '(soạn tại đây — demo điền sẵn)')}</b></div>
      <div class="acts"><button class="btn sm primary" onclick="actAnswerRelay('${c.id}','LICENSING')">Gửi trả lời</button></div></div>`;
    }).join('')
    || '<div class="empty">Không có câu hỏi chờ — câu trả lời đã relay cho recruiter ✓</div>'}
  </div>
  <div class="card">
    <div class="sec-h">🔄 NMLS Reconcile <span class="chip amber">Phase 2 — concept</span>
      <span class="hint">NMLS không có API — nhưng có report CSV. Nhập vào, máy đối soát thay người dò</span></div>
    ${S.reconciled ? `
      <div class="row"><div class="meta"><span class="chip green">✓ 2.591 record khớp</span> app = NMLS — không việc gì phải làm</div></div>
      <div class="row"><div class="who" onclick="openC('dana')"><div class="av" style="background:#5B6472">DW</div><b>Dana Whitfield</b></div>
        <div class="meta"><span class="chip red">LỆCH</span> App: SC sponsorship <b>pending</b> · NMLS roster: <b>không có</b> SC → đúng như app, không lệch thật — auto-clear</div></div>
      <div class="row"><div class="who"><div class="av" style="background:#8A5A44">MK</div><b>Mark Keller</b></div>
        <div class="meta"><span class="chip red">LỆCH</span> NMLS: license TX <b>expired 07/31</b> · app vẫn ghi Licensed → task tự tạo cho Licensing</div>
        <div class="acts"><button class="btn sm primary" onclick="toast('Task mở trên hồ sơ — sửa xong thì lần reconcile sau tự sạch.')">Mở task</button></div></div>
      <div class="row"><div class="meta" style="font-size:12px;color:var(--ink-2)">Nguồn file: NMLS portal → REPORTS → <b>Individual Active License Items</b> (CSV, sinh async). Phase 3 (nếu đáng tiền): mua NMLS B2B bulk file — Quarterly $10k/năm → tự động hoàn toàn.</div></div>`
    : `<div class="row"><div class="meta">Kéo file CSV report từ NMLS portal vào đây — máy so từng dòng với sponsorship/license trong app: khớp thì im, lệch thì thành task có chủ.</div>
      <div class="acts"><button class="btn sm primary" onclick="actReconcile()">⬆ Nhập Individual Roster CSV (demo)</button></div></div>`}
  </div>
  <div class="card">
    <div class="sec-h">📜 Bảng luật theo BANG — dynamic config, sửa không cần deploy (D24)<span class="hint">nguồn: business rules §8 · cờ trên từng ứng viên ở queue trên tự bật từ bảng này</span></div>
    <div class="tblwrap"><table class="set-tbl">
      <tr><th>Bang</th><th>Luật khoảng cách / branch</th><th>Background check</th><th></th></tr>
      <tr><td><b>SC</b></td><td>branch phải ≤ 75 dặm</td><td>—</td><td rowspan="6" style="vertical-align:middle"><button class="btn sm ghost" onclick="toast('Sửa luật = sửa dòng config (recruiting_settings) + audit — luật bang đổi thì admin tự cập nhật, không chờ deploy (D24).')">Sửa</button></td></tr>
      <tr><td><b>WI · WY</b></td><td>branch ≤ 100 dặm</td><td>—</td></tr>
      <tr><td><b>NJ</b></td><td>trong bán kính 2.5h lái xe</td><td>—</td></tr>
      <tr><td><b>NE · RI</b></td><td>bắt buộc có branch trong bang</td><td>—</td></tr>
      <tr><td><b>GA · KY · OR</b></td><td>—</td><td><span class="chip amber">BGC bắt buộc <small>(GIẢ ĐỊNH — chờ Q8)</small></span></td></tr>
      <tr><td><b>GA · MT · OH · OR · PA</b></td><td>cần confirm từng case</td><td>—</td></tr>
    </table></div>
    <div style="padding:8px 16px 14px;font-size:12px;color:var(--ink-2)">Ứng viên vào S6 với bang khớp dòng nào → cờ + item checklist tương ứng TỰ mở (Dana bị SC 75mi; item "Background check" tự thêm khi bang yêu cầu). Câu hỏi Q8 cho Dung Nguyen: bảng này đủ chưa, còn bang nào?</div>
  </div>
  <div class="card">
    <div class="sec-h">🔒 Field-level RBAC — demo<span class="hint">cùng hồ sơ Dana, Licensing thấy khác HR</span></div>
    <div class="row"><div class="meta" style="display:flex;gap:26px;flex-wrap:wrap">
      <span>NMLS: <b>1120843</b></span><span>States: <b>OK ✓ · SC (pending)</b></span>
      <span>Comp package: ${compView(C('dana'))}</span><span>Sponsor date: <b>Jul 24</b></span>
    </div></div>
  </div>
  <p class="src-note">Licensing thấy đủ giấy tờ, không bao giờ thấy tiền — least-privilege. Thử "Gửi trả lời" cho Maria → đổi role Recruiter thấy follow-up relay.</p>`;
}

/* ---------- ONBOARDING BOARD ---------- */
function vOnbBoard() {
  const onb = simE(CANDIDATES.filter((c) => c.stage === 'S6' && c.checklist));
  const rows = onb.map((c) => {
    const depts = Object.entries(c.checklist).map(([d, items]) => {
      const done = items.filter((i) => i[1]).length, total = items.length;
      const blocked = items.some((i) => i[2] === 'blocked');
      const ck = items.map((i, idx) => `<label class="ck ${i[2] === 'blocked' ? 'blocked' : ''}">
          <input type="checkbox" ${i[1] ? 'checked' : ''} onclick="actTick('${c.id}','${d}',${idx})">
          ${i[1] ? '<s>' + esc(i[0]) + '</s>' : esc(i[0])}${i[2] === 'blocked' ? ' <span class="chip red">blocked</span>' : ''}</label>`).join('');
      return `<details ${blocked ? 'open' : ''}><summary class="dept" style="cursor:pointer;list-style:none">
          <span>${d}</span><div class="prog"><i style="width:${(done / total) * 100}%${blocked ? ';background:var(--red)' : ''}"></i></div>
          <b>${done}/${total}</b>${blocked ? ' <span class="chip red">kẹt</span>' : done === total ? ' <span class="chip green">✓</span>' : ''}</summary>${ck}</details>`;
    }).join('');
    return `<div class="row" style="align-items:flex-start">${rowWho(c)}
      <div class="meta">${depts}</div>
      <div class="acts" style="flex-direction:column">
        <button class="btn sm primary" onclick="actNudge('${c.id}','Licensing')">Nhắc phòng kẹt</button>
        ${c.accountCreated ? '<button class="btn sm ghost" disabled>Account ✓</button>' : `<button class="btn sm ghost" title="Bỏ qua điều kiện chưa đủ — cần lý do, ghi audit (D35)" onclick="actOverride('${c.id}')">⚡ Tạo account vượt cổng</button>`}
        <button class="btn sm ghost" onclick="openC('${c.id}')">Hồ sơ 360</button></div></div>`;
  }).join('');
  return `<div class="card">
    <div class="sec-h">🎓 Đang onboarding <span class="cnt">${onb.length}</span><span class="hint">4 phòng song song — click ▸ mở checklist, tick trực tiếp · <span class="chip amber">GIẢ ĐỊNH</span> nội dung checklist chờ Q11/Q12</span></div>
    ${rows || '<div class="empty">Không ai đang onboarding — HR cho ký offer là hồ sơ xuất hiện ở đây</div>'}
  </div>
  <p class="src-note">Mỗi phòng tick việc của mình, coordinator nhìn chỗ đỏ. Nút <b>⚡ vượt cổng</b> chỉ role Onboarding có — lý do bắt buộc, HR app nhận request như thường (D35). Thử tick nốt "First-file shadow" của Louis → 100% tự chuyển S7 + card của David Park (Referring LO) đổi theo.</p>`;
}

/* ---------- ACCOUNTING · PAYOUT ---------- */
function vAccQueue() {
  const bonuses = simE(CANDIDATES.filter((c) => c.bonus));
  return `<div class="card">
    <div class="sec-h">💵 Referral bonus <span class="cnt">${bonuses.length}</span><span class="hint">chín sau 60 ngày từ ngày join — luật kế thừa §8.4 · <span class="chip amber">GIẢ ĐỊNH</span> mốc "ngày join" chờ Q13; job chạy HẰNG NGÀY (không đợi thứ Bảy) chờ Q29</span></div>
    ${bonuses.length ? bonuses.map((c) => {
      const b = c.bonus;
      const referrer = b.referrer ? USERS[b.referrer].name : b.referrerName;
      let status, acts;
      if (b.paid) { status = '<span class="chip green">ĐÃ TRẢ ✓ — khoá vĩnh viễn (idempotency)</span>'; acts = '<button class="btn sm ghost" disabled>Đã khoá</button>'; }
      else if (b.rejected) { status = `<span class="chip red">KHÔNG đạt: ${esc(b.reason)}</span>`; acts = `<button class="btn sm ghost" onclick="toast('Lý do reject lưu vĩnh viễn trên hồ sơ — audit được.')">Xem lý do</button>`; }
      else if (b.matured && b.eligible) { status = `Chín: <b>${b.mature} ✓</b> · <span class="chip green">2 phía Active ✓</span> · idempotency: <span class="chip green">chưa từng trả ✓</span> · <b>${esc(b.pay)}</b>`;
        acts = `<button class="btn sm green" onclick="actPay('${c.id}')">Phát lệnh trả</button><button class="btn sm ghost" onclick="toast('Hold — giữ lại, có lý do, audit ghi.')">Hold</button>`; }
      else { status = `Chín: <b>${b.mature}</b> (còn ${b.daysLeft} ngày) · điều kiện check lúc chín: cả 2 phía còn Active · Hình thức: <b>${esc(b.pay)}</b>${b.clockNote ? ' · <span class="chip green">' + b.clockNote + '</span>' : ''}`;
        acts = `<button class="btn sm ghost" onclick="toast('Chuỗi eligibility: joined ✓ → 60 ngày → 2 phía Active → chưa trả lần nào → nút mới hiện.')">Xem chuỗi eligibility</button>`; }
      return `<div class="row">${rowWho(c)}<div class="meta">giới thiệu bởi <b>${esc(referrer)}</b> · joined ${b.joined} · ${status}</div><div class="acts">${acts}</div></div>`;
    }).join('') : '<div class="empty">Không có bonus nào chờ xử lý — bonus mới tự hiện khi có người join qua referral, không cần ai báo Accounting.</div>'}
  </div>
  <p class="src-note">Đủ điều kiện nút mới hiện; trả rồi khoá vĩnh viễn; reject có lý do lưu — hệ cũ xử lý tay, dễ trả trùng. Accounting không thấy pipeline/production (lens).</p>`;
}

/* ---------- REFERRING LO · PORTAL ---------- */
function vPortal() {
  const referred = CANDIDATES.filter((c) => c.referredBy === 'david');
  const stageIdx = { S1: 1, S2: 2, S3: 3, S4: 4, S5: 5, S6: 6, S7: 7 };
  const labels = ['Nhận', 'Liên hệ', 'Trao đổi', 'Xác minh', 'Offer ký', 'Onboarding', 'Active'];
  const cards = referred.map((c) => {
    const idx = stageIdx[c.stage] || 1;
    const steps = labels.map((l, i) => `<div class="step ${i + 1 < idx ? 'done' : i + 1 === idx ? (idx === 7 ? 'done' : 'now') : ''}">
        <span class="pip">${i + 1 < idx || idx === 7 ? '✓' : i + 1}</span><small>${l}</small></div>`).join('');
    const headChip = c.stage === 'S7' ? '<span class="chip green">🎉 Đã thành đồng nghiệp — Active!</span>'
      : c.stage === 'S6' ? '<span class="chip green">Đang onboarding — sắp thành đồng nghiệp 🎉</span>'
      : '<span class="chip blue">Recruiter đã nhận — đang xử lý</span>';
    const bonusLine = c.bonus ? `Bonus giới thiệu: <b>chín vào ${c.bonus.mature}</b> (60 ngày sau khi ${esc(c.name.split(' ')[0])} join) — điều kiện: cả hai còn Active.` : 'Bạn sẽ được báo khi qua từng mốc. Không cần hỏi recruiter — trạng thái luôn ở đây.';
    return `<div style="padding:16px 20px;border-bottom:1px solid var(--line-2)">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="who" style="flex:1"><div class="av" style="background:${c.color}">${c.av}</div>
        <div><b>${esc(c.name)}</b><small>giới thiệu ${c.referredOn || ''}</small></div></div>${headChip}</div>
      <div class="steps">${steps}</div>
      <p style="font-size:12px;color:var(--ink-2)">${bonusLine} <span class="mask">🔒 Chi tiết offer/comp không hiển thị</span></p>
    </div>`;
  }).join('');
  return `<div style="max-width:760px;margin:0 auto">
    <div class="card"><div class="sec-h">🤝 Người bạn giới thiệu <span class="cnt">${referred.length}</span><span class="hint">trong LO portal — không phải app Recruit</span></div>${cards || '<div class="empty">Bạn chưa giới thiệu ai — bấm nút bên dưới, chỉ cần 3 field (tên · phone · công ty). Bonus giới thiệu chín sau 60 ngày kể từ khi người đó join.</div>'}</div>
    <div style="text-align:center;margin-top:6px"><button class="btn primary" onclick="mRefer()">＋ Giới thiệu một LO khác</button></div>
    <p class="src-note" style="text-align:center">Minh bạch tiến độ (không lộ tiền) = động lực giới thiệu tiếp — referral đang convert tốt nhất (4.8%). Card này ĐỌC TỪ CÙNG kho hồ sơ: tick xong checklist bên Onboarding là bước nhảy ở đây.</p>
  </div>`;
}

/* ---------- Form giới thiệu 3 field (portal) ---------- */
function mRefer() {
  openModal(`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="mh">🤝 Giới thiệu một Loan Officer <span style="margin-left:auto;font-weight:500;font-size:11.5px;color:var(--ink-3)">đúng 3 field — còn lại máy tự enrich</span></div>
    <form onsubmit="return actRefer(event)">
      <div class="mb">
        <div class="fld"><label>Họ tên *</label><input name="rname" placeholder="Vd: Sandra Kim" required autofocus></div>
        <div class="fld"><label>Phone hoặc email *</label><input name="rcontact" placeholder="Vd: (704) 555-0182" required></div>
        <div class="fld"><label>Ghi chú (không bắt buộc)</label><input name="rnote" placeholder="Vd: bạn cùng team cũ, đang chán retail"></div>
        <p style="font-size:11.5px;color:var(--ink-3)">Lead vào <b>khay HOT của Kho (S0)</b> với badge Referral + đồng hồ chờ-nhận của TEAM (referral quý — SLA riêng ${CONFIG.sla[2].hours}h). Bạn theo dõi tiến độ ngay tại card này; bonus chín sau 60 ngày kể từ khi người đó join.</p>
      </div>
      <div class="mf"><button type="button" class="btn ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn primary">Gửi giới thiệu</button></div>
    </form></div></div>`);
}

function actRefer(ev) {
  ev.preventDefault();
  const f = ev.target;
  const name = f.rname.value.trim(); if (!name) return false;
  CANDIDATES.push({
    id: 'ref' + Date.now(), name, av: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(), color: '#4D7C0F',
    nmls: '', company: '—', city: '—', st: '',
    stage: 'S0', source: 'Referral', owner: null, hot: true, claimMin: CONFIG.sla[2].hours * 60,
    referredBy: 'david', referredOn: 'hôm nay',
    caseNote: `Referral mới của David Park — ghi chú: "${f.rnote.value || '—'}" · liên hệ: ${f.rcontact.value}`,
    timeline: [['Hôm nay', `David Park giới thiệu qua LO portal (3 field) → khay HOT chờ nhận, đồng hồ TEAM ${CONFIG.sla[2].hours}h chạy`]],
  });
  closeModal();
  toast(`🤝 Đã gửi giới thiệu <b>${esc(name)}</b> — vào khay HOT của Kho (đổi role Recruiter → 🗄 Kho sẽ thấy). Card theo dõi hiện ngay dưới đây.`);
  render();
  return false;
}

/* ---------- SETTINGS (manager/admin) ---------- */
function vSettings() {
  const sla = CONFIG.sla.map((p) => `<tr><td><b>${p.label}</b></td><td>${p.appliesTo}</td>
      <td><input type="number" value="${p.hours}" min="1" onchange="actSaveSla('${p.id}',this.value)"> giờ</td>
      <td>cảnh báo khi còn &lt;${p.warnPct}%</td><td>${p.breach}</td></tr>`).join('');
  const dv = Object.keys(ROLES).map((rk) => `<tr><td><b>${ROLES[rk].icon} ${ROLES[rk].label}</b></td>
      <td><select onchange="actSaveDefaultView('${rk}',this.value)">
        ${['today', 'pipeline', 'exceptions', 'hrq', 'licq', 'onbq', 'accq', 'portal'].map((v) => `<option ${CONFIG.defaultView[rk] === v ? 'selected' : ''}>${v}</option>`).join('')}
      </select></td>
      <td>${CONFIG.favoriteViews[rk] ? '⭐ ' + CONFIG.favoriteViews[rk] + ' (user tự chọn — thắng default)' : '<span style="color:var(--ink-3)">chưa đặt — dùng default</span>'}</td></tr>`).join('');
  const bands = CONFIG.compBands.map((b) => `<tr><td><b>${b.label}</b></td><td>${b.rule}</td>
      <td><button class="btn sm ghost" onclick="toast('Sửa band = sửa bảng mapping volume→band; offer cũ giữ snapshot, không đổi hồi tố.')">Sửa</button></td></tr>`).join('');
  return `
  <div class="card"><div class="sec-h">⏱ SLA policies <span class="hint">đổi số là áp cho lead MỚI — không breach hồi tố · audit log</span></div>
    <table class="set-tbl"><tr><th>Policy</th><th>Áp dụng</th><th>Target</th><th>Cảnh báo</th><th>Khi vi phạm</th></tr>${sla}</table></div>
  <div class="card"><div class="sec-h">🖥 Default view theo role <span class="hint">admin đặt default · user override bằng ⭐ favorite trong Pipeline</span></div>
    <table class="set-tbl"><tr><th>Role</th><th>Default view (admin)</th><th>Favorite (user override)</th></tr>${dv}</table></div>
  <div class="card"><div class="sec-h">✍️ Offer approval <span class="hint">dynamic — không chốt cứng "phải có người duyệt"</span></div>
    <table class="set-tbl"><tr><th>Chế độ</th><th>Nghĩa là</th></tr>
      <tr><td><select onchange="actSaveOfferMode(this.value)">
        <option value="auto" ${CONFIG.offerApproval === 'auto' ? 'selected' : ''}>AUTO — band rule tự duyệt</option>
        <option value="manager" ${CONFIG.offerApproval === 'manager' ? 'selected' : ''}>Manager duyệt từng offer</option>
      </select></td>
      <td>AUTO: đúng band theo rule → S4→S5 tự chạy, không chờ ai (nghẽn "đợi duyệt 4 ngày" biến mất). Chỉ cần người khi LỆCH chuẩn: đổi band tay, comp ngoài rule, RSU. Manager: mọi offer xếp hàng ở Exceptions.</td></tr></table></div>
  <div class="card"><div class="sec-h">⏲ Cadence follow-up tự động <span class="hint">D23/D24 — hệ cũ hardcode "static final int = 3" + comment "Tune the intervals here" ⇒ đổi nhịp phải deploy. Ở đây: sửa là chạy</span></div>
    <table class="set-tbl"><tr><th>Bậc nhắc (ngày kể từ lần chạm cuối)</th><th>Áp cho stage</th><th>Ngưỡng màu quá hạn</th><th>Luật dừng</th></tr>
      <tr><td>${CONFIG.cadence.tiers.map((t, i) => `<input type="number" value="${t}" min="1" style="width:52px" onchange="actSaveCadence(${i},this.value)">`).join(' → ')}</td>
      <td>${CONFIG.cadence.scope.map((s) => `<span class="chip blue">${s}</span>`).join(' ')} <span class="chip grey click" onclick="toast('Chọn stage nào có cadence — config, không hardcode.')">sửa ▾</span></td>
      <td><span class="chip amber">≥ ${CONFIG.cadence.overdue[0].days} ngày</span> <span class="chip red">≥ ${CONFIG.cadence.overdue[1].days} ngày</span></td>
      <td><span class="chip green">inbound = chuỗi TỰ DỪNG</span><div style="font-size:11px;color:var(--ink-3)">luật Q35 — không nhắn cho người vừa trả lời</div></td></tr></table>
    <div style="padding:8px 16px 12px;font-size:12px;color:var(--ink-2)">Máy chạy: cron quét HẰNG NGÀY, so <i>daysSince(lần chạm cuối)</i> với các bậc — một job cho cả kho, không phải một hẹn giờ mỗi lead (D23, mô hình OnboardedLOFollowUpCronOp của hệ cũ vốn ĐÚNG, chỉ hardcode số). Chip "⏲ bậc 2/4" trên Today đọc từ đây.</div></div>
  <div class="card"><div class="sec-h">🧢 Trần capacity — max_open_candidates <span class="hint">D24 — CEO đổi 10 → 5 giữa quý không cần deploy</span></div>
    <table class="set-tbl"><tr><th>Mỗi recruiter ôm tối đa</th><th>Hiệu ứng</th></tr>
      <tr><td><input type="number" value="${CONFIG.maxOpen}" min="1" style="width:64px" onchange="actSaveMaxOpen(this.value)"> lead active (S1–S6)</td>
      <td>Chạm trần → nút <b>Claim</b> + <b>Call-tự-claim</b> trong Kho tự mờ; auto-assign (Q34) cũng bỏ qua người đầy tay. Brayan đang ôm <b>12</b> — claim thêm 1 người là chạm trần ${CONFIG.maxOpen}, thử đi!</td></tr></table></div>
  <div class="card"><div class="sec-h">💰 Comp bands <span class="hint">placeholder — giá trị thật chờ anh Thuận/HR chốt</span></div>
    <table class="set-tbl"><tr><th>Band</th><th>Tiêu chí (volume→band mapping)</th><th></th></tr>${bands}</table></div>
  <p class="src-note">Thử đổi SLA "First touch" từ 24 → 2 giờ rồi quay lại Today: chip đếm giờ ăn theo config, không hardcode (yêu cầu 04/08: admin đổi 4h→2h không cần deploy).</p>`;
}
