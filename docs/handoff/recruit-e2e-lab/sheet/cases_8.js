// ---------- cases part 8: Omni by role + Omni coverage reference ----------
const __OM = [];
__OM.push({ id: "OM", group: G_LEAD, short: { vi: "Omni: nội bộ & với LO", en: "Omni: internal & with LO" },
  title: { vi: "Omni: nhân viên nhắn nhau, Cc, @tag, nhiều vai nhắn LO, và cái gì có vào dòng thời gian", en: "Omni: staff messaging each other, Cc, @tags, several roles messaging the LO, and what lands in the timeline" },
  goal: { vi: "Mọi vai nói chuyện với nhau và với LO trong Omni; kiểm cái gì được ghi vào dòng thời gian (xem bảng “Omni ghi lại gì” ở phần tham khảo).", en: "Every role talks to each other and to the LO in Omni; check what lands in the timeline (see “What Omni records” in the reference)." },
  los: ["Y2", "GM2", "A2"], acc: ["rec", "recSms", "mgr", "onb", "admin"], res: ["sms"],
  loNote: { vi: "Y2: recruiter giữ. GM2 (QA Claudemailtwo) dùng hộp mail.tm — Claude theo dõi thư tới. Đổi vai bằng 2 profile Chrome.", en: "Y2: owned by the recruiter. GM2 (QA Claudemailtwo) uses a mail.tm inbox — Claude watches arrivals. Switch roles with 2 Chrome profiles." },
  steps: [
    S("OM1", "REC", "QA Ysms → mở hội thoại → <b>Candidate &amp; parties</b> → Email → bấm chip “+ QA Ysms” ở To → thêm <b>Cc</b> một đồng nghiệp → gửi.", "Phải bấm chip người nhận thì nút mới thành “Send to QA Ysms” (trước đó nút “Send email” mờ, không ghi lý do). Hộp “Send outside the company?”. Tin hiện trong dòng thời gian có Cc; Activity có dòng EMAIL gửi đi.", "QA Ysms → conversation → <b>Candidate &amp; parties</b> → Email → click the “+ QA Ysms” chip in To → add a colleague in <b>Cc</b> → send.", "The recipient chip must be clicked before the button turns into “Send to QA Ysms” (until then “Send email” is greyed with no reason). “Send outside the company?” dialog. Message in the timeline with Cc; Activity has an outbound EMAIL row.", { vi: "Claude gửi thử thành công 08/10 01:15 (QA Claudemailtwo)", en: "Claude sent one successfully 08/10 01:15 (QA Claudemailtwo)" }),
    S("OM2", "RECSMS", "manhadmin nhắn SMS cho LO TRINH VU TRONG BAO; LO trả lời từ Zoom.", "Tin đi tới Zoom; tin về hiện trong hội thoại + Activity “SMS INBOUND”.", "manhadmin texts LO TRINH VU TRONG BAO; LO replies from Zoom.", "Outbound reaches Zoom; the reply shows in the thread + Activity “SMS INBOUND”.", { vi: "Claude + anh Bảo test đạt 08/10 00:59 / 01:01", en: "Claude + Bao passed 08/10 00:59 / 01:01" }),
    S("OM3", "MGR", "Manager (không trong hội thoại) mở hội thoại QA Ysms từ trang Conversations → bấm tham gia → gửi một tin cho LO.", "Lúc đầu “You are viewing as an observer…”; sau khi tham gia: danh sách người có “Hiring manager”, dòng “… joined the conversation as Hiring manager”; tin của manager hiện tên manager.", "Manager (not in the thread) opens QA Ysms from Conversations → join → send the LO a message.", "First “You are viewing as an observer…”; after joining: participants show “Hiring manager”, line “… joined the conversation as Hiring manager”; the manager's message shows their name."),
    S("OM4", "ONB", "Onboarding (đã được gán) mở hội thoại LO của mình → thử Email / SMS cho LO; rồi nhắn Team only.", "Email/SMS cho LO bị khoá: “Texting is off in this panel. Your role can't send texts or emails to loan officers. Team chat still works.” Team only gửi được. (Ghi nhận: vai Onboarding hiện KHÔNG nhắn được LO — bead agentflow-y8fbi.)", "Onboarding (assigned) opens their LO's thread → try Email / SMS to the LO; then Team only.", "Email/SMS to the LO locked: “Texting is off in this panel. Your role can't send texts or emails to loan officers. Team chat still works.” Team only works. (Onboarding currently CANNOT message the LO — bead agentflow-y8fbi.)"),
    S("OM5", "REC", "Tab <b>Team only</b>: gửi Chat cho đồng nghiệp; “Email a teammate”; “Text a teammate”; thử email tới địa chỉ của LO.", "Ghi “Now in Team only. Only your team can see what you write here.” Gửi được cho đồng nghiệp; địa chỉ LO bị chặn “Only teammates can be emailed from the Team only tab…”. <b>Kiểm Activity của LO: KHÔNG được có dòng liên hệ đi</b> (nghi lỗi agentflow-ymuty).", "<b>Team only</b>: Chat a colleague; “Email a teammate”; “Text a teammate”; try the LO's address.", "Shows “Now in Team only. Only your team can see what you write here.” Teammate sends work; the LO address is refused “Only teammates can be emailed from the Team only tab…”. <b>LO Activity must have NO outbound contact row</b> (suspected bug agentflow-ymuty)."),
    S("OM6", "REC", "Team only → gõ <code>@</code> chọn một đồng nghiệp → gửi.", "Tên được tô; ghi lại người đó có nhận chuông/email không (hiện tại: không — @ trong Omni không báo ra ngoài Omni).", "Team only → type <code>@</code> pick a colleague → send.", "Name highlighted; note whether they get a bell/email (today: no — Omni @mentions notify nobody outside Omni)."),
    S("OM7", "REC", "Hồ sơ → Internal note → <code>@</code> đồng nghiệp → Add note.", "Người được nhắc nhận chuông “{bạn} mentioned you on {LO}” và vào danh sách Followers (“Mentioned”). Ghi chú KHÔNG hiện trong Omni (2 hệ tách rời).", "Profile → Internal note → <code>@</code> a colleague → Add note.", "They get the bell “{you} mentioned you on {LO}” and join Followers (“Mentioned”). The note does NOT show in Omni (two separate systems)."),
    S("OM8", "ANY", "Một LO đã qua 1-1 Done (vd A1 sau A14) → mở hội thoại Candidate &amp; parties.", "Hiện tại KHÔNG có dòng cho email MOSO “Complete These Initial Steps”, email mời, thoả thuận ký, webinar, nhắc lịch, lời mời Google, buổi Meet — đúng như bảng “Omni ghi lại gì”. Đánh Lỗi kèm “x1l9i” để theo dõi.", "An LO past 1-1 Done (e.g. A1 after A14) → open Candidate &amp; parties.", "Today there is NO row for the MOSO “Complete These Initial Steps” email, invite, agreement, webinar, reminders, Google invites, Meet — as in “What Omni records”. Mark Fail with “x1l9i” to track."),
    S("OM9", "REC", "Bấm Call now (Zoom) với một LO có số thật của test → cúp máy → Omni tab Calls.", "Có cuộc gọi với thời lượng, ghi âm, transcript, ghi tên bạn.", "Call now (Zoom) to a test LO with a real number → hang up → Omni Calls.", "Call shows with duration, recording, transcript, your name.")
  ] });
CASES.splice(CASES.findIndex(c => c.id === "Y") + 1, 0, ...__OM);

const OMNI_ROWS = [
  ["Tin gõ tay trong Omni (Email/SMS) · Cc", "Hand-typed Omni messages (Email/SMS) · Cc", "ok"],
  ["“Save &amp; send” trong kết quả cuộc gọi", "“Save &amp; send” from a call result", "ok"],
  ["Cuộc gọi Zoom (thời lượng, ghi âm, transcript)", "Zoom calls (duration, recording, transcript)", "ok"],
  ["SMS gửi thẳng từ app Zoom", "SMS sent straight from the Zoom app", "ok"],
  ["LO trả lời Email/SMS", "LO replies by Email/SMS", "ok"],
  ["Team only giữa nhân viên · @ trong Omni (không báo ra ngoài)", "Team only between staff · @ inside Omni (no outside notice)", "mid"],
  ["Send info hẹn giờ (chỉ khi người bấm gửi)", "Scheduled Send info (only once a person sends it)", "mid"],
  ["Ghi chú nội bộ + @ trên hồ sơ (chỉ ở Activity recruit)", "Internal note + @ on the profile (recruit Activity only)", "no"],
  ["Email mời của MOSO (khi không có Onboarding)", "MOSO invite email (when no onboarding specialist)", "no"],
  ["MOSO “Complete These Initial Steps”", "MOSO “Complete These Initial Steps”", "no"],
  ["Thoả thuận ký (e-sign)", "E-sign agreement", "no"],
  ["Email đăng ký / nhắc webinar", "Webinar registration / reminder emails", "no"],
  ["Email nhắc lịch 1-1", "1-1 reminder emails", "no"],
  ["Lời mời Google Calendar (1-1, Meet 1-1)", "Google Calendar invites (1-1, Meet 1-1)", "no"],
  ["Buổi Meet 1-1 đã diễn ra", "Meet 1-1 held", "no"],
  ["Email Welcome / Activate (MOSO qua HR) · email HR gửi nhân viên mới", "Welcome / Activate (MOSO via HR) · HR emails to the new hire", "no"],
  ["Biên nhận PayPal", "PayPal receipt", "no"],
  ["Gửi bằng app email/SMS của máy (không có nội dung)", "Sent via the device's own email/SMS app (no text)", "no"]
];
STATIC.push({ id: "omni", code: "Ω", nav: { vi: "Omni ghi lại gì", en: "What Omni records" }, title: { vi: "Liên lạc với LO: cái gì có trong dòng thời gian Omni", en: "Contact with the LO: what is in the Omni timeline" }, body: {
  get vi() { return `<p class="intro">Kết quả đọc code 08/10 (omni-service, recruit-be, packs, ai-hr-be). Mọi thứ gửi TỰ ĐỘNG hoặc do MOSO gửi hiện không vào dòng thời gian Omni.</p>
<div class="ref tbl"><table><thead><tr><th>Liên lạc</th><th>Trong Omni?</th></tr></thead><tbody>${OMNI_ROWS.map(r => `<tr><td>${r[0]}</td><td>${r[2] === "ok" ? '<span class="pill ok">Có</span>' : r[2] === "mid" ? '<span class="pill mid">Một phần</span>' : '<span class="pill no">Không</span>'}</td></tr>`).join("")}</tbody></table></div>
<h3 class="sub">Đề xuất để mọi thứ gửi ra LO đều có trong Omni (bead agentflow-x1l9i, ~4 tuần dev)</h3>
<ol class="prep"><li><b>omni-service:</b> thêm cửa nội bộ “ghi một lần gửi bên ngoài” — ghi dòng gửi đi phía LO (Candidate &amp; parties), KHÔNG gửi lại, có khoá chống trùng, có trạng thái (đã gửi / mở / lỗi).</li>
<li><b>recruit-be:</b> là nơi duy nhất đẩy vào cửa đó: email mời / thoả thuận / webinar / “Complete These Initial Steps” (từ hàng gửi MOSO), nhắc lịch 1-1, lời mời Google, Meet 1-1 (bật cửa cuộc gọi của Omni), sự kiện HR welcome.</li>
<li><b>packs (MOSO):</b> mỗi email gửi cho LO tuyển dụng phát sự kiện <code>moso-email-sent</code> → recruit-be ghi vào Omni (bao cả email MOSO tự gửi).</li>
<li><b>omni-react:</b> nhãn “Gửi tự động · MOSO / Google” + bộ lọc “Automated”.</li>
<li>Sửa nhanh: cho vai Onboarding nhắn LO (agentflow-y8fbi); bỏ tin Team only khỏi “liên hệ LO” (agentflow-ymuty); @ trong Omni báo chuông recruit.</li></ol>`; },
  get en() { return `<p class="intro">From reading code on 08/10 (omni-service, recruit-be, packs, ai-hr-be). Everything sent AUTOMATICALLY or by MOSO is currently missing from the Omni timeline.</p>
<div class="ref tbl"><table><thead><tr><th>Contact</th><th>In Omni?</th></tr></thead><tbody>${OMNI_ROWS.map(r => `<tr><td>${r[1]}</td><td>${r[2] === "ok" ? '<span class="pill ok">Yes</span>' : r[2] === "mid" ? '<span class="pill mid">Partly</span>' : '<span class="pill no">No</span>'}</td></tr>`).join("")}</tbody></table></div>
<h3 class="sub">Proposal so every LO-facing send is in Omni (bead agentflow-x1l9i, ~4 dev-weeks)</h3>
<ol class="prep"><li><b>omni-service:</b> an internal “record an external send” door — writes an outbound LO-side row (Candidate &amp; parties), never re-sends, idempotency key, status (sent / opened / failed).</li>
<li><b>recruit-be:</b> the only publisher: invite / agreement / webinar / “Complete These Initial Steps” (from the MOSO writeback queue), 1-1 reminders, Google invites, Meet 1-1 (turn on Omni's call door), HR welcome event.</li>
<li><b>packs (MOSO):</b> every email to a recruiting LO emits <code>moso-email-sent</code> → recruit-be records it in Omni (covers emails MOSO sends on its own).</li>
<li><b>omni-react:</b> “Sent automatically · MOSO / Google” badge + an “Automated” filter.</li>
<li>Quick fixes: let Onboarding message the LO (agentflow-y8fbi); drop Team-only sends from “LO contact” (agentflow-ymuty); Omni @mentions ring a recruit bell.</li></ol>`; } } });
