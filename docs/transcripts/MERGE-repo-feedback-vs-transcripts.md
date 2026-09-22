# Merge report — repo FEEDBACK (Source A) vs raw transcripts (Source B)

Date: 2026-09-23 · Repo read from `recruit-be` **`origin/master`** after `git fetch` (not the local
checkout). Line numbers below are `origin/master` line numbers.

- **Source A** = `recruit-be/docs/FEEDBACK/{README,01..05}.md` + `docs/DECISIONS.md`,
  `CEO-FEEDBACK-2026-08-14.md`, `BRIEF-VICTORIA-2026-08-25.md`, `BACKLOG.md`, `STATUS.md`.
- **Source B** = the five raw transcripts in this directory, `extract/*.md`, `GAP-ANALYSIS.md`,
  `conflict-register.md`.

No repo file was edited. This file proposes edits only (§5).

Citation forms: `A:<file>:<line>` for repo files · `B:<meeting> <speaker> <mm:ss>` for transcripts,
where `<meeting>` is REC (05/08), HR (06/08), LIC (11/08), CEO (13/08), ONB (17/08). Quotes are
verbatim auto-transcript (errors kept) with an English gloss.

---

## 1. Verdict on the dates — outcome (a): Source A's dates are wrong as *meeting* dates

**These are the same five meetings, not ten.** Source A's dates are the dates Bao **relayed**
each meeting to an agent (or the capture/commit date). Source B's dates are the meeting dates.
**No sixth meeting is hidden in the gap.** Every repo file's content matches its transcript
point for point (checked below). What was actually missing was *any* written copy of the
meetings: Source A was built from Bao's retellings, Source B from the recordings.

### Evidence, meeting by meeting

| Meeting | A says | B says | Deciding evidence |
|---|---|---|---|
| Recruiting | 06/08 (`A:01-recruiter.md:3`) | **05/08** | In the HR recording Bảo calls the recruiting meeting "last night": *"Tối hôm qua mới mic là toàn kêu là mic quanh là không xài tới không cần"* ("Just last night in the meeting they kept saying it isn't used, not needed"). That is `B:HR Bảo 53:21`, about the 1-1/Calendly feature. The same point is made in `B:REC 8:16`: *"one-on-one meeting using Cently. Uh we never use it."* So REC is the day before HR. The repo's first commit `f9e8cea` landed **2026-08-06 17:47 +0700**, i.e. the day after, and is the capture date. |
| HR | **12/08** (`A:README.md:10`, `A:03-hr.md:23`) | **06/08** | A says outright that its source is Bao's message at **`2026-08-12T02:03:01Z`** (`A:03-hr.md:8-9`), a retelling and not the meeting itself. The CEO recording confirms HR had met *before* 13/08: *"tụi em hiện tại là đã hợp được với ba team là team Reputter Victoria với Rayan nè. Rồi với Yến bên HR và Ý bên licensing"* ("we have now met three teams: Victoria's recruiting team with Brian, Yến from HR, and Ý from licensing"; `B:CEO Bảo 0:22–0:34`). The mockup commit `c2876b0` (12/08 19:50) is titled "flow mới sau feedback HR (vòng 4, 12/08)", so it tracks the relay date too. |
| Licensing | **27/08** (`A:README.md:12`) | **11/08** | A's source is Bao's message at **`2026-08-27T07:34:25Z`** (`A:04-licensing.md:8-9`), which begins in the past tense: *"tôi **đã gặp** team đó"* ("I **have met** that team"; `A:04-licensing.md:11`). The CEO quote above (13/08) already lists Ý as met. The content matches exactly: 3–4 tickets/day (`A:04-licensing.md:106` ↔ `B:LIC 8:49` "tầm 3-4 người như vậy"), 80% to HQ San Jose (`A:04-licensing.md:124` ↔ `B:LIC 15:14`), 30–45 days (`A:04-licensing.md:213` ↔ `B:LIC 29:49`), "Accept removal" (`A:04-licensing.md:81` ↔ `B:LIC ~5:30–7:45`), an NMLS admin account for Onboarding (`A:04-licensing.md:161` ↔ `B:LIC 19:35`). |
| CEO | 14/08 (`A:CEO-FEEDBACK-2026-08-14.md:1`) | **13/08** | Mockup commit `76880a9` (**13/08 11:29**) is titled "AI mở lời có ngữ cảnh (**idea CEO 13/08**)". The repo file was committed 14/08 17:33 as *"Bao relay sau buổi demo"* (`A:CEO-FEEDBACK:3`); part 2 was *"nhận 15/08"* (received 15/08). Both are relay dates again. |
| Onboarding | **24/08** (`A:02-onboarding.md:3`) | **17/08** | This is the hardest one. Three signals, which I judge decisive together. **(1)** The mockup shown in the recording still has HOT and COLD on **one** page, and the split is described as a pending CEO wish: *"theo như anh Thuận F là anh Thuận muốn là hai cái store này nó vẫn là hai pay khác nhau chứ không phải là chung một pay như thế này"* ("per Thuận, he wants these two stores to be two separate pages, not one page like this"; `B:ONB Phung 1:12:38`). The split was decided as **D46 on 22/08** (`A:DECISIONS.md:63`, commit `99d2953` 21/08 22:39), and the separate Kho mockup was approved 24/08. A 24/08 demo would have shown it. **(2)** *"buổi lần học gần nhất anh Thuận có đưa ra một cái ý tưởng… mới nhất hôm thứ chắc thứ năm thứ sáu tuần trước"* ("at the latest meeting Thuận raised an idea… most recently, I think Thursday or Friday last week"; `B:ONB 1:39:56–1:40:30`). Seen from Monday 17/08, that is Thu 13/08 = the CEO meeting. **(3)** The Focus-inside-Today view and the "yesterday's unfinished tasks" banner shown at `B:ONB 1:05–1:12` were added in mockup commit `ab086d5` on **17/08 17:20 +0700** (items #17, #27/#31). So the meeting is no earlier than that evening (US morning). The repo file itself shows it was written from piecemeal relays on 24/08 (commits 17:50 → 22:19 that day; *"Bao: hình như end flow rồi đó"*, "looks like the flow has ended", `A:02-onboarding.md:5`). The content is the same meeting: $100 fee, W2/1099, "since 2022" ≥5 loans, the 4 experience levels, and setup call (`B:ONB 12:58, 17:07, 19:19, 26:08`). |
| Project owner | 22/07 (`A:05-project-owner.md:8`) | — (no transcript) | Not a meeting. It is Bao's memory of what Phuong Nguyen said, in one message (`A:05-project-owner.md:5-11`). |

**Weekdays:** 05/08 is a Wednesday, 06/08 Thursday, 11/08 Tuesday, 13/08 Thursday, 17/08 Monday.
They are consistent with the relative-time phrases above.

**Why A's README is wrong but A's files are honest.** Each rescue file correctly states the
timestamp of its *source message* (`03-hr.md:9`, `04-licensing.md:9`). The README then copied
those timestamps into a column headed **"Ngày họp"** ("meeting date"; `A:README.md:6`). That is
where the error entered. The same thing produced "HR evidence is 23 days old"
(`A:README.md:10`): the evidence is actually **~29 days** older than 04/09 (06/08 → 04/09),
and it is older than the decisions it is compared against.

**One knock-on in A that the dates break:** `A:05-project-owner.md:84-90` and
`A:03-hr.md:35-41` order the "five sources" as 22/07 → 05/08 (production measure) → 12/08 (Yen Vu).
With the true date, Yen Vu's statements (06/08) are only one day after the production
measurement, and they precede *all* decisions D23 onward.

---

## 2. Only in the repo (Source B never saw these)

1. **The project-owner session, 22/07** — Bao's memory of Phuong Nguyen: the 8-step process
   (`A:05-project-owner.md:44-72`), including step 5, "the steps are **optional** for signing"
   (`:60-63`). There is no transcript of it anywhere in B.
2. **Four legacy reports declared in scope**: Summary-Recruiting, Performance, Onboarding
   duration, Employment records. Three of them are untouched (`A:05-project-owner.md:70-72, 99-112`).
3. **Victoria brief 25/08** — six packaged questions (HOT sources + first-touch SLA, Q36 templates,
   Q35 cadence, Q23 status pruning, Q46 "since 2022" fixed vs sliding, D47 capacity cap), each with a
   3-source benchmark (`A:BRIEF-VICTORIA-2026-08-25.md:15-163`). It also carries the internal
   precedent callcenter `app_kpi_config` (Rocket 1h / FB 2h / Company 4h / self-gen 24h, escalate 5 min;
   `:171, :202`).
4. **Decisions taken after the meetings**, none of which B cites:
   - D23–D31 (recruiter round 3, 10/08; `A:01-recruiter.md:535-553`);
   - D32 e-sign via document-esign, D33 server-side view prefs, D34 default counters, **D35
     override "create account before conditions met" belongs to the recruit app, Onboarding role +
     reason + audit**, D36 shared activity feed (`A:DECISIONS.md:49-53`);
   - **D46 HOT/COLD = 2 pages + 2 roles** (22/08, `:63`), D47 capacity switch (`:64`), D50 call-outcome
     model (`:67`), D55 SLA per source + business hours (`:72`), D66 batch-claim (`:84`), D67 COLD
     routing deferred (`:85`);
   - **D76–D85 seat model**: Licensing narrow seat, HR + Accounting no seat in V1, Onboarding
     narrow seat, `MANAGER` global, `actor_external`, NMLS provenance flag, status-as-byproduct
     (`:94-103`);
   - **D86/D90** `LO_SUPPORT` + `OFFICER_RECRUITER` roles coexist with `RECRUITER`, same 12
     permissions (`:104, :108`), seeded in `V036__seed_kho_roles.sql:32-41`;
   - **D89** NMLS B2B access shelved; the free/manual path first (`:107`);
   - D104/D105/D111 business-hours SLA and "recruiter on leave is an assignment problem" (`:122-123, :129`).
5. **Questions closed 13/09**: Q8 state-rule table (`A:DECISIONS.md:234`), **Q10 sponsorship gate at
   S6→S7, `AT_LEAST_ONE` default** (`:236`), Q11 checklist templates per department (`:243`), and **Q12
   "100% onboarded = every mandatory item DONE/NA ∧ Q10 gate"** (`:244`).
6. **The legacy code for the joined gate**: `LORecruiting.java:741-746`, the only writer of
   `joined`. It requires sponsored ∧ HR completed ∧ setup_done, and checks no fee or signature
   (`A:03-hr.md:43-57`; the same rule at `:724-729` in `A:02-onboarding.md:81-82`, so the line numbers drifted between 24/08 and 04/09).
7. **Production measurements**: 2,601 "100% onboarded" of 23,602 ILO (05/08) and 2,603 (~26/08)
   (`A:03-hr.md:61-62`); RLO "Not claimed" 102,715 = 96.8% (`A:BRIEF-VICTORIA:105`); RLO has 10 statuses and ILO has 8
   (`A:DECISIONS.md:169`, `A:BRIEF-VICTORIA:189`).
8. **A production `AutoEscalationDesk` screenshot (12/08)** carries the HR create-account rule with
   default owner **Dave Hoan, dept 08-HR** (`A:03-hr.md:125-127`), and Rachel Ng as default recipient
   on 09-Licensing (`A:04-licensing.md:21-23`). This **answers B's open question "is Dave a person or
   the IT team?"** (`GAP-ANALYSIS.md:522-524`, §7 Q3): he is a named HR person (also
   `A:DECISIONS.md:221` "HR (Dave Hoang)", `A:PROJECT-CONTEXT.md:125`).
9. **The verbatim text of the create-account rule** ("hình 1", figure 1): *"1-1 Onboarding Meeting is
   **Pre-onboarding done** and Startup fee is Paid or Waived and Agreement is Signed and Status is
   Onboarding and License status is NMLS licensed and HR Status is HR not initiated"*
   (`A:03-hr.md:114-116`). That is six conditions. See §4-D2: this very likely dissolves B's "Onboarding D".
10. **The figure-1 vs figure-8 trap**, meaning two six-condition rules in one message that three sessions misread
    (`A:03-hr.md:129-145`).
11. **Code-verified onboarding mechanics (24/08)**:
    - the `register-loan-officer` key is a bare datastore key that never expires, and Next still works when unsigned (`A:02-onboarding.md:30-43`);
    - PayPal has **no webhook**, so a browser dying mid-payment leaves the record Unpaid (`:45-57`);
    - the e-sign envelope is **never** created unless `onboarding_specialist` is assigned and `meeting_date` is set (`:59-70`);
    - no legacy rule matches Miley's bare combo; the rules are named `ILO_PRE_MEETING_FEE_SIGNED` and `ILO_CREATED_US_BRANCH_CONTRACTOR` (`:74-84`);
    - W2 classification is computed from DB licences, plus a drifting hardcoded list (`:95-112`);
    - clicking "Invite" flips the status even when the email toggle is off (`:18, :147-150`).
12. **Design output from the onboarding session**: P1–P8 automation (`A:02-onboarding.md:116-128`), OB10
    offer policy gate with two unknown matrix cells (`:162-191`), OB11 four experience levels → a configurable
    rule (`:193-221`), OB12 setup-call mechanics including ticket `ILO_PRE_MEETING_HR_DONE` and the email
    `hr_status_changed_to_completed` (`:231-241`), and the brainstorm-2 benchmarks (`:256-290`).
13. **Licensing findings measured after the meeting**:
    - the "weekly reminder" Y remembered **does not exist** in code; there is only a conditional daily digest `DailyCheckOnboardingILOsCronOp` (`A:04-licensing.md:146-152`);
    - it is unknown whether the NMLS statuses belong to LF or to the state portal (`:29-36`);
    - regulators flip statuses by mistake, so Y re-checks (`:191-199`);
    - SLA numbers: new sponsorship 5–7 days, new application 30–45, "we quote 10 days" (`:211-217`);
    - still open: "Active license items" (`:181-185`) and NMLS API research (`:224-228`).
14. **HR findings measured 04/09**:
    - of the four "detect" questions, fee/signature have a real path that is not yet wired, and NMLS sponsored/licensed have no machine path (`A:03-hr.md:259-269`);
    - *"You can be fully onboarded even if this is incomplete"* on the to-do screen (`:207-210`);
    - e-sign stub citations (`:229-231`);
    - Bao's later decision: Onboarding role, button + reason → HR app (`:169-171`, later D35).
15. **Recruiter-file code findings**:
    - stat counters are cached for 8 days (R2);
    - the label bug is a regex that rejects spaces (R11);
    - **the CEO's Calendly PAT is shown in plaintext to 4/6 roles** (`A:01-recruiter.md:147-151`);
    - legacy auto-assign is pure round-robin by seniority, blind to load (`:165-176`);
    - `zoom`/`zoom-go` is Zoom Phone, not webinar (`:556`);
    - Google Workspace attendance tracking is live-verified (D40, `A:DECISIONS.md:57`).
16. **CEO-file investigations**: the Omni channel owner (imkhai) and its 14/08 platform decisions
    (`A:CEO-FEEDBACK:206-250`), the callcenter repo recon (`:343-357`), and the AI-team repos (`:161-163`).
17. **Reading rules and loss-mechanism notes**:
    - "one team does not decide for six" (`A:README.md:56-61`);
    - only explicitly attributed sentences count as department speech (`:32-34`);
    - the silent loss of `02-hr.md` (`:22-26`);
    - the coverage limit on "Accounting/Training never met", which rests on 3 of 315 transcripts scanned (`:36-47`).
18. **Relays from Bao between meetings**: Victoria "chưa muốn ép KPI" ("doesn't want to enforce KPIs yet"; 22/08, `A:DECISIONS.md:64`); Bao's
    *"Có tách"* ("yes, split them"), confirming a real staff split (22/08, `:63`).

---

## 3. Only in the transcripts (Source A lacks these)

Items the lead asked about are marked ★.

1. ★ **GA / OR / KY background-check branch inside the create-account rule.** *"kiểm tra coi là họ
   cái lo nào mà đang sống ở Oregon hoặc là họ sống ở chọt cha hoặc họ sống ở Kentucky á thì sẽ yêu cầu
   họ làm background check… pending background check… Rồi sau đó mới tới cái bước là tạo account"*
   ("check which LOs live in Oregon, Georgia or Kentucky, and require a background check… status
   pending background check… only then create the account"). That is `B:HR Yến 1:05:44`. The skip branch is in
   `B:HR Yến 1:06:11`. **Absent from A.** A mentions background checks only as a licensing-side,
   per-state concern (`A:MOCKUP-AUDIT.md:196-199`, `A:SPEC-SPONSORSHIP-QUEUE.md:153`), never as an HR
   step before account creation.
2. ★ **T3: licence approved while HR is still pending → nudge ticket to HR.** *"license đã xong rồi thì thì system sẽ
   bắn một cái ticket cho day lần nữa để nhắc"* ("the licence is done, so the system fires Dave another
   ticket as a reminder"; `B:HR Yến 27:29`; config screen `B:HR Yến 1:03:17`). **Absent.** A's only reverse
   ticket is `ILO_PRE_MEETING_HR_DONE` (HR done → Recruiting for the setup call, `A:02-onboarding.md:236-237`),
   which is a different rule.
3. ★ **The deliberate asymmetry.** Handoff fires both ways, but escalation never points at Licensing.
   On the no-chasing side: *"XR xong rồi mà licens chưa xong thì thì không có bắn ticket ra nha… mình không có hối
   được do là bên bên một phía thứ ba nó đang process licens"* ("HR done but licensing not done: no
   ticket… we can't chase, because a third party is processing the licence"; `B:HR Yến 28:22–28:43`).
   On the Licensing→departments handoff when sponsored: *"khi mà update qua NMS Sponsor… có một số department
   sẽ được nhận được ticket"* ("on setting NMLS Sponsored… several departments receive a ticket"; `B:LIC 1:42–1:49`).
   **A has half of it.** It has HR→Licensing (`A:04-licensing.md:104-110`) and the removal email cc HR+Onboarding
   (`:92-95`). It has neither the Licensing→HR handoff on approval nor the "never escalate at Licensing, the
   processor is external" rule. A's framing points the other way: see §4-D11.
4. **T6: 100% onboarded → a ticket to Benjamin's support/training team.** *"sau cái 100%… team Benjamin sẽ
   hình như sẽ nhận được tích kịch rồi liên hệ với mấy cái người đó để mà cho training"* ("after 100%,
   Benjamin's team apparently gets a ticket and contacts them for training"; `B:HR Yến 51:04`).
   Corroborated by `B:ONB Miley 28:08` *"khi mà nó nhảy về 100% á nó sẽ tới team là team support"* ("when it
   hits 100% it goes to the support team"). **Absent.** A's `README.md:14` says Training has "no trace of having met". But
   Benjamin *attended* REC 05/08 (front matter, "Support / Onboarding"), and his team's trigger is
   documented here.
5. **T7/T8: Deny-by-LO ↔ account deactivation, in both directions.** Onboarding sets Deny by LO → a ticket to Hoàng to
   disable the account (`B:HR Yến 1:01:04`). An account deactivated on the Associate page → the status
   auto-flips to Deny by LO (`B:HR Yến 49:36`). **Absent as a business rule.** A mentions `denied_by_LO` only as
   the STOP-SMS side effect (`A:BRIEF-VICTORIA:178`, `A:03-hr.md:85`).
6. **T10: a welcome email on account creation** (`B:HR Yến 14:07`). **Absent** (the grep for "welcome email" in A
   finds nothing).
7. ★ **Brand → brand manager → leave-approval routing.** *"mình phải x brand để có cái mục brand manager
   ở trong đó nữa… khi mà mình submit lif request á thì brand manager cũng được include ở trong cái
   thông báo luôn"* ("we need brand so there is a brand-manager field… when a leave request is
   submitted the brand manager is included in the notification"; `B:HR Yến 11:27`; *"Mấy cái đó cần thiết
   mà"* "those are necessary", `11:50`). **Absent.** A has only the brand-derivation rule (`A:03-hr.md:186-189`).
8. **Two competing positions on brand in the new system**, both absent from A:
   - chị Phương: *"Bảo cứ đẩy data qua bên qua bên thôi… mình chỉ gửi qua bên cái System á là cái địa chỉ của người ta thôi"*
     ("just push the data across… we only send the person's address to the System"; `B:HR Phương 12:18`);
   - relayed CEO: *"anh Thuận nói là br ở bên system mới không có"* ("Thuận said brand doesn't exist in the new system"; `B:HR 11:11`).
9. ★ **The setup-call ordering contradiction in code.** `ONB_SETUP_CALL` is an `ON_100_ONBOARDED`
   template, "fired on 100% onboarded" (`V067__checklist_templates.sql:127-133`). But setup call is one of
   the three gates *to* 100% (`GAP-ANALYSIS.md:111-116`). **Absent from A as a finding.** A actually
   proposed the opposite, "Setup Call = the last checklist item of S6", but it was
   never carried through (`A:02-onboarding.md:244-254`). See §4-D5.
10. ★ **Refund branch for self-paying LOs who fail the bar.** *"Nếu mà không đủ điều kiện thì mình sẽ
    refund lại cái tiền 100 đô đó"* ("if they don't qualify we refund the $100"; `B:ONB Miley 38:31`).
    *"nhiều case là tụi chị background check xong thế xong lại phải trả lại họ tiền kêu HR trả lại họ tiền"*
    ("in many cases we finish the background check and then have to ask HR to refund them"; `B:ONB Victoria 39:54`).
    Bad-review risk: extract `onboarding-miley-2026-08-17.md:462`. **Absent.** A has no refund anywhere, and its
    `payments` proposal (`A:02-onboarding.md:278-282`) has no refund event.
11. **Request: gate self-payment behind the background check.** *"tụi chị không muốn họ được trả luôn tiền
    cho tụi chị luôn ấy mà là tất cả mọi thứ là phải qua tụi chị background check rồi này nọ thì mới
    được trả tiền"* ("we don't want them able to pay us straight away; everything must pass our
    background check before they can pay"; `B:ONB Victoria 39:45–39:49`). Self-pay path on the landing page: `B:ONB
    Miley 41:08`. **Absent.** A's OB10 policy gate (`A:02-onboarding.md:162-191`) gates the *offer*, not
    payment on the public page.
12. **Phương Nguyễn has left.** *"quá trời mấy tháng rồi mà vẫn chưa làm xong gì á từ thời Phương
    Nguyễn luôn á. Thế xong rồi Phương Nguyễn trước khi rời đi là cũng nói…"* ("months and still not
    done, since Phương Nguyễn's time. And Phương Nguyễn, **before leaving**, also said…";
    `B:ONB Victoria 39:28–39:36`). **Absent, and it collides with A**, which routes its highest-authority open
    questions to "chị Phương" (`A:05-project-owner.md:111, :118-123`; `A:03-hr.md:283`). **Unresolved:**
    a chị Phương is present on 13/08 (`B:CEO Phương 4:43`) and 06/08 (`B:HR Phương 12:18`). So either she
    left between 13/08 and 17/08, or Victoria means a different Phương Nguyễn (an earlier Tera PM).
    **What settles it:** ask Bao whether the Phuong Nguyen of `05-project-owner.md` is still in role.
13. ★ **Partner (Rocket) LO lists re-entered by hand.** *"kể cả là partner ví dụ Rockit cũng gửi cho tụi
    chị các list để mình xong rồi tụi chị phải menu add những cái list đó lên ấy"* ("even partners like
    Rocket send us lists and we have to add them manually"; `B:ONB Victoria 1:41:24`). **Absent.** In A,
    "Rocket" only appears as a *callcenter lead source with a 1h SLA* (`A:BRIEF-VICTORIA:171`,
    `A:DECISIONS.md:72`), which is a different thing.
    *Correction to the brief:* the "~100 emails/day" is a **separate** ask, not the Rocket lists. It is about the shared
    `recruiting@loanfactory.com` inbox that everyone works in, which Victoria wants surfaced in the app:
    *"một ngày tụi chị nhận cả trăm cái email"* ("we get a hundred emails a day"; `B:ONB Victoria 1:42:23–1:42:44`).
    Also absent from A. A shows `recruiting@` only as a *sender* address (`A:01-recruiter.md:364`).
14. ★ **The 1-1 meeting is booked by hand while the Calendly button goes unused.** *"cái này hình như là one one này
    là còn meet ở Clly… tạm thời cái đấy là tụi chị không có dùng bây giờ luôn"* ("this 1-1 seems to be
    Calendly… for now we don't use it at all"; `B:ONB Victoria 29:34–30:07`). Booking goes via Google Meet
    + text/email (`B:ONB 30:11`). **Stated differently in A:** see §4-D9.
15. **Onboarding list assignment is an explicit round-robin, plus a same-person rule.** *"Miley te đầu tiên, Sarah sẽ là
    người thách thứ hai, rồi Liz sẽ là người thách thứ ba… vòng lặp đấy lại lặp lại"* ("Miley takes first,
    Sarah second, Liz third… the loop repeats"; `B:ONB Victoria 55:05`). If the recruiter is also an OS, the
    same person keeps the LO (`B:ONB Victoria 55:43`). **A has only a generic proposal**, "auto-assign OS
    round-robin/capacity" (`A:02-onboarding.md:121, :139`), without the stated order or the same-person rule.
16. **Hotline ring chain** Brian → Miley → Vina → … → Victoria (`B:ONB Victoria 1:38:18`). HR/Licensing use
    shared hotlines split by shift, not by owner (`B:ONB Miley 1:38:33–1:39:27`). **Absent.**
17. **Victoria tracks Brian's ad-hoc projects in Excel** and asks for that in-app (`B:ONB Victoria
    1:14:01–1:14:37`). **Absent.**
18. **The 13/08 CEO directive "stop designing from Victoria's habits".** *"cái lỗi của em là tối ngày em cứ nghe lời chị Recruiter
    chị Victoria em build theo ý của họ là em chết ngắc rồi"* ("your mistake is constantly listening to
    Victoria and building to their wishes; that will kill you"; `B:CEO Thuận 30:49`); *"cái kiến thức của
    Victoria không phải lúc nào cũng đúng"* ("Victoria's knowledge isn't always right"; `1:09:35`). **Absent** from
    `A:CEO-FEEDBACK`. This matters because much of A's design cites Victoria as the deciding voice
    (e.g. OB10/OB11, D47).
19. **CEO: auto-create the employee account on the three conditions, and let the LO pick their company email.**
    Account: *"nó bắn cái request bên extra và cái phần mềm của sẽ tạo account luôn"* ("it fires the request and their
    software creates the account"; `B:CEO Thuận 1:21:56`). Email: *"Bây giờ bạn muốn chọn cái email là gì? Cho họ chọn"*
    ("which email do you want? let them choose"; `1:22:27`), *"anh muốn tương lai là mọi thứ phải tự động hóa"* ("I want everything automated in future";
    `1:22:47`). **Absent** from `A:CEO-FEEDBACK`. A still records company email as a manual HR pain
    (`A:03-hr.md:180-181`) with no CEO direction attached.
20. **CEO: "you can deliver step by step, but everything must eventually be automated"** (`B:CEO Thuận 1:24:29`). **Absent.**
21. **Victoria's rationale against recruiter auto-assign**, and the room's convergence on SLA-release
    (`B:REC Victoria 12:44–13:22`, `28:23–28:46`, `29:15`; `conflict-register.md:24-45`). **A carries a
    different rationale:** see §4-D7.
22. **The HR↔Licensing name in HR's own words**: *"nãy mới nói chuyện với Yến Ngô"* ("I was just talking with Yến Ngô"; `B:HR Yến 18:34`).
    See §4-D12.

Items the lead listed that A **does** contain (so they are not in this section): peer-to-peer
self-serve reassignment and manager-only-for-absence (`A:CEO-FEEDBACK:271-272, 311-313`); the HOT/COLD
two-page split (`A:DECISIONS.md:63`); per-team SLA (`A:CEO-FEEDBACK:274`). Each of these is **worded
differently**, as covered in §4.

---

## 4. Stated differently in each (the section that matters)

**D1 — Meeting dates.** Resolved in §1: A's README column holds relay dates.

**D2 — How many conditions the create-account rule has, and what "Onboarding D" is.**
- A: six conditions, the first being *"1-1 Onboarding Meeting is **Pre-onboarding done**"* (`A:03-hr.md:114-116`).
- B: seven, with a 7th "Onboarding D" called *"unresolvable from the transcripts"*, which blocks T1
  (`GAP-ANALYSIS.md:357, 473-474, 536`; `extract/hr-yenvu-2026-08-06.md` TRIGGER-1 row 7).
- Transcript: at `B:HR Yến 1:06:33` she lists P, signed, onboarding, NMLS license, HR not initiated, then adds
  *"À cái này nữa nè. Cái này phải là onboarding D reonbarding D"* ("oh, and this one too, this must
  be 'onboarding D / re-onboarding D'"). That restatement had **left out** the 1-1 meeting condition she
  gave first at `1:12` (*"cái 11 onbarding meting nó sẽ hiện là pre onbarding"*, "the 1-1 onboarding meeting will show pre-onboarding").
- Reading: "onboarding D" is almost certainly **"Pre-onboarding D[one]"**, i.e. condition 1 recalled late. It is not a
  seventh field. A's verbatim rule text supports this, and A says it matches a production config screenshot (`A:03-hr.md:125-127`).
  B's own glossary rule ("clean form attested elsewhere") is satisfied by A. B simply never saw A.
- **Settles it:** the 12/08 `AutoEscalationDesk` screenshot referenced in `A:03-hr.md:125`.
- Risk if unmerged: B's §7 Q1 is marked "do not implement T1 until answered" and could block the gate for no reason.

**D3 — What "100% onboarded" requires.**
- A: *"Năm nguồn, năm câu trả lời"* ("five sources, five answers"; `A:README.md:51`, `A:03-hr.md:35-41`), including Yen Vu's "hình 8" (figure 8) **6 mandatory
  conditions** incl. fee and signature (`:38`). Its current decision is **Q12 (13/09): every mandatory checklist item DONE/NA ∧ Q10**
  (`A:DECISIONS.md:244`).
- B: Yến in person gives **three** statuses from three teams, self-corrected: *"Cái điều kiện mà 100% đó là ba cái.
  Thứ nhất là completed nè rồi sponsor nè. thêm cái phải là đ setup coding nữa"* ("the condition for 100% is
  three things: completed, sponsored, plus setup [call]"; `B:HR Yến 55:11`; two-condition form first at `22:48–23:49`).
  Miley corroborates: *"cái sponsorship được approve nè, licensing họ chỉnh nè… thì lúc đấy là mới nhảy qua là 100%"*
  ("sponsorship approved, licensing sets it… only then it jumps to 100%"; `B:ONB Miley 27:55`).
- What decides it:
  - **The legacy rule is settled.** B's first-hand statement matches A's source 4, the code
    (`A:03-hr.md:43-57`), exactly. A's "hình 8, 6 conditions" is Bao's retelling and **is contradicted
    by Yến's own words**.
  - **The new-system rule is not settled.** Q12 (all-mandatory-items) is a deliberate redefinition, and B shows it cannot express the setup-call gate (D5).
  - Settle it by asking Yến/Miley whether Q12's model is acceptable, with the setup-call order fixed.

**D4 — Can a fee-waived candidate reach 100%?**
- A: an open question. Figure 1 accepts Paid *or* Waived, figure 8 only Paid, so *"ứng viên được miễn phí… KHÔNG BAO GIỜ tới được
  100% onboarded"* ("a fee-waived candidate… NEVER reaches 100% onboarded"; `A:03-hr.md:142-145`). It blocks the `WAIVE_FEE` split (`:145`, `:280`).
- B: the 100% rule has **no fee term at all** (`B:HR Yến 22:48, 55:11`). The fee is in T1 only, as *"p hoặc là wave"* ("Paid or Waived"; `B:HR Yến 1:28`).
- The evidence decides this one: the worry dissolves. A waived candidate passes T1, and 100% never checks the fee. The question (`A:03-hr.md:280`) can close.

**D5 — The setup call: who owns it, and does it come before or after 100%?**
- A (24/08 design): *"Setup Call = checklist item cuối của S6, owner = Recruiting… Confirm xong → checklist 100% → tự chuyển Active (S7)"*
  ("Setup Call = the last S6 checklist item, owner = Recruiting… once confirmed → checklist 100% → auto-move to Active (S7)"; `A:02-onboarding.md:244-248`). The narrated flow says
  *"Recruiting đặt buổi final meeting = Setup Call"* ("Recruiting books the final meeting = Setup Call"; `:225-226`).
- Code on `origin/master`: `('ct-onb-setup-call', 'ONBOARDING', 'ONB_SETUP_CALL', …, 'Old ticket 14 — Setup Call, fired on 100% onboarded.' … 'ON_100_ONBOARDED')`
  (`V067__checklist_templates.sql:132-133`). The owner is ONBOARDING, and it fires *after* S7.
- B: the owner is the onboarding side (*"set up coden á cái này là bên phía onboarding specialist"*, "setup call is on the onboarding-specialist side", `B:HR Yến 55:11`).
  Victoria: *"tụi chị phải set up. Có một cái gọi là setup call… tin của chị onbarding lại phải gọi cho họ một lần nữa"*
  ("we have to set up… there's something called a setup call… my onboarding team has to call them again"; `B:ONB Victoria 26:03–26:13`). It is a **gate to** 100% (`B:HR Yến 55:11`; `GAP-ANALYSIS.md:111-116`).
- **Two errors, one in each place.**
  - A's "owner = Recruiting" conflates Victoria's department (which includes the onboarding specialists) with the recruiter role.
  - V067's comment "fired on 100% onboarded" contradicts A's own code reading. In A's reading, the legacy system nudges Recruiting on *HR done*
    (`ILO_PRE_MEETING_HR_DONE`, `A:02-onboarding.md:236-237`), and `setup_done` is an *input* to `joined`.
  - Settle both with Miley plus a read of the legacy ticket 14 config.

**D6 — The new role "loan officer recruiter" and retitling current staff.**
- B (CEO): *"anh đề nghị là những nhân viên hiện giờ gọi là recuer đó mình nên đổi họ thành cái một cái tle khác… customer service"*
  ("I propose the staff now called recruiters get a different title… customer service"; `B:CEO Thuận 1:35:51`). The new
  "officer recruiter" works the cold list (`1:34:37`, `1:35:23`), and *"em nói chuyện với Victoria"* ("talk to Victoria"; `1:35:23`).
- A: the split is modelled as **roles on two queues**: `LO_SUPPORT` (HOT) and `OFFICER_RECRUITER` (COLD) (`A:DECISIONS.md:63`). But
  *"`RECRUITER` **không** thành legacy, **không migrate ai** — 5 người đang giữ nó giữ nguyên"* ("RECRUITER does **not** become legacy, **nobody is migrated**; the 5 people holding it keep it"; `:104`, D86). The same
  three roles share one permission set (`:108`, D90), seeded in `V036:32-41`.
- B's GAP says *"❌ not in `RecruitPermission` / role seed"* (`GAP-ANALYSIS.md:193`). **That is false.** V036 seeds it.
- Nobody in either source records **telling Victoria**, and A deliberately does *not* retitle anyone.
- This is a directive with an owner (Thuận → Victoria) that A silently narrowed into a queue split. Settle it by asking whether
  Victoria was told, and whether "retitle" means a system role or a job title.

**D7 — Auto-assign.**
- A (recruiter): *"sợ member overload"* ("afraid of overloading members"); they want **push at the later stages** (`A:01-recruiter.md:159-170`).
- B (REC): *"We don't even have that many leads per day… like 10 leads… it's not like it saves us time"*
  (`B:REC Victoria 13:13–13:22`); *"it's a first line… they are basically sales people"* (`28:23`, via conflict-register).
- B GAP goes further: **"do not build it at all"** (`GAP-ANALYSIS.md:318-325`).
- That conflicts with A's P1 (auto-assign the OS on invite, `A:02-onboarding.md:121, :139`) and with Victoria's own 17/08 ask for an
  **onboarding** round-robin (`B:ONB Victoria 55:05`).
- The CEO statements GAP relies on (`B:CEO Thuận 1:10:16–1:14:01`) are about *recruiter workload rebalancing*, not onboarding assignment.
- Settle by recording per role: recruiter = claim-first (both sources agree); onboarding = round-robin (Victoria 17/08). GAP §5 #10 should be narrowed to recruiters.

**D8 — The first-touch SLA "1h (they said) vs 3h (company rule)".**
- A: *"Re **phải liên lạc LO trong 3h**… Re khác đang rảnh và gọi được trong 1h"* ("recruiters **must contact the LO within 3h**… another recruiter is free and can call within 1h"; `A:01-recruiter.md:162-163`). This is carried
  as *"First-touch SLA là **1h** (họ nói) hay **3h**"* ("is the first-touch SLA **1h** (as they said) or **3h**?"; `:191, :521`) and fed into Q34.
- B: the 1h was a **hypothetical**: *"what if you assign automatically to someone but that person doesn't work on that
  lead until like 3 hours later but someone that they can take it in like one hour"* (`B:REC Victoria 12:50–13:06`).
  The values actually floated were 1–2h, 3h, and 3 or 5 business hours, all deferred (`conflict-register.md:65-68`).
- Nobody stated 1h as a target, so Q34's "1h" option has no source.

**D9 — Calendly for the 1-1.**
- A: *"Có Re nói nếu dùng thì chỉ dùng tab **1-1 Meeting using Calendly**, nhưng Google Calendar tiện hơn"*
  ("one recruiter said that if they use it at all, it's only the **1-1 Meeting using Calendly** tab, but Google Calendar is more convenient"; `A:01-recruiter.md:136-138`). A then argues Calendly was chosen for booking tracking (`:140-145`), so Q39 is framed as
  "keep Calendly or switch" (`A:DECISIONS.md:184`).
- B: *"the only thing that we don't really use is the one-on-one meeting using Cently. Uh we never use it"*
  (`B:REC 8:11–8:21`), and 12 days later *"tạm thời cái đấy là tụi chị không có dùng bây giờ luôn"* ("for now we don't use it at all"; `B:ONB Victoria 30:07`).
- B is two independent statements that it is **unused**. Q39's premise, that tracking currently depends on Calendly, describes the
  config screen, not practice.

**D10 — Brand.**
- A: *"Cả ba đều là luật máy làm được"* ("all three are rules a machine can do"; `A:03-hr.md:191`). Brand derivation is treated as automatable in the recruit flow.
- B: *"bảo đừng có quan tâm tới cái friend này nè. Bảo cứ đẩy data qua"* ("Bảo, don't worry about brand; just push the data"; `B:HR Phương 12:18`). Brand stays because of
  the brand manager (`B:HR Yến 11:27`), and Thuận reportedly said it doesn't exist (`11:11`). Three positions, no decision (`GAP-ANALYSIS.md:539`).
- Risk: someone builds brand logic in recruit-be on A's reading. Settle with Yến + Phương (subject to §3 #12).

**D11 — Sequencing between HR and Licensing.**
- A: *"Nó tuần tự vì **con người đang làm đường truyền tin**… Ràng buộc thật chỉ là **kiểm tra lý lịch → bảo trợ**"*
  ("it is sequential because **people are acting as the message carrier**… the only real constraint is **background check → sponsorship**"; `A:04-licensing.md:112-114`). The implication is to parallelise.
- B: sequencing is partly structural:
  - HR→Licensing is triggered by "HR onboarding" (`B:HR Yến 17:38`; `B:LIC 8:58`);
  - the background check is an **HR** step before account creation, only in GA/OR/KY (`B:HR Yến 1:05:44`);
  - there is no escalation toward the external licence processor (`B:HR Yến 28:43`).
- A's "real constraint" is right in shape but puts the background check on the wrong side, and it misses the no-escalation rule.

**D12 — Who the licensing lead is.** A: "Y Ngo", with Dung Nguyen as the department's responder (`A:04-licensing.md:19-21`).
B: "Ý" (`B:LIC` glossary), and HR calls her *"Yến Ngô"* (`B:HR Yến 18:34`). Probably ASR or a nickname. Settle before the name goes into any seed or notification.

**D13 — "HR and Licensing never reviewed".** A (24/08): *"Không có feedback HR/Licensing cũ nào mâu thuẫn — vì họ
CHƯA từng review"* ("there is no earlier HR/Licensing feedback that contradicts this, because they have NEVER reviewed it"; `A:02-onboarding.md:83-84`). B: both had met on 06/08 and 11/08 (`B:CEO Bảo 0:22–0:34`). A's README corrected this on
04/09 (`A:README.md:16-20`), but `02-onboarding.md:83-84` and its follow-up item 2 (`:297`, "take OB8 into the HR (Dave) and
Licensing (Dung) meetings") still read as if those meetings were in the future.

**D14 — Training / Benjamin "never met".** A: *"chưa tìm thấy dấu vết đã-họp"* ("no trace found of a meeting having taken place"; `A:README.md:14`). B: Benjamin sat in the
05/08 recruiting meeting as Support/Onboarding (REC front matter; `B:REC Benjamin 18:46` via conflict-register), and his
team's trigger is documented (`B:HR Yến 51:04`). There has still been no *Training-department* walkthrough, so A's claim is narrowly true but misleading.

**D15 — Q8/Q10 status inside A itself.** Open per `A:README.md:12` and `A:04-licensing.md:237-239`. **CHỐT 13/09** (decided 13/09) per
`A:DECISIONS.md:234, :236`. The rescue file predates the decisions and was never refreshed.

**D16 — Three numbering schemes for the CEO's directives, one of which collides with DECISIONS.**
- A numbers them #1–#38 (`A:CEO-FEEDBACK:12-35, 262-276`). The extract numbers them D1–D54 (`extract/ceo-thuan-2026-08-13.md`).
  GAP §3 uses a third, stale set (#25 "don't build chat" = extract D28; #44 HOT/COLD = extract D46; #47 new role = extract D49;
  `GAP-ANALYSIS.md:182-193`).
- GAP §4 cites **"D36 / D37 / D41"** (`GAP-ANALYSIS.md:272-275, 323-324`). In the repo those IDs are *activity-feed sharing, offer
  snapshot, block_display migration* (`A:DECISIONS.md:53, :54, :58`).
- Anyone reading "D37 manager absence-coverage" in B will open the wrong decision in A.
- A's CLAUDE.md-level references ("CEO #35", "CEO #37") are A's own scheme.

**D17 — Number of W2-mandatory states.** A: a hardcoded list of 10 (`A:02-onboarding.md:110-111`) that drifts from the DB cache.
B: *"hình như 13 14 gì tửa bang"* ("I think 13 or 14 states"; `B:ONB 19:19`). Minor. A's own advice to use one source (settings) stands.

---

## 5. Recommended merge (proposals — nothing edited)

**From §1**
- 1 → `recruit-be/docs/FEEDBACK/README.md`: rename the column "Ngày họp" to "Ngày relay". Add a "Ngày họp (transcript)" column
  with the values 05/08, 06/08, 11/08, 13/08, 17/08, and link `agentflow/docs/transcripts/`.
- 1 → `03-hr.md:23-25` and `README.md:10`: change "23 ngày tuổi / 12/08" ("23 days old / 12/08") to "meeting 06/08, relayed 12/08".
- 1 → `02-onboarding.md:3`, `01-recruiter.md:3`, `CEO-FEEDBACK-2026-08-14.md:1`: add the true meeting date beside the relay date.

**From §2 (repo → transcripts)**
- 2.1–2.2 → `GAP-ANALYSIS.md` §7: add "project owner 22/07 (memory only) says steps are optional", plus the four reports as scope questions.
- 2.3 → `GAP-ANALYSIS.md` §2.1: cite the BRIEF's callcenter SLA precedent next to the SLA rows.
- 2.4–2.5 → `GAP-ANALYSIS.md` §0: add a "decisions already taken" table (D35, D46, D76–D90, Q8/Q10/Q11/Q12) so B stops re-deriving them.
- 2.6–2.7 → `GAP-ANALYSIS.md` §6 T5: cite `LORecruiting.java:741-746` and the 2,601/2,603 counts.
- 2.8 → `GAP-ANALYSIS.md` §6 "Attribution still open" + §7 Q3: close it. Dave = Dave Hoan/Hoang, HR (per A).
- 2.9 → `extract/hr-yenvu-2026-08-06.md` TRIGGER-1 + `GAP-ANALYSIS.md` §6/§7 Q1: mark "Onboarding D" as probably "Pre-onboarding done", pending the screenshot (§4-D2).
- 2.10 → `extract/hr-yenvu-2026-08-06.md`: add the figure-1 vs figure-8 warning.
- 2.11–2.12 → `extract/onboarding-miley-2026-08-17.md`: add a "code-verified in A" column pointing at OB2–OB12.
- 2.13 → `2026-08-11_y_licensing-walkthrough.GLOSSARY.md` or a new licensing extract: add the "weekly reminder doesn't exist" finding and A's timing table.
- 2.14 → `GAP-ANALYSIS.md` §2.2: add the 04/09 detect-path table.
- 2.15 → `GAP-ANALYSIS.md` §5 cross-cutting: add the CEO Calendly PAT exposure.
- 2.16–2.18 → no merge needed (context). Link from `GAP-ANALYSIS.md` sources.

**From §3 (transcripts → repo)**
- 3.1, 3.2, 3.3, 3.5, 3.6 → `03-hr.md`: add a "Trigger rules T1–T10 (from recording 06/08)" section with the GA/OR/KY branch, T3, the T4 asymmetry, T7/T8 and T10.
  Also 3.3 → `04-licensing.md` §5: add the Licensing→departments ticket on approval.
- 3.4 → `README.md:14` + `DECISIONS.md` Training section (`:256`): record the T6 trigger and that Benjamin attended 05/08.
- 3.7, 3.8 → `03-hr.md` §4 (brand): add brand manager → leave routing, plus the three positions.
- 3.9 → `02-onboarding.md` OB12: flag that V067 implemented Setup Call as `ON_100_ONBOARDED`, contradicting OB12 and the gate.
- 3.10, 3.11 → `02-onboarding.md` new OB13 "refund + gate self-pay behind background check". Also a Q line in `DECISIONS.md` §3.
- 3.12 → `05-project-owner.md` "Việc còn lại" (remaining items): a warning that chị Phương may have left (`B:ONB 39:36`); confirm before routing questions to her.
- 3.13 → `01-recruiter.md` (new R23 Rocket manual import; R24 shared `recruiting@` inbox) + `BACKLOG.md` §import.
- 3.14 → `01-recruiter.md` R7 + `DECISIONS.md` Q39: "unused per two recordings".
- 3.15 → `02-onboarding.md` OB1/P1: add Victoria's explicit Miley→Sarah→Liz order and the same-person rule.
- 3.16, 3.17 → `02-onboarding.md` new OB14 (hotlines) and OB15 (ad-hoc project tracking), marked `CHỜ-6-TEAM` (wait for all 6 teams).
- 3.18, 3.19, 3.20 → `CEO-FEEDBACK-2026-08-14.md`: add a part 3 "from recording" with these directives and their timestamps.
- 3.21 → `01-recruiter.md` R8: add Victoria's own rationale (10 leads/day, first-line sales) beside "overload".
- 3.22 → see D12.

**From §4 (discrepancies)**
- D2 → `03-hr.md` + `GAP-ANALYSIS.md`: one shared note, "6 conditions; 'Onboarding D' = Pre-onboarding done (probable)".
- D3 → `03-hr.md` five-source table: mark source 2 ("hình 8") as **contradicted by Yến's own recording (55:11)**. Keep Q12 as the new-system rule.
- D4 → `03-hr.md:280` question 1: close it. `WAIVE_FEE` is unblocked.
- D5 → `02-onboarding.md` OB12 + a new bead against `V067`: decide the setup-call trigger and owner.
- D6 → `DECISIONS.md` D86 + `GAP-ANALYSIS.md:193,541`: fix GAP's "not seeded". Add "Victoria told? retitle = title or role?" to both.
- D7 → `GAP-ANALYSIS.md` §5 #10: narrow "do not build" to recruiters only. `01-recruiter.md` R8: cite 17/08 onboarding round-robin.
- D8 → `01-recruiter.md:162-163, 191, 521` + `DECISIONS.md` Q34: remove "1h (họ nói)" ("1h, as they said") as a sourced value.
- D9 → `DECISIONS.md` Q39: restate the premise.
- D10 → `03-hr.md` §4: remove "Cả ba đều là luật máy làm được" ("all three are machine-doable rules") for brand, or qualify it with Phương's 12:18 instruction.
- D11 → `04-licensing.md:112-114`: move the background check to HR (GA/OR/KY) and add "no escalation toward Licensing".
- D12 → `04-licensing.md:19` + the transcript front matter: add a name-alias note.
- D13 → `02-onboarding.md:83-84, :297`: strike "chưa từng review" ("never reviewed").
- D14 → `README.md:14`: reword.
- D15 → `04-licensing.md:236-239` + `README.md:12`: mark Q8/Q10 as CHỐT 13/09.
- D16 → `GAP-ANALYSIS.md` §3/§4: re-key to the extract's D-numbers, prefixed `CEO-D` (e.g. `CEO-D49`), so they never collide with repo `D`.
- D17 → no change. OB9's "single source in settings" already covers it.

---

## Counts

- §1: 6 date rows, **1 verdict (a)**. No additional meetings found.
- §2 Only in repo: **18**
- §3 Only in transcripts: **22** (9 of them the lead's ★ items; 3 more lead items found present in A and moved to §4)
- §4 Stated differently: **17**
