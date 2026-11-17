# Prod: moso-aid needs publish on the two notifier topics (17/11)

moso-aid prod (Cloud Run `moso-aid`, project `lender-rate`) runs as
`444859640964-compute@developer.gserviceaccount.com`. On startup with `EXAM_RESET_EMAIL_ENABLED=true` it logged:

    [exam-reset] declaring the mail type failed: 7 PERMISSION_DENIED: User not authorized to perform this action.

The SA has no Pub/Sub role in lender-rate. bao.trinh@ has no rights on the topics (testIamPermissions = {}).
thanh.t.tran@ has roles/pubsub.admin on lender-rate.

Script for Tan (topic-level only, the two topics, nothing project-wide):

```bash
SA=444859640964-compute@developer.gserviceaccount.com
for T in CREATE_TEMPLATE_TOPIC NOTIFICATION_EVENT_TOPIC; do
  gcloud pubsub topics add-iam-policy-binding "$T" --project lender-rate \
    --member="serviceAccount:$SA" --role=roles/pubsub.publisher
done
```

After the grant: new moso-aid revision (re-declares the mail type at startup), then merge lf-homepage #2766, then prod E2E.
Rollback: `gcloud run services update moso-aid --project lender-rate --region us-central1 --update-env-vars EXAM_RESET_EMAIL_ENABLED=false`.
