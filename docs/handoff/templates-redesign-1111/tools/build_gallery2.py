"""Bilingual (EN default / VI) email gallery for non-technical readers.

Visible text comes from emails/PLAIN.json (plain words, one story per email).
Technical facts (template ids, settings, flags, code gaps) come from emails/FLOWS.json and
emails/JOURNEY.*.md and are shown only in the collapsed "Notes for developers" block at the bottom.
Images: real Gmail captures in tools/gmail (resized into tools/gallery/img)."""
import html
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'gallery')
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)

sent = {s['id']: s for s in json.load(open(os.path.join(HERE, 'sent.json')))}
flows = {f['id']: f for f in json.load(open(os.path.join(DOCS, 'emails', 'FLOWS.json')))}
plain = json.load(open(os.path.join(DOCS, 'emails', 'PLAIN.json')))
JOURNEY = plain.pop('_journey', [])
REMOVED = {'tpl-lo-agreement-link'}  # never sent by any code; removed from Templates on 11/11


# ---------- bilingual helpers ----------
def L(v) -> tuple[str, str]:
    """A bilingual field: {'en','vi'} or a plain string (used for both)."""
    if isinstance(v, dict):
        return v.get('en', ''), v.get('vi', '')
    return (v or '', v or '')


def bi(v, tag: str = 'span') -> str:
    en, vi = L(v)
    return f'<{tag} class="t-en">{html.escape(en)}</{tag}><{tag} class="t-vi">{html.escape(vi)}</{tag}>'


def bil(en: str, vi: str, tag: str = 'span') -> str:
    """Already-HTML bilingual pair."""
    return f'<{tag} class="t-en">{en}</{tag}><{tag} class="t-vi">{vi}</{tag}>'


def jpg(src: str, dst: str, width: int) -> None:
    subprocess.run(['sips', '-Z', str(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', dst],
                   capture_output=True)


def name_of(tid: str):
    return plain.get(tid, {}).get('name') or sent.get(tid, {}).get('name', tid)


def link_to(tid: str) -> str:
    return f'<a class="xref" href="#{html.escape(tid)}">{bi(name_of(tid))}</a>'


# ---------- tiny markdown (dev notes only) ----------
def inline(t: str) -> str:
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'`(.+?)`', r'<code>\1</code>', t)


def md(text: str) -> str:
    out, lst, tbl = [], None, []

    def flush_tbl():
        rows = [r for r in tbl if r.replace('|', '').replace('-', '').replace(':', '').strip()]
        cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
        if cells:
            head = ''.join(f'<th>{inline(c)}</th>' for c in cells[0])
            body = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in cells[1:])
            out.append(f'<div class="tw"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
        tbl.clear()

    for line in text.splitlines():
        s = line.rstrip()
        if s.lstrip().startswith('|'):
            if lst:
                out.append(f'</{lst}>'); lst = None
            tbl.append(s); continue
        flush_tbl()
        if s.startswith('> '):
            s = s[2:]
        m = re.match(r'^(#{1,4})\s+(.*)', s)
        b = re.match(r'^\s*[-*]\s+(.*)', s)
        n = re.match(r'^\s*\d+[.)]\s+(.*)', s)
        if (b or n) is None and lst:
            out.append(f'</{lst}>'); lst = None
        if m:
            lvl = min(len(m.group(1)) + 3, 6); out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
        elif b or n:
            want = 'ul' if b else 'ol'
            if lst != want:
                if lst:
                    out.append(f'</{lst}>')
                out.append(f'<{want}>'); lst = want
            out.append(f'<li>{inline((b or n).group(1))}</li>')
        elif s.strip():
            out.append(f'<p>{inline(s)}</p>')
    flush_tbl()
    if lst:
        out.append(f'</{lst}>')
    return ''.join(out)


# ---------- groups ----------
GROUPS = [
    (('Invite and joining', 'Mời và gia nhập'),
     ['tpl-lo-invite', 'tpl-lo-invite-reminder', 'tpl-lo-welcome', 'tpl-lo-agreement-updated', 'tpl-lo-fee-paid', 'tpl-lo-fee-paid-staff']),
    (('Webinar', 'Webinar'),
     ['tpl-lo-webinar-registered', 'tpl-lo-webinar-session-confirmed', 'tpl-lo-webinar-session-link', 'tpl-lo-webinar-session-moved',
      'tpl-lo-webinar-reminder-2d', 'tpl-lo-webinar-reminder-1d', 'tpl-lo-webinar-reminder-2h']),
    (('After the webinar', 'Sau webinar'),
     ['tpl-lo-webinar-follow-up-attended', 'tpl-lo-webinar-follow-up-missed', 'tpl-lo-webinar-follow-up', 'tpl-lo-webinar-referrer-attended',
      'tpl-lo-webinar-drip-1m', 'tpl-lo-webinar-drip-2m', 'tpl-lo-webinar-drip-3m']),
    (('Onboarding 1-1 call', 'Buổi gọi 1-1 onboarding'), ['tpl-onb-1on1-reminder-2d', 'tpl-onb-1on1-reminder-1d', 'tpl-onb-1on1-reminder-2h']),
    (('Keep in touch (not ready yet)', 'Giữ liên lạc (chưa sẵn sàng)'), ['tpl-nurture-1', 'tpl-nurture-2', 'tpl-nurture-3', 'tpl-nurture-4']),
    (('Sent by hand', 'Recruiter tự gửi'), ['698b9cc2-323d-434e-80e2-244f2c5363dc']),
]
CLICKER = {'tpl-lo-fee-paid-staff': ('Sam or Alex', 'Sam hoặc Alex'), 'tpl-lo-webinar-referrer-attended': ('Riley', 'Riley')}
ARROW = '<span class="arr" aria-hidden="true">→</span>'


def fact(label_en: str, label_vi: str, v) -> str:
    return f'<li><span class="k">{bil(label_en, label_vi)}</span><span class="v">{bi(v)}</span></li>'


def chain(tid: str, clicks: list) -> str:
    who_en, who_vi = CLICKER.get(tid, ('Jordan', 'Jordan'))
    head = f'<h4>{bil(f"What happens when {who_en} clicks", f"Khi {who_vi} bấm nút thì sao")}</h4>'
    if not clicks:
        return head + f'<p class="none">{bil("The buttons in this email are not mapped yet. See the picture for what it shows.", "Nút trong email này chưa được ghi lại. Xem ảnh để biết email có gì.")}</p>'
    rows = []
    for c in clicks:
        nxt = c.get('next_email_id')
        steps = [
            f'<li class="st st-btn"><span class="btn">{bi(c["button"])}</span></li>',
            f'<li class="st">{ARROW}<span><span class="sk">{bil("opens", "mở ra")}</span> {bi(c["opens"])}</span></li>',
            f'<li class="st">{ARROW}<span><span class="sk">{bil("there:", "ở đó:")}</span> {bi(c["does_there"])}</span></li>',
        ]
        if nxt:
            steps.append(f'<li class="st st-next">{ARROW}<span><span class="sk">{bil("next email", "email tiếp theo")}</span> {link_to(nxt)}</span></li>')
        rows.append(f'<ol class="steps">{"".join(steps)}</ol>')
    return head + ''.join(rows)


def bullet_list(v: list) -> str:
    en = ''.join(f'<li>{html.escape(L(x)[0])}</li>' for x in v)
    vi = ''.join(f'<li>{html.escape(L(x)[1])}</li>' for x in v)
    return bil(f'<ul class="ns">{en}</ul>', f'<ul class="ns">{vi}</ul>', 'div')


def card(tid: str) -> str:
    s, p = sent[tid], plain[tid]
    subject = s['subject'].replace('[Test] ', '')
    not_sent = p.get('not_sent') or []
    also = p.get('also_happens')
    also_links = ''.join(f' {link_to(a)}' for a in p.get('also_ids', []))
    en_name, vi_name = L(p['name'])
    return f'''<article class="mail" id="{html.escape(tid)}">
 <div class="txt">
  <h3>{bi(p['name'])}</h3>
  <p class="subj">{bil('Subject in the inbox', 'Tiêu đề trong hộp thư')}: <q>{html.escape(subject)}</q></p>
  <p class="one">{bi(p['one_line'])}</p>
  <div class="ex"><span class="ex-l">{bil('Example', 'Ví dụ')}</span>{bi(p['story'], 'p')}</div>
  <ul class="facts">{fact('Who gets it', 'Ai nhận', p['who_gets'])}{fact('From', 'Người gửi', p['from_name'])}{fact('When', 'Khi nào', p['when'])}</ul>
  <section class="chain">{chain(tid, p.get('click') or [])}</section>
  {f'<section class="not"><h4>{bil("Not sent when", "Không gửi khi")}</h4>{bullet_list(not_sent)}</section>' if not_sent else ''}
  {f'<p class="also"><span class="sk">{bil("Also", "Thêm")}</span> {bi(also)}{(" " + bil("See:", "Xem:") + also_links) if also_links else ""}</p>' if also else ''}
 </div>
 <div class="shots">
  <figure><figcaption>{bil('Gmail on a computer', 'Gmail trên máy tính')}</figcaption>
   <button type="button" class="zoom" data-src="img/{tid}-d.jpg" aria-label="Enlarge"><img loading="lazy" width="828" height="1100" src="img/{tid}-d.jpg" alt="{html.escape(en_name)}, computer"></button></figure>
  <figure class="ph"><figcaption>{bil('Gmail on a phone', 'Gmail trên điện thoại')}</figcaption>
   <button type="button" class="zoom" data-src="img/{tid}-m.jpg" aria-label="Enlarge"><img loading="lazy" src="img/{tid}-m.jpg" alt="{html.escape(en_name)}, phone"></button></figure>
  <p class="hint">{bil('Click a picture to see it full size.', 'Bấm vào ảnh để xem cỡ lớn.')}</p>
 </div>
</article>'''


cards, toc, shown = [], [], []
for (gen, gvi), ids in GROUPS:
    arts = []
    for tid in ids:
        d, m = os.path.join(HERE, 'gmail', f'{tid}-desktop.png'), os.path.join(HERE, 'gmail', f'{tid}-mobile.png')
        if tid in REMOVED or tid not in sent or tid not in plain or not os.path.exists(d) or not os.path.exists(m):
            continue
        jpg(d, os.path.join(OUT, 'img', f'{tid}-d.jpg'), 1100)
        jpg(m, os.path.join(OUT, 'img', f'{tid}-m.jpg'), 2400)
        arts.append(card(tid)); shown.append(tid)
    if arts:
        gid = 'g-' + re.sub(r'[^a-z0-9]+', '-', gen.lower()).strip('-')
        toc.append(f'<a href="#{gid}">{bil(html.escape(gen), html.escape(gvi))} <small>{len(arts)}</small></a>')
        cards.append(f'<section class="group" id="{gid}"><h2>{bil(html.escape(gen), html.escape(gvi))} <small>{len(arts)}</small></h2>{"".join(arts)}</section>')


# ---------- journey (plain) ----------
def journey_html() -> str:
    stages = []
    for st in JOURNEY:
        chips = ''.join(f'<li>{link_to(t)}</li>' for t in st['emails'] if t in shown)
        stages.append(f'<li class="stage"><h3>{bi(st["title"])}</h3>{bi(st["text"], "p")}<ul class="chips">{chips}</ul></li>')
    return f'<ol class="stages">{"".join(stages)}</ol>'


# ---------- dev notes ----------
def dev_val(v) -> str:
    if not v:
        return ''
    if isinstance(v, list):
        en = '<ul>' + ''.join(f'<li>{html.escape(L(x)[0])}</li>' for x in v) + '</ul>'
        vi = '<ul>' + ''.join(f'<li>{html.escape(L(x)[1])}</li>' for x in v) + '</ul>'
        return bil(en, vi, 'div')
    return bi(v)


def dev_email(tid: str) -> str:
    f = flows.get(tid, {})
    rows = [('Template id', 'Mã mẫu', f'<code>{html.escape(tid)}</code>')]
    for key, en, vi in (('recipient', 'Recipient', 'Người nhận'), ('sender', 'Sender', 'Người gửi'),
                        ('trigger_actor', 'Trigger', 'Ai khởi động'), ('timing', 'Timing', 'Thời điểm'),
                        ('trigger_steps', 'Steps', 'Các bước'), ('conditions', 'Conditions', 'Điều kiện'),
                        ('same_action_also_sends', 'Same action also', 'Cùng thao tác còn'), ('next_in_journey', 'Next', 'Tiếp theo')):
        val = dev_val(f.get(key))
        if val:
            rows.append((en, vi, val))
    for b in f.get('buttons') or []:
        label = L(b.get('label'))[0]
        if not label:
            continue
        rows.append((f'Button "{html.escape(label)}"', f'Nút "{html.escape(label)}"',
                     bi(b.get('goes_to')) + ' · ' + bi(b.get('what_happens')) + (' · ' + dev_val(b.get('then_sends')) if b.get('then_sends') else '')))
    if f.get('source'):
        rows.append(('Source', 'Nguồn', '<br>'.join(f'<code>{html.escape(x)}</code>' for x in f['source'])))
    body = ''.join(f'<tr><th>{bil(en, vi)}</th><td>{val}</td></tr>' for en, vi, val in rows)
    return f'<details class="dev-mail"><summary>{bi(name_of(tid))} <code>{html.escape(tid)}</code></summary><div class="tw"><table>{body}</table></div></details>'


def journey_md(lang: str) -> str:
    p = os.path.join(DOCS, 'emails', f'JOURNEY.{lang}.md')
    return md(open(p).read()) if os.path.exists(p) else ''


DEV_NOTE_EN = ('Removed: tpl-lo-agreement-link ("agreement link") was never sent by any code, so it was taken out of Templates on 11/11 and is not shown above. '
               'Per-email facts below are copied from emails/FLOWS.json (read from recruit-be origin/master fc218308d); the readable text above is emails/PLAIN.json.')
DEV_NOTE_VI = ('Đã bỏ: tpl-lo-agreement-link ("link hợp đồng") chưa từng được code nào gửi, nên đã gỡ khỏi Templates ngày 11/11 và không hiện ở trên. '
               'Chi tiết từng email bên dưới chép từ emails/FLOWS.json (đọc từ recruit-be origin/master fc218308d); phần chữ dễ đọc phía trên lấy từ emails/PLAIN.json.')
dev = (f'<details class="dev" id="dev"><summary>{bil("Notes for developers", "Ghi chú cho developer")}</summary>'
       f'<p>{bil(html.escape(DEV_NOTE_EN), html.escape(DEV_NOTE_VI))}</p>'
       f'<h3>{bil("Technical journey, settings and open gaps", "Hành trình kỹ thuật, setting và chỗ còn chưa rõ")}</h3>'
       f'<div class="md">{bil(journey_md("en"), journey_md("vi"), "div")}</div>'
       f'<h3>{bil("Each email, technical detail", "Từng email, chi tiết kỹ thuật")}</h3>{"".join(dev_email(t) for t in shown)}</details>')


# ---------- Templates screen before/after ----------
SH = os.path.join(DOCS, 'shots')
UI = [(('List (manager, computer)', 'Danh sách (manager, máy tính)'), 'before-manager-list-1440.png', 'after-manager-list-1440.png'),
      (('List (phone)', 'Danh sách (điện thoại)'), 'before-manager-list-390.png', 'after-manager-list-390.png'),
      (('Email preview + send history', 'Xem email + lịch sử gửi'), None, 'after-on-drawer-history-1440.png'),
      (('Review: comment on words', 'Duyệt: bình luận tại chữ'), None, 'after-on-review-comments-1440.png'),
      (('Writer gets it back', 'Người viết nhận lại'), None, 'after-on-writer-returned-1440.png')]
ui = []
for (ten, tvi), b, a in UI:
    cells = []
    for (len_, lvi), fn in ((('Before', 'Trước'), b), (('After', 'Sau'), a)):
        if fn and os.path.exists(os.path.join(SH, fn)):
            out = 'ui-' + fn.replace('.png', '.jpg')
            jpg(os.path.join(SH, fn), os.path.join(OUT, 'img', out), 1600)
            cells.append(f'<figure><figcaption>{bil(len_, lvi)}</figcaption><button type="button" class="zoom" data-src="img/{out}" aria-label="Enlarge">'
                         f'<img loading="lazy" src="img/{out}" alt="{html.escape(ten)}"></button></figure>')
    ui.append(f'<article class="ui-card"><h3>{bil(html.escape(ten), html.escape(tvi))}</h3><div class="ba">{"".join(cells)}</div></article>')


LEDE_EN = ('Every email below was really sent from the test site with "Send test to me" and photographed in Gmail on Nov 11, using a made-up Loan Officer, Jordan Example. '
           'The "[Test]" in the inbox and the plain signature are only because these are tests. The live site still sends the old emails until Bao approves.')
LEDE_VI = ('Mỗi email dưới đây được gửi thật từ trang thử (staging) bằng nút "Send test to me" và chụp trong Gmail ngày 11/11, dùng một Loan Officer mẫu tên Jordan Example. '
           'Chữ "[Test]" trong hộp thư và chữ ký đơn giản chỉ vì đây là thư thử. Trang thật vẫn gửi email cũ cho tới khi anh Bảo duyệt.')
RULES = [
    ('Each email goes to a person at most once for the same event.',
     'Mỗi email chỉ gửi tới một người tối đa một lần cho cùng một việc.'),
    ('An email is skipped if the person unsubscribed, their address bounced, or they are no longer active.',
     'Email bị bỏ qua nếu người nhận đã huỷ đăng ký, địa chỉ bị trả về, hoặc người đó không còn hoạt động.'),
    ('On the live site, nothing goes to real Loan Officers until Recruit sending is switched on. Today MOSO still sends its own emails.',
     'Trên trang thật, chưa email nào tới Loan Officer thật cho tới khi bật gửi từ Recruit. Hiện MOSO vẫn tự gửi email của nó.'),
]
PEOPLE = [('Jordan', 'the Loan Officer we are recruiting', 'Loan Officer đang được tuyển'),
          ('Alex', 'the recruiter', 'recruiter'),
          ('Sam', 'the onboarding specialist', 'onboarding specialist'),
          ('Riley', 'the person who referred Jordan', 'người giới thiệu Jordan')]
rules_html = ''.join(f'<li>{bil(html.escape(en), html.escape(vi))}</li>' for en, vi in RULES)
people_html = ''.join(f'<li><b>{n}</b> {bil(html.escape(en), html.escape(vi))}</li>' for n, en, vi in PEOPLE)

CSS = '''
:root{--bg:#f6f4f1;--card:#fff;--fg:#201e1b;--mut:#6b675f;--line:#e4e1dc;--acc:#c24c02;--acc-soft:#fbefe6;--acc-line:#f0d3bd;--soft:#faf9f7;
 --r-lg:14px;--r-md:10px;--r-sm:6px;--sp-card:clamp(16px,2.4vw,28px)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#171615;--card:#211f1d;--fg:#eceae6;--mut:#a39e97;--line:#38342f;--acc:#ef8a4a;--acc-soft:#2c221b;--acc-line:#4a3424;--soft:#1b1a18;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#171615;--card:#211f1d;--fg:#eceae6;--mut:#a39e97;--line:#38342f;--acc:#ef8a4a;--acc-soft:#2c221b;--acc-line:#4a3424;--soft:#1b1a18;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15.5px/1.6 Inter,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:24px 64px;overflow-wrap:anywhere}
:root:not([data-lang="vi"]) .t-vi,:root[data-lang="vi"] .t-en{display:none!important}
.wrap{max-width:1200px;margin:0 auto}
a{color:inherit}
.top{display:flex;align-items:flex-start;gap:16px;justify-content:space-between}
h1{font-size:clamp(24px,2.2vw + 14px,34px);line-height:1.2;margin:0 0 8px;font-weight:600;letter-spacing:-.01em}
.lang{flex:none;display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--card)}
.lang button{border:0;background:transparent;color:var(--mut);font:600 13px/1 inherit;padding:8px 14px;border-radius:999px;cursor:pointer}
.lang button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.lang button:focus-visible,.zoom:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.lede{color:var(--mut);max-width:72ch;margin:0 0 22px}
h2{font-size:21px;margin:40px 0 14px;font-weight:600} h2 small{color:var(--mut);font-weight:400;font-size:14px}
.intro{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;margin:0 0 8px}
.box{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px 22px}
.box h2{margin:0 0 10px;font-size:17px}
.box ul{margin:0;padding-left:20px} .box li{margin:6px 0}
.people{list-style:none;padding:0!important} .people li{margin:4px 0} .people b{display:inline-block;min-width:58px}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 0}
.toc a{font-size:13px;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:5px 12px;background:var(--card)}
.toc a small{color:var(--mut)} .toc a:hover{border-color:var(--acc);color:var(--acc)}
.stages{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;counter-reset:s}
.stage{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px}
.stage h3{margin:0 0 4px;font-size:15.5px;font-weight:600} .stage p{margin:0 0 10px;color:var(--mut);font-size:14.5px}
.chips{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.chips a{display:inline-block;font-size:12.5px;line-height:1.35;text-decoration:none;background:var(--soft);border:1px solid var(--line);border-radius:var(--r-sm);padding:3px 8px}
.chips a:hover{border-color:var(--acc);color:var(--acc)}
.mail{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:var(--sp-card);margin:0 0 18px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:clamp(18px,3vw,40px);scroll-margin-top:16px}
.mail:target{border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-soft)}
.mail h3{margin:0;font-size:clamp(20px,1vw + 15px,24px);line-height:1.25;font-weight:600;letter-spacing:-.005em}
.subj{margin:4px 0 14px;color:var(--mut);font-size:13.5px} .subj q{quotes:"\\201C" "\\201D"}
.one{margin:0 0 14px;font-size:16px}
.ex{background:var(--acc-soft);border:1px solid var(--acc-line);border-left:4px solid var(--acc);border-radius:var(--r-md);padding:12px 16px;margin:0 0 16px}
.ex-l{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--acc);margin-bottom:4px}
.ex p{margin:0}
.facts{list-style:none;padding:0;margin:0 0 18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:var(--r-md)}
.facts li{padding:10px 12px;min-width:0} .facts li+li{border-left:1px solid var(--line)}
.k{display:block;font-size:12px;color:var(--mut);margin-bottom:2px} .v{display:block;font-size:14px;line-height:1.45}
.mail h4{font-size:14px;margin:0 0 8px;font-weight:600}
.chain{margin:0 0 16px}
.steps{list-style:none;padding:0;margin:0 0 10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
.st{display:flex;align-items:baseline;gap:8px;font-size:14px;line-height:1.45;min-width:0}
.st>span:last-child{background:var(--soft);border:1px solid var(--line);border-radius:var(--r-sm);padding:4px 9px}
.st.st-btn>.btn{display:inline-block;border:0;background:var(--acc);color:#fff;font-weight:600;border-radius:999px;padding:5px 13px;font-size:13.5px}
:root[data-theme="dark"] .st.st-btn>.btn{color:#1b1a18}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .st.st-btn>.btn{color:#1b1a18}}
.st-next>span:last-child{background:transparent;border-color:var(--acc-line)}
.sk{color:var(--mut);font-size:12px;margin-right:2px}
.arr{color:var(--acc);font-weight:600}
.xref{color:var(--acc);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
.none{margin:0;color:var(--mut);font-size:14px}
.not{margin:0 0 12px} .ns{margin:0;padding-left:20px;font-size:14px} .ns li{margin:3px 0}
.also{margin:0;font-size:14px;color:var(--mut)} .also>.sk{font-weight:600;color:var(--fg);font-size:12.5px} .also .t-en,.also .t-vi{color:var(--fg)}
.shots{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;align-content:start}
figure{margin:0;min-width:0} figcaption{font-size:12px;color:var(--mut);margin-bottom:6px}
.zoom{display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in}
.shots img,.ba img{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:var(--r-md);background:#fff}
.shots img{max-height:520px;object-fit:cover;object-position:top}
.ph img{border-radius:20px;border:6px solid #2b2927}
.hint{grid-column:1/-1;margin:0;font-size:12px;color:var(--mut)}
.ui-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:var(--sp-card);margin:0 0 16px}
.ui-card h3{margin:0 0 10px;font-size:16px;font-weight:600}
.ba{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:start}
.dev{margin-top:44px;background:var(--card);border:1px dashed var(--line);border-radius:var(--r-lg);padding:14px 20px;font-size:13.5px}
.dev>summary{cursor:pointer;font-weight:600;font-size:15px}
.dev h3{font-size:15px;margin:20px 0 8px} .dev h4,.dev h5,.dev h6{font-size:14px;margin:14px 0 6px}
.dev-mail{border-top:1px solid var(--line);padding:6px 0} .dev-mail summary{cursor:pointer}
table{border-collapse:collapse;width:100%;font-size:13px;margin:6px 0 12px} th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top} th{background:var(--soft);font-weight:600;width:150px}
.tw{overflow-x:auto} td ul{margin:0;padding-left:18px}
code{font-size:12px;background:var(--soft);padding:1px 5px;border-radius:4px}
dialog.lb{border:0;padding:0;background:transparent;max-width:min(96vw,1100px);max-height:94vh}
dialog.lb::backdrop{background:rgba(20,18,16,.78)}
dialog.lb img{display:block;max-width:100%;max-height:90vh;height:auto;border-radius:8px;background:#fff}
dialog.lb .close{position:fixed;top:12px;right:16px;border:0;border-radius:999px;background:#fff;color:#201e1b;font:600 14px/1 inherit;padding:10px 14px;cursor:pointer}
@media (max-width:980px){.mail{grid-template-columns:1fr}.shots{max-width:640px}.intro{grid-template-columns:1fr}}
@media (max-width:640px){.facts{grid-template-columns:1fr}.facts li+li{border-left:0;border-top:1px solid var(--line)}
 .shots{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)} .shots img{max-height:380px} .ph img{border-width:4px;border-radius:14px}
 .top{flex-wrap:wrap}}
'''

page = f'''<title>Recruit Email Gallery</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{CSS}</style>
<div class="wrap">
<header class="top"><h1>{bil('Recruit emails, in plain words', 'Email của Recruit, nói dễ hiểu')}</h1>
<div class="lang" role="group" aria-label="Language"><button type="button" data-l="en">EN</button><button type="button" data-l="vi">VI</button></div></header>
<p class="lede">{bil(html.escape(LEDE_EN), html.escape(LEDE_VI))}</p>
<div class="intro">
 <section class="box" aria-labelledby="rules-h"><h2 id="rules-h">{bil('How all these emails work', 'Các email này hoạt động thế nào')}</h2><ul>{rules_html}</ul></section>
 <section class="box" aria-labelledby="people-h"><h2 id="people-h">{bil('People in the examples', 'Nhân vật trong ví dụ')}</h2><ul class="people">{people_html}</ul></section>
</div>
<nav class="toc" aria-label="Email groups">{''.join(toc)}</nav>
<section id="journey" aria-labelledby="journey-h"><h2 id="journey-h">{bil("The whole journey, step by step", "Toàn bộ hành trình, từng bước")}</h2>{journey_html()}</section>
<main>{''.join(cards)}</main>
<section id="ui"><h2>{bil('The Templates screen, before and after', 'Màn Templates, trước và sau')}</h2>{''.join(ui)}</section>
{dev}
</div>
<dialog class="lb" id="lb" aria-label="Picture"><button type="button" class="close">{bil('Close', 'Đóng')}</button><img alt=""></dialog>
<script>
(function () {{
  var root = document.documentElement, KEY = 'gallery-lang', lang = 'en';
  try {{ lang = localStorage.getItem(KEY) || 'en'; }} catch (e) {{}}
  function set(l) {{ root.setAttribute('data-lang', l); root.lang = l; document.querySelectorAll('.lang button').forEach(function (b) {{ b.setAttribute('aria-pressed', String(b.dataset.l === l)); }}); try {{ localStorage.setItem(KEY, l); }} catch (e) {{}} }}
  document.querySelectorAll('.lang button').forEach(function (b) {{ b.addEventListener('click', function () {{ set(b.dataset.l); }}); }});
  set(lang === 'vi' ? 'vi' : 'en');
  var lb = document.getElementById('lb'), big = lb.querySelector('img');
  document.querySelectorAll('.zoom').forEach(function (z) {{ z.addEventListener('click', function () {{
    big.src = z.dataset.src; big.alt = (z.querySelector('img') || {{}}).alt || '';
    if (lb.showModal) lb.showModal(); else window.open(z.dataset.src, '_blank');
  }}); }});
  lb.addEventListener('click', function (e) {{ if (e.target === lb || e.target.closest('.close')) lb.close(); }});
}})();
</script>'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print('built', len(shown), 'emails,', len(flows), 'flows,', len(plain), 'plain entries')
