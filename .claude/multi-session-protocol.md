# Multi-session review protocol (agentflow)

## Danh bạ — **khoá theo session id, KHÔNG theo tên**

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

`ESCALATE` gửi **song song cho cả hai HOST** — `agentflow-0d` và `agentflow-c3` (hoặc trả lời thẳng user) khi:
- Qua **3 vòng** vẫn chưa hội tụ.
- Bất đồng thuộc phạm vi business/product (scope, ưu tiên, UX), không phải kỹ thuật thuần.
- Cần quyết định không đảo ngược được: đổi schema production, xoá dữ liệu, đổi contract API công khai, deploy.
- Thiếu thông tin chỉ user mới có (credential, ý định stakeholder, deadline).

Không tự đoán rồi làm tiếp — nêu rõ 2-3 phương án kèm trade-off cho user chọn.


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
