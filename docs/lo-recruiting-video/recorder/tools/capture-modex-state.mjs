#!/usr/bin/env node
/**
 * ⚠︎ DEAD END — KEPT ONLY SO NOBODY REBUILDS IT. Verified 04/08/2026: modex.com puts a Cloudflare
 * "Verify you are human" interstitial in front of a Playwright browser and loops on it. Working
 * around bot detection is out of bounds, so this path is closed — not slow, closed. The same run
 * in the user's REAL Chrome loads Modex with no challenge at all, which is the whole point: the
 * block is on automation, not on the account.
 *
 * Do not "fix" this by capturing the screen either. `screencapture -v` records the WHOLE DISPLAY,
 * and on a machine in daily use another window owns the screen the moment you look away — a
 * 42-second take produced zero Modex frames and a full window of the user's private chats instead.
 * macOS has no window-scoped VIDEO capture (`-l` is stills only). If the Modex screen is wanted,
 * the human records those ~40 seconds and hands over the file; the splice machinery for an external
 * clip is already built (expandSplicePlan in record.mjs + seq/durSec in assemble.mjs).
 *
 * ── Original intent, still accurate for any site that does NOT block automation ───────────────
 *
 * Capture a reusable session, ONCE, so the act-1 shoot needs nobody at the keyboard.
 *
 * WHY THIS EXISTS
 * Scene 1.6 is the whole point of the rebuild: the recruiter leaves the app and reads a
 * candidate's production volume off modex.com by hand. To film it, the recording browser must be
 * signed in to Modex — and a Playwright Chromium has none of the real Chrome's autofill. Asking
 * the human to type the password mid-shoot pins them to the keyboard for the entire take and puts
 * a login form (with their email on it) inside the footage. So: log in once here, off camera,
 * save the session, and let the shoot seed it.
 *
 * WHAT THIS SCRIPT WILL NEVER DO
 *   - type, paste, autofill or read a password (the human does the login; we only watch the DOM)
 *   - print cookie/token VALUES (only counts and hostnames)
 *   - mutate anything inside Modex — the optional --probe-nmls step types a licence number into
 *     the search box and reads the result, which is exactly what a recruiter does; nothing else
 *     is clicked. Sync toggles / Remove user / Invite Users are out of bounds, per the shoot brief.
 *
 * USAGE
 *   node tools/capture-modex-state.mjs                        # login only
 *   node tools/capture-modex-state.mjs --probe-nmls 107621     # + report where the numbers render
 *   node tools/capture-modex-state.mjs --timeout 15            # minutes to wait for the human
 *
 * OUTPUT
 *   ../.auth/modex.json   storageState (gitignored, like every other session file here)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchBrowser, createContext } from '../record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RECORDER = path.resolve(HERE, '..');
const STATE_PATH = path.resolve(RECORDER, '../.auth/modex.json');
const LOGIN_URL = 'https://modex.com/login';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = { timeoutMin: 10, probeNmls: null, url: LOGIN_URL };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[i += 1];
    if (a === '--timeout') out.timeoutMin = Number(next()) || 10;
    else if (a === '--probe-nmls') out.probeNmls = String(next() || '').trim();
    else if (a === '--url') out.url = next();
  }
  return out;
}

/**
 * "Is the human through the login?" — asked WITHOUT touching the password field.
 * A password input that is present and visible means we are still on the form; Modex is an SPA,
 * so the URL alone is not trustworthy (it can stay on /login while the shell swaps).
 */
async function isSignedIn(page) {
  const pw = page.locator('input[type="password"]');
  const pwVisible = (await pw.count()) > 0 && (await pw.first().isVisible().catch(() => false));
  if (pwVisible) return false;
  // Guard against "logged out and bounced to a marketing page": require an app-ish surface.
  const url = page.url();
  if (/\/login\b|\/signin\b/i.test(url)) return false;
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('=== CAPTURE MODEX SESSION (one time, off camera) ===');
  console.log(`  A Chromium window is opening at ${args.url}`);
  console.log('  Sign in THERE, by hand. This script never types a password and never reads one.');
  console.log(`  It waits up to ${args.timeoutMin} minute(s), then saves the session and exits.`);
  if (fs.existsSync(STATE_PATH)) {
    console.log(`  NOTE: ${STATE_PATH} already exists and will be OVERWRITTEN on success only.`);
  }

  const browser = await launchBrowser({});
  // No recordVideo: this session must not exist as footage.
  const context = await createContext(browser, {});
  const page = await context.newPage();

  let saved = false;
  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 90_000 }).catch((err) => {
      console.warn(`  navigation warning: ${err.message}`);
    });

    const deadline = Date.now() + args.timeoutMin * 60_000;
    let announced = 0;
    while (Date.now() < deadline) {
      if (await isSignedIn(page).catch(() => false)) {
        // Let the SPA finish writing whatever token it keeps before we snapshot.
        await sleep(3000);
        if (await isSignedIn(page).catch(() => false)) break;
      }
      const waited = Math.round((args.timeoutMin * 60_000 - (deadline - Date.now())) / 1000);
      if (waited - announced >= 20) {
        announced = waited;
        console.log(`  still waiting for the manual login… ${waited}s`);
      }
      await sleep(2000);
    }

    if (!await isSignedIn(page).catch(() => false)) {
      console.error('\n  TIMED OUT — still on the login form. Nothing was written.');
      console.error('  Re-run with a longer --timeout when you are ready to sign in.');
      process.exitCode = 1;
      return;
    }

    console.log(`\n  signed in — landed on ${new URL(page.url()).pathname}`);

    if (args.probeNmls) {
      await probeSearch(page, args.probeNmls);
    }

    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    const state = await context.storageState({ path: STATE_PATH });
    saved = true;
    // Counts and hostnames only — never a value.
    const hosts = [...new Set((state.cookies || []).map((c) => c.domain))].sort();
    console.log(`\n  session saved -> ${STATE_PATH}`);
    console.log(`  ${state.cookies?.length ?? 0} cookie(s) across ${hosts.length} host(s): ${hosts.join(', ')}`);
    console.log(`  ${state.origins?.length ?? 0} origin(s) with local/session storage`);
    console.log('\n  Next: node record.mjs --acts 1 --modex ... (the shoot seeds this file)');
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (!saved && fs.existsSync(STATE_PATH)) {
      console.log(`  (left the previous ${path.basename(STATE_PATH)} untouched)`);
    }
  }
}

/**
 * Read-only reconnaissance so the shoot knows what to drive and what to frame.
 * Types the licence number into whatever looks like the search box and reports the structure of
 * the result. No clicks beyond opening the matching profile, which is the recruiter's own path.
 */
async function probeSearch(page, nmls) {
  console.log(`\n  --- probing the NMLS lookup for ${nmls} (read-only) ---`);
  const candidates = [
    () => page.getByPlaceholder(/search|nmls|name|licen/i).first(),
    () => page.getByRole('searchbox').first(),
    () => page.locator('input[type="search"]').first(),
    () => page.locator('input[name*="search" i]').first(),
  ];
  let box = null;
  for (const build of candidates) {
    const loc = build();
    if (await loc.count().catch(() => 0) && await loc.isVisible().catch(() => false)) { box = loc; break; }
  }
  if (!box) {
    console.log('  no obvious search box on this screen — dumping the visible landmarks instead:');
    const text = await page.locator('body').innerText().catch(() => '');
    console.log(text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 25).map((l) => `    ${l}`).join('\n'));
    return;
  }
  await box.click().catch(() => {});
  await box.fill(nmls).catch(async () => { await box.type(nmls, { delay: 40 }).catch(() => {}); });
  await sleep(2500);
  await page.keyboard.press('Enter').catch(() => {});
  await sleep(5000);
  console.log(`  after search: ${new URL(page.url()).pathname}`);
  const body = await page.locator('body').innerText().catch(() => '');
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  // Surface the money lines, which is what scene 1.6 must frame.
  const money = lines.filter((l) => /\$|volume|units|loans?\b|avg|average/i.test(l)).slice(0, 20);
  console.log('  candidate value lines:');
  console.log(money.length ? money.map((l) => `    ${l}`).join('\n') : '    (none matched — check the screenshot)');
  const shot = path.resolve(RECORDER, 'debug/modex-probe.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  console.log(`  screenshot -> ${shot}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
