# LO Recruiting (hệ thống cũ) — Storyboard video walkthrough theo role

> **Mục tiêu video:** cho người xem thấy **công việc thật của từng role** khi tuyển 1 LO, từng
> hành động một, và **giải thích tại sao** họ phải làm hành động đó — để pain point tự lộ ra
> thay vì phải thuyết trình. Đây là bằng chứng cho bản rebuild trên Tera+.
>
> **Nguồn:** `docs/lo-recruiting-feature-review.md` (audit 3 vòng, đã verify bằng thao tác thật),
> `docs/lo-recruiting-redesign-direction.md` (17 pain point), `docs/lo-recruiting-e2e-flow.md`.
> **Môi trường quay:** staging `www.viet18.com` (được phép CRUD).
> **Ngôn ngữ:** narration + phụ đề **tiếng Anh** (`say -v Samantha`).
>
> Trạng thái: **DRAFT chờ Bao review** — 03/08/2026.

---

## 0. Nhân vật xuyên suốt

Tạo **một** candidate mới và theo nó qua toàn bộ 8 act, không nhảy record:

| Field | Giá trị |
|---|---|
| Tên | `Marcus Reyes` (đặt tên thật-nghe-được, không "Test 123" — video sẽ được chiếu cho CEO) |
| Email | `mreyes-lo-q7w2m9@mailinator.com` — inbox mở bằng URL, **không cần session/login**: `https://www.mailinator.com/v4/public/inboxes.jsp?to=mreyes-lo-q7w2m9` (đã verify 04/08/2026: load được, không paywall) |
| Phone | `(444) 433-3444` — số chết, an toàn |
| NMLS | dùng NMLS thật có production data để Modex tra ra số liệu (ứng viên: `107621` Roger Kube — audit đã xác nhận ra $103.85M/138 units) |
| Channel | Retail LO · Experience: Experienced · Priority: High |

> ⚠️ Staging **gửi email ra ngoài thật** (audit §10.4). Mọi email trong video phải bay vào
> hộp thư dùng-một-lần ở trên, không bao giờ vào địa chỉ thật.
>
> **Lý do chọn Mailinator thay vì temp-mail.org:** địa chỉ temp-mail.org gắn với cookie của
> browser đã tạo ra nó, nên cửa sổ Playwright lúc quay sẽ **không thấy** hộp thư đó — mà scene 4.3
> phải mở mail để ký LO Agreement (điều kiện chạm cổng "100% onboarded"). Inbox Mailinator public
> mở được bằng URL từ bất kỳ browser nào, không session.
>
> **Đánh đổi đã biết:** inbox Mailinator public là **ai biết địa chỉ cũng đọc được**. Đó là lý do
> local-part được chọn khó đoán. Email duy nhất bay vào đó là bộ e-sign của một ứng viên giả trên
> staging; vẫn nên coi link e-sign trong đó là công khai, và đừng dùng hộp này cho bất cứ thứ gì
> khác.

---

## 1. Quy ước narration (quan trọng hơn mọi thứ khác trong file này)

Mỗi scene có narration trả lời 3 câu, theo đúng thứ tự:
1. **Người này đang cố làm gì trong công việc của họ?** (mục đích, không phải mô tả nút)
2. **Chuyện gì xảy ra ở phía sau / phía sau đó nếu họ làm?** (downstream)
3. **Bỏ qua thì vỡ ở đâu?** (hệ quả)

Và khi một hành động chỉ tồn tại để **lách giới hạn hệ thống** (gõ lại data hệ thống đã có, mở
web khác, tự giữ file riêng) → nói thẳng ra, đó chính là điểm chốt của video.

- ❌ "Now we click Save and change the status to Contacted."
- ✅ "Luis sets the status to *Dialogue* because this dropdown is the only place the rest of the
  team can see that this person has already been spoken to. Nothing else records the call —
  the Call counter comes from the Zoom log, not from the app. If he forgets this one dropdown,
  Nocha has no way to know, and Marcus gets called twice by two different recruiters."

Mỗi act **kết** bằng đúng một câu: friction tệ nhất của role đó.

### Phụ đề song ngữ (`--bilingual`)

Tiếng nói và `narration.json` **luôn là tiếng Anh** — giọng Việt (`say -v Linh`) đã test và bị
loại 03/08/2026. Bản song ngữ chỉ thêm **phụ đề** tiếng Việt dưới dòng tiếng Anh, nhỏ hơn và
đổi màu để người xem biết ngay dòng nào là bản gốc.

Hợp đồng quan trọng: **cue được tách từ bản tiếng Anh, và chỉ từ bản tiếng Anh**. `narration.vi.json`
map `sceneId → mảng chuỗi tiếng Việt`, **một chuỗi cho đúng một cue**. Lệch một cue là từ chỗ đó
trở đi phụ đề Việt chú thích sai câu, nên `assemble.mjs` **fail cứng** khi số lượng không khớp
thay vì cảnh báo. Cách viết bản dịch: chạy `node assemble.mjs --dump-cues` (in ra đúng 324 cue
tiếng Anh do chính segmenter sinh), rồi dịch theo từng cue đó.

Bản song ngữ ghi ra **file riêng** (`…-bilingual.mp4`, `subtitles.bilingual.srt`,
`subtitles.vi.srt`, `verify-bilingual/`) — bản tiếng Anh đã kiểm không bao giờ bị ghi đè.

### Cảnh Modex (scene 1.6) — cố ý KHÔNG có hình

Narration đã kể đủ bước đó. Phần hình bị bỏ vì cả hai đường quay đều đóng: Playwright bị
Cloudflare chặn bằng bot-detection (không lách), còn `screencapture -v` quay cả màn hình nên
trên máy đang dùng thật nó ăn luôn cửa sổ riêng tư của người dùng — đã xảy ra 04/08/2026, file
bị xoá ngay. macOS không có chế độ quay video theo từng cửa sổ. Chi tiết trong
`docs/lo-recruiting-video-prompt.md` (dead end e, f). Bộ máy chèn clip ngoài thì đã dựng xong và
còn đó (`expandSplicePlan` + `seq`/`durSec`), chỉ cần một file clip là ghép được.

---

## 2. Bản đồ act

| Act | Role | Account (login-as) | Trọng tâm |
|---|---|---|---|
| 0 | Admin | Chau Chau (đã login) | Địa hình hệ thống + giới thiệu cast |
| 1 | Outside Recruiter | Luis Testcase 635211 | Tìm lead → chạm lần đầu → mời vào công ty |
| 2 | Inside Recruiter | Nocha Hien | Cùng bảng, khác scope → va chạm giữa 2 recruiter |
| 3 | Licensing | Chu Con Gi Nua Testcase | Role bị module bỏ ra ngoài |
| 4 | HR | Ken Customer | Fee → e-sign → gate 100% onboarded → tạo account |
| 5 | Onboarding Specialist | Maria Testcase | Checklist onboarding chạy bằng email |
| 6 | Accounting | Admin Request | Export CSV + referral payout 75 ngày |
| 7 | — | (admin) | Trạng thái cuối của Marcus + montage pain point |

---

## ACT 0 — Admin: địa hình (Chau Chau)

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 0.1 | Mở menu **LO RECRUITING**, đọc 5 mục | Đặt bối cảnh: đây là CRM tuyển LO, và ngay ở menu đã thấy vấn đề đầu tiên — hai kho lead **rời nhau**: Recruited (nguội) và Interested (đang chạy). Người vào sau không biết một cái tên đang ở kho nào, và không có gì bảo đảm một người không nằm ở cả hai. | **P0-1** | menu text `LO RECRUITING` |
| 0.2 | Vào `/recruited_loan_officers/Company`, scroll ngang hết 16 cột | Đây là bảng mà **mọi role** dùng chung. 16 cột, phải kéo ngang mới thấy hết. Không ai trong 7 role cần cả 16 cột, nhưng cũng không ai bỏ được cột nào — nên tất cả đều phải học cách phớt lờ phần lớn màn hình mình đang xem. Trên production kho này là **106.145 record**, 97% chưa ai chạm tới. | **P0-2** | table header row |
| 0.3 | Stats panel: bấm 1 con số → drill-down; đổi 3 chế độ view (bar/text/ẩn) | Con số ở đây là cách leadership đọc tình hình tuyển dụng. Mỗi số bấm được, mở ra list đã filter — phần này thực sự tốt. Nhưng số bị **cache**: audit đo lệch tới 8 ngày, và dashboard phải bấm *Run Update* tay mới tính lại. Nên khi một recruiter nói "em vừa thêm 20 lead", cái bảng này chưa chắc đồng ý. | data-trust | stats panel |
| 0.4 | `/lo_recruiting_config` → đi qua 5 tab, dừng ở tab **1-1 Meeting using Calendly** | Đây là config **toàn công ty**: bật/tắt chuỗi 6 email webinar, nội dung landing page, quy tắc auto-assign owner, kết nối Facebook Ads. Vấn đề không phải trang này, mà là **ai mở được nó**: trên production cả 7/7 role đều vào được, kể cả tab đang chứa **personal access token Calendly của một người cụ thể**. Một recruiter tắt nhầm toggle webinar là cả chuỗi email tuyển dụng của công ty dừng, và không ai được thông báo. | permission | route `/lo_recruiting_config` |
| 0.5 | `/modex_data`: mở 1 record → modal **MODEX INFORMATION** (volume/units 12 tháng, transaction mix) → chỉ vào cột Received | Đây là dữ liệu Modex — đúng thứ recruiter cần để định giá offer: volume, số loan, mix sản phẩm. Nó **đã từng** chảy vào hệ thống: mọi record ở đây mang ngày nhận **24/01/2024**, và không có gì mới hơn. Hai tuần sau ngày đó, Modex công bố MOSO là integration partner. Nghĩa là đường ống này được dựng, đổ một lần, rồi chết — và từ đó tới nay recruiter tra Modex bằng tay. | **P0-17** | `/modex_data` |
| 0.6 | Associates → search một account → Action → **Login** | Giới thiệu cast 6 role, và luôn giới thiệu cơ chế mình sẽ dùng để cho các bạn xem từng role: admin mượn session của người khác. Lưu ý nó **đổi session của cả browser** và **không có nút quay lại admin** — muốn về phải logout rồi đăng nhập lại. Đây cũng là lý do buổi quay này phải xếp theo thứ tự role. | impersonation | Associates → Action → Login |

**Câu kết act:** admin có toàn bộ quyền lực nhưng không có một chỗ nào nhìn được "hôm nay ai đang tắc ở đâu".

---

## ACT 1 — Outside Recruiter (Luis): từ lead lạ đến lời mời

> Luis là recruiter ngoài, sổ của anh là **RLO / Mine** — chỉ record anh own. Đây là act dài nhất
> và là act quan trọng nhất của video.

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 1.1 | Login-as Luis → landing → mở **Recruited Loan Officers / Mine** | Luis mở đầu ngày ở đây. Không có màn "hôm nay làm gì" — chỉ có một danh sách. Việc đầu tiên của anh mỗi sáng là **tự quyết định** hôm nay gọi ai, bằng cách đọc và nhớ. Trên production một recruiter nội bộ có **2.053 lead** trong sổ Mine như thế này. | **P0-3** | tab `Mine` |
| 1.2 | Filter: bật `Active`, `Social media`, mở modal **More** đi hết 7 filter | Đây là cách duy nhất để thu hẹp 2.000 lead: tự tay dựng lại tiêu chí, mỗi sáng. Hệ thống không nhớ giúp anh bộ filter hôm qua, không có "danh sách của tôi", không có gợi ý ai đáng gọi trước. Filter là công cụ tốt — nhưng nó đang thay thế cho việc **hệ thống lẽ ra phải tự xếp việc**. | **P0-3** | `More` button |
| 1.3 | Gõ vào search box, chọn một suggestion → ra **"1-1 of 0 · No results"** → xoá chip filter mặc định mới thấy record | Đây là bug Luis gặp hằng ngày mà không biết là bug: chọn gợi ý trong ô search thì trang filter theo `?labels=` cộng với một chip mặc định đang bật sẵn, kết quả trả về rỗng. Người dùng kết luận "hệ thống không có người này" rồi đi tạo trùng. Trên production tôi tái hiện đúng như vậy: "No results", bỏ chip mới thấy 33 record. | search/UX | search input |
| 1.4 | Toolbar → **Add** → điền form tạo Marcus Reyes, cố tình submit sớm 2 lần | Luis tạo tay khi lead đến từ ngoài luồng — hội thảo, người quen giới thiệu. Form không đánh dấu trường bắt buộc, và mỗi lần submit chỉ báo **một** lỗi mới. Nên quy trình thật là: submit, đọc lỗi, sửa, submit lại — audit ghi nhận phải qua nhiều vòng mới xong. Với người tạo 20 lead/ngày, đây là thuế đánh vào mỗi lead. | UX | `Add` |
| 1.5 | Badge **Social media** → modal Update social links → bấm **"Copy Name And NMLS #"** | Cái nút này là bằng chứng rõ nhất trong cả hệ thống. Nó tồn tại chỉ để Luis **copy tên và số NMLS ra clipboard rồi đi dán sang website khác** — Facebook, LinkedIn, Zillow, và Modex. Hệ thống biết mình đang thiếu dữ liệu, và giải pháp của nó là giúp bạn rời khỏi nó cho nhanh. | **P0-17** | `Copy Name And NMLS #` |
| 1.6 | Mở tab Modex thật, dán NMLS `107621`, đọc $103.85M / 138 units / avg $752K | Đây là bước quyết định của Luis: không có volume và số loan thì không thể đưa ra offer hợp lý. Anh làm nó ngoài hệ thống, mỗi ứng viên một lần, và **không có gì trong hồ sơ ghi lại là anh đã tra** — người sau phải tra lại. URL profile Modex là UUID nên cũng không dán lại được vào record để lần sau mở nhanh. | **P0-17** | (tab ngoài) |
| 1.7 | Về app: **Friendship** → `Friend requested` | Đây là công việc thật của recruiter LO: kết bạn Facebook trước khi gọi, vì LO không nhận cuộc gọi từ số lạ. Trạng thái kết bạn được theo dõi bằng tay, và nó cũng là lý do Luis cần social links ở scene trước. | — | Friendship cell |
| 1.8 | Per-row **Call** → modal call script (250bps · 100% commission − $595 − $500 · $300/referee loan) → chỉ nút *Call via my Zoom Phone* | Modal này **không gọi** — nó đưa script bán hàng để Luis đọc, rồi deep-link sang app Zoom. Điểm đáng nói: cột Call đếm từ **log Zoom**, không đếm click. Nghĩa là nếu Luis gọi bằng điện thoại cá nhân — chuyện xảy ra thường xuyên — hệ thống ghi là anh chưa gọi ai. Con số hoạt động của cả team vì thế thấp hơn thực tế. | activity tracking | `Call` |
| 1.9 | **Zoom SMS** → lỗi "Failed to send Zoom SMS: User not found" | Đây là trạng thái mặc định của một recruiter mới: chưa được map Zoom Phone thì nút này chết, và thông báo lỗi không nói phải làm gì hay hỏi ai. Người dùng bỏ nút, chuyển sang nhắn bằng điện thoại riêng — và mọi tin nhắn đó biến mất khỏi hệ thống. | error UX | `Zoom SMS` |
| 1.10 | **Note 💬** → viết note thật → **Pin** → **Save + Email** gửi tới HR/Licensing | Đây là "conversation history", và trên thực tế nó là **hệ điều hành của cả module**: mọi phối hợp giữa các phòng ban đi qua đây, dưới dạng email. Không có task, không có người nhận việc, không có deadline — chỉ có một note và một email. Việc theo dõi ai đã đọc, ai đã làm nằm ngoài hệ thống, trong hộp thư của từng người. | **P0-3** | note icon |
| 1.11 | Click nhãn **Status** → modal CHANGE STATUS → chọn `Dialogue` → note → Submit | 10 status trong dropdown này là toàn bộ hiểu biết của công ty về việc "đang đến đâu với người này". Nó là **nhãn thủ công, không bắt buộc, không kiểm tra gì**: Luis mời được người ta vào công ty mà vẫn để nguyên status *Not touched* cũng không sao — audit xác nhận action "Invite" khả dụng ở **mọi** status. Nên con số funnel mà leadership xem phụ thuộc vào việc từng recruiter có nhớ đổi dropdown hay không. | **P0-4** | status label |
| 1.12 | Row Action → **Add or remove a follow-up flag** → chọn wake-up date → xem Flag history | Đây là cách Luis "hẹn lại" một người chưa sẵn sàng. Cơ chế đúng: đến ngày, hệ thống bắn notification/email/text cho owner. Nhưng record bị flag **ẩn khỏi pipeline cho tới ngày wake** — nghĩa là công việc tương lai của Luis không nhìn thấy được ở đâu cả, và nếu notification vào spam thì lead đó im lặng biến mất. | follow-up | Row Action |
| 1.13 | Row Action → **Audit log** (field-level old→new + user + time) | Có audit log đầy đủ tới từng field — điểm mạnh thật sự, giữ lại khi rebuild. | (strength) | Row Action |
| 1.14 | Row Action → **Invite Loan officer to join Loan Factory** → chọn Referral source, toggle Waive $100, Send invitation email → Submit | Đây là điểm chuyển giao: Marcus rời kho nguội và bước vào pipeline. Ba quyết định nằm trong một modal — nguồn giới thiệu (bắt buộc, vì nó gắn với tiền thưởng referral sau này), có miễn $100 startup fee hay không, và có gửi email mời hay không. Modal ghi rõ record "sẽ được chuyển sang pipeline Interested Loan Officers", nhưng **không có chỗ nào nhắc rằng dữ liệu Modex Luis vừa tra bằng tay không đi theo** — người tiếp theo phải tra lại từ đầu. | **P0-1 · P0-17** | Row Action |
| 1.15 | Mở ILO → thấy Marcus với badge *Converted from recruited LO*, status *Invited to join* | Cùng một con người, giờ tồn tại ở kho thứ hai, với bộ status **khác hẳn** (8 status thay vì 10) và một bảng cột khác. Người mới vào việc phải học hai từ vựng cho một quy trình. | **P0-1** | ILO board |

**Câu kết act 1:** việc quan trọng nhất của Luis — định giá một ứng viên — là việc duy nhất hệ thống không giúp anh làm.

---

## ACT 2 — Inside Recruiter (Nocha): cùng cái bảng, khác cái sổ

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 2.1 | Login-as Nocha → ILO: chỉ có tab **Mine**, không có Company | Nocha là inside recruiter. Cùng một trang mà Luis vừa dùng, nhưng cô **không có tab Company** — trong khi Luis, vì kiêm cả role Outside, thì có. Ranh giới in/out không được định nghĩa ở đâu, nó là hệ quả của việc gán quyền cho từng người một. | **P0-2** · RBAC drift | ILO tabs |
| 2.2 | Mở đúng record Marcus, không thấy dấu vết cuộc gọi của Luis (ngoài note) | Đây là pain point tôi muốn quay bằng hình chứ không kể: Nocha đang xem đúng con người mà Luis vừa nói chuyện, và cô **không thấy** việc đó — trừ khi Luis nhớ đổi status và nhớ viết note. Không có activity feed dùng chung. Trong thực tế đây là lúc LO nhận cuộc gọi thứ hai từ cùng một công ty. | **P0-4** | record row |
| 2.3 | RLO: có Mine + Pending approvals, không có Add / Delete / Assign recruiter; bulk chỉ còn **Update data using Modex** | Model quyền ở đây là "SDR chỉ chạm lead của mình" — hợp lý. Nhưng trên **production** thì cùng role này lại có Delete và Assign trên toàn kho 106K. Cùng một chức danh, hai môi trường, hai bộ quyền: vì quyền không gắn với role mà cấp cho từng người. | RBAC drift | toolbar |
| 2.4 | Vẫn mở được `/lo_recruiting_config` | Và cô vẫn mở được config toàn công ty, kèm token Calendly. | permission | route |
| 2.5 | Tab **Pending approvals** → 1 record self-apply → **Check Modex** per-row → **Approve** | Đây là luồng người tự ứng tuyển. Đáng chú ý: ở tab này có link *Check Modex* ngay trên dòng — hệ thống thừa nhận "phải sang Modex mới đánh giá được", nhưng chỉ thừa nhận ở đúng một chỗ này. Approve xong record rơi sang tab Company và... hết. Không ai được giao việc gọi người đó. | **P0-17** · handoff | `Approve` |

**Câu kết act 2:** hai recruiter làm cùng một việc trên cùng một bảng mà không nhìn thấy nhau.

---

## ACT 3 — Licensing (Chu Con Gi Nua): role bị đứng ngoài

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 3.1 | Login-as Licensing → mở menu: **không có LO RECRUITING** | Licensing là người làm NMLS sponsorship — không có bước này thì LO không được phép làm việc. Trên staging, role này **không có menu module** luôn. Công việc của họ diễn ra ở nơi khác: Associates, hồ sơ HR, và email. | **P0-1** | nav |
| 3.2 | Gõ trực tiếp `/lo_recruiting/Mine` → bị **redirect im lặng** sang trang khác | Không có thông báo "bạn không có quyền" — chỉ lặng lẽ nhảy sang trang khác. Người dùng nghĩ mình bấm sai, thử lại, rồi đi hỏi IT. | error UX | URL |
| 3.3 | (Trên production, đọc từ audit) cùng role này lại **thấy toàn bộ 23.5K ILO + mở được config** | Cùng chức danh Licensing: staging chặn sạch, production mở gần hết. Đây là hệ quả trực tiếp của việc cấp quyền theo từng người thay vì theo việc họ phải làm. | RBAC drift | (slide) |
| 3.4 | Cho thấy các trường **NMLS status / License status / States to sponsor** đang là **cột trong bảng** của người khác | Đây là thông tin của Licensing, nhưng nó sống trong bảng của recruiter, dưới dạng cột. Không có màn hình nào của Licensing, không có hàng đợi "hồ sơ chờ sponsor", không có luật theo bang. Nên họ tự giữ danh sách riêng ngoài hệ thống — và đó là lý do tình trạng sponsor thật và cái hiển thị trong app hay lệch nhau. | **P0-1** | ILO columns |

**Câu kết act 3:** một mắt xích bắt buộc của quy trình không có chỗ đứng nào trong công cụ của quy trình đó.

---

## ACT 4 — HR (Ken): tiền, chữ ký, và cái cổng "100% onboarded"

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 4.1 | Login-as Ken → ILO **company-wide** + đọc funnel stats 11 ô | HR nhìn toàn bộ pipeline. Các ô ở đây là những câu hỏi rất thật: *Paid but not signed*, *NMLS sponsored but HR onboarding*, *HR completed but NMLS not sponsored* — mỗi ô là một kiểu mắc kẹt. Điều đáng nói là chúng chỉ để **đếm**: bấm vào ra một danh sách, nhưng không ai được giao việc, không có deadline, không có ai chịu trách nhiệm. | **P0-3** | stats |
| 4.2 | Mở record Marcus → set **Startup fee = Paid** → quay cận cảnh status **tự nhảy** sang `Onboarding` | Đây là auto-transition duy nhất trong cả hệ thống, và nó chạy đúng. Nhưng nó cũng là nguồn của một sự nhầm lẫn: một số status là máy đổi, phần lớn còn lại là người đổi tay, và trên UI **hai loại trông y như nhau**. Không ai đọc được "cái này tự chạy" hay "cái này ai đó vừa bấm". | **P0-4** | fee field |
| 4.3 | Row Action → **Re-generate e-sign documents and send email** → mở temp-mail, ký LO Agreement thật → về app thấy `Signed` | Chữ ký là điều kiện cứng thứ hai. Nút re-generate tồn tại vì bộ tài liệu hay phải phát lại — đổi thông tin, hết hạn, người ta xoá mail. Hệ thống theo dõi *đã ký / chưa ký*, nhưng không theo dõi *đã gửi / đã mở / đã xem* — nên khi ứng viên im lặng, HR không biết là chưa nhận được mail hay là đang do dự, và cách duy nhất để biết là gọi hỏi. | e-sign | Row Action |
| 4.4 | Set **100% onboarded** thủ công dù NMLS/HR/1-1 meeting **chưa** xong | Đây là phát hiện quan trọng nhất của cả act. Cổng "100% onboarded" — trạng thái mà mọi báo cáo tuyển dụng đếm — chỉ cần đúng hai điều kiện: **đã trả tiền và đã ký**. NMLS sponsored, HR completed, 1-1 meeting chỉ dùng cho cơ chế auto. Nghĩa là một người có thể được tính là onboarded xong trong khi chưa được cấp phép hành nghề ở bang nào. Con số 2.596 "100% onboarded" trên production nên được đọc với hiểu biết đó. | **P0-4** | status |
| 4.5 | **Template settings** → đi qua kho template Email/SMS/Call script theo từng status | Đây là nơi nội dung giao tiếp của cả công ty được cất: mỗi status có email, SMS và script gọi riêng, có biến chèn tên công ty, tên LO, tên người gửi. Đây là asset thật, nên port nguyên sang Tera+. Vấn đề là nó lẫn vào một trang settings mà **mọi role** đều mở được. | (strength) + permission | `Template settings` |
| 4.6 | Row Action → **Invite 1-1 meeting** (email đặt lịch Calendly) | Cuộc gặp 1-1 là bước thẩm định người thật. Lịch nằm ở Calendly, kết quả nằm ở checkbox trong app, và hai bên **không nối với nhau** — ai đó phải nhớ vào tick tay sau khi gặp. Không tick thì mọi ô thống kê liên quan sai. | integration gap | Row Action |
| 4.7 | Row Action → **Create new account** → form CREATE NEW ASSOCIATES (W-2/W-9, classification, probation, branch/team/manager, company email) | Đây là lúc ứng viên trở thành nhân sự thật: có account, có branch, có manager, có email công ty. Đây là ranh giới giữa module tuyển dụng và toàn bộ phần còn lại của hệ thống. Đáng lưu ý: **mọi role vận hành đều bấm được nút này**, không chỉ HR. | permission | Row Action |
| 4.8 | Chỉ vào nút **Delete** company-wide (giới thiệu, KHÔNG bấm) | HR và Accounting có nút xoá trên toàn bộ pipeline 23.5 nghìn record. Tôi sẽ không bấm nó. | permission | toolbar |

**Câu kết act 4:** cái cổng quyết định "đã tuyển xong" đo bằng tiền và chữ ký, không đo bằng việc người đó đã sẵn sàng làm việc chưa.

---

## ACT 5 — Onboarding Specialist (Maria): checklist chạy bằng email

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 5.1 | Login-as Maria → ILO **chỉ có Mine** | Maria là người thực sự đưa LO mới vào guồng. Cô chỉ thấy record được gán cho mình — nên nếu owner gán sai, một ứng viên có thể ngồi im trong pipeline mà không ai coi là việc của mình. | ownership | ILO tabs |
| 5.2 | Đối chiếu với config tab **ILO Owner Assignment Methods** | Lý do record tự có owner nằm ở đây: một toggle auto-assign trong trang settings. Nó giải thích vì sao đôi khi record mới về tay người không tạo ra nó — và vì sao không ai chắc luật gán là gì trừ khi vào đọc config. | assignment | config tab |
| 5.3 | Mở Marcus, đi qua các cột **NMLS status / License status / HR status / 1-1 meeting / Attended?** | Đây là toàn bộ "checklist onboarding" của hệ thống: một dãy cột trong một bảng. Không phải task, nên không có người nhận, không có hạn, không có thứ tự, không thấy đang chờ ai. Bốn phòng ban cùng làm việc trên một dòng dữ liệu và cách duy nhất để biết phần của người khác xong chưa là **nhìn cột hoặc đi hỏi**. | **P0-3** | ILO columns |
| 5.4 | Dùng **Note → Save + Email** gửi Licensing hỏi tình trạng sponsor | Và đây là cách hỏi: một note kèm email. Đây chính là "workflow engine" thật của onboarding — hộp thư. Không có gì trong hệ thống biết rằng Maria đang bị chặn, chặn bao lâu, hay ai đang giữ việc. | **P0-3** | note |
| 5.5 | Row Action → **Register for a webinar** + bulk **Import "Attendance tracking"** | Webinar là kênh nuôi ứng viên lớn nhất, và điểm danh được nhập bằng **file CSV** sau mỗi buổi. Nghĩa là trạng thái "đã tham dự" luôn đi sau thực tế, phụ thuộc vào việc có ai nhớ export từ Zoom rồi import vào đây. | manual sync | Row Action / Action |

**Câu kết act 5:** người chịu trách nhiệm onboarding không có màn hình nào cho biết hôm nay ai đang bị tắc và tắc vì ai.

---

## ACT 6 — Accounting (Admin Request): số liệu và tiền thưởng

| # | Màn hình / hành động | Narration (WHY) | Pain | Selector hint |
|---|---|---|---|---|
| 6.1 | Login-as Accounting → ILO company-wide → **Action → Export (csv)** | Accounting là **role duy nhất** có Export CSV. Điều đó nói lên một chuyện: báo cáo thật của công ty không sống trong hệ thống này, nó sống trong bảng tính mà người ta export ra. Mọi phân tích tuyển dụng nghiêm túc đều bắt đầu bằng một lần bấm nút này. | reporting | `Action` |
| 6.2 | Mở **Admin - Loan Officer referrals** → đọc modal policy 5 điều kiện loại trừ | Chương trình referral: LO giới thiệu LO. Năm điều kiện loại trừ nằm trong một modal chữ — quá 120 ngày, đã đăng ký webinar trước khi được refer, từng làm ở Loan Factory, là vợ/chồng người refer, thuộc broker không exclusive. Hệ thống **không kiểm** những điều đó; nó in ra để người duyệt tự đọc và tự nhớ. Mỗi lần duyệt là một lần con người phải chạy lại 5 luật trong đầu. | rules-in-prose | referrals page |
| 6.3 | Giải thích timeline payout trên màn hình record | Tiền thưởng chín sau **60 ngày** kể từ ngày LO onboarded, rồi một cron **chạy vào thứ Bảy** mới sinh yêu cầu commission, rồi Commission Team duyệt — tổng khoảng **75 ngày**. 15 ngày trong đó không đến từ chính sách mà đến từ **kiến trúc**: chờ đến thứ Bảy. Người giới thiệu thì chỉ biết là "lâu". | batch-job latency | record |
| 6.4 | Form edit referral → tuỳ chọn nhận qua **Zelle** | Phương thức trả tiền là một trường tự do trong form tuyển dụng — không nối với payroll. Nên bước cuối cùng của quy trình tuyển dụng vẫn là một người copy thông tin sang một hệ thống khác. | handoff | edit form |

**Câu kết act 6:** đường đi của một khoản thưởng dài hơn chính sách của nó, và phần dài thêm là do hệ thống.

---

## ACT 7 — Wrap-up

| # | Nội dung | Narration |
|---|---|---|
| 7.1 | Mở lại record Marcus, trạng thái cuối | Đi qua một vòng: Marcus vào hệ thống như một dòng trong kho nguội, được một người tra cứu bằng tay ở website khác, được chuyển sang kho thứ hai với bộ status khác, trả tiền, ký, rồi được đánh dấu onboarded xong trong khi giấy phép hành nghề vẫn chưa xong. Sáu người đã chạm vào anh ấy. Không ai trong sáu người đó nhìn thấy toàn bộ đường đi. |
| 7.2 | Montage: cắt nhanh lại từng pain badge đã xuất hiện | Nhắc lại theo thứ tự thời gian, mỗi cái 2 giây. |
| 7.3 | Slide bản đồ 6 nguồn lead | Và tất cả những việc trên chỉ là **một** trong sáu nguồn lead: Modex, CSV import, Facebook Lead Ads, tự ứng tuyển, webinar, referral. Mỗi nguồn có một đường vào khác nhau, và không nguồn nào chia sẻ định nghĩa "đã liên hệ chưa". |
| 7.4 | Đóng | Câu chốt cho anh Thuận/Victoria/Benjamin: hệ thống này không thiếu tính năng — nó thiếu **thứ tự việc**, **một danh tính duy nhất cho một con người**, và **dữ liệu tự đến với người cần dùng**. |

---

## 3. Rủi ro kỹ thuật của buổi quay (đọc trước khi lên lịch)

1. **Impersonation không có đường về admin.** Audit §10.3: bấm *Login* để mượn session sẽ đổi
   session **cả browser**, và **không có nút "Back to admin"** — cách duy nhất là logout rồi đăng
   nhập lại. Với 7 lần đổi role, đây là rủi ro số một của buổi quay.
   → **Bắt buộc pre-flight:** login admin **một lần**, lưu `storageState`, rồi thử khôi phục nó
   trong một context mới. Khôi phục được → mỗi act bắt đầu bằng một context mới seed từ file đó,
   Bao **không phải gõ lại lần nào**. Không khôi phục được → Bao phải login lại **7 lần** trong
   buổi quay, và phải xếp lịch tương ứng. Test cái này TRƯỚC khi quay scene đầu tiên.
2. **Lưu `storageState` riêng cho từng role** ngay sau mỗi lần login-as → sau này quay lại một act
   lẻ không phải chạy lại từ act 0.
3. **Staging gửi email thật.** Mọi email trong video chỉ được bay vào temp-mail.
4. **Modal Change Status hỏng nếu filter đổi giữa chừng** (toast "technical difficulty" nhưng thực
   tế đã lưu) → trong scene 1.11 đừng đổi filter khi modal đang mở, trừ khi muốn quay đúng bug đó
   (đề xuất: quay, vì nó là pain point thật — nhưng quay ở take riêng).
5. **Index record mới chậm** (eventual consistency) → sau khi tạo Marcus, chờ trước khi search;
   đừng để camera chạy trong lúc chờ.
6. **Version lệch:** staging 3.45.0, production 3.61.0. Nói rõ trong intro rằng video quay trên
   staging, và những chỗ production khác (quyền rộng hơn, 106K record) sẽ chèn slide số liệu thật.

## 4. Cần Bao chốt

1. Thứ tự act — tôi xếp theo dòng thời gian thật của một ứng viên. Nếu muốn nhóm theo phòng ban
   (recruiting → licensing → HR → onboarding → accounting) thì đổi được, nhưng mạch "một người đi
   qua 6 bàn" dễ hiểu hơn.
2. Tên ứng viên minh hoạ: `Marcus Reyes` — hay muốn tên khác?
3. Có quay scene bug (search "No results", Change Status toast sai, Zoom SMS "User not found")
   không? Tôi đề xuất **có** — đó là pain point sống, và quay được bằng hình.
4. Act 3 (Licensing) trên staging gần như trắng. Muốn tôi chèn slide đối chiếu production
   (Licensing thấy 23.5K + mở được config) để act này có nội dung không?


---

## Bản PRODUCTION (`narration.production.json`)

Bản thứ hai của cùng câu chuyện, quay trên host production thay vì staging (host lấy từ biến môi
trường `LORV_PRODUCTION_BASE`, **không commit vào repo** — xem quy tắc env ở dưới). Lý do tồn tại: bản
staging phải *kể* các con số production ("on production this warehouse holds…") vì dữ liệu staging quá
mỏng. Bản này **chiếu** chúng.

`narration.production.json` giữ **nguyên 51 id và nguyên thứ tự** của bản English, nên mọi thứ trong
`recorder/` map 1-1; chỉ nội dung thoại đổi. Bản English đã ship (`final/lo-recruiting-role-walkthrough.mp4`)
**không được ghi đè**.

### Nhân vật và dàn diễn viên

| | Staging | Production |
|---|---|---|
| Ứng viên | Marcus Reyes (tự tạo trong act 1) | **Test Test (New York)** — record có sẵn từ 09/09/2025, `?_e=…NTcxNjEwNDAyNjUyMTYwMA` |
| Admin | Chau Chau | IT Team |
| Outside Recruiter | Luis Testcase | **Seth August** (Hawaii) |
| Inside Recruiter | Nocha Hien | **Brayan Suarez** (Colombia) |
| Licensing | Chu Con Gi Nua | **Dung Nguyen** |
| HR | Ken Customer | **Dave Hoang** |
| Onboard Specialist | Maria Testcase | **Miley Dau** |
| Accounting | Admin Request | **Rosaline Pham** |

Ứng viên **không** được tạo mới trong act 1 nữa. Nhân vật vào pipeline qua menu Action của chính dòng RLO
(`Invite Loan officer to join Loan Factory`) — tức là ghi lên dòng test có sẵn, không sinh record mới.

### Chuẩn bị record trước khi quay (đã làm 05/08/2026, off camera)

Email cũ của Test Test là một địa chỉ **Gmail thật của một người lạ**, gần như chắc chắn đến từ một lần
scrape. Đã đổi sang một inbox Mailinator dùng-một-lần để không nút gửi nào bắn vào người thật. Địa chỉ cũ
và địa chỉ mới đều **không ghi ở đây**: cái thứ nhất là dữ liệu cá nhân của người ngoài, cái thứ hai là hộp
thư công khai ai đọc cũng được. Cả hai nằm trong `bd memories lo-recruiting-video-production-shoot`.
Đổi được một field đó **buộc** phải điền 5 field `required` khác (xem act 1 dưới): `Licensed states`=New York,
`States to sponsor`=New Jersey (chọn NJ có chủ ý — bang này có rule 2.5h nên act Licensing có việc thật),
`Career Production`=25000000, `Preferred languages`=English, `Mailing street address`= tick *Same as personal
address* (không bịa dữ liệu). **NMLS cố ý để trống** — nó là đạo cụ của act 1.

### Deltas theo act

- **Act 0** — s0_3 không còn nói về "Run Update" (chưa đo trên production) mà nói về thứ đã đo: ba counter
  của funnel (`Invited to join`, `Want to join`, `Interested but thinking`) đều **0**, và `claimed + not claimed`
  hụt 3.000 so với `Total`. s0_5 dùng bằng chứng production: mọi dòng `/modex_data` cùng ngày `1/24/2024` với
  timestamp cách nhau **7 giây** (một lần import duy nhất) và cột liên lạc là `No email / No Phone`.
- **Act 1** — s1_4 thay hẳn: không còn là "form Add 22 nhóm required", mà là **không sửa nổi record có sẵn**.
  Submit → `Licensed states is required` → điền → `States to sponsor` → `Career Production` → `Mailing street
  address` → `Preferred languages`. Năm field bung ra từng cái một.

  **Quay trên dòng `Katie Test`, KHÔNG phải trên nhân vật chính.** Hai lý do. (1) Chuẩn bị record đã điền
  đủ 5 field cho Test Test để đổi được email, nên trên record đó cái tường **không còn tái hiện** — tôi đã
  tự phá mất bằng chứng bằng cách sửa nó. (2) Đặt ở Katie Test lại **đúng hơn về mặt kể**: s1_3 kết ở đúng
  dòng bị đánh `(Duplicated)` đỏ, s1_4 là Seth đi dọn cái trùng đó và form không cho — hai pain nối nhau
  theo nhân quả thay vì rời rạc. Katie Test đã verify 05/08/2026: cả 5 field trống, `NMLS` trống, email là
  `test@test.com` (rác, không phải người thật).

  **Scene BẮT BUỘC kết bằng Cancel, không bao giờ Submit thành công.** Narration chỉ cần cái tường, không
  cần lần lưu thành công; mà lưu thành công thì lấp luôn cái tường và lần quay lại sau sẽ không còn gì để
  chiếu. Đây là scene duy nhất trong cả video mà "không ghi" là một yêu cầu kỹ thuật, không phải sự thận
  trọng. s1_1 mở bằng sổ khách **rỗng** (Seth sở hữu
  0 record; toàn kho chỉ 11 dòng claimed). s1_3 kết bằng dòng `Katie Test (Duplicated)` đỏ có thật trên grid.
- **Act 2** — s2_1 lượng hoá thay vì mô tả: cùng hai chữ *inside recruiter* mà Seth có **2/82** công tắc, Brayan
  có **15/82**. s2_2 viết lại để **không** khẳng định trước board của Brayan hiện gì (chưa xem session của anh ấy);
  câu thoại giữ phần cơ chế, hình để hình nói.
- **Act 3** — bỏ hẳn câu so sánh staging↔production của bản cũ (nó **sai** trên production). Sự thật: Dung có
  **30/82** nhưng **không** có `RECRUITED_/INTERESTED_LOAN_OFFICERS`, trong khi lại có `CONFIG`, `EDIT_LENDER`,
  `EDIT_ALL_COMPANY_TRANSACTIONS`, `PAY_BRANCH_COMMISSION`. Người licensing sửa được *cách công ty tuyển dụng*
  mà không xem được một ứng viên nào.
- **Act 4** — số thật: `Paid but not signed` 4, `1-1 done nhưng HR chưa initiate` 33, `fully onboarded` **2.601**.
  s4_8 thêm phát hiện **74/82** của Dave, gồm `PAM_GRANT_PERMISSION` — chính là cơ chế sinh ra mọi dị thường quyền
  trong video.
- **Act 5** — s5_2 đảo ngược: quy tắc gán chủ sở hữu nằm trong trang config mà **Miley không mở được** (không có
  `CONFIG`), nên người nhận việc không thấy được luật quyết định việc đó là của mình.
- **Act 6** — viết lại quanh phát hiện lớn nhất của act: Rosaline **không có quyền vào pipeline**. Người chi
  referral bonus chưa từng mở được cái pipeline sinh ra khoản đó; số liệu tới tay accounting dưới dạng file
  người khác export. (Bỏ câu "accounting là role duy nhất có CSV export" của bản staging.)
- **Act 7** — kết bằng ma trận quyền: 74 vs 2, và hai người không mở được thứ họ chịu trách nhiệm.

### Kỷ luật: mọi số đọc trên camera phải là số tự đo

Bản staging từng suýt ship hai câu sai (cả 7 role mở được config; licensing trên production thấy toàn pipeline).
Cả hai đều **sai** khi đo thật. Nguồn của từng con số trong bản production:

| Khẳng định | Nguồn |
|---|---|
| 106.145 / 102.715 / 11 | counter RLO, đọc live 05/08/2026 |
| 23.602 / 2.601 / 542 / 4 / 33 | counter ILO, đọc live 05/08/2026 |
| 82 công tắc; 2 / 5 / 14 / 15 / 30 / 74 | modal Permissions từng account (không cần Login-as) |
| 4/6 role có `CONFIG` | tick trên Brayan, Dung, Dave, Rosaline; không có ở Seth, Miley |
| Dung + Rosaline không vào được pipeline | thiếu cả `RECRUITED_` và `INTERESTED_LOAN_OFFICERS` |
| Seth sở hữu 0 record | filter `?recruiter=<...>` → No results. Đáng chú ý: filter khoá theo **Gmail cá nhân** của nhân viên, không phải email công ty (địa chỉ cụ thể không commit) |
| Modex: một batch, 7 giây | `/modex_data` timestamps `1:07:47 / :50 / :54`, tất cả `1/24/2024` |
| 5 field required chặn mọi lần sửa | tái hiện trực tiếp trên record Test Test |
| 60 ngày + job thứ Bảy ≈ 75 ngày | phân tích code, `lo-recruiting-redesign-direction.md` |

### Quy tắc env cho bản production

Host production, email nhân viên, và địa chỉ inbox của nhân vật **không được commit**. `record.mjs` đọc host
từ `LORV_PRODUCTION_BASE` và fail sớm nếu thiếu, nên không có domain nào nằm trong file. Danh sách account
theo role nằm trong `bd memories lo-recruiting-production-permission-matrix`, không nằm trong repo.

### Đọc quyền mà KHÔNG cần Login-as

`/associates?labels=<email>` → row `Action` → **`Permissions`** → modal cây 82 checkbox. Đọc được hết từ admin,
**không đốt session**, nên viết được narration đúng trước buổi quay. Đóng modal bằng `.modal.show button.close`
(Escape không đóng). Đây là cách rẻ nhất để kiểm mọi khẳng định về quyền — dùng lại trước mỗi lần quay.

### Runbook buổi quay production

Session state chỉ sống vài giờ (đo được: chết trong khoảng ~1h–6h) nên **provisioning và quay phải cùng
một buổi**. Sáu lần login tay ở bước 1, một lần nữa ở bước 2 — tổng bảy, mỗi lần chỉ là bấm trong cửa sổ
Playwright đang mở.

```bash
cd docs/lo-recruiting-video/recorder
export LORV_VARIANT=production
export LORV_PRODUCTION_BASE='https://<host>'     # không commit, xem quy tắc env ở trên

# 1. Provisioning: 6 role, mỗi role một lần admin login tươi (impersonate đốt state admin).
#    Off camera, không ghi footage.
node record.mjs --provision --acts 1,2,3,4,5,6

# 2. KHÔNG có bước riêng để lấy state admin. `inspect.mjs` là probe READ-ONLY và nó
#    TỪ CHỐI chạy khi chưa có state admin — nó không tạo ra state. Chính lệnh quay ở
#    bước 4 gọi ensureAdminState() và hỏi login admin một lần ở đầu, vì act 0 và act 7
#    có role 'admin'. Acts 1-6 seed từ role state nên không impersonate, nên state admin
#    KHÔNG bị đốt giữa đường: một lần login phục vụ cả act 0 và act 7.

# 3. Kiểm mọi state còn sống TRƯỚC khi quay (exit 1 nếu có cái chết).
#    Đừng đo $? qua pipe — nó sẽ là exit code của tail.
#    Lưu ý: 'MISSING admin' ở bước này là BÌNH THƯỜNG — lần impersonate cuối của
#    provisioning đốt state admin và script xoá nó đi.
node inspect.mjs --check-states

# 4. Quay. Login-free vì đã có role state.
node record.mjs --acts 0,1,2,3,4,5,6,7 \
  --markers markers.production.json \
  --durations ../audio-production/durations.json \
  --out video-production \
  --wall-record 'Katie Test' --wall-nmls <số-chưa-dùng> \
  --demo-record 'RLO Test' \
  --mail-url '<mailinator public inbox>'

# 5. Ghép. Bản English trước để soi frame, rồi bản song ngữ.
node assemble.mjs --variant=production --markers=markers.production.json
node assemble.mjs --variant=production --bilingual --markers=markers.production.json
```

Production **không cần** `--candidate-email` / `--candidate-nmls`: nó làm việc trên record có sẵn, không
mở form Add, nên không có gì bị dedupe và không tạo record mới. Đây là khác biệt lớn nhất so với runbook
staging, nơi cả hai giá trị đó bắt buộc phải tươi mỗi lượt quay.

Sau bước 4, **bắt buộc soi frame từng scene** trong `final/verify-production/` trước khi gửi. Bài học từ
bản staging: log báo "act 0: 1 lỗi" trong khi 6/7 scene quay sai màn hình — `0 failures` không phải thước
đo chất lượng.

### Trạng thái bản production sau buổi quay 05/08/2026 — CHƯA XONG

Bốn lượt quay. Đã sạch và dùng được: **act 0, 2, 3, 6, 7** (23 scene). Còn hỏng: **act 1** (9 beat cấp dòng
+ `s1_14`) và **act 4, 5**.

**Gốc của mọi thứ còn lại là DANH TÍNH NHÂN VẬT.** File này nhận diện ứng viên bằng *tên + NMLS* ở **bốn**
chỗ độc lập — `candidateRow`, `readIloState`, `countSameName`, `narrowToCandidate` — và nhân vật production
cố tình **không có NMLS** (để lấy beat recruiter tự gõ). Trong pipeline lại có **tám** record cùng tên
`Test Test`. Hệ quả: mọi phép đọc/ghi rơi vào `.first()`, một dòng ngẫu nhiên. Tôi đã thêm `candidate.match`
(chuỗi nhận diện chính xác, tách khỏi chuỗi gõ vào search) nhưng nó chỉ chữa `candidateRow`; ba chỗ kia vẫn
kiểm `nmls`.

**CÁCH SỬA, và đừng vá lớp thứ năm:** cho nhân vật **một NMLS riêng**. Mọi đường nhận diện trong file vốn đã
hỗ trợ NMLS chính xác (`:text-is()`, xem ghi chú viết hoa ở `candidateRow`), nên **không cần sửa code nữa**.

1. Mở record ILO của nhân vật. Nó là dòng **duy nhất** mang nhãn `Test Test (New York)` kèm
   `Converted from recruited LO` và `Since 2021: 25000000`. Tool có sẵn: `node tools/find-subject.mjs`.
2. Đặt `NMLS = 9990125` (chưa dùng) rồi Submit. Năm field required đã điền sẵn nên form lưu được.
3. Quay lại: `node record.mjs --acts 1,4,5 --candidate-nmls 9990125 --wall-record 'Katie Test' \
   --wall-nmls 9999001 --demo-record 'RLO Test' --markers markers.production.json \
   --durations ../audio-production/durations.json --out video-production`

**Lưu ý về act 1:** nhân vật **đã rời board Recruited** (invite ở lượt 2 thành công thật). Nên các beat cấp
dòng của act 1 phải diễn trên dòng thay thế (`--demo-record 'RLO Test'`, đã nằm trong allowlist) và `s1_14`
sẽ đi nhánh DEMONSTRATION — mở dialog rồi Cancel. Đúng thiết kế: invite là chuyển đổi một chiều, không quay
lại được lần hai.

### Những lượt GHI đã thực hiện trên production trong buổi này

Ghi đầy đủ, kể cả cái ngoài ý muốn.

| Ghi gì | Dòng | Có phép? |
|---|---|---|
| email → Mailinator + 5 field required | `Test Test (New York)` (RLO) | có — chuẩn bị nhân vật |
| Invite → vào pipeline ILO | `Test Test (New York)` | có — chính là `s1_14` |
| **Approve** rời hàng chờ tự-ứng-tuyển | một submission **rác** (tên tục, NMLS `123456`) | **KHÔNG** — xem dưới |
| fee → `Paid`, status → `Onboarding` | một dòng `Test Test (Duplicated)` | dòng test, nhưng **sai dòng** |
| gõ NMLS vào form rồi **Cancel** | `Katie Test` | có — và không lưu, đã xác minh |

Cái Approve là một **giả định staging đi thẳng vào production**: `s2_5` được port nguyên xi, log của nó còn
in `"staging mutation, by design"`. Không ai bị hại (dòng rác, không email, không tài khoản; dòng thật ngay
bên dưới không bị chạm) và **không có chức năng un-approve**, nên khuyến nghị để nguyên. Chốt chặn đã dựng:
xem `assertWritableRow` + `tools/test-write-guard.mjs`.

### Còn lại sau khi act 1/4/5 sạch

1. Dịch **391 cue** sang tiếng Việt → `narration.production.vi.json` (`node assemble.mjs --variant=production
   --dump-cues` chạy được **không cần** footage, nên việc này làm song song được).
2. `node assemble.mjs --variant=production --markers=markers.production.json`
3. **Soi từng frame** trong `final/verify-production/`. Bài học bản staging vẫn đứng: log báo "1 lỗi" trong
   khi 6/7 scene quay sai màn hình. `0 failures` không phải thước đo chất lượng.
