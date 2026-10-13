# HH sign-ups: FE review and implementation plan (recruit-fe)

Read from recruit-fe `origin/master` at 33d5e0f3 (git show / git grep only), with spot checks on recruit-be `origin/master`. No code written, main checkout untouched.

## Facts checked
- **Locales:** the FE ships only `en` and `vi` (`src/messages/{en,vi}`). `src/messages/__tests__/localeParity.test.ts` requires the same keys in both.
- **Headhunter grants:** HEADHUNTER and TEAM_LEAD hold `CANDIDATE_CLAIM` and `ACTIVITY_LOG` (recruit-be `V191__headhunter_roles.sql:28,31`). Claim, the contact buttons and the Hot badge already work for them.
- **Hot badge count:** `GET /inbox/hot/counts` is counted only over leads the caller can see, the same way as `/inbox/hot` (recruit-be `ScopedRouteAllowlist.java:71`). A headhunter's Hot badge already counts only their own pool and is hidden at 0 (`_components/useHotNavCounts.ts:17-18,56`; `recruitNav.tsx:345-352`).
- **Hot subtitle:** already none. `inbox/hot/_components/HotClient/index.tsx:116-120` passes no `description` to `PageHead`. `Hot.crumb` in `en/hot.json` is unused and can be deleted.
- **Prior PRs:** searches for ORIGIN_OWN, "signed up through your page", "New from your page" and headhunter Hot found nothing for this feature. Related: #314 (Today nav badge), #347 (headhunter nav, "Collected by"), #434 (Today empty states).

## (a) Bell
**Where it renders now**
- `src/shared/components/NotificationBell/notificationText.ts`
  - Line 95: an actor of `SYSTEM` becomes `t('someone')`. Lines 149-150: `ASSIGNED_TO_YOU` reads `assigned_to_you`. That is the bug.
  - `groupNotifications` (line 341) groups by the key `kind|actor|minute` (line 351).
  - `groupSentence` (lines 376-386) gives the grouped sentence.
- `NotificationList.tsx:59,108-112` draws the rows. `notificationIcon.tsx` picks the icon by kind only.
- Clicking a row already opens the loan officer (`NotificationBell/index.tsx:141-149`).

**Change**
1. Line 149: if `payload.reason === 'ORIGIN_OWN'`, return `{ sentence: t('origin_signed_up', { lo }), note: null, reason: null }`. Otherwise keep the current hand-off sentence.
2. Line 351: add the reason to the group key, e.g. `${kind}|${actor}|${minute}|${parsePayload(item.payload).reason === 'ORIGIN_OWN' ? 'origin' : ''}`. Today a sign-up (actor `SYSTEM`) and a manager hand-off (a person) already land in different groups. The extra part also keeps sign-ups apart from any other `SYSTEM` assignment.
3. `groupSentence`, under `ASSIGNED_TO_YOU`: if the first item's reason is ORIGIN_OWN, return `t('group_origin_signed_up', { count })`. The key guarantees every item in the group has that reason.
4. The mockup uses a user-plus icon. Change `notificationIcon` to take the item (or kind plus reason) and return `IconUserPlus` for ORIGIN_OWN. Two call sites change: `NotificationList.tsx:69-70,108-109`.
5. Add `'ORIGIN_OWN'` to the list of reasons in the comment above `NotificationPayload` (`src/shared/types/notification.ts:52-54`).

**Copy** (manager hand-off keys unchanged)

| File | Key | Text |
|---|---|---|
| `en/notifications.json` | `origin_signed_up` | `{lo} signed up through your page` |
| `en/notifications.json` | `group_origin_signed_up` | `{count, plural, one {# loan officer} other {# loan officers}} signed up through your page` |
| `vi/notifications.json` | `origin_signed_up` | `{lo} đã đăng ký qua trang của bạn` |
| `vi/notifications.json` | `group_origin_signed_up` | `{count} loan officer đã đăng ký qua trang của bạn` |

The Vietnamese group sentence follows the existing `vi` style for groups ("{count} loan officer", no plural form).

## (b) My work today: "New from your page"
**How it works now** (`today/_components/TodayClient/index.tsx`)
- `groupOf` (lines 299-315) decides each row's group. The `groups` array (lines 327-365) lists them. A comment there requires every row to land in exactly one group.
- Today's "Next up" card is `hero = items[0]` (line 192). Because the BE sorts never-contacted leads first, a new sign-up would usually become that card.
- `ManagerRemindersStrip` renders at line 624 and `HandedToYouSection` at line 629.

**Plan**
1. Add a `'from_page'` group to `groupOf`, checked after `'reminded'` and before `'parked'`/`'unscheduled'`. A row goes there when `item.origin_own` is set. This removes those rows from "No follow-up set" while every row still lands in exactly one group.
2. New file `TodayClient/NewFromPageSection.tsx`, built on `SectionCard` like `HandedToYouSection.tsx`. Columns:
   - Loan officer: initials, name and source chip, as in the Today row.
   - Signed up: the time via `formatFollowUpLabel`, and under it `via {path}`. If `candidate.source_detail.webinar.starts_at` is set, add ` · webinar {date}`; that field already exists on the candidate.
   - Contact due: `item.contact_due_at`.
   - Actions: `ContactButtons` with `onLogged` CALL → `armPending`, the same as Today rows. Reusing it keeps the contact-route and opt-out checks.
3. Render it right before `<HandedToYouSection>`, newest sign-up first.
4. The section and the Next-up card can't both show a new sign-up. While the section has rows, take the card from rows outside it, or hide it (open question 1).
5. The stat cards ("To contact", "Never contacted") still count over `items`, which matches the mockup (10 = 3 + 7). `?f=untouched` keeps the section.

**New `Today` keys**

| Key | en | vi |
|---|---|---|
| `group_from_page` | New from your page | Mới từ trang của bạn |
| `from_page_col_signed_up` | Signed up | Đăng ký |
| `from_page_col_contact_due` | Contact due | Hạn liên hệ |
| `from_page_via` | via {path} | qua {path} |
| `from_page_via_webinar` | via {path} · webinar {date} | qua {path} · webinar {date} |

The mockup's grey line "Signed up through your link · not contacted yet · newest first" is left out, following Bao's rule of no explanation text in headers.

**BE fields (additive):** see the BE fields section. The BE must confirm these rows are always in the due set and never dropped by `today.queue_cap`; the neglected-first sort should already ensure that. It must count the badge with the same rule, so the badge and the section agree.

## (c) Nav badge on My work today
**How it works now** (`_components/recruitNav.tsx`)
- `badgeFor` (lines 345-352) maps each badge to a number.
- The Today badge is `useTodayOwedBadge` (`src/apis/recruit/dashboard.api.ts:52-61`). It reads the cached `/today` with no polling, and only roles that can owe something on Today fetch it (lines 341-344). Headhunters get no Today badge now.
- `useHotNavCounts.ts` reads `/inbox/hot/counts`, which already polls at the BE's interval (`src/apis/recruit/inbox.api.ts:65-87`). Headhunters are already in that audience.

**Plan (no new polling loop)**
1. Add `from_my_page: number | null` to `HotCounts` (`src/shared/types/hot.ts:38`). Pass it through as `HotNavCounts.fromMyPage` using the existing `asCount` (0 means no badge). In the fallback path, use 0.
2. In `recruitNav.tsx`, `today_owed` becomes `todayOwed + hotCounts.fromMyPage`.
3. I chose the counts endpoint over `/today` because `/today` refreshes only on window focus or after an action. A sign-up arriving while the headhunter is on Pipeline would not show for a while.
4. The counts query key sits under `['recruit']`, so logging a contact (which invalidates `['recruit']`) clears the badge right away.
5. Hot leads badge: no change. It is already hidden at 0 and counted only over the headhunter's own pool.

## (d) Hot leads (`/inbox/hot`)
**Empty state for every role:** in `HotClient/index.tsx:195-202`, swap `IconMoodEmpty` for `IconInbox`. That is the Tabler tray icon, already used at `TodayClient/index.tsx:10`. Rewrite `Hot.empty_title` and `Hot.empty_body`:
- en: "No leads right now" / "New leads show up here as they come in."
- vi: "Hiện chưa có lead nào" / "Lead mới sẽ hiện ở đây khi có."

**How the FE knows the user is headhunter-scoped:** `useRowScope()` (`src/hooks/useRowScope.ts`), built on `rowScopeFrom` (`src/shared/utils/rowScope.ts:45`). The roles come from `/me/nav-context`.
- Use `const hh = scoped === true && rolesKnown`. While the roles load, `scoped` is already true, so require `rolesKnown`. Otherwise recruiters would briefly see the headhunter layout.
- That is the same gate Pipeline uses for `scoped_tag` (`PipelineClient/index.tsx:384`).

**Changes for `hh`**
- **Stat cards:** one card, `stat_back_in_pool` = `payload.total`, replacing Waiting and Overdue at lines 130-144. Recruiters and managers keep their cards.
- **Columns:** Loan officer, Source, `col_why_back`, then the action, per the mockup. "Waiting" and "First-touch due" drop out.
- **HotRow:** give `HotRow.tsx` a prop `variant: 'default' | 'pool'`. In `pool` it draws the "Why it is back" cell:
  - `IDLE_RELEASE` or `PROGRAM_RELEASE` → `back_auto`, with `back_auto_detail { when }` under it.
  - `RELEASE` → `back_by { name }`, with `back_at { when }` under it. Resolve the name with `usePersonNames`; it already works for row-scoped users through the user-svc lookup.
- **Button label:** `take_back` instead of `claim` (lines 91-94). The claim call is unchanged.

**New `Hot` keys**

| Key | en | vi |
|---|---|---|
| `stat_back_in_pool` | Back in the pool | Trả về kho |
| `col_why_back` | Why it is back | Vì sao trả về |
| `back_auto` | Returned automatically | Tự động trả về |
| `back_auto_detail` | No contact before the deadline · {when} | Chưa liên hệ trước hạn · {when} |
| `back_by` | Returned by {name} | {name} đã trả về |
| `back_at` | {when} | {when} |
| `take_back` | Take back | Nhận lại |

## (e) Pipeline default for scoped users
**How it works now:** `pipeline/_hooks/usePipelineFilterUrl.ts` keeps the URL as the only source of truth. `PipelineClient/index.tsx:193-203` already applies a personal saved filter once per visit, and only when the URL has none of the `PIPELINE_URL_KEYS`.

**Plan**
1. Add a second one-time effect next to that one, sharing the same `autoApplied` ref.
2. Run it when `scoped === true && rolesKnown && programMember`, the URL has no `PIPELINE_URL_KEYS`, and the user has no default saved filter.
3. It calls `setFilter({ stage: 'S1', collected: 'me' })`. "New lead" is `stage_S1` in both v1 and v2 (`en/today.json:11,19`). `setFilter` writes to the URL, so the address bar stays the truth.
4. A deep link, a saved preset, or the user picking "All" later in the same visit is never overridden.

**To confirm with the BE:** an ORIGIN_OWN lead sits at S1 on arrival. If it stays at S0, the default tab would hide it.

## (f) Tests (jest/RTL, same setup as the existing files)
- **`src/shared/components/NotificationBell/__tests__/notificationText.test.ts`**
  - ORIGIN_OWN single → `origin_signed_up`.
  - A manager `ASSIGNED_TO_YOU` is unchanged.
  - Within one minute, two ORIGIN_OWN plus two manager items give two groups with different sentences.
  - A `SYSTEM` assignment without ORIGIN_OWN does not merge with sign-ups.
  - Icon check.
- **`NotificationBell/__tests__/NotificationBell.test.tsx`:** the "someone" case at line 377 still holds for non-ORIGIN_OWN.
- **`today/_components/TodayClient/__tests__/TodayClient.groups.test.tsx`**
  - A row with `origin_own` appears only in the new section, never in "No follow-up set".
  - Section order: reminders strip → new section → handed-to-you.
  - Newest sign-up first.
  - The Next-up card does not repeat a section row.
  - Every row still lands in exactly one group.
- **New `TodayClient/__tests__/NewFromPageSection.test.tsx`:** the "via {path} · webinar {date}" line; no webinar suffix when `source_detail` is null.
- **`_components/__tests__/recruitNav.badge.test.tsx`:** the Today badge = owed + `from_my_page`; no badge at 0; a headhunter needs no `/today` fetch for it; a BE without the field shows no badge.
- **New `inbox/hot/_components/HotClient/__tests__/HotClient.headhunter.test.tsx`**
  - Mock `useRowScope` the way `PipelineClient.collected.test.tsx:40` does.
  - Scoped + roles known → one "Back in the pool" card, a "Why it is back" cell per reason, "Take back".
  - Scoped while roles load → the recruiter layout.
  - Empty → `IconInbox` and the new copy for every role.
- **`HotClient/__tests__/HotRow.test.tsx`:** the `pool` variant.
- **`pipeline/_components/PipelineClient/__tests__/PipelineClient.collected.test.tsx`**
  - Scoped, empty URL → `router.replace` with `stage=S1&collected=me`.
  - `?stage=S3` is left alone; a default saved filter wins; a recruiter gets nothing; nothing happens while roles load.
- **`src/messages/__tests__/copyTruth.test.ts`:** pin that `origin_signed_up` never contains "assigned".
- **Run with:** `npx jest --runTestsByPath "src/app/[locale]/(private)/..."` (bracket paths match nothing as a pattern), and grep the output for `Test Suites:` too. Take a token first: `tok=$(~/.claude/bin/ram-gate acquire jest <label> --wait 900)`, then `~/.claude/bin/ram-gate release $tok`.

## BE fields the FE needs (all additive)

| Endpoint | Field | Shape | When set |
|---|---|---|---|
| `GET /today`, each `TodayItem` | `origin_own` | `{ signed_up_at: string /* ISO, the ORIGIN_OWN ledger time */, page_path: string /* "/recruit/bao-trinhhh" or "/join/bao-trinhhh" */ } \| null` | Non-null only when the latest ledger row is ORIGIN_OWN to the viewer and the lead was never contacted (call with a result, text or email). Such rows must be in the due set and never cut by `today.queue_cap`. |
| `GET /inbox/hot/counts` | `from_my_page` | `number \| null` | The caller's own count, computed with the same rule as `origin_own`. |
| `GET /inbox/hot`, each `HotItem` (scoped callers) | `returned` | `{ reason: 'RELEASE' \| 'IDLE_RELEASE' \| 'PROGRAM_RELEASE' \| string, actor_id: string \| null, at: string /* ISO */ } \| null` | Set when the lead is back in the pool because of a release; `null` otherwise (see open question 3). |

To confirm: an ORIGIN_OWN lead is at stage S1 on arrival.

## Open questions
1. **Next-up card:** while "New from your page" has rows, hide the card (the mockup shows none) or fill it from the other rows? I recommend hiding it, with the first section row's primary "Call now" taking its place.
2. **Row actions:** the mockup shows Call + Text only. Reusing `ContactButtons variant="icons"` also shows Email (and Email counts as contact). I recommend reusing it rather than adding a new button variant.
3. **Rows not returned by a release:** a headhunter's Hot can hold a lead that was never theirs, because auto-own skipped it (member cap, flag off, link not confirmed). "Why it is back" and "Take back" would be untrue there. I recommend the BE send `returned: null`, and the FE then shows the sign-up time and the normal "Claim".
4. **TEAM_LEAD who also holds RECRUITER:** that user is not row-scoped but can still get ORIGIN_OWN rows. They see the Today section and badge (driven by the data) but not the headhunter Hot layout or the Pipeline default. Is that intended?
5. **Selecting rows on Today:** "New from your page" rows have no tick box. That only matters for users who can hand off; row-scoped users already can't.

## Verdict: agree with changes
1. Add the reason to the bell's group key, not only to the sentence.
2. Put the Today badge on `/inbox/hot/counts.from_my_page` instead of a new or `/today`-based read.
3. Gate the headhunter Hot layout and the Pipeline default on `scoped && rolesKnown`, not `scoped` alone.
4. Define what a Hot row shows when it was not returned by a release (open question 3).
5. Drop the "no subtitle" item; it is already true on master.
