import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_ring_v2 import CASES, NAMES, NOW, ROOT, STROKE, WORD, chip, humane, tint  # noqa: E402  (re-running v2 is idempotent)

H = 1270
COLS = '92px 200px 160px 200px 160px 150px minmax(0,1fr)'
HR_SHOT = '/_blob/c2df3b989c46957da6624f7cecc1b262'
CIRC = 2 * math.pi * 20
N = 11
DASH = CIRC / N - 2.2

rows = []
for i, (case, ini, name, nmls, st, kind, who, task, since, late, past, action) in enumerate(CASES):
    done = sum(1 for s in st if s in 'da')
    pct = round(done * 100 / len(st))
    if 'x' in st:
        ring = '#b91c1c'
    elif pct == 100:
        ring = '#2b8a3e'
    elif 'w' in st:
        ring = '#e8590c'
    else:
        ring = '#c9c2b8'
    bg, fg = tint(who or 'x')
    rows.append({
        'case': case, 'ini': ini, 'name': name, 'nmls': nmls, 'action': action,
        'bg': '#fff',
        'pct': f'{pct}%', 'arc': f'{CIRC * pct / 100:.2f} 200', 'ring': ring,
        'whoName': who or '—',
        'whoIni': ''.join(p[0] for p in who.split()[:2]).upper() if kind in ('person', 'lo') else '',
        'isTeam': kind == 'team', 'isPerson': kind in ('person', 'lo'), 'isNone': kind == 'none', 'isLo': kind == 'lo',
        'avBg': bg, 'avFg': fg,
        'task': task, 'taskTone': '#b91c1c' if st[0] == 'x' else ('#6b655d' if kind == 'none' else '#1c1b1a'),
        'line': humane((NOW - since).total_seconds() / 60) + (' ago' if past else ''),
        'lineTone': '#b91c1c' if late else ('#6b655d' if past else '#1c1b1a'),
        'chip': chip(since),
        'chipBg': '#fdecec' if late else '#f1efec', 'chipFg': '#b91c1c' if late else '#4a4640',
        'chipBd': '#f5c2c2' if late else '#e3ded6',
        'tip': f'{pct}% · ' + ' · '.join(f'{NAMES[k]}: {WORD[x]}' for k, x in enumerate(st)),
        'autoDash': f'{DASH:.2f} 200' if st[0] == 'a' else '0 200',
        **{f's{k}': STROKE[x] for k, x in enumerate(st)},
    })

ARCS = ''.join(
    f'<circle cx="25" cy="25" r="20" fill="none" stroke="{{{{r.s{k}}}}}" stroke-width="5" '
    f'stroke-dasharray="{DASH:.2f} 200" transform="rotate({-90 + k * 360 / N + 3:.2f} 25 25)"></circle>'
    for k in range(N)) + (
    f'<circle cx="25" cy="25" r="20" fill="none" stroke="#b2dfbc" stroke-width="2.4" '
    f'stroke-dasharray="{{{{r.autoDash}}}}" transform="rotate({-90 + 3:.2f} 25 25)"></circle>')

LEGEND = '''<div style="display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 16px; font-size: 12px; color: #4a4640; border-bottom: 1px solid #ebe6df">
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #2b8a3e; display: block"></i>Done</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 14px; height: 6px; border-radius: 2px; display: block; background: repeating-linear-gradient(135deg, #2b8a3e 0 2px, #b2dfbc 2px 4px)"></i>Auto (bypass)</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #e8590c; display: block"></i>Waiting</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #b91c1c; display: block"></i>Problem</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #d6d0c7; display: block"></i>Not started</span>
</div>'''

rows = rows[:13]
STATUS = ['Waiting approval'] + ['1-1 pending'] * 3 + ['Paying &amp; signing'.replace('&amp;', '&')] * 3 + ['Joined'] * 5 + ['Not qualified']
TONES = {'Waiting approval': ('#fef3c7', '#92400e'), '1-1 pending': ('#e0ecff', '#1e40af'), 'Paying & signing': ('#fde8dc', '#9a3412'),
         'Joined': ('#dcfce7', '#166534'), 'Not qualified': ('#fdecec', '#b91c1c')}
for r, label in zip(rows, STATUS):
    r['status'] = label
    r['stBg'], r['stFg'] = TONES[label]
    r['statusBy'] = ''
    r['isStack'] = False
for r in rows[11:]:
    r['task'] = '—'
    r['taskTone'] = '#8a847b'
# Approval waits on every user with OFFER_APPROVE (recruit-be remindApprover): show them, not a team name.
rows[0].update({'isTeam': False, 'isPerson': True, 'isLo': False, 'isStack': False, 'whoName': 'Victoria Pham',
                'a1': '', 'a2': '', 'a3': ''})
for r in rows[1:]:
    r.update({'a1': '', 'a2': '', 'a3': ''})
rows[12]['statusBy'] = 'by Victoria Pham'
# BOOK_1ON1 is the onboarding specialist's task (recruit-be OnboardingTask), not the loan officer's.
ob_bg, ob_fg = tint('Thanh Pham')
for r in rows[1:3]:
    r.update({'isPerson': True, 'isLo': False, 'isTeam': False, 'whoName': 'Thanh Pham', 'whoIni': 'TP',
              'avBg': ob_bg, 'avFg': ob_fg})
# Paying / signing waits on the loan officer: Remind onboarding is refused there (only 1-1 pending), so Open.
for r in rows[4:7]:
    r['action'] = 'Open'
for r in rows:
    r['isEmp'] = bool(r.get('isPerson')) and not r.get('isLo')

PHOTO = ('<span class="av" style="background: linear-gradient(160deg, #c7b8a6, #8c7a66); overflow: hidden; align-items: flex-end" title="Profile photo">'
         '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="8.5" r="4" fill="#f3e9df"></circle>'
         '<path d="M3 22c.8-4.6 4-7 8-7s7.2 2.4 8 7z" fill="#f3e9df"></path></svg></span>')

TEAM_ICON = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4640" stroke-width="2" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"></circle>'
             '<path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"></path><path d="M16 5.2a3 3 0 0 1 0 5.6"></path>'
             '<path d="M18 14.3c1.7.6 2.8 2.2 3 4.7"></path></svg>')
CLOCK = ('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
         'aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path></svg>')
CHEV = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        'aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>')
SORT = ('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
        'aria-hidden="true"><path d="M8 9l4-4 4 4M8 15l4 4 4-4"></path></svg>')
SORT_DOWN = ('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
             'aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"></path></svg>')
CAL = ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
       'aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4M16 3v4M4 10h16"></path></svg>')

CARDS = [('All', '21', True), ('In progress', '11', False), ('Waiting approval', '2', False), ('1-1 pending', '7', False),
         ('Paying &amp; signing', '2', False), ('Joined', '9', False), ('Not qualified', '1', False)]
cards = ''.join(
    f'<button style="text-align: left; font: inherit; cursor: pointer; background: {"#fff4ee" if on else "#fff"}; '
    f'border: {"1.5px solid #f2a57a" if on else "1px solid #e6e1da"}; border-radius: 12px; padding: 10px 12px">'
    f'<div style="font-size: 12px; color: #6b655d">{label}</div>'
    f'<div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: #1c1b1a">{n}</div></button>'
    for label, n, on in CARDS)


def dropdown(label, value):
    return (f'<button class="ctl"><span style="color: #6b655d">{label}:</span> <b style="font-weight: 600">{value}</b>{CHEV}</button>')


def th(label, mode=''):
    icon = SORT_DOWN if mode == 'on' else (SORT if mode == 'can' else '')
    color = '#b4470a' if mode == 'on' else '#6b655d'
    if not icon:
        return f'<div>{label}</div>'
    return (f'<div><button style="display: inline-flex; align-items: center; gap: 4px; border: 0; background: none; padding: 0; '
            f'font: inherit; letter-spacing: inherit; text-transform: inherit; color: {color}; cursor: pointer">{label}{icon}</button></div>')


html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My hand-offs – v4</title>
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
.ctl{{display:inline-flex;align-items:center;gap:6px;height:36px;box-sizing:border-box;padding:0 10px 0 12px;background:#fff;border:1px solid #ddd7cf;border-radius:8px;font:13px Inter,sans-serif;color:#1c1b1a;cursor:pointer;white-space:nowrap}}
.ctl:hover{{border-color:#b9b2a7}}
.nmls{{display:block;font-size:12px;color:#6b655d;text-decoration:none}}
.nmls:hover{{color:#b4470a;text-decoration:underline}}
.one{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.av{{width:22px;height:22px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700}}
</style>
</helmet>
<div style="width: 1280px; height: {H}px; box-sizing: border-box; padding: 28px 32px; background: #f7f5f1; font-family: Inter, system-ui, sans-serif; color: #1c1b1a; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: center; gap: 12px">
<div style="width: 40px; height: 40px; border-radius: 10px; background: #fde8dc; display: flex; align-items: center; justify-content: center">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8590c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14L21 3"></path><path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3"></path></svg>
</div>
<h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em">My hand-offs</h1>
</div>

<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px">{cards}</div>

<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
<label style="display: flex; align-items: center; gap: 8px; width: 260px; height: 36px; box-sizing: border-box; padding: 0 12px; background: #fff; border: 1px solid #ddd7cf; border-radius: 8px">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7a746c" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<input placeholder="Search name or NMLS" style="border: 0; outline: 0; font: 13px Inter, sans-serif; width: 100%; background: transparent" aria-label="Search name or NMLS">
</label>
<span style="display: inline-flex; align-items: center; height: 36px; box-sizing: border-box; background: #fff; border: 1px solid #ddd7cf; border-radius: 8px">
<button aria-label="Earlier" style="height: 34px; width: 32px; border: 0; background: none; cursor: pointer; color: #4a4640">‹</button>
<button style="display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; border: 0; border-radius: 6px; background: #f4f1ec; font: 600 13px Inter, sans-serif; color: #1c1b1a; cursor: pointer">{CAL}Last 30 days{CHEV}</button>
<button aria-label="Later" style="height: 34px; width: 32px; border: 0; background: none; cursor: pointer; color: #4a4640">›</button>
</span>
{dropdown('Waiting on', 'Anyone')}
{dropdown('To do', 'Any step')}
<label class="ctl" style="gap: 8px"><input type="checkbox" style="margin: 0; accent-color: #e8590c">Late only</label>
<span style="margin-left: auto; font-size: 12.5px; color: #6b655d">20 rows</span>
</div>

<div style="background: #fff; border: 1px solid #e6e1da; border-radius: 12px; overflow: hidden">
{LEGEND}
<div class="row head">
{th('Progress', 'can')}
{th('Loan Officer', 'can')}
{th('Status', 'can')}
{th('Waiting on', 'can')}
<div>To do</div>
{th('Waiting for', 'on')}
<div></div>
</div>
<sc-for list="{{{{rows}}}}" as="r" hint-placeholder-count="14">
<div class="row body-row" style="background: {{{{r.bg}}}}">
<div title="{{{{r.tip}}}}">
<div style="position: relative; width: 40px; height: 40px">
<svg width="40" height="40" viewBox="0 0 50 50" role="img" aria-label="{{{{r.tip}}}}">{ARCS}</svg>
<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #1c1b1a">{{{{r.pct}}}}</span>
</div>
</div>
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
<span style="display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; background: {{{{r.stBg}}}}; color: {{{{r.stFg}}}}">{{{{r.status}}}}</span>
<sc-if value="{{{{r.statusBy}}}}" hint-placeholder-val="{{{{false}}}}"><div style="font-size: 11.5px; color: #6b655d; margin-top: 3px">{{{{r.statusBy}}}}</div></sc-if>
</div>
<div>
<sc-if value="{{{{r.isStack}}}}" hint-placeholder-val="{{{{false}}}}">
<span style="display: inline-flex; align-items: center; gap: 6px; max-width: 100%; font-size: 12.5px"><span style="display: inline-flex; flex: none">{PHOTO}<span style="margin-left: -6px; display: inline-flex">{PHOTO}</span><span class="av" style="background: #f1efec; color: #4a4640; margin-left: -6px; box-shadow: 0 0 0 2px #fff">{{{{r.a3}}}}</span></span><span class="one">{{{{r.whoName}}}}</span></span>
</sc-if>
<sc-if value="{{{{r.isPerson}}}}" hint-placeholder-val="{{{{true}}}}">
<span style="display: inline-flex; align-items: center; gap: 6px; max-width: 100%; font-size: 12.5px"><sc-if value="{{{{r.isLo}}}}" hint-placeholder-val="{{{{false}}}}"><span class="av" style="background: {{{{r.avBg}}}}; color: {{{{r.avFg}}}}">{{{{r.whoIni}}}}</span></sc-if><sc-if value="{{{{r.isEmp}}}}" hint-placeholder-val="{{{{false}}}}">{PHOTO}</sc-if><span class="one">{{{{r.whoName}}}}</span></span>
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
open(os.path.join(ROOT, 'V4.dc.html'), 'w').write(html)

ref = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HR app date range</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet><style>body{{margin:0}}</style></helmet>
<div style="width: 1440px; height: 900px; background: #fff">
<img src="{HR_SHOT}" alt="HR app, Attendance report: the period picker open, presets on the left and two months" style="display: block; width: 1440px; height: 900px">
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":900}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'RefHR.dc.html'), 'w').write(ref)

c = json.load(open(os.path.join(ROOT, 'canvas.json')))
c['boards']['V4.dc.html'] = {'x': 0, 'y': 2560, 'w': 1280, 'h': H,
                             'title': 'Đề xuất v4: All + sort/filter + % + Progress đầu bảng'}
c['boards']['RefHR.dc.html'] = {'x': 1360, 'y': 2560, 'w': 1440, 'h': 900,
                                'title': 'Tham khảo: HR app (staging) – Attendance › Report, bộ chọn kỳ'}
for k in ('V4.dc.html', 'RefHR.dc.html'):
    if k not in c['order']:
        c['order'].append(k)
c['notes']['n5'] = {'x': 2880, 'y': 2560, 'w': 320, 'fill': 'purple',
                    'text': 'v4: thẻ All mới (mặc định), bỏ chú thích "Waiting longest first…". Vòng = 11 cung theo màu từng bước + % ở giữa. '
                            'Bộ chọn ngày theo HR app: ‹ [Last 30 days ▾] › + preset bên trái, 2 tháng. '
                            'Lọc: Waiting on, To do, Late only. Sort: bấm tiêu đề cột (mặc định Waiting for, lâu nhất trước).'}
json.dump(c, open(os.path.join(ROOT, 'canvas.json'), 'w'), ensure_ascii=False, indent=2)
