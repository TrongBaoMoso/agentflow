#!/usr/bin/env python3
"""
P4 S5 PDF comparison: the Loan Officer agreements Recruit sends through document-esign (DE) vs the MOSO PDFs.

Stdlib + poppler (pdftotext, pdftoppm). No secret is read or stored: DE's internal door trusts X-Service-Source
(owner decision 2026-10-06), reached through `kubectl port-forward` to its ClusterIP.

Sub-commands (run in this order; see P4-S4S5.md "PDF comparison"):

  rule      Check that recruit-be's rule gives each fixture combo its expected documents (offline, no network).
  collect   For each Recruit offer id, read its RECRUIT envelopes from DE and download the UNSIGNED renders DE made
            (sessions[].generatedFileId): the exact PDFs the Loan Officer is asked to sign. No send, no Inkless call.
  cancel    Cancel the collected envelopes that are still open (never one already signed). Unsigned Inkless
            envelopes are not billed (Inkless charges COMPLETED only), and cancelling keeps DE tidy.
  compare   Side-by-side text diff + page images, DE vs MOSO, per document, into one HTML page.

Guard: `collect` and `cancel` refuse to run unless --i-know-de-has-138 is passed, so nothing touches DE before the
RECRUIT caller (DE #138) is on DE staging.
"""
import argparse
import difflib
import html
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = ["1099_agreement_form_finalized", "w2_agreement_form_finalized", "ca_compliance_statement",
        "exclusive_agent_agreement"]
HEADERS = {"X-Service-Source": "RECRUIT", "X-Acting-User": "system:recruit-pdf-compare", "Accept": "application/json"}


# ── the rule (a copy of recruit-be RequiredAgreementDocs, checked against the fixture) ──────────────────────────
def required(corporate, sponsor_states, has_dre_endorsed, licensed_states):
    up = lambda xs: {s.strip().upper() for s in (xs or []) if s}
    docs = ["w2_agreement_form_finalized" if corporate else "1099_agreement_form_finalized"]
    if "CA" in up(sponsor_states) and has_dre_endorsed is not True:
        docs.append("ca_compliance_statement")
    if not corporate and up(licensed_states) & {"VA", "MS"}:
        docs.append("exclusive_agent_agreement")
    return docs


def cmd_rule(_args):
    combos = json.load(open(os.path.join(HERE, "combos.json")))["combos"]
    bad = 0
    for c in combos:
        got = required(c["corporate"], c["sponsor_states"], c["has_dre_endorsed"], c["licensed_states"])
        ok = got == c["expect"]
        bad += not ok
        print(f"{'OK ' if ok else 'BAD'} {c['id']:16} {got}")
    return 1 if bad else 0


# ── DE internal door ──────────────────────────────────────────────────────────────────────────────────────────
def de(base, method, path, raw=False):
    req = urllib.request.Request(base.rstrip("/") + path, method=method, headers=HEADERS,
                                 data=b"" if method == "POST" else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            return body if raw else json.loads(body or b"null")
    except urllib.error.HTTPError as e:
        code = None
        try:
            code = json.loads(e.read()).get("code")
        except Exception:  # noqa: BLE001 - only the code is ever shown, never the message
            pass
        sys.exit(f"DE answered HTTP {e.code} code={code} for {method} {path}")


def envelopes_of(base, offer_id):
    return de(base, "GET", f"/internal/api/v1/esign/envelopes?serviceType=RECRUIT&parentId={offer_id}")


def require_138(args):
    if not args.i_know_de_has_138:
        sys.exit("Refusing: pass --i-know-de-has-138 only once document-esign #138 is deployed on DE staging.")


def cmd_collect(args):
    require_138(args)
    out = os.path.join(args.out, "de")
    os.makedirs(out, exist_ok=True)
    manifest = []
    for item in args.offer:
        combo, offer_id = item.split("=", 1)
        live = [e for e in envelopes_of(args.de, offer_id) if e.get("status") in ("SENT", "SIGNED", "COMPLETED")]
        if not live:
            print(f"{combo}: no live envelope for offer {offer_id} (ask the portal for the signing link first)")
            continue
        env = live[0]
        codes = []
        for s in sorted(env.get("sessions") or [], key=lambda s: s.get("documentOrder") or 0):
            code, fid = s.get("templateCode"), s.get("generatedFileId")
            if not fid:
                continue
            pdf = de(args.de, "GET", f"/internal/api/v1/dms/files/{fid}/content", raw=True)
            path = os.path.join(out, f"{combo}__{code}.pdf")
            open(path, "wb").write(pdf)
            codes.append(code)
        manifest.append({"combo": combo, "offer": offer_id, "envelope": env["id"], "status": env.get("status"),
                         "documents": codes})
        print(f"{combo}: envelope {env['id']} {env.get('status')} -> {codes}")
    json.dump(manifest, open(os.path.join(args.out, "manifest.json"), "w"), indent=2)
    return 0


def cmd_cancel(args):
    require_138(args)
    manifest = json.load(open(os.path.join(args.out, "manifest.json")))
    for m in manifest:
        if m["status"] != "SENT":
            print(f"{m['combo']}: {m['status']}, left alone")
            continue
        de(args.de, "POST", f"/internal/api/v1/esign/envelopes/{m['envelope']}/cancel")
        print(f"{m['combo']}: envelope {m['envelope']} cancelled")
    return 0


# ── comparison page ───────────────────────────────────────────────────────────────────────────────────────────
def text_of(pdf):
    raw = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in raw.splitlines()]
    return [ln for ln in lines if ln]


def pages_of(pdf, prefix):
    subprocess.run(["pdftoppm", "-png", "-r", "60", pdf, prefix], check=True)
    d = os.path.dirname(prefix)
    base = os.path.basename(prefix)
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.startswith(base + "-") and f.endswith(".png"))


def cmd_compare(args):
    de_dir = os.path.join(args.out, "de")
    img_dir = os.path.join(args.out, "img")
    os.makedirs(img_dir, exist_ok=True)
    sections, summary = [], []
    for code in DOCS:
        moso = os.path.join(args.moso, f"{code}.pdf")
        de_files = sorted(f for f in os.listdir(de_dir) if f.endswith(f"__{code}.pdf")) if os.path.isdir(de_dir) else []
        if not de_files or not os.path.exists(moso):
            summary.append((code, "missing " + ("DE" if not de_files else "MOSO") + " PDF", None))
            continue
        de_pdf = os.path.join(de_dir, de_files[0])
        a, b = text_of(moso), text_of(de_pdf)
        ratio = difflib.SequenceMatcher(None, a, b).ratio()
        table = difflib.HtmlDiff(wrapcolumn=70).make_table(a, b, "MOSO", f"DE ({de_files[0]})", context=True,
                                                            numlines=2)
        ma, mb = pages_of(moso, os.path.join(img_dir, f"moso-{code}")), pages_of(de_pdf, os.path.join(img_dir, f"de-{code}"))
        rows = []
        for i in range(max(len(ma), len(mb))):
            cell = lambda xs: (f'<img src="img/{os.path.basename(xs[i])}">' if i < len(xs) else "<em>no page</em>")
            rows.append(f"<tr><td>p{i + 1}</td><td>{cell(ma)}</td><td>{cell(mb)}</td></tr>")
        summary.append((code, f"text similarity {ratio:.1%}, pages MOSO {len(ma)} / DE {len(mb)}", ratio))
        sections.append(f'<h2 id="{code}">{html.escape(code)}</h2><p>Text similarity {ratio:.1%}; pages MOSO '
                        f'{len(ma)} / DE {len(mb)}.</p><details open><summary>Text diff (changed lines only)</summary>'
                        f'{table}</details><details><summary>Pages side by side</summary><table class="pages">'
                        f'<tr><th></th><th>MOSO</th><th>DE</th></tr>{"".join(rows)}</table></details>')
    head = "".join(f"<li><a href='#{c}'>{c}</a>: {html.escape(s)}</li>" for c, s, _ in summary)
    page = f"""<!doctype html><meta charset="utf-8"><title>Agreement PDF comparison</title>
<style>body{{font:14px/1.4 Inter,system-ui,sans-serif;margin:16px;background:#f9f7f4;color:#222}}
table.diff{{font:12px monospace;border-collapse:collapse}} .diff_add{{background:#dfd}} .diff_chg{{background:#ffd}}
.diff_sub{{background:#fdd}} table.pages img{{max-width:420px;border:1px solid #ccc}}</style>
<h1>Agreement PDF comparison: MOSO vs document-esign</h1><p>Generated by esign-compare/compare.py. Each DE PDF is the
unsigned render DE made for a Recruit envelope (exact bytes the Loan Officer signs); each MOSO PDF is the reference
from --moso. Known, accepted differences: the CEO signature bitmap (DE prints the rule blank), and fill_date/text_1/
text_2 blank on both (Bao 08/11).</p><ul>{head}</ul>{''.join(sections)}"""
    path = os.path.join(args.out, "compare.html")
    open(path, "w").write(page)
    print(path)
    for c, s, _ in summary:
        print(f"{c:32} {s}")
    return 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("rule")
    for name in ("collect", "cancel"):
        s = sub.add_parser(name)
        s.add_argument("--de", default="http://127.0.0.1:18092", help="port-forwarded document-esign")
        s.add_argument("--out", required=True)
        s.add_argument("--i-know-de-has-138", action="store_true")
        if name == "collect":
            s.add_argument("--offer", action="append", required=True, help="combo=offerId, repeatable")
    s = sub.add_parser("compare")
    s.add_argument("--out", required=True)
    s.add_argument("--moso", required=True, help="folder with <template_code>.pdf MOSO references")
    a = p.parse_args()
    return {"rule": cmd_rule, "collect": cmd_collect, "cancel": cmd_cancel, "compare": cmd_compare}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
