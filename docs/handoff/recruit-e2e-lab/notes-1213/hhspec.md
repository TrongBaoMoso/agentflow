# Headhunter sign-ups: bell copy, "New from your page", Hot leads (Bao approved 12/10)

Approved mockup (4 artboards): https://claude.ai/artifact/PYFvz3qw4BK4oB7iZyg5CZ
(Main = My work today; Bell; HotEmpty; HotRows). Read it with the Artifact tool, action read, path project/<file>.

Facts (verified on recruit-be / recruit-fe origin/master and the staging DB, 12/10):
- A lead that arrives through an LO Recruiter Program member's own /join or /recruit page is owned on arrival
  (D196): ledger reason ORIGIN_OWN, actor SYSTEM. OwnershipNotices emits ASSIGNED_TO_YOU with actor SYSTEM and
  payload.reason = "ORIGIN_OWN".
- recruit-fe notifications.json renders "assigned_to_you": "{manager} assigned {lo} to you", so with no actor
  name the bell says "Someone assigned Test Test to you" (wrong).
- Today shows these leads only inside "No follow-up set" with "Contact due …".
- HEADHUNTER row scope: READ = owned or collected by their key; Hot leads = unowned AND readable. So a headhunter's
  Hot leads only fills when one of their own leads is back in the pool (released by them, by a manager, by the
  idle auto-release), or when auto-own skipped it (member cap, flag off, link not confirmed, lead already worked).

Changes:
1. BELL (FE; BE only if needed). When payload.reason == ORIGIN_OWN:
   - single: "{lo} signed up through your page"
   - grouped: "{count, plural, one {# loan officer} other {# loan officers}} signed up through your page"
   All locales the FE ships. Grouping must not merge ORIGIN_OWN rows with manager-assigned ones (different text).
   Manager hand-off copy is unchanged.
2. MY WORK TODAY: a new top group "New from your page" (above "Handed to you recently"): leads I own whose latest
   ledger row is ORIGIN_OWN to me and that were never contacted (same "contact" definition as the idle-release /
   contact-due rules: a call with a logged result, a text or an email). Newest sign-up first. Columns: loan officer,
   Signed up (when + which page, e.g. "via /recruit/bao-trinhhh"), Contact due, Call/Text actions.
   Those rows are NOT repeated in "No follow-up set". Shown to anyone who has such rows (in practice HEADHUNTER /
   TEAM_LEAD); a role with none sees no group.
   Nav badge on "My work today" = that group's count; no badge at 0. Use the existing nav count polling pattern
   (useHotNavCounts or similar), no new polling loop if one can be reused.
3. HOT LEADS:
   - No subtitle.
   - Empty state for EVERY role (not per role): title "No leads right now", body "New leads show up here as they
     come in.", an inbox/tray icon (not the sad face).
   - For a headhunter-scoped user: stat cards = one card "Back in the pool" (count). Recruiters/managers keep their
     current cards.
   - For a headhunter-scoped user with rows: a column "Why it is back": "Returned automatically" (IDLE_RELEASE /
     PROGRAM_RELEASE) with "No contact before the deadline · <time>", or "Returned by <name>" (RELEASE, actor name)
     with the time; the claim button reads "Take back". Needs the BE to expose the latest ledger reason / actor /
     time on hot rows for such users (additive fields only).
   - Nav badge on Hot leads only when count > 0 (check current behaviour for headhunters).
4. PIPELINE for a headhunter-scoped user: default "Collected by me" ON and the "New lead" tab, only when the URL
   carries no explicit choice (URL stays the source of truth).

Out of scope: the idle-release stage filter (S6) finding — separate, not approved yet.

---
## v2: decisions after the design reviews (BE: hh-review-be in the lead's notes; FE: scratchpad/hh-review-fe.md). Binding.
Both reviewers: AGREE WITH CHANGES. The lead settles their open points as follows:

BE (recruit-be)
- Today group: a new NewFromPageTodayReader with the native SQL the BE reviewer proposed. It starts from the ledger: latest row is ORIGIN_OWN to the actor; owner = actor; ACTIVE; not merged; working stages.
  - "Never contacted" = HotIdleReleaseStore#humanOutboundSince with HotIdleReleasePolicy#contactRule() (D138), applied since the ORIGIN_OWN row.
  - Do NOT use isOnClock or idleDeadlines for membership. Use them only for the Contact due value, which is null when off the clock.
  - signed_up_at = coalesce(last_hand_raised_at, created_date).
  - Add the ids to leadIds in DashboardServiceImpl#today, right behind pins and resurfaced rows, deduped against pins. A manager-reminded sign-up stays in the new group and carries its remind chip.
  - Response: TodayItemResponse.from_your_page {signed_up_at, owned_at, page} (page = origin_type mapped to "join" | "recruit" | null) plus TodayQueueResponse.new_from_page_total. Fail soft through degrade().
- Badge: GET /inbox/hot/counts gains `new_from_your_page` (Long, null on failure). It is an isolated field, computed for ANY caller, with the same SQL as a COUNT.
- Hot for scoped callers only (rowScopeService.isScoped): HotItemResponse gains nullable `back_in_pool`:
  - fields: {reason: RELEASE | IDLE_RELEASE | PROGRAM_RELEASE | null, at, by_name (human RELEASE by someone other than the viewer only), by_you, was_yours};
  - one batched DISTINCT ON query per page;
  - NEVER ship note, note_reason, from_owner or actor ids;
  - the releaser's display name is resolved server-side by a small component extracted from UserNamesReader#grantEmails + UserSummary.readableNameOf;
  - unscoped callers get null, so their payload is unchanged.
- Bell: no BE change. Pin payload.reason = "ORIGIN_OWN" in HeadhunterAutoOwnIT.
- No migration, no new setting. New DECISIONS.md entry (next free D number) covering the group definition, the count source, back_in_pool and the releaser-name disclosure (beyond D204, within D195).
- Tests: every unit test and IT in the BE review list. The NewFromPageTodayIT checks must hold on /today AND /hot/counts. Include a negative control and fixtures inserted in the opposite order to the asserted order.

FE (recruit-fe)
- Bell:
  - ORIGIN_OWN copy: en "{lo} signed up through your page" / "{count, plural, one {# loan officer} other {# loan officers}} signed up through your page"; vi "{lo} đã đăng ký qua trang của bạn" / "{count} loan officer đã đăng ký qua trang của bạn".
  - Put the reason into the group key.
  - IconUserPlus for ORIGIN_OWN.
- Today: the "New from your page" section at the top, above "Handed to you recently". groupOf checks from_your_page first, so these rows are never repeated in "No follow-up set".
  - Columns: loan officer + source badge; Signed up (relative time + "via your /recruit page" / "via your /join page"; no slug and no webinar suffix, since the slug is not stored); Contact due (a dash when null); reuse ContactButtons variant="icons" (Email included).
  - While the section has rows, hide the Next up card. The first row's primary button reads "Call now".
- Nav: My work today badge = today_owed + hotCounts.new_from_your_page (0 = no badge), from the existing /inbox/hot/counts poll; no new loop.
- Hot leads:
  - Generic empty state for EVERY role: "No leads right now" / "New leads show up here as they come in.", with a tray/inbox icon instead of the sad face; vi translations.
  - For scoped && rolesKnown: a single stat card "Back in the pool" and a column "Why it is back":
    - IDLE_RELEASE: "Returned automatically" + "No contact before the deadline · <time>";
    - RELEASE: "Returned by <by_name>", or "You returned it" when by_you, + time;
    - PROGRAM_RELEASE: "Returned when the member left the program" + time;
    - null: "Not assigned yet".
  - Button: "Take back" when was_yours, else the normal "Claim".
  - Unscoped roles look exactly as today, apart from the generic empty state.
- Pipeline: for scoped && rolesKnown, default to Collected by me ON + tab "New lead", only when the URL has no explicit choice.
- Tests: jest/RTL per the FE review. Run --runTestsByPath for bracket paths. Locale parity en/vi.
