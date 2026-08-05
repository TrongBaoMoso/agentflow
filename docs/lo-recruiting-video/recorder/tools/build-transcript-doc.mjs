// Builds the TEXT edition of the role-walkthrough film: one table row per scene, screen frame on the
// left, the same narration the film speaks on the right (English above, Vietnamese below).
//
//   node tools/build-transcript-doc.mjs            # writes final/lo-recruiting-walkthrough.docx
//
// Why a .docx and not the Docs API: inserting an inline image through batchUpdate needs a publicly
// fetchable URL, which would mean publishing 51 production screenshots to the open web. A .docx
// carries the images inside the file, and Drive converts it in place, so nothing is ever public.
//
// Images and timings both come from tools/pick-doc-frames.mjs (run it first). That file is the one
// place that knows where each scene starts, how long it runs, and which frame was chosen for it.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PICKS = path.join(ROOT, 'final', 'work', 'doc-frame-picks.json');
const OUT_DOCX = path.join(ROOT, 'final', 'lo-recruiting-walkthrough.docx');
const VENV_PY = '/private/tmp/claude-501/-Users-apple-Projects-agentflow/'
  + 'dbc94d2d-7ad8-4e12-b944-84721a89fc7c/scratchpad/venv/bin/python';

const ACTS = [
  { act: 0, title: 'Act 0 — Admin', who: 'IT Team (admin)', gloss: 'Địa hình: hai cái kho, một cái bảng dùng chung' },
  { act: 1, title: 'Act 1 — Outside Recruiter', who: 'Seth August — 2/82 quyền', gloss: 'Từ một cái tên lạ đến lời mời, trên record thật' },
  { act: 2, title: 'Act 2 — Inside Recruiter', who: 'Brayan Suarez — 15/82 quyền', gloss: 'Cùng cái bảng đó, khác cái sổ' },
  { act: 3, title: 'Act 3 — Licensing', who: 'Dung Nguyen — 30/82 quyền', gloss: 'Role bị đứng ngoài pipeline nhưng mở được cả kho' },
  { act: 4, title: 'Act 4 — HR', who: 'Dave Hoang — 74/82 quyền', gloss: 'Tiền, chữ ký, và cái cổng "100% onboarded"' },
  { act: 5, title: 'Act 5 — Onboarding Specialist', who: 'Miley Dau — 5/82 quyền', gloss: 'Checklist chạy bằng email' },
  { act: 6, title: 'Act 6 — Accounting', who: 'Rosaline Pham — 14/82 quyền', gloss: 'Người chi tiền thưởng không mở được pipeline' },
  { act: 7, title: 'Act 7 — Wrap-up', who: 'IT Team (admin)', gloss: 'Bảy role, một God-entity' },
];

// Scene-level footnotes: things the frame alone cannot tell the reader.
const NOTES = {
  s1_6: 'Cảnh này CỐ Ý không có hình Modex: modex.com chặn tự động hoá bằng bot-detection, nên narration '
    + 'kể case Roger Kube trong khi màn hình vẫn là board Recruited. Không có gì bị dựng lên.',
  s1_4: 'Bức tường 5 field required được quay trên record Katie Test, không phải nhân vật chính — điền đủ '
    + '5 field cho nhân vật chính (để đổi được email) đã tự phá mất bằng chứng trên record đó.',
};

const clock = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s - m * 60)).padStart(2, '0')}`;
};

// ---- gather ------------------------------------------------------------------------------------
if (!existsSync(PICKS)) throw new Error(`no ${path.relative(ROOT, PICKS)} — run tools/pick-doc-frames.mjs first`);
const picks = new Map(JSON.parse(readFileSync(PICKS, 'utf8')).map((p) => [p.id, p]));

const en = JSON.parse(readFileSync(path.join(ROOT, 'narration.production.json'), 'utf8'));
const vi = JSON.parse(readFileSync(path.join(ROOT, 'narration.production.vi.json'), 'utf8'));
const mp4 = path.join(ROOT, 'final', 'lo-recruiting-role-walkthrough-production-bilingual.mp4');
const total = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', mp4], { encoding: 'utf8' }).stdout.trim());
if (!Number.isFinite(total)) throw new Error('could not probe the film length');

const missingFrame = en.filter((s) => !picks.has(s.id)).map((s) => s.id);
const missingVi = en.filter((s) => !vi[s.id]).map((s) => s.id);
if (missingFrame.length) throw new Error(`no picked frame for: ${missingFrame.join(', ')}`);
if (missingVi.length) throw new Error(`no Vietnamese for: ${missingVi.join(', ')}`);

const scenes = en.map((s) => {
  const p = picks.get(s.id);
  const file = path.isAbsolute(p.file) ? p.file : path.join(ROOT, p.file);
  if (!existsSync(file)) throw new Error(`picked frame is gone: ${p.file}`);
  return { ...s, ...p, file, vi: vi[s.id].join(' '), note: NOTES[s.id] ?? null };
}).sort((a, b) => a.start - b.start);

// A scene whose narration outlives its own slot would mean the timeline is wrong, and every frame
// after it would be captioned by the wrong voice. Cheap to check, so check.
const overlap = scenes.filter((s) => s.dur <= 0);
if (overlap.length) throw new Error(`non-positive scene length: ${overlap.map((s) => s.id).join(', ')}`);

const payload = {
  outDocx: OUT_DOCX,
  film: {
    length: clock(total),
    scenes: scenes.length,
    acts: ACTS.length,
    file: path.basename(mp4),
  },
  acts: ACTS,
  scenes: scenes.map((s) => ({
    id: s.id, act: s.act, file: s.file, note: s.note, vi: s.vi, en: s.text,
    stamp: clock(s.start), dur: `${Math.round(s.dur)}s`,
    // Say so when the picture is not the scene's opening second, so a reader who seeks to the
    // timecode and sees no dialog is not left wondering.
    shot: s.moved ? `ảnh @ ${clock(s.at)}` : null,
  })),
};

mkdirSync(path.dirname(OUT_DOCX), { recursive: true });
const tmp = path.join(ROOT, 'final', 'work', 'transcript-payload.json');
mkdirSync(path.dirname(tmp), { recursive: true });
writeFileSync(tmp, JSON.stringify(payload, null, 1));

const r = spawnSync(VENV_PY, [path.join(import.meta.dirname, 'transcript_docx.py'), tmp],
  { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`\n${scenes.length} scenes · ${clock(total)} · ${path.relative(ROOT, OUT_DOCX)}`);
