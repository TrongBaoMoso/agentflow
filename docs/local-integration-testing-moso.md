# Chạy MOSO (hệ cũ) ở local với data staging thật

Mục tiêu: test một tính năng **xuyên hệ** (lf-homepage / moso-aid / recruit-app → MOSO) **trước khi**
PR packs được merge và deploy staging, để tự tin bấm merge thay vì chờ lịch deploy.

Đo và dựng lần đầu 16/09/2026 cho packs PR #3526 (`getReferralStanding`). Toàn bộ số liệu dưới đây
là đo thật, không phải suy luận.

---

## 0. TL;DR — ba tầng, mỗi tầng một việc

| Tầng | Chạy ở đâu | Trả lời được gì |
|---|---|---|
| `dev_appserver` :8888 + remote_api filter | local | HTTP thật, routing Endpoints, header/auth gate, **và data staging thật** |
| `RemoteAPI.runRemoteOn(...)` harness | local JVM, không server | query/logic trên data thật, nhanh, không cần dựng server |
| moso-aid :5001 + lf-homepage :3000 | local | chuỗi đầy đủ tới UI |

---

## 1. Điều kiện

```bash
gcloud auth login --update-adc          # ADC hết hạn -> invalid_rapt, mọi thứ chết ở bước xác thực
gcloud components install app-engine-java
chmod +x <sdk>/platform/google_appengine/google/appengine/tools/java/bin/*.sh   # SDK tải về KHÔNG có bit +x
```

`<sdk>` = `gcloud info --format="value(installation.sdk_root)"` (máy này: `/usr/local/share/google-cloud-sdk`).

## 2. Build

```bash
cd base  && mvn install -DskipTests
cd packs && mvn install -DskipTests        # đứng ở nhánh PR cần test
cd moso  && mvn -Dgwt.compiler.skip=true package -DskipTests
```

`gwt.compiler.skip` bỏ được vì chỉ cần `/api/*`. Cả ba repo phải cùng version (`3.64.0-SNAPSHOT`);
`base` và `packs` **cùng bơm vào `~/.m2`** nên `moso` tự ăn code của nhánh PR.

Xác minh code PR thật sự vào jar (đừng tin build log):

```bash
unzip -p ~/.m2/repository/com/moso/loan/<ver>/loan-<ver>.jar \
  com/mvu/loan/server/op/api/WebPlusAPI.class > /tmp/c.class && javap -p /tmp/c.class | grep <tenMethod>
```

## 3. Nối data staging — dùng remote_api, KHÔNG dùng datastore client

Copy `moso/target/moso-<ver>` ra một thư mục riêng, rồi thêm một servlet filter vào
`WEB-INF/classes` và map `/api/*` **trước mọi filter khác** trong `web.xml`:

```java
RemoteApiInstaller installer = new RemoteApiInstaller();
installer.install(new RemoteApiOptions()
        .server("lenderrate-master.appspot.com", 443)
        .useApplicationDefaultCredential());
try { chain.doFilter(rq, rs); } finally { installer.uninstall(); }
```

Chạy:

```bash
GAE_APPLICATION=s~lenderrate-master \
ENDPOINTS_SERVICE_NAME=lender-rate.appspot.com \
  <sdk>/.../java/bin/dev_appserver.sh -p 8888 --disable_update_check \
  --jvm_flag=-Dremoteapi.app=lenderrate-master <war-dir>
```

Thiếu `ENDPOINTS_SERVICE_NAME` thì server **từ chối boot** (mismatch env var với `appengine-web.xml`).

**Đối chứng dương bắt buộc** — luôn chạy trước khi tin bất cứ kết quả nào:

```bash
curl "http://localhost:8888/api/webplus/v1/<ns>/getAdmins"     # phải ~1.730 row / ~7,8 MB
```

Ra **1 row** ("Unassigned") nghĩa là đang đọc stub rỗng, mọi số sau đó vô nghĩa.

---

## 4. BỐN CÁI BẪY — mỗi cái từng ngốn nhiều thời gian

### 4.1. `Bundle` chọn implementation theo `Server.isLocal()` — ép sang DS2 là ngõ cụt

```java
public Bundle() {
  if (Server.isLocal()) this.ds = new GoogleCloudDS2();  // Cloud client, Key.fromUrlSafe
  else                  this.ds = new GoogleCloudDS();   // App Engine API, KeyFactory.stringToKey
}
```

`GoogleCloudDS2` **bị hardcode** về emulator `localhost:9091` khi `isLocal`. Có thể hack cho nó trỏ
project thật (đọc được 1.730 admin), **nhưng hai encoding key không tương thích**: mọi endpoint nhận
websafe key sẽ trả `400 "Could not parse key"` — đúng những endpoint cần test. Dùng remote_api thì
giữ nguyên impl production nên không có vấn đề này.

### 4.2. dev_appserver TỰ SEED DATABASE — đủ sức ghi đè staging

`BaseServer.init` khi `server && Server.isDev()` đẩy `SyncCustomizationOp` → `Tools.loadTypes(force=true)`
→ **`bundle.commit(true)`**, ghi ~4.300 entity từ `moso-configuration` đang checkout.

Với filter chỉ map `/api/*` thì sync chạy **ngoài** filter nên rơi vào stub local — an toàn. Nhưng nếu
bạn đi đường "trỏ cả tiến trình vào DB thật" thì nó **ghi đè template staging bằng bản trên máy bạn**.
Lần đo 16/09, `moso-configuration` local lùi **33 commit**.

⚠️ `git pull` `moso-configuration` trước khi chạy, và **đừng bao giờ** để tiến trình seed nhìn thấy DB thật.

Cách kiểm staging có bị ghi hay không (đừng đoán): lấy một template có in `[UPDATED]` trong log, so
**md5 nội dung** trên staging với bản local và bản `origin/master`. Khớp origin = chưa bị ghi.

### 4.3. Type `cached(true)`: ghi thẳng Datastore KHÔNG có tác dụng

`SystemProp` (và mọi type `.cached(true)`) được `Bundle.getFreshEntity` trả lời **từ memcache**;
datastore chỉ được đọc khi cache miss. Hệ quả đã đo:

- Ghi/xoá row bằng Datastore REST hoặc console → server **vẫn phục vụ giá trị cũ**.
- Đã xoá row mà `Server.getSystemProperty` vẫn trả secret cũ → 401 rất khó hiểu.

**Luôn ghi qua app.** Có sẵn `SystemPropWriter` (xem §5):

```bash
java -cp "<cp>" harness.SystemPropWriter lenderrate-master <ten> <gia-tri>
java -cp "<cp>" harness.SystemPropWriter lenderrate-master <ten> --delete
```

Điều này cũng đúng cho **vận hành thật**: ai set/xoay secret trên staging/production mà sửa thẳng
Datastore sẽ thấy "không ăn".

### 4.4. remote_api: cài mỗi request, và PHẢI uninstall

- Không uninstall → request kế trên cùng thread: `IllegalStateException: remote API is already installed` → HTTP 500.
- "Cài một lần per-thread" bằng `ThreadLocal` → dev_appserver dựng lại ApiProxy mỗi request nên delegate
  rụng, cờ nói dối, request đó **âm thầm đọc stub local**. Biểu hiện: 401/dữ liệu rỗng ngắt quãng.

Giá đúng: **~2,5–3 s mỗi request** (round-trip datastore từ laptop). Client nào có timeout 4 s sẽ chạm
trần — cho phép override bằng env thay vì sửa hằng số sản phẩm (moso-aid: `REFERRAL_STANDING_TIMEOUT_MS`).

---

## 5. Harness không cần server (nhanh hơn nhiều)

`RemoteAPI.runRemoteOn("lenderrate-master", callable)` (`base/.../RemoteAPI.java`, dùng ADC) chạy code
Java local trên data staging. Mẫu có sẵn: `moso/src/test/java/com/p2/lenderrate/LRIntegration.java`.

Classpath chuẩn nhất là classpath của WAR đã build:

```bash
W=moso/target/moso-<ver>/WEB-INF
java -cp "<harness-classes>:$W/classes:$W/lib/*:<servlet-api.jar>" harness.<Main>
```

Cần `config.properties` (nằm trong `$W/classes`) nếu không sẽ lỗi
`Can't find bundle for base name config`.

**Bẫy khi stub `HttpServletRequest` bằng Proxy:** phải trả giá trị thật cho **mọi getter primitive**.
Một `null` từ proxy sẽ unbox thành NPE, và `AbstractAPI` bọc nó thành `BadRequestException` — nhìn
**y hệt** cổng bảo mật từ chối. Đã báo nhầm "cổng chặn đúng" một lần vì chuyện này.

Dùng header `X-SDK-Namespace: <ns>` để bỏ qua bước tra namespace theo domain.

---

## 6. Nối tới UI

```bash
# moso-aid: trỏ vào MOSO local. KHÔNG sửa .env.dev — dotenv không ghi đè env có sẵn.
API_CRAWL=http://localhost:8888 \
REFERRAL_STANDING_API_KEY=<secret> \
REFERRAL_STANDING_TIMEOUT_MS=20000 npm run dev

# lf-homepage
npm run dev    # NEXT_PUBLIC_AID_API_URL=http://localhost:5001 nếu muốn dùng moso-aid local
```

Trang nhận diện người xem qua `?x-moso-user-id=<websafe key>`
(`src/shared/utils/resolveMosoUserKey.ts`). Đây là claim **không được xác thực** — tiện cho test, và
cũng là lý do đừng xây cổng bảo mật nào dựa trên nó.

---

## 7. An toàn

- remote_api là đường **đọc VÀ GHI** vào staging thật. Không có lưới.
- Filter chỉ map `/api/*` là cố ý: job nền, task queue, sync ở lại stub local.
- Secret tạo ra để test thì **xoá qua app** khi xong, không xoá thẳng Datastore (§4.3).
- Cấu hình local sống trong bản copy của WAR ở scratchpad, **không** commit vào repo nào.
