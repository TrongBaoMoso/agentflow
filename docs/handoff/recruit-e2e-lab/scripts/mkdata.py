import json
seeded = json.load(open("seeded.json"))
st = {}
for line in open("state.txt").read().splitlines()[1:]:
    p = [x.strip() for x in line.split(" | ")]
    if len(p) >= 9: st[p[0]] = p
SRC = {"web": ("Web form — trang register-loan-officer", "Web form — register-loan-officer page"),
 "webv1": ("Web form — trang register-loan-officer-v1", "Web form — register-loan-officer-v1 page"),
 "lopage": ("Trang của LO 1099v1testcase (lo-homepage)", "LO page 1099v1testcase (lo-homepage)"),
 "webinar": ("Webinar — trang /loan-officer (buổi 18/11)", "Webinar — /loan-officer page (18/11 session)"),
 "refer": ("Refer a Loan Officer (người giới thiệu: bao.trinh+recruiter)", "Refer a Loan Officer (referrer: bao.trinh+recruiter)"),
 "event": ("After party Texas (sự kiện)", "Texas after party (event)"),
 "summit": ("LoanFactory Summit 2026 (sự kiện)", "LoanFactory Summit 2026 (event)"),
 "join": ("/join/bao-trinhhh (trang Headhunter + webinar)", "/join/bao-trinhhh (Headhunter page + webinar)"),
 "recruitslug": ("/recruit/bao-trinhhh (trang Headhunter)", "/recruit/bao-trinhhh (Headhunter page)")}
STG = {"S0": "Not started", "S1": "New lead", "S2": "Engaged", "S4": "Offer", "S5": "Onboarding", "S6": "Joined", "S7": "Onboarded"}
def short(e): return e.replace("@loanfactory.com", "").replace("bao.trinh", "bao") if e else ""
out = []
for lid, r in seeded.items():
    s = st.get(r["em"])
    vi = []; en = []
    if s:
        stage, status, owner, spec, offer, acct = s[2], s[3], s[5], s[6], s[7], s[8] == "t"
        vi.append(f"<b>{STG.get(stage, stage)}</b>{' · '+status if status!='ACTIVE' else ''}"); en.append(vi[-1])
        if owner: vi.append(f"chủ: {short(owner)}"); en.append(f"owner: {short(owner)}")
        else: vi.append("chưa ai claim"); en.append("unclaimed")
        if offer: vi.append(f"offer {offer}"); en.append(f"offer {offer}")
        if spec: vi.append(f"Onboarding: <code>{spec}</code>"); en.append(f"Onboarding: <code>{spec}</code>")
        if acct: vi.append("HR đã tạo nhân viên"); en.append("HR employee created")
    extra = {"B6": ("offer chờ duyệt, để trống số", "offer awaiting approval, numbers empty"), "H11": ("offer chờ duyệt từ 07/10 23:16 VN", "offer awaiting approval since 07/10 23:16 VN"),
             "H12": ("Interested + đã mở offer nhưng chưa gửi", "Interested + offer opened but not sent"), "G3": ("SĐT đã STOP SMS", "phone STOP-ed for SMS"), "G4": ("không có SĐT", "no phone"),
             "K1": ("1-1 CHƯA xong", "1-1 NOT done"), "K2": ("1-1 xong, chưa trả", "1-1 done, not paid"), "L2": ("1-1 xong, chưa trả", "1-1 done, not paid"),
             "L1": ("Claude đã trả + ký → tự gửi HR", "Claude paid + signed → auto sent to HR"), "M1": ("Claude đã trả + ký; nháp HR đang chờ", "Claude paid + signed; HR draft waiting"),
             "R1": ("Neutral → Nurture 30 ngày", "Neutral → Nurture 30 days"), "S1": ("trùng NMLS với S2", "same NMLS as S2"), "S2": ("trùng NMLS với S1", "same NMLS as S1"),
             "C1": ("đăng ký là 1099", "registered as 1099"), "B7b": ("đăng ký KHÔNG có NMLS", "registered WITHOUT NMLS"), "X1": ("chưa có số sản xuất", "no production numbers"), "X2": ("để test khoá trước MOSO", "for the MOSO-freeze test"), "W1": ("qua /join nhưng trùng SĐT/NMLS với LO Claude cũ → KHÔNG tự nhận (đúng luật)", "via /join but shared phone/NMLS with an old Claude LO → NOT auto-owned (by rule)"), "W1c": ("qua /join, dữ liệu sạch → Headhunter tự nhận", "via /join, clean data → auto-owned by Headhunter"), "Y1": ("chưa claim — test Call auto-claims", "unclaimed — Call auto-claims test"), "GM1": ("email mail.tm — Claude theo dõi thư Onboarding", "mail.tm inbox — Claude watches the Onboarding email"), "GM2": ("email mail.tm — Claude đã gửi email thử", "mail.tm inbox — Claude sent a test email"), "E6d": ("tự khai volume 5,000,000 · 12 loans", "self-reported volume 5,000,000 · 12 loans"), "E1": ("dùng để đăng ký lại", "for re-registration"),
             "Z1": ("Claude tự test trọn luồng → Onboarded. Đừng đụng.", "Claude's full self-test → Onboarded. Don't touch."),
             "B4": ("vào thẳng Onboarding (xem E1b)", "landed at Onboarding (see E1b)"), "N2": ("vào thẳng Onboarding (xem E1b)", "landed at Onboarding (see E1b)"), "E6c": ("vào thẳng Onboarding (xem E1b)", "landed at Onboarding (see E1b)")}
    if lid in extra: vi.append(extra[lid][0]); en.append(extra[lid][1])
    if (lid.startswith("Z") and lid != "Z1") or (lid.startswith("C") and len(lid)==3 and lid[1] in "ABFHIJKLNR"): vi.append("Claude dùng để tự test"); en.append("used by Claude's self-test")
    out.append({"id": lid, "fn": "QA", "ln": r["ln"], "em": r["em"], "ph": r["ph"], "nm": r["nm"],
                "src": {"vi": SRC[r["kind"]][0], "en": SRC[r["kind"]][1]}, "prep": {"vi": " · ".join(vi), "en": " · ".join(en)},
                "cand": s[1] if s else "", "key": r.get("key") or "",
                "entryBase": "https://www.viet18.com/register-loan-officer"})
manual = [("D2","Dcalifornia","California"),("D3","Dindiana","Indiana"),("E2","Eresume",""),("E3","Evone",""),("E4","Elopage",""),("H5","Hsettings","")]
for i,(lid, ln, note) in enumerate(manual):
    n = 90 + i
    out.append({"id": lid, "fn": "QA", "ln": ln, "em": f"bao.trinh+t08{lid.lower()}@loanfactory.com", "ph": f"(714) 555-19{n}", "nm": f"99319{n}",
                "src": {"vi": "Anh tự đăng ký trên form" + (f" (sponsor {note})" if note else ""), "en": "You register it on the form" + (f" (sponsor {note})" if note else "")},
                "prep": {"vi": "<b>chưa tạo</b>", "en": "<b>not created</b>"}, "cand": "", "key": ""})
order = lambda l: (l["id"][0], int(''.join(c for c in l["id"][1:] if c.isdigit()) or 0), l["id"])
out.sort(key=order)
open("../sheet/data_los.js", "w").write("const LOS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n")
print(len(out))
