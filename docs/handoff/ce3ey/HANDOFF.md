# agentflow-ce3ey: loan officers sign before "Pre-onboarding done"

Brayan ticket #37609417254 (Oct 8 2026): Sara's loan officers (Carlos Contreras Alvarez, Malinda Medina) signed the agreement before the 1-1 call was checked, then could not pay.

## Root cause (measured on prod logs, 09/10)
- Malinda: Basic information save + `registerSigningAgreement` 19:39:46Z (meeting `unselect`); returned from `secure.inklesshub.com` at 21:07:20Z (= just signed); app-log snapshot 21:08:55Z still `unselect`; call ticked ~21:18Z; paid 21:28:56Z.
- Carlos: `registerSigningAgreement` 19:01:27Z (meeting `unselect`); signed before paying (paid-fee mail payload 20:10:49Z already `lo_agreement_signed=true`).
- packs `registerSigningAgreement` (called by the page on the first Basic info save since 11/2024) built a live Inkless envelope with no meeting check. Every UI only hid the button. Predates the recruit changes (same on packs 3.63.0); recruit made no prod calls for these rows.
- How the link reached them: NOT proven. The staff "Re-generate e-sign documents and send email" button was not used 06–08/10. Inkless creates envelopes with `Embedded=true` (no Inkless e-mail by design).
- Both loan officers are complete now (call done, paid, signed).

## Shipped
| Repo | PR | State |
|---|---|---|
| packs | #3641 → master (`d0b408ec`) | merged 09/10 ~04:00 +07; staging deploys via SWAT pipeline |
| packs | #3642 hand-port → 3.64.1 | open, for Khai (see below). NOT deployed to prod. Tests green on 3.64.1. |
| lf-homepage | #2648 → master, #2651 promote → production | merged; prod build after 04:07 +07 |
| lo-homepage | #891 → master, #890 → release, #892 release → produciton-v2 | merged |

packs changes: no envelope before the call; public save/webinar bodies cannot write `onboarding_meeting_status`; save answers carry no link; link served only after the call AND fee settled (`isSigningLinkServable`); staff re-generate mail links the register page before the call; `execute/{op}` door refuses the two registration ops (a test proved it was open).

FE: `useSigningLinkAfterCall` asks for the link at the sign step when the call is done, the fee is settled and there is no link (2 retries, 5 s apart). Needed because MOSO builds the envelope at the call only when the row has an onboarding specialist.

**Deploy order:** FE (done) before packs prod.

## Staging check (www.viet18.com, row `bao.trinh+ce3ey-*@loanfactory.com`)
- call done + paid + no link → page asked once, link stored (cost ONE Inkless envelope: staging `use_inkless` is ON right now, billed to the prod account);
- reload with link → no second ask; call done + unpaid → no ask.
- packs master did NOT reach staging by ~05:40 +07 (GAE `b` last deployed 08/10 20:34 +07; SWAT pipeline did not run within 60 min of the merge). Deploying staging by hand on SWAT is a shared MOSO resource, so not done without Bao. After packs master reaches staging: re-check that `registerSigningAgreement` before the call returns no link, and `getRegisterLoanOfficer` hides the link while unpaid.

## Open
- Bao: decide on the out-of-order rows in `out-of-order-rows-2026-10-09.md` (4 rows can still sign before the call; 2 signed and paid with no call; 3 paid with no call; 1 signed without paying). Only counted, nothing cancelled (Bao 09/10).
- Khai: deploy the 3.64.1 port (message below).
- Bao: send the reply to Brayan (below). Gmail connector here is not Bao's mailbox.

## Draft reply to Brayan (EN)
> Hi Brayan,
>
> Thank you for the examples. Carlos Contreras Alvarez and Malinda Medina are both now marked Pre-onboarding done, have paid the startup fee and have signed, so nothing is pending for them.
>
> What happened: the signing link was created as soon as an LO saved Basic information, before the pre-onboarding call. The registration page kept the Sign step locked, but the link itself already worked, and both of them signed through it before the call was checked. Payment stayed locked until the call was checked, which is the "unable to pay" Sara saw.
>
> We have changed the system so the signing link is only created after "Pre-onboarding done" is checked, and the LO only gets it after paying the startup fee. The website part is live now; the server part goes live with the next MOSO release. We will confirm when it is fully live.
>
> We also found a few LOs whose order looks unusual (for example paid or signed before the call). We will send you that short list separately.
>
> Thanks.

## Message for Khai (VI)
> Anh Khải ơi, em nhờ anh deploy hotfix packs 3.64.1 cho ticket Brayan (LO ký hợp đồng trước khi tick Pre-onboarding done). PR: https://github.com/LoanFactory-Inc/packs/pull/3642. Đã merge master (#3641), 2 reviewer + Repo Owner duyệt, test chạy trên nhánh 3.64.1. Frontend (lf-homepage, lo-homepage) đã lên production trước, đúng thứ tự cần. Cảm ơn anh.

## RESUME POINT (paused 09/10 ~06:00 +07, Bao shutting down the laptop)
State: nothing running in the background. Worktrees kept: `_worktrees/packs-ce3ey` (master branch, merged) and `_worktrees/packs-3641-ce3ey` (PR #3642, open).
Next, in order:
1. `gcloud app versions list --project=lenderrate-master --service=default` — if `b` was redeployed after 09/10 04:05 +07, run the staging server checks above on the test row (`bao.trinh+ce3ey-*`, key in this session's scratchpad is gone after reboot: find it via `getRegisterLoanOfficer` request logs on staging or create a new row). Do NOT call `registerSigningAgreement` on a pre-call row until the new code is confirmed live (old code builds a billed Inkless envelope).
2. Ask Bao: did Khai deploy #3642? did Bao send the Brayan reply? decision on `out-of-order-rows-2026-10-09.md`?
3. After #3642 is on prod: probe prod read-only — `getRegisterLoanOfficer` for a pre-call row with a stored link (e.g. Jessica Phan / Steve Hutchins from the list) must no longer return `url_signing_sessions`.
4. Then close bead agentflow-ce3ey and remove both packs worktrees.

## UPDATE 09/10 10:30 +07 — packs fix is on PRODUCTION
Khai released packs 3.65.0 from master (GAE `d`, 10:27 +07); it contains #3641. #3642 closed (not needed). Read-only prod check right after: pre-call rows with a link 0/29 (was 4), call-done-unpaid rows with a link 0/8, call-done-and-paid rows still served 82/87 (5 never had one). No real user traffic on the register endpoints yet since the release. Both packs worktrees removed.
Left for Bao: send the Brayan reply; decide on the out-of-order rows (Steve Hutchins was ticked this morning, unpaid).

## CLOSED 09/10 ~15:10 +07
- Bao replied to Brayan with two emails (Sara's case + Miley's case), content as drafted in the session.
- Re-measured with prod Datastore read access (granted by Khai): History-based timelines for 497 loan officers. Since the new order (Oct 5): Carlos, Malinda, LaShambra Ewing signed before the call; Shane Ouimet signed 2 min after the call, fee marked paid by Miley 24 min later; Leo Namiot signed Oct 8 evening (US) with no call/no payment. Open Inkless links without a call: Jessica Phan, Sejal Patel, Woodrow Collins, Brayan TEST. Rows from the old list (Areg, Nicholas, Aman, Larry, Brisaly, Kara) followed the pre-Oct-5 process.
- Miley's case = Cameron Dela Fuente: profile entered by staff in MOSO, call ticked with no onboarding specialist, so no envelope until the specialist was set (20:41Z); covered by the sign-step ask now on prod.
- Final checks: fixes still on packs master / lf production / lo produciton-v2; prod GAE d since 10:27; no errors on register endpoints since; no prod email template carries the raw Inkless link; 0 RECRUIT_V2 rows on prod, recruit-be prod only reads.
- Not done on purpose: no envelope cancelled (Bao).
- Correction 15:20: staging packs WAS redeployed 09/10 09:56 +07 (Khai's release pipeline). Verified on staging with the test row `bao.trinh+ce3ey-10090331` (id 35622637059): link hidden when call done + unpaid and when no call; served when call done + paid; keyed save and webinar form cannot record the call and answer without the link; `execute/recruiting.RegisterInterestedLoanOfficer` refused; `registerSigningAgreement` before the call answers `{key}` and creates no signing session.
