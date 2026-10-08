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
