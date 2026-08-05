#!/usr/bin/env node
/**
 * READ-ONLY. Which ILO row is actually ours?
 *
 * The production pipeline holds several records named "Test Test" — seven when act 4 looked, eight
 * once act 1's invite landed. The subject deliberately carries no NMLS (typing one in is a beat), so
 * candidateRow() can only match by name and takes .first(): every downstream act was reading and
 * writing an arbitrary one of them. This dumps the candidates with the fields that could tell them
 * apart, so the disambiguator is chosen from evidence rather than from hope.
 *
 * Usage: LORV_VARIANT=production LORV_PRODUCTION_BASE=... node tools/find-subject.mjs
 */
import { launchBrowser, createContext, makeHelpers, authPathFor, URLS, IS_PRODUCTION } from '../record.mjs';

if (!IS_PRODUCTION) { console.error('production only'); process.exit(1); }

const browser = await launchBrowser({});
const ctx = await createContext(browser, { storageStatePath: authPathFor('admin') });
const page = await ctx.newPage();
const h = makeHelpers(page, { actLabel: 'find' });

try {
  await h.goto(URLS.iloCompany);
  await h.filterGrid('Test Test');
  const rows = await page.locator('table.table-hover tbody tr').all();
  console.log(`\n${rows.length} row(s) after filtering on "Test Test":\n`);
  for (const [i, r] of rows.entries()) {
    const t = ((await r.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (!t || /No results/i.test(t)) continue;
    const marks = [
      /25000000|25,000,000/.test(t) ? 'CAREER-PROD-25M' : null,
      /mailinator/i.test(t) ? 'MAILINATOR-EMAIL' : null,
      /New York/i.test(t) ? 'NY' : null,
      /New Jersey/i.test(t) ? 'NJ' : null,
      /Duplicated/i.test(t) ? 'flagged-duplicated' : null,
    ].filter(Boolean);
    const full = /New York/i.test(t);
    console.log(`[${i}] ${marks.length ? `<< ${marks.join(' ')} >>  ` : ''}${full ? t : t.slice(0, 200)}`);
    console.log('');
  }
  console.log('A discriminator is only usable if EXACTLY ONE row carries it.');
} finally {
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
}
