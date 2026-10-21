import datetime as dt
import json
import os

ROOT = '/private/tmp/claude-501/-Users-apple-Projects-agentflow/c12550de-9243-4e84-9349-1425380eabcd/scratchpad/artifact-files/0fe4cd9c-6fc9-48ec-99f8-a3976b312825/project'
H = 1260
N = 11
COLS = '160px 200px 190px 200px 170px 80px minmax(0,1fr)'
NOW = dt.datetime(2026, 10, 21, 9, 0)


def humane(minutes):
    d, h = divmod(int(minutes // 60), 24)
    if minutes < 60 * 24 * 14:
        return f'{d}d {h}h' if h else f'{d}d'
    w, dd = divmod(d, 7)
    return f'{w}w {dd}d' if dd else f'{w}w'


def chip(at):
    s = at.strftime('%a, %b ') + str(at.day) + ' · ' + at.strftime('%I:%M%p').lstrip('0').lower()
    return s


# (case, LO initials, LO name, nmls, states, who kind, who name, task, since, late, past, action)
# who kind: person | lo | team
CASES = [
    ('1. Chờ manager duyệt', 'QA', 'QA AnewL', '9930243', 'wnnnnnnnnnn', 'team', 'Managers', 'Approve invite', dt.datetime(2026, 10, 1, 10, 37), True, False, 'Remind manager'),
    ('2. BYPASS tự duyệt, chưa đặt 1-1', 'NH', 'Nam Ho', '2051173', 'awnnnnnnnnn', 'lo', 'Nam Ho', 'Book 1-1', dt.datetime(2026, 10, 15, 8, 20), False, False, 'Remind onboarding'),
    ('3. Manager đã duyệt, chưa đặt 1-1', 'QB', 'QA Bone', '9930622', 'dwnnnnnnnnn', 'lo', 'QA Bone', 'Book 1-1', dt.datetime(2026, 10, 6, 1, 15), True, False, 'Remind onboarding'),
    ('4. Đã đặt lịch 1-1', 'MT', 'Mai Tran', '1873402', 'dwnnnnnnnnn', 'person', 'Thanh Pham', 'Meet 1-1 · Thu, Oct 23', dt.datetime(2026, 10, 15, 14, 10), False, False, 'Remind onboarding'),
    ('5. Xong 1-1, chờ trả phí', 'JP', 'James Park', '2045518', 'ddwnnnnnnnn', 'lo', 'James Park', 'Pay fee', dt.datetime(2026, 10, 9, 9, 12), True, False, 'Remind onboarding'),
    ('6. BYPASS duyệt + miễn phí, chờ ký', 'LN', 'Linh Nguyen', '1590277', 'adawnnnnnnn', 'lo', 'Linh Nguyen', 'Sign agreement', dt.datetime(2026, 10, 17, 11, 30), False, False, 'Remind onboarding'),
    ('7. Đã ký, chưa trả phí', 'RG', 'Rosa Garcia', '2210945', 'ddwdnnnnnnn', 'lo', 'Rosa Garcia', 'Pay fee', dt.datetime(2026, 10, 12, 16, 5), True, False, 'Remind onboarding'),
    ('8. Joined, thiếu thông tin cho HR', 'DK', 'David Kim', '1764320', 'ddddxnnnnnn', 'person', 'Thanh Pham', 'Add NMLS for HR', dt.datetime(2026, 10, 14, 15, 40), True, False, 'Remind onboarding'),
    ('9. Đã gửi HR, đang làm HR', 'AL', 'Anh Le', '2387716', 'ddddddwwwnn', 'team', 'HR', 'HR to-do, HR docs', dt.datetime(2026, 10, 16, 10, 0), False, False, 'Open'),
    ('10. Xong HR, chờ Licensing', 'TB', 'Tom Brown', '1932054', 'ddddddddwnn', 'team', 'Licensing', 'Sponsor license', dt.datetime(2026, 10, 13, 13, 20), True, False, 'Open'),
    ('11. Chờ đặt setup call', 'HV', 'Hoa Vo', '2104489', 'dddddddddwn', 'person', 'Thanh Pham', 'Book setup call', dt.datetime(2026, 10, 18, 8, 45), False, False, 'Remind onboarding'),
    ('12. Onboarded xong', 'SC', 'Sarah Chen', '1658830', 'adddddddddd', 'none', '', 'Onboarded', dt.datetime(2026, 10, 19, 15, 0), False, True, 'Open'),
    ('13. Manager không duyệt', 'PW', 'Peter White', '2299017', 'xnnnnnnnnnn', 'none', '', 'Not qualified', dt.datetime(2026, 10, 10, 17, 15), False, True, 'Edit & resend'),
    ('14. Lời mời hết hạn', 'KJ', 'Kevin Johnson', '1820476', 'dnnnnnnnnnn', 'none', '', 'Invite expired', dt.datetime(2026, 9, 30, 9, 0), False, True, 'Edit & resend'),
]

STROKE = {'n': '#e3ded6', 'd': '#2b8a3e', 'a': '#2b8a3e', 'w': '#e8590c', 'x': '#b91c1c'}
NAMES = ['Approval', '1-1', 'Fee', 'Signed', 'Sent to HR', 'HR account', 'HR to-do', 'HR docs', 'Licensing', 'Setup call', 'Onboarded']
WORD = {'n': 'Not started', 'd': 'Done', 'a': 'Auto', 'w': 'Waiting', 'x': 'Problem'}
AVATAR_TINTS = ['#dbeafe:#1e40af', '#dcfce7:#166534', '#fae8ff:#86198f', '#fef3c7:#92400e', '#e0e7ff:#3730a3', '#ffe4e6:#9f1239']


def tint(name):
    return AVATAR_TINTS[sum(map(ord, name)) % len(AVATAR_TINTS)].split(':')


rows = []
for i, (case, ini, name, nmls, st, kind, who, task, since, late, past, action) in enumerate(CASES):
    mins = (NOW - since).total_seconds() / 60
    line = humane(mins) + (' ago' if past else '')
    bg, fg = tint(who or 'x')
    r = {
        'case': case, 'ini': ini, 'name': name, 'nmls': nmls, 'action': action,
        'bg': '#fff8f3' if i == 0 else '#fff',
        'whoName': who or '—',
        'whoIni': ''.join(p[0] for p in who.split()[:2]).upper() if kind in ('person', 'lo') else '',
        'isTeam': kind == 'team', 'isPerson': kind in ('person', 'lo'), 'isNone': kind == 'none',
        'isLo': kind == 'lo',
        'avBg': bg, 'avFg': fg,
        'task': task, 'taskTone': '#b91c1c' if st[0] == 'x' else ('#6b655d' if kind == 'none' else '#1c1b1a'),
        'line': line, 'lineTone': '#b91c1c' if late else ('#6b655d' if past else '#1c1b1a'),
        'chip': chip(since),
        'chipBg': '#fdecec' if late else '#f1efec', 'chipFg': '#b91c1c' if late else '#4a4640',
        'chipBd': '#f5c2c2' if late else '#e3ded6',
        'doneN': str(sum(1 for s in st if s in 'da')),
        'tip': ' · '.join(f'{NAMES[k]}: {WORD[s]}' for k, s in enumerate(st)),
        'autoDash': None,
    }
    for k, s in enumerate(st):
        r[f's{k}'] = STROKE[s]
    rows.append(r)

SLOT = 2 * 3.14159265 * 20 / N
DASH = SLOT - 2.2
for r, c in zip(rows, CASES):
    r['autoDash'] = f'{DASH:.2f} 200' if c[4][0] == 'a' else '0 200'

arcs = ''.join(
    f'<circle cx="25" cy="25" r="20" fill="none" stroke="{{{{r.s{k}}}}}" stroke-width="5" '
    f'stroke-dasharray="{DASH:.2f} 200" transform="rotate({-90 + k * 360 / N + 3:.2f} 25 25)"></circle>'
    for k in range(N))
arcs += (f'<circle cx="25" cy="25" r="20" fill="none" stroke="#b2dfbc" stroke-width="2.4" '
         f'stroke-dasharray="{{{{r.autoDash}}}}" transform="rotate({-90 + 3:.2f} 25 25)"></circle>')

TEAM_ICON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4640" stroke-width="2" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"></circle>'
             '<path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"></path><path d="M16 5.2a3 3 0 0 1 0 5.6"></path>'
             '<path d="M18 14.3c1.7.6 2.8 2.2 3 4.7"></path></svg>')
CLOCK = ('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
         'aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path></svg>')

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My hand-offs – who, what, since</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#b4470a}}a:hover{{color:#8a3405}}
.row{{display:grid;grid-template-columns:{COLS};align-items:center;border-bottom:1px solid #f0ece6}}
.row>div{{padding:0 14px;box-sizing:border-box;min-width:0}}
.body-row{{height:64px;font-size:13px}}
.head{{height:40px;background:#faf8f5;border-bottom:1px solid #ebe6df;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b655d}}
.btn{{font:500 13px Inter,sans-serif;color:#2b2926;background:#fff;border:1.5px solid #d9d4cc;border-radius:8px;padding:6px 12px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.05);white-space:nowrap}}
.btn:hover{{border-color:#b9b2a7}}
.nmls{{display:block;font-size:12px;color:#6b655d;text-decoration:none}}
.nmls:hover{{color:#b4470a;text-decoration:underline}}
.one{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.case{{font-size:11.5px;line-height:1.35;color:#5b21b6;background:#f5f3ff}}
.av{{width:22px;height:22px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700}}
</style>
</helmet>
<div style="width: 1280px; height: {H}px; box-sizing: border-box; padding: 28px 32px; background: #f7f5f1; font-family: Inter, system-ui, sans-serif; color: #1c1b1a; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: center; gap: 12px">
<div style="width: 40px; height: 40px; border-radius: 10px; background: #fde8dc; display: flex; align-items: center; justify-content: center">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8590c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14L21 3"></path><path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3"></path></svg>
</div>
<h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em">My hand-offs</h1>
<span style="margin-left: 12px; font-size: 12px; color: #5b21b6; background: #f5f3ff; border-radius: 6px; padding: 4px 8px">Cột tím “Case” chỉ để giải thích. Đọc 1 dòng: [Loan Officer] đang chờ [ai] làm [việc gì], từ [khi nào].</span>
</div>
<div style="background: #fff; border: 1px solid #e6e1da; border-radius: 12px; overflow: hidden">
<div style="display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 16px; font-size: 12px; color: #4a4640; border-bottom: 1px solid #ebe6df">
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #2b8a3e; display: block"></i>Done</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 14px; height: 6px; border-radius: 2px; display: block; background: repeating-linear-gradient(135deg, #2b8a3e 0 2px, #b2dfbc 2px 4px)"></i>Auto (bypass)</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #e8590c; display: block"></i>Waiting</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #b91c1c; display: block"></i>Problem</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #d6d0c7; display: block"></i>Not started</span>
<span style="margin-left: auto; color: #6b655d">Vòng 11 cung theo chiều kim đồng hồ: Approval · 1-1 · Fee · Signed · Sent to HR · HR ×3 · Licensing · Setup call · Onboarded</span>
</div>
<div class="row head">
<div style="color: #5b21b6">Case</div>
<div>Loan Officer</div>
<div>Waiting on</div>
<div>To do</div>
<div>Since</div>
<div>Progress</div>
<div></div>
</div>
<sc-for list="{{{{rows}}}}" as="r" hint-placeholder-count="14">
<div class="row body-row" style="background: {{{{r.bg}}}}">
<div class="case" style="height: 64px; display: flex; align-items: center">{{{{r.case}}}}</div>
<div>
<div style="display: flex; align-items: center; gap: 10px; min-width: 0">
<div style="width: 30px; height: 30px; flex: none; border-radius: 50%; background: #fde8dc; color: #b4470a; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center">{{{{r.ini}}}}</div>
<div style="min-width: 0">
<button class="one" style="display: block; max-width: 100%; border: 0; background: none; padding: 0; font: 600 13px Inter, sans-serif; color: #1c1b1a; cursor: pointer; text-align: left">{{{{r.name}}}}</button>
<a class="nmls" href="https://www.nmlsconsumeraccess.org/">NMLS {{{{r.nmls}}}}</a>
</div>
</div>
</div>
<div>
<sc-if value="{{{{r.isPerson}}}}" hint-placeholder-val="{{{{true}}}}">
<span style="display: inline-flex; align-items: center; gap: 6px; max-width: 100%; font-size: 12.5px"><span class="av" style="background: {{{{r.avBg}}}}; color: {{{{r.avFg}}}}">{{{{r.whoIni}}}}</span><span class="one">{{{{r.whoName}}}}</span><sc-if value="{{{{r.isLo}}}}" hint-placeholder-val="{{{{false}}}}"><span style="flex: none; font-size: 10.5px; color: #6b655d; border: 1px solid #e3ded6; border-radius: 4px; padding: 0 4px">Loan Officer</span></sc-if></span>
</sc-if>
<sc-if value="{{{{r.isTeam}}}}" hint-placeholder-val="{{{{false}}}}">
<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px"><span class="av" style="background: #f1efec">{TEAM_ICON}</span><span class="one">{{{{r.whoName}}}}</span></span>
</sc-if>
<sc-if value="{{{{r.isNone}}}}" hint-placeholder-val="{{{{false}}}}"><span style="color: #8a847b">—</span></sc-if>
</div>
<div class="one" style="font-weight: 600; color: {{{{r.taskTone}}}}">{{{{r.task}}}}</div>
<div>
<span style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 3px">
<span style="font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums; color: {{{{r.lineTone}}}}">{{{{r.line}}}}</span>
<span style="display: inline-flex; align-items: center; gap: 4px; height: 22px; box-sizing: border-box; padding: 0 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; white-space: nowrap; background: {{{{r.chipBg}}}}; color: {{{{r.chipFg}}}}; border: 1px solid {{{{r.chipBd}}}}">{CLOCK}{{{{r.chip}}}}</span>
</span>
</div>
<div title="{{{{r.tip}}}}">
<div style="position: relative; width: 38px; height: 38px">
<svg width="38" height="38" viewBox="0 0 50 50" role="img" aria-label="{{{{r.tip}}}}">{arcs}</svg>
<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #1c1b1a">{{{{r.doneN}}}}</span>
</div>
</div>
<div style="text-align: right"><button class="btn">{{{{r.action}}}}</button></div>
</div>
</sc-for>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":{H}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{ rows: {json.dumps(rows, ensure_ascii=False).replace("'", "\\u0027")} }};
  }}
}}
</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'Ring.dc.html'), 'w').write(html)

c = json.load(open(os.path.join(ROOT, 'canvas.json')))
c['boards']['Ring.dc.html'].update({'h': H, 'title': 'Đề xuất v3: Loan Officer → chờ AI → làm GÌ → từ KHI NÀO · vòng tiến độ'})
c['boards']['Compact.dc.html']['title'] = 'Phương án A (không chọn)'
c['notes']['n4']['text'] = ('v3: cột Progress chỉ còn vòng 11 cung (rê chuột = chi tiết). Waiting on = người/nhóm (avatar + tên), '
                            'To do = việc đang chờ, Since = giống Pipeline/Hot (thời lượng + chip ngày giờ, đỏ khi trễ).')
json.dump(c, open(os.path.join(ROOT, 'canvas.json'), 'w'), ensure_ascii=False, indent=2)
