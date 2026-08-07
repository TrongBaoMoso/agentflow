/* Program admin console — behaviour from the design canvas component.
   Row order in APPS: id, name, nmls, program, level, role, metric, date,
   day-of-month, status, photo. */
;(function () {
  var APPS = [
    ['a1', 'Erika Solano', '1655902', 'Ambassador', 3, 'Senior loan officer', '3,200 connections', 'Aug 6, 2026', 6, 'pending', '__IMG_SM_women-31__'],
    ['a2', 'Colin Mbeki', '1490338', 'Ambassador', 2, 'Loan officer', '1,450 connections', 'Aug 5, 2026', 5, 'pending', '__IMG_SM_men-36__'],
    ['a3', 'Bethany Cruz', '1788412', 'Ambassador', 1, 'Loan officer', '380 connections', 'Aug 5, 2026', 5, 'approved', '__IMG_SM_women-57__'],
    ['a4', 'Jordan Alvarez', '1102547', 'Ambassador', 2, 'Loan officer', '1,400 connections', 'Jul 28, 2026', 28, 'pending', '__IMG_SM_men-22__'],
    ['a5', 'Priya Raghunathan', '1592004', 'Ambassador', 3, 'Team Leader', '2,600 connections', 'Jul 21, 2026', 21, 'approved', '__IMG_SM_women-44__'],
    ['a6', 'Grant Whitlock', '1377265', 'Ambassador', 2, 'Loan officer', '610 connections', 'Jul 18, 2026', 18, 'rejected', '__IMG_SM_men-64__'],
    ['a7', 'Marisol Ibarra', '1284471', 'Ambassador', 3, 'Senior loan officer', '4,100 connections', 'Jul 9, 2026', 9, 'approved', '__IMG_SM_women-65__'],
    ['a8', 'Dwayne Okafor', '1109238', 'Ambassador', 2, 'Loan officer', '1,900 connections', 'Jul 2, 2026', 2, 'approved', '__IMG_SM_men-86__'],
    ['a9', 'Tom Beaulieu', '998341', 'Ambassador', 1, 'Operations / support', '240 connections', 'Jun 26, 2026', 26, 'approved', '__IMG_SM_men-12__'],
    ['a10', 'Yuki Tanabe', '1655117', 'Ambassador', 2, 'Loan officer', '1,180 connections', 'Jun 19, 2026', 19, 'approved', '__IMG_SM_women-26__'],
    ['a11', 'Aaron Whitfield', '1447290', 'Ambassador', 1, 'Loan officer', '520 connections', 'Jun 11, 2026', 11, 'approved', '__IMG_SM_men-45__'],
    ['a12', 'Hannah Kirkpatrick', '1812340', 'Ambassador', 1, 'Loan officer', '460 connections', 'Jun 4, 2026', 4, 'approved', '__IMG_SM_women-33__'],
    ['a13', 'Denise Achebe', '1720559', 'Ambassador', 1, 'Corporate Coach', '870 connections', 'May 22, 2026', 22, 'approved', '__IMG_SM_women-90__'],
    ['a14', 'Rafael Duarte', '1508822', 'Ambassador', 3, 'Team Leader', '2,300 connections', 'May 8, 2026', 8, 'approved', '__IMG_SM_men-76__'],
    ['a15', 'Sean Kilbride', '1466701', 'Ambassador', 2, 'Loan officer', '540 connections', 'Apr 30, 2026', 30, 'rejected', '__IMG_SM_men-51__'],
    ['r1', 'Devon Attah', '1520744', 'Recruiter', null, 'Senior loan officer', '64 own units · full-time', 'Aug 6, 2026', 6, 'pending', '__IMG_SM_men-47__'],
    ['r2', 'Alina Petrova', '1699281', 'Recruiter', null, 'Team Leader', '92 own units · full-time', 'Aug 5, 2026', 5, 'pending', '__IMG_SM_women-19__'],
    ['r3', 'Grace Adeyemi', '1611248', 'Recruiter', null, 'Senior loan officer', '58 own units · full-time', 'Jul 24, 2026', 24, 'approved', '__IMG_SM_women-72__'],
    ['r4', 'Peter Salcedo', '1003977', 'Recruiter', null, 'Loan officer', '41 own units · full-time', 'Jul 15, 2026', 15, 'approved', '__IMG_SM_men-41__'],
    ['r5', 'Roy Bergstrom', '1288610', 'Recruiter', null, 'Loan officer', '18 own units · part-time', 'Jul 6, 2026', 6, 'rejected', '__IMG_SM_men-29__'],
    ['r6', 'Elena Vasquez', '1094412', 'Recruiter', null, 'Team Leader', '110 own units · full-time', 'Jun 15, 2026', 15, 'approved', '__IMG_SM_women-50__'],
    ['r7', 'Nadia Farouk', '1745120', 'Recruiter', null, 'Loan officer', '47 own units · full-time', 'Jun 2, 2026', 2, 'approved', '__IMG_SM_women-12__'],
    ['r8', 'Marcus Trombley', '1276530', 'Recruiter', null, 'Senior loan officer', '73 own units · full-time', 'May 12, 2026', 12, 'approved', '__IMG_SM_men-60__']
  ]

  var MONTHS = [['Mar', 2, 1], ['Apr', 3, 1], ['May', 4, 2], ['Jun', 6, 3], ['Jul', 7, 4], ['Aug', 5, 2]]
  var ORDER = { Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8 }

  var STB = { pending: '#fff6dd', approved: '#e9f8ee', rejected: '#f6f4f2' }
  var STC = { pending: '#8a6100', approved: '#1f6b33', rejected: '#57534e' }
  var STL = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved' }

  /* Decisions and level moves are the prototype's own state. */
  var statuses = {}
  var levels = {}
  var selected = {}
  var state = { tab: 'All', status: 'All', level: 'All', sort: 'newest', q: '' }

  var statusOf = function (a) {
    return statuses[a[0]] || a[9]
  }
  var levelOf = function (a) {
    return levels[a[0]] || a[4]
  }

  /* ------------------------------------------------------- program tabs -- */
  function renderTabs() {
    var host = document.querySelector('[data-tabs]')
    host.textContent = ''
    ;[['All', 'All programs'], ['Ambassador', 'Ambassador'], ['Recruiter', 'Recruiter']].forEach(function (t) {
      var on = state.tab === t[0]
      var b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-selected', String(on))
      b.setAttribute(
        'style',
        'border:0;padding:11px 20px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;background:' +
          (on ? '#272727' : 'transparent') +
          ';color:' +
          (on ? '#ffffff' : '#78716c')
      )
      b.textContent = t[1]
      b.addEventListener('click', function () {
        state.tab = t[0]
        render()
      })
      host.appendChild(b)
    })
  }

  /* ---------------------------------------------------------------- kpis - */
  function renderKpis(scope) {
    var cnt = function (st) {
      return scope.filter(function (a) {
        return statusOf(a) === st
      }).length
    }
    var decided = cnt('approved') + cnt('rejected')
    var host = document.querySelector('[data-kpis]')
    host.textContent = ''

    var total = document.createElement('div')
    total.setAttribute('style', 'background:#272727;color:#ffffff;border-radius:20px;padding:20px 22px')
    total.innerHTML =
      '<div style="font-size:clamp(30px,3.4vw,40px);font-weight:900;letter-spacing:-.04em;line-height:1"></div>' +
      '<div style="font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#a8a29e;margin-top:8px"></div>'
    total.children[0].textContent = String(scope.length)
    total.children[1].textContent =
      'Registrations · ' + (state.tab === 'All' ? 'both programs' : state.tab === 'Ambassador' ? 'Ambassador' : 'Recruiter')
    host.appendChild(total)

    /* The pending card is a filter shortcut in the canvas, so it stays a button. */
    var pending = document.createElement('button')
    pending.type = 'button'
    pending.className = 'h-kpi'
    pending.setAttribute('style', 'text-align:left;border:0;background:#f36f20;color:#272727;border-radius:20px;padding:20px 22px;cursor:pointer')
    pending.innerHTML =
      '<div style="font-size:clamp(30px,3.4vw,40px);font-weight:900;letter-spacing:-.04em;line-height:1"></div>' +
      '<div style="font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-top:8px;opacity:.8">Awaiting decision →</div>'
    pending.children[0].textContent = String(cnt('pending'))
    pending.addEventListener('click', function () {
      state.status = 'pending'
      render()
    })
    host.appendChild(pending)

    ;[
      [String(cnt('approved')), 'Approved', 'color:#1f6b33'],
      [String(cnt('rejected')), 'Not approved', 'color:#57534e'],
      [decided ? Math.round((cnt('approved') / decided) * 100) + '%' : '—', 'Approval rate', ''],
      [state.tab === 'Recruiter' ? '6' : '4', 'Median days to decide', '']
    ].forEach(function (k) {
      var box = document.createElement('div')
      box.setAttribute('style', 'background:#ffffff;border:1px solid #eae5e0;border-radius:20px;padding:20px 22px')
      box.innerHTML =
        '<div style="font-size:clamp(30px,3.4vw,40px);font-weight:900;letter-spacing:-.04em;line-height:1;' + k[2] + '"></div>' +
        '<div style="font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#a8a29e;margin-top:8px"></div>'
      box.children[0].textContent = k[0]
      box.children[1].textContent = k[1]
      host.appendChild(box)
    })
  }

  /* -------------------------------------------------------------- charts - */
  function renderMonths() {
    var host = document.querySelector('[data-months]')
    host.textContent = ''
    MONTHS.forEach(function (m) {
      var total = m[1] + m[2]
      var col = document.createElement('div')
      col.setAttribute('style', 'display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:6px')
      col.innerHTML =
        '<span style="font-size:11px;font-weight:800;text-align:center;color:#272727"></span>' +
        '<div style="display:flex;flex-direction:column;justify-content:flex-end;gap:3px;height:' +
        Math.round((total / 10) * 140) +
        'px">' +
        '<div style="background:#f36f20;border-radius:6px 6px 0 0;height:' + Math.round((m[1] / total) * 100) + '%"></div>' +
        '<div style="background:#272727;border-radius:0 0 6px 6px;height:' + Math.round((m[2] / total) * 100) + '%"></div>' +
        '</div>' +
        '<span style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:center;color:#a8a29e"></span>'
      col.children[0].textContent = String(total)
      col.children[2].textContent = m[0]
      col.setAttribute('title', m[0] + ': ' + m[1] + ' Ambassador, ' + m[2] + ' Recruiter')
      host.appendChild(col)
    })
  }

  function renderLevels() {
    var approvedAmb = APPS.filter(function (a) {
      return a[3] === 'Ambassador' && statusOf(a) === 'approved'
    })
    var byLevel = function (n) {
      return approvedAmb.filter(function (a) {
        return levelOf(a) === n
      }).length
    }
    var max = Math.max(1, byLevel(1), byLevel(2), byLevel(3))
    ;[1, 2, 3].forEach(function (n) {
      document.querySelector('[data-lvl' + n + ']').textContent = String(byLevel(n))
      document.querySelector('[data-lvl' + n + 'w]').style.width = Math.round((byLevel(n) / max) * 100) + '%'
    })
    document.querySelector('[data-seats]').textContent = String(
      APPS.filter(function (a) {
        return a[3] === 'Recruiter' && statusOf(a) === 'approved'
      }).length
    )
    document.querySelector('[data-budget]').textContent =
      '$' + (byLevel(2) * 500 + byLevel(3) * 1000).toLocaleString('en-US') + ' / mo'
  }

  /* -------------------------------------------------------- status pills - */
  function renderStatusPills() {
    var host = document.querySelector('[data-status]')
    host.textContent = ''
    ;[
      ['All', 'All', '#272727', '#ffffff'],
      ['pending', 'Pending', '#f36f20', '#272727'],
      ['approved', 'Approved', '#1f6b33', '#ffffff'],
      ['rejected', 'Not approved', '#57534e', '#ffffff']
    ].forEach(function (s) {
      var on = state.status === s[0]
      var b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('aria-pressed', String(on))
      b.setAttribute(
        'style',
        'border:0;padding:9px 15px;border-radius:999px;font-size:12px;font-weight:800;cursor:pointer;background:' +
          (on ? s[2] : 'transparent') +
          ';color:' +
          (on ? s[3] : '#78716c')
      )
      b.textContent = s[1]
      b.addEventListener('click', function () {
        state.status = s[0]
        render()
      })
      host.appendChild(b)
    })
  }

  /* ---------------------------------------------------------------- rows - */
  function pillButton(label, style, cls, onClick) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = cls
    b.setAttribute('style', style)
    b.textContent = label
    b.addEventListener('click', onClick)
    return b
  }

  function renderRows(list, scopeLen) {
    var tbody = document.querySelector('[data-rows]')
    tbody.textContent = ''

    list.forEach(function (a) {
      var id = a[0]
      var st = statusOf(a)
      var lv = levelOf(a)
      var isAmb = a[3] === 'Ambassador'
      var tr = document.createElement('tr')
      tr.className = 'h-row'
      tr.setAttribute('style', 'background:' + (selected[id] ? '#fffaf6' : '#ffffff'))

      var cell = function (style) {
        var td = document.createElement('td')
        td.setAttribute('style', 'border-top:1px solid #f1eeeb;' + style)
        tr.appendChild(td)
        return td
      }

      /* select */
      var tdSel = cell('padding:14px 10px 14px 22px;vertical-align:middle')
      var box = document.createElement('input')
      box.type = 'checkbox'
      box.checked = !!selected[id]
      box.setAttribute('aria-label', 'Select ' + a[1])
      box.setAttribute('style', 'accent-color:#f36f20;width:16px;height:16px;cursor:pointer')
      /* Ticking a box only repaints the row and the bulk bar. A full re-render
         would rebuild the tbody and throw away keyboard focus mid-selection. */
      box.addEventListener('change', function () {
        selected[id] = box.checked
        tr.style.background = box.checked ? '#fffaf6' : '#ffffff'
        renderBulk()
      })
      tdSel.appendChild(box)

      /* applicant */
      var tdWho = cell('padding:12px 14px')
      tdWho.innerHTML =
        '<span style="display:flex;align-items:center;gap:12px">' +
        '<img alt="" aria-hidden="true" loading="lazy" width="40" height="40" src="' + a[10] +
        '" style="width:40px;height:40px;border-radius:999px;flex:none;background:#f6f4f2;object-fit:cover" />' +
        '<span style="display:flex;flex-direction:column;gap:3px">' +
        '<span style="font-size:13.5px;font-weight:800;letter-spacing:-.01em"></span>' +
        '<span style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a8a29e"></span>' +
        '</span></span>'
      var who = tdWho.firstChild.lastChild
      who.children[0].textContent = a[1]
      who.children[1].textContent = 'NMLS ' + a[2] + ' · ' + a[5]

      /* program */
      cell('padding:12px 14px;font-size:12.5px;font-weight:700;color:#57534e;white-space:nowrap').textContent =
        isAmb ? 'Ambassador' : 'Recruiter seat'

      /* level / seat */
      var tdLvl = cell('padding:12px 14px;white-space:nowrap')
      var wrap = document.createElement('span')
      wrap.setAttribute('style', 'display:flex;align-items:center;gap:7px')
      var badge = document.createElement('span')
      badge.setAttribute(
        'style',
        'font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:5px 10px;color:' +
          (isAmb ? (lv === 3 ? '#272727' : lv === 2 ? '#944924' : '#57534e') : '#57534e') +
          ';background:' +
          (isAmb ? (lv === 3 ? '#f36f20' : lv === 2 ? '#fff6f0' : '#f6f4f2') : '#f6f4f2')
      )
      badge.textContent = isAmb ? (lv === 3 ? 'Level 3 · Senior' : 'Level ' + lv) : 'Recruiter seat'
      wrap.appendChild(badge)
      if (isAmb) {
        var stepStyle =
          'border:1px solid #e0dbd5;background:#ffffff;color:#57534e;width:24px;height:24px;border-radius:999px;font-size:12px;font-weight:900;cursor:pointer;line-height:1'
        var down = pillButton('↓', stepStyle, 'h-step', function () {
          levels[id] = Math.max(1, lv - 1)
          render()
        })
        down.setAttribute('aria-label', 'Move ' + a[1] + ' down a level')
        down.disabled = lv <= 1
        var up = pillButton('↑', stepStyle, 'h-step', function () {
          levels[id] = Math.min(3, lv + 1)
          render()
        })
        up.setAttribute('aria-label', 'Move ' + a[1] + ' up a level')
        up.disabled = lv >= 3
        wrap.appendChild(down)
        wrap.appendChild(up)
      }
      tdLvl.appendChild(wrap)

      /* metric, date */
      cell('padding:12px 14px;font-size:12.5px;font-weight:700;color:#57534e;white-space:nowrap').textContent = a[6]
      cell('padding:12px 14px;font-size:12.5px;font-weight:600;color:#78716c;white-space:nowrap').textContent = a[7]

      /* status */
      var tdSt = cell('padding:12px 14px;white-space:nowrap')
      var chip = document.createElement('span')
      chip.setAttribute(
        'style',
        'font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:5px 11px;color:' +
          STC[st] +
          ';background:' +
          STB[st]
      )
      chip.textContent = STL[st]
      tdSt.appendChild(chip)

      /* decision */
      var tdAct = cell('padding:12px 22px 12px 14px;text-align:right;white-space:nowrap')
      var acts = document.createElement('span')
      acts.setAttribute('style', 'display:inline-flex;gap:6px;justify-content:flex-end')
      var actStyle = function (on, bg, fg) {
        return (
          'border:0;padding:8px 14px;border-radius:999px;font-size:11.5px;font-weight:800;cursor:pointer;background:' +
          (on ? bg : '#f1efec') +
          ';color:' +
          (on ? fg : '#57534e')
        )
      }
      acts.appendChild(
        pillButton('Approve', actStyle(st === 'approved', '#1f6b33', '#ffffff'), 'h-green', function () {
          statuses[id] = 'approved'
          render()
        })
      )
      acts.appendChild(
        pillButton('Pending', actStyle(st === 'pending', '#f36f20', '#272727'), 'h-orange', function () {
          statuses[id] = 'pending'
          render()
        })
      )
      acts.appendChild(
        pillButton('Reject', actStyle(st === 'rejected', '#57534e', '#ffffff'), 'h-slate', function () {
          statuses[id] = 'rejected'
          render()
        })
      )
      tdAct.appendChild(acts)

      tbody.appendChild(tr)
    })

    document.querySelector('[data-empty]').hidden = list.length > 0
    document.querySelector('[data-shown]').textContent =
      list.length === scopeLen ? list.length + ' registrations' : list.length + ' of ' + scopeLen + ' shown'
  }

  /* --------------------------------------------------------------- bulk -- */
  function renderBulk() {
    var ids = Object.keys(selected).filter(function (k) {
      return selected[k]
    })
    document.querySelector('[data-bulk]').hidden = ids.length === 0
    document.querySelector('[data-selected-label]').textContent =
      ids.length === 1 ? '1 registration selected' : ids.length + ' registrations selected'
    return ids
  }

  /* ------------------------------------------------------------- render -- */
  function render() {
    var scope =
      state.tab === 'All'
        ? APPS
        : APPS.filter(function (a) {
            return a[3] === state.tab
          })

    var q = state.q.trim().toLowerCase()
    var list = scope.filter(function (a) {
      if (state.status !== 'All' && statusOf(a) !== state.status) return false
      if (state.level === 'Recruiter' && a[3] !== 'Recruiter') return false
      if (state.level !== 'All' && state.level !== 'Recruiter') {
        if (a[3] !== 'Ambassador' || levelOf(a) !== Number(state.level)) return false
      }
      if (q && a[1].toLowerCase().indexOf(q) === -1 && a[2].indexOf(q) === -1) return false
      return true
    })

    var idx = function (a) {
      return ORDER[a[7].slice(0, 3)] * 100 + a[8]
    }
    if (state.sort === 'newest') list.sort(function (x, y) { return idx(y) - idx(x) })
    if (state.sort === 'oldest') list.sort(function (x, y) { return idx(x) - idx(y) })
    if (state.sort === 'name') list.sort(function (x, y) { return x[1].localeCompare(y[1]) })

    renderTabs()
    renderKpis(scope)
    renderStatusPills()
    renderLevels()
    renderRows(list, scope.length)
    renderBulk()
  }

  /* -------------------------------------------------------------- wiring - */
  var q = document.querySelector('[data-q]')
  q.addEventListener('input', function () {
    state.q = q.value
    render()
  })
  var levelSel = document.querySelector('[data-level]')
  levelSel.addEventListener('change', function () {
    state.level = levelSel.value
    render()
  })
  var sortSel = document.querySelector('[data-sort]')
  sortSel.addEventListener('change', function () {
    state.sort = sortSel.value
    render()
  })
  document.querySelector('[data-clear]').addEventListener('click', function () {
    state = { tab: 'All', status: 'All', level: 'All', sort: state.sort, q: '' }
    q.value = ''
    levelSel.value = 'All'
    render()
  })

  function bulkSet(value) {
    Object.keys(selected).forEach(function (k) {
      if (selected[k]) statuses[k] = value
    })
    selected = {}
    render()
  }
  document.querySelector('[data-bulk-approve]').addEventListener('click', function () {
    bulkSet('approved')
  })
  document.querySelector('[data-bulk-reject]').addEventListener('click', function () {
    bulkSet('rejected')
  })
  document.querySelector('[data-bulk-clear]').addEventListener('click', function () {
    selected = {}
    render()
  })

  renderMonths()
  render()
})()
