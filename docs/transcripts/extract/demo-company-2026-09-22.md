# Extract — company-wide demo of recruit app on staging, 2026-09-22

Source: `docs/transcripts/2026-09-22_demo-staging_company-feedback.md` (928 lines, 27:25 → 1:30:13; all lines read).
Extracted 2026-09-23. Cross-checked against the five earlier transcripts (05/08, 06/08, 11/08, 13/08, 17/08) and against code on
`recruit-be` origin/master `288eb81` and `recruit-fe` origin/master `34a7acb` (both fetched just before reading).

## How to read this document

- **Timestamp convention.** In this file a timestamp line follows the caption text, as in the earlier files. I cite each line
  by the timestamp on the line *before* it, which matches how `GAP-ANALYSIS.md` cites the 17/08 file (e.g. ONB 55:19). Line 1
  has no timestamp before it and is cited as `≤27:25`. Expect ±5 s. Some gaps between timestamps run over a minute
  (for example 53:14→53:28 is short, but 1:21:58→1:22:10 and 1:26:08→1:26:45 are long), so a single caption line can cover a long span.
- **Confidence markers** (in §3): `CLEAR` = the Vietnamese is unambiguous · `LIKELY` = readable but a key term is reconstructed ·
  `GIST` = the topic is recoverable, the claim is not.
- **`RECONSTRUCTED`** marks any English term I have read into a garbled form. Where I write a reconstructed term in my own
  analysis, the garbled original is quoted next to it.
- **Numbers.** Any number the transcript renders as digits (`22`, `24 ngày`, `1 tiếng`, `6:00`, `1000`, `5000`, `3 ngày hay 5 ngày…`)
  is quoted but is **not** used as a fact. Numbers spoken as words (`cả trăm`, `bốn người`, `năm cái`, `bảy cái stay`, `tám người`, `hai người`)
  are real quotes and can be used.
- **Promotable** = confirmed by a second, independent source (an earlier transcript or the code). Marked `2nd source:` inline.
  Anything without that line is gist only.

### Speakers (inferred; nobody is named on the `>>` turns)

| Label | How identified | Confidence |
|---|---|---|
| **Demoer** | Narrates their own screen, calls themselves `em`, addresses `anh`, cites Victoria, chị Phương, Liên and anh Khải as sources of design decisions. Probably one person throughout. It is possible another team member took over for some answers. | LIKELY |
| **Senior voice** | Long monologues addressed to `tụi em` (you lot), gives instructions ("Em viết xuống giùm anh", 1:11:20), uses the **restaurant analogy** (37:17, 1:15:55). The CEO used the same analogy in clean form on 13/08 (*"Mình bán nhà hàng người ta tới người ta ăn…"*, CEO 15:27). At 1:04:16 a junior says *"như anh anh anh Thuận nói"* ("as anh Thuận said") while referring back to the "call immediately" point. **Inference: senior voice = CEO Thuận (≡ Antoine). Not confirmed.** | LIKELY |
| **Questioner(s)** | Short `>>` turns (28:42, 29:35, 45:05, 1:17:39). They could be the senior voice or someone else. Not separable. | — |
| **Second junior voice** | Raises objections in first person and addresses `anh` (1:19:44 "Em làm việc với anh lâu rồi", 1:28:05 "auto size của anh"). This could be the demoer or a teammate. | UNCLEAR |

---

## 1. What was demonstrated (in order)

| # | Time | Screen / flow | Key narration (verbatim → gloss) |
|---|---|---|---|
| D1 | ≤27:25–28:38 | **Today view** ("today work"). Framed as a replacement for the old system, where a recruiter got a list of *"cả trăm cả trăm người"* (hundreds) to contact by hand. | 28:10 *"khi mà một người EO họ start cái app này lên thì họ thấy được cái today work"* → "when a [RECONSTRUCTED: recruiter] starts the app they see today's work". 28:34 *"nguyên cái bảng này họ sẽ được ly hết hoàn toàn và sau đó là họ họ sẽ có thể lấy thêm list"* → "they [RECONSTRUCTED: clear] the whole board, then they can take more list". |
| D2 | 28:45–29:21 | **Today sections**: (a) a block of *"bốn người"* (four people) who were scheduled for today and have passed their time; (b) people taken from the hot list but not yet contacted. | 28:54 *"cần phải gọi bốn người này liền nè"* → "these four must be called right now". 29:06 *"họ đã lấy từ cái list hot nhưng mà họ chưa contact"* → "taken from the hot list but not contacted yet". |
| D3 | 29:13–29:21 | **Two intake mechanisms** narrated: manual take, or *"Rubin Round"*, where the system auto-assigns. | 29:17 *"Có nghĩa là system sẽ tự động assign cho họ những cái người này để mà buộc họ là phải làm việc"* → "the system auto-assigns these people to them to force them to work". **⚠ Not in the code. See §4 C-B.** |
| D4 | 29:37–30:50 | **Count badge and status labels**. The demoer admits the labels are their own shorthand and will be removed. The pipeline has *"bảy cái stay"* (seven [RECONSTRUCTED: stages]), with "S1" as the first. | 30:34 *"hiện tại nó đang là cái cái thuật ngữ của em thôi"* → "for now it's just my own terminology". 30:46 *"em phân ra là tới bảy cái stay khác nhau. Mấy cái này là em sử dụng bỏ đi hết"* → "I split it into seven different stages; these [labels] I'll drop". 2nd source (code): `CandidateStage { S0…S7 }`. That is eight values; "seven" may count S1–S7. |
| D5 | 38:03–39:33 | **Hotlist tab**: inbound leads, with sources and per-source response windows. It is a **shared team pool** that recruiters pick from (*"bốc"*). A picked lead moves into that recruiter's Today. | 38:03 *"Đây đây là cái nguồn mà list vào nè vào đến từ event hoặc là Facebook"* → "this is where the list comes from: events, Facebook". 39:10 *"Đây là cái kho chung đây là cái full của họ của toàn bộ team"* → "this is the shared pool for the whole team". 2nd source (code): `inbox/hot`, `hot.sources`, `sla.first_touch_hours_by_source` (V017). |
| D6 | 38:35–38:47 | Mentioned but not shown: a **manager screen with exceptions**. | 38:35 *"màn hình manager là có exception là nó báo được biết là hiện"* → "the manager screen has exceptions that flag…". 2nd source (code): FE `exceptions/` page; D55 "N phút không ai claim → Exceptions". |
| D7 | 39:48–40:34 | **Call-outcome logging** after a call: interested → book another date · send company info · invite to webinar (email) · not now, call back later → *"neutal"*. | 39:54 *"họ gọi xong thì họ sẽ lock được cái research"* → "after the call they [RECONSTRUCTED: log] the result". 40:24 *"họ kêu là 6 tháng sau gọi lại thì nó sẽ nằm trong cái mục neutal"* → "they say call back later [digit: 6 months], it goes under *neutal*". 2nd source (code): `CallAttitude = INTERESTED \| NEUTRAL \| NO_ANSWER \| NOT_INTERESTED`. |
| D8 | 40:34–41:16 | **Meeting / webinar invite is a manual stop-gap**: paste a link and email it. The intended version is a Google Calendar integration. | 40:38 *"đây là cơ chế tạm thời chứ nếu đúng thì sẽ là link với thằng Google Calendar"* → "this is temporary; properly it will link with Google Calendar". 41:10 *"đang backup manual là dán link vô web B"* → "backup is manually pasting the link for the [RECONSTRUCTED: webinar]". |
| D9 | 41:34–42:32 | **Outcome modal**: NEUTRAL means pick one far date and the row leaves Today. NO ANSWER means a repeating reminder ladder. The demoer commits to showing the exact reappearance date. | 41:44 *"nó sẽ biến mất khỏi cái màn hình tôi đâ"* → "it disappears from the Today screen". 42:02 *"neutal này là chỉ chọn đúng một ngày thôi"* → "neutral is just one chosen date". 42:25 *"để em hiển thị rõ thêm là… cho biết chính xác là ngày nào sẽ nổi"* → "let me also show exactly which day it resurfaces". 2nd source (code): `nurture_until` wake date, `followup.no_answer_retry_days` ladder (V074), `followup.nurture_default_days` (V090). |
| D10 | 42:38–43:58 | **Follow-up vs note**: the note is the recruiter's private note. The call voice is already recorded through the Zoom integration. | 43:47 *"cái note riêng của cái người recruter đó họ muốn ghi cái gì thêm thôi"* → "the recruiter's own private note". 43:52 *"voice bên chỗ Zoom là nó đã record được"* → "the voice on Zoom is already recorded". 2nd source: 05/08 (Benjamin: "the phone call from the zoom that currently integrate with our system"). |
| D11 | 44:04–44:31 | **Live action**: sets a candidate's wake date to "day 30" and the row disappears from Today. | 44:22 *"Hiện tại trên view tôi đây coi như đã ly được một người"* → "on the Today view, one person is now [RECONSTRUCTED: cleared]". |
| D12 | 44:31–44:42 | **Omni** is shown briefly, then closed on instruction. | 44:31 *"đây đây là cái hôm bữa anh Khải demo cho anh á"* → "this is what anh Khải demoed to you the other day". 44:34 *"Đóng đi đóng đi đóng đi"* → "close it, close it, close it". 2nd source: 13/08 CEO told the team to plug in anh Khải's omni channel rather than build one (CEO 54:26–55:29). |
| D13 | 44:42–45:21 | **Row action buttons** (call now / message now) and the modal. Ordering is by scheduled time. | 44:42 *"nút action gọi liền hoặc nhắn tin liền"* → "action buttons: call now or text now". 45:07–45:14 ordering by time of day (digits, not used). |
| D14 | 45:45–47:43 | **Follow history modal** holding the omni conversation: chat, email, SMS. | 46:30 *"Nguyên cái âm ni chat, email SMS nè. Có nghĩa conversation hết nằm trong đây"* → "the whole [RECONSTRUCTED: omni] chat, email, SMS — the whole conversation is in here". |
| D15 | 48:31–50:07 | **Hotlist sources explained again**: people who came to us through a webinar form, Facebook or an event. Campaign lists land there too. | 49:10 *"họ chủ động họ tìm tới mình bằng cách là họ điền form webinar hoặc là từ Facebook"* → "they proactively come to us by filling a webinar form or via Facebook". |
| D16 | 50:07–50:36 | **Call script / talk-track generation**. It was planned to use AI but is not integrated yet. | 50:29 *"lúc đầu anh kêu là sử dụng ai ấ nhưng mà hiện tại anh chưa tích hợp được"* → "originally you said to use AI, but it isn't integrated yet". |
| D17 | 51:10–52:29 | **Why "claim first, research later"**. It replaced an earlier "claim and contact" design after chị Phương's feedback. | See §3 X-29. |
| D18 | 52:41–53:11 | **Round robin exists but manual is the current mode**, per Victoria's work-balance concern. | See §3 X-28. |
| D19 | 1:12:00–1:13:36 | **Manager screen**: incoming list with a timer, and assign directly to anyone. Time-off handling: people who filed leave ahead are excluded from auto-assign; for sudden sickness the manager logs in and reassigns. | 1:12:05 *"màn hình là dành cho manager… assign thẳng cho lên ở bất cứ ai nếu mà cần"* → "a manager screen… assign straight to anyone if needed". 1:13:09–1:13:25 time-off mechanics. **⚠ Time-off exclusion and auto-assign are not in the code. See §4 C-B.** |
| D20 | 1:23:56–1:24:48 | **Today queue vs claim**: the list is today's queue, not calendar items. When it is empty, a **claim** button pulls more. | 1:24:12 *"họ gọi hết thì sẽ có một cái nút gọi là claim"* → "when they've called everyone there's a button called claim". 2nd source (code): `POST /candidates/batch-claim` (D66, "claim the next N"). |
| D21 | 1:24:48–1:26:08 | **Focus mode**: only today's list, e.g. *"tám người"* (eight people). When done, a button fetches more. | 1:24:48 *"họ sẽ bật qua cái dạng focus mode này có nghĩa là họ chỉ biết là hôm nay họ cần gõ nguyên danh sách này tám người"* → "they switch to focus mode: they only know that today they need to get through these eight people". 2nd source: 17/08 (ONB 1:06:06 *"view của người recruer nó sẽ có cái phần focus mode"*); code `today/_components/FocusClient/`. |
| D22 | 1:26:08–1:26:45 | **Manager monitoring**: if a recruiter is out of work while the pool still has many people, the manager sees it. | 1:26:08 *"Nếu mà đã hết việc nhưng mà ở dây có một đóng người thì cơ bản là cái view này của manager là họ sẽ thấy được"* → "if they've run out of work but there's a pile here, the manager's view will show it". |

---

## 2. Questions asked, and how they were answered

| # | Time | Asker (inferred) | Question (verbatim → gloss) | Answered? |
|---|---|---|---|---|
| Q1 | 28:42 | questioner | *"Quan quai phần phần bốn cái này phía dưới là cái gì?"* → "what is this section of four below?" | **Answered** (28:45–29:21): overdue scheduled contacts, plus claimed-but-not-contacted. |
| Q2 | 29:35 | questioner | *"My 22 là sao?"* → "what's the 22?" | **Answered** (29:37): the total to work today. The digit is not used. |
| Q3 | 29:42–29:59 | questioner | *"plus là sao?"* / *"never năm cái"* / *"năm cái chưa bao giờ đ tới"* → "what's 'plus'?" / "never — five of them" / "five never reached?" | **Answered** (30:09–30:50): the labels are the demoer's own shorthand for "contacted, no reply" and will be removed. |
| Q4 | 31:16–32:57 | senior voice | *"làm sao để mình ép buộc người ta phải ấn vô phải tạo cái con Đó"* → "how do we force people to press it, to create that thing?" (about the reminder feature) | **NOT ANSWERED.** The only reply is a fragment at 33:05: *"cái cái new có nghĩa là cái"*. **Finding.** |
| Q5 | 36:30–37:58 | senior voice | Restaurant analogy: someone must greet the customer within *"10 giây"*. This implies inbound leads must be answered immediately. | **Answered** (37:58): *"cái đó nó có rồi anh… nằm ở bên cái tab hotlist"* → "that already exists, in the hotlist tab". |
| Q6 | 45:05 | questioner | *"cái này tại sao âm hữ"* → "why is this [UNCLEAR: âm hữ]" | **Answered** (45:07–45:14), though the question is unreadable: the demoer explains ordering by time of day. |
| Q7 | 46:13–46:30 | questioner | *"hình chứ hình nó thú á nó có sờ rất chat"* → UNCLEAR, about chat | **Answered** (46:30): omni chat, email and SMS are all inside. |
| Q8 | 47:43 | ? | *"Dạ. Lúc nào?"* → "when?" | **UNCLEAR**: no readable answer. |
| Q9 | 48:24 | ? | *"cục này để cái gì em remove đi bớt"* → "what's this block for — I'll remove some" | **Resolved as removal**, see X-11. |
| Q10 | 50:50–50:54 | questioner / senior | *"nếu mà design cho nó đơn giản chút nhiên vô gọt l xong phải nhảy nguồn tại đây đó là việc là sao"* → "if the design were a bit simpler… [UNCLEAR] having to jump to the source here — what's that about?" | **NOT ANSWERED**: replies are only *"ờ"*, *"dạy"*, *"dạ"* (50:57–51:07). **Finding.** |
| Q11 | 51:57–52:06 | questioner | *"tại sao trước khi resarch mà không làm resarch trước"* → "why not do the research before [claiming]?" | **Answered** (52:06–52:21): research-before-claim wastes effort when two recruiters research the same person. The questioner's acceptance is not recorded. |
| Q12 | 1:11:57 | senior voice | *"nhưng mà còn cái gì hay nói luôn"* → "anything else good, say it" | **Answered**: the manager screen (1:12:00). |
| Q13 | 1:12:32–1:12:40 | ? | About a manager switching *"cái tính năng size đó"* (RECONSTRUCTED: assign feature) off temporarily | **Partly answered**: *"list nó vẫn về. List vẫn về và vẫn đến thời gian"* → "the list still comes in, and still runs down the clock". |
| Q14 | 1:13:03 | ? | (implied) what if the assignee is absent? | **Answered** (1:13:09–1:13:25): leave filed ahead → excluded; sudden sickness → the manager reassigns. **Code does not support this answer. See C-B.** |
| Q15 | 1:15:44–1:15:55 | senior voice | *"không ai được quá không ai được sao là sao nó nhảy không"* → "if nobody gets to it in time, what happens, does it jump [to someone]?" | **NOT ANSWERED.** It turns into the senior voice's own proposal of a second deadline (1:16:17). **Finding.** |
| Q16 | 1:17:31–1:17:52 | senior voice | *"một cái khó quá hạn… giải quyết em thấy sao… cái quá hạ mà phải làm gì"* → "an overdue one — how do you resolve it, what do you think… what must be done when it's overdue?" | **Partly answered** (1:17:59–1:18:29): someone likens it to processors, where a manager steps in, and says *"giờ hình như có rồi trong mo có rồi"* → "I think it already exists in [RECONSTRUCTED: MOSO]". No answer about *this* app. **Finding.** |
| Q17 | 1:20:43–1:20:56 | second junior voice | *"sau này onbarding nó sẽ là có màn hình trong đây không?"* → "will [RECONSTRUCTED: onboarding] have a screen in here later?" | **UNREADABLE.** The reply is only *"Dạ dạ"*, then 1:21:06–1:23:52 is fragments. **Finding.** |
| Q18 | 1:23:52–1:23:56 | questioner | *"chúng ta lử dụng hai cái này cái… Cái này không?"* → "do we use these two… this one?" | **Answered** (1:23:56–1:24:18): the list is today's queue; the claim button comes after it. |
| Q19 | 1:27:55–1:28:41 | second junior voice (after the senior voice asks *"còn có ai có câu hỏi gì không?"*) | Auto-assign near end of day: a list arrives shortly before closing, must be called within the SLA, and hurts the assignee's performance. | **Resolved in the room** (1:29:23–1:29:50): the SLA counts working hours. *"ok ok hợp lý"* (1:29:45). See X-25. |

---

## 3. Criticism, objections and change requests

`X-nn` numbering is for cross-reference only.

### Adoption, clarity, usability (senior voice, 31:16–35:30; mostly damaged)

- **X-1 · CLEAR** — 31:42 *"cái lo lắng là mình cái chức năng này cuối cùng không ai xài hết"* → "the worry is that in the end nobody uses this function". 31:49 *"không ai dùng hết"* → "nobody uses it". About the **reminder** feature (31:16 *"như anh nói hôm qua đó tức là cái reminder"* → "as I said yesterday, i.e. the reminder"). *No 2nd source: no adoption phrasing in any earlier transcript (0 hits for ép buộc / không ai xài / không ai dùng / adoption).*
- **X-2 · CLEAR** — 32:52 *"làm sao để mình ép buộc người ta phải ấn vô phải tạo cái con Đó"* → "how do we force people to press it, to create it". Asked, not answered (Q4).
- **X-3 · CLEAR** — 32:34–32:44 *"mình phải xây dựng công nghệ làm sao mình hiểu được user để họ xài nó thành công đưa công nghệ cuối cùng không ai xài mình thất bại"* → "we must build technology that understands the user so they use it successfully; if in the end nobody uses it, we have failed".
- **X-4 · LIKELY** — 33:42 *"là sao cái đã nhìn vô mà biết thường làm gì"* → "[the software should be such that] you look at it and know what to do". 33:53 *"ta sẽ bị lạc lạc lỏng"* → "we'll be lost". 34:01 *"xài tối đa tối đa cái năng lực của phần mềm"* → "use the software to its full capability". The request is self-explanatory UI; the sentence boundaries are reconstructed.
- **X-5 · GIST** — 34:35 *"độ trả cái gia nó khó sử dụng"* → "[UNCLEAR] it's hard to use". 34:50 *"cái label"*. 35:13 *"vẽ confuse"* → "drawn confusingly". Some labels or visuals were called confusing; I can't recover which.
- **X-8 · CLEAR** — 44:53 *"cái giao diện chữ khó hiểu quá à. Thứ nó khó hiểu quá."* → "the interface text is too hard to understand. It's too hard to understand." Repeated at 44:59 *"Cái đ cái giao diện khó hiểu quá"*. Said while the row/modal screen (D13) was shown. 2nd source (partial): the demoer's own admission at 30:34 that the labels are private terminology.
- **X-9 · GIST** — 45:05 *"cái này tại sao âm hữ"* → "why is this [UNCLEAR]". The answer concerns ordering (Q6).
- **X-10 · LIKELY** — 45:21 *"hình như nó bị dư nó bị dư sao"* → "looks like it's redundant/duplicated?" The speaker is unclear, and so is what is duplicated.
- **X-11 · LIKELY** — 48:24 *"nó giống cái phần dưới suột á anh cục này để cái gì em remove đi bớt"* → "it's like the part below, anh — this block, what's it for, I'll remove some". This reads as the demoer agreeing to remove a duplicated block. It pairs with X-10.
- **X-12 · LIKELY** — 50:50 *"nếu mà design cho nó đơn giản chút"* → "if the design were a bit simpler". It was followed by an unreadable complaint about "having to jump to the source" and got no answer (Q10).
- **X-30 · CLEAR** (demoer self-correction) — 30:34 *"cái thuật ngữ của em thôi chứ nếu mà đúng là sẽ bỏ"* → "just my terminology; properly it'll be dropped". 30:46 *"Mấy cái này là em sử dụng bỏ đi hết"* → "these I'll drop entirely".
- **X-31 · CLEAR** (demoer commitment) — 42:25–42:32 *"để em hiển thị rõ thêm là ngoài việc đếm ngày ra là hiển thị là cho biết chính xác là ngày nào sẽ nổi"* → "besides the day count, I'll show exactly which date it resurfaces". Commitment to a change.

### Inbound response and deadlines (senior voice)

- **X-6 · LIKELY** — 37:17–37:26 *"phải có nguy luật khách đút vô 10 giây là có người ra chào đón khách nói chuyện khách… dẫn khách vô chứ không thể nào khách đứng đợ phút hồ không chào"* → "there must be a rule: a customer walks in and within [digit] seconds someone greets them and leads them in; a customer can't stand waiting minutes unacknowledged". Applying this to inbound leads is my inference, but the demoer's answer ("already exists, in the hotlist") confirms the topic. 2nd source: CEO 13/08 15:27 restaurant analogy (clean) · code per-source first-touch SLA (V017, D55).
- **X-21 · LIKELY** — 1:16:17–1:16:31 *"Mình anh nghĩ là mình phải có cái deadline thứ nhì bao lâu không có đòi á thì cho nó nhảy vô… Nên anh nghĩ nên làm cái deadline thứ gì"* → "I think we must have a **second deadline**: after how long with no [UNCLEAR: đòi], let it jump [to someone else]… so I think we should build a second deadline". This is a **change request**. "Nhảy vô" as reassignment is RECONSTRUCTED. 2nd source: 05/08 Benjamin/Victoria agreed on reassigning after no action within business hours (*"then it's going to assign to someone else let's let's do that"*, 05/08 ~29:39). Code: no auto-reassign; no-claim goes to Exceptions (D55).
- **X-22 · LIKELY** — 1:16:43–1:17:08 *"quá 4 tiếng không cần biết tại cái đó lời hứa của mình… mình hứa mà bây giờ quá 4 tiếng không làm xong phải lên sao phải biết… để ta biết là mình hướng mà không làm được"* → "past [digit] hours, no excuses, that's our promise… we promised, and if it's past that and not done, it must surface so we know we promised and failed". Frames the SLA as a promise to the customer, with breach made visible. The number is not used.
- **X-23 · LIKELY** — 1:17:39–1:17:52 *"quá hạn trong thấy hả giải quyết em thấy sao… cái quá hạ mà phải làm gì"* → "overdue — how do you resolve it… what must be done when overdue?" Only partly answered (Q16).

### Assignment: claim vs auto-assign (the main debate, 51:10–1:13:36 and 1:28:05–1:30:01)

- **X-29 · CLEAR** (reported stakeholder feedback) — 51:16–51:39 *"chị Phương có góp ý là thường thì trước khi gọi cho một người lo nào đó là cái recuter đó họ phải tìm hiểu kỹ cái người này trước… bạn Liên bạn cũng đang tình cờ tìm hiểu bạn này rồi… Liên gọi trước thành ra… bị mất cái thời gian"* → "chị Phương pointed out that a recruiter researches an LO before calling; if Liên happens to research the same person and calls first, my research time is wasted". 52:21 *"cái idea là cứ bốc về trước đi rồi bắt đầu nghiên cứu sau"* → "so the idea: claim first, research after". *No 2nd source: chị Phương's point doesn't appear in any earlier transcript. The source is outside the corpus.*
- **X-13 · GIST** — 51:57 *"tại vì… resarch tại chỗ tại sao trước khi resarch mà không làm resarch trước"* → "why not research first?" A challenge to X-29. I can't tell whether it was withdrawn.
- **X-28 · LIKELY** (reported stakeholder constraint) — 52:43–53:11 *"nó có chức năng là Robin Round vậy đó… nhưng mà nó liên quan tới work balance mà Victoria có nói… chị Viết không muốn… người nó ôm quá nhiều hay là những ai mà… làm việc chậm là ôm quá ít. Thành ra là chị Vi muốn là hiện tại là manual đi cái đã. Còn cái cơ chế mà Round nó lại nó lại làm performance của người nó bị giảm"* → "it has a [RECONSTRUCTED: round-robin] function… but that touches the work balance Victoria raised… she doesn't want some people hoarding too much and slow people holding too little, so Victoria wants manual for now; the round mechanism would hurt people's performance". 2nd source: 05/08 Victoria *"I assign them to them myself because if we do it round robin uh we're not really sure… if they're going to reach quickly"*; CEO 13/08 1:09:06 *"Victoria có nhắc tới cái việc gọi là work balance workload"*.
- **X-27 · LIKELY** (objection to auto-assign) — 58:26–58:33 *"bây giờ em đang có 20 người tình cờ ngày hôm nay cùng hẹn hết mà bây giờ nhận thêm năm người mới nữa coi như là nó bị overload luôn anh. Thì thành ra có nghĩa là cái việc mà gọi là auto assign là nó…"* → "say I have [digit] people who all happen to be scheduled today, and I get *năm* (five) new ones on top — that's overload. So auto-assign…". 2nd source: CEO 13/08 1:10 (*"có tới 100 cái việc cần làm"*, a day with too much work; CEO's answer was peer transfer).
- **X-19 · LIKELY** — 1:00:48–1:01:31 *"sơ B giờ mình đóng 1000 cái lô sau này công ty mình đóng 5000 cái lô thì làm sao mình quản lý được"* → "if we now close [digit] *lô* and later the company closes [digit] *lô*, how do we manage?" This is a scale argument: manual handling won't scale. *"lô"* could be LO or loan. *"đóng"* (close) suggests loans. The digits are not used; the claim is only that "an order of magnitude more" breaks manual handling.
- **X-20 · GIST** — 1:00:05–1:00:10 *"không nên sai cho bạn này mặc dù mới có 6 cái lô 20 cái lô rồi vẫn nên là sai tiếp đó"* → "shouldn't [RECONSTRUCTED: assign] to this one even though only [digit]… still should [RECONSTRUCTED: assign] more". It concerns load-based assignment; I can't recover the claim.
- **X-32 · LIKELY** (demoer's design statement) — 1:04:16–1:04:30 *"như anh anh anh Thuận nói là list tới nhưng mà phải gọi liền thì thường cái đó sẽ quyết định của manager… có một cái anh regrut nào đó ảnh giỏi ảnh có thể xử lý liền. Thì cái người Victoria là người chị Manager chị phải push assign cho ảnh"* → "as anh Thuận said, a list arrives that must be called immediately; that's usually the manager's decision… some strong [RECONSTRUCTED: recruiter] could handle it at once, so Victoria, as manager, must push-assign to him".
- **X-14 · GIST** — 1:06:44 *"kiến thức giỏi chỉ là sai thôi nó vô lý quá"* → "[UNCLEAR] good knowledge, just wrong, it's too unreasonable". Probably the senior voice rejecting a premise. I can't tell which one.
- **X-15 · LIKELY** — 1:06:59–1:07:04 *"thì thực chất ra cái new manager đấy nó không phải là cái vai trò gì lớn á nó chỉ đơn giản đánh một cái cô tại"* → "actually that [UNCLEAR: new] manager isn't a big role at all; it simply [UNCLEAR]". The manager's role should be small. 2nd source: CEO 13/08 *"tương lai hệ thống công ty mình á là không cần manager gì nhiều hết á"*.
- **X-16 · LIKELY** (counter-proposal by a junior to the senior) — 1:08:25–1:08:43 *"bởi vì Nếu mà anh lo vấn đề là gọi là người ta lựa anh thì thí dụ thay vì ở đây mình claim từng người… thì mình làm một cái button gọi là random claim… trong danh sách này có 10 người đi thì coi như hiện tại em muốn bóc hai người"* → "if what worries you is people **cherry-picking**, then instead of claiming one by one, we make a **random claim** button: of [digit] people in the list, I take *hai* (two) at random". This reveals the senior's concern: cherry-picking. Code partial match: `batch-claim` "claim the next N" exists (D66). I did not verify whether it picks randomly.
- **X-24 · LIKELY** (relationship objection, and reply) — 1:19:44–1:19:59 *"cái app này là con người làm việc với con người. Em làm việc với anh lâu rồi thì hôm nay tình cờ có bạn em té xe… một bạn nào lạ nói chuyện với anh á thì"* → "this app is people working with people; I've worked with you a long time, and if I crash my bike today, some stranger talks to you instead…". Reply, 1:20:01–1:20:10 *"đối với cái lô không quan trọng cái lô mà phải… ai làm cũng được chứ không phải bản nó bận… còn cái chuyện mà relationship đó là thương nghi"* → "for the *lô* it doesn't matter, anyone can do it… relationship is a separate matter [UNCLEAR: thương nghi]". 2nd source for the objection: Miley 17/08 ~55:23 *"cùng một contact thì nó sẽ dễ hơn nó sẽ smooth hơn cho người loan officer"*.
- **X-25 · LIKELY** (end-of-day objection → resolved) — 1:28:05–1:28:41 *"Cái cái auto size của anh nó còn với vấn đề nữa là… cái giờ làm việc kết thúc là 6:00 chiều nhưng mà bây giờ cái list nó đến lúc 5:50… phải gọi trong vòng 1 tiếng đồng hồ thành ra tự cái performance của em bị giảm"* → "**your** [RECONSTRUCTED: auto-assign] has another problem: work ends at [digit], a list arrives at [digit], must be called within [digit] hour, so my performance drops". Resolution, 1:29:23–1:29:50 *"tiếng giờ làm việc chứ không…"*, *"tiếng tiếng làm việc"*, *"ok ok hợp lý"*, *"tính hôm nay chỉ tính 1 phút thôi ngày hôm sao tính tiếp"* → "working hours, not…", "working hours", "ok ok, reasonable", "count only [digit] minute today, continue counting tomorrow". **The SLA clock runs on business hours.** 2nd source: code `BusinessHoursCalendar` (D55/D104/D111, "the clock stops instead of shifting the anchor"); 05/08 *"three business hours"*. A final *"à tính giờ thiệt mà"* (1:29:56, "oh, it counts real hours") leaves a little doubt about who conceded what.
- **X-26 · GIST** — 1:29:46 *"nhưng mà nên sai luôn là sai luôn"* → "but [RECONSTRUCTED: assign] anyway, just assign". It seems to say "assign even near end of day". Everything rests on reading *"sai"* as assign.

### Process and communication (senior voice)

- **X-17 · CLEAR** — 1:10:55–1:11:20 *"ghi nhìn cái chi tiết xuống… dạy sao giải thích sau này đưa cho bạn này đưa đưa cho và đưa cho manager luôn… nhân viên cũng thấy được luôn để mà mọi người view giống nhau hết tất cả app đều bu giống nhau Mình giải thích cho nó nhân viên cũng hiểu, manager cũng hiểu nha. Em viết xuống giùm anh."* → "write the details down… explain it so it can be handed to staff and to managers… so everyone sees it the same way; all apps built the same way; explain so staff understand and managers understand. **Write it down for me.**" An action item.
- **X-18 · LIKELY** — 1:11:23–1:11:36 *"Hiện tại về cái đốc của mình về cho capacity cho FCB thì có Ừ anh coi rồi review lại chia sẻ cho mấy team khác em cũng buill giống dậy nha"* → "the doc on capacity for [UNCLEAR: FCB] — I've looked; review it and share with the other teams, and build the same way". Action item. "FCB" is not decoded.
- **X-33 · GIST** — 1:11:48 *"khô tập ra đó thôi cứ để y ra ai thích cái này để"* → "[UNCLEAR] just leave it, whoever likes this…". Possibly "leave it optional". I can't recover it.
- **X-7 · GIST** — 44:34 *"Đóng đi đóng đi đóng đi"* → "close it ×3". An instruction to close the omni page (the demoer at 44:36: *"Đóng lại đóng cái trang này đi qua lại"*). I can't tell whether it was impatience with omni or just "move on".

### Count per marker (§3 items)

| Marker | Count | Items |
|---|---|---|
| CLEAR | 8 | X-1, X-2, X-3, X-8, X-17, X-29, X-30, X-31 |
| LIKELY | 17 | X-4, X-6, X-10, X-11, X-12, X-15, X-16, X-18, X-19, X-21, X-22, X-23, X-24, X-25, X-27, X-28, X-32 |
| GIST | 8 | X-5, X-7, X-9, X-13, X-14, X-20, X-26, X-33 |
| **Total** | **33** | |

---

## 4. Contradictions with earlier meetings (05/08–17/08) and with the code

Written after §1–3. `GAP-ANALYSIS.md` was consulted only for this section (its §4 C-001 resolution and rows 136/137/192).

### C-A ⚠ HIGHEST — the senior voice appears to push *toward* assignment again, against the 13/08 "claim-first / self-manage" position that GAP §4 treats as settled. Confidence: LIKELY on the direction, identity inferred.

- **Before.** CEO 13/08 first-hand: *"nhân viên phải tự quản lý cái công việc của mình"*, *"Tại sao phải để cho manager nhảy vô giúp?"*, and he rejects the manager-driven workload idea. GAP §4 concludes "routing_rules should stay hollow; do not build round-robin for recruiters". Code D55/D66: "không auto-assign", and a human presses the claim button.
- **On 22/09.** Juniors address the senior as if *he* owns an auto-assign proposal:
  1:28:05 *"Cái cái auto size **của anh** nó còn với vấn đề nữa"* → "**your** auto-assign has another problem".
  1:08:25 *"Nếu mà **anh lo** vấn đề là… người ta **lựa**"* → "if **you're worried** about people cherry-picking".
  They then argue against it: overload (X-27, 58:26), Victoria's manual preference (X-28, 52:50), relationship continuity (X-24, 1:19:44), end of day (X-25, 1:28:05). The senior voice answers with scale (X-19, *"làm sao mình quản lý được"*), anyone-can-do-it (X-24 reply) and *"nên sai luôn là sai luôn"* (X-26, 1:29:46).
- **Why it matters.** If the reading holds, the CEO's concern has moved from "don't make the manager assign" (13/08) to "people cherry-pick, and manual won't scale". That is exactly the case GAP §4 says not to build for. **The word carrying this is "sai / size / ass" → assign (RECONSTRUCTED).** The pronoun *"của anh"* and *"anh lo"* are clean.
- **Alternative reading, which I can't exclude.** The senior voice is asking for **escalation / reassignment on breach** (X-21 "deadline thứ nhì… cho nó nhảy vô"), not intake round-robin. The juniors may be hearing that as "auto-assign". Both readings contradict current code (C-C).

### C-B ⚠ The demo told the company about mechanisms the code does not have. Confidence: CLEAR on what was said; code verified.

- 29:17 *"system sẽ tự động assign"* via *"Rubin Round"*. 52:43 *"nó có chức năng là Robin Round"*. 1:13:14–1:13:25: people who filed leave ahead are *"tự động loại trừ… khỏi… auto"*, and in sudden sickness *"auto ass đó vẫn assign cho người đó"*.
- Code (`recruit-be` 288eb81): no auto-assign or round-robin in `src/main`. The only "auto-assign" hits are comments saying **not** auto-assign (`BatchClaimService`: *"D55: no auto-assign at the top of the funnel"*). No time-off or leave model in `src/main` (grep for time-off / leave / out-of-office / availability finds only an unrelated `FollowUpAvailability` bridge class). GAP rows 136/137 say the same (❌ `routing_rules` hollow).
- So round-robin was presented as existing and switched off, and time-off exclusion as working. Either it is roadmap talk narrated as present, or a misstatement to a company-wide audience. Worth correcting before anyone plans around it.

### C-C — Auto-reassignment after a deadline: agreed on 05/08, not built, and re-requested on 22/09. Confidence: LIKELY.

- 05/08: Benjamin proposed and Victoria accepted reassigning after no action within a window, counted in business hours (*"it can automatic assign after 3 hours and no one takes it… then they can assign to someone so that I'm okay"*; *"three business hours… it's going to assign to someone else let's let's do that"*).
- Code: D55 routes no-claim-after-N-minutes to **Exceptions** (a manager screen), not to reassignment. The demoer confirms manual handling: *"người manager phải login vào người đó dạng assign cho người khác"* (1:13:22).
- 22/09: the senior voice asks for a *"deadline thứ nhì"* after which it *"nhảy vô"* (X-21, 1:16:17). His question *"sao nó nhảy không"* (Q15, 1:15:44) went unanswered.
- This is not a reversal. It is a request from 05/08 that is still open and now has CEO weight behind it.

### C-D — Manager-centred design demoed, while the CEO (13/08 and again 22/09) says the manager role should be small. Confidence: LIKELY.

- The demo put the manager at the centre of assignment: push-assign an urgent list (X-32, 1:04:30), an assign-anyone screen (D19, 1:12:05), reassigning for sickness (1:13:22), monitoring (D22).
- The senior voice on 22/09: *"cái new manager đấy nó không phải là cái vai trò gì lớn á"* (X-15, 1:07:04). The demoer seems to concede: 1:12:19 *"tương lai là không cần thiết anh chứ hiện tại là"* → "in future it's not needed, anh, but for now…".
- This matches CEO 13/08. The **peer-to-peer self-serve transfer** the CEO asked for on 13/08 was not shown at all (GAP row 192: no peer-to-peer UI).

### C-E — Victoria cited as the authority for "manual for now", after the CEO said on 13/08 that her approach isn't the best. Confidence: LIKELY.

- 22/09: *"chị Vi muốn là hiện tại là manual đi cái đã"* (52:58–53:01).
- 13/08, CEO right after the work-balance point: *"Anh đã nói em rồi, cái kiến thức của Victoria không phải lúc nào cũng đúng… không phải là the best"*.
- GAP §4 argues that Victoria and the CEO were never opposed. The 22/09 exchange (C-A) is fresh evidence to re-test that claim.

### C-F — Contact continuity: Miley (17/08) wants the same person across hand-offs; the senior voice (22/09) says anyone can do it. Confidence: GIST.

- 17/08 ~55:23: *"cùng một contact thì nó sẽ dễ hơn nó sẽ smooth hơn cho người loan officer đấy"*.
- 22/09: *"đối với cái lô không quan trọng… ai làm cũng được"* (1:20:01–1:20:05), with "relationship" set aside as something else (*"thương nghi"*, UNCLEAR). This may be a distinction (loan task vs. relationship) rather than a contradiction. Chase it.

### C-G — Numbers narrated in the demo may disagree with the seeded config. Confidence: UNUSABLE as fact; flagged for a runtime check.

- Per-source SLA: transcript digits at 38:10–38:14 read Facebook→1, web→24, event→4 (hours). Code seed V017: `WEB_FORM:1, FB_ADS:1, REFERRAL:4, WEBINAR:24, EVENT_RSVP:24`. Facebook agrees; "web" and "event" appear swapped against the seed.
- No-answer ladder: transcript digits at 41:56 read "3 / 5 / 15 / 30 ngày". Code V074 seeds `[3,5,10,30]`.
- Under rule 3 these digits can't adjudicate anything. But settings are effective-dated and runtime-editable, so the fastest check is to read the **live staging** `recruit_settings` values, not the migrations.

### C-H — Nurture: requested on 13/08 as a *stage*; delivered and demoed as an *outcome plus wake date*. Confidence: LIKELY; low stakes.

- 13/08 CEO 41:24: *"ngay đây sẽ thêm một cái stay gọi là nurture"* → "add a [stage] called nurture here".
- Code and demo: `NEUTRAL` is an outcome and `NURTURE` is a status with `nurture_until`. Stages stay S0–S7. The demo (D9, 41:34–42:02) matches the code. This is a change of form, not a rejection. Nobody objected on 22/09.

### Not contradictions, but confirmations worth recording

- Omni: the CEO said on 13/08 to plug in anh Khải's omni instead of building one. The 22/09 demo shows it integrated (D12/D14).
- Focus mode (17/08) → shown (D21), and present in code.
- The business-hours SLA clock (05/08 "business hours") → resolved in the room on 22/09 exactly as the code already does it (X-25).

---

## 5. Glossary additions (decoded corruptions)

"Clean in earlier 5?" was checked by grep on the five earlier transcripts (05/08, 06/08, 11/08, 13/08, 17/08). The counts are occurrences in the order 05/06/11/13/17. **Yes** = the term exists cleanly, so the reading is evidence. **No** = the reading is a guess unless the code supports it.

| Garbled form (time) | Reading | Clean in earlier 5? | Other support | Status |
|---|---|---|---|---|
| `neutral` (28:25, 41:34) · `neutal` (40:24, 42:02) | **NEUTRAL** outcome, which puts the person into **Nurture** | "neutral": **No** (0/0/0/0/0). "nurture": **Yes**, 13/08 ×3 (*"thêm một cái stay gọi là nurture"*) | **Code:** `CallAttitude … 'NEUTRAL'`, FE button `IconMoodNeutral`, hint *"Vào Nurture…"* | **Correction to the brief:** `neutral` is probably **not** a corruption of "nurture". It is most likely the literal UI label **NEUTRAL**, spoken cleanly. Only `neutal` is garbled. Evidence (code). |
| `Rubin Round` (29:17) · `Robin Round` (52:41) · `Round` (53:11) | round robin | **Yes**: 05/08 ×2 ("round robin"); 06/08 `rob Robin` | DECISIONS Q34, FEEDBACK/01 | Evidence |
| `người Cor` (28:02) · `người EO` (28:10) · `người K group` (28:29) | recruiter (person working a list of LOs) | "recruiter": **Yes**, 05/08 ×28, 13/08 ×12 | context: *"người Cor với rất nhiều LO khác nhau"* | RECONSTRUCTED. The role is clear from context; none of the three sounds like "recruiter". Guess. |
| `recuter` (38:28, 51:21) · `recruter` (43:47) · `reiter` (39:48) · `regrut` (1:04:26) | recruiter | **Yes** (as above). 13/08 also has `recruer`, `regret`, `reor` | — | Evidence |
| `onbarding` (1:20:43–1:20:52) · `onarding` (1:22:45) | onboarding | **Yes**, all 5 (20/24/7/18/65) | — | Evidence. The brief's "0 clean" holds; these near-forms were missed by the exact-string count. |
| `contct` · `tắct` (28:50) | contact | **Yes**: 05/08 ×4, 17/08 ×10 | Also clean in this same file at 28:06 and 29:06 | Evidence |
| `ly hết` (28:34) · `ly được` (44:22) | clear (the board / one person) | "clear": **Yes**, 06/08 ×5 | Clean in this same file at 39:24 *"clear được cái vàng"* | Evidence (same-file clean form) |
| `tác chữ` (30:09) | thuật ngữ (terminology) | n/a (Vietnamese) | Clean in this file at 30:34 *"cái thuật ngữ của em"* | Evidence |
| `stay` (30:38, 30:46, 35:42) | stage | "stage": **Yes** (2/2/1/1/1). The same corruption `stay` is in 13/08 (*"thêm một stay nữa"*) | Code `CandidateStage S0…S7`; "S1" said at 30:38 | Evidence |
| `clip` (1:28:29, 1:28:41, 1:28:55, 1:30:01) · `clip này` (30:46) | list | "list": **Yes** (31/28/7/10/45). The same corruption is in 17/08 (*"claim clip đó"*) and 13/08 (*"nguồn clip"*) | — | Recurring ASR corruption across files. Evidence |
| `lock được cái research` (39:54) | log the result (call outcome) | "log": **Yes** (05/08 ×2, 13/08 ×2). `lock` appears in 17/08 too (*"bấm lock"*), equally ambiguous | Code: call-outcome logging | RECONSTRUCTED. Guess leaning evidence |
| `bút ngày` (40:04) · `bú bú họ` (38:31) · `bú liền` (41:00) | book (a date / a meeting) | "book": **Yes** (4/0/0/2/3). 17/08 has `búc lịch` | — | RECONSTRUCTED. Evidence for `bút ngày`; `bú bú họ` is weaker |
| `web nà` · `web bà` (40:13) · `web B` (41:10) | webinar | **Yes**: 05/08 ×8, 13/08 ×8 | Clean in this file at 49:10 *"form webinar"* | Evidence |
| `âm ni` (46:30) · `â ni` (45:50) | omni | **Yes**: 05/08 "omni channel". 13/08 has `om channel`, `omy channel` | Clean *"omni"* in this file at 44:22 | Evidence |
| `model` (41:34, 44:42, 45:45) | modal (dialog) | "modal": **No**. "model": 13/08 ×1, other sense | FE has modal components | Guess (it is plain UI context) |
| `auto size` (1:28:05) · `tính năng size` (1:12:32) · `auto ass` (1:13:22) · `sai` (1:00:05, 1:29:46) | auto-assign / assign | "assign": **Yes** (43/5/0/11/12). "auto assign": **Yes**, 17/08 ×2 | Clean *"auto assign"* in this file at 58:33 | `auto size`/`auto ass`: evidence. **`sai` = assign: guess.** It is load-bearing for C-A and X-26 |
| `lô` (59:05, 1:00:05, 1:00:48, 1:16:35, 1:20:01) | LO (loan officer) **or** loan | "LO": **Yes** (0/1/26/1/10). "loan officer": **Yes** | *"đóng … cái lô"* (close) points to loans; *"cont qua từ application"* points to loan application | Ambiguous. Guess per instance |
| `mo` (1:18:11 *"trong mo có rồi"*) | MOSO (legacy system) | **Yes**: 05/08 ×2, 13/08 ×2 | — | RECONSTRUCTED. Guess |
| `chị Viết` · `chị Vi` (52:53–52:58) | Victoria | **Yes**: Victoria in all 5 | Clean *"Victoria"* in this file at 52:50 and 1:04:30 | Evidence |
| `processor` (1:17:59) | processor (loan processing role) | **Yes**: 13/08 ×1 (*"bản processor"*) | — | Clean; evidence |
| `focus mode` (1:24:48) | focus mode | **Yes**: 17/08 ×1 | Code `FocusClient` | Clean |
| `claim` (1:24:12) · `clim and con` (51:10) | claim · "claim and contact" | "claim": **Yes** (05/08 ×1, 17/08 ×1) | Code `batch-claim` | Evidence |
| `random claim` (1:08:35) | random claim (proposed button) | **No** (only unrelated "random" in 05/08) | — | Clean English, new term |
| `work balance` (52:43) | work balance / workload | **Yes**: 13/08 ×1 | — | Clean |
| `exception` (38:35) | Exceptions (manager screen) | **Yes**: 06/08 ×1, 17/08 ×4 | Code FE `exceptions/` | Clean |
| `pine` (35:42) | UNCLEAR (pipeline? "pin"?) | — | — | Unresolved |
| `âm hữ` (45:05) | UNCLEAR | — | — | Unresolved |
| `FCB` (1:11:23) | UNCLEAR (an acronym for a team or product) | not checked cleanly; no obvious match | — | Unresolved. Ask |
| `somaso` (44:04) | UNCLEAR (probably a candidate's name on screen) | — | — | Unresolved; low value |
| `Bit one` (40:34) | UNCLEAR ("book one"? "button"?) | — | — | Unresolved |
| `scon` (59:50) | UNCLEAR | — | — | Unresolved |
| `thương nghi` (1:20:10) | UNCLEAR ("thương lượng"? a separate negotiation?) | — | — | Unresolved. Load-bearing for C-F |
| `Quan quai` (28:42) | UNCLEAR (probably a filler or a name) | — | — | Unresolved |

---

## 6. What this transcript CANNOT tell us

**Stretches too damaged to use** (fragments only, no recoverable claim):

| Span | Roughly | What was clearly going on |
|---|---|---|
| 33:05–35:30 | 2½ min | Senior voice continuing on usability and labels (X-4, X-5); claims not recoverable |
| 35:42–37:09 | 1½ min | Demoer answering about labels or stages, then the start of the restaurant analogy |
| **53:14–58:20** | **~5 min** | Senior voice, long. Topic seems to be assignment and fairness (*"hồi sinh"* 53:55 "revive"?, *"Cái này cũng tốt"* 54:14 "this is good too", *"bốn đội"* 55:12 "four teams"?). **The largest single hole, right in the middle of the assignment debate.** |
| 59:05–1:04:12 | ~5 min | Senior voice on high performers, load and scale (X-19, X-20); only the scale sentence survives |
| 1:05:13–1:06:38 | 1½ min | "manager control" (*"control manager bị là chặn"*, 1:05:41); not recoverable |
| 1:07:04–1:08:25 | 1¼ min | After "manager isn't a big role": whatever came next |
| 1:09:10–1:10:46 | 1½ min | Reaction to the random-claim proposal. **We do not know whether random claim was accepted.** |
| 1:13:39–1:15:38 | 2 min | After the time-off answer; *"chỉ cho manager cả mọi người"* (1:13:39) → GIST, maybe "show everyone, not just the manager"? |
| 1:18:29–1:19:37 | 1 min | Follow-up on "processor / MOSO already has it" |
| **1:20:56–1:23:52** | **~3 min** | **The answer to "will onboarding have a screen here?" (Q17).** Unreadable. |
| 1:26:45–1:27:55 | 1 min | Manager monitoring view, continued |

**Topics that clearly came up but can't be recovered:**
- **What happened "yesterday."** 31:16 *"như anh nói hôm qua đó tức là cái reminder"*: the senior voice refers to a conversation on or about **21/09** about reminders or adoption. That conversation is not in the corpus.
- Whether **random claim** (X-16) or **second deadline** (X-21) were accepted, assigned an owner, or merely aired. No decision language survives for either.
- What the "capacity for FCB" doc is (X-18), and who owns sharing it.
- The **onboarding** stage's future in this app (Q17). Asked, and the answer is unreadable.
- What *"Đóng đi"* (X-7) was reacting to.
- What was redundant at 45:21 / 48:24 (X-10, X-11): which block was going to be removed.
- The complaint behind Q10 (*"phải nhảy nguồn tại đây"*, "having to jump to the source here").

**Questions whose answers are missing or unreadable:** Q4 (how to force adoption), Q8, Q10, Q15 (does an untaken lead "jump"?), Q16 (what to do when overdue, as it applies to this app), Q17 (onboarding screen).

**Structural limits:**
- **Nobody is named on any turn.** The senior voice = CEO Thuận is an inference from the restaurant analogy and one third-person mention. The demoer is unnamed. The short `>>` turns can't be split between people. Every "who said it" in this file carries that caveat.
- **No number in this file is usable as a fact** (rule 3). That includes the SLA hours per source, the no-answer ladder, the count badge, the day-30 wake demo, the end-of-day times, and the 1000/5000 scale remark. §4 C-G lists where they seem to disagree with code; that needs a live-config check, not this transcript.
- **The first 27 minutes (another project) are absent.** Anything said about the recruit app before 27:25 is not here.
- The timestamp convention (previous-line) is inferred. If the file's convention is actually next-line, every citation shifts by one caption (≈3–10 s, sometimes longer across gaps).
