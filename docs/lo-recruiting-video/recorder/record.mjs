#!/usr/bin/env node
/**
 * LO Recruiting (old system, www.viet18.com) — feature-tour RECORDER.
 *
 * Pipeline role: step 6/8 of docs/feature-tour-video-playbook.md.
 *   narration.json -> build-narration.mjs -> durations.json -> [THIS FILE] -> markers.json -> assemble.mjs
 *
 * Target app is an OLD GWT / Google-App-Engine internal app: table-heavy DOM, generated class
 * names, no React/Mantine. Every selector here is therefore TEXT-BASED (getByRole/getByText)
 * and every one of them is a CANDIDATE marked `// PROBE:` until `inspect.mjs` has confirmed it.
 *
 * ⚠️ AUTH REALITY (verified 2026-08-04 — read before scheduling a shoot):
 *   The session lives in a server-side session keyed by one cookie, and "Login as <user>"
 *   RE-BINDS that cookie to the impersonated user. Consequences:
 *     - Impersonating BURNS the admin storageState you impersonated from. The file stays
 *       byte-identical (same sha256) but every context seeded from it is now that other user, and
 *       there is no way back to admin without a fresh manual login.
 *     - Therefore ONE admin login yields exactly ONE role switch.
 *     - Per-role storageState files, however, keep working: .auth/viet18-<role>.json replays that
 *       role indefinitely with no login at all.
 *   So the intended workflow is a one-off PROVISIONING pass — for each role: fresh admin login ->
 *   impersonate -> save role state (6 logins, off camera, once) — after which every act and every
 *   re-record runs straight from the saved role states and needs no login whatsoever. Role state
 *   is what this script prefers automatically; pass --force-login-as to impersonate instead (and
 *   expect to be asked for a fresh admin login).
 *
 * HARD RULES (do not "improve" these away):
 *   - This script NEVER types credentials and NEVER reads them from a file, env var or argv.
 *     The human logs in by hand in the visible window; we only wait and then persist the
 *     resulting storageState.
 *   - It never prints the contents of a storageState file (it holds a live session cookie).
 *   - Impersonation ("login as") swaps the session for the WHOLE browser with no way back to
 *     admin (audit §10.3). So each act runs in its OWN context seeded from the saved ADMIN
 *     storageState, does its own login-as, and is thrown away afterwards.
 *
 * Usage:
 *   node record.mjs                                  # all acts, admin auth from .auth/viet18-admin.json
 *   node record.mjs --acts 0,1,2
 *   node record.mjs --acts 4 --role-state            # re-record one act from its saved role state
 *   node record.mjs --auth /abs/path/state.json --out /abs/path/video
 *   node record.mjs --candidate-email mreyes-lo-q7w2m9@mailinator.com --mail-url 'https://www.mailinator.com/v4/public/inboxes.jsp?to=mreyes-lo-q7w2m9'
 *
 * Flags:
 *   --acts 0,1,2         subset of acts to record (default: all)
 *   --auth <path>        admin storageState path (default <videoRoot>/.auth/viet18-admin.json)
 *   --out <dir>          recordVideo dir           (default <recorder>/video)
 *   --markers <path>     markers.json path         (default <recorder>/markers.json)
 *   --fresh-markers      do NOT merge into an existing markers.json. By default a run MERGES by
 *                        act number, so re-recording a subset with --acts keeps the other acts'
 *                        entries instead of discarding them
 *   --durations <path>   narration durations       (default <videoRoot>/durations.json, then
 *                                                   <videoRoot>/audio/durations.json)
 *   --role-state         (now the default when a role state exists) seed each act from
 *                        .auth/viet18-<role>.json and SKIP the on-camera login-as preamble
 *   --force-login-as     ignore saved role states and impersonate again — needs a FRESH admin
 *                        login per role, because impersonating burns the admin state
 *   --provision          capture .auth/viet18-<role>.json for the selected acts and exit
 *                        (one admin login per role, off camera, records nothing)
 *   --trim <sec>         videoTrimSec written into markers.json (default 0 — auth is off camera)
 *   --modex              enable the external-Modex beat in scene 1.6 (opens a 2nd tab => 2nd webm)
 *   --modex-url <url>    where that tab goes (no default; the human logs into Modex himself)
 *   --demo-record <name> a SAFE record for act 1's row beats when the candidate has already been
 *                        converted off the Recruited board. Every row on staging is a real person
 *                        imported via Modex, so name a fixture you are happy to show on camera.
 *   --mail-url <url>     inbox URL for the e-sign beat in s4_3 (2nd tab). Use the Mailinator
 *                        PUBLIC inbox — readable by URL with no session:
 *                        https://www.mailinator.com/v4/public/inboxes.jsp?to=mreyes-lo-q7w2m9
 *   --slow <ms>          Playwright slowMo (default 0)
 *   --login-timeout <m>  minutes to wait for each manual login (default 20). Provisioning needs
 *                        6 logins back to back; a timeout aborts the queue, though re-running
 *                        resumes and only asks for the states still missing.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// paths & constants
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));       // .../recorder
const VIDEO_ROOT = path.resolve(HERE, '..');                     // .../lo-recruiting-video
const AUTH_DIR = path.join(VIDEO_ROOT, '.auth');
/**
 * Narration durations, in lookup order. build-narration.mjs currently writes
 * <videoRoot>/audio/durations.json; the playbook calls it <videoRoot>/durations.json.
 * Accept either (and --durations <path> overrides both).
 */
const DURATIONS_CANDIDATES = [
  path.join(VIDEO_ROOT, 'durations.json'),
  path.join(VIDEO_ROOT, 'audio', 'durations.json'),
];

export const BASE = 'https://www.viet18.com';

/**
 * Routes. VERIFIED 2026-08-03 against staging unless marked otherwise.
 *
 * Route casing is NOT uniform and IS significant:
 *   /lo_recruiting/company          works    (lowercase — matches the tab's data-name)
 *   /lo_recruiting/Company          BOUNCES to /lo_recruiting/Mine
 *   /recruited_loan_officers/Company works   (both casings work here)
 * Tabs whose name contains a space cannot be deep-linked at all (%20 bounces to Mine), so reach
 * every non-default tab with h.clickTab(name) instead of a URL.
 */
export const URLS = {
  login: `${BASE}/login`,
  // Post-login landing used as the "am I authenticated?" canary (verified 03/08/2026).
  canary: `${BASE}/prospects/Mine`,
  rloMine: `${BASE}/recruited_loan_officers/Mine`,
  // VERIFIED 2026-08-03: lowercase matches the tab data-name and works on both pages.
  rloCompany: `${BASE}/recruited_loan_officers/company`,
  iloMine: `${BASE}/lo_recruiting/Mine`,
  iloCompany: `${BASE}/lo_recruiting/company`,
  // VERIFIED 2026-08-03: redirects to /lo_recruiting_config/Webinar (first tab).
  config: `${BASE}/lo_recruiting_config`,
  // VERIFIED 2026-08-04: config tabs are deep-linkable by their data-name —
  // /lo_recruiting_config/<data-name>. Known: one_one_meeting (1-1 Meeting using Calendly),
  // ilo_assignment_owner (ILO Owner Assignment Methods Settings), facebook_ads.
  configOwnerAssignment: `${BASE}/lo_recruiting_config/ilo_assignment_owner`,
  configCalendly: `${BASE}/lo_recruiting_config/one_one_meeting`,
  configWebinar: `${BASE}/lo_recruiting_config/Webinar`,
  modexData: `${BASE}/modex_data`,
  // VERIFIED 2026-08-04 from the LO RECRUITING menu hrefs: ##loan_officer_referrals is the
  // "Admin - Loan Officer referrals" page and it is ADMIN-ONLY (Accounting is silently redirected
  // to /marketplace/Lenders). "My Loan Officer referrals" is a different route.
  referrals: `${BASE}/loan_officer_referrals`,
  myReferrals: `${BASE}/my_loan_officer_referrals`,
  // VERIFIED 2026-08-03: direct route works, no redirect (view BrokerMembersView).
  associates: `${BASE}/associates`,
};

/**
 * The /lo_recruiting_config tabs, VERIFIED 2026-08-04, addressable as
 * /lo_recruiting_config/<data-name>. Deep-linking beats clicking: `a.nav-link[role=tab]` also
 * matches dozens of sidebar entries, so a name lookup can land outside this page's own strip.
 */
export const CONFIG_TABS = {
  'Webinar': 'Webinar',
  "Landing Page's Settings": 'landing_page_setting',
  '1-1 Meeting using Calendly': 'one_one_meeting',
  'ILO Owner Assignment Methods Settings': 'ilo_assignment_owner',
  'Facebook Ads': 'facebook_ads',
};

/** Tab labels reached by click, never by URL (see URLS note). */
export const TABS = {
  mine: 'Mine',
  company: 'Company',
  pendingApprovals: 'Pending approvals',
};

/**
 * VERIFIED 2026-08-03: the app ships GWT debug ids — `#gwt-debug-<name>` — which are stable,
 * semantic and immune to text/i18n drift. Prefer these over text where one exists.
 * Confirmed present on the recruiting boards: lo-recruiting (nav), action (toolbar dropdown,
 * an <a>), add (toolbar <button>), reset (Reset filters <button>), plus every sidebar section.
 */
export const gwt = (name) => `#gwt-debug-${name}`;

/**
 * Build a button-name matcher that tolerates a leading material-icons LIGATURE.
 *
 * VERIFIED 2026-08-04, the hard way: this app renders icons as text inside the button, so the
 * accessible name of the Add form's submit control is "check Submit" — not "Submit". Other
 * examples: "check Save + Email", "phone Call via my Zoom Phone", "add_circle Add". A regex
 * anchored at ^ therefore matches NOTHING, which is exactly why an earlier pass concluded the
 * Add form had no submit button at all. Never anchor a button-name regex at the start.
 */
export const btnName = (...words) => new RegExp(`(?:^|\\s)(?:${words.join('|')})\\s*$`, 'i');

/**
 * Staging test accounts (already committed in docs/lo-recruiting-video-prompt.md).
 * Nothing here is a credential — this script never authenticates as these users, it asks the
 * app to impersonate them.
 *
 * VERIFIED 2026-08-03: the Associates filter is a select2 LABEL/TAG widget (see h.filterGrid).
 * Committing the `email` as a token filters the grid to exactly one row ("1-1 of 1"), whereas the
 * display name matches 15 accounts across pages. So `email` is what gets typed AND how the row is
 * confirmed; `label` is only used for logging and as a fallback.
 */
export const ACCOUNTS = {
  admin: { label: 'Chau Chau', email: '', role: 'Admin' },
  luis: { label: 'Luis Testcase', email: 'luis7522333@viet18.com', role: 'Outside Recruiter' },
  nocha: { label: 'Nocha Hien', email: 'test4591872@test.com', role: 'Inside Recruiter' },
  licensing: { label: 'Chu Con Gi Nua Testcase', email: 'chuconginua@viet18.com', role: 'Licensing' },
  ken: { label: 'Ken Customer', email: 'test10990305@test.com', role: 'HR' },
  maria: { label: 'Maria Testcase', email: 'm123123aria@test.com', role: 'Onboarding Specialist' },
  accounting: { label: 'Admin Request', email: 'admingiftrequestor@viet18.com', role: 'Accounting' },
};

const VIEWPORT = { width: 1920, height: 1080 };
const SCENE_GAP_SEC = 0.6;          // playbook §5
const DEFAULT_NARRATION_SEC = 6;    // used when durations.json has no entry for a scene
// Generous by design: a missed login window aborts the whole provisioning queue, and the human
// is doing 6 of these back to back. Override with --login-timeout <minutes>.
let LOGIN_WAIT_MS = 20 * 60 * 1000;

export const authPathFor = (name) => path.join(AUTH_DIR, `viet18-${name}.json`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// synthetic cursor (Playwright recordVideo captures NO cursor — playbook §6.9)
// ---------------------------------------------------------------------------

/** Runs in page context on every document (addInitScript => survives navigations). */
function cursorInitScript() {
  const ID = '__tour_cursor__';
  let x = -200;
  let y = -200;
  let down = false;

  const ensure = () => {
    let el = document.getElementById(ID);
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.id = ID;
    el.setAttribute('aria-hidden', 'true');
    const s = el.style;
    s.position = 'fixed';
    s.left = '0px';
    s.top = '0px';
    s.width = '22px';
    s.height = '22px';
    s.marginLeft = '-11px';
    s.marginTop = '-11px';
    s.borderRadius = '50%';
    s.border = '2px solid rgba(255,255,255,0.95)';
    s.backgroundColor = 'rgba(255,64,58,0.55)';
    s.boxShadow = '0 0 0 1px rgba(0,0,0,0.5), 0 3px 12px rgba(0,0,0,0.45)';
    s.zIndex = '2147483647';
    s.pointerEvents = 'none';
    s.willChange = 'transform';
    s.transition = 'transform 90ms ease-out, background-color 90ms ease-out';
    (document.body || document.documentElement).appendChild(el);
    return el;
  };

  const paint = () => {
    try {
      const el = ensure();
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${down ? 1.8 : 1})`;
      el.style.backgroundColor = down ? 'rgba(255,64,58,0.9)' : 'rgba(255,64,58,0.55)';
    } catch {
      /* document not ready yet */
    }
  };

  addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; paint(); }, true);
  addEventListener('mousedown', () => { down = true; paint(); }, true);
  addEventListener('mouseup', () => { down = false; paint(); }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint, { once: true });
  } else {
    paint();
  }
  // GWT re-renders whole subtrees; re-attach if our node got wiped.
  setInterval(paint, 400);
}

// ---------------------------------------------------------------------------
// auth handoff
// ---------------------------------------------------------------------------

/** True when the page currently shows the login screen (or anything but the app). */
export async function looksLikeLogin(page) {
  try {
    if (/\/login\b/i.test(page.url())) return true;
    const title = ((await page.title()) || '').toLowerCase();
    if (/\blog\s?in\b|\bsign\s?in\b/.test(title)) return true;
    const pw = page.locator('input[type="password"]');
    if ((await pw.count()) > 0 && (await pw.first().isVisible().catch(() => false))) return true;
    const loginBtn = page.getByRole('button', { name: /^\s*(log ?in|sign ?in)\s*$/i });
    if ((await loginBtn.count()) > 0 && (await loginBtn.first().isVisible().catch(() => false))) return true;
    const loginHead = page.getByRole('heading', { name: /^\s*(log ?in|sign ?in)\s*$/i });
    if ((await loginHead.count()) > 0 && (await loginHead.first().isVisible().catch(() => false))) return true;
    return false;
  } catch {
    return true; // treat "cannot tell" as not-authenticated
  }
}

/** Loud, unmissable console banner for the human sitting in front of the window. */
function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const bar = '='.repeat(width);
  console.log(`\n${bar}`);
  for (const l of lines) console.log(`| ${l.padEnd(width - 4)} |`);
  console.log(`${bar}\n`);
}

/**
 * Poll until the visible window is authenticated. NEVER types anything.
 */
async function waitForLogin(page, timeoutMs = LOGIN_WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastLog = 0;
  while (Date.now() < deadline) {
    if (!(await looksLikeLogin(page))) {
      // Guard against the known login race (audit §C.4.4): confirm it sticks.
      await sleep(1500);
      if (!(await looksLikeLogin(page))) return true;
    }
    const waited = Math.round((timeoutMs - (deadline - Date.now())) / 1000);
    if (waited - lastLog >= 15) {
      lastLog = waited;
      console.log(`[auth] still waiting for manual login… ${waited}s elapsed`);
    }
    await sleep(2000);
  }
  return false;
}

/** Fresh context, optionally seeded + optionally recorded. Cursor is always injected. */
export async function createContext(browser, { storageStatePath, recordDir } = {}) {
  const opts = { viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true };
  if (storageStatePath && fs.existsSync(storageStatePath)) opts.storageState = storageStatePath;
  if (recordDir) {
    fs.mkdirSync(recordDir, { recursive: true });
    opts.recordVideo = { dir: recordDir, size: { ...VIEWPORT } };
  }
  const context = await browser.newContext(opts);
  await context.addInitScript(cursorInitScript);
  return context;
}

/**
 * storageState -> does it still open the app? (off camera: no recordVideo here)
 *
 * `requireAdmin` additionally proves the session is still ADMIN, which is NOT the same question.
 * VERIFIED 2026-08-04 — the impersonation burn: viet18 keeps a server-side session keyed by the
 * cookie, and "Login as <user>" RE-BINDS that same cookie to the impersonated user. So after any
 * impersonation the saved admin storageState is byte-identical on disk (same sha256) yet a fresh
 * context seeded from it comes up as the impersonated user and is bounced off /associates. Only an
 * admin-only capability check can tell the difference — a login-screen check cannot.
 */
export async function verifyState(browser, statePath, { requireAdmin = false } = {}) {
  const ctx = await createContext(browser, { storageStatePath: statePath });
  const page = await ctx.newPage();
  try {
    await page.goto(URLS.canary, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(2500); // GWT boots its shell after DOMContentLoaded
    if (await looksLikeLogin(page)) return false;
    if (!requireAdmin) return true;
    // /associates is admin-only and silently redirects for everyone else.
    await page.goto(URLS.associates, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(6000);
    const onAssociates = /\/associates/.test(page.url());
    if (!onAssociates) {
      console.warn(`[auth] state opens the app but is NOT admin (/associates -> ${page.url()})`);
    }
    return onAssociates && !(await looksLikeLogin(page));
  } catch (err) {
    console.warn(`[auth] state check failed: ${err.message}`);
    return false;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Guarantee a usable ADMIN storageState at `statePath`.
 * Reuses the file when it still works; otherwise hands the window to the human.
 * Nothing about this function ever reads or writes credentials.
 */
export async function ensureAdminState(browser, statePath) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });

  if (fs.existsSync(statePath)) {
    console.log('[auth] found saved admin state — verifying it is still ADMIN (not just logged in)');
    if (await verifyState(browser, statePath, { requireAdmin: true })) {
      console.log('[auth] saved admin state is VALID and still admin — no login needed.');
      return 'reused';
    }
    banner([
      'SAVED ADMIN STATE IS NO LONGER ADMIN',
      '',
      'The file is intact, but its session was re-bound by an impersonation:',
      '"Login as <user>" rebinds the SAME server-side session to that user, so',
      'every context seeded from this file now IS that user. There is no way',
      'back to admin without a fresh login.',
      '',
      'A fresh admin login is required to impersonate anybody new.',
    ]);
  } else {
    console.log('[auth] no saved admin state yet.');
  }

  const ctx = await createContext(browser, {}); // off camera on purpose
  const page = await ctx.newPage();
  await page.goto(URLS.login, { waitUntil: 'domcontentloaded' }).catch(() => {});
  banner([
    'MANUAL LOGIN REQUIRED — look at the Chromium window',
    '',
    `Log in to ${BASE} as the ADMIN account (Chau Chau) YOURSELF.`,
    'This script will never type or read credentials.',
    '',
    'It is polling; recording has NOT started, nothing is on camera.',
    `Timeout: ${Math.round(LOGIN_WAIT_MS / 60000)} minutes.`,
  ]);

  const ok = await waitForLogin(page);
  if (!ok) {
    await ctx.close().catch(() => {});
    throw new Error('Timed out waiting for manual login.');
  }

  await page.goto(URLS.canary, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1500);
  await ctx.storageState({ path: statePath });
  console.log(`[auth] login detected — admin storageState SAVED to ${statePath}`);
  console.log('[auth] (contents are never printed: that file holds a live session cookie)');
  await ctx.close().catch(() => {});
  return 'fresh';
}

// ---------------------------------------------------------------------------
// helpers handed to every scene function
// ---------------------------------------------------------------------------

function loadDurations(explicitPath = null) {
  const tried = explicitPath ? [path.resolve(explicitPath)] : DURATIONS_CANDIDATES;
  for (const p of tried) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      const map = Array.isArray(raw)
        ? Object.fromEntries(raw.map((d) => [d.id, Number(d.seconds ?? d.duration ?? d.dur)]))
        // {id: seconds} (build-narration.mjs) or {id: {seconds}}
        : Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, Number(typeof v === 'object' ? (v.seconds ?? v.duration) : v)]),
        );
      console.log(`[durations] loaded ${Object.keys(map).length} scene durations from ${p}`);
      return map;
    } catch (err) {
      console.warn(`[durations] ${p} is not readable JSON: ${err.message}`);
    }
  }
  console.warn(`[durations] none of [${tried.join(', ')}] found — every scene falls back to ${DEFAULT_NARRATION_SEC}s.`);
  console.warn('[durations] run build-narration.mjs first, or the video will be shorter than the voiceover.');
  return {};
}

/**
 * @param {import('playwright').Page} page
 */
export function makeHelpers(page, { actLabel = 'act?', durations = {}, ctxStart = Date.now() } = {}) {
  let cursor = { x: 960, y: 540 };
  let demoStart = ctxStart;
  const scenes = [];
  const failures = [];
  const warnedDurations = new Set();

  const isLocator = (v) => v && typeof v === 'object' && typeof v.first === 'function';

  /** target := string(css/text-engine) | Locator | Array<string|Locator|() => Locator> */
  async function resolve(target, { timeout = 6000, label = '' } = {}) {
    const cands = Array.isArray(target) ? target : [target];
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const c of cands) {
        let loc;
        try {
          loc = typeof c === 'function' ? c() : isLocator(c) ? c : page.locator(c);
        } catch {
          continue;
        }
        // VERIFIED 2026-08-04: this app ships DUPLICATE ids — e.g. two #gwt-debug-reset nodes
        // where the FIRST one is hidden. Taking .first() blindly would resolve to a hidden
        // element and fail, so scan the first few matches for a visible one.
        let n = 0;
        try {
          n = Math.min(await loc.count(), 5);
        } catch {
          continue;
        }
        for (let i = 0; i < n; i += 1) {
          const nth = loc.nth(i);
          if (await nth.isVisible().catch(() => false)) return nth;
        }
      }
      await sleep(150);
    }
    const hint = label || (typeof cands[0] === 'string' ? cands[0] : `${cands.length} candidate(s)`);
    throw new Error(`no visible candidate for ${hint}`);
  }

  async function boxOf(loc) {
    await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    const box = await loc.boundingBox();
    if (!box) throw new Error('element has no bounding box (hidden / zero-size)');
    return box;
  }

  const clampX = (v) => Math.max(1, Math.min(VIEWPORT.width - 2, v));
  const clampY = (v) => Math.max(1, Math.min(VIEWPORT.height - 2, v));

  /** Interpolated mouse travel so the synthetic cursor is visibly in motion. */
  async function glide(rawX, rawY, { steps } = {}) {
    const x = clampX(rawX);
    const y = clampY(rawY);
    const from = cursor;
    const dist = Math.hypot(x - from.x, y - from.y);
    const n = steps ?? Math.max(6, Math.min(45, Math.round(dist / 18)));
    for (let i = 1; i <= n; i += 1) {
      const t = i / n;
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // easeInOutQuad
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await sleep(12);
    }
    cursor = { x, y };
  }

  async function moveTo(target, opts = {}) {
    // Always go through resolve() so a not-yet-rendered element is waited for, not failed on.
    const loc = await resolve(target, opts);
    const box = await boxOf(loc);
    await glide(box.x + box.width / 2, box.y + Math.min(box.height / 2, 24));
    return loc;
  }

  async function hover(target, opts = {}) {
    return moveTo(target, opts);
  }

  async function click(target, { pause = 320, ...opts } = {}) {
    const loc = await resolve(target, opts);
    try {
      const box = await boxOf(loc);
      await glide(box.x + box.width / 2, box.y + Math.min(box.height / 2, 24));
      await page.mouse.down();
      await sleep(110);
      await page.mouse.up();
    } catch (err) {
      // Never lose a beat over geometry: fall back to a programmatic click.
      console.warn(`[${actLabel}] glide-click fell back to locator.click(): ${err.message}`);
      await loc.click({ timeout: 8000 });
    }
    if (pause) await sleep(pause);
    return loc;
  }

  async function typeInto(target, text, { delay = 55, clear = true } = {}) {
    const loc = await click(target, { pause: 120 });
    if (clear) {
      await page.keyboard.press('ControlOrMeta+A').catch(() => {});
      await page.keyboard.press('Delete').catch(() => {});
    }
    await page.keyboard.type(String(text), { delay });
    return loc;
  }

  /** Nearest scrollable ancestor of `target`; returns an ElementHandle or null. */
  async function scrollableNear(target) {
    let loc;
    try {
      loc = await resolve(target, { timeout: 4000 });
    } catch {
      return null;
    }
    const handle = await loc.elementHandle();
    if (!handle) return null;
    const found = await page.evaluateHandle((el) => {
      let node = el;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        const scrollableY = node.scrollHeight - node.clientHeight > 8 && /auto|scroll/.test(cs.overflowY);
        const scrollableX = node.scrollWidth - node.clientWidth > 8 && /auto|scroll/.test(cs.overflowX);
        if (scrollableY || scrollableX) return node;
        node = node.parentElement;
      }
      return null;
    }, handle);
    const el = found.asElement();
    return el || null;
  }

  /**
   * smoothScroll(target, delta, {axis, steps})
   * target: 'window' | null | Locator | ElementHandle | selector | candidate-array
   * (the page's own `window` object is not reachable from Node — pass the string 'window')
   */
  async function smoothScroll(target, delta, { axis = 'y', steps = 16, gap = 45 } = {}) {
    const chunk = delta / steps;
    // Tolerate being handed the Page itself: `page` has .evaluate() so it used to be mistaken for
    // an ElementHandle, and page.evaluate(fn, [chunk, axis]) then passed the array as the FIRST
    // argument, leaving the destructured pair undefined ("undefined is not iterable").
    const isPage = !!target && typeof target.mouse === 'object';
    const useWindow = !target || target === 'window' || isPage;
    if (useWindow) {
      for (let i = 0; i < steps; i += 1) {
        await page.mouse.wheel(axis === 'x' ? chunk : 0, axis === 'x' ? 0 : chunk);
        await sleep(gap);
      }
      return;
    }
    let handle = target;
    if (typeof handle?.evaluate !== 'function' || typeof handle?.first === 'function') {
      const loc = await resolve(target, { timeout: 5000 });
      handle = (await scrollableNear(loc)) || (await loc.elementHandle());
    }
    if (!handle) {
      await smoothScroll('window', delta, { axis, steps, gap });
      return;
    }
    for (let i = 0; i < steps; i += 1) {
      await handle.evaluate((el, [c, ax]) => {
        if (ax === 'x') el.scrollLeft += c;
        else el.scrollTop += c;
      }, [chunk, axis]);
      await sleep(gap);
    }
  }

  const hold = (seconds) => sleep(Math.max(0, seconds) * 1000);

  const reEscape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * A row of the DATA grid containing `text`.
   * VERIFIED 2026-08-03: recruiting boards + /associates render `table.table-sm.table-hover`
   * with tbody/tr/td; /modex_data renders `div.table-row` / `div.table-cell`. Match either.
   * Scoping to `.table-hover` matters: each view ALSO contains a separate summary/stats <table>
   * (no .table-hover) whose rows would otherwise be selectable.
   */
  function row(text) {
    const re = text instanceof RegExp ? text : new RegExp(reEscape(text), 'i');
    return page.locator('table.table-hover tbody tr, div.table-row').filter({ hasText: re }).first();
  }

  /**
   * A stats-panel drill-down link.
   * VERIFIED 2026-08-03: each tile is `div.col-md-2` whose text reads "<Label> - <N>", and the
   * clickable thing is the NUMBER: `<a class="gwt-Anchor" href="javascript:">`. Targeting the
   * label by role=link matches nothing — that was the original act-0 miss.
   */
  function statLink(label) {
    return page.locator('div[class*="col-md-2"]').filter({ hasText: label }).first().getByRole('link');
  }

  /**
   * The `Select`-style dropdown in a row that owns `option`.
   * VERIFIED 2026-08-03: a row has THREE buttons literally labelled "Select" (priority, channel,
   * experience), so they can only be told apart by the options their dropdown holds. Items are
   * `a.dropdown-item`, PRE-RENDERED in the DOM while closed (hidden) — so a non-zero count never
   * proves a menu is open; only visibility does.
   */
  function dropdownWith(scope, option) {
    return scope.locator('.btn-group, .dropdown').filter({ has: page.getByText(option) }).first();
  }

  /**
   * A dropdown menu item, by the app's own `data-name` attribute.
   * VERIFIED 2026-08-03: items render as
   *   <a data-name="Login" class="dropdown-item" href="javascript:;"> Login</a>
   * Two traps this avoids:
   *  1. The label has a LEADING SPACE (" Login"), so `filter({hasText:/^Login$/})` fails.
   *  2. While the menu is closed it is display:none, so it is NOT in the accessibility tree and
   *     `getByRole('link', …)` returns 0 even though the node exists. `data-name` is a CSS match,
   *     so it resolves whether the menu is open or shut — but still WAIT for visibility before
   *     clicking, because clicking a hidden item is a no-op.
   * Tabs expose the same `data-name` convention.
   *
   * CAUTION — data-name is the BACKEND ENUM for value dropdowns, not the label:
   *   channel:    broker="Wholesale LO"  lender="Retail LO"  broker_owner="Broker/Owner"
   *   experience: Newly_licensed / New="Inexperienced" / Experienced / Team_lead="High producer"
   *   priority:   highest|high|medium|low|lowest
   *   friendship: not_friend|friend_requested|cannot_make_friend_request|friend
   * For ACTION menus data-name does equal the label ("Audit log", "Login", …), except where the
   * company name is interpolated ("Invite Loan officer to join Chau Chau Inc") — use
   * { prefix: true } for those.
   */
  function dropdownItem(scope, name, { prefix = false } = {}) {
    const target = scope || page;
    return target.locator(`a.dropdown-item[data-name${prefix ? '^' : ''}="${name}"]`);
  }

  /**
   * Click a menu item that lives in an ALREADY-OPEN dropdown, scoped to `scope` (normally a row).
   * Waits for visibility first: the node exists while the menu is shut, and clicking a
   * display:none item silently does nothing.
   */
  async function clickMenuItem(scope, name, opts = {}) {
    const item = dropdownItem(scope, name, opts).first();
    await item.waitFor({ state: 'visible', timeout: opts.timeout ?? 8000 });
    return click(() => item, { timeout: opts.timeout ?? 8000 });
  }

  /**
   * VERIFIED 2026-08-03: this GWT app finishes rendering a grid between 5s and 11s after
   * DOMContentLoaded (measured: modex_data pager flips to "1-9 of 9" at ~5.1s; /associates at
   * ~10.9s). A fixed settle therefore measures a half-built DOM and makes real selectors look
   * missing. Wait for the DOM to stop growing instead, then for actual rows.
   */
  async function waitForAppIdle({ timeout = 30_000, quiet = 2, floor = 1200 } = {}) {
    const deadline = Date.now() + timeout;
    await sleep(floor);
    let prev = -1;
    let stable = 0;
    while (Date.now() < deadline) {
      const nodes = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => -1);
      stable = nodes === prev ? stable + 1 : 0;
      prev = nodes;
      if (stable >= quiet) return true;
      await sleep(700);
    }
    console.warn(`[${actLabel}] waitForAppIdle timed out after ${timeout}ms (DOM still changing)`);
    return false;
  }

  /**
   * VERIFIED 2026-08-03: the recruiting boards are real <table> markup (tr/td); /modex_data is a
   * div grid (div.table-row/div.table-cell). Treat either as "rows", and accept a genuine empty
   * state so an empty list is not mistaken for a slow one.
   */
  async function waitForRows({ timeout = 30_000 } = {}) {
    await waitForAppIdle({ timeout });
    const deadline = Date.now() + 15_000;
    let last = { rows: 0, empty: false, pager: '' };
    while (Date.now() < deadline) {
      last = await page.evaluate(() => {
        const view = document.querySelector('[id^="com.lenderrate"]');
        const scope = view || document;
        // VERIFIED 2026-08-03: while a grid loads it renders a PLACEHOLDER <tr> holding just a
        // spinner image — no text. Counting it as a row is what made /associates look like it had
        // 1 row and no controls. Real rows always carry text, the placeholder never does.
        const rows = [...scope.querySelectorAll('tbody tr, div.table-row')]
          .filter((r) => (r.innerText || '').trim().length > 0).length;
        const pager = (document.body.innerText.match(/\d+-\d+ of (over )?[\d,]+/) || [''])[0];
        return {
          rows,
          pager,
          // VERIFIED 2026-08-03: "1-1 of over 0" is the LOADING pager; a genuinely empty list
          // reads "1-1 of 0" (no "over") next to "No results".
          loadingPager: /^1-1 of over 0$/.test(pager),
          empty: /No results/i.test(document.body.innerText),
        };
      }).catch(() => ({ rows: 0, empty: false, pager: '', loadingPager: false }));
      if (!last.loadingPager && (last.rows > 0 || last.empty)) return last;
      await sleep(500);
    }
    console.warn(`[${actLabel}] waitForRows gave up (rows=${last.rows} pager="${last.pager}")`);
    return last;
  }

  /**
   * VERIFIED 2026-08-03: on a COLD navigation the GWT router bounces a deep-linked tab back to
   * the view's default tab (/recruited_loan_officers/Company -> /Mine on the first goto of a
   * fresh context, but not on a warm second goto). So navigate, and if we got bounced, navigate
   * once more now that the app shell is up.
   */
  async function goto(url, { rows = true, retryBounce = true } = {}) {
    const full = url.startsWith('http') ? url : `${BASE}${url}`;
    await page.goto(full, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (rows) await waitForRows(); else await waitForAppIdle();
    if (await looksLikeLogin(page)) {
      throw new Error(`session lost — ${full} rendered the login screen`);
    }
    if (retryBounce && page.url() !== full && page.url().replace(/\/$/, '') !== full.replace(/\/$/, '')) {
      console.log(`[${actLabel}] cold-load bounced ${full} -> ${page.url()}; retrying warm`);
      await page.goto(full, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      if (rows) await waitForRows(); else await waitForAppIdle();
    }
    return page.url();
  }

  /**
   * Type a term into the grid's search box and commit it.
   *
   * VERIFIED 2026-08-03 — this box is a select2 TOKEN/TAG field, not a text search, and it only
   * commits when select2 has produced a suggestion to accept:
   *   click -> keyboard.type (real key events) -> WAIT for li.select2-results__option (~2s,
   *   fetched asynchronously) -> click that option
   * The committed value becomes a chip ("×luis testcase", lower-cased) and the grid re-queries.
   * What does NOT work: locator.fill() (text appears, but select2 never sees the keystrokes);
   * typing then pressing Enter immediately (nothing is highlighted yet, so Enter is a no-op) —
   * this is the single most confusing behaviour on the page. Do not clear with ControlOrMeta+A /
   * Delete either; remove existing chips via their own × control.
   * Chips AND together, which is how a unique row is obtained (a name alone matches many).
   *
   * The results container's id is `select2-labels-ue-results` — i.e. this widget filters by
   * LABELS. That is exactly the documented `?labels=` defect behind scene s1_3: choosing a
   * suggestion narrows by label instead of searching, which is why it can return "No results"
   * for a record that plainly exists.
   */
  async function filterGrid(term, { clearTokens = true, timeout = 25_000 } = {}) {
    if (clearTokens) {
      const removers = page.locator('.select2-selection__choice__remove');
      for (let i = await removers.count(); i > 0; i -= 1) {
        const x = removers.first();
        if (!(await x.isVisible().catch(() => false))) break;
        await withGridUpdate(() => x.click({ timeout: 5000 })).catch(() => {});
      }
    }
    // VERIFIED 2026-08-03: once a chip exists select2 REMOVES the placeholder attribute, so a
    // placeholder locator only works for the first token. The labels widget is the only select2
    // container that keeps an `input.select2-search__field` in the DOM while closed (the Branch /
    // Roles / language single-selects create theirs on open), so anchor on that container —
    // clicking it focuses the inner input, whose own box can be ~0px wide and thus "invisible".
    await click([
      () => page.locator('.select2-container:has(input.select2-search__field)').first(),
      () => page.getByPlaceholder(/Name, ?Email|Type any text/i),
    ], { timeout: 15_000, pause: 150 });
    await page.keyboard.type(String(term), { delay: 60 });

    // Not every grid uses the select2 label widget: the ILO page's box is a plain text search
    // ("Type any text to search..."). Adapt — commit a suggestion when one is offered, otherwise
    // fall back to a plain Enter.
    const options = page.locator('li.select2-results__option')
      .filter({ hasNotText: /^\s*(Searching|Loading|Please)/i });
    const gotSuggestion = await options.first().waitFor({ state: 'visible', timeout })
      .then(() => true).catch(() => false);
    if (gotSuggestion) {
      // Prefer an EXACT (case-insensitive) match over the first suggestion. Suggestions render
      // lower-cased and a term can return several: searching "Maria" offers five, one of which is
      // a decoy account literally named "maria inactive and unmark". Taking the first match on a
      // prefix basis is how the wrong account gets picked — so match the whole token when we can.
      let option = options.filter({ hasText: new RegExp(`^\\s*${reEscape(term)}\\s*$`, 'i') }).first();
      if (!(await option.count())) {
        const n = await options.count();
        if (n > 1) {
          const texts = await options.allInnerTexts().catch(() => []);
          console.warn(`[${actLabel}] no exact suggestion for "${term}"; ${n} offered `
            + `(${texts.map((t) => t.replace(/\s+/g, ' ').trim()).slice(0, 5).join(' | ')}) — taking the first`);
        }
        option = options.first();
      }
      await withGridUpdate(() => click(() => option, { timeout: 10_000 }));
    } else {
      console.log(`[${actLabel}] no select2 suggestion for "${term}" — committing with Enter (plain text search)`);
      await withGridUpdate(() => page.keyboard.press('Enter'));
    }
    return page.locator('.select2-selection__choice').filter({ hasText: new RegExp(reEscape(term), 'i') });
  }

  /**
   * Close whatever transient UI is open: modal first, then any open dropdown.
   *
   * VERIFIED 2026-08-04: pressing Escape does NOT close these modals — `div.modal.show` stays up
   * and then swallows every subsequent click ("<div class='modal show'> intercepts pointer
   * events"), so one un-closed modal would cascade into every later scene. The real control is
   * `button.close[data-dismiss="modal"]` (label "×"). Bootstrap dropdowns, by contrast, do close
   * on Escape.
   */
  async function dismiss({ timeout = 8000 } = {}) {
    let closed = false;
    for (let i = 0; i < 3; i += 1) {
      const modals = page.locator('div.modal.show');
      if (!(await modals.count())) break;
      const modal = modals.last();
      try {
        await click([
          () => modal.locator('button.close[data-dismiss="modal"]').first(),
          () => modal.locator('button.close').first(),
          () => modal.getByRole('button', { name: btnName('Cancel', 'Close') }).first(),
        ], { timeout, pause: 200 });
        closed = true;
      } catch (err) {
        console.warn(`[${actLabel}] could not close a modal: ${err.message}`);
        break;
      }
      await page.locator('div.modal.show').last().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    }
    // Dropdowns do respond to Escape.
    if (await page.locator('.dropdown-menu.show').count()) {
      await page.keyboard.press('Escape').catch(() => {});
    }
    return closed;
  }

  /** Cheap fingerprint of the current grid: pager + row count + first row's text. */
  async function gridSignature() {
    return page.evaluate(() => {
      const view = document.querySelector('[id^="com.lenderrate"]') || document;
      const rows = [...view.querySelectorAll('tbody tr, div.table-row')]
        .filter((r) => (r.innerText || '').trim());
      const pager = (document.body.innerText.match(/\d+-\d+ of (over )?[\d,]+/) || [''])[0];
      return `${pager}|${rows.length}|${(rows[0]?.innerText || '').replace(/\s+/g, ' ').slice(0, 90)}`;
    }).catch(() => '');
  }

  /**
   * Run an action that refreshes the grid IN PLACE (filter, search, tab switch, page change) and
   * wait for the grid to actually change.
   *
   * VERIFIED 2026-08-03 — why this exists: after such an action the PREVIOUS rows stay on screen
   * with the previous pager while the request is in flight, so waitForRows() is satisfied
   * immediately by stale content and the next step reads the old list. That is what made an
   * Associates name filter look like it had not applied (still "1-10 of over 100", 11 rows) and
   * it would have silently corrupted every filter-dependent scene.
   */
  async function withGridUpdate(action, { timeout = 25_000 } = {}) {
    const before = await gridSignature();
    await action();
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await sleep(400);
      const now = await gridSignature();
      if (now && now !== before) {
        await waitForRows();
        return true;
      }
    }
    console.warn(`[${actLabel}] grid did not change within ${timeout}ms — continuing with what is on screen`);
    await waitForRows();
    return false;
  }

  /**
   * VERIFIED 2026-08-03: tabs are <a role="tab" href="javascript:" aria-label="…" data-name="…">
   * inside div.tab-container > nav[role=tablist]. Deep-linking a tab is unreliable (the
   * "Pending approvals" segment contains a space and %20 bounces to Mine), so CLICK the tab.
   * Bonus: the click is what a real user does, which is better footage.
   *
   * CASING TRAP: the Company tab is `aria-label="company"` while its visible text is "Company",
   * and aria-label wins for the accessible name. Pass a STRING here (Playwright matches strings
   * case-insensitively); a case-sensitive /^Company$/ regex matches nothing. Same reason the URL
   * segment is lowercase `company`.
   */
  async function clickTab(name, { grid = true } = {}) {
    // SAFETY (verified 2026-08-04): role=tab is NOT unique to the grid's tab strip — the app also
    // marks nav/sidebar entries as tabs, including "Log out". Always scope to the grid strip
    // (div.tab-container > nav[role=tablist]) so a name collision can never click something
    // destructive.
    const strip = page.locator('div.tab-container nav[role="tablist"]').first();
    const tab = strip.getByRole('tab', { name });
    // VERIFIED 2026-08-04: the /lo_recruiting_config tabs live in the same div.tab-container
    // strip (data-name: webinar-ish, one_one_meeting, ilo_assignment_owner, facebook_ads) but
    // that page has no grid, so pass { grid: false } there or withGridUpdate burns its timeout.
    if (grid) {
      await withGridUpdate(() => click(() => tab.first(), { timeout: 15_000 }));
    } else {
      await click(() => tab.first(), { timeout: 15_000 });
      await waitForAppIdle();
    }
    return tab.first();
  }

  /** Optional beat: logs and continues instead of failing the scene. */
  async function optional(label, fn) {
    try {
      await fn();
      return true;
    } catch (err) {
      console.warn(`[${actLabel}]   optional "${label}" skipped: ${err.message}`);
      return false;
    }
  }

  function narrationSec(id) {
    const v = durations[id];
    if (Number.isFinite(v) && v > 0) return v;
    if (!warnedDurations.has(id)) {
      warnedDurations.add(id);
      console.warn(`[${actLabel}] no narration duration for ${id} — holding ${DEFAULT_NARRATION_SEC}s`);
    }
    return DEFAULT_NARRATION_SEC;
  }

  /** playbook §5 pacing: log offset, run, then hold to max(action, narration) + gap. */
  async function scene(id, fn) {
    const offset = round2((Date.now() - demoStart) / 1000);
    scenes.push({ id, offset });
    const t0 = Date.now();
    let status = 'ok';
    try {
      await fn();
    } catch (err) {
      status = `FAILED (${err.message})`;
      failures.push({ id, error: err.message });
    }
    const spent = (Date.now() - t0) / 1000;
    const target = Math.max(spent, narrationSec(id)) + SCENE_GAP_SEC;
    if (target > spent) await sleep((target - spent) * 1000);
    console.log(`[${actLabel}] ${id} offset=${offset}s ${status}`);
  }

  /** Persist the CURRENT session as .auth/viet18-<name>.json (never prints the contents). */
  async function saveRoleState(name) {
    const target = authPathFor(name);
    // HARD GUARD: an existing admin state is never overwritten. Losing it costs a manual
    // login, and after an impersonation the live session is NOT admin any more — writing it
    // over viet18-admin.json would silently downgrade the file to a role session.
    if (name === 'admin' && fs.existsSync(target)) {
      console.log(`[${actLabel}] admin state already on disk — refusing to overwrite ${target}`);
      return target;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.context().storageState({ path: target });
    console.log(`[${actLabel}] session state saved to ${target}`);
    return target;
  }

  const api = {
    page,
    // pacing / bookkeeping
    scene,
    hold,
    startAct: () => { demoStart = Date.now(); return demoStart; },
    get demoStart() { return demoStart; },
    get trimSec() { return round2((demoStart - ctxStart) / 1000); },
    scenes,
    failures,
    // interaction
    resolve,
    moveTo,
    hover,
    glide,
    click,
    typeInto,
    smoothScroll,
    scrollableNear,
    goto,
    clickTab,
    waitForAppIdle,
    waitForRows,
    withGridUpdate,
    gridSignature,
    filterGrid,
    dismiss,
    row,
    statLink,
    dropdownWith,
    dropdownItem,
    clickMenuItem,
    optional,
    sleep,
    // session
    saveRoleState,
  };

  /** admin -> Associates -> search -> row Action -> Login (see performLoginAs). */
  api.loginAs = (roleKey, opts) => performLoginAs(page, api, roleKey, opts);

  return api;
}

// ---------------------------------------------------------------------------
// impersonation: admin -> Associates -> search -> row Action -> Login
// ---------------------------------------------------------------------------

/** Best-effort "who am I" label, only used for logging / verifying the swap. */
async function currentUserLabel(page) {
  const cands = [
    // PROBE: the header account element's markup is still unidentified. This is LOG-ONLY (it
    // just labels the session in the console and gives loginAs a change signal), so a miss is
    // harmless — never build a click on it.
    () => page.locator('[class*="user"], [class*="account"], header').first(),
  ];
  for (const c of cands) {
    try {
      const t = (await c().innerText({ timeout: 1500 })) || '';
      if (t.trim()) return t.trim().slice(0, 80).replace(/\s+/g, ' ');
    } catch {
      /* ignore */
    }
  }
  return '';
}

/**
 * Perform the in-app impersonation. Saves the admin state first, because after this the
 * whole browser session belongs to the impersonated user and there is NO way back.
 */
export async function performLoginAs(page, h, roleKey, { adminStatePath } = {}) {
  const acct = ACCOUNTS[roleKey];
  if (!acct) throw new Error(`unknown role "${roleKey}"`);

  // There is NO way back to admin after this, so make sure admin is on disk first.
  if (!fs.existsSync(adminStatePath || authPathFor('admin'))) {
    await h.saveRoleState('admin');
  }

  const before = await currentUserLabel(page);

  // 1) Associates screen. VERIFIED 2026-08-03: /associates loads directly, no redirect
  // (view root com.lenderrate.client.view.user.broker.BrokerMembersView). The grid needs
  // ~11s, which h.goto() now waits for explicitly.
  await h.goto(URLS.associates);

  // 2) Filter the grid by the DISPLAY NAME (see the ACCOUNTS note: an email does not filter).
  // VERIFIED 2026-08-03: a single EMAIL token resolves to exactly one row ("1-1 of 1"), while a
  // display-name token matches 15 accounts spread over pages. So filter by email and nothing else.
  await h.filterGrid(acct.email || acct.label);

  // 3) Row Action menu on that account's row, then "Login".
  //
  // SAFETY (verified 2026-08-03): every row's Action dropdown is PRE-RENDERED in the DOM while
  // closed, so `getByText(/^Login$/)` matches one hidden item PER ROW (10 on a default page) and
  // an unscoped `.last()` would impersonate whichever account happens to sit last. Worse, that
  // same dropdown contains `Delete` two items below `Login`. Both the Action button and the Login
  // item are therefore scoped to the matched row, and the row itself is matched on the account's
  // unique search key.
  // Identify the row by EMAIL (unique, and present in the filtered row's text). If the email is
  // not visible in the row, fall back to "the filter left exactly one data row" — but never pick
  // arbitrarily out of several, because the item we are about to click swaps the whole session
  // and sits next to Delete.
  let target = h.row(acct.email);
  if ((await target.count()) === 0) {
    const dataRows = page.locator('table.table-hover tbody tr').filter({ hasText: /\S/ });
    const n = await dataRows.count();
    const named = dataRows.filter({ hasText: new RegExp(acct.label, 'i') });
    if ((await named.count()) === 1) {
      target = named.first();
    } else if (n === 1) {
      target = dataRows.first();
    } else {
      throw new Error(`could not identify a unique Associates row for ${acct.label} (${n} data rows after filtering) — refusing to guess which account to impersonate`);
    }
  }
  await h.click(() => target.getByRole('button', { name: /^\s*Action\s*$/i }), { timeout: 15_000 });
  await h.hold(1);
  // VERIFIED 2026-08-03: the item is <a data-name="Login" class="dropdown-item"> — matched by
  // data-name (see h.dropdownItem), because its text has a leading space and, while the menu is
  // shut, it is display:none and thus invisible to role-based locators.
  const loginItem = h.dropdownItem(target, 'Login').first();
  await loginItem.waitFor({ state: 'visible', timeout: 10_000 });
  await h.click(() => loginItem, { timeout: 10_000 });

  // 4) Wait for the session swap to settle.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(1500);
    if (await looksLikeLogin(page)) continue;
    const after = await currentUserLabel(page);
    if (!before || !after || after !== before) break;
  }
  console.log(`[login-as] now impersonating ${acct.label} (${acct.role})`);
}

// ---------------------------------------------------------------------------
// Add-form driver — exported so a diagnostic drives the SHIPPING routine, not a copy
// ---------------------------------------------------------------------------

/**
 * VERIFIED 2026-08-04: the Add form is a FULL-PAGE view, not a modal. Clicking Add navigates to
 * ?_e=new and mounts a SECOND view root — `RecruitedLoanOfficerView` (singular) — while the list's
 * `RecruitedLoanOfficersView` (plural) stays in the DOM but hidden. Scope here or you read the list.
 * Fields carry real ids; "(optional)" in the label is the ONLY marker of optionality.
 *   #first_name First name (REQ) · #last_name · #email (REQ) · #phone · #nmls
 *   #closed_loan_since_2021 Career Production (REQ) · #mailing_street (REQ)
 *   #recruiter Recruiter — twitter-typeahead (.tt-input; a sibling .tt-hint shadow input exists)
 *   Licensed states / States to sponsor / Preferred languages — REQUIRED select2 multis, no id
 *   Loan officer channel — select2 over <select id="channel">
 *   Experience — a BUTTON GROUP, not a field
 */
export const ADD_FORM_ROOT = '[id$="RecruitedLoanOfficerView"]';

/** Open the create form from the board and wait until it is really interactive. */
export async function openAddForm(page, h) {
  await h.goto(URLS.rloMine);
  await h.click(['#gwt-debug-add', () => page.getByRole('button', { name: /^\s*Add\s*$/i })], { timeout: 15_000 });
  await h.waitForAppIdle();
  const form = page.locator(ADD_FORM_ROOT);
  await form.first().waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('#gwt-debug-submit').waitFor({ state: 'visible', timeout: 25_000 });
  return form;
}

/**
 * Click the form's submit control until the form actually goes away.
 *
 * VERIFIED LIVE 2026-08-04 by watching the network: submitting is a TWO-CLICK flow.
 *   click 1 -> POST /exec/FindOp — an async DUPLICATE-EMAIL check:
 *              SELECT * FROM LORecruiting WHERE (labels = _active:true AND labels = _email:<email>)
 *              with _exact:true. The form then just sits there: no save, no navigation, and
 *              NOTHING on screen.
 *   click 2 -> POST /exec/SaveOp with the full payload (including duplicated:false, the dedup
 *              result) and navigates back to the board.
 * That silent first click is what made two shoots look like a rejected submit. The oracle is the
 * form unmounting, so click until #gwt-debug-submit detaches.
 *
 * ⚠️ This form NEVER renders a validation message. Verified after a genuinely rejected submit:
 * no .invalid-feedback, no .alert, no toast, no red borders, nothing focused — the only reliable
 * signal that anything worked is whether the record exists afterwards. Do not add error-text
 * parsing here expecting it to fire.
 */
export async function submitAddForm(page, h, { confirm = false, attempts = 3 } = {}) {
  const submitBtn = ['#gwt-debug-submit',
    () => page.locator(ADD_FORM_ROOT).getByRole('button', { name: btnName('Submit') }).first()];
  for (let i = 1; i <= attempts; i += 1) {
    await h.click(submitBtn, { timeout: 10_000 });
    if (confirm) {
      await h.optional('confirm the submission', async () => {
        const btn = page.getByRole('button', { name: btnName('Confirm') }).first();
        await btn.waitFor({ state: 'visible', timeout: 4000 });
        await h.click(() => btn, { timeout: 6000 });
      });
    }
    const gone = await page.locator('#gwt-debug-submit')
      .waitFor({ state: 'detached', timeout: 12_000 }).then(() => true).catch(() => false);
    if (gone) return true;
    if (i < attempts) {
      console.log(`[add-form] submit ${i} did not save (click 1 only runs the duplicate check) — clicking again`);
    }
  }
  return false;
}

/**
 * Leave the create form WITHOUT saving.
 * VERIFIED 2026-08-04: `button#gwt-debug-cancel` ("Cancel", class "btn btn-secondary btn-lg mr-1")
 * sits beside the submit button. Used by the demonstration branch of s1_4, which must never reach
 * the save phase.
 */
export async function cancelAddForm(page, h) {
  await h.click(['#gwt-debug-cancel',
    () => page.locator(ADD_FORM_ROOT).getByRole('button', { name: btnName('Cancel') }).first(),
  ], { timeout: 10_000 });
  await page.locator('#gwt-debug-submit')
    .waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
  await h.dismiss();
  await h.waitForAppIdle();
}

/**
 * Re-assign a record's recruiter from the board toolbar.
 *
 * VERIFIED 2026-08-04: needed because the create form does NOT keep the Recruiter typed into it —
 * the record came back owned by "Manh Admin" (auto-assigned) no matter what the field said. The
 * modal holds `select#recruiter` (a select2 whose option text is "<name> (Outside recruiter)") and
 * a checkbox labelled "Overwrite the current recruiter" whose id is a generated gwt-uid, so it is
 * matched by that label. Ticking it is MANDATORY here: without it the assignment only applies to
 * records that have no recruiter yet, and this one already has one.
 */
export async function assignRecruiter(page, h, row, recruiterLabel) {
  await row.locator('input[type="checkbox"]').first().check({ timeout: 8000 });
  await h.click(['#assign-recruiter'], { timeout: 10_000 });
  const modal = page.locator('.modal.show');
  await modal.first().waitFor({ state: 'visible', timeout: 10_000 });
  // The recruiter select2 lists 51 people, so TYPE to narrow before picking — typing
  // "Luis Testcase" reduces it to the single "Luis Testcase 635211 (Outside recruiter)".
  await h.click(() => modal.locator('.select2-selection').first(), { timeout: 8000 });
  await page.keyboard.type(recruiterLabel, { delay: 60 });
  const option = page.locator('li.select2-results__option').filter({ hasText: new RegExp(recruiterLabel, 'i') }).first();
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  await h.click(() => option, { timeout: 10_000 });

  // "Overwrite the current recruiter" — its real <input> is visually hidden behind custom styling,
  // so a normal click/check cannot reach it. Click the LABEL text, then force-check as a fallback,
  // and assert the state: skipping this silently leaves the record with its auto-assigned owner.
  const overwrite = modal.locator('input[type="checkbox"]').first();
  await h.optional('tick "Overwrite the current recruiter"', () =>
    h.click(() => modal.getByText(/Overwrite the current recruiter/i).first(), { timeout: 6000 }));
  if (!(await overwrite.isChecked().catch(() => false))) {
    await overwrite.check({ force: true, timeout: 6000 }).catch(() => {});
  }
  if (!(await overwrite.isChecked().catch(() => false))) {
    throw new Error('could not tick "Overwrite the current recruiter" — the reassignment would be a no-op');
  }
  await h.click(() => modal.getByRole('button', { name: btnName('Submit') }).first(), { timeout: 8000 });
  await h.waitForAppIdle();
  await h.dismiss();
}

/** Everything the app is complaining about, plus which required groups are still empty. */
export async function captureAddFormState(page) {
  return page.evaluate((rootSel) => {
    const root = document.querySelector(rootSel) || document;
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
    const txt = (el) => ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
    const errorSel = ['.invalid-feedback', '.is-invalid', '.error', '.has-error', '.text-danger',
      '.alert', '.toast', '[role="alert"]', '.help-block', '.validation-message'].join(',');
    const errors = [...document.querySelectorAll(errorSel)]
      .filter((e) => vis(e) && txt(e))
      .map((e) => ({ where: `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(/\s+/).slice(0, 2).join('.')}`, text: txt(e).slice(0, 300) }));
    const emptyRequired = [];
    for (const g of root.querySelectorAll('.form-group')) {
      const lbl = txt(g.querySelector('label'));
      if (!lbl || /\(optional\)/i.test(lbl) || !vis(g)) continue;
      const s2 = g.querySelector('.select2-container');
      const inp = g.querySelector('input:not(.select2-search__field):not(.tt-hint), select, textarea');
      let val = '';
      if (s2) {
        val = [...g.querySelectorAll('.select2-selection__choice')].map((e) => txt(e).replace(/×/g, '')).join(',')
          || (g.querySelector('.select2-selection__rendered')?.getAttribute('title') || '');
      } else if (inp && inp.tagName === 'SELECT') val = inp.options[inp.selectedIndex]?.text || '';
      else if (inp) val = inp.value || '';
      else if (g.querySelector('button')) {
        val = [...g.querySelectorAll('button')].filter((x) => /active|primary/.test(x.className)).map(txt).join(',');
      }
      if (!String(val).trim()) emptyRequired.push(lbl.slice(0, 70));
    }
    return {
      url: location.href,
      stillOnForm: !!document.querySelector('#gwt-debug-submit'),
      errors,
      emptyRequired,
      modals: [...document.querySelectorAll('.modal.show')].map((m) => txt(m).slice(0, 300)),
    };
  }, ADD_FORM_ROOT);
}

/**
 * Log what the app said and save a screenshot before failing.
 * Permanent part of the ship path: a rejected submit must explain itself in the shoot log so a
 * separate diagnostic round is never needed again.
 */
export async function reportAddFormRejection(page, tag = 'add-form-rejected') {
  const state = await captureAddFormState(page).catch(() => null);
  console.error('--- Add form state after the rejected submit ---');
  if (!state) {
    console.error('  (could not read the form state)');
  } else {
    console.error(`  url: ${state.url}   still on the form: ${state.stillOnForm}`);
    if (state.errors.length) {
      console.error('  APP SAYS:');
      for (const e of state.errors) console.error(`    [${e.where}] ${e.text}`);
    } else {
      console.error('  APP SAYS: (no visible error element found)');
    }
    if (state.emptyRequired.length) {
      console.error(`  still-empty required groups (${state.emptyRequired.length}):`);
      for (const l of state.emptyRequired) console.error(`    - ${l}`);
    }
    for (const m of state.modals) console.error(`  modal: ${m}`);
  }
  try {
    const file = path.join(HERE, 'debug', `${tag}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    console.error(`  screenshot: ${file}`);
  } catch { /* best effort */ }
  return state;
}

/**
 * Fill the create form. Does NOT perform the final submit — the caller does, so the
 * candidate-email guard stays in the scene.
 *
 * `prematureSubmits` keeps the storyboard beat: the form reveals only ONE new error per attempt,
 * so s1_4 submits early twice on purpose. A diagnostic can turn it off.
 *
 * VERIFIED 2026-08-04 by dry-running this read-only and reading every required field back. Two
 * traps: (1) choosing California pulls in a cascade of extra REQUIRED per-state questions
 * (Indiana/California license type, CA-DRE, real-estate) while TEXAS pulls in none; (2) the mailing
 * block collapses while "Same as personal address" is checked (default) — #mailing_city and
 * #mailing_zip exist but stay HIDDEN, so only "Mailing street address" can be filled.
 */
export async function fillAddForm(page, h, candidate = {}, { prematureSubmits = true, skipEmail = false } = {}) {
  const fullName = candidate.name || 'Marcus Reyes';
  const form = page.locator(ADD_FORM_ROOT);
  const group = (labelRe) => form.locator('.form-group').filter({ hasText: labelRe }).first();
  const pickOption = async (labelRe, option) => {
    await h.click(() => group(labelRe).locator('.select2-selection').first(), { timeout: 6000 });
    await h.click(() => page.locator('li.select2-results__option')
      .filter({ hasText: new RegExp(`^\\s*${option}\\s*$`, 'i') }).first(), { timeout: 8000 });
  };
  // btnName matters: a plain /Experienced/i also matches "Inexperienced" right beside it.
  const pickButton = (labelRe, name) =>
    h.click(() => group(labelRe).getByRole('button', { name: btnName(name) }).first(), { timeout: 6000 });

  await h.optional('first name', () => h.typeInto(['#first_name'], fullName.split(' ')[0]));
  await h.optional('last name', () => h.typeInto(['#last_name'], fullName.split(' ').slice(1).join(' ')));

  // The premature submits are the scene's evidence, and they are VISUALLY INERT by nature: the app
  // shows no error, no highlight, no message. So click ONCE (attempts:1 — never let a premature
  // click stumble into the save phase), leave the cursor resting on the button where the glide
  // click left it, and hold long enough that a viewer sees the click land and the page not react.
  // No synthetic annotation and no fake error: the emptiness IS the evidence.
  const prematureSubmit = async (n) => {
    await submitAddForm(page, h, { attempts: 1 });
    await h.moveTo(['#gwt-debug-submit'], { timeout: 5000 }).catch(() => {});
    await h.hold(4);
    console.log(`[add-form] premature submit ${n}: no error shown (expected — this form never renders one)`);
  };
  if (prematureSubmits) await h.optional('premature submit 1', () => prematureSubmit(1));
  await h.optional('phone', () => h.typeInto(['#phone'], candidate.phone || '(444) 433-3444'));
  if (prematureSubmits) await h.optional('premature submit 2', () => prematureSubmit(2));

  await h.optional('NMLS', () => h.typeInto(['#nmls'], candidate.nmls || '107621'));
  await h.optional('experience = Experienced', () => pickButton(/^\s*Experience/i, 'Experienced'));
  await h.optional('career production', () => h.typeInto(['#closed_loan_since_2021'], '25000000'));
  await h.optional('mailing street', () => h.typeInto(['#mailing_street'], '1 Market Street'));
  await h.optional('licensed states = Texas', () => pickOption(/Licensed states/i, 'Texas'));
  await h.optional('states to sponsor = Texas', () => pickOption(/States that you want/i, 'Texas'));
  await h.optional('preferred languages', () => pickOption(/Preferred languages/i, 'English'));
  await h.optional('preferred contact method', () => pickButton(/Preferred method of communication/i, 'Email'));
  await h.optional('channel = Retail LO', () => pickOption(/Loan officer channel/i, 'Retail LO'));

  // Hand the record to Luis: his board is "Mine", i.e. records he OWNS, so an admin-created record
  // with no recruiter would never appear there.
  // VERIFIED 2026-08-04: #recruiter is a twitter-typeahead — type, then pick from
  // `.tt-menu.tt-open .tt-suggestion` (typing "Luis Testcase" offers "Luis Testcase 635211").
  await h.optional('recruiter = Luis', async () => {
    await h.typeInto(['#recruiter'], ACCOUNTS.luis.label);
    const suggestion = page.locator('.tt-menu.tt-open .tt-suggestion, .tt-suggestion').first();
    await suggestion.waitFor({ state: 'visible', timeout: 8000 });
    await h.click(() => suggestion, { timeout: 6000 });
  });

  // skipEmail keeps the demonstration branch strictly incomplete: with no email the duplicate
  // check has nothing to match, so the save phase can never be reached by accident.
  const wantEmail = !skipEmail && !!candidate.email;
  if (wantEmail) await h.typeInto(['#email'], candidate.email);
  return { fullName, emailFilled: wantEmail };
}

/**
 * Show the Add-and-Invite dialog WITHOUT touching anybody's record, and leave via Cancel.
 *
 * Used by s1_14's DEMONSTRATION branch. The invite is the one transition with NO path back, so it
 * can never be re-filmed on the real candidate — but the scene's narration is entirely about what is
 * INSIDE this dialog, so the dialog has to appear.
 *
 * VERIFIED LIVE 2026-08-04: `button#add-and-invite-loan-officer` on the ILO board opens the SAME
 * "ADD AND INVITE LOAN OFFICER" modal as the row action — same three select2s, same cascade
 * (Direct Invite -> Email / Newsletter / I'm a returning LO), same two toggles, same webinar
 * default of Yes — but with EMPTY fields and attached to no record at all. That makes it the only
 * safe vehicle: every row on this staging board is a real person imported via Modex, and this
 * footage goes to the CEO.
 *
 * ONE DIFFERENCE, deliberately surfaced: the standalone dialog does NOT carry the sentence "The
 * recruited loan officer will be moved to the Interested Loan Officers pipeline" — that line only
 * exists when the dialog is opened from a recruited record. The narration beat about it cannot be
 * shown here, so this logs the fact rather than pretending otherwise.
 *
 * NEVER press Escape in this modal: Escape dismisses the whole dialog, not just an open dropdown
 * (that is what made an earlier Cancel click find nothing). Close dropdowns by picking an option.
 */
export async function demonstrateInviteDialog(page, h, { row = null, referralSource = 'Direct Invite' } = {}) {
  // TWO OPENERS, and the choice matters for the narration.
  //  - row mode (preferred): the row Action -> "Invite Loan officer to join <company>". ONLY this
  //    variant renders "The recruited loan officer will be moved to the Interested Loan Officers
  //    pipeline", which is the sentence s1_14's narration relies on.
  //  - standalone: `button#add-and-invite-loan-officer` on the ILO board. Same dialog, same three
  //    select2s, same cascade, same toggles, but EMPTY and attached to no record — the safe
  //    fallback when no record of ours is on the Recruited board.
  const board = row ? URLS.rloMine : URLS.iloMine;
  const countRows = async () => {
    await h.goto(board);
    return page.locator('table.table-hover tbody tr').filter({ hasText: /\S/ }).count();
  };
  const before = await countRows();

  if (row) {
    await h.click(() => row.getByRole('button', { name: /^\s*Action\s*$/i }), { timeout: 15_000 });
    await h.hold(1);
    await h.clickMenuItem(row, 'Invite Loan officer to join', { prefix: true });
  } else {
    await h.click(['#add-and-invite-loan-officer'], { timeout: 12_000 });
  }
  const modal = page.locator('.modal.show');
  await modal.first().waitFor({ state: 'visible', timeout: 20_000 });
  await h.waitForAppIdle();
  await h.hold(2);

  // 1) Referral source — mandatory, and it drives a bonus payment months later.
  await h.click(() => modal.locator('.select2-container').nth(0), { timeout: 9000 });
  await h.hold(1.5);
  const src = page.locator('li.select2-results__option')
    .filter({ hasText: new RegExp(`^\\s*${referralSource}\\s*$`, 'i') }).first();
  await src.waitFor({ state: 'visible', timeout: 9000 });
  await h.click(() => src, { timeout: 9000 });
  await h.hold(1.5);

  // 2) The cascade appearing is the thing worth seeing — open it so the dependent options show,
  //    then pick one. NEVER press Escape here: it dismisses the whole dialog, not just the dropdown.
  await h.click(() => modal.locator('.select2-container').nth(1), { timeout: 9000 });
  await h.hold(2);
  const cascade = await page.evaluate(() => [...document.querySelectorAll('li.select2-results__option')]
    .map((o) => (o.innerText || '').trim()));
  console.log(`[s1_14]  Detail source cascade offered ${JSON.stringify(cascade)}`);
  await h.click(() => page.locator('li.select2-results__option').filter({ hasText: /\S/ }).first(), { timeout: 9000 });
  await h.hold(1.5);

  // 3) The two toggles, pointed at but NOT flipped.
  await h.optional('waive the $100 fee toggle', () =>
    h.moveTo(() => modal.getByText(/Waive the \$100 fee/i).first(), { timeout: 6000 }));
  await h.hold(1.5);
  await h.optional('send invitation email toggle', () =>
    h.moveTo(() => modal.getByText(/Send an invitation email/i).first(), { timeout: 6000 }));
  await h.hold(1.5);

  // 4) The pipeline sentence — present in row mode, absent standalone.
  const pipelineRe = /moved to the Interested Loan Officers pipeline/i;
  if (await modal.filter({ hasText: pipelineRe }).count()) {
    await h.optional('the pipeline sentence', () =>
      h.moveTo(() => modal.getByText(pipelineRe).first(), { timeout: 6000 }));
    console.log('[s1_14]  the dialog states the record moves to the Interested pipeline — on screen.');
  } else {
    console.warn('[s1_14]  this dialog does NOT contain the "moved to the Interested Loan Officers');
    console.warn('[s1_14]  pipeline" sentence — that line renders only when the dialog is opened from a');
    console.warn('[s1_14]  recruited record. Resting on the title; the narration clause has no footage.');
    await h.optional('the dialog title', () =>
      h.moveTo(() => modal.getByText(/ADD AND INVITE LOAN OFFICER/i).first(), { timeout: 6000 }));
  }
  await h.hold(2);

  // Leave via Cancel. Submitting in row mode would CONVERT the record and re-break the row beats for
  // every future re-record; standalone it would create one. Neither is allowed.
  await h.click(['#gwt-debug-cancel'], { timeout: 10_000 });
  const closed = await modal.first().waitFor({ state: 'detached', timeout: 15_000 })
    .then(() => true).catch(() => false);
  if (!closed) {
    throw new Error('the invite dialog did not close after Cancel. Refusing to continue with it open — '
      + 'a later stray click could submit it and convert a record.');
  }
  const after = await countRows();
  if (after !== before) {
    throw new Error(`the ${row ? 'Recruited' : 'Interested'} board row count changed from ${before} to `
      + `${after} across a dialog that was only ever cancelled — something was submitted. Investigate `
      + 'before shooting.');
  }
  console.log(`[s1_14]  dialog cancelled; ${row ? 'Recruited' : 'Interested'} row count unchanged `
    + `(${before}) — nothing submitted.`);
  return true;
}

/**
 * Drive the "Invite Loan officer to join <company>" modal, which moves a Recruited-LO record into
 * the Interested-LO pipeline.
 *
 * VERIFIED LIVE 2026-08-04 (modal driven end to end, SaveOp observed, record confirmed in ILO).
 * The modal is titled "ADD AND INVITE LOAN OFFICER" and holds THREE select2 dropdowns, in DOM
 * order: [0] "Are you referred to <company> by?", [1] "Detail source", [2] "Date & Time (webinar)".
 * Four traps, all of which silently defeated the previous version:
 *  1. DETAIL SOURCE IS A CASCADE. It is empty until [0] is chosen; picking "Direct Invite"
 *     populates it with Email / Newsletter / I'm a returning LO. Both are required.
 *  2. "Register for the weekly webinar?" DEFAULTS TO YES, which makes "Date & Time" required —
 *     and that dropdown has ZERO options, so the form can never validate. It must be set to No.
 *  3. The submit button is `#gwt-debug-submit` but its label is "check Email loan officer and
 *     Save" — nothing matching /Submit|Invite/, which is why the old click was skipped.
 *  4. The `.form-text.text-danger` messages are STALE: they persist after a field is filled and
 *     only re-evaluate on submit, so never gate on them beforehand. (Note this modal DOES render
 *     errors, unlike the Add form.)
 * The ids inside this modal are unreliable (document.querySelector('#referred_section') returns
 * null while select2 shows the picked value), hence the index-based scoping.
 */
export async function inviteToILO(page, h, row, { referralSource = 'Direct Invite' } = {}) {
  await h.click(() => row.getByRole('button', { name: /^\s*Action\s*$/i }), { timeout: 15_000 });
  await h.clickMenuItem(row, 'Invite Loan officer to join', { prefix: true });
  const modal = page.locator('.modal.show');
  await modal.first().waitFor({ state: 'visible', timeout: 20_000 });
  await h.waitForAppIdle();

  const pickNth = async (i, optRe, label) => {
    await h.click(() => modal.locator('.select2-container').nth(i), { timeout: 9000 });
    const opts = page.locator('li.select2-results__option');
    await opts.first().waitFor({ state: 'visible', timeout: 9000 });
    const first = ((await opts.first().innerText().catch(() => '')) || '').trim();
    if (/^No results/i.test(first)) {
      throw new Error(`the "${label}" dropdown offered nothing (${first}) — cannot complete the invite`);
    }
    const opt = opts.filter({ hasText: optRe }).first();
    await opt.waitFor({ state: 'visible', timeout: 9000 });
    await h.click(() => opt, { timeout: 9000 });
    await h.hold(1);
  };

  await pickNth(0, new RegExp(`^\\s*${referralSource}\\s*$`, 'i'), 'Are you referred to … by?');
  // The cascade's contents depend on the source above, so take whatever it now offers.
  await pickNth(1, /\S/, 'Detail source');
  await h.click(() => modal.locator('.form-group')
    .filter({ hasText: /Register for the weekly webinar/i }).first()
    .getByRole('button', { name: btnName('No') }).first(), { timeout: 9000 });
  await h.hold(1);

  await h.click(['#gwt-debug-submit'], { timeout: 10_000 });
  const closed = await modal.first().waitFor({ state: 'detached', timeout: 25_000 })
    .then(() => true).catch(() => false);
  if (!closed) {
    const errs = await page.evaluate(() => [...document.querySelectorAll('.modal.show .text-danger')]
      .map((e) => (e.textContent || '').trim()).filter(Boolean));
    throw new Error(`the invite modal did not close — the app reports: ${errs.join(' | ') || '(no message)'}`);
  }
  return true;
}

/**
 * Read the candidate's three stacked state buttons off the ILO board.
 *
 * VERIFIED LIVE 2026-08-04: one cell (header "Status/Startup fee/Agreement") holds THREE <button>
 * dropdowns in this order: [0] status, [1] startup fee, [2] agreement. For Marcus they read
 * "Invited to join" / "Unpaid" / "Not signed". The cell is found by its FEE button (a small, known
 * vocabulary) and the other two are taken positionally, so it survives column reordering.
 *
 * Returns null when the record is not on the board at all — the caller must treat that as
 * CANNOT DETERMINE, never as "the transition has not happened yet".
 */
async function readIloState(page, fullName) {
  return page.evaluate((nm) => {
    const rows = [...document.querySelectorAll('table.table-hover tbody tr')];
    const tr = rows.find((r) => new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(r.innerText || ''));
    if (!tr) return null;
    const td = [...tr.children].find((c) => [...c.querySelectorAll('button')]
      .some((b) => /^(Unpaid|Paid|Not paid)$/i.test((b.innerText || '').trim())));
    if (!td) return { onBoard: true, cellFound: false };
    const btns = [...td.querySelectorAll('button')].map((b) => (b.innerText || '').trim());
    return { onBoard: true, cellFound: true, status: btns[0] || '', fee: btns[1] || '', agreement: btns[2] || '' };
  }, fullName);
}

/**
 * Make sure the candidate's row is actually on screen, searching if it is not.
 *
 * VERIFIED LIVE 2026-08-04: once a record reaches "100% onboarded" it DROPS OFF THE DEFAULT FIRST
 * PAGE of both ILO boards (default sort puts it out of the top 10) — a plain read returns 0 rows and
 * only finds it after a search. s4_4 advances the candidate mid-act, so every later beat that
 * navigates fresh must search rather than trust page position, or it silently hovers nothing.
 * Call AFTER the caller's h.goto(). Returns true when the row is present.
 */
async function ensureCandidateVisible(page, h, fullName) {
  if (await h.row(fullName).count()) return true;
  await h.optional(`search the board for ${fullName}`, () => h.filterGrid(fullName.toLowerCase()));
  const found = (await h.row(fullName).count()) > 0;
  if (found) console.log(`[find]   ${fullName} was not on page one — found via search`);
  return found;
}

/** Read ILO state with retries; hard-fail rather than let a slow board look like an un-done transition. */
async function readIloStateOrFail(page, h, fullName, sceneLabel) {
  let st = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await h.goto(URLS.iloCompany);
    // A record at "100% onboarded" is off page one, so search before concluding anything.
    await ensureCandidateVisible(page, h, fullName);
    st = await readIloState(page, fullName);
    if (st && st.cellFound) return st;
    console.warn(`[${sceneLabel}] state read attempt ${attempt}/3: `
      + (st ? 'found the row but not the Status/Startup fee cell' : `${fullName} not on the ILO board`));
    if (attempt < 3) await h.hold(5);
  }
  throw new Error(`CANNOT DETERMINE the state of ${fullName} after 3 attempts — `
    + (st ? 'the row is on the ILO board but its "Status/Startup fee/Agreement" cell could not be read.'
          : 'the record is not on the ILO board at all, so act 1\'s invite has not run.')
    + ' REFUSING to guess: the perform branch mutates a record that cannot be restored.');
}

/** Pick an option from an open per-cell dropdown, tolerating data-name items and plain text. */
async function pickCellOption(page, h, labelRe, what) {
  await h.click([
    () => page.locator('a.dropdown-item:visible').filter({ hasText: labelRe }).first(),
    () => page.locator('.dropdown-menu.show, .dropdown-menu:visible').first().getByText(labelRe).first(),
    () => page.getByText(labelRe).first(),
  ], { timeout: 8000 });
  await h.hold(1);
  await h.optional(`confirm ${what}`, () => h.click(
    () => page.getByRole('button', { name: btnName('Submit', 'Save', 'Yes', 'OK') }).first(), { timeout: 4500 }));
}

// ---------------------------------------------------------------------------
// ACT 0 — Admin: the terrain (Chau Chau)
// Storyboard rows 0.1 – 0.6, PLUS s1_4 (the Add-form beat) which is shot here because an Outside
// Recruiter has no Add button on staging — see the note beside that scene. Shooting order:
//   s0_1 s0_2 s0_3 s0_4 s0_5 s1_4 s0_6
// markers.json records each scene's true on-camera offset, so the s1_4 cue lands on the form.
// ---------------------------------------------------------------------------

export async function act0(page, h, cfg = {}) {
  await h.scene('s0_1', async () => {
    // VERIFIED 2026-08-03: the sidebar entry is <a id="gwt-debug-lo-recruiting"> — a stable GWT
    // debug id, immune to text drift. Text match kept as a fallback.
    await h.goto(URLS.canary);
    await h.click([
      gwt('lo-recruiting'),
      () => page.getByRole('link', { name: /LO RECRUITING/i }),
    ], { timeout: 12_000 });
    await h.hold(1.5);
    // VERIFIED 2026-08-04: clicking the nav expands `li.has-sub` into `li.has-sub.expand` and all
    // five entries become visible inside its nested <ul>. The first shoot still missed them because
    // the candidate baked in `.first()`: "My Loan Officer referrals" exists TWICE (only one copy
    // visible) and `.first()` resolved to the hidden duplicate, which also defeats resolve()'s
    // scan for a visible match. Scope to this section's submenu and never narrow with .first().
    const loSubmenu = page.locator('li.has-sub')
      .filter({ has: page.locator(gwt('lo-recruiting')) }).locator('ul');
    for (const name of [
      /My Loan Officer referrals/i,
      /Admin - Loan Officer referrals/i,
      /Interested Loan Officers/i,
      /Recruited Loan Officers/i,
      /Loan Officers Obtained from Modex/i,
    ]) {
      await h.optional(`menu ${name}`, () => h.moveTo(() => loSubmenu.getByText(name), { timeout: 4000 }));
      await h.hold(0.5);
    }
  });

  await h.scene('s0_2', async () => {
    await h.goto(URLS.rloMine);
    await h.clickTab(TABS.company); // VERIFIED: clicking beats deep-linking (see URLS note)
    // 16 columns: prove it by scrolling the table horizontally.
    // VERIFIED 2026-08-03: the data grid is `table.table-sm.table-hover` with 17 <th>; the view
    // also holds a separate summary <table>, so anchor on the data table, not `table` first().
    const header = [
      () => page.locator('table.table-hover th').filter({ hasText: /Started date/i }).first(),
      () => page.locator('table.table-hover').first(),
    ];
    await h.moveTo(header, { timeout: 10_000 });
    const scroller = await h.scrollableNear(header);
    await h.smoothScroll(scroller || 'window', 1400, { axis: 'x', steps: 22, gap: 55 });
    await h.hold(1);
    await h.smoothScroll(scroller || 'window', -1400, { axis: 'x', steps: 14, gap: 40 });
  });

  await h.scene('s0_3', async () => {
    // Stats panel: every number is a drill-down.
    // VERIFIED 2026-08-03: tiles read "<Label> - <N>" inside div.col-md-2 and the link is the
    // NUMBER (a.gwt-Anchor href="javascript:"), not the label — see h.statLink(). The labels
    // present on this tab are Total / Initiate contact / Message sent / Dialogue / Invited to
    // join / Interested but thinking / Want to join / Archived / Block display / Claimed /
    // Not claimed. ("Not touched" is a per-ROW status value, not a tile.)
    await h.moveTo(() => h.statLink(/^Total/).first(), { timeout: 10_000 });
    await h.hold(1);
    await h.click(() => h.statLink(/Initiate contact/).first(), { timeout: 10_000 });
    await h.waitForRows();
    await h.hold(2.5);
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await h.waitForRows();
    // VERIFIED 2026-08-03: the icon strip above the stats panel is 4 icon-only <button>s with
    // EMPTY innerText (no title, no aria-label, no gwt-debug id) — refresh plus the 3 view modes
    // (bar chart / text / hide). The refresh one does carry a generated id derived from its own
    // markup, `button#i-classfas-fa-refreshi` (<i class="fas fa-refresh">), so use it as the
    // anchor and take its siblings rather than guessing at classes.
    await h.optional('stats view-mode toggles', async () => {
      const strip = page.locator('button#i-classfas-fa-refreshi').locator('xpath=..');
      const toggles = strip.locator('button:not(#i-classfas-fa-refreshi)');
      const n = Math.min(2, await toggles.count());
      if (!n) throw new Error('view-mode icon strip not found');
      for (let i = 0; i < n; i += 1) {
        await h.click(() => toggles.nth(i), { timeout: 3000 });
        await h.hold(1.2);
      }
    });
  });

  await h.scene('s0_4', async () => {
    await h.goto(URLS.config);
    // VERIFIED 2026-08-04: clicking this strip is unreliable — `a.nav-link[role=tab]` also matches
    // dozens of SIDEBAR entries, so a name lookup can land outside the page's own strip (that is
    // why four of these five tabs found nothing in the first shoot). Deep-link them instead: every
    // tab is addressable as /lo_recruiting_config/<data-name>.
    const tabs = Object.entries(CONFIG_TABS);
    for (const [label, dn] of tabs) {
      await h.optional(`config tab ${label}`, async () => {
        // Shoot 3 lost this whole scene to a single 60s goto timeout on a slow staging, so retry.
        let ok = false;
        for (let attempt = 1; attempt <= 2 && !ok; attempt += 1) {
          try {
            await h.goto(`${BASE}/lo_recruiting_config/${dn}`, { rows: false });
            ok = true;
          } catch (err) {
            console.warn(`[act0]   config tab ${label} attempt ${attempt}/2 failed: ${err.message.split('\n')[0]}`);
            if (attempt < 2) await h.hold(4);
          }
        }
        if (!ok) throw new Error(`could not open the ${label} tab`);
        await h.hold(1.6);
      });
    }
    // Land on Calendly (it holds a personal access token) and just look at it — never read it out.
    await h.optional('stay on Calendly tab', () => h.goto(URLS.configCalendly, { rows: false }));
  });

  await h.scene('s0_5', async () => {
    await h.goto(URLS.modexData);
    // Open one record's MODEX INFORMATION modal (read-only).
    // VERIFIED 2026-08-03: this page is the ONE div-grid (div.table-row / div.table-cell, 9 rows)
    // and "View" / "Update" are real <button class="btn btn-secondary">, so role=link matched
    // nothing here. There is no per-row Action menu on this page — "Action" is only a column
    // header, and the row's write control is "Update" (not clicked: it starts a merge job).
    await h.click([
      () => page.getByRole('button', { name: /^\s*View\s*$/i }).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('performance block', () => h.moveTo(() => page.getByText(/PERFORMANCE/i).first(), { timeout: 4000 }));
    await h.hold(1);
    await h.optional('transaction summary', async () => {
      await h.smoothScroll(() => page.getByText(/TRANSACTION SUMMARY/i).first(), 400, { steps: 10 });
      await h.moveTo(() => page.getByText(/TRANSACTION SUMMARY/i).first(), { timeout: 4000 });
    });
    await h.hold(1);
    await h.dismiss();
    await h.hold(1);
    // The whole point: every row was Received 24/01/2024 and nothing newer.
    await h.optional('Received column', () => h.moveTo(() => page.getByText(/Received/i).first(), { timeout: 4000 }));
  });

  /**
   * s1_4 IS SHOT HERE, in act 0's admin context — decided 2026-08-04.
   *
   * Why: probing as Luis proved an Outside Recruiter has no Add button on staging (audit §9), so
   * the form cannot be opened in his session. The narration was re-pointed to say so out loud
   * ("on this test environment it is hidden, so I am opening the same form from the admin
   * account"), and the form pain — unmarked required fields, one new error per submit — is
   * identical whoever opens it.
   *
   * Why HERE rather than mid-act-1: markers must carry the true on-camera offset of every scene,
   * and each video's scene list stays monotonic this way. Shooting it inside act 1 would mean
   * impersonating in the middle of that act, putting ~30s of unnarrated Associates navigation
   * between s1_4 and s1_1 and leaving act 1's offsets interleaved with a session swap. Placing it
   * as the last admin beat before the impersonation bridge (s0_6) keeps one video per session,
   * one monotonic offset list per video, and the s1_4 narration lands on footage that genuinely
   * shows the form. Trade-off: in the finished film the s1_4 line plays at the end of act 0
   * rather than between s1_3 and s1_5.
   *
   * It also creates the candidate FOR REAL and hands him to Luis, so every later act has him.
   */
  await h.scene('s1_4', async () => {
    const candidate = cfg.candidate || {};
    const fullName = candidate.name || 'Marcus Reyes';
    const ownedBy = new RegExp(ACCOUNTS.luis.label, 'i');

    // IDEMPOTENT BY DESIGN. Check for the record BEFORE touching the form.
    //
    // The submit's first click is a duplicate-EMAIL lookup (see submitAddForm). If the candidate
    // already exists and we submit the same email again, the app drops into a duplicate path that
    // nobody has seen — and it would be filmed unscripted. So: create only when he is missing, and
    // otherwise DEMONSTRATE the form and leave via Cancel. The narration was re-pointed to the
    // silent rejection, so it no longer depends on a successful save.
    // Look on COMPANY, not Mine: "Mine" means records the CURRENT user owns, and this record is
    // owned by a recruiter, so it is correctly absent from admin's Mine.
    // ABSENT vs COULD-NOT-DETERMINE. Shoot 3 taught this the expensive way: staging was slow, the
    // board never loaded, the check read that as "the record is absent" and took the CREATION
    // branch — the branch that MUTATES — on a record that already existed. A failed or empty load
    // must therefore be retried and then hard-fail, never silently mean "absent".
    let boardLoaded = false;
    let existing = h.row(fullName);
    for (let attempt = 1; attempt <= 3 && !boardLoaded; attempt += 1) {
      try {
        await h.goto(URLS.rloCompany);
        const state = await h.waitForRows();
        // A board that reports neither rows nor an explicit empty state has not loaded.
        boardLoaded = state.rows > 0 || state.empty;
        if (!boardLoaded) throw new Error(`board did not populate (pager "${state.pager}")`);
      } catch (err) {
        console.warn(`[act0]   s1_4: existence check attempt ${attempt}/3 failed: ${err.message}`);
        if (attempt < 3) await h.hold(5);
      }
    }
    if (!boardLoaded) {
      throw new Error('could not determine whether the candidate exists — the Recruited board never '
        + 'loaded after 3 attempts. REFUSING to guess: the creation branch mutates, and treating a '
        + 'slow page as "absent" is how a duplicate gets created. Re-run act 0 when staging responds.');
    }
    existing = h.row(fullName);
    if (!(await existing.count())) {
      await h.optional('search for the candidate', async () => {
        await h.filterGrid(fullName.toLowerCase());
        existing = h.row(fullName);
      });
    }
    const exists = (await existing.count()) > 0;
    const existingText = exists ? ((await existing.innerText().catch(() => '')) || '') : '';

    if (exists) {
      console.log(`[act0]   s1_4: BRANCH = DEMONSTRATION — "${fullName}" already exists`
        + `${ownedBy.test(existingText) ? ` (owned by ${ACCOUNTS.luis.label})` : ' (NOT owned by Luis — see below)'}.`);
      console.log('[act0]   s1_4: filling the form and leaving via Cancel; this take contains NO real creation.');
      await openAddForm(page, h);
      await h.hold(1.5);
      // skipEmail: with no email the duplicate check cannot match, so the save phase is unreachable.
      await fillAddForm(page, h, candidate, { skipEmail: true });
      await cancelAddForm(page, h);
      if (!ownedBy.test(existingText)) {
        console.error(`[act0]   s1_4: WARNING — ${fullName} is not owned by ${ACCOUNTS.luis.label};`);
        console.error('[act0]   s1_4: act 1 reads his "Mine" board and will find nothing. Re-assign it by hand.');
      }
      return;
    }

    console.log(`[act0]   s1_4: BRANCH = CREATION — "${fullName}" does not exist yet; this take creates him.`);
    await openAddForm(page, h);
    await h.hold(1.5);
    await fillAddForm(page, h, candidate);

    // The email must come from --candidate-email (a Mailinator PUBLIC inbox at shoot time).
    // Never invent one and never use a real person's address: staging sends real mail (audit §10.4).
    if (!candidate.email) {
      console.error('[act0]   s1_4: NO --candidate-email GIVEN — demonstrating the form but NOT submitting.');
      console.error('[act0]   s1_4: re-run with --candidate-email <address> or acts 1-7 have nobody to work on.');
      await h.hold(2);
      await cancelAddForm(page, h);
      return;
    }

    await submitAddForm(page, h, { confirm: true });
    await h.hold(4); // new records index slowly (Datastore eventual consistency)

    // VERIFY — deliberately NOT optional(). Shoot 1 had this wrapped, so a failed create still
    // logged "ok" and the run reported success while sinking every downstream act.
    await h.goto(URLS.rloCompany);
    let created = h.row(fullName);
    if (!(await created.count())) {
      await h.optional('search for the new record', async () => {
        await h.filterGrid(fullName.toLowerCase());
        created = h.row(fullName);
      });
    }
    if (!(await created.count())) {
      // This form never shows a validation message (see submitAddForm), so dump the state and a
      // screenshot: that is the only way anyone can debug it after the fact.
      await reportAddFormRejection(page, 's1_4-rejected');
      throw new Error(`"${fullName}" was NOT created — the submit did not save. This form gives NO `
        + 'on-screen error, so check the screenshot in recorder/debug/ and the still-empty required '
        + 'groups logged above, then re-record act 0 before anything else: every later act operates '
        + 'on this record.');
    }
    console.log(`[act0]   s1_4: ${fullName} created`);

    // Ownership. The create form does NOT keep the Recruiter it was given — the record comes back
    // auto-assigned (observed: "Manh Admin") — so re-assign it from the toolbar with the
    // "Overwrite the current recruiter" box ticked. Act 1 reads LUIS's Mine board.
    if (ownedBy.test((await created.innerText()) || '')) {
      console.log(`[act0]   s1_4: already owned by ${ACCOUNTS.luis.label}`);
    } else {
      await h.optional(`assign the recruiter to ${ACCOUNTS.luis.label}`, () =>
        assignRecruiter(page, h, created, ACCOUNTS.luis.label));
      await h.goto(URLS.rloCompany);
      const after = (await h.row(fullName).innerText().catch(() => '')) || '';
      if (ownedBy.test(after)) {
        console.log(`[act0]   s1_4: reassigned to ${ACCOUNTS.luis.label}`);
      } else {
        console.error(`[act0]   s1_4: ${fullName} exists but is NOT owned by ${ACCOUNTS.luis.label} —`);
        console.error('[act0]   s1_4: act 1 reads his "Mine" board and will find nothing. Assign it by hand.');
      }
    }
  });

  await h.scene('s0_6', async () => {
    // INTRODUCE ONLY. Clicking "Login" here would swap THIS context's session mid-act and
    // there is no way back to admin (audit §10.3) — act 1 does the real login-as in its own
    // fresh context, so this scene only opens the menu and points at the item.
    await h.optional('associates screen', () => h.goto(URLS.associates));
    // VERIFIED 2026-08-04: typing alone does NOT filter this grid — it is a select2 token widget
    // (see h.filterGrid). The first shoot typed the name, never committed a token, so the grid was
    // unfiltered and the row lookup below found nothing. Commit the unique EMAIL token.
    await h.optional('search the account', () => h.filterGrid(ACCOUNTS.luis.email));
    // VERIFIED 2026-08-03: per-row Action is <button>Action</button>; its menu holds
    // Permissions / Login / Audit log / … / Delete. Scope BOTH to the matched row: every row's
    // menu is pre-rendered, so an unscoped match would point at another account's Login — and
    // Delete sits two items below it.
    const target = h.row(ACCOUNTS.luis.email);
    await h.optional('open row Action menu', () =>
      h.click(() => target.getByRole('button', { name: /^\s*Action\s*$/i }), { timeout: 8000 }));
    await h.hold(1);
    await h.optional('hover Login (NO click — that would swap this act\'s session)', () =>
      h.moveTo(() => h.dropdownItem(target, 'Login').first(), { timeout: 5000 }));
    await h.hold(1.5);
    await h.dismiss();
  });
}

// ---------------------------------------------------------------------------
// ACT 1 — Outside Recruiter (Luis): from cold lead to invitation
// Storyboard rows 1.1 – 1.15 MINUS 1.4 (filmed in act 0's admin context). Shooting order equals
// the authored order: s1_1 s1_2 s1_3 s1_5 … s1_15.
// ---------------------------------------------------------------------------

export async function act1(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const fullName = candidate.name || 'Marcus Reyes';

  // Decide ONCE which row the row-level beats (s1_5, s1_7…s1_13) act on.
  // The invite in s1_14 MOVES the candidate off the Recruited board for good, so on any re-record
  // after a successful invite he is simply not here. Rather than fail nine scenes, demonstrate the
  // row controls on another record and say so loudly — the controls are identical, and the beats
  // are about what the controls DO, not about whose row it is.
  await h.goto(URLS.rloMine);
  let rowOfCandidate = () => h.row(fullName);
  if (!(await h.row(fullName).count())) {
    console.warn(`[act1]   ${fullName} is NOT on the Recruited board — he has already been invited into`);
    console.warn('[act1]   the ILO pipeline, which removes him from here, so the row-level beats need');
    console.warn('[act1]   another record to demonstrate on.');
    // Choose DELIBERATELY, not "first row". This footage goes to the CEO and every row on this
    // staging board is a real loan officer imported via Modex (verified 2026-08-04: searching the
    // board for "test" returns No results — there is no fixture here). Prefer an explicitly named
    // safe record, then anything that looks like a test fixture, and be loud when neither exists.
    let substitute = null;
    let how = '';
    if (cfg.demoRecord) {
      if (await h.row(cfg.demoRecord).count()) {
        substitute = h.row(cfg.demoRecord);
        how = `--demo-record "${cfg.demoRecord}"`;
      } else {
        console.error(`[act1]   --demo-record "${cfg.demoRecord}" is NOT on this board.`);
      }
    }
    if (!substitute) {
      const fixture = page.locator('table.table-hover tbody tr')
        .filter({ hasText: /\b(test|demo|sample|dummy|qa)\b|mailinator/i }).first();
      if (await fixture.count()) { substitute = fixture; how = 'auto-detected test fixture'; }
    }
    if (!substitute) {
      substitute = page.locator('table.table-hover tbody tr').filter({ hasText: /\S/ }).first();
      how = 'FALLBACK: first row — NOT a fixture';
      console.error('[act1]   NO SAFE FIXTURE FOUND on the Recruited board. The row beats (s1_5-s1_13)');
      console.error('[act1]   will film a REAL loan officer\'s record — name, company, phone, NMLS — and');
      console.error('[act1]   this footage is CEO-facing. Either pass --demo-record <name> pointing at a');
      console.error('[act1]   record you are happy to show, or create a clearly-fake candidate on the');
      console.error('[act1]   Recruited board first (act 0 does exactly that) and re-run act 1.');
    }
    const who = ((await substitute.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 44);
    console.warn(`[act1]   substitute record (${how}): ${who}`);
    rowOfCandidate = () => substitute;
  }

  await h.scene('s1_1', async () => {
    // VERIFIED 2026-08-03: Mine is the default tab; clickTab is a no-op verification here.
    await h.goto(URLS.rloMine);
    await h.smoothScroll('window', 700, { steps: 14 });
    await h.hold(1);
    await h.smoothScroll('window', -700, { steps: 10 });
  });

  await h.scene('s1_2', async () => {
    // Filters: Active + Social media + the "More" additional-filters modal (7 filters).
    // VERIFIED 2026-08-03: both filters are select2 widgets wrapping a hidden
    // `select.select2-hidden-accessible`. The visible control is `.select2-selection` (title
    // holds the current value, e.g. title="Active"; an unset one shows a
    // `.select2-selection__placeholder`). Options render in a container appended to <body>, i.e.
    // OUTSIDE the view root, as `li.select2-results__option` — so they must be matched at page
    // level, never inside the row/view scope.
    await h.optional('open the Active filter', async () => {
      await h.click(() => page.locator('.select2-selection').filter({ hasText: /Active/ }).first(), { timeout: 6000 });
      await h.hold(1.2);
      await h.dismiss();
    });
    await h.optional('open the Social media filter', async () => {
      await h.click(() => page.locator('.select2-selection').filter({ hasText: /Social media/ }).first(), { timeout: 6000 });
      await h.hold(1.2);
      // Options are left unchanged on purpose: this beat is about showing the filter bar, and
      // the real option labels for this dropdown were not verified.
      await h.dismiss();
    });
    // VERIFIED 2026-08-03: the additional-filters opener is `button#more`.
    await h.click(['#more', () => page.getByRole('button', { name: /^\s*More\s*$/i })], { timeout: 8000 });
    await h.hold(1.5);
    // VERIFIED 2026-08-04: the modal's labels are "Loan officer channel (optional)", "Licensed
    // states (optional)", "Preferred language (optional)", "Friendship (optional)", "Profile
    // (optional)", "Experience (optional)", "Personal address state (optional)". They MUST be
    // scoped to the modal: unscoped, /Profile/i also matches the sidebar's "My profile" and the
    // board's "My profile" column, and the first shoot resolved to one of those instead.
    const filters = page.locator('div.modal.show');
    for (const f of [/Loan officer channel/i, /Licensed states/i, /Preferred language/i,
      /Friendship/i, /^\s*Profile/i, /Experience/i, /Personal address state/i]) {
      await h.optional(`filter ${f}`, () => h.moveTo(() => filters.getByText(f), { timeout: 3000 }));
      await h.hold(0.4);
    }
    await h.dismiss();
  });

  await h.scene('s1_3', async () => {
    // The daily bug: picking a search suggestion filters by ?labels= on top of a default chip
    // => "1-1 of 0 · No results" until the chip is removed (audit §C.4.1).
    // VERIFIED 2026-08-03: the search box is a select2 search field —
    // `input.select2-search__field`, placeholder "Name, Email, Phone, Company...". Being select2
    // is exactly WHY picking a suggestion turns the query into a `?labels=` filter instead of a
    // full-text search: the widget commits a token, not the typed string.
    await h.typeInto([
      'input.select2-search__field',
      () => page.getByPlaceholder(/Name, ?Email, ?Phone/i),
    ], (candidate.name || 'Marcus Reyes').split(' ')[0], { delay: 90 });
    await h.hold(2);
    await h.optional('pick a suggestion', async () => {
      // Suggestions render at page level as li.select2-results__option (appended to <body>).
      const opt = page.locator('li.select2-results__option').first();
      await opt.waitFor({ state: 'visible', timeout: 5000 });
      await h.click(() => opt, { timeout: 5000 });
      await h.waitForRows();
    });
    await h.hold(2);
    await h.optional('point at the empty result', () =>
      h.moveTo(() => page.getByText(/No results|of 0\b/i).first(), { timeout: 4000 }));
    await h.hold(1.5);
    await h.optional('clear the filters to reveal the records', async () => {
      // VERIFIED 2026-08-03: `button#gwt-debug-reset` ("Reset filters") is the control that drops
      // the default chip. The prod-only "Recruitable" chip does not exist on staging.
      await h.click(['#gwt-debug-reset'], { timeout: 5000 });
      await h.waitForRows();
    });
    await h.hold(2);
  });

  // s1_4 IS NOT SHOT HERE — it is filmed in act 0's admin context (see the long note beside the
  // s1_4 scene in act0). An Outside Recruiter has no Add button on staging, and the narration now
  // says so on camera. Nothing is emitted for s1_4 in this act, so act 1's markers stay monotonic
  // and its narration cue cannot land on the wrong footage.

  await h.scene('s1_5', async () => {
    // THE evidence button: "Copy Name And NMLS #" exists only so the recruiter can leave the app.
    await h.goto(URLS.rloMine);
    // VERIFIED 2026-08-03: the social-media cell holds a single
    // `button` labelled "Not checked" (becomes "Checked and has social links" once filled).
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /Not checked|Checked and has social links|Has social media/i }).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    // VERIFIED 2026-08-04: this is an <a class="btn btn-xs btn-info" href="javascript:;"> styled
    // as a button, so role=button never matches it — it is a role=link. It appears twice (modal
    // title + card title). Its inline handler is literally
    //   onclick="navigator.clipboard.writeText('<name> <nmls>')"
    // i.e. the control exists for no purpose other than carrying data OUT of this app, which is
    // the exact evidence pain P0-17 describes.
    const copyBtn = [
      () => page.locator('div.modal.show').getByRole('link', { name: /Copy Name And NMLS/i }),
      () => page.getByRole('link', { name: /Copy Name And NMLS/i }),
    ];
    await h.moveTo(copyBtn, { timeout: 6000 });
    await h.hold(1);
    await h.click(copyBtn, { timeout: 6000 });
    await h.hold(2);
    await h.dismiss();
  });

  await h.scene('s1_6', async () => {
    // The manual Modex lookup happens on a DIFFERENT site. Two constraints collide here:
    // the storyboard wants it on camera, the shoot brief says never touch the Modex portal.
    // Default = do not leave the app (log it, let narration play). Opt in with --modex.
    if (!cfg.modex || !cfg.modexUrl) {
      console.log('[act1]   s1_6: external-Modex beat SKIPPED (pass --modex --modex-url <url>); shoot as a separate take');
      await h.optional('hold on the copied NMLS', () =>
        h.moveTo(() => page.getByText(new RegExp(candidate.nmls || '107621')).first(), { timeout: 4000 }));
      return;
    }
    // NOTE: a 2nd tab produces a 2nd webm (playbook §6.3) — it is registered in markers.json.
    const tab = await page.context().newPage();
    cfg.extraPages?.push({ label: 'act1-modex', page: tab });
    await tab.goto(cfg.modexUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await tab.bringToFront();
    await sleep(4000); // the human is expected to already be signed into Modex in this tab
    await page.bringToFront();
  });

  await h.scene('s1_7', async () => {
    // Friendship tracking: Not friend / Friend requested / Cannot make friend request / Friend.
    // VERIFIED 2026-08-03: friendship is a dropdown <button> whose label is the current value,
    // with items data-name = not_friend | friend_requested | cannot_make_friend_request | friend.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /Not friend|Friend requested|Cannot make friend|^Friend$/i }).first(),
    ], { timeout: 10_000 });
    await h.hold(1.2);
    await h.optional('set Friend requested', async () => {
      const item = h.dropdownItem(rowOfCandidate(), 'friend_requested').first();
      await item.waitFor({ state: 'visible', timeout: 5000 });
      await h.click(() => item, { timeout: 5000 });
    });
    await h.hold(1.5);
  });

  await h.scene('s1_8', async () => {
    // Call modal = a sales script + a Zoom deep-link. It does not place the call, and the
    // Call counter is fed by the Zoom log, not by this click.
    // VERIFIED 2026-08-03: per-row `button` labelled "Call".
    await h.click([() => rowOfCandidate().getByRole('button', { name: /^\s*Call\s*$/i }).first()], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('read the script', () => h.smoothScroll(() => page.getByText(/250\s*bps|commission/i).first(), 350, { steps: 10 }));
    await h.hold(1);
    // INTRODUCE ONLY: never click "Call via my Zoom Phone" (it deep-links / can dial).
    await h.optional('point at Call via my Zoom Phone', () =>
      h.moveTo(() => page.getByText(/Call via my Zoom Phone/i).first(), { timeout: 5000 }));
    await h.hold(1.5);
    await h.dismiss();
  });

  await h.scene('s1_9', async () => {
    // Zoom SMS on an unmapped user => "Failed to send Zoom SMS: User not found".
    // Safe on staging with a dead phone number, and the error IS the beat.
    // VERIFIED 2026-08-03: per-row `button` labelled "Zoom SMS" (column header is "Text").
    await h.click([() => rowOfCandidate().getByRole('button', { name: /^\s*Zoom SMS\s*$/i }).first()], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('send to surface the error', async () => {
      await h.click([() => page.getByRole('button', { name: btnName('Send') })], { timeout: 5000 });
      await h.hold(3);
      await h.moveTo(() => page.getByText(/User not found|Failed to send/i).first(), { timeout: 6000 });
    });
    await h.hold(1.5);
    await h.dismiss();
  });

  await h.scene('s1_10', async () => {
    // Conversation history = the real operating system of this module: a note + an email.
    await h.click([
      // VERIFIED 2026-08-03: the Note cell is a NESTED pair of identical
      // <i class="material-icons">chat_bubble_outline</i> nodes, so this matches 2 — take first().
      () => rowOfCandidate().locator('i.material-icons', { hasText: 'chat_bubble_outline' }).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('write a real note', () =>
      h.typeInto([
        () => page.getByRole('textbox').last(),
        () => page.locator('[contenteditable="true"]').last(),
      ], 'Spoke with Marcus — 12-month volume looks strong on Modex, wants to hear the comp plan. Licensing: can we sponsor TX and AZ?', { delay: 24, clear: false }));
    await h.hold(1);
    await h.optional('pin the note', () => h.click(() => page.getByText(/^\s*Pin\s*$/i).first(), { timeout: 4000 }));
    await h.hold(1);
    await h.optional('Save + Email', async () => {
      await h.click([
        () => page.getByRole('button', { name: /Save \+ Email/i }),
        () => page.getByText(/Save \+ Email/i).first(),
      ], { timeout: 5000 });
      await h.hold(2);
      // VERIFIED 2026-08-04: the note modal really does expose "Save + Email" (probed as Maria
      // with the modal open). PROBE remains only on the department checkbox labels inside it.
      await h.optional('tick Licensing', () => h.click(() => page.getByText(/^\s*Licensing\s*$/i).first(), { timeout: 4000 }));
      await h.optional('confirm send', () => h.click(() => page.getByRole('button', { name: btnName('Send', 'Submit', 'Save') }).first(), { timeout: 4000 }));
      await h.hold(2);
    });
  });

  await h.scene('s1_11', async () => {
    // CHANGE STATUS modal. Do NOT touch the page filters while it is open (audit §10.9:
    // the modal reports a bogus "technical difficulty" toast although the save went through).
    // VERIFIED 2026-08-03: the status label is a DIV styled as a link —
    // <div class="btn-link ...">Not touched</div> — not an <a> and not a <button>, so no
    // role-based locator can reach it. (The generated GWT style hash beside `btn-link` changes
    // between builds; never depend on it.)
    await h.click([
      () => rowOfCandidate().locator('div.btn-link').filter({ hasText: /Not touched|Initiate contact|Message sent|Dialogue|Invited to join/i }).first(),
    ], { timeout: 10_000 });
    await h.hold(1.5);
    await h.optional('open the dropdown', () =>
      h.click([
        () => page.getByRole('combobox').first(),
        () => page.locator('select').first(),
      ], { timeout: 5000 }));
    await h.hold(1);
    await h.optional('choose Dialogue', () => h.click(() => page.getByText(/^\s*Dialogue\s*$/i).first(), { timeout: 5000 }));
    await h.optional('status note', () =>
      h.typeInto([() => page.getByRole('textbox').last()], 'First conversation done — sending comp details.', { delay: 22, clear: false }));
    await h.optional('submit', () => h.click(() => page.getByRole('button', { name: btnName('Submit') }).first(), { timeout: 5000 }));
    await h.hold(2);
  });

  await h.scene('s1_12', async () => {
    // Follow-up flag = snooze + wake notification, and it HIDES the record from the pipeline.
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Add or remove a follow-up flag');
    await h.hold(2);
    await h.optional('pick a wake-up date', async () => {
      // PROBE: the follow-up flag modal's date input is still unverified — reaching it needs the
      // modal open on a real record, which no read-only pass could do safely.
      await h.click([
        () => page.getByRole('textbox').first(),
        () => page.locator('input').first(),
      ], { timeout: 4000 });
      await h.hold(1.5);
    });
    await h.optional('flag history', () => h.moveTo(() => page.getByText(/Flag history/i).first(), { timeout: 4000 }));
    await h.hold(1.5);
    await h.dismiss();
  });

  await h.scene('s1_13', async () => {
    // Genuine strength: field-level audit log (old -> new, user, timestamp). Keep on rebuild.
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Audit log');
    await h.hold(2.5);
    await h.optional('scroll the log', () => h.smoothScroll(() => page.getByText(/Audit log/i).first(), 400, { steps: 12 }));
    await h.hold(1);
    await h.dismiss();
  });

  await h.scene('s1_14', async () => {
    // The handoff: Invite -> the record MOVES into the Interested-LO pipeline and LEAVES the
    // Recruited board entirely (verified: afterwards the RLO board returns 0 rows for the candidate,
    // even by search). It is the ONE transition with no path back, so it can never be re-filmed.
    //
    // BRANCH ORDER IS PINNED, because after act 0 re-creates the fixture a "Marcus Reyes" exists on
    // BOTH boards and two conditions are true at once:
    //   1. present in ILO      -> DEMONSTRATION  (always wins; the transition already happened)
    //   2. on Recruited only   -> INVITE         (perform it, then verify)
    //   3. on neither          -> hard fail
    // In DEMONSTRATION, if a Recruited row exists the dialog is opened from the ROW ACTION, because
    // only that variant renders the sentence about the record moving to the Interested pipeline,
    // which the narration relies on. It is then CANCELLED — submitting would convert the fresh
    // fixture and re-break the row beats for every future re-record.
    const fullName = candidate.name || 'Marcus Reyes';
    const alreadyInILO = async () => {
      await h.goto(URLS.iloMine);
      let r = h.row(fullName);
      if (!(await r.count())) {
        await h.optional('search ILO for the candidate', async () => {
          await h.filterGrid(fullName.toLowerCase());
          r = h.row(fullName);
        });
      }
      if (!(await r.count())) return null;
      return ((await r.innerText().catch(() => '')) || '');
    };

    const iloText = await alreadyInILO();
    const inILO = !!(iloText && /Invited to join/i.test(iloText));

    // Re-check the Recruited board directly: rowOfCandidate() may be pointing at a substitute.
    await h.goto(URLS.rloMine);
    const ownRow = h.row(fullName);
    const onRlo = (await ownRow.count()) > 0;

    if (inILO) {
      console.warn('[act1]   s1_14: BRANCH = DEMONSTRATION (modal shown'
        + `${onRlo ? ' via the row action' : ' on the standalone dialog'}, not submitted) —`);
      console.warn(`[act1]   s1_14: ${fullName} is already in the ILO pipeline with status "Invited to`);
      console.warn('[act1]   s1_14: join", and that transition has no path back, so it cannot be re-filmed.');
      if (onRlo) {
        console.warn('[act1]   s1_14: using the Recruited row so the dialog renders the "moves to the');
        console.warn('[act1]   s1_14: Interested pipeline" sentence. IT IS CANCELLED, NEVER SUBMITTED —');
        console.warn('[act1]   s1_14: submitting would convert this fixture and re-break the row beats.');
      } else {
        console.warn('[act1]   s1_14: no record of ours is on the Recruited board, so the standalone');
        console.warn('[act1]   s1_14: dialog is used instead. NO RECORD IS TOUCHED.');
      }
      await demonstrateInviteDialog(page, h, { row: onRlo ? ownRow : null });

      // The claim the scene makes is still verified, just not performed here.
      const stillInILO = await alreadyInILO();
      if (!stillInILO || !/Invited to join/i.test(stillInILO)) {
        throw new Error(`${fullName} was in the ILO pipeline with "Invited to join" before the `
          + 'demonstration but not after — the dialog was supposed to be cancelled. Investigate.');
      }
      if (onRlo) {
        await h.goto(URLS.rloMine);
        if (!(await h.row(fullName).count())) {
          throw new Error(`${fullName} has LEFT the Recruited board across a dialog that was only ever `
            + 'cancelled — the invite was submitted after all. The row beats are now broken for future '
            + 're-records; investigate before shooting.');
        }
        console.log(`[act1]   s1_14: verified — ${fullName} still on the Recruited board (not converted)`);
      }
      console.log(`[act1]   s1_14: verified — ${fullName} still in ILO with status "Invited to join"`);
      return;
    }

    if (!onRlo) {
      throw new Error(`${fullName} is on neither board: not on Recruited LO (so the invite cannot be `
        + `performed) and not in ILO with "Invited to join" (so it was never converted). Re-record `
        + 'act 0 to create the candidate first.');
    }

    console.log(`[act1]   s1_14: BRANCH = INVITE — ${fullName} is on the Recruited board only; performing the transition.`);
    await inviteToILO(page, h, ownRow);
    await h.hold(2);

    // VERIFY — deliberately NOT optional(). This scene's whole purpose is the state transition,
    // and an earlier version reported "ok" while every modal interaction had been skipped, which
    // then sank act 4 and act 5.
    const verified = await alreadyInILO();
    if (!verified) {
      throw new Error(`the invite was submitted but ${fullName} is NOT in the Interested-LO `
        + 'pipeline (checked ILO/Mine directly and via the label search). Acts 4 and 5 operate on '
        + 'that ILO record, so stop and fix this before recording them.');
    }
    if (!/Invited to join/i.test(verified)) {
      throw new Error(`${fullName} reached the ILO pipeline but its status is not "Invited to join" `
        + `— the row reads: ${verified.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    console.log('[act1]   s1_14: verified in ILO with status "Invited to join"');
  });

  await h.scene('s1_15', async () => {
    // Same human, second warehouse, different vocabulary (8 ILO statuses vs 10 RLO statuses).
    // Scope the reveals to the candidate's ILO ROW: unscoped, /Invited to join/ also matches the
    // stats tile above the board ("Invited but not onboarding"), which is hidden or elsewhere on the
    // page — that is why this hover was skipped in shoots 2 and 3. Note rowOfCandidate() may point
    // at a substitute on the RECRUITED board (see the top of act1), so name the candidate directly
    // here: on the ILO board he is present by definition once s1_14 has verified him.
    await h.goto(URLS.iloMine);
    const iloRow = h.row(fullName);
    await h.optional('find the candidate', () => h.moveTo(() => iloRow, { timeout: 10_000 }));
    await h.hold(1);
    await h.optional('converted badge', () =>
      h.moveTo(() => iloRow.getByText(/Converted from recruited LO/i), { timeout: 6000 }));
    await h.hold(1);
    await h.optional('invited-to-join status', () =>
      h.moveTo(() => iloRow.getByText(/Invited to join/i), { timeout: 6000 }));
  });
}

// ---------------------------------------------------------------------------
// ACT 2 — Inside Recruiter (Nocha): same table, different book
// Storyboard rows 2.1 – 2.5
// ---------------------------------------------------------------------------

export async function act2(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  await h.scene('s2_1', async () => {
    await h.goto(URLS.iloMine);
    // The point: there is only a Mine tab. Show the tab strip and the missing Company tab.
    await h.optional('tab strip', () => h.moveTo(() => page.getByText(/^\s*Mine\s*$/i).first(), { timeout: 8000 }));
    await h.hold(2);
    const companyTab = page.getByText(/^\s*Company\s*$/i);
    console.log(`[act2]   Company tab visible for this role: ${(await companyTab.count()) > 0}`);
  });

  await h.scene('s2_2', async () => {
    // Reality check done 2026-08-04: Marcus is owned by LUIS, and nocha's role has no Company tab,
    // so her ILO Mine renders "No results." She cannot open his record at all. That absence IS the
    // finding, and the narration was rewritten to say so — do not try to open a row here.
    await h.optional('point at the empty grid', () =>
      h.moveTo(() => page.getByText(/No results/i).first(), { timeout: 8000 }));
    await h.hold(3);
    // VERIFIED 2026-08-04 (probed on the ILO board): when a role has only ONE tab the strip is not
    // rendered visibly at all — the "Mine" tab exists but reads vis=false, and `div.tab-container
    // nav[role=tablist]` is not present on this view (LORecruitingListView). So there is nothing to
    // point at; the absence can only be stated in narration, which it is. Hold on the view heading
    // instead, which is always there, and log the counts as evidence for the shoot log.
    console.log(`[act2]   visible tabs on this ILO view: ${await page.locator('a[role="tab"]:visible').count()}`
      + ` (Company present: ${(await page.getByRole('tab', { name: 'Company' }).count()) > 0})`);
    await h.optional('hold on the view heading', () =>
      h.moveTo(() => page.getByText(/INTERESTED LOAN OFFICERS/i), { timeout: 8000 }));
    await h.hold(2.5);
    await h.optional('scan the whole empty board', () => h.smoothScroll('window', 220));
  });

  await h.scene('s2_3', async () => {
    await h.goto(URLS.rloMine);
    // Toolbar diff vs Luis: no Add / Delete / Assign recruiter; bulk Action has one entry.
    for (const t of [/^\s*Add\s*$/i, /^\s*Delete\s*$/i, /Assign recruiter/i]) {
      console.log(`[act2]   toolbar "${t}" present: ${(await page.getByText(t).count()) > 0}`);
    }
    await h.optional('open bulk Action', () =>
      h.click([
        () => page.getByRole('button', { name: /^\s*Action\s*$/i }).first(),
        () => page.getByText(/^\s*Action\s*$/i).first(),
      ], { timeout: 8000 }));
    await h.hold(2);
    await h.optional('only Update data using Modex', () =>
      h.moveTo(() => page.getByText(/Update data using Modex/i).first(), { timeout: 5000 }));
    await h.hold(1.5);
    await h.dismiss();
    await h.optional('Pending approvals tab', () =>
      h.moveTo(() => page.getByText(/Pending approvals/i).first(), { timeout: 5000 }));
  });

  await h.scene('s2_4', async () => {
    // An inside recruiter can still open the company-wide config, Calendly token included.
    await h.goto(URLS.config);
    await h.optional('Calendly tab', () =>
      h.moveTo(() => page.getByText(/1-1 Meeting using Calendly/i).first(), { timeout: 6000 }));
    await h.hold(2);
  });

  await h.scene('s2_5', async () => {
    // Self-apply queue. "Check Modex" per row is the system admitting it needs another site.
    // VERIFIED 2026-08-04: "Pending approvals" cannot be deep-linked (the space bounces to
    // /Mine) — reach it by clicking the tab.
    //
    // ONE-WAY, and note this beat targets a DIFFERENT record from the rest of the shoot: whichever
    // self-apply row is at the top of the queue, not Marcus. Approving moves it into the Company tab
    // and cannot be undone, so it gets the same three-way branch. "Already done" here means the
    // queue is empty — there is nothing left to approve.
    const openQueue = async () => {
      await h.goto(URLS.rloMine);
      await h.clickTab(TABS.pendingApprovals);
      return h.waitForRows();
    };

    let queue = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      queue = await openQueue().catch((err) => ({ rows: 0, empty: false, pager: err.message }));
      if (queue.rows > 0 || queue.empty) break;
      console.warn(`[act2]   s2_5: queue read attempt ${attempt}/3 inconclusive (pager "${queue.pager}")`);
      if (attempt < 3) await h.hold(5);
    }
    if (!(queue.rows > 0 || queue.empty)) {
      throw new Error('CANNOT DETERMINE whether anything is pending approval — the queue never '
        + 'loaded after 3 attempts, reporting neither rows nor an empty state. REFUSING to guess: '
        + 'Approve is irreversible and targets whatever row happens to be first.');
    }

    await h.optional('Check Modex link', () =>
      h.moveTo(() => page.getByText(/Check Modex/i).first(), { timeout: 8000 }));
    await h.hold(2);

    if (queue.rows === 0) {
      // ALREADY DONE — positive assertion: the board explicitly reports an empty queue.
      console.warn('[act2]   s2_5: BRANCH = ALREADY DONE — Pending approvals is empty (the board');
      console.warn('[act2]   s2_5: reports its empty state, it did not merely fail to load). THIS TAKE');
      console.warn('[act2]   s2_5: CONTAINS NO REAL MUTATION: the queue and its Check Modex column are');
      console.warn('[act2]   s2_5: shown, and no Approve is filmed. Nothing is re-approved.');
      await h.hold(3);
      return;
    }

    const targetRow = page.locator('table.table-hover tbody tr').filter({ hasText: /\S/ }).first();
    const pendingTarget = ((await targetRow.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 40);
    // A row we cannot name is a row we cannot verify afterwards.
    if (!pendingTarget) {
      throw new Error('CANNOT DETERMINE: the queue reports rows but the first row yielded no text, '
        + 'so the outcome of an Approve could not be verified. Refusing to mutate blind.');
    }
    console.log(`[act2]   s2_5: BRANCH = PERFORM — approving the top self-apply record: "${pendingTarget}"`);
    const fingerprint = pendingTarget.split(' ').slice(0, 3).join(' ');

    await h.click([
      () => targetRow.getByRole('button', { name: /^\s*Action/i }).first(),
      () => page.getByRole('button', { name: /^\s*Action/i }).first(),
    ], { timeout: 6000 });
    await h.hold(1);
    await h.click(() => page.getByText(/^\s*Approve\s*$/i).first(), { timeout: 5000 });
    await h.hold(1.5);
    await h.optional('confirm the approval', () => h.click(
      () => page.getByRole('button', { name: btnName('Yes', 'OK', 'Confirm', 'Approve') }).first(), { timeout: 5000 }));
    console.log('[act2]   s2_5: Approve submitted (staging mutation, by design)');
    await h.hold(3);

    // VERIFY — Approve must actually remove the record from the queue.
    const after = await openQueue();
    const stillPending = await page.locator('table.table-hover tbody tr')
      .filter({ hasText: fingerprint }).count();
    if (stillPending) {
      throw new Error(`the Approve did not take effect: "${pendingTarget}" is STILL in Pending `
        + `approvals (queue now reports ${after.rows} row(s)). The narration claims it moved to the `
        + 'Company tab, so do not ship this take.');
    }
    console.log(`[act2]   s2_5: verified — "${pendingTarget}" left Pending approvals`);
  });
}

// ---------------------------------------------------------------------------
// ACT 3 — Licensing (Chu Con Gi Nua): the role the module left out
// Storyboard rows 3.1 – 3.4
// ---------------------------------------------------------------------------

export async function act3(page, h) {
  await h.scene('s3_1', async () => {
    await h.goto(URLS.canary);
    // The evidence is an ABSENCE: no LO RECRUITING entry in this role's menu.
    const present = await page.getByText(/LO RECRUITING/i).count();
    console.log(`[act3]   "LO RECRUITING" menu entries visible: ${present}`);
    await h.optional('pan across the menu', async () => {
      // VERIFIED 2026-08-04: the sidebar carries NO role=navigation (probing as licensing
      // returned 0), and `nav` matches the grid tab strip instead. Anchor on a sidebar entry that
      // definitely exists for every role — the gwt-debug section links — and scroll its container.
      const scroller = await h.scrollableNear([gwt('admin'), gwt('users'), () => page.locator('nav').first()]);
      await h.smoothScroll(scroller || 'window', 500, { steps: 14 });
      await h.hold(1);
      await h.smoothScroll(scroller || 'window', -500, { steps: 10 });
    });
  });

  await h.scene('s3_2', async () => {
    // Typing the route by hand: silent redirect, no 403, no message.
    const before = URLS.iloMine;
    await page.goto(before, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await h.hold(3);
    console.log(`[act3]   asked for ${before} -> landed on ${page.url()}`);
    await h.hold(1.5);
  });

  await h.scene('s3_3', async () => {
    // Production comparison (Licensing sees 23.5K ILO + can open config) is a SLIDE built in
    // assemble.mjs — nothing to drive here, just hold the current screen for the narration.
    await h.hold(0.5);
  });

  await h.scene('s3_4', async () => {
    // Licensing's own data lives as COLUMNS in someone else's table. This role cannot open
    // that table on staging, so try and fall back to a hold; the columns themselves are
    // shown from HR's session in act 4 / act 5.
    const reached = await h.optional('try the ILO table', async () => {
      await h.goto(URLS.iloCompany);
      for (const c of [/NMLS status/i, /License status/i, /States to sponsor/i]) {
        await h.optional(`column ${c}`, () => h.moveTo(() => page.getByText(c).first(), { timeout: 3000 }));
        await h.hold(0.8);
      }
    });
    if (!reached) console.log('[act3]   s3_4 has no drivable screen for this role — narration over the redirect');
  });
}

// ---------------------------------------------------------------------------
// ACT 4 — HR (Ken): money, signature, and the "100% onboarded" gate
// Storyboard rows 4.1 – 4.8
// ---------------------------------------------------------------------------

export async function act4(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  await h.scene('s4_1', async () => {
    await h.goto(URLS.iloCompany);
    // 11 funnel tiles, each a drill-down that counts but assigns nothing.
    for (const s of [/Paid but not signed/i, /NMLS sponsored but HR onboarding/i, /HR completed but NMLS not sponsored/i, /100% onboarded/i]) {
      await h.optional(`stat ${s}`, () => h.moveTo(() => page.getByText(s).first(), { timeout: 3500 }));
      await h.hold(0.9);
    }
    await h.hold(1);
  });

  await h.scene('s4_2', async () => {
    // ONE-WAY. Startup fee = Paid is the only auto-transition in the system (status jumps to
    // Onboarding) and it cannot be undone, so this is a three-way branch: a non-idempotent retry
    // after a later failure in act 4 would hard-fail on an already-advanced record, and recovering
    // from that means a new candidate plus re-recording acts 0, 1 and 2.
    const fullName = candidate.name || 'Marcus Reyes';
    const before = await readIloStateOrFail(page, h, fullName, 'act4]   s4_2');
    console.log(`[act4]   s4_2: state = status "${before.status}" / fee "${before.fee}" / agreement "${before.agreement}"`);

    const isPaid = /^Paid$/i.test(before.fee);
    const isUnpaid = /^(Unpaid|Not paid)$/i.test(before.fee);
    const advanced = /Onboarding|100% onboarded/i.test(before.status);

    if (isPaid) {
      // ALREADY DONE — but assert POSITIVELY that the observed state is what paying would have
      // produced. Fee Paid while the status never left "Invited to join" is a third state that
      // neither branch expects, and must not be waved through.
      if (!advanced) {
        throw new Error(`CANNOT DETERMINE: the startup fee already reads "Paid" but the status is `
          + `"${before.status}", not Onboarding/100% onboarded. Paying is supposed to auto-advance the `
          + 'status, so this record is in a third state neither branch expects — inspect it by hand.');
      }
      console.warn(`[act4]   s4_2: BRANCH = ALREADY DONE — fee is "Paid" and the status has already`);
      console.warn(`[act4]   s4_2: auto-advanced to "${before.status}". THIS TAKE CONTAINS NO REAL MUTATION:`);
      console.warn('[act4]   s4_2: the fee field is shown and narrated over the existing state, and the');
      console.warn('[act4]   s4_2: auto-jump is NOT filmed happening. Re-pay is not attempted.');
      await h.optional('show the fee field', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
      await h.hold(2);
      await h.optional('hold on the advanced status', () =>
        h.moveTo(() => rowOfCandidate().getByText(/Onboarding|100% onboarded/i).first(), { timeout: 6000 }));
      await h.hold(2);
      return;
    }

    if (!isUnpaid) {
      throw new Error(`CANNOT DETERMINE: the startup fee reads "${before.fee}", which is neither `
        + 'Paid nor Unpaid/Not paid. Refusing to act on an unrecognised state.');
    }

    console.log('[act4]   s4_2: BRANCH = PERFORM — fee is Unpaid; setting it to Paid on camera.');
    await h.optional('open the candidate', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*(Unpaid|Not paid)\s*$/i }).first(),
      () => rowOfCandidate().getByText(/Not paid|Unpaid/i).first(),
    ], { timeout: 8000 });
    await h.hold(1.5);
    await pickCellOption(page, h, /^\s*Paid\s*$/i, 'the fee');
    await h.hold(3);
    // Hold on the status cell so the automatic jump is visible on camera.
    await h.optional('watch the status flip', () =>
      h.moveTo(() => rowOfCandidate().getByText(/Onboarding/i).first(), { timeout: 8000 }));
    await h.hold(2);

    // VERIFY the transition really happened — positively, on the re-read state.
    const after = await readIloStateOrFail(page, h, fullName, 'act4]   s4_2 verify');
    if (!/^Paid$/i.test(after.fee)) {
      throw new Error(`the startup fee was NOT recorded as Paid — it still reads "${after.fee}" `
        + `(status "${after.status}"). s4_4 and act 5 depend on this, so stop here.`);
    }
    if (!/Onboarding|100% onboarded/i.test(after.status)) {
      throw new Error(`the fee is now "Paid" but the status did NOT auto-jump — it reads `
        + `"${after.status}". That auto-transition is the entire point of this scene.`);
    }
    console.log(`[act4]   s4_2: verified — fee "Paid" and the status auto-jumped to "${after.status}"`);
  });

  await h.scene('s4_3', async () => {
    // Re-generate e-sign docs + send email. The system tracks signed / not signed, never
    // sent / opened / viewed.
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Re-generate e-sign documents and send email', { prefix: true });
    await h.hold(2);
    await h.optional('confirm', () => h.click(() => page.getByRole('button', { name: btnName('Yes', 'OK', 'Submit', 'Send') }).first(), { timeout: 5000 }));
    // NOT verifiable, and that is precisely the documented pain: the app tracks signed / not signed
    // but never sent / opened / viewed, so there is NO state change to assert after re-generating.
    // Deliberately not a hard failure — unlike s4_2/s4_4/s1_14, nothing here claims a transition.
    console.log('[act4]   s4_3: e-sign documents re-generated; the app records nothing about "sent",');
    console.log('[act4]   s4_3: so this beat cannot be verified — that gap is the point of the scene.');
    await h.hold(3);
    // The actual signing happens in the candidate's inbox: a human beat, opt-in via --mail-url.
    // Use a Mailinator PUBLIC inbox. NOT temp-mail.org: a temp-mail.org address is bound to the
    // cookie of the browser that created it, so the recording browser would open an empty,
    // different inbox. A Mailinator public inbox is addressable by URL from any session.
    if (cfg.mailUrl) {
      const tab = await page.context().newPage();
      cfg.extraPages?.push({ label: 'act4-mail', page: tab });
      await tab.goto(cfg.mailUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await tab.bringToFront();
      await sleep(8000); // the human opens the mail and signs while this holds
      await page.bringToFront();
      await h.goto(URLS.iloCompany);
      await h.optional('signed', () => h.moveTo(() => rowOfCandidate().getByText(/Signed/i).first(), { timeout: 8000 }));
    } else {
      console.log('[act4]   s4_3: inbox signing beat SKIPPED (pass --mail-url <public inbox URL>)');
    }
  });

  await h.scene('s4_4', async () => {
    // ONE-WAY. The finding of the act: the gate only checks Paid + Signed, so NMLS / HR / 1-1 can
    // all be outstanding and the record still counts as "100% onboarded". Same three-way branch as
    // s4_2 — the status cannot be walked back.
    const fullName = candidate.name || 'Marcus Reyes';
    const before = await readIloStateOrFail(page, h, fullName, 'act4]   s4_4');
    console.log(`[act4]   s4_4: state = status "${before.status}" / fee "${before.fee}"`);

    const showPrereqs = async () => {
      await h.optional('show the unfinished prerequisites', async () => {
        for (const c of [/NMLS status/i, /HR status/i, /1-1 Onboarding meeting/i]) {
          await h.optional(`column ${c}`, () => h.moveTo(() => page.getByText(c).first(), { timeout: 3000 }));
          await h.hold(0.7);
        }
      });
    };

    if (/^100% onboarded$/i.test(before.status)) {
      // ALREADY DONE — positive assertion: the status IS the value the transition produces, and the
      // fee prerequisite it depends on is genuinely satisfied.
      if (!/^Paid$/i.test(before.fee)) {
        throw new Error(`CANNOT DETERMINE: the status already reads "100% onboarded" but the startup `
          + `fee reads "${before.fee}". The gate requires Paid, so this record is in a third state `
          + 'neither branch expects — inspect it by hand.');
      }
      console.warn('[act4]   s4_4: BRANCH = ALREADY DONE — the status is already "100% onboarded"');
      console.warn('[act4]   s4_4: (fee Paid). THIS TAKE CONTAINS NO REAL MUTATION: the outstanding');
      console.warn('[act4]   s4_4: prerequisites are shown and narrated over the existing state, and the');
      console.warn('[act4]   s4_4: gate is NOT filmed being crossed.');
      await showPrereqs();
      await h.optional('hold on the gate result', () =>
        h.moveTo(() => rowOfCandidate().getByText(/100% onboarded/i).first(), { timeout: 6000 }));
      await h.hold(2);
      return;
    }

    // PERFORM requires the fee prerequisite; without it the gate legitimately refuses and we would
    // be filming a failure we mistook for a bug.
    if (!/^Paid$/i.test(before.fee)) {
      throw new Error(`CANNOT DETERMINE: cannot set "100% onboarded" because the startup fee reads `
        + `"${before.fee}", not Paid. s4_2 must succeed first.`);
    }

    console.log(`[act4]   s4_4: BRANCH = PERFORM — status is "${before.status}"; crossing the gate on camera.`);
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: new RegExp(`^\\s*${before.status.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).first(),
      () => rowOfCandidate().getByText(/Onboarding|Invited to join|New/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1.5);
    await showPrereqs();
    await pickCellOption(page, h, /^\s*100% onboarded\s*$/i, 'the status');
    await h.hold(3);

    // VERIFY — the gate is the whole finding of this act, so a silent no-op must not pass.
    const after = await readIloStateOrFail(page, h, fullName, 'act4]   s4_4 verify');
    if (!/^100% onboarded$/i.test(after.status)) {
      throw new Error(`the record was NOT moved to "100% onboarded" — the status reads `
        + `"${after.status}". That status is what act 7 and the wrap-up narration describe.`);
    }
    console.log('[act4]   s4_4: verified — status is "100% onboarded" (NMLS/HR/1-1 still outstanding)');
  });

  await h.scene('s4_5', async () => {
    // Template settings: real asset (per-status Email / SMS / Call script), on a settings page
    // every role can open.
    await h.goto(URLS.iloCompany);
    // VERIFIED 2026-08-04: the TOOLBAR Action is <a id="gwt-debug-action">; getByRole('button')
    // grabbed a per-row Action button instead, which has no Template settings item — that is why
    // this scene failed. Anchor on the id.
    await h.click([
      () => page.locator('#gwt-debug-action'),
      () => page.locator('a', { hasText: /^\s*Action\s*$/i }).first(),
    ], { timeout: 8000 });
    await h.hold(1);
    await h.click([() => page.getByText(/Template settings/i).first()], { timeout: 6000 });
    await h.hold(2.5);
    for (const t of [/Email/i, /SMS/i, /Call script/i]) {
      await h.optional(`template ${t}`, () => h.click(() => page.getByText(t).first(), { timeout: 3500 }));
      await h.hold(1.4);
    }
    await h.optional('scroll a template body', () => h.smoothScroll('window', 400, { steps: 12 }));
  });

  await h.scene('s4_6', async () => {
    // Calendly invite: the meeting lives in Calendly, the result is a checkbox in here, and
    // nothing connects the two.
    await h.goto(URLS.iloCompany);
    // s4_4 may have advanced the record to "100% onboarded", which drops it off page one.
    await ensureCandidateVisible(page, h, candidate.name || 'Marcus Reyes');
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Invite 1-1 meeting', { prefix: true });
    await h.hold(2.5);
    await h.optional('send the invite', () => h.click(() => page.getByRole('button', { name: btnName('Send', 'Submit') }).first(), { timeout: 5000 }));
    await h.hold(2);
  });

  await h.scene('s4_7', async () => {
    // Create new account: the boundary between recruiting and the rest of the company.
    // Open the form and walk it — do NOT submit (that would create a real associate).
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Create new account', { prefix: true });
    await h.hold(2.5);
    for (const f of [/W-2|W-9|Outside Salesperson/i, /classification/i, /probation/i, /branch/i, /team/i, /manager/i, /company email/i]) {
      await h.optional(`field ${f}`, () => h.moveTo(() => page.getByText(f).first(), { timeout: 3000 }));
      await h.hold(0.7);
    }
    await h.hold(1);
    // INTRODUCE ONLY — never submit. This is the single most destructive beat in the shoot: it
    // creates a REAL associate account, one-way and unrecoverable. Nothing here clicks a submit, but
    // a dismiss that silently fails would leave the form open for a later scene's stray click, so
    // assert it actually closed and stop the act if it did not.
    await h.dismiss();
    await h.hold(0.5);
    const stillOpen = await page.locator('.modal.show').count();
    if (stillOpen) {
      const looksLikeAccountForm = await page.locator('.modal.show')
        .filter({ hasText: /classification|probation|company email|W-2|W-9/i }).count();
      if (looksLikeAccountForm) {
        throw new Error('the "Create new account" form is STILL OPEN after dismiss(). Refusing to '
          + 'continue: this form creates a real associate account, and leaving it open risks a later '
          + 'click submitting it. Close it by hand and re-run the act.');
      }
      console.warn('[act4]   s4_7: a modal is still open after dismiss, but it is not the account form.');
    }
    console.log('[act4]   s4_7: account form introduced and confirmed closed — nothing was submitted.');
  });

  await h.scene('s4_8', async () => {
    // INTRODUCE ONLY: company-wide Delete over the whole 23.5K pipeline. Hover, never click.
    await h.goto(URLS.iloCompany);
    await h.optional('hover Delete', () => h.moveTo(() => page.getByText(/^\s*Delete/i).first(), { timeout: 6000 }));
    await h.hold(2.5);
  });
}

// ---------------------------------------------------------------------------
// ACT 5 — Onboarding Specialist (Maria): a checklist that runs on email
// Storyboard rows 5.1 – 5.5
// ---------------------------------------------------------------------------

export async function act5(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  await h.scene('s5_1', async () => {
    await h.goto(URLS.iloMine);
    // VERIFIED 2026-08-04 (probed on the ILO board): when a role has only ONE tab the strip is not
    // rendered visibly at all — the "Mine" tab exists but reads vis=false, and `div.tab-container
    // nav[role=tablist]` is not present on this view (LORecruitingListView). So there is nothing to
    // point at; the absence can only be stated in narration, which it is. Hold on the view heading
    // instead, which is always there, and log the counts as evidence for the shoot log.
    await h.optional('hold on the view heading', () =>
      h.moveTo(() => page.getByText(/INTERESTED LOAN OFFICERS/i), { timeout: 8000 }));
    console.log(`[act5]   visible tabs: ${await page.locator('a[role="tab"]:visible').count()}`
      + ` (Company present: ${(await page.getByRole('tab', { name: 'Company' }).count()) > 0})`);
    await h.hold(2);
  });

  await h.scene('s5_2', async () => {
    // Why a record already has an owner: an auto-assign toggle buried in settings.
    // VERIFIED 2026-08-04: deep-linkable by data-name; /lo_recruiting_config alone always
    // redirects to the Webinar tab, which is why the toggles looked missing.
    await h.goto(URLS.configOwnerAssignment, { rows: false });
    await h.hold(2.5);
    for (const t of [/Recruiter/i, /Onboarding specialist/i, /Support/i]) {
      await h.optional(`toggle ${t}`, () => h.moveTo(() => page.getByText(t).first(), { timeout: 3000 }));
      await h.hold(0.8);
    }
  });

  await h.scene('s5_3', async () => {
    // The whole onboarding checklist is a row of columns: no owner, no due date, no order.
    await h.goto(URLS.iloMine);
    // If act 4 already advanced the record to "100% onboarded" it is off page one here too.
    await ensureCandidateVisible(page, h, candidate.name || 'Marcus Reyes');
    await h.optional('find the candidate', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    const header = [() => page.getByText(/NMLS status/i).first(), () => page.locator('table').first()];
    const scroller = await h.scrollableNear(header);
    for (const c of [/NMLS status/i, /License status/i, /HR status/i, /1-1 Onboarding meeting/i, /Attended/i]) {
      await h.optional(`column ${c}`, () => h.moveTo(() => page.getByText(c).first(), { timeout: 3000 }));
      await h.hold(0.8);
    }
    await h.smoothScroll(scroller || 'window', 900, { axis: 'x', steps: 16, gap: 55 });
    await h.hold(1);
  });

  await h.scene('s5_4', async () => {
    // Asking Licensing for a status = a note plus an email. That is the workflow engine.
    await h.click([
      () => rowOfCandidate().locator('[class*="material-icons"]').filter({ hasText: /comment|chat/i }).first(),
      () => rowOfCandidate().getByText(/^\s*Note\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('write the question', () =>
      h.typeInto([
        () => page.getByRole('textbox').last(),
        () => page.locator('[contenteditable="true"]').last(),
      ], 'Licensing — any update on the NMLS sponsorship for Marcus? HR is done, I am holding onboarding on this.', { delay: 24, clear: false }));
    await h.hold(1);
    await h.optional('Save + Email to Licensing', async () => {
      await h.click([() => page.getByText(/Save \+ Email/i).first()], { timeout: 5000 });
      await h.hold(2);
      await h.optional('tick Licensing', () => h.click(() => page.getByText(/^\s*Licensing\s*$/i).first(), { timeout: 4000 }));
      await h.optional('send', () => h.click(() => page.getByRole('button', { name: btnName('Send', 'Submit', 'Save') }).first(), { timeout: 4000 }));
      await h.hold(2);
    });
  });

  await h.scene('s5_5', async () => {
    // Webinar registration + attendance by CSV import: "attended" always lags reality.
    await h.click([
      // VERIFIED 2026-08-03: per-row Action is <button>Action</button> (the toolbar one is an
      // <a id="gwt-debug-action">). Items carry data-name; see h.dropdownItem.
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action\s*$/i }),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.clickMenuItem(rowOfCandidate(), 'Register for a webinar');
    await h.hold(2.5);
    await h.dismiss();
    await h.hold(1);
    await h.optional('bulk attendance import', async () => {
      await h.click([
        () => page.getByRole('button', { name: /^\s*Action\s*$/i }).first(),
        () => page.getByText(/^\s*Action\s*$/i).first(),
      ], { timeout: 6000 });
      await h.hold(1);
      await h.click(() => page.getByText(/Attendance tracking/i).first(), { timeout: 5000 });
      await h.hold(2.5);
      // Introduce only: no CSV is uploaded on camera.
      await h.dismiss();
    });
  });
}

// ---------------------------------------------------------------------------
// ACT 6 — Accounting (Admin Request): numbers and referral money
// Storyboard rows 6.1 – 6.4
// ---------------------------------------------------------------------------

export async function act6(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};

  await h.scene('s6_1', async () => {
    await h.goto(URLS.iloCompany);
    // Accounting is the ONLY role with Export (csv) — the real reporting lives in spreadsheets.
    await h.click([
      () => page.getByRole('button', { name: /^\s*Action\s*$/i }).first(),
      () => page.getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 8000 });
    await h.hold(1.5);
    await h.moveTo(() => page.getByText(/Export \(csv\)/i).first(), { timeout: 6000 });
    await h.hold(1);
    await h.optional('run the export', async () => {
      const dl = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
      await h.click(() => page.getByText(/Export \(csv\)/i).first(), { timeout: 5000 });
      const file = await dl;
      if (file) console.log(`[act6]   export produced: ${file.suggestedFilename()}`);
      await h.hold(2);
    });
  });

  // s6_2 / s6_3 / s6_4 ARE NOT SHOT HERE — they are filmed in act 7's admin context.
  // VERIFIED 2026-08-04 probing as Accounting: /loan_officer_referrals silently redirects to
  // /marketplace/Lenders for this role. The LO RECRUITING menu hrefs show ##loan_officer_referrals
  // is the "Admin - Loan Officer referrals" page, reachable only by admin, so the referral policy,
  // payout-timeline and Zelle beats cannot be filmed in the Accounting session. Act 6 keeps s6_1,
  // which is the role-specific point anyway: Accounting is the ONLY role with Export (csv)
  // (confirmed present here, absent for HR).
}

// ---------------------------------------------------------------------------
// ACT 7 — Wrap-up (admin session again, fresh context from the admin state)
// Storyboard rows 7.1 – 7.4
// ---------------------------------------------------------------------------

export async function act7(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  // These three beats belong to act 6 but are filmed HERE because the Admin - Loan Officer
  // referrals page is admin-only (see the note at the end of act6). markers.json records their
  // true on-camera offsets in THIS video, so their narration lands on the referrals screen.
  // VERIFIED 2026-08-04: the policy modal opener is `button#loan-officer-referral-policy`.
  await h.scene('s6_2', async () => {
    // Referral policy: five exclusions printed in a modal that the system does not enforce.
    await h.goto(URLS.referrals);
    await h.optional('open the policy modal', () =>
      h.click(['#loan-officer-referral-policy'], { timeout: 8000 }));
    await h.hold(2.5);
    await h.optional('read the exclusions', () => h.smoothScroll(() => page.getByText(/120 days|eligible/i).first(), 420, { steps: 12 }));
    await h.hold(1.5);
    await h.dismiss();
  });

  await h.scene('s6_3', async () => {
    // 60 days to ripen + a Saturday cron + Commission Team approval = ~75 days.
    // Nothing to drive: hold on the referral record while the narration does the arithmetic.
    await h.optional('point at the referral row', () =>
      h.moveTo(() => page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first(), { timeout: 6000 }));
    await h.hold(1.5);
  });

  await h.scene('s6_4', async () => {
    // Payout method is a free-text field in a recruiting form, not a payroll record.
    await h.optional('open the referral edit form', () =>
      h.click([
        () => page.getByRole('link', { name: /^\s*Edit\s*$/i }).first(),
        () => page.getByText(/^\s*Edit\s*$/i).first(),
      ], { timeout: 8000 }));
    await h.hold(2);
    await h.optional('Zelle option', () => h.moveTo(() => page.getByText(/Zelle/i).first(), { timeout: 5000 }));
    await h.hold(2);
    await h.dismiss();
  });

  await h.scene('s7_1', async () => {
    await h.goto(URLS.iloCompany);
    // THE CLOSING REVEAL. By now the record is "100% onboarded" — exactly the state that drops it off
    // page one of this board (verified live 2026-08-04). The previous hand-rolled optional search had
    // the same shape as the ones that silently skipped all through shoots 2 and 3, so use the shared
    // verified path (h.filterGrid) and say so loudly if the final shot has no subject.
    await h.hold(1);
    if (!(await ensureCandidateVisible(page, h, candidate.name || 'Marcus Reyes'))) {
      console.error(`[act7]   s7_1: ${candidate.name || 'Marcus Reyes'} is not on the ILO board even by`);
      console.error('[act7]   s7_1: search — the closing state reveal has no subject to rest on.');
    }
    await h.hold(2);
    await h.optional('final state', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    await h.hold(2);
    const scroller = await h.scrollableNear([() => page.locator('table').first()]);
    await h.smoothScroll(scroller || 'window', 1200, { axis: 'x', steps: 20, gap: 55 });
    await h.hold(1.5);
  });

  await h.scene('s7_2', async () => {
    // Pain-badge montage is cut in assemble.mjs from the recorded footage; hold a clean frame.
    await h.hold(0.5);
  });

  await h.scene('s7_3', async () => {
    // Slide: the six lead sources. Built in assemble.mjs — hold here.
    await h.hold(0.5);
  });

  await h.scene('s7_4', async () => {
    // Closing beat over the record.
    await h.optional('rest on the record', () => h.moveTo(() => rowOfCandidate(), { timeout: 6000 }));
    await h.hold(1.5);
  });
}

// ---------------------------------------------------------------------------
// runner
// ---------------------------------------------------------------------------

export const ACT_PLAN = [
  { id: 0, role: 'admin', fn: act0 },
  { id: 1, role: 'luis', fn: act1 },
  { id: 2, role: 'nocha', fn: act2 },
  { id: 3, role: 'licensing', fn: act3 },
  { id: 4, role: 'ken', fn: act4 },
  { id: 5, role: 'maria', fn: act5 },
  { id: 6, role: 'accounting', fn: act6 },
  { id: 7, role: 'admin', fn: act7 },
];

export function parseArgs(argv = process.argv.slice(2)) {
  const out = {
    acts: null,
    auth: authPathFor('admin'),
    outDir: path.join(HERE, 'video'),
    markers: path.join(HERE, 'markers.json'),
    durations: null,
    roleState: false,
    forceLoginAs: false,
    provision: false,
    checkStates: false,
    freshMarkers: false,
    trim: 0,
    modex: false,
    modexUrl: null,
    mailUrl: null,
    // Name of a SAFE record to demonstrate row controls on when the candidate has already been
    // converted off the Recruited board. See the substitute picker in act1.
    demoRecord: null,
    slow: 0,
    candidate: {
      name: 'Marcus Reyes',
      email: '',            // supplied at shoot time via --candidate-email (see --mail-url)
      phone: '(444) 433-3444',
      nmls: '107621',
      channel: 'Retail LO',
      experience: 'Experienced',
      priority: 'High',
    },
    role: null,             // inspect.mjs only
    act: null,              // inspect.mjs only
    loginAs: false,         // inspect.mjs only
    openModals: false,      // inspect.mjs only
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--acts': out.acts = next().split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n)); break;
      case '--act': out.act = Number(next()); break;
      case '--auth': out.auth = path.resolve(next()); break;
      case '--out': out.outDir = path.resolve(next()); break;
      case '--markers': out.markers = path.resolve(next()); break;
      case '--durations': out.durations = path.resolve(next()); break;
      case '--role-state': out.roleState = true; break;
      case '--force-login-as': out.forceLoginAs = true; break;
      case '--provision': out.provision = true; break;
      case '--check-states': out.checkStates = true; break;
      case '--fresh-markers': out.freshMarkers = true; break;
      case '--role': out.role = next(); break;
      case '--login-as': out.loginAs = true; break;
      case '--open-modals': out.openModals = true; break;
      case '--trim': out.trim = Number(next()); break;
      case '--modex': out.modex = true; break;
      case '--modex-url': out.modexUrl = next(); out.modex = true; break;
      case '--mail-url': out.mailUrl = next(); break;
      case '--slow': out.slow = Number(next()); break;
      case '--login-timeout': LOGIN_WAIT_MS = Math.max(1, Number(next())) * 60 * 1000; break;
      case '--candidate-name': out.candidate.name = next(); break;
      case '--candidate-email': out.candidate.email = next(); break;
      case '--demo-record': out.demoRecord = next(); break;
      case '--candidate-phone': out.candidate.phone = next(); break;
      case '--candidate-nmls': out.candidate.nmls = next(); break;
      default:
        if (a.startsWith('--')) console.warn(`[args] ignoring unknown flag ${a}`);
    }
  }
  return out;
}

export async function launchBrowser({ slow = 0 } = {}) {
  return chromium.launch({
    headless: false,
    slowMo: slow,
    args: [
      `--window-size=${VIEWPORT.width},${VIEWPORT.height + 120}`,
      '--window-position=0,0',
      '--force-device-scale-factor=1',
      '--disable-features=Translate',
      '--hide-crash-restore-bubble',
    ],
  });
}

/**
 * Decide what an existing markers.json contributes to this run.
 * Pure and exported so the merge rule can be tested without recording anything.
 *
 * Entries whose `act` is being recorded now are dropped (they get replaced); everything else is
 * carried over untouched. `extraVideos` follow the same rule.
 */
export function planMarkerMerge({ prev, recordingActIds }) {
  const recording = new Set(recordingActIds);
  const videos = Array.isArray(prev?.videos) ? prev.videos : [];
  const extras = Array.isArray(prev?.extraVideos) ? prev.extraVideos : [];
  return {
    carried: videos.filter((v) => !recording.has(v.act)),
    replaced: videos.filter((v) => recording.has(v.act)).map((v) => v.act),
    carriedExtras: extras.filter((v) => !recording.has(v.act)),
    videoTrimSec: prev?.videoTrimSec,
  };
}

/**
 * One-off provisioning: capture a per-role storageState for every selected act.
 *
 * Needed because impersonating burns the admin state it came from (see verifyState), so each role
 * switch costs one fresh admin login. Doing it here, once and off camera, means the actual shoot
 * (and every later re-record) runs entirely from saved role states with no login at all.
 * Records nothing.
 */
async function provisionRoles(browser, acts, args) {
  const roles = [...new Set(acts.map((a) => a.role))].filter((r) => r !== 'admin');
  // A state FILE existing is not the same as its session still working: viet18 invalidates the
  // server-side session after a few hours and the file stays byte-identical on disk. Checking only
  // existsSync (the original bug) silently skipped every expired role, so provisioning appeared to
  // succeed while leaving act 1 and act 2 unshootable. Verify each existing state for real.
  const todo = [];
  for (const r of roles) {
    if (args.forceLoginAs) { todo.push(r); continue; }
    const statePath = authPathFor(r);
    if (!fs.existsSync(statePath)) { todo.push(r); continue; }
    if (await verifyState(browser, statePath)) {
      console.log(`[provision] ${r}: saved state still works — skipping`);
    } else {
      console.log(`[provision] ${r}: state file exists but the session is EXPIRED — re-capturing`);
      todo.push(r);
    }
  }
  const logins = [];

  banner([
    'ROLE PROVISIONING',
    '',
    todo.length ? `Roles to capture: ${todo.join(', ')}` : 'All role states already present.',
    '',
    'Impersonation re-binds the session cookie, so it burns the admin state it',
    'was launched from. That means ONE fresh admin login per role, plus a final',
    `login to leave a working ADMIN state behind: ${todo.length + 1} login(s) total.`,
    'Nothing is recorded.',
    '',
    'Afterwards every act replays from .auth/viet18-<role>.json with no login.',
  ]);

  for (const roleKey of todo) {
    console.log(`\n[provision] === ${roleKey} (${ACCOUNTS[roleKey]?.role || '?'}) ===`);
    // The stored admin state is very likely burned by the previous iteration; ensureAdminState
    // detects that and asks for a fresh login.
    if (fs.existsSync(args.auth) && !(await verifyState(browser, args.auth, { requireAdmin: true }))) {
      fs.rmSync(args.auth, { force: true });
      console.log('[provision] previous admin state was no longer admin — removed it');
    }
    try {
      await ensureAdminState(browser, args.auth);
    } catch (err) {
      // Nobody was at the keyboard. Don't dump a stack trace over a human-scheduling problem:
      // say what is still missing and how to pick up where this left off.
      const missing = todo.filter((r) => !fs.existsSync(authPathFor(r)));
      banner([
        'PROVISIONING PAUSED — no login within the timeout',
        '',
        `Captured so far: ${todo.filter((r) => fs.existsSync(authPathFor(r))).join(', ') || 'none'}`,
        `Still missing:   ${missing.join(', ')} + a final admin state`,
        '',
        'Nothing was lost. Re-run the SAME command when you can sit through',
        `${missing.length + 1} logins back to back; it skips whatever is already captured.`,
        '',
        'Longer window: --login-timeout <minutes>',
      ]);
      return;
    }
    logins.push(`admin login -> impersonate ${roleKey}`);

    const context = await createContext(browser, { storageStatePath: args.auth });
    const page = await context.newPage();
    const h = makeHelpers(page, { actLabel: `provision:${roleKey}` });
    try {
      await page.goto(URLS.canary, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await h.waitForAppIdle();
      await h.loginAs(roleKey, { adminStatePath: args.auth });
      await h.saveRoleState(roleKey);
    } catch (err) {
      console.error(`[provision] ${roleKey} FAILED: ${err.message}`);
    } finally {
      await context.close().catch(() => {});
    }
  }

  // FINAL STEP — leave a working ADMIN state behind.
  // Every impersonation above burned the admin session it launched from, so without this the run
  // would end with viet18-admin.json pointing at whichever role was captured last, and act 0
  // (admin) plus the act-0-hosted s1_4 form beat would fail at the worst possible moment: mid-shoot.
  console.log('\n[provision] === admin (final) ===');
  if (fs.existsSync(args.auth)) {
    fs.rmSync(args.auth, { force: true });
    console.log('[provision] removed the burned admin state so a fresh login is forced');
  }
  await ensureAdminState(browser, args.auth);
  logins.push('admin login -> saved as the shoot admin state');
  const adminOk = await verifyState(browser, args.auth, { requireAdmin: true });
  console.log(`[provision] final admin state verified as admin: ${adminOk ? 'YES' : 'NO'}`);

  const rows = [['admin', args.auth], ...roles.map((r) => [r, authPathFor(r)])];
  console.log('\n[provision] SUMMARY');
  for (const [name, file] of rows) {
    const ok = fs.existsSync(file) && (name !== 'admin' || adminOk);
    console.log(`  ${ok ? 'OK  ' : 'MISS'} ${String(name).padEnd(11)} ${file}`);
  }
  console.log(`\n  logins needed: ${logins.length}`);
  for (const l of logins) console.log(`    - ${l}`);
  console.log('  the shoot itself needs NONE: record.mjs seeds every act from these files.');
  if (!adminOk) {
    console.log('\n  ⚠️ the admin state is NOT valid — act 0 (and the s1_4 form beat it hosts) will');
    console.log('     fail. Re-run --provision before shooting.');
  }
}

async function main() {
  const args = parseArgs();
  const durations = loadDurations(args.durations);
  const selected = ACT_PLAN.filter((a) => !args.acts || args.acts.includes(a.id));
  if (!selected.length) throw new Error(`--acts matched nothing (have ${ACT_PLAN.map((a) => a.id).join(',')})`);
  // Refuse a partial provisioning run: --acts is how you state which roles you mean, and silently
  // provisioning only some of them is how a shoot discovers a missing state at 9am. Checked before
  // anything is launched so it fails instantly.
  if (args.provision && !args.acts) {
    throw new Error('--provision requires --acts (e.g. --provision --acts 0,1,2,3,4,5,6,7) '
      + 'so the set of roles to capture is explicit');
  }

  fs.mkdirSync(args.outDir, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await launchBrowser({ slow: args.slow });

  if (args.provision) {
    try {
      await provisionRoles(browser, selected, args);
    } finally {
      await browser.close().catch(() => {});
    }
    return;
  }

  // Shape consumed by assemble.mjs: { videoTrimSec, videos: [{ act, videoPath, scenes }] }.
  // `trimSec` per video and `extraVideos` are additive; assemble.mjs already honours `trimSec`.
  //
  // MERGE, not overwrite. A run with --acts must preserve the acts it did NOT record: the first
  // shoot's acts 3 and 7 were clean, and rebuilding markers from scratch would have silently
  // dropped them, forcing a full eight-act re-record to get an assemblable file. Entries are keyed
  // by `act` — the ones recorded now replace their previous entries, the rest are carried over.
  // --fresh-markers opts out (full re-record, or a deliberately clean slate).
  const markers = { videoTrimSec: args.trim, recordedAt: new Date().toISOString(), videos: [], extraVideos: [] };
  let carried = [];
  if (!args.freshMarkers && fs.existsSync(args.markers)) {
    try {
      const prev = JSON.parse(fs.readFileSync(args.markers, 'utf8'));
      const plan = planMarkerMerge({ prev, recordingActIds: selected.map((a) => a.id) });
      carried = plan.carried;
      markers.extraVideos.push(...plan.carriedExtras);
      if (carried.length || plan.replaced.length) {
        console.log(`[markers] merging into ${args.markers}: carrying over act(s) `
          + `${carried.map((v) => v.act).join(', ') || '(none)'}; replacing `
          + `${plan.replaced.join(', ') || '(none)'}`);
      }
      if (plan.videoTrimSec != null && !process.argv.includes('--trim')) {
        markers.videoTrimSec = plan.videoTrimSec;
      }
    } catch (err) {
      console.warn(`[markers] existing ${args.markers} is not readable JSON (${err.message}) — starting fresh`);
      carried = [];
    }
  }
  const writeMarkers = () => {
    const byAct = (a, b) => (Number(a.act) || 0) - (Number(b.act) || 0);
    const out = {
      ...markers,
      videos: [...carried, ...markers.videos].sort(byAct),
      extraVideos: [...markers.extraVideos].sort(byAct),
    };
    fs.writeFileSync(args.markers, `${JSON.stringify(out, null, 2)}\n`);
  };

  // Preflight: act 0 hosts the s1_4 form beat, which creates the candidate every later act works
  // on. Staging really does send mail (audit §10.4), so the address is never hardcoded and its
  // absence must be loud rather than discovered later. Use a Mailinator PUBLIC inbox so the
  // recording browser can actually read the mail (a temp-mail.org address is bound to the cookie
  // of the browser that created it and would be unreadable here).
  if (selected.some((a) => a.id === 0) && !args.candidate.email) {
    banner([
      'NO --candidate-email GIVEN',
      '',
      `Act 0 will demonstrate the Add form for "${args.candidate.name}" but will NOT submit it,`,
      'so no candidate record will exist and acts 1-7 will have nobody to work on.',
      '',
      'Re-run with the shoot address (a Mailinator PUBLIC inbox, readable by URL):',
      '  --candidate-email "+ADDR+"',
      "  --mail-url '"+INBOX+"'",
      '',
      'Never use a real person\'s address: this staging environment sends real email.',
    ]);
  }

  const needsAdmin = selected.some((a) => a.role === 'admin'
    || args.forceLoginAs
    || !fs.existsSync(authPathFor(a.role)));

  try {
    if (needsAdmin) {
      await ensureAdminState(browser, args.auth);
    } else {
      console.log('[auth] every selected act has a saved role state — no admin session needed.');
    }

    for (const act of selected) {
      const actLabel = `act${act.id}`;
      const roleStatePath = authPathFor(act.role);
      // Role state is the DEFAULT path when it exists. Impersonating instead would need a FRESH
      // admin login every time (see the impersonation-burn note on verifyState), so never do it
      // unless asked to.
      const seedFromRole = act.role !== 'admin'
        && fs.existsSync(roleStatePath)
        && !args.forceLoginAs;
      const seed = seedFromRole ? roleStatePath : args.auth;

      console.log(`\n===== ${actLabel} — ${ACCOUNTS[act.role]?.role || act.role} (seed: ${seedFromRole ? `role state ${act.role}` : 'admin state'}) =====`);

      const ctxStart = Date.now();
      const context = await createContext(browser, { storageStatePath: seed, recordDir: args.outDir });
      const page = await context.newPage();
      const video = page.video();
      const extraPages = [];
      const h = makeHelpers(page, { actLabel, durations, ctxStart });

      let actError = null;
      try {
        await page.goto(URLS.canary, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await sleep(2500);
        if (await looksLikeLogin(page)) throw new Error('seeded state is not authenticated (session expired?)');

        if (act.role !== 'admin' && !seedFromRole) {
          await h.loginAs(act.role, { adminStatePath: args.auth });
        }

        h.startAct(); // everything before this point is preamble -> trimSec
        await act.fn(page, h, { ...args, extraPages });

        // One file per role so any single act can be re-recorded later with --role-state.
        if (act.role !== 'admin') await h.saveRoleState(act.role);
      } catch (err) {
        actError = err.message;
        console.error(`[${actLabel}] ACT ABORTED: ${err.message}`);
      }

      const entry = {
        act: act.id,
        role: act.role,
        videoPath: null,
        trimSec: h.trimSec,
        scenes: h.scenes,
        sceneFailures: h.failures,
        actError,
      };
      const extraVideos = extraPages.map((p) => ({ label: p.label, video: p.page.video() }));
      await context.close().catch(() => {});
      // §6.3: take the exact driven page's path — never glob for "the largest webm".
      entry.videoPath = video ? await video.path().catch(() => null) : null;
      markers.videos.push(entry);
      // Side-tab takes (external Modex, the mail inbox) are NOT part of the main timeline —
      // assemble.mjs concatenates everything in `videos`, and these have no scenes. They are
      // listed separately so they can be hand-cut into the final edit if wanted.
      for (const ev of extraVideos) {
        const p = ev.video ? await ev.video.path().catch(() => null) : null;
        if (p) markers.extraVideos.push({ act: act.id, label: ev.label, role: act.role, videoPath: p });
      }
      writeMarkers(); // persist after every act so a crash cannot lose earlier takes
      console.log(`[${actLabel}] video: ${entry.videoPath} (trim ${entry.trimSec}s, ${entry.scenes.length} scenes)`);
    }
  } finally {
    writeMarkers();
    await browser.close().catch(() => {});
  }

  const failed = markers.videos.flatMap((v) => (v.sceneFailures || []).map((f) => `${v.act}/${f.id}: ${f.error}`));
  if (carried.length) {
    console.log(`markers merged: recorded act(s) ${markers.videos.map((v) => v.act).join(', ')}`
      + `; carried over ${carried.map((v) => v.act).join(', ')}`);
  }
  console.log(`\nmarkers written to ${args.markers}`);
  if (failed.length) {
    console.log(`\n${failed.length} scene(s) failed (narration still plays over them):`);
    for (const f of failed) console.log(`  - ${f}`);
    console.log('Fix these with inspect.mjs, then re-record just those acts with --acts.');
  } else {
    console.log('all scenes ok');
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
