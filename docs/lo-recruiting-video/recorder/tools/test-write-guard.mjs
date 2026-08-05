#!/usr/bin/env node
/**
 * The production write guard, tested. Run: node tools/test-write-guard.mjs
 *
 * WHY THIS FILE EXISTS. On 05/08/2026 the first production run clicked Approve on a row nobody had
 * authorised, because the beat was inherited from staging and the review pass only re-read scenes
 * whose narration had changed. assertWritableRow() is the fix; this is the proof it behaves, and it
 * is committed because the last set of "proven scripts" in this pipeline was never committed and was
 * lost (see the note in ../../.gitignore).
 *
 * The case that matters most is "Maria Testa": a real broker whose NAME CONTAINS "test". The old
 * heuristic in pickDemoRow — /\b(test|demo|sample|dummy|qa)\b/ — would hand her row to beats that
 * write. The allowlist refuses it.
 */
import assert from 'node:assert/strict';

const RECORD = new URL('../record.mjs', import.meta.url).href;
const stub = (t) => ({ innerText: async () => { if (t === null) throw new Error('detached'); return t; } });

const CASES = [
  ['the subject',                'Test Test (New York) (Loan Factory) Not touched',                'ALLOW'],
  ['s1_4 wall row',             '7/4/2024 Katie Test (test) (Duplicated) Not touched',            'ALLOW'],
  ['--demo-record row',         'RLO Test (ABC) Added by admin',                                  'ALLOW'],
  ['a real loan officer',       '10/17/2023 Roger Kube (California) (Fairway Independent Mortgage)', 'REFUSE'],
  ['the row that was approved', '10/17/2023 <junk self-application> Added by LO 123456',           'REFUSE'],
  ['the pending row beside it', '10/17/2023 Thian Nguyen Added by LO 320777',                      'REFUSE'],
  ['a name merely LIKE test',   'Maria Testa (Arizona) Guild Mortgage',                            'REFUSE'],
  ['a row we cannot read',      null,                                                             'REFUSE'],
  // The row s4_4 refused on the first production run. innerText concatenates the cells, so the name
  // is glued to the next one — a trailing \\b in the allowlist could never match it. Regression only.
  ['cells glued together',      '10/2/2025 Test Testinfoemailphone (Duplicated) Referred by',      'ALLOW'],
  ['glued, but a real broker',  '10/2/2025 Maria Testainfoemailphone Guild Mortgage',              'REFUSE'],
];

const outcome = (fn) => fn().then(() => 'ALLOW').catch(() => 'REFUSE');

// Production: the allowlist is enforced.
process.env.LORV_VARIANT = 'production';
process.env.LORV_PRODUCTION_BASE ||= 'https://example.invalid';
const prod = await import(RECORD);
let failures = 0;
for (const [label, text, want] of CASES) {
  const got = await outcome(() => prod.assertWritableRow(stub(text), 'test'));
  const ok = got === want;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${want.padEnd(6)}  ${label}`);
}
assert.equal(failures, 0, `${failures} production case(s) behaved wrongly`);

// Staging: every row is a throwaway account, so the guard must be a no-op. Asserted rather than
// assumed — a guard that quietly started refusing staging rows would break the shipped cut's
// re-record path and look like an unrelated failure.
console.log('\n  (staging: guard must be inert — every row there is a throwaway test account)');
const { execFileSync } = await import('node:child_process');
const staging = execFileSync(process.execPath, ['-e', `
  const stub = (t) => ({ innerText: async () => t });
  const m = await import(${JSON.stringify(RECORD)});
  process.stdout.write(await m.assertWritableRow(stub('Roger Kube (California)'), 't').then(() => 'ALLOW').catch(() => 'REFUSE'));
`], { encoding: 'utf8', env: { ...process.env, LORV_VARIANT: 'staging' } }).trim();
console.log(`  ${staging === 'ALLOW' ? 'PASS' : 'FAIL'}  ALLOW   a real row, on staging`);
assert.equal(staging, 'ALLOW', 'the guard must not fire on staging');

console.log('\nall cases behave as intended');
