/* Templates redesign mockup: list (table/cards), preview drawer, editor with live preview, review flow. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- labels (what the user sees) ----------
  const STAGES = [['S0', 'Not started'], ['S1', 'New lead'], ['S2', 'Engaged'], ['S3', 'Verified (old stage)'], ['S4', 'Offer'], ['S5', 'Onboarding'], ['S6', 'Joined'], ['S7', 'Onboarded']];
  const STAGE = Object.fromEntries(STAGES);
  const stageLabel = (s) => (s ? STAGE[s] || s : 'All stages');
  const CH = { EMAIL: 'Email', SMS: 'SMS', CALL_SCRIPT: 'Call script' };
  const PURPOSE = { GENERAL: 'General', NURTURE: 'Nurture', WEBINAR: 'Webinar', MARKETING: 'Marketing', ONBOARDING: 'Onboarding' };
  const PTONE = { GENERAL: 'gy', NURTURE: 'am', WEBINAR: 'bl', MARKETING: 'or', ONBOARDING: 'gn' };
  const STATUS = { ACTIVE: ['Active', 'gn'], IN_REVIEW: ['Needs review', 'am'], DRAFT: ['Draft', 'gy'], RETIRED: ['Archived', 'out'] };
  const ICON = {
    EMAIL: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    SMS: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v11H8l-4 4z"/></svg>',
    CALL_SCRIPT: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bookmark: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10v16l-5-3-5 3z"/></svg>',
    list: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    grid: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    refresh: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    dots: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>',
    sort: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/></svg>',
    page: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>',
    spark: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    chat: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 5h14v10H9l-4 4z"/></svg>',
    pencil: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  };

  // ---------- data ----------
  const SAMPLE = {
    first_name: 'Jordan', last_name: 'Example', full_name: 'Jordan Example', recruiter_name: 'Alex Sample', recruiter_phone: '(555) 010-0100',
    recruiter_email: 'alex.sample@example.test', join_url: 'https://www.example.test/apply_loan_officer?key=SAMPLE', agreement_url: 'https://www.example.test/apply_loan_officer?key=SAMPLE',
    startup_fee: '$100', webinar_time: '11-06-2026 9:00 AM', webinar_join_url: 'https://meet.google.com/sample-webinar', webinar_title: 'Why Loan Factory', webinar_lead: '2 hours',
    webinar_old_time: 'Friday, November 6, 2026 at 1:00 PM PST', webinar_calendar_url: 'https://gateway.example.test/ics/sample', webinar_recording_url: 'https://drive.example.test/sample-recording',
    next_webinar_time: 'Friday, November 13, 2026 at 1:00 PM PST', next_webinar_join_url: 'https://meet.google.com/sample-next-webinar', referrer_name: 'Riley Referrer', webinar_date: '11-13-2026 1:00 PM',
    lo_email: 'jordan.example@example.test', candidate_url: 'https://recruit.example.test/candidates/sample', meeting_time: 'Tue, Nov 3 at 10:00 AM PST', meeting_minutes: '30',
    meeting_link: 'https://meet.google.com/sample-1on1', next_webinar: 'Fri, Nov 6 · 9:00 AM PT', webinar_link: 'https://www.loanfactory.com/loan-officer#webinar', todo_both: 'yes', webinar_image_url: window.FASTTRACK_IMG || '',
    unsubscribe_url: 'https://gateway.example.test/unsubscribe/sample',
  };
  const KNOWN_EXTRA = ['signature', 'todo_sign', 'todo_pay', 'paid_startup_fee', 'logo_url', 'sender_social_icons'];
  const isKnown = (t) => t in SAMPLE || KNOWN_EXTRA.includes(t) || t.startsWith('sender_');
  const FIELDS = [
    ['Lead', [['first_name', 'First name'], ['last_name', 'Last name'], ['full_name', 'Full name']]],
    ['Recruiter', [['recruiter_name', 'Name'], ['recruiter_phone', 'Phone'], ['recruiter_email', 'Email']]],
    ['Webinar', [['next_webinar', 'Next webinar'], ['webinar_link', 'Webinar page'], ['webinar_title', 'Title'], ['webinar_time', 'Time']]],
    ['1-1 meeting', [['meeting_time', 'Time'], ['meeting_link', 'Link']]],
  ];
  // Real display names from GET /users on staging (the same directory Checklist templates uses).
  const NAMES = { 'd8186688-77d4-454d-a649-a1bdf8842bb6': 'Bao Trinh', 'cc455108-edcc-4ea9-b0f0-42f677ceb6eb': 'Brayan', '9258110a-adf5-4009-aad7-99af009ce81d': 'Victoria Pham', '24ca68b0-8769-4518-a2c1-048c20012797': 'Bao Trinh' };
  const REVIEWER = 'Victoria Pham';
  const whoOf = (r) => (r.by && NAMES[r.by]) || null;
  // Bao 11/11: call scripts are no longer used anywhere (removed from Hot/Cold 29/09) -> archived, kept as data.
  let rows = (window.TPL || []).map((r) => ({ ...r, original: r.body, status: r.type === 'CALL_SCRIPT' ? 'RETIRED' : r.status }));
  const SIG = (rows.find((r) => r.id === 'tpl-lo-mail-signature') || {}).html || '';
  let OLD_SIG_TEXT = SIG;

  const display = (r) => {
    const m = r.name.match(/\s*\((system e-mail|page text, not an e-mail|from the sender's profile)\)\s*$/);
    if (!m) return { n: r.name, kind: null };
    const kind = m[1].startsWith('page') ? 'Portal page' : m[1].startsWith('from') ? 'Signature' : 'System email';
    return { n: r.name.slice(0, m.index).replace(/^Signature block of the Loan Officer system e-mails$/, 'Loan Officer e-mail signature'), kind };
  };
  const plain = (r) => (r.body_format === 'HTML' ? r.body.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ') : r.body).replace(/\s+/g, ' ').trim();
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
  // How a template reaches people, from what recruit-be does with it (purpose + the three portal-page ids + the signature row).
  const PORTAL_IDS = ['tpl-lo-portal-onboarding-process', 'tpl-lo-portal-startup-fee-desc', 'tpl-lo-portal-done-thanks'];
  const isPortal = (r) => PORTAL_IDS.includes(r.id) || /\(page text, not an e-mail\)/.test(r.name);
  const isSignature = (r) => r.id === 'tpl-lo-mail-signature';
  const sentOf = (r) => {
    if (isPortal(r)) return 'Not sent, shown on portal page';
    if (isSignature(r)) return 'Signature block';
    if (r.type === 'CALL_SCRIPT') return 'Read on calls';
    if (r.scope === 'PERSONAL') return 'Sent by you';
    if (r.purpose === 'NURTURE' || r.purpose === 'ONBOARDING') return 'Sent by the app';
    return 'Sent by recruiter';
  };
  const H = window.HIST || { rows: {}, counts: {} };
  const sendsOf = (r) => H.counts[r.id] || 0;
  const channelCell = (r) => (isPortal(r) ? `<span class="ch">${ICON.page}Portal page</span>` : `<span class="ch">${ICON[r.type]}${CH[r.type]}</span>`);
  const AV_TONES = ['#fbe2cf', '#dbe8fb', '#dff2e4', '#f3e1f5', '#fdf0c8'];
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (name) => (name
    ? `<span class="av" style="background:${AV_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_TONES.length]}">${esc(initials(name))}</span>`
    : `<span class="av sys" title="Set up with the app">LF</span>`);
  const updatedCell = (r) => (!r.updated ? '—' : whoOf(r) ? `<span class="who">${avatar(whoOf(r))}<span><b>${esc(whoOf(r))}</b><small>${fmtDate(r.updated)}</small></span></span>` : fmtDate(r.updated));

  // ---------- state ----------
  const DEF = { scope: 'TEAM', status: 'ALL', q: '', channel: '', purpose: '', stage: '', sort: 'name', page: 1, size: 25, view: 'table' };
  let S = { ...DEF };
  let role = 'manager';
  let frame = 'desktop';
  let screen = 'list';
  let spinning = false;
  let notes = [];
  const set = (patch) => { S = { ...S, ...patch, page: 'page' in patch ? patch.page : 1 }; renderMain(); };

  const isApprover = () => role === 'manager';
  const scoped = () => rows.filter((r) => r.scope === S.scope);
  const matches = (r, skipStatus) => {
    if (!skipStatus) {
      if (S.status === 'ALL' && r.status === 'RETIRED') return false;
      if (S.status !== 'ALL' && r.status !== S.status) return false;
    }
    if (S.channel && r.type !== S.channel) return false;
    if (S.purpose && r.purpose !== S.purpose) return false;
    if (S.stage && (S.stage === 'ANY' ? r.stage !== null : r.stage !== S.stage)) return false;
    if (S.q) { const q = S.q.toLowerCase(); if (!(r.name + ' ' + (r.subject || '') + ' ' + plain(r)).toLowerCase().includes(q)) return false; }
    return true;
  };
  const sorted = (list) => {
    const by = S.sort.replace('-', ''); const dir = S.sort.startsWith('-') ? -1 : 1;
    return [...list].sort((a, b) => {
      const va = by === 'updated' ? a.updated || '' : display(a).n.toLowerCase();
      const vb = by === 'updated' ? b.updated || '' : display(b).n.toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  };
  const urlText = () => {
    const p = new URLSearchParams();
    Object.entries(S).forEach(([k, v]) => { if (v !== DEF[k] && v !== '') p.set(k, v); });
    if (role === 'manager' && S.scope === 'TEAM') p.delete('scope');
    const q = p.toString();
    return 'recruit.viet18.com/templates' + (q ? '?' + q : '');
  };

  // ---------- small renderers ----------
  const chip = (tone, text, dot) => `<span class="chip ${tone}">${dot ? '<span class="d"></span>' : ''}${esc(text)}</span>`;
  const statusChip = (r) => chip(STATUS[r.status][1], STATUS[r.status][0], r.status !== 'RETIRED');
  const sel = (key, label, opts) => {
    const on = S[key] !== '' ? ' on' : '';
    return `<label class="f-sel${on}">${label}: <select data-k="${key}" aria-label="${label}">${opts.map(([v, t]) => `<option value="${v}"${S[key] === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  };
  const rowActions = (r) => {
    const a = [];
    if (r.status === 'RETIRED') { if (isApprover() || r.scope === 'PERSONAL') a.push(`<button class="btn sm" data-act="restore" data-id="${r.id}">Restore</button>`); }
    else if (r.status === 'IN_REVIEW' && isApprover()) a.push(`<button class="btn sm" data-act="review" data-id="${r.id}">Review</button>`);
    else if (canEdit(r)) a.push(`<button class="btn sm" data-act="edit" data-id="${r.id}">Edit</button>`);
    a.push(`<button class="ibtn sm" data-act="menu" data-id="${r.id}" aria-label="More actions">${ICON.dots}</button>`);
    return `<span class="act">${a.join('')}</span>`;
  };
  const canEdit = (r) => r.status !== 'RETIRED' && (r.scope === 'PERSONAL' || r.status !== 'ACTIVE' || isApprover());

  // ---------- list page ----------
  function renderMain() {
    const main = $('#main');
    const base = scoped();
    const counts = { ALL: base.filter((r) => r.status !== 'RETIRED' && matches(r, true)).length };
    ['ACTIVE', 'IN_REVIEW', 'DRAFT', 'RETIRED'].forEach((k) => { counts[k] = base.filter((r) => r.status === k && matches(r, true)).length; });
    const list = sorted(base.filter((r) => matches(r)));
    const pages = Math.max(1, Math.ceil(list.length / S.size));
    const page = Math.min(S.page, pages);
    const slice = list.slice((page - 1) * S.size, page * S.size);
    viewIds = list.map((x) => x.id);
    const dirty = ['q', 'channel', 'purpose'].some((k) => S[k] !== DEF[k]) || S.status !== DEF.status;
    const activeFilters = ['channel', 'purpose'].filter((k) => S[k]).length;
    const phone = frame === 'phone';
    const view = phone ? 'cards' : S.view;
    const tabs = [['ALL', 'All'], ['ACTIVE', 'Active'], ['IN_REVIEW', 'Needs review'], ['DRAFT', 'Drafts'], ['RETIRED', 'Archived']];
    const mineCount = rows.filter((r) => r.scope === 'PERSONAL' && r.status !== 'RETIRED').length;
    const teamCount = rows.filter((r) => r.scope === 'TEAM' && r.status !== 'RETIRED').length;

    main.innerHTML = `<div class="page">
      <div class="scope" role="group" aria-label="Whose templates">
        <button class="pill" data-scope="TEAM" aria-pressed="${S.scope === 'TEAM'}">Team · ${teamCount}</button>
        <button class="pill" data-scope="PERSONAL" aria-pressed="${S.scope === 'PERSONAL'}">Mine · ${mineCount}</button>
      </div>
      <div class="ph"><h2>Templates</h2><div class="ph-act"><button class="btn primary" data-act="new">${ICON.plus}New template</button></div></div>
      <div class="tabs" role="group" aria-label="Status">${tabs.map(([k, t]) => `<button class="tab" data-status="${k}" aria-pressed="${S.status === k}">${k === 'IN_REVIEW' && counts[k] && isApprover() ? '<span class="dot"></span>' : ''}${t} <small>${counts[k]}</small></button>`).join('')}</div>
      <div class="filters">
        <label class="f-search">${ICON.search}<input id="q" value="${esc(S.q)}" placeholder="Name, subject or text..." aria-label="Search templates"></label>
        ${sel('channel', 'Channel', [['', 'All channels'], ['EMAIL', 'Email'], ['SMS', 'SMS']])}
        ${sel('purpose', 'Purpose', [['', 'All purposes'], ...Object.entries(PURPOSE)])}
        <button class="btn f-reset" data-act="reset" ${dirty ? '' : 'disabled'}>Reset filters</button>
        <button class="btn f-phone" data-act="phonefilters">${ICON.filter}Filters${activeFilters ? ' · ' + activeFilters : ''}</button>
        <div class="f-end">
          <span class="count">${list.length} template${list.length === 1 ? '' : 's'}</span>
          <button class="ibtn" data-act="saved" aria-label="Saved filters">${ICON.bookmark}</button>
          <button class="ibtn view" data-view="table" aria-pressed="${view === 'table'}" aria-label="Table">${ICON.list}</button>
          <button class="ibtn view" data-view="cards" aria-pressed="${view === 'cards'}" aria-label="Cards">${ICON.grid}</button>
          <button class="ibtn${spinning ? ' spin' : ''}" data-act="refresh" aria-label="Refresh">${ICON.refresh}</button>
        </div>
      </div>
      ${list.length === 0 ? `<div class="card empty"><b>No templates match</b>Try another word or reset the filters.</div>` : view === 'table' ? tableHtml(slice) : cardsHtml(slice)}
      ${list.length ? pagerHtml(page, pages, list.length) : ''}
    </div>`;
    $('#rvUrl') && ($('#rvUrl').textContent = urlText());
    bindMain();
  }
  // Same shape as TeraList ListPager (Pipeline, Hot leads, Duplicates): rows per page on the left; "Page x of y · n total", arrows and page numbers on the right.
  function pagerHtml(page, pages, total) {
    const slots = []; for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - page) <= 1) slots.push(i); else if (slots[slots.length - 1] !== 'gap') slots.push('gap'); }
    return `<div class="lpager"><div class="lp-l"><span>Rows per page</span><select data-k="size" aria-label="Rows per page">${[10, 25, 50, 100].map((n) => `<option value="${n}"${S.size === n ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="lp-r"><span>Page ${page} of ${pages} · ${total} total</span>${pages > 1 ? `<span class="lp-nav"><button class="pbtn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${ICON.left}</button>${slots.map((x) => (x === 'gap' ? '<span class="lp-gap">…</span>' : `<button class="pbtn${x === page ? ' on' : ''}" data-page="${x}" ${x === page ? 'aria-current="page"' : ''}>${x}</button>`)).join('')}<button class="pbtn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">${ICON.right}</button></span>` : ''}</div></div>`;
  }
  function tableHtml(list) {
    const sortBtn = (k, t) => `<button data-sort="${k}">${t} ${S.sort.replace('-', '') === k ? (S.sort.startsWith('-') ? '↓' : '↑') : ICON.sort}</button>`;
    return `<div class="card"><div class="tblwrap"><table><thead><tr>
      <th>${sortBtn('name', 'Template')}</th><th>Channel</th><th>Sent</th><th>Purpose</th><th>Status</th><th>${sortBtn('updated', 'Updated')}</th><th></th></tr></thead><tbody>
      ${list.map((r) => `<tr data-open="${r.id}">
        <td class="nm"><b title="${esc(display(r).n)}">${esc(display(r).n)}</b>${r.type === 'EMAIL' && r.subject && !isPortal(r) && !isSignature(r) ? `<small title="${esc(r.subject)}">${esc(r.subject)}</small>` : ''}</td>
        <td>${channelCell(r)}</td>
        <td class="td-dim">${sentOf(r)}${sendsOf(r) ? `<small class="sub-n">${sendsOf(r)} sent</small>` : ''}</td>
        <td>${chip(PTONE[r.purpose], PURPOSE[r.purpose])}</td>
        <td>${statusChip(r)}</td>
        <td class="td-dim upd">${updatedCell(r)}</td>
        <td class="td-act">${rowActions(r)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  function cardsHtml(list) {
    return `<div class="cards">${list.map((r) => { const d = display(r); return `<div class="tcard" role="button" tabindex="0" data-open="${r.id}">
      <div class="tcard-h">${channelCell(r)}${statusChip(r)}</div>
      <b>${esc(d.n)}</b>${r.subject ? `<div class="sub">${esc(r.subject)}</div>` : ''}
      <div class="snip">${esc(plain(r).slice(0, 220))}</div>
      <div class="tcard-f">${chip(PTONE[r.purpose], PURPOSE[r.purpose])}<span>${sentOf(r)}</span><span style="margin-left:auto">${rowActions(r)}</span></div></div>`; }).join('')}</div>`;
  }
  function bindMain() {
    const main = $('#main');
    const q = $('#q', main);
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const pos = q.selectionStart; set({ q: q.value }); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); }, 250); });
    main.querySelectorAll('select[data-k]').forEach((s) => s.addEventListener('change', () => set({ [s.dataset.k]: s.dataset.k === 'size' ? Number(s.value) : s.value })));
    main.onclick = (e) => {
      const b = e.target.closest('button, [data-open]');
      if (!b) return;
      if (b.dataset.scope) return set({ scope: b.dataset.scope });
      if (b.dataset.status) return set({ status: b.dataset.status });
      if (b.dataset.view) return set({ view: b.dataset.view });
      if (b.dataset.sort) { const k = b.dataset.sort; return set({ sort: S.sort === k ? '-' + k : k }); }
      if (b.dataset.page) return set({ page: Number(b.dataset.page) });
      const act = b.dataset.act; const r = rows.find((x) => x.id === b.dataset.id);
      if (act) e.stopPropagation();
      if (act === 'reset') return set({ ...DEF, scope: S.scope, view: S.view, size: S.size });
      if (act === 'refresh') { spinning = true; renderMain(); setTimeout(() => { spinning = false; renderMain(); toast('Templates refreshed'); }, 700); return; }
      if (act === 'saved') return savedMenu(b);
      if (act === 'phonefilters') return phoneFilters();
      if (act === 'new') return openEditor(null);
      if (act === 'edit') return openEditor(r);
      if (act === 'review') return openEditor(r);
      if (act === 'restore') return lifecycle(r, 'restore');
      if (act === 'menu') return rowMenu(b, r);
      if (b.dataset.open) return openPreview(rows.find((x) => x.id === b.dataset.open));
    };
  }

  // ---------- menus ----------
  function popMenu(anchor, html, onPick) {
    closeMenu();
    const app = $('#app'); const ar = anchor.getBoundingClientRect(); const pr = app.getBoundingClientRect();
    const m = document.createElement('div'); m.className = 'menu'; m.innerHTML = html; m.id = 'menuPop';
    app.appendChild(m);
    const left = Math.min(ar.right - pr.left - m.offsetWidth, pr.width - m.offsetWidth - 8);
    m.style.left = Math.max(8, left) + 'px';
    const top = ar.bottom - pr.top + 4;
    m.style.top = (top + m.offsetHeight > pr.height ? ar.top - pr.top - m.offsetHeight - 4 : top) + 'px';
    m.onclick = (e) => { const b = e.target.closest('button[data-v]'); if (b) { closeMenu(); onPick(b.dataset.v); } };
    setTimeout(() => document.addEventListener('click', closeMenuOnce), 0);
  }
  const closeMenuOnce = (e) => { if (!e.target.closest('#menuPop')) closeMenu(); };
  function closeMenu() { const m = $('#menuPop'); if (m) m.remove(); document.removeEventListener('click', closeMenuOnce); }
  function rowMenu(anchor, r) {
    const items = [['preview', 'Preview']];
    if (r.type === 'EMAIL') items.push(['test', 'Send test to me']);
    if (r.status === 'DRAFT' && !isApprover() && r.scope === 'TEAM') items.push(['submit', 'Submit for review']);
    if (r.status === 'ACTIVE' && (isApprover() || r.scope === 'PERSONAL')) items.push(['archive', 'Archive']);
    popMenu(anchor, items.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join(''), (v) => {
      if (v === 'preview') openPreview(r);
      if (v === 'test') toast('Test sent to bao.trinh+manager@loanfactory.com');
      if (v === 'submit') lifecycle(r, 'submit');
      if (v === 'archive') lifecycle(r, 'archive');
    });
  }
  function savedMenu(anchor) {
    popMenu(anchor, `<div class="mh">Saved filters</div><button data-v="nurture">Nurture emails</button><button data-v="review">Needs my review</button><button data-v="sms">SMS templates</button><div class="mh">Current view</div><button data-v="save">Save these filters…</button>`, (v) => {
      if (v === 'nurture') set({ status: 'ALL', channel: 'EMAIL', purpose: 'NURTURE', stage: '', q: '' });
      if (v === 'review') set({ status: 'IN_REVIEW', channel: '', purpose: '', stage: '', q: '' });
      if (v === 'sms') set({ status: 'ALL', channel: 'SMS', purpose: '', q: '' });
      if (v === 'save') toast('Saved as "My view". It is in the bookmark menu on this page.');
    });
  }
  function phoneFilters() {
    layer(`<div class="ov" data-close><div class="modal small" style="margin:auto auto 0;width:100%;border-radius:12px 12px 0 0" role="dialog" aria-label="Filters">
      <div class="m-head"><h3>Filters</h3><button class="ibtn x" data-close aria-label="Close">${ICON.x}</button></div>
      <div class="sec" style="padding:16px 20px">${['channel', 'purpose'].map((k) => `<div class="fld"><label>${k[0].toUpperCase() + k.slice(1)}</label>${$('#main select[data-k="' + k + '"]').outerHTML.replace('<select', '<select class="inp"')}</div>`).join('')}</div>
      <div class="m-foot"><button class="btn quiet" data-pf="reset">Reset filters</button><span class="sp"></span><button class="btn primary" data-close>Show results</button></div></div></div>`);
    const L = $('#layer');
    L.querySelectorAll('select[data-k]').forEach((s) => s.addEventListener('change', () => set({ [s.dataset.k]: s.value })));
    L.querySelector('[data-pf]').onclick = () => { set({ channel: '', purpose: '' }); closeLayer(); };
  }

  // ---------- layer helpers ----------
  function layer(html) {
    const L = $('#layer'); L.innerHTML = html;
    L.onclick = (e) => { const c = e.target.closest('[data-close]'); if (c && (c === e.target || c.tagName === 'BUTTON' || e.target.closest('button[data-close]'))) closeLayer(); };
  }
  function closeLayer() { $('#layer').innerHTML = ''; const sp = document.getElementById('selPop'); if (sp) sp.remove(); }
  function toast(msg) {
    const old = $('#toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.id = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    $('#app').appendChild(t); setTimeout(() => t.remove(), 3600);
  }

  // ---------- rendering an email the way recruit-be does ----------
  function textToHtml(text) {
    const out = [];
    text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).forEach((blk) => {
      if (!blk.trim()) return;
      const h = esc(blk).replace(/https:\/\/[^\s<]+/g, (u) => { const m = u.match(/[.,;:!?)\]}]+$/); const tail = m ? m[0] : ''; const url = tail ? u.slice(0, -tail.length) : u; return `<a href="${url}" style="color:#1f5fbf">${url}</a>${tail}`; }).replace(/\n/g, '<br>');
      out.push(`<p style="margin:0 0 14px">${h}</p>`);
    });
    return out.join('');
  }
  const fillText = (s) => (s || '').replace(/\{\{(\w+)}}/g, (m, k) => (SAMPLE[k] != null ? SAMPLE[k] : m));
  function fillHtml(s) {
    let h = (s || '').replace(/\{\{#(\w+)}}([\s\S]*?)\{\{\/\1}}/g, (m, k, inner) => (SAMPLE[k] ? inner : ''))
      .replace(/\{\{\^(\w+)}}([\s\S]*?)\{\{\/\1}}/g, (m, k, inner) => (SAMPLE[k] ? '' : inner));
    return h.replace(/\{\{(\w+)}}/g, (m, k) => (k === 'signature' ? SIG : SAMPLE[k] != null ? esc(SAMPLE[k]) : m));
  }
  function nurtureLayout(text, preheader) {
    const filled = fillText(text);
    const mark = filled.match(/^--[ \t]*$/m);
    const msg = mark ? filled.slice(0, mark.index) : filled;
    const foot = mark ? filled.slice(mark.index + mark[0].length) : '';
    return `<div style="margin:0;padding:0;background:#f4f6f8">${preheader ? `<div style="display:none">${esc(fillText(preheader))}</div>` : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8"><tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
      <tr><td style="padding:24px 32px 8px"><img src="${window.LOGO}" alt="Loan Factory" width="160" style="display:block;border:0"></td></tr>
      <tr><td style="padding:8px 32px 24px;font-size:16px;line-height:1.5">${textToHtml(msg)}</td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #e4e7eb;font-size:12px;line-height:1.5;color:#6b7280">${textToHtml(foot)}
      <p>Loan Factory · 123 Sample Street, San Jose, CA 95122 · NMLS #320841</p><p><a href="#" style="color:#6b7280">Unsubscribe</a></p></td></tr></table></td></tr></table></div>`;
  }
  const KICKER = { NURTURE: '', GENERAL: '', WEBINAR: 'Webinar', MARKETING: '', ONBOARDING: 'Onboarding' };
  // New design = the Loan Factory email kit (kit.js): rewritten copy for the system emails, the same shell for plain-text ones.
  function kitInner(r, draft) {
    if (sigMode !== 'new' || isPortal(r) || isSignature(r)) return null;
    const unchanged = draft.body === r.original;
    if (unchanged && window.mailkitRender) { const h = window.mailkitRender(r.id); if (h) return h; }
    if (r.body_format === 'TEXT' && window.mailkitText) {
      const filled = fillText(draft.body); const mark = filled.match(/^--[ \t]*$/m);
      return window.mailkitText(textToHtml(mark ? filled.slice(0, mark.index) : filled), KICKER[r.purpose] || '', r.purpose === 'NURTURE');
    }
    return null;
  }
  function emailDoc(r, draft, marks = []) {
    let inner = kitInner(r, draft);
    if (inner) return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>mark{background:#fde68a;color:inherit;border-radius:2px}body{margin:0}img{max-width:100%}</style></head><body>${markQuotes(inner, marks)}</body></html>`;
    if (r.body_format === 'HTML') inner = isPortal(r) ? portalPage(sigMode === 'new' && draft.body === r.original && window.mailkitPortal && window.mailkitPortal(r.id) ? window.mailkitPortal(r.id) : draft.body === r.original && r.html ? r.html : fillHtml(draft.body)) : withSig(draft.body === r.original && r.html ? r.html : fillHtml(draft.body), r.id === 'tpl-lo-mail-signature');
    else inner = r.purpose === 'ONBOARDING' ? withSig(textToHtml(fillText(draft.body)) + SIG, false) : nurtureLayout(draft.body, draft.preheader);
    inner = markQuotes(inner, marks).replace(/<img([^>]*?)src="[^"]*"([^>]*alt="Fast track to Loan Factory")/g, (m0, p1, p2) => `<img${p1}src="${window.FASTTRACK_IMG || ''}"${p2}`);
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>mark{background:#fde68a;color:inherit;border-radius:2px}body{margin:0}img{max-width:100%}</style></head><body>${inner}</body></html>`;
  }
  let sigMode = 'new';
  const OLD_SIG = /<div>\s*<table cellpadding="0" cellspacing="0" width="640"[\s\S]*?Thank you for your cooperation\.<\/em><\/p>\s*<\/div>/;
  // Proposed signature (v5): name bold, title muted, a short brand-orange rule, labelled contact rows, real social icon,
  // legal text in its own grey band. No logo here: the logo now sits once, at the top of the email.
  const NEW_SIG = () => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #ebe7e2">
    <tr><td style="padding:22px 0 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="72" valign="top"><div style="width:56px;height:56px;border-radius:28px;background:#fde3d2;color:#b5470f;font-size:18px;font-weight:700;line-height:56px;text-align:center">SS</div></td>
        <td valign="top" style="font-size:14px;line-height:1.55;color:#55514b">
          <div style="font-size:17px;font-weight:700;color:#1f1d1a">Sam Sample</div>
          <div style="font-size:13px;color:#7a746c">Onboarding Specialist · Loan Factory</div>
          <div style="width:28px;height:3px;background:#f36f20;border-radius:2px;margin:10px 0 10px"></div>
          <div><img src="__IC_mobile__" width="15" height="15" alt="" style="display:inline-block;vertical-align:-2px;margin-right:8px;border:0"><a href="tel:5550100199" style="color:#1f1d1a;text-decoration:none">(555) 010-0199</a></div>
          <div><img src="__IC_office__" width="15" height="15" alt="" style="display:inline-block;vertical-align:-2px;margin-right:8px;border:0"><a href="tel:6603333333" style="color:#1f1d1a;text-decoration:none">(660) 333-3333</a></div>
          <div><img src="__IC_mail__" width="15" height="15" alt="" style="display:inline-block;vertical-align:-2px;margin-right:8px;border:0"><a href="mailto:sam.sample@example.test" style="color:#1f1d1a;text-decoration:none">sam.sample@example.test</a></div>
          <div style="font-size:12px;color:#7a746c;padding-top:6px">NMLS #1234567</div>
          <div style="padding-top:10px"><a href="https://www.linkedin.com/in/sam-sample"><img src="__LI__" width="22" height="22" alt="LinkedIn" style="display:block;border:0;border-radius:4px"></a></div>
        </td></tr></table>
    </td></tr></table>`;
  const LEGAL = `<tr><td style="background:#f7f5f2;border-top:1px solid #ebe7e2;padding:18px 32px 22px;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:#8a857e;border-radius:0 0 10px 10px">Loan Factory, Inc. · NMLS #320841 · 123 Sample Street, San Jose, CA 95122<br>This message may contain confidential information. If you received it by mistake, please tell the sender and delete it.</td></tr>`;
  const LI_SRC = () => ((SIG.match(/src="(data:image\/png;base64,[^"]+)"[^>]*alt="Icon"/) || [])[1] || '');
  // The whole Loan Officer system email in the proposed design: grey page, white 600px card, logo header, body, signature, legal band. Fluid.
  const newShell = (content) => `<div style="background:#f4f2ef;padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px">
    <tr><td style="padding:26px 32px 6px"><img src="${window.LOGO}" alt="Loan Factory" width="150" style="display:block;border:0"></td></tr>
    <tr><td style="padding:14px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2b2926">${content}</td></tr>
    ${LEGAL}</table></div>`;
  const withSig = (html, isSigRow) => {
    if (sigMode !== 'new') return isSigRow ? html : `<div style="padding:16px;font-family:Arial,sans-serif">${html}</div>`;
    const sig = NEW_SIG().replace('__LI__', LI_SRC()).replace('__IC_mobile__', (window.ICONPNG || {}).mobile).replace('__IC_office__', (window.ICONPNG || {}).office).replace('__IC_mail__', (window.ICONPNG || {}).mail);
    if (isSigRow) return newShell(sig);
    const swapped = OLD_SIG.test(html) ? html.replace(OLD_SIG, sig) : html + sig;
    return newShell(swapped.replace(/\s*$/, ''));
  };
  // A portal text is a block on the Loan Officer onboarding page, not an email: show it on a page, no From / To.
  const portalPage = (html) => `<div style="background:#f4f2ef;min-height:100vh;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e6e2dd">
    <div style="padding:16px 24px;border-bottom:1px solid #eeeae5;display:flex;align-items:center;gap:12px"><img src="${window.LOGO}" alt="Loan Factory" width="120" style="display:block"><span style="color:#8a857e;font-size:13px">Join Loan Factory</span></div>
    <div style="padding:24px 28px 30px;font-size:15px;line-height:1.6;color:#201e1b;font-family:'Public Sans',-apple-system,'Segoe UI',Roboto,Arial,sans-serif">${html}</div></div></div>`;
  const hasSig = (r) => r.body_format === 'HTML' && /\{\{signature}}/.test(r.body);
  // Highlights each commented phrase in the rendered email (text only, never inside a tag).
  function markQuotes(html, marks) {
    let out = html;
    marks.forEach((q) => {
      const needle = esc(fillText(q)).replace(/\n/g, '<br>');
      if (!needle.trim()) return;
      const i = out.indexOf(needle);
      if (i >= 0 && out.lastIndexOf('<', i) <= out.lastIndexOf('>', i)) out = out.slice(0, i) + '<mark>' + needle + '</mark>' + out.slice(i + needle.length);
    });
    return out;
  }
  function senderFor(r) {
    if (r.purpose === 'ONBOARDING') return 'Sam Sample (Onboarding Specialist) &lt;sam.sample@example.test&gt;';
    return 'Alex Sample (recruiter) &lt;alex.sample@example.test&gt;';
  }
  function previewPane(r, draft, device, marks = []) {
    if (r.type === 'SMS') {
      const txt = fillText(draft.body); const seg = smsInfo(txt);
      return `<div class="stagebox" style="flex-direction:column;align-items:center;gap:10px"><div class="sms"><div class="who">Text message · Today 9:41 AM</div><div class="bub">${markQuotes(esc(txt), marks)}</div></div><span class="meter">${seg.len} characters · ${seg.n} text${seg.n > 1 ? 's' : ''}${seg.uni ? ' · special character: ' + esc(seg.uni) : ''}</span></div>`;
    }
    if (r.type === 'CALL_SCRIPT') {
      return `<div class="stagebox"><div class="script">${fillText(draft.body).split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div></div>`;
    }
    const doc = emailDoc(r, draft, marks).replace(/"/g, '&quot;');
    const env = isPortal(r) ? '' : `<div class="env"><div><span>From</span><em>${senderFor(r)}</em></div><div><span>To</span><em>Jordan Example &lt;jordan.example@example.test&gt;</em></div>
      <div><span>Subject</span><em class="s">${esc(fillText(draft.subject) || 'Information from Loan Factory')}</em></div>${draft.preheader ? `<div><span>Preview</span><em>${esc(fillText(draft.preheader))}</em></div>` : ''}</div>`;
    const frameHtml = device === 'mobile' ? `<div class="phonebox"><iframe title="Email on a phone" sandbox srcdoc="${doc}"></iframe></div>` : `<iframe class="mail" title="Email on a computer" sandbox srcdoc="${doc}"></iframe>`;
    return `${env}<div class="stagebox">${frameHtml}</div>`;
  }
  function smsInfo(t) {
    const gsm = /^[\n\r -_a-zA-Z0-9@£$¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/;
    const uni = gsm.test(t) ? null : [...t].find((c) => !gsm.test(c));
    const per = uni ? 70 : 160; const multi = uni ? 67 : 153;
    const n = t.length <= per ? 1 : Math.ceil(t.length / multi);
    return { len: t.length, n, uni };
  }
  const deviceToggle = (r, dev) => (r.type === 'EMAIL' ? `<div class="seg" role="group" aria-label="Device"><button data-dev="desktop" aria-pressed="${dev === 'desktop'}">Desktop</button><button data-dev="mobile" aria-pressed="${dev === 'mobile'}">Mobile</button></div>` : '');

  const sigToggle = (r) => ((r.type === 'EMAIL') ? `<div class="seg" role="group" aria-label="Signature"><button data-sig="new" aria-pressed="${sigMode === 'new'}">New design</button><button data-sig="old" aria-pressed="${sigMode === 'old'}">Current</button></div>` : '');
  function historyPane(r) {
    const list = H.rows[r.id] || [];
    if (!list.length) return `<div class="empty"><b>Not sent yet</b>${r.purpose === 'GENERAL' ? 'Sends from Send info are not linked to a template today.' : 'Nothing has gone out with this template.'}</div>`;
    const tone = (d) => (d === 'DELIVERED' ? 'gn' : d === 'BOUNCED' || d === 'FAILED' || d === 'SPAM' ? 'rd' : 'gy');
    const fmt = (t) => new Date(t.replace(' ', 'T') + ':00Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<div style="padding:16px"><div class="card"><table style="min-width:0"><thead><tr><th>Sent to</th><th>When</th><th>Delivery</th><th>Opened</th></tr></thead><tbody>
      ${list.map((h) => `<tr><td><span class="who">${avatar(h.who || 'Lead')}<b>${esc(h.who || 'Unknown lead')}</b></span></td><td class="td-dim">${fmt(h.sent)}</td><td>${chip(tone(h.delivery), h.delivery === 'DELIVERED' ? 'Delivered' : (h.delivery || 'Sent').toLowerCase().replace(/^./, (c) => c.toUpperCase()))}</td><td class="td-dim">${h.opened ? fmt(h.opened) : '—'}</td></tr>`).join('')}
      </tbody></table></div><p class="td-dim" style="font-size:12.5px;margin:10px 2px 0">${sendsOf(r)} send${sendsOf(r) === 1 ? '' : 's'} in total. Click a row to open the email exactly as it was received.</p></div>`;
  }
  // ---------- preview drawer ----------
  let viewIds = [];
  function openPreview(r, dev = 'desktop', tab = 'preview') {
    const d = display(r);
    const pos = viewIds.indexOf(r.id);
    const draft = { subject: r.subject, preheader: r.preheader, body: r.body };
    const foot = [];
    if (r.type === 'EMAIL' && !isPortal(r) && !isSignature(r)) foot.push('<button class="btn" data-p="test">Send test to me</button>');
    foot.push('<span class="sp"></span>');
    if (r.status === 'IN_REVIEW' && isApprover()) foot.push('<button class="btn" data-p="return">Return to writer</button><button class="btn primary" data-p="approve">Approve and publish</button>');
    else if (r.status === 'RETIRED') foot.push('<button class="btn primary" data-p="restore">Restore</button>');
    else if (canEdit(r)) foot.push('<button class="btn primary" data-p="edit">Edit</button>');
    layer(`<div class="ov" data-close><aside class="drawer" role="dialog" aria-label="Preview ${esc(d.n)}">
      <div class="m-head"><div style="min-width:0"><h3>${esc(d.n)}</h3><div class="chips">${channelCell(r)}${chip(PTONE[r.purpose], PURPOSE[r.purpose])}${statusChip(r)}</div></div>
        <span class="nav-step">${pos >= 0 ? `<span class="td-dim">${pos + 1} of ${viewIds.length}</span><button class="ibtn sm" data-step="-1" ${pos <= 0 ? 'disabled' : ''} aria-label="Previous template">${ICON.left}</button><button class="ibtn sm" data-step="1" ${pos >= viewIds.length - 1 ? 'disabled' : ''} aria-label="Next template">${ICON.right}</button>` : ''}</span>
        <button class="ibtn x" data-close aria-label="Close">${ICON.x}</button></div>
      <div class="prev-bar"><div class="seg" role="group" aria-label="View"><button data-tab="preview" aria-pressed="${tab === 'preview'}">Preview</button>${isPortal(r) || isSignature(r) ? '' : `<button data-tab="history" aria-pressed="${tab === 'history'}">History · ${sendsOf(r)}</button>`}</div>
        ${tab === 'preview' ? `${isPortal(r) ? '' : deviceToggle(r, dev)}${sigToggle(r)}<span class="as">${isPortal(r) ? 'Sample: $100 start-up fee' : 'Sample lead: Jordan Example'}</span>` : '<span class="as">Last 8 sends on staging</span>'}</div>
      <div class="m-body">${tab === 'preview' ? previewPane(r, draft, dev) : historyPane(r)}</div>
      <div class="m-foot">${foot.join('')}</div></aside></div>`);
    const L = $('#layer');
    L.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = () => openPreview(r, b.dataset.dev, tab)));
    L.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => openPreview(r, dev, b.dataset.tab)));
    L.querySelectorAll('[data-step]').forEach((b) => (b.onclick = () => { const id = viewIds[pos + Number(b.dataset.step)]; if (id) openPreview(rows.find((x) => x.id === id), dev, tab); }));
    L.querySelectorAll('[data-sig]').forEach((b) => (b.onclick = () => { sigMode = b.dataset.sig; openPreview(r, dev, tab); }));
    L.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
      const p = b.dataset.p;
      if (p === 'test') return toast('Test sent to bao.trinh+' + role + '@loanfactory.com');
      if (p === 'edit') return openEditor(r);
      if (p === 'return') return openEditor(r);
      if (p === 'approve') { closeLayer(); return lifecycle(r, 'approve'); }
      if (p === 'restore') { closeLayer(); return lifecycle(r, 'restore'); }
    }));
  }

  // ---------- editor (create / edit / review) ----------
  const tokensIn = (d) => [...new Set([...(d.body + ' ' + d.subject + ' ' + d.preheader).matchAll(/\{\{[#^/]?(\w+)}}/g)].map((m) => m[1]))];
  const smsMeter = (sms) => `<span class="meter${sms.n > 1 ? ' warn' : ''}">${sms.len} characters · ${sms.n} text${sms.n > 1 ? 's' : ''}${sms.uni ? ' · special character: ' + esc(sms.uni) : ''}</span>`;
  const FIELD_LABEL = { body: 'Body', subject: 'Subject', preheader: 'Preview text', general: 'General' };

  // The mockup's stand-in for the AI call (the real one goes through moso-router like lf-iq). Deterministic so the review is repeatable.
  function fakeAi(draft, ask) {
    const keep = tokensIn(draft).filter(isKnown);
    const sig = '\n\nBest,\n{{recruiter_name}}';
    const a = ask.toLowerCase();
    if (draft.type === 'SMS' || a.includes('one text')) {
      return { subject: draft.subject, body: 'Hi {{first_name}}, it\'s {{recruiter_name}} from Loan Factory. Our next webinar is {{next_webinar}}. Want me to save you a seat? Reply YES.' };
    }
    if (a.includes('shorter')) {
      const paras = draft.body.split(/\n\s*\n/).filter((p) => p.trim());
      const greet = paras[0] || 'Hi {{first_name}},';
      const mid = paras.slice(1, 3).join('\n\n');
      return { subject: draft.subject, body: `${greet}\n\n${mid}${sig}` };
    }
    if (a.includes('friendlier')) return { subject: draft.subject, body: draft.body.replace(/^(Hi \{\{first_name}},)/, '$1\n\nHope your week is going well!') };
    if (a.includes('subject')) return { subject: 'Quick answers for you, {{first_name}}', body: draft.body };
    return {
      subject: 'Saw you missed the webinar, {{first_name}}',
      body: `Hi {{first_name}},\n\nSorry we missed you at the webinar. The next one is {{next_webinar}} and it only takes 45 minutes.\n\nYou will see how Loan Officers at Loan Factory keep more of each loan, and you can ask anything live.\n\nSave your seat here: {{webinar_link}}${sig}`,
      keep,
    };
  }

  function openEditor(r, opts = {}) {
    const isNew = !r;
    const base = r || { id: 'new', type: 'EMAIL', scope: 'TEAM', status: 'DRAFT', purpose: 'GENERAL', stage: null, name: '', subject: '', preheader: '', body: 'Hi {{first_name}},\n\n\n\nBest,\n{{recruiter_name}}', body_format: 'TEXT', original: '' };
    const start = { type: base.type, scope: base.scope, purpose: base.purpose, name: base.name, subject: base.subject || '', preheader: base.preheader || '', body: base.body };
    let draft = { ...start };
    let dev = 'desktop'; let pane = opts.pane || 'edit';
    const reviewing = !isNew && base.status === 'IN_REVIEW' && isApprover();
    let comments = reviewing ? [] : (base.comments || []).map((c) => ({ ...c }));
    let composing = null; // { field, quote, start, end }
    let showAll = false; // the 'N comments' list is open
    let editing = null; // index of the comment being edited
    let ai = null; // { ask, loading, result }
    const edited = () => ['name', 'subject', 'preheader', 'body', 'purpose'].some((k) => (draft[k] || '') !== (start[k] || ''));
    const marks = () => comments.filter((c) => c.quote && !c.fixed).map((c) => c.quote);

    // Comments live next to what they are about: Subject comments under Subject, Body comments under Body, general ones on top.
    const cmtActions = (c, i) => (reviewing
      ? `<span class="cmt-acts"><button class="cmt-x" data-edit="${i}" aria-label="Edit comment">${ICON.pencil}</button><button class="cmt-x" data-del="${i}" aria-label="Delete comment">${ICON.trash}</button></span>`
      : `<button class="cmt-res" data-fix="${i}">${c.fixed ? 'Reopen' : 'Resolve'}</button>`);
    const noteHtml = (c, i) => (editing === i
      ? `<div class="cmt-edit"><textarea class="inp" id="cEdit" rows="2">${esc(c.note)}</textarea><span style="display:flex;gap:6px;justify-content:flex-end"><button class="btn sm" data-ecancel>Cancel</button><button class="btn sm primary" data-esave>Save</button></span></div>`
      : `<p>${esc(c.note)}</p>`);
    const cardHtml = (c, i) => `<div class="cmt${c.fixed ? ' fixed' : ''}">
        <div class="cmt-h">${avatar(c.author)}<b>${esc(c.author)}</b><span class="td-dim">${c.when || 'Just now'}</span>${cmtActions(c, i)}</div>
        ${c.quote ? `<button class="cmt-q" data-jump="${i}" title="Show in ${FIELD_LABEL[c.field]}">${esc(c.quote)}</button>` : ''}
        ${noteHtml(c, i)}</div>`;
    const fieldComments = (field) => {
      const list = comments.map((c, i) => [c, i]).filter(([c]) => c.field === field);
      return list.length ? `<div class="cmt-list">${list.map(([c, i]) => cardHtml(c, i)).join('')}</div>` : '';
    };
    // Every comment in one place: where it is (Subject / Body / General), the words, the note, and edit / delete or resolve.
    const allListHtml = () => `<div class="cmt-all">${comments.map((c, i) => `<div class="cmt-row${c.fixed ? ' fixed' : ''}">
        <span class="cmt-where">${FIELD_LABEL[c.field]}</span>
        <div class="cmt-row-b">${c.quote ? `<button class="cmt-q" data-jump="${i}">${esc(c.quote)}</button>` : ''}${noteHtml(c, i)}</div>
        ${cmtActions(c, i)}</div>`).join('')}</div>`;
    const countBtn = (label) => `<button class="cmt-count" data-allc aria-expanded="${showAll}">${ICON.chat}${label}<span class="chev${showAll ? ' up' : ''}"></span></button>`;
    const commentsHtml = () => {
      const open = comments.filter((c) => !c.fixed).length;
      const general = showAll ? '' : fieldComments('general');
      if (reviewing) {
        return `<div class="rv-bar">${comments.length ? countBtn(`${comments.length} comment${comments.length > 1 ? 's' : ''}`) : '<span>Select any words in Subject or Body to comment</span>'}
          <button class="btn quiet sm" data-general>Add general comment</button></div>
          ${showAll && comments.length ? allListHtml() : ''}
          ${composing && composing.field === 'general' ? `<div class="cmt-new">${composerInner()}</div>` : ''}${general}`;
      }
      if (!comments.length) return '';
      return `<div class="rv-bar warn"><span>${avatar(base.returnedBy || 'Manager')}<b>${esc(base.returnedBy || 'A manager')}</b> returned this · ${open} of ${comments.length} open</span>${countBtn(showAll ? 'Hide list' : 'See all')}</div>
        ${showAll ? allListHtml() : ''}${general}`;
    };
    const composerInner = () => `<textarea class="inp" id="cNote" placeholder="Add a comment" rows="2"></textarea>
        <div class="cmt-new-f"><span class="td-dim">⌘ Enter to post</span><span style="display:flex;gap:6px"><button class="btn sm" data-cc>Cancel</button><button class="btn sm primary" data-ca disabled>Comment</button></span></div>`;
    const fieldTools = (id) => `<span class="lbl-tools"><button class="btn quiet sm" data-ins="${id}">Insert field</button></span>`;
    const aiHtml = () => {
      if (!ai) return '';
      const quick = draft.type === 'SMS' ? [['Fit in one text', 'Fit in one text']] : [['Shorter', 'Make it shorter'], ['Friendlier', 'Make it friendlier'], ['New subject', 'Write a new subject']];
      return `<div class="ai-box"><div class="lbl-row"><span class="lbl">Write with AI</span><button class="ibtn sm" data-aix aria-label="Close AI">${ICON.x}</button></div>
        <textarea class="inp" id="aiAsk" style="min-height:76px" placeholder="Example: invite a Loan Officer who missed the webinar to the next one. Short and friendly.">${esc(ai.ask || '')}</textarea>
        <div class="ai-quick">${quick.map(([t, ask]) => `<button class="chip-btn" data-aiq="${esc(ask)}">${t}</button>`).join('')}</div>
        <div style="display:flex;justify-content:flex-end"><button class="btn sm primary" data-aigo ${ai.loading ? 'disabled' : ''}>${ai.loading ? 'Writing…' : 'Write'}</button></div></div>`;
    };
    const aiBanner = () => {
      if (!ai || !ai.result) return '';
      const before = tokensIn(draft).filter(isKnown);
      const after = tokensIn({ ...draft, ...ai.result });
      const lost = before.filter((t) => !after.includes(t) && t !== 'signature');
      const bad = after.filter((t) => !isKnown(t));
      const ok = !lost.length && !bad.length;
      return `<div class="ai-banner"><div><b>AI draft</b> · ${ok ? `Fields kept: ${after.map((t) => '{{' + t + '}}').join(' ') || 'none'}` : `<span style="color:var(--rd-fg)">${lost.length ? 'Lost ' + lost.map((t) => '{{' + t + '}}').join(' ') : 'Unknown ' + bad.map((t) => '{{' + t + '}}').join(' ')}. Try again.</span>`}</div>
        <span style="display:flex;gap:6px"><button class="btn sm" data-aidis>Discard</button><button class="btn sm" data-aire>Try again</button><button class="btn sm primary" data-aiuse ${ok ? '' : 'disabled'}>Use this</button></span></div>`;
    };
    const previewDraft = () => (ai && ai.result ? { ...draft, ...ai.result } : draft);

    const draw = () => {
      const sp = document.getElementById('selPop'); if (sp) sp.remove();
      const purposeLocked = draft.scope === 'PERSONAL' || base.body_format === 'HTML';
      const unknown = tokensIn(draft).filter((t) => !isKnown(t));
      const sms = draft.type === 'SMS' ? smsInfo(fillText(draft.body)) : null;
      const valid = draft.name.trim() && draft.body.trim() && unknown.length === 0;
      const st = STATUS[base.status];
      const title = isNew ? 'New template' : reviewing ? 'Review template' : 'Edit template';
      const foot = [];
      if (!isNew && base.status === 'ACTIVE' && (isApprover() || base.scope === 'PERSONAL')) foot.push('<button class="btn danger-quiet" data-e="archive">Archive</button>');
      foot.push('<span class="sp"></span><button class="btn" data-close>Cancel</button>');
      if (reviewing) foot.push(`<button class="btn" data-e="return" ${comments.length ? '' : 'disabled'}>Return to writer${comments.length ? ' · ' + comments.length : ''}</button><button class="btn primary" data-e="approve" ${valid ? '' : 'disabled'}>${edited() ? 'Save changes and publish' : 'Approve and publish'}</button>`);
      else if (draft.scope === 'PERSONAL') foot.push(`<button class="btn primary" data-e="save" ${valid ? '' : 'disabled'}>Save</button>`);
      else if (isApprover()) foot.push(`${base.status !== 'ACTIVE' ? `<button class="btn" data-e="draft" ${draft.name.trim() ? '' : 'disabled'}>Save draft</button>` : ''}<button class="btn primary" data-e="publish" ${valid ? '' : 'disabled'}>${base.status === 'ACTIVE' ? 'Save and publish' : 'Publish'}</button>`);
      else foot.push(`<button class="btn" data-e="draft" ${draft.name.trim() ? '' : 'disabled'}>Save draft</button><button class="btn primary" data-e="submit" ${valid ? '' : 'disabled'}>Submit for review</button>`);
      const segBtns = (key, opts2) => `<div class="seg" role="group">${opts2.map(([v, t]) => `<button type="button" data-seg="${key}" data-val="${v}" aria-pressed="${draft[key] === v}">${t}</button>`).join('')}</div>`;
      const fieldComposer = (field) => fieldComments(field);
      layer(`<div class="ov"><div class="modal" role="dialog" aria-label="${title}">
        <div class="m-head"><div style="min-width:0"><h3>${title}</h3>${isNew ? '' : `<div class="chips">${chip(st[1], st[0], base.status !== 'RETIRED')}<span class="meta-pill">${ICON[draft.type]}${CH[draft.type]}</span><span class="meta-pill">${draft.scope === 'TEAM' ? 'Whole team' : 'Only me'}</span>${base.updated ? `<span class="who-inline">${whoOf(base) ? avatar(whoOf(base)) : ''}<span class="td-dim">${whoOf(base) ? esc(whoOf(base)) + ' · ' : ''}${fmtDate(base.updated)}</span></span>` : ''}</div>`}</div><button class="ibtn x" data-close aria-label="Close">${ICON.x}</button></div>
        <div class="m-body"><div class="ed" data-pane="${pane}">
          <div class="ed-tabs"><div class="seg" role="group"><button data-pane="edit" aria-pressed="${pane === 'edit'}">Edit</button><button data-pane="preview" aria-pressed="${pane === 'preview'}">Preview</button></div></div>
          <div class="ed-form">
            ${reviewing ? `<div class="notice info"><div><b>${esc(whoOf(base) || 'A teammate')} asked for review</b>${base.updated ? ' · ' + fmtDate(base.updated) : ''}</div></div>` : ''}
            ${commentsHtml()}
            <div class="sec"><div class="sec-t">Details</div>
              <div class="fld"><label for="fName">Name <span class="req">*</span></label><input class="inp" id="fName" value="${esc(draft.name)}"></div>
              ${isNew ? `<div class="fld"><span class="lbl">Channel</span>${segBtns('type', [['EMAIL', 'Email'], ['SMS', 'SMS']])}</div>
              <div class="fld"><span class="lbl">Who can use it</span>${segBtns('scope', [['TEAM', 'Whole team'], ['PERSONAL', 'Only me']])}</div>`
              : ''}
              <div class="fld"><label for="fPurpose">Purpose</label><select class="inp" id="fPurpose" ${purposeLocked ? 'disabled' : ''}>${Object.entries(PURPOSE).map(([v, t]) => `<option value="${v}"${(purposeLocked && base.body_format !== 'HTML' ? 'GENERAL' : draft.purpose) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
            </div>
            <div class="sec"><div class="lbl-row"><span class="sec-t">Message</span>${base.body_format === 'HTML' ? '' : `<button class="btn quiet sm" data-ai>${ICON.spark}Write with AI</button>`}</div>
              ${aiHtml()}
              ${draft.type === 'EMAIL' ? `<div class="fld"><div class="lbl-row"><label for="fSubject">Subject</label>${fieldTools('fSubject')}</div><input class="inp" id="fSubject" value="${esc(draft.subject)}">${fieldComposer('subject')}</div>
              <div class="fld"><label for="fPre">Preview text</label><input class="inp" id="fPre" value="${esc(draft.preheader)}" placeholder="Shown after the subject in the inbox"></div>` : ''}
              <div class="fld"><div class="lbl-row"><label for="fBody">${base.body_format === 'HTML' ? 'Body (HTML)' : 'Body'} <span class="req">*</span></label>${fieldTools('fBody')}</div>
                <textarea class="inp${base.body_format === 'HTML' ? ' code' : ''}" id="fBody" spellcheck="${base.body_format !== 'HTML'}">${esc(draft.body)}</textarea>
                ${fieldComposer('body')}
                <div class="issues">${unknown.map((t) => chip('rd', 'Unknown field {{' + t + '}}')).join('')}${sms ? smsMeter(sms) : ''}</div></div>
            </div>
          </div>
          <div class="ed-prev"><div class="prev-bar"><span class="t">Preview</span>${deviceToggle(draft, dev)}${sigToggle(base)}<span class="as">Sample lead: Jordan Example</span></div>${aiBanner()}<div id="prevBody" style="display:flex;flex-direction:column;flex:1;min-height:0">${previewPane({ ...base, type: draft.type, purpose: draft.purpose }, previewDraft(), dev, marks())}</div></div>
        </div></div>
        <div class="m-foot">${foot.join('')}</div></div></div>`);
      bindEditor();
    };
    let tm;
    const refreshPreview = () => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        const pb = $('#prevBody'); if (pb) pb.innerHTML = previewPane({ ...base, type: draft.type, purpose: draft.purpose }, previewDraft(), dev, marks());
        const iss = $('.issues'); if (iss) { const unknown = tokensIn(draft).filter((t) => !isKnown(t)); const sms = draft.type === 'SMS' ? smsInfo(fillText(draft.body)) : null; iss.innerHTML = unknown.map((t) => chip('rd', 'Unknown field {{' + t + '}}')).join('') + (sms ? smsMeter(sms) : ''); }
        syncFoot();
      }, 150);
    };
    const syncFoot = () => {
      const valid = draft.name.trim() && draft.body.trim() && tokensIn(draft).every(isKnown);
      document.querySelectorAll('[data-e="publish"],[data-e="submit"],[data-e="save"],[data-e="approve"]').forEach((b) => { b.disabled = !valid; });
      document.querySelectorAll('[data-e="draft"]').forEach((b) => { b.disabled = !draft.name.trim(); });
      const ap = document.querySelector('[data-e="approve"]'); if (ap) ap.textContent = edited() ? 'Save changes and publish' : 'Approve and publish';
    };
    const bindEditor = () => {
      const L = $('#layer');
      L.onclick = (e) => { if (e.target.closest('button[data-close]')) closeLayer(); };
      const bindInput = (id, key) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { draft = { ...draft, [key]: el.value }; refreshPreview(); }); };
      bindInput('fName', 'name'); bindInput('fSubject', 'subject'); bindInput('fPre', 'preheader'); bindInput('fBody', 'body');
      const fp = $('#fPurpose'); fp && fp.addEventListener('change', () => { draft = { ...draft, purpose: fp.value }; draw(); });
      L.querySelectorAll('[data-seg]').forEach((b) => (b.onclick = () => { const k = b.dataset.seg; const v = b.dataset.val; draft = { ...draft, [k]: v, ...(k === 'scope' && v === 'PERSONAL' ? { purpose: 'GENERAL' } : {}) }; draw(); }));
      L.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = () => { dev = b.dataset.dev; draw(); }));
      L.querySelectorAll('[data-sig]').forEach((b) => (b.onclick = () => { sigMode = b.dataset.sig; draw(); }));
      L.querySelectorAll('.ed-tabs [data-pane]').forEach((b) => (b.onclick = () => { pane = b.dataset.pane; draw(); }));
      L.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = (e) => {
        e.stopPropagation(); const target = $('#' + b.dataset.ins);
        popMenu(b, FIELDS.map(([g, fs2]) => `<div class="mh">${g}</div>` + fs2.map(([k, t]) => `<button data-v="${k}">${t}<code>{{${k}}}</code></button>`).join('')).join(''), (k) => {
          const s = target.selectionStart ?? target.value.length; const tok = '{{' + k + '}}';
          target.value = target.value.slice(0, s) + tok + target.value.slice(target.selectionEnd ?? s);
          target.dispatchEvent(new Event('input')); target.focus(); target.setSelectionRange(s + tok.length, s + tok.length);
        });
      }));
      // review comments: select words -> a Comment button appears right at the pointer -> click -> a small box opens there.
      const closeSel = () => { const p = $('#selPop'); if (p) p.remove(); };
      const openSelPop = (field, el, x, y) => {
        closeSel();
        const s0 = el.selectionStart; const e0 = el.selectionEnd; const quote = el.value.slice(s0, e0).trim();
        if (!quote) return;
        const app = $('#app'); const ar = app.getBoundingClientRect();
        const pop = document.createElement('div'); pop.id = 'selPop'; pop.className = 'selpop';
        pop.innerHTML = `<button class="selbtn" data-selgo>${ICON.chat}Comment</button>`;
        app.appendChild(pop);
        const place = () => { const w = pop.offsetWidth; const h = pop.offsetHeight; pop.style.left = Math.max(8, Math.min(x - ar.left - 10, ar.width - w - 8)) + 'px'; pop.style.top = Math.max(8, Math.min(y - ar.top + 14, ar.height - h - 8)) + 'px'; };
        place();
        pop.querySelector('[data-selgo]').onmousedown = (ev) => ev.preventDefault();
        pop.querySelector('[data-selgo]').onclick = () => {
          pop.classList.add('open');
          pop.innerHTML = `<div class="selpop-q">${esc(quote.length > 80 ? quote.slice(0, 80) + '…' : quote)}</div>${composerInner()}`;
          place();
          const ta = pop.querySelector('#cNote'); ta.focus();
          const post = () => { const note = ta.value.trim(); if (!note) return; comments = [...comments, { field, quote, note, fixed: false, author: REVIEWER }]; closeSel(); draw(); };
          ta.addEventListener('input', () => { pop.querySelector('[data-ca]').disabled = !ta.value.trim(); });
          ta.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) post(); if (ev.key === 'Escape') closeSel(); });
          pop.querySelector('[data-cc]').onclick = closeSel;
          pop.querySelector('[data-ca]').onclick = post;
        };
      };
      if (reviewing) {
        [['fSubject', 'subject'], ['fBody', 'body']].forEach(([id, field]) => {
          const el = $('#' + id); if (!el) return;
          el.addEventListener('mouseup', (ev) => setTimeout(() => { if (el.selectionEnd > el.selectionStart) openSelPop(field, el, ev.clientX, ev.clientY); else closeSel(); }, 0));
          el.addEventListener('keyup', (ev) => { if (ev.shiftKey && el.selectionEnd > el.selectionStart) { const r2 = el.getBoundingClientRect(); openSelPop(field, el, r2.right - 120, r2.top + 8); } });
          el.addEventListener('input', closeSel);
        });
      }
      const g = L.querySelector('[data-general]'); if (g) g.onclick = () => { composing = { field: 'general', quote: '' }; draw(); const n = $('#cNote'); n && n.focus(); };
      const note = $('#cNote'); if (note && !note.closest('#selPop')) {
        const postG = () => { const v = note.value.trim(); if (!v) return; comments = [...comments, { field: 'general', quote: '', note: v, fixed: false, author: REVIEWER }]; composing = null; draw(); };
        note.addEventListener('input', () => { L.querySelector('[data-ca]').disabled = !note.value.trim(); });
        note.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) postG(); });
        const cc = L.querySelector('[data-cc]'); if (cc) cc.onclick = () => { composing = null; draw(); };
        const ca = L.querySelector('[data-ca]'); if (ca) ca.onclick = postG;
      }
      const allc = L.querySelector('[data-allc]'); if (allc) allc.onclick = () => { showAll = !showAll; editing = null; draw(); };
      L.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => { editing = Number(b.dataset.edit); draw(); const t = $('#cEdit'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }));
      const ec = L.querySelector('[data-ecancel]'); if (ec) ec.onclick = () => { editing = null; draw(); };
      const saveEdit = () => { const v = ($('#cEdit') || {}).value || ''; if (!v.trim()) return; comments = comments.map((c, j) => (j === editing ? { ...c, note: v.trim(), when: 'Edited just now' } : c)); editing = null; draw(); };
      const es = L.querySelector('[data-esave]'); if (es) es.onclick = saveEdit;
      const ce = $('#cEdit'); if (ce) ce.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) saveEdit(); if (ev.key === 'Escape') { editing = null; draw(); } });
      L.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.del); comments = comments.filter((_, j) => j !== i); if (editing === i) editing = null; if (!comments.length) showAll = false; draw(); }));
      L.querySelectorAll('[data-fix]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.fix); comments = comments.map((c, j) => (j === i ? { ...c, fixed: !c.fixed } : c)); draw(); }));
      L.querySelectorAll('[data-jump]').forEach((b) => (b.onclick = () => {
        const c = comments[Number(b.dataset.jump)]; const el = $(c.field === 'subject' ? '#fSubject' : c.field === 'preheader' ? '#fPre' : '#fBody'); if (!el) return;
        const at = el.value.indexOf(c.quote); el.focus(); if (at >= 0) { el.setSelectionRange(at, at + c.quote.length); if (el.tagName === 'TEXTAREA') { const lh = 22; el.scrollTop = Math.max(0, (el.value.slice(0, at).split('\n').length - 3) * lh); } }
      }));
      // AI
      const aib = L.querySelector('[data-ai]'); if (aib) aib.onclick = () => { ai = ai ? null : { ask: '' }; draw(); const a = $('#aiAsk'); a && a.focus(); };
      const aix = L.querySelector('[data-aix]'); if (aix) aix.onclick = () => { ai = null; draw(); };
      const askEl = $('#aiAsk'); if (askEl) askEl.addEventListener('input', () => { ai = { ...ai, ask: askEl.value }; });
      const runAi = (ask) => { ai = { ...ai, ask, loading: true, result: null }; draw(); setTimeout(() => { ai = { ...ai, loading: false, result: fakeAi(draft, ask) }; draw(); }, 1100); };
      L.querySelectorAll('[data-aiq]').forEach((b) => (b.onclick = () => runAi(b.dataset.aiq)));
      const go = L.querySelector('[data-aigo]'); if (go) go.onclick = () => runAi(($('#aiAsk') || {}).value || '');
      const dis = L.querySelector('[data-aidis]'); if (dis) dis.onclick = () => { ai = { ...ai, result: null }; draw(); };
      const re = L.querySelector('[data-aire]'); if (re) re.onclick = () => runAi(ai.ask || '');
      const use = L.querySelector('[data-aiuse]'); if (use) use.onclick = () => { draft = { ...draft, subject: ai.result.subject ?? draft.subject, body: ai.result.body }; ai = null; draw(); toast('AI draft added. Check it, then save.'); };
      // save / review verbs
      L.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => {
        const a = b.dataset.e;
        if (a === 'archive') { closeLayer(); return lifecycle(base, 'archive'); }
        if (a === 'return') {
          rows = rows.map((x) => (x.id === base.id ? { ...x, ...draft, status: 'DRAFT', comments, returnedBy: REVIEWER, original: draft.body, html: draft.body === x.original ? x.html : null } : x));
          notes = [{ kind: 'return', name: display(base).n, count: comments.length, first: comments[0] }, ...notes]; bumpBell();
          closeLayer(); renderMain();
          return toast(`Returned to ${whoOf(base) || 'the writer'} with ${comments.length} comment${comments.length > 1 ? 's' : ''}. They got a notification.`);
        }
        if (a === 'approve') {
          const changed = edited();
          rows = rows.map((x) => (x.id === base.id ? { ...x, ...draft, status: 'ACTIVE', comments: [], original: draft.body, html: draft.body === x.original ? x.html : null } : x));
          notes = [{ kind: 'approve', name: display(base).n, edited: changed }, ...notes]; bumpBell();
          closeLayer(); renderMain();
          return toast(changed ? `Your changes are live. ${whoOf(base) || 'The writer'} got a notification showing what you changed.` : `Published. ${whoOf(base) || 'The writer'} got a notification.`);
        }
        const next = a === 'publish' || a === 'save' ? 'ACTIVE' : a === 'submit' ? 'IN_REVIEW' : 'DRAFT';
        const rec = { ...base, ...draft, status: draft.scope === 'PERSONAL' ? 'ACTIVE' : next, id: isNew ? 'new-' + Date.now() : base.id, updated: new Date().toISOString().slice(0, 10), by: role === 'manager' ? 'cc455108-edcc-4ea9-b0f0-42f677ceb6eb' : 'd8186688-77d4-454d-a649-a1bdf8842bb6', comments: next === 'IN_REVIEW' ? [] : comments, html: null, original: draft.body };
        rows = isNew ? [rec, ...rows] : rows.map((x) => (x.id === base.id ? rec : x));
        closeLayer();
        toast(a === 'publish' ? 'Published. Recruiters can use it now.' : a === 'submit' ? 'Sent to managers for review' : a === 'save' ? 'Saved. Only you can see it.' : 'Draft saved');
        renderMain();
      }));
    };
    draw();
  }

  function lifecycle(r, verb) {
    const d = display(r);
    const next = { approve: 'ACTIVE', archive: 'RETIRED', restore: 'ACTIVE', submit: 'IN_REVIEW' }[verb];
    rows = rows.map((x) => (x.id === r.id ? { ...x, status: next } : x));
    if (verb === 'approve') { notes = [{ kind: 'approve', name: d.n }, ...notes]; bumpBell(); }
    renderMain();
    toast({ approve: `Published. ${whoOf(r) || 'The writer'} got a notification.`, archive: `"${d.n}" archived. Find it under Archived.`, restore: `"${d.n}" is active again`, submit: 'Sent to managers for review' }[verb]);
  }
  function bumpBell() { const c = $('#bellCount'); c.textContent = String(Number(c.textContent) + 1); }
  $('#bellBtn').onclick = (e) => {
    e.stopPropagation();
    const old = $('#bellPop'); if (old) return old.remove();
    const p = document.createElement('div'); p.className = 'pop'; p.id = 'bellPop';
    const items = notes.length ? notes : [{ kind: 'return', name: 'QA Claude r5 perm check', reason: 'Add the webinar link before we send this.' }, { kind: 'approve', name: 'Webinar follow-up (demo)' }];
    p.innerHTML = `<div class="h">What the writer sees</div>` + items.map((n) => n.kind === 'return'
      ? `<div class="it"><span><b style="font-weight:500">${REVIEWER}</b> returned "${esc(n.name)}" with ${n.count || 1} comment${(n.count || 1) > 1 ? 's' : ''}</span>${n.first ? `<span class="q">${n.first.quote ? '<mark>' + esc(n.first.quote.slice(0, 60)) + '</mark> ' : ''}${esc(n.first.note)}</span>` : n.reason ? `<span class="q">${esc(n.reason)}</span>` : ''}<small>Just now · Templates</small></div>`
      : `<div class="it"><span><b style="font-weight:500">${REVIEWER}</b> ${n.edited ? 'edited and published' : 'approved'} "${esc(n.name)}". It is live now.${n.edited ? ' <u>See changes</u>' : ''}</span><small>Just now · Templates</small></div>`).join('');
    $('#app').appendChild(p);
    setTimeout(() => document.addEventListener('click', function h(ev) { if (!ev.target.closest('#bellPop')) { p.remove(); document.removeEventListener('click', h); } }), 0);
  };

  // ---------- review strip ----------
  const NOTES = {
    list: `<b>Danh sách</b> · v5
      <ul><li><b>Bỏ kịch bản gọi:</b> không còn dùng ở đâu (gỡ khỏi Hot/Cold từ 29/09). 8 mẫu chuyển sang tab <b>Archived</b> (data vẫn giữ, Restore được), bỏ lựa chọn "Call script" khi tạo mẫu.</li>
      <li><b>Bỏ Stage:</b> chỉ kịch bản gọi dùng, email/SMS không dùng. Bỏ cột, ô trong form, bộ lọc.</li>
      <li><b>Ô Template 2 dòng:</b> trên là tên mẫu, dưới là tiêu đề email. SMS, trang portal, chữ ký không có tiêu đề nên 1 dòng.</li>
      <li><b>Cột Sent</b> (chữ anh chốt 11/11): <i>Sent by recruiter</i> recruiter tự chọn mẫu ở Send info · <i>Sent by the app</i> app tự gửi (vd "invitation to join" khi recruiter mời LO) · <i>Not sent, shown on portal page</i> không phải email, là chữ trên trang onboarding · <i>Signature block</i> khối chữ ký cuối email app gửi.</li>
      <li><b>v4:</b> cột Updated có <b>avatar + tên đầy đủ</b> người sửa cuối (mẫu cài sẵn từ đầu chỉ hiện ngày, không avatar); dưới cột Sent có <b>số lần đã gửi thật</b> trên staging.</li>
      <li>Giữ từ v2: phân trang giống Pipeline, pill Team / Mine, tab trạng thái, tìm/lọc/sort/Reset/Refresh/lưu bộ lọc/Table-Cards, tất cả trên URL: <code id="rvUrl"></code></li></ul>`,
    cards: `<b>Dạng thẻ</b> (điểm 7): cùng bộ lọc, mỗi thẻ có kênh, trạng thái, tên, tiêu đề, 3 dòng đầu nội dung. Trên điện thoại danh sách tự thành thẻ, bộ lọc gom vào nút <i>Filters</i>.`,
    preview: `<b>Xem email thật</b> · v5
      <ul><li><b>New design / Current</b>: bản hoàn thiện của email Loan Officer có <b>logo Loan Factory ở đầu thư</b>, nền xám, thẻ trắng 600px co giãn theo màn hình, chữ ký mới, dòng pháp lý tách thành dải xám ở đáy. Bấm Current để so với email đang gửi thật.<span class="tag-be">BE sửa layout + chữ ký</span></li>
      <li>Chữ ký mới: tên đậm, chức danh nhạt, vạch cam ngắn của thương hiệu, các dòng M / O / E (di động, văn phòng, email) có nhãn cam, NMLS, icon LinkedIn thật. Logo không lặp lại trong chữ ký vì đã có ở đầu thư (chữ ký email của Tera cũng không có logo).</li>
      <li>3 mẫu "portal page" hiện đúng dạng trang onboarding, không còn From / To / Subject như email.</li>
      <li>Ngăn bên phải có <b>‹ ›</b> và "3 of 37" để xem lần lượt từng mẫu không cần đóng ra. Tab History giữ như v4.</li></ul>`,
    edit: `<b>Sửa mẫu</b> · v4
      <ul><li><b>Write with AI</b> (cạnh chữ Message): gõ yêu cầu hoặc bấm nhanh Shorter / Friendlier / New subject (SMS: Fit in one text). AI viết <b>cả tiêu đề và nội dung</b>, kết quả hiện ngay ở khung Preview bên phải, kèm dòng kiểm "Fields kept". AI làm mất hoặc chế biến lạ thì nút "Use this" bị khoá. Trong mockup AI là bản giả lập; bản thật gọi dịch vụ AI chung moso-router như lf-iq.<span class="tag-be">BE mới</span></li>
      <li>Cột Updated và đầu modal có avatar + tên người sửa.</li>
      <li>Giữ từ v1: trái soạn, phải preview trực tiếp, Insert field, báo biến gõ sai, Desktop/Mobile.</li></ul>`,
    new: `<b>Tạo mới</b>: chọn Email / SMS và Whole team / Only me ngay trong form. Mẫu trống thì bấm <b>Write with AI</b> rồi gõ "email mời LO bỏ lỡ webinar…" để AI viết từ đầu.`,
    review: `<b>Duyệt / trả lại</b> · v6.1
      <ul><li><b>Bôi đen chữ</b> trong Subject hoặc Body là nút <b>Comment</b> hiện ngay tại con trỏ chuột. Bấm vào thì ô bình luận mở luôn tại chỗ, gõ rồi <b>⌘ Enter</b> (hoặc bấm Comment). Không còn nút "Comment on selection" phải bấm trước.</li>
      <li>Bình luận <b>nằm ngay dưới ô nó thuộc về</b>: bình luận Body nằm dưới Body, Subject nằm dưới Subject. Góp ý chung (không gắn chữ nào) nằm trên cùng.</li>
      <li>Thẻ bình luận kiểu Google Docs: avatar, tên người duyệt, thời gian, đoạn chữ được bôi (gạch vàng bên trái, bấm vào là nhảy tới đúng chỗ), nội dung. Người viết bấm <b>Resolve</b> khi sửa xong.</li>
      <li><b>v6:</b> bấm "<b>2 comments</b>" mở danh sách mọi bình luận mình đã viết (ở Subject, Body hay General), mỗi cái có nút <b>sửa</b> (bút) và <b>xoá</b> (thùng rác); thẻ dưới từng ô cũng có 2 nút này. Sửa ngay tại chỗ, ⌘ Enter để lưu. Màn "Người viết nhận lại" cho thấy phía người nhận.</li>
      <li>Đoạn chữ được bình luận cũng tô vàng trong Preview bên phải. Manager vẫn sửa thẳng được, có sửa thì nút thành "Save changes and publish".<span class="tag-be">BE mới: lưu bình luận</span></li></ul>`,
    writer: `<b>Người viết nhận lại</b> · v6 (Xem như: Recruiter)
      <ul><li>Chuông báo: "Victoria Pham returned … with 3 comments", kèm đoạn chữ và góp ý đầu tiên. Bấm chuông trên thanh trên cùng để xem.</li>
      <li>Mở mẫu (tab <b>Drafts</b>): dải vàng trên cùng "Victoria Pham returned this · 3 of 3 open" + nút <b>See all</b> mở danh sách mọi bình luận.</li>
      <li>Mỗi bình luận nằm ngay dưới ô của nó (Subject, Body), góp ý chung nằm trên cùng. Bấm đoạn chữ vàng là con trỏ nhảy tới đúng chữ đó trong ô; chữ đó cũng tô vàng trong Preview.</li>
      <li>Sửa xong bấm <b>Resolve</b> (mờ đi, gạch ngang; bấm Reopen để mở lại). Xong hết thì <b>Submit for review</b> gửi lại manager.</li></ul>`,
    kit: `<b>Ngôn ngữ email</b> (11/11, v7.2) · dựa trên bộ email mới nhất của Tera (TERA_EMAIL_LAYOUT, kit rate-alert)
      <ul><li>Trả lời câu "chân thư sao mỗi mẫu một kiểu": hiện có <b>2 bộ dựng khác nhau</b> trong BE. Email Nurture dùng khung NurtureEmailHtml (địa chỉ + NMLS + Unsubscribe); email hệ thống gửi Loan Officer dùng chữ ký + câu bảo mật nằm sẵn trong từng mẫu. Quy chuẩn mới gom về <b>1 khung, 1 chữ ký, 1 chân thư</b>.</li>
      <li>Viết lại <b>26 email</b> Loan Officer + 3 email nhắc lịch 1-1 theo quy chuẩn (giữ ý, bỏ emoji, nút chữ thường, gom ngày giờ vào khung chi tiết). Email chữ thường (Nurture, Send info) tự vào cùng khung.<span class="tag-be">BE: kit HTML dùng chung + migration viết lại mẫu</span></li>
      <li><b>v7.1:</b> 3 mẫu <b>portal page</b> (chữ trên trang onboarding, không phải email) cũng theo quy chuẩn: tiêu đề, các bước có số, danh sách ô cam, dải xanh "Payment successful". Không có đầu thư / chữ ký / chân thư vì chúng nằm trong trang web.</li>
      <li><b>v7.2:</b> mỗi email <b>chỉ có chữ ký đầy đủ của người gửi</b>. Người gửi chính là recruiter của Loan Officer (hoặc onboarding specialist; lead chưa có chủ thì là Loan Factory Recruiting), nên chữ ký đã là người cần liên hệ. Bỏ thẻ "Your recruiter" / "Recruiting team"; email nào bản cũ có số của đội tuyển dụng thì giữ <b>1 dòng nhỏ dự phòng</b> trên chữ ký.</li>
      <li>Chọn email ở phần "Trước / sau" để so; có Desktop / Mobile. Ngăn xem email trong màn danh sách cũng dùng khung mới khi chọn New design.</li></ul>`,
    before: `<b>Trước</b>: ảnh anh gửi 10/11 23:36.`,
  };
  // ---------- email design language page ----------
  let kitPick = 'tpl-lo-webinar-reminder-2d'; let kitDev = 'desktop';
  const docOf = (html) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}img{max-width:100%}</style></head><body>${html}</body></html>`.replace(/"/g, '&quot;');
  function renderKit() {
    const T = window.MAILKIT_TOKENS; const B = window.MAILKIT.B; const shell = window.MAILKIT.shell;
    const emails = rows.filter((r) => r.type === 'EMAIL' && !isSignature(r));
    const r = rows.find((x) => x.id === kitPick) || emails[0];
    const draft = { subject: r.subject, preheader: r.preheader, body: r.body };
    const keep = sigMode; sigMode = 'old'; const cur = emailDoc(r, draft).replace(/"/g, '&quot;'); sigMode = 'new'; const nw = emailDoc(r, draft).replace(/"/g, '&quot;'); sigMode = keep;
    const sw = (n, v, use) => `<div class="kit-sw"><span style="background:${v}"></span><b>${n}</b><code>${v}</code><small>${use}</small></div>`;
    const comp = (title, rule, rowsHtml) => `<div class="kit-comp"><div class="kit-comp-t"><b>${title}</b><span>${rule}</span></div><iframe sandbox title="${title}" srcdoc="${docOf(shell(rowsHtml))}"></iframe></div>`;
    $('#kitView').innerHTML = `
      <section class="kit-sec"><h2>Nguyên tắc</h2><ol class="kit-rules">
        <li><b>Một khung cho mọi email</b>: nền xám, thẻ trắng 600px co giãn, vạch cam thương hiệu trên cùng, logo Loan Factory bên trái, nhãn loại thư bên phải (Webinar, Onboarding…).</li>
        <li><b>Một tiêu đề lớn</b> nói ngay thư này về việc gì (22px đậm), rồi lời chào, rồi 1–2 đoạn ngắn.</li>
        <li><b>Một nút chính duy nhất</b>, rộng hết thẻ, chữ thường viết hoa đầu câu ("Join the webinar", không "JOIN THE WEBINAR"). Việc phụ là link chữ cam.</li>
        <li><b>Thông tin cần làm theo</b> (ngày giờ, thời lượng, nơi họp, số tiền) nằm trong <b>khung chi tiết</b>, không viết lẫn trong câu.</li>
        <li><b>Không emoji.</b> Danh sách lợi ích dùng ô vuông cam nhỏ; các bước dùng số tròn.</li>
        <li><b>Người liên hệ</b> (recruiter, team) là thẻ có chữ cái đầu, tên, chức danh, điện thoại, email bấm được.</li>
        <li><b>Một chữ ký</b> cho mọi email (theo Tera) và <b>một chân thư</b>: lý do nhận thư, Loan Factory NMLS, địa chỉ, Equal Housing Opportunity, email hỗ trợ. Thư Nurture / marketing thêm Unsubscribe; thư hệ thống thì không.</li>
        <li>Chỉ dùng bảng + style viết thẳng trong thẻ, kèm bgcolor, để Gmail, Outlook, chế độ tối hiện giống nhau. Icon là ảnh PNG đặt trên server.</li></ol></section>
      <section class="kit-sec"><h2>Màu và chữ</h2><div class="kit-sws">
        ${sw('Chữ', T.text, 'Nội dung, tiêu đề')}${sw('Chữ phụ', T.muted, 'Nhãn, gợi ý, chân thư')}${sw('Cam thương hiệu', T.brand, 'Vạch trên cùng, ô vuông')}${sw('Nút', T.fill, 'Nền nút chính (chữ trắng đạt 4.85:1)')}${sw('Link', T.link, 'Link, số điện thoại')}${sw('Nền khung', T.canvas, 'Khung chi tiết, chân thư')}${sw('Vạch', T.line, 'Viền, đường kẻ')}${sw('Tô nhạt', T.tint, 'Chữ cái đầu tên, số bước')}</div>
        <div class="kit-type"><div><span style="font-size:22px;font-weight:700">Tiêu đề 22 / 700</span></div><div><span style="font-size:15px">Nội dung 15 / 400, cao dòng 1.6</span></div><div><span style="font-size:13px;color:${T.muted}">Ghi chú 13 / 400</span></div><div><span style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:${T.muted}">Nhãn loại thư 12</span></div><div class="td-dim">Font: Public Sans, dự phòng Arial / font hệ thống</div></div></section>
      <section class="kit-sec"><h2>Thành phần</h2><div class="kit-comps">
        ${comp('Đầu thư + tiêu đề', 'Vạch cam, logo, nhãn loại thư, 1 tiêu đề', [B.header('Webinar'), B.h1('2 days to Why Loan Factory'), B.hi('Jordan')])}
        ${comp('Nút chính + gợi ý', 'Chỉ 1 nút/thư, rộng hết thẻ', [B.cta('Join the webinar', '#', 'Opens 5 minutes early'), B.small(B.link('Add it to your calendar', '#') + ' so you do not miss it.')])}
        ${comp('Khung chi tiết', 'Ngày giờ, thời lượng, nơi, số tiền', [B.details([['Date and time', 'Fri, Nov 6, 2026 · 9:00 AM PST'], ['Length', 'About 1.5 hours'], ['Where', 'Google Meet']])])}
        ${comp('Danh sách lợi ích', 'Ô vuông cam, không emoji', [B.bullets(['No junk fees and higher payouts', 'Our own LOS, CRM, POS and marketing tools', '$1,000 Best Price Guarantee'])])}
        ${comp('Các bước', 'Số tròn, tiêu đề đậm + 1 dòng giải thích', [B.steps([['Sign your agreement', 'Review your details and e-sign.'], ['Pay the start-up fee ($100)', 'One time, by card.']])])}
        ${comp('Lưu ý', 'Một điều quan trọng, vạch cam trái', [B.note('There is a <b>$100</b> one-time start-up fee. It is not refundable.')])}
        ${comp('Người liên hệ', 'Recruiter / team', [B.person('Your recruiter', 'Alex Sample', 'Recruiter, Loan Factory', '(555) 010-0100', 'alex.sample@example.test')])}
        ${comp('Chữ ký + chân thư', 'Giống nhau ở mọi email', [B.signature(window.MAILKIT_SAMPLE.sender), B.footer('You are getting this email because you started joining Loan Factory as a Loan Officer.')])}
      </div></section>
      <section class="kit-sec"><h2>Trước / sau từng email</h2>
        <div class="kit-pick"><label class="f-sel">Email: <select id="kitSel">${emails.map((x) => `<option value="${x.id}"${x.id === r.id ? ' selected' : ''}>${esc(display(x).n)}</option>`).join('')}</select></label>
          <div class="seg" role="group"><button data-kdev="desktop" aria-pressed="${kitDev === 'desktop'}">Desktop</button><button data-kdev="mobile" aria-pressed="${kitDev === 'mobile'}">Mobile</button></div>
          <span class="td-dim">Chủ đề: ${esc(fillText(r.subject || ''))}</span></div>
        <div class="kit-ba ${kitDev}"><div><div class="kit-ba-t">Hiện tại (đang gửi)</div><iframe sandbox title="Current" srcdoc="${cur}"></iframe></div><div><div class="kit-ba-t">Mới (theo quy chuẩn)</div><iframe sandbox title="New" srcdoc="${nw}"></iframe></div></div>
      </section>`;
    $('#kitSel').onchange = (e) => { kitPick = e.target.value; renderKit(); };
    document.querySelectorAll('[data-kdev]').forEach((b) => (b.onclick = () => { kitDev = b.dataset.kdev; renderKit(); }));
  }
  function renderNotes() { $('#rvNotes').innerHTML = NOTES[screen] || ''; const u = $('#rvUrl'); if (u) u.textContent = urlText(); }
  function go(v) {
    screen = v; closeLayer(); closeMenu();
    if (v === 'writer' && role !== 'recruiter') { role = 'recruiter'; $('#avatar').textContent = 'QR'; document.querySelectorAll('#rvRole button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.r === 'recruiter'))); }
    document.querySelectorAll('#rvView button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    $('#frameWrap').hidden = v === 'before'; $('#beforeView').hidden = v !== 'before';
    $('#kitView').hidden = v !== 'kit'; if (v === 'kit') { $('#frameWrap').hidden = true; renderKit(); renderNotes(); try { history.replaceState(null, '', '#kit'); } catch (e) { /* no hash */ } return; }
    if (v === 'before') { $('#beforeView').innerHTML = (window.BEFORE || []).map((src, i) => `<img src="${src}" alt="Màn cũ ${i + 1}">`).join(''); renderNotes(); return; }
    S = { ...DEF, view: v === 'cards' ? 'cards' : 'table', status: v === 'review' ? 'IN_REVIEW' : v === 'writer' ? 'DRAFT' : 'ALL' };
    renderMain(); renderNotes();
    if (v === 'preview') openPreview(rows.find((r) => r.id === 'tpl-lo-invite') || rows.find((r) => r.body_format === 'HTML' && r.type === 'EMAIL'));
    if (v === 'edit') openEditor(rows.find((r) => r.name.startsWith('Nurture 4')));
    if (v === 'new') openEditor(null);
    if (v === 'review') { const r = rows.find((x) => x.status === 'IN_REVIEW'); if (r) openEditor(r); }
    if (v === 'writer') {
      // What the writer gets back: a returned draft with the reviewer's comments, plus the bell item.
      const id = (rows.find((x) => x.name === 'QA AA6 team 1012') || {}).id;
      const seed = [
        { field: 'general', quote: '', note: 'Add one clear next step at the end, like a link to book a call.', fixed: false, author: REVIEWER, when: '5 min ago' },
        { field: 'subject', quote: 'QA AA6 team subject', note: 'Make the subject say what the Loan Officer gets, for example "Your next step with Loan Factory".', fixed: false, author: REVIEWER, when: '5 min ago' },
        { field: 'body', quote: 'QA AA6 team draft', note: 'Use the real team name here, not the QA code.', fixed: false, author: REVIEWER, when: '5 min ago' },
      ];
      rows = rows.map((x) => (x.id === id ? { ...x, status: 'DRAFT', comments: seed, returnedBy: REVIEWER } : x));
      notes = [{ kind: 'return', name: 'QA AA6 team 1012', count: seed.length, first: seed[2] }, ...notes.filter((n) => n.name !== 'QA AA6 team 1012')];
      renderMain();
      const r = rows.find((x) => x.id === id); if (r) openEditor(r);
    }
    try { history.replaceState(null, '', '#' + v); } catch (e) { /* hash not available */ }
  }
  document.querySelectorAll('#rvView button').forEach((b) => (b.onclick = () => go(b.dataset.v)));
  document.querySelectorAll('#rvRole button').forEach((b) => (b.onclick = () => {
    role = b.dataset.r; $('#avatar').textContent = role === 'manager' ? 'QM' : 'QR';
    document.querySelectorAll('#rvRole button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    go(screen);
  }));
  document.querySelectorAll('#rvFrame button').forEach((b) => (b.onclick = () => {
    frame = b.dataset.f; $('#app').classList.toggle('phone', frame === 'phone');
    document.querySelectorAll('#rvFrame button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    go(screen);
  }));
  $('#rvRole button[data-r="manager"]').setAttribute('aria-pressed', 'true');
  $('#rvFrame button[data-f="desktop"]').setAttribute('aria-pressed', 'true');
  const startHash = (location.hash || '').replace('#', '');
  go(NOTES[startHash] ? startHash : 'list');
  window.addEventListener('hashchange', () => { const h = location.hash.replace('#', ''); if (NOTES[h] && h !== screen) go(h); });
})();
