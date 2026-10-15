Anh Khải ơi, em gửi anh các PR hotfix vào nhánh `3.64.1` của packs, nhờ anh review, merge và deploy giúp em.

**GẤP NHẤT (bead agentflow-p0qak):** trên MOSO prod có một route webplus public, không cần đăng nhập, đang trả về 3 credential: **client secret PayPal, token Calendly và signing key Calendly**. Em chỉ kiểm độ dài, không lấy giá trị. Staging cũng bị y như vậy nhưng dùng bộ credential khác.

Thứ tự đề xuất (Repo Owner agent đã kiểm, chi tiết trong comment "Deploy plan update (p0qak)" ở #3675):
1. Merge và deploy **#3684** (vá route) và **#3682** (thôi ghi secret PayPal vào log) TRƯỚC. Nếu xoay trước khi deploy thì secret mới cũng lộ ngay qua route này.
2. Khi bản mới đã nhận 100% traffic thì **xoay cả 3**:
   - **PayPal:** tạo secret mới trên Live app (client id giữ nguyên), lưu vào MOSO admin > Startup fee, thử 1 lần đóng phí, rồi mới tắt secret cũ.
   - **Calendly:** OWNER lưu token mới trong MOSO admin > LO Recruiting config. Hệ thống sẽ tự tạo webhook và signing key mới. Lưu ý: nếu bước tạo webhook lỗi thì UI vẫn báo thành công. Anh kiểm log, kiểm chỉ còn đúng 1 subscription trỏ về `/integration/api/calendly_web_hook/ilo`, thử 1 lượt đặt lịch, rồi mới revoke token cũ.
   - **Staging:** token Calendly của staging cũng gọi API Calendly thật nên cũng nên xoay.

**Gấp thứ hai (bead agentflow-zum0l):** trên staging em đã xác nhận người không đăng nhập đọc được dữ liệu cá nhân của borrower qua webplus. (1) `execute/GetOp` kind Loan trả bản ghi borrower lồng bên trong mà không lọc, gồm ngày sinh, link báo cáo tín dụng, tài sản, nợ. (2) `getAlert` trả toàn bộ trường của Loan. Prod chạy cùng code nhưng em không đo trên prod để khỏi đọc dữ liệu thật. PR sửa đang làm, em sẽ gửi số PR sau.

**Lý do:** từ 10/10 14:58Z, MOSO prod (lender-rate) chạy lại bản 3.64.1, đè lên 3.65.0. Vì vậy prod đang thiếu các fix đã có trên master và staging. Repo Owner agent đoán là lần deploy hotfix build từ nhánh 3.64.1 đã đè 3.65.0 chứ không phải rollback có chủ ý. Anh xác nhận giúp em nha, em có hỏi trong comment ở #3675.

**Gấp nhất là ce3ey:** ngày 12/10 trên prod có 2 LO nhận được phong bì ký Inkless ngay ở bước Basic info và đã KÝ, trong khi chưa họp 1-1 và chưa đóng phí (LORecruiting 37634837020 và 6629731021357056). Em chưa sửa gì trên 2 dòng này.

**Gấp thứ ba, cần anh quyết hướng (bead agentflow-pymgv):** trên staging, `execute/FindOp` gọi không cần đăng nhập vẫn **đọc hàng loạt** được nhiều kind, có phân trang:
- Admin: 135 trường, gồm họ tên pháp lý và email OTP.
- EscalationTicket: tên borrower và địa chỉ.
- Asset: số tài khoản và số dư.
- Employment: thu nhập.

Lý do là `executeOp` public chạy được gần như mọi op và kind. Hướng sửa em đề xuất: chỉ cho người gọi không đăng nhập dùng đúng các op và kind mà website đang cần (allowlist). Vì đây là thiết kế cũ nên em chưa tự sửa, chờ anh quyết.

**Thứ tự merge (mới): #3684 → #3682 → #3675 → #3676 → #3680 → #3677/#3678.** Repo Owner đã merge thử cả bộ theo thứ tự này: sạch, 178 test pass. Chi tiết từng PR:
1. #3675: 90vkj + gglqk (giới hạn số lần tạo lại phong bì Inkless có tính phí; lọc cờ nội bộ khỏi body public)
2. #3676: ce3ey (không tạo phong bì ký trước cuộc 1-1 và trước khi đóng phí). PR này xếp chồng trên #3675.
3. #3680: 9wg8r, lỗ mới phát hiện đêm qua. Body public của registerLoanOfficer và registerWebinar tự set được `paid_startup_fee`, `waive_startup_fee` và `lo_agreement_signed`, chỉ cần email của LO. PR này xếp chồng trên #3676 và **phải lên cùng đợt deploy với #3676**.
4. #3677: cg03s. recruit-api nhận các recruiter mà MOSO vốn đã cho mời. Bản này chưa từng lên prod. Có 1 câu cần anh trả lời: user có tự bật được `Admin.is_recruiter` / `is_out_sourcing_recruiter` của chính mình không?
5. #3678: ocveo. Danh sách lender public từ 243 còn 242 (Eleven Mortgage rớt vì chưa approved và hợp đồng hết hạn 10/10). Không có lender nào tự nhiên hiện ra thêm.
6. #3682: mz36c, bỏ client secret PayPal khỏi dòng log lỗi. PR này độc lập, anh merge cuối cùng.

Bản cho master: #3679 (9wg8r) và #3681 (mz36c), cũng đang chờ anh.

**Review và test:** mỗi PR có 2 reviewer agent và 1 Repo Owner agent. Không có lỗi CRITICAL hay HIGH. Test của từng PR đều xanh và có đối chứng ngược. Merge thử cả bộ trên 3.64.1 thì sạch, và các file main sau khi merge giống hệt master.

**Deploy (chi tiết trong comment ở #3675):**
- Cài base từ `origin/3.64.1` trước, vì bản trong ~/.m2 đã cũ, không compile được `QuoteResult`.
- Deploy vào version d, chưa chuyển traffic. Smoke test trên d-dot rồi mới chuyển.
- Rollback: `gcloud app services set-traffic default --splits c=1 --project lender-rate`

**Nếu anh rảnh thêm:**
- Lúc lấy token PayPal thất bại, code ghi client secret PayPal vào log (bead mz36c). Trong 30 ngày log còn giữ thì chưa thấy dòng nào. Bản sửa là #3681/#3682. Có xoay secret hay không thì anh quyết. Ngoài ra trong source packs còn secret ghi thẳng, ví dụ LPAOAuth2.java:66-67 (bead 01s4a).
- Recruit prod chưa có metrics và alert: `podMonitoring` mới bật cho staging. Nếu anh đồng ý thì bật cho prod giúp em và áp alert policy trên lender-rate. Tài khoản của em không có quyền list PodMonitoring trên cluster prod.

Em cảm ơn anh!
