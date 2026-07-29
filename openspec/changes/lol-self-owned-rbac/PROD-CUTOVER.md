# LOL Self-Owned RBAC — PRODUCTION Cutover Runbook

> Chạy tuần tự. Mỗi phase có verify + có thể dừng an toàn. Rollback = 1 lệnh (flip flag OFF).
> **Nguyên tắc an toàn:** KHÔNG gỡ central LOL# roles của 12 user trong suốt cutover — đó là phao rollback.

## Trạng thái hiện tại (đã kiểm chứng)

| Repo | master (đã có code mới) | branch PROD | Prod đang thiếu gì |
|---|---|---|---|
| moso-aid (BE) | ✅ #85/#86/#87 | `pro` (sau master 28 commit) | `pro` vẫn giữ code CŨ #82 (option-b) → **phải promote master→pro** |
| life-of-a-loan (FE) | ✅ #46/#47 (tab Permissions) | `production` (sau master 7 commit) | thiếu tab Permissions → **promote master→production** |

- Prod moso-aid Cloud Run **chưa** có biến `LOL_RBAC_ENFORCE` → mặc định OFF (legacy central-role gate).
- 12 user hiện có central LOL# role → hôm nay đăng nhập /config bình thường (gate cũ).

---

## PHASE 0 — Quyết định role matrix (1 điểm cần bạn chốt)

File `lol-admin-batch.json` (flow cũ) gán **cả 12 = ADMIN**. Design mới đề xuất **3 ADMIN + 9 EDITOR(+xoá task)**.

| Option | Nội dung | Khi nào chọn |
|---|---|---|
| **(A) Parity — cả 12 ADMIN** ⭐ khuyến nghị cho cutover | Y hệt quyền thực tế hôm nay (pre-#82 mọi LOL# = full config) → **zero regression**, không ai mất quyền | Chọn cái này để cutover an toàn, siết least-privilege sau |
| (B) Least-privilege | thuan/jesica/katarina = ADMIN; 9 người còn lại = EDITOR + ADD `LOL_TASK_DELETE` | Nếu muốn siết ngay trong cutover |

→ **Khuyến nghị: (A) khi cutover** (an toàn tuyệt đối), rồi đổi role vài người sang EDITOR sau khi ổn định (chỉ cần sửa grants file + chạy lại seed, idempotent).

---

## PHASE 1 — Build grants file cho PROD + seed Mongo (flag vẫn OFF → zero impact)

Seed lúc flag OFF không ảnh hưởng gì (code prod chưa đọc collection này). Làm trước để data sẵn sàng.

### 1a. Resolve 12 email → central userId (prod), xuất ra grants file mới

```bash
cd /Users/apple/Projects/agentflow/moso-aid

# Cần: PROD gateway URL + 1 central admin bearer token (token của bạn/Kat, quyền đọc user-svc)
export PROD_GATEWAY='https://<PROD_GATEWAY_HOST>'        # vd gateway prod của LF
export CENTRAL_TOKEN='<central-admin-bearer>'            # token đọc user-svc/by-email

# Matrix: mặc định Option (A) = tất cả ADMIN. Muốn (B) thì sửa ROLE/OVERRIDE bên dưới.
node --input-type=module <<'EOF'
const base = process.env.PROD_GATEWAY, tok = process.env.CENTRAL_TOKEN
// Option (A): all ADMIN. Đổi sang (B) bằng cách set EDITORS = [...emails] và gán overrides.
const USERS = [
  ['trongthuan@gmail.com','ADMIN'], ['jesicaendo@gmail.com','ADMIN'], ['han.pnk512@gmail.com','ADMIN'],
  ['duy.huynh.vcr@gmail.com','ADMIN'], ['syleevn@gmail.com','ADMIN'], ['dangquynhnhu2511@gmail.com','ADMIN'],
  ['lminhtu95@gmail.com','ADMIN'], ['isacasno@gmail.com','ADMIN'], ['truonghai.jr@gmail.com','ADMIN'],
  ['hophuongbaongoc110@gmail.com','ADMIN'], ['thucduyen97@gmail.com','ADMIN'], ['7nguyenngochai@gmail.com','ADMIN'],
]
const out = []
for (const [email, role] of USERS) {
  const r = await fetch(`${base}/user-svc/api/v1/users/by-email?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${tok}` } })
  if (!r.ok) { console.error(`FAIL ${email}: ${r.status} ${await r.text()}`); process.exit(1) }
  const p = (await r.json())?.payload ?? {}
  const userId = p.user_id ?? p.id
  if (!userId) { console.error(`FAIL ${email}: no userId`); process.exit(1) }
  // Option (B): nếu role==='EDITOR' thêm overrides:[{code:'LOL_TASK_DELETE',effect:'ADD'}]
  out.push({ userId: String(userId), email, roles: [role], overrides: [] })
  console.error(`ok  ${email} -> ${userId} (${role})`)
}
const fs = await import('node:fs')
fs.writeFileSync('src/data/lol-rbac-grants.prod.json', JSON.stringify(out, null, 2))
console.error(`\nWrote src/data/lol-rbac-grants.prod.json (${out.length} users)`)
EOF
```

> `*.prod.json` phải gitignored (PII). Kiểm tra: `git check-ignore src/data/lol-rbac-grants.prod.json` phải in ra path. Nếu chưa, thêm vào `.gitignore`.

### 1b. Seed vào Mongo PROD — **y hệt cách staging**

Lấy `MONGO_URI` giống lúc làm staging:
> GCP Console → **Cloud Run** → service `moso-aid` (**bản PROD**) → revision mới nhất → tab **"Variables & Secrets"** (hoặc Container → Env) → copy giá trị `MONGO_URI` (chuỗi `mongodb+srv://…` của Atlas).

```bash
cd /Users/apple/Projects/agentflow/moso-aid
MONGO_URI='<dán URI prod mongodb+srv vào đây>' \
LOL_RBAC_GRANTS_FILE=src/data/lol-rbac-grants.prod.json \
node src/scripts/lol-rbac-seed.js
```

- **Nếu timeout** → Atlas → **Network Access** → Add IP (IP máy hiện tại của bạn) → chạy lại lệnh trên. (Giống lúc migrate staging/Arizona.)
- Kỳ vọng output: `LOL RBAC roles: {"created":3,...}` + `LOL RBAC grants: {"created":12,...}`. Chạy lại lần 2 phải ra toàn `unchanged` (idempotent).
- An toàn: chỉ thêm collection `lifeofloan_rbac_*` + 12 grant, không đụng dữ liệu cũ. Xoá lại được nếu cần.

### 1c. Verify seed (đọc trực tiếp Mongo, chưa cần API)

```bash
MONGO_URI='<PROD_MONGO_SRV_URI>' node --input-type=module <<'EOF'
import mongoose from 'mongoose'
import { LOLRbacRole, LOLRbacUserGrant } from './src/models/lol-rbac.js'
await mongoose.connect(process.env.MONGO_URI)
console.log('roles :', (await LOLRbacRole.find().lean()).map(r=>r.code).join(', '))
console.log('grants:', await LOLRbacUserGrant.countDocuments(), 'users')
await mongoose.disconnect()
EOF
```
Phải thấy `roles: ADMIN, EDITOR, VIEWER` và `grants: 12 users`.

---

## PHASE 2 — Deploy code mới lên PROD BE (flag vẫn OFF → không đổi hành vi)

Promote `master → pro` và deploy. Flag OFF nên vẫn chạy gate cũ (12 user central-role không bị ảnh hưởng) — đây là bước chứng minh không regression.

```bash
cd /Users/apple/Projects/agentflow/moso-aid
git fetch origin
gh pr create --base pro --head master \
  --title "LOL self-owned RBAC → prod (BE code, flag still OFF)" \
  --body "Promote #85/#86/#87 to pro. LOL_RBAC_ENFORCE unset (OFF) → legacy behavior. Flip flag in Phase 3."
# merge PR (giữ 7 commit pro-only qua merge commit), rồi deploy prod theo flow moso-aid của bạn
```

**Verify Phase 2** (sau deploy): 1 trong 12 user login /config prod bình thường như cũ. Không có gì thay đổi UI.

---

## PHASE 3 — Flip flag `LOL_RBAC_ENFORCE=true` (điểm cutover thật)

```bash
gcloud run services update <PROD_MOSO_AID_SERVICE> \
  --region <REGION> --project <PROD_PROJECT> \
  --update-env-vars LOL_RBAC_ENFORCE=true
```

Từ đây: membership = Mongo grant (central chỉ còn là IdP). 12 user đã seed → chạy full.

**Verify Phase 3** (dùng token của 1 admin, vd katarina):
```bash
curl -s https://<PROD_GATEWAY_HOST>/api/life-of-a-loan/permissions/me \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | python3 -m json.tool
```
- ✅ 200, `data.permissions[]` chứa `LOL_ADMIN` + các code config.
- ✅ 1 user KHÔNG nằm trong 12 (random central user) → login được nhưng KHÔNG thấy tab admin, và POST/PUT/DELETE roles/tasks bị 403.

---

## PHASE 4 — Promote FE (tab Permissions) lên PROD

```bash
cd /Users/apple/Projects/agentflow/life-of-a-loan
git fetch origin
gh pr create --base production --head master \
  --title "LOL Config: Permissions tab → prod" \
  --body "Promote #46/#47 (admin Direct-Permissions editor). Requires BE flag ON (Phase 3)."
# merge → FE prod build từ branch production → redeploy
```

**Verify Phase 4** — ⚠️ **HARD RELOAD** (Cmd+Shift+R) vì bundle FE bị CDN cache TTL dài:
1. Login prod bằng admin → `/config` phải hiện tab **Permissions**, list đủ 12 user + role.
2. Mở 1 user, đổi override, **Save** → PUT `/admin/users/:id/grant` trả 200, reload thấy persist.
3. Login bằng 1 EDITOR (nếu chọn Option B) → không có tab Permissions, không có nút xoá role.

---

## PHASE 5 — Post-cutover

- **Soak 1–2 ngày** với central LOL# roles vẫn còn nguyên (phao rollback).
- Sau khi ổn: follow-up **retire central CLI scripts** `lol-admin-seed.js` / `lol-rbac-setup.js` (không xoá central grants vội — chỉ ngừng dùng script provision central).
- Nếu chọn Option (A) và muốn siết: sửa `lol-rbac-grants.prod.json` (đổi role vài người sang EDITOR + override), chạy lại Phase 1b (idempotent).

---

## 🔴 ROLLBACK (bất kỳ lúc nào sau Phase 3)

```bash
gcloud run services update <PROD_MOSO_AID_SERVICE> \
  --region <REGION> --project <PROD_PROJECT> \
  --update-env-vars LOL_RBAC_ENFORCE=false
```
→ Tức thì quay lại gate central cũ. 12 user (vẫn còn central LOL# role) đăng nhập bình thường. FE tab Permissions chỉ ẩn tính năng, không gây lỗi. Data Mongo để nguyên (vô hại khi OFF).

## Placeholders cần điền

| Placeholder | Là gì |
|---|---|
| `<PROD_GATEWAY_HOST>` | Gateway prod LF (cho by-email + curl verify) |
| `<CENTRAL_TOKEN>` | Central admin bearer (đọc user-svc/by-email) |
| `<PROD_MONGO_SRV_URI>` | mongodb+srv của moso-aid PROD |
| `<PROD_MOSO_AID_SERVICE>` / `<REGION>` / `<PROD_PROJECT>` | Cloud Run service prod moso-aid |
| `<ADMIN_TOKEN>` | Token 1 admin để verify Phase 3 |
