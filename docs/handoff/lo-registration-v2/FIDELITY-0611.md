# /join v2: fidelity to the mockup (06/11)

Source of truth: `mockup/join-flow.html` (v20). Both repos (lf-homepage, lo-homepage), branch `fix/join-v2-fidelity`.
Method: each state of the mockup and of the real page (local `next dev`, writes mocked, nothing saved) captured at 1280
and 390 wide; visible text diffed line by line; computed styles of key elements compared with the mockup's. Screenshots
(mockup | before | after) are under `shots-0611/fidelity/{lf,lo}/` (not committed).

## Global (every step)

| # | Before | After |
|---|---|---|
| G1 | Whole flow in Montserrat | Body Lato, headings/buttons Montserrat (mockup pairing), via `join/layout.tsx` |
| G2 | Base 16px labels, 42-50px inputs, 10px radius, orange focus ring | 12px bold labels, 36px inputs, 6px radius, black focus outline, 14px text (mockup `.f`, `input.in`) |
| G3 | "Required" chip colours/size of the old form | Mockup `.req` (11px, tint bg; white inside tinted blocks) |
| G4 | Text on orange was black (step numbers, pressed pills, pressed windows, selected day, check circle, section numbers) | White, as in the mockup. Buttons stay black on orange, as in the mockup |
| G5 | Content 1120px wide | 1088px (mockup frame 1120 minus its 16px padding) |
| G6 | Grey text `#6b6b6b` | `#999` as in the mockup (done side items, off days, weekday letters). Low contrast, it is the mockup's value |
| G7 | Back/Continue 44px, Mantine look | `.btn` / `.btn2` exact: Montserrat 14px, 8px radius, 11px/24px and 10px/20px padding |
| G8 | Selects/multi-selects with Mantine up/down icon; chips 32px tall with an X icon | Native-style chevron; chips 22px, `×` glyph, tint-2 colours |
| G9 | Tick boxes Mantine 20px | 16px, 12px label, orange |
| G10 | "+ Add ..." as plain links, X icon buttons, grey chips | Dashed orange `.add` buttons, 36px `×` buttons, `.ex` chips |

## Step 1 `/join`

1. Hero heading/eyebrow/lede were dark, now white; heading no longer forced to two lines (`max-width: 28ch` removed).
2. Hero copy casing: "built for loan officers", "loan officers on the platform" (mockup casing). Numbers stay live.
3. Envelope and phone icons removed from Email / Mobile phone.
4. The Loan Officer search drops its chevron (plain input); empty-result text is the mockup's "No Loan Officer matches that search."
5. After picking, the mockup's person card (avatar, name, NMLS and email, clear button) replaces the Mantine select.
6. Consent links no longer orange: same colour as the text, underlined (kept as links on purpose, see below).
7. Side list, stepper, box, paddings as G2/G5.

## Step 2 `/join/license` (TX, CA DFPI, CA DRE, IN, SC)

1. The "Join Loan Factory" stats strip is gone (the mockup draws no band on Steps 2 and 3).
2. Quick check bullets are back (`list-style` was reset).
3. Employment cards: titles "Independent (1099)" / "Employee (W-2)", subtitles "Keep 100% of your commission. You handle your own taxes." / "90% of the commission. Payroll taxes are withheld."; radio dot removed; mockup card styling. New keys `type_1099_desc`, `type_w2_desc` (5 locales).
4. Website block in the grey `.webcard` box (question, URL rows, approval tick). New copy: "Do you have a website or landing page that promotes mortgages?", "Website URL", "+ Add another website", "I'll get Loan Factory's approval before launching or changing a mortgage website."; `×` on every row.
5. California: tinted block with "California license type" + DFPI MLO / DRE-endorsed MLO; the existing localized legal notices are kept (DFPI / DRE notices, the DRE-real-estate yes/no notices, the practise-real-estate notices with the Agent Licensing link, the salesperson-endorsement notice), as small text inside the block; questions "Do you also have a California DRE real estate license?" / "Do you want to practice real estate with Loan Factory too?"; "DRE license number" + "DRE license type" as a Salesperson / Broker select.
6. Indiana: "Indiana license type", "SOS licensed" / "Not SOS licensed".
7. South Carolina: title "South Carolina sponsorship" and "We sponsor South Carolina only under specific conditions. Do you confirm?" (names the states actually picked: SC, AR, NE).
8. Forced employment line, hint under cards, Back / Continue as mockup.

## Step 3 `/join/book`

1. Stats strip removed. 2. "What happens next" list removed (mockup has none here).
3. The two path cards: icon on the left, title and subtitle on the right (Mantine's wrapper spans had broken the grid).
4. Window labels "9–11 AM", "11 AM–1 PM", "1–3 PM", "3–5 PM" (shared AM/PM dropped, plain spaces); heading "Wednesday, Nov 4"; chips "Wed, Nov 4 · 11 AM–1 PM".
5. Pressed window / any-time / selected day white text; icon white on pressed card.

## Booked `/join/booked`

1. Window labels as above. 2. "Watch more on our YouTube channel →" is the `.btn2` look. 3. Check circle white.

## Application `/join/application` (after call / ready)

1. "Apt / Unit" and "ZIP" labels; zip icon and street clear button removed.
2. "Our team will confirm it before your agreement." under the cards on the ready path (was the Step 2 hint).
3. `×` buttons, dashed add buttons, `.ex` chips, grey section numbers fixed to white-on-orange.
4. Tech literacy tick shows its "Required" chip.
5. "Compensation Policy" link in the mockup's dark orange.

## Review `/join/review`

1. Side list removed. 2. Labels "Mobile", "Licensed states", "Languages", "Tech literacy". 3. "California (DRE-endorsed)" in States to sponsor. 4. "Edit" is a 12px underlined orange-ink link.

## Waiting `/join/waiting`

1. Side list removed. 2. Stepper now on step 6 (Review done, Pay & sign current). 3. Tiles carry the envelope / question-mark circles; hourglass circle in tint colours.

## Copy removed from the old Step 2 / Step 1 screens, and whether it was legal

| Removed | Legal / compliance? |
|---|---|
| "Join Loan Factory" stats strip on Steps 2-3 | No (marketing) |
| "California" / "Indiana" block headings | No (the tinted block and its label replace them) |
| "California - Licensed type", "Indiana - Licensed type" label wording | No (replaced by the mockup's labels) |
| "Do you confirm this sponsorship?" (SC) | No: replaced by the "<state> sponsorship" title; the "only under specific conditions. Do you confirm?" sentence and Confirm / Cancel stay |
| Old website-approval wording "I agree to obtain Loan Factory's approval before creating any new website..." | Replaced by the mockup's approval tick (same Required tick, same stored value) |
| Round check mark on the employment cards, up/down icons, envelope/phone/zip icons, street clear button, trash icon | No (UI only) |

Nothing legal or compliance related remains removed: the California notices were restored (06/11, review follow-up).

## lo-homepage

Same changes (same files; CSS identical). The site-owner "Referred by" card on Step 1 already matched the mockup's "A Loan Officer's own page" variant.

## Not identical, and why

- **Data, not design:** live hero numbers, citizenship labels (real list: "US Citizen", not the mockup's "U.S. citizen"), language/state/platform option lists, selected calendar days, the review's "Set by our team / This is wrong" row (only appears when the team set the name).
- **Consent links** stay underlined links (legal text must stay clickable); mockup shows plain text.
- **Select arrow** is drawn in CSS to look like the native one, not the browser's own.
- **Mobile outer margin:** at 390 the mockup's frame adds 16px outside the 16px inside it; the real page has no frame, so the gutter is 16px.
- Pay / sign / NMLS screens (mockup s6-s9) are the existing steps and were not part of this pass.
