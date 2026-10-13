# HH sign-ups spec, recruit-be review: AGREE WITH CHANGES
Checked read-only against origin/master 75ace547. No migration, no new setting. Spec v2 in hhspec.md is binding where it differs.

## (a) TODAY "New from your page"
- New reader `dashboard/NewFromPageTodayReader`. One native SQL query that starts from the ledger, so it rides `candidate_owner_history_handed_to_idx` (to_owner, occurred_at DESC):
  ```
  FROM candidate_owner_history h JOIN candidates c ON c.id=h.candidate_id
  WHERE h.to_owner=:actor AND h.reason='ORIGIN_OWN' AND c.owner_id=:actor AND c.status='ACTIVE' AND c.merged_into_id IS NULL AND c.stage IN (:WORKING_STAGES)
    AND NOT EXISTS (newer ledger row: occurred_at > h.occurred_at OR (= AND id > h.id))   -- same tie-break as LATEST_LEDGER_ROW
    AND NOT <HotIdleReleaseStore.humanOutboundSince(policy.contactRule(), "h.occurred_at")>
  ORDER BY signed_up_at DESC, c.id LIMIT :cap
  ```
- Contact definition: reuse `HotIdleReleaseStore#humanOutboundSince` (Store.java:79) with `HotIdleReleasePolicy#contactRule()`. This is the D138 whitelist that the clock, Today and the tick already use.
  - A call counts only once its result is logged (NO_ANSWER included).
  - A text or email counts when omni sent it.
  - A device click counts only under DEVICE_CLICKS_COUNT, which is forced on in prod while the mirror is down.
- Do NOT reuse `isOnClock` / `idleDeadlines` for membership. They also require HOT and an ORIGIN_OWN at or after `hot.claim_sla_starts_at`, so a non-HOT or older auto-owned lead would silently drop out. Use them only for the Contact due column, which is null when the lead is off the clock.
- `signed_up_at = coalesce(last_hand_raised_at, created_date)`. Do NOT use the ledger time: a D197 catch-up writes ORIGIN_OWN up to 30 days after the sign-up.
- How rows leave "No follow-up set": in `DashboardServiceImpl#today` (Dash:140), add these ids to `leadIds` (:232) right behind the pins and resurfaced rows, in the same pattern. That gives three things for free:
  - they are excluded from `rankDue` (:241);
  - they are kept by `scheduledAheadLive` (:326) with pinned=true semantics, so a follow-up booked next week does not hide an uncontacted lead;
  - they come out of the `hiddenIds` waiting-on-LO hide (:168), like pins.
  - Dedupe against pins: an item can carry both manager_remind and from_your_page.
- Response:
  - `TodayItemResponse.from_your_page` {signed_up_at, owned_at, page}, null on other rows;
  - `TodayQueueResponse.new_from_page_total` holds the real count, and `truncated` also lights when the cap cut this group.
  - The FE's groupOf checks from_your_page first.

## (b) BADGE
- Extend `GET /inbox/hot/counts` additively with `new_from_your_page` (Long, null on failure).
  - Compute it in its own `isolated()` field in `HotCountsServiceImpl#counts` (:54), with the same SQL as a COUNT(*).
  - Compute it for any caller, not only scoped ones: HEADHUNTER + RECRUITER is unscoped but can still be auto-owned.
- The FE already polls this for HEADHUNTER/TEAM_LEAD (NAV_AUDIENCE.HOT includes PROGRAM_GROUP, and they hold CANDIDATE_CLAIM).
- Do not use useTodayOwedBadge: it would load all of /today on every page and only refresh on focus.
- Cost: one index range on (to_owner, reason) per poll, plus a NOT EXISTS probe on candidate_idx and an activities_candidate_idx probe per hit.
  - Run EXPLAIN on staging.
  - Only if needed, add a partial index on (to_owner) WHERE reason='ORIGIN_OWN'.
- FE badge = today_owed + new_from_your_page.

## (c) HOT for scoped users
- In `InboxServiceImpl#hot` (Inbox:226), only when `rowScopeService.isScoped(actor)`, run one batched query for the page:
  `SELECT DISTINCT ON (candidate_id) reason, actor_id, from_owner, occurred_at ... ORDER BY candidate_id, occurred_at DESC, id DESC` (served by candidate_owner_history_candidate_idx).
- Add a nullable `back_in_pool` to HotItemResponse via a with-er, not a positional component. Fields:
  - `reason`: RELEASE | IDLE_RELEASE | PROGRAM_RELEASE | null (anything else, including never owned);
  - `at`;
  - `by_name`: only for RELEASE by a human actor who is not the viewer;
  - `by_you`;
  - `was_yours`: from_owner == viewer.
- NEVER ship note or note_reason (free text, D195), from_owner, or actor ids. No owner key: origin_owner_key is @JsonIgnore, and webhook data is untouched.
- Name resolution: `GET /users/names` cannot resolve a releasing manager. D204 only answers for owners of readable rows, and the lead is now unowned.
  - So the BE resolves it: extract `UserNamesReader#grantEmails` (:129) plus `UserSummary.readableNameOf` into a small unscoped component.
  - This is a NEW disclosure beyond D204 (D195 accepts display names), so it needs its own DECISIONS line.
- Recruiters and managers get back_in_pool=null; their payload is unchanged.

## (d) BELL
No BE change. OwnershipNotices:61 already writes ASSIGNED_TO_YOU with payload.reason="ORIGIN_OWN", and NotificationItemResponse ships the payload as JsonNode. Grouping is FE-only. Pin the contract in HeadhunterAutoOwnIT by asserting payload.reason.

## (e) No migration, no new setting
Add a new D2xx entry to DECISIONS.md covering the group definition, the count source, back_in_pool and the name disclosure.

## Spec conflicts (settled in spec v2)
1. The slug is not stored, so "via /recruit/bao-trinhhh" is impossible. Use origin_type: "via your /recruit page" or "via your /join page". Drop the webinar suffix.
2. PROGRAM_RELEASE means "the member left the program". It gets its own subtitle.
3. "Take back" applies only when was_yours. A never-owned row has reason=null, shown as "Not assigned yet".
4. With pipeline.v2_stages OFF, the Hot stock arm is S0 only. A released ORIGIN_OWN lead is S1, so it stays in Hot only within hot.hand_raise_window_days (3) and then goes to Cold. That is a known limitation.
5. Contact due can be null; the FE shows a dash.
6. A bare Call click does not clear the group or the badge; only a logged result does.
7. A grouped bell line appears only when rows land in the same minute. That will be rare.

## Tests
- Unit:
  - DashboardServiceImplTest:
    - new-from-page rows lead and are never withheld;
    - no duplicate with a pin;
    - scheduled_later and truncated stay correct;
    - the reader fails soft through degrade().
  - HotCountsServiceImplTest: the field is isolated, null on throw.
  - InboxServiceImpl back_in_pool mapping: every reason; by_name only for a human RELEASE; null for unscoped callers.
  - HotItemResponseJsonTest: no note, actor_id or from_owner keys.
- New IT `NewFromPageTodayIT` (real Postgres, patterned on TodayRolesIT and HeadhunterAutoOwnIT). Each case must hold on /today AND /hot/counts:
  - auto-owned → in the group, count 1;
  - logged call result → out of both;
  - bare call click → stays;
  - SMS click → out under DEVICE_CLICKS_COUNT, stays under MIRROR_ONLY (negative control);
  - newer ledger row (release, then CLAIM back) → out;
  - follow-up next week → still shown;
  - archived or merged → out;
  - recruiter with CLAIM rows only → 0;
  - ordering newest sign-up first, with fixtures inserted in the opposite order;
  - cap truncation.
- New IT `HotBackInPoolIT` (patterned on HeadhunterScopedReadsIT):
  - IDLE_RELEASE of own lead → was_yours true, by_name null;
  - manager RELEASE with the note "secret" → by_name is the manager's readable name, the body has no "secret" and no actor id key;
  - recruiter claim then release of a collected lead → was_yours false;
  - never-owned collected lead → reason null;
  - TEAM_LEAD sees a member's PROGRAM_RELEASE;
  - unscoped recruiter → back_in_pool null.
- No new routes, so ScopedRouteAllowlist, the snapshot and the route sweep stay unchanged.
- Accepted race: the badge and the Today group are separate reads, so they can differ for one poll.
