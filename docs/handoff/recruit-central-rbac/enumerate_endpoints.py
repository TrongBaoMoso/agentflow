#!/usr/bin/env python3
"""Mechanical endpoint enumeration + permission trace for recruit-be.

Usage: python3 -I enumerate_endpoints.py <src_snapshot_root> <out_dir>
  <src_snapshot_root> = a `git archive origin/master src | tar -x` extraction (read-only copy).

Outputs:
  raw_endpoints.tsv  - one row per METHOD x path (mechanical; no classification)
  raw_trace.tsv      - one row per (endpoint, permission reference reached from the handler)
  per_controller.txt - endpoint count per controller
"""
import os
import re
import sys
from collections import defaultdict

ROOT = sys.argv[1]
OUT = sys.argv[2]
JAVA = os.path.join(ROOT, "src/main/java")
PKG_PREFIX = os.path.join(JAVA, "com/loanfactory/recruit") + "/"
MAX_DEPTH = 4

MAPPING_RE = re.compile(r"@(Get|Post|Put|Patch|Delete|Request)Mapping\b")
HTTP = {"Get": "GET", "Post": "POST", "Put": "PUT", "Patch": "PATCH", "Delete": "DELETE"}


def strip_comments(src):
    """Blank out comments (keep newlines so line numbers survive). Strings are kept."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if src.startswith("//", i):
            j = src.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r"[^\n]", " ", src[i:j]))
            i = j
        elif src.startswith('"""', i):
            j = src.find('"""', i + 3)
            j = n if j < 0 else j + 3
            out.append(src[i:j])
            i = j
        elif c == '"':
            j = i + 1
            while j < n and src[j] != '"':
                j += 2 if src[j] == "\\" else 1
            out.append(src[i:j + 1])
            i = j + 1
        elif c == "'":
            j = i + 1
            while j < n and src[j] != "'":
                j += 2 if src[j] == "\\" else 1
            out.append(src[i:j + 1])
            i = j + 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def blank_strings(src):
    src = re.sub(r"'(?:\\.|[^'\\])'", "' '", src)
    return re.sub(r'"(?:\\.|[^"\\])*"', lambda m: '"' + " " * (len(m.group(0)) - 2) + '"', src)


def line_of(src, pos):
    return src.count("\n", 0, pos) + 1


def match_paren(src, start):
    """src[start] == '(' ; return index of matching ')'."""
    depth = 0
    i = start
    while i < len(src):
        if src[i] == "(":
            depth += 1
        elif src[i] == ")":
            depth -= 1
            if depth == 0:
                return i
        elif src[i] == "'" and src[i + 2:i + 3] == "'":
            i += 2
        elif src[i] == '"':
            i += 1
            while i < len(src) and src[i] != '"':
                i += 2 if src[i] == "\\" else 1
        i += 1
    return -1


def match_brace(src, start):
    depth = 0
    for i in range(start, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return i
    return -1


class JClass:
    def __init__(self, name, path, src, bsrc):
        self.name, self.path, self.src, self.bsrc = name, path, src, bsrc
        self.supers = []
        self.fields = {}
        self.methods = defaultdict(list)  # name -> [(start_pos, body_start, body_end)]
        self.perm_consts = {}


CLASSES = {}
IMPLS = defaultdict(list)


def parse_file(path):
    raw = open(path, encoding="utf-8").read()
    src = strip_comments(raw)
    bsrc = blank_strings(src)
    m = re.search(r"\b(class|interface|enum|record)\s+(\w+)([^{]*)\{", bsrc)
    if not m:
        return
    cls = JClass(m.group(2), path, src, bsrc)
    header = m.group(3)
    for kw in ("extends", "implements"):
        hm = re.search(kw + r"\s+([\w<>,.\s?]+?)(?=\b(?:implements|extends)\b|$)", header)
        if hm:
            for t in re.split(r",(?![^<]*>)", hm.group(1)):
                t = re.sub(r"<.*", "", t).strip().split(".")[-1]
                if t:
                    cls.supers.append(t)
    # fields (class body level, approximate: any "private final Type name;" or "Type name =")
    for fm in re.finditer(r"(?:private|protected|public)\s+(?:static\s+)?(?:final\s+)?([\w.]+)(?:<[^;=]*?>)?\s+(\w+)\s*[;=]", bsrc):
        cls.fields[fm.group(2)] = fm.group(1).split(".")[-1]
    for cm in re.finditer(r"RecruitPermission\s+(\w+)\s*=\s*RecruitPermission\.(\w+)", bsrc):
        cls.perm_consts[cm.group(1)] = cm.group(2)
    # methods: an identifier followed by (...) then optional throws then '{'
    for mm in re.finditer(r"\b(\w+)\s*\(", bsrc):
        name = mm.group(1)
        if name in ("if", "for", "while", "switch", "catch", "synchronized", "return", "new", "else", "try"):
            continue
        close = match_paren(bsrc, mm.end() - 1)
        if close < 0:
            continue
        rest = bsrc[close + 1: close + 300]
        rm = re.match(r"\s*(?:throws\s+[\w.,\s]+)?\{", rest)
        if not rm:
            continue
        # must look like a declaration: preceded by a type token, not '.' or '=' / 'new'
        before = bsrc[max(0, mm.start() - 120): mm.start()]
        if re.search(r"(\.|new\s+|=\s*|->\s*|return\s+)$", before) or not re.search(r"[\w>\]]\s+$", before):
            continue
        body_start = close + 1 + rm.end() - 1
        body_end = match_brace(bsrc, body_start)
        cls.methods[name].append((mm.start(), body_start, body_end))
    CLASSES.setdefault(cls.name, cls)
    for s in cls.supers:
        IMPLS[s].append(cls.name)


for dp, _, fns in os.walk(JAVA):
    for fn in fns:
        if fn.endswith(".java"):
            parse_file(os.path.join(dp, fn))


PERM_CALL_RE = re.compile(r"\b(require|requireAny|hasPermission|usersWith|effectiveGrants|roleCodes|usersWithRole)\s*\(")
PERM_REF_RE = re.compile(r"RecruitPermission\.([A-Z_]+)\b")
DYN_RE = re.compile(r"\b(checklistItemManageFor|checklistTemplateManageFor)\s*\(")


def resolve_type(tname):
    """concrete classes to search for a call on type tname."""
    out = []
    if tname in CLASSES:
        out.append(tname)
    for impl in IMPLS.get(tname, []):
        out.append(impl)
        out.extend(IMPLS.get(impl, []))
    return out


def scan_body(cls, b0, b1, depth, chain, seen, hits):
    body = cls.bsrc[b0:b1]
    body_src = cls.src[b0:b1]
    # permission references with their line
    lines = body_src.split("\n")
    first_line = line_of(cls.src, b0)
    for i, ln in enumerate(lines):
        refs = PERM_REF_RE.findall(ln)
        for const, perm in cls.perm_consts.items():
            if re.search(r"\b" + const + r"\b", ln) and "RecruitPermission " + const not in ln:
                refs.append(perm)
        calls = PERM_CALL_RE.findall(ln)
        dyn = DYN_RE.findall(ln)
        if refs or dyn or ("roleCodes" in calls) or ("usersWithRole" in calls):
            ctx = " ".join(x.strip() for x in lines[max(0, i - 1): i + 3])
            rel = cls.path.replace(PKG_PREFIX, "")
            for p in (refs or ["<dyn:" + ",".join(dyn) + ">" if dyn else "<role-codes>"]):
                hits.append((p, ",".join(calls) or "-", depth, " > ".join(chain), f"{rel}:{first_line + i}", ctx[:300]))
    if depth >= MAX_DEPTH:
        return
    # follow calls
    for cm in re.finditer(r"(?:\b(\w+)\s*\.\s*)?\b(\w+)\s*\(", body):
        recv, meth = cm.group(1), cm.group(2)
        targets = []
        if recv is None or recv == "this":
            if meth in cls.methods:
                targets = [cls.name]
            else:
                targets = [s for s in cls.supers if s in CLASSES]
        elif recv in cls.fields:
            targets = resolve_type(cls.fields[recv])
        elif recv[0].isupper() and recv in CLASSES:
            targets = [recv]
        for t in targets:
            tc = CLASSES.get(t)
            if not tc or meth not in tc.methods:
                continue
            if t in ("AccessControlServiceImpl", "AccessControlService"):
                continue
            key = (t, meth)
            if key in seen:
                continue
            seen.add(key)
            for (_, s0, s1) in tc.methods[meth]:
                scan_body(tc, s0 + 1, s1, depth + 1, chain + [f"{t}.{meth}"], seen, hits)


def ann_values(text):
    """Return list of path strings and request methods from an annotation argument text."""
    paths, methods = [], []
    if text is None:
        return [""], methods
    for mm in re.finditer(r"RequestMethod\.(\w+)", text):
        methods.append(mm.group(1))
    named = re.search(r"\b(?:value|path)\s*=\s*(\{[^}]*\}|\"[^\"]*\")", text)
    if named:
        paths = re.findall(r'"([^"]*)"', named.group(1))
    else:
        stripped = text.strip()
        if stripped.startswith("{") or stripped.startswith('"'):
            head = stripped if stripped.startswith('"') else stripped[: stripped.find("}") + 1]
            if stripped.startswith('"'):
                head = re.match(r'"[^"]*"', stripped).group(0)
            paths = re.findall(r'"([^"]*)"', head)
        # constants as values are flagged
        elif re.match(r"[A-Z_]+", stripped):
            paths = ["<CONST:" + stripped + ">"]
    return paths or [""], methods


endpoints = []
per_controller = defaultdict(int)
for cname, cls in sorted(CLASSES.items()):
    if not re.search(r"@(Rest)?Controller\b", cls.bsrc):
        continue
    src = cls.src
    decl = re.search(r"\b(class)\s+" + cname + r"\b", cls.bsrc)
    # class-level @RequestMapping (before class decl)
    prefixes = [""]
    for am in MAPPING_RE.finditer(src[: decl.start()]):
        if am.group(1) == "Request":
            p = am.end()
            arg = src[p + 1: match_paren(src, p)] if src[p:p + 1] == "(" else None
            prefixes, _ = ann_values(arg)
    body_from = decl.end()
    for am in MAPPING_RE.finditer(src, body_from):
        kind = am.group(1)
        p = am.end()
        arg = None
        end = p
        if src[p:p + 1] == "(":
            close = match_paren(src, p)
            arg = src[p + 1: close]
            end = close + 1
        paths, rmethods = ann_values(arg)
        verbs = [HTTP[kind]] if kind != "Request" else (rmethods or ["ANY"])
        hm = re.search(r"\b(\w+)\s*\(", re.sub(r"@[\w.]+(\s*\((?:[^()]|\([^()]*\))*\))?", lambda m: " " * len(m.group(0)), cls.bsrc[end:end + 1500]))
        mname = hm.group(1) if hm else "?"
        mstart = end + (hm.start() if hm else 0)
        handler = None
        for (s, b0, b1) in cls.methods.get(mname, []):
            if s >= end:
                handler = (b0, b1)
                break
        hits = []
        if handler:
            scan_body(cls, handler[0] + 1, handler[1], 0, [f"{cname}.{mname}"], set(), hits)
        rel = cls.path.replace(PKG_PREFIX, "")
        ln = line_of(src, am.start())
        for pre in prefixes:
            for pth in paths:
                full = "/" + "/".join(x.strip("/") for x in (pre, pth) if x.strip("/"))
                for v in verbs:
                    endpoints.append((v, full, f"{cname}#{mname}", f"{rel}:{ln}", hits))
                    per_controller[cname] += 1

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "raw_endpoints.tsv"), "w") as f:
    f.write("method\tpath\thandler\tfile_line\tperm_refs_reached\n")
    for v, p, h, fl, hits in endpoints:
        perms = sorted({x[0] for x in hits})
        f.write(f"{v}\t{p}\t{h}\t{fl}\t{'|'.join(perms) or 'NONE'}\n")
with open(os.path.join(OUT, "raw_trace.tsv"), "w") as f:
    f.write("method\tpath\tpermission\tcalls_on_line\tdepth\tchain\tat\tcontext\n")
    for v, p, h, fl, hits in endpoints:
        for perm, calls, depth, chain, at, ctx in hits:
            f.write(f"{v}\t{p}\t{perm}\t{calls}\t{depth}\t{chain}\t{at}\t{ctx}\n")
with open(os.path.join(OUT, "per_controller.txt"), "w") as f:
    for c, n in sorted(per_controller.items()):
        f.write(f"{n}\t{c}\n")
    f.write(f"{sum(per_controller.values())}\tTOTAL ({len(per_controller)} controllers)\n")
print("controllers", len(per_controller), "endpoints", len(endpoints))
