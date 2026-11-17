# push-filters-v2 (D573, agentflow-1hn6r) — staging screenshots 17/11

Staging FE 5d974b1fb, BE 75246262a (Flyway v441). Admin test account.

- `exceptions-*.png`: real staging, `GET /exceptions/first-sight` returned total 0, so the section stays hidden (by design).
- `inj-*.png`: the SAME staging pages with three sample rows (`inj-section-*`) and `first_sight_review` on one
  QA candidate (`inj-marker-*`) injected into the GET responses in the browser only. Nothing was written to staging.
  Sample names "Sample Current LO / No rehire / Twin skipped" are fake.
- Phone (375): page scrollWidth 375 (no page overflow); the table scrolls sideways inside its card (overflow-x auto,
  739/341 px) like the other Exceptions tables; `inj-section-scrolled-375-*` shows "Mark handled" reachable.
- Scripts: `docs/handoff/recruit-e2e-lab/scripts/firstsightshots.js`, `firstsightinject.js`.
