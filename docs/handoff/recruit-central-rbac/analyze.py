#!/usr/bin/env python3
"""Stats + per-permission rollup from endpoints.tsv, role seeds and enum. Usage: python3 -I analyze.py <catalog_dir> <src_root>"""
import csv, os, re, sys
from collections import defaultdict
CAT, ROOT = sys.argv[1], sys.argv[2]
enum = re.findall(r'^\s{4}([A-Z_]+)[,;]', open(ROOT + '/src/main/java/com/loanfactory/recruit/rbac/model/RecruitPermission.java').read(), re.M)
rows = list(csv.DictReader(open(CAT + '/endpoints.tsv'), delimiter='\t'))
roles = {}
for r in csv.DictReader(open(CAT + '/role_seeds_from_migrations.tsv'), delimiter='\t'):
    roles[r['role']] = [p.split('(')[0] for p in r['permissions(seeding migration)'].split()]
gate, shape = defaultdict(list), defaultdict(list)
for r in rows:
    k = f"{r['method']} {r['path']}"
    for p in r['gate_permissions'].split('|'):
        if p in enum: gate[p].append(k)
    for p in r['shaping_permissions'].split('|'):
        if p in enum: shape[p].append(k)
app = [r for r in rows if not r['file:line'].startswith('tera-core')]
lib = [r for r in rows if r['file:line'].startswith('tera-core')]
def cnt(rs, pred): return sum(1 for r in rs if pred(r))
print('app endpoints', len(app), 'library', len(lib))
for label, rs in (('app', app), ('lib', lib)):
    print(label, 'PUBLIC', cnt(rs, lambda r: r['gate_permissions']=='PUBLIC'), 'INTERNAL', cnt(rs, lambda r: r['gate_permissions']=='INTERNAL'),
          'NONE', cnt(rs, lambda r: r['gate_permissions']=='NONE'), 'BLOCKED', cnt(rs, lambda r: r['gate_permissions']=='BLOCKED'),
          'gated', cnt(rs, lambda r: r['gate_permissions'] not in ('PUBLIC','INTERNAL','NONE','BLOCKED')),
          'multi-perm gate', cnt(rs, lambda r: '|' in r['gate_permissions']),
          'single gate + shaping', cnt(rs, lambda r: '|' not in r['gate_permissions'] and r['gate_permissions'] in enum and r['shaping_permissions']!='-'),
          'rowscope Y', cnt(rs, lambda r: r['row_scope_applies']=='Y'))
held = {p: sorted(rl for rl, ps in roles.items() if p in ps) for p in enum}
for rl in roles: pass
removed = {'HR','LICENSING','ACCOUNTING','OFFICER_RECRUITER'}
out = []
for p in enum:
    h = held[p]
    after = [x for x in h if x not in removed and x != 'ADMIN']
    out.append((p, len(gate[p]), len(shape[p]), ','.join(x for x in h if x!='ADMIN') or '(ADMIN * only)', 'ADMIN-only after removal' if not after else ''))
for o in out: print('\t'.join(map(str,o)))
import json
json.dump({'gate':gate,'shape':shape,'held':held}, open(CAT+'/rollup.json','w'), indent=1)
