"""Replace the content of an existing Google Doc with a converted .docx, keeping its URL.

  python3 push_docx.py <fileId> <path.docx> ["new title"] [--force]

Reuses gws.py's service-account token (stdlib-only JWT signing — this machine has no google-api
client libraries). Resumable upload, because Drive's multipart path caps out at 5 MB and a 51-frame
transcript is bigger than that.

Refuses to run when the target doc already holds text, so a rebuild can never silently eat someone's
writing; pass --force when replacing it is the point.
"""
import importlib.util
import json
import sys
import urllib.request

DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"

spec = importlib.util.spec_from_file_location("gws", "/Users/apple/.config/gcloud/gws.py")
gws = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gws)

force = "--force" in sys.argv
args = [a for a in sys.argv[1:] if a != "--force"]
file_id, docx_path = args[0], args[1]
title = args[2] if len(args) > 2 else None

status, doc = gws.call("GET", f"https://docs.googleapis.com/v1/documents/{file_id}")
if status != 200:
    sys.exit(f"could not read the target doc: HTTP {status} {doc}")
existing = gws._doc_to_text(doc).strip()
if existing and not force:
    sys.exit(f"REFUSING: target doc already holds {len(existing)} characters of text. "
             "Re-run with --force if replacing it is intended.")

blob = open(docx_path, "rb").read()
meta = {"mimeType": "application/vnd.google-apps.document"}
if title:
    meta["name"] = title

token = gws.get_token()
init = urllib.request.Request(
    f"{UPLOAD}/{file_id}?uploadType=resumable&supportsAllDrives=true&fields=id,name,modifiedTime",
    data=json.dumps(meta).encode(),
    method="PATCH",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": DOCX,
        "X-Upload-Content-Length": str(len(blob)),
    },
)
with urllib.request.urlopen(init) as res:
    session = res.headers["Location"]
if not session:
    sys.exit("Drive did not hand back an upload session URL")

put = urllib.request.Request(session, data=blob, method="PUT", headers={
    "Authorization": f"Bearer {token}",
    "Content-Type": DOCX,
    "Content-Length": str(len(blob)),
})
with urllib.request.urlopen(put) as res:
    print(f"HTTP {res.status}  {res.read().decode()}")
print(f"uploaded {len(blob):,} bytes → https://docs.google.com/document/d/{file_id}/edit")
