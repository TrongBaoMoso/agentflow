/* Admin console behaviour — one program per page (CEO: no combined "All" view).

   The host page sets window.ADMIN_PROGRAM ('ambassador' | 'recruiter') and this
   script scopes everything to it. Everything below is client-side against
   window.APPLICANTS so the mockup demonstrates the real interactions — search,
   filter, sort, promote/demote, approve/decline, bulk actions, drawer —
   without a backend. */

;(() => {
  const PROG = window.ADMIN_PROGRAM === 'recruiter' ? 'recruiter' : 'ambassador'
  const DATA = (window.APPLICANTS || []).filter((r) => r.program === PROG).map((r) => ({ ...r }))
  const TODAY = new Date('2026-08-07T00:00:00')
  const PAGE_SIZE = 10

  /* Level naming differs per program, so keep it in one place. */
  const TIERS = {
    ambassador: { 1: 'Level 1', 2: 'Level 2', 3: 'Senior', max: 3 },
    recruiter: { 1: 'Recruiter', 2: 'Team Lead', max: 2 }
  }
  const BUDGET = { 1: 0, 2: 500, 3: 1000 }

  const tierLabel = (r) => TIERS[r.program][r.tier] || '—'
  const tierMax = (r) => TIERS[r.program].max

  const state = { prog: PROG, q: '', status: '', tier: '', age: '', sort: 'submitted', dir: -1, page: 1 }
  const picked = new Set()

  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]

  const fmtDate = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

  const daysAgo = (iso) => Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000)

  /* --------------------------------------------------------------- data -- */

  const inProgram = (r) => r.program === state.prog

  const visible = () => {
    const q = state.q.trim().toLowerCase()
    return DATA.filter((r) => {
      if (!inProgram(r)) return false
      if (state.status && r.status !== state.status) return false
      if (state.tier && String(r.tier) !== state.tier) return false
      if (state.age && daysAgo(r.submitted) > Number(state.age)) return false
      if (q) {
        const hay = `${r.name} ${r.nmls} ${r.email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => {
      const k = state.sort
      let av = a[k]
      let bv = b[k]
      if (k === 'tier') {
        av = `${a.program}${a.tier}`
        bv = `${b.program}${b.tier}`
      }
      if (av == null) av = ''
      if (bv == null) bv = ''
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * state.dir
      return String(av).localeCompare(String(bv)) * state.dir
    })
  }

  /* ---------------------------------------------------------------- kpis -- */

  const renderKpis = () => {
    const rows = DATA.filter(inProgram)
    const by = (s) => rows.filter((r) => r.status === s).length
    const pending = rows.filter((r) => r.status === 'pending')
    const oldest = pending.length ? Math.max(...pending.map((r) => daysAgo(r.submitted))) : 0

    const last30 = rows.filter((r) => daysAgo(r.submitted) <= 30).length

    $('[data-kpi="pending"]').textContent = pending.length
    $('[data-kpi-note="pending"]').innerHTML = pending.length
      ? `Oldest open <b>${oldest} days</b>`
      : 'Queue is clear'
    $('[data-kpi="approved"]').textContent = by('approved')
    $('[data-kpi-note="approved"]').innerHTML = `<b>+${last30}</b> registered in 30 days`
    $('[data-kpi="declined"]').textContent = by('declined')
    $('[data-kpi="total"]').textContent = rows.length

    // Budget KPI exists on the ambassador page only.
    const budgetEl = $('[data-kpi="budget"]')
    if (budgetEl) {
      const budget = rows
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + (BUDGET[r.tier] || 0), 0)
      budgetEl.textContent = '$' + budget.toLocaleString('en-US')
    }
  }

  /* -------------------------------------------------------------- charts -- */

  const renderSpark = () => {
    const svg = $('[data-spark]')
    const W = 640
    const H = 148
    const pad = 22
    const weeks = 12

    // Bucket by week index counting back from today.
    const buckets = Array.from({ length: weeks }, () => ({ ambassador: 0, recruiter: 0 }))
    DATA.filter(inProgram).forEach((r) => {
      const w = Math.floor(daysAgo(r.submitted) / 7)
      if (w < weeks) buckets[weeks - 1 - w][r.program] += 1
    })

    const max = Math.max(1, ...buckets.map((b) => b.ambassador + b.recruiter))
    const bw = (W - pad) / weeks
    const barW = bw * 0.56
    const plotH = H - pad

    let out = ''
    // baseline
    out += `<line class="spark__grid" x1="0" y1="${plotH}" x2="${W}" y2="${plotH}" />`

    buckets.forEach((b, i) => {
      const x = pad + i * bw + (bw - barW) / 2 - pad / 2
      const total = b.ambassador + b.recruiter
      const hAmb = (b.ambassador / max) * (plotH - 8)
      const hRec = (b.recruiter / max) * (plotH - 8)
      const yRec = plotH - hRec
      const yAmb = yRec - hAmb

      out += `<g><title>${weeks - i} weeks ago — ${total} registration${total === 1 ? '' : 's'}</title>`
      if (hRec > 0) {
        out += `<rect class="spark__bar spark__bar--rec" x="${x}" y="${yRec}" width="${barW}" height="${hRec}" rx="3" />`
      }
      if (hAmb > 0) {
        out += `<rect class="spark__bar spark__bar--amb" x="${x}" y="${yAmb}" width="${barW}" height="${hAmb}" rx="3" />`
      }
      if (i % 3 === 0 || i === weeks - 1) {
        const label = i === weeks - 1 ? 'NOW' : `-${weeks - 1 - i}W`
        out += `<text class="spark__axis" x="${x + barW / 2}" y="${H - 5}" text-anchor="middle">${label}</text>`
      }
      out += '</g>'
    })

    svg.innerHTML = out

    // Each page keeps only its own legend line.
    const legendEl = $(`[data-legend="${PROG}"]`)
    if (legendEl) legendEl.textContent = DATA.filter(inProgram).length
  }

  const renderDist = () => {
    const box = $('[data-dist]')
    const approved = DATA.filter((r) => inProgram(r) && r.status === 'approved')
    const total = approved.length || 1

    let groups
    if (state.prog === 'recruiter') {
      groups = [
        { name: 'Team Lead', n: approved.filter((r) => r.tier === 2).length, cls: 'bar__fill--3' },
        { name: 'Recruiter', n: approved.filter((r) => r.tier === 1).length, cls: '' }
      ]
      $('[data-dist-title]').textContent = 'Role distribution'
    } else {
      groups = [
        { name: 'Senior Ambassador · $1,000/mo', n: approved.filter((r) => r.tier === 3).length, cls: 'bar__fill--3' },
        { name: 'Ambassador · $500/mo', n: approved.filter((r) => r.tier === 2).length, cls: 'bar__fill--2' },
        { name: 'General Participation · $0', n: approved.filter((r) => r.tier === 1).length, cls: 'bar__fill--muted' }
      ]
      $('[data-dist-title]').textContent = 'Level distribution'
    }

    box.innerHTML = groups
      .map(
        (g) => `<div>
          <div class="bar__top">
            <span class="bar__name">${g.name}</span>
            <span class="bar__pct">${Math.round((g.n / total) * 100)}%</span>
            <span class="bar__n">${g.n}</span>
          </div>
          <div class="bar__track">
            <span class="bar__fill ${g.cls}" style="width: ${(g.n / total) * 100}%"></span>
          </div>
        </div>`
      )
      .join('')
  }

  /* --------------------------------------------------------- tier filter -- */

  const renderTierFilter = () => {
    const sel = $('[data-f-tier]')
    const prev = state.tier
    let opts = '<option value="">All levels</option>'
    if (state.prog === 'recruiter') {
      opts += '<option value="2">Team Lead</option><option value="1">Recruiter</option>'
    } else {
      opts += '<option value="3">Senior</option><option value="2">Level 2</option><option value="1">Level 1</option>'
    }
    sel.innerHTML = opts
    sel.value = [...sel.options].some((o) => o.value === prev) ? prev : ''
    state.tier = sel.value
  }

  /* --------------------------------------------------------------- table -- */

  const chip = (s) =>
    `<span class="chip chip--${s === 'approved' ? 'ok' : s === 'pending' ? 'pending' : 'no'}">${
      s[0].toUpperCase() + s.slice(1)
    }</span>`

  const renderTable = () => {
    const all = visible()
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
    if (state.page > pages) state.page = pages
    const start = (state.page - 1) * PAGE_SIZE
    const rows = all.slice(start, start + PAGE_SIZE)

    $('[data-count]').innerHTML = `<b>${all.length}</b> shown`
    $('[data-noresults]').hidden = all.length !== 0

    $('[data-rows]').innerHTML = rows
      .map(
        (r) => `<tr data-id="${r.id}" class="${picked.has(r.id) ? 'is-picked' : ''}">
        <td><input type="checkbox" class="chk" data-pick="${r.id}" ${picked.has(r.id) ? 'checked' : ''} aria-label="Select ${r.name}" /></td>
        <td>
          <span class="who">
            <img src="${r.avatar}" alt="" width="34" height="34" loading="lazy" />
            <span>
              <span class="who__name">${r.name}</span>
              <span class="who__mail">${r.email}</span>
            </span>
          </span>
        </td>
        <td class="num">${r.nmls}</td>
        <td>
          <span class="lvl">
            <button class="lvl__step" data-down="${r.id}" ${r.tier <= 1 ? 'disabled' : ''} aria-label="Move down a level">−</button>
            <span class="badge badge--l${r.tier}" style="min-width: 84px; justify-content: center">${tierLabel(r)}</span>
            <button class="lvl__step" data-up="${r.id}" ${r.tier >= tierMax(r) ? 'disabled' : ''} aria-label="Move up a level">+</button>
          </span>
        </td>
        <td class="num">${r.connections.toLocaleString('en-US')}</td>
        <td class="num">${r.units == null ? '—' : r.units}</td>
        <td class="num">${fmtDate(r.submitted)}</td>
        <td class="stick">
          <span class="acts">
            ${chip(r.status)}
            ${
              r.status === 'pending'
                ? `<button class="mini mini--go" data-approve="${r.id}">Approve</button>
                   <button class="mini mini--no" data-decline="${r.id}">Decline</button>`
                : `<button class="mini mini--no" data-open="${r.id}">View</button>`
            }
          </span>
        </td>
      </tr>`
      )
      .join('')

    $('[data-range]').textContent = all.length
      ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, all.length)} of ${all.length}`
      : ''

    const pager = $('[data-pager]')
    let p = `<button ${state.page === 1 ? 'disabled' : ''} data-page="${state.page - 1}">Prev</button>`
    for (let i = 1; i <= pages; i += 1) {
      p += `<button data-page="${i}" ${i === state.page ? 'aria-current="true"' : ''}>${i}</button>`
    }
    p += `<button ${state.page === pages ? 'disabled' : ''} data-page="${state.page + 1}">Next</button>`
    pager.innerHTML = p

    const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id))
    $('[data-check-all]').checked = allPicked
    renderBulk()
  }

  const renderBulk = () => {
    const bar = $('[data-bulk]')
    bar.classList.toggle('is-on', picked.size > 0)
    $('[data-bulk-n]').textContent = picked.size
  }

  const renderAll = () => {
    renderKpis()
    renderSpark()
    renderDist()
    renderTable()
  }

  /* -------------------------------------------------------------- drawer -- */

  const drawer = $('[data-drawer]')
  let openId = null

  const openDrawer = (id) => {
    const r = DATA.find((x) => x.id === id)
    if (!r) return
    openId = id
    $('[data-dr-avatar]').src = r.avatar
    $('[data-dr-name]').textContent = r.name
    $('[data-dr-mail]').textContent = r.email

    $('[data-dr-dl]').innerHTML = `
      <div><dt>Applied for</dt><dd>${tierLabel(r)}</dd></div>
      <div><dt>Status</dt><dd>${chip(r.status)}</dd></div>
      <div><dt>NMLS</dt><dd>${r.nmls}</dd></div>
      <div><dt>Connections</dt><dd>${r.connections.toLocaleString('en-US')}</dd></div>
      ${r.units == null ? '' : `<div><dt>Verified 12-mo units</dt><dd>${r.units}</dd></div>`}
      <div><dt>Submitted</dt><dd>${fmtDate(r.submitted)}</dd></div>
      <div><dt>Open for</dt><dd>${daysAgo(r.submitted)} days</dd></div>`

    $('[data-dr-social]').innerHTML = `
      <div><dt>LinkedIn</dt><dd>${r.linkedin}</dd></div>
      <div><dt>Facebook</dt><dd>Not on file</dd></div>
      <div><dt>Instagram</dt><dd>Not on file</dd></div>`

    $('[data-dr-time]').innerHTML = `
      <div><i></i><span>Application submitted<time>${fmtDate(r.submitted)}</time></span></div>
      <div><i></i><span>Profile pulled from ALLY<time>${fmtDate(r.submitted)}</time></span></div>
      ${
        r.status === 'pending'
          ? '<div><i></i><span>Awaiting a decision<time>Now</time></span></div>'
          : `<div><i style="background: var(--orange)"></i><span>${
              r.status === 'approved' ? 'Approved' : 'Declined'
            } by the program team<time>${fmtDate(r.submitted)}</time></span></div>`
      }`

    drawer.classList.add('is-open')
    document.body.style.overflow = 'hidden'
  }

  const closeDrawer = () => {
    drawer.classList.remove('is-open')
    document.body.style.overflow = ''
    openId = null
  }

  const setStatus = (id, status) => {
    const r = DATA.find((x) => x.id === id)
    if (r) r.status = status
  }

  /* --------------------------------------------------------------- wiring -- */

  $('[data-q]').addEventListener('input', (e) => {
    state.q = e.target.value
    state.page = 1
    renderTable()
  })

  $('[data-f-status]').addEventListener('change', (e) => {
    state.status = e.target.value
    state.page = 1
    renderTable()
  })

  $('[data-f-tier]').addEventListener('change', (e) => {
    state.tier = e.target.value
    state.page = 1
    renderTable()
  })

  $('[data-f-age]').addEventListener('change', (e) => {
    state.age = e.target.value
    state.page = 1
    renderTable()
  })

  $('[data-reset]').addEventListener('click', () => {
    state.q = ''
    state.status = ''
    state.tier = ''
    state.age = ''
    state.page = 1
    $('[data-q]').value = ''
    $('[data-f-status]').value = ''
    $('[data-f-tier]').value = ''
    $('[data-f-age]').value = ''
    renderTable()
  })

  $$('.atable th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort
      if (state.sort === key) {
        state.dir *= -1
      } else {
        state.sort = key
        state.dir = 1
      }
      $$('.atable th[data-sort]').forEach((o) => o.removeAttribute('aria-sort'))
      th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending')
      renderTable()
    })
  })

  $('[data-check-all]').addEventListener('change', (e) => {
    const ids = visible()
      .slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)
      .map((r) => r.id)
    ids.forEach((id) => (e.target.checked ? picked.add(id) : picked.delete(id)))
    renderTable()
  })

  /* One delegated handler for everything inside the table. */
  $('[data-rows]').addEventListener('click', (e) => {
    const el = e.target.closest('[data-pick],[data-approve],[data-decline],[data-open],[data-up],[data-down]')
    if (!el) {
      const tr = e.target.closest('tr[data-id]')
      if (tr) openDrawer(tr.dataset.id)
      return
    }
    e.stopPropagation()
    const d = el.dataset

    if (d.pick) {
      picked.has(d.pick) ? picked.delete(d.pick) : picked.add(d.pick)
      renderTable()
    } else if (d.approve) {
      setStatus(d.approve, 'approved')
      renderAll()
    } else if (d.decline) {
      setStatus(d.decline, 'declined')
      renderAll()
    } else if (d.open) {
      openDrawer(d.open)
    } else if (d.up || d.down) {
      const id = d.up || d.down
      const r = DATA.find((x) => x.id === id)
      if (r) r.tier = Math.min(tierMax(r), Math.max(1, r.tier + (d.up ? 1 : -1)))
      renderAll()
    }
  })

  $('[data-pager]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]')
    if (!btn) return
    state.page = Number(btn.dataset.page)
    renderTable()
  })

  $('[data-bulk-approve]').addEventListener('click', () => {
    picked.forEach((id) => setStatus(id, 'approved'))
    picked.clear()
    renderAll()
  })

  $('[data-bulk-decline]').addEventListener('click', () => {
    picked.forEach((id) => setStatus(id, 'declined'))
    picked.clear()
    renderAll()
  })

  $('[data-bulk-clear]').addEventListener('click', () => {
    picked.clear()
    renderTable()
  })

  $$('[data-drawer-close]').forEach((el) => el.addEventListener('click', closeDrawer))

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer()
  })

  $('[data-dr-approve]').addEventListener('click', () => {
    if (openId) setStatus(openId, 'approved')
    closeDrawer()
    renderAll()
  })

  $('[data-dr-decline]').addEventListener('click', () => {
    if (openId) setStatus(openId, 'declined')
    closeDrawer()
    renderAll()
  })

  renderTierFilter()
  renderAll()
})()
