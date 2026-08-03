#!/usr/bin/env node
/**
 * LO Recruiting — LIVE SELECTOR PROBE (playbook step 7, run BEFORE the real recording).
 *
 * Purpose: for one act, visit every screen that act touches and report, for each CANDIDATE
 * selector used by record.mjs, `{selector, count, visible, text}` plus a screenshot per screen
 * in recorder/debug/. Fixing selectors here costs minutes; fixing them during the shoot costs
 * the shoot.
 *
 * READ-ONLY BY CONTRACT:
 *   - It never submits, never saves, never deletes, never exports, never sends email/SMS,
 *     never clicks "Login" (impersonation), never clicks Approve / Delete / Submit / Send.
 *   - The only clicks it can perform are the ones declared in `safeOpens` (read-only modals and
 *     menus, closed again with Escape) and only when you pass --open-modals.
 *   - Same auth handoff as record.mjs: it never types or reads credentials.
 *
 * Usage:
 *   node inspect.mjs --act 1                       # probe act 1's screens (see notes on --role)
 *   node inspect.mjs --act 1 --role luis           # use .auth/viet18-luis.json if it exists
 *   node inspect.mjs --act 1 --role luis --login-as # impersonate now (burns THIS context only)
 *   node inspect.mjs --act 4 --open-modals         # also open the whitelisted read-only modals
 *   node inspect.mjs --act 0 --auth /abs/state.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACCOUNTS,
  URLS,
  authPathFor,
  createContext,
  ensureAdminState,
  launchBrowser,
  looksLikeLogin,
  makeHelpers,
  parseArgs,
  performLoginAs,
} from './record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_DIR = path.join(HERE, 'debug');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// candidate spec helpers  (mirror the selectors used in record.mjs 1:1)
// ---------------------------------------------------------------------------

const role = (r, name, label) => ({ kind: 'role', role: r, name, label: label || `role=${r} name=${name}` });
const text = (name, label) => ({ kind: 'text', name, label: label || `text=${name}` });
const css = (sel, label) => ({ kind: 'css', sel, label: label || `css=${sel}` });
const byLabel = (name, label) => ({ kind: 'label', name, label: label || `label=${name}` });
const placeholder = (name, label) => ({ kind: 'placeholder', name, label: label || `placeholder=${name}` });

function locatorFor(page, c) {
  switch (c.kind) {
    case 'role': return page.getByRole(c.role, { name: c.name });
    case 'text': return page.getByText(c.name);
    case 'label': return page.getByLabel(c.name);
    case 'placeholder': return page.getByPlaceholder(c.name);
    case 'css':
    default: return page.locator(c.sel);
  }
}

// ---------------------------------------------------------------------------
// probe tables — one entry per act, screens in the order the act visits them
// ---------------------------------------------------------------------------

const COMMON_TABLE = [
  css('table', 'any <table>'),
  css('tr', 'any <tr>'),
  role('button', /^\s*Action/i, 'toolbar/row Action'),
  placeholder(/search/i, 'search box'),
];

const PROBES = {
  0: {
    role: 'admin',
    screens: [
      {
        name: 'landing-menu',
        url: URLS.canary,
        scenes: ['s0_1'],
        candidates: [
          role('link', /LO RECRUITING/i),
          text(/^\s*LO RECRUITING\s*$/i),
          text(/My Loan Officer referrals/i),
          text(/Admin - Loan Officer referrals/i),
          text(/Interested Loan Officers/i),
          text(/Recruited Loan Officers/i),
          text(/Loan Officers Obtained from Modex/i),
          css('nav', '<nav>'),
        ],
      },
      {
        name: 'rlo-company',
        url: URLS.rloCompany,
        scenes: ['s0_2', 's0_3'],
        candidates: [
          ...COMMON_TABLE,
          text(/Started date/i),
          text(/Full name/i),
          text(/Social media/i),
          text(/Friendship/i),
          text(/Recruiter/i),
          text(/Not touched/i, 'stats tile / status label'),
          role('link', /Not touched/i, 'stats drill-down link'),
          css('[class*="material-icons"]', 'material icon buttons (view-mode toggles)'),
        ],
      },
      {
        name: 'config',
        url: URLS.config,
        scenes: ['s0_4'],
        candidates: [
          role('tab', /Webinar/i),
          text(/^\s*Webinar\s*$/i),
          text(/Landing Page/i),
          text(/1-1 Meeting using Calendly/i),
          text(/ILO Owner Assignment/i),
          text(/Facebook Ads/i),
        ],
      },
      {
        name: 'modex-data',
        url: URLS.modexData,
        scenes: ['s0_5'],
        candidates: [
          ...COMMON_TABLE,
          role('link', /^\s*View\s*$/i),
          text(/^\s*View\s*$/i),
          text(/Received/i),
          text(/Synced/i),
          text(/Review Similar/i),
        ],
        safeOpens: [
          {
            label: 'MODEX INFORMATION modal (read-only)',
            open: [role('link', /^\s*View\s*$/i), text(/^\s*View\s*$/i)],
            probe: [
              text(/MODEX INFORMATION/i),
              text(/PERFORMANCE/i),
              text(/TRANSACTION SUMMARY/i),
              text(/Total Volume/i),
              text(/Total Count/i),
            ],
          },
        ],
      },
      {
        name: 'associates',
        url: URLS.associates,
        scenes: ['s0_6'],
        note: 'Route is a guess. If it redirects, the nav link is the fallback in record.mjs.',
        candidates: [
          ...COMMON_TABLE,
          role('link', /^\s*Associates\s*$/i),
          text(/^\s*Login\s*$/i, 'impersonation menu item — NEVER clicked by this script'),
        ],
      },
    ],
  },

  1: {
    role: 'luis',
    screens: [
      {
        name: 'rlo-mine',
        url: URLS.rloMine,
        scenes: ['s1_1', 's1_2', 's1_3', 's1_4'],
        candidates: [
          ...COMMON_TABLE,
          text(/^\s*Mine\s*$/i),
          text(/^\s*Company\s*$/i, 'should be ABSENT for inside-only roles'),
          text(/Pending approvals/i),
          text(/^\s*Active\s*$/i),
          text(/^\s*Social media\s*$/i),
          role('button', /^\s*More\s*$/i),
          text(/^\s*More\s*$/i),
          role('button', /^\s*Add\s*$/i),
          text(/^\s*Add\s*$/i),
          text(/^\s*Delete/i, 'should be ABSENT for recruiters on staging'),
          text(/Assign recruiter/i, 'should be ABSENT for recruiters on staging'),
          text(/Recruitable/i, 'the default filter chip that causes "No results"'),
          text(/No results|1-1 of 0/i),
        ],
        safeOpens: [
          {
            label: 'More / additional filters modal (read-only)',
            open: [role('button', /^\s*More\s*$/i), text(/^\s*More\s*$/i)],
            probe: [
              text(/Channel/i),
              text(/Licensed states/i),
              text(/Preferred language/i),
              text(/Friendship/i),
              text(/^\s*Profile\s*$/i),
              text(/Experience/i),
              text(/Personal address state/i),
            ],
          },
        ],
      },
      {
        name: 'rlo-row-controls',
        url: URLS.rloMine,
        scenes: ['s1_5', 's1_7', 's1_8', 's1_9', 's1_10', 's1_11', 's1_12', 's1_13', 's1_14'],
        candidates: [
          text(/^\s*Call\s*$/i),
          text(/Zoom SMS/i),
          text(/^\s*Text\s*$/i),
          css('[class*="material-icons"]', 'note / comment icons live here'),
          text(/Not friend/i),
          text(/Friend requested/i),
          text(/Checked and has social links/i),
          text(/Has social media/i),
          text(/^\s*Not touched\s*$/i),
          text(/^\s*Dialogue\s*$/i),
          role('button', /^\s*Action/i, 'per-row Action'),
        ],
        safeOpens: [
          {
            label: 'row Action menu (read-only dropdown)',
            open: [role('button', /^\s*Action/i), text(/^\s*Action\s*$/i)],
            probe: [
              text(/Assign recruiter/i),
              text(/^\s*Audit log\s*$/i),
              text(/Conversation history/i),
              text(/Add or remove a follow-up flag/i),
              text(/Register for a webinar/i),
              text(/Invite Loan officer to join/i),
              text(/Invite LO to join Marketplace/i),
            ],
          },
          {
            label: 'UPDATE SOCIAL LINKS modal (read-only; do not save)',
            open: [text(/Checked and has social links/i), text(/^\s*Social media\s*$/i)],
            probe: [
              role('button', /Copy Name And NMLS/i),
              text(/Copy Name And NMLS/i),
              text(/Has social media/i),
            ],
          },
          {
            label: 'CALL script modal (read-only; never click Call via my Zoom Phone)',
            open: [text(/^\s*Call\s*$/i)],
            probe: [
              text(/Call via my Zoom Phone/i),
              text(/250\s*bps/i),
              text(/commission/i),
            ],
          },
          {
            label: 'CHANGE STATUS modal (read-only; do NOT submit, do NOT touch filters)',
            open: [text(/^\s*Not touched\s*$/i)],
            probe: [
              text(/CHANGE STATUS/i),
              css('select', 'native select'),
              role('combobox', /.*/, 'combobox'),
              text(/^\s*Dialogue\s*$/i),
              role('button', /^\s*Submit\s*$/i),
            ],
          },
        ],
      },
      {
        name: 'ilo-mine',
        url: URLS.iloMine,
        scenes: ['s1_15'],
        candidates: [
          ...COMMON_TABLE,
          text(/Converted from recruited LO/i),
          text(/Invited to join/i),
          text(/^\s*New\s*$/i),
        ],
      },
    ],
  },

  2: {
    role: 'nocha',
    screens: [
      {
        name: 'ilo-mine',
        url: URLS.iloMine,
        scenes: ['s2_1', 's2_2'],
        candidates: [
          ...COMMON_TABLE,
          text(/^\s*Mine\s*$/i),
          text(/^\s*Company\s*$/i, 'EXPECTED ABSENT — that is the point of s2_1'),
          text(/Invited to join/i),
        ],
      },
      {
        name: 'rlo-mine',
        url: URLS.rloMine,
        scenes: ['s2_3'],
        candidates: [
          text(/^\s*Add\s*$/i, 'EXPECTED ABSENT on staging'),
          text(/^\s*Delete/i, 'EXPECTED ABSENT on staging'),
          text(/Assign recruiter/i, 'EXPECTED ABSENT on staging'),
          role('button', /^\s*Action\s*$/i, 'bulk Action'),
          text(/Pending approvals/i),
        ],
        safeOpens: [
          {
            label: 'bulk Action menu (read-only dropdown)',
            open: [role('button', /^\s*Action\s*$/i), text(/^\s*Action\s*$/i)],
            probe: [
              text(/Update data using Modex/i),
              text(/Import \(csv\)/i),
              text(/Email all/i),
              text(/Create contact list/i),
              text(/Export \(csv\)/i, 'EXPECTED ABSENT for this role'),
            ],
          },
        ],
      },
      { name: 'config', url: URLS.config, scenes: ['s2_4'], candidates: [text(/1-1 Meeting using Calendly/i), text(/^\s*Webinar\s*$/i)] },
      {
        name: 'rlo-pending',
        url: URLS.rloPending,
        scenes: ['s2_5'],
        note: 'URL contains a space; confirm the encoding actually lands on the tab.',
        candidates: [
          ...COMMON_TABLE,
          text(/Check Modex/i),
          text(/Added by LO/i),
          text(/^\s*Approve\s*$/i, 'NEVER clicked by this script'),
        ],
      },
    ],
  },

  3: {
    role: 'licensing',
    screens: [
      {
        name: 'landing-menu',
        url: URLS.canary,
        scenes: ['s3_1'],
        note: 'The finding is an ABSENCE — probing as admin proves nothing. Use --role licensing.',
        candidates: [
          text(/LO RECRUITING/i, 'EXPECTED count 0 for Licensing on staging'),
          css('nav', '<nav>'),
          role('navigation', /.*/, 'role=navigation'),
        ],
      },
      {
        name: 'ilo-mine-blocked',
        url: URLS.iloMine,
        scenes: ['s3_2', 's3_4'],
        note: 'Expect a SILENT REDIRECT. The probe prints the URL it actually landed on.',
        candidates: [
          text(/NMLS status/i),
          text(/License status/i),
          text(/States to sponsor/i),
        ],
      },
    ],
  },

  4: {
    role: 'ken',
    screens: [
      {
        name: 'ilo-company',
        url: URLS.iloCompany,
        scenes: ['s4_1', 's4_2', 's4_4', 's4_8'],
        candidates: [
          ...COMMON_TABLE,
          text(/^\s*Company\s*$/i),
          text(/Paid but not signed/i),
          text(/NMLS sponsored but HR onboarding/i),
          text(/HR completed but NMLS not sponsored/i),
          text(/100% onboarded/i),
          text(/Paid startup fee/i),
          text(/Agreement signed/i),
          text(/Startup fee/i),
          text(/^\s*Onboarding\s*$/i),
          text(/NMLS status/i),
          text(/HR status/i),
          text(/1-1 Onboarding meeting/i),
          text(/^\s*Delete/i, 'company-wide Delete — introduce-only in the video, never clicked'),
        ],
        safeOpens: [
          {
            label: 'row Action menu (read-only dropdown)',
            open: [role('button', /^\s*Action/i), text(/^\s*Action\s*$/i)],
            probe: [
              text(/Assign owner/i),
              text(/^\s*Audit log\s*$/i),
              text(/Invite 1-1 meeting/i),
              text(/Create new account/i),
              text(/Re-generate e-sign documents/i),
              text(/Loan referral/i),
              text(/Create an Incident/i),
            ],
          },
          {
            label: 'bulk Action menu (read-only dropdown)',
            open: [role('button', /^\s*Action\s*$/i)],
            probe: [
              text(/Template settings/i),
              text(/Attendance tracking/i),
              text(/Assign owners/i),
              text(/Export \(csv\)/i, 'EXPECTED ABSENT for HR'),
            ],
          },
        ],
      },
    ],
  },

  5: {
    role: 'maria',
    screens: [
      {
        name: 'ilo-mine',
        url: URLS.iloMine,
        scenes: ['s5_1', 's5_3', 's5_4', 's5_5'],
        candidates: [
          ...COMMON_TABLE,
          text(/^\s*Mine\s*$/i),
          text(/^\s*Company\s*$/i, 'EXPECTED ABSENT for Onboarding Specialist'),
          text(/NMLS status/i),
          text(/License status/i),
          text(/HR status/i),
          text(/1-1 Onboarding meeting/i),
          text(/Attended/i),
          text(/Save \+ Email/i),
        ],
      },
      {
        name: 'config-owner-assignment',
        url: URLS.config,
        scenes: ['s5_2'],
        candidates: [
          role('tab', /ILO Owner Assignment/i),
          text(/ILO Owner Assignment/i),
          text(/^\s*Recruiter\s*$/i),
          text(/Onboarding specialist/i),
          text(/^\s*Support\s*$/i),
        ],
      },
    ],
  },

  6: {
    role: 'accounting',
    screens: [
      {
        name: 'ilo-company',
        url: URLS.iloCompany,
        scenes: ['s6_1'],
        candidates: [
          ...COMMON_TABLE,
          role('button', /^\s*Action\s*$/i, 'bulk Action'),
          text(/Export \(csv\)/i, 'EXPECTED PRESENT only for Accounting — never clicked here'),
        ],
        safeOpens: [
          {
            label: 'bulk Action menu (read-only dropdown; do NOT click Export)',
            open: [role('button', /^\s*Action\s*$/i)],
            probe: [text(/Export \(csv\)/i), text(/Email all/i), text(/Template settings/i)],
          },
        ],
      },
      {
        name: 'referrals',
        url: URLS.referrals,
        scenes: ['s6_2', 's6_3', 's6_4'],
        note: 'Admin - Loan Officer referrals is reached through the menu; this is My referrals.',
        candidates: [
          ...COMMON_TABLE,
          text(/polic/i, 'policy modal opener'),
          text(/120 days/i),
          text(/Zelle/i),
          role('link', /^\s*Edit\s*$/i),
          text(/^\s*Edit\s*$/i),
        ],
      },
    ],
  },

  7: {
    role: 'admin',
    screens: [
      {
        name: 'ilo-company-final',
        url: URLS.iloCompany,
        scenes: ['s7_1', 's7_4'],
        candidates: [
          ...COMMON_TABLE,
          text(/100% onboarded/i),
          text(/Agreement signed/i),
          text(/Paid/i),
        ],
      },
    ],
  },
};

/**
 * Scenes deliberately NOT probed, and why. These are not oversights — do not "fix" them by
 * adding a screen that clicks through.
 */
const NOT_PROBED = {
  s1_6: 'external Modex portal — off-site and off-limits for this tooling (record.mjs opt-in --modex)',
  s3_3: 'production-comparison slide, built in assemble.mjs — no live screen',
  s4_3: 'Re-generate e-sign + send email MUTATES and emails a candidate; only its menu item is probed',
  s4_5: 'Template settings — its bulk-Action menu item is probed; the editor is not opened',
  s4_6: 'Invite 1-1 meeting — its row-Action menu item is probed; opening it would send email',
  s4_7: 'Create new account — its row-Action menu item is probed; the form is not opened',
  s7_2: 'pain-badge montage, cut in assemble.mjs — no live screen',
  s7_3: 'six-lead-sources slide, built in assemble.mjs — no live screen',
};

// ---------------------------------------------------------------------------
// probing
// ---------------------------------------------------------------------------

const pad = (s, n) => String(s).padEnd(n);

async function probeCandidate(page, c) {
  const loc = locatorFor(page, c);
  let count = 0;
  let visible = false;
  let txt = '';
  try {
    count = await loc.count();
    if (count > 0) {
      visible = await loc.first().isVisible().catch(() => false);
      txt = ((await loc.first().innerText({ timeout: 1500 }).catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 70);
    }
  } catch (err) {
    txt = `<error: ${err.message.split('\n')[0].slice(0, 60)}>`;
  }
  return { selector: c.label, count, visible, text: txt };
}

function printRows(rows) {
  const w = Math.min(72, Math.max(...rows.map((r) => r.selector.length), 8));
  console.log(`  ${pad('SELECTOR', w)}  ${pad('COUNT', 6)} ${pad('VIS', 5)} TEXT`);
  for (const r of rows) {
    const flag = r.count === 0 ? '  <-- MISSING' : '';
    console.log(`  ${pad(r.selector.slice(0, w), w)}  ${pad(r.count, 6)} ${pad(r.visible ? 'yes' : 'no', 5)} ${r.text}${flag}`);
  }
}

async function shoot(page, name) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const file = path.join(DEBUG_DIR, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch {
    await page.screenshot({ path: file }).catch(() => {});
  }
  return file;
}

async function main() {
  const args = parseArgs();
  const actId = Number.isInteger(args.act) ? args.act : 0;
  const plan = PROBES[actId];
  if (!plan) throw new Error(`no probe table for --act ${actId} (have ${Object.keys(PROBES).join(',')})`);

  const wantRole = args.role || plan.role;
  const roleStatePath = authPathFor(wantRole);
  const missing = [];

  console.log(`\n=== PROBE act ${actId} — expected session: ${wantRole} (${ACCOUNTS[wantRole]?.role || '?'}) ===`);
  console.log('read-only: no submit / save / delete / export / send / Login is ever clicked');
  if (args.openModals) console.log('--open-modals: whitelisted read-only modals WILL be opened and closed with Escape');

  const browser = await launchBrowser({ slow: args.slow });
  let context;
  try {
    let seed = args.auth;
    let impersonate = false;

    if (wantRole === 'admin') {
      await ensureAdminState(browser, args.auth);
    } else if (fs.existsSync(roleStatePath)) {
      console.log(`[probe] seeding from saved role state ${roleStatePath}`);
      seed = roleStatePath;
    } else if (args.loginAs) {
      await ensureAdminState(browser, args.auth);
      impersonate = true;
    } else {
      await ensureAdminState(browser, args.auth);
      console.warn(`\n!! No ${roleStatePath} and no --login-as: probing as ADMIN.`);
      console.warn('!! Role-scoped differences (missing tabs, missing toolbar buttons, silent');
      console.warn('!! redirects) will NOT be reproduced. Re-run with --login-as for real answers.\n');
    }

    context = await createContext(browser, { storageStatePath: seed }); // no recordVideo: probing
    const page = await context.newPage();
    const h = makeHelpers(page, { actLabel: `probe${actId}` });

    await page.goto(URLS.canary, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(2500);
    if (await looksLikeLogin(page)) throw new Error('seeded state is not authenticated');

    if (impersonate) {
      await performLoginAs(page, h, wantRole, { adminStatePath: args.auth });
      await h.saveRoleState(wantRole);
    }

    for (const screen of plan.screens) {
      console.log(`\n--- screen: ${screen.name}  (scenes ${screen.scenes.join(', ')})`);
      console.log(`    asked for: ${screen.url}`);
      await page.goto(screen.url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch((e) => {
        console.warn(`    goto failed: ${e.message}`);
      });
      await sleep(2800); // GWT builds its shell after DOMContentLoaded
      console.log(`    landed on: ${page.url()}${page.url() !== screen.url ? '   <-- REDIRECTED' : ''}`);
      if (await looksLikeLogin(page)) {
        console.warn('    !! this is the LOGIN screen — the session died, stopping.');
        break;
      }
      if (screen.note) console.log(`    note: ${screen.note}`);

      const rows = [];
      for (const c of screen.candidates) rows.push(await probeCandidate(page, c));
      printRows(rows);
      for (const r of rows) if (r.count === 0) missing.push(`act${actId}/${screen.name}: ${r.selector}`);

      console.log(`    screenshot: ${await shoot(page, `act${actId}-${screen.name}`)}`);

      if (args.openModals && screen.safeOpens?.length) {
        for (const so of screen.safeOpens) {
          console.log(`\n    [safe open] ${so.label}`);
          let opened = false;
          for (const oc of so.open) {
            const loc = locatorFor(page, oc).first();
            if (await loc.isVisible().catch(() => false)) {
              await loc.click({ timeout: 6000 }).catch((e) => console.warn(`      click failed: ${e.message}`));
              opened = true;
              break;
            }
          }
          if (!opened) {
            console.warn('      could not open it — none of the openers were visible');
            continue;
          }
          await sleep(1800);
          const modalRows = [];
          for (const c of so.probe) modalRows.push(await probeCandidate(page, c));
          printRows(modalRows);
          for (const r of modalRows) if (r.count === 0) missing.push(`act${actId}/${screen.name}/${so.label}: ${r.selector}`);
          console.log(`      screenshot: ${await shoot(page, `act${actId}-${screen.name}-${so.label.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`)}`);
          await page.keyboard.press('Escape').catch(() => {});
          await sleep(1200);
        }
      }
    }
  } finally {
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  console.log('\n=== SUMMARY ===');
  if (!missing.length) {
    console.log('every candidate matched at least one node — record.mjs selectors look usable.');
  } else {
    console.log(`${missing.length} candidate(s) matched NOTHING (fix these in record.mjs first;`);
    console.log('some are EXPECTED absent — check the label before "fixing" them):');
    for (const m of missing) console.log(`  - ${m}`);
  }

  const probed = new Set(plan.screens.flatMap((s) => s.scenes));
  const unprobed = Object.entries(NOT_PROBED).filter(([id]) => id.startsWith(`s${actId}_`) && !probed.has(id));
  if (unprobed.length) {
    console.log('\nnot probed on purpose:');
    for (const [id, why] of unprobed) console.log(`  - ${id}: ${why}`);
  }
  console.log(`\nscreenshots: ${DEBUG_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
