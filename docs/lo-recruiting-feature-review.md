# LO Recruiting — Current Features Review

> **Mục đích:** Tài liệu review hiện trạng module LO Recruiting trên hệ thống hiện tại (khảo sát trên staging viet18.com), phục vụ yêu cầu của anh Thuận trong email "Recruiting and Onboarding for Tera+": *"review the current features and share them with Victoria/Benjamin"*.
>
> **Phương pháp:** Khảo sát 3 vòng trực tiếp trên staging — (1) đi qua toàn bộ pages/tabs, (2) bấm thật từng CTA/option, tạo record thật và chạy trọn vẹn flow tuyển 1 LO từ Add → 100% onboarded, (3) login-as 6 account với role khác nhau để lập ma trận phân quyền. Mọi hành vi ghi trong tài liệu này đều đã **verify bằng thao tác thật**, không suy đoán từ UI.
>
> **Người thực hiện:** Bao Trinh — 07/2026
>
> *(English version: [lo-recruiting-feature-review.en.md](lo-recruiting-feature-review.en.md))*

---

## 1. Tổng quan module

LO Recruiting là module CRM tuyển dụng Loan Officer, nằm trong hệ thống nội bộ (GWT/Google App Engine). Menu **LO RECRUITING** (khác với menu RECRUITING — module HR tuyển nhân sự thường: Jobs/Candidates/Interview questions) gồm 5 trang:

| Trang | Route | Vai trò |
|---|---|---|
| My Loan Officer referrals | `/loan_officer_referrals` | LO giới thiệu LO, theo dõi thưởng referral |
| Admin - Loan Officer referrals | (qua menu) | Admin quản lý + duyệt referral |
| Interested Loan Officers (ILO) | `/lo_recruiting/{Mine\|company}` | Pipeline chính: LO đã "interested" → onboarding |
| Recruited Loan Officers (RLO) | `/recruited_loan_officers/{Mine\|Company\|Pending approvals}` | Kho lead đầu phễu (cold list) |
| Loan Officers Obtained from Modex | `/modex_data` | Kho data mua từ Modex, staging trước khi merge |

Trang cấu hình: **General Settings** `/lo_recruiting_config` (5 tabs). Dashboard: **Summary - Recruiting** (`/company_dashboard/loan_officers_report/Summary - Recruiting`).

### Flow tổng quát (đã chạy thật end-to-end)

```
[Nguồn lead] → Recruited LO (cold) → contact (Call/SMS/Email)
    → Recruiter set status "Want to join" (nhãn thủ công, không bắt buộc)
    → Action "Invite Loan officer to join <company>" (available ở mọi status)
    → chuyển sang Interested LO (badge "Converted from recruited LO", status "Invited to join")
    → Trả $100 startup fee → status TỰ NHẢY "Onboarding"   ← auto-transition, đã verify live
    → Ký LO Agreement (e-sign) → đủ điều kiện "100% onboarded"
    → Action "Create new account" → form CREATE NEW ASSOCIATES (W-2/W-9, classification, branch/team)
    → LO thành nhân sự chính thức, bắt đầu originate
```

**Gate "100% onboarded":** điều kiện cứng chỉ là **Paid + Signed** (fee có thể waive). NMLS sponsored / HR completed / 1-1 meeting done chỉ là điều kiện **auto**-join — admin vẫn set tay "100% onboarded" được khi 2 điều kiện cứng đã đạt.

---

## 2. Nguồn LO (data sources) — đủ 6 nguồn

1. **Modex** (data mua, có NMLS + production data) — sync vào `/modex_data`, review rồi merge.
2. **Import CSV** — bulk Action → Import (csv), gán sẵn Channel/Status/Priority/Recruiter cho cả file, có "Default template CSV".
3. **Facebook Lead Ads** — tab config riêng, connect trực tiếp Facebook Pages ("Loan Factory - Mortgage Jobs & Careers"...), leads đổ thẳng vào pipeline.
4. **Self-apply** — visitor tự đăng ký làm LO → tab **Pending approvals** (badge "Added by LO"), admin **Approve** → chuyển vào tab Company của Recruited LO.
5. **Landing page + Webinar** (`/loan-officer`) — đăng ký webinar → thành ILO, có chuỗi email automation (mục 6).
6. **Referral** — LO hiện tại giới thiệu (mục 7).

Ngoài ra có funnel phụ: **Invite LO to join Marketplace** — mời LO dùng Moso Marketplace miễn phí trước (account tạo sẵn, LO chỉ set password), coi như "recruit nhẹ" để nurture.

---

## 3. Recruited Loan Officers (đầu phễu) — chi tiết CTA

### Cấu trúc trang
- **3 tabs:** Mine / Company / Pending approvals. Stats panel trên đầu (mỗi số là drill-down link), 3 chế độ view: **bar chart / text / ẩn**.
- **Bảng 16 cột:** Started date, Updated, Full name (+badges/labels/follow-up), Social media, Friendship, Status/Priority, Call, Text, Note, Action, Loan officer channel, Experience/12-month loans, NMLS/States to sponsor, Registered webinar/Recorded link, Recruiter, My profile (Claimed/Not claimed — trạng thái LO claim profile Marketplace).

### Status (10): Not touched → Initiate contact → Message sent → Dialogue → Invited to join → Interested but thinking → Want to join / Archived / Archived-Wrong information / Block display
### Priority (5): Highest / High / Medium / Low / Lowest
### Channel (3): Wholesale LO / Retail LO / Broker-Owner
### Experience (4): Newly Licensed / Inexperienced / Experienced / High producer

### Toolbar
| CTA | Hành vi (đã test) |
|---|---|
| **Add** | Form tạo full-page; required fields (Licensed states, States to sponsor, Career Production, Mailing address, Preferred languages) **không đánh dấu \*** và chỉ lộ dần từng lỗi qua mỗi lần submit (UX kém). Có per-state logic (CA DRE, Indiana...), Modex info, địa chỉ Google autocomplete. |
| **Delete** | Xoá record đã chọn (toolbar hiển thị số lượng chọn: "Delete 1"). |
| **Assign recruiter** | Modal chọn Recruiter + checkbox "Overwrite the current recruiter"; không tick = chỉ gán cho record chưa có owner. |
| **Action → Import (csv)** | Preset Channel/Status/Priority/Recruiter + upload + Default template CSV. |
| **Action → Email all** | Trang SEND EMAIL: gửi hàng loạt theo **filter hiện tại** (To = `${root.email_name}`, from `drive@…`), Reply-To, rich editor, **Create mailing list Yes/No**, **Email campaign name** để track trong email history. = email-blast engine có campaign tracking. |
| **Action → Create contact list** | Trang NEW DYNAMIC LIST: contact list **động** ("recipients determined in real-time when emails are sent") theo criteria (Active, Social media, Recruiter, Channel, Friendship, Claimed profile, Experience, Language, Licensed states) + **Export (csv)**. |
| **Action → Update data using Modex** | Modal chọn field cần re-sync (Basic: Email/Phones/Company name-url-nmls/Social links; Mortgage: #loans 12mo, volume 12mo, transaction history, years in business) + Update Range (date/channel/status/recruiter/social/friendship); **không chọn range = update ALL**; lookup theo NMLS; confirm "~10 minutes", chạy background. |
| **Follow-ups overdue** | Filter (không phải trang) — lọc record có follow-up flag quá hạn. |
| **Brokers/Companies** | Modal CRUD **master data công ty broker** (Name/Website/NMLS/Address), nguồn cho field Company của LO. |
| **Company information** | 1 note rich-text **chung cho toàn công ty** (mọi người cùng thấy/sửa). |

### Per-row
| CTA | Hành vi (đã test) |
|---|---|
| **Call** | KHÔNG gọi ngay — mở modal kèm **call script** bán hàng (Technology/Support/Compensation: 250bps, 100% commission − $595 − $500, $300/referee loan) + nút "Call via my Zoom Phone" (deep-link Zoom app). Counter Call đếm từ **Zoom log**, không phải từ click. |
| **Zoom SMS** | Gửi SMS qua **Zoom API của chính user**. User chưa map Zoom Phone → lỗi "Failed to send Zoom SMS: User not found" (thông báo khô, không hướng dẫn). |
| **Note 💬** | = **Conversation history**: rich-text, **Pin/Unpin**, **Save + Email** gửi note tới các phòng ban (HR/Licensing/Compliance/Onboarding…) + additional recipients. **Đã verify email đến hộp thư thật** (staging gửi email ra ngoài THẬT — cẩn trọng khi thao tác trên record có email thật). |
| **Social media badge** | Modal UPDATE SOCIAL LINKS + nút **"Copy Name And NMLS #"** (copy để đi search profile); "Has social media" Yes/No; Yes → repeater links (khuyến nghị FB cá nhân, Fan Page, LinkedIn, Google Business Profile, Zillow, Yelp, TikTok) → badge "Checked and has social links". |
| **Friendship** | Tracking kết bạn social: Not friend / Friend requested / Cannot make friend request / Friend. |
| **Status** | Click nhãn status → mở modal **CHANGE STATUS** (dropdown 10 status + Note optional + Submit). Đã verify live: dropdown gồm Not touched → Initiate contact → Message sent → Dialogue → Invited to join → Interested but thinking → Want to join → Archived → Archived - Wrong information → Block display. |
| **Priority / Channel / Experience** | Đổi inline bằng dropdown ngay trên bảng (Priority: Highest/High/Medium/Low/Lowest). |
| **Row Action (7 items)** | Assign recruiter, Audit log (field-level old→new + user + timestamp), Conversation history, Add or remove a follow-up flag, Register for a webinar, Invite Loan officer to join <company>, **Invite LO to join Marketplace**. |
| **Follow-up flag** | = snooze + notification engine: chọn wake-up date (validate tương lai), khi wake gửi System notification/Email/Text cho owners; có **Flag history** riêng. Record bị flag "ẩn khỏi pipeline đến khi wake up". |
| **Invite … to join company** | Modal ghi rõ *"will be moved to the Interested Loan Officers pipeline"*; bắt buộc chọn **Referral source** (Word of Mouth / Search and AI / Social Media / Events and Job Boards / Direct Invite / Other, có cascade Detail); toggle **Waive $100 fee** + **Send invitation email**; template nêu "$100 non-refundable startup fee… cover NMLS sponsorship fees up to 3 states". |
| **Invite LO to join Marketplace** | Email composer (template `outside_loan_officer_invitation`, subject "Welcome to Moso Marketplace - Activate Your Free Account!"): account **đã tạo sẵn**, LO click set password; flow Preview → Send → toast "Emails are being sent". |

### Tab Pending approvals
- Mô tả hệ thống: *"captures all requests from visitors who would like to be our loan officer"*.
- Row Action thay "Invite … to join company" bằng **Approve** → confirm → record chuyển vào tab **Company**. Có link **Check Modex** on-demand per-row.

### Filters
Search box (Name/Email/Phone/Company) + Active/Inactive + Social media + **More** (Additional filters modal): Channel, Licensed states, Preferred language, Friendship, Profile, Experience, Personal address state.

---

## 4. Interested Loan Officers (pipeline chính) — chi tiết CTA

### Mô tả in trên trang (nguyên văn tóm tắt)
LO đăng ký webinar từ landing page → hệ thống email confirm + webinar details → 1 ngày sau webinar email hỏi có muốn join → nếu join, **HR được notify để bắt đầu onboarding** → "Call each loan officer for an interview, update the status, add notes after each call. HR will create a profile once the associate pays the start-up fee and signs the LO agreement."

### Stats funnel (mỗi số drill-down): Total, New, 1-1 Onboarding meeting completed but HR not initiated, Invited but not onboarding, Paid but not signed, Onboarding, NMLS sponsored but HR onboarding, 100% onboarded, HR completed but NMLS not sponsored, Paid startup fee, Agreement signed.

### Status ILO (8): New / Invited to join / Onboarding (`interviewed_and_accepted`) / Hiatus / No response / Denied by company / Denied by LO / 100% onboarded (`joined`)
- **Auto-transition đã verify live:** set Startup fee = Paid → status tự nhảy **Onboarding**.
- Set tay **100% onboarded** được ngay khi Paid + Signed (không cần NMLS/HR/meeting — các mục đó chỉ dùng cho auto-join).

### Toolbar
- **Add and invite loan officer** (tạo + mời trực tiếp vào ILO)
- **Action (bulk, 9 items):** Import multiple interested loan officers / Create contact list / **Assign owners** (Onboarding specialist + Recruiter, mỗi loại có "Overwrite current", validate "No row is selected") / Register for a webinar / Update data using Modex / Email all / **Export (csv)** / **Template settings** / **Import "Attendance tracking"** (chọn webinar + CSV điểm danh + template → cập nhật cột Attended?)
- **General Settings** (mục 6) — **Follow-ups overdue**
- **Delete** (chỉ hiện với role company-wide: Admin/HR/Accounting)

### Row Action (11 items, admin)
Assign owner / Audit log / Invite loan officer / **Invite 1-1 meeting** (email mời đặt lịch **Calendly**) / **Create new account** (form CREATE NEW ASSOCIATES: W-2/W-9/Outside Salesperson, classification Outside–Independent–Corporate LO, probation, branch/team/manager, company email) / Conversation history / Add or remove a follow-up flag / Register for a webinar / **Re-generate e-sign documents and send email** / **Loan referral** (toggle Yes/No → badge) / **Create an Incident** (service-desk incident gắn LO: Department, type "Employee's mistake", owner, committer, severity).

### Edit form ILO (điểm đáng chú ý)
Ngoài thông tin cơ bản: **payout qua Zelle**, compensation targets, per-status template… (chi tiết pass 1). Cột hiển thị NMLS status/License status/HR status, Status/Startup fee/Agreement, 1-1 Onboarding meeting.

### Template settings (per-status communication)
Kho template **Email / SMS / Call script** theo từng status ILO (8 status), biến động: `${Server.getCompany().name}`, `${root.first_name}`, `${Server.currentUser().full_name}`… — chính là nguồn nội dung cho Call modal + các email automation.

---

## 5. Loan Officers Obtained from Modex (`/modex_data`)

- Kho staging data mua từ Modex: mỗi record có badge **Synced**, Status **Existing** (đã có record trùng) / **Review Similar** (nghi trùng, cần review).
- **Sync Status** (đồng bộ trạng thái), search Name/Email/NMLS.
- **View** → modal MODEX INFORMATION: company + Company NMLS, thâm niên (Current Job / Financial Services History), contacts, 7 social links, **PERFORMANCE 12 tháng (Total Volume / Total Count)**, **TRANSACTION SUMMARY** (mix Construction/Home equity/Purchase/Refinance/Other %) → dữ liệu chào tuyển rất mạnh cho recruiter.
- **Update** → modal **COMBINED LOAN OFFICER RECORDS** (danh sách record khớp NMLS/email, nguồn "Recruiting LO", chọn **Select** target) → modal chọn field (giống Update-using-Modex) → confirm *"~10 minutes"* → "Data is updating in background" → record bên Recruited được enrich (đã verify: record nhận đủ social links + production data sau job).

---

## 6. General Settings (`/lo_recruiting_config`) — 5 tabs

1. **Webinar**: toggle **"Offer webinar to interested loan officers?"** (staging đang OFF) + mô tả chuỗi **6 email tự động**: (1) confirm sau đăng ký kèm hướng dẫn join, (2) reminder 2 ngày trước, (3) reminder 1 ngày trước, (4) reminder 2 giờ trước, (5) 1 ngày sau webinar → email mời join company, (6) 1 tháng sau → follow-up. Mỗi email có link chỉnh template.
2. **Landing Page's Settings**: nội dung landing `/loan-officer` (banner + ~11 YouTube videos).
3. **1-1 Meeting using Calendly**: URL booking company + **personal access token** (⚠️ token của cá nhân đang nằm trong config).
4. **ILO Owner Assignment Methods Settings**: bật/tắt **auto-assign** owner (Recruiter / Onboarding specialist / Support) — lý giải việc record mới tự gán owner không phải người tạo.
5. **Facebook Ads**: toggle + connect Facebook Pages, "capture leads directly into your Lead pipeline".

---

## 7. Referral program (My referrals + Admin referrals)

- **Chính sách (nguyên văn policy modal):** referral **KHÔNG eligible** nếu: (1) LO join sau 120 ngày kể từ referral, (2) LO đã đăng ký webinar trước khi được refer, (3) LO từng join Loan Factory, (4) là vợ/chồng của người refer, (5) LO thuộc broker/không exclusive.
- **Payout:** eligible sau **60 ngày kể từ 100% onboarded** → cron **mỗi thứ Bảy** sinh special commission request → **Commission Team** duyệt → tổng ~**75 ngày** từ lúc onboard đến lúc nhận tiền. Form edit có tùy chọn nhận qua **Zelle**.
- Admin referrals: bảng quản lý + duyệt; My referrals: LO tự theo dõi referral của mình.

---

## 8. Dashboard "Summary - Recruiting"

- `/company_dashboard/loan_officers_report/Summary - Recruiting`.
- **Run Update**: confirm "re-sync this Dashboard… few minutes" → background job re-tính số liệu (dashboard KHÔNG realtime).
- Bảng **RECRUITERS**: funnel per-recruiter; **mọi con số đều là drill-down link** mở đúng list ILO/RLO đã filter tương ứng.

---

## 9. Ma trận phân quyền theo role (đã login-as test thật 6 account)

| Quyền | Admin | HR | Licensing | Recruiter (Out+In) | Recruiter (In only) | Onboarding | Accounting |
|---|---|---|---|---|---|---|---|
| Menu LO RECRUITING | 5 mục (cả referrals) | Interested + Modex | **không có** | Interested + Recruited + Modex | Interested + Recruited + Modex | Interested + Modex | Interested + Modex |
| Recruited LO | Mine + Company + Pending | ❌ | ❌ | Mine + Pending (**chỉ record mình own**; không Add/Delete/Assign; bulk chỉ "Update Modex"; row đủ 7 items) | Mine + Pending (như Out) | ❌ | ❌ |
| Interested LO | Mine + Company | **Company-wide** + Delete + General Settings | ❌ | Mine + Company | **chỉ Mine** | chỉ Mine | **Company-wide** + Delete + General Settings |
| ILO bulk Action | 9 | 8 (mất Export csv) | — | 8 | 8 | 8 | **9 (có Export csv)** |
| ILO row Action | 11 | 10 (mất Create an Incident) | — | 10 | 10 | 10 | 10 |
| General Settings | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Modex page | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Associates | full (9 actions, có **Login** impersonation) | view + 4 actions | — | ❌ | ❌ | ❌ | (chưa kiểm) |

**Nhận xét thiết kế phân quyền:**
- Recruited LO (đầu phễu) là "sân" của Recruiter + Admin; recruiter bị giới hạn **ownership** (chỉ Mine) — mô hình "SDR chỉ chạm lead của mình".
- ILO là trang trung tâm mọi role vận hành, cùng UI nhưng khác scope: recruiter thấy Mine, HR/Accounting thấy company-wide + Delete.
- Licensing hoàn toàn ngoài module (làm việc qua HR docs/Associates ở khâu sau).
- Mọi role vận hành đều bấm được **"Create new account"** trên ILO (không chỉ HR) — nên xem lại khi rebuild.
- **Inside-only recruiter không có tab Company trên ILO, nhưng recruiter có thêm role Outside thì có** — ranh giới In/Out chưa nhất quán.

---

## 10. Tồn tại / rủi ro nên xử lý khi rebuild trên Tera+

**Phân quyền & bảo mật**
1. ⚠️ **Mọi role có LO Recruiting đều mở được General Settings** — gồm tab Calendly (chứa personal access token) và toggle webinar automation. Recruiter không nên sửa được config công ty.
2. HR/Accounting có nút **Delete** ILO company-wide.
3. **Impersonation ("Login")**: đổi session cả browser, không có "Back to admin" — thoát duy nhất bằng logout + đăng nhập lại.
4. Staging **gửi email ra ngoài thật** (đã nhận được tại hộp thư ngoài) — mọi thao tác test trên record có email thật đều có nguy cơ spam người thật.

**Data & hiệu năng**
5. Stats panel Recruited LO **cache/stale** (quan sát lệch ~8 ngày); dashboard cần bấm Run Update thủ công — không realtime.
6. Search box khi chọn suggestion sẽ filter theo **`?labels=`** thay vì full-text → dễ ra "No results" gây hiểu lầm; index record mới tạo chậm (eventual consistency Datastore).
7. Modex update job "~10 phút", không có progress/notification khi xong.

**UX**
8. Form Add không đánh dấu required, lỗi lộ **dần từng field** qua nhiều lần submit.
9. Modal Change Status hỏng nếu filter trang thay đổi giữa chừng (toast "technical difficulty" nhưng thực tế đã lưu — thông báo sai).
10. Call/SMS đòi hỏi Zoom Phone mapping per-user; lỗi "User not found" không có hướng dẫn khắc phục.
11. Bảng 16+ cột scroll ngang, GWT UI cũ, thao tác nhiều bước — đúng lý do cần rebuild.
12. Route sai (`/interested_loan_officers`, `/admin_loan_officer_referrals`) **redirect im lặng** sang trang khác thay vì báo 404/permission.

---

## 11. Map với 5 hạng mục trong email của anh Thuận

| Hạng mục email | Hiện trạng | Ghi chú cho Tera+ |
|---|---|---|
| **1. LO lists** | 6 nguồn (Modex/CSV/FB Ads/self-apply/webinar/referral) + dedup Modex + dynamic contact list + campaign email engine | Giữ đủ nguồn; chuẩn hoá dedup + search full-text |
| **2. Webinar page** | Landing `/loan-officer` + đăng ký webinar + 6 email automation + attendance import | Toggle hiện OFF trên staging; chuỗi email là asset đáng port nguyên |
| **3. Follow up** | Follow-up flag (snooze + wake notification + history), per-status Email/SMS/Call templates, Zoom SMS/Call, Calendly 1-1, campaign tracking | Nâng cấp: notification khi job xong, follow-up dashboard |
| **4. Onboarding process** | Status machine ILO + auto-transitions (Paid→Onboarding), gate Paid+Signed, e-sign, Create Associates account, HR/Licensing/NMLS checklist | Làm rõ ranh giới auto vs manual; phân quyền Create account |
| **5. Trainings** | Chưa nằm trong module này (My Training Academy riêng) | Phần của Benjamin: just-in-time training, milestone-triggered videos trong Tera+ |

**Câu hỏi mở của CEO cần chốt:** *"Will it be a separate application or part of Tera+?"* — hiện module gắn chặt hệ GWT cũ (session, Associates, service desk, commission). Nếu tách riêng, cần định nghĩa API cho: identity/roles, Associates/HR, commission (referral payout), notification, e-sign, Zoom/Calendly/Facebook/Modex integrations.

---

## Phụ lục A — Record test còn lại trên staging (có thể xoá)

- **BaoTest Staging** (ILO, 100% onboarded, Paid, Signed, Loan referral=Yes; email temp-mail) — record chạy end-to-end flow.
- **Mom Test RLO** (Recruited/Mine): Friendship=Friend requested, Social=Checked+LinkedIn, Priority=High, Channel=Retail LO; đã gửi 1 email Marketplace invite (đến test5142@test.com); 2 note test (1 pinned, 1 emailed).
- **David** (Pending approvals) → đã Approve, hiện nằm tab Company.
- **Daphni Hagen** (Modex) → đã chạy Update merge (background job) — record được enrich.
- Dashboard đã bấm Run Update 1 lần.

## Phụ lục B — Tài khoản role đã dùng để test phân quyền

HR: Ken Customer · Licensing: Chu Con Gi Nua Testcase · Outside+Inside Recruiter: Luis Testcase 635211 · Inside Recruiter: Nocha Hien · Onboarding Specialist: Maria Testcase · Accounting: Admin Request. (Impersonate qua Associates → Action → Login; chỉ admin có quyền này.)

---

## Phụ lục C — Đối chiếu PRODUCTION (www.loanfactory.com, 31/07/2026, read-only)

> Vòng kiểm chứng bổ sung theo yêu cầu: login-as 5 role thật trên production, **không mutate bất kỳ record nào**. Version footer production: **3.61.0** (staging viet18.com: 3.45.0 — staging tụt ~16 version so với prod).

### C.1. Quy mô dữ liệu thật

| Kho | Production | Ghi chú |
|---|---|---|
| Recruited LO (Company) | **106,145** — Not claimed 102,715 · Claimed 11 · Archived-wrong-info 23,995 · Block display 6,267 | 97% kho chưa ai đụng tới |
| Interested LO (Company) | **23,571** — 100% onboarded 2,596 · Onboarding 62 · Agreement signed 73 · Invited-not-onboarding 581 | |
| Sổ "Mine" của 1 inside recruiter (Brayan) | **2,053 lead** | Không next-best-action → không thể làm xuể |
| Sổ "Mine" của Miley (Onboarding+InsideRec) | **3,056 lead** | |
| Tab Obtained from Modex | "1-100 of over 100", toàn bộ Received **24/01/2024** | Y hệt staging: import chết |

### C.2. Ma trận phân quyền PRODUCTION (login-as thật)

| Role (người thật) | ILO | RLO Company | Config (`/lo_recruiting_config`) | Modex tab |
|---|---|---|---|---|
| Admin (IT Team) | full | full | full | full |
| Inside recruiter (Brayan Suarez) | Mine 2,053 + Company | **full 106K, có Delete + Assign recruiter** | **✅ mở được, đủ 5 tab kể cả Calendly** | ✅ |
| Outside recruiter (Seth August — kiêm LO, Level 4) | Mine 0 + Company | **full 106K, có Delete + Assign recruiter** | **✅ mở được (Webinar/Calendly/FB Ads)** | — |
| HR (Dave Hoàng) | full 23.5K + Delete + General Settings | full 106K + Delete/Assign | ✅ | ✅ (thấy cả nút Add/Update) |
| Onboarding + InsideRec (Miley Dau) | Mine 3,056 + Company | full 106K + Delete/Assign | ✅ | — |
| Accounting (Rosaline Pham) | full 23.5K + Delete + General Settings | ❌ **redirect im lặng** về Marketplace | ✅ | — |
| Licensing (Dung Nguyễn) | **full 23.5K** (staging: bị chặn hoàn toàn) | ❌ redirect im lặng | **✅ (staging: bị chặn)** | ✅ |

Kết luận: **7/7 role mở được config công ty trên production** (staging 6/7); recruiter trên prod nhiều quyền hơn staging (Delete/Assign trên kho 106K); Licensing trên prod nhiều quyền hơn staging. → Quyền không gắn với role mà là **grant per-user** (Associates → Permissions), drift tự do giữa người/môi trường.

### C.3. Modex — kiểm chứng bằng account thật (Victoria Pham đăng nhập sẵn)

- Portal **Modex Recruit**: 1,647,676 LO; filter theo transaction timeframe/địa lý/loan type/LTV...; view Volume / Monthly Avg / Avg Loan; Map view; Saved Filters; Add to List.
- **Quick-search nhận NMLS** → ra đúng người kèm trạng thái (VD `2096661` → "Pareetjot Thiara — *Inactive Loan Officer*").
- Profile 1 LO: NMLS, Modex Score, Attributes, employer hiện tại + địa chỉ, **Licensed Employment History (năm)**, 10-year licensing history (số company), tenure hiện tại, tab Licenses + Employment History, **Total Volume/Units 12 tháng + trend theo tháng (tươi đến 07/2026)**, avg loan, mix VA/FHA/Conventional, mix Refinance/Purchase, property cities/types, reverse-mortgage, transaction-level, nút download.
- **Case study Roger Kube** — dòng đầu RLO production hiển thị "Check Modex": NMLS `107621` → $103.85M / 138 units / 12 tháng, avg $752K, 15 năm license, 3 company/10 năm, tenure 8 năm, Score 100.
- URL profile Modex dạng UUID (`/recruit/loan-officers/{uuid}`) → **không deep-link được bằng NMLS** từ ngoài; muốn "1 click từ LF sang đúng profile" cần qua API/search của Modex, không ghép URL được.

### C.4. Defect/quirk mới ghi nhận trên production

1. **Deep-link `?labels=` + filter mặc định ẩn**: `/lo_recruiting/company?labels=test` trả **"1-1 of 0 · No results"** vì có chip filter mặc định "Recruitable" tự bật; bỏ chip mới thấy 33 record. Pagination "1-1 of 0" là chuỗi vô nghĩa.
2. **Global search render HTML thô**: gõ "Associates" ở ô search header → dòng gợi ý hiển thị nguyên văn `<span><i class="material-icons unset-icons">help</i> How can I...</span>`.
3. **Toast "We're experiencing technical difficulty"** bật khi mở trang Associates dù trang hoạt động bình thường (same noise như staging).
4. **Login race**: bấm LOGIN rồi navigate ngay → login bị hủy im lặng, quay lại form (phải chờ ~10s). Người dùng bình thường sẽ tưởng sai mật khẩu.
5. Redirect im lặng khi thiếu quyền (Accounting/Licensing mở RLO → về Marketplace/Applications, không thông báo).

### C.5. Đánh giá "test account" trên production — dùng để test thật được không?

Tìm thấy qua label `test`: RLO 4 record, ILO 33 record. Soi contact từng nhóm:

| Nhóm | Record | Contact | Kết luận |
|---|---|---|---|
| ✅ An toàn để thao tác | Katie Test (RLO) · Test Check (ILO, referrer thuan@) · Test Adda ×2 · Test Testcase | `test@test.com`, `check@testcase.lo` (TLD không tồn tại), phone `(444) 433-3444`/`(540) 000-0000` | Email/SMS bắn vào hư không |
| ⚠️ Thận trọng | RLO Test (`linh.rinnie1004+2@gmail.com`) · Brayan Test (`pajaritogrosero@gmail.com`) · Test ×2 Mortgage-Expo (`nghy2008@gmail.com`, phone thật) | Gmail cá nhân của người trong team | Gửi được mail thật — vào inbox đồng nghiệp |
| ❌ Không đụng | Test Test (NY) — `sssseulgi309@gmail.com` · Jeffrey William Wiesman — danh tính LO THẬT (NMLS 181106, barrettfinancial.com) dù contact giả | Gmail lạ không rõ chủ / danh tính người thật | Rủi ro gửi nhầm người thật |

**Khuyến nghị vận hành khi test trên production:**
- Được: đổi status/priority, thêm note, thêm label, set follow-up **trên nhóm ✅** — side effect (email per-status template) bay vào địa chỉ chết.
- Không bao giờ trên prod: **Call / Zoom SMS** (bắn SMS thật), **Delete**, **Assign recruiter/owner** (notify nhân sự thật), **Add and invite** (kích chuỗi 6 email webinar) trừ khi nhập email đội mình kiểm soát, mọi bulk Action, và Approve ở Pending approvals.
- Lưu ý hệ quả gián tiếp: mọi mutation trên prod đều lọt vào **stats/dashboard thật** mà leadership nhìn (Total, funnel, Run Update) — test nhỏ thì nhiễu không đáng kể nhưng nên dọn (archive lại như cũ) sau khi test.
- Kết luận: **prod chỉ nên dùng để verify luồng/quyền/read-only + smoke-test hẹp trên nhóm ✅**; test phá (CRUD toàn diện, automation chain, webinar flow) vẫn phải làm trên staging.
