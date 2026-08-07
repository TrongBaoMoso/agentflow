/* Ambassador page — behaviour from the design canvas component, rebuilt
   without the canvas runtime. Static sections live in the markup; only the
   directory, the level accordion and the registration modal are scripted. */
;(function () {
  /* --------------------------------------------------------- directory --- */
  var GROUPS = [
    {
      title: 'Senior Loan Officer Ambassadors',
      badge: 'Level 3 · up to $1,000/mo',
      badgeStyle: 'color:#272727;background:#f36f20',
      card: 'background:#272727;color:#f5f5f4;border-radius:24px;overflow:hidden',
      name: 'color:#ffffff',
      role: 'color:#f36f20',
      roleLabel: 'Senior Ambassador',
      people: [
        ['Marisol Ibarra', '1284471', '__IMG_LG_women-65__'],
        ['Priya Raghunathan', '1592004', '__IMG_LG_women-44__'],
        ['Samuel Ortiz', '1201984', '__IMG_LG_men-32__'],
        ['Rafael Duarte', '1508822', '__IMG_LG_men-76__']
      ]
    },
    {
      title: 'Loan Officer Ambassadors',
      badge: 'Level 2 · up to $500/mo',
      badgeStyle: 'color:#944924;background:#fff6f0',
      card: 'background:#ffffff;border:1px solid #fbd8bd;border-radius:24px;overflow:hidden',
      name: '',
      role: 'color:#C2591A',
      roleLabel: 'Level 2 Ambassador',
      people: [
        ['Dwayne Okafor', '1109238', '__IMG_LG_men-86__'],
        ['Carla Mendoza-Reyes', '1730865', '__IMG_LG_women-68__'],
        ['Yuki Tanabe', '1655117', '__IMG_LG_women-26__'],
        ['Victor Nguyen', '1339076', '__IMG_LG_men-54__']
      ]
    },
    {
      title: 'General Participation',
      badge: 'Level 1 · self-serve',
      badgeStyle: 'color:#78716c;background:#f6f4f2',
      card: 'background:#ffffff;border:1px solid #eae5e0;border-radius:24px;overflow:hidden',
      name: '',
      role: 'color:#78716c',
      roleLabel: 'Level 1 participant',
      people: [
        ['Tom Beaulieu', '998341', '__IMG_LG_men-12__'],
        ['Aaron Whitfield', '1447290', '__IMG_LG_men-45__'],
        ['Hannah Kirkpatrick', '1812340', '__IMG_LG_women-33__'],
        ['Denise Achebe', '1720559', '__IMG_LG_women-90__']
      ]
    }
  ]

  var host = document.querySelector('[data-groups]')
  GROUPS.forEach(function (g, gi) {
    var block = document.createElement('div')
    block.setAttribute('style', gi < GROUPS.length - 1 ? 'margin-bottom:40px' : '')

    var head = document.createElement('div')
    head.setAttribute('style', 'display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:18px')
    head.innerHTML =
      '<h3 style="margin:0;font-size:clamp(17px,2.2vw,24px);font-weight:900;letter-spacing:-.02em;text-transform:uppercase"></h3>' +
      '<span style="font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;padding:5px 11px;' +
      g.badgeStyle +
      '"></span>'
    head.children[0].textContent = g.title
    head.children[1].textContent = g.badge
    block.appendChild(head)

    var grid = document.createElement('div')
    grid.setAttribute('style', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px')
    g.people.forEach(function (p) {
      var card = document.createElement('article')
      card.setAttribute('style', g.card)
      card.innerHTML =
        '<img alt="" aria-hidden="true" loading="lazy" width="230" height="230" src="' +
        p[2] +
        '" style="width:100%;height:230px;object-fit:cover;background:#f6f4f2" />' +
        '<div style="padding:18px 20px 20px">' +
        '<h4 style="margin:0;font-size:16px;font-weight:800;letter-spacing:-.01em;' + g.name + '"></h4>' +
        '<p style="margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#a8a29e"></p>' +
        '<p style="margin:12px 0 0;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;' + g.role + '"></p>' +
        '</div>'
      var body = card.lastChild
      body.children[0].textContent = p[0]
      body.children[1].textContent = 'NMLS ' + p[1]
      body.children[2].textContent = g.roleLabel
      grid.appendChild(card)
    })
    block.appendChild(grid)
    host.appendChild(block)
  })

  /* ------------------------------------------------- level accordion ----- */
  /* Wide: all three tiers open, no chevrons. Narrow: one at a time, as the
     canvas did with its `narrow` state. */
  var openTier = 3
  var narrow = false
  var tierButtons = document.querySelectorAll('[data-tier]')

  function paintTiers() {
    Array.prototype.forEach.call(tierButtons, function (btn) {
      var n = btn.getAttribute('data-tier')
      var panel = document.querySelector('[data-panel="' + n + '"]')
      var chev = btn.querySelector('[data-chev]')
      var open = !narrow || openTier === Number(n)
      panel.hidden = !open
      btn.setAttribute('aria-expanded', String(open))
      chev.style.display = narrow ? 'inline-block' : 'none'
      chev.textContent = open ? 'Hide details −' : 'Show details +'
      btn.style.cursor = narrow ? 'pointer' : 'default'
    })
  }

  Array.prototype.forEach.call(tierButtons, function (btn) {
    btn.addEventListener('click', function () {
      if (!narrow) return
      var n = Number(btn.getAttribute('data-tier'))
      openTier = openTier === n ? 0 : n
      paintTiers()
    })
  })

  function onResize() {
    var next = window.innerWidth < 760
    if (next === narrow) return
    narrow = next
    paintTiers()
  }
  window.addEventListener('resize', onResize)
  narrow = window.innerWidth < 760
  paintTiers()

  /* ------------------------------------------------------------- modal --- */
  var modal = document.querySelector('[data-modal]')
  var stepSignIn = document.querySelector('[data-step-signin]')
  var stepForm = document.querySelector('[data-step-form]')
  var stepSuccess = document.querySelector('[data-step-success]')
  var levelSel = document.querySelector('[data-level]')
  var conn = document.querySelector('[data-conn]')
  var connErr = document.querySelector('[data-conn-err]')
  var phone = document.querySelector('[data-phone]')
  var phoneErr = document.querySelector('[data-phone-err]')
  var why = document.querySelector('[data-why]')
  var whyHint = document.querySelector('[data-why-hint]')
  var confirmBox = document.querySelector('[data-confirm-box]')
  var confirmed = document.querySelector('[data-confirm]')
  var errBox = document.querySelector('[data-err-box]')
  var errText = document.querySelector('[data-err-text]')
  var spinner = document.querySelector('[data-spinner]')
  var submitBtn = document.querySelector('[data-submit]')
  var submitLabel = document.querySelector('[data-submit-label]')
  var foot = document.querySelector('[data-foot]')
  var teamLeader = null
  var touched = false
  var lastFocus = null
  var timer = null

  var LEVEL_NAME = {
    1: 'Level 1 — General Participation',
    2: 'Level 2 — Loan Officer Ambassador',
    3: 'Level 3 — Senior Loan Officer Ambassador'
  }

  function renderTl() {
    var wrap = document.querySelector('[data-tl]')
    wrap.textContent = ''
    ;[['Yes', true], ['No', false]].forEach(function (o) {
      var on = teamLeader === o[1]
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
        teamLeader = o[1]
        renderTl()
        document.querySelector('[data-tl-note]').hidden = teamLeader !== true
      })
      wrap.appendChild(b)
    })
  }

  function errors() {
    var e = []
    if (!conn.value) e.push('conn')
    if (phone.value.replace(/[^0-9]/g, '').length < 10) e.push('phone')
    if (why.value.trim().length < 40) e.push('why')
    if (!confirmed.checked) e.push('confirm')
    return e
  }

  function paintErrors() {
    var e = touched ? errors() : []
    var has = function (k) {
      return e.indexOf(k) > -1
    }
    connErr.hidden = !has('conn')
    conn.style.borderColor = has('conn') ? '#fa5252' : '#e0dbd5'
    phoneErr.hidden = !has('phone')
    phone.style.borderColor = has('phone') ? '#fa5252' : '#e0dbd5'
    why.style.borderColor = has('why') ? '#fa5252' : '#e0dbd5'
    confirmBox.style.borderColor = has('confirm') ? '#fa5252' : 'transparent'

    var len = why.value.trim().length
    whyHint.textContent = has('why')
      ? 'A short paragraph, please — ' + len + ' of 40 characters minimum.'
      : len + ' characters. Two or three sentences is plenty.'
    whyHint.style.color = has('why') ? '#b02525' : '#a8a29e'

    errBox.hidden = e.length === 0
    errText.textContent =
      e.length + (e.length === 1 ? ' field needs attention before you can submit.' : ' fields need attention before you can submit.')
  }

  function paintFoot() {
    foot.textContent =
      levelSel.value === '1' ? 'Level 1 activates as soon as you submit.' : 'Levels 2 and 3 are reviewed by leadership.'
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
    paintFoot()
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
    submitLabel.textContent = 'Submit registration'
    submitBtn.style.background = '#f36f20'
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

  document.querySelector('[data-signin]').addEventListener('click', function () {
    window.setView('new')
    showStep('form')
  })

  ;[conn, phone, why].forEach(function (el) {
    el.addEventListener('input', function () {
      if (touched) paintErrors()
    })
    el.addEventListener('change', function () {
      if (touched) paintErrors()
    })
  })
  confirmed.addEventListener('change', function () {
    if (touched) paintErrors()
  })
  levelSel.addEventListener('change', paintFoot)

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
      var name = LEVEL_NAME[levelSel.value]
      document.querySelector('[data-success-level]').textContent = name
      document.querySelector('[data-success-level2]').textContent = name
      showStep('success')
    }, 1500)
  })

  Array.prototype.forEach.call(document.querySelectorAll('[data-finish]'), function (b) {
    b.addEventListener('click', function () {
      closeModal()
      window.setView('submitted')
    })
  })

  renderTl()
  paintErrors()
  paintFoot()

  /* The hero CTA label follows the applicant's status, as in the canvas. */
  window.onViewChange = function (view) {
    var label = document.querySelector('[data-register-label]')
    label.textContent =
      view === 'approved'
        ? 'Apply for the next level'
        : view === 'denied'
          ? 'Reapply for Level 2'
          : view === 'submitted'
            ? 'Update your registration'
            : 'Register for the program'
  }
})()
