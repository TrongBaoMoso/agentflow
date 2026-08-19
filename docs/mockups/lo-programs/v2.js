/* Scroll reveals for the plain-language preview pages.

   programs.js does this too, but it also wires the auth-state switcher and the
   apply modal, neither of which exists on these pages — loading it would throw
   on the first missing node and take the reveals down with it. This is the one
   behaviour the v2 pages actually need. */

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
