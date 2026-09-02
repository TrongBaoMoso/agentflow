# Multi-session review protocol (agentflow)

## Danh bạ — khoá theo session id, và khi id trùng thì theo **PID**

> **Session id KHÔNG còn là khoá duy nhất.** `claude --resume <id>` sinh một tiến trình THỨ HAI đọc cùng
> transcript trong khi tiến trình cũ **chưa chết** — nên gửi đúng session id vẫn có thể trúng nhầm tiến trình.
> Đo thật 31/08 09:2x: `73097213` có pid **28110** (terminal, 00:55) và pid **97292** (Claude.app, 09:11),
> cùng tên `agentflow-be`, **cả hai đang chạy**. Nguy hiểm không dừng ở ghi trùng một `.jsonl`: hai tiến trình
> cùng danh tính CHECK nghĩa là **hai verdict trên cùng một PR**.
> Luật: với mọi id xuất hiện nhiều hơn một dòng trong `~/.claude/sessions`, **`kill -0 <pid>` từng cái và chọn
> tiến trình có registry mtime mới nhất**; ghi PID vào danh bạ, không chỉ ghi id. Phát hiện bởi LEAD 31/08.
>
> **Ghế CHECK hiện tại = pid 28110** (HOST chỉ định 31/08 09:25): nó giữ toàn bộ luồng review #204/#205 và
> registry của nó vẫn tự cập nhật (09:23), còn 97292 không hoạt động gì kể từ lúc mở. Không bắn sang 97292.

Tên peer churn theo phút (đo thật 2026-08-28: `agentflow-4e` → `agentflow-1d`, `agentflow-c3` → `agentflow-53`,
`agentflow-bf` → `agentflow-66`). **Tên là thứ phái sinh, phải resolve lại ngay trước mỗi lần gửi.**
Gửi vào tên cũ trả "not reachable" — đó KHÔNG có nghĩa session đã chết.

| Vai | Session id (khoá bất biến) |
|---|---|
| **DEV** — ra solution đầu, code sau khi được duyệt | `f282aafb-4743-4fcd-ae7e-cff1291df025` |
| **LEAD** — PO/PM/Tech Lead, review chéo DEV | `725a7bc4-3db7-413c-ba31-71ae7bfc0b9c` (31/08 tên `agentflow-d3`; tên cũ `agentflow-c7` **đã bị session `fb55f383` chiếm** — gửi theo tên đó là trúng nhầm phiên) |
| **CHECK** — kiểm tra chéo cả DEV lẫn LEAD, góc nhìn độc lập | `73097213-64c1-43dd-b4a4-4967910886b9` (khôi phục 31/08 01:00, **id giữ nguyên, 58,2 MB context còn nguyên**; tên hiện tại `agentflow-be`) |
| **PROGRESS** — đánh giá tiến độ (ngoài vòng review) | `bbf416be-d5d2-4fb4-8c48-dba660959014` |
| **HOST** — cửa escalate về user (đồng-HOST, gửi song song cả hai) | `d7596c2a-254f-4398-96b4-3686132dddd7` và `7f54cf67-3cd1-415b-8027-ee351041df34` |

Resolve tên ngay trước khi gửi:

```bash
claude agents --json | python3 -c "import json,sys
for a in json.load(sys.stdin): print(a.get('sessionId'), '->', a.get('name'))"
```

(`claude agents` không có `--json` sẽ đòi TTY và fail trong tool Bash.)

> **Bản resume là hàng dự phòng, không phải bản chính.** 2026-08-28 tôi tưởng LEAD và CHECK đã chết nên
> `--resume … --bg` ra hai bản mới. Bản gốc vẫn sống — chỉ đổi tên. Hậu quả: hai LEAD, hai CHECK, và bản
> resume **nghèo context hơn hẳn** (LEAD gốc 496 MB vs resume 9,5 MB · CHECK gốc 51,6 MB vs resume 17,9 MB).
> Luật: **ưu tiên session gốc theo session id**; chỉ resume khi id gốc thật sự không còn trong
> `claude agents --json`. Resume xong phải retire bản thừa, đừng để hai ghế cùng vai.

> **Ghế review KHÔNG dựng được bằng `--bg`.** Đo 31/08: phiên nền chạy ở `permissionMode: default` nên mỗi
> `Read`/`Grep` bật hộp duyệt mà **không có cửa sổ nào để bấm** — nó đứng im, nhìn từ ngoài y hệt "đang suy nghĩ".
> Tin nhắn cross-session gửi vào phiên `--bg` cũng treo ở cửa duyệt vì lý do đó. Hook lại chặn
> `--dangerously-skip-permissions`, nên không có đường vòng. **Cách đúng: mở New Terminal trong Orca rồi
> `claude --resume <id>`** — khi đó resume **không fork**, id giữ nguyên và context còn nguyên (đo thật: ghế
> CHECK 57,8 MB → 58,2 MB). `--resume --bg` thì ngược lại, fork ra id mới và chỉ mang ~8% (57,8 → 4,7 MB).
> Hai ghế `--bg` hỏng (`34274283`, `6f4f24c2`) đã phải bỏ vì bẫy này.

> **Hai chế độ hỏng của danh bạ, đo thật 31/08 09:14 — cả hai đều IM LẶNG.**
> 1. **Tên bị phiên khác chiếm.** `agentflow-c7` — tên LEAD dùng suốt 12 vòng review `9a4s` — giờ thuộc về
>    session `fb55f383`, còn LEAD (`725a7bc4`) đã đổi thành `agentflow-d3`. Gửi "cho `agentflow-c7`" lúc này là
>    **trúng nhầm phiên, và phiên đó vẫn nhận, vẫn trả lời** — không có lỗi nào báo rằng bạn gửi nhầm. Đây là lý do
>    danh bạ khoá theo session id: tên không chỉ *trôi*, nó bị **tái cấp cho người khác**.
> 2. **Hai tiến trình sống trên CÙNG một session id.** `73097213` có pid 28110 (`claude --resume`, terminal, từ
>    00:55) và pid 97292 (Claude.app `--resume=`, mở lúc 09:11) — cùng tên `agentflow-be`, cùng ghi vào một
>    `.jsonl`. Gửi vào nhầm cái thì ghế kia không nhận, và người gửi sẽ tưởng **họ im lặng**. Phân biệt bằng
>    `ps -p <pid> -o command=`, không bằng tên. Protocol đã có luật "resume xong phải retire bản thừa" — luật
>    đúng, chỉ là không có gì cưỡng chế nó.
>
> Hệ quả thực hành: **`ps -p <pid>` trước khi kết luận một ghế im lặng**, và resolve id ngay trước mỗi lần gửi.

## Khi nào áp dụng

Bắt buộc với: feature mới, bug/issue phức tạp, refactor, quyết định kiến trúc, thay đổi schema/API.
Không áp dụng với: typo, đổi copy, chạy lệnh đọc, câu hỏi tra cứu.

## Vòng lặp

1. **PROPOSAL** — DEV soạn solution rồi `SendMessage` **song song** tới LEAD và CHECK.
2. **REVIEW** — LEAD và CHECK mỗi bên phản hồi về DEV **và** cc bên còn lại. Bắt buộc nêu rõ: điểm đồng ý, điểm phản đối + lý do kỹ thuật, rủi ro/bỏ sót, đề xuất thay thế.
3. **REVISE** — DEV sửa theo phản biện, gửi lại vòng mới.
4. **APPROVE** — lặp tới khi **cả 3** cùng ghi `APPROVE`. Chỉ khi đó DEV mới bắt đầu code.
5. Sau khi code xong, diff quay lại LEAD + CHECK duyệt lần cuối trước khi push/PR.

## Luật chờ

- Sau khi gửi PROPOSAL, DEV **phải chờ đủ 2 phản hồi** rồi mới đi tiếp. Không code trong lúc chờ.
- Reviewer nhận PROPOSAL thì phản hồi ngay, không im lặng. Nếu cần thời gian, gửi `ACK — đang xem <phần nào>`.
- `APPROVE` chỉ tính khi nêu được lý do; "ok" trống không tính.

## Định dạng message

```
[<TOPIC>][R<n>][<FROM>] <PROPOSAL|REVIEW|REVISE|APPROVE|BLOCK|ESCALATE>
<nội dung>
```
`TOPIC` = một slug ngắn cố định suốt cả cuộc (vd `lfiq-730-extra-payment`), để 3 session bám đúng luồng.

## HOST KHÔNG có phiếu kỹ thuật (chốt 31/08)

HOST **không** tham gia phản biện về giải pháp, kể cả khi thấy chỗ nghi ngờ. Ba lý do, đo được:

1. **HOST đọc code ít nhất** nên phán đoán kỹ thuật kém nhất. 30–31/08 HOST khẳng định "`fa` reset checkout
   chính và cuốn mất bản vá" — sai người (thủ phạm là phiên đang viết `ulae`) và sai cơ chế (`checkout -B`
   *mang theo* thay đổi chưa commit, không xoá). Kết luận rút ra sau **16 giây**, và nó lái toàn bộ đề xuất
   dọn phiên. HOST cũng báo "13 phiên sống" trong khi 2 dòng là `claude bg-spare` (tiến trình dự phòng của
   daemon, không có context) và 2 dòng là **cùng một session id** — thực đếm 9.
2. **Ý kiến HOST mang thẩm quyền ngầm.** HOST là ghế duy nhất nói chuyện với user, nên ba ghế kia khó phân
   biệt "HOST nghĩ vậy" với "user muốn vậy" và có xu hướng nhường. Phản biện thành diễn — tệ hơn là thừa.
3. **Nó khởi động lại vòng lặp và lệch cán cân.** Sau khi cả 3 đã APPROVE, phản đối từ HOST không có ai đối
   trọng, vì HOST không nằm trong vòng để bị phản biện ngược.

**HOST chỉ kiểm đúng một trục** mà ba ghế kia không thể kiểm: *"cái này có đúng thứ user hỏi không?"* —
phạm vi, ý định, ưu tiên. Nghi ngờ kỹ thuật thì **gửi thành CÂU HỎI cho CHECK, không phải phán quyết**;
câu hỏi không khởi động lại vòng, CHECK đo rồi trả lời.

## Khi nào hỏi user

`ESCALATE` gửi cho **HOST** (tra ghế HOST theo danh bạ ở đầu file — tên trôi, đừng dùng tên chép trong tài liệu) khi:
- Qua **3 vòng** vẫn chưa hội tụ.
- Bất đồng thuộc phạm vi business/product (scope, ưu tiên, UX), không phải kỹ thuật thuần.
- Cần quyết định không đảo ngược được: đổi schema production, xoá dữ liệu, đổi contract API công khai, deploy.
- Thiếu thông tin chỉ user mới có (credential, ý định stakeholder, deadline).

Không tự đoán rồi làm tiếp — nêu rõ 2-3 phương án kèm trade-off cho user chọn.


## Ghi chú trạng thái đi TRONG PR ship việc (chốt 31/08, Bao duyệt)

**Ghi chú trạng thái / hậu kiểm (`SELF-TEST.md`, `BACKLOG`, `DECISIONS`, doc "đã fix cái gì") phải nằm
TRONG chính PR ship việc đó — không tách thành commit riêng, không tách thành PR riêng.**

Căn cứ đo (recruit-be, 20-31/08, 114 mốc merge trên release):
- Đúng **4 file** từng lệch giữa `master` và `release` trong cả đời repo, **toàn bộ là docs**; `src/` **0 mốc lệch**.
- File "nóng" (sửa liên tục) **tự lành trong vòng vài giờ** — 83 cặp master↔release: p50 0 phút, p95 2 phút,
  max **39 phút**. Không ai quên chúng.
- Lớp gây **cả hai sự cố dài** là **ghi chú hậu kiểm đi thành đơn vị riêng**: `SELF-TEST.md` lệch 41 mốc /
  5 ngày, `INGEST` 23 mốc. Hai nguyên nhân: một do **push thẳng**, một do **mở PR master mà quên PR `-rel`**.
  **Kỷ luật gom-push KHÔNG chạm được cả hai** — đừng tưởng luật push đã vá xong chuyện này.

Vì sao quy ước này sống được dù **không có gì cưỡng chế**: nó **cùng chiều với sự lười** — gộp ghi chú vào
PR sẵn có dễ hơn mở PR riêng. Quên thì cũng không tệ hơn hôm nay. Đây là điểm khác biệt với một quy ước
phải-nhớ-mới-làm (loại đó là lời hứa, xem `mutation-check-before-trusting-green`).

**LỖ ĐÃ BIẾT của quy ước này, khai trước cho khỏi ngộ nhận:** một bản ghi QUYẾT ĐỊNH (GOTCHAS, DECISIONS)
đôi khi **không có PR việc nào để đi kèm** — nó không sinh ra từ một thay đổi code nào cả. Quy ước không phủ
được ca đó. Nhưng mô hình tần suất nói vì sao nó **không gây hại**: những file đó là file NÓNG (GOTCHAS 16
lần/12 ngày), mà file nóng **tự lành trong vài giờ**. Hai sự cố dài đều rơi vào file LẠNH.
⇒ Khi gặp ca này: chờ PR code kế tiếp rồi gom vào (giữ cả chữ lẫn tinh thần), hoặc mở PR docs riêng và
**ghi lý do vào bead** — kẻo người sau thấy PR docs-only đầu tiên sau khi ra quy ước lại là của chính người
đề xuất quy ước mà không biết vì sao. Tuyệt đối KHÔNG nong nội dung lạ vào một PR đã được review duyệt. Lý do KHÔNG phải "nội dung
không liên quan" (yếu, tranh luận được, và người sau sẽ tranh luận "liên quan đủ mà") — lý do là **CHỮ KÝ
ĐÃ ĐÓNG**: approve ký vào NỘI DUNG, nên thêm nội dung là mở lại một lượt review đã đóng mà không ai biết,
và chữ ký cũ vẫn nằm đó, giờ nói dối. Xem `review-approve-content-not-sha`.
**Ngoại lệ duy nhất, có phép thử:** *nội dung thêm vào có bị chính diff này làm SAI ĐI không?* Có ⇒ sửa nó
THUỘC thay đổi, phải đi cùng PR (ca javadoc `HotItemResponse` 31/08: LEAD bác đúng lời hoãn của DEV). Không
⇒ chờ PR khác.

**Chưa dựng cổng máy nào cho việc này.** Spec detector so-đầu-nhánh-theo-TUỔI để trên giấy; chỉ dựng khi
phép đo lại sau 7 ngày (bead `agentflow-ymzt`, defer) thấy tái phát, hoặc khi Bao yêu cầu sớm. Giá thật của
nó không nhỏ: cần credential + đường push riêng cho CI.

## Kỷ luật push lên repo org (chốt 31/08, Bao)

**Account `TrongBaoMoso` đã bị remove khỏi org MỘT LẦN ngày 29/08 vì spam commit/noti.** Đây không phải
lo xa — nó đã xảy ra. DevOps (anh Khải) cảnh báo lần hai.

Nguyên văn Bao chốt 31/08:

> "Cái cần đổi là thói quen push của các phiên agent, cụ thể: gom đủ 1 feature/1 nhóm việc mới push
> (thay vì push mỗi round phản biện), squash trước khi mở PR, và bớt tạo/xoá nhánh vụn trên repo org —
> dồn phần trao đổi qua lại vào TrongBaoMoso/agentflow (repo cá nhân) thay vì recruit-be."
> → **"OK, follow your suggestion"**

Bốn luật:
1. **Gom đủ một feature / một nhóm việc mới push.** KHÔNG push mỗi vòng phản biện.
2. **Squash trước khi mở PR.**
3. **Không tạo/xoá nhánh vụn trên repo org.**
4. **Mọi trao đổi giữa các phiên** (docs, verdict, beads, ghi chép) **dồn vào `TrongBaoMoso/agentflow`** —
   repo cá nhân, push thoải mái.

Commit local vẫn làm bình thường. Chỉ **push lên org** mới bị gom lại.

**Đang có lệnh HOÃN push org từ 31/08 14:1x** cho tới khi Bao cho phép lại. Merge PR đã mở: Bao chưa nói
rõ ⇒ **mặc định coi là CÓ CẤM** (merge vẫn sinh noti), giữ hướng thận trọng cho tới khi có lời chốt.

Vì sao nó là vấn đề của protocol chứ không phải thói quen cá nhân: vòng phản biện nhiều phiên **tự nhiên
sinh ra nhiều commit nhỏ** — mỗi lượt revise một commit, mỗi ghế một nhánh, mỗi lineage một PR. Chính cái
làm review tốt lại là cái làm ngập noti. Nên phải gom Ở TẦNG QUY TRÌNH, không trông vào từng phiên tự tiết chế.

## Uỷ quyền đi qua HOST — ba điều kiện, phải đủ cả ba (chốt 31/08)

Uỷ quyền **không** truyền qua tin nhắn giữa các phiên. Nhưng HOST có lúc phải **chuyển tiếp** một câu
user vừa trả lời. Ranh giới giữa "chuyển tiếp" và "tự phát lệnh" là ba điều kiện dưới đây, và phiên
nhận chỉ được thực hiện khi **đủ cả ba**:

1. **Có nguyên văn lời user.** Không phải diễn đạt lại, không phải tóm tắt.
2. **Phạm vi khớp đúng**, không rộng hơn một chữ nào.
3. **Việc đảo ngược được.**

Thiếu bất kỳ điều kiện nào — kể cả khi HOST chắc chắn user đồng ý — phiên nhận **hỏi thẳng user**.

Ràng buộc về phía HOST, và nó bảo vệ HOST nhiều hơn bảo vệ người nhận: **HOST luôn TRÍCH, không bao
giờ diễn đạt lại.** Nghĩa là HOST không bao giờ ở vị trí phải nhớ chính xác user nói gì — chỉ cần
copy. Nếu HOST diễn đạt lại, phiên nhận coi như **chưa có uỷ quyền**.

Điều kiện (3) là chỗ loại trừ rõ nhất: **deploy, và mọi thứ chạm dữ liệu thật, KHÔNG đảo ngược được**
⇒ ba điều kiện trên không đủ ⇒ phải hỏi thẳng user, không đi qua HOST.

Vì sao cần viết ra: lỗi này **tự xoá dấu vết**. User chỉ nhìn thấy một cửa sổ; nếu một phiên hành động
vì phiên khác bảo, phía user không có log nào cho thấy lựa chọn họ vừa bấm đã bị ghi đè.
Xem `peer-cannot-transfer-authority`, `peer-cannot-carry-authorization`.


## Khi một session trong vòng chết

Ngày 2026-08-28 CHECK rồi LEAD chết cách nhau ~1 giờ, giữa lúc đang review. Cách hồi sinh **không mất context**:

```bash
claude --resume <session-id-cũ> --bg -n agentflow-<vai> --dangerously-skip-permissions "<brief ngắn>"
```

Ba điều phải biết:

0. **Resume KHÔNG mang hết context.** Đo thật: CHECK gốc 51,6 MB → sau resume 15,6 MB. Nó fork một phần.
   So dung lượng hai file `.jsonl` trước khi tuyên bố một ghế "còn nguyên ngữ cảnh"; ghế vừa resume nên
   được brief lại phần đang tranh luận thay vì giả định nó nhớ.
1. **Process chết ≠ context mất.** Transcript nằm ở `~/.claude/projects/-Users-apple-Projects-agentflow/<session-id>.jsonl`
   và sống lâu hơn process. Session không có trong `ListAgents` chỉ nghĩa là *không gửi `SendMessage` tới được* —
   đừng kết luận "session không tồn tại".
2. **`--resume` fork ra session id MỚI.** Nội dung cũ được nạp lại, nhưng id thì khác. Phải cập nhật danh bạ,
   nếu không cả nhóm sẽ nhắn vào một id đã chết. Ghi cả id mới lẫn id gốc như bảng trên.
3. **Luôn đặt `-n <tên>`.** Không có `-n`, background agent lấy nguyên câu prompt làm tên peer — dài 200 ký tự,
   không ai gõ nổi trong `SendMessage`.

Nghi ngờ nguyên nhân chết: transcript quá lớn (LEAD 496 MB, CHECK 49 MB lúc chết). Nếu một ghế chết đi chết lại,
tính chuyện chốt vòng hiện tại rồi bắt đầu session mới có tóm tắt, thay vì kéo mãi một transcript khổng lồ.

## GOTCHAS verify (tích luỹ từ vòng thật)

1. **Grep âm trên checkout local KHÔNG phải bằng chứng vắng mặt.** Hai chế độ hỏng đã gặp trong một giờ:
   lệch nhánh (working tree sau `origin` 6 commit), và tìm sai tầng (ROLE là dòng DB do BE trả, không
   phải hằng số trong code). Luôn `git fetch` rồi soi `origin/<base>` trước khi kết luận thiếu.
2. **Sha không phải bằng chứng nội dung.** recruit-fe cắt nhánh feature vào `master` và `release` độc lập,
   nên `git merge-base --is-ancestor <sha> origin/release` trả false dù code có đủ. Dùng
   `git diff --stat origin/release origin/master -- <path>` — rỗng nghĩa là nội dung giống hệt.
3. **"Route trả 200" không chứng minh sha nào đang chạy.** Đã dính: màn có trên staging nhưng bản fix thì
   chưa (`origin/staging` @ PR #102, `origin/release` @ PR #104, commit fix không phải ancestor của staging).
   Muốn biết build live là gì, đối chiếu sha/chunk thật, đừng suy từ HTTP status.
4. **Tên peer là derived và đổi khi restart.** Resume tạo session id MỚI kế thừa transcript cũ. Session
   "đã chết" có thể vẫn sống dưới tên khác — kiểm `~/.claude/sessions/*.json` + socket trước khi kết luận.
5. **`bd update --notes` là REPLACE, không phải append.** Dựng chuỗi notes cũ bằng một lệnh phụ
   (`bd show --json | ...`) mà không kiểm nó có trả gì không sẽ **xoá sạch** notes cũ. Đã dính
   2026-08-28 khi thêm ý vào bead `9a4s`. Luôn `bd show <id>` xác nhận sau khi update.
6. **Phép đo về QUYỀN TRUY CẬP ra kết quả kịch tính thì phải ĐO LẠI trước khi báo.** 2026-08-29:
   một lần đọc `user/memberships/orgs/...` trả `state: pending, role: reinstate` — đọc thẳng ra là
   "tài khoản đã bị gỡ khỏi org". Đo lại ba lần liên tiếp đều ra `active / member / direct=true`, và
   `gh repo list` từ 2 repo thành 160. Lần đọc đầu là thoáng qua (propagation). Báo ngay thì user đã
   đi xin vào lại một tổ chức họ vẫn đang ở trong.
7. **Workflow xanh ≠ pod đã roll xong.** `auto-deploy.yaml` của recruit-be không có `--wait`/`--atomic`
   (grep = 0), nên job xanh chỉ nghĩa là `helm upgrade` đã TRẢ VỀ. Muốn biết sha thật đang chạy phải
   `kubectl -n <ns> get pods -o jsonpath='{.items[*].status.containerStatuses[*].image}'`.
8. **Tuổi pod KHÔNG phải bằng chứng về thứ tự deploy.** 2026-08-29: pod FE 4h09m, pod BE 123m —
   nhìn qua như FE lên trước BE (đúng cửa sổ nguy hiểm). Thật ra BE `NewReplicaSetAvailable`
   **08:54:03Z**, FE **08:59:37Z** — BE trước 5 phút rưỡi. Pod BE trẻ hơn vì GKE Autopilot dời nó
   sang node khác lúc 11:06 (`gk3-…-nap-…`, `nap` = node auto-provisioning); `restarts=0` vì là pod
   MỚI chứ không phải container restart. Muốn biết thứ tự thật: đọc `lastUpdateTime` của condition
   `Progressing`/`NewReplicaSetAvailable` trên deployment, đừng đọc `AGE` của pod.
   Namespace/deployment recruit: BE = ns `recruit-be`; FE = ns **`recruit-fe-dev`**, deployment
   **`recruit-frontend`**.
9. **Mọi phát biểu về trạng thái phải dẫn được LỆNH đã chạy — không dẫn được thì nói "tôi nghĩ".**
   30/08, trong đúng 10 phút, HOST và DEV mỗi bên sai một nhịp ngược nhau: HOST báo "beads lệch repo"
   (dựa trên ảnh chụp có trước commit `29277ff`), DEV báo "#180/#181 đang mở" và "beads chưa push"
   (dựa trên "tôi không gõ lệnh push"). **Cả hai đều không phải đo sai — mà là không đo gì cả rồi phát
   biểu như đã đo.** Ở nhịp làm việc này trạng thái đổi nhanh hơn tốc độ các session kể cho nhau.
   Luật: đo lại **ngay trước khi gửi**, ghi kèm mốc đo ("đo lúc 18:41:28 30/08"), và phân biệt trong
   câu chữ giữa thứ mình **ĐO** và thứ mình **SUY**. Ghi mốc thời gian chỉ chữa được vế thứ nhất.
10. **Mỗi phiên làm code phải có `git worktree` RIÊNG — không dùng chung checkout.** 30/08, ba phiên
   cùng dùng `recruit-be/`: nhánh bị đổi dưới chân DEV sang `fix/legacy-ref-always-store-labels`
   (phiên khác, bead `5hz0`); CHECK chạy `gradlew test` trong cùng thư mục làm lượt đo của DEV ra
   `BUILD SUCCESSFUL` với **0 test** rồi `FAILED` — cả hai đều sai. DEV cũng suýt xoá việc chưa commit
   của phiên khác bằng `git checkout origin/master -- .` (lệnh này **ghi đè toàn bộ cây làm việc**).
   Nếu chưa kịp tách worktree thì tối thiểu: **không ai** chạy lệnh ghi đè cây (`checkout -- .`,
   `reset --hard`, `stash`) và **không ai** chạy build/test khi `git status` của checkout đang bẩn.
   **Cấm luôn `git checkout -b` / `-B` và `git branch -D` trong checkout chung** (LEAD bổ sung sau khi
   tự dính 30/08): đổi nhánh không mất byte nào nhưng vẫn làm phép đo của người khác vô nghĩa, vì
   `gradlew test` đọc **cây** chứ không đọc sha. Cắt nhánh mới ⇒ `git worktree add` ngay từ đầu.
   Worktree đặt **ngoài** repo cha (vd `/Users/apple/Projects/recruit-be-ulae`), xem memory
   `reference_worktree_outside_repo_eslint`.
   Xem thêm luật worktree ngoài repo (lf/lo) trong memory `reference_worktree_outside_repo_eslint`.
11. **Số hiệu migration là thứ trôi nhanh nhất — đọc tươi lúc VIẾT, đừng ghi cứng vào spec.** `9a4s`
   lần lượt được ghi là V043 → V044 → V045 trong vòng một ngày vì `fm6n` chiếm V043 rồi
   `V044__self_reported_company.sql` chiếm tiếp. Spec chỉ nên nói "migration kế tiếp".
12. **Đóng bead phải đọc hết notes, đặc biệt dòng "CÒN LẠI".** `qn2p` ship trọn phần code nhưng notes
   có dòng *"bản vá KHÔNG tự sửa 2 dòng đã hỏng — phải kéo tay"*, và bead cho phần đó **chưa từng được
   tạo**. Đóng mà không tách là làm rơi hẳn việc khỏi `bd ready`. Khi tách, **chép nguyên bằng chứng**
   sang bead mới nếu bằng chứng nằm trong dữ liệu sắp bị ghi đè.
13. **`BUILD SUCCESSFUL` với 0 test là số-0-giả** — cùng họ với "chín số 0 vì COPY hỏng". Gradle
   `UP-TO-DATE` cho ra đúng cái bẫy này ngay cả khi không ai tranh chấp cây. Luật: **tự đếm từ
   `build/test-results/test/TEST-*.xml`, không tin dòng `BUILD SUCCESSFUL`**, và **assert số test > 0**
   trước khi tin kết quả. Con số test đo trong checkout chung là bằng chứng yếu — nói rõ điều đó
   thay vì trình bày nó như bằng chứng mạnh.
14. **So SỐ TEST giữa `master` và `release` là phép đối chứng rẻ để bắt commit rơi.** Repo recruiting
   có hai lineage song song (feature→master và feature→release độc lập), nên một cặp PR thiếu chân là
   lỗi im lặng. LEAD đo 30/08 trong worktree cô lập: `origin/master` `0434c44` = 34 classes / **332**
   tests, `origin/release`(=`staging`) `da96115` = 34 / **332** — khớp chính xác ⇒ không có commit rơi.
   Nếp đề nghị: **mỗi lần merge cặp PR, so hai con số; lệch là có commit rơi.**
   Kèm bài học đi cùng: con số test **lỗi thời rất nhanh** (295 → 332 trong một ngày vì #188–#195),
   nên **đừng trích số test kèm một verdict cũ** như thể nó còn hiệu lực.
16. **Nhánh mới có thể mọc trên commit CHƯA MERGE của phiên khác — và chỉ một con số tố giác.**
   30/08: `git checkout -B <nhánh> origin/master` chạy đúng lúc phiên `5hz0` vừa commit ⇒ nhánh mọc
   trên `ed33a76` thay vì `origin/master`. **Không lỗi, không cảnh báo, `git log` nhìn hợp lý.**
   Thứ duy nhất lộ ra: đo được 339 test trên nền tưởng là 332 — dư 3 không giải thích được (3 test của
   `5hz0`). Làm tròn "chắc 332 cộng mấy cái tôi thêm" là ship kèm commit chưa merge của người khác.
   **Luật: mỗi verdict kèm một PHÉP TRỪ KHỚP — `tests(nhánh) − tests(base) = số test mình thêm`.
   Lệch một cái thì DỪNG, đừng làm tròn.** Sửa bằng `git rebase --onto origin/master <commit-lạ>`,
   rồi xác nhận `ahead N / behind 0`. Đây là dạng cụ thể của luật "số 0 cần đối chứng dương":
   **một con số hợp lý không phải là một con số đúng.**
17. **JUnit ghi `@DisplayName` vào thuộc tính `name` của `<testcase>`, KHÔNG phải tên method.**
   Grep `TEST-*.xml` theo tên method sẽ **MISS** mọi test có `@DisplayName` và cho ra kết luận sai
   "test không chạy" — trong khi chúng chạy và pass. Grep theo display name. Cùng họ với
   `BUILD SUCCESSFUL` 0 test (mục 13): **công cụ đo hỏng trông y hệt kết quả xấu**; cả hai lần lối
   thoát đều là *tự nghi con số trước khi tin nó*.

18. **PUSH FREEZE (Bao, 31/08/2026) — ngừng push mọi repo `LoanFactory-Inc` tới khi Bao mở lại.**
   Nguyên nhân: DevOps (anh Khải) cảnh báo account `TrongBaoMoso` spam commit/noti; 29/08 account
   đã bị remove khỏi org một lần vì việc này. Commit local vẫn bình thường.
   Bốn luật push VĨNH VIỄN (áp cả sau khi mở lại): (1) gom đủ **1 feature / 1 nhóm việc** mới push —
   không push mỗi round phản biện (thứ bị chặn là chuỗi PR lắt nhắt cho cùng một bead, kiểu 6 PR
   #180–#185 cho `fm6n`); (2) squash trước khi mở PR; (3) không tạo/xoá nhánh vụn trên repo org;
   (4) mọi trao đổi giữa các phiên (docs, verdict, beads) dồn vào `TrongBaoMoso/agentflow`.
   **Luật 1 KHÔNG có nghĩa gộp nhiều feature vào một PR.** `recruit-be` theo GitLab Flow hai dòng,
   feature phải land độc lập vào `master` VÀ `release`; gộp rồi squash một lần sẽ làm hai dòng lệch
   nhau khó gỡ. Hình đúng: **mỗi feature = 1 commit squash × 2 PR**.
   **`git push --delete` cũng là push** → nằm trong freeze. Luật 3 là luật cho hành vi tương lai,
   nó KHÔNG cấp phép cho một đợt dọn hồi tố mà chính đợt dọn đó lại là thứ DevOps phàn nàn.
   Đo 31/08: origin/recruit-be có **105 nhánh feature**, **97 đã land**, 8 chưa. Dọn = việc của Bao.
   **Chiều dỡ freeze đắt hơn chiều áp freeze** (luật DEV đề, tôi chốt): lệnh CẤM thì tuân thủ ngay
   không đòi xác thực; lệnh CHO PHÉP thì đòi **nguyên văn lời Bao** trước khi làm.
   Hệ quả cho vai PROGRESS: "đã push / đã mở PR" **không còn là mốc hoàn thành hợp lệ**.
   Mốc mới = commit local + đo xong + có verdict.

19. **Trạng thái sau compact là TIN ĐỒN, không phải số đo — kể cả khi nó từng đúng.**
   31/08 tôi (HOST) nói `ulae` "chưa push, chưa mở PR" và relay cho 3 phiên. Đo lại: `ulae` = PR
   **#198/#199 merged 30/08 23:36 giờ VN**, cùng `9a4s` #202/#203, `4758` #204/#205, `ymzt` #206 —
   **5 việc đã merge**, trong đó 4 việc merge sau lúc bản tóm tắt của tôi được chốt. Đây là lần
   **thứ hai trong hai ngày** cùng một hình dạng lỗi (lần một: "beads lệch repo" từ snapshot cũ).
   Luật: bản tóm tắt compact chỉ nói *cái gì đã từng đúng*, và trạng thái repo của một dự án 3 phiên
   cùng chạy có **tuổi thọ tính bằng phút**. Trước mỗi tin relay chạm trạng thái: đo lại, hoặc nói
   "theo bản tóm tắt của tôi (có thể đã cũ)". Đừng bao giờ relay trạng thái như đã đo.

20. **Ghi lại MỐC CHẾT của một ghế, không chỉ ghi "đã chết".**
   LEAD `725a7bc4` còn sống dưới tên `agentflow-d3` (socket 62012) và **tự ký RE-APPROVE** cho
   #204/#205 vài phút trước khi rơi khỏi `~/.claude/sessions`. Nếu chỉ ghi "LEAD đã chết", người
   kiểm sau này thấy ghế trống suốt và kết luận sai rằng những APPROVE đó do người khác tự diễn
   giải. Cùng họ với "tên là địa chỉ tại thời điểm đọc, không phải danh tính".
   Kèm theo: **tên "CHECK" hiện MƠ HỒ** — `agentflow-be` (`73097213`, sock 28110) là ghế thật giữ
   context; `agentflow-check` (`34274283`, sock 54480) là bản resume cũ vẫn đang sống. Mọi verdict
   điều phối phải ghi kèm sessionId, không ghi tên.

21. **Xếp loại phép đo theo HƯỚNG nó sai, không theo việc nó có sai hay không.** (luật DEV rút,
   tôi chốt — nó thay thế cách ghi "danh sách các bẫy đo")
   *Một phép lệch-an-toàn sai 10 lần vẫn dùng được; một phép lệch-phá-hủy sai 1 lần thì không.*
   Đêm 31/08, bốn phép đo trên cùng câu hỏi "nhánh nào xoá được" của `origin/recruit-be`:
   | phép | đáp số | hướng sai |
   |---|---|---|
   | `git cherry` (patch-id) | 0/8 còn việc ⇒ xoá cả 8 | **PHÁ HỦY** — 7 nhánh có nội dung thật |
   | diff các file nhánh đã sửa | 8/8 còn việc | an toàn (đích đã đi tiếp nên file khác) |
   | ancestry HOẶC tree trùng khít | 97 xoá / 8 giữ | an toàn (giới hạn **dưới** của số xoá được) |
   | merge-tree, base chọn theo hậu tố `-rel` | 96 xoá / 9 giữ | an toàn (2 false-keep) |
   | merge-tree, thử **cả hai** base | **98 xoá / 7 giữ** | đúng |
   Chỉ phép đầu có hình dạng chết người. Trước khi trình một con số, hỏi: *sai theo hướng này thì
   mất việc, hay chỉ giữ thừa?* Con số "gọn gàng" đầu tiên mình có thường là phép lệch-phá-hủy.

22. **Độc lập phải là độc lập VỀ PHƯƠNG PHÁP, không chỉ độc lập về người — "không kích hoạt ≠
   không tồn tại".** Đây là lỗ hổng nằm ngay trong quy trình 3 ghế này.
   31/08: hai lượt đo của hai phiên khác nhau ra **cùng bộ 7 nhánh**, tôi gọi đó là "hai lượt đo
   độc lập cùng khớp". DEV tự khai: script của nó có **cùng bug** chọn base theo hậu tố
   `endswith('-rel')`, chỉ **không kích hoạt** vì đầu vào 8 nhánh của nó không chứa ca `-release`
   (`chore/rename-recruit-release`, `fix/wrmc-public-webhook-release` — nhánh dòng release đặt tên
   `-release`, bị đem gộp thử vào `master` rồi xung đột ⇒ false-keep).
   Sự trùng khớp đó là **cùng gốc**, không phải xác nhận. **Ba ghế cùng APPROVE không có giá trị
   nếu ba ghế dùng chung một phép đo hỏng.** Khi ghi verdict, ghi cả *phép đo đã dùng*; khi hai
   verdict khớp nhau, hỏi trước "hai bên có dùng chung phép đo không" rồi mới gọi là xác nhận.
   Kèm: **heuristic đọc ý nghĩa từ TÊN (nhánh, method, file) là một phép đo, và nó hỏng im lặng.**
   Cùng họ với luật 17 (`@DisplayName` vs tên method).

23. **Phép trừ phải khớp tại đúng cái TIP mình đem ship, không phải tại lúc mình đo.**
   `ulae`: LEAD đóng sổ phép trừ ở `43241a3` (339 = +4, đúng **tại commit đó**), rồi làm **thêm một
   commit** vá lỗ coverage DEV tìm ra — commit đó đổi `@Test` → `@ParameterizedTest` +
   `@ValueSource(booleans={true,false})` = **+1 lượt chạy** → tip thật 340 = **+5** (số CHECK đo).
   Không ai đo sai; phép trừ **đóng rồi bị commit sau mở lại**, và con số đã đóng sổ được relay đi
   như con số cuối. Bổ sung cho luật 16: sau commit CUỐI CÙNG, đo lại; verdict ghi kèm sha.

24. **"0 commit ahead" có HAI nghĩa: nhánh rỗng, và nhánh đã merge.** Phân biệt rẻ:
   `git log --grep='#<PR>' origin/<base>` — có merge commit thì là nghĩa thứ hai.
   31/08 CHECK đo `origin/fix/import-null-never-erases` ra 0 commit và đọc thành *"nhánh rỗng, di
   chứng vụ push nhánh rỗng"*, rồi đề nghị "cherry-pick 3 commit sang master-side khi hết freeze" —
   tức **áp lại việc đã merge** (`57f61b6` = Merge PR #198). Cùng họ
   [[feedback_zero_needs_positive_control]]: hai nguyên nhân cho một số 0 trông y hệt nhau.

25. **`merge-tree` CONFLICT ≠ "nhánh còn việc chưa land".** Conflict chỉ nói *không tự gộp được*.
   Với nhánh có base **cũ hơn một lần đổi tên toàn repo** (`recruiting → recruit`), xung đột là
   **chắc chắn** bất kể nội dung — kể cả khi nội dung đã land trọn bằng đường khác.
   01/09: 7 nhánh bị hai phiên độc lập xếp "phải giữ" vì conflict; đo lại thì **cả 7 đều rỗng
   việc** (commit cùng tiêu đề đã land qua PR #10/#139/#140/#141/#142/#143; V007/V031/V032/V033 và
   mọi class chính đều có trên master; D68–D70 có trên cả hai nhánh, master đã tới D92).
   **Phép chặt nhất, và nên dùng nó thay cho conflict:** *file tồn tại trên nhánh mà KHÔNG có ở cả
   master lẫn release*. Ra 0 ⇒ nhánh không mang gì mới. Ra >0 thì kiểm tiếp xem có phải bản
   **đổi tên** không (`mcpk` ra 84, cả 84 nằm dưới package cũ; 3 trong đó là class cũng bị đổi tên
   — `RecruitingApplication→RecruitApplication`, `RecruitingPermission→RecruitPermission`,
   `RecruitingSettingEntity→RecruitSettingEntity`).
   Verdict 98/7 vẫn **lệch phía GIỮ** nên không ai mất gì (luật 21) — nhưng **lý do** thì sai, và
   lý do sai đó đã đi tới Bao thành câu hỏi "7 việc này còn cần không". Anh ấy trả lời "còn cần,
   mở bead làm lại". Không đo lại thì đã mở bead viết lại thứ đang nằm trên master.
   ⇒ **Lệch-an-toàn vẫn phải sửa**: nó không mất việc, nhưng nó vẫn sinh ra một câu hỏi sai gửi
   cho người quyết định, và người ta trả lời câu hỏi mình được hỏi.

26. **Trước khi hỏi Bao một câu, ĐO LẠI TIỀN ĐỀ CỦA CHÍNH CÂU HỎI.** 01/09 tôi hỏi bốn câu; hai
   câu (`zzsu`, `lja3`) hỏi về việc **đã CLOSED từ 30/08** — `zzsu` tự khỏi sau deploy
   `staging-280413c`, `lja3` chạy xong 7.221/7.221 (100%), 0 tác dụng phụ. Tôi mang câu "hai câu
   gật còn xếp hàng" từ bản tóm tắt compact qua nhiều lượt rồi hỏi thẳng. **Lần thứ ba cùng lỗi
   trong hai ngày** (luật 19), và đây là lần đầu nó tiêu tốn lượt quyết định của người dùng.
   Kèm: **`bd ready` và `bd show` bất đồng** — `ready` liệt `ok33` là ○ open trong khi `show` trả
   ✓ CLOSED. **`bd show` là bản có thẩm quyền**; không đọc trạng thái từ `bd ready`.

27. **VẮNG KHỎI ĐĂNG KÝ ≠ CHẾT — sửa luật 20.** 02/09: LEAD `725a7bc4` xuất hiện lại với **đúng
   session id cũ** (tên mới `agentflow-ff`) sau khi tôi tuyên bố nó chết cho **bốn phiên**. Phiên
   ra lệnh freeze cũng đổi `agentflow-83 → agentflow-4d`, cùng id `82068f7d`.
   Vắng khỏi `~/.claude/sessions` + `SendMessage` trả *not reachable* chỉ nói được **"không tới
   được LÚC NÀY"**. "Đã chết" là kết luận cần bằng chứng khác (user xác nhận đã đóng cửa sổ), và
   gần như không bao giờ đáng kết luận.
   **Tuyệt đối không resume một phiên chỉ vì nó không reachable**: resume **fork ra session id mới**
   và chỉ mang **một phần** context ⇒ sinh ghế nhân đôi, rồi phiên gốc quay lại thì có hai ghế cùng
   vai (đã trả giá 30/08 với cả LEAD và CHECK).
   Luật 20 vẫn đúng phần "ghi lại mốc, đừng chỉ ghi trạng thái" — nhưng mốc phải ghi là
   **"không tới được từ lúc X"**, không phải "chết lúc X". Đây là **lần thứ hai** tôi kết luận sai
   về đúng ghế LEAD.

28. **Rà tuân thủ một lệnh CẤM: mốc phải lấy từ SỰ KIỆN ĐO ĐƯỢC, không lấy theo ngày.**
   02/09 tôi rà freeze bằng `since=2026-08-31T00:00:00Z` — mốc đó **trước** cả 5 việc hợp lệ, nên
   kết quả đầu tiên tố oan 4 commit. Mốc đúng lấy từ **PR #206 merge 05:26 UTC** (việc cuối DEV xác
   nhận là pre-freeze) ⇒ `since=05:30Z`.
   Và mọi lượt rà phải kèm **đối chứng dương**: `recruit-be`/`recruit-fe`/`lo-homepage`/`lf-iq` ra
   **0 commit sau mốc** ⇒ chứng minh lệnh rà *có phát hiện được*, "0" là 0 thật (`packs` ra 10
   commit nhưng toàn của đồng nghiệp `yen.ha`/`imkhai` — phải đọc **author**, không đếm commit).
   Kết quả còn treo: 3 lượt push sau mốc dưới account `TrongBaoMoso` — moso-aid PR #146,
   lf-homepage PR #2334 và #2335 (cái cuối **hơn một ngày rưỡi** sau freeze). Đã hỏi phiên ra lệnh
   và LEAD; **không revert** vì revert cũng là push.

29. **NGOẠI LỆ TỪNG CA của user KHÔNG phải là dỡ lệnh cấm — và đo bằng mốc PUSH, không mốc commit.**
   Kết quả rà freeze (02/09), tôi tự đọc transcript xác minh chứ không nhận lời phiên khác:
   | việc | lời Bảo (UTC) | PR created (UTC) | khoảng |
   |---|---|---|---|
   | lf-homepage #2335 | `"cho push lf-homepage"` 01/09 **17:14:29** | **17:15:06** | +37 giây |
   | lf-homepage #2334 | `"ok GO, làm đi"` 31/08 **07:52:06** | **08:24:21** | +32 phút |
   | moso-aid #146 | `"làm luôn 527g đi"` 31/08 **08:32:08** | **08:41:51** | +9,5 phút |
   Cả ba **do chính Bảo ra lệnh trong cửa sổ của Bảo** ⇒ ngoại lệ hợp lệ theo từng ca. Freeze **vẫn
   hiệu lực** cho mọi push do agent TỰ khởi xướng; chưa có lời dỡ nào.
   **Chỗ đắt nhất của lượt rà này:** commit của #2335 authored **16:44Z**, tức **trước** lời Bảo 30
   phút. Nếu đo bằng **mốc commit** thì nó trông y hệt một lượt vượt lệnh. Đo bằng **mốc PR/push**
   thì thấy đúng hành vi luật muốn: **viết xong, commit local, GIỮ 30 phút, chỉ push khi có lời**.
   ⇒ Rà một lệnh cấm-push phải đo **thời điểm push**, không đo thời điểm viết code. Commit local là
   thứ lệnh cho phép, nên dùng nó làm bằng chứng buộc tội là đo sai đối tượng.

30. **Broadcast không phủ được phiên mở SAU broadcast.** Lỗ thật của đợt này: bản broadcast lệnh
   freeze gửi 9 phiên đang sống; session `fd99f5c9` mở **01/09**, sau đó, nên chưa bao giờ nhận.
   Lưới an toàn duy nhất là **`MEMORY.md`** — phiên mới nạp nó lúc khởi động và thấy dòng freeze.
   ⇒ Mọi lệnh có hiệu lực kéo dài phải vào **memory** ngay khi nhận, không chỉ broadcast. Broadcast
   là thông báo cho hiện tại; memory là thứ nói với tương lai.
