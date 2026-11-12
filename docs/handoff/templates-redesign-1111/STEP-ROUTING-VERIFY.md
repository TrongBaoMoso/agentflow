# Step routing: staging check (12/11)

This checks lf-homepage #2761 (8bd3d8a5) and lo-homepage #969 (aa957b3b) on staging. Each case opened the real email link (from Gmail) or the public page, at 1440 and 390, then reloaded it. The lead's state is what the page loaded from `onboarding/profile`.

Steps on the portal: 1 Before You Begin, 2 Fill Out Basic Information, 3 Paying one-time fee, 4 Review and Sign agreement, 5 Grant Access on NMLS.

| Case | Test lead | Lead state | Opened step | Ticks | Correct? |
|---|---|---|---|---|---|
| invite | Gallery Invite (`+gal-invite`) | no profile, unpaid, unsigned | 1 Before You Begin | none | yes |
| reminder pay+sign | Gallery Remind Both (`+gal-remind-both`) | no profile, unpaid, unsigned | 1 Before You Begin | none | yes: the profile is the first unfinished step |
| reminder sign-only | Gallery Remind Sign (`+gal-remind-sign`) | profile done, paid, unsigned, progress 0.25 | 4 Review and Sign | 1, 2, 3 | yes (before: opened on 3 "Payment successful") |
| agreement updated | Gallery Agreement Two (`+gal-agree-v2`) | profile done, paid, unsigned, progress 0.75 | 4 Review and Sign | 1, 2, 3 (4 not ticked) | yes (before: opened on 5 with 4 ticked) |
| welcome | Gallery Welcome Two (`+gal-welcome-v2`) | no profile, unpaid, unsigned | 1 Before You Begin | none | yes |
| plain reload | each lead above | same | same step as the first open | same | yes, at 1440 and 390 |
| lf /join | none (fresh) | none | 1 About you | none | yes |
| lo /join | none (fresh, LO site) | none | 1 About you | none | yes |
| lo register | none (fresh, LO site) | none | 1 Before You Begin | none | yes |

## Back and the step menu (1440)

- **Reminder sign-only and agreement updated.** Back from step 4 reaches 3 and then 2. The menu opens 2, 3 and 4.
  - Step 1 "Before You Begin" is never a menu or Back target. That is not new.
- **After going back to 3 on the sign-only lead,** the menu cannot jump forward to 4. Its progress is 0.25, and steps after the open one keep the progress rule (`canOpenStep`). Next on the pay step still moves on. With progress 0.75 (agreement updated), the jump works.
- **Leads on step 1:** nothing to go back to.

## Not covered

No staging lead was in these states, so they were not checked:

- fully signed and NMLS not saved (should open on 5);
- fee deferred until the 1-1 call (should pass the pay step with no tick);
- fee waived.

The unit tests in #2761 and #969 cover them.

## Shots

`shots/step-routing-<case>-after-{1440,390}.png`. This run added: invite, lf-join, remind-pay-sign, welcome, and remind-sign-only at 390.
