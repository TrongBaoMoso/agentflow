/* Outcome wizard v2 mockup — one screen, progressive disclosure */
'use strict';

const S = { att: null, step: null, called: false };

const ATTS = [
  { k: 'INTERESTED', em: '👍', lb: 'Interested', sb: 'muốn đi tiếp' },
  { k: 'NEUTRAL', em: '😐', lb: 'Neutral', sb: 'chưa đọc vị được' },
  { k: 'NO_ANSWER', em: '📵', lb: 'No answer', sb: 'không bắt máy' },
  { k: 'NOT_INTERESTED', em: '🚫', lb: 'Not interested', sb: 'archive + lý do' }
];

const STEPS = [
  { k: 'CALL_NEXT', lb: '📞 Call again' },
  { k: 'SEND_INFO', lb: '📄 Send info' },
  { k: 'WEBINAR', lb: '🎓 Webinar' },
  { k: 'MEET_ONE_ON_ONE', lb: '🤝 Meet 1-1' }
];

const REASONS = ['Not interested', 'Signed elsewhere', 'Wrong information', 'Asked to stop contact'];

function wizardHtml() {
  return `
  <div class="wz-hd">
    <div class="avatar sm">PB</div>
    <div><b>Call result — Phill Becraft</b><small>Guild Mortgage Company LLC · call logged 15:31</small></div>
    <button class="wz-x" data-x>✕</button>
  </div>
  <div class="wz-bd">
    <div class="f">
      <label class="f-lb">Call note <span class="opt">· optional · cả team đọc được, candidate không thấy</span></label>
      <textarea placeholder="e.g. interested in P3+ comp, spouse changing jobs in October…"></textarea>
    </div>
    <div class="f">
      <label class="f-lb">How did it go?</label>
      <div class="att">${ATTS.map((a) => `
        <button data-a="${a.k}"><span class="em">${a.em}</span><span class="lb">${a.lb}</span><span class="sb">${a.sb}</span></button>`).join('')}
      </div>
    </div>

    <div class="branch" data-b="INTERESTED">
      <label class="f-lb">Next step — pick one</label>
      <div class="steps">${STEPS.map((s) => `<button data-s="${s.k}">${s.lb}</button>`).join('')}</div>
      <div class="when">
        <div><label class="f-lb">When <span class="opt">· trống = ngày mai</span></label><input type="date" value="2026-08-25" /></div>
        <div><label class="f-lb">Time <span class="opt">· optional</span></label><input type="time" /></div>
      </div>
    </div>

    <div class="branch" data-b="NEUTRAL">
      <p class="callout">→ Chuyển <b>NURTURE</b> — giữ nhịp chăm, rời queue hằng ngày.</p>
      <div class="when">
        <div><label class="f-lb">Wake me up on <span class="opt">· optional — "hẹn 6 tháng nữa"</span></label><input type="date" /></div>
        <div><label class="f-lb">Time <span class="opt">· optional</span></label><input type="time" /></div>
      </div>
    </div>

    <div class="branch" data-b="NO_ANSWER">
      <p class="callout">→ <b>Retry call · Wed 26/08</b> tự đặt (config: +2 ngày). Không cần nhập gì — Save là xong.</p>
    </div>

    <div class="branch" data-b="NOT_INTERESTED">
      <label class="f-lb">Reason — required</label>
      <select><option value="">Pick a reason…</option>${REASONS.map((r) => `<option>${r}</option>`).join('')}</select>
      <p class="f-hint">Archive, không xoá — kho không mất ai, quay lại được khi đổi ý.</p>
    </div>
  </div>
  <div class="wz-ft">
    <button class="btn ghost" data-x>Cancel</button>
    <button class="btn primary" data-save disabled>Save</button>
  </div>`;
}

function wireWizard(root, isOverlay) {
  root.innerHTML = wizardHtml();
  let att = null;
  let step = null;

  const saveBtn = root.querySelector('[data-save]');
  const reason = root.querySelector('[data-b="NOT_INTERESTED"] select');

  const valid = () => {
    if (!att) return false;
    if (att === 'INTERESTED') return Boolean(step);
    if (att === 'NOT_INTERESTED') return Boolean(reason.value);
    return true;
  };
  const sync = () => { saveBtn.disabled = !valid(); };

  root.querySelectorAll('.att button').forEach((b) => {
    b.addEventListener('click', () => {
      att = b.dataset.a;
      root.querySelectorAll('.att button').forEach((x) => x.classList.toggle('on', x === b));
      root.querySelectorAll('.branch').forEach((x) => x.classList.toggle('on', x.dataset.b === att));
      sync();
    });
  });
  root.querySelectorAll('.steps button').forEach((b) => {
    b.addEventListener('click', () => {
      step = b.dataset.s;
      root.querySelectorAll('.steps button').forEach((x) => x.classList.toggle('on', x === b));
      sync();
    });
  });
  reason.addEventListener('change', sync);

  root.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => {
    if (isOverlay) closeOverlay();
  }));

  saveBtn.addEventListener('click', () => {
    const msgs = {
      INTERESTED: 'Next step saved — nổi lên Today đúng hạn',
      NEUTRAL: 'Chuyển NURTURE — sẽ tự quay lại đúng ngày hẹn',
      NO_ANSWER: 'Retry call · Wed 26/08 đã tự đặt',
      NOT_INTERESTED: 'Archived — kho không mất ai'
    };
    toast(msgs[att] || 'Saved');
    if (isOverlay) closeOverlay();
    document.getElementById('pending').classList.remove('on');
    document.getElementById('refocusHint').textContent = '— đã ghi kết quả, strip biến mất';
    S.called = false;
  });
}

/* §1 trigger demo */
const pending = document.getElementById('pending');
document.getElementById('btnCall').addEventListener('click', () => {
  S.called = true;
  pending.classList.add('on');
  document.getElementById('refocusHint').textContent = '— dialer đã mở, giờ giả lập quay lại tab →';
  toast('📞 Dialer mở (zoomphonecall:) + OUTBOUND đã log — wizard CHƯA mở');
});
document.getElementById('btnRefocus').addEventListener('click', () => {
  if (!S.called) { toast('Bấm Call trước đã'); return; }
  openOverlay();
});
document.getElementById('btnLog').addEventListener('click', openOverlay);

function openOverlay() {
  wireWizard(document.getElementById('wizardOverlay'), true);
  document.getElementById('overlay').classList.add('on');
}
function closeOverlay() {
  document.getElementById('overlay').classList.remove('on');
}
document.getElementById('overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeOverlay();
});

/* §2 inline wizard (luôn hiển thị để soi) */
wireWizard(document.getElementById('wizardInline'), false);

/* toast */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}
