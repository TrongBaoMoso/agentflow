/* Recruiter page — behaviour translated from the design canvas component. */
;(function () {
  var REC = [
    { name: 'Chase Bardwell', nmls: '1211964', photo: '__IMG_men-41__' },
    { name: 'Nadia Reyes-Kim', nmls: '1489330', photo: '__IMG_women-21__' },
    { name: 'Wes Turnbull', nmls: '1052287', photo: '__IMG_men-64__' },
    { name: 'Imani Fletcher', nmls: '1637701', photo: '__IMG_women-79__' },
    { name: 'Doug Halverson', nmls: '1178452', photo: '__IMG_men-8__' },
    { name: 'Renata Okafor', nmls: '1725118', photo: '__IMG_women-47__' }
  ]

  var STEPS = [
    ['1', 'Source and register', 'Identify the Loan Officer, branch or team and register the candidate in the CRM and referral system.'],
    ['2', 'First conversation', 'Hold the initial conversation and, when helpful, give a one-to-one tour of Loan Factory and TERA.'],
    ['3', 'Webinar', 'Register the prospect for the weekly Loan Factory webinar so they hear directly from leadership and can ask questions live.'],
    ['4', 'Follow up', 'Address concerns and help the candidate reach a decision.'],
    ['5', 'Activation', 'Support the Onboarding team until the Loan Officer is fully active at Loan Factory.']
  ]

  /* ---------------------------------------------------------------- steps -- */
  var stepsHost = document.querySelector('[data-steps]')
  STEPS.forEach(function (s, i) {
    var li = document.createElement('li')
    li.setAttribute(
      'style',
      'display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:22px 0;border-top:1px solid #45454e'
    )
    li.innerHTML =
      '<div style="display:flex;gap:clamp(14px,3vw,40px);align-items:baseline;flex-wrap:wrap">' +
      '<span style="font-size:clamp(34px,5vw,62px);font-weight:800;letter-spacing:-0.05em;line-height:0.9;color:' +
      (i === STEPS.length - 1 ? '#f36f20' : '#63636d') +
      ';min-width:2ch"></span>' +
      '<h3 style="margin:0;font-size:clamp(20px,2.6vw,30px);font-weight:800;letter-spacing:-0.02em;text-transform:uppercase;flex:0 0 auto"></h3>' +
      '<p style="margin:0;flex:1 1 320px;min-width:0;font-size:15px;line-height:1.65;color:#c9c9d1;max-width:60ch"></p></div>'
    var row = li.firstChild
    row.children[0].textContent = s[0]
    row.children[1].textContent = s[1]
    row.children[2].textContent = s[2]
    stepsHost.appendChild(li)
  })

  /* ---------------------------------------------------------- bonus table -- */
  var ROWS = []
  for (var i = 1; i <= 30; i++) {
    ROWS.push({ units: i * 12 + '+', bonus: '$' + (i * 1000).toLocaleString('en-US') })
  }
  var left = ROWS.slice(0, 15)
  var right = ROWS.slice(15)
  var fullScale = false
  var tablesHost = document.querySelector('[data-tables]')
  var scaleBtn = document.querySelector('[data-scale]')

  function renderTables() {
    var sets = fullScale
      ? [['12 to 180 units', left], ['192 to 360 units', right]]
      : [['12 to 108 units', left.slice(0, 9)], ['192 to 288 units', right.slice(0, 9)]]

    tablesHost.textContent = ''
    sets.forEach(function (set) {
      var wrap = document.createElement('div')
      wrap.setAttribute('style', 'overflow-x:auto;max-width:100%')
      var table = document.createElement('table')
      table.setAttribute('style', 'width:100%;border-collapse:collapse;min-width:280px')
      var caption = document.createElement('caption')
      caption.setAttribute(
        'style',
        'text-align:left;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#8b8a92;padding-bottom:8px'
      )
      caption.textContent = set[0]
      table.appendChild(caption)
      table.insertAdjacentHTML(
        'beforeend',
        '<thead><tr>' +
          '<th scope="col" style="background:#272727;color:#faf9f8;text-align:left;padding:14px 16px;border-radius:16px 0 0 0;font-size:11.5px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase">Referred Loan Officer production (12 mo.)</th>' +
          '<th scope="col" style="background:#f36f20;color:#272727;text-align:right;padding:14px 16px;border-radius:0 16px 0 0;font-size:11.5px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase">Recruiter one-time bonus</th>' +
          '</tr></thead>'
      )
      var tbody = document.createElement('tbody')
      set[1].forEach(function (r, idx) {
        var tr = document.createElement('tr')
        tr.setAttribute('style', 'background:' + (idx % 2 === 0 ? '#ffffff' : '#faf9f8'))
        tr.innerHTML =
          '<td style="padding:11px 14px;font-size:15px;font-weight:700;border-bottom:1px solid #ececf0;white-space:nowrap"></td>' +
          '<td style="padding:11px 14px;font-size:15px;font-weight:800;color:#f36f20;text-align:right;border-bottom:1px solid #ececf0;white-space:nowrap"></td>'
        tr.children[0].textContent = r.units
        tr.children[1].textContent = r.bonus
        tbody.appendChild(tr)
      })
      table.appendChild(tbody)
      wrap.appendChild(table)
      tablesHost.appendChild(wrap)
    })
  }

  scaleBtn.addEventListener('click', function () {
    fullScale = !fullScale
    scaleBtn.textContent = fullScale ? 'Show the short scale' : 'Show full scale · 30 tiers'
    scaleBtn.setAttribute('aria-expanded', String(fullScale))
    renderTables()
  })

  /* --------------------------------------------------------------- roster -- */
  function renderRoster() {
    var host = document.querySelector('[data-roster]')
    var zero = document.querySelector('[data-zero]')
    var count = document.querySelector('[data-count-label]')
    host.textContent = ''

    if (!REC.length) {
      zero.hidden = false
      count.textContent = 'No recruiters approved yet'
      return
    }
    count.textContent = REC.length + ' recruiters'

    REC.forEach(function (a) {
      var card = document.createElement('article')
      card.className = 'h-card'
      card.setAttribute(
        'style',
        'border:1px solid #eaeaee;background:#ffffff;border-radius:22px;padding:20px;display:flex;gap:16px;align-items:center;transition:box-shadow 0.15s ease,border-color 0.15s ease'
      )
      card.innerHTML =
        '<img alt="" aria-hidden="true" loading="lazy" width="96" height="96" src="' +
        a.photo +
        '" style="width:96px;height:96px;flex:0 0 96px;border-radius:50%;background-color:#eceaf1;object-fit:cover" />' +
        '<div style="min-width:0;flex:1">' +
        '<h3 style="margin:0;font-size:17px;font-weight:800;letter-spacing:-0.01em"></h3>' +
        '<div style="font-size:12.5px;color:#8b8a92;font-weight:600;margin-top:3px"></div>' +
        '<div style="margin-top:9px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span style="font-size:10.5px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:5px 11px;border-radius:999px;background:#f2f2f5;color:#5c5b63;border:1px solid #e4e4e9">Recruiter</span>' +
        '</div></div>'
      var body = card.lastChild
      body.children[0].textContent = a.name
      body.children[1].textContent = 'NMLS ' + a.nmls
      host.appendChild(card)
    })
  }

  /* ---------------------------------------------------------------- modal -- */
  var modal = document.querySelector('[data-modal]')
  var form = document.querySelector('[data-modal-form]')
  var success = document.querySelector('[data-modal-success]')
  var title = document.querySelector('[data-modal-title]')
  var role = document.querySelector('[data-role]')
  var roleErr = document.querySelector('[data-role-err]')
  var why = document.querySelector('[data-why]')
  var whyErr = document.querySelector('[data-why-err]')
  var errBox = document.querySelector('[data-err-summary]')
  var errText = document.querySelector('[data-err-text]')
  var spinner = document.querySelector('[data-spinner]')
  var submitBtn = document.querySelector('[data-submit]')
  var submitLabel = document.querySelector('[data-submit-label]')
  var lastFocus = null
  var timer = null

  var chosenAvail = 'Full-time'
  var chosenLead = 'Yes'

  function choiceStyle(active) {
    return active
      ? 'background:#fff3e9;color:#272727;border:1px solid #f36f20'
      : 'background:#ffffff;color:#3d3c44;border:1px solid #d9d9de'
  }

  function renderChoices() {
    var availHost = document.querySelector('[data-avail]')
    availHost.textContent = ''
    ;[
      ['Full-time', 'Recruiting is the primary role'],
      ['Part-time', 'Alongside an active pipeline']
    ].forEach(function (o) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'h-border-orange'
      b.setAttribute('aria-pressed', String(chosenAvail === o[0]))
      b.setAttribute(
        'style',
        'text-align:left;padding:13px 14px;cursor:pointer;border-radius:18px;' + choiceStyle(chosenAvail === o[0])
      )
      b.innerHTML =
        '<span style="display:block;font-size:13px;font-weight:800"></span>' +
        '<span style="display:block;font-size:11.5px;margin-top:3px;opacity:0.75"></span>'
      b.children[0].textContent = o[0]
      b.children[1].textContent = o[1]
      b.addEventListener('click', function () {
        chosenAvail = o[0]
        renderChoices()
      })
      availHost.appendChild(b)
    })

    var leadHost = document.querySelector('[data-lead]')
    leadHost.textContent = ''
    ;['Yes', 'No'].forEach(function (label) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'h-border-orange'
      b.setAttribute('aria-pressed', String(chosenLead === label))
      b.setAttribute(
        'style',
        'padding:13px 28px;font-size:13px;font-weight:800;cursor:pointer;border-radius:999px;' +
          choiceStyle(chosenLead === label)
      )
      b.textContent = label
      b.addEventListener('click', function () {
        chosenLead = label
        renderChoices()
      })
      leadHost.appendChild(b)
    })
  }

  function clearErrors() {
    roleErr.hidden = true
    whyErr.hidden = true
    errBox.hidden = true
    role.style.borderColor = '#d9d9de'
    why.style.borderColor = '#d9d9de'
  }

  function openModal() {
    lastFocus = document.activeElement
    clearErrors()
    success.hidden = true
    form.hidden = false
    title.textContent = "Tell us how you'd bring producers over"
    modal.hidden = false
    document.body.style.overflow = 'hidden'
    var close = modal.querySelector('[data-close-modal]')
    if (close) close.focus()
  }

  function closeModal() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    modal.hidden = true
    document.body.style.overflow = ''
    spinner.hidden = true
    submitBtn.disabled = false
    submitLabel.textContent = 'Submit application'
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-open-modal]'), function (b) {
    b.addEventListener('click', openModal)
  })
  Array.prototype.forEach.call(document.querySelectorAll('[data-close-modal]'), function (b) {
    b.addEventListener('click', closeModal)
  })
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal()
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal()
  })

  submitBtn.addEventListener('click', function () {
    clearErrors()
    var bad = 0
    if (!role.value.trim()) {
      roleErr.hidden = false
      role.style.borderColor = '#fa5252'
      bad++
    }
    if (!why.value.trim()) {
      whyErr.hidden = false
      why.style.borderColor = '#fa5252'
      bad++
    }
    if (bad) {
      errText.textContent =
        bad === 1 ? 'One field still needs your attention.' : 'Two fields still need your attention.'
      errBox.hidden = false
      return
    }
    submitBtn.disabled = true
    spinner.hidden = false
    submitLabel.textContent = 'Submitting…'
    timer = setTimeout(function () {
      timer = null
      spinner.hidden = true
      submitBtn.disabled = false
      submitLabel.textContent = 'Submit application'
      form.hidden = true
      success.hidden = false
      title.textContent = "Thanks — it's in"
    }, 1400)
  })

  document.querySelector('[data-finish]').addEventListener('click', function () {
    closeModal()
    window.setView('submitted')
  })

  renderTables()
  renderRoster()
  renderChoices()
})()
