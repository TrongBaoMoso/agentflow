#!/usr/bin/env python3
"""Render the per-permission section of permissions.md. Usage: python3 -I render_permissions.py <catalog_dir> <src_root>"""
import csv, json, re, sys
from collections import defaultdict
CAT, ROOT = sys.argv[1], sys.argv[2]
enum = re.findall(r'^\s{4}([A-Z_]+)[,;]', open(ROOT + '/src/main/java/com/loanfactory/recruit/rbac/model/RecruitPermission.java').read(), re.M)
roll = json.load(open(CAT + '/rollup.json'))
refs = defaultdict(list)
for line in open(CAT + '/all_perm_refs.tsv'):
    loc, p = line.rstrip('\n').split('\t')
    refs[p].append(loc)
fe = {l.split('\t')[0]: l.split('\t')[1] for l in open(CAT + '/fe_refs.txt')}
rows = {f"{r['method']} {r['path']}": r for r in csv.DictReader(open(CAT + '/endpoints.tsv'), delimiter='\t')}
REMOVED = {'HR', 'LICENSING', 'ACCOUNTING', 'OFFICER_RECRUITER'}
out = []
for p in enum:
    held = [r for r in roll['held'][p] if r != 'ADMIN']
    after = [r for r in held if r not in REMOVED]
    gates = roll['gate'].get(p, [])
    sole = [k for k in gates if rows[k]['gate_permissions'] == p]
    shared = [k for k in gates if rows[k]['gate_permissions'] != p]
    out.append(f"### {p}\n")
    out.append(f"- Roles (besides ADMIN `*`): {', '.join(held) or 'none - ADMIN wildcard only'}"
               + (f"  \n  After removing HR/LICENSING/ACCOUNTING/OFFICER_RECRUITER: {', '.join(after) or '**ADMIN only**'}" if held != after else ""))
    out.append(f"- Sole gate on {len(sole)} endpoint(s):" + ("" if sole else " none"))
    out += [f"  - `{k}`" for k in sole]
    if shared:
        out.append(f"- Shares the gate with other permissions on {len(shared)} endpoint(s):")
        out += [f"  - `{k}` - gate `{rows[k]['gate_permissions']}`" for k in shared]
    sh = roll['shape'].get(p, [])
    if sh:
        out.append(f"- Shaping on {len(sh)} endpoint(s): " + ", ".join(f"`{k}`" for k in sh))
    out.append(f"- Code references ({len(refs[p])}): " + ", ".join(refs[p]))
    out.append(f"- recruit-fe non-test files referencing it: {fe.get(p, '?')}\n")
open(CAT + '/permissions_section.md', 'w').write('\n'.join(out) + '\n')
print(len(enum))
