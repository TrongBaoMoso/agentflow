# Add lead, variant B: staging evidence (06/11/2026)

Bao chose variant B on 06/11 at about 01:40 VN. It is live on STAGING only. Production is untouched, because D165 refuses manual create there.

## What shipped

| Repo | PR | Merge sha | Staging |
|---|---|---|---|
| recruit-be | [#874](https://github.com/LoanFactory-Inc/recruit-be/pull/874): D393, manual create needs a name AND an e-mail or phone | `b4f61e2ab` | promoted, deploy green, pod rolled 19:49Z |
| recruit-fe | [#711](https://github.com/LoanFactory-Inc/recruit-fe/pull/711): Add lead opens the empty lead profile | `6168cd37` | promoted, deploy green, 2/2 pods rolled 19:49Z |

- **BE (D393).** `POST /api/v1/candidates` answers 400 `reason=LEAD_MINIMUM` unless the request has a first or last name AND an e-mail or phone.
  - The check runs after the D165, D201 and RBAC gates and before the D384 duplicate lookup.
  - Lead intake, the MOSO push and Modex are unchanged. They use their own services.
  - Recruit-fe Add lead is the only caller of `POST /candidates`.
  - The number was D392 at first; it was renumbered because PR #875 took D392.
- **FE.** The Pipeline "Add lead" button opens `?ws=new&wsTab=profile`.
  - Field saves are held until the minimum is met. The first save that meets it sends one create; saves made while that create is in flight follow as PUTs on the new lead.
  - After the create, the popup moves to `?ws=<id>&wsTab=profile`, and the tabs, Labels and legal-name confirm appear.
  - The D384 duplicate notice and its Open lead button sit under e-mail and phone.
  - `AddLeadModal` and its test are deleted.

## Measured on staging (admin account, 06/11 ~02:55 VN)

- API probe `POST /candidates {first_name}` returned **400 LEAD_MINIMUM**, and no row was created. This shows the D393 build is live.
- UI run, test e-mail `bao.trinh+addbpi7qd9@loanfactory.com`:
  - First name only, then blur: **0** creates, and the URL stays `ws=new`.
  - Then the e-mail, then blur: **exactly 1** create (201), lead `cc1ca53d-0828-4572-9d86-a5459a2501c5`. The URL switched to that id and "Lead added." showed.
  - Add lead again with the same e-mail at 1440: **409 DUPLICATE_LEAD**. The notice showed with Open lead, and the URL stayed `ws=new`.
  - The same check at 375: 409, notice shown. No second lead was created.
- Cleanup: lead `cc1ca53d…` was ARCHIVED through bulk-archive. A GET confirms `ARCHIVED`.

## Screenshots (viewport only)

| File | State |
|---|---|
| `before-addlead-modal-1440.png`, `before-addlead-modal-375.png` | BEFORE: the 5-tab Add lead modal (staging, before the promote) |
| `after-1-empty-1440.png` | Empty profile: "(no name)", the new hint, no tabs and no Labels |
| `after-2-typing-before-minimum-1440.png` | First name typed: the header shows it, no "Saved", nothing created |
| `after-3-created-1440.png` | Created: "Lead added.", the tabs and Labels are back, legal name Unconfirmed |
| `after-4-duplicate-1440.png` | Same e-mail again: the D384 notice + Open lead under e-mail/phone |
| `after-5-empty-375.png`, `after-6-duplicate-375.png` | Phone width |

## Follow-up fixes (recruit-fe #714, merged as `11819419`)

1. **Avatar.** With no name typed, the header avatar read "(N". It now uses `InitialsAvatar`'s own fallback "?", the same one the app shows for any missing name. The heading still says "(no name)".
2. **Legal name right after a create.** A lead created from a first name alone showed "Legal last name: This field is required" in red at once.
   - The block already stays quiet while pristine (no legal name yet). A lead this browser created through Add lead in the last 10 minutes now counts as pristine too. That memory is in-page only, per lead, and cleared on sign-out.
   - The first touch brings the same error back. The rule is unchanged, and the Confirm button still refuses the incomplete name.

BEFORE: `fix2-before-avatar-1440.png`, `fix2-before-avatar-375.png`, `fix2-before-legal-1440.png` (copies of the first run's AFTER shots, taken on the #711 build).
AFTER: `fix2-after-avatar-1440.png`, `fix2-after-avatar-375.png`, `fix2-after-legal-quiet-1440.png`, `fix2-after-legal-touched-1440.png`.

Measured on staging after promoting master tip `11819419` (it also carried webinar-auto-3's #713 D389, with the lead's OK). The staging deploy was green, and recruit-frontend was 2/2 ready on pods that rolled at 20:26Z.
- The empty avatar reads "?" at both 1440 and 375.
- Lead `c5affad8-f2f0-43e1-9503-023fef62db82` was created from a first name and an e-mail.
  - Before the legal block was touched: 0 "This field is required".
  - After typing in the legal first name box: 1.
  - The lead is ARCHIVED afterwards.

## Open questions for Bao

1. **Confirm on close?** Values typed below the minimum are lost if the popup is closed. Nothing is saved yet, as the hint says. Should closing ask for confirmation when something was typed? That would need new copy.
2. **Retry on the same e-mail after a duplicate.** Retyping the exact same e-mail sends nothing, because the value did not change. Changing the e-mail or phone, or any other field, retries. Should the notice offer an explicit retry, or is this fine as is?
