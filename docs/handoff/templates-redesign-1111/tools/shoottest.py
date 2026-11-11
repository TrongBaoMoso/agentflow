"""Re-capture every "Send test to me" copy listed in sent.json with gmailreal.js (body as delivered, re-laid out at 964/390 px).
Two templates share one subject (follow-up, follow-up-attended): sendall sends them in order, so the later one is the newest."""
import json
import subprocess

sent = json.load(open('sent.json'))
res = []
for i, r in enumerate(sent):
    if r.get('status') != 200 or r['id'] == 'tpl-lo-agreement-link':
        continue
    subj = r['subject'].replace('[Test] ', '', 1).replace('"', '')
    later = [x for x in sent[i + 1:] if x.get('subject') == r['subject']]
    pick = f'#{len(later) + 1}' if any(x.get('subject') == r['subject'] for x in sent if x is not r) else ''
    args = ['node', 'gmailreal.js', r['to'], 'gmail/' + r['id'], subj] + ([pick] if pick else [])
    o = subprocess.run(args, capture_output=True, text=True, timeout=300).stdout.strip().splitlines()
    res.append((r['id'], o[-1] if o else 'no output'))
    print(r['id'], '|', o[-1] if o else '', flush=True)
json.dump(res, open('shoot-result.json', 'w'), indent=1)
