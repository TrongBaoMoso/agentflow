#!/usr/bin/env node
/**
 * Give the production subject a unique NMLS, so every identity path in record.mjs can find it exactly.
 *
 * WHY. The pipeline holds eight records named "Test Test". record.mjs reasons about the candidate's
 * identity in FOUR independent places — candidateRow, readIloState, countSameName, narrowToCandidate —
 * and all four key off name + NMLS. The subject was created without an NMLS on purpose (a recruiter
 * typing one in is a beat), so every one of them fell back to name-only and took .first(): thirteen
 * scenes across acts 1, 4 and 5 read or wrote an arbitrary sibling. Adding a discriminator to
 * candidateRow alone fixed one of the four. An NMLS fixes all four with no code at all.
 *
 * This is a WRITE, on the one record the shoot is allowed to write to, so it:
 *   - identifies the row by a marker unique among the eight ("(New York)"), never by .first();
 *   - refuses to touch anything else, and says so loudly;
 *   - is idempotent — if the NMLS is already the target value it changes nothing;
 *   - re-reads the record afterwards and fails if the value did not stick.
 *
 * Usage: LORV_VARIANT=production LORV_PRODUCTION_BASE=... node tools/set-subject-nmls.mjs [--nmls N] [--dry]
 */
import { launchBrowser, createContext, makeHelpers, authPathFor, URLS, IS_PRODUCTION } from '../record.mjs';

if (!IS_PRODUCTION) { console.error('production only'); process.exit(1); }

const argv = process.argv.slice(2);
const NMLS = (argv.includes('--nmls') ? argv[argv.indexOf('--nmls') + 1] : '9990125').trim();
const DRY = argv.includes('--dry');
const UNIQUE_MARKER = 'Test Test (New York)';   // unique among the eight; see tools/find-subject.mjs

if (!/^\d{4,10}$/.test(NMLS)) { console.error(`--nmls must be 4-10 digits, got "${NMLS}"`); process.exit(1); }

const browser = await launchBrowser({});
const ctx = await createContext(browser, { storageStatePath: authPathFor('admin') });
const page = await ctx.newPage();
const h = makeHelpers(page, { actLabel: 'set-nmls' });

try {
  await h.goto(URLS.iloCompany);
  await h.filterGrid('Test Test');

  const rows = await page.locator('table.table-hover tbody tr').all();
  const matches = [];
  for (const r of rows) {
    const t = ((await r.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (t.includes(UNIQUE_MARKER)) matches.push({ r, t });
  }
  if (matches.length !== 1) {
    throw new Error(`expected EXACTLY ONE row containing "${UNIQUE_MARKER}", found ${matches.length}. `
      + 'Refusing to write: the whole point of this tool is that the target is unambiguous. '
      + 'Run tools/find-subject.mjs and pick a marker that only the subject carries.');
  }
  const { r: row, t: rowText } = matches[0];
  console.log(`\ntarget row: ${rowText.slice(0, 150)}\n`);
  if (!/Converted from recruited LO/i.test(rowText)) {
    console.warn('NOTE: this row does not carry "Converted from recruited LO" — it may not be the record '
      + 'act 1 invited. Continuing because "(New York)" is still unique, but check the shoot log.');
  }

  if (DRY) { console.log('--dry: nothing written.'); process.exit(0); }

  // The name cell is a div.btn-link, NOT an anchor (verified 05/08/2026 — see record.mjs).
  const nameCell = row.locator('div.btn-link').filter({ hasText: /Test Test/ }).first();
  await h.click(() => nameCell);
  await h.waitForAppIdle();
  await page.locator('#gwt-debug-submit').waitFor({ state: 'visible', timeout: 30_000 });

  /**
   * The NMLS field, found by ladder rather than by one guess.
   *
   * The Recruited edit form labels it "NMLS (optional)" and exposes that as the accessible name; the
   * Interested form does not expose a usable name at all, so an anchored getByRole(/^NMLS$/) finds
   * nothing — which is how the first attempt at this write timed out. Fall back to the label's own
   * text and take the input that follows it, and refuse the "Company nmls" field explicitly.
   */
  const nmlsCandidates = [
    () => page.getByRole('textbox', { name: /^\s*NMLS(\s*\(optional\))?\s*$/i }).first(),
    () => page.locator('xpath=//*[starts-with(normalize-space(text()),"NMLS")][not(contains(normalize-space(text()),"Company"))]/following::input[1]').first(),
    () => page.locator('xpath=//*[normalize-space(text())="NMLS (optional)"]/following::input[1]').first(),
  ];
  let nmlsInput = null;
  for (const build of nmlsCandidates) {
    const loc = build();
    if (await loc.count().catch(() => 0) && await loc.isVisible().catch(() => false)) { nmlsInput = loc; break; }
  }
  if (!nmlsInput) {
    const labels = await page.evaluate(() => [...document.querySelectorAll('div,label,span')]
      .filter((e) => e.children.length === 0 && /nmls/i.test(e.textContent || ''))
      .map((e) => e.textContent.trim()).slice(0, 10));
    throw new Error(`could not locate the NMLS input on this form. NMLS-ish labels present: ${JSON.stringify(labels)}`);
  }
  const before = await nmlsInput.inputValue();
  console.log(`NMLS currently: "${before}"`);
  if (before.trim() === NMLS) { console.log('already set — nothing to do.'); process.exit(0); }
  if (before.trim()) {
    throw new Error(`this record already has NMLS "${before}". Refusing to overwrite an existing value; `
      + `pass --nmls ${before} to the shoot instead.`);
  }

  await h.typeInto(() => nmlsInput, NMLS);
  await h.click(() => page.locator('#gwt-debug-submit'));
  await h.waitForAppIdle();
  await page.waitForTimeout(4000);

  // VERIFY — the whole exercise is worthless if the value did not persist.
  await h.goto(URLS.iloCompany);
  await h.filterGrid(NMLS);
  const stuck = await page.locator(`:text-is("${NMLS}")`).count();
  if (!stuck) {
    throw new Error(`wrote NMLS ${NMLS} but the pipeline does not return it — the save did not stick. `
      + 'Do NOT pass --candidate-nmls to the shoot yet.');
  }
  console.log(`\n✓ NMLS ${NMLS} is on the subject and searchable.`);
  console.log(`  Now: node record.mjs --acts 1,4,5 --candidate-nmls ${NMLS} …`);
} finally {
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
}
