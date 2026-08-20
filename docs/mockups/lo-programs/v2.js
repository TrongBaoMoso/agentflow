/* Behaviour for the plain-language preview pages: scroll reveals plus the
   viewer switcher.

   programs.js does both of these, but it also wires the apply modal, which
   these pages do not have — loading it would throw on the first missing node
   and take the reveals down with it. So the two behaviours the v2 pages
   actually use are re-stated here, and nothing else.

   The switcher is review chrome. In production the state comes from the
   server, the same way /payoff-statement resolves x-moso-user-id ->
   getLOInfo() -> the viewer's own application record. */

/* --------------------------------------------------------------- viewer -- */

const AUTH_STATES = [
  ['anon', '1 · Public'],
  ['lo-new', '2 · Signed in, no budget yet'],
  ['lo-pending', '3 · Applied, waiting'],
  ['lo-approved', '4 · Approved'],
  ['lo-rejected', '5 · Not approved']
]

const switchBar = document.querySelector('.pv-switch')

if (switchBar) {
  const setAuth = (state) => {
    document.body.dataset.auth = state
    switchBar.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.auth === state))
    })
    try {
      localStorage.setItem('lf-mockup-v2-auth', state)
    } catch {
      /* private mode — the choice just will not persist between pages */
    }
  }

  AUTH_STATES.forEach(([value, label]) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'pv-switch__btn'
    btn.dataset.auth = value
    btn.textContent = label
    btn.setAttribute('aria-pressed', 'false')
    btn.addEventListener('click', () => setAuth(value))
    switchBar.append(btn)
  })

  let initial = 'anon'
  try {
    const saved = localStorage.getItem('lf-mockup-v2-auth')
    if (saved && AUTH_STATES.some(([value]) => value === saved)) initial = saved
  } catch {
    /* ignore */
  }
  setAuth(initial)
}

/* -------------------------------------------------------------- reveals -- */

const revealTargets = document.querySelectorAll('.reveal')

if (!window.IntersectionObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  revealTargets.forEach((el) => el.classList.add('is-in'))
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      })
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  )

  revealTargets.forEach((el) => observer.observe(el))
}
