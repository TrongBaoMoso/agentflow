import json
import os

ROOT = '/private/tmp/claude-501/-Users-apple-Projects-agentflow/c12550de-9243-4e84-9349-1425380eabcd/scratchpad/artifact-files/0fe4cd9c-6fc9-48ec-99f8-a3976b312825/project'
H = 1260
N = 11
COLS = '170px 210px 210px 200px 170px minmax(0,1fr)'
GROUP_START = (4, 8, 9)  # Before joining 0-3 | HR 4-7 | Licensing 8 | Onboarding 9-10

LEGEND = '''<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #2b8a3e; display: block"></i>Done</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 14px; height: 6px; border-radius: 2px; display: block; background: repeating-linear-gradient(135deg, #2b8a3e 0 2px, #b2dfbc 2px 4px)"></i>Auto (bypass)</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #e8590c; display: block"></i>Waiting</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #b91c1c; display: block"></i>Problem</span>
<span style="display: flex; align-items: center; gap: 6px"><i style="width: 8px; height: 8px; border-radius: 50%; background: #d6d0c7; display: block"></i>Not started</span>'''

JS = r'''
class Component extends DCLogic {
  renderVals() {
    const FILL = { n: '#e3ded6', d: '#2b8a3e', a: 'repeating-linear-gradient(135deg, #2b8a3e 0 2px, #b2dfbc 2px 4px)', w: '#e8590c', x: '#b91c1c' };
    const STROKE = { n: '#e3ded6', d: '#2b8a3e', a: '#2b8a3e', w: '#e8590c', x: '#b91c1c' };
    const NAMES = ['Approval', '1-1', 'Fee', 'Signed', 'Sent to HR', 'HR account', 'HR to-do', 'HR docs', 'Licensing', 'Setup call', 'Onboarded'];
    const WORD = { n: 'Not started', d: 'Done', a: 'Auto', w: 'Waiting', x: 'Problem' };
    const grey = '#6b655d', orange = '#c2410c', red = '#b91c1c', green = '#2b8a3e';
    const row = (r, i) => {
      const st = r.states.split('');
      const out = { ...r, bg: i === 0 ? '#fff8f3' : '#fff', ageTone: r.late === false ? grey : red,
        doneN: String(st.filter((s) => s === 'd' || s === 'a').length),
        tip: st.map((s, k) => NAMES[k] + ': ' + WORD[s]).join(' · ') };
      st.forEach((s, k) => {
        out['f' + k] = FILL[s];
        out['s' + k] = STROKE[s];
      });
      return out;
    };
    const R = [
      { case: '1. Chờ manager duyệt', ini: 'QA', name: 'QA AnewL', nmls: '9930243', states: 'wnnnnnnnnnn', label: 'Approval · Waiting', tone: orange, who: 'Manager', what: 'Approve invite', since: 'Oct 1, 10:37 AM PT', age: '18 days', action: 'Remind manager' },
      { case: '2. BYPASS: tự duyệt (đủ số loans), chưa đặt 1-1', ini: 'NH', name: 'Nam Ho', nmls: '2051173', states: 'awnnnnnnnnn', label: '1-1 · Waiting', tone: orange, who: 'Nam', what: 'Book 1-1', since: 'Oct 15, 8:20 AM PT', age: '5 days', late: false, action: 'Remind onboarding' },
      { case: '3. Manager đã duyệt, chưa đặt 1-1', ini: 'QB', name: 'QA Bone', nmls: '9930622', states: 'dwnnnnnnnnn', label: '1-1 · Waiting', tone: orange, who: 'QA', what: 'Book 1-1', since: 'Oct 6, 1:15 AM PT', age: '14 days', action: 'Remind onboarding' },
      { case: '4. Đã đặt lịch 1-1', ini: 'MT', name: 'Mai Tran', nmls: '1873402', states: 'dwnnnnnnnnn', label: '1-1 · Oct 23, 9:00 AM', tone: orange, who: 'ONB Test', what: '1-1 on Oct 23', since: 'Oct 15, 2:10 PM PT', age: '5 days', late: false, action: 'Remind onboarding' },
      { case: '5. Xong 1-1, chờ trả phí', ini: 'JP', name: 'James Park', nmls: '2045518', states: 'ddwnnnnnnnn', label: 'Fee · Waiting', tone: orange, who: 'James', what: 'Pay fee', since: 'Oct 9, 9:12 AM PT', age: '11 days', action: 'Remind onboarding' },
      { case: '6. BYPASS duyệt + được miễn phí, chờ ký', ini: 'LN', name: 'Linh Nguyen', nmls: '1590277', states: 'adawnnnnnnn', label: 'Signing · Waiting', tone: orange, who: 'Linh', what: 'Sign', since: 'Oct 17, 11:30 AM PT', age: '3 days', late: false, action: 'Remind onboarding' },
      { case: '7. Đã ký, chưa trả phí', ini: 'RG', name: 'Rosa Garcia', nmls: '2210945', states: 'ddwdnnnnnnn', label: 'Fee · Waiting (signed)', tone: orange, who: 'Rosa', what: 'Pay fee', since: 'Oct 12, 4:05 PM PT', age: '8 days', action: 'Remind onboarding' },
      { case: '8. Joined, thiếu thông tin cho HR', ini: 'DK', name: 'David Kim', nmls: '1764320', states: 'ddddxnnnnnn', label: 'Missing for HR', tone: red, who: 'ONB Test', what: 'Missing for HR: NMLS', since: 'Oct 14, 3:40 PM PT', age: '6 days', action: 'Remind onboarding' },
      { case: '9. Đã gửi HR, đang làm HR', ini: 'AL', name: 'Anh Le', nmls: '2387716', states: 'ddddddwwwnn', label: 'HR to-do · Waiting', tone: orange, who: 'HR', what: 'HR to-do', since: 'Oct 16, 10:00 AM PT', age: '4 days', late: false, action: 'Open' },
      { case: '10. Xong HR, chờ Licensing', ini: 'TB', name: 'Tom Brown', nmls: '1932054', states: 'ddddddddwnn', label: 'Licensing · Waiting', tone: orange, who: 'Licensing', what: 'Sponsor', since: 'Oct 13, 1:20 PM PT', age: '7 days', action: 'Open' },
      { case: '11. Chờ đặt setup call', ini: 'HV', name: 'Hoa Vo', nmls: '2104489', states: 'dddddddddwn', label: 'Setup call · Waiting', tone: orange, who: 'ONB Test', what: 'Book setup call', since: 'Oct 18, 8:45 AM PT', age: '2 days', late: false, action: 'Remind onboarding' },
      { case: '12. Onboarded xong (đã bypass duyệt)', ini: 'SC', name: 'Sarah Chen', nmls: '1658830', states: 'adddddddddd', label: 'Onboarded', tone: green, who: 'Done', what: '—', since: 'Oct 19, 3:00 PM PT', age: '1 day', late: false, action: 'Open' },
      { case: '13. Manager không duyệt', ini: 'PW', name: 'Peter White', nmls: '2299017', states: 'xnnnnnnnnnn', label: 'Not qualified', tone: red, who: '—', what: 'Declined by Manager A', since: 'Oct 10, 5:15 PM PT', age: '10 days', late: false, action: 'Edit & resend' },
      { case: '14. Lời mời hết hạn (đã duyệt, Loan Officer không làm gì)', ini: 'KJ', name: 'Kevin Johnson', nmls: '1820476', states: 'dnnnnnnnnnn', label: 'Expired', tone: grey, who: '—', what: '', since: 'Sep 30, 9:00 AM PT', age: '21 days', late: false, action: 'Edit & resend' }
    ];
    return { rows: R.map(row) };
  }
}
'''


def page(title, cell, note):
    return f'''<!doctype html>
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
.sg{{display:block;width:10px;height:5px;border-radius:2px}}
</style>
</helmet>
<div style="width: 1280px; height: {H}px; box-sizing: border-box; padding: 28px 32px; background: #f7f5f1; font-family: Inter, system-ui, sans-serif; color: #1c1b1a; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; align-items: center; gap: 12px">
<div style="width: 40px; height: 40px; border-radius: 10px; background: #fde8dc; display: flex; align-items: center; justify-content: center">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8590c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14L21 3"></path><path d="M21 3l-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3"></path></svg>
</div>
<h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em">My hand-offs</h1>
<span style="margin-left: 12px; font-size: 12px; color: #5b21b6; background: #f5f3ff; border-radius: 6px; padding: 4px 8px">{note}</span>
</div>
<div style="background: #fff; border: 1px solid #e6e1da; border-radius: 12px; overflow: hidden">
<div style="display: flex; flex-wrap: wrap; gap: 16px; padding: 10px 16px; font-size: 12px; color: #4a4640; border-bottom: 1px solid #ebe6df">
{LEGEND}
<span style="margin-left: auto; color: #6b655d">11 bước: Approval · 1-1 · Fee · Signed | Sent to HR · HR account · HR to-do · HR docs | Licensing | Setup call · Onboarded</span>
</div>
<div class="row head">
<div style="color: #5b21b6">Case</div>
<div>Candidate</div>
<div>Progress</div>
<div>Waiting on</div>
<div>Since</div>
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
{cell}
<div>
<div class="one" style="font-weight: 600">{{{{r.who}}}}</div>
<div class="one" style="font-size: 12px; color: #6b655d">{{{{r.what}}}}</div>
</div>
<div>
<div class="one" style="font-variant-numeric: tabular-nums">{{{{r.since}}}}</div>
<div style="font-size: 12px; font-weight: 600; color: {{{{r.ageTone}}}}">{{{{r.age}}}}</div>
</div>
<div style="text-align: right"><button class="btn">{{{{r.action}}}}</button></div>
</div>
</sc-for>
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":{H}}}}}'>{JS}</script>
</body>
</html>
'''


def seg(k):
    ml = '; margin-left: 6px' if k in GROUP_START else ''
    return f'<i class="sg" style="background: {{{{r.f{k}}}}}{ml}"></i>'


COMPACT = (
    '<div title="{{r.tip}}">\n'
    '<div style="display: flex; gap: 2px" role="img" aria-label="{{r.tip}}">' + ''.join(seg(k) for k in range(N)) + '</div>\n'
    '<div class="one" style="font-size: 12px; font-weight: 500; margin-top: 6px; color: {{r.tone}}">{{r.label}}</div>\n'
    '</div>'
)

SLOT = 2 * 3.14159265 * 20 / N
DASH = SLOT - 2.2


def arc(k):
    rot = -90 + k * 360 / N + 3
    # Auto: a second thin dotted arc on top, so the bypass reads differently from a manual approval.
    return (f'<circle cx="25" cy="25" r="20" fill="none" stroke="{{{{r.s{k}}}}}" stroke-width="5" '
            f'stroke-dasharray="{DASH:.2f} 200" transform="rotate({rot:.2f} 25 25)"></circle>')


AUTO_OVERLAY = (f'<circle cx="25" cy="25" r="20" fill="none" stroke="#b2dfbc" stroke-width="2.4" '
                f'stroke-dasharray="{{{{r.autoDash}}}}" transform="rotate({-90 + 3:.2f} 25 25)"></circle>')

RING = (
    '<div title="{{r.tip}}" style="display: flex; align-items: center; gap: 10px">\n'
    '<div style="position: relative; width: 38px; height: 38px; flex: none">\n'
    '<svg width="38" height="38" viewBox="0 0 50 50" role="img" aria-label="{{r.tip}}">'
    + ''.join(arc(k) for k in range(N)) + AUTO_OVERLAY + '</svg>\n'
    '<span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #1c1b1a">{{r.doneN}}</span>\n'
    '</div>\n'
    '<div class="one" style="font-size: 12.5px; font-weight: 500; color: {{r.tone}}">{{r.label}}</div>\n'
    '</div>'
)

# The ring's auto overlay: a light stripe inside the first arc only when approval was automatic.
RING_JS = JS.replace(
    "      return out;\n    };",
    f"      out.autoDash = st[0] === 'a' ? '{DASH:.2f} 200' : '0 200';\n      return out;\n    }};")

NOTE = 'Cột tím “Case” chỉ để giải thích. Từ case 2 trở đi là dữ liệu mẫu.'
open(os.path.join(ROOT, 'Compact.dc.html'), 'w').write(page('My hand-offs – compact bar, all cases', COMPACT, NOTE))
ring_page = page('My hand-offs – segmented ring, all cases', RING, NOTE).replace(JS, RING_JS)
open(os.path.join(ROOT, 'Ring.dc.html'), 'w').write(ring_page)

c = json.load(open(os.path.join(ROOT, 'canvas.json')))
c['boards']['Compact.dc.html'].update({'h': H, 'title': 'Phương án A: thanh 11 đoạn – đủ 14 case'})
c['boards']['Ring.dc.html'].update({'h': H, 'title': 'Phương án B: vòng 11 cung – đủ 14 case'})
c['notes']['n4']['text'] = ('Hàng dưới: Approval là bước đầu tiên (11 bước). Bypass (tự duyệt vì đủ số loans) = xanh SỌC, '
                            'duyệt tay = xanh đặc, bị từ chối = đỏ. Rê chuột = chi tiết từng bước.')
json.dump(c, open(os.path.join(ROOT, 'canvas.json'), 'w'), ensure_ascii=False, indent=2)
