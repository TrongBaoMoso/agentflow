"""V5 boards: My hand-offs replaces Team queue (OB actions; Manager Mine|Team|Needs owner)."""
import sys, os
ROOT = sys.argv[1]  # folder holding project/

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
a{color:#b4470a}a:hover{color:#8a3405}
.row{display:grid;grid-template-columns:86px 200px 150px 190px 160px 180px minmax(0,1fr);align-items:center;border-bottom:1px solid #f0ece6}
.row>div{padding:0 12px;box-sizing:border-box;min-width:0}
.body-row{min-height:66px;font-size:13px;padding:8px 0}
.head{height:40px;background:#faf8f5;border-bottom:1px solid #ebe6df;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b655d}
.btn{font:500 12.5px Inter,sans-serif;color:#2b2926;background:#fff;border:1.5px solid #d9d4cc;border-radius:8px;padding:5px 11px;cursor:pointer;white-space:nowrap}
.btn:hover{border-color:#b9b2a7}
.pri{background:#d9480f;border-color:#d9480f;color:#fff}
.pri:hover{background:#b8400d;border-color:#b8400d}
.ico{width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #f2c7ad;background:#fff4ee;border-radius:8px;cursor:pointer;color:#c2410c}
.ctl{display:inline-flex;align-items:center;gap:6px;height:36px;box-sizing:border-box;padding:0 10px 0 12px;background:#fff;border:1px solid #ddd7cf;border-radius:8px;font:13px Inter,sans-serif;color:#1c1b1a;cursor:pointer;white-space:nowrap}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:500;border-radius:6px;padding:2px 8px;white-space:nowrap}
.role{font-size:10.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#8a847c}
.who{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:13px;color:#1c1b1a}
.av{width:20px;height:20px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;background:#fde8dc;color:#b4470a;border:1px solid #f6c9ad}
.lav{width:30px;height:30px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#fdeee4;color:#b4470a;border:1px solid #f6c9ad}
.late{color:#c92a2a;font-weight:600;font-size:12.5px}
.tchip{display:inline-flex;align-items:center;gap:5px;margin-top:3px;font-size:12px;border-radius:6px;padding:2px 8px;border:1px solid #f1b7b7;background:#fff1f1;color:#c92a2a}
.tchip.ok{border-color:#e3ded6;background:#f6f4f0;color:#5c5750}
.sub{font-size:11.5px;color:#7a746c;margin-top:2px}
.seg{display:inline-flex;background:#efebe5;border-radius:9px;padding:3px;gap:2px}
.seg button{font:500 13px Inter,sans-serif;border:0;border-radius:7px;padding:6px 14px;background:transparent;color:#4a4640;cursor:pointer}
.seg button.on{background:#fff;color:#1c1b1a;box-shadow:0 1px 2px rgba(0,0,0,.08);font-weight:600}
.ring{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
</style>
</helmet>
'''

CONV = '<button class="ico" aria-label="Open conversation"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5h11v8H8l-4 3z"></path><path d="M9 16h7l4 3v-8h-3"></path></svg></button>'

def ring(pct, color='#e8590c'):
    return (f'<div class="ring" style="background: conic-gradient({color} 0 {pct}%, #e9e5df {pct}% 100%)">'
            f'<div style="width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center">{pct}%</div></div>')

STATUS = {
    'appr': ('Waiting approval', '#fff6db', '#8a6100'),
    '1on1': ('1-1 pending', '#e7f0ff', '#1c4fb8'),
    'pay': ('Paying &amp; signing', '#fff0e6', '#b4470a'),
    'joined': ('Joined', '#e6f6ea', '#1f7a35'),
}

def status(k, extra=''):
    t, bg, fg = STATUS[k]
    return f'<span class="chip" style="background: {bg}; color: {fg}"><i style="width: 6px; height: 6px; border-radius: 50%; background: {fg}; display: block"></i>{t}</span>{extra}'

def who(role, name=None, ini=None, plain=None):
    s = f'<div class="role">{role}</div>'
    if name:
        s += f'<div class="who"><span class="av">{ini}</span><span>{name}</span></div>'
    elif plain:
        s += f'<div class="who" style="color: #8a847c">{plain}</div>'
    return s

def row(pct, ini, name, nmls, st, waiting, todo, waitfor, actions, ringcolor='#e8590c'):
    return (f'<div class="row body-row">'
            f'<div>{ring(pct, ringcolor)}</div>'
            f'<div style="display: flex; align-items: center; gap: 10px"><span class="lav">{ini}</span><div style="min-width: 0"><div style="font-weight: 600">{name}</div><div class="sub">NMLS {nmls}</div></div></div>'
            f'<div>{st}</div><div>{waiting}</div><div>{todo}</div><div>{waitfor}</div>'
            f'<div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; flex-wrap: wrap">{actions}{CONV}</div></div>')

def todo(t, sub=None):
    return f'<div style="font-weight: 600">{t}</div>' + (f'<div class="sub">{sub}</div>' if sub else '')

def wf(dur, date, late=True):
    if late:
        return f'<div class="late">Late · {dur}</div><span class="tchip">{date}</span>'
    return f'<div style="font-size: 12.5px; font-weight: 600">{dur}</div><span class="tchip ok">{date}</span>'

HEADROW = ('<div class="row head"><div>Progress</div><div>Loan Officer</div><div>Status</div><div>Waiting on</div>'
           '<div>To do</div><div>Waiting for ↓</div><div></div></div>')

def cards(vals):
    out = '<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px">'
    for i, (lab, n) in enumerate(vals):
        on = i == 0
        style = ('background: #fff4ee; border: 1.5px solid #f2a57a' if on else 'background: #fff; border: 1px solid #e6e1da')
        out += (f'<button style="text-align: left; font: inherit; cursor: pointer; {style}; border-radius: 12px; padding: 10px 12px">'
                f'<div style="font-size: 12px; color: #6b655d">{lab}</div><div style="font-size: 22px; font-weight: 700; margin-top: 4px">{n}</div></button>')
    return out + '</div>'

def toolbar(seg=None, count='8 rows', extra=''):
    s = '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">'
    if seg:
        s += '<div class="seg" role="tablist">' + ''.join(
            f'<button class="{"on" if on else ""}" role="tab">{lab}</button>' for lab, on in seg) + '</div>'
    s += ('<label style="display: flex; align-items: center; gap: 8px; width: 220px; height: 36px; box-sizing: border-box; padding: 0 12px; background: #fff; border: 1px solid #ddd7cf; border-radius: 8px">'
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7a746c" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>'
          '<input placeholder="Search name or NMLS" aria-label="Search name or NMLS" style="border: 0; outline: 0; font: 13px Inter, sans-serif; width: 100%; background: transparent"></label>'
          '<button class="ctl"><span style="color: #6b655d">‹</span> Last 30 days ▾ <span style="color: #6b655d">›</span></button>'
          f'{extra}'
          '<button class="ctl"><span style="color: #6b655d">Waiting on:</span> <b style="font-weight: 600">Anyone</b> ▾</button>'
          '<button class="ctl"><span style="color: #6b655d">To do:</span> <b style="font-weight: 600">Any step</b> ▾</button>'
          '<button class="ctl">Late only</button>'
          '<button class="ctl" style="color: #9a948b" disabled>Reset filters</button>'
          f'<span style="margin-left: auto; font-size: 12.5px; color: #6b655d">{count}</span>'
          '<button class="ctl" aria-label="Saved views" style="padding: 0 9px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"></path></svg></button>'
          '<span style="display: inline-flex; gap: 2px"><button class="ctl" aria-label="Table view" style="padding: 0 9px; border-color: #f2a57a; background: #fff4ee; color: #c2410c"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg></button>'
          '<button class="ctl" aria-label="Cards view" style="padding: 0 9px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg></button></span>'
          '<button class="ctl" aria-label="Refresh" style="padding: 0 9px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path></svg></button></div>')
    return s

def page(title, h, header_note, segment, extra_filter, card_vals, rows, file):
    body = (f'<div style="width: 1280px; height: {h}px; box-sizing: border-box; padding: 28px 32px; background: #f7f5f1; font-family: Inter, system-ui, sans-serif; color: #1c1b1a; display: flex; flex-direction: column; gap: 16px">'
            '<div style="display: flex; align-items: center; gap: 12px"><div style="width: 40px; height: 40px; border-radius: 10px; background: #fde8dc; display: flex; align-items: center; justify-content: center">'
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8590c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14L21 3"></path><path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3"></path></svg></div>'
            '<h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em">My hand-offs</h1>'
            f'<span style="margin-left: 8px; font-size: 13px; color: #6b655d">{header_note}</span></div>'
            + cards(card_vals) + toolbar(segment, f'{len(rows)} rows', extra_filter)
            + '<div style="background: #fff; border: 1px solid #e6e1da; border-radius: 12px; overflow: hidden">' + HEADROW + ''.join(rows) + '</div>' + ('<div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #6b655d"><span>Rows per page <button class="ctl" style="margin-left: 6px">25 ▾</button></span>' f'<span>Page 1 of 1 · {len(rows)} total</span></div>') + '</div>')
    html = HEAD.replace("{title}", title) + body + ('\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":1280,"height":%d}}\'>\n'
            'class Component extends DCLogic {\n  renderVals() { return {}; }\n}\n</script>\n</body>\n</html>\n') % h
    os.makedirs(os.path.join(ROOT, 'project'), exist_ok=True)
    open(os.path.join(ROOT, 'project', file), 'w').write(html)

P, S = 'class="btn pri"', 'class="btn"'
def b(label, primary=False): return f'<button {P if primary else S}>{label}</button>'

# 1) OB view
ob_rows = [
    row(9, 'QB', 'QA Bfive', '9930626', status('1on1'), who('Onboarding', plain='You'), todo('Mark 1-1 done', 'Met Wed, Oct 7'), wf('2w 1d', 'Wed, Oct 7 · 3:30pm'), b('Mark done', True) + b('Reschedule')),
    row(9, 'QC', 'QA Cadvisor', '9931823', status('1on1'), who('Onboarding', plain='You'), todo('Book 1-1'), wf('2w', 'Wed, Oct 7 · 11:15pm'), b('Schedule 1-1', True)),
    row(9, 'RV', 'Ro Vidi', '2568229', status('1on1'), who('Onboarding', plain='You'), todo('Meet 1-1', 'Fri, Oct 23 · 10:00am'), wf('2w 2d', 'Tue, Oct 6 · 4:03pm', late=False), b('Reschedule')),
    row(18, 'QA', 'QA Autob', '9930612', status('1on1', '<div class="sub" style="color: #c92a2a">Not sent to MOSO</div>'), who('Onboarding', plain='You'), todo('Mark 1-1 done', 'Met Fri, Oct 16'), wf('6d 11h', 'Fri, Oct 16 · 10:30am'), b('Send again', True)),
    row(73, 'QL', 'QA Lautosent', '9931859', status('joined'), who('Onboarding', plain='You'), todo('Fix details for HR', 'Missing: SSN, address'), wf('3d 2h', 'Mon, Oct 19 · 9:12am'), b('Fix details', True)),
    row(82, 'QC', 'QA Claudeself', '9931867', status('joined'), who('Recruiter', 'Bao Trinh', 'BT'), todo('Book setup call'), wf('2d 4h', 'Tue, Oct 20 · 2:40pm', late=False), b('Book setup call')),
    row(18, 'CT', 'Chowfi Toni', '34555', status('pay'), who('Loan Officer'), todo('Pay fee'), wf('2w 2d', 'Tue, Oct 6 · 4:04pm'), ''),
    row(100, 'QT', 'QA Tenmain', '9931202', status('joined'), '<span style="color: #8a847c">—</span>', '<span style="color: #8a847c">—</span>', wf('10d ago', 'Mon, Oct 12', late=False), '', '#2b8a3e'),
]
page('My hand-offs – OB with actions', 920, 'Onboarding specialist · replaces Team queue', None, '',
     [('All', 37), ('In progress', 22), ('Waiting approval', 1), ('1-1 pending', 18), ('Paying &amp; signing', 3), ('Joined', 15), ('Not qualified', 0)], ob_rows, 'V5Ob.dc.html')

# 2) Manager — Team
team_rows = [
    row(9, 'QB', 'QA Bfive', '9930626', status('1on1'), who('Onboarding', 'Thanh Pham', 'TP'), todo('Mark 1-1 done', 'Met Wed, Oct 7'), wf('2w 1d', 'Wed, Oct 7 · 3:30pm'), b('Mark done')),
    row(9, 'QC', 'QA Cadvisor', '9931823', status('1on1'), who('Onboarding', 'ONB Test Specialist', 'OL'), todo('Book 1-1'), wf('2w', 'Wed, Oct 7 · 11:15pm'), b('Schedule 1-1')),
    row(0, 'QA', 'QA AnewL', '9930243', status('appr'), who('Manager', 'Victoria Pham', 'VP'), todo('Review offer'), wf('2w 6d', 'Fri, Oct 2 · 12:37am'), b('Review', True)),
    row(18, 'CT', 'Chowfi Toni', '34555', status('pay'), who('Loan Officer'), todo('Pay fee'), wf('2w 2d', 'Tue, Oct 6 · 4:04pm'), ''),
    row(45, 'ES', 'E2E Stranger0929', '9290929', status('joined'), who('HR'), todo('Create HR account'), wf('3w 2d', 'Tue, Sep 29 · 2:50am'), ''),
    row(82, 'QC', 'QA Claudeself', '9931867', status('joined'), who('Recruiter', 'Manh Admin', 'MA'), todo('Book setup call'), wf('2d 4h', 'Tue, Oct 20 · 2:40pm', late=False), ''),
]
page('My hand-offs – Manager · Team', 820, 'Manager view', [('Mine', False), ('Team', True), ('Needs owner', False)],
     '<button class="ctl"><span style="color: #6b655d">Onboarding:</span> <b style="font-weight: 600">Anyone</b> ▾</button>',
     [('All', 88), ('In progress', 61), ('Waiting approval', 6), ('1-1 pending', 41), ('Paying &amp; signing', 9), ('Joined', 27), ('Not qualified', 5)], team_rows, 'V5Team.dc.html')

# 3) Manager — Needs owner
need_rows = [
    row(9, 'NS', 'Nesebis', '785746', status('1on1'), who('Onboarding', plain='Not assigned'), todo('Assign onboarding'), wf('2w 6d', 'Fri, Oct 2 · 12:02pm'), b('Assign', True)),
    row(9, 'XO', 'Xomaxo', '2568229', status('1on1'), who('Onboarding', plain='Not assigned'), todo('Assign onboarding'), wf('2w 3d', 'Mon, Oct 5 · 2:05pm'), b('Assign', True)),
    row(9, 'QE', 'QA Ejoin', '9931833', status('1on1'), who('Onboarding', plain='Not assigned'), todo('Assign onboarding'), wf('2w', 'Thu, Oct 8 · 12:42pm'), b('Assign', True)),
]
page('My hand-offs – Manager · Needs owner', 620, 'Manager view · invites with no onboarding specialist', [('Mine', False), ('Team', False), ('Needs owner', True)], '',
     [('All', 3), ('In progress', 3), ('Waiting approval', 0), ('1-1 pending', 3), ('Paying &amp; signing', 0), ('Joined', 0), ('Not qualified', 0)], need_rows, 'V5Need.dc.html')
print('ok')
