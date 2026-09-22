# Onboarding Pipeline — Requirements Extraction
**Source:** `docs/transcripts/2026-08-17_miley-dau_onboarding-pipeline-feedback.md` (Zoom auto-transcript, **Vietnamese**, 2952 lines, ~1:44:26)
**Extracted:** 2026-09-22
**Scope:** Onboarding department walkthrough of current MOSO/Tera practice + manager (Victoria) requirements for the Tera Plus rebuild.

> **Quote convention:** every quote is reproduced **verbatim in Vietnamese** (the evidence), followed by an English rendering on the next line marked `*EN:*` (a convenience only). Timestamps are as printed in the source file. Fillers (á, ha, nha, nè, dạ, ờ, ừ) are left in the original and dropped from the translation.
>
> **System labels** (status names, button names, field names) are recorded **exactly as spoken**, including the transcription spelling, so they can be matched against codebase enum values. Where I believe the spoken form is a mis-transcription, I give the spoken form first and my inference in brackets.

---

## Participants and roles

| Person | Role (as stated) | Evidence |
|---|---|---|
| **Miley Dau** (My Ly Đậu; transcribed "Mily", "Mâu", "My", "Mely") | **Onboarding Specialist**, and **also a recruiter** for her own leads. Drives the screen-share of the current onboarding pipeline. | "Miley vừa là recruitter vừa là onboarding specialist là có ba bạn trong team chị là như vậy đấy" — Victoria, 36:48 <br> *EN: "Miley is both recruiter and onboarding specialist — there are three people like that on my team"* |
| **Victoria** ("chị", "chị Victoria") | **Manager of the Recruiting + Onboarding department.** Approves experience-level exceptions, owns the referral admin page, sets team policy, signs off before deploys. | "chị là manager của bên onboarding recruting. Chị không phải manager của bên kia" — Victoria, 1:30:50 <br> *EN: "I'm the manager of onboarding and recruiting. I'm not the manager of the other side."* |
| **Bao** (Bảo) | Tera / Tera Plus dev lead. Asks the requirements questions and demos the new UI in the second half. | "Ủa cái invite loan officer đó là bên recruiting họ click đúng không?" — Bao, 1:24 <br> *EN: "Wait — that 'invite loan officer', it's recruiting who clicks it, right?"* |
| **Chi** | Attendee, near-silent. | "Chắc chi đâu có gì đâu hả Chi ha? >> Ừ. Dạ không ạ." — 1:44:02 <br> *EN: "Chi, you don't have anything, right? — No, nothing."* |
| **Vi / Ví** (chị Vi) | Attendee; Bao asks her to stay behind after the meeting. | "Chị Ví chị Ví chị Ví ở lại với em xíu. Em hỏi cái này xíu." — Bao, 1:44:12 <br> *EN: "Vi, stay behind a moment, I want to ask something."* |

### Named but not present

| Person | Role | Evidence |
|---|---|---|
| **Sarah**, **Liz** | The other two Onboarding Specialists; they take lists in round-robin order after Miley. | "Miley te đầu tiên, Sarah sẽ là người thách thứ hai, rồi Liz sẽ là người thách thứ ba" — Victoria, 55:10 <br> *EN: "Miley takes first, Sarah takes second, then Liz takes third."* |
| **Vina / Wina** | **Recruiter only**, full-time, with no onboarding involvement. | "bạn ấy là bạn Wina ở team chị đây là bạn ấy không hoàn toàn không involve gì vào onboarding mà chỉ là recuer full time thôi" — Victoria, 36:08 <br> *EN: "Vina on my team is not involved in onboarding at all — she's a full-time recruiter only."* |
| **Brian** | **Team Lead** under Victoria. Holds few leads; runs ad-hoc projects and files Tera tickets on Victoria's behalf. | "bạn Brian là bạn team là team lead của của bên chị thì bạn ấy là người giúp cho chị làm các ad projects" — Victoria, 1:13:22 <br> *EN: "Brian is my team lead — he's the one who helps me with the ad-hoc projects."* |
| **Ryan** | Recruiter on the team; used as the worked example of a late/missed follow-up. | "hôm nay anh Ryan ảnh nghỉ hoặc là ảnh bị trẻ hẹn gì đó thì chị sẽ có những cái chức năng như là chị assign cho một cái người khác" — Bao, 1:08:39 <br> *EN: "today Ryan is off or he's late on an appointment, then I'd have functions like reassigning to someone else."* |
| **Jessica** | Source/owner of the LO agreements handed to the Onboarding team for distribution. | "Cái hợp đồng đó là của bên Jessica á họ gửi cho bên Team Onboarding để mình gửi ra cho LO á." — Miley, 21:44 <br> *EN: "That contract comes from Jessica's side — they send it to the Onboarding team for us to send out to the LO."* |
| **anh Thuận** (Thuan) | Executive / decision maker. Wants fewer tickets, wants Tera Plus released next month, approves referral-bonus exceptions, proposed the AI mail gateway. | "anh Thuận nhắn cho chị và các bạn ở Terra là không được tạo nhiều tích nữa" — Victoria, 24:44 <br> *EN: "Thuan messaged me and the Tera people that we mustn't create so many tickets any more."* |
| **Phương Nguyễn / Phương Bùi** | Former Tera-side PMs, both departed. Victoria's ticket to disable LO self-payment dates from their tenure. | "Phương Nguyễn kêu là cứ hai tuần hai tuần nữa, hai tuần nữa xong rồi cuối cùng là đến bây giờ là vẫn chưa thấy gì luôn" — Victoria, 42:32 <br> *EN: "Phuong Nguyen kept saying two more weeks, two more weeks — and now there's still nothing."* |
| **Yến** (Yen) | HR-side contact the dev team already interviewed. | "sau khi nói chuyện với Yến bên SR là gần như là họ họ chỉ đổi status thôi" — Bao, 1:25:15 <br> *EN: "after talking to Yen on the HR side, they basically just change statuses."* |
| **Dê Hoàng** ("de hoàng") + 2 others, incl. a new person "Face" | HR-side people in charge. | "chị biết có de hoàng và gọi nha. À là incharge hai bạn này. Và hình như là bây giờ có bạn một bạn mới tên là Face hay cái gì đó là có ba người." — Victoria, 1:39:08 <br> *EN: "I know De Hoang, and — those two are in charge. And apparently now there's a new person called Face or something, so three people."* |
| **anh Khải / anh Hải** | Owns the shared **omni-channel** plugin service (email/SMS inbox) that Tera Plus could plug into. | "Cái này để coi coi là bên cái project đó là của anh Khải coi có tích hợp được không." — Bao, 1:42:53 <br> *EN: "Let's see whether that project of Khai's can be integrated."* |
| **Rocket** ("Rockit") | Partner company that emails LO lists to the recruiting team. | "kể cả là partner ví dụ Rockit cũng gửi cho tụi chị các list" — Victoria, 1:41:24 <br> *EN: "even partners, e.g. Rocket, also send us lists."* |
| **Jen Trần** | Named LO example used in the hotline-routing discussion. | "Nếu mà cái list này ở cái người Jen Trần này có recruit bằng Miley là phải cho Miley" — Victoria, 1:39:43 <br> *EN: "If this Jen Tran on the list was recruited by Miley then it has to go to Miley."* |
| **Elizabeth** | Named LO example of a lead with no NMLS number yet. | "cái người Elizabeth này họ chưa có cái NOS" — Bao, 1:18:10 <br> *EN: "this Elizabeth doesn't have an NMLS yet."* |

---

## Transcription glossary

Vietnamese auto-transcript with constant Vietnamese/English code-switching. The following normalisations are my inferences from context.

| Transcript spelling | Meaning | Confidence |
|---|---|---|
| onbarding / onbard / onb / onboy / opening / Aing Team | **onboarding** / to onboard / the onboarding team | High |
| onbarding spolit / spolitist / onbarding specialist | **onboarding specialist** | High |
| l officer / lo official / LO / Loo / ler / eo / EO / L Officer | **Loan Officer** | High |
| reot / rerot / reder / roter / rooter / router / ruter / recuter / recor / reger / Rus / Roster | **recruiter** | High |
| palm line / pallet / pumplight / pine / pumine / palm / bay / pay | **pipeline** — occasionally **page** | High |
| Terra / Tera / TRA / team Ter | **Tera** (current system) / **Tera Plus** (the rebuild) | High |
| modex / Modest / Modes | **Modex** — third-party LO production-data provider | High |
| NLRS / NLS / NMOS / NMMS / NOS / NMS / licon / số licon | **NMLS** / NMLS ID | High |
| ILO / interested loan office of palmine | **Interested Loan Officer** pipeline (inbound) | High |
| RLO / rot lo / recruited LO | **Recruited Loan Officer** pipeline (outbound / purchased lists) | High |
| inkless / iside / sai / size / sign | **Inkless** e-signature / "sign" | Medium-High |
| reonboarding / re oning / reon bending / rewarding / pre onboarding | **Pre-onboarding (done)** — the option on the One-on-One Onboarding Meeting field. Bao says it plainly at 30:23: "vô đây click vào pre onboarding" | High |
| one one meeting / 1100 / 11 / one on one | **one-on-one meeting** | High |
| Clly / cònly / còn meet ở Clly | **Calendly** | Medium-High |
| MMI | MMI — market-intelligence site used to look up an LO's closed-loan count by NMLS ID | High |
| 109 / 99 / Canon / Denatin | **1099** (US independent-contractor tax form) | High |
| W2 / W2 hay than | **W-2** (US employee tax form) | High |
| joining fee / joy fee / bay phi / startup fee | the **$100 joining fee** | High |
| tích kịch / tích kit / tích / tích kí | **ticket** | High |
| S app / SR / bên S / HR | **HR** (department / HR app) | High |
| Lường sinh / L sinh / lến licensing | **Licensing** (department) | High |
| thách / thách list / take clip / clip / lad | **take** / **take the list** / **lead** | Medium-High |
| bup / bố sub / band boy | **pop-up** / **pain point** | Medium |
| web Binance | **webinar** | High |
| ad projects | **ad-hoc projects** | Medium-High |
| lôn / lô / luôn (in counting context) | **loan(s)** | High |
| incharge / in chạc | **in charge** | High |
| hối đủ / hồi đủ điều kiện | **hội đủ điều kiện** — "meets the conditions" | High |
| KBI | **KPI** | High |
| bá om channel | **omni-channel** | Medium-High |
| Hord (at 27:50) | **UNCLEAR** — probably the HR task set | Low |

---

## THE ONBOARDING PIPELINE

Stages 0–2 sit upstream in Recruiting. Stages 3–10 are Onboarding-owned. Stages 11–13 involve HR / Licensing / Support. Stage 14 runs in parallel throughout. Stage X is the exception branch.

---

### Stage 0 — Lead sits in the ILO or RLO pipeline

- **Stage name / status label (verbatim):** `interested loan office of palmine` → **ILO / "interested pipeline"**; the counterpart outbound board is described as "mình mua list nè là mình đi kiếm người ta nè" (purchased lists / we go find them). Two separate stores.
- **Who owns it:** Recruiter.
- **Entry trigger:** LO applies inbound (webinar, self-apply, referral) → ILO. Or the company buys a list / Modex data arrives → outbound board.
- **Actions performed:** Recruiter calls, follows up, logs notes, rates interest, sets a next action, may invite the LO to a webinar; checks the LO's NMLS ID on **MMI** to count closed loans.
- **Exit condition:** LO says "I'm ready to join."
- **Manual work:** Working a very long daily list, relying on personal memory of yesterday's unfinished follow-ups.
- **Quote:**
  > **Bao, 1:02:43** — "hiện tại là một ngày làm việc của mình là mình cứ vải cứ vải vào cái ILO để mà cái ILO để mà mình xem một cái list rất là dài ngoài."
  > *EN: "right now a working day means you just dump yourself into the ILO to look at a very long list."*
- **Quote:**
  > **Bao, 1:02:57** — "một cái việc mà mình cần làm việc trong ngày hôm đó là mình phải dựa vào cái ghi nhớ của cái ngày hôm trước đó. Nói chung là giữ sử dụng cái memory của mình."
  > *EN: "the work you need to do that day depends on you remembering the day before. Basically you use your own memory."*
- **Quote (two boards):**
  > **Bao, 1:12:46** — "cái bay này mố nó sẽ thành hai bay khác nhau là một cái hot thì tức là giống như là cái người eo tìm tới mình vậy á chị tham gia web nào hoặc là tự appline này kia nè. Còn cái này là mình mua list nè là mình đi kiếm người ta nè."
  > *EN: "this page will become two different pages — one 'hot', i.e. the LOs who come to us, who join a webinar or apply themselves; the other is where we buy lists and go find people."*

---

### Stage 1 — "Ready to join" declaration

- **Stage name / status label (verbatim):** **no system status exists.** A flag literally called `ready to join` exists **only** on the self-registration path (Stage 2c).
- **Who owns it:** Recruiter.
- **Entry trigger:** The LO tells the recruiter they are ready — after weeks to years of follow-up.
- **Actions performed:** Recruiter posts a message in the team **Google Chat group chat** telling the onboarding team.
- **Exit condition:** An Onboarding Specialist picks it up.
- **Manual work:** **This is the central manual handoff of the entire pipeline — pure word of mouth.**
- **Quote:**
  > **Bao, 38:02** — "ý nói là hiện tại là chỉ có cách là báo miệng với nhau thôi." → **Victoria, 38:04** — "Đúng rồi. Miệng thôi… Bảo miệng thôi."
  > *EN: Bao: "so you're saying that currently the only way is to tell each other verbally." Victoria: "Right. Verbally only… Just word of mouth."*
- **Quote:**
  > **Victoria, 38:56** — "bạn recruitter bạn ấy sẽ phải báo miệng ở trong group chat của tụi chị cho onboarding team"
  > *EN: "the recruiter has to announce verbally in our group chat to the onboarding team."*
- **Quote (Bao naming the gap):**
  > **Bao, 38:09** — "cái em vấn đề em quan tâm là chỉ là báo miệng thôi. Thay vì là những cái trạng thái status nào hoặc là một cái tích nào được bắn auto tới chị."
  > *EN: "what concerns me is that it's only word of mouth — instead of some status, or a ticket being auto-fired to you."*
- **Quote (no objective criterion exists upstream):**
  > **Victoria, 52:31** — "khi mà nói chuyện với một L officer em ạ, nhiều người á họ tất cả hàng tháng trời thậm chí là 1 2 năm để được convince là join mình… nó không có một cái criteria abc gì để tụi chị có thể là ok người này ready to joy"
  > *EN: "when you talk to an LO, many of them take months, even 1–2 years, to be convinced to join us… there's no ABC criteria by which we can say this person is ready to join."*

---

### Stage 2 — Entry into Onboarding (three distinct paths)

- **Stage name / status label (verbatim):** none for 2a/2b. For 2c the status auto-changes to `onboarding`.
- **Who owns it:** Recruiter, or Onboarding Specialist, or the LO themselves.
- **Entry trigger — three variants, enumerated by Victoria:**
  - **2a — Separate recruiter:** recruiter (e.g. Vina) announces in group chat; an onboarding specialist takes it off the round-robin list. The recruiter may click `invite loan officer` themselves so the LO fills the form, **without** requiring the $100.
  - **2b — Same person:** Miley is both recruiter and onboarding specialist; she clicks the invite herself; no handoff at all.
  - **2c — LO self-serve:** the LO uses the public LoanFactory landing page, fills the form, and pays $100 immediately. A ticket fires to Onboarding and the status auto-flips.
- **Exit condition:** an onboarding specialist owns the record and starts calling.
- **Quote (the three cases):**
  > **Victoria, 38:51** — "Thì có ba trường hợp nha. Bảo một là bạn recruitter bạn ấy sẽ phải báo miệng ở trong group chat của tụi chị cho onboarding team. Trường hợp hai là giống như Miley ấy là tự là cả recruiter cộng onboarding luôn. Ok. Còn trường hàm ba ấy là cái người kia họ tự lên website của mình và họ tự joy, họ tự đóng tiền thì cũng rất nhiều trường hợp như vậy nha."
  > *EN: "There are three cases, Bao. One, the recruiter has to announce verbally in our group chat to the onboarding team. Case two is like Miley, who is both recruiter and onboarding. Case three is the person goes to our website themselves, joins themselves and pays themselves — there are a lot of those too."*
- **Quote (2a — recruiter fills the form for the LO):**
  > **Miley, 1:55** — "thứ nhất á là cái người reder á họ sẽ collect thông tin họ sẽ lấy thông tin và họ sẽ điền cho cái người loan officer vào cái form này luôn. Loan officer họ không cần phải điền."
  > *EN: "first, the recruiter collects the information and fills this form in on the loan officer's behalf. The loan officer doesn't need to fill anything in."*
- **Quote (2b — same person):**
  > **Victoria, 36:48** — "Miley vừa là recruitter vừa là onboarding specialist là có ba bạn trong team chị là như vậy đấy… khi mà họ nói là I'm ready to joy, cái người loan officer nói I'm ready to join thì là các bạn ấy sẽ click vào invited to joy."
  > *EN: "Miley is both recruiter and onboarding specialist — three people on my team are like that… when the loan officer says 'I'm ready to join', they click 'invite to join' themselves."*
- **Quote (2c — auto status change):**
  > **Victoria, 42:07** — "Và khi mà họ tự trả ấy là cái status tự động chuyển thành onboarding cho em."
  > *EN: "And when they pay by themselves, the status automatically changes to onboarding."*
- **Quote (2c — ticket to onboarding):**
  > **Miley, 38:27** — "thì cái thì nó cũng sẽ có một cái tích kịch gửi về cho onbarding là ờ lo này họ đóng tiền trên system rồi đó."
  > *EN: "there'll also be a ticket sent back to onboarding saying this LO has paid on the system."*
- **Quote (2c — `ready to join` flag):**
  > **Victoria, 39:15** — "Và cũng có một cái flag là ready to join cái gì với những cái người đó."
  > *EN: "And there's also a 'ready to join' flag or something on those people."*

---

### Stage 3 — `Invite loan officer` → the verification + $100 payment email
*(This is the flow Miley demonstrates on screen at 0:06–1:17, and again at 41:02.)*

- **Stage name / status label (verbatim):** the record's **`action`** menu → option **`invite loan officer`** (also spoken as `invited to joy` / `invite to join` at 37:06).
- **Who owns it:** Onboarding Specialist **or** Recruiter — both can send it.
- **Entry trigger:** the LO is ready to join and (for onboarding) the specialist has spoken to them.

**Step-by-step, with every screen and email named:**

1. **Open the LO's lead record.** From it, the specialist can already see who recruited the LO and who is onboarding them.
   > **Miley, 0:00** — "với lại onboarding ở trên này thì em sẽ check được là ai là người reot cũng như là onboarding cái người l officer này"
   > *EN: "and onboarding up here — I can check who the recruiter is as well as who is onboarding this loan officer."*
2. **Open the `action` section** on the record and choose **`invite loan officer`**.
   > **Miley, 0:12** — "khi mà ờ onbarding specialist onbard người lo official này á thì họ sẽ yêu cầu là họ phải pay cái tiền joining fee là 100 đô ha thì sẽ gửi một cái email như thế này vô phần action trên này và bấm vào cái option là invite loan officer sẽ click vào đây."
   > *EN: "when the onboarding specialist onboards this loan officer, they require them to pay the joining fee of $100 — so you send an email like this, in the action section up here, and press the option 'invite loan officer', click into here."*
3. **Screen: the email-send panel.** Its purpose is to ask the LO to re-check the information already submitted.
   > **Miley, 0:30** — "Thì khi click vào đây thì nó sẽ có cái phần ờ gửi cái email để LO họ check cái lại cái thông tin mà họ đã cung cấp cho bên mình coi có đúng không thì sẽ gửi một cái email như thế này"
   > *EN: "when you click in here there's the part that sends an email for the LO to re-check the information they provided us, to see whether it's correct — so you send an email like this."*
4. **Screen: scroll down inside the panel to see the email template.**
   > **Miley, 0:42** — "thì sẽ click vào cái option này rồi kéo xuống thì sẽ có một cái email template là như thế này"
   > *EN: "so you click this option, then scroll down and there's an email template like this."*
5. **The template carries the `join loan factory` link**, which is how the LO learns to pay the $100.
   > **Miley, 0:53** — "và lo họ sẽ biết để là họ đóng cái tiền 100 đô trên cái link join loan factory"
   > *EN: "and the LO will know to pay the $100 via the 'join loan factory' link."*
6. **Send the email.** The LO receives an email stating they must pay $100, containing the `join loan factory` button.
   > **Miley, 0:59** — "Thì khi mà họ click vào cái link factory này á, khi mà chị bấm gửi cái email này ra ha thì họ sẽ thấy có cái email là đóng 100 đô và họ click vào cái join loan factory"
   > *EN: "when they click this Loan Factory link — once you press send on this email — they'll see the email saying pay $100 and they click 'join loan factory'."*
7. **Screen (LO-facing): the application form they already filled, shown back for a double-check.**
   > **Miley, 1:08** — "khi mà click vô á nó sẽ hiện như thế này để họ double check lại cái form mà họ đã fill out ha."
   > *EN: "when they click in, it shows like this so they can double-check the form they filled out."*
8. **The LO must scroll to the bottom of that form and press confirm/next** before the payment link is revealed. Onboarding routinely has to talk them through this live.
   > **Miley, 31:00** — "Mình phải kêu họ là ừ bấm vào cái link đó rồi sẽ hiện một cái form thông tin ứng tuyển rồi kéo xuống dưới cùng bấm confirm next check hết thông tin coi ok không thì nó mới hiện cái link đóng tiền."
   > *EN: "We have to tell them: click that link, an application-information form appears, scroll to the very bottom, press confirm/next, check all the information is OK — only then does the payment link appear."*

- **Exit condition:** LO pays the $100.
- **Manual work:** the specialist frequently walks the LO through the link on a live call because the pay link is buried behind the form-review step (see step 8).
- **Policy note:** the recruiter version of this same email does **not** have to demand payment.
  > **Miley, 2:44** — "cái step của cái người roter á họ không nhất thiết là họ phải yêu cầu là cái người la officer này phải đóng 100 đô."
  > *EN: "the recruiter's step doesn't necessarily require this loan officer to pay the $100."*
- **Policy note (who is accountable):**
  > **Miley, 3:14** — "onboarding hay là roeder đều có thể gửi được cái email này để kêu LO. Nhưng mà cái việc mà confirm á là lo có đóng 100 đô hay không á là trọng trách ý là cái responsible của cái người onboarding specialist."
  > *EN: "onboarding or the recruiter can both send this email to ask the LO. But confirming whether the LO actually paid the $100 is the responsibility of the onboarding specialist."*
- **Policy note (double-check duty):**
  > **Miley, 2:53** — "Còn cái bước bên Miley á là bên onboarding á thì onboarding họ sẽ double check và confirm lại một lần nữa những cái thông tin đó với cái người L officer đó và họ phải nhắc lo là phải đóng 100 đô"
  > *EN: "Miley's step, the onboarding step — onboarding double-checks and re-confirms that information once more with the loan officer, and they have to remind the LO to pay the $100."*

---

### Stage 4 — Verify the LO received / opened the email

- **Stage name / status label (verbatim):** `action` → **`conversation history`** (Miley first says "audit lock" [audit log] then corrects herself).
- **Who owns it:** Onboarding Specialist.
- **Entry trigger:** the invite email has been sent.
- **Actions performed:** open the record's `action` → `conversation history` to see whether the LO opened the mail; if not, chase them.
- **Exit condition:** LO opens the email and clicks the link.
- **Manual work:** daily manual checking and chasing.
- **Quote:**
  > **Miley, 3:38** — "Thì khi mà lo mở cái mở cái mail này ra nè thì thường bên onboarding họ sẽ check là lo đã mở mail đó chưa thì sẽ vô cái phần hoặc là đã nhận được cái mail đó chưa thì sẽ vô cái phần này action nè hoặc vào phần cái audit lock nè sorry action conversation history nè đây khi mà my gửi cái email đó ha thì ler họ sẽ họ sẽ check họ mở cái mail đó"
  > *EN: "when the LO opens this mail — onboarding usually checks whether the LO has opened it, or whether they've received it, by going into this 'action' part, or the audit log — sorry, action → conversation history — here; when I send that email, I can check that they opened it."*

---

### Stage 5 — $100 joining fee paid → `pay one time fee` link appears

- **Stage name / status labels (verbatim):** the record then exposes **`option thứ hai`** = **`pay one time fee`**, and **`option thứ ba`** = a link to sign the contract (hidden — see Stage 8).
- **Who owns it:** LO pays; Onboarding Specialist confirms.
- **Entry trigger:** the LO clicks through the form and pays.
- **Actions performed:** payment posts back to the system automatically; the second link appears.
- **Exit condition:** payment recorded.
- **Quote:**
  > **Miley, 4:05** — "onboarding sẽ nói là click vào cái link đó để đóng tiền khi mà đóng xong á nó sẽ báo về system là đóng rồi và khi mà đóng xong 100 đô á thì nó sẽ hiện cái option thứ hai là pay one time fee thì họ sẽ thấy có một cái link để ờ pay one time fee. Rồi sau đó là option thứ ba là sẽ thấy có một cái link để ký cái hợp đồng."
  > *EN: "onboarding tells them to click that link to pay; when they've paid, it reports back to the system that it's paid; and once the $100 is paid, the second option appears — 'pay one time fee' — so they see a link to pay a one-time fee. Then the third option is a link to sign the contract."*

---

### Stage 6 — Background / experience verification and manager approval

- **Stage name / status label (verbatim):** `experience level` field. Victoria names the four required values: **"newly license, inexperience, experience và high producer"** (17:07). The dashboard currently shows only two.
- **Who owns it:** Recruiter gathers; Onboarding Specialist re-checks everything; **Victoria approves exceptions.**
- **Entry trigger:** the record is with onboarding (or the LO self-registered and paid).
- **Actions performed:** phone-interview the LO; enter their NMLS ID on the **MMI** website to count previously closed loans; classify experienced vs inexperienced; re-check every field the recruiter or the LO filled; if below the bar, message Victoria with the LO's background and await an exception decision.
- **Exit condition:** experience level and commission tier confirmed → the correct contract variant can be issued.
- **Manual work:** MMI lookups by hand; exception approval by chat message; Victoria may phone the LO's background herself.
- **Quote (MMI lookup):**
  > **Miley, 11:55** — "thì Roster họ sẽ phỏng vấn Loan officer họ coi coi là experience của kinh nghiệm rồi background rồi sẽ check cái số licon coi là đã đóng được bao nhiêu luôn trước đó thì bên Root họ sẽ có một cái website là MMI như thế này đó thì sẽ nhập cái số NMMS ID number trên đó để check coi là Officer họ đã đóng được bao nhiêu lon trước đó tất nhiên là cũng sẽ phải gọi điện cho L officer để phỏng vấn để lấy thông tin nữa thì lúc đó mới confirm là họ là experience hay là inexperience."
  > *EN: "the recruiter interviews the loan officer to look at their experience and background, and checks their licence number to see how many loans they closed before. Recruiting has a website called MMI — you enter the NMLS ID number there to check how many loans the officer closed previously. Of course you also have to phone the LO to interview them and get information, and only then confirm whether they are experienced or inexperienced."*
- **Quote (onboarding re-checks everything):**
  > **Miley, 11:01** — "khi mà reduer họ gửi thông tin cho onboarding á onbarding phải double check hết lại tất cả các thông tin trên cái form mà lo đã điền hoặc là rootter đã điền coi là điền thông tin đúng không"
  > *EN: "when the recruiter sends the information to onboarding, onboarding has to double-check all the information on the form that the LO filled or the recruiter filled, to see whether it was entered correctly."*
- **Quote (manager approval required):**
  > **Bao, 12:28** — "Rồi cái người đó đánh giá xong rồi là chị biết tôi có duyệt không?" → **Victoria/Miley, 12:33** — "Phải duyệt confirm. / Đúng đúng rồi. / Nhiều manager phải duyệt."
  > *EN: Bao: "and once that person has assessed them, do you have to approve?" — "It must be approved/confirmed. / Right. / Yes, the manager has to approve."*
- **Quote (the exception path cannot be automated):**
  > **Victoria, 15:25** — "những cái mà exception thì không thể automate được for sure, right? Bởi vì chị sẽ phải là người đọc những cái tin nhắn đó rồi background rồi này nọ cần thì chị sẽ phải gọi điện."
  > *EN: "the exceptions definitely can't be automated, right? Because I have to be the one reading those messages, the background and so on — if needed I'll have to make a call."*
- **Quote (dashboard doesn't show the levels — explicit ask):**
  > **Victoria, 17:17** — "ở trong cái report này tụi em chỉ có ít experience và inexperience thôi nên là nó rất là khó để cho chị để cho chị chị biết ấy… các em nếu mà là you are the right contact thì sửa cái này dùng cho chị ha."
  > *EN: "in this report you only have experienced and inexperienced, so it's very hard for me to know… if you're the right contact, please fix this for me."*
- **Quote (the field already exists upstream):**
  > **Victoria, 18:24** — "ở trên interested pline là có bốn loại experience luôn chứ không phải có hai loại như này đâu. Nên là nhìn này rất là khó để biết."
  > *EN: "on the interested pipeline there are actually four experience types, not just two like this. So it's very hard to tell from this view."*

---

### Stage 7 — One-on-one onboarding meeting (booked and run manually)

- **Stage name / status label (verbatim):** the record field is **`one on one onbarding meeting`** (Miley, 4:31). There is a separate action button **`invite one one meeting`** which routes to Calendly and is **not used**.
- **Who owns it:** Onboarding Specialist.
- **Entry trigger:** the specialist learns the LO is ready (chat message, ticket, or she is the recruiter herself).
- **Actions performed:**
  1. Phone the LO and agree a time (e.g. 10:00 or 11:00).
  2. **Manually** create a Google Meet and email the invitation.
  3. Run the meeting. In it: confirm the LO can reach the payment link and walk them through form → confirm → pay; confirm **W-2 vs 1099**; confirm the commission tier; confirm they are willing to sign.
- **Exit condition:** meeting held and W-2/1099 + commission agreed.
- **Manual work:** **entirely manual.** No Google Meet integration, no auto-scheduling, no automatic status change.
- **Quote (manual Google Meet):**
  > **Victoria, 28:53** — "Bên chị sẽ gửi một cái lịch meeting giống như em gửi cái meeting cho chị nè. Em add chị với lại VI nè. Ờ thì chị cũng onbarding lo thì chị cũng gọi điện cho L Officer đó rồi chị confirm lịch là L officer đó họ sắp xếp được 1100 gặp chị không hay là 10:00 gặp chị không. Nếu mà họ sắp xếp gặp chị được lúc 10:00 hoặc lúc 11:00 thì chị gửi qua email cho họ để chị setup một cái Google Meet giống như kiểu mình đang meeting bây giờ thôi. Không khác gì hết á."
  > *EN: "We send a meeting invite, just like you sent me this meeting and added me and Vi. When I onboard an LO, I phone that loan officer and confirm a time — can they meet me at 11:00 or at 10:00. If they can meet at 10:00 or 11:00, I email them and set up a Google Meet, exactly like the meeting we're in now. No different at all."*
- **Quote (nothing is automatic):**
  > **Bao, 29:19** — "À chứ nó không phải là một action nào đó trong cái cận kia." → **Victoria, 29:21** — "Không nó không có tự động hay là gì hết nha."
  > *EN: Bao: "so it isn't some action in the system." Victoria: "No, there's nothing automatic at all."*
- **Quote (the Calendly button exists but is unused, and she likes the idea):**
  > **Victoria, 29:31** — "Cái này hình như là one one này là còn meet ở Clly ấy chứ cũng không phải là meet ở Google Meet đâu… chị thấy cái 11 này rất là hay nha… nhưng mà hình như là system của mình là không integrate được Google Meet vào trong đó luôn á. Nên tụi em có thể consider change như thế nào thì change nhưng mà tạm thời cái đấy là tụi chị không có dùng bây giờ luôn á là cứ dùng là Google Meet rồi nhắn tin hoặc email."
  > *EN: "This one-on-one seems to meet in Calendly, not in Google Meet… I think this 1:1 is very nice… but apparently our system can't integrate Google Meet into it. So you can consider changing it however you want, but for now we don't use it at all — we just use Google Meet plus messaging or email."*
- **Quote (what happens inside the meeting):**
  > **Miley, 30:35** — "trong cái buổi meeting này nè khi mà chị nói chuyện với L á là chị sẽ làm những cái thao tác đó trong cái buổi meeting đó luôn và chị sẽ check với lo là họ có nhận được cái email link đóng tiền và họ có làm mấy cái bước đóng tiền có đúng hay không và chị sẽ coi coi là họ có nhận được cái email để ký hợp đồng không."
  > *EN: "in this meeting, while I'm talking to the LO, I perform those operations right there in the meeting, and I check with the LO whether they received the payment-link email and whether they did the payment steps correctly, and I check whether they received the email to sign the contract."*
- **Quote (confirming the contract in the meeting):**
  > **Miley, 31:22** — "trong cái meeting đó mình sẽ giải thích với L với lại mình confirm mấy cái thông tin về về cái hợp đồng với L để L có ok để họ ký liền không."
  > *EN: "in that meeting we explain to the LO and confirm the contract information with them, so they're OK to sign right away."*

---

### Stage 8 — Set `pre onboarding done` → releases the contract for signature

- **Stage name / status label (verbatim):** on the **`one on one onbarding meeting`** field, `select` → the option Miley reads out as **"reon bending done"** / **"reoning done"**, and which Bao names plainly as **`pre onboarding`** (30:23). Treat the enum value as **`pre-onboarding done`**.
- **Who owns it:** Onboarding Specialist.
- **Entry trigger:** the 1:1 meeting has happened and W-2/1099 + commission tier are confirmed.
- **Actions performed:** open the record → `one on one onbarding meeting` → select → `pre onboarding done`. This does **two** things at once.
- **Exit condition:** the LO receives the "please sign agreement" email with the contract link.
- **Manual work:** the checkbox itself. Without it the LO sees only the payment link and a "your information is being reviewed" screen.
- **Quote (the click is what releases the contract):**
  > **Miley, 4:31** — "để ký cái link này á thì cái người onboarding spolit á phải click vào cái option này là one on one onbarding meeting. Khi mà check vào trong cái ion để mình click row á thì cái người onbarding phải click row là đã gặp one on one meeting rồi. Click row thì nó mới hiện nó mới chuyển hệ thống mới tự động gửi cho một cái email để cho cái người la officer đó họ ký cái hợp đồng."
  > *EN: "to sign via this link, the onboarding specialist has to click this option, 'one on one onboarding meeting'. The onboarding person has to tick that they've held the one-on-one meeting. Only once it's ticked does it change, and only then does the system automatically send an email for that loan officer to sign the contract."*
- **Quote (the gate is real and blocking):**
  > **Miley, 5:23** — "còn nếu mà cái người l cái người onbarding specialist á họ không có ờ check vào cái option này reoning done này nè họ không click rồi á thì ừ cái người official họ sẽ chỉ thấy là cái link để đóng tiền thôi còn cái link để ký hợp đồng họ sẽ không có thấy. Nó sẽ không có hiện cái hợp đồng để cho ký thì phải click nút này để lo họ nhận được cái link để ký."
  > *EN: "if the onboarding specialist doesn't tick this 'pre-onboarding done' option, if they don't click it, then the loan officer will only see the link to pay — they won't see the link to sign the contract. The contract won't appear for signing. You have to click this button for the LO to receive the link to sign."*
- **Quote (status change AND email, confirmed explicitly):**
  > **Bao, 32:22** — "có nghĩa là nó là một cái hành động đổi status và gửi một cái mail hay là nó chỉ đơn giản là đổi status thôi" → **Miley, 32:31** — "gửi mail vừa đổi status vừa khi mà đổi status system nó sẽ tự động biết để nó gửi cái email này luôn" → **Bao, 32:38** — "phải click vào cái nút đó thì nó cái email này nó mới gửi ra" → **Miley, 32:46** — "phải click vào ừ em hiểu không phải click vào cái link đó thì cái mail này mới gửi ra nha"
  > *EN: Bao: "so is it an action that changes status AND sends an email, or is it simply a status change?" Miley: "It sends the mail and changes the status — when the status changes the system automatically knows to send this email." Bao: "You have to click that button for this email to go out." Miley: "You have to click it — you have to click that link for this mail to go out."*
- **Quote (dual purpose):**
  > **Miley, 33:45** — "khi mà chị click vào đây á mục đích là để nó sẽ báo một cái email cho để lo ký cái hợp đồng và chị cũng sẽ biết được là chị đã gặp cái lo này rồi. Nó có hai chức năng. Thứ nhất là chị sẽ biết được là chị đã gặp Loo này rồi và thứ hai là chị đã biết là chị đã gửi link cho Loo để họ ký hợp đồng."
  > *EN: "when I click here, the purpose is to fire an email for the LO to sign the contract, and also so I know I've already met this LO. It has two functions: first, I know I've met this LO; second, I know I've sent the LO the link to sign the contract."*
- **Quote (W-2/1099 must be confirmed before this click):**
  > **Miley, 9:31** — "cái người onbarding spolit á họ phải confirm với là lo w2 hay là 1099 thì lúc đó mới gửi cái link để cho họ ký hợp đồng. Và cái người la officer đó họ phải confirm với cái người onbarding spolit á là họ muốn nhận commission là W2 hay là 1099. thì mới tới cái bước để ký hợp đồng. Loo họ phải confirm trước thì mình mới gửi hợp đồng ra cho LO ký."
  > *EN: "the onboarding specialist has to confirm with the LO whether it's W-2 or 1099 — only then do we send the link for them to sign the contract. And the loan officer has to confirm with the onboarding specialist whether they'll take commission as W-2 or 1099, and only then do we get to the contract-signing step. The LO has to confirm first before we send the contract out to sign."*
- **Quote (the signing step CANNOT be moved earlier):**
  > **Miley, 11:28** — "Nên là không có nên là không thể nào mà cái bức ký hợp đồng là process trước đó được. Phải gặp onbarding spolitist và onbarding specialist xác nhận confirm là nhận cái commission như thế nào và 1099 hay là W2 thì mới gửi hợp đồng cho lo để ký."
  > *EN: "So the contract-signing step absolutely cannot be processed before that. They have to meet the onboarding specialist, and the onboarding specialist has to confirm how the commission works and whether it's 1099 or W-2 — only then do we send the contract for the LO to sign."*
- **Quote (what a self-paid LO sees instead):**
  > **Miley, 8:29** — "khi mà họ bấm thêm cái nút next tiếp theo á thì nó sẽ không có hiển thị cái link để LO họ ký hợp đồng. Nó sẽ chỉ hiển thị là review and thông tin của bạn đã được review thôi. Còn bên mình sẽ thông báo khi nào mà document nó ready. Đó nó sẽ chỉ hiển thị thông tin như thế này cho L officer thôi. L Officer họ sẽ không có cái link nào để họ họ ký hợp đồng hết."
  > *EN: "when they press the next button again, it doesn't show the link for the LO to sign the contract. It only shows 'review' and that your information has been reviewed, and that we'll notify you when the document is ready. That's all it shows the loan officer. The loan officer has no link at all to sign the contract."*

---

### Stage 9 — LO signs the agreement (e-signature)

- **Stage name / status label (verbatim):** no named status; the record **"tự chuyển sang màu xanh"** (turns green) once paid + signed. Miley summarises the whole onboarding surface as "chỉ cần check 1 2 3 ba cái option này".
- **Who owns it:** LO signs; Onboarding Specialist monitors.
- **Entry trigger:** the automatic email from Stage 8.
- **Actions performed:** LO clicks the link, sees the agreement (W-2 or 1099 variant with the correct commission split), signs. The system reports back. An automatic email then goes to the LO with a copy of what they signed.
- **Exit condition:** signature recorded.
- **Quote (turns green / three checkboxes):**
  > **Victoria, 31:44** — "chị gửi mail này đúng không? Khi mà đóng tiền xong, ký xong rồi đúng không? System nó tự chuyển sang màu xanh đúng không? Thì là xong rồi. Thì chỉ cần check 1 2 3 ba cái option này là phải đ thôi. Ba cái option này nè."
  > *EN: "I send this mail, right? Once they've paid and signed, right? The system turns green by itself, right? Then it's done. You just need to check these 1-2-3 three options. These three options."*
- **Quote (signed-copy email):**
  > **Miley, 34:11** — "Và đặc biệt á là khi mà lo ký xong á thì sẽ có một cái email tự động gửi về cho á là lo check được mấy cái hợp đồng mà lo đã ký luôn. Đó thì nó sẽ báo về cho mail của EO với cái email như thế này thì họ sẽ check được cái hợp đồng mà họ đã ký nè."
  > *EN: "And notably, once the LO has signed, an automatic email is sent so the LO can check the contracts they signed. It goes to the LO's mailbox as an email like this, and they can review the contract they signed."*
- **Quote (Miley's own summary of the onboarding team's entire click-surface):**
  > **Bao, 34:41** — "trên cái màn hình này bên onbarding team là chỉ có vào cái action click cái invited la officer là cái thứ nhất để gái thứ hai là chỉ chuyển cái tin one onarding truyền thành cái rewarding thôi." → **Victoria, 35:03** — "Và cộng thêm cả setup cô nữa là chị cũng phải click vào cái đó."
  > *EN: Bao: "on this screen, the onboarding team only goes to 'action' and clicks 'invite loan officer' — that's the first; the second is just switching the one-on-one onboarding to 'pre-onboarding done'." Victoria: "Plus the setup call — you have to click that as well."*

---

### Stage 10 — Tickets fire to HR and Licensing

- **Stage name / status label (verbatim):** ticket to **`HR Department`** (create account) and ticket to **`licensing department`** (request NMLS sponsorship).
- **Who owns it:** the system fires them; HR and Licensing own the work.
- **Entry trigger:** **both** the $100 paid **and** the contract signed. Neither alone is sufficient.
- **Actions performed:** HR receives a ticket to create the LO's account; Licensing receives a ticket to request the NMLS sponsorship.
- **Exit condition:** HR marks complete; Licensing marks sponsorship approved.
- **Quote:**
  > **Miley, 5:52** — "Thì khi mà pay vào size rồi á thì lúc này bên HR họ sẽ nhận được một cái ticket để họ tạo account cho L officer này. Và bên Lường sinh họ cũng sẽ tạo nhận được một cái ticket á để họ request sponsor licens cho loan officer. Thì phải xong được hai bước này thì bên HR Department với lại licensing department mới nhận được cái ticket gửi về để họ làm mấy cái bước tiếp theo. Còn không á là bên HR với L sinh họ không có tích kịch để họ biết họ làm mấy cái bước tiếp theo."
  > *EN: "Once they've paid and signed, HR receives a ticket to create the account for this loan officer. And Licensing also receives a ticket to request the sponsorship licence for the loan officer. Both those steps have to be complete before the HR Department and the licensing department receive the ticket that lets them do the next steps. Otherwise HR and Licensing have no ticket telling them to do the next steps."*
- **Quote (the fragility this creates — Victoria's warning to the dev team):**
  > **Victoria, 22:34** — "hoặc là bị lỗi không pay được tiền là coi như là sẽ bị chậm cái process onbo nha là ngày hôm sau HR hoặc là licensing họ sẽ không có tích kịch để họ làm mấy cái step tiếp theo đâu nha là sẽ pending hết toàn bộ tất cả cái workflow của các department khác luôn á chứ không phải chị riêng team chị nha"
  > *EN: "or if there's a bug and payment fails, the onboarding process gets delayed — the next day HR or licensing won't have a ticket to do their next steps, and the entire workflow of all the other departments goes pending, not just my team."*

---

### Stage 11 — HR completes → ticket back to Onboarding for the Setup Call

- **Stage name / status label (verbatim):** the HR-owned field set to **`complete`**. Onboarding must never touch it.
- **Who owns it:** HR sets it; Onboarding receives the resulting ticket.
- **Entry trigger:** HR finishes its onboarding tasks.
- **Actions performed:** a ticket fires back to the onboarding specialist saying this LO needs a setup call.
- **Exit condition:** onboarding schedules the setup call.
- **Quote:**
  > **Miley, 27:04** — "Khi mà khi mà cái phần cái step mà cái này là bên HR họ sẽ chỉnh mình không có động vô cái này. Khi mà họ chỉnh là complete… cái này là của bên team họ nha. Mình không có động vào. Khi mà họ chỉnh complete nè thì nó sẽ gửi một cái tích cho mình báo là lo này cần làm setup con. Khi mà họ chỉnh trên này là nó sẽ tự động báo ticket về cho em thì em sẽ biết được. Rồi em sẽ check ticket và sau đó là em sẽ click vào setup call nè."
  > *EN: "This step is adjusted by HR — we don't touch it. When they set it to complete… this belongs to their team. We don't touch it. When they set complete, it sends a ticket to us saying this LO needs a setup call. When they adjust it here, a ticket is automatically reported to me and I'll know. Then I check the ticket and then I click on 'setup call'."*

---

### Stage 12 — Setup Call (mandatory second call by Onboarding)

- **Stage name / status label (verbatim):** the button **`setup call`** ("setup cô" / "setup cod" / "setup con" in the transcript), sitting under the onboarding section.
- **Who owns it:** Onboarding Specialist. Victoria says either onboarding or recruiting, or both, may click it.
- **Entry trigger:** the HR-complete ticket from Stage 11.
- **Actions performed:** call the LO again (Google Meet **or** phone). Walk them through LoanFactory resources: the marketplace, who to meet, where to find rates and lenders. Then send a **follow-up email** with the same content written down so the LO has something to refer back to. Then click `setup call`.
- **Exit condition:** `setup call` clicked. It contributes one of the three conditions for 100%.
- **Manual work:** mandatory human call + hand-written resource email.
- **Quote:**
  > **Victoria, 26:08** — "Có một cái gọi là setup call. Setup co là gần cái lúc mà họ onbard xong hết mọi thứ ấy là tin của chị onbarding lại phải gọi cho họ một lần nữa. Ờ either qua Google Meet hoặc là phone để nói với họ là ok L factory có những cái resource ABC Xz này này. Vô ví dụ marketplace để gặp người này người kia rồi vô cái chỗ này chỗ kia để tìm được rate tìm được lender ABC Xz giống như vậy đó. thì là team của chị bắt buộc phải có một cái setup cô như vậy nha. Và share rất là nhiều những cái information và resources."
  > *EN: "There's something called a setup call. The setup call is near the point where they've finished onboarding everything — my onboarding team has to call them one more time, either via Google Meet or phone, to tell them OK, Loan Factory has these resources A-B-C. Go for example to the marketplace to meet this person and that, go to this place and that to find rates and lenders and so on. My team is required to have a setup call like that. And they share a lot of information and resources."*
- **Quote (follow-up written email):**
  > **Victoria, 26:38** — "Và xong cái cô đấy là họ còn gửi một cái email nữa để các những người đấy có cái written like written gọi là content để họ refer nếu mà họ quên đúng không?"
  > *EN: "And after that call they also send another email so those people have written content to refer back to if they forget, right?"*
- **Quote (Victoria explicitly asks the dev team to keep this step):**
  > **Victoria, 27:28** — "Thì team Terra chị chỉ muốn nhắc thêm một cái bước nữa như vậy trước khi mà tụi chị 100% onbard được."
  > *EN: "So Tera team — I just want to flag one more step like that before we can reach 100% onboarded."*

---

### Stage 13 — `100%` onboarded (three-condition gate) → handoff to Support

- **Stage name / status label (verbatim):** **`100%`** (contrasted with the still-onboarding state, "đang onboarding đang chưa chưa 100% onbard được").
- **Who owns it:** the system computes it; it requires three separate teams.
- **Entry trigger:** **all three** of — (1) HR marks its step `complete`; (2) Licensing marks the **sponsorship approved** (Licensing adjusts "hai cái option này" — two options); (3) Onboarding clicks `setup call`.
- **Actions performed:** status flips to 100%; a ticket goes to the **support team** and a **support specialist** is assigned.
- **Exit condition:** LO is live; Support owns them ongoing.
- **Quote (the three-way gate):**
  > **Miley, 27:45** — "mấy cái bước mà bên HR licensing họ làm tiếp, process tiếp thì cứ onboarding họ cứ follow up với lại LO rồi họ check tiếp với đến khi nào mà họ hoàn thành thì khi mà hoàn thành mấy cái Hord này nè hoặc là cái sponsorship được approve nè, licensing họ chỉnh nè, chỉnh hai cái option này nè thì lúc đấy là mới nhảy qua là 100%."
  > *EN: "for the steps HR and licensing continue to process, onboarding just keeps following up with the LO and keeps checking until they're done. When these [HR tasks] are done, or the sponsorship is approved — licensing adjusts these two options — only then does it jump to 100%."*
- **Quote (confirmed as exactly three steps):**
  > **Bao, 32:56** — "ở dưới cái cái onboarding code đấy là có cái setup thì theo chị biết là khi mà nhấn vô cái setup cod đấy thì nó sẽ chuyển thành 100% đúng không?" → **Miley, 33:08** — "sẽ chưa có chuyển thành 100% luôn đâu chị. Phải cái này HR họ chuyển thành rồi cái này đổi thành là được appro này thì mới cái này mới thành 100% được… Cộng thêm cái setup kh đấy nữa." → **Victoria/Miley, 33:23** — "đúng rồi. Phải ba bước. Một bước, hai bước. Ba bước thì hai cái bước này là của team khác làm. Mình chỉ làm cái bước này thôi."
  > *EN: Bao: "under the onboarding section there's the setup — as far as you know, when you press setup call it turns to 100%, right?" Miley: "It doesn't go straight to 100%. HR has to change this one, and this one has to change to approved, only then can it become 100%… plus that setup call as well." — "Right. It takes three steps. Step one, step two, step three — and two of those steps are done by other teams. We only do this one step."*
- **Quote (handoff to Support):**
  > **Miley, 28:04** — "Đó thì khi mà 100% này là sẽ tới một cái team khác nữa. Có nghĩa là team chị xong rồi tới HR tới licensing và khi mà nó nhảy về 100% á nó sẽ tới team là team support. Support họ sẽ nhận được ticket và họ sẽ một cái người support specialist để help lo nói chung là nó liên quan đến workflow của từng team một khi mà điều chỉnh mấy cái status này trên system."
  > *EN: "So when it's 100% it goes to yet another team. Meaning: my team finishes, then HR, then licensing, and when it jumps to 100% it goes to the support team. Support receives a ticket and they assign a support specialist to help the LO. In general it's tied to each team's workflow as these statuses are adjusted on the system."*
- **Quote (cross-team blast radius):**
  > **Miley, 28:26** — "Nó ảnh hưởng đến nhiều team nha."
  > *EN: "It affects many teams."*

---

### Stage 14 (parallel, continuous) — Onboarding remains the LO's single point of contact

- **Stage name / status label:** none — an ongoing obligation, not a status.
- **Who owns it:** Onboarding Specialist.
- **Entry trigger:** any LO question at any point from Stage 3 onwards, including long after handoff to HR/Licensing.
- **Actions performed:** the LO calls onboarding about anything (can't log in, company email broken, NMLS task problems). Onboarding must find out where HR/Licensing stand, relay it to the LO, email HR/Licensing to nudge, forward HR's booking link to the LO, and stay on the email thread to coordinate.
- **Manual work:** **enormous.** Onboarding has no permission over HR/Licensing tasks and, today, no visibility into their progress.
- **Quote (LO only knows onboarding):**
  > **Miley, 1:26:25** — "cái người ban đầu mà onboarding lo là onboarding thì cái người lo đó họ chỉ biết onboarding thôi. Họ sẽ không có liên hệ HR hay là họ sẽ không có liên hệ licensing. Có nghĩa là bị vấn đề gì là họ sẽ gọi cho cái người onboarding đầu tiên."
  > *EN: "the person who originally onboarded the LO is onboarding, so that LO only knows onboarding. They won't contact HR, they won't contact licensing. Meaning whatever the problem, they'll call the onboarding person first."*
- **Quote (examples of what LOs ask about):**
  > **Miley, 1:26:37** — "Giả dụ như là ok gọi cho onboarding là ờ sao tại sao tao không login được vào account? Tại sao tao setup cái ký cái giấy tờ này rồi hoặc là tao setup company email rồi mà sao email không vào được hay là liên quan đến licensing… tại sao mấy cái tas liên quan đến NMOS của licensing… của tao bị như thế này"
  > *EN: "For example they call onboarding: why can't I log into my account? Why, after I signed these documents or set up my company email, can't I get into the email? Or things about licensing — why are my NMLS-related licensing tasks like this?"*
- **Quote (Victoria: onboarding cannot punt):**
  > **Victoria, 1:25:27** — "onbarding specialist là các bạn ấy còn vất vả hơn nha. Bởi vì sao? Bởi vì các bạn phải theo dõi người này suốt cả một quá trình… các bạn onboarding specialist ấ các bạn không thể thảy qua bên HR được bởi vì như vậy rất là irresponsible mà người ta hỏi mình là mình phải trả lời."
  > *EN: "the onboarding specialists actually have it harder. Why? Because they have to track this person through the whole process… the onboarding specialists can't just throw it over to HR, because that would be very irresponsible — if someone asks us, we have to answer."*
- **Quote (no permission, only nudging):**
  > **Miley, 1:29:28** — "Chứ chị không có hệ nào mà có permission để chị được mấy cái tas liên quan đến HR. Em hiểu không? Chị chỉ có thể là ờ email nhắc HR là phải ổng hoặc là gửi một cái link cho ổng để ổng book lịch meeting với HR."
  > *EN: "I don't have any permission over the HR-related tasks. Understand? I can only email HR to remind them, or send him a link so he can book a meeting with HR."*
- **Quote (the coordination pattern):**
  > **Victoria, 1:28:17** — "Rồi Miley contct lại cái ông đấy nói là bây giờ còn thiếu cái này này, làm xong cái này rồi còn thiếu cái này này thì bây giờ ông làm đi. Và đây là contact của HR để ông ấy Rich out và Miley cũng cùng phải ở trong cái email train đấy luôn để giống như là coordinate ấy, facilitate mọi cái conversation nữa luôn á."
  > *EN: "Then Miley contacts that guy and says: right now you're still missing this, you've done this but you're still missing that, so go do it. And here's HR's contact so he can reach out — and Miley also has to be on that email chain to coordinate and facilitate the whole conversation."*
- **Quote (Miley's own framing of the role):**
  > **Miley, 1:29:18** — "Chị là cái người gọi là collect á, collect mấy cái thông tin á"
  > *EN: "I'm the one who, so to speak, collects — collects the information."*
- **Quote (Victoria is held accountable for other teams' delays):**
  > **Victoria, 1:30:50** — "chị là manager của bên onboarding recruting. Chị không phải manager của bên kia nhưng team của chị là người giống như là incharge hoàn toàn các team khác là support để để cái cái cái ông này ông ấy fully onbard. Thế nên là nhiều lúc ấy là nếu mà có vấn đề gì có problem gì là anh Thuận lôi đầu chị ra"
  > *EN: "I'm the manager of onboarding and recruiting. I'm not the manager of the other side, but my team is the one fully in charge, with the other teams supporting so that this person gets fully onboarded. So often, if there's any problem, Thuan drags me out over it."*

---

### Stage X (exception branch) — Refund for a self-registered LO who fails the bar

- **Stage name / status label:** none.
- **Who owns it:** Onboarding calls and decides; **HR issues the refund.**
- **Entry trigger:** Stage 2c self-payment + Stage 6 background check fails.
- **Actions performed:** onboarding phones to check eligibility; if ineligible, tells the LO the $100 is being returned and asks HR to refund it.
- **Manual work:** the entire branch is manual and causes reputational damage.
- **Quote (the check and refund):**
  > **Miley, 38:31** — "bên onboarding phải gọi điện check coi là cái cái cái hồ sơ đó có đủ điều kiện để được onbarding không. Nếu mà không đủ điều kiện thì mình sẽ refund lại cái tiền 100 đô đó cho cái người la officer đó. Mình sẽ trả cái tiền đó lại cho loan officer đó. Mình không có nhận 100 đô của họ."
  > *EN: "onboarding has to phone to check whether that profile meets the conditions to be onboarded. If it doesn't, we refund that $100 to the loan officer. We give that money back to them. We don't accept their $100."*
- **Quote (HR issues the refund):**
  > **Victoria, 39:54** — "nhiều case là tụi chị background check xong thế xong lại phải trả lại họ tiền kêu HR trả lại họ tiền"
  > *EN: "in many cases we finish the background check and then have to give them their money back — ask HR to refund them."*
- **Quote (reputational damage):**
  > **Miley, 42:45** — "khi mà mình báo lại là mình sẽ trả cái tiền 100 đô cho họ và mình không có rồi set được với cái cái hồ sơ của họ đó thì họ sẽ cảm thấy là kiểu bị disappointing nè họ email lại nè họ kêu là họ sẽ l một cái review không tốt"
  > *EN: "when we tell them we're refunding the $100 and we can't proceed with their profile, they feel disappointed, they email back and say they'll leave a bad review."*
- **Quote (a live example the same day):**
  > **Miley, 42:14** — "mà chắc em nghĩ là bỏ cái function tự động trả quá ha. Tại vì như hôm nay em có một cây em nói chị Victoria đó cái họ đâu có thấy happy đâu. Họ email lại là họ cảm thấy là tự nhiên…"
  > *EN: "I think we should probably drop the self-payment function. Because today I had one — I told Victoria — they weren't happy at all. They emailed back saying they felt…"*

---

## Feature inventory

> Legend: **CU** = CURRENT-USED · **CUN** = CURRENT-UNUSED · **⚠️MW** = MANUAL-WORKAROUND · **ER** = EXPLICIT-REQUEST · **PR** = POLICY-RULE · **INT** = INTEGRATION · **DF** = DATA-FIELD
>
> Every quote below is verbatim Vietnamese with an `EN:` rendering beneath it.

| # | What | Cat. | Quote (VN verbatim + EN) | Depends on |
|---|---|---|---|---|
| 1 | The **`action`** menu on the LO lead record | CU | "thì sẽ gửi một cái email như thế này vô phần action trên này" — Miley, 0:18 <br> *EN: "you send an email like this, in the action section up here"* | LO record |
| 2 | **`invite loan officer`** action — sends the info-verification + $100 email | CU | "bấm vào cái option là invite loan officer sẽ click vào đây" — Miley, 0:25 <br> *EN: "press the option 'invite loan officer', click into here"* | #1 |
| 3 | **Email template** previewed inside the invite flow before sending | CU | "kéo xuống thì sẽ có một cái email template là như thế này" — Miley, 0:47 <br> *EN: "scroll down and there's an email template like this"* | #2 |
| 4 | **`join loan factory`** link inside the invite email | CU | "lo họ sẽ biết để là họ đóng cái tiền 100 đô trên cái link join loan factory" — Miley, 0:53 <br> *EN: "the LO will know to pay the $100 via the 'join loan factory' link"* | #3 |
| 5 | LO-facing **application-review form** reached via the join link | CU | "khi mà click vô á nó sẽ hiện như thế này để họ double check lại cái form mà họ đã fill out" — Miley, 1:08 <br> *EN: "when they click in, it shows like this so they can double-check the form they filled out"* | #4 |
| 6 | Payment link revealed **only after** the LO confirms the review form | CU / PR | "kéo xuống dưới cùng bấm confirm next check hết thông tin coi ok không thì nó mới hiện cái link đóng tiền" — Miley, 31:04 <br> *EN: "scroll to the very bottom, press confirm/next, check the info is OK — only then does the payment link appear"* | #5 |
| 7 | **Recruiter can pre-fill the entire LO form** on the LO's behalf and submit/save it | CU | "họ sẽ điền cho cái người loan officer vào cái form này luôn. Loan officer họ không cần phải điền… họ bấm submit nè họ lưu lại nè" — Miley, 2:00–2:13 <br> *EN: "they fill this form in for the loan officer. The LO doesn't need to fill it… they press submit, they save it"* | #5 |
| 8 | Recruiter path may send the invite **without demanding the $100** | PR | "cái step của cái người roter á họ không nhất thiết là họ phải yêu cầu là cái người la officer này phải đóng 100 đô" — Miley, 2:44 <br> *EN: "the recruiter's step doesn't necessarily require this loan officer to pay the $100"* | #2 |
| 9 | Onboarding re-confirms all info; **confirming payment is onboarding's responsibility** | PR | "cái việc mà confirm á là lo có đóng 100 đô hay không á là trọng trách ý là cái responsible của cái người onboarding specialist" — Miley, 3:20 <br> *EN: "confirming whether the LO paid the $100 is the responsibility of the onboarding specialist"* | #6 |
| 10 | **`conversation history`** (a.k.a. audit log) per LO — shows whether the email was opened | CU | "hoặc vào phần cái audit lock nè sorry action conversation history nè" — Miley, 3:50 <br> *EN: "or go into the audit log — sorry, action → conversation history"* | #1 |
| 11 | **`pay one time fee`** — a second payment link that appears after the $100 | CU | "nó sẽ hiện cái option thứ hai là pay one time fee thì họ sẽ thấy có một cái link để ờ pay one time fee" — Miley, 4:15 <br> *EN: "the second option appears, 'pay one time fee' — they'll see a link to pay a one-time fee"* | #6 |
| 12 | **`one on one onbarding meeting`** field with the **`pre onboarding done`** option | CU | "click vào cái nút option này nè reon bending done nè" — Miley, 9:10 <br> *EN: "click this option button, 'pre-onboarding done'"* | #7 |
| 13 | Setting `pre onboarding done` **both changes status and auto-sends** the signing email | CU | "gửi mail vừa đổi status vừa khi mà đổi status system nó sẽ tự động biết để nó gửi cái email này luôn" — Miley, 32:31 <br> *EN: "it sends the mail and changes the status — when the status changes the system automatically knows to send this email"* | #12 |
| 14 | The contract link is **hidden from the LO** until #12 is set | PR | "họ không click rồi á thì cái người official họ sẽ chỉ thấy là cái link để đóng tiền thôi còn cái link để ký hợp đồng họ sẽ không có thấy" — Miley, 5:32 <br> *EN: "if they don't click it, the loan officer only sees the payment link — they won't see the link to sign the contract"* | #12 |
| 15 | LO-facing holding screen: "your information has been reviewed; we'll notify you when the document is ready" | CU | "Nó sẽ chỉ hiển thị là review and thông tin của bạn đã được review thôi. Còn bên mình sẽ thông báo khi nào mà document nó ready." — Miley, 8:34 <br> *EN: "It only shows 'review' and that your information has been reviewed, and that we'll notify you when the document is ready."* | #14 |
| 16 | **Auto-email to the LO after signing**, containing the executed contract | CU | "khi mà lo ký xong á thì sẽ có một cái email tự động gửi về cho á là lo check được mấy cái hợp đồng mà lo đã ký luôn" — Miley, 34:11 <br> *EN: "once the LO has signed, an automatic email is sent so the LO can check the contracts they signed"* | #13 |
| 17 | Record **turns green** once paid + signed | CU | "System nó tự chuyển sang màu xanh đúng không? Thì là xong rồi." — Victoria, 31:49 <br> *EN: "The system turns green by itself, right? Then it's done."* | #6, #16 |
| 18 | **Ticket auto-fires to HR** to create the LO's account | CU / INT | "bên HR họ sẽ nhận được một cái ticket để họ tạo account cho L officer này" — Miley, 5:52 <br> *EN: "HR receives a ticket to create the account for this loan officer"* | #6 + #16 |
| 19 | **Ticket auto-fires to Licensing** to request NMLS sponsorship | CU / INT | "bên Lường sinh họ cũng sẽ nhận được một cái ticket á để họ request sponsor licens cho loan officer" — Miley, 5:57 <br> *EN: "Licensing also receives a ticket to request the sponsorship licence for the loan officer"* | #6 + #16 |
| 20 | HR **`complete`** field — HR-owned; onboarding must not touch it | CU / PR | "cái này là bên HR họ sẽ chỉnh mình không có động vô cái này" — Miley, 27:04 <br> *EN: "this is adjusted by HR — we don't touch it"* | #18 |
| 21 | HR completion fires a **ticket back to Onboarding** for the setup call | CU | "Khi mà họ chỉnh complete nè thì nó sẽ gửi một cái tích cho mình báo là lo này cần làm setup con" — Miley, 27:11 <br> *EN: "when they set complete, it sends a ticket to us saying this LO needs a setup call"* | #20 |
| 22 | **`setup call`** button clicked by Onboarding | CU | "em sẽ check ticket và sau đó là em sẽ click vào setup call nè" — Miley, 27:20 <br> *EN: "I check the ticket and then I click on 'setup call'"* | #21 |
| 23 | Licensing sets **sponsorship approved** (two options adjusted) | CU | "cái sponsorship được approve nè, licensing họ chỉnh nè, chỉnh hai cái option này nè" — Miley, 27:55 <br> *EN: "the sponsorship is approved — licensing adjusts these two options"* | #19 |
| 24 | **`100%`** status = HR complete + sponsorship approved + setup call | PR | "Phải ba bước. Một bước, hai bước. Ba bước thì hai cái bước này là của team khác làm. Mình chỉ làm cái bước này thôi." — Miley, 33:23 <br> *EN: "It takes three steps. Step one, two, three — two of them are done by other teams. We only do this one."* | #20,#22,#23 |
| 25 | **Ticket to the Support team** at 100%; a support specialist is assigned | CU | "khi mà nó nhảy về 100% á nó sẽ tới team là team support. Support họ sẽ nhận được ticket và họ sẽ một cái người support specialist để help lo" — Miley, 28:08 <br> *EN: "when it jumps to 100% it goes to the support team. Support receives a ticket and assigns a support specialist to help the LO"* | #24 |
| 26 | **`invite one one meeting`** action button, routing to **Calendly** — **not used** | CUN | "cái này hình như là one one này là còn meet ở Clly ấy chứ cũng không phải là meet ở Google Meet đâu… tạm thời cái đấy là tụi chị không có dùng bây giờ luôn" — Victoria, 29:34–30:07 <br> *EN: "this one-on-one seems to meet in Calendly, not Google Meet… for now we don't use it at all"* | — |
| 27 | **⚠️ 1:1 meetings booked entirely by hand** — phone to agree a time, then a manual Google Meet invite by email | ⚠️MW | "chị gửi qua email cho họ để chị setup một cái Google Meet giống như kiểu mình đang meeting bây giờ thôi. Không khác gì hết á." — Victoria, 29:10 <br> *EN: "I email them and set up a Google Meet, exactly like the meeting we're in now. No different at all."* | #26 unused |
| 28 | **⚠️ Recruiter→Onboarding handoff is a verbal message in Google Chat** | ⚠️MW | "hiện tại là chỉ có cách là báo miệng với nhau thôi. >> Đúng rồi. Miệng thôi" — Bao/Victoria, 38:02 <br> *EN: "currently the only way is to tell each other verbally. — Right. Verbally only."* | — |
| 29 | **⚠️ MMI website lookup by NMLS ID to count closed loans, done manually** | ⚠️MW / INT | "bên Root họ sẽ có một cái website là MMI như thế này đó thì sẽ nhập cái số NMMS ID number trên đó để check" — Miley, 12:11 <br> *EN: "recruiting has a website called MMI — you enter the NMLS ID number there to check"* | — |
| 30 | **Modex is already integrated but is less accurate than MMI**, so staff use MMI | INT / ⚠️MW | "bên mình là đã integrate với modex nhưng mà modex thì nó không có được asate as mi. Thế là các bạn cứ dùng MMI đó chứ còn thực ra là modex của mình là đã integrated rồi nha." — Victoria, 13:05 <br> *EN: "we've already integrated with Modex, but Modex isn't as accurate as MMI. So you all just use MMI — although in fact our Modex is already integrated."* | #29 |
| 31 | **⚠️ Experience-exception approval is a chat message to Victoria** | ⚠️MW / PR | "các bạn sẽ phải nhắn tin cho chị cho chị biết background của những người loan officer này để chị xem là có thể cho make exceptions được không" — Victoria, 14:01 <br> *EN: "you'll have to message me and tell me the background of these loan officers so I can see whether I can make exceptions"* | #29 |
| 32 | `experience level` field with **four** values: newly licensed / inexperienced / experienced / high producer | DF | "Newly experience à quên sorry newly license, inexperience experience và high producer" — Victoria, 17:07 <br> *EN: "newly experienced — sorry, newly licensed, inexperienced, experienced and high producer"* | — |
| 33 | **Dashboard shows only 2 of the 4 levels — explicit fix request** | ER | "ở trong cái report này tụi em chỉ có ít experience và inexperience thôi nên là nó rất là khó… các em nếu mà là you are the right contact thì sửa cái này dùng cho chị ha" — Victoria, 17:17–17:47 <br> *EN: "in this report you only have experienced and inexperienced, so it's very hard… if you're the right contact, please fix this for me"* | #32 |
| 34 | Dashboard path: `dashboard` → `loan officers report` → `performance` → `year to date` → click the month count | CU | "Bây giờ click vào loan officers report dùm chưa chị… Click vào performance… click vào year to date cho chị… scroll xuống click vào 76 cái mà số 76 của July" — Victoria, 16:31–16:45 <br> *EN: "now click into loan officers report… click performance… click year to date… scroll down and click 76, the 76 for July"* | — |
| 35 | Contract exists in **two variants (W-2 and 1099)** with different commission splits | DF / PR | "Nó có hai loại hợp đồng." — Miley, 10:35 <br> *EN: "There are two types of contract."* | #36 |
| 36 | Commission tier and W-2/1099 must be **confirmed verbally before** the contract is issued | PR | "Phải gặp onbarding spolitist và onbarding specialist xác nhận confirm là nhận cái commission như thế nào và 1099 hay là W2 thì mới gửi hợp đồng cho lo để ký." — Miley, 11:35 <br> *EN: "They have to meet the onboarding specialist, who confirms how the commission works and whether it's 1099 or W-2 — only then do we send the contract to sign."* | #12 |
| 37 | W-2 vs 1099 is **state-mandated**, not an LO choice | PR | "có mười mấy tiểu bang là họ yêu cầu loan officer bắt buộc phải trả… theo cái dạng W2… Họ không được phép chọn là 109." — Victoria, 19:05–19:28 <br> *EN: "there are a dozen-odd states that require the loan officer to be paid as W-2… They're not allowed to choose 1099."* | — |
| 38 | **⚠️ Onboarding phones every W-2-state LO purely to explain the requirement** | ⚠️MW | "tụi chị mới gọi điện để make sure là họ hiểu thôi chứ không có phải là họ được phép chọn hay cái gì hết" — Victoria, 20:03 <br> *EN: "we phone them just to make sure they understand — it's not that they're allowed to choose anything"* | #37 |
| 39 | Public landing page with LO registration form: **full name, last name, email, phone** | CU / DF | "họ sẽ điền cái form vô đây. Full name, last name, email, phone nè." — Miley, 41:02 <br> *EN: "they fill in the form here. Full name, last name, email, phone."* | — |
| 40 | Landing page lets the LO **skip and pay the $100 immediately** | CU | "hai là họ sẽ skip và họ sẽ muốn join luôn. Khi mà họ click vào nút này á là họ đóng được cái tiền joining fee 100 đô luôn." — Miley, 41:08 <br> *EN: "or two, they skip and want to join right away. When they click this button they can pay the $100 joining fee immediately."* | #39 |
| 41 | A self-registered LO **cannot sign the contract** from the public flow | PR | "họ chỉ đóng được tiền thôi chứ họ không có ký hợp đồng được" — Miley, 41:39 <br> *EN: "they can only pay — they can't sign the contract"* | #40 |
| 42 | Self-payment **auto-flips status to `onboarding`** | CU | "khi mà họ tự trả ấy là cái status tự động chuyển thành onboarding" — Victoria, 42:07 <br> *EN: "when they pay by themselves the status automatically changes to onboarding"* | #40 |
| 43 | Self-registration **fires a ticket to Onboarding** | CU | "nó cũng sẽ có một cái tích kịch gửi về cho onbarding là ờ lo này họ đóng tiền trên system rồi" — Miley, 38:27 <br> *EN: "a ticket is also sent to onboarding saying this LO has paid on the system"* | #40 |
| 44 | **`ready to join` flag** — exists only on the self-registration path | DF | "cũng có một cái flag là ready to join cái gì với những cái người đó" — Victoria, 39:15 <br> *EN: "there's also a 'ready to join' flag or something on those people"* | #40 |
| 45 | **ER: gate self-payment behind background check** — ticket open for months, unresolved across two PMs | ER | "tụi chị không muốn họ được trả luôn tiền cho tụi chị luôn ấy mà là tất cả mọi thứ là phải qua tụi chị background check rồi này nọ thì mới được trả tiền" — Victoria, 39:45 <br> *EN: "we don't want them to be able to pay us straight away — everything must go through our background check before they can pay"* | #40 |
| 46 | **ER: a `ready to join` button for Recruiting that notifies Onboarding**, replacing the verbal handoff | ER | "em có thể tạo ra một cái button để cho bên recruiting click vô đấy kêu là ok bây giờ ông này ready to join rồi thì nó sẽ báo bên onboarding team chẳng hạn. Bây giờ mình không cần dùng miệng nữa" — Victoria, 52:05 <br> *EN: "you could create a button for recruiting to click saying OK, this guy is ready to join, and it notifies the onboarding team. Then we wouldn't need word of mouth any more."* | #28 |
| 47 | **Round-robin auto-assignment** of onboarding lists (Miley → Sarah → Liz → repeat) | PR / ER | "các bạn ấy sẽ take list lần lượt nha. Ví dụ như là Miley te đầu tiên, Sarah sẽ là người thách thứ hai, rồi Liz sẽ là người thách thứ ba. Thế xong rồi vòng lặp đấy lại lặp lại lặp lại như vậy." — Victoria, 55:05 <br> *EN: "they take lists in turn. E.g. Miley takes first, Sarah second, Liz third. Then the loop repeats like that."* | — |
| 48 | Per-person **toggle to turn auto-assignment off**; the logic then skips that person | ER | "Ví dụ My bạn ấy nhiều lad quá rồi, bạn ấy ke nhiều quá rồi bạn có thể turn off cái function automatically assign đấy được. Thì khi đấy nó cái system cái logic skip luôn bạn đấy để lên một cái bạn khác." — Victoria, 57:05 <br> *EN: "e.g. if Miley has too many leads, too many to take care of, she can turn off that auto-assign function. Then the system logic skips her and moves to the next person."* | #47 |
| 49 | **PR: if the recruiter is also an onboarding specialist, the SAME person keeps the LO** | PR | "Miley đã là người recruiter rồi thì là Miley makes sense là Miley là onboarding specialist đấy luôn chứ đâu cần phải tới Ly đâu bởi vì là cùng một contact thì nó sẽ dễ hơn nó sẽ smooth hơn cho người loan officer đấy" — Victoria, 55:43 <br> *EN: "if Miley is already the recruiter then it makes sense for Miley to be the onboarding specialist too — no need to go to Liz, because a single contact is easier and smoother for that loan officer."* | #47 |
| 50 | **PR: do NOT assign by lowest current load — round-robin only.** Explicitly vetoed. | PR | "Không được không được không được em ạ. Bởi vì này, team của chị nó khác, team của chị nó là sales team. Các bạn ấy rất là greedy, các bạn ấy rất là nhiều bạn rất là ambitious." — Victoria, 57:43 <br> *EN: "No, no, no. Because my team is different — my team is a sales team. They're greedy, many of them are very ambitious."* | #47 |
| 51 | Onboarding specialists earn a **bonus** for recruiting + onboarding | PR | "Các bạn ấy làm xong recruiting làm onboarding là các bạn được bonus nữa." — Victoria, 58:01 <br> *EN: "When they finish recruiting and do onboarding, they get a bonus as well."* | #50 |
| 52 | **`admin loan officer referral`** page: refer date, referred by, eligibility, reason | CU / DF | "cái page là admin loan officer referral ấy là nó sẽ có những cái giống như là refer date rồi refer bởi ai rồi này kia đó rồi được nhận eligible này kia không" — Victoria, 46:37 <br> *EN: "the 'admin loan officer referral' page has things like refer date, referred by whom, and whether they're eligible to receive"* | — |
| 53 | Two referral views: **onboarded** vs **still onboarding (<100%)** | DF | "một cái phần là đây là onboarded còn một cái bên là đang onboarding đang chưa chưa 100% onbard được" — Victoria, 47:34 <br> *EN: "one part is 'onboarded' and the other side is 'onboarding', not yet 100% onboarded"* | #52 |
| 54 | Referral tag auto-appears on the ILO pipeline, `source` = **`current loan officer`** | CU / DF | "nó sẽ hiện lên trên cái page interested pine của chị. automatically với cái refer bởi ai và ở cái chỗ này cái page cái source sẽ là current loan officer" — Victoria, 48:05 <br> *EN: "it appears on my interested pipeline page automatically with who referred them, and here the source will be 'current loan officer'"* | #52 |
| 55 | **`number of close loan of refer lo`** column, added at Victoria's request | DF | "chị kêu Phương Bùi cho chị một cái phần này number of close loan of refer lo này để chị check xem là những cái người mà được refer này á họ đóng bao nhiêu cái loan ở loan factory" — Victoria, 49:40 <br> *EN: "I asked Phuong Bui to give me this 'number of closed loans of referred LO' so I can check how many loans these referred people closed at Loan Factory"* | #52 |
| 56 | Referral **one-time bonus**; Victoria audits whether it is effective and advises Thuan | PR | "cái số tiền mà mình trả ấy one time bonus xem là nó nó có hiệu quả không có này nọ không để advice anh Thuận" — Victoria, 49:55 <br> *EN: "the money we pay, the one-time bonus — to see whether it's effective or not, so I can advise Thuan"* | #52 |
| 57 | Referral page is **shared with Commission / Accounting** | CU | "cái view này, cái tab này thì bên Commission cũng hay check cái bên accounting team" — Bao, 48:52 <br> *EN: "this view, this tab — Commission also checks it, and the accounting team"* | #52 |
| 58 | **⚠️ Victoria manually corrects wrong `not eligible` referral verdicts after LO disputes** | ⚠️MW | "nhiều lúc là low office họ họ dispute họ kêu là phải phải coi lại… Nếu mà sai thì tự chị sẽ phải correct." — Victoria, 50:16–50:23 <br> *EN: "often the loan officers dispute it and say it has to be re-examined… If it's wrong then I have to correct it myself."* | #52 |
| 59 | **Zoom Phone** with a dedicated number per recruiter / onboarding specialist | CU / INT | "mọi rooter với onbarding sẽ dùng zoom phone để gọi á thì mỗi người có một số phone riêng" — Victoria, 1:08:00 <br> *EN: "all recruiters and onboarding use Zoom Phone to call — each person has their own phone number"* | — |
| 60 | Click-to-call from the LO record straight into Zoom Phone (new UI) | ER / INT | "mình nhấn gọi thì nó sẽ vô thẳng cái zoom cái zoom phone nè sẽ vô thẳng đây" — Bao, 1:10:04 <br> *EN: "you press call and it goes straight into Zoom Phone"* | #59 |
| 61 | Post-call note entry + **interest-level rating** per call | ER | "mình cũng có thể typing trong đây và sau đó là mình đánh giá coi là cái cái mức độ quan tâm của họ như thế nào" — Bao, 1:10:14 <br> *EN: "you can type in here and then rate how interested they are"* | #60 |
| 62 | **Mandatory next-action / next-appointment at the end of every call** | ER / PR | "khi kết thúc một cuộc gọi thì phải luôn có một cái action kế tiếp hoặc là cái cuộc hẹn kế tiếp" — Bao, 1:10:27 <br> *EN: "when a call ends there must always be a next action or a next appointment"* | #61 |
| 63 | Persistent per-LO call history (attitude, wishes, prior conversations) | ER | "mỗi lần gọi xong là mình phải luôn lưu lại cái cái thái độ của họ như thế nào, cái mong muốn của họ sao" — Bao, 1:10:56 <br> *EN: "after every call we must record their attitude and what they want"* | #61 |
| 64 | **Daily work queue** showing today's calls plus carried-over follow-ups | ER | "mình sẽ vào đây mình sẽ thấy được toàn bộ cái clip ngày hôm nay mình cần gọi là gì" — Bao, 1:04:01 <br> *EN: "you come in here and see all of today's leads you need to call"* | — |
| 65 | **Login pop-up** listing yesterday's unfinished / overdue items | ER | "một khi mà một reger họ cho login vào thì họ sẽ thấy một cái biệt hôm qua mình còn có nợ gì hay không" — Bao, 1:03:15 <br> *EN: "once a recruiter logs in they see whether they still owe anything from yesterday"* | #64 |
| 66 | **Overdue follow-ups must stay visible until actioned — for BOTH rep and manager** | ER | "view của các bạn luôn để các bạn còn biết là ok mình bị miss là bao nhiêu cái follow up rồi vẫn chưa còn follow up nữa… Có nghĩa là sẽ báo liên tục báo liên tục báo liên tục." — Victoria, 1:05:22–1:05:35 <br> *EN: "also the reps' own view so they know how many follow-ups they've missed and still haven't done… meaning it keeps alerting, keeps alerting, keeps alerting."* | #64 |
| 67 | **Focus mode** — sequential daily list, lock/skip as you go, locks fully when done | ER | "ở đây là cái view tổng cái view tổng thể. Còn đây là sẽ là cái danh sách mà người ruter nên làm hết trong ngày hôm nay. Nó sẽ theo danh sách sequent như thế này." — Bao, 1:06:06 <br> *EN: "this is the overall view. And this is the list the recruiter should finish today. It follows a sequential list like this."* | #64 |
| 68 | **Manager / Team-Lead overall pipeline view** across the whole department | ER | "as a manager nhá chị vẫn nhìn muốn có một cái view tổng thể của tất cả các lead coming to cái palm của chị của của cả cái department" — Victoria, 1:11:47 <br> *EN: "as a manager I still want an overall view of all the leads coming into my pipeline, of the whole department"* | — |
| 69 | Manager needs **counts by status** with names and current step (e.g. 500 active, 60 onboarding) | ER | "có bao nhiêu cái list ví dụ như là 500 cái list active hiện tại này hoặc là 60 cái onboarding list hiện tại này là những tên ai, những người như nào đang ở bước nào" — Victoria, 1:12:08 <br> *EN: "how many leads — e.g. 500 active leads right now, or 60 onboarding leads right now — who they are and which step each person is at"* | #68 |
| 70 | **Per-rep activity statistics:** calls/day, lists called, total hours, follow-ups, emails sent | ER | "chị biết là các bạn ấy làm được việc bao nhiêu, gọi điện bao nhiêu trong ngày đấy, bao nhiêu cái list bạn gọi điện, tổng số giờ bao nhiêu hoặc là follow up với bao nhiêu người, tổng số follow up gọi điện là bao nhiêu… email gửi ra là bao nhiêu" — Victoria, 1:07:29 <br> *EN: "I want to know how much work they did, how many calls that day, how many leads they called, total hours, how many people they followed up with, total follow-up calls… how many emails went out"* | #68 |
| 71 | **Impersonate / view-as** — manager sees a rep's exact workspace | ER | "chị giống như chị có chức năng gọi là login hoặc là chị làm trên cái workspace của cái anh này luôn. >> Đúng rồi. Đó thì chị muốn là nhìn thấy như vậy đó." — Bao/Victoria, 1:09:12 <br> *EN: Bao: "you'd have a function like logging in, or working in this guy's workspace." Victoria: "Right. That's what I want to see."* | #68 |
| 72 | **Exception tab** for the manager: reassign a lead, or nudge the owning rep directly | ER | "nó có tab của nó là exception… chị sẽ có những cái chức năng như là chị assign cho một cái người khác reassign đi hoặc là chị nhắc trực tiếp cho anh Ryan" — Bao, 1:08:30 <br> *EN: "it has its own tab, 'exception'… you'd have functions like assigning to someone else, reassigning, or nudging Ryan directly"* | #68 |
| 73 | **Two separate pipeline pages** (Thuan's instruction): inbound "hot" vs purchased list | ER / PR | "theo như anh Thuận F là anh Thuận muốn là hai cái store này nó vẫn là hai pay khác nhau chứ không phải là chung một pay như thế này" — Bao, 1:12:38 <br> *EN: "per Thuan's feedback, he wants these two stores to remain two different pages, not combined on one page like this"* | — |
| 74 | Kanban / table / funnel views of the pipeline | ER | "Nó có nhiều cái canban hoặc là table coi này trực quan nhất… Hoặc là dạng funel" — Bao, 1:20:49 <br> *EN: "there are Kanban or table views, this is the most visual… or a funnel form"* | #73 |
| 75 | **Monthly Modex data pull**, with production data pre-populated on the LO record | ER / INT | "mỗi tháng thì mình sẽ có bu một lượng data về thì đương nhiên là nó cũng sẽ có sẵn hết thông tin về production này kia của họ" — Bao, 1:17:56 <br> *EN: "each month we'll pull a batch of data, so of course it'll already have all their production information"* | #30 |
| 76 | Enter an NMLS number for an LO who has none and pull their data back from Modex | ER / INT | "cái người Elizabeth này họ chưa có cái NOS… Thì mình có thể nhập và mình cũng trực tiếp về từ bên kia." — Bao, 1:18:10 <br> *EN: "this Elizabeth doesn't have an NMLS yet… we can enter it and pull directly from the other side."* | #75 |
| 77 | **⚠️ Today: copy the NMLS number out, paste into MMI, read by hand** | ⚠️MW | "mình phải khỏi phải thao tác là copy b cái MS rồi quên kia rồi dán vô rồi tự xem bằn tay nó mở thiếu làm sẵn bên đây hết" — Bao, 1:18:27 <br> *EN: "we'd no longer have to copy the NMLS, go over there, paste it in and read it by hand — it'd all be ready here"* | #29 |
| 78 | **Modex job-change signal** flags LOs currently switching companies as prime targets | ER / INT | "em biết được là ông này đang trong quá trình là đổi công ty thì… coi như là ông này đang là cơ hội vàng để mà mình gọi để mình lôi kéo về công ty mình" — Bao, 1:04:36 <br> *EN: "we'd know this guy is in the process of changing companies, so… he's a golden opportunity for us to call and pull him over to our company"* | #75 |
| 79 | AI-suggested call scripts for first contact | ER / INT | "khi mà một người gọi cho EO thì đương nhiên là cũng phải có gì đó để mà nói chuyện với họ… thì sẽ gửi cho mình những cái đoạn như thế này" — Bao, 1:18:39 <br> *EN: "when someone calls an LO they obviously need something to talk about… so it gives us passages like this"* | — |
| 80 | AI combines webinar data + prior conversations into a follow-up script | ER / INT | "sử dụng những cái data giống như là trong web Binance nè hoặc là cái conversation trước mình nói chuyện với họ là gì… để mà cho AI combine lại và đề xuất cho mình một cái dạng như là conversation" — Bao, 1:19:03 <br> *EN: "using data like what's in the webinar, or the previous conversation we had with them… so the AI combines it and suggests a conversation for us"* | #79 |
| 81 | **`conversation` tab** collecting email + SMS per LO | ER | "có cái tab là conversation thì… hiện tại mình cần email hay là SMS gì kia thì nó collect trong đây hết" — Bao, 1:21:34 <br> *EN: "there's a 'conversation' tab… whatever email or SMS we need, it's all collected in here"* | — |
| 82 | Reply to the LO directly from the conversation tab | ER | "Mình có thể trả lời người ta revive trong đây hết luôn." — Bao, 1:22:04 <br> *EN: "We can reply to them right in here."* | #81 |
| 83 | Tera **omni-channel** service already exists (anh Khải/Hải) — candidate plugin, not yet released | INT | "hiện tại là Tera nó đã có bá om channel thì cơ bản là nó cũng giống với cục này… cái project đó hiện tại thì theo em biết là nó chưa release đâu" — Bao, 1:21:41 <br> *EN: "Tera already has an omni-channel, which is basically the same as this block… as far as I know that project hasn't been released yet"* | #81 |
| 84 | **⚠️ Ryan keeps a personal canned-reply list and copy-pastes it into emails** | ⚠️MW | "mỗi lần ảnh muốn message hay là trả lời email gì đó là ảnh có một cái list gì đó và sau đó anh copy back vô hoặc là anh phải tự trả lời" — Bao, 1:22:12 <br> *EN: "every time he wants to message or reply to an email he has some list, and then he copies it back in, or he has to write it himself"* | — |
| 85 | **Email-template library**, scoped personal / team / company | ER | "đây là sẽ là một cái kho cho ảnh để mà ok ảnh dùng ảnh tạo một cái tet cố định nào đó và sau đó là ảnh dùng thôi. Thì cái này là dùng cho cá nhân ảnh hoặc là dùng cho cá team hoặc là dùng cho công ty." — Bao, 1:22:20 <br> *EN: "this will be a store for him to create a fixed text and then just use it. It can be for his personal use, or for the team, or for the company."* | #84 |
| 86 | **⚠️ Department procedures & policies live in Google Drive folders, updated monthly by hand** | ⚠️MW | "ở trong những cái Google Drive đấy là tụi chị phải cho rất nhiều những cái folder là policy là các thông tin mới tụ chị update được này kia đó mà cả team cần phải biết" — Victoria, 1:22:47 <br> *EN: "in those Google Drives we have to put a lot of folders — policy, new information we update, that the whole team needs to know"* | — |
| 87 | **ER: team document repository inside the app**, replacing Google Drive | ER | "thay vì dùng Google Drive maybe là tụi em cho tụi chị upload được những cái document đấy ngay ở đây để mọi người cần một cái là mọi người vô đây luôn… Ai department nào cũng có cái procedure and policy mà tụi chị phải update hàng tháng luôn á." — Victoria, 1:23:02–1:23:26 <br> *EN: "instead of Google Drive, maybe you let us upload those documents right here so that whenever anyone needs one they come straight here… Every department has procedures and policies that we have to update monthly."* | #86 |
| 88 | **⚠️ Victoria tracks Brian's ad-hoc projects in Excel** (project name, assigned by, status, notes, Tera reply dates) | ⚠️MW | "cái status là done này cái ad project này là make a note ở đây này… Thì em có cách nào em cho lên được trên cái cái page đó để chị cũng có thể manage được thay vì chị manage manually với bạn ấy ở trên cái Excel này không em?" — Victoria, 1:14:01–1:14:37 <br> *EN: "the status is done, this ad-hoc project, make a note here… Is there a way you can put this on that page so I can manage it, instead of managing it manually with him in this Excel?"* | — |
| 89 | **ER: assign a task/narrative to a specialist in-app**; they reply and move it to in-progress/done | ER | "chị có thể tạo ra một cái cái cái project, một cái tas với bạn đấy như thế nào đó chẳng hạn. Xong rồi bạn ấy reply lại rồi bạn ấy chuyển thành in progress hoặc bạn chuyển thành dane." — Victoria, 1:15:42 <br> *EN: "I could create a project or a task with them somehow. Then they reply and move it to in-progress or to done."* | #88 |
| 90 | Dev response: deferred as a bonus/advanced feature; main recruiting flow first | — | "cái giai đoạn này chắc em chưa làm cái này liền được đâu. Tại vì đương nhiên là vẫn sẽ tập trung vô cái phần regreting flow đi… Bonus feature thôi." — Bao, 1:16:24–1:16:52 <br> *EN: "at this stage I probably can't do this right away. We'll focus on the recruiting flow… it's just a bonus feature."* | #88 |
| 91 | **Configurable call-response SLA per team** (e.g. call within 2/4 hours of a list arriving) | ER | "list mới về thì mình có thể setting là mình target phải gọi trong vòng bao nhiêu tiếng 4 tiếng 2 tiếng từ thời điểm. Dạ cái này là mình sẽ là configuration của mình thôi." — Bao, 1:24:14 <br> *EN: "when a new list arrives we can set a target to call within so many hours — 4 hours, 2 hours from that moment. This would be our configuration."* | — |
| 92 | **ER: replace HR/Licensing tickets with an in-app tab on the receiving team's page** | ER | "cần initial code mà gửi cho bên HR là nó sẽ giống như là nó sẽ có một cái thab… mà nó hiện lên ở trên cái page của họ luôn chứ không phải là tích kit này nữa đúng không? >> Dạ đúng rồi." — Victoria/Bao, 1:24:28–1:24:47 <br> *EN: Victoria: "when we need to send to HR, there'd be a tab that appears on their page rather than this ticket, right?" Bao: "Yes, that's right."* | #18,#19 |
| 93 | Three conditions (paid + signed + met) **auto-fire an API to the HR app**; HR fires back on completion | ER / INT | "ví dụ mà lo họ thanh toán tiền xong thì họ sẽ tự bắn về cho mình. Rồi họ ký xong họ tự bắn cho mình. Rồi họ đã meting xong thì coi như là đủ ba điều kiện này là tự động nó bắn được cái API qua bên cái S app… rồi bên kia họ làm cái phần việc của họ xong rồi thì họ bắn cái IP ngược lại về cho mình" — Bao, 1:24:47–1:25:13 <br> *EN: "e.g. when the LO finishes paying it fires back to us. Then they sign, it fires to us. Then the meeting is done — once these three conditions are met it automatically fires an API to the HR app… and when they finish their work over there they fire an API back to us."* | #92 |
| 94 | **ER: Onboarding must be able to SEE HR and Licensing task progress** | ER | "em cần phải cho tụi chị hoặc là fick out như nào để các bạn onboarding specialist nhìn được. Bên HR đang tới đâu rồi làm được cái TAS nào rồi nha em." — Victoria, 1:26:10 <br> *EN: "you need to give us, or figure out how, so the onboarding specialists can see how far HR has got and which tasks they've done."* | #92 |
| 95 | **ER: Onboarding can raise a request to another department from the LO record** | ER | "chị có thể tạo một cái request tới cái phòng ban đó" — Bao, 1:27:41 <br> *EN: "you could create a request to that department"* | #94 |
| 96 | **Per-department checklist view** (e.g. "4 tasks, 2 done, 2 remaining") | ER | "ví dụ là department nó sẽ có những cái bốn cái đầu việc này. Ví dụ hiện tại nó đã nó đã làm được cả hai rồi mà còn hai cái thì chị sẽ biết được" — Bao, 1:30:03 <br> *EN: "e.g. the department has these four work items. If they've already done two and two remain, you'd know."* | #94 |
| 97 | **ER: SLA alerting on other departments** (e.g. HR idle 3 hours after handoff) so Victoria can escalate | ER | "cái status này đã switch cho cái push cho bên bên HR rồi nhưng mà bên HR là 3 tiếng đồng hồ vẫn chưa làm được cái gì hoặc là vẫn chưa xong cái task này task kia là chị sẽ phải complain" — Victoria, 1:31:23 <br> *EN: "this status has already been switched/pushed to HR, but HR has done nothing for 3 hours, or still hasn't finished this or that task — I'd have to complain"* | #94 |
| 98 | **ER: LO-facing private progress page** — vertical timeline, % complete, greyed-out future steps | ER | "Nó sẽ giống cái kiểu là có một cái vertical cái timeline vertical ấy… người ta nhìn thấy được cái progress của họ là họ 50% 30% và họ đang ở cái bước nào và còn những cái bước nào mà nó gray out ở cái phần dưới" — Victoria, 1:34:27–1:34:59 <br> *EN: "it'd be like a vertical timeline… they see their progress — they're at 50%, 30% — which step they're on, and which steps are greyed out below"* | — |
| 99 | Each step on that page shows the **name and phone number of the person in charge** | ER | "cũng sẽ có tên của từng người incharge một và số điện thoại của họ ở dưới" — Victoria, 1:34:59 <br> *EN: "there'd also be the name of each person in charge and their phone number underneath"* | #98 |
| 100 | The LO progress link must be **private** to that LO | ER / PR | "cái link đó chắc phải là private là một người đó họ chỉ coi mình họ thôi đúng không? >> Đúng đúng rồi đúng rồi." — Bao/Victoria, 1:35:52 <br> *EN: Bao: "that link would have to be private — each person only sees themselves, right?" Victoria: "Yes, exactly."* | #98 |
| 101 | Alternative: the LO raises a ticket to the relevant department from the progress page | ER | "hiện tại là tôi đang ở stage này nhưng mà thấy hơi lâu thì họ tạo một cái ticket request tới thắc mắc tới cái thẳng tới team đó luôn" — Bao, 1:36:31 <br> *EN: "if they're at this stage and it seems slow, they create a ticket/request with their question straight to that team"* | #98 |
| 102 | **PR: LOs dislike tickets and prefer phone/SMS** — offer call + email as well | PR | "họ kiểu nhiều lúc ấy là họ không thích tích kit nhá. Họ thích gọi điện á. Ở bên này là cứ mọi thứ là nhanh phải gọi điện… Họ thích nhắn tin, họ thích gọi điện lắm. Làm cho nó lẹ lắm em." — Victoria, 1:36:54–1:37:08 <br> *EN: "often they don't like tickets. They like calling. Over here everything is fast, you have to call… They love texting, they love calling. It makes it fast."* | #101 |
| 103 | **Recruiting hotline** with an ordered ring chain: Brian → Miley → Vina → … → Victoria | CU / PR | "team của chị là có hotline cho recuting nha. Thế xong rồi nó có một cái logic là đầu tiên là bạn Brian bạn sẽ phải là người pick up trước. Nếu mà bạn ấy không pick up là sẽ tới My rồi tới Wina rồi tới bla bla bla cuối cùng tới chị." — Victoria, 1:38:18 <br> *EN: "my team has a hotline for recruiting. And there's a logic: first Brian has to pick up. If he doesn't, it goes to Miley, then Vina, then blah blah, finally to me."* | — |
| 104 | **HR and Licensing have shared hotlines routed by shift**, not by owner | CU / PR | "bên HR với licensing là họ có hai cái hotline và là nói chung là đang dùng chung á… vẫn là cái hotline đó và ca tối thì sẽ trực ca tối còn ca sáng sẽ trực ca sáng chứ không phải là phân theo kiểu tên người này tên người khác" — Miley, 1:38:33–1:39:27 <br> *EN: "HR and licensing have two hotlines and they're shared… it's the same hotline: the night shift covers nights and the morning shift covers mornings, it isn't split by individual name."* | — |
| 105 | **PR: within Victoria's team the LO must reach their OWN specialist directly**, not a department line | PR | "dưới team chị là phải gọi trực tiếp cho Miley. Nếu mà cái list này ở cái người Jen Trần này có recruit bằng Miley là phải cho Miley và vô đấy bởi vì gọi gọi cho department của chị không được vì đấy là qua quá nhiều người nên là đâu có make sense." — Victoria, 1:39:39 <br> *EN: "under my team they have to call Miley directly. If this Jen Tran was recruited by Miley then it has to go to Miley — calling my department doesn't work, it goes through too many people, it doesn't make sense."* | #103 |
| 106 | **Idea (Thuan): central mail gateway + AI auto-routing** to the right team/person | ER / INT | "sẽ là một cái cổng mail đó và sau đó là sử dụng AI để mà đọc cái nội dung trong cái email đó và nhiên sẽ auto forward cho những team liên quan hoặc là personal liên quan" — Bao, 1:40:13 <br> *EN: "there'd be a mail gateway, and then AI reads the content of the email and auto-forwards it to the relevant teams or relevant individuals"* | — |
| 107 | **Victoria's caution:** AI routing is acceptable internally, risky for external mail | PR | "chị sợ nó nó bị nhầm ấy em mà bên onboarding này của tụi chị mọi thứ nó phải nó phải chỉnh chu nó phải đúng lắm đó em. Nên chị chỉ sợ là cái AI đấy chắc chỉ work được với anh Thuận với internal mail của mình chứ còn với external là chị sợ lắm nha… Not sure là chị rel vào AI 100% được." — Victoria, 1:40:46–1:41:04 <br> *EN: "I'm afraid it'll get it wrong. In our onboarding everything has to be meticulous and correct. So I'm afraid that AI probably only works for Thuan and our internal mail — for external I'm very afraid… I'm not sure I can rely on AI 100%."* | #106 |
| 108 | **⚠️ Partner (Rocket) emails LO lists; the team adds them to the system by hand** | ⚠️MW | "kể cả là partner ví dụ Rockit cũng gửi cho tụi chị các list để mình xong rồi tụi chị phải menu add những cái list đó lên ấy" — Victoria, 1:41:24 <br> *EN: "even partners, e.g. Rocket, send us lists, and then we have to manually add those lists up there"* | — |
| 109 | **ER: auto-ingest LO lists from the recruiting@ inbox into the system** | ER / INT | "nếu mà next step mà tụi em làm được advance feature mà lấy được những access được cái email ở recruting@lofy.com là team của chị đó rồi add lên trên cái system này cho tụi chị thì cái đấy là perfect luôn á" — Victoria, 1:41:55 <br> *EN: "if as a next step you could build an advanced feature that accesses the email at recruiting@loanfactory.com — my team's — and adds them onto this system for us, that would be perfect"* | #108 |
| 110 | **ER: surface the shared `recruiting@loanfactory.com` inbox inside the conversation tab** (~100 emails/day; things get missed) | ER | "ngoài cái individual email của các bạn ví dụ My Ly Đậu nhá myu@lfactory.com thì là tụi chị work rất nhiều ở trên recrutinglfactory.com tất cả mọi người đều assess được vào cái đó thì chị muốn là nó hiện lên ở cái trên đây nữa… một ngày tụi chị nhận cả trăm cái email" — Victoria, 1:42:23–1:42:44 <br> *EN: "besides the individual emails, e.g. Miley Dau's myly@loanfactory.com, we work a lot on recruiting@loanfactory.com which everyone can access — I want that shown up here too… we receive a hundred emails a day."* | #81 |
| 111 | **PR: fewer tickets** — Thuan's standing directive to Tera | PR | "anh Thuận nhắn cho chị và các bạn ở Terra là không được tạo nhiều tích nữa. Tại vì như vậy nó rất là confusing cho tất cả mọi người. Rồi quá là nhiều ticket thì anh không thích." — Victoria, 24:44 <br> *EN: "Thuan messaged me and the Tera people that we mustn't create so many tickets any more. It's very confusing for everyone. He doesn't like too many tickets."* | — |
| 112 | **PR: Victoria's team must test and sign off before deploy** | PR | "tụi chị bắt buộc phải em feedback trước khi mà deploy. >> Ờ nhớ cho bên chị test trước nha." — Victoria, 1:00:37 <br> *EN: "we absolutely must give feedback before you deploy. — Remember to let us test first."* | — |
| 113 | **PR: any change to these buttons/emails must be announced to onboarding** | PR | "mấy cái option này vẫn phải như cũ nha. Đừng ừ có tụi em đừng có nếu mà tụi em có update hoặc là có gì á thì phải báo lại team chị nha." — Victoria, 24:08 <br> *EN: "these options must stay as they are. Don't — if you update anything, you must report back to my team."* | — |
| 114 | Notification design constraint: **immediate, visual, claimable** — the team works fast | ER | "design như thế nào cho cái team của chị và các team ở trong process onboarding này là phải nhanh nha em. Phải notification là phải rất rõ ràng cho chị nha. Phải rất là visual cho họ để nhìn nhìn vào họ họ làm được luôn á." — Victoria, 54:08 <br> *EN: "design it so my team and the teams in this onboarding process can be fast. The notification has to be very clear. Very visual, so they look at it and can act immediately."* | #46 |
| 115 | Add Miley to the reporting email distribution | ER | "em sẽ add thêm chị Miley vào trong cái reporting ở trên cái email" — Bao, 1:00:48 <br> *EN: "I'll add Miley to the reporting on email"* | — |
| 116 | Dev-side claim: HR, Licensing and Support are **status-change-only** users | — | "sau khi nói chuyện với Yến bên SR là gần như là họ họ chỉ đổi status thôi và sau đó là trong đây không cần đổi nữa" — Bao, 1:25:15 <br> *EN: "after talking to Yen on the HR side, they basically only change statuses, and after that nothing more needs changing in here"* | — |
| 117 | Dev-side claim (same, from earlier meetings): other teams only change statuses | — | "tụi em cũng đã gặp cái bên S cũng như là s rồi thì cũng chỉ là đơn giản là đổi status thôi chứ không cần làm gì nhiều hết" — Bao, 59:39 <br> *EN: "we've already met the other side too, and it's simply changing statuses, nothing much else"* | #116 |
| 118 | Historic policy: **LoanFactory used to accept and sponsor everyone with a licence** | PR | "trước là mình mặc định là nếu mà có licens thì mình sẽ nhận và mình sponsor hết đúng không chị? >> Đúng rồi." — Miley/Victoria, 44:00 <br> *EN: Miley: "previously we accepted by default anyone with a licence and sponsored them all, right?" Victoria: "Right."* | — |
| 119 | **ER: desired new registration flow — fill form only, no upfront payment** | ER | "hiện tại là chị là coi như là chỉ cần full field thôi… full field thông tin thôi mình nhận thôi rồi sau đó là thí dụ mà mình có muốn người ta liên hệ hay không thì mình sẽ liên hệ sau" — Bao/Victoria, 43:23–43:36 <br> *EN: "for now you'd just fill in the fields… just fill in the information, we receive it, and then if we want to contact the person we contact them later"* | #45 |

**Entry count: 119.** By category (entries may carry two): CURRENT-USED 31 · CURRENT-UNUSED 1 · **MANUAL-WORKAROUND 12** · EXPLICIT-REQUEST 46 · POLICY-RULE 24 · INTEGRATION 14 · DATA-FIELD 10 · uncategorised dev-side observations 4.

---

## Documents and e-signature

### D1 — Information-verification form (the re-check form behind the join link)
- **Generated:** on clicking `invite loan officer`.
- **Signed by:** nobody — the LO only confirms.
- **Regeneration:** by re-sending the invite email.
- **Stored / delivered:** in-app, reached via the emailed `join loan factory` link.
> **Miley, 0:30** — "nó sẽ có cái phần ờ gửi cái email để LO họ check cái lại cái thông tin mà họ đã cung cấp cho bên mình coi có đúng không"
> *EN: "there's the part that sends an email for the LO to re-check the information they provided us, to see whether it's correct"*

### D2 — LO Agreement / contract, two variants (W-2 and 1099)
- **Generated:** only after `pre onboarding done` is set (Stage 8).
- **Signed by:** the Loan Officer, electronically.
- **Regeneration trigger:** the confirmed W-2/1099 status and the confirmed experience tier decide which contract is correct — hence the verification in Stage 6 must come first.
- **Stored / delivered:** the link is auto-emailed; the executed copy is emailed back to the LO.
> **Miley, 10:35** — "Nó có hai loại hợp đồng."
> *EN: "There are two types of contract."*
> **Miley, 11:19** — "thì phải check mấy cái thông tin này thì lúc đó mới gửi một cái hợp đồng chính xác nhất cho loan officer để loan officer họ ký"
> *EN: "you have to check this information, and only then send the most accurate contract to the loan officer for them to sign"*

### D3 — Contract source
- Contracts are produced on **Jessica's** side and handed to the Onboarding team to send out.
> **Miley, 21:44** — "Cái hợp đồng đó là của bên Jessica á họ gửi cho bên Team Onboarding để mình gửi ra cho LO á."
> *EN: "That contract comes from Jessica's side — they send it to the Onboarding team for us to send out to the LO."*

### D4 — Signed-contract confirmation email
- **Generated:** immediately after signing.
- **Delivered:** to the LO's mailbox, so they can review what they signed.
> **Miley, 34:11** — "khi mà lo ký xong á thì sẽ có một cái email tự động gửi về cho á là lo check được mấy cái hợp đồng mà lo đã ký luôn"
> *EN: "once the LO has signed, an automatic email is sent so the LO can check the contracts they signed"*

### D5 — Setup-call follow-up email (written resources recap)
- **Generated:** manually by the onboarding specialist after the setup call.
> **Victoria, 26:38** — "xong cái cô đấy là họ còn gửi một cái email nữa để các những người đấy có cái written like written gọi là content để họ refer nếu mà họ quên"
> *EN: "after that call they also send another email so those people have written content to refer back to if they forget"*

### Contract contents stated in the meeting
| Clause | Quote |
|---|---|
| W-2 vs 1099 status is written into the contract | "Và ở trong đó là sẽ nêu ra họ W2 hay họ Canon nha." — Victoria, 21:09 <br> *EN: "And in there it states whether they are W-2 or 1099."* |
| Commission structure / rates | "Đó là cái commission structure, cái commission của người loan officer. Họ phải đồng ý coi là họ khi mà đóng được một cái lo thì họ sẽ nhận cái tiền commission như thế nào" — Miley, 10:14 <br> *EN: "That's the commission structure, the loan officer's commission. They have to agree how they'll receive commission when they close a loan."* |
| Compliance clauses | "họ phải check coi là điều khoản này kia có mấy cái liên quan đến compliance có ok không thì họ mới ký" — Miley, 21:04 <br> *EN: "they have to check whether the compliance-related clauses are OK before they sign"* |
| Termination for breach | "mấy cái điều khoản của công ty nữa nếu mà họ vi phạm thì mình sẽ không có làm việc với họ nữa" — Miley, 21:16 <br> *EN: "and the company's clauses — if they breach them we'll stop working with them"* |
| Other fees (credit report) | "với mấy cái mức phí khác mà họ phải đóng liên quan đến Ric Report" — Miley, 21:37 <br> *EN: "and other fees they have to pay, related to credit report"* |
| **Production requirement: at least 1 closed loan within 6 months** | "trong vòng 6 tháng họ phải đóng được ít nhất một lô này này kia nói chung là nhiều điều khoản lắm" — Miley, 21:39 <br> *EN: "within 6 months they must close at least one loan — in general there are a lot of clauses"* |
| Analogy used | "Hợp đồng mà giống như hợp đồng lao động của nhân viên Việt Nam mình có lương cơ bản rồi số giờ làm việc thì hợp đồng của LO họ cũng phải có đầy đủ thông tin" — Miley, 20:48 <br> *EN: "Like a Vietnamese employment contract with a base salary and working hours, the LO's contract must have full information too."* |

---

## Payments

| Item | Detail | Quote |
|---|---|---|
| **$100 joining fee** | The headline fee every LO must pay to join; paid via a link in the invite email, behind the form-review step. | "họ sẽ yêu cầu là họ phải pay cái tiền joining fee là 100 đô" — Miley, 0:12 <br> *EN: "they require them to pay the joining fee of $100"* |
| **Second fee: `pay one time fee`** | A *separate* link appearing only **after** the $100. Amount and purpose never stated. **UNCLEAR.** | "khi mà đóng xong 100 đô á thì nó sẽ hiện cái option thứ hai là pay one time fee" — Miley, 4:15 <br> *EN: "once the $100 is paid the second option appears, 'pay one time fee'"* |
| **Payment confirmation is automatic** | Payment posts back to the system with no manual entry. | "khi mà đóng xong á nó sẽ báo về system là đóng rồi" — Miley, 4:09 <br> *EN: "when they've paid it reports back to the system that it's paid"* |
| **Who may ask; who is accountable** | Both recruiters and onboarding specialists can send the payment email; confirming payment is the onboarding specialist's job. | "onboarding hay là roeder đều có thể gửi được cái email này để kêu LO. Nhưng mà cái việc mà confirm… là cái responsible của cái người onboarding specialist." — Miley, 3:14 <br> *EN: "onboarding or the recruiter can both send this email. But confirming… is the onboarding specialist's responsibility."* |
| **Recruiters need not demand payment** | | "cái step của cái người roter á họ không nhất thiết là họ phải yêu cầu là cái người la officer này phải đóng 100 đô" — Miley, 2:44 <br> *EN: "the recruiter's step doesn't necessarily require this loan officer to pay the $100"* |
| **Self-payment with no approval (the problem)** | On the public landing page the LO can skip straight to paying — before any background check. | "hai là họ sẽ skip và họ sẽ muốn join luôn. Khi mà họ click vào nút này á là họ đóng được cái tiền joining fee 100 đô luôn." — Miley, 41:08 <br> *EN: "or two, they skip and want to join right away; clicking this button they can pay the $100 joining fee immediately"* |
| **Refund path** | If the background check fails, the $100 is refunded and **HR processes the refund**. | "Nếu mà không đủ điều kiện thì mình sẽ refund lại cái tiền 100 đô đó cho cái người la officer đó." — Miley, 38:41 <br> *EN: "If they don't meet the conditions we refund that $100 to the loan officer."* · "kêu HR trả lại họ tiền" — Victoria, 39:58 <br> *EN: "ask HR to refund them"* |
| **Refunds cause reputational damage** | LOs email back disappointed and threaten bad reviews. | "họ sẽ cảm thấy là kiểu bị disappointing nè họ email lại nè họ kêu là họ sẽ l một cái review không tốt" — Miley, 42:50 <br> *EN: "they feel disappointed, they email back and say they'll leave a bad review"* |
| **Approval gate demanded before payment** | Victoria wants the order inverted. The ticket has been open since the Phuong Bui / Phuong Nguyen era and is still unresolved. | "chị gửi cho Terra Ticket từ mấy tháng trước rồi luôn á. Mà Phương Nguyễn kêu là cứ hai tuần hai tuần nữa, hai tuần nữa xong rồi cuối cùng là đến bây giờ là vẫn chưa thấy gì luôn." — Victoria, 42:26 <br> *EN: "I sent Tera a ticket months ago. Phuong Nguyen kept saying two more weeks, two more weeks — and now there's still nothing."* |
| **Ticket provenance** | Filed by Brian at Victoria's instruction; Victoria is not the requester name. She still has the ticket number. | "cái đấy là từ Brian nhá. Chị kêu Brian gửi nha nên là đừng tìm tên của chị là người requester nha… Chị vẫn còn cái ticket number chị cũng biết luôn á." — Victoria, 44:20–44:54 <br> *EN: "that came from Brian. I told Brian to send it, so don't look for my name as requester… I still have the ticket number, I know it."* |
| **Desired new flow** | Fill in the form only; contact later if we want them; no upfront payment. | "full field thông tin thôi mình nhận thôi rồi sau đó là… nếu mà mình có muốn người ta liên hệ hay không thì mình sẽ liên hệ sau" — Victoria, 43:29 <br> *EN: "just fill in the information, we receive it, and then if we want to contact them we contact them later"* |
| **Referral one-time bonus** | Paid to a referring LO; Victoria audits its effectiveness. | "cái số tiền mà mình trả ấy one time bonus xem là nó có hiệu quả không" — Victoria, 49:55 <br> *EN: "the money we pay, the one-time bonus — to see whether it's effective"* |
| **PayPal** | **Never mentioned in this transcript.** No payment processor is named anywhere. | — |

---

## Business rules, thresholds and SLAs

| # | Rule / number | Quote |
|---|---|---|
| R1 | **$100** joining fee. | "họ phải pay cái tiền joining fee là 100 đô" — Miley, 0:12 <br> *EN: "they must pay the joining fee of $100"* |
| R2 | **Experienced = 5+ closed loans SINCE 2022.** The label in the live product ("LO is considered inexperienced until five loans are closed") is **WRONG**. | "Các em nhìn thấy là có cái LO is consider inexperience until five loans are closed. À cái này là sai rồi nha. Cái này là five loan close since 2022." — Victoria, 12:48 <br> *EN: "You see it says 'LO is considered inexperienced until five loans are closed'. That's wrong. It's five loans closed since 2022."* |
| R3 | **5+ loans since 2022 AND 2+ loans in the last 12 months → auto-approved**, no manager review. | "nếu mà experience rồi á trên năm lô in since 2022 cộng thêm là được two plus loans in the last 12 months là ok luôn là được pass luôn không cần phải qua chị" — Victoria, 14:57 <br> *EN: "if they're experienced — over five loans since 2022 — plus two-plus loans in the last 12 months, that's fine, they pass without going through me"* |
| R4 | **<5 loans since 2022 AND <2 loans in the last 12 months → escalate to Victoria** for an exception decision. | "nếu mà close less than two loans in the last 12 months… thì là các bạn sẽ phải nhắn cho chị để make để hỏi xem là có được onbard không" — Victoria, 14:39 <br> *EN: "if they closed less than two loans in the last 12 months… you'll have to message me to ask whether they can be onboarded"* |
| R5 | The "<2 loans in 12 months" condition is **new (~3–4 months old) and NOT automated.** | "cái điều kiện này là mới đây thôi, khoảng 3 4 tháng trở lại đây thôi chứ không phải là trước đó đâu. Và nó cũng không được automated." — Victoria, 13:43 <br> *EN: "this condition is recent, only about 3–4 months old, not before. And it isn't automated either."* |
| R6 | Exception grounds Victoria accepts: prior success in real-estate or insurance sales with an existing client book, now returning to mortgage. | "nhiều khi họ là cũng làm sales về bất động sản này, sales về bảo hiểm này, ABC đó. thì họ cũng có cái tệp khách hàng riêng của họ rồi và họ cũng có successful ở trong những cái lĩnh vực đó… thì những cái case đó là chị sẽ ok" — Victoria, 14:14–14:38 <br> *EN: "often they've done real-estate sales, insurance sales etc. They already have their own client base and were successful in those fields… those cases I'll approve."* |
| R7 | **Most LOs are inexperienced → most cases route through Victoria.** (Her estimate; no figure.) | "chị không có số liệu cụ thể nhưng mà chị nghĩ là cái số mà cần phải go với chị nhiều hơn bởi vì là loan officer của mình hầu như là inexperience ạ. Toàn toàn không không có nhiều loan đâu. Thế nên là go over chị rất là nhiều luôn." — Victoria, 15:52 <br> *EN: "I don't have exact figures, but I think the number that has to go through me is larger, because our loan officers are mostly inexperienced. They don't have many loans at all. So a lot goes through me."* |
| R8 | **Inexperienced + 1099 = 80% commission for the first five loans.** | "họ sẽ nhận cái tiền commission là inexperience là 80% nếu mà theo 99 cho năm cái lô đầu tiên" — Miley, 10:46 <br> *EN: "they'll receive commission as inexperienced at 80% if on 1099, for the first five loans"* |
| R9 | **Inexperienced + W-2 = 70% for the first five loans.** | "hay là W2 thì là chỉ nhận 70% cho năm cái lô đầu tiên" — Miley, 10:55 <br> *EN: "or on W-2 they only receive 70% for the first five loans"* |
| R10 | **Experienced = 100% or 90% commission.** | "lo đó là sẽ nhận cái tiền commission là experience họ sẽ nhận 100% tiền commission hoặc là 90% tiền commission" — Miley, 11:15 <br> *EN: "that LO will receive commission as experienced — they'll get 100% commission or 90% commission"* |
| R11 | **~13–14 US states legally require LOs to be W-2.** State law, not company policy; the LO cannot choose. | "có mười mấy cái tửa bang, hình như 13 14 gì tửa bang đó yêu cầu loan officer phải là W2 thì họ bắt buộc họ phải là W2 nha. Họ không được phép chọn là 109." — Victoria, 19:19 <br> *EN: "there are a dozen-odd states, I think 13 or 14, that require the loan officer to be W-2 — they're obliged to be W-2. They're not allowed to choose 1099."* |
| R12 | **W-2 compensation is roughly 10% less.** | "với W2 là cái compensation của họ là khoảng 10% less" — Victoria, 19:51 <br> *EN: "with W-2 their compensation is about 10% less"* |
| R13 | Four required experience levels: **newly licensed, inexperienced, experienced, high producer.** | "Newly experience à quên sorry newly license, inexperience experience và high producer" — Victoria, 17:07 <br> *EN: "newly experienced — sorry, newly licensed, inexperienced, experienced and high producer"* |
| R14 | Contract obligation: **at least one closed loan within 6 months.** | "trong vòng 6 tháng họ phải đóng được ít nhất một lô" — Miley, 21:39 <br> *EN: "within 6 months they must close at least one loan"* |
| R15 | **`100%` requires exactly three gates:** HR complete + Licensing sponsorship approved + setup call. | "Phải ba bước. Một bước, hai bước. Ba bước thì hai cái bước này là của team khác làm." — Miley, 33:23 <br> *EN: "It takes three steps. One, two, three — two of those steps are done by other teams."* |
| R16 | **The contract link requires both payment AND the `pre onboarding done` flag.** Paying alone is not enough. | "họ có thể đóng tiền trước nhưng mà họ sẽ không thể nào mà họ ký được cái hợp đồng liền được" — Miley, 7:35 <br> *EN: "they can pay first, but there's no way they can sign the contract straight away"* |
| R17 | **Round-robin, not load-balanced, assignment.** Explicit veto. | "đừng đừng automatic là cho bạn nào ít l không được nhá ừ bây giờ cứ làm theo lần lượt lần lượt như vậy" — Victoria, 59:14 <br> *EN: "don't automatically give it to whoever has fewer leads — no. For now just do it in turn like that."* |
| R18 | **Configurable target call SLA per team** (e.g. 2 or 4 hours from list arrival) — dev proposal. | "mình có thể setting là mình target phải gọi trong vòng bao nhiêu tiếng 4 tiếng 2 tiếng từ thời điểm" — Bao, 1:24:14 <br> *EN: "we can set a target to call within so many hours — 4 hours, 2 hours from that moment"* |
| R19 | **Victoria's escalation threshold for other departments: ~3 hours of inactivity.** | "bên HR là 3 tiếng đồng hồ vẫn chưa làm được cái gì… là chị sẽ phải complain" — Victoria, 1:31:28 <br> *EN: "if HR has done nothing for 3 hours… I'd have to complain"* |
| R20 | Missed follow-ups of 2–3 days are already a problem; **10-plus days late = an ineffective recruiter.** | "báo trễ hai ba ngày cũng nó báo nhiều dài danh sách nó dài quá rồi thì đương nhiên không thể nào mà làm nhiều được. Mà để trễ mà tới mười mấy ngày như vậy được là coi như là người ruter đó th làm việc không hiểu gọ không hiệu quả." — Bao, 1:05:45 <br> *EN: "being 2–3 days late already piles up and the list gets too long to work through. Letting it slip to ten-odd days means that recruiter is working ineffectively."* |
| R21 | Recruiting an LO can take **months to 1–2 years**; there is **no objective "ready to join" criterion**. | "nhiều người á họ tất cả hàng tháng trời thậm chí là 1 2 năm để được convince là join mình… nó không có một cái criteria abc gì để tụi chị có thể là ok người này ready to joy" — Victoria, 52:31–53:00 <br> *EN: "many take months, even 1–2 years, to be convinced to join us… there's no ABC criteria by which we can say this person is ready to join"* |
| R22 | Referral exception example: the LO joined **120 days** after the referral (normally too long), but the referrer had followed up consistently, so Thuan approved the bonus. | "đúng là kiểu loan officer joy 120 ngày sau khi mà họ refer thì là quá là xa rồi nhưng mà tôi advice họ rất là nhiều rồi consistently follow up này nọ thế xong anh Thuận lại ok cho họ được nhận tiền" — Victoria, 50:45 <br> *EN: "right, the loan officer joined 120 days after they referred them, which is too far out — but 'I advised them a lot and consistently followed up' — and then Thuan approved them receiving the money"* |
| R23 | The recruiting team receives **~100 emails/day** at `recruiting@loanfactory.com`; things get missed. | "một ngày tụi chị nhận cả trăm cái email từ vào cái đó luôn… Nên là bị meet rất là nhiều." — Victoria, 1:42:39 <br> *EN: "we receive a hundred emails a day into that… so a lot gets missed"* |
| R24 | Onboarding specialists carry **KPIs covering onboarding meetings AND recruiting.** | "tụi chị còn cái KBI là phải onbard lo phải meeting onbard lo và còn phải root lo nữa" — Miley, 1:31:50 <br> *EN: "we also have KPIs — we have to onboard LOs, hold onboarding meetings, and recruit LOs as well"* |
| R25 | **3 onboarding specialists** on the team at the time of the meeting. | "team chị tạm thời là có ba bạn onboarding specialist" — Victoria, 55:00 <br> *EN: "my team currently has three onboarding specialists"* |
| R26 | **76** LOs reached 100% onboarded in July 2026. | "click vào 76 cái mà số 76 của July á… các em sẽ nhìn thấy được tất cả những người mà 100% onbard được tháng bảy" — Victoria, 16:45–16:54 <br> *EN: "click on 76, the 76 for July… you'll see everyone who was 100% onboarded in July"* |
| R27 | Tera Plus target: Thuan demands release **next month**; Victoria thinks it is rushed. | "anh Thuận đòi hối là đội trong phòng tháng sau là phải release" / "Chị nghĩ là cũng hơi rush đấy, cũng hơi khó đấy." — Bao/Victoria, 45:29–45:40 <br> *EN: Bao: "Thuan is pushing that it must be released next month." Victoria: "I think that's a bit rushed, a bit hard."* |
| R28 | Onboarding works at speed because LOs have live loans and need to transfer immediately. | "onboarding mà người ta không thể chờ được nhiều lô office rồi người ta có cái những cái lôn hoặc là người ta cần phải chuyển ngay lập tức. Cho nên là team của chị làm việc rất là nhanh nha." — Victoria, 53:35 <br> *EN: "in onboarding they can't wait — many loan officers already have loans, or need to transfer immediately. So my team works very fast."* |

---

## Handoffs between roles

| # | From → To | Stage | Trigger | Signal / how they know | Quote |
|---|---|---|---|---|---|
| H1 | **Recruiter → Onboarding Specialist** | after "ready to join" | LO verbally commits | ⚠️ **Verbal message in the team Google Chat only** | "bạn recruitter bạn ấy sẽ phải báo miệng ở trong group chat của tụi chị cho onboarding team" — Victoria, 38:56 <br> *EN: "the recruiter has to announce verbally in our group chat to the onboarding team"* |
| H2 | **(no handoff)** — same person | Miley is both roles | — | n/a | "Miley vừa là recruitter vừa là onboarding specialist" — Victoria, 36:48 <br> *EN: "Miley is both recruiter and onboarding specialist"* |
| H3 | **Public website → Onboarding** | LO self-registers + pays | payment posted | **Ticket auto-fires + status auto-flips to `onboarding` + `ready to join` flag** | "nó cũng sẽ có một cái tích kịch gửi về cho onbarding là ờ lo này họ đóng tiền trên system rồi" — Miley, 38:27 <br> *EN: "a ticket is also sent to onboarding saying this LO has paid on the system"* |
| H4 | **Onboarding → LO** | invite | specialist clicks `invite loan officer` | Email with the `join loan factory` link | "bấm vào cái option là invite loan officer" — Miley, 0:25 <br> *EN: "press the option 'invite loan officer'"* |
| H5 | **Onboarding → LO** | contract | specialist sets `pre onboarding done` | Auto-email with the signing link | "click vào cái reonboarding meeting á click vào option đó rồi thì lúc đó L official sẽ tự động nhận được cái email này" — Miley, 5:01 <br> *EN: "click the pre-onboarding meeting option, and then the loan officer automatically receives this email"* |
| H6 | **System → HR** | account creation | $100 paid **AND** contract signed | **Ticket** | "bên HR họ sẽ nhận được một cái ticket để họ tạo account cho L officer này" — Miley, 5:52 <br> *EN: "HR receives a ticket to create the account for this loan officer"* |
| H7 | **System → Licensing** | NMLS sponsorship | $100 paid **AND** contract signed | **Ticket** | "bên Lường sinh họ cũng sẽ nhận được một cái ticket á để họ request sponsor licens cho loan officer" — Miley, 5:57 <br> *EN: "Licensing also receives a ticket to request the sponsorship licence for the loan officer"* |
| H8 | **HR → Onboarding** | setup call | HR sets its field to `complete` | **Ticket back to onboarding** | "Khi mà họ chỉnh complete nè thì nó sẽ gửi một cái tích cho mình báo là lo này cần làm setup con" — Miley, 27:11 <br> *EN: "when they set complete, it sends a ticket to us saying this LO needs a setup call"* |
| H9 | **Licensing → system** | sponsorship | Licensing marks sponsorship approved (two options) | Contributes to the 100% computation | "cái sponsorship được approve nè, licensing họ chỉnh nè, chỉnh hai cái option này nè" — Miley, 27:55 <br> *EN: "the sponsorship is approved — licensing adjusts these two options"* |
| H10 | **System → Support** | go-live | status reaches `100%` | **Ticket** + an assigned support specialist | "khi mà nó nhảy về 100% á nó sẽ tới team là team support. Support họ sẽ nhận được ticket" — Miley, 28:08 <br> *EN: "when it jumps to 100% it goes to the support team. Support receives a ticket."* |
| H11 | **Onboarding Specialist → Victoria** | experience exception | LO fails R4 | ⚠️ **Chat message containing the LO's background** | "các bạn sẽ phải nhắn tin cho chị cho chị biết background của những người loan officer này" — Victoria, 14:08 <br> *EN: "you'll have to message me and tell me the background of these loan officers"* |
| H12 | **Onboarding → HR / Licensing** (ad hoc) | LO stuck | LO calls onboarding with an HR/Licensing problem | ⚠️ **Onboarding emails them, or forwards HR's booking link to the LO, and stays on the thread** | "chị sẽ t HR và chị sẽ kêu với HR là ừ Loo này mới gọi điện cho Miley và nói Miley là ờ đang bị stuck ở những cái bước này nè. HR có gì giúp lo những cái step này hoặc là bú một cái lịch meeting để giúp LO thì bên HR họ sẽ có một cái link để họ gặp Lon Officer thì chị sẽ gửi cái link đó cho Lon officer" — Miley, 1:28:44–1:29:05 <br> *EN: "I'll tell HR: this LO just called Miley and said they're stuck at these steps. HR, can you help the LO with these steps, or book a meeting to help the LO — HR has a link to meet the loan officer, and I'll send that link to the loan officer."* |
| H13 | **LO → Onboarding (always)** | any problem | LO only knows their onboarding specialist | Phone / SMS to that specialist | "cái người lo đó họ chỉ biết onboarding thôi… bị vấn đề gì là họ sẽ gọi cho cái người onboarding đầu tiên" — Miley, 1:26:29 <br> *EN: "that LO only knows onboarding… whatever the problem, they'll call the onboarding person first"* |
| H14 | **Onboarding → HR (refund)** | failed check after self-payment | ineligibility confirmed | Ask HR to refund | "kêu HR trả lại họ tiền" — Victoria, 39:58 <br> *EN: "ask HR to refund them"* |
| H15 | **Victoria → Brian → Tera** | product tickets | Victoria wants a change | Brian files the ticket; Victoria is not the requester name | "cái đấy là từ Brian nhá. Chị kêu Brian gửi nha nên là đừng tìm tên của chị là người requester nha." — Victoria, 44:20 <br> *EN: "that came from Brian. I told Brian to send it, so don't look for my name as requester."* |
| H16 | **Jessica → Onboarding** | contracts | — | Contracts sent to Onboarding to distribute | "Cái hợp đồng đó là của bên Jessica á họ gửi cho bên Team Onboarding" — Miley, 21:44 <br> *EN: "that contract comes from Jessica's side — they send it to the Onboarding team"* |
| H17 | **Onboarding ↔ other departments (desired)** | any | status pushed to another department | **ER:** in-app tab + API events, not tickets | "coi như là đủ ba điều kiện này là tự động nó bắn được cái API qua bên cái S app" — Bao, 1:24:57 <br> *EN: "once these three conditions are met it automatically fires an API to the HR app"* |

---

## Open questions / ambiguities

1. **What is the second `pay one time fee`?** Its amount, purpose and whether it is mandatory are never stated.
   > **Miley, 4:15** — "nó sẽ hiện cái option thứ hai là pay one time fee"
   > *EN: "the second option appears, 'pay one time fee'"*

2. **Who exactly may click `setup call`?** Miley says onboarding; Victoria says either or both.
   > **Bao, 35:06** — "ủa setup công thì hình như chị nói là bên rot rutin bên click mà đúng không? Còn onbarding" → **Victoria, 35:16** — "onbarding luôn hoặc một trong hai là cả hai"
   > *EN: Bao: "for setup call, didn't you say recruiting clicks it? Or onboarding?" Victoria: "onboarding too — either one of the two, or both"*

3. **What are the "two options" Licensing adjusts?** Only sponsorship-approved is named.
   > **Miley, 27:55** — "licensing họ chỉnh nè, chỉnh hai cái option này nè"
   > *EN: "licensing adjusts these two options"*

4. **UNCLEAR — how many steps does the public registration flow have today?** Bao recalls four but cannot name the last.
   > **Bao, 43:13** — "cái bước đầu tiên là full field cái thông tin của họ sau đó là sẽ là pay fe sau đó sẽ là re ờ đ ký rồi cuối cùng là cái gì đúng không nó có bốn step"
   > *EN: "the first step is filling in their information, then pay fee, then re… sign, and then finally something — there are four steps, right?"*

5. **Where is the experience level actually set, and why doesn't it reach the dashboard?** Bao has not explored that area.
   > **Bao, 18:20** — "nó này em chưa vô tới đây em chưa biết."
   > *EN: "I haven't got to this part yet, I don't know."*

6. **UNCLEAR — what "Hord" means** in the 100% gating sentence. Probably "the HR tasks", but the audio is garbled.
   > **Miley, 27:50** — "khi mà hoàn thành mấy cái Hord này nè hoặc là cái sponsorship được approve nè"
   > *EN: "when these [Hord?] are completed, or the sponsorship is approved"*

7. **Who owns the referral page?** Victoria manages it, Commission/Accounting read it, and none of her reps use it.
   > **Victoria, 49:16** — "Các bạn ở đây không không bạn nào dùng nó đâu."
   > *EN: "None of the people here use it at all."*

8. **How much less accurate is Modex than MMI?** Only a qualitative claim is given.
   > **Victoria, 13:05** — "modex thì nó không có được asate as mi"
   > *EN: "Modex isn't as accurate as MMI"*

9. **UNCLEAR — Bao at 43:36** describes the desired registration flow with a garbled clause whose direction is ambiguous.
   > **Bao, 43:36** — "Mình thấy gọi là thanh toán phía trước."
   > *EN: literally "we see, so-called, payment up front" — ambiguous whether he is describing the current state or the thing to remove.*

10. **Tera Plus delivery date is not agreed.** Bao first says ~2 months, then corrects to Thuan's "next month".
    > **Bao, 45:24** — "Thì anh bảo ước chừng cỡ 2 tháng không anh? Không, anh Thuận đòi hối là đội trong phòng tháng sau là phải release nói tháng đâu."
    > *EN: "I'd estimate about 2 months? No — Thuan is pushing that it must be released next month."*

11. **Who owns the omni-channel plugin?** Bao names "anh Khải" then "anh Hải"; unclear whether these are one person or two, and its release date is unknown.
    > **Bao, 1:42:53** — "Cái này để coi coi là bên cái project đó là của anh Khải coi có tích hợp được không. Giống như cái cục đó hiện tại cái bên anh Hải giống như là một cái plugin service thôi."
    > *EN: "Let's see whether that project of Khai's can be integrated. That block on Hai's side is basically just a plugin service."*

12. **The ticket system itself is never named** — tickets are referenced throughout but no tool is identified.

13. **Does the self-serve `ready to join` flag do anything?** Victoria mentions it exists but its effect is not described.
    > **Victoria, 39:15** — "Và cũng có một cái flag là ready to join cái gì với những cái người đó."
    > *EN: "And there's also a 'ready to join' flag or something on those people."*

14. **The LO progress page: person-level contact vs department-level ticket is unresolved.** Bao proposes department-level; Victoria prefers named people with phone numbers; the discussion ends with "do whatever is easiest for them".
    > **Victoria, 1:36:47** — "Ờ cũng được. Em làm thế nào để cho họ dễ nhất là được. Nhưng mà chị nghĩ là ví dụ có tên của một người đấy thì họ kiểu nhiều lúc ấy là họ không thích tích kit nhá."
    > *EN: "That's fine too. Do whatever is easiest for them. But I think if there's a person's name — often they don't like tickets."*

---

## Contradiction candidates

> Claim + quote only. **Deliberately not resolved.**

### C1 — Who initiates `invite loan officer`: Recruiting or Onboarding?
Bao assumes Recruiting.
> **Bao, 1:24** — "cái invite loan officer đó là bên recruiting họ click đúng không?"
> *EN: "that 'invite loan officer' — recruiting clicks it, right?"*

Miley says both can, but ownership of the payment confirmation sits with Onboarding.
> **Miley, 3:14** — "onboarding hay là roeder đều có thể gửi được cái email này để kêu LO. Nhưng mà cái việc mà confirm á là lo có đóng 100 đô hay không á là trọng trách ý là cái responsible của cái người onboarding specialist."
> *EN: "onboarding or the recruiter can both send this email. But confirming whether the LO paid the $100 is the responsibility of the onboarding specialist."*

**Check against Recruiting's account of who owns this button.**

### C2 — Does Recruiting collect the $100 or not?
Recruiting is exempt from demanding it.
> **Miley, 2:44** — "cái step của cái người roter á họ không nhất thiết là họ phải yêu cầu là cái người la officer này phải đóng 100 đô"
> *EN: "the recruiter's step doesn't necessarily require this loan officer to pay the $100"*

But the public self-serve flow takes the $100 with no recruiter involved at all.
> **Miley, 41:08** — "Khi mà họ click vào nút này á là họ đóng được cái tiền joining fee 100 đô luôn."
> *EN: "When they click this button they can pay the $100 joining fee immediately."*

**The fee has three different owners depending on the entry path.**

### C3 — Self-payment: feature or defect?
It is live and it auto-advances the status.
> **Victoria, 42:07** — "khi mà họ tự trả ấy là cái status tự động chuyển thành onboarding cho em."
> *EN: "when they pay by themselves the status automatically changes to onboarding."*

Both Miley and Victoria want it removed.
> **Miley, 42:14** — "chắc em nghĩ là bỏ cái function tự động trả quá ha."
> *EN: "I think we should probably drop the self-payment function."*
> **Victoria, 39:45** — "tụi chị không muốn họ được trả luôn tiền cho tụi chị luôn ấy mà là tất cả mọi thứ là phải qua tụi chị background check rồi này nọ thì mới được trả tiền"
> *EN: "we don't want them to be able to pay us straight away — everything must go through our background check before they can pay"*

**Marketing / Recruiting may regard the self-serve funnel as a lead-generation asset.**

### C4 — Assignment algorithm.
Bao proposes least-loaded assignment.
> **Bao, 59:23** — "hiện tại thì theo cái tập toán của em dự tính làm là sẽ assign cho cái người mà gọi là ít ít lo nhất… thì thấy có hợp lý không?"
> *EN: "my planned algorithm is to assign to whoever has the fewest LOs… does that seem reasonable?"*

Victoria vetoes it outright.
> **Victoria, 57:43** — "Không được không được không được em ạ. Bởi vì này, team của chị nó khác, team của chị nó là sales team… Nên là các em không thể làm như vậy được nha em."
> *EN: "No, no, no. Because my team is different, my team is a sales team… so you can't do it that way."*

**Conflicts with any generic capacity-based routing other departments might want.**

### C5 — Is the current workflow fine, or broken?
Victoria opens by defending it and warning against changes.
> **Victoria, 22:01** — "chị thấy cái workflow hiện tại là đang ok á thì không biết là bên em tính update gì tại vì nếu mà bên em mà update gì trên system á mà nó bị lỗi á mà chị không gửi được…"
> *EN: "I think the current workflow is fine — I don't know what you're planning to update, because if you update anything on the system and it breaks and I can't send…"*

Yet she then issues roughly 45 explicit change requests over the next hour.

**The stated position ("don't touch it") conflicts with the team's own backlog.**

### C6 — Who is accountable for HR / Licensing delays?
Victoria: her team is fully in charge, and she is the one blamed.
> **Victoria, 1:30:50** — "team của chị là người giống như là incharge hoàn toàn các team khác là support để để cái cái cái ông này ông ấy fully onbard. Thế nên là nhiều lúc ấy là nếu mà có vấn đề gì có problem gì là anh Thuận lôi đầu chị ra"
> *EN: "my team is the one fully in charge, with the other teams supporting so this person gets fully onboarded. So if there's a problem, Thuan drags me out over it."*

Miley simultaneously wants Licensing to take LO calls directly.
> **Miley, 1:32:31** — "làm sao để bên gọi là những cái t liên quan đến licensing thì licensing họ phải in chạc họ nghe máy của lo hoặc là họ phải gọi cho LO để help Loo chứ không phải là bị kiểu sẽ dựa vào oning spolit đó chị"
> *EN: "how do we make it so that for licensing-related tasks, licensing is in charge — they answer the LO's calls or call the LO to help them — rather than everything leaning on the onboarding specialist"*

Victoria's counter: other teams cannot be relied on and the LO must never be bounced.
> **Victoria, 1:32:27** — "Loan officer hỏi là không có được thảy cho team khác. Which is something mà rất nhiều team ở loan factory là cứ cứ thấy loan officer hỏi mà không biết cái gì mà họ không phải là người incharge là họ không có trả lời. Chị nói với team chị là không được như vậy."
> *EN: "When a loan officer asks, you can't throw them to another team. Which is something a lot of teams at Loan Factory do — when a loan officer asks something they don't know and they're not in charge, they don't answer. I tell my team that's not allowed."*

**Directly relevant to HR's and Licensing's own position on who is the LO's point of contact.**

### C7 — Ticket volume.
Thuan's directive is fewer tickets.
> **Victoria, 24:44** — "anh Thuận nhắn cho chị và các bạn ở Terra là không được tạo nhiều tích nữa."
> *EN: "Thuan messaged me and the Tera people that we mustn't create so many tickets any more."*

But the pipeline as described already depends on at least four machine-generated tickets (HR, Licensing, setup-call-back, Support), and Victoria then requests *more* cross-department request objects (#95).

### C8 — Ticket vs phone for LO contact.
Bao proposes a ticket from the LO progress page (#101). Victoria says LOs hate tickets and prefer calling.
> **Victoria, 1:37:13** — "Chứ gửi tích là nhiều lúc là họ họ bực mình á. Không biết là có được giải quyết không. Nhưng mà cứ cho họ đó là một cái option nếu mà họ muốn."
> *EN: "Sending a ticket often annoys them. They don't know whether it'll be resolved. But give them that as an option if they want it."*

Yet she also does not want everyone phoning her team.
> **Victoria, 1:37:45** — "chị mới bảo là chị không muốn là bị đè rô một mình chị là gọi chị tại vì nó quá là mệt á."
> *EN: "that's why I said I don't want everything dumped on me alone, everyone calling me, because it's exhausting."*

**Both positions are held simultaneously and never reconciled.**

### C9 — Hotline model.
Victoria fears a department hotline means the wrong person picks up.
> **Victoria, 1:39:00** — "khi mà gọi cho một department ấy thì chị sợ là những cái người khác người ta pick up chứ không phải là bạn… Thế nhỡ may nó vào cara thì làm sao?"
> *EN: "when you call a department I'm afraid someone else picks up instead of the right person… what if it goes to the wrong one?"*

Miley counters that HR/Licensing hotlines route by shift and work fine.
> **Miley, 1:39:20** — "vẫn là cái hotline đó và ca tối thì sẽ trực ca tối còn ca sáng sẽ trực ca sáng chứ không phải là phân theo kiểu ừ tên người này tên người khác"
> *EN: "it's the same hotline: the night shift covers nights and the morning shift covers mornings, it isn't split by individual name"*

Yet Victoria's own team has a hotline with a ring chain (#103), while she also insists LOs must call their specific specialist (#105).

### C10 — The experience-level label in the live product is wrong.
> **Victoria, 12:53** — "À cái này là sai rồi nha. Cái này là five loan close since 2022."
> *EN: "That's wrong. It's five loans closed since 2022."*

**Anything Recruiting, Commission or Accounting has built on the displayed string is built on a wrong rule.**

### C11 — Are HR/Licensing/Support really "status-change only"?
Bao asserts it from his own interviews.
> **Bao, 1:25:15** — "sau khi nói chuyện với Yến bên SR là gần như là họ họ chỉ đổi status thôi và sau đó là trong đây không cần đổi nữa. Mình cứ nhận đủ những điều kiện này thì nó tự đi hơn."
> *EN: "after talking to Yen on the HR side, they basically only change statuses and after that nothing more needs changing here. Once we have all these conditions met, it moves on by itself."*

Victoria immediately pushes back on the implication.
> **Victoria, 1:25:27** — "Ủa em nhưng mà onbarding specialist là các bạn ấy còn vất vả hơn nha."
> *EN: "But the onboarding specialists actually have it harder."*

**Check this against HR's and Licensing's own transcripts — it drives how much UI those teams get.**

### C12 — Modex: integrated or not?
Victoria states Modex is already integrated but staff still use MMI manually (#30, 13:05). Bao speaks of the Modex integration as a future thing.
> **Bao, 1:17:49** — "nếu mà sắp tới mình ổn với bên Modest á thì cơ bản là mỗi tháng thì mình sẽ có bu một lượng data về"
> *EN: "if we get things settled with Modex soon, then basically each month we'll pull a batch of data"*

**Two different accounts of the Modex integration's status.**

---

## Appendix — verbatim system labels observed (for enum matching)

| Spoken label (verbatim) | Surface | Timestamp |
|---|---|---|
| `action` | menu on the LO record | 0:18 |
| `invite loan officer` / `invited to joy` / `invite to join` | action option | 0:25, 37:06 |
| `join loan factory` | link inside the invite email | 0:53 |
| `conversation history` (also spoken as "audit lock" = audit log) | tab under action | 3:50 |
| `pay one time fee` — described as "option thứ hai" (option 2) | link on the record | 4:15 |
| "option thứ ba" (option 3) = link to sign the contract | link on the record | 4:22 |
| `one on one onbarding meeting` | field | 4:31 |
| `pre onboarding done` (spoken "reon bending done" / "reoning done"; Bao: "pre onboarding") | option value on that field | 5:32, 9:10, 30:23 |
| `invite one one meeting` | action button routing to Calendly — unused | 29:31 |
| `setup call` (spoken "setup cô" / "setup cod" / "setup con") | button | 26:08, 27:24 |
| `complete` | HR-owned field value | 27:08 |
| sponsorship `approve` | Licensing-owned field value | 27:55 |
| `100%` | computed onboarding status | 28:04 |
| `onboarding` | status auto-set on self-payment | 42:07 |
| `ready to join` | flag on self-registered LOs | 39:15 |
| `interested loan office of palmine` = **ILO / interested pipeline** | board | 18:07 |
| `admin loan officer referral` | admin page | 46:37 |
| `onboarded` / `onboarding` | the two referral page views | 47:34 |
| `current loan officer` | value of the `source` field for referrals | 48:18 |
| `number of close loan of refer lo` | referral page column | 49:40 |
| `dashboard` → `loan officers report` → `performance` → `year to date` | report navigation path | 16:31–16:45 |
| `experience level` with values `newly license`, `inexperience`, `experience`, `high producer` | field (4 values upstream, 2 shown on dashboard) | 17:07 |
| `LO is consider inexperience until five loans are closed` | **incorrect** on-screen help text | 12:48 |
