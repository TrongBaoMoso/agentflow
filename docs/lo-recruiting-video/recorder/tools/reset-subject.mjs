// MAINTENANCE TOOL, not part of the shoot. Walks the act-4 subject back so its three transitions can
// be filmed again: once a record reaches "100% onboarded / Paid / Signed", s4_2 and s4_4 take their
// ALREADY DONE branches and the take contains no real mutation.
//
//   node tools/reset-subject.mjs --dry   # probe the dropdown vocabulary, change nothing
//   node tools/reset-subject.mjs         # perform the reset, then read both records back
//
// Walk the SUBJECT (NMLS 1076215) back so act 4 can film its three transitions again.
// Documented order (record.mjs, verified 2026-08-04): status -> fee -> agreement.
// The decoy 107621 is NEVER touched.
//
// Uses the hardened helpers rather than hand-rolled clicking: setIloCellValue is data-name based and
// scoped to the Status/fee/Agreement cell, which is what stops it from setting the webinar
// "Attended?" dropdown by accident; readIloState matches the NMLS against a LEAF element so 107621
// cannot match inside 1076215.
import {
  launchBrowser, createContext, makeHelpers, URLS, authPathFor,
  ensureCandidateVisible, candidateRow, readIloState, setIloCellValue,
} from '../record.mjs';

const SUBJECT = { name: 'Marcus Reyes', nmls: '1076215' };
const DECOY = { name: 'Marcus Reyes', nmls: '107621' };
const DRY = process.argv.includes('--dry');

const browser = await launchBrowser({});
const ctx = await createContext(browser, { storageStatePath: authPathFor('ken') });
const page = await ctx.newPage();
const h = makeHelpers(page, { actLabel: 'reset', durations: {} });
const row = () => candidateRow(page, SUBJECT);

const land = async () => {
  await h.goto(URLS.iloCompany);
  if (!(await ensureCandidateVisible(page, h, SUBJECT))) {
    throw new Error(`subject NMLS ${SUBJECT.nmls} is not reachable on the ILO board — aborting `
      + 'without touching anything');
  }
};
await land();

// ---- PROBE the dropdown vocabulary before mutating anything -----------------------------------
const vocab = await row().evaluate((tr) => {
  const cell = [...tr.children].find((c) => c.querySelector('a.dropdown-item[data-name="Waived"]'));
  if (!cell) return null;
  return [...cell.querySelectorAll('div[role="group"]')].map((g) => ({
    current: (g.querySelector('button.dropdown-toggle')?.innerText || '').trim(),
    options: [...g.querySelectorAll('a.dropdown-item')].map((a) => ({
      dataName: a.getAttribute('data-name'),
      label: (a.textContent || '').trim(),
      disabled: getComputedStyle(a).pointerEvents === 'none',
    })),
  }));
});
if (!vocab) throw new Error('could not find the Status/fee/Agreement cell — aborting');
console.log('\n=== dropdown vocabulary (probed, nothing changed yet) ===');
vocab.forEach((g, i) => {
  console.log(`  group ${i} current="${g.current}"`);
  g.options.forEach((o) => console.log(`      data-name=${JSON.stringify(o.dataName)} label="${o.label}"${o.disabled ? ' [disabled]' : ''}`));
});

const has = (dn) => vocab.some((g) => g.options.some((o) => o.dataName === dn));
const STATUS_HOPS = ['interviewed_and_accepted', 'invited_to_join'];
const FEE = vocab.flatMap((g) => g.options).find((o) => /^(Unpaid|Not paid)$/i.test(o.label))?.dataName;
const AGREEMENT = 'No';
const missing = [...STATUS_HOPS, AGREEMENT].filter((d) => !has(d));
if (!FEE) missing.push('<fee: Unpaid/Not paid>');
if (missing.length) {
  throw new Error(`these dropdown values are not offered on this record: ${missing.join(', ')} — `
    + 'the cell vocabulary has changed, so refusing to guess. Nothing was modified.');
}
console.log(`\nresolved: status hops ${STATUS_HOPS.join(' -> ')}; fee data-name="${FEE}"; agreement data-name="${AGREEMENT}"`);

const before = await readIloState(page, SUBJECT);
console.log(`\nBEFORE  status="${before.status}" fee="${before.fee}" agreement="${before.agreement}"`);
if (DRY) { console.log('\n--dry: stopping before any mutation.'); await ctx.close(); await browser.close(); process.exit(0); }

// ---- MUTATE: status -> fee -> agreement -------------------------------------------------------
for (const dn of STATUS_HOPS) {
  console.log(`\n[status] -> ${dn}`);
  await setIloCellValue(page, h, row(), { dataName: dn, what: 'the status' });
  await land();
  const st = await readIloState(page, SUBJECT);
  console.log(`[status] now "${st.status}"`);
}
const afterStatus = await readIloState(page, SUBJECT);
if (!/Invited to join/i.test(afterStatus.status)) {
  throw new Error(`status is "${afterStatus.status}", not "Invited to join" — STOPPING before the fee. `
    + 'The fee is the auto-transition trigger; changing it now would re-advance the status.');
}

console.log(`\n[fee] -> ${FEE}`);
await setIloCellValue(page, h, row(), { dataName: FEE, what: 'the fee' });
await land();
console.log(`[fee] now "${(await readIloState(page, SUBJECT)).fee}"`);

console.log(`\n[agreement] -> ${AGREEMENT}`);
await setIloCellValue(page, h, row(), { dataName: AGREEMENT, what: 'the agreement' });
await land();

// ---- FINAL READ-BACK: both records, from a fresh load ------------------------------------------
await land();
const subj = await readIloState(page, SUBJECT);
await h.goto(URLS.iloCompany);
await ensureCandidateVisible(page, h, DECOY);
const dec = await readIloState(page, DECOY);
const stamp = new Date().toISOString();

console.log('\n==================== FINAL READ-BACK ====================');
console.log(`read at ${stamp}  (local ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} US/Pacific)`);
console.log(`SUBJECT 1076215 : ${subj.status} / ${subj.fee} / ${subj.agreement}`);
console.log(`DECOY   107621  : ${dec.status} / ${dec.fee} / ${dec.agreement}`);
const want = /Invited to join/i.test(subj.status) && /^(Unpaid|Not paid)$/i.test(subj.fee) && /Not signed/i.test(subj.agreement);
console.log(want ? 'SUBJECT IS RESET — act 4 can film all three transitions.'
  : '!! SUBJECT IS NOT IN THE EXPECTED RESET STATE — do not start the shoot.');
await ctx.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(want ? 0 : 1);
