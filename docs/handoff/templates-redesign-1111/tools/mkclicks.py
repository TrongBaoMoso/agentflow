"""Build emails/CLICKS.json from the real-flow captures and copy the landing shots into the gallery.

Inputs (all written by the capture tools):
  gmail/real/<case>-links.json   every link of the real email (gmailreal.js)
  land/<case>-<n>-{d,m}.png      the page each button opened, 1440 / 390 (landshot.js)
  land/<case>-<n>-info.json      where the click really went (SendGrid redirect resolved)
The case list below says, per test lead, which template it shows, whether the email was really sent by the app, and the
plain caption of each landing page (EN + VI). Output: emails/CLICKS.json and gallery/img/click-<case>-<n>-{d,m}.jpg."""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
IMG = os.path.join(HERE, 'gallery', 'img')
LEADS = json.load(open(os.path.join(HERE, 'land', 'leads.json')))

PORTAL_TOKEN = {
    'en': 'Not one-time: it opens again and again, and opening it changes nothing until the Loan Officer saves a step. '
          'It stops working when a newer email (reminder, welcome, resend) or a staff "copy link" gives him a new one, or after 90 days.',
    'vi': 'Không phải link dùng một lần: mở bao nhiêu lần cũng được, và mở ra không làm thay đổi gì cho tới khi Loan Officer lưu một bước. '
          'Link hết dùng được khi có email mới hơn (nhắc, chào mừng, gửi lại) hoặc nhân viên bấm "copy link" tạo link mới, hoặc sau 90 ngày.'}
MEET_TOKEN = {'en': 'The session\'s Google Meet link: the same for everyone registered, not one-time.',
              'vi': 'Link Google Meet của buổi: mọi người đăng ký dùng chung, không phải link dùng một lần.'}
ICS_TOKEN = {'en': 'Personal calendar link, not one-time. It stops working once the session has taken place or was cancelled.',
             'vi': 'Link lịch riêng của từng người, không phải dùng một lần. Hết dùng được khi buổi đã diễn ra hoặc bị huỷ.'}
MAP_TOKEN = {'en': 'A plain Google Maps link to the office address in the signature.', 'vi': 'Link Google Maps thường tới địa chỉ văn phòng trong chữ ký.'}

PORTAL_INTRO = {'en': 'The Loan Factory sign-up page ("Loan Officer information"), open on step 1 of 5, "Before You Begin". '
                      'The step list shows "Paying one-time fee: PAYMENT DUE". Name, email and phone are already filled in on step 2.',
                'vi': 'Trang đăng ký Loan Factory ("Loan Officer information"), mở ở bước 1/5 "Before You Begin". '
                      'Danh sách bước ghi "Paying one-time fee: PAYMENT DUE". Tên, email, số điện thoại đã điền sẵn ở bước 2.'}

def bi(en: str, vi: str) -> dict:
    return {'en': en, 'vi': vi}


PORTAL_STEP1_PRECALL = bi('The Loan Factory sign-up page ("Loan Officer information"), open on step 1 of 5, "Before You Begin". The fee step says "AFTER YOUR CALL": before the 1-1 he can fill in his information, then pay and sign after the call. Name, email and phone are already filled in on step 2.',
                          'Trang đăng ký Loan Factory ("Loan Officer information"), mở ở bước 1/5 "Before You Begin". Bước trả phí ghi "AFTER YOUR CALL": trước buổi 1-1 Jordan điền thông tin được, trả phí và ký sau buổi gọi. Tên, email, số điện thoại đã điền sẵn ở bước 2.')
LF_PAGE = bi('www.loanfactory.com/loan-officer on the live site: "The #1 Mortgage Platform" page for Loan Officers. An "Announcement" pop-up about who can join shows first.',
             'www.loanfactory.com/loan-officer trên trang thật: trang "The #1 Mortgage Platform" dành cho Loan Officer. Một pop-up "Announcement" về điều kiện gia nhập hiện ra trước.')
MEET_SHOWS = bi('Google Meet for this session. Opened in a browser that is not signed in to Google, Meet says "You can\'t join this video call"; signed in, he gets Meet\'s join screen (not photographed).',
                'Google Meet của buổi này. Mở bằng trình duyệt chưa đăng nhập Google thì Meet báo "You can\'t join this video call"; đã đăng nhập thì Jordan thấy màn hình xin vào phòng của Meet (không chụp).')
ICS_SHOWS = bi('No page opens: it downloads a calendar file (webinar.ics) with the date, time and Meet link, and his phone or computer adds it to the calendar.',
               'Không mở trang nào: nút tải về một file lịch (webinar.ics) có ngày, giờ và link Meet, điện thoại hoặc máy tính sẽ thêm vào lịch.')
WAIT_DAYS = lambda en_when, vi_when: bi(f'Not sent for real: it goes {en_when}. Sending one today would mean waiting, or changing the shared timing setting for every staging session. The picture is the "Send test to me" copy.',
                                         f'Chưa gửi thật: email này đi {vi_when}. Muốn gửi hôm nay thì phải chờ, hoặc đổi setting thời gian dùng chung cho mọi buổi trên staging. Ảnh là bản "Send test to me".')

TEST_SERIES = bi('Sent for a short test webinar series made for this gallery, "Gallery test (ignore)" (Wednesdays 10:30 AM PT, Nov 11 to 25, hosted by Bao\'s Google account), so it shows that title instead of "Why Loan Factory".',
                 'Gửi cho một loạt webinar thử ngắn tạo riêng cho gallery này, "Gallery test (ignore)" (thứ Tư 10:30 AM PT, 11 tới 25/11, host là tài khoản Google của anh Bảo), nên email hiện tên đó thay vì "Why Loan Factory".')

CASES = [
    {'case': 'invite', 'template_id': 'tpl-lo-invite', 'lead': 'invite', 'real': False,
     'why_not_real': bi('Not sent for real on staging: there every invite is handed to the onboarding specialist (hand-off rule) or waits for one, so the app never mails it. The email picture is the "Send test to me" copy. Its button\'s page below was opened with a staff "copy link" for test lead Gallery Invite: the same kind of sign-up link the invite carries.',
                        'Không gửi thật được trên staging: ở đó lời mời luôn được giao cho onboarding specialist (luật hand-off) hoặc chờ có specialist, nên app không bao giờ gửi email này. Ảnh email là bản "Send test to me". Trang của nút bên dưới mở bằng "copy link" của nhân viên cho lead thử Gallery Invite: cùng loại link đăng ký mà email mời mang theo.'),
     'links': [{'label': 'Join Loan Factory', 'n': 1, 'from': 'staff-link', 'token': PORTAL_TOKEN, 'shows': PORTAL_STEP1_PRECALL},
               {'label': 'Sign up for the Friday webinar', 'n': 2, 'from': 'test-copy', 'mail': 'tpl-lo-invite', 'token': None, 'shows': LF_PAGE}]},
    {'case': 'remind-both', 'template_id': 'tpl-lo-invite-reminder', 'lead': 'remind-both', 'real': True,
     'variant': bi('Both steps left (pay, then sign)', 'Còn cả 2 bước (trả phí, rồi ký)'),
     'links': [{'label': 'Continue where you left off', 'n': 1, 'token': PORTAL_TOKEN,
                'shows': bi('The sign-up page, open on step 1 of 5, "Before You Begin". This test lead had not had his 1-1 yet, so the fee step says "AFTER YOUR CALL".',
                            'Trang đăng ký, mở ở bước 1/5 "Before You Begin". Lead thử này chưa có buổi 1-1, nên bước trả phí ghi "AFTER YOUR CALL".')}]},
    {'case': 'remind-sign', 'template_id': 'tpl-lo-invite-reminder', 'lead': 'remind-sign', 'real': True,
     'variant': bi('Only signing left (fee already paid)', 'Chỉ còn ký (đã trả phí)'),
     'links': [{'label': 'Continue where you left off', 'n': 1, 'token': PORTAL_TOKEN,
                'shows': bi('The sign-up page opens on step 3, "Paying one-time fee", showing a green "Payment successful". The signing step (4) is one "Next" away: the link does not open straight on the step that is left.',
                            'Trang đăng ký mở ở bước 3 "Paying one-time fee", hiện dấu xanh "Payment successful". Bước ký (4) phải bấm "Next" thêm một lần: link không mở thẳng vào bước còn thiếu.')}]},
    {'case': 'remind-pay', 'template_id': 'tpl-lo-invite-reminder', 'lead': 'remind-pay', 'real': False,
     'variant': bi('Only paying left', 'Chỉ còn trả phí'),
     'why_not_real': bi('"Only paying left" cannot happen on the new sign-up page: its signing step says "Please pay the startup fee first". It only happens for a Loan Officer who signed elsewhere (MOSO). Test lead Gallery Remind Pay was archived unused.',
                        '"Chỉ còn trả phí" không xảy ra được trên trang đăng ký mới: bước ký ghi "Please pay the startup fee first". Chỉ xảy ra với Loan Officer đã ký ở nơi khác (MOSO). Lead thử Gallery Remind Pay đã được lưu trữ, không dùng.'),
     'links': []},
    {'case': 'welcome', 'template_id': 'tpl-lo-welcome', 'lead': 'welcome-v2', 'real': True,
     'links': [{'label': 'Start your setup', 'n': 1, 'token': PORTAL_TOKEN, 'shows': PORTAL_INTRO}]},
    {'case': 'agreement', 'template_id': 'tpl-lo-agreement-updated', 'lead': 'agree-v2', 'real': True,
     'predates': bi('Gmail put this real email in Spam (also a test copy and an older one). Worth checking before production.',
                    'Gmail đã đưa email thật này vào Spam (cả một bản thử và một email cũ hơn). Nên kiểm tra trước khi lên production.'),
     'links': [{'label': 'Review and sign', 'n': 1, 'token': PORTAL_TOKEN,
                'shows': bi('The sign-up page opens on step 5, "Grant Access on NMLS", not on the agreement. Step 4 "Review and Sign agreement" already shows a check mark although this test lead has not signed (he had only opened the signing screen once). To see the new version he must press "Back".',
                            'Trang đăng ký mở ở bước 5 "Grant Access on NMLS", không phải ở hợp đồng. Bước 4 "Review and Sign agreement" đã có dấu tick dù lead thử này chưa ký (chỉ mới mở màn hình ký một lần). Muốn xem bản mới thì phải bấm "Back".')}]},
    {'case': 'fee-paid', 'template_id': 'tpl-lo-fee-paid', 'lead': 'fee-v2', 'real': True, 'links': []},
    {'case': 'fee-paid-staff', 'template_id': 'tpl-lo-fee-paid-staff', 'lead': 'fee-v2', 'real': True,
     'links': [{'label': 'Open the Loan Officer', 'n': 1, 'token': bi('Plain link to the Recruit profile; staff must be signed in.', 'Link thường tới hồ sơ trong Recruit; nhân viên phải đăng nhập.'),
                'shows': bi('The Loan Officer\'s profile in Recruit (here signed in as the test admin).', 'Hồ sơ Loan Officer trong Recruit (ở đây đăng nhập bằng admin thử).')}]},
    {'case': 'webinar-confirm', 'template_id': 'tpl-lo-webinar-session-confirmed', 'lead': 'webinar-confirm', 'real': True,
     'links': [{'label': 'Join the webinar', 'n': 1, 'token': MEET_TOKEN, 'shows': MEET_SHOWS},
               {'label': 'Add it to your calendar', 'n': 2, 'token': ICS_TOKEN, 'no_shot': True, 'shows': ICS_SHOWS}]},
    {'case': 'webinar-link', 'template_id': 'tpl-lo-webinar-session-link', 'lead': 'webinar-remind', 'real': True, 'predates': TEST_SERIES,
     'links': [{'label': 'Join the webinar', 'n': 1, 'token': MEET_TOKEN, 'shows': MEET_SHOWS},
               {'label': 'Add it to your calendar', 'n': 2, 'token': ICS_TOKEN, 'no_shot': True, 'shows': ICS_SHOWS}]},
    {'case': 'webinar-moved', 'template_id': 'tpl-lo-webinar-session-moved', 'lead': 'webinar-moved', 'real': True, 'predates': TEST_SERIES,
     'links': [{'label': 'Join the webinar', 'n': 1, 'token': MEET_TOKEN, 'shows': MEET_SHOWS},
               {'label': 'Add the new date to your calendar', 'n': 2, 'token': ICS_TOKEN, 'no_shot': True, 'shows': ICS_SHOWS}]},
    {'case': 'webinar-2h', 'template_id': 'tpl-lo-webinar-reminder-2h', 'lead': 'webinar-remind', 'real': True, 'predates': TEST_SERIES,
     'links': [{'label': 'Join the webinar', 'n': 1, 'token': MEET_TOKEN, 'shows': MEET_SHOWS},
               {'label': 'Add it to your calendar', 'n': 2, 'token': ICS_TOKEN, 'no_shot': True, 'shows': ICS_SHOWS}]},
    {'case': 'webinar-2d', 'template_id': 'tpl-lo-webinar-reminder-2d', 'lead': 'webinar-confirm', 'real': False,
     'why_not_real': WAIT_DAYS('2 days before the session (for Gallery Webinar Confirm: Nov 11, 9 PM UTC)', '2 ngày trước buổi (với Gallery Webinar Confirm: 04:00 sáng 12/11 giờ VN)'),
     'links': [{'label': 'Join the webinar', 'n': 1, 'from': 'same-session', 'land': 'webinar-confirm-1', 'mail': 'webinar-confirm', 'token': MEET_TOKEN, 'shows': MEET_SHOWS}]},
    {'case': 'webinar-1d', 'template_id': 'tpl-lo-webinar-reminder-1d', 'lead': 'webinar-confirm', 'real': False,
     'why_not_real': WAIT_DAYS('1 day before the session', '1 ngày trước buổi'),
     'links': [{'label': 'Join the webinar', 'n': 1, 'from': 'same-session', 'land': 'webinar-confirm-1', 'mail': 'webinar-confirm', 'token': MEET_TOKEN, 'shows': MEET_SHOWS}]},
    {'case': 'webinar-registered', 'template_id': 'tpl-lo-webinar-registered', 'lead': None, 'real': False,
     'why_not_real': bi('Not sent on staging: this is the confirmation for a MOSO webinar, and on staging MOSO is switched off for Recruit, so every sign-up goes to Recruit\'s own sessions (see "Webinar sign-up confirmation (Recruit webinar)").',
                        'Không gửi trên staging: đây là email xác nhận cho webinar của MOSO, mà trên staging Recruit đã tắt MOSO, nên mọi lượt đăng ký đều vào buổi của Recruit (xem "Email xác nhận đăng ký webinar (webinar của Recruit)").'),
     'links': []},
] + [
    {'case': f'webinar-{k}', 'template_id': f'tpl-lo-webinar-{k}', 'lead': None, 'real': False, 'links': [],
     'why_not_real': bi('Not sent for real: it goes the day after a session at 2 PM local time, and which version goes depends on attendance read from Google Meet (someone must really join). Doing it today would mean changing the shared follow-up time for every staging session. The "Watch the recording" link in the test copy is a sample.',
                        'Chưa gửi thật: email này đi ngày hôm sau buổi webinar lúc 14:00 giờ địa phương, và bản nào được gửi tuỳ vào điểm danh đọc từ Google Meet (phải có người vào phòng thật). Muốn làm hôm nay thì phải đổi setting giờ gửi dùng chung cho mọi buổi trên staging. Link "Watch the recording" trong bản thử là link mẫu.')}
    for k in ('follow-up', 'follow-up-attended', 'follow-up-missed')
] + [
    {'case': 'webinar-referrer', 'template_id': 'tpl-lo-webinar-referrer-attended', 'lead': None, 'real': False, 'links': [],
     'why_not_real': bi('Not sent for real: it needs a referral that came from MOSO (switched off on staging) and the referred person really joining the Meet.',
                        'Chưa gửi thật: cần một lượt giới thiệu đến từ MOSO (đã tắt trên staging) và người được giới thiệu phải vào Meet thật.')},
] + [
    {'case': f'webinar-drip-{k}', 'template_id': f'tpl-lo-webinar-drip-{k}', 'lead': None, 'real': False, 'links': [],
     'why_not_real': bi('Not sent for real: it goes 1, 2 or 3 months after the webinar. Shortening that would change the shared setting and mail every past attendee on staging.',
                        'Chưa gửi thật: email này đi 1, 2 hoặc 3 tháng sau webinar. Rút ngắn thì phải đổi setting dùng chung và sẽ gửi tới mọi người từng dự trên staging.')}
    for k in ('1m', '2m', '3m')
] + [
    {'case': 'onb-2h', 'template_id': 'tpl-onb-1on1-reminder-2h', 'lead': 'onb-2h', 'real': True,
     'links': [{'label': 'Join the call', 'n': 1, 'token': bi('The Meet link the specialist saved for the 1-1. Not one-time.', 'Link Meet mà specialist lưu cho buổi 1-1. Không phải link dùng một lần.'),
                'shows': bi('For this test the 1-1 was booked with a stand-in link (meet.google.com/new), so it opens Google\'s sign-in page. In real use it opens the specialist\'s own Meet for the call.',
                            'Trong lần thử này buổi 1-1 được đặt với link tạm (meet.google.com/new), nên nút mở trang đăng nhập Google. Khi dùng thật, nút mở Meet của specialist cho buổi gọi.')}]},
] + [
    {'case': f'onb-{k}', 'template_id': f'tpl-onb-1on1-reminder-{k}', 'lead': None, 'real': False, 'links': [],
     'why_not_real': bi(f'Not sent for real: it goes {w} before the 1-1, so it needs a call booked that far ahead and a wait. The 2-hour reminder was sent for real (see that card) and its button works the same way.',
                        f'Chưa gửi thật: email này đi {wv} trước buổi 1-1, nên cần đặt lịch trước chừng đó và chờ. Email nhắc 2 tiếng đã gửi thật (xem thẻ đó), nút hoạt động giống vậy.')}
    for k, w, wv in (('2d', '2 days', '2 ngày'), ('1d', '1 day', '1 ngày'))
] + [
    {'case': f'nurture-{k}', 'template_id': f'tpl-nurture-{k}', 'lead': None, 'real': False,
     'why_not_real': bi('Not sent for real: the first keep-in-touch email goes 2 to 4 weeks after a "Neutral" call result (the shortest setting is 2 weeks), then one every few weeks.',
                        'Chưa gửi thật: email giữ liên lạc đầu tiên đi 2 tới 4 tuần sau kết quả gọi "Neutral" (setting ngắn nhất là 2 tuần), sau đó vài tuần một email.'),
     'links': ([{'label': 'https://www.loanfactory.com/lo', 'n': 1, 'from': 'test-copy', 'mail': f'tpl-nurture-{k}', 'land': 'nurture-1', 'token': None, 'shows': LF_PAGE}] if k != '2' else [])}
    for k in ('1', '2', '3', '4')
] + [
    {'case': 'sent-by-hand', 'template_id': '698b9cc2-323d-434e-80e2-244f2c5363dc', 'lead': None, 'real': False, 'links': [],
     'why_not_real': bi('A recruiter sends this one by hand from a lead\'s profile (Send info). The picture is the "Send test to me" copy.',
                        'Recruiter tự gửi email này từ hồ sơ lead (Send info). Ảnh là bản "Send test to me".')},
]


def jpg(src: str, dst: str, width: int) -> None:
    subprocess.run(['sips', '-Z', str(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', dst], capture_output=True, check=False)


def norm(t: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', (t or '').lower()).strip()


def email_links(case: str) -> list:
    """Links of the real email of a case (gmail/real/<case>), or of a test copy (gmail/<template id>)."""
    p = os.path.join(HERE, 'gmail', 'real', f'{case}-links.json')
    if not os.path.exists(p):
        p = os.path.join(HERE, 'gmail', f'{case}-links.json')
    return json.load(open(p))['links'] if os.path.exists(p) else []


def build() -> dict:
    out = []
    for c in CASES:
        lead = LEADS[c['lead']] if c.get('lead') else None
        mail = email_links(c['case']) if c['real'] else []
        links = []
        for ln in c['links']:
            land = ln.get('land') or f'{c["case"]}-{ln["n"]}'
            info_p = os.path.join(HERE, 'land', f'{land}-info.json')
            info = json.load(open(info_p)) if os.path.exists(info_p) else {}
            src_mail = email_links(ln['mail']) if ln.get('mail') else mail
            href = next((m['href'] for m in src_mail if norm(m['text']) == norm(ln['label'])), None) or info.get('url')
            row = {'label': ln['label'], 'url': href, 'resolves_to': info.get('target'), 'shows': ln.get('shows'), 'token': ln.get('token')}
            if ln.get('from'):
                row['from'] = ln['from']
            for sfx, w in (('d', 1600), ('m', 900)):
                src = os.path.join(HERE, 'land', f'{land}-{sfx}.png')
                if not ln.get('no_shot') and os.path.exists(src):
                    name = f'click-{c["case"]}-{ln["n"]}-{sfx}.jpg'
                    jpg(src, os.path.join(IMG, name), w)
                    row['shot_' + sfx] = name
            links.append(row)
        entry = {'case': c['case'], 'template_id': c['template_id'], 'real': c['real'],
                 'lead': ({'name': lead['name'], 'email': lead['email'], 'candidate_id': lead['id'], 'offer_id': lead.get('offer')} if lead else None),
                 'links': links,
                 'all_links_in_email': [{'text': m['text'], 'href': m['href']} for m in mail]}
        for k in ('variant', 'why_not_real', 'predates'):
            if c.get(k):
                entry[k] = c[k]
        out.append(entry)
    return {'generated': 'tools/mkclicks.py', 'note': 'Live staging links of the Gallery test leads (bao.trinh+gal-*). STAGING only.', 'cases': out}


if __name__ == '__main__':
    data = build()
    json.dump(data, open(os.path.join(DOCS, 'emails', 'CLICKS.json'), 'w'), ensure_ascii=False, indent=1)
    print('cases', len(data['cases']), 'links', sum(len(c['links']) for c in data['cases']))
