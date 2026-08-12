/* =========================================================
   LF Recruit — interactive prototype · STATUS MODEL (DRAFT Q23)
   Bản draft để Victoria duyệt: hệ cũ 18 status (RLO 10 + ILO 8)
   → hệ mới KHÔNG thêm enum nào: 7 stage + 4 lifecycle + đèn derive
   ========================================================= */

const OLD_RLO = [
  ['Not touched',              '—',      'S1 · New (chưa có activity — derive, không phải status)'],
  ['Initiate contact',         '759',    'BỎ — derive từ activity log (đã gọi/SMS lần đầu → S2)'],
  ['Message sent',             '1.118',  'BỎ — derive từ activity log (feed hiện "SMS sent 2h trước")'],
  ['Dialogue',                 '18',     'BỎ — derive (có inbound reply → S2 với last-activity mới)'],
  ['Invited to join',          '0',      'S3 · Engaged + event "invited" trên timeline'],
  ['Interested but thinking',  '0 ⚠',    'BỎ HẲN — 0 người dùng. Thay bằng NURTURE + ngày hẹn lại'],
  ['Want to join',             '0 ⚠',    'BỎ HẲN — 0 người dùng. Muốn join = chuyển S3/S4 luôn'],
  ['Archived',                 '4.386',  'Lifecycle ARCHIVED + archive_reason (bắt buộc chọn lý do)'],
  ['Archived-Wrong information', '23.995', 'ARCHIVED + reason "wrong info" — không cần status riêng'],
  ['Block display',            '6.267',  'Lifecycle BLOCKED (suppression list — STOP/blacklist)'],
];

const OLD_ILO = [
  ['New',                                  '6',     'S4 · Verified (vừa qua cổng quan tâm thật)'],
  ['Invited but not onboarding',           '542',   'S4/S5 + đèn chưa xanh — nhìn đèn biết kẹt gì, không cần status'],
  ['Paid startup fee',                     '71',    'BỎ — thành đèn PAID (tự bật từ PayPal verify)'],
  ['Agreement signed',                     '70',    'BỎ — thành đèn SIGNED (tự bật từ document-esign event)'],
  ['Paid but not signed',                  '4',     'BỎ — là TỔ HỢP đèn (PAID ✓ + SIGNED ✗), máy tự lọc được'],
  ['1-1 meeting done, HR chưa initiate',   '33',    'BỎ — derive: event 1-1 done + đèn HR chưa bật'],
  ['NMLS sponsored nhưng HR onboarding',   '1',     'BỎ — tổ hợp đèn (SPONSORED ✓ + HR chưa xong)'],
  ['Onboarding',                           '60',    'S6 · Onboarding (stage, không phải status)'],
  ['100% onboarded',                       '2.601 ⚠', 'S7 · Active — nhưng cổng vào ĐÒI ĐỦ ĐÈN theo config (hệ cũ chỉ cần Paid+Signed, nên 2.601 record "100%" có thể chưa có license)'],
];

function vStatuses() {
  const oldRow = ([s, n, to]) => `<tr><td><b>${s}</b></td><td style="text-align:right">${n}</td><td>${to}</td></tr>`;
  const lightsLegend = candLights({ stage: 'S6', paid: true, nmls: '1', licensing: { status: 'OK' }, hrVerify: { todos: true, docs: false } })
    .map((l) => `<div class="row" style="padding:8px 16px"><span class="lights"><i class="lt ${l.on ? 'on' : l.half ? 'half' : ''}">${l.k}</i></span>
      <div class="meta">${esc(l.src)}</div></div>`).join('');
  return `
  <div class="card" style="background:var(--cream)"><div class="sec-h" style="border:0">🧬 DRAFT — bộ status rút gọn (Q23, chờ Victoria duyệt trên trang này)</div>
    <div style="padding:0 16px 14px;font-size:12.5px;color:var(--ink-2)">
      Hệ cũ có <b>18 status</b> (RLO 10 + ILO 8) cho cùng một quy trình — đo production: 3 status <b>0 người dùng</b>.
      Bản mới <b>không đặt thêm enum nào</b>: mọi thứ quy về 3 lớp —
      <b>① Stage S1–S7</b> (đang ở bước nào) · <b>② Lifecycle</b> ACTIVE / NURTURE / ARCHIVED / BLOCKED (còn sống trong phễu không)
      · <b>③ Đèn tín hiệu derive</b> (chi tiết Paid/Signed/HR… máy tự bật từ event, không ai bấm tay — nguyên tắc N2).</div>
  </div>
  <div class="card">
    <div class="sec-h">Kho lead (RLO) — 10 status cũ đi đâu <span class="hint">số = production đo 05/08 trên 106.145 record</span></div>
    <div class="tblwrap"><table class="tbl"><tr><th>Status cũ</th><th>Đang dùng</th><th>Về đâu trong model mới</th></tr>${OLD_RLO.map(oldRow).join('')}</table></div>
  </div>
  <div class="card">
    <div class="sec-h">Pipeline (ILO) — 9 status cũ đi đâu <span class="hint">số = production 05/08 trên 23.602 record</span></div>
    <div class="tblwrap"><table class="tbl"><tr><th>Status cũ</th><th>Đang dùng</th><th>Về đâu trong model mới</th></tr>${OLD_ILO.map(oldRow).join('')}</table></div>
  </div>
  <div class="card">
    <div class="sec-h">💡 Đèn tín hiệu — 6 đèn thay cho các status tổ hợp <span class="hint">hover đèn ở mọi card S4+ để xem nguồn</span></div>
    ${lightsLegend}
    <div style="padding:10px 16px 14px;font-size:12px;color:var(--ink-2)">Cổng <b>"100% onboarded" (S7)</b> = đủ bộ đèn <b>theo config</b> (admin thêm/bớt đèn bắt buộc được — dynamic).
    Hệ cũ cho "100%" khi chỉ cần Paid + Signed và Signed là dropdown bấm tay → 2.601 record "100%" không kiểm chứng được.</div>
  </div>
  <div class="card">
    <div class="sec-h">HR status: 5 giá trị cũ → 3 trạng thái DERIVE</div>
    <div class="row"><div class="meta">
      <span class="chip grey">HR: Chưa bắt đầu</span> ← "HR not initiated" ·&nbsp;
      <span class="chip amber">HR: Đang chạy</span> ← "Pending BGC" + "Done BGC" + "HR onboarding" (BGC = 1 mục checklist theo bang, config trong licensing_state_rules) ·&nbsp;
      <span class="chip green">HR: Xong ✓</span> ← "HR Completed" (tự bật khi đủ 2 verify / HR app event)
    </div></div>
  </div>
  <p class="src-note">Tinh thần duyệt: mỗi dòng "BỎ" cần Victoria gật hoặc lắc. Gật = ít thứ phải học, mọi chuyển trạng thái do máy; lắc dòng nào thì dòng đó thành badge derive thêm — vẫn không đẻ enum.</p>`;
}
