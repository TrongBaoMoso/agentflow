# LO site routing without MOSO: DevOps hand-off (audit row H15)

Status 11/11/2026: **document only, no infrastructure has been changed.** Owner of the infra change: DevOps. Code side: us.

Loan Officer (LO) websites are served by the Next.js app **lo-homepage**, but every LO site visit still passes through
**MOSO's App Engine app** first. MOSO decides which LO the request belongs to and forwards the page to lo-homepage with
two headers. When MOSO is retired, a load balancer (or another ingress) has to send that traffic to lo-homepage
directly, and lo-homepage has to work out the LO itself. This page describes today's routing exactly, the replacement,
what the code side already provides, a staging test plan, cutover and rollback order, and the questions we need
DevOps to answer.

Sources read at: base `f9ce63186`, packs `dbc4e81ca`, moso `766e008f7`, lo-homepage `2f1a01a9b` (all `origin/master`).
Citations are `repo:path:line`. Staging measurements were taken 11/11/2026 on `www.viet18.com` (the staging twin of
`www.loanfactory.com`).

---

## (a) How LO sites are routed today

### Two kinds of LO address

| Address | Example (prod / staging) | Who answers DNS |
|---|---|---|
| Company host + site url | `www.loanfactory.com/<site-url>/*` / `www.viet18.com/<site-url>/*` | `www` is a CNAME to `ghs.googlehosted.com`, an App Engine custom-domain mapping |
| LO custom domain | `https://<lo-domain>/*` | App Engine custom-domain mapping per domain (staging: 8 mappings, all Google-managed certificates; prod `lender-rate`: 10 mappings, 9 managed + 1 manual certificate) |

`<site-url>` is the LO's `Admin.url` field (`HasMyPage.url`), and `<lo-domain>` is `Admin.domain`. Both are stored
lowercase, so lookups are case-insensitive (base `core/.../entity/HasMyPage.java:28-29`, `StringType.label()`).

### Step 1: host → company namespace

MOSO normalises the host first. A two-label host gets `www.` added, and a host with more than three labels that starts
with `www.` loses it. It then looks the host up in `Company.domains` with `active=true`. An unknown host gets
**403 `company_disabled`**. The result is memcached per host (base `core/.../server/NamespaceFilter.java:21-32, 49,
72-82`). So every LO custom domain must also be listed in the company's `Company.domains`.

Domains are added through `VerifyDomainOp`, which checks Google Site Verification and then runs
`Company.add(domains, …)`, and after 10 minutes `AddDomainOp` (moso `src/main/java/com/lenderrate/server/op/VerifyDomainOp.java:41-57`).
In production `AddDomainOp` calls an external xmoso hook, `/exec/AddDomainHook` (packs
`google-apis/.../op/AddDomainOp.java:19-29`). That hook's code is not in any repo we have, so how the App Engine
domain mapping and certificate get created is an open question (§e).

### Step 2: host/path → which LO

Page handlers are registered in `AppServer` in this order: branch pages, admin (LO) pages, partner-agent pages, DBA
pages (moso `src/main/java/com/lenderrate/AppServer.java:133-136`). The LO case is `MyPages.getPage` (packs
`loan/src/main/java/com/mvu/loan/server/MyPages.java:36-71`):

- **Host is the company host** (`Server.domain()`, i.e. `www.loanfactory.com`):
  - The first path segment is the site url (`:39`).
  - A first segment that is one of MOSO's reserved page sections is never an LO (`:44`).
  - Otherwise the LO is looked up by `HasMyPage.url` (`:49`).
  - If that misses, the slug is looked up in `previous_urls`, and a renamed slug gets a **301 to `/<current-url><rest>`**
    (`:61, 89-127`).
- **Any other host** is looked up as a custom domain by `HasMyPage.domain` (`:66-67`).

`AdminPages.findRoot` only accepts an LO that is `active`, `should_have_domain` and not `is_pending_loan_officer`. A
miss is cached with no expiry (packs `loan/src/main/java/com/mvu/loan/server/AdminPages.java:54-85`).

**An LO who has their own domain but is reached through the company host** gets a **302 to
`https://<lo-domain>/<rest>?<query>`** (`AdminPages.java:59-79`). Measured on staging:
`www.viet18.com/<site-url>/about-us` returns 302 to `https://<lo-domain>/about-us`.

On a match, MOSO stores the LO as the request's "anonymous id" (`MyPages.java:78`).

### Step 3: MOSO proxies to lo-homepage, or serves its own page

This all happens in `BaseServer.doGet` (base `appengine/src/main/java/com/mvu/appengine/BaseServer.java:176-245`).

**Redirects first** (`redirect()`, `:401-417`):
- `/chat/invite` → 301 to the chat service.
- A two-label host → 301 to `https://www.<host>`. Measured: `viet18.com/<site-url>` → `https://www.viet18.com/<site-url>`.
- http → 301 to https.

**Accept filter:** the request is only handled if `Accept` is absent or contains `text/html` or `*/*` (`:177`).

**Paths without a dot:** MOSO adds `X-FRAME-OPTIONS: SAMEORIGIN`, `Strict-Transport-Security: max-age=2592000`,
`X-XSS-Protection: 1`, `X-Content-Type-Options: nosniff` and `Expect-CT: max-age=0` (`:185-189`). It proxies only when
all of these hold:
- the visitor is not logged in to MOSO;
- the page type supports Web Plus (true for LO and partner-agent pages, false for branch and DBA pages);
- there is no `X_SESSION` cookie at all, even an expired one (base `BaseServlet.java:67-84`);
- lo-homepage answered below 400.

Otherwise MOSO renders its own GWT page (`:193-222`).

**Paths with a dot** (for example `/<site-url>/sitemap.xml`) are proxied **without LO context**, so they go to the
company target. If that fails, MOSO looks up an `HtmlFile` or redirects to the path without the extension (`:224-239`).

**The proxy itself** (`handleWebPlus`, `:251-308`; `webPlusConnection`, `:313-333`):
- **Target:** `WebPlusConfiguration.agent_url` when an LO is set, otherwise `WebPlusConfiguration.url` (base
  `SiteMapServlet.java:148-150`). The value is read from Datastore in the company namespace and cached 24 h
  (`BaseServer.java:343-361`).
  - `agent_url` is lo-homepage.
  - `url` is the company site; measured, `www.loanfactory.com/` answers with `x-powered-by: Next.js`.
- **Path:** forwarded **unchanged, including `/<site-url>`**. The URL is `agent_url + servletPath + ?query` (`:255`), so
  lo-homepage receives `/<site-url>/<rest>`.
- **Request headers:** all incoming headers except `Host` are copied (`:267-275`). MOSO then adds:
  - `x-forwarded-host: <original host>` and `x-moso-forwarded-host: <original host>` (`:321-322`);
  - **`x-lo-key: <LO's MOSO Admin key>`** (`:326`);
  - **`x-base-path: <site-url>`**, only when the LO is **not** on their own domain (`:327-329`).
- **Timeouts:** 10 s for pages, 45 s for sitemaps (`:116, 122`). Redirects are **not** followed: a 3xx is passed back
  with its headers and no body (`:318, 294`).
- **Response:**
  - Status 400 or above, or any exception, makes MOSO render its own page instead.
  - On success, every response header except `content-*` is copied, keeping **only the first value** (`:287-292`).
  - Content type and charset are reset to UTF-8 (`:284`).
  - A gzip body is decompressed and streamed out (`:295-299`).
- **Request bodies:** POST, PUT and DELETE are proxied when the visitor is not logged in, but **the body is never
  copied** (`:247-249, 708-726`). Forms on LO sites post straight to lo-homepage's own `/webplus-api/*` on its asset
  host or to the MOSO API, not through this proxy.
- **Transport:** App Engine URLFetch (moso `src/main/webapp/WEB-INF/appengine-web.xml:10`).

**Which LO paths lo-homepage serves.** lo-homepage answers a bare 404 for any top-level page not marked released in
`RELEASE_PAGES` (lo-homepage `src/shared/constants/map-urls.ts:225+`, `src/middleware.ts:120-129`). MOSO then serves
its own page. These are the paths that **stay on MOSO today**:
- `RELEASE_PAGES` entries set to `false`: `/login`, `/apply`, `/quote`, `/homeready`, `/oneplus`, `/agent`,
  `/rates-comparisons`, `/mentorship-policies`, `/loan-application`, `/21lenderpaidbuydown`, `/reset-password`,
  `/create-alert`, `/california-dream`;
- any MOSO-only section such as `/qr_invitation`.

Measured: `www.viet18.com/<site-url>/apply`, `/login` and `/qr_invitation` return 200 **without**
`x-powered-by: Next.js` (MOSO GWT), while `/<site-url>/about-us` returns it.

### robots.txt and sitemap.xml

- **`/robots.txt`** on every host is served by MOSO's own `RobotServlet`, never by lo-homepage (moso `web.xml:553-555`;
  base `RobotServlet.java:18-59`).
  - It allows `/` and disallows `/exec/*`, `/api/`, `/admin/`, `/private/`, `/webplus-api/` and `/health/`.
  - Off the company host it also disallows `/branches` and `/*/branches`.
  - It ends with `Sitemap: <origin>/sitemap.xml`.
  - Measured on a staging custom domain, the Sitemap line points at `https://www.<lo-domain>/sitemap.xml`. MOSO forces
    `www.`, and that host may not exist.
- **`/sitemap.xml`** is handled by MOSO's `SiteMapServlet`, which runs the page handlers first, so a custom domain has
  LO context (moso `web.xml:557-559`; base `SiteMapServlet.java:35-86`).
  - It fetches `<target>sitemap.xml` with the 45 s timeout and caches the XML 24 h, but only if the XML is well-formed
    and has at least one `<loc>` (packs `SiteMapServlet.java:43-80`).
  - lo-homepage serves it via a rewrite to `/sitemap` (`next.config.mjs:26-33`; `src/app/sitemap/route.ts`), using
    `x-forwarded-host` as the base URL.
  - Measured: `<lo-domain>/sitemap.xml` returns 200, and `www.viet18.com/<site-url>/sitemap.xml` returns 302 to
    `/<site-url>/sitemap`.

### Browser calls that do not go through the page proxy

- **`/_next/*` static files and `/webplus-api/*` route handlers** are fetched from lo-homepage's asset host
  (`NEXT_PUBLIC_ASSET_URL`, the Cloud Run host) directly and cross-origin. The middleware adds
  `Access-Control-Allow-Origin: *` (lo-homepage `next.config.mjs:24`; `src/middleware.ts:75-105`).
- **MOSO API calls** (`/api/webplus/v1/<ns>/...`) go to `NEXT_PUBLIC_MOSO_API_URL`, which is the company host itself.
  Measured: `https://www.viet18.com/api/webplus/v1/...`. These are separate MOSO dependencies tracked in the audit, not
  part of page routing, but **a new ingress for `www.loanfactory.com` must keep `/api/*` pointed at MOSO for as long as
  those calls exist.**

### Caching

MOSO adds no `Cache-Control` to proxied pages. lo-homepage's own headers pass through; measured on an LO page:
`cache-control: private, no-cache, no-store, max-age=0, must-revalidate`. We found no CDN or load balancer in front of
App Engine in our repos, and `server: Google Frontend` with `www` CNAME'd to `ghs.googlehosted.com` points to plain App
Engine custom domains.

### lo-homepage side (`src/middleware.ts`)

- **Passed straight through:** `OPTIONS` (CORS), `/sitemap.xml`, `/robots.txt`, `/_next`, `/images` and `/webplus-api`
  (`:82-105`).
- **Headers it reads:**
  - `x-base-path`, else the query parameter `internalBasePath`;
  - `x-lo-key`, else the query parameter `internalLoKey` (`:107-108`, local-development fallbacks).
- **With no `x-lo-key`,** the request renders as the company site. There is no separate branch for that.
- **In staging and production builds** it strips the locale and `x-base-path` from the path, lowercases it, and answers
  a bare 404 for unreleased pages (`:120-132`). It then passes `x-base-path`, `x-lo-key` and `searchParams` on to the
  server components as request headers (`:135-139`).
- **Links:** pages prefix their links with `x-base-path`.
- **The LO's own data** comes from moso-aid by `x-lo-key` (`findLOInfo`). A key moso-aid does not know returns 404.

---

## (b) The replacement

```
                       ┌──────────── today ─────────────┐
visitor ─► www.loanfactory.com/<site-url>/*  ─► App Engine (MOSO) ─► lo-homepage   (x-lo-key, x-base-path set by MOSO)
visitor ─► <lo-domain>/*                     ─► App Engine (MOSO) ─► lo-homepage   (x-lo-key set by MOSO)

                       ┌──────────── target ────────────┐
visitor ─► www.loanfactory.com/<site-url>/*  ─► HTTPS LB ─► lo-homepage (serverless NEG)
visitor ─► <lo-domain>/*                     ─► HTTPS LB ─► lo-homepage (serverless NEG)
                                                       lo-homepage middleware ─► moso-aid GET /api/lo-site/resolve
                                                       (no MOSO; sets x-lo-key / x-base-path itself)
```

The routing rules we need, from most specific to least:

| Host | Path | Backend | Why |
|---|---|---|---|
| `www.loanfactory.com` | `/api/*`, `/exec/*`, `/_ah/*`, MOSO app and login paths | MOSO (App Engine), as today | Still-live MOSO API calls and MOSO's own app |
| `www.loanfactory.com` | `/<site-url>` and `/<site-url>/*` for LO site urls | **lo-homepage** | LO sites |
| `www.loanfactory.com` | everything else | company site (lf-homepage) or MOSO, as today | Company site |
| `<lo-domain>` (each LO custom domain) | `/*` | **lo-homepage** | LO sites |
| `<lo-domain>` | `/robots.txt` | lo-homepage (it has its own `robots.ts`) or a static rule | MOSO's RobotServlet goes away |

The middle row is the hard one: a URL map cannot tell an LO site url from a company page by itself. There are three
options; please pick one (§e):
1. **One rule per LO site url,** generated from the LO list. The LB sends only those prefixes to lo-homepage.
2. **lo-homepage as the default backend for `www.loanfactory.com`,** with explicit rules for the company and MOSO paths.
   lo-homepage resolves the first segment and answers 404 for non-LOs.
3. **Keep the company host on App Engine for now** and move only custom domains. This is the smallest first step.

**What must NOT change in the forwarding:**
- the path stays `/<site-url>/<rest>`, including the site url;
- the original `Host` must reach lo-homepage, either preserved or as `x-forwarded-host`;
- query strings are kept;
- the ingress **strips any client-sent `x-lo-key` and `x-base-path`** request headers. Today MOSO overwrites them only
  when it found an LO; that is a pre-existing spoofing gap.

---

## (c) What the code side provides

1. **moso-aid `GET /api/lo-site/resolve`**, being built in parallel by us (not on moso-aid staging as of this commit;
   check moso-aid `origin/master`).
   - Query `?slug=<site-url>`, or `?host=<lo-domain>`.
   - Returns `{ "success": true, "data": { "key": "<LO key>", "base_path": "<site-url or empty>" } }`.
   - `key` is the LO's MOSO Admin key for existing LOs, or the central user id for LOs hired after MOSO is switched off.
   - Returns **404** (JSON) when there is no such LO.
   - Under the moso-aid flag `LO_SITE_MOSO_OFF=true` it never calls MOSO.
2. **lo-homepage middleware fallback**, PR LoanFactory-Inc/lo-homepage#952. It is held open until the endpoint is on
   moso-aid staging.
   - It runs only when env **`LO_SITE_SELF_ROUTING=true`** (absent in production) **and** no `x-lo-key` arrived.
   - If the host is not a company host, it asks `?host=<host>`. Otherwise it asks `?slug=<first path segment>`, skipping
     the app's own top-level pages, locales and dotted segments.
   - It sets `x-lo-key` and `x-base-path` exactly as MOSO's proxy does, and everything downstream is unchanged.
   - Company hosts default to `www.loanfactory.com`, `loanfactory.com`, `www.viet18.com`, `viet18.com`, `*.run.app`
     and local hosts. Override with env **`LO_SITE_COMPANY_HOSTS`** (comma list). Every non-LO host the LB sends to
     lo-homepage must be in it, otherwise it is treated as a custom domain and looked up.
   - It runs on the edge runtime and fails open:
     - 1.5 s timeout;
     - in-memory cache: hits 5 min, 404s 1 min, errors 10 s;
     - concurrent lookups for the same site share one call;
     - hits and misses are kept in separate bounded LRU maps, so a flood of made-up slugs cannot push out a real site.
     Any error leaves the request exactly as it is today.
   - Both env vars are read at runtime (Next 14.2 edge sandbox). Setting them on Cloud Run needs no rebuild.
     `NEXT_PUBLIC_AID_API_URL` (the moso-aid base URL) is build-time.
   - Measured locally against a stub that follows the contract, compared with the staging Cloud Run service given
     MOSO's headers:
     - `/<site-url>` without MOSO headers renders the same LO, with the same base path and title, as Cloud Run with
       MOSO's headers;
     - a custom-domain host renders that LO with an empty base path, again identical;
     - an unknown slug gives 404, the same as today;
     - with `x-lo-key` present no lookup is made;
     - with the resolver down, the request falls through in milliseconds.
3. **Already done for the same pages:**
   - lo-homepage#951 (H16): the app-download QR no longer calls MOSO under `LO_SITE_MOSO_OFF`.
   - Site config, `/join` and `/recruit` read moso-aid snapshots (`LO_SITE_MOSO_OFF`, audit rows H10-H14).
4. **Not provided yet; the replacement must decide:**
   - A slug request for an LO who has their own domain. MOSO 302s it to the domain; the contract returns only
     `{ key, base_path }`. Option: moso-aid adds `domain_url` and the middleware redirects.
   - `previous_urls` 301s for renamed slugs.
   - The paths that stay on MOSO (see the list in (a)).
   - `robots.txt` per custom domain.

---

## (d) Staging test plan, cutover order, rollback

Staging uses project `lenderrate-master`, company host `www.viet18.com`, and Cloud Run service `lo-homepage-master`
(region `us-central1`). Get its URL with
`gcloud run services describe lo-homepage-master --project lenderrate-master --region us-central1 --format='value(status.url)'`.

### Code-side preconditions (us)

1. moso-aid staging answers `GET /api/lo-site/resolve?slug=<unknown>` with a **JSON 404**, and with `?slug=<test LO>`
   and `?host=<test LO domain>` with `{success:true,data:{key,base_path}}`.
2. lo-homepage#952 is merged to `master`. That merge deploys `lo-homepage-master`.
3. Set `LO_SITE_SELF_ROUTING=true` on `lo-homepage-master` (staging only). With MOSO still in front nothing changes,
   because MOSO always sends `x-lo-key` for LO pages.
4. Direct check against the Cloud Run URL, without MOSO:
   - `GET <cloud-run>/<test-site-url>` gives 200 and the page shows that LO.
   - `GET <cloud-run>/about-us` with `-H 'x-forwarded-host: <test-lo-domain>'` gives 200 and shows that LO.
   - `GET <cloud-run>/<unknown>` gives 404.
   - Response time stays within normal page latency.

### Infra on staging (DevOps)

5. Create an external HTTPS LB, or reuse an existing one, with a **serverless NEG to `lo-homepage-master`**.
6. Pick **one** test custom domain first: a fresh staging subdomain, not one in use. Add a Google-managed certificate,
   point DNS at the LB, and route `/*` to the lo-homepage NEG. Check:
   - pages render as that LO;
   - links stay on the domain;
   - `/robots.txt` and `/sitemap.xml` answer;
   - `/_next/*` loads;
   - forms (`/webplus-api/*`) work;
   - `/apply` and `/login` (MOSO-only today) show what we expect, which is a decision for §e.
7. Then the company-host rule, following the option chosen in (b). Test on staging:
   - `www.viet18.com/<test-site-url>` and its sub-pages;
   - a renamed slug;
   - an LO with their own domain reached by slug (expect a 302 to the domain once (c)4 is built);
   - mixed case (`/<Test-Site-Url>`);
   - an unknown slug;
   - the company pages and `/api/*`, which must still reach their old backends.
8. Load and latency: `x-lo-key` is now resolved on the first request per site per instance and cached 5 min, so watch
   moso-aid request rate and p95.

### Production cutover order

Production is lo-homepage Cloud Run `lo-homepage-v2` in project `lender-rate`, released from branch `produciton-v2`.

1. moso-aid endpoint released to production (`pro`). Bulk-seed the LO snapshots while MOSO is still up (audit H10/M4a).
2. lo-homepage `master` promoted to `produciton-v2` (includes #951 and #952).
3. `LO_SITE_SELF_ROUTING=true` on `lo-homepage-v2`. This is a no-op while MOSO is in front.
4. Custom domains, moved one or a few at a time: DNS from the App Engine mapping to the LB; certificate issued **before**
   DNS flips. Verify each one, then remove the App Engine domain mapping.
5. The company-host `/<site-url>` rule.
6. Only then: `LO_PROFILE_REFRESH_HOURS=0` and the MOSO-off flags (audit §2).

### Rollback

- **Per domain:** point DNS back at App Engine. Keep the App Engine domain mapping and `Company.domains` entry until the
  domain has been stable for a while.
- **Company host:** remove the `/<site-url>` rule from the URL map, so traffic goes back to App Engine.
- **Code:** unset `LO_SITE_SELF_ROUTING` (runtime env, no rebuild). With MOSO in front the code path is never used.

---

## (e) Open questions for DevOps

1. **TLS for custom domains.**
   - Today: App Engine domain mappings with Google-managed certificates (staging 8, prod 10 including the company host;
     one prod mapping uses a manually uploaded certificate, see base `renew_ssl.sh` / `generate_ssl.sh`).
   - On an LB: one Google-managed certificate per domain, or a Certificate Manager map? What are the limits per LB?
   - How do we issue the certificate before the DNS flip, to avoid downtime? DNS authorization?
2. **How custom domains are mapped today.**
   - Who runs `/exec/AddDomainHook` (xmoso), and does it create the App Engine domain mapping and certificate?
   - Do LOs point their DNS at `ghs.googlehosted.com` themselves?
   - What happens to existing LO DNS records? If LOs own their DNS, moving to an LB IP means every LO must change a
     record. Can we keep a stable CNAME target instead?
3. **Which `www.loanfactory.com` paths must stay on MOSO,** and for how long:
   - `/api/*` (the MOSO API still used by LO and company pages), `/exec/*`, `/_ah/*`;
   - MOSO login and app paths;
   - the LO-site paths lo-homepage does not serve (`/apply`, `/login`, `/quote`, `/qr_invitation`, …; list in (a)).
   Which option in (b) for the company host?
4. **Logged-in MOSO users** (session or `X_SESSION` cookie) see MOSO's own LO page today instead of lo-homepage. Is it
   OK that this stops?
5. **robots.txt.** On a custom domain, should lo-homepage's own `robots.ts` take over? Today MOSO's points the Sitemap
   line at `www.<lo-domain>`.
6. **Headers.** Should the LB add the security headers MOSO adds today (X-Frame-Options, HSTS, nosniff), or should
   lo-homepage set them? Confirm the LB strips client-sent `x-lo-key` and `x-base-path`, and confirm what it sets as
   `Host` / `x-forwarded-host`.
7. **Staging.** Which staging host do we test the company-host rule on (`www.viet18.com` is App Engine today), and can
   we have one fresh staging custom domain for step 6?
8. **Cloud Armor / rate limiting** on the LO site backend, since every unknown slug now costs one moso-aid lookup
   (cached 1 min).

## Known parity notes (behave as MOSO does today, on purpose)

- **Mixed-case paths.** MOSO sends the lowercase `x-base-path`, and lo-homepage strips it case-sensitively. Measured
  today: the site root is case-insensitive, but `/<Site-Url>/sub` 302s back to the root.
- **Locale before the slug.** In `/vi/<site-url>`, MOSO only takes the first path segment, so the locale goes before
  the slug only on custom domains.
- **Slugs.** A site url equal to one of MOSO's reserved sections, or one of lo-homepage's own top-level pages, is not an
  LO.
