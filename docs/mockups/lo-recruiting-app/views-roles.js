/* =========================================================
   LF Recruit — interactive prototype · VIEWS theo role
   Mọi list đều DERIVE từ CANDIDATES qua lens — không data riêng
   ========================================================= */

const rowWho = (c) => `<div class="who" onclick="openC('${c.id}')">
  <div class="av" style="background:${c.color}">${c.av}</div>
  <div><b>${esc(c.name)}</b><small>${c.nmls ? 'NMLS ' + c.nmls + ' · ' : ''}${esc(c.city)}</small></div></div>`;

/* ---------- RECRUITER · TODAY ---------- */
function vToday() {
  const mine = visibleCands();
  const newLeads = mine.filter((c) => c.stage === 'S1' && c.slaMin != null && c.slaMin >= 0);
  const followUps = mine.filter((c) => c.followUp || (c.licRelay && c.licRelay.answered));
  const signals = mine.filter((c) => c.signal && c.stage === 'NURTURE');
  const wakeups = mine.filter((c) => c.wakeUp);
  const offers = mine.filter((c) => c.offer?.status === 'VIEWED');
  const kpi = (n, l, alert) => `<div class="kpi ${alert ? 'alert' : ''}"><b>${n}</b><span>${l}</span></div>`;
  const cRow = (c, extra, acts) => `<div class="row">${rowWho(c)}<div class="meta">${extra}</div><div class="acts">${acts}</div></div>`;
  const contactBtns = (c) => `<button class="btn sm green" onclick="actContact('${c.id}','call')">Call</button>
    <button class="btn sm ghost" onclick="actContact('${c.id}','sms')">SMS</button>
    <button class="btn sm ghost" onclick="actContact('${c.id}','email')">Email</button>`;
  return `
  <div class="cols"><div class="col-main">
    <div class="card">
      <div class="sec-h">🔥 New leads — first touch SLA <span class="cnt">${newLeads.length}</span><span class="hint">auto-assigned · SLA ${CONFIG.sla[1].hours}h (admin đổi trong Settings)</span></div>
      ${newLeads.map((c) => cRow(c,
        `<span class="chip ${c.source === 'Referral' ? 'blue' : c.source === 'Self-apply' ? 'grey' : 'orange'}">${c.source}</span> &nbsp;
         ${c.vol != null ? `<b>$${c.vol}M</b> · ${c.units} units (12m)` : 'No NMLS data — <b>hỏi & nhập NMLS để enrich</b>'} &nbsp;${slaChip(c)}`,
        contactBtns(c))).join('') || '<div class="empty">Không còn lead chờ first touch — Call/SMS xong là tự chuyển S2 ✓</div>'}
    </div>
    <div class="card">
      <div class="sec-h">📞 Follow-ups hôm nay <span class="cnt">${followUps.length}</span><span class="hint">từ next-step bạn đã hẹn + relay từ phòng khác</span></div>
      ${followUps.map((c) => cRow(c,
        c.licRelay?.answered ? `Licensing đã trả lời: “<b>${esc(c.licRelay.a)}</b>” → relay cho ứng viên` : `“${esc(c.followUp)}”`,
        `<button class="btn sm green" onclick="actContact('${c.id}','call')">Call now</button>
         <button class="btn sm ghost" onclick="toast('Đã dời lịch — task giữ nguyên, không rơi mất.')">Reschedule</button>
         <button class="btn sm ghost" onclick="toast('Done ✓ — nhớ đặt next-step (rule: S2+ luôn có next-step).')">Done</button>`)).join('') || '<div class="empty">Chưa có follow-up đến hạn</div>'}
    </div>
    <div class="card">
      <div class="sec-h">📡 Signals — Modex monthly refresh <span class="cnt">${signals.length}</span><span class="hint">nurture list tự canh mình</span></div>
      ${signals.map((c) => cRow(c, `<span class="chip red">${esc(c.signal.split(':')[0])}</span> ${esc(c.signal.split('—')[0].split(':').slice(1).join(':'))} — cửa sổ vàng`,
        `<button class="btn sm primary" onclick="actReengage('${c.id}')">Re-engage</button>
         <button class="btn sm ghost" onclick="toast('Dismissed — signal này không bắn lại.')">Dismiss</button>`)).join('') || '<div class="empty">Không có signal mới</div>'}
      ${wakeups.map((c) => cRow(c, `🌙 ${esc(c.wakeUp)}`,
        `<button class="btn sm primary" onclick="actReengage('${c.id}')">Re-engage</button>
         <button class="btn sm ghost" onclick="openC('${c.id}')">Mở hồ sơ</button>`)).join('')}
    </div>
    <div class="card">
      <div class="sec-h">✍️ Offers awaiting signature <span class="cnt">${offers.length}</span></div>
      ${offers.map((c) => cRow(c, `<span class="chip amber">Viewed — chưa ký · ${c.offer.stallDays}d</span> ${esc(c.offer.viewedNote || '')} · band ${c.offer.band}`,
        `<button class="btn sm primary" onclick="actRemind('${c.id}')">Send reminder</button>
         <button class="btn sm ghost" onclick="actContact('${c.id}','call')">Call</button>`)).join('') || '<div class="empty">Không có offer đang chờ ký</div>'}
    </div>
  </div>
  <div class="rail">
    <div class="card"><h4>My funnel — tuần này</h4>
      <div class="funnel-line"><span>New leads</span><b>14</b></div>
      <div class="funnel-line"><span>First touch trong SLA</span><b>92%</b></div>
      <div class="funnel-line"><span>Moved to Engaged</span><b>6</b></div>
      <div class="funnel-line"><span>Verified</span><b>3</b></div>
      <div class="funnel-line"><span>Offers ký</span><b>1</b></div></div>
    <div class="card"><h4>KPIs</h4><div style="display:flex;gap:8px;flex-wrap:wrap">
      ${kpi(newLeads.filter((c) => c.slaMin < 300).length, 'SLA gấp', true)}${kpi(followUps.length, 'Due today')}${kpi(signals.length + wakeups.length, 'Wake-ups')}${kpi(offers.length, 'Offer pending')}</div></div>
    <div class="card" style="background:var(--cream)"><h4>⚡ Zero-click enrichment</h4>
      <p style="font-size:12px;color:var(--ink-2)">Nhập NMLS là đủ — production tự về từ Modex. Thử: <b>＋ Add lead</b> trong Pipeline, điền NMLS bất kỳ.</p></div>
  </div></div>
  <p class="src-note">Today = việc TỰ TÌM ĐẾN recruiter (không đi tuần bảng 106k dòng). Bấm Call/SMS trên lead S1 → tự chuyển S2 + timeline ghi.</p>`;
}

/* ---------- MANAGER · EXCEPTIONS ---------- */
function vExceptions() {
  const breached = CANDIDATES.filter((c) => c.stage === 'S1' && c.slaMin != null && c.slaMin < 0);
  const requests = CANDIDATES.filter((c) => c.offer?.status === 'REQUESTED');
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
  const toDraft = CANDIDATES.filter((c) => c.offer?.status === 'APPROVED');
  const tracking = CANDIDATES.filter((c) => ['SENT', 'VIEWED'].includes(c.offer?.status));
  const signed = CANDIDATES.filter((c) => c.offer?.status === 'SIGNED');
  return `
  <div class="card">
    <div class="sec-h">📝 Offer cần soạn <span class="cnt">${toDraft.length}</span><span class="hint">manager đã duyệt band — HR chốt số & gửi</span></div>
    ${toDraft.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">Band <b>${c.offer.band}</b> · số liệu snapshot đóng băng vào offer · Trả bằng:
        <span class="chip grey click" onclick="toast('Cash ⇄ RSU — chỉ HR bật RSU được (rule kế thừa §8.4).')">Cash ▾</span>
        ${c.offer.note ? ' · note recruiter: “' + esc(c.offer.note) + '”' : ''}</div>
      <div class="acts"><button class="btn sm primary" onclick="actDraftOffer('${c.id}')">Soạn & gửi offer</button>
        <button class="btn sm ghost" onclick="toast('Template offer theo band — chỉ điền phần cá nhân hoá.')">Template ▾</button></div></div>`).join('')
    || '<div class="empty">Chưa có offer chờ soạn — sang role Manager duyệt request là việc hiện ra ở đây (một kho, hai lens)</div>'}
  </div>
  <div class="card">
    <div class="sec-h">✍️ E-sign đang theo dõi <span class="cnt">${tracking.length}</span><span class="hint">qua document-esign service — trạng thái tự cập nhật</span></div>
    ${tracking.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta">${c.offer.status === 'VIEWED'
        ? `<span class="chip amber">Viewed · chưa ký · ${c.offer.stallDays}d</span> ${esc(c.offer.viewedNote || '')}`
        : `<span class="chip blue">Sent ${c.offer.sent} · chưa mở</span>`}</div>
      <div class="acts"><button class="btn sm primary" onclick="actRemind('${c.id}')">Nhắc + gọi</button>
        <button class="btn sm green" onclick="actSign('${c.id}')">（demo: ứng viên ký）</button>
        <button class="btn sm ghost" onclick="toast('Đã gia hạn link e-sign thêm 7 ngày.')">Gia hạn link</button></div></div>`).join('')
    || '<div class="empty">Không có e-sign đang chờ</div>'}
  </div>
  ${signed.length ? `<div class="card"><div class="sec-h">✅ Vừa ký — đã tự sang S6 <span class="cnt">${signed.length}</span></div>
    ${signed.map((c) => `<div class="row">${rowWho(c)}<div class="meta"><span class="chip green">Signed ✓</span> → tự chuyển S6 · checklist tự mở — không ai chuyển tay</div>
    <div class="acts"><button class="btn sm ghost" onclick="openC('${c.id}')">Xem hồ sơ</button></div></div>`).join('')}</div>` : ''}
  <p class="src-note">HR không hỏi "ai tới lượt tôi?" — qua gate S4 là tự hiện. Thử bấm "(demo: ứng viên ký)" cho Trent → rồi đổi role Onboarding xem checklist mở.</p>`;
}

/* ---------- LICENSING QUEUE ---------- */
function vLicQueue() {
  const queue = CANDIDATES.filter((c) => c.stage === 'S6' && c.licensing);
  const relays = CANDIDATES.filter((c) => c.licRelay && !c.licRelay.answered);
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
    ${relays.map((c) => `<div class="row">${rowWho(c)}
      <div class="meta"><span class="chip blue">${esc(c.licRelay.q)}</span> → trả lời: <b>${esc(c.licRelay.a)}</b></div>
      <div class="acts"><button class="btn sm primary" onclick="actAnswerRelay('${c.id}')">Gửi trả lời</button></div></div>`).join('')
    || '<div class="empty">Không có câu hỏi chờ — câu trả lời đã relay cho recruiter ✓</div>'}
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
  const onb = CANDIDATES.filter((c) => c.stage === 'S6' && c.checklist);
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
        <button class="btn sm ghost" onclick="openC('${c.id}')">Hồ sơ 360</button></div></div>`;
  }).join('');
  return `<div class="card">
    <div class="sec-h">🎓 Đang onboarding <span class="cnt">${onb.length}</span><span class="hint">4 phòng song song — click ▸ mở checklist, tick trực tiếp</span></div>
    ${rows || '<div class="empty">Không ai đang onboarding — HR cho ký offer là hồ sơ xuất hiện ở đây</div>'}
  </div>
  <p class="src-note">Mỗi phòng tick việc của mình, coordinator nhìn chỗ đỏ. Thử tick nốt "First-file shadow" của Louis → 100% tự chuyển S7 + card của David Park (Referring LO) đổi theo.</p>`;
}

/* ---------- ACCOUNTING · PAYOUT ---------- */
function vAccQueue() {
  const bonuses = CANDIDATES.filter((c) => c.bonus);
  return `<div class="card">
    <div class="sec-h">💵 Referral bonus <span class="cnt">${bonuses.length}</span><span class="hint">chín sau 60 ngày từ ngày join — luật kế thừa §8.4</span></div>
    ${bonuses.map((c) => {
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
    }).join('')}
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
    <div class="card"><div class="sec-h">🤝 Người bạn giới thiệu <span class="cnt">${referred.length}</span><span class="hint">trong LO portal — không phải app Recruit</span></div>${cards}</div>
    <div style="text-align:center;margin-top:6px"><button class="btn primary" onclick="toast('Form giới thiệu 3 field (tên · phone · công ty) → lead vào S1 badge Referral, bạn theo dõi ở đây.')">＋ Giới thiệu một LO khác</button></div>
    <p class="src-note" style="text-align:center">Minh bạch tiến độ (không lộ tiền) = động lực giới thiệu tiếp — referral đang convert tốt nhất (4.8%). Card này ĐỌC TỪ CÙNG kho hồ sơ: tick xong checklist bên Onboarding là bước nhảy ở đây.</p>
  </div>`;
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
  <div class="card"><div class="sec-h">💰 Comp bands <span class="hint">placeholder — giá trị thật chờ anh Thuận/HR chốt</span></div>
    <table class="set-tbl"><tr><th>Band</th><th>Tiêu chí (volume→band mapping)</th><th></th></tr>${bands}</table></div>
  <p class="src-note">Thử đổi SLA "First touch" từ 24 → 2 giờ rồi quay lại Today: chip đếm giờ ăn theo config, không hardcode (yêu cầu 04/08: admin đổi 4h→2h không cần deploy).</p>`;
}
