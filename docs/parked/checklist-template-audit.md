# Parked: checklist template edit audit (agentflow-s62y)

Status: **parked 2026-09-23 by Bao.** Code exists, it is not merged, and it is not wrong to revive it later.

- recruit-be PR #400 (draft), branch `agent/agentflow-s62y-template-audit`: migration V102 `checklist_template_history` + audit branch `CHECKLIST_TEMPLATE` + 14th audit column `open_items`
- recruit-fe PR #216 (draft), same branch name: `/audit` rows for template edits

## The problem it solves

The S6→S7 "100% onboarded" gate (`CandidateServiceImpl.blockingMandatoryChecklistItems`, ~line 756) reads templates **live** at gate time. So any template edit re-gates every candidate who already holds that item. Today nobody can see who made such an edit.

Example: 40 LOs are stuck at S6 on "background check". HR turns the template's `mandatory` off. All 40 can move to S7 at once, and nothing records who did it.

## Why it is parked (measured read-only 2026-09-23 09:17Z)

| | staging | production |
|---|---|---|
| templates | 21, 0 mandatory | 21, 0 mandatory |
| checklist_items | 0 | 0 |
| template edits ever | 0 | 0 |
| candidates at S6 | 325 | 65 |

- On production every S5/S6/S7 move is `SYSTEM/MOSO_IMPORT`. The MOSO path never calls `transition()`, so the gate has never run there.
- recruit-fe has no template editor (0 callers of `/admin/checklist/templates`).
- Production was at V095 at the time.

So the ledger would stay empty and "affects N" would always read 0.

**Migration number:** V102 on the branch is NOT reserved. Other branches (e.g. agentflow-7c's `agent/hot-idle-release`) may take V102/V103 in the meantime. On revival, rebase and renumber to the next free version on `origin/master` + unmerged branches, then regenerate `docs/SCHEMA.md`.

## Revive only after all three are true

1. A template editor screen exists (Q12: departments flip mandatory themselves, no deploy).
2. Checklist items are generated for candidates arriving through MOSO, or it is decided that the gate lives in MOSO.
3. Production has been promoted past V101.

## Required fixes before merging (from the two reviews)

1. **The gate depends on more than `mandatory`.** It also depends on `active`, `trigger` (ON_ENTER_S6 / PER_SPONSOR_STATE only) and `code`: items join by `template_code`, a denormalised copy written once by `ChecklistGeneratorImpl`. So renaming the code, deactivating, or changing the trigger also re-gates **now**. The current FE labels those "new items only", which is wrong.
2. **Count with the PRE-edit code.** `countOpenItems` currently runs on the post-rename code and returns 0 (the Repo Owner proved this with a spec-capture test).
3. **Count affected candidates, not items.** Count distinct active, unmerged candidates at S6 (PER_SPONSOR_STATE makes one item per state). Also: a mandatory flip on an inactive or ON_100_ONBOARDED template changes nothing, so say so.
4. **Manager-readable wording.** Use the template title rather than DEPT/CODE and say which direction the gate moved. For example, en: "affects 7 candidates at S6 now — they no longer need this item"; vi: "ảnh hưởng ngay 7 ứng viên đang ở S6 — không còn bắt buộc mục này".
5. **Consider narrowing.** Log only gate-relevant changes (mandatory, active, trigger, code, delete) instead of all 11 fields.
6. **Add the missing tests:** rename+mandatory in one PUT, and an `appliesWhen` re-send that is a no-op.

## Lesson

The design was implemented before two agents reviewed it, and both reviews then found flaws in it. Review the design first, then build.
