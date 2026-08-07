/* Recruiter page — behaviour from the design canvas component. */
;(function () {
  /* ------------------------------------------------------------- steps --- */
  var STEPS = [
    ['01', 'Source and<br>register', 'Identify the loan officer, branch or team and register the candidate in the CRM and referral system.', false],
    ['02', 'First<br>conversation', 'Hold the initial conversation and, when helpful, give a one-to-one tour of Loan Factory and TERA.', false],
    ['03', 'Weekly<br>webinar', 'Register the prospect for the weekly Loan Factory webinar so they hear directly from leadership and can ask questions live.', true],
    ['04', 'Follow<br>up', 'Address concerns and help the candidate reach a decision.', false],
    ['05', 'Activation', 'Support the Onboarding team until the loan officer is fully active at Loan Factory.', false]
  ]

  var stepsHost = document.querySelector('[data-steps]')
  STEPS.forEach(function (s, i) {
    var last = i === STEPS.length - 1
    var li = document.createElement('li')
    li.setAttribute(
      'style',
      'display:grid;grid-template-columns:clamp(56px,8vw,120px) minmax(0,1fr) minmax(0,1.3fr);gap:clamp(14px,3vw,40px);align-items:baseline;padding:clamp(20px,3vw,32px) 0;border-bottom:' +
        (last ? '2px solid #272727' : '1px solid #eae5e0') +
        (s[3] ? ';background:#ffffff' : '')
    )
    li.innerHTML =
      '<span style="font-size:clamp(34px,6vw,68px);font-weight:900;letter-spacing:-.05em;line-height:.8;color:' +
      (s[3] ? '#f36f20' : '#e0dbd5') +
      '"></span>' +
      '<h3 style="margin:0;font-size:clamp(17px,2vw,24px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase;line-height:1.12">' +
      s[1] +
      '</h3>' +
      '<p style="margin:0;font-size:14px;line-height:1.75;color:#44403c;font-weight:500"></p>'
    li.children[0].textContent = s[0]
    li.children[2].textContent = s[2]
    stepsHost.appendChild(li)
  })

  /* --------------------------------------------------------- bonus table - */
  function scale(from, to) {
    var rows = []
    for (var u = from; u <= to; u += 12) {
      rows.push({
        units: u + '+',
        bonus: '$' + ((u / 12) * 1000).toLocaleString('en-US'),
        bg: (u / 12) % 2 === 0 ? '#faf9f8' : '#ffffff'
      })
    }
    return rows
  }

  var COL_A = scale(12, 180)
  var COL_B = scale(192, 360)
  var fullScale = window.innerWidth >= 760
  var tablesHost = document.querySelector('[data-tables]')
  var scaleBtn = document.querySelector('[data-scale]')

  function table(rows, caption) {
    var t = document.createElement('table')
    t.setAttribute('style', 'width:100%;border-collapse:collapse;background:#ffffff;font-variant-numeric:tabular-nums')
    t.innerHTML =
      '<caption style="width:1px;height:1px;overflow:hidden;display:block;clip:rect(0 0 0 0)">' +
      caption +
      '</caption><thead><tr>' +
      '<th scope="col" style="background:#272727;color:#ffffff;text-align:left;padding:16px 18px;font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;line-height:1.4">Referred production<br><span style="opacity:.6">(12 mo.)</span></th>' +
      '<th scope="col" style="background:#f36f20;color:#272727;text-align:right;padding:16px 18px;font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;line-height:1.4">Recruiter<br>one-time bonus</th>' +
      '</tr></thead>'
    var tbody = document.createElement('tbody')
    rows.forEach(function (r) {
      var tr = document.createElement('tr')
      tr.setAttribute('style', 'background:' + r.bg)
      tr.innerHTML =
        '<td style="padding:13px 18px;font-size:14px;font-weight:700;white-space:nowrap"></td>' +
        '<td style="padding:13px 18px;font-size:14.5px;font-weight:900;color:#C2591A;text-align:right;white-space:nowrap"></td>'
      tr.children[0].textContent = r.units
      tr.children[1].textContent = r.bonus
      tbody.appendChild(tr)
    })
    t.appendChild(tbody)
    return t
  }

  function renderTables() {
    tablesHost.textContent = ''
    tablesHost.appendChild(table(fullScale ? COL_A : COL_A.slice(0, 8), 'Recruiter bonus scale, 12 to 180 units'))
    tablesHost.appendChild(table(fullScale ? COL_B : COL_B.slice(0, 8), 'Recruiter bonus scale, 192 to 360 units'))
    scaleBtn.textContent = fullScale ? 'Show top of scale only' : 'Show full scale — all 30 steps'
    scaleBtn.setAttribute('aria-expanded', String(fullScale))
  }

  scaleBtn.addEventListener('click', function () {
    fullScale = !fullScale
    renderTables()
  })

  /* ------------------------------------------------------------ roster --- */
  var LEAD = [['Elena Vasquez', '1094412', '__IMG_LG_women-50__']]
  var RECRUITERS = [
    ['Marcus Trombley', '1276530', '__IMG_LG_men-60__'],
    ['Grace Adeyemi', '1611248', '__IMG_LG_women-72__'],
    ['Peter Salcedo', '1003977', '__IMG_LG_men-41__'],
    ['Nadia Farouk', '1745120', '__IMG_LG_women-12__'],
    ['Brett Kowalczyk', '1358804', '__IMG_LG_men-29__']
  ]

  function personCard(p, cardStyle, nameStyle, roleStyle, roleLabel) {
    var card = document.createElement('article')
    card.setAttribute('style', cardStyle)
    card.innerHTML =
      '<img alt="" aria-hidden="true" loading="lazy" width="230" height="230" src="' +
      p[2] +
      '" style="width:100%;height:230px;object-fit:cover;background:#f6f4f2" />' +
      '<div style="padding:18px 20px 20px">' +
      '<h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:-.01em;' + nameStyle + '"></h4>' +
      '<p style="margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#a8a29e"></p>' +
      '<p style="margin:12px 0 0;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;' + roleStyle + '"></p>' +
      '</div>'
    var body = card.lastChild
    body.children[0].textContent = p[0]
    body.children[1].textContent = 'NMLS ' + p[1]
    body.children[2].textContent = roleLabel
    return card
  }

  function groupHead(title, badge, badgeStyle) {
    var head = document.createElement('div')
    head.setAttribute('style', 'display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:18px')
    head.innerHTML =
      '<h3 style="margin:0;font-size:clamp(17px,2.2vw,24px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase"></h3>' +
      '<span style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;padding:5px 11px;' +
      badgeStyle +
      '"></span>'
    head.children[0].textContent = title
    head.children[1].textContent = badge
    return head
  }

  var rosterHost = document.querySelector('[data-roster]')
  var gridStyle = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px'

  var leadBlock = document.createElement('div')
  leadBlock.setAttribute('style', 'margin-bottom:40px')
  leadBlock.appendChild(groupHead('Recruiting Team Lead', 'Runs the team', 'color:#272727;background:#f36f20'))
  var leadGrid = document.createElement('div')
  leadGrid.setAttribute('style', gridStyle)
  LEAD.forEach(function (p) {
    leadGrid.appendChild(
      personCard(p, 'background:#272727;color:#f5f5f4;border-radius:24px;overflow:hidden', 'color:#ffffff', 'color:#f36f20', 'Recruiting Team Lead')
    )
  })
  leadBlock.appendChild(leadGrid)
  rosterHost.appendChild(leadBlock)

  var recBlock = document.createElement('div')
  recBlock.appendChild(groupHead('Producing Loan Officer Recruiters', '5 of 6 seats filled', 'color:#944924;background:#fff6f0'))
  var recGrid = document.createElement('div')
  recGrid.setAttribute('style', gridStyle)
  RECRUITERS.forEach(function (p) {
    recGrid.appendChild(
      personCard(p, 'background:#ffffff;border:1px solid #fbd8bd;border-radius:24px;overflow:hidden', '', 'color:#C2591A', 'Producing Loan Officer Recruiter')
    )
  })

  /* The open seat is a call to action, not a person. */
  var open = document.createElement('article')
  open.setAttribute(
    'style',
    'background:#faf9f8;border:1px dashed #d9d2ca;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px 22px;min-height:230px'
  )
  open.innerHTML =
    '<p style="margin:0;font-size:clamp(20px,2.6vw,26px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase;line-height:1.1">One seat<br>open</p>' +
    '<p style="margin:12px 0 18px;font-size:12.5px;line-height:1.65;color:#78716c;font-weight:500;max-width:26ch">Full-time, starts with the next recruiting month.</p>' +
    '<button type="button" data-when="public" data-open-modal class="h-cta-ink" style="border:0;background:#f36f20;color:#fff;padding:12px 22px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer">Sign in to register</button>' +
    '<button type="button" data-when="new submitted approved denied" data-open-modal class="h-cta-ink" style="border:0;background:#f36f20;color:#fff;padding:12px 22px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer">Register for this seat</button>'
  recGrid.appendChild(open)
  recBlock.appendChild(recGrid)
  rosterHost.appendChild(recBlock)

  /* ------------------------------------------------------------- modal --- */
  var modal = document.querySelector('[data-modal]')
  var stepSignIn = document.querySelector('[data-step-signin]')
  var stepForm = document.querySelector('[data-step-form]')
  var stepSuccess = document.querySelector('[data-step-success]')
  var role = document.querySelector('[data-role]')
  var roleErr = document.querySelector('[data-role-err]')
  var avail = document.querySelector('[data-avail]')
  var phone = document.querySelector('[data-phone]')
  var phoneErr = document.querySelector('[data-phone-err]')
  var exp = document.querySelector('[data-exp]')
  var expHint = document.querySelector('[data-exp-hint]')
  var why = document.querySelector('[data-why]')
  var whyErr = document.querySelector('[data-why-err]')
  var errBox = document.querySelector('[data-err-box]')
  var errText = document.querySelector('[data-err-text]')
  var spinner = document.querySelector('[data-spinner]')
  var submitBtn = document.querySelector('[data-submit]')
  var submitLabel = document.querySelector('[data-submit-label]')
  var teamLead = null
  var touched = false
  var lastFocus = null
  var timer = null

  function renderTl() {
    var wrap = document.querySelector('[data-tl]')
    wrap.textContent = ''
    ;[['Yes', true], ['No', false]].forEach(function (o) {
      var on = teamLead === o[1]
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'h-pill'
      b.setAttribute('aria-pressed', String(on))
      b.setAttribute(
        'style',
        'flex:1;padding:13px 0;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;border:1.5px solid ' +
          (on ? '#f36f20' : '#e0dbd5') +
          ';background:' +
          (on ? '#fff6f0' : '#ffffff') +
          ';color:' +
          (on ? '#944924' : '#272727')
      )
      b.textContent = o[0]
      b.addEventListener('click', function () {
        teamLead = o[1]
        renderTl()
        document.querySelector('[data-tl-note]').hidden = teamLead !== true
      })
      wrap.appendChild(b)
    })
  }

  function errors() {
    var e = []
    if (!role.value) e.push('role')
    if (phone.value.replace(/[^0-9]/g, '').length < 10) e.push('phone')
    if (exp.value.trim().length < 40) e.push('exp')
    if (why.value.trim().length < 30) e.push('why')
    return e
  }

  function paintErrors() {
    var e = touched ? errors() : []
    var has = function (k) {
      return e.indexOf(k) > -1
    }
    roleErr.hidden = !has('role')
    role.style.borderColor = has('role') ? '#fa5252' : '#e0dbd5'
    phoneErr.hidden = !has('phone')
    phone.style.borderColor = has('phone') ? '#fa5252' : '#e0dbd5'
    exp.style.borderColor = has('exp') ? '#fa5252' : '#e0dbd5'
    whyErr.hidden = !has('why')
    why.style.borderColor = has('why') ? '#fa5252' : '#e0dbd5'

    var len = exp.value.trim().length
    expHint.textContent = has('exp')
      ? 'A little more, please — ' + len + ' of 40 characters minimum.'
      : len + ' characters. A few lines is plenty.'
    expHint.style.color = has('exp') ? '#b02525' : '#a8a29e'

    errBox.hidden = e.length === 0
    errText.textContent =
      e.length + (e.length === 1 ? ' field needs attention before you can submit.' : ' fields need attention before you can submit.')
  }

  function showStep(which) {
    stepSignIn.hidden = which !== 'signin'
    stepForm.hidden = which !== 'form'
    stepSuccess.hidden = which !== 'success'
  }

  function openModal() {
    lastFocus = document.activeElement
    touched = false
    paintErrors()
    showStep(document.body.getAttribute('data-view') === 'public' ? 'signin' : 'form')
    modal.hidden = false
    document.body.style.overflow = 'hidden'
    var close = modal.querySelector('[data-step-signin]:not([hidden]) [data-close-modal], [data-step-form]:not([hidden]) [data-close-modal]')
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
    submitBtn.style.background = '#f36f20'
    submitLabel.textContent = 'Submit registration'
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }

  function wireModalTriggers() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-modal]'), function (b) {
      if (b.dataset.wired) return
      b.dataset.wired = '1'
      b.addEventListener('click', openModal)
    })
  }
  wireModalTriggers()

  Array.prototype.forEach.call(document.querySelectorAll('[data-close-modal]'), function (b) {
    b.addEventListener('click', closeModal)
  })
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal()
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal()
  })

  document.querySelector('[data-signin]').addEventListener('click', function () {
    window.setView('new')
    showStep('form')
  })

  ;[role, phone, exp, why].forEach(function (el) {
    el.addEventListener('input', function () {
      if (touched) paintErrors()
    })
    el.addEventListener('change', function () {
      if (touched) paintErrors()
    })
  })

  submitBtn.addEventListener('click', function () {
    touched = true
    paintErrors()
    if (errors().length) return
    submitBtn.disabled = true
    submitBtn.style.background = '#944924'
    spinner.hidden = false
    submitLabel.textContent = 'Submitting…'
    timer = setTimeout(function () {
      timer = null
      spinner.hidden = true
      submitBtn.disabled = false
      submitBtn.style.background = '#f36f20'
      submitLabel.textContent = 'Submit registration'
      document.querySelector('[data-success-avail]').textContent = avail.value
      document.querySelector('[data-success-tl]').textContent =
        teamLead === true ? 'Yes' : teamLead === false ? 'No' : 'Not stated'
      showStep('success')
    }, 1500)
  })

  Array.prototype.forEach.call(document.querySelectorAll('[data-finish]'), function (b) {
    b.addEventListener('click', function () {
      closeModal()
      window.setView('submitted')
    })
  })

  renderTables()
  renderTl()
  paintErrors()

  window.onViewChange = function (view) {
    var label = document.querySelector('[data-register-label]')
    label.textContent =
      view === 'approved'
        ? 'Update your details'
        : view === 'denied'
          ? 'Reapply for a seat'
          : view === 'submitted'
            ? 'Update your registration'
            : 'Register for a seat'
  }
})()
