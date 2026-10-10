// ---------- app ----------
const UI = {
  vi: { all:"Tất cả", todo:"Chưa test", fail:"Lỗi", pass:"Đạt", skip:"Bỏ qua", notes:"Hiện mọi ô ghi chú", search:"Tìm bước, LO, email…",
    vMe:"Kết quả của tôi", vAll:"So sánh mọi người", vUser:"Chỉ xem: ", you:"Bạn", someone:"Ai đó", claude:"Claude (tự test)",
    cases:"case", steps:"bước", notTested:"Chưa test", stP:"Đạt", stF:"Lỗi", stS:"Bỏ",
    goal:"Mục tiêu", who:"Tài khoản / vai dùng trong case", prep:"Chuẩn bị", res:"Tài nguyên cho case này (đủ để test, không cần kéo lên trên)",
    los:"LO giả đã tạo sẵn cho case này", stepsT:"Các bước", whenFail:"Khi sai", exp:"Kỳ vọng: ",
    notePh:"Ghi chú: email LO, ID ứng viên, giờ VN, ảnh chụp…", addNote:"+ ghi chú", copied:"Đã chép", copyFail:"Không chép được — bôi đen để chép",
    syncShared:"Lưu riêng từng người · cập nhật trực tiếp", syncLocal:"Chỉ lưu trên trình duyệt này", syncRO:"Bạn chỉ có quyền xem", syncLost:"Mất kết nối nơi lưu. Tải lại trang.",
    saveErr:"Chưa lưu được, thử lại sau ít giây.", quota:"Kho lưu đã đầy.", readOnlyView:"Đang xem kết quả của người khác — chuyển về “Kết quả của tôi” để đánh dấu.",
    loCols:["LO","Tên","Email","SĐT","NMLS","Nguồn vào","Trạng thái tạo sẵn","Link"], profile:"Hồ sơ recruit", loLink:"Link của LO (?key)",
    accCols:["Vai","Email đăng nhập","Dùng để"], lockOn:"đang đổi /settings trên staging từ", lockWhat:"Đổi gì", lockMine:"Tôi đổi xong, đã trả lại", lockTake:"Tôi đang đổi /settings",
    lockHint:"Bấm trước khi hạ SLA ở /settings để người khác biết, bấm lại khi đã trả giá trị cũ.",
    runT:"Nhật ký lần chạy", runIntro:"Mỗi lần chạy một case ghi một dòng: case, email LO, ID ứng viên, tới bước nào, kết quả. Mỗi người thấy dòng của mình; chế độ So sánh thấy của mọi người.",
    rCase:"Case (vd A, B3)", rLo:"Email LO", rCand:"ID ứng viên", rReach:"Tới bước", rNote:"Ghi chú, mã bead", rAdd:"Thêm vào nhật ký", rOk:"Đã thêm",
    rRes:{pass:"Qua hết",partial:"Qua một phần",fail:"Lỗi chặn"}, rCols:["Lúc","Người","Case","LO / ứng viên","Tới","Kết quả","Ghi chú",""], rEmpty:"Chưa có lần chạy nào.", del:"Xoá",
    claudeSays:"Claude đã chạy", grpRef:"Tham khảo", grpCases:"Case test",
    loginAs:"Đăng nhập", pw:"mật khẩu: trong file tài khoản test / hỏi Bao", loginLO:"Vai LO: cửa sổ ẩn danh, không đăng nhập recruit", loginAny:"Tài khoản nào cũng được (mặc định <code>bao.trinh+recruiter@loanfactory.com</code>)", loginHR:"tại <code>hr.viet18.com</code>",
    freshT:"Lần chạy tay 10/10: LO tạo sẵn của case này phần lớn đã được Claude dùng hết. Hãy tự đăng ký LO mới ở dòng “CHƯA TẠO” trong bảng (cách đăng ký: khối 🆕 bên dưới), rồi ở mọi bước thay tên LO cũ (QA …) bằng tên LO mới đó." },
  en: { all:"All", todo:"Not tested", fail:"Failed", pass:"Passed", skip:"Skipped", notes:"Show every note box", search:"Search steps, LOs, emails…",
    vMe:"My results", vAll:"Compare everyone", vUser:"Only: ", you:"You", someone:"Someone", claude:"Claude (self-test)",
    cases:"cases", steps:"steps", notTested:"Not tested", stP:"Pass", stF:"Fail", stS:"Skip",
    goal:"Goal", who:"Accounts / roles in this case", prep:"Prepare", res:"Resources for this case (everything you need, no scrolling up)",
    los:"Fake LOs prepared for this case", stepsT:"Steps", whenFail:"When it fails", exp:"Expected: ",
    notePh:"Note: LO email, candidate ID, VN time, screenshot…", addNote:"+ note", copied:"Copied", copyFail:"Could not copy — select the text",
    syncShared:"Saved per person · live", syncLocal:"Saved in this browser only", syncRO:"You can only view", syncLost:"Lost connection. Reload the page.",
    saveErr:"Not saved yet, try again in a few seconds.", quota:"Storage is full.", readOnlyView:"You are viewing someone else's results — switch to “My results” to stamp.",
    loCols:["LO","Name","Email","Phone","NMLS","Entry source","Prepared state","Links"], profile:"Recruit profile", loLink:"LO's link (?key)",
    accCols:["Role","Login email","Use for"], lockOn:"is changing staging /settings since", lockWhat:"What", lockMine:"Done, values restored", lockTake:"I'm changing /settings",
    lockHint:"Press before you lower SLA values in /settings so others know; press again after restoring them.",
    runT:"Run log", runIntro:"One line per case run: case, LO email, candidate ID, how far, result. You see your lines; Compare shows everyone's.",
    rCase:"Case (e.g. A, B3)", rLo:"LO email", rCand:"Candidate ID", rReach:"Reached step", rNote:"Note, bead id", rAdd:"Add to log", rOk:"Added",
    rRes:{pass:"All passed",partial:"Partly passed",fail:"Blocking failure"}, rCols:["When","Who","Case","LO / candidate","Reached","Result","Note",""], rEmpty:"No runs yet.", del:"Delete",
    claudeSays:"Claude ran it", grpRef:"Reference", grpCases:"Test cases",
    loginAs:"Sign in as", pw:"password: in the test-accounts file / ask Bao", loginLO:"LO role: incognito window, no recruit sign-in", loginAny:"Any account (default <code>bao.trinh+recruiter@loanfactory.com</code>)", loginHR:"at <code>hr.viet18.com</code>",
    freshT:"Manual run 10/10: most prepared LOs of this case were used up by Claude. Register a fresh LO from the “NOT CREATED” row in the table (🆕 block below), then in every step replace the old LO name (QA …) with that new name." }
};
const CLAUDE = "claude";
const state = { lang:"vi", view:"me", filter:"all", q:"", uid:null, user:null, db:null, canWrite:true,
  results:{}, runs:[], lock:null, names:{} };
const $ = (id) => document.getElementById(id);
const T = (x) => x == null ? "" : (typeof x === "string" ? x : (x[state.lang] ?? x.vi ?? ""));
const U = (k) => UI[state.lang][k];
const docId = (s) => String(s).replace(/[^A-Za-z0-9_.~:@+-]/g, "_");
const ALL_STEPS = CASES.flatMap(c => c.steps.map(s => s.id));
const STEP_CASE = Object.fromEntries(CASES.flatMap(c => c.steps.map(s => [s.id, c.id])));
const LO_BY = Object.fromEntries(LOS.map(l => [l.id, l]));
function toast(m){ const t=$("toast"); t.textContent=m; t.classList.add("on"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("on"),2000); }
const fmt = (iso) => { if(!iso) return ""; const d=new Date(iso); return isNaN(d)?"":d.toLocaleString(state.lang==="vi"?"vi-VN":"en-US",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"}); };

// ---------- resource renderers ----------
function accBlock(k){
  const a = ACC[k]; if(!a) return esc(k);
  return `<div><span class="role">${esc(T(a.label))}</span> <code>${esc(a.email)}</code>${cp(a.email)}<div class="meta">${T(a.use)}</div></div>`;
}
function loTable(ids){
  const rows = ids.map(id => LO_BY[id]).filter(Boolean);
  if(!rows.length) return "";
  const h = U("loCols");
  return `<div class="tbl"><table><thead><tr>${h.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map(l => `<tr>
    <td class="mono">${esc(l.id)}</td><td>${esc(l.fn+" "+l.ln)}</td>
    <td class="mono">${esc(l.em)}${l.em?cp(l.em):""}</td><td class="mono">${esc(l.ph)}${l.ph?cp(l.ph.replace(/\D/g,"")):""}</td><td class="mono">${esc(l.nm)}${l.nm?cp(l.nm):""}</td>
    <td>${T(l.src)}</td><td>${T(l.prep)}</td>
    <td class="links">${l.cand?`<a href="https://recruit.viet18.com/candidates/${esc(l.cand)}" target="_blank" rel="noopener">${esc(U("profile"))}</a>${cp(l.cand)}<br>`:""}${l.key?`<a href="${esc(l.entryBase||"https://www.viet18.com/register-loan-officer")}?key=${esc(l.key)}" target="_blank" rel="noopener">${esc(U("loLink"))}</a>`:""}</td></tr>`).join("")}</tbody></table></div>`;
}
function resBlock(c){
  const parts = [];
  if(c.los && c.los.length) parts.push(`<details open><summary>${esc(U("los"))}</summary><div class="body">${loTable(c.los)}${c.loNote?`<div class="meta">${T(c.loNote)}</div>`:""}</div></details>`);
  if(c.acc && c.acc.length) parts.push(`<details open><summary>${esc(U("who"))}</summary><div class="body">${c.acc.map(accBlock).join("")}<div class="meta">${T(RES.loginShort.body)}</div></div></details>`);
  for(const k of (c.res||[])){ const r=RES[k]; if(!r) continue; parts.push(`<details ${r.open===false?"":"open"}><summary>${T(r.title)}</summary><div class="body">${T(r.body)}</div></details>`); }
  return parts.length ? `<div><p class="lbl">${esc(U("res"))}</p><div class="res" style="margin-top:6px">${parts.join("")}</div></div>` : "";
}

function loginLine(s){
  if(s.as && typeof s.as === "object") return `<div class="login">🔑 ${T(s.as)}</div>`;
  const k = s.as || LOGIN[s.who];
  if(s.who==="LO" && !s.as) return `<div class="login">🔑 ${U("loginLO")}</div>`;
  if(s.who==="ANY" && !s.as) return `<div class="login">🔑 ${U("loginAny")}</div>`;
  const a = k && ACC[k]; if(!a) return "";
  return `<div class="login">🔑 ${esc(U("loginAs"))}: <code>${esc(a.email)}</code>${cp(a.email)} ${s.who==="HR"?U("loginHR"):""} · ${esc(U("pw"))}</div>`;
}

// ---------- build ----------
function buildStatic(){
  return STATIC.map(s => `<section id="${s.id}"><h2><span class="code">${esc(s.code||"")}</span>${T(s.title)}</h2>${T(s.body)}</section>`).join("");
}
function buildCases(){
  return CASES.map(c => `
  <section id="case-${c.id}" data-case="${esc(c.id)}">
    <h2><span class="code">${esc(c.id)}</span>${T(c.title)}</h2>
    <div class="case">
      <p class="goal"><b>${esc(U("goal"))}:</b> ${T(c.goal)}</p>
      ${c.prep?`<div><p class="lbl">${esc(U("prep"))}</p><ul class="prep" style="margin-top:6px">${(T(c.prep)||[]).map(p=>`<li>${p}</li>`).join("")}</ul></div>`:""}
      ${resBlock(c)}
      ${c.fresh?`<div class="callout warn">${esc(U("freshT"))}</div>`:""}
      ${c.tip?`<div class="callout">${T(c.tip)}</div>`:""}
      ${c.warn?`<div class="callout warn">${T(c.warn)}</div>`:""}
      ${c.lock?`<div class="callout warn">${esc(U("lockHint"))} <button class="btn ghost" type="button" data-lock="${esc(c.id)}">${esc(U("lockTake"))}</button></div>`:""}
      <p class="lbl">${esc(U("stepsT"))}</p>
      <div class="items">${c.steps.map(s => {
        const [act, exp] = s[state.lang] || s.vi;
        return `<div class="item" id="it-${docId(s.id)}" data-id="${esc(s.id)}">
          <div class="stamps" role="group" aria-label="${esc(s.id)}">
            <button class="stamp p" data-st="pass" aria-pressed="false">${esc(U("stP"))}</button>
            <button class="stamp f" data-st="fail" aria-pressed="false">${esc(U("stF"))}</button>
            <button class="stamp s" data-st="skip" aria-pressed="false">${esc(U("stS"))}</button>
          </div>
          <div class="ib">
            <div><span class="sid">${esc(s.id)}</span><span class="role">${esc(T(WHO[s.who]||s.who))}</span></div>
            ${loginLine(s)}
            <div class="act">${act}</div>
            <div class="exp"><b class="k">${esc(U("exp"))}</b>${exp}</div>
            ${s.bug?`<span class="bug">${T(s.bug)}</span>`:""}
            <div class="others"></div>
            <div class="meta"></div>
            <textarea class="note" id="note-${docId(s.id)}" rows="1" maxlength="2000" placeholder="${esc(U("notePh"))}" aria-label="note ${esc(s.id)}"></textarea>
            <button class="addnote" type="button">${esc(U("addNote"))}</button>
          </div></div>`; }).join("")}</div>
      ${c.fail?`<div class="callout bad"><b>${esc(U("whenFail"))}:</b> ${T(c.fail)}</div>`:""}
    </div>
  </section>`).join("");
}
function buildRuns(){
  const r = UI[state.lang];
  return `<section id="runs"><h2><span class="code">LOG</span>${esc(r.runT)}</h2><p class="intro">${esc(r.runIntro)}</p>
  <form class="run" id="runForm">
    <input id="rCase" placeholder="${esc(r.rCase)}" required maxlength="20" aria-label="${esc(r.rCase)}">
    <input id="rLo" placeholder="${esc(r.rLo)}" maxlength="120" aria-label="${esc(r.rLo)}">
    <input id="rCand" placeholder="${esc(r.rCand)}" maxlength="60" aria-label="${esc(r.rCand)}">
    <input id="rReach" placeholder="${esc(r.rReach)}" maxlength="20" aria-label="${esc(r.rReach)}">
    <select id="rResult" aria-label="result">${Object.entries(r.rRes).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("")}</select>
    <textarea id="rNote" placeholder="${esc(r.rNote)}" maxlength="2000" aria-label="${esc(r.rNote)}"></textarea>
    <div><button class="btn" id="rSave" type="submit">${esc(r.rAdd)}</button></div>
  </form>
  <div class="ref tbl"><table><thead><tr>${r.rCols.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody id="runBody"></tbody></table></div></section>`;
}
function buildNav(){
  const s = STATIC.map(x=>`<a href="#${x.id}"><span>${esc(T(x.nav||x.title))}</span></a>`).join("");
  let last = null, c = "";
  for(const x of CASES){
    if(x.group && T(x.group)!==last){ last=T(x.group); c+=`<div class="grp">${esc(last)}</div>`; }
    c += `<a href="#case-${x.id}"><span>${esc(x.id)} · ${esc(T(x.short||x.title))}</span><span class="n" id="nav-${docId(x.id)}"></span></a>`;
  }
  $("nav").innerHTML = `<div class="grp">${esc(U("grpRef"))}</div>${s}${c}<div class="grp">·</div><a href="#runs"><span>${esc(U("runT"))}</span><span class="n" id="nav-runs"></span></a>`;
}
function buildFilters(){
  const f = [["all","all"],["todo","todo"],["fail","fail"],["pass","pass"],["skip","skip"]];
  $("filters").innerHTML = f.map(([k,l])=>`<button class="chip" data-f="${k}" aria-pressed="${state.filter===k}">${esc(U(l))}</button>`).join("")
    + `<button class="chip" data-f="notes" aria-pressed="${!document.body.classList.contains("hidden-note")}">${esc(U("notes"))}</button><span class="sync" id="sync"></span>`;
}
function render(){
  document.documentElement.lang = state.lang;
  $("lang-vi").setAttribute("aria-pressed", String(state.lang==="vi"));
  $("lang-en").setAttribute("aria-pressed", String(state.lang==="en"));
  $("envline").textContent = T(META.env);
  $("q").placeholder = U("search");
  const y = window.scrollY;
  $("main").innerHTML = buildStatic() + buildCases() + buildRuns();
  buildNav(); buildFilters(); buildViewSelect(); wireRunForm();
  setSyncText(); paint(); renderRuns(); renderLock();
  window.scrollTo(0, y);
}

// ---------- results ----------
function viewUid(){ if(state.view==="me"||state.view==="all") return state.uid; return state.view.slice(2); }
function resOf(uid, step){ return (state.results[uid]||{})[step] || {}; }
function testers(){ return Object.keys(state.results).filter(u => Object.values(state.results[u]).some(r => r.status)); }
async function resolveNames(ids){
  const need = ids.filter(id => id && id!==CLAUDE && !(id in state.names));
  if(need.length && state.user){ try{ const ps = await state.user.profiles(need); for(const id of need) state.names[id] = (ps[id] && ps[id].name) || ""; }catch(e){} }
}
const nameOf = (uid) => uid===CLAUDE ? U("claude") : (uid===state.uid ? U("you") : (state.names[uid] || U("someone")));
function buildViewSelect(){
  const sel = $("view"); const ts = testers().filter(u => u!==state.uid);
  const opts = [["me",U("vMe")],["all",U("vAll")], ...ts.map(u=>["u:"+u, U("vUser")+nameOf(u)])];
  if(!opts.some(o=>o[0]===state.view)) opts.push([state.view, U("vUser")+nameOf(state.view.slice(2))]);
  sel.innerHTML = opts.map(([v,l])=>`<option value="${esc(v)}" ${v===state.view?"selected":""}>${esc(l)}</option>`).join("");
}
function stepMatches(id){
  if(!state.q) return true;
  const c = CASES.find(x=>x.id===STEP_CASE[id]); const s = c.steps.find(x=>x.id===id);
  const txt = (id+" "+(s.vi||[]).join(" ")+" "+(s.en||[]).join(" ")+" "+T(c.title)).toLowerCase().replace(/<[^>]+>/g,"");
  return txt.includes(state.q);
}
async function paint(){
  await resolveNames(testers());
  const vu = viewUid(); const mine = state.view==="me"; const editable = mine && state.canWrite && !!state.uid;
  let p=0,f=0,s=0;
  for(const id of ALL_STEPS){
    const el = $("it-"+docId(id)); if(!el) continue;
    const r = resOf(vu, id); const st = r.status || "";
    el.dataset.st = st; if(st==="pass")p++; else if(st==="fail")f++; else if(st==="skip")s++;
    el.querySelectorAll(".stamp").forEach(b=>{ b.setAttribute("aria-pressed", String(b.dataset.st===st)); b.disabled = !editable; });
    const ta = el.querySelector(".note");
    if(document.activeElement!==ta) ta.value = r.note || "";
    ta.disabled = !editable; ta.readOnly = !editable;
    el.classList.toggle("has-note", !!r.note);
    el.querySelector(".addnote").hidden = !!r.note || st==="fail" || !editable;
    el.querySelector(".meta").textContent = st ? `${U(st==="pass"?"stP":st==="fail"?"stF":"stS")}${r.at?" · "+fmt(r.at):""}` : "";
    // other testers (always show Claude; show everyone in compare view)
    const oth = el.querySelector(".others"); const chips = [];
    for(const u of Object.keys(state.results)){
      if(u===vu) continue;
      if(state.view!=="all" && u!==CLAUDE) continue;
      const o = resOf(u, id); if(!o.status) continue;
      chips.push(`<span class="oc ${o.status} ${u===CLAUDE?"claude":""}" title="${esc(o.note||"")}">${esc(nameOf(u))}: ${esc(U(o.status==="pass"?"stP":o.status==="fail"?"stF":"stS"))}${o.note?" · "+esc(o.note.slice(0,80)):""}</span>`);
    }
    oth.innerHTML = chips.join("");
    const show = (state.filter==="all" || (state.filter==="todo"&&!st) || state.filter===st) && stepMatches(id);
    el.hidden = !show;
  }
  for(const c of CASES){
    const done = c.steps.filter(x => resOf(vu, x.id).status).length;
    const n = $("nav-"+docId(c.id)); if(n) n.textContent = `${done}/${c.steps.length}`;
    const sec = $("case-"+c.id); if(sec) sec.hidden = (state.filter!=="all" || state.q) && ![...sec.querySelectorAll(".item")].some(x=>!x.hidden);
  }
  const tot = ALL_STEPS.length, todo = tot-p-f-s;
  $("barP").style.width=(p/tot*100)+"%"; $("barF").style.width=(f/tot*100)+"%"; $("barS").style.width=(s/tot*100)+"%";
  $("counts").innerHTML = `<span><b>${CASES.length}</b> ${esc(U("cases"))} · <b>${tot}</b> ${esc(U("steps"))}</span><span>${esc(U("pass"))} <b>${p}</b></span><span>${esc(U("fail"))} <b>${f}</b></span><span>${esc(U("skip"))} <b>${s}</b></span><span>${esc(U("todo"))} <b>${todo}</b></span>${state.view!=="me"?`<span>· ${esc(nameOf(vu))}</span>`:""}`;
  $("me").innerHTML = state.uid ? `${esc(U("you"))}: <b>${esc(state.names[state.uid]||"")}</b>` : "";
}
function setSyncText(){
  const el = $("sync"); if(!el) return;
  let t, warn=false;
  if(!state.db){ t=U("syncLocal"); warn=true; } else if(!state.canWrite){ t=U("syncRO"); warn=true; } else t=U("syncShared");
  if(state.view!=="me"){ t = U("readOnlyView"); warn = true; }
  el.textContent = t; el.classList.toggle("warn", warn);
}

// ---------- writes ----------
const LS = "recruit-e2e-lab-v1";
function lsLoad(){ try{ const v = JSON.parse(localStorage.getItem(LS)||"{}"); if(v.results) state.results = {[state.uid||"local"]: v.results}; if(v.runs) state.runs=v.runs; }catch(e){} }
function lsSave(){ try{ localStorage.setItem(LS, JSON.stringify({results: state.results[state.uid||"local"]||{}, runs: state.runs})); }catch(e){} }
const writing = new Set(), again = new Set();
async function writeResult(step){
  const uid = state.uid; const r = resOf(uid, step);
  if(!state.db){ lsSave(); return; }
  if(writing.has(step)){ again.add(step); return; }
  writing.add(step);
  try{ await state.db.doc("results/"+docId(uid+"__"+step)).set({uid, step, status:r.status||"", note:r.note||"", at:r.at||null}); }
  catch(e){ onWriteError(e); }
  finally{ writing.delete(step); if(again.has(step)){ again.delete(step); writeResult(step); } }
}
function onWriteError(e){
  const code = e && e.code;
  if(code==="invalid_argument"){ state.canWrite=false; setSyncText(); paint(); }
  else if(code==="quota_exceeded") toast(U("quota")); else toast(U("saveErr"));
}
function setLocal(step, patch){
  const uid = state.uid || "local";
  const cur = state.results[uid] || {};
  state.results = {...state.results, [uid]: {...cur, [step]: {...(cur[step]||{}), ...patch, at:new Date().toISOString()}}};
}
function setStatus(step, st){
  if(state.view!=="me" || !state.canWrite) return;
  const cur = resOf(state.uid||"local", step).status;
  setLocal(step, {status: cur===st ? "" : st}); paint(); writeResult(step);
  if(cur!==st && st==="fail"){ const ta=$("note-"+docId(step)); if(ta && !ta.value) ta.focus(); }
}
const noteT = {};
function setNote(step, v){ setLocal(step, {note:v}); clearTimeout(noteT[step]); noteT[step]=setTimeout(()=>writeResult(step), 700); }

// ---------- runs ----------
async function renderRuns(){
  const body = $("runBody"); if(!body) return;
  const list = state.runs.filter(r => state.view==="all" || r.uid===viewUid() || (!r.uid && state.view==="me"));
  const n = $("nav-runs"); if(n) n.textContent = list.length || "";
  if(!list.length){ body.innerHTML = `<tr><td colspan="8" class="empty">${esc(U("rEmpty"))}</td></tr>`; return; }
  await resolveNames([...new Set(list.map(r=>r.uid))]);
  const RL = {pass:"res-pass",partial:"res-partial",fail:"res-fail"};
  body.innerHTML = "";
  for(const r of list){
    const tr = document.createElement("tr");
    [fmt(r.at), nameOf(r.uid), r.case, [r.lo,r.cand].filter(Boolean).join(" / "), r.reach, U("rRes")[r.result]||r.result, r.note].forEach((v,i)=>{
      const td=document.createElement("td"); td.textContent=v||""; if(i===5) td.className=RL[r.result]||""; if(i===3) td.className="mono"; tr.appendChild(td); });
    const td=document.createElement("td");
    if(state.canWrite && r._id && r.uid===state.uid){ const b=document.createElement("button"); b.className="del"; b.type="button"; b.textContent=U("del"); b.onclick=()=>delRun(r._id); td.appendChild(b); }
    tr.appendChild(td); body.appendChild(tr);
  }
}
function wireRunForm(){
  const f = $("runForm"); if(!f) return;
  f.addEventListener("submit", async (ev) => {
    ev.preventDefault(); if(!state.canWrite) return;
    const r = {uid:state.uid||"local", case:$("rCase").value.trim(), lo:$("rLo").value.trim(), cand:$("rCand").value.trim(), reach:$("rReach").value.trim(), result:$("rResult").value, note:$("rNote").value.trim(), at:new Date().toISOString()};
    if(!r.case){ $("rCase").focus(); return; }
    $("rSave").disabled = true;
    try{
      if(state.db) await state.db.collection("runs").add(r);
      else { state.runs = [{...r,_id:"l"+Date.now()}, ...state.runs]; lsSave(); renderRuns(); }
      ["rCase","rLo","rCand","rReach","rNote"].forEach(i=>$(i).value=""); toast(U("rOk"));
    }catch(e){ onWriteError(e); } finally{ $("rSave").disabled = false; }
  });
}
async function delRun(id){
  try{ if(state.db) await state.db.doc("runs/"+id).delete(); else { state.runs=state.runs.filter(r=>r._id!==id); lsSave(); renderRuns(); } }catch(e){ onWriteError(e); }
}

// ---------- settings lock ----------
async function renderLock(){
  const bar = $("lockbar"); const l = state.lock;
  if(!l || !l.uid){ bar.classList.remove("on"); bar.textContent=""; return; }
  await resolveNames([l.uid]);
  bar.classList.add("on");
  bar.innerHTML = `<b>${esc(nameOf(l.uid))}</b> ${esc(U("lockOn"))} ${esc(fmt(l.at))} · ${esc(U("lockWhat"))}: ${esc(l.what||"")} ${l.uid===state.uid?`<button class="btn ghost" type="button" id="lockRelease">${esc(U("lockMine"))}</button>`:""}`;
  const b = $("lockRelease"); if(b) b.onclick = async () => { try{ await state.db.doc("locks/settings").set({uid:"", what:"", at:new Date().toISOString()}); }catch(e){ onWriteError(e); } };
}
async function takeLock(caseId){
  if(!state.db){ toast(U("syncLocal")); return; }
  try{ await state.db.doc("locks/settings").set({uid:state.uid, what:"case "+caseId, at:new Date().toISOString()}); }catch(e){ onWriteError(e); }
}

// ---------- wiring ----------
function copyText(v){
  const done = () => toast(U("copied"));
  try{ navigator.clipboard.writeText(v).then(done, () => toast(U("copyFail"))); }catch(e){ toast(U("copyFail")); }
}
function wire(){
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]"); if(c){ copyText(c.dataset.copy); return; }
    const b = e.target.closest(".stamp"); if(b){ setStatus(b.closest(".item").dataset.id, b.dataset.st); return; }
    const a = e.target.closest(".addnote"); if(a){ const it=a.closest(".item"); it.classList.add("has-note"); a.hidden=true; it.querySelector(".note").focus(); return; }
    const l = e.target.closest("[data-lock]"); if(l){ takeLock(l.dataset.lock); return; }
    const ch = e.target.closest(".chip[data-f]");
    if(ch){
      if(ch.dataset.f==="notes"){ document.body.classList.toggle("hidden-note"); ch.setAttribute("aria-pressed", String(!document.body.classList.contains("hidden-note"))); return; }
      state.filter = ch.dataset.f; document.querySelectorAll('.chip[data-f]:not([data-f="notes"])').forEach(x=>x.setAttribute("aria-pressed", String(x===ch))); paint(); return;
    }
  });
  document.addEventListener("input", (e) => { if(e.target.classList.contains("note")) setNote(e.target.closest(".item").dataset.id, e.target.value); });
  $("q").addEventListener("input", () => { state.q = $("q").value.trim().toLowerCase(); paint(); });
  $("view").addEventListener("change", () => { state.view = $("view").value; setSyncText(); paint(); renderRuns(); });
  $("lang-vi").onclick = () => setLang("vi"); $("lang-en").onclick = () => setLang("en");
}
function setLang(l){ state.lang = l; try{ localStorage.setItem(LS+"-lang", l); }catch(e){} render(); }

async function start(){
  try{ const l = localStorage.getItem(LS+"-lang"); if(l==="en"||l==="vi") state.lang = l; }catch(e){}
  document.body.classList.add("hidden-note");
  lsLoad(); render(); wire();
  const claude = window.claude;
  if(!claude || !claude.use) return;
  const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
  state.user = user;
  if(user){ try{ state.uid = await user.id(); if((await user.can("data.write"))===false) state.canWrite=false; }catch(e){} }
  if(!state.uid){ setSyncText(); return; }
  await resolveNames([state.uid]);
  if(!db){ setSyncText(); paint(); return; }
  state.db = db; state.results = {}; state.runs = [];
  setSyncText();
  db.collection("results").onSnapshot((snap) => {
    const m = {};
    snap.docs.forEach(d => { const v = d.data(); if(v && v.uid && v.step){ (m[v.uid] ||= {})[v.step] = {status:v.status||"", note:v.note||"", at:v.at||null}; } });
    // keep my unsaved local edits
    state.results = {...m, [state.uid]: {...(m[state.uid]||{}), ...Object.fromEntries([...writing].map(s=>[s, resOf(state.uid,s)]))}};
    buildViewSelect(); paint();
  }, () => { const el=$("sync"); if(el){ el.textContent=U("syncLost"); el.classList.add("warn"); } });
  db.collection("runs").orderBy("at","desc").limit(500).onSnapshot((snap) => { state.runs = snap.docs.map(d => ({...d.data(), _id:d.id})); renderRuns(); }, () => {});
  db.doc("locks/settings").onSnapshot((snap) => { state.lock = snap.exists ? snap.data() : null; renderLock(); }, () => {});
}
start();
