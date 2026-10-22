#!/usr/bin/env python3
"""Replay rbac_roles INSERT / `permissions || '[...]'` UPDATE statements from Flyway migrations, in version order.

Usage: python3 -I simulate_role_seeds.py <migration_dir> <out_tsv>
Only handles the two DML shapes recruit-be uses (verified by grep: no DELETE/REPLACE of rbac_roles.permissions).
"""
import glob
import json
import os
import re
import sys

MIG, OUT = sys.argv[1], sys.argv[2]


def version(path):
    return int(re.match(r"V(\d+)", os.path.basename(path)).group(1))


roles, row_scope, provenance = {}, {}, {}
for path in sorted(glob.glob(os.path.join(MIG, "V*.sql")), key=version):
    sql = re.sub(r"--[^\n]*", "", open(path).read())
    v = "V%03d" % version(path)
    for stmt in re.findall(r"(INSERT INTO rbac_roles[^;]*;|UPDATE rbac_roles[^;]*;)", sql, re.S):
        if stmt.startswith("INSERT"):
            for code, perms in re.findall(r"\(\s*'[^']*'\s*,\s*'([A-Z_]+)'\s*,\s*'[^']*'\s*,\s*'(\[[^\]]*\])'", stmt):
                roles[code] = list(json.loads(perms))
                for p in roles[code]:
                    provenance.setdefault((code, p), v)
            for code, scope in re.findall(r"'([A-Z_]+)'\s*,\s*'[^']*'\s*,\s*'\[[^\]]*\]'::jsonb\s*,\s*'(\{[^}]*\})'", stmt):
                row_scope[code] = scope
        else:
            add = re.search(r"permissions\s*\|\|\s*'(\[[^\]]*\])'", stmt)
            if not add:
                print("UNHANDLED", v, stmt[:200], file=sys.stderr)
                continue
            where = re.search(r"WHERE\s+code\s*(=\s*'([A-Z_]+)'|IN\s*\(([^)]*)\))", stmt)
            codes = [where.group(2)] if where.group(2) else re.findall(r"'([A-Z_]+)'", where.group(3))
            for code in codes:
                if code not in roles:
                    print("UPDATE on unknown role", v, code, file=sys.stderr)
                    continue
                for p in json.loads(add.group(1)):
                    if p not in roles[code]:
                        roles[code].append(p)
                        provenance[(code, p)] = v

with open(OUT, "w") as f:
    f.write("role\tcount\trow_scope\tpermissions(seeding migration)\n")
    for code, perms in sorted(roles.items()):
        f.write(f"{code}\t{len(perms)}\t{row_scope.get(code, '')}\t"
                + " ".join(f"{p}({provenance[(code, p)]})" for p in perms) + "\n")
for code, perms in sorted(roles.items()):
    print(code, len(perms))
