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
 *   node record.mjs --candidate-email <temp-mail addr> --candidate-name "Marcus Reyes"
 *
 * Flags:
 *   --acts 0,1,2         subset of acts to record (default: all)
 *   --auth <path>        admin storageState path (default <videoRoot>/.auth/viet18-admin.json)
 *   --out <dir>          recordVideo dir           (default <recorder>/video)
 *   --markers <path>     markers.json path         (default <recorder>/markers.json)
 *   --durations <path>   narration durations       (default <videoRoot>/durations.json, then
 *                                                   <videoRoot>/audio/durations.json)
 *   --role-state         seed each act from .auth/viet18-<role>.json and SKIP the on-camera
 *                        login-as preamble (single-act re-records)
 *   --trim <sec>         videoTrimSec written into markers.json (default 0 — auth is off camera)
 *   --modex              enable the external-Modex beat in scene 1.6 (opens a 2nd tab => 2nd webm)
 *   --modex-url <url>    where that tab goes (no default; the human logs into Modex himself)
 *   --mail-url <url>     temp-mail inbox URL for the e-sign beat in scene 4.3 (2nd tab)
 *   --slow <ms>          Playwright slowMo (default 0)
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
  modexData: `${BASE}/modex_data`,
  referrals: `${BASE}/loan_officer_referrals`,
  // VERIFIED 2026-08-03: direct route works, no redirect (view BrokerMembersView).
  associates: `${BASE}/associates`,
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
 * Staging test accounts (already committed in docs/lo-recruiting-video-prompt.md).
 * `search` is what gets typed into the Associates search box; nothing here is a credential.
 */
export const ACCOUNTS = {
  admin: { label: 'Chau Chau', search: 'Chau Chau', role: 'Admin' },
  luis: { label: 'Luis Testcase 635211', search: 'luis7522333@viet18.com', role: 'Outside Recruiter' },
  nocha: { label: 'Nocha Hien', search: 'test4591872@test.com', role: 'Inside Recruiter' },
  licensing: { label: 'Chu Con Gi Nua Testcase', search: 'chuconginua@viet18.com', role: 'Licensing' },
  ken: { label: 'Ken Customer', search: 'test10990305@test.com', role: 'HR' },
  maria: { label: 'Maria Testcase', search: 'm123123aria@test.com', role: 'Onboarding Specialist' },
  accounting: { label: 'Admin Request', search: 'admingiftrequestor@viet18.com', role: 'Accounting' },
};

const VIEWPORT = { width: 1920, height: 1080 };
const SCENE_GAP_SEC = 0.6;          // playbook §5
const DEFAULT_NARRATION_SEC = 6;    // used when durations.json has no entry for a scene
const LOGIN_WAIT_MS = 5 * 60 * 1000;

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

/** storageState -> does it still open the app? (off camera: no recordVideo here) */
async function verifyState(browser, statePath) {
  const ctx = await createContext(browser, { storageStatePath: statePath });
  const page = await ctx.newPage();
  try {
    await page.goto(URLS.canary, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(2500); // GWT boots its shell after DOMContentLoaded
    return !(await looksLikeLogin(page));
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
    console.log(`[auth] found saved admin state — verifying against ${URLS.canary}`);
    if (await verifyState(browser, statePath)) {
      console.log('[auth] saved admin state is VALID — no login needed.');
      return 'reused';
    }
    console.warn('[auth] saved admin state is STALE (landed on the login screen).');
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
        const first = loc.first();
        if (await first.isVisible().catch(() => false)) return first;
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
    const useWindow = !target || target === 'window';
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
   */
  function dropdownItem(scope, name) {
    const target = scope || page;
    return target.locator(`a.dropdown-item[data-name="${name}"]`);
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
  async function clickTab(name) {
    const tab = page.getByRole('tab', { name });
    await click(() => tab.first(), { timeout: 15_000 });
    await waitForRows();
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
    row,
    statLink,
    dropdownWith,
    dropdownItem,
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
    // PROBE: GWT header account element — unknown markup.
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

  // 2) Find the account.
  // VERIFIED 2026-08-03: the grid filter input is placeholder "Name, Email, Address and Phone..".
  await h.typeInto([
    () => page.getByPlaceholder(/Name, ?Email/i),
    () => page.getByPlaceholder(/search/i),
  ], acct.search, { delay: 45 });
  await page.keyboard.press('Enter').catch(() => {});
  await h.waitForRows();

  // 3) Row Action menu on that account's row, then "Login".
  //
  // SAFETY (verified 2026-08-03): every row's Action dropdown is PRE-RENDERED in the DOM while
  // closed, so `getByText(/^Login$/)` matches one hidden item PER ROW (10 on a default page) and
  // an unscoped `.last()` would impersonate whichever account happens to sit last. Worse, that
  // same dropdown contains `Delete` two items below `Login`. Both the Action button and the Login
  // item are therefore scoped to the matched row, and the row itself is matched on the account's
  // unique search key.
  const target = h.row(acct.search);
  if ((await target.count()) === 0) {
    throw new Error(`no Associates row matched "${acct.search}" — refusing to guess which account to impersonate`);
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
// ACT 0 — Admin: the terrain (Chau Chau)
// Storyboard rows 0.1 – 0.6
// ---------------------------------------------------------------------------

export async function act0(page, h) {
  await h.scene('s0_1', async () => {
    // VERIFIED 2026-08-03: the sidebar entry is <a id="gwt-debug-lo-recruiting"> — a stable GWT
    // debug id, immune to text drift. Text match kept as a fallback.
    await h.goto(URLS.canary);
    await h.click([
      gwt('lo-recruiting'),
      () => page.getByRole('link', { name: /LO RECRUITING/i }),
    ], { timeout: 12_000 });
    await h.hold(1.5);
    // Read the 5 entries (§1 of the audit). PROBE: rendered as links in a fly-out.
    for (const name of [
      /My Loan Officer referrals/i,
      /Admin - Loan Officer referrals/i,
      /Interested Loan Officers/i,
      /Recruited Loan Officers/i,
      /Loan Officers Obtained from Modex/i,
    ]) {
      await h.optional(`menu ${name}`, () => h.moveTo(() => page.getByText(name).first(), { timeout: 2500 }));
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
    // UNRESOLVED 2026-08-03: the panel's 3 view-mode icons (bar chart / text / hide) carry no
    // accessible name, no title and no gwt-debug id, and they are NOT inside the
    // com.lenderrate view root, so I could not pin them down without guessing. Kept optional and
    // scoped to the icon strip so a miss costs nothing — the scene's real beat is the drill-down
    // above, and the narration is about stale numbers, not the toggles.
    await h.optional('stats view-mode toggles', async () => {
      const strip = page.locator('div[class*="card"]').filter({ hasText: /Total - / }).first();
      const icons = strip.locator('a:has(.material-icons), a[class*="material-icons"]');
      const n = Math.min(2, await icons.count());
      if (!n) throw new Error('view-mode icon strip not found');
      for (let i = 0; i < n; i += 1) {
        await h.click(() => icons.nth(i), { timeout: 3000 });
        await h.hold(1.2);
      }
    });
  });

  await h.scene('s0_4', async () => {
    await h.goto(URLS.config);
    const tabs = [
      /Webinar/i,
      /Landing Page/i,
      /1-1 Meeting using Calendly/i,
      /ILO Owner Assignment/i,
      /Facebook Ads/i,
    ];
    for (const t of tabs) {
      // PROBE: tabs render as GWT tab bar items, not role=tab, most likely plain text nodes.
      await h.optional(`config tab ${t}`, async () => {
        await h.click([
          () => page.getByRole('tab', { name: t }),
          () => page.getByText(t).first(),
        ], { timeout: 5000 });
        await h.hold(1.6);
      });
    }
    // Land on Calendly (it holds a personal access token) and just look at it — never read it out.
    await h.optional('stay on Calendly tab', async () => {
      await h.click(() => page.getByText(/1-1 Meeting using Calendly/i).first(), { timeout: 4000 });
    });
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
    await page.keyboard.press('Escape').catch(() => {});
    await h.hold(1);
    // The whole point: every row was Received 24/01/2024 and nothing newer.
    await h.optional('Received column', () => h.moveTo(() => page.getByText(/Received/i).first(), { timeout: 4000 }));
  });

  await h.scene('s0_6', async () => {
    // INTRODUCE ONLY. Clicking "Login" here would swap THIS context's session mid-act and
    // there is no way back to admin (audit §10.3) — act 1 does the real login-as in its own
    // fresh context, so this scene only opens the menu and points at the item.
    await h.optional('associates screen', () => h.goto(URLS.associates));
    await h.optional('search an account', () =>
      h.typeInto([
        () => page.getByPlaceholder(/Name, ?Email/i),
        () => page.getByPlaceholder(/search/i),
      ], ACCOUNTS.luis.search, { delay: 45 }));
    await page.keyboard.press('Enter').catch(() => {});
    await h.waitForRows();
    // VERIFIED 2026-08-03: per-row Action is <button>Action</button>; its menu holds
    // Permissions / Login / Audit log / … / Delete. Scope BOTH to the matched row: every row's
    // menu is pre-rendered, so an unscoped match would point at another account's Login — and
    // Delete sits two items below it.
    const target = h.row(ACCOUNTS.luis.search);
    await h.optional('open row Action menu', () =>
      h.click(() => target.getByRole('button', { name: /^\s*Action\s*$/i }), { timeout: 8000 }));
    await h.hold(1);
    await h.optional('hover Login (NO click — that would swap this act\'s session)', () =>
      h.moveTo(() => h.dropdownItem(target, 'Login').first(), { timeout: 5000 }));
    await h.hold(1.5);
    await page.keyboard.press('Escape').catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// ACT 1 — Outside Recruiter (Luis): from cold lead to invitation
// Storyboard rows 1.1 – 1.15  (longest, most important act)
// ---------------------------------------------------------------------------

export async function act1(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  await h.scene('s1_1', async () => {
    await h.goto(URLS.rloMine);
    // PROBE: tabs Mine / Company / Pending approvals are GWT tab-bar text nodes.
    await h.optional('Mine tab', () => h.click(() => page.getByText(/^\s*Mine\s*$/i).first(), { timeout: 5000 }));
    await h.smoothScroll('window', 700, { steps: 14 });
    await h.hold(1);
    await h.smoothScroll('window', -700, { steps: 10 });
  });

  await h.scene('s1_2', async () => {
    // Filters: Active + Social media + the "More" additional-filters modal (7 filters).
    await h.optional('Active filter', () => h.click(() => page.getByText(/^\s*Active\s*$/i).first(), { timeout: 5000 }));
    await h.hold(1);
    await h.optional('Social media filter', () =>
      h.click(() => page.getByText(/^\s*Social media\s*$/i).first(), { timeout: 5000 }));
    await h.hold(1);
    await h.click([
      () => page.getByRole('button', { name: /^\s*More\s*$/i }),
      () => page.getByText(/^\s*More\s*$/i).first(),
    ], { timeout: 8000 });
    await h.hold(1.5);
    for (const f of [/Channel/i, /Licensed states/i, /Preferred language/i, /Friendship/i, /Profile/i, /Experience/i, /Personal address state/i]) {
      await h.optional(`filter ${f}`, () => h.moveTo(() => page.getByText(f).first(), { timeout: 2500 }));
      await h.hold(0.4);
    }
    await page.keyboard.press('Escape').catch(() => {});
  });

  await h.scene('s1_3', async () => {
    // The daily bug: picking a search suggestion filters by ?labels= on top of a default chip
    // => "1-1 of 0 · No results" until the chip is removed (audit §C.4.1).
    await h.typeInto([
      () => page.getByPlaceholder(/search/i),
      () => page.getByRole('textbox').first(),
    ], (candidate.name || 'Marcus Reyes').split(' ')[0], { delay: 90 });
    await h.hold(2);
    await h.optional('pick a suggestion', async () => {
      // PROBE: suggestion list markup unknown; audit notes it can even render raw HTML.
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    });
    await h.hold(3);
    await h.optional('point at "No results"', () =>
      h.moveTo(() => page.getByText(/No results|1-1 of 0/i).first(), { timeout: 4000 }));
    await h.hold(1.5);
    await h.optional('remove the default chip', async () => {
      // PROBE: the chip is a filter pill with an x; audit calls it "Recruitable" on prod.
      await h.click([
        () => page.getByText(/Recruitable/i).first(),
        () => page.locator('[class*="chip"], [class*="tag"]').first(),
      ], { timeout: 4000 });
    });
    await h.hold(2);
  });

  await h.scene('s1_4', async () => {
    // Create the candidate by hand. Required fields are NOT marked and only ONE new error
    // surfaces per submit — so submit early on purpose, twice, to show the tax.
    await h.click([
      () => page.getByRole('button', { name: /^\s*Add\s*$/i }),
      () => page.getByText(/^\s*Add\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(2);

    const field = (labelRe) => [
      () => page.getByLabel(labelRe),
      () => page.locator('tr', { has: page.getByText(labelRe) }).locator('input,textarea,select').first(),
      () => page.locator('td', { has: page.getByText(labelRe) }).locator('input').first(),
    ];

    await h.optional('first name', () => h.typeInto(field(/First name/i), (candidate.name || 'Marcus Reyes').split(' ')[0]));
    await h.optional('last name', () => h.typeInto(field(/Last name/i), (candidate.name || 'Marcus Reyes').split(' ').slice(1).join(' ')));

    // Deliberate premature submit #1.
    await h.optional('premature submit 1', async () => {
      await h.click([() => page.getByRole('button', { name: /^\s*(Submit|Save)\s*$/i })], { timeout: 6000 });
      await h.hold(2.5);
    });

    await h.optional('email', () => h.typeInto(field(/Email/i), candidate.email || ''));
    await h.optional('phone', () => h.typeInto(field(/Phone|Mobile/i), candidate.phone || '(444) 433-3444'));

    // Deliberate premature submit #2 — a NEW single error appears.
    await h.optional('premature submit 2', async () => {
      await h.click([() => page.getByRole('button', { name: /^\s*(Submit|Save)\s*$/i })], { timeout: 6000 });
      await h.hold(2.5);
    });

    await h.optional('NMLS', () => h.typeInto(field(/NMLS/i), candidate.nmls || '107621'));
    await h.optional('channel', async () => {
      // PROBE: native <select> vs GWT custom dropdown unknown.
      await h.click(field(/Loan officer channel|Channel/i), { timeout: 4000 });
      await h.click(() => page.getByText(/^\s*Retail LO\s*$/i).first(), { timeout: 4000 });
    });
    await h.optional('experience', async () => {
      await h.click(field(/Experience/i), { timeout: 4000 });
      await h.click(() => page.getByText(/^\s*Experienced\s*$/i).first(), { timeout: 4000 });
    });
    await h.optional('priority', async () => {
      await h.click(field(/Priority/i), { timeout: 4000 });
      await h.click(() => page.getByText(/^\s*High\s*$/i).first(), { timeout: 4000 });
    });
    await h.optional('final submit', async () => {
      await h.click([() => page.getByRole('button', { name: /^\s*(Submit|Save)\s*$/i })], { timeout: 6000 });
      await h.hold(4); // new records index slowly (Datastore eventual consistency)
    });
  });

  await h.scene('s1_5', async () => {
    // THE evidence button: "Copy Name And NMLS #" exists only so the recruiter can leave the app.
    await h.goto(URLS.rloMine);
    await h.click([
      () => rowOfCandidate().getByText(/Social media|Has social media|Checked and has social links/i).first(),
      () => page.getByText(/^\s*Social media\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.moveTo([
      () => page.getByRole('button', { name: /Copy Name And NMLS/i }),
      () => page.getByText(/Copy Name And NMLS/i).first(),
    ], { timeout: 6000 });
    await h.hold(1);
    await h.click([
      () => page.getByRole('button', { name: /Copy Name And NMLS/i }),
      () => page.getByText(/Copy Name And NMLS/i).first(),
    ], { timeout: 6000 });
    await h.hold(2);
    await page.keyboard.press('Escape').catch(() => {});
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
    await h.click([
      () => rowOfCandidate().getByText(/Not friend|Friend requested|Friend/i).first(),
      () => page.getByText(/^\s*Not friend\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1.2);
    await h.optional('set Friend requested', () =>
      h.click(() => page.getByText(/^\s*Friend requested\s*$/i).first(), { timeout: 5000 }));
    await h.hold(1.5);
  });

  await h.scene('s1_8', async () => {
    // Call modal = a sales script + a Zoom deep-link. It does not place the call, and the
    // Call counter is fed by the Zoom log, not by this click.
    await h.click([
      () => rowOfCandidate().getByText(/^\s*Call\s*$/i).first(),
      () => page.getByText(/^\s*Call\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('read the script', () => h.smoothScroll(() => page.getByText(/250\s*bps|commission/i).first(), 350, { steps: 10 }));
    await h.hold(1);
    // INTRODUCE ONLY: never click "Call via my Zoom Phone" (it deep-links / can dial).
    await h.optional('point at Call via my Zoom Phone', () =>
      h.moveTo(() => page.getByText(/Call via my Zoom Phone/i).first(), { timeout: 5000 }));
    await h.hold(1.5);
    await page.keyboard.press('Escape').catch(() => {});
  });

  await h.scene('s1_9', async () => {
    // Zoom SMS on an unmapped user => "Failed to send Zoom SMS: User not found".
    // Safe on staging with a dead phone number, and the error IS the beat.
    await h.click([
      () => rowOfCandidate().getByText(/Zoom SMS|^\s*Text\s*$/i).first(),
      () => page.getByText(/Zoom SMS/i).first(),
    ], { timeout: 10_000 });
    await h.hold(2);
    await h.optional('send to surface the error', async () => {
      await h.click([() => page.getByRole('button', { name: /^\s*Send\s*$/i })], { timeout: 5000 });
      await h.hold(3);
      await h.moveTo(() => page.getByText(/User not found|Failed to send/i).first(), { timeout: 6000 });
    });
    await h.hold(1.5);
    await page.keyboard.press('Escape').catch(() => {});
  });

  await h.scene('s1_10', async () => {
    // Conversation history = the real operating system of this module: a note + an email.
    await h.click([
      () => rowOfCandidate().locator('[class*="material-icons"]').filter({ hasText: /comment|chat/i }).first(),
      () => rowOfCandidate().getByText(/^\s*Note\s*$/i).first(),
      () => page.getByText(/Conversation history/i).first(),
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
      // PROBE: department checkboxes (HR / Licensing / Compliance / Onboarding).
      await h.optional('tick Licensing', () => h.click(() => page.getByText(/^\s*Licensing\s*$/i).first(), { timeout: 4000 }));
      await h.optional('confirm send', () => h.click(() => page.getByRole('button', { name: /^\s*(Send|Submit|Save)\s*$/i }).first(), { timeout: 4000 }));
      await h.hold(2);
    });
  });

  await h.scene('s1_11', async () => {
    // CHANGE STATUS modal. Do NOT touch the page filters while it is open (audit §10.9:
    // the modal reports a bogus "technical difficulty" toast although the save went through).
    await h.click([
      () => rowOfCandidate().getByText(/Not touched|Initiate contact|Message sent|Dialogue/i).first(),
      () => page.getByText(/^\s*Not touched\s*$/i).first(),
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
    await h.optional('submit', () => h.click(() => page.getByRole('button', { name: /^\s*Submit\s*$/i }).first(), { timeout: 5000 }));
    await h.hold(2);
  });

  await h.scene('s1_12', async () => {
    // Follow-up flag = snooze + wake notification, and it HIDES the record from the pipeline.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([
      () => page.getByText(/Add or remove a follow-up flag/i).first(),
    ], { timeout: 6000 });
    await h.hold(2);
    await h.optional('pick a wake-up date', async () => {
      // PROBE: date input markup unknown; must be a future date or it fails validation.
      await h.click([
        () => page.getByRole('textbox').first(),
        () => page.locator('input').first(),
      ], { timeout: 4000 });
      await h.hold(1.5);
    });
    await h.optional('flag history', () => h.moveTo(() => page.getByText(/Flag history/i).first(), { timeout: 4000 }));
    await h.hold(1.5);
    await page.keyboard.press('Escape').catch(() => {});
  });

  await h.scene('s1_13', async () => {
    // Genuine strength: field-level audit log (old -> new, user, timestamp). Keep on rebuild.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([() => page.getByText(/^\s*Audit log\s*$/i).first()], { timeout: 6000 });
    await h.hold(2.5);
    await h.optional('scroll the log', () => h.smoothScroll(() => page.getByText(/Audit log/i).first(), 400, { steps: 12 }));
    await h.hold(1);
    await page.keyboard.press('Escape').catch(() => {});
  });

  await h.scene('s1_14', async () => {
    // The handoff: Invite -> record moves to the Interested LO pipeline. Referral source is
    // mandatory (it drives referral payout later); the $100 fee can be waived.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([
      () => page.getByText(/Invite Loan officer to join/i).first(),
    ], { timeout: 6000 });
    await h.hold(2);
    await h.optional('referral source', async () => {
      await h.click([
        () => page.getByRole('combobox').first(),
        () => page.locator('select').first(),
      ], { timeout: 4000 });
      await h.hold(1);
      await h.click(() => page.getByText(/Direct Invite|Word of Mouth/i).first(), { timeout: 4000 });
    });
    await h.optional('waive $100 toggle', () => h.moveTo(() => page.getByText(/Waive/i).first(), { timeout: 4000 }));
    await h.hold(1);
    await h.optional('send invitation email toggle', () => h.moveTo(() => page.getByText(/invitation email/i).first(), { timeout: 4000 }));
    await h.hold(1);
    await h.optional('submit the invite', async () => {
      await h.click(() => page.getByRole('button', { name: /^\s*(Submit|Invite)\s*$/i }).first(), { timeout: 5000 });
      await h.hold(4);
    });
  });

  await h.scene('s1_15', async () => {
    // Same human, second warehouse, different vocabulary (8 ILO statuses vs 10 RLO statuses).
    await h.goto(URLS.iloMine);
    await h.optional('find the candidate', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    await h.hold(1);
    await h.optional('converted badge', () =>
      h.moveTo(() => page.getByText(/Converted from recruited LO/i).first(), { timeout: 5000 }));
    await h.hold(1);
    await h.optional('invited-to-join status', () =>
      h.moveTo(() => page.getByText(/Invited to join/i).first(), { timeout: 5000 }));
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
    // Nocha opens the very person Luis just called and cannot see that it happened.
    await h.optional('open the candidate row', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    await h.hold(1.5);
    await h.optional('point at the status cell', () =>
      h.moveTo(() => rowOfCandidate().getByText(/Invited to join|New/i).first(), { timeout: 5000 }));
    await h.hold(1.5);
    await h.optional('only the note carries the call', async () => {
      await h.click([
        () => rowOfCandidate().locator('[class*="material-icons"]').filter({ hasText: /comment|chat/i }).first(),
        () => rowOfCandidate().getByText(/^\s*Note\s*$/i).first(),
      ], { timeout: 6000 });
      await h.hold(3);
      await page.keyboard.press('Escape').catch(() => {});
    });
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
    await page.keyboard.press('Escape').catch(() => {});
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
    await h.goto(URLS.rloPending);
    await h.optional('Check Modex link', () =>
      h.moveTo(() => page.getByText(/Check Modex/i).first(), { timeout: 8000 }));
    await h.hold(2);
    // MUTATES STAGING: Approve moves the record into the Company tab. Storyboard row 2.5
    // asks for it explicitly; staging CRUD is allowed. Nothing is deleted.
    await h.optional('Approve one self-apply record', async () => {
      await h.click([
        () => page.getByRole('button', { name: /^\s*Action/i }).first(),
        () => page.getByText(/^\s*Action\s*$/i).first(),
      ], { timeout: 6000 });
      await h.hold(1);
      await h.click(() => page.getByText(/^\s*Approve\s*$/i).first(), { timeout: 5000 });
      await h.hold(1.5);
      await h.click(() => page.getByRole('button', { name: /^\s*(Yes|OK|Confirm|Approve)\s*$/i }).first(), { timeout: 5000 });
      console.log('[act2]   Approve submitted (staging mutation, by design)');
      await h.hold(3);
    });
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
      // PROBE: nav container unknown; scroll the sidebar so the viewer can read every entry.
      const nav = [() => page.getByRole('navigation').first(), () => page.locator('nav').first()];
      const scroller = await h.scrollableNear(nav);
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
    // The only auto-transition in the system: Startup fee = Paid => status jumps to Onboarding.
    await h.optional('open the candidate', () => h.moveTo(() => rowOfCandidate(), { timeout: 8000 }));
    await h.optional('set the startup fee', async () => {
      await h.click([
        () => rowOfCandidate().getByText(/Not paid|Unpaid|Startup fee/i).first(),
        () => page.getByText(/Startup fee/i).first(),
      ], { timeout: 8000 });
      await h.hold(1.5);
      await h.click(() => page.getByText(/^\s*Paid\s*$/i).first(), { timeout: 5000 });
      await h.hold(1);
      await h.optional('submit', () => h.click(() => page.getByRole('button', { name: /^\s*(Submit|Save)\s*$/i }).first(), { timeout: 4000 }));
    });
    await h.hold(3);
    // Hold on the status cell so the automatic jump is visible on camera.
    await h.optional('watch the status flip', () =>
      h.moveTo(() => rowOfCandidate().getByText(/Onboarding/i).first(), { timeout: 8000 }));
    await h.hold(2);
  });

  await h.scene('s4_3', async () => {
    // Re-generate e-sign docs + send email. The system tracks signed / not signed, never
    // sent / opened / viewed.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([() => page.getByText(/Re-generate e-sign documents/i).first()], { timeout: 6000 });
    await h.hold(2);
    await h.optional('confirm', () => h.click(() => page.getByRole('button', { name: /^\s*(Yes|OK|Submit|Send)\s*$/i }).first(), { timeout: 5000 }));
    await h.hold(3);
    // The actual signing happens in the temp-mail inbox: a human beat, opt-in via --mail-url.
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
      console.log('[act4]   s4_3: temp-mail signing beat SKIPPED (pass --mail-url <inbox>)');
    }
  });

  await h.scene('s4_4', async () => {
    // The finding of the act: the gate only checks Paid + Signed. NMLS / HR / 1-1 can all be
    // outstanding and the record still counts as "100% onboarded".
    await h.click([
      () => rowOfCandidate().getByText(/Onboarding|Invited to join|New/i).first(),
      () => page.getByText(/^\s*Onboarding\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1.5);
    await h.optional('show the unfinished prerequisites', async () => {
      for (const c of [/NMLS status/i, /HR status/i, /1-1 Onboarding meeting/i]) {
        await h.optional(`column ${c}`, () => h.moveTo(() => page.getByText(c).first(), { timeout: 3000 }));
        await h.hold(0.7);
      }
    });
    await h.optional('set 100% onboarded', async () => {
      await h.click(() => page.getByText(/100% onboarded/i).first(), { timeout: 5000 });
      await h.hold(1);
      await h.click(() => page.getByRole('button', { name: /^\s*Submit\s*$/i }).first(), { timeout: 4000 });
      await h.hold(3);
    });
  });

  await h.scene('s4_5', async () => {
    // Template settings: real asset (per-status Email / SMS / Call script), on a settings page
    // every role can open.
    await h.goto(URLS.iloCompany);
    await h.click([
      () => page.getByRole('button', { name: /^\s*Action\s*$/i }).first(),
      () => page.getByText(/^\s*Action\s*$/i).first(),
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
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([() => page.getByText(/Invite 1-1 meeting/i).first()], { timeout: 6000 });
    await h.hold(2.5);
    await h.optional('send the invite', () => h.click(() => page.getByRole('button', { name: /^\s*(Send|Submit)\s*$/i }).first(), { timeout: 5000 }));
    await h.hold(2);
  });

  await h.scene('s4_7', async () => {
    // Create new account: the boundary between recruiting and the rest of the company.
    // Open the form and walk it — do NOT submit (that would create a real associate).
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([() => page.getByText(/Create new account/i).first()], { timeout: 6000 });
    await h.hold(2.5);
    for (const f of [/W-2|W-9|Outside Salesperson/i, /classification/i, /probation/i, /branch/i, /team/i, /manager/i, /company email/i]) {
      await h.optional(`field ${f}`, () => h.moveTo(() => page.getByText(f).first(), { timeout: 3000 }));
      await h.hold(0.7);
    }
    await h.hold(1);
    await page.keyboard.press('Escape').catch(() => {}); // introduce only — never submit
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
    await h.optional('tab strip (Mine only)', () => h.moveTo(() => page.getByText(/^\s*Mine\s*$/i).first(), { timeout: 8000 }));
    console.log(`[act5]   Company tab visible: ${(await page.getByText(/^\s*Company\s*$/i).count()) > 0}`);
    await h.hold(2);
  });

  await h.scene('s5_2', async () => {
    // Why a record already has an owner: an auto-assign toggle buried in settings.
    await h.goto(URLS.config);
    await h.click([
      () => page.getByRole('tab', { name: /ILO Owner Assignment/i }),
      () => page.getByText(/ILO Owner Assignment/i).first(),
    ], { timeout: 8000 });
    await h.hold(2.5);
    for (const t of [/Recruiter/i, /Onboarding specialist/i, /Support/i]) {
      await h.optional(`toggle ${t}`, () => h.moveTo(() => page.getByText(t).first(), { timeout: 3000 }));
      await h.hold(0.8);
    }
  });

  await h.scene('s5_3', async () => {
    // The whole onboarding checklist is a row of columns: no owner, no due date, no order.
    await h.goto(URLS.iloMine);
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
      await h.optional('send', () => h.click(() => page.getByRole('button', { name: /^\s*(Send|Submit|Save)\s*$/i }).first(), { timeout: 4000 }));
      await h.hold(2);
    });
  });

  await h.scene('s5_5', async () => {
    // Webinar registration + attendance by CSV import: "attended" always lags reality.
    await h.click([
      () => rowOfCandidate().getByRole('button', { name: /^\s*Action/i }),
      () => rowOfCandidate().getByText(/^\s*Action\s*$/i).first(),
    ], { timeout: 10_000 });
    await h.hold(1);
    await h.click([() => page.getByText(/Register for a webinar/i).first()], { timeout: 6000 });
    await h.hold(2.5);
    await page.keyboard.press('Escape').catch(() => {});
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
      await page.keyboard.press('Escape').catch(() => {});
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

  await h.scene('s6_2', async () => {
    // Referral policy: five exclusions printed in a modal that the system does not enforce.
    await h.goto(URLS.referrals);
    await h.optional('open the policy modal', () =>
      h.click([
        () => page.getByRole('link', { name: /polic/i }),
        () => page.getByText(/polic/i).first(),
      ], { timeout: 8000 }));
    await h.hold(2.5);
    await h.optional('read the exclusions', () => h.smoothScroll(() => page.getByText(/120 days|eligible/i).first(), 420, { steps: 12 }));
    await h.hold(1.5);
    await page.keyboard.press('Escape').catch(() => {});
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
    await page.keyboard.press('Escape').catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// ACT 7 — Wrap-up (admin session again, fresh context from the admin state)
// Storyboard rows 7.1 – 7.4
// ---------------------------------------------------------------------------

export async function act7(page, h, cfg = {}) {
  const candidate = cfg.candidate || {};
  const rowOfCandidate = () =>
    page.locator('tr', { hasText: new RegExp(candidate.name || 'Marcus Reyes', 'i') }).first();

  await h.scene('s7_1', async () => {
    await h.goto(URLS.iloCompany);
    await h.optional('search the candidate', async () => {
      await h.typeInto([
        () => page.getByPlaceholder(/search/i),
        () => page.getByRole('textbox').first(),
      ], candidate.name || 'Marcus Reyes', { delay: 60 });
      await page.keyboard.press('Enter').catch(() => {});
      await h.hold(3);
    });
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
    trim: 0,
    modex: false,
    modexUrl: null,
    mailUrl: null,
    slow: 0,
    candidate: {
      name: 'Marcus Reyes',
      email: '',            // temp-mail address, supplied at shoot time
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
      case '--role': out.role = next(); break;
      case '--login-as': out.loginAs = true; break;
      case '--open-modals': out.openModals = true; break;
      case '--trim': out.trim = Number(next()); break;
      case '--modex': out.modex = true; break;
      case '--modex-url': out.modexUrl = next(); out.modex = true; break;
      case '--mail-url': out.mailUrl = next(); break;
      case '--slow': out.slow = Number(next()); break;
      case '--candidate-name': out.candidate.name = next(); break;
      case '--candidate-email': out.candidate.email = next(); break;
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

async function main() {
  const args = parseArgs();
  const durations = loadDurations(args.durations);
  const selected = ACT_PLAN.filter((a) => !args.acts || args.acts.includes(a.id));
  if (!selected.length) throw new Error(`--acts matched nothing (have ${ACT_PLAN.map((a) => a.id).join(',')})`);

  fs.mkdirSync(args.outDir, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await launchBrowser({ slow: args.slow });
  // Shape consumed by assemble.mjs: { videoTrimSec, videos: [{ act, videoPath, scenes }] }.
  // `trimSec` per video and `extraVideos` are additive; assemble.mjs already honours `trimSec`.
  const markers = { videoTrimSec: args.trim, recordedAt: new Date().toISOString(), videos: [], extraVideos: [] };
  const writeMarkers = () => {
    fs.writeFileSync(args.markers, `${JSON.stringify(markers, null, 2)}\n`);
  };

  try {
    await ensureAdminState(browser, args.auth);

    for (const act of selected) {
      const actLabel = `act${act.id}`;
      const roleStatePath = authPathFor(act.role);
      const seedFromRole = args.roleState && act.role !== 'admin' && fs.existsSync(roleStatePath);
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
      // Side-tab takes (external Modex, temp-mail) are NOT part of the main timeline —
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
