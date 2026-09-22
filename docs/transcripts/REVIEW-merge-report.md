# Adversarial review — `MERGE-repo-feedback-vs-transcripts.md`

Date: 2026-09-23 · Reviewer: independent session. I did not edit any file except this one.
Repo files read from `recruit-be` **`origin/master` @ `288eb81`** after `git fetch`. I exported them
with `git show origin/master:<path>`, and the line numbers below are `origin/master` line numbers.
Legacy code was read from `packs` `origin/master`.

Citation forms follow the report: `A:<file>:<line>` for repo files, `B:<meeting> <mm:ss>` for
transcripts. Transcript *line* numbers are given as `file L<n>` where a timestamp is ambiguous.

---

## 0. Verdict first

| | Count |
|---|---|
| Claims checked and **confirmed** | 34 |
| Claims **false or unsupported** | 5 |
| Claims **true but overstated**, or resolved the wrong way in §4 | 7 |
| Claims I **could not check** | 4 |

**The date verdict.** Its conclusion is right: the repo's dates are relay or capture dates, and
there are five meetings. Two parts of its reasoning are wrong or weaker than stated, and one
repo-level framing is false. §1 below sets the problems out. None of them overturns the verdict,
but two change what the README correction should say.

**May the repo edits proceed?** Yes for most of them, but not as written for five:
the onboarding date line, D5, D8, D9 and D11. The D16 re-key also needs one fix before anyone
applies it. §5 has the exact changes.

---

## 1. The date verdict — checked claim by claim

### 1.1 The five pieces of evidence the lead asked about

| # | Report's evidence | Result | Citation |
|---|---|---|---|
| 1 | On 06/08, Bảo calls the recruiting session *"tối hôm qua"* at 53:21 | **CONFIRMED text.** **Could not check the speaker.** The line is unlabelled `>>`, and nothing marks it as Bảo. A **stronger** line two minutes later is labelled no better, but it names the source: *"À thì hôm qua em có nghe Ryan là họ không xài cái cục đó mà họ xài cái Google calender"* ("yesterday I heard Ryan [= Brian] say they don't use that thing, they use Google Calendar"). That matches `B:REC 8:11–8:38` directly. A third line, 1:02:42, also says *"giống như ngày hôm qua… chia ra round Robin"* ("like yesterday… split round-robin"). | HR L1323 (53:21), L1393 (56:07), L1581 (1:02:42) |
| 2 | On 13/08 at 0:22–0:34 the team has met Victoria, Yến and Ý but not onboarding | **CONFIRMED** verbatim: *"còn mấy cái team phía sau như là onboarding này cting kia thì tụi em chưa có mic được với họ"* ("the later teams, like onboarding and [a]cc[oun]ting, we haven't met yet") | CEO L7–13 |
| 3 | Commit `76880a9`, stamped 13/08 11:29, titled "idea CEO 13/08" | **CONFIRMED**: `76880a9 2026-08-13 11:29:18 +0700 feat(lo-recruiting): v5 — AI mở lời có ngữ cảnh (idea CEO 13/08)…` It is in the agentflow repo, not recruit-be. | `git show -s 76880a9` |
| 4 | The 17/08 recording still shows HOT/COLD on one page, a split decided as D46 only on 22/08 | **CONFIRMED.** D46 is dated 22/08 (`A:DECISIONS.md:63`), committed `99d2953` on 21/08 22:39. The quote at ONB 1:12:34–1:12:42 is verbatim. It is also **stronger than the report says.** The two-page Kho mockup was *built* on 21/08 22:52 (`2efae20`), not merely "approved 24/08". A 24/08 demo would therefore have had it available. | ONB L1942–1947; agentflow `git log -- docs/mockups/lo-recruiting-kho` |
| 5 | The licensing file opens *"tôi đã gặp team đó"* | **CONFIRMED text** (`A:04-licensing.md:11`). **It has no bearing on the date.** "I have met that team" on 27/08 fits a meeting on any date up to 27/08. It only rules out a meeting *after* 27/08, so it should not be listed as "deciding evidence". | — |

### 1.2 Where the date reasoning is wrong

**F-1 (FALSE). Signal (2) for onboarding does not identify the CEO meeting.** The report says the
phrase at `B:ONB 1:39:56–1:40:30` refers to Thu 13/08, the CEO meeting: *"…mới nhất hôm thứ chắc
thứ năm thứ sáu tuần trước"* ("most recently, Thursday or Friday last week"). But the idea being
described is an **AI email gateway that auto-forwards mail**. It appears nowhere in the 13/08 CEO
recording: `grep -i "forward"` over the CEO transcript returns **0 hits**, and none of its
`mail` hits (L319–2405) is about routing inbound mail. So the phrase shows only that Thuận raised
the idea somewhere on a Thursday or Friday. It does not show that the venue was the 13/08 meeting,
and the signal cannot carry the weight the report puts on it.

**F-2 (OVERSTATED). The three onboarding signals do not decide "17/08". They bound it to 17–21/08.**
- Signal (3), commit `ab086d5` at 17/08 17:20, gives a lower bound.
- Signal (1), the Kho two-page mockup built at 21/08 22:52, gives a soft upper bound.
- Nothing in the report's evidence separates 17/08 from 18, 19, 20 or 21/08.
- There is **in-recording counter-evidence the report missed.** At ONB 1:04:59–1:05:09 Victoria
  says *"…suppose là từ mùng 01 tháng 8 là đã phải follow up rồi nên tới tới hôm nay là ngày 20
  tháng vẫn chưa follow up…"* ("…lists that should have been followed up from 1 August, and by
  today, **the 20th**, still aren't"; ONB L1703–1705). The sentence sits inside a *"ví dụ như là"*
  ("for example") frame, so the "20" may be hypothetical. It is still the only absolute date spoken
  in that recording, and it points at **Thu 20/08**.
- The day 17/08 therefore rests on something the report never cites: the **user's confirmation on
  22/09**, recorded in the REC front matter (`2026-08-05_…recruiting…md` L14–25, "MEETING ORDER
  (confirmed by the user 2026-09-22)"). That confirmation is the strongest evidence for every date
  in the table. The report should lead with it and treat the inferences as corroboration.

**F-3 (FALSE framing). "A's README is wrong but A's files are honest… That is where the error
entered" (report §1, "Why A's README is wrong").** Only `03-hr.md:9` and `04-licensing.md:9` state
source-message timestamps honestly. Several files assert the wrong date **as a meeting date in
their own headers or bodies**:
- `A:01-recruiter.md:3`: **"Họp: 06/08/2026"** ("Meeting: 06/08/2026")
- `A:02-onboarding.md:3`: **"Buổi demo mockup: 24/08/2026"** ("Mockup demo: 24/08/2026")
- `A:04-licensing.md:20`: *"**Y Ngo** là người dự buổi 27/08"* ("Y Ngo is the person who attended the 27/08 session")
- `A:04-licensing.md:109`: *"lời Y Ngo (27/08)"* ("Y Ngo's words (27/08)")
- `A:CEO-FEEDBACK-2026-08-14.md:1`: *"demo v5 ngày 14/08/2026"* ("demo v5 on 14/08/2026")
- `A:03-hr.md:38`: the five-source table dates Yen Vu's source as **12/08**

The merge list (§5 "From §1") catches three of these but misses `04-licensing.md:20`, `:109` and
`03-hr.md:38`.

**F-4 (FALSE, minor).** *"The repo's first commit `f9e8cea` landed 2026-08-06 17:47"*. The repo's
first commit is `f5c5f12`, 2026-08-05 16:29. `f9e8cea` is the first commit of `docs/FEEDBACK/`.
The inference (REC was captured the day after it happened) survives.

### 1.3 Corroboration the report did not use

- **CEO 13/08:** *"ví dụ tuần sau đi ngày 19"* ("e.g. next week, the 19th"; CEO L1085). Wed 19/08
  is indeed "next week" from Thu 13/08. This is an independent in-recording date check.
- **HR 06/08, 56:07:** the Ryan/Google-Calendar line in §1.1 #1, which cross-references REC 8:21–8:38 by content.
- **Checked and dismissed:** commit `0b99095` (06/08 09:35 +0700) still lists Victoria's "Part 2
  (pain points + redesign)" review as pending (`DECISIONS.md` §3 Q4 in that commit). That is a
  question list written for upcoming meetings, and it does not contradict a 05/08 US-time meeting.

### 1.4 "Exactly five meetings, no hidden ones"

**CONFIRMED as far as content can show.** I matched each repo file against its recording:
- **HR:** the create-account rule `A:03-hr.md:114-116` ↔ HR 1:08–1:53; brand by residence state `:186` ↔ HR 1:07:25–1:08:20.
- **Licensing:** 3–4/day ↔ LIC L251; 80% San Jose ↔ L470; 30–45 days ↔ L1220; Accept removal ↔ L101–140.
- **Onboarding:** OB10's since-2022 ≥5 rule and the 3–4-month-old second condition ↔ ONB 12:48–13:47; OB11's four levels ↔ ONB L397–403; OB12 setup call ↔ ONB 26:03–26:13.
- **Recruiting:** the R1–R15 topics ↔ REC.

I found no repo content that lacks a counterpart in the recording and would suggest a second
session. That is a check of what is present, not proof that nothing is missing.

---

## 2. The four decision-changing claims

### 2.1 `"Onboarding D"` = "Pre-onboarding done" — **CONFIRMED, and stronger than the report says**

- **The stutter** is verbatim at HR 1:06:52: *"À cái này nữa nè. Cái này phải là onboarding D reonbarding D"*
  ("oh, this one too — this must be onboarding D, re-onboarding D"; HR L1669). It follows a
  restatement at 1:06:33 that lists Paid, Signed, Onboarding, NMLS licensed and HR not initiated,
  and omits exactly the 1-1-meeting condition she gave first at 1:08–1:19.
- **The clean form in both recordings — partly true.** *"pre onbarding"* appears clean in HR
  (1:12–1:19, L15), and *"pre onboarding"* appears clean in ONB (30:23, L759). The **full** string
  *"Pre-onboarding done"* appears in **neither**. What ONB has instead is the **same ASR corruption
  pattern as HR**: *"reoning done"* (L127) and *"reon bending done"* (9:10, L201). The report
  missed that parallel, and it is the best transcript evidence available. Whisper drops the "p" in
  both recordings, and HR's "reonbarding D" is the same token.
- **It is the first condition** of the create-account rule, in both `A:03-hr.md:114-116` (figure 1)
  and HR 1:08–1:19. It is not a different status that merely sounds similar.
- **Decisive, and not cited by the report:** the legacy enum at
  `packs/loan/.../LORecruiting.java:443-447` is
  `pre_onboarding_done("Pre-onboarding done")`, `setup_done("Setup call done")`, `@Deprecated done("Done")`, `unselect`.
  The field `onboarding_meeting_status` has exactly one live value ending in "done" other than
  setup-call. The report's hedges ("very likely", "probable", "pending the screenshot") can be
  dropped. The enum settles it without the screenshot.

### 2.2 Onboarding round-robin, 17/08 ~55:05 — **passage CONFIRMED, scope CONFIRMED, "asked for" OVERSTATED**

The passage is verbatim at ONB 55:00–56:12 (L1427–1449). The scope is exactly as the report says:
*"Nhưng mà cái đấy là chỉ từ khi mà cái list đấy do các bạn bên recruiting gửi ra cho thôi"*
("but that's only for lists sent over by the recruiting side"; 55:27–55:33). The same-person
exception is at 55:33–56:02, and it is re-confirmed by Phụng and Victoria at 56:15–56:52.

Three things the report and GAP §5 #10 leave out change how it should be written:

1. **It is conditional, not a request.** *"Thì nếu như mà tụi em muốn figure out cái automation thì
   cũng có thể có những cái logic như vậy"* ("if you want to figure out the automation, it could
   also have logic like that"; 55:19–55:27). And: *"Nếu như các em… decide là có những cái automation
   như thế này thì khi đấy cứ bàn luận với chị"* ("if you decide on automation like this, discuss it
   with me then"; 56:02–56:12). She is describing current manual practice and permitting an automation.
   GAP's *"Victoria asked for it by name… build it"* (`GAP-ANALYSIS.md:342`) overstates this.
2. **The roster is temporary.** *"team chị **tạm thời** là có ba bạn"* ("my team **for now** has
   three"; 55:00). The rotation list must be configuration, never the names Miley, Sarah and Liz.
3. **This was on the table on 05/08 too.** Victoria unchecked only the recruiter, and kept automatic
   assignment for the downstream teams: *"I'm going to uncheck the recruiter… add licensing and HR
   here"* (`B:REC 28:05–28:17`). Benjamin asked for it for onboarding specialists: *"automate assign
   it to um the route roing or um in order to onboarding specialist going to be uh helpful"*
   (`B:REC 18:46–19:06`). A already recorded the same split: *"không muốn ở đầu phễu, muốn ở stage
   cuối"* ("don't want it at the top of the funnel, want it at the late stages"; `A:01-recruiter.md` R8).

Narrowing GAP §5 #10 to recruiters is therefore **correct**. The replacement text should read
"permitted, discuss with Victoria before building", not "requested".

### 2.3 `OFFICER_RECRUITER` / `LO_SUPPORT` seeded; D46/D86 declined to migrate — **CONFIRMED, with one gap**

- **Seeded:** `V036__seed_kho_roles.sql:31-38` inserts `role-lo-support` and `role-officer-recruiter`,
  each with the same 12 permissions. The table comment at `:40-41` says *"RECRUITER KHÔNG thành
  legacy (D86), không migrate ai"* ("RECRUITER does not become legacy (D86), nobody is migrated").
  One caveat: `:29` says *"Grants are still NOT seeded here… a role existing ≠ anyone holding it."*
  So "seeded" means the role exists, not that anyone holds it.
- **Not migrated:** `A:DECISIONS.md:104` D86(a), *"`RECRUITER` **không** thành legacy, **không migrate ai** — 5 người đang giữ nó giữ nguyên"*
  ("RECRUITER does not become legacy, nobody is migrated — the 5 people holding it keep it"). Confirmed.
- **"Declined to retitle" is not established.** D86 decides RBAC role membership. The CEO's ask at
  CEO 1:35:51–1:36:13 is a **job title**: *"mình nên đổi họ thành cái một cái tle khác… customer
  service hay gì đó… để mình đặt tên cho nó dễ không có lộn xộn"* ("we should give them a different
  title… customer service or something… so the naming isn't confusing"). No repo record addresses
  the job title in either direction. The report's own D6 hedge ("title or role?") is the right
  framing. GAP `§5 #11` (L366) goes further than that: *"which D46/D86 explicitly declined"*. It
  should say D86 declined the *role migration* and nothing records a decision on the *title*.

### 2.4 `D36` / `D37` / `D41` collide — **CONFIRMED, and GAP's own re-key is wrong for one of them**

- The collision: `A:DECISIONS.md:53` D36 is activity-feed SHARED/INTERNAL, `:54` D37 is the offer
  comp snapshot, and `:58` D41 is the `block_display` → ARCHIVED migration.
- **Missed by the report:** in the CEO extract, D36 is peer-to-peer rebalancing (`extract/ceo-thuan-2026-08-13.md:614`)
  and D37 is manager-for-absence (`:628`). Both match GAP. But **D41 is "Automate the company email
  assignment too"** (`:679`). The per-team SLA directive is **D43** (`:713`). So GAP §4's
  *"SLA timers configurable per team (CEO-D41)"* (`GAP-ANALYSIS.md:286`) points at the wrong
  directive **even after the `CEO-` prefix is added**. The prefix alone does not fix it.
- Minor: the extract runs D1–**D56**, not D1–D54 (`:917`, `:924`).

---

## 3. The rest of the report: confirmed, false, overstated

### 3.1 Confirmed (spot-checked against source)

- **§2.8 Dave is a named HR person:** `A:03-hr.md:125-127`, `A:DECISIONS.md:221` "### HR (Dave Hoang)", `A:PROJECT-CONTEXT.md:125`. It is also
  consistent with HR 1:01:04–1:01:14: *"tick sẽ gửi ra cho đ Hoàng. …Hoàng sẽ phải đi vô trang associate để mà disable cái account"*
  ("the ticket goes to Hoàng… Hoàng has to go into the Associate page and disable the account").
- **§2.9 / §2.10 figure 1 and figure 8:** `A:03-hr.md:114-116`, `:129-145`.
- **§3.1 GA/OR/KY branch:** HR 1:05:44–1:06:18. §3.2 T3: HR 27:45–28:08, L631. §3.4 T6: HR 51:04, ONB 28:08.
  §3.5 T7/T8: HR 1:01:04, 49:36. §3.6 welcome email: HR 14:07.
- **§3.7 / §3.8 brand:** HR 11:11–12:24. §3.10 refund: ONB 38:31–38:41. §3.12 Phương left: ONB 39:28–39:36.
  §3.13 Rocket lists and the `recruiting@` inbox: ONB 1:41:24–1:42:47. §3.16 hotlines: ONB 1:38:20–1:38:42. §3.17 Brian's Excel: ONB 1:13:22–1:14:37.
- **§3.18–3.20 CEO quotes:** 30:49, 1:09:35, 1:21:56, 1:22:35–1:22:41 (the report says 1:22:27, but the words start at 1:22:35), 1:22:48, 1:24:29.
- **"Absent from A" claims**, grep over `origin/master:docs/`: `refund|hoàn tiền` 0 hits; `brand manager` 0 hits; `hotline` 0 hits;
  `Oregon|Georgia|Kentucky` only in `MOCKUP-AUDIT.md:196`, as licensing; `Rocket` only as a callcenter SLA source. All confirmed.
- **§4 D4, a fee-waived candidate can reach 100%:** confirmed. The new code also already accepts it:
  `CandidateServiceImpl.java:787-801` `assertJoinedGate` passes `FeeStatus.in(PAID, WAIVED)`. Closing `A:03-hr.md:280` Q1 is safe.
- **D6, D12, D13, D14, D15:** confirmed. `A:DECISIONS.md:234` is Q8 CHỐT 13/09 and `:236` is Q10 CHỐT 13/09, while `A:04-licensing.md:237` still says *"Còn treo"* ("still open").
- **V067:** `ct-onb-setup-call` … `'Old ticket 14 — Setup Call, fired on 100% onboarded.'` … `'ON_100_ONBOARDED'` (`V067__checklist_templates.sql:132-133`).
- **The legacy joined gate:** real. It has drifted again to `LORecruiting.java:750-757` on today's `origin/master` (sponsored at `:753`, `joined` at `:756`).
  Neither `:741-746` nor `:724-729` is current.

### 3.2 False or unsupported (beyond §1)

- **F-5, D8: "Nobody stated 1h as a target, so Q34's '1h' option has no source."** Benjamin floated
  1–2h in the same meeting: *"after like 1 hours or 2 hours like the um turn around time if there is
  any um no call or text recorded… reassign it to another person"* (`B:REC 14:15–14:31`). The
  report's own citation `conflict-register.md:65-68` lists it. The 1h has a weak source (a speaker
  floating a range), not no source. Deleting it would be wrong. The fix is to relabel it (§5).

### 3.3 Overstated, or resolved the wrong way in §4

- **O-1, D5: the report ducks a question A already answers.** It says to "settle both with Miley plus
  a read of the legacy ticket 14 config". The legacy ticket config is **already in A**: `A:EVIDENCE.md:109`
  (the production `AutoEscalationDesk` PDF, 12/08) reads *"HR Completed→ticket 14 (Setup Call) · 100% onboarded→ticket 08-HR + 00-LO Support"*.
  - So **V067 is simply wrong**. Ticket 14 fires on HR Completed. It is not in the `ON_100_ONBOARDED` group, which is tickets 08 and 00.
  - The **same line** also names the department: *"Paid→ticket **14-LO Recruiting** (pre-onboarding meeting)"*. The legacy department that owns the setup call is "14-LO Recruiting".
  - That undercuts the report's second "error". A's *"owner = Recruiting"* (`A:02-onboarding.md:244`) matches the legacy department name. The real open question is only which **new-system role** (`ONBOARDING` or `RECRUITER`) holds it.
  - The onboarding transcript agrees with EVIDENCE. HR finishes, a ticket comes back, and the onboarding team calls: *"khi mà HR mà làm xong một vài cái ticket ấy là họ cũng sẽ gửi… automatically là có tích gửi lại cho tụi chị… Có một cái gọi là setup call"*
    ("when HR finishes some tickets, a ticket comes back to us automatically… there's something called a setup call"; ONB 25:59–26:13).
- **O-2, D9 Calendly: "B is two independent statements that it is unused" overstates.** What is unused is the **1-1 Calendly setting inside General Settings**. Calendly itself is used.
  - `B:REC 8:21–8:32`: *"our own recruiters, they have their own Colinly accounts and um they have their own spots… divided in a Google calendar as well."*
  - `B:HR 55:05–55:11`: *"chị nghĩ không phải là không sử dụng cái này mà là không sử dụng cái function ở trong cái chỗ mà general setting đó"* ("I think it's not that they don't use this, it's that they don't use the function in General Settings").
  - `B:HR 56:20–56:30`: *"người ta không sử dụng cái setting chứ người ta vẫn phải gọi, vẫn phải call, vẫn phải setup"* ("they don't use the setting, but they still have to call and set it up").
  - **The risk:** the *1-1 Onboarding Meeting status* is condition 1 of the create-account gate (§2.1). Writing "1-1 unused" into Q39 invites someone to drop the field.
  - **Also missed:** A's R7 says that if recruiters use General Settings at all, it is *only* the Calendly tab (`A:01-recruiter.md:137-138`). The recording says the opposite. Calendly is the one thing they don't use there, and *"myself I only I only use the webinar setting"* (`B:REC 9:07–9:10`). A inverted which tab is used.
- **O-3, D11 HR↔Licensing sequencing: the report picked B and left out B's own counter-evidence.**
  - Yến says outright: *"bên licensing với lại cái hai cái status đó là làm song song và độc lập"* ("licensing and [HR] — those two statuses run **in parallel and independently**"; `B:HR 28:12–28:18`). That **supports** A's point that the sequence is carried by people rather than by the business (`A:04-licensing.md:112-114`).
  - A's "real constraint = background check → sponsorship" is also not wrong. Per HR 1:05:44–1:06:11 the check precedes account creation → "HR onboarding", and per HR 17:38–18:43 and LIC 8:15–9:02 that is what triggers the licensing ticket. So the check precedes sponsorship transitively.
  - The correct merge **adds** "the check is an HR step, GA/OR/KY only". It does not *move* anything.
  - "No escalation toward Licensing" rests on one sentence from one source (`B:HR 28:43–28:54`), as GAP itself notes at L556–558.
  - One more nuance: the one nudge that does exist is aimed at chasing *the LO*. *"để mà bên mình có thể hối hối lo đó làm cho lẹ"* ("so our side can hurry that LO along"; 28:43–28:48).
- **O-4, D3 figure 8: "Bao's retelling… contradicted".** As a definition of 100% it is contradicted: HR 55:11–55:34 and the code both give three conditions. But A says the 12/08 message carried **one** screenshot (`A:03-hr.md:5`), and nothing establishes what figure 8's six-condition list actually describes. It might be a different rule. Mark it "contradicted as the 100% rule, origin unknown", not "Bao misremembered".
- **O-5, §3.11 self-pay gate: attributed to Victoria only.** Brian raised it first, and more specifically, on 05/08: *"not letting loss pay by themselves without approving them… many loan officers they just pay and sometimes we don't approve them so we have to refund them the $100… have a little section that says like approve loan officer… If it doesn't approve them… sending like a rejection email and they cannot pay"* (`B:REC 1:07:07–1:08:22`). Both people should be cited. GAP §7 Q7 has the mirror-image error (§4 G-7).
- **O-6, §1 "decisive together"** is overstated, as F-2 explains.
- **O-7, D2 "probable"** is the reverse problem: it understates. The legacy enum makes it certain (§2.1).

### 3.4 Could not check

- The speakers at HR 53:21 ("Bảo"), HR 12:18 ("Phương") and CEO 4:43 ("Phương"). The lines are unlabelled `>>`, so the attributions are the report's inference.
- The 12/08 `AutoEscalationDesk` screenshot and PDF themselves. I read only A's descriptions of them.
- Where the transcript filename dates came from before the user's 22/09 confirmation (for example Drive metadata).
- D17's "13 14 states" and the other small citations I did not sample.

---

## 4. What the report MISSED — repo material that contradicts GAP-ANALYSIS

`GAP-ANALYSIS.md` has **already** absorbed part of the report. §3 row 47, §3 "Settled 23/09", §5
#10–#11 and §7 Q1/Q3/Q8 are updated. Doing that partially has left the file contradicting itself.
All line numbers below are for the current local file. The report's citations into GAP have drifted
by up to 40 lines because GAP was edited after the report was written, so apply every GAP merge by
content, not by line.

| # | Contradiction | Where | Severity |
|---|---|---|---|
| G-1 | §7 Q1 now says "Onboarding D" is RESOLVED as Pre-onboarding done. Four places still say it is unresolvable and blocking: §6 T1 row *"7 simultaneous conditions… + 'Onboarding D'"* (L397), the ⚠ box *"a question for Ý, in the same class as 'Onboarding D'"* (L475–476), *"Killed: 'Onboarding D'… Confidence zero"* (L513–514, L528–530), and §8 *"Blocks implementation"* (L600) | GAP | HIGH: a reader landing on §6 or §8 will still block T1 |
| G-2 | §7 Q3 closes Dave as a named HR person, but §6 "Attribution still open" (L560–564) still says it is open and that T1's recipient depends on it | GAP | MEDIUM |
| G-3 | §1 was corrected to *"S6→S7 goes through today"* (L88–93), but §5 Tier 1 #3 still says *"S6→S7 is unreachable"* (L316) | GAP | MEDIUM |
| G-4 | §4 still concludes *"Therefore `routing_rules` should stay hollow"* (L280), while §5 #10 now says *"`routing_rules` is therefore the right home after all"* (L352) | GAP | MEDIUM |
| G-5 | §5 #10 says *"Victoria asked for it by name… build it"*. Per §2.2 it is conditional ("if you decide… discuss with me"), the roster is temporary, and it has a same-person exception that #10 leaves out | GAP L342–352 | MEDIUM: it drives a build decision |
| G-6 | `CEO-D41` = per-team SLA (L286) is wrong: the extract's D41 is company-email automation and per-team SLA is D43. §3 still uses a stale fourth scheme (#25, #38, #41, #44, #47, #34/36 at L182–193, plus #25 at L53, L308) | GAP vs `extract/ceo-thuan-2026-08-13.md:679, :713` | MEDIUM |
| G-7 | §7 Q7: *"filed by **Brian, not Victoria** — so searching her name will not find it"* and *"across **two departed PMs**"*. Victoria asks for it too (ONB 39:40–40:02: *"tụi chị không muốn họ được trả luôn tiền… phải qua tụi chị background check rồi… thì mới được trả tiền"*, "we don't want them paying directly… it must pass our background check first"). Brian's "departed PMs" are ASR names, *"foam boy"* and *"fun"*, and "fun" is Phụng, **who is present** in that meeting and addressed directly: *"So no uh Fuian, I think you're aware of this"* (REC 1:08:32) | GAP L582 | MEDIUM |
| G-8 | §5 #5 proposes **HR** admin screens in the recruit app (*"Three departments are blocked by the thinnest possible layer"*). **D77** (`A:DECISIONS.md:95`) says *"HR + Accounting = KHÔNG GHẾ trong V1… việc đến với họ bằng link / omni / app của chính họ"* ("no seat in V1… work reaches them by link, omni or their own app"). Same tension in §1: "no department *could* finish anything" is **by design** for HR (D81 `actor_external`). The report lists D77 in its §2.4 but never flags this conflict | GAP L320–322, L99 | MEDIUM |
| G-9 | §7 Q2 ("confirm setup call… HR does not own it") is already answered in A by `EVIDENCE.md:109` (HR Completed → ticket 14; 14 = LO Recruiting) | GAP L577 | LOW |
| G-10 | The "Settled 23/09" paragraph (L220–227) repeats the report's weakest evidence as "deciding": the unattributed 53:21 line and the non-probative *"tôi đã gặp team đó"*. It omits the user confirmation, which is the real basis | GAP | LOW |
| G-11 | L6 says "four stakeholder transcripts"; there are five | GAP | LOW |

I found **no** material in `docs/FEEDBACK/*` that contradicts the corrected GAP core findings: the
send stubs, the dark prod config, the vacuous gate, and the three-gate 100% definition.

---

## 5. §4 judgement and the §5 merge list

**§4 ("stated differently").** On the items that drive edits, the report picks correctly on D1
(its conclusion), D2, D4, D6, D7 (direction), D10, D12–D16 and D17. It picks wrongly or one-sidedly on **D11**, where B's
own "song song và độc lập" is left out, and on **D9**, where Calendly is conflated with the 1-1 setting. It **ducks D5**:
A's EVIDENCE.md:109 already answers it. It **overreaches on D8**: the 1h has a source.

**The merges, one by one:**

| Proposed merge | Safe? | Change needed |
|---|---|---|
| §1 → README "Ngày họp" → "Ngày relay" plus transcript dates | **Yes, with wording** | Cite the **user's 22/09 confirmation** as the basis. For onboarding write "17/08 (user-confirmed; recording-internal evidence bounds it to 17–21/08; Victoria says 'hôm nay là ngày 20' in an example at 1:05:04)". Do **not** write the wrong-dates finding as "the README copied timestamps". The file headers carry the wrong dates too |
| §1 → `03-hr.md:23-25`, `README.md:10` | Yes | Also fix `03-hr.md:38` (table date) and `05-project-owner.md:84-90` (ordering) |
| §1 → `02-onboarding.md:3`, `01-recruiter.md:3`, `CEO-FEEDBACK:1` | Yes | **Add** `04-licensing.md:20` and `:109` |
| 2.9 / D2 → "Onboarding D = Pre-onboarding done (probable)" | Yes | Drop "probable" and cite `LORecruiting.java:443-447` plus ONB 9:10 "reon bending done" |
| 2.8 → close Dave | Yes | Also close GAP §6 "Attribution still open" (G-2) |
| D3 → mark figure 8 contradicted | Yes, reworded | Say "contradicted as the 100% rule; what figure 8 describes is unknown" |
| D4 → close `03-hr.md:280` Q1 | **Yes** | Cite `CandidateServiceImpl.java:796` as well |
| D5 → bead against V067 + ask Miley | **No, as written** | V067 `ct-onb-setup-call` trigger contradicts `A:EVIDENCE.md:109` (HR Completed → ticket 14). File the V067 fix directly. Do **not** write "A's owner = Recruiting is wrong", since ticket 14's department is "LO Recruiting". The only open item is new-system role ownership |
| D6 → fix GAP "not seeded" | Already done in GAP L193/L363 | Reword GAP L366 "explicitly declined" to "declined the role migration; nothing records a decision on the job title" |
| D7 → narrow GAP §5 #10 | Yes, reworded | "Permitted, not requested; discuss with Victoria; roster is config; same-person rule". Also fix G-4 |
| D8 → remove "1h (họ nói)" | **No** | Relabel it as "1–2h floated by Benjamin (REC 14:15), not agreed; 3h (company rule); 3–5 business hours (Victoria 29:28); deferred" |
| D9 → Q39 "unused per two recordings" | **No** | "The 1-1 *Calendly setting* is unused; recruiters use personal Calendly/Google Calendar; the 1-1 Onboarding Meeting *status* is still used and gates account creation." Also fix R7's inverted "only the Calendly tab", which should say only the webinar tab (REC 9:07) |
| D11 → *move* the background check to HR | **No** | **Add** "HR runs a background check before account creation for GA/OR/KY (HR 1:05:44)", and **keep** A's parallelism point, now sourced to HR 28:18. Mark "no escalation toward Licensing" as single-source |
| D16 → re-key to `CEO-D<n>` | Yes, **after one fix** | Per-team SLA = `CEO-D43`, not `CEO-D41`. Re-key §3's #-numbers too (G-6) |
| 3.10 / 3.11 → new OB13 refund + self-pay gate | Yes | Cite Brian REC 1:07:07–1:08:22 as the original ask, next to Victoria ONB 39:40–40:02 |
| All other §5 items | Yes | None needed |

**Before any GAP edit:** resolve G-1 to G-4 in the same pass. A file that says "resolved" in §7 and
"blocks implementation" in §8 is worse than either statement on its own.
