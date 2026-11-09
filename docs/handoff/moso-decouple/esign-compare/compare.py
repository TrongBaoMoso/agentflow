#!/usr/bin/env python3
"""
P4 S5 PDF comparison: the Loan Officer agreements Recruit sends through document-esign (DE) vs the MOSO PDFs.

Stdlib + poppler (pdftotext, pdftoppm). No secret is read or stored: DE's internal door trusts X-Service-Source
(owner decision 2026-10-06), reached through `kubectl port-forward` to its ClusterIP.

Sub-commands (run in this order; see P4-S4S5.md "PDF comparison"):

  rule      Check that recruit-be's rule gives each fixture combo its expected documents (offline, no network).
  local-preview  Offline dry run, no DE call, no envelope: fill DE's template HTML (from a document-esign checkout)
            with each combo's values the way recruit-be's AgreementFillData does, and print it to PDF with headless
            Chrome. Approximate layout (Chrome, not DE's OpenHTMLtoPDF); for testing the pipeline and reading the
            filled text before #138 is deployed. The real comparison uses `collect`.
  collect   For each Recruit offer id, read its RECRUIT envelopes from DE and download the UNSIGNED renders DE made
            (sessions[].generatedFileId): the exact PDFs the Loan Officer is asked to sign. No send, no Inkless call.
  cancel    Cancel the collected envelopes that are still open (never one already signed). Unsigned Inkless
            envelopes are not billed (Inkless charges COMPLETED only), and cancelling keeps DE tidy.
  moso-fill MOSO's render rebuilt offline: the public template PDF MOSO's HR-agreement path fills (packs FillPdfFormOp),
            filled with PDFBox the way packs PdfUtils.fill does (MosoFill.java), per combo. No MOSO call.
  compare   Per document: character similarity (spacing removed), the changed text classified (finding / signature
            anchor / reordered / list marker), pages side by side, plus the reviewer's notes (--notes), in one HTML page.

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


# ── offline preview (no network) ──────────────────────────────────────────────────────────────────────────────
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def fill_values(combo, profile, today):
    """recruit-be AgreementFillData: the display name (no confirmed legal name on a fresh lead), its initials, today
    (Pacific, MM/dd/yyyy), the NMLS id, "street street2, city, state zip"; fill_date/text_1/text_2 blank (Bao 08/11)."""
    name = f"{combo['first']} {combo['last']}".strip()
    street = " ".join(x for x in (profile["street"], profile["street2"]) if x)
    return {"full_name": name, "associate_initials": "".join(w[0].upper() for w in name.split()),
            "current_date": today, "nmls": profile["nmls"],
            "full_address": ", ".join(x for x in (street, profile["city"], f"{profile['state']} {profile['zip']}") if x),
            "fill_date": "", "text_1": "", "text_2": ""}


def fill_template(source, values):
    """The Handlebars subset the four agreement templates use: {{#if x}}...{{else}}...{{/if}} and {{x}}."""
    def cond(m):
        body = m.group(2)
        yes, _, no = body.partition("{{else}}")
        return yes if values.get(m.group(1)) else no
    prev = None
    while prev != source:
        prev, source = source, re.sub(r"\{\{#if\s+(\w+)\s*\}\}((?:(?!\{\{#if).)*?)\{\{/if\}\}", cond, source, flags=re.S)
    return re.sub(r"\{\{\{?\s*(\w+)\s*\}?\}\}", lambda m: html.escape(str(values.get(m.group(1), ""))), source)


def cmd_local_preview(args):
    import datetime
    fixture = json.load(open(os.path.join(HERE, "combos.json")))
    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-8))).strftime("%m/%d/%Y")
    out = os.path.join(args.out, "de")
    os.makedirs(out, exist_ok=True)
    for combo in fixture["combos"]:
        if args.combo and combo["id"] not in args.combo:
            continue
        values = fill_values(combo, fixture["profile"], today)
        for code in required(combo["corporate"], combo["sponsor_states"], combo["has_dre_endorsed"],
                             combo["licensed_states"]):
            src = open(os.path.join(args.templates, f"{code}.html"), encoding="utf-8").read()
            page = os.path.join(out, f"{combo['id']}__{code}.html")
            open(page, "w", encoding="utf-8").write(fill_template(src, values))
            pdf = page[:-5] + ".pdf"
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                            f"--print-to-pdf={pdf}", "file://" + page], check=True, capture_output=True)
            print(f"{combo['id']}: {code} -> {os.path.basename(pdf)}")
    return 0


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


# ── MOSO references (offline) ─────────────────────────────────────────────────────────────────────────────────
MOSO_TEMPLATE_URL = "https://storage.googleapis.com/lender-rate/CDN/resources/pdf_form/{}.pdf"


def cmd_moso_fill(args):
    """MOSO's own render, rebuilt offline: packs FillPdfFormOp downloads this public template and PdfUtils.fill sets
    its AcroForm fields. MosoFill.java mirrors PdfUtils.fill with PDFBox 2.0 (--pdfbox: a classpath with the pdfbox,
    fontbox and commons-logging jars). Values are MOSO's for the fixture: legal name, its initials, the date DE
    printed (--date), the NMLS, and full_address as MOSO builds it ("street, street2, city, ST zip", measured on 171
    production MOSO exclusive-agent fills on 09/11). Nothing is sent anywhere."""
    fixture = json.load(open(os.path.join(HERE, "combos.json")))
    p = fixture["profile"]
    tpl_dir = os.path.join(args.moso, "_templates")
    os.makedirs(tpl_dir, exist_ok=True)
    for code in DOCS:
        dst = os.path.join(tpl_dir, f"{code}.pdf")
        if not os.path.exists(dst):
            urllib.request.urlretrieve(MOSO_TEMPLATE_URL.format(code), dst)
    filler = os.path.join(HERE, "MosoFill.java")
    for c in fixture["combos"]:
        name = f"{c['first']} {c['last']}"
        data = {"full_name": name, "associate_initials": "".join(w[0].upper() for w in name.split()),
                "current_date": args.date, "nmls": p["nmls"],
                "full_address": f"{p['street']}, {p['street2']}, {p['city']}, {p['state']} {p['zip']}",
                "date_loan_originator": "", "fill_date": "", "text_1": "", "text_2": ""}
        for code in c["expect"]:
            out = os.path.join(args.moso, f"{c['id']}__{code}.pdf")
            subprocess.run(["java", "-cp", args.pdfbox, filler, os.path.join(tpl_dir, f"{code}.pdf"), out]
                           + [f"{k}={v}" for k, v in data.items()], check=True, capture_output=True)
            print(f"{c['id']}: {code} -> {os.path.basename(out)}")
    return 0


# ── comparison ────────────────────────────────────────────────────────────────────────────────────────────────
BIDI = re.compile("[​-‏‪-‮⁦-⁩﻿]")
ANCHOR = re.compile(r"^(\\[sdnit]\d+\\)+$")


def flat_text(pdf):
    """The document's text with every whitespace removed. The two renderers wrap, justify and space differently
    (and MOSO's Google-Docs template carries bidi marks and ____ blanks), so only the characters are compared."""
    t = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    t = BIDI.sub("", t).replace(" ", " ").replace("●", "•").replace("", "•").replace("_", "")
    return re.sub(r"\s+", "", t)


def classified_changes(a, b, ctx=40):
    """Char-level diff, then: a deletion and an insertion with the same characters are a move (layout order);
    signature anchors (\\s1\\, \\d1\\) are DE's own; a lone bullet glyph is a list marker; the rest are findings."""
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    ops = [dict(tag=t, before=a[max(0, i1 - ctx):i1], moso=a[i1:i2], de=b[j1:j2], after=a[i2:i2 + ctx])
           for t, i1, i2, j1, j2 in sm.get_opcodes() if t != "equal"]
    from collections import Counter
    dels = [o for o in ops if o["moso"] and not o["de"]]
    ins = [o for o in ops if o["de"] and not o["moso"]]
    for d in dels:
        for i in ins:
            if not i.get("kind") and Counter(i["de"]) == Counter(d["moso"]):
                d["kind"] = i["kind"] = "moved"
                break
    for o in ops:
        if o.get("kind"):
            continue
        if ANCHOR.match(o["de"]) and not o["moso"]:
            o["kind"] = "anchor"
        elif set(o["moso"] + o["de"]) <= {"•"}:
            o["kind"] = "bullet"
        else:
            o["kind"] = "finding"
    return sm.ratio(), ops


def page_images(pdf, prefix, dpi):
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=70", "-r", str(dpi), pdf, prefix], check=True)
    d, base = os.path.dirname(prefix), os.path.basename(prefix)
    files = sorted(f for f in os.listdir(d) if f.startswith(base + "-") and f.endswith(".jpg"))
    import base64
    return ["data:image/jpeg;base64," + base64.b64encode(open(os.path.join(d, f), "rb").read()).decode() for f in files]


def moso_ref(moso_dir, combo, code):
    for name in (f"{combo}__{code}.pdf", f"{code}.pdf"):
        if os.path.exists(os.path.join(moso_dir, name)):
            return os.path.join(moso_dir, name)
    return None


def cmd_compare(args):
    de_dir = os.path.join(args.out, "de")
    img_dir = os.path.join(args.out, "img")
    os.makedirs(img_dir, exist_ok=True)
    docs, seen = [], set()
    for name in sorted(f for f in os.listdir(de_dir) if f.endswith(".pdf")):
        combo, code = name[:-4].split("__", 1)
        ref = moso_ref(args.moso, combo, code)
        if not ref:
            docs.append(dict(combo=combo, code=code, missing=True))
            continue
        de_pdf = os.path.join(de_dir, name)
        ratio, ops = classified_changes(flat_text(ref), flat_text(de_pdf))
        pages = None
        if code not in seen:  # pages once per template: the other combos differ only by the printed name
            seen.add(code)
            pages = (page_images(ref, os.path.join(img_dir, f"m-{combo}-{code}"), args.dpi),
                     page_images(de_pdf, os.path.join(img_dir, f"d-{combo}-{code}"), args.dpi))
        npages = lambda p: int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", p], capture_output=True,
                                                                           text=True).stdout).group(1))
        docs.append(dict(combo=combo, code=code, ratio=ratio, ops=ops, pages=pages,
                         pm=npages(ref), pd=npages(de_pdf)))
        print(f"{combo:15} {code:32} {ratio:7.2%} pages {docs[-1]['pm']}/{docs[-1]['pd']} findings "
              f"{sum(o['kind'] == 'finding' for o in ops)}")
    notes = json.load(open(args.notes)) if args.notes else {}
    path = os.path.join(args.out, "compare.html")
    open(path, "w", encoding="utf-8").write(render_page(docs, notes))
    print(path)
    return 0


TITLES = {"1099_agreement_form_finalized": "1099 Independent Contractor Agreement",
          "w2_agreement_form_finalized": "W-2 Outside Salesperson Agreement",
          "ca_compliance_statement": "CA Compliance Statement",
          "exclusive_agent_agreement": "Exclusive Agent Agreement"}
KIND_LABEL = {"finding": "Finding", "anchor": "Signature anchor", "moved": "Moved (layout)", "bullet": "List marker"}


def render_page(docs, notes):
    e = html.escape
    css = open(os.path.join(HERE, "compare.css"), encoding="utf-8").read()
    rows, sections = [], []
    for d in docs:
        anchor = f"{d['combo']}-{d['code']}"
        if d.get("missing"):
            rows.append(f"<tr><td>{e(d['combo'])}</td><td>{e(TITLES.get(d['code'], d['code']))}</td>"
                        f"<td colspan='3'>No MOSO reference</td></tr>")
            continue
        n = {k: sum(o["kind"] == k for o in d["ops"]) for k in KIND_LABEL}
        doc_notes = notes.get("doc_findings", {}).get(d["code"], [])
        nf = n["finding"]
        chip = (f"<span class='chip bad'>{nf} text finding{'s' * (nf != 1)}</span>" if nf
                else "<span class='chip ok'>text matches</span>")
        rows.append(f"<tr><td class='mono'>{e(d['combo'])}</td><td><a href='#{anchor}'>{e(TITLES.get(d['code'], d['code']))}</a>"
                    f"</td><td class='num'>{d['ratio']:.2%}</td><td class='num'>{d['pm']} / {d['pd']}</td><td>{chip}</td></tr>")
        items = []
        for o in d["ops"]:
            if o["kind"] == "moved":
                continue
            items.append(f"<li class='op {o['kind']}'><span class='kind'>{KIND_LABEL[o['kind']]}</span>"
                         f"<code class='ctx'>…{e(o['before'][-28:])}<del>{e(o['moso'])}</del><ins>{e(o['de'])}</ins>"
                         f"{e(o['after'][:28])}…</code></li>")
        moved = n["moved"] // 2
        pages = ""
        if d["pages"]:
            pm, pd = d["pages"]
            cells = "".join(
                f"<figure class='pair'><figcaption>Page {i + 1}</figcaption><div class='two'>"
                f"<img alt='MOSO page {i + 1}' loading='lazy' src='{pm[i] if i < len(pm) else ''}'>"
                f"<img alt='document-esign page {i + 1}' loading='lazy' src='{pd[i] if i < len(pd) else ''}'></div></figure>"
                for i in range(max(len(pm), len(pd))))
            pages = (f"<details class='pages'><summary>Pages side by side ({max(len(pm), len(pd))}): MOSO left, "
                     f"document-esign right</summary><div class='grid'>{cells}</div></details>")
        else:
            pages = "<p class='quiet'>Pages look the same as the first combination with this document, apart from the name.</p>"
        visual = "".join(f"<li>{x}</li>" for x in doc_notes)
        sections.append(
            f"<section id='{anchor}' class='doc'><header><p class='eyebrow mono'>{e(d['combo'])}</p>"
            f"<h3>{e(TITLES.get(d['code'], d['code']))}</h3><p class='stats'><span>Text similarity <b>{d['ratio']:.2%}</b></span>"
            f"<span>Pages <b>{d['pm']}</b> MOSO / <b>{d['pd']}</b> DE</span><span>{moved} reordered passage{'s' * (moved != 1)} hidden</span></p></header>"
            + (f"<ul class='visual'>{visual}</ul>" if visual else "")
            + (f"<ul class='ops'>{''.join(items)}</ul>" if items else "<p class='quiet'>No text difference after layout moves.</p>")
            + pages + "</section>")
    findings = "".join(f"<li class='finding sev-{e(f['severity'])}'><span class='sev'>{e(f['severity'])}</span>"
                       f"<div><b>{e(f['title'])}</b><p>{f['detail']}</p></div></li>" for f in notes.get("findings", []))
    accepted = "".join(f"<li>{x}</li>" for x in notes.get("accepted", []))
    method = "".join(f"<li>{x}</li>" for x in notes.get("method", []))
    return f"""<title>Agreement PDF Comparison</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{css}</style>
<main class="wrap">
<header class="top"><p class="eyebrow">Recruit · P4 e-sign · staging · {e(notes.get('date', ''))}</p>
<h1>Agreement PDF Comparison</h1><p class="lede">{notes.get('summary', '')}</p></header>
<section><h2>Findings</h2><ul class="findings">{findings}</ul></section>
<section><h2>Accepted differences</h2><ul class="plain">{accepted}</ul></section>
<section><h2>Per document</h2><div class="scroll"><table class="sum"><thead><tr><th>Combo</th><th>Document</th><th class="num">Similarity</th><th class="num">Pages M / DE</th><th>Text</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="quiet">Similarity compares the characters of the two PDFs with spacing removed. Changes marked <em>Signature anchor</em> are the
<code>\\s1\\</code>/<code>\\d1\\</code> placeholders document-esign prints where the signer signs; reordered passages (the same text placed in a different order by the two renderers) are counted but not listed.</p></section>
{''.join(sections)}
<section><h2>How this was made</h2><ul class="plain">{method}</ul></section>
</main>"""


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("rule")
    s = sub.add_parser("local-preview")
    s.add_argument("--templates", required=True, help="document-esign src/main/resources/templates")
    s.add_argument("--out", required=True)
    s.add_argument("--combo", action="append", help="limit to these combo ids")
    for name in ("collect", "cancel"):
        s = sub.add_parser(name)
        s.add_argument("--de", default="http://127.0.0.1:18092", help="port-forwarded document-esign")
        s.add_argument("--out", required=True)
        s.add_argument("--i-know-de-has-138", action="store_true")
        if name == "collect":
            s.add_argument("--offer", action="append", required=True, help="combo=offerId, repeatable")
    s = sub.add_parser("moso-fill")
    s.add_argument("--moso", required=True, help="output folder for <combo>__<template_code>.pdf")
    s.add_argument("--date", required=True, help="the date DE printed (MM/dd/yyyy), so dates do not differ")
    s.add_argument("--pdfbox", required=True, help="classpath with pdfbox 2.0, fontbox 2.0, commons-logging")
    s = sub.add_parser("compare")
    s.add_argument("--out", required=True)
    s.add_argument("--moso", required=True, help="folder with <combo>__<code>.pdf (or <code>.pdf) MOSO references")
    s.add_argument("--notes", help="JSON: summary, findings, accepted, method, doc_findings (written by the reviewer)")
    s.add_argument("--dpi", type=int, default=45)
    a = p.parse_args()
    return {"rule": cmd_rule, "local-preview": cmd_local_preview, "collect": cmd_collect, "cancel": cmd_cancel,
            "moso-fill": cmd_moso_fill, "compare": cmd_compare}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
