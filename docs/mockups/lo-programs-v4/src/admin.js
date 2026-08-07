/* Admin console — behaviour translated from the design canvas component.
   The canvas carried this section inside both programme pages; here it is its
   own file so the version switcher keeps working across v1…v4, and so the
   photo set is complete (each canvas file only had faces for its own
   programme, leaving the other half of the table grey). */
;(function () {
  var PEOPLE = [
    { name: 'Priya Nandakumar', nmls: '1339410', photo: '__IMG_women-26__', email: 'priya.n@loanfactory.com', program: 'Ambassador', level: 2, date: 'Aug 6, 2026', status: 'Pending' },
    { name: 'Chase Bardwell', nmls: '1211964', photo: '__IMG_men-41__', email: 'chase.b@loanfactory.com', program: 'Recruiter', level: 0, date: 'Aug 6, 2026', status: 'Pending' },
    { name: 'Grant Peterson', nmls: '1444019', photo: '__IMG_men-19__', email: 'grant.p@loanfactory.com', program: 'Ambassador', level: 1, date: 'Aug 5, 2026', status: 'Approved' },
    { name: 'Renata Okafor', nmls: '1725118', photo: '__IMG_women-47__', email: 'renata.o@loanfactory.com', program: 'Recruiter', level: 0, date: 'Aug 5, 2026', status: 'Approved' },
    { name: 'Dana Whitfield', nmls: '1187342', photo: '__IMG_women-44__', email: 'dana.w@loanfactory.com', program: 'Ambassador', level: 3, date: 'Aug 4, 2026', status: 'Pending' },
    { name: 'Kevin Duong', nmls: '1755602', photo: '__IMG_men-75__', email: 'kevin.d@loanfactory.com', program: 'Ambassador', level: 2, date: 'Aug 3, 2026', status: 'Approved' },
    { name: 'Imani Fletcher', nmls: '1637701', photo: '__IMG_women-79__', email: 'imani.f@loanfactory.com', program: 'Recruiter', level: 0, date: 'Aug 3, 2026', status: 'Pending' },
    { name: 'Sofia Marchetti', nmls: '1580931', photo: '__IMG_women-90__', email: 'sofia.m@loanfactory.com', program: 'Ambassador', level: 3, date: 'Aug 1, 2026', status: 'Rejected' },
    { name: 'Doug Halverson', nmls: '1178452', photo: '__IMG_men-8__', email: 'doug.h@loanfactory.com', program: 'Recruiter', level: 0, date: 'Jul 30, 2026', status: 'Rejected' },
    { name: 'Bianca Lopresti', nmls: '1622055', photo: '__IMG_women-12__', email: 'bianca.l@loanfactory.com', program: 'Ambassador', level: 2, date: 'Jul 29, 2026', status: 'Approved' },
    { name: 'Wes Turnbull', nmls: '1052287', photo: '__IMG_men-64__', email: 'wes.t@loanfactory.com', program: 'Recruiter', level: 0, date: 'Jul 28, 2026', status: 'Approved' },
    { name: 'Darnell Hobbs', nmls: '1361204', photo: '__IMG_men-86__', email: 'darnell.h@loanfactory.com', program: 'Ambassador', level: 1, date: 'Jul 27, 2026', status: 'Pending' }
  ]

  /* Decisions taken in the console live here, so filtering and re-rendering
     never lose them — the canvas component kept the same override map. */
  var overrides = {}
  var filters = { program: 'All', q: '', status: 'All', level: 'All' }

  var CHIP = {
    Pending: { bg: '#fff4e0', fg: '#8a5a00' },
    Approved: { bg: '#e7f8ec', fg: '#1f7a35' },
    Rejected: { bg: '#fdecec', fg: '#b02a2a' }
  }

  function merged() {
    return PEOPLE.map(function (p) {
      var o = overrides[p.nmls] || {}
      return {
        name: p.name,
        nmls: p.nmls,
        photo: p.photo,
        email: p.email,
        program: p.program,
        date: p.date,
        level: typeof o.level === 'number' ? o.level : p.level,
        status: o.status || p.status
      }
    })
  }

  /* ------------------------------------------------------------- headline -- */
  function renderStats(all) {
    var pending = all.filter(function (p) { return p.status === 'Pending' }).length
    var approved = all.filter(function (p) { return p.status === 'Approved' }).length
    var rejected = all.filter(function (p) { return p.status === 'Rejected' }).length

    var stats = [
      ['Total registrations', String(all.length + 45), 'since launch', '#ffffff', '#272727'],
      ['Pending review', String(pending), 'oldest 6 days', '#fff6ef', '#f36f20'],
      ['Approved', String(approved + 22), 'active in programs', '#ffffff', '#272727'],
      ['Rejected', String(rejected + 15), 'reapply window open', '#ffffff', '#272727'],
      ['Avg decision time', '4.2d', 'target 5 days', '#ffffff', '#272727'],
      ['Budget committed', '$14.5k', 'of $20k monthly cap', '#ffffff', '#272727']
    ]

    var host = document.querySelector('[data-stats]')
    host.textContent = ''
    stats.forEach(function (s) {
      var box = document.createElement('div')
      box.setAttribute('style', 'border:1px solid #eaeaee;border-radius:20px;padding:18px;background:' + s[3])
      box.innerHTML =
        '<div style="font-size:10.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8b8a92"></div>' +
        '<div style="font-size:32px;font-weight:800;letter-spacing:-0.035em;margin-top:6px;color:' + s[4] + '"></div>' +
        '<div style="font-size:12px;color:#8b8a92;margin-top:2px"></div>'
      box.children[0].textContent = s[0]
      box.children[1].textContent = s[1]
      box.children[2].textContent = s[2]
      host.appendChild(box)
    })
    return pending
  }

  /* ------------------------------------------------------------ programmes -- */
  function renderPrograms() {
    var host = document.querySelector('[data-programs]')
    host.textContent = ''
    ;[['All', 'All programs'], ['Ambassador', 'Ambassador'], ['Recruiter', 'Recruiter']].forEach(function (p) {
      var active = filters.program === p[0]
      var b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-selected', String(active))
      b.setAttribute(
        'style',
        'padding:9px 16px;border:none;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;white-space:nowrap;background:' +
          (active ? '#272727' : 'transparent') +
          ';color:' +
          (active ? '#faf9f8' : '#5c5b63')
      )
      b.textContent = p[1]
      b.addEventListener('click', function () {
        filters.program = p[0]
        render()
      })
      host.appendChild(b)
    })
  }

  /* ----------------------------------------------------------------- rows -- */
  function decisionButton(label, cls, style, onClick) {
    var b = document.createElement('button')
    b.type = 'button'
    b.className = cls
    b.setAttribute('style', style)
    b.textContent = label
    b.addEventListener('click', onClick)
    return b
  }

  function renderRows(all) {
    var q = filters.q.trim().toLowerCase()
    var rows = all.filter(function (p) {
      return (
        (filters.program === 'All' || p.program === filters.program) &&
        (filters.status === 'All' || p.status === filters.status) &&
        (filters.level === 'All' || String(p.level) === filters.level) &&
        (!q || p.name.toLowerCase().indexOf(q) > -1 || p.nmls.indexOf(q) > -1)
      )
    })

    var tbody = document.querySelector('[data-rows]')
    tbody.textContent = ''

    rows.forEach(function (p) {
      var chip = CHIP[p.status]
      var tr = document.createElement('tr')
      tr.className = 'h-row'
      tr.setAttribute('style', 'border-top:1px solid #eaeaee')

      /* applicant */
      var tdWho = document.createElement('td')
      tdWho.setAttribute('style', 'padding:14px 16px')
      tdWho.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px">' +
        '<img alt="" aria-hidden="true" loading="lazy" width="40" height="40" src="' + p.photo +
        '" style="width:40px;height:40px;border-radius:50%;flex:0 0 40px;background-color:#eceaf1;object-fit:cover" />' +
        '<div style="min-width:0">' +
        '<div style="font-size:14px;font-weight:800;white-space:nowrap"></div>' +
        '<div style="font-size:12px;color:#8b8a92"></div>' +
        '</div></div>'
      var who = tdWho.firstChild.lastChild
      who.children[0].textContent = p.name
      who.children[1].textContent = 'NMLS ' + p.nmls + ' · ' + p.email
      tr.appendChild(tdWho)

      /* programme */
      var tdProg = document.createElement('td')
      tdProg.setAttribute('style', 'padding:14px 16px;font-size:13px;color:#3d3c44;white-space:nowrap')
      tdProg.textContent = p.program
      tr.appendChild(tdProg)

      /* level stepper */
      var tdLevel = document.createElement('td')
      tdLevel.setAttribute('style', 'padding:14px 16px')
      var stepper = document.createElement('div')
      stepper.setAttribute('style', 'display:flex;align-items:center;gap:8px')
      var noLevel = p.level === 0
      var down = decisionButton(
        '−',
        'h-down',
        'width:26px;height:26px;border:1px solid #d9d9de;background:#fff;border-radius:50%;font-size:14px;line-height:1;cursor:pointer;color:#5c5b63',
        function () {
          if (p.level > 1) setOverride(p.nmls, { level: p.level - 1 })
        }
      )
      down.disabled = noLevel || p.level <= 1
      down.setAttribute('aria-label', 'Lower level for ' + p.name)
      var label = document.createElement('span')
      label.setAttribute('style', 'font-size:12.5px;font-weight:800;min-width:74px;text-align:center;white-space:nowrap')
      label.textContent = noLevel ? '—' : 'Level ' + p.level
      var up = decisionButton(
        '+',
        'h-up',
        'width:26px;height:26px;border:1px solid #d9d9de;background:#fff;border-radius:50%;font-size:14px;line-height:1;cursor:pointer;color:#5c5b63',
        function () {
          if (p.level > 0 && p.level < 3) setOverride(p.nmls, { level: p.level + 1 })
        }
      )
      up.disabled = noLevel || p.level >= 3
      up.setAttribute('aria-label', 'Raise level for ' + p.name)
      stepper.appendChild(down)
      stepper.appendChild(label)
      stepper.appendChild(up)
      tdLevel.appendChild(stepper)
      tr.appendChild(tdLevel)

      /* submitted */
      var tdDate = document.createElement('td')
      tdDate.setAttribute('style', 'padding:14px 16px;font-size:13px;color:#8b8a92;white-space:nowrap')
      tdDate.textContent = p.date
      tr.appendChild(tdDate)

      /* status */
      var tdStatus = document.createElement('td')
      tdStatus.setAttribute('style', 'padding:14px 16px')
      var badge = document.createElement('span')
      badge.setAttribute(
        'style',
        'font-size:10.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:5px 11px;border-radius:999px;white-space:nowrap;background:' +
          chip.bg +
          ';color:' +
          chip.fg
      )
      badge.textContent = p.status
      tdStatus.appendChild(badge)
      tr.appendChild(tdStatus)

      /* decision */
      var tdAct = document.createElement('td')
      tdAct.setAttribute('style', 'padding:14px 16px')
      var acts = document.createElement('div')
      acts.setAttribute('style', 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap')
      acts.appendChild(
        decisionButton(
          'Approve',
          'h-approve',
          'padding:8px 16px;border:1px solid #40C057;font-size:12px;font-weight:800;border-radius:999px;cursor:pointer;white-space:nowrap;background:' +
            (p.status === 'Approved' ? '#40C057' : '#ffffff') +
            ';color:' +
            (p.status === 'Approved' ? '#ffffff' : '#1f7a35'),
          function () {
            setOverride(p.nmls, { status: 'Approved' })
          }
        )
      )
      acts.appendChild(
        decisionButton(
          'Reject',
          'h-reject',
          'padding:8px 16px;border:1px solid #e4e4e9;font-size:12px;font-weight:800;border-radius:999px;cursor:pointer;white-space:nowrap;background:' +
            (p.status === 'Rejected' ? '#fa5252' : '#ffffff') +
            ';color:' +
            (p.status === 'Rejected' ? '#ffffff' : '#5c5b63'),
          function () {
            setOverride(p.nmls, { status: 'Rejected' })
          }
        )
      )
      acts.appendChild(
        decisionButton(
          'Hold',
          'h-hold',
          'padding:8px 12px;border:1px solid #e4e4e9;background:#fff;color:#8b8a92;font-size:12px;font-weight:800;border-radius:999px;cursor:pointer;white-space:nowrap',
          function () {
            setOverride(p.nmls, { status: 'Pending' })
          }
        )
      )
      tdAct.appendChild(acts)
      tr.appendChild(tdAct)

      tbody.appendChild(tr)
    })

    document.querySelector('[data-empty]').hidden = rows.length > 0
    document.querySelector('[data-count]').textContent =
      rows.length === all.length
        ? all.length + ' registrations'
        : rows.length + ' of ' + all.length + ' registrations'
  }

  /* ----------------------------------------------------------------- bars -- */
  function renderBars(selector, data) {
    var host = document.querySelector(selector)
    host.textContent = ''
    data.forEach(function (d) {
      var wrap = document.createElement('div')
      wrap.innerHTML =
        '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:6px">' +
        '<span></span><span style="color:#8b8a92"></span></div>' +
        '<div style="height:10px;background:#f2f2f5;border-radius:999px;overflow:hidden">' +
        '<div style="display:block;height:100%;width:' + d[2] + ';background:' + d[3] + ';border-radius:999px"></div></div>'
      wrap.firstChild.children[0].textContent = d[0]
      wrap.firstChild.children[1].textContent = d[1]
      host.appendChild(wrap)
    })
  }

  function setOverride(nmls, patch) {
    var cur = overrides[nmls] || {}
    if (typeof patch.status === 'string') cur.status = patch.status
    if (typeof patch.level === 'number') cur.level = patch.level
    overrides[nmls] = cur
    render()
  }

  function render() {
    var all = merged()
    var pending = renderStats(all)
    renderPrograms()
    renderRows(all)
    document.querySelector('[data-pending]').textContent = pending + ' awaiting a decision'
  }

  /* --------------------------------------------------------------- wiring -- */
  var q = document.querySelector('[data-q]')
  var fStatus = document.querySelector('[data-f-status]')
  var fLevel = document.querySelector('[data-f-level]')

  q.addEventListener('input', function () {
    filters.q = q.value
    render()
  })
  fStatus.addEventListener('change', function () {
    filters.status = fStatus.value
    render()
  })
  fLevel.addEventListener('change', function () {
    filters.level = fLevel.value
    render()
  })
  Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (b) {
    b.addEventListener('click', function () {
      filters = { program: 'All', q: '', status: 'All', level: 'All' }
      q.value = ''
      fStatus.value = 'All'
      fLevel.value = 'All'
      render()
    })
  })

  renderBars('[data-bars-levels]', [
    ['Level 1 — General participation', '16', '42%', '#ccccd3'],
    ['Level 2 — Ambassador', '15', '39%', '#f36f20'],
    ['Level 3 — Senior Ambassador', '7', '19%', '#272727']
  ])
  renderBars('[data-bars-recruiters]', [
    ['Seats filled', '3 of 5', '60%', '#f36f20'],
    ['Full-time applicants', '13', '68%', '#272727'],
    ['Team Lead track', '6', '32%', '#ccccd3']
  ])
  render()
})()
