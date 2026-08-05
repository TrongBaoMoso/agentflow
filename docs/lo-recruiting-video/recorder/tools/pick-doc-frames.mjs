// Chooses ONE representative frame per scene for the text edition of the film.
//
//   node tools/pick-doc-frames.mjs        # writes final/doc-frames/<id>_<t>s.jpg + a picks.json log
//
// Why not just grab the scene's first frame: assemble.mjs's verify frames sit at each scene's
// adjOffset, which is the moment the narration STARTS — before the click it describes. And a fixed
// mid-scene percentage is no better: it lands after short-lived modals have closed again (s1_11's
// CHANGE STATUS dialog is open for about three seconds out of twenty-seven).
//
// So: sample the scene once a second at 64×36 greyscale, and keep the frame that differs MOST from
// the scene's opening frame. A modal, an open dropdown or a filled form covers a large part of the
// screen, so "most changed" is usually "the thing the narration is talking about".
//
// Two guards, both learned the hard way on the first pass:
//
//   1. Search only the first ~65% of the scene. A scene ENDS by navigating to wherever the next
//      scene needs to be, so "most changed" over the whole scene reliably returns the NEXT scene's
//      screen — act 0 picked the config page for the counters narration.
//   2. Reject any frame with much less ink than the fullest frame in the window. A page mid-load is
//      also maximally different from the opening frame, and a spinner keeps enough header chrome to
//      survive a median-based threshold — "Loading…" and a bare spinner both got picked before this.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const MP4 = path.join(ROOT, 'final', 'lo-recruiting-role-walkthrough-production-bilingual.mp4');
const SRC_FRAMES = path.join(ROOT, 'final', 'verify-production-bilingual');
const OUT = path.join(ROOT, 'final', 'doc-frames');
const W = 64;
const H = 36;
const PX = W * H;
const SAMPLE_FPS = 1;      // one probe per second of scene
const LEAD = 1.0;          // skip the first second: the cut itself
const WINDOW = 0.65;       // search this much of the scene — the tail belongs to the next scene
const INK_FLOOR = 0.72;    // reject frames under this share of the fullest frame's ink
const DARK = 200;          // a pixel below this counts as ink
// A plain board page is white and lands near 10% ink; a dialog dims the whole page behind it and
// lands past 50%. So ink is really a modal detector, and that is the only case worth moving the
// frame for — the opening frames were already checked one by one, so unverified frames are only
// worth the risk when they show something the opening frame cannot.
const OVERLAY_INK = 0.5;

const probe = (args) => spawnSync('ffprobe', args, { encoding: 'utf8' }).stdout.trim();
const total = Number(probe(['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', MP4]));
if (!Number.isFinite(total)) throw new Error(`could not probe ${MP4}`);

const scenes = readdirSync(SRC_FRAMES)
  .map((f) => /^(s\d+_\d+)_([\d.]+)s\.png$/.exec(f))
  .filter(Boolean)
  .map((m) => ({ id: m[1], start: Number(m[2]) }))
  .sort((a, b) => a.start - b.start);
if (!scenes.length) throw new Error(`no verify frames in ${SRC_FRAMES}`);
scenes.forEach((s, i) => { s.dur = (i + 1 < scenes.length ? scenes[i + 1].start : total) - s.start; });

// Grey 64×36 samples of one scene, as a flat array of Uint8Array frames. One ffmpeg call per scene:
// seeking 51 times is fine, seeking a thousand times is not.
function sampleScene(s) {
  const from = s.start + LEAD;
  const span = Math.max(0.2, Math.min(s.dur * WINDOW, s.dur - 2.5) - LEAD);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', from.toFixed(3),
    '-t', span.toFixed(3), '-i', MP4, '-vf', `fps=${SAMPLE_FPS},scale=${W}:${H}`,
    '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const buf = r.stdout;
  if (!buf || buf.length < PX) return { from, span, frames: [] };
  const frames = [];
  for (let o = 0; o + PX <= buf.length; o += PX) frames.push(buf.subarray(o, o + PX));
  return { from, span, frames };
}

const ink = (f) => { let n = 0; for (let i = 0; i < PX; i += 1) if (f[i] < DARK) n += 1; return n / PX; };
const delta = (a, b) => { let d = 0; for (let i = 0; i < PX; i += 1) d += Math.abs(a[i] - b[i]); return d / PX; };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const picks = [];
for (const s of scenes) {
  const { from, frames } = sampleScene(s);
  let at = s.start;
  let overlay = 0;
  let why = 'opening frame (scene too short to sample)';
  if (frames.length > 1) {
    const base = frames[0];
    const inks = frames.map(ink);
    const floor = Math.max(...inks) * INK_FLOOR;
    let best = -1;
    let bestI = -1;
    frames.forEach((f, i) => {
      if (inks[i] < floor) return;              // blank / mid-load / spinner screen
      const d = delta(f, base);
      if (d > best) { best = d; bestI = i; }
    });
    // Every frame thin on ink means the whole window is a loading screen: take the fullest one
    // rather than the emptiest-but-most-different one.
    if (bestI < 0) bestI = inks.indexOf(Math.max(...inks));
    overlay = inks[bestI];
    if (overlay >= OVERLAY_INK) {
      at = from + bestI / SAMPLE_FPS;
      why = `dialog at +${(at - s.start).toFixed(0)}s of ${s.dur.toFixed(0)}s `
        + `(ink ${(overlay * 100).toFixed(0)}%, Δ${Math.max(best, 0).toFixed(1)})`;
    } else {
      why = `opening frame (no dialog in the window — peak ink ${(overlay * 100).toFixed(0)}%)`;
    }
  }

  const out = path.join(OUT, `${s.id}_${at.toFixed(1)}s.jpg`);
  const args = at > s.start + 0.05
    ? ['-ss', at.toFixed(3), '-i', MP4]
    : ['-i', path.join(SRC_FRAMES, `${s.id}_${s.start.toFixed(1)}s.png`)];
  const ok = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args,
    '-frames:v', '1', '-vf', 'scale=1600:-2', '-q:v', '4', out]).status === 0;
  if (!ok || !existsSync(out)) throw new Error(`could not produce the frame for ${s.id}`);
  picks.push({
    id: s.id, start: s.start, dur: s.dur, at, why,
    moved: at > s.start + 0.05, file: path.relative(ROOT, out),
  });
  console.log(`   ${s.id.padEnd(6)} ${why}`);
}

writeFileSync(path.join(ROOT, 'final', 'work', 'doc-frame-picks.json'), JSON.stringify(picks, null, 1));
const moved = picks.filter((p) => p.moved);
console.log(`\n${picks.length} frames → ${path.relative(ROOT, OUT)}/`);
console.log(`   ${picks.length - moved.length} verified opening frames, ${moved.length} moved to a dialog:`);
console.log(`   ${moved.map((p) => p.id).join(' ')}`);
