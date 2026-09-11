/* Mockup behaviour: auth-state preview, apply modal, scroll reveals.
   The auth switcher exists only so reviewers can step through states in one
   file. In production the state comes from the server, the same way
   /payoff-statement resolves x-moso-user-id -> getLOInfo() -> permissions. */

(() => {
  const body = document.body

  /* ---------------------------------------------------------- auth state -- */

  /* Admin has its own page now, so it is not a viewer state here. */
  const AUTH_STATES = [
    ['anon', '1 · Public'],
    ['lo-new', '2 · Not applied'],
    ['lo-pending', '3 · Submitted'],
    ['lo-approved', '4 · Approved'],
    ['lo-rejected', '5 · Not approved']
  ]

  const setAuth = (state) => {
    body.dataset.auth = state
    document.querySelectorAll('.pv-switch button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.auth === state))
    })
    try {
      localStorage.setItem('lf-mockup-auth', state)
    } catch {
      /* private mode — state just won't persist between pages */
    }
  }

  const bar = document.querySelector('.pv-switch')
  if (bar) {
    AUTH_STATES.forEach(([value, label]) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'pv-switch__btn'
      btn.dataset.auth = value
      btn.textContent = label
      btn.setAttribute('aria-pressed', 'false')
      btn.addEventListener('click', () => setAuth(value))
      bar.append(btn)
    })

    let initial = 'anon'
    try {
      const saved = localStorage.getItem('lf-mockup-auth')
      if (saved && AUTH_STATES.some(([v]) => v === saved)) initial = saved
    } catch {
      /* ignore */
    }
    setAuth(initial)
  }

  /* --------------------------------------------------------------- modal -- */

  const modal = document.querySelector('.modal')
  let lastFocused = null

  const openModal = () => {
    if (!modal) return
    lastFocused = document.activeElement
    modal.classList.add('is-open')
    modal.dataset.form = 'form'
    body.style.overflow = 'hidden'
    modal.querySelector('.modal__panel')?.focus()
  }

  const closeModal = () => {
    if (!modal) return
    modal.classList.remove('is-open')
    body.style.overflow = ''
    lastFocused?.focus()
  }

  document.querySelectorAll('[data-open-apply]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      openModal()
    })
  })

  modal?.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeModal)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal()
  })

  /* Demo the four form states: validation error -> submitting -> success. */
  modal?.querySelector('[data-demo-error]')?.addEventListener('click', () => {
    modal.dataset.form = 'error'
    modal.querySelectorAll('[data-required-demo]').forEach((f) => f.classList.add('is-error'))
    modal.querySelector('.modal__panel')?.scrollTo({ top: 0, behavior: 'smooth' })
  })

  modal?.querySelector('[data-submit]')?.addEventListener('click', () => {
    modal.dataset.form = 'submitting'
    window.setTimeout(() => {
      modal.dataset.form = 'success'
    }, 1400)
  })

  modal?.querySelector('[data-after-success]')?.addEventListener('click', () => {
    closeModal()
    setAuth('lo-pending')
  })

  /* ------------------------------------------------------ bonus disclosure -- */

  const bonusGrid = document.querySelector('.bonus__grid')
  const bonusToggle = document.querySelector('[data-bonus-toggle]')
  bonusToggle?.addEventListener('click', () => {
    const collapsed = bonusGrid.dataset.collapsed === 'true'
    bonusGrid.dataset.collapsed = String(!collapsed)
    bonusToggle.textContent = collapsed ? 'Show less' : 'Show the full scale to 360+ units'
  })

  /* ------------------------------------------------------------- reveals -- */

  const targets = document.querySelectorAll('.reveal')
  if (targets.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target
          const delay = Number(el.dataset.revealDelay || 0)
          window.setTimeout(() => el.classList.add('is-in'), delay)
          io.unobserve(el)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    targets.forEach((el) => io.observe(el))
  } else {
    targets.forEach((el) => el.classList.add('is-in'))
  }
})()
