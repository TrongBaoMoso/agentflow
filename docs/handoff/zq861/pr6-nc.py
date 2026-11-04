#!/usr/bin/env python3
"""Negative controls for PR6: apply one mutation, run its target test, record, restore with git checkout."""
import glob, os, re, subprocess, sys

REPO = "/Users/apple/Projects/agentflow/.worktrees/recruit-be-hh-pr6"
M = "src/main/java/com/loanfactory/recruit/"
OUT = "/private/tmp/claude-501/-Users-apple-Projects-agentflow/a50f3619-2b8f-47f8-9f0c-b8d0e6887344/scratchpad/nc-results.txt"

# (id, file, old, new, task, test filter)
CONTROLS = {
 "unit": [
  ("G1 count mismatch", M+"headhunter/program/RosterGuard.java", "if (roster.members().size() != roster.counts().keyedPeople()) {", "if (false) {", "test", "*RosterGuardTest"),
  ("G2 duplicate key", M+"headhunter/program/RosterGuard.java", "if (byKey.put(member.mosoKey(), member) != null) {", "if (byKey.put(member.mosoKey(), member) != null && false) {", "test", "*RosterGuardTest"),
  ("G3 unknown status", M+"headhunter/program/RosterGuard.java", "if (!ProgramSyncSettings.KNOWN_STATUSES.contains(member.status())) {", "if (false) {", "test", "*RosterGuardTest"),
  ("G4 team lead invalid", M+"headhunter/program/RosterGuard.java", "if (!member.approved() || lead.equals(member.mosoKey()) || leader == null || !leader.approved()) {", "if (false) {", "test", "*RosterGuardTest"),
  ("G5 too many members", M+"headhunter/program/RosterGuard.java", "if (roster.members().size() > maxMembers) {", "if (false) {", "test", "*RosterGuardTest"),
  ("G6 stale vs last applied", M+"headhunter/program/RosterGuard.java", "if (lastAppliedGeneratedAt != null && !roster.generatedAt().isAfter(lastAppliedGeneratedAt)) {", "if (false) {", "test", "*RosterGuardTest"),
  ("G7 overlong key", M+"headhunter/program/MosoAidRosterClient.java", "if (key.isBlank() || key.length() > MAX_KEY_LENGTH) {", "if (false) {", "test", "*MosoAidRosterClientTest"),
  ("G8 program mismatch", M+"headhunter/program/MosoAidRosterClient.java", "if (!answeredProgram.equals(programId)) {", "if (false) {", "test", "*MosoAidRosterClientTest"),
  ("G9 https only", M+"headhunter/program/MosoAidRosterClient.java", "return \"http\".equalsIgnoreCase(uri.getScheme()) && (host.endsWith", "return true || (host.endsWith", "test", "*MosoAidRosterClientTest"),
  ("P1 only provisioned removed", M+"headhunter/program/ProgramRolePlan.java", "} else if (provision != null && !provision.removedByHand()) {", "} else if (held.contains(role)) {", "test", "*ProgramRolePlanTest"),
  ("P2 removed-by-hand never re-added", M+"headhunter/program/ProgramRolePlan.java", "if (provision != null && (provision.removedByHand() || !held.contains(role))) {", "if (false) {", "test", "*ProgramRolePlanTest"),
  ("S1 email change suspends", M+"headhunter/program/ProgramSyncService.java", "if (!email.equals(row.confirmedCompanyEmail())) {", "if (false) {", "test", "*ProgramSyncRulesTest"),
  ("S2 outage never suspends", M+"headhunter/program/ProgramSyncService.java", "if (observed != null && !observed.isEmpty() && confirmed != null", "if (observed != null && confirmed != null", "test", "*ProgramSyncRulesTest"),
  ("T1 bound-without-role scoped", M+"headhunter/scope/CandidateRowScopeService.java", "if (!programTrust.isCurrentMember(userId)) {", "if (true) {", "test", "*CandidateRowScopeServiceTest"),
  ("T2 team keys only for ORIGIN_TEAM", M+"headhunter/scope/CandidateRowScopeService.java", "if (RowScope.ORIGIN_TEAM.equals(mode)) {", "if (true) {", "test", "*CandidateRowScopeServiceTest"),
  ("T3 TL refused on own team", M+"headhunter/invite/ProgramInviteReview.java", "if (programTrust.teamKeys(actorId).contains(collectorKey)) {", "if (false) {", "test", "*ProgramInviteReviewTest"),
  ("T4 lazy key is an interest", M+"headhunter/invite/ProgramInviteReview.java", "if (collectorKey.equals(own) || programTrust.interestKeys(actorId).contains(collectorKey)) {", "if (collectorKey.equals(own)) {", "test", "*ProgramInviteReviewTest"),
 ],
 "it": [
  ("R1 confirmed-only key (scope)", M+"headhunter/program/ProgramTrustReader.java", "+ \"AND ri.link_source = 'ADMIN_CONFIRMED'\" + NOT_SUSPENDED, String.class, userId)", "+ \"AND ri.link_source <> 'X'\", String.class, userId)", "integrationTest", "*ProgramMemberLinkIT.lazyAndRevokedRowsGiveNothing"),
  ("R2 confirmed-only key->user (auto-own, credit)", M+"headhunter/program/ProgramTrustReader.java", "+ \"AND ri.link_source = 'ADMIN_CONFIRMED'\" + NOT_SUSPENDED, String.class, key)", "+ \"AND ri.link_source <> 'X'\", String.class, key)", "integrationTest", "*ProgramMemberLinkIT.lazyAndRevokedRowsGiveNothing"),
  ("R3 suspended gives no key", M+"headhunter/program/ProgramTrustReader.java", "+ \"AND ri.link_source = 'ADMIN_CONFIRMED'\" + NOT_SUSPENDED, String.class, userId)", "+ \"AND ri.link_source = 'ADMIN_CONFIRMED'\", String.class, userId)", "integrationTest", "*ProgramSyncTickIT.suspensionFreezesThenReleases"),
  ("D1 zero approved", M+"headhunter/program/ProgramSyncService.java", "if (roster.counts().approved() == 0 && activeProvisioned > 0) {", "if (false) {", "integrationTest", "*ProgramSyncTickIT.everyGuardChangesNothing"),
  ("D2 max grants", M+"headhunter/program/ProgramSyncService.java", "if (grants > maxGrants) {", "if (false) {", "integrationTest", "*ProgramSyncTickIT.maxGrants"),
  ("D3 max revokes", M+"headhunter/program/ProgramSyncService.java", "if (revokes > maxRevokes || (activeProvisioned >= minBase", "if (false && (activeProvisioned >= minBase", "integrationTest", "*ProgramSyncTickIT.volumeGuards"),
  ("D4 absent needs N ticks", M+"headhunter/program/ProgramSyncService.java", "final boolean gone = seen == null ? row.absentTicks() + 1 >= absentThreshold || !row.approved()", "final boolean gone = seen == null ? true", "integrationTest", "*ProgramSyncTickIT.absentNeedsTwoTicks"),
  ("D5 DRY_RUN writes no access", M+"headhunter/program/ProgramSyncService.java", "if (mode == ProgramSyncMode.APPLY) {\n            apply(", "if (true) {\n            apply(", "integrationTest", "*ProgramSyncTickIT.offAndDryRun"),
  ("D6 removed-by-hand hook", M+"rbac/service/impl/RbacAdminServiceImpl.java", "        markProgramRolesRemovedByHand(userId, rolesBefore, saved.getRoleCodes());\n", "", "integrationTest", "*ProgramSyncTickIT.removedByHandNotReAdded"),
  ("D7 release window", M+"headhunter/program/ProgramSyncService.java", "&& !row.suspendedAt().plus(releaseAfter).isAfter(now));", ");", "integrationTest", "*ProgramSyncTickIT.suspensionFreezesThenReleases"),
  ("L1 created after approval", M+"headhunter/program/ProgramMemberLinkService.java", "if (createdAfter && override == null) {", "if (false) {", "integrationTest", "*ProgramMemberLinkIT.linkRefusals"),
  ("L2 own account 403", M+"headhunter/program/ProgramMemberLinkService.java", "if (userId.equals(adminId)) {", "if (false) {", "integrationTest", "*ProgramMemberLinkIT.linkRefusals"),
  ("L3 unknown creation time", M+"headhunter/program/ProgramMemberLinkService.java", "if (created == null) {", "if (false) {", "integrationTest", "*ProgramMemberLinkIT.linkRefusals"),
  ("L4 not approved", M+"headhunter/program/ProgramMemberLinkService.java", "if (!row.approved() || row.absentTicks() > 0) {", "if (false) {", "integrationTest", "*ProgramMemberLinkIT.linkRefusals"),
  ("L5 exact email (no +tag)", M+"headhunter/program/ProgramMemberLinkService.java", "if (email.equals(ProgramSyncService.normaliseEmail(user.email()))", "if (true", "integrationTest", "*ProgramMemberLinkIT.linkRefusals"),
  ("L6 unlink releases", M+"headhunter/program/ProgramSyncService.java", "return new Revoked(plan, leadRelease.release(userId));", "return new Revoked(plan, new ProgramLeadRelease.Result(java.util.List.of(), java.util.List.of()));", "integrationTest", "*ProgramMemberLinkIT.unlinkReleases"),
  ("L7 team keys one hop/own team", M+"headhunter/program/ProgramTrustReader.java", "WHERE m.program_id = ? AND m.team_lead_moso_key = ? AND m.moso_key <> ?", "WHERE m.program_id = ? AND (m.team_lead_moso_key = ? OR true) AND m.moso_key <> ?", "integrationTest", "*ProgramMemberLinkIT.teamLeadReadsTeam"),
  ("L8 member scoped without role (IT)", M+"headhunter/scope/CandidateRowScopeService.java", "if (!programTrust.isCurrentMember(userId)) {", "if (true) {", "integrationTest", "*ProgramMemberLinkIT.boundWithoutRoleStaysScoped"),
 ],
}


def run(task, filt):
    gate = os.path.expanduser("~/.claude/bin/ram-gate")
    kind = "gradle-it" if task == "integrationTest" else "gradle"
    tok = subprocess.run([gate, "acquire", kind, "pr6-nc", "--wait", "900"], capture_output=True, text=True)
    if tok.returncode != 0:
        return "DENIED"
    try:
        for f in glob.glob(REPO + "/build/test-results/%s/*.xml" % task):
            os.remove(f)
        subprocess.run(["./gradlew", "--no-daemon", "-q", task, "--tests", filt], cwd=REPO,
                       capture_output=True, text=True)
        total = failed = 0
        names = []
        for f in glob.glob(REPO + "/build/test-results/%s/*.xml" % task):
            s = open(f).read()
            m = re.search(r'tests="(\d+)" skipped="\d+" failures="(\d+)" errors="(\d+)"', s)
            if m:
                total += int(m[1]); failed += int(m[2]) + int(m[3])
            names += re.findall(r'<testcase name="([^"]+)"[^>]*>\s*<(?:failure|error)', s)
        return "%d/%d red %s" % (failed, total, [n[:60] for n in names])
    finally:
        subprocess.run([gate, "release", tok.stdout.strip()])


def main(group):
    for cid, path, old, new, task, filt in CONTROLS[group]:
        full = os.path.join(REPO, path)
        src = open(full).read()
        if old not in src:
            line = "%s | MUTATION NOT FOUND" % cid
        else:
            open(full, "w").write(src.replace(old, new, 1))
            try:
                line = "%s | %s | %s" % (cid, filt, run(task, filt))
            finally:
                subprocess.run(["git", "-C", REPO, "checkout", "--", path])
        print(line, flush=True)
        open(OUT, "a").write(line + "\n")
    st = subprocess.run(["git", "-C", REPO, "status", "--porcelain", "src"], capture_output=True, text=True).stdout
    print("tree clean" if not st.strip() else "TREE DIRTY:\n" + st)


def cli():
    cmd, group = sys.argv[1], sys.argv[2]
    if cmd == "count":
        print(len(CONTROLS[group])); return
    cid, path, old, new, task, filt = CONTROLS[group][int(sys.argv[3])]
    full = os.path.join(REPO, path)
    if cmd == "meta":
        print("%s\t%s" % (task, filt)); return
    if cmd == "apply":
        src = open(full).read()
        if old not in src:
            print("MISSING"); sys.exit(1)
        open(full, "w").write(src.replace(old, new, 1)); print("applied"); return
    if cmd == "report":
        total = failed = 0; names = []
        for f in glob.glob(REPO + "/build/test-results/%s/*.xml" % task):
            x = open(f).read()
            m = re.search(r'tests="(\d+)" skipped="\d+" failures="(\d+)" errors="(\d+)"', x)
            if m:
                total += int(m[1]); failed += int(m[2]) + int(m[3])
            names += re.findall(r'<testcase name="([^"]+)"[^>]*>\s*<(?:failure|error)', x)
        line = "%s | %s | %d/%d red %s" % (cid, filt, failed, total, [n[:60] for n in names])
        print(line); open(OUT, "a").write(line + "\n")


if __name__ == "__main__":
    cli()
