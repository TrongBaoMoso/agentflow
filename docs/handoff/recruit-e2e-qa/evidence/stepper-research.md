# Candidate stage stepper (S1..S7): how other products do it

Researched 2026-10-06. Every claim below has a cited URL. Where a source did NOT document something (for example a "skipped" visual), this file says so and does not guess.

## 0. Constraints and the width maths

- Drawer header is about 640px usable. 640 / 7 = **about 91px per step**.
- Phone is 375px, about 343px usable after a 16px gutter. 343 / 7 = **about 49px per step**.
- Carbon requires a **minimum step width of 128px** and labels of "one to two words only, with a limit of 16 characters". 7 x 128 = 896px, so 7 Carbon steps do NOT fit 640px. https://carbondesignsystem.com/components/progress-indicator/style/
- eBay Playbook allows **3 to 7 steps** with a **minimum horizontal gap of 104px**. 7 steps is their maximum, and it still needs about 728px. https://playbook.ebay.com/design-system/components/progress-stepper
- Our labels are short: New lead (8 characters), Engaged (7), Verified (8), Meeting (7), Offer (5), Joined (6), Onboarded (9). At 12px each is about 60px wide or less, so **all 7 labels fit under circles at about 91px per step**. They do **not** fit at 49px per step (375px). The narrow layout therefore needs a different label strategy.

## 1. Reference table

| # | Product / system | Link | What the indicator looks like | Done / current / future / skipped / error | Label placement and narrow behaviour |
|---|---|---|---|---|---|
| 1 | IBM Carbon Progress Indicator | https://carbondesignsystem.com/components/progress-indicator/usage/ · /style/ | 16px circle icons on a connecting line | Done = checkmark plus blue line. Current = half-filled circle. Not started = outlined circle plus grey line. Also Error, Disabled, Hover, Focus. **No skipped state.** | Label beside or under the icon (16px margin). Optional helper text for "optional" or error. Labels max 16 characters. Vertical recommended "for easier reading". Min step width 128px. |
| 2 | Ant Design Steps | https://ant.design/components/steps | Numbered circles. `type="dot"` gives small dots. `type="inline"` gives a compact row. `size="small"` exists. | `status`: `wait` / `process` / `finish` / `error`. `percent` puts a progress ring on the current step. **No skipped status.** | `titlePlacement` horizontal or vertical (label under the dot). `subTitle` and `description` per item. `responsive`: "Change to vertical direction when screen width smaller than 532px". The Inline type is "suitable for displaying the process and current state of the object in the list content scene". |
| 3 | Mantine Stepper (already in the stack) | https://mantine.dev/core/stepper/ | Numbered circles with lines. `completedIcon` replaces done steps. Per-step `color`, `loading`. | Done = completedIcon (check). Current = active. Future = outlined. Per-step `color` can carry error. **No skipped state.** | `labelPosition="bottom"` puts the label under the circle. `orientation` horizontal or vertical. `allowStepSelect` / `allowNextStepsSelect` gate clicking. Without visible text you must set `aria-label`/`title`. "Wrapping `Stepper.Step` is not supported." |
| 4 | Salesforce Lightning Path (CRM record stage) | https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/visualize-success-with-path-and-kanban · http://spring-21.lightningdesignsystem.com/components/path/ | Chevron segments across the record header | Classes `is-complete`, `is-current`, `is-incomplete`, plus **`is-won` and `is-lost`** for terminal outcomes. | Container breakpoints: small (360-564px) and medium (565-1280px). In narrow containers stage names hide and **only the current stage name shows**. Clicking a stage **previews** it (guidance, key fields) without changing it; "Mark Status as Complete" advances. To go back or skip ahead: "click the step… then click Mark Current Status". |
| 5 | SLDS Progress Indicator | http://v1.lightningdesignsystem.com/components/progress-indicator/ | Small markers on a bar | `is-completed` (success icon), `is-active`, `has-error`. | Horizontal or vertical. Content inline with the marker. |
| 6 | Pipedrive deal detail | https://support.pipedrive.com/en/article/deal-detail-view | Segmented progress bar of pipeline stages in the deal header | Shows the current stage and "the number of days it took to complete each stage". The bar is frozen once the deal is won. | **Precedent for putting time-in-stage or date data on each step.** |
| 7 | HubSpot CrmStageTracker | https://developers.hubspot.com/docs/platform/ui-components/crmstagetracker | "lifecycle or pipeline stage progress bar and a list of properties" on a record | Current stage highlighted. Up to 4 properties shown under the bar (`showProperties`). | Progress plus key fields under it. The same idea as Salesforce Path key fields. |
| 8 | Workable (ATS) | https://help.workable.com/hc/en-us/articles/115012857047 · https://resources.workable.com/hiring-with-workable/how-to-manage-recruiting-pipeline | Profile header button "Move to [next stage]" plus a split menu for any stage | Skipping: choose any stage from the split menu. Disqualified candidates keep "the last stage they reached" under a separate tab. | **Terminal or parked status is separate from stage, and the stage is frozen at the last stage reached.** |
| 9 | Lever (ATS) | https://help.lever.co/hc/en-us/articles/20087373712541 | Opportunity list on the candidate profile | Archived opportunity "will appear crossed off". Archive is segmented by reason, not by stage. | **Precedent for a parked or archived overlay that does not delete stage history.** |
| 10 | Ashby (ATS) | https://docs.ashbyhq.com/interview-plans | Interview stage progress on the profile, with stage timing | Optional stages: name them as optional and skip them where appropriate. | The skip visual is **not documented publicly**, so none is claimed here. |
| 11 | Zoho Recruit | https://aaxonix.com/resources/glossary/candidate-status-zoho-recruit/ · https://help.zoho.com/portal/en/kb/recruit/talent-management/hiring-pipeline/articles/hiring-pipeline-in-zoho-recruit | Pipeline of stages | **Stage and Status are distinct**: status is finer-grained within a stage. | Supports keeping Nurture/Dormant/Archived as a status that is independent of stage. |
| 12 | eBay Playbook Progress stepper | https://playbook.ebay.com/design-system/components/progress-stepper | Check icons plus a line | Incomplete, **Latest** (most recent completed, bold), Completed (check, regular weight), Blocked/Error (outlined error icon). | Primary label of 1-3 words, plus an optional one-line **secondary label "like completion dates"**. 3-7 steps. 104px minimum gap. Vertical preferred on small screens. |
| 13 | Material Design (M1) steppers | https://m1.material.io/components/steppers.html | Numbered circles | Editable or non-editable, optional (labelled), error. | "Avoid using long step names in horizontal steppers". Vertical for narrow screens. **Mobile: text, dots (few steps), or progress bar (many or conditional steps).** |
| 14 | Accessibility (Pluma / Customer.io) | https://pluma.customer.io/components/stepper/accessibility | n/a | Done = checkmark. Error = visually hidden "has errors" text. | Render as `<ol>`/`<li>`. `aria-current="step"` on the current step. Status goes into the accessible name. `aria-disabled` when not interactive. "Avoid relying exclusively on color". |
| 15 | GOV.UK task list | https://design-system.service.gov.uk/components/task-list/ | Status tags | "Statuses use colour and a short descriptor". Completed is plain black text so the tasks that need action stand out. | Text status always accompanies colour. |

**Key gap:** none of Carbon, Ant, Mantine, SLDS, eBay, Material or the other design systems I searched has a documented **"skipped" step state**. See also https://playbook.ebay.com/design-system/components/progress-stepper and https://www.saltdesignsystem.com/salt/components/stepper. Any skipped visual we add is our own extension, so it must carry text (tooltip and screen-reader text), not only a different glyph.

## 2. Design rules drawn from the references

1. **Not colour-only.** Done = check glyph. Current = filled circle plus `aria-current="step"`. Every state is also in the accessible name, for example "Verified, skipped" (Pluma, Carbon, GOV.UK).
2. **Use `<ol>`/`<li>` semantics.** The stepper is display-only in the header. Stage changes stay in an explicit action, the way Salesforce separates selecting a stage from "Mark as Current Stage". That avoids accidental downgrades.
3. **Keep labels to 1-2 words of 16 characters or fewer** (Carbon, eBay). Ours already comply.
4. **A secondary line per step can hold a date** (eBay "completion dates"; Pipedrive days per stage). Show it only on done and current steps so there is room.
5. **Narrow width shows only the current label** (SLDS small region; Material mobile dots; Ant switches to vertical below 532px). A vertical layout is wrong for a header, so use dots plus the current label.
6. **Keep terminal or parked status separate from stage.** Freeze the stepper at the last stage reached and put a status chip beside it (Workable "last stage they reached", Lever crossed-off, SLDS `is-lost`, Zoho Stage vs Status).
7. **Show 7 steps at most** (eBay max 7). S0 "Unclaimed" should therefore not be an 8th circle.

## 3. Design options for S1..S7

Shared state model (derived per step i, current stage c, list of stages actually reached):
- `done`: i < c and reached. Check glyph, filled.
- `skipped`: i < c and never reached (for example S2-S4 when S1 jumps to S5). Hollow circle with a dashed outline and a small "–" or skip glyph, a dashed connector into it, a muted label, tooltip "Skipped (offer sent from New lead)", and screen-reader text "skipped".
- `current`: i = c. Filled accent colour, ring, `aria-current="step"`, bold label, date reached.
- `future`: i > c. Outlined.
- `previously reached` (after a manual downgrade): i > c but reached earlier. Rendered as **future** in the stepper. The downgrade is told by a small "↩ Moved back from Offer on 3 Oct" line or tooltip on the current step, plus the timeline. Repainting future steps as done would contradict the current stage, and no reference does that.
- Parked (Nurture / Dormant / Archived): the stepper is frozen. The current circle turns neutral grey with a pause or archive glyph, and a status chip sits next to the stepper ("Dormant since 12 Sep").
- S0 Unclaimed: no circle. All 7 circles show as future, and an "Unclaimed" chip replaces the date line.

### A. Numbered circles with a label under each (Carbon / Mantine `labelPosition="bottom"`)
- 20-24px circles, 1-7 or a check, label under each, date under the current step and optionally under done steps.
- Pros: fully explicit and scannable. Easiest to build (Mantine Stepper or about 60 lines of custom code). Fits 640px with our short labels (about 91px per step).
- Cons: breaks at 375px (49px per step), so it still needs the B fallback on mobile. Dates under every step at 91px are tight; 12px "03 Oct" is about 40px, which fits only as one short line. Mantine Stepper has no skipped state, so a custom `icon`/`color` per step or a custom component is needed.
- Skipped: the dashed hollow circle described above. Backwards: future steps plus a "moved back" note.

### B. Compact dot stepper, only the current label plus date (Ant `type="dot"`, SLDS small region, Material mobile dots)
- 10-12px dots on a line, and one line of text: "S5 · Offer — since 03 Oct". Other labels appear on hover or focus tooltips.
- Pros: works at any width, down to about 120px. Quiet in a header. Matches the narrow behaviour SLDS uses.
- Cons: the product owner asked for *circles*, and dots read as less informative. You need to hover to learn other stage names. Skipped and done dots are hard to tell apart at 10px (glyphs do not fit), so skipped falls back to a hollow dashed dot plus tooltip.
- Skipped: hollow dashed dot. Backwards: same as the shared model.

### C. Circles grouped into 3 phases: Recruiting (S1-S4) · Offer (S5) · Onboarding (S6-S7)
- Phase captions above groups, with a wider gap between groups. The group header could carry the owner (recruiter vs onboarding staff).
- Pros: mirrors the hand-off between recruiter and onboarding staff. The S1→S5 skip becomes "skipped the rest of Recruiting", which is visually clear. Uses the GOV.UK advice to group with a short heading.
- Cons: more chrome in a header, and 3 headers plus 7 labels is crowded at 640px. Phase names are new vocabulary the product owner has not approved. Same 375px problem as A.
- Skipped: the dashed circles inside the Recruiting group. Backwards: same.

### D. Chevron path (Salesforce Path), for comparison only
- Pros: proven for CRM records. Labels sit inside the segments. The won and lost states are mature.
- Cons: not circles, so it misses the product owner's request. Chevrons need about 90px or more each with text inside, and Salesforce itself collapses to the current name below 565px. It is visually heavy, close to today's segmented bar.

## 4. Recommendation

Use **A at wide widths and B at narrow widths: one component, responsive on the container's width rather than the viewport's** (the SLDS approach).
- Container width ≥ about 520px (the drawer): 22px circles with a check or number, label under each (12px), and a date line **only under the current step** ("since 03 Oct"). Done-step dates go in the tooltip. Skipped steps use the dashed hollow circle, a muted label, and a tooltip.
- Container width < about 520px (phone): 12px dots plus one line "Offer · since 03 Oct". Every dot has a tooltip and an sr-only label.
- Parked status: freeze the stepper, grey out the current circle with a glyph, and add a status chip to the right. S0: no filled circle plus an "Unclaimed" chip.
- Downgrade: future steps stay outlined, with a "Moved back from X on date" note on the current step. History lives in the timeline (Pipedrive and Salesforce keep the stage indicator about *now*).
- Accessibility: `<ol aria-label="Pipeline stage">`. Each `<li>` holds sr-only text "Stage 3 of 7, Verified, skipped". `aria-current="step"` on the current step. Check glyph for done. Do not make the header stepper the way to change stage (keep the explicit action, as in Salesforce "Mark as Current Stage").
- Build: a small custom component is likely cheaper than bending Mantine Stepper, because Mantine has no skipped state, its steps cannot be wrapped (for tooltips), and it has no container-query collapse. Treat that as an engineering judgement, not a cited fact.
