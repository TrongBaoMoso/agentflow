#!/usr/bin/env node
/**
 * build-narration.mjs — STEP 1 of the LO Recruiting feature-tour pipeline.
 *
 * Reads  ./narration.json         [{ id: "s1_5", act: 1, text: "…English narration…" }, …]
 * Writes ./audio/clips/<id>.wav   48 kHz stereo, loudness-normalized (EBU R128)
 * Writes ./audio/durations.json   { "<id>": <seconds float>, … }  ← measured on the FINAL wav
 *
 * Playbook: /Users/apple/Projects/agentflow/docs/feature-tour-video-playbook.md §4 step 4, §6.8
 *
 * ── TTS rate calibration (measured on this machine, macOS `say -v Samantha`) ──────────────
 * `say -r N` does NOT map 1:1 to words-per-minute — it quantizes into coarse bands. Measured
 * end-to-end throughput (words / clip seconds, i.e. INCLUDING sentence pauses) on real
 * 3-sentence narration prose:
 *
 *     -r 60          → 152.0 wpm
 *     -r 90 … 100    → 164.6 wpm
 *     -r 110 … 150   → 179.6 wpm   ← closest usable band to the 172 wpm target (+4.4%)
 *     -r 160 +, none → 196.6 wpm   ← the DEFAULT rate; overshoots the target by 14%
 *
 * So the `-r` flag IS needed to hit ~172 wpm; the default is far too fast. We ship `-r 140`
 * (mid-band, safely away from both band edges at 110 and 150). Override with `--rate=<n>`,
 * or `--rate=default` to omit `-r` entirely. The summary prints the measured wpm so you can
 * re-calibrate if the narration's punctuation density shifts the effective pace.
 *
 * Usage:
 *   node build-narration.mjs                 # incremental (skips clips newer than narration.json)
 *   node build-narration.mjs --force         # re-render everything
 *   node build-narration.mjs --rate=default  # use say's default rate (no -r)
 *   node build-narration.mjs --only=s1_5,s2_1
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ────────────────────────────────────────────────────────────────────────────────
const VOICE = 'Samantha';
const SAY_RATE = 140;             // see calibration note above; null ⇒ omit -r
const TARGET_WPM = 172;           // playbook §2
const WPM_TOLERANCE = 0.08;       // warn if measured pace is >8% off target
const GAP_SEC = 0.6;             // per-scene hold gap in record.mjs (playbook §5)
const LOUDNORM = 'I=-16:LRA=11:TP=-1.5';
const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const LONG_CLIP_WARN_SEC = 30;    // a single scene holding longer than this is a smell

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NARRATION_JSON = path.join(HERE, 'narration.json');
const CLIP_DIR = path.join(HERE, 'audio', 'clips');
const TMP_DIR = path.join(HERE, 'audio', 'tmp');
const DURATIONS_JSON = path.join(HERE, 'audio', 'durations.json');

// ── CLI ───────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const rateArg = argv.find((a) => a.startsWith('--rate='));
const onlyArg = argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean)) : null;

let sayRate = SAY_RATE;
if (rateArg) {
  const raw = rateArg.slice('--rate='.length).trim();
  if (raw === 'default' || raw === 'none') sayRate = null;
  else {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 40 || n > 500) fail(`--rate must be an integer 40-500 or "default" (got "${raw}")`);
    sayRate = n;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────
function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function tryRun(cmd, args) {
  try {
    return run(cmd, args);
  } catch {
    return null;
  }
}

/** Duration in seconds, measured with ffprobe. */
function probeDuration(file) {
  const out = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ]).trim();
  const d = Number.parseFloat(out);
  if (!Number.isFinite(d) || d <= 0) fail(`ffprobe returned no usable duration for ${file} (got "${out}")`);
  return d;
}

function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** `s1_5` → { act: 1, scene: 5 } so output is ordered like the storyboard, not lexically. */
function parseId(id) {
  const m = /^s(\d+)_(\d+)$/.exec(id);
  return m ? { act: Number(m[1]), scene: Number(m[2]) } : null;
}

// ── Preflight: probe the toolchain and hard-fail early (playbook §3) ──────────────────────
function preflight() {
  const missing = [];

  const ffmpeg = tryRun('which', ['ffmpeg']);
  if (!ffmpeg) missing.push('ffmpeg (brew install ffmpeg)');
  const ffprobe = tryRun('which', ['ffprobe']);
  if (!ffprobe) missing.push('ffprobe (ships with ffmpeg)');
  const sayBin = tryRun('which', ['say']);
  if (!sayBin) missing.push('say (macOS only — this pipeline needs macOS TTS)');

  if (ffmpeg) {
    const filters = tryRun('ffmpeg', ['-hide_banner', '-filters']) ?? '';
    if (!/\bloudnorm\b/.test(filters)) missing.push('ffmpeg "loudnorm" filter (build lacks EBU R128 normalization)');
  }

  if (sayBin) {
    const voices = tryRun('say', ['-v', '?']) ?? '';
    if (!new RegExp(`^${VOICE}\\b`, 'm').test(voices)) {
      missing.push(`macOS voice "${VOICE}" (install via System Settings → Accessibility → Spoken Content → System Voice)`);
    }
  }

  if (missing.length) {
    fail(`Missing required tooling:\n   - ${missing.join('\n   - ')}`);
  }

  console.log('Toolchain OK:');
  console.log(`   ffmpeg   ${ffmpeg.trim()}`);
  console.log(`   ffprobe  ${ffprobe.trim()}`);
  console.log(`   voice    ${VOICE} @ ${sayRate === null ? "say default rate" : `-r ${sayRate}`}`);
  console.log(`   node     ${process.version}`);
}

// ── Load + validate narration.json ────────────────────────────────────────────────────────
function loadNarration() {
  if (!existsSync(NARRATION_JSON)) {
    fail(`narration.json not found at ${NARRATION_JSON}\n   Expected shape: [{ "id": "s1_5", "act": 1, "text": "…" }, …]`);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(NARRATION_JSON, 'utf8'));
  } catch (err) {
    fail(`narration.json is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(data)) fail('narration.json must be a top-level ARRAY of { id, act, text }');
  if (data.length === 0) fail('narration.json is empty');

  const seen = new Map();
  data.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') fail(`narration.json[${i}] is not an object`);
    const { id, act, text } = entry;
    if (typeof id !== 'string' || !id.trim()) fail(`narration.json[${i}] has no usable "id"`);
    if (!Number.isInteger(act)) fail(`narration.json[${i}] (${id}) has a non-integer "act"`);
    if (typeof text !== 'string' || !text.trim()) fail(`narration.json[${i}] (${id}) has no usable "text"`);
    if (seen.has(id)) fail(`duplicate id "${id}" at narration.json[${seen.get(id)}] and [${i}] — clips would overwrite each other`);
    seen.set(id, i);

    const parsed = parseId(id);
    if (!parsed) console.warn(`   ⚠︎ ${id}: id does not match the s<act>_<scene> convention`);
    else if (parsed.act !== act) console.warn(`   ⚠︎ ${id}: id says act ${parsed.act} but "act" field says ${act}`);
  });

  return data;
}

/**
 * Playbook §6.8 — TTS mangles raw acronyms. Flag all-caps runs of 2+ letters so the author can
 * decide whether to respell ("NMLS" → "N-M-L-S", "CSV" → "C S V"). Warning only, never fatal.
 */
const ACRONYM_ALLOW = new Set(['A', 'I', 'OK', 'AND', 'THE', 'NOT']);
function scanAcronyms(entries) {
  const hits = [];
  for (const { id, text } of entries) {
    const found = new Set();
    for (const m of text.matchAll(/\b[A-Z][A-Z0-9]+s?\b/g)) {
      const token = m[0];
      const core = token.replace(/s$/, '');
      if (ACRONYM_ALLOW.has(core.toUpperCase())) continue;
      if (!/[A-Z]{2,}/.test(core)) continue; // needs a run of 2+ caps, e.g. "A1" alone is fine
      found.add(token);
    }
    if (found.size) hits.push({ id, tokens: [...found] });
  }

  if (!hits.length) return;
  console.log(`\n⚠︎  Possible TTS mispronunciations (playbook §6.8) — respell if they matter:`);
  for (const { id, tokens } of hits) console.log(`   ${id.padEnd(8)} ${tokens.join(', ')}`);
  console.log('   (warning only — nothing was blocked)');
}

// ── Render one clip: say → AIFF → ffmpeg loudnorm → 48 kHz stereo WAV ────────────────────
function renderClip(entry) {
  const aiff = path.join(TMP_DIR, `${entry.id}.aiff`);
  const wav = path.join(CLIP_DIR, `${entry.id}.wav`);
  const txt = path.join(TMP_DIR, `${entry.id}.txt`);

  // Pass text via -f FILE, never as an argv string: narration contains commas, quotes and
  // apostrophes, and execFileSync runs with NO shell to protect them.
  writeFileSync(txt, entry.text, 'utf8');

  const sayArgs = ['-v', VOICE];
  if (sayRate !== null) sayArgs.push('-r', String(sayRate));
  sayArgs.push('-o', aiff, '-f', txt);

  try {
    run('say', sayArgs);
  } catch (err) {
    fail(`say failed for ${entry.id}: ${err.stderr || err.message}`);
  }

  try {
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', aiff,
      '-filter:a', `loudnorm=${LOUDNORM}`,
      '-ar', String(SAMPLE_RATE), '-ac', String(CHANNELS), '-c:a', 'pcm_s16le',
      wav,
    ]);
  } catch (err) {
    fail(`ffmpeg loudnorm failed for ${entry.id}: ${err.stderr || err.message}`);
  }

  rmSync(aiff, { force: true });
  rmSync(txt, { force: true });

  return probeDuration(wav); // measured on the FINAL wav, never the aiff
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────
preflight();

const entries = loadNarration();
mkdirSync(CLIP_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const narrationMtime = statSync(NARRATION_JSON).mtimeMs;
console.log(`\nnarration.json: ${entries.length} entries`);
scanAcronyms(entries);
console.log('');

const durations = {};
let rendered = 0;
let skipped = 0;

for (const entry of entries) {
  if (ONLY && !ONLY.has(entry.id)) {
    // Still need a duration for durations.json to stay complete.
    const wav = path.join(CLIP_DIR, `${entry.id}.wav`);
    if (existsSync(wav)) durations[entry.id] = probeDuration(wav);
    continue;
  }

  const wav = path.join(CLIP_DIR, `${entry.id}.wav`);
  const fresh = existsSync(wav) && statSync(wav).mtimeMs > narrationMtime;

  let dur;
  if (fresh && !FORCE) {
    dur = probeDuration(wav);
    skipped += 1;
    process.stdout.write(`  ·  ${entry.id.padEnd(8)} ${dur.toFixed(2)}s  (up to date)\n`);
  } else {
    dur = renderClip(entry);
    rendered += 1;
    const wpm = (wordCount(entry.text) / dur) * 60;
    process.stdout.write(`  ✓  ${entry.id.padEnd(8)} ${dur.toFixed(2)}s  ${Math.round(wpm)} wpm\n`);
  }
  durations[entry.id] = Number(dur.toFixed(3));
}

// Deterministic, storyboard-ordered output.
const ordered = {};
for (const id of Object.keys(durations).sort((a, b) => {
  const A = parseId(a);
  const B = parseId(b);
  if (A && B) return A.act - B.act || A.scene - B.scene;
  return a.localeCompare(b);
})) ordered[id] = durations[id];

writeFileSync(DURATIONS_JSON, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
rmSync(TMP_DIR, { recursive: true, force: true });

// ── Orphan clips (renamed/removed scenes leave stale wavs behind) ─────────────────────────
const known = new Set(entries.map((e) => e.id));
const orphans = readdirSync(CLIP_DIR)
  .filter((f) => f.endsWith('.wav'))
  .map((f) => f.replace(/\.wav$/, ''))
  .filter((id) => !known.has(id));
if (orphans.length) {
  console.log(`\n⚠︎  Stale clips not in narration.json (safe to delete): ${orphans.join(', ')}`);
}

// ── Summary: per-act subtotal + TOTAL estimated runtime (playbook §5 pacing) ──────────────
const byAct = new Map();
for (const entry of entries) {
  const dur = durations[entry.id];
  if (dur == null) continue;
  if (!byAct.has(entry.act)) byAct.set(entry.act, { scenes: 0, narration: 0, words: 0 });
  const a = byAct.get(entry.act);
  a.scenes += 1;
  a.narration += dur;
  a.words += wordCount(entry.text);
}

let totScenes = 0;
let totNarration = 0;
let totWords = 0;
for (const a of byAct.values()) {
  totScenes += a.scenes;
  totNarration += a.narration;
  totWords += a.words;
}
const totVideo = totNarration + GAP_SEC * totScenes;

console.log(`\n${'─'.repeat(64)}`);
console.log(`Rendered ${rendered}, up to date ${skipped}  →  ${path.relative(HERE, DURATIONS_JSON)}`);
console.log(`${'─'.repeat(64)}`);
console.log(`${'Act'.padEnd(6)}${'Scenes'.padStart(7)}${'Narration'.padStart(12)}${'+gaps'.padStart(10)}`);
for (const act of [...byAct.keys()].sort((a, b) => a - b)) {
  const a = byAct.get(act);
  const withGaps = a.narration + GAP_SEC * a.scenes;
  console.log(
    `${String(act).padEnd(6)}${String(a.scenes).padStart(7)}${clock(a.narration).padStart(12)}${clock(withGaps).padStart(10)}`,
  );
}
console.log(`${'─'.repeat(64)}`);
console.log(`${'TOTAL'.padEnd(6)}${String(totScenes).padStart(7)}${clock(totNarration).padStart(12)}${clock(totVideo).padStart(10)}`);
console.log(`\nTOTAL ESTIMATED VIDEO RUNTIME: ${clock(totVideo)}  (${totVideo.toFixed(1)}s)`);
console.log(`   = ${clock(totNarration)} narration + ${totScenes} scenes × ${GAP_SEC}s hold gap`);

const measuredWpm = totNarration > 0 ? (totWords / totNarration) * 60 : 0;
const drift = TARGET_WPM > 0 ? (measuredWpm - TARGET_WPM) / TARGET_WPM : 0;
console.log(`   pace: ${Math.round(measuredWpm)} wpm over ${totWords} words (target ${TARGET_WPM}, ${drift >= 0 ? '+' : ''}${(drift * 100).toFixed(1)}%)`);
if (Math.abs(drift) > WPM_TOLERANCE) {
  console.log(`   ⚠︎ pace is >${WPM_TOLERANCE * 100}% off target — see the rate-calibration note at the top of this file,`);
  console.log(`     then re-run with --rate=<n> --force (say -r quantizes into coarse bands).`);
}

const longest = Object.entries(ordered).sort((a, b) => b[1] - a[1]).slice(0, 3);
const tooLong = longest.filter(([, d]) => d > LONG_CLIP_WARN_SEC);
if (tooLong.length) {
  console.log(`\n⚠︎  Scenes whose narration exceeds ${LONG_CLIP_WARN_SEC}s (the recorder must hold the shot that long):`);
  for (const [id, d] of tooLong) console.log(`   ${id.padEnd(8)} ${d.toFixed(1)}s`);
}
console.log(`\nNext: cd recorder && npm run probe   (validate selectors live, playbook §4 step 7)\n`);
