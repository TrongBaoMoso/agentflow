#!/usr/bin/env node
/*
 * P4 S9 staging E2E: the full Recruit-only journey for a Loan Officer with NO MOSO record.
 *
 *   public REFER form (canary, Recruit-only) -> lead -> claim/owner -> figures -> offer approve (hand-off, portal link)
 *   -> 1-1 scheduled + DONE (welcome mail) -> portal profile save -> PayPal sandbox fee (headed Chrome, PayPal's
 *   documented sandbox test Visa) -> paid mails -> sign step (dark 404 until recruit.features.esign-de is on)
 *   -> Joined (S6) -> automatic Send to HR -> HR hired -> archive
 *
 * STAGING ONLY. Every address is bao.trinh+<tag>@loanfactory.com. Nothing secret is printed or written: the admin
 * bearer is read from a file, the portal link lives in a 0600 file under the run dir and is deleted at the end.
 *
 * Usage (from this folder, Playwright resolved through NODE_PATH, Chrome jobs behind ram-gate):
 *   tok=$(~/.claude/bin/ram-gate acquire chrome s9-e2e --wait 900) && \
 *   NODE_PATH=/Users/apple/.npm/_npx/e41f203b7505f1fb/node_modules node s9-e2e.js [--lower-captcha] [--keep] \
 *     [--resume run-<tag>/state.json] [--sign-wait-min 20]; ~/.claude/bin/ram-gate release $tok
 *
 *   (default)         the form relies on the lf STAGING captcha bypass (lf-homepage #2736): the lead e-mail
 *                     bao.trinh+p3only-s9<tag>@ must match RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS on lf-homepage-master
 *                     (set it to bao.trinh+p3only-s9*@loanfactory.com) as well as the Recruit-only canary.
 *   --lower-captcha   fallback when the bypass is not deployed: set RECRUIT_INTAKE_MIN_SCORE=0 for the form step and
 *                     restore 0.5 right after (automated Chrome scores 0 on reCAPTCHA v3). Times are logged.
 *   --keep            do not archive at the end (so --resume can continue once esign-de is on)
 *   --resume <file>   skip to the sign step for a lead kept by an earlier run
 *   --sign-wait-min   how long to wait for the agreement to be signed in the opened Inkless page (default 20)
 *   --add-lead        create the lead with the admin "Add lead" (POST /candidates) instead of the public form. Use when
 *                     reCAPTCHA cannot be lowered (no gcloud session); the form steps are then SKIP
 *   --no-db           no staging DB reads (no GKE session): DB-only checks become SKIP, API checks still run
 *
 * Env: TOKF (admin bearer file, default ~/.cache/claude-recruit/preview/stg_3370.token),
 *      PGQ (staging read-only DB helper, default ~/.cache/claude-recruit/pgq_stg.sh).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const API = 'https://gateway.viet18.com/recruit-svc/api/v1';
const SITE = 'https://www.viet18.com';
const REFER_URL = `${SITE}/refer/refer-a-loan-officer`;
// The page calls its proxy on the app's Cloud Run host (NEXT_PUBLIC_ASSET_URL); www.viet18.com answers 405 for a POST there.
const PROXY = `${process.env.LF_ASSET_URL || 'https://lf-homepage-master-46edamqn5a-uc.a.run.app'}/webplus-api/onboarding`;
const LF_SERVICE = { name: 'lf-homepage-master', project: 'lenderrate-master', region: 'us-central1' };
const CANARY_PREFIX = 'bao.trinh+p3only'; // lf staging RECRUIT_INTAKE_RECRUIT_ONLY = bao.trinh+p3only*@loanfactory.com
const BUSINESS_TZ = 'America/Los_Angeles';
const HR_WAIT_MIN = 12;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const expand = (p) => p.replace(/^~/, os.homedir());
const TOKF = expand(process.env.TOKF || '~/.cache/claude-recruit/preview/stg_3370.token');
const PGQ = expand(process.env.PGQ || '~/.cache/claude-recruit/pgq_stg.sh');

// ---------- state ----------
const resumeFile = opt('--resume');
const letters = () => Array.from({ length: 5 }, () => 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]).join('');
const state = resumeFile ? JSON.parse(fs.readFileSync(resumeFile, 'utf8')) : (() => {
  const tag = letters();
  return {
    tag,
    email: `${CANARY_PREFIX}-s9${tag}@loanfactory.com`,
    first: 'Sierra',
    last: `Nine${tag[0].toUpperCase()}${tag.slice(1)}`, // letters only: HR refuses digits in a name
    phone: `469${String(Math.floor(2000000 + Math.random() * 7999999))}`, // random: a phone already in Recruit (even archived) is a 409
    nmls: String(9000000 + Math.floor(Math.random() * 999999)),
    startedAt: new Date().toISOString(),
  };
})();
const RUN = path.resolve(resumeFile ? path.dirname(resumeFile) : `run-${state.tag}`);
fs.mkdirSync(RUN, { recursive: true });
const LINKF = path.join(RUN, '.portal-link');
const saveState = () => fs.writeFileSync(path.join(RUN, 'state.json'), JSON.stringify(state, null, 2));
saveState();

const NO_DB = flag('--no-db');
const results = [];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const record = (step, status, detail) => { results.push({ step, status, detail }); log(status.padEnd(7), step, '-', detail); };
async function step(name, fn) {
  try {
    const r = await fn();
    if (r && r.status) record(name, r.status, r.detail || '');
    else record(name, 'PASS', r || '');
    return true;
  } catch (e) {
    record(name, 'FAIL', String(e.message || e).slice(0, 300));
    return false;
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- helpers ----------
const TOKEN = () => fs.readFileSync(TOKF, 'utf8').trim();
async function api(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: { authorization: `Bearer ${TOKEN()}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text.slice(0, 200); }
  return { status: res.status, body: json && json.payload !== undefined ? json.payload : json };
}
async function proxy(action, body) {
  const res = await fetch(`${PROXY}/${action}`, {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: res.status, body: json };
}
let podSeq = 0;
/** One read-only row from the staging DB, as JSON. The SQL must SELECT a single json_build_object(...) column. */
function db(sql) {
  if (NO_DB) return null;
  const pod = `s9q${state.tag}${++podSeq}${Date.now() % 10000}`;
  const out = execFileSync('bash', [PGQ, pod, sql], { encoding: 'utf8', timeout: 900000 });
  const line = out.split('\n').map((l) => l.trim()).find((l) => l.startsWith('{') || l.startsWith('['));
  return line ? JSON.parse(line) : null;
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const link = () => fs.readFileSync(LINKF, 'utf8').trim();
const portalToken = () => new URL(link()).searchParams.get('invite');
const todayIn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
function userIdFromToken() {
  const part = TOKEN().split('.')[1];
  const claims = JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  return claims.sub || claims.user_id || claims.uid;
}
function gcloudMinScore(value) {
  execFileSync('gcloud', ['run', 'services', 'update', LF_SERVICE.name, '--project', LF_SERVICE.project, '--region',
    LF_SERVICE.region, `--update-env-vars=RECRUIT_INTAKE_MIN_SCORE=${value}`, '--quiet'], { stdio: 'ignore', timeout: 600000 });
  const read = execFileSync('gcloud', ['run', 'services', 'describe', LF_SERVICE.name, '--project', LF_SERVICE.project,
    '--region', LF_SERVICE.region, '--format=json'], { encoding: 'utf8' });
  const env = JSON.parse(read).spec.template.spec.containers[0].env || [];
  return (env.find((e) => e.name === 'RECRUIT_INTAKE_MIN_SCORE') || {}).value;
}
let chromium;
const browser = async () => {
  chromium = chromium || require('playwright').chromium;
  return chromium.launch({ headless: false, channel: 'chrome', args: ['--disable-blink-features=AutomationControlled'] });
};
const shot = (page, name) => page.screenshot({ path: path.join(RUN, name) }).catch(() => {});

// ---------- steps ----------
async function preflight() {
  await step('0. preflight: admin token + Recruit-only invite is live', async () => {
    const r = await api('GET', '/config/candidate-view');
    assert(r.status === 200, `candidate-view ${r.status} (refresh the admin token)`);
    assert(r.body.invite_needs_moso_record === false, `invite_needs_moso_record=${r.body.invite_needs_moso_record}`);
    state.adminId = userIdFromToken();
    saveState();
    return `moso_record_required=${r.body.moso_record_required}, invite_needs_moso_record=false`;
  });
}

async function addLead() {
  record('1. public REFER form', 'SKIP', '--add-lead: lead made with the admin Add lead instead');
  return step('2. lead created with NO MOSO record (admin Add lead)', async () => {
    const r = await api('POST', '/candidates', { first_name: state.first, last_name: state.last, email: state.email, phone: state.phone });
    assert(r.status === 201 || r.status === 200, `create ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
    state.candidateId = r.body.id; saveState();
    assert(!r.body.legacy_key, 'legacy_key is set (MOSO record)');
    return `candidate ${r.body.id}, legacy_key null, ${r.body.stage}`;
  });
}

async function publicForm() {
  let lowered = false;
  if (flag('--lower-captcha')) {
    await step('1a. reCAPTCHA min score 0 on lf-homepage-master (automated Chrome scores 0)', async () => {
      const at = new Date().toISOString();
      const v = gcloudMinScore('0');
      assert(v === '0', `read back ${v}`);
      lowered = true; state.captchaLoweredAt = at; saveState();
      return `lowered at ${at}`;
    });
  }
  try {
    await step(`1. public REFER form (canary, Recruit-only, ${flag('--lower-captcha') ? 'min score lowered' : 'staging captcha bypass'}): recruit-intake 201, moso_post false, no packs call`, async () => {
      const b = await browser();
      try {
        const page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage();
        let intake = null; let packs = 0;
        page.on('response', async (r) => {
          if (r.request().method() !== 'POST') return;
          if (/recruit-intake/.test(r.url())) intake = { status: r.status(), body: await r.json().catch(() => null) };
          if (/submitReferALoanOfficer/i.test(r.url())) packs++;
        });
        await page.goto(REFER_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await page.waitForTimeout(7000);
        await page.locator('#accept-cookies-button').click({ timeout: 3000 }).catch(() => {});
        await page.fill('input[name=first_name]', state.first);
        await page.fill('input[name=last_name]', state.last);
        await page.fill('input[name=email]', state.email);
        await page.fill('input[name=phone]', state.phone);
        await page.fill('input[name=recruiter_name]', 'QA Referrer S9');
        await page.fill('input[name=referred_by]', `bao.trinh+s9referrer${state.tag}@loanfactory.com`);
        await page.fill('input[name=recruiter_phone]', '7145550199');
        const pay = page.locator('textarea[name=referral_preferred_payment_method]');
        if (await pay.count()) await pay.fill('Zelle');
        await shot(page, '1-form-filled.png');
        await page.getByRole('button', { name: /^Submit$/i }).last().click();
        for (let i = 0; i < 30 && !intake; i++) await page.waitForTimeout(1000);
        await page.waitForTimeout(6000);
        await shot(page, '1-form-submitted.png');
        assert(intake, 'no recruit-intake call seen');
        assert(intake.status !== 400 || flag('--lower-captcha'), 'recruit-intake 400: reCAPTCHA refused. Is the staging bypass deployed and RECRUIT_INTAKE_CAPTCHA_BYPASS_EMAILS set? (or use --lower-captcha)');
        assert(intake.status === 201, `recruit-intake ${intake.status}`);
        const mosoPost = intake.body && (intake.body.moso_post ?? (intake.body.payload || {}).moso_post);
        assert(mosoPost === false, `moso_post=${mosoPost}`);
        assert(packs === 0, `${packs} packs submitReferALoanOfficer call(s)`);
        return 'recruit-intake 201, moso_post=false, packs calls 0';
      } finally { await b.close(); }
    });
  } finally {
    if (lowered) {
      await step('1b. reCAPTCHA min score restored to 0.5', async () => {
        const v = gcloudMinScore('0.5');
        state.captchaRestoredAt = new Date().toISOString(); saveState();
        assert(v === '0.5', `read back ${v}`);
        return `restored at ${state.captchaRestoredAt} (lowered ${state.captchaLoweredAt})`;
      });
    }
  }
  return step('2. lead created with NO MOSO record (DB)', async () => {
    let row = null;
    for (let i = 0; i < 4 && !row; i++) {
      row = db(`select json_build_object('id',id,'legacy_key',legacy_key,'intake_client',intake_client,'stage',stage,'status',status,'n',(select count(*) from candidates where lower(email)=lower(${q(state.email)}))) from candidates where lower(email)=lower(${q(state.email)}) order by created_date desc limit 1`);
      if (!row) await sleep(15000);
    }
    assert(!NO_DB, 'needs the DB to find the lead by e-mail: run without --no-db, or with --add-lead');
    assert(row, 'no candidate with that email');
    state.candidateId = row.id; saveState();
    assert(row.n === 1, `${row.n} rows for the email`);
    assert(row.legacy_key === null, 'legacy_key is set (MOSO record)');
    assert(row.intake_client, 'intake_client empty (not from the intake)');
    return `candidate ${row.id}, intake_client=${row.intake_client}, legacy_key null, ${row.stage}`;
  });
}

async function claimAndOffer() {
  const id = state.candidateId;
  await step('3. claim: owner = admin, stage S1', async () => {
    const r = await api('POST', `/candidates/${id}/claim`);
    assert(r.status === 200, `claim ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
    assert(r.body.owner_id === state.adminId, 'owner is not the admin');
    assert(r.body.stage === 'S1', `stage ${r.body.stage}`);
    return `owner ${r.body.owner_id}, ${r.body.stage}`;
  });
  await step('4. production figures + NMLS (offer-figures-required)', async () => {
    const r = await api('PUT', `/candidates/${id}`, { loans_since_anchor: 8, units12mo: 6, career_production: 12000000, nmls_id: state.nmls });
    assert(r.status === 200, `update ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
    return 'loans_since_anchor 8, units12mo 6, career_production 12M, nmls set';
  });
  return step('5. offer requested + approved (approve_now): SENT, specialist assigned, hand-off', async () => {
    const r = await api('POST', `/candidates/${id}/offers`, { approve_now: true, waive_fee: false, note: 'P4 S9 E2E' });
    assert(r.status === 201, `offer ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    state.offerId = r.body.id; state.specialistId = r.body.onboarding_specialist_id || null; saveState();
    assert(r.body.status === 'SENT', `offer ${r.body.status}`);
    assert(r.body.fee_status === 'PENDING', `fee ${r.body.fee_status}`);
    const c = await api('GET', `/candidates/${id}`);
    return `offer ${state.offerId} SENT, fee PENDING, specialist ${state.specialistId ? 'assigned' : 'NONE'}, lead ${c.body.stage}`;
  });
}

async function oneOnOne() {
  const id = state.candidateId;
  const items = await api('GET', `/candidates/${id}/checklist-items`);
  const list = Array.isArray(items.body) ? items.body : (items.body && (items.body.items || items.body.content)) || [];
  const item = list.find((x) => x.template_code === 'ONB_PREMEETING');
  state.premeetingId = item && item.id; saveState();
  await step('6. 1-1 scheduled (on behalf, no Google invite to real staff)', async () => {
    assert(item, 'no ONB_PREMEETING item');
    // The calendar sync invites the assigned specialist. On staging the specialists are real staff, so the slot is
    // stored WITHOUT a meeting link and the run records whether the sync would reach anyone but test aliases.
    const startsAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const r = await api('PUT', `/checklist-items/${item.id}/onboarding-meeting/schedule-on-behalf`, { starts_at: startsAt, minutes: 30, colleague_user_ids: [] });
    if (r.status === 400 && /past|future/i.test(JSON.stringify(r.body))) return { status: 'SKIP', detail: `schedule refused a past slot: ${JSON.stringify(r.body).slice(0, 120)}` };
    assert(r.status === 200, `schedule ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    return `slot ${startsAt} stored on ${item.id}`;
  });
  return step('7. 1-1 DONE (1099, today in business tz): welcome mail with the portal link', async () => {
    assert(item, 'no ONB_PREMEETING item');
    const r = await api('PATCH', `/checklist-items/${item.id}`, { status: 'DONE', meeting_date: todayIn(BUSINESS_TZ), lo_type: 'INDEPENDENT', employment_type: 'contract' });
    assert(r.status === 200, `done ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    // The welcome is sent after commit and mints its own link, rotating any older one: let it go out before step 8.
    await sleep(20000);
    if (NO_DB) return { status: 'PASS', detail: 'checklist DONE (welcome mail row not checked: --no-db)' };
    const m = db(`select json_build_object('kinds',coalesce(json_agg(json_build_object('kind',kind,'status',status,'link',rendered_body ~ 'register-loan-officer\\?invite=REDACTED') order by created_date),'[]'::json)) from lo_mail_sends where candidate_id=${q(id)}`);
    const welcome = (m.kinds || []).find((k) => k.kind === 'WELCOME');
    assert(welcome, `no WELCOME row (rows: ${JSON.stringify(m.kinds)})`);
    assert(welcome.status === 'SENT', `WELCOME ${welcome.status}`);
    assert(welcome.link === true, 'WELCOME body has no ?invite=REDACTED portal link');
    return 'checklist DONE; WELCOME SENT with ?invite=REDACTED';
  });
}

async function portal() {
  await step('8. staff portal link minted (?invite=, 43 chars) and live', async () => {
    let live = 0; let url = '';
    // A late welcome or reminder mail rotates the link (newest e-mail wins, D368): mint again if ours was rotated.
    for (let attempt = 1; attempt <= 3 && live !== 200; attempt++) {
      if (attempt > 1) await sleep(15000);
      const r = await api('POST', `/offers/${state.offerId}/onboarding-link`);
      assert(r.status === 201 || r.status === 200, `onboarding-link ${r.status}`);
      url = r.body.url;
      const fd = fs.openSync(LINKF, 'w', 0o600); fs.writeSync(fd, url); fs.closeSync(fd);
      live = (await proxy('profile', { token: portalToken() })).status;
    }
    const t = new URL(url).searchParams.get('invite') || '';
    assert(t.length === 43, `token length ${t.length}`);
    assert(live === 200, `the minted link answers ${live}`);
    return `${url.split('?')[0]}?invite=<43 chars>, profile 200`;
  });
  return step('9. portal profile save via lf proxy, read back', async () => {
    const token = portalToken();
    const before = await proxy('profile', { token });
    assert(before.status === 200, `profile ${before.status}`);
    const profile = {
      street: '123 Test Street', city: 'Dallas', state: 'TX', zip: '75201', is_same_as_personal_address: true,
      states: ['TX'], sponsor_states: ['TX'], is_corporate_loan_officer: false, has_dre_endorsed: false,
      nmls: state.nmls, legal_given_name: state.first, legal_last_name: state.last, citizenship: 'US Citizen',
      // what the page's own Basic Info save sends: the detail form is done, step 1 of 4 (the page then opens the fee step)
      completed_detail_form: true, complete_percentage: 0.25,
      // the later-step website gate (LaterStepWebsiteGate) asks these before the fee step
      has_mortgage_website: false, mortgage_website_approval_ack: true, have_social_links: false,
    };
    const s = await proxy('save', { token, profile });
    assert(s.status === 200, `save ${s.status} ${JSON.stringify(s.body).slice(0, 150)}`);
    const after = await proxy('profile', { token });
    const p = after.body || {};
    assert(after.status === 200 && p.city === 'Dallas' && p.zip === '75201', `read back city=${p.city} zip=${p.zip}`);
    assert(Number(p.complete_percentage) >= 0.25, `complete_percentage ${p.complete_percentage}`);
    const b = await browser();
    try {
      const page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })).newPage();
      await page.goto(link(), { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(10000);
      await page.locator('#accept-cookies-button').click({ timeout: 3000 }).catch(() => {});
      await shot(page, '9-portal-desktop.png');
    } finally { await b.close(); }
    return `save 200; city/zip read back; complete_percentage ${p.complete_percentage}`;
  });
}

async function payFee() {
  await step('10. PayPal sandbox fee (headed Chrome, test Visa): fee-paypal PAID, offer fee PAID', async () => {
    const b = await browser();
    let paid = null;
    try {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'America/Chicago' });
      const p = await ctx.newPage();
      p.on('response', (r) => { if (/fee-paypal/.test(r.url())) r.json().then((j) => { paid = { status: r.status(), body: j }; }).catch(() => {}); });
      await p.goto(link(), { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForTimeout(12000);
      await p.locator('#accept-cookies-button').click({ timeout: 3000 }).catch(() => {});
      await p.getByText('Paying "One-Time"').first().scrollIntoViewIfNeeded().catch(() => {});
      await p.mouse.wheel(0, 500); await p.waitForTimeout(8000);
      let fr = null;
      for (let i = 0; i < 20 && !fr; i++) { fr = p.frames().find((f) => /paypal\.com.*smart\/buttons/.test(f.url())); if (!fr) await p.waitForTimeout(1500); }
      if (!fr) {
        await shot(p, '10-no-paypal.png');
        const body = (await p.innerText('body')).replace(/\s+/g, ' ');
        const i = Math.max(0, body.search(/Paying|Before You Begin|Basic Info|Payment/i));
        throw new Error(`no PayPal buttons on the fee step; page: ${body.slice(i, i + 160)}`);
      }
      await shot(p, '10-fee-step.png');
      await fr.locator('[data-funding-source="card"]').first().click();
      await p.waitForTimeout(8000);
      const cf = p.frames().find((f) => /card-fields/.test(f.url()));
      assert(cf, 'no inline card form');
      const fill = async (sel, v) => { const el = cf.locator(sel).first(); if (await el.count()) { await el.click(); await el.fill(''); await el.pressSequentially(v, { delay: 25 }); } };
      // PayPal's publicly documented SANDBOX test Visa; no real card.
      await fill('input[name=cardnumber], input[name=card-number], #credit-card-number', '4012888888881881');
      await fill('input[name=exp-date], input[name=expiry], #expiry-date', '1230');
      await fill('input[name=credit-card-security], input[name=cvv]', '123');
      await fill('input[name=fname], input[name=givenName], #firstName', state.first);
      await fill('input[name=lname], input[name=familyName], #lastName', state.last);
      await fill('input[name=billingLine1], input[name=line1]', '123 Test Street');
      await fill('input[name=billingCity], input[name=city]', 'Dallas');
      await cf.locator('select[name=billingState], select[name=state]').first().selectOption('TX').catch(() => {});
      await fill('input[name=billingPostalCode], input[name=postcode], input[name=postalCode]', '75201');
      await fill('input[name=phone], input[name=phoneNumber]', state.phone);
      await fill('input[name=email]', state.email);
      for (const cb of await cf.locator('input[type=checkbox]').all()) {
        const n = await cb.getAttribute('name');
        if (n !== 'shipToBillingAddress' && await cb.isChecked().catch(() => false)) await cb.uncheck({ force: true }).catch(() => {});
      }
      await shot(p, '10-card-filled.png');
      const payBtn = cf.locator('button:has-text("Pay $"), button#submit-button, button[type=submit]').first();
      assert(await payBtn.count(), 'no Pay button');
      await payBtn.scrollIntoViewIfNeeded(); await payBtn.click();
      for (let i = 0; i < 40 && !paid; i++) await p.waitForTimeout(3000);
      await p.waitForTimeout(4000);
      await p.getByText('Paying "One-Time"').first().scrollIntoViewIfNeeded().catch(() => p.evaluate(() => window.scrollTo(0, 0)));
      await shot(p, '10-after-pay.png');
    } finally { await b.close(); }
    assert(paid, 'no fee-paypal call after Pay');
    assert(paid.status === 200 && paid.body && paid.body.status === 'PAID', `fee-paypal ${paid.status} ${JSON.stringify(paid.body).slice(0, 160)}`);
    state.paypalOrderId = paid.body.paypal_order_id; saveState();
    if (NO_DB) {
      const offers = (await api('GET', `/candidates/${state.candidateId}/offers`)).body;
      const list = Array.isArray(offers) ? offers : (offers && (offers.content || offers.items)) || [];
      const o = list.find((x) => x.id === state.offerId) || {};
      assert(o.fee_status === 'PAID', `offer fee_status ${o.fee_status}`);
      return `order ${state.paypalOrderId}: fee-paypal PAID, offer fee_status PAID (fee_payments not checked: --no-db)`;
    }
    const row = db(`select json_build_object('fee',o.fee_status,'pay',(select json_agg(json_build_object('outcome',outcome,'capture',paypal_capture_id is not null)) from fee_payments f where f.offer_id=o.id)) from offers o where o.id=${q(state.offerId)}`);
    assert(row.fee === 'PAID', `offers.fee_status ${row.fee}`);
    assert((row.pay || []).some((x) => x.outcome === 'PAID' && x.capture), `fee_payments ${JSON.stringify(row.pay)}`);
    return `order ${state.paypalOrderId}: fee-paypal PAID, offers.fee_status PAID, fee_payments PAID with capture`;
  });
  return step('11. paid mails (D404): LO FEE_PAID sent; staff copies only to allowed test aliases', async () => {
    if (NO_DB) return { status: 'SKIP', detail: 'lo_mail_sends not readable: --no-db' };
    await sleep(15000);
    const m = db(`select json_build_object('rows',coalesce(json_agg(json_build_object('tpl',template_id,'status',status,'test',lower(coalesce(recipient,'')) like 'bao.trinh+%')),'[]'::json)) from lo_mail_sends where candidate_id=${q(state.candidateId)} and kind='FEE_PAID'`);
    const rows = m.rows || [];
    const lo = rows.find((r) => r.tpl === 'tpl-lo-fee-paid');
    assert(lo && lo.status === 'SENT', `LO mail ${JSON.stringify(lo)}`);
    const leaked = rows.filter((r) => r.status === 'SENT' && !r.test);
    assert(leaked.length === 0, `${leaked.length} staff mail(s) SENT to a non-test address`);
    const staff = rows.filter((r) => r.tpl === 'tpl-lo-fee-paid-staff').map((r) => `${r.status}${r.test ? '(test)' : '(staff, not sent)'}`);
    return `LO SENT; staff: ${staff.join(', ') || 'none'}`;
  });
}

async function signAndJoin() {
  let signed = false;
  await step('12. sign step (signing-link)', async () => {
    const r = await proxy('signing-link', { token: portalToken() });
    if (r.status === 404 || r.status === 502) {
      state.signDark = true; saveState();
      return { status: 'BLOCKED', detail: `signing-link ${r.status}: dark until recruit.features.esign-de is on (expected). Re-run with --keep, then --resume.` };
    }
    assert(r.status === 200, `signing-link ${r.status}`);
    let s = r.body || {};
    if (s.state === 'SIGNED' || s.lo_agreement_signed) { signed = true; return 'already SIGNED'; }
    assert(s.state === 'READY', `state ${s.state}`);
    const urls = s.url_signing_sessions || [];
    const b = await browser();
    try {
      const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
      await page.goto(Array.isArray(urls) ? urls[0] : urls, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await shot(page, '12-signing-page.png');
      const until = Date.now() + Number(opt('--sign-wait-min', '20')) * 60000;
      log('signing page open: sign it in the browser; waiting for SIGNED');
      while (Date.now() < until) {
        await sleep(20000);
        s = (await proxy('signing-link', { token: portalToken() })).body || {};
        if (s.state === 'SIGNED' || s.lo_agreement_signed) { signed = true; break; }
      }
    } finally { await b.close(); }
    assert(signed, `not signed within the wait (state ${s.state})`);
    return 'SIGNED via document-esign';
  });
  if (!signed) {
    record('13. Joined (S6, auto-stage after signed + paid)', 'BLOCKED', 'needs the signed agreement (step 12)');
    record('14. automatic Send to HR delivered, HR hired', 'BLOCKED', 'needs Joined (step 13)');
    return;
  }
  await step('13. Joined (S6, auto-stage after signed + paid)', async () => {
    let c = null;
    for (let i = 0; i < 12; i++) { c = (await api('GET', `/candidates/${state.candidateId}`)).body; if (c.stage === 'S6') break; await sleep(10000); }
    assert(c.stage === 'S6', `stage ${c.stage}`);
    return 'S6';
  });
  await step('14. automatic Send to HR delivered, HR hired', async () => {
    const until = Date.now() + HR_WAIT_MIN * 60000; let h = null;
    while (Date.now() < until) {
      h = (await api('GET', `/candidates/${state.candidateId}/hr-handoff`)).body || {};
      if (h.delivery === 'delivered' || h.delivery === 'failed') break;
      await sleep(30000);
    }
    assert(h && h.delivery === 'delivered', `delivery ${h && h.delivery}, missing ${JSON.stringify(h && h.missing)}`);
    if (NO_DB) return 'hr-handoff delivery=delivered (outbox not checked: --no-db)';
    const row = db(`select json_build_object('status',status,'attempts',attempts) from hr_handoff_outbox where candidate_id=${q(state.candidateId)} order by created_date desc limit 1`);
    assert(row.status === 'SENT', `outbox ${row.status}`);
    return `hr_handoff_outbox SENT (attempts ${row.attempts}); HR answer is in the recruit-be log line "HR handoff delivered: result=..."`;
  });
}

async function archive() {
  if (flag('--keep')) { record('15. archive', 'SKIP', `--keep: lead kept for --resume ${path.join(RUN, 'state.json')}`); return; }
  await step('15. archive (bulk-archive) revokes the portal links', async () => {
    const r = await api('POST', '/candidates/bulk-archive', { ids: [state.candidateId], reason: 'P4 S9 E2E cleanup' });
    assert(r.status === 200, `bulk-archive ${r.status}`);
    if (NO_DB) {
      const c = (await api('GET', `/candidates/${state.candidateId}`)).body || {};
      assert(c.status === 'ARCHIVED', `status ${c.status}`);
      return 'ARCHIVED (portal link revocation not checked: --no-db)';
    }
    const row = db(`select json_build_object('status',(select status from candidates where id=${q(state.candidateId)}),'live',(select count(*) from onboarding_tokens where candidate_id=${q(state.candidateId)} and revoked_at is null))`);
    assert(row.status === 'ARCHIVED', `status ${row.status}`);
    assert(row.live === 0, `${row.live} live portal link(s)`);
    return 'ARCHIVED, 0 live portal links';
  });
}

function report() {
  const w = Math.max(...results.map((r) => r.step.length));
  const lines = [`P4 S9 E2E  tag=${state.tag}  candidate=${state.candidateId || '-'}  offer=${state.offerId || '-'}`, ''];
  for (const r of results) lines.push(`${r.status.padEnd(7)} ${r.step.padEnd(w)}  ${r.detail}`);
  const count = (s) => results.filter((r) => r.status === s).length;
  lines.push('', `PASS ${count('PASS')}  FAIL ${count('FAIL')}  BLOCKED ${count('BLOCKED')}  SKIP ${count('SKIP')}`);
  const text = lines.join('\n');
  console.log(`\n${text}\n`);
  fs.writeFileSync(path.join(RUN, 'results.txt'), text + '\n');
  fs.writeFileSync(path.join(RUN, 'results.json'), JSON.stringify({ state: { ...state }, results }, null, 2));
  return count('FAIL');
}

(async () => {
  let failures = 1;
  try {
    await preflight();
    if (!resumeFile) {
      if (await (flag('--add-lead') ? addLead() : publicForm())) {
        if (await claimAndOffer()) {
          await oneOnOne();
          if (await portal()) await payFee();
        }
      }
    } else if (!fs.existsSync(LINKF)) {
      await portal();
    }
    if (state.offerId && fs.existsSync(LINKF)) await signAndJoin();
    if (state.candidateId) await archive();
  } catch (e) {
    record('runner', 'FAIL', String(e.message || e).slice(0, 300));
  } finally {
    failures = report();
    if (!flag('--keep')) fs.rmSync(LINKF, { force: true });
  }
  process.exit(failures ? 1 : 0);
})();
