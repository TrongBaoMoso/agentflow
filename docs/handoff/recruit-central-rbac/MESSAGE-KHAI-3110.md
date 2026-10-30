# Message for Khai (Bao sends it himself) — 31/10/2026

Copy everything between the two lines.

---

Anh Khải ơi, em nhờ anh 2 việc cho recruit-be để Recruit tự nhận role từ HR app (onboard / đổi role / nghỉ việc → tự gán hoặc gỡ role RECRUIT trong IAM). Tối 31/10 em đã chuyển Recruit prod sang đọc quyền từ IAM (auth-service).

Em check rồi: trên prod anh đã tạo 3 subscription HR_ASSOCIATE_{ONBOARD,UPDATE,DEACTIVE}_SUBSCRIBE_RECRUIT. Mấy cái đó dùng cho việc khác (nối hồ sơ, tick Licensing, đánh dấu Loan Officer đã nghỉ). Phần gán role cần **4 subscription riêng** (tên mới, mỗi cái có DLQ riêng). Hiện chưa có cái nào trên cả prod lẫn staging.

**1. Bốn subscription cho phần tự gán role (prod + staging)**

```bash
# PROD: P=lender-rate, GSA=recruit-be-runtime@lender-rate.iam.gserviceaccount.com
# STAGING: P=lenderrate-master, GSA=recruit-be@lenderrate-master.iam.gserviceaccount.com
P=lender-rate; GSA=recruit-be-runtime@$P.iam.gserviceaccount.com
N=$(gcloud projects describe $P --format='value(projectNumber)')
for pair in HR_ASSOCIATE_ONBOARD:RECRUIT_HR_ASSOCIATE_ONBOARD_ROLES_SUBSCRIBE \
            HR_ASSOCIATE_ROLE:RECRUIT_HR_ASSOCIATE_ROLE_SUBSCRIBE \
            HR_ASSOCIATE_DEACTIVE:RECRUIT_HR_ASSOCIATE_DEACTIVE_SUBSCRIBE \
            HR_ASSOCIATE_UPDATE:RECRUIT_HR_ASSOCIATE_UPDATE_HEADSHIP_SUBSCRIBE; do
  T=${pair%%:*}; S=${pair##*:}; D=${S}_DLQ
  gcloud pubsub topics create $D --project $P
  gcloud pubsub subscriptions create $D.monitor --topic $D --project $P --message-retention-duration 7d
  gcloud pubsub subscriptions create $S --topic $T --project $P --ack-deadline 60 --expiration-period never \
    --message-retention-duration 7d --min-retry-delay 10s --max-retry-delay 600s --dead-letter-topic $D --max-delivery-attempts 5
  gcloud pubsub subscriptions add-iam-policy-binding $S --project $P --member serviceAccount:$GSA --role roles/pubsub.subscriber
  gcloud pubsub subscriptions add-iam-policy-binding $S --project $P --member serviceAccount:$GSA --role roles/pubsub.viewer
  gcloud pubsub topics add-iam-policy-binding $T --project $P --member serviceAccount:$GSA --role roles/pubsub.viewer
  gcloud pubsub topics add-iam-policy-binding $D --project $P --member serviceAccount:service-$N@gcp-sa-pubsub.iam.gserviceaccount.com --role roles/pubsub.publisher
  gcloud pubsub subscriptions add-iam-policy-binding $S --project $P --member serviceAccount:service-$N@gcp-sa-pubsub.iam.gserviceaccount.com --role roles/pubsub.subscriber
done
```

Ai publish được vào 4 topic HR này thì người đó gán hoặc gỡ được role Recruit. Anh check giúp em: trên 4 topic đó chỉ service account của ai-hr-be có `roles/pubsub.publisher` nha.

**2. Key cho job đối chiếu role (cron), tên `RECRUIT_RBAC_RECONCILE_INTERNAL_API_KEY`**

- **Prod (lender-rate):** em không có quyền Secret Manager trên đó. Anh tạo giúp em secret `recruit-be-recruit-rbac-reconcile-internal-api-key` (giá trị ngẫu nhiên riêng, ví dụ `openssl rand -hex 32`), rồi cho `recruit-be-deploy@lender-rate.iam.gserviceaccount.com` quyền `roles/secretmanager.secretAccessor`.
- **Staging (lenderrate-master):** em tạo secret này rồi, nhưng không gán được IAM. Anh cho `recruit-be-deploy@lenderrate-master.iam.gserviceaccount.com` quyền `roles/secretmanager.secretAccessor` trên secret đó giúp em.

Anh làm xong báo em. Em sẽ thêm dòng vào `secret-keys.txt`, chạy Sync secrets, rồi bật các biến môi trường. Cảm ơn anh!

---
