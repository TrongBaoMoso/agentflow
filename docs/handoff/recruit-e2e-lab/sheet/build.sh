#!/bin/bash
cd "$(dirname "$0")"
{ cat head.html; printf '<script>\n'; cat prelude.js data_common.js data_los.js data_los10.js data_bugs.js cases_1.js cases_2.js cases_3.js cases_4.js cases_5.js cases_6.js cases_7.js static.js cases_8.js cases_10.js app.js; printf '</script>\n'; } > recruit-e2e-lab.html
{ cat prelude.js data_common.js data_los.js data_los10.js data_bugs.js cases_1.js cases_2.js cases_3.js cases_4.js cases_5.js cases_6.js cases_7.js static.js cases_8.js cases_10.js app.js; } > /tmp/_check.js 2>/dev/null || true
