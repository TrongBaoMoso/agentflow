/* Ambassador page — behaviour translated from the design canvas component.
   The canvas re-rendered everything from state; here the static sections are
   in the markup and only the data-driven lists are built in JavaScript. */
;(function () {
  var AMB = [
    { name: 'Dana Whitfield', nmls: '1187342', photo: '__IMG_women-44__', level: 3 },
    { name: 'Marisol Rivera', nmls: '1428907', photo: '__IMG_women-68__', level: 3 },
    { name: 'Andre Boateng', nmls: '1503288', photo: '__IMG_men-32__', level: 2 },
    { name: 'Priya Nandakumar', nmls: '1339410', photo: '__IMG_women-26__', level: 2 },
    { name: 'Tom Ellsworth', nmls: '987114', photo: '__IMG_men-51__', level: 1 },
    { name: 'Bianca Lopresti', nmls: '1622055', photo: '__IMG_women-12__', level: 2 },
    { name: 'Kevin Duong', nmls: '1755602', photo: '__IMG_men-75__', level: 1 },
    { name: 'Rochelle Adeyemi', nmls: '1290877', photo: '__IMG_women-33__', level: 3 },
    { name: 'Grant Peterson', nmls: '1444019', photo: '__IMG_men-19__', level: 1 },
    { name: 'Sofia Marchetti', nmls: '1580931', photo: '__IMG_women-90__', level: 2 },
    { name: 'Darnell Hobbs', nmls: '1361204', photo: '__IMG_men-86__', level: 1 },
    { name: 'Amy Kucera', nmls: '1706488', photo: '__IMG_women-55__', level: 2 }
  ]

  var GROUPS = [
    [3, 'Senior Loan Officer Ambassadors', '#f36f20'],
    [2, 'Loan Officer Ambassadors · Level 2', '#f9d8c0'],
    [1, 'General participation · Level 1', '#eaeaee']
  ]

  function badge(level) {
    if (level === 3) return { label: 'Senior', bg: '#272727', fg: '#f36f20', border: '#272727' }
    if (level === 2) return { label: 'Level 2', bg: '#f36f20', fg: '#272727', border: '#f36f20' }
    return { label: 'Level 1', bg: '#f2f2f5', fg: '#5c5b63', border: '#e4e4e9' }
  }

  /* ------------------------------------------------------------ directory -- */
  function renderDirectory() {
    var host = document.querySelector('[data-groups]')
    var zero = document.querySelector('[data-zero]')
    var count = document.querySelector('[data-count-label]')
    host.textContent = ''

    if (!AMB.length) {
      zero.hidden = false
      count.textContent = 'No ambassadors approved yet'
      return
    }
    count.textContent = AMB.length + ' ambassadors'

    GROUPS.forEach(function (def) {
      var level = def[0]
      var items = AMB.filter(function (a) {
        return a.level === level
      })
      if (!items.length) return

      var block = document.createElement('div')
      var head = document.createElement('div')
      head.setAttribute('style', 'display:flex;align-items:center;gap:14px;margin-bottom:16px')
      head.innerHTML =
        '<span style="font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#272727"></span>' +
        '<span style="font-size:12px;font-weight:700;color:#8b8a92;background:#f2f2f5;padding:3px 11px;border-radius:999px"></span>' +
        '<span style="flex:1;height:1px;background:' + def[2] + '"></span>'
      head.children[0].textContent = def[1]
      head.children[1].textContent = items.length === 1 ? '1 person' : items.length + ' people'
      block.appendChild(head)

      var grid = document.createElement('div')
      grid.setAttribute(
        'style',
        'display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px'
      )
      items.forEach(function (a) {
        var b = badge(a.level)
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
          '<span style="font-size:10.5px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:5px 11px;border-radius:999px;background:' +
          b.bg +
          ';color:' +
          b.fg +
          ';border:1px solid ' +
          b.border +
          '"></span></div></div>'
        var body = card.lastChild
        body.children[0].textContent = a.name
        body.children[1].textContent = 'NMLS ' + a.nmls
        body.children[2].firstChild.textContent = b.label
        grid.appendChild(card)
      })
      block.appendChild(grid)
      host.appendChild(block)
    })
  }

  /* ---------------------------------------------------------------- modal -- */
  var modal = document.querySelector('[data-modal]')
  var form = document.querySelector('[data-modal-form]')
  var success = document.querySelector('[data-modal-success]')
  var title = document.querySelector('[data-modal-title]')
  var why = document.querySelector('[data-why]')
  var whyErr = document.querySelector('[data-why-err]')
  var agree = document.querySelector('[data-agree]')
  var agreeBox = document.querySelector('[data-agree-box]')
  var agreeErr = document.querySelector('[data-agree-err]')
  var errBox = document.querySelector('[data-err-summary]')
  var errText = document.querySelector('[data-err-text]')
  var spinner = document.querySelector('[data-spinner]')
  var submitBtn = document.querySelector('[data-submit]')
  var submitLabel = document.querySelector('[data-submit-label]')
  var lastFocus = null
  var timer = null

  var chosenLevel = 'Level 2'
  var chosenTl = 'No'

  function choiceStyle(active) {
    return active
      ? 'background:#fff3e9;color:#272727;border:1px solid #f36f20'
      : 'background:#ffffff;color:#3d3c44;border:1px solid #d9d9de'
  }

  function renderChoices() {
    var levels = document.querySelector('[data-levels]')
    levels.textContent = ''
    ;[
      ['Level 1', 'Self-serve · no approval'],
      ['Level 2', 'Up to $500/mo'],
      ['Level 3', 'Up to $1,000/mo']
    ].forEach(function (o) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'h-border-orange'
      b.setAttribute('aria-pressed', String(chosenLevel === o[0]))
      b.setAttribute(
        'style',
        'text-align:left;padding:13px 14px;cursor:pointer;border-radius:18px;' + choiceStyle(chosenLevel === o[0])
      )
      b.innerHTML =
        '<span style="display:block;font-size:13px;font-weight:800;letter-spacing:0.02em"></span>' +
        '<span style="display:block;font-size:11.5px;margin-top:3px;opacity:0.75"></span>'
      b.children[0].textContent = o[0]
      b.children[1].textContent = o[1]
      b.addEventListener('click', function () {
        chosenLevel = o[0]
        renderChoices()
      })
      levels.appendChild(b)
    })

    var tl = document.querySelector('[data-tl]')
    tl.textContent = ''
    ;['Yes', 'No'].forEach(function (label) {
      var b = document.createElement('button')
      b.type = 'button'
      b.className = 'h-border-orange'
      b.setAttribute('aria-pressed', String(chosenTl === label))
      b.setAttribute(
        'style',
        'padding:11px 26px;font-size:13px;font-weight:800;letter-spacing:0.04em;cursor:pointer;border-radius:999px;' +
          choiceStyle(chosenTl === label)
      )
      b.textContent = label
      b.addEventListener('click', function () {
        chosenTl = label
        renderChoices()
      })
      tl.appendChild(b)
    })
  }

  function clearErrors() {
    whyErr.hidden = true
    agreeErr.hidden = true
    errBox.hidden = true
    why.style.borderColor = '#d9d9de'
    agreeBox.style.borderColor = '#eaeaee'
  }

  function openModal() {
    lastFocus = document.activeElement
    clearErrors()
    success.hidden = true
    form.hidden = false
    title.textContent = "Tell us how you'd represent Loan Factory"
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
    if (!why.value.trim()) {
      whyErr.hidden = false
      why.style.borderColor = '#fa5252'
      bad++
    }
    if (!agree.checked) {
      agreeErr.hidden = false
      agreeBox.style.borderColor = '#fa5252'
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

  renderDirectory()
  renderChoices()
})()
