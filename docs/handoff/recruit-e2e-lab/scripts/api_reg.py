import json, sys, urllib.request
BASE = "https://www.viet18.com/api/webplus/v1/5716104026521600/"
def payload(lo):
    st = lo.get("states", ["TX"]); sp = lo.get("sponsor", st)
    p = {"kind":"LORecruiting","key":None,"complete_percentage":0.25,"ready_to_join":True,"completed_detail_form":True,
      "first_name":lo["fn"],"last_name":lo["ln"],"legal_given_name":"","legal_last_name":"","email":lo["em"],"phone":lo["ph"],
      "alias_first_name":"","street":"123 Test Street","street2":"","zip":"75201","county_name":"Dallas","city":"Dallas","state":"TX",
      "is_same_as_personal_address":True,"mailing_street":"123 Test Street","mailing_street2":"","mailing_zip":"75201","mailing_state":"TX","mailing_city":"Dallas",
      "nmls":lo["nm"],"brokerage":False,"states":st,"sponsor_states":sp,"is_corporate_loan_officer":lo.get("w2",True),
      "target_compensation":0.5,"preferred_languages":lo.get("langs",[]),"have_social_links":False,"has_mortgage_website":False,"mortgage_website_approval_ack":True,
      "stored_social_links":[],"referred_by":lo.get("referred_by",""),"referrer_name":lo.get("referrer_name",""),"referrer_phone":lo.get("referrer_phone",""),
      "referrer_have_zelle_account":"","referral_zelle_info":"","referral_preferred_payment_method":"","zelle_the_referrer_bonus":"",
      "is_consent_checkbox":True,"rocket_target_compensation":0.5,"referred_source":lo.get("src","google"),"citizenship":"us_citizen"}
    p.update(lo.get("extra", {}))
    return p
def post(op, body, referer="https://www.viet18.com/register-loan-officer"):
    req = urllib.request.Request(BASE+op, data=json.dumps(body).encode(), method="POST",
        headers={"content-type":"application/json","referer":referer,"origin":"https://www.viet18.com","user-agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read() or b"{}")
if __name__ == "__main__":
    lo = json.loads(sys.argv[1]); r = post("registerLoanOfficer", payload(lo))
    print(json.dumps({"email": lo["em"], "key": r.get("key"), "error": r.get("error")}))
