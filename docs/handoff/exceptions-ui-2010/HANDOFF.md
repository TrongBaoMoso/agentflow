# Exceptions UI unify + Today-style row buttons (19→20/10/2026)

Away window (Bao, 19/10 ~23:50): end-to-end to STAGING without local review; NOT production.

## Shipped
- recruit-fe PR #547 squash 963a1c1e → master → promote-staging → cd-staging run 39299419974 success.
- Reviews: code-reviewer REQUEST_CHANGES (HIGH: 28px rule hit icon buttons) → fixed 867df785 → APPROVE; typescript-reviewer APPROVE (its 2 MEDIUMs fixed in 867df785). CI green.

## What changed
- Banner "N offers wait on your decision" removed; Pending approval card → /today#decisions (only while offers wait).
- All three Exceptions tables: Hot's LeadWhoCell (avatar, name, NMLS); transfer / already-in-conversation notes only in the Contact deadline tooltip.
- Claimed = full TimeCell; Ready to join: Owner + avatar, Interested since + Waiting merged into one Waiting TimeCell; MOSO Since = TimeCell.
- Reassign (Giao lại) via AssignOwnerPicker; AssignMenu deleted.
- Viewer's own rows: "Yours" chip in Owner, no Remind, no "Your lead", no row tint (all three tables).
- Row buttons on Hot + Exceptions = Today's: compact-sm, teraBtn primary (Claim) / default, no icons; global.css rule skips .lf-btn-icon. CLAUDE.md rule updated.
- Names truncate (tooltip) so claimed-idle actions are one line at 1280.

## Measured on STAGING (recruit.viet18.com, real login)
- Computed button style: Today Not qualified / Exceptions Take back + Remind / Hot Assign: 28px, border rgb(219,214,204), 12.5px. Today Qualified / Log result = Hot Claim (28px, rgb(194,76,2)).
- Text colour: Today "Not qualified" is red (decline-only class `.rec-tt-decline`); Exceptions/Hot default buttons are rgb(74,74,74). Not painted red on purpose — open for Bao.
- Overflow: Exceptions 1280/1440 page 0, tables 0; 375 dark page 0, tables scroll inside (604/406/545). Hot 1440 table 0.
- Manager: no banner, "Yours" rows without Remind, card click → /today. Recruiter: /exceptions shows "You don't have access" (guard), Hot Claim 28px, no Assign.
- Screenshots: scratchpad of session 04ef4954 (stg-exc-1280/1440, stg-exc-375-dark, stg-hot-1280/1440, stg-hot-recruiter).

## Open for Bao
- Production: not pushed (window said staging only). `git log origin/production..origin/staging` before go-live.
- At 1280 the Owner names cut hard ("Manh Ad…"): owner cap 100px <1400px. Widen if Bao wants.
- Take back / Reassign text colour grey vs Today's red Not qualified (see above).
- Local jest: src/shared/utils/__tests__/followUp.test.ts fails on this Mac (ICU "Th 5" vs "Thứ 5"), untouched file, CI green.
