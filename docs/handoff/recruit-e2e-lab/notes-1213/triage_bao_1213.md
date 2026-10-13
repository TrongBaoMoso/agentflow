# Triage of Bao's sheet results (12/10), run 13/10 ~02:30 VN

Code read: recruit-be origin/master 75ace547, recruit-fe origin/master 33d5e0f3 (fetched 13/10), lf-homepage origin/master, omni-service origin/master, packs origin/master + origin/3.64.1.
Data read (read-only): staging recruit_db and omni_db, recruit-be/omni staging pod logs, Cloud Logging of loanfactory-email-service-dev, GAE version metadata, and the deployed packs jar from the staging bucket.
Nothing was changed, committed, or written to the sheet DB.

**Screenshots:** only `Screenshot 2026-10-12 at 14.59.40.png` (A23) exists. These are MISSING from /Users/apple/Desktop (and mdfind finds them nowhere): 15.55.43, 15.57.13, 15.58.14 (3) (B7); 16.04.20 (3) (B10); 16.17.28 (3) (B13). The verdicts for those steps come from the note text, the code and the DB.

Verdicts: (a) real bug · (b) confusing step or UI · (c) already fixed or deployed.

---

## A23: (b) no bell for your own tick (by design); the sheet's expected result is wrong

**Evidence**
- Screenshot: HR to-do and HR docs both show "Ticked by Bao Trinh" + Undo, which is correct. The bell list has no "HR is done for QA Tenmain".
- DB: `candidate_onboarding_step_history` for QA Tenmain (f2b43f18): HR_TODO DONE 07:56:56Z and HR_DOCS DONE 07:57:26Z. The actor is `3e228b0a…`, and that is also `candidates.onboarding_specialist_id`. Bao ticked as the onboarding specialist; the bell "QA Tenmain was assigned to you for onboarding" (ONBOARDING_ASSIGNED → 3e228b0a) confirms it.
- `recruit_notifications` has no ONBOARDING_SIDE_DONE row for this LO.
- Code: `recruit-be src/main/java/com/loanfactory/recruit/postjoined/PostJoinedNotices.java:24-27` ("Nobody is told about their own tick"). In `insert()` (~line 64): `if (… Objects.equals(recipient, actorId)) return;`. The bell goes ONLY to the specialist, and only when someone else (HR) ticked.

**Guide (VI)**
> Chuông “HR is done for {LO}” chỉ gửi cho **onboarding specialist** của LO, và **chỉ khi người khác** (vd. HR) tick — tự tick thì không có chuông cho chính mình (quy ước chung của mọi chuông).
> Muốn thấy chuông: (1) đăng nhập tài khoản HR (vd. `bao.trinh+role-hr`) → mở hồ sơ LO → tick **HR to-do** + **HR docs**; (2) đăng nhập lại bằng tài khoản specialist của LO → bấm chuông → có “HR is done for QA …”.

**Sheet change:** in the A23 expected result, replace "When HR is complete: bell…" with: "Ticks made by YOURSELF give you no bell. To test the bell, an HR account ticks while you are the specialist; then you get 'HR is done for QA Tenmain'."

---

## B7: (a) small UX gap. Edit & resend cannot change the two numbers; the sheet asks for something the dialog does not allow

**Evidence**
- `recruit-fe src/shared/components/InviteModal/index.tsx:84` (D-I9 "check only, never re-collect") and `:395-411`. A number already on file renders as read-only text (`field.onFile != null || figuresLocked`). Only an empty number gets an input. `:293` "a number already on file is never re-sent".
- The first offer saved the numbers, so Edit & resend shows them read-only. NMLS has a "Update NMLS in the profile" link in the same dialog (`openNmlsEdit`, `:218`); the numbers have none.
- DB QA Tenbdecline (f19ba96d): offer 024c306a DECLINED 08:53Z; Bao edited the profile to 6/3; new offer a6178e44 SENT 08:58:57Z, approved_by SYSTEM (auto-approved). Bao confirms the button then said "Send to onboarding". So the flow works, but only through a detour.
- The /invites page mounts `CandidateDrawer` (`invites/_components/InvitesClient/index.tsx:460`), so a link that opens the edit modal on the Production tab works there.

**Fix proposal**
- Repo: recruit-fe. File: `src/shared/components/InviteModal/index.tsx` (+ en/vi `invite.json`, one test).
- Under "The two numbers", when either number is on file and the user may edit (`!figuresLocked`), add a subtle link "Edit the numbers in the profile". It works like `openNmlsEdit`, but with `EDIT_TAB_PARAM='production'`.
- Size: ~20 lines + 2 strings + 1 test. Risk: low (it only adds a navigation link; D-I9 "never re-collect inline" stays).
- Alternative (product call for Bao): make the on-file numbers editable inline when the dialog opens from Edit & resend. This changes D-I9, so Bao must decide.

**Sheet change:** B7 step → "… Edit & resend → in the dialog the numbers are read-only: click 'Edit the numbers in the profile' (after the fix; before it: Profile → Edit → Production) → 6/3 → Save → back to My hand-offs → Edit & resend → Send to onboarding."

---

## B9: (b) the sheet is wrong. QA Bnonmls has no NMLS to blank, and "empty = no change" does not apply to NMLS

**Evidence**
- DB: QA Bnonmls (e7cea9ad) `nmls_id` is empty, and the row was last modified at creation (07/10 16:10Z, super.admin). It was registered WITHOUT NMLS (the name means "B no-NMLS"). The sheet's `data_los.js` row B7 lists nm 9931818, but recruit never received it. Bao's save on 12/10 changed nothing (no field change).
- "empty = no change" is true for the NUMBER fields only. `recruit-fe src/shared/components/CandidateEditModal/schema.ts` ~line 190: "Numeric fields have no non-null empty on the wire". NMLS is text: `schema.ts:168` sends `nmls_id: ""` when it is cleared. `recruit-be CandidateServiceImpl.java:1582-1584` `if (nmlsId != null) candidate.setNmlsId(nmlsId)`, so on an LO who HAS an NMLS, blanking it WOULD clear it. This is not verified by a write; it is read from the code.
- The first half (Bnonmlstwo modal "NMLS missing" + link) is not disputed in Bao's note.

**Guide (VI)**
> Phần 1 (Bnonmlstwo) giữ nguyên. Phần 2: QA Bnonmls **vốn không có NMLS** nên ô NMLS trống sẵn — không có gì để xoá; Bao lưu thì hệ không đổi gì. Bước này viết sai, Bao **bỏ qua phần 2**.

**Sheet change:** delete the second half of B9. If Bao wants to keep a negative check, change it to: "On an LO that HAS an NMLS (e.g. QA Bnotmine as manager), blanking NMLS + Save → the NMLS is CLEARED (text field)". Then decide whether that is wanted. NMLS is a Modex match key, so a product question goes with it: should blank-NMLS be refused?

---

## B10: (b) Call on someone else's lead is allowed by design today; not covered by #444. A product decision is needed

**Evidence**
- QA Bnotmine (feb2759d) owner = 24ca68b0 (QA Test Manager) at test time. It is an OWNED lead, not an unowned one.
- recruit-fe PR #444 (claim-first) adds `claimAction` only for UNOWNED leads (diff: "An UNOWNED lead … Undefined = an owned lead, unchanged"). So #444 does not cover B10's screen.
- DB `activities`: 3 × CALL OUTBOUND by d8186688 (bao.trinh+recruiter) at 09:03:43, 09:04:06, 09:04:16Z. recruit-be logs: `POST /candidates/feb2759d…/activities` 201. The SMS and Email clicks hit only `GET contact-route` (200); no activity was logged.
- Code, on purpose:
  - `recruit-fe src/shared/components/ContactButtons/index.tsx:191-197`: "A claim WARNING does not block … ALREADY_OWNED-by-someone-else … Blocking on those would stop recruiters from contacting candidates they are allowed to contact"; then `openExternalUri(uri)` at `:231`.
  - `recruit-be …/ActivityServiceImpl.java:309` ("everyone else (a non-owner recruiter…): never [gets the reminder]. Their call is still logged") and `:331` (`ALREADY_OWNED`, logs + warns).
  - The toast Bao saw is `logged_other_owner` ("… already owns this candidate").
  - The hero shows ContactButtons whenever `!readOnly` (`CandidateHero.tsx:120`).
- B10's own expected result (no offer, no Ready to join) PASSED per Bao's note.

**Fix proposal (if Bao wants "not my lead → no Call")**
- recruit-be `ActivityServiceImpl.log` (~:172): refuse OUTBOUND CALL/SMS/EMAIL with 403 "Only the owner or a manager can contact this lead" when all of these hold:
  - owner ≠ actor;
  - the actor is not elevated (REPORT_TEAM);
  - the actor is not the onboarding specialist;
  - the actor is not a follower.
- The FE already keeps the dialer shut on any 4xx (`fire()` catch).
- recruit-fe: hide the hero's ContactButtons (and the Today/Pipeline row icons) for the same set. Reuse the #444 pattern (`ownerAction`/`claimAction`).
- Size: BE ~40 lines + IT; FE ~30 lines + tests. Risk: MEDIUM. Onboarding, HR and department roles and followers legitimately contact LOs they do not own, so the exemption list must be right, or real work is blocked.
- Needs Bao's decision first. This changes D43/D45.

**Sheet change:** add to B10's expected result: "Call on someone else's lead still dials and shows 'X already owns this candidate' (current design). Mark Fail only if Bao decides it should be blocked."

---

## B13: (b) the example LO no longer shows the state; the step cannot be done as written

**Evidence**
- DB `packs_writeback_outbox` for QA Claudeofferb (6a4f7b4a): INVITE DEAD_LETTER 08/10 (401 unknown/inactive acting user, actor bao.trinh+manager). Then INVITE **SENT** 10/10 10:10Z via delivery actor manhadmin@viet18.com, which was AG2 "Resend invite". So the banner and the "Not delivered to MOSO" chip are gone, as the step itself warns ("AG2 clears this strip"). Since #601 a new failure is retried as the system actor on staging, so a fresh example rarely stays failed.
- An LO that IS still in the failed state now: **QA Tenadsupport** (911687e3): INVITE DEAD_LETTER 10/10 10:15Z "401 … acting user lacks recruiting permission", actor bao.trinh+role-losupport+1. (Older: Chowfi Toni, Ro Vidi, 06/10.)

**Guide (VI)**
> B13 chỉ là bước “nhìn”. QA Claudeofferb đã được gửi lại (AG2, 10/10) nên **không còn** dải đỏ — Bao không thấy là đúng.
> Thay vào đó: ô tìm gõ `Tenadsupport` → mở **QA Tenadsupport** → tab **Overview** → phải thấy dải “The invite did not reach MOSO, so QA Tenadsupport has not been emailed” + thẻ Offer “Invited — Not delivered to MOSO”. Chỉ nhìn, **đừng bấm Resend** (dùng cho B14).

**Sheet change:** B13 → use QA Tenadsupport (link `/candidates/911687e3-91f6-422f-ad1a-78f4fdb252c7`). Note: "QA Claudeofferb was resent on 10/10, so the strip is gone."

---

## B14: (c) packs #3645 IS deployed on MOSO STAGING since 12/10 15:26 VN; NOT on production. The test itself has not been run yet

**Evidence**
- packs #3645 = `911ea17db83` (merged to master 09/10 17:03 VN).
- `gcloud app versions list --project lenderrate-master --service default`: version `b` traffic 1.00, deployed **2026-10-12 15:26:03 +07:00** by gae-deployer.
- I downloaded the deployed jar (`WEB-INF/lib/loan-3.65.0-SNAPSHOT.jar`, built 12/10 01:09) from the staging bucket. `RecruitAPI.class` contains `mayActOnLoRecruiting`, `isAuthorizedActor` and `hasLoRecruitingDeskPermission`, the methods #3645 added. So #3645 is live on staging.
- Production: packs prod branch `origin/3.64.1` (HEAD 918ba2e2110, 12/10 17:46) does **NOT** contain #3645 (not an ancestor, and no `mayActOnLoRecruiting`). `lender-rate` default version c was deployed 12/10 18:29 from that branch. Production still has the old gate.
- No recruit-be/fe change is needed for B14.
- Since the deploy, no INVITE has been sent by an actor that lacks RECRUITING. All of 12/10's invites were by bao.trinh+recruiter, bao.trinh@ or the manager, and were SENT even before the deploy, so **bao.trinh+recruiter is NOT a valid account for B14** (it already passes the old gate).

**Guide (VI)**
> Đã deploy STAGING (12/10 15:26), chưa lên PRODUCTION.
> Tài khoản đúng cho B14 là tài khoản recruiter mà MOSO Admin **thiếu** nhãn RECRUITING — `bao.trinh+recruiter` KHÔNG phải (nó gửi offer thành công cả trước khi deploy). Ứng viên: `bao.trinh+role-losupport+1` (bị lỗi đúng câu “lacks recruiting permission” ngày 10/10 với QA Tenadsupport).
> Cách test: đăng nhập `bao.trinh+role-losupport+1` → mở QA Tenadsupport → thẻ Offer → **Resend invite** → đợi 5 phút (cron :00/:05) → mở lại Overview: hết dải đỏ, thẻ Offer không còn “Not delivered to MOSO”.
> Nếu vẫn 401 “lacks recruiting permission”: MOSO Admin của tài khoản này cũng không có INTERESTED/RECRUITED_LOAN_OFFICERS/is_recruiter → #3645 cố ý không nhận; khi đó báo lại, không phải lỗi deploy.
> (Claude chạy hộ được, Bao đã cho dùng tài khoản role staging 10/10.)

**Sheet change:** B14 → replace the default account with `bao.trinh+role-losupport+1` and the LO with QA Tenadsupport (Resend). Remove "SWAT stuck / Skip".

---

## C2 / C3: (b) not reversed by code. The LO page shows the LO's OWN registration answer, because Recruit sends nothing to MOSO for Corporate or Mortgage advisor. There is a product gap behind it

**Evidence**
- LO page (lf-homepage `register-loan-officer/RegisterLoanOfficerForms/ReviewAndSignAgreement/index.tsx:20-25`, from 3495b967): W-2 text iff MOSO `is_corporate_loan_officer === 'true'`, 1099 iff `'false'`.
- recruit-be `candidate/HireClassification.java:21-24, :94-102`: OUTSIDE→true, INDEPENDENT→false, **CORPORATE / MORTGAGE_ADVISOR → null = field omitted** ("Bao's mapping: MOSO never learns Corporate/Mortgage-advisor from Recruit — that agreement is handled manually"). `HireClassificationWriter.java:73,92` enqueues nothing for them. `agreement/AgreementSendGate.java:76-83` says MOSO "always builds W-2 or 1099" for them.
- DB (recruit mirror of MOSO):
  - QA Tenccorp lo_type CORPORATE, `is_corporate_loan_officer = f` → page "Independent Loan Officer (1099)" (C2).
  - QA Tencadvisor lo_type MORTGAGE_ADVISOR, `= t` → "Outside Loan Officer (W-2)" (C3).
  - `candidate_change_log` shows each lo_type set once (12/10 09:44Z / 10:09Z) by d26eb34a, with no flip.
  - Both LOs were registered on 12/10 through the web form (AK/AK). Their W-2/1099 value is what was picked on the registration form (the sheet default is W-2 "unless the row says 1099"; NC2 was evidently registered as 1099).
  - Claude's earlier C2/C3 runs (Claudecorp/Claudeadvisor) were both registered W-2 (`t`), which is why this never looked wrong before.
- The "Done…" note Bao should see is `recruit-fe messages/en/workQueue.json:183` "Corporate and Mortgage advisor staff don't sign the outside or independent loan officer agreement… handled outside this flow."

**Why this still matters:** a Corporate or Mortgage-advisor LO is still taken to "Review and Sign" and told they are "tentatively classified as W-2/1099". They are asked to sign an agreement that does not apply to them.

**Options for Bao (decision, not a code bug)**
1. lf-homepage + lo-homepage: hide the classification line and the Sign button when recruit's lo_type is CORPORATE/MORTGAGE_ADVISOR. This needs MOSO or recruit to expose that to the LO page; it does not today. Requires a packs field or a recruit public endpoint. Medium.
2. Accept as is and change the sheet: "the page shows what the LO picked at registration; Corporate/Advisor agreements are handled manually". Zero code.
3. Send CORPORATE → W-2 to MOSO (corporate staff are W-2 employees). This reverses Bao's mapping. Small BE change, but a product call.

**Sheet change (if option 2):** C2/C3 expected → "The LO page still shows the classification from the LO's own registration (W-2 or 1099). Recruit does not change it for Corporate/Mortgage advisor. Record which one."

---

## F7b: (b) "Edit before sending" is a footer button that only appears in one state

**Evidence**
- `recruit-fe src/shared/components/FollowUpsPanel/OutcomeSection.tsx:757-767`: the "Edit before sending" button is in the **sticky footer, left of "Save & send"**. It renders only when `sendNowWithBody && onSendInfoDraft`.
- `:300`: `sendNowWithBody = kind === 'SEND_INFO' && sendMode === 'now' && body.trim().length > 0`. So it needs Send info + **Send now** + text in the body (pick a template or type something).

**Guide (VI)**
> Log result → Interested → **Send info** → Send via Email → chọn **Send now** → chọn Template (hoặc gõ nội dung) → nhìn **đáy hộp thoại**: bên trái nút cam “Save & send” có nút viền **“Edit before sending”**. Nội dung trống hoặc chọn “Schedule for later” thì nút này không hiện.

**Sheet change:** F7b step → "… Send now + pick a template, then the **Edit before sending** button at the bottom, left of Save & send (it only shows with Send now and a non-empty body)."

---

## G2: (a) NEW finding. The reply now REACHES omni (the Google route works), but omni cannot match the cand- address, because recruit-be's routing-key lookup does not accept the candidate id. Not just "waiting on Khai/fexgs" any more

**Evidence (12/10, Bao's reply "G2 reply from LO")**
- Cloud Logging, project loanfactory-email-service-dev:
  - `/_ah/mail/loan@…appspotmail.com` 200 at **17:48:25Z**.
  - "Successfully forwarded email from vutrongbao.trinh.ltb@gmail.com to https://gateway.viet18.com/omni-svc/public/api/v1/comm/hooks/inbound-email - Status: 200" at 17:48:27Z.
  - So Workspace rule d6d00 now routes cand- replies. That is the part bead agentflow-fexgs was blocked on: fixed by someone on or before 12/10.
- omni-sta pod log 17:48:27.796Z: `"inbound parked to comm_unmatched" … unmatched_id dfac40e3-1ddb-4adb-bc48-0bbb41800821 … candidates:2`.
- omni_db `comm_unmatched` dfac40e3:
  - our_address = `cand-07001ba1-360b-491f-b9e1-c1b45766739d.1f08645a@reply.viet18.com`;
  - body "G2 reply from LO";
  - status PENDING;
  - guessed subject LOAN 31aded7e. The same gmail is a party on a LOAN, so the sender fallback found more than one subject and parked it in triage.
- recruit-be log 17:48:27.702Z: `GET /public/api/v1/comm/host/subjects/LO_CANDIDATE/resolve?routing_key=07001ba1-360b-491f-b9e1-c1b45766739d` → 200 with no subject.

**Root cause**
- omni mints LO_CANDIDATE reply addresses as `cand-{candidateId}[.{threadKey}]`. `omni-service internal/registry/configtypes.go:65-74`: "The routing key is the readable slug … LO_CANDIDATE's UUID". It then asks the host to resolve that UUID (`internal/inbound/email.go:278-325`, `internal/hostsubjects/hostsubjects.go:463`).
- recruit-be `src/main/java/com/loanfactory/recruit/hostsubjects/service/impl/HostSubjectsServiceImpl.java:76-92` resolves a routing key **only as a phone or an email** (`normalizePhone` / `normalizeEmail` → `matchesRoutingKey`). A candidate UUID never matches, so it returns empty, Layer 1 fails, and the reply either goes to triage (sender on more than one subject, as here) or is filed by sender email only if that sender is on exactly one subject. That second case hides the bug for most real LOs; it does not route by the address.
- The javadoc at `:61-63` says "a phone number or an email address". It was written in #275 (08/09) for SMS phone routing; the email cand- shape was never handled.

**Fix proposal**
- Repo: recruit-be. File: `HostSubjectsServiceImpl.resolve`. Before the phone/email path: if `routingKey` is a UUID and a candidate with that id exists, return `mergedIntoId != null ? mergedIntoId : id`, and only when `isActive` holds. Fix the javadoc. Add unit + IT cases:
  - a UUID that exists;
  - a merged UUID → its survivor;
  - an unknown UUID → empty;
  - a phone/email key → unchanged.
- Size: ~15 lines + tests. Risk: low. The key is unguessable in practice (UUID), it is tenant-scoped by omni, and omni already asks `/active` afterwards. One open point: omni caches negative answers (`resolveNegTTL`), so the first reply after deploy may need the cache to expire.
- Production: the same recruit-be code, so production cand- replies fail the same way once ef81f routes them (bead says no real prod reply seen since mid-Sep).
- The parked message dfac40e3 is still PENDING in omni triage. A staffer with triage access could attach it to TRINH VU TRONG BAO by hand; after the fix, Bao re-replies to test.

**Guide (VI)**
> Phần 1 vẫn ĐẠT. Phần 2: thư trả lời của Bao **đã tới hệ thống** lúc 00:48 VN 13/10 (đường Google đã thông), nhưng recruit-be không nhận ra địa chỉ `cand-<id>@reply.viet18.com` nên thư nằm ở hàng chờ “chưa khớp” của omni, không vào hội thoại. Đây là lỗi code (đề xuất sửa ở trên), không còn là việc của anh Khải. Sau khi sửa: Bao Reply lại một lần nữa.

**Sheet change:** G2 expected note → "BLOCKED by recruit-be routing-key bug (cand-<id> not resolved); the Google route was fixed on 12/10". Update bead fexgs (route OK) and file a new bead for the resolve bug.

---

## F5 / F6 (PASS, Bao's questions): when does the LO come back to /today, and how do I set a follow-up?

**Facts (code + DB)**
- An INTERESTED next step creates ONE follow-up (`FollowUpServiceImpl.interested`, `recruit-be …/FollowUpServiceImpl.java:~512-560`). /today lists the LO when that follow-up is due.
- **Webinar (F5):** the FE sends no date for WEBINAR (`OutcomeSection.tsx:363-378`). The BE then uses today + `followup.default_due_days` (staging = **1**), NOT the webinar date.
  - DB QA Tenfwebinar: "Call outcome INTERESTED -> WEBINAR due 2026-10-13, registered for webinar 35412067022", `next_follow_up_at` 2026-10-13 07:00Z.
  - So the LO comes back to /today **the next business day**, not on the webinar day (18/11). Nothing puts the LO on /today on the webinar day itself.
  - A logged MEETING clears WEBINAR/MEET follow-ups (`FollowUpAutoClear.java:41`).
- **Meet 1-1 (F6):** the follow-up is due at the meeting time. QA Tenfmeet: "MEET_ONE_ON_ONE due 2026-10-13", `next_follow_up_at` 2026-10-13 17:00Z = 10:00 PT. So the LO is on /today on the meeting day.
- **Setting another follow-up yourself:**
  - Profile → Overview → section **Follow-ups** → **Add follow-up** (`CandidateDrawer/OverviewTab.tsx:183`; owner or manager only).
  - Or on /today: the row's **Add follow-up** (`TodayQueueRow.tsx:278`) or **Remind later**.
  - Or **Log result** again after the webinar or 1-1.

**Guide (VI)**
> - **Webinar:** lưu “Save webinar reminder” thì hệ tự đặt 1 follow-up **ngày làm việc kế tiếp** (cài đặt `followup.default_due_days` = 1), KHÔNG theo ngày webinar. LO hiện lại trên /today hôm đó. Muốn nhắc đúng trước/sau webinar: mở hồ sơ → Overview → **Follow-ups → Add follow-up** → chọn ngày (vd. 1 ngày trước và 1 ngày sau 18/11). Đúng ngày webinar LO **không tự hiện** trên /today nếu không có follow-up ngày đó.
> - **Meet 1-1:** follow-up đặt đúng giờ hẹn → LO hiện trên /today ngày họp. Họp xong → **Log result** lần nữa để đặt bước tiếp, hoặc Add follow-up.

**Possible improvement (question for Bao, not filed):** make the WEBINAR follow-up due relative to the session date (e.g. the day after the webinar) instead of tomorrow.

---

## F7 (PASS, Bao's question): may a template contain {{first_name}}?

**Facts**
- Yes. When a Team template is PICKED, the FE fills `{{first_name}}`, `{{last_name}}` and `{{recruiter_name}}` with this LO's data (`OutcomeSection.tsx:219-228`, `renderScriptBody`). So "Hi {{first_name}}" in the template becomes "Hi QA".
- Only a token that is still in the text at send time blocks "Save & send": one typed by hand after picking, or an unknown one (`sendInfoNow.ts:93-113`). The message then says "Fill in {{first_name}} first, or edit before sending." "Edit before sending" opens the composer, where you can fix it.
- Sheet typo: the sheet shows `{{{{first_name}}}}` (4 braces) in F7's expected result (`cases_2.js:35`); the app shows `{{first_name}}`.

**Guide (VI)**
> Template **được** có `{{first_name}}` — khi chọn template hệ tự thay bằng tên LO. Chỉ khi `{{…}}` còn sót trong nội dung (tự gõ tay sau khi chọn, hoặc biến lạ) thì “Save & send” mới khoá; bấm “Edit before sending” để sửa trong khung soạn.

**Sheet change:** fix `{{{{first_name}}}}` → `{{first_name}}` in F7.

---

## A13 (PASS, note only): no issue

- Bao recorded "Company time (Los Angeles): Mon, Oct 12 · 10:00 AM PDT".
- DB QA Tenmain 1-1 `meeting_starts_at` = 2026-10-12 17:00Z = Mon 10:00 PDT = Tue 13/10 00:00 VN. This matches the step (00:00 VN = 10:00 AM PT). Nothing to do.
- Side note: `meeting_date` = 2026-10-11 is the "held on" date from Done (marked done 04:51Z = Sun 11/10 PT). That is consistent.

---

## Summary

| Step | Verdict | One line |
|---|---|---|
| A23 | (b) | You were the specialist; no bell for your own tick (PostJoinedNotices). Fix the sheet text. |
| B7 | (a) small UX | Edit & resend shows on-file numbers read-only, with no link to edit. Add an "Edit the numbers in the profile" link (fe InviteModal). Sheet step wrong. |
| B9 | (b) | QA Bnonmls has no NMLS; "empty = no change" applies to numbers, not NMLS. Drop the second half. |
| B10 | (b) + decision | Call on someone else's lead is allowed by design (ContactButtons :191, ActivityServiceImpl :309); #444 covers only UNOWNED leads. Bao decides; fix is BE gate + FE hide, medium risk. |
| B13 | (b) | Claudeofferb was resent 10/10, so no strip. Use QA Tenadsupport (still DEAD_LETTER). |
| B14 | (c) staging / not prod | #3645 is in the MOSO staging jar deployed 12/10 15:26; prod branch 3.64.1 lacks it. bao.trinh+recruiter is the wrong account; test with role-losupport+1 on QA Tenadsupport. |
| C2/C3 | (b) + product gap | The page shows the LO's own registration W-2/1099; Recruit sends nothing for Corporate/Advisor (HireClassification :94). Bao picks an option. |
| F7b | (b) | "Edit before sending" is the footer button left of Save & send, only with Send now + a body. |
| G2 | (a) NEW | Google route now works (reply hit omni 17:48Z); recruit-be HostSubjectsServiceImpl.resolve does not accept the candidate UUID, so the reply sits in omni triage. ~15-line BE fix. |
| F5/F6 | answer | Webinar follow-up is due tomorrow (default_due_days=1), not on the webinar date; Meet 1-1 is due at the meeting time; Add follow-up on Overview. |
| F7 | answer | Template tokens are filled on pick; only leftover tokens block. The sheet shows 4 braces (typo). |
| A13 | no issue | Time is correct. |
