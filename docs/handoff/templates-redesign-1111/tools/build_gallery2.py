"""Bilingual (EN default / VI) email gallery: real Gmail captures + detailed trigger / timing / button flows per email.
Reads docs/handoff/templates-redesign-1111/emails/FLOWS.json (+ JOURNEY.en.md / JOURNEY.vi.md) written from the code."""
import json, os, re, subprocess, html

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = '/Users/apple/Projects/agentflow/docs/handoff/templates-redesign-1111'
OUT = os.path.join(HERE, 'gallery')
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
sent = {s['id']: s for s in json.load(open(os.path.join(HERE, 'sent.json')))}
flows_path = os.path.join(DOCS, 'emails', 'FLOWS.json')
flows = {f['id']: f for f in json.load(open(flows_path))} if os.path.exists(flows_path) else {}

def L(v):
    """A bilingual field: {'en','vi'} or a plain string (used for both)."""
    if isinstance(v, dict):
        return v.get('en', ''), v.get('vi', '')
    return (v or '', v or '')

def bi(v, tag='span'):
    en, vi = L(v)
    return f'<{tag} class="t-en">{html.escape(en)}</{tag}><{tag} class="t-vi">{html.escape(vi)}</{tag}>'

def bil(en, vi, tag='span'):
    return f'<{tag} class="t-en">{en}</{tag}><{tag} class="t-vi">{vi}</{tag}>'

def jpg(src, dst, width):
    subprocess.run(['sips', '-Z', str(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', dst], capture_output=True)

def md(text):
    """Tiny markdown: headings, bullets, numbered items, bold, paragraphs."""
    out, lst, tbl = [], None, []
    def flush_tbl():
        if not tbl: return
        rows = [r for r in tbl if not re.match(r'^\|?\s*:?-{2,}', r.replace('|', '', 1).strip() and r.strip('| ').replace('|', '').replace(':', '').replace('-', '').strip() == '' and r or 'x')]
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
            if lst: out.append(f'</{lst}>'); lst = None
            tbl.append(s); continue
        flush_tbl()
        if s.startswith('> '): s = s[2:]
        m = re.match(r'^(#{1,4})\s+(.*)', s)
        b = re.match(r'^\s*[-*]\s+(.*)', s)
        n = re.match(r'^\s*\d+[.)]\s+(.*)', s)
        if (b or n) is None and lst:
            out.append(f'</{lst}>'); lst = None
        if m:
            lvl = min(len(m.group(1)) + 2, 5); out.append(f'<h{lvl}>{inline(m.group(2))}</h{lvl}>')
        elif b or n:
            want = 'ul' if b else 'ol'
            if lst != want:
                if lst: out.append(f'</{lst}>')
                out.append(f'<{want}>'); lst = want
            out.append(f'<li>{inline((b or n).group(1))}</li>')
        elif s.strip():
            out.append(f'<p>{inline(s)}</p>')
    flush_tbl()
    if lst: out.append(f'</{lst}>')
    return ''.join(out)

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    return re.sub(r'`(.+?)`', r'<code>\1</code>', t)

GROUPS = [
    (('Invite and joining', 'Mời và gia nhập'), ['tpl-lo-invite', 'tpl-lo-invite-reminder', 'tpl-lo-welcome', 'tpl-lo-agreement-updated', 'tpl-lo-fee-paid', 'tpl-lo-fee-paid-staff']),
    (('Webinar', 'Webinar'), ['tpl-lo-webinar-registered', 'tpl-lo-webinar-session-confirmed', 'tpl-lo-webinar-session-link', 'tpl-lo-webinar-session-moved', 'tpl-lo-webinar-reminder-2d', 'tpl-lo-webinar-reminder-1d', 'tpl-lo-webinar-reminder-2h']),
    (('After the webinar', 'Sau webinar'), ['tpl-lo-webinar-follow-up', 'tpl-lo-webinar-follow-up-attended', 'tpl-lo-webinar-follow-up-missed', 'tpl-lo-webinar-referrer-attended', 'tpl-lo-webinar-drip-1m', 'tpl-lo-webinar-drip-2m', 'tpl-lo-webinar-drip-3m']),
    (('Onboarding 1-1 call', 'Gọi 1-1 onboarding'), ['tpl-onb-1on1-reminder-2d', 'tpl-onb-1on1-reminder-1d', 'tpl-onb-1on1-reminder-2h']),
    (('Nurture (keep in touch)', 'Nurture (giữ liên lạc)'), ['tpl-nurture-1', 'tpl-nurture-2', 'tpl-nurture-3', 'tpl-nurture-4']),
    (('Sent by hand (Send info)', 'Recruiter tự gửi (Send info)'), ['698b9cc2-323d-434e-80e2-244f2c5363dc']),
]

def field(label_en, label_vi, body_html):
    return f'<div class="f"><dt>{bil(label_en, label_vi)}</dt><dd>{body_html}</dd></div>' if body_html else ''

def items(v):
    if not v: return ''
    if isinstance(v, list):
        en = ''.join(f'<li>{html.escape(L(x)[0])}</li>' for x in v); vi = ''.join(f'<li>{html.escape(L(x)[1])}</li>' for x in v)
        return bil(f'<ul>{en}</ul>', f'<ul>{vi}</ul>', 'div')
    return bi(v)

def buttons(bs):
    if not bs: return ''
    rows = []
    for b in bs:
        then = items(b.get('then_sends'))
        rows.append(f'''<li class="btn-row"><span class="btn-l">{bi(b.get('label'))}</span>
          <div><div class="k">{bil('Goes to', 'Dẫn tới')}</div>{bi(b.get('goes_to'))}</div>
          <div><div class="k">{bil('What happens there', 'Ở đó làm gì')}</div>{bi(b.get('what_happens'))}</div>
          {f'<div><div class="k">{bil("Then sends", "Sau đó gửi")}</div>{then}</div>' if then else ''}</li>''')
    return f'<ul class="btns">{"".join(rows)}</ul>'

cards, toc = [], []
for (gen, gvi), ids in GROUPS:
    arts = []
    for tid in ids:
        s = sent.get(tid)
        d, m = os.path.join(HERE, 'gmail', f'{tid}-desktop.png'), os.path.join(HERE, 'gmail', f'{tid}-mobile.png')
        if not s or not os.path.exists(d) or not os.path.exists(m):
            continue
        jpg(d, os.path.join(OUT, 'img', f'{tid}-d.jpg'), 1100); jpg(m, os.path.join(OUT, 'img', f'{tid}-m.jpg'), 2400)
        f = flows.get(tid, {})
        toc.append(f'<a href="#{html.escape(tid)}">{html.escape(s["name"])}</a>')
        steps = items(f.get('trigger_steps'))
        arts.append(f'''<article class="mail" id="{html.escape(tid)}">
  <header><h3>{html.escape(s['name'])}</h3><p class="subj">{bil('Subject', 'Tiêu đề')}: {html.escape(s['subject'].replace('[Test] ', ''))}</p></header>
  <dl class="grid">{field('Who receives it', 'Ai nhận', bi(f.get('recipient')))}{field('Sent from', 'Gửi từ', bi(f.get('sender')))}{field('Who starts it', 'Ai khởi động', bi(f.get('trigger_actor')))}{field('When it is sent', 'Khi nào gửi', bi(f.get('timing')))}</dl>
  <dl class="wide">{field('What they do to trigger it', 'Thao tác để email được gửi', steps)}
  {field('It is NOT sent when', 'Không gửi khi', items(f.get('conditions')))}
  {field('The same action also sends', 'Cùng thao tác đó còn gửi', items(f.get('same_action_also_sends')))}
  {field('Buttons and links in the email', 'Nút và link trong email', buttons(f.get('buttons')))}
  {field('Usually comes next', 'Thường đến tiếp theo', bi(f.get('next_in_journey')))}
  {field('Example', 'Ví dụ', bi(f.get('example')))}</dl>
  <div class="shots"><figure><figcaption>{bil('Gmail on a computer', 'Gmail trên máy tính')}</figcaption><img loading="lazy" src="img/{tid}-d.jpg" alt="{html.escape(s['name'])} desktop"></figure>
  <figure class="ph"><figcaption>{bil('Phone (390px)', 'Điện thoại (390px)')}</figcaption><img loading="lazy" src="img/{tid}-m.jpg" alt="{html.escape(s['name'])} mobile"></figure></div>
</article>''')
    if arts:
        cards.append(f'<section><h2>{bil(html.escape(gen), html.escape(gvi))} <small>{len(arts)}</small></h2>{"".join(arts)}</section>')

def journey(lang):
    p = os.path.join(DOCS, 'emails', f'JOURNEY.{lang}.md')
    return md(open(p).read()) if os.path.exists(p) else ''

SH = os.path.join(DOCS, 'shots')
UI = [(('List (manager, 1440)', 'Danh sách (manager, 1440)'), 'before-manager-list-1440.png', 'after-manager-list-1440.png'),
      (('List (phone 390)', 'Danh sách (điện thoại 390)'), 'before-manager-list-390.png', 'after-manager-list-390.png'),
      (('Email preview + send history', 'Xem email + lịch sử gửi'), None, 'after-on-drawer-history-1440.png'),
      (('Review: comment on words', 'Duyệt: bình luận tại chữ'), None, 'after-on-review-comments-1440.png'),
      (('Writer gets it back', 'Người viết nhận lại'), None, 'after-on-writer-returned-1440.png')]
ui = []
for (ten, tvi), b, a in UI:
    cells = []
    for (len_, lvi), fn in ((('Before', 'Trước'), b), (('After', 'Sau'), a)):
        if fn and os.path.exists(os.path.join(SH, fn)):
            jpg(os.path.join(SH, fn), os.path.join(OUT, 'img', 'ui-' + fn.replace('.png', '.jpg')), 1600)
            cells.append(f'<figure><figcaption>{bil(len_, lvi)}</figcaption><img loading="lazy" src="img/ui-{fn.replace(".png", ".jpg")}" alt="{html.escape(ten)}"></figure>')
    ui.append(f'<article class="mail"><header><h3>{bil(html.escape(ten), html.escape(tvi))}</h3></header><div class="ba">{"".join(cells)}</div></article>')

LEDE_EN = ('Every email below was really sent by staging with "Send test to me" (the same renderer Recruit uses for Loan Officers, filled with the sample lead Jordan Example) to bao.trinh+manager@loanfactory.com and captured in Gmail on Nov 11. The "[Test]" in front of the subject is only because these are tests. The signature is the account that sent the test (QA Test Manager, which has no title or mobile number in its profile). '
           'The phone captures use exactly the HTML and styles Gmail kept. Production still sends the old emails until Bao approves.')
LEDE_VI = ('Mỗi email dưới đây được staging gửi thật bằng nút "Send test to me" (đúng bộ dựng email khi gửi cho Loan Officer, điền dữ liệu mẫu Jordan Example) tới bao.trinh+manager@loanfactory.com và chụp trong Gmail ngày 11/11. Chữ "[Test]" ở đầu tiêu đề chỉ vì là thư thử. Chữ ký là của tài khoản gửi thử (QA Test Manager, hồ sơ chưa có chức danh và số di động). '
           'Ảnh điện thoại dựng từ đúng nội dung và định dạng Gmail giữ lại. Prod vẫn gửi email cũ cho tới khi anh Bảo duyệt.')
jen, jvi = journey('en'), journey('vi')
page = f'''<title>Recruit Email Gallery</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{{--bg:#f6f4f1;--card:#fff;--fg:#201e1b;--mut:#6e6a63;--line:#e4e1dc;--acc:#c24c02;--soft:#faf9f7}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#171615;--card:#211f1d;--fg:#eceae6;--mut:#a39e97;--line:#38342f;--acc:#ef8a4a;--soft:#1b1a18;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#171615;--card:#211f1d;--fg:#eceae6;--mut:#a39e97;--line:#38342f;--acc:#ef8a4a;--soft:#1b1a18;color-scheme:dark}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 Inter,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 60px}}
:root:not([data-lang="vi"]) .t-vi,:root[data-lang="vi"] .t-en{{display:none!important}}
.wrap{{max-width:1180px;margin:0 auto}}
.top{{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;flex-wrap:wrap}}
h1{{font-size:26px;line-height:1.25;margin:0 0 6px;font-weight:600}}
.lang{{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--card)}}
.lang button{{border:0;background:transparent;color:var(--mut);font:600 13px/1 inherit;padding:7px 14px;border-radius:999px;cursor:pointer}}
.lang button[aria-pressed="true"]{{background:var(--fg);color:var(--bg)}}
.lede{{color:var(--mut);max-width:80ch;margin:4px 0 14px}}
.toc{{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 22px}}
.toc a{{font-size:12.5px;color:var(--fg);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--card)}}
.toc a:hover{{border-color:var(--acc);color:var(--acc)}}
h2{{font-size:19px;margin:30px 0 12px;font-weight:600}} h2 small{{color:var(--mut);font-weight:400;font-size:14px}}
.mail{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:0 0 16px}}
.mail h3{{margin:0;font-size:17px;font-weight:600}} .subj{{margin:2px 0 12px;color:var(--mut);font-size:13.5px}}
dl{{margin:0 0 12px}} dl.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 18px}}
dl.wide .f{{padding:10px 0;border-top:1px solid var(--line)}}
.f{{min-width:0}} dt{{font-size:12px;color:var(--mut);margin-bottom:2px}} dd{{margin:0;font-size:14px}}
dd ul{{margin:4px 0 0;padding-left:20px}} dd li{{margin:2px 0}}
.btns{{list-style:none;padding:0!important;margin:4px 0 0;display:flex;flex-direction:column;gap:8px}}
.btn-row{{display:grid;grid-template-columns:minmax(120px,170px) 1fr 1fr 1fr;gap:10px;align-items:start;background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:0!important}}
.btn-l{{font-weight:600;color:var(--acc)}} .k{{font-size:11.5px;color:var(--mut)}}
@media (max-width:860px){{.btn-row{{grid-template-columns:1fr}}}}
.shots{{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start;margin-top:8px}}
.ba{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;align-items:start}}
figure{{margin:0;min-width:0}} figcaption{{font-size:12px;color:var(--mut);margin-bottom:6px}}
img{{width:100%;height:auto;display:block;border:1px solid var(--line);border-radius:8px;background:#fff}}
.ph img{{max-width:330px;border-radius:22px;border:8px solid #2b2927}}
.journey{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 22px 16px;margin:0 0 18px}}
.journey h3,.journey h4,.journey h5{{margin:16px 0 6px}} .journey li{{margin:3px 0}}
table{{border-collapse:collapse;width:100%;font-size:13.5px;margin:6px 0 12px}} th,td{{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}} th{{background:var(--soft);font-weight:600}} .tw{{overflow-x:auto}}
code{{font-size:12.5px;background:var(--soft);padding:1px 5px;border-radius:4px}}
@media (max-width:760px){{.shots{{grid-template-columns:1fr}}.ph img{{max-width:100%}}}}
</style>
<div class="wrap">
<div class="top"><div><h1>{bil('Recruit emails, on the new design', 'Email thật của Recruit, theo quy chuẩn mới')}</h1></div>
<div class="lang" role="group" aria-label="Language"><button type="button" data-l="en">EN</button><button type="button" data-l="vi">VI</button></div></div>
<p class="lede">{bil(html.escape(LEDE_EN), html.escape(LEDE_VI))}</p>
{f'<section class="journey"><h2>{bil("The whole journey", "Toàn bộ hành trình")}</h2>{bil(jen, jvi, "div")}</section>' if (jen or jvi) else ''}
<nav class="toc">{''.join(toc)}</nav>
<section id="ui"><h2>{bil('Templates screen, before and after', 'Màn Templates, trước và sau')}</h2>{''.join(ui)}</section>
{''.join(cards)}
</div>
<script>
(function () {{
  var root = document.documentElement, KEY = 'gallery-lang', lang = 'en';
  try {{ lang = localStorage.getItem(KEY) || 'en'; }} catch (e) {{}}
  function set(l) {{ root.setAttribute('data-lang', l); root.lang = l; document.querySelectorAll('.lang button').forEach(function (b) {{ b.setAttribute('aria-pressed', String(b.dataset.l === l)); }}); try {{ localStorage.setItem(KEY, l); }} catch (e) {{}} }}
  document.querySelectorAll('.lang button').forEach(function (b) {{ b.addEventListener('click', function () {{ set(b.dataset.l); }}); }});
  set(lang === 'vi' ? 'vi' : 'en');
}})();
</script>'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print('built', len(toc), 'emails,', len(flows), 'flows')
