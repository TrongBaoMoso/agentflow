/* Loan Factory email kit for Recruit, built on Tera's TERA_EMAIL_LAYOUT (rate-alert kit, 2026-11-02).
   Tables + inline styles + bgcolor only, so Gmail, Outlook and dark-mode inverters render it the same.
   One shell, one footer, one signature, one primary button per email, no emoji, sentence-case labels. */
(function () {
  'use strict';
  const T = {
    font: "'Public Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
    page: '#f4f2ef', card: '#ffffff', brand: '#e4642a', fill: '#c24c02', link: '#ad4a1b',
    text: '#201e1b', muted: '#6e6a63', canvas: '#faf9f7', line: '#e4e1dc', line2: '#eceae6', tint: '#fbeae0', note: '#fff6ef',
  };
  window.MAILKIT_TOKENS = T;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = '0 32px';
  const row = (inner, p = '16px 32px 0') => `<tr><td style="padding:${p};font-family:${T.font};">${inner}</td></tr>`;

  const B = {
    // Header: brand bar, logo left, what-kind-of-mail right (Tera "kicker").
    header: (kicker) => `<tr><td height="6" bgcolor="${T.brand}" style="height:6px;line-height:6px;font-size:0;background:${T.brand};border-radius:16px 16px 0 0;">&nbsp;</td></tr>
      <tr><td style="padding:22px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><img src="${window.LOGO}" width="138" alt="Loan Factory" style="display:block;border:0;"></td>
        ${kicker ? `<td align="right" style="font-family:${T.font};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:${T.muted};white-space:nowrap;">${esc(kicker)}</td>` : ''}
      </tr></table></td></tr>`,
    h1: (t) => row(`<div style="font-size:22px;line-height:1.3;font-weight:700;color:${T.text};">${t}</div>`, '26px 32px 0'),
    hi: (name) => row(`<div style="font-size:15px;line-height:1.6;color:${T.text};">Hi ${esc(name)},</div>`, '18px 32px 0'),
    p: (t) => row(`<div style="font-size:15px;line-height:1.6;color:${T.text};">${t}</div>`, '12px 32px 0'),
    small: (t) => row(`<div style="font-size:13px;line-height:1.55;color:${T.muted};">${t}</div>`, '8px 32px 0'),
    // The one primary action: full width so a thumb finds it, optional hint under it.
    cta: (label, url, hint) => `<tr><td style="padding:22px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" bgcolor="${T.fill}" style="background:${T.fill};border-radius:10px;"><a href="${esc(url)}" style="display:block;padding:14px 20px;font-family:${T.font};font-size:15px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}</a></td>
      </tr></table></td></tr>${hint ? `<tr><td align="center" style="padding:8px 32px 0;font-family:${T.font};font-size:13px;line-height:1.5;color:${T.muted};">${hint}</td></tr>` : ''}`,
    link: (text, url) => `<a href="${esc(url)}" style="color:${T.link};text-decoration:underline;">${esc(text)}</a>`,
    // Facts the reader acts on (when, how long, where): a soft panel of label / value rows.
    details: (items) => `<tr><td style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.canvas}" style="background:${T.canvas};border:1px solid ${T.line};border-radius:12px;">
        ${items.map(([k, v], i) => `<tr><td style="padding:${i ? '0' : '14px'} 18px ${i === items.length - 1 ? '14px' : '10px'};font-family:${T.font};">
          <div style="font-size:12.5px;line-height:1.3;color:${T.muted};">${esc(k)}</div><div style="padding-top:2px;font-size:15px;line-height:1.45;color:${T.text};font-weight:700;">${v}</div></td></tr>`).join('')}
      </table></td></tr>`,
    // Benefits / what you will learn: small brand square instead of emoji.
    bullets: (items) => row(`<table role="presentation" cellpadding="0" cellspacing="0">${items.map((t) => `<tr><td valign="top" style="padding:7px 12px 0 2px;"><div style="width:7px;height:7px;background:${T.brand};border-radius:2px;"></div></td><td style="padding:2px 0 6px;font-family:${T.font};font-size:15px;line-height:1.55;color:${T.text};">${t}</td></tr>`).join('')}</table>`, '12px 32px 0'),
    // What is left to do, in order.
    steps: (items) => row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(([title, sub], i) => `<tr>
        <td width="40" valign="top" style="padding:4px 0 10px;"><div style="width:26px;height:26px;border-radius:13px;background:${T.tint};color:${T.link};font-family:${T.font};font-size:13px;font-weight:700;line-height:26px;text-align:center;">${i + 1}</div></td>
        <td valign="top" style="padding:5px 0 10px;font-family:${T.font};"><div style="font-size:15px;line-height:1.4;color:${T.text};font-weight:700;">${title}</div>${sub ? `<div style="font-size:13.5px;line-height:1.5;color:${T.muted};padding-top:2px;">${sub}</div>` : ''}</td></tr>`).join('')}</table>`, '16px 32px 0'),
    note: (t) => `<tr><td style="padding:16px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.note}" style="background:${T.note};border-left:3px solid ${T.brand};border-radius:6px;"><tr><td style="padding:12px 16px;font-family:${T.font};font-size:14px;line-height:1.55;color:${T.text};">${t}</td></tr></table></td></tr>`,
    // A person to reach: monogram, name, role, phone, email.
    person: (label, name, role, phone, email) => `<tr><td style="padding:18px 32px 0;font-family:${T.font};">
        <div style="font-size:12.5px;color:${T.muted};padding-bottom:8px;">${esc(label)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${T.line};border-radius:12px;"><tr>
          <td width="62" valign="middle" style="padding:14px 0 14px 16px;"><div style="width:40px;height:40px;border-radius:20px;background:${T.tint};color:${T.link};font-size:14px;font-weight:700;line-height:40px;text-align:center;">${esc(name.split(/\s+/).map((w) => w[0]).slice(0, 2).join(''))}</div></td>
          <td valign="middle" style="padding:14px 16px 14px 0;font-size:14px;line-height:1.5;color:${T.muted};">
            <div style="font-size:15px;color:${T.text};font-weight:700;">${esc(name)}</div>${role ? `<div>${esc(role)}</div>` : ''}
            <div>${phone ? `<a href="tel:${esc(phone.replace(/\D/g, ''))}" style="color:${T.link};text-decoration:none;">${esc(phone)}</a>` : ''}${phone && email ? ' &nbsp;·&nbsp; ' : ''}${email ? `<a href="mailto:${esc(email)}" style="color:${T.link};text-decoration:none;">${esc(email)}</a>` : ''}</div>
          </td></tr></table></td></tr>`,
    // Who to talk to: the recruiter (warm card, first) and the recruiting team (grey card). Side by side, stack on a phone.
    contacts: (people) => `<tr><td style="padding:20px 26px 0;font-size:0;">${people.map((c) => `<div style="display:inline-block;vertical-align:top;width:100%;max-width:268px;padding:0 6px 10px;box-sizing:border-box;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${c.warm ? T.note : T.canvas}" style="background:${c.warm ? T.note : T.canvas};border:1px solid ${c.warm ? '#f6d9c4' : T.line};border-radius:12px;"><tr><td style="padding:14px 16px;font-family:${T.font};font-size:13.5px;line-height:1.5;color:${T.muted};">
          <div style="font-size:12px;letter-spacing:0.4px;text-transform:uppercase;color:${c.warm ? T.link : T.muted};padding-bottom:8px;">${esc(c.label)}</div>
          <div style="font-size:15px;line-height:1.35;color:${T.text};font-weight:700;">${esc(c.name)}</div><div style="padding-bottom:6px;">${esc(c.role)}</div>
          <div><a href="tel:${esc(c.phone.replace(/\D/g, ''))}" style="color:${T.link};text-decoration:none;">${esc(c.phone)}</a></div>
          <div><a href="mailto:${esc(c.email)}" style="color:${T.link};text-decoration:none;word-break:break-all;">${esc(c.email)}</a></div>
        </td></tr></table></div>`).join('')}</td></tr>`,
    // When the contact cards already carry phone and email, the sign-off is one line: no second contact block.
    signShort: (lead, s) => row(`<div style="font-size:15px;line-height:1.6;color:${T.text};">${lead}<br><b>${esc(s.name)}</b> <span style="color:${T.muted};">&middot; ${esc(s.title)}</span></div>`, '22px 32px 0'),
    signoff: (t) => row(`<div style="font-size:15px;line-height:1.6;color:${T.text};">${t}</div>`, '22px 32px 0'),
    // The sender, the same block on every email (Tera signature + contact icons).
    signature: (s) => `<tr><td style="padding:22px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${T.line};"><tr>
        <td width="66" valign="top" style="padding-top:20px;"><div style="width:48px;height:48px;border-radius:24px;background:${T.tint};color:${T.link};font-family:${T.font};font-size:16px;font-weight:700;line-height:48px;text-align:center;">${esc(s.initials)}</div></td>
        <td valign="top" style="padding-top:20px;font-family:${T.font};font-size:14px;line-height:1.6;color:${T.muted};">
          <div style="font-size:15px;color:${T.text};font-weight:700;">${esc(s.name)}</div>
          <div>${esc(s.title)}${s.nmls ? ` &middot; NMLS #${esc(s.nmls)}` : ''}</div>
          ${s.phone ? `<div style="padding-top:6px;"><img src="${(window.ICONPNG || {}).mobile}" width="14" height="14" alt="" style="vertical-align:-2px;margin-right:8px;border:0;"><a href="tel:${esc(s.phone.replace(/\D/g, ''))}" style="color:${T.text};text-decoration:none;">${esc(s.phone)}</a></div>` : ''}
          <div><img src="${(window.ICONPNG || {}).office}" width="14" height="14" alt="" style="vertical-align:-2px;margin-right:8px;border:0;"><a href="tel:6603333333" style="color:${T.text};text-decoration:none;">(660) 333-3333</a></div>
          <div><img src="${(window.ICONPNG || {}).mail}" width="14" height="14" alt="" style="vertical-align:-2px;margin-right:8px;border:0;"><a href="mailto:${esc(s.email)}" style="color:${T.text};text-decoration:none;">${esc(s.email)}</a></div>
        </td></tr></table></td></tr>`,
    // ONE footer for every Recruit email. Unsubscribe only on marketing / nurture mail (CAN-SPAM); system mail says why it came.
    footer: (why, unsubscribe) => `<tr><td style="padding:28px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.canvas}" style="background:${T.canvas};border-top:1px solid ${T.line2};border-radius:0 0 16px 16px;"><tr><td style="padding:20px 32px 24px;font-family:${T.font};font-size:12.5px;line-height:1.7;color:${T.muted};">
        ${esc(why)}${unsubscribe ? ` <a href="#" style="color:${T.link};text-decoration:underline;">Unsubscribe</a>.` : ''}<br>
        Loan Factory, Inc. &middot; NMLS #320841 &middot; 2195 Tully Road, San Jose, CA 95122 &middot; Equal Housing Opportunity<br>
        Questions? Write to <a href="mailto:support@loanfactory.com" style="color:${T.link};text-decoration:underline;">support@loanfactory.com</a>.
      </td></tr></table></td></tr>`,
  };
  const shell = (rows, preheader) => `<div style="margin:0;padding:28px 12px;background:${T.page};">${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.card}" style="max-width:600px;margin:0 auto;background:${T.card};border-radius:16px;border:1px solid ${T.line2};">${rows.join('')}</table></div>`;
  window.MAILKIT = { B, shell, T };

  // ---- the Recruit emails rewritten on the kit (copy kept, cleaned: no emoji, sentence-case buttons, one primary action) ----
  const S = window.MAILKIT_SAMPLE = {
    first: 'Jordan', full: 'Jordan Example', fee: '$100', join: 'https://www.example.test/apply_loan_officer?key=SAMPLE',
    wTitle: 'Why Loan Factory', wTime: 'Fri, Nov 6, 2026 · 9:00 AM PST', wJoin: 'https://meet.google.com/sample-webinar', wLead: '2 days', wOld: 'Friday, November 6, 2026 at 1:00 PM PST',
    wNext: 'Friday, November 13, 2026 at 1:00 PM PST', rec: 'https://drive.example.test/sample-recording', cal: 'https://gateway.example.test/ics/sample',
    meet: 'Tue, Nov 3 · 10:00 AM PST', meetMin: '30', meetLink: 'https://meet.google.com/sample-1on1', referrer: 'Riley Referrer', wDate: 'Nov 13, 2026 · 1:00 PM',
    sender: { name: 'Sam Sample', initials: 'SS', title: 'Onboarding Specialist', nmls: '1234567', phone: '(555) 010-0199', email: 'sam.sample@example.test' },
  };
  const SYS = 'You are getting this email because you started joining Loan Factory as a Loan Officer.';
  const NUR = 'You are getting this email because you talked with Alex Sample about joining Loan Factory.';
  const REC = { label: 'Your recruiter', name: 'Alex Sample', role: 'Recruiter, Loan Factory', phone: '(555) 010-0100', email: 'alex.sample@example.test', warm: true };
  const TEAM = { label: 'Recruiting team', name: 'Victoria Pham', role: 'Recruiting and Onboarding Manager', phone: '(714) 591-8143', email: 'recruiting@loanfactory.com' };
  // Emails that show contact cards end with a one-line sign-off, so the reader sees 2 contacts, not 3 blocks of phone numbers.
  // v7.2 (Bao 11/11): the email is From a real person (the Loan Officer's recruiter or onboarding specialist; the recruiting
  // team only when the lead has no owner, recruit-be TeamSender / LoanOfficerMailSender), so that person's FULL signature is
  // the contact. No recruiter / team cards: one quiet backup line to the recruiting team, only where the old copy had one.
  const backup = () => B.small(`Cannot reach me? Our recruiting team can help: ${B.link('(714) 591-8143', 'tel:7145918143')} · ${B.link('recruiting@loanfactory.com', 'mailto:recruiting@loanfactory.com')}`);
  const contactsClose = (people, t = 'Best regards,') => [...(people.some((p) => p === TEAM) ? [backup()] : []), ...close(t)];
  const recruiter = () => ''; const team = () => '';
  const close = (t = 'Best regards,') => [B.signoff(t), B.signature(S.sender), B.footer(SYS)];
  const webinarBox = (extra = []) => B.details([['Date and time', S.wTime], ['Length', 'About 1.5 hours. Opens 5 minutes early'], ...extra]);
  const calLine = () => B.small(`${B.link('Add it to your calendar', S.cal)} so you do not miss it.`);
  const LEARN = ['Learn from Thuan Nguyen, who closed over 1,000 loans in 2025', 'Work faster with our own LOS, CRM, POS, pricing and marketing tools', 'Grow with strong back-office and marketing support'];

  // "Fast track to Loan Factory": the 5 steps that used to be one image (fast-track-to-loan-factory.png), now real text.
  const fastTrack = () => [B.h1('Ready to join? Here is the fast track').replace('font-size:22px', 'font-size:18px'), B.steps([
    ['Attend the Why Loan Factory webinar', 'Highly recommended. About 1.5 hours.'], ['Reply to this email when you are ready', 'We will contact you right away.'],
    ['Onboarding call with Loan Factory', 'About 20 minutes.'], ['NMLS sponsorship and HR setup', '2 days to 1 week.'], ['Welcome aboard', 'You are part of Loan Factory.']])];
  const K = {};
  K['tpl-lo-invite'] = () => ['Invitation', B.h1('You are invited to join Loan Factory'), B.hi(S.first),
    B.p('Thanks for your interest in Loan Factory, the mortgage platform built for Loan Officers. Sign up below to start joining.'),
    B.note(`There is a <b>${S.fee}</b> one-time start-up fee. It covers your email, technology and NMLS sponsorship for up to 3 states. It is not refundable.`),
    B.cta('Join Loan Factory', S.join), B.small(`Want to learn more first? ${B.link('Sign up for the Friday webinar', 'https://www.loanfactory.com/loan-officer')}.`),
    B.small(`Questions? Write to ${B.link('support@loanfactory.com', 'mailto:support@loanfactory.com')}.`), ...close()];
  K['tpl-lo-invite-reminder'] = () => ['Finish joining', B.h1('You are almost part of Loan Factory'), B.hi(S.first), B.p('Your invite is still open. Two steps are left:'),
    B.steps([['Sign your agreement', 'Review your details and e-sign.'], [`Pay the start-up fee (${S.fee})`, 'One time, by card.']]),
    B.cta('Continue where you left off', S.join), B.small('Have a question? Just reply to this email.'), ...close()];
  K['tpl-lo-agreement-link'] = () => ['Action needed', B.h1('Review and sign your agreement'), B.hi(S.full), B.p('Thank you for registering as a Loan Officer with Loan Factory. To finish your setup, check your details and e-sign the agreement.'),
    B.cta('Review and sign', S.join), B.small('If you have a question, just reply to this email.'), ...close()];
  K['tpl-lo-agreement-updated'] = () => ['Agreement', B.h1('Your agreement was updated'), B.hi(S.first), B.p('The details on your Loan Factory agreement changed. Please review the new version and sign it.'),
    B.cta('Review and sign', S.join), B.small('If something looks wrong, just reply to this email.'), ...close()];
  K['tpl-lo-welcome'] = () => ['Onboarding', B.h1('Welcome! Three steps to finish your setup'), B.hi(S.full), B.p('Thanks for speaking with me today. Please do these steps in order:'),
    B.steps([['Review your information', 'Check your name, NMLS and license states.'], [`Pay the ${S.fee} joining fee`, 'One time, not refundable.'], ['E-sign the agreement', 'It takes about 5 minutes.']]),
    B.cta('Start your setup', S.join), B.note(`If the pay link does not work, send the fee by Zelle to ${B.link('accounting@loanfactory.com', 'mailto:accounting@loanfactory.com')} and email us the receipt. Already paid? Skip step 2.`), ...close('Sincerely,')];
  K['tpl-lo-fee-paid'] = () => ['Payment received', B.h1('We received your payment. Thank you!'), B.hi(S.full), B.p('Our team will contact you soon to guide you through the next steps.'),
    B.details([['Amount', S.fee], ['Paid on', 'Nov 10, 2026']]),
    B.p(`If you do not hear from us within 24 business hours, contact Lisbeth Giraldo, Onboarding Team Lead, at ${B.link('(669) 306-6244', 'tel:6693066244')} or ${B.link(S.sender.email, 'mailto:' + S.sender.email)}.`), B.p('Thank you for choosing Loan Factory.'), ...close()];
  K['tpl-lo-fee-paid-staff'] = () => ['Team notice', B.h1(`${S.full} paid the start-up fee`), B.p('Dear Team,'), B.p(`The interested Loan Officer <b>${S.full}</b> (jordan.example@example.test) paid the start-up fee for onboarding.`),
    B.cta('Open the Loan Officer', 'https://recruit.example.test/candidates/sample'), B.signoff('Thanks,'), B.signature(S.sender), B.footer('Internal notice from Loan Factory Recruit.')];
  K['tpl-lo-webinar-registered'] = () => ['Webinar', B.h1(`You are registered: ${S.wTitle}`), B.hi(S.first), B.p('Our Friday webinar is hosted by our CEO, Thuan Nguyen, the #1 loan originator in the country. You will see how Loan Factory helps Loan Officers grow with:'),
    B.bullets(['No junk fees and higher payouts', 'Our own tech: LOS, CRM, POS, pricing and marketing automation', 'Back-office support so you can focus on production', '$1,000 Best Price Guarantee']),
    webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'), ...fastTrack(), ...contactsClose([REC, TEAM])];
  K['tpl-lo-webinar-session-confirmed'] = () => ['Webinar', B.h1(`You are registered: ${S.wTitle}`), B.hi(S.first), webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'), calLine(),
    B.small('Cannot make it? Reply to this email and we will find you another Friday.'), ...close()];
  K['tpl-lo-webinar-session-link'] = () => ['Webinar', B.h1('Your webinar join link'), B.hi(S.first), B.p(`Here are the join details for the ${S.wTitle} webinar.`), webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'),
    B.small(`${B.link('Add it to your calendar', S.cal)}. If you added it before, this replaces that entry.`), ...close()];
  K['tpl-lo-webinar-session-moved'] = () => ['Webinar moved', B.h1('Your webinar moved to a new date'), B.hi(S.first), B.p(`The ${S.wTitle} session on ${S.wOld} is not going ahead. We moved you to the next session:`),
    webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'), B.small(`${B.link('Add the new date to your calendar', S.cal)}. If it does not work for you, just reply.`), ...close()];
  const reminder = (kick, h, lead) => () => [kick, B.h1(h), B.hi(S.first), B.p(lead), webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'), calLine(), ...contactsClose([TEAM])];
  K['tpl-lo-webinar-reminder-2d'] = () => ['Webinar in 2 days', B.h1(`2 days to ${S.wTitle}`), B.hi(S.first), B.p('Quick reminder: our live webinar with CEO Thuan Nguyen, the #1 loan originator in the country, is in 2 days. In this short session you will:'),
    B.bullets(LEARN), webinarBox(), B.cta('Join the webinar', S.wJoin, 'Opens 5 minutes early'), calLine(), ...contactsClose([TEAM])];
  K['tpl-lo-webinar-reminder-1d'] = reminder('Webinar tomorrow', 'See you tomorrow', `The ${S.wTitle} live webinar is tomorrow, hosted by our CEO, Thuan Nguyen. Get to know his system, his marketing engine and how he keeps clients coming back.`);
  K['tpl-lo-webinar-reminder-2h'] = reminder('Starts in 2 hours', `${S.wTitle} starts in 2 hours`, 'Thuan would love to meet you. Please turn on your camera and bring your questions.');
  const followUp = (missed) => () => [missed ? 'We missed you' : 'Thanks for joining', B.h1(missed ? `We missed you at ${S.wTitle}` : `Thanks for joining ${S.wTitle}`), B.hi(S.first),
    B.p(missed ? 'You can watch the recording, or join the next live session.' : 'If what you saw fits what you are looking for, the next step is simple: talk with your recruiter about how Loan Factory could work for you.'),
    ...(missed ? [B.details([['Next live session', S.wNext]])] : []),
    B.cta('Watch the recording', S.rec), ...(missed ? [B.small(`Or ${B.link('join the next webinar', S.wJoin)}. It opens 5 minutes early.`)] : []), ...fastTrack(), ...contactsClose([REC, TEAM])];
  K['tpl-lo-webinar-follow-up'] = followUp(false);
  K['tpl-lo-webinar-follow-up-attended'] = followUp(false);
  K['tpl-lo-webinar-follow-up-missed'] = followUp(true);
  K['tpl-lo-webinar-drip-1m'] = () => ['Checking in', B.h1('We built Loan Factory so you can build wealth'), B.hi(S.first), B.p(`It has been about a month since our "${S.wTitle}" webinar, so I wanted to check in. Loan Factory helps Loan Officers grow with:`),
    B.bullets(['Lower fees and higher take-home pay', 'Our own LOS, CRM, POS, pricing and marketing tools', 'Back-office support so you can focus on production']), B.p('Still exploring or have a question holding you back? The next step is a quick call.'), ...fastTrack(), ...contactsClose([REC, TEAM])];
  K['tpl-lo-webinar-drip-2m'] = () => ['Next steps', B.h1('Ready to join Loan Factory?'), B.hi(S.first), B.p('It has been about two months since our webinar. Many Loan Officers tell us they feel squeezed by high overhead and old tech. Loan Factory is built to fix that:'),
    B.bullets(['<b>Keep your commission:</b> 100% minus a flat $595 fee, no junk fees', '<b>Tech that does the work:</b> our LOS, CRM and POS', '<b>$1,000 Best Price Guarantee:</b> never lose a client over price']), B.p('Ready to move, or just want a live demo? We are here.'), ...fastTrack(), ...contactsClose([REC, TEAM])];
  K['tpl-lo-webinar-drip-3m'] = () => ['Still here', B.h1('Still here when you are ready'), B.hi(S.first), B.p('It has been three months since you registered for our webinar, and life gets busy. We have not forgotten about you.'),
    B.p('Our CEO, Thuan Nguyen, and our Loan Officers keep growing with our marketing engine and back-office support. If you still want 100% commission (minus $595) and full support, let us do a quick, no-pressure call this week.'), ...fastTrack(), ...contactsClose([REC, TEAM])];
  K['tpl-lo-webinar-referrer-attended'] = () => ['Your referral', B.h1(`${S.full} attended the webinar`), B.p(`Dear ${S.referrer},`), B.p(`Thanks for your referral. <b>${S.full}</b> attended ${S.wTitle} on ${S.wDate}. Hopefully they will go on to join Loan Factory.`),
    B.p('It would help a lot if you check in with them to see if they have any questions.'), B.signoff(`Thanks a lot, ${S.referrer}`), B.signature(S.sender), B.footer('You are getting this email because you referred a Loan Officer to Loan Factory.')];
  const oneOnOne = (h, lead) => () => ['Onboarding call', B.h1(h), B.hi(S.first), B.p(lead),
    B.details([['Date and time', S.meet], ['Length', `About ${S.meetMin} minutes`], ['Where', 'Google Meet']]), B.cta('Join the call', S.meetLink),
    B.small('Need another time? Reply to this email as soon as you can.'), B.signoff('Thank you,'), B.signature(S.sender), B.footer(SYS)];
  K['tpl-onb-1on1-reminder-1d'] = oneOnOne('Your onboarding call is tomorrow', 'Here are the details for your onboarding call with Loan Factory.');
  K['tpl-onb-1on1-reminder-2d'] = oneOnOne('Your onboarding call is in 2 days', 'A quick reminder about your onboarding call with Loan Factory.');
  K['tpl-onb-1on1-reminder-2h'] = oneOnOne('Your onboarding call starts in 2 hours', 'See you soon. Here is the link to join.');
  // Portal page blocks: the same type, colour, steps and notes, without email header / signature / footer.
  const P = {};
  const h2 = (t) => `<div style="font-size:22px;line-height:1.3;font-weight:700;color:${T.text};padding:0 0 6px;">${t}</div>`;
  const wrap = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('').replace(/padding:(\d+)(px)? 32px/g, 'padding:$1px 0').replace(/padding:(\d+)px 26px/g, 'padding:$1px 0')}</table>`;
  P['tpl-lo-portal-onboarding-process'] = () => wrap([row(h2('How joining Loan Factory works'), '0 32px 0'), B.p('Fill out your information below. Our team will call you to go over the details, then send you an offer and the agreement to review.'),
    B.steps([['Fill out your information', 'On this page, about 5 minutes.'], [`Pay the ${S.fee} one-time start-up fee`, 'By card.'], ['Give Loan Factory access to your NMLS record', 'So we can sponsor your license.'],
      ['Licensing sponsors you', `${B.link('licensing@loanfactory.com', 'mailto:licensing@loanfactory.com')} handles it.`], ['Review and sign the LO Agreement', 'E-sign online.'], ['HR sets up your account', 'And gives you an orientation.'], ['Start growing your business', `Full access to ${B.link('loanfactory.com', 'https://www.loanfactory.com')}.`]])]);
  P['tpl-lo-portal-startup-fee-desc'] = () => wrap([row(h2(`What the ${S.fee} start-up fee covers`), '0 32px 0'),
    B.bullets(['Background check', 'Business cards', 'Your own website (yourname.com)', 'Company email and Google Workspace', 'NMLS sponsorship']),
    B.small(`Questions? Write to ${B.link('support@loanfactory.com', 'mailto:support@loanfactory.com')}.`)]);
  P['tpl-lo-portal-done-thanks'] = () => wrap([`<tr><td style="padding:0 0 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8f5ec" style="background:#e8f5ec;border-radius:10px;"><tr><td style="padding:12px 16px;font-family:${T.font};font-size:15px;font-weight:700;color:#1d6b3a;">Payment successful</td></tr></table></td></tr>`,
    row(h2('Welcome to Loan Factory'), '0 32px 0'), B.p('Thank you for joining. Here is what happens next:'),
    B.steps([['Support reaches out', `${B.link('support@loanfactory.com', 'mailto:support@loanfactory.com')} answers any questions you have.`], ['Licensing sponsors you', `${B.link('licensing@loanfactory.com', 'mailto:licensing@loanfactory.com')} starts it. NMLS and state approval takes a few days.`], ['HR onboards you', `${B.link('hr@loanfactory.com', 'mailto:hr@loanfactory.com')} gives you an orientation and access to the platform.`]])]);
  window.mailkitPortal = (id) => (P[id] ? P[id]() : null);
  window.MAILKIT_TEMPLATES = K;

  // Render one rewritten email; null when this template has no rewrite (nurture text and others use renderText).
  window.mailkitRender = (id) => {
    const f = K[id]; if (!f) return null;
    const [kicker, ...rows] = f();
    return shell([B.header(kicker), ...rows]);
  };
  // Plain-text templates (Nurture, Send info) in the same shell: paragraphs, links in brand colour, footer with Unsubscribe.
  window.mailkitText = (htmlParas0, kicker, nurture) => { const htmlParas = htmlParas0.replace(/(<p style="margin:0 0 14px">)([^<]{3,120}\?)(<br>)/g, '$1<b>$2</b>$3'); return shell([B.header(kicker), row(`<div style="font-size:15px;line-height:1.6;color:${T.text};">${htmlParas.replace(/color:#1f5fbf/g, 'color:' + T.link).replace(/<p style="margin:0 0 14px">/g, '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">')}</div>`, '22px 32px 0'),
    B.footer(nurture ? NUR : 'You are getting this email from your Loan Factory recruiter.', nurture)]); };
})();
