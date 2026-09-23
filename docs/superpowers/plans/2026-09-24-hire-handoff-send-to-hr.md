# Send to HR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Onboarding user records the 1-1 outcome (loan-officer type + employment type) on a Joined candidate and presses **Send to HR**, which works only when everything recruit can know is filled; the `RECRUIT_HIRED` payload carries the outcome.

**Architecture:** recruit-be gains two candidate columns, a readiness service and `GET/POST /api/v1/candidates/{id}/hr-handoff` guarded by a new `CANDIDATE_HR_HANDOFF` permission; the existing `HrHandoffEnqueuer` (atomic `handed_off_at` CAS + outbox + relay) is reused but now returns a result, and `transition()` stops enqueuing. recruit-fe adds two selects on the Licensing tab and a Send to HR block in the candidate drawer. A one-off, gated backfill re-imports pre-#363 rows from MOSO.

**Tech Stack:** Java 21 / Spring Boot / tera-core / Flyway / JUnit 5 + Mockito + AssertJ (recruit-be); Next.js / React / Mantine / react-hook-form + zod / next-intl / jest + Testing Library (recruit-fe); Python 3 (backfill script).

**Spec:** `docs/superpowers/specs/2026-09-24-hire-handoff-completeness-design.md` (rev 3.1, approved by Bao 2026-09-24).

## Global Constraints

- Branches: recruit-be and recruit-fe each cut from **`origin/master`**, one PR each into `master` (merge = staging deploy). Branch names `agent/agentflow-dkt0-send-to-hr` in both repos. Never push to `production`.
- Everything stays **dark**: the button is hidden while `recruit.features.hr-handoff-publish` is `false` (default). No config/values change in this plan.
- Merge only with CI `Tests` green **and** two independent reviewers approving (house rule).
- Values, verbatim: `lo_type` ∈ `CORPORATE`, `OUTSIDE`, `INDEPENDENT`, `MORTGAGE_ADVISOR`; `employment_type` ∈ `full_time`, `part_time`, `contract`, `outside_sales_person`. Pair rule: `INDEPENDENT` ⟺ `contract`, both directions.
- Readiness keys, verbatim: `stage:not_joined`, `status:archived`, `offer:not_signed_and_paid`, `first_name`, `last_name`, `email`, `nmls_id`, `phone:missing`, `phone:invalid`, `mailing_address:missing`, `lo_type`, `employment_type`, `already_sent`.
- Next Flyway version is **V104** (highest on `origin/master` 043f6fb is V103). Re-check before committing; if taken, use the next free number everywhere in Task 1.
- Adding a migration **requires regenerating `docs/SCHEMA.md`** (`SchemaDocFreshnessTest` fails CI otherwise) — needs a running Postgres (Docker).
- recruit-fe: every new string in **both** `src/messages/en/*.json` and `src/messages/vi/*.json` (`localeParity` test).
- Production data is only ever **read** in this plan, except Task 8's import, which runs only after Bao approves the target list in writing.
- Do not run two Gradle builds in the same directory at once.

## Review Focus

1. **A candidate edited in HR's direction after sending** — someone changes `lo_type` after Send to HR: expected, the drawer keeps "Sent to HR" and says later edits are not re-sent (Task 7 test `sentState_showsNoResendNote`).
2. **Double click / two tabs pressing Send at once** — expected exactly one outbox row and the loser gets 409 (Task 4 test `send_lostRace_is409`; the CAS itself is covered by existing `HrHandoffEnqueuerTest`).
3. **Phone typed as `(714) 555-0138`** — expected ready (normalizes to E.164); `"12"` → `phone:invalid`, not `phone:missing` (Task 4 tests).
4. **Address that is only `{country: "US"}`** — expected `mailing_address:missing` (Task 4 test `addressOnlyCountry_isMissing`).
5. **User with `CANDIDATE_HR_HANDOFF` but without `CANDIDATE_UPDATE`** — expected the migration grants both to ONBOARDING, and the drawer still shows the missing list (links may open read-only tabs) (Task 1 integration check + Task 7 test `missingItems_renderEvenWithoutEditRight`).

---

## Part 1 — recruit-be (one PR)

Setup once:

```bash
cd /Users/apple/Projects/agentflow/recruit-be && git fetch -q origin
git worktree add -b agent/agentflow-dkt0-send-to-hr ../../recruit-be-worktrees/dkt0-send-to-hr origin/master
cd ../../recruit-be-worktrees/dkt0-send-to-hr
```

All recruit-be paths below are relative to that worktree.

### Task 1: Migration — columns + permission seed

**Files:**
- Create: `src/main/resources/db/migration/V104__candidate_hire_classification_and_hr_handoff_permission.sql`
- Modify: `src/main/java/com/loanfactory/recruit/rbac/model/RecruitPermission.java` (add constant before `CHECKLIST_READ`)
- Modify: `docs/SCHEMA.md` (regenerated)

**Interfaces:**
- Produces: columns `candidates.lo_type VARCHAR(32)`, `candidates.employment_type VARCHAR(32)`; `RecruitPermission.CANDIDATE_HR_HANDOFF`.

- [ ] **Step 1: Write the migration**

```sql
-- agentflow-dkt0: the 1-1 outcome HR needs (lo_type + employment_type) and the Send to HR right.
-- Values are exactly MOSO LoanOfficerType / ai-hr-be jobrole.validLoType and ai-hr-be's
-- employment types. Nullable: required only by the Send to HR readiness check, never at rest.
ALTER TABLE candidates ADD COLUMN lo_type VARCHAR(32);
ALTER TABLE candidates ADD CONSTRAINT candidates_lo_type_check
  CHECK (lo_type IS NULL OR lo_type IN ('CORPORATE','OUTSIDE','INDEPENDENT','MORTGAGE_ADVISOR'));

ALTER TABLE candidates ADD COLUMN employment_type VARCHAR(32);
ALTER TABLE candidates ADD CONSTRAINT candidates_employment_type_check
  CHECK (employment_type IS NULL OR employment_type IN ('full_time','part_time','contract','outside_sales_person'));

-- INDEPENDENT <=> contract, the pair ai-hr-be enforces (jobrole/losubtype.go). Only checked when
-- both are set: one without the other is allowed at rest.
ALTER TABLE candidates ADD CONSTRAINT candidates_hire_classification_pair_check
  CHECK (lo_type IS NULL OR employment_type IS NULL
         OR (lo_type = 'INDEPENDENT') = (employment_type = 'contract'));

COMMENT ON COLUMN candidates.lo_type IS 'Loan-officer type decided at the 1-1 onboarding meeting (agentflow-dkt0).';
COMMENT ON COLUMN candidates.employment_type IS 'Employment type decided at the 1-1 onboarding meeting (agentflow-dkt0).';

-- Onboarding runs the 1-1 (Bao's belief, 2026-09-24, unconfirmed). On production it holds only
-- read rights, so it could press Send to HR but not fill what it asks for: grant both.
UPDATE rbac_roles
   SET permissions = permissions || '["CANDIDATE_HR_HANDOFF"]'::jsonb
 WHERE code = 'ONBOARDING'
   AND NOT permissions @> '["CANDIDATE_HR_HANDOFF"]'::jsonb;
UPDATE rbac_roles
   SET permissions = permissions || '["CANDIDATE_UPDATE"]'::jsonb
 WHERE code = 'ONBOARDING'
   AND NOT permissions @> '["CANDIDATE_UPDATE"]'::jsonb;
```

- [ ] **Step 2: Add the permission constant** in `RecruitPermission.java`, directly after `SEQUENCE_MANAGE,`:

```java
    /**
     * Send a Joined candidate to the HR app ({@code POST /candidates/{id}/hr-handoff},
     * agentflow-dkt0). An ACTION with an effect outside recruit, so it is its own right rather than
     * riding on CANDIDATE_UPDATE. Seeded to ONBOARDING in V104.
     */
    CANDIDATE_HR_HANDOFF,
```

- [ ] **Step 3: Regenerate `docs/SCHEMA.md`** (Docker must be running — if `docker info` fails, stop and ask Bao to start Docker Desktop):

```bash
docker run -d --name schemagen-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -p 5455:5432 postgres:15
until docker exec schemagen-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
SCHEMA_DB_HOST=localhost SCHEMA_DB_PORT=5455 SCHEMA_DB_USER=postgres SCHEMA_DB_PASSWORD=postgres PGPASSWORD=postgres \
  python3 scripts/gen-schema-doc.py
docker rm -f schemagen-pg
grep -n 'schema-doc: migrations=' docs/SCHEMA.md   # expect highest=V104
```

- [ ] **Step 4: Run the freshness test**

Run: `./gradlew test --tests 'com.loanfactory.recruit.SchemaDocFreshnessTest' -q`
Expected: PASS (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/db/migration/V104__candidate_hire_classification_and_hr_handoff_permission.sql \
  src/main/java/com/loanfactory/recruit/rbac/model/RecruitPermission.java docs/SCHEMA.md
git commit -m "feat: candidate lo_type/employment_type columns + CANDIDATE_HR_HANDOFF seeded to ONBOARDING [agentflow-dkt0]"
```

### Task 2: Entity, update path, pair rule, audit

**Files:**
- Create: `src/main/java/com/loanfactory/recruit/candidate/HireClassification.java`
- Modify: `src/main/java/com/loanfactory/recruit/candidate/entity/CandidateEntity.java` (after `isCorporateLoanOfficer`)
- Modify: `src/main/java/com/loanfactory/recruit/candidate/model/request/UpdateCandidateRequest.java`
- Modify: `src/main/java/com/loanfactory/recruit/candidate/CandidateProfileField.java`
- Modify: `src/main/java/com/loanfactory/recruit/candidate/CandidateProfileDiff.java` (`diff` only)
- Modify: `src/main/java/com/loanfactory/recruit/candidate/service/impl/CandidateServiceImpl.java` (`update`)
- Test: `src/test/java/com/loanfactory/recruit/candidate/HireClassificationTest.java`
- Test: `src/test/java/com/loanfactory/recruit/candidate/service/impl/CandidateServiceImplTest.java`

**Interfaces:**
- Produces: `CandidateEntity#getLoType()/setLoType(String)`, `#getEmploymentType()/setEmploymentType(String)` (JSON `lo_type`, `employment_type`); `UpdateCandidateRequest#loType`, `#employmentType`; `HireClassification.LO_TYPES`, `EMPLOYMENT_TYPES`, `static void requireValidPair(String loType, String employmentType)`; `CandidateProfileField.LO_TYPE`, `EMPLOYMENT_TYPE`.

- [ ] **Step 1: Write the failing tests** — `HireClassificationTest.java`:

```java
package com.loanfactory.recruit.candidate;

import com.loanfactory.core.base.exception.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HireClassificationTest {

    @Test
    @DisplayName("INDEPENDENT with contract, and CORPORATE with full_time, are valid pairs")
    void validPairs() {
        assertThatCode(() -> HireClassification.requireValidPair("INDEPENDENT", "contract")).doesNotThrowAnyException();
        assertThatCode(() -> HireClassification.requireValidPair("CORPORATE", "full_time")).doesNotThrowAnyException();
        assertThatCode(() -> HireClassification.requireValidPair("OUTSIDE", "outside_sales_person")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("one side alone is allowed at rest — readiness asks for both, not the save")
    void oneSideAlone_isAllowed() {
        assertThatCode(() -> HireClassification.requireValidPair("CORPORATE", null)).doesNotThrowAnyException();
        assertThatCode(() -> HireClassification.requireValidPair(null, "contract")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("INDEPENDENT without contract is refused — ai-hr-be would reject the pair")
    void independentWithoutContract_isRefused() {
        assertThatThrownBy(() -> HireClassification.requireValidPair("INDEPENDENT", "full_time"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("contract without INDEPENDENT is refused — the rule holds in both directions")
    void contractWithoutIndependent_isRefused() {
        assertThatThrownBy(() -> HireClassification.requireValidPair("OUTSIDE", "contract"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("an unknown value is refused before it reaches the database check")
    void unknownValue_isRefused() {
        assertThatThrownBy(() -> HireClassification.requireValidPair("W2", null))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> HireClassification.requireValidPair(null, "intern"))
                .isInstanceOf(BadRequestException.class);
    }
}
```

Add to `CandidateServiceImplTest.java` (reuse its existing `existing(...)`, `stubSavePassthrough()` helpers):

```java
    @Test
    @DisplayName("update writes lo_type + employment_type and records both in the change log")
    void update_setsHireClassification() {
        stubSavePassthrough();
        final CandidateEntity candidate = existing(CandidateStage.S6, RECRUITER);

        service.update(CANDIDATE_ID, UpdateCandidateRequest.builder()
                .loType("INDEPENDENT").employmentType("contract").build(), RECRUITER);

        assertThat(candidate.getLoType()).isEqualTo("INDEPENDENT");
        assertThat(candidate.getEmploymentType()).isEqualTo("contract");
    }

    @Test
    @DisplayName("update refuses a pair ai-hr-be would reject, checked against the RESULTING pair")
    void update_refusesInvalidResultingPair() {
        final CandidateEntity candidate = existing(CandidateStage.S6, RECRUITER);
        candidate.setLoType("INDEPENDENT");
        candidate.setEmploymentType("contract");

        assertThatThrownBy(() -> service.update(CANDIDATE_ID,
                UpdateCandidateRequest.builder().employmentType("full_time").build(), RECRUITER))
                .isInstanceOf(BadRequestException.class);
    }
```

And in the existing `CandidateProfileDiff` test (search `CandidateProfileDiffTest`; create it next to `CandidateProfileDiff` if absent):

```java
    @Test
    @DisplayName("lo_type and employment_type changes are diffed like every other profile field")
    void diff_includesHireClassification() {
        final CandidateEntity before = new CandidateEntity();
        before.setLoType("CORPORATE");
        final List<CandidateFieldChange> changes = CandidateProfileDiff.diff(before,
                UpdateCandidateRequest.builder().loType("OUTSIDE").employmentType("outside_sales_person").build());

        assertThat(changes).extracting(CandidateFieldChange::field)
                .contains(CandidateProfileField.LO_TYPE, CandidateProfileField.EMPLOYMENT_TYPE);
    }
```

(If `CandidateFieldChange` exposes the field under another accessor name, use that accessor — read the record first.)

- [ ] **Step 2: Run to verify they fail**

Run: `./gradlew test --tests 'com.loanfactory.recruit.candidate.HireClassificationTest' --tests 'com.loanfactory.recruit.candidate.service.impl.CandidateServiceImplTest' -q`
Expected: compilation failure (`HireClassification`, `loType` not defined).

- [ ] **Step 3: Implement**

`HireClassification.java`:

```java
package com.loanfactory.recruit.candidate;

import com.loanfactory.core.base.exception.BadRequestException;

import java.util.Set;

/**
 * The 1-1 outcome HR needs (agentflow-dkt0): loan-officer type + employment type, with exactly the
 * values MOSO ({@code LoanOfficerType}) and ai-hr-be ({@code jobrole.validLoType}, employment
 * types) use, and the one pairing rule ai-hr-be enforces: INDEPENDENT ⟺ contract. Checked here so
 * recruit never stores — and never sends — a pair HR would refuse. V104 repeats it as a CHECK.
 */
public final class HireClassification {

    public static final Set<String> LO_TYPES = Set.of("CORPORATE", "OUTSIDE", "INDEPENDENT", "MORTGAGE_ADVISOR");
    public static final Set<String> EMPLOYMENT_TYPES = Set.of("full_time", "part_time", "contract", "outside_sales_person");

    private HireClassification() {
    }

    /** Throws when either value is unknown, or when both are set and break INDEPENDENT ⟺ contract. */
    public static void requireValidPair(final String loType, final String employmentType) {
        if (loType != null && !LO_TYPES.contains(loType)) {
            throw new BadRequestException("Unknown lo_type: " + loType);
        }
        if (employmentType != null && !EMPLOYMENT_TYPES.contains(employmentType)) {
            throw new BadRequestException("Unknown employment_type: " + employmentType);
        }
        if (loType != null && employmentType != null
                && "INDEPENDENT".equals(loType) != "contract".equals(employmentType)) {
            throw new BadRequestException(
                    "lo_type INDEPENDENT goes with employment_type contract, and only with it");
        }
    }
}
```

`CandidateEntity.java`, after the `isCorporateLoanOfficer` field:

```java
    /** 1-1 outcome (agentflow-dkt0): CORPORATE | OUTSIDE | INDEPENDENT | MORTGAGE_ADVISOR. See HireClassification. */
    @Column(name = "lo_type")
    private String loType;

    /** 1-1 outcome (agentflow-dkt0): full_time | part_time | contract | outside_sales_person. */
    @Column(name = "employment_type")
    private String employmentType;
```

`UpdateCandidateRequest.java`, after `loansSinceAnchor`:

```java
    /** 1-1 outcome; validated with the resulting pair in CandidateServiceImpl.update. */
    @Size(max = 32)
    private String loType;

    @Size(max = 32)
    private String employmentType;
```

`CandidateProfileField.java`, after `LOANS_SINCE_ANCHOR("loans_since_anchor", false, false)` (change its `;` to `,`):

```java
    // agentflow-dkt0: written only by a person (never by MOSO), so not mosoOwned and never locked.
    LO_TYPE("lo_type", false, false),
    EMPLOYMENT_TYPE("employment_type", false, false);
```

`CandidateProfileDiff.diff`, before `return changes;`:

```java
        addIfChanged(changes, CandidateProfileField.LO_TYPE, before.getLoType(), request.getLoType());
        addIfChanged(changes, CandidateProfileField.EMPLOYMENT_TYPE,
                before.getEmploymentType(), request.getEmploymentType());
```

`CandidateServiceImpl.update`, right after the `loansSinceAnchor` block and before `entityService.save(candidate)`:

```java
        if (request.getLoType() != null || request.getEmploymentType() != null) {
            final String loType = request.getLoType() != null ? request.getLoType() : candidate.getLoType();
            final String employmentType = request.getEmploymentType() != null
                    ? request.getEmploymentType() : candidate.getEmploymentType();
            HireClassification.requireValidPair(loType, employmentType);
            candidate.setLoType(loType);
            candidate.setEmploymentType(employmentType);
        }
```

Note the validation runs before `entityService.save`, but `CandidateProfileDiff.diff` and `freezeTouchedMosoOwnedFields` already ran above it; a refused pair throws inside the `@Transactional` method so nothing persists.

- [ ] **Step 4: Run to verify they pass**

Run: same command as Step 2. Expected: PASS.

- [ ] **Step 5: Negative control** — comment out the `HireClassification.requireValidPair(...)` line in `update`, rerun `CandidateServiceImplTest`: `update_refusesInvalidResultingPair` must FAIL. Restore.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/loanfactory/recruit/candidate src/test/java/com/loanfactory/recruit/candidate
git commit -m "feat: record the 1-1 outcome (lo_type + employment_type) with HR's pair rule [agentflow-dkt0]"
```

### Task 3: Shared offer predicate; enqueuer returns a result; transition stops enqueuing

**Files:**
- Create: `src/main/java/com/loanfactory/recruit/offer/JoinedOfferCheck.java`
- Create: `src/main/java/com/loanfactory/recruit/hrhandoff/model/HrHandoffEnqueueResult.java`
- Modify: `src/main/java/com/loanfactory/recruit/hrhandoff/HrHandoffEnqueuer.java`
- Modify: `src/main/java/com/loanfactory/recruit/candidate/service/impl/CandidateServiceImpl.java` (`assertJoinedGate`, `transition`, constructor field)
- Test: `src/test/java/com/loanfactory/recruit/hrhandoff/HrHandoffEnqueuerTest.java`
- Test: `src/test/java/com/loanfactory/recruit/candidate/service/impl/CandidateServiceImplTest.java`

**Interfaces:**
- Produces: `JoinedOfferCheck#hasSignedAndSettledOffer(String candidateId): boolean` (Spring `@Component`); `enum HrHandoffEnqueueResult { ENQUEUED, DISABLED, NOT_HUMAN, ALREADY_SENT }`; `HrHandoffEnqueuer#enqueue(CandidateEntity, String actorId): HrHandoffEnqueueResult`; `HrHandoffEnqueuer#isEnabled(): boolean`. `enqueueOnJoin` is removed.

- [ ] **Step 1: Update tests first**

In `HrHandoffEnqueuerTest.java`, rename every call `enqueuer.enqueueOnJoin(x, y)` to `enqueuer.enqueue(x, y)` and add assertions on the returned value in the existing cases:
- flag off → `assertThat(result).isEqualTo(HrHandoffEnqueueResult.DISABLED)`
- null / `StageHistoryEntity.ACTOR_SYSTEM` actor → `NOT_HUMAN`
- `handedOffAt` already set, and the lost-CAS case (`executeUpdate` returns 0) → `ALREADY_SENT`
- happy path → `ENQUEUED`

In `CandidateServiceImplTest.java`, replace `transition_toS6_byHuman_enqueuesHrHandoff` with:

```java
    @Test
    @DisplayName("S6 entry through transition() no longer enqueues — Send to HR is the one door (agentflow-dkt0)")
    void transition_toS6_noLongerEnqueuesHrHandoff() {
        stubSavePassthrough();
        stubHistorySave();
        existing(CandidateStage.S5, RECRUITER);
        stubRequirements();
        when(joinedOfferCheck.hasSignedAndSettledOffer(CANDIDATE_ID)).thenReturn(true);

        service.transition(CANDIDATE_ID,
                StageTransitionRequest.builder().toStage(CandidateStage.S6).build(), RECRUITER);

        verifyNoInteractions(hrHandoffEnqueuer);
    }
```

and in every other `CandidateServiceImplTest` case that stubs `entityService.getAllBy(eq(OfferEntity.class), ...)` for the Joined gate, replace that stub with `when(joinedOfferCheck.hasSignedAndSettledOffer(CANDIDATE_ID)).thenReturn(<true|false as before>)`. Add `@Mock private JoinedOfferCheck joinedOfferCheck;` next to the `hrHandoffEnqueuer` mock. Delete the two `neverTouchesHrHandoff` tests only if they no longer compile; otherwise keep them (they still hold).

- [ ] **Step 2: Run to verify failure**

Run: `./gradlew test --tests 'com.loanfactory.recruit.hrhandoff.HrHandoffEnqueuerTest' --tests 'com.loanfactory.recruit.candidate.service.impl.CandidateServiceImplTest' -q`
Expected: compilation failure (`enqueue`, `JoinedOfferCheck` missing).

- [ ] **Step 3: Implement**

`JoinedOfferCheck.java`:

```java
package com.loanfactory.recruit.offer;

import com.loanfactory.core.base.service.EntityService;
import com.loanfactory.recruit.offer.entity.OfferEntity;
import com.loanfactory.recruit.offer.model.AgreementStatus;
import com.loanfactory.recruit.offer.model.FeeStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

/**
 * "Has a SIGNED offer with the fee PAID or WAIVED" — the Joined condition, shared by
 * CandidateServiceImpl's S6 gate and the Send to HR readiness check (agentflow-dkt0), so the two
 * can never disagree about what joined means.
 */
@Component
@RequiredArgsConstructor
public class JoinedOfferCheck {

    private final EntityService entityService;

    public boolean hasSignedAndSettledOffer(final String candidateId) {
        return !entityService.getAllBy(OfferEntity.class,
                        (root, query, cb) -> cb.and(
                                cb.equal(root.get(OfferEntity.Fields.CANDIDATE_ID), candidateId),
                                cb.equal(root.get(OfferEntity.Fields.AGREEMENT_STATUS), AgreementStatus.SIGNED),
                                root.get(OfferEntity.Fields.FEE_STATUS).in(FeeStatus.PAID, FeeStatus.WAIVED)),
                        PageRequest.of(0, 1))
                .isEmpty();
    }
}
```

`CandidateServiceImpl`: add `private final JoinedOfferCheck joinedOfferCheck;` beside `hrHandoffEnqueuer`; replace the body of `assertJoinedGate` after the `S6` guard with:

```java
        if (!joinedOfferCheck.hasSignedAndSettledOffer(candidate.getId())) {
            throw new BadRequestException(
                    "Joined gate: S6 requires a SIGNED offer with the fee PAID or WAIVED");
        }
```

and in `transition`, delete the `hrHandoffEnqueuer.enqueueOnJoin(saved, actorId);` line and its comment, replacing the comment with `// The HR handoff is NOT fired here any more: Send to HR (HrHandoffReadinessService) is the one door (agentflow-dkt0).` Keep the `hrHandoffEnqueuer` field only if still referenced elsewhere in the class; otherwise remove it and its javadoc.

`HrHandoffEnqueueResult.java`:

```java
package com.loanfactory.recruit.hrhandoff.model;

/** What HrHandoffEnqueuer#enqueue did (agentflow-dkt0) — lets the Send to HR endpoint answer 200 vs 409. */
public enum HrHandoffEnqueueResult {
    ENQUEUED,
    /** recruit.features.hr-handoff-publish is off. */
    DISABLED,
    /** null or SYSTEM actor — never a person. */
    NOT_HUMAN,
    /** handed_off_at already set, or another request won the compare-and-set. */
    ALREADY_SENT
}
```

`HrHandoffEnqueuer`: rename `enqueueOnJoin` to `enqueue`, return type `HrHandoffEnqueueResult`; each early `return;` returns `DISABLED`, `NOT_HUMAN`, `ALREADY_SENT` (both the memo check and `won == 0`) respectively; the end returns `ENQUEUED`. Add:

```java
    public boolean isEnabled() {
        return enabled;
    }
```

Rewrite the class javadoc paragraph that says the only call site is `CandidateServiceImpl.transition()` to: "Called only by `HrHandoffReadinessService.send` (agentflow-dkt0), which verifies stage, offer and profile readiness in the same transaction immediately before calling; this class validates nothing about the candidate itself." Update the `@param candidate` text accordingly.

- [ ] **Step 4: Run to verify pass** — same command as Step 2. Expected: PASS.

- [ ] **Step 5: Negative control** — temporarily re-add `hrHandoffEnqueuer.enqueue(saved, actorId);` in `transition`: `transition_toS6_noLongerEnqueuesHrHandoff` must FAIL. Restore.

- [ ] **Step 6: Commit**

```bash
git add src/main/java src/test/java
git commit -m "refactor: shared JoinedOfferCheck, enqueuer returns a result, transition() no longer fires the HR handoff [agentflow-dkt0]"
```

### Task 4: Readiness service + `GET/POST /candidates/{id}/hr-handoff`

**Files:**
- Create: `src/main/java/com/loanfactory/recruit/hrhandoff/model/HrHandoffState.java`
- Create: `src/main/java/com/loanfactory/recruit/hrhandoff/HrHandoffConflictException.java`
- Create: `src/main/java/com/loanfactory/recruit/hrhandoff/service/HrHandoffReadinessService.java`
- Create: `src/main/java/com/loanfactory/recruit/hrhandoff/controller/HrHandoffController.java`
- Test: `src/test/java/com/loanfactory/recruit/hrhandoff/service/HrHandoffReadinessServiceTest.java`

**Interfaces:**
- Consumes: `JoinedOfferCheck#hasSignedAndSettledOffer`, `HrHandoffEnqueuer#enqueue`, `#isEnabled` (Task 3); `CandidateEntity#getLoType/getEmploymentType` (Task 2); `RecruitPermission.CANDIDATE_HR_HANDOFF` (Task 1); `ContactNormalizer.normalizePhone(String)` (existing, returns E.164 or null).
- Produces: JSON `{ "enabled", "ready", "missing": [...], "handed_off_at", "delivery" }` at `GET/POST /api/v1/candidates/{id}/hr-handoff`; `delivery` ∈ `pending`, `delivered`, `failed`, `null`.

- [ ] **Step 1: Write the failing tests** — `HrHandoffReadinessServiceTest.java`:

```java
package com.loanfactory.recruit.hrhandoff.service;

import com.loanfactory.core.base.exception.BadRequestException;
import com.loanfactory.core.base.service.EntityService;
import com.loanfactory.recruit.candidate.entity.CandidateEntity;
import com.loanfactory.recruit.candidate.model.CandidateStage;
import com.loanfactory.recruit.candidate.model.CandidateStatus;
import com.loanfactory.recruit.hrhandoff.HrHandoffConflictException;
import com.loanfactory.recruit.hrhandoff.HrHandoffEnqueuer;
import com.loanfactory.recruit.hrhandoff.entity.HrHandoffOutboxEntity;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffEnqueueResult;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffState;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffStatus;
import com.loanfactory.recruit.offer.JoinedOfferCheck;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HrHandoffReadinessServiceTest {

    private static final String ID = "cand-1";
    private static final String ACTOR = "acct-onboarding";

    @Mock private EntityService entityService;
    @Mock private JoinedOfferCheck joinedOfferCheck;
    @Mock private HrHandoffEnqueuer enqueuer;

    private HrHandoffReadinessService service;
    private CandidateEntity candidate;

    @BeforeEach
    void setUp() {
        service = new HrHandoffReadinessService(entityService, joinedOfferCheck, enqueuer);
        candidate = new CandidateEntity();
        candidate.setId(ID);
        candidate.setStage(CandidateStage.S6);
        candidate.setStatus(CandidateStatus.ACTIVE);
        candidate.setFirstName("Minh");
        candidate.setLastName("Tran");
        candidate.setEmail("minh.tran@gmail.com");
        candidate.setNmlsId("1874203");
        candidate.setPhone("(650) 253-0000");
        candidate.setMailingAddress(Map.of("line1", "1200 Main St", "city", "Irvine", "zip", "92614"));
        candidate.setLoType("CORPORATE");
        candidate.setEmploymentType("full_time");
        when(entityService.getById(ID, CandidateEntity.class)).thenReturn(candidate);
        when(joinedOfferCheck.hasSignedAndSettledOffer(ID)).thenReturn(true);
        when(enqueuer.isEnabled()).thenReturn(true);
        when(entityService.getAllBy(eq(HrHandoffOutboxEntity.class), any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
    }

    @Test
    @DisplayName("a complete Joined candidate is ready, with nothing missing")
    void complete_isReady() {
        final HrHandoffState state = service.state(ID);
        assertThat(state.ready()).isTrue();
        assertThat(state.missing()).isEmpty();
        assertThat(state.enabled()).isTrue();
    }

    @Test
    @DisplayName("not Joined, archived and no settled offer are each reported")
    void stageStatusOffer_areReported() {
        candidate.setStage(CandidateStage.S5);
        candidate.setStatus(CandidateStatus.ARCHIVED);
        when(joinedOfferCheck.hasSignedAndSettledOffer(ID)).thenReturn(false);
        assertThat(service.state(ID).missing())
                .contains("stage:not_joined", "status:archived", "offer:not_signed_and_paid");
    }

    @Test
    @DisplayName("S7 is not Joined for this purpose — MOSO sets S7 only for people HR already has")
    void s7_isNotJoined() {
        candidate.setStage(CandidateStage.S7);
        assertThat(service.state(ID).missing()).contains("stage:not_joined");
    }

    @Test
    @DisplayName("blank identity fields and the 1-1 outcome are each reported by key")
    void blanks_areReported() {
        candidate.setFirstName(" ");
        candidate.setLastName(null);
        candidate.setEmail(null);
        candidate.setNmlsId("");
        candidate.setLoType(null);
        candidate.setEmploymentType(null);
        assertThat(service.state(ID).missing())
                .contains("first_name", "last_name", "email", "nmls_id", "lo_type", "employment_type");
    }

    @Test
    @DisplayName("a phone that does not parse is invalid, not missing")
    void badPhone_isInvalid() {
        candidate.setPhone("12");
        assertThat(service.state(ID).missing()).contains("phone:invalid").doesNotContain("phone:missing");
    }

    @Test
    @DisplayName("no phone at all is missing")
    void noPhone_isMissing() {
        candidate.setPhone(null);
        assertThat(service.state(ID).missing()).contains("phone:missing");
    }

    @Test
    @DisplayName("an address that is only a country is missing")
    void addressOnlyCountry_isMissing() {
        candidate.setMailingAddress(Map.of("country", "US"));
        assertThat(service.state(ID).missing()).contains("mailing_address:missing");
    }

    @Test
    @DisplayName("already sent is reported and blocks readiness")
    void alreadySent_isReported() {
        candidate.setHandedOffAt(Instant.parse("2026-09-24T03:00:00Z"));
        final HrHandoffState state = service.state(ID);
        assertThat(state.missing()).contains("already_sent");
        assertThat(state.ready()).isFalse();
        assertThat(state.handedOffAt()).isEqualTo(Instant.parse("2026-09-24T03:00:00Z"));
    }

    @Test
    @DisplayName("delivery follows the latest outbox row: DEAD_LETTER reads as failed")
    void delivery_failed() {
        final HrHandoffOutboxEntity row = new HrHandoffOutboxEntity();
        row.setStatus(HrHandoffStatus.DEAD_LETTER);
        when(entityService.getAllBy(eq(HrHandoffOutboxEntity.class), any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(row)));
        assertThat(service.state(ID).delivery()).isEqualTo("failed");
    }

    @Test
    @DisplayName("send enqueues once when ready")
    void send_whenReady_enqueues() {
        when(enqueuer.enqueue(candidate, ACTOR)).thenReturn(HrHandoffEnqueueResult.ENQUEUED);
        service.send(ID, ACTOR);
        verify(enqueuer).enqueue(candidate, ACTOR);
    }

    @Test
    @DisplayName("send refuses with 400 when not ready, and never enqueues")
    void send_whenNotReady_is400() {
        candidate.setLoType(null);
        assertThatThrownBy(() -> service.send(ID, ACTOR)).isInstanceOf(BadRequestException.class);
        verify(enqueuer, never()).enqueue(any(), any());
    }

    @Test
    @DisplayName("send answers 409 when the feature is off")
    void send_whenDisabled_is409() {
        when(enqueuer.isEnabled()).thenReturn(false);
        assertThatThrownBy(() -> service.send(ID, ACTOR)).isInstanceOf(HrHandoffConflictException.class);
        verify(enqueuer, never()).enqueue(any(), any());
    }

    @Test
    @DisplayName("send answers 409 when another request won the race")
    void send_lostRace_is409() {
        when(enqueuer.enqueue(candidate, ACTOR)).thenReturn(HrHandoffEnqueueResult.ALREADY_SENT);
        assertThatThrownBy(() -> service.send(ID, ACTOR)).isInstanceOf(HrHandoffConflictException.class);
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `./gradlew test --tests 'com.loanfactory.recruit.hrhandoff.service.HrHandoffReadinessServiceTest' -q`
Expected: compilation failure.

- [ ] **Step 3: Implement**

`HrHandoffState.java`:

```java
package com.loanfactory.recruit.hrhandoff.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.Instant;
import java.util.List;

/** Send to HR state for one candidate (agentflow-dkt0). delivery: pending | delivered | failed | null. */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record HrHandoffState(boolean enabled, boolean ready, List<String> missing,
                             Instant handedOffAt, String delivery) {
}
```

`HrHandoffConflictException.java`:

```java
package com.loanfactory.recruit.hrhandoff;

import com.loanfactory.core.base.exception.BaseException;
import org.springframework.http.HttpStatus;

/** 409 for Send to HR: feature off, or already sent (agentflow-dkt0). */
public class HrHandoffConflictException extends BaseException {
    public HrHandoffConflictException(final String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
```

`HrHandoffReadinessService.java`:

```java
package com.loanfactory.recruit.hrhandoff.service;

import com.loanfactory.core.base.exception.BadRequestException;
import com.loanfactory.core.base.service.EntityService;
import com.loanfactory.recruit.candidate.ContactNormalizer;
import com.loanfactory.recruit.candidate.entity.CandidateEntity;
import com.loanfactory.recruit.candidate.model.CandidateStage;
import com.loanfactory.recruit.candidate.model.CandidateStatus;
import com.loanfactory.recruit.hrhandoff.HrHandoffConflictException;
import com.loanfactory.recruit.hrhandoff.HrHandoffEnqueuer;
import com.loanfactory.recruit.hrhandoff.entity.HrHandoffOutboxEntity;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffEnqueueResult;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffState;
import com.loanfactory.recruit.offer.JoinedOfferCheck;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Send to HR (agentflow-dkt0): the one door to the RECRUIT_HIRED handoff. Readiness is recomputed
 * inside send()'s own transaction immediately before enqueuing — never trusted from an earlier GET.
 */
@Service
@RequiredArgsConstructor
public class HrHandoffReadinessService {

    private final EntityService entityService;
    private final JoinedOfferCheck joinedOfferCheck;
    private final HrHandoffEnqueuer enqueuer;

    @Transactional(readOnly = true)
    public HrHandoffState state(final String candidateId) {
        return stateOf(load(candidateId));
    }

    @Transactional
    public HrHandoffState send(final String candidateId, final String actorId) {
        final CandidateEntity candidate = load(candidateId);
        if (!enqueuer.isEnabled()) {
            throw new HrHandoffConflictException("Send to HR is switched off");
        }
        final List<String> missing = missing(candidate);
        if (!missing.isEmpty()) {
            throw new BadRequestException("Not ready to send to HR: " + missing);
        }
        if (enqueuer.enqueue(candidate, actorId) != HrHandoffEnqueueResult.ENQUEUED) {
            throw new HrHandoffConflictException("Already sent to HR");
        }
        return stateOf(candidate);
    }

    private CandidateEntity load(final String candidateId) {
        final CandidateEntity candidate = entityService.getById(candidateId, CandidateEntity.class);
        if (candidate == null) {
            throw new BadRequestException("Candidate not found: " + candidateId);
        }
        return candidate;
    }

    private HrHandoffState stateOf(final CandidateEntity candidate) {
        final List<String> missing = missing(candidate);
        return new HrHandoffState(enqueuer.isEnabled(), missing.isEmpty(), missing,
                candidate.getHandedOffAt(), delivery(candidate.getId()));
    }

    private List<String> missing(final CandidateEntity c) {
        final List<String> missing = new ArrayList<>();
        if (c.getStage() != CandidateStage.S6) {
            missing.add("stage:not_joined");
        }
        if (c.getStatus() != CandidateStatus.ACTIVE) {
            missing.add("status:archived");
        }
        if (!joinedOfferCheck.hasSignedAndSettledOffer(c.getId())) {
            missing.add("offer:not_signed_and_paid");
        }
        requireText(missing, "first_name", c.getFirstName());
        requireText(missing, "last_name", c.getLastName());
        requireText(missing, "email", c.getEmail());
        requireText(missing, "nmls_id", c.getNmlsId());
        if (StringUtils.isBlank(c.getPhone())) {
            missing.add("phone:missing");
        } else if (ContactNormalizer.normalizePhone(c.getPhone()) == null) {
            missing.add("phone:invalid");
        }
        if (!isPostable(c.getMailingAddress())) {
            missing.add("mailing_address:missing");
        }
        requireText(missing, "lo_type", c.getLoType());
        requireText(missing, "employment_type", c.getEmploymentType());
        if (c.getHandedOffAt() != null) {
            missing.add("already_sent");
        }
        return missing;
    }

    private static void requireText(final List<String> missing, final String key, final String value) {
        if (StringUtils.isBlank(value)) {
            missing.add(key);
        }
    }

    /** Same probe as MosoRowMapper.mailingAddress: street, city or zip makes it an address. */
    private static boolean isPostable(final Map<String, Object> address) {
        if (address == null) {
            return false;
        }
        return List.of("line1", "city", "zip").stream()
                .map(address::get)
                .anyMatch(v -> v != null && StringUtils.isNotBlank(String.valueOf(v)));
    }

    private String delivery(final String candidateId) {
        final List<HrHandoffOutboxEntity> rows = entityService.getAllBy(HrHandoffOutboxEntity.class,
                        (root, query, cb) -> cb.equal(root.get(HrHandoffOutboxEntity.Fields.CANDIDATE_ID), candidateId),
                        PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, HrHandoffOutboxEntity.Fields.OCCURRED_AT)))
                .getContent();
        if (rows.isEmpty()) {
            return null;
        }
        return switch (rows.get(0).getStatus()) {
            case PENDING -> "pending";
            case SENT -> "delivered";
            case DEAD_LETTER -> "failed";
        };
    }
}
```

(Check the exact constant names Lombok generates on `HrHandoffOutboxEntity.Fields` — the repo's `OfferEntity.Fields.CANDIDATE_ID` style means `CANDIDATE_ID` / `OCCURRED_AT`; adjust if the build says otherwise.)

`HrHandoffController.java`:

```java
package com.loanfactory.recruit.hrhandoff.controller;

import com.loanfactory.core.base.utils.ServicesUtils;
import com.loanfactory.recruit.hrhandoff.model.HrHandoffState;
import com.loanfactory.recruit.hrhandoff.service.HrHandoffReadinessService;
import com.loanfactory.recruit.rbac.model.RecruitPermission;
import com.loanfactory.recruit.rbac.service.AccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Send to HR (agentflow-dkt0). Reading the state needs CANDIDATE_READ; sending needs CANDIDATE_HR_HANDOFF. */
@RestController
@RequestMapping("/api/v1/candidates/{id}/hr-handoff")
@RequiredArgsConstructor
public class HrHandoffController {

    private final HrHandoffReadinessService readinessService;
    private final AccessControlService accessControlService;

    @GetMapping
    public HrHandoffState state(@PathVariable final String id) {
        accessControlService.require(ServicesUtils.getCurrentUserId(false), RecruitPermission.CANDIDATE_READ);
        return readinessService.state(id);
    }

    @PostMapping
    public HrHandoffState send(@PathVariable final String id) {
        accessControlService.require(ServicesUtils.getCurrentUserId(false), RecruitPermission.CANDIDATE_HR_HANDOFF);
        return readinessService.send(id, ServicesUtils.getCurrentUserId(true));
    }
}
```

(Look at how other recruit-be controllers are wrapped — if they return the tera-core response envelope via a base class or advice, follow the same; `CandidateController` returns entities directly, so plain return is the house style.)

- [ ] **Step 4: Run to verify pass** — same command as Step 2. Expected: PASS.

- [ ] **Step 5: Negative controls** — (a) delete the `phone:invalid` branch → `badPhone_isInvalid` FAILS; (b) remove `c.getStatus() != ACTIVE` check → `stageStatusOffer_areReported` FAILS; (c) move the `missing` check after `enqueue` → `send_whenNotReady_is400` FAILS. Restore each.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/com/loanfactory/recruit/hrhandoff src/test/java/com/loanfactory/recruit/hrhandoff
git commit -m "feat: Send to HR — readiness check and GET/POST /candidates/{id}/hr-handoff [agentflow-dkt0]"
```

### Task 5: Payload carries the 1-1 outcome

**Files:**
- Modify: `src/main/java/com/loanfactory/recruit/hrhandoff/HrHandoffPayloadResolver.java`
- Test: `src/test/java/com/loanfactory/recruit/hrhandoff/HrHandoffPayloadResolverTest.java`

**Interfaces:**
- Consumes: `CandidateEntity#getLoType/getEmploymentType`.
- Produces: payload keys `lo_type`, `employment_type`; `is_corporate_loan_officer` no longer emitted.

- [ ] **Step 1: Update tests first** — replace `languagesAndCorporateFlag_areIncluded` with:

```java
    @Test
    @DisplayName("the 1-1 outcome travels as lo_type + employment_type; the old corporate hint does not")
    void hireClassification_isSent_corporateHintIsNot() {
        final CandidateEntity candidate = new CandidateEntity();
        candidate.setId(CANDIDATE_ID);
        candidate.setPreferredLanguages(List.of("English", " ", "Vietnamese"));
        candidate.setIsCorporateLoanOfficer(false);
        candidate.setLoType("INDEPENDENT");
        candidate.setEmploymentType("contract");
        when(entityService.getById(CANDIDATE_ID, CandidateEntity.class)).thenReturn(candidate);
        stubNoOffer();

        assertThat(resolver.resolve(row))
                .containsEntry("preferred_languages", List.of(
                        Map.of("code", "en", "name", "English"),
                        Map.of("code", "vi", "name", "Vietnamese")))
                .containsEntry("lo_type", "INDEPENDENT")
                .containsEntry("employment_type", "contract")
                .doesNotContainKey("is_corporate_loan_officer");
    }
```

and in `blankOptionalFields_areOmitted`, replace `"is_corporate_loan_officer"` in the `doesNotContainKeys` list with `"lo_type", "employment_type"`.

- [ ] **Step 2: Run to verify failure**

Run: `./gradlew test --tests 'com.loanfactory.recruit.hrhandoff.HrHandoffPayloadResolverTest' -q`
Expected: FAIL (`lo_type` absent, `is_corporate_loan_officer` present).

- [ ] **Step 3: Implement** — in `resolve`, replace

```java
        if (candidate.getIsCorporateLoanOfficer() != null) {
            payload.put("is_corporate_loan_officer", candidate.getIsCorporateLoanOfficer());
        }
```

with

```java
        putIfPresent(payload, "lo_type", candidate.getLoType());
        putIfPresent(payload, "employment_type", candidate.getEmploymentType());
```

and in the class javadoc section "Contact fields leave in the form HR accepts", replace the sentence about `is_corporate_loan_officer` with: "The 1-1 outcome travels as `lo_type` + `employment_type` (agentflow-dkt0) — a decision recorded by the person who ran the 1-1, not a hint; it replaced the `is_corporate_loan_officer` stand-in."

- [ ] **Step 4: Run to verify pass** — same command. Expected: PASS.

- [ ] **Step 5: Full suite + commit**

```bash
./gradlew test -q            # expect exit 0 (integrationTest needs Docker; CI runs it)
git add src/main/java/com/loanfactory/recruit/hrhandoff src/test/java/com/loanfactory/recruit/hrhandoff
git commit -m "feat: RECRUIT_HIRED carries lo_type + employment_type, drops the corporate hint [agentflow-dkt0]"
git push -u origin agent/agentflow-dkt0-send-to-hr
gh pr create --base master --title "feat: Send to HR — 1-1 outcome + readiness-gated handoff [agentflow-dkt0]" --body-file <(printf '%s\n' "Implements Part 1 of docs/superpowers/plans/2026-09-24-hire-handoff-send-to-hr.md (spec rev 3.1). Still dark." "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```

Then: two independent reviewers (correctness; RBAC/contract), CI `Tests` green, merge.

---

## Part 2 — recruit-fe (one PR, after Part 1 is merged to master)

Setup:

```bash
cd /Users/apple/Projects/agentflow/recruit-fe && git fetch -q origin
git worktree add -b agent/agentflow-dkt0-send-to-hr ../../recruit-fe-worktrees/dkt0-send-to-hr origin/master
cd ../../recruit-fe-worktrees/dkt0-send-to-hr && npm ci
```

### Task 6: Types, API, and the 1-1 outcome selects

**Files:**
- Modify: `src/shared/types/recruit.ts` (`Candidate`)
- Modify: `src/apis/recruit/candidates.api.ts` (`UpdateCandidateInput`)
- Create: `src/apis/recruit/hrHandoff.api.ts`
- Create: `src/shared/constants/hireClassification.ts`
- Modify: `src/shared/components/CandidateEditModal/schema.ts`
- Modify: `src/shared/components/CandidateEditModal/LicensingTab.tsx`
- Modify: `src/messages/en/candidateEdit.json`, `src/messages/vi/candidateEdit.json`
- Test: `src/shared/components/CandidateEditModal/__tests__/schema.test.ts`

**Interfaces:**
- Produces: `Candidate.lo_type?: LoType | null`, `Candidate.employment_type?: EmploymentType | null`; `UpdateCandidateInput.lo_type?`, `.employment_type?`; `LO_TYPES`, `EMPLOYMENT_TYPES`, `pairedEmploymentType(lo)`, `pairedLoType(emp)` from `@constants/hireClassification`; `useHrHandoff(id)`, `useSendToHr()`, type `HrHandoffState` from `@apis/recruit/hrHandoff.api`.

- [ ] **Step 1: Write the failing tests** — append to `schema.test.ts`:

```ts
import { buildCandidateUpdatePayload, buildEditSchema, candidateToFormValues } from '../schema'

describe('1-1 outcome', () => {
  const base = candidateToFormValues({ id: 'c1', lo_type: null, employment_type: null } as never)

  it('sends lo_type and employment_type only when changed', () => {
    const patch = buildCandidateUpdatePayload({ ...base, lo_type: 'INDEPENDENT', employment_type: 'contract' }, base)
    expect(patch).toMatchObject({ lo_type: 'INDEPENDENT', employment_type: 'contract' })
    expect(buildCandidateUpdatePayload(base, base)).not.toHaveProperty('lo_type')
  })

  it('refuses INDEPENDENT without contract and contract without INDEPENDENT', () => {
    const schema = buildEditSchema(base)
    expect(schema.safeParse({ ...base, lo_type: 'INDEPENDENT', employment_type: 'full_time' }).success).toBe(false)
    expect(schema.safeParse({ ...base, lo_type: 'OUTSIDE', employment_type: 'contract' }).success).toBe(false)
    expect(schema.safeParse({ ...base, lo_type: 'CORPORATE', employment_type: 'part_time' }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/shared/components/CandidateEditModal/__tests__/schema.test.ts`
Expected: FAIL (`lo_type` not in form values / payload).

- [ ] **Step 3: Implement**

`src/shared/constants/hireClassification.ts`:

```ts
/** 1-1 outcome values — exactly recruit-be HireClassification / MOSO / ai-hr-be (agentflow-dkt0). */
export const LO_TYPES = ['CORPORATE', 'OUTSIDE', 'INDEPENDENT', 'MORTGAGE_ADVISOR'] as const
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'outside_sales_person'] as const
export type LoType = (typeof LO_TYPES)[number]
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

/** INDEPENDENT ⟺ contract: picking one side of the pair fills the other. */
export const pairedEmploymentType = (lo: string): EmploymentType | null => (lo === 'INDEPENDENT' ? 'contract' : null)
export const pairedLoType = (emp: string): LoType | null => (emp === 'contract' ? 'INDEPENDENT' : null)

export const isValidPair = (lo: string, emp: string): boolean =>
  lo === '' || emp === '' || (lo === 'INDEPENDENT') === (emp === 'contract')
```

`recruit.ts` — in `Candidate`, after `mailing_address`:

```ts
  /** 1-1 outcome (agentflow-dkt0). Optional: older fixtures omit it; treat missing as null. */
  lo_type?: LoType | null
  employment_type?: EmploymentType | null
```

with `import type { EmploymentType, LoType } from '@constants/hireClassification'` at the top.

`candidates.api.ts` — in `UpdateCandidateInput`, after `loans_since_anchor?`:

```ts
  lo_type?: string
  employment_type?: string
```

`schema.ts`:
- `CandidateEditFormValues`: add `lo_type: string` and `employment_type: string`.
- `candidateToFormValues`: add `lo_type: candidate.lo_type ?? ''`, `employment_type: candidate.employment_type ?? ''`.
- `buildEditSchema` object: add `lo_type: z.string()`, `employment_type: z.string()`; in `superRefine` add:

```ts
      if (!isValidPair(values.lo_type, values.employment_type)) {
        ctx.addIssue({ code: 'custom', path: ['employment_type'], message: 'invalid_classification_pair' })
      }
```

- `buildCandidateUpdatePayload`: before `return patch`:

```ts
  if (values.lo_type !== original.lo_type && values.lo_type !== '') patch.lo_type = values.lo_type
  if (values.employment_type !== original.employment_type && values.employment_type !== '') {
    patch.employment_type = values.employment_type
  }
```

`LicensingTab.tsx` — add below the `sponsor_states` field:

```tsx
      <div className="flex flex-col gap-2 pt-2">
        <Text size="sm" fw={600}>{t('classification_section')}</Text>
        <Text size="xs" c="dimmed">{t('classification_hint')}</Text>
        <SelectField
          name="lo_type"
          label={t('lo_type_label')}
          data={LO_TYPES.map((value) => ({ value, label: t(`lo_type_${value}`) }))}
          disabled={!canEdit}
          onChange={(value) => {
            const paired = value ? pairedEmploymentType(value) : null
            if (paired) setValue('employment_type', paired, { shouldDirty: true })
          }}
        />
        <SelectField
          name="employment_type"
          label={t('employment_type_label')}
          data={EMPLOYMENT_TYPES.map((value) => ({ value, label: t(`employment_type_${value}`) }))}
          disabled={!canEdit}
          onChange={(value) => {
            const paired = value ? pairedLoType(value) : null
            if (paired) setValue('lo_type', paired, { shouldDirty: true })
          }}
        />
      </div>
```

with imports `import { Text } from '@mantine/core'`, `import { useFormContext } from 'react-hook-form'`, `import SelectField from '@fields/SelectField'`, `import { EMPLOYMENT_TYPES, LO_TYPES, pairedEmploymentType, pairedLoType } from '@constants/hireClassification'`, and `const { setValue } = useFormContext()` inside the component. (Open `src/shared/fields/SelectField/index.tsx` first: if it does not forward an `onChange` alongside its RHF binding, use `watch` + `useEffect` on `lo_type`/`employment_type` instead to apply the pairing.)

`candidateEdit.json` — add under `CandidateEdit` (en):

```json
"classification_section": "1-1 outcome",
"classification_hint": "Decided at the 1-1 onboarding meeting. HR needs both to create the account.",
"lo_type_label": "Loan officer type",
"lo_type_CORPORATE": "Corporate — W-2",
"lo_type_OUTSIDE": "Outside — W-2",
"lo_type_INDEPENDENT": "Independent — 1099",
"lo_type_MORTGAGE_ADVISOR": "Mortgage advisor",
"employment_type_label": "Employment type",
"employment_type_full_time": "Full time — W-2",
"employment_type_part_time": "Part time — W-2",
"employment_type_contract": "Contract — 1099",
"employment_type_outside_sales_person": "Outside salesperson — W-2",
"invalid_classification_pair": "Independent goes with Contract, and Contract only with Independent."
```

(vi):

```json
"classification_section": "Kết quả buổi 1-1",
"classification_hint": "Chốt tại buổi họp 1-1 onboarding. HR cần cả hai để tạo account.",
"lo_type_label": "Loại Loan Officer",
"lo_type_CORPORATE": "Corporate — W-2",
"lo_type_OUTSIDE": "Outside — W-2",
"lo_type_INDEPENDENT": "Independent — 1099",
"lo_type_MORTGAGE_ADVISOR": "Mortgage advisor",
"employment_type_label": "Loại hình làm việc",
"employment_type_full_time": "Toàn thời gian — W-2",
"employment_type_part_time": "Bán thời gian — W-2",
"employment_type_contract": "Hợp đồng — 1099",
"employment_type_outside_sales_person": "Bán hàng bên ngoài — W-2",
"invalid_classification_pair": "Independent đi với Hợp đồng, và Hợp đồng chỉ đi với Independent."
```

`src/apis/recruit/hrHandoff.api.ts`:

```ts
import apiClient from '@apis/apiClient'
import { useApiMutation } from '@apis/react-query/useApiMutation'
import { useApiQuery } from '@apis/react-query/useApiQuery'
import type { ApiBaseResponse } from '@shared/types/common'
import type { ApiInstant } from '@shared/types/recruit'

const BASE = '/recruit-svc/api/v1'

/** GET/POST /candidates/{id}/hr-handoff — mirrors recruit-be HrHandoffState (agentflow-dkt0). */
export type HrHandoffState = {
  enabled: boolean
  ready: boolean
  missing: string[]
  handed_off_at: ApiInstant | null
  delivery: 'pending' | 'delivered' | 'failed' | null
}

export const hrHandoffKey = (id: string) => ['recruit', 'candidate', id, 'hr-handoff']

export const useHrHandoff = (id: string | null) =>
  useApiQuery<ApiBaseResponse<HrHandoffState>>(
    hrHandoffKey(id ?? 'none'),
    () => apiClient.get<HrHandoffState>(`${BASE}/candidates/${id}/hr-handoff`),
    { enabled: Boolean(id) }
  )

export const useSendToHr = () =>
  useApiMutation<ApiBaseResponse<HrHandoffState>, { candidateId: string }>(({ candidateId }) =>
    apiClient.post<HrHandoffState>(`${BASE}/candidates/${candidateId}/hr-handoff`, {})
  )
```

(Copy the real `BASE` constant and `ApiInstant` import from `candidates.api.ts` — use exactly what that file uses.)

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/shared/components/CandidateEditModal src/messages` then `npx tsc --noEmit`
Expected: PASS, tsc exit 0, `localeParity` green.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: 1-1 outcome selects (lo_type + employment_type) with the Independent/Contract pair [agentflow-dkt0]"
```

### Task 7: Send to HR block in the candidate drawer

**Files:**
- Create: `src/shared/components/SendToHr/index.tsx`
- Test: `src/shared/components/SendToHr/__tests__/SendToHr.test.tsx`
- Modify: `src/shared/components/CandidateDrawer/index.tsx` (render under the header buttons)
- Modify: `src/messages/en/drawer.json`, `src/messages/vi/drawer.json`

**Interfaces:**
- Consumes: `useHrHandoff`, `useSendToHr`, `hrHandoffKey` (Task 6); `useCan` (`@hooks/useCan`); `openEdit(tab)` from `useCandidateEditUrl`.
- Produces: `<SendToHr candidateId stage onFix={(tab) => void} />`.

- [ ] **Step 1: Write the failing tests** — `SendToHr.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import messages from '@/messages/en/drawer.json'

import SendToHr from '..'

const state = { enabled: true, ready: true, missing: [] as string[], handed_off_at: null, delivery: null }
const mockUseHrHandoff = jest.fn()
jest.mock('@apis/recruit/hrHandoff.api', () => ({
  useHrHandoff: () => mockUseHrHandoff(),
  useSendToHr: () => ({ mutate: jest.fn(), isPending: false }),
  hrHandoffKey: (id: string) => ['recruit', 'candidate', id, 'hr-handoff']
}))
const mockCan = jest.fn()
jest.mock('@hooks/useCan', () => ({ useCan: (p: string) => mockCan(p) }))

const renderIt = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SendToHr candidateId="c1" stage="S6" onFix={jest.fn()} />
    </NextIntlClientProvider>
  )

beforeEach(() => {
  mockCan.mockImplementation((p: string) => p === 'CANDIDATE_HR_HANDOFF')
})

it('renders nothing when the feature is off', () => {
  mockUseHrHandoff.mockReturnValue({ data: { payload: { ...state, enabled: false } } })
  const { container } = renderIt()
  expect(container).toBeEmptyDOMElement()
})

it('renders nothing without the permission', () => {
  mockCan.mockReturnValue(false)
  mockUseHrHandoff.mockReturnValue({ data: { payload: state } })
  const { container } = renderIt()
  expect(container).toBeEmptyDOMElement()
})

it('enables the button when ready', () => {
  mockUseHrHandoff.mockReturnValue({ data: { payload: state } })
  renderIt()
  expect(screen.getByRole('button', { name: /send to hr/i })).toBeEnabled()
})

it('disables the button and lists what is missing, in plain words', () => {
  mockUseHrHandoff.mockReturnValue({
    data: { payload: { ...state, ready: false, missing: ['lo_type', 'phone:invalid', 'offer:not_signed_and_paid'] } }
  })
  renderIt()
  expect(screen.getByRole('button', { name: /send to hr/i })).toBeDisabled()
  expect(screen.getByText(messages.Drawer.hr_missing_lo_type)).toBeInTheDocument()
  expect(screen.getByText(messages.Drawer['hr_missing_phone:invalid'])).toBeInTheDocument()
  expect(screen.getByText(messages.Drawer['hr_missing_offer:not_signed_and_paid'])).toBeInTheDocument()
})

it('missingItems_renderEvenWithoutEditRight', () => {
  mockCan.mockImplementation((p: string) => p === 'CANDIDATE_HR_HANDOFF')
  mockUseHrHandoff.mockReturnValue({ data: { payload: { ...state, ready: false, missing: ['mailing_address:missing'] } } })
  renderIt()
  expect(screen.getByText(messages.Drawer['hr_missing_mailing_address:missing'])).toBeInTheDocument()
})

it('sentState_showsNoResendNote', () => {
  mockUseHrHandoff.mockReturnValue({
    data: { payload: { ...state, ready: false, missing: ['already_sent'], handed_off_at: '2026-09-24T03:00:00Z', delivery: 'pending' } }
  })
  renderIt()
  expect(screen.getByText(/sent to hr/i)).toBeInTheDocument()
  expect(screen.getByText(messages.Drawer.hr_sent_no_resend)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /send to hr/i })).not.toBeInTheDocument()
})

it('shows a failure when delivery failed', () => {
  mockUseHrHandoff.mockReturnValue({
    data: { payload: { ...state, ready: false, missing: ['already_sent'], handed_off_at: '2026-09-24T03:00:00Z', delivery: 'failed' } }
  })
  renderIt()
  expect(screen.getByText(messages.Drawer.hr_delivery_failed)).toBeInTheDocument()
})
```

(Match the drawer test's existing provider/mocking helpers if `CandidateDrawer.test.tsx` already wraps renders differently — read it first and reuse its wrapper.)

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/shared/components/SendToHr`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `src/shared/components/SendToHr/index.tsx`:

```tsx
'use client'

import { Alert, Button, List, Text } from '@mantine/core'
import { useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'

import { hrHandoffKey, useHrHandoff, useSendToHr } from '@apis/recruit/hrHandoff.api'

import { useCan } from '@hooks/useCan'
import { useToast } from '@hooks/useToast'

import type { EditTab } from '@components/CandidateEditModal/useCandidateEditUrl'

/** missing key → the profile tab that fixes it; keys absent here are text only (agentflow-dkt0). */
const FIX_TAB: Record<string, EditTab> = {
  first_name: 'identity',
  last_name: 'identity',
  email: 'identity',
  'phone:missing': 'identity',
  'phone:invalid': 'identity',
  nmls_id: 'licensing',
  lo_type: 'licensing',
  employment_type: 'licensing',
  'mailing_address:missing': 'mailing'
}

interface SendToHrProps {
  candidateId: string
  stage: string
  onFix: (tab: EditTab) => void
}

const SendToHr = ({ candidateId, stage, onFix }: SendToHrProps) => {
  const t = useTranslations('Drawer')
  const locale = useLocale()
  const canSend = useCan('CANDIDATE_HR_HANDOFF')
  const { data } = useHrHandoff(canSend && stage === 'S6' ? candidateId : null)
  const send = useSendToHr()
  const queryClient = useQueryClient()
  const toast = useToast()
  const state = data?.payload

  if (!canSend || stage !== 'S6' || !state?.enabled) return null

  if (state.handed_off_at) {
    const when = new Date(state.handed_off_at).toLocaleString(locale)
    return (
      <Alert color={state.delivery === 'failed' ? 'red' : 'green'} className="mb-3">
        <Text size="sm">{state.delivery === 'failed' ? t('hr_delivery_failed') : t('hr_sent_at', { when })}</Text>
        <Text size="xs" c="dimmed">{t('hr_sent_no_resend')}</Text>
      </Alert>
    )
  }

  const missing = state.missing.filter((key) => key !== 'already_sent')
  return (
    <div className="mb-3 flex flex-col gap-2">
      <Button
        size="compact-xs"
        color="success"
        disabled={!state.ready || send.isPending}
        onClick={() =>
          send.mutate(
            { candidateId },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: hrHandoffKey(candidateId) })
                toast.success(t('hr_sent_toast'))
              },
              onError: () => toast.error(t('hr_send_failed_toast'))
            }
          )
        }
      >
        {t('hr_send_button')}
      </Button>
      {missing.length > 0 && (
        <List size="xs">
          {missing.map((key) => (
            <List.Item key={key}>
              {FIX_TAB[key] ? (
                <button type="button" className="underline" onClick={() => onFix(FIX_TAB[key])}>
                  {t(`hr_missing_${key}`)}
                </button>
              ) : (
                t(`hr_missing_${key}`)
              )}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}

export default SendToHr
```

(Read `@hooks/useToast` for its exact API — replace `toast.success/error` with what it exposes. Confirm `@tanstack/react-query` is the query library `useApiQuery` wraps.)

`CandidateDrawer/index.tsx` — directly after the header `<div className="flex items-center gap-2 mb-3">…</div>` block (inside `{candidate && ( … )}`), add:

```tsx
            <SendToHr candidateId={candidate.id} stage={candidate.stage} onFix={(tab) => openEdit(tab)} />
```

with `import SendToHr from '@components/SendToHr'`. (Wrap the existing block and this in a fragment if needed.)

`drawer.json` (en), under `Drawer`:

```json
"hr_send_button": "Send to HR",
"hr_sent_at": "Sent to HR · {when}",
"hr_sent_no_resend": "Changes made after sending are not sent to HR again.",
"hr_delivery_failed": "Sending to HR failed. Ask an admin to check the handoff.",
"hr_sent_toast": "Sent to HR",
"hr_send_failed_toast": "Could not send to HR. Check what is missing and try again.",
"hr_missing_stage:not_joined": "The candidate is not in Joined yet",
"hr_missing_status:archived": "The candidate is archived",
"hr_missing_offer:not_signed_and_paid": "The offer is not signed and paid (or waived) yet",
"hr_missing_first_name": "First name is missing",
"hr_missing_last_name": "Last name is missing",
"hr_missing_email": "Personal email is missing",
"hr_missing_nmls_id": "NMLS number is missing",
"hr_missing_phone:missing": "Phone number is missing",
"hr_missing_phone:invalid": "Phone number is not a valid number",
"hr_missing_mailing_address:missing": "Mailing address is missing",
"hr_missing_lo_type": "1-1 outcome: loan officer type is missing",
"hr_missing_employment_type": "1-1 outcome: employment type is missing"
```

(vi):

```json
"hr_send_button": "Gửi sang HR",
"hr_sent_at": "Đã gửi HR · {when}",
"hr_sent_no_resend": "Thay đổi sau khi gửi sẽ không được gửi lại cho HR.",
"hr_delivery_failed": "Gửi sang HR bị lỗi. Nhờ admin kiểm tra.",
"hr_sent_toast": "Đã gửi sang HR",
"hr_send_failed_toast": "Chưa gửi được sang HR. Kiểm tra mục còn thiếu rồi thử lại.",
"hr_missing_stage:not_joined": "Ứng viên chưa ở trạng thái Joined",
"hr_missing_status:archived": "Ứng viên đã bị lưu trữ",
"hr_missing_offer:not_signed_and_paid": "Offer chưa được ký và trả phí (hoặc miễn phí)",
"hr_missing_first_name": "Thiếu tên",
"hr_missing_last_name": "Thiếu họ",
"hr_missing_email": "Thiếu email cá nhân",
"hr_missing_nmls_id": "Thiếu số NMLS",
"hr_missing_phone:missing": "Thiếu số điện thoại",
"hr_missing_phone:invalid": "Số điện thoại không hợp lệ",
"hr_missing_mailing_address:missing": "Thiếu địa chỉ nhận thư",
"hr_missing_lo_type": "Kết quả 1-1: thiếu loại Loan Officer",
"hr_missing_employment_type": "Kết quả 1-1: thiếu loại hình làm việc"
```

(If next-intl rejects `:` inside message keys, rename the keys by replacing `:` with `__` in both JSON files, and map with `t(\`hr_missing_${key.replace(':', '__')}\`)`; update the test lookups the same way.)

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/shared/components/SendToHr src/shared/components/CandidateDrawer src/messages` then `npx tsc --noEmit` and `npm run lint`
Expected: PASS, exit 0.

- [ ] **Step 5: Negative control** — remove the `stage !== 'S6'`/`!state?.enabled` guard → "renders nothing when the feature is off" FAILS. Restore.

- [ ] **Step 6: Commit, push, PR**

```bash
git add src
git commit -m "feat: Send to HR in the candidate drawer — disabled with reasons until ready [agentflow-dkt0]"
git push -u origin agent/agentflow-dkt0-send-to-hr
gh pr create --base master --title "feat: Send to HR — drawer action + 1-1 outcome selects [agentflow-dkt0]" --body-file <(printf '%s\n' "Implements Part 2 of docs/superpowers/plans/2026-09-24-hire-handoff-send-to-hr.md. Hidden until recruit.features.hr-handoff-publish is on." "" "🤖 Generated with [Claude Code](https://claude.com/claude-code)")
```

Two reviewers + CI green → merge.

---

## Part 3 — Data and contract

### Task 8: Re-import the pre-#363 rows (gated)

**Files:**
- Create (recruit-be, same PR as Part 1 or a follow-up): `scripts/moso-filter-dump.py`

**Interfaces:**
- Consumes: a dump directory produced by `scripts/moso-migration-runner.py --dump-only` (`<dir>/lo_recruiting/chunk-*.json`, each a JSON list of rows carrying `__key`).
- Produces: a filtered dump directory with only the listed keys, other kinds empty.

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""Keep only listed legacy keys from a moso-migration-runner dump (agentflow-dkt0).

Usage: moso-filter-dump.py --from /tmp/moso-dump --to /tmp/moso-dump-filtered --keys keys.txt
keys.txt: one legacy_key (MOSO __key) per line. Only kind lo_recruiting is kept; the other kinds
are written empty so --from-dir imports nothing else.
"""
import argparse
import json
import pathlib

KINDS = ["lo_recruiting", "black_list", "sms_opt_out", "email_opt_out", "call_opt_out"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--from", dest="src", required=True)
    p.add_argument("--to", dest="dst", required=True)
    p.add_argument("--keys", required=True)
    a = p.parse_args()
    keys = {line.strip() for line in pathlib.Path(a.keys).read_text().splitlines() if line.strip()}
    kept = []
    for chunk in sorted((pathlib.Path(a.src) / "lo_recruiting").glob("chunk-*.json")):
        kept += [row for row in json.loads(chunk.read_text()) if row.get("__key") in keys]
    for kind in KINDS:
        (pathlib.Path(a.dst) / kind).mkdir(parents=True, exist_ok=True)
    if kept:
        (pathlib.Path(a.dst) / "lo_recruiting" / "chunk-00000.json").write_text(json.dumps(kept))
    missing = keys - {row["__key"] for row in kept}
    print(f"kept {len(kept)} of {len(keys)} keys; not found in dump: {len(missing)}")
    for key in sorted(missing):
        print(f"  missing {key}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test the script offline**

```bash
mkdir -p /tmp/fd-in/lo_recruiting && echo '[{"__key":"a","x":1},{"__key":"b","x":2}]' > /tmp/fd-in/lo_recruiting/chunk-00000.json
printf 'b\nzzz\n' > /tmp/fd-keys.txt
python3 scripts/moso-filter-dump.py --from /tmp/fd-in --to /tmp/fd-out --keys /tmp/fd-keys.txt
cat /tmp/fd-out/lo_recruiting/chunk-00000.json   # expect [{"__key": "b", "x": 2}]; stdout says 1 of 2, missing zzz
```

- [ ] **Step 3: Build the target list on production (read-only)** — via the temporary `postgres:18-alpine` pod with `envFrom: recruit-svc-secret` and `PGOPTIONS='-c default_transaction_read_only=on'` (same method used 2026-09-23/24):

```sql
select c.legacy_key from candidates c
 where c.legacy_key is not null and c.merged_into_id is null
   and c.completed_detail_form is null and c.is_corporate_loan_officer is null and c.mailing_address is null
   and not exists (select 1 from candidate_change_log l where l.candidate_id = c.id)
 order by (c.stage = 'S6') desc, c.stage desc;
```

Save it as `keys.txt`, and save a snapshot of the same rows' `first_name,last_name,email,phone,nmls_id,company_name,licensed_states,sponsor_states,mailing_address,stage,status,owner_id` as `snapshot.csv` (psql `\copy (...) to stdout csv header`). Report the counts (total, S6) to Bao.

- [ ] **Step 4: STOP — ask Bao to approve** the list and counts. Do not continue without an explicit yes.

- [ ] **Step 5: Run** — dump from MOSO production, filter, import (the runner's own docstring shows how to pass the export cookie and `IMPORT_BEARER`):

```bash
python3 scripts/moso-migration-runner.py --dump-only --export-base https://www.loanfactory.com --dump-dir /tmp/moso-dump
python3 scripts/moso-filter-dump.py --from /tmp/moso-dump --to /tmp/moso-dump-filtered --keys keys.txt
python3 scripts/moso-migration-runner.py --from-dir /tmp/moso-dump-filtered --import-base <production gateway>/recruit-svc
```

- [ ] **Step 6: Report** — re-run the snapshot query into `after.csv`; diff per field against `snapshot.csv`; report to Bao how many rows gained an address / `completed_detail_form` / `is_corporate_loan_officer` and any other field that changed.

### Task 9: Tell HR — contract page

- [ ] **Step 1:** Update the artifact https://claude.ai/artifact/WU8fTVxCPcXhRDySf127rS (read it first with the Artifact tool, edit the saved HTML, republish to the same URL): add `lo_type` + `employment_type` rows (values as in Global Constraints) to the field table, JSON Schema and example; remove `is_corporate_loan_officer`; replace the lo_type question with "recruit now sends the 1-1 outcome"; state the handoff is sent by an Onboarding user pressing Send to HR, and "what HR still fills" no longer includes employment type.
- [ ] **Step 2:** Tell Bao the page changed so he can ping Hùng.

---

## Self-review notes

- Spec coverage: A → Task 8; B → Tasks 1, 2, 6; C → Tasks 3, 4, 7; D → Task 5; contract → Task 9. Rev 3.1 items: predicate (T3), enqueuer result + javadoc (T3), POST re-verify (T4), delivery state (T4, T7), archived/S7 (T4), tab links only for fixable keys (T7 `FIX_TAB`), en+vi strings (T6, T7), ONBOARDING grants (T1).
- Types: `enqueue`/`HrHandoffEnqueueResult`/`isEnabled` (T3) used in T4; `lo_type`/`employment_type` names identical in SQL, entity JSON, payload, FE types.
