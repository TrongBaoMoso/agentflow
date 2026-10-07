import json, sys, time, urllib.request
from los import L
from api_reg import payload, post
MOSO_AID = "https://moso-aid-233682574497.us-central1.run.app/api/lo-events"
WEBINAR = "35412067022"
out = {}
try: out = json.load(open("seeded.json"))
except Exception: pass
def jpost(url, body, referer):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={"content-type":"application/json","referer":referer,"origin":"https://www.viet18.com","user-agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read(); 
        try: return json.loads(t or b"{}")
        except Exception: return {"raw": t[:200].decode(errors="ignore")}
for i,(lid, ln, kind, prep, extra) in enumerate(L):
    if lid in out and out[lid].get("ok"): continue
    n = 10 + i
    lo = {"fn":"QA","ln":ln,"em":f"bao.trinh+t08{lid.lower()}@loanfactory.com","ph":f"(714) 555-18{n:02d}","nm":f"99318{n:02d}"}
    lo.update({k:v for k,v in extra.items() if k in ("ph","nm","states","sponsor","w2")})
    rec = {"id":lid,"ln":ln,"kind":kind,"prep":prep, **{k:lo[k] for k in ("fn","ln","em","ph","nm")}}
    try:
        if kind in ("web","webv1","lopage"):
            ref = {"web":"https://www.viet18.com/register-loan-officer","webv1":"https://www.viet18.com/register-loan-officer-v1","lopage":"https://www.viet18.com/1099v1testcase/register-loan-officer"}[kind]
            r = post("registerLoanOfficer", payload(lo), ref)
        elif kind in ("join","recruitslug"):
            p = payload({**lo, "src":"recruiter", "referred_by":"bao.trinh+hh@loanfactory.com"})
            p.update({"lead_origin": "JOIN_SLUG" if kind=="join" else "RECRUIT_SLUG", "lead_origin_slug":"bao-trinhhh"})
            if kind=="join":
                body = {"lead_origin":"JOIN_SLUG","lead_origin_slug":"bao-trinhhh","first_name":"QA","last_name":ln,"email":lo["em"],"phone":lo["ph"],"nmls":lo["nm"],"states":["TX"],"sponsor_states":["TX"],
                        "referred_source":"recruiter","referred_by":"bao.trinh+hh@loanfactory.com","is_consent_checkbox":True,"webinar":WEBINAR}
                r = post("registerWebinar", body, "https://www.viet18.com/join/bao-trinhhh")
            else:
                r = post("registerLoanOfficer", p, "https://www.viet18.com/recruit/bao-trinhhh")
        elif kind == "webinar":
            body = {"first_name":"QA","last_name":ln,"email":lo["em"],"phone":lo["ph"],"nmls":lo["nm"],"states":["TX"],"sponsor_states":["TX"],"is_consent_checkbox":True,"webinar":WEBINAR,"referred_source":"google"}
            r = post("registerWebinar", body, "https://www.viet18.com/loan-officer")
        elif kind == "refer":
            body = {"key":None,"first_name":"QA","last_name":ln,"email":lo["em"],"phone":lo["ph"],"note":"QA test referral 08/10","recruiter_name":"QA Test Recruiter","referred_by":"bao.trinh+recruiter@loanfactory.com",
                    "recruiter_phone":"(714) 555-1899","referrer_have_zelle_account":False,"refer_bonus_method":"cash","referral_zelle_info":"","is_new":True}
            r = post("submitReferALoanOfficer", body, "https://www.viet18.com/refer/refer-a-loan-officer")
        elif kind in ("event","summit"):
            body = {"event_id": "texas-mortgage-roundup-2026-afterparty" if kind=="event" else "loanfactory-summit-2026","full_name":f"QA {ln}","email":lo["em"],"phone":lo["ph"],
                    "current_company":"QA Test Lending","production_volume":5000000,"total_loan_closed":12,"nmls":lo["nm"],"is_interested_lf":True,"referred_source":"google"}
            r = jpost(MOSO_AID, body, "https://www.viet18.com/after-party-event/2026/november/texas")
        rec["key"] = (r or {}).get("key") if isinstance(r, dict) else None
        rec["resp"] = {k:(r or {}).get(k) for k in ("error","success","message")} if isinstance(r, dict) else str(r)[:200]
        rec["ok"] = True
    except Exception as e:
        rec["ok"] = False; rec["err"] = str(e)[:300]
        try: rec["err"] += " " + e.read().decode()[:300]
        except Exception: pass
    out[lid] = rec
    print(lid, kind, rec.get("ok"), rec.get("key") and rec["key"][:12], rec.get("err",""), rec.get("resp"))
    json.dump(out, open("seeded.json","w"), indent=1)
    time.sleep(1.2)
