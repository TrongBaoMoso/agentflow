#!/usr/bin/env node
/**
 * Assign the production subject's ILO record to an onboarding specialist, so act 5 can film
 * that specialist's board with the subject actually on it.
 *
 * WHY. The subject arrived on the ILO board Unassigned (both owner columns — verified 05/08/2026
 * by dumping the row: "Recruiter/Onboarding specialist" reads "Unassigned Unassigned"). Act 5 is
 * shot as the onboarding specialist, whose board shows ONLY records assigned to them, so the
 * subject is invisible there and shoot 5 correctly refused to substitute a real loan officer for
 * beats that write (s5_4 notes + emails, s5_5 registers for a webinar). Assigning the subject is
 * the fix the narration itself describes: s5_1 is literally about ownership deciding whose work a
 * candidate becomes.
 *
 * MECHANISM (probed read-only 05/08/2026): row Action menu -> "Assign owner" opens a modal with
 * two select2 fields, "Onboarding specialist (optional)" and "Recruiter (optional)", and a
 * Submit button (accessible name "check Submit" — material-icon ligature). Options load remotely
 * after typing.
 *
 * This is a WRITE, on the one record the shoot is allowed to write to, so it:
 *   - identifies the row by the unique marker, never by .first();
 *   - runs the same assertWritableRow guard as every other write path;
 *   - is idempotent — if the owner cell already names the specialist it changes nothing;
 *   - re-reads the row afterwards and fails if the assignment did not stick.
 *
 * NOTE: assigning may notify the specialist (a real employee) in-app/by email — that is the real
 * flow working as designed, same as the staging shoot, and the act films her acting on it.
 *
 * Usage: LORV_VARIANT=production LORV_PRODUCTION_BASE=... node tools/assign-subject-owner.mjs \
 *          [--specialist "Miley Dau"] [--dry]
 */
import {
  launchBrowser, createContext, makeHelpers, authPathFor, URLS, IS_PRODUCTION, assertWritableRow,
} from '../record.mjs';

if (!IS_PRODUCTION) { console.error('production only'); process.exit(1); }

const argv = process.argv.slice(2);
const SPECIALIST = (argv.includes('--specialist') ? argv[argv.indexOf('--specialist') + 1] : 'Miley Dau').trim();
const DRY = argv.includes('--dry');
const UNIQUE_MARKER = 'Test Test (New York)';   // unique among the eight; see tools/find-subject.mjs
const OWNER_CELL = 4;                           // "Recruiter/Onboarding specialist" column (probed)

const browser = await launchBrowser({});
const ctx = await createContext(browser, { storageStatePath: authPathFor('admin') });
const page = await ctx.newPage();
const h = makeHelpers(page, { actLabel: 'assign-owner' });

async function findSubjectRow() {
  let row = null;
  for (let attempt = 0; attempt < 3 && !row; attempt += 1) {
    for (const r of await page.locator('table.table-hover tbody tr').all()) {
      const t = ((await r.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (t.includes(UNIQUE_MARKER)) { row = r; break; }
    }
    if (!row) await page.waitForTimeout(5000);
  }
  return row;
}

try {
  await h.goto(URLS.iloCompany);
  await h.filterGrid('Test Test');
  await h.waitForAppIdle();
  await page.waitForTimeout(6000); // the ILO plain-text search applies slowly on a 23.6k-row board

  const row = await findSubjectRow();
  if (!row) throw new Error(`subject row "${UNIQUE_MARKER}" not found — refusing to guess.`);
  await assertWritableRow(row, 'assign the onboarding specialist', { actLabel: 'assign-owner' });

  const ownerBefore = ((await row.locator('td').nth(OWNER_CELL).innerText().catch(() => '')) || '')
    .replace(/\s+/g, ' ').trim();
  console.log(`owner cell before: "${ownerBefore}"`);
  if (new RegExp(SPECIALIST.replace(/\s+/g, '\\s+'), 'i').test(ownerBefore)) {
    console.log(`already assigned to ${SPECIALIST} — nothing to do.`);
    process.exit(0);
  }
  if (DRY) { console.log('--dry: nothing written.'); process.exit(0); }

  await h.openRowMenu(row, { timeout: 10_000 });
  await h.clickMenuItem(row, 'Assign owner');
  await page.locator('div.modal.show').waitFor({ state: 'visible', timeout: 20_000 });
  const modal = page.locator('div.modal.show').last();

  // NOT select2. Probed 05/08/2026: this modal is the one place in the app (so far) built on
  // Twitter Typeahead — each field renders TWO stacked input[type=search]es, a readonly `tt-hint`
  // underneath and the real `tt-input` on top (id="onboarding_specialist" / name likewise), so a
  // "first search input" locator resolves to the hint and the click is intercepted forever.
  // Address the real input by id, and read suggestions from typeahead's `.tt-suggestion` menu.
  const specialistField = modal.locator('input#onboarding_specialist.tt-input');
  await h.click(() => specialistField, { timeout: 10_000 });
  await page.keyboard.type(SPECIALIST, { delay: 60 });

  const options = page.locator('.tt-suggestion');
  await options.first().waitFor({ state: 'visible', timeout: 25_000 });
  const option = options.filter({ hasText: new RegExp(SPECIALIST.replace(/\s+/g, '\\s+'), 'i') }).first();
  if (!(await option.count())) {
    const texts = await options.allInnerTexts().catch(() => []);
    throw new Error(`no suggestion matching "${SPECIALIST}". Offered: ${texts.slice(0, 6).join(' | ')}`);
  }
  const picked = ((await option.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  console.log(`picking suggestion: "${picked}"`);
  await h.click(() => option, { timeout: 10_000 });

  await h.click(() => modal.getByRole('button', { name: /(?:^|\s)Submit\s*$/i }).first(), { timeout: 10_000 });
  await h.waitForAppIdle();
  await page.waitForTimeout(4000);

  // VERIFY — re-search and re-read the owner cell; the whole exercise is worthless otherwise.
  await h.goto(URLS.iloCompany);
  await h.filterGrid('Test Test');
  await h.waitForAppIdle();
  await page.waitForTimeout(6000);
  const rowAfter = await findSubjectRow();
  if (!rowAfter) throw new Error('subject row vanished after the assignment — investigate before shooting.');
  const ownerAfter = ((await rowAfter.locator('td').nth(OWNER_CELL).innerText().catch(() => '')) || '')
    .replace(/\s+/g, ' ').trim();
  console.log(`owner cell after: "${ownerAfter}"`);
  if (!new RegExp(SPECIALIST.replace(/\s+/g, '\\s+'), 'i').test(ownerAfter)) {
    throw new Error(`assignment did not stick (cell reads "${ownerAfter}"). Do NOT shoot act 5 yet.`);
  }
  console.log(`\n✓ subject assigned to ${SPECIALIST}. Act 5 can now find him on her board.`);
} finally {
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
}
