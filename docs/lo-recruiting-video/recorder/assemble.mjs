#!/usr/bin/env node
/**
 * assemble.mjs — STEP 3 of the LO Recruiting feature-tour pipeline.
 *
 * Inputs
 *   markers.json          from record.mjs:
 *                         { videoTrimSec, videos: [{ act, videoPath, scenes: [{ id, offset }] }] }
 *   ../audio/durations.json   from build-narration.mjs: { "<id>": seconds }
 *   ../narration.json         [{ id, act, text }]
 *   ../storyboard.md          "## ACT N — Role: …" headings → chapter titles
 *
 * Outputs
 *   ../final/lo-recruiting-role-walkthrough.mp4   1920×1080 H.264 + AAC stereo, chaptered,
 *                                                 burned-in subtitles
 *   ../final/subtitles.srt                        soft-sub, identical segmentation
 *   ../final/verify/<id>.png                       one frame per scene at its adjusted offset
 *   ../final/work/                                 caption PNGs, filtergraph scripts, master.wav
 *
 * Pipeline (playbook §4 step 9, §5, §6.2)
 *   1. concat the per-act videos in act order, trimming login footage off the first
 *   2. master narration track: anullsrc bed + adelay per clip + amix
 *   3. segment narration into subtitle cues, write .srt
 *   4. render one transparent PNG per cue (Chromium, deviceScaleFactor 1 — 2 overflows the frame)
 *   5. burn cues via overlay + enable=between(t\,S\,E)  ← ffmpeg here has NO libass/drawtext
 *   6. mux H.264 + AAC + chapters, then verify frames and streams
 *
 * MULTIPLE VIDEOS: each act records in its own browser context, so each act is its own webm.
 * Scene offsets are per-video (relative to that video's trim point), so every offset is shifted
 * by the cumulative duration of the preceding acts before it is used for audio, subs or verify.
 *
 * SPLIT ACTS: an entry may also carry `seq` (order inside the act) and `durSec` (stop before the
 * source ends). That is how one act contributes several segments — e.g. app footage, an external
 * clip filmed on another site, then the app again — without disturbing any other act.
 *
 * BILINGUAL: --bilingual adds a Vietnamese line under each English one, read from
 * ../narration.vi.json ({ sceneId: [one string per ENGLISH cue] }). Cue timing is derived from the
 * English text only and is never re-derived per language, so a count mismatch is a hard failure.
 * Author the translation against --dump-cues, which prints the exact cues the segmenter produced.
 *
 * Usage
 *   node assemble.mjs
 *   node assemble.mjs --markers=/abs/path/markers.json
 *   node assemble.mjs --keep-work        # keep caption PNGs + filtergraph scripts for debugging
 *   node assemble.mjs --dump-cues        # write final/work/cues.json and stop (no encoding)
 *   node assemble.mjs --bilingual        # EN + VI burned in → …-bilingual.mp4 (EN cut untouched)
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ────────────────────────────────────────────────────────────────────────────────
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

const CUE_WRAP_CHARS = 42;             // chars per subtitle line
const CUE_MAX_LINES = 2;               // never 3 — split the cue instead of shrinking the font
const CUE_MAX_CHARS = CUE_WRAP_CHARS * CUE_MAX_LINES;
const CUE_MERGE_MIN = 14;              // fold a shorter fragment into its neighbour when it fits

const FONT_SIZE = 40;
const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const BOTTOM_MARGIN = 64;              // px from frame bottom to caption box bottom

// Bilingual (--bilingual): the English line keeps its size and position because it is what the
// voice is saying; the Vietnamese translation sits under it, smaller and tinted, so a reader can
// tell at a glance which line is the original. Its wrap width is scaled by the font ratio so both
// blocks come out about the same physical width. NOTE: the VI wrap width does NOT affect timing —
// cues are segmented from the ENGLISH text only and the translation is authored one string per cue.
const FONT_SIZE_VI = 32;
const CUE_WRAP_CHARS_VI = Math.round(CUE_WRAP_CHARS * (FONT_SIZE / FONT_SIZE_VI));   // 52
const VI_COLOR = '#ffdf8a';

const AUDIO_RATE = 48_000;
const CRF = 19;
const PRESET = 'medium';
const AUDIO_BITRATE = '192k';
const MANY_CUES_WARN = 400;

const HERE = path.dirname(fileURLToPath(import.meta.url));   // …/docs/lo-recruiting-video/recorder
const ROOT = path.resolve(HERE, '..');                        // …/docs/lo-recruiting-video
const FINAL_DIR = path.join(ROOT, 'final');
const WORK_DIR = path.join(FINAL_DIR, 'work');
const CUE_DIR = path.join(WORK_DIR, 'cues');
const argv = process.argv.slice(2);
const KEEP_WORK = argv.includes('--keep-work');
const BILINGUAL = argv.includes('--bilingual');
const markersArg = argv.find((a) => a.startsWith('--markers='));

/**
 * Which cut this is. `--variant=production` reads narration.production.json +
 * audio-production/durations.json and writes -production filenames.
 *
 * Every output name carries the variant, for the same reason build-narration.mjs keeps a separate
 * audio dir: the staging cut is signed off, and an assemble run that overwrote it would be
 * unrecoverable without a re-shoot. Four cuts can therefore coexist — {staging, production} x
 * {English, bilingual} — and none of them can clobber another.
 */
const VARIANT = (() => {
  const raw = (argv.find((a) => a.startsWith('--variant=')) ?? '').slice('--variant='.length);
  if (!raw) return 'staging';
  if (raw !== 'staging' && raw !== 'production') fail(`--variant must be "staging" or "production" (got "${raw}")`);
  return raw;
})();
const IS_PRODUCTION = VARIANT === 'production';
const CUT = IS_PRODUCTION ? '-production' : '';

// The bilingual cut is a SEPARATE deliverable — the verified English-only file is never overwritten.
const OUT_MP4 = path.join(FINAL_DIR, `lo-recruiting-role-walkthrough${CUT}${BILINGUAL ? '-bilingual' : ''}.mp4`);
const OUT_SRT = path.join(FINAL_DIR, `subtitles${CUT}${BILINGUAL ? '.bilingual' : ''}.srt`);
const OUT_SRT_VI = path.join(FINAL_DIR, `subtitles${CUT}.vi.srt`);
const VI_JSON = path.join(ROOT, IS_PRODUCTION ? 'narration.production.vi.json' : 'narration.vi.json');
const VERIFY_DIR = path.join(FINAL_DIR, `verify${CUT}${BILINGUAL ? '-bilingual' : ''}`);

// ── Small helpers ─────────────────────────────────────────────────────────────────────────
function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, { maxBuffer = 64 * 1024 * 1024 } = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer });
}

function tryRun(cmd, args) {
  try {
    return run(cmd, args);
  } catch {
    return null;
  }
}

function probeDuration(file) {
  const out = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).trim();
  const d = Number.parseFloat(out);
  if (!Number.isFinite(d) || d <= 0) fail(`ffprobe found no usable duration in ${file} (got "${out}")`);
  return d;
}

function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function firstExisting(candidates, label) {
  const hit = candidates.find((c) => existsSync(c));
  if (!hit) {
    fail(`${label} not found. Looked in:\n   - ${candidates.join('\n   - ')}`);
  }
  return hit;
}

function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return fail(`${label} is not valid JSON (${file}): ${err.message}`);
  }
}

/**
 * enable=between(t\,START\,END)
 *
 * ffmpeg's filtergraph parser treats "," as a filter separator, so a comma INSIDE an option value
 * must be backslash-escaped. We spawn ffmpeg with NO shell, so nothing else protects it, and the
 * filtergraph goes through a script file where quoting would only add another escaping layer
 * (playbook §6.2). Every value this file injects into the graph is numeric except these, so this
 * is the only place escaping is needed — file paths travel in argv, chapter titles in ffmetadata.
 */
function betweenExpr(start, end) {
  return `between(t\\,${start.toFixed(3)}\\,${end.toFixed(3)})`;
}

// ── Preflight ─────────────────────────────────────────────────────────────────────────────
/** ffmpeg ≥7 wants "-/filter_complex FILE"; older builds want "-filter_complex_script FILE". */
function detectFilterScriptFlag() {
  const probeScript = path.join(WORK_DIR, '.flagprobe.txt');
  writeFileSync(probeScript, '[0:a]anull[out]', 'utf8');
  for (const flag of ['-/filter_complex', '-filter_complex_script']) {
    const ok = tryRun('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-t', '0.1',
      '-i', 'anullsrc=r=48000:cl=stereo', flag, probeScript, '-map', '[out]', '-f', 'null', '-',
    ]);
    if (ok !== null) {
      rmSync(probeScript, { force: true });
      return flag;
    }
  }
  rmSync(probeScript, { force: true });
  return fail('ffmpeg accepts neither -/filter_complex nor -filter_complex_script — cannot pass a long filtergraph.');
}

function preflight() {
  const missing = [];
  const ffmpeg = tryRun('which', ['ffmpeg']);
  const ffprobe = tryRun('which', ['ffprobe']);
  if (!ffmpeg) missing.push('ffmpeg (brew install ffmpeg)');
  if (!ffprobe) missing.push('ffprobe (ships with ffmpeg)');

  if (ffmpeg) {
    const filters = tryRun('ffmpeg', ['-hide_banner', '-filters']) ?? '';
    for (const f of ['overlay', 'adelay', 'amix', 'anullsrc', 'concat', 'trim']) {
      if (!new RegExp(`\\b${f}\\b`).test(filters)) missing.push(`ffmpeg "${f}" filter`);
    }
    const encoders = tryRun('ffmpeg', ['-hide_banner', '-encoders']) ?? '';
    if (!/\blibx264\b/.test(encoders)) missing.push('ffmpeg libx264 encoder (H.264 output)');
    if (!/\baac\b/.test(encoders)) missing.push('ffmpeg aac encoder (AAC output)');
  }
  if (missing.length) fail(`Missing required tooling:\n   - ${missing.join('\n   - ')}`);

  console.log('Toolchain OK:');
  console.log(`   ffmpeg   ${ffmpeg.trim()}`);
  console.log(`   ffprobe  ${ffprobe.trim()}`);
  console.log(`   node     ${process.version}`);
}

/** Playwright is only needed for caption PNGs; give a precise remedy if it is absent. */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return fail(
      'Cannot load "playwright" (needed to render caption PNGs — this ffmpeg has no libass/drawtext).\n'
      + `   Fix:  cd ${HERE} && npm install && npx playwright install chromium`,
    );
  }
}

// ── Inputs ────────────────────────────────────────────────────────────────────────────────
/**
 * A stand-in timeline for --dump-cues, so the translation can be authored BEFORE the shoot.
 *
 * Cue TEXT is a pure function of the narration string and the segmenter — markers contribute only
 * WHERE each scene sits on the timeline. So when the only thing wanted is the cue list to translate
 * against, lay the scenes end to end in narration order and get on with it: the strings, their
 * order and their count are byte-identical to what the real assemble will produce.
 *
 * These timings are fiction and are never written anywhere. --dump-cues exits before encoding.
 */
function syntheticMarkers(narration, durations) {
  const gap = 0.6;
  const byAct = new Map();
  let offset = 0;
  for (const n of narration) {
    if (!byAct.has(n.act)) byAct.set(n.act, { act: n.act, videoPath: '(synthetic)', trimSec: 0, scenes: [] });
    byAct.get(n.act).scenes.push({ id: n.id, offset: Math.round(offset * 100) / 100 });
    offset += (durations[n.id] ?? 6) + gap;
  }
  return { videoTrimSec: 0, videos: [...byAct.values()], synthetic: true };
}

function loadInputs() {
  // A production assemble must never fall back to the staging markers — the scene offsets would be
  // plausible, monotonic and completely wrong, which is the hardest kind of mistake to spot.
  const DUMP_ONLY = argv.includes('--dump-cues');
  const markerCandidates = markersArg
    ? [path.resolve(markersArg.slice('--markers='.length))]
    : IS_PRODUCTION
      ? [path.join(HERE, 'markers.production.json'), path.join(ROOT, 'markers.production.json')]
      : [path.join(HERE, 'markers.json'), path.join(ROOT, 'markers.json')];
  const markersPath = (DUMP_ONLY && !markerCandidates.some((f) => existsSync(f)))
    ? null
    : firstExisting(markerCandidates, IS_PRODUCTION
      ? 'markers.production.json (run: LORV_VARIANT=production node record.mjs --markers markers.production.json)'
      : 'markers.json (run the recorder first)');

  const durationsPath = IS_PRODUCTION
    ? firstExisting(
      [path.join(ROOT, 'audio-production', 'durations.json')],
      'audio-production/durations.json (run: node ../build-narration.mjs --variant=production)',
    )
    : firstExisting(
      [path.join(ROOT, 'audio', 'durations.json'), path.join(ROOT, 'durations.json'), path.join(HERE, 'durations.json')],
      'durations.json (run: node ../build-narration.mjs)',
    );

  const narrationPath = IS_PRODUCTION
    ? firstExisting([path.join(ROOT, 'narration.production.json')], 'narration.production.json')
    : firstExisting([path.join(ROOT, 'narration.json'), path.join(HERE, 'narration.json')], 'narration.json');

  const durations = readJson(durationsPath, 'durations.json');
  const narration = readJson(narrationPath, path.basename(narrationPath));
  const markers = markersPath
    ? readJson(markersPath, 'markers.json')
    : syntheticMarkers(narration, durations);

  if (!Array.isArray(markers?.videos) || markers.videos.length === 0) {
    fail('markers.json must contain a non-empty "videos" array: { videoTrimSec, videos: [{ act, videoPath, scenes }] }');
  }
  if (!Array.isArray(narration)) fail('narration.json must be an array of { id, act, text }');

  console.log(`\nInputs  [variant: ${VARIANT}${BILINGUAL ? ' + bilingual' : ''}]:`);
  console.log(`   markers    ${markersPath ?? 'NONE — synthetic timeline, --dump-cues only'}`);
  console.log(`   durations  ${durationsPath}`);
  console.log(`   narration  ${narrationPath}`);

  let viByScene = null;
  if (BILINGUAL) {
    if (!existsSync(VI_JSON)) {
      fail(`--bilingual needs ${path.relative(ROOT, VI_JSON)} (sceneId -> array of Vietnamese cue strings).\n`
        + '   Author it against `node assemble.mjs --dump-cues`, which prints the exact English cues.');
    }
    viByScene = readJson(VI_JSON, 'narration.vi.json');
    console.log(`   vi         ${VI_JSON} (${Object.keys(viByScene).length} scenes)`);
  }
  return { markers, durations, narration, viByScene };
}

/**
 * Flatten the per-act videos into one timeline.
 *
 * Trim: the login happens at the head of the FIRST recording, so the top-level videoTrimSec
 * applies to videos[0]. A per-video `trimSec` (or `videoTrimSec`) overrides it, which is what a
 * recorder that logs in inside every act should emit.
 */
function buildTimeline({ markers, durations, narration }) {
  const textById = new Map(narration.map((n) => [n.id, n.text]));
  // (act, seq): an act may contribute SEVERAL segments — act 1 splits around the Modex clip
  // filmed on another site. seq orders them inside the act; absent seq means a single segment.
  const videos = [...markers.videos]
    .sort((a, b) => ((a.act ?? 0) - (b.act ?? 0)) || ((a.seq ?? 0) - (b.seq ?? 0)));

  const problems = [];
  const scenes = [];
  let cursor = 0;

  const laidOut = videos.flatMap((v, idx) => {
    // record.mjs writes videoPath: null when Playwright could not hand over the webm. Skip that
    // act loudly rather than aborting, so the remaining acts can still be reviewed.
    if (!v.videoPath) {
      problems.push(`act ${v.act} has no videoPath (recording was lost) — the whole act is EXCLUDED from the video`);
      return [];
    }
    // Use the EXACT path the recorder wrote — never glob for the largest webm (playbook §6.3).
    const videoPath = path.isAbsolute(v.videoPath) ? v.videoPath : path.resolve(ROOT, v.videoPath);
    // A synthetic timeline (--dump-cues before the shoot) has no footage by definition: every scene
    // gets its narration duration and nothing is probed. Real runs still hard-fail on a missing file.
    if (markers.synthetic) {
      for (const sc of v.scenes ?? []) {
        const dur = durations[sc.id];
        if (!Number.isFinite(dur)) { problems.push(`no narration duration for ${sc.id}`); continue; }
        // Same shape the real branch pushes — offsets ARE the timeline here, so base is 0.
        scenes.push({
          id: sc.id,
          act: v.act,
          offset: Number(sc.offset) || 0,
          adjOffset: Number(sc.offset) || 0,
          dur,
          text: textById.get(sc.id) ?? '',
        });
        cursor = Math.max(cursor, (Number(sc.offset) || 0) + dur);
      }
      return [];
    }
    if (!existsSync(videoPath)) fail(`act ${v.act} video is missing: ${videoPath}`);

    // Scenes the recorder caught in try/catch are no-ops on screen; the narration still plays.
    for (const f of v.sceneFailures ?? []) {
      problems.push(`scene ${f.id} (act ${v.act}) FAILED while recording — narration plays over an unchanged screen: ${f.error ?? 'unknown error'}`);
    }

    const srcDur = probeDuration(videoPath);
    const rawTrim = v.trimSec ?? v.videoTrimSec ?? (idx === 0 ? markers.videoTrimSec ?? 0 : 0);
    const trim = Math.max(0, Number(rawTrim) || 0);
    if (trim >= srcDur) fail(`act ${v.act}: trim ${trim}s >= video length ${srcDur.toFixed(2)}s (${videoPath})`);

    // durSec caps a segment that must END before its source does — how a split act stops at the
    // moment focus left the app instead of running to the end of its own recording.
    const cap = Number(v.durSec);
    const available = srcDur - trim;
    if (Number.isFinite(cap) && cap > available + 0.05) {
      problems.push(`act ${v.act}${v.seq != null ? `#${v.seq}` : ''}: durSec ${cap}s exceeds the `
        + `${available.toFixed(2)}s available after trim — using what exists`);
    }
    const effDur = Number.isFinite(cap) && cap > 0 ? Math.min(cap, available) : available;
    const base = cursor;
    cursor += effDur;

    for (const s of v.scenes ?? []) {
      const dur = durations[s.id];
      const text = textById.get(s.id);
      if (dur == null) {
        problems.push(`no narration clip/duration for scene ${s.id} — it gets no audio and no subtitle`);
        continue;
      }
      if (!text) {
        problems.push(`no narration text for scene ${s.id} — it gets audio but no subtitle`);
      }
      if (Number(s.offset) > effDur + 0.05) {
        problems.push(`scene ${s.id} starts ${Number(s.offset).toFixed(1)}s into a segment that is only `
          + `${effDur.toFixed(1)}s long — its narration would play over the NEXT segment`);
      }
      scenes.push({
        id: s.id,
        act: v.act,
        offset: Number(s.offset) || 0,
        adjOffset: base + (Number(s.offset) || 0),
        dur,
        text: text ?? '',
      });
    }

    return [{ ...v, videoPath, srcDur, trim, effDur, base }];
  });

  if (!laidOut.length && !markers.synthetic) fail('no usable act videos in markers.json — every videoPath was null or missing');

  const total = cursor;
  scenes.sort((a, b) => a.adjOffset - b.adjOffset);

  for (const s of scenes) {
    if (s.adjOffset + s.dur > total + 0.05) {
      problems.push(
        `scene ${s.id} narration runs past the end of the footage `
        + `(${(s.adjOffset + s.dur).toFixed(1)}s > ${total.toFixed(1)}s) — it will be cut off`,
      );
    }
  }
  const placed = new Set(scenes.map((s) => s.id));
  for (const n of narration) {
    if (!placed.has(n.id) && durations[n.id] != null) {
      problems.push(`narration ${n.id} has a clip but no marker — it will NOT appear in the video`);
    }
  }

  return { videos: laidOut, scenes, total, problems };
}

// ── Subtitle cue segmentation ─────────────────────────────────────────────────────────────
// Narration is 3-4 sentences (~200-320 chars) per scene, so one cue per scene is impossible:
// each scene is split into several contiguous cues that share the scene's clip duration.

const ABBREV = /(?:^|\s)(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|inc|ltd|co|dept|approx|fig|no|e\.g|i\.e)\.$/i;

function splitSentences(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = clean.split(/(?<=[.!?]["')\]]?)\s+/);
  const out = [];
  let buf = '';
  for (const chunk of chunks) {
    buf = buf ? `${buf} ${chunk}` : chunk;
    const looksLikeAbbrev = ABBREV.test(buf) || /(?:^|\s)[A-Z]\.$/.test(buf) || /\d\.$/.test(buf);
    if (!looksLikeAbbrev && /[.!?]["')\]]?$/.test(buf)) {
      out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [clean];
}

/** Split once at the clause boundary closest to the middle; fall back to the word midpoint. */
function splitInTwo(s) {
  const tiers = [/ — /g, / – /g, /; /g, /, /g];
  const mid = s.length / 2;
  for (const re of tiers) {
    const cuts = [];
    for (const m of s.matchAll(re)) {
      const idx = m.index + m[0].length;
      if (idx > 10 && s.length - idx > 10) cuts.push(idx);
    }
    if (!cuts.length) continue;
    cuts.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const cut = cuts[0];
    return [s.slice(0, cut).trim(), s.slice(cut).trim()];
  }

  const words = s.split(' ');
  if (words.length < 2) return [s];
  let best = 1;
  let bestDelta = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const delta = Math.abs(words.slice(0, i).join(' ').length - mid);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function splitLong(s) {
  if (s.length <= CUE_MAX_CHARS) return [s];
  const halves = splitInTwo(s);
  if (halves.length < 2) return [s];
  return halves.flatMap(splitLong);
}

function wrapLines(text, width = CUE_WRAP_CHARS) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Balanced wrap, used for the Vietnamese line only.
 *
 * Greedy wrapping fills line 1 to the limit and leaves whatever is left on line 2, which orphaned
 * one or two words on 20% of the translated cues ("…đang dùng hôm / nay.") and split UI labels that
 * must read as a unit ("Recruited / Loan Officers"). Choosing the most even split instead fixes
 * both. Only applied to VI: the English lines are part of the already-verified cut, and changing
 * their wrapping would change cue segmentation and therefore every cue boundary.
 */
function wrapBalanced(text, width) {
  const words = text.split(' ');
  if (text.length <= width) return [text];
  let best = null;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (a.length > width || b.length > width) continue;
    const delta = Math.abs(a.length - b.length);
    if (!best || delta < best.delta) best = { delta, lines: [a, b] };
  }
  return best ? best.lines : wrapLines(text, width);   // needs 3+ lines: fall back to greedy
}

/** Hard guarantee of ≤2 lines: if a cue needs 3, split it into two cues (never shrink the font). */
function enforceMaxLines(cue) {
  if (wrapLines(cue).length <= CUE_MAX_LINES) return [cue];
  const halves = splitInTwo(cue);
  if (halves.length < 2) return [cue];
  return halves.flatMap(enforceMaxLines);
}

function mergeShortFragments(cues) {
  const out = [];
  for (const cue of cues) {
    const prev = out[out.length - 1];
    const shouldMerge = prev
      && (cue.length < CUE_MERGE_MIN || prev.length < CUE_MERGE_MIN)
      && `${prev} ${cue}`.length <= CUE_MAX_CHARS
      && wrapLines(`${prev} ${cue}`).length <= CUE_MAX_LINES;
    if (shouldMerge) out[out.length - 1] = `${prev} ${cue}`;
    else out.push(cue);
  }
  return out;
}

function segmentCues(text) {
  const sentences = splitSentences(text).flatMap(splitLong);
  return mergeShortFragments(sentences)
    .flatMap(enforceMaxLines)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Share the scene's clip duration across its cues by character count; cues stay contiguous. */
/**
 * The real pauses in a narration clip, as candidate cue boundaries.
 *
 * Character count is a poor clock: numbers are read slowly, commas add pauses, and a short cue full
 * of long words takes longer than a long cue of short ones. Measured across all 51 production
 * scenes, splitting a scene's duration by character weight put cue boundaries a median 1.3s and up
 * to 3.5s away from where the sentence actually starts — and a cue only lasts 3-4s, so the worst
 * ones captioned the NEXT sentence while the voice was still on the previous one.
 *
 * `silence_end` is the moment speech resumes, which is exactly what a cue start should be.
 */
function silenceEnds(wav, noiseDb, minDur) {
  // silencedetect reports on STDERR, so this needs spawnSync rather than run() (stdout only).
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', `silencedetect=noise=${noiseDb}dB:d=${minDur}`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error) return [];
  return [...String(r.stderr || '').matchAll(/silence_end: ([0-9.]+)/g)].map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

/**
 * TWO TIERS, because one threshold cannot serve both jobs.
 *
 * Sentence pauses are long and quiet (-35dB / 0.20s) and are the boundaries we actually want. But
 * segmentCues also splits long sentences at clause boundaries the voice runs straight through, so
 * some scenes need MORE boundaries than there are real sentence pauses — measured: s5_1 needed 5 and
 * had 4, s4_4 needed 11 and had 10. Those scenes fell back to the character estimate entirely and
 * stayed ~3s out while every other scene landed exactly.
 *
 * So collect a loose set too (-30dB / 0.08s: breaths, short clause stops) and let the DP prefer a
 * strong pause whenever one sits near the estimate — WEAK_PENALTY is the margin by which it must be
 * closer for a weak candidate to win.
 */
const WEAK_PENALTY = 0.35;

function detectSpeechStarts(wav) {
  const strong = silenceEnds(wav, -35, '0.20');
  const loose = silenceEnds(wav, -30, '0.08');
  const isStrong = (t) => strong.some((s) => Math.abs(s - t) < 0.12);
  const merged = [...new Set([...strong, ...loose].map((t) => Math.round(t * 100) / 100))].sort((a, b) => a - b);
  return merged.map((t) => ({ t, weak: !isStrong(t) }));
}

/**
 * Snap the N-1 interior cue boundaries onto real pauses, in order, staying as close as possible to
 * the character-weighted estimate. Dynamic programming over (cue index x candidate pause), because
 * a greedy nearest-pause pass can consume a pause an earlier cue needed and then run out of order.
 * Fewer pauses than boundaries (one long unbroken sentence) → keep the estimate for that scene.
 */
function snapToSpeech(estimates, pauses) {
  const n = estimates.length;
  const m = pauses.length;
  if (!n || !m) return estimates;
  if (m < n) {
    // Fewer candidates than boundaries: anchor the m boundaries that fit the pauses best (monotone),
    // then space the unanchored ones proportionally between anchors. Strictly better than giving up
    // on the whole scene — that fallback is what left s5_1 and s4_4 three seconds out.
    const anchors = snapToSpeech(estimates.slice(0, m), pauses);      // m boundaries, m candidates
    const out = estimates.slice();
    for (let i = 0; i < m; i += 1) out[i] = anchors[i];
    return out;
  }
  const INF = Infinity;
  const cost = Array.from({ length: n }, () => new Float64Array(m).fill(INF));
  const from = Array.from({ length: n }, () => new Int32Array(m).fill(-1));
  const at = (j, est) => Math.abs(pauses[j].t - est) + (pauses[j].weak ? WEAK_PENALTY : 0);
  for (let j = 0; j < m; j += 1) cost[0][j] = at(j, estimates[0]);
  for (let i = 1; i < n; i += 1) {
    let bestPrev = INF;
    let bestIdx = -1;
    for (let j = 0; j < m; j += 1) {
      if (j > 0 && cost[i - 1][j - 1] < bestPrev) { bestPrev = cost[i - 1][j - 1]; bestIdx = j - 1; }
      if (bestIdx < 0) continue;                       // no room for i predecessors before j
      cost[i][j] = bestPrev + at(j, estimates[i]);
      from[i][j] = bestIdx;
    }
  }
  let end = -1;
  let best = INF;
  for (let j = 0; j < m; j += 1) if (cost[n - 1][j] < best) { best = cost[n - 1][j]; end = j; }
  if (end < 0) return estimates;
  const out = new Array(n);
  for (let i = n - 1; i >= 0; i -= 1) { out[i] = pauses[end].t; end = from[i][end]; }
  return out;
}

function distributeCues(texts, start, dur, pauses = null) {
  const weights = texts.map((t) => Math.max(1, t.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Character-weighted estimate for the interior boundaries, then snapped onto real pauses.
  const interior = [];
  let walk = 0;
  for (let i = 0; i < texts.length - 1; i += 1) {
    walk += (weights[i] / totalWeight) * dur;
    interior.push(walk);
  }
  const snapped = pauses && pauses.length ? snapToSpeech(interior, pauses) : interior;
  const bounds = snapped.map((t) => start + Math.min(Math.max(t, 0), dur));

  let acc = start;
  return texts.map((text, i) => {
    const isLast = i === texts.length - 1;
    const end = isLast ? start + dur : Math.max(acc + 0.3, bounds[i]);
    // wrapForRender only moves the line BREAK; cue boundaries come from segmentCues(), which calls
    // wrapLines() itself for its ≤2-line checks. A balanced wrap is never wider than the greedy one
    // (greedy fills line 1 to the limit), so this cannot push a caption past the frame edge.
    const cue = { text, lines: wrapForRender(text, CUE_WRAP_CHARS), start: acc, end };
    acc = end;
    return cue;
  });
}

/**
 * Greedy for the English-only cut so that file stays reproducible byte-for-byte; balanced for the
 * bilingual cut, where 20% of cues otherwise orphaned one or two words on the second line.
 */
const wrapForRender = BILINGUAL ? wrapBalanced : wrapLines;

function buildCues(scenes, total, viByScene = null) {
  const cues = [];
  const missingVi = [];
  let snapped = 0;
  let noPauses = 0;
  for (const scene of scenes) {
    if (!scene.text) continue;
    const texts = segmentCues(scene.text);
    // A translation that is off by one cue would silently caption the WRONG sentence for the rest
    // of the scene, so a count mismatch is a hard failure rather than a warning.
    let vi = null;
    if (viByScene) {
      vi = viByScene[scene.id];
      if (!vi) missingVi.push(`${scene.id}: no translation`);
      else if (vi.length !== texts.length) {
        missingVi.push(`${scene.id}: ${vi.length} Vietnamese strings for ${texts.length} English cues`);
      }
    }
    // Real pauses in THIS scene's clip; cue starts land on them (see detectSpeechStarts).
    const wav = path.join(CLIPS_DIR, `${scene.id}.wav`);
    const pauses = texts.length > 1 && existsSync(wav) ? detectSpeechStarts(wav) : [];
    if (pauses.length >= texts.length - 1) snapped += 1;
    else if (texts.length > 1) noPauses += 1;   // partially anchored — see snapToSpeech's m < n branch

    distributeCues(texts, scene.adjOffset, scene.dur, pauses).forEach((cue, i) => {
      const viText = Array.isArray(vi) && vi.length === texts.length ? vi[i] : null;
      cues.push({
        ...cue,
        end: Math.min(cue.end, total),
        sceneId: scene.id,
        vi: viText,
        viLines: viText ? wrapBalanced(viText, CUE_WRAP_CHARS_VI) : null,
      });
    });
  }
  if (missingVi.length) {
    fail(`the Vietnamese track does not line up with the English cues:\n   - ${missingVi.join('\n   - ')}\n`
      + '   Re-run `node assemble.mjs --dump-cues` and match the arrays one string per cue.');
  }
  if (snapped || noPauses) {
    console.log(`   cue timing     ${snapped} scene(s) fully snapped to real speech pauses`
      + (noPauses ? `, ${noPauses} partially anchored (more cues than pauses)` : ''));
  }
  return cues.filter((c) => c.end > c.start + 0.05);
}

// ── SRT ───────────────────────────────────────────────────────────────────────────────────
function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function srtBody(cues, pick) {
  return cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${pick(c).join('\n')}\n`)
    .join('\n');
}

function writeSrt(cues) {
  // Bilingual: both languages in one cue block, the same order they appear on screen.
  writeFileSync(OUT_SRT, `${srtBody(cues, (c) => (
    BILINGUAL && c.viLines ? [...c.lines, ...c.viLines] : c.lines
  ))}\n`, 'utf8');
  console.log(`   ${path.basename(OUT_SRT)}  ${cues.length} cues`);

  if (BILINGUAL) {
    const translated = cues.filter((c) => c.viLines);
    writeFileSync(OUT_SRT_VI, `${srtBody(translated, (c) => c.viLines)}\n`, 'utf8');
    console.log(`   ${path.basename(OUT_SRT_VI)}  ${translated.length} cues (Vietnamese only)`);
  }
}

// ── Caption PNGs (no libass → render each cue in Chromium, playbook §6.2) ─────────────────
async function renderCuePngs(cues) {
  const { chromium } = await loadPlaywright();
  rmSync(CUE_DIR, { recursive: true, force: true });
  mkdirSync(CUE_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1, // ⚠︎ 2 doubles the pixels and overflows the 1080p frame (playbook §6.2)
    });
    const page = await context.newPage();

    // Outline is done with 8-way text-shadow (this ffmpeg has no libass, and Chromium's
    // paint-order support for HTML text is unreliable), plus a soft drop shadow underneath.
    await page.setContent(`<!doctype html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #cue {
    display: inline-block;
    margin: 8px;
    padding: 6px 14px;          /* room for the outline + shadow so the element shot won't clip */
    font-family: ${FONT_STACK};
    text-align: center;
    white-space: pre;           /* we pre-wrapped; keep those exact breaks */
    -webkit-font-smoothing: antialiased;
    text-shadow:
      -2px -2px 0 #000, 0 -2px 0 #000, 2px -2px 0 #000,
      -2px  0    0 #000,                2px  0    0 #000,
      -2px  2px 0 #000, 0  2px 0 #000, 2px  2px 0 #000,
      0 3px 10px rgba(0, 0, 0, 0.85);
  }
  #en {
    display: block;
    font-size: ${FONT_SIZE}px;
    font-weight: 600;
    line-height: 1.28;
    letter-spacing: 0.2px;
    color: #fff;
  }
  /* Hidden unless this run is bilingual, so the English-only layout is byte-for-byte unchanged. */
  #vi {
    display: none;
    font-size: ${FONT_SIZE_VI}px;
    font-weight: 500;
    line-height: 1.26;
    letter-spacing: 0.1px;
    color: ${VI_COLOR};
    margin-top: 6px;
  }
  #vi.on { display: block; }
</style>
<span id="cue"><span id="en"></span><span id="vi"></span></span>`, { waitUntil: 'load' });

    const locator = page.locator('#cue');
    const rendered = [];
    for (const [i, cue] of cues.entries()) {
      const file = path.join(CUE_DIR, `cue${String(i).padStart(4, '0')}.png`);
      await locator.evaluate((el, payload) => {
        const en = el.querySelector('#en');
        const vi = el.querySelector('#vi');
        en.textContent = payload.en;
        // textContent, never innerHTML: cue text is data and must never be parsed as markup.
        vi.textContent = payload.vi ?? '';
        vi.classList.toggle('on', Boolean(payload.vi));
      }, { en: cue.lines.join('\n'), vi: cue.viLines ? cue.viLines.join('\n') : null });
      const box = await locator.boundingBox();
      if (!box) fail(`could not measure caption box for cue ${i}`);
      await locator.screenshot({ path: file, omitBackground: true });

      const w = Math.round(box.width);
      const h = Math.round(box.height);
      if (w > WIDTH) console.warn(`   ⚠︎ cue ${i} is ${w}px wide (frame is ${WIDTH}px): ${cue.text.slice(0, 60)}…`);
      rendered.push({
        ...cue,
        file,
        x: Math.max(0, Math.round((WIDTH - w) / 2)),
        y: Math.max(0, HEIGHT - BOTTOM_MARGIN - h),
      });
      if ((i + 1) % 25 === 0 || i === cues.length - 1) {
        process.stdout.write(`\r   caption PNGs  ${i + 1}/${cues.length}`);
      }
    }
    process.stdout.write('\n');
    return rendered;
  } finally {
    await browser.close();
  }
}

// ── Master narration track ────────────────────────────────────────────────────────────────
/**
 * WHERE THE VOICE COMES FROM — variant-aware, and it MUST be.
 *
 * This was hardcoded to `audio/clips` while the durations, narration text, markers, subtitles and
 * output filenames were all variant-aware. So the production cut shipped with the STAGING voice
 * over PRODUCTION subtitles: 34 of the 51 scenes have different wording between the two scripts,
 * including every number act 4 had just been re-measured for. Nothing in the pipeline caught it —
 * the clips existed, the mix succeeded, the durations came from the right file, and the verify
 * frames only ever show pictures. It took a human watching the film and saying the voice and the
 * captions disagreed.
 */
const CLIPS_DIR = path.join(ROOT, IS_PRODUCTION ? 'audio-production' : 'audio', 'clips');

function buildMasterAudio(scenes, total, filterFlag) {
  const clips = scenes
    .map((s) => ({ ...s, wav: path.join(CLIPS_DIR, `${s.id}.wav`) }))
    .filter((s) => {
      if (existsSync(s.wav)) return true;
      console.warn(`   ⚠︎ missing clip for ${s.id}: ${s.wav}`);
      return false;
    });

  /**
   * THE CHEAP INVARIANT THAT WOULD HAVE CAUGHT THE WRONG-VOICE BUG IN ONE SECOND.
   *
   * `durations.json` is written by build-narration beside the clips it just rendered, so a clip's
   * real length and its recorded duration are the same number BY CONSTRUCTION — unless the two came
   * from different directories. Every scene whose text differs between variants then mismatches, and
   * a mismatch means the voice about to be mixed is not the script the subtitles were cut from.
   * Timing depends on this too: cue placement and each scene's hold both use durations.json.
   */
  const drifted = clips
    .map((c) => ({ id: c.id, want: c.dur, got: probeDuration(c.wav) }))
    .filter((c) => Math.abs(c.got - c.want) > 0.15);
  if (drifted.length) {
    fail(`${drifted.length} narration clip(s) do not match durations.json — the clips in\n`
      + `   ${CLIPS_DIR}\n`
      + '   are not the ones that file was written for, so the VOICE would not be the script the\n'
      + '   subtitles were cut from. Re-run build-narration for this variant, or fix the clip path.\n'
      + `   ${drifted.slice(0, 5).map((c) => `${c.id}: clip ${c.got.toFixed(2)}s vs durations ${c.want.toFixed(2)}s`).join('\n   ')}`);
  }

  const master = path.join(WORK_DIR, 'master.wav');
  const inputs = ['-f', 'lavfi', '-t', total.toFixed(3), '-i', `anullsrc=channel_layout=stereo:sample_rate=${AUDIO_RATE}`];
  const chains = [];
  const mixLabels = ['[0:a]'];

  clips.forEach((clip, i) => {
    const idx = i + 1;
    inputs.push('-i', clip.wav);
    const delayMs = Math.max(0, Math.round(clip.adjOffset * 1000));
    chains.push(`[${idx}:a]adelay=${delayMs}:all=1[a${idx}]`);
    mixLabels.push(`[a${idx}]`);
  });

  // normalize=0 is ESSENTIAL: amix defaults to normalize=true, which divides every input by the
  // input count and leaves the narration nearly inaudible. duration=first pins the output to the
  // silent bed, so the audio can never run longer than the footage.
  chains.push(
    `${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0:duration=first[aout]`,
  );

  const script = path.join(WORK_DIR, 'audio.filter');
  writeFileSync(script, `${chains.join(';\n')}\n`, 'utf8');

  try {
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', ...inputs,
      filterFlag, script, '-map', '[aout]',
      '-ac', '2', '-ar', String(AUDIO_RATE), '-c:a', 'pcm_s16le', master,
    ]);
  } catch (err) {
    fail(`master audio pass failed:\n${err.stderr || err.message}`);
  }

  const dur = probeDuration(master);
  console.log(`   master.wav     ${clips.length} clips placed, ${dur.toFixed(2)}s`);
  return master;
}

// ── Chapters (one per act, titled from storyboard.md) ─────────────────────────────────────
function actTitles() {
  const file = path.join(ROOT, 'storyboard.md');
  const titles = new Map();
  if (!existsSync(file)) {
    console.warn(`   ⚠︎ storyboard.md not found — chapters fall back to "Act N"`);
    return titles;
  }
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^#{1,4}\s*ACT\s+(\d+)\s*[—–-]\s*(.+?)\s*$/i.exec(line.trim());
    if (!m) continue;
    const role = m[2].split(':')[0].replace(/\s*\(.*?\)\s*$/, '').trim();
    titles.set(Number(m[1]), `Act ${m[1]} — ${role}`);
  }
  if (!titles.size) console.warn('   ⚠︎ no "## ACT N — Role" headings in storyboard.md — chapters fall back to "Act N"');
  return titles;
}

function writeChapters(videos, total) {
  const titles = actTitles();
  const lines = [';FFMETADATA1'];
  videos.forEach((v, i) => {
    const start = Math.round(v.base * 1000);
    const end = Math.round((i === videos.length - 1 ? total : videos[i + 1].base) * 1000);
    if (end <= start) return;
    const title = titles.get(Number(v.act)) ?? `Act ${v.act}`;
    lines.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${start}`, `END=${end}`,
      `title=${title.replace(/([=;#\\])/g, '\\$1')}`);
  });
  const file = path.join(WORK_DIR, 'chapters.ffmetadata');
  writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
  console.log(`   chapters       ${(lines.length - 1) / 5} acts`);
  return file;
}

// ── Burn + mux ────────────────────────────────────────────────────────────────────────────
function buildVideo({ videos, cues, master, chaptersFile, filterFlag }) {
  const inputs = [];
  const chains = [];

  videos.forEach((v, i) => {
    inputs.push('-i', v.videoPath);
    chains.push(
      // force_original_aspect_ratio=increase + crop FILLS the frame instead of stretching it: the
      // spliced screen-capture clip is 1920x968, and a plain scale would squash the numbers.
      `[${i}:v]trim=start=${v.trim.toFixed(3)}`
      + `${v.effDur ? `:duration=${v.effDur.toFixed(3)}` : ''},setpts=PTS-STARTPTS,`
      + `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,`
      + `crop=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS},format=yuv420p[v${i}]`,
    );
  });

  let label = `[v0]`;
  if (videos.length > 1) {
    chains.push(`${videos.map((_, i) => `[v${i}]`).join('')}concat=n=${videos.length}:v=1:a=0[base]`);
    label = '[base]';
  }

  const pngBase = videos.length;
  cues.forEach((cue, i) => {
    inputs.push('-i', cue.file);
    const out = `[o${i}]`;
    // eof_action=repeat keeps the single-frame PNG available for the whole timeline; `enable`
    // is what actually gates when it is drawn.
    chains.push(
      `${label}[${pngBase + i}:v]overlay=x=${cue.x}:y=${cue.y}:eof_action=repeat:`
      + `enable=${betweenExpr(cue.start, cue.end)}${out}`,
    );
    label = out;
  });

  const audioIdx = pngBase + cues.length;
  const metaIdx = audioIdx + 1;
  inputs.push('-i', master, '-i', chaptersFile);

  chains.push(`${label}format=yuv420p[vout]`);

  const script = path.join(WORK_DIR, 'video.filter');
  const graph = `${chains.join(';\n')}\n`;
  writeFileSync(script, graph, 'utf8');
  console.log(`   filtergraph    ${chains.length} chains, ${(graph.length / 1024).toFixed(1)} KB → ${path.relative(ROOT, script)}`);
  if (cues.length > MANY_CUES_WARN) {
    console.log(`   ⚠︎ ${cues.length} overlay inputs — this encode will be slow but should still complete.`);
  }

  const args = [
    '-hide_banner', '-loglevel', 'error', '-stats', '-y', ...inputs,
    filterFlag, script,
    '-map', '[vout]', '-map', `${audioIdx}:a`,
    '-map_metadata', String(metaIdx), '-map_chapters', String(metaIdx),
    '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', AUDIO_BITRATE, '-ac', '2', '-ar', String(AUDIO_RATE),
    '-movflags', '+faststart',
    OUT_MP4,
  ];

  console.log(`\nEncoding → ${path.relative(ROOT, OUT_MP4)} (this takes a while)…`);
  const res = spawnSync('ffmpeg', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (res.status !== 0) fail(`ffmpeg burn/mux pass exited ${res.status}. Filtergraph kept at ${script}`);
}

// ── Verify ────────────────────────────────────────────────────────────────────────────────
function verify(scenes, total) {
  console.log(`\n${'─'.repeat(64)}\nVERIFY\n${'─'.repeat(64)}`);
  rmSync(VERIFY_DIR, { recursive: true, force: true });
  mkdirSync(VERIFY_DIR, { recursive: true });

  const streams = run('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,channels,sample_rate',
    '-of', 'json', OUT_MP4,
  ]);
  const parsed = JSON.parse(streams).streams ?? [];
  const video = parsed.find((s) => s.codec_type === 'video');
  const audio = parsed.find((s) => s.codec_type === 'audio');

  if (video) console.log(`   video   ${video.codec_name} ${video.width}×${video.height}`);
  else console.log('   video   ✖ MISSING');
  if (audio) console.log(`   audio   ${audio.codec_name} ${audio.channels}ch @ ${audio.sample_rate} Hz`);
  else console.log('   audio   ✖ MISSING');

  const outDur = probeDuration(OUT_MP4);
  console.log(`   length  ${clock(outDur)} (${outDur.toFixed(2)}s)`);

  const chapters = JSON.parse(run('ffprobe', ['-v', 'error', '-show_chapters', '-of', 'json', OUT_MP4])).chapters ?? [];
  console.log(`   chapters ${chapters.length}`);
  for (const c of chapters) console.log(`      ${clock(Number(c.start_time))}  ${c.tags?.title ?? '(untitled)'}`);

  // A silent AAC track is the classic symptom of amix normalize=1 — catch it here, not on YouTube.
  // volumedetect reports on STDERR, so this must read stderr, not stdout.
  let meanDb = null;
  const vol = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', OUT_MP4, '-map', '0:a', '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
  });
  const volMatch = /mean_volume:\s*(-?[\d.]+) dB/.exec(`${vol.stderr ?? ''}${vol.stdout ?? ''}`);
  if (volMatch) meanDb = Number(volMatch[1]);
  else console.log('   ⚠︎ could not measure loudness (volumedetect produced no reading)');

  let frames = 0;
  for (const s of scenes) {
    const t = Math.min(Math.max(0, s.adjOffset), Math.max(0, total - 0.1));
    const out = path.join(VERIFY_DIR, `${s.id}_${t.toFixed(1)}s.png`);
    const ok = tryRun('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', t.toFixed(3), '-i', OUT_MP4, '-frames:v', '1', out]);
    if (ok !== null && existsSync(out)) frames += 1;
    else console.log(`   ⚠︎ could not extract a frame for ${s.id} @ ${t.toFixed(1)}s`);
  }
  console.log(`   frames  ${frames}/${scenes.length} extracted → ${path.relative(ROOT, VERIFY_DIR)}/`);

  const errors = [];
  if (!video) errors.push('output has NO video stream');
  if (!audio) errors.push('output has NO audio stream');
  if (audio && meanDb !== null && meanDb < -60) {
    errors.push(`audio track is effectively silent (mean_volume ${meanDb} dB) — check amix normalize=0 and the clip offsets`);
  }
  if (errors.length) fail(`VERIFICATION FAILED:\n   - ${errors.join('\n   - ')}`);

  if (meanDb !== null) console.log(`   loudness mean_volume ${meanDb} dB`);
  console.log(`\n✓ ${path.relative(ROOT, OUT_MP4)} has both a video and an audio stream.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────
preflight();
mkdirSync(WORK_DIR, { recursive: true });
mkdirSync(FINAL_DIR, { recursive: true });

const filterFlag = detectFilterScriptFlag();
console.log(`   filter script flag: ${filterFlag}`);

const inputs = loadInputs();
const { videos, scenes, total, problems } = buildTimeline(inputs);

console.log(`\nTimeline (${videos.length} act video${videos.length === 1 ? '' : 's'}, ${scenes.length} scenes, ${clock(total)}):`);
for (const v of videos) {
  console.log(
    `   act ${String(v.act).padEnd(2)} +${v.base.toFixed(1).padStart(7)}s  `
    + `${v.effDur.toFixed(1).padStart(7)}s  trim ${v.trim.toFixed(1)}s  ${path.basename(v.videoPath)}`,
  );
}
if (problems.length) {
  console.log(`\n⚠︎  ${problems.length} timeline problem(s):`);
  for (const p of problems) console.log(`   - ${p}`);
}
if (!scenes.length) fail('no scenes could be placed — check that markers.json ids match durations.json');

console.log('\nBuilding:');
const cues = buildCues(scenes, total, inputs.viByScene);
const perScene = (cues.length / scenes.length).toFixed(1);
console.log(`   cues           ${cues.length} (${perScene} per scene, ≤${CUE_MAX_LINES} lines × ${CUE_WRAP_CHARS} chars)`);
writeSrt(cues);

// --dump-cues: write the exact cue texts (grouped by scene) and stop before encoding. This is how
// the Vietnamese track is authored: the VI strings must align ONE-TO-ONE with these cues, because
// cue timing is derived from the ENGLISH segmentation and never re-derived per language.
if (argv.includes('--dump-cues')) {
  const grouped = new Map();
  for (const c of cues) {
    if (!grouped.has(c.sceneId)) grouped.set(c.sceneId, []);
    grouped.get(c.sceneId).push(c.text);
  }
  const out = [...grouped.entries()].map(([id, texts]) => ({ id, count: texts.length, texts }));
  const file = path.join(WORK_DIR, 'cues.json');
  writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`   cues.json      ${cues.length} cues across ${out.length} scenes -> ${path.relative(ROOT, file)}`);
  process.exit(0);
}

const master = buildMasterAudio(scenes, total, filterFlag);
const chaptersFile = writeChapters(videos, total);
const placedCues = await renderCuePngs(cues);

buildVideo({ videos, cues: placedCues, master, chaptersFile, filterFlag });
verify(scenes, total);

if (!KEEP_WORK) {
  rmSync(CUE_DIR, { recursive: true, force: true });
  console.log(`\n(caption PNGs cleaned up — pass --keep-work to keep them)`);
}

const kept = existsSync(WORK_DIR) ? readdirSync(WORK_DIR).length : 0;
console.log(`\nDone.`);
console.log(`   ${OUT_MP4}`);
console.log(`   ${OUT_SRT}`);
console.log(`   ${VERIFY_DIR}/  (${scenes.length} scene frames — eyeball these before sending)`);
if (kept) console.log(`   ${WORK_DIR}/  (${kept} intermediate files)`);
