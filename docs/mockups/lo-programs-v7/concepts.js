/* Design-direction switcher for the comparison page.
   Swaps data-theme on the specimen and updates the description block. */

(() => {
  const DIRECTIONS = [
    {
      id: 'editorial',
      name: '01 · Editorial',
      desc: 'Cool neutral ground, heavy condensed display type, orange reserved for money and status. Built from the existing Loan Factory bonus-table asset, so it already sits inside the brand.',
      trade: 'Familiar rather than surprising — it will not read as a rebrand.'
    },
    {
      id: 'minimal',
      name: '02 · Minimalism',
      desc: 'Near-monochrome, hairline rules, no elevation at all. Hierarchy comes entirely from scale and empty space, and orange appears only twice on the whole page.',
      trade: 'Needs real editorial discipline — with weak copy it reads as unfinished, and the three levels lose some of their sense of escalation.'
    },
    {
      id: 'glass',
      name: '03 · Glassmorphism',
      desc: 'A saturated colour field behind frosted translucent panels. Depth comes from blur and layering rather than shadow.',
      trade: 'Text contrast is fragile over a moving gradient, and heavy backdrop-filter costs real performance on mid-range phones.'
    },
    {
      id: 'bento',
      name: '04 · Bento Grid',
      desc: 'No long scrolling sections. Everything is packed into a modular grid of rounded tiles at deliberately unequal weights — dense and very scannable.',
      trade: 'Long-form copy fights the grid. The 30-row bonus table on the recruiter page would need its own full-width tile.'
    },
    {
      id: 'brutal',
      name: '05 · Neo Brutalism',
      desc: 'Flat fills, thick outlines, hard offset shadows, zero blur. Loud and completely unmistakable. Radius kept soft so it reads current rather than retro.',
      trade: 'Strongly opinionated — it will not sit quietly next to the rest of loanfactory.com, and some audiences read it as unserious for a financial product.'
    },
    {
      id: 'soft',
      name: '06 · Soft UI (Neumorphism)',
      desc: 'One background colour throughout, with surfaces extruded from it using paired light and dark shadows. Quiet, tactile, calm.',
      trade: 'The known accessibility problem: borderless low-contrast surfaces are hard to distinguish, and buttons stop looking clickable.'
    },
    {
      id: 'ai',
      name: '07 · AI-first Interface',
      desc: 'The page behaves like an assistant surface — dark canvas, gradient-lit panel edges, monospace metadata, suggested-question chips under the primary action.',
      trade: 'Sets an expectation the page cannot meet yet. The chips imply a real assistant, so either we build one or we cut them.'
    },
    {
      id: 'spatial',
      name: '08 · Spatial / Layered UI',
      desc: 'Content sits on planes at different depths. Perspective, overlap and long soft shadows do the organising work — the three levels literally step toward you.',
      trade: 'The 3D transforms only work on wide screens; on mobile it collapses back to a flat stack, so the whole idea has to survive being flattened.'
    }
  ]

  const spec = document.querySelector('.spec')
  const opts = document.querySelector('.picker__opts')
  const nameEl = document.querySelector('[data-meta-name]')
  const descEl = document.querySelector('[data-meta-desc]')
  const tradeEl = document.querySelector('[data-meta-trade]')

  const select = (id) => {
    const dir = DIRECTIONS.find((d) => d.id === id) || DIRECTIONS[0]
    spec.dataset.theme = dir.id
    nameEl.textContent = dir.name
    descEl.textContent = dir.desc
    tradeEl.textContent = dir.trade

    opts.querySelectorAll('.picker__opt').forEach((btn) => {
      btn.setAttribute('aria-selected', String(btn.dataset.dir === dir.id))
    })

    try {
      localStorage.setItem('lf-mockup-direction', dir.id)
    } catch {
      /* private mode — selection just won't persist */
    }
  }

  DIRECTIONS.forEach((dir) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'picker__opt'
    btn.dataset.dir = dir.id
    btn.textContent = dir.name
    btn.setAttribute('role', 'tab')
    btn.setAttribute('aria-selected', 'false')
    btn.addEventListener('click', () => select(dir.id))
    opts.append(btn)
  })

  // Stagger the hero rail rows so the spatial theme can offset them in depth
  document.querySelectorAll('.spec__rail-row').forEach((row, i) => {
    row.style.setProperty('--i', String(i))
  })

  let initial = 'editorial'
  try {
    const saved = localStorage.getItem('lf-mockup-direction')
    if (saved && DIRECTIONS.some((d) => d.id === saved)) initial = saved
  } catch {
    /* ignore */
  }
  select(initial)

  // Left/right arrows step through directions when the picker has focus
  opts.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const idx = DIRECTIONS.findIndex((d) => d.id === spec.dataset.theme)
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + DIRECTIONS.length) % DIRECTIONS.length
    select(DIRECTIONS[next].id)
    opts.querySelector(`[data-dir="${DIRECTIONS[next].id}"]`)?.focus()
  })
})()
